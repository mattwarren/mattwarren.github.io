---
layout: post
title: Open Source including Noda Time & AutoFixture  - performance lessons
date: 2014-07-29 09:50
author: matthewwarren
comments: true
categories: [Performance, Performance Lessons]
---
Measure the improvements from these perf fixes https://code.google.com/p/noda-time/source/detail?r=af2de2c44361c031504690df55d55d296920b0a6 (from tweat https://twitter.com/jonskeet/status/482907073307758592)

NodaTime performance tests suite, run as part of the build, showing regressions!!
http://nodatime.org/benchmarks/Machine?machine=BAGPUSS64
http://nodatime.org/Benchmarks/Diff?machine=PACKAMAC&amp;left=16a90001970a.390&amp;right=e14e4f8ff5a8.389

http://msmvps.com/blogs/jon_skeet/archive/2014/07/16/micro-optimization-the-surprising-inefficiency-of-readonly-fields.aspx

Maybe add another open source library??
- What about that DI framework that had a discussion about increasing perf (need to dig out link??). See https://github.com/AutoFixture/AutoFixture/pull/218 and https://github.com/AutoFixture/AutoFixture/issues/221
- Examples from Marc Gravell FastMember??
- Ninject, dynamic code-gen, https://github.com/ninject/ninject/blob/e836ebc70ba6db870da926cc0a7daab35fbbbefa/README.markdown
