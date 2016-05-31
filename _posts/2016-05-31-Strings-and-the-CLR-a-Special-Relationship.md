---
layout: post
title: Strings and the CLR - a Special Relationship
comments: true
tags: [.NET, CLR, Internals]
date: 2016-05-31
---

Strings and the Common Language Runtime (CLR) have a special relationship, but it's a bit different (and way less political) than the UK <-> US *special relationship* that is often talked about.

[![UK and US - Special Relationship]({{ base }}/images/2016/05/UK and US - Special Relationship.png)](http://www.bbc.com/news/uk-36084672) 

This relationship means that [Strings](https://msdn.microsoft.com/en-us/library/system.string(v=vs.110).aspx) can do things that aren't possible in the C# code that you and I can write and they also get a helping hand from the runtime to achieve maximum performance, which makes sense when you consider how ubiquitous they are in .NET applications.

## String layout in memory

Firstly strings differ from any other data type in the CLR (other than arrays) in that their size isn't fixed. Normally the .NET GC knows the size of an object when it's being allocated, because it's based on the size of the fields/properties within the object and they don't change. However in .NET a string object doesn't contain a pointer to the actual string data, which is then stored elsewhere on the heap. That raw data, the actually bytes that make up the text are contained within the string object itself. That means that the memory representation of a string looks like this:

![Memory Layout - CLR String]({{ base }}/images/2016/05/Memory Layout - CLR String.png)

The benefit is that this gives excellent memory locality and ensures that when the CLR wants to access the raw string data it doesn't have to do another pointer lookup. For more information, see the Stack Overflow questions ["Where does .NET place the String value?"](http://stackoverflow.com/questions/5240971/where-does-net-place-the-string-value) and Jon Skeet's excellent post on [strings](http://csharpindepth.com/Articles/General/Strings.aspx).

Whereas if you were to implement your own string class, like so:

``` csharp
public class MyString
{
    int Length;
    byte [] Data;
}
```

If would look like this in memory:

![Memory Layout - Custom String]({{ base }}/images/2016/05/Memory Layout - Custom String.png)

In this case, the actual string data would be held in the `byte []`, located elsewhere in memory and would therefore require a pointer reference and lookup to locate it. 

This is summarised nicely in the excellent BOTR, in in the [mscorlib section](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/mscorlib.md#interface-between-managed--clr-code):

> The managed mechanism for calling into native code must also support the special managed calling convention used by **String's constructors, where the constructor allocates the memory used by the object** (instead of the typical convention where the constructor is called after the GC allocates memory). 

## Implemented in un-managed code

Despite the [String class](https://github.com/dotnet/coreclr/blob/master/src/mscorlib/src/System/String.cs) being a managed C# source file, large parts of it are implemented in un-managed code, that is in C++ or even Assembly. For instance there are 15 methods in [String.cs](https://github.com/dotnet/coreclr/blob/master/src/mscorlib/src/System/String.cs) that have no method body, are marked as `extern` with `[MethodImplAttribute(MethodImplOptions.InternalCall)]` applied to them. This indicates that their implementations are provided elsewhere by the runtime. Again from the [mscorlib section of the BOTR](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/mscorlib.md#calling-from-managed-to-native-code) (emphasis mine)

> We have two techniques for calling into the CLR from managed code. FCall allows you to call directly into the CLR code, and provides a lot of flexibility in terms of manipulating objects, though it is easy to cause GC holes by not tracking object references correctly. QCall allows you to call into the CLR via the P/Invoke, and is much harder to accidentally mis-use than FCall. **FCalls are identified in managed code as extern methods with the MethodImplOptions.InternalCall bit set**. QCalls are static extern methods that look like regular P/Invokes, but to a library called "QCall".

### Types with a Managed/Unmanaged Duality

A consequence of Strings being implemented in unmanaged and managed code is that they [have to be defined in both](https://github.com/dotnet/coreclr/blob/master/Documentation/botr/mscorlib.md#types-with-a-managedunmanaged-duality) and those definitions must be kept in sync:

> Certain managed types must have a representation available in both managed & native code. You could ask whether the canonical definition of a type is in managed code or native code within the CLR, but the answer doesn't matter – the key thing is they must both be identical. **This will allow the CLR's native code to access fields within a managed object in a very fast, easy to use manner**. There is a more complex way of using essentially the CLR's equivalent of Reflection over MethodTables & FieldDescs to retrieve field values, but this probably doesn't perform as well as you'd like, and it isn't very usable. For commonly used types, it makes sense to declare a data structure in native code & attempt to keep the two in sync.

So in [String.cs](https://github.com/dotnet/coreclr/blob/19a88d8a92e08c8506f6e69c3964dc77329c108a/src/mscorlib/src/System/String.cs#L50-L56) we can see:

``` csharp
//NOTE NOTE NOTE NOTE
//These fields map directly onto the fields in an EE StringObject.  
//See object.h for the layout.
[NonSerialized]private int  m_stringLength;
[NonSerialized]private char m_firstChar;
```

Which corresponds to the following in [object.h](https://github.com/dotnet/coreclr/blob/19a88d8a92e08c8506f6e69c3964dc77329c108a/src/vm/object.h#L1095-L1101)

``` cpp
private:
    DWORD   m_StringLength;
    WCHAR   m_Characters[0];
```

## String Allocations

In a typical .NET program, one of the most common ways that you would allocate strings dynamically is either via `StringBuilder` or `String.Format` (which uses `StringBuilder` under the hood).

So you may have some code like this:

``` csharp
var builder = new StringBuilder();
...
builder.Append(valueX);
...
builder.Append("Some text")
...
var text = builder.ToString();
```

or 

``` csharp
var text = string.Format("{0}, {1}", valueX, valueY);
```

Then, when the `StringBuilder` `ToString()` [method is called](https://github.com/dotnet/coreclr/blob/19a88d8a92e08c8506f6e69c3964dc77329c108a/src/mscorlib/src/System/Text/StringBuilder.cs#L336), it internally calls the [FastAllocateString](https://github.com/dotnet/coreclr/blob/19a88d8a92e08c8506f6e69c3964dc77329c108a/src/mscorlib/src/System/String.cs#L1556) on the String class, which is declared like so:

``` csharp
[System.Security.SecurityCritical]  // auto-generated
[MethodImplAttribute(MethodImplOptions.InternalCall)]
internal extern static String FastAllocateString(int length);
``` 

This method is marked as `extern` and has the `[MethodImplAttribute(MethodImplOptions.InternalCall)]` attribute applied and as we saw earlier this implies it will be implemented in un-managed code by the CLR. It turns out that eventually the call stack ends up in a hand-written assembly function, called **AllocateStringFastMP_InlineGetThread** from [JitHelpers_InlineGetThread.asm](https://github.com/dotnet/coreclr/blob/19a88d8a92e08c8506f6e69c3964dc77329c108a/src/vm/amd64/JitHelpers_InlineGetThread.asm#L159-L204)

This also shows something else we talked about earlier. The assembly code is actually allocating the memory needed for the string, based on the required length that was passed in my the calling code.

``` clojure
LEAF_ENTRY AllocateStringFastMP_InlineGetThread, _TEXT
        ; We were passed the number of characters in ECX

        ; we need to load the method table for string from the global
        mov     r9, [g_pStringClass]

        ; Instead of doing elaborate overflow checks, we just limit the number of elements
        ; to (LARGE_OBJECT_SIZE - 256)/sizeof(WCHAR) or less.
        ; This will avoid avoid all overflow problems, as well as making sure
        ; big string objects are correctly allocated in the big object heap.

        cmp     ecx, (ASM_LARGE_OBJECT_SIZE - 256)/2
        jae     OversizedString

        mov     edx, [r9 + OFFSET__MethodTable__m_BaseSize]

        ; Calculate the final size to allocate.
        ; We need to calculate baseSize + cnt*2, 
        ; then round that up by adding 7 and anding ~7.

        lea     edx, [edx + ecx*2 + 7]
        and     edx, -8

        PATCHABLE_INLINE_GETTHREAD r11, AllocateStringFastMP_InlineGetThread__PatchTLSOffset
        mov     r10, [r11 + OFFSET__Thread__m_alloc_context__alloc_limit]
        mov     rax, [r11 + OFFSET__Thread__m_alloc_context__alloc_ptr]

        add     rdx, rax

        cmp     rdx, r10
        ja      AllocFailed

        mov     [r11 + OFFSET__Thread__m_alloc_context__alloc_ptr], rdx
        mov     [rax], r9

        mov     [rax + OFFSETOF__StringObject__m_StringLength], ecx

ifdef _DEBUG
        call    DEBUG_TrialAllocSetAppDomain_NoScratchArea
endif ; _DEBUG

        ret

    OversizedString:
    AllocFailed:
        jmp     FramedAllocateString
LEAF_END AllocateStringFastMP_InlineGetThread, _TEXT
```

There is also a less optimised version called **AllocateStringFastMP** from [JitHelpers_Slow.asm](https://github.com/dotnet/coreclr/blob/19a88d8a92e08c8506f6e69c3964dc77329c108a/src/vm/amd64/JitHelpers_Slow.asm#L274-L322). The reason for the different versions is explained in [jinterfacegen.cpp](https://github.com/dotnet/coreclr/blob/19a88d8a92e08c8506f6e69c3964dc77329c108a/src/vm/jitinterfacegen.cpp#L31-L46) and then at run-time the decision is made as to which one to use, [depending on the state of the Thread-local storage](https://github.com/dotnet/coreclr/blob/19a88d8a92e08c8506f6e69c3964dc77329c108a/src/vm/jitinterfacegen.cpp#L234-L254)

``` cpp
// These are the fastest(?) versions of JIT helpers as they have the code to 
// GetThread patched into them that does not make a call.
EXTERN_C Object* JIT_TrialAllocSFastMP_InlineGetThread(CORINFO_CLASS_HANDLE typeHnd_);
EXTERN_C Object* JIT_BoxFastMP_InlineGetThread (CORINFO_CLASS_HANDLE type, void* unboxedData);
EXTERN_C Object* AllocateStringFastMP_InlineGetThread (CLR_I4 cch);
EXTERN_C Object* JIT_NewArr1OBJ_MP_InlineGetThread (CORINFO_CLASS_HANDLE arrayTypeHnd_, INT_PTR size);
EXTERN_C Object* JIT_NewArr1VC_MP_InlineGetThread (CORINFO_CLASS_HANDLE arrayTypeHnd_, INT_PTR size);

// This next set is the fast version that invoke GetThread but is still faster 
// than the VM implementation (i.e. the "slow" versions).
EXTERN_C Object* JIT_TrialAllocSFastMP(CORINFO_CLASS_HANDLE typeHnd_);
EXTERN_C Object* JIT_TrialAllocSFastSP(CORINFO_CLASS_HANDLE typeHnd_);
EXTERN_C Object* JIT_BoxFastMP (CORINFO_CLASS_HANDLE type, void* unboxedData);
EXTERN_C Object* JIT_BoxFastUP (CORINFO_CLASS_HANDLE type, void* unboxedData);
EXTERN_C Object* AllocateStringFastMP (CLR_I4 cch);
EXTERN_C Object* AllocateStringFastUP (CLR_I4 cch);
```

## String Length

The final example of the "special relationship" is shown by how the string `Length` property is optimised by the run-time. Finding the length of a string is a very common operation and because .NET [strings are immutable](https://msdn.microsoft.com/en-us/library/362314fe.aspx) should also be very quick, because the value can be calculated once and then cached.

As we can see in the comment from [String.cs](https://github.com/dotnet/coreclr/blob/19a88d8a92e08c8506f6e69c3964dc77329c108a/src/mscorlib/src/System/String.cs#L963-L975), the CLR ensures that this is true by implementing it in such a way that the JIT can optimise for it:

``` cs
// Gets the length of this string
//
/// This is a EE implemented function so that the JIT can recognise is specially
/// and eliminate checks on character fetches in a loop like:
///        for(int i = 0; i < str.Length; i++) str[i]
/// The actually code generated for this will be one instruction and will be inlined.
//
// Spec#: Add postcondition in a contract assembly.  Potential perf problem.
public extern int Length {
    [System.Security.SecuritySafeCritical]  // auto-generated
    [MethodImplAttribute(MethodImplOptions.InternalCall)]
    get;
}
```

This code is implemented in [stringnative.cpp](https://github.com/dotnet/coreclr/blob/19a88d8a92e08c8506f6e69c3964dc77329c108a/src/classlibnative/bcltype/stringnative.cpp#L492-L504), which in turn calls `GetStringLength`:

``` cpp
FCIMPL1(INT32, COMString::Length, StringObject* str) {
    FCALL_CONTRACT;

    FC_GC_POLL_NOT_NEEDED();
    if (str == NULL)
        FCThrow(kNullReferenceException);

    FCUnique(0x11);
    return str->GetStringLength();
}
FCIMPLEND

```

Which is a [simple method call](https://github.com/dotnet/coreclr/blob/19a88d8a92e08c8506f6e69c3964dc77329c108a/src/vm/object.h#L1113) that the JIT can inline:

``` cpp
DWORD   GetStringLength()   { LIMITED_METHOD_DAC_CONTRACT; return( m_StringLength );}
```

## Why have a special relationship?

In one word **performance**, strings are widely used in .NET programs and therefore need to be as optimised, space efficient and cache-friendly as possible. That's why they gone to great length, including implementing methods in assembly and ensuring that the JIT can optimised code as much as possible.

Interesingly enought one of the .NET developers recently made a comment about this on a [GitHub issue](https://github.com/dotnet/coreclr/issues/4703#issuecomment-216071622), in response to a query asking why more string functions weren't implemented in managed code they said:

> We have looked into this in the past and moved everything that could be moved without significant perf loss. Moving more depends on having pretty good managed optimizations for all coreclr architectures.

> This makes sense to consider only once RyuJIT or better codegen is available for all architectures that coreclr runs on (x86, x64, arm, arm64).