// -------------------------------------------------
// -------------------- VIC II ---------------------
// -------------------------------------------------

function VICII(_mem, _interruptfunc)
{
	this.interruptfunc = _interruptfunc;
	this.mem = _mem;
	this.regs = new Uint8Array(64);
	this.colorram = new Uint8Array(1024);
	this.Reset();
}

VICII.prototype.Reset = function()
{
	this.cycles = 0;
	for(var i=0; i<64; i++) this.regs[i] = 0x0;
	for(var i=0; i<1024; i++) this.colorram[i] = 0x0;
	this.rasterline = 0x0;

	this.bank = 0;
	this.ecm = false;
	this.mcm = false;
	this.bmm = false;
	this.r = 0x0;
	this.h0 = 0x0;
	this.h1 = 0x0;
	this.h2 = 0x0;
	this.h3 = 0x0;
	this.scrollx = 0x0;
	this.scrolly = 0x0;
	this.zeichenram = 0x0;
	this.charram = 0x0;
	this.charen = false;
	
}


VICII.prototype.Read = function(addr)
{
	switch(addr) {
	case 0x12:
		return this.rasterline & 0xFF;
	case 0x11:
		return (this.regs[addr] & 127) | ((this.rasterline >> 1) & 128);
	case 0x19:
		return (this.regs[addr] | 0x70);
	case 0x1A:
		return (this.regs[addr] | 0xF0);
	case 0x16:
		return (this.regs[addr] | 0xC0);
	case 0x20: case 0x21: case 0x22: case 0x23:
	case 0x24: case 0x25: case 0x26: case 0x27:
	case 0x28: case 0x29: case 0x2A: case 0x2B:
	case 0x2C: case 0x2D: case 0x2E:
		return this.regs[addr] | 0xF;
	case 0x2F:
	case 0x30: case 0x31: case 0x32: case 0x33:
	case 0x34: case 0x35: case 0x36: case 0x37:
	case 0x38: case 0x39: case 0x3A: case 0x3B:
	case 0x3C: case 0x3D: case 0x3E:
		return 0xFF;
	}
	return this.regs[addr];
}

VICII.prototype.SetBank = function(_bank)
{
	this.bank = _bank;
	this.Write(0x18, this.regs[0x18]);
}


VICII.prototype.Write = function(addr, x)
{   
	switch(addr)
	{
	case 0x11:
		this.ecm = (x & (1<<6)) != 0;
		this.bmm = (x & (1<<5)) != 0;
		this.scrolly = x & 7;
		break;
	case 0x16:
		this.mcm = (x & (1<<4)) != 0;
		this.scrollx = x & 7;
		break;

	case 0x18:
		this.zeichenram = (x&0xF0)*64 + (this.bank*16384);
		this.charram = (x&0xE)*1024 + (this.bank*16384);
		break;
	case 0x19:
		x = 0x0; // interrupt remove
		break;

	case 0x20:
		this.r = x & 15;
		break;

	case 0x21:
		this.h0 = x & 15;
		break;

	case 0x22:
		this.h1 = x & 15;
		break;

	case 0x23:
		this.h2 = x & 15;
		break;

	case 0x24:
		this.h3 = x & 15;
		break;
	}
	this.regs[addr] = x;
}


VICII.prototype.CalcSteps = function(count)
{
	this.cycles += count;
	if (this.cycles <= 62) return;

	this.cycles -= 63;
	this.rasterline++;

	if (this.rasterline >= 312)
	{
		this.rasterline = 0;
	}

	if (this.regs[0x1a] & 1)
	{
		var lineirq = this.regs[0x12] + (((this.regs[0x11] >> 7) & 1) << 8);
		if (this.rasterline == lineirq)
		{
			//if (regs[0x19] == 0)
			{
				this.regs[0x19] = 128 | 1;
				this.interruptfunc();
			}
		}
	}
}
