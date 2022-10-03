// -------------------------------------------------
// ---------------------- SID ----------------------
// -------------------------------------------------
"use strict"

function ReSID(_cyclespersecond, _onUpdateSpectrum) {
    this.onUpdateSpectrum = _onUpdateSpectrum
    this.cyclespersecond = _cyclespersecond;
    this.enabled = false;
    this.soundbuffer = new LoopSoundBuffer(samples, samples * 2);
    this.starttime = 0; // this.soundbuffer.GetTime();
    this.Reset();
    this.enabled = true;
}

ReSID.prototype.Reset = function () {

}


ReSID.prototype.NextSample = function () {
    let y = 0;
    y += this.channel[0].NextSample();
    y += this.channel[1].NextSample();
    y += this.channel[2].NextSample();
    y *= (this.regs[24] & 15) / 15.;
    return y * 0.3;
}

ReSID.prototype.Update = function (count) {
    let currenttime = count / this.cyclespersecond;
    let currentsample = currenttime * samples;
    let oldsample = this.starttime * samples;
    this.starttime = currenttime;
    for (let i = Math.floor(oldsample); i < Math.floor(currentsample); i++) {
        this.soundbuffer.buffer[(i + 60000) % (this.soundbuffer.sampleslen)] = this.NextSample();
        if ((i & 127) === 0) {
            this.onUpdateSpectrum(i,
                this.channel[0].frequency,
                this.channel[1].frequency,
                this.channel[2].frequency,
                this.channel[0].amplitude,
                this.channel[1].amplitude,
                this.channel[2].amplitude);
        }
    }
}

ReSID.prototype.Read = function (addr) {
    return 0;
}


ReSID.prototype.Write = function (index, value) {

}
