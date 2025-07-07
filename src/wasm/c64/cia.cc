// -------------------------------------------------
// ------------------ CIA 6526----------------------
// -------------------------------------------------

#include <stdio.h>

#include"cia.h"
#include"keyboard.h"
#include"cpu.h"

static void CIATriggerInterrupt(struct CIAState *cia);
static void CIAClearInterrupt(struct CIAState *cia);

void CIAInit(struct CIAState *cia, int n) {
    printf("Init CIA%i\n", n);
    cia->no = n;
    CIAReset(cia);
}

void CIAReset(struct CIAState *cia) {
    for (int i = 0; i < 16; i++) cia->regs[i] = 0;
    cia->iflags = 0x0;
    cia->timeralatch = 0xFFFF;
    cia->timerblatch = 0xFFFF;
    //clockcounter = 0x0;
    CIAClearInterrupt(cia);
}

static void CIATriggerInterrupt(struct CIAState *cia) {
    cia->regs[13] |= 0x80u;
    cia->interrupt = true;
    if (cia->no == 1) CPUMaskableInterrupt();
    if (cia->no == 2) CPUNonMaskableInterrupt();
}

static void CIAClearInterrupt(struct CIAState *cia) {
    cia->interrupt = false;
}

void CIACalcSteps(struct CIAState *cia, int counts) {
    if (cia->regs[14] & 1u) { // is timer starter, control timer register
        //printf("Timer 1\n");
        int countera = cia->regs[4] | (cia->regs[5] << 8);
        countera = countera - counts;
        if (countera <= 0) {
            countera += cia->timeralatch;
            if (cia->regs[14] & 8) // 1 shot?
            {
                countera = 0x0;
                cia->regs[14] &= ~1u;
            }
            if (cia->iflags & 1) {
                cia->regs[13] |= 1;
                CIATriggerInterrupt(cia);
            }
        }
        cia->regs[4] = countera & 0xFFu;
        cia->regs[5] = (countera >> 8u) & 0xFFu;
    }

    if (cia->regs[15] & 1) { // is timer starter, control timer register
        //printf("Timer 2\n");
        int counterb = cia->regs[6] | (cia->regs[7] << 8);
        counterb = counterb - counts;
        if (counterb <= 0) {
            counterb += cia->timerblatch;
            if (cia->regs[15] & 8)        //1 shot?
            {
                counterb = 0x0;
                cia->regs[15] &= ~1;
            }
            if (cia->iflags & 2) {
                cia->regs[13] |= 2;
                CIATriggerInterrupt(cia);
            }
        }
        cia->regs[6] = counterb & 0xFF;
        cia->regs[7] = (counterb >> 8) & 0xFF;
    }
    /*
    clockcounter = clockcounter + counts;
    if (clockcounter >= 100000)
    {
        clockcounter = 0;
        if (regs[8] == 10)
        {
            regs[8] = 0;
            regs[9]++;
            if ((regs[9] & 15) == 10) regs[9] = (regs[9] & 240) + 16;
            if (regs[9] == 96)
            {
                regs[9] = 0;
                regs[10]++;
            }
        }
    }
*/
}

uint8 CIARead(struct CIAState *cia, uint16 addr) {
    switch (addr) {
        case 0:
            if (cia->no == 1) {
                //return keyboard.joystickport;
                return 127;
            } else {
                return cia->regs[0] | (~cia->regs[2]);
            }
            break;
        case 1:
            if (cia->no == 1) {
                cia->regs[1] = 0;
                for(int row=0; row<8; row++) {
                    if ((cia->regs[0] & (1 << row)) == 0) {
                        cia->regs[1] |= keyboardrow[row];
                    }
                }
                cia->regs[1] = ~cia->regs[1];
                return cia->regs[addr];
            } else {
                return cia->regs[1] | (~cia->regs[3]);
            }
            break;
        case 13: {
            uint8 temp = cia->regs[13];
            cia->regs[13] = 0x0;
            CIAClearInterrupt(cia);
            return temp;
        }
        default:
            return cia->regs[addr];
    }
}

void CIAWrite(struct CIAState *cia, uint16 addr, uint8 x) {
    //printf("CIA Write %i %i %i\n", cia->no, addr, x);
    switch (addr) {
        case 4:
            cia->timeralatch = (cia->timeralatch & 0xFF00u) | x;
            break;
        case 5:
            cia->timeralatch = (cia->timeralatch & 0xFFu) | ((uint16)x << 8);
            break;
        case 6:
            cia->timerblatch = (cia->timerblatch & 0xFF00u) | x;
            break;
        case 7:
            cia->timerblatch = (cia->timerblatch & 0xFFu) | ((uint16)x << 8);
            break;
        case 13:
            //set iflags
            //0=interrupt on
            //1=interrupt off
            if (x & 0x80) {
                cia->iflags |= x & ~0x80u;
            } else cia->iflags &= ~x;
            break;
        case 14:
            if ((x & 1) & !(cia->regs[14] & 1)) {
                cia->regs[4] = cia->timeralatch & 0xFF;
                cia->regs[5] = (cia->timeralatch >> 8) & 0xFF;
            }
            cia->regs[addr] = x;
            break;
        case 15:
            if ((x & 1) & !(cia->regs[15] & 1)) {
                cia->regs[6] = cia->timerblatch & 0xFF;
                cia->regs[7] = (cia->timerblatch >> 8) & 0xFF;
            }
            cia->regs[addr] = x;
            break;
        default:
            cia->regs[addr] = x;
            break;
    }
}
