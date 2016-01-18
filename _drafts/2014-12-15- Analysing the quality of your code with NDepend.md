---
layout: post
title: Analysing the quality of your code with NDepend
date: 2014-12-15 13:46
author: matthewwarren
comments: true
categories: [NDepend, Performance, Uncategorized]
---
<h4><strong>Disclosure</strong></h4>

After reading some of my previous blog posts <a href="http://codebetter.com/patricksmacchia/" target="_blank">Patrick Smacchia</a> (the developer of <a href="www.ndepend.com" target="_blank">NDepend</a>) offered me a free license, if I would talk about my experiences using it.

<hr />

<h4><strong>Caring about performance</strong></h4>

From reading Patricks's blog it's clear that he cares about performance deeply and that he's spent a considerable amount of time profiling and fixing performance issues in NDepend. If you want the full details I really recommend reading through the posts below:

<ul>
<li><a href="http://codebetter.com/patricksmacchia/2008/12/01/lessons-learned-from-a-real-world-focus-on-performance/" target="_blank">Lessons learned from a real-world focus on performance</a></li>
<li><a href="http://codebetter.com/patricksmacchia/2008/11/19/an-easy-and-efficient-way-to-improve-net-code-performances/" target="_blank">An easy and efficient way to improve .NET code performances</a></li>
<li><a href="http://codebetter.com/patricksmacchia/2009/04/19/micro-optimization-tips-to-increase-performance/" target="_blank">Micro-optimization tips to increase performance</a></li>
<li><a href="http://codebetter.com/patricksmacchia/2009/04/19/do-we-need-micro-optimization/" target="_blank">Do we need Micro-Optimization?</a></li>
</ul>

I especially like these quotes from the last link:

<blockquote>
  .. my position is very clear on this. <strong>For any software that have human users (or better said, for any software), it is the responsibility of programmers to struggle for optimal performance</strong>. The reason is simple: <strong>there is nothing more valuable than the time of human user</strong>.
  
  <strong>Never think that fast CPU is a reason to develop slower code</strong>, I mean both slower than it used to be and slower than it could be.  First, your users will hate you if you make them <strong>noticeable</strong> wait, second CPU doesn’t get any faster nowadays (<a href="http://codebetter.com/patricksmacchia/2008/12/04/solid-state-drive-enhance-developers-productivity/" target="_blank">SSD does still</a>), CPU are just being multiplied which makes the paradigm completely different.
</blockquote>

It's nice to know that the author of NDepend cares so deeply about performance and in-particular he values an end users time (i.e mine) so much!

<h4><strong>Using NDepend to assess the quality of your code</strong></h4>

But onto the primary function of <a href="http://www.ndepend.com/" target="_blank">NDepend</a>:

<blockquote>
  <strong>Measure quality with metrics, see design with diagrams and enforce decisions with code rules, right into Visual Studio.</strong>
</blockquote>

To understand what NDepend can do, I decided to test in out on <a href="https://github.com/kevin-montrose/Jil" target="_blank">Jil</a>, the <em>Fast .NET JSON Serialiser</em>, made by the developers at Stack Overflow. I used this because it's a slightly unusual .NET code base, because of all the <a href="https://github.com/kevin-montrose/Jil#tricks" target="_blank">low-level tricks</a> it employs to get the maximum performance.

<h5><strong>Interdependencies</strong></h5>

First of all the classic diagram showing the interdependencies of the individual components in the code base

<a href="https://mattwarrendotorg.files.wordpress.com/2014/07/dependencygraphsnapshot.png" target="_blank"><img src="http://mattwarrendotorg.files.wordpress.com/2014/07/dependencygraphsnapshot.png?w=660" alt="DependencyGraphSnapshot" width="660" height="710" class="aligncenter size-large wp-image-889" /></a>

Here you see that NDepend does a good job of giving you a high-level overview of the Jil code base and how the internal components relate to each other. When I first look at a code base I always find this type of bird's-eye view useful as you can very quickly see if the code is a mess or not! Kudos to the <a href="https://github.com/kevin-montrose/Jil/graphs/contributors" target="_blank">authors of Jil</a> for having everything logically separated, I certainly didn't struggle to work out where things were when I first looked at it.

<h5><strong>Dependency Matrix</strong></h5>

Next we can look at the components in more detail and see how much they depend on each other:
<a href="https://mattwarrendotorg.files.wordpress.com/2014/07/dependencymatrixsnapshot.png" target="_blank"><img src="http://mattwarrendotorg.files.wordpress.com/2014/07/dependencymatrixsnapshot.png" alt="DependencyMatrixSnapshot" width="648" height="405" class="aligncenter size-full wp-image-890" /></a>

This is the classic image that I always associate with NDepend. Each row/column intersection shows how many members ??

On first viewing I found the screen a bit hard to understand, but fortunately there are useful tooltip windows that pop-up and give you more information when you hover over a particular cell. For instance we can see that the <em>Jil.Deserialize</em> namespace makes use of a lot of members within <em>Jil.Common</em>, which makes sense:

<a href="https://mattwarrendotorg.files.wordpress.com/2014/12/dependencymatrixsnapshot-with-tooltips.png"><img src="https://mattwarrendotorg.files.wordpress.com/2014/12/dependencymatrixsnapshot-with-tooltips.png" alt="DependencyMatrixSnapshot with ToolTips" width="660" height="380" class="aligncenter size-full wp-image-1054" /></a>

<h5><strong>Critical Rules Violations</strong></h5>

<a href="https://mattwarrendotorg.files.wordpress.com/2014/07/7-critical-rules-violated.png" target="_blank"><img src="http://mattwarrendotorg.files.wordpress.com/2014/07/7-critical-rules-violated.png" alt="7 Critical Rules Violated" width="402" height="300" class="aligncenter size-full wp-image-886" /></a>

<h4><strong>Summary</strong></h4>

<h4><strong>Rather than putting these in the blog, send these in an email</strong></h4>

<a href="https://mattwarrendotorg.files.wordpress.com/2014/07/analysis-settings-changed.png" target="_blank"><img src="http://mattwarrendotorg.files.wordpress.com/2014/07/analysis-settings-changed.png?w=660" alt="Analysis settings changed" width="660" height="378" class="aligncenter size-large wp-image-888" /></a>

<a href="https://mattwarrendotorg.files.wordpress.com/2014/07/analysis-settings-run-out-of-process-explanation.png" target="_blank"><img src="http://mattwarrendotorg.files.wordpress.com/2014/07/analysis-settings-run-out-of-process-explanation.png" alt="Analysis Settings - Run out of process (explanation)" width="323" height="108" class="aligncenter size-full wp-image-887" /></a>
