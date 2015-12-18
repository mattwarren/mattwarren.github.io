---
layout: post
title: Open Source .NET – 1 year later
comments: true
tags: [.NET, Analytics, Open Source, Roslyn]
---

A little over a year ago Microsoft announced that they were [open sourcing large parts of the .NET framework](http://www.hanselman.com/blog/AnnouncingNET2015NETAsOpenSourceNETOnMacAndLinuxAndVisualStudioCommunity.aspx). At the time Scott Hanselman did a [nice analysis of the source](http://www.hanselman.com/blog/TheNETCoreCLRIsNowOpenSourceSoIRanTheGitHubRepoThroughMicrosoftPowerBI.aspx), using Microsoft Power BI. Inspired by this and now that a year has passed, I wanted to try and answer the question:

> How much **Community** involvement has there been since Microsoft open sourced large parts of the .NET framework?

I will be looking at the 3 following projects, as they are all highly significant parts of the .NET ecosystem and are also some of the [most active/starred/forked projects](https://github.com/dotnet/) within the .NET Foundation:

- [**Roslyn**](https://github.com/dotnet/roslyn/) - The .NET Compiler Platform ("Roslyn") provides open-source C# and Visual Basic compilers with rich code analysis APIs.
- [**CoreCLR**](https://github.com/dotnet/coreclr/) - the .NET Core runtime, called CoreCLR, and the base library, called mscorlib. It includes the garbage collector, JIT compiler, base .NET data types and many low-level classes.
- [**CoreFX**](https://github.com/dotnet/corefx/) the .NET Core foundational libraries, called CoreFX. It includes classes for collections, file systems, console, XML, async and many others.

## <a name="AvailableData"></a>**Available Data**

GitHub itself has some nice graphs built-in, for instance you can see the **Commits per Month** over an entire year:

[![Commits Per Month](https://cloud.githubusercontent.com/assets/157298/11634181/f451abce-9d06-11e5-8940-d133d1931422.png)](https://github.com/dotnet/roslyn/graphs/contributors)

Also you can get a nice dashboard showing the **Monthly Pulse**

[![github stats - monthly pulse](https://cloud.githubusercontent.com/assets/157298/11634411/35085a4a-9d08-11e5-8995-02c65d9ee12d.png)](https://github.com/dotnet/roslyn/pulse/monthly)

However to answer the question above, I needed more data. Fortunately GitHub provides a [really comprehensive API](https://developer.github.com/v3/), which combined with the excellent [Octokit.net library](https://github.com/octokit/octokit.net) and the [brilliant LINQPad](https://www.linqpad.net/), meant I was able to easily get all the data I needed. Here's a [sample LINQPad script](https://gist.github.com/mattwarren/894aa5f46ca62a63764a) if you want to start playing around with the API yourself.

However, knowing the "*# of Issues*" or "*Merged Pull Requests*" per/month on it's own isn't that useful, it doesn't tell us anything about *who* created the issue or submitted the PR. Fortunately GitHub classifies users into categories, for instance in the image below from [Roslyn Issue #670](https://github.com/dotnet/roslyn/issues/670) we can see what type of user posted each comment, an "Owner", "Collaborator" or blank which signifies a "Community" member, i.e. someone who (AFAICT) doesn't work at Microsoft.

[![owner collaborator or community](https://cloud.githubusercontent.com/assets/157298/11634101/8abd7210-9d06-11e5-82b0-570f296cf433.png)](https://cloud.githubusercontent.com/assets/157298/11634101/8abd7210-9d06-11e5-82b0-570f296cf433.png)

## <a name="Results"></a>**Results**

So now that we can get the data we need, what results do we get.

### <a name="TotalIssuesBySubmitter"></a>**Total Issues - By Submitter**

| **Project** | **Owner** | **Collaborator** | **Community** | **Total** |
| ----------- | --------- | ---------------- | ------------- | --------- |
| Roslyn | 481 | 1867 | 1596 | 3944 |
| CoreCLR | 86 | 298 | 487 | 871 |
| CoreFX | 334 | 911 | 735 | 1980 |
| | | | | |
| | | | | |
| **Total** | 901 | 3076 | 2818 |

Here you can see that the Owners and Collaborators do in some cases dominate, e.g. in Roslyn where almost 60% of the issues were opened by them. But in other cases the Community is very active, especially in CoreCLR where Community members are opening more issues than Owners/Collaborators combined. Part of the reason for this is the nature of the different repositories, CoreCLR is the most visible part of the .NET framework as it encompasses most of the libraries that .NET developers would use on a day-to-day basis, so it's not surprising that the Community has lots of suggestions for improvements or bug fixes. In addition, the CoreCLR has been around for a much longer time and so the Community has had more time to use it and find out the parts it doesn't like. Whereas Roslyn is a much newer project so there has been less time to use it, plus finding bugs in a compiler is by its nature harder to do.

### <a name="TotalMergedPullRequestsBySubmitter"></a>**Total Merged Pull Requests - By Submitter**

| **Project** | **Owner** | **Collaborator** | **Community** | **Total** |
| ----------- | --------- | ---------------- | ------------- | --------- |
| **Roslyn** | 465 | 2093 | 118 | 2676 |
| **CoreCLR** | 378 | 567 | 201 | 1146 |
| **CoreFX** | 516 | 1409 | 464 | 2389 |
| | | | | |
| **Total** | 1359 | 4069 | 783 |

However if we look at Merged Pull Requests, we can see that that the overall amount of Community contributions across the 3 projects is much lower, only accounting for roughly 12%. This however isn't that surprising, there's a much higher bar for getting a pull request accepted. Firstly, if the project is using this mechanism, you have to pick an issue that is ["*up for grabs*"](https://github.com/dotnet/corefx/labels/up%20for%20grabs), then you have to get any [API changes through a review](http://blogs.msdn.com/b/dotnet/archive/2015/01/08/api-review-process-for-net-core.aspx), then finally you have to meet any comparability/performance/correctness issues that come up during the code review itself. So actually 12% is a pretty good result as there is a non--trivial amount of work involved in getting your PR merged, especially considering most Community members will be working in their spare time. 

**Update:** I was wrong about the "up for grabs" requirement, see [this comment]({{base}}/2015/12/08/open-source-net-1-year-later/#comment-7091) from [David Kean](https://github.com/davkean) and [this tweet](https://twitter.com/leppie/status/674285812146675714) for more information. "Up for grabs" is a guideline and meant to help new users, but it is not a requirement, you can submit PRs for issues that don't have that label.

Finally if you look at the amount per/month (see the 2 graphs below, click for larger images), it's hard to pick up any definite trends or say if the Community is *definitely* contributing more or less over time. But you can say that over a year the Community has consistently contributed and it doesn't look like that contribution is going to end. It is not just an initial burst that only happened straight after the projects were open sourced, it is a sustained level of contributions over an entire year.

### <a name="IssuesPerMonthBySubmitter"></a>**Issues Per Month - By Submitter**

[![Issues Per Month - By Submitter (Owner, Collaborator or Community)](https://cloud.githubusercontent.com/assets/157298/11596712/ad28f518-9aae-11e5-81d9-42bc22903d09.png)](https://cloud.githubusercontent.com/assets/157298/11596712/ad28f518-9aae-11e5-81d9-42bc22903d09.png)

### <a name="MergedPullRequestPerMonthBySubmitter"></a>**Merged Pull Request Per Month - By Submitter**

[![Merged Pull Requests Per Month - By Submitter (Owner, Collaborator or Community)](https://cloud.githubusercontent.com/assets/157298/11652755/785d0d20-9d91-11e5-9802-834bb3955718.png)](https://cloud.githubusercontent.com/assets/157298/11652755/785d0d20-9d91-11e5-9802-834bb3955718.png)

## <a name="Top20IssuesLabels"></a>**Top 20 Issue Labels**

The last thing that I want to do whilst I have the data is to take a look at the most popular *Issue Labels* and see what they tell us about the *type* of work that has been going on since the 3 projects were open sourced.

[![Top 20 Issue Labels](https://cloud.githubusercontent.com/assets/157298/11633496/8505205a-9d03-11e5-89fd-33384b20306c.png)](https://cloud.githubusercontent.com/assets/157298/11633496/8505205a-9d03-11e5-89fd-33384b20306c.png)

Here are a few observations about the results:

- Having [**CodeGen**](https://github.com/dotnet/coreclr/labels/CodeGen) so high on the list is not that surprising considering that [RyuJIT - the next-gen .NET JIT Compiler](http://blogs.msdn.com/b/dotnet/archive/2013/09/30/ryujit-the-next-generation-jit-compiler.aspx) was only released 2 years ago. However, it's a bit worrying that were so *many* issues, especially considering that some of them have [severe consequences](https://github.com/dotnet/coreclr/issues/1296) as the [devs at Stack Overflow](http://nickcraver.com/blog/2015/07/27/why-you-should-wait-on-dotnet-46/) found out! (On a related note, if you want to find out lots of low-level details about what the JIT does, just take a look at all the issues that [@MikeDN has commented on](https://github.com/dotnet/coreclr/issues?utf8=%E2%9C%93&q=commenter%3Amikedn+type%3Aissue+label%3Acodegen+), unbelievably for someone with that much knowledge he doesn't actually work on the product itself, or even another team at Microsoft!!)
- It's nice to see that all 3 projects have a lots of **"Up for Grabs"** issues, see [Roslyn](https://github.com/dotnet/roslyn/labels/Up%20for%20Grabs), [CoreCLR](https://github.com/dotnet/coreclr/labels/up-for-grabs) and [CoreFX](https://github.com/dotnet/corefx/labels/up%20for%20grabs), plus the Community seems to be [grabbing them back!](https://github.com/dotnet/corefx/labels/grabbed%20by%20community)
- Finally, I love the fact that [**Performance**](https://github.com/dotnet/corefx/labels/performance) and [**Optimisation**](https://github.com/dotnet/coreCLR/labels/optimization) are being taken seriously, after all [Performance is a Feature!!]({{base}}/speaking/)

Discuss on [/r/programming](https://www.reddit.com/r/programming/comments/3vyezb/open_source_net_1_year_later/) and [Hacker News](https://news.ycombinator.com/item?id=10700606)
