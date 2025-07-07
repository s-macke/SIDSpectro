
#include "reSID/sid.h"
#include "reSID/voice.h"
#include "reSID/siddefs.h"
#include "c64/c64.h"
#include "sidfile.h"
#include "debug.h"


reSID::SID *sid;
short *buf;
reSID::cycle_count delta_t; // int

extern "C"
{

void _initialize() {
    debug("Init");
    SIDFileInit();
    C64Init();

    sid = new reSID::SID();
    sid->set_sampling_parameters(985248, reSID::SAMPLE_RESAMPLE, 44100);
    //sid->enable_filter(true);
    buf = new short[44100];
}

void Reset() {
    C64Reset();
    sid->reset();
    delta_t = 0;
}

int Clock(reSID::cycle_count _delta_t, int n) {
    delta_t = _delta_t;
    // TODO
    C64MainLoop(_delta_t);
    return sid->clock(delta_t, buf, n, 1);
}

short* GetSIDBuffer() {
    return buf;
}

short* GetSIDState() {
    static short data[3 + 3];
    data[0] = sid->voice[0].wave.freq;
    data[1] = sid->voice[1].wave.freq;
    data[2] = sid->voice[2].wave.freq;
    data[3] = sid->voice[0].envelope.output();
    data[4] = sid->voice[1].envelope.output();
    data[5] = sid->voice[2].envelope.output();
    return data;
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
    _initialize();
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
        printf("%i\n", GetSIDBuffer()[i]);
    }
    return 0;
}
#endif


}
