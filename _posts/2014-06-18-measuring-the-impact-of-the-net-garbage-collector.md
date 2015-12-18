---
layout: post
title: Measuring the impact of the .NET Garbage Collector
comments: true
tags: [Garbage Collection, Performance, Performance]
---
There is an <a href="{{base}}/2014/06/23/measuring-the-impact-of-the-net-garbage-collector-an-update/" title="Measuring the impact of the .NET Garbage Collector – An Update" target="_blank">update to this post</a>, based on feedback I received.

<hr />

In my <a href="{{base}}/2014/06/10/roslyn-code-base-performance-lessons-part-2/" title="Roslyn code base – performance lessons (part 2)" target="_blank">last post</a> I talked about the techniques that the Roslyn team used to minimise the effect of the Garbage Collector (GC). Firstly I guess its worth discussing what the actual issue is.

<h4><strong>GC Pauses and Latency</strong></h4>

In early versions of the .NET CLR, garbage collection was a "Stop the world" event, i.e. before a GC could happen all the threads in your program had to be brought to a safe place and suspended. If your ASP.NET MVC app was in the middle of serving a request, it would not complete until after the GC finished and the latency for that user would be much higher than normal. This is exactly the issue that Stackoverflow ran into a few years ago, in their <a href="http://samsaffron.com/archive/2011/10/28/in-managed-code-we-trust-our-recent-battles-with-the-net-garbage-collector" title="Stackoverflow battles with the .NET GC" target="_blank">battles with the .NET Garbage Collector</a>. If you look at the image below (from that blog post), you can see the spikes in response times of over 1 second, caused by Gen 2 collections.

<a href="http://samsaffron.com/archive/2011/10/28/in-managed-code-we-trust-our-recent-battles-with-the-net-garbage-collector" target="_blank"><img src="http://discuss.samsaffron.com/uploads/default/31/bdcd44a7fc5147cb.png" alt="Spikes in Stackoverflow response times due to Gen 2 collections" class="aligncenter" /></a>

However in the .NET framework 4.5 there were <a href="http://blogs.msdn.com/b/dotnet/arc7hive/2012/07/20/the-net-framework-4-5-includes-new-garbage-collector-enhancements-for-client-and-server-apps.aspx" title=".NET 4.5 GC Enhancements" target="_blank">enhancements to the GC</a> brought in that can help mitigate these (emphasis mine)

<blockquote>
  The new background server GC in the .NET Framework 4.5 offloads <strong>much</strong> of the GC work associated with a full blocking collection to dedicated background GC threads that can run concurrently with user code, resulting in <strong>much shorter</strong> (less noticeable) pauses. One customer reported a 70% decrease in GC pause times.
</blockquote>

But as you can see from the quote, this doesn't get rid of pauses completely, it just minimises them. Even the <a href="http://msdn.microsoft.com/library/system.runtime.gclatencymode(v=vs.110).aspx" title="Sustained low-latency GC mode" target="_blank">SustainedLowLatency</a> mode isn't enough,  <em>"The collector <strong>tries</strong> to perform only generation 0, generation 1, and concurrent generation 2 collections. <strong>Full blocking collections may still occur</strong> if the system is under memory pressure."</em> If you want a full understanding of the different modes, you can see some nice diagrams on <a href="http://msdn.microsoft.com/en-us/library/ee787088.aspx#background_server_garbage_collection" title="GC modes" target="_blank">this MSDN page.</a>

I'm not in any way being critical or dismissive of these improvements. GC is a really hard engineering task, you need to detect and clean-up the unused memory of a program, whilst it's running, ensuring that you don't affect it's correctness in any way and making sure you add as little overhead as possible. Take a look at <a href="http://channel9.msdn.com/Shows/Going+Deep/Maoni-Stephens-and-Andrew-Pardoe-CLR-4-Inside-Background-GC" title="Inside background GC" target="_blank">this video</a> for some idea of what's involved. The .NET GC is a complex and impressive piece of engineering, but there are still some scenarios where it can introduce pauses to your program.

<strong>Aside:</strong> In the Java world there is a commercial <a href="http://www.azulsystems.com/zing/pgc" target="_blank">Pauseless Garbage Collector</a> available from Azul Systems. It uses a <a href="http://www.azulsystems.com/sites/default/files//images/wp_pgc_zing_v5.pdf" title="Zing white papar" target="_blank">patented technique</a> to offer <em>"Predictable, consistent garbage collection (GC) behavior"</em> and <em>"Predictable, consistent application response times"</em>, but there doesn't seem to be anything like that in the .NET space.

<h4><strong>Detecting GC Pauses</strong></h4>

But how do you detect GC pauses, well the first thing to do is take a look at the properties of the process using the excellent <a href="http://technet.microsoft.com/en-gb/sysinternals/bb896653.aspx" title="Process Explorer" target="_blank">Process Explorer</a> tool from <a href="http://technet.microsoft.com/en-gb/sysinternals" title="Sysinternals" target="_blank">Sysinternals</a> (imagine Task Manager on steroids). It will give you a summary like the one below, the number of <em>Gen 0/1/2 Collections</em> and <em>% Time in GC</em> are the most interesting values to look at.

<a href="https://mattwarren.github.io/images/2014/06/time-in-gc.png" target="_blank"><img src="http://mattwarren.github.io/images/2014/06/time-in-gc.png" alt="Time in GC"/></a>

But the limitation of this is that it has no context, what <em>% of time in GC</em> is too high, how many <em>Gen 2 collections</em> are too many? What effect does GC actually have on your program, in terms of pauses that a customer will experience?

<h4><strong>jHiccup and HdrHistogram</strong></h4>

To gain a better understanding, I've used some of the ideas from the excellent <a href="http://www.azulsystems.com/downloads/jHiccup" target="_blank">jHiccup</a> Java tool. Very simply, it starts a new thread in which the following code runs:

``` csharp
var timer = new Stopwatch();
while (true)
{
  timer.Restart();
  Thread.Sleep(1);
  timer.Stop();
  // allow a little bit of leeway
  if (timer.ElapsedMilliseconds > 2) 
  {
    // Record the pause
    _histogram.recordValue(timer.ElapsedMilliseconds);
  }
}
```

Any pauses that this thread experiences will also be seen by the other threads running in the program and whilst these pauses aren't <em>guaranteed</em> to be caused by the GC, it's the most likely culprit.

<strong>Note:</strong> this uses the <a href="https://github.com/HdrHistogram/HdrHistogram/tree/master/src/main/csharp" target="_blank">.NET port</a> of the Java <a href="https://github.com/HdrHistogram/HdrHistogram" target="_blank">HdrHistogram</a>, a full explanation of what HdrHistogram offers and how it works is available in the <a href="https://github.com/HdrHistogram/HdrHistogram/blob/master/README" target="_blank">Readme</a>. But the summary is that it offers a non-intrusive way of collecting samples in a histogram, so that you can then produce a graph of the <a href="http://www.azulsystems.com/sites/www.azulsystems.com/azul/images/jhiccup/3gb-hotspot-hiccup.gif" target="_blank">50%/99%/99.9%/99.99% percentiles</a>. It does this by allocating all the memory it needs up front, so after start-up it performs no allocations during usage. The benefit of recording full percentile information like this is that you get a much fuller view of any outlying values, compared to just recording a simple average.

To trigger garbage collection, the test program also runs several threads, each executing the code below. In a loop, each thread creates a large <code>string</code> and a <code>byte array</code>, to simulate what a web server might be doing when generating a response to a web request (for instance from de-serialising some Json and creating a HTML page). Then to ensure that the objects are kept around long enough, they are both put into a Least Recently Used (LRU) cache, that holds the 2000 most recent items.

``` csharp
processingThreads[i] = new Thread(() =&gt;
{
  var threadCounter = 0;
  while (true)
  {
    var text = new string((char)random.Next(start, end + 1), 1000);
    stringCache.Set(text.GetHashCode(), text);

    // 80K, &gt; 85,000 bytes = LOH and we don&#039;t want these there
    var bytes = new byte[80 * 1024]; 
    random.NextBytes(bytes);
    bytesCache.Set(bytes.GetHashCode(), bytes);

    threadCounter++;
    Thread.Sleep(1); // So we don&#039;t thrash the CPU!!!!
  }
});
```

<h4><strong>Test Results</strong></h4>

The test was left running for 10 mins, in each of the following GC modes:

<ul>
<li>Workstation Batch (non-concurrent)</li>
<li>Workstation Interactive (concurrent)</li>
<li>Server Batch (non-concurrent)</li>
<li>Server Interactive (concurrent)</li>
</ul>

The results are below, you can clearly see that Server modes offer lower pauses than the Workstation modes and that Interactive (concurrent) mode is also an improvement over Batch mode. The graph shows pause times on the Y axis (so lower is better) and the X axis plots the percentiles, scaled logarithmically.

<a href="https://mattwarren.github.io/images/2014/06/gc-pause-times-comparision.png" target="_blank"><img src="http://mattwarren.github.io/images/2014/06/gc-pause-times-comparision.png" alt="GC Pause Times - comparision"/></a>

If we take a closer look at just the 99% percentile, i.e. the value (at) which "1 in 100" pauses are less than, the difference is even clearer. Here you can see that the Workstation modes have pauses upto 25 milliseconds, compared to 10 milliseconds for the Server modes.

<a href="https://mattwarren.github.io/images/2014/06/gc-pause-times-upto-99-comparision.png" target="_blank"><img src="http://mattwarren.github.io/images/2014/06/gc-pause-times-upto-99-comparision.png" alt="GC Pause Times - upto 99% comparision"/></a>

<h4><strong>SustainedLowLatency Mode</strong></h4>

As a final test, the program was run using the new <a href="http://msdn.microsoft.com/library/system.runtime.gclatencymode(v=vs.110).aspx" title="Sustained low-latency GC mode" target="_blank">SustainedLowLatency</a> mode, to see what effect that has. In the graph below you can see this offers lower pause times, although it isn't able to sustain these for an unlimited period of time. After 10 minutes we start to see longer pauses compared to those we saw when running the test for just 5 minutes.

<a href="https://mattwarren.github.io/images/2014/06/gc-pause-times-comparision-including-sustainedlowlatency.png" target="_blank"><img src="http://mattwarren.github.io/images/2014/06/gc-pause-times-comparision-including-sustainedlowlatency.png" alt="GC Pause Times - comparision including SustainedLowLatency"/></a>

It's worth noting that there is a trade-off to take into account when using this mode, <a href="http://msdn.microsoft.com/en-US/library/bb384202(v=vs.110).aspx" title="Sustained low-latency GC mode" target="_blank">SustainedLowLatency mode is</a>:

<blockquote>
  For applications that have time-sensitive operations for a contained but potentially longer duration of time during which interruptions from the garbage collector could be disruptive. For example, applications that need quick response times as market data changes during trading hours.
  This mode results in a larger managed heap size than other modes. Because it does not compact the managed heap, higher fragmentation is possible. Ensure that sufficient memory is available.
</blockquote>

All the data used in these tests can be found in the spreadsheet <a href="https://mattwarren.github.io/images/2014/06/gc-pause-times-comparision.xlsx">GC Pause Times - comparision</a>

<a href="http://www.reddit.com/r/csharp/comments/28ghp8/measuring_the_impact_of_the_net_garbage_collector/" target="_blank">Discuss on the csharp sub-reddit</a>

<a href="https://news.ycombinator.com/item?id=8282310" target="_blank">Discuss on Hacker News</a>
