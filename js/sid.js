// -------------------------------------------------
// ---------------------- SID ----------------------
// -------------------------------------------------

//use strict"
var samples = 44100;

var NOISETABLESIZE = 256;
var noiseLSB = new Array(NOISETABLESIZE);
var noiseMSB = new Array(NOISETABLESIZE)
var noiseMID = new Array(NOISETABLESIZE);

for (var i = 0; i < NOISETABLESIZE; i++) 
{
	noiseLSB[i] = ((((i >> (7 - 2)) & 0x04) | ((i >> (4 - 1)) & 0x02)
	| ((i >> (2 - 0)) & 0x01))) & 0xFF;
	noiseMID[i] = ((((i >> (13 - 8 - 4)) & 0x10)
	| ((i << (3 - (11 - 8))) & 0x08))) & 0xFF;
	noiseMSB[i] = ((((i << (7 - (22 - 16))) & 0x80)
	| ((i << (6 - (20 - 16))) & 0x40)
	| ((i << (5 - (16 - 16))) & 0x20))) & 0xFF;
}

/* noise magic */
function NSHIFT(v, n)
{ 
	return (((v) << (n)) | ((((v) >>> (23 - (n))) ^ (v >>> (18 - (n)))) & ((1 << (n)) - 1)));
}

function NVALUE(v)
{
	return (noiseLSB[v & 0xFF] | noiseMID[(v >> 8) & 0xFF] | noiseMSB[(v >> 16) & 0xFF]);
}


var attackrate = [2, 8, 16, 24, 38, 56, 68, 80, 100, 250, 500, 800, 1000, 3000, 5000, 8000];
var decayrate = [6, 24, 48, 72, 114, 168, 204, 240, 300, 750, 1500, 2400, 3000, 9000, 15000, 24000];
var releaserate = [6, 24, 48, 72, 114, 168, 204, 240, 300, 750, 1500, 2400, 3000, 9000, 15000, 24000];

var  // waveforms
wvtest= 0, 
wvpulse = 1, 
wvsawtooth = 2, 
wvtriangle = 3, 
wvnoise = 4, 
wvnone= 5, 
wvring = 6, 
wvpulsetriangle = 7, 
wvpulsesawtooth = 8; 

var phattack=0, phdecay=1, phsustain=2, phrelease=3, phidle=4; // phase
var gopen=0, gclosed=1; // gate

function SIDChannel() 
{
	this.frequency = 0;
	this.oscamplitude = 0;
	this.pulsewidth = 0;
	this.amplitude = 0;
	this.damplitude = 0;
	this.a = 0;
	this.d = 0;
	this.s = 0;
	this.r = 0;
	this.waveform = wvnone;
	this.gate = gclosed;
	this.phaseadsr = phattack;
	this.phase = 0.;
	this.rv = 0x7FFFF8; //noise shift register
	this.BuildTables();
}

SIDChannel.prototype.BuildTables = function()
{
	/*
	this.wavetable00 = new Array(2);
	this.wavetable10 = new Array(4096);
	this.wavetable20 = new Array(4096);
	this.wavetable30 = new Array(4096);
	this.wavetable40 = new Array(8192);
	this.wavetable50 = new Array(8192);
	this.wavetable60 = new Array(8192);
	this.wavetable70 = new Array(8192);

	for(var i=0; i<4096; i++)
	{
		this.wavetable10[i] = (i < 2048 ? i << 4 : 0xffff - (i << 4))&0xFFFF;
			this.wavetable20[i] = (i << 3) & 0xFFFF;
			this.wavetable30[i] = waveform30_8580[i] << 7;
		this.wavetable40[i+4096] = 0x7FFFF;
		this.wavetable50[i+4096] = 0;
		this.wavetable60[i+4096] = 0;
		this.wavetable70[i+4096] = 0;
	}
*/
}


SIDChannel.prototype.NextSample = function()
{
	var y = 0;
	/*
	var ampl = 0x0;
	var f = 0;
	var pw = 0;
	switch(this.waveform)
	{
		case wvpulsesawtooth:
				if (f <= pw) ampl = 0x0000; else ampl = f >>> 17;
			break;
			case wvsawtooth:
				ampl = f >>> 17;
			break;
			case wvring:
				//ampl ^= pv->vprev->f & 0x80000000;
			if (f < 0x80000000) ampl = f >>> 16; else ampl = 0xffff - (f >>> 16);
			break;
			case wvtriangle:
				if (f < 0x80000000) ampl = f >>> 16; else ampl = 0xffff - (f >> 16);
			break;
			case wvpulsetriangle:
			if (f <= pw) ampl = 0x0000; else if (f < 0x80000000) ampl = f >>> 16; else ampl = 0xffff - (f >>> 16);
			break;
		case wvnoise:
			//ampl = ((DWORD)NVALUE(NSHIFT(pv->rv, pv->f >> 28))) << 7;
			break;
			case wvpulse:
				if (f >= pw) ampl = 0x7fff;
			break;
	}

*/

	var phase = this.phase - Math.floor(this.phase);
	var oldphase = Math.floor(this.phase);
	this.phase += this.frequency/samples;
	var newphase = Math.floor(this.phase);
	
	switch(this.waveform)
	{
	case wvnone:
		return 0.;

	case wvsawtooth:
		this.oscamplitude = phase;
		break;

	case wvpulsesawtooth:
		if (phase < this.pulsewidth) this.oscamplitude = 0; else this.oscamplitude = phase;
		break;

	case wvpulsetriangle:
		if (phase < this.pulsewidth) this.oscamplitude = 0.; else
		if (phase < 0.5) this.oscamplitude = phase * 2.; else this.oscamplitude = 1.-(phase-0.5) * 2.;
		break;

	case wvtriangle:
	case wvring:
		if (phase < 0.5) this.oscamplitude = phase * 2.; else this.oscamplitude = 1.-(phase-0.5) * 2.;
		break;

	case wvnoise:
		this.oscamplitude = NVALUE(NSHIFT(this.rv, Math.floor(phase*16))) / 256.;
		if (oldphase != newphase)
		{
			this.rv = NSHIFT(this.rv, 16);
		}
		break;

	case wvpulse:
		if (phase < this.pulsewidth) this.oscamplitude = 1; else this.oscamplitude = 0;
		break;

	}
	this.amplitude += this.damplitude;

	switch(this.phaseadsr)
	{
	case phattack:
		if (this.gate == gopen)
		{
			this.a--;
			if (this.a <= 0)
			{
				this.phaseadsr = phdecay;
				this.amplitude = 1;
				this.damplitude = -(1. - this.s)/this.d;
			}
		} else {
			this.damplitude = -this.amplitude/this.r;
			this.phaseadsr = phrelease;
		}
		break;

	case phdecay:
		if (this.gate == gopen)
		{
			this.d--;
			if (this.d <= 0)
			{
				this.phaseadsr = phsustain;
				this.damplitude = 0;
				this.amplitude = this.s;
			}
		} else {
			this.damplitude = -this.amplitude/this.r;
			this.phaseadsr = phrelease;
		}
		break;

	case phsustain:
		if (this.gate == gopen)
		{
			this.damplitude = 0;
			this.amplitude = this.s;
		} else {
			this.damplitude = -this.amplitude/this.r;
			this.phaseadsr = phrelease;
		}
		break;

	case phrelease:
		this.r--;
		if (this.r <= 0)
		{
			this.r = 0;
			this.waveform = wvnone;
			this.damplitude = 0;
			this.amplitude = 0;
		}
		break;
	}
	y += ((this.oscamplitude-0.5)*this.amplitude);
	return y;
}

function SID6581(_cyclespersecond, _data) {
	//_SIDCreate();
	this.playposition = 0;
	this.writeposition = 0;
	this.regs = new Uint8Array(32);
	this.channel = new Array(3);
	this.data = _data;
	this.cyclespersecond = _cyclespersecond;
	this.channel[0] = new SIDChannel();
	this.channel[1] = new SIDChannel();
	this.channel[2] = new SIDChannel();
	this.enabled = false;
	this.soundbuffer = new LoopSoundBuffer(samples, samples*2);
	this.starttime = 0; // this.soundbuffer.GetTime();
	this.Reset();
	this.enabled = true;
}

SID6581.prototype.Reset = function()
{
	for(var i=0; i<32; i++)
	this.Write(i, 0);
}


SID6581.prototype.NextSample = function()
{
	var y = 0;
	y += this.channel[0].NextSample();
	y += this.channel[1].NextSample();
	y += this.channel[2].NextSample();
	y *= (this.regs[24]&15)/15.;
	return y*0.3;
}

//var SIDbufferpos = 60000;
//var SIDoldcount = 0;
SID6581.prototype.Update = function(count)
{
	var currenttime = count / this.cyclespersecond;
	var currentsample = currenttime*samples;
	var oldsample = this.starttime*samples;
	this.starttime = currenttime;
	for(var i=Math.floor(oldsample); i<Math.floor(currentsample); i++)
	{
		this.soundbuffer.buffer[(i+60000)%(this.soundbuffer.sampleslen)] = this.NextSample();
		if ((i&127) == 0)
		{
			var column = ((i>>7)%600)*4;
			var data = this.data;
			for(var j=0; j<400; j++)
			{
				var offset = 2400*j+column; 
				data[offset+0] = 0x00; 
				data[offset+1] = 0x00; 
				data[offset+2] = 0x00; 
				data[offset+3] = 0xFF; 
			}
			var freq = Math.floor(this.channel[0].frequency*0.3)+1;
			var ampl = this.channel[0].amplitude*255;
			if (freq <= 399) 
			{
				var offset = 2400*(399-freq)+column
				data[offset+0] = ampl;
				data[offset+2400] = ampl*0.5;
				data[offset-2400] = ampl*0.5;
			}
			var freq = Math.floor(this.channel[1].frequency*0.3)+1;
			var ampl = this.channel[1].amplitude*255;
			if (freq <= 399)
			{
				var offset = 2400*(399-freq)+column+1;
				data[offset] = ampl;
				data[offset+2400] = ampl*0.5;
				data[offset-2400] = ampl*0.5;
			}
			var freq = Math.floor(this.channel[2].frequency*0.3)+1;
			var ampl = this.channel[2].amplitude*255;
			if (freq <= 399) 
			{
				var offset = 2400*(399-freq)+column+2;
				data[offset] = ampl;
				data[offset+2400] = ampl*0.5;
				data[offset-2400] = ampl*0.5;
			}
		}
	}
}

SID6581.prototype.Read = function(addr)
{
	//	return _SIDRead(addr);
	return 0;
}


SID6581.prototype.Write = function(index, value)
{
	//	_SIDWrite(index, value);
	//	return;

	var oldvalue = this.regs[index];
	var i = Math.floor(index/7); // which channel

	switch(index)
	{
	case 24:
		this.regs[index] = value;
		break;

	case 0: case 1: case 2: case 3: 
	case 7: case 8: case 9: case 10:
	case 14: case 15: case 16: case 17:
		this.regs[index] = value;
		
		var f = this.regs[0+i*7] | (this.regs[1+i*7]<<8);
		if (f == 0) this.channel[i].frequency = 0.01;
		else this.channel[i].frequency = f * 0.060959458;
		this.channel[i].pulsewidth = ((this.regs[3+i*7] & 15)*256 + this.regs[2+i*7])/40.95/100.;

		//this.channel[i].pw = (this.regs[2+i*7] + ((this.regs[3+i*7]&0xF)<<8)) * 0x100100;
		//this.fs = this.regs[0+i*7] | (this.regs[1+i*7]<<8);
		// = pv->s->speed1
		break;

	case 6: case 13: case 20:
		this.regs[index] = value;
		if (this.channel[i].phaseadsr != phsustain) this.channel[i].s = (this.regs[index] >> 4)/15.;
		if (this.channel[i].phaseadsr != phrelease) this.channel[i].r = (releaserate[this.regs[6+i*7] & 15]/1000.)*samples;
		break;

	case 5: case 12: case 19:
		this.regs[index] = value;
		if (this.channel[i].phaseadsr != phattack) this.channel[i].a = (attackrate[this.regs[5+i*7] >> 4]/1000.)*samples;
		if (this.channel[i].phaseadsr != phdecay) this.channel[i].d = (decayrate[this.regs[5+i*7] & 15]/1000.)*samples;
		break;

	case 4: case 11: case 18:
		this.regs[index] = value;
		if (value&0x08)
		{
			this.channel[i].waveform = wvtest; 
			// TODO reset some stuff
		} else
		switch((value>>4)&0xF)
		{
		case 4:
			this.channel[i].waveform = wvpulse;
			break;
		case 2:
			this.channel[i].waveform = wvsawtooth;
			break;
		case 1:
			if (value&4) this.channel[i].waveform = wvring; else this.channel[i].waveform = wvtriangle;
			break;
		case 8:
			this.channel[i].waveform = wvnoise;
			break;
		case 5:
			this.channel[i].waveform = wvpulsetriangle;
			break;
		case 6:
			this.channel[i].waveform = wvpulsesawtooth;
			break;
		case 0:
		default:
			this.channel[i].waveform = wvnone;
			break;
		}

		if (i == 0) { this.Write(0, this.regs[0]); this.Write(1, this.regs[1]); }
		if (i == 1) { this.Write(7, this.regs[7]); this.Write(8, this.regs[8]);  }
		if (i == 2) { this.Write(14, this.regs[14]); this.Write(15, this.regs[15]); }
		/*
		switch(this.channel[i].phaseadsr)
		{
			case phattack:
			case phdecay:
			case phsustain:
				if (value&1) 
				
			break;
		}
*/
		if ((value & 1) == 0) this.channel[i].gate = gclosed; else
		if ((oldvalue & 1) == 0)
		{
			this.channel[i].a = (attackrate[this.regs[5+i*7] >> 4]/1000.)*samples;
			this.channel[i].d = (decayrate[this.regs[5+i*7] & 15]/1000.)*samples;
			this.channel[i].s = (this.regs[6+i*7] >> 4)/15.;
			this.channel[i].r = (releaserate[this.regs[6+i*7] & 15]/1000.)*samples;

			this.channel[i].phaseadsr = phattack;
			this.channel[i].damplitude = 1./this.channel[i].a;
			this.channel[i].amplitude = 0;
			this.channel[i].gate = gopen;
		}
		break;
	}
	this.regs[index] = value;
	return;
}
