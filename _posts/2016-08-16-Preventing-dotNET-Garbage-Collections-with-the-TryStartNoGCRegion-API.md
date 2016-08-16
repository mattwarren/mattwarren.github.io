---
layout: post
title: Preventing .NET Garbage Collections with the TryStartNoGCRegion API
comments: true
tags: [CLR, GC, Pauses]
date: 2016-08-16

---

Pauses are a known problem in runtimes that have a Garbage Collector (GC), such as Java or .NET. GC Pauses can last several milliseconds, during which your application is [blocked or suspended]({{ base }}/2016/08/08/GC-Pauses-and-Safe-Points/). One way you can alleviate the pauses is to modify your code so that it doesn't allocate, i.e. so the GC has nothing to do. But this can require lots of work and you really have to understand the runtime as many allocation are hidden.

Another technique is to temporarily suspend the GC, during a critical region of your code where you don't want any pauses and then start it up again afterwards. This is exactly what the `TryStartNoGCRegion` API ([added in .NET 4.6](https://blogs.msdn.microsoft.com/dotnet/2015/07/20/announcing-net-framework-4-6/)) allows you to do.  

From the [MSDN docs](https://msdn.microsoft.com/en-us/library/dn906201(v=vs.110).aspx):

> Attempts to disallow garbage collection during the execution of a critical path if a specified amount of memory is available.

## TryStartNoGCRegion in Action

To see how the API works, I ran some simple tests using the .NET GC **Workstation** mode, on a 32-bit CPU. The test simply call `TryStartNoGCRegion` and then verify how much memory can be allocated before a Collection happens. The [code is available](https://gist.github.com/mattwarren/c9a87c40301f12084d0ab9ba43c01908) if you want to try it out for yourself.
 
### Test 1: Regular allocation, `TryStartNoGCRegion` not called

You can see that a garbage collection happens after the 2nd allocation (indicated by "**"):

```
Prevent GC: False, Over Allocate: False
Allocated:   3.00 MB, Mode:  Interactive, Gen0: 0, Gen1: 0, Gen2: 0,
Allocated:   6.00 MB, Mode:  Interactive, Gen0: 1, Gen1: 1, Gen2: 1, **
Allocated:   9.00 MB, Mode:  Interactive, Gen0: 1, Gen1: 1, Gen2: 1,
Allocated:  12.00 MB, Mode:  Interactive, Gen0: 1, Gen1: 1, Gen2: 1,
Allocated:  15.00 MB, Mode:  Interactive, Gen0: 1, Gen1: 1, Gen2: 1,
```

### Test 2: `TryStartNoGCRegion(..)` with size set to 15MB

Here we see that despite allocating the same amount as in the first test, no garbage collections are triggered during the run.

```
Prevent GC: True, Over Allocate: False
TryStartNoGCRegion: Size=15 MB (15,360 K or 15,728,640 bytes) SUCCEEDED
Allocated:   3.00 MB, Mode:   NoGCRegion, Gen0: 0, Gen1: 0, Gen2: 0,
Allocated:   6.00 MB, Mode:   NoGCRegion, Gen0: 0, Gen1: 0, Gen2: 0,
Allocated:   9.00 MB, Mode:   NoGCRegion, Gen0: 0, Gen1: 0, Gen2: 0,
Allocated:  12.00 MB, Mode:   NoGCRegion, Gen0: 0, Gen1: 0, Gen2: 0,
Allocated:  15.00 MB, Mode:   NoGCRegion, Gen0: 0, Gen1: 0, Gen2: 0,
```

### Test 3: `TryStartNoGCRegion(..)` size of 15MB, but allocating more than 15MB 

Finally we see that once we've allocated more that the `size` we asked for, the mode switches from `NoGCRegion` to `Interactive` and garbage collections can now happen.

```
Prevent GC: True, Over Allocate: True
TryStartNoGCRegion: Size=15 MB (15,360 K or 15,728,640 bytes) SUCCEEDED
Allocated:   3.00 MB, Mode:   NoGCRegion, Gen0: 0, Gen1: 0, Gen2: 0,
Allocated:   6.00 MB, Mode:   NoGCRegion, Gen0: 0, Gen1: 0, Gen2: 0,
Allocated:   9.00 MB, Mode:   NoGCRegion, Gen0: 0, Gen1: 0, Gen2: 0,
Allocated:  12.00 MB, Mode:   NoGCRegion, Gen0: 0, Gen1: 0, Gen2: 0,
Allocated:  15.00 MB, Mode:   NoGCRegion, Gen0: 0, Gen1: 0, Gen2: 0,
Allocated:  18.00 MB, Mode:   NoGCRegion, Gen0: 0, Gen1: 0, Gen2: 0,
Allocated:  21.00 MB, Mode:  Interactive, Gen0: 1, Gen1: 1, Gen2: 1, **
Allocated:  24.00 MB, Mode:  Interactive, Gen0: 1, Gen1: 1, Gen2: 1,
Allocated:  27.00 MB, Mode:  Interactive, Gen0: 2, Gen1: 2, Gen2: 2, **
Allocated:  30.00 MB, Mode:  Interactive, Gen0: 2, Gen1: 2, Gen2: 2,
```

So this shows that at least in the simple test we've done, the API works as advertised. As long as you don't subsequently allocate more memory than you asked for, no Garbage Collections will take place.

### Object Size

However there are a few caveats when using `TryStartNoGCRegion`, the first of which is that you are required to know up-front, the total size in bytes of the objects you will be allocating. As we've seen [previously](#test-3-trystartnogcregion-size-of-15mb-but-allocating-more-than-15mb) if you allocate more than `totalSize` bytes, the *No GC Region* will no longer be active and it will then be possible for garbage collections to happen.

It's not straight forward to get the size of an object in .NET, it's a managed-runtime and it tries it's best to hide that sort of detail from you. To further complicate matters is varies depending on the CPU architecture and even the version of the runtime.

But you do have a few options:

1. Guess?!
2. [Search](http://stackoverflow.com/questions/631825/net-object-size) on [Stack](http://stackoverflow.com/questions/1128315/find-size-of-object-instance-in-bytes-in-c-sharp) [Overflow](http://stackoverflow.com/questions/207592/getting-the-size-of-a-field-in-bytes-with-c-sharp)
3. Start-up [WinDbg](https://en.wikipedia.org/wiki/WinDbg) and use the `!objsize` command on a memory dump of your process 
4. Get a estimate using the technique that [Jon Skeet proposes](https://codeblog.jonskeet.uk/2011/04/05/of-memory-and-strings/)
5. Use [DotNetEx](https://www.nuget.org/packages/DotNetEx/), which relies on inspecting the [internal fields of the CLR object](https://github.com/mumusan/dotnetex/blob/master/System.Runtime.CLR/GCEx.cs#L67-L125)

Personally I would go with a variation of 3), use WinDbg, but automate it using the excellent [CLRMD](https://github.com/Microsoft/clrmd/blob/master/Documentation/WalkingTheHeap.md#a-non-linear-heap-walk) C# library.  

### Segment Size

However even when you know how many bytes will be allocated within the *No GC Region*, you still need to ensure that it's less that the maximum amount allowed, because if you specify a value too large an `ArgumentOutOfRangeException` exception is thrown. From the [MSDN docs](https://msdn.microsoft.com/en-us/library/dn906201(v=vs.110).aspx) (emphasis mine):

> The amount of memory in bytes to allocate without triggering a garbage collection. **It must be less than or equal to the size of an ephemeral segment**. For information on the size of an ephemeral segment, see the "Ephemeral generations and segments" section in the [Fundamentals of Garbage Collection article](https://msdn.microsoft.com/en-us/library/ee787088(v=vs.110).aspx).

However if you visit the linked article on *GC Fundamentals*, it has no exact figure for the size of an *ephemeral segment*, it does however have [this stark warning](https://msdn.microsoft.com/en-us/library/ee787088(v=vs.110).aspx#Anchor_2):

> **Important**
The size of segments allocated by the garbage collector is implementation-specific and is subject to change at any time, including in periodic updates. **Your app should never make assumptions about or depend on a particular segment size**, nor should it attempt to configure the amount of memory available for segment allocations.

**Excellent, that's very helpful!?**

So where does that leave us?

Well fortunately it's possible to figure out the size of an ephemeral or Small Object Heap (SOH) segment using either [VMMap](http://blogs.microsoft.co.il/sasha/2011/07/18/mapping-the-memory-usage-of-net-applications-part-2-vmmap-and-memorydisplay/), or the previously mentioned [CLRMD library](https://github.com/Microsoft/clrmd/blob/master/Documentation/WalkingTheHeap.md) ([code sample available](https://gist.github.com/mattwarren/3dce1aea76c50da850af53a2d453e3c0)).

Here are the results I got with the .NET Framework 4.6.1, running on a [4 Core (HT) - Intel® Core™ i7-4800MQ](http://ark.intel.com/products/75128/Intel-Core-i7-4800MQ-Processor-6M-Cache-up-to-3_70-GHz), i.e. [Environment.ProcessorCount = 8](https://msdn.microsoft.com/en-us/library/system.environment.processorcount(v=vs.110).aspx). If you click on the links for each row heading, you can see the full breakdown as reported by [VMMap](https://technet.microsoft.com/en-us/sysinternals/vmmap.aspx). 

| GC Mode | CPU Arch | SOH Segment | LOH Segment | Initial GC Size | Largest *No GC Region* `totalSize` value |
|---------|----------|------------:| -----------:|----------------:|-----------------------------------------:|
| [Workstation]({{ base }}/images/2016/08/GC Heaps - Workstation - 32-bit.png) | 32-bit | 16 MB  | 16 MB | 32 MB | 16 MB |
| [Workstation]({{ base }}/images/2016/08/GC Heaps - Workstation - 64-bit.png) | 64-bit | 256 MB | 128 MB | 384 MB | 244 MB |
| [Server]({{ base }}/images/2016/08/GC Heaps - Server - 32-bit.png) | 32-bit | 32 MB | 16 MB | 384 MB | 256 MB |
| [Server]({{ base }}/images/2016/08/GC Heaps - Server - 64-bit.png) | 64-bit | 2,048 MB | 256 MB | 18,423 MB | 16,384 MB |

The final column is the largest `totalSize` value that can be passed into `TryStartNoGCRegion(long totalSize)`, this was found by experimentation/trial-and-error.

**Note:** The main difference between **Server** and **Workstation** is that in Workstation mode there is [only one heap]({{ base }}/images/2016/08/GC Heaps - Workstation - 32-bit.png), whereas in Sever mode there is [one heap per logical CPU]({{ base }}/images/2016/08/GC Heaps - Server - 32-bit.png). 

----

## TryStartNoGCRegion under-the-hood

What's nice is that the [entire feature is in a single Github commit](https://github.com/dotnet/coreclr/commit/4f74a99e296d929945413c5a65d0c61bb7f2c32a), so it's easy to see what code changes were made:

[![Github commit for the feature]({{ base }}/images/2016/08/Github commit for the feature.png)]({{ base }}/images/2016/08/Github commit for the feature.png)

Around half of the files modified (listed below) are the changes needed to set-up the plumbing and error handling involved in adding a API to the [System.GC class](https://msdn.microsoft.com/en-us/library/system.gc(v=vs.110).aspx()), they also give an interesting overview of what's involved in having the external `C#` code talk to the internal `C++` code in the CLR (click on a link to go directly to the diff):

- [src/mscorlib/src/System/GC.cs](https://github.com/dotnet/coreclr/commit/4f74a99e296d929945413c5a65d0c61bb7f2c32a#diff-6dec79513185e5c912cb878e0858d41c)
- [src/mscorlib/src/System/Runtime/GcSettings.cs](https://github.com/dotnet/coreclr/commit/4f74a99e296d929945413c5a65d0c61bb7f2c32a#diff-1817fbf34d63e01e6b9ae4908e459f36)
- [src/vm/comutilnative.cpp](https://github.com/dotnet/coreclr/commit/4f74a99e296d929945413c5a65d0c61bb7f2c32a#diff-ca326b8cd58d6642f56aa054c221c22a)
- [src/vm/comutilnative.h](https://github.com/dotnet/coreclr/commit/4f74a99e296d929945413c5a65d0c61bb7f2c32a#diff-b8ebb0f0bef52890d69facf86688870e)
- [src/vm/ecalllist.h](https://github.com/dotnet/coreclr/commit/4f74a99e296d929945413c5a65d0c61bb7f2c32a#diff-3667dffbd11675529c85670ef344242e)

The rest of the changes are where the actual work takes, with all the significant heavy-lifting happening in `gc.cpp`:

- [src/gc/gc.cpp](https://github.com/dotnet/coreclr/commit/4f74a99e296d929945413c5a65d0c61bb7f2c32a#diff-9b1cf8b32169db5abb15e28386d99a10)
- [src/gc/gc.h](https://github.com/dotnet/coreclr/commit/4f74a99e296d929945413c5a65d0c61bb7f2c32a#diff-f27aec4c298a7df8ff654eff47e7c0dd)
- [src/gc/gcimpl.h](https://github.com/dotnet/coreclr/commit/4f74a99e296d929945413c5a65d0c61bb7f2c32a#diff-3001bb7a5fd2ac11b928c223e44a2b95)
- [src/gc/gcpriv.h](https://github.com/dotnet/coreclr/commit/4f74a99e296d929945413c5a65d0c61bb7f2c32a#diff-295f0ed467af7d7d972f659a633bf8b9)

### TryStartNoGCRegion Implementation

When you call `TryStartNoGCRegion` the following things happen:

- The maximum required heap sizes are calculated based on the `totalSize` parameter passed in. These calculations take place in [gc_heap::prepare_for_no_gc_region](https://github.com/dotnet/coreclr/commit/4f74a99e296d929945413c5a65d0c61bb7f2c32a#diff-9b1cf8b32169db5abb15e28386d99a10R15196)
- If the current heaps aren't large enough to accommodate the new value, they are re-sized. To achieve this a full collection is triggered (see [GCHeap::StartNoGCRegion](https://github.com/dotnet/coreclr/commit/4f74a99e296d929945413c5a65d0c61bb7f2c32a#diff-9b1cf8b32169db5abb15e28386d99a10R34831))

**Note:** Due to the way the GC uses [segments](#segment-size), it won't always *allocate* memory. It will however ensure that it *reserves* the maximum amount of memory required, so that it can be *committed* when actually needed.

Then next time the GC wants to perform a collection it checks:

1. Is the current mode set to *No GC Region*
  - By checking `gc_heap::settings.pause_mode == pause_no_gc`, [relevant code here](https://github.com/dotnet/coreclr/commit/4f74a99e296d929945413c5a65d0c61bb7f2c32a#diff-9b1cf8b32169db5abb15e28386d99a10R14638)
2. Can we stay in the *No GC Region* mode
  - This is done by calling [gc_heap::should_proceed_for_no_gc()](https://github.com/dotnet/coreclr/commit/4f74a99e296d929945413c5a65d0c61bb7f2c32a#diff-9b1cf8b32169db5abb15e28386d99a10R15448), which performs a sanity-check to ensure that we haven't allocated more than the # of bytes we asked for when `TryStartNoGCRegion` was set-up

If 1) and 2) are both true then a collection **does not** take place because the GC knows that it has already *reserved* enough memory to fulfil future allocations, so it doesn't need to clean-up up any existing garbage to make space.

----

### Further Reading:

- [You can now tell the .NET GC to stop collecting during critical code paths](http://thrivingapp.com/?p=33)
- [Prevent GC Collections In Certain Spots To Improve Performance](http://stackoverflow.com/questions/31560471/prevent-gc-collections-in-certain-spots-to-improve-performance/31561180#31561180)
- [So, what’s new in the CLR 2.0 GC?](https://blogs.msdn.microsoft.com/maoni/2005/10/04/so-whats-new-in-the-clr-2-0-gc/)
- [How does the GC work and what are the sizes of the different generations?](https://blogs.msdn.microsoft.com/tess/2008/04/17/how-does-the-gc-work-and-what-are-the-sizes-of-the-different-generations/)
- [.NET Memory usage – A restaurant analogy](https://blogs.msdn.microsoft.com/tess/2006/09/06/net-memory-usage-a-restaurant-analogy/)

