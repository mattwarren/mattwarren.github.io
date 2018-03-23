---
layout: post
title: How to investigate '.NET internals'
comments: false
codeproject: false
---

I recently appeared on [Herding Code](http://herdingcode.com/herding-code-228-matt-warren-on-net-internals-and-open-source-contributions/) and the [Stackify 'Developer Things'](https://stackify.com/developer-things-5-benchmarkdotnet/) podcasts and in both cases, the first question asked was '***how do you figure out the internals of the .NET runtime***'?

This post is an attempt to articulate that process, in the hope that it might be useful to others.

----

Here are my suggested steps:

1. [Decide what you want to investigate](#decide)
2. [See if someone else has already figured it out](#double-check) (optional)
3. [Read the 'Book of the Runtime'](#botr)
4. [Build from the source](#build-from-source)
5. [Debugging](#debugging)
6. [Verify against .NET Framework](#verify-net-framework) (optional)

**Note**: As with all these types of lists, just because it worked for me *doesn't* mean that it will for everyone. So, '*your milage may vary*'.

----

<span id="decide"/>
## Step One - Decide what you want to investigate

For me, this means working out **what question I'm trying to answer**, for example here are some previous posts I've written:

- [How do .NET delegates work?]({{ base }}/2017/01/25/How-do-.NET-delegates-work/)
- [Why is reflection slow?]({{ base }}/2016/12/14/Why-is-Reflection-slow/)
- [How does the 'fixed' keyword work?]({{ base }}/2016/10/26/How-does-the-fixed-keyword-work/)

(it just goes to show, you don't always need fancy titles!)

I put this as 'Step 1' because digging into .NET internals isn't quick or easy work, some of my posts take weeks to research, so I need to have a motivation to keep me going, something to focus on. In addition, the CLR isn't a small run-time, there's *a lot* in there, so just blindly trying to find your way around it isn't easy! That's why having a specific focus helps, looking at one feature or section at a time is more manageable.

The very first post where I followed this approach was [Strings and the CLR - a Special Relationship]({{ base }}/2016/05/31/Strings-and-the-CLR-a-Special-Relationship/). I'd previously spent some time looking at the [CoreCLR source](https://github.com/dotnet/coreclr) and I knew a bit about how `Strings` in the CLR worked, but not all the details. During the research of that post I then found more and more areas of the CLR that I didn't understand and the rest of my blog grew from there ([delegates]({{ base }}/2017/01/25/How-do-.NET-delegates-work/), [arrays]({{ base }}/2017/05/08/Arrays-and-the-CLR-a-Very-Special-Relationship/), [fixed keyword]({{ base }}/2016/10/26/How-does-the-fixed-keyword-work/), [type loader]({{ base }}/2017/06/15/How-the-.NET-Rutime-loads-a-Type/), etc).

**Aside:** I think this is generally applicable, if you want to start blogging, but you don't think you have enough ideas to sustain it, I'd recommend that you **start somewhere and other ideas will follow**.

Another tip is to look at [HackerNews](https://news.ycombinator.com/) or [/r/programming](https://www.reddit.com/r/programming/) for posts about the '*internals*' of other runtimes, e.g. Java, Ruby, Python, Go etc, then write the equivalent post about the CLR. One of my most popular posts [A Hitchhikers Guide to the CoreCLR Source Code]({{ base }}/2017/03/23/Hitchhikers-Guide-to-the-CoreCLR-Source-Code/) was clearly influenced by [equivalent articles](https://hn.algolia.com/?query=hitchhikers%20guide%20to&sort=byPopularity&prefix=false&page=0&dateRange=all&type=story)!

Finally, for more help with learning, '*figuring things out*' and explaining them to others, I recommend that you read anything by [Julia Evans](https://twitter.com/b0rk). Start with [Blogging principles I use](https://jvns.ca/blog/2017/03/20/blogging-principles/) and [So you want to be a wizard](https://jvns.ca/blog/so-you-want-to-be-a-wizard/) (also available [as a zine](https://twitter.com/b0rk/status/941901614796943361?lang=en)), then work your way through [all the other posts related to blogging or writing](https://jvns.ca/).

**I've been hugely influenced, for the better, by Julia's approach to blogging**.

<script async class="speakerdeck-embed" data-slide="7" data-id="b32f2c13a1644e898379ac77e6ae73fb" data-ratio="1.49926793557833" src="//speakerdeck.com/assets/embed.js"></script>

<span id="double-check"/>
## Step Two - See if someone else has already figured it out (optional)

I put this in as optional, because it depends on your motivation. If you are trying to understand .NET internals for **your own education**, then feel-free to write about whatever you want. If you are trying to do it to **also help others**, I'd recommend that you first see what's already been written about the subject. If, once you've done that you still think there is something **new or different that you can add**, then go ahead, but I try not to just re-hash what is already out there.

To see what's already been written, you can start with [Resources for Learning about .NET Internals]({{ base }}/2018/01/22/Resources-for-Learning-about-.NET-Internals/) or peruse the ['Internals' tag on this blog]({{ base }}/tags/#Internals). Another really great resource is all the [answers by Hans Passant](https://stackoverflow.com/users/17034/hans-passant?tab=answers) on StackOverflow, he is prolific and amazingly knowledgeable, here's some examples to get you started:

- [How is Math.Pow() implemented in .NET Framework?](https://stackoverflow.com/questions/8870442/how-is-math-pow-implemented-in-net-framework/8870593#8870593)
- [Understanding garbage collection in .NET](https://stackoverflow.com/questions/17130382/understanding-garbage-collection-in-net/17131389#17131389)
- [Performance differences between debug and release builds](https://stackoverflow.com/questions/4043821/performance-differences-between-debug-and-release-builds/4045073#4045073)
- [.NET JIT potential error?](https://stackoverflow.com/questions/2056948/net-jit-potential-error/2057228#2057228)
- [Why Large Object Heap and why do we care?](https://stackoverflow.com/questions/8951836/why-large-object-heap-and-why-do-we-care/8953503#8953503)
- [Performance surprise with “as” and nullable types](https://stackoverflow.com/questions/1583050/performance-surprise-with-as-and-nullable-types/3076525#3076525)
- [What is the size of a boolean In C#? Does it really take 4-bytes?](https://stackoverflow.com/questions/28514373/what-is-the-size-of-a-boolean-in-c-does-it-really-take-4-bytes/28515361#28515361)

<span id="botr"/>
## Step Three - Read the 'Book of the Runtime'

You won't get far in investigating .NET internals without coming across the ['Book of the Runtime' (BOTR)](https://github.com/dotnet/coreclr/tree/master/Documentation/botr) which is an invaluable resource, even [Scott Hanselman agrees](https://www.hanselman.com/blog/TheBookOfTheRuntimeTheInternalsOfTheNETRuntimeThatYouWontFindInTheDocumentation.aspx)!

It was written by the .NET engineering team, for the .NET engineering team, as per [this HackerNews comment](https://news.ycombinator.com/item?id=15358571):

> Having worked for 7 years on the .NET runtime team, I can attest that the BOTR is **the official reference**. It was created as documentation for the engineering team, by the engineering team. And it was (supposed to be) kept up to date any time a new feature was added or changed.

However, just a word of warning, this means that it's an in-depth, non-trivial document and hard to understand when you are first learning about a particular topic. Several of my blog posts have consisted of the following steps:

1. Read the BOTR chapter on 'Topic X'
2. Understand about 5% of what I read
3. Go away and learn more (read the source code, read other resources, etc)
4. GOTO 'Step 1', understanding more this time!

Related to this, the source code itself is often as helpful as the BOTR, due to the extensive comments, for example [this one describing the rules for prestubs](https://github.com/dotnet/coreclr/blob/release/2.0.0/src/inc/corinfo.h#L1426-L1514) really helped me out. The downside of the source code comments is that they are bit harder to find, whereas the BOTR is all in one place.

<span id="build-from-source"/>
## Step Four - Build from the source

However, at some point, just reading about the internals of the CLR isn't enough, you actually need to '*get your hands*' dirty and see it in action. Now that the Core CLR is open source it's very easy to [build it yourself](https://github.com/dotnet/coreclr#building-the-repository) and then once you've done that, there are [even more docs to help you out](https://github.com/dotnet/coreclr/tree/master/Documentation/building) if you are building on different OSes, want to debug, test CoreCLR in conjunction with CoreFX, etc.

**But why is building from source useful?**

Because it lets you build a Debug/Diagnostic version of the runtime that gives you lots of additional information that isn't available in the Release/Retails builds. For instance you can [view JIT Dumps](https://github.com/dotnet/coreclr/blob/master/Documentation/building/viewing-jit-dumps.md#setting-configuration-variables) using `COMPlus_JitDump=...`, however this is just one of many `COMPlus_XXX` settings you can use, there are [100's available](https://github.com/dotnet/coreclr/blob/master/Documentation/project-docs/clr-configuration-knobs.md).

However, even more useful is the ability to turn on diagnostic logging for a particular area of the CLR. For instance, lets imagine that we want to find out more about `AppDomains` and how they work under-the-hood, we can use the following [logging configuration settings](https://github.com/dotnet/coreclr/blob/master/Documentation/project-docs/clr-configuration-knobs.md#log-configuration-knobs):

```
SET COMPLUS_LogEnable=1
SET COMPLUS_LogToFile=1
SET COMPLUS_LogFacility=02000000
SET COMPLUS_LogLevel=A
```

Where `LogFacility` is set to `LF_APPDOMAIN`, there are many other values you can provide as a HEX bit-mask the full list is available [in the source code](https://github.com/dotnet/coreclr/blob/master/src/inc/loglf.h). If you set these variables and then run an app, you will get a log output [like this one]({{ base }}/data/2017/02/COMPLUS-AppDomain.log). Once you have this log you can very easily search around in the code to find where the messages came from, for instance here are all the places that [`LF_APPDOMAIN` is logged](https://github.com/dotnet/coreclr/search?utf8=%E2%9C%93&q=LF_APPDOMAIN&type=). This is a great technique to find your way into a section of the CLR that you aren't familiar with, I've used it many times to great effect.

<span id="debugging"/>
## Step Five - Debugging

For me, biggest boon of [Microsoft open sourcing .NET]({{ base }}/2017/12/19/Open-Source-.Net-3-years-later) is that you can discover so much more about the internals **without** having to resort to 'old school' [debugging using WinDBG](https://docs.microsoft.com/en-us/windows-hardware/drivers/debugger/getting-started-with-windbg). But there still comes a time when it's useful to step through the code line-by-line to see what's going on. The added advantage of having the source code is that you can build a copy locally and then debug through that [using Visual Studio](https://github.com/dotnet/coreclr/blob/master/Documentation/building/debugging-instructions.md) which is slightly easier than WinDBG.

I always leave debugging to last, as it can be time-consuming and I only find it helpful when I already know where to set a breakpoint, i.e. I already know which part of the code I want to step through. I once tried to blindly step through the source of the CLR [whilst it was starting up]({{ base }}/2017/02/07/The-68-things-the-CLR-does-before-executing-a-single-line-of-your-code/) and it was very hard to see what was going on, as I've said before the CLR is a complex runtime, there are many things happening, so stepping through lots of code, line-by-line can get tricky.

<span id="verify-net-framework"/>
## Step Six - Verify against .NET Framework

I put this final step in because the .NET CLR source [available on GitHub](https://github.com/dotnet/coreclr) is the '.NET Core' version of the runtime, which isn't the same as the full/desktop .NET Framework that's been around for years. So you may need to verify the behavior matches, if you want to understand the internals '*as they were*', not just '*as they will be*' going forward. For instance .NET Core has removed the ability to [create App Domains](https://github.com/dotnet/corefx/blob/master/Documentation/project-docs/porting.md#app-domains) as a way to provide isolation but interestingly enough the [internal class lives on](https://github.com/dotnet/coreclr/blob/master/src/vm/appdomain.cpp)!

To verify the behaviour, your main option is to [debug the CLR using WinDBG](https://docs.microsoft.com/en-us/windows-hardware/drivers/debugger/getting-started-with-windbg). Beyond that, you can resort to looking at the ['Rotor' source code](https://msdn.microsoft.com/en-us/library/cc749640.aspx) (roughly the same as .NET Framework 2.0), or petition Microsoft the release the .NET Framework Source Code (probably not going to happen)!

However, low-level internals don't change all that often, so more often than not the way things behave in the CoreCLR is the same as they've always worked.

----

# Resources

Finally, for your viewing pleasure, here are a few talks related to '*.NET Internals*':

- [.NET Unboxed 2015 - Geoff Norton - Open Source Hacking the CoreCLR](https://www.youtube.com/watch?v=iQRVJHab4MM)
- [.NET Core on Unix - Jan Vorlicek](https://www.youtube.com/watch?v=JNmUz7C1usM)
- [.NET Internals 2015-03-04: .NET Core & Cross Platform](https://channel9.msdn.com/Blogs/dotnet/NET-Foundations-2015-03-04)
- [.NET Internals 2015-02-25: Open Source](https://channel9.msdn.com/Blogs/dotnet/NET-Foundations-2015-02-25)