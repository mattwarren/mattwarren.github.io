---
layout: post
title: Analysing .NET start-up time with Flamegraphs
comments: false
codeproject: false
tags: [Profiling, ETW, JIT-Compiler]
---

Recently I gave a talk at the [NYAN Conference](https://nyanconference.splashthat.com/) called ['From 'dotnet run' to 'hello world'](https://nyanconference.splashthat.com/):

In the talk I demonstrate how you can use [PerfView](https://github.com/microsoft/perfview#perfview-overview) to analyse **where the .NET Runtime is spending it's time during start-up**:

<iframe src="//www.slideshare.net/slideshow/embed_code/key/xU98KRbWFvU2SC?startSlide=26" width="595" height="485" frameborder="0" marginwidth="0" marginheight="0" scrolling="no" style="border:1px solid #CCC; border-width:1px; margin-bottom:5px; max-width: 100%;" allowfullscreen> </iframe> <div style="margin-bottom:5px"> <strong> <a href="//www.slideshare.net/mattwarren/from-dotnet-run-to-hello-world" title="From &#x27;dotnet run&#x27; to &#x27;hello world&#x27;" target="_blank">From &#x27;dotnet run&#x27; to &#x27;hello world&#x27;</a> </strong> from <strong><a href="//www.slideshare.net/mattwarren" target="_blank">Matt Warren</a></strong> </div>

**This post is a step-by-step guide to that demo.**

----

## Code Sample

For this exercise I _delibrately_ only look at what the .NET Runtime is doing during program start-up, so I ensure the minimum amount of *user code* is runing, hence the following 'Hello World':

```csharp
using System;

namespace HelloWorld
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("Hello World!");
            Console.WriteLine("Press <ENTER> to exit");
            Console.ReadLine();
        }
    }
}
```

The `Console.ReadLine()` call is added because I want to ensure the process doesn't exit whilst PerfView is still collecting data. 

## Data Collection

PerfView is a *very* powerful program, but not the most *user-friendly* of tools, so I've put togerther a step-by-step guide:

1. Download and run a [recent version of 'PerfView.exe'](https://github.com/microsoft/perfview/releases/latest)
2. Click 'Run a command' or (Alt-R') and "collect data while the command is running"
3. Ensure that you've entered values for:
   1. "**Command**"
   2. "**Current Dir**"
4. Tick '**Cpu Samples**' if it isn't already selected
5. Set '**Max Collect Sec**' to 15 seconds (because our 'HelloWorld' app never exits, we need to ensure PerfView stops collecting data at some point)
6. Ensure that '**.NET Symbol Collection**' is selected
7. Hit '**Run Command**

[![Collection Options]({{ base }}/images/2020/03/PerfView - Collection Options - annotated.png)]({{ base }}/images/2020/03/PerfView - Collection Options - annotated.png)

If you then inspect the log you can see that it's collecting data, obtaining symbols and then finally writing everything out to a .zip file. Once the process is complete you should see the newly created file in the left-hand pane of the main UI, in this case it's called 'PerfViewData.etl.zip'

## Data Processing

Once you have your '.etl.zip' file, double-click on it and you will see a tree-view with all the available data. Now, select 'CPU Stacks' and you'll be presented with a view like this:

[![Unresolved Symbols]({{ base }}/images/2020/03/PerfView - Unresolved Symbols.png)]({{ base }}/images/2020/03/PerfView - Unresolved Symbols.png)

Notice there's alot of '?' characters in the list, this means that PerfView is not able to work out the method names as it hasn't resolved the necessary symbols for the Runtime dlls. Lets fix that:

1. Open '**CPU Stacks**'
2. In the list, select the '**HelloWorld**' process (PerfView collects data *machine-wide*)
3. In the '**GroupPats**' drop-down, select '[no grouping]'
4. *Optional*, change the '**Symbol Path**' from the default to something else
5. In the '**By name**' tab, hit 'Ctrl+A' to select all the rows
6. Right-click and select '**Lookup Symbols**' (or just hit 'Alt+S')

Now the 'CPU Stacks' view should look something like this:

[![Resolved Symbols]({{ base }}/images/2020/03/PerfView - Resolved Symbols.png)]({{ base }}/images/2020/03/PerfView - Resolved Symbols.png)

Finally, we can get the data we want:

1. Select the '**Flame Graph**' tab
2. Change '**GroupPats**' to one of the following for a better flame graph:
   1. [group module entries]  &#123;%&#125;!=>module $1
   2. [group class entries]   &#123;%!*&#125;.%(=>class $1;&#123;%!\*&#125;::=>class $1
3. Change '**Fold%**' to a higher number, maybe 3%, to get rid of any *thin* bars (any higher and you start to loose information)

[![Flamegraph]({{ base }}/images/2020/03/PerfView - Flamegraph.png)](({{ base }}/images/2020/03/PerfView - Flamegraph.png))

Now, at this point I actually recommend exporting the PerfView data into a format that can be loaded into [https://speedscope.app/](https://speedscope.app/) as it gives you a *much* better experience. To do this click **File** -> **Save View As** and then in the 'Save as type' box select **Speed Scope Format**. Once that's done you can 'browse' that file at [speedscope.app](https://www.speedscope.app/), or if you want you can just take a look at one [I've already created](https://www.speedscope.app/#profileURL=https%3A%2F%2Fmattwarren.org%2Fdata%2F2020%2F03%2Fflamegraph.speedscope.json).

**Note:** If you've never encountered '**flamegraphs**' before, I really recommend reading this excellent explanation by [Julia Evans](https://twitter.com/b0rk):

<blockquote class="twitter-tweet" data-conversation="none"><p lang="en" dir="ltr">perf &amp; flamegraphs <a href="https://t.co/duzWs2hoLT">pic.twitter.com/duzWs2hoLT</a></p>&mdash; 🔎Julia Evans🔍 (@b0rk) <a href="https://twitter.com/b0rk/status/945680809712857090?ref_src=twsrc%5Etfw">December 26, 2017</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

----

## Anaylsis of .NET Runtime Startup

Finally, we can answer our original question:

> Where does the .NET Runtime spend time during start-up?

Here's the data [from the flamegraph](https://www.speedscope.app/#profileURL=https%3A%2F%2Fmattwarren.org%2Fdata%2F2020%2F03%2Fflamegraph.speedscope.json) summarised as text, with links the corresponding functions in the '.NET Core Runtime' source code:

1. Entire Application - **100%** - 233.28ms
2. Everything except `helloworld!wmain` - **21%**
3. `helloworld!wmain` - **79%** - 184.57ms
   1. `hostpolicy!create_hostpolicy_context` - **30%** - 70.92ms [here](https://github.com/dotnet/runtime/blob/9e93d094/src/installer/corehost/cli/hostpolicy/hostpolicy.cpp#L98-L139)
   2. `hostpolicy!create_coreclr` - **22%** - 50.51ms [here](https://github.com/dotnet/runtime/blob/9e93d094/src/installer/corehost/cli/hostpolicy/hostpolicy.cpp#L47-L96)
      1. `coreclr!CorHost2::Start` - **9%** - 20.98ms [here](https://github.com/dotnet/runtime/blob/9e93d094/src/coreclr/src/vm/corhost.cpp#L93-L173)
      2. `coreclr!CorHost2::CreateAppDomain` - **10%** - 23.52ms [here](https://github.com/dotnet/runtime/blob/9e93d094/src/coreclr/src/vm/corhost.cpp#L632-L795)
   3. `hostpolicy!runapp` - **20%** - 46.20ms [here](https://github.com/dotnet/runtime/blob/9e93d094/src/installer/corehost/cli/hostpolicy/hostpolicy.cpp#L269-L276), ends up calling into `Assembly::ExecuteMainMethod` [here](https://github.com/dotnet/runtime/blob/9e93d094/src/coreclr/src/vm/assembly.cpp#L1619-L1693)
      1. `coreclr!RunMain` - **9.9%** - 23.12ms [here](https://github.com/dotnet/runtime/blob/9e93d094/src/coreclr/src/vm/assembly.cpp#L1504-L1566)
      2. `coreclr!RunStartupHooks` - **8.1%** - 19.00ms [here](https://github.com/dotnet/runtime/blob/9e93d094/src/coreclr/src/vm/assembly.cpp#L1604-L1617)
   4. `hostfxr!resolve_frameworks_for_app` - **3.4%** - 7.89ms [here](https://github.com/dotnet/runtime/blob/9e93d094/src/installer/corehost/cli/fxr/fx_resolver.cpp#L504-L529)

So, the main places that the runtime spends time are:

1. **30%** of total time is spent **Launching the runtime**, controlled via the 'host policy', which mostly takes place in `hostpolicy!create_hostpolicy_context` (30% of total time)
2. **22%** of time is spend on **Initialisation of the runtime** itself and the initial (and only) AppDomain it creates, this can be see in `CorHost2::Start` (*native*) and `CorHost2::CreateAppDomain` (*managed*). For more info on this see [The 68 things the CLR does before executing a single line of your code]({{ base }}/2017/02/07/The-68-things-the-CLR-does-before-executing-a-single-line-of-your-code/)
3. **20%** was used **JITting and executing** the `Main` method in our 'Hello World' code sample, this started in `Assembly::ExecuteMainMethod` above.

To confirm the last point, we can return to PerfView and take a look at the 'JIT Stats Summary' it produces. From the main menu, under 'Advanced Group' -> 'JIT Stats' we see that 23.1 ms or 9.1% of the total CPU time was spent JITing:

[![JIT Stats for HelloWorld]({{ base }}/images/2020/03/PerfView - JIT Stats for HelloWorld.png)]({{ base }}/images/2020/03/PerfView - JIT Stats for HelloWorld.png)
