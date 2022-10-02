// -------------------------------------------------
// ---------------- Sound Device -------------------
// -------------------------------------------------

/* This object provides a loop sound buffer and a timer */

function isIE () {
	var myNav = navigator.userAgent.toLowerCase();
	return (myNav.indexOf('msie') != -1) ? parseInt(myNav.split('msie')[1]) : false;
}

function LoopSoundBuffer(samples, sampleslen) 
{
	this.samples = samples;
	this.sampleslen = sampleslen;
	if (typeof AudioContext !== "undefined") 
	{
		this.context = new AudioContext();
		this.WebkitSetup();
	} else if (typeof webkitAudioContext !== "undefined")
	{
		this.context = new webkitAudioContext();
		this.WebkitSetup();
	} else if ((typeof Audio !== "undefined") && (!isIE()))
	{
		this.MozillaSetup();
	} else
	{
		this.DummySetup();
	}
}

LoopSoundBuffer.prototype.MozillaSetup = function()
{
	this.audio = new Audio();
	this.audio.mozSetup(1, this.samples);
	this.buffer = new Float32Array(this.sampleslen);
	this.lastoffset = 0;
	this.GetTime = function(){return this.audio.mozCurrentSampleOffset()/this.samples;};
	this.Refill();
}

LoopSoundBuffer.prototype.PlayBuffer = function(pos)
{
	var idx = pos%4;
	this.source[idx] = this.context.createBufferSource(); // creates a sound source

	this.soundBuffer[idx] = this.context.createBuffer(1, this.sampleslen/4, this.samples);
	var buffer = this.soundBuffer[idx].getChannelData(0);
	var offset = (this.pos%4) * this.sampleslen/4;
	for(var i=0; i<this.sampleslen/4; i++)
	{
		buffer[i] = this.buffer[i + offset];
	}
	this.source[idx].buffer = this.soundBuffer[idx];
	this.source[idx].connect(this.context.destination);
	this.source[idx].onended = this.OnEnded.bind(this);
	this.source[idx].start(this.pos*(this.sampleslen/4)/this.samples);
}


LoopSoundBuffer.prototype.OnEnded = function()
{
	this.PlayBuffer(this.pos);
	this.pos++;
}


LoopSoundBuffer.prototype.WebkitSetup = function()
{
	this.GetTime = function(){return this.context.currentTime;};

	this.source = [0,0,0,0];
	this.soundBuffer = [0,0,0,0];

	// Version 1, works also in Firefox 25
	this.pos = 1;
	this.buffer = new Float32Array(this.sampleslen)
	this.PlayBuffer(0);
	this.OnEnded();

	// Version 2, works only in Chrome
	/*
	this.soundBuffer = this.context.createBuffer(1, this.sampleslen, this.samples);
	this.buffer = this.soundBuffer.getChannelData(0);
	this.source = this.context.createBufferSource(); // creates a sound source
	this.source.buffer = this.soundBuffer;
	this.source.loop = true;
	this.source.connect(this.context.destination);	
	this.source.start(0);
*/
}

LoopSoundBuffer.prototype.DummySetup = function()
{
	this.buffer = new Float32Array(this.sampleslen);
	this.starttime = new Date().getTime();
	this.GetTime = function(){return ((new Date().getTime()) - this.starttime)/1000.;};
}

LoopSoundBuffer.prototype.Refill = function()
{
	var currentoffset = this.audio.mozCurrentSampleOffset();
	var lastoffset = this.lastoffset;	
	var diff = currentoffset+this.samples - lastoffset;
	if (diff < 0) return;
	var locbuffer = new Float32Array(diff);
	var offset = Math.floor(lastoffset%(this.sampleslen));
	for(var i=0; i<diff; i++) 
	{
		locbuffer[i] = this.buffer[offset];
		offset++;
		if (offset >= this.sampleslen) offset = 0;
	}
	this.lastoffset = lastoffset + diff;
	var written = this.audio.mozWriteAudio(locbuffer);
	//console.log(written);
	//console.log(this.audio.mozCurrentSampleOffset());
	window.setTimeout(this.Refill.bind(this), 200);
}

