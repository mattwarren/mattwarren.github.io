---
layout: post
title: Exploring the BBC micro:bit Software Stack
comments: true,
codeproject: false,
tags: [Open Source, Internals, Hardware]
---

If you grew up in the UK and went to school during the 1980's or 1990's there's a good chance that this picture brings back fond memories:

![BBC Micro and a Turtle](http://www.classicacorn.freeuk.com/8bit_focus/logo/logo_8.jpg)

(image courtesy of [Classic Acorn](http://www.classicacorn.freeuk.com/))

I'd imagine that for a large amount of computer programmers (currently in their 30's) the BBC Micro was their first experience of programming. If this applies to you and you want a trip down memory lane, have a read of [Remembering: The BBC Micro](https://www.geeksaresexy.net/2009/10/22/remembering-the-bbc-micro/) and [The BBC Micro in my education](https://www.retro-kit.co.uk/page.cfm/content/The-BBC-Micro-in-Education/).

Programming the classic [Turtle](https://angrytechnician.wordpress.com/2009/07/23/relic/) was done in [Logo](http://www.walkingrandomly.com/?p=13), with code like this:

```
FORWARD 100
LEFT 90
FORWARD 100
LEFT 90
FORWARD 100
LEFT 90
FORWARD 100
LEFT 90
```

Of course, once you knew what you were doing, you would re-write it like so:

```
REPEAT 4 [FORWARD 100 LEFT 90]
```

----

## BBC micro:bit

The original Micro was launched as an education tool, as part of the [BBC’s Computer Literacy Project](http://www.swansea.ac.uk/library/archive-and-research-collections/hocc/computersandsoftware/earlyhomecomputers/bbcmicro/) and by most accounts was a big success. As a follow-up, in March 2016 the [micro:bit was launched](http://www.bbc.co.uk/mediacentre/latestnews/2016/bbc-micro-bit-schools-launch) as part of the BBC's 'Make it Digital' initiative and 1 million devices were given out to schools and libraries in the UK to 'help develop a new generation of digital pioneers' (i.e. get them into programming!)

**Aside**: I love the difference in branding across 30 years, '*BBC Micro*' became '*BBC micro:bit*' (you must include the colon) and '*Computer Literacy Project*' changed to the '*Make it Digital Initiative*'.

There rest of the post will be exploring the **software stack** that makes up the micro:bit, what's in it, what it does and how it all fits together. If you want to learn about how to program the micro:bit, it's hardware or anything else, take a look at this [excellent list of resources](https://github.com/carlosperate/awesome-microbit).

----

Slightly off-topic, but if you enjoy reading **source code** you might like these other posts:

- [The 68 things the CLR does before executing a single line of your code]({{ base }}/2017/02/07/The-68-things-the-CLR-does-before-executing-a-single-line-of-your-code/?recommended=1)
- [A Hitchhikers Guide to the CoreCLR Source Code]({{ base }}/2017/03/23/Hitchhikers-Guide-to-the-CoreCLR-Source-Code/?recommended=1)
- [DotNetAnywhere: An Alternative .NET Runtime]({{ base }}/2017/10/19/DotNetAnywhere-an-Alternative-.NET-Runtime/?recommended=1)

----

# BBC micro:bit Software Stack

If we take a *high-level* view at the stack, it divides up into 3 discrete **software** components that all sit on top of the **hardware** itself:

![BBC Microbit Software Stack.png]({{ base }}/images/2017/11/BBC Microbit Software Stack.png)

If you would like to build this stack for yourself take a look at the [Building with Yotta guide](https://lancaster-university.github.io/microbit-docs/offline-toolchains). I also found this post describing [The First Video Game on the BBC micro:bit [probably]](https://hackernoon.com/the-first-video-game-on-the-bbc-micro-bit-probably-4175fab44da8) very helpful.

----

## Runtimes

There are several high-level *runtimes* available, these are useful because they let you write code in a language other than C/C++ or even create programs by [dragging *blocks* around on a screen](https://www.microbit.co.uk/blocks/editor). The main ones that I've come across are below (see ['Programming'](https://github.com/carlosperate/awesome-microbit#programming) for a full list):

- **Python** via [MicroPython](https://github.com/bbcmicrobit/micropython/)
- **JavaScript** with [Microsoft Programming Experience Toolkit (PXT)](https://github.com/Microsoft/pxt-microbit)
  - well actually it's [**TypeScript**](https://makecode.com/language), which is good, we wouldn't want to rot the brains of impressionable young children with the [horrors of Javascript - Wat!!](https://www.destroyallsoftware.com/talks/wat)

They both work in a similar way, the users code (Python or TypeScript) is bundled up along with the C/C++ code of the runtime itself and then the entire binary (hex) file is deployed to the micro:bit. When the device starts up, the runtime then looks for the users code at a known location in memory and starts interpreting it.

----

## Memory Layout

Just before we go onto the other parts of the software stack I want to take a deeper look at the memory layout. This is important because memory is so constrained on the micro:bit, there is *only* 16KB of RAM. To put that into perspective, we'll use the calculation from this StackOverflow question [How many bytes of memory is a tweet?](https://stackoverflow.com/questions/5999821/how-many-bytes-of-memory-is-a-tweet/5999852#5999852)

> Twitter uses UTF-8 encoded messages. UTF-8 code points can be up to six four octets long, making the maximum message size **140 x 4 = 560 8-bit bytes**.

If we re-calculate for the newer, longer tweets **280 x 4 = 1,120 bytes**. So we could only fit **10 tweets** into the available RAM on the micro:bit (it turns out that only ~11K out of the total 16K is available for general use). Which is why it's worth using a [custom version of atoi() to save 350 bytes of RAM](https://github.com/lancaster-university/microbit-dal/issues/323)!

The memory layout is specified by the linker at compile-time using [NRF51822.ld](https://github.com/lancaster-university/microbit-targets/blob/master/bbc-microbit-classic-gcc-nosd/ld/NRF51822.ld#L6), there is a sample output [microbit-samples.map]({{ base }}/data/2017/11/microbit-samples.map) available if you want to take a look. Because it's done at compile-time you run into build errors such as ["region RAM overflowed with stack"](https://github.com/bbcmicrobit/micropython/issues/363) if you configure it incorrectly.

The table below shows the memory layout from the 'no SD' version of a 'Hello World' app, i.e. with the maximum amount of RAM available as the Bluetooth (BLE) Soft-Device (SD) support has been removed. By comparison with BLE enabled, you instantly have [8K less RAM available](https://github.com/lancaster-university/microbit-targets/blob/master/bbc-microbit-classic-gcc/ld/NRF51822.ld#L6), so things start to get tight!

| Name | Start Address | End Address | Size | Percentage |
|-----:|--------------:|------------:|-----:|-----------:|
|        .data | 0x20000000 | 0x20000098 |    152 bytes |  0.93% |
|         .bss | 0x20000098 | 0x20000338 |    672 bytes |  4.10% |
|  Heap (mbed) | 0x20000338 | 0x20000b38 |  2,048 bytes | 12.50% |
|        Empty | 0x20000b38 | 0x20003800 | 11,464 bytes | 69.97% |
|        Stack | 0x20003800 | 0x20004000 |  2,048 bytes | 12.50% |

For more info on the column names see the Wikipedia pages for [.data](https://en.wikipedia.org/wiki/Data_segment) and [.bss](https://en.wikipedia.org/wiki/.bss) as well as [text, data and bss: Code and Data Size Explained](https://mcuoneclipse.com/2013/04/14/text-data-and-bss-code-and-data-size-explained/)

As a comparison there is a nice image of the micro:bit RAM Layout [in this article](https://hackernoon.com/the-first-video-game-on-the-bbc-micro-bit-probably-4175fab44da8#5fea). It shows what things look like when running MicroPython and you can clearly see the main Python heap in the centre [taking up all the remaining space](https://github.com/bbcmicrobit/micropython/blob/master/source/microbit/mprun.c#L95-L104).

----

## [microbit-dal](https://github.com/lancaster-university/microbit-dal)

Sitting in the stack below the high-level runtime is the *device abstraction layer* (DAL), created at [Lancaster University](https://github.com/lancaster-university) in the UK, it's made up of 4 main components: 

- [**core**](https://github.com/lancaster-university/microbit-dal/tree/master/source/core)
  - High-level components, such as `Device`, `Font`, `HeapAllocator`, `Listener` and `Fiber`, often implemented on-top of 1 or more `driver` classes
- [**types**](https://github.com/lancaster-university/microbit-dal/tree/master/source/types)
  - Helper types such as `ManagedString`, `Image`, `Event` and `PacketBuffer`
- [**drivers**](https://github.com/lancaster-university/microbit-dal/tree/master/source/drivers)
  - For control of a specific hardware component, such as `Accelerometer`, `Button`, `Compass`, `Display`, `Flash`, `IO`, `Serial` and `Pin`
- [**bluetooth**](https://github.com/lancaster-university/microbit-dal/tree/master/source/bluetooth)
  - All the code for the [Bluetooth Low Energy](https://www.kitronik.co.uk/blog/bbc-microbit-bluetooth-low-energy/) (BLE) stack that is [shipped with the micro:bit](https://lancaster-university.github.io/microbit-docs/ble/profile/)
- [**asm**](https://github.com/lancaster-university/microbit-dal/tree/master/source/asm)
  - Just 4 functions are implemented in assembly, they are `swap_context`, `save_context`, `save_register_context` and `restore_register_context`. As the names suggest, they handle the 'context switching' necessary to make the [MicroBit Fiber scheduler](https://github.com/lancaster-university/microbit-dal/blob/master/source/core/MicroBitFiber.cpp) work

The image below shows the distribution of 'Lines of Code' (LOC), as you can see the majority of the code is in the `drivers` and `bluetooth` components.

![LOC Metrics Pie - microbit-dal]({{ base }}/images/2017/11/LocMetricsPie-microbit-dal.png)

In addition to providing nice helper classes for working with the underlying devices, the DAL provides the `Fiber` abstraction to allows asynchronous functions to work. This is useful because you can asynchronously display text on the LED display and your code won't block whilst it's *scrolling* across the screen. In addition the `Fiber` class is used to handle the interrupts that signal when the buttons on the micro:bit are pushed. This comment from the code clearly lays out what the [Fiber scheduler](https://github.com/lancaster-university/microbit-dal/blob/master/source/core/MicroBitFiber.cpp) does:

> This lightweight, **non-preemptive scheduler** provides a **simple threading mechanism** for two main purposes:
> 
>  1) To provide a clean abstraction for application languages to use when building async behaviour (callbacks).
>  2) To provide ISR decoupling for EventModel events generated in an ISR context.

Finally the high-level classes [MicroBit.cpp](https://github.com/lancaster-university/microbit/blob/master/source/MicroBit.cpp) and [MicroBit.h](https://github.com/lancaster-university/microbit/blob/master/inc/MicroBit.h) are housed in the [microbit repository](https://github.com/lancaster-university/microbit). These classes define the API of the MicroBit runtime and setup the default configuration, as shown in the `Constructor` of `MicroBit.cpp`:

``` cpp
/**
  * Constructor.
  *
  * Create a representation of a MicroBit device, which includes member variables
  * that represent various device drivers used to control aspects of the micro:bit.
  */
MicroBit::MicroBit() :
    serial(USBTX, USBRX),
    resetButton(MICROBIT_PIN_BUTTON_RESET),
    storage(),
    i2c(I2C_SDA0, I2C_SCL0),
    messageBus(),
    display(),
    buttonA(MICROBIT_PIN_BUTTON_A, MICROBIT_ID_BUTTON_A),
    buttonB(MICROBIT_PIN_BUTTON_B, MICROBIT_ID_BUTTON_B),
    buttonAB(MICROBIT_ID_BUTTON_A,MICROBIT_ID_BUTTON_B, MICROBIT_ID_BUTTON_AB),
    accelerometer(i2c),
    compass(i2c, accelerometer, storage),
    compassCalibrator(compass, accelerometer, display),
    thermometer(storage),
    io(MICROBIT_ID_IO_P0,MICROBIT_ID_IO_P1,MICROBIT_ID_IO_P2,
       MICROBIT_ID_IO_P3,MICROBIT_ID_IO_P4,MICROBIT_ID_IO_P5,
       MICROBIT_ID_IO_P6,MICROBIT_ID_IO_P7,MICROBIT_ID_IO_P8,
       MICROBIT_ID_IO_P9,MICROBIT_ID_IO_P10,MICROBIT_ID_IO_P11,
       MICROBIT_ID_IO_P12,MICROBIT_ID_IO_P13,MICROBIT_ID_IO_P14,
       MICROBIT_ID_IO_P15,MICROBIT_ID_IO_P16,MICROBIT_ID_IO_P19,
       MICROBIT_ID_IO_P20),
    bleManager(storage),
    radio(),
    ble(NULL)
{
...
}
```

----

## [mbed-classic](https://github.com/lancaster-university/mbed-classic)

The software at the bottom of the stack is making use of the [ARM mbed OS](https://github.com/ARMmbed/mbed-os) which is:

> .. an open-source embedded operating system designed for the "things" in the Internet of Things (IoT). mbed OS includes the features you need to develop a connected product using an ARM Cortex-M microcontroller.
> 
> mbed OS provides a platform that includes:
> 
> - Security foundations.
> - Cloud management services.
> - Drivers for sensors, I/O devices and connectivity.
> 
> mbed OS is modular, configurable software that you can customize it to your device and to reduce memory requirements by excluding unused software.

We can see this from the layout of it's source, it's based around `common` components, which can be combined with a `hal` (Hardware Abstraction Layers) and a `target` specific to the hardware you are running on.

- [**api**](https://github.com/lancaster-university/mbed-classic/tree/master/api)
- [**common**](https://github.com/lancaster-university/mbed-classic/tree/master/common)
- [**hal**](https://github.com/lancaster-university/mbed-classic/tree/master/hal)
- [**targets**](https://github.com/lancaster-university/mbed-classic/tree/master/targets)
  
More specifically the micro:bit uses the `yotta target bbc-microbit-classic-gcc`, but it can also use [others targets as needed](https://github.com/lancaster-university/microbit-targets).

For reference, here are the files from the `common` section of `mbed` that are used by the `micro:bit-dal`:

- [board.c](https://github.com/lancaster-university/mbed-classic/blob/master/common/board.c)
- [error.c](https://github.com/lancaster-university/mbed-classic/blob/master/common/error.c)
- [FileBase.cpp](https://github.com/lancaster-university/mbed-classic/blob/master/common/FileBase.cpp)
- [FilePath.cpp](https://github.com/lancaster-university/mbed-classic/blob/master/common/FilePath.cpp)
- [FileSystemLike.cpp](https://github.com/lancaster-university/mbed-classic/blob/master/common/FileSystemLike.cpp)
- [gpio.c](https://github.com/lancaster-university/mbed-classic/blob/master/common/gpio.c)
- [I2C.cpp](https://github.com/lancaster-university/mbed-classic/blob/master/common/I2C.cpp)
- [InterruptIn.cpp](https://github.com/lancaster-university/mbed-classic/blob/master/common/InterruptIn.cpp)
- [pinmap_common.c](https://github.com/lancaster-university/mbed-classic/blob/master/common/pinmap_common.c)
- [RawSerial.cpp](https://github.com/lancaster-university/mbed-classic/blob/master/common/RawSerial.cpp)
- [SerialBase.cpp](https://github.com/lancaster-university/mbed-classic/blob/master/common/SerialBase.cpp)
- [Ticker.cpp](https://github.com/lancaster-university/mbed-classic/blob/master/common/Ticker.cpp)
- [ticker_api.c](https://github.com/lancaster-university/mbed-classic/blob/master/common/ticker_api.c)
- [Timeout.cpp](https://github.com/lancaster-university/mbed-classic/blob/master/common/Timeout.cpp)
- [Timer.cpp](https://github.com/lancaster-university/mbed-classic/blob/master/common/Timer.cpp)
- [TimerEvent.cpp](https://github.com/lancaster-university/mbed-classic/blob/master/common/TimerEvent.cpp)
- [us_ticker_api.c](https://github.com/lancaster-university/mbed-classic/blob/master/common/us_ticker_api.c)
- [wait_api.c](https://github.com/lancaster-university/mbed-classic/blob/master/common/wait_api.c)

And here are the hardware specific files, targeting the `NORDIC - MCU NRF51822`:

- [analogin_api.c](https://github.com/lancaster-university/mbed-classic/blob/master/targets/hal/TARGET_NORDIC/TARGET_MCU_NRF51822/analogin_api.c)
- [gpio_api.c](https://github.com/lancaster-university/mbed-classic/blob/master/targets/hal/TARGET_NORDIC/TARGET_MCU_NRF51822/gpio_api.c)
- [gpio_irq_api.c](https://github.com/lancaster-university/mbed-classic/blob/master/targets/hal/TARGET_NORDIC/TARGET_MCU_NRF51822/gpio_irq_api.c)
- [i2c_api.c](https://github.com/lancaster-university/mbed-classic/blob/master/targets/hal/TARGET_NORDIC/TARGET_MCU_NRF51822/i2c_api.c)
- [pinmap.c](https://github.com/lancaster-university/mbed-classic/blob/master/targets/hal/TARGET_NORDIC/TARGET_MCU_NRF51822/pinmap.c)
- [port_api.c](https://github.com/lancaster-university/mbed-classic/blob/master/targets/hal/TARGET_NORDIC/TARGET_MCU_NRF51822/port_api.c)
- [pwmout_api.c](https://github.com/lancaster-university/mbed-classic/blob/master/targets/hal/TARGET_NORDIC/TARGET_MCU_NRF51822/pwmout_api.c)
- [retarget.cpp](https://github.com/lancaster-university/mbed-classic/blob/master/targets/cmsis/TARGET_NORDIC/TARGET_MCU_NRF51822/TOOLCHAIN_ARM_STD/sys.cpp)
- [serial_api.c](https://github.com/lancaster-university/mbed-classic/blob/master/targets/hal/TARGET_NORDIC/TARGET_MCU_NRF51822/serial_api.c)
- [startup_NRF51822.S](https://github.com/lancaster-university/mbed-classic/blob/master/targets/cmsis/TARGET_NORDIC/TARGET_MCU_NRF51822/TOOLCHAIN_GCC_ARM/startup_NRF51822.S)
- [system_nrf51.c](https://github.com/lancaster-university/mbed-classic/blob/master/targets/cmsis/TARGET_NORDIC/TARGET_MCU_NRF51822/system_nrf51.c)
- [twi_master.c](https://github.com/lancaster-university/mbed-classic/blob/master/targets/hal/TARGET_NORDIC/TARGET_MCU_NRF51822/twi_master.c)
- [us_ticker.c](https://github.com/lancaster-university/mbed-classic/blob/master/targets/hal/TARGET_NORDIC/TARGET_MCU_NRF51822/us_ticker.c)

----

## End-to-end (or top-to-bottom)

Finally, lets look a few examples of how the different components within the stack are used in specific scenarios

### Writing to the Display

- [**microbit-dal**](https://github.com/lancaster-university/microbit-dal)  
  - [MicroBitDisplay.cpp](https://github.com/lancaster-university/microbit-dal/blob/master/source/drivers/MicroBitDisplay.cpp), handles scrolling, asynchronous updates and other high-level tasks, before handing off to:
    - [MicroBitFont.cpp](https://github.com/lancaster-university/microbit-dal/blob/master/source/core/MicroBitFont.cpp)
    - [MicroBitImage.cpp](https://github.com/lancaster-university/microbit-dal/blob/master/source/types/MicroBitImage.cpp)
    - [MicroBitMatrixMaps.h](https://github.com/lancaster-university/microbit-dal/blob/master/inc/drivers/MicroBitMatrixMaps.h)
- [**mbed-classic**](https://github.com/lancaster-university/mbed-classic)
  - `void port_write(port_t *obj, int value)` in [port_api.c](https://github.com/lancaster-university/mbed-classic/blob/master/targets/hal/TARGET_NORDIC/TARGET_MCU_NRF51822/port_api.c) ('NORDIC NRF51822' version), via a call to `void write(int value)` in [PortOut.h](https://github.com/lancaster-university/mbed-classic/blob/master/api/PortOut.h), using info from [PinNames.h](https://github.com/lancaster-university/mbed-classic/blob/master/targets/hal/TARGET_NORDIC/TARGET_MCU_NRF51822/TARGET_NRF51_MICROBIT/PinNames.h)

### Storing files on the Flash memory

- [**microbit-dal**](https://github.com/lancaster-university/microbit-dal)  
  - Provides the high-level abstractions, such as:
  - [FileSystem](https://github.com/lancaster-university/microbit-dal/blob/master/source/drivers/MicroBitFileSystem.cpp)
  - [File](https://github.com/lancaster-university/microbit-dal/blob/master/source/drivers/MicroBitFile.cpp)
  - [Flash](https://github.com/lancaster-university/microbit-dal/blob/master/source/drivers/MicroBitFlash.cpp) 
- [**mbed-classic**](https://github.com/lancaster-university/mbed-classic)
  - Allows low-level control of the hardware, such as writing to the flash itself either directly or via the SoftDevice (SD) layer

In addition, this comment from [MicroBitStorage.h](https://github.com/lancaster-university/microbit-dal/blob/master/source/drivers/MicroBitStorage.h) gives a nice overview of how the file system is implemented on-top of the raw flash storage:

```
* The first 8 bytes are reserved for the KeyValueStore struct which gives core
* information such as the number of KeyValuePairs in the store, and whether the
* store has been initialised.
*
* After the KeyValueStore struct, KeyValuePairs are arranged contiguously until
* the end of the block used as persistent storage.
*
* |-------8-------|--------48-------|-----|---------48--------|
* | KeyValueStore | KeyValuePair[0] | ... | KeyValuePair[N-1] |
* |---------------|-----------------|-----|-------------------|
```

----

## Summary

All-in-al; the micro:bit is a very nice piece of kit and hopefully it will achieve its goal 'to help develop a new generation of digital pioneers'. However, it also has a really nice software stack and more importantly one that is each to understand and find your way around.

----

## Further Reading

I've got nothing to add that isn't already included in this [excellent, comprehensive list of resources](https://github.com/carlosperate/awesome-microbit), thanks [Carlos](https://twitter.com/carlosperate) for putting it together!!