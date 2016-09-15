---
layout: post
title:  Subverting .NET Type Safety with 'System.Runtime.CompilerServices.Unsafe'
comments: true
tags: [Debugging, CLR]
date: 2016-09-14
excerpt: <p>In which we use <code class="highlighter-rouge">System.Runtime.CompilerServices.Unsafe</code> a generic API (“type-safe” but still “unsafe”) and mess with the C# Type System!</p>
---

#### **In which we use `System.Runtime.CompilerServices.Unsafe` a generic API ("type-safe" but still "unsafe") and mess with the C# Type System!**

----

The post covers the following topics:

- [What it is and why it's useful](#what-it-is-and-why-its-useful)
- [How it works](#how-it-works)
- [Code samples](#code-samples)
- [Tricks you can do with it](#tricks-you-can-do-with-it)
- [Using it safely](#using-it-safely)

----

### What it is and why it's useful

The XML documentation comments for `System.Runtime.CompilerServices.Unsafe` state that it:

> Contains generic, low-level functionality for manipulating pointers.

But we can get a better understanding of *what it is* by looking at the actual API definition from the [current NuGet package (4.0.0)](https://www.nuget.org/packages/System.Runtime.CompilerServices.Unsafe/):

``` csharp
// Contains generic, low-level functionality for manipulating pointers.
public static class Unsafe
{
    // Casts the given object to the specified type.
    public static T As<T>(object o) where T : class

    // Returns a pointer to the given by-ref parameter.    
    public static void* AsPointer<T>(ref T value);

    // Copies a value of type T to the given location.    
    public static void Copy<T>(void* destination, ref T source);

    // Copies a value of type T to the given location.
    public static void Copy<T>(ref T destination, void* source);

    // Copies bytes from the source address to the destination address.
    public static void CopyBlock(void* destination, void* source, uint byteCount);

    // Initializes a block of memory at the given location with a given initial value.    
    public static void InitBlock(void* startAddress, byte value, uint byteCount);

    // Reads a value of type T from the given location.
    public static T Read<T>(void* source);
    
    // Returns the size of an object of the given type parameter.    
    public static int SizeOf<T>();

    // Writes a value of type T to the given location.
    public static void Write<T>(void* destination, T value);
}
```

Note: I edited the the XML doc-comments for brevity, the full versions are available [in the source](https://github.com/dotnet/corefx/blob/master/src/System.Runtime.CompilerServices.Unsafe/src/System.Runtime.CompilerServices.Unsafe.xml). There are also some additional [methods that have been added to the API](https://github.com/dotnet/corefx/issues/10451), but to make use of them you have to use a version of the C# compiler with [support for ref returns and locals](https://github.com/dotnet/roslyn/issues/118).

However this doesn't really tell us *why it's useful*, to get some background on that we can look at the GitHub issue ["Provide a generic API to read from and write to a pointer"](https://github.com/dotnet/corefx/issues/5474):

[![GitHub issue - Provide a generic API to read from and write to a pointer]({{ base }}/images/2016/09/GitHub issue - Provide a generic API to read from and write to a pointer.png)](https://github.com/dotnet/corefx/issues/5474)

So at a high-level the goals of the `System.Runtime.CompilerServices.Unsafe` library are to:

1. **Provide a *safer* way of writing low-level `unsafe` code**
  - Without this library you have to resort to `fixed` and pointer manipulation, which can be error prone
1. **Allow access to functionality that can't be expressed in C#, but is possible in IL**
  - For instance `Unsafe.Sizeof<T>()` allows access to the [Sizeof IL Opcode](https://msdn.microsoft.com/en-us/library/system.reflection.emit.opcodes.sizeof(v=vs.110).aspx)
1. **Save developers from having to repeatedly write the same `unsafe` code**
  - There are already [code-bases making use of it](https://github.com/dotnet/corefxlab/pull/796), including the [Kestrel the high-performance web server, based on libuv.](https://github.com/aspnet/KestrelHttpServer/pull/1000)

It's also worth pointing out that the library is primarily for use with a Value Type (int, float, etc) rather than a `class` or Reference type. You can use it with classes, however you [have to pin them first](https://msdn.microsoft.com/en-us/library/23acw07k(v=vs.110).aspx), so they don't move about in memory whilst you are working with the pointer.

**Update:** It was pointed out to me that [Niels](https://github.com/nietras) wrote an initial implementation of this library [in a separate project](https://github.com/DotNetCross/Memory.Unsafe), before Microsoft made their own version.

----

### How it works

Because the library allows access to functionality that can't be expressed in C#, it has to be [written in raw IL](https://github.com/dotnet/corefx/blob/master/src/System.Runtime.CompilerServices.Unsafe/src/System.Runtime.CompilerServices.Unsafe.il), which is then compiled by a custom build-step. As an example we will look at the `AsPointer` method, which has the following signature:

``` csharp
public static void* AsPointer<T>(ref T value)
```

The IL for this is shown below, note how the `ref` keyword becomes `&` in IL and `<T>` is expressed as `!!T`:

```
.method public hidebysig static void* AsPointer<T>(!!T& 'value') cil managed aggressiveinlining
{
    .custom instance void System.Runtime.Versioning.NonVersionableAttribute::.ctor() = ( 01 00 00 00 )
    .maxstack 1
    ldarg.0
    conv.u
    ret
} // end of method Unsafe::AsPointer
```

Here we can see that it's making use of the `conv.u` IL instruction. For reference the explanation of this, along with some of the other op codes used by the library are shown below:

- [Conv_U](https://msdn.microsoft.com/en-us/library/system.reflection.emit.opcodes.conv_u(v=vs.110).aspx) - Converts the value on top of the evaluation stack to **unsigned native int**, and extends it to **native int**.
- [Ldobj](https://msdn.microsoft.com/en-us/library/system.reflection.emit.opcodes.ldobj(v=vs.110).aspx) - Copies the value type object pointed to by an address to the top of the evaluation stack.
- [Stobj](https://msdn.microsoft.com/en-us/library/system.reflection.emit.opcodes.stobj(v=vs.110).aspx) - Copies a value of a specified type from the evaluation stack into a supplied memory address.

After searching around I found several other places in the .NET Runtime that make use of raw IL in this way:

- [System.Slices/System/Span.cs](https://github.com/dotnet/corefxlab/blob/master/src/System.Slices/System/Span.cs)
- [PtrUtils in CoreFX Labs](https://github.com/dotnet/corefxlab/blob/master/src/System.Slices/System/PtrUtils.cs)
- [Joe Duffy's slice.net - PtrUtils.il](https://github.com/joeduffy/slice.net/blob/master/src/PtrUtils.il)

----

### Code samples

There's a [nice set of unit tests](https://github.com/dotnet/corefx/blob/e34ffcd5875d44f8dad10efc07d357a78175b264/src/System.Runtime.CompilerServices.Unsafe/tests/UnsafeTests.cs) that show the main use-cases for the library, for instance here is how to use `Unsafe.Write(..)` to directly change the value of an `int` via a pointer.

``` csharp
[Fact]
public static unsafe void WriteInt32()
{
    int value = 10;
    int* address = (int*)Unsafe.AsPointer(ref value);
    int expected = 20;
    Unsafe.Write(address, expected);

    Assert.Equal(expected, value);
    Assert.Equal(expected, *address);
    Assert.Equal(expected, Unsafe.Read<int>(address));
}
```

You can write something similar by manipulating pointers directly, but it's not as straightforward (unless you are familiar with C or C++)

```
int value = 10;
int* ptr = &value;
*ptr = 30;
Console.WriteLine(value); // prints "30"
```

For a more real-world use case, the code below shows how you can access a `KeyValuePair<DateTime, decimal>` directly as a `byte []` (taken from a [GitHub discussion](https://github.com/dotnet/coreclr/issues/5870#issuecomment-240186556)):

``` csharp
var dt = new KeyValuePair<DateTime, decimal>[2];
ref byte asRefByte = ref Unsafe.As<KeyValuePair<DateTime, decimal>, byte>(ref dt[0]);
fixed (byte * ptr = &asRefByte)
{
    // Treat the KeyValuePair<DateTime, decimal> as if it were a byte []
    ...
}
```

(this example is based on the StackOverflow question: ["Get unsafe pointer to array of KeyValuePair<DateTime,decimal> in C#"](http://stackoverflow.com/questions/32864239/get-unsafe-pointer-to-array-of-keyvaluepairdatetime-decimal-in-c-sharp/38979981#38979981))

----

### Tricks you can do with it

Despite providing you with a nice strongly-typed API, you still have to mark your code as `unsafe`, which it's a bit of a give-away that you can use it to do things that normal C# can't!

#### **Breaking immutability**

Strings in C# are immutable and the runtime goes to great lengths to ensure you can't bypass this behaviour. However under-the-hood the String data is just bytes which can be manipulated, indeed the runtime does this manipulation itself inside the `StringBuilder` class.

So using `Unsafe.Write(..)` we can modify the contents of a String - **yay**!! However it needs to be pointed out that this code will potentially break the behaviour of the String class in many subtle ways, **so don’t ever use it in a real application!!**

``` csharp
var text = "ABCDEFGHIJKLMNOPQRSTUVWXKZ";

Console.WriteLine("String Length {0}", text.Length); // prints 26
Console.WriteLine("Text: \"{0}\"", text); // "ABCDEFGHIJKLMNOPQRSTUVWXKZ"

var pinnedText = GCHandle.Alloc(text, GCHandleType.Pinned);
char* textAddress = (char*)pinnedText.AddrOfPinnedObject().ToPointer();

// Make an immutable string think that it is shorter than it actually is!!!
Unsafe.Write(textAddress - 2, 5);

Console.WriteLine("String Length {0}", text.Length); // prints 5
Console.WriteLine("Text: \"{0}\"", text); // prints "ABCDE

// change the 2nd character 'B' to '@'
Unsafe.Write(textAddress + 1, '@');

Console.WriteLine("Text: \"{0}\"", text); // prints "A@CDE

pinnedText.Free();
```

#### **Messing with the CLR type-system**

But we can go even further than that and do a really nasty trick to completely defeat the CLR type-system. This code is horrible and could potentially break the CLR in several ways, so as before **don't ever use it in a real application!!** 

``` csharp
int intValue = 5;
float floatValue = 5.0f;
object boxedInt = (object)intValue, boxedFloat = (float)floatValue;

var pinnedFloat = GCHandle.Alloc(boxedFloat, GCHandleType.Pinned);
var pinnedInt = GCHandle.Alloc(boxedInt, GCHandleType.Pinned);

int* floatAddress = (int*)pinnedFloat.AddrOfPinnedObject().ToPointer();
int* intAddress = (int*)pinnedInt.AddrOfPinnedObject().ToPointer();

Console.WriteLine("Type: {0}, Value: {1}", boxedInt.GetType().FullName, boxedInt);

// Make an int think it's a float!!!
int floatType = Unsafe.Read<int>(floatAddress - 1);
Unsafe.Write(intAddress - 1, floatType);

Console.WriteLine("Type: {0}, Value: {1}", boxedInt.GetType().FullName, boxedInt);

pinnedFloat.Free();
pinnedInt.Free();
```

Which prints out:

> Type: System.Int32, Value: 5
> 
> Type: System.Single, Value: 7.006492E-45

Yep, we've managed to convince a `int` (Int32) type that it's actually a `float` (Single) and behave like one instead!!

This works by overwriting the *Method Table* pointer for the `int`, with the same value as the `float` one. So when it looks up it's type or prints out it's value, it uses the `float` methods instead! Thanks to [@Porges](github.com/Porges) for the [example that motivated this](https://gist.github.com/Porges/4b5fb3f0d66093105422e9892177754f), his code does the same thing using `fixed` instead. 

----

### Using it safely

Despite the library requiring you to annotate your code with `unsafe`, there are still some *safe* or maybe more accurately *safer* ways to use it! 

Fortunately one of the main .NET runtime developers provided a nice list of [what you can and can't do](https://github.com/dotnet/coreclr/issues/5870#issuecomment-227007187):

[![Safely using System.Runtime.CompilerServices.Unsafe]({{ base }}/images/2016/09/Safely using System.Runtime.CompilerServices.Unsafe.png)]({{ base }}/images/2016/09/Safely using System.Runtime.CompilerServices.Unsafe.png)

But as with all `unsafe` code, you're asking the runtime to let you do things that you are normally prevented from doing, things that it normally saves you from, so you have to be careful!