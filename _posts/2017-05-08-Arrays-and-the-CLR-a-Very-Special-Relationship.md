---
layout: post
title: Arrays and the CLR - a Very Special Relationship
comments: true
tags: [CLR, Internals]
---

A while ago I wrote about the 'special relationship' that [exists between Strings and the CLR]({{ base }}/2016/05/31/Strings-and-the-CLR-a-Special-Relationship/), well it turns out that Arrays and the CLR have an even deeper one, the type of closeness where you *hold hands on your first meeting*

[![Donald Trump and  Theresa May]({{ base }}/images/2017/05/Donald-Trump-Theresa-May.jpg)](http://www.telegraph.co.uk/news/2017/01/27/theresa-may-donald-trump-prove-opposites-can-attract-uk-us-leaders/)

----

As an aside, if you like reading about **CLR internals** you may find these other posts interesting:

- [The CLR Thread Pool 'Thread Injection' Algorithm]({{ base }}/2017/04/13/The-CLR-Thread-Pool-Thread-Injection-Algorithm/?recommended=1)
- [The 68 things the CLR does before executing a single line of your code]({{ base }}/2017/02/07/The-68-things-the-CLR-does-before-executing-a-single-line-of-your-code/?recommended=1)
- [How do .NET delegates work?]({{ base }}/2017/01/25/How-do-.NET-delegates-work/?recommended=1)
- [Why is reflection slow?]({{ base }}/2016/12/14/Why-is-Reflection-slow/?recommended=1)
- [How does the 'fixed' keyword work?]({{ base }}/2016/10/26/How-does-the-fixed-keyword-work/?recommended=1)

----

## Fundamental to the Common Language Runtime (CLR)

Arrays are such a fundamental part of the CLR that they are included in the [ECMA specification](https://github.com/dotnet/coreclr/blob/master/Documentation/project-docs/dotnet-standards.md), to make it clear that the *runtime* has to implement them:

![Single-Dimensions Arrays (Vectors) in the ECMA Spec]({{ base }}/images/2017/05/Single-Dimensions Arrays (Vectors) in the ECMA Spec.png)

In addition, there are several [IL (Intermediate Language) instructions](https://en.wikipedia.org/wiki/List_of_CIL_instructions) that specifically deal with arrays: 

- `newarr` &lt;etype&gt;
  - Create a new array with elements of type etype.
- `ldelem.ref`
  - Load the element at index onto the top of the stack as an O. The type of the O is the same as the element type of the array pushed on the CIL stack.
- `stelem` &lt;typeTok&gt;
  -	Replace array element at index with the value on the stack (also `stelem.i`, `stelem.i1`, `stelem.i2`, `stelem.r4` etc)
- `ldlen`
  - Push the length (of type native unsigned int) of array on the stack.

This makes sense because arrays are the building blocks of so many other data types, you want them to be available, well defined and efficient in a modern high-level language like C#. Without arrays you can't have lists, dictionaries, queues, stacks, trees, etc, they're all built on-top of arrays which provided low-level access to contiguous pieces of memory in a type-safe way.

### Memory and Type Safety

This *memory* and *type-safety* is important because without it .NET couldn't be described as a 'managed runtime' and you'd be left having to deal with the types of issues you get when you are writing code in a more low-level language.

More specifically, the CLR provides the following protections when you are using arrays (from the section on [Memory and Type Safety](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/intro-to-clr.md#memory-and-type-safety) in the BOTR 'Intro to the CLR' page):

> While a GC is necessary to ensure memory safety, it is not sufficient. The GC will not prevent the program from **indexing off the end of an array** or accessing a field off the end of an object (possible if you compute the field's address using a base and offset computation). **However, if we do prevent these cases, then we can indeed make it impossible for a programmer to create memory-unsafe programs**.

> While the common intermediate language (CIL) does have operators that can fetch and set arbitrary memory (and thus violate memory safety), it also has the **following memory-safe operators** and the CLR strongly encourages their use in most programming:
>
> 1. Field-fetch operators (LDFLD, STFLD, LDFLDA) that fetch (read), set and take the address of a field by name.
> 1. **Array-fetch operators (LDELEM, STELEM, LDELEMA)** that fetch, set and take the address of an array element by index. **All arrays include a tag specifying their length**. This facilitates an automatic bounds check before each access.

Also, from the section on [Verifiable Code - Enforcing Memory and Type Safety](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/intro-to-clr.md#verifiable-code---enforcing-memory-and-type-safety) in the same BOTR page

> In practice, the number of run-time checks needed is actually very small. They include the following operations:
>
> 1. Casting a pointer to a base type to be a pointer to a derived type (the opposite direction can be checked statically)
1. **Array bounds checks** (just as we saw for memory safety)
1. Assigning an element in an **array of pointers to a new (pointer) value**. This particular check is only required because **CLR arrays have liberal casting rules** (more on that later...)

However you don't get this protection for free, there's a cost to pay:

> Note that the need to do these checks places requirements on the runtime. In particular:
>
> 1. All memory in the GC heap must be tagged with its type (so the casting operator can be implemented). This type information must be available at runtime, and it must be rich enough to determine if casts are valid (e.g., the runtime needs to know the inheritance hierarchy). In fact, the first field in every object on the GC heap points to a runtime data structure that represents its type.
1. **All arrays must also have their size** (for bounds checking).
1. **Arrays must have complete type information** about their element type.

----

## Implementation Details

It turns out that large parts of the internal implementation of arrays is best described as *magic*, this Stack Overflow [comment from Marc Gravell sums it up nicely](http://stackoverflow.com/questions/19914523/mystery-behind-system-array#comment29631862_19914523) 

> Arrays are basically voodoo. Because they pre-date generics, yet must allow on-the-fly type-creation (even in .NET 1.0), they are implemented using tricks, hacks, and sleight of hand.

Yep that's right, arrays were parametrised (i.e. generic) before generics even existed. That means you could create arrays such as `int[]` and `string[]`, long before you were able to write `List<int>` or `List<string>`, which only became possible in .NET 2.0.

### Special helper classes

All this *magic* or *sleight of hand* is made possible by 2 things:

- The CLR breaking all the usual type-safety rules
- A special array helper class called `SZArrayHelper`

But first the why, why were all these tricks needed? From [.NET Arrays, IList&lt;T&gt;, Generic Algorithms, and what about STL?](https://blogs.msdn.microsoft.com/bclteam/2004/11/19/net-arrays-ilistt-generic-algorithms-and-what-about-stl-brian-grunkemeyer/):

> When we were designing our generic collections classes, one of the things that bothered me was how to write a generic algorithm that would work on both arrays and collections.  To drive generic programming, of course we must make arrays and generic collections as seamless as possible.  It felt that there should be a simple solution to this problem **that meant you shouldn’t have to write the same code twice, once taking an IList&lt;T&gt; and again taking a T[]**.  The solution that dawned on me was that arrays needed to implement our generic IList.  We made arrays in V1 implement the non-generic IList, which was rather simple due to the lack of strong typing with IList and our base class for all arrays (System.Array). **What we needed was to do the same thing in a strongly typed way for IList&lt;T&gt;**.

But it was only done for the common case, i.e. 'single dimensional' arrays:

> There were some restrictions here though – **we didn’t want to support multidimensional arrays since IList&lt;T&gt; only provides single dimensional accesses**.  Also, arrays with non-zero lower bounds are rather strange, and probably wouldn’t mesh well with IList&lt;T&gt;, where most people may iterate from 0 to the return from the Count property on that IList.  So, **instead of making System.Array implement IList&lt;T&gt;, we made T[] implement IList&lt;T&gt;**.  Here, T[] means a single dimensional array with 0 as its lower bound (often called an SZArray internally, but I think Brad wanted to promote the term 'vector' publically at one point in time), and the element type is T. So Int32[] implements IList&lt;Int32&gt;, and String[] implements IList&lt;String&gt;.

Also, this comment from the [array source code](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/vm/array.cpp#L1369-L1428) sheds some further light on the reasons:

```
//----------------------------------------------------------------------------------
// Calls to (IList<T>)(array).Meth are actually implemented by SZArrayHelper.Meth<T>
// This workaround exists for two reasons:
//
//    - For working set reasons, we don't want insert these methods in the array 
//      hierachy in the normal way.
//    - For platform and devtime reasons, we still want to use the C# compiler to 
//      generate the method bodies.
//
// (Though it's questionable whether any devtime was saved.)
//
// ....
//----------------------------------------------------------------------------------
```

So it was done for *convenience* and *efficiently*, as they didn't want every instance of `System.Array` to carry around all the code for the `IEnumerable<T>` and `IList<T>` implementations.

This mapping takes places via a call to [GetActualImplementationForArrayGenericIListOrIReadOnlyListMethod(..)](https://github.com/dotnet/coreclr/blob/a9b25d4aa22a1f4ad5f323f6c826e318f5a720fe/src/vm/methodtable.cpp#L6870-L6873), which wins the prize for the best method name in the CoreCLR source!! It's responsible for wiring up the corresponding method from the [SZArrayHelper](https://github.com/dotnet/coreclr/blob/68f72dd2587c3365a9fe74d1991f93612c3bc62a/src/mscorlib/src/System/Array.cs#L2595-L2778) class, i.e. `IList<T>.Count` -> `SZArrayHelper.Count<T>` or if the method is part of the `IEnumerator<T>` interface, the [SZGenericArrayEnumerator&lt;T&gt;](https://github.com/dotnet/coreclr/blob/68f72dd2587c3365a9fe74d1991f93612c3bc62a/src/mscorlib/src/System/Array.cs#L2718-L2776) is used.

But this has the potential to cause security holes, as it breaks the normal C# type system guarantees, specifically regarding the `this` pointer. To illustrate the problem, here's the source code of the [`Count` property](https://github.com/dotnet/coreclr/blob/68f72dd2587c3365a9fe74d1991f93612c3bc62a/src/mscorlib/src/System/Array.cs#L2627-L2633), note the call to `JitHelpers.UnsafeCast<T[]>`:

``` csharp
internal int get_Count<T>()
{
    //! Warning: "this" is an array, not an SZArrayHelper. See comments above
    //! or you may introduce a security hole!
    T[] _this = JitHelpers.UnsafeCast<T[]>(this);
    return _this.Length;
}
```

Yikes, it has to remap `this` to be able to call `Length` on the correct object!!

And just in case those comments aren't enough, there is a very strongly worded comment [at the top of the class](https://github.com/dotnet/coreclr/blob/68f72dd2587c3365a9fe74d1991f93612c3bc62a/src/mscorlib/src/System/Array.cs#L2572-L2594) that further spells out the risks!!

Generally all this magic is hidden from you, but occasionally it leaks out. For instance if you run the code below, `SZArrayHelper` will show up in the `StackTrace` and `TargetSite` of properties of the `NotSupportedException`:

``` csharp
try {
    int[] someInts = { 1, 2, 3, 4 };
    IList<int> collection = someInts;
    // Throws NotSupportedException 'Collection is read-only'
    collection.Clear(); 		
} catch (NotSupportedException nsEx) {				
    Console.WriteLine("{0} - {1}", nsEx.TargetSite.DeclaringType, nsEx.TargetSite);
    Console.WriteLine(nsEx.StackTrace);
}
```

### Removing Bounds Checks

The runtime also provides support for arrays in more conventional ways, the first of which is related to performance. Array bounds checks are all well and good when providing *memory-safety*, but they have a cost, so where possible the JIT removes any checks that it knows are redundant. 

It does this by calculating the *range* of values that a `for` loop access and compares those to the actual length of the array. If it determines that there is *never* an attempt to access an item outside the permissible bounds of the array, the run-time checks are then removed.

For more information, the links below take you to the areas of the JIT source code that deal with this:

- [JIT trying to remove range checks](https://github.com/dotnet/coreclr/blob/ec80b02b61839af453ce297faf4ce074edeee9da/src/jit/compiler.cpp#L4524-L4525)
- [RangeCheck::OptimizeRangeCheck(..)](https://github.com/dotnet/coreclr/blob/27b2300f790793733e501497203316ccad390e2b/src/jit/rangecheck.cpp#L201-L303)
  - In turn calls [RangeCheck::GetRange(..)](https://github.com/dotnet/coreclr/blob/27b2300f790793733e501497203316ccad390e2b/src/jit/rangecheck.cpp#L1261-L1290)
  - Also call [Compiler::optRemoveRangeCheck(..)](https://github.com/dotnet/coreclr/blob/c06fb332e7bb77a55bda724a56b33d6094a0a042/src/jit/optimizer.cpp#L7255-L7322) to actually remove the range-check
- Really informative source code comment [explaining the range check removal logic](https://github.com/dotnet/coreclr/blob/master/src/jit/rangecheck.h#L5-L58)

And if you are really keen, take a look at [this gist](https://gist.github.com/mattwarren/a72cdb3ae427957af10635153d79555b#gistcomment-2075030) that I put together to explore the scenarios where bounds checks are 'removed' and 'not removed'.

### Allocating an array

Another task that the runtime helps with is allocating arrays, using hand-written assembly code so the methods are as optimised as possible, see:

- [JIT_TrialAlloc::GenAllocArray(..)](https://github.com/dotnet/coreclr/blob/0ec02d7375a1aa96206fd755b02e553e075ac3ae/src/vm/i386/jitinterfacex86.cpp#L885-L1109) 
- [Patching in the assembly code](https://github.com/dotnet/coreclr/blob/0ec02d7375a1aa96206fd755b02e553e075ac3ae/src/vm/i386/jitinterfacex86.cpp#L1082-L1104)

### Run-time treats arrays differently

Finally, because arrays are so intertwined with the CLR, there are lots of places in which they are dealt with as a *special-case*. For instance [a search for 'IsArray()'](https://github.com/dotnet/coreclr/search?l=C%2B%2B&q=path%3A%2Fsrc+IsArray%28%29&type=&utf8=%E2%9C%93) in the CoreCLR source returns over 60 hits, including:

- The method table for an array is built differently
  - [MethodTableBuilder::BuildInteropVTableForArray(..)](https://github.com/dotnet/coreclr/blob/a9b25d4aa22a1f4ad5f323f6c826e318f5a720fe/src/vm/classcompat.cpp#L543-L608)
- When you call `ToString()` on an array, you get special formatting, i.e. 'System.Int32[]' or 'MyClass[,]' 
  - [TypeString::AppendType(..)](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/vm/typestring.cpp#L903-L937)

----

So yes, it's fair to say that arrays and the CLR have a **Very Special Relationship** 

----

## Further Reading

As always, here are some more links for your enjoyment!!

- [CSharp Specification for Arrays](https://github.com/ljw1004/csharpspec/blob/gh-pages/arrays.md)
- [.NET Type Internals - From a Microsoft CLR Perspective - ARRAYS](https://www.codeproject.com/Articles/20481/NET-Type-Internals-From-a-Microsoft-CLR-Perspecti?fid=459323&fr=26#20)
- [CLR INSIDE OUT - Investigating Memory Issues](http://web.archive.org/web/20081203124917/http://msdn.microsoft.com/msdnmag/issues/06/11/CLRInsideOut/)
- [Internals of Array](http://www.abhisheksur.com/2011/06/internals-of-array.html)
- [Internals of .NET Objects and Use of SOS](http://www.abhisheksur.com/2011/09/internals-of-net-objects-and-use-of-sos.html)
- [Memory layout of .NET Arrays](https://windowsdebugging.wordpress.com/2012/04/07/memorylayoutofarrays/)
- [Memory Layout of .NET Arrays (x64)](https://windowsdebugging.wordpress.com/2012/04/24/memorylayoutofarraysx64/)
- [Why are multi-dimensional arrays in .NET slower than normal arrays?](http://stackoverflow.com/questions/468832/why-are-multi-dimensional-arrays-in-net-slower-than-normal-arrays)
- [How do arrays in C# partially implement IList&lt;T&gt;?](http://stackoverflow.com/questions/11163297/how-do-arrays-in-c-sharp-partially-implement-ilistt/11164210#11164210)
- [Purpose of TypeDependencyAttribute(“System.SZArrayHelper”) for IList&lt;T&gt;, IEnumerable&lt;T&gt; and ICollection&lt;T&gt;?](http://stackoverflow.com/questions/33632073/purpose-of-typedependencyattributesystem-szarrayhelper-for-ilistt-ienumer/33632407#33632407)
- [What kind of class does 'yield return' return](http://stackoverflow.com/questions/15341882/what-kind-of-class-does-yield-return-return/15341925#15341925)
- [SZArrayHelper implemented in Shared Source CLI (SSCLI)](http://labs.developerfusion.co.uk/SourceViewer/browse.aspx?assembly=SSCLI&namespace=System&type=SZArrayHelper)

### Array source code references 

- [Array.cs](https://github.com/dotnet/coreclr/blob/master/src/mscorlib/src/System/Array.cs)
- [array.cpp](https://github.com/dotnet/coreclr/blob/master/src/vm/array.cpp)
- [array.h](https://github.com/dotnet/coreclr/blob/master/src/vm/array.h)