---
layout: post
title: Know thy .NET object memory layout (Updated 2014-09-03)
comments: true
tags: [.NET, false-sharing, memory layout, Performance, SOS]
---
Apologies to <a href="https://twitter.com/nitsanw" target="_blank">Nitsan Wakart</a>, from whom I shamelessly stole the <a href="http://psy-lob-saw.blogspot.co.uk/2013/05/know-thy-java-object-memory-layout.html" target="_blank">title of this post</a>!

<h4><strong>tl;dr</strong></h4>

The .NET port of <a href="https://github.com/HdrHistogram/HdrHistogram" target="_blank">HdrHistogram</a> can control the field layout within a class, using the same technique that the original Java code does.

<hr />

Recently I've spent some time porting HdrHistogram from <a href="https://github.com/HdrHistogram/HdrHistogram/tree/master/src/main/java/org/HdrHistogram" target="_blank">Java</a> to <a href="https://github.com/HdrHistogram/HdrHistogram/tree/master/src/main/csharp" target="_blank">.NET</a>, it's been great to learn a bit more about Java and get a better understanding of some low-level code. In case you're not familiar with it, the goals of HdrHistogram are to:

<ol>
<li>Provide an accurate mechanism for measuring latency at a full-range of percentiles (99.9%, 99.99% etc)</li>
<li>Minimising the overhead needed to perform the measurements, so as to not impact your application</li>
</ol>

You can find a full explanation of what is does and how point 1) is achieved in the <a href="http://giltene.github.io/HdrHistogram/" target="_blank">project readme</a>.

<h3><strong>Minimising overhead</strong></h3>

But it's the 2nd of the points that I'm looking at in this post, by answering the question

<blockquote>
  How does HdrHistogram minimise its overhead?
</blockquote>

But first it makes sense to start with the why, well it turns out it's pretty simple. HdrHistogram is meant for measuring low-latency applications, if it had a large overhead or caused the GC to do extra work, then it would negatively affect the performance of the application is was meant to be measuring.

Also imagine for a minute that HdrHistogram took <em>1/10,000th</em> of a second (0.1 milliseconds or 100,000 nanoseconds) to record a value. If this was the case you could only hope to accurately record events lasting down to a millisecond (<em>1/1,000th</em> of a second), anything faster would not be possible as the overhead of recording the measurement would take up too much time.

As it is HdrHistogram is much faster than that, so we don't have to worry! From the <a href="http://giltene.github.io/HdrHistogram/" target="_blank">readme</a>:

<blockquote>
  Measurements show value recording times as low as 3-6 nanoseconds on modern (circa 2012) Intel CPUs.
</blockquote>

So how does it achieve this, well it does a few things:

<ol>
<li>It doesn't do any memory allocations when storing a value, all allocations are done up front when you create the histogram. Upon creation you have to specify the range of measurements you would like to record and the precision. For instance if you want to record timings covering the range from 1 nanosecond (ns) to 1 hour (3,600,000,000,000 ns), with 3 decimal places of resolution, you would do the following:<br />
<code>Histogram histogram = new Histogram(3600000000000L, 3);</code></li>
<li>Uses a few low-level tricks to ensure that storing a value can be done as fast as possible. For instance putting the value in the right bucket (array location) is a <a href="https://github.com/HdrHistogram/HdrHistogram/blob/master/src/main/csharp/AbstractHistogram.cs#L1600" target="_blank">constant lookup</a> (no searching required) and on top of that it makes use of some nifty <a href="https://github.com/HdrHistogram/HdrHistogram/blob/master/src/main/csharp/Utilities/MiscUtilities.cs#L16" target="_blank">bit-shifting</a> to ensure it happens as fast as possible.</li>
<li>Implements a slightly strange class-hierarchy to ensure that fields are laid out in the right location. It you look at the source you have <a href="https://github.com/HdrHistogram/HdrHistogram/blob/master/src/main/java/org/HdrHistogram/AbstractHistogram.java#L78" target="_blank">AbstractHistogram</a> and then the seemingly redundant class <a href="https://github.com/HdrHistogram/HdrHistogram/blob/master/src/main/java/org/HdrHistogram/AbstractHistogram.java#L32" target="_blank">AbstractHistogramBase</a>, why split up the fields up like that? <del datetime="2014-09-03T08:35:56+00:00">Well the comments give it away a little bit, it's due to <strong>false-sharing</strong></del></li>
</ol>

<h3><strong>False sharing</strong></h3>

<strong>Update (2014-09-03):</strong> As pointed out by Nitsan in <a href="{{base}}/2014/07/04/know-thy-net-object-memory-layout/comment-page-1/#comment-152">the comments</a>, I got the wrong end of the stick with this entire section. It's not about false-sharing at all, it's the opposite, I'll quote him to make sure I get it right this time!

<blockquote>
  The effort made in HdrHistogram towards controlling field ordering is not about False Sharing but rather towards ensuring certain fields are more likely to be loaded together as they are clumped together, thus avoiding a potential extra read miss.
</blockquote>

<del datetime="2014-09-03T08:35:56+00:00">So what is false sharing, to find out more I recommend reading Martin Thompson's <a href="http://mechanical-sympathy.blogspot.co.uk/2011/07/false-sharing.html" target="_blank">excellent post</a> and this <a href="http://psy-lob-saw.blogspot.co.uk/2014/06/notes-on-false-sharing.html" target="_blank">equally good one</a> from Nitsan Wakart. But if you're too lazy to do that, it's summed up by the image below (from Martin's post).</del>

[caption width="557" align="aligncenter"]<a href="http://mechanical-sympathy.blogspot.co.uk/2011/07/false-sharing.html" target="_blank"><img src="http://mattwarren.github.io/images/2014/07/8ad85-cache-line.png" alt="CPU Cache lines" class="aligncenter" /></a> Image from the Mechanical Sympathy blog[/caption]

<del datetime="2014-09-03T08:35:56+00:00">The problem is that a CPU pulls data into its cache in lines, even if your code only wants to read a single variable/field. If 2 threads are reading from 2 fields (X and Y in the image) that are next to each other in memory, the CPU running a thread will invalidate the cache of the other CPU when it pulls in a line of memory. This invalidation costs time and in high-performance situations can slow down your program.</del>

<del datetime="2014-09-03T08:35:56+00:00">The opposite is also true, you can gain performance by ensuring that fields you know are accessed in succession are located together in memory. This means that once the first field is pulled into the CPU cache, subsequent accesses will be cheaper as the fields will be <em>"Hot"</em>. It is this scenario HdrHistogram is trying to achieve, but how do you know that fields in a .NET object are located together in memory?</del>

<h3><a name="analysing_memory_layout"></a> <strong>Analysing the memory layout of a .NET Object</strong></h3>

To do this you need to drop down into the debugger and use the excellent <a href="http://msdn.microsoft.com/en-us/library/bb190764(v=vs.110).aspx" target="_blank">SOS or Son-of-Strike extension</a>. This is because the <a href="http://msdn.microsoft.com/en-us/library/ht8ecch6(v=vs.90).aspx" target="_blank">.NET JITter</a> is free to reorder fields as it sees fit, so the order you put the fields in your class does not determine the order they end up. The JITter changes the layout to minimise the space needed for the object and to make sure that fields are aligned on byte boundaries, it does this by packing them in the most efficient way.

To test out the difference between the Histogram with a class-hierarchy and without, the following code was written (you can find HistogramAllInOneClass in <a href="//gist.github.com/mattwarren/d7e56a3709d347862141" target="_blank">this gist</a>):

``` csharp
Histogram testHistogram = new Histogram(3600000000000L, 3);
HistogramAllInOneClass combinedHistogram = 
            new HistogramAllInOneClass();

Debugger.Launch();

GC.KeepAlive(combinedHistogram); // put a breakpoint on this line
GC.KeepAlive(testHistogram);
```

Then to actually test it, you need to perform the following steps:

<ol>
<li>Set the build to <strong>Release</strong> and <strong>x86</strong></li>
<li>Build the test and then launch your .exe from <strong>OUTSIDE</strong> Visual Studio (VS), i.e. by double-clicking on it in Windows Explorer. You must not be debugging in VS when it starts up, otherwise the .NET JITter won't perform any optimisations.</li>
<li>When the "Just-In-Time Debugger" prompt pops up, select the instance of VS that is already opened (not a NEW one)</li>
<li>Then check "Manually choose the debugging engines." and click "Yes"</li>
<li>Finally make sure "Managed (...)", "Native" AND <strong>"Managed Compatibility Mode"</strong> are checked</li>
</ol>

Once the debugger has connected back to VS, you can type the following commands in the "Immediate Window":

<ol>
<li><code>.load sos</code></li>
<li><code>!DumpStackObjects</code></li>
<li><code>DumpObj &lt;ADDRESS&gt;</code> (where ADDRESS is the the value from the "Object" column in Step 2.)</li>
</ol>

If all that works, you will end up with an output like below:

<a href="https://mattwarren.github.io/images/2014/07/hdrhistogram-field-layout.png"><img src="http://mattwarren.github.io/images/2014/07/hdrhistogram-field-layout.png" alt="HdrHistogram - field layout"/></a>

<h3><strong>Update (2014-09-03)</strong></h3>

Since first writing this blog post, I came across a really clever technique for getting the offsets of fields <strong>in code</strong>, something that I initially thought was impossible. The full <a href="https://github.com/kevin-montrose/Jil/blob/519a0c552e9fb93a4df94eed0b2f9804271f2fef/Jil/Serialize/Utils.cs#L320" target="_blank">code to achieve this</a> comes from the Jil JSON serialiser and was written to ensure that it accessed fields in the <a href="https://github.com/kevin-montrose/Jil#optimizing-member-access-order" target="_blank">most efficient order</a>.

It is based on a very clever trick, it dynamically emits IL code, making use of the <a href="http://msdn.microsoft.com/en-us/library/system.reflection.emit.opcodes.ldflda(v=vs.110).aspx" target="_blank"><strong>Ldflda</strong></a> instruction. This is code you could not write in C#, but are able to write directly in IL.

<blockquote>
  The <strong>ldflda</strong> instruction pushes the address of a field located in an object onto the stack. The object must be on the stack as an object reference (type O), a managed pointer (type &amp;), an unmanaged pointer (type native int), a transient pointer (type *), or an instance of a value type. The use of an unmanaged pointer is not permitted in verifiable code. The object's field is specified by a metadata token that must refer to a field member.
</blockquote>

By putting this code into my project, I was able to verify that it gives exactly the same field offsets that you can see when using the SOS technique (above). So it's a nice technique and the only option if you want to get this information <em>without</em> having to drop-down into a debugger.

<h3><strong>Results</strong></h3>

After all these steps we end up with the results shown in the images below, where the rows are ordered by the "Offset" value.

[caption width="649" align="aligncenter"]<a href="https://mattwarren.github.io/images/2014/07/hdrhistogram-with-hierachy2.png"><img src="http://mattwarren.github.io/images/2014/07/hdrhistogram-with-hierachy2.png" alt="HdrHistogram (with Hierachy)"/></a> AbstractHistogramBase.cs -&gt; AbstractHistogram.cs -&gt; Histogram.cs [/caption]

You can see that with the class hierarchy in place, the fields remain grouped as we want them to (shown by the orange/green/blue highlighting). What is interesting is that the JITter has still rearranged fields within a single group, preferring to put Int64 (long) fields before Int32 (int) fields in this case. This is seen by comparing the ordering of the "Field" column with the "Offset" one, where the values in the "Field" column represent the original ordering of the fields as they appear in the source code.

However when we put all the fields in a single class, we lose the grouping:

[caption width="498" align="aligncenter"]<a href="https://mattwarren.github.io/images/2014/07/histogramallinoneclass2.png"><img src="http://mattwarren.github.io/images/2014/07/histogramallinoneclass2.png" alt="HistogramAllInOneClass"/></a> Equivalent fields all in one class[/caption]

<h3><strong>Alternative Technique</strong></h3>

To achieve the same effect you can use the <a href="http://msdn.microsoft.com/en-us/library/system.runtime.interopservices.structlayoutattribute(v=vs.110).aspx" target="_blank">StructLayout attribute</a>, but this requires that you calculate all the offsets yourself, which can be cumbersome:

``` csharp
[StructLayout(LayoutKind.Explicit, Size = 28, CharSet = CharSet.Ansi)]
public class HistogramAllInOneClass
{
  // &amp;quot;Cold&amp;quot; accessed fields. Not used in the recording code path:
  [FieldOffset(0)]
  internal long identity;

  [FieldOffset(8)]
  internal long highestTrackableValue;
  [FieldOffset(16)]
  internal long lowestTrackableValue;
  [FieldOffset(24)]
  internal int numberOfSignificantValueDigits;

  ...
}
```

If you are interested, the full results of this test <a href="https://mattwarren.github.io/images/2014/07/hdrhistogram-field-layout1.xlsx" target="_blank">are available</a>
