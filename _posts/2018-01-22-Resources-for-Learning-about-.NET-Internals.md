---
layout: post
title: Resources for Learning about .NET Internals
comments: true
codeproject: false
tags: [CLR, .NET, Internals]
---

It all started with a tweet, which seemed to resonate with people:

<blockquote class="twitter-tweet" data-lang="en"><p lang="en" dir="ltr">If you like reading my posts on .NET internals, you&#39;ll like all these other blogs. So I&#39;ve put them together in a thread for you!!</p>&mdash; Matt Warren (@matthewwarren) <a href="https://twitter.com/matthewwarren/status/951799867038404608?ref_src=twsrc%5Etfw">January 12, 2018</a></blockquote>
<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

The aim was to list blogs that *specifically* cover .NET internals at a low-level or to put it another way, blogs that answer the question **how does feature 'X' work, under-the-hood**. The list includes either *typical posts* for that blog, or just some of *my favourites*!

**Note:** for a wider list of .NET and performance related blogs see [Awesome .NET Performance](https://github.com/adamsitnik/awesome-dot-net-performance#article-series) by [Adam Sitnik](https://twitter.com/SitnikAdam)

I **wouldn't recommend reading through the entire list**, at least not in one go, your brain will probably melt. Picks some posts/topics that interest you and start with those. 

Finally, bear in mind that some of the posts are over 10 years old, so there's a chance that things have changed since then (however, in my experience, the low-levels parts of the CLR are more stable). If you want to double-check the latest behaviour, you're best option is to [read the source](https://github.com/dotnet/coreclr)!

----

## Community or Non-Microsoft Blogs

These blogs are all written by non-Microsoft employees (AFAICT), or if they do work for Microsoft, they don't work directly on the CLR. If I've missed any interesting blogs out, please let me know!

**Special mention** goes to **Sasha Goldshtein**, he's been blogging about this [longer than anyone](http://blogs.microsoft.co.il/sasha/tag/netinternals/)!!

- [**All Your Base Are Belong To Us**](http://blogs.microsoft.co.il/sasha) by [**Sasha Goldshtein** (@goldshtn)](https://twitter.com/goldshtn)
  - [Generic Method Dispatch](http://blogs.microsoft.co.il/sasha/2010/07/09/generic-method-dispatch/)
  - [Inspecting Local Root Lifetime](http://blogs.microsoft.co.il/sasha/2010/08/25/inspecting-local-root-lifetime/)
  - [Virtual Method Dispatch and Object Layout Changes in CLR 4.0](http://blogs.microsoft.co.il/sasha/2012/03/15/virtual-method-dispatch-and-object-layout-changes-in-clr-40/)
  - [Runtime Representation of Generics—Part 2](http://blogs.microsoft.co.il/sasha/2012/09/18/runtime-representation-of-genericspart-2/)
  - [Revisiting Value Types vs. Reference Types](http://blogs.microsoft.co.il/sasha/2013/04/10/revisiting-value-types-vs-reference-types/)

----

- [**Dissecting the code**](https://blogs.msdn.microsoft.com/seteplia) by [**Sergey Teplyakov** (@STeplyakov)](https://twitter.com/STeplyakov) (**M/S**)
  - [Understanding different GC modes with Concurrency Visualizer](https://blogs.msdn.microsoft.com/seteplia/2017/01/05/understanding-different-gc-modes-with-concurrency-visualizer/)
  - [Garbage collection and variable lifetime tracking](https://blogs.msdn.microsoft.com/seteplia/2017/05/09/garbage-collection-and-variable-lifetime-tracking/)
  - [Managed object internals, Part 1. The layout](https://blogs.msdn.microsoft.com/seteplia/2017/05/26/managed-object-internals-part-1-layout/) (Also [part 2](https://blogs.msdn.microsoft.com/seteplia/2017/09/06/managed-object-internals-part-2-object-header-layout-and-the-cost-of-locking/), [part 3](https://blogs.msdn.microsoft.com/seteplia/2017/09/12/managed-object-internals-part-3-the-layout-of-a-managed-array-3/) and [part 4](https://blogs.msdn.microsoft.com/seteplia/2017/09/21/managed-object-internals-part-4-fields-layout/))
  - [To box or not to Box? That is the question!](https://blogs.msdn.microsoft.com/seteplia/2017/05/17/box-or-not-to-box-that-is-the-question/)
  - [Dissecting the new() constraint in C#: a perfect example of a leaky abstraction](https://blogs.msdn.microsoft.com/seteplia/2017/02/01/dissecting-the-new-constraint-in-c-a-perfect-example-of-a-leaky-abstraction/)
- [**Adam Sitnik - .NET Performance and Reliability**](http://adamsitnik.com) by [**Adam Sitnik** (@SitnikAdam)](https://twitter.com/SitnikAdam) (**M/S**)
  - [Value Types vs Reference Types](http://adamsitnik.com/Value-Types-vs-Reference-Types/)
  - [Span](http://adamsitnik.com/Span/)
  - [Pooling large arrays with ArrayPool](http://adamsitnik.com/Array-Pool/)
  - [Collecting Hardware Performance Counters with BenchmarkDotNet](http://adamsitnik.com/Hardware-Counters-Diagnoser/)
  - [Disassembling .NET Code with BenchmarkDotNet](http://adamsitnik.com/Disassembly-Diagnoser/)
- [**Andrey Akinshin's blog**](http://aakinshin.net/blog) by [**Andrey Akinshin** (@andrey_akinshin)](https://twitter.com/andrey_akinshin)
  - [Measuring Performance Improvements in .NET Core with BenchmarkDotNet (Part 1)](http://aakinshin.net/blog/post/stephen-toub-benchmarks-part1/)
  - [Blittable types](http://aakinshin.net/blog/post/blittable/)
  - [DateTime under the hood](http://aakinshin.net/blog/post/datetime/)
  - [Stopwatch under the hood](http://aakinshin.net/blog/post/stopwatch/)
- [**TooSlowException**](http://tooslowexception.com/) by [**Konrad Kokosa** (@konradkokosa)](https://twitter.com/konradkokosa)
  - [.NET Core – compilation, running, debugging](http://tooslowexception.com/net-core-compilation-running-debugging/) 
  - [How does Object.GetType() really work?](http://tooslowexception.com/how-does-gettype-work/)
  - [Zero Garbage Collector for .NET Core](http://tooslowexception.com/zero-garbage-collector-for-net-core/) and the follow-up [Zero Garbage Collector for .NET Core 2.1 and ASP.NET Core 2.1](http://tooslowexception.com/zero-garbage-collector-for-net-core-2-1-and-asp-net-core-2-1/)
  - [The Ultimate .NET Experiment – open source project](http://tooslowexception.com/the-ultimate-net-experiment-project/)
- [**a little bit of programming**](https://marcinjuraszek.com) by [**Marcin Juraszek** (@mmjuraszek)](https://twitter.com/mmjuraszek) (**M/S**)
  - [String.Split and int[] allocations](https://marcinjuraszek.com/2017/10/string-split-and-int-array-allocations.html) 
  - [Adding Matt operator to Roslyn - Syntax, Lexer and Parser](https://marcinjuraszek.com/2017/05/adding-matt-operator-to-roslyn-part-1.html) ([Part 2 - Binder](https://marcinjuraszek.com/2017/05/adding-matt-operator-to-roslyn-part-2.html), [Part 3 - Emitter](https://marcinjuraszek.com/2017/06/adding-matt-operator-to-roslyn-part-3.html))
- [**yizhang82's blog**](http://yizhang82.me) by [**Yi Zhang** (@yizhang82)](https://twitter.com/yizhang82) (**M/S**)
  - [Sharing .NET generic code under the hood](http://yizhang82.me/dotnet-generics-sharing)
  - [C# value type boxing under the hood](http://yizhang82.me/value-type-boxing)
  - [Embedding CoreCLR in your C/C++ application](http://yizhang82.me/hosting-coreclr)
- [**Timur Guev's posts on {coding}Sight**](http://codingsight.com/author/timur-guev/) by [**Timur Guev** (@timyrik200)](https://twitter.com/timyrik20), also *appears* to have his own blog [Math and Programming](http://timyrguev.blogspot.co.uk/) (in Russian)
  - [The origin of GetHashCode in .NET](http://codingsight.com/the-origin-of-gethashcode-in-net/)
  - [Aspects of Strings in .NET](http://codingsight.com/strings-in-dot-net/)
  - [StringBuilder: the Past and the Future](http://codingsight.com/stringbuilder-the-past-and-the-future/)
- [**The mole is digging**](https://alexandrnikitin.github.io/blog/) by [**Alexandr Nikitin** (@nikitin_a_a)](https://twitter.com/nikitin_a_a)
  - [.NET Generics under the hood](https://alexandrnikitin.github.io/blog/dotnet-generics-under-the-hood/)
  - [Hoisting in .NET Explained](https://alexandrnikitin.github.io/blog/hoisting-in-net-explained/)
  - [Hoisting in .NET Examples](https://alexandrnikitin.github.io/blog/hoisting-in-net-examples/)
- [**My Coding Place**](https://mycodingplace.wordpress.com) by [**Dudi Keleti** (@dudi_ke)](https://twitter.com/dudi_ke)
  - [Object header get complicated](https://mycodingplace.wordpress.com/2018/01/10/object-header-get-complicated/)
  - [IL Call Vs. Callvirt Instruction](https://mycodingplace.wordpress.com/2014/04/22/call-vs-callvirt-instruction/) ([Part 2](https://mycodingplace.wordpress.com/2014/04/24/il-call-vs-callvirt-instruction-part-two/))
  - [Value type methods – call, callvirt, constrained and hidden boxing](https://mycodingplace.wordpress.com/2016/11/11/value-type-methods-call-callvirt-constrained-and-hidden-boxing/)
- [**Alexandre Mutel's blog**](http://xoofx.com/blog/) by [**Alexandre Mutel** (@xoofx)](https://twitter.com/xoofx)
  - [A new stackalloc operator for reference types with CoreCLR and Roslyn](http://xoofx.com/blog/2015/10/08/stackalloc-for-class-with-roslyn-and-coreclr/)
  - [Struct inheritance in C# with CoreCLR and Roslyn](http://xoofx.com/blog/2015/09/27/struct-inheritance-in-csharp-with-roslyn-and-coreclr/)

<span id="Update"/>
**Update:** I missed out a few blogs and learnt about some new ones:

Honourable mention goes to [.NET Type Internals - From a Microsoft CLR Perspective](https://www.codeproject.com/Articles/20481/NET-Type-Internals-From-a-Microsoft-CLR-Perspecti) on CodeProject, it's a great article!!

- [**Performance is everything. But correctness comes first.**](https://aloiskraus.wordpress.com) by [**Alois Kraus**](http://geekswithblogs.net/akraus1/Default.aspx) (also includes some great posts on Windows Internals and Debugging, such as [Windows 10 Memory Compression And More](https://aloiskraus.wordpress.com/2016/10/03/windows-10-memory-compression-and-more/) and [How Buffered IO Can Ruin Performance](https://aloiskraus.wordpress.com/2016/10/09/how-buffered-io-can-ruin-performance/))
  - [The Non Contracting Code Contracts](https://aloiskraus.wordpress.com/2016/07/18/the-non-contracting-code-contracts/)
  - [When Known .NET Bugs Bite You](https://aloiskraus.wordpress.com/2016/07/31/when-known-net-bugs-bite-you/)
  - [The Definitive Serialization Performance Guide](https://aloiskraus.wordpress.com/2017/04/23/the-definitive-serialization-performance-guide/)
  - [MemAnalyzer v2.5 Released](https://aloiskraus.wordpress.com/2017/08/17/memanalyzer-v2-5-released/)
- [**Entropy Overload**](http://blog.barrkel.com) by [**Barry Kelly**](https://stackoverflow.com/users/3712/barry-kelly)
  - [Call vs CallVirt for C# non-virtual instance methods](http://blog.barrkel.com/2006/05/call-vs-callvirt-for-c-non-virtual.html)
  - [Covariance and Contravariance in .NET, Java and C++](http://blog.barrkel.com/2006/07/covariance-and-contravariance-in-net.html)
  - [The not so lazy garbage collector](http://blog.barrkel.com/2006/07/not-so-lazy-garbage-collector.html)
  - [Commonly Confused Tidbits re .NET Garbage Collector](http://blog.barrkel.com/2009/12/commonly-confused-tidbits-re-net.html)
- [**Matthew Skelton's blog**](https://blog.matthewskelton.net) by [**Matthew Skelton**](https://twitter.com/matthewpskelton)
  - [Advanced Call Processing in the CLR](https://blog.matthewskelton.net/2012/01/29/advanced-call-processing-in-the-clr/)
  - [CLR-COM Interop](https://blog.matthewskelton.net/2012/01/29/clr-com-interop/)
  - [CLR Contexts](https://blog.matthewskelton.net/2012/01/29/clr-contexts/)
- [**.Net Internals, Debugging, Multithreading - and More!**](http://www.liranchen.com) by [**Liran Chen**](??)
  - [Accurately Measuring GC Suspensions](http://www.liranchen.com/2010/08/accurately-measuring-gc-suspensions.html)
  - [Behind The .locals init Flag](http://www.liranchen.com/2010/07/behind-locals-init-flag.html)
  - [Brain Teasing With Strings](http://www.liranchen.com/2010/08/brain-teasing-with-strings.html)
- [**Maarten Balliauw {blog}**](https://blog.maartenballiauw.be/) by [**Maarten Balliauw**](https://twitter.com/maartenballiauw)
  - [Exploring .NET managed heap with ClrMD](https://blog.maartenballiauw.be/post/2017/01/03/exploring-.net-managed-heap-with-clrmd.html)
  - [Exploring memory allocation and strings](https://blog.maartenballiauw.be/post/2016/11/15/exploring-memory-allocation-and-strings.html)
  - [Making .NET code less allocatey - Allocations and the Garbage Collector](https://blog.maartenballiauw.be/post/2016/10/19/making-net-code-less-allocatey-garbage-collector.html)
- [**tabs ↹ over ␣ ␣ ␣ spaces**](https://www.tabsoverspaces.com) by [**Jiri Cincura**](https://twitter.com/cincura_net)
  - [Are static methods faster in execution compared to instance methods?](https://www.tabsoverspaces.com/233660-are-static-methods-faster-in-execution-compared-to-instance-methods-dotnet/)
  - [Where are the differences in execution speed of various method types come from?](https://www.tabsoverspaces.com/233661-where-are-the-differences-in-execution-speed-of-various-method-types-come-from-dotnet/)
- [**NTCore**](http://www.ntcore.com/articles.php) (also writes on the [Cerbero Blog](http://cerbero-blog.com/?author=1)) by [**Daniel Pistelli**](https://twitter.com/dpistelli)
  - [.NET Internals and Native Compiling](http://www.ntcore.com/Files/netint_native.htm)
  - [.NET Internals and Code Injection](http://www.ntcore.com/files/netint_injection.htm)
  - [The .NET File Format](http://www.ntcore.com/files/dotnetformat.htm)  
- [**DOT NET TRICKS**](http://www.abhisheksur.com) by [**Abhishek Sur (@abhi2434)**](https://twitter.com/abhi2434)
  - [Internals to .NET](http://www.abhisheksur.com/2011/03/internals-to-net.html)
  - [Internals of .NET Objects and Use of SOS](http://www.abhisheksur.com/2011/09/internals-of-net-objects-and-use-of-sos.html)
  - [ValueTypes and ReferenceTypes : Under the Hood](http://www.abhisheksur.com/2011/07/valuetypes-and-referencetypes-under.html) ([part 2](http://www.abhisheksur.com/2011/07/valuetype-and-referencetype-under-hood.html))
- [**Random IT Utensils**](https://blog.adamfurmanek.pl/) by [Adam Furmanek](https://twitter.com/furmanekadam)
  - [Custom memory allocation in C# Part 1 — Allocating object on a stack](https://blog.adamfurmanek.pl/2016/04/23/custom-memory-allocation-in-c-part-1/)
  - [Custom memory allocation in C# Part 6 — Memory errors](https://blog.adamfurmanek.pl/2016/07/09/custom-memory-allocation-in-c-part-6/)
  - [.NET Inside Out Part 1 — Virtual and non-virtual calls in C#](https://blog.adamfurmanek.pl/2016/05/21/virtual-and-non-virtual-calls-in-c/)
  - [.NET Inside Out Part 4 — How to override sealed function in C# Revisited](https://blog.adamfurmanek.pl/2017/05/27/how-to-override-sealed-function-in-c-revisited/)
  - [.NET Inside Out Part 7 — Generating Func from a bunch of bytes in C#](https://blog.adamfurmanek.pl/2018/03/24/generating-func-from-bunch-of-bytes-in-c/)
- [**Redgate 'Simple Talk' posts**](https://www.red-gate.com/simple-talk/author/24200-simon-cooper/) by [**Simon Cooper**]()
  - [Series on '**Anatomy of a .NET Assembly**'](https://www.red-gate.com/Search/?s=%22Anatomy+of+a+.NET+Assembly%22&t=simpletalk) ([Google search](https://www.google.co.uk/search?q=site%3Ahttps%3A%2F%2Fwww.red-gate.com%2Fsimple-talk%2F+%22Anatomy+of+a+.NET+Assembly%22&oq=site%3Ahttps%3A%2F%2Fwww.red-gate.com%2Fsimple-talk%2F+%22Anatomy+of+a+.NET+Assembly%22))
    - [PE Headers](https://www.red-gate.com/simple-talk/blogs/anatomy-of-a-net-assembly-pe-headers/) (Intro)
    - [CLR metadata 1](https://www.red-gate.com/simple-talk/blogs/anatomy-of-a-net-assembly-clr-metadata-1/), [Part 2](https://www.red-gate.com/simple-talk/blogs/anatomy-of-a-net-assembly-clr-metadata-2/) and [Part 3](https://www.red-gate.com/simple-talk/blogs/anatomy-of-a-net-assembly-clr-metadata-3/)
    - [The DOS stub](https://www.red-gate.com/simple-talk/blogs/anatomy-of-a-net-assembly-the-dos-stub/) and [The CLR Loader stub](https://www.red-gate.com/simple-talk/blogs/anatomy-of-a-net-assembly-the-clr-loader-stub/)
    - [Methods](https://www.red-gate.com/simple-talk/blogs/anatomy-of-a-net-assembly-methods/) and [Type forwards](https://www.red-gate.com/simple-talk/blogs/anatomy-of-a-net-assembly-type-forwards/)
  - [Series on '**Subterranean IL**'](https://www.red-gate.com/Search/?s=%22Subterranean+IL%22&t=simpletalk) ([Google search](https://www.google.co.uk/search?q=site%3Ahttps%3A%2F%2Fwww.red-gate.com%2Fsimple-talk%2F+%22Subterranean+IL%22&oq=site%3Ahttps%3A%2F%2Fwww.red-gate.com%2Fsimple-talk%2F+%22Subterranean+IL%22))
    - [Introduction](https://www.red-gate.com/simple-talk/blogs/subterranean-il-introduction/)
    - [Callvirt and virtual methods](https://www.red-gate.com/simple-talk/blogs/subterranean-il-callvirt-and-virtual-methods/) and [Callvirt and generic types](https://www.red-gate.com/simple-talk/blogs/subterranean-il-callvirt-and-generic-types/)
    - [The ThreadLocal type](https://www.red-gate.com/simple-talk/blogs/subterranean-il-the-threadlocal-type/) and [ThreadLocal revisited](https://www.red-gate.com/simple-talk/blogs/subterranean-il-threadlocal-revisited/)
- [**Ayende @ Rahien**](https://ayende.com) by [**Oren Eini**](https://twitter.com/ayende)
  - [De-virtualization in CoreCLR - Part I](https://ayende.com/blog/177986/de-virtualization-in-coreclr-part-i) and [Part II](https://ayende.com/blog/177987/de-virtualization-in-coreclr-part-ii)
  - [Debugging CoreCLR applications in WinDBG](https://ayende.com/blog/174914/debugging-coreclr-applications-in-windbg)
  - [Digging into the CoreCLR - JIT Introduction](https://ayende.com/blog/174977/digging-into-the-coreclr-jit-introduction) (by [Federico Andres Lois](https://twitter.com/federicolois))
  - [Digging into the CoreCLR - Exceptional costs, Part I](https://ayende.com/blog/175009/digging-into-the-coreclr-exceptional-costs-part-i) and [Part II](https://ayende.com/blog/175010/digging-into-the-coreclr-exceptional-costs-part-ii) (by [Federico Andres Lois](https://twitter.com/federicolois))
- [**Low Level Design**](https://lowleveldesign.org) by [**Sebastian Solnica**](https://twitter.com/lowleveldesign) (he's also done some [great presentations](https://lowleveldesign.org/presentations/))
  - [Writing a .Net Debugger](https://lowleveldesign.org/2010/10/11/writing-a-net-debugger-part-1-starting-the-debugging-session/) [Part 2](https://lowleveldesign.org/2010/10/22/writing-a-net-debugger-part-2-handling-events-and-creating-wrappers/), [Part 3](https://lowleveldesign.org/2010/11/08/writing-a-net-debugger-part-3-symbol-and-source-files/) and [Part 4](https://lowleveldesign.org/2010/12/01/writing-a-net-debugger-part-4-breakpoints/)
  - [Randomness in .NET](https://lowleveldesign.org/2018/08/15/randomness-in-net/)
  - [Enumerating AppDomains in a remote process](https://lowleveldesign.org/2016/08/23/enumerating-appdomains-in-a-remote-process/)
- [**Welcome to the Corner of Excellence**](https://ekasiswanto.wordpress.com/) by [**Eka Siswanto**](https://twitter.com/surya_rakanta) now hosted at [https://excellentcorner.com/](https://excellentcorner.com/)
  - [How to Perform Precise Breakpoint on .NET Method in WinDBG](https://excellentcorner.com/2018/06/21/how-to-perform-precise-breakpoint-on-net-method-in-windbg/)
  - [SOS Internals – threads Command](https://ekasiswanto.wordpress.com/2010/11/15/sos-internals-threads-command/)
  - [SOS Internals – DumpDomain Command](https://ekasiswanto.wordpress.com/2010/11/17/sos-internals-dumpdomain-command/)
  - [SOS Internals – DumpModule Command](https://ekasiswanto.wordpress.com/2010/11/23/sos-internals-dumpmodule-command/)
- [**Steve's Tech Blog**](http://blog.steveniemitz.com) by [**Steven Niemitz**](https://twitter.com/steveniemitz)
  - [Building a mixed-mode stack walker - Part 1](http://blog.steveniemitz.com/building-a-mixed-mode-stack-walker-part-1/) and [Part 2](http://blog.steveniemitz.com/building-a-mixed-mode-stack-walker-part-2/)
  - [Implementing SOS with SPT - Part 1 of N - **DumpObj**](http://blog.steveniemitz.com/implementing-sos-with-spt-part-1-of-n-dumpobj/), [Part 2 of N - **DumpStackObjects**](http://blog.steveniemitz.com/implementing-sos-with-spt-part-2-of-n-dumpstackobjects/) and [Part 3 of N - **DumpMD & IP2MD**](http://blog.steveniemitz.com/implementing-sos-with-spt-part-3-of-n-dumpmd-ip2md/)
  - [Threads can't be aborted while they're running code inside a catch/finally block](http://blog.steveniemitz.com/threads-cant-be-aborted-while-theyre-running-code-inside-a-catchfinally-block/)
- [**Mode 13h**](https://www.mode19.net/) by [**Dustin Metzgar**](https://twitter.com/DustinMetzgar) (author of [.NET Core in Action](https://www.manning.com/books/dotnet-core-in-action))
  - [Hosting the CLR the **Old** Way](https://www.mode19.net/posts/clrhostingold/)
  - [Hosting the CLR the **Right** Way](https://www.mode19.net/posts/clrhostingright/)

----

## Book of the Runtime (BotR)

The BotR deserves it's own section (thanks to **svick** to [reminding me about it](http://disq.us/p/1pkmyni)).

If you haven't heard of the BotR before, there's a nice FAQ that [explains what it is](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/botr-faq.md#what-is-the-botr):

> The Book of the Runtime is a set of documents that describe components in the CLR and BCL. They are intended to focus more on architecture and invariants and not an annotated description of the codebase.
>
> It was originally created within Microsoft in ~2007, including this document. Developers were responsible to document their feature areas. This helped new devs joining the team and also helped share the product architecture across the team.

To find your way around it, I recommend starting with the [table of contents](https://github.com/dotnet/coreclr/tree/master/Documentation/botr#the-book-of-the-runtime) and then diving in.

**Note:** It's written for *developers working on the CLR*, so it's not an introductory document. I'd recommend reading some of the other blog posts first, then referring to the BotR once you have the basic knowledge. For instance many of my blog posts started with me reading a chapter from the BotR, not fully understanding it, going away and learning some more, writing up what I found and then pointing people to the relevant BotR page for more information.

----

## Microsoft Engineers

The blogs below are written by the *actual* engineers who worked on, designed or managed various parts of the CLR, so they give a deep insight (again, if I've missed any blogs out, please let me know):

- [**Maoni's WebLog - CLR Garbage Collector**](https://blogs.msdn.microsoft.com/maoni) by [**Maoni Stephens**](https://channel9.msdn.com/Shows/On-NET/Maoni-Stephens-on-NET-GC)
  - [Suspending and resuming threads for GC](https://blogs.msdn.microsoft.com/maoni/2006/06/07/suspending-and-resuming-threads-for-gc/)
  - [Allocating on the stack or the heap?](https://blogs.msdn.microsoft.com/maoni/2015/07/15/allocating-on-the-stack-or-the-heap/)
  - [Large Object Heap](https://blogs.msdn.microsoft.com/maoni/2006/04/19/large-object-heap/)
- [**cbrumme's WebLog**](https://blogs.msdn.microsoft.com/cbrumme/) by [**Christopher Brumme**](https://channel9.msdn.com/Search?term=Christopher%20Brumme#ch9Search&lang-en=en&pubDate=all)
  - [Memory Model](https://blogs.msdn.microsoft.com/cbrumme/2003/05/17/memory-model/)
  - [Value Types](https://blogs.msdn.microsoft.com/cbrumme/2003/05/10/value-types/)
  - [Virtual and non-virtual](https://blogs.msdn.microsoft.com/cbrumme/2003/04/25/virtual-and-non-virtual/)
- [**A blog on coding, .NET, .NET Compact Framework and life in general..**](https://blogs.msdn.microsoft.com/abhinaba) by **Abhinaba Basu**
  - [.NET Just in Time Compilation and Warming up Your System](https://blogs.msdn.microsoft.com/abhinaba/2014/09/29/net-just-in-time-compilation-and-warming-up-your-system/)
  - [Trivia: How does CLR create an OutOfMemoryException](https://blogs.msdn.microsoft.com/abhinaba/2008/04/30/trivia-how-does-clr-create-an-outofmemoryexception/)
  - [Back to basic: Series on dynamic memory management](https://blogs.msdn.microsoft.com/abhinaba/2009/01/25/back-to-basic-series-on-dynamic-memory-management/)
- [**Joel Pobar's CLR weblog - CLR Program Manager: Reflection, LCG, Generics and the type system..**](https://blogs.msdn.microsoft.com/joelpob) by [**Joel Pobar**](https://channel9.msdn.com/Events/Speakers/Joel-Pobar)
  - [CLR Type System notes](https://blogs.msdn.microsoft.com/joelpob/2004/07/19/clr-type-system-notes/)
  - [CLR Generics and code sharing](https://blogs.msdn.microsoft.com/joelpob/2004/11/17/clr-generics-and-code-sharing/)
  - [Explanatory notes on Rotor’s Garbage Collector](https://blogs.msdn.microsoft.com/joelpob/2004/02/26/explanatory-notes-on-rotors-garbage-collector/)
- [**CLR Profiling API Blog - Info about the Common Language Runtime's Profiling API**](https://blogs.msdn.microsoft.com/davbr/) by [David Broman](https://channel9.msdn.com/Search?term=David%20Broman#pubDate=all&ch9Search&lang-en=en) (slightly niche, but still worth a read)
  - [Creating an IL-rewriting profiler](https://blogs.msdn.microsoft.com/davbr/2007/03/06/creating-an-il-rewriting-profiler/)
  - [Type Forwarding](https://blogs.msdn.microsoft.com/davbr/2009/09/30/type-forwarding/)
  - [Metadata Tokens, Run-Time IDs, and Type Loading](https://blogs.msdn.microsoft.com/davbr/2011/10/17/metadata-tokens-run-time-ids-and-type-loading/)
- [**Yun Jin's WebLog CLR internals, Rotor code explanation, CLR debugging tips, trivial debugging notes, .NET programming pitfalls**](https://blogs.msdn.microsoft.com/yunjin) by [**Yun Jin**](https://social.msdn.microsoft.com/profile/Yun+Jin)
  - [FCall and GC hole – first post about Rotor](https://blogs.msdn.microsoft.com/yunjin/2004/02/09/fcall-and-gc-hole-first-post-about-rotor/)
  - [Special threads in CLR](https://blogs.msdn.microsoft.com/yunjin/2005/07/05/special-threads-in-clr/)
  - [Dangerous PInvokes – string modification](https://blogs.msdn.microsoft.com/yunjin/2004/02/21/dangerous-pinvokes-string-modification/)
- [**JIT, NGen, and other Managed Code Generation Stuff - Details about RyuJIT stuff of all sort..**](https://blogs.msdn.microsoft.com/clrcodegeneration) by various
  - [Array Bounds Check Elimination in the CLR](https://blogs.msdn.microsoft.com/clrcodegeneration/2009/08/13/array-bounds-check-elimination-in-the-clr/)
  - [How are value types implemented in the 32-bit CLR? What has been done to improve their performance?](https://blogs.msdn.microsoft.com/clrcodegeneration/2007/11/02/how-are-value-types-implemented-in-the-32-bit-clr-what-has-been-done-to-improve-their-performance/)
  - [JIT ETW Inlining Event Fail Reasons](https://blogs.msdn.microsoft.com/clrcodegeneration/2009/10/21/jit-etw-inlining-event-fail-reasons/)
  - [NGen: Measuring Working Set with VMMap](https://blogs.msdn.microsoft.com/clrcodegeneration/2010/04/27/ngen-measuring-working-set-with-vmmap/)
- [**Distributed Matters - Troubleshooting issues in technologies available to developers for building distributed applications**](https://blogs.msdn.microsoft.com/carlos) by [**Carlo**](https://blogs.msdn.microsoft.com/carlos/author/carcolo/)
  - [.NET Generics and Code Bloat (or its lack thereof)](https://blogs.msdn.microsoft.com/carlos/2009/11/09/net-generics-and-code-bloat-or-its-lack-thereof/)
  - [Heap Corruption: A Case Study](https://blogs.msdn.microsoft.com/carlos/2008/12/10/heap-corruption-a-case-study/)
  - [Loading multiple CLR Runtimes (InProc SxS) – Sample Code](https://blogs.msdn.microsoft.com/carlos/2013/08/23/loading-multiple-clr-runtimes-inproc-sxs-sample-code/)
- [**B# .NET Blog - BART DE SMET'S on-line blog (0X2B &#124; ~0X2B, THAT'S THE QUESTION)**](http://bartdesmet.net/blogs/bart/archive/2006/09/27/4472.aspx) by [**Bart De Smet**](https://channel9.msdn.com/Events/Speakers/Bart-De-Smet)
  - [.NET 2.0 string interning inside out](http://bartdesmet.net/blogs/bart/archive/2006/09/27/4472.aspx)
  - [Inlining - yes, it happens](http://bartdesmet.net/blogs/bart/archive/2007/02/19/inlining-yes-it-happens.aspx)
  - [Going Unsafe - An ADDRESSOF Operator in C#](http://bartdesmet.net/blogs/bart/archive/2006/09/07/4395.aspx)
  - [A Beginner's Guide to Cordbg](http://bartdesmet.net/blogs/bart/archive/2006/10/03/4491.aspx)

----

## Books

Finally, if you prefer reading off-line there are some decent books that discuss .NET Internals (Note: all links are Amazon Affiliate links):

- [CLR via C#, 4ed by **Jeffrey Richter**](http://amzn.to/2Ba0ytN)
- [Shared Source CLI Essentials Paperback by **David Stutz, Ted Neward, Geoff Shilling**](http://amzn.to/2DcscYY)
- [Writing High-Performance .NET Code Paperback by **Ben Watson**](http://amzn.to/2EOFX0e)
  - His [blog](http://www.philosophicalgeek.com) is also worth reading, e.g. [Digging Into .NET Object Allocation Fundamentals](http://www.philosophicalgeek.com/2014/09/29/digging-into-net-object-allocation-fundamentals/) and [Digging Into .NET Loop Performance, Bounds-checking, Iteration, and Unrolling](http://www.philosophicalgeek.com/2014/11/20/digging-into-net-loop-performance-bounds-checking-iteration-and-unrolling/)
- [Pro .NET Performance: Optimize Your C# Applications by **Sasha Goldshtein**](http://amzn.to/2Djtplh)

All the books listed above I've bought copies of and read cover-to-cover, they're fantastic resources.

I've also been recently recommend the 2 books below, they look good and certainly the authors know their stuff, but I haven't read them yet:

- [The Common Language Infrastructure Annotated Standard by **James S. Miller, Susann Ragsdale**](http://amzn.to/2ERV6Ol)
- [Essential .NET, Volume I: The Common Language Runtime by **Don Box, Chris Sells**](http://amzn.to/2Dm1yAV)

----

Discuss this post on [HackerNews](https://news.ycombinator.com/item?id=16212220) and [/r/programming](https://www.reddit.com/r/programming/comments/7s7rkq/resources_for_learning_about_net_internals/)
