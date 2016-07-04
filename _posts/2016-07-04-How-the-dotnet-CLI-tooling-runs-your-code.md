---
layout: post
title: How the dotnet CLI tooling runs your code
comments: true
tags: [dotnet, CLI, CoreCLR]
date: 2016-07-04
excerpt: <p>Just over a week ago the <a href="https://blogs.msdn.microsoft.com/dotnet/2016/06/27/announcing-net-core-1-0/">official 1.0 release of .NET Core</a> was announced, the release includes:</p><blockquote><p>the .NET Core runtime, libraries and tools and the ASP.NET Core libraries.</p></blockquote></p>

---

Just over a week ago the [official 1.0 release of .NET Core](https://blogs.msdn.microsoft.com/dotnet/2016/06/27/announcing-net-core-1-0/) was announced, the release includes:

> the .NET Core runtime, libraries and tools and the ASP.NET Core libraries.

However alongside a completely new, revamped, xplat version of the .NET runtime, the development experience has been changed, with the [`dotnet` based tooling](https://docs.microsoft.com/en-us/dotnet/articles/core/tools/dotnet) now available (**Note**: the *tooling* itself is currently still in preview and it's [expected to be RTM](https://github.com/dotnet/core/blob/master/roadmap.md#planned-11-features) later this year)

So you can now write:

```
dotnet new
dotnet restore
dotnet run
```

and at the end you'll get the following output:

```
Hello World!
```

It's the `dotnet` CLI (Command Line Interface) tooling that is the focus of this post and more specifically *how it actually runs your code*, although if you want a **tl;dr** version see this tweet from [@citizenmatt](https://twitter.com/citizenmatt):

[![Tweet explaining dotnet CLI runtime]({{ base }}/images/2016/07/Tweet explaining dotnet CLI runtime.png)](https://twitter.com/citizenmatt/status/747874853135466496)

----

## Traditional way of running .NET executables

As a brief reminder, .NET executables can't be run directly (they're just [IL](https://en.wikipedia.org/wiki/Common_Intermediate_Language), not machine code), therefore the Windows OS has always needed to do a few tricks to execute them, from [CLR via C#](http://amzn.to/29baVly):

> After Windows has examined the EXE file's header to determine whether to create a 32-bit process, a 64-bit process, or a WoW64 process, Windows loads the x86, x64, or IA64 version of MSCorEE.dll into the process's address space.
> ...
> Then, the process' primary thread calls a method defined inside MSCorEE.dll. This method initializes the CLR, loads the EXE assembly, and then calls its entry point method (Main). At this point, the managed application is up and running.

## New way of running .NET executables 

### `dotnet run`

So how do things work now that we have the new CoreCLR and the CLI tooling? Firstly to understand what is going on under-the-hood, we need to set a few environment variables (`COREHOST_TRACE` and `DOTNET_CLI_CAPTURE_TIMING`) so that we get a more verbose output: 

![dotnet run - with cli timings and verbose output]({{ base }}/images/2016/07/dotnet run - with cli timings and verbose output.png)

Here, amongst all the pretty ASCII-art, we can see that `dotnet run` actually executes the following cmd:

> `dotnet exec --additionalprobingpath C:\Users\matt\.nuget\packages c:\dotnet\bin\Debug\netcoreapp1.0\myapp.dll`

**Note**: this is what happens when running a Console Application. The CLI tooling [supports other scenarios](https://docs.microsoft.com/en-us/dotnet/articles/core/app-types), such as self-hosted web sites, which work differently. 

### `dotnet exec` and `corehost`

Up-to this point everything was happening within managed code, however once `dotnet exec` is called we [jump over to unmanaged code](https://github.com/dotnet/core-setup/blob/release/1.0.0/src/corehost/corehost.cpp#L105-L119) within [the corehost application](https://github.com/dotnet/core-setup/tree/release/1.0.0/src/corehost). In addition several other .dlls are loaded, the last of which is the CoreCLR runtime itself (click to go to the main source file for each module):

- [`hostpolicy.dll`](https://github.com/dotnet/core-setup/blob/release/1.0.0/src/corehost/cli/hostpolicy.cpp)
- [`hostfxr.dll`](https://github.com/dotnet/core-setup/blob/release/1.0.0/src/corehost/cli/fxr/hostfxr.cpp)
- [`coreclr.dll`](https://github.com/dotnet/coreclr)

The main task that the `corehost` application performs is to calculate and locate all the dlls needed to run the application, along with their dependencies. The full [output is available](https://gist.github.com/mattwarren/f527b06c4579ebb414d6e182b910c474), but in summary it processes: 

- 99 **Managed** dlls [("Adding runtime asset..")](https://gist.github.com/mattwarren/428234f1f4508486f4ba3a4e6543bf2e)
- 136 **Native** dlls [("Adding native asset..")](https://gist.github.com/mattwarren/919f54d760f045c47b4833a345abde57)

There are so many individual files because the CoreCLR operates on a "pay-for-play" model, from [Motivation Behind .NET Core](https://docs.asp.net/en/1.0.0-rc1/conceptual-overview/dotnetcore.html#motivation-behind-net-core):

>  By factoring the CoreFX libraries and allowing individual applications to pull in only those parts of CoreFX they require (a so-called **“pay-for-play” model**), server-based applications built with ASP.NET 5 can minimize their dependencies.

Finally, once all the housekeeping is done control is handed off to [`corehost`](https://github.com/dotnet/core-setup/blob/release/1.0.0/src/corehost/corehost.cpp), but not before the following [properties are set](https://github.com/dotnet/core-setup/blob/release/1.0.0/src/corehost/cli/hostpolicy.cpp#L91-L123) to control the execution of the CoreCLR itself:

- **TRUSTED_PLATFORM_ASSEMBLIES** = 
	- Paths to 235 .dlls (99 managed, 136 native), from `C:\Program Files\dotnet\shared\Microsoft.NETCore.App\1.0.0-rc2-3002702`
- **APP_PATHS** = 
	- `c:\dotnet\bin\Debug\netcoreapp1.0`
- **APP_NI_PATHS** = 
	- `c:\dotnet\bin\Debug\netcoreapp1.0`
- **NATIVE_DLL_SEARCH_DIRECTORIES** = 
	- `C:\Program Files\dotnet\shared\Microsoft.NETCore.App\1.0.0-rc2-3002702`
	- `c:\dotnet\bin\Debug\netcoreapp1.0`
- **PLATFORM_RESOURCE_ROOTS** = 
	- `c:\dotnet\bin\Debug\netcoreapp1.0`
	- `C:\Program Files\dotnet\shared\Microsoft.NETCore.App\1.0.0-rc2-3002702`
- **AppDomainCompatSwitch** = 
	- `UseLatestBehaviorWhenTFMNotSpecified`
- **APP_CONTEXT_BASE_DIRECTORY** = 
	- `c:\dotnet\bin\Debug\netcoreapp1.0`
- **APP_CONTEXT_DEPS_FILES** = 
	- `c:\dotnet\bin\Debug\netcoreapp1.0\dotnet.deps.json`
	- `C:\Program Files\dotnet\shared\Microsoft.NETCore.App\1.0.0-rc2-3002702\Microsoft.NETCore.App.deps.json`
- **FX_DEPS_FILE** = 
	- `C:\Program Files\dotnet\shared\Microsoft.NETCore.App\1.0.0-rc2-3002702\Microsoft.NETCore.App.deps.json`

**Note**: You can also run your app by invoking `corehost.exe` directly with the following command:

> `corehost.exe C:\dotnet\bin\Debug\netcoreapp1.0\myapp.dll`

### Executing a .NET Assembly

At last we get to the point at which the .NET dll/assembly is loaded and executed, via the code shown below, taken from [unixinterface.cpp](https://github.com/dotnet/coreclr/blob/release/1.0.0/src/dlls/mscoree/unixinterface.cpp#L156-L244):

``` cpp
hr = host->SetStartupFlags(startupFlags);
IfFailRet(hr);

hr = host->Start();
IfFailRet(hr);

hr = host->CreateAppDomainWithManager(
    appDomainFriendlyNameW,
    // Flags:
    // APPDOMAIN_ENABLE_PLATFORM_SPECIFIC_APPS
    // - By default CoreCLR only allows platform neutral assembly to be run. To allow
    //   assemblies marked as platform specific, include this flag
    //
    // APPDOMAIN_ENABLE_PINVOKE_AND_CLASSIC_COMINTEROP
    // - Allows sandboxed applications to make P/Invoke calls and use COM interop
    //
    // APPDOMAIN_SECURITY_SANDBOXED
    // - Enables sandboxing. If not set, the app is considered full trust
    //
    // APPDOMAIN_IGNORE_UNHANDLED_EXCEPTION
    // - Prevents the application from being torn down if a managed exception is unhandled
    //
    APPDOMAIN_ENABLE_PLATFORM_SPECIFIC_APPS |
    APPDOMAIN_ENABLE_PINVOKE_AND_CLASSIC_COMINTEROP |
    APPDOMAIN_DISABLE_TRANSPARENCY_ENFORCEMENT,
    NULL, // Name of the assembly that contains the AppDomainManager implementation
    NULL, // The AppDomainManager implementation type name
    propertyCount,
    propertyKeysW,
    propertyValuesW,
    (DWORD *)domainId);
```

This is making use of the [ICLRRuntimeHost Interface](https://msdn.microsoft.com/en-us/library/ms164408(v=vs.110).aspx), which is part of the COM based hosting API for the CLR. Despite the file name, it is actually from the Windows version of the CLI tooling. In the xplat world of the CoreCLR the hosting API that was originally written for Unix has been replicated across all the platforms so that a common interface is available for any tools that want to use it, see the following GitHub issues for more information:

* [Refactor the Unix hosting API](https://github.com/dotnet/coreclr/issues/1234)
* [Expose the Unix hosting API on Windows too](https://github.com/dotnet/coreclr/issues/1256)
* [Expose Unix hosting API on Windows](https://github.com/dotnet/coreclr/pull/1295)
* [Unix Hosting API](https://github.com/dotnet/coreclr/blob/master/src/dlls/mscoree/mscorwks_ntdef.src#L20-L24)

**And that's it, your .NET code is now running, simple really!!**

----

## Additional information:

- [Official dotnet cli tooling documentation](https://docs.microsoft.com/en-us/dotnet/articles/core/tools/dotnet-run)
- [corehost runtime assembly resolution](https://github.com/dotnet/cli/blob/rel/1.0.0/Documentation/specs/corehost.md)
- [Runtime Configuration File specification](https://github.com/dotnet/cli/blob/rel/1.0.0/Documentation/specs/runtime-configuration-file.md)
- [CoreCLR runtime options](https://github.com/dotnet/cli/blob/rel/1.0.0/Documentation/specs/runtime-configuration-file.md#sections)