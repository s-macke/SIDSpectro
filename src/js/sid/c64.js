// -------------------------------------------------
// ---------------------- C64 ----------------------
// -------------------------------------------------

"use strict";

//var keyboard = new KeyboardInput();

function C64(onUpdateSpectrum) {
    this.cyclespersecond = 985248; // PAL
    this.mem = new Uint8Array(0x10000);
    this.basic_in = true;
    this.kernel_in = true;
    this.char_in = false;
    this.io_in = true;
    this.ddr = 0x0; // mem[0]
    this.pr = 0x0; // mem[1]
    this.count = 0;
    this.cpu = new MOS6502(this.Read.bind(this), this.Write.bind(this), this.mem);
    this.cia1 = new CIA6526(this.cpu.MaskableInterrupt.bind(this.cpu), 2);
    this.cia2 = new CIA6526(this.cpu.NonMaskableInterrupt.bind(this.cpu), 2);
    //this.cia2 = new CIA6526(this.cpu.MaskableInterrupt.bind(this.cpu), 2);
    this.vic = new VICII(this.mem, this.cpu.MaskableInterrupt.bind(this.cpu));
    //this.sid = new SID6581(this.cyclespersecond, onUpdateSpectrum);
    this.sid = new ReSID(this.cyclespersecond, onUpdateSpectrum);
    this.starttime = this.sid.soundbuffer.GetTime();
    this.count = 0;
}

C64.prototype.Reset = function () {
    this.basic_in = true;
    this.kernel_in = true;
    this.char_in = false;
    this.io_in = true;
    this.ddr = 0x1F; // mem[0] // every important part is writeable
    this.pr = 0x0; // mem[1]
    this.cpu.Reset();
    this.sid.Reset();
    this.cia1.Reset();
    this.cia2.Reset();
    this.vic.Reset();
    for (let i = 0; i < 0x10000; i++) this.mem[i] = 0x0;
}

C64.prototype.Read = function (addr) {
    addr &= 0xFFFF;
    switch (addr >> 12) {
        case 0x0:
            if (addr <= 1) {
                if (addr === 0) return this.ddr | 0;
                if (addr === 1) return ((this.ddr & this.pr) | (~this.ddr & 0x17)) | 0;
            }
            break;

        case 0xA:
        case 0xB:
            if (this.basic_in) return basicrom[addr & 0x1FFF] | 0;
            break;

        case 0xD:
            if (this.char_in) return charrom[addr & 0x0FFF] | 0;
            if (this.io_in) {
                if ((addr >= 0xD000) && (addr <= 54271)) return this.vic.Read(addr & 0x3F) | 0; else if ((addr >= 0xD400) && (addr <= 55295)) return this.sid.Read(addr & 31); else if ((addr >= 0xD800) && (addr <= 0xDBFF)) return this.vic.colorram[addr & 0x3FF] | 0; else if ((addr >= 0xDC00) && (addr <= 56575)) return this.cia1.Read(addr & 0xF) | 0; else if ((addr >= 0xDD00) && (addr <= 0xDFFF)) return this.cia2.Read(addr & 0xF) | 0;
                //DebugMessage("IO: " + addr);
            }
            break;

        case 0xE:
        case 0xF:
            if (this.kernel_in) return kernelrom[addr & 0x1FFF] | 0;
            break;
    }

    return this.mem[addr];
}

C64.prototype.Write = function (addr, x) {
    addr &= 0xFFFF;
    x = x & 0xFF;

    switch (addr >> 12) {
        case 0x0:
            if (addr <= 1) {
                switch (addr) {
                    case 0:
                        this.ddr = x;
                        break;
                    case 1:
                        this.pr = x;
                        let port = (~this.ddr) | this.pr;
                        this.basic_in = (port & 3) === 3;
                        this.kernel_in = (port & 2) !== 0;
                        this.char_in = ((port & 3) !== 0) && (!(port & 4));
                        this.io_in = ((port & 3) !== 0) && ((port & 4) !== 0);
                        break;
                }
                //DebugMessage("access " + this.basic_in + " " + this.kernel_in + " " + this.char_in + " " + this.io_in);
                return;
            }
            break;

        case 0xD:
            if (this.io_in) {
                if ((addr >= 0xD000) && (addr <= 54271)) this.vic.Write(addr & 0x3F, x); else if ((addr >= 0xD800) && (addr <= 0xDBFF)) this.vic.colorram[addr & 0x3FF] = x;
                if ((addr >= 0xDD00) && (addr <= 57343)) {
                    this.cia2.Write(addr & 0xF, x);
                    this.vic.SetBank((~this.cia2.regs[0]) & 3);
                } else if ((addr >= 0xDC00) && (addr <= 56575)) this.cia1.Write(addr & 0xF, x); else if ((addr >= 54272) && (addr <= 55295)) {
                    this.sid.Update(this.count);
                    this.sid.Write(addr & 31, x);
                }
                //DebugMessage("IO Region " + addr);
                return;
            }
            break;
    }
    this.mem[addr] = x;
}

C64.prototype.MainLoop = function () {
    let diff = 0;
    let steps = 4000;
    while (steps--) {
        diff = this.cpu.Step(5);
        this.count += diff;
        this.cia2.CalcSteps(diff);
        this.cia1.CalcSteps(diff);
        this.vic.CalcSteps(diff);
    }
    this.sid.Update(c64.count);

    let currenttime = this.sid.soundbuffer.GetTime();
    let elapsedtime = currenttime - this.starttime;
    let wait = (this.count * 1000. / this.cyclespersecond) - elapsedtime * 1000.;
    if (wait < 0) {
        if (wait < -1000) // reset, we are too far off
        {
            console.log("Timer adjustment: " + wait);
            c64.sid.starttime = elapsedtime;
            c64.count = elapsedtime * this.cyclespersecond;
        }
        wait = 0;
    }
    if (typeof sidfile != 'undefined') {
        LoadSIDFile(sidfile);
        sidfile = undefined;
    }
    window.setTimeout(this.MainLoop.bind(this), wait);
}


function GenCopy8(dest, src, memoffset) {
    c64.Write(memoffset++, 0xAD); // LDA ABS
    c64.Write(memoffset++, src & 0xFF);
    c64.Write(memoffset++, src >> 8);

    c64.Write(memoffset++, 0x8D); // STA ABS
    c64.Write(memoffset++, dest & 0xFF);
    c64.Write(memoffset++, dest >> 8);

    return memoffset;
}

function GenCopy16(dest, src, memoffset) {
    c64.Write(memoffset++, 0xAD); // LDA ABS
    c64.Write(memoffset++, src & 0xFF);
    c64.Write(memoffset++, src >> 8);

    c64.Write(memoffset++, 0x8D); // STA ABS
    c64.Write(memoffset++, dest & 0xFF);
    c64.Write(memoffset++, dest >> 8);

    c64.Write(memoffset++, 0xAD); // LDA ABS
    c64.Write(memoffset++, (src + 1) & 0xFF);
    c64.Write(memoffset++, (src + 1) >> 8);

    c64.Write(memoffset++, 0x8D); // STA ABS
    c64.Write(memoffset++, (dest + 1) & 0xFF);
    c64.Write(memoffset++, (dest + 1) >> 8);

    return memoffset;
}

function GenStore(addr, memoffset) {
    c64.Write(memoffset++, 0x8D); // STA ABS
    c64.Write(memoffset++, addr & 0xFF);
    c64.Write(memoffset++, addr >> 8);
    return memoffset;
}

function GenLoad(addr, memoffset) {
    c64.Write(memoffset++, 0xAD); // LDA ABS
    c64.Write(memoffset++, addr & 0xFF);
    c64.Write(memoffset++, addr >> 8);
    return memoffset;
}


function GenJSR(addr, memoffset) {
    c64.Write(memoffset++, 0x20); // JSR
    c64.Write(memoffset++, addr & 0xFF);
    c64.Write(memoffset++, addr >> 8);
    return memoffset
}

function GenLDAi(x, memoffset) {
    c64.Write(memoffset++, 0xA9); // lda IMM
    c64.Write(memoffset++, x);
    return memoffset;
}

function LoadSIDFile(sidfile) {
    if (!sidfile.data) return;
    sidfile.Print();

// ---------------------------------------------
    c64.Reset();
// ---------------------------------------------
    kernelrom[0xFD69 - 0xe000] = 0x9F; // bypass memory check
    kernelrom[0xE55f - 0xe000] = 0x9F; // bypass screen clear
    while (c64.cpu.PC !== 0xE394) // until basic init routine
//	while(c64.cpu.PC != 0xE39D) // after basic init routine
//	while(c64.cpu.PC != 0xA483) // standard warm start routine (kind of idle)
    {
        let diff = c64.cpu.Step(1);
        //c64.count += diff;
        //c64.cia2.CalcSteps(diff);
        //c64.cia1.CalcSteps(diff);
        //c64.vic.CalcSteps(diff);
    }

    for (let i = sidfile.offset; i < sidfile.data.length; i++) {
        c64.mem[sidfile.loadaddr - sidfile.offset + i] = sidfile.data[i];
    }

    let memoffset = 1024;
    if (sidfile.startpage !== 0)
        memoffset = sidfile.startpage << 8;
    else if ((sidfile.loadaddr >> 8) < (memoffset >> 8)) {
        memoffset = ((sidfile.endaddr) & 0xFF00) + 0x100;
    }
    c64.cpu.PC = memoffset;

// ---------------------------------------------

    if (sidfile.magicid === "RSID") {

        // set VIC raster lines
        memoffset = GenLDAi(0x9B, memoffset);
        memoffset = GenStore(0xD011, memoffset);

        memoffset = GenLDAi(0x37, memoffset);
        memoffset = GenStore(0xD012, memoffset);

//	c64.vic.Write(0x12, 0x37);
//	c64.vic.Write(0x11, 0x9B);

        memoffset = GenLDAi(sidfile.startsong - 1, memoffset);
        memoffset = GenJSR(sidfile.initaddr, memoffset);
        c64.Write(memoffset++, 0xB7); // EMU: should emulate endless loop


        // init memory map
        c64.Write(0, 0x2F);
        c64.Write(1, 0x37);

        //c64.Write(0x318, 0x47);
        //c64.Write(0x319, 0xFE);

        /*
            for(let i=0; i<100; i++)
            {
            c64.cpu.Disassemble();
            c64.cpu.Step(1);
            }
            console.log("Basic? " + c64.basic_in);
            console.log("Kernel? " + c64.kernel_in);
            console.log("IO? " + c64.io_in);
        */
        return;
    }

// ---------------------------------------------

    // 0 = 50 Hz PAL, 60 Hz NTSC
    // 1 = CIA 1 timer interrupt default 60 Hz
    let speed = 0;
    if (sidfile.startsong > 32) {
        speed = (sidfile.speed >> 31) & 1;
    } else {
        speed = (sidfile.speed >> (sidfile.startsong - 1)) & 1;
    }

    let store = memoffset + 240;
    c64.Write(memoffset++, 0x78); // SEI

    // set VICII raster to line 0 for PSIDs

    memoffset = GenLDAi(0x1B, memoffset);
    memoffset = GenStore(0xD011, memoffset);
    memoffset = GenLDAi(0x00, memoffset);
    memoffset = GenStore(0xD012, memoffset);

    // execute init
    memoffset = GenLDAi(sidfile.startsong - 1, memoffset);
    memoffset = GenJSR(sidfile.initaddr, memoffset);

    // activate loop
    if (sidfile.playaddr !== 0) {
        memoffset = GenCopy16(store, 0xFFFE, memoffset);

        // activate cia timer and interrupt
        memoffset = GenLDAi(0x1, memoffset);
        memoffset = GenStore(56320 + 14, memoffset);
    }
    memoffset = GenCopy16(0xFFFE, store + 2, memoffset);

    // the kernel and ram should be off
    memoffset = GenLDAi(0x5, memoffset);
    memoffset = GenStore(0x1, memoffset);

    c64.Write(memoffset++, 0x58); // CLI
    c64.Write(memoffset++, 0xB7); // EMU: should emulate endless loop


    // endless loop
    c64.Write(memoffset++, 0x4C); // jmp
    c64.Write(memoffset++, (memoffset - 2) & 0xFF); // low
    c64.Write(memoffset++, (memoffset - 3) >> 8); // high


// ------ Interrupt Handler ------

    c64.mem[store + 2] = memoffset & 0xFF;
    c64.mem[store + 3] = memoffset >> 8;

    memoffset = GenCopy16(0xFFFE, store, memoffset);

    memoffset = GenLDAi(0x0, memoffset);

    // execute by using jsr
    memoffset = GenJSR(sidfile.playaddr, memoffset);
    memoffset = GenCopy16(0xFFFE, store + 2, memoffset);

    memoffset = GenLDAi(0x5, memoffset);
    memoffset = GenStore(0x1, memoffset);

    // reset interrupt
    c64.Write(memoffset++, 0xCE); // dec
    c64.Write(memoffset++, 0x19);
    c64.Write(memoffset++, 0xd0);

    // reset interrupt
    memoffset = GenLoad(0xDC0D, memoffset);
    c64.Write(memoffset++, 0x40); // rti

    /*
        c64.cia1.timeralatch = 0x411A; // 60Hz // 42C7???
        c64.cia1.regs[4] = 0x1A; // low byte counter
        c64.cia1.regs[5] = 0x41; // high byte counter
    */

    c64.cia1.timeralatch = 0x4E20; // 50Hz
    c64.cia1.regs[4] = 0x20; // low byte counter
    c64.cia1.regs[5] = 0x4E; // high byte counter

    c64.cia1.iflags = 1; // interrupt enabled

    if (sidfile.magicid === "PSID") {
        c64.basic_in = false;
        c64.kernel_in = false;
        c64.char_in = false;
        c64.io_in = true;
    } else {
        c64.Write(0, 0x2F);
        c64.Write(1, 0x37);
        //c64.cia1.regs[14] = 1;
        //c64.vic.regs[0x1a] = 0;
    }
    /*
        for(var i=0; i<10000; i++)
        {
        c64.cpu.Disassemble();
        c64.cpu.Step(1);
        }
    */

}

