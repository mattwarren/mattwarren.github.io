---
layout: post
title: A look at the internals of 'boxing' in the CLR
comments: true
tags: [.NET, CLR, Internals]
---

It's a [fundamental part of .NET](https://stackoverflow.com/search?q=boxing+c%23) and can often happen [without you knowing](https://github.com/controlflow/resharper-heapview#resharper-heap-allocations-viewer-plugin), but **how does it actually work**? What is the .NET Runtime doing to make *boxing* possible?

**Note**: this post won't be discussing how to detect boxing, how it can affect performance or how to remove it (speak to [Ben Adams](https://www.ageofascent.com/2016/02/18/asp-net-core-exeeds-1-15-million-requests-12-6-gbps/) about that!). It will **only** be talking about *how it works*.  

----

As an aside, if you like reading about **CLR internals** you may find these other posts interesting:

- [How the .NET Runtime loads a Type]({{ base }}/2017/06/15/How-the-.NET-Rutime-loads-a-Type/?recommended=1)
- [Arrays and the CLR - a Very Special Relationship]({{ base }}/2017/05/08/Arrays-and-the-CLR-a-Very-Special-Relationship/?recommended=1)
- [The CLR Thread Pool 'Thread Injection' Algorithm]({{ base }}/2017/04/13/The-CLR-Thread-Pool-Thread-Injection-Algorithm/?recommended=1)
- [The 68 things the CLR does before executing a single line of your code]({{ base }}/2017/02/07/The-68-things-the-CLR-does-before-executing-a-single-line-of-your-code/?recommended=1)
- [How do .NET delegates work?]({{ base }}/2017/01/25/How-do-.NET-delegates-work/?recommended=1)
- [Why is reflection slow?]({{ base }}/2016/12/14/Why-is-Reflection-slow/?recommended=1)
- [How does the 'fixed' keyword work?]({{ base }}/2016/10/26/How-does-the-fixed-keyword-work/?recommended=1)

----

### Boxing in the CLR Specification

Firstly it's worth pointing out that boxing is mandated by the [CLR specification 'ECMA-335'](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-335.pdf), so the runtime **has** to provide it:

[![ECMA Spec - I.8.2.4 Boxing and unboxing of values]({{ base }}/images/2017/08/ECMA Spec - I.8.2.4 Boxing and unboxing of values - cutdown.png)]({{ base }}/images/2017/08/ECMA Spec - I.8.2.4 Boxing and unboxing of values.png)

This means that there are a few key things that the CLR needs to take care of, which we will explore in the rest of this post.

----

## Creating a 'boxed' Type

The first thing that the runtime needs to do is create the corresponding reference type ('boxed type') for any `struct` that it loads. You can see this in action, right at the beginning of the 'Method Table' creation where it [first checks if it's dealing with a 'Value Type'](https://github.com/dotnet/coreclr/blob/4b49e4330441db903e6a5b6efab3e1dbb5b64ff3/src/vm/methodtablebuilder.cpp#L1425-L1445), then behaves accordingly. So the 'boxed type' for any `struct` is created up front, when your .dll is imported, then it's ready to be used by any 'boxing' that happens during program execution.

The comment in the linked code is pretty interesting, as it reveals some of the low-level details the runtime has to deal with:

``` Text
// Check to see if the class is a valuetype; but we don't want to mark System.Enum
// as a ValueType. To accomplish this, the check takes advantage of the fact
// that System.ValueType and System.Enum are loaded one immediately after the
// other in that order, and so if the parent MethodTable is System.ValueType and
// the System.Enum MethodTable is unset, then we must be building System.Enum and
// so we don't mark it as a ValueType.
```

---

## CPU-specific code-generation

But to see what happens during program execution, let's start with a simple C# program. The code below creates a custom `struct` or `Value Type`, which is then 'boxed' and 'unboxed':

``` csharp
public struct MyStruct
{
    public int Value;
}

var myStruct = new MyStruct();

// boxing
var boxed = (object)myStruct;

// unboxing
var unboxed = (MyStruct)boxed;
```

This gets turned into the following IL code, in which you can see the `box` and `unbox.any` IL instructions:

``` Text
L_0000: ldloca.s myStruct
L_0002: initobj TestNamespace.MyStruct
L_0008: ldloc.0 
L_0009: box TestNamespace.MyStruct
L_000e: stloc.1 
L_000f: ldloc.1 
L_0010: unbox.any TestNamespace.MyStruct
```

### Runtime and JIT code

So what does the JIT do with these IL op codes? Well in the normal case it *wires up* and then *inlines* the optimised, hand-written,  assembly code versions of the 'JIT Helper Methods' provided by the runtime. The links below take you to the relevant lines of code in the CoreCLR source: 

- CPU specific, optimised versions (which are [wired-up at run-time](https://github.com/dotnet/coreclr/blob/4b49e4330441db903e6a5b6efab3e1dbb5b64ff3/src/vm/jitinterfacegen.cpp#L217-L275)):
  - [JIT_BoxFastMP_InlineGetThread](https://github.com/dotnet/coreclr/blob/master/src/vm/amd64/JitHelpers_InlineGetThread.asm#L86-L148) (AMD64 - multi-proc or Server GC, implicit TLS)
  - [JIT_BoxFastMP](https://github.com/dotnet/coreclr/blob/8cc7e35dd0a625a3b883703387291739a148e8c8/src/vm/amd64/JitHelpers_Slow.asm#L201-L271) (AMD64 - multi-proc or Server GC)
  - [JIT_BoxFastUP](https://github.com/dotnet/coreclr/blob/8cc7e35dd0a625a3b883703387291739a148e8c8/src/vm/amd64/JitHelpers_Slow.asm#L485-L554) (AMD64 - single-proc and Workstation GC)
  - [JIT_TrialAlloc::GenBox(..)](https://github.com/dotnet/coreclr/blob/38a2a69c786e4273eb1339d7a75f939c410afd69/src/vm/i386/jitinterfacex86.cpp#L756-L886) (x86), which is [independently wired-up](https://github.com/dotnet/coreclr/blob/38a2a69c786e4273eb1339d7a75f939c410afd69/src/vm/i386/jitinterfacex86.cpp#L1503-L1504)
- JIT inlines the helper function call in the common case, see [Compiler::impImportAndPushBox(..)](https://github.com/dotnet/coreclr/blob/a14608efbad1bcb4e9d36a418e1e5ac267c083fb/src/jit/importer.cpp#L5212-L5221)
- Generic, less-optimised version, used as a fall-back [MethodTable::Box(..)](https://github.com/dotnet/coreclr/blob/master/src/vm/methodtable.cpp#L3734-L3783)
  - Eventually calls into [CopyValueClassUnchecked(..)](https://github.com/dotnet/coreclr/blob/master/src/vm/object.cpp#L1514-L1581)
  - Which ties in with the answer to this Stack Overflow question [Why is struct better with being less than 16 bytes?](https://stackoverflow.com/questions/2437925/why-is-struct-better-with-being-less-than-16-bytes/2437938#2437938)

Interesting enough, the only other 'JIT Helper Methods' that get this special treatment are `object`, `string` or `array` allocations, which goes to show just how *performance sensitive* boxing is. 

In comparison, there is only one helper method for 'unboxing', called [JIT_Unbox(..)](https://github.com/dotnet/coreclr/blob/03bec77fb4efaa397248a2b9a35c547522221447/src/vm/jithelpers.cpp#L3603-L3626), which falls back to [JIT_Unbox_Helper(..)](https://github.com/dotnet/coreclr/blob/03bec77fb4efaa397248a2b9a35c547522221447/src/vm/jithelpers.cpp#L3574-L3600) in the uncommon case and is [wired up here](https://github.com/dotnet/coreclr/blob/4b49e4330441db903e6a5b6efab3e1dbb5b64ff3/src/inc/jithelpers.h#L105) (`CORINFO_HELP_UNBOX` to `JIT_Unbox`). The JIT will also inline the helper call in the common case, to save the cost of a method call, see [Compiler::impImportBlockCode(..)](https://github.com/dotnet/coreclr/blob/11c911e6f49fdc95fc52bec8d930df7e5c50daa9/src/jit/importer.cpp#L14172-L14177).

Note that the 'unbox helper' only fetches a reference/pointer to the 'boxed' data, it has to then be [put onto the stack](https://github.com/dotnet/coreclr/blob/11c911e6f49fdc95fc52bec8d930df7e5c50daa9/src/jit/importer.cpp#L14277-L14283). As we saw above, when the C# compiler does unboxing it uses the ['Unbox_Any'](https://msdn.microsoft.com/en-us/library/system.reflection.emit.opcodes.unbox_any(v=vs.110).aspx) op-code not just the ['Unbox'](https://msdn.microsoft.com/en-us/library/system.reflection.emit.opcodes.unbox(v=vs.110).aspx) one, see [Unboxing does not create a copy of the value](https://stackoverflow.com/questions/3743762/unboxing-does-not-create-a-copy-of-the-value-is-this-right) for more information.

----

## Unboxing Stub Creation

As well as 'boxing' and 'unboxing' a `struct`, the runtime also needs to help out during the time that a type remains 'boxed'. To see why, let's extend `MyStruct` and `override` the `ToString()` method, so that it displays the current `Value`:

``` csharp
public struct MyStruct
{
    public int Value;
	
    public override string ToString()
    {
        return "Value = " + Value.ToString();
    }
}
```

Now, if we look at the 'Method Table' the runtime creates for the *boxed* version of `MyStruct` (remember, value types have no 'Method Table'), we can see something strange going on. Note that there are 2 entries for `MyStruct::ToString`, one of which I've labelled as an 'Unboxing Stub'

```
 Method table summary for 'MyStruct':
 Number of static fields: 0
 Number of instance fields: 1
 Number of static obj ref fields: 0
 Number of static boxed fields: 0
 Number of declared fields: 1
 Number of declared methods: 1
 Number of declared non-abstract methods: 1
 Vtable (with interface dupes) for 'MyStruct':
   Total duplicate slots = 0

 SD: MT::MethodIterator created for MyStruct (TestNamespace.MyStruct).
   slot  0: MyStruct::ToString  0x000007FE41170C10 (slot =  0) (Unboxing Stub)
   slot  1: System.ValueType::Equals  0x000007FEC1194078 (slot =  1) 
   slot  2: System.ValueType::GetHashCode  0x000007FEC1194080 (slot =  2) 
   slot  3: System.Object::Finalize  0x000007FEC14A30E0 (slot =  3) 
   slot  5: MyStruct::ToString  0x000007FE41170C18 (slot =  4) 
   <-- vtable ends here
```

([full output is available]({{ base }}\data\2017\08\Full Method Table info for MyStruct.txt))

**So what is this 'unboxing stub' and why is it needed?**

It's there because if you call `ToString()` on a *boxed* version of `MyStruct`, it calls the *overridden* method declared within `MyStruct` itself (which is what you'd want it to do), not the [Object::ToString()](https://msdn.microsoft.com/en-us/library/system.object.tostring(v=vs.110).aspx) version. But, `MyStruct::ToString()` expects to be able to access any fields within the `struct`, such as `Value` in this case. To make that possible, the runtime/JIT has to adjust the `this` pointer before `MyStruct::ToString()` is called, as shown in the diagram below:

````
1. MyStruct:         [0x05 0x00 0x00 0x00]

                     |   Object Header   |   MethodTable  |   MyStruct    |
2. MyStruct (Boxed): [0x40 0x5b 0x6f 0x6f 0xfe 0x7 0x0 0x0 0x5 0x0 0x0 0x0]
                                          ^
                    object 'this' pointer | 

                     |   Object Header   |   MethodTable  |   MyStruct    |
3. MyStruct (Boxed): [0x40 0x5b 0x6f 0x6f 0xfe 0x7 0x0 0x0 0x5 0x0 0x0 0x0]
                                                           ^
                                   adjusted 'this' pointer | 
````

**Key to the diagram**

1. Original `struct`, on the **stack**
2. The `struct` being *boxed* into an `object` that lives on the **heap**
3. Adjustment made to *this* pointer so `MyStruct::ToString()` will work

(If you want more information on .NET object internals, see [this useful article](https://alexandrnikitin.github.io/blog/dotnet-generics-under-the-hood/#net-memory-layout))

We can see this in action in the the code linked below, note that the stub *only* consists of a few assembly instructions (it's not as heavy-weight as a method call) and there are CPU-specific versions:
 
- [MethodDesc::DoPrestub(..)](https://github.com/dotnet/coreclr/blob/c61525b5883e883621f98d44f479b15d790b0533/src/vm/prestub.cpp#L1760-L1763) (calls `MakeUnboxingStubWorker(..)`)
- [MakeUnboxingStubWorker(..)](https://github.com/dotnet/coreclr/blob/c61525b5883e883621f98d44f479b15d790b0533/src/vm/prestub.cpp#L1332-L1364) (calls `EmitUnboxMethodStub(..)` to create the stub)
  - [i386](https://github.com/dotnet/coreclr/blob/1c9eb774950c98ae65ef5497d805cff2eb565971/src/vm/i386/stublinkerx86.cpp#L3305-L3363)
  - [arm](https://github.com/dotnet/coreclr/blob/1c540c594cc55d8446086dcd979c48efa84e00a9/src/vm/arm/stubs.cpp#L2194-L2221)
  - [arm64](https://github.com/dotnet/coreclr/blob/1c540c594cc55d8446086dcd979c48efa84e00a9/src/vm/arm64/stubs.cpp#L1829-L1839)

The runtime/JIT has to do these tricks to help maintain the illusion that a `struct` can behave like a `class`, even though under-the-hood they are very different. See Eric Lipperts answer to [How do ValueTypes derive from Object (ReferenceType) and still be ValueTypes?](https://stackoverflow.com/questions/1682231/how-do-valuetypes-derive-from-object-referencetype-and-still-be-valuetypes) for a bit more on this.

----

Hopefully this post has given you some idea of what happens *under-the-hood* when 'boxing' takes place.

----

## Further Reading

As before, if you've got this far you might find these other links interesting:

### Useful code comments related to boxing/unboxing stubs

- [MethodTableBuilder::AllocAndInitMethodDescChunk(..)](https://github.com/dotnet/coreclr/blob/a14608efbad1bcb4e9d36a418e1e5ac267c083fb/src/vm/methodtablebuilder.cpp#L6748-L6760)
- [MethodDesc::FindOrCreateAssociatedMethodDesc(..) (in genmeth.cpp)](https://github.com/dotnet/coreclr/blob/fd3668c7c9b9f5d64b5e6d1edf8c55a307cd3c2d/src/vm/genmeth.cpp#L733-L750)
- [Compiler::impImportBlockCode(..)](https://github.com/dotnet/coreclr/blob/eeb1efd9394a5decd00078b06099d785a471c06d/src/jit/importer.cpp#L14229-L14247)
- [Note on different 'Boxing' modes](https://github.com/AndyAyersMS/coreclr/blob/aa70c0c4b98c167b4b347df79e1765d6727dac5a/src/jit/importer.cpp#L5204-L5219), added as part of the work on [JIT: modify box/unbox/isinst/castclass expansions for fast jitting](https://github.com/dotnet/coreclr/pull/13188)

### GitHub Issues

- [Question: Boxing on stack for function calls](https://github.com/dotnet/coreclr/issues/8735)
- [Boxing Cache?](https://github.com/dotnet/coreclr/issues/8423)
- [Improve the default hash code for structs](https://github.com/dotnet/coreclr/issues/1341) (read the whole discussion)
- [JIT: Fix value type box optimization](https://github.com/dotnet/coreclr/pull/13016)
- [(Discussion) Lightweight Boxing?](https://github.com/dotnet/coreclr/issues/111)

### Other similar/related articles

- [.NET Type Internals - From a Microsoft CLR Perspective](https://www.codeproject.com/Articles/20481/NET-Type-Internals-From-a-Microsoft-CLR-Perspecti#12) (section on 'Boxing and Unboxing')
- [C# value type boxing under the hood](http://yizhang82.me/value-type-boxing#interface-call-into-the-value-type-instance-method) (section on 'Interface call into the value type instance method')
- [Value type methods – call, callvirt, constrained and hidden boxing](https://mycodingplace.wordpress.com/2016/11/11/value-type-methods-call-callvirt-constrained-and-hidden-boxing/)
- [Performance Quiz #12 -- The Cost of a Good Hash -- Solution](https://blogs.msdn.microsoft.com/ricom/2007/01/26/performance-quiz-12-the-cost-of-a-good-hash-solution/) (Rico Mariani)
- [To box or not to box](https://ericlippert.com/2011/03/14/to-box-or-not-to-box/) (Eric Lippert)
- [Beware of implicit boxing of value types](http://theburningmonk.com/2015/07/beware-of-implicit-boxing-of-value-types/)
- [Method calls on value types and boxing](http://doogalbellend.blogspot.co.uk/2007/04/method-calls-on-value-types-and-boxing.html)

### Stack Overflow Questions

- [CLR specification on boxing](https://stackoverflow.com/questions/7660605/clr-specification-on-boxing)
- [How CLR works when invoking a method of a struct](https://stackoverflow.com/questions/5494807/how-clr-works-when-invoking-a-method-of-a-struct)
- [boxing on structs when calling ToString()](https://stackoverflow.com/questions/1249086/boxing-on-structs-when-calling-tostring)
- [Does calling a method on a value type result in boxing in .NET?](https://stackoverflow.com/questions/436363/does-calling-a-method-on-a-value-type-result-in-boxing-in-net)
- [Why does implicitly calling toString on a value type cause a box instruction](https://stackoverflow.com/questions/1359856/why-does-implicitly-calling-tostring-on-a-value-type-cause-a-box-instruction)
- [Why is struct better with being less than 16 bytes](https://stackoverflow.com/questions/2437925/why-is-struct-better-with-being-less-than-16-bytes/2437938#2437938)
- [When are Type Objects for Value Types created?](https://stackoverflow.com/questions/40217308/when-are-type-objects-for-value-types-created)
- [If my struct implements IDisposable will it be boxed when used in a using statement?](https://stackoverflow.com/questions/2412981/if-my-struct-implements-idisposable-will-it-be-boxed-when-used-in-a-using-statem)
- [When does a using-statement box its argument, when it's a struct?](https://stackoverflow.com/questions/1330571/when-does-a-using-statement-box-its-argument-when-its-a-struct)