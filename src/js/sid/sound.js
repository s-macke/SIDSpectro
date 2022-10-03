// -------------------------------------------------
// ---------------- Sound Device -------------------
// -------------------------------------------------

/* This object provides a loop sound buffer and a timer */

"use strict";

function LoopSoundBuffer(samples, sampleslen) {
    this.samples = samples;
    this.sampleslen = sampleslen;
    this.buffer = new Float32Array(this.sampleslen);
    this.activated = false;
    this.DummySetup();
}

LoopSoundBuffer.prototype.Activate = function (pos) {
    if (this.activated) return;

    if (typeof AudioContext !== "undefined") {
        this.context = new window.AudioContext();
        this.WebkitSetup();
    }
    this.activated = true;
}

LoopSoundBuffer.prototype.PlayBuffer = function (pos) {
    let idx = pos & 3;
    let buffer = this.soundbuffer[idx].getChannelData(0);
    let offset = idx * this.sampleslen / 4;
    for (let i = 0; i < this.sampleslen / 4; i++) {
        buffer[i] = this.buffer[i + offset];
        //buffer[i] = Math.sin((i + pos*this.sampleslen/4)/10.)*0.5;
    }

    let source = this.context.createBufferSource(); // creates a sound source
    source.buffer = this.soundbuffer[idx];
    source.connect(this.context.destination);
    source.onended = this.OnEnded.bind(this);
    source.start(pos * (this.sampleslen / 4) / this.samples);
    //source.noteOn(0);

    // save the source. Otherwise the garbage collector might take them and the function OnEnded is not executed
    this.source[pos % 4] = source;
}

LoopSoundBuffer.prototype.OnEnded = function () {
    this.PlayBuffer(this.pos);
    this.pos++;
}

LoopSoundBuffer.prototype.WebkitSetup = function () {
    this.GetTime = function () {
        return this.context.currentTime;
    }.bind(this);
    //this.starttime = new Date().getTime();
    //this.GetTime = function(){return ((new Date().getTime()) - this.starttime)/1000.;};

    this.source = new Array(4);
    this.soundbuffer = new Array(4);
    for (let i = 0; i < 4; i++) {
        this.soundbuffer[i] = this.context.createBuffer(1, this.sampleslen / 4, this.samples);
    }

    this.PlayBuffer(0);
    this.PlayBuffer(1);
    this.pos = 2;

}

LoopSoundBuffer.prototype.DummySetup = function () {
    this.starttime = new Date().getTime();
    this.GetTime = function () {
        return ((new Date().getTime()) - this.starttime) / 1000.;
    };
}

