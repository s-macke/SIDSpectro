#ifndef CIA_H
#define CIA_H

#include "types.h"
#include <stdbool.h>

struct CIAState {
    uint8 regs[16];

    int iflags;
    uint16_t timeralatch;
    uint16_t timerblatch;
    int no;

    bool interrupt;
    //int clockcounter;
};


void CIAInit(struct CIAState *cia, int n);

void CIAReset(struct CIAState *cia);

void CIACalcSteps(struct CIAState *cia, int counts);

void CIAWrite(struct CIAState *cia, uint16 addr, uint8 x);

uint8 CIARead(struct CIAState *cia, uint16 addr);


#endif