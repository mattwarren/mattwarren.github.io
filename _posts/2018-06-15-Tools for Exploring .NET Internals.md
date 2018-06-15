---
layout: post
title: Tools for Exploring .NET Internals
comments: true
codeproject: false
---

Whether you want to look at what your code is doing '*under-the-hood*' or you're trying to see what the '*internals*' of the CLR look like, there is a whole range of tools that can help you out.

To give '*credit where credit is due*', this post is [based on a tweet](https://twitter.com/matthewwarren/status/973940550473797633), so thanks to everyone who contributed to the list and if I've **missed out any tools, please let me know in the comments below**.

----

While you're here, I've also written other posts that look at the 'internals' of the .NET Runtime:

- [Exploring the Internals of the .NET Runtime]({{ base }}/2018/03/23/Exploring-the-internals-of-the-.NET-Runtime/?recommended=1) (a 'how-to' guide)
- [Resources for Learning about .NET Internals]({{ base }}/2018/01/22/Resources-for-Learning-about-.NET-Internals/?recommended=1) (other blogs that cover 'internals')

----

## Honourable Mentions

Firstly I'll start by mentioning that [Visual Studio has a great debugger](https://msdn.microsoft.com/en-us/library/sc65sadd.aspx?f=255&MSPPError=-2147217396) and [so does VSCode](https://code.visualstudio.com/docs/editor/debugging). Also there are lots of very good (commercial) [.NET Profilers](https://stackoverflow.com/questions/3927/what-are-some-good-net-profilers) and [Application Monitoring Tools](https://www.quora.com/What-is-the-best-NET-Application-Server-Monitoring-Tool) available that you should also take a look at.

However, the rest of the post is going to look at some more **single-use tools** that give a **even deeper insight** into what is going on. As a added bonus they're all '**open-source**', so you can take a look at the code and see how they work!!

### [PerfView](https://github.com/Microsoft/perfview) by [Vance Morrison](https://blogs.msdn.microsoft.com/vancem/)

PerfView is simply an excellent tool and is the one that I've used most over the years. It uses ['Event Tracing for Windows' (ETW) Events](https://msdn.microsoft.com/en-us/library/windows/desktop/bb968803%28v=vs.85%29.aspx?f=255&MSPPError=-2147217396) to provide a **deep insight into what the CLR is doing**, as well as allowing you to **profile Memory and CPU usage**. It does have a fairly steep learning curve, but there are some [nice tutorials to help you along the way](https://channel9.msdn.com/Series/PerfView-Tutorial) and it's absolutely worth the time and effort.

Also, if you need more proof of how useful it is, Microsoft Engineers themselves use it and many of the recent [performance improvements in MSBuild](https://blogs.msdn.microsoft.com/dotnet/2018/02/02/net-core-2-1-roadmap/#user-content-build-time-performance) were carried out after using [PerfView to find the bottlenecks](https://github.com/Microsoft/msbuild/search?q=PerfView&type=Issues).

PerfView is built on-top of the [Microsoft.Diagnostics.Tracing.TraceEvent library](https://www.nuget.org/packages/Microsoft.Diagnostics.Tracing.TraceEvent/) which you can use in your own tools. In addition, since it's been open-sourced the community has contributed and it has gained some really nice features, [including flame-graphs](https://github.com/Microsoft/perfview/pull/502):

[![PerfView Flamegraphs]({{ base }}/images/2018/06/PerfView Flamegraphs.png)]({{ base }}/images/2018/06/PerfView Flamegraphs.png)

(**Click for larger version**)

### [SharpLab](https://sharplab.io/) by [Andrey Shchekin](https://twitter.com/ashmind)

SharpLab started out as a tool for inspecting the IL code emitted by the Roslyn compiler, but has now grown [into much more](https://github.com/ashmind/SharpLab):

> SharpLab is a .NET code playground that shows intermediate steps and results of code compilation.
Some language features are thin wrappers on top of other features -- e.g. `using()` becomes `try/catch`.
SharpLab allows you to see the code as compiler sees it, and get a better understanding of .NET languages.

If supports C#, Visual Basic and F#, but most impressive are the 'Decompilation/Disassembly' features:

> There are currently four targets for decompilation/disassembly:
> 
> 1. C#
> 2. Visual Basic
> 3. IL
> 4. JIT Asm (Native Asm Code)

That's right, it will output the [assembly code](EYLgZgpghgLgrgJwgZwLQBEJinANjASQDsYIFsBjCAgWwAdcIaITYBLAeyIBoYQpkNAD4ABAAwACEQEYA3AFgAUCIDMUgEwSAwhIDeSiYalqRAFgkBZABQBKPQaOOAblAQTSyGBIC8EgKwAdGIKio6OMgCcVh4wNiGOAL5KCUA) that the .NET JIT generates from your C#:

![SharpLab - Assembly Output]({{ base }}/images/2018/06/SharpLab - Assembly Output.png)

### [Object Layout Inspector](https://github.com/SergeyTeplyakov/ObjectLayoutInspector) by [Sergey Teplyakov](https://twitter.com/STeplyakov)

This tool gives you an insight into the memory layout of your .NET objects, i.e. it will show you how the JITter has **decided to arrange the fields** within your `class` or `struct`. This can be useful when writing high-performance code and it's helpful to have a tool that does it for us because doing it manually is tricky:

> There is no official documentation about fields layout because the CLR authors reserved the right to change it in the future. But knowledge about the layout can be helpful if you're curious or if you're working on a performance critical application.
> 
> How can we inspect the layout? We can look at a raw memory in Visual Studio or use `!dumpobj` command in [SOS Debugging Extension](https://docs.microsoft.com/en-us/dotnet/framework/tools/sos-dll-sos-debugging-extension). These approaches are tedious and boring, so we'll try to write a tool that will print an object layout at runtime.

From the example in the [GitHub repo](https://github.com/SergeyTeplyakov/ObjectLayoutInspector#inspecting-a-value-type-layout-at-runtime), if you use `TypeLayout.Print<NotAlignedStruct>()` with code like this:

``` cs
public struct NotAlignedStruct
{
    public byte m_byte1;
    public int m_int;

    public byte m_byte2;
    public short m_short;
}
```

You'll get the following output, showing exactly how the CLR will layout the `struct` in memory, based on it's padding and optimization rules.

```
Size: 12. Paddings: 4 (%33 of empty space)
|================================|
|     0: Byte m_byte1 (1 byte)   |
|--------------------------------|
|   1-3: padding (3 bytes)       |
|--------------------------------|
|   4-7: Int32 m_int (4 bytes)   |
|--------------------------------|
|     8: Byte m_byte2 (1 byte)   |
|--------------------------------|
|     9: padding (1 byte)        |
|--------------------------------|
| 10-11: Int16 m_short (2 bytes) |
|================================|
```

### [The Ultimate .NET Experiment (TUNE)](http://tooslowexception.com/the-ultimate-net-experiment-project/) by [Konrad Kokosa](https://twitter.com/konradkokosa)

TUNE is a really intriguing tool, as it says on the [GitHub page](https://github.com/kkokosa/Tune), it's purpose is to help you

> ... learn .NET internals and performance tuning by experiments with C# code.

You can find out more information about what it does [in this blog post](http://tooslowexception.com/the-ultimate-net-experiment-project/), but at a high-level it [works like this](https://github.com/kkokosa/Tune):

> * write a sample, valid C# script which contains at least one class with public method taking a single string parameter. It will be executed by hitting Run button. This script can contain as many additional methods and classes as you wish. Just remember that first public method from the first public class will be executed (with single parameter taken from the input box below the script). ...
> * after clicking Run button, the script will be compiled and executed. Additionally, it will be **decompiled both to IL (Intermediate Language) and assembly code** in the corresponding tabs.
> * all the time Tune is running (including time during script execution) a graph with GC data is being drawn. It shows information about **generation sizes and GC occurrences** (illustrated as vertical lines with the number below indicating which generation has been triggered).

And looks like this:

[![TUNE Screenshot]({{ base }}/images/2018/06/TUNE Screenshot.png)]({{ base }}/images/2018/06/TUNE Screenshot.png)

(**Click for larger version**)

----

## Tools based on CLR Memory Diagnostics (ClrMD)

Finally, we're going to look at a particular category of tools. Since .NET came out you've always been able to use [WinDBG](https://docs.microsoft.com/en-us/windows-hardware/drivers/debugger/getting-started-with-windbg) and the [SOS Debugging Extension](https://docs.microsoft.com/en-us/dotnet/framework/tools/sos-dll-sos-debugging-extension) to get deep into the .NET runtime. However it's not always the easiest tool to **get started with** and as this tweet says, it's not always the most **productive** way to do things:

<blockquote class="twitter-tweet" data-lang="en"><p lang="en" dir="ltr">Besides how complex it is, the idea is to build better abstractions. Raw debugging at the low level is just usually too unproductive. That to me is the promise of ClrMD, that it lets us build specific extensions to extract quickly the right info</p>&mdash; Tomas Restrepo (@tomasrestrepo) <a href="https://twitter.com/tomasrestrepo/status/973924168365498370?ref_src=twsrc%5Etfw">March 14, 2018</a></blockquote>
<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

Fortunately Microsoft made the [ClrMD library available](http://mattwarren.org/2016/09/06/Analysing-.NET-Memory-Dumps-with-CLR-MD/) (a.k.a [Microsoft.Diagnostics.Runtime](https://www.nuget.org/packages/Microsoft.Diagnostics.Runtime)), so now anyone can write a tool that analyses **memory dumps** of .NET programs.

I wanted to pull together a list of all the existing tools, so I enlisted [twitter to help](https://twitter.com/matthewwarren/status/973940550473797633). **Note to self**: careful what you tweet, the WinDBG Product Manager might read your tweets and [get a bit upset](https://twitter.com/aluhrs13/status/973948038380109824)!!

<blockquote class="twitter-tweet" data-lang="en"><p lang="en" dir="ltr">Well this just hurts my feelings :(</p>&mdash; Andy Luhrs (@aluhrs13) <a href="https://twitter.com/aluhrs13/status/973948038380109824?ref_src=twsrc%5Etfw">March 14, 2018</a></blockquote>
<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

Most of these tools are based on ClrMD because it's the easiest way to do things, however you can use the [underlying COM interfaces directly](https://twitter.com/goldshtn/status/973941389791809540) if you want. Also, it's worth pointing out that any tool based on ClrMD is **not cross-platform**, because [ClrMD itself is Windows-only](https://twitter.com/goldshtn/status/973942794296406017). For cross-platform options see [Analyzing a .NET Core Core Dump on Linux](http://blogs.microsoft.co.il/sasha/2017/02/26/analyzing-a-net-core-core-dump-on-linux/)

Finally, in the interest of balance, there have been lots of recent [improvements to WinDBG](https://blogs.msdn.microsoft.com/windbg/2017/08/28/new-windbg-available-in-preview/) and because it's extensible there have been various efforts to add functionality to it:

- [Extending the new WinDbg, Part 1 – Buttons and commands](http://labs.criteo.com/2017/09/extending-new-windbg-part-1-buttons-commands/)
- [Extending the new WinDbg, Part 2 – Tool windows and command output](http://labs.criteo.com/2018/01/extending-new-windbg-part-2-tool-windows-command-output/)
- [WinDBG extension + UI tool extensions](https://github.com/chrisnas/DebuggingExtensions) and [here](https://github.com/kevingosse/windbg-extensions)
- [NetExt](https://github.com/rodneyviana/netext) a WinDBG application that [makes .NET debugging much easier](https://blogs.msdn.microsoft.com/rodneyviana/2015/03/10/getting-started-with-netext/) as compared to the current options: sos or psscor, also see [this InfoQ article](https://www.infoq.com/news/2013/11/netext)

**Having said all that, onto the list**:

* [SuperDump](https://www.slideshare.net/ChristophNeumller/large-scale-crash-dump-analysis-with-superdump) ([GitHub](https://github.com/Dynatrace/superdump))
  - A service for automated crash-dump analysis ([presentation](https://www.slideshare.net/ChristophNeumller/large-scale-crash-dump-analysis-with-superdump))
* [msos](https://github.com/goldshtn/msos/wiki) ([GitHub](https://github.com/goldshtn/msos))
  - Command-line environment a-la WinDbg for executing SOS commands without having SOS available.
* [MemoScope.Net](https://github.com/fremag/MemoScope.Net/wiki) ([GitHub](https://github.com/fremag/MemoScope.Net))
  - A tool to analyze .Net process memory Can dump an application's memory in a file and read it later.
  - The dump file contains all data (objects) and threads (state, stack, call stack). MemoScope.Net will analyze the data and help you to find memory leaks and deadlocks
* [dnSpy](https://github.com/0xd4d/dnSpy#dnspy) ([GitHub](https://github.com/0xd4d/dnSpy))
  - .NET debugger and assembly editor
  - You can use it to edit and debug assemblies even if you don't have any source code available!!
* [MemAnalyzer](https://aloiskraus.wordpress.com/2017/08/17/memanalyzer-v2-5-released/) ([GitHub](https://github.com/Alois-xx/MemAnalyzer))
  - is a command line memory analysis tool for managed code. 
  - Can show which objects use most space on the managed heap just like `!DumpHeap` from Windbg without the need to install and attach a debugger.
* [DumpMiner](https://mycodingplace.wordpress.com/2016/11/24/dumpminer-ui-tool-for-playing-with-clrmd/) ([GitHub](https://github.com/dudikeleti/DumpMiner))
  - UI tool for playing with ClrMD, with more features [coming soon](https://twitter.com/dudi_ke/status/973930633935409153)
* [Trace CLI](http://devops.lol/tracecli-a-production-debugging-and-tracing-tool/) ([GitHub](https://github.com/ruurdk/TraceCLI/))
  - A production debugging and tracing tool
* [Shed](https://github.com/enkomio/shed) ([GitHub](https://github.com/enkomio/shed))
  - Shed is an application that allow to inspect the .NET runtime of a program in order to extract useful information. It can be used to inspect malicious applications in order to have a first general overview of which information are stored once that the malware is executed. Shed is able to:
    - Extract all objects stored in the managed heap
    - Print strings stored in memory
    - Save the snapshot of the heap in a JSON format for post-processing
    - Dump all modules that are loaded in memory

You can also find many other tools that [make use of ClrMD](https://github.com/search?p=2&q=CLRMD&type=Repositories&utf8=%E2%9C%93), it was a very good move by Microsoft to make it available.

----

## Other Tools

A few other tools that are also worth mentioning:

* [DebugDiag](https://support.microsoft.com/en-gb/help/2895198/debug-diagnostics-tool-v2-0-is-now-available)
  - The DebugDiag tool is designed to assist in troubleshooting issues such as hangs, slow performance, memory leaks or memory fragmentation, and crashes in any user-mode process (now with 'CLRMD Integration')
* [SOSEX](http://www.stevestechspot.com/SOSEXANewDebuggingExtensionForManagedCode.aspx) (might not be [developed any more](https://twitter.com/tomasrestrepo/status/974049014244171776))
  - ... a debugging extension for managed code that begins to alleviate some of my frustrations with SOS
* [VMMap](https://docs.microsoft.com/en-us/sysinternals/downloads/vmmap) from Sysinternals
  - VMMap is a process virtual and physical memory analysis utility.
  - I've previously used it to look at [Memory Usage *Inside* the CLR]({{ base }}//2017/07/10/Memory-Usage-Inside-the-CLR/)
  