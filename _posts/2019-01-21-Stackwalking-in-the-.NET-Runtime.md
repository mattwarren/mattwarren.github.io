---
layout: post
title: "\"Stack Walking\" in the .NET Runtime"
comments: true
codeproject: false
tags: [CLR, .NET, Internals]
---

What is 'stack walking', well as always the 'Book of the Runtime' (BotR) helps us, from the [relevant page](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/stackwalking.md):

> The CLR makes heavy use of a technique known as stack walking (or stack crawling). This involves **iterating the sequence of call frames for a particular thread**, from the most recent (the thread's current function) back down to the base of the stack.
>
>**The runtime uses stack walks for a number of purposes**:
> 
> - The runtime walks the stacks of all threads **during garbage collection, looking for managed roots** (local variables holding object references in the frames of managed methods that need to be reported to the GC to keep the objects alive and possibly track their movement if the GC decides to compact the heap).
> - On some platforms the stack walker is used during the **processing of exceptions** (looking for handlers in the first pass and unwinding the stack in the second).
> - The **debugger uses the functionality** when generating managed stack traces.
> - Various miscellaneous methods, usually those close to some public managed API, perform a stack walk **to pick up information about their caller** (such as the method, class or assembly of that caller).

**The rest of this post will explore what 'Stack Walking' is, how it works and why so many parts of the runtime need to be involved.**

----

**Table of Contents**

- [Where does the CLR use 'Stack Walking'?](#where-does-the-clr-use-stack-walking)
  - [Common Scenarios](#common-scenarios)
  - [Debugging/Diagnostics](#debuggingdiagnostics)
  - [Obscure Scenarios](#obscure-scenarios)
  - [Stack Crawl Marks](#stack-crawl-marks)
  - [Exception Handling](#exception-handling)
- [The 'Stack Walking' API](#the-stack-walking-api)
  - [How to use it](#how-to-use-it)
  - [How it works](#how-it-works)
  - [See it 'in Action'](#see-it-in-action)
- [Unwinding 'Native' Code](#unwinding-native-code)
  - [Frames](#frames)
  - ['Helper Method' Frames](#helper-method-frames)
  - [Native Unwind Information](#native-unwind-information)
  - [Differences between Windows and Unix](#differences-between-windows-and-unix)
- [Unwinding 'JITted' Code](#unwinding-jitted-code)
  - [Help from the 'JIT Compiler'](#help-from-the-jit-compiler)
- [Further Reading](#further-reading)
  - [Stack Unwinding (general)](#stack-unwinding-general)
  - [Stack Unwinding (other runtimes)](#stack-unwinding-other-runtimes)
  
----

## Where does the CLR use 'Stack Walking'?

Before we dig into the 'internals', let's take a look at where the runtime utilises 'stack walking', below is the full list (as of .NET Core CLR 'Release 2.2'). All these examples end up calling into the `Thread::StackWalkFrames(..)` method [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/stackwalk.cpp#L978-L1042) and provide a `callback` that is triggered whenever the API encounters a new section of the stack (see [How to use it](#how-to-use-it) below for more info).

### Common Scenarios

- **Garbage Collection (GC)**
  - `ScanStackRoots(..)` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/gcenv.ee.cpp#L71-L151) -> [callback](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/gcenv.ee.common.cpp#L184-L293)
- **Exception Handling** (unwinding)
  - `x86` - `UnwindFrames(..)` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/excep.cpp#L2199-L2232) -> [callback](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/i386/excepx86.cpp#L2718-L3119)
  - `x64` - `ResetThreadAbortState(..)` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/excep.cpp#L12770-L12868) -> [callback](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/excep.cpp#L12728-L12767)
- **Exception Handling** (resumption):
  - `ExceptionTracker::FindNonvolatileRegisterPointers(..)` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/exceptionhandling.cpp#L357-L436) -> [callback](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/exceptionhandling.cpp#L249-L354)
  - `ExceptionTracker::RareFindParentStackFrame(..)` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/exceptionhandling.cpp#L6991-L7031) -> [callback](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/exceptionhandling.cpp#L6924-L6989)
- **Threads**:
  - `Thread::IsRunningIn(..)` (AppDomain) [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/threads.cpp#L8402-L8428) -> [callback](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/threads.cpp#L8368-L8396)
  - `Thread::DetectHandleILStubsForDebugger(..)` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/threads.cpp#L219-L282) -> [callback](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/threads.cpp#L205-L217)
- **Thread Suspension**:
  - `Thread::IsExecutingWithinCer()` ('Constrained Execution Region') [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/threadsuspend.cpp#L962-L1006) ([wrapper](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/threadsuspend.cpp#L831-L960) and [callback](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/threadsuspend.cpp#L672-L829))
  - `Thread::HandledJITCase(..)` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/threadsuspend.cpp#L6853-L6975) -> [callback](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/threadsuspend.cpp#L6130-L6312), [alternative callback](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/threadsuspend.cpp#L6498-L6544)

### Debugging/Diagnostics

- **Debugger**
  - `DebuggerWalkStack(..)` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/debug/ee/frameinfo.cpp#L2061-L2188) -> [callback](https://github.com/dotnet/coreclr/blob/release/2.2/src/debug/ee/frameinfo.cpp#L1367-L1874)
  - `DebuggerWalkStackProc()` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/debug/ee/frameinfo.cpp#L1367-L1874) (called from `DebuggerWalkStack(..)`) -> [callback](https://github.com/dotnet/coreclr/blob/release/2.2/src/debug/ee/frameinfo.cpp#L952-L1240)
- **Managed APIs** (e.g  `System.Diagnostics.StackTrace`)
  - Managed code calls via an `InternalCall` (C#) [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/mscorlib/src/System/Diagnostics/Stacktrace.cs#L317-L318) into `DebugStackTrace::GetStackFramesInternal(..)` (C++) [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/debugdebugger.cpp#L327-L800)
  - Before ending up in `DebugStackTrace::GetStackFramesHelper(..)` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/debugdebugger.cpp#L852-L956) -> [callback](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/debugdebugger.cpp#L976-L1060)
- **DAC (via by SOS)** - Scan for GC 'Roots'
  - `DacStackReferenceWalker::WalkStack<..>(..)` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/debug/daccess/dacimpl.h#L1973-L2022) -> [callback](https://github.com/dotnet/coreclr/blob/release/2.2/src/debug/daccess/daccess.cpp#L8466-L8638)
- **Profiling API**
  - `ProfToEEInterfaceImpl::ProfilerStackWalkFramesWrapper(..)` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/proftoeeinterfaceimpl.cpp#L7624-L7652) -> [callback](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/proftoeeinterfaceimpl.cpp#L7177-L7286)
- **Event Pipe** (Diagnostics)
  - `EventPipe::WalkManagedStackForThread(..)` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/eventpipe.cpp#L971-L994) -> [callback](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/eventpipe.cpp#L996-L1029)
- **CLR prints a Stack Trace** (to the console/log, DEBUG builds only)
  - `PrintStackTrace()` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/debughelp.cpp#L1015-L1109) (and other functions) -> [callback](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/debughelp.cpp#L881-L1013)

### Obscure Scenarios

- **Reflection**
  - `RuntimeMethodHandle::GetCurrentMethod(..)` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/reflectioninvocation.cpp#L1487-L1511) ([callback](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/reflectioninvocation.cpp#L1449-L1485))
- **Application (App) Domains** (See 'Stack Crawl Marks' below)
  - `SystemDomain::GetCallersMethod(..)`  [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/appdomain.cpp#L3389-L3417) (also `GetCallersType(..)` and `GetCallersModule(..)`) ([callback](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/appdomain.cpp#L3520-L3664))
  - `SystemDomain::GetCallersModule(..)` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/appdomain.cpp#L3494-L3518) ([callback](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/appdomain.cpp#L3666-L3686))
- **'Code Pitching'**
  - `CheckStacksAndPitch()` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/codepitchingmanager.cpp#L446-L501) ([wrapper](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/codepitchingmanager.cpp#L340-L347) and [callback](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/codepitchingmanager.cpp#L304-L338))
- **Extensible Class Factory** (`System.Runtime.InteropServices.ExtensibleClassFactory`)
  - `RegisterObjectCreationCallback(..)` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/extensibleclassfactory.cpp#L72-L130) ([callback](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/extensibleclassfactory.cpp#L23-L69))
- **Stack Sampler** (unused?)
  - `StackSampler::ThreadProc()` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/stacksampler.cpp#L264-L331) ([wrapper](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/stacksampler.cpp#L217-L224) and [callback](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/stacksampler.cpp#L226-L262))

### Stack Crawl Marks

One of the above scenarios deserves a closer look, but firstly why are 'stack crawl marks' used, from [coreclr/issues/#21629 (comment)](https://github.com/dotnet/coreclr/issues/21629#issuecomment-449225852):

> Unfortunately, there is a ton of legacy APIs that were added during netstandard2.0 push whose behavior depend on the caller. **The caller is basically passed in as an implicit argument to the API**. Most of these StackCrawlMarks are there to support these APIs...

So we can see that multiple functions within the CLR itself need to have knowledge of their **caller**. To understand this some more, let's look an example, the `GetType(string typeName)` [method](https://docs.microsoft.com/en-us/dotnet/api/system.type.gettype?view=netframework-4.7.2#System_Type_GetType_System_String_). Here's the flow from the externally-visible method all the way down to where the work is done, note how a `StackCrawlMark` instance is passed through:

- `Type::GetType(string typeName)` [implementation](https://github.com/dotnet/coreclr/blob/606c246/src/System.Private.CoreLib/src/System/Type.CoreCLR.cs#L38-L43) (Creates `StackCrawlMark.LookForMyCaller`)
- `RuntimeType::GetType(.., ref StackCrawlMark stackMark)` [implementation](https://github.com/dotnet/coreclr/blob/606c246/src/System.Private.CoreLib/src/System/RtType.cs#L1741-L1749)
- `RuntimeType::GetTypeByName(.., ref StackCrawlMark stackMark, ..)` [implementation](https://github.com/dotnet/coreclr/blob/606c246/src/System.Private.CoreLib/src/System/RuntimeHandles.cs#L431-L459)
- `extern void GetTypeByName(.., ref StackCrawlMark stackMark, ..)` [definition](https://github.com/dotnet/coreclr/blob/606c246/src/System.Private.CoreLib/src/System/RuntimeHandles.cs#L426-L429) (call into native code, i.e. `[DllImport(JitHelpers.QCall, ..)]`)
- `RuntimeTypeHandle::GetTypeByName(.., QCall::StackCrawlMarkHandle pStackMark, ..)` [implementation](https://github.com/dotnet/coreclr/blob/606c246/src/vm/runtimehandles.cpp#L1433-L1463)
- `TypeHandle TypeName::GetTypeManaged(.., StackCrawlMark* pStackMark, ..)` [implementation](https://github.com/dotnet/coreclr/blob/606c246/src/vm/typeparse.cpp#L1178-L1271)
- `TypeHandle TypeName::GetTypeWorker(.. , StackCrawlMark* pStackMark, ..)` [implementation](https://github.com/dotnet/coreclr/blob/606c246/src/vm/typeparse.cpp#L1405-L1662)
- `SystemDomain::GetCallersAssembly(StackCrawlMark *stackMark,..)` [implementation](https://github.com/dotnet/coreclr/blob/606c246/src/vm/appdomain.cpp#L3430-L3438)
- `SystemDomain::GetCallersModule(StackCrawlMark* stackMark, ..)` [implementation](https://github.com/dotnet/coreclr/blob/606c246/src/vm/appdomain.cpp#L3394-L3421)
- `SystemDomain::CallersMethodCallbackWithStackMark(..)` [callback implementation](https://github.com/dotnet/coreclr/blob/606c246/src/vm/appdomain.cpp#L3467-L3610)

In addition the JIT (via the VM) has to ensure that all relevant methods are available in the call-stack, i.e. they can't be removed:

- Prevent in-lining `CEEInfo::canInline(..)` [implementation](https://github.com/dotnet/coreclr/blob/606c246/src/vm/jitinterface.cpp#L7847-L7854)
- Prevent removal via a 'tail call' `CEEInfo::canTailCall(..)` [implementation](https://github.com/dotnet/coreclr/blob/606c246/src/vm/jitinterface.cpp#L8321-L8332)

However, the `StackCrawlMark` feature is currently being *cleaned* up, so it may look different in the future:

- [Remove NoInlining/StackCrawlMarks from Tasks](https://github.com/dotnet/coreclr/pull/9342)
- [Remove stack marks from GetSatelliteAssembly](https://github.com/dotnet/coreclr/pull/21812)
- [Delete unnecessary StackCrawlMarks in RtFieldInfo](https://github.com/dotnet/coreclr/pull/21054)
- [Avoid passing stack crawl mark unnecessarily deep in the call stack](https://github.com/dotnet/coreclr/pull/21783) (the example shown above!!)

### Exception Handling

The place that most .NET Developers will run into 'stack traces' is when dealing with exceptions. I originally intended to also describe 'exception handling' here, but then I opened up [/src/vm/exceptionhandling.cpp](https://github.com/dotnet/coreclr/blob/master/src/vm/exceptionhandling.cpp) and saw that it contained **over 7,000** lines of code!! So I decided that it can wait for a future post 😁.

However, if you want to learn more about the 'internals' I really recommend Chris Brumme's post [The Exception Model](https://blogs.msdn.microsoft.com/cbrumme/2003/10/01/the-exception-model/) (2003) which is the definitive guide on the topic (also see his [Channel9 Videos](https://channel9.msdn.com/Search?term=Christopher%20Brumme&lang-en=true)) and as always, the 'BotR' chapter ['What Every (*Runtime*) Dev needs to Know About Exceptions in the Runtime'](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/exceptions.md) is well worth a read.

Also, I recommend talking a look at the slides from the ['Internals of Exceptions' talk'](https://blog.adamfurmanek.pl/wp-content/uploads/2018/06/Internals_of_exceptions.pdf) and the related post [.NET Inside Out Part 2 — Handling and rethrowing exceptions in C#](https://blog.adamfurmanek.pl/blog/2016/10/01/handling-and-rethrowing-exceptions-in-c/) both by [Adam Furmanek](https://twitter.com/furmanekadam).

----

## The 'Stack Walking' API

Now that we've seen *where* it's used, let's look at the 'stack walking' API itself. Firstly, *how* is it used?

### How to use it

It's worth pointing out that the only way you can access it from C#/F#/VB.NET code is via the `StackTrace` [class](https://docs.microsoft.com/en-us/dotnet/api/system.diagnostics.stacktrace?view=netframework-4.7.2), only the runtime itself can call into `Thread::StackWalkFrames(..)` directly. The simplest usage in the runtime is `EventPipe::WalkManagedStackForThread(..)` (see [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/eventpipe.cpp#L971-L994)), which is shown below. As you can see it's as simple as specifying the relevant flags, in this case `ALLOW_ASYNC_STACK_WALK | FUNCTIONSONLY | HANDLESKIPPEDFRAMES | ALLOW_INVALID_OBJECTS` and then providing the callback, which in the EventPipe class is the `StackWalkCallback` method ([here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/eventpipe.cpp#L996-L102))

``` cpp
bool EventPipe::WalkManagedStackForThread(Thread *pThread, StackContents &stackContents)
{
    CONTRACTL
    {
        NOTHROW;
        GC_NOTRIGGER;
        MODE_ANY;
        PRECONDITION(pThread != NULL);
    }
    CONTRACTL_END;

    // Calling into StackWalkFrames in preemptive mode violates the host contract,
    // but this contract is not used on CoreCLR.
    CONTRACT_VIOLATION( HostViolation );

    stackContents.Reset();

    StackWalkAction swaRet = pThread->StackWalkFrames(
        (PSTACKWALKFRAMESCALLBACK) &StackWalkCallback,
        &stackContents,
        ALLOW_ASYNC_STACK_WALK | FUNCTIONSONLY | HANDLESKIPPEDFRAMES | ALLOW_INVALID_OBJECTS);

    return ((swaRet == SWA_DONE) || (swaRet == SWA_CONTINUE));
}
```

The `StackWalkFrame(..)` function then does the *heavy-lifting* of actually walking the stack, before triggering the callback shown below. In this case it just records the 'Instruction Pointer' (IP/CP) and the 'managed function', which is an instance of the `MethodDesc` obtained via the `pCf->GetFunction()` call:

``` cpp
StackWalkAction EventPipe::StackWalkCallback(CrawlFrame *pCf, StackContents *pData)
{
    CONTRACTL
    {
        NOTHROW;
        GC_NOTRIGGER;
        MODE_ANY;
        PRECONDITION(pCf != NULL);
        PRECONDITION(pData != NULL);
    }
    CONTRACTL_END;

    // Get the IP.
    UINT_PTR controlPC = (UINT_PTR)pCf->GetRegisterSet()->ControlPC;
    if (controlPC == 0)
    {
        if (pData->GetLength() == 0)
        {
            // This happens for pinvoke stubs on the top of the stack.
            return SWA_CONTINUE;
        }
    }

    _ASSERTE(controlPC != 0);

    // Add the IP to the captured stack.
    pData->Append(controlPC, pCf->GetFunction());

    // Continue the stack walk.
    return SWA_CONTINUE;
}
```

### How it works

Now onto the most interesting part, how to the runtime actually walks the stack. Well, first let's understand what the stack looks like, from the ['BotR' page](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/stackwalking.md):

![Stack Description from BotR]({{ base }}/images/2019/01/Stack Description from BotR.png)

The main thing to note is that a .NET 'stack' can contain 3 types of methods:

1. **Managed** - this represents code that started off as C#/F#/VB.NET, was turned into IL and then finally compiled to native code by the 'JIT Compiler'.
2. **Unmanaged** - completely *native* code that exists outside of the runtime, i.e. a OS function the runtime calls into or a user call via `P/Invoke`. The runtime *only* cares about transitions *into* or *out of* regular unmanaged code, is doesn't care about the stack frame within it.
3. **Runtime Managed** - still *native* code, but this is slightly different because the runtime case more about this code. For example there are quite a few parts of the Base-Class libraries that make use of `InternalCall` methods, for more on this see the ['Helper Method' Frames](#helper-method-frames) section later on.

So the 'stack walk' has to deal with these different scenarios as it proceeds. Now let's look at the 'code flow' starting with the entry-point method `StackWalkFrames(..)`:

- `Thread::StackWalkFrames(..)` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/stackwalk.cpp#L978-L1042)
  - the entry-point function, the type of 'stack walk' can be controlled via [these flags](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/threads.h#L3302-L3361)
- `Thread::StackWalkFramesEx(..)` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/stackwalk.cpp#L899-L976)
  - worker-function that sets up the `StackFrameIterator`, via a call to `StackFrameIterator::Init(..)` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/stackwalk.cpp#L1150-L1274)
- `StackFrameIterator::Next()` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/stackwalk.cpp#L1586-L1621), then hands off to the primary *worker* method `StackFrameIterator::NextRaw()` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/stackwalk.cpp#L2291-L2761) that does 5 things:
  1. `CheckForSkippedFrames(..)` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/stackwalk.cpp#L3009-L3119), deals with frames that may have been allocated inside a managed stack frame (e.g. an inlined p/invoke call).
  2. `UnwindStackFrame(..)` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/eetwain.cpp#L4162-L4214), in-turn calls:
    - **`x64`** - `Thread::VirtualUnwindCallFrame(..)` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/stackwalk.cpp#L553-L671), then calls `VirtualUnwindNonLeafCallFrame(..)` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/stackwalk.cpp#L711-L757) or `VirtualUnwindLeafCallFrame(..)` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/stackwalk.cpp#L676-L708). All of of these functions make use of the [Windows API function](https://docs.microsoft.com/en-us/windows/desktop/api/winnt/nf-winnt-rtllookupfunctionentry) `RtlLookupFunctionEntry(..)` to do the actual unwinding.
    - **`x86`** - `::UnwindStackFrame(..)` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/eetwain.cpp#L4012-L4107), in turn calls `UnwindEpilog(..)` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/eetwain.cpp#L3528-L3557) and `UnwindEspFrame(..)` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/eetwain.cpp#L3663-L3721). Unlike `x64`, under `x86` all the 'stack-unwinding' is done manually, within the CLR code.
  3. `PostProcessingForManagedFrames(..)` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/stackwalk.cpp#L3193-L3229), determines if the stack-walk is actually within a **managed method** rather than a **native frame**.
  4. `ProcessIp(..)` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/stackwalk.cpp#L2786-L2800) has the job of looking up the current **managed method** (if any) based on the current **instruction pointer** (IP). It does this by calling into  `EECodeInfo::Init(..)` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/jitinterface.cpp#L13948-L13976) and then ends up in one of:
    - `EEJitManager::JitCodeToMethodInfo(..)` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/codeman.cpp#L3631-L3676), that uses a very cool looking data structure refereed to as a ['nibble map'](https://github.com/dotnet/coreclr/blob/release/2.2/src/inc/nibblemapmacros.h#L12-L26)
    - `NativeImageJitManager::JitCodeToMethodInfo(..)` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/codeman.cpp#L5428-L5616)
    - `ReadyToRunJitManager::JitCodeToMethodInfo(..)` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/codeman.cpp#L6875-L6953)
  5. `ProcessCurrentFrame(..)` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/stackwalk.cpp#L2802-L3007), does some final house-keeping and tidy-up.
- `CrawlFrame::GotoNextFrame()` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/stackwalk.cpp#L369-L390)
  - in-turn calls `pFrame->Next()` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/frames.h#L836-L840) to walk through the 'linked list' of frames which drive the 'stack walk' (more on these 'frames' later)
- `StackFrameIterator::Filter()` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/stackwalk.cpp#L1623-L2289)
  - essentially a [huge `switch` statement](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/stackwalk.cpp#L1677-L2271) that handles all the different [Frame States](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/stackwalk.h#L602-L613) and decides whether or not the 'stack walk' should continue.

When it gets a valid frame it triggers the callback in `Thread::MakeStackwalkerCallback(..)` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/stackwalk.cpp#L859-L891) and passes in a pointer to the current `CrawlFrame` class [defined here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/stackwalk.h#L68-L496), this exposes methods such as `IsFrameless()`, `GetFunction()` and `GetThisPointer()`. The `CrawlFrame` actually represents 2 scenarios, based on the current IP:

- **Native** code, represented by a `Frame` class [defined here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/frames.h#L378-L284), which we'll discuss more in a moment.
- **Managed** code, well technically 'managed code' that was JITted to 'native code', so more accurately a **managed stack frame**. In this situation the `MethodDesc` class [defined here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/method.hpp#L187-L1879) is provided, you can read more about this key CLR data-structure in [the corresponding BotR chapter](https://github.com/dotnet/coreclr/blob/release/2.2/Documentation/botr/method-descriptor.md).

### See it 'in Action'

Fortunately we're able to turn on some nice diagnostics in a debug build of the CLR (`COMPLUS_LogEnable`, `COMPLUS_LogToFile` & `COMPLUS_LogFacility`). With that in place, given C# code like this:

``` cs
internal class Program {
    private static void Main() {
        MethodA();
    }

    [MethodImpl(MethodImplOptions.NoInlining)]
    private void MethodA() {
        MethodB();
    }
    
    [MethodImpl(MethodImplOptions.NoInlining)]
    private void MethodB() {
        MethodC();
    }
    
    [MethodImpl(MethodImplOptions.NoInlining)]
    private void MethodC() {
        var stackTrace = new StackTrace(fNeedFileInfo: true);
        Console.WriteLine(stackTrace.ToString());
    }
}
```

We get the output shown below, in which you can see the 'stack walking' process. It starts in `InitializeSourceInfo` and `CaptureStackTrace` which are methods internal to the `StackTrace` class (see [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/mscorlib/src/System/Diagnostics/Stacktrace.cs#L351-L407)), before moving up the stack `MethodC` -> `MethodB` -> `MethodA` and then finally stopping in the `Main` function. Along the way its does a 'FILTER' and 'CONSIDER' step before actually unwinding ('finished unwind for ...'):

```
TID 4740: STACKWALK    starting with partial context
TID 4740: STACKWALK: [000] FILTER  : EXPLICIT : PC= 00000000`00000000  SP= 00000000`00000000  Frame= 00000002`9977cc48  vtbl= 00007ffd`74a105b0 
TID 4740: STACKWALK: [001] CONSIDER: EXPLICIT : PC= 00000000`00000000  SP= 00000000`00000000  Frame= 00000002`9977cc48  vtbl= 00007ffd`74a105b0 
TID 4740: STACKWALK: [001] FILTER  : EXPLICIT : PC= 00000000`00000000  SP= 00000000`00000000  Frame= 00000002`9977cc48  vtbl= 00007ffd`74a105b0 
TID 4740: STACKWALK: [002] CONSIDER: EXPLICIT : PC= 00000000`00000000  SP= 00000000`00000000  Frame= 00000002`9977cdd8  vtbl= 00007ffd`74995220 
TID 4740: STACKWALK    LazyMachState::unwindLazyState(ip:00007FFD7439C45C,sp:000000029977C338)
TID 4740: STACKWALK: [002] CALLBACK: EXPLICIT : PC= 00000000`00000000  SP= 00000000`00000000  Frame= 00000002`9977cdd8  vtbl= 00007ffd`74995220 
TID 4740: STACKWALK    HelperMethodFrame::UpdateRegDisplay cached ip:00007FFD72FE9258, sp:000000029977D300
TID 4740: STACKWALK: [003] CONSIDER: FRAMELESS: PC= 00007ffd`72fe9258  SP= 00000002`9977d300  method=InitializeSourceInfo 
TID 4740: STACKWALK: [003] CALLBACK: FRAMELESS: PC= 00007ffd`72fe9258  SP= 00000002`9977d300  method=InitializeSourceInfo 
TID 4740: STACKWALK: [004] about to unwind for 'InitializeSourceInfo', SP: 00000002`9977d300 , IP: 00007ffd`72fe9258 
TID 4740: STACKWALK: [004] finished unwind for 'InitializeSourceInfo', SP: 00000002`9977d480 , IP: 00007ffd`72eeb671 
TID 4740: STACKWALK: [004] CONSIDER: FRAMELESS: PC= 00007ffd`72eeb671  SP= 00000002`9977d480  method=CaptureStackTrace 
TID 4740: STACKWALK: [004] CALLBACK: FRAMELESS: PC= 00007ffd`72eeb671  SP= 00000002`9977d480  method=CaptureStackTrace 
TID 4740: STACKWALK: [005] about to unwind for 'CaptureStackTrace', SP: 00000002`9977d480 , IP: 00007ffd`72eeb671 
TID 4740: STACKWALK: [005] finished unwind for 'CaptureStackTrace', SP: 00000002`9977d5b0 , IP: 00007ffd`72eeadd0 
TID 4740: STACKWALK: [005] CONSIDER: FRAMELESS: PC= 00007ffd`72eeadd0  SP= 00000002`9977d5b0  method=.ctor 
TID 4740: STACKWALK: [005] CALLBACK: FRAMELESS: PC= 00007ffd`72eeadd0  SP= 00000002`9977d5b0  method=.ctor 
TID 4740: STACKWALK: [006] about to unwind for '.ctor', SP: 00000002`9977d5b0 , IP: 00007ffd`72eeadd0 
TID 4740: STACKWALK: [006] finished unwind for '.ctor', SP: 00000002`9977d5f0 , IP: 00007ffd`14c620d3 
TID 4740: STACKWALK: [006] CONSIDER: FRAMELESS: PC= 00007ffd`14c620d3  SP= 00000002`9977d5f0  method=MethodC 
TID 4740: STACKWALK: [006] CALLBACK: FRAMELESS: PC= 00007ffd`14c620d3  SP= 00000002`9977d5f0  method=MethodC 
TID 4740: STACKWALK: [007] about to unwind for 'MethodC', SP: 00000002`9977d5f0 , IP: 00007ffd`14c620d3 
TID 4740: STACKWALK: [007] finished unwind for 'MethodC', SP: 00000002`9977d630 , IP: 00007ffd`14c62066 
TID 4740: STACKWALK: [007] CONSIDER: FRAMELESS: PC= 00007ffd`14c62066  SP= 00000002`9977d630  method=MethodB 
TID 4740: STACKWALK: [007] CALLBACK: FRAMELESS: PC= 00007ffd`14c62066  SP= 00000002`9977d630  method=MethodB 
TID 4740: STACKWALK: [008] about to unwind for 'MethodB', SP: 00000002`9977d630 , IP: 00007ffd`14c62066 
TID 4740: STACKWALK: [008] finished unwind for 'MethodB', SP: 00000002`9977d660 , IP: 00007ffd`14c62016 
TID 4740: STACKWALK: [008] CONSIDER: FRAMELESS: PC= 00007ffd`14c62016  SP= 00000002`9977d660  method=MethodA 
TID 4740: STACKWALK: [008] CALLBACK: FRAMELESS: PC= 00007ffd`14c62016  SP= 00000002`9977d660  method=MethodA 
TID 4740: STACKWALK: [009] about to unwind for 'MethodA', SP: 00000002`9977d660 , IP: 00007ffd`14c62016 
TID 4740: STACKWALK: [009] finished unwind for 'MethodA', SP: 00000002`9977d690 , IP: 00007ffd`14c61f65 
TID 4740: STACKWALK: [009] CONSIDER: FRAMELESS: PC= 00007ffd`14c61f65  SP= 00000002`9977d690  method=Main 
TID 4740: STACKWALK: [009] CALLBACK: FRAMELESS: PC= 00007ffd`14c61f65  SP= 00000002`9977d690  method=Main 
TID 4740: STACKWALK: [00a] about to unwind for 'Main', SP: 00000002`9977d690 , IP: 00007ffd`14c61f65 
TID 4740: STACKWALK: [00a] finished unwind for 'Main', SP: 00000002`9977d6d0 , IP: 00007ffd`742f9073 
TID 4740: STACKWALK: [00a] FILTER  : NATIVE   : PC= 00007ffd`742f9073  SP= 00000002`9977d6d0 
TID 4740: STACKWALK: [00b] CONSIDER: EXPLICIT : PC= 00007ffd`742f9073  SP= 00000002`9977d6d0  Frame= 00000002`9977de58  vtbl= 00007ffd`74a105b0 
TID 4740: STACKWALK: [00b] FILTER  : EXPLICIT : PC= 00007ffd`742f9073  SP= 00000002`9977d6d0  Frame= 00000002`9977de58  vtbl= 00007ffd`74a105b0 
TID 4740: STACKWALK: [00c] CONSIDER: EXPLICIT : PC= 00007ffd`742f9073  SP= 00000002`9977d6d0  Frame= 00000002`9977e7e0  vtbl= 00007ffd`74a105b0 
TID 4740: STACKWALK: [00c] FILTER  : EXPLICIT : PC= 00007ffd`742f9073  SP= 00000002`9977d6d0  Frame= 00000002`9977e7e0  vtbl= 00007ffd`74a105b0 
TID 4740: STACKWALK: SWA_DONE: reached the end of the stack
```

To find out more, you can search for these diagnostic message in [\vm\stackwalk.cpp](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/stackwalk.cpp), e.g. in `Thread::DebugLogStackWalkInfo(..)` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/stackwalk.cpp#L802-L856)

----

## Unwinding 'Native' Code

As explained in [this excellent article](https://science.raphael.poss.name/go-calling-convention-x86-64.html#aside-exceptions-in-c-c):

> There are fundamentally two main ways to implement exception propagation in an ABI (Application Binary Interface):
> 
> - "dynamic registration", **with frame pointers in each activation record, organized as a linked list**. This makes stack unwinding fast at the expense of having to set up the frame pointer in each function that calls other functions. This is also simpler to implement.
> 
> - "table-driven", **where the compiler and assembler create data structures alongside the program code to indicate which addresses of code correspond to which sizes of activation records**. This is called "Call Frame Information" (CFI) data in e.g. the GNU tool chain. When an exception is generated, the data in this table is loaded to determine how to unwind. This makes exception propagation slower but the general case faster.

It turns out that .NET uses the 'table-driven' approach, for the reason explained in the ['BotR'](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/stackwalking.md#the-stack-model):

> The exact definition of a frame varies from platform to platform and **on many platforms there isn't a hard definition of a frame format that all functions adhere to** (x86 is an example of this). Instead the compiler is often free to optimize the exact format of frames. On such systems it is not possible to guarantee that a stackwalk will return 100% correct or complete results (for debugging purposes, debug symbols such as pdbs are used to fill in the gaps so that debuggers can generate more accurate stack traces).
>
> This is not a problem for the CLR, however, since we do not require a fully generalized stack walk. **Instead we are only interested in those frames that are managed (i.e. represent a managed method) or, to some extent, frames coming from unmanaged code used to implement part of the runtime itself**. In particular there is no guarantee about fidelity of 3rd party unmanaged frames other than to note where such frames transition into or out of the runtime itself (i.e. one of the frame types we do care about).

### Frames

To enable 'unwinding' of native code or more strictly the transitions 'into' and 'out of' native code, the CLR uses a mechanism of `Frames`, which are defined in the source code [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/frames.h#L7-L143). These frames are arranged into a hierachy and there is one type of `Frame` for each scenario, for more info on these individual `Frames` take a look at the excellent source-code comments [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/frames.h#L145-L195).

- **Frame** (abstract/base class)
  - **GCFrame**
  - **FaultingExceptionFrame**
  - **HijackFrame**
  - **ResumableFrame**
    - RedirectedThreadFrame
  - **InlinedCallFrame**
  - **HelperMethodFrame**
    - HelperMethodFrame_1OBJ
    - HelperMethodFrame_2OBJ
    - HelperMethodFrame_3OBJ
    - HelperMethodFrame_PROTECTOBJ
  - **TransitionFrame**
    - StubHelperFrame
    - SecureDelegateFrame
      - MulticastFrame
    - FramedMethodFrame
      - ComPlusMethodFrame
      - PInvokeCalliFrame
      - PrestubMethodFrame
      - StubDispatchFrame
      - ExternalMethodFrame
      - TPMethodFrame
  - **UnmanagedToManagedFrame**
    - ComMethodFrame
      - ComPrestubMethodFrame
    - UMThkCallFrame
  - **ContextTransitionFrame**
  - **TailCallFrame**
  - **ProtectByRefsFrame**
  - **ProtectValueClassFrame**
  - **DebuggerClassInitMarkFrame**
  - **DebuggerSecurityCodeMarkFrame**
  - **DebuggerExitFrame**
  - **DebuggerU2MCatchHandlerFrame**
  - **FuncEvalFrame**
  - **ExceptionFilterFrame**

### 'Helper Method' Frames

But to make sense of this, let's look at one type of `Frame`, known as `HelperMethodFrame` (above). This is used when .NET code in the runtime calls into C++ code to do the heavy-lifting, often for performance reasons. One example is if you call `Environment.GetCommandLineArgs()` you end up [in this code](https://github.com/dotnet/coreclr/blob/master/src/System.Private.CoreLib/src/System/Environment.cs#L151-L180) (C#), but note that it ends up calling an `extern` method marked with `InternalCall`:

``` cs
[MethodImplAttribute(MethodImplOptions.InternalCall)]
private static extern string[] GetCommandLineArgsNative();
```

This means that the rest of the method is implemented in the runtime in C++, you can see how the method call is [wired up](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/ecalllist.h#L153), before ending up `SystemNative::GetCommandLineArgs` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/classlibnative/bcltype/system.cpp#L178-L221), which is shown below:

``` cpp
FCIMPL0(Object*, SystemNative::GetCommandLineArgs)
{
    FCALL_CONTRACT;

    PTRARRAYREF strArray = NULL;

    HELPER_METHOD_FRAME_BEGIN_RET_1(strArray); // <-- 'Helper method Frame' started here

    // Error handling and setup code removed for clarity

    strArray = (PTRARRAYREF) AllocateObjectArray(numArgs, g_pStringClass);
    // Copy each argument into new Strings.
    for(unsigned int i=0; i<numArgs; i++)
    {
        STRINGREF str = StringObject::NewString(argv[i]);
        STRINGREF * destData = ((STRINGREF*)(strArray->GetDataPtr())) + i;
        SetObjectReference((OBJECTREF*)destData, (OBJECTREF)str, strArray->GetAppDomain());
    }
    delete [] argv;

    HELPER_METHOD_FRAME_END(); // <-- 'Helper method Frame' ended/closed here

    return OBJECTREFToObject(strArray);
}
FCIMPLEND
```

**Note**: this code makes heavy use of macros, see [this gist](https://gist.github.com/mattwarren/36e52b3f80a411ca5a6b7211c9f1a3a9) for the original code and then the expanded versions (Release and Debug). In addition, if you want more information on these mysterious `FCalls` as they are known (and the related `QCalls`) see [Mscorlib and Calling Into the Runtime](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/mscorlib.md) in the 'BotR'.

But the main thing to look at in the code sample is the `HELPER_METHOD_FRAME_BEGIN_RET_1()` macro, with ultimately installs an instance of the [HelperMethodFrame_1OBJ class](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/frames.h#L1435-L1492). The macro expands into code like this:

``` cpp
FrameWithCookie < HelperMethodFrame_1OBJ > __helperframe(__me, Frame::FRAME_ATTR_NONE, (OBJECTREF * ) & strArray); 
{
  __helperframe.Push(); // <-- 'Helper method Frame' pushed

  Thread * CURRENT_THREAD = __helperframe.GetThread();
  const bool CURRENT_THREAD_AVAILABLE = true;
  (void) CURRENT_THREAD_AVAILABLE;; {
	Exception * __pUnCException = 0;
	Frame * __pUnCEntryFrame = ( & __helperframe);
	bool __fExceptionCatched = false;;
	try {;

	  // Original code from SystemNative::GetCommandLineArgs goes in here

	} catch (Exception * __pException) {;
	  do {} while (0);
	  __pUnCException = __pException;
	  UnwindAndContinueRethrowHelperInsideCatch(__pUnCEntryFrame, __pUnCException);
	  __fExceptionCatched = true;;
	}
	if (__fExceptionCatched) {;
	  UnwindAndContinueRethrowHelperAfterCatch(__pUnCEntryFrame, __pUnCException);
	}
  };
  
  __helperframe.Pop(); // <-- 'Helper method Frame' popped
};
```

**Note**: the `Push()` and `Pop()` against `_helperMethodFrame` that make it available for 'stack walking'. You can also see the `try`/`catch` block that the CLR puts in place to ensure any exceptions from *native* code are turned into *managed* exceptions that C#/F#/VB.NET code can handle. If you're interested the full macro-expansion is available [in this gist](https://gist.github.com/mattwarren/36e52b3f80a411ca5a6b7211c9f1a3a9#expanded-code---release---81-loc).

So in summary, these `Frames` are *pushed onto* a 'linked list' when calling into native code and *popped off* the list when returning from native code. This means that are any moment the 'linked list' contains all the current or active `Frames`.

### Native Unwind Information

In addition to creating 'Frames', the CLR also ensures that the C++ compiler emits 'unwind info' for native code. We can see this if we use the [DUMPBIN tool](https://docs.microsoft.com/en-us/cpp/build/reference/dumpbin-reference?view=vs-2017) and run `dumpbin /UNWINDINFO coreclr.dll`. We get the following output for `SystemNative::GetCommandLineArgs(..)` (that we looked at before):

```
  0002F064 003789B0 00378B7E 004ED1D8  ?GetCommandLineArgs@SystemNative@@SAPEAVObject@@XZ (public: static class Object * __cdecl SystemNative::GetCommandLineArgs(void))
    Unwind version: 1
    Unwind flags: EHANDLER UHANDLER
    Size of prologue: 0x3B
    Count of codes: 13
    Unwind codes:
      29: SAVE_NONVOL, register=r12 offset=0x1C8
      25: SAVE_NONVOL, register=rdi offset=0x1C0
      21: SAVE_NONVOL, register=rsi offset=0x1B8
      1D: SAVE_NONVOL, register=rbx offset=0x1B0
      10: ALLOC_LARGE, size=0x190
      09: PUSH_NONVOL, register=r15
      07: PUSH_NONVOL, register=r14
      05: PUSH_NONVOL, register=r13
    Handler: 00148F14 __GSHandlerCheck_EH
    EH Handler Data: 00415990
    GS Unwind flags: EHandler UHandler
    Cookie Offset: 00000180

  0002F070 00378B7E 00378BB4 004ED26C
    Unwind version: 1
    Unwind flags: EHANDLER UHANDLER
    Size of prologue: 0x0A
    Count of codes: 2
    Unwind codes:
      0A: ALLOC_SMALL, size=0x20
      06: PUSH_NONVOL, register=rbp
    Handler: 0014978C __CxxFrameHandler3
    EH Handler Data: 00415990
```

If you want to understand more of what's going on here I really recommend reading the excellent article [x64 Manual Stack Reconstruction and Stack Walking](https://blogs.msdn.microsoft.com/ntdebugging/2010/05/12/x64-manual-stack-reconstruction-and-stack-walking/). But in essence the 'unwind info' describes which registers are used within a method and how big stack is for that method. These pieces of information are enough to tell the runtime how to 'unwind' that particular method when walking the stack.

### Differences between Windows and Unix

However, to further complicate things, the 'native code unwinding' uses a different mechanism for 'Windows' v. 'Unix', as explained in [coreclr/issues/#177 (comment)](https://github.com/dotnet/coreclr/issues/177#issuecomment-73648128):

> 1. **Stack walker for managed code**. JIT will generate regular Windows style unwinding info. We will reuse Windows unwinder code that we currently have checked in for debugger components for unwinding calls in managed code on Linux/Mac. Unfortunately, this work requires changes in the runtime that currently cannot be tested in the CoreCLR repo so it is hard to do this in the public right now. But we are working on fixing that because, as I mentioned at the beginning, our goal is do most work in the public.
> 2. **Stack walker for native code**. Here, in addition to everything else, we need to allow GC to unwind native stack of any thread in the current process until it finds a managed frame. Currently we are considering using libunwind (http://www.nongnu.org/libunwind) for unwinding native call stacks. @janvorli did some prototyping/experiments and it seems to do what we need. If you have any experience with this library or have any comments/suggestions please let us know.

This also shows that there are 2 different 'unwind' mechanisms for 'managed' or 'native' code, we will discuss how the "*stack walker for managed code*" works in [Unwinding 'JITted' Code](#unwinding-jitted-code).

There is also some more information in [coreclr/issues/#177 (comment)](https://github.com/dotnet/coreclr/issues/177#issuecomment-73803242):

> My current work has two parts, as @sergiy-k has already mentioned. The **windows style unwinder that will be used for the jitted code** and **Unix unwinder for native code** that uses the libunwind's low level `unw_xxxx` functions like `unw_step` etc.

So, for 'native code' the runtime uses an OS specific mechanism, i.e. on Unix the [Open Source 'libunwind' library](https://github.com/libunwind/libunwind) is used. You can see the differences in the code below (from [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/amd64/gmsamd64.cpp#L54-L74)), under Windows `Thread::VirtualUnwindCallFrame(..)` ([implementation](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/stackwalk.cpp#L552-L671)) is called, but on Unix (i.e. `FEATURE_PAL`) `PAL_VirtualUnwind(..)` ([implementation](https://github.com/dotnet/coreclr/blob/release/2.2/src/pal/src/exception/seh-unwind.cpp#L249-L349)) is called instead:

``` cpp
#ifndef FEATURE_PAL
    pvControlPc = Thread::VirtualUnwindCallFrame(&ctx, &nonVolRegPtrs);
#else // !FEATURE_PAL
    ...
    BOOL success = PAL_VirtualUnwind(&ctx, &nonVolRegPtrs);
    ...
    pvControlPc = GetIP(&ctx);
#endif // !FEATURE_PAL
```

Before we more on, here are some links to the work that was done to support 'stack walking' when .NET Core CLR was [ported to Linux](https://blogs.msdn.microsoft.com/dotnet/2016/06/27/announcing-net-core-1-0/#the-net-core-journey):

- [[x86/Linux] Support Simple Exception Catch](https://github.com/dotnet/coreclr/issues/8887)
- [[ARM/Linux] coreclr fails due to lack of DWARF feature in libunwind #6698](https://github.com/dotnet/coreclr/issues/6698)
- [Modify the windows amd64 unwinder to work as jitted code unwinder on Uni... #259](https://github.com/dotnet/coreclr/pull/259)
- [Refactor libunwind to work on osx #284](https://github.com/dotnet/coreclr/pull/284)
- [Reimplement native exception handling for PAL #308](https://github.com/dotnet/coreclr/pull/308)
- [Move the windows unwinder code out of the debug folder.](https://github.com/dotnet/coreclr/commit/6c2c7994f1412e8aa504800c7164de875c350fc1)
- [.NET Core Dependencies](https://github.com/dotnet/core/blob/4c4642d548074b3fbfd425541a968aadd75fea99/release-notes/1.0/1.0.0.md#dependencies) (includes 'libunwind')
- [The sos "ClrStack" command now works](https://github.com/dotnet/coreclr/pull/437)

----

## Unwinding 'JITted' Code

Finally, we're going to look at what happens with 'managed code', i.e. code that started off as C#/F#/VB.NET, was turned into IL and then compiled into native code by the 'JIT Compiler'. This is the code that you generally want to see in your 'stack trace', because it's code you wrote yourself!

### Help from the 'JIT Compiler'

Simply, what happens is that when the code is 'JITted', the compiler also emits some extra information, stored via the `EECodeInfo` class, which is defined [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/jitinterface.cpp#L13922-L14300). Also see the ['Unwind Info' section](https://github.com/dotnet/coreclr/blob/release/2.2/src/jit/compiler.h#L7316-L7440) in the JIT Compiler <-> Runtime interface, note how it features seperate sections for `TARGET_ARM`, `TARGET_ARM64`, `TARGET_X86` and `TARGET_UNIX`.

In addition, in `CodeGen::genFnProlog()` [here](https://github.com/dotnet/coreclr/blob/release/2.2/src/jit/codegencommon.cpp#L8832-L9299) the JIT emits a function 'prologue' that contains several pieces of 'unwind' related data. This is also imlemented in `CEEJitInfo::allocUnwindInfo(..)` in [this piece of code](https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/jitinterface.cpp#L11275-L11300), which behaves differently for each CPU architecture:

``` cpp
#if defined(_TARGET_X86_)
    // Do NOTHING
#elif defined(_TARGET_AMD64_)
    pUnwindInfo->Flags = UNW_FLAG_EHANDLER | UNW_FLAG_UHANDLER;
    ULONG * pPersonalityRoutine = (ULONG*)ALIGN_UP(&(pUnwindInfo->UnwindCode[pUnwindInfo->CountOfUnwindCodes]), sizeof(ULONG));
    *pPersonalityRoutine = ExecutionManager::GetCLRPersonalityRoutineValue();
#elif defined(_TARGET_ARM64_)
    *(LONG *)pUnwindInfo |= (1 << 20); // X bit
    ULONG * pPersonalityRoutine = (ULONG*)((BYTE *)pUnwindInfo + ALIGN_UP(unwindSize, sizeof(ULONG)));
    *pPersonalityRoutine = ExecutionManager::GetCLRPersonalityRoutineValue();
#elif defined(_TARGET_ARM_)
    *(LONG *)pUnwindInfo |= (1 << 20); // X bit
    ULONG * pPersonalityRoutine = (ULONG*)((BYTE *)pUnwindInfo + ALIGN_UP(unwindSize, sizeof(ULONG)));
    *pPersonalityRoutine = (TADDR)ProcessCLRException - baseAddress;
#endif
```

Also, the JIT has several `Compiler::unwindXXX(..)` methods, that are all implemented in per-CPU source files:

- [/src/jit/unwind.cpp](https://github.com/dotnet/coreclr/blob/release/2.2/src/jit/unwind.cpp)
- [/src/jit/unwind**arm**.cpp](https://github.com/dotnet/coreclr/blob/release/2.2/src/jit/unwindarm.cpp)
- [/src/jit/unwind**x86**.cpp](https://github.com/dotnet/coreclr/blob/release/2.2/src/jit/unwindx86.cpp)
- [/src/jit/unwind**amd64**.cpp](https://github.com/dotnet/coreclr/blob/release/2.2/src/jit/unwindamd64.cpp)
- [src/jit/unwind**arm64**.cpp](https://github.com/dotnet/coreclr/blob/release/2.2/src/jit/unwindarm64.cpp)

Fortunately, we can [ask the JIT](https://github.com/dotnet/coreclr/blob/master/Documentation/building/viewing-jit-dumps.md#useful-complus-variables) to output the unwind info that it emits, however this *only works* with a Debug version of the CLR. Given a simple method like this:

``` cs
private void MethodA() {
    try {
        MethodB();
    } catch (Exception ex) {
        Console.WriteLine(ex.ToString());
    }
}
```

if we call `SET COMPlus_JitUnwindDump=MethodA`, we get the following output with 2 'Unwind Info' sections, one for the `try` and the other for the `catch` block:

```
Unwind Info:
  >> Start offset   : 0x000000 (not in unwind data)
  >>   End offset   : 0x00004e (not in unwind data)
  Version           : 1
  Flags             : 0x00
  SizeOfProlog      : 0x07
  CountOfUnwindCodes: 4
  FrameRegister     : none (0)
  FrameOffset       : N/A (no FrameRegister) (Value=0)
  UnwindCodes       :
    CodeOffset: 0x07 UnwindOp: UWOP_ALLOC_SMALL (2)     OpInfo: 11 * 8 + 8 = 96 = 0x60
    CodeOffset: 0x03 UnwindOp: UWOP_PUSH_NONVOL (0)     OpInfo: rsi (6)
    CodeOffset: 0x02 UnwindOp: UWOP_PUSH_NONVOL (0)     OpInfo: rdi (7)
    CodeOffset: 0x01 UnwindOp: UWOP_PUSH_NONVOL (0)     OpInfo: rbp (5)
Unwind Info:
  >> Start offset   : 0x00004e (not in unwind data)
  >>   End offset   : 0x0000e2 (not in unwind data)
  Version           : 1
  Flags             : 0x00
  SizeOfProlog      : 0x07
  CountOfUnwindCodes: 4
  FrameRegister     : none (0)
  FrameOffset       : N/A (no FrameRegister) (Value=0)
  UnwindCodes       :
    CodeOffset: 0x07 UnwindOp: UWOP_ALLOC_SMALL (2)     OpInfo: 5 * 8 + 8 = 48 = 0x30
    CodeOffset: 0x03 UnwindOp: UWOP_PUSH_NONVOL (0)     OpInfo: rsi (6)
    CodeOffset: 0x02 UnwindOp: UWOP_PUSH_NONVOL (0)     OpInfo: rdi (7)
    CodeOffset: 0x01 UnwindOp: UWOP_PUSH_NONVOL (0)     OpInfo: rbp (5)
```

This 'unwind info' is then looked up during a 'stack walk' as explained in the [How it works](#how-it-works) section above.

----

**So next time you encounter a 'stack trace' remember that a lot of work went into making it possible!!**

----

## Further Reading

'Stack Walking' or 'Stack Unwinding' is a very large topic, so if you want to know more, here are some links to get you started:

### Stack Unwinding (general)

- [Stack frame layout on x86-64](https://eli.thegreenplace.net/2011/09/06/stack-frame-layout-on-x86-64/) (also has a great list of links at the bottom)
- [Where the top of the stack is on x86](https://eli.thegreenplace.net/2011/02/04/where-the-top-of-the-stack-is-on-x86/)
- [Programmatic access to the call stack in C++](https://eli.thegreenplace.net/2015/programmatic-access-to-the-call-stack-in-c/)
- [How debuggers work: Part 3 - Debugging information](https://eli.thegreenplace.net/2011/02/07/how-debuggers-work-part-3-debugging-information)
- [Writing a Linux Debugger Part 8: Stack unwinding](https://blog.tartanllama.xyz/writing-a-linux-debugger-unwinding/)
- [Deep Wizardry: Stack Unwinding](http://blog.reverberate.org/2013/05/deep-wizardry-stack-unwinding.html)
- [Deep Wizardry: Stack Unwinding](https://www.reddit.com/r/programming/comments/1ebswy/deep_wizardry_stack_unwinding/) (/r/programmming)
- [On libunwind and dynamically generated code on x86-64](http://www.corsix.org/content/libunwind-dynamic-code-x86-64)
- [On libunwind and dynamically generated code on x86-64](https://news.ycombinator.com/item?id=11477039) (HackerNews)
- [x86 Disassembly/Functions and Stack Frames](https://en.wikibooks.org/wiki/X86_Disassembly/Functions_and_Stack_Frames)
- [What is the purpose of the EBP frame pointer register?](https://stackoverflow.com/questions/579262/what-is-the-purpose-of-the-ebp-frame-pointer-register)
- [Manual Stack Walking](http://blogs.microsoft.co.il/sasha/2011/07/20/manual-stack-walking/)
- [Walking the Stack Without Symbols and With FPO (Frame Pointer Omission)](http://blogs.microsoft.co.il/sasha/2011/08/22/walking-the-stack-without-symbols-and-with-fpo-frame-pointer-omission/)
- [how to write a debuggable programming language - stack unwinding](https://cshung.gitbooks.io/how-to-write-a-debuggable-programming-language/content/stack-unwinder.html)
- [How the .NET Runtime Walks the Stack](https://www.reddit.com/r/programming/comments/5v4ztx/how_the_net_runtime_walks_the_stack/) (/r/programming discussion of the 'BorR' page)
- [Caller Info Attributes vs. Stack Walking](https://blog.slaks.net/2011/10/caller-info-attributes-vs-stack-walking.html)
- [Stacking the Deck -- Finding Your Way Through the Stack](http://www.osronline.com/article.cfm?id=202)

### Stack Unwinding (other runtimes)

In addition, it's interesting to look at how other runtimes handles this process:

- **Mono**
  - [Porting the Engine - Unwind Info](https://www.mono-project.com/docs/advanced/runtime/docs/mini-porting/#unwind-info)
  - [LLVM Backend - Unwind Info](https://www.mono-project.com/docs/advanced/runtime/docs/llvm-backend/#unwind-info)
  - [Stack unwinding during exception handling](https://www.mono-project.com/docs/advanced/runtime/docs/exception-handling/#stack-unwinding-during-exception-handling)
  - [/master/mono/mini/**unwind.c**](https://github.com/mono/mono/blob/master/mono/mini/unwind.c)
  - [/master/mono/utils/**mono-stack-unwinding.h**](https://github.com/mono/mono/blob/master/mono/utils/mono-stack-unwinding.h)
- **CoreRT** ([A .NET Runtime for AOT]({{ base }}/2018/06/07/CoreRT-.NET-Runtime-for-AOT/))
  - [High-level Engineering Plan - Runtime](https://github.com/dotnet/corert/blob/master/Documentation/high-level-engineering-plan.md#runtime)
  - [/src/Native/Runtime/unix/**UnwindHelpers.cpp**](https://github.com/dotnet/corert/blob/master/src/Native/Runtime/unix/UnwindHelpers.cpp)
  - [/src/Native/Runtime/**StackFrameIterator.cpp**](https://github.com/dotnet/corert/blob/master/src/Native/Runtime/StackFrameIterator.cpp) (see `StackFrameIterator::NextInternal()`)
  - [/src/Native/**libunwind**](https://github.com/dotnet/corert/tree/master/src/Native/libunwind)
- **Go**
  - [The Go low-level calling convention on x86-64](https://science.raphael.poss.name/go-calling-convention-x86-64.html#aside-exceptions-in-c-c)
  - [Go Internals - Chapter I: A Primer on Go Assembly](https://github.com/teh-cmc/go-internals/blob/master/chapter1_assembly_primer/README.md#dissecting-main)
  - [Go Profiler Internals](https://stackimpact.com/blog/go-profiler-internals/)
  - [golang.org/src/runtime/stack.go](https://golang.org/src/runtime/stack.go)
  - [golang.org/src/runtime/traceback.go](https://golang.org/src/runtime/traceback.go?h=gentraceback#L98) (see `gentraceback(..)`)
  - [golang.org/src/runtime/symtab.go](https://golang.org/src/runtime/symtab.go?h=findfunc#L659) (see `findfunc(..)`)
  - [Language Mechanics On Stacks And Pointers](https://www.ardanlabs.com/blog/2017/05/language-mechanics-on-stacks-and-pointers.html)
  - [Generating Stack Traces in Go](http://technosophos.com/2014/03/19/generating-stack-traces-in-go.html)
- **Java**
  - [JEP 259: Stack-Walking API](http://openjdk.java.net/jeps/259)
  - [A Visual Look at JVM Stacks and Frames](https://alvinalexander.com/scala/fp-book/recursion-visual-look-jvm-stack-frames)
  - [The Java Virtual Machine - The Java Stack](https://www.artima.com/insidejvm/ed2/jvm8.html)
  - [The Structure of the Java Virtual Machine - Native Method Stacks](https://docs.oracle.com/javase/specs/jvms/se7/html/jvms-2.html#jvms-2.5.6)
  - [Stack Walking - Dynamic Runtime Layer Virtual Machine Developer's Guide](https://harmony.apache.org/subcomponents/drlvm/developers_guide.html#Stack_Walking)
  - [A Study of Exception Handling and Its Dynamic Optimization in Java](http://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.67.346&rep=rep1&type=pdf) (pdf)
  - [Chapter 8 of 'Advanced Design and Implementation of Virtual Machines'](https://books.google.co.uk/books?id=jZG_DQAAQBAJ&lpg=PA125&ots=KwhW3tYXUa&dq=chapter%208%20stack%20unwinding&pg=PA125#v=onepage&q=chapter%208%20stack%20unwinding&f=false)
- **Rust**
  - [Unwinding](https://doc.rust-lang.org/nomicon/unwinding.html)
  - [Don't Panic! The Hitchhiker's Guide to Unwinding](http://lucumr.pocoo.org/2014/10/30/dont-panic/)
  - [Stack unwinding in Rust](https://news.ycombinator.com/item?id=8537756) (Hacker News)
  - [RFC 1513 - Less unwinding](https://github.com/rust-lang/rfcs/blob/master/text/1513-less-unwinding.md)
  - [Disabling panic! handling](https://internals.rust-lang.org/t/disabling-panic-handling/1834)
  - [Controlling panics with std::panic](https://rust-lang-nursery.github.io/edition-guide/rust-2018/error-handling-and-panics/controlling-panics-with-std-panic.html)
  - [Module std::rt::unwind](https://doc.rust-lang.org/1.3.0/std/rt/unwind/)
