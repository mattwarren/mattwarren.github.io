---
layout: post
title: Open Source .NET – 3 years later
comments: true,
codeproject: false,
tags: [.NET, Analytics, Open Source, Roslyn, AspNet]
datavis: true
excerpt: <p>A little over 3 years ago Microsoft announced that they were <a href="http://www.hanselman.com/blog/AnnouncingNET2015NETAsOpenSourceNETOnMacAndLinuxAndVisualStudioCommunity.aspx">open sourcing large parts of the .NET framework</a> and as <a href="https://twitter.com/shanselman">Scott Hanselman</a> said in his <a href="https://channel9.msdn.com/Events/Connect/2016/Keynotes-Scott-Guthrie-and-Scott-Hanselman">Connect 2016 keynote</a>, the community has been contributing in a significant way:</p>
---

{% raw %}
<link rel='stylesheet' href='/datavis/dotnet-oss.css'>
<script src='/datavis/dotnet-oss.js' type='text/javascript'></script>
{% endraw %}

A little over 3 years ago Microsoft announced that they were [open sourcing large parts of the .NET framework](http://www.hanselman.com/blog/AnnouncingNET2015NETAsOpenSourceNETOnMacAndLinuxAndVisualStudioCommunity.aspx) and as [Scott Hanselman](https://twitter.com/shanselman) said in his [Connect 2016 keynote](https://channel9.msdn.com/Events/Connect/2016/Keynotes-Scott-Guthrie-and-Scott-Hanselman), the community has been contributing in a significant way:

[![Over 60% of the contribution to .NET Core come from the community]({{ base }}/images/2016/11/Over 60 of the contributions to dotnetcore come from the community.jpg)](https://twitter.com/poweredbyaltnet/status/798942478195970048)

This post forms part of an on-going series, if you want to see how things have changed over time you can check out the previous ones:

- [Open Source .NET – 2 years later]({{ base }}/2016/11/23/open-source-net-2-years-later/?recommended=1)
- [Open Source .NET – 1 year later - Now with ASP.NET]({{ base }}/open-source-net-1-year-later-now-with-aspnet/?recommended=1)
- [Open Source .NET – 1 year later]({{ base }}/2015/12/08/open-source-net-1-year-later/?recommended=1)

In addition, I've recently done a talk [covering this subject]({{ base }}/2017/11/14/Microsoft-and-Open-Source-a-Brave-New-World-CORESTART/), the slides are below:

<iframe src="//www.slideshare.net/slideshow/embed_code/key/bSYyRobLw3jMLq" width="595" height="485" frameborder="0" marginwidth="0" marginheight="0" scrolling="no" style="border:1px solid #CCC; border-width:1px; margin-bottom:5px; max-width: 100%;" allowfullscreen> </iframe> <div style="margin-bottom:5px"> <strong> <a href="//www.slideshare.net/mattwarren/microsoft-open-source-a-brave-new-world-corestart-20" title="Microsoft &amp; open source a &#x27;brave new world&#x27; - CORESTART 2.0" target="_blank">Microsoft &amp; open source a &#x27;brave new world&#x27; - CORESTART 2.0</a> </strong> from <strong><a href="https://www.slideshare.net/mattwarren" target="_blank">Matt Warren</a></strong> </div>

----

### Historical Perspective

Now that we are 3 years down the line, it's interesting to go back and see what the aims were when it all started. If you want to know more about this, I recommend watching the 2 Channel 9 videos below, made by the Microsoft Engineers involved in the process:

- [.NET Internals 2015-02-25: Open Source](https://channel9.msdn.com/Blogs/dotnet/NET-Foundations-2015-02-25)
- [.NET Internals 2015-03-04: .NET Core & Cross Platform](https://channel9.msdn.com/Blogs/dotnet/NET-Foundations-2015-03-04)

It hasn't always been plain sailing, it's fair to say that there have been a few bumps along the way (I guess that's what happens if you get to see ["how the sausage gets made"](https://english.stackexchange.com/questions/120739/a-peek-into-the-sausage-factory)), but I think that we've ended up in a good place.

During the past 3 years there have been a few notable events that I think are worth mentioning:

- Samsung developers have made [significant contributions to the CoreCLR source code](https://github.com/dotnet/coreclr/issues/8496#issuecomment-351463875), to support their Tizen OS
- Microsoft really are developing 'out in the open', you can see this by how often [GitHub issues are referenced](https://github.com/dotnet/coreclr/search?utf8=%E2%9C%93&q=%22https%3A%2F%2Fgithub.com%2Fdotnet%2Fcoreclr%22+language%3AC%2B%2B+language%3AC%23&type=Code) in the source code
- We saw the [new Span&lt;T&gt; apis](https://msdn.microsoft.com/en-us/magazine/mt814808) move their way through the various repos, [CoreFXLabs](https://github.com/dotnet/corefxlab/search?q=Span&type=Commits&utf8=%E2%9C%93) -> [CoreCLR](https://github.com/dotnet/coreclr/search?q=Span&type=Commits&utf8=%E2%9C%93) -> [Roslyn](https://github.com/dotnet/roslyn/search?q=Span&type=Commits&utf8=%E2%9C%93) -> [CoreFX](https://github.com/dotnet/corefx/search?q=Span&type=Commits&utf8=%E2%9C%93) before turning into a complete feature!
- There's been deeper integration between [.NET Core and Mono](https://github.com/dotnet/corefx/issues/25379)
- Significant Performance Improvements [have been made in .NET Core](https://blogs.msdn.microsoft.com/dotnet/2017/06/07/performance-improvements-in-net-core/)
- .NET Core and .NET Desktop have [now sufficiently diverged](https://github.com/dotnet/coreclr/pull/9044#issuecomment-274543630) (even though they still share code, such as JIT, GC)
- Microsoft have made a concerted effort to ensure that all their Open Source code can be built [just using other Open Source code](https://github.com/dotnet/coreclr/issues/14345)
- The [Local GC](https://github.com/dotnet/coreclr/projects/3) effort has been started, aiming to 'decouple the GC from the rest of the runtime'
- .NET will be finally getting [Tiered Compilation]({{ base }}/2017/12/15/How-does-.NET-JIT-a-method-and-Tiered-Compilation/)

----

### Repository activity over time

But onto the data, first we are going to look at an overview of the **level of activity in each repo**, by looking at the total number of '**Issues**' (created) or '**Pull Requests**' (closed) per month. ([yay sparklines FTW!!](http://www.edwardtufte.com/bboard/q-and-a-fetch-msg?msg_id=0001OR)). If you are interested in *how* I got the data, see the previous post [because the process is the same]({{ base }}/2016/11/23/open-source-net-2-years-later#methodology---community-v-microsoft).

**Note:** Numbers in <span style="color:rgb(0,0,0);font-weight:bold;">black</span> are from the most recent month, with the <span style="color:#d62728;font-weight:bold;">red</span> dot showing the lowest and the <span style="color:#2ca02c;font-weight:bold;">green</span> dot the highest previous value. You can toggle between **Issues** and **Pull Requests** by clicking on the buttons, hover over individual sparklines to get a tooltip showing the per/month values and click on the project name to take you to the GitHub page for that repository.

{% raw %}
<section class="press" align="center">
<!-- <section class="gradient" align="center"> -->
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

Whilst it's clear that [Visual Studio Code](https://github.com/microsoft/vscode) is way ahead of all the other repos, it's interesting to see that some of the .NET-only ones are still pretty large, notably CoreFX and Roslyn.

----

### Overall Participation - Community v. Microsoft

Next will will look at the **total participation from the last 3 years**, i.e. **November 2014** to **November 2017**. All Pull Requests are Issues are treated equally, so a large PR counts the same as one that fixes a spelling mistake. Whilst this isn't ideal it's the simplest way to get an idea of the **Microsoft/Community split**.

**Note:** You can hover over the bars to get the actual numbers, rather than percentages.

{% raw %}
<body>
  <!-- TODO do this in css styles, not inline!! -->
  <div class="g-chart-issues">
    <span style="font-weight:bold;font-size:large;margin-left:150px;"> Issues: </span>
    <span style="color:#9ecae1;font-weight:bold;font-size:large;margin-left:5px;"> Microsoft </span>
    <span style="color:#3182bd;font-weight:bold;font-size:large;margin-left:5px;"> Community </span>
  </div>
  <div class="g-chart-pull-requests">
    <span style="font-weight:bold;font-size:large;margin-left:150px;"> Pull Requests: </span>
    <span style="color:#a1d99b;font-weight:bold;font-size:large;margin-left:5px;"> Microsoft </span>
    <span style="color:#31a354;font-weight:bold;font-size:large;margin-left:5px;"> Community </span>
  </div>
</body>
{% endraw %}

----

### Participation over time - Community v. Microsoft

Finally we can see the 'per-month' data from the last 3 years, i.e. **November 2014** to **November 2017**.

**Note**: You can inspect different repos by selecting them from the pull-down list, but be aware that the y-axis on the graphs are re-scaled, so the maximum value will change each time.

{% raw %}
<div id='issuesGraph'>
  <!-- TODO do this in css styles, not inline!! -->
  <span style="font-weight:bold;font-size:larger;margin-left:30px;"> Issues: </span>
  <span style="color:#9ecae1;font-weight:bold;font-size:larger;margin-left:5px;"> Microsoft </span>
  <span style="color:#3182bd;font-weight:bold;font-size:larger;margin-left:5px;"> Community </span>
  <!-- <form>
    <label><input type="radio" name="mode" value="stacked" checked> Stacked</label>
    <label><input type="radio" name="mode" value="grouped"> Grouped</label>
  </form> -->
</div>

<div id='pullRequestsGraph'>
  <!-- TODO do this in css styles, not inline!! -->
  <span style="font-weight:bold;font-size:larger;margin-left:30px;"> Pull Requests: </span>
  <span style="color:#a1d99b;font-weight:bold;font-size:larger;margin-left:5px;"> Microsoft </span>
  <span style="color:#31a354;font-weight:bold;font-size:larger;margin-left:5px;"> Community </span>
  <!-- <form>
    <label><input type="radio" name="mode" value="stacked" checked> Stacked</label>
    <label><input type="radio" name="mode" value="grouped"> Grouped</label>
  </form> -->
</div>
{% endraw %}

----

## Summary

It's clear that the community continues to be invested in the .NET-related, Open Source repositories, contributing significantly and for a sustained period of time. I think this is good for *all .NET developers*, whether you contribute to OSS or not, having .NET be a **thriving, Open Source product** has many benefits!

