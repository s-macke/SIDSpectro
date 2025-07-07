#include<stdlib.h>
#include<stdint.h>
#include<math.h>

#include "sid.h"

//---------------------------------------------------------------------------
/*
0 00   F7    F6    F5    F4    F3    F2    F1    F0   FREQ LO         WO
1 01   F15   F14   F13   F12   F11   F10   F9    F8   FREQ HI         WO
2 02   PW7   PW6   PW5   PW4   PW3   PW2   PW1   PW0  PW LO           WO
3 03    -     -     -     -   PW11  PW10   PW9   PW8  PW HI           WO
4 04  NOISE PULSE  SAW TRIANG TEST  RING  SYNC  GATE  CONTROL REG     WO
5 05  ATK3  ATK2  ATK1  ATK0  DCY3  DCY2  DCY1  DCY0  ATTACK/DECAY    WO
6 06  STN3  STN2  STN1  STN0  RLS3  RLS2  RLS1  RLS0  SUSTAIN/RELEASE WO

Filter
21 15    -     -     -     -     -    FC2   FC1   FC0  FC LO           WO
22 16  FC10   FC9   FC8   FC7   FC6   FC5   FC4   FC3  FC HI           WO
23 17  RES3  RES2  RES1  RES0 FILTEX FILT3 FILT2 FILT1 RES/FILT        WO
24 18  3OFF   HP    BP    LP   VOL3  VOL2  VOL1  VOL0  MODE/VOL        WO

Misc.
25 19   PX7   PX6   PX5   PX4   PX3   PX2   PX1   PX0  POT X           RO
26 1A   PY7   PY6   PY5   PY4   PY3   PY2   PY1   PY0  POT Y           RO
27 1B   O7    O6    O5    O4    O3    O2    O1    O0   OSC3/RANDOM     RO
28 1C   E7    E6    E5    E4    E3    E2    E1    E0   ENV3            RO
*/

enum WAVEFORM {
    none, sawtooth, triangle, pulse, noise
};

enum PHASE {
    attack, decay, sustain, release
};
enum GATE {
    open, closed
};

struct CHANNEL {
    float frequency;
    float length;
    float freqamplitude;
    float dfreqamplitude;
    float pulsewidth;
    float pulseposition;
    float amplitude;
    float damplitude;
    enum WAVEFORM waveform;
    float a, d, s, r;
    enum GATE gate;
    enum PHASE phase;
};


static const int32_t attackrate[16] = {2, 8, 16, 24, 38, 56, 68, 80, 100, 250, 500, 800, 1000, 3000, 5000, 8000};
static const int32_t decayrate[16] = {6, 24, 48, 72, 114, 168, 204, 240, 300, 750, 1500, 2400, 3000, 9000, 15000,
                                      24000};
static const int32_t releaserate[16] = {6, 24, 48, 72, 114, 168, 204, 240, 300, 750, 1500, 2400, 3000, 9000, 15000,
                                        24000};

static const int32_t samples = 22050;
static const float samplelength = 1. / samples;
static const int32_t wait = 500; // in milliSeconds

static uint8_t regs[32];
static struct CHANNEL channel[3];

float NextSample(struct CHANNEL *channel);

static float CalcFreq(float f) {SIDInit();
    return 227.755 - 1.7635 * f - 0.0176385 * f * f + 0.00333484 * f * f * f - 9.05683E-6 * f * f * f * f;
}

uint16_t SIDRead(int16_t index) {
    return 0;
}

void SIDWrite(uint16_t index, uint8_t value) {
    int i = 0, oldvalue;
    index &= 31;
    oldvalue = regs[index];

    if (index == 24) {
        //loopSoundEvent(nil);
        regs[index] = value;
        return;
    }


    if ((index <= 6)) i = 0;
    else if ((index >= 7) && (index <= 13)) i = 1;
    else if ((index >= 14) && (index <= 20))
        i = 2;


    if
            (
            (index == 0) || (index == 1) ||
            (index == 7) || (index == 8) ||
            (index == 14) || (index == 15) ||
            (index == 2) || (index == 9) || (index == 16) ||
            (index == 3) || (index == 10) || (index == 17)
            ) {

        regs[index] = value;
        if ((regs[0 + i * 7] + regs[1 + i * 7] * 256) == 0) channel[i].frequency = 0.1;
        else
            channel[i].frequency = (regs[0 + i * 7] + regs[1 + i * 7] * 256) * 0.060959458;

        channel[i].length = samples / channel[i].frequency;
        channel[i].pulsewidth = channel[i].length * ((regs[3 + i * 7] & 15) * 256 + regs[2 + i * 7]) / 40.95 / 100.;

        if (channel[i].waveform == sawtooth) channel[i].dfreqamplitude = -1. / channel[i].length;
        else if (channel[i].waveform == triangle) {
            if (channel[i].dfreqamplitude < 0) {
                channel[i].dfreqamplitude = -2. / channel[i].length;
            } else {
                channel[i].dfreqamplitude = +2. / channel[i].length;
            }
        }
    }

    if ((index == 6) || (index == 13) || (index == 20)) {
        regs[index] = value;
        if (channel[i].phase != sustain) channel[i].s = (regs[index] >> 4) / 15.;
        if (channel[i].phase != release) channel[i].r = (releaserate[regs[6 + i * 7] & 15] / 1000.) * samples;
    }

    if ((index == 5) || (index == 12) || (index == 19)) {
        regs[index] = value;
        if (channel[i].phase != attack) channel[i].a = (attackrate[regs[5 + i * 7] >> 4] / 1000.) * samples;
        if (channel[i].phase != decay) channel[i].d = (decayrate[regs[5 + i * 7] & 15] / 1000.) * samples;
    }

    if ((index == 4) || (index == 11) || (index == 18)) {


        regs[index] = value;
        if ((value & 64) != 0) channel[i].waveform = pulse;
        else if ((value & 32) != 0) channel[i].waveform = sawtooth;
        else if ((value & 16) != 0) channel[i].waveform = triangle;
        else if ((value & 128) != 0)
            channel[i].waveform = noise;
        else channel[i].waveform = none;

        if (i == 0) {
            SIDWrite(0, regs[0]);
            SIDWrite(1, regs[1]);
        }
        if (i == 1) {
            SIDWrite(7, regs[7]);
            SIDWrite(8, regs[8]);
        }
        if (i == 2) {
            SIDWrite(14, regs[14]);
            SIDWrite(15, regs[15]);
        }


        if ((value & 1) == 0) channel[i].gate = closed;
        else if ((oldvalue & 1) == 0) {

            channel[i].a = (attackrate[regs[5 + i * 7] >> 4] / 1000.) * samples;
            channel[i].d = (decayrate[regs[5 + i * 7] & 15] / 1000.) * samples;

            channel[i].s = (regs[6 + i * 7] >> 4) / 15.;
            channel[i].r = (releaserate[regs[6 + i * 7] & 15] / 1000.) * samples;

            channel[i].phase = attack;
            channel[i].damplitude = 1. / channel[i].a;
            channel[i].amplitude = 0;
            channel[i].pulseposition = 0;
            channel[i].gate = open;
        }

    }
    regs[index] = value;
}

uint8_t SIDNextSample() {
    float y = 0;
    y += NextSample(&channel[0]);
    y += NextSample(&channel[1]);
    y += NextSample(&channel[2]);
    y = y * (regs[24] & 15) / 15.;
    return (int) ((y + 0.5) * 255);
}

float NextSample(struct CHANNEL *c) {
    float y = 0;

    if (c->waveform == none) return 0;

    if (c->waveform == sawtooth) {
        c->freqamplitude = c->freqamplitude + c->dfreqamplitude;
        if (c->freqamplitude <= 0) c->freqamplitude = c->freqamplitude + 1;
    } else if (c->waveform == triangle) {
        c->freqamplitude = c->freqamplitude + c->dfreqamplitude;
        if (c->freqamplitude >= 1) {
            c->dfreqamplitude = -c->dfreqamplitude;
            c->freqamplitude = 1 - (c->freqamplitude - 1);
        } else if (c->freqamplitude <= 0) {
            c->dfreqamplitude = -c->dfreqamplitude;
            c->freqamplitude = -c->freqamplitude;
        }
    } else if (c->waveform == noise) {
        c->pulseposition = c->pulseposition + 1;
        if (c->pulseposition >= c->length) {
            c->pulseposition = c->pulseposition - (int) c->pulseposition; // frac
            c->freqamplitude = (float) rand() / (float) RAND_MAX;
        }
    } else if (c->waveform == pulse) {
        c->pulseposition = c->pulseposition + 1;
        c->freqamplitude = 1;
        if (c->pulseposition >= c->pulsewidth) {
            c->freqamplitude = 0;
            if (c->pulseposition >= c->length) {
                c->freqamplitude = 1;
                c->pulseposition = c->pulseposition - c->length;
            }
        }
    }

    c->amplitude = c->amplitude + c->damplitude;
    //if amplitude > 1 then amplitude = 1;
    //if amplitude < 0 then amplitude = 0;

    if ((c->phase == attack) && (c->gate == open)) {
        c->a = c->a - 1;
        if (c->a <= 0) {
            c->phase = decay;
            c->amplitude = 1;
            c->damplitude = -(1 - c->s) / c->d;
        }
    } else if ((c->phase == attack) && (c->gate == closed)) {
        c->damplitude = -c->amplitude / c->r;
        c->phase = release;
    } else if ((c->phase == decay) && (c->gate == open)) {
        c->d = c->d - 1;
        if (c->d <= 0) {
            c->phase = sustain;
            c->damplitude = 0;
            c->amplitude = c->s;
        }
    } else if ((c->phase == decay) && (c->gate == closed)) {
        c->damplitude = -c->amplitude / c->r;
        c->phase = release;
    } else if ((c->phase == sustain) && (c->gate == open)) {
        c->damplitude = 0;
        c->amplitude = c->s;
    }
    if ((c->phase == sustain) && (c->gate == closed)) {
        c->damplitude = -c->amplitude / c->r;
        c->phase = release;
    } else if (c->phase == release) {
        c->r = c->r - 1;
        if (c->r <= 0) {
            c->r = 0;
            c->waveform = none;
            c->damplitude = 0;
            c->amplitude = 0;
        }
    }

    y = y + ((c->freqamplitude - 0.5) * c->amplitude * 0.1);

    return y;
}

void SIDInit() {
    for (int i = 0; i < 32; i++) {
        regs[i] = 0;
    }

    channel[0].waveform = none;
    channel[1].waveform = none;
    channel[2].waveform = none;
    channel[0].phase = attack;
    channel[1].phase = attack;
    channel[2].phase = attack;
    channel[0].length = 0;
    channel[1].length = 0;
    channel[2].length = 0;
    channel[0].pulseposition = 0;
    channel[1].pulseposition = 0;
    channel[2].pulseposition = 0;
    channel[0].freqamplitude = 0;
    channel[1].freqamplitude = 0;
    channel[2].freqamplitude = 0;
    channel[0].dfreqamplitude = 0;
    channel[1].dfreqamplitude = 0;
    channel[2].dfreqamplitude = 0;
}
