#ifndef RAM_H
#define RAM_H

#include"types.h"

extern uint8 *ram;

void RAMInit();

uint16_t Read16(uint16_t address);

void Write16(uint16_t address, uint16_t value);

#endif