---
layout: post
title: Roslyn code base - performance lessons (part 1)
comments: true
categories: [C#, open source, Performance, Performance Lessons, Roslyn]
---
At <a href="http://www.buildwindows.com/" target="_blank">Build 2014</a> Microsoft open source their next-generation C#/VB.NET compiler, called <a href="http://msdn.microsoft.com/en-us/vstudio/roslyn.aspx" target="_blank">Roslyn</a>. The project is <a href="https://roslyn.codeplex.com/" target="_blank">hosted on codeplex</a> and you can even <a href="http://source.roslyn.codeplex.com/" target="_blank">browse the source</a>, using the new Reference Source browser, which is itself <a href="http://www.hanselman.com/blog/AnnouncingTheNewRoslynpoweredNETFrameworkReferenceSource.aspx" target="_blank">powered by Roslyn</a> (that's some crazy, meta-recursion going on there!).

<a href="http://source.roslyn.codeplex.com/" target="_blank"><img class="aligncenter wp-image-144 size-large" src="http://mattwarren.github.io/images/2014/05/roslyn-reference-source-browser.png?w=840" alt="Roslyn reference source browser" width="840" height="625" /></a>

<strong>Easter Eggs</strong>

There's also some nice info available, for instance you can <a href="http://source.roslyn.codeplex.com/i.txt" target="_blank">get a summary</a> of the number of lines of code, files etc, you can also list the <a href="http://source.roslyn.codeplex.com/Projects.txt" target="_blank">projects</a> and <a href="http://source.roslyn.codeplex.com/Assemblies.txt" target="_blank">assemblies</a>.

<blockquote>
<pre><strong>ProjectCount=50
DocumentCount=4366
LinesOfCode=2355329
BytesOfCode=96850461
DeclaredSymbols=124312
DeclaredTypes=6649
PublicTypes=2076</strong></pre>
</blockquote>

That's ~2.3 million lines of code, across over 4300 files! (HT to Slaks for <a href="http://blog.slaks.net/2014-02-24/inside-the-new-net-reference-source/#toc_2" target="_blank">pointing out this functionality</a>)

<strong>Being part of the process</strong>

If you are in any way interested in new C# language features or just want to find out how a compiler is built, this is really great news. On top of this, not only have Microsoft open sourced the code, the entire process is there for everyone to see. You can get a peek behind the scenes of the <a href="https://roslyn.codeplex.com/discussions/546465" target="_blank">C# Design Meetings</a>, debate possible new features <a href="https://roslyn.codeplex.com/discussions/542963" target="_blank">with some of the designers</a> and best of all, they seem <a href="https://roslyn.codeplex.com/discussions/541194#post1240018" target="_blank">genuinely interested</a> in getting community feedback.

<strong>Taking performance seriously</strong>

But what I find really interesting is the performance lessons that can be learned. As outlined in <a href="http://blogs.msdn.com/b/csharpfaq/archive/2014/01/15/roslyn-performance-matt-gertz.aspx" target="_blank">this post</a>, performance is something they take seriously. It's not really surprising, the new compiler can't afford to be slower than the old C++ one and developers are pretty demanding customers, so any performance issues would be noticed and complained about.

To give you an idea of what's involved, here's the list of scenarios that they measure the performance against.

<ul style="color:#424242;">
    <li>Build timing of small, medium, and (very) large solutions</li>
    <li>Typing speed when working in the above solutions, including “goldilocks” tests where we slow the typing entry to the speed of a human being</li>
    <li>IDE feature speed (navigation, rename, formatting, pasting, find all references, etc…)</li>
    <li>Peak memory usage for the above solutions</li>
    <li>All of the above for multiple configurations of CPU cores and available memory</li>
</ul>

And to make sure that they have accurate measurements and that they know as soon as performance has degraded (<strong>emphasis mine</strong>):

<blockquote>
<p style="color:#424242;">These are all <strong>assessed &amp; reported daily</strong>, so that we can identify &amp; repair any check-in that introduced a regression as soon as possible, before it becomes entrenched.  Additionally, we don’t just check for the average time elapsed on a given metric; <strong>we also assess the 98<sup>th</sup> &amp; 99.9<sup>th</sup> percentiles</strong>, because we want good performance all of the time, not just some of the time.</p>
</blockquote>

There's lots of information about why <a href="http://filipspagnoli.wordpress.com/2009/11/13/lies-damned-lies-and-statistics-21-misleading-averages/" target="_blank">just using averages is a bad idea</a>, particularly when <a href="http://mvolo.com/why-average-latency-is-a-terrible-way-to-track-website-performance-and-how-to-fix-it/" target="_blank">dealing with response times</a>, so it's good to see that they are using percentiles as well. But running performance tests as part of their daily builds and tracking those numbers over time, is a really good example of taking performance seriously, <strong>performance testing wasn't left till the end, as an after-thought</strong>.

I've worked on projects where the performance targets were at best vague and ensuring they were met was left till right at the end, after all the features had been implemented. It's much harder to introduce performance testing at this time, we certainly don't do it with unit testing, so why with performance testing?

This ties in with <a href="http://blog.codinghorror.com/performance-is-a-feature/" target="_blank">Stack Overflow mantra</a>:

<blockquote>
<h4><strong>Performance is a feature</strong></h4>
</blockquote>

Next time I'll be looking at specific examples of performance enhancements made in the code base and what problems they are trying to solve.
