---
layout: post
title: The 68 things the CLR does before executing a single line of your code (*)
comments: true
tags: [CLR, Internals]
date: 2017-02-07
---

Because the CLR is a managed environment there are several components within the runtime that need to be initialised before *any* of your code can be executed. This post will take a look at the EE (Execution Engine) start-up routine and examine the initialisation process in detail.

(*) 68 is only a rough guide, it depends on which version of the runtime you are using, which features are enabled and a few other things

----

## 'Hello World'

Imagine you have the simplest possible C# program, what has to happen before the CLR prints 'Hello World' out to the console? 

``` csharp
using System;

namespace ConsoleApplication
{
    public class Program
    {
        public static void Main(string[] args)
        {
            Console.WriteLine("Hello World!");
        }
    }
}
```

## The code path into the EE (Execution Engine)

When a .NET executable runs, control gets into the EE via the following code path:

1. [_CorExeMain()](https://github.com/dotnet/coreclr/blob/5c47caa806e6907df81e7a96864984df4d0f38cd/src/vm/ceemain.cpp#L2821-L2846) (the external entry point) 
  - call to [_CorExeMainInternal()](https://github.com/dotnet/coreclr/blob/5c47caa806e6907df81e7a96864984df4d0f38cd/src/vm/ceemain.cpp#L2837) 
1. [_CorExeMainInternal()](https://github.com/dotnet/coreclr/blob/1d03b8fd8d650bd215623a7b035e68db96697e59/src/vm/ceemain.cpp#L2856-L2934)   
  - call to [EnsureEEStarted()](https://github.com/dotnet/coreclr/blob/1d03b8fd8d650bd215623a7b035e68db96697e59/src/vm/ceemain.cpp#L2891)
1. [EnsureEEStarted()](https://github.com/dotnet/coreclr/blob/1d03b8fd8d650bd215623a7b035e68db96697e59/src/vm/ceemain.cpp#L366-L496) 
  - call to [EEStartup()](https://github.com/dotnet/coreclr/blob/1d03b8fd8d650bd215623a7b035e68db96697e59/src/vm/ceemain.cpp#L429)
1. [EEStartup()](https://github.com/dotnet/coreclr/blob/1d03b8fd8d650bd215623a7b035e68db96697e59/src/vm/ceemain.cpp#L1419-L1451) 
  - call to [EEStartupHelper()](https://github.com/dotnet/coreclr/blob/1d03b8fd8d650bd215623a7b035e68db96697e59/src/vm/ceemain.cpp#L1436)
1. [EEStartupHelper()](https://github.com/dotnet/coreclr/blob/1d03b8fd8d650bd215623a7b035e68db96697e59/src/vm/ceemain.cpp#L806-L1378)

(if you're interested in what happens before this, i.e. how a CLR Host can start-up the runtime, see my previous post ['How the dotnet CLI tooling runs your code']({{ base }}/2016/07/04/How-the-dotnet-CLI-tooling-runs-your-code/))

And so we end up in `EEStartupHelper()`, which at a high-level does the following (from [a comment in ceemain.cpp](https://github.com/dotnet/coreclr/blob/1d03b8fd8d650bd215623a7b035e68db96697e59/src/vm/ceemain.cpp#L1411-L1417)):

> EEStartup is responsible for all the one time initialization of the runtime.  
> Some of the highlights of what it does include
>    * Creates the default and shared, appdomains. 
>    * Loads mscorlib.dll and loads up the fundamental types (System.Object ...)

----

## The main phases in EE (Execution Engine) start-up routine

But let's look at what it does in detail, the lists below contain all the individual function calls made from [EEStartupHelper()](https://github.com/dotnet/coreclr/blob/1d03b8fd8d650bd215623a7b035e68db96697e59/src/vm/ceemain.cpp#L806-L1378) (~500 L.O.C). To make them easier to understand, we'll split them up into separate phases:

- [Phase 1](#phase-1---set-up-the-infrastructure-that-needs-to-be-in-place-before-anything-else-can-run) - Set-up the **infrastructure** that needs to be in place before anything else can run
- [Phase 2](#phase-2---initialise-the-core-low-level-components) - Initialise the **core, low-level** components
- [Phase 3](#phase-3---start-up-the-low-level-components-ie-error-handling-profiling-api-debugging) - Start-up the **low-level components**, i.e. error handling, profiling API, debugging
- [Phase 4](#phase-4---start-the-main-components-ie-garbage-collector-gc-appdomains-security) - Start the **main components**, i.e. Garbage Collector (GC), AppDomains, Security
- [Phase 5](#phase-5-final-setup-and-then-notify-other-components-that-the-ee-has-started) - Final setup and then **notify other components** that the EE has started

**Note** some items in the list below are only included if a particular [feature](https://github.com/dotnet/coreclr/blob/master/clr.defines.targets) is [defined at build-time](https://github.com/dotnet/coreclr/blob/master/clr.props), these are indicated by the inclusion on an `ifdef` statement. Also note that the links take you to the code for the function being *called*, not the line of code within `EEStartupHelper()`.

### Phase 1 - **Set-up the infrastructure that needs to be in place before anything else can run** 

1. Wire-up **console handling** - [SetConsoleCtrlHandler(..)](https://msdn.microsoft.com/en-us/library/windows/desktop/ms686016(v=vs.85).aspx) (`ifndef FEATURE_PAL`)
1. Initialise the internal **`SString` class** (everything uses strings!) - [SString::Startup()](https://github.com/dotnet/coreclr/blob/f5cbe4c9cab2873b60cd3c991732a250d2e164a2/src/utilcode/sstring.cpp#L46-L67)
1. Make sure the **configuration** is set-up, so settings that control run-time options can be accessed - [EEConfig::Set-up()](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/vm/eeconfig.cpp#L140-L163) and [InitializeHostConfigFile()](https://github.com/dotnet/coreclr/blob/1d03b8fd8d650bd215623a7b035e68db96697e59/src/vm/ceemain.cpp#L568-L581) (`#if !defined(CROSSGEN_COMPILE)`)
1. Initialize **Numa and CPU group information** - [NumaNodeInfo::InitNumaNodeInfo()](https://github.com/dotnet/coreclr/blob/3992010c31ffc9eb50359713f1c29fd29902e04a/src/utilcode/util.cpp#L793-L796) and [CPUGroupInfo::EnsureInitialized()](https://github.com/dotnet/coreclr/blob/3992010c31ffc9eb50359713f1c29fd29902e04a/src/utilcode/util.cpp#L1029-L1065) (`#ifndef CROSSGEN_COMPILE`)
1. Initialize **global configuration settings** based on startup flags - [InitializeStartupFlags()](https://github.com/dotnet/coreclr/blob/1d03b8fd8d650bd215623a7b035e68db96697e59/src/vm/ceemain.cpp#L584-L648)
1. Set-up the **Thread Manager** that gives the runtime access to the OS threading functionality (`StartThread()`, `Join()`, `SetThreadPriority()` etc) - [InitThreadManager()](https://github.com/dotnet/coreclr/blob/496c33f0b5c6ad87257dd1ff1c42ea8db0a53ae0/src/vm/threads.cpp#L1550-L1692)
1. Initialize [**Event Tracing (ETW)**](https://msdn.microsoft.com/en-us/library/windows/desktop/bb968803(v=vs.85).aspx) and fire off the CLR startup events - [InitializeEventTracing()](https://github.com/dotnet/coreclr/blob/38a0b157a1bad7080763009746cce92be2388b8e/src/vm/eventtrace.cpp#L4275-L4306) and [ETWFireEvent(EEStartupStart_V1)](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/inc/eventtracebase.h#L123) (`#ifdef FEATURE_EVENT_TRACE`)
1. Set-up the [**GS Cookie (Buffer Security Check)**](https://msdn.microsoft.com/en-us/library/8dbf701c.aspx) to help prevent buffer overruns - [InitGSCookie()](https://github.com/dotnet/coreclr/blob/1d03b8fd8d650bd215623a7b035e68db96697e59/src/vm/ceemain.cpp#L693-L741)
1. Create the data-structures needed to hold the [**'frames' used for stack-traces**](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/stackwalking.md#the-stack-model) - [Frame::Init()](https://github.com/dotnet/coreclr/blob/6ed21c52f25243b7cc1c64b19a47bbd4beb69314/src/vm/frames.cpp#L304-L321)
1. Ensure initialization of [**Apphacks environment variables**](https://blogs.msdn.microsoft.com/junfeng/2004/10/09/should-we-put-apphack-in-net-2-0/) - [GetGlobalCompatibilityFlags()](https://github.com/dotnet/coreclr/search?utf8=%E2%9C%93&q=GetGlobalCompatibilityFlags) (`#ifndef FEATURE_CORECLR`)
1. Create the **diagnostic and performance logs** used by the runtime - [InitializeLogging()](https://github.com/dotnet/coreclr/blob/f5cbe4c9cab2873b60cd3c991732a250d2e164a2/src/utilcode/log.cpp#L191-L200) (`#ifdef LOGGING`) and [PerfLog::PerfLogInitialize()](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/utilcode/perflog.cpp#L58-L148) (`#ifdef ENABLE_PERF_LOG`)

### Phase 2 - **Initialise the core, low-level components**

1. **Write to the log** `===================EEStartup Starting===================`
1. Ensure that the **Runtime Library functions** (that interact with ntdll.dll) are enabled - [EnsureRtlFunctions()](https://github.com/dotnet/coreclr/ blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/vm/rtlfunctions.cpp#L24-L47) (`#ifndef FEATURE_PAL`)
1. Set-up the **global store for** [**events (mutexes, semaphores)**](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/vm/synch.h) used for synchronisation within the runtime - [InitEventStore()](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/vm/eventstore.cpp#L207-L212)
1. Create the **Assembly Binding logging** mechanism a.k.a [Fusion](https://msdn.microsoft.com/en-us/library/e74a18c4(v=vs.110).aspx) - [InitializeFusion()](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/vm/fusioninit.cpp#L174-L490) (`#ifdef FEATURE_FUSION`)
1. Then initialize the actual **Assembly Binder infrastructure** - [CCoreCLRBinderHelper::Init()](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/binder/coreclrbindercommon.cpp#L18-L29) which in turn calls [AssemblyBinder::Startup()](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/binder/assemblybinder.cpp#L454-L472) (`#ifdef FEATURE_FUSION` is NOT defined)
1. Set-up the heuristics used to control [**Monitors, Crsts, and SimpleRWLocks**](https://github.com/dotnet/coreclr/blob/73b4f008866b153a4d86785b648de4a281981c9e/Documentation/coding-guidelines/clr-code-guide.md#262-using-crsts) - [InitializeSpinConstants()](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/vm/syncblk.h#L160-L170)
1. Initialize the **InterProcess Communication with COM** (IPC) - [InitializeIPCManager()](https://github.com/dotnet/coreclr/blob/1d03b8fd8d650bd215623a7b035e68db96697e59/src/vm/ceemain.cpp#L4209-L4317) (`#ifdef FEATURE_IPCMAN`)
1. Set-up and enable **Performance Counters** - [PerfCounters::Init()](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/inc/perfcounters.h) (`#ifdef ENABLE_PERF_COUNTERS`)
1. Set-up the **CLR interpreter** - [Interpreter::Initialize()](https://github.com/dotnet/coreclr/blob/master/src/vm/interpreter.cpp#L6612-L6635) (`#ifdef FEATURE_INTERPRETER`), turns out that the CLR has a mode where your code is interpreted instead of compiled!
1. Initialise the **stubs that are used by the CLR for** [**calling methods and triggering the JIT**](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/method-descriptor.md#precode) - [StubManager::InitializeStubManagers()](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/vm/stubmgr.cpp#L719-L729), also [Stub::Init()](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/vm/stublink.cpp#L2281-L2293) and [StubLinkerCPU::Init()](https://github.com/dotnet/coreclr/blob/375948e39cf1a946b3d8048ca51cd4e548f94648/src/vm/i386/stublinkerx86.cpp#L841-L860)
1. Set up the **core handle map**, used to load assemblies into memory - [PEImage::Startup()](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/vm/peimage.cpp#L39-L78)
1. Startup the **access checks options**, used for granting/denying security demands on method calls - [AccessCheckOptions::Startup()](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/vm/clsload.cpp#L4960-L4969)
1. Startup the [**mscorlib binder**](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/Documentation/botr/mscorlib.md#interface-between-managed--clr-code) (used for loading "known" types from mscorlib.dll) - [MscorlibBinder::Startup()](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/vm/binder.cpp#L487-L491)
1. Initialize [**remoting**](https://msdn.microsoft.com/en-us/library/kwdt6w2k(v=vs.71).aspx), **which allows out-of-process communication** - [CRemotingServices::Initialize()](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/vm/remoting.cpp#L121-L129) (`#ifdef FEATURE_REMOTING`)
1. Set-up the data structures used by the GC for [**weak, strong and no-pin references**](https://msdn.microsoft.com/en-us/library/ms404247(v=vs.110).aspx) - [Ref_Initialize()](https://github.com/dotnet/coreclr/blob/38a0b157a1bad7080763009746cce92be2388b8e/src/gc/objecthandle.cpp#L612-L679)
1. Set-up the contexts used to [**proxy method calls across App Domains**](https://blogs.msdn.microsoft.com/suzcook/2003/06/12/executing-code-in-another-appdomain/) - [Context::Initialize()](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/vm/contexts.cpp#L139-L151)
1. Wire-up **events that allow the EE to synchronise shut-down** - `g_pEEShutDownEvent->CreateManualEvent(FALSE)`
1. Initialise the process-wide data structures used for **reader-writer lock implementation** - [CRWLock::ProcessInit()](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/vm/rwlock.cpp#L115-L137) (`#ifdef FEATURE_RWLOCK`)
1. Initialize the **debugger manager** - [CCLRDebugManager::ProcessInit()](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/vm/corhost.cpp#L6090-L6100) (`#ifdef FEATURE_INCLUDE_ALL_INTERFACES`)
1. Initialize the **CLR Security Attribute** Manager - [CCLRSecurityAttributeManager::ProcessInit()](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/vm/corhost.cpp#L6899-L6910) (`#ifdef FEATURE_IPCMAN`)
1. Set-up the manager for [**Virtual call stubs**](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/virtual-stub-dispatch.md) - [VirtualCallStubManager::InitStatic()](https://github.com/dotnet/coreclr/blob/74967f89e0f43e156cf23cd88840e1f0fc94f997/src/vm/virtualcallstub.cpp#L859-L886)
1. Initialise the lock that that **GC uses when controlling memory pressure** - [GCInterface::m_MemoryPressureLock.Init(CrstGCMemoryPressure)](https://github.com/dotnet/coreclr/blob/ffeef85a626d7344fd3e2031f749c356db0628d3/src/vm/comutilnative.cpp#L1634)
1. Initialize **Assembly Usage Logger** - [InitAssemblyUsageLogManager()](https://github.com/dotnet/coreclr/blob/1d03b8fd8d650bd215623a7b035e68db96697e59/src/vm/ceemain.cpp#L744-L772) (`#ifndef FEATURE_CORECLR`)

### Phase 3 - **Start-up the low-level components, i.e. error handling, profiling API, debugging**

1. Set-up the **App Domains** used by the CLR - [SystemDomain::Attach()](https://github.com/dotnet/coreclr/blob/e90db7bdfde00932d04188aa9eb105442a3fa294/src/vm/appdomain.cpp#L2229-L2287) (also creates the DefaultDomain and the SharedDomain by calling [SystemDomain::CreateDefaultDomain()](https://github.com/dotnet/coreclr/blob/93cb39e3c1bbd4407261926a7365949f288ebc37/src/vm/appdomain.cpp#L4505-L4536) and [SharedDomain::Attach()](https://github.com/dotnet/coreclr/blob/93cb39e3c1bbd4407261926a7365949f288ebc37/src/vm/appdomain.cpp#L11834-L11861)) 
1. Start up the **ECall interface**, a private native calling interface used within the CLR - [ECall::Init()](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/vm/ecall.cpp#L510-L526)
1. Set-up the [**caches for the stubs used by `delegates`**]({{ base }}/2017/01/25/How-do-.NET-delegates-work/) - [COMDelegate::Init()](https://github.com/dotnet/coreclr/blob/c5abe8c5a3d74b8417378e03f560fd54799c17f2/src/vm/comdelegate.cpp#L524-L544)
1. Set-up all the **global/static variables used by the EE itself** - [ExecutionManager::Init()](https://github.com/dotnet/coreclr/blob/b0e0168b65813f0067648966c81befff0a439da1/src/vm/codeman.cpp#L4164-L4187)
1. Initialise **Watson, for windows error reporting** - [InitializeWatson(fFlags)](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/vm/dwreport.cpp#L166-L189) (`#ifndef FEATURE_PAL`)
1. Initialize the **debugging services**, this must be done before any EE thread objects are created, and before any classes or modules are loaded - [InitializeDebugger()](https://github.com/dotnet/coreclr/blob/1d03b8fd8d650bd215623a7b035e68db96697e59/src/vm/ceemain.cpp#L4067-L4168) (`#ifdef DEBUGGING_SUPPORTED`)
1. Activate the [**Managed Debugging Assistants**](https://msdn.microsoft.com/en-us/library/d21c150d(v=vs.110).aspx) that the CLR provides - [ManagedDebuggingAssistants::EEStartupActivation()](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/vm/mda.cpp#L246-L270) (`ifdef MDA_SUPPORTED`)
1. Initialise the [**Profiling API**](https://msdn.microsoft.com/en-us/library/bb384493(v=vs.110).aspx) - [ProfilingAPIUtility::InitializeProfiling()](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/vm/profilinghelper.cpp#L493-L591) (`#ifdef PROFILING_SUPPORTED`)
1. Initialise the **exception handling mechanism** - [InitializeExceptionHandling()](https://github.com/dotnet/coreclr/blob/d24162bd144b37b2b353797db846aab80bf13db1/src/vm/exceptionhandling.cpp#L145-L168)
1. Install the CLR **global exception filter** - [InstallUnhandledExceptionFilter()](https://github.com/dotnet/coreclr/blob/2fc44782c783f363c1a98e0767f6fa65b5548c95/src/vm/excep.cpp#L4894-L5001)
1. Ensure that the initial **runtime thread** is created - [SetupThread()](https://github.com/dotnet/coreclr/blob/496c33f0b5c6ad87257dd1ff1c42ea8db0a53ae0/src/vm/threads.h#L649-L653) in turn calls [SetupThread(..)](https://github.com/dotnet/coreclr/blob/496c33f0b5c6ad87257dd1ff1c42ea8db0a53ae0/src/vm/threads.cpp#L822-L1085) 
1. Initialise the **PreStub manager** ([PreStub's trigger the JIT](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/method-descriptor.md#precode)) - [InitPreStubManager()](https://github.com/dotnet/coreclr/blob/b1586fb32ae6bbb37966952c10308b328021db43/src/vm/prestub.cpp#L1688-L1702) and the corresponding helpers [StubHelpers::Init()](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/vm/stubhelpers.cpp#L46-L50)
1. Initialise the **COM Interop layer** - [InitializeComInterop()](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/vm/interoputil.cpp#L5346-L5368) (`#ifdef FEATURE_COMINTEROP`)
1. Initialise **NDirect method calls** (lazy binding of unmanaged P/Invoke targets) - [NDirect::Init()](https://github.com/dotnet/coreclr/blob/8c2db15331291324573d752fb3b6a3a9dae73b31/src/vm/dllimport.cpp#L7345-L7375)
1. Set-up the **JIT Helper functions**, so they are in place before the execution manager runs - [InitJITHelpers1()](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/vm/jitinterfacegen.cpp#L193-L299) and [InitJITHelpers2()](https://github.com/dotnet/coreclr/blob/3891c5f681eccd262f1ccca4bfa34a582573ce1d/src/vm/jithelpers.cpp#L6657-L6677)
1. Initialise and set-up the **SyncBlock cache** - [SyncBlockCache::Attach()](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/vm/syncblk.cpp#L826-L829) and [SyncBlockCache::Start()](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/vm/syncblk.cpp#L919-L949)
1. Create the cache used when [**walking/unwinding the stack**](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/stackwalking.md) - [StackwalkCache::Init()](https://github.com/dotnet/coreclr/blob/1f1f95dc7b5c33a23ccc4df42078d11eb72d52db/src/vm/stackwalk.cpp#L3366-L3371)

### Phase 4 - **Start the main components, i.e. Garbage Collector (GC), AppDomains, Security**

1. Start up **security system, that handles** [**Code Access Security (CAS)**](https://msdn.microsoft.com/en-us/library/930b76w0(v=vs.90).aspx) - [Security::Start()](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/vm/security.inl#L17-L21) which in turn calls [SecurityPolicy::Start()](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/vm/securitypolicy.cpp#L94-L124) 
1. Wire-up an event to allow **synchronisation of AppDomain unloads** - [AppDomain::CreateADUnloadStartEvent()](https://github.com/dotnet/coreclr/blob/e90db7bdfde00932d04188aa9eb105442a3fa294/src/vm/appdomain.cpp#L2617-L2630)
1. Initialise the **'Stack Probes' used to setup stack guards**  [InitStackProbes()](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/vm/stackprobe.cpp#L556-L631) (`#ifdef FEATURE_STACK_PROBE`) 
1. Initialise the **GC and create the heaps that it uses** - [InitializeGarbageCollector()](https://github.com/dotnet/coreclr/blob/ace6d1b728f4041d351cbf05e9356a23305be182/src/gc/gccommon.cpp#L136-L159)
1. Initialise the **tables used to hold the locations of pinned objects**** - [InitializePinHandleTable()](https://github.com/dotnet/coreclr/blob/81c42cecca5e1b0b802d4df980280750d2e1419e/src/vm/nativeoverlapped.cpp#L363-L371)
1. Inform the **debugger about the DefaultDomain**, so it can interact with it - [SystemDomain::System()->PublishAppDomainAndInformDebugger(..)](https://github.com/dotnet/coreclr/blob/e90db7bdfde00932d04188aa9eb105442a3fa294/src/vm/appdomain.cpp#L4529-L4547) (`#ifdef DEBUGGING_SUPPORTED`)
1. Initialise the existing **OOB Assembly List** (no idea?) - [ExistingOobAssemblyList::Init()](https://github.com/dotnet/coreclr/blob/master/src/vm/assembly.cpp#L5062-L5067) (`#ifndef FEATURE_CORECLR`)
1. Actually initialise the **System Domain (which contains mscorlib)**, so that it can start executing - [SystemDomain::System()->Init()](https://github.com/dotnet/coreclr/blob/e90db7bdfde00932d04188aa9eb105442a3fa294/src/vm/appdomain.cpp#L2478-L2591)

### Phase 5 **Final setup and then notify other components that the EE has started**

1. Tell the **profiler we've stated up** - [SystemDomain::NotifyProfilerStartup()](https://github.com/dotnet/coreclr/blob/e90db7bdfde00932d04188aa9eb105442a3fa294/src/vm/appdomain.cpp#L4606-L4657) (`#ifdef PROFILING_SUPPORTED`)
1. Pre-create a thread to **handle AppDomain unloads** - [AppDomain::CreateADUnloadWorker()](https://github.com/dotnet/coreclr/blob/e90db7bdfde00932d04188aa9eb105442a3fa294/src/vm/appdomain.cpp#L12944-L13004) (`#ifndef CROSSGEN_COMPILE`)
1. Set a flag to confirm that **'initialisation' of the EE succeeded** - `g_fEEInit = false`
1. Load the **System Assemblies ('mscorlib') into the Default Domain** - [SystemDomain::System()->DefaultDomain()->LoadSystemAssemblies()](https://github.com/dotnet/coreclr/blob/e90db7bdfde00932d04188aa9eb105442a3fa294/src/vm/appdomain.cpp#L6397-L6432)
1. Set-up all the **shared static variables (and `String.Empty`) in the Default Domain** - [SystemDomain::System()->DefaultDomain()->SetupSharedStatics()](https://github.com/dotnet/coreclr/blob/e90db7bdfde00932d04188aa9eb105442a3fa294/src/vm/appdomain.cpp#L7548-L7613), they are all contained in the internal class [SharedStatics.cs](https://github.com/dotnet/coreclr/blob/master/src/mscorlib/src/System/SharedStatics.cs)
1. Set-up the **stack sampler feature**, that identifies 'hot' methods in your code - [StackSampler::Init()](https://github.com/dotnet/coreclr/blob/7250e6f6630839b09d54f2f71d858b33c018ae8b/src/vm/stacksampler.cpp#L85-L94) (`#ifdef FEATURE_STACK_SAMPLING`)
1. Perform any **once-only** [**SafeHandle**](https://msdn.microsoft.com/en-us/library/system.runtime.interopservices.safehandle(v=vs.110).aspx) **initialization** - [SafeHandle::Init()](https://github.com/dotnet/coreclr/blob/0b064eef415468f50e7360256e42737d247eb677/src/vm/safehandle.cpp#L29-L51) (`#ifndef CROSSGEN_COMPILE`)
1. Set flags to indicate that the **CLR has successfully started** - `g_fEEStarted = TRUE`, `g_EEStartupStatus = S_OK` and `hr = S_OK`
1. **Write to the log** `===================EEStartup Completed===================`

**Once this is all done, the CLR is now ready to execute your code!!**

----

## Executing your code

Your code will be executed (after first being 'JITted') via the following code flow:

1. [CorHost2::ExecuteAssembly()](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/vm/corhost.cpp#L1267-L1365) 
  - calling [ExecuteMainMethod()](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/vm/corhost.cpp#L1349)
1. [Assembly::ExecuteMainMethod()](https://github.com/dotnet/coreclr/blob/5ff10a5b41d5481e21df9bbf5a4e8b419895530d/src/vm/assembly.cpp#L2698-L2784) 
  - calling [RunMain()](https://github.com/dotnet/coreclr/blob/5ff10a5b41d5481e21df9bbf5a4e8b419895530d/src/vm/assembly.cpp#L2762)
1. [RunMain() (in assembly.cpp)](https://github.com/dotnet/coreclr/blob/5ff10a5b41d5481e21df9bbf5a4e8b419895530d/src/vm/assembly.cpp#L2529-L2660)
  - eventually calling into you [main() method](https://github.com/dotnet/coreclr/blob/5ff10a5b41d5481e21df9bbf5a4e8b419895530d/src/vm/assembly.cpp#L2633-L2646)
  - [full explanation of the 'call' process](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/vm/callhelpers.h#L390-L430)

----

## Further information

The CLR provides a huge amount of log information if you create a [debug build](https://github.com/dotnet/coreclr#building-the-repository) and then enable the [right environment variables](https://github.com/dotnet/coreclr/blob/master/Documentation/project-docs/clr-configuration-knobs.md). The links below take you to the various logs produced when running a simple 'hello world' program (shown at the top of this post), they give you an pretty good idea of the different things that the CLR is doing behind-the-scenes.

- [All Classes Loaded]({{ base }}/data/2017/02/All Classes Loaded.txt)
- [All Methods JITted]({{ base }}/data/2017/02/All Methods JITted.txt)
- [Entire log]({{ base }}/data/2017/02/COMPLUS-EVERYTHING.log) (warning ~68K lines long!!)
- [Log produced during EEStartupHelper() only]({{ base }}/data/2017/02/COMPLUS-EVERYTHING-Just-EEStartup.log) (only ~48K lines!!)
- [AppDomain log]({{ base }}/data\2017\02\COMPLUS-AppDomain.log)
- [Class Loader log]({{ base }}/data\2017\02\COMPLUS-ClassLoader.log)
- [Class loader log for `ConsoleApplication` only]({{ base }}/data\2017\02\COMPLUS-ClassLoader-ConsoleApplication.log)
- [Code Sharing log]({{ base }}/data\2017\02\COMPLUS-CodeSharing.log)
- [Core Debugging log]({{ base }}/data\2017\02\COMPLUS-CORDB-(CoreDebugging).log)
- [Exception Handling log]({{ base }}/data\2017\02\COMPLUS-EH-(ExceptionHandling).log)
- [JIT log]({{ base }}/data\2017\02\COMPLUS-Jit.log)
- [Loader log]({{ base }}/data\2017\02\COMPLUS-Loader.log)