---
layout: post
title: A Hitchhikers Guide to the CoreCLR Source Code
comments: true
tags: [.NET, CLR, Open Source]
datavis: true
codeproject: false
excerpt: <p>Just over 2 years ago Microsoft open-sourced the entire .NET framework, this posts attempts to provide a ‘Hitchhikers Guide’ to the source-code found in the CoreCLR GitHub repository.</p>
---

{% raw %}
<link rel='stylesheet' href='/datavis/treemap-coreclr.css'>
<script src="https://d3js.org/d3.v4.min.js"></script>
<script src='/datavis/treemap-coreclr.js' type='text/javascript'></script>
{% endraw %}

[![Towel Day - Dont Panic - Douglas Adams - The Hitchhikers Guide to the Galaxy]({{ base }}/images/2017/03/Towel Day - Dont Panic - Douglas Adams - The Hitchhikers Guide to the Galaxy.jpg)](https://www.flickr.com/photos/toddle_email_newsletters/18056890646)

**photo by [Alan O'Rourke](http://audiencestack.com/static/blog.html)**

Just over 2 years ago Microsoft open-sourced the entire .NET framework, this posts attempts to provide a 'Hitchhikers Guide' to the source-code found in the [CoreCLR GitHub repository](https://github.com/dotnet/coreclr).

To make it easier for you to get to the information you're interested in, this post is split into several parts

- [Overall Stats](#overall-stats)
- ['Top 10' lists](#top-10-lists)
- [High-level Overview](#high-level-overview)
- [Deep Dive into Individual Areas](#deep-dive-into-individual-areas)
  - [mscorlib (C# code)](#mscorlib)
  - [Virtual Machine (VM)](#vm-virtual-machine)
  - [Just-in-Time compiler (JIT)](#jit-just-in-time-compiler)  
  - [Platform Adaptation Layer (PAL)](#pal-platform-adaptation-layer)
  - [Garbage Collector (GC)](#gc-garbage-collector)    
  - [Debugger](#debug)
- [All the rest](#all-the-rest)

It's worth pointing out that .NET Developers have provided 2 excellent glossaries, the [CoreCLR one](https://github.com/dotnet/coreclr/blob/master/Documentation/project-docs/glossary.md) and the [CoreFX one](https://github.com/dotnet/corefx/blob/master/Documentation/project-docs/glossary.md), so if you come across any unfamiliar terms or abbreviations, check these first. Also there is extensive [documentation available](https://github.com/dotnet/coreclr/blob/master/Documentation/) and if you are interested in the low-level details I *really* recommend checking out the ['Book of the Runtime' (BotR)](https://github.com/dotnet/coreclr/tree/master/Documentation/botr).

----

## Overall Stats

If you take a look at the repository on GitHub, it shows the following stats for the entire repo

![CoreCLR GitHub repo info]({{ base }}/images/2017/03/CoreCLR GitHub repo info.png)

But most of the C# code is test code, so if we just look under [`/src`](https://github.com/dotnet/coreclr/tree/master/src) (i.e. ignore any code under [`/tests`](https://github.com/dotnet/coreclr/tree/master/tests)) there are the following mix of **Source** file types, i.e. no '.txt', '.dat', etc: 

```
  - 2,012 .cpp
  - 1,183 .h
  - 956 .cs
  - 113 .inl
  - 98 .hpp
  - 51 .S
  - 43 .py
  - 42 .asm
  - 24 .idl
  - 20 .c
```

So by far the majority of the code is written in C++, but there is still also a fair amount of C# code (all under ['mscorlib'](https://github.com/dotnet/coreclr/tree/master/src/mscorlib)). Clearly there are low-level parts of the CLR that have to be written in C++ or Assembly code because they need to be 'close to the metal' or have high performance, but it's interesting that there are large parts of the runtime written in managed code itself.  

**Note**: All stats/lists in the post were calculated using [commit 51a6b5c](https://github.com/dotnet/coreclr/commit/51a6b5ce75c853e77266b8e1ce8c264736d2aabe) from the 9th March 2017. 

### Compared to 'Rotor'

As a comparison here's what the stats for ['Rotor' the Shared Source CLI](https://en.wikipedia.org/wiki/Shared_Source_Common_Language_Infrastructure) (the OSS version of .NET before CoreCLR was released) looked like back in October 2002

[![Shared Source CLI Stats - Oct 2002]({{ base }}/images/2017/03/Shared Source CLI Stats - Oct 2002.jpg)]({{ base }}/images/2017/03/Shared Source CLI Stats - Oct 2002.jpg)

**Note:** SSCLI aka 'Rotor' includes the fx or base class libraries (BCL), but the CoreCLR doesn't as they are now hosted separately in the [CoreFX GitHub repository](https://github.com/dotnet/corefx)

For reference, the equivalent stats for the CoreCLR source in March 2017 look like this:

- Packaged as 61.2 MB .zip archive
  - Over 10.8 million lines of code (2.6 million of source code, under \src)
  - 24,485 Files (7,466 source)
    - 6,626 C# (956 source)
    - 2,074 C and C++
    - 3,701 IL
    - 93 Assembler
    - 43 Python
    - 6 Perl
 - Over 8.2 million lines of test code
 - Build output expands to over 1.2 G with tests 
   - Product binaries 342 MB
   - Test binaries 909 MB
  
----

## Top 10 lists

These lists are mostly just for fun, but they do give some insights into the code-base and how it's structured.

### Top 10 Largest Files

You might have heard about the mammoth source file that is [gc.cpp](https://github.com/dotnet/coreclr/blob/master/src/gc/gc.cpp), which is so large that GitHub refuses to display it.

But it turns out it's not the only large file in the source, there are also several files in the JIT that are around 20K LOC. However it seems that all the large files are C++ source code, so if you're only interested in C# code, you don't have to worry!!

{::nomarkdown}  
<span class="compactTable">
{:/}

| File | # Lines of Code | Type | Location |
|:-----|:----------------|:----:|:---------|
| [gc.cpp](https://github.com/dotnet/coreclr/blob/master/src/gc/gc.cpp) | 37,037 | .cpp | \src\gc\ |
| [flowgraph.cpp](https://github.com/dotnet/coreclr/blob/master/src/jit/flowgraph.cpp) | 24,875 | .cpp | \src\jit\ |
| [codegenlegacy.cpp](https://github.com/dotnet/coreclr/blob/master/src/jit/codegenlegacy.cpp) | 21,727 | .cpp | \src\jit\ |
| [importer.cpp](https://github.com/dotnet/coreclr/blob/master/src/jit/importer.cpp) | 18,680 | .cpp | \src\jit\ |
| [morph.cpp](https://github.com/dotnet/coreclr/blob/master/src/jit/morph.cpp) | 18,381 | .cpp | \src\jit\ |
| [isolationpriv.h](https://github.com/dotnet/coreclr/blob/master/src/inc/isolationpriv.h) | 18,263 | .h | \src\inc\ |
| [cordebug.h](https://github.com/dotnet/coreclr/blob/master/src/pal/prebuilt/inc/cordebug.h) | 18,111 | .h | \src\pal\prebuilt\inc\ |
| [gentree.cpp](https://github.com/dotnet/coreclr/blob/master/src/jit/gentree.cpp) | 17,177 | .cpp | \src\jit\ |
| [debugger.cpp](https://github.com/dotnet/coreclr/blob/master/src/debug/ee/debugger.cpp) | 16,975 | .cpp | \src\debug\ee\ |

{::nomarkdown}  
</span>
{:/}

### Top 10 Longest Methods

The large methods aren't actually that hard to find, because they're all have `#pragma warning(disable:21000)` before them, to keep the compiler happy! There are ~40 large methods in total, here's the 'Top 10'

{::nomarkdown}  
<span class="compactTable">
{:/}

| Method | # Lines of Code |
|:-------|----------------:|
| [MarshalInfo::MarshalInfo(Module* pModule,](https://github.com/dotnet/coreclr/blob/51a6b5ce75c853e77266b8e1ce8c264736d2aabe/src/vm/mlinfo.cpp#L1501-L3008) | 1,507 |
| [void gc_heap::plan_phase (int condemned_gen_number)](https://github.com/dotnet/coreclr/blob/51a6b5ce75c853e77266b8e1ce8c264736d2aabe/src/gc/gc.cpp#L21419-L22924) | 1,505 |
| [void CordbProcess::DispatchRCEvent()](https://github.com/dotnet/coreclr/blob/51a6b5ce75c853e77266b8e1ce8c264736d2aabe/src/debug/di/process.cpp#L4533-L5884) | 1,351 |
| [void DbgTransportSession::TransportWorker()](https://github.com/dotnet/coreclr/blob/51a6b5ce75c853e77266b8e1ce8c264736d2aabe/src/debug/shared/dbgtransportsession.cpp#L1264-L2502) | 1,238 |
| [LPCSTR Exception::GetHRSymbolicName(HRESULT hr)](https://github.com/dotnet/coreclr/blob/51a6b5ce75c853e77266b8e1ce8c264736d2aabe/src/utilcode/ex.cpp#L211-L1427) | 1,216 |
| [BOOL Disassemble(IMDInternalImport *pImport, BYTE *ILHeader,...](https://github.com/dotnet/coreclr/blob/51a6b5ce75c853e77266b8e1ce8c264736d2aabe/src/ildasm/dis.cpp#L872-L1953) | 1,081 |
| [bool Debugger::HandleIPCEvent(DebuggerIPCEvent * pEvent)](https://github.com/dotnet/coreclr/blob/51a6b5ce75c853e77266b8e1ce8c264736d2aabe/src/debug/ee/debugger.cpp#L10555-L11605) | 1,050 |
| [void LazyMachState::unwindLazyState(LazyMachState* baseState...](https://github.com/dotnet/coreclr/blob/51a6b5ce75c853e77266b8e1ce8c264736d2aabe/src/vm/i386/gmsx86.cpp#L367-L1268) | 901 |
| [VOID ParseNativeType(Module* pModule,](https://github.com/dotnet/coreclr/blob/51a6b5ce75c853e77266b8e1ce8c264736d2aabe/src/vm/fieldmarshaler.cpp#L223-L1109) | 886 |
| [VOID StubLinkerCPU::EmitArrayOpStub(const ArrayOpScript* pAr...](https://github.com/dotnet/coreclr/blob/51a6b5ce75c853e77266b8e1ce8c264736d2aabe/src/vm/i386/stublinkerx86.cpp#L4934-L5773) | 839 |

{::nomarkdown}  
</span>
{:/}

### Top 10 files with the Most Commits

Finally, lets look at which files have been changed the most since the [initial commit on GitHub](https://github.com/dotnet/coreclr/commit/ef1e2ab) back in January 2015 (ignore 'merge' commits) 

{::nomarkdown}  
<span class="compactTable">
{:/}

| File | # Commits |
|:-----|----------------:|
| [src\jit\morph.cpp](https://github.com/dotnet/coreclr/commits/51a6b5ce75c853e77266b8e1ce8c264736d2aabe/src/jit/morph.cpp) | 237 |
| [src\jit\compiler.h](https://github.com/dotnet/coreclr/commits/51a6b5ce75c853e77266b8e1ce8c264736d2aabe/src/jit/compiler.h) | 231 |
| [src\jit\importer.cpp](https://github.com/dotnet/coreclr/commits/51a6b5ce75c853e77266b8e1ce8c264736d2aabe/src/jit/importer.cpp) | 196 |
| [src\jit\codegenxarch.cpp](https://github.com/dotnet/coreclr/commits/51a6b5ce75c853e77266b8e1ce8c264736d2aabe/src/jit/codegenxarch.cpp) | 190 |
| [src\jit\flowgraph.cpp](https://github.com/dotnet/coreclr/commits/51a6b5ce75c853e77266b8e1ce8c264736d2aabe/src/jit/flowgraph.cpp) | 171 |
| [src\jit\compiler.cpp](https://github.com/dotnet/coreclr/commits/51a6b5ce75c853e77266b8e1ce8c264736d2aabe/src/jit/compiler.cpp) | 161 |
| [src\jit\gentree.cpp](https://github.com/dotnet/coreclr/commits/51a6b5ce75c853e77266b8e1ce8c264736d2aabe/src/jit/gentree.cpp) | 157 |
| [src\jit\lower.cpp](https://github.com/dotnet/coreclr/commits/51a6b5ce75c853e77266b8e1ce8c264736d2aabe/src/jit/lower.cpp) | 147 |
| [src\jit\gentree.h](https://github.com/dotnet/coreclr/commits/51a6b5ce75c853e77266b8e1ce8c264736d2aabe/src/jit/gentree.h) | 137 |
| [src\pal\inc\pal.h](https://github.com/dotnet/coreclr/commits/51a6b5ce75c853e77266b8e1ce8c264736d2aabe/src/pal/inc/pal.h) | 136 |

{::nomarkdown}  
</span>
{:/}

----

## High-level Overview

Next we'll take a look at how the source code is structured and what are the main components. 

They say "A picture is worth a thousand words", so below is a treemap with the source code files grouped by colour into the top-level sections they fall under. You can hover over an individual box to get more detailed information and can click on the different radio buttons to toggle the sizing (LOC/Files/Commits)

{% raw %}
<div id='top-level-treemap'>
  <!-- <svg width="960" height="570"></svg> -->
  <svg width="800" height="570"></svg>
  <form>
    <span style="padding-right: 5em"><label><input type="radio" name="mode" value="sumByLinesOfCode" checked> Total L.O.C</label></span>	
    <span style="padding-right: 5em"><label><input type="radio" name="mode" value="sumByNumFiles"> # Files</label></span>
    <span style="padding-right: 5em"><label><input type="radio" name="mode" value="sumByNumCommits"> # Commits</label></span>
  </form>
</div>
{% endraw %}

### Notes and Observations

- The '# Commits' only represent the commits made on GitHub, in the 2 1/2 years since the CoreCLR was open-sourced. So they are skewed to the recent work and don't represent changes made over the entire history of the CLR. However it's interesting to see which components have had more 'churn' in the last few years (i.e 'jit') and which have been left alone (e.g. 'pal') 
- From the number of LOC/files it's clear to see what the significant components are within the CoreCLR source, e.g 'vm', 'jit', 'pal' & 'mscorlib' (these are covered in detail in the next part of this post)
- In the 'VM' section it's interesting to see how much code is generic ~650K LOC and how much is per-CPU architecture 25K LOC for 'i386', 16K for 'amd64', 14K for 'arm' and 7K for 'arm64'. This suggests that the code is nicely organised so that the per-architecture work is minimised and cleanly separated out.
- It's surprising (to me) that the 'GC' section is as small as it is, I always thought of the GC is a very complex component, but there is way more code in the 'debugger' and the 'pal'.
- Likewise, I never really appreciated the complexity if the 'JIT', it's the 2nd largest component, comprising over 370K LOC.

If you're interested, this raw numbers for the code under '/src' are available in [this gist](https://gist.github.com/mattwarren/33ca0c20d36be5790578e71f67975514) and for the code under '/tests/src' in [this gist](https://gist.github.com/mattwarren/9125c637dc1eb8dba18b2ab70023c0e4).

---

## Deep Dive into Individual Areas

As the source code is well organised, the top-level folders (under [/src](https://github.com/dotnet/coreclr/tree/master/src)) correspond to the logical components within the CoreCLR. We'll start off by looking at the most significant components, i.e. the '**Debugger**', '**Garbage Collector**' (GC), '**Just-in-Time compiler**' (JIT), '**mscorlib**' (all the C# code), '**Platform Adaptation Layer**' (PAL) and the CLR '**Virtual Machine**' (VM).

### [mscorlib](https://github.com/dotnet/coreclr/blob/master/src/mscorlib)

The 'mscorlib' folder contains all the C# code within the CoreCLR, so it's the place that most C# developers would start looking if they wanted to contribute. For this reason it deserves it's own treemap, so we can see how it's structured:

{% raw %}
<div id='mscorlib-treemap'>
  <svg width="800" height="570"></svg>
  <form>   
	<span style="padding-right: 5em"><label><input type="radio" name="mode" value="sumByLinesOfCode" checked> Total L.O.C</label></span>
    <span style="padding-right: 5em"><label><input type="radio" name="mode" value="sumByNumFiles"> # Files</label></span>
    <span style="padding-right: 5em"><label><input type="radio" name="mode" value="sumByNumCommits"> # Commits</label></span>
  </form>
</div>
{% endraw %}

So by-far the bulk of the code is at the 'top-level', i.e. directly in the ['System' namespace](https://github.com/dotnet/coreclr/tree/master/src/mscorlib/src/System), this contains the fundamental types that [have to exist for the CLR to run](https://gist.github.com/mattwarren/07b38f39e2adc4acdd5ec53d10a50751), such as:

- `AppDomain`, `WeakReference`, `Type`, 
- `Array`, `Delegate`, `Object`, `String`
- `Boolean`, `Byte`, `Char`, `Int16`, `Int32`, etc
- `Tuple`, `Span`, `ArraySegment`, `Attribute`, `DateTime`

Where possible the CoreCLR is written in C#, because of the benefits that 'managed code' brings, so there is a significant amount of code within the 'mscorlib' section. Note that anything under here is not externally exposed, when you write C# code that runs against the CoreCLR, you actually access everything through [the CoreFX](https://github.com/dotnet/corefx), which then [type-forwards](https://www.simple-talk.com/blogs/anatomy-of-a-net-assembly-type-forwards/) to the CoreCLR where appropriate.

I don't know the rules for what lives in CoreCLR v CoreFX, but based on what I've read on various GitHub issues, it seems that over time, more and more code is moving from CoreCLR -> CoreFX.

However the *managed* C# code is often deeply entwined with *unmanaged* C++, for instance several types are implemented across multiple files, e.g.

- Arrays - [Arrays.cs](https://github.com/dotnet/coreclr/blob/master/src/mscorlib/src/System/Array.cs), [array.cpp](https://github.com/dotnet/coreclr/blob/master/src/vm/array.cpp), [array.h](https://github.com/dotnet/coreclr/blob/master/src/vm/array.h)
- Assemblies - [Assembly.cs](https://github.com/dotnet/coreclr/blob/master/src/mscorlib/shared/System/Reflection/Assembly.cs), [assembly.cpp](https://github.com/dotnet/coreclr/blob/master/src/vm/assembly.cpp), [assembly.hpp](https://github.com/dotnet/coreclr/blob/master/src/vm/assembly.hpp)

From what I understand this is done for performance reasons, any code that is perf sensitive will end up being implemented in C++ (or even Assembly), unless the JIT can suitable optimise the C# code.

#### **Code shared with CoreRT**

Recently there has been a significant amount of work done to moved more and more code over into the 'shared partition'. This is the area of the CoreCLR source code that is shared with [CoreRT](https://github.com/dotnet/corert/)  ('the .NET Core runtime optimized for AOT compilation'). Because certain classes are implemented in both runtimes, they've ensured that the work isn't duplicated and any fixes are shared in both locations. You can see how this works by looking at the links below:

- CoreCLR 
  - ['shared partition' commits](https://github.com/dotnet/coreclr/search?utf8=%E2%9C%93&q=%22shared+partition%22&type=Commits)
  - [Normal mscorlib](https://github.com/dotnet/coreclr/tree/master/src/mscorlib/src)
  - [Shared mscorlib](https://github.com/dotnet/coreclr/tree/master/src/mscorlib/shared)
- CoreRT
  - ['shared partition' commits](https://github.com/dotnet/corert/search?q=shared+partition&type=Commits&utf8=%E2%9C%93)
  - [Normal System.Private.Corelib](https://github.com/dotnet/corert/tree/master/src/System.Private.CoreLib/src)
  - [Shared System.Private.Corelib](https://github.com/dotnet/corert/tree/master/src/System.Private.CoreLib/shared) 

#### **Other parts of mscorlib**

All the other sections of mscorlib line up with `namespaces` available in the .NET runtime and contain functionality that *most* C# devs will have used at one time or another. The largest ones in there are shown below (click to go directly to the source code):

- [System.Reflection](https://github.com/dotnet/coreclr/tree/master/src/mscorlib/src/System/Reflection) and [System.Reflection.Emit](https://github.com/dotnet/coreclr/tree/master/src/mscorlib/src/System/Reflection/Emit)
  - `FieldInfo`, `PropertyInfo`, `MethodInfo`, `AssemblyBuilder`, `TypeBuilder`, `MethodBuilder`, `ILGenerator`
- [System.Globalization](https://github.com/dotnet/coreclr/tree/master/src/mscorlib/src/System/Globalization)
  - `CultureInfo`, `CalendarInfo`, `DateTimeParse`, `JulianCalendar`, `HebrewCalendar`
- [System.Threading](https://github.com/dotnet/coreclr/tree/master/src/mscorlib/src/System/Threading) and [System.Threading.Tasks](https://github.com/dotnet/coreclr/tree/master/src/mscorlib/src/System/Threading/Tasks)
  - `Thread`, `Timer`, `Semaphore`, `Mutex`, `AsyncLocal<T>`, `Task`, `Task<T>`, `CancellationToken`
- [System.Runtime.CompilerServices](https://github.com/dotnet/coreclr/tree/master/src/mscorlib/src/System/Runtime/CompilerServices) and [System.Runtime.InteropServices](https://github.com/dotnet/coreclr/tree/master/src/mscorlib/src/System/Runtime/InteropServices)
  - `Unsafe`, `[CallerFilePath]`, `[CallerLineNumber]`, `[CallerMemberName]`, `GCHandle`, `[LayoutKind]`, `[MarshalAs(..)]`, `[StructLayout(LayoutKind ..)]`
- [System.Diagnostics](https://github.com/dotnet/coreclr/tree/master/src/mscorlib/src/System/Diagnostics)
  - `Assert`, `Debugger`, `Stacktrace`
- [System.Text](https://github.com/dotnet/coreclr/tree/master/src/mscorlib/src/System/Text)
  - `StringBuilder`, `ASCIIEncoding`, `UTF8Encoding`, `UnicodeEncoding`
- [System.Collections](https://github.com/dotnet/coreclr/tree/master/src/mscorlib/src/System/Collections)
  - `ArrayList`, `Hashtable`
- [System.Collections.Generic](https://github.com/dotnet/coreclr/tree/master/src/mscorlib/src/System/Collections/Generic)
  - `Dictionary<T,U>`, `List<T>`
- [System.IO](https://github.com/dotnet/coreclr/tree/master/src/mscorlib/src/System/IO)
  - `Stream`, `MemoryStream`, `File`, `TestReader`, `TestWriter`

### [vm (Virtual Machine)](https://github.com/dotnet/coreclr/blob/master/src/vm)

The VM, not surprisingly, is the largest component of the CoreCLR, with over 640K L.O.C spread across 576 files, and it contains the *guts* of the runtime. The bulk of the code is OS and CPU independent and written in C++, however there is also a significant amount of architecture-specific assembly code, see the section ['CPU Architecture-specific code'](#cpu-architecture-specific-code) for more info. 

The VM contains the main start-up routine of the entire runtime `EEStartupHelper()` in [ceemain.cpp](https://github.com/dotnet/coreclr/blob/1d03b8fd8d650bd215623a7b035e68db96697e59/src/vm/ceemain.cpp#L806-L1378), see ['The 68 things the CLR does before executing a single line of your code']({{ base }}/2017/02/07/The-68-things-the-CLR-does-before-executing-a-single-line-of-your-code/) for all the details. In addition it provides the following functionality:

- **Type System**
  - [method.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/method.cpp), [class.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/class.cpp), [typedesc.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/typedesc.cpp)
- **Loading types/classes**
  - [ceeload.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/ceeload.cpp) [methodtable.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/methodtable.cpp) and [methodtablebuilder.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/methodtablebuilder.cpp)
- **Threading**
  - [threads.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/threads.cpp), [threadstatics.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/threadstatics.cpp), [threadsuspend.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/threadsuspend.cpp) and [win32threadpool.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/win32threadpool.cpp)
- **Exception Handling and Stack Walking**
  - [exceptionhandling.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/exceptionhandling.cpp), [excep.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/excep.cpp), [stackwalk.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/stackwalk.cpp), [frames.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/frames.cpp)
- **Fundamental Types**
  - [object.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/object.cpp), [array.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/array.cpp), [appdomain.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/appdomain.cpp), [safehandle.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/safehandle.cpp)
- **Generics**
  - [generics.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/generics.cpp) and [genericdict.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/genericdict.cpp)
- **An entire Interpreter** (yes .NET can run interpreted!!)
  - [interpreter.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/interpreter.cpp) and [interpreter.hpp](https://github.com/dotnet/coreclr/tree/master/src/vm/interpreter.hpp)
- **Function calling mechanisms** (see [BotR](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/mscorlib.md#calling-from-managed-to-native-code) for more info) 
  - [ecall.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/ecall.cpp), [fcall.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/fcall.cpp) and [qcall.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/qcall.cpp)
- **Stubs** (used for [virtual dispatch](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/virtual-stub-dispatch.md) and [delegates]({{ base }}/2017/01/25/How-do-.NET-delegates-work/) amongst other things)
  - [stubs.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/arm/stubs.cpp), [prestub.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/prestub.cpp), [stubgen.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/stubgen.cpp), [stubhelpers.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/stubhelpers.cpp), [stubmgr.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/stubmgr.cpp), [virtualcallstub.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/virtualcallstub.cpp)
- **Event Tracing**
  - [eventtrace.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/eventtrace.cpp), [eventreporter.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/eventreporter.cpp), [eventstore.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/eventstore.cpp) and [nativeeventsource.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/nativeeventsource.cpp)
- **Profiler**
  - [profiler.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/arm/profiler.cpp), [profilermetadataemitvalidator.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/profilermetadataemitvalidator.cpp) [profattach.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/profattach.cpp) and [profdetach.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/profdetach.cpp)
- **P/Invoke**
  - [dllimport.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/dllimport.cpp), [dllimportcallback.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/dllimportcallback.cpp) and [marshalnative.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/marshalnative.cpp)
- **Reflection**
  - [reflectioninvocation.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/reflectioninvocation.cpp), [dispatchinfo.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/dispatchinfo.cpp) and [invokeutil.cpp](https://github.com/dotnet/coreclr/tree/master/src/vm/invokeutil.cpp)

#### **CPU Architecture-specific code**

All the architecture-specific code is kept separately in several sub-folders, [amd64](https://github.com/dotnet/coreclr/tree/master/src/vm/amd64), [arm](https://github.com/dotnet/coreclr/tree/master/src/vm/arm), [arm64](https://github.com/dotnet/coreclr/tree/master/src/vm/arm64) and [i386](https://github.com/dotnet/coreclr/tree/master/src/vm/i386). For example here's the various implementations of the `WriteBarrier` function used by the GC:

- [amd64](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/vm/amd64/JitHelpers_FastWriteBarriers.asm#L44-L81) (.asm), there is also [a .S version](https://github.com/dotnet/coreclr/blob/4a0a82a8dabaabb1e9a82af944d70aed210838a3/src/vm/amd64/jithelpers_fastwritebarriers.S#L10-L73)
- [arm](https://github.com/dotnet/coreclr/blob/a9b25d4aa22a1f4ad5f323f6c826e318f5a720fe/src/vm/arm/asmhelpers.asm#L1625-L2101)
- [arm64](https://github.com/dotnet/coreclr/blob/9baa44aa334cf6f032e4abeae10dc1b960aaeb57/src/vm/arm64/asmhelpers.asm#L314-L397)
- [i386](https://github.com/dotnet/coreclr/blob/05e35b9e4edb317ec0fcfbe622ae3d7621ef5ae4/src/vm/i386/jithelp.asm#L118-L281)

### [jit (Just-in-Time compiler)](https://github.com/dotnet/coreclr/blob/master/src/jit)

Before we look at the actual source code, it's worth looking at the different 'flavours' or the JIT that are available:

- [clrjit](https://github.com/dotnet/coreclr/tree/master/src/jit)
- [standalone](https://github.com/dotnet/coreclr/tree/master/src/jit/standalone)
- [compatjit](https://github.com/dotnet/coreclr/tree/master/src/jit/compatjit)
- [legacyjit](https://github.com/dotnet/coreclr/tree/master/src/jit/legacyjit)
- [protojit](https://github.com/dotnet/coreclr/tree/master/src/jit/protojit)
- [protononjit](https://github.com/dotnet/coreclr/tree/master/src/jit/protononjit)
- [jitstd](https://github.com/dotnet/coreclr/tree/master/src/jit/jitstd)

Fortunately one of the Microsoft developers has [clarified which one should be used](https://github.com/dotnet/coreclr/pull/2214#issuecomment-161850464)

> Here's my guidance on how non-MS contributors should think about contributing to the JIT: **If you want to help advance the state of the production code-generators for .NET, then contribute to the new RyuJIT x86/ARM32 backend. This is our long term direction.** If instead your interest is around getting the .NET Core runtime working on x86 or ARM32 platforms to do other things, **by all means use and contribute bug fixes if necessary to the LEGACY_BACKEND paths in the RyuJIT code base today to unblock yourself.** We do run testing on these paths today in our internal testing infrastructure and will do our best to avoid regressing it until we can replace it with something better. **We just want to make sure that there will be no surprises or hard feelings for when the time comes to remove them from the code-base.**

#### **JIT Phases**

The JIT has almost 90 source files, but fortunately they correspond to the different phases it goes through, so it's not too hard to find your way around. Using the table from ['Phases of RyuyJIT'](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/ryujit-overview.md#phases-of-ryujit), I added the right-hand column so you can jump to the relevant source file(s):

{::nomarkdown}  
<span class="compactTable">
{:/}

| **Phase** | **IR Transformations** | **File** |
| --- | --- |:---:|
|[Pre-import](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/ryujit-overview.md#pre-import)|`Compiler->lvaTable` created and filled in for each user argument and variable. BasicBlock list initialized.| [compiler.hpp](https://github.com/dotnet/coreclr/blob/master/src/jit/compiler.hpp) |
|[Importation](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/ryujit-overview.md#importation)|`GenTree` nodes created and linked in to Statements, and Statements into BasicBlocks. Inlining candidates identified.| [importer.cpp](https://github.com/dotnet/coreclr/blob/master/src/jit/importer.cpp) |
|[Inlining](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/ryujit-overview.md#inlining)|The IR for inlined methods is incorporated into the flowgraph.| [inline.cpp](https://github.com/dotnet/coreclr/blob/master/src/jit/inline.cpp) and [inlinepolicy.cpp](https://github.com/dotnet/coreclr/blob/master/src/jit/inlinepolicy.cpp) |
|[Struct Promotion](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/ryujit-overview.md#struct-promotion)|New lvlVars are created for each field of a promoted struct.| [morph.cpp](https://github.com/dotnet/coreclr/blob/master/src/jit/morph.cpp) |
|[Mark Address-Exposed Locals](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/ryujit-overview.md#mark-addr-exposed)|lvlVars with references occurring in an address-taken context are marked. This must be kept up-to-date.| [compiler.hpp](https://github.com/dotnet/coreclr/blob/master/src/jit/compiler.hpp) |
|[Morph Blocks](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/ryujit-overview.md#morph-blocks)|Performs localized transformations, including mandatory normalization as well as simple optimizations.|[morph.cpp](https://github.com/dotnet/coreclr/blob/master/src/jit/morph.cpp) |
|[Eliminate Qmarks](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/ryujit-overview.md#eliminate-qmarks)|All `GT_QMARK` nodes are eliminated, other than simple ones that do not require control flow.| [compiler.cpp](https://github.com/dotnet/coreclr/blob/master/src/jit/compiler.cpp) |
|[Flowgraph Analysis](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/ryujit-overview.md#flowgraph-analysis)|`BasicBlock` predecessors are computed, and must be kept valid. Loops are identified, and normalized, cloned and/or unrolled.| [flowgraph.cpp](https://github.com/dotnet/coreclr/blob/master/src/jit/flowgraph.cpp) |
|[Normalize IR for Optimization](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/ryujit-overview.md#normalize-ir)|lvlVar references counts are set, and must be kept valid. Evaluation order of `GenTree` nodes (`gtNext`/`gtPrev`) is determined, and must be kept valid.| [compiler.cpp](https://github.com/dotnet/coreclr/blob/master/src/jit/compiler.cpp) and [lclvars.cpp](https://github.com/dotnet/coreclr/blob/master/src/jit/lclvars.cpp) |
|[SSA and Value Numbering Optimizations](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/ryujit-overview.md#ssa-vn)|Computes liveness (`bbLiveIn` and `bbLiveOut` on `BasicBlocks`), and dominators. Builds SSA for tracked lvlVars. Computes value numbers.| [liveness.cpp](https://github.com/dotnet/coreclr/blob/master/src/jit/liveness.cpp) |
|[Loop Invariant Code Hoisting](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/ryujit-overview.md#licm)|Hoists expressions out of loops.| [optimizer.cpp](https://github.com/dotnet/coreclr/blob/master/src/jit/optimizer.cpp) |
|[Copy Propagation](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/ryujit-overview.md#copy-propagation)|Copy propagation based on value numbers.| [copyprop.cpp](https://github.com/dotnet/coreclr/blob/master/src/jit/copyprop.cpp) |
|[Common Subexpression Elimination (CSE)](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/ryujit-overview.md#cse)|Elimination of redundant subexressions based on value numbers.| [optcse.cpp](https://github.com/dotnet/coreclr/blob/master/src/jit/optcse.cpp) |
|[Assertion Propagation](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/ryujit-overview.md#assertion-propagation)|Utilizes value numbers to propagate and transform based on properties such as non-nullness.| [assertionprop.cpp](https://github.com/dotnet/coreclr/blob/master/src/jit/assertionprop.cpp) |
|[Range analysis](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/ryujit-overview.md#range-analysis)|Eliminate array index range checks based on value numbers and assertions| [rangecheck.cpp](https://github.com/dotnet/coreclr/blob/master/src/jit/rangecheck.cpp) |
|[Rationalization](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/ryujit-overview.md#rationalization)|Flowgraph order changes from `FGOrderTree` to `FGOrderLinear`. All `GT_COMMA`, `GT_ASG` and `GT_ADDR` nodes are transformed.| [rationalize.cpp](https://github.com/dotnet/coreclr/blob/master/src/jit/rationalize.cpp) |
|[Lowering](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/ryujit-overview.md#lowering)|Register requirements are fully specified (`gtLsraInfo`). All control flow is explicit.| [lower.cpp](https://github.com/dotnet/coreclr/blob/master/src/jit/lower.cpp), [lowerarm.cpp](https://github.com/dotnet/coreclr/blob/master/src/jit/lowerarm.cpp), [lowerarm64.cpp](https://github.com/dotnet/coreclr/blob/master/src/jit/lowerarm64.cpp) and [lowerxarch.cpp](https://github.com/dotnet/coreclr/blob/master/src/jit/lowerxarch.cpp) |
|[Register allocation](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/ryujit-overview.md#reg-alloc)|Registers are assigned (`gtRegNum` and/or `gtRsvdRegs`),and the number of spill temps calculated.| [regalloc.cpp](https://github.com/dotnet/coreclr/blob/master/src/jit/regalloc.cpp) and [register_arg_convention.cp](https://github.com/dotnet/coreclr/blob/master/src/jit/register_arg_convention.cpp) |
|[Code Generation](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/ryujit-overview.md#code-generation)|Determines frame layout. Generates code for each `BasicBlock`. Generates prolog & epilog code for the method. Emit EH, GC and Debug info.| [codegenarm.cpp](https://github.com/dotnet/coreclr/blob/master/src/jit/codegenarm.cpp), [codegenarm64.cpp](https://github.com/dotnet/coreclr/blob/master/src/jit/codegenarm64.cpp), [codegencommon.cpp](https://github.com/dotnet/coreclr/blob/master/src/jit/codegencommon.cpp), [codegenlegacy.cpp](https://github.com/dotnet/coreclr/blob/master/src/jit/codegenlegacy.cpp), [codegenlinear.cpp](https://github.com/dotnet/coreclr/blob/master/src/jit/codegenlinear.cpp) and [codegenxarch.cpp](https://github.com/dotnet/coreclr/blob/master/src/jit/codegenxarch.cpp) |

{::nomarkdown}  
</span>
{:/}

### [pal (Platform Adaptation Layer)](https://github.com/dotnet/coreclr/blob/master/src/pal)

The PAL provides an OS independent layer to give access to common low-level functionality such as:

- [File system](https://github.com/dotnet/coreclr/tree/master/src/pal/src/file)
- [Threads](https://github.com/dotnet/coreclr/tree/master/src/pal/src/thread)
- [Critical Sections](https://github.com/dotnet/coreclr/blob/master/src/pal/src/sync)
- [Shared Memory](https://github.com/dotnet/coreclr/blob/master/src/pal/src/sharedmemory)
- ['Safe' C runtime-library (CRT)](https://github.com/dotnet/coreclr/tree/master/src/pal/src/safecrt)

As .NET was originally written to run on Windows, all the APIs look very similar to the Win32 APIs. However for non-Windows platforms they are actually implemented using the functionality available on that OS. For example this is what PAL code to [read/write a file](https://github.com/dotnet/coreclr/blob/master/src/pal/src/examples/example1.cpp) looks like:

``` cpp
int main(int argc, char *argv[])
{
  WCHAR  src[4] = {'f', 'o', 'o', '\0'};
  WCHAR dest[4] = {'b', 'a', 'r', '\0'};
  WCHAR  dir[5] = {'/', 't', 'm', 'p', '\0'};
  HANDLE h;
  unsigned int b;

  PAL_Initialize(argc, (const char**)argv);
  SetCurrentDirectoryW(dir);
  SetCurrentDirectoryW(dir);
  h =  CreateFileW(src, GENERIC_WRITE, FILE_SHARE_READ, NULL, CREATE_NEW, 0, NULL);
  WriteFile(h, "Testing\n", 8, &b, FALSE);
  CloseHandle(h);
  CopyFileW(src, dest, FALSE);
  DeleteFileW(src);
  PAL_Terminate();
  return 0;
}
```

The PAL does contain some [per-CPU assembly code](https://github.com/dotnet/coreclr/tree/master/src/pal/src/arch), but it's only for very low-level functionality, for instance here's the different implementations of the `DebugBreak` function:

- [amd64](https://github.com/dotnet/coreclr/blob/master/src/pal/src/arch/amd64/debugbreak.S)
- [arm](https://github.com/dotnet/coreclr/blob/master/src/pal/src/arch/arm/debugbreak.S)
- [arm64](https://github.com/dotnet/coreclr/blob/master/src/pal/src/arch/arm64/debugbreak.S)
- [i386](https://github.com/dotnet/coreclr/blob/master/src/pal/src/arch/i386/debugbreak.S)

### [gc (Garbage Collector)](https://github.com/dotnet/coreclr/blob/master/src/gc)

The GC is clearly a very complex piece of code, lying right at the heart of the CLR, so for more information about what it does I recommend reading the [BotR entry on 'Garbage Collection Design'](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/garbage-collection.md) and if you're interested I've also written [several blog posts](http://mattwarren.org/tags/#Garbage-Collectors) looking at its functionality.

However from a source code point-of-view the GC is pretty simple, it's spread across just 19 .cpp files, but the bulk of the work is in [gc.cpp](https://github.com/dotnet/coreclr/blob/master/src/gc/gc.cpp) ([raw version](https://raw.githubusercontent.com/dotnet/coreclr/master/src/gc/gc.cpp)) all ~37K L.O.C of it!! 

If you want to get deeper into the GC code (warning, it's pretty dense), a good way to start is to search for the occurrences of various `ETW` events that are fired as the GC moves through the phases outlined in the BotR post above, these events are listed below:

- `FireEtwGCTriggered(..)`
- `FireEtwGCAllocationTick_V1(..)`
- `FireEtwGCFullNotify_V1(..)`
- `FireEtwGCJoin_V2(..)`
- `FireEtwGCMarkWithType(..)`
- `FireEtwGCPerHeapHistory_V3(..)`
- `FireEtwGCGlobalHeapHistory_V2(..)`
- `FireEtwGCCreateSegment_V1(..)`
- `FireEtwGCFreeSegment_V1(..)`
- `FireEtwBGCAllocWaitBegin(..)`
- `FireEtwBGCAllocWaitEnd(..)`
- `FireEtwBGCDrainMark(..)`
- `FireEtwBGCRevisit(..)`
- `FireEtwBGCOverflow(..)`
- `FireEtwPinPlugAtGCTime(..)`
- `FireEtwGCCreateConcurrentThread_V1(..)`
- `FireEtwGCTerminateConcurrentThread_V1(..)`

But the GC doesn't work in isolation, it also requires help from the Execute Engine (EE), this is done via the `GCToEEInterface` which is implemented in [gcenv.ee.cpp](https://github.com/dotnet/coreclr/blob/master/src/vm/gcenv.ee.cpp).

#### **Local GC and GC Sample**

Finally, there are 2 others ways you can get into the GC code and understand what it does.

Firstly there is a [**GC sample**](https://github.com/dotnet/coreclr/blob/master/src/gc/sample/GCSample.cpp) the lets you use the full GC independent of the rest of the runtime. It shows you how to 'create type layout information in format that the GC expects', 'implement fast object allocator and write barrier' and 'allocate objects and work with GC handles', all in under 250 LOC!!

Also worth mentioning is the '**Local GC**' project, which is an ongoing effort to decouple the GC from the rest of the runtime, they even have a dashboard so you can [track its progress](https://github.com/dotnet/coreclr/projects/3). Currently the GC code is too intertwined with the runtime and vica-versa, so 'Local GC' is aiming to break that link by providing a set of clear interfaces, `GCToOSInterface` and `GCToEEInterface`. This will help with the CoreCLR cross-platform efforts, making the GC easier to port to new OSes.

### [debug](https://github.com/dotnet/coreclr/blob/master/src/debug)

The CLR is a 'managed runtime' and one of the significant components it provides is a advanced debugging experience, via Visual Studio or WinDBG. This debugging experience is very complex and I'm not going to go into it in detail here, however if you want to learn more I recommend you read ['Data Access Component (DAC) Notes'](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/dac-notes.md).

But what does the source look like, how is it laid out? Well the a several main sub-components under the top-level `/debug` folder:

- [dacaccess](https://github.com/dotnet/coreclr/tree/master/src/debug/daccess) - the provides the 'Data Access Component' (DAC) functionality as outlined in the BotR page linked to above. The DAC is an abstraction layer over the internal structures in the runtime, which the debugger uses to inspect objects/classes
- [di](https://github.com/dotnet/coreclr/tree/master/src/debug/di) - this contains the exposed APIs (or entry points) of the debugger, implemented by `CoreCLRCreateCordbObject(..)` in [cordb.cpp](https://github.com/dotnet/coreclr/blob/master/src/debug/di/cordb.cpp)
- [ee](https://github.com/dotnet/coreclr/tree/master/src/debug/ee) - the section of debugger that works with the Execution Engine (EE) to do things like stack-walking
- [inc](https://github.com/dotnet/coreclr/tree/master/src/debug/inc) - all the interfaces (.h) files that the debugger components implement

---

### All the rest

As well as the main components, there are various other top-level folders in the source, the full list is below:

- [binder](https://github.com/dotnet/coreclr/blob/master/src/binder)
  - The 'binder' is responsible for loading assemblies within a .NET program (except the [mscorlib binder](https://github.com/dotnet/coreclr/blob/master/src/vm/binder.cpp) which is elsewhere). The 'binder' comprises low-level code that controls [Assemblies](https://github.com/dotnet/coreclr/blob/master/src/binder/assembly.cpp), [Application Contexts](https://github.com/dotnet/coreclr/blob/master/src/binder/applicationcontext.cpp) and the all-important [Fusion Log](https://github.com/dotnet/coreclr/blob/master/src/binder/bindinglog.cpp) for diagnosing why assemblies aren't loading!
- [classlibnative](https://github.com/dotnet/coreclr/blob/master/src/classlibnative)
  - Code for native implementations of many of the core data types in the CoreCLR, e.g. [Arrays](https://github.com/dotnet/coreclr/blob/master/src/classlibnative/bcltype/arraynative.cpp), [System.Object](https://github.com/dotnet/coreclr/blob/master/src/classlibnative/bcltype/objectnative.cpp), [String](https://github.com/dotnet/coreclr/blob/master/src/classlibnative/bcltype/stringnative.cpp), [decimal](https://github.com/dotnet/coreclr/blob/master/src/classlibnative/bcltype/decimal.cpp), [float](https://github.com/dotnet/coreclr/blob/master/src/classlibnative/float/floatsingle.cpp) and [double](https://github.com/dotnet/coreclr/blob/master/src/classlibnative/float/floatdouble.cpp).
  - Also includes all the native methods exposed in the ['System.Environment'](https://github.com/dotnet/coreclr/blob/master/src/classlibnative/bcltype/system.cpp) namespace, e.g. `Environment.ProcessorCount`, `Environment.TickCount`, `Environment.GetCommandLineArgs()`, `Environment.FailFast()`, etc
- [coreclr](https://github.com/dotnet/coreclr/blob/master/src/coreclr)
  - Contains the different tools that can 'host' or run the CLR, e.g. `corerun`, `coreconsole` or `unixcorerun`. See [How the dotnet CLI tooling runs your code]({{ base }}/2016/07/04/How-the-dotnet-CLI-tooling-runs-your-code/) for more info on how these tools work.
- [corefx](https://github.com/dotnet/coreclr/blob/master/src/corefx)
  - Several classes under the ['System.Globalization'](https://msdn.microsoft.com/en-us/library/system.globalization%28v=vs.110%29.aspx?f=255&MSPPError=-2147217396) namespace have native implementations,  in here you will find the code for [Calendar Data](https://github.com/dotnet/coreclr/blob/master/src/corefx/System.Globalization.Native/calendarData.cpp), [Locales](https://github.com/dotnet/coreclr/blob/master/src/corefx/System.Globalization.Native/locale.cpp), [Text Normalisation](https://github.com/dotnet/coreclr/blob/master/src/corefx/System.Globalization.Native/normalization.cpp) and [Time Zone information](https://github.com/dotnet/coreclr/blob/master/src/corefx/System.Globalization.Native/timeZoneInfo.cpp).
- [dlls](https://github.com/dotnet/coreclr/blob/master/src/dlls)
  - Wrapper code and build files that control how the various dlls are built. For instance [mscoree](https://github.com/dotnet/coreclr/tree/master/src/dlls/mscoree) is the main Execution Engine (EE) and contains the [CoreCLR DLL Entrypoint](https://github.com/dotnet/coreclr/blob/d905f67f12c6b2eed918894e0642ec972a1d9fec/src/dlls/mscoree/mscoree.cpp#L61-L116) and [CoreCLR build definition](https://github.com/dotnet/coreclr/blob/master/src/dlls/mscoree/coreclr/CMakeLists.txt), likewise [mscorrc](https://github.com/dotnet/coreclr/blob/master/src/dlls/mscorrc) includes the [resource file](https://github.com/dotnet/coreclr/blob/master/src/dlls/mscorrc/mscorrc.rc) that houses all the CoreCLR error messages.
- [gcdump](https://github.com/dotnet/coreclr/blob/master/src/gcdump) and [gcinfo](https://github.com/dotnet/coreclr/blob/master/src/gcinfo)
  - Code that will write-out the `GCInfo` that is produced by the JIT to help the GC do it's job. This `GCInfo` includes information about the 'liveness' of variables within a section of code and whether the method is [fully or partially interruptible]({{ base }}/2016/08/08/GC-Pauses-and-Safe-Points/#gc-suspension-in-user-code), which enables the EE to suspend methods when the GC is working.
- [ilasm](https://github.com/dotnet/coreclr/blob/master/src/ilasm)
  - IL (Intermediate Language) Assembler is a tool for converting IL code into a .NET executable, see the [MSDN page](https://msdn.microsoft.com/en-us/library/496e4ekx%28v=vs.110%29.aspx?f=255&MSPPError=-2147217396) for more info and usage examples.
- [ildasm](https://github.com/dotnet/coreclr/blob/master/src/ildasm)
  - Tool for disassembling a .NET executable into the corresponding IL source code, again, see the [MSDN page](https://msdn.microsoft.com/en-us/library/f7dy01k1%28v=vs.110%29.aspx?f=255&MSPPError=-2147217396) for info and usage examples.
- [inc](https://github.com/dotnet/coreclr/blob/master/src/inc) 
  - Header files that define the 'interfaces' between the sub-components that make up the CoreCLR. For example [corjit.h](https://github.com/dotnet/coreclr/blob/master/src/inc/corjit.h) covers all communication between the Execution Engine (EE) and the JIT, that is 'EE -> JIT' and [corinfo.h](https://github.com/dotnet/coreclr/blob/master/src/inc/corinfo.h) is the interface going the other way, i.e. 'JIT -> EE'
- [ipcman](https://github.com/dotnet/coreclr/blob/master/src/ipcman)
  - Code that enables the 'Inter-Process Communication' (IPC) used in .NET (mostly legacy and *probably* not cross-platform)
- [md](https://github.com/dotnet/coreclr/blob/master/src/md)
  - The MetaData (md) code provides the ability to gather information about methods, classes, types and assemblies and is what makes [Reflection possible](http://odetocode.com/Articles/288.aspx).
- [nativeresources](https://github.com/dotnet/coreclr/blob/master/src/nativeresources)
  - A simple tool that is responsible for converting/extracting resources from a Windows Resource File.
- [palrt](https://github.com/dotnet/coreclr/blob/master/src/palrt)
  - The PAL (Platform Adaptation Layer) Run-Time, contains specific parts of the PAL layer.
- [scripts](https://github.com/dotnet/coreclr/blob/master/src/scripts)
  - Several Python scripts for auto-generating various files in the source (e.g. ETW events).
- [strongname](https://github.com/dotnet/coreclr/blob/master/src/strongname)
  - The code for handling ['strong-naming'](https://msdn.microsoft.com/en-us/library/wd40t7ad%28v=vs.110%29.aspx?f=255&MSPPError=-2147217396), including the [signing](https://github.com/dotnet/coreclr/blob/master/src/strongname/inc/thekey.h) [keys](https://github.com/dotnet/coreclr/blob/master/src/strongname/inc/ecmakey.h) used by the CoreCLR itself.
- [ToolBox](https://github.com/dotnet/coreclr/blob/master/src/ToolBox)
  - Contains 2 stand-alone tools
    - [SOS (son-of-strike)](https://blogs.msdn.microsoft.com/jasonz/2003/10/21/sos-debugging-of-the-clr-part-1/) the CLR debugging extension that enables reporting of .NET specific information when using WinDBG
    - [SuperPMI](https://github.com/dotnet/coreclr/blob/master/src/ToolBox/superpmi/readme.txt) which enables testing of the JIT without requiring the full Execution Engine (EE) 
- [tools](https://github.com/dotnet/coreclr/blob/master/src/tools)
  - Several cmd-line tools that can be used in conjunction with the CoreCLR, e.g. ['Runtime Meta Data Dump Utility'](https://github.com/dotnet/coreclr/blob/master/src/tools/metainfo/metainfo.cpp) and ['Native Image Generator'](https://github.com/dotnet/coreclr/blob/master/src/tools/crossgen/crossgen.cpp) (also known as ['crossgen'](https://github.com/dotnet/coreclr/blob/master/Documentation/building/crossgen.md))
- [unwinder](https://github.com/dotnet/coreclr/blob/master/src/unwinder)
  - Provides the low-level functionality to make it possible for the debugger and exception handling components to [walk or unwind the stack](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/stackwalking.md). This is done via 2 functions, `GetModuleBase(..)` and `GetFunctionEntry(..)` which are implemented in CPU architecture-specific code, see [amd64](https://github.com/dotnet/coreclr/tree/master/src/unwinder/amd64), [arm](https://github.com/dotnet/coreclr/tree/master/src/unwinder/arm), [arm64](https://github.com/dotnet/coreclr/tree/master/src/unwinder/arm64) and [i386](https://github.com/dotnet/coreclr/tree/master/src/unwinder/i386) 
- [utilcode](https://github.com/dotnet/coreclr/blob/master/src/utilcode)
  - Shared utility code that is used by the VM, Debugger and JIT
- [zap](https://github.com/dotnet/coreclr/blob/master/src/zap)
  - 'ZAP' is the original code name for [NGen (Native Image Generator)](https://msdn.microsoft.com/en-us/library/6t9t5wcf%28v=vs.110%29.aspx?f=255&MSPPError=-2147217396), a tool that creates native images from .NET IL code.  

----

If you've read this far **['So long and thanks for all the fish'](https://www.youtube.com/watch?v=N_dUmDBfp6k)** (YouTube)

----

Discuss this post on [Hacker News](https://news.ycombinator.com/item?id=13949986) and [/r/programming](https://www.reddit.com/r/programming/comments/6131kr/a_hitchhikers_guide_to_the_coreclr_source_code/)