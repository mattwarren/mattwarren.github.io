---
layout: post
title: Open Source .NET – 2 years later
comments: true
tags: [.NET, Analytics, Open Source, Roslyn, AspNet]
datavis: true
---

{% raw %}
<link rel='stylesheet' href='/datavis/dotnet-oss.css'>
<script src='/datavis/dotnet-oss.js' type='text/javascript'></script>
{% endraw %}

A little over 2 years ago Microsoft announced that they were [open sourcing large parts of the .NET framework](http://www.hanselman.com/blog/AnnouncingNET2015NETAsOpenSourceNETOnMacAndLinuxAndVisualStudioCommunity.aspx) and as [Scott Hanselman](https://twitter.com/shanselman) said in his recent [Connect keynote](https://channel9.msdn.com/Events/Connect/2016/Keynotes-Scott-Guthrie-and-Scott-Hanselman), the community has been contributing in a significant way:

[![Over 60% of the contribution to .NET Core come from the community]({{ base }}/images/2016/11/Over 60 of the contributions to dotnetcore come from the community.jpg)](https://twitter.com/poweredbyaltnet/status/798942478195970048)

You can see some more detail on this number in the talk ['What’s New in the .NET Platform'](https://connectevent.microsoft.com/whats-new-in-the-net-platform/) by Scott Hunter:

![Connect talk - Community Contributions per month]({{ base }}/images/2016/11/Connect talk - Community Contributions per month.png)

This post aims to give more context to those numbers and allow you to explore patterns and trends across different repositories.

----

### Repository activity over time

First we are going to see an overview of the level of activity in each repo, by looking at the total number of 'Issues' (created) or 'Pull Requests' (closed) per month. ([Yay sparklines FTW!!](http://www.edwardtufte.com/bboard/q-and-a-fetch-msg?msg_id=0001OR))

**Note:** Numbers in <span style="color:rgb(0,0,0);font-weight:bold;">black</span> are from the most recent month, with <span style="color:#d62728;font-weight:bold;">red</span> showing the lowest and <span style="color:#2ca02c;font-weight:bold;">green</span> the highest previous value. You can toggle between **Issues** and **Pull Requests** by clicking on the buttons, hover over individual sparklines to get a tooltip showing the per/month values and click on the project name to take you to the GitHub page for that repository.

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

The main trend I see across all repos is there's a sustained level of activity for the entire 2 years, things didn't start with a bang and then tailed off. In addition, many (but not all) repos have a trend of increased activity month-by-month. For instance the PR's in **CoreFX** or the Issues in **Visual Studio Code (vscode)** are clear example of this, their best months have been the most recent.

Finally one interesting 'story' that jumps out of this data is the contrasting levels of activity (PR's) across the **dnx**, **cli** and **msbuild** repositories, as highlighted in the image below:

![Comparison of dnx v cli v msbuild]({{ base }}/images/2016/11/Comparison of dnx v cli v msbuild.png)

If you don't know the full story, initially all the cmd-line tooling was known as **dnx**, but in RC2 was [migrated to .NET Core CLI](https://docs.microsoft.com/en-us/dotnet/articles/core/migrating-from-dnx). You can see this on the chart, activity in the **dnx** repo decreased at the same time that work in **cli** ramped up. 

Following that, in May this year, the whole idea of having 'project.json' files was [abandoned in favour of sticking with 'msbuild'](https://blogs.msdn.microsoft.com/dotnet/2016/05/23/changes-to-project-json/), you can see this change happen towards the right of the chart, there is a marked increase in the **msbuild** repo activity as any improvements that had been done in **cli** were ported over.

----

### Methodology - Community v. Microsoft

But the main question I want to answer is:

> How much **Community** involvement has there been since Microsoft open sourced large parts of the .NET framework?

(See my previous post to see how things [looked after one year]({{ base }}/2016/01/15/open-source-net-1-year-later-now-with-aspnet/))

To do this we need to look at who **opened the Issue** or **created the Pull Request (PR)** and specifically if they worked for  Microsoft or not. This is possible because (almost) all Microsoft employees have indicated where they work on their GitHub profile, for instance:

[![David Fowler Profile](https://cloud.githubusercontent.com/assets/157298/12374944/b686820c-bca4-11e5-86c8-cf9f1076b45e.png)](https://github.com/davidfowl)

There are some notable exceptions, e.g. [@shanselman](https://github.com/shanselman) clearly works at Microsoft, but it's easy enough to allow for cases like this. Before you ask, I only analysed this data, [I did not keep a copy of it in stored in MongoDB](https://www.troyhunt.com/8-million-github-profiles-were-leaked-from-geekedins-mongodb-heres-how-to-see-yours/) to sell to recruiters!!

### Overall Participation - Community v. Microsoft

This data represents the total participation from the last 2 years, i.e. **November 2014** to **October 2016**. All Pull Requests are Issues are treated equally, so a large PR counts the same as one that fixes a spelling mistake. Whilst this isn't ideal it's the simplest way to get an idea of the Microsoft/Community split.

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

The general pattern these graphs show is that the Community is more likely to open an Issue than submit a PR, which I guess isn't that surprising given the relative amount of work involved. However it's clear that the Community is still contributing a considerable amount of work, for instance if you look at the **CoreCLR** repo it *only* has 21% of PRs from the Community, but this stills account for almost 900! 

There's a few interesting cases that jump out here, for instance **Roslyn** gets 35% of its issues from the Community, but only 6% of its PR's, clearly getting code into the compiler is a tough task. Likewise it doesn't seem like the Community is that interested in submitting code to **msbuild**, although it does have my [favourite PR ever](https://github.com/Microsoft/msbuild/pull/1):

[![Fix legacy msbuild issues]({{ base }}/images/2016/11/Fix legacy msbuild issues.png)](https://github.com/Microsoft/msbuild/pull/1)

----

### Participation over time - Community v. Microsoft

Finally we can see the 'per-month' data from the last 2 years, i.e. **November 2014** to **October 2016**.

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

Whilst not every repo is growing month-by-month, the majority are and those that aren't at least show sustained contributions across 2 years.

----

## Summary

I think that it's clear to see that the Community has got on-board with the new Open-Source Microsoft, producing a sustained level of contributions over the last 2 years, lets hope it continues!