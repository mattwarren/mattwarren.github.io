---
layout: post
title: ThreadSanitizer in .NET
date: 2014-10-16 13:57
author: matthewwarren
comments: true
categories: [Uncategorized]
---
http://googletesting.blogspot.ru/2014/06/threadsanitizer-slaughtering-data-races.html

https://code.google.com/p/thread-sanitizer/
https://code.google.com/p/thread-sanitizer/w/list
https://code.google.com/p/thread-sanitizer/wiki/Algorithm
https://code.google.com/p/thread-sanitizer/wiki/AboutRaces
https://code.google.com/p/thread-sanitizer/wiki/DeadlockDetector
https://code.google.com/p/thread-sanitizer/wiki/DetectableBugs
https://code.google.com/p/thread-sanitizer/wiki/AtomicOperations
https://code.google.com/p/thread-sanitizer/wiki/VolatileRanges

https://gcc.gnu.org/wiki/cauldron2012?action=AttachFile&amp;do=get&amp;target=kcc.pdf

http://www.slideshare.net/Devexperts/dynamic-data-race-detection-in-concurrent-java-programs
https://code.google.com/p/data-race-test/wiki/ThreadSanitizerJava
https://code.google.com/p/java-thread-sanitizer/source/browse/trunk/examples/Hello.java

Maybe talk about .NET Memory Model and what (if anything) it guarantees on top of the CPU memory model?
Reference Joe Duffy articles!!!!

First do a naive example where the instrumentation is manually inserted in to a C# programme.
Then show how it would work by using code-injection like a C# profiler/agent.
