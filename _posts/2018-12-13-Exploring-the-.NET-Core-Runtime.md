---
layout: post
title: Exploring the .NET Core Runtime (in which I set myself a challenge)
comments: true
codeproject: false
tags: [CLR, .NET, Internals]
---

It seems like this time of year anyone with a blog is doing some sort of 'advent calendar', i.e. 24 posts leading up to Christmas. For instance there's a [F# one](https://sergeytihon.com/2018/10/22/f-advent-calendar-in-english-2018/) which inspired a [C# one](https://crosscuttingconcerns.com/The-Second-Annual-C-Advent) (*C# copying from F#, that never happens* 😉)

However, that's a bit of a problem for me, I struggled to write 24 posts [in my most productive year]({{ base }}/postsByYear/#2016-ref), let alone a single month! Also, I mostly blog about ['.NET Internals']({{ base }}/tags/#Internals), a subject which doesn't necessarily lend itself to the more '*light-hearted*' posts you get in these 'advent calendar' blogs.

**Until now!**

----

Recently I've been giving a talk titled **from 'dotnet run' to 'hello world'**, which attempts to explain everything that the .NET Runtime does from the point you launch your application till "Hello World" is printed on the screen:

<iframe src="//www.slideshare.net/slideshow/embed_code/key/xU98KRbWFvU2SC?startSlide=6" width="595" height="485" frameborder="0" marginwidth="0" marginheight="0" scrolling="no" style="border:1px solid #CCC; border-width:1px; margin-bottom:5px; max-width: 100%;" allowfullscreen> </iframe> <div style="margin-bottom:5px"> <strong> <a href="//www.slideshare.net/mattwarren/from-dotnet-run-to-hello-world" title="From &#x27;dotnet run&#x27; to &#x27;hello world&#x27;" target="_blank">From &#x27;dotnet run&#x27; to &#x27;hello world&#x27;</a> </strong> from <strong><a href="//www.slideshare.net/mattwarren" target="_blank">Matt Warren</a></strong> </div>

But as I was researching and presenting this talk, it made me think about the *.NET Runtime* as a whole, [*what does it contain*]({{ base }}/2017/03/23/Hitchhikers-Guide-to-the-CoreCLR-Source-Code/#high-level-overview) and most importantly **what can you do with it**?

**Note:** this is mostly for *informational* purposes, for the *recommended way* of achieving the same thing, take a look at this excellent [Deep-dive into .NET Core primitives](https://natemcmaster.com/blog/2017/12/21/netcore-primitives/) by [Nate McMaster](https://twitter.com/natemcmaster).

----

In this post I will explore what you can do **using only the code in the [dotnet/coreclr](https://github.com/dotnet/coreclr) repository** and along the way we'll find out more about how the runtime interacts with the wider [.NET Ecosystem](https://dotnet.microsoft.com/).

To makes things clearer, there are **3 challenges** that will need to be solved before a simple "Hello World" application can be run. That's because in the [dotnet/coreclr](https://github.com/dotnet/coreclr) repository there is:

1. No **compiler**, that lives in [dotnet/Roslyn](https://github.com/dotnet/roslyn/)
2. No **Framework Class Library (FCL)** a.k.a. '[dotnet/CoreFX](https://github.com/dotnet/corefx)'
3. No `dotnet run` as it's implemented in the [dotnet/CLI](https://github.com/dotnet/cli/tree/release/2.2.2xx/src/dotnet/commands/dotnet-run) repository

----

## Building the CoreCLR

But before we even work through these 'challenges', we need to build the CoreCLR itself. Helpfully there is really nice guide available in ['Building the Repository'](https://github.com/dotnet/coreclr#building-the-repository):

> The build depends on Git, CMake, Python and of course a C++ compiler.  Once these prerequisites are installed
the build is simply a matter of invoking the 'build' script (`build.cmd` or `build.sh`) at the base of the repository.  
>
> The details of installing the components differ depending on the operating system.  See the following pages based on your OS.  There is no cross-building across OS (only for ARM, which is built on X64). You have to be on the particular platform to build that platform.  
>
> * [Windows Build Instructions](https://github.com/dotnet/coreclr/blob/master/Documentation/building/windows-instructions.md)
> * [Linux Build Instructions](https://github.com/dotnet/coreclr/blob/master/Documentation/building/linux-instructions.md)
> * [macOS Build Instructions](https://github.com/dotnet/coreclr/blob/master/Documentation/building/osx-instructions.md)
> * [FreeBSD Build Instructions](https://github.com/dotnet/coreclr/blob/master/Documentation/building/freebsd-instructions.md) 
> * [NetBSD Build Instructions](https://github.com/dotnet/coreclr/blob/master/Documentation/building/netbsd-instructions.md)

If you follow these steps successfully, you'll end up with the following files (at least on Windows, other OSes may produce something slightly different):

![CoreCLR Build Artifacts]({{ base }}/images/2018/12/CoreCLR Build Artifacts.png)

----

## No Compiler

First up, how do we get around the fact that we don't have a compiler? After all we need some way of turing our simple "Hello World" code into a .exe?

``` csharp
namespace Hello_World
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("Hello World!");
        }
    }
}
```

Fortunately we do have access to the [ILASM tool (IL Assembler)](https://github.com/dotnet/coreclr/tree/master/src/ilasm), which can turn [Common Intermediate Language (CIL)](https://en.wikipedia.org/wiki/Common_Intermediate_Language) into an .exe file. But how do we get the correct IL code? Well, one way is to write it from scratch, maybe after reading [Inside NET IL Assembler](https://amzn.to/2QPpiTY) and [Expert .NET 2.0 IL Assembler](https://amzn.to/2Ca34UI) by Serge Lidin (yes, amazingly, 2 books have been written about IL!)

Another, much easier way, is to use the amazing [SharpLab.io site](https://sharplab.io/) to do it for us! If you paste the C# code from above into it, you'll [get the following IL code](https://sharplab.io/#v2:EYLgtghgzgLgpgJwDQxASwDYB8ACAGAAhwEYBuAWACgqA7CMOKABwgGM4CAJODDAewD6AdT4IMAEyoBvKgTlEATEWIB2WfJmV525QDYiAFgIBZCGhoAKEngDaAXQIQEAcygBKdToKavXkgE4LACJuXj4CETFxAEIgtwotXwBfTwIUyiSgA==):

```
.class private auto ansi '<Module>'
{
} // end of class <Module>

.class private auto ansi beforefieldinit Hello_World.Program
    extends [mscorlib]System.Object
{
    // Methods
    .method private hidebysig static 
        void Main (
            string[] args
        ) cil managed 
    {
        // Method begins at RVA 0x2050
        // Code size 11 (0xb)
        .maxstack 8

        IL_0000: ldstr "Hello World!"
        IL_0005: call void [mscorlib]System.Console::WriteLine(string)
        IL_000a: ret
    } // end of method Program::Main

    .method public hidebysig specialname rtspecialname 
        instance void .ctor () cil managed 
    {
        // Method begins at RVA 0x205c
        // Code size 7 (0x7)
        .maxstack 8

        IL_0000: ldarg.0
        IL_0001: call instance void [mscorlib]System.Object::.ctor()
        IL_0006: ret
    } // end of method Program::.ctor

} // end of class Hello_World.Program
```

Then, if we save this to a file called 'HelloWorld.il' and run the cmd `ilasm HelloWorld.il /out=HelloWorld.exe`, we get the following output:

```
Microsoft (R) .NET Framework IL Assembler.  Version 4.5.30319.0
Copyright (c) Microsoft Corporation.  All rights reserved.
Assembling 'HelloWorld.il'  to EXE --> 'HelloWorld.exe'
Source file is ANSI

HelloWorld.il(38) : warning : Reference to undeclared extern assembly 'mscorlib'. Attempting autodetect
Assembled method Hello_World.Program::Main
Assembled method Hello_World.Program::.ctor
Creating PE file

Emitting classes:
Class 1:        Hello_World.Program

Emitting fields and methods:
Global
Class 1 Methods: 2;

Emitting events and properties:
Global
Class 1
Writing PE file
Operation completed successfully
```

**Nice, so part 1 is done, we now have our `HelloWorld.exe` file!**

## No Base Class Library

Well, not exactly, one problem is that `System.Console` lives in [dotnet/corefx](https://github.com/dotnet/corefx/tree/release/2.2/src/System.Console/src/System), in there you can see the different files that make up the implementation, such as `Console.cs`, `ConsolePal.Unix.cs`, `ConsolePal.Windows.cs`, etc.

Fortunately, the nice CoreCLR developers included a simple `Console` implementation in `System.Private.CoreLib.dll`, the [managed part of the CoreCLR](https://github.com/dotnet/coreclr/tree/master/src/System.Private.CoreLib), which was previously known as ['mscorlib'](https://github.com/dotnet/coreclr/tree/release/2.2/src/mscorlib) (before it [was renamed](https://github.com/dotnet/coreclr/pull/17926)). This internal version of `Console` is [pretty small and basic](https://github.com/dotnet/coreclr/blob/master/src/System.Private.CoreLib/src/Internal/Console.cs), but it provides enough for what we need.

To use this 'workaround' we need to edit our `HelloWorld.il` to look like this (note the change from `mscorlib` to `System.Private.CoreLib`)

```
.class public auto ansi beforefieldinit C
       extends [System.Private.CoreLib]System.Object
{
    .method public hidebysig static void M () cil managed 
    {
        .entrypoint
        // Code size 11 (0xb)
        .maxstack 8

        IL_0000: ldstr "Hello World!"
        IL_0005: call void [System.Private.CoreLib]Internal.Console::WriteLine(string)
        IL_000a: ret
    } // end of method C::M
    ...
}
```

**Note:** You can achieve the same thing with C# code instead of raw IL, by invoking the C# compiler with the following cmd-line:

```
csc -optimize+ -nostdlib -reference:System.Private.Corelib.dll -out:HelloWorld.exe HelloWorld.cs
```

**So we've completed part 2, we are able to at least print "Hello World" to the screen without using the CoreFX repository!**

----

Now this is a nice little trick, but I wouldn't ever recommend writing real code like this. Compiling against `System.Private.CoreLib` isn't the right way of doing things. What the compiler normally does is compile against the publicly exposed surface area that lives in [dotnet/corefx](https://github.com/dotnet/corefx), but then at run-time a process called ['Type-Forwarding'](https://docs.microsoft.com/en-us/dotnet/framework/app-domains/type-forwarding-in-the-common-language-runtime) is used to make that 'reference' implementation in CoreFX map to the 'real' implementation in the CoreCLR. For more on this entire process see [The Rough History of Referenced Assemblies](https://blog.lextudio.com/the-rough-history-of-referenced-assemblies-7d752d92c18c).

However, only a [small amount of managed code]({{ base }}/2017/03/23/Hitchhikers-Guide-to-the-CoreCLR-Source-Code/#high-level-overview) (i.e. C#) actually exists in the CoreCLR, to show this, the directory tree for [/dotnet/coreclr/src/System.Private.CoreLib](https://github.com/dotnet/coreclr/tree/master/src/System.Private.CoreLib) is [available here](https://gist.github.com/mattwarren/6b36567b51e3adca6c1ca684e72b8f6f) and the tree with all ~1280 .cs files included is [here](https://gist.github.com/mattwarren/abc4e194b71e78eb9fa5a550a379a0a1).

As a concrete example, if you look in CoreFX, you'll see that the [System.Reflection implementation](https://github.com/dotnet/corefx/tree/master/src/System.Reflection/src) is pretty empty! That's because it's a 'partial facade' that is eventually ['type-forwarded' to System.Private.CoreLib](https://github.com/dotnet/corefx/blob/release/2.2/src/System.Reflection.Emit/src/System.Reflection.Emit.csproj#L19).

If you're interested, the entire API that is exposed in CoreFX (but actually lives in CoreCLR) is [contained in System.Runtime.cs](https://github.com/dotnet/corefx/blob/master/src/System.Runtime/ref/System.Runtime.cs). But back to our example, here is the code that describes all the [`GetMethod(..)` functions](https://github.com/dotnet/corefx/blob/master/src/System.Runtime/ref/System.Runtime.cs#L3035-L3048) in the 'System.Reflection' API.

To learn more about 'type forwarding', I recommend watching ['.NET Standard - Under the Hood'](https://www.youtube.com/watch?v=vg6nR7hS2lI) ([slides](https://www.slideshare.net/terrajobst/net-standard-under-the-hood)) by [Immo Landwerth](https://twitter.com/terrajobst) and there is also some more in-depth information in ['Evolution of design time assemblies'](https://github.com/dotnet/standard/blob/master/docs/history/evolution-of-design-time-assemblies.md).

**But why is this code split useful**, from the [CoreFX README](https://github.com/dotnet/corefx#net-core-libraries-corefx):

> **Runtime-specific library code** ([mscorlib](https://github.com/dotnet/coreclr/tree/master/src/System.Private.CoreLib)) lives in the CoreCLR repo. It needs to be built and versioned in tandem with the runtime. The rest of CoreFX is **agnostic of runtime-implementation and can be run on any compatible .NET runtime** (e.g. [CoreRT](https://github.com/dotnet/corert)).

And from the other point-of-view, in the [CoreCLR README](https://github.com/dotnet/coreclr#relationship-with-the-corefx-repository):

> By itself, the `Microsoft.NETCore.Runtime.CoreCLR` package is actually not enough to do much. One reason for this is that the CoreCLR package tries to minimize the amount of the class library that it implements. **Only types that have a strong dependency on the internal workings of the runtime are included** (e.g, `System.Object`, `System.String`, `System.Threading.Thread`, `System.Threading.Tasks.Task` and most foundational interfaces).
> 
> Instead most of the class library is implemented as independent NuGet packages that simply use the .NET Core runtime as a dependency. Many of the most familiar classes (`System.Collections`, `System.IO`, `System.Xml` and so on), live in packages defined in the [dotnet/corefx](https://github.com/dotnet/corefx) repository.

One **huge benefit** of this approach is that [Mono](https://www.mono-project.com/) can share [large amounts of the CoreFX code](https://mobile.twitter.com/matthewwarren/status/987292012520067072), as shown in this tweet:

<blockquote class="twitter-tweet"><p lang="en" dir="ltr">How Mono reuses .NET Core sources for BCL (doesn&#39;t include runtime, tools, etc) according to my calculations 🙂 <a href="https://t.co/8JCDxqwnNi">pic.twitter.com/8JCDxqwnNi</a></p>&mdash; Egor Bogatov (@EgorBo) <a href="https://twitter.com/EgorBo/status/978737460061458432?ref_src=twsrc%5Etfw">March 27, 2018</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

----

## No Launcher

So far we've 'compiled' our code (well technically 'assembled' it) and we've been able to access a simple version of `System.Console`, but how do we actually run our `.exe`? Remember we can't use the `dotnet run` command because that lives in the [dotnet/CLI](https://github.com/dotnet/cli/tree/release/2.2.2xx/src/dotnet/commands/dotnet-run) repository (and that would be breaking the rules of this *slightly contrived* challenge!!).

Again, fortunately those clever runtime engineers have thought of this exact scenario and they built the very helpful `corerun` application. You can read more about in [Using corerun To Run .NET Core Application](https://github.com/dotnet/coreclr/blob/master/Documentation/workflow/UsingCoreRun.md), but the td;dr is that it will only look for dependencies in the same folder as your .exe.

So, to complete the challenge, we can now run `CoreRun HelloWorld.exe`:

```
# CoreRun HelloWorld.exe
Hello World!
```

**Yay, the least impressive demo you'll see this year!!**

For more information on how you can 'host' the CLR in your application I recommend this excellent tutorial [Write a custom .NET Core host to control the .NET runtime from your native code](https://docs.microsoft.com/en-us/dotnet/core/tutorials/netcore-hosting). In addition, the docs page on ['Runtime Hosts'](https://docs.microsoft.com/en-us/previous-versions/dotnet/netframework-4.0/a51xd4ze(v=vs.100)) gives a nice overview of the different hosts that are available:

> The .NET Framework ships with a number of different runtime hosts, including the hosts listed in the following table.
> 
> |Runtime Host|Description|
> |--- |--- |
> |ASP.NET|Loads the runtime into the process that is to handle the Web request. ASP.NET also creates an application domain for each Web application that will run on a Web server.|
> |Microsoft Internet Explorer|Creates application domains in which to run managed controls. The .NET Framework supports the download and execution of browser-based controls. The runtime interfaces with the extensibility mechanism of Microsoft Internet Explorer through a mime filter to create application domains in which to run the managed controls. By default, one application domain is created for each Web site.|
> |Shell executables|Invokes runtime hosting code to transfer control to the runtime each time an executable is launched from the shell.|

