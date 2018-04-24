---
layout: post
title: How generics were added to .NET
comments: false
codeproject: false
excerpt: <p>Before we dive into the technical details, let’s start with a quick history lesson, courtesy of <a href="https://www.microsoft.com/en-us/research/people/dsyme/">Don Syme</a> who worked on adding generics to .NET and then went on to <a href="http://fsharp.org">design and implement F#</a>, which is a pretty impressive set of achievements!!</p>
---

Discuss this post on [HackerNews](https://news.ycombinator.com/item?id=16525244) and [/r/programming](https://www.reddit.com/r/programming/comments/81ih8t/how_generics_were_added_to_net/)

----

Before we dive into the technical details, let's start with a quick history lesson, courtesy of [Don Syme](https://www.microsoft.com/en-us/research/people/dsyme/) who worked on adding generics to .NET and then went on to [design and implement F#](http://fsharp.org), which is a pretty impressive set of achievements!!

## Background and History

- **1999** Initial research, design and planning
  - [.NET/C# Generics History: Some Photos From Feb 1999](https://blogs.msdn.microsoft.com/dsyme/2011/03/15/netc-generics-history-some-photos-from-feb-1999/) 
- **1999** First 'white paper' published
  - [More C#/.NET Generics Research Project History – The MSR white paper](https://blogs.msdn.microsoft.com/dsyme/2012/07/05/more-c-net-generics-research-project-history-the-msr-white-paper-from-mid-1999/)
  - [MSR White Paper: Proposed Extensions to COM+ VOS (Draft)](https://msdnshared.blob.core.windows.net/media/MSDNBlogsFS/prod.evol.blogs.msdn.com/CommunityServer.Components.PostAttachments/00/10/32/72/38/Ext-VOS.pdf) (**pdf**)
- **2001** C# Language Design Specification created
  - [Some History: 2001 "GC#" (Generic C#) research project draft](https://blogs.msdn.microsoft.com/dsyme/2012/06/19/some-history-2001-gc-research-project-draft-from-the-msr-cambridge-team/)
  - [MSR - .NET Generics Research Project - Generic C# Specification](https://msdnshared.blob.core.windows.net/media/MSDNBlogsFS/prod.evol.blogs.msdn.com/CommunityServer.Components.PostAttachments/00/10/32/17/02/GCSharp-new-v16-12-Dec-2001-redist.pdf) (**pdf**)
- **2001** Research paper published
  - [Design and Implementation of Generics for the .NET CLR](https://www.microsoft.com/en-us/research/publication/design-and-implementation-of-generics-for-the-net-common-language-runtime/) (**pdf**)
- **2004** Work completed and all bugs fixed
  - [Some more .NET/C# Generics Research Project History](https://blogs.msdn.microsoft.com/dsyme/2012/06/26/some-more-netc-generics-research-project-history/)

**Update:** Don Syme, [pointed out](https://twitter.com/dsyme/status/969928172597858305) another research paper related to .NET generics, [Combining Generics, Precompilation and Sharing Between Software Based Processes](https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/space2004generics.pdf) (**pdf**)

To give you an idea of how these events fit into the bigger picture, here are the dates of [.NET Framework Releases](https://en.wikipedia.org/wiki/.NET_Framework), up-to 2.0 which was the first version to have generics:

| Version number | CLR version | Release date |
|:--------------:|:-----------:|:------------:|
| 1.0 | 1.0 | 2002-02-13 |
| 1.1 |	1.1 |	2003-04-24 |
| **2.0** | **2.0** | **2005-11-07** |

Aside from the historical perspective, what I find most fascinating is just how much the addition of generics in .NET was due to the work done by Microsoft Research, from [.NET/C# Generics History](https://blogs.msdn.microsoft.com/dsyme/2011/03/15/netc-generics-history-some-photos-from-feb-1999/):

> It was only through the total dedication of Microsoft Research, Cambridge during 1998-2004, to doing **a complete, high quality implementation in both the CLR (including NGEN, debugging, JIT, AppDomains, concurrent loading and many other aspects), and the C# compiler**, that the project proceeded. 

He then goes on to say:

> What would the cost of inaction have been? What would the cost of failure have been? **No generics in C# 2.0? No LINQ in C# 3.0? No TPL in C# 4.0? No Async in C# 5.0? No F#?** Ultimately, an erasure model of generics would have been adopted, as for Java, since the CLR team would never have pursued a in-the-VM generics design without external help.

Wow, C# and .NET would look **very** different without all these features!!

### The 'Gyro' Project - Generics for Rotor

Unfortunately there doesn't exist a publicly accessible version of the .NET 1.0 and 2.0 source code, so we can't go back and look at the changes that were made (if I'm wrong, please let me know as I'd love to read it).

However, we do have the next best thing, the ['Gyro' project](https://www.microsoft.com/en-us/download/details.aspx?id=52517) in which the equivalent changes were made to the ['Shared Source Common Language Implementation'](https://en.wikipedia.org/wiki/Shared_Source_Common_Language_Infrastructure) (SSCLI) code base (a.k.a 'Rotor'). As an aside, if you want to learn more about the Rotor code base I really recommend the excellent book by Ted Neward, which you can [download from his blog](http://blogs.tedneward.com/post/revisiting-rotor/).

Gyro 1.0 was [released in 2003](http://www.servergeek.com/blogs/mickey/archive/2003_04_27_blog_arc.htm) which implies that is was created *after* the work has been done in the *real* .NET Framework source code, I assume that Microsoft Research wanted to publish the 'Rotor' implementation so it could be studied more widely. Gyro is also referenced in one Don Syme's posts, from [Some History: 2001 "GC#" research project draft, from the MSR Cambridge team](https://blogs.msdn.microsoft.com/dsyme/2012/06/19/some-history-2001-gc-research-project-draft-from-the-msr-cambridge-team/):

> With Dave Berry's help we later published a version of the corresponding code as the "Gyro" variant of the "Rotor" CLI implementation.

**The rest of this post will look at *how* generics were implemented in the Rotor source code.**

**Note**: There are some significant differences between the Rotor source code and the real .NET framework. Most notably the [JIT](https://blogs.msdn.microsoft.com/joelpob/2004/01/21/short-notes-on-the-rotor-jit/) and [GC](https://blogs.msdn.microsoft.com/joelpob/2004/02/26/explanatory-notes-on-rotors-garbage-collector/) are completely different implementations (due to licensing issues, listen to [DotNetRocks show 360 - Ted Neward and Joel Pobar on Rotor 2.0](https://www.dotnetrocks.com/?show=360) for more info). However, the Rotor source does give us an accurate idea about how other *core parts* of the CLR are implemented, such as the Type-System, Debugger, AppDomains and the VM itself. It's interesting to compare the [Rotor source](https://github.com/SSCLI/sscli20_20060311) with the current [CoreCLR source]({{ base }}/2017/03/23/Hitchhikers-Guide-to-the-CoreCLR-Source-Code/) and see how much of the source code layout and class names have remained the same.

----

## Implementation

To make things easier for anyone who wants to follow-along, I created a [GitHub repo](https://github.com/mattwarren/GenericsInDotNet) that contains the [Rotor code for .NET 1.0](https://github.com/SSCLI/sscli_20021101) and then checked in the [Gyro source code](https://www.microsoft.com/en-us/download/details.aspx?id=52517) on top, which means that you can [see all the changes in one place](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007?w=1):

![Gyro changes to implement generics]({{ base }}/images/2018/03/Gyro changes to implement generics.png)

The first thing you notice in the Gyro source is that all the files contain this particular piece of legalese:

``` diff
 ;    By using this software in any fashion, you are agreeing to be bound by the
 ;    terms of this license.
 ;   
+;    This file contains modifications of the base SSCLI software to support generic
+;    type definitions and generic methods. These modifications are for research
+;    purposes. They do not commit Microsoft to the future support of these or
+;    any similar changes to the SSCLI or the .NET product. -- 31st October, 2002.
+;   
 ;    You must not remove this notice, or any other, from this software.
 ```

 It's funny that they needed to add the line '*They do not commit Microsoft to the future support of these or any similar changes to the SSCLI or the .NET product*', even though they were just a few months away from doing just that!!

### Components (Directories) with the most changes

To see where the work was done, lets start with a high-level view, showing the directories with a **significant amount of changes** (> 1% of the total changes):

```
$ git diff --dirstat=lines,1 464bf98 2714cca
   0.1% bcl/
  14.4% csharp/csharp/sccomp/
   9.1% debug/di/
  11.9% debug/ee/
   2.1% debug/inc/
   1.9% debug/shell/
   2.5% fjit/
  21.1% ilasm/
   1.5% ildasm/
   1.2% inc/
   1.4% md/compiler/
  29.9% vm/
```

**Note**: `fjit` is the "Fast JIT" compiler, i.e the version released with Rotor, which was significantly different to one available in the full .NET framework.

The full output from `git diff --dirstat=lines,0` is available [here]({{ base }}/data/2018/03/dirstat output.txt) and the output from `git diff --stat` is [here]({{ base }}/data/2018/03/diff stat output.txt).

`0.1% bcl/` is included only to show that very little **C# code** changes were needed, these were *mostly* plumbing code to expose the underlying C++ methods and changes to the various `ToString()` methods to include [generic type information](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007?w=1#diff-4eff16b228185c6e80fd6325d6994ff9), e.g. '`Class[int,double]`'. However there are 2 more significant ones:

- `bcl/system/reflection/emit/opcodes.cs` ([diff](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007?w=1#diff-cd44d74d6f3263cab42469a039ca2601))
  - Add the additional IL opcode needed to make generics work (this just mirrors the [main change made in core of the runtime](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007?w=1#diff-91e0675d515fc426f84d4e6465ad7f2d), so that the opcodes available in C# are consistent)
- `bcl/system/reflection/emit/signaturehelper.cs` ([diff](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007?w=1#diff-e6629d61becf92412984036207cb92f8))
  - Add the ability to parse method *metadata* that contains generic related information, such as methods with generic parameters.

### Files with the most changes

Next, we'll take a look at the specific classes/files that had the most changes as this gives us a really good idea about where the complexity was

{::nomarkdown}
<span class="compactTable">
{:/}

| Added | Deleted | Total Changes | File (click to go directly to the diff)  |
|:-----:|:-------:|:------:|----------------------------------|
| 1794  | 323     | 1471   | [debug/di/module.cpp](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007?w=1#diff-22234c906bfe132ec494932cf06e3fb1) |
| 1418  | 337     | 1081   | [vm/class.cpp](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007?w=1#diff-0e0d8fff6a020ec70ca77b2cb8b99647) |
| 1335  | 308     | 1027   | [vm/jitinterface.cpp](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007?w=1#diff-fea4cf9500609e43a8069a1dcfa43b71) |
| 1616  | 888     | 728    | [debug/ee/debugger.cpp](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007?w=1#diff-13c4c633f56c04ff5faf6dce22560847) |
| 741   | 46      | 695    | [csharp/csharp/sccomp/symmgr.cpp](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007?w=1#diff-aa4f38f96ad3a77d5b09b8a991aa6cb8) |
| 693   | 0       | 693    | [vm/genmeth.cpp](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007?w=1#diff-552abe52e5c106c6362a1a1caea0f132) |
| 999   | 362     | 637    | [csharp/csharp/sccomp/clsdrec.cpp](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007?w=1#diff-0952232ff4ff9b6e7dd3d0810c526384) |
| 926   | 321     | 605    | [csharp/csharp/sccomp/fncbind.cpp](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007?w=1#diff-3a12049d560ad4f93e5ce65a316fd978) |
| 559   | 0       | 559    | [vm/typeparse.cpp](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007?w=1#diff-2112a77378a346f28c6a0a3a321e8f87) |
| 605   | 156     | 449    | [vm/siginfo.cpp](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007?w=1#diff-0a485aaa61cb18a87e48fa33a3857dc6) |
| 417   | 29      | 388    | [vm/method.hpp](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007?w=1#diff-7934c88bd9924d3c8cbff690063da3d7) |
| 642   | 255     | 387    | [fjit/fjit.cpp](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007?w=1#diff-9f6e7a75bd6b1a7a0cdd5e8035890206) |
| 379   | 0       | 379    | [vm/jitinterfacegen.cpp](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007?w=1#diff-f74e814e74cc0b7f310d8899dd9572c6) |
| 3045  | 2672    | 373    | [ilasm/parseasm.cpp](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007?w=1#diff-f7f421904f275fdc51213ac75de92119) |
| 465   | 94      | 371    | [vm/class.h](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007?w=1#diff-003b498fe92dffc37d31bb4e94fc82d4) |
| 515   | 163     | 352    | [debug/inc/cordb.h](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007?w=1#diff-7ceae3bfad44ef6e15c1211be9f537a5) |
| 339   | 0       | 339    | [vm/generics.cpp](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007?w=1#diff-2a678baf192f81a25eab4bd85ef5bae6) |
| 733   | 418     | 315    | [csharp/csharp/sccomp/parser.cpp](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007?w=1#diff-a096d9aee517403abfd5c9171ee7ee9c) |
| 471   | 169     | 302    | [debug/shell/dshell.cpp](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007?w=1#diff-3abe6da78df285aff42ab5932f2dda93) |
| 382   | 88      | 294    | [csharp/csharp/sccomp/import.cpp](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007?w=1#diff-6ff795bd0261cd4bd627968951cef1f3) |

{::nomarkdown}
</span>
{:/}

## Components of the Runtime

Now we'll look at individual components in more detail so we can get an idea of how different parts of the runtime had to change to accommodate generics.

### Type System changes

Not surprisingly the bulk of the changes are in the Virtual Machine (VM) component of the CLR and related to the 'Type System'. Obviously adding 'parameterised types' to a type system that didn't already have them requires wide-ranging and significant changes, which are shown in the list below:

- `vm/class.cpp` ([diff](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007#diff-0e0d8fff6a020ec70ca77b2cb8b99647)
)
  - Allow the type system to distinguish between [open and closed generic types](https://stackoverflow.com/questions/2173107/what-exactly-is-an-open-generic-type-in-net) and provide APIs to allow working them, such as `IsGenericVariable()` and `GetGenericTypeDefinition()`
- `vm/genmeth.cpp` ([diff](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007#diff-552abe52e5c106c6362a1a1caea0f132))
  - Contains the bulk of the functionality to make 'generic methods' possible, i.e. `MyMethod<T, U>(T item, U filter)`, including to work done to enable ['shared instantiation'](#shared-instantiations) of generic methods
- `vm/typeparse.cpp` ([diff](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007#diff-2112a77378a346f28c6a0a3a321e8f87))
  - Changes needed to allow generic types to be looked-up by name, i.e. '`MyClass[System.Int32]`'
- `vm/siginfo.cpp` ([diff](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007#diff-0a485aaa61cb18a87e48fa33a3857dc6))
  - Adds the ability to work with 'generic-related' method signatures
- `vm/method.hpp` ([diff](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007#diff-7934c88bd9924d3c8cbff690063da3d7)) and `vm/method.cpp` ([diff](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007#diff-c615bd9fa80c05ada3fa2c6aeb3f8f4c))
  - Provides the runtime with generic related methods such as `IsGenericMethodDefinition()`, `GetNumGenericMethodArgs()` and `GetNumGenericClassArgs()`
- `vm/generics.cpp` ([diff](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007#diff-2a678baf192f81a25eab4bd85ef5bae6))
  - All the completely new 'generics' specific code is in here, mostly related to ['shared instantiation'](#shared-instantiations) which is explained below

### Bytecode or 'Intermediate Language' (IL) changes

The main place that the implementation of generics in the CLR differs from the JVM is that they are ['fully reified' instead of using 'type erasure'](http://www.jprl.com/Blog/archive/development/2007/Aug-31.html), this was possible because the CLR designers were willing to break backwards compatibility, whereas the JVM had been around longer so I assume that this was a much less appealing option. For more discussion on this issue see [Erasure vs reification](http://beust.com/weblog/2011/07/29/erasure-vs-reification/) and [Reified Generics for Java](http://gafter.blogspot.co.uk/2006/11/reified-generics-for-java.html). **Update**: this [HackerNews discussion](https://news.ycombinator.com/item?id=14584359) is also worth a read.

The specific changes made to the .NET Intermediate Language (IL) op-codes can be seen in the `inc/opcode.def` ([diff](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007?w=1#diff-91e0675d515fc426f84d4e6465ad7f2d)), in essence the following 3 instructions were added

- [ldelem](https://msdn.microsoft.com/en-us/library/system.reflection.emit.opcodes.ldelem)
- [stelem](https://msdn.microsoft.com/en-us/library/system.reflection.emit.opcodes.stelem)
- [unbox.any](https://msdn.microsoft.com/en-us/library/system.reflection.emit.opcodes.unbox_any)

In addition the `IL Assembler` tool (ILASM) needed [significant changes](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007#diff-f7f421904f275fdc51213ac75de92119) as well as it's counter part `IL Disassembler (ILDASM) so it could [handle the additional instructions](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007#diff-87680592860bf2d2e2a595434efa0016).

There is also a whole section titled 'Support for Polymorphism in IL' that explains these changes in greater detail in [Design and Implementation of Generics for the .NET Common Language Runtime](https://www.microsoft.com/en-us/research/wp-content/uploads/2001/01/designandimplementationofgenerics.pdf)

### Shared Instantiations

From [Design and Implementation of Generics for the .NET Common Language Runtime](https://www.microsoft.com/en-us/research/wp-content/uploads/2001/01/designandimplementationofgenerics.pdf)

> Two instantiations are compatible if for any parameterized class its
compilation at these instantiations gives rise to identical code and
other execution structures (e.g. field layout and GC tables), apart
from the dictionaries described below in Section 4.4. In particular,
**all reference types are compatible with each other**, because the
loader and JIT compiler make no distinction for the purposes of
field layout or code generation. On the implementation for the Intel
x86, at least, **primitive types are mutually incompatible**, even
if they have the same size (floats and ints have different parameter
passing conventions). That leaves **user-defined struct types, which
are compatible if their layout is the same** with respect to garbage
collection i.e. they share the same pattern of traced pointers

- `ClassLoader::NewInstantiation(..)` [source code](https://github.com/mattwarren/GenericsInDotNet/blob/master/vm/generics.cpp#L15-L202)
- `TypeHandle::GetCanonicalFormAsGenericArgument()` [source code](https://github.com/mattwarren/GenericsInDotNet/blob/2714ccac6f18f0f6ff885567b90484013b31e007/vm/class.cpp#L428-L490)

From a [comment with more info](https://github.com/mattwarren/GenericsInDotNet/blob/2714ccac6f18f0f6ff885567b90484013b31e007/vm/typehandle.h#L227-L237):

```
// For an generic type instance return the representative within the class of
// all type handles that share code.  For example, 
//    <int> --> <int>,
//    <object> --> <object>,
//    <string> --> <object>,
//    <List<string>> --> <object>,
//    <Struct<string>> --> <Struct<object>>
//
// If the code for the type handle is not shared then return 
// the type handle itself.
```

In addition, [this comment](https://github.com/mattwarren/GenericsInDotNet/blob/2714ccac6f18f0f6ff885567b90484013b31e007/vm/genmeth.cpp#L34-L83) explains the work that needs to take place to allow shared instantiations when working with *generic methods*.

**Update**: If you want more info on the 'code-sharing' that takes places, I recommend reading these 2 posts:

- [CLR Generics and code sharing](https://blogs.msdn.microsoft.com/joelpob/2004/11/17/clr-generics-and-code-sharing/)
- [DG Update: Generics and Performance](https://web.archive.org/web/20100723221307/http://www.bluebytesoftware.com/blog/2005/03/23/DGUpdateGenericsAndPerformance.aspx)
- [On generics and (some of) the associated overheads](http://joeduffyblog.com/2011/10/23/on-generics-and-some-of-the-associated-overheads/)
- [Sharing .NET generic code under the hood](http://yizhang82.me/dotnet-generics-sharing)

### Compiler and JIT Changes

If seems like almost every part of the compiler had to change to accommodate generics, which is not surprising given that they touch so many parts of the code we write, `Types`, `Classes` and `Methods`. Some of the biggest changes were:

- `csharp/csharp/sccomp/clsdrec.cpp` - **+999 -363** - ([diff](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007#diff-0952232ff4ff9b6e7dd3d0810c526384))
- `csharp/csharp/sccomp/emitter.cpp` - **+347 -127** - ([diff](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007#diff-58397e0e022ba5c8e98f1ea59eadefee))
- `csharp/csharp/sccomp/fncbind.cpp` - **+926 -321** - ([diff](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007#diff-3a12049d560ad4f93e5ce65a316fd978))
- `csharp/csharp/sccomp/import.cpp` - **+382 - 88** - ([diff](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007#diff-6ff795bd0261cd4bd627968951cef1f3))
- `csharp/csharp/sccomp/parser.cpp` - **+733 -418** - ([diff](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007#diff-a096d9aee517403abfd5c9171ee7ee9c))
- `csharp/csharp/sccomp/symmgr.cpp` - **+741 -46** - ([diff](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007#diff-aa4f38f96ad3a77d5b09b8a991aa6cb8))

In the '*just-in-time*' (JIT) compiler extra work was needed because it's responsible for implementing the additional ['IL Instructions'](#bytecode-or-intermediate-language-il-changes). The bulk of these changes took place in  `fjit.cpp` ([diff](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007#diff-9f6e7a75bd6b1a7a0cdd5e8035890206)) and `fjitdef.h` ([diff](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007#diff-ddf200851d7fc0eb14bf1f64403cfae7)).

Finally, a large amount of work was done in `vm/jitinterface.cpp` ([diff](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007#diff-fea4cf9500609e43a8069a1dcfa43b71)) to enable the JIT to access the extra information it needed to emit code for generic methods.

### Debugger Changes

Last, but by no means least, a significant amount of work was done to ensure that the debugger could understand and inspect generics types. It goes to show just how much *inside information* a debugger needs to have of the type system in an managed language.

- `debug/ee/debugger.cpp` ([diff](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007#diff-13c4c633f56c04ff5faf6dce22560847))
- `debug/ee/debugger.h` ([diff](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007#diff-f89efe7b1a060b67715d76a176830017))
- `debug/di/module.cpp` ([diff](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007#diff-22234c906bfe132ec494932cf06e3fb1))
- `debug/di/rsthread.cpp` ([diff](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007#diff-a0ed41f780929de1f626f8e7b4354dcb))
- `debug/shell/dshell.cpp` ([diff](https://github.com/mattwarren/GenericsInDotNet/commit/2714ccac6f18f0f6ff885567b90484013b31e007#diff-3abe6da78df285aff42ab5932f2dda93))

----

# Further Reading

If you want even more information about generics in .NET, there are also some very useful design docs available (included in the [Gyro source code download](https://www.microsoft.com/en-us/download/details.aspx?id=52517)):

- [Generics in C#]({{ base }}/data/2018/03/csharp.html)
- [Generics in the Common Type System]({{ base }}/data/2018/03/clrgen-types.html)
- [IL extensions for generics]({{ base }}/data/2018/03/clrgen-il.html)
