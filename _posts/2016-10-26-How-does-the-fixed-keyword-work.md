---
layout: post
title: How does the 'fixed' keyword work?
comments: true
tags: [CLR, JIT Compiler, GC, Internals]
---

Well it turns out that it's a really nice example of collaboration between the main parts of the .NET runtime, here's a list of all the components involved:

- [Compiler](#compiler)
- [JITter](#jitter)
- [CLR](#clr)
- [Garbage Collector (GC)](#garbage-collector)

Now you could argue that all of these are required to execute any C# code, but what's interesting about the `fixed` keyword is that they all have a *specific* part to play.

----

### Compiler

To start with let's look at one of the most basic scenarios for using the `fixed` keyword, directly accessing the contents of a C# `string`, (taken from a [Roslyn unit test](https://github.com/dotnet/roslyn/blob/614299ff83da9959fa07131c6d0ffbc58873b6ae/src/Compilers/CSharp/Test/Emit/CodeGen/UnsafeTests.cs#L1467-L1515))

``` csharp
using System;
unsafe class C
{
    static unsafe void Main()
    {
        fixed (char* p = "hello")
        {
            Console.WriteLine(*p);
        }
    }
}
```

Which the compiler then turns into the following IL:

``` javascript
// Code size       34 (0x22)
.maxstack  2
.locals init (char* V_0, //p
              pinned string V_1)
IL_0000:  nop
IL_0001:  ldstr "hello"
IL_0006:  stloc.1
IL_0007:  ldloc.1
IL_0008:  conv.i
IL_0009:  stloc.0
IL_000a:  ldloc.0
IL_000b:  brfalse.s  IL_0015
IL_000d:  ldloc.0
IL_000e:  call "int System.Runtime.CompilerServices.RuntimeHelpers.OffsetToStringData.get"
IL_0013:  add
IL_0014:  stloc.0
IL_0015:  nop
IL_0016:  ldloc.0
IL_0017:  ldind.u2
IL_0018:  call "void System.Console.WriteLine(char)"
IL_001d:  nop
IL_001e:  nop
IL_001f:  ldnull
IL_0020:  stloc.1
IL_0021:  ret
```

Note the `pinned string V_1` that the compiler has created for us, it's made a *hidden* local variable that holds a reference to the `object` we are using in the `fixed` statement, which in this case is the string "*hello*". The purpose of this pinned local variable will be explained in a moment.

It's also emitted an call to the `OffsetToStringData` getter method (from `System.Runtime.CompilerServices.RuntimeHelpers`), which we will cover in more detail when we discuss the [CLR's role](#clr).

However, as an aside the compiler is also performing an optimisation for us, normally it would *wrap* the `fixed` statement in a `finally` block to ensure the pinned local variable is nulled out after controls leaves the scope. But in this case it has determined that is can leave out the `finally` statement entirely, from [LocalRewriter_FixedStatement.cs](https://github.com/dotnet/roslyn/blob/614299ff83da9959fa07131c6d0ffbc58873b6ae/src/Compilers/CSharp/Portable/Lowering/LocalRewriter/LocalRewriter_FixedStatement.cs#L49-L54) in the Roslyn source:

``` cs
// In principle, the cleanup code (i.e. nulling out the pinned variables) is always
// in a finally block.  However, we can optimize finally away (keeping the cleanup
// code) in cases where both of the following are true:
//   1) there are no branches out of the fixed statement; and
//   2) the fixed statement is not in a try block (syntactic or synthesized).
if (IsInTryBlock(node) || HasGotoOut(rewrittenBody))
{
...
}
```

### What is this pinned identifier? 

Let's start by looking at the authoritative source, from [Standard ECMA-335 Common Language Infrastructure (CLI)](http://www.ecma-international.org/publications/standards/Ecma-335.htm)

> **II.7.1.2 pinned**
The signature encoding for **pinned** shall appear only in signatures that describe local variables (§II.15.4.1.3). While a method with a **pinned** local variable is executing, the VES shall not relocate the object to which the local refers. That is, if the implementation of the CLI uses a garbage collector that moves objects, the collector shall not move objects that are referenced by an active **pinned** local variable.
>
>[*Rationale*: If unmanaged pointers are used to dereference managed objects, these objects shall be **pinned**. This happens, for example, when a managed object is passed to a method designed to operate with unmanaged data. *end rationale*]
>
> VES = Virtual Execution System
CLI = Common Language Infrastructure
CTS = Common Type System

But if you prefer an explanation in more human readable form (i.e. not from a spec), then this extract from [.Net IL Assembler Paperback by Serge Lidin](https://www.amazon.co.uk/NET-Assembler-Serge-Lidin/dp/1430267615/ref=as_li_ss_tl?ie=UTF8&linkCode=sl1&tag=mattonsoft-21&linkId=062fce40a5e1895bba51689c80a6a163) is helpful:

![Explanation of pinned from .NET IL Assembler book]({{ base }}/images/2016/10/Explanation of pinned from .NET IL Assembler book.png) 

(Also available on [Google Books](https://books.google.co.uk/books?id=Xv_0AwAAQBAJ&pg=PA140&lpg=PA140&dq=.net+il+pinned+local+variable&source=bl&ots=Yk262rHHNl&sig=nNmZtNncfcGAnMdBQ5uQLtggNQc&hl=en&sa=X&redir_esc=y#v=onepage&q&f=false))

----

### CLR

Arguably the CLR has the easiest job to do (if you accept that it exists as a separate component from the JIT and GC), its job is to provide the offset of the raw `string` data via the [`OffsetToStringData` method](https://github.com/dotnet/coreclr/blob/ffeef85a626d7344fd3e2031f749c356db0628d3/src/mscorlib/src/System/Runtime/CompilerServices/RuntimeHelpers.cs#L177-L196) that is emitted by the compiler. 

Now you might be thinking that this method does some complex calculations to determine the exact offset, but nope, it's hard-coded!! (I told you that [Strings and the CLR have a *Special Relationship*]({{ base }}/2016/05/31/Strings-and-the-CLR-a-Special-Relationship/)):


``` cs
public static int OffsetToStringData
{
    // This offset is baked in by string indexer intrinsic, so there is no harm
    // in getting it baked in here as well.
    [System.Runtime.Versioning.NonVersionable] 
    get {
        // Number of bytes from the address pointed to by a reference to
        // a String to the first 16-bit character in the String.  Skip 
        // over the MethodTable pointer, & String length.  Of course, the 
        // String reference points to the memory after the sync block, so 
        // don't count that. 
        // This property allows C#'s fixed statement to work on Strings.
        // On 64 bit platforms, this should be 12 (8+4) and on 32 bit 8 (4+4).
#if BIT64
        return 12;
#else // 32
        return 8;
#endif // BIT64
    }
}
```

----

### JITter

For the `fixed` keyword to work the role of the JITter is to provide information to the GC/Runtime about the lifetimes of variables within a method and in-particular if they are *pinned* locals. It does this via the `GCInfo` data it [creates for every method](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/Documentation/botr/ryujit-overview.md#gc-info):

[![GC Info provided by the JIT]({{ base }}/images/2016/10/GC Info provided by the JIT.png)](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/Documentation/botr/ryujit-overview.md#gc-info)

To see this in action we have to enable the [correct magic flags](https://github.com/dotnet/coreclr/blob/master/Documentation/building/viewing-jit-dumps.md#useful-complus-variables) and then we will see the following:

``` racket
Compiling    0 ConsoleApplication.Program::Main, IL size = 30, hsh=0x8d66958e
; Assembly listing for method ConsoleApplication.Program:Main(ref)
; Emitting BLENDED_CODE for X64 CPU with AVX
; optimized code
; rsp based frame
; partially interruptible
; Final local variable assignments
;
;* V00 arg0         [V00    ] (  0,   0  )     ref  ->  zero-ref   
;  V01 loc0         [V01,T00] (  5,   4  )    long  ->  rcx        
;  V02 loc1         [V02    ] (  3,   3  )     ref  ->  [rsp+0x20]   must-init pinned
;  V03 tmp0         [V03,T01] (  2,   4  )    long  ->  rcx        
;  V04 OutArgs      [V04    ] (  1,   1  )  lclBlk (32) [rsp+0x00]  
;
; Lcl frame size = 40

G_M27250_IG01:
000000 4883EC28             sub      rsp, 40
000004 33C0                 xor      rax, rax
000006 4889442420           mov      qword ptr [rsp+20H], rax

G_M27250_IG02:
00000B 488B0C256830B412     mov      rcx, gword ptr [12B43068H]      'hello'
000013 48894C2420           mov      gword ptr [rsp+20H], rcx
000018 488B4C2420           mov      rcx, gword ptr [rsp+20H]
00001D 4885C9               test     rcx, rcx
000020 7404                 je       SHORT G_M27250_IG03
000022 4883C10C             add      rcx, 12

G_M27250_IG03:
000026 0FB709               movzx    rcx, word  ptr [rcx]
000029 E842FCFFFF           call     System.Console:WriteLine(char)
00002E 33C0                 xor      rax, rax
000030 4889442420           mov      gword ptr [rsp+20H], rax

G_M27250_IG04:
000035 4883C428             add      rsp, 40
000039 C3                   ret      

; Total bytes of code 58, prolog size 11 for method ConsoleApplication.Program:Main(ref)
; ============================================================
Set code length to 58.
Set Outgoing stack arg area size to 32.
Stack slot id for offset 32 (0x20) (sp) (pinned, untracked) = 0.
Defining 1 call sites:
    Offset 0x29, size 5.
```

See how in the section titled "*Final local variable assignments*" is had indicated that the `V02 loc1` variable is `must-init pinned` and then down at the bottom is has this text:

> Stack slot id for offset 32 (0x20) (sp) (pinned, untracked) = 0.

**Aside**: The JIT has also done some extra work for us and optimised away the call to `OffsetToStringData` by inlining it as the assembly code `add rcx, 12`. On a slightly related note, previously the `fixed` keyword prevented a method from being inlined, but recently that changed, see [Support inlining method with pinned locals](https://github.com/dotnet/coreclr/issues/7774) for the full details.

----

### Garbage Collector

Finally we come to the GC which has an important "*role to play*", or "*not to play*" depending on which way you look at it. 

In effect the GC has to get out of the way and leave the pinned local variable alone for the life-time of the method. Normally the GC is concerned about which objects are *live* or *dead* so that it knows what it has to clean up. But with pinned objects it has to go one step further, not only must it *not clean up* the object, but it must *not move it around*. Generally the GC likes to relocate objects around during the [Compact Phase](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/garbage-collection.md#compact-phase) to make memory allocations cheap, but pinning prevents that as the object is being accessed via a pointer and therefore its memory address *has* to remain the same.

There is a great visual explanation of what that looks like from the excellent presentation [CLR: Garbage Collection Inside Out](http://slideplayer.com/slide/6084514/) by [Maoni Stephens](https://blogs.msdn.microsoft.com/maoni/) (click for full-sized version):

[![Fragmentation Problem Caused By Pinning]({{ base }}/images/2016/10/Fragmentation Problem Caused By Pinning.png)]({{ base }}/images/2016/10/Fragmentation Problem Caused By Pinning.png)

Note how the pinned blocks (marked with a 'P') have remained where they are, forcing the Gen 0/1/2 segments to start at awkard locations. This is why pinning too many objects and keeping them pinned for too long can cause GC overhead, it has to perform extra booking keeping and work around them.

In reality, when using the `fixed` keyword, your object will only remain pinned for a short period of time, i.e. until control leaves the scope. But if you are pinning object via the [`GCHandle` class](https://msdn.microsoft.com/en-us/library/system.runtime.interopservices.gchandle(v=vs.110).aspx) then the lifetime could be longer.

So to finish, let's get the final word on pinning from Maoni Stephens, from [Using GC Efficiently – Part 3](https://blogs.msdn.microsoft.com/maoni/2004/12/19/using-gc-efficiently-part-3/) (read the blog post for more details):

> **When you do need to pin, here are some things to keep in mind:**
>  
> 1. Pinning for a short time is cheap.
> 2. Pinning an older object is not as harmful as pinning a young object.
> 3. Creating pinned buffers that stay together instead of scattered around. This way you create fewer holes.

----

## Summary

So that's it, simple really!! 

All the main parts of the .NET runtime do their bit and we get to use a handy feature that lets us drop-down and perform some bare-metal coding!!

Discuss this post in [/r/programming](https://www.reddit.com/r/programming/comments/59qa94/how_does_the_c_fixed_keyword_work/)

----

### Further Reading

If you've read this far, you might find some of these links useful:

- CoreCLR Repo Searches
  - ['pinned'](https://github.com/dotnet/coreclr/search?q=pinned&utf8=%E2%9C%93)
  - ['GC lifetimes](https://github.com/dotnet/coreclr/search?q=GC+lifetimes&utf8=%E2%9C%93)
  - ['path:/src/gc pinned'](https://github.com/dotnet/coreclr/search?q=path%3A%2Fsrc%2Fgc+pinned&type=Code&utf8=%E2%9C%93)
  - ['path:/Documentation pinned'](https://github.com/dotnet/coreclr/search?q=path%3A%2FDocumentation+pinned&type=Code)
  - ['path:/Documentation "GC Info"'](https://github.com/dotnet/coreclr/search?q=path%3A%2FDocumentation+%22GC+Info%22)
  - ['path:/Documentation GCInfo'](https://github.com/dotnet/coreclr/search?utf8=%E2%9C%93&q=path%3A%2FDocumentation+GCInfo&type=Code)
- [Clearing up some confusion over finalization and other areas in GC](https://blogs.msdn.microsoft.com/maoni/2004/11/04/clearing-up-some-confusion-over-finalization-and-other-areas-in-gc/)
- [Gen2 free list changes in CLR 4.6 GC](https://blogs.msdn.microsoft.com/maoni/2015/08/12/gen2-free-list-changes-in-clr-4-6-gc/)
- [Improve StringBuilder ctor(), ctor(int), and ToString() performance.](https://github.com/dotnet/coreclr/pull/7029) - turns out doing `fixed (char* sourcePtr = &array[0])` instead of `fixed(char* sourcePtr = array)` can be faster!!
- [GC behavior when pinning an object](http://stackoverflow.com/questions/26927243/gc-behavior-when-pinning-an-object)