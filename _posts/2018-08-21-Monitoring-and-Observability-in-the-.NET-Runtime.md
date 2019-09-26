---
layout: post
title: Monitoring and Observability in the .NET Runtime
comments: true
codeproject: false
tags: [CLR, .NET, Internals]
---

.NET is a [*managed runtime*](https://en.wikipedia.org/wiki/Managed_code), which means that it provides high-level features that 'manage' your program for you, from [Introduction to the Common Language Runtime (CLR)](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/intro-to-clr.md#fundamental-features-of-the-clr) (written in 2007):

> The runtime has many features, so it is useful to categorize them as follows:
> 1. **Fundamental features** – Features that have broad impact on the design of other features.  These include:
>     1. Garbage Collection
>     2. Memory Safety and Type Safety
>     3. High level support for programming languages.
> 2. **Secondary features** – Features enabled by the fundamental features that may not be required by many useful programs:
>    1. Program isolation with AppDomains
>    2. Program Security and sandboxing
> 3. **Other Features** – Features that all runtime environments need but that do not leverage the fundamental features of the CLR.  Instead, they are the result of the desire to create a complete programming environment. Among them are:
>    1. Versioning
>    2. **Debugging/Profiling**
>    3. Interoperation

You can see that 'Debugging/Profiling', whilst not a Fundamental or Secondary feature, still makes it into the list because of a '*desire to create a complete programming environment*'.

**The rest of this post will look at *what* [Monitoring](https://en.wikipedia.org/wiki/Application_performance_management), [Observability](https://en.wikipedia.org/wiki/Observability) and [Introspection](https://en.wikipedia.org/wiki/Virtual_machine_introspection) features the Core CLR provides, *why* they're useful and *how* it provides them.**

To make it easier to navigate, the post is split up into 3 main sections (with some 'extra-reading material' at the end):

- [Diagnostics](#diagnostics)
  - Perf View
  - Common Infrastructure
  - Future Plans
- [Profiling](#profiling)
  - ICorProfiler API
  - Profiling v. Debugging
- [Debugging](#debugging)
  - ICorDebug API
  - SOS and the DAC
  - 3rd Party Debuggers
  - Memory Dumps
- [Further Reading](#further-reading)

----

## Diagnostics

Firstly we are going to look at the **diagnostic** information that the CLR provides, which has traditionally been supplied via ['Event Tracing for Windows'](https://docs.microsoft.com/en-us/windows/desktop/etw/about-event-tracing) (ETW).

There is quite a wide range of events that the [CLR provides](https://docs.microsoft.com/en-us/dotnet/framework/performance/clr-etw-keywords-and-levels) related to:

- Garbage Collection (GC)
- Just-in-Time (JIT) Compilation
- Module and AppDomains
- Threading and Lock Contention
- and much more

For example this is where the [AppDomain Load event is fired](https://github.com/dotnet/coreclr/blob/release/2.1/src/vm/corhost.cpp#L649), this is the [Exception Thrown event](https://github.com/dotnet/coreclr/blob/release/2.1/src/vm/exceptionhandling.cpp#L203) and here is the [GC Allocation Tick event](https://github.com/dotnet/coreclr/blob/release/2.1/src/vm/gctoclreventsink.cpp#L139-L144).

### Perf View

If you want to see the ETW Events coming from your .NET program I recommend using the excellent [PerfView tool](https://github.com/Microsoft/perfview) and starting with these [PerfView Tutorials](https://channel9.msdn.com/Series/PerfView-Tutorial) or this excellent talk [PerfView: The Ultimate .NET Performance Tool](https://www.slideshare.net/InfoQ/perfview-the-ultimate-net-performance-tool). PerfView is widely regarded because it provides invaluable information, for instance Microsoft Engineers regularly use it for [performance investigations](https://github.com/dotnet/corefx/issues/28834).

![PerfView - CPU Stacks]({{ base }}/images/2018/08/PerfView - CPU Stacks.jpg)

### Common Infrastructure

However, in case it wasn't clear from the name, ETW events are only available on Windows, which doesn't really fit into the new 'cross-platform' world of .NET Core. You can use [PerfView for Performance Tracing on Linux](https://github.com/dotnet/coreclr/blob/release/2.1/Documentation/project-docs/linux-performance-tracing.md) (via [LTTng](https://lttng.org/)), but that is only the cmd-line collection tool, known as 'PerfCollect', the analysis and rich UI (which includes [flamegraphs](https://github.com/Microsoft/perfview/pull/502)) is currently Windows only.

But if you do want to analyse .NET Performance Linux, there are some other approaches:
- [Getting Stacks for LTTng Events with .NET Core on Linux](https://blogs.microsoft.co.il/sasha/2018/02/06/getting-stacks-for-lttng-events-with-net-core-on-linux/)
- [Linux performance problem](https://github.com/dotnet/coreclr/issues/18465)

The 2nd link above discusses the new **'EventPipe' infrastructure** that is being worked on in .NET Core (along with EventSources & EventListeners, can you spot a theme!), you can see its aims in [Cross-Platform Performance Monitoring Design](https://github.com/dotnet/designs/blob/master/accepted/cross-platform-performance-monitoring.md). At a high-level it will provide a single place for the CLR to push 'events' related to diagnostics and performance. These 'events' will then be routed to one or more loggers which may include ETW, LTTng, and BPF for example, with the exact logger being determined by which OS/Platform the CLR is running on. There is also more background information in [.NET Cross-Plat Performance and Eventing Design](https://github.com/dotnet/coreclr/blob/master/Documentation/coding-guidelines/cross-platform-performance-and-eventing.md) that explains the pros/cons of the different logging technologies.

All the work being done on 'Event Pipes' is being tracked in the ['Performance Monitoring' project](https://github.com/dotnet/coreclr/projects/5) and the associated ['EventPipe' Issues](https://github.com/dotnet/coreclr/search?q=EventPipe&type=Issues).

### Future Plans

Finally, there are also future plans for a [Performance Profiling Controller](https://github.com/dotnet/designs/blob/master/accepted/performance-profiling-controller.md) which has the following goal:

> The controller is responsible for control of the profiling infrastructure and exposure of performance data produced by .NET performance diagnostics components in a simple and cross-platform way.

The idea is for it to expose the [following functionality via a HTTP server](https://github.com/dotnet/designs/blob/master/accepted/performance-profiling-controller.md#functionality-exposed-through-controller), by pulling all the relevant data from 'Event Pipes':

> **REST APIs**
> - Pri 1: Simple Profiling: Profile the runtime for X amount of time and return the trace.
> - Pri 1: Advanced Profiling: Start tracing (along with configuration)
> - Pri 1: Advanced Profiling: Stop tracing (the response to calling this will be the trace itself)
> - Pri 2: Get the statistics associated with all EventCounters or a specified EventCounter.
>
> **Browsable HTML Pages**
> - Pri 1: Textual representation of all managed code stacks in the process.
>   - Provides an snapshot overview of what's currently running for use as a simple diagnostic report.
> - Pri 2: Display the current state (potentially with history) of EventCounters.
>   - Provides an overview of the existing counters and their values.
>   - OPEN ISSUE: I don't believe the necessary public APIs are present to enumerate EventCounters.

I'm excited to see where the 'Performance Profiling Controller' (PPC?) goes, I think it'll be really valuable for .NET to have this built-in to the CLR, it's something that [other runtimes have](https://github.com/golang/go/wiki/Performance).

----

## Profiling

Another powerful feature the CLR provides is the [Profiling API](https://docs.microsoft.com/en-us/previous-versions/dotnet/netframework-4.0/ms404386(v%3dvs.100)), which is (mostly) used by 3rd party tools to hook into the runtime at a very low-level. You can find our more about the API in [this overview](https://docs.microsoft.com/en-us/previous-versions/dotnet/netframework-4.0/bb384493(v%3dvs.100)), but at a high-level, it allows your to wire up callbacks that are triggered when:

- GC-related events happen
- Exceptions are thrown
- Assemblies are loaded/unloaded
- [much, much more](https://docs.microsoft.com/en-us/previous-versions/dotnet/netframework-4.0/ms230818%28v%3dvs.100%29)

![profiling-overview]({{ base }}/images/2018/08/profiling-overview.png)

**Image from the BOTR page [Profiling API – Overview](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/profiling.md#profiling-api--overview)**

In addition is has other **very power features**. Firstly you can **setup hooks that are called every time a .NET method is executed** whether in the runtime or from users code. These callbacks are known as 'Enter/Leave' hooks and there is a [nice sample](https://github.com/Microsoft/clr-samples/tree/master/ProfilingAPI/ReJITEnterLeaveHooks) that shows how to use them, however to make them work you need to understand ['calling conventions' across different OSes and CPU architectures](https://github.com/dotnet/coreclr/issues/19023), which [isn't always easy](https://github.com/dotnet/coreclr/issues/18977). Also, as a warning, the Profiling API is a COM component that can only be accessed via C/C++ code, you can't use it from C#/F#/VB.NET!

Secondly, the Profiler is able to **re-write the IL code of any .NET method before it is JITted**, via the [SetILFunctionBody() API](https://docs.microsoft.com/en-us/dotnet/framework/unmanaged-api/profiling/icorprofilerfunctioncontrol-setilfunctionbody-method). This API is hugely powerful and forms the basis of many .NET [APM Tools](https://stackify.com/application-performance-management-tools/), you can learn more about how to use it in my previous post [How to mock sealed classes and static methods]({{ base }}/2014/08/14/how-to-mock-sealed-classes-and-static-methods/) and the [accompanying code](https://github.com/mattwarren/DDD2011_ProfilerDemo/commit/9f804cec8ef11b802e020e648180b436a429833f?w=1).

### ICorProfiler API

It turns out that the run-time has to perform all sorts of crazy tricks to make the Profiling API work, just look at what went into this PR [Allow rejit on attach](https://github.com/dotnet/coreclr/pull/19054) (for more info on 'ReJIT' see [ReJIT: A How-To Guide](https://blogs.msdn.microsoft.com/davbr/2011/10/12/rejit-a-how-to-guide/)).

The overall definition for all the Profiling API interfaces and callbacks is found in [\vm\inc\corprof.idl](https://github.com/dotnet/coreclr/blob/master/src/inc/corprof.idl) (see [Interface description language](https://en.wikipedia.org/wiki/Interface_description_language)). But it's divided into 2 logical parts, one is the **Profiler -> 'Execution Engine' (EE)** interface, known as`ICorProfilerInfo`:

``` cpp
// Declaration of class that implements the ICorProfilerInfo* interfaces, which allow the
// Profiler to communicate with the EE.  This allows the Profiler DLL to get
// access to private EE data structures and other things that should never be exported
// outside of the EE.
```

Which is implemented in the following files:

- [\vm\proftoeeinterfaceimpl.h](https://github.com/dotnet/coreclr/blob/release/2.1/src/vm/proftoeeinterfaceimpl.h)
- [\vm\proftoeeinterfaceimpl.inl](https://github.com/dotnet/coreclr/blob/release/2.1/src/vm/proftoeeinterfaceimpl.inl)
- [\vm\proftoeeinterfaceimpl.cpp](https://github.com/dotnet/coreclr/blob/release/2.1/src/vm/proftoeeinterfaceimpl.cpp)

The other main part is the **EE -> Profiler** callbacks, which are grouped together under the `ICorProfilerCallback` interface:

``` cpp
// This module implements wrappers around calling the profiler's 
// ICorProfilerCallaback* interfaces. When code in the EE needs to call the
// profiler, it goes through EEToProfInterfaceImpl to do so.
```

These callbacks are implemented across the following files:

- [vm\eetoprofinterfaceimpl.h](https://github.com/dotnet/coreclr/blob/release/2.1/src/vm/eetoprofinterfaceimpl.h)
- [vm\eetoprofinterfaceimpl.inl](https://github.com/dotnet/coreclr/blob/release/2.1/src/vm/eetoprofinterfaceimpl.inl)
- [vm\eetoprofinterfaceimpl.cpp](https://github.com/dotnet/coreclr/blob/release/2.1/src/vm/eetoprofinterfaceimpl.cpp)
- [vm\eetoprofinterfacewrapper.inl](https://github.com/dotnet/coreclr/blob/release/2.1/src/vm/eetoprofinterfacewrapper.inl)

Finally, it's worth pointing out that the Profiler APIs might not work across all OSes and CPU-archs that .NET Core runs on, e.g. [ELT call stub issues on Linux](https://github.com/dotnet/coreclr/issues/18977), see [Status of CoreCLR Profiler APIs](https://github.com/dotnet/coreclr/blob/release/2.1/Documentation/project-docs/profiling-api-status.md) for more info.

### Profiling v. Debugging

As a quick aside, 'Profiling' and 'Debugging' do have some overlap, so it's helpful to understand what the different APIs provide *in the context of the .NET Runtime*, from [CLR Debugging vs. CLR Profiling](https://blogs.msdn.microsoft.com/jmstall/2004/10/22/clr-debugging-vs-clr-profiling/)

![Design Differences between CLR Debugging and CLR Profiling]({{ base }}/images/2018/08/Design Differences between CLR Debugging and CLR Profiling.png)

----

## Debugging

Debugging means different things to different people, for instance I asked on Twitter "*what are the ways that you've debugged a .NET program*" and got a [wide range](https://mobile.twitter.com/matthewwarren/status/1030444463385178113) of [different responses](https://mobile.twitter.com/matthewwarren/status/1030580487969038344), although both sets of responses contain a really good list of tools and techniques, so they're worth checking out, thanks #LazyWeb!

But perhaps this quote best sums up what **Debugging really is** 😊

<blockquote class="twitter-tweet" data-lang="en"><p lang="en" dir="ltr">Debugging is like being the detective in a crime movie where you are also the murderer.</p>&mdash; Filipe Fortes (@fortes) <a href="https://twitter.com/fortes/status/399339918213652480?ref_src=twsrc%5Etfw">November 10, 2013</a></blockquote>
<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

The CLR provides a very extensive range of features related to Debugging, but why does it need to provide these services, the excellent post [Why is managed debugging different than native-debugging?](https://blogs.msdn.microsoft.com/jmstall/2004/10/10/why-is-managed-debugging-different-than-native-debugging/) provides 3 reasons:

1. Native debugging can be abstracted at the hardware level but **managed debugging needs to be abstracted at the IL level**
2. Managed debugging needs a lot of information **not available until runtime**
3. A managed debugger needs to **coordinate with the Garbage Collector (GC)**

So to give a decent experience, the CLR *has* to provide the [higher-level debugging API](https://docs.microsoft.com/en-us/dotnet/framework/unmanaged-api/debugging/) known as `ICorDebug`, which is shown in the image below of a 'common debugging scenario' from [the BOTR](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/dac-notes.md#marshaling-specifics):

![common debugging scenario]({{ base }}/images/2018/08/common debugging scenario.png)

In addition, there is a nice description of how the different parts interact in [How do Managed Breakpoints work?](https://blogs.msdn.microsoft.com/jmstall/2004/12/28/how-do-managed-breakpoints-work/):

```
Here’s an overview of the pipeline of components:
1) End-user
2) Debugger (such as Visual Studio or MDbg).
3) CLR Debugging Services (which we call "The Right Side"). This is the implementation of ICorDebug (in mscordbi.dll).
---- process boundary between Debugger and Debuggee ----
4) CLR. This is mscorwks.dll. This contains the in-process portion of the debugging services (which we call "The Left Side") which communicates directly with the RS in stage #3.
5) Debuggee's code (such as end users C# program)
```

### ICorDebug API

But how is all this implemented and what are the different components, from [CLR Debugging, a brief introduction](https://github.com/Microsoft/clrmd/blob/master/Documentation/GettingStarted.md#clr-debugging-a-brief-introduction):

> All of .Net debugging support is implemented on top of a dll we call "The Dac". This file (usually named `mscordacwks.dll`) is the building block for both our public debugging API (`ICorDebug`) as well as the two private debugging APIs: The SOS-Dac API and IXCLR.
>
> In a perfect world, everyone would use `ICorDebug`, our public debugging API. However a vast majority of features needed by tool developers such as yourself is lacking from `ICorDebug`. This is a problem that we are fixing where we can, but these improvements go into CLR v.next, not older versions of CLR. In fact, the `ICorDebug` API only added support for crash dump debugging in CLR v4. Anyone debugging CLR v2 crash dumps cannot use `ICorDebug` at all!

(for an additional write-up, see [SOS & ICorDebug](https://github.com/dotnet/coreclr/blob/master/src/ToolBox/SOS/SOSAndICorDebug.md))

The `ICorDebug` API is actually split up into multiple interfaces, there are over 70 of them!! I won't list them all here, but I will show the categories they fall into, for more info see [Partition of ICorDebug](https://blogs.msdn.microsoft.com/jmstall/2006/01/04/partition-of-icordebug/) where this list came from, as it goes into much more detail.

- **Top-level:** ICorDebug + ICorDebug2 are the top-level interfaces which effectively serve as a collection of ICorDebugProcess objects.
- **Callbacks:** Managed debug events are dispatched via methods on a callback object implemented by the debugger
- **Process:** This set of interfaces represents running code and includes the APIs related to eventing.
- **Code / Type Inspection:**  Could mostly operate on a static PE image, although there are a few convenience methods for live data.
- **Execution Control:** Execution is the ability to "inspect" a thread's execution. Practically, this means things like placing breakpoints (F9) and doing stepping (F11 step-in, F10 step-over, S+F11 step-out). ICorDebug's Execution control only operates within managed code.
- **Threads + Callstacks:** Callstacks are the backbone of the debugger's inspection functionality. The following interfaces are related to taking a callstack. ICorDebug only exposes debugging managed code, and thus the stacks traces are managed-only. 
- **Object Inspection:** Object inspection is the part of the API that lets you see the values of the variables throughout the debuggee.   For each interface, I list the "MVP" method that I think must succinctly conveys the purpose of that interface.

One other note, as with the Profiling APIs the level of support for the Debugging API varies across OS's and CPU architectures. For instance, as of Aug 2018 there's ["no solution for Linux ARM of managed debugging and diagnostic"](https://github.com/dotnet/diagnostics/issues/58#issuecomment-414182115). For more info on 'Linux' support in general, see this great post [Debugging .NET Core on Linux with LLDB](https://www.raydbg.com/2018/Debugging-Net-Core-on-Linux-with-LLDB/) and check-out the [Diagnostics repository](https://github.com/dotnet/diagnostics) from Microsoft that has the goal of making it easier to debug .NET programs on Linux.

Finally, if you want to see what the `ICorDebug` APIs look like in C#, take a look at the [wrappers included in CLRMD library](https://github.com/Microsoft/clrmd/blob/master/src/Microsoft.Diagnostics.Runtime/ICorDebug/ICorDebugWrappers.cs), include all the [available callbacks](https://github.com/Microsoft/clrmd/blob/c81a592f3041a9ae86f4c09351d8183801e39eed/src/Microsoft.Diagnostics.Runtime/ICorDebug/ICorDebugHelpers.cs) (CLRMD will be covered in more depth, later on in this post).

### SOS and the DAC

The 'Data Access Component' (DAC) is discussed in detail in the [BOTR page](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/dac-notes.md), but in essence it provides 'out-of-process' access to the CLR data structures, so that their internal details can be read from *another process*. This allows a debugger (via `ICorDebug`) or the ['Son of Strike' (SOS) extension](https://docs.microsoft.com/en-us/dotnet/framework/tools/sos-dll-sos-debugging-extension) to reach into a running instance of the CLR or a memory dump and find things like:

- all the running threads
- what objects are on the managed heap
- full information about a method, including the machine code
- the current 'stack trace'

**Quick aside**, if you want an explanation of all the strange names and a bit of a '.NET History Lesson' see [this Stack Overflow answer](https://stackoverflow.com/questions/21361602/what-the-ee-means-in-sos/21363245#21363245).

The full list of [SOS Commands](https://github.com/dotnet/coreclr/blob/master/Documentation/building/debugging-instructions.md#sos-commands) is quite impressive and using it along-side WinDBG allows you a very low-level insight into what's going on in your program and the CLR. To see how it's implemented, lets take a look at the `!HeapStat` command that gives you a summary of the size of different Heaps that the .NET GC is using:

![SOS-heapstat-cmd.png]({{ base }}/images/2018/08/SOS-heapstat-cmd.png)

(image from [SOS: Upcoming release has a few new commands – HeapStat](https://blogs.msdn.microsoft.com/tom/2008/06/30/sos-upcoming-release-has-a-few-new-commands-heapstat/))

Here's the code flow, showing how SOS and the DAC work together:

- **SOS** The full `!HeapStat` command ([link](https://github.com/dotnet/coreclr/blob/release/2.1/src/ToolBox/SOS/Strike/strike.cpp#L4605-L4782))
- **SOS** The code in the `!HeapStat` command that deals with the 'Workstation GC' ([link](https://github.com/dotnet/coreclr/blob/release/2.1/src/ToolBox/SOS/Strike/strike.cpp#L4631-L4667))
- **SOS** `GCHeapUsageStats(..)` function that does the heavy-lifting ([link](https://github.com/dotnet/coreclr/blob/release/2.1/src/ToolBox/SOS/Strike/eeheap.cpp#L768-L850))
- **Shared** The `DacpGcHeapDetails` data structure that contains pointers to the main data in the GC heap, such as segments, card tables and individual generations ([link](https://github.com/dotnet/coreclr/blob/release/2.1/src/inc/dacprivate.h#L690-L722))
- **DAC**  `GetGCHeapStaticData` function that fills-out the `DacpGcHeapDetails` struct ([link](https://github.com/dotnet/coreclr/blob/release/2.1/src/inc/dacprivate.h#L690-L722))
- **Shared** the `DacpHeapSegmentData` data structure that contains details for an individual 'segment' with the GC Heap ([link](https://github.com/dotnet/coreclr/blob/release/2.1/src/inc/dacprivate.h#L738-L771))
- **DAC** `GetHeapSegmentData(..)` that fills-out the `DacpHeapSegmentData` struct ([link](https://github.com/dotnet/coreclr/blob/release/2.1/src/debug/daccess/request.cpp#L2829-L2868))

### 3rd Party 'Debuggers'

Because Microsoft published the debugging API it allowed 3rd parties to make use of the use of the `ICorDebug` interfaces, here's a list of some that I've come across:

- [Debugger for .NET Core runtime](https://github.com/Samsung/netcoredbg) from [Samsung](https://github.com/Samsung)
  - The debugger provides GDB/MI or VSCode debug adapter interface and allows to debug .NET apps under .NET Core runtime.
  - *Probably* written as part of their work of [porting .NET Core to their Tizen OS](https://developer.tizen.org/blog/celebrating-.net-core-2.0-looking-forward-tizen-4.0)
- [dnSpy](https://github.com/0xd4d/dnSpy) - ".NET debugger and assembly editor"
  - A [**very** impressive tool](https://github.com/0xd4d/dnSpy#features-see-below-for-more-detail), it's a 'debugger', 'assembly editor', 'hex editor', 'decompiler' and much more!
- [MDbg.exe (.NET Framework Command-Line Debugger)](https://docs.microsoft.com/en-us/dotnet/framework/tools/mdbg-exe)
  - Available as a [NuGet package](https://www.nuget.org/packages/Microsoft.Samples.Debugging.MdbgEngine) and a [GitHub repo](https://github.com/SymbolSource/Microsoft.Samples.Debugging/tree/master/src) or you can [download is from Microsoft](https://www.microsoft.com/en-us/download/details.aspx?id=2282).
  - However, at the moment is MDBG doesn't seem to work with .NET Core, see [Port MDBG to CoreCLR](https://github.com/dotnet/coreclr/issues/1145) and [ETA for porting mdbg to coreclr](https://github.com/dotnet/coreclr/issues/8999) for some more information.
- [JetBrains 'Rider'](https://blog.jetbrains.com/dotnet/2017/02/23/rider-eap-18-coreclr-debugging-back-windows/) allows .NET Core debugging on Windows
  - Although [there was some controversy](https://blog.jetbrains.com/dotnet/2017/02/15/rider-eap-17-nuget-unit-testing-build-debugging/) due to licensing issues
  - For more info, see [this HackerNews thread](https://news.ycombinator.com/item?id=17323911)

### Memory Dumps

The final area we are going to look at is 'memory dumps', which can be captured from a *live* system and analysed off-line. The .NET runtime has always had good support for [creating 'memory dumps' on Windows](https://msdn.microsoft.com/en-us/library/dn342825.aspx?f=255&MSPPError=-2147217396#BKMK_Collect_memory_snapshots) and now that .NET Core is 'cross-platform', the are also tools available [do the same on other OSes](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/xplat-minidump-generation.md).

One of the issues with 'memory dumps' is that it can be tricky to get hold of the correct, matching versions of the SOS and DAC files. Fortunately Microsoft have just released the [`dotnet symbol` CLI tool](https://github.com/dotnet/symstore/tree/master/src/dotnet-symbol) that:

> can download all the files needed for debugging (symbols, modules, SOS and DAC for the coreclr module given) for any given core dump, minidump or any supported platform's file formats like ELF, MachO, Windows DLLs, PDBs and portable PDBs.

Finally, if you spend any length of time **analysing 'memory dumps'** you really should take a look at the excellent [CLR MD library](https://github.com/Microsoft/clrmd) that Microsoft released a few years ago. I've [previously written about]({{ base }}/2016/09/06/Analysing-.NET-Memory-Dumps-with-CLR-MD/) what you can do with it, but in a nutshell, it allows you to interact with memory dumps via an intuitive C# API, with classes that provide access to the [ClrHeap](https://github.com/Microsoft/clrmd/blob/master/src/Microsoft.Diagnostics.Runtime/ClrHeap.cs#L16), [GC Roots](https://github.com/Microsoft/clrmd/blob/6735e1012d11c244874fa3ba3af6e73edc0da552/src/Microsoft.Diagnostics.Runtime/GCRoot.cs#L105), [CLR Threads](https://github.com/Microsoft/clrmd/blob/master/src/Microsoft.Diagnostics.Runtime/ClrThread.cs#L103), [Stack Frames](https://github.com/Microsoft/clrmd/blob/master/src/Microsoft.Diagnostics.Runtime/ClrThread.cs#L37) and [much more](https://github.com/Microsoft/clrmd/tree/master/src/Samples). In fact, aside from the time needed to implemented the work, CLR MD could [implement *most* (if not all) of the SOS commands](https://github.com/Microsoft/clrmd/issues/33).

But how does it work, from the [announcement post](https://blogs.msdn.microsoft.com/dotnet/2013/05/01/net-crash-dump-and-live-process-inspection/):

> The ClrMD managed library is a wrapper around CLR internal-only debugging APIs. Although those internal-only APIs are very useful for diagnostics, we do not support them as a public, documented release because they are incredibly difficult to use and tightly coupled with other implementation details of the CLR. ClrMD addresses this problem by providing an easy-to-use managed wrapper around these low-level debugging APIs.

By making these APIs available, in an officially supported library, Microsoft have enabled developers to build a [wide range of tools]({{ base }}/2018/06/15/Tools-for-Exploring-.NET-Internals/#tools-based-on-clr-memory-diagnostics-clrmd) on top of CLRMD, which is a great result!

----

**So in summary, the .NET Runtime provides a wide-range of diagnostic, debugging and profiling features that allow a deep-insight into what's going on inside the CLR.**

----

Discuss this post on [HackerNews](https://news.ycombinator.com/item?id=17819352), [/r/programming](https://www.reddit.com/r/programming/comments/994119/monitoring_and_observability_in_the_net_runtime/) or [/r/csharp](https://www.reddit.com/r/csharp/comments/9940cm/monitoring_and_observability_in_the_net_runtime/)

----

# Further Reading

Where appropriate I've included additional links that covers the topics discussed in this post.

**General**

- [Monitoring and Observability](https://medium.com/@copyconstruct/monitoring-and-observability-8417d1952e1c)
- [Monitoring and Observability — What’s the Difference and Why Does It Matter?](https://thenewstack.io/monitoring-and-observability-whats-the-difference-and-why-does-it-matter/)

**ETW Events and PerfView:**

- [ETW - Monitor Anything, Anytime, Anywhere](https://assets.ctfassets.net/9n3x4rtjlya6/6A7ZxhamzKQI8cq0ikgYYO/d6430a29037100f73c235584ddada75f/Dina_Goldshtein_ETW_-_Monitor_Anything.pdf) (pdf) by [Dina Goldshtein](https://twitter.com/dinagozil?lang=en)
- [Make ETW Great Again](https://ruxcon.org.au/assets/2016/slides/ETW_16_RUXCON_NJR_no_notes.pdf) (pdf) 
- [Logging Keystrokes with Event Tracing for Windows (ETW)](https://www.cyberpointllc.com/posts/cp-logging-keystrokes-with-event-tracing-for-windows-etw.html)
- PerfView is based on [Microsoft.Diagnostics.Tracing.TraceEvent](https://github.com/Microsoft/perfview/blob/master/documentation/TraceEvent/TraceEventLibrary.md), which means you can easily write code to collect ETW events yourself, for example ['Observe JIT Events' sample](https://github.com/Microsoft/perfview/blob/master/src/TraceEvent/Samples/21_ObserveJitEvents.cs)
- More info in the [TraceEvent Library Programmers Guide](https://github.com/Microsoft/perfview/blob/master/documentation/TraceEvent/TraceEventProgrammersGuide.md)
- [Performance Tracing on Windows](https://github.com/dotnet/coreclr/blob/master/Documentation/project-docs/windows-performance-tracing.md)
- [CoreClr Event Logging Design](https://github.com/dotnet/coreclr/blob/release/2.1/Documentation/coding-guidelines/EventLogging.md)
- [Bringing .NET application performance analysis to Linux](https://blogs.msdn.microsoft.com/dotnet/2018/10/24/bringing-net-application-performance-analysis-to-linux/) (introduction on the .NET Blog)
- [Bringing .NET application performance analysis to Linux](https://lttng.org/blog/2018/08/28/bringing-dotnet-perf-analysis-to-linux/) (more detailed post on the LTTng blog)

**Profiling API:**

- Read all of [David Broman's CLR Profiling API Blog](https://blogs.msdn.microsoft.com/davbr/), seriously if you want to use the Profiling API, this is the place to start!
- [BOTR - Profiling](https://github.com/dotnet/coreclr/blob/release/2.1/Documentation/botr/profiling.md) - explains what the 'Profiling API' provides, what you can do with it and how to use it.
- [BOTR - Profilability](https://github.com/dotnet/coreclr/blob/release/2.1/Documentation/botr/profilability.md) - discusses what needs to be done within the CLR *ifself* to make profiling possible.
- Interesting presentation [The .NET Profiling API](https://dotnetstammtisch.at/slides/003/The-Profiling-API.pdf) (pdf)
- [Thought(s) on managed code injection and interception](https://yaozhenhua.wordpress.com/2012/05/07/thought-on-managed-code-injection-and-interception/)
- [CLR 4.0 advancements in diagnostics](https://blogs.msdn.microsoft.com/rmbyers/2008/10/30/clr-4-0-advancements-in-diagnostics/)
- [Profiling: How to get GC Metrics in-process](https://github.com/dotnet/coreclr/issues/4382)

**Debugging:**

- Again, if you ware serious about using the Debugging API, you mist read all of [Mike Stall's .NET Debugging Blog](https://blogs.msdn.microsoft.com/jmstall), great stuff, including:
  - [How do Managed Breakpoints work?](https://blogs.msdn.microsoft.com/jmstall/2004/12/28/how-do-managed-breakpoints-work/)
  - [Debugging any .Net language](https://blogs.msdn.microsoft.com/jmstall/2005/02/23/debugging-any-net-language/)
  - [How can I use ICorDebug?](https://blogs.msdn.microsoft.com/jmstall/2004/10/05/how-can-i-use-icordebug/)
  - [You can’t debug yourself](https://blogs.msdn.microsoft.com/jmstall/2005/11/05/you-cant-debug-yourself/)
  - [Tool to get snapshot of managed callstacks](https://blogs.msdn.microsoft.com/jmstall/2005/11/28/tool-to-get-snapshot-of-managed-callstacks/)
- [BOTR Data Access Component (DAC) Notes](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/dac-notes.md)
- [What’s New in CLR 4.5 Debugging API?](http://blogs.microsoft.co.il/pavely/2012/04/03/whats-new-in-clr-45-debugging-api/)
- [Writing a .Net Debugger](https://lowleveldesign.org/2010/10/11/writing-a-net-debugger-part-1-starting-the-debugging-session/), [Part 2](https://lowleveldesign.org/2010/10/22/writing-a-net-debugger-part-2-handling-events-and-creating-wrappers/), [Part 3](https://lowleveldesign.org/2010/11/08/writing-a-net-debugger-part-3-symbol-and-source-files/) and [Part 4](https://lowleveldesign.org/2010/12/01/writing-a-net-debugger-part-4-breakpoints/)
- [Writing an automatic debugger in 15 minutes (yes, a debugger!)](https://tripleemcoder.com/2011/12/10/writing-an-automatic-debugger-in-15-minutes-yes-a-debugger/)
- PR to [add SOS DumpAsync command](https://github.com/dotnet/coreclr/pull/18160)
- [Question: what remaining SOS commands need to be ported to Linux/OS X](https://github.com/dotnet/coreclr/issues/8363)

**Memory Dumps:**

- [Creating and analyzing minidumps in .NET production applications](http://voneinem-windbg.blogspot.com/2007/03/creating-and-analyzing-minidumps-in-net.html)
- [Creating Smaller, But Still Usable, Dumps of .NET Applications](http://blogs.microsoft.co.il/sasha/2015/08/19/minidumper-smaller-dumps-net-applications/) and [More on - MiniDumper: Getting the Right Memory Pages for .NET Analysis](http://blogs.microsoft.co.il/sasha/2015/09/30/more-on-minidumper-getting-the-right-memory-pages-for-net-analysis/)
- [Minidumper – A Better Way to Create Managed Memory Dumps](https://lowleveldesign.org/2018/02/22/minidumper-a-better-way-to-create-managed-memory-dumps/)
- [ClrDump is a set of tools that allow to produce small minidumps of managed applications](http://www.debuginfo.com/tools/clrdump.html)