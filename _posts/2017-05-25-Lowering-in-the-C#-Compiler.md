---
layout: post
title: Lowering in the C# Compiler (and what happens when you misuse it)
comments: true
tags: [C#, Open Source, Roslyn]
---

Turns out that what I'd always thought of as "*Compiler magic*" or "*Syntactic sugar*" is actually known by the technical term '*Lowering*' and the C# compiler (a.k.a [Roslyn](https://github.com/dotnet/roslyn)) uses it extensively.

But what is it? Well this quote from [So You Want To Write Your Own Language?](http://www.drdobbs.com/architecture-and-design/so-you-want-to-write-your-own-language/240165488?pgno=2) gives us some idea:

> **Lowering**
> One semantic technique that is obvious in hindsight (but took Andrei Alexandrescu to point out to me) is called "lowering." It consists of, internally, rewriting more complex semantic constructs in terms of simpler ones. For example, while loops and foreach loops can be rewritten in terms of for loops. Then, the rest of the code only has to deal with for loops. This turned out to uncover a couple of latent bugs in how while loops were implemented in D, and so was a nice win. It's also used to rewrite scope guard statements in terms of try-finally statements, etc. Every case where this can be found in the semantic processing will be win for the implementation.
>
> -- by [Walter Bright](https://en.wikipedia.org/wiki/Walter_Bright) (author of the D programming language)

But if you're still not sure what it means, have a read of Eric Lippert's post on the subject, [Lowering in language design](https://ericlippert.com/2014/04/28/lowering-in-language-design-part-one/), which contains this quote:

> A common technique along the way though is to have the compiler “lower” from high-level language features to low-level language features in the *same language*.

----

As an aside, if you like reading about the **Roslyn compiler source** you may like these other posts that I've written:

- [How does the 'fixed' keyword work?]({{ base }}/2016/10/26/How-does-the-fixed-keyword-work/?recommended=1)
- [Roslyn code base - performance lessons (part 1)]({{ base }}/2014/06/05/roslyn-code-base-performance-lessons-part-1/?recommended=1)
- [Roslyn code base - performance lessons (part 2)]({{ base }}/2014/06/10/roslyn-code-base-performance-lessons-part-2/?recommended=1)

----

## What does 'Lowering' look like?

The C# compiler has used lowering for a while, one of the oldest or most recognised examples is when this code:

``` csharp
using System.Collections.Generic;
public class C {
    public IEnumerable<int> M() 
    {
        foreach (var value in new [] { 1, 2, 3, 4, 5 })
        {
            yield return value;
        }
    }
}

```

is turned into this

``` csharp
public class C
{
    [CompilerGenerated]
    private sealed class <M>d__0 : IEnumerable<int>, IEnumerable, IEnumerator<int>, IDisposable, IEnumerator
    {
        private int <>1__state;
        private int <>2__current;
        private int <>l__initialThreadId;
        public C <>4__this;
        private int[] <>s__1;
        private int <>s__2;
        private int <value>5__3;
        int IEnumerator<int>.Current
        {
            [DebuggerHidden]
            get
            {
                return this.<>2__current;
            }
        }
        object IEnumerator.Current
        {
            [DebuggerHidden]
            get
            {
                return this.<>2__current;
            }
        }
        [DebuggerHidden]
        public <M>d__0(int <>1__state)
        {
            this.<>1__state = <>1__state;
            this.<>l__initialThreadId = Environment.CurrentManagedThreadId;
        }
        [DebuggerHidden]
        void IDisposable.Dispose()
        {
        }
        bool IEnumerator.MoveNext()
        {
            int num = this.<>1__state;
            if (num != 0)
            {
                if (num != 1)
                {
                    return false;
                }
                this.<>1__state = -1;
                this.<>s__2++;
            }
            else
            {
                this.<>1__state = -1;
                this.<>s__1 = new int[] { 1, 2, 3, 4, 5 };
                this.<>s__2 = 0;
            }
            if (this.<>s__2 >= this.<>s__1.Length)
            {
                this.<>s__1 = null;
                return false;
            }
            this.<value>5__3 = this.<>s__1[this.<>s__2];
            this.<>2__current = this.<value>5__3;
            this.<>1__state = 1;
            return true;
        }
        [DebuggerHidden]
        void IEnumerator.Reset()
        {
            throw new NotSupportedException();
        }
        [DebuggerHidden]
        IEnumerator<int> IEnumerable<int>.GetEnumerator()
        {
            C.<M>d__0 <M>d__;
            if (this.<>1__state == -2 && this.<>l__initialThreadId == Environment.CurrentManagedThreadId)
            {
                this.<>1__state = 0;
                <M>d__ = this;
            }
            else
            {
                <M>d__ = new C.<M>d__0(0);
                <M>d__.<>4__this = this.<>4__this;
            }
            return <M>d__;
        }
        [DebuggerHidden]
        IEnumerator IEnumerable.GetEnumerator()
        {
            return this.System.Collections.Generic.IEnumerable<System.Int32>.GetEnumerator();
        }
    }
    [IteratorStateMachine(typeof(C.<M>d__0))]
    public IEnumerable<int> M()
    {
        C.<M>d__0 expr_07 = new C.<M>d__0(-2);
        expr_07.<>4__this = this;
        return expr_07;
    }
}
``` 

Yikes, I'm glad we don't have to write that code ourselves!! There's an entire state-machine in there, built to allow our original code to be halted/resumed each time round the loop (at the 'yield' statement).

----

## The C# compiler and 'Lowering'

But it turns out that the Roslyn compiler does *a lot* more 'lowering' than you might think. If you take a look at the code under ['/src/Compilers/CSharp/Portable/Lowering'](https://github.com/dotnet/roslyn/tree/master/src/Compilers/CSharp/Portable/Lowering) (VB.NET [equivalent here](https://github.com/dotnet/roslyn/tree/master/src/Compilers/VisualBasic/Portable/Lowering)), you see the following folders:

- [AsyncRewriter](https://github.com/dotnet/roslyn/tree/master/src/Compilers/CSharp/Portable/Lowering/AsyncRewriter)
- [IteratorRewriter](https://github.com/dotnet/roslyn/tree/master/src/Compilers/CSharp/Portable/Lowering/IteratorRewriter)
- [LambdaRewriter](https://github.com/dotnet/roslyn/tree/master/src/Compilers/CSharp/Portable/Lowering/LambdaRewriter)
- [StateMachineRewriter](https://github.com/dotnet/roslyn/tree/master/src/Compilers/CSharp/Portable/Lowering/StateMachineRewriter)

Which correspond to some C# language features you might be familar with, such as 'lambdas', i.e. `x => x.Name > 5`, 'iterators' used by `yield` (above) and the `async` keyword.

However if we look at bit deeper, under the ['LocalRewriter' folder](https://github.com/dotnet/roslyn/tree/master/src/Compilers/CSharp/Portable/Lowering/LocalRewriter) we can see lots more scenarios that we might never have considered 'lowering', such as:

- [Delegate creation](https://github.com/dotnet/roslyn/blob/master/src/Compilers/CSharp/Portable/Lowering/LocalRewriter/LocalRewriter_DelegateCreationExpression.cs)
- [Events](https://github.com/dotnet/roslyn/blob/master/src/Compilers/CSharp/Portable/Lowering/LocalRewriter/LocalRewriter_Event.cs)
- ['fixed' keyword](https://github.com/dotnet/roslyn/blob/master/src/Compilers/CSharp/Portable/Lowering/LocalRewriter/LocalRewriter_FixedStatement.cs)
- [ForEach loops](https://github.com/dotnet/roslyn/blob/master/src/Compilers/CSharp/Portable/Lowering/LocalRewriter/LocalRewriter_ForEachStatement.cs)
- ['Is' operator](https://github.com/dotnet/roslyn/blob/master/src/Compilers/CSharp/Portable/Lowering/LocalRewriter/LocalRewriter_IsOperator.cs)
- ['lock' statement](https://github.com/dotnet/roslyn/blob/master/src/Compilers/CSharp/Portable/Lowering/LocalRewriter/LocalRewriter_LockStatement.cs)
- ['?.' a.k.a the null-coalescing](https://github.com/dotnet/roslyn/blob/master/src/Compilers/CSharp/Portable/Lowering/LocalRewriter/LocalRewriter_NullCoalescingOperator.cs)
- ['stackalloc' keyword](https://github.com/dotnet/roslyn/blob/master/src/Compilers/CSharp/Portable/Lowering/LocalRewriter/LocalRewriter_StackAlloc.cs)
- ['String.Concat()'](https://github.com/dotnet/roslyn/blob/master/src/Compilers/CSharp/Portable/Lowering/LocalRewriter/LocalRewriter_StringConcat.cs)
- ['switch' statement](https://github.com/dotnet/roslyn/blob/master/src/Compilers/CSharp/Portable/Lowering/LocalRewriter/LocalRewriter_SwitchStatement.cs)
- ['throw' expression](https://github.com/dotnet/roslyn/blob/master/src/Compilers/CSharp/Portable/Lowering/LocalRewriter/LocalRewriter_ThrowStatement.cs)
- ['using' statement](https://github.com/dotnet/roslyn/blob/master/src/Compilers/CSharp/Portable/Lowering/LocalRewriter/LocalRewriter_UsingStatement.cs)
- even a ['while' loop](https://github.com/dotnet/roslyn/blob/master/src/Compilers/CSharp/Portable/Lowering/LocalRewriter/LocalRewriter_WhileStatement.cs)

So a big thank you is due to all the past and present C# language developers and designers. They did all this work for us, imagine that C# didn't have all these high-level features, we'd be stuck writing them by hand, it would be like writing Java :-)

----

## What happens when you misuse it

But of course the real fun part is 'misusing' or outright 'abusing' the compiler. So I set up a little [twitter competition](https://twitter.com/matthewwarren/status/867753577346985984) just how much 'lowering' could we get the compiler to do for us (i.e the highest ratio of 'input' lines of code to 'output' lines).

It had the following rules (see [this gist](https://gist.github.com/mattwarren/3c7cfaa245effc0a318b87f1ee5dc153) for more info):

1. You can have as many lines as you want within method `M()`
1. No single line can be longer than 100 chars
1. To get your score, divide the '# of expanded lines' by the '# of original line(s)'
   1. Based on the default **output** formatting of [https://sharplab.io](https://sharplab.io/#b:master/f:r/), no re-formatting allowed!!
   1. But you can format the **intput** however you want, i.e. make use of the full 100 chars
1. Must compile with no warnings on [https://sharplab.io](https://sharplab.io/#b:master/f:r/) (allows C# 7 features)
   1. But doesn't have to do anything sensible when run
1. You cannot modify the code that is already there, i.e. `public class C {}` and `public void M()`
   1. Cannot just add `async` to `public void M()`, that's too easy!!
1. You can add new `using ...` declarations, these do not count towards the line count

For instance with the following code (interactive version available on [sharplab.io](https://sharplab.io/#b:master/f:r/K4Zwlgdg5gBAygTxAFwKYFsDcBYAUAB2ACMAbMAYxnJIEMQQYBhGAbzxg5kNIpgDcA9mAAmMALIAKAJSt2neQDFgEcgB4UAJ0hQAfDDQoYAXhjTjegESkaACws5c8gL54nQA)):

``` csharp
using System;
public class C {
    public void M() {
        Func<string> test = () => "blah"?.ToString();
    }
}
```

This counts as **1** line of original code (only code inside method `M()` is counted)

This expands to **23** lines (again only lines of code inside the braces (`{`, `}`) of `class C` are counted. 

Giving a **total score** of **23** (23 / 1)

``` csharp
....
public class C
{
    [CompilerGenerated]
    [Serializable]
    private sealed class <>c
    {
        public static readonly C.<>c <>9;
        public static Func<string> <>9__0_0;
        static <>c()
        {
            // Note: this type is marked as 'beforefieldinit'.
            C.<>c.<>9 = new C.<>c();
        }
        internal string <M>b__0_0()
        {
            return "blah";
        }
    }
    public void M()
    {
        if (C.<>c.<>9__0_0 == null)
        {
            C.<>c.<>9__0_0 = new Func<string>(C.<>c.<>9.<M>b__0_0);
        }
    }
}
```

### Results

The first place entry was the following entry from [Schabse Laks](https://gist.github.com/mattwarren/3c7cfaa245effc0a318b87f1ee5dc153#gistcomment-2106237), which contains 9 lines-of-code inside the `M()` method:

``` csharp
using System.Linq;
using Y = System.Collections.Generic.IEnumerable<dynamic>;

public class C {
    public void M() {
((Y)null).Select(async x => await await await await await await await await await await await
await await await await await await await await await await await await await await await await
await await await await await await await await await await await await await await await await
await await await await await await await await await await await await await await await await
await await await await await await await await await await await await await await await await
await await await await await await await await await await await await await await await await
await await await await await await await await await await await await await await await await
await await await await await await await await await await await await await await await await
await await await await await await await await await await await await await await await x.x()());
    }
}
```

this expands to an impressive **7964** lines of code (yep you read that right!!) for a score of **885** (7964 / 9). The main trick he figured out was that adding more lines to the input increased the score, i.e is scales superlinearly. Although it you [take things too far](https://twitter.com/Schabse/status/867809080714313729) the compiler bails out with a pretty impressive error message:

> error CS8078: An expression is too long or complex to compile

Here's the Top 6 top results:

| Submitter | Entry | Score |
|:----------|-------|------:|
| [Schabse Laks](https://twitter.com/Schabse) | [link](https://twitter.com/Schabse/status/867808817655840768) | **885** (7964 / 9) |
| [Andrey Dyatlov](https://twitter.com/a_tessenr) | [link](https://twitter.com/a_tessenr/status/867776073735454721) | **778** (778 / 1) |
| [arlz](https://twitter.com/alrz_h) | [link](https://twitter.com/alrz_h/status/867780509627273216) | **755** (755 / 1) |
| [Andy Gocke](https://twitter.com/andygocke) * | [link](https://twitter.com/andygocke/status/867773813907312640) | **633** (633 / 1)|
| [Jared Parsons](https://twitter.com/jaredpar) * | [link](https://twitter.com/jaredpar/status/867772979698049024) | **461** (461 / 1) |
| [Jonathan Chambers](https://twitter.com/jon_cham) | [link](https://twitter.com/jon_cham/status/867759359803228162) | **384** (384 / 1) |
 
`*` = member of the Roslyn compiler team (they're not disqualified, but maybe they should have some kind of handicap applied to 'even out' the playing field?)

### Honourable mentions

However there were some other entries that whilst they didn't make it into the Top 6, are still worth a mention due to the ingenuity involved:

- Uncovering a [complier bug](https://twitter.com/a_tessenr/status/867765123745710080), kudos to [@a_tessenr](https://twitter.com/a_tessenr)
  - [GitHub bug report](https://github.com/dotnet/roslyn/issues/19778) and [fix in the compiler](https://github.com/dotnet/roslyn/pull/19784/files) that was done within a few hours!!
- Hitting an [internal compiler limit](https://twitter.com/Schabse/status/867809080714313729), nice work by [@Schabse](https://twitter.com/Schabse)
- The most [elegant attempt](https://twitter.com/NickPalladinos/status/867764488958857216) featuring a `Y combinator` by [@NickPalladinos](https://twitter.com/NickPalladinos)
- [Using VB.NET](https://twitter.com/AdamSpeight2008/status/867800480478515200) (hint: it didn't end well!!), but still a valiant attempt by [@AdamSpeight2008](https://twitter.com/AdamSpeight2008)
- The most [astheticially pleasing](https://twitter.com/leppie/status/867861870241226753) entry by [@leppie](https://twitter.com/leppie)

