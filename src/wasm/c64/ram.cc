#include<stdlib.h>
#include<string.h>
#include<stdio.h>

#include"ram.h"

uint8 *ram = 0;

void RAMInit() {
    printf("Init RAM\n");
    if (ram == 0) {
        ram = (uint8*)malloc(0x10000);
    }
    memset(ram, 0, 0x10000);
}

uint16_t Read16(uint16_t address) {
    return ram[address + 0] | (ram[address + 1] << 8);
}

void Write16(uint16_t address, uint16_t value) {
    ram[address + 0] = value & 0xFF;
    ram[address + 1] = (value >> 8) & 0xFF;
}