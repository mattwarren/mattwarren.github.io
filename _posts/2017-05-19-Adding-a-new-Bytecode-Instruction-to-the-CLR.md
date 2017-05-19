---
layout: post
title: Adding a new Bytecode Instruction to the CLR
comments: true
tags: [CLR, Internals, JIT Compiler]
---

Now that the [CoreCLR is open-source](https://blogs.msdn.microsoft.com/dotnet/2015/02/03/coreclr-is-now-open-source/) we can do fun things, for instance find out if it's possible to add new [IL (Intermediate Language)](https://en.wikipedia.org/wiki/Common_Intermediate_Language) instruction to the runtime. 

**TL;DR** it turns out that it's easier than you might think!! Here are the steps you need to go through:

- Step 0 - [Introduction and Background](#step-0)
- Step 1 - [Add the new IL instruction to the runtime](#step-1)
- Step 2 - [Make the Interpreter work](#step-2)
- Step 3 - [Allow the JIT recognise the new OpCode](#step-3)
- Step 4 - [Runtime code generation via Reflection.Emit](#step-4)
- Step 5 - [Future Improvements](#step-5)

----

### Step 0

But first a bit of background information. Adding a new IL instruction to the CLR is a pretty rare event, that last time is was done *for real* was in .NET 2.0 when support for generics was added. This is *part* of the reason why .NET code had good backwards-compatibility, from [Backward compatibility and the .NET Framework 4.5](https://msdn.microsoft.com/en-us/library/ff602939(v=vs.110).aspx):

> The .NET Framework 4.5 and its point releases (4.5.1, 4.5.2, 4.6, 4.6.1, 4.6.2, and 4.7) are backward-compatible with apps that were built with earlier versions of the .NET Framework. In other words, **apps and components built with previous versions will work without modification on the .NET Framework 4.5**.

**Side note**: The .NET framework *did* break backwards compatibility when moving from 1.0 to 2.0, precisely so that support for generics could be added *deep* into the runtime, i.e. with support in the IL. Java took a different decision, I guess because it had been around longer, breaking backwards-comparability was a bigger issue. See the excellent blog post [Comparing Java and C# Generics](http://www.jprl.com/Blog/archive/development/2007/Aug-31.html) for more info.

----

### Step 1

For this exercise I plan to add a new IL instruction (op-code) to the CoreCLR runtime and because I'm a raving narcissist (not really, see below) I'm going to name it after myself. So let me introduce the `matt` IL instruction, that you can use like so:

``` text
.method private hidebysig static int32 TestMattOpCodeMethod(int32 x, int32 y) 
        cil managed noinlining
{
    .maxstack 2
    ldarg.0
    ldarg.1
    matt  // yay, my name as an IL op-code!!!!
    ret
}
```

But because I'm actually a bit-British (i.e. I don't like to ['blow my own trumpet'](http://www.phrases.org.uk/meanings/68800.html)), I'm going to make the `matt` op-code almost completely pointless, it's going to do exactly the same thing as calling `Math.Max(x, y)`, i.e. just return the largest of the 2 numbers.

The other reason for naming it `matt` is that I'd really like someone to make a version of the [C# (Roslyn) compiler](https://github.com/dotnet/roslyn) that allows you to write code like this:

``` csharp
Console.WriteLine("{0} m@ {1} = {2}", 1, 7, 1 m@ 7)); // prints '1 m@ 7 = 7'
```

I definitely want the `m@` operator to be a thing (pronounced 'matt', not 'm-at'), maybe the other ['Matt Warren'](https://blogs.msdn.microsoft.com/mattwar/2004/03/05/about-me/) who works at Microsoft on the [C# Language Design Team](https://github.com/dotnet/csharplang/blob/master/meetings/2015/LDM-2015-01-21.md#design-team) can help out!! Seriously though, if anyone reading this would like to write a similar blog post, showing how you'd add the `m@` operator to the Roslyn compiler, please let me know I'd love to read it.

Now we've defined the op-code, the first step is to ensure that the run-time and tooling can recognise it. In particular we need [the IL Assembler](https://msdn.microsoft.com/en-us/library/496e4ekx(v=vs.110).aspx) (a.k.a `ilasm`) to be able to take the IL code above (`TestMattOpCodeMethod(..)`) and produce a .NET executable.

As the .NET runtime source code is nicely structured (+1 to the runtime devs), to make this possible we only need to makes changes in [opcode.def](https://github.com/dotnet/coreclr/blob/master/src/inc/opcode.def):

``` diff
--- a/src/inc/opcode.def
+++ b/src/inc/opcode.def
@@ -154,7 +154,7 @@ OPDEF(CEE_NEWOBJ,                     "newobj",           VarPop,             Pu
 OPDEF(CEE_CASTCLASS,                  "castclass",        PopRef,             PushRef,     InlineType,         IObjModel,   1,  0xFF,    0x74,    NEXT)
 OPDEF(CEE_ISINST,                     "isinst",           PopRef,             PushI,       InlineType,         IObjModel,   1,  0xFF,    0x75,    NEXT)
 OPDEF(CEE_CONV_R_UN,                  "conv.r.un",        Pop1,               PushR8,      InlineNone,         IPrimitive,  1,  0xFF,    0x76,    NEXT)
-OPDEF(CEE_UNUSED58,                   "unused",           Pop0,               Push0,       InlineNone,         IPrimitive,  1,  0xFF,    0x77,    NEXT)
+OPDEF(CEE_MATT,                       "matt",             Pop1+Pop1,          Push1,       InlineNone,         IPrimitive,  1,  0xFF,    0x77,    NEXT)
 OPDEF(CEE_UNUSED1,                    "unused",           Pop0,               Push0,       InlineNone,         IPrimitive,  1,  0xFF,    0x78,    NEXT)
 OPDEF(CEE_UNBOX,                      "unbox",            PopRef,             PushI,       InlineType,         IPrimitive,  1,  0xFF,    0x79,    NEXT)
 OPDEF(CEE_THROW,                      "throw",            PopRef,             Push0,       InlineNone,         IObjModel,   1,  0xFF,    0x7A,    THROW)
```

I just picked the first available `unused` slot and added `matt` in there. It's defined as `Pop1+Pop1` because it takes 2 values from the stack as input and `Push0` because after is has executed, a single result is pushed back onto the stack. 

**Note**: all the changes I made are [available in one-place on GitHub](https://github.com/dotnet/coreclr/compare/master...mattwarren:newOpCode) if you'd rather look at them like that.

Once this chance was done `ilasm` will successfully assembly the test code file `HelloWorld.il` that contains `TestMattOpCodeMethod(..)` as shown above:

```
λ ilasm /EXE /OUTPUT=HelloWorld.exe -NOLOGO HelloWorld.il

Assembling 'HelloWorld.il'  to EXE --> 'HelloWorld.exe'
Source file is ANSI

Assembled method HelloWorld::Main
Assembled method HelloWorld::TestMattOpCodeMethod

Creating PE file

Emitting classes:
Class 1:        HelloWorld

Emitting fields and methods:
Global
Class 1 Methods: 2;
Resolving local member refs: 1 -> 1 defs, 0 refs, 0 unresolved

Emitting events and properties:
Global
Class 1
Resolving local member refs: 0 -> 0 defs, 0 refs, 0 unresolved
Writing PE file
Operation completed successfully
```
----

### Step 2

However at this point the `matt` op-code isn't actually executed, at runtime the CoreCLR just throws an exception because it doesn't know what to do with it. As a first (simpler) step, I just wanted to make the [.NET Interpreter]({{ base }}/2017/03/30/The-.NET-IL-Interpreter/) work, so I made the following changes to wire it up:

``` diff
--- a/src/vm/interpreter.cpp
+++ b/src/vm/interpreter.cpp
@@ -2726,6 +2726,9 @@ void Interpreter::ExecuteMethod(ARG_SLOT* retVal, __out bool* pDoJmpCall, __out
         case CEE_REM_UN:
             BinaryIntOp<BIO_RemUn>();
             break;
+        case CEE_MATT:
+            BinaryArithOp<BA_Matt>();
+            break;
         case CEE_AND:
             BinaryIntOp<BIO_And>();
             break;

--- a/src/vm/interpreter.hpp
+++ b/src/vm/interpreter.hpp
@@ -298,10 +298,14 @@ void Interpreter::BinaryArithOpWork(T val1, T val2)
         {
             res = val1 / val2;
         }
-        else 
+        else if (op == BA_Rem)
         {
             res = RemFunc(val1, val2);
         }
+        else if (op == BA_Matt)
+        {
+            res = MattFunc(val1, val2);
+        }
     }
```

and then I added the methods that would actually implement the interpreted code:

``` diff
--- a/src/vm/interpreter.cpp
+++ b/src/vm/interpreter.cpp
@@ -10801,6 +10804,26 @@ double Interpreter::RemFunc(double v1, double v2)
     return fmod(v1, v2);
 }
 
+INT32 Interpreter::MattFunc(INT32 v1, INT32 v2)
+{
+	return v1 > v2 ? v1 : v2;
+}
+
+INT64 Interpreter::MattFunc(INT64 v1, INT64 v2)
+{
+	return v1 > v2 ? v1 : v2;
+}
+
+float Interpreter::MattFunc(float v1, float v2)
+{
+	return v1 > v2 ? v1 : v2;
+}
+
+double Interpreter::MattFunc(double v1, double v2)
+{
+	return v1 > v2 ? v1 : v2;
+}
```

So fairly straight-forward and the bonus is that at this point the `matt` operator is fully operational, you can actually write IL using it and it will run (interpreted only).

----

### Step 3  

However not everyone wants to [re-compile the CoreCLR]({{ base }}/2017/03/30/The-.NET-IL-Interpreter/) just to enable the Interpreter, so I want to also make it work *for real* via the Just-in-Time (JIT) compiler.

The full changes to make this work were spread across multiple files, but were mostly *housekeeping* so I won't include them all here, [check-out the full diff](https://github.com/dotnet/coreclr/compare/master...mattwarren:newOpCode) if you're interested. But the significant parts are below:

``` diff
--- a/src/jit/importer.cpp
+++ b/src/jit/importer.cpp
@@ -11112,6 +11112,10 @@ void Compiler::impImportBlockCode(BasicBlock* block)
                 oper = GT_UMOD;
                 goto MATH_MAYBE_CALL_NO_OVF;
 
+            case CEE_MATT:
+                oper = GT_MATT;
+                goto MATH_MAYBE_CALL_NO_OVF;
+
             MATH_MAYBE_CALL_NO_OVF:
                 ovfl = false;
             MATH_MAYBE_CALL_OVF:

--- a/src/vm/jithelpers.cpp
+++ b/src/vm/jithelpers.cpp
@@ -341,6 +341,14 @@ HCIMPL2(UINT32, JIT_UMod, UINT32 dividend, UINT32 divisor)
 HCIMPLEND
 
 /*********************************************************************/
+HCIMPL2(INT32, JIT_Matt, INT32 x, INT32 y)
+{
+    FCALL_CONTRACT;
+    return x > y ? x : y;
+}
+HCIMPLEND
+
+/*********************************************************************/
 HCIMPL2_VV(INT64, JIT_LDiv, INT64 dividend, INT64 divisor)
 {
     FCALL_CONTRACT;
```

In summary, these changes mean that during the JIT's ['Morph phase'](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/ryujit-overview.md#morph-blocks) the IL containing the `matt` op code is converted from:

``` text
fgMorphTree BB01, stmt 1 (before)
       [000004] ------------             ▌  return    int   
       [000002] ------------             │  ┌──▌  lclVar    int    V01 arg1        
       [000003] ------------             └──▌  m@        int   
       [000001] ------------                └──▌  lclVar    int    V00 arg0               
```

into this:

```
fgMorphTree BB01, stmt 1 (after)
       [000004] --C--+------             ▌  return    int   
       [000003] --C--+------             └──▌  call help int    HELPER.CORINFO_HELP_MATT
       [000001] -----+------ arg0 in rcx    ├──▌  lclVar    int    V00 arg0         
       [000002] -----+------ arg1 in rdx    └──▌  lclVar    int    V01 arg1                 
```

Note the call to `HELPER.CORINFO_HELP_MATT` 

When this is finally compiled into assembly code it ends up looking like so:


``` groovy
// Assembly listing for method HelloWorld:TestMattOpCodeMethod(int,int):int             
// Emitting BLENDED_CODE for X64 CPU with AVX                                           
// optimized code                                                                       
// rsp based frame                                                                      
// partially interruptible                                                              
// Final local variable assignments                                                     
//                                                                                      
//  V00 arg0         [V00,T00] (  3,  3   )     int  ->  rcx                            
//  V01 arg1         [V01,T01] (  3,  3   )     int  ->  rdx                            
//  V02 OutArgs      [V02    ] (  1,  1   )  lclBlk (32) [rsp+0x00]                     
//                                                                                      
// Lcl frame size = 40                                    
                                                                                       
G_M9261_IG01:                                                                          
       4883EC28             sub      rsp, 40                                           
                                                                                       
G_M9261_IG02:                                                                          
       E8976FEB5E           call     CORINFO_HELP_MATT                                 
       90                   nop                                                        
                                                                                       
G_M9261_IG03:                                                                          
       4883C428             add      rsp, 40                                           
       C3                   ret                                                        
```

I'm not entirely sure why there is a `nop` instruction in there? But it works, which is the main thing!!

----

### Step 4

In the CLR you can also dynamically emit code at runtime using the methods that sit under the ['System.Reflection.Emit' namespace](https://msdn.microsoft.com/en-us/library/system.reflection.emit(v=vs.110).aspx), so the last task is to add the `OpCodes.Matt` field and have it emit the correct values for the `matt` op-code.

``` diff
--- a/src/mscorlib/src/System/Reflection/Emit/OpCodes.cs
+++ b/src/mscorlib/src/System/Reflection/Emit/OpCodes.cs
@@ -139,6 +139,7 @@ internal enum OpCodeValues
         Castclass = 0x74,
         Isinst = 0x75,
         Conv_R_Un = 0x76,
+        Matt = 0x77,
         Unbox = 0x79,
         Throw = 0x7a,
         Ldfld = 0x7b,
@@ -1450,6 +1451,16 @@ private OpCodes()
             (0 << OpCode.StackChangeShift)
         );
 
+        public static readonly OpCode Matt = new OpCode(OpCodeValues.Matt,
+            ((int)OperandType.InlineNone) |
+            ((int)FlowControl.Next << OpCode.FlowControlShift) |
+            ((int)OpCodeType.Primitive << OpCode.OpCodeTypeShift) |
+            ((int)StackBehaviour.Pop1_pop1 << OpCode.StackBehaviourPopShift) |
+            ((int)StackBehaviour.Push1 << OpCode.StackBehaviourPushShift) |
+            (1 << OpCode.SizeShift) |
+            (-1 << OpCode.StackChangeShift)
+        );
+
         public static readonly OpCode Unbox = new OpCode(OpCodeValues.Unbox,
             ((int)OperandType.InlineType) |
             ((int)FlowControl.Next << OpCode.FlowControlShift) |
```

This lets us write the code shown below, which emits, compiles and then executes the `matt` op-code:

``` csharp
DynamicMethod method = new DynamicMethod(
		"TestMattOpCode", 
		returnType: typeof(int),
		parameterTypes: new [] { typeof(int), typeof(int) }, 
		m: typeof(TestClass).Module);

// Emit the IL
var generator = method.GetILGenerator();
generator.Emit(OpCodes.Ldarg_0);
generator.Emit(OpCodes.Ldarg_1);
generator.Emit(OpCodes.Matt); // Use the new 'matt' IL OpCode
generator.Emit(OpCodes.Ret);

// Compile the IL into a delegate (uses the JITter under-the-hood)
var mattOpCodeInvoker = 
    (Func<int, int, int>)method.CreateDelegate(typeof(Func<int, int, int>));

// prints "1 m@ 7 = 7"
Console.WriteLine("{0} m@ {1} = {2} (via IL Emit)", 1, 7, mattOpCodeInvoker(1, 7));
   
// prints "12 m@ 9 = 12"
Console.WriteLine("{0} m@ {1} = {2} (via IL Emit)", 12, 9, mattOpCodeInvoker(12, 9)); 
```

----

### Step 5

Finally, you may have noticed that I cheated a little bit in [Step 3](#step-3) when I made changes to the JIT. Even though what I did works, it is not the most efficient way due to the extra method call to `CORINFO_HELP_MATT`. Also the JIT generally doesn't use helper functions in this way, instead prefering to emit assembly code directly.

As a *future exercise* for anyone who has read this far (any takers?), it would be nice if the JIT emitted more efficient code. For instance if you write C# code like this (which does the same thing as the `matt` op-code):

``` csharp
private static int MaxMethod(int x, int y)
{
    return x > y ? x : y;
}
```

It's turned into the following IL by the C# compiler

```
IL to import:
IL_0000  02                ldarg.0     
IL_0001  03                ldarg.1     
IL_0002  30 02             bgt.s        2 (IL_0006)
IL_0004  03                ldarg.1     
IL_0005  2a                ret         
IL_0006  02                ldarg.0     
IL_0007  2a                ret         
```

Then when the JIT runs it's processed as 3 basic-blocks (BB01, BB02 and BB03):

```
Importing BB01 (PC=000) of 'TestNamespace.TestClass:MaxMethod(int,int):int'
    [ 0]   0 (0x000) ldarg.0
    [ 1]   1 (0x001) ldarg.1
    [ 2]   2 (0x002) bgt.s
           [000005] ------------             ▌  stmtExpr  void  (IL 0x000...  ???)
           [000004] ------------             └──▌  jmpTrue   void  
           [000002] ------------                │  ┌──▌  lclVar    int    V01 arg1         
           [000003] ------------                └──▌  >         int   
           [000001] ------------                   └──▌  lclVar    int    V00 arg0         

Importing BB03 (PC=006) of 'TestNamespace.TestClass:MaxMethod(int,int):int'
    [ 0]   6 (0x006) ldarg.0
    [ 1]   7 (0x007) ret
           [000009] ------------             ▌  stmtExpr  void  (IL 0x006...  ???)
           [000008] ------------             └──▌  return    int   
           [000007] ------------                └──▌  lclVar    int    V00 arg0         

Importing BB02 (PC=004) of 'TestNamespace.TestClass:MaxMethod(int,int):int'
    [ 0]   4 (0x004) ldarg.1
    [ 1]   5 (0x005) ret
           [000013] ------------             ▌  stmtExpr  void  (IL 0x004...  ???)
           [000012] ------------             └──▌  return    int   
           [000011] ------------                └──▌  lclVar    int    V01 arg1         
```

Before finally being turned into the following assembly code, which is way more efficient. It contains just a `cmp`, a `jg` and a couple of `mov` instructions, but crucially it's all done in-line, it doesn't need call out to another method.

``` groovy
// Assembly listing for method TestNamespace.TestClass:MaxMethod(int,int):int
// Emitting BLENDED_CODE for X64 CPU with AVX
// optimized code
// rsp based frame
// partially interruptible
// Final local variable assignments
//
//   V00 arg0         [V00,T00] (  4,  3.50)     int  ->  rcx
//   V01 arg1         [V01,T01] (  4,  3.50)     int  ->  rdx
// # V02 OutArgs      [V02    ] (  1,  1   )  lclBlk ( 0) [rsp+0x00]
//
// Lcl frame size = 0

G_M32709_IG01:

G_M32709_IG02:
       3BCA                 cmp      ecx, edx
       7F03                 jg       SHORT G_M32709_IG04
       8BC2                 mov      eax, edx

G_M32709_IG03:
       C3                   ret

G_M32709_IG04:
       8BC1                 mov      eax, ecx

G_M32709_IG05:
       C3                   ret
```

---- 

### Disclaimer/Credit

I got the idea for doing this from the Appendix of the excellent book [Shared Source CLI Essentials - Amazon](https://www.amazon.co.uk/Shared-Source-Essentials-David-Stutz/dp/059600351X/ref=as_li_ss_tl?ie=UTF8&qid=1495146939&sr=8-1-fkmr0&keywords=shared+source+essentials+sscli&linkCode=ll1&tag=mattonsoft-21&linkId=033fb897262ad494f8f5322fd9f99f66), you can also [download a copy of the 2nd edition](http://www.newardassociates.com/files/SSCLI2.pdf) if you don't want to purchase the print one.

In Appendix B the authors of the book reproduced the work that [Peter Drayton](http://www.ugidotnet.org/eventi/28/Rotor) did to add an *Exponentiation* op-code to the SSCLI, which inspired this entire post, so thanks for that!!

![Appendix B - Add a new CIL opcode.png]({{ base }}/images/2017/05/Appendix B - Add a new CIL opcode.png)


