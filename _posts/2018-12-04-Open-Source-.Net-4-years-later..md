---
layout: post
title: Open Source .NET – 4 years later
comments: true
codeproject: false
tags: [.NET, Analytics, Open Source, Roslyn, AspNet]
datavis: true
excerpt: <p>A little over 4 years ago Microsoft announced that they were <a href="http://www.hanselman.com/blog/AnnouncingNET2015NETAsOpenSourceNETOnMacAndLinuxAndVisualStudioCommunity.aspx">open sourcing large parts of the .NET framework</a> and as this slide from <a href="https://www.slideshare.net/jongalloway/net-core-previews-new-features-in-net-core-and-aspnet-core-21-blazor-and-more#8">New Features in .NET Core and ASP.NET Core 2.1</a> shows, the community has been contributing in a significant way:</p>
---

{% raw %}
<link rel='stylesheet' href='/datavis/dotnet-oss.css'>
<script src='/datavis/dotnet-oss.js' type='text/javascript'></script>
{% endraw %}

A little over 4 years ago Microsoft announced that they were [open sourcing large parts of the .NET framework](http://www.hanselman.com/blog/AnnouncingNET2015NETAsOpenSourceNETOnMacAndLinuxAndVisualStudioCommunity.aspx) and as this slide from [New Features in .NET Core and ASP.NET Core 2.1](https://www.slideshare.net/jongalloway/net-core-previews-new-features-in-net-core-and-aspnet-core-21-blazor-and-more#8) shows, the community has been contributing in a significant way:

[![.NET Open Source Success]({{ base }}/images/2018/12/NET Open Source Success.jpg)](https://twitter.com/jongalloway/status/974064785397395456)

**Side-note**: This post forms part of an on-going series, if you want to see how things have changed over time you can check out the previous ones:

- [Open Source .NET – 3 years later]({{ base }}/2017/12/19/Open-Source-.Net-3-years-later/?recommended=1)
- [Open Source .NET – 2 years later]({{ base }}/2016/11/23/open-source-net-2-years-later/?recommended=1)
- [Open Source .NET – 1 year later - Now with ASP.NET]({{ base }}/2016/01/15/open-source-net-1-year-later-now-with-aspnet/?recommended=1)
- [Open Source .NET – 1 year later]({{ base }}/2015/12/08/open-source-net-1-year-later/?recommended=1)

----

## Runtime Changes

Before I look at the numbers, I just want to take a moment to look at the **significant** runtime changes that have taken place over the last 4 years. Partly because I really like looking at the ['Internals' of CoreCLR]({{ base }}/tags/#Internals), but also because the runtime is the one repository that makes all the others possible, they rely on it!

To give some context, here's the slides from a presentation I did called ['From 'dotnet run' to 'hello world'](https://www.updateconference.net/en/session/from--dotnet-run--to--hello-world--). If you flick through them you'll see what components make up the CoreCLR code-base and what they do to make your application run.

<iframe src="//www.slideshare.net/slideshow/embed_code/key/xU98KRbWFvU2SC?startSlide=8" width="595" height="485" frameborder="0" marginwidth="0" marginheight="0" scrolling="no" style="border:1px solid #CCC; border-width:1px; margin-bottom:5px; max-width: 100%;" allowfullscreen> </iframe> <div style="margin-bottom:5px"> <strong> <a href="//www.slideshare.net/mattwarren/from-dotnet-run-to-hello-world" title="From &#x27;dotnet run&#x27; to &#x27;hello world&#x27;" target="_blank">From &#x27;dotnet run&#x27; to &#x27;hello world&#x27;</a> </strong> from <strong><a href="//www.slideshare.net/mattwarren" target="_blank">Matt Warren</a></strong> </div>

So, after a bit of digging through the [19,059 commits](https://github.com/dotnet/coreclr), [5,790 issues](https://github.com/dotnet/coreclr/issues) and [the 8 projects](https://github.com/dotnet/coreclr/projects), here's the list of **significant** changes in the **.NET Core Runtime (CoreCLR)** over the last few years (if I've missed any out, please let me know!!):

- **`Span<T>`** ([more info](https://msdn.microsoft.com/en-us/magazine/mt814808.aspx?f=255&MSPPError=-2147217396))
  - [Span&#x3C;T&#x3E;](https://github.com/dotnet/coreclr/issues/5851) ('umbrella' issue for the whole feature)
    - Includes change to multiple parts of the runtime, the VM, JIT and GC
  - [Will .NET Core 2.1's Span-based APIs be made available on the .NET Framework? If so, when?](https://github.com/Microsoft/dotnet/issues/770)
  - Also needed **CoreFX** work such as [Add initial Span/Buffer-based APIs across corefx](https://github.com/dotnet/corefx/issues/21281) and [String-like extension methods to ReadOnlySpan&#x3C;char&#x3E; Epic](https://github.com/dotnet/corefx/issues/21395) and **Compiler** changes, e.g. [Compile time enforcement of safety for ref-like types](https://github.com/dotnet/csharplang/blob/master/proposals/csharp-7.2/span-safety.md)
- **`ref-like` like types** (to support `Span<T>`)
  - ['Generalized ref-like types in source code.'](https://github.com/dotnet/csharplang/blob/master/proposals/csharp-7.2/span-safety.md#generalized-ref-like-types-in-source-code)
  - [Detect ByRefLike types using attribute](https://github.com/dotnet/coreclr/pull/15745)
  - [Interpretation of ByRefLikeAttribute in .NET Core 2.1 is a breaking change and a standard violation](https://github.com/dotnet/coreclr/issues/18280)
  - [Search for 'IsByRefLike' in the CoreCLR source code](https://github.com/dotnet/coreclr/search?utf8=%E2%9C%93&q=IsByRefLike&type=)
- **Tiered Compilation** ([more info](https://blogs.msdn.microsoft.com/dotnet/2018/08/02/tiered-compilation-preview-in-net-core-2-1/))
  - [Tiered Compilation step 1](https://github.com/dotnet/coreclr/search?o=asc&p=3&q=tiered+compilation&s=author-date&type=Commits), [profiler changes for tiered compilation](https://github.com/dotnet/coreclr/pull/14612), [Fix x86 steady state tiered compilation performance](https://github.com/dotnet/coreclr/pull/17476)
  - Also see the more general ['Code Versioning' design doc](https://github.com/dotnet/coreclr/blob/master/Documentation/design-docs/code-versioning.md) and [Enable Tiered Compilation by default](https://github.com/dotnet/coreclr/pull/19525)
- **Cross-platform** (Unix, OS X, etc, see list of all ['os-xxx' labels](https://github.com/dotnet/coreclr/labels?utf8=%E2%9C%93&q=os-))
  - [Support building mscorlib on UNIX systems](https://github.com/dotnet/coreclr/issues/170)
  - [Implement stack unwinding and exceptions for Linux](https://github.com/dotnet/coreclr/issues/177)
  - [Inital build support for FreeBSD](https://github.com/dotnet/coreclr/pull/453) and [Complete FreeBSD bringup](https://github.com/dotnet/coreclr/pull/827)
  - [Initial Mac OSX Support (PR)](https://github.com/dotnet/coreclr/pull/117) and the [rest of the work](https://github.com/dotnet/coreclr/pulls?utf8=%E2%9C%93&q=is%3Apr+author%3Akangaroo+is%3Aclosed+OSX)!!
  - [Building and Running .NET's CoreCLR on OS X](https://praeclarum.org/2015/02/09/building-and-running-nets-coreclr-on-os-x.html)
- **New CPU Architectures**
  - [ARM64 Project](https://github.com/dotnet/coreclr/projects/2)
  - [ARM32 Project](https://github.com/dotnet/coreclr/projects/4)
  - List of all issues [labelled 'arch-xxx'](https://github.com/dotnet/coreclr/labels?utf8=%E2%9C%93&q=arch-)
- **Hardware Intrinsics** ([project](https://github.com/dotnet/coreclr/projects/7))
  - [Design Document](https://github.com/dotnet/designs/blob/master/accepted/platform-intrinsics.md)
  - [Using .NET Hardware Intrinsics API to accelerate machine learning scenarios](https://blogs.msdn.microsoft.com/dotnet/2018/10/10/using-net-hardware-intrinsics-api-to-accelerate-machine-learning-scenarios/) contains a nice overview of the implementation
- **Default Interface Methods** ([project](https://github.com/dotnet/coreclr/projects/6))
  - Runtime support for the [default interface methods](https://github.com/dotnet/csharplang/blob/0a4aa03e3767805b85b606f8e58559f089bc9337/proposals/default-interface-methods.md) C# language feature.
- **Performance Monitoring** and **Diagnostics** ([project](https://github.com/dotnet/coreclr/projects/5))
  - [Cross-Platform Performance Monitoring Design](https://github.com/dotnet/designs/blob/master/accepted/cross-platform-performance-monitoring.md) and [NET Cross-Plat Performance and Eventing Design](https://github.com/dotnet/coreclr/blob/master/Documentation/coding-guidelines/cross-platform-performance-and-eventing.md)
  - [Enable Lttng Logging for CoreClr](https://github.com/dotnet/coreclr/pull/1598)
  - [Bringing .NET application performance analysis to Linux](https://lttng.org/blog/2018/08/28/bringing-dotnet-perf-analysis-to-linux/)
- **Ready-to-Run Images**
  - [ReadyToRun Overview](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/readytorun-overview.md)
  - [Bing.com runs on .NET Core 2.1!](https://blogs.msdn.microsoft.com/dotnet/2018/08/20/bing-com-runs-on-net-core-2-1/) (section on 'ReadyToRun Images')
- **LocalGC** ([project](https://github.com/dotnet/coreclr/projects/3))
  - See in in action in [Zero Garbage Collector for .NET Core](http://tooslowexception.com/tag/garbagecollector/) and the follow-up [Zero Garbage Collector for .NET Core 2.1 and ASP.NET Core 2.1](http://tooslowexception.com/zero-garbage-collector-for-net-core-2-1-and-asp-net-core-2-1/)
- **Unloadability** ([project](https://github.com/dotnet/coreclr/projects/9))
  - Support for unloading [AssemblyLoadContext](https://github.com/dotnet/coreclr/blob/master/Documentation/design-docs/assemblyloadcontext.md) and all assemblies loaded into it.

So there's been quite a few large, fundamental changes to the runtime since it's been open-sourced.

----

## Repository activity over time

But onto the data, first we are going to look at an overview of the **level of activity in each repo**, by analysing the total number of '**Issues**' (created) or '**Pull Requests**' (closed) per month. ([Sparklines FTW!!](http://www.edwardtufte.com/bboard/q-and-a-fetch-msg?msg_id=0001OR)). If you are interested in *how* I got the data, see the previous post [because the process is the same]({{ base }}/2016/11/23/open-source-net-2-years-later#methodology---community-v-microsoft).

**Note:** Numbers in <span style="color:rgb(0,0,0);font-weight:bold;">black</span> are from the most recent month, with the <span style="color:#d62728;font-weight:bold;">red</span> dot showing the lowest and the <span style="color:#2ca02c;font-weight:bold;">green</span> dot the highest previous value. You can toggle between **Issues** and **Pull Requests** by clicking on the buttons, hover over individual sparklines to get a tooltip showing the per/month values and click on the project name to take you to the GitHub page for that repository.

{% raw %}
<section class="press" align="center">
  <button id="btnIssues" class="active">Issues</button>
  <button id="btnPRs">Pull Requests</button>
</section>

<div id="textbox" class="rChartHeader">
  <!-- The Start/End dates are setup dynamically, once the data is loaded -->
  <p id="dataStartDate" class="alignleft"></p>
  <p id="dataEndDate" class="alignright"></p>
</div>
<div style="clear: both;"></div>

<!-- All the sparklines are added to this div -->
<div id='sparkLines' class="rChart nvd3">
</div>
{% endraw %}

This data gives a good indication of how healthy different repos are, are they growing over time, or staying the same. You can also see the different levels of activity each repo has and how they compare to other ones.

Whilst it's clear that [Visual Studio Code](https://github.com/microsoft/vscode) is way ahead of all the other repos (in '# of Issues'), it's interesting to see that some of the .NET-only ones are still pretty large, notably CoreFX (base-class libraries),  Roslyn (compiler) and CoreCLR (runtime).

----

## Overall Participation - Community v. Microsoft

Next will will look at the **total participation** from the last 4 years, i.e. **November 2014** to **November 2018**. All *Pull Requests* and *Issues* are treated equally, so a large PR counts the same as one that fixes a speling mistake. Whilst this isn't ideal it's the simplest way to get an idea of the **Microsoft/Community split**. In addition, *Community* does include people paid by other companies to work on .NET Projects, for instance [Samsung Engineers](https://github.com/dotnet/coreclr/search?q=Samsung.com&unscoped_q=Samsung.com&type=Commits).

**Note:** You can hover over the bars to get the actual numbers, rather than percentages.

{% raw %}
<body>
  <div class="g-chart-issues">
    <span style="font-weight:bold;font-size:large;"> Issues: </span>
    <span style="color:#9ecae1;font-weight:bold;font-size:large;margin-left:5px;"> Microsoft </span>
    <span style="color:#3182bd;font-weight:bold;font-size:large;margin-left:5px;"> Community </span>
  </div>
  <div class="g-chart-pull-requests">
    <span style="font-weight:bold;font-size:large;"> Pull Requests: </span>
    <span style="color:#a1d99b;font-weight:bold;font-size:large;margin-left:5px;"> Microsoft </span>
    <span style="color:#31a354;font-weight:bold;font-size:large;margin-left:5px;"> Community </span>
  </div>
</body>
{% endraw %}

----

## Participation over time - Community v. Microsoft

Finally we can see the **'per-month'** data from the last 4 years, i.e. **November 2014** to **November 2018**.

**Note**: You can inspect different repos by selecting them from the pull-down list, but be aware that the y-axis on the graphs are re-scaled, so the maximum value will change each time.

{% raw %}
<div id='issuesGraph'>
  <span style="font-weight:bold;font-size:larger;margin-left:30px;"> Issues: </span>
  <span style="color:#9ecae1;font-weight:bold;font-size:larger;margin-left:5px;"> Microsoft </span>
  <span style="color:#3182bd;font-weight:bold;font-size:larger;margin-left:5px;"> Community </span>
</div>

<div id='pullRequestsGraph'>
  <span style="font-weight:bold;font-size:larger;margin-left:30px;"> Pull Requests: </span>
  <span style="color:#a1d99b;font-weight:bold;font-size:larger;margin-left:5px;"> Microsoft </span>
  <span style="color:#31a354;font-weight:bold;font-size:larger;margin-left:5px;"> Community </span>
</div>
{% endraw %}

----

## Summary

It's clear that the community continues to be invested in the .NET-related, Open Source repositories, contributing significantly and for a sustained period of time. I think this is good for *all .NET developers*, whether you contribute to OSS or not, having .NET be a **thriving, Open Source product** has many benefits!
