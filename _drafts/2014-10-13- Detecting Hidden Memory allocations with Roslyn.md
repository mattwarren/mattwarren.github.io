---
layout: post
title: Detecting Hidden Memory allocations with Roslyn
date: 2014-10-13 16:31
author: matthewwarren
comments: true
categories: [Uncategorized]
---
<strong>Disclaimer - don't make any changes until you've profiled, this tool is just for information purposes</strong>

Unless there is a [HotPath] attribute, then show allocations in that method only!

https://github.com/mattwarren/RoslynHeapAllocations

ReSharper HeapViewer
- http://blog.jetbrains.com/dotnet/2014/07/17/unusual-ways-of-boosting-up-app-performance-strings/
- http://blog.jetbrains.com/dotnet/2014/07/10/unusual-ways-of-boosting-up-app-performance-boxing-and-collections/

https://roslyn.codeplex.com/discussions/544763
specifically https://roslyn.codeplex.com/discussions/544763#PostContent_1251621
and also https://roslyn.codeplex.com/discussions/541953

Hey, great minds think alike, I've been working on exactly this since the idea got posted higher up this thread, you can see the (work in progress) code here. At the moment it just works standalone, but next on my list is to use the Roslyn VS extension points and implement a Diagnostic Analyser. I hadn't thought about allowing [HotPath] attributes, that's a good idea.

I must also give credit to the Resharper HeapView plugin (source code) that I'm verifying my code against, it does a very good job of identifying heap allocations.

At the moment the code uses a mixture of Roslyn and Cecil, it does the following:

<ol>
<li>Parses the code using Roslyn and CSharpSyntaxTree.ParseText(..)</li>
<li>Emit the IL and PDB (in-memory) using CSharpCompilation.Emit</li>
<li>Processes the IL using Cecil (couldn't see a way to do this using Roslyn)</li>
<li>Scans the IL, looking for the following:
a. Box and Newarr IL instructions (easy)
b. Newobj instruction (but only for reference types)
c. Callvirt instruction
  a. To identify when GetEnumerator is called and it returns a Value type (that will then be boxed)
  b. To see when GetHashCode() is called on a Value type that doesn't override it (have to also find the constrained IL instruction)</li>
</ol>

Basically I'm trying to identify all the issues outlined in this talk (slides). You can see the corresponding unit tests and they all currently pass

<a href="https://mattwarrendotorg.files.wordpress.com/2014/10/roslyn-hidden-allocations-plugin-list-v-ilist-sample.png"><img src="https://mattwarrendotorg.files.wordpress.com/2014/10/roslyn-hidden-allocations-plugin-list-v-ilist-sample.png" alt="Roslyn Hidden Allocations plugin - List v IList sample" width="885" height="292" class="aligncenter size-full wp-image-968" /></a>
