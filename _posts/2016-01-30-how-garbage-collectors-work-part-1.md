---
layout: post
title: How Garbage Collectors Work - Part 1
comments: true
tags: [Garbage Collectors, GC, .NET]
published: false
date: 2016-01-20
---


### Goals of the GC

From the excellent Book-of-the-Runtime (BOTR) section on ["Design of the Collector"](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/garbage-collection.md#design-of-the-collector)

> The GC strives to manage memory extremely efficiently and require very little effort from people who write "managed code". Efficient means:

> - GCs should occur often enough to avoid the managed heap containing a significant amount (by ratio or absolute count) of unused but allocated objects (garbage), and therefore use memory unnecessarily.
- GCs should happen as infrequently as possible to avoid using otherwise useful CPU time, even though frequent GCs would result in lower memory usage.
- A GC should be productive. If GC reclaims a small amount of memory, then the GC (including the associated CPU cycles) was wasted.
- Each GC should be fast. Many workloads have low latency requirements.
- Managed code developers shouldn’t need to know much about the GC to achieve good memory utilization (relative to their workload). – The GC should tune itself to satisfy different memory usage patterns.

----
### Allocating an Object

1. `AllocateObject(..)` 
  - See below for the code and explanation of the allocation process
1. `CreateGlobalHandle(..)` 
  - If we want to store the object in a "strong handle/reference", as opposed to a "weak" one. In C# code this would typically be a static variable.
1. `ErectWriteBarrier(..)`
  - For more information see "Marking the Card Table" below

[From GCSample.cpp](https://github.com/dotnet/coreclr/blob/master/src/gc/sample/GCSample.cpp#L56-L80)

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

From ["Design of Allocator"](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/garbage-collection.md#design-of-allocator) in the BOTR:

> When the GC gives out memory to the allocator, it does so in terms of allocation contexts. The size of an allocation context is defined by the allocation quantum.

> - Allocation contexts are smaller regions of a given heap segment that are each dedicated for use by a given thread. On a single-processor (meaning 1 logical processor) machine, a single context is used, which is the generation 0 allocation context.
> - The Allocation quantum is the size of memory that the allocator allocates each time it needs more memory, in order to perform object allocations within an allocation context. The allocation is typically 8k and the average size of managed objects are around 35 bytes, enabling a single allocation quantum to be used for many object allocations.

In addition, the allocator is designed to achieve the following:

> - **Triggering a GC when appropriate:** The allocator triggers a GC when the allocation budget (a threshold set by the collector) is exceeded or when the allocator can no longer allocate on a given segment. The allocation budget and managed segments are discussed in more detail later.
- **Preserving object locality:** Objects allocated together on the same heap segment will be stored at virtual addresses close to each other.
- **Efficient cache usage:** The allocator allocates memory in allocation quantum units, not on an object-by-object basis. It zeroes out that much memory to warm up the CPU cache because there will be objects immediately allocated in that memory. The allocation quantum is usually 8k.
- **Efficient locking:** The thread affinity of allocation contexts and quantums guarantee that there is only ever a single thread writing to a given allocation quantum. As a result, there is no need to lock for object allocations, as long as the current allocation context is not exhausted.
- **Memory integrity:** The GC always zeroes out the memory for newly allocated objects to prevent object references pointing at random memory.
- **Keeping the heap crawlable:** The allocator makes sure to make a free object out of left over memory in each allocation quantum. For example, if there is 30 bytes left in an allocation quantum and the next object is 40 bytes, the allocator will make the 30 bytes a free object and get a new allocation quantum.

----

### Marking the "Card Table"

Followed by a call to [ErectWriteBarrier(Object ** dst, Object * ref)
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

### GC and Execution Engine (EE) Interaction

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

---

## Further Information

[Baby's First Garbage Collector](http://journal.stuffwithstuff.com/2013/12/08/babys-first-garbage-collector/)
[Writing a Simple Garbage Collector in C](http://web.engr.illinois.edu/%7Emaplant2/gc.html)

----

**[Allow users to specify a no GC region (on behalf of maonis)](https://github.com/dotnet/coreclr/commit/4f74a99e296d929945413c5a65d0c61bb7f2c32a)**
This mode lets users to specify an allocation amount for which no GCs would happen. Sometimes during the absolutely performance critical paths users have the desire to allocate without interference from the GC. **If there is enough memory**, GC will not kick in while this mode is set.

a.k.a  the [GC.TryStartNoGCRegion(Int64) method](https://msdn.microsoft.com/en-us/library/dn906201.aspx)

----

### GC Sample Code layout

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