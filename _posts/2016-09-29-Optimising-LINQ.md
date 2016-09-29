---
layout: post
title:  Optimising LINQ
comments: true
tags: [LINQ, Benchmarking, Performance, Optimisations]
date: 2016-09-29
excerpt: <p>What’s the problem with LINQ? As outlined by Joe Duffy, LINQ introduces inefficiencies in the form of hidden allocations, from <i>The ‘premature optimization is evil’ myth</i>:</p>
---

### What's the problem with LINQ?

As outlined by [Joe Duffy](https://twitter.com/xjoeduffyx), LINQ introduces inefficiencies in the form of **hidden allocations**, from [The 'premature optimization is evil' myth](http://joeduffyblog.com/2010/09/06/the-premature-optimization-is-evil-myth/):

> To take an example of a technology that I am quite supportive of, but that makes writing inefficient code very easy, let’s look at LINQ-to-Objects. Quick, how many inefficiencies are introduced by this code?
> 
>``` csharp
> int[] Scale(int[] inputs, int lo, int hi, int c) {
>    var results = from x in inputs
>                  where (x >= lo) && (x <= hi)
>                  select (x * c);
>    return results.ToArray();
>}
>```

Good question, who knows, probably only [Jon Skeet](http://stackoverflow.com/users?tab=Reputation&filter=all) can tell just by looking at the code!! So to fully understand the problem we need to take a look at what the compiler is doing for us *behind-the-scenes*, the code above ends up looking something like this:

``` csharp
private int[] Scale(int[] inputs, int lo, int hi, int c)
{
    <>c__DisplayClass0_0 CS<>8__locals0;
    CS<>8__locals0 = new <>c__DisplayClass0_0();
    CS<>8__locals0.lo = lo;
    CS<>8__locals0.hi = hi;
    CS<>8__locals0.c = c;
    return inputs
        .Where<int>(new Func<int, bool>(CS<>8__locals0.<Scale>b__0))
        .Select<int, int>(new Func<int, int>(CS<>8__locals0.<Scale>b__1))
        .ToArray<int>();
}

[CompilerGenerated]
private sealed class c__DisplayClass0_0
{
    public int c;
    public int hi;
    public int lo;

    internal bool <Scale>b__0(int x)
    {
        return ((x >= this.lo) && (x <= this.hi));
    }

    internal int <Scale>b__1(int x)
    {
        return (x * this.c);
    }
}
```

As you can see we have an extra `class` allocated and some `Func's` to perform the actual logic. But this doesn't even account for the overhead of the `ToArray()` call, using iterators and calling LINQ methods via dynamic dispatch. As an aside, if you are interested in finding out more about closures it's worth reading Jon Skeet's excellent blog post ["The Beauty of Closures"](http://csharpindepth.com/Articles/Chapter5/Closures.aspx).

So there's *a lot* going on behind the scenes, but it is actually possible to be shown these *hidden allocations* directly in Visual Studio. If you install the excellent [Heap Allocation Viewer](https://blog.jetbrains.com/dotnet/2014/06/06/heap-allocations-viewer-plugin/) plugin for Resharper, you will get the following tool-tip right in the IDE:

[![Heap Allocations Viewer - Joe Duffy Scale Method]({{ base }}/images/2016/09/LINQ Optimisations - Heap Allocations Viewer - Joe Duffy Scale Method.png)]({{ base }}/images/2016/09/LINQ Optimisations - Heap Allocations Viewer - Joe Duffy Scale Method.png)

As useful as it is though, I wouldn't recommend turning this on all the time as seeing all those <font color="#FF0000" style="font-weight: bold;">red lines</font> under your code tends to make you a bit paranoid!!

Now before we look at some ways you can reduce the impact of LINQ, it's worth pointing out that LINQ itself does some pretty neat tricks (HT to Oren Novotny for [pointing this out to me](https://twitter.com/onovotny/status/777785367718141952)). For instance the common pattern of having a `Where(..)` followed by a `Select(..)` is [optimised so that only a single iterator is used](https://github.com/dotnet/corefx/blob/master/src/System.Linq/src/System/Linq/Where.cs#L359-L422), not two as you would expect. Likewise two `Select(..)` statements in a row are combined, [so that only a one iterator is needed](https://github.com/dotnet/corefx/blob/master/src/System.Linq/src/System/Linq/Select.cs#L86-L89).

----

### A note on micro-optimisations

Whenever I write a post like this I inevitably get comments complaining that it's an "*premature optimisation*" or something similar. So this time I just want to add the following caveat:

> I am **not** in any way advocating that LINQ is a bad thing, I think it's fantastic feature of the C# language!

Also:

> Please **do not** re-write any of your code based purely on the results of some micro-benchmarks!

As I explain in [one of my talks](http://www.skillsmatter.com/skillscasts/7809-performance-is-a-feature), you should always **profile** first and then **benchmark**. If you do it the other way round there is a temptation to optimise where it's not needed.

<div style="text-align:center;">
<iframe src="//www.slideshare.net/slideshow/embed_code/key/LdInjrOoAs9K7U?startSlide=22" width="595" height="485" frameborder="0" marginwidth="0" marginheight="0" scrolling="no" style="border:1px solid #CCC; border-width:1px; margin-bottom:5px; max-width: 100%;" allowfullscreen> </iframe> <div style="margin-bottom:5px"> <strong> <a href="//www.slideshare.net/mattwarren/performance-is-a-feature-london-net-user-group" title="Performance is a feature! - London .NET User Group" target="_blank">Performance is a feature! - London .NET User Group</a> </strong> from <strong><a target="_blank" href="//www.slideshare.net/mattwarren">Matt Warren</a></strong> </div>
</div>

Having said all that, the C# Compiler (Roslyn) [coding guidelines](https://github.com/dotnet/roslyn/wiki/Contributing-Code#coding-conventions) do actually state the following:

> Avoid allocations in compiler hot paths:
> - **Avoid LINQ.**
> - Avoid using foreach over collections that do not have a struct enumerator.
> - Consider using an object pool. There are many usages of object pools in the compiler to see an example.

Which is slightly ironic considering this advice comes from the same people who conceived and designed LINQ in the first place! But as outlined in the excellent talk ["Essential Truths Everyone Should Know about Performance in a Large Managed Codebase"](https://channel9.msdn.com/Events/TechEd/NorthAmerica/2013/DEV-B333), they found LINQ has a noticeable cost.

Note: **Hot paths** are another way of talking about the **critical 3%** from the [famous Donald Knuth quote](http://c2.com/cgi/wiki?PrematureOptimization):

> We should forget about small efficiencies, say about 97% of the time: premature optimization is the root of all evil. **Yet we should not pass up our opportunities in that critical 3%.** 

----

### RoslynLinqRewrite and LinqOptimizer

Now clearly we could manually re-write any LINQ statement into an iterative version if we were concerned about performance, but wouldn't it be much nicer if there were tools that could do the hard work for us? Well it turns out there are!

First up is [RoslynLinqRewrite](https://github.com/antiufo/roslyn-linq-rewrite), as per the project page:

> This tool compiles C# code by first rewriting the syntax trees of LINQ expressions using plain procedural code, minimizing allocations and dynamic dispatch.

Also available is the [Nessos LinqOptimizer](http://nessos.github.io/LinqOptimizer/) which is:

> An automatic query optimizer-compiler for Sequential and Parallel LINQ. LinqOptimizer compiles declarative LINQ queries into fast loop-based imperative code. The compiled code has fewer virtual calls and heap allocations, better data locality and speedups of up to 15x (Check the [Performance](https://github.com/nessos/LinqOptimizer/wiki/Performance) page).

At a high-level, the main differences between them are:

- RoslynLinqRewrite
	- works at **compile** time (but prevents incremental compilation of your project)
	- no code changes, except if you want to opt out via `[NoLinqRewrite]`
- LinqOptimiser 
    - works at **run-time** 
    - forces you to add `AsQueryExpr().Run()` to LINQ methods
    - optimises Parallel LINQ
     
In the rest of the post will look at the tools in more detail and analyse their performance.

### Comparison of LINQ support

Obviously before choosing either tool you want to be sure that it's actually going to optimise the LINQ statements you have in your code base. However neither tool supports the whole range of available [LINQ Query Expressions](https://msdn.microsoft.com/en-us/library/bb397927.aspx), as the chart below illustrates:

{::nomarkdown}  
<span class="compactTable">
{:/}

Method | [RoslynLinqRewrite](https://github.com/antiufo/roslyn-linq-rewrite#supported-linq-methods) | [LinqOptimiser](https://github.com/nessos/LinqOptimizer/blob/master/src/LinqOptimizer.CSharp/Extensions.cs#L304-L604) | Both?
------:|:-----------------:|:-------------:|:----:
Select 						| <span class="True">✓</span>  | <span class="True">✓</span>  | Yes |
Where  						| <span class="True">✓</span>  | <span class="True">✓</span>  | Yes |
Reverse 					| <span class="True">✓</span>  | <span class="False">✗</span> |
Cast 						| <span class="True">✓</span>  | <span class="False">✗</span> |
OfType 						| <span class="True">✓</span>  | <span class="False">✗</span> |
First/FirstOrDefault		| <span class="True">✓</span>  | <span class="False">✗</span> |
Single/SingleOrDefault		| <span class="True">✓</span>  | <span class="False">✗</span> |
Last/LastOrDefault			| <span class="True">✓</span>  | <span class="False">✗</span> |
ToList 						| <span class="True">✓</span>  | <span class="True">✓</span>  | Yes |
ToArray 					| <span class="True">✓</span>  | <span class="True">✓</span>  | Yes |
ToDictionary 				| <span class="True">✓</span>  | <span class="False">✗</span> |
Count 						| <span class="True">✓</span>  | <span class="True">✓</span>  | Yes |
LongCount 					| <span class="True">✓</span>  | <span class="False">✗</span> |
Any 						| <span class="True">✓</span>  | <span class="False">✗</span> |
All 						| <span class="True">✓</span>  | <span class="False">✗</span> |
ElementAt/ElementAtOrDefault| <span class="True">✓</span>  | <span class="False">✗</span> |
Contains 					| <span class="True">✓</span>  | <span class="False">✗</span> |
ForEach 					| <span class="True">✓</span>  | <span class="True">✓</span>  | Yes |
Aggregate 					| <span class="False">✗</span> | <span class="True">✓</span>  |
Sum 						| <span class="False">✗</span> | <span class="True">✓</span>  |
SelectMany					| <span class="False">✗</span> | <span class="True">✓</span>  |
Take/TakeWhile				| <span class="False">✗</span> | <span class="True">✓</span>  |
Skip/SkipWhile				| <span class="False">✗</span> | <span class="True">✓</span>  |
GroupBy						| <span class="False">✗</span> | <span class="True">✓</span>  |
OrderBy/OrderByDescending	| <span class="False">✗</span> | <span class="True">✓</span>  |
ThenBy/ThenByDescending		| <span class="False">✗</span> | <span class="True">✓</span>  |
**Total**					| **22** | **18** | **6** |

{::nomarkdown}  
</span>
{:/}

----

### Performance Results

Finally we get to the main point of this blog post, how do the different tools perform, do they achieve their stated goals of optimising LINQ queries and reducing allocations?

Let's start with a very common scenario, using LINQ to filter and map a sequence of numbers, i.e. in C#:

``` csharp
var results = items.Where(i => i % 10 == 0)
                   .Select(i => i + 5);
```

We will compare the LINQ code above with the 2 optimised versions, plus an iterative form that will serve as our baseline. Here are the results:

[![LINQ Optimisations - Where Select Benchmarks]({{ base }}/images/2016/09/LINQ Optimisations - Where Select Benchmarks.png)]({{ base }}/images/2016/09/LINQ Optimisations - Where Select Benchmarks.png)

(Full [benchmark code](https://gist.github.com/mattwarren/e528bc7c43864baad93ff33eb038005b)) 

The first things that jumps out is that the **LinqOptimiser** version is allocating **a lot** of memory compared to the others. To see why this is happening we need to look at the code it generates, which looks something like this:

``` csharp
IEnumerable<int> LinqOptimizer(int [] input)
{
    var collector = new Nessos.LinqOptimizer.Core.ArrayCollector<int>();
    for (int counter = 0; counter < input.Length; counter++)
    {
        var i = input[counter];
        if (i % 10 == 0)
        {
            var result = i + 5;
            collector.Add(result);
        }
    }
    return collector;
}
```

This issue is that by default, `ArrayCollector` allocates a `int[1024]` as it's [backing storage](https://github.com/nessos/LinqOptimizer/blob/7ccb3a5c032daab18a1438299cae5a7a53e7fc26/src/LinqOptimizer.Core/Collector.fs#L19-L20), hence the excessive allocations!

By contrast **RoslynLinqRewrite** optimises the code like so:

``` csharp
IEnumerable<int> RoslynLinqRewriteWhereSelect_ProceduralLinq1(int[] _linqitems)
{
    if (_linqitems == null)
        throw new System.ArgumentNullException();
    for (int _index = 0; _index < _linqitems.Length; _index++)
    {
        var _linqitem = _linqitems[_index];
        if (_linqitem % 10 == 0)
        {
            var _linqitem1 = _linqitem + 5;
            yield return _linqitem1;
        }
    }
}
```

Which is much more sensible! By using the `yield` keyword it gets the compiler to do the hard work and so doesn't have to allocate a temporary list to store the results in. This means that it is *streaming* the values, in the same way the original LINQ code does.

Lastly we'll look at one more example, this time using a `Count()` expression, i.e.  

``` csharp
items.Where(i => i % 10 == 0)
     .Count();
```

Here we can clearly see that both tools significantly reduce the allocations compared to the original LINQ code:

[![LINQ Optimisations - Count Benchmarks]({{ base }}/images/2016/09/LINQ Optimisations - Count Benchmarks.png)]({{ base }}/images/2016/09/LINQ Optimisations - Count Benchmarks.png)

(Full [benchmark code](https://gist.github.com/mattwarren/4c2b2e3585f8b9ad0f95a2a676c552bd)) 

----

### Future options

However even though using **RoslynLinqRewrite** or **LinqOptimiser** is pretty painless, we still have to install a 3rd party library into our project. 

Wouldn't it be even nicer if the .NET compiler, JITter and/or runtime did all the optimisations for us?

Well it's certainly possible, as Joe Duffy explains in his [QCon New York talk](https://www.infoq.com/news/2016/06/systems-programming-qcon) and [work has already started](https://github.com/dotnet/coreclr/pull/6653) so maybe we won't have to wait too long!! 
 
----

Discuss this post in [/r/programming](https://www.reddit.com/r/programming/comments/551lqy/optimising_linq/)

----

### Further Reading:

- Options for LINQ optimisation from [State / Direction of C# as a High-Performance Language](https://github.com/dotnet/roslyn/issues/10378#issuecomment-247538865):
	- Escape analysis only (JIT)
	- LINQ calls are optimized by the JIT
	- LINQ calls are optimized by the compiler
- An attempt to [manually optimise LINQ](https://github.com/dotnet/roslyn/issues/10378#issuecomment-248556947)
- LinqOptimiser [performance results](https://github.com/nessos/LinqOptimizer/wiki/Performance)
- RoslynLinqRewrite
  - [r/charp discussion](https://www.reddit.com/r/csharp/comments/5310m4/roslynlinqrewrite_compiles_linq_expressions_to/)
  - [r/programming discussion](https://www.reddit.com/r/programming/comments/53nw6w/roslynlinqrewrite_optimize_linq_code_to/)
  - [HackerNews discussion](https://news.ycombinator.com/item?id=12544987)