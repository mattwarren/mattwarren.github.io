---
layout: post
title:  Compact strings in the CLR
comments: true
tags: [CLR, Internals]
date: 2016-09-19
codeproject: false
---

In the CLR strings are stored as a sequence of UTF-16 code units, i.e. an array of `char` items. So if we have the string 'testing', in memory it looks like this: 

!['Testing' - Unicode or UTF-16.png]({{ base }}/images/2016/09/Testing - Unicode or UTF-16.png)

But look at all those zero's, wouldn't it be more efficient if it could be stored like this instead?

!['Testing' - ASCII or UTF-8.png]({{ base }}/images/2016/09/Testing - ASCII or UTF-8.png)

Now this is a contrived example, clearly not all strings are simple `ASCII` text that can be compacted this way. Also, even though I'm an English speaker, I'm well aware that there are other languages with character sets than can only be expressed in `Unicode`. However it turns out that even in a fully internationalised modern web-application, there are still a large amount of strings that could be expressed as `ASCII`, such as:

- **Urls** - [Percent-encoding](https://en.wikipedia.org/wiki/Percent-encoding)
- **Http Headers** - [RFC 7230 3.2.4. Field Parsing](https://tools.ietf.org/html/rfc7230#section-3.2.4)

So there is still an overall memory saving if the CLR provided an implementation that stored some strings in a more compact encoding that only takes **1 byte** per character (`ASCII` or even `ISO-8859-1 (Latin-1)`) and the rest as `Unicode` (**2 bytes** per character).

**Aside:** If you are wondering "Why does C# use UTF-16 for strings?" Eric Lippert has a [great post on this exact subject](http://blog.coverity.com/2014/04/09/why-utf-16) and Jon Skeet has something interesting to say about the subject in ["Of Memory and Strings"](http://codeblog.jonskeet.uk/2011/04/05/of-memory-and-strings/)

### Real-world data

In theory this is all well and good, but what about in practice, what about a real-world example? 

Well [Nick Craver](https://twitter.com/nick_craver) a developer at Stack Overflow was kind enough to run my [Heap Analyser tool]({{ base }}/2016/09/06/Analysing-.NET-Memory-Dumps-with-CLR-MD/) one of their memory dumps:

```
.NET Memory Dump Heap Analyser - created by Matt Warren - github.com/mattwarren

Found CLR Version: v4.6.1055.00

...

Overall 30,703,367 "System.String" objects take up 4,320,235,704 bytes (4,120.10 MB)
Of this underlying byte arrays (as Unicode) take up 3,521,948,162 bytes (3,358.79 MB)
Remaining data (object headers, other fields, etc) is 798,287,542 bytes (761.31 MB), at 26 bytes per object

Actual Encoding that the "System.String" could be stored as (with corresponding data size)
    3,347,868,352 bytes are ASCII
        5,078,902 bytes are ISO-8859-1 (Latin-1)
      169,000,908 bytes are Unicode (UTF-16)
Total: 3,521,948,162 bytes (expected: 3,521,948,162)

Compression Summary:
    1,676,473,627 bytes Compressed (to ISO-8859-1 (Latin-1))
      169,000,908 bytes Uncompressed (as Unicode/UTF-16)
       30,703,367 bytes EXTRA to enable compression (one byte field, per "System.String" object)
Total: 1,876,177,902 bytes, compared to 3,521,948,162 before compression
```

([The full output is available](https://gist.github.com/NickCraver/a5e8e307702f92d343f8ec86e71646e6))

Here we can see that there are over **30 million** strings in memory, taking up **4,120 MB** out of a total heap size of **13,232 MB** (just over 30%).

Further more we can see that the raw data used by the strings (excluding the CLR Object headers) takes up **3,358 MB** when encoded as `Unicode`. However if the relevant strings were compacted to `ASCII`/`Latin-1` only **1,789 MB** would be needed to store them, a pretty impressive saving! 

----

### A proposal for compact strings in the CLR

I learnt about the idea of "Compact Strings" when reading about how they were [implemented in Java](http://openjdk.java.net/jeps/254) and so I put together a proposal for [an implementation in the CLR](https://github.com/dotnet/coreclr/issues/7083) (isn't .NET OSS Great!!).

Turns out that [Vance Morrison](https://blogs.msdn.microsoft.com/vancem/) (Performance Architect on the .NET Runtime Team) has been thinking about the same idea for quite a while: 

> To answer @mattwarren question on whether changing the internal representation of a string has been considered before, the short answer is YES. **In fact it has been a pet desire of mine for probably over a decade now.** 

He also confirmed that they've done their homework and found that a significant amount of strings could be compacted:

> What was clear now and has held true for quite sometime is that:
> Typical apps have **20% of their GC heap as strings**. Most of the 16 bit characters have 0 in their upper byte. **Thus you can save 10% of typical heaps** by encoding in various ways that eliminate these pointless upper bytes.

It's worth reading [his entire response](https://github.com/dotnet/coreclr/issues/7083#issuecomment-246420765) if you are interested in the full details of the proposal, including the trade-offs, benefits and drawbacks. 

### Implementation details

At a high-level the proposal would allow to strings to be stored in 2 formats:

- **Regular** - i.e. Unicode encoded, as they are currently stored by the CLR 
- **Compact** - ASCII, ISO-8859-1 (Latin-1) or even another format

When you create a string, the constructor would determine the most efficient encoding and encode the data in that format. The formant used would then be stored in a field, so that the encoding is always known (CLR strings are immutable). That means that each method within the string class can use this field to determine how it operates, for instance the pseudo-code for the `Equals` method is shown below:

``` csharp
public boolean Equals(string other) 
{
    if (this.type != other.type)
       return false;
    if (type == ASCII)
        return StringASCII.Equals(this, other);
    else 
        return StringLatinUTF16.Equals(this, other);
} 
```

This shows a nice property of having strings in two formats; some operations can be short-circuited, because we know that strings stored in different encodings won't be the same.

#### Advantages

- less overall **memory usage** (as-per @davidfowl ["At the top of every ASP.NET profile… strings!"](https://twitter.com/davidfowl/status/767585518854938625))
- strings become more **cache-friendly**, which *may* give better performance

#### Disadvantages

- Makes some **operations slower** due to the extra `if (type == ...)` check needed
- Breaks the `fixed` keyword, as well as COM and P/Invoke interop that **relies on the current string layout/format**
- If very few strings in the application can be compacted, this will have an **overhead for no gain**

----

### Next steps

In his reply Vance Morrison highlighted that solving the issue with the `fixed` keyword was a first step, because that has a hard dependency on the current string layout. Once that's done the real work of making large, sweeping changes to the CLR can be done:

> The main challenge is dealing with fixed, but there is also frankly at least a few man-months of simply dealing with the places in the runtime where we took a dependency on the layout of string (in the runtime, interop, and things like stringbuilder, and all the uses of 'fixed' in corefx).

> Thus it IS doable, but it is at least moderately expensive (man months), and the payoff is non-trivial but not huge.

So stay tuned, one day we might have a more compact, more efficient implementation of strings in the CLR, yay!!

----

### Further Reading

- An implementation of this idea done in the [Mono runtime](http://www.mono-project.com/docs/advanced/runtime/docs/ascii-strings/), with [accompanying discussion](https://lists.dot.net/pipermail/mono-devel-list/2016-July/043744.html)
- More info from Eric Lippert on [why .NET strings are laid out as they are](https://blogs.msdn.microsoft.com/ericlippert/2011/07/19/strings-immutability-and-persistence/)
- [UTF-8 string Library](https://github.com/dotnet/corefxlab/tree/master/src/System.Text.Utf8/System/Text/Utf8) currently being developed in the CoreFX Labs.
- Report produced by several Oracle Engineers: ["String Density: Performance and Footprint"](http://cr.openjdk.java.net/~shade/density/string-density-report.pdf)
- Report on ["State of String Density performance (May 5, 2015)"](http://cr.openjdk.java.net/~shade/density/state-of-string-density-v1.txt) in Java
- What was involved in [optimising the Java implementation](http://www.infoq.com/news/2016/02/compact-strings-Java-JDK9) (tl;dr quite a lot!!)
- [Python's Flexible String Representation](https://www.python.org/dev/peps/pep-0393/)

----

Discuss this post on [/r/programming](https://www.reddit.com/r/programming/comments/53hzrx/compact_strings_in_the_clr_a_proposal/)