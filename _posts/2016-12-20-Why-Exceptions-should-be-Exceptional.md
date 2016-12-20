---
layout: post
title: Why Exceptions should be Exceptional
comments: true
tags: [.NET, CLR, Benchmarking, Internals]
---

![Meteor Hit on the Earth]({{ base }}/images/2016/12/Meteor-Hit-588072.jpg)

According to the [NASA 'Near Earth Object Program'](http://neo.jpl.nasa.gov/) asteroid ['*101955 Bennu (1999 RQ36)*'](http://neo.jpl.nasa.gov/risk/a101955.html) has a Cumulative Impact Probability of 3.7e-04, i.e. there is a **1 in 2,7000** (0.0370%) chance of Earth impact, but more reassuringly there is a 99.9630% chance the asteroid will miss the Earth completely!

But how does this relate to exceptions in the .NET runtime, well let's take a look at the official .NET [Framework Design Guidelines for Throwing Exceptions](https://msdn.microsoft.com/en-us/library/ms229030(v=vs.110).aspx) (which are based on the excellent book [Framework Design Guidelines: Conventions, Idioms, and Patterns for Reusable .NET Libraries](http://amzn.to/2hOOHsR))

![Framework Design Guidelines for Exceptions]({{ base }}/images/2016/12/Framework Design Guidelines for Exceptions.png)

**So exceptions should be exceptional, unusual or rare, much like a asteroid strike!!**

### .NET Framework TryXXX() Pattern

In .NET, the recommended was to avoid exceptions in normal code flow is to use the `TryXXX()` pattern. As pointed out in the guideline section on [Exceptions and Performance](https://msdn.microsoft.com/en-us/library/ms229009(v=vs.110).aspx), rather than writing code like this, which has to catch the exception when the input string isn't a valid integer:

``` csharp
try
{
    int result = int.Parse("IANAN");
    Console.WriteLine(result);
}
catch (FormatException fEx)
{
    Console.WriteLine(fEx);
}
```

You should instead use the `TryXXX` API, in the following pattern:

``` csharp
int result;
if (int.TryParse("IANAN", out result))
{
    // SUCCESS!!
    Console.WriteLine(result);
}
else
{
    // FAIL!!
}
```

Fortunately large parts of the .NET runtime use this pattern for non-exceptional events, such as parsing a string, creating a URL or adding an item to a Concurrent Dictionary.

## The performance costs of exceptions

So onto the performance costs, I was inspired to write this post after reading this tweet from [Clemens Vasters](https://twitter.com/clemensv):

[![Clemens Vasters tweet]({{ base }}/images/2016/12/Clemens Vasters tweet.png)](https://twitter.com/clemensv/status/722821904189362179)

I also copied/borrowed a large amount of ideas from the excellent post ['The Exceptional Performance of Lil' Exception'](https://shipilev.net/blog/2014/exceptional-performance/) by Java performance guru [Aleksey Shipilëv](https://twitter.com/shipilev) (this post is in essence the .NET version of his post, which focuses exclusively on exceptions in the JVM)

So lets start with the full results (click for full-size image):

[![Exception Benchmark Results]({{ base }}/images/2016/12/Exception Benchmark Results.png)]({{ base }}/images/2016/12/Exception Benchmark Results.png)

([Full Benchmark Code and Results](https://gist.github.com/mattwarren/e3cdd278ba9c2cad03cc6b53ce6d47f6))

### Rare exceptions v Error Code Handling

Up front I want to be clear that nothing in this post is meant to contradict the best-practices outlined in the .NET Framework Guidelines (above), in fact I hope that it actually backs them up!

|                        Method |            Mean |      StdErr |      StdDev |     Scaled |
|------------------------------ |----------------:|------------:|------------:|-----------:|
|      ErrorCodeWithReturnValue |       1.4472 ns |   0.0088 ns |   0.0341 ns |       1.00 |
|       RareExceptionStackTrace |      22.0401 ns |   0.0292 ns |   0.1132 ns |      15.24 |
| RareExceptionMediumStackTrace |      61.8835 ns |   0.0609 ns |   0.2279 ns |      42.78 |
|   RareExceptionDeepStackTrace |     115.3692 ns |   0.1795 ns |   0.6953 ns |      79.76 |

Here we can see that as long as you follow the guidance and 'DO NOT use exceptions for the normal flow of control' then they are actually not that costly. I mean yes, they're 15 times slower than using error codes, but we're only talking about 22 nanoseconds, i.e. 22 billionths of a second, you have to be throwing exceptions frequently for it to be noticeable. For reference, here's what the code for the first 2 results looks like:

``` csharp
public struct ResultAndErrorCode<T>
{
    public T Result;
    public int ErrorCode;
}

[Benchmark(Baseline = true)]
public ResultAndErrorCode<string> ErrorCodeWithReturnValue()
{
    var result = new ResultAndErrorCode<string>();
    result.Result = null;
    result.ErrorCode = 5;
    return result;
}

[Benchmark]
public string RareExceptionStackTrace()
{
    try
    {
        RareLevel20(); // start all the way down
        return null; //Prevent Error CS0161: not all code paths return a value

    }
    catch (InvalidOperationException ioex)
    {
        // Force collection of a full StackTrace
        return ioex.StackTrace;
    }
}
``` 

Where the 'RareLevelXX() functions look like this (i.e. will **only** trigger an exception once for every 2,700 times it's called):

``` csharp
[MethodImpl(MethodImplOptions.NoInlining)]
private static void RareLevel1() { RareLevel2(); }
[MethodImpl(MethodImplOptions.NoInlining)]
private static void RareLevel2() { RareLevel3(); }
... // several layers left out!!
[MethodImpl(MethodImplOptions.NoInlining)]
private static void RareLevel19() { RareLevel20(); }
[MethodImpl(MethodImplOptions.NoInlining)]
private static void RareLevel20()
{
    counter++;
    // will *rarely* happen (1 in 2700)
    if (counter % chanceOfAsteroidHit == 1) 
        throw new InvalidOperationException("Deep Stack Trace - Rarely triggered");            
}
```

Therefore `RareExceptionMediumStackTrace()` just calls `RareLevel10()` to get a medium stack trace and `RareExceptionDeepStackTrace()` calls `RareLevel1()` which triggers the full/deep one (the full [benchmark code is available](https://gist.github.com/mattwarren/e3cdd278ba9c2cad03cc6b53ce6d47f6)).

### Stack traces

Now that we've seen the cost of calling exceptions rarely, we're going to look at the effect the stack trace depth has on performance. Here are the full, raw results: 

{::nomarkdown}  
<span class="compactTable">
{:/}

|                         Method |            Mean |      StdErr |      StdDev |  Gen 0 | Allocated |
|------------------------------- |----------------:|------------:|------------:|-------:|----------:|
|              Exception-Message |   9,187.9417 ns |  13.4824 ns |  48.6117 ns |      - |     148 B |
|             Exception-TryCatch |   9,253.0215 ns |  13.2496 ns |  51.3154 ns |      - |     148 B |
|    Exception**Medium**-Message |  14,911.7999 ns |  20.2448 ns |  78.4078 ns |      - |     916 B |
|   Exception**Medium**-TryCatch |  15,158.0940 ns | 147.4210 ns | 737.1049 ns |      - |     916 B |
|      Exception**Deep**-Message |  19,166.3524 ns |  30.0539 ns | 116.3984 ns |      - |     916 B |
|     Exception**Deep**-TryCatch |  19,581.6743 ns | 208.3895 ns | 833.5579 ns |      - |     916 B |
|     CachedException-StackTrace |  29,354.9344 ns |  34.8932 ns | 135.1407 ns |      - |   1.82 kB |
|           Exception-StackTrace |  30,178.7152 ns |  41.0362 ns | 158.9327 ns |      - |   1.93 kB |
| Exception**Medium**-StackTrace | 100,121.7951 ns | 129.0631 ns | 499.8591 ns | 0.1953 |  15.71 kB |
|   Exception**Deep**-StackTrace | 154,569.3454 ns | 205.2174 ns | 794.8034 ns | 3.6133 |  27.42 kB |

{::nomarkdown}  
</span>
{:/}

**Note:** in these tests we are triggering an exception **every-time** a method is called, they aren't the rare cases that we measured previously.

#### **Exception handling without collecting the full StackTrace**

First we are going to look at the results measuring the scenario where we **don't** explicitly collect the `StackTrace` after the exception is caught, so the benchmark code looks like this:

``` csharp
[Benchmark]
public string ExceptionMessage()
{
    try
    {
        Level20(); // start *all* the way down the stack
        return null; //Prevent Error CS0161: not all code paths return a value
    }
    catch (InvalidOperationException ioex)
    {
        // Only get the simple message from the Exception 
        // (don't trigger a StackTrace collection)
        return ioex.Message;
    }
}
```

In the following graphs, **shallow** stack traces are in <font color="#5B9BD5" style="font-weight: bold;">blue bars</font>, **medium** in <font color="#ED7D31" style="font-weight: bold;">orange</font> and **deep** stacks are shown in <font color="#70AD47" style="font-weight: bold;">green</font>

[![Exception Handling - NOT Calculating StackTrace]({{ base }}/images/2016/12/Exception Handling - NOT Calculating StackTrace.png)]({{ base }}/images/2016/12/Exception Handling - NOT Calculating StackTrace.png)

So we clearly see there is an extra cost for exception handling that increases the deeper the stack trace goes. This is because when an exception is thrown the runtime needs to search up the stack until it hits a method than can handle it. The further it has to look up the stack, the more work it has to do.

#### **Exception handling including collection of the full StackTrace**

Now for the final results, in which we **explicitly ask** the run-time to (lazily) fetch the full stack trace, by accessing the `StackTrace` property. The code looks like this:

``` csharp
[Benchmark]
public string ExceptionStackTrace()
{
    try
    {
        Level20(); // start *all* the way down the stack
        return null; //Prevent Error CS0161: not all code paths return a value
    }
    catch (InvalidOperationException ioex)
    {
        // Force collection of a full StackTrace
        return ioex.StackTrace;
    }
}
```

[![Exception Handling - Calculating StackTrace]({{ base }}/images/2016/12/Exception Handling - Calculating StackTrace.png)]({{ base }}/images/2016/12/Exception Handling - Calculating StackTrace.png)

Finally we see that fetching the entire stack trace (via `StackTrace`) dominates the performance of just handling the exception (ie. only accessing the exception message). But again, the deeper the stack trace, the higher the cost.

So thanks goodness we're in the .NET world, where huge stack traces are rare. Over in [Java-land they have to deal with nonesense like this](https://ptrthomas.wordpress.com/2006/06/06/java-call-stack-from-http-upto-jdbc-as-a-picture/) (click to see the full-res version!!):

[![Huge Java Stack Trace]({{ base }}/images/2016/12/Huge Java Stack Trace - smaller.png)]({{ base }}/images/2016/12/Huge Java Stack Trace.png)

----

## Conclusion 

1. **Rare or Exceptional exceptions are not hugely expensive** and they should **always** be the preferred way of error handling in .NET
2. If you have code that is **expected to fail often** (such as parsing a string into an integer), use the `TryXXX()` pattern
3. **The deeper the stack trace, the more work that has to be done**, so the more overhead there is when catching/handling exceptions
4. This is even more true if you are also fetching the entire stack trace, via the `StackTrace` property. **So if you don't need it, don't fetch it.**

Discuss this post in [/r/programming](https://www.reddit.com/r/programming/comments/5jdosy/why_exceptions_should_be_exceptional/) and [/r/csharp](https://www.reddit.com/r/csharp/comments/5je0o3/why_exceptions_should_be_exceptional/)

----

### Further Reading

### The stack trace of a StackTrace!!

The full call-stack that the CLR goes through when fetching the data for the Exception `StackTrace` property

- [Exception - public virtual String StackTrace](https://referencesource.microsoft.com/#mscorlib/system/exception.cs,950d763693dd32d3)
- [Exception - private string GetStackTrace(..)](https://referencesource.microsoft.com/#mscorlib/system/exception.cs,fd7466f7c15d31c7)
- [Environment - internal static String GetStackTrace(..)](https://referencesource.microsoft.com/#mscorlib/system/environment.cs,40b558dbbbc4b07a)
- [Diagnostics - public StackTrace(..)](https://referencesource.microsoft.com/#mscorlib/system/diagnostics/stacktrace.cs,15f43636ec9ec56f)
- [Diagnostics - private void CaptureStackTrace(..)](https://referencesource.microsoft.com/#mscorlib/system/diagnostics/stacktrace.cs,2938a79cef33dc28)
- [Diagnostics - internal static extern void GetStackFramesInternal(..)](https://referencesource.microsoft.com/#mscorlib/system/diagnostics/stacktrace.cs,3a7c9de344634c84)
- [debugdebugger - DebugStackTrace::GetStackFramesInternal(..)](https://github.com/dotnet/coreclr/blob/32d03bb66a51c7ed6712c4cdd319de0cc7cbbf37/src/vm/debugdebugger.cpp#L391-L868) (c/c++)
- [debugdebugger - DebugStackTrace::GetStackFramesFromException(..)](https://github.com/dotnet/coreclr/blob/32d03bb66a51c7ed6712c4cdd319de0cc7cbbf37/src/vm/debugdebugger.cpp#L1185-L1289) (c/c++)

