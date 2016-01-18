---
layout: post
title: Things the .NET JIT does
date: 2015-04-28 10:36
author: matthewwarren
comments: true
categories: [Uncategorized]
---
<h3><strong>Escape Analysis (.NET doesn’t seem to do it, Java does)</strong></h3>

http://docs.oracle.com/javase/7/docs/technotes/guides/vm/performance-enhancements-7.html#escapeAnalysis
http://stackoverflow.com/questions/8222561/escape-analysis-in-the-net-clr-vm/8223492#8223492

<h3><strong>JIT Optimisations (in general)</strong></h3>

http://stackoverflow.com/questions/3667747/would-the-clr-optimize-and-inline-this-gethashcode/3668040#3668040
http://stackoverflow.com/questions/5668536/it-appears-some-parts-of-an-expression-may-be-evaluated-at-compile-time-while-o
http://blogs.msdn.com/b/ericlippert/archive/2003/10/21/53264.aspx
http://stackoverflow.com/questions/18783941/branch-elimination-in-the-net-compiler-versus-the-jitter
http://stackoverflow.com/questions/4043821/performance-differences-between-debug-and-release-builds/4045073#4045073

http://blogs.msdn.com/b/davidnotario/archive/2004/10/26/247792.aspx
http://blogs.msdn.com/b/davidnotario/archive/2004/10/28/248953.aspx
http://blogs.msdn.com/b/davidnotario/archive/2004/11/01/250398.aspx

<h3><strong>Constant Folding</strong></h3>

http://littlenet.blogspot.co.uk/2006/06/constant-folding-in-net.html

<h3><strong>Array index checking elimination</strong></h3>

http://blogs.msdn.com/b/clrcodegeneration/archive/2009/08/13/array-bounds-check-elimination-in-the-clr.aspx

From http://stackoverflow.com/questions/4043821/performance-differences-between-debug-and-release-builds/4045073#4045073
The C# compiler itself doesn't alter the emitted IL a great deal in the Release build. Notable is that it no longer emits the NOP opcodes that allow you to set a breakpoint on a curly brace. The big one is the optimizer that's built into the JIT compiler. I know it makes the following optimizations:

<ul>
<li><strong>Method inlining</strong>. A method call is replaced by the injecting the code of the method. This is a big one, it makes property accessors essentially free.</li>
<li><strong>CPU register allocation</strong>. Local variables and method arguments can stay stored in a CPU register without ever (or less frequently) being stored back to the stack frame. This is a big one, notable for making debugging optimized code so difficult. And giving the volatile keyword a meaning.</li>
<li><strong>Array index checking elimination</strong>. An important optimization when working with arrays (all .NET collection classes use an array internally). When the JIT compiler can verify that a loop never indexes an array out of bounds then it will eliminate the index check. Big one.</li>
<li><strong>Loop unrolling</strong>. Short loops (up to 4) with small bodies are eliminated by repeating the code in the loop body. Avoids the branch misprediction penalty.</li>
<li><strong>Dead code elimination</strong>. A statement like if (false) { /.../ } gets completely eliminated. This can occur due to constant folding and inlining. Other cases is where the JIT compiler can determine that the code has no possible side-effect. <strong>This optimization is what makes profiling code so tricky</strong>.</li>
<li><strong>Code hoisting</strong>. Code inside a loop that is not affected by the loop can be moved out of the loop.</li>
<li><strong>Common sub-expression elimination</strong>. x = y + 4; z = y + 4; becomes z = x;</li>
<li><strong>Constant folding</strong>. x = 1 + 2; becomes x = 3; This simple example is caught early by the compiler, but happens at JIT time when other optimizations make this possible.</li>
<li><strong>Copy propagation</strong>. x = a; y = x; becomes y = a; This helps the register allocator make better decisions. It is a big deal in the x86 jitter because it has so few registers to work with. Having it select the right ones is critical to perf.</li>
</ul>

http://tirania.org/blog/archive/2012/Apr-04.html

http://www.dotnetperls.com/jit

Maybe these as well??
http://code4k.blogspot.co.uk/2014/06/micro-benchmarking-net-native-and-ryujit.html
http://code4k.blogspot.co.uk/2010/10/high-performance-memcpy-gotchas-in-c.html
