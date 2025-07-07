#ifndef VIC_H
#define VIC_H

#include <stdbool.h>
#include "types.h"

extern uint8 regs[64];
extern uint8* colorram;
extern uint16 zeichenramaddress;
extern int bank;
extern int scrollx;

void VICInit();

bool VICIsShiftedCharset();

uint8* VICGetImage();

uint8 VICRead(uint8 addr);

void VICWrite(uint8 addr, uint8 x);

void VICSetBank(int _bank);

void VICCalcSteps(int count);

#endif