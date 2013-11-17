// -------------------------------------------------
// ------------------- sidfile ---------------------
// -------------------------------------------------


function SIDFile(data)
{
	if (data.length < 128) return;
	this.data = data;
	this.magicid = String.fromCharCode(data[0]) + String.fromCharCode(data[1]) + String.fromCharCode(data[2]) + String.fromCharCode(data[3]);
	this.version = data[5] | (data[4]<<8);
	this.offset = data[7] | (data[6]<<8);
	this.loadaddr = data[9] | (data[8]<<8);
	this.initaddr = data[0xB] | (data[0xA]<<8);
	this.playaddr = data[0xD] | (data[0xC]<<8);
	this.songs = data[0xF] | (data[0xE]<<8);
	this.startsong = data[0x11] | (data[0x10]<<8);
	this.speed = data[0x15] | (data[0x14]<<8) | (data[0x13]<<16) | (data[0x12]<<24);
	this.startpage = 0x0;
	this.pagelength = 0x0;

	if (this.version >= 2)
	{
		this.startpage = data[0x78];
		this.pagelength = data[0x79];
	}

	this.name = "";
	this.author = "";
	this.released = "";
	for(var i=0; i<32; i++)
	{
		this.name += String.fromCharCode(data[0x16+i]);
		this.author += String.fromCharCode(data[0x36+i]);
		this.released += String.fromCharCode(data[0x56+i]);
	}

	if (this.loadaddr == 0)
	{
		this.loadaddr = data[this.offset] | (data[this.offset+1]<<8);
		this.offset += 2;
	}
	if (this.initaddr == 0) this.initaddr = this.loadaddr;
	this.endaddr = this.loaddr + (this.data.length - this.offset);
}

SIDFile.prototype.Print = function()
{
	console.log(this.magicid + " version " + this.version);
	//console.log("offset " + offset);    
	console.log("initaddr " + this.initaddr);
	console.log("playaddr " + this.playaddr);
	console.log("songs " + this.songs);
	console.log("startsong " + this.startsong);
	console.log("speed " + this.speed);
	console.log("startpage " + this.startpage);
	console.log("pagelength " + this.pagelength);
	console.log("name " + this.name);
	console.log("author " + this.author);
	console.log("released " + this.released);
	if (this.version >= 2)
	{
		console.log("flags ", this.data[0x76]);
	}
	console.log("loadaddr " + this.loadaddr);
	console.log("size " + (this.data.length-this.offset));
}

