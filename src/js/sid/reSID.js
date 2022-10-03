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
    this.oldcount = 0;

    this.importObject = {
        env: {
            memory: new WebAssembly.Memory({initial: 2048, maximum: 2048}), // 32 MB // we need approx 23 MB for reSID
            //memory: new WebAssembly.Memory({initial: 6400, maximum: 6400}), // 100 MB
            debug: this.Stdout.bind(this)
        }
    };
    this.ram = new Uint8Array(this.importObject.env.memory.buffer, 0);
    this.ram16 = new Int16Array(this.importObject.env.memory.buffer, 0);

    WebAssembly.instantiateStreaming(fetch("src/reSID/resid.wasm"), this.importObject).then(
        (module) => {
            this.reSID = module.instance.exports
            console.log(this.reSID)
            this.reSID.Init();
            this.reSID.Reset();
            console.log("reSID initialized")
        }
    );
    this.enabled = true;
}

ReSID.prototype.Activate = function () {
    this.soundbuffer.Activate();
    this.starttime = 0; // this.soundbuffer.GetTime();
}

ReSID.prototype.Reset = function () {
    this.reSID.Reset();
}

let str = "";

ReSID.prototype.Stdout = function (strp) {
    for (let i = 0; i < 256; i++) {
        if (this.ram[strp + i] === 0) break;
        if (this.ram[strp + i] < 0x20) {
            if (this.ram[strp + i] === 0x0A) {
                console.log(str);
                str = "";
                continue;
            }
        }
        str += String.fromCharCode(this.ram[strp + i]);
    }
    console.log(str);
    str = "";
}

ReSID.prototype.Read = function (addr) {
    return this.reSID.Read(addr);
}

ReSID.prototype.Write = function (index, value) {
    this.reSID.Write(index, value);
}

ReSID.prototype.Update = function (count) {
    let currenttime = count / this.cyclespersecond;
    let currentsample = currenttime * samples;
    let oldsample = this.starttime * samples;
    this.starttime = currenttime;

    if (count - this.oldcount <= 0) return;
    let n = this.reSID.Clock(count - this.oldcount, 44100);
    //console.log((currentsample-oldsample)-n) // this should be 0, otherwise SID is not in sync with CPU
    //console.log(count - this.oldcount)
    this.oldcount = count;

    let bufferAddress = this.reSID.GetBuffer() >> 1; // divide by 2 because of the 16 bit view
    let state = this.reSID.GetState() >> 1; // divide by 2 because of the 16 bit view
    let frequency0 = this.ram16[state + 0] * 0.060959458;
    let frequency1 = this.ram16[state + 1] * 0.060959458;
    let frequency2 = this.ram16[state + 2] * 0.060959458;
    let amplitude0 = this.ram16[state + 3] / 256. * 4.;
    let amplitude1 = this.ram16[state + 4] / 256. * 4.;
    let amplitude2 = this.ram16[state + 5] / 256. * 4.;
    console.log(amplitude0, amplitude1, amplitude2)

    for (let i = 0; i < n; i++) {
        let sample = i + Math.floor(oldsample)
        let index = (sample + 60000) % (this.soundbuffer.sampleslen)
        this.soundbuffer.buffer[index] = this.ram16[bufferAddress + i] / 32768.;

        if ((sample & 127) === 0) {
            this.onUpdateSpectrum(sample,
                frequency0,
                frequency1,
                frequency2,
                amplitude0,
                amplitude1,
                amplitude2);
       }
    }
    // just for safety, copy the last sample to prevent clicks
    let index = ((n + Math.floor(oldsample)) + 60000) % (this.soundbuffer.sampleslen)
    this.soundbuffer.buffer[index] = this.ram16[bufferAddress + (n-1)] / 32768.;
    /*

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
        */
}
