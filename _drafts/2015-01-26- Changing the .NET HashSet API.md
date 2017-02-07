---
layout: post
title: Changing the .NET HashSet API
date: 2015-01-26 10:03
author: matthewwarren
comments: true
categories: [Uncategorized]
---
https://github.com/dotnet/corefx/issues/382

https://github.com/dotnet/corefx/issues/498
http://referencesource.microsoft.com/#System.Core/System/Collections/Generic/HashSet.cs,430

http://www.infoq.com/news/2015/01/API-Review
http://www.infoq.com/news/2015/01/API-Review-2

https://github.com/dotnet/apireviews/blob/master/2015-01-14-misc/README.md#382-add-constructor-to-hashsett-that-allows-the-initial-capacity-to-be-specified

http://channel9.msdn.com/Series/NET-Framework/NET-Core-API-Review-2015-01-14
http://channel9.msdn.com/Series/NET-Framework/NET-Core-API-Review-2015-01-14#time=1h11m46s

Maybe do a mockup of where my new ctor method will go ;-)
https://msdn.microsoft.com/en-us/library/bb354549(v=vs.110).aspx

Port [#2862](https://github.com/dotnet/corefx/pull/2862) from Future to Master.
https://github.com/dotnet/corefx/pull/12600
