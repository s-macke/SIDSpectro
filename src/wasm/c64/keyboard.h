#ifndef KEYBOARD_H
#define KEYBOARD_H

#include "types.h"
extern uint8 keyboardrow[8];

void KeyDown(int row, int bit);
void KeyUp(int row, int bit);
void KeyAllUp();
void KeyboardInit();


#endif