---

layout: post
title: How Garbage Collectors Work - Part 1
comments: true
tags: [Garbage Collectors, GC, .NET]
date: 2016-02-03

---

This series is an attempt to learn more about how a real-life "Garbage Collector" (GC) works internally, i.e. not so much "*what it does*", but "*how it does it*" at a low-level. I will be mostly be concentrating on the .NET GC, because I'm a .NET developer and because it's recently been [Open Sourced]({{base}}/2015/12/08/open-source-net-1-year-later/) so we can actually look at the code.

Well that was my original plan, but if you go an look at the [.NET Framework GC code](https://github.com/dotnet/coreclr/blob/master/src/gc/gc.cpp) on GitHub you are presented with the message "*This file has been truncated,...*":

[![gc.cpp on GitHub](https://cloud.githubusercontent.com/assets/157298/12352478/49f74242-bb7e-11e5-8028-5df72943f58a.png)](https://github.com/dotnet/coreclr/blob/master/src/gc/gc.cpp)

This is because the file is **36,915** lines long and 1.19MB in size! Now before you send a PR to Microsoft that chops it up into smaller bits, you might want to read this [discussion on reorganizing gc.cpp](https://github.com/dotnet/coreclr/issues/408). It turns out you are not the only one who's had that idea and your PR will probably be rejected, for some [specific reasons](https://github.com/dotnet/coreclr/issues/408#issuecomment-78014795).

### <a name="GoalsOfTheGC"></a>**Goals of the GC**

So I'm not going to be able to read and understand a 36 KLOC .cpp source file any time soon, instead I tried a different approach and started off by looking through the excellent Book-of-the-Runtime (BOTR) section on ["Design of the Collector"](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/garbage-collection.md#design-of-the-collector). This very helpfully lists the following items as the goals of the .NET GC (emphasis mine):

> The GC strives to manage memory **extremely efficiently** and require** very little effort from people who write "managed code"**. Efficient means:
>
> - GCs should occur often enough to **avoid the managed heap containing a significant amount (by ratio or absolute count) of unused but allocated objects** (garbage), and therefore use memory unnecessarily.
- GCs should happen as **infrequently as possible to avoid using otherwise useful CPU time**, even though frequent GCs would result in lower memory usage.
- **A GC should be productive**. If GC reclaims a small amount of memory, then the GC (including the associated CPU cycles) was wasted.
- **Each GC should be fast**. Many workloads have low latency requirements.
- **Managed code developers shouldn’t need to know much about the GC to achieve good memory utilization** (relative to their workload). – The GC should tune itself to satisfy different memory usage patterns.

So there's some interesting goals in there, in particular they have highlighted that the goal of ensuring developers don't have to know much about the GC to make it efficient. This is probably one of the main differences between the .NET and Java GC implementations, as explained in an answer to the Stack Overflow question ["*.Net vs Java Garbage Collector*"](http://stackoverflow.com/questions/492703/net-vs-java-garbage-collector/492821#492821)

> A difference between ~~Sun~~Oracle's and Microsoft's GC implementation 'ethos' is one of configurability.
> 
> ~~Sun~~Oracle's provides a vast number of options (at the command line) to tweaks aspects of the GC or switch it between different modes. Many options are of the -X or -XX to indicate their lack of support across different versions or vendors. The CLR by contrast provides next to no configurability; your only real option is the use of the server or client collectors which optimise for throughput verses latency respectively.

----

### <a name="NETGCSample"></a>**.NET GC Sample**

So now we have an idea about what the goals of the GC are, lets take a look at how it goes about things. Fortunately those nice developers at Microsoft released a [GC Sample](https://github.com/dotnet/coreclr/blob/master/src/gc/sample/GCSample.cpp) that shows you, at a very basic level, how you can use the full .NET GC in your own code. After building the sample (and [finding a few bugs in the process](https://github.com/dotnet/coreclr/pull/2582)), I was able to get a simple, single-threaded GC up and running.

What's interesting about the sample application is that is clearly shows you what actions the .NET Runtime has to perform to make the GC work. At a high-level, the process that the runtime needs to go through to allocate an object is:

1. `AllocateObject(..)` 
  - See below for the code and explanation of the allocation process
1. `CreateGlobalHandle(..)` 
  - If we want to store the object in a "strong handle/reference", as opposed to a "weak" one. In C# code this would typically be a static variable. This is what tells the GC that the object is referenced, so that is can know that it shouldn't be cleaned up when a GC collection happens.
1. `ErectWriteBarrier(..)`
  - For more information see "Marking the Card Table" below

### <a name="AllocatingAnObject"></a>**Allocating an Object**

[`AllocateObject(..)` code from GCSample.cpp](https://github.com/dotnet/coreclr/blob/master/src/gc/sample/GCSample.cpp#L56-L80)

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

Again the BOTR comes in handy here, as it gives us a clear overview of the process, from ["Design of Allocator"](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/garbage-collection.md#design-of-allocator):

> When the GC gives out memory to the allocator, it does so in terms of allocation contexts. The size of an allocation context is defined by the allocation quantum.

> - Allocation contexts are smaller regions of a given heap segment that are each dedicated for use by a given thread. On a single-processor (meaning 1 logical processor) machine, a single context is used, which is the generation 0 allocation context.
> - The Allocation quantum is the size of memory that the allocator allocates each time it needs more memory, in order to perform object allocations within an allocation context. The allocation is typically 8k and the average size of managed objects are around 35 bytes, enabling a single allocation quantum to be used for many object allocations.

This shows how is is possible for the .NET GC to make allocating an object (or memory) such a cheap operation. Because of all the work that is has done in the background, the majority of the time an  object allocation happens, it is just a case of incrementing a pointer by the number of bytes needed to hold the new object. This is what the code in the first 1/2 of the `AllocateObject(..)` function (above) is doing, it's bumping up the free-space pointer (`acontext->alloc_ptr`) and giving out a pointer to the newly created space.

It's only when the current **allocation context** doesn't have enough space that things get more complicated and potentially more expensive. At this point `GCHeap::GetGCHeap()->Alloc(..)` is called which may in turn trigger a GC collection before a new allocation context can be provided.

Finally, it's worth looking at the goals that the allocator is designed to achieve, again from the BOTR:

> - **Triggering a GC when appropriate:** The allocator triggers a GC when the allocation budget (a threshold set by the collector) is exceeded or when the allocator can no longer allocate on a given segment. The allocation budget and managed segments are discussed in more detail later.
- **Preserving object locality:** Objects allocated together on the same heap segment will be stored at virtual addresses close to each other.
- **Efficient cache usage:** The allocator allocates memory in allocation quantum units, not on an object-by-object basis. It zeroes out that much memory to warm up the CPU cache because there will be objects immediately allocated in that memory. The allocation quantum is usually 8k.
- **Efficient locking:** The thread affinity of allocation contexts and quantums guarantee that there is only ever a single thread writing to a given allocation quantum. As a result, there is no need to lock for object allocations, as long as the current allocation context is not exhausted.
- **Memory integrity:** The GC always zeroes out the memory for newly allocated objects to prevent object references pointing at random memory.
- **Keeping the heap crawlable:** The allocator makes sure to make a free object out of left over memory in each allocation quantum. For example, if there is 30 bytes left in an allocation quantum and the next object is 40 bytes, the allocator will make the 30 bytes a free object and get a new allocation quantum.

This shows an advantage of GC systems, namely that you get efficient CPU cache usage because memory is allocated in units and so objects created one after the other (on the same thread), will sit next to each other in memory.

----

### <a name="MarkingTheCardTable"></a>**Marking the "Card Table"**

The 3rd part of the process of allocating an object was a call to [ErectWriteBarrier(Object ** dst, Object * ref)
](https://github.com/dotnet/coreclr/blob/master/src/gc/sample/GCSample.cpp#L91-L106)

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

Now this is probably an entire post on it's own and fortunately other people have already done the work for me

From [Back To Basics: Generational Garbage Collection](http://blogs.msdn.com/b/abhinaba/archive/2009/03/02/back-to-basics-generational-garbage-collection.aspx)

![Write barrier + card-table](http://blogs.msdn.com/blogfiles/abhinaba/WindowsLiveWriter/BackToBasicsGenerationalGarbageCollectio_115F4/image_18.png)

Also see ["Making Generations Work with Write Barriers"](https://msdn.microsoft.com/en-us/library/ms973837.aspx)

Other links:
- https://www.jetbrains.com/dotmemory/help/NET_Memory_Management_Concepts.html
- http://blogs.msdn.com/b/abhinaba/archive/2009/03/02/back-to-basics-generational-garbage-collection.aspx
- http://www.devx.com/Java/Article/21977
- http://blogs.msdn.com/b/abhinaba/archive/2009/03/02/back-to-basics-generational-garbage-collection.aspx
- http://patshaughnessy.net/2013/10/30/generational-gc-in-python-and-ruby
- http://www.cncoders.net/article/6981/

----

### <a name="GCandEEInteraction"></a>**GC and Execution Engine (EE) Interaction**

(see the [real implementation](https://github.com/dotnet/coreclr/blob/master/src/vm/gcenv.ee.cpp) for how the methods are really implemented)

- `void GCToEEInterface::SuspendEE(GCToEEInterface::SUSPEND_REASON reason)`
- `void GCToEEInterface::RestartEE(bool bFinishedGC)`
- `void GCToEEInterface::GcScanRoots(promote_func* fn, int condemned, int max_gen, ScanContext* sc)`
- `void GCToEEInterface::GcStartWork(int condemned, int max_gen)`
- `void GCToEEInterface::AfterGcScanRoots(int condemned, int max_gen, ScanContext* sc)`
- `void GCToEEInterface::GcBeforeBGCSweepWork()`
- `void GCToEEInterface::GcDone(int condemned)`
- `bool GCToEEInterface::RefCountedHandleCallbacks(Object * pObject)`
- `bool GCToEEInterface::IsPreemptiveGCDisabled(Thread * pThread)`
- `void GCToEEInterface::EnablePreemptiveGC(Thread * pThread)`
- `void GCToEEInterface::DisablePreemptiveGC(Thread * pThread)`
- `void GCToEEInterface::SetGCSpecial(Thread * pThread)`
- `alloc_context * GCToEEInterface::GetAllocContext(Thread * pThread)`
- `bool GCToEEInterface::CatchAtSafePoint(Thread * pThread)`
- `void GCToEEInterface::AttachCurrentThread()`
- `void GCToEEInterface::GcEnumAllocContexts (enum_alloc_context_func* fn, void* param)`
- `void GCToEEInterface::SyncBlockCacheWeakPtrScan(HANDLESCANPROC /*scanProc*/, uintptr_t /*lp1*/, uintptr_t /*lp2*/)`
- `void GCToEEInterface::SyncBlockCacheDemote(int /*max_gen*/)`
- `void GCToEEInterface::SyncBlockCachePromotionsGranted(int /*max_gen*/)`

Sample output:

```
GCToEEInterface::SuspendEE(SUSPEND_REASON = 1)
GCToEEInterface::GcEnumAllocContexts(..)
GCToEEInterface::GcStartWork(condemned = 0, max_gen = 2)
GCToEEInterface::GcScanRoots(condemned = 0, max_gen = 2)
GCToEEInterface::AfterGcScanRoots(condemned = 0, max_gen = 2)
GCToEEInterface::GcScanRoots(condemned = 0, max_gen = 2)
GCToEEInterface::GcDone(condemned = 0)
GCToEEInterface::RestartEE(bFinishedGC = TRUE)
```

----

### <a name="FurtherInformation"></a>**Further Information**

[Baby's First Garbage Collector](http://journal.stuffwithstuff.com/2013/12/08/babys-first-garbage-collector/)
[Writing a Simple Garbage Collector in C](http://web.engr.illinois.edu/%7Emaplant2/gc.html)

----

**[Allow users to specify a no GC region (on behalf of maonis)](https://github.com/dotnet/coreclr/commit/4f74a99e296d929945413c5a65d0c61bb7f2c32a)**
This mode lets users to specify an allocation amount for which no GCs would happen. Sometimes during the absolutely performance critical paths users have the desire to allocate without interference from the GC. **If there is enough memory**, GC will not kick in while this mode is set.

a.k.a  the [GC.TryStartNoGCRegion(Int64) method](https://msdn.microsoft.com/en-us/library/dn906201.aspx)

----

### <a name="GCSampleCodeLayout"></a>**GC Sample Code Layout**

GC Sample Code (under \sample)
- GCSample.cpp
- gcenv.h
- gcenv.ee.cpp
- gcenv.windows.cpp
- gcenv.unix.cpp

GC Sample Environment (under \env)
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


GC Code (top-level folder)
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