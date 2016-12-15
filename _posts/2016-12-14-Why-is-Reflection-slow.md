---
layout: post
title: Why is reflection slow?
comments: true
tags: [.NET, CLR, Benchmarking, Internals]
---

It's common knowledge that [reflection in .NET is slow](http://stackoverflow.com/search?q=reflection+slow), but why is that the case? This post aims to figure that out by looking at what reflection does *under-the-hood*.

### CLR Type System Design Goals

But first it's worth pointing out that part of the reason reflection isn't fast is that it was never designed to have *high-performance* as one of its goals, from [Type System Overview - 'Design Goals and Non-goals'](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/Documentation/botr/type-system.md#design-goals-and-non-goals):

> **Goals**
> 
> - **Accessing information needed at runtime from executing (non-reflection) code is very fast.**
- Accessing information needed at compilation time for generating code is straightforward.
- The garbage collector/stackwalker is able to access necessary information without taking locks, or allocating memory.
- Minimal amounts of types are loaded at a time.
- Minimal amounts of a given type are loaded at type load time.
- Type system data structures must be storable in NGEN images.

> **Non-Goals**
> 
> - All information in the metadata is directly reflected in the CLR data structures.
- **All uses of reflection are fast.**

and along the same lines, from [Type Loader Design - 'Key Data Structures'](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/Documentation/botr/type-loader.md#key-data-structures):

> **EEClass**
> 
> MethodTable data are split into "hot" and "cold" structures to improve working set and cache utilization. MethodTable itself is meant to only store "hot" data that are needed in program steady state. **EEClass stores "cold" data that are typically only needed by type loading, JITing or reflection.** Each MethodTable points to one EEClass.

## How does Reflection work?

**So we know that ensuring reflection was fast was not a design goal, but what is it doing that takes the extra time?**

Well there several things that are happening, to illustrate this lets look at the managed and unmanaged code call-stack that a reflection call goes through.

- **System.Reflection.RuntimeMethodInfo.Invoke**(..) - [source code link](https://github.com/dotnet/coreclr/blob/b638af3a4dd52fa7b1ea1958164136c72096c25c/src/mscorlib/src/System/Reflection/MethodInfo.cs#L619-L638)
  - calling **System.Reflection.RuntimeMethodInfo.UnsafeInvokeInternal**(..)
- **System.RuntimeMethodHandle.PerformSecurityCheck**(..) - [link](https://github.com/dotnet/coreclr/blob/e67851210d1c03d730a3bc97a87e8a6713bbf772/src/vm/reflectioninvocation.cpp#L949-L974)
  -  calling **System.GC.KeepAlive**(..)
- **System.Reflection.RuntimeMethodInfo.UnsafeInvokeInternal**(..) - [link](https://github.com/dotnet/coreclr/blob/b638af3a4dd52fa7b1ea1958164136c72096c25c/src/mscorlib/src/System/Reflection/MethodInfo.cs#L651-L665) 
  - calling stub for **System.RuntimeMethodHandle.InvokeMethod**(..)
- stub for **System.RuntimeMethodHandle.InvokeMethod**(..) - [link](https://github.com/dotnet/coreclr/blob/e67851210d1c03d730a3bc97a87e8a6713bbf772/src/vm/reflectioninvocation.cpp#L1322-L1732)

Even if you don't click the links and look at the individual C#/cpp methods, you can intuitively tell that there's *alot* of code being executed along the way. But to give you an example, the final method, where the bulk of the work is done, [`System.RuntimeMethodHandle.InvokeMethod` is over 400 LOC](https://github.com/dotnet/coreclr/blob/e67851210d1c03d730a3bc97a87e8a6713bbf772/src/vm/reflectioninvocation.cpp#L1322-L1732)! 

**But this is a nice overview, however what is it *specifically* doing?**

### Fetching the Method information

Before you can invoke a field/property/method via reflection you have to get the `FieldInfo/PropertyInfo/MethodInfo` handle for it, using code like this:

``` csharp
Type t = typeof(Person);      
FieldInfo m = t.GetField("Name");
```

As shown in the previous section there's a cost to this, because the relevant meta-data has to be fetched, parsed, etc. Interestingly enough the runtime helps us by keeping an internal cache of all the fields/properties/methods. This cache is implemented by the [`RuntimeTypeCache` class](https://github.com/dotnet/coreclr/blob/b638af3a4dd52fa7b1ea1958164136c72096c25c/src/mscorlib/src/System/RtType.cs#L178-L248) and one example of its usage is in the [`RuntimeMethodInfo` class](https://github.com/dotnet/coreclr/blob/b638af3a4dd52fa7b1ea1958164136c72096c25c/src/mscorlib/src/System/Reflection/MethodInfo.cs#L95).

You can see the cache in action by running the code in [this gist](https://gist.github.com/mattwarren/be21d80a016043ea5c462415b81d9b69), which appropriately enough uses reflection to inspect the runtime internals! 

Before you have done any reflection to obtain a `FieldInfo`, the code in the gist will print this:

```
  Type: ReflectionOverhead.Program
  Reflection Type: System.RuntimeType (BaseType: System.Reflection.TypeInfo)
  m_fieldInfoCache is null, cache has not been initialised yet
```

But once you've fetched even just one field, then the following will be printed:

```
  Type: ReflectionOverhead.Program
  Reflection Type: System.RuntimeType (BaseType: System.Reflection.TypeInfo)
  RuntimeTypeCache: System.RuntimeType+RuntimeTypeCache, 
  m_cacheComplete = True, 4 items in cache
    [0] - Int32 TestField1 - Private
    [1] - System.String TestField2 - Private
    [2] - Int32 <TestProperty1>k__BackingField - Private
    [3] - System.String TestField3 - Private, Static
```

where `ReflectionOverhead.Program` looks like this:

``` csharp
class Program
{
    private int TestField1;
    private string TestField2;
    private static string TestField3;

    private int TestProperty1 { get; set; }
}
```

This means that repeated calls to `GetField` or `GetFields` are cheaper as the runtime only has to filter the pre-existing list that's already been created. The same applies to `GetMethod` and `GetProperty`, when you call them the first time the `MethodInfo` or `PropertyInfo` cache is built.

### Argument Validation and Error Handling

But once you've obtained the `MethodInfo`, there's still a lot of work to be done when you call `Invoke` on it. Imagine you wrote some code like this:

``` csharp
PropertyInfo stringLengthField = 
    typeof(string).GetProperty("Length", 
        BindingFlags.Instance | BindingFlags.Public);
var length = stringLengthField.GetGetMethod().Invoke(new Uri(), new object[0]);
```

If you run it you would get the following exception:

```
System.Reflection.TargetException: Object does not match target type.
   at System.Reflection.RuntimeMethodInfo.CheckConsistency(..)
   at System.Reflection.RuntimeMethodInfo.InvokeArgumentsCheck(..)
   at System.Reflection.RuntimeMethodInfo.Invoke(..)
   at System.Reflection.RuntimePropertyInfo.GetValue(..)
```

This is because we have obtained the `PropertyInfo` for the `Length` property on the `String` class, but invoked it with an `Uri` object, which is clearly the wrong type!

In addition to this, there also has to be validation of any arguments you pass through to the method you are invoking. To make argument passing work, reflection APIs take a parameter that is an array of `object`'s, one per argument. So if you using reflection to call the method `Add(int x, int y)`, you would invoke it by calling `methodInfo.Invoke(.., new [] { 5, 6 })`. At run-time checks need to be carried out on the amount and types of the values passed in, in this case to ensure that there are 2 and that they are both `int`'s. One down-side of all this work is that it often involves *boxing* which has an additional cost, but hopefully this will be [minimised in the future](https://github.com/dotnet/corefx/issues/14021).

### Security Checks

The other main task that is happening along the way is multiple security checks. For instance, it turns out that you aren't allowed to use reflection to call just any method you feel like. There are some restricted or ['Dangerous Methods'](https://github.com/dotnet/coreclr/blob/32f0f9721afb584b4a14d69135bea7ddc129f755/src/vm/dangerousapis.h#L7-L13), that can only be called by trusted .NET framework code. In addition to a black-list, there are also dynamic security checks depending on the current [Code Access Security permissions](https://msdn.microsoft.com/en-us/library/33tceax8(v=vs.110).aspx) that have to be [checked during invocation](https://github.com/dotnet/coreclr/blob/e67851210d1c03d730a3bc97a87e8a6713bbf772/src/vm/reflectioninvocation.cpp#L880-L947).

----

## How much does Reflection cost?

So now that we know what reflection is doing *behind-the-scenes*, it's a good time to look at what it costs us. Please note that these benchmarks are comparing reading/writing a property directly v via reflection. In .NET properties are actually a pair of `Get/Set` methods that [the compiler generates for us](http://stackoverflow.com/questions/23102639/are-c-sharp-properties-actually-methods/23102679#23102679), however when the property has just a simple backing field the .NET JIT inlines the method call for performance reasons. This means that using reflection to access a property will show reflection in the worse possible light, but it was chosen as it's the most common use-case, showing up in [ORMs](https://github.com/StackExchange/dapper-dot-net), [Json serialisation/deserialisation libraries](http://www.newtonsoft.com/json) and [object mapping tools](http://automapper.org/).

Below are the raw results as they are displayed by [BenchmarkDotNet](http://benchmarkdotnet.org/), followed by the same results displayed in 2 separate tables. (full [Benchmark code is available](https://gist.github.com/mattwarren/a8ae31a197f4716a9d65947f4a20a069)) 

[![Reflection Benchmark Results]({{ base }}/images/2016/12/Reflection Benchmark Results.png)]({{ base }}/images/2016/12/Reflection Benchmark Results.png)

### Reading a Property ('Get')

|                       Method |        Mean |    StdErr |   Scaled | Bytes Allocated/Op |
|----------------------------- |------------:|----------:|---------:|-------------------:|
|               GetViaProperty |   0.2159 ns | 0.0047 ns |     1.00 |               0.00 |
                GetViaDelegate |   1.8903 ns | 0.0082 ns |     8.82 |               0.00 |
                  GetViaILEmit |   2.9236 ns | 0.0067 ns |    13.64 |               0.00 |
 GetViaCompiledExpressionTrees |  12.3623 ns | 0.0200 ns |    57.65 |               0.00 |
              GetViaFastMember |  35.9199 ns | 0.0528 ns |   167.52 |               0.00 |
   GetViaReflectionWithCaching | 125.3878 ns | 0.2017 ns |   584.78 |               0.00 |
              GetViaReflection | 197.9258 ns | 0.2704 ns |   923.08 |               0.01 |
   GetViaDelegateDynamicInvoke | 842.9131 ns | 1.2649 ns | 3,931.17 |             419.04 |

### Writing a Property ('Set')

|                       Method |        Mean |    StdErr |   Scaled | Bytes Allocated/Op |
|----------------------------- |------------:|----------:|---------:|-------------------:|
                SetViaProperty |   1.4043 ns | 0.0200 ns |     6.55 |               0.00 |
                SetViaDelegate |   2.8215 ns | 0.0078 ns |    13.16 |               0.00 |
                  SetViaILEmit |   2.8226 ns | 0.0061 ns |    13.16 |               0.00 |
 SetViaCompiledExpressionTrees |  10.7329 ns | 0.0221 ns |    50.06 |               0.00 |
              SetViaFastMember |  36.6210 ns | 0.0393 ns |   170.79 |               0.00 |
   SetViaReflectionWithCaching | 214.4321 ns | 0.3122 ns | 1,000.07 |              98.49 |
              SetViaReflection | 287.1039 ns | 0.3288 ns | 1,338.99 |             115.63 |
   SetViaDelegateDynamicInvoke | 922.4618 ns | 2.9192 ns | 4,302.17 |             390.99 |

So we can clearly see that regular reflection code (`GetViaReflection` and `SetViaReflection`) is considerably slower than accessing the property directly (`GetViaProperty` and `SetViaProperty`). But what about the other results, lets explore those in more detail.


### Setup

First we start with a `TestClass` that looks like this:

``` csharp
public class TestClass
{
    public TestClass(String data)
    {
        Data = data;
    }

    private string data;
    private string Data
    {
        get { return data; }
        set { data = value; }
    }
}
```

and the following common code, that all the options can make use of:

``` csharp
// Setup code, done only once 
TestClass testClass = new TestClass("A String");
Type @class = testClass.GetType();
BindingFlag bindingFlags = BindingFlags.Instance | 
                           BindingFlags.NonPublic | 
                           BindingFlags.Public;
```

### Regular Reflection

First we use regular benchmark code, that acts as out starting point and the 'worst case': 

``` csharp
[Benchmark]
public string GetViaReflection()
{
    PropertyInfo property = @class.GetProperty("Data", bindingFlags);
    return (string)property.GetValue(testClass, null);
}
```

### Option 1 - Cache PropertyInfo

Next up, we can gain a small speed boost by keeping a reference to the `PropertyInfo`, rather than fetching it each time. But we're still much slower than accessing the property directly, which demonstrates that there is a considerable cost in the 'invocation' part of reflection.

``` csharp
// Setup code, done only once
PropertyInfo cachedPropertyInfo = @class.GetProperty("Data", bindingFlags);

[Benchmark]
public string GetViaReflection()
{    
    return (string)cachedPropertyInfo.GetValue(testClass, null);
}
```

### Option 2 - Use FastMember

Here we make use of Marc Gravell's excellent [Fast Member library](http://blog.marcgravell.com/2012/01/playing-with-your-member.html), which as you can see is very simple to use! 

``` csharp
// Setup code, done only once
TypeAccessor accessor = TypeAccessor.Create(@class, allowNonPublicAccessors: true);

[Benchmark]
public string GetViaFastMember()
{
    return (string)accessor[testClass, "Data"];
}
```

Note that it's doing something slightly different to the other options. It creates a `TypeAccessor` that allows access to **all** the Properties on a type, not just one. But the downside is that, as a result, it takes longer to run. This is because internally it first has to get the `delegate` for the Property you requested (in this case 'Data'), before fetching it's value. However this overhead is pretty small, FastMember is still way faster than Reflection and it's very easy to use, so I recommend you take a look at it first.

This option and all subsequent ones convert the reflection code into a [`delegate`](https://msdn.microsoft.com/en-us/library/ms173171.aspx) that can be directly invoked without the overhead of reflection every time, hence the speed boost! 

Although it's worth pointing out that the creation of a `delegate` has a cost (see ['Further Reading'](#further-reading) for more info). So in short, the speed boost is because we are doing the expensive work once (security checks, etc) and storing a strongly typed `delegate` that we can use again and again with little overhead. You wouldn't use these techniques if you were doing reflection once, but if you're only doing it once it wouldn't be a performance bottleneck, so you wouldn't care if it was slow!

The reason that reading a property via a `delegate` isn't as fast as reading it directly is because the .NET JIT won't inline a `delegate` method call like it will do with a Property access. So with a `delegate` we have to pay the cost of a method call, which direct access doesn't.

### Option 3 - Create a Delegate

In this option we use the `CreateDelegate` function to turn our PropertyInfo into a regular `delegate`:

``` csharp
// Setup code, done only once
PropertyInfo property = @class.GetProperty("Data", bindingFlags);
Func<TestClass, string> getDelegate = 
    (Func<TestClass, string>)Delegate.CreateDelegate(
             typeof(Func<TestClass, string>), 
             property.GetGetMethod(nonPublic: true));

[Benchmark]
public string GetViaDelegate()
{
    return getDelegate(testClass);
}

```

The drawback is that you to need to know the concrete type at **compile-time**, i.e. the `Func<TestClass, string>` part in the code above (no you can't use `Func<object, string>`, if you do it'll thrown an exception!). In the majority of situations when you are doing reflection you don't have this luxury, otherwise you wouldn't be using reflection in the first place, so it's not a complete solution.

For a very interesting/mind-bending way to get round this, see the `MagicMethodHelper` code in the fantastic blog post from Jon Skeet ['Making Reflection fly and exploring delegates'](https://codeblog.jonskeet.uk/2008/08/09/making-reflection-fly-and-exploring-delegates/) or read on for Options 4 or 5 below. 

### Option 4 - Compiled Expression Trees

Here we generate a `delegate`, but the difference is that we can pass in an `object`, so we get round the limitation of 'Option 4'. We make use of the .NET [`Expression` tree API](https://msdn.microsoft.com/en-us/library/mt654263.aspx) that allows dynamic code generation:

``` csharp
// Setup code, done only once
PropertyInfo property = @class.GetProperty("Data", bindingFlags);
ParameterExpression = Expression.Parameter(typeof(object), "instance");
UnaryExpression instanceCast = 
    !property.DeclaringType.IsValueType ? 
        Expression.TypeAs(instance, property.DeclaringType) : 
        Expression.Convert(instance, property.DeclaringType);
Func<object, object> GetDelegate = 
    Expression.Lambda<Func<object, object>>(
        Expression.TypeAs(
            Expression.Call(instanceCast, property.GetGetMethod(nonPublic: true)),
            typeof(object)), 
        instance)
    .Compile();

[Benchmark]
public string GetViaCompiledExpressionTrees()
{
    return (string)GetDelegate(testClass);
}
```

Full code for the `Expression` based approach is available in the blog post [Faster Reflection using Expression Trees](http://geekswithblogs.net/Madman/archive/2008/06/27/faster-reflection-using-expression-trees.aspx)

### Option 5 - Dynamic code-gen with IL Emit

Finally we come to the lowest-level approach, emiting raw IL, although '*with great power, comes great responsibility*':

``` csharp
// Setup code, done only once
PropertyInfo property = @class.GetProperty("Data", bindingFlags);
Sigil.Emit getterEmiter = Emit<Func<object, string>>
    .NewDynamicMethod("GetTestClassDataProperty")
    .LoadArgument(0)
    .CastClass(@class)
    .Call(property.GetGetMethod(nonPublic: true))
    .Return();
Func<object, string> getter = getterEmiter.CreateDelegate();

[Benchmark]
public string GetViaILEmit()
{
    return getter(testClass);
}
```

Using `Expression` tress (as shown in Option 4), doesn't give you as much flexibility as emitting IL codes directly, although it does prevent you from emitting invalid code! Because of this, if you ever find yourself needing to emil IL I really recommend using the excellent [Sigil library](https://github.com/kevin-montrose/Sigil), as it gives better error messages when you get things wrong! 

----

## Conclusion 

The take-away is that if (and only if) you find yourself with a performance issue when using reflection, there are several different ways you can make it faster. These speed gains are achieved by getting a `delegate` that allows you to access the Property/Field/Method directly, without all the overhead of going via reflection every-time.

Discuss this post in [/r/programming](https://www.reddit.com/r/programming/comments/5ie775/why_is_reflection_slow/)

----

### Further Reading

- [Is Reflection really slow?](http://stackoverflow.com/questions/8846948/is-reflection-really-slow/8849503#8849503)
- [Why is reflection slow?](http://stackoverflow.com/questions/3502674/why-is-reflection-slow/3502710#3502710)
- [How costly is .NET reflection?](http://stackoverflow.com/questions/25458/how-costly-is-net-reflection)
- [How slow is Reflection](http://stackoverflow.com/questions/771524/how-slow-is-reflection/771533#771533)
- [Reflection: Is using reflection still “bad” or “slow”? What has changed with reflection since 2002?](http://softwareengineering.stackexchange.com/questions/143205/reflection-is-using-reflection-still-bad-or-slow-what-has-changed-with-ref)
- [Improving Reflection Performance with Delegates](https://jeremybytes.blogspot.co.uk/2014/01/improving-reflection-performance-with.html)
- [C#.Net Calling Grandparent's Virtual Method (base.base in C#)](http://kennethxu.blogspot.co.uk/2009/05/cnet-calling-grandparent-virtual-method.html) - [Part I](http://kennethxu.blogspot.co.uk/2009/05/strong-typed-high-performance.html), [Part II](http://kennethxu.blogspot.co.uk/2009/05/strong-typed-high-performance_15.html), [Part III](http://kennethxu.blogspot.co.uk/2009/05/strong-typed-high-performance_18.html)
- ['Making Reflection fly and exploring delegates'](https://codeblog.jonskeet.uk/2008/08/09/making-reflection-fly-and-exploring-delegates/)
- [Fasterflect vs HyperDescriptor vs FastMember vs Reflection](http://theburningmonk.com/2015/08/fasterflect-vs-hyperdescriptor-vs-fastmember-vs-reflection/)

For reference, below is the call-stack or code-flow that the runtime goes through when **Creating a Delegate**

1. [`Delegate CreateDelegate(Type type, MethodInfo method)`](https://referencesource.microsoft.com/#mscorlib/system/delegate.cs,0b7fb52ec60c22d3)
2. [`Delegate CreateDelegate(Type type, MethodInfo method, bool throwOnBindFailure)`](https://referencesource.microsoft.com/#mscorlib/system/delegate.cs,944d5aaf940d71d0)
3. [`Delegate CreateDelegateInternal(RuntimeType rtType, RuntimeMethodInfo rtMethod, Object firstArgument, DelegateBindingFlags flags, ref StackCrawlMark stackMark)`](https://referencesource.microsoft.com/#mscorlib/system/delegate.cs,2a6608b61df78396)
4. [`Delegate UnsafeCreateDelegate(RuntimeType rtType, RuntimeMethodInfo rtMethod, Object firstArgument, DelegateBindingFlags flags)`](https://referencesource.microsoft.com/#mscorlib/system/delegate.cs,432a6c045c0ce48d)
5. [`bool BindToMethodInfo(Object target, IRuntimeMethodInfo method, RuntimeType methodType, DelegateBindingFlags flags);`](https://referencesource.microsoft.com/#mscorlib/system/delegate.cs,06743cb3121175c1)
6. [`FCIMPL5(FC_BOOL_RET, COMDelegate::BindToMethodInfo, Object* refThisUNSAFE, Object* targetUNSAFE, ReflectMethodObject *pMethodUNSAFE, ReflectClassBaseObject *pMethodTypeUNSAFE, int flags)`](https://github.com/dotnet/coreclr/blob/7200e78258623eb889a46aa7a90818046bd1957d/src/vm/comdelegate.cpp#L802-L879)
7. [`COMDelegate::BindToMethod(DELEGATEREF *pRefThis, OBJECTREF *pRefFirstArg, MethodDesc *pTargetMethod, MethodTable *pExactMethodType, BOOL fIsOpenDelegate, BOOL fCheckSecurity)`](https://github.com/dotnet/coreclr/blob/7200e78258623eb889a46aa7a90818046bd1957d/src/vm/comdelegate.cpp#L885-L1099)