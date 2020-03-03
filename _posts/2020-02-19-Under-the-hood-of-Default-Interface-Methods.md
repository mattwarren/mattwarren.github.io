---
layout: post
title: Under the hood of "Default Interface Methods"
comments: true
tags: [CLR, .NET, Internals]
codeproject: false
excerpt: <p>'Default Implementations in Interfaces', sometimes referred to as just 'Default Interface Methods' (DIM) appeared in C# 8. In case you've never heard of the feature, here's some links to get you started:</p>
---

## Background

'Default Interface Methods' (DIM) sometimes referred to as 'Default Implementations in Interfaces', appeared in C# 8. In case you've never heard of the feature, here's some links to get you started:

- [Default implementations in interfaces](https://devblogs.microsoft.com/dotnet/default-implementations-in-interfaces/) (official *announcement*)
- [Default Interface Methods](https://docs.microsoft.com/en-us/dotnet/csharp/language-reference/proposals/csharp-8.0/default-interface-methods) (C# Language Proposal), here's some notable sections:
  - [Diamond inheritance and classes](https://docs.microsoft.com/en-us/dotnet/csharp/language-reference/proposals/csharp-8.0/default-interface-methods#diamond-inheritance-and-classes-closed)
  - [Interface methods vs structs](https://docs.microsoft.com/en-us/dotnet/csharp/language-reference/proposals/csharp-8.0/default-interface-methods#interface-methods-vs-structs-closed)
  - [Structs and default implementations](https://github.com/dotnet/csharplang/blob/master/meetings/2017/LDM-2017-04-19.md#structs-and-default-implementations)
- [Champion "default interface methods"](https://github.com/dotnet/csharplang/issues/52) (including links for 'Language Design Meeting' notes)
- [Tutorial: Update interfaces with default interface methods in C# 8.0](https://docs.microsoft.com/en-gb/dotnet/csharp/tutorials/default-interface-methods-versions)

Also, there are quite a few other blogs posts discussing this feature, but as you can see opinion is split on whether it's useful or not:

- [Default Interface Methods in C# 8](https://www.infoq.com/articles/default-interface-methods-cs8/)
- [C# 8: Default Interface Methods Implementation](https://www.codejourney.net/2019/02/csharp-8-default-interface-methods/)
- [Default Interface Members, What Are They Good For?](https://daveaglick.com/posts/default-interface-members-what-are-they-good-for)
- [C# 8: Default implementations in interfaces](https://gunnarpeipman.com/csharp-interface-default-implementations/)
- [Interfaces in C# 8.0 gets a makeover](https://www.talkingdotnet.com/default-implementations-in-interfaces-in-c-sharp-8/)
- [C# 8.0 and .NET Standard 2.0 - Doing Unsupported Things](https://stu.dev/csharp8-doing-unsupported-things/#default-interface-members)
- [Interfaces in C# 8 are a Bit of a Mess](https://jeremybytes.blogspot.com/2019/09/interfaces-in-c-8-are-bit-of-mess.html)
- [The most controversial C# 8.0 feature: Default Interface Methods Implementation (Reddit discussion)](https://www.reddit.com/r/dotnet/comments/asq3jl/the_most_controversial_c_80_feature_default/)

----

But this post isn't about what they are, how you can use them or if they're useful or not. Instead we will be exploring how 'Default Interface Methods' work *under-the-hood*, looking at what the .NET Core Runtime has to do to make them work and how the feature was developed.

----

**Table of Contents**

- [Background](#background)
- [Development Timeline and PRs](#development-timeline-and-prs)
  - [Initial work, Prototype and Timeline](#initial-work-prototype-and-timeline)
  - [Interesting PR's done after the prototype (newest -> oldest)](#interesting-prs-done-after-the-prototype-newest---oldest)
  - [Bug fixes done since the Prototype (newest -> oldest)](#bug-fixes-done-since-the-prototype-newest---oldest)
  - [*Possible* future work](#possible-future-work)
- [Default Interface Methods 'in action'](#default-interface-methods-in-action)
- [Enabling Methods on an Interface](#enabling-methods-on-an-interface)
- [Resolving the Method Dispatch](#resolving-the-method-dispatch)
- [Analysis of `FindDefaultInterfaceImplementation(..)`](#analysis-of-finddefaultinterfaceimplementation)
- [Diamond Inheritance Problem](#diamond-inheritance-problem)
- [Summary](#summary)

----

## Development Timeline and PRs

First of all, there are a few places you can go to get a 'high-level' understanding of what was done:

- [GitHub Project for Default Interface Methods](https://github.com/dotnet/coreclr/projects/6)
- List of [all the PRs done during the Project](https://github.com/dotnet/coreclr/pulls?q=is%3Aclosed+is%3Apr+project%3Adotnet%2Fcoreclr%2F6+sort%3Acreated-asc)
- To see which parts of the runtime are affected, you can [search for 'FEATURE_DEFAULT_INTERFACES'](https://github.com/dotnet/runtime/search?q=FEATURE_DEFAULT_INTERFACES) in the .NET (Core) Runtime source code as the entire feature is behind a #define.
- In addition, you can see the corresponding work being done in Mono, [Epic: Default Interface Implementation #6961](https://github.com/mono/mono/issues/6961) and [Update default interfaces support #11267](https://github.com/mono/mono/issues/11267)

### Initial work, Prototype and Timeline

- The entire prototype is split across several PRs, running from **March - July 2017**:
  - [Default Interface Method Prototype #10505](https://github.com/dotnet/coreclr/pull/10505)
  - [More update for default interface methods #10818](https://github.com/dotnet/coreclr/pull/10818)
  - [More update in /dev/defaultintf #11693](https://github.com/dotnet/coreclr/pull/11693)
  - [Add RuntimeFeature detection for default interface method #11940](https://github.com/dotnet/coreclr/pull/11940)
  - [Finalize override lookup algorithm #12753](https://github.com/dotnet/coreclr/pull/12753)
- All the initial work was merged into master in **December 2017** in [Merge dev/defaultintf to master #15370](https://github.com/dotnet/coreclr/pull/15370)
- The entire feature was turned on by default in **March 2019** in [Enable FeatureDefaultInterfaces unconditionally #23225](https://github.com/dotnet/coreclr/pull/23225)
- It was then [announced/released](https://devblogs.microsoft.com/dotnet/default-implementations-in-interfaces/) in **May 2019**.

### Interesting PR's done after the prototype (newest -> oldest)

Once the prototype was merged in, there was additional *feature* work done to ensure that DIM's worked across different scenarios:

- [Use native code slot for default interface methods #25770](https://github.com/dotnet/coreclr/pull/25770)
- [Allow reabstraction of default interface methods #23313](https://github.com/dotnet/coreclr/pull/23313)
- [Throw the right exception when interface dispatch is ambiguous #22295](https://github.com/dotnet/coreclr/pull/22295)
- [Implement two pass algorithm for variant interface dispatch #21355](https://github.com/dotnet/coreclr/pull/21355)
- [Make it possible to Reflection.Emit default interface methods #16257](https://github.com/dotnet/coreclr/pull/16257)
- [Fix reflection to work with default interface methods #16034](https://github.com/dotnet/coreclr/pull/16034)
- [Stop treating all calls to instance interface methods as callvirt #15925](https://github.com/dotnet/coreclr/pull/15925)
- [[Default Interfaces] Edit and Continue #9601](https://github.com/dotnet/runtime/issues/9601)

### Bug fixes done since the Prototype (newest -> oldest)

In addition, there were various bugs fixes done to ensure that existing parts of the CLR played nicely with DIMs:

- [Block usage of default interfaces feature in COM scenarios #23970](https://github.com/dotnet/coreclr/pull/23970)
- [Remove legacy behavior around non-virtual interface calls #23032](https://github.com/dotnet/coreclr/pull/23032)
- [Fix constrained call corner cases #22464](https://github.com/dotnet/coreclr/pull/22464)
- [Fix delegate creation for default interface methods on structs #22427](https://github.com/dotnet/coreclr/pull/22427)
- [Fix stack walking and reporting of default interface methods #21525](https://github.com/dotnet/coreclr/pull/21525)
- [Allow supressing exceptions in diamond inheritance cases #20458](https://github.com/dotnet/coreclr/pull/20458)
- [Handle generics in methodimpls for default interface methods #20404](https://github.com/dotnet/coreclr/pull/20404)
- [Do not devirtualize shared default interface methods #15979](https://github.com/dotnet/coreclr/pull/15979)
- [Catch ambiguous interface method resolution exceptions #15978](https://github.com/dotnet/coreclr/pull/15978)
  
### *Possible* future work

Finally, there's no guarantee if or when this will be done, but here are the remaining issues associated with the project:

- [Support for default interface method devirtualization #9588](https://github.com/dotnet/runtime/issues/9588)
- [Debugger support #9556](https://github.com/dotnet/runtime/issues/9556)
- [Interfaces implemented by arrays #9552](https://github.com/dotnet/runtime/issues/9552)
- [Support constrained interface calls on value types #9490](https://github.com/dotnet/runtime/issues/9490)
- [Add support for default interfaces in type generator #9479](https://github.com/dotnet/runtime/issues/9479)

----

## Default Interface Methods 'in action'

Now that we've seen what was done, let's look at what that all means, starting with this code that simply demonstrates 'Default Interface Methods' in action:

``` csharp
interface INormal {
    void Normal();
}

interface IDefaultMethod {
    void Default() => WriteLine("IDefaultMethod.Default");
}

class CNormal : INormal {
    public void Normal() => WriteLine("CNormal.Normal");
}

class CDefault : IDefaultMethod {
    // Nothing to do here!
}

class CDefaultOwnImpl : IDefaultMethod {
    void IDefaultMethod.Default() => WriteLine("CDefaultOwnImpl.IDefaultMethod.Default");
}

// Test out the Normal/DefaultMethod Interfaces
INormal iNormal = new CNormal();
iNormal.Normal(); // prints "CNormal.Normal"

IDefaultMethod iDefault = new CDefault();
iDefault.Default(); // prints "IDefaultMethod.Default"

IDefaultMethod iDefaultOwnImpl = new CDefaultOwnImpl();
iDefaultOwnImpl.Default(); // prints "CDefaultOwnImpl.IDefaultMethod.Default"
```

The first way we can understand how they are implemented is by using [`Type.GetInterfaceMap(Type)`](https://docs.microsoft.com/en-us/dotnet/api/system.type.getinterfacemap?view=netframework-4.8#examples) (which actually [had to be fixed to work with DIMs](https://github.com/dotnet/coreclr/issues/15645)), this can be done with code like this:

``` csharp
private static void ShowInterfaceMapping(Type @implemetation, Type @interface) {
    InterfaceMapping map = @implemetation.GetInterfaceMap(@interface);
    Console.WriteLine($"{map.TargetType}: GetInterfaceMap({map.InterfaceType})");
    for (int counter = 0; counter < map.InterfaceMethods.Length; counter++) {
        MethodInfo im = map.InterfaceMethods[counter];
        MethodInfo tm = map.TargetMethods[counter];
        Console.WriteLine($"   {im.DeclaringType}::{im.Name} --> {tm.DeclaringType}::{tm.Name} ({(im == tm ? "same" : "different")})");
        Console.WriteLine("       MethodHandle 0x{0:X} --> MethodHandle 0x{1:X}",
            im.MethodHandle.Value.ToInt64(), tm.MethodHandle.Value.ToInt64());
        Console.WriteLine("       FunctionPtr  0x{0:X} --> FunctionPtr  0x{1:X}",
            im.MethodHandle.GetFunctionPointer().ToInt64(), tm.MethodHandle.GetFunctionPointer().ToInt64());
    }
    Console.WriteLine();
}
```

Which gives the following output:

``` blank
//ShowInterfaceMapping(typeof(CNormal), @interface: typeof(INormal));
//ShowInterfaceMapping(typeof(CDefault), @interface: typeof(IDefaultMethod));
//ShowInterfaceMapping(typeof(CDefaultOwnImpl), @interface: typeof(IDefaultMethod));

TestApp.CNormal: GetInterfaceMap(TestApp.INormal)
   TestApp.INormal::Normal --> TestApp.CNormal::Normal (different)
       MethodHandle 0x7FF993916A80 --> MethodHandle 0x7FF993916B10
       FunctionPtr  0x7FF99385FC50 --> FunctionPtr  0x7FF993861880

TestApp.CDefault: GetInterfaceMap(TestApp.IDefaultMethod)
   TestApp.IDefaultMethod::Default --> TestApp.IDefaultMethod::Default (same)
       MethodHandle 0x7FF993916BD8 --> MethodHandle 0x7FF993916BD8
       FunctionPtr  0x7FF99385FC78 --> FunctionPtr  0x7FF99385FC78

TestApp.CDefaultOwnImpl: GetInterfaceMap(TestApp.IDefaultMethod)
   TestApp.IDefaultMethod::Default --> TestApp.CDefaultOwnImpl::TestApp.IDefaultMethod.Default (different)
       MethodHandle 0x7FF993916BD8 --> MethodHandle 0x7FF993916D10
       FunctionPtr  0x7FF99385FC78 --> FunctionPtr  0x7FF9938663A0
```

So here we can see that in the case of `IDefaultMethod` interface on the `CDefault` class the interface and method implementations are the *same*. As you can see, in the other scenarios the interface method maps to a *different* method implementation.

But lets look at bit lower, making use of WinDBG and the [SOS extension](https://docs.microsoft.com/en-us/dotnet/framework/tools/sos-dll-sos-debugging-extension) to get a peek into the internal 'data structures' that the runtime uses.

First, lets take a look at the `MethodTable` (`dumpmt`) for the `INormal` interface:

```
> dumpmt -md 00007ff8bcc31dd8
EEClass:         00007FF8BCC2C420
Module:          00007FF8BCC0F788
Name:            TestApp.INormal
mdToken:         0000000002000002
File:            C:\DefaultInterfaceMethods\TestApp\bin\Debug\netcoreapp3.0\TestApp.dll
BaseSize:        0x0
ComponentSize:   0x0
Slots in VTable: 1
Number of IFaces in IFaceMap: 0
--------------------------------------
MethodDesc Table
           Entry       MethodDesc    JIT Name
00007FF8BCB70580 00007FF8BCC31DC8   NONE TestApp.INormal.Normal()
```

So we can see that the interface has an entry for the `Normal()` method, as expected, but lets look in more detail at the `MethodDesc` (`dumpmd`):

```
> dumpmd 00007FF8BCC31DC8                                    
Method Name:          TestApp.INormal.Normal()               
Class:                00007ff8bcc2c420                       
MethodTable:          00007ff8bcc31dd8                       
mdToken:              0000000006000001                       
Module:               00007ff8bcc0f788                       
IsJitted:             no                                     
Current CodeAddr:     ffffffffffffffff                       
Version History:                                             
  ILCodeVersion:      0000000000000000                       
  ReJIT ID:           0                                      
  IL Addr:            0000000000000000                       
     CodeAddr:           0000000000000000  (MinOptJitted)    
     NativeCodeVersion:  0000000000000000 
```

So whilst the method exists in the interface definition, it's clear that the method has not been jitted (`IsJitted: no`) and in fact it never will, as it can never be executed.

Now lets compare that output with the one for the `IDefaultMethod` interface, again the `MethodTable` (`dumpmt`) and the  `MethodDesc` (`dumpmd`):

```
> dumpmt -md 00007ff8bcc31e68
EEClass:         00007FF8BCC2C498
Module:          00007FF8BCC0F788
Name:            TestApp.IDefaultMethod
mdToken:         0000000002000003
File:            C:\DefaultInterfaceMethods\TestApp\bin\Debug\netcoreapp3.0\TestApp.dll
BaseSize:        0x0
ComponentSize:   0x0
Slots in VTable: 1
Number of IFaces in IFaceMap: 0
--------------------------------------
MethodDesc Table
           Entry       MethodDesc    JIT Name
00007FF8BCB70590 00007FF8BCC31E58    JIT TestApp.IDefaultMethod.Default()

> dumpmd 00007FF8BCC31E58
Method Name:          TestApp.IDefaultMethod.Default()
Class:                00007ff8bcc2c498
MethodTable:          00007ff8bcc31e68
mdToken:              0000000006000002
Module:               00007ff8bcc0f788
IsJitted:             yes
Current CodeAddr:     00007ff8bcb765c0
Version History:
  ILCodeVersion:      0000000000000000
  ReJIT ID:           0
  IL Addr:            0000000000000000
     CodeAddr:           00007ff8bcb765c0  (MinOptJitted)
     NativeCodeVersion:  0000000000000000
```

Here we see something very different, the `MethodDesc` entry in the `MethodTable` actually has jitted, executable code associated with it.

----

## Enabling Methods on an Interface

So we've seen that 'default interface methods' are wired up by the runtime, but how does that happen?

Firstly, it's very illuminating to look at the initial prototype of the feature in [CoreCLR PR #10505](https://github.com/dotnet/coreclr/pull/10505/), because we can understand at the lowest level what the feature is actually enabling, from [/src/vm/classcompat.cpp](https://github.com/dotnet/coreclr/pull/10505/files#diff-711c484c34d9ba3361552c3f2e1a4246):

[![Default Interface Methods - Relaxing class constraints]({{ base }}/images/2020/02/Default Interface Methods - Relaxing class constraints.png)]({{ base }}/images/2020/02/Default Interface Methods - Relaxing class constraints.png)

Here we see why DIM didn't require any changes to the .NET ['Intermediate Language' (IL)](https://en.wikipedia.org/wiki/Common_Intermediate_Language) op-codes, instead **they are enabled by relaxing a previous restriction**. Before this change, you weren't able to add '*virtual, non-abstract*' or '*non-virtual*' methods to an interface:

- "Virtual Non-Abstract Interface Method." (`BFA_VIRTUAL_NONAB_INT_METHOD`)
- "Nonvirtual Instance Interface Method." (`BFA_NONVIRT_INST_INT_METHOD`)

This ties in with the *proposed* changes to the [ECMA-335 specification](https://www.ecma-international.org/publications/standards/Ecma-335.htm), from the ['Default interface methods' design doc](https://github.com/dotnet/coreclr/blob/release/3.1/Documentation/design-docs/default-interface-methods.md):

> The major changes are:
>
> - **Interfaces are now allowed to have instance methods (both virtual and non-virtual). Previously we only allowed abstract virtual methods.**
>   - Interfaces obviously still can't have instance fields.
> - Interface methods are allowed to MethodImpl other interface methods the interface requires (but we require the MethodImpls to be final to keep things simple) - i.e. an interface is allowed to provide (or override) an implementation of another interface's method

However, just allowing '*virtual, non-abstract*' or '*non-virtual*' methods to exist on an interface is only the start, the runtime then needs to allow code to call those methods and that is far harder!

----

## Resolving the Method Dispatch

In .NET, since version 2.0, all interface methods calls have taken place via a mechanism known as [Virtual Stub Dispatch](https://github.com/dotnet/runtime/blob/master/docs/design/coreclr/botr/virtual-stub-dispatch.md):

> Virtual stub dispatching (VSD) is the technique of using **stubs for virtual method invocations instead of the traditional virtual method table**. In the past, interface dispatch required that interfaces had process-unique identifiers, and that every loaded interface was added to a global interface virtual table map. This requirement meant that all interfaces and all classes that implemented interfaces had to be restored at runtime in NGEN scenarios, causing significant startup working set increases. **The motivation for stub dispatching was to eliminate much of the related working set, as well as distribute the remaining work throughout the lifetime of the process.**
>
> Although it is possible for VSD to dispatch both virtual instance and interface method calls, **it is currently used only for interface dispatch.**

For more information I recommend reading the section on [C#'s slotmaps](https://lukasatkinson.de/2018/interface-dispatch/#slotmaps) in the excellent article on 'Interface Dispatch' by [Lukas Atkinson](https://twitter.com/latkde).

So, to make DIM work, the runtime has to wire up any 'default methods', so that they integrate with the 'virtual stub dispatch' mechanism. We can see this in action by looking at the call stack from the hand-crafted assembly stub (`ResolveWorkerAsmStub`) all the way down to `FindDefaultInterfaceImplementation(..)` which finds the correct method, given an interface (`pInterfaceMD`) and the default method to call (`pInterfaceMT`):

```
- coreclr.dll!MethodTable::FindDefaultInterfaceImplementation(MethodDesc *pInterfaceMD, MethodTable *pInterfaceMT, MethodDesc **ppDefaultMethod, int allowVariance, int throwOnConflict) Line 6985	C++
- coreclr.dll!MethodTable::FindDispatchImpl(unsigned int typeID, unsigned int slotNumber, DispatchSlot *pImplSlot, int throwOnConflict) Line 6851	C++
- coreclr.dll!MethodTable::FindDispatchSlot(unsigned int typeID, unsigned int slotNumber, int throwOnConflict) Line 7251	C++
- coreclr.dll!VirtualCallStubManager::Resolver(MethodTable *pMT, DispatchToken token, OBJECTREF *protectedObj, unsigned __int64 *ppTarget, int throwOnConflict) Line 2208	C++
- coreclr.dll!VirtualCallStubManager::ResolveWorker(StubCallSite *pCallSite, OBJECTREF *protectedObj, DispatchToken token, VirtualCallStubManager::StubKind stubKind) Line 1874	C++
- coreclr.dll!VSD_ResolveWorker(TransitionBlock *pTransitionBlock, unsigned __int64 siteAddrForRegisterIndirect, unsigned __int64 token, unsigned __int64 flags) Line 1683	C++
- coreclr.dll!ResolveWorkerAsmStub() Line 42	Unknown
```

If you want to explore the call-stack in more detail, you can follow the links below:

- `ResolveWorkerAsmStub` [here](https://github.com/dotnet/coreclr/blob/release/3.1/src/vm/amd64/VirtualCallStubAMD64.asm#L40)
  - This is the ['Generic Resolver'](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/virtual-stub-dispatch.md#generic-resolver) phase of 'Virtual Stub Dispatch'.
- `VSD_ResolveWorker(..)` [here](https://github.com/dotnet/coreclr/blob/release/3.1/src/vm/virtualcallstub.cpp#L1683)
- `VirtualCallStubManager::ResolveWorker(..)` [here](https://github.com/dotnet/coreclr/blob/release/3.1/src/vm/virtualcallstub.cpp#L1874)
- `VirtualCallStubManager::Resolver(..)`[here](https://github.com/dotnet/coreclr/blob/release/3.1/src/vm/virtualcallstub.cpp#L2204)
- `MethodTable::FindDispatchSlot(..)` [here](https://github.com/dotnet/coreclr/blob/release/3.1/src/vm/methodtable.cpp#L7459)
  `[MethodTable::FindDispatchImpl(..)` [here](https://github.com/dotnet/coreclr/blob/release/3.1/src/vm/methodtable.cpp#L7065) or [here](https://github.com/dotnet/coreclr/blob/release/3.1/src/vm/methodtable.cpp#L7075)
- Finally ending up in `MethodTable::FindDefaultInterfaceImplementation(..)` [here](https://github.com/dotnet/coreclr/blob/release/3.1/src/vm/methodtable.cpp#L7173-L7444)

----

## Analysis of `FindDefaultInterfaceImplementation(..)`

So the code in `FindDefaultInterfaceImplementation(..)` is at the heart of the feature, but what does it need to do and how does it do it? This list from [Finalize override lookup algorithm #12753](https://github.com/dotnet/coreclr/pull/12753) gives us some idea of the complexity:

> - properly detect diamond shape positive case (where I4 overrides both I2/I3 which both overrides I1) by keep tracking of a current list of best candidates. I went for the simplest algorithm and didn't build any complex graph / DFS since the majority case the list of interfaces would be small, and interface dispatch cache would ensure majority of cases we don't need to redo the (slow) dispatch. If needed we can revisit this to make it a proper topological sort.
> - VerifyVirtualMethodsImplemented now properly validates default interface scenarios - it is happy if there is at least one implementation and early returns. It doesn't worry about conflicting overrides, for performance reasons.
> - NotSupportedException thrown in conflicting override scenario now has a proper error message
> - properly supports GVM when detecting method impl overrides
> - Revisited code that adds method impl for interfaces. added proper methodimpl validation and ensure methodimpl are virtual and final (and throw exception if it is not final)
> - Added test scenario with method that has multiple method impl. found and fixed a bug where the slot array is not big enough when building method impls for interfaces.

In addition, the 'two-pass' algorithm was implemented in [Implement two pass algorithm for variant interface dispatch #21355](https://github.com/dotnet/coreclr/pull/21355), which contains an interesting discussion of the [edge-cases that need to be handled](https://github.com/dotnet/coreclr/pull/21355#discussion_r238893252).
  
So onto the code, this is the high-level view of the algorithm:

- Which actually starts in `MethodTable::FindDispatchImpl(..)` [here](https://github.com/dotnet/coreclr/blob/release/3.1/src/vm/methodtable.cpp#L7057-L7112), where `FindDefaultInterfaceImplementation` can be called twice:
  1. First time to try and find an 'exact match' (`allowVariance`=false)
  2. Then if that fails, it's called again to try and find a 'variant match' (`allowVariance`=true)
- The entire `FindDefaultInterfaceImplementation` method [is here](https://github.com/dotnet/coreclr/blob/release/3.1/src/vm/methodtable.cpp#L7173-L7444), it's fairly straight-forward and relatively easy to understand, plus there's only ~270 LOC and they're all very well commented. The high-level algorithm is the following:
  1. Walk interface from [derived class to parent class here](https://github.com/dotnet/coreclr/blob/release/3.1/src/vm/methodtable.cpp#L7202-L7402), this is a straight-forward implementation that may me revisited [if it doesn't scale well](https://github.com/dotnet/coreclr/blob/release/3.1/src/vm/methodtable.cpp#L7204-L7206)
  2. Then [scan through each class](https://github.com/dotnet/coreclr/blob/release/3.1/src/vm/methodtable.cpp#L7220-L7398) looking for a match:
      1. an ['exact match'](https://github.com/dotnet/coreclr/blob/release/3.1/src/vm/methodtable.cpp#L7227-L7234)
      2. a ['generic variance match'](https://github.com/dotnet/coreclr/blob/release/3.1/src/vm/methodtable.cpp#L7237-L7244), i.e. the interfaces match via 'casting', but ultimately have the same `TypeDef`
      3. a ['more specific interface'](https://github.com/dotnet/coreclr/blob/release/3.1/src/vm/methodtable.cpp#L7276-L7303) that matches, this match is made more complicated by the fact that ['generic instantiations' are involved](https://github.com/dotnet/coreclr/blob/release/3.1/src/vm/methodtable.cpp#L7278-L7282)
      4. a ['more specific interface'](https://github.com/dotnet/coreclr/blob/release/3.1/src/vm/methodtable.cpp#L7304-L7308) matches, but without generics involved, so much simpler to calculate
  3. If the previous step produced a match, double-check that it is the [*most* specific interface match seen so far](https://github.com/dotnet/coreclr/blob/release/3.1/src/vm/methodtable.cpp#L7314-L7395), by keeping a ['candidates list'](https://github.com/dotnet/coreclr/blob/release/3.1/src/vm/methodtable.cpp#L7198-L7200) and classifying each scenario as:
      1. a ['tie' which is ignored](https://github.com/dotnet/coreclr/blob/release/3.1/src/vm/methodtable.cpp#L7354-L7357), i.e. a 'variant match' on the same type
      2. a ['more specific' match](https://github.com/dotnet/coreclr/blob/release/3.1/src/vm/methodtable.cpp#L7358-L7374), which is used to update the 'candidates list'
      3. a ['less-specific' match](https://github.com/dotnet/coreclr/blob/release/3.1/src/vm/methodtable.cpp#L7375-L7381), so no need to carry on with this candidate
  4. Finally, a scan is done to see if there are any conflicts [here](https://github.com/dotnet/coreclr/blob/release/3.1/src/vm/methodtable.cpp#L7404-L7438), which is acceptable when `allowVariance=true`, but otherwise [throws an exception](https://github.com/dotnet/coreclr/blob/release/3.1/src/vm/methodtable.cpp#L7427)
  5. That's it, the ['best-candidate' is then returned to the caller](https://github.com/dotnet/coreclr/blob/release/3.1/src/vm/methodtable.cpp#L7434-L7438) (assuming there is one)

## Diamond Inheritance Problem

Finally, the 'diamond inheritance problem' was mentioned in a few of the PRs/Issues related to the feature, but what is it?

A good place to starts is one of the test cases, [diamondshape.cs](https://github.com/dotnet/coreclr/blob/release/3.1/tests/src/Loader/classloader/DefaultInterfaceMethods/diamondshape/diamondshape.cs). However there's a more concise example in the [C#8 Language Proposal](https://docs.microsoft.com/en-us/dotnet/csharp/language-reference/proposals/csharp-8.0/default-interface-methods#diamond-inheritance-and-classes-closed):

``` csharp
interface IA
{
    void M();
}
interface IB : IA
{
    override void M() { WriteLine("IB"); }
}
class Base : IA
{
    void IA.M() { WriteLine("Base"); }
}
class Derived : Base, IB // allowed?
{
    static void Main()
    {
        Ia a = new Derived();
        a.M();           // what does it do?
    }
}
```

So the issue is which of the matching interface methods should be used, in this case `IB.M()` or `Base.IA.M()`? The resolution, as outlined in the [C#8 language proposal](https://github.com/dotnet/csharplang/blob/master/proposals/csharp-8.0/default-interface-methods.md#diamond-inheritance-and-classes-closed) was to use the *most specific override*:

> ***Closed Issue:*** Confirm the draft spec, above, for *most specific override* as it applies to mixed classes and interfaces (a class takes priority over an interface). See <https://github.com/dotnet/csharplang/blob/master/meetings/2017/LDM-2017-04-19.md#diamonds-with-classes>.

Which ties in with the 'more-specific' and 'less-specific' steps we saw in the outline of `FindDefaultInterfaceImplementation` above.

----

## Summary

So there you have it, an entire feature delivered end-to-end, yay for .NET (Core) being open source! Thanks to the runtime engineers for making their Issues and PRs easy to follow and for adding such great comments to their code! Also kudos to the language designers for making their proposals and meeting notes available for all to see (e.g. [LDM-2017-04-19](https://github.com/dotnet/csharplang/blob/master/meetings/2017/LDM-2017-04-19.md#diamonds-with-classes)).

Whether you think they are useful or not, it's hard to argue that 'Default Interface Methods' aren't well designed and well implemented.

But what makes it even more unique feature is that it required the *compiler* and *runtime* teams working together to make it possible!
