---
layout: post
title: The CLR Thread Pool 'Thread Injection' Algorithm
comments: true
tags: [.NET, CLR, Open Source, Research]
excerpt: <p>As part of a never-ending quest to explore the <a href="/2017/03/23/Hitchhikers-Guide-to-the-CoreCLR-Source-Code/">CoreCLR source code</a> I stumbled across the intriguing titled <a href="https://github.com/dotnet/coreclr/blob/master/src/vm/hillclimbing.cpp">‘HillClimbing.cpp’</a> source file. This post explains what it does and why.</p>
---

**If you're near London at the end of April, I'll be speaking at [ProgSCon 2017](http://2017.progscon.co.uk/) on [Microsoft and Open-Source – A ‘Brave New World’](http://2017.progscon.co.uk/cr3ativconference/microsoft-and-open-source-a-brave-new-world/). ProgSCon is 1-day conference, with talks [covering an eclectic range of topics](http://2017.progscon.co.uk/home/talks/), you'll learn lots!!**

----

As part of a never-ending quest to explore the [CoreCLR source code]({{ base }}/2017/03/23/Hitchhikers-Guide-to-the-CoreCLR-Source-Code/) I stumbled across the intriguing titled ['HillClimbing.cpp'](https://github.com/dotnet/coreclr/blob/master/src/vm/hillclimbing.cpp) source file. This post explains what it does and why.

### What is 'Hill Climbing'

It turns out that 'Hill Climbing' is a general technique, from the Wikipedia page on the [Hill Climbing Algorithm][Hill Climbing Algorithm]:

> In computer science, hill climbing is a mathematical optimization technique which belongs to the family of local search. **It is an iterative algorithm that starts with an arbitrary solution to a problem, then attempts to find a better solution by incrementally changing a single element of the solution**. If the change produces a better solution, an incremental change is made to the new solution, repeating until no further improvements can be found.

But in the context of the CoreCLR, 'Hill Climbing' (HC) is used to control the rate at which threads are added to the Thread Pool, from the [MSDN page on 'Parallel Tasks']:

> **Thread Injection**
> 
> The .NET thread pool automatically manages the number of worker threads in the pool. It adds and removes threads according to built-in heuristics. The .NET thread pool has two main mechanisms for injecting threads: a starvation-avoidance mechanism that adds worker threads if it sees no progress being made on queued items and a **hill-climbing** heuristic that tries to **maximize throughput** while using as **few threads as possible**.
...
> A goal of the **hill-climbing** heuristic is to improve the utilization of cores when threads are blocked by I/O or other wait conditions that stall the processor
....
> **The .NET thread pool has an opportunity to inject threads every time a work item completes or at 500 millisecond intervals, whichever is shorter**. The thread pool uses this opportunity to try adding threads (or taking them away), guided by feedback from previous changes in the thread count. If adding threads seems to be helping throughput, the thread pool adds more; otherwise, it reduces the number of worker threads. This technique is called the **hill-climbing** heuristic.

For more specifics on what the algorithm is doing, you can read the research paper [Optimizing Concurrency Levels in the .NET ThreadPool] published by Microsoft, although it you want a brief outline of what it's trying to achieve, this summary from the paper is helpful:

> In addition the controller should have: 
> 
> 1. **short settling times** so that cumulative throughput is maximized
> 1. **minimal oscillations** since changing control settings incurs overheads that reduce throughput
> 1. **fast adaptation** to changes in workloads and resource characteristics. 

So reduce throughput, don't add and then remove threads too fast, but still adapt quickly to changing work-loads, simple really!!

As an aside, after reading (and re-reading) the research paper I found it interesting that a considerable amount of it was dedicated to testing, as the following excerpt shows:

![Research paper - issues encountered - approaches used to solve them]({{ base }}/images/2017/04/Research paper - issues encountered - approaches used to solve them.png)

In fact the approach to testing was considered so important that they wrote an entire follow-up paper that discusses it, see [Configuring Resource Managers Using Model Fuzzing].

----

### Why is it needed?

Because, in short, just adding new threads doesn't always increase throughput and ultimately having lots of threads has a cost. As [this comment from Eric Eilebrecht](https://github.com/dotnet/corefx/issues/2329#issuecomment-146964909), one of the authors of the research paper explains:

> Throttling thread creation is not only about the cost of creating a thread; it's mainly about the cost of having a **large number of running threads on an ongoing basis**. For example:
>
> - More threads means more **context-switching**, which adds CPU overhead. With a large number of threads, this can have a significant impact.
> - More threads means more **active stacks**, which impacts data locality. The more stacks a CPU is having to juggle in its various caches, the less effective those caches are.
>
> The **advantage** of more threads than logical processors is, of course, that we can keep the CPU busy if some of the threads are blocked, and so get more work done. But we need to be careful not to "overreact" to blocking, and end up hurting performance by having **too many** threads.

Or in other words, from [Concurrency - Throttling Concurrency in the CLR 4.0 ThreadPool]

> As opposed to what may be intuitive, concurrency control is about **throttling** and **reducing** the number of work items that can be run in parallel in order to improve the worker ThreadPool throughput (that is, controlling the degree of concurrency is **preventing work from running**).

So the algorithm was designed with all these criteria in mind and was then tested over a large range of scenarios, to ensure it actually worked! This is why it's often said that you should just leave the .NET ThreadPool alone, not try and tinker with it. It's been heavily tested to work across a multiple situations and it was designed to adapt over time, so it should have you covered! (although of course, there are times [when it doesn't work perfectly][CLR Threadpool Injection Stuttering Problems]!!)

----

## The Algorithm in Action

As the source in now available, we can actually play with the algorithm and try it out in a few scenarios to see what it does. It needs very few dependences and therefore all the relevant code is contained in the following files:

- [/src/vm/hillclimbing.cpp](https://github.com/dotnet/coreclr/blob/master/src/vm/hillclimbing.cpp)
- [/src/vm/hillclimbing.h](https://github.com/dotnet/coreclr/blob/master/src/vm/hillclimbing.h)
- [/src/inc/complex.h](https://github.com/dotnet/coreclr/blob/master/src/inc/complex.h)
- [/src/inc/random.h](https://github.com/dotnet/coreclr/blob/master/src/inc/random.h)

I have a project [up on my GitHub page](https://github.com/mattwarren/HillClimbingClrThreadPool) that allows you to test the hill-climbing algorithm in a self-contained console app. If you're interested you can see the [changes/hacks](https://github.com/mattwarren/HillClimbingClrThreadPool/commit/0941998aeda345aeaaa44f88e8d3b99f18e23abb) I had to do to get it building, although in the end it was pretty simple! (**Update** Kudos to [Christian Klutz](https://github.com/cklutz) who [ported my self-contained app to C#](https://github.com/cklutz/HillClimbing), nice job!!)

The algorithm is controlled via the [following `HillClimbing_XXX` settings](https://github.com/dotnet/coreclr/blob/master/Documentation/project-docs/clr-configuration-knobs.md):

| Setting | Default Value | Notes |
|:--------|:-------------:|-------|
| HillClimbing_WavePeriod | 4 | |
| HillClimbing_TargetSignalToNoiseRatio | 300 | |
| HillClimbing_ErrorSmoothingFactor | 1 | |
| HillClimbing_WaveMagnitudeMultiplier | 100 | |
| HillClimbing_MaxWaveMagnitude | 20 | |
| HillClimbing_WaveHistorySize | 8 | |
| HillClimbing_Bias | 15 |The 'cost' of a thread.  0 means drive for increased throughput regardless of thread count; higher values bias more against higher thread counts |
| HillClimbing_MaxChangePerSecond | 4 | |
| HillClimbing_MaxChangePerSample | 20 | |
| HillClimbing_MaxSampleErrorPercent | 15 | |
| HillClimbing_SampleIntervalLow | 10 | |
| HillClimbing_SampleIntervalHigh | 200 | |
| HillClimbing_GainExponent | 200 | The exponent to apply to the gain, times 100.  100 means to use linear gain, higher values will enhance large moves and damp small ones |

Because I was using the code in a self-contained console app, I just [hard-coded the default values](https://github.com/mattwarren/HillClimbingClrThreadPool/blob/a99db86a48309d569b221194ede0392d14eaa243/hillclimbing.cpp#L54-L91) into the source, but in the CLR it *appears* that you can modify these values at runtime.

### Working with the Hill Climbing code

There are several things I discovered when implementing a simple test app that works with the algorithm:

1. The calculation is triggered by calling the function `HillClimbingInstance.Update(currentThreadCount, sampleDuration, numCompletions, &threadAdjustmentInterval)` and the return value is the new 'maximum thread count' that the algorithm is proposing.
1. It calculates the desired number of threads based on the 'current throughput', which is the '# of tasks completed' (`numCompletions`) during the current time-period (`sampleDuration` in seconds).
1. It also takes the current thread count (`currentThreadCount`) into consideration. 
1. The core calculations (excluding error handling and house-keeping) are [only just over 100 LOC](https://github.com/dotnet/coreclr/blob/e5faef44cac6e86b12b3b586742183293bdd34a7/src/vm/hillclimbing.cpp#L162-L288), so it's not too hard to follow.
1. It works on the [basis of 'transitions'](https://github.com/dotnet/coreclr/blob/e5faef44cac6e86b12b3b586742183293bdd34a7/src/vm/hillclimbing.cpp#L162) (`HillClimbingStateTransition`), first `Warmup`, then `Stabilizing` and will only recommend a new value once it's moved into  the `ClimbingMove` state.
1. The real .NET Thread Pool only increases the thread-count by one thread every 500 milliseconds. It keeps doing this until the '# of threads' has reached the amount that the hill-climbing algorithm suggests. See [ThreadpoolMgr::ShouldAdjustMaxWorkersActive()](https://github.com/dotnet/coreclr/blob/e5994fa5507a5f08058193ff26dc3698cd2e6444/src/vm/win32threadpool.h#L1085-L1101) and [ThreadpoolMgr::AdjustMaxWorkersActive()](https://github.com/dotnet/coreclr/blob/e5faef44cac6e86b12b3b586742183293bdd34a7/src/vm/win32threadpool.cpp#L910-L992) for the code that handles this.
1. If it hasn't got enough samples to do a 'statistically significant' calculation this algorithm will indicate this via the `threadAdjustmentInterval` variable. This means that you should not call `HillClimbingInstance.Update(..)` until another `threadAdjustmentInterval` milliseconds have elapsed. (link to [source code that calculates this](https://github.com/dotnet/coreclr/blob/e5faef44cac6e86b12b3b586742183293bdd34a7/src/vm/hillclimbing.cpp#L105-L134))
1. The current thread count is only **decreased** when threads complete their current task. At that point the current count is compared to the desired amount and if necessary a thread is 'retired'
1. The algorithm with only returns values that respect the limits specified by [ThreadPool.SetMinThreads(..)](https://msdn.microsoft.com/en-us/library/system.threading.threadpool.setminthreads(v=vs.110).aspx) and [ThreadPool.SetMaxThreads(..)](https://msdn.microsoft.com/en-us/library/system.threading.threadpool.setmaxthreads(v=vs.110).aspx) (link to the [code that handles this](https://github.com/dotnet/coreclr/blob/e5faef44cac6e86b12b3b586742183293bdd34a7/src/vm/hillclimbing.cpp#L301-L305))
1. In addition, it will only recommend increasing the thread count if the [CPU Utilization is below 95%](https://github.com/dotnet/coreclr/blob/e5faef44cac6e86b12b3b586742183293bdd34a7/src/vm/hillclimbing.cpp#L271-L275)

First lets look at the graphs that were **published in the research paper** from Microsoft ([Optimizing Concurrency Levels in the .NET ThreadPool]):

[![Hill Climbing v Old Threadpool Algorithm]({{ base }}/images/2017/04/Hill Climbing v Old Threadpool Algorithm.png)]({{ base }}/images/2017/04/Hill Climbing v Old Threadpool Algorithm.png)

They clearly show the thread-pool adapting the number of threads (up and down) as the throughput changes, so it appears the algorithm is doing what it promises.

Now for a similar image using the **self-contained test app I wrote**. Now, my test app only [pretends to add/remove threads](https://github.com/mattwarren/HillClimbingClrThreadPool/blob/fcb4bd27049b9cf8b5ddf2e5037611e36516642e/program.cpp#L63-L145) based on the results for the Hill Climbing algorithm, so it's only an approximation of the real behaviour, but it does provide a nice way to see it in action outside of the CLR.

In this simple scenario, the work-load that we are asking the thread-pool to do is just moving up and then down (click for full-size image):

[![Output from self-contained test app - smooth]({{ base }}/images/2017/04/results-smooth.png)]({{ base }}/images/2017/04/results-smooth.png)

Finally, we'll look at what the algorithm does in a more noisy scenario, here the current 'work load' randomly jumps around, rather than smoothly changing:

[![Output from self-contained test app - random]({{ base }}/images/2017/04/results-random.png)]({{ base }}/images/2017/04/results-random.png)

So with a combination of a very detailed [MSDN article][MSDN page on 'Parallel Tasks'], a easy-to-read [research paper][Optimizing Concurrency Levels in the .NET ThreadPool] and most significantly having the [source code available](https://github.com/dotnet/coreclr/blob/master/src/vm/hillclimbing.cpp), we are able to get an understanding of what the .NET Thread Pool is doing 'under-the-hood'!

----

## References

1. [Concurrency - Throttling Concurrency in the CLR 4.0 ThreadPool] (I recommend reading this article **before** reading the research papers)
1. [Optimizing Concurrency Levels in the .NET ThreadPool: A case study of controller design and implementation][Optimizing Concurrency Levels in the .NET ThreadPool]
  - direct link [to PDF file](https://www.researchgate.net/profile/Joseph_Hellerstein2/publication/228977836_Optimizing_concurrency_levels_in_the_net_threadpool_A_case_study_of_controller_design_and_implementation/links/0c96052d441508cb45000000/Optimizing-concurrency-levels-in-the-net-threadpool-A-case-study-of-controller-design-and-implementation.pdf)
1. [Configuring Resource Managers Using Model Fuzzing: A Case Study of the .NET Thread Pool][Configuring Resource Managers Using Model Fuzzing]
  - direct link [to PDF file](http://webcourse.cs.technion.ac.il/236635/Winter2009-2010/hw/WCFiles/2.pdf)
1. [MSDN page on 'Parallel Tasks'] (see section on 'Thread Injection')
1. [Patent US20100083272 - Managing pools of dynamic resources]

[Concurrency - Throttling Concurrency in the CLR 4.0 ThreadPool]: https://msdn.microsoft.com/en-us/magazine/ff960958.aspx
[MSDN page on 'Parallel Tasks']: https://msdn.microsoft.com/en-gb/library/ff963549.aspx
[Optimizing Concurrency Levels in the .NET ThreadPool]: https://www.researchgate.net/publication/228977836_Optimizing_concurrency_levels_in_the_net_threadpool_A_case_study_of_controller_design_and_implementation
[Configuring Resource Managers Using Model Fuzzing]: http://dl.acm.org/citation.cfm?id=1688934
[Patent US20100083272 - Managing pools of dynamic resources]: http://www.google.com/patents/US20100083272
[Hill Climbing Algorithm]: https://en.wikipedia.org/wiki/Hill_climbing
[CLR Threadpool Injection Stuttering Problems]: http://joeduffyblog.com/2006/07/08/clr-thread-pool-injection-stuttering-problems/


### Further Reading

1. [Erika Parsons and Eric Eilebrecht - CLR 4 - Inside the Thread Pool - Channel 9](https://channel9.msdn.com/Shows/Going+Deep/Erika-Parsons-and-Eric-Eilebrecht--CLR-4-Inside-the-new-Threadpool)
1. [New and Improved CLR 4 Thread Pool Engine](http://www.danielmoth.com/Blog/New-And-Improved-CLR-4-Thread-Pool-Engine.aspx) (Work-stealing and Local Queues)
1. [.NET CLR Thread Pool Internals](http://aviadezra.blogspot.co.uk/2009/06/net-clr-thread-pool-work.html) (compares the new Hill Climbing algorithm, to the previous algorithm used in the Legacy Thread Pool)
1. [CLR thread pool injection, stuttering problems](http://joeduffyblog.com/2006/07/08/clr-thread-pool-injection-stuttering-problems/)
2. [Why the CLR 2.0 SP1's threadpool default max thread count was increased to 250/CPU](http://joeduffyblog.com/2007/03/04/why-the-clr-20-sp1s-threadpool-default-max-thread-count-was-increased-to-250cpu/)
1. [Use a more dependable policy for thread pool thread injection](https://github.com/dotnet/coreclr/issues/1754) (CoreCLR GitHub Issue)
1. [Use a more dependable policy for thread pool thread injection](https://github.com/dotnet/corefx/issues/2329) (CoreFX GitHub Issue)
1. [ThreadPool Growth: Some Important Details](https://gist.github.com/JonCole/e65411214030f0d823cb)
1. [.NET's ThreadPool Class - Behind The Scenes](https://www.codeproject.com/articles/3813/net-s-threadpool-class-behind-the-scenes) (Based on SSCLI source, not CoreCLR)
1. [CLR Execution Context](http://chabster.blogspot.co.uk/2013/04/clr-execution-context.html) (in Russian, but Google Translate does a reasonable job)
1. [Thread Pool + Task Testing (by Ben Adams)](https://github.com/benaadams/ThreadPoolTaskTesting)

----

Discuss this post on [Hacker News](https://news.ycombinator.com/item?id=14111369) and [/r/programming](https://www.reddit.com/r/programming/comments/655xg2/the_clr_thread_pool_thread_injection_algorithm/)