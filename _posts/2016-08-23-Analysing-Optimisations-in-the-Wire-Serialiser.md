---
layout: post
title: Analysing Optimisations in the Wire Serialiser
comments: true
tags: [Benchmarking, Performance, Optimisations]
date: 2016-08-23

---

Recently [Roger Johansson](twitter.com/RogerAlsing) wrote a post titled [Wire – Writing one of the fastest .NET serializers](https://rogeralsing.com/2016/08/16/wire-writing-one-of-the-fastest-net-serializers/), describing the optimisation that were implemented to make [Wire](https://github.com/akkadotnet/Wire) as fast as possible. He also followed up that post with a set of [benchmarks](https://twitter.com/RogerAlsing/status/767320145807147008), showing how Wire compared to other .NET serialisers:

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

This optimisation changed code like this:

``` csharp
public ValueSerializer GetSerializerByType(Type type)
{
  ValueSerializer serializer;
 
  if (_serializers.TryGetValue(type, out serializer))
    return serializer;
 
  //more code to build custom type serializers.. ignore for now.
}
```

into:

``` csharp
public ValueSerializer GetSerializerByType(Type type)
{
  if (ReferenceEquals(type.GetTypeInfo().Assembly, ReflectionEx.CoreAssembly))
  {
    if (type == TypeEx.StringType) //we simply keep a reference to each primitive type
      return StringSerializer.Instance;
 
    if (type == TypeEx.Int32Type)
      return Int32Serializer.Instance;
 
    if (type == TypeEx.Int64Type)
      return Int64Serializer.Instance;
    ...
}
```

i.e. replacing a `dictionary` lookup with an `if` statement and caching the `Type` instance of known types, rather than calculating them every time. As you can see the optimisation pays off in some circumstance but not in others, so it's not a clear win. It depends on where the type is in the list of `if` statements. If it's near the beginning (e.g. `System.String`) it'll be quicker than if it's near the end (e.g. `System.Byte[]`), which makes sense as all the other comparisons have to be done first.  

[![LookingUpValueSerializersByType-Results]({{ base }}/images/2016/08/LookingUpValueSerializersByType-Results.png)]({{ base }}/images/2016/08/LookingUpValueSerializersByType-Results.png)

[Full benchmark code and results](https://gist.github.com/mattwarren/af0319dc908449239cd3d135e76de4a8)

### Looking up types when deserializing

The 2nd optimisation worked by removing all unnecessary memory allocations, it did this by:

- Using a custom `struct` (value type) rather than a `class`
- Pre-calculating a hash code once, rather than each time a comparison is needed. 
- Doing string comparisons with raw `byte []`, rather than deserialising to a `string`

[![LookingUpTypesWhenDeserializing-Results]({{ base }}/images/2016/08/LookingUpTypesWhenDeserializing-Results.png)]({{ base }}/images/2016/08/LookingUpTypesWhenDeserializing-Results.png)

[Full benchmark code and results](https://gist.github.com/mattwarren/da62343df8fbdc5378df21e49df6a7c3)

**Note:** this demonstrates how BenchmarkDotNet can show you [memory allocations]({{ base }}/2016/02/17/adventures-in-benchmarking-memory-allocations/) as well as the time taken.

Interesting they hadn't actually removed all memory allocations as the comparisons between `OptimisedLookup` and `OptimisedLookupCustomComparer` show. So I [sent a P.R](https://github.com/akkadotnet/Wire/pull/76) which removes unnecessary boxing, by using a Custom Comparer rather than the default Struct comparer.

### Byte buffers, allocations and GC

Again removing unnecessary memory allocations were key in this optimisation, most of which can be seen in the [NoAllocBitConverter](https://github.com/akkadotnet/Wire/blob/dev/Wire/NoAllocBitConverter.cs). Clearly serialisation spends *a lot* of time converting from the in-memory representation of an object to the serialised version, i.e. a `byte []`. So several tricks were employed to ensure that temporary memory allocations were either removed or if that wasn't possible, they were done using a buffer from a buffer pool rather than allocating a new one each time (see "Buffer recycling")

[![StringSerialisationDeserialisation-Results]({{ base }}/images/2016/08/StringSerialisationDeserialisation-Results.png)]({{ base }}/images/2016/08/StringSerialisationDeserialisation-Results.png)

[Full benchmark code and results](https://gist.github.com/mattwarren/e6856ab4625d4e306cc04b9349edd869)
 
### Clever allocations 

This optimisation was perhaps the most interesting, because is was implemented by creating a custom data structure, tailored to the specific needs of Wire. So, rather than using the default [.NET dictionary](https://msdn.microsoft.com/en-us/library/xfhwa508(v=vs.110).aspx), they implemented [FastTypeUShortDictionary](https://github.com/akkadotnet/Wire/blob/36b93703b003d70744fc97e3e400cca411dce1c9/Wire/FastDictionary.cs). In essence this data structure optimises for having only 1 item, but falls back to a regular dictionary when it grows larger. To see this in action, here is the code from the [TryGetValue(..) method](https://github.com/akkadotnet/Wire/blob/36b93703b003d70744fc97e3e400cca411dce1c9/Wire/FastDictionary.cs#L13-L31):

``` csharp
public bool TryGetValue(Type key, out ushort value)
{
    switch (_length)
    {
        case 0:
            value = 0;
            return false;
        case 1:
            if (key == _firstType)
            {
                value = _firstValue;
                return true;
            }
            value = 0;
            return false;
        default:
            return _all.TryGetValue(key, out value);
    }
}
``` 

Like we've seen before, the performance gains aren't clear-cut. For instance it depends on whether `FastTypeUShortDictionary` contains the item you are looking for (`Hit` v `Miss`), but generally it is faster: 

[![FastTypeUShortDictionary-Alternative-Results]({{ base }}/images/2016/08/FastTypeUShortDictionary-Alternative-Results.png)]({{ base }}/images/2016/08/FastTypeUShortDictionary-Alternative-Results.png)

[Full benchmark code and results](https://gist.github.com/mattwarren/ed18d27c66e3e539b068371a0dca98f2)

### Boxing, Unboxing and Virtual calls 

This optimisation is based on the widely used trick that I imagine almost all .NET serialisers employ. For a serialiser to be generic, is has to be able to handle any type of object that is passed to it. Therefore the first thing it does is use [reflection](https://msdn.microsoft.com/en-us/library/f7ykdhsy(v=vs.110).aspx) to find the public fields/properties of that object, so that it knows the data is has to serialise. Doing reflection like this time-and-time again gets expensive, so the way to get round it is to do reflection once and then use [dynamic code generation](https://blogs.msdn.microsoft.com/csharpfaq/2009/09/14/generating-dynamic-methods-with-expression-trees-in-visual-studio-2010/) to compile a `delegate` than you can then call again and again. 

If you are interested in how to implement this, see the [Wire compiler source](https://github.com/akkadotnet/Wire/blob/dev/Wire/Compilation/Compiler.cs) or [this Stack Overflow question](http://stackoverflow.com/questions/17949208/whats-the-easiest-way-to-generate-code-dynamically-in-net-4-5/17949447#17949447). As shown in the results below, compiling code dynamically is much faster than reflection and only a little bit slower than if you read/write the property directly in C# code:

[![DynamicCodeGeneration-Results]({{ base }}/images/2016/08/DynamicCodeGeneration-Results.png)]({{ base }}/images/2016/08/DynamicCodeGeneration-Results.png)

[Full benchmark code and results](https://gist.github.com/mattwarren/9fb3084306f065e95b4712d51fe36217)

### Fast creation of empty objects

The final optimisation trick used is also based on dynamic code creation, but this time it is purely dealing with creating empty objects. Again this is something that a serialise does many time, so any optimisations or savings are worth it.

Basically the benchmark is comparing code like this:

``` csharp
FormatterServices.GetUninitializedObject(type);
```

with dynamically generated code, based on [Expression trees](https://msdn.microsoft.com/en-us/library/mt654263.aspx):

``` csharp
var newExpression = ExpressionEx.GetNewExpression(typeToUse);
Func<TestClass> optimisation = Expression.Lambda<Func<TestClass>>(newExpression).Compile();
``` 

However this trick only works if the `constructor` of the type being created is empty, otherwise it has to fall back to the slow version. But as shown in the results below, we can see that the optimisation is a clear win and worth implementing:

[![FastCreationOfEmptyObjects-Results]({{ base }}/images/2016/08/FastCreationOfEmptyObjects-Results.png)]({{ base }}/images/2016/08/FastCreationOfEmptyObjects-Results.png)

[Full benchmark code and results](https://gist.github.com/mattwarren/b48b3e5a720b174e64f16353d8ce9960)

----

## Summary (FINISH THIS!!)

So it's obvious that [Roger Johansson](https://twitter.com/rogeralsing) and [Szymon Kulec](https://twitter.com/Scooletz) know their optimisations and as a results they have steadily made the Wire serialiser faster and faster. 
 