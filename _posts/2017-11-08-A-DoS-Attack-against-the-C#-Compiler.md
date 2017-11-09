---
layout: post
title: A DoS Attack against the C# Compiler
comments: true,
tags: [C#, Open Source, Roslyn]
---

Generics in C# are certainly very useful and I find it amazing that [we almost didn't get them](https://blogs.msdn.microsoft.com/dsyme/2011/03/15/netc-generics-history-some-photos-from-feb-1999/):

> What would the cost of inaction have been? What would the cost of failure have been? No generics in C# 2.0? No LINQ in C# 3.0? No TPL in C# 4.0? No Async in C# 5.0? No F#? Ultimately, an erasure model of generics would have been adopted, as for Java, since the CLR team would never have pursued a in-the-VM generics design without external help.

So a big thanks is due to [Don Syme](https://www.microsoft.com/en-us/research/people/dsyme/) and the rest of the team at Microsoft Research in Cambridge!

But as well as being useful, I also find some usages of generics mind-bending, for instance I'm still not sure what this code *actually* means or how to explain it in words:

``` csharp
class Blah<T> where T : Blah<T>
```

As always, reading an Eric Lippert post [helps a lot](https://blogs.msdn.microsoft.com/ericlippert/2011/02/03/curiouser-and-curiouser/), but even he recommends against using this specific 'circular' pattern.

----

Recently I spoke at the [CORESTART 2.0](https://www.corestart.cz/) conference in Prague, giving a talk on ['Microsoft and Open-Source – A 'Brave New World'](https://www.corestart.cz/#page-speeches). Whilst I was there I met the very knowledgeable [Jiri Cincura](https://twitter.com/cincura_net), who blogs at [tabs ↹ over ␣ ␣ ␣ spaces](https://www.tabsoverspaces.com/). He was giving a great talk on 'C# 7.1 and 7.2 features', but also shared with me an excellent code snippet that he called 'Crazy Class':

``` csharp
class Class<A, B, C, D, E, F>
{
    class Inner : Class<Inner, Inner, Inner, Inner, Inner, Inner>
    {
        Inner.Inner.Inner.Inner.Inner.Inner.Inner.Inner.Inner inner;
    }
}
```

He said:

> this is the class that takes crazy amount of time to compile. You can add more `Inner.Inner.Inner...` to make it even longer (and also generic parameters).

After a big of digging around I found that someone else had noticed this, see the StackOverflow question [Why does field declaration with duplicated nested type in generic class results in huge source code increase?](https://stackoverflow.com/questions/14177225/why-does-field-declaration-with-duplicated-nested-type-in-generic-class-results/14178014) Helpfully the 'accepted answer' explains what is going on:

> When you combine these two, the way you have done, something interesting happens. The type `Outer<T>.Inner` is not the same type as `Outer<T>.Inner.Inner`. `Outer<T>.Inner` is a subclass of `Outer<Outer<T>.Inner>` while `Outer<T>.Inner.Inner` is a subclass of `Outer<Outer<Outer<T>.Inner>.Inner>`, which we established before as being different from `Outer<T>.Inner`. So `Outer<T>.Inner.Inner` and `Outer<T>.Inner` **are referring to different types**.
>
> When generating IL, the compiler always uses fully qualified names for types. You have cleverly found a way to refer to types with names whose lengths that grow at **exponential rates**. That is why as you increase the generic arity of `Outer` or add additional levels `.Y` to the field `field` in `Inner` the output IL size and compile time grow so quickly.

**Clear? Good!!**

You probably have to be Jon Skeet, Eric Lippert or a member of the [C# Language Design Team](https://github.com/dotnet/csharplang/blob/057c1fde486803b9e7d33df70dcb84fefa6c89b1/meetings/2015/LDM-2015-01-21.md#design-team) (yay, 'Matt Warren') to really understand what's going on here, but that doesn't stop the rest of us having fun with the code!!

<strong style="color:red">I can't think of any reason why you'd actually want to write code like this, so please don't!! (or at least if you do, don't blame me!!)</strong>

For a simple idea of what's actually happening, lets take this code (with only 2 'Levels'):

``` csharp
class Class<A, B, C, D, E, F>
{
    class Inner : Class<Inner, Inner, Inner, Inner, Inner, Inner>
    {
        Inner.Inner inner;
    }
}
```

The 'decompiled' version actually looks like this:

``` csharp
internal class Class<A, B, C, D, E, F>
{
    private class Inner : Class<Class<A, B, C, D, E, F>.Inner, 
                                Class<A, B, C, D, E, F>.Inner, 
                                Class<A, B, C, D, E, F>.Inner, 
                                Class<A, B, C, D, E, F>.Inner, 
                                Class<A, B, C, D, E, F>.Inner, 
                                Class<A, B, C, D, E, F>.Inner>
    {
        private Class<Class<Class<A, B, C, D, E, F>.Inner, 
                            Class<A, B, C, D, E, F>.Inner, 
                            Class<A, B, C, D, E, F>.Inner, 
                            Class<A, B, C, D, E, F>.Inner, 
                            Class<A, B, C, D, E, F>.Inner, 
                            Class<A, B, C, D, E, F>.Inner>.Inner, 
                        Class<Class<A, B, C, D, E, F>.Inner, 
                            Class<A, B, C, D, E, F>.Inner, 
                            Class<A, B, C, D, E, F>.Inner, 
                            Class<A, B, C, D, E, F>.Inner, 
                            Class<A, B, C, D, E, F>.Inner, 
                            Class<A, B, C, D, E, F>.Inner>.Inner, 
                        Class<Class<A, B, C, D, E, F>.Inner, 
                            Class<A, B, C, D, E, F>.Inner, 
                            Class<A, B, C, D, E, F>.Inner, 
                            Class<A, B, C, D, E, F>.Inner, 
                            Class<A, B, C, D, E, F>.Inner, 
                            Class<A, B, C, D, E, F>.Inner>.Inner, 
                        Class<Class<A, B, C, D, E, F>.Inner, 
                            Class<A, B, C, D, E, F>.Inner, 
                            Class<A, B, C, D, E, F>.Inner, 
                            Class<A, B, C, D, E, F>.Inner, 
                            Class<A, B, C, D, E, F>.Inner, 
                            Class<A, B, C, D, E, F>.Inner>.Inner, 
                        Class<Class<A, B, C, D, E, F>.Inner, 
                            Class<A, B, C, D, E, F>.Inner, 
                            Class<A, B, C, D, E, F>.Inner, 
                            Class<A, B, C, D, E, F>.Inner, 
                            Class<A, B, C, D, E, F>.Inner, 
                            Class<A, B, C, D, E, F>.Inner>.Inner, 
                        Class<Class<A, B, C, D, E, F>.Inner, 
                            Class<A, B, C, D, E, F>.Inner, 
                            Class<A, B, C, D, E, F>.Inner, 
                            Class<A, B, C, D, E, F>.Inner, 
                            Class<A, B, C, D, E, F>.Inner, 
                            Class<A, B, C, D, E, F>.Inner>.Inner>.Inner inner;
    }
}
```

Wow, no wonder things go wrong quickly!!

----

### Exponential Growth

Firstly let's check the claim of **exponential growth**, if you don't remember your [Big O notation](https://en.wikipedia.org/wiki/Big_O_notation) you can also think of this as `O(very, very bad)`!!

To test this out, I'm going to compile the code above, but vary the 'level' each time by adding a new `.Inner`, so 'Level 5' looks like this:

``` csharp
Inner.Inner.Inner.Inner.Inner inner;
```

'Level 6' like this, and so on

``` csharp
Inner.Inner.Inner.Inner.Inner.Inner inner;
```

We then get the following results:

| Level | Compile Time (secs) | Working set (KB) | Binary Size (Bytes) |
|-------|--------------------:|-----------------:|--------------------:|
|  5 |   1.15 |    54,288 |     135,680 |
|  6 |   1.22 |    59,500 |     788,992 |
|  7 |   2.00 |    70,728 |   4,707,840 |
|  8 |   6.43 |   121,852 |  28,222,464 |
|  9 |  33.23 |   405,472 | 169,310,208 |
| 10 | 202.10 | 2,141,272 |   **CRASH** |

If we look at these results in graphical form, it's very obvious what's going on

[![Crazy Class - Compile Time]({{ base }}/images/2017/11/Crazy Class - Compile Time.png)]({{ base }}/images/2017/11/Crazy Class - Compile Time.png)

[![Crazy Class - Working Set]({{ base }}/images/2017/11/Crazy Class - Working Set.png)]({{ base }}/images/2017/11/Crazy Class - Working Set.png)

[![Crazy Class - Binary Size]({{ base }}/images/2017/11/Crazy Class - Binary Size.png)]({{ base }}/images/2017/11/Crazy Class - Binary Size.png)

(the dotted lines are a 'best fit' trend-line and they are exponential)

If I compile the code with `dotnet build` (version 2.0.0), things go really wrong at 'Level 10' and the compiler throws an error ([full stack trace](https://gist.github.com/mattwarren/d6fd747792cf1e98cba4679bf1398041)):

``` csharp
System.ArgumentOutOfRangeException: Specified argument was out of the range of valid values.
```

Which looks similar to [Internal compiler error when creating Portable PDB files #3866](https://github.com/Microsoft/visualfsharp/issues/3866).

However your mileage may vary, when I ran the code in Visual Studio 2015 it threw an `OutOfMemoryException` instead and then promptly restarted itself!! I assume this is because [VS is a 32-bit application](https://blogs.msdn.microsoft.com/ricom/2009/06/10/visual-studio-why-is-there-no-64-bit-version-yet/) and it runs out of memory before it can go really wrong!

----

### Mono Compiler

As a comparison, here's the results from the [Mono compiler](https://github.com/mono/), thanks to [Egor Bogatov](https://twitter.com/EgorBo) for putting them together.

| Level | Compile Time (secs) | Memory Usage (Bytes) |
|-------|--------------------:|---------------------:|
|  5 |  0.480 |       134,144 |
|  6 |  0.502 |       786,944 |
|  7 |  0.745 |     4,706,304 |
|  8 |  2.053 |    28,220,928 |
|  9 | 10.134 |   169,308,672 |
| 10 | 57.307 | 1,015,835,136 |

At 'Level 10' it [produced a 968.78 Mb binary](https://twitter.com/EgorBo/status/928388080519741445)!!

[![Mono Compiler - Level 10]({{ base }}/images/2017/11/Mono Compiler - Level 10.jpg)]({{ base }}/images/2017/11/Mono Compiler - Level 10.jpg)

----

### Profiling the Compiler

Finally, I want to look at just where the compiler is spending all it's time. From the results above we saw that it was taking **over 3 minutes** to compile a simple program, with a peak memory usage of **2.14 GB**, so what was it actually doing??

Well clearly there's lots of `Types` involved and the Compiler seems happy for you to write this code, so I guess it needs to figure it all out. Once it's done that, it then needs to write all this `Type` metadata out to a .dll or .exe, which can be **100's of MB** in size.

At a high-level the profiling summary produce by VS looks like this (click for full-size image):

[![Profiling Report]({{ base }}/images/2017/11/Profiling Report.png)]({{ base }}/images/2017/11/Profiling Report.png)

However if we take a bit of a close look, we can see the 'hot-path' is inside the `SerializeTypeReference(..)` method in [Compilers/Core/Portable/PEWriter/MetadataWriter.cs](https://github.com/dotnet/roslyn/blob/master/src/Compilers/Core/Portable/PEWriter/MetadataWriter.cs#L3788-L3810)

[![Profiling - Hot Path]({{ base }}/images/2017/11/Profiling - Hot Path.png)]({{ base }}/images/2017/11/Profiling - Hot Path.png)

----

### Summary

I'm a bit torn about this, it is clearly an 'abuse' of generics!!

In some ways I think that it **shouldn't** be fixed, it seems better that the compiler encourages you to **not** write code like this, rather than making is possible!!

<strong style="color:red">So if it takes 3 mins to compile your code, allocates 2GB of memory and then crashes, take that as a warning!!</strong>

----

Discuss this post on [Hacker News](https://news.ycombinator.com/item?id=15654970), [/r/programming](https://www.reddit.com/r/programming/comments/7bn21r/a_dos_attack_against_the_c_compiler_performance/) and [/r/csharp](https://www.reddit.com/r/csharp/comments/7bn206/a_dos_attack_against_the_c_compiler_performance/)

 


