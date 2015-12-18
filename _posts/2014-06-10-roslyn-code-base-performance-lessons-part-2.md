---
layout: post
title: Roslyn code base - performance lessons (part 2)
comments: true
tags: [C#, open source, Performance, Performance Lessons, Roslyn]
---
In my <a href="{{base}}/2014/06/05/roslyn-code-base-performance-lessons-part-1/" target="_blank">previous post</a>, I talked about some of the general performance lessons that can be learnt from the <a href="https://roslyn.codeplex.com/" target="_blank">Roslyn</a>&nbsp;project. This post builds on that and looks at specific examples from the code base.

Generally the performance gains within Roslyn come down to one thing:

<blockquote>
  <strong>Ensuring the garbage collector&nbsp;does the least possible amount of work</strong>
</blockquote>

.NET is a managed language and one of the features that it provides is memory management, via the garbage collector (GC). However GC doesn't come for free, it has to find and inspect all the <em>live</em> objects (and their descendants) in the "mark" phrase, before cleaning up any <em>dead</em> objects in the "sweep" phase.

This is backed up by the guidance provided for <a href="https://roslyn.codeplex.com/wikipage?title=How%20to%20Contribute&amp;referringTitle=Documentation" target="_blank">contributing to Roslyn</a>, from the <strong>Coding Conventions</strong> section:

<blockquote>
  <ul>
  <li>Avoid allocations in compiler hot paths:
  
  <ul>
  <li>Avoid LINQ.</li>
  <li>Avoid using foreach over collections that do not have a struct enumerator.</li>
  <li>Consider using an object pool. There are many usages of object pools in the compiler to see an example.</li>
  </ul></li>
  </ul>
</blockquote>

It's interesting to see LINQ specifically called out, I think it's great and it does allow you to write much more declarative and readable code, in fact I'd find it hard to write C# code without it. But behind the scenes there are lots of hidden allocations going on and they are not always obvious. If you don't believe me, have a go at <a href="http://joeduffyblog.com/2010/09/06/the-premature-optimization-is-evil-myth/" target="_blank">Joe Duffy's quiz</a> (about 1/2 way through the blog post).

<h2><strong>Techniques used</strong></h2>

There are several techniques used in the Roslyn code base that either minimise or eliminate allocations, thus giving the GC less work to do. One important characteristic all of them share is that they are only applied to "Hot Paths" within the code. <a href="http://c2.com/cgi/wiki?PrematureOptimization" target="_blank">Optimising prematurely</a> is never recommended, nor is using optimisations on parts of your code that are rarely exercised. You need to measure and identify the <strong>bottlenecks</strong> and understand what are the <strong>hot-paths</strong> through your code, <strong>before</strong> you apply any optimisations.

<h4><strong>Avoiding allocations altogether</strong></h4>

Within the .NET framework there are many methods that cause allocations, for instance String.Trim(..) or any LINQ methods. To combat this we can find several examples where code was specifically re-written, for example:

<ul>
<li><code>// PERF: Avoid calling string.Trim() because that allocates a new substring</code>
from <a href="http://source.roslyn.codeplex.com/#Microsoft.CodeAnalysis.CSharp/Compiler/DocumentationCommentCompiler.cs#731" target="_blank">DocumentationCommentCompiler.cs</a></li>
<li><code>// PERF: Expansion of "assemblies.Any(a =</code>&gt; <code>a.NamespaceNames.Contains(namespaceName))" to avoid allocating a lambda.</code> 
from <a href="http://source.roslyn.codeplex.com/#Microsoft.CodeAnalysis.Workspaces/Shared/Extensions/IAssemblySymbolExtensions.cs#17" target="_blank">IAssemblySymbolExtensions.cs</a> </li>
<li><code>// PERF: Beware ImmutableArray.Builder.Sort allocates a Comparer wrapper object</code>
from <a href="http://source.roslyn.codeplex.com/#Microsoft.CodeAnalysis/Collections/ImmutableArrayExtensions.cs#439" target="_blank">ImmutableArrayExtensions.cs</a></li>
</ul>

Another good lesson is that each improvement is annotated with a "<code>// PERF:</code>" comment to explain the reasoning, I guess this is to prevent another developer coming along and re-factoring the code to something more readable (at the expense of performance).

<h4><strong>Object pooling with a Cache</strong></h4>

Another strategy used is <a>object pooling</a> where rather than <em>newing</em> up objects each time, old ones are re-used. Again this helps relieve pressure on the GC as less objects are allocated and the ones that are, stick around for a while (often the life-time of the program). This is a sweet-spot for the .NET GC, as per the advice from Rico Mariani's excellent <a href="http://msdn.microsoft.com/en-us/library/ms973837.aspx#dotnetgcbasics_topic4" target="_blank">Garbage Collector Basics and Performance Hints</a>:

<blockquote>
  <strong>Too Many Almost-Long-Life Objects</strong>
  Finally, perhaps the biggest pitfall of the generational garbage collector is the creation of many objects, which are neither exactly temporary nor are they exactly long-lived. These objects can cause a lot of trouble, because they will not be cleaned up by a gen0 collection (the cheapest), as they will still be necessary, and they might even survive a gen1 collection because they are still in use, but they soon die after that.
</blockquote>

We can see how this was handled in Roslyn in the code below from <a href="http://source.roslyn.codeplex.com/#Microsoft.CodeAnalysis.Workspaces/Formatting/StringBuilderPool.cs" target="_blank">StringBuilderPool</a>, that makes use of the more generic <a href="http://source.roslyn.codeplex.com/#Microsoft.CodeAnalysis.Workspaces/Utilities/ObjectPools/PooledObject.cs#12" target="_blank">ObjectPool</a> infrastructure and <a href="http://source.roslyn.codeplex.com/#Microsoft.CodeAnalysis.Workspaces/Utilities/ObjectPools/SharedPools.cs#c5905bf81da0a7e8" target="_blank">helper classes</a>. Obviously it was such a widely used pattern that they build a generic class to handle the bulk of the work, making it easy to write an implementation for a specific type, including StringBuilder, Dictionary, HashSet and Stream.

``` csharp
internal static class StringBuilderPool
{
  public static StringBuilder Allocate()
  {
    return SharedPools.Default<StringBuilder>().AllocateAndClear();
  }

  public static void Free(StringBuilder builder)
  {
    SharedPools.Default<StringBuilder>().ClearAndFree(builder);
  }

  public static string ReturnAndFree(StringBuilder builder)
  {
    SharedPools.Default<StringBuilder>().ForgetTrackedObject(builder);
    return builder.ToString();
  }
}
```

Having a class like this makes sense, a large part of compiling is parsing and building strings. Not only do they use a StringBuilder to save lots of temporary String allocations, but they also re-use StringBuilder objects to save the GC the work of having to clean up these.

Interestingly enough this technique has also been used inside the .NET framework itself, you can see this in the code below from <a href="http://referencesource.microsoft.com/#mscorlib/system/text/stringbuildercache.cs#40" target="_blank">StringBuilderCache.cs</a>. Again, the comment shows that the optimisation was debated and a trade-off between memory usage and efficiency was weighed up.

``` csharp
internal static class StringBuilderCache
{
  // The value 360 was chosen in discussion with performance experts as a compromise between using
  // as little memory (per thread) as possible and still covering a large part of short-lived
  // StringBuilder creations on the startup path of VS designers.
  private const int MAX_BUILDER_SIZE = 360;

  [ThreadStatic]
  private static StringBuilder CachedInstance;

  public static StringBuilder Acquire(int capacity = StringBuilder.DefaultCapacity)
  {
    if(capacity <= MAX_BUILDER_SIZE)
    {
      StringBuilder sb = StringBuilderCache.CachedInstance;
      if (sb != null)
      {
        // Avoid stringbuilder block fragmentation by getting a new StringBuilder
        // when the requested size is larger than the current capacity
        if (capacity <= sb.Capacity)
        {
          StringBuilderCache.CachedInstance = null;
          sb.Clear();
          return sb;
        }
      }
    }
    return new StringBuilder(capacity);
  }

  public static void Release(StringBuilder sb)
  {
    if (sb.Capacity <= MAX_BUILDER_SIZE)
    {
      StringBuilderCache.CachedInstance = sb;
    }
  }

  public static string GetStringAndRelease(StringBuilder sb)
  {
    string result = sb.ToString();
    Release(sb);
    return result;
  }
}
```

Which you then use like this:

``` csharp
var builder = StringBuilderCache.Acquire();
// use the builder as normal, i.e. builder.Append(..)
string data = StringBuilderCache.GetStringAndRelease(builder);
```

<h4><strong>Specialised Collections</strong> <a name="SpecialisedCollections"></a></h4>

Finally there are several examples where custom collections were written to ensure that excessive memory overhead wasn't created. For instance in the code below from <a href="http://source.roslyn.codeplex.com/#Microsoft.CodeAnalysis.CSharp/Symbols/Metadata/PE/PENamedTypeSymbol.cs#673" target="_blank">PENamesTypeSymbol.cs</a>, you can clearly see that specific collections are re-used whenever there are 0, 1 or up-to 6 items. 
The comment clearly spells out the trade-off, so whilst these collections aren't as efficient when doing lookups (<em>O(n)</em> v <em>O(log n)</em>), they are more efficient in terms of space and so the trade-off is worth it. It's also interesting to note that the size of <em>6</em> wasn't chose randomly, in their tests they found that 50% of the time there were 6 items or fewer, so these optimisations will give a performance gain in the <em>majority</em> of scenarios.

``` csharp
private static ICollection<string> CreateReadOnlyMemberNames(HashSet<string> names)
{
  switch (names.Count)
  {
    case 0:
      return SpecializedCollections.EmptySet<string>();
    case 1:
      return SpecializedCollections.SingletonCollection(names.First());
    case 2:
    case 3:
    case 4:
    case 5:
    case 6:
      // PERF: Small collections can be implemented as ImmutableArray.
      // While lookup is O(n), when n is small, the memory savings are more valuable.
      // Size 6 was chosen because that represented 50% of the names generated in the Picasso end to end.
      // This causes boxing, but that's still superior to a wrapped HashSet
      return ImmutableArray.CreateRange(names);
    default:
      return SpecializedCollections.ReadOnlySet(names);
  }
}
```

<h4><strong>Summary</strong></h4>

All in all there are some really nice tricks and examples of high-performance code to be found in the Roslyn code base. But the main lesson is that you should <strong>never</strong> be applying these for the sake of it or because they look clever. They should only be used in conjunction with proper performance testing that identifies the parts of your code that cause it to run slower than your performance goals.

Interestingly enough StackOverflow faced a similar issue a few years back, see <a href="http://samsaffron.com/archive/2011/10/28/in-managed-code-we-trust-our-recent-battles-with-the-net-garbage-collector" target="_blank">In managed code we trust, our recent battles with the .NET Garbage Collector</a>, but that's a subject for another post, stay tuned!

<hr />

<strong>Update:</strong>&nbsp;Since first writing this post, I've found out about an excellent talk <a href="http://channel9.msdn.com/Events/TechEd/NorthAmerica/2013/DEV-B333" target="_blank">Essential Truths Everyone Should Know about Performance in a Large Managed Codebase</a>, in which Dustin Campbell (a Roslyn Program Manager), talks&nbsp;about how they improved the performance of Roslyn. I can't recommend it enough.
