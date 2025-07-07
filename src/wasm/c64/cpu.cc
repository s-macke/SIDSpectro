// -------------------------------------------------
// ---------------------- CPU ----------------------
// -------------------------------------------------

#include<stdbool.h>
#include<stdlib.h>
#include<stdio.h>
#include<string.h>

#include"cpu.h"
#include"tables.h"

static ReadFunc Read = 0;
static WriteFunc Write = 0;

uint8 AC, XR, YR;
static uint8 SP;
uint16 PC;
static bool Carry_Flag;
static bool Zero_Flag;
static bool IRQ_Disable_Flag;
static bool Decimal_Flag;
static bool Brk_Flag;
static bool Overflow_Flag;
static bool Negative_Flag;
static uint32 *optemp = 0;


static void PutStatus(uint8 x);
static uint8 GetStatus();

void CPUSetPC(uint16 pc) {
    PC = pc;
}

void CPUInit(ReadFunc r, WriteFunc w) {
    printf("Init CPU\n");
    Read = r;
    Write = w;
    if (optemp == 0) {
        optemp = (uint32*)malloc(sizeof(uint32)*256);
    }
    for (int i = 0; i < 256; i++) {
        optemp[i] = opcodes[i].op | (opcodes[i].amode << 8) | (opcodes[i].count << 16);
        if (opcodes[i].count == 0) optemp[i] = opcodes[i].op | (opcodes[i].amode << 8) | (1 << 16);
        if (
                (opcodes[i].op == OP_STA) ||
                (opcodes[i].op == OP_STX) ||
                (opcodes[i].op == OP_STY))
            optemp[i] |= 0x1000000;
        if (
                (opcodes[i].amode != AMODE_ACC) &&
                (opcodes[i].amode != AMODE_IMM) &&
                (opcodes[i].amode != AMODE_IMP) &&
                (opcodes[i].amode != AMODE_REL) &&
                (opcodes[i].amode != AMODE_IND)
                ) {
            if (
                    (opcodes[i].op == OP_STA) ||
                    (opcodes[i].op == OP_INC) ||
                    (opcodes[i].op == OP_DEC) ||
                    (opcodes[i].op == OP_ASL) ||
                    (opcodes[i].op == OP_LSR) ||
                    (opcodes[i].op == OP_STX) ||
                    (opcodes[i].op == OP_STY) ||
                    (opcodes[i].op == OP_ROL) ||
                    (opcodes[i].op == OP_ROR)
                    )
                optemp[i] |= 0x2000000;
        }
    }

    CPUReset();
}

void CPUReset() {
    AC = 0x0;
    XR = 0x0;
    YR = 0x0;
    PC = Read(0xFFFC) | (Read(0xFFFD) << 8);
    SP = 0xFF;
    PutStatus(32);
}

static uint8 GetStatus() {
    uint8 x                  = 0x0;
    if (Carry_Flag)       x |= 1u;
    if (Zero_Flag)        x |= 2u;
    if (IRQ_Disable_Flag) x |= 4u;
    if (Decimal_Flag)     x |= 8u;
    if (Brk_Flag)         x |= 16u;
    x |= 32u; // unused flag
    if (Overflow_Flag)    x |= 64u;
    if (Negative_Flag)    x |= 128u;
    return x;
}

static void PutStatus(uint8 x) {
    Carry_Flag       = x & 1u;
    Zero_Flag        = x & 2u;
    IRQ_Disable_Flag = x & 4u;
    Decimal_Flag     = x & 8u;
    Brk_Flag         = x & 16u;
    Overflow_Flag    = x & 64u;
    Negative_Flag    = x & 128u;
}

void CPUMaskableInterrupt() {
    if (IRQ_Disable_Flag) return;
    Write(0x100u | SP, ((PC) >> 8) & 0xFF);
    SP--;
    Write(0x100u | SP, PC & 0xFFu);
    SP--;
    Brk_Flag = false;
    Write(0x100u | SP, GetStatus());
    SP--;
    IRQ_Disable_Flag = true;
    PC = Read(0xFFFE) | (Read(0xFFFF) << 8);
}

void CPUNonMaskableInterrupt() {
    Write(0x100u | SP, ((PC) >> 8) & 0xFF);
    SP--;
    Write(0x100u | SP, PC & 0xFFu);
    SP--;
    Brk_Flag = false;
    Write(0x100u | SP, GetStatus());
    SP--;
    IRQ_Disable_Flag = true;
    PC = Read(0xFFFA) | (Read(0xFFFB) << 8);
}

int CPUStep(int steps) {
    uint8 x = 0x0;
    uint16 address = 0x0;
    int help, help2; //used in some operations like adc and cmp
    uint32_t count = 0;

    while (steps--) {
        uint8 ins = Read(PC);
        uint32 op = optemp[ins];
        uint8 address_mode = (op >> 8u) & 0xFFu;
        uint8 code = op & 0xFFu;
        count += (op >> 16u) & 0xFFu;

        switch (address_mode) {
            case AMODE_IMP:
                PC += 1;
                break;

            case AMODE_ACC:
                x = AC;
                PC += 1;
                break;

            case AMODE_ABS:
                address = (Read(PC + 2) << 8) | Read(PC + 1);
                if (!(op & 0x1000000u)) x = Read(address);
                PC += 3;
                break;

            case AMODE_IMM:
                if (!(op & 0x1000000u)) x = Read(PC + 1);
                PC += 2;
                break;

            case AMODE_ZP:
                address = Read(PC + 1);
                if (!(op & 0x1000000u)) x = Read(address);
                PC += 2;
                break;

            case AMODE_ABSX:
                address = ((Read(PC + 2) << 8) | Read(PC + 1)) + XR;
                if (!(op & 0x1000000u)) x = Read(address);
                PC += 3;
                break;

            case AMODE_ABSY:
                address = ((Read(PC + 2) << 8) | Read(PC + 1)) + YR;
                if (!(op & 0x1000000u)) x = Read(address);
                PC += 3;
                break;

            case AMODE_ZPX:
                address = (Read(PC + 1) + XR) & 0xFF;
                if (!(op & 0x1000000u)) x = Read(address);
                PC += 2;
                break;

            case AMODE_ZPY:
                address = (Read(PC + 1) + YR) & 0xFF;
                if (!(op & 0x1000000u)) x = Read(address);
                PC += 2;
                break;

            case AMODE_REL:
                x = Read(PC + 1);
                PC += 2;
                break;

            case AMODE_IND:
                address = (Read(PC + 2) << 8) | Read(PC + 1);
                address = ((Read(((address + 1) & 0xFF) | (address & 0xFF00))) << 8) | Read(address);
                PC += 3;
                break;

            case AMODE_INDX:
                address = (Read(PC + 1) + XR) & 0xFF;
                address = (Read(address + 1) << 8) | Read(address);
                if (!(op & 0x1000000u)) x = Read(address);
                PC += 2;
                break;

            case AMODE_INDY:
                address = Read(PC + 1);
                address = (Read(address + 1) << 8) + (Read(address) + YR);
                if (!(op & 0x1000000u)) x = Read(address);
                PC += 2;
                break;

            default:
                printf("CPU: Unknown address mode\n");
                exit(1);
                break;
        }

        switch (code) {
            case OP_CMP:
                help = AC - x;
                Zero_Flag = help == 0;
                Negative_Flag = help & 128u;
                Carry_Flag = help >= 0;
                break;

            case OP_CPX:
                help = XR - x;
                Zero_Flag = help == 0;
                Negative_Flag = help & 128u;
                Carry_Flag = help >= 0;
                break;

            case OP_CPY:
                help = YR - x;
                Zero_Flag = help == 0;
                Negative_Flag = help & 128u;
                Carry_Flag = help >= 0;
                break;

            case OP_LDA:
                AC = x;
                Zero_Flag = x == 0;
                Negative_Flag = x & 128u;
                break;

            case OP_STA:
                x = AC;
                break;

            case OP_LDX:
                XR = x;
                Zero_Flag = x == 0;
                Negative_Flag = x & 128u;
                break;

            case OP_STX:
                x = XR;
                break;

            case OP_LDY:
                YR = x;
                Zero_Flag = x == 0;
                Negative_Flag = x & 128u;
                break;

            case OP_STY:
                x = YR;
                break;

            case OP_AND:
                AC = AC & x;
                Zero_Flag = AC == 0;
                Negative_Flag = AC & 128u;
                break;

            case OP_EOR:
                AC = AC ^ x;
                Zero_Flag = AC == 0;
                Negative_Flag = AC & 128u;
                break;

            case OP_ORA:
                AC = AC | x;
                Zero_Flag = AC == 0;
                Negative_Flag = AC & 128u;
                break;

            case OP_ADC:
                if (Decimal_Flag) {
                    help = (AC & 0x0f) + (x & 0x0f);        // Calculate lower nybble
                    if (Carry_Flag) help++;
                    if (help > 9) help = help + 6;          // BCD fixup for lower nybble

                    help2 = (AC >> 4) + (x >> 4);           // Calculate upper nybble
                    if (help > 0x0f) help2 = help2 + 1;
                    uint32 help3 = AC + x;
                    if (Carry_Flag) help3 = help3 + 1;

                    Zero_Flag = (help3 & 255u) == 0;

                    Negative_Flag = help2 & 8; // Only highest bit used
                    Overflow_Flag = (((help2 << 4) ^ AC) & 0x80) && !(((AC ^ x) & 0x80) != 0);

                    if (help2 > 9) help2 = help2 + 6;      // BCD fixup for upper nybble
                    Carry_Flag = help2 > 0x0f;             // Set carry flag
                    AC = (help2 << 4) | (help & 0x0f);     // Compose result


                } else {
                    help = AC + x;
                    if (Carry_Flag) help++;
                    Overflow_Flag = (((~(AC ^ x) & 0x80)) != 0) && (((AC ^ help) & 0x80) != 0);
                    AC = help & 0xFF;
                    Zero_Flag = AC == 0;
                    Negative_Flag = (AC & 128u);
                    Carry_Flag = help > 0xFF;
                }
                break;

            case OP_SBC:
                if (Decimal_Flag) {

                    uint32 low = 0x0, high = 0x0;
                    low = (AC & 0x0f) - (x & 0x0f);        // Calculate lower nybble
                    if (!Carry_Flag) low--;

                    help2 = (AC >> 4) - (x >> 4);          // Calculate upper nybble
                    if ((low & 0x10) != 0) {
                        low = low - 6;                     // BCD fixup for lower nybble
                        help2 = help2 - 1;
                    }
                    if ((help2 & 0x10) != 0)
                        help2 = help2 - 6;                 // BCD fixup for upper nybble
                    uint32 help3 = AC - x;
                    if (!Carry_Flag) help3 = help3 - 1;

                    Carry_Flag = help3 < 0x100;            // Set flags
                    Overflow_Flag = (((AC ^ help3) & 0x80) != 0) & (((AC ^ x) & 0x80) != 0);
                    Zero_Flag = (help3 & 255u) == 0;
                    Negative_Flag = (help3 & 128u);
                    AC = (help2 << 4) | (low & 0x0f);      // Compose result
                } else {
                    help = AC - x;
                    if (!Carry_Flag) help--;
                    Overflow_Flag = (((AC ^ help) & 0x80)) && (((AC ^ x) & 0x80));
                    AC = help & 0xFF;
                    Carry_Flag = help >= 0;
                    Zero_Flag = AC == 0;
                    Negative_Flag = AC & 128u;
                }
                break;

            case OP_BIT:
                Negative_Flag = x & 0x80u;
                Overflow_Flag = x & 0x40u;
                Zero_Flag = (x & AC) == 0;
                break;

            case OP_INC:
                x++;
                Zero_Flag = x == 0;
                Negative_Flag = x & 128u;
                break;

            case OP_INX:
                XR++;
                Zero_Flag = XR == 0;
                Negative_Flag = XR & 128u;
                break;

            case OP_INY:
                YR++;
                Zero_Flag = YR == 0;
                Negative_Flag = YR & 128u;
                break;

            case OP_DEC:
                x--;
                Zero_Flag = x == 0;
                Negative_Flag = x & 128u;
                break;

            case OP_DEX:
                XR--;
                Zero_Flag = XR == 0;
                Negative_Flag = XR & 128u;
                break;

            case OP_DEY:
                YR--;
                Zero_Flag = YR == 0;
                Negative_Flag = YR & 128u;
                break;

            case OP_ASL:
                Carry_Flag = (x & 128u) != 0;
                x = x << 1u;
                Zero_Flag = x == 0;
                Negative_Flag = x & 128u;
                break;

            case OP_LSR:
                Carry_Flag = x & 1u;
                x = x >> 1u;
                Zero_Flag = x == 0;
                Negative_Flag = 0;
                break;

            case OP_ROL:
                help = x << 1u;
                if (Carry_Flag) help |= 1;
                Carry_Flag = help > 255;
                x = help;
                Zero_Flag = x == 0;
                Negative_Flag = x & 128u;
                break;

            case OP_ROR:
                help = x & 1u;
                x = x >> 1u;
                if (Carry_Flag) x = x | 128u;
                Carry_Flag = help != 0;
                Zero_Flag = x == 0;
                Negative_Flag = x & 128u;
                break;

            case OP_PHA:
                Write(0x100 | SP, AC);
                SP--;
                break;

            case OP_PLA:
                SP++;
                AC = Read(0x100u | SP);
                Zero_Flag = AC == 0;
                Negative_Flag = AC & 128u;
                break;

            case OP_PHP:
                Write(0x100u | SP, GetStatus() | 16u);
                SP--;
                break;

            case OP_PLP:
                SP++;
                PutStatus(Read(0x100u | SP));
                break;

            case OP_JMP:
                PC = address;
                break;

            case OP_JSR:
                Write(0x100u | SP, ((PC - 1) >> 8) & 0xFF);
                SP--;
                Write(0x100u | SP, (PC - 1) & 0xFF);
                SP--;
                //printf("JSR to 0x%04x\n", address);
                PC = address;
                break;

            case OP_RTS:
                SP++;
                PC = Read(0x100u | SP);
                SP++;
                PC |= (Read(0x100u | SP) << 8);
                PC++;
                break;

            case OP_RTI:
                SP++;
                PutStatus(Read(0x100u | SP));
                SP++;
                PC = Read(0x100u | SP);
                SP++;
                PC = PC | (Read(0x100u | SP) << 8);
                break;

            case OP_BRK:
                Write(0x100u | SP, ((PC + 1) >> 8) & 0xFF);
                SP--;
                Write(0x100u | SP, (PC + 1) & 0xFF);
                SP--;
                Brk_Flag = true;
                Write(0x100u | SP, GetStatus());
                SP--;
                IRQ_Disable_Flag = true;
                PC = Read(0xFFFE) | (Read(0xFFFF) << 8);
                break;

            case OP_BNE:
                if (!Zero_Flag) {
                    PC += (int8) x;
                    count++;
                }
                break;

            case OP_BCC:
                if (!Carry_Flag) {
                    PC += (int8) x;
                    count++;
                }
                count++; // ???
                break;

            case OP_BEQ:
                if (Zero_Flag) {
                    PC += (int8) x;
                    count++;
                }
                break;

            case OP_BMI:
                if (Negative_Flag) {
                    PC += (int8) x;
                    count++;
                }
                break;

            case OP_BVC:
                if (!Overflow_Flag) {
                    PC += (int8) x;
                    count++;
                }
                break;

            case OP_BCS:
                if (Carry_Flag) {
                    PC += (int8) x;
                    count++;
                }
                break;

            case OP_BPL:
                if (!Negative_Flag) {
                    PC += (int8) x;
                    count++;
                }
                break;

            case OP_BVS:
                if (Overflow_Flag) {
                    PC += (int8) x;
                    count++;
                }
                break;

            case OP_TAX:
                XR = AC;
                Zero_Flag = AC == 0;
                Negative_Flag = AC & 128u;
                break;

            case OP_TAY:
                YR = AC;
                Zero_Flag = AC == 0;
                Negative_Flag = AC & 128u;
                break;

            case OP_TXA:
                AC = XR;
                Zero_Flag = AC == 0;
                Negative_Flag = AC & 128u;
                break;

            case OP_TYA:
                AC = YR;
                Zero_Flag = AC == 0;
                Negative_Flag = AC & 128u;
                break;

            case OP_TXS:
                SP = XR;
                break;

            case OP_TSX:
                XR = SP;
                Zero_Flag = XR == 0;
                Negative_Flag = XR & 128u;
                break;

            case OP_CLC:
                Carry_Flag = false;
                break;

            case OP_CLD:
                Decimal_Flag = false;
                break;

            case OP_CLI:
                IRQ_Disable_Flag = false;
                break;

            case OP_CLV:
                Overflow_Flag = false;
                break;

            case OP_SEC:
                Carry_Flag = true;
                break;

            case OP_SED:
                Decimal_Flag = true;
                break;

            case OP_SEI:
                IRQ_Disable_Flag = true;
                break;

            case OP_NOP:
                break;

            default:
                printf("CPU: Unknown operation %i at 0x%04x\n", code, PC);

                exit(1);
        }
        if (address_mode == AMODE_ACC) AC = x;
        else if (op & 0x2000000u) Write(address, x);

    } // while steps
    return count;
}
