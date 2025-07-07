#ifndef TABLES_H
#define TABLES_H

#include "types.h"

struct tcode2asm {
    uint8 ass[4], count, amode, op;
};

#define OP_NONE        1
#define OP_ADC        2
#define OP_AND        3
#define OP_ASL        4
#define OP_BCC        5
#define OP_BCS        6
#define OP_BEQ        7
#define OP_BIT        8
#define OP_BMI        9
#define OP_BNE        10
#define OP_BPL        11
#define OP_BRK        12
#define OP_BVC        13
#define OP_BVS        14
#define OP_CLC        15
#define OP_CLD        16
#define OP_CLI        17
#define OP_CLV        18
#define OP_CMP        19
#define OP_CPX        20
#define OP_CPY        21
#define OP_DEC        22
#define OP_DEX        23
#define OP_DEY        24
#define OP_EOR        25
#define OP_INC        26
#define OP_INX        27
#define OP_INY        28
#define OP_JMP        29
#define OP_JSR        30
#define OP_LDA        31
#define OP_LDX        32
#define OP_LDY        33
#define OP_LSR        34
#define OP_NOP        35
#define OP_ORA        36
#define OP_PHA        37
#define OP_PLA        38
#define OP_PHP        39
#define OP_PLP        40
#define OP_ROL        41
#define OP_ROR        42
#define OP_RTI        43
#define OP_RTS        44
#define OP_SBC        45
#define OP_SEC        46
#define OP_SED        47
#define OP_SEI        48
#define OP_STA        49
#define OP_STX        50
#define OP_STY        51
#define OP_TAX        52
#define OP_TAY        53
#define OP_TSX        54
#define OP_TXA        55
#define OP_TXS        56
#define OP_TYA        57

#define AMODE_IMP  1
#define AMODE_ACC  2
#define AMODE_ABS  3
#define AMODE_ZP   4
#define AMODE_IMM  5
#define AMODE_ABSX 6
#define AMODE_ABSY 7
#define AMODE_INDX 8
#define AMODE_INDY 9
#define AMODE_ZPX  10
#define AMODE_ZPY  11
#define AMODE_REL  12
#define AMODE_IND  13

extern struct tcode2asm opcodes[];
extern uint32 rgbcolors[];
extern uint8 basicrom[];
extern uint8 kernelrom[];
extern uint8 charrom[];

#endif
