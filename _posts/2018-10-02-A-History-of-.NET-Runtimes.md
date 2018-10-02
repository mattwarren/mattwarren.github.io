---
layout: post
title: A History of .NET Runtimes
comments: true
datavis: true
codeproject: false
tags: [CLR, .NET]
---

Recently I was fortunate enough to chat with [Chris Bacon](https://twitter.com/Chrisdunelm) who wrote [DotNetAnywhere](https://github.com/chrisdunelm/DotNetAnywhere) ([an alternative .NET Runtime]({{ base }}/2017/10/19/DotNetAnywhere-an-Alternative-.NET-Runtime/)) and I quipped with him:

> .. you're probably one of only a **select group**(*) of people who've written a .NET runtime, that's pretty cool!

\* if you exclude people who were paid to work on one, i.e. Microsoft/Mono/Xamarin engineers, it's a *very* select group.

But it got me thinking, **how many .NET Runtimes are there**? I put together my own list, then enlisted a crack team of highly-paid researchers, a.k.a my twitter followers:

<blockquote class="twitter-tweet" data-cards="hidden" data-lang="en"><p lang="en" dir="ltr"><a href="https://twitter.com/hashtag/LazyWeb?src=hash&amp;ref_src=twsrc%5Etfw">#LazyWeb</a>, fun Friday quiz, how many different .NET Runtimes are there? (that implement ECMA-335 <a href="https://t.co/76stuYZLrw">https://t.co/76stuYZLrw</a>)<br>- .NET Framework<br>- .NET Core<br>- Mono<br>- Unity<br>- .NET Compact Framework<br>- DotNetAnywhere<br>- Silverlight<br>What have I missed out?</p>&mdash; Matt Warren (@matthewwarren) <a href="https://twitter.com/matthewwarren/status/1040622340739088384?ref_src=twsrc%5Etfw">September 14, 2018</a></blockquote>
<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

For the purposes of this post I'm classifying a '*.NET Runtime*' as anything that implements the [ECMA-335 Standard for .NET]({{ base }}/2018/04/06/Taking-a-look-at-the-ECMA-335-Standard-for-.NET/) (more info [here](https://github.com/dotnet/coreclr/blob/master/Documentation/project-docs/dotnet-standards.md)). I don't know if there's a more precise definition or even some way of officially veryifying conformance, but in practise it means that the runtimes can take a **.NET exe/dll produced by any C#/F#/VB.NET compiler and run it**.

Once I had the list, I made copious use of wikipedia (see the [list of 'References'](#references)) and came up with the following timeline:

<iframe width="100%" height="400" src="https://time.graphics/embed?v=1&id=132735" frameborder="0" allowfullscreen></iframe>
<div><a style="font-size: 12px; text-decoration: none;" title="Timeline maker" href="https://time.graphics">Timeline maker</a></div>

**If I've missed out any runtimes, please let me know!**

To make the timeline a bit easier to understand, I put each runtime into one of the following categories:

1. <font color="#f56c00" style="font-weight: bold;">Microsoft .NET Frameworks</font>
1. <font color="#5b0be9" style="font-weight: bold;">Other Microsoft Runtimes</font>
1. <font color="#46cc12" style="font-weight: bold;">Mono/Xamarin Runtimes</font>
1. <font color="#e9140b" style="font-weight: bold;">'Ahead-of-Time' (AOT) Runtimes</font>
1. <font color="#587934" style="font-weight: bold;">Community Projects</font>
1. <font color="#ec1954" style="font-weight: bold;">Research Projects</font>

**The rest of the post will look at the different runtimes in more detail. *Why* they were created, *What* they can do and *How* they compare to each other.**

----

<h2><font color="#f56c00" style="font-weight: bold;">Microsoft .NET Frameworks</font></h2>

The original '.NET Framework' was started by Microsoft in the late 1990's and has been going strong ever since. Recently they've changed course somewhat with the announcement of [.NET Core](https://blogs.msdn.microsoft.com/dotnet/2016/06/27/announcing-net-core-1-0/), which is '*open-source*' and '*cross-platform*'. In addition, by creating the [.NET Standard](https://blogs.msdn.microsoft.com/dotnet/2017/08/14/announcing-net-standard-2-0/) they've provided a way for different runtimes to remain compatible:

> **.NET Standard is for sharing code.** .NET Standard is a set of APIs that all .NET implementations must provide to conform to the standard. This unifies the .NET implementations and prevents future fragmentation.

As an aside, if  you want more information on the 'History of .NET', I really recommend [Anders Hejlsberg - What brought about the birth of the CLR?](https://channel9.msdn.com/Blogs/TheChannel9Team/Anders-Hejlsberg-What-brought-about-the-birth-of-the-CLR) and this presentation by [Richard Campbell](https://twitter.com/richcampbell) who *really* knows how to tell a story!

<iframe width="711" height="400" src="https://www.youtube.com/embed/FFCn_z7dn_A" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>

(Also [available as a podcast](https://dotnetrocks.com/?show=1500) if you'd prefer and he's [working on a book covering the same subject](https://twitter.com/richcampbell/status/966199852278403072). If you want to learn more about the history of the entire '*.NET Ecosystem*' not just the Runtimes, check out ['Legends of .NET'](http://corefx.strikingly.com/))



<h2><font color="#5b0be9" style="font-weight: bold;">Other Microsoft Runtimes</font></h2>

But outside of the main *general purpose* '.NET Framework', Microsoft have also released other runtimes, designed for specific scenarios.

<h3><font color="#5b0be9" style="font-weight: bold;">.NET Compact Framework</font></h3>

The *Compact* (.NET CF) and *Micro* (.NET MF) Frameworks were both attempts to provide cut-down runtimes that would run on more constrained devices, for instance [.NET CF](https://en.wikipedia.org/wiki/.NET_Compact_Framework):

> ... is designed to run on resource constrained mobile/embedded devices such as personal digital assistants (PDAs), mobile phones factory controllers, set-top boxes, etc. The .NET Compact Framework uses some of the same class libraries as the full .NET Framework and also a few libraries designed specifically for mobile devices such as .NET Compact Framework controls. However, the libraries are not exact copies of the .NET Framework; they are scaled down to use less space.

<h3><font color="#5b0be9" style="font-weight: bold;">.NET Micro Framework</font></h3>

The [.NET MF](https://en.wikipedia.org/wiki/.NET_Micro_Framework) is even more constrained:

> ... for resource-constrained devices with at least 256 KB of flash and 64 KB of random-access memory (RAM). It includes a small version of the .NET Common Language Runtime (CLR) and supports development in C#, Visual Basic .NET, and debugging (in an emulator or on hardware) using Microsoft Visual Studio. NETMF features a subset of the .NET base class libraries (about 70 classes with about 420 methods),.. 
> NETMF also features added libraries specific to embedded applications. It is free and open-source software released under Apache License 2.0.

If you want to try it out, Scott Hanselman did a nice write-up [The .NET Micro Framework - Hardware for Software People](https://www.hanselman.com/blog/TheNETMicroFrameworkHardwareForSoftwarePeople.aspx).

<h3><font color="#5b0be9" style="font-weight: bold;">Silverlight</font></h3>

Although now only in [support mode](https://support.microsoft.com/en-gb/lifecycle/search/12905) (or ['dead'](https://www.quora.com/Is-SilverLight-dead)/['sunsetted'](https://www.infragistics.com/community/blogs/b/engineering/posts/the-sunset-of-silverlight) depending on your POV), it's interesting to go back to the original announcement and see what [Silverlight was trying to do](https://weblogs.asp.net/scottgu/silverlight):

> Silverlight is a cross platform, cross browser .NET plug-in that enables designers and developers to build rich media experiences and RIAs for browsers.  The preview builds we released this week currently support Firefox, Safari and IE browsers on both the Mac and Windows.

Back in 2007, Silverlight 1.0 had [the following features](https://weblogs.asp.net/scottgu/silverlight-1-0-released-and-silverlight-for-linux-announced) (it even worked on Linux!):

> - Built-in codec support for playing VC-1 and WMV video, and MP3 and WMA audio within a browser...
> - Silverlight supports the ability to progressively download and play media content from any web-server...
> - Silverlight also optionally supports built-in media streaming...
> - Silverlight enables you to create rich UI and animations, and blend vector graphics with HTML to create compelling content experiences...
> - Silverlight makes it easy to build rich video player interactive experiences...

<h2><font color="#46cc12" style="font-weight: bold;">Mono/Xamarin Runtimes</font></h2>

Mono came about when Miguel de Icaza and others explored the possibility of making .NET work on Linux (from [Mono early history](https://www.mono-project.com/archived/mailpostearlystory/)):

> Who came first is not an important question to me, because Mono to me is a means to an end: a technology to help Linux succeed on the desktop.

The [same post](https://www.mono-project.com/archived/mailpostearlystory/) also talks about how it started:

> On the Mono side, the events were approximately like this:
>
> As soon as the .NET documents came out in December 2000, I got really interested in the technology, and started where everyone starts: at the byte code interpreter, **but I faced a problem: there was no specification for the metadata though**.
> 
> The last modification to the early VM sources was done on January 22 2001, around that time I started posting to the .NET mailing lists asking for the missing information on the metadata file format.
> 
> ...
> 
> About this time Sam Ruby was pushing at the ECMA committee to get the binary file format published, something that was not part of the original agenda.  I do not know how things developed, but **by April 2001 ECMA had published the file format**.

Over time, Mono (now [Xamarin](https://tirania.org/blog/archive/2011/May-16.html)) has branched out into wider areas. It runs on [Android](https://github.com/xamarin/xamarin-android) and [iOS/Mac](https://github.com/xamarin/xamarin-macios) and was acquired by Microsoft in [Feb 2016](https://blogs.microsoft.com/blog/2016/02/24/microsoft-to-acquire-xamarin-and-empower-more-developers-to-build-apps-on-any-device/). In addition Unity & Mono/Xamarim have [long worked together](https://tirania.org/blog/archive/2009/Apr-09.html), to provide [C# support in Unity](https://tirania.org/blog/archive/2007/Aug-31-1.html) and Unity is now a [member of the .NET Foundation](https://blogs.unity3d.com/2016/04/01/unity-joins-the-net-foundation/).

<h2><font color="#e9140b" style="font-weight: bold;">'Ahead-of-Time' (AOT) Runtimes</font></h2>

I wanted to include AOT runtimes as a seperate category, because traditionally .NET has been ['Just-in-Time' Compiled]({{ base }}/2017/12/15/How-does-.NET-JIT-a-method-and-Tiered-Compilation/#how-it-works), but over time more and more 'Ahead-of-Time' compilation options have been available.

As far as I can tell, Mono was the first, with an ['AOT' mode since Aug 2006](https://tirania.org/blog/archive/2006/Aug-17.html), but recently, Microsoft have released [.NET Native](https://docs.microsoft.com/en-us/dotnet/framework/net-native/) and are they're working on [CoreRT - A .NET Runtime for AOT]({{ base }}/2018/06/07/CoreRT-.NET-Runtime-for-AOT/).

<h2><font color="#587934" style="font-weight: bold;">Community Projects</font></h2>

However, not all '*.NET Runtimes'* were developed by Microsoft, or companies that they later acquired. There are some '*Community*' owned ones:

- The oldest is [DotGNU Portable.NET](http://www.gnu.org/software/dotgnu/pnet.html), which started at the same time as Mono, with the goal '*to build a suite of Free Software tools to compile and execute applications for the Common Language Infrastructure (CLI)..*'.
- Secondly, there is [DotNetAnywhere]({{ base }}/2017/10/19/DotNetAnywhere-an-Alternative-.NET-Runtime/), the work of just one person, [Chris Bacon](https://twitter.com/Chrisdunelm). DotNetAnywhere has the *claim to fame* that it provided the [initial runtime](http://blog.stevensanderson.com/2017/11/05/blazor-on-mono/) for the Blazor project. However it's also an excellent resource if you want to look at what makes up a '.NET Compatible-Runtime' and don't have the time to wade through the millions of lines-of-code that make up the [CoreCLR](https://github.com/dotnet/coreclr/)!
- Next comes [CosmosOS](https://www.gocosmos.org/) ([GitHub project](https://github.com/CosmosOS/Cosmos)), which is not just a .NET Runtime, but a '*Managed Operating System*'. If you want to see how it achieves this I recommend reading through the [excellent FAQ](https://www.gocosmos.org/faq/) or taking a [quick look under the hood](https://github.com/CosmosOS/Cosmos/wiki/Quick-look-under-the-hood). Another similar effort is [SharpOS](https://en.wikipedia.org/wiki/SharpOS).
- Finally, I recently stumbled across [CrossNet](https://web.archive.org/web/20090425073609/http://crossnet.codeplex.com/), which takes a different approach, it '*parses .NET assemblies and generates unmanaged C++ code that can be compiled on any standard C++ compiler.'* Take a look at the [overview docs](https://web.archive.org/web/20090426113345/http://crossnet.codeplex.com:80/Wiki/View.aspx?title=overview) and [example of generated code](https://web.archive.org/web/20090426114553/http://crossnet.codeplex.com:80/Wiki/View.aspx?title=Examples%20of%20generated%20code) to learn more.

<h2><font color="#ec1954" style="font-weight: bold;">Research Projects</font></h2>

Finally, onto the more esoteric .NET Runtimes. These are the *Research Projects* run by Microsoft, with the aim of seeing just how far can you extend a 'managed runtime', what can they be used for. Some of this research work has made it's way back into commercial/shipping .NET Runtimes, for instance [Span&lt;T&gt; came from Midori](https://twitter.com/funcofjoe/status/943671450677927936).

[**Shared Source Common Language Infrastructure (SSCLI)**](https://en.wikipedia.org/wiki/Shared_Source_Common_Language_Infrastructure) (a.k.a 'Rotor):

> is Microsoft's shared source implementation of the CLI, the core of .NET. Although the SSCLI is not suitable for commercial use due to its license, it does make it possible for programmers to examine the implementation details of many .NET libraries and to create modified CLI versions. Microsoft provides the Shared Source CLI as a reference CLI implementation suitable for educational use.

An interesting side-effect of releasing Rotor is that they were also able to release the ['Gyro' Project](https://www.microsoft.com/en-us/download/details.aspx?id=52517), which gives an idea of how [Generics were added to the .NET Runtime]({{ base }} /2018/03/02/How-generics-were-added-to-.NET/#the-gyro-project---generics-for-rotor).

[**Midori**](https://en.wikipedia.org/wiki/Midori_(operating_system)):

> Midori was the code name for a managed code operating system being developed by Microsoft with joint effort of Microsoft Research. It had been reported to be a possible commercial implementation of the Singularity operating system, a research project started in 2003 to build a highly dependable operating system in which the **kernel, device drivers, and applications are all written in managed code**. It was designed for concurrency, and could run a program spread across multiple nodes at once. It also featured a security model that sandboxes applications for increased security. Microsoft had mapped out several possible migration paths from Windows to Midori. The operating system was discontinued some time in 2015, though many of its concepts were rolled into other Microsoft projects.

Midori is the project that appears to have led to the most ideas making their way back into the '.NET Framework', you can read more about this in [Joe Duffy's](https://twitter.com/funcOfJoe) excellent series [Blogging about Midori](http://joeduffyblog.com/2015/11/03/blogging-about-midori/)
  1. [A Tale of Three Safeties](/2015/11/03/a-tale-of-three-safeties/)
  2. [Objects as Secure Capabilities](/2015/11/10/objects-as-secure-capabilities/)
  3. [Asynchronous Everything](/2015/11/19/asynchronous-everything/)
  4. [Safe Native Code](/2015/12/19/safe-native-code)
  5. [The Error Model](/2016/02/07/the-error-model)
  6. [Performance Culture](/2016/04/10/performance-culture)
  7. [15 Years of Concurrency](/2016/11/30/15-years-of-concurrency/)

[**Singularity (operating system)**](https://en.wikipedia.org/wiki/Singularity_(operating_system)) (also [Singularity RDK](https://archive.codeplex.com/?p=singularity))

> Singularity is an experimental operating system (OS) which was built by Microsoft Research between 2003 and 2010. It was designed as a high dependability OS in which the **kernel, device drivers, and application software were all written in managed code**. Internal security uses type safety instead of hardware memory protection.

Last, but not least, there is [**Redhawk**](https://github.com/dotnet/coreclr/blob/master/Documentation/project-docs/glossary.md):

> Codename for experimental minimal managed code runtime that evolved into [CoreRT](https://github.com/dotnet/corert).

----

## References

Below are the Wikipedia articles I referenced when creating the timeline:

- [.NET Framework](https://en.wikipedia.org/wiki/.NET_Framework)
- [.NET Framework version history](https://en.wikipedia.org/wiki/.NET_Framework_version_history)
- [.NET Core](https://en.wikipedia.org/wiki/.NET_Core)
- [Shared Source Common Language Infrastructure](https://en.wikipedia.org/wiki/Shared_Source_Common_Language_Infrastructure)
- [Mono (software)](https://en.wikipedia.org/wiki/Mono_(software))
- [Unity (game engine)](https://en.wikipedia.org/wiki/Unity_(game_engine))
- [Microsoft Silverlight](https://en.wikipedia.org/wiki/Microsoft_Silverlight)
- [.NET Compact Framework](https://en.wikipedia.org/wiki/.NET_Compact_Framework)
- [.NET Micro Framework](https://en.wikipedia.org/wiki/.NET_Micro_Framework)
- [Singularity (operating system)](https://en.wikipedia.org/wiki/Singularity_(operating_system))
- [Midori (operating system)](https://en.wikipedia.org/wiki/Midori_(operating_system))
- [DotGNU Portable.NET](https://en.wikipedia.org/wiki/DotGNU)

 
