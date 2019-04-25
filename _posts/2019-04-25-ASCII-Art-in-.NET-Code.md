---
layout: post
title: "ASCII Art in .NET Code"
comments: true
codeproject: false
tags: [.NET, Roslyn, CoreFX, ASP.NET]
---

Who doesn't like a nice bit of 'ASCII Art'? I know I certainly do!

[![ASCII Art - Matt's CLR]({{ base }}/images/2019/04/ASCII Art - Matt's CLR.png)](https://www.youtube.com/watch?v=bwSNyA1Nfz4&t=1477)

To see what *Matt's CLR* was all about you can watch the recording of my talk ['From 'dotnet run' to 'Hello World!''](https://www.youtube.com/watch?v=bwSNyA1Nfz4&t=1477) (from about ~24:30 in)

----

So armed with a trusty regex `/\*(.*?)\*/|//(.*?)\r?\n|"((\\[^\n]|[^"\n])*)"|@("[^"]*")+`, I set out to find all the **interesting ASCII Art** used in source code comments in the following *.NET related* repositories:

- [dotnet/CoreCLR](https://github.com/dotnet/coreclr/) - "*the runtime for .NET Core. It includes the garbage collector, JIT compiler, primitive data types and low-level classes.*"
- [Mono](https://github.com/mono/mono) - "*open source ECMA CLI, C# and .NET implementation.*"
- [dotnet/CoreFX](https://github.com/dotnet/corefx) - "*the foundational class libraries for .NET Core. It includes types for collections, file systems, console, JSON, XML, async and many others.*"
- [dotnet/Roslyn](https://github.com/dotnet/Roslyn) - "*provides C# and Visual Basic languages with rich code analysis APIs*"
- [aspnet/AspNetCore](https://github.com/aspnet/AspNetCore) - "*a cross-platform .NET framework for building modern cloud-based web applications on Windows, Mac, or Linux.*"

**Note**: Yes, I shamelessly 'borrowed' this idea from [John Regehr](https://twitter.com/johnregehr/status/1095018518737637376), I was motivated to write this because his excellent post ['Explaining Code using ASCII Art'](https://blog.regehr.org/archives/1653) didn't have any *.NET related* code in it!

----

## Table of Contents

To make the examples easier to browse, I've split them up into categories:

- [Dave Cutler](#dave-cutler)
- [Syntax Trees](#syntax-trees)
- [Timelines](#timelines)
- [Logic Tables](#logic-tables)
- [Class Hierarchies](#class-hierarchies)
- [Component Diagrams](#component-diagrams)
- [Algorithms](#algorithms)
- [Bit Packing](#bit-packing)
- [Data Structures](#data-structures)
- [State Machines](#state-machines)
- [RFC's and Specs](#rfcs-and-specs)
- [Dates & Times](#dates--times)
- [Stack Layouts](#stack-layouts)
- [The Rest](#the-rest)

----

## Dave Cutler

There's no *art* in this one, but it deserves it's own category as it quotes the amazing [Dave Cutler](https://en.wikipedia.org/wiki/Dave_Cutler) who led the development of Windows NT. Therefore there's no better person to ask a deep, technical question about how *Thread Suspension* works on Windows, from [coreclr/src/vm/threadsuspend.cpp](https://github.com/dotnet/coreclr/blob/dc11162e1c36624d3cabb6e0bf6583a94ab2e30c/src/vm/threadsuspend.cpp#L102-L124)

``` plaintext
// Message from David Cutler
/*
    After SuspendThread returns, can the suspended thread continue to execute code in user mode?

    [David Cutler] The suspended thread cannot execute any more user code, but it might be currently "running"
    on a logical processor whose other logical processor is currently actually executing another thread.
    In this case the target thread will not suspend until the hardware switches back to executing instructions
    on its logical processor. In this case even the memory barrier would not necessarily work - a better solution
    would be to use interlocked operations on the variable itself.

    After SuspendThread returns, does the store buffer of the CPU for the suspended thread still need to drain?

    Historically, we've assumed that the answer to both questions is No.  But on one 4/8 hyper-threaded machine
    running Win2K3 SP1 build 1421, we've seen two stress failures where SuspendThread returns while writes seem to still be in flight.

    Usually after we suspend a thread, we then call GetThreadContext.  This seems to guarantee consistency.
    But there are places we would like to avoid GetThreadContext, if it's safe and legal.

    [David Cutler] Get context delivers a APC to the target thread and waits on an event that will be set
    when the target thread has delivered its context.

    Chris.
*/
```

For more info on Dave Cutler, see this excellent interview ['Internets of Interest #6: Dave Cutler on Dave Cutler'](https://dave.cheney.net/2018/10/06/internets-of-interest-6-dave-cutler-on-dave-cutler) or ['The engineer’s engineer: Computer industry luminaries salute Dave Cutler’s five-decade-long quest for quality'](https://news.microsoft.com/features/the-engineers-engineer-computer-industry-luminaries-salute-dave-cutlers-five-decade-long-quest-for-quality/)

----

## Syntax Trees

The inner workings of the .NET 'Just-in-Time' (JIT) Compiler have always been a bit of a mystery to me. But, having informative comments like this one from [coreclr/src/jit/lsra.cpp](https://github.com/dotnet/coreclr/blob/9d3f264b9ef8b4715017ec615dcb6f9d57e607cc/src/jit/lsra.cpp#L6166-L6196) go some way to showing what it's doing

``` plaintext
// For example, for this tree (numbers are execution order, lower is earlier and higher is later):
//
//                                   +---------+----------+
//                                   |       GT_ADD (3)   |
//                                   +---------+----------+
//                                             |
//                                           /   \
//                                         /       \
//                                       /           \
//                   +-------------------+           +----------------------+
//                   |         x (1)     | "tree"    |         y (2)        |
//                   +-------------------+           +----------------------+
//
// generate this tree:
//
//                                   +---------+----------+
//                                   |       GT_ADD (4)   |
//                                   +---------+----------+
//                                             |
//                                           /   \
//                                         /       \
//                                       /           \
//                   +-------------------+           +----------------------+
//                   |  GT_RELOAD (3)    |           |         y (2)        |
//                   +-------------------+           +----------------------+
//                             |
//                   +-------------------+
//                   |         x (1)     | "tree"
//                   +-------------------+
```

There's also a more in-depth example in [coreclr/src/jit/morph.cpp](https://github.com/dotnet/coreclr/blob/9d3f264b9ef8b4715017ec615dcb6f9d57e607cc/src/jit/morph.cpp#L6170-L6236)

Also from [roslyn/src/Compilers/VisualBasic/Portable/Semantics/TypeInference/RequiredConversion.vb](https://github.com/dotnet/roslyn/blob/Visual-Studio-2017-Version-15.9/src/Compilers/VisualBasic/Portable/Semantics/TypeInference/RequiredConversion.vb#L87-L104)

``` plaintext
 '// These restrictions form a partial order composed of three chains: from less strict to more strict, we have:
'//    [reverse chain] [None] < AnyReverse < ReverseReference < Identity
'//    [middle  chain] None < [Any,AnyReverse] < AnyConversionAndReverse < Identity
'//    [forward chain] [None] < Any < ArrayElement < Reference < Identity
'//
'//            =           KEY:
'//         /  |  \           =     Identity
'//        /   |   \         +r     Reference
'//      -r    |    +r       -r     ReverseReference
'//       |  +-any  |       +-any   AnyConversionAndReverse
'//       |   /|\   +arr     +arr   ArrayElement
'//       |  / | \  |        +any   Any
'//      -any  |  +any       -any   AnyReverse
'//         \  |  /           none  None
'//          \ | /
'//           none
'//
```

----

## Timelines

This example from [coreclr/src/vm/comwaithandle.cpp](https://github.com/dotnet/coreclr/blob/e277764916cbb740db199132be81701593820bb0/src/vm/comwaithandle.cpp#L129-L156) was unique! I didn't find another example of ASCII Art used to illustrate time-lines, it's a really novel approach.

``` plaintext
// In case the CLR is paused inbetween a wait, this method calculates how much 
// the wait has to be adjusted to account for the CLR Freeze. Essentially all
// pause duration has to be considered as "time that never existed".
//
// Two cases exists, consider that 10 sec wait is issued 
// Case 1: All pauses happened before the wait completes. Hence just the 
// pause time needs to be added back at the end of wait
// 0           3                   8       10
// |-----------|###################|------>
//                 5-sec pause    
//             ....................>
//                                            Additional 5 sec wait
//                                        |=========================> 
//
// Case 2: Pauses ended after the wait completes. 
// 3 second of wait was left as the pause started at 7 so need to add that back
// 0                           7           10
// |---------------------------|###########>
//                                 5-sec pause   12
//                             ...................>
//                                            Additional 3 sec wait
//                                                |==================> 
//
// Both cases can be expressed in the same calculation
// pauseTime:   sum of all pauses that were triggered after the timer was started
// expDuration: expected duration of the wait (without any pauses) 10 in the example
// actDuration: time when the wait finished. Since the CLR is frozen during pause it's
//              max of timeout or pause-end. In case-1 it's 10, in case-2 it's 12
```

----

## Logic Tables

A sweet-spot for ASCII Art seems to be tables, there are so many examples. Starting with [coreclr/src/vm/methodtablebuilder.cpp](https://github.com/dotnet/coreclr/blob/9d3f264b9ef8b4715017ec615dcb6f9d57e607cc/src/vm/methodtablebuilder.cpp#L4675-L4686) (bonus points for combining comments and code together!)

``` cpp
//               |        Base type
// Subtype       |        mdPrivateScope  mdPrivate   mdFamANDAssem   mdAssem     mdFamily    mdFamORAssem    mdPublic
// --------------+-------------------------------------------------------------------------------------------------------
/*mdPrivateScope | */ { { e_SM,           e_NO,       e_NO,           e_NO,       e_NO,       e_NO,           e_NO    },
/*mdPrivate      | */   { e_SM,           e_YES,      e_NO,           e_NO,       e_NO,       e_NO,           e_NO    },
/*mdFamANDAssem  | */   { e_SM,           e_YES,      e_SA,           e_NO,       e_NO,       e_NO,           e_NO    },
/*mdAssem        | */   { e_SM,           e_YES,      e_SA,           e_SA,       e_NO,       e_NO,           e_NO    },
/*mdFamily       | */   { e_SM,           e_YES,      e_YES,          e_NO,       e_YES,      e_NSA,          e_NO    },
/*mdFamORAssem   | */   { e_SM,           e_YES,      e_YES,          e_SA,       e_YES,      e_YES,          e_NO    },
/*mdPublic       | */   { e_SM,           e_YES,      e_YES,          e_YES,      e_YES,      e_YES,          e_YES   } };
```

Also [coreclr/src/jit/importer.cpp](https://github.com/dotnet/coreclr/blob/9d3f264b9ef8b4715017ec615dcb6f9d57e607cc/src/jit/importer.cpp#L15265-L15283) which shows how the JIT deals with boxing/un-boxing

``` plaintext
/*
    ----------------------------------------------------------------------
    | \ helper  |                         |                              |
    |   \       |                         |                              |
    |     \     | CORINFO_HELP_UNBOX      | CORINFO_HELP_UNBOX_NULLABLE  |
    |       \   | (which returns a BYREF) | (which returns a STRUCT)     |
    | opcode  \ |                         |                              |
    |---------------------------------------------------------------------
    | UNBOX     | push the BYREF          | spill the STRUCT to a local, |
    |           |                         | push the BYREF to this local |
    |---------------------------------------------------------------------
    | UNBOX_ANY | push a GT_OBJ of        | push the STRUCT              |
    |           | the BYREF               | For Linux when the           |
    |           |                         |  struct is returned in two   |
    |           |                         |  registers create a temp     |
    |           |                         |  which address is passed to  |
    |           |                         |  the unbox_nullable helper.  |
    |---------------------------------------------------------------------
*/
```

Finally, there's some other nice examples showing the rules for [operator overloading](https://github.com/dotnet/roslyn/blob/Visual-Studio-2017-Version-15.9/src/Compilers/CSharp/Portable/Binder/Semantics/Operators/BinaryOperatorEasyOut.cs#L104-L165) in the C# (Roslyn) Compiler and which .NET data-types [can be converted](https://github.com/dotnet/corefx/blob/4b9fff5c022269c7dbb000bd14c10be27400beb2/src/Common/src/CoreLib/System/Convert.cs#L46-L63) via the `System.ToXXX()` functions.

----

## Class Hierarchies

Of course, most IDE's come with tools that will generate class-hierarchies for you, but it's much nicer to see them in ASCII, from [coreclr/src/vm/object.h](https://github.com/dotnet/coreclr/blob/9d3f264b9ef8b4715017ec615dcb6f9d57e607cc/src/vm/object.h#L28-L55)

``` plaintext
 * COM+ Internal Object Model
 *
 *
 * Object              - This is the common base part to all COM+ objects
 *  |                        it contains the MethodTable pointer and the
 *  |                        sync block index, which is at a negative offset
 *  |
 *  +-- code:StringObject       - String objects are specialized objects for string
 *  |                        storage/retrieval for higher performance
 *  |
 *  +-- BaseObjectWithCachedData - Object Plus one object field for caching.
 *  |       |
 *  |       +-  ReflectClassBaseObject    - The base object for the RuntimeType class
 *  |       +-  ReflectMethodObject       - The base object for the RuntimeMethodInfo class
 *  |       +-  ReflectFieldObject        - The base object for the RtFieldInfo class
 *  |
 *  +-- code:ArrayBase          - Base portion of all arrays
 *  |       |
 *  |       +-  I1Array    - Base type arrays
 *  |       |   I2Array
 *  |       |   ...
 *  |       |
 *  |       +-  PtrArray   - Array of OBJECTREFs, different than base arrays because of pObjectClass
 *  |              
 *  +-- code:AssemblyBaseObject - The base object for the class Assembly
 ```

 There's also an [even larger one](https://github.com/dotnet/coreclr/blob/1f02c30e053b1da4410e20c3b715128e3d1e354a/src/vm/frames.h#L7-L197) that I stumbled across when writing ["Stack Walking" in the .NET Runtime]({{ base }}/2019/01/21/Stackwalking-in-the-.NET-Runtime/).

----

## Component Diagrams

When you have several different components in a code-base it's always nice to see how they fit together. From [coreclr/src/vm/codeman.h](
https://github.com/dotnet/coreclr/blob/9d3f264b9ef8b4715017ec615dcb6f9d57e607cc/src/vm/codeman.h#L14-L56) we can see how the top-level parts of the .NET JIT work together

``` plaintext
                                               ExecutionManager
                                                       |
                           +-----------+---------------+---------------+-----------+--- ...
                           |           |                               |           |
                        CodeType       |                            CodeType       |
                           |           |                               |           |
                           v           v                               v           v
+---------------+      +--------+<---- R    +---------------+      +--------+<---- R
|ICorJitCompiler|<---->|IJitMan |<---- R    |ICorJitCompiler|<---->|IJitMan |<---- R
+---------------+      +--------+<---- R    +---------------+      +--------+<---- R
                           |       x   .                               |       x   .
                           |        \  .                               |        \  .
                           v         \ .                               v         \ .
                       +--------+      R                           +--------+      R
                       |ICodeMan|                                  |ICodeMan|     (RangeSections)
                       +--------+                                  +--------+       
```

Other notable examples are:
- [coreclr/src/vm/compile.h](https://github.com/dotnet/coreclr/blob/9d3f264b9ef8b4715017ec615dcb6f9d57e607cc/src/vm/compile.h#L14-L47)
- [coreclr/src/inc/ceegen.h](https://github.com/dotnet/coreclr/blob/9d3f264b9ef8b4715017ec615dcb6f9d57e607cc/src/inc/ceegen.h#L47-L92)
- [coreclr/src/debug/di/divalue.cpp](https://github.com/dotnet/coreclr/blob/9d3f264b9ef8b4715017ec615dcb6f9d57e607cc/src/debug/di/divalue.cpp#L1432-L1451)
- [coreclr/src/vm/ceeload.cpp](https://github.com/dotnet/coreclr/blob/9d3f264b9ef8b4715017ec615dcb6f9d57e607cc/src/vm/ceeload.cpp#L10543-L10578)

Finally, from [coreclr/src/vm/ceeload.cpp](https://github.com/dotnet/coreclr/blob/e6034d903f2608445a3f66e3694f461fad7b8b88/src/vm/ceeload.cpp#L10350-L10385) we see the inner-workings of the [Native Image Generator (NGEN)](https://docs.microsoft.com/en-us/dotnet/framework/tools/ngen-exe-native-image-generator)

``` plaintext
        This diagram illustrates the layout of fixups in the ngen image.
        This is the case where function foo2 has a class-restore fixup
        for class C1 in b.dll.

                                  zapBase+curTableVA+rva /         FixupList (see Fixup Encoding below)
                                  m_pFixupBlobs
                                                            +-------------------+
                  pEntry->VA +--------------------+         |     non-NULL      | foo1
                             |Handles             |         +-------------------+
ZapHeader.ImportTable        |                    |         |     non-NULL      |
                             |                    |         +-------------------+
   +------------+            +--------------------+         |     non-NULL      |
   |a.dll       |            |Class cctors        |<---+    +-------------------+
   |            |            |                    |     \   |         0         |
   |            |     p->VA/ |                    |<---+ \  +===================+
   |            |      blobs +--------------------+     \ +-------non-NULL      | foo2
   +------------+            |Class restore       |      \  +-------------------+
   |b.dll       |            |                    |       +-------non-NULL      |
   |            |            |                    |         +-------------------+
   |  token_C1  |<--------------blob(=>fixedUp/0) |<--pBlob--------index        |
   |            | \          |                    |         +-------------------+
   |            |  \         +--------------------+         |     non-NULL      |
   |            |   \        |                    |         +-------------------+
   |            |    \       |        .           |         |         0         |
   |            |     \      |        .           |         +===================+
   +------------+      \     |        .           |         |         0         | foo3
                        \    |                    |         +===================+
                         \   +--------------------+         |     non-NULL      | foo4
                          \  |Various fixups that |         +-------------------+
                           \ |need too happen     |         |         0         |
                            \|                    |         +===================+
                             |(CorCompileTokenTable)
                             |                    |
               pEntryEnd->VA +--------------------+
```

----

## Algorithms

They say '*a picture paints a thousand words*' and that definately applies when describing complex algorithms, from [roslyn/src/Workspaces/Core/Portable/Utilities/EditDistance.cs](https://github.com/dotnet/roslyn/blob/Visual-Studio-2017-Version-15.9/src/Workspaces/Core/Portable/Utilities/EditDistance.cs#L232-L287)

``` plaintext
// If we fill out the matrix fully we'll get:
//          
//           s u n d a y <-- source
//      ----------------
//      |∞ ∞ ∞ ∞ ∞ ∞ ∞ ∞
//      |∞ 0 1 2 3 4 5 6
//    s |∞ 1 0 1 2 3 4 5 
//    a |∞ 2 1 1 2 3 3 4 
//    t |∞ 3 2 2 2 3 4 4 
//    u |∞ 4 3 2 3 3 4 5 
//    r |∞ 5 4 3 3 4 4 5 
//    d |∞ 6 5 4 4 3 4 5 
//    a |∞ 7 6 5 5 4 3 4 
//    y |∞ 8 7 6 6 5 4 3 <--
//                     ^
//                     |
```

Next, this gem that explains how the DOS wild-card matching works, [corefx/src/System.IO.FileSystem/src/System/IO/Enumeration/FileSystemName.cs](https://github.com/dotnet/corefx/blob/4b9fff5c022269c7dbb000bd14c10be27400beb2/src/System.IO.FileSystem/src/System/IO/Enumeration/FileSystemName.cs#L104-L158)

``` plaintext
// Matching routine description
// ============================
// (copied from native impl)
//
// This routine compares a Dbcs name and an expression and tells the caller
// if the name is in the language defined by the expression.  The input name
// cannot contain wildcards, while the expression may contain wildcards.
//
// Expression wild cards are evaluated as shown in the nondeterministic
// finite automatons below.  Note that ~* and ~? are DOS_STAR and DOS_QM.
//
//        ~* is DOS_STAR, ~? is DOS_QM, and ~. is DOS_DOT
//
//                                  S
//                               <-----<
//                            X  |     |  e       Y
//        X * Y ==       (0)----->-(1)->-----(2)-----(3)
//
//                                 S-.
//                               <-----<
//                            X  |     |  e       Y
//        X ~* Y ==      (0)----->-(1)->-----(2)-----(3)
//
//                           X     S     S     Y
//        X ?? Y ==      (0)---(1)---(2)---(3)---(4)
//
//                           X     .        .      Y
//        X ~.~. Y ==    (0)---(1)----(2)------(3)---(4)
//                              |      |________|
//                              |           ^   |
//                              |_______________|
//                                 ^EOF or .^
//
//                           X     S-.     S-.     Y
//        X ~?~? Y ==    (0)---(1)-----(2)-----(3)---(4)
//                              |      |________|
//                              |           ^   |
//                              |_______________|
//                                 ^EOF or .^
//
//    where S is any single character
//          S-. is any single character except the final .
//          e is a null character transition
//          EOF is the end of the name string
//
//   In words:
//
//       * matches 0 or more characters.
//       ? matches exactly 1 character.
//       DOS_STAR matches 0 or more characters until encountering and matching
//           the final . in the name.
//       DOS_QM matches any single character, or upon encountering a period or
//           end of name string, advances the expression to the end of the
//           set of contiguous DOS_QMs.
//       DOS_DOT matches either a . or zero characters beyond name string.
```

Finally from [roslyn/src/Workspaces/Core/Portable/Shared/Collections/IntervalTree`1.Node.cs](https://github.com/dotnet/roslyn/blob/Visual-Studio-2017-Version-15.9/src/Workspaces/Core/Portable/Shared/Collections/IntervalTree%601.Node.cs#L65-L125) we have per-method comments with samples, this is a great idea!

``` cs
// Sample:
//   1            1                  3
//  / \          / \              /     \
// a   2        a   3            1       2
//    / \   =>     / \     =>   / \     / \
//   3   d        b   2        a   b   c   d
//  / \              / \
// b   c            c   d
internal Node InnerRightOuterLeftRotation(IIntervalIntrospector<T> introspector)
{
    ...
}

// Sample:
//     1              1              3
//    / \            / \          /     \
//   2   d          3   d        2       1
//  / \     =>     / \     =>   / \     / \
// a   3          2   c        a   b   c   d
//    / \        / \
//   b   c      a   b
internal Node InnerLeftOuterRightRotation(IIntervalIntrospector<T> introspector)
{
    ...
}
```

----

## Bit Packing

Maybe you can visualise which *individual* bits are set given a Hexadecimal value, but I can't, so I'm always grateful for comments like this one from [roslyn/src/Compilers/CSharp/Portable/Symbols/Source/SourceMemberContainerSymbol.cs](https://github.com/dotnet/roslyn/blob/Visual-Studio-2017-Version-15.9/src/Compilers/CSharp/Portable/Symbols/Source/SourceMemberContainerSymbol.cs#L28-L37)

``` plaintext
// We current pack everything into two 32-bit ints; layouts for each are given below.

// First int:
//
// | |d|yy|xxxxxxxxxxxxxxxxxxxxxxx|wwwwww|
//
// w = special type.  6 bits.
// x = modifiers.  23 bits.
// y = IsManagedType.  2 bits.
// d = FieldDefinitionsNoted. 1 bit
```

This one from [corefx/src/System.Runtime.WindowsRuntime/src/System/Threading/Tasks/TaskToAsyncInfoAdapter.cs](https://github.com/dotnet/corefx/blob/4b9fff5c022269c7dbb000bd14c10be27400beb2/src/System.Runtime.WindowsRuntime/src/System/Threading/Tasks/TaskToAsyncInfoAdapter.cs#L26-L43) also does a great job of showing the different bit-flags and how they interact

``` plaintext
// ! THIS DIAGRAM ILLUSTRATES THE CONSTANTS BELOW. UPDATE THIS IF UPDATING THE CONSTANTS BELOW!:
//     3         2         1         0
//    10987654321098765432109876543210
//    X...............................   Reserved such that we can use Int32 and not worry about negative-valued state constants
//    ..X.............................   STATEFLAG_COMPLETED_SYNCHRONOUSLY
//    ...X............................   STATEFLAG_MUST_RUN_COMPLETION_HNDL_WHEN_SET
//    ....X...........................   STATEFLAG_COMPLETION_HNDL_NOT_YET_INVOKED
//    ................................   STATE_NOT_INITIALIZED
//    ...............................X   STATE_STARTED
//    ..............................X.   STATE_RUN_TO_COMPLETION
//    .............................X..   STATE_CANCELLATION_REQUESTED
//    ............................X...   STATE_CANCELLATION_COMPLETED
//    ...........................X....   STATE_ERROR
//    ..........................X.....   STATE_CLOSED
//    ..........................XXXXXX   STATEMASK_SELECT_ANY_ASYNC_STATE
//    XXXXXXXXXXXXXXXXXXXXXXXXXX......   STATEMASK_CLEAR_ALL_ASYNC_STATES
//     3         2         1         0
//    10987654321098765432109876543210
```

Finally, we have some helpful explanations of how different encoding work. Firstly UTF-8 from [corefx//src/Common/src/CoreLib/System/Text/UTF8Encoding.cs](https://github.com/dotnet/corefx/blob/4b9fff5c022269c7dbb000bd14c10be27400beb2/src/Common/src/CoreLib/System/Text/UTF8Encoding.cs#L38-L49)

``` plaintext
/*
    bytes   bits    UTF-8 representation
    -----   ----    -----------------------------------
    1        7      0vvvvvvv
    2       11      110vvvvv 10vvvvvv
    3       16      1110vvvv 10vvvvvv 10vvvvvv
    4       21      11110vvv 10vvvvvv 10vvvvvv 10vvvvvv
    -----   ----    -----------------------------------
    Surrogate:
    Real Unicode value = (HighSurrogate - 0xD800) * 0x400 + (LowSurrogate - 0xDC00) + 0x10000
*/
```

and then UTF-32 in [corefx/src/Common/src/CoreLib/System/Text/UTF32Encoding.cs](https://github.com/dotnet/corefx/blob/4b9fff5c022269c7dbb000bd14c10be27400beb2/src/Common/src/CoreLib/System/Text/UTF32Encoding.cs#L26-L35)

``` plaintext
/*
    words   bits    UTF-32 representation
    -----   ----    -----------------------------------
    1       16      00000000 00000000 xxxxxxxx xxxxxxxx
    2       21      00000000 000xxxxx hhhhhhll llllllll
    -----   ----    -----------------------------------
    Surrogate:
    Real Unicode value = (HighSurrogate - 0xD800) * 0x400 + (LowSurrogate - 0xDC00) + 0x10000
*/
```

----

## Data Structures

This comment from [mono/utils/dlmalloc.c](https://github.com/mono/mono/blob/2019-02/mono/utils/dlmalloc.c#L1509-L1564) does a great job of showing how chunks of memory are arranaged by `malloc`

``` plaintext
  A chunk that's in use looks like:

   chunk-> +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
           | Size of previous chunk (if P = 1)                             |
           +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
         +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+ |P|
         | Size of this chunk                                         1| +-+
   mem-> +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
         |                                                               |
         +-                                                             -+
         |                                                               |
         +-                                                             -+
         |                                                               :
         +-      size - sizeof(size_t) available payload bytes          -+
         :                                                               |
 chunk-> +-                                                             -+
         |                                                               |
         +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
       +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+ |1|
       | Size of next chunk (may or may not be in use)               | +-+
 mem-> +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+

    And if it's free, it looks like this:

   chunk-> +-                                                             -+
           | User payload (must be in use, or we would have merged!)       |
           +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
         +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+ |P|
         | Size of this chunk                                         0| +-+
   mem-> +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
         | Next pointer                                                  |
         +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
         | Prev pointer                                                  |
         +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
         |                                                               :
         +-      size - sizeof(struct chunk) unused bytes               -+
         :                                                               |
 chunk-> +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
         | Size of this chunk                                            |
         +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
       +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+ |0|
       | Size of next chunk (must be in use, or we would have merged)| +-+
 mem-> +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
       |                                                               :
       +- User payload                                                -+
       :                                                               |
       +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
                                                                     |0|
                                                                     +-+
````

Also, from [corefx/src/Common/src/CoreLib/System/MemoryExtensions.cs](https://github.com/dotnet/corefx/blob/4b9fff5c022269c7dbb000bd14c10be27400beb2/src/Common/src/CoreLib/System/MemoryExtensions.cs#L1185-L1311) we can see how overlapping memory regions are detected: 

``` plaintext
//  Visually, the two sequences are located somewhere in the 32-bit
//  address space as follows:
//
//      [----------------------------------------------)                            normal address space
//      0                                             2³²
//                            [------------------)                                  first sequence
//                            xRef            xRef + xLength
//              [--------------------------)     .                                  second sequence
//              yRef          .         yRef + yLength
//              :             .            .     .
//              :             .            .     .
//                            .            .     .
//                            .            .     .
//                            .            .     .
//                            [----------------------------------------------)      relative address space
//                            0            .     .                          2³²
//                            [------------------)             :                    first sequence
//                            x1           .     x2            :
//                            -------------)                   [-------------       second sequence
//                                         y2                  y1
```

----

## State Machines

This comment from [mono/benchmark/zipmark.cs](https://github.com/mono/mono/blob/2019-02/mono/benchmark/zipmark.cs#L204-L237) gives a great over-view of the implementation of [RFC 1951 - DEFLATE Compressed Data Format Specification](https://www.ietf.org/rfc/rfc1951.txt)

``` plaintext
/*
 * The Deflater can do the following state transitions:
    *
    * (1) -> INIT_STATE   ----> INIT_FINISHING_STATE ---.
    *        /  | (2)      (5)                         |
    *       /   v          (5)                         |
    *   (3)| SETDICT_STATE ---> SETDICT_FINISHING_STATE |(3)
    *       \   | (3)                 |        ,-------'
    *        |  |                     | (3)   /
    *        v  v          (5)        v      v
    * (1) -> BUSY_STATE   ----> FINISHING_STATE
    *                                | (6)
    *                                v
    *                           FINISHED_STATE
    *    \_____________________________________/
    *          | (7)
    *          v
    *        CLOSED_STATE
    *
    * (1) If we should produce a header we start in INIT_STATE, otherwise
    *     we start in BUSY_STATE.
    * (2) A dictionary may be set only when we are in INIT_STATE, then
    *     we change the state as indicated.
    * (3) Whether a dictionary is set or not, on the first call of deflate
    *     we change to BUSY_STATE.
    * (4) -- intentionally left blank -- :)
    * (5) FINISHING_STATE is entered, when flush() is called to indicate that
    *     there is no more INPUT.  There are also states indicating, that
    *     the header wasn't written yet.
    * (6) FINISHED_STATE is entered, when everything has been flushed to the
    *     internal pending output buffer.
    * (7) At any time (7)
    *
    */
```

This might be pushing the definition of 'state machine' a bit far, but I wanted to include it because it shows just how complex 'exception handling' can be, from [coreclr/src/jit/jiteh.cpp](https://github.com/dotnet/coreclr/blob/9d3f264b9ef8b4715017ec615dcb6f9d57e607cc/src/jit/jiteh.cpp#L1935-L1966)

``` plaintext
// fgNormalizeEH: Enforce the following invariants:
//
//   1. No block is both the first block of a handler and the first block of a try. In IL (and on entry
//      to this function), this can happen if the "try" is more nested than the handler.
//
//      For example, consider:
//
//               try1 ----------------- BB01
//               |                      BB02
//               |--------------------- BB03
//               handler1
//               |----- try2 ---------- BB04
//               |      |               BB05
//               |      handler2 ------ BB06
//               |      |               BB07
//               |      --------------- BB08
//               |--------------------- BB09
//
//      Thus, the start of handler1 and the start of try2 are the same block. We will transform this to:
//
//               try1 ----------------- BB01
//               |                      BB02
//               |--------------------- BB03
//               handler1 ------------- BB10 // empty block
//               |      try2 ---------- BB04
//               |      |               BB05
//               |      handler2 ------ BB06
//               |      |               BB07
//               |      --------------- BB08
//               |--------------------- BB09
//
```

----

## RFC's and Specs

Next up, how the [Kestrel web-server](https://docs.microsoft.com/en-us/aspnet/core/fundamentals/servers/kestrel?view=aspnetcore-2.2) handles [RFC 7540 - Hypertext Transfer Protocol Version 2 (HTTP/2)](https://tools.ietf.org/html/rfc7540).

Firstly, from [aspnet/AspNetCore/src/Servers/Kestrel/Core/src/Internal/Http2/Http2Frame.cs](https://github.com/aspnet/AspNetCore/blob/ab3e0f953e537c71b3ba06966e6db1e88e33bc41/src/Servers/Kestrel/Core/src/Internal/Http2/Http2Frame.cs#L6-L16)

``` plaintext
/* https://tools.ietf.org/html/rfc7540#section-4.1
    +-----------------------------------------------+
    |                 Length (24)                   |
    +---------------+---------------+---------------+
    |   Type (8)    |   Flags (8)   |
    +-+-------------+---------------+-------------------------------+
    |R|                 Stream Identifier (31)                      |
    +=+=============================================================+
    |                   Frame Payload (0...)                      ...
    +---------------------------------------------------------------+
*/
```

and then in [aspnet/AspNetCore/src/Servers/Kestrel/Core/src/Internal/Http2/Http2Frame.Headers.cs](https://github.com/aspnet/AspNetCore/blob/9f1a978230cdd161998815c425bfd2d25e8436b6/src/Servers/Kestrel/Core/src/Internal/Http2/Http2Frame.Headers.cs#L6-L18)

``` plaintext
/* https://tools.ietf.org/html/rfc7540#section-6.2
    +---------------+
    |Pad Length? (8)|
    +-+-------------+-----------------------------------------------+
    |E|                 Stream Dependency? (31)                     |
    +-+-------------+-----------------------------------------------+
    |  Weight? (8)  |
    +-+-------------+-----------------------------------------------+
    |                   Header Block Fragment (*)                 ...
    +---------------------------------------------------------------+
    |                           Padding (*)                       ...
    +---------------------------------------------------------------+
*/
```

There are other notable examples in [aspnet/AspNetCore/src/Servers/Kestrel/Core/src/Internal/Http2/Http2FrameReader.cs](https://github.com/aspnet/AspNetCore/blob/9f1a978230cdd161998815c425bfd2d25e8436b6/src/Servers/Kestrel/Core/src/Internal/Http2/Http2FrameReader.cs#L15-L25) and [aspnet/AspNetCore/src/Servers/Kestrel/Core/src/Internal/Http2/Http2FrameWriter.cs](https://github.com/aspnet/AspNetCore/blob/9f1a978230cdd161998815c425bfd2d25e8436b6/src/Servers/Kestrel/Core/src/Internal/Http2/Http2FrameWriter.cs#L145-L158).

Also [RFC 3986 - Uniform Resource Identifier (URI)](https://tools.ietf.org/html/rfc3986) is discussed in [corefx/src/Common/src/System/Net/IPv4AddressHelper.Common.cs](https://github.com/dotnet/corefx/blob/4b9fff5c022269c7dbb000bd14c10be27400beb2/src/Common/src/System/Net/IPv4AddressHelper.Common.cs#L105-L113)

Finally, [RFC 7541 - HPACK: Header Compression for HTTP/2](https://httpwg.org/specs/rfc7541.html), is covered in [aspnet/AspNetCore/src/Servers/Kestrel/Core/src/Internal/Http2/HPack/HPackDecoder.cs](https://github.com/aspnet/AspNetCore/blob/9f1a978230cdd161998815c425bfd2d25e8436b6/src/Servers/Kestrel/Core/src/Internal/Http2/HPack/HPackDecoder.cs#L26-L71)

``` cs
// http://httpwg.org/specs/rfc7541.html#rfc.section.6.1
//   0   1   2   3   4   5   6   7
// +---+---+---+---+---+---+---+---+
// | 1 |        Index (7+)         |
// +---+---------------------------+
private const byte IndexedHeaderFieldMask = 0x80;
private const byte IndexedHeaderFieldRepresentation = 0x80;

// http://httpwg.org/specs/rfc7541.html#rfc.section.6.2.1
//   0   1   2   3   4   5   6   7
// +---+---+---+---+---+---+---+---+
// | 0 | 1 |      Index (6+)       |
// +---+---+-----------------------+
private const byte LiteralHeaderFieldWithIncrementalIndexingMask = 0xc0;
private const byte LiteralHeaderFieldWithIncrementalIndexingRepresentation = 0x40;

// http://httpwg.org/specs/rfc7541.html#rfc.section.6.2.2
//   0   1   2   3   4   5   6   7
// +---+---+---+---+---+---+---+---+
// | 0 | 0 | 0 | 0 |  Index (4+)   |
// +---+---+-----------------------+
private const byte LiteralHeaderFieldWithoutIndexingMask = 0xf0;
private const byte LiteralHeaderFieldWithoutIndexingRepresentation = 0x00;

// http://httpwg.org/specs/rfc7541.html#rfc.section.6.2.3
//   0   1   2   3   4   5   6   7
// +---+---+---+---+---+---+---+---+
// | 0 | 0 | 0 | 1 |  Index (4+)   |
// +---+---+-----------------------+
private const byte LiteralHeaderFieldNeverIndexedMask = 0xf0;
private const byte LiteralHeaderFieldNeverIndexedRepresentation = 0x10;

// http://httpwg.org/specs/rfc7541.html#rfc.section.6.3
//   0   1   2   3   4   5   6   7
// +---+---+---+---+---+---+---+---+
// | 0 | 0 | 1 |   Max size (5+)   |
// +---+---------------------------+
private const byte DynamicTableSizeUpdateMask = 0xe0;
private const byte DynamicTableSizeUpdateRepresentation = 0x20;

// http://httpwg.org/specs/rfc7541.html#rfc.section.5.2
//   0   1   2   3   4   5   6   7
// +---+---+---+---+---+---+---+---+
// | H |    String Length (7+)     |
// +---+---------------------------+
private const byte HuffmanMask = 0x80;
```

----

## Dates & Times

It is pretty widely accepted that [dates and times are hard](https://www.reddit.com/r/programming/comments/ln1tg/bad_timing_why_dates_and_times_are_hard/) and that's reflected in the amount of comments explaining different scenarios. For example from [corefx/src/Common/src/CoreLib/System/TimeZoneInfo.cs](https://github.com/dotnet/corefx/blob/4b9fff5c022269c7dbb000bd14c10be27400beb2/src/Common/src/CoreLib/System/TimeZoneInfo.cs#L1273-L1289)

``` plaintext
// startTime and endTime represent the period from either the start of DST to the end and
// ***does not include*** the potentially overlapped times
//
//         -=-=-=-=-=- Pacific Standard Time -=-=-=-=-=-=-
//    April 2, 2006                            October 29, 2006
// 2AM            3AM                        1AM              2AM
// |      +1 hr     |                        |       -1 hr      |
// | <invalid time> |                        | <ambiguous time> |
//                  [========== DST ========>)
//
//        -=-=-=-=-=- Some Weird Time Zone -=-=-=-=-=-=-
//    April 2, 2006                          October 29, 2006
// 1AM              2AM                    2AM              3AM
// |      -1 hr       |                      |       +1 hr      |
// | <ambiguous time> |                      |  <invalid time>  |
//                    [======== DST ========>)
//
```

Also, from [corefx/src/Common/src/CoreLib/System/TimeZoneInfo.Unix.cs](https://github.com/dotnet/corefx/blob/4b9fff5c022269c7dbb000bd14c10be27400beb2/src/Common/src/CoreLib/System/TimeZoneInfo.Unix.cs#L1244-L1265) we see some details on how 'leap-years' are handled:

``` plaintext
// should be n Julian day format which we don't support. 
// 
// This specifies the Julian day, with n between 0 and 365. February 29 is counted in leap years.
//
// n would be a relative number from the begining of the year. which should handle if the 
// the year is a leap year or not.
// 
// In leap year, n would be counted as:
// 
// 0                30 31              59 60              90      335            365
// |-------Jan--------|-------Feb--------|-------Mar--------|....|-------Dec--------|
//
// while in non leap year we'll have 
// 
// 0                30 31              58 59              89      334            364
// |-------Jan--------|-------Feb--------|-------Mar--------|....|-------Dec--------|
//
// 
// For example if n is specified as 60, this means in leap year the rule will start at Mar 1,
// while in non leap year the rule will start at Mar 2.
// 
// If we need to support n format, we'll have to have a floating adjustment rule support this case.
```

Finally, this comment from [corefx/src/System.Runtime/tests/System/TimeZoneInfoTests.cs](https://github.com/dotnet/corefx/blob/4b9fff5c022269c7dbb000bd14c10be27400beb2/src/System.Runtime/tests/System/TimeZoneInfoTests.cs#L1512-L1524) discusses invalid and ambiguous times that are covered in tests:

``` plaintext
//    March 26, 2006                            October 29, 2006
// 2AM            3AM                        2AM              3AM
// |      +1 hr     |                        |       -1 hr      |
// | <invalid time> |                        | <ambiguous time> |
//                  *========== DST ========>*

//
// * 00:59:59 Sunday March 26, 2006 in Universal converts to
//   01:59:59 Sunday March 26, 2006 in Europe/Amsterdam (NO DST)
//
// * 01:00:00 Sunday March 26, 2006 in Universal converts to
//   03:00:00 Sunday March 26, 2006 in Europe/Amsterdam (DST)
//
```

----

## Stack Layouts

To finish off, I wanted to look at 'stack layouts' because they seem to be a favourite of the .NET/Mono Runtime Engineers, there's sooo many examples!

First-up, `x68` from [coreclr/src/jit/lclvars.cpp](https://github.com/dotnet/coreclr/blob/9d3f264b9ef8b4715017ec615dcb6f9d57e607cc/src/jit/lclvars.cpp#L4309-L4374) (you can also see the [x64](https://github.com/dotnet/coreclr/blob/e277764916cbb740db199132be81701593820bb0/src/jit/lclvars.cpp#L3574-L3658), [ARM](https://github.com/dotnet/coreclr/blob/e277764916cbb740db199132be81701593820bb0/src/jit/lclvars.cpp#L3660-L3744) and [ARM64](https://github.com/dotnet/coreclr/blob/e277764916cbb740db199132be81701593820bb0/src/jit/lclvars.cpp#L3746-L3835) versions).

``` plaintext
 *  The frame is laid out as follows for x86:
 *
 *              ESP frames                
 *
 *      |                       |         
 *      |-----------------------|         
 *      |       incoming        |         
 *      |       arguments       |         
 *      |-----------------------| <---- Virtual '0'         
 *      |    return address     |         
 *      +=======================+
 *      |Callee saved registers |         
 *      |-----------------------|         
 *      |       Temps           |         
 *      |-----------------------|         
 *      |       Variables       |         
 *      |-----------------------| <---- Ambient ESP
 *      |   Arguments for the   |         
 *      ~    next function      ~ 
 *      |                       |         
 *      |       |               |         
 *      |       | Stack grows   |         
 *              | downward                
 *              V                         
 *
 *
 *              EBP frames
 *
 *      |                       |
 *      |-----------------------|
 *      |       incoming        |
 *      |       arguments       |
 *      |-----------------------| <---- Virtual '0'         
 *      |    return address     |         
 *      +=======================+
 *      |    incoming EBP       |
 *      |-----------------------| <---- EBP
 *      |Callee saved registers |         
 *      |-----------------------|         
 *      |   security object     |
 *      |-----------------------|
 *      |     ParamTypeArg      |
 *      |-----------------------|
 *      |  Last-executed-filter |
 *      |-----------------------|
 *      |                       |
 *      ~      Shadow SPs       ~
 *      |                       |
 *      |-----------------------|
 *      |                       |
 *      ~      Variables        ~
 *      |                       |
 *      ~-----------------------|
 *      |       Temps           |
 *      |-----------------------|
 *      |       localloc        |
 *      |-----------------------| <---- Ambient ESP
 *      |   Arguments for the   |
 *      |    next function      ~
 *      |                       |
 *      |       |               |
 *      |       | Stack grows   |
 *              | downward
 *              V
 *
 ```

Not to be left out, Mono has some nice examples covering [MIPS](https://github.com/mono/mono/blob/2019-02/mono/mini/mini-mips.c#L4682-L4705) (below), [PPC](https://github.com/mono/mono/blob/2019-02/mono/mini/mini-ppc.c#L4677-L4692) and [ARM](https://github.com/mono/mono/blob/2019-02/mono/mini/mini-arm.c#L6137-L6149)

``` plaintext
/*
 * Stack frame layout:
 * 
 *   ------------------- sp + cfg->stack_usage + cfg->param_area
 *      param area		incoming
 *   ------------------- sp + cfg->stack_usage + MIPS_STACK_PARAM_OFFSET
 *      a0-a3			incoming
 *   ------------------- sp + cfg->stack_usage
 *	ra
 *   ------------------- sp + cfg->stack_usage-4
 *   	spilled regs
 *   ------------------- sp + 
 *   	MonoLMF structure	optional
 *   ------------------- sp + cfg->arch.lmf_offset
 *   	saved registers		s0-s8
 *   ------------------- sp + cfg->arch.iregs_offset
 *   	locals
 *   ------------------- sp + cfg->param_area
 *   	param area		outgoing
 *   ------------------- sp + MIPS_STACK_PARAM_OFFSET
 *   	a0-a3			outgoing
 *   ------------------- sp
 *   	red zone
 */
```

Finally, there's another example [covering `[DLLImport]` callbacks](https://github.com/dotnet/coreclr/blob/9d3f264b9ef8b4715017ec615dcb6f9d57e607cc/src/vm/dllimportcallback.cpp#L254-L293) and one more [involving funclet frames in ARM64](https://github.com/dotnet/coreclr/blob/9d3f264b9ef8b4715017ec615dcb6f9d57e607cc/src/jit/codegenarm64.cpp#L791-L873), I told you there were lots!!

----

## The Rest

If you aren't sick of 'ASCII Art' by now, here's a few more examples for you to look at!!

- CoreCLR
  - <A HREF="https://github.com/dotnet/coreclr/blob/release/2.2/src/vm/arm/stubs.cpp#L1934-L1966">coreclr/stubs.cpp</A>
  - <A HREF="https://github.com/dotnet/coreclr/blob/9d3f264b9ef8b4715017ec615dcb6f9d57e607cc/src/vm/inlinetracking.h#L191-L203">coreclr/inlinetracking.h</A>
  - <A HREF="https://github.com/dotnet/coreclr/blob/9d3f264b9ef8b4715017ec615dcb6f9d57e607cc/src/vm/inlinetracking.h#L248-L260">coreclr/inlinetracking.h</A>
  - <A HREF="https://github.com/dotnet/coreclr/blob/9d3f264b9ef8b4715017ec615dcb6f9d57e607cc/src/vm/comcallablewrapper.h#L105-L131">coreclr/comcallablewrapper.h</A>
  - <A HREF="https://github.com/dotnet/coreclr/blob/9d3f264b9ef8b4715017ec615dcb6f9d57e607cc/src/vm/comcallablewrapper.cpp#L1986-L2012">coreclr/comcallablewrapper.cpp</A>
  - <A HREF="https://github.com/dotnet/coreclr/blob/4e2d07b5f592627530ee5645fd94325f17ee9487/src/System.Private.CoreLib/shared/System/Runtime/InteropServices/SafeHandle.cs#L36-L46">coreclr/SafeHandle.cs</A>
  - <A HREF="https://github.com/dotnet/coreclr/blob/9d3f264b9ef8b4715017ec615dcb6f9d57e607cc/src/gc/gcpriv.h#L375-L398">coreclr/gcpriv.h</A>
  - <A HREF="https://github.com/dotnet/coreclr/blob/9d3f264b9ef8b4715017ec615dcb6f9d57e607cc/src/jit/compiler.hpp#L2081-L2104">coreclr/compiler.hpp</A>
  - <A HREF="https://github.com/dotnet/coreclr/blob/9d3f264b9ef8b4715017ec615dcb6f9d57e607cc/src/jit/optimizer.cpp#L1004-L1019">coreclr/optimizer.cpp</A>
  - <A HREF="https://github.com/dotnet/coreclr/blob/9d3f264b9ef8b4715017ec615dcb6f9d57e607cc/src/jit/codegencommon.cpp#L4858-L4911">coreclr/codegencommon.cpp</A>
  - <A HREF="https://github.com/dotnet/coreclr/blob/c4dca1072d15bdda64c754ad1ea474b1580fa554/src/jit/morph.cpp#L1768-L1785">coreclr/morph.cpp</A>
- Roslyn
  - <A HREF="https://github.com/dotnet/roslyn/blob/Visual-Studio-2017-Version-15.9/src/Compilers/Test/Resources/Core/MetadataTests/Invalid/Signatures/SignatureCycle2.il#L3-L20">roslyn/SignatureCycle2.il</A>
  - <A HREF="https://github.com/dotnet/roslyn/blob/Visual-Studio-2017-Version-15.9/src/Compilers/CSharp/Portable/Symbols/Source/SourceMemberContainerSymbol.cs#L1017-L1022">roslyn/SourceMemberContainerSymbol.cs</A>
  - <A HREF="https://github.com/dotnet/roslyn/blob/Visual-Studio-2017-Version-15.9/src/Compilers/Core/CodeAnalysisTest/RealParserTests.cs#L529-L551">roslyn/RealParserTests.cs</A>
  - <A HREF="https://github.com/dotnet/roslyn/blob/Visual-Studio-2017-Version-15.9/src/Compilers/CSharp/Portable/Compilation/CSharpSemanticModel.cs#L2718-L2759">roslyn/CSharpSemanticModel.cs</A>
- CoreFX
  - <A HREF="https://github.com/dotnet/corefx/blob/4b9fff5c022269c7dbb000bd14c10be27400beb2/src/Common/src/CoreLib/System/Decimal.DecCalc.cs#L1433-L1453">corefx/Decimal.DecCalc.cs</A>
  - <A HREF="https://github.com/dotnet/corefx/blob/4b9fff5c022269c7dbb000bd14c10be27400beb2/src/Common/src/CoreLib/System/Number.Grisu3.cs#L964-L991">corefx/Number.Grisu3.cs</A>
  - <A HREF="https://github.com/dotnet/corefx/blob/4b9fff5c022269c7dbb000bd14c10be27400beb2/src/Common/src/CoreLib/System/Buffers/Binary/Reader.cs#L89-L107">corefx/Reader.cs</A>
  - <A HREF="https://github.com/dotnet/corefx/blob/4b9fff5c022269c7dbb000bd14c10be27400beb2/src/Common/src/CoreLib/System/Globalization/Calendar.cs#L371-L400">corefx/Calendar.cs</A>
  - <A HREF="https://github.com/dotnet/corefx/blob/4b9fff5c022269c7dbb000bd14c10be27400beb2/src/Common/src/System/Collections/Generic/LargeArrayBuilder.SpeedOpt.cs#L196-L203">corefx/LargeArrayBuilder.SpeedOpt.cs</A>
  - <A HREF="https://github.com/dotnet/corefx/blob/4b9fff5c022269c7dbb000bd14c10be27400beb2/src/Common/src/CoreLib/System/Runtime/Intrinsics/Vector128.cs#L610-L625">corefx/Vector128.cs</A>
  - <A HREF="https://github.com/dotnet/corefx/blob/4b9fff5c022269c7dbb000bd14c10be27400beb2/src/System.Collections/src/System/Collections/Generic/SortedSet.cs#L18-L26">corefx/SortedSet.cs</A>
  - <A HREF="https://github.com/dotnet/corefx/blob/4b9fff5c022269c7dbb000bd14c10be27400beb2/src/System.Data.Common/src/System/Data/RbTree.cs#L75-L81">corefx/RbTree.cs</A>
  - <A HREF="https://github.com/dotnet/corefx/blob/4b9fff5c022269c7dbb000bd14c10be27400beb2/src/System.Numerics.Vectors/src/System/Numerics/Matrix4x4.cs#L818-L842">corefx/Matrix4x4.cs</A>
  - <A HREF="https://github.com/dotnet/corefx/blob/4b9fff5c022269c7dbb000bd14c10be27400beb2/src/System.Reflection.Metadata/src/System/Reflection/Metadata/BlobBuilder.cs#L396-L410">corefx/BlobBuilder.cs</A>
  - <A HREF="https://github.com/dotnet/corefx/blob/4b9fff5c022269c7dbb000bd14c10be27400beb2/src/System.Runtime.Extensions/src/System/IO/BufferedStream.cs#L909-L918">corefx/BufferedStream.cs</A>
- AspNetCore
  - <A HREF="https://github.com/aspnet/AspNetCore/blob/9f1a978230cdd161998815c425bfd2d25e8436b6/src/Servers/Kestrel/Core/src/Internal/Http2/Http2Frame.Data.cs#L6-L14">AspNetCore/Http2Frame.Data.cs</A>
  - <A HREF="https://github.com/aspnet/AspNetCore/blob/9f1a978230cdd161998815c425bfd2d25e8436b6/src/Servers/Kestrel/Core/src/Internal/Http2/Http2Frame.Ping.cs#L6-L12">AspNetCore/Http2Frame.Ping.cs</A>
  - <A HREF="https://github.com/aspnet/AspNetCore/blob/9f1a978230cdd161998815c425bfd2d25e8436b6/src/Servers/Kestrel/Core/src/Internal/Http2/Http2Frame.GoAway.cs#L6-L14">AspNetCore/Http2Frame.GoAway.cs</A>
  - <A HREF="https://github.com/aspnet/AspNetCore/blob/9f1a978230cdd161998815c425bfd2d25e8436b6/src/Servers/Kestrel/Core/src/Internal/Http2/Http2Frame.Priority.cs#L6-L12">AspNetCore/Http2Frame.Priority.cs</A>
  - <A HREF="https://github.com/aspnet/AspNetCore/blob/9f1a978230cdd161998815c425bfd2d25e8436b6/src/Servers/Kestrel/Core/src/Internal/Http2/Http2Frame.Settings.cs#L6-L13">AspNetCore/Http2Frame.Settings.cs</A>
  - <A HREF="https://github.com/aspnet/AspNetCore/blob/9f1a978230cdd161998815c425bfd2d25e8436b6/src/Servers/Kestrel/Core/src/Internal/Http2/Http2Frame.RstStream.cs#L6-L10">AspNetCore/Http2Frame.RstStream.cs</A>
  - <A HREF="https://github.com/aspnet/AspNetCore/blob/9f1a978230cdd161998815c425bfd2d25e8436b6/src/Servers/Kestrel/Core/src/Internal/Http2/Http2Frame.Continuation.cs#L6-L10">AspNetCore/Http2Frame.Continuation.cs</A>
  - <A HREF="https://github.com/aspnet/AspNetCore/blob/9f1a978230cdd161998815c425bfd2d25e8436b6/src/Servers/Kestrel/Core/src/Internal/Http2/Http2Frame.WindowUpdate.cs#L6-L10">AspNetCore/Http2Frame.WindowUpdate.cs</A>
  - <A HREF="https://github.com/aspnet/AspNetCore/blob/9f1a978230cdd161998815c425bfd2d25e8436b6/src/Servers/Kestrel/Core/src/Internal/Http2/HPack/HPackDecoder.cs#L26-L71">AspNetCore/HPackDecoder.cs</A>
  - <A HREF="https://github.com/aspnet/AspNetCore/blob/9f1a978230cdd161998815c425bfd2d25e8436b6/src/Components/Components/test/RenderTreeBuilderTest.cs#L188-L203">AspNetCore/RenderTreeBuilderTest.cs</A>
  - <A HREF="https://github.com/aspnet/AspNetCore/blob/9f1a978230cdd161998815c425bfd2d25e8436b6/src/Servers/Kestrel/test/FunctionalTests/MaxRequestBufferSizeTests.cs#L25-L45">AspNetCore/MaxRequestBufferSizeTests.cs</A>
- Mono
  - [mono/sgen/sgen-qsort.c](https://github.com/mono/mono/blob/2019-02/mono/sgen/sgen-qsort.c#L46-L53)