---
layout: post
title: How to mock sealed classes and static methods
comments: true
tags: [.NET Profiling, dynamic code generation, Mocking]
---
<a href="http://www.typemock.com/" target="_blank">Typemock</a> &amp; <a href="http://www.telerik.com/products/mocking.aspx" target="_blank">JustMock</a> are 2 commercially available mocking tools that let you achieve something that should be impossible. Unlike all other mocking frameworks, they let you mock <strong>sealed classes, static</strong> and <strong>non-virtual methods</strong>, but how do they do this?

<h4><strong>Dynamic Proxies</strong></h4>

Firstly it's worth covering how regular mocking frameworks work with virtual methods or interfaces. Suppose you have a class you want to mock, like so:

``` csharp
public class TestingMocking
{
  public virtual void MockMe()
  {
    ..
  }
}
```

At runtime the framework will generate a <em>mocked</em> class like the one below. As it inherits from <code>TestingMocking</code> you can use it instead of your original class, but the <em>mocked</em> method will be called instead.

``` csharp
public class DynamicProxy : TestingMocking
{
  public override void MockMe()
  {
    ..
  }
}
```

This is achieved using the <a href="http://msdn.microsoft.com/en-us/library/system.reflection.emit.dynamicmethod(v=vs.110).aspx" target="_blank">DynamicMethod</a> class available in <a href="http://msdn.microsoft.com/en-us/library/System.Reflection.Emit(v=vs.110).aspx" target="_blank">System.Reflection.Emit</a>, this <a href="http://www.mindscapehq.com/blog/index.php/2011/11/27/reflection-performance-and-runtime-code-generation/" target="_blank">blog post</a> contains a nice overview and <a href="https://twitter.com/billwagner" target="_blank">Bill Wagner</a> has put together a <a href="https://bitbucket.org/BillWagner/codemashstuntcoding/src/c449bf1c6b703b34d1e086f1a0f527757f4720c2/StuntCodingUtilities/DynamicConverter.cs?at=default#cl-14" target="_blank">more complete example</a> that gives you a better idea of what is involved. I found that once you discover dynamic code generation is possible, you realise that it is used everywhere, for instance:

<ul>
<li><a href="http://samsaffron.com/archive/2011/03/30/How+I+learned+to+stop+worrying+and+write+my+own+ORM" target="_blank">Dapper</a> (see <a href="https://gist.github.com/SamSaffron/893878" target="_blank">this gist</a> for ver1)</li>
<li><a href="http://www.codingodyssey.com/2010/04/08/viewing-generated-proxy-code-in-the-entity-framework/" target="_blank">Entity Framework</a> (it enables lazy-loading when doing Code-First)</li>
<li><a href="https://github.com/mgravell/protobuf-net/blob/15174a09ee3223c8805b3ef81c1288879c746dfa/protobuf-net/Compiler/CompilerContext.cs#L309" target="_blank">protobuf-net</a></li>
<li><a href="https://github.com/JamesNK/Newtonsoft.Json/blob/bbe7eaf852b41ecdfb4817b9bd2f1fc9432abc1a/Src/Newtonsoft.Json/Utilities/DynamicReflectionDelegateFactory.cs#L43" target="_blank">Json.NET</a></li>
<li><a href="https://github.com/AutoMapper/AutoMapper/blob/f6bce50e7040db6142f19eef5dff9dd4e6071168/src/AutoMapper/Mappers/DataReaderMapper.cs#L121" target="_blank">AutoMapper</a> </li>
<li>and many more!</li>
</ul>

BTW if you ever find yourself needing to dynamically emit IL code, I'd recommend using the <a href="http://kevinmontrose.com/2013/02/14/sigil-adding-some-more-magic-to-il/" target="_blank">Sigil library</a> that was created by some of the developers at StackOverflow. It takes away a lot of the pain associated with writing and debugging IL.

However dynamically generated proxies will always run into the limitation that <a href="http://msdn.microsoft.com/en-us/library/aa645767(v=vs.71).aspx" target="_blank">you can't override non-virtual methods</a> and they also can't do anything with static methods or sealed class (i.e. classes that can't be inherited).

<h4><strong>.NET Profiling API and JITCompilationStarted() Method</strong></h4>

How Typemock and JustMock achieve what they do is hinted at in a <a href="http://stackoverflow.com/questions/5556115/open-source-free-alternative-of-typemock-isolator/5563750#5563750" target="_blank">StackOverflow answer by a Typemock employee</a> and is also discussed in <a href="http://www.codethinked.com/static-method-interception-in-net-with-c-and-monocecil" target="_blank">this blog post</a>. But they only talk about the solution, I wanted to actually write a small proof-of-concept myself, to see what is involved.

To start with the <a href="http://msdn.microsoft.com/en-us/library/ms404386(v=vs.110).aspx" target="_blank">.NET profiling API</a> is what makes this possible, but a word of warning, it is a C++ API and it requires you to write a <a href="http://msdn.microsoft.com/en-us/library/bb384493(v=vs.110).aspx#com" target="_blank">COM component</a> to be able to interact with it, you can't work with it from C#. To get started I used the excellent <a href="https://github.com/sawilde/DDD2011_ProfilerDemo" target="_blank">profiler demo project</a> from Shaun Wilde. If you want to learn more about the profiling API and in particular how you can use it to re-write methods, I really recommend looking at this code step-by-step and also reading the <a href="http://www.slideshare.net/shaun_wilde/net-profilers-and-il-rewriting-ddd-melbourne-2" target="_blank">accompanying slides</a>.

By using the profiling API and in particular the <a href="http://msdn.microsoft.com/en-us/library/ms230586(v=vs.110).aspx" target="_blank">JITCompilationStarted method</a>, we are able to modify the IL of any method being run by the CLR (user code or the .NET runtime), before the JITer compiles it to machine code and it is executed. This means that we can modify a method that originally looks like this:

``` csharp
public sealed class ClassToMock
{
  public static int StaticMethodToMock()
  {
    Console.WriteLine("StaticMethodToMock called, returning 42");
    return 42;
  }
}
```

So that instead it does this:

``` csharp
public sealed class ClassToMock
{
  public static int StaticMethodToMock()
  {
    // Inject the IL to do this instead!!
    if (Mocked.ShouldMock("Profilier.ClassToMock.StaticMethodToMock"))
      return Mocked.MockedMethod();

    Console.WriteLine("StaticMethodToMock called, returning 42");
    return 42;
  }
}
```

For reference, the original IL looks like this:

``` asm
IL_0000 ( 0) nop
IL_0001 ( 1) ldstr (70)00023F    //"StaticMethodToMockWhatWeWantToDo called, returning 42"
IL_0006 ( 6) call (06)000006     //call Console.WriteLine(..)
IL_000B (11) nop
IL_000C (12) ldc.i4.s 2A         //return 42;
IL_000E (14) stloc.0
IL_000F (15) br IL_0014
IL_0014 (20) ldloc.0
IL_0015 (21) ret
```

and after code injection, it ends up like this:

``` asm
IL_0000 ( 0) ldstr (70)000135
IL_0005 ( 5) call (0A)00001B     //call ShouldMock(string methodNameAndPath)
IL_000A (10) brfalse.s IL_0012
IL_000C (12) call (0A)00001C     //call MockedMethod()
IL_0011 (17) ret
IL_0012 (18) nop
IL_0013 (19) ldstr (70)00023F    //"StaticMethodToMockWhatWeWantToDo called, returning 42"
IL_0018 (24) call (06)000006     //call Console.WriteLine(..)
IL_001D (29) nop
IL_001E (30) ldc.i4.s 2A         //return 42;
IL_0020 (32) stloc.0
IL_0021 (33) br IL_0026
IL_0026 (38) ldloc.0
IL_0027 (39) ret
```

And that is the basics of how you can modify any .NET method, it seems relatively simple when you know how! In my simple demo I just add in the relevant IL so that a mocked method is called instead, you can see the C++ code needed to achieve this <a href="https://github.com/mattwarren/DDD2011_ProfilerDemo/blob/master/step5_main_injected_method_object_array/DDDProfiler/CodeInjection.cpp#L279" target="_blank">here</a>. Of course in reality it's much more complicated, my <a href="https://github.com/mattwarren/DDD2011_ProfilerDemo/commit/9f804cec8ef11b802e020e648180b436a429833f" target="_blank">simple demo</a> only deals with a very simplistic scenario, a static method that returns an <code>int</code>. The commercial products that do this are way more powerful and have to deal with all the issues that you can encounter when you are <strong>re-writing code at the IL level</strong>, for instance if you aren't careful you get exceptions like this:

<a href="https://twitter.com/matthewwarren/status/497876741650907136" target="_blank"><img src="{{ base }}/images/2014/12/exception-when-things-go-wrong.jpg"/></a>

<h4><strong>Running the demo code</strong></h4>

If you want to run my demo, you need to open the solution file under <a href="https://github.com/mattwarren/DDD2011_ProfilerDemo/tree/master/step5_main_injected_method_object_array" target="_blank">step5_main_injected_method_object_array</a> and set "ProfilerHost" as the "Start-up Project" (right-click on the project in VS) before you run. When you run it, you should see something like this:

<a href="{{ base }}/images/2014/12/mocking-in-action.png" target="_blank"><img src="{{ base }}/images/2014/12/mocking-in-action.png" alt="Mocking in action"/></a>

You can see the C# code that controls the mocking below. At the moment the API in the demo is fairly limited, it only lets you turn mocking on/off and set the value that is returned from the mocked method.

``` csharp
static void Main(string[] args)
{
  // Without mocking enabled (the default)
  Console.WriteLine(new string('#', 90));
  Console.WriteLine("Calling ClassToMock.StaticMethodToMock() (a static method in a sealed class)");
  var result = ClassToMock.StaticMethodToMock();
  Console.WriteLine("Result: " + result);
  Console.WriteLine(new string('#', 90) + "n");

  // With mocking enabled, doesn't call into the static method, calls the mocked version instead
  Console.WriteLine(new string('#', 90));
  Mocked.SetReturnValue = 1;
  Console.WriteLine("Turning ON mocking of Profilier.ClassToMock.StaticMethodToMock");
  Mocked.Configure("ProfilerTarget.ClassToMock.StaticMethodToMock", mockMethod: true);

  Console.WriteLine("Calling ClassToMock.StaticMethodToMock() (a static method in a sealed class)");
  result = ClassToMock.StaticMethodToMock();
  Console.WriteLine("Result: " + result);
  Console.WriteLine(new string('#', 90) + "n");
}
```

<h4><strong>Other Uses for IL re-writing</strong></h4>

Again once you learn about this mechanism, you realise that it is used in lots of places, for instance

- profilers, see <a href="http://stackoverflow.com/questions/6527597/how-does-the-redgate-profiler-actually-work/6528758#6528758" target="_blank">this SO answer</a> for more info (<a href="http://www.red-gate.com/products/dotnet-development/ants-performance-profiler/" target="_blank">Ants</a> and <a href="http://www.jetbrains.com/profiler/" target="_blank">JetBrains</a>)
- test coverage (<a href="http://www.ncover.com/" target="_blank">NCover</a>)
- productions monitoring systems

<a href="http://www.reddit.com/r/csharp/comments/2dk0zt/how_to_mock_sealed_classes_and_static_methods/" target="_blank">Discuss on /r/csharp</a>
