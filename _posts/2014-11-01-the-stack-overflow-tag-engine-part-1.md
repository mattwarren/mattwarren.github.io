---
layout: post
title: The Stack Overflow Tag Engine – Part 1
comments: true
tags: 
- indexing
- lucene
- stackoverflow
---

I've added a <a href="http://mattwarren.org/resources/" target="_blank">**Resources**</a> and <a href="http://mattwarren.org/speaking/" target="_blank">**Speaking**</a> page to my site, check them out if you want to learn more.

---------------------------------------

#### <a name="Introduction"></a>**Stack Overflow Tag Engine**

I first heard about the Stack Overflow <a href="http://samsaffron.com/archive/2011/10/28/in-managed-code-we-trust-our-recent-battles-with-the-net-garbage-collector" target="_blank">*Tag engine of doom*</a> when I read about <a href="http://blog.marcgravell.com/2011/10/assault-by-gc.html" target="_blank">their battle with the .NET Garbage Collector</a>. If you haven't heard of it before I recommend reading the previous links and then this interesting <a href="http://blog.marcgravell.com/2014/04/technical-debt-case-study-tags.html" target="_blank">case-study on technical debt</a>.

But if you've ever visited <a href="http://www.stackoverflow.com" target="_blank">Stack Overflow</a> you will have used it, maybe without even realising. It powers the pages under `stackoverflow.com/questions/tagged`, for instance you can find the questions tagged <a href="http://stackoverflow.com/questions/tagged/.net" target="_blank">.NET</a>, <a href="http://stackoverflow.com/questions/tagged/c%23" target="_blank">C#</a> or <a href="http://stackoverflow.com/questions/tagged/java" target="_blank">Java</a> and you get a page like this (note the related tags down the right-hand side):

<a href="http://stackoverflow.com/questions/tagged/.net" target="_blank"><img src="https://mattwarrendotorg.files.wordpress.com/2014/10/dotnet-tag.png?w=900" alt="dotNet Tag" class="aligncenter" /></a>

#### <a name="TagAPI"></a>**Tag API**
As well as simple searches, you can also tailor the results with more complex queries (you may need to be logged into the site for these links to work), so you can search for:

- <a href="http://stackoverflow.com/questions/tagged/.net+or+jquery-" target="_blank">questions tagged with .NET but not jQuery</a>
- <a href="http://stackoverflow.com/questions/tagged/c%23?order=desc&amp;sort=votes" target="_blank">the most popular C# questions (by votes)</a>
- <a href="http://stackoverflow.com/questions/tagged/xml?sort=frequent&amp;page=10&amp;pagesize=5" target="_blank">page 10 of the most frequently linked to XML question</a>
- <a href="http://stackoverflow.com/questions/tagged/.net?page=197709&amp;sort=newest&amp;pagesize=1" target="_blank">the oldest .NET question</a> 

It's worth noting that all these searches take your personal preferences into account. So if you have asked to have any tags excluded, questions containing these tags are filtered out. You can see your preferences by going to your account page and clicking on *Preferences*, the *Ignored Tags* are then listed at the bottom of the page. Apparently some power-users on the site have 100's of ignored tags, so dealing with these is a non-trivial problem.

#### <a name="DataSet"></a>**Publicly available Question Data set**

As I said I wanted to see what was involved in building a version of the Tag Engine. Fortunately, data from <a href="https://archive.org/details/stackexchange" target="_blank">all the Stack Exchange sites</a> is available to download. To keep things simple I just worked with the posts (not their entire history of edits), so I downloaded <a href="https://archive.org/download/stackexchange/stackoverflow.com-Posts.7z" target="_blank">stackoverflow.com-Posts.7z</a> (warning direct link to 5.7 GB file), which appears to contain data up-to the middle of September 2014. To give an idea of what is in the data set, a typical question looks like the .xml below. For the Tag Engine we only need the items highlighted in red, because it is only providing an index into the actual questions themselves, so we ignore any **content** and just look at the **meta-data**.

<a href="https://mattwarrendotorg.files.wordpress.com/2014/10/sample-question-parts-used-highlighted-in-red.png" target="_blank"><img src="https://mattwarrendotorg.files.wordpress.com/2014/10/sample-question-parts-used-highlighted-in-red.png?w=600" alt="Sample Question" class="aligncenter" /></a>

Below is the output of the code that runs on start-up and processes the data, you can see there are just over 7.9 millions questions in the data set, taking up just over 2GB of memory, when read into a <a href="https://github.com/mattwarren/StackOverflowTagServer/blob/master/Shared/Question.cs" target="_blank">`List`&lt;`Question`&gt;</a>.

{% highlight text %}
Took 00:00:31.623 to DE-serialise 7,990,787 Stack Overflow Questions, used 2136.50 MB of memory
Took 00:01:14.229 (74,229 ms) to group all the tags, used 2799.32 MB of memory
Took 00:00:34.148 (34,148 ms) to create all the "related" tags info, used 362.57 MB of memory
Took 00:01:31.662 (91,662 ms) to sort the 191,025 arrays
After SETUP - Using 4536.21 MB of memory in total
{% endhighlight %}

So it takes roughly *31 seconds* to de-serialise the data from disk (yay [protobuf-net](https://code.google.com/p/protobuf-net/)!) and another *3 1/2 minutes* to process and sort it. At the end we are using roughly 4.5GB of memory.

{% highlight text %}
Max LastActivityDate 14/09/2014 03:07:29
Min LastActivityDate 18/08/2008 03:34:29
Max CreationDate 14/09/2014 03:06:45
Min CreationDate 31/07/2008 21:42:52
Max Score 8596 (Id 11227809)
Min Score -147
Max ViewCount 1917888 (Id 184618)
Min ViewCount 1
Max AnswerCount 518 (Id 184618)
Min AnswerCount 0
{% endhighlight %}

Yes that's right, there is actually a Stack Overflow questions with <a href="http://stackoverflow.com/questions/184618/what-is-the-best-comment-in-source-code-you-have-ever-encountered" target="_blank">1.9 million views</a>, not surprisingly it's locked for editing, but it's also considered "not constructive"! The same question also has 518 answers, the most of any on the site and if you're wondering, the question with the highest score has an impressive 8192 votes and is titled <a href="http://stackoverflow.com/questions/11227809/why-is-processing-a-sorted-array-faster-than-an-unsorted-array" target="_blank">Why is processing a sorted array faster than an unsorted array?</a>

#### <a name="CreatingAnIndex"></a>**Creating an Index**
So what does the index actually look like, well it's basically a series of sorted lists (`List<int>') that contain an offset into the main `List<Question>` that contains all the <a href="https://github.com/mattwarren/StackOverflowTagServer/blob/master/Shared/Question.cs" target="_blank">`Question`</a> data. Or in a diagram, something like this:

<a href="https://mattwarrendotorg.files.wordpress.com/2014/11/indexing-explanation.png" target="_blank"><img src="https://mattwarrendotorg.files.wordpress.com/2014/11/indexing-explanation.png?w=760" alt="Indexing explanation" width="660" height="165" class="aligncenter size-large wp-image-1020" /></a>

**Note:** This is very similar to the way that <a href="http://lucene.apache.org/" target="_blank">Lucene</a> indexes data.

It turns out the the code to do this isn't that complex:

{% highlight csharp %}
// start with a copy of the main array, with Id's in order, { 0, 1, 2, 3, 4, 5, ..... }
tagsByLastActivityDate = new Dictionary<string, int[]>(groupedTags.Count);
var byLastActivityDate = tag.Value.Positions.ToArray(); 
Array.Sort(byLastActivityDate, comparer.LastActivityDate);
{% endhighlight %}

Where the comparer is as simple as the following (note that is sorting the `byLastActiviteDate` array, using the values in the `question` array to determine the sort order.

{% highlight csharp %}
public int LastActivityDate(int x, int y)
{
    if (questions[y].LastActivityDate == questions[x].LastActivityDate)
        return CompareId(x, y);
    // Compare LastActivityDate DESCENDING, i.e. most recent is first
    return questions[y].LastActivityDate.CompareTo(questions[x].LastActivityDate);
}
{% endhighlight %}

So once we've created the sorted list on the left and right of the diagram above (`Last Edited` and `Score`), we can just traverse them *in order* to get the indexes of the `Questions`. For instance if we walk through the `Score` array in order `(1, 2, .., 7, 8)`, collecting the Id's as we go, we end up with `{ 8, 4, 3, 5, 6, 1, 2, 7 }`, which are the array indexes for the corresponding `Questions`. The code to do this is the following, taking account of the `pageSize` and `skip` values:

{% highlight csharp %}
var result = queryInfo[tag]
        .Skip(skip)
        .Take(pageSize)
        .Select(i => questions[i])
        .ToList();
{% endhighlight %}

Once that's all done, I ended up with an API that you can query in the browser. Note that the timing is the time taken on the server-side, but it is correct, basic queries against a single tag are lightening quick!

<a href="https://pbs.twimg.com/media/B0BU8CRCcAAte5f.png:large" target="_blank"><img src="https://pbs.twimg.com/media/B0BU8CRCcAAte5f.png:large" width="610" height="600" class="aligncenter" /></a>

#### <a name="NextTime"></a>**Next time**
Now that the basic index is setup, next time I'll be looking at how to handle:

- Complex boolean queries `.net or jquery- and c#`
- Power users who have 100's of excluded tags

and anything else that I come up with in the meantime.