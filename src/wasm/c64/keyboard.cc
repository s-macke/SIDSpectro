#include <stdio.h>
#include "keyboard.h"
#include "types.h"

uint8 keyboardrow[8];

void KeyDown(int row, int bit) {
    //printf("keydown row=%i bit=%i\n", row, bit);
    keyboardrow[row] |= 1<<bit;
}

void KeyUp(int row, int bit) {
    keyboardrow[row] &= ~(1<<bit);
}

void KeyAllUp() {
    for(int i=0; i<8; i++) {
        keyboardrow[i] = 0;
    }
}

void KeyboardInit() {
    printf("Init Keyboard\n");
    for(int i=0; i<8; i++) {
        keyboardrow[i] = 0;
    }
}