---
layout: post
title: Taking a look at the ECMA-335 Standard for .NET
comments: false
codeproject: false
---

It turns out that the .NET Runtime has a *technical standard* (or *specification*), known by its full name **ECMA-335 - Common Language Infrastructure (CLI)** (not to be confused with [ECMA-334](https://www.ecma-international.org/publications/standards/Ecma-334.htm) which is the *'C# Language Specification'*). The latest update is the [6th edition from June 2012](https://www.ecma-international.org/publications/standards/Ecma-335.htm).

The specification or standard was written before [.NET Core](https://www.microsoft.com/net/learn/get-started/windows) existed, so only applies to the [.NET Framework](https://www.microsoft.com/net/download/dotnet-framework-runtime), I'd be interested to know if there are any plans for an updated version?

----

The rest of this post will take a look at the standard, exploring the contents and investigating what we can learn from it (hint: lots of *low-level details* and information about .NET *internals*)

----

## Why is it useful?

Having a standard means that different implementations, such as [Mono](http://www.mono-project.com/) and [DotNetAnywhere]({{ base }}/2017/10/19/DotNetAnywhere-an-Alternative-.NET-Runtime/) can exist, from [Common Language Runtime (CLR)](https://docs.microsoft.com/en-us/dotnet/standard/clr):

> Compilers and tools are able to produce output that the common language runtime can consume because the type system, the format of metadata, and the runtime environment (the virtual execution system) **are all defined by a public standard**, the ECMA Common Language Infrastructure specification. For more information, see [ECMA C# and Common Language Infrastructure Specifications](https://www.visualstudio.com/license-terms/ecma-c-common-language-infrastructure-standards/).

and from the CoreCLR documentation on [.NET Standards](https://github.com/dotnet/coreclr/blob/master/Documentation/project-docs/dotnet-standards.md):

> There was a very early realization by the founders of .NET that they were creating a new programming technology that had broad applicability across operating systems and CPU types and that advanced the state of the art of late 1990s (when the .NET project started at Microsoft) programming language implementation techniques. This led to considering and then pursuing standardization as an important pillar of establishing .NET in the industry.
>
> The key addition to the state of the art was support for multiple programming languages with a single language runtime, hence the name _Common Language Runtime_. There were many other smaller additions, such as value types, a simple exception model and attributes. Generics and language integrated query were later added to that list. 
>
> **Looking back, standardization was quite effective, leading to .NET having a strong presence on iOS and Android, with the Unity and Xamarin offerings, both of which use the Mono runtime. The same may end up being true for .NET on Linux.**
>
> The various .NET standards have been made meaningful by the collaboration of multiple companies and industry experts that have served on the working groups that have defined the standards. In addition (and most importantly), the .NET standards have been implemented by multiple commercial (ex: Unity IL2CPP, .NET Native) and open source (ex: Mono) implementors. The presence of multiple implementations proves the point of standardization.

As the last quote points out, the standard is not produced *solely* by Microsoft:

![Companies and Organizations that Participated]({{ base }}/images/2018/04/Companies and Organizations that Participated.png)

There is also a nice [Wikipedia page](https://en.wikipedia.org/wiki/Common_Language_Infrastructure) that has some additional information.

----

## What is in it?

At a high-level overview, the specification is divided into the following 'partitions' :

- **I: Concepts and Architecture**
  - A great introduction to the CLR itself, explaining many of the key concepts and components, as well as the rationale behind them
- **II: Metadata Definition and Semantics**
  - An explanation of the format of .NET dll/exe files, the different sections within them and how they're laid out in-memory
- **III: CIL Instruction Set**
  - A complete list of all the *Intermediate Language (IL)* instructions that the CLR understands, along with a detailed description of what they do and how to use them
- **IV: Profiles and Libraries**
  - Describes the various different 'Base Class libraries' that make-up the runtime and how they are grouped into 'Profiles'
- **V: Binary Formats (Debug Interchange Format)**
  - An overview of 'Portable CILDB files', which give a way for additional *debugging information* to be provided
- **VI: Annexes**
  - Annex A - Introduction
  - Annex B - Sample programs
  - Annex C - CIL assembler implementation
  - Annex D - Class library design guidelines
  - Annex E - Portability considerations
  - Annex F - Imprecise faults
  - Annex G - Parallel library

But, working your way through the entire specification is a mammoth task, generally I find it useful to just search for a particular word or phrase and locate the parts I need that way. However if you do want to read through one section, I recommend 'Partition I: Concepts and Architecture', at just over 100 pages it is much easier to fully digest! This section is a [very comprehensive overview](({{ base }}/images/2018/04/Partition I - Concepts and Architecture - Outline.png)) of the key concepts and components contained within the CLR and well worth a read.

Also, I'm convinced that the authors of the spec wanted to *help out* any future readers, so to break things up they included lots of very helpful diagrams:

![Type System.png]({{ base }}/images/2018/04/Figure 1 - Type System.png)

For more examples see:

- [Arrays - Multi-dimensional v Jagged]({{ base }}/images/2018/04/Arrays - Multi-dimensional v Jagged.png)
- [Relationship between correct and verifiable CIL]({{ base }}/images/2018/04/Figure 1 - Relationship between correct and verifiable CIL.png)
- [High-level view of the CLI file format]({{ base }}/images/2018/04/High-level view of the CLI file format.png)
- [Layout information for a class or value type]({{ base }}/images/2018/04/Layout information for a class or value type.png)
- [Relationship between boxed and unboxed representations of a value type]({{ base }}/images/2018/04/Relationship between boxed and unboxed representations of a value type.png)
- [Roots of the inheritance hierarchies]({{ base }}/images/2018/04/Roots of the inheritance hierarchies.png)

On top of all that, they also dropped in some [Comic Sans](https://designforhackers.com/blog/comic-sans-hate/) 😀, just to make it clear when the text is only '*informative*':

![Informative Text]({{ base }}/images/2018/04/Informative Text.png)

----

## How has it changed?

The spec has been through [6th editions](https://www.ecma-international.org/publications/standards/Ecma-335-arch.htm) and it's interesting to look at the changes over time:

| Edition | Release Date | CLR Version | Significant Changes |
|---------|--------------|-------------|-----------------|
| **1st** | December 2001 | **1.0** (February 2002) | N/A |
| **2nd** | December 2002 | **1.1** (April 2003) | |
| **3rd** | June 2005 | **2.0** (January 2006) | See below [(link)]({{ base }}/data/2018/04/ECMA-335 - 3rd edition - Changes.pdf) |
| **4th** | June 2006 |  | None, revision of 3rd edition [(link)]({{ base }}/data/2018/04/ECMA-335 - 4th edition - Changes.pdf) |
| **5th** | December 2010 | **4.0** (April 2010) | See below [(link)]({{ base }}/data/2018/04/ECMA-335 - 5th edition - Changes.pdf) |
| **6th** | June 2012 | | None, revision of 5th edition [(link)]({{ base }}/data/2018/04/ECMA-335 - 6th edition - Changes.pdf) |

However, only 2 editions contained **significant** updates, they are explained in more detail below:

### 3rd Edition [(link)]({{ base }}/data/2018/04/ECMA-335 - 3rd edition - Changes.pdf)

- Support for *generic* types and methods (see ['How generics were added to .NET']({{ base }}/2018/03/02/How-generics-were-added-to-.NET/))
- New IL instructions - `ldelem`, `stelem` and `unbox.any`
- Added the `constrained.`, `no.` and `readonly.` IL instruction prefixes
- Brand new 'namespaces' (with corresponding types) - `System.Collections.Generics`, `System.Threading.Parallel`
- New types added, including `Action<T>`, `Nullable<T>` and `ThreadStaticAttribute`

### 5th Edition [(link)]({{ base }}/data/2018/04/ECMA-335 - 6th edition - Changes.pdf)

- [Type-forwarding](https://docs.microsoft.com/en-us/dotnet/framework/app-domains/type-forwarding-in-the-common-language-runtime) added
- Semantics of ['variance'](https://blogs.msdn.microsoft.com/ericlippert/2009/12/03/exact-rules-for-variance-validity/) redefined, became a core feature
- Multiple types added or updated, including `System.Action`, `System.MulticastDelegate` and `System.WeakReference`
- `System.Math` and `System.Double` modified to better conform to IEEE

----

## Microsoft Specific Implementation

Another interesting aspect to look at is the Microsoft specific implementation details and notes. The following links are to pdf documents that are modified versions of the 4th edition:

- [Partition I: Concepts and Architecture](http://download.microsoft.com/download/7/3/3/733AD403-90B2-4064-A81E-01035A7FE13C/MS%20Partition%20I.pdf)
- [Partition II: Meta Data Definition and Semantics](http://download.microsoft.com/download/7/3/3/733AD403-90B2-4064-A81E-01035A7FE13C/MS%20Partition%20II.pdf)
- [Partition III: CIL Instruction Set](http://download.microsoft.com/download/7/3/3/733AD403-90B2-4064-A81E-01035A7FE13C/MS%20Partition%20III.pdf)
- [Partition IV: Profiles and Libraries](http://download.microsoft.com/download/7/3/3/733AD403-90B2-4064-A81E-01035A7FE13C/MS%20Partition%20IV.pdf)
- [Partition V: Debug Interchange Format](http://download.microsoft.com/download/7/3/3/733AD403-90B2-4064-A81E-01035A7FE13C/MS%20Partition%20V.pdf)
- [Partition VI: Annexes](http://download.microsoft.com/download/7/3/3/733AD403-90B2-4064-A81E-01035A7FE13C/MS%20Partition%20VI.pdf)

They all contain multiple occurrences of text like this '*Implementation Specific (Microsoft)*':

[![Microsoft Specific Implementation Notes - Partition I]({{ base }}/images/2018/04/Microsoft Specific Implementation Notes - Partition I.png)]({{ base }}/images/2018/04/Microsoft Specific Implementation Notes - Partition I.png)

----

## More Information

Finally, if you want to find out more there's a book available (affiliate link):

<a href="https://www.amazon.co.uk/Common-Language-Infrastructure-Annotated-Standard/dp/0321154932/ref=as_li_ss_il?_encoding=UTF8&pd_rd_i=0321154932&pd_rd_r=B9W686JZFFZHB6G358Y5&pd_rd_w=0luDi&pd_rd_wg=IG2lU&psc=1&refRID=B9W686JZFFZHB6G358Y5&linkCode=li3&tag=mattonsoft-21&linkId=c99e84073532318dbca0d07dc9fcb19b" target="_blank"><img border="0" src="//ws-eu.amazon-adsystem.com/widgets/q?_encoding=UTF8&ASIN=0321154932&Format=_SL250_&ID=AsinImage&MarketPlace=GB&ServiceVersion=20070822&WS=1&tag=mattonsoft-21" ></a><img src="https://ir-uk.amazon-adsystem.com/e/ir?t=mattonsoft-21&l=li3&o=2&a=0321154932" width="1" height="1" border="0" alt="" style="border:none !important; margin:0px !important;" />