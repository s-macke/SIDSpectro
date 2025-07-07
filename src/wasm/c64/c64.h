#ifndef C64_H
#define C64_H

#include"types.h"

void C64Init();

void C64Reset();

uint8 C64Read(uint16 adr);

void C64Write(uint16 adr, uint8 x);

void C64MainLoop(int steps);



#endif