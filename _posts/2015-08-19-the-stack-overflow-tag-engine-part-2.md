---
layout: post
title: The Stack Overflow Tag Engine – Part 2
date: 2015-08-19 12:35
author: matthewwarren
comments: true
categories: [indexing, stackoverflow, stackoverflow, trigrams]
---

I've added a <a href="http://mattwarren.org/resources/" target="_blank">**Resources**</a> and <a href="http://mattwarren.org/speaking/" target="_blank">**Speaking**</a> page to my site, check them out if you want to learn more. There's also a video of my NDC London 2014 talk <a href="http://mattwarren.org/speaking/#NDCLondon2014" target="_blank">"Performance is a Feature!"</a>.

---------------------------------------

#### <a name="Recap"></a>**Recap of Stack Overflow Tag Engine**

This is the long-delayed part 2 of a mini-series looking at what it *might* take to build the Stack Overflow Tag Engine, if you haven't read <a href="http://mattwarren.org/2014/11/01/the-stack-overflow-tag-engine-part-1/" target="_blank">part 1</a>, I recommend reading it first.

Since the first part was published, Stack Overflow published a nice performance report, giving some more stats on the Tag Engine Servers. As you can see they run the Tag Engine on some pretty powerful servers, but only have a peak CPU usage of 10%, which means there's plenty of overhead available. It's a nice way of being able to cope with surges in demand or busy times of the day.

<a href="https://stackexchange.com/performance" target="_blank"><img src="https://mattwarrendotorg.files.wordpress.com/2015/01/tag-server-infographic.png" alt="Tag Engine infographic" width="560" height="321" class="aligncenter size-full wp-image-1068" /></a>

### <a name="IgnoredTags"></a>**Ignored Tag Preferences**

In <a href="http://mattwarren.org/2014/11/01/the-stack-overflow-tag-engine-part-1/" target="_blank">part 1</a>, I only really covered the simple things, i.e. a basic search for all the questions that contain a given tag, along with multiple sort orders (by score, view count, etc). But the real Tag Engine does much more than that, for instance:  

<a href="https://twitter.com/marcgravell/status/522515630248189953" target="_blank"><img src="https://mattwarrendotorg.files.wordpress.com/2015/08/tweet-wildcard-exclusions.png" alt="Tweet - Wildcard exclusions" width="634" height="318" class="aligncenter size-full wp-image-1099" /></a>

What is he talking about here? Well any time you do a *tag* search, after the actual search has been done per-user exclusions can then be applied. These exclusions are configurable and allow you to set *"Ignored Tags"*, i.e. tags that you don't want to see questions for. Then when you do a search, it will exclude these questions from the results. 

Note: it will let you know if there were questions excluded due to your preferences, which is a pretty nice user-experience. If that happens, you get this message: (it can also be configured so that matching questions are greyed out instead):

<a href="https://mattwarrendotorg.files.wordpress.com/2015/08/questions-hidden-due-to-ignored-tag-preferences.png" target="_blank"><img src="https://mattwarrendotorg.files.wordpress.com/2015/08/questions-hidden-due-to-ignored-tag-preferences.png" alt="Questions hidden due to Ignored Tag preferences" width="458" height="72" class="aligncenter size-full wp-image-1100" /></a>

Now most people probably have just a few exclusions and maybe 10's at most, but fortunately <a href="https://twitter.com/leppie" target="_blank">@leppie</a> a Stack Overflow <a href="http://stackoverflow.com/users/15541/leppie" target="_blank">*power-user*</a> got in touch with me and shared his list of preferences. 
 
 https://gist.github.com/leppie/4d9b84abd8c2d06d6ef4

You'll need to scroll across to appreciate this full extent of this list, but here's some statistics to help you:
> - It contains **3,753** items, of which **210** are wildcards (e.g. cocoa\* or \*hibernate\*)
- The tags and wildcards expand to **7,677** tags in total (out of a possible 30,529 tags)
- There are **6,428,251** questions (out of 7,990,787) that have at least one of the 7,677 tags in them!

#### <a name="Wildcards"></a>**Wildcards**

If you want to see the wildcard expansion in action you can visit the url's below:

- <a href="http://stackoverflow.com/questions/tagged/*java*?sort=votes" target="_blank">\*java\*</a>  
    - [facebook-javascript-sdk] [java]  [java.util.scanner] [java-7] [java-8] [javabeans] [javac] [javadoc] [java-ee] [java-ee-6] [javafx] [javafx-2] [javafx-8] [java-io] [javamail] [java-me] [javascript] [javascript-events] [javascript-objects] [java-web-start] 
- <a href="http://stackoverflow.com/questions/tagged/.net*?sort=votes" target="_blank">.net\*</a>
    - [.net] [.net-1.0] [.net-1.1] [.net-2.0] [.net-3.0] [.net-3.5] [.net-4.0] [.net-4.5] [.net-4.5.2] [.net-4.6] [.net-assembly] [.net-cf-3.5] [.net-client-profile] [.net-core] [.net-framework-version] [.net-micro-framework] [.net-reflector] [.net-remoting] [.net-security] [.nettiers] 

Now a simple way of doing these matches is the following, i.e. loop through the wildcards and compare each one with every single tag to see if it could be expanded to match that tag. (`IsActualMatch(..)` is a simple method that does a basic string <a href="https://msdn.microsoft.com/en-us/library/baketfxw(v=vs.110).aspx" target="_blank">StartsWith</a>, <a href="https://msdn.microsoft.com/en-us/library/2333wewz(v=vs.110).aspx" target="_blank">EndsWith</a> or <a href="https://msdn.microsoft.com/en-us/library/dy85x1sa(v=vs.110).aspx" target="_blank">Contains</a> as appropriate)

``` csharp
var expandedTags = new HashSet();
foreach (var wildcard in wildcardsToExpand)
{
	if (IsWildCard(tagToExpand))
	{
		var rawTagPattern = tagToExpand.Replace("*", "");
		foreach (var tag in allTags)
		{
			if (IsActualMatch(tag, tagToExpand, rawTagPattern))
				expandedTags.Add(tag);
		}
	}
	else if (allTags.ContainsKey(tagToExpand))
	{
		expandedTags.Add(tagToExpand);
	}
}
```

This works fine with a few wildcards, but it's not very efficient. Even on a relatively small data-set containing 32,000 tags, it's slow when comparing it to 210 `wildcardsToExpand`, taking over a second. After chatting to a few of the Stack Overflow developers on Twitter, they consider a Tag Engine query that takes longer than 500 milliseconds to be slow, so a second just to apply the wildcards is unacceptable.

#### <a name="TrigramIndex"></a>**Trigram Index**

So can we do any better? Well it turns out that that there is a really nice technique for doing <a href="https://swtch.com/~rsc/regexp/regexp4.html" target="_blank">Regular Expression Matching with a Trigram Index</a> that is used in <a href="https://code.google.com/p/chromium/codesearch" target="_blank">Google Code Search</a>. I'm not going to explain all the details, the linked page has a very readable explanation. But basically what you do is create an *inverted index* of the tags and search the index instead. That way you aren't affected so much by the amount of wilcards, because you are only searching via an index rather than a full search that runs over the whole list of tags. 

For instance when using Trigrams, the tags are initially split into 3 letter chunks, for instance the expansion for the tag *javascript* is shown below ('_' is added to denote the start/end of a word):

> \_ja, jav, ava, vas, asc, scr, cri, rip, ipt, pt_

Next you create an index of all the tags as trigrams and include the position of tag they came from so that you can reference back to it later:

> - _ja -&gt; { 0, 5, 6 }
> - jav -&gt; { 0, 5, 12 }
> - ava -&gt; { 0, 5, 6 }
> - va_ -&gt; { 0, 5, 11, 13 }
> - _ne -&gt; { 1, 10, 12 }
> - net -&gt; { 1, 10, 12, 15 }
> - ...

For example if you want to match any tags that contain *java* any where in the tag, i.e. a \*java\* wildcard query, you fetch the index values for `jav` and `ava`, which gives you (from above) these 2 matching index items:

> - jav -&gt; { 0, 5, 12 }
> - ava -&gt; { 0, 5, 6 }

and you now know that the tags with index *0* and *5* are the only matches because they have `jav` and `ava` (*6* and *12* don't have both)

### <a name="Results"></a>**Results**

On my laptop I get the results shown below, where `Contains` is the naive way shown above and `Regex` is an *attempt* to make it faster by using compiled Regex queries (which was actually slower)
> ```Expanded to 7,677 tags (Contains), took 721.51 ms``` 
> ```Expanded to 7,677 tags (Regex), took 1,218.69 ms```
> **```Expanded to 7,677 tags (Trigrams), took  54.21 ms```**

As you can see, the inverted index using Trigrams is a clear winner. If you are interested, the <a href="https://github.com/mattwarren/StackOverflowTagServer/blob/master/TagServer/WildcardProcessor.cs" target="_blank">source code</a> is available on GitHub.

In this post I showed *one way* that the Tag Engine could implement wildcards matching. As I don't work at Stack Overflow there's no way of knowing if they use the same method or not, but at the very least my method is pretty quick!

### <a name="FuturePosts"></a>**Future Posts**

But there's still more things to implement, in future posts I hope to cover the following:

- <a href="http://stackoverflow.com/questions/tagged/.net+or+jquery-" target="_blank">Complex boolean queries</a>, i.e. questions tagged "c# OR .NET", ".net AND (NOT jquery)" and how to make them fast
- <a href="http://stackstatus.net/post/107352821074/outage-postmortem-january-6th-2015" target="_blank">How a DDOS attack on TagServer</a> *might* have been caused

> In October, we had a situation where a flood of crafted requests were causing high resource utilization on our Tag Engine servers, which is our internal application for associating questions and tags in a high-performance way.
