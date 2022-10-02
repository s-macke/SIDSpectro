// -------------------------------------------------
// ------------------ CIA 6526----------------------
// -------------------------------------------------


function CIA6526(_interruptfunc, _no)
{
	this.interruptfunc = _interruptfunc;
	this.no = _no; 
	this.regs = new Uint8Array(16);
	
	// ports, first four registers
	this.Reset();

}

CIA6526.prototype.Reset = function()
{
	for(var i=0; i<16; i++)
	this.regs[i] = 0;
	this.iflags = 0x0;
	this.timeralatch = 0xFFFF;
	this.timerblatch = 0xFFFF;
	this.clockcounter = 0x0;
	this.interrupt = false;
}


CIA6526.prototype.TriggerInterrupt = function()
{
	this.regs[13] |= 0x80;
	this.interrupt = true;
	this.interruptfunc();
}


CIA6526.prototype.ClearInterrupt = function()
{
	if (this.idr & (1<<7)) // interrupt request
	{
	}	
	this.interrupt = false;
}




CIA6526.prototype.CalcSteps = function(counts)
{
	if (this.regs[14] & 1) 
	{
		//DebugMessage(counts);
		var countera = this.regs[4] | (this.regs[5] << 8);
		countera = countera - counts;
		if (countera <= 0)
		{
			//DebugMessage(countera);
			countera += this.timeralatch;
			if (this.regs[14] & 8) //1 shot?
			{
				countera = 0x0;
				this.regs[14] &= ~1;
			}
			if (this.iflags & 1)
			{
				this.regs[13] |= 1;
				this.TriggerInterrupt();
			}
		}
		this.regs[4] = countera & 0xFF;
		this.regs[5] = (countera >> 8) & 0xFF;
	}

	if (this.regs[15] & 1) 
	{
		var counterb = this.regs[6] | (this.regs[7] << 8);
		counterb = counterb - counts;
		if (counterb <= 0)
		{
			counterb += this.timerblatch;
			if (this.regs[15] & 8)        //1 shot?
			{
				counterb = 0x0;
				this.regs[15] &= ~1;
			}
			if (this.iflags & 2)
			{
				this.regs[13] |= 2;
				this.TriggerInterrupt();
			}
		}
		this.regs[6] = counterb & 0xFF;
		this.regs[7] = (counterb >> 8) & 0xFF;
	}
	/*
	this.clockcounter = this.clockcounter + counts;
	if (this.clockcounter >= 100000)
	{
		clockcounter = 0;
		if (this.regs[8] == 10)
		{
			this.regs[8] = 0;
			this.regs[9]++;
			if ((this.regs[9] & 15) == 10) this.regs[9] = (this.regs[9] & 240) + 16;
			if (this.regs[9] == 96)
			{
				this.regs[9] = 0;
				this.regs[10]++;
			}
		}
	}
*/
}

CIA6526.prototype.Read = function(addr)
{
	switch(addr) {
	case 0:
		if (this.no == 1)
		{
			return keyboard.joystickport;
		}
		else
		{
			return this.regs[0] | (~this.regs[2]);
		}
		break;
	case 1:
		if (this.no == 1)
		{			
			this.regs[1] = 0x0;
			for(var i=0; i<8; i++)
			{
				if ((this.regs[0] & (1<<i))==0)
				this.regs[1] |= keyboard.keyboardline[i];
			}
			this.regs[1] = ~this.regs[1];
		} 
		else
		{
			return this.regs[1] | (~this.regs[3]);
		}
		break;
	case 13:
		var temp = this.regs[13];
		this.regs[13] = 0x0;
		this.ClearInterrupt();
		return temp;
	}
	return this.regs[addr];
}

CIA6526.prototype.Write = function(addr, x)
{
	//DebugMessage("cia write " + addr + " "  + x);

	switch(addr) {
	case 4:
		this.timeralatch = (this.timeralatch & 0xFF00) | x;
		break;
	case 5:
		this.timeralatch = (this.timeralatch & 0xFF) | (x<<8);
		break;
	case 6:
		this.timerblatch = (this.timerblatch & 0xFF00) | x;
		break;
	case 7:
		this.timerblatch = (this.timerblatch & 0xFF) | (x<<8);
		break;
	case 13:
		//set iflags
		if (x & 0x80)
		{
			this.iflags |= x & ~0x80;
		} else this.iflags &= ~x;
		break;
	case 14:
		if ((x&1) & !(this.regs[14]&1))
		{
			this.regs[4] = this.timeralatch & 0xFF;
			this.regs[5] = (this.timeralatch >> 8) & 0xFF;
		}

		break;
	case 15:
		if ((x&1) & !(this.regs[15]&1))
		{
			this.regs[6] = this.timerblatch & 0xFF;
			this.regs[7] = (this.timerblatch >> 8) & 0xFF;
		}
		break;
	}
	//DebugMessage("" + this.no + ": " + addr + " "  + x);
	this.regs[addr] = x;
}
