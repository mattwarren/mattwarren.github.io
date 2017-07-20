---
layout: post
title: Memory Usage Inside the CLR
comments: true
tags: [.NET, CLR, Internals]
---

Have you ever wondered where and why the .NET Runtime (CLR) allocates memory? I don't mean the '*managed*' memory that *your* code allocates, e.g. via `new MyClass(..)` and the Garbage Collector (GC) then cleans up. I mean the memory that the CLR *itself* allocates, all the internal data structures that it needs to make is possible for your code to run.

**Note** just to clarify, this post will **not** be telling you how you can analyse the memory usage of *your code*, for that I recommend using one of the excellent .NET Profilers available such as [dotMemory by JetBrains](https://www.jetbrains.com/dotmemory/features/) or the [ANTS Memory Profiler from Redgate](http://www.red-gate.com/products/dotnet-development/ants-memory-profiler/) (I've personally used both and they're great)

----

## The high-level view

Fortunately there's a fantastic tool that makes it very easy for us to get an overview of memory usage within the CLR itself. It's called [VMMap](https://technet.microsoft.com/en-us/sysinternals/vmmap.aspx) and it's part of the excellent [Sysinternals Suite](https://technet.microsoft.com/en-gb/sysinternals/bb842062).

For the post I will just be using a simple `HelloWorld` program, so that we can observe what the CLR does in the simplest possible scenario, obviously things may look a bit different in a more complex app. 

Firstly, lets look at the data over time, in 1 second intervals. The `HelloWorld` program just prints to the Console and then waits until you press `<ENTER>`, so once the memory usage has reached it's peak it remains there till the program exits. (Click for a larger version)

[![Overall Memory Usage - Timeline (Committed)]({{ base }}/images/2017/07/Overall Memory Usage - Timeline (Committed).png)]({{ base }}/images/2017/07/Overall Memory Usage - Timeline (Committed).png)

However, to get a more detailed view, we will now look at the *snapshot* from 2 seconds into the timeline, when the memory usage has stabilised. 

[![Overall Memory Usage]({{ base }}/images/2017/07/Overall Memory Usage.png)]({{ base }}/images/2017/07/Overall Memory Usage.png)

**Note**: If you want to find out more about memory usage in general, but also *specifically* how measure it in .NET applications, I recommend reading this excellent series of posts by [Sasha Goldshtein](https://twitter.com/goldshtn)

- [Mapping the Memory Usage of .NET Applications: Part 1, Windows Memory Recap](http://blogs.microsoft.co.il/sasha/2011/07/14/mapping-the-memory-usage-of-net-applications-part-1-windows-memory-recap/)
- [Mapping the Memory Usage of .NET Applications: Part 2, VMMap and MemoryDisplay](http://blogs.microsoft.co.il/sasha/2011/07/18/mapping-the-memory-usage-of-net-applications-part-2-vmmap-and-memorydisplay/)
- [Mapping the Memory Usage of .NET Applications: Part 3, CLR Profiler](http://blogs.microsoft.co.il/sasha/2011/07/22/mapping-the-memory-usage-of-net-applications-part-3-clr-profiler/)

Also, if like me you always get the different types of memory mixed-up, please read this Stackoverflow answer first [What is private bytes, virtual bytes, working set?](https://stackoverflow.com/questions/1984186/what-is-private-bytes-virtual-bytes-working-set)

### 'Image' Memory

Now we've seen the high-level view, lets take a close look at the individual chucks, the largest of which is labelled *Image*, which according to the VMMap help page (see here for [all info on all memory types]({{ base }}/images/2017/07/VMMap - Help for Memory Types.png)):

> ... represents an executable file such as a .exe or .dll and has been loaded into a process by the image loader. It does not include images mapped as data files, which would be included in the Mapped File memory type. Image mappings can include shareable memory like code. When data regions, like initialized data, is modified, additional private memory is created in the process. 

[![Image Memory Usage]({{ base }}/images/2017/07/Image Memory Usage.png)]({{ base }}/images/2017/07/Image Memory Usage.png)

At this point, it's worth pointing out a few things:

1. This memory is takes up a large amount of the total process memory because I'm using a simple `HelloWorld` program, in other types of programs it wouldn't dominate the memory usage as much
2. I was using a `DEBUG` version of the [CoreCLR](https://github.com/dotnet/coreclr), so the CLR specific files System.Private.CoreLib.dll, coreclr.dll, clrjit.dll and CoreRun.exe may well be larger than if they were compiled in `RELEASE` mode
3. Some of this memory is potentially 'shared' with other processes, compare the numbers in the 'Total WS', 'Private WS', 'Shareable WS' and 'Shared WS' columns to see this in action.

### 'Managed Heaps' created by the Garbage Collector

The next largest usage of memory is the GC itself, it pre-allocates several *heaps* that it can then give out whenever your program allocates an object, for example via code such as `new MyClass()` or `new byte[]`.

[![Managed Heap Memory Usage - Expanded]({{ base }}/images/2017/07/Managed Heap Memory Usage - Expanded.png)]({{ base }}/images/2017/07/Managed Heap Memory Usage - Expanded.png)

The main thing to note about the image above is that you can clearly see the different heap, there is 256 MB allocated for *Generations* (Gen 0, 1, 2) and 128 MB for the 'Large Object Heap'. In addition, note the difference between the amounts in the *Size* and the *Committed* columns. Only the *Committed* memory is actually being used, the total *Size* is what the GC pre-allocates or reserves up front from the address space.

If you're interested, the rules for *heap* or more specifically *segment* sizes are helpfully explained in the [Microsoft Docs](https://docs.microsoft.com/en-us/dotnet/standard/garbage-collection/fundamentals#ephemeral-generations-and-segments), but simply put, it varies depending on the GC mode (Workstation v Server), whether the process is 32/64-bit and 'Number of CPUs'.

----

## Internal CLR 'Heap' memory

However the part that I'm going to look at for the rest of this post is the memory that is allocated by the CLR itself, that is *unmanaged memory* that is uses for all its internal data structures. 

But if we just look at the VMMap UI view, it doesn't really tell us that much!

[![Heap Memory Usage]({{ base }}/images/2017/07/Heap Memory Usage.png)]({{ base }}/images/2017/07/Heap Memory Usage.png)

However, using the excellent [PerfView tool](https://github.com/Microsoft/perfview/) we can capture the full call-stack of any memory allocations, that is any calls to [VirtualAlloc()](https://msdn.microsoft.com/en-us/library/windows/desktop/aa366887(v=vs.85).aspx) or [RtlAllocateHeap()](https://msdn.microsoft.com/en-us/library/windows/hardware/ff552108(v=vs.85).aspx) (obviously these functions only apply when running the CoreCLR on Windows). If we do this, PerfView gives us the following data (yes, it's not pretty, but it's very powerful!!)

[![PerfView - Net Virtual Alloc Stacks]({{ base }}/images/2017/07/PerfView - Net Virtual Alloc Stacks.png)]({{ base }}/images/2017/07/PerfView - Net Virtual Alloc Stacks.png)

So lets explore this data in more detail.

### Notable memory allocations

There are a few places where the CLR allocates significant chunks of memory up-front and then uses them through its lifetime, they are listed below:

- GC related allocations (see [gc.cpp](https://github.com/dotnet/coreclr/blob/master/src/gc/gc.cpp))
  - Mark List - **1,052,672 Bytes (1,028 K)** in `WKS::make_mark_list(..)`. using during the 'mark' phase of the GC, see [Back To Basics: Mark and Sweep Garbage Collection](https://blogs.msdn.microsoft.com/abhinaba/2009/01/30/back-to-basics-mark-and-sweep-garbage-collection/)
  - Card Table - **397,312 Bytes (388 K)** in `WKS::gc_heap::make_card_table(..)`, see [Marking the 'Card Table']({{ base }}/2016/02/04/learning-how-garbage-collectors-work-part-1/#marking-the-card-table)
  - Overall Heap Creation/Allocation - **204,800 Bytes (200 K)** in `WKS::gc_heap::make_gc_heap(..)`
  - S.O.H Segment creation - **65,536 Bytes (64 K)** in `WKS::gc_heap::allocate(..)`, triggered by the first object allocation
  - L.O.H Segment creation - **65,536 Bytes (64 K)** in `WKS::gc_heap::allocate_large_object(..)`, triggered by the first 'large' object allocation  
  - Handle Table - **20,480 Bytes (20 K)** in [HndCreateHandleTable(..)](https://github.com/dotnet/coreclr/blob/74a3f9691e490e9732da55c46b678159c64fae74/src/gc/handletable.cpp#L110)
- Stress Log - **4,194,304 Bytes (4,096 K)** in [StressLog::Initialize(..)](https://github.com/dotnet/coreclr/blob/74a3f9691e490e9732da55c46b678159c64fae74/src/utilcode/stresslog.cpp#L191). Only if the 'stress log' is activated, see [this comment for more info](https://github.com/dotnet/coreclr/blob/master/src/inc/stresslog.h#L6-L22)
- 'Watson' error reporting - **65,536 Bytes (64 K)** in [EEStartupHelper routine](https://github.com/dotnet/coreclr/blob/3a24095610ecaba62495740bf8319ad467af4997/src/vm/ceemain.cpp#L1079-L1090)
- Virtual Call Stub Manager - **36,864 Bytes (36 K)** in [VirtualCallStubManager::InitStatic()](https://github.com/dotnet/coreclr/blob/74a3f9691e490e9732da55c46b678159c64fae74/src/vm/virtualcallstub.cpp#L877), which in turn [creates the DispatchCache](https://github.com/dotnet/coreclr/blob/74a3f9691e490e9732da55c46b678159c64fae74/src/vm/virtualcallstub.cpp#L3449-L3475). See ['Virtual Stub Dispatch' in the BOTR](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/virtual-stub-dispatch.md) for more info
- Debugger Heap and Control-Block - **28,672 Bytes (28K)** (only if debugging support is needed) in [DebuggerHeap::Init(..)](https://github.com/dotnet/coreclr/blob/51e968b013e9b1582035f202e004ed024f747f4f/src/debug/ee/debugger.cpp#L16637-L16639) and [DebuggerRCThread::Init(..)](https://github.com/dotnet/coreclr/blob/51e968b013e9b1582035f202e004ed024f747f4f/src/debug/ee/rcthread.cpp#L402), both called via [InitializeDebugger(..)](https://github.com/dotnet/coreclr/blob/3a24095610ecaba62495740bf8319ad467af4997/src/vm/ceemain.cpp#L2759-L2839)

### Execution Engine Heaps

However another technique that it uses is to allocated 'heaps', often 64K at a time and then perform individual allocations within the heaps as needed. These heaps are split up into individual use-cases, the most common being for '**frequently accessed**' data and it's counter-part, data that is '**rarely accessed**', see the explanation from this comment in [loaderallocator.hpp](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/vm/loaderallocator.hpp#L73-L91) for more. This is done to ensure that the CLR retains control over any memory allocations and can therefore prevent 'fragmentation'.

These heaps are together known as 'Loader Heaps' as explained in [Drill Into .NET Framework Internals to See How the CLR Creates Runtime Objects](https://web.archive.org/web/20080919091745/http://msdn.microsoft.com:80/en-us/magazine/cc163791.aspx#S5) (wayback machine version):

> **LoaderHeaps**
LoaderHeaps are meant for loading various runtime CLR artifacts and optimization artifacts that live for the lifetime of the domain. These heaps grow by predictable chunks to minimize fragmentation. LoaderHeaps are different from the garbage collector (GC) Heap (or multiple heaps in case of a symmetric multiprocessor or SMP) in that the GC Heap hosts object instances while LoaderHeaps hold together the type system. Frequently accessed artifacts like MethodTables, MethodDescs, FieldDescs, and Interface Maps get allocated on a **HighFrequencyHeap**, while less frequently accessed data structures, such as EEClass and ClassLoader and its lookup tables, get allocated on a **LowFrequencyHeap**. The **StubHeap** hosts stubs that facilitate code access security (CAS), COM wrapper calls, and P/Invoke.

One of the main places you see this high/low-frequency of access is in the heart of the Type system, where different data items are either classified as 'hot' (high-frequency) or 'cold' (low-frequency), from the ['Key Data Structures' section](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/type-loader.md#key-data-structures) of the BOTR page on 'Type Loader Design':

> **EEClass**
>
> **MethodTable** data are split into "hot" and "cold" structures to improve working set and cache utilization. **MethodTable** itself is meant to only store "hot" data that are needed in program steady state. **EEClass** stores "cold" data that are typically only needed by type loading, JITing or reflection. Each **MethodTable** points to one **EEClass**.

Further to this, listed below are some specific examples of when each heap type is used:

- List of all [**Low-Frequency Heap** usages](https://github.com/dotnet/coreclr/search?utf8=%E2%9C%93&q=GetLowFrequencyHeap&type=)
  - [EEClass::operator new](https://github.com/dotnet/coreclr/blob/b258792e59b09060f54e0c9bbd31edc3e67d1ae8/src/vm/class.cpp#L74) (the 'cold' scenario above)
  - [MscorlibBinder::AttachModule(..)](https://github.com/dotnet/coreclr/blob/cd95a2e99450f892e56d9703cc71ddd682421e62/src/vm/binder.cpp#L1135)
  - [EETypeHashTable::Create(..)](https://github.com/dotnet/coreclr/blob/b258792e59b09060f54e0c9bbd31edc3e67d1ae8/src/vm/typehash.cpp#L46)
  - [COMNlsHashProvider::InitializeDefaultSeed()](https://github.com/dotnet/coreclr/blob/7e4afb4fbf900b789f53ccb816c6ddba7807de68/src/vm/comutilnative.cpp#L3056)
  - [ClassLoader::CreateTypeHandleForTypeKey(..)](https://github.com/dotnet/coreclr/blob/a3c193780b8e055678feb06b2499cf8e7b41810c/src/vm/clsload.cpp#L3647) (when creating function pointers)
- List of all [**High-Frequency** Heap usages](https://github.com/dotnet/coreclr/search?utf8=%E2%9C%93&q=GetHighFrequencyHeap&type=)
  - [MethodTableBuilder::AllocateNewMT(..)](https://github.com/dotnet/coreclr/blob/4ee1c192d1638b4bc69db59c0807a2b8c2b5bd3c/src/vm/methodtablebuilder.cpp#L9888) (the 'hot' scenario mentioned above)
  - [ArrayClass::GenerateArrayAccessorCallSig(..)](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/vm/array.cpp#L148)
  - [ClassLoader::CreateTypeHandleForNonCanonicalGenericInstantiation(..)](https://github.com/dotnet/coreclr/blob/0ee3b5e64a98dc71aefed2304fe4bcf7f66ca9f5/src/vm/generics.cpp#L335)
  - [ECall::GetFCallImpl(..)](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/vm/ecall.cpp#L414)
  - [ComPlusCall::PopulateComPlusCallMethodDesc(..)](https://github.com/dotnet/coreclr/blob/a9b25d4aa22a1f4ad5f323f6c826e318f5a720fe/src/vm/clrtocomcall.cpp#L77)
- List of all [**Stub Heap** usages](https://github.com/dotnet/coreclr/search?utf8=%E2%9C%93&q=GetStubHeap&type=)
  - [MethodDesc::DoPrestub(..)](https://github.com/dotnet/coreclr/blob/8cc7e35dd0a625a3b883703387291739a148e8c8/src/vm/prestub.cpp#L1005) (triggers JIT-ting of a method)
  - [UMEntryThunkCache::GetUMEntryThunk(..)](https://github.com/dotnet/coreclr/blob/44285ef65b626db7954066ff596d6be07c7dd7a2/src/vm/dllimportcallback.cpp#L953) (a DLL Import callback)
  - [ComCall::CreateGenericComCallStub(..)](https://github.com/dotnet/coreclr/blob/51e968b013e9b1582035f202e004ed024f747f4f/src/vm/comtoclrcall.cpp#L1858)
  - [MakeUnboxingStubWorker(..)](https://github.com/dotnet/coreclr/blob/8cc7e35dd0a625a3b883703387291739a148e8c8/src/vm/prestub.cpp#L956)
- List of all [**Precode Heap** Usages](https://github.com/dotnet/coreclr/search?utf8=%E2%9C%93&q=GetPrecodeHeap&type=)
  - [MethodDescChunk::AllocateCompactEntryPoints(..)](https://github.com/dotnet/coreclr/blob/fd3668c7c9b9f5d64b5e6d1edf8c55a307cd3c2d/src/vm/method.cpp#L4693)
  - [Precode::Allocate(..)](https://github.com/dotnet/coreclr/blob/980c1204d68f54be77eb840cc3f2e4fe2df42a26/src/vm/precode.cpp#L378)
  - [Precode::AllocateTemporaryEntryPoints(..)](https://github.com/dotnet/coreclr/blob/980c1204d68f54be77eb840cc3f2e4fe2df42a26/src/vm/precode.cpp#L542)
- List of all [**Executable Heap** usages](https://github.com/dotnet/coreclr/search?utf8=%E2%9C%93&q=GetExecutableHeap&type=)
  - [GenerateInitPInvokeFrameHelper(..)](https://github.com/dotnet/coreclr/blob/4f8be95166a30ea7c0b1d6aed4ef424ee47c425a/src/vm/i386/cgenx86.cpp#L1086)
  - [JIT_TrialAlloc::GenBox(..)](https://github.com/dotnet/coreclr/blob/38a2a69c786e4273eb1339d7a75f939c410afd69/src/vm/i386/jitinterfacex86.cpp#L883) (x86 JIT)
  - From [comment on GetExecutableHeap()](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/vm/loaderallocator.hpp#L329) 'The executable heap is intended to only be used by the global loader allocator.'

All the general 'Loader Heaps' listed above are allocated in the `LoaderAllocator::Init(..)` function ([link to actual code](https://github.com/dotnet/coreclr/blob/32b52269a270f9b7800da3ba119b92061f528789/src/vm/loaderallocator.cpp#L986-L1044)), the `executable` and `stub` heap have the 'executable' flag set, all the rest don't. The size of these heaps is [configured in this code](https://github.com/dotnet/coreclr/blob/32b52269a270f9b7800da3ba119b92061f528789/src/vm/appdomain.hpp#L811-L818), they 'reserve' different amounts up front, but they all have a 'commit' size that is equivalent to one OS 'page'. 

In addition to the 'general' heaps, there are some others that are specifically used by the [Virtual Stub Dispatch](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/virtual-stub-dispatch.md) mechanism, they are known as the `indcell_heap`, `cache_entry_heap`, `lookup_heap`, `dispatch_heap` and `resolve_heap`, they're allocated [in this code](https://github.com/dotnet/coreclr/blob/master/src/vm/virtualcallstub.cpp#L690-L756), using the [specified commit/reserve sizes](https://github.com/dotnet/coreclr/blob/master/src/vm/virtualcallstub.cpp#L521-L688).

Finally, if you're interested in the mechanics of how the heaps actually work [take a look at LoaderHeap.cpp](https://github.com/dotnet/coreclr/blob/master/src/utilcode/loaderheap.cpp). 

### JIT Memory Usage

Last, but by no means least, there is one other component in the CLR that extensively allocates memory and that is the JIT. It does so in 2 main scenarios:

1. **'Transient'** or temporary memory needed when it's doing the job of converting IL code into machine code
2. **'Permanent'** memory used when it needs to emit the 'machine code' for a method

#### **'Transient' Memory**

This is needed by the JIT when it is doing the job of converting IL code into machine code for the current CPU architecture. This memory is only needed whilst the JIT is running and can be re-used/discarded later, it is used to hold the internal [JIT data structures](https://github.com/dotnet/coreclr/blob/bbf13d7e5e0764770cc0d55d727beb73a05d55f6/Documentation/botr/ryujit-overview.md#overview-of-the-ir) (e.g. `Compiler`, `BasicBlock`, `GenTreeStmt`, etc).

For example, take a look at the following code from [Compiler::fgValueNumber()](https://github.com/dotnet/coreclr/blob/74a3f9691e490e9732da55c46b678159c64fae74/src/jit/valuenum.cpp#L4489):

``` cpp
...
 // Allocate the value number store.
assert(fgVNPassesCompleted > 0 || vnStore == nullptr);
if (fgVNPassesCompleted == 0)
{
    CompAllocator* allocator = new (this, CMK_ValueNumber) CompAllocator(this, CMK_ValueNumber);
    vnStore                  = new (this, CMK_ValueNumber) ValueNumStore(this, allocator);
}
...
```

The line `vnStore = new (this, CMK_ValueNumber) ...` ends up calling the specialised `new` operator defined in [compiler.hpp](https://github.com/dotnet/coreclr/blob/74a3f9691e490e9732da55c46b678159c64fae74/src/jit/compiler.hpp) (code shown below), which as per the comment, uses a customer 'Arena Allocator' that is implemented in [/src/jit/alloc.cpp](https://github.com/dotnet/coreclr/blob/master/src/jit/alloc.cpp)

``` cpp
/*****************************************************************************
 *  operator new
 *
 *  Note that compGetMem is an arena allocator that returns memory that is
 *  not zero-initialized and can contain data from a prior allocation lifetime.
 *  it also requires that 'sz' be aligned to a multiple of sizeof(int)
 */

inline void* __cdecl operator new(size_t sz, Compiler* context, CompMemKind cmk)
{
    sz = AlignUp(sz, sizeof(int));
    assert(sz != 0 && (sz & (sizeof(int) - 1)) == 0);
    return context->compGetMem(sz, cmk);
}
```

This technique (of overriding the `new` operator) is used in [lots of places throughout the CLR](https://github.com/dotnet/coreclr/search?utf8=%E2%9C%93&q=%22operator+new%22&type=), for instance there is a generic one implemented in [the CLR Host](https://github.com/dotnet/coreclr/blob/32b52269a270f9b7800da3ba119b92061f528789/src/utilcode/clrhost_nodependencies.cpp#L421-L440).

#### **'Permanent' Memory**

The last type of memory that the JIT uses is 'permanent' memory to store the JITted machine code, this is done via calls to [Compiler::compGetMem(..)](https://github.com/dotnet/coreclr/blob/44f57065649af5f8bcbb7c71d827221a7bc1bf7a/src/jit/compiler.cpp#L2163-L2200), starting from [Compiler::compCompile(..)](https://github.com/dotnet/coreclr/blob/44f57065649af5f8bcbb7c71d827221a7bc1bf7a/src/jit/compiler.cpp#L5066-L5345) via the call-stack shown below. Note that as before this uses a customer 'Arena Allocator' that is implemented in [/src/jit/alloc.cpp](https://github.com/dotnet/coreclr/blob/master/src/jit/alloc.cpp)

```
+ clrjit!ClrAllocInProcessHeap
 + clrjit!ArenaAllocator::allocateHostMemory
  + clrjit!ArenaAllocator::allocateNewPage
   + clrjit!ArenaAllocator::allocateMemory
    + clrjit!Compiler::compGetMem
     + clrjit!emitter::emitGetMem
      + clrjit!emitter::emitAllocInstr
       + clrjit!emitter::emitNewInstrTiny
        + clrjit!emitter::emitIns_R_R
         + clrjit!emitter::emitInsBinary
          + clrjit!CodeGen::genCodeForStoreLclVar
           + clrjit!CodeGen::genCodeForTreeNode
            + clrjit!CodeGen::genCodeForBBlist
             + clrjit!CodeGen::genGenerateCode
              + clrjit!Compiler::compCompile
```

----

## Real-world example

Finally, to prove that this investigation matches with more real-world scenarios, we can see similar memory usage breakdowns in this GitHub issue: [[Question] Reduce memory consumption of CoreCLR](https://github.com/dotnet/coreclr/issues/10380#issuecomment-288365180)

> Yes, we have profiled several Xamarin GUI applications on Tizen Mobile.
>
> Typical profile of CoreCLR's memory on the GUI applications is the following:
>
> 1. Mapped assembly images - 4.2 megabytes (50%)
> 1. JIT-compiler's memory - 1.7 megabytes (20%)
> 1. Execution engine - about 1 megabyte (11%)
> 1. Code heap - about 1 megabyte (11%)
> 1. Type information - about 0.5 megabyte (6%)
> 1. Objects heap - about 0.2 megabyte (2%)

----

Discuss this post on [HackerNews](https://news.ycombinator.com/item?id=14740169)

----

## Further Reading

See the links below for additional information on 'Loader Heaps'

- [Drill Into .NET Framework Internals to See How the CLR Creates Runtime Objects](https://web.archive.org/web/20080919091745/http://msdn.microsoft.com:80/en-us/magazine/cc163791.aspx#S5) (wayback machine version)
- [C# Different Types Of Heap Memory](https://vivekcek.wordpress.com/2016/07/10/c-different-types-of-heap-memory/)
- [Need clarification : Loader Heap , High Frequency heap and method tables](https://social.msdn.microsoft.com/Forums/vstudio/en-US/24eac008-e6a2-4205-b551-68acb5bfb9f5/need-clarification-loader-heap-high-frequency-heap-and-method-tables?forum=clr)
- [MANAGED DEBUGGING with WINDBG. Managed Heap. Part 5](https://blogs.msdn.microsoft.com/alejacma/2009/08/24/managed-debugging-with-windbg-managed-heap-part-5/)
- [.NET process memory usage = 5x CLR Heap Memory?](https://stackoverflow.com/questions/10121943/net-process-memory-usage-5x-clr-heap-memory)
- [what is the difference between object and loader heap in .net 4.0](https://stackoverflow.com/questions/4403506/what-is-the-difference-between-object-and-loader-heap-in-net-4-0/4517582#4517582)
- [2,000 Things You Should Know About C# - #200 – Static Data and Constants Are Stored on the Heap](https://csharp.2000things.com/2011/01/03/200-static-data-and-constants-are-stored-on-the-heap/)
- [High Frequency Heap - Can anyone explain me the CLR's "HighFrequencyHeap"?](https://stackoverflow.com/questions/4405627/high-frequency-heap)
- [To help clarify the discussion on the heaps here, there are about 8 different heaps that the CLR uses](https://stackoverflow.com/questions/8479529/heap-memory-management-net/12062828#12062828)
- [Issues about '[Memory Consumption]'](https://github.com/dotnet/coreclr/search?utf8=%E2%9C%93&q=%22%5Bmemory+consumption%5D%22&type=Issues)