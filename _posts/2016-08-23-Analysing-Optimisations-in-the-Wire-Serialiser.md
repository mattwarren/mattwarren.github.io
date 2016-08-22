---
layout: post
title: Analysing Optimisations in the Wire Serialiser
comments: true
tags: [Benchmarking, Performance, Optimisations]
date: 2016-08-23

---

Recently [Roger Alsing](twitter.com/RogerAlsing) wrote a post titled [Wire – Writing one of the fastest .NET serializers](https://rogeralsing.com/2016/08/16/wire-writing-one-of-the-fastest-net-serializers/), describing the optimisation that were implemented to make [Wire](https://github.com/akkadotnet/Wire) as fast as possible. He also followed up that post with a set of [benchmarks](https://twitter.com/RogerAlsing/status/767320145807147008), showing how Wire compared to other .NET serialisers:

[![Wire compared to other .NET serialisers]({{ base }}/images/2016/08/Performance Graphs - Wire v. other Serialisers.jpg)]({{ base }}/images/2016/08/Performance Graphs - Wire v. other Serialisers.jpg)

Using [BenchmarkDotNet](https://perfdotnet.github.io/BenchmarkDotNet/), this post will analyse the individual optimisations and show how much faster each change is. For reference, the full list of optimisations in the [original blog post](https://rogeralsing.com/2016/08/16/wire-writing-one-of-the-fastest-net-serializers/) are:

- Looking up value serializers by type
- Looking up types when deserializing
- Byte buffers, allocations and GC
- Clever allocations
- Boxing, Unboxing and Virtual calls
- Fast creation of empty objects

----

### Looking up value serializers by type

[Full benchmark code and results](https://gist.github.com/mattwarren/af0319dc908449239cd3d135e76de4a8)
[![LookingUpValueSerializersByType-Results]({{ base }}/images/2016/08/LookingUpValueSerializersByType-Results.png)]({{ base }}/images/2016/08/LookingUpValueSerializersByType-Results.png)

### Looking up types when deserializing

[Full benchmark code and results](https://gist.github.com/mattwarren/da62343df8fbdc5378df21e49df6a7c3)
[![LookingUpTypesWhenDeserializing-Results]({{ base }}/images/2016/08/LookingUpTypesWhenDeserializing-Results.png)]({{ base }}/images/2016/08/LookingUpTypesWhenDeserializing-Results.png)

P.R to completely reduce allocations, by using a Custom Comparer rather than the default Struct comparer. See https://github.com/akkadotnet/Wire/pull/76

### Byte buffers, allocations and GC 

(a.k.a String Serialisation and Deserialisation), also includes section "Buffer recycling"

**Note:** this demonstrates how BenchmarkDotNet can show you [memory allocations]({{ base }}/2016/02/17/adventures-in-benchmarking-memory-allocations/) as well as the time taken.

[Full benchmark code and results](https://gist.github.com/mattwarren/e6856ab4625d4e306cc04b9349edd869)
[![StringSerialisationDeserialisation-Results]({{ base }}/images/2016/08/StringSerialisationDeserialisation-Results.png)]({{ base }}/images/2016/08/StringSerialisationDeserialisation-Results.png)
 
### Clever allocations 

(a.k.a FastTypeUShortDictionary)

[Full benchmark code and results](https://gist.github.com/mattwarren/8db32ee21750082d630cb663a7bfc37b)
[![FastTypeUShortDictionary-Results]({{ base }}/images/2016/08/FastTypeUShortDictionary-Results.png)]({{ base }}/images/2016/08/FastTypeUShortDictionary-Results.png)

[Full benchmark code and results](https://gist.github.com/mattwarren/ed18d27c66e3e539b068371a0dca98f2)
[![FastTypeUShortDictionary-Alternative-Results]({{ base }}/images/2016/08/FastTypeUShortDictionary-Alternative-Results.png)]({{ base }}/images/2016/08/FastTypeUShortDictionary-Alternative-Results.png)

### Boxing, Unboxing and Virtual calls 

(a.k.a Dynamic Code Generation)

[Full benchmark code and results](https://gist.github.com/mattwarren/9fb3084306f065e95b4712d51fe36217)
[![DynamicCodeGeneration-Results]({{ base }}/images/2016/08/DynamicCodeGeneration-Results.png)]({{ base }}/images/2016/08/DynamicCodeGeneration-Results.png)

### Fast creation of empty objects

[Full benchmark code and results](https://gist.github.com/mattwarren/b48b3e5a720b174e64f16353d8ce9960)
[![FastCreationOfEmptyObjects-Results]({{ base }}/images/2016/08/FastCreationOfEmptyObjects-Results.png)]({{ base }}/images/2016/08/FastCreationOfEmptyObjects-Results.png)
 
