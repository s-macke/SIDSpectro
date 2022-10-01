
#include "sid.h"
#include "voice.h"
#include <debug.h>

reSID::SID *sid;
short *buf;
reSID::cycle_count delta_t; // int

extern "C"
{

void Init() {
    debug("Init");
    sid = new reSID::SID();
    buf = new short[44100];
}

void Reset() {
    sid->reset();
    delta_t = 0;
}

int Clock(reSID::cycle_count _delta_t, int n) {
    delta_t = _delta_t;
    return sid->clock(delta_t, buf, n, 1);
}

short* GetBuffer() {
    return buf;
}

reSID::cycle_count GetDeltaT() {
    return delta_t;
}

reSID::reg8 Read(reSID::reg8 offset) {
    return sid->read(offset);
}

void Write(reSID::reg8 offset, reSID::reg8 value) {
    return sid->write(offset, value);
}

#ifndef __wasm__

// small test if the lib works

#include<stdio.h>

int main() {
    Init();
    Reset();

    Write(24, 15); // full volume
    Write(0, 0x52); // channel 1 set Low
    Write(1, 0x07); // channel 1 set high
    Write(5, 97); // attack, decay
    Write(6, 200); // sustain, release

    //Write(4, 1<<4 | 1); // triangle and activate gate
    Write(4, 1<<5 | 1); // sawtooth and activate gate

    int n = Clock(200000, 10000);
    printf("n=%i\n", n);

    for(int i=0; i<n; i++) {
        printf("%i\n", GetBuffer()[i]);
    }
    return 0;
}
#endif


}
