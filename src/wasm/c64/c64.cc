// -------------------------------------------------
// ---------------------- C64 ----------------------
// -------------------------------------------------

#include <stdio.h>

#include "c64.h"
#include "tables.h"
#include "keyboard.h"
#include "ram.h"
#include "cpu.h"
#include "cia.h"
#include "vic.h"
#include "sid.h"

static bool basic_in;
static bool kernel_in;
static bool char_in;
static bool io_in;
static uint8 ddr; // ram[0]
static uint8 pr;  // ram[1]
static int count;

static struct CIAState cia1;
static struct CIAState cia2;

void C64Init() {
    printf("Init C64\n");
    count = 0;
    RAMInit();
    CPUInit(C64Read, C64Write);
    KeyboardInit();
    CIAInit(&cia1, 1);
    CIAInit(&cia2, 2);
    C64Reset();

    //this.sid = new SID6581(this.cyclespersecond, this.imagedata.data);
}

// https://www.c64-wiki.com/wiki/PLA_(C64_chip)
// Programmable logic array
static void C64SetPLA() {
    uint8 port = (~ddr) | pr;
    basic_in = (port & 3) == 3;
    kernel_in = (port & 2) != 0;
    char_in = ((port & 3) != 0) && (!(port & 4));
    io_in = ((port & 3) != 0) && ((port & 4) != 0);
}

void C64Reset() {
    //ddr = 0x2F; // set it directly to the data after boot
    //pr = 0x37;
    ddr = 0x2F;
    pr = 0x1F;
    C64SetPLA();
    RAMInit();
    CPUReset();
    CIAReset(&cia1);
    CIAReset(&cia2);
    VICInit();
    SIDInit();

    count = 0;
}

uint8 C64Read(uint16 addr) {
    switch (addr >> 12) {
        case 0x0:
            if (addr <= 1) {
                if (addr == 0) return ddr;
                if (addr == 1) return ((ddr & pr) | (~ddr & 0x17));
            }
            break;

        case 0xA:
        case 0xB:
            if (basic_in) return basicrom[addr & 0x1FFF];
            break;

        case 0xD:
            if (char_in) return charrom[addr & 0x0FFF];
            if (io_in) {
                switch (addr >> 8) {
                    case 0xD0:
                    case 0xD1:
                    case 0xD2:
                    case 0xD3:
                        return VICRead(addr & 0x3F);

                    case 0xD4:
                    case 0xD5:
                    case 0xD6:
                    case 0xD7:
                        return SIDRead(addr&31);

                    case 0xD8:
                    case 0xD9:
                    case 0xDA:
                    case 0xDB:
                        return colorram[addr & 0x3FF];

                    case 0xDC:
                        return CIARead(&cia1, addr & 0xF);

                    case 0xDD:
                        return CIARead(&cia2, addr & 0xF);

                    default:
                        break;
                }
            }
            break;

        case 0xE:
        case 0xF:
            if (kernel_in) return kernelrom[addr & 0x1FFF];
            break;
    }
    return ram[addr];
}

void C64Write(uint16 addr, uint8 x) {
    switch (addr >> 12) {
        case 0x0:
            if (addr <= 1) {
                switch (addr) {
                    case 0:
                        ddr = x;
                        break;
                    case 1:
                        pr = x;
                        C64SetPLA();
                        //printf("Access: %i Basic: %i Kernel %i Char %i IO %i %X\n", cpu.PC, basic_in, kernel_in, char_in, io_in, cpu.PC);
                        break;
                }
                return;
            }
            break;

        case 0xD:
            if (io_in) {
                switch (addr >> 8) {
                    case 0xD0:
                    case 0xD1:
                    case 0xD2:
                    case 0xD3:
                        VICWrite(addr & 0x3F, x);
                        break;

                    case 0xD4:
                    case 0xD5:
                    case 0xD6:
                    case 0xD7:
                        // this.sid.Update(this.count);
                        SIDWrite(addr&31, x);
                        break;

                    case 0xD8:
                    case 0xD9:
                    case 0xDA:
                    case 0xDB:
                        colorram[addr & 0x3FF] = x;
                        break;

                    case 0xDC:
                        CIAWrite(&cia1, addr & 0xF, x);
                        break;

                    case 0xDD:
                        CIAWrite(&cia2, addr & 0xF, x);
                        VICSetBank((~cia2.regs[0]) & 3);
                        break;

                    default:
                        break;
                }
                return;
            } // if io_in
            break;
    }
    ram[addr] = x;
}

void C64MainLoop(int cycles) {
    while (cycles > 0) {
        int diff = CPUStep(5);
        count += diff;
        CIACalcSteps(&cia2, diff);
        CIACalcSteps(&cia1, diff);
        VICCalcSteps(diff);
        cycles -= diff;
    }
}
