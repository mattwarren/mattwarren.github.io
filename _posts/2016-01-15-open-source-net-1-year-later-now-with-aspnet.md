---
layout: post
title: Open Source .NET – 1 year later - Now with ASP.NET
comments: true
tags: [.NET, Analytics, Open Source, AspNet]
---

In the [previous post]({{base}}/2015/12/08/open-source-net-1-year-later/) I looked at the community involvement in the year since Microsoft open-sourced large parts of the .NET framework. Although as Isaac Abraham pointed out in the comments "parts of .NET have been open source for quite a bit more than a year – the F# compiler and FSharp.Core have been for quite a while now".

As a follow-up I'm going to repeat that analysis, but this time focussing on the repositories that sit under the [**ASP.NET**](https://github.com/aspnet) umbrella project:

- [**MVC**](https://github.com/aspnet/mvc/) - Model view controller framework for building dynamic web sites with clean separation of concerns, including the merged MVC, Web API, and Web Pages w/ Razor.
- [**DNX**](https://github.com/aspnet/dnx/) - The DNX (a .NET Execution Environment) contains the code required to bootstrap and run an application, including the compilation system, SDK tools, and the native CLR hosts.
- [**EntityFramework**](https://github.com/aspnet/EntityFramework/) - Microsoft's recommended data access technology for new applications in .NET.
- [**KestrelHttpServer**](https://github.com/aspnet/KestrelHttpServer/) - A web server for ASP.NET 5 based on libuv.

### <a name="Methodology"></a>**Methodology**

In the first part I classified the Issues/PRs as **Owner**, **Collaborator** or **Community**. However this turned out to have some problems, as was pointed out to me in the comments. There are several people who are non Microsoft employees, but have been made "Collaborators" due to their extensive contributions to a particular repository, for instance [@kangaroo](https://github.com/kangaroo) and [@benpye](https://github.com/benpye/).

To address this, I decided to change to just the following 2 categories:

- **Microsoft**
- **Community**

This is possible because (almost) all Microsoft employees have indicated where they work on their GitHub profile, for instance:

[![David Fowler Profile](https://cloud.githubusercontent.com/assets/157298/12374944/b686820c-bca4-11e5-86c8-cf9f1076b45e.png)](https://github.com/davidfowl)

There are some notable exceptions, e.g. [@shanselman](https://github.com/shanselman) clearly works at Microsoft, but it's easy enough to allow for cases like this.

## <a name="Results"></a>Results

So after all this analysis, what results did I get. Well overall, the Community involvement accounts for just over 60% over the "Issues Created" and 33% of the "Merged Pull Requests (PRs)". However the amount of PRs is skewed by Entity Framework which has a much higher involvement from Microsoft employees, if this is ignored the Community proportion of PRs increases to 44%.

### Issues Created (Nov 2013 - Dec 2015)
| **Project** | **Microsoft** | **Community** | **Total** |
| :---------- | ------------: | ------------: | --------: |
| aspnet/**MVC** | 716 | 1380 | 2096 |
| aspnet/**dnx** | 897 | 1206 | 2103 |
| aspnet/**EntityFramework** | 1066 | 1427 | 2493 |
| aspnet/**KestrelHttpServer** | 89 | 176 | 265 |
| **Total** | **2768** | **4189** | **6957** |

### Merged Pull Requests (Nov 2013 - Dec 2015)
| **Project** | **Microsoft** | **Community** | **Total** |
| :---------- | ------------: | ------------: | --------: |
| aspnet/**MVC** | 385 | 228 | 613 |
| aspnet/**dnx** | 406 | 368 | 774 |
| aspnet/**EntityFramework** | 937 | 225 | 1162 |
| aspnet/**KestrelHttpServer** | 69 | 88 | 157 |
| **Total** | **1798** | **909** | **2706** |

Note: I included the [Kestrel Http Server](https://github.com/aspnet/KestrelHttpServer) because it is an interesting case. Currently the #1 contributor is not a Microsoft employee, it is [Ben Adams](https://twitter.com/ben_a_adams/status/684503094810525696/photo/1), who is doing a great job of [improving the memory usage](http://www.hanselman.com/blog/WhenDidWeStopCaringAboutMemoryManagement.aspx) and in the process helping Kestrel handle more and more requests per/second.

By looking at the results over time, you can see that there is a clear and sustained Community involvement (the lighter section of the bars) over the past 2 years (Nov 2013 - Dec 2015) and it doesn't look like it's going to stop.

### <a name="IssuesPerMonthBySubmitter"></a>**Issues Per Month - By Submitter (click for full-size image)**

[![Issues Per Month - By Submitter (Microsoft or Community)](https://cloud.githubusercontent.com/assets/157298/12142495/6f746e92-b470-11e5-97fd-bf0d59a74875.png)](https://cloud.githubusercontent.com/assets/157298/12142495/6f746e92-b470-11e5-97fd-bf0d59a74875.png)

In addition, whilst the Community involvement is easier to see with the Issues per/month, it is still visible in the Merged PRs and again it looks like it has being sustained over the 2 years.

### <a name="MergedPullRequestPerMonthBySubmitter"></a>**Merged Pull Request Per Month - By Submitter (click for full-size image)**

[![Merged Pull Requests Per Month - By Submitter (Microsoft or Community)](https://cloud.githubusercontent.com/assets/157298/12142522/9f72726a-b470-11e5-8333-aec772ff9f6b.png)](https://cloud.githubusercontent.com/assets/157298/12142522/9f72726a-b470-11e5-8333-aec772ff9f6b.png)

## <a name="Conclusion"></a>Conclusion
