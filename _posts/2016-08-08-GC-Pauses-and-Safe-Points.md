---
layout: post
title: GC Pauses and Safe Points
comments: true
tags: [CLR, GC, Safepoints]
date: 2016-08-08

---

GC pauses are a popular topic, if you do a [google search](https://www.google.com/#q=gc+pauses+in+.net), you'll see lots of articles explaining how to measure and more importantly how to reduce them. This issue is that in most runtimes that have a GC, allocating objects is a quick operation, but at some point in time the GC will need to clean up all the garbage and to do this is has to *pause* the entire runtime (except if you happen to be using [Azul's pauseless GC for Java](https://www.azul.com/products/zing/pgc/)). 

The GC needs to pause the entire runtime so that it can move around objects as part of it's *compaction* phase. If these objects were being referenced by code that was simultaneously executing then all sorts of bad things would happen. So the GC can only make these changes when it knows that no other code is running, hence the need to *pause* the entire runtime. 

## GC Flow 

In a [previous post]({{ base }}/2016/06/20/Visualising-the-dotNET-Garbage-Collector/) I demonstrated how you can use ETW Events to visualise what the .NET Garbage Collector (GC) is doing. That post included the following GC flow for a Foreground/Blocking Collection (info taken from the [excellent blog post](https://blogs.msdn.microsoft.com/maoni/2014/12/25/gc-etw-events-3/) by [Maoni Stephens](https://github.com/Maoni0/) the main developer on the .NET GC):

1. `GCSuspendEE_V1` 
2. `GCSuspendEEEnd_V1` <– **suspension is done**
3. `GCStart_V1` 
4. `GCEnd_V1` <– **actual GC is done**
5. `GCRestartEEBegin_V1` 
6. `GCRestartEEEnd_V1` <– **resumption is done.**

This post is going to be looking at **how** the .NET Runtime brings all the threads in an application to a **safe-point** so that the GC can do it's work. This corresponds to what happens between step 1) `GCSuspendEE_V1` and 2) `GCSuspendEEEnd_V1` in the flow above.

For some background this passage from the excellent [Pro .NET Performance: Optimize Your C# Applications ](https://www.amazon.co.uk/Pro-NET-Performance-Optimize-Applications/dp/1430244585/ref=as_li_ss_tl?ie=UTF8&linkCode=ll1&tag=mattonsoft-21&linkId=f18fd47630f046ab8e28512acc728fbb) explains what's going on:

[![Suspending Threads for GC]({{ base }}/images/2016/08/Suspending Threads for GC.png)](https://books.google.co.uk/books?id=fhpYTbos8OkC&pg=PA103&lpg=PA103&dq=GC+safepoints+.NET&source=bl&ots=OcEbYCaMor&sig=XNDl1pSuKRcDU_xc1M6Go64ot2Q&hl=en&sa=X&redir_esc=y#v=onepage&q&f=false)

Technically the GC itself doesn't actually perform a suspension, it calls [into the *Execution Engine* (EE)](https://github.com/dotnet/coreclr/blob/master/src/vm/gcenv.ee.cpp#L26-L36) and asks that to suspend all the running threads. This suspension needs to be as quick as possible, because the time taken contributes to the overall *GC pause*. Therefore this *Time To Safe Point* (TTSP) as it's known, needs to be minimised, the CLR does this by using several techniques. 

## GC suspension in Runtime code

Inside code that it controls, the runtime inserts method calls to ensure that threads can regularly *poll* to determine when they need to suspend. For instance take a look at the following code snippet from the [`IndexOfCharArray()`](https://github.com/dotnet/coreclr/blob/deb00ad58acf627763b6c0a7833fa789e3bb1cd0/src/classlibnative/bcltype/stringnative.cpp#L351-L400) method (which is called internally by [`String.IndexOfAny(..)`](https://msdn.microsoft.com/en-us/library/system.string.indexofany(v=vs.110).aspx)). Notice that it contains multiple calls to the macro `FC_GC_POLL_RET()`:

``` cpp
FCIMPL4(INT32, COMString::IndexOfCharArray, StringObject* thisRef, CHARArray* valueRef, INT32 startIndex, INT32 count)
{
    // <OTHER CODE REMOVED>

    // use probabilistic map, see (code:InitializeProbabilisticMap)
    int charMap[PROBABILISTICMAP_SIZE] = {0};

    InitializeProbabilisticMap(charMap, valueChars, valueLength);

    for (int i = startIndex; i < endIndex; i++) {
        WCHAR thisChar = thisChars[i];
        if (ProbablyContains(charMap, thisChar))
            if (ArrayContains(thisChars[i], valueChars, valueLength) >= 0) {
                FC_GC_POLL_RET();
                return i;
            }
    }

    FC_GC_POLL_RET();
    return -1;
}
``` 

The are [lots of other places](https://github.com/dotnet/coreclr/search?utf8=%E2%9C%93&q=FC_GC_POLL+FC_GC_POLL_RET&type=Code) in the runtime where these calls are inserted, to ensure that a GC suspension can happen as soon as possible. However having these calls spread throughout the code has an overhead, so the runtime uses a special trick to ensure the cost is only paid when a suspension has actually been requested, From [jithelp.asm](https://github.com/dotnet/coreclr/blob/deb00ad58acf627763b6c0a7833fa789e3bb1cd0/src/vm/i386/jithelp.asm#L472-L480) you can see that the method call is re-written to a `nop` routine when not needed and only calls the [actual `JIT_PollGC()` function](https://github.com/dotnet/coreclr/blob/deb00ad58acf627763b6c0a7833fa789e3bb1cd0/src/vm/jithelpers.cpp#L6331-L6536) when absolutely required:

``` assembly
; Normally (when we're not trying to suspend for GC), the 
; CORINFO_HELP_POLL_GC helper points to this nop routine.  When we're 
; ready to suspend for GC, we whack the Jit Helper table entry to point 
; to the real helper. When we're done with GC we whack it back.
PUBLIC @JIT_PollGC_Nop@0
@JIT_PollGC_Nop@0 PROC
ret
@JIT_PollGC_Nop@0 ENDP
```

However calls to `FC_GC_POLL` need to be carefully inserted in the correct locations, too few and the EE won't be able to suspend quickly enough and this will cause excessive GC pauses, as this comment from one of the .NET JIT devs confirms:

[![FC_GC_POLL call location]({{ base }}/images/2016/08/FC_GC_POLL call location.png)](https://github.com/dotnet/coreclr/pull/36#discussion_r24088949)

## GC suspension in User code

Alternatively, in code that the runtime doesn't control things are a bit different. Here the JIT analyses the code and classifies it as either:

- **Partially interruptible**
- **Fully interruptible** 

**Partially interruptible** code can only be suspended at explicit GC poll locations (i.e. `FC_GC_POLL` calls) or when it calls into other methods. On the other hand **fully interruptible** code can be interrupted or suspended at any time, as every line within the method is considered a GC safe-point.

I'm not going to talk about how the thread-suspension mechanism works, as it's a complex topic, but as always there's an in-depth [section in the BOTR](https://github.com/dotnet/coreclr/blob/775003a4c72f0acc37eab84628fcef541533ba4e/Documentation/botr/threading.md#suspension) that gives all the gory details (in summary it suspends the underlying native thread, via the [Win32 SuspendThread API](https://msdn.microsoft.com/en-us/library/windows/desktop/ms686345(v=vs.85).aspx)). 

You can see [some of the heuristics](https://github.com/dotnet/coreclr/blob/deb00ad58acf627763b6c0a7833fa789e3bb1cd0/src/jit/flowgraph.cpp#L7382-L7462) that the JIT uses to decide whether code is fully or partially interruptible as it seeks to find the best trade-off between code quality/size and GC suspension latency. But as a concrete example, if we take the following code that accumulates a counter in a tight loop:

``` csharp
public static long TestMethod()
{
    long counter = 0;
    for (int i = 0; i < 1000 * 1000; i++)
    {
        for (int j = 0; j < 2000; j++)
        {
            if (i % 10 == 0)
                counter++;
        }
    }
    Console.WriteLine("Loop exited, counter = {0:N0}", counter);
    return counter;
}
```

And then execute it with the [JIT diagnostics turned on](https://github.com/dotnet/coreclr/blob/master/Documentation/building/viewing-jit-dumps.md#useful-complus-variables) you get the following output, which shows that this code is classified as *fully interruptible*:

``` assembly
; Assembly listing for method ConsoleApplication.Program:TestMethod():long
; Emitting BLENDED_CODE for X64 CPU with AVX
; optimized code
; rsp based frame
; fully interruptible
```
([full JIT diagnostic output of **Fully** Interruptible method](https://gist.github.com/mattwarren/71adb255e4b35a92a060029aef4d1728#file-testmethod-fully-interruptible-md))

Now, if we run the same test again, but tweak the code by adding a few `Console.WriteLine(..)` methods calls:

``` csharp
public static long TestMethod()
{
    long counter = 0;
    for (int i = 0; i < 1000 * 1000; i++)
    {
        for (int j = 0; j < 2000; j++)
        {
            if (i % 10 == 0)
                counter++;
            Console.WriteLine("Inside Inner Loop, counter = {0:N0}", counter);
        }
        Console.WriteLine("After Inner Loop, counter = {0:N0}", counter);
    }
    Console.WriteLine("Thread loop exited cleanly, counter = {0:N0}", counter);
    return counter;
}
```

The method is then classified as *Partially Interruptible*:

``` assembly
; Assembly listing for method ConsoleApplication.Program:TestMethod():long
; Emitting BLENDED_CODE for X64 CPU with AVX
; optimized code
; rsp based frame
; partially interruptible
; Final local variable assignments
```
([full JIT diagnostic output of **Partially** Interruptible method](https://gist.github.com/mattwarren/06dd970b5364c80d445da4252558a5d3#file-testmethod-partially-interruptible-md))

Interesting enough there seems to be existing functionality in the .NET JIT, where it will insert `JIT_PollGC()` calls into **user** code, available via the [`GCPollType` CLR Configuration flag](https://github.com/dotnet/coreclr/blob/master/Documentation/project-docs/clr-configuration-knobs.md). However by default it's disabled and in my tests turning it on causes the CoreCLR to exit with some interesting errors. So it appears that currently, the default or supported behaviour is to use thread-suspension on user code, rather than inserting explicit `JIT_PollGC()` calls.

----

### Further Reading
- [Modern Garbage Collection in Theory and Practice](http://blogs.microsoft.co.il/sasha/2013/11/05/modern-garbage-collection-in-theory-and-practice/)
- [GC-safe points, mutator suspension and barriers](http://flyingfrogblog.blogspot.co.uk/2012/03/gc-safe-points-mutator-suspension-and.html)
- [How local variable usage infomation is maintained in .net clr source code](http://stackoverflow.com/questions/30416520/how-local-variable-usage-infomation-is-maintained-in-net-clr-source-code)
- [Thread.Suspend, Garbage Collection, and Safe Points](https://msdn.microsoft.com/en-us/library/678ysw69(v=vs.110).aspx)
- [LLVM as a code generator for the CoreCLR - With a particular emphasis on GC
](llvm.org/devmtg/2015-04/slides/LLILC_Euro_LLVM_2015.pptx)
- [Comments on "SuspendRuntime" and "Redirection vs. Hijacking:" in `threadsuspend.cpp`](https://github.com/dotnet/coreclr/blob/6f26329518b08055c090315eee5db533e42f39ae/src/vm/threadsuspend.cpp#L4784-L4822)
- [Comments on "Suspending The Runtime", "Cooperative Mode" and "Partially/Fully Interuptible Code" in `threads.h`](https://github.com/dotnet/coreclr/blob/6f26329518b08055c090315eee5db533e42f39ae/src/vm/threads.h#L36-L132)
- [What Every Developer Must Know About Fast Garbage Collection (+ more)](http://geekswithblogs.net/akraus1/archive/2014/03/24/155766.aspx)
- [Does the .NET Garbage Collector's stop-the-world effect halt or delay the execution of unmanaged threads and timer callbacks?](http://stackoverflow.com/questions/16655948/does-the-net-garbage-collectors-stop-the-world-effect-halt-or-delay-the-execut)
- [GC Behavior and CLR Thread Hijacking](http://stackoverflow.com/questions/8404245/gc-behavior-and-clr-thread-hijacking/8405187#8405187)
- [Safely pausing of thread during GC in .NET](http://stackoverflow.com/questions/4418356/safely-pausing-of-thread-during-gc-in-net/4418520#4418520)
- [CLR and Thread Safe Points](http://osdir.com/ml/windows.devel.dotnet.rotor/2002-08/msg00006.html)
 
