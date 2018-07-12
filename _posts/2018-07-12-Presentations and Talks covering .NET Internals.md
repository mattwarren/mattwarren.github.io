---
layout: post
title: Presentations and Talks covering '.NET Internals'
comments: true
codeproject: false
tags: [CLR, .NET, Internals]
---

I'm constantly surprised at just *how popular* resources related to '.NET Internals' are, for instance take this tweet and the thread that followed:

<blockquote class="twitter-tweet" data-cards="hidden" data-lang="en"><p lang="en" dir="ltr">If you like learning about &#39;.NET Internals&#39; here&#39;s a few talks/presentations I&#39;ve watched that you might also like. First &#39;Writing High Performance Code in .NET&#39; by Bart de Smet <a href="https://t.co/L5S9BsBlWe">https://t.co/L5S9BsBlWe</a></p>&mdash; Matt Warren (@matthewwarren) <a href="https://twitter.com/matthewwarren/status/1016315333584531456?ref_src=twsrc%5Etfw">July 9, 2018</a></blockquote>
<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

All I'd done was put together a list of Presentations/Talks (based on the criteria below) and people **really seemed to appreciate it**!!

----

## Criteria

To keep things focussed, the talks or presentations:

- Must explain some aspect of the **'internals' of the .NET Runtime** (CLR)
  - i.e. something '*under-the-hood*', the more '*low-level*' the better!
  - e.g. how the GC works, what the JIT does, how assemblies are structured, how to inspect what's going on, etc
- Be entertaining and **worth watching**!
  - i.e. worth someone giving up 40-50 mins of their time for
  - this is hard when you're talking about low-level details, not all speakers manage it!
- Needs to be a talk that I've **watched myself** and actually learnt something from
  - i.e. I don't just hope it's good based on the speaker/topic
- Doesn't have to be unique, fine if it **overlaps with another talk**
  - it often helps having two people cover the same idea, from different perspectives

If you want more general lists of talks and presentations see [Awesome talks](https://github.com/JanVanRyswyck/awesome-talks) and [Awesome .NET Performance](https://github.com/adamsitnik/awesome-dot-net-performance#conference-talks)

----

## List of Talks

Here's the complete list of talks, including a few bonus ones that weren't in the tweet:

1. [**PerfView: The Ultimate .NET Performance Tool**](#perfview) by [Sasha Goldshtein](https://twitter.com/goldshtn)
1. [**Writing High Performance Code in .NET**](#highperfcode) by [Bart De Smet](https://channel9.msdn.com/Tags/bart+de+smet)
1. [**State of the .NET Performance**](#stateofperf) by [Adam Sitnik](https://twitter.com/sitnikadam)
1. [**Let's talk about microbenchmarking**](#benchmarking) by [Andrey Akinshin](https://twitter.com/andrey_akinshin)
1. [**Safe Systems Programming in C# and .NET**](#systemprogramming) ([summary](https://www.infoq.com/news/2016/06/systems-programming-qcon)) by [Joe Duffy](https://twitter.com/funcOfJoe)
1. [**FlingOS - Using C# for an OS**](#flingos) by [Ed Nutting](https://twitter.com/ednutting)
1. [**Maoni Stephens on .NET GC**](#netgc) by [Maoni Stephens](https://blogs.msdn.microsoft.com/maoni/)
1. [**What's new for performance in .NET Core 2.0**](#netcoreperf) by [Ben Adams](https://twitter.com/ben_a_adams)
1. [**Open Source Hacking the CoreCLR**](#opensourcehacking) by [Geoff Norton](https://twitter.com/geoffnorton)
1. [**.NET Core & Cross Platform**](#netcorexplat) by [Matt Ellis](https://github.com/ellismg)
1. [**.NET Core on Unix**](#netcoreunix) by [Jan Vorlicek](https://github.com/janvorli)
1. [**Multithreading Deep Dive**](#multithreading) by [Gael Fraiteur](https://twitter.com/gfraiteur)
1. [**Everything you need to know about .NET memory**](#netmemorylego) by [Ben Emmett](https://twitter.com/bcemmett)

I also added these 2 categories:
- [**'Channel 9' Talks**](#channel-9)
  - So many great talks featuring the Microsoft Engineers who work on the .NET runtime
- [**Talks I plan to watch (but haven't yet)**](#future)

<strong style="color:green">If I've missed any out, please let me know in the comments</strong> (or [on twitter](https://twitter.com/matthewwarren/))

----

<span id="perfview"/>
[**PerfView: The Ultimate .NET Performance Tool**](https://www.infoq.com/presentations/perfview-net) by [Sasha Goldshtein](https://twitter.com/goldshtn) ([slides](https://www.slideshare.net/InfoQ/perfview-the-ultimate-net-performance-tool)) 

In fact, just watch all the talks/presentations that Sasha has done, they're great!! For example [Modern Garbage Collection in Theory and Practice](http://blogs.microsoft.co.il/sasha/2013/11/05/modern-garbage-collection-in-theory-and-practice/) and [Making .NET Applications Faster](https://vimeo.com/131636651)

This talk is a great 'how-to' guide for [PerfView](https://github.com/Microsoft/perfview), what it can do and how to use it (JIT stats, memory allocations, CPU profiling). For more on PerfView see this interview with it's creator, [Vance Morrison: Performance and PerfView](https://channel9.msdn.com/posts/Vance-Morrison-Performance-and-PerfView).

[![01 - PerfView - The Ultimate .NET Performance Tool]({{ base }}/images/2018/07/01 - PerfView - The Ultimate .NET Performance Tool.png)](https://www.infoq.com/presentations/perfview-net)

----

<span id="highperfcode"/>
[**Writing High Performance Code in .NET**](https://www.youtube.com/watch?v=r738tcIstck&feature=youtu.be) by [Bart De Smet](https://channel9.msdn.com/Tags/bart+de+smet) (he also has a some [Pluralsight Courses](https://www.pluralsight.com/authors/bart-desmet) on the same subject)

Features [CLRMD]({{ base }}/2016/09/06/Analysing-.NET-Memory-Dumps-with-CLR-MD/), WinDBG, ETW Events and PerfView, plus some great 'real world' performance issues

[![03 - Writing High Performance Code in .NET]({{ base }}/images/2018/07/03 - Writing High Performance Code in .NET.png)](https://www.youtube.com/watch?v=r738tcIstck&feature=youtu.be)

----

<span id="stateofperf">
[**State of the .NET Performance**](https://www.youtube.com/watch?v=dVKUYP_YALg) by [Adam Sitnik](https://twitter.com/sitnikadam) ([slides](https://www.slideshare.net/yuliafast/adam-sitnik-state-of-the-net-performance))

How to write high-perf code that plays nicely with the .NET GC, covering Span&lt;T&gt;, Memory&lt;T&gt; & ValueTask

[![02 - State of the .NET Performance]({{ base }}/images/2018/07/02 - State of the .NET Performance.png)](https://www.youtube.com/watch?v=dVKUYP_YALg)

----

<span id="benchmarking"/>
[**Let's talk about microbenchmarking**](https://dotnext-helsinki.com/talks/lets-talk-about-microbenchmarking/) by [Andrey Akinshin](https://twitter.com/andrey_akinshin) ([slides](https://www.slideshare.net/AndreyAkinshin/lets-talk-about-microbenchmarking))

Primarily a look at how to benchmark .NET code, but along the way it demonstrates some of the internal behaviour of the JIT compiler (Andrey is the creator of [BenchmarkDotNet](https://benchmarkdotnet.org/))

[![12 - Let's talk about microbenchmarking]({{ base }}/images/2018/07/12 - Let's talk about microbenchmarking.png)](https://dotnext-helsinki.com/talks/lets-talk-about-microbenchmarking/)

----

<span id="systemprogramming"/>
[**Safe Systems Programming in C# and .NET**](https://www.infoq.com/presentations/csharp-systems-programming) ([summary](https://www.infoq.com/news/2016/06/systems-programming-qcon)) by [Joe Duffy](https://twitter.com/funcOfJoe) ([slides](https://www.slideshare.net/InfoQ/safe-systems-programming-in-c-and-net) and [blog](http://joeduffyblog.com/))

Joe Duffy (worked on the [Midori project](http://joeduffyblog.com/2015/11/03/blogging-about-midori/)) shows why C# is a good 'System Programming' language, including what low-level features it provides

[![08 - Safe Systems Programming in C# and .NET]({{ base }}/images/2018/07/08%20-%20Safe%20Systems%20Programming%20in%20C%23%20and%20.NET.png)](https://www.infoq.com/presentations/csharp-systems-programming)

----

<span id="flingos"/>
[**FlingOS - Using C# for an OS**](https://www.youtube.com/watch?v=bnopbNS8Lnw) by [Ed Nutting](https://twitter.com/ednutting) ([slides](https://github.com/FlingOS/FlingOS/tree/master/Documentation/Presentations/.NET%20South%20West))

Shows what you need to do if you want to write and entire OS in C# (!!) The [FlingOS](http://www.flingos.co.uk/) project is worth checking out, it's a great learning resource.

[![04 - FlingOS - Using C# for an OS]({{ base }}/images/2018/07/04%20-%20FlingOS%20-%20Using%20C%23%20for%20an%20OS.png)](https://www.youtube.com/watch?v=bnopbNS8Lnw)

----

<span id="netgc"/>
[**Maoni Stephens on .NET GC**](https://channel9.msdn.com/Shows/On-NET/Maoni-Stephens-on-NET-GC) by [Maoni Stephens](https://blogs.msdn.microsoft.com/maoni/) who is the main (only?) .NET GC developer. In addition [CLR 4.5 Server Background GC](https://channel9.msdn.com/posts/Maoni-Stephens-CLR-45-Server-Background-GC) and [.NET 4.5 in Practice: Bing](https://channel9.msdn.com/Blogs/Charles/NET-45-in-Practice-Bing) are also worth a watch.

An in-depth Q&A on how the .NET GC works, why is does what it does and how to use it efficiently

[![07 - Maoni Stephens on .NET GC]({{ base }}/images/2018/07/07 - Maoni Stephens on .NET GC.png)](https://channel9.msdn.com/Shows/On-NET/Maoni-Stephens-on-NET-GC)

----

<span id="netcoreperf">
[**What's new for performance in .NET Core 2.0**](https://www.ageofascent.com/2017/11/05/perfromance-dotnet-core-2-corestart-conference/) by [Ben Adams](https://twitter.com/ben_a_adams) ([slides](https://cdn.ageofascent.net/assets/2017/Corestart-Whats-new-performance-dotnet-core-2-0.pdf))

Whilst it *mostly* focuses on performance, there is some great internal details on how the JIT generates code for 'de-virtualisation', 'exception handling' and 'bounds checking'

[![13 - What's new for performance in .NET Core 2.0]({{ base }}/images/2018/07/13 - What's new for performance in .NET Core 2.0.png)](https://www.youtube.com/watch?v=eOdhWTX3Ajk)

----

<span id="opensourcehacking"/>
[**Open Source Hacking the CoreCLR**](https://www.youtube.com/watch?v=iQRVJHab4MM) by [Geoff Norton](https://twitter.com/geoffnorton)

Making .NET Core (the CoreCLR) work on OSX was mostly a 'community contribution', this talks is a 'walk-through' of what it took to make it happen

[![09 - Open Source Hacking the CoreCLR]({{ base }}/images/2018/07/09 - Open Source Hacking the CoreCLR.png)]()

----

<span id="netcorexplat"/>
[**.NET Core & Cross Platform**](https://channel9.msdn.com/Blogs/dotnet/NET-Foundations-2015-03-04) by [Matt Ellis](https://github.com/ellismg), one of the .NET Runtime Engineers (this one on how made [.NET Core 'Open Source'](https://channel9.msdn.com/Blogs/dotnet/NET-Foundations-2015-02-25) is also worth a watch)

Discussion of the early work done to make CoreCLR '*cross-platform*', including the build setup, 'Platform Abstraction Layer' (PAL) and OS differences that had to be accounted for

[![05 - .NET Core & Cross Platform]({{ base }}/images/2018/07/05 - .NET Core & Cross Platform.png)](https://channel9.msdn.com/Blogs/dotnet/NET-Foundations-2015-03-04)

----

<span id="netcoreunix"/>
[**.NET Core on Unix**](https://www.youtube.com/watch?v=JNmUz7C1usM) by [Jan Vorlicek](https://github.com/janvorli) a .NET Runtime Engineer ([slides](https://www.slideshare.net/KarelZikmund1/net-meetup-prague-portable-net-core-on-linux-jan-vorlicek))

This talk discusses which parts of the CLR had to be changed to run on Unix, including exception handling, calling conventions, runtime suspension and the PAL

[![06 - .NET Core on Unix]({{ base }}/images/2018/07/06 - .NET Core on Unix.png)](https://www.youtube.com/watch?v=JNmUz7C1usM)

----

<span id="multithreading"/>
[**Multithreading Deep Dive**](https://www.youtube.com/watch?v=z2QYa2RW9c8) by [Gael Fraiteur](https://twitter.com/gfraiteur) (creator of [PostSharp](https://www.postsharp.net/))

Takes a really in-depth look at the CLR memory-model and threading primitives

[![10 - Multithreading Deep Dive]({{ base }}/images/2018/07/10 - Multithreading Deep Dive.png)](https://www.youtube.com/watch?v=z2QYa2RW9c8)

----

<span id="netmemorylego"/>
[**Everything you need to know about .NET memory**](https://vimeo.com/113632451) by [Ben Emmett](https://twitter.com/bcemmett) ([slides](https://www.slideshare.net/benemmett/net-memory-management-ndc-london))

Explains how the .NET GC works using Lego! A very innovative and effective approach!!

[![11 - Everything you need to know about .NET memory]({{ base }}/images/2018/07/11 - Everything you need to know about .NET memory.png)](https://vimeo.com/113632451)

----
<span id="channel9"/>
# Channel 9

The [Channel 9](https://channel9.msdn.com/) videos recorded by Microsoft deserve their own category, because there's so much deep, technical information in them. This list is just a selection, including some of my favourites, there are [many, many more available](https://channel9.msdn.com/Search?term=.net%20clr&lang-en=true)!!

- [Ian Carmichael: The History and Future of the CLR](https://channel9.msdn.com/Blogs/Charles/Ian-Carmichael-The-History-and-Future-of-CLR) (2009)
- [Maoni Stephens and Andrew Pardoe: CLR 4 Garbage Collector - Inside Background GC](https://channel9.msdn.com/Shows/Going+Deep/Maoni-Stephens-and-Andrew-Pardoe-CLR-4-Inside-Background-GC) (2009)
- [Vance Morrison: CLR Through the Years](https://channel9.msdn.com/Shows/Going+Deep/Vance-Morrison-CLR-Through-the-Years) (2009)
- [Surupa Biswas: CLR 4 - Resilient NGen with Targeted Patching](https://channel9.msdn.com/Blogs/Charles/Surupa-Biswas-CLR-4-Resilient-NGen-and-Targeted-Patching) (2009)
- [Suzanne Cook - Developing the CLR, Part I](https://channel9.msdn.com/Shows/WM_IN/Suzanne-Cook-Developing-the-CLR-Part-I) (2005)
- [Tour of .NET CLR Base Class Library Team](https://channel9.msdn.com/Blogs/TheChannel9Team/Kit-George-Tour-of-NET-CLR-Base-Class-Library-Team) (2005)
- [Christopher Brumme - The future of CLR exceptions](https://channel9.msdn.com/Blogs/TheChannel9Team/Christopher-Brumme-The-future-of-CLR-exceptions) (2004)
- [Anders Hejlsberg - What brought about the birth of the CLR?](https://channel9.msdn.com/Blogs/TheChannel9Team/Anders-Hejlsberg-What-brought-about-the-birth-of-the-CLR) (2004)
- [Jason Zander - Discussing the architecture and secrets of .NET and the CLR](https://channel9.msdn.com/Blogs/TheChannel9Team/Jason-Zander-Discussing-the-architecture-and-quotsecretsquot-of-NET-and-the-CLR) (2004)
- [Brad Abrams - What is missing from the CLR?](https://channel9.msdn.com/Blogs/TheChannel9Team/Brad-Abrams-What-is-missing-from-the-CLR) (2004)
- [Christopher Brumme -- Will there be improvements to .NET's garbage collector?](https://channel9.msdn.com/Blogs/TheChannel9Team/Christopher-Brumme-Will-there-be-improvements-to-NETs-garbage-collector) (2004)

----
<span id="future"/>
# Ones to watch

I can't recommend these yet, because I haven't watched them myself! (I can't break my *own* rules!!).

But they all look really interesting and I will watch them as soon as I get a chance, so I thought they were worth including:

- [Patterns for high-performance C#](https://www.youtube.com/watch?v=7GTpwgsmHgU) by [Federico Andres Lois](https://twitter.com/federicolois)
- [Manual memory management in .NET Framework](https://www.youtube.com/playlist?list=PLV281NbnwQaJpaSSOoSI7oPLINjf2Ojak) by [Adam Furmanek](https://twitter.com/furmanekadam) ([blog](https://blog.adamfurmanek.pl/))
- [Beyond step-by step debugging in Visual Studio](https://vimeo.com/223985297) by [Tess Ferrandez](https://twitter.com/TessFerrandez)
- [Hacking .NET(C#) Application: Code of the Hacker](https://vimeo.com/68320501) by Jon McCoy
- [So you want to create your own .NET runtime?](https://ndcoslo.com/talk/so-you-want-to-create-your-own-net-runtime/) by Chris Bacon
- [Advanced .NET debugging techniques from a real world investigation](https://dotnext-piter.ru/2018/spb/talks/5mpiesdyfikoi86s2u0owq/) by [Christophe Nasarre](https://twitter.com/chnasarre) and [Kevin Gosse](https://twitter.com/KooKiz) ([recording](https://www.youtube.com/watch?v=DD3w66Ff8Ms&t=11713s) and [slides](https://github.com/chrisnas/SELAConference2018))
- [Staying Friendly with the GC](http://www.seladeveloperpractice.com/sessions?selected=13) by [O]ren Eini (Ayende Rahien)](https://twitter.com/ayende) ([slides](https://www.slideshare.net/OrenEini/staying-friendly-with-the-gc-104205724))
- [Scratched Metal](https://www.youtube.com/watch?v=DD3w66Ff8Ms) by [Federico Andres Lois](https://twitter.com/federicolois)
- [Beachhead implements new opcode on CLR JIT](https://www.slideshare.net/kekyo/beachhead-implements-new-opcode-on-clr-jit) by [Kouji Matsui](https://twitter.com/kekyo2)
- [Everything what you (don’t) know about structures in .NET](https://pyrzyk.net/public-talks/) by [Łukasz Pyrzyk](https://twitter.com/lukaszpyrzyk) ([slides](https://pyrzyk.net/structures))

----

If this post causes you to go off and watch hours and hours of videos, ignoring friends, family and work for the next few weeks, **[Don't Blame Me](https://www.youtube.com/watch?v=lQPeThqrjws)**
