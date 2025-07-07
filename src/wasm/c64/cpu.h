#ifndef CPU_H
#define CPU_H

#include"types.h"

extern uint8 AC, XR, YR;
extern uint16 PC;

typedef uint8 (*ReadFunc)(uint16 addr);
typedef void (*WriteFunc)(uint16 addr, uint8 x);

/*
uint8 Read(uint16 addr) {
    return C64Read(addr);
}

void Write(uint16 addr, uint8 x) {
    C64Write(addr, x);
}
*/
void CPUInit(ReadFunc r, WriteFunc w);
void CPUReset();

void CPUMaskableInterrupt();

void CPUNonMaskableInterrupt();

int CPUStep(int steps);

void CPUSetPC(uint16 pc);

#endif