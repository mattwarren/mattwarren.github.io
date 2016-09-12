---
layout: post
title: Learning How Garbage Collectors Work - Part 1
comments: true
tags: [Garbage Collectors, CLR]
date: 2016-02-04
---

This series is an attempt to learn more about how a real-life "Garbage Collector" (GC) works internally, i.e. not so much "*what it does*", but "*how it does it*" at a low-level. I will be mostly be concentrating on the .NET GC, because I'm a .NET developer and also because it's recently been [Open Sourced]({{base}}/2015/12/08/open-source-net-1-year-later/) so we can actually look at the code.

**Note:** If you do want to learn about what a GC does, I really recommend the talk [Everything you need to know about .NET memory](https://vimeo.com/113632451) by Ben Emmett, it's a fantastic talk that uses lego to explain what the .NET GC does (the [slides are also available](http://www.slideshare.net/benemmett/net-memory-management-ndc-london))

Well, trying to understand what the .NET GC does by looking at the source was my original plan, but if you go and take a look at the [code on GitHub](https://github.com/dotnet/coreclr/blob/master/src/gc/gc.cpp) you will be presented with the message "*This file has been truncated,...*":

[![gc.cpp on GitHub](https://cloud.githubusercontent.com/assets/157298/12352478/49f74242-bb7e-11e5-8028-5df72943f58a.png)](https://github.com/dotnet/coreclr/blob/master/src/gc/gc.cpp)

This is because the file is **36,915** lines long and **1.19MB** in size! Now before you send a PR to Microsoft that chops it up into smaller bits, you might want to read this [discussion on reorganizing gc.cpp](https://github.com/dotnet/coreclr/issues/408). It turns out you are not the only one who's had that idea and your PR will probably be rejected, for some [specific reasons](https://github.com/dotnet/coreclr/issues/408#issuecomment-78014795).

## Goals of the GC

So, as I'm not going to be able to read and understand a 36 KLOC .cpp source file any time soon, instead I tried a different approach and started off by looking through the excellent Book-of-the-Runtime (BOTR) section on the ["Design of the Collector"](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/garbage-collection.md#design-of-the-collector). This very helpfully lists the following goals of the .NET GC (**emphasis** mine):

> The GC strives to manage memory **extremely efficiently** and require **very little effort from people who write managed code**. Efficient means:
>
> - GCs should occur often enough to **avoid the managed heap containing a significant amount (by ratio or absolute count) of unused but allocated objects** (garbage), and therefore use memory unnecessarily.
- GCs should happen as **infrequently as possible to avoid using otherwise useful CPU time**, even though frequent GCs would result in lower memory usage.
- **A GC should be productive**. If GC reclaims a small amount of memory, then the GC (including the associated CPU cycles) was wasted.
- **Each GC should be fast**. Many workloads have low latency requirements.
- **Managed code developers shouldn’t need to know much about the GC to achieve good memory utilization** (relative to their workload). – The GC should tune itself to satisfy different memory usage patterns.

So there's some interesting points in there, in particular they twice included the goal of ensuring developers don't have to know much about the GC to make it efficient. This is probably one of the main differences between the .NET and Java GC implementations, as explained in an answer to the Stack Overflow question ["*.Net vs Java Garbage Collector*"](http://stackoverflow.com/questions/492703/net-vs-java-garbage-collector/492821#492821)

> A difference between Oracle's and Microsoft's GC implementation 'ethos' is one of configurability.
> 
> Oracle provides a vast number of options (at the command line) to tweak aspects of the GC or switch it between different modes. Many options are of the -X or -XX to indicate their lack of support across different versions or vendors. The CLR by contrast provides next to no configurability; your only real option is the use of the server or client collectors which optimise for throughput verses latency respectively.

----

## .NET GC Sample

So now we have an idea about what the goals of the GC are, lets take a look at how it goes about things. Fortunately those nice developers at Microsoft released a [GC Sample](https://github.com/dotnet/coreclr/blob/master/src/gc/sample/GCSample.cpp) that shows you, at a basic level, how you can use the full .NET GC in your own code. After building the sample (and [finding a few bugs in the process](https://github.com/dotnet/coreclr/pull/2582)), I was able to get a simple, single-threaded Workstation GC up and running.

What's interesting about the sample application is that it clearly shows you what actions the [.NET Runtime has to perform to make the GC work](https://github.com/mattwarren/GCSample/blob/master/sample/GCSample.cpp#L11-L37). So for instance, at a high-level the runtime needs to go through the following process to allocate an object:

1. `AllocateObject(..)` 
  - See below for the code and explanation of the allocation process
1. `CreateGlobalHandle(..)` 
  - If we want to store the object in a "strong handle/reference", as opposed to a "weak" one. In C# code this would typically be a static variable. This is what tells the GC that the object is referenced, so that is can know that it shouldn't be cleaned up when a GC collection happens.
1. `ErectWriteBarrier(..)`
  - For more information see "Marking the Card Table" below

### Allocating an Object

[`AllocateObject(..)` code from GCSample.cpp](https://github.com/dotnet/coreclr/blob/master/src/gc/sample/GCSample.cpp#L55-L79)

``` csharp
Object * AllocateObject(MethodTable * pMT)
{
    alloc_context * acontext = GetThread()->GetAllocContext();
    Object * pObject;

    size_t size = pMT->GetBaseSize();

    uint8_t* result = acontext->alloc_ptr;
    uint8_t* advance = result + size;
    if (advance <= acontext->alloc_limit)
    {
        acontext->alloc_ptr = advance;
        pObject = (Object *)result;
    }
    else
    {
        pObject = GCHeap::GetGCHeap()->Alloc(acontext, size, 0);
        if (pObject == NULL)
            return NULL;
    }

    pObject->RawSetMethodTable(pMT);

    return pObject;
}
```

To understand what's going on here, the BOTR again comes in handy as it gives us a clear overview of the process, from ["Design of Allocator"](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/garbage-collection.md#design-of-allocator):

> When the GC gives out memory to the allocator, it does so in terms of allocation contexts. The size of an allocation context is defined by the allocation quantum.

> - Allocation contexts are smaller regions of a given heap segment that are each dedicated for use by a given thread. On a single-processor (meaning 1 logical processor) machine, a single context is used, which is the generation 0 allocation context.
> - The Allocation quantum is the size of memory that the allocator allocates each time it needs more memory, in order to perform object allocations within an allocation context. The allocation is typically 8k and the average size of managed objects are around 35 bytes, enabling a single allocation quantum to be used for many object allocations.

This shows how is is possible for the .NET GC to make allocating an object (or memory) such a cheap operation. Because of all the work that it has done in the background, the majority of the time an  object allocation happens, it is just a case of incrementing a pointer by the number of bytes needed to hold the new object. This is what the code in the first half of the `AllocateObject(..)` function (above) is doing, it's bumping up the free-space pointer (`acontext->alloc_ptr`) and giving out a pointer to the newly created space in memory.

It's only when the current **allocation context** doesn't have enough space that things get more complicated and potentially more expensive. At this point `GCHeap::GetGCHeap()->Alloc(..)` is called which may in turn trigger a GC collection before a new allocation context can be provided.

Finally, it's worth looking at the goals that the allocator was designed to achieve, again from the BOTR:

> - **Triggering a GC when appropriate:** The allocator triggers a GC when the allocation budget (a threshold set by the collector) is exceeded or when the allocator can no longer allocate on a given segment. The allocation budget and managed segments are discussed in more detail later.
- **Preserving object locality:** Objects allocated together on the same heap segment will be stored at virtual addresses close to each other.
- **Efficient cache usage:** The allocator allocates memory in allocation quantum units, not on an object-by-object basis. It zeroes out that much memory to warm up the CPU cache because there will be objects immediately allocated in that memory. The allocation quantum is usually 8k.
- **Efficient locking:** The thread affinity of allocation contexts and quantums guarantee that there is only ever a single thread writing to a given allocation quantum. As a result, there is no need to lock for object allocations, as long as the current allocation context is not exhausted.
- **Memory integrity:** The GC always zeroes out the memory for newly allocated objects to prevent object references pointing at random memory.
- **Keeping the heap crawlable:** The allocator makes sure to make a free object out of left over memory in each allocation quantum. For example, if there is 30 bytes left in an allocation quantum and the next object is 40 bytes, the allocator will make the 30 bytes a free object and get a new allocation quantum.

One of the interesting items this highlights is an advantage of GC systems, namely that you get efficient [CPU cache usage or good object locality](http://mechanical-sympathy.blogspot.co.uk/2012/08/memory-access-patterns-are-important.html) because memory is allocated in units. This means that objects created one after the other (on the same thread), will sit next to each other in memory.

### Marking the "Card Table"

The 3rd part of the process of allocating an object was a call to [ErectWriteBarrier(..)
](https://github.com/dotnet/coreclr/blob/master/src/gc/sample/GCSample.cpp#L90-L105), which looks like this:

```
inline void ErectWriteBarrier(Object ** dst, Object * ref)
{
    // if the dst is outside of the heap (unboxed value classes) then we simply exit
    if (((uint8_t*)dst < g_lowest_address) || ((uint8_t*)dst >= g_highest_address))
        return;
        
    if ((uint8_t*)ref >= g_ephemeral_low && (uint8_t*)ref < g_ephemeral_high)
    {
        // volatile is used here to prevent fetch of g_card_table from being reordered 
        // with g_lowest/highest_address check above. 
        uint8_t* pCardByte = (uint8_t *)*(volatile uint8_t **)(&g_card_table) + 
                             card_byte((uint8_t *)dst);
        if(*pCardByte != 0xFF)
            *pCardByte = 0xFF;
    }
}
```

Now explaining what is going on here is probably an entire post on it's own and fortunately other people have already done the work for me, if you are interested in finding our more take a look at the [links at the end of this post](#further-information). 

But in summary, the card-table is an optimisation that allows the GC to collect a single Generation (e.g. Gen 0), but still know about objects that are referenced from other, older generations. For instance if you had an array, `myArray = new MyClass[100]` that was in Gen 1 and you wrote the following code `myArray[5] = new MyClass()`, a write barrier would be set-up to indicate that the `MyClass` object was referenced by a given section of Gen 1 memory. 

Then, when the GC wants to perform the mark phase for a Gen 0, in order to find all the live-objects it uses the card-table to tell it in which memory section(s) of other Generations it needs to look. This way it can find references from those older objects to the ones stored in Gen 0. This is a space/time tradeoff, the card-table represents 4KB sections of memory, so it still has to scan through that 4KB chunk, but it's better than having to scan the entire contents of the Gen 1 memory when it wants to carry of a Gen 0 collection.

If it didn't do this extra check (via the card-table), then any Gen 0 objects that were only referenced by older objects (i.e. those in Gen 1/2) would not be considered "live" and would then be collected. See the image below for what this looks like in practice:

![Write barrier + card-table](https://msdnshared.blob.core.windows.net/media/TNBlogsFS/BlogFileStorage/blogs_msdn/abhinaba/WindowsLiveWriter/BackToBasicsGenerationalGarbageCollectio_115F4/image_18.png)

Image taken from [Back To Basics: Generational Garbage Collection](http://blogs.msdn.com/b/abhinaba/archive/2009/03/02/back-to-basics-generational-garbage-collection.aspx)

----

## GC and Execution Engine Interaction

The final part of the GC sample that I will be looking at is the way in which the GC needs to interact with the .NET Runtime Execution Engine (EE). The EE is responsible for actually running or coordinating all the low-level things that the .NET runtime needs to-do, such as creating threads, reserving memory and so it acts as an interface to the OS, via [Windows](https://github.com/mattwarren/GCSample/blob/master/sample/gcenv.windows.cpp) and [Unix](https://github.com/mattwarren/GCSample/blob/master/sample/gcenv.unix.cpp) implementations.

To understand this interaction between the GC and the EE, it's helpful to look at all the functions the GC expects the EE to make available:

- `void SuspendEE(GCToEEInterface::SUSPEND_REASON reason)`
- `void RestartEE(bool bFinishedGC)`
- `void GcScanRoots(promote_func* fn, int condemned, int max_gen, ScanContext* sc)`
- `void GcStartWork(int condemned, int max_gen)`
- `void AfterGcScanRoots(int condemned, int max_gen, ScanContext* sc)`
- `void GcBeforeBGCSweepWork()`
- `void GcDone(int condemned)`
- `bool RefCountedHandleCallbacks(Object * pObject)`
- `bool IsPreemptiveGCDisabled(Thread * pThread)`
- `void EnablePreemptiveGC(Thread * pThread)`
- `void DisablePreemptiveGC(Thread * pThread)`
- `void SetGCSpecial(Thread * pThread)`
- `alloc_context * GetAllocContext(Thread * pThread)`
- `bool CatchAtSafePoint(Thread * pThread)`
- `void AttachCurrentThread()`
- `void GcEnumAllocContexts (enum_alloc_context_func* fn, void* param)`
- `void SyncBlockCacheWeakPtrScan(HANDLESCANPROC, uintptr_t, uintptr_t)`
- `void SyncBlockCacheDemote(int /*max_gen*/)`
- `void SyncBlockCachePromotionsGranted(int /*max_gen*/)`

If you want to see how the .NET Runtime performs these "tasks", you can take a look at the [real implementation](https://github.com/dotnet/coreclr/blob/master/src/vm/gcenv.ee.cpp). However in the GC Sample these methods are mostly [stubbed out](https://github.com/mattwarren/GCSample/blob/90d07fdff32d370a3977978854d2d221027e1780/sample/gcenv.ee.cpp#L147-L165) as no-ops. So that I could get an idea of the flow of the GC during a collection, I added simple `print(..)` statements to each one, then when I ran the GC Sample I got the following output:

```
SuspendEE(SUSPEND_REASON = 1)
GcEnumAllocContexts(..)
GcStartWork(condemned = 0, max_gen = 2)
GcScanRoots(condemned = 0, max_gen = 2)
AfterGcScanRoots(condemned = 0, max_gen = 2)
GcScanRoots(condemned = 0, max_gen = 2)
GcDone(condemned = 0)
RestartEE(bFinishedGC = TRUE)
```

Which fortunately corresponds nicely with the GC phases for **[WKS GC with concurrent GC off](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/garbage-collection.md#wks-gc-with-concurrent-gc-off)** as outlined in the BOTR:

> 1. User thread runs out of allocation budget and triggers a GC.
1. GC calls SuspendEE to suspend managed threads.
1. GC decides which generation to condemn.
1. Mark phase runs.
1. Plan phase runs and decides if a compacting GC should be done.
1. If so relocate and compact phase runs. Otherwise, sweep phase runs.
1. GC calls RestartEE to resume managed threads.
1. User thread resumes running.

----

## Further Information

If you want to find out any more information about Garbage Collectors, here is a list of useful links:

- General
  - [Baby's First Garbage Collector](http://journal.stuffwithstuff.com/2013/12/08/babys-first-garbage-collector/)
  - [Writing a Simple Garbage Collector in C](http://web.engr.illinois.edu/%7Emaplant2/gc.html)
- Marking the Card Table
  - [Making Generations Work with Write Barriers](https://msdn.microsoft.com/en-us/library/ms973837.aspx)
  - [Generational GC in Python and Ruby](http://patshaughnessy.net/2013/10/30/generational-gc-in-python-and-ruby)
  - [NET Memory Management Concepts](https://www.jetbrains.com/dotmemory/help/NET_Memory_Management_Concepts.html)
  - [Back-to-basics Generational GC](http://blogs.msdn.com/b/abhinaba/archive/2009/03/02/back-to-basics-generational-garbage-collection.aspx)
  - [Garbage Collection in the Java HotSpot Virtual Machine](http://www.devx.com/Java/Article/21977)
  - [Understanding GC pauses in JVM, HotSpot's minor GC](http://www.cncoders.net/article/6981/)

----

## GC Sample Code Layout (for reference)

**GC Sample Code (under \sample)**

- GCSample.cpp
- gcenv.h
- gcenv.ee.cpp
- gcenv.windows.cpp
- gcenv.unix.cpp

**GC Sample Environment (under \env)**

- common.cpp 
- common.h
- etmdummy.g
- gcenv.base.h
- gcenv.ee.h
- gcenv.interlocked.h
- gcenv.interlocked.inl
- gcenv.object.h
- gcenv.os.h
- gcenv.structs.h
- gcenv.sync.h


**GC Code (top-level folder)**

- gc.cpp (36,911 lines long!!)
- gc.h 
- gccommon.cpp
- gcdesc.h
- gcee.cpp
- gceewks.cpp
- gcimpl.h
- gcrecord.h
- gcscan.cpp
- gcscan.h
- gcsvr.cpp
- gcwks.cpp
- handletable.h
- handletable.inl
- handletablecache.cpp
- gandletablecore.cpp
- handletablepriv.h
- handletablescan.cpp
- objecthandle.cpp
- objecthandle.h