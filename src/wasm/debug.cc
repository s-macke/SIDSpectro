#include<string.h>
#include<stdlib.h>
#include<stdio.h>
#include"debug.h"

#ifndef __wasm__
// from stack overflow
int itoa(int value, char *sp, int radix)
{
    char tmp[16];// be careful with the length of the buffer
    char *tp = tmp;
    int i;
    unsigned v;

    int sign = (radix == 10 && value < 0);
    if (sign)
        v = -value;
    else
        v = (unsigned)value;

    while (v || tp == tmp)
    {
        i = v % radix;
        v /= radix;
        if (i < 10)
            *tp++ = i+'0';
        else
            *tp++ = i + 'a' - 10;
    }

    int len = tp - tmp;

    if (sign)
    {
        *sp++ = '-';
        len++;
    }

    while (tp > tmp)
        *sp++ = *--tp;

    return len;
}

#endif

void debugint(int i) {
    char buf[18];
    memset(buf, 0, 18);
    itoa(i, buf, 10);
    debug(buf);
}

#ifndef __wasm__

void debug(const char *str) {
    printf("%s\n", str);
}

#endif