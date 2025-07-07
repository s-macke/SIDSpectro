// -------------------------------------------------
// -------------------- VIC II ---------------------
// -------------------------------------------------

// resolution in X: 63*8 pixels = 504 pixels

#include <stdbool.h>
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include "tables.h"
#include "vic.h"
#include "cpu.h"
#include "ram.h"

uint8 regs[64];
uint8* colorram = 0;

static uint8 spriteline[8];
static uint8** image = 0;

static int cycles;
static int rasterline;
int bank;
static bool ecm, mcm, bmm, charen;

static int r, h1, h2, h3;
int h0;
int scrollx;
static int scrolly;

static uint16_t charramaddress;
uint16_t zeichenramaddress;

void VICInit() {
    printf("Init VIC\n");
    for (int i = 0; i < 64; i++) regs[i] = 0x0;

    if (colorram == 0) {
        colorram = (uint8*)malloc(1024);
    }
    memset(colorram, 0, 1024);

    if (image == 0) {
        image = (uint8**)malloc(200 * sizeof(uint8*));
        uint8* buffer = (uint8*)malloc(320 * 200 * sizeof(uint8));
        memset(buffer, 0, 320 * 200);

        for (int j = 0; j < 200; j++) {
            image[j] = &buffer[j * 320];
        }
    }

    cycles = 0;
    rasterline = 0;

    bank = 0;
    ecm = false;
    mcm = false;
    bmm = false;
    r = 0x0;
    h0 = 0x0;
    h1 = 0x0;
    h2 = 0x0;
    h3 = 0x0;
    scrollx = 0x0;
    scrolly = 0x0;
    zeichenramaddress = 0x0;
    charramaddress = 0x0;
    charen = false;
}

bool VICIsShiftedCharset() {
    return regs[0x18] & 2;
}

uint8 *VICGetImage() {
    return &image[0][0];
}

static void VICUpdateAddresses() {
    zeichenramaddress = (regs[0x18] & 0xF0) * 64 + (bank * 0x4000);
    charramaddress = (regs[0x18] & 0x0E) * 1024 + (bank * 0x4000);
}

void VICSetBank(int _bank) {
    bank = _bank;
    VICUpdateAddresses();
}

uint8 VICRead(uint8 addr) {
    switch (addr) {
        case 0x12:
            return rasterline & 0xFF;
        case 0x11:
            return (regs[addr] & 127) | ((rasterline >> 1) & 128);
        case 0x19:
            return regs[addr] | 0x70;
        case 0x1A:
            return regs[addr] | 0xF0;
        case 0x16:
            return regs[addr] | 0xC0;
        case 0x20:
        case 0x21:
        case 0x22:
        case 0x23:
        case 0x24:
        case 0x25:
        case 0x26:
        case 0x27:
        case 0x28:
        case 0x29:
        case 0x2A:
        case 0x2B:
        case 0x2C:
        case 0x2D:
        case 0x2E:
            return regs[addr] | 0xF;
        case 0x2F:
        case 0x30:
        case 0x31:
        case 0x32:
        case 0x33:
        case 0x34:
        case 0x35:
        case 0x36:
        case 0x37:
        case 0x38:
        case 0x39:
        case 0x3A:
        case 0x3B:
        case 0x3C:
        case 0x3D:
        case 0x3E:
            return 0xFF;
        default:
            return regs[addr];
    }
}

void VICWrite(uint8 addr, uint8 x) {
    //printf("VIC Write 0x%02x %i\n", addr, x);
    regs[addr] = x;

    switch (addr) {
        case 0x11:
            ecm = (x & (1u << 6u)) != 0;
            bmm = (x & (1u << 5u)) != 0;
            scrolly = x & 7u;
            break;
        case 0x16:
            mcm = (x & (1u << 4u)) != 0;
            scrollx = x & 7u;
            break;

        case 0x18:
            regs[addr] = x;
            VICUpdateAddresses();
            break;

        case 0x19:
            x = 0x0; // interrupt remove
            break;

        case 0x20:
            r = x & 15;
            break;

        case 0x21:
            h0 = x & 15;
            break;

        case 0x22:
            h1 = x & 15;
            break;

        case 0x23:
            h2 = x & 15;
            break;

        case 0x24:
            h3 = x & 15;
            break;

        default:
            break;
    }
}

static void VICDrawCharRomLine(uint32 line, int xp, int num, int charcolor) {
    int m = (num << 3) | (line & 7);
    int x = charrom[m | ((regs[0x18] & 2) << 10)];
    uint8 *screenline = image[line];
    for (int i = 0; i < 8; i++) {
        if (x & (1 << (7 - i))) { screenline[i + xp] = charcolor; } else { screenline[i + xp] = h0; }
    }
}

static void VICDrawCharRamLine(uint32 line, int xp, int num, int8 charcolor) {
    int m = charramaddress + (num << 3) + (line & 7);
    int x = ram[m];
    uint8 *screenline = image[line];
    for (int i = 0; i < 8; i++) {
        if (x & (1 << (7 - i))) { screenline[i + xp] = charcolor; } else { screenline[i + xp] = h0; }
    }
}

static void VICDrawTextLine(uint32 line) {
    uint16 i;
    uint16 m = zeichenramaddress + 40 * (line >> 3);
    if (charen) {
        uint8 *screenline = image[line];
        int x = 0;
        for (i = 0; i < 40; i++) {
            int m2 = (ram[m] << 3) | (line & 7);
            int x2 = charrom[m2 | ((regs[0x18] & 2) << 10)];
            int charcolor = colorram[(line >> 3) * 40 + i];
            for (int j = 0; j < 8; j++) {
                if (x2 & (1 << (7 - j))) { screenline[x++] = charcolor; } else { screenline[x++] = h0; }
            }
            m++;
            VICDrawCharRomLine(line, i << 3, ram[m], colorram[(line >> 3) * 40 + i]);
        }
    } else {
        for (i = 0; i < 40; i++) {
            VICDrawCharRamLine(line, i << 3, ram[m], colorram[(line >> 3) * 40 + i]);
            m++;
        }
    }
}

static void VICDrawMultiColorTextLine(uint16 line) {
    uint16_t m = zeichenramaddress + 40 * (line >> 3);
    int j = line >> 3;
    uint8 *screenline = image[line];
    int x = 0;

    for (int i = 0; i < 40; i++) {
        if (((colorram[j * 40 + i] >> 3) & 1) == 0) {
            VICDrawCharRamLine(line, i << 3, ram[m], colorram[j * 40 + i]);
            x += 8;
        } else {
            int l = line & 7;
            for (int k = 0; k < 4; k++) {
                uint8 col, col2;
                if (charen) col = charrom[8 * ram[m] + l] >> (6 - (k << 1)) & 3;
                else
                    col = ram[charramaddress + 8 * ram[m] + l] >> (6 - (k << 1)) & 3;

                switch (col & 3) {
                    case 0:
                        col2 = h0;
                        break;
                    case 1:
                        col2 = h1;
                        break;
                    case 2:
                        col2 = h2;
                        break;
                    case 3:
                        col2 = colorram[j * 40 + i] & 7u;
                        break;
                }
                screenline[x++] = col2;
                screenline[x++] = col2;
            }
        }
        m++;
    }  //for
}

static void VICDrawMulticolorBitmapLine(uint16 line) {
    uint8 col, col2;
    uint8 ch = 0;
    uint16_t m = charramaddress + ((line >> 3) * 40 * 8) + (line & 7);
    int j = line >> 3;
    uint8 *screenline = image[line];
    int x = 0;
    for (int i = 0; i < 40; i++) {
        ch = ram[m];
        for (int k = 0; k < 4; k++) {
            col = (ch >> (6 - (k << 1))) & 3;
            switch (col & 3u) {
                case 0:
                    col2 = h0;
                    break;
                case 1:
                    col2 = (ram[zeichenramaddress + j * 40 + i] >> 4) & 15;
                    break;
                case 2:
                    col2 = ram[zeichenramaddress + j * 40 + i] & 15;
                    break;
                case 3:
                    col2 = colorram[j * 40 + i] & 15;
                    break;
            }
            screenline[x++] = col2;
            screenline[x++] = col2;
        }
        m += 8;
    }
}

static void VICDrawBitmapLine(int line) {
    uint16_t m = charramaddress + ((line >> 3) * 40 * 8) + (line & 7);
    int j = line >> 3;
    uint16 m2 = zeichenramaddress + j * 40 + 0;
    uint8 cola = 0;
    uint8 colb = 0;
    uint8 ch = 0;
    uint8 *screenline = image[line];
    int x = 0;
    for (int i = 0; i < 40; i++) {
        cola = (ram[m2] >> 4) & 15;
        colb = ram[m2] & 15;
        ch = ram[m] | 0;
        for (int l = 0; l < 8; l++) {
            if ((ch >> (7 - l)) & 1) screenline[x++] = cola; else screenline[x++] = colb;
        }
        m += 8;
        m2++;
    }
}

static void VICDrawSpritesLine(uint16_t line) {
    int smc0, smc1;
    int x, y;
    int xexp, yexp;

    for (int i = 7; i >= 0; i--) {
        if ((regs[0x15] & (1 << i)) == 0) continue;
        uint16_t spriteramaddress = ((ram[zeichenramaddress + 1016 + i]) << 6) + (bank * 0x4000);
        x = (((regs[0x10] >> i) & 1) << 8) + regs[i * 2 + 0] - 24 - scrollx;
        y = regs[i * 2 + 1] - 50;
        if (y == line) spriteline[i] = y;
        xexp = (regs[0x1D] >> i) & 1;
        yexp = (regs[0x17] >> i) & 1;

        if ((line >= spriteline[i]) && (line <= spriteline[i] + 20 * (yexp + 1))) {
            int l = (line - spriteline[i]) >> yexp;
            uint8_t scol = regs[0x27 + i];

            if (((regs[0x1C] >> i) & 1) == 0) { // not multicolor
                for (int k = 0; k < 3; k++) {
                    uint8 dat = ram[spriteramaddress + l * 3 + k];
                    for (int j = 0; j < 8; j++) {
                        if (xexp == 0) { //x expansion
                            if ((x + k * 8 + j <= 319) && (x + k * 8 + j >= 0) && (dat & (1 << (7 - j)))) {
                                image[line][x + k * 8 + j] = scol;
                            }
                        } else {
                            if (dat & (1 << (7 - j))) {
                                if ((x + k * 16 + (j * 2) <= 319) && (x + k * 16 + (j * 2) >= 0))
                                    image[line][x + k * 16 + j * 2] = scol;
                                if ((x + k * 16 + (j * 2) + 1 <= 319) && (x + k * 16 + (j * 2) + 1 >= 0))
                                    image[line][x + k * 16 + j * 2 + 1] = scol;
                            }
                        }
                    }
                }
            } else {   //multicolor
                smc0 = regs[0x25] & 0xF;
                smc1 = regs[0x26] & 0xF;

                for (int k = 0; k < 3; k++) {
                    uint8 dat = ram[spriteramaddress + l * 3 + k];
                    for (int j = 0; j < 4; j++) {
                        //var col2 = (bit(dat,7-(j*2)-1,7-(j*2)));
                        uint8 col2 = (dat >> ((3 - j) << 1)) & 3;

                        uint8 col;
                        switch (col2 & 3u) {
                            case 0:
                                continue;
                            case 1:
                                col = smc0;
                                break;
                            case 2:
                                col = scol;
                                break;
                            case 3:
                                col = smc1;
                                break;
                        }

                        if (xexp == 0) //x expansion
                        {
                            if ((x + k * 8 + (j * 2) <= 319) && (x + k * 8 + (j * 2) >= 0))
                                image[line][x + k * 8 + (j * 2)] = col;
                            if ((x + k * 8 + (j * 2) + 1 <= 319) && (x + k * 8 + (j * 2) + 1 >= 0))
                                image[line][x + k * 8 + (j * 2) + 1] = col;
                        } else {
                            if ((x + k * 16 + (j * 4) + 0 <= 319) && (x + k * 16 + (j * 4) + 0 >= 0))
                                image[line][x + k * 16 + (j * 4)] = col;
                            if ((x + k * 16 + (j * 4) + 1 <= 319) && (x + k * 16 + (j * 4) + 1 >= 0))
                                image[line][x + k * 16 + (j * 4) + 1] = col;
                            if ((x + k * 16 + (j * 4) + 2 <= 319) && (x + k * 16 + (j * 4) + 2 >= 0))
                                image[line][x + k * 16 + (j * 4) + 2] = col;
                            if ((x + k * 16 + (j * 4) + 3 <= 319) && (x + k * 16 + (j * 4) + 3 >= 0))
                                image[line][x + k * 16 + (j * 4) + 3] = col;
                        }
                    } // for j
                } // for k=0..2
            }//if
        } // if
    } // for i 7 downto 0
}

static void VICDrawLine(int line) {
    charen = ((charramaddress & 0x7000) == 0x1000) ? true : false;

    if (ecm == true) {
        for (int i = 0; i < 320; i++) image[line][i] = 0;
        return;
    }
    if (bmm == false) {
        if (mcm == false) {
            VICDrawTextLine(line);
        } else {
            VICDrawMultiColorTextLine(line);
        }
    } else if (mcm == false) {
        VICDrawBitmapLine(line);
    } else {
        VICDrawMulticolorBitmapLine(line);
    }
    VICDrawSpritesLine(line);
}

void VICCalcSteps(int count) {
    cycles += count;
    if (cycles <= 62) return;

    cycles -= 63;
    if ((rasterline >= 51) && (rasterline <= 250)) {
        VICDrawLine(rasterline - 51);
    }

    rasterline++;

    if (rasterline >= 312) {
        rasterline = 0;
    }

    if (regs[0x1a] & 1) {
        //printf("VIC interrupt\n");
        int lineirq = regs[0x12] + (((regs[0x11] >> 7) & 1) << 8);
        if (rasterline == lineirq) {
            //if (regs[0x19] == 0)
            {
                regs[0x19] = 128 | 1;
                CPUMaskableInterrupt();
            }
        }
    }
}

