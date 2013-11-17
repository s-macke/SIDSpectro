// -------------------------------------------------
// ---------------------- CPU ----------------------
// -------------------------------------------------

function MOS6502(_read, _write, _mem) {
	this.mem = _mem;
	this.Write = _write;
	this.Read = _read;
	this.AC = 0x0;
	this.XR = 0x0;
	this.YR = 0x0;
	this.SP = 0x0;
	this.PC = 0x0;
	this.Carry_Flag = false;
	this.Zero_Flag = false;
	this.IRQ_Disable_Flag = false;
	this.Decimal_Flag = false;
	this.Brk_Flag = false;
	this.Unused_Flag = false;
	this.Overflow_Flag = false;
	this.Negative_Flag = 0;
	this.Reset();

	this.op = new Array(256); 
	for(var i=0; i<256; i++)
	{
		this.op[i] = opcodes[i].op | (opcodes[i].amode<<8) | (opcodes[i].count<<16);
		if (opcodes[i].count == 0) this.op[i] = opcodes[i].op | (opcodes[i].amode<<8) | (1<<16);
		if (
				(opcodes[i].op == OP_STA) ||
				(opcodes[i].op == OP_STX) ||
				(opcodes[i].op == OP_STY)) this.op[i] |= 0x1000000;
		if (
				(opcodes[i].amode != AMODE_ACC) &&
				(opcodes[i].amode != AMODE_IMM) &&
				(opcodes[i].amode != AMODE_IMP) &&
				(opcodes[i].amode != AMODE_REL) &&
				(opcodes[i].amode != AMODE_IND)
				)
		{
			if (
					(opcodes[i].op == OP_STA) ||
					(opcodes[i].op == OP_INC) ||
					(opcodes[i].op == OP_DEC) ||
					(opcodes[i].op == OP_ASL) ||
					(opcodes[i].op == OP_LSR) ||
					(opcodes[i].op == OP_STX) ||
					(opcodes[i].op == OP_STY) ||
					(opcodes[i].op == OP_ROL) ||
					(opcodes[i].op == OP_ROR)
					) this.op[i] |= 0x2000000;
		}

	}
}

MOS6502.prototype.Reset = function() {
	this.AC = 0x0;
	this.XR = 0x0;
	this.YR = 0x0;
	this.PC = this.Read(0xFFFC) + (this.Read(0xFFFD)<<8);
	this.SP = 0xFF;
	this.PutStatus(32);
}

MOS6502.prototype.SetPC = function(offset) {
	this.PC = offset&0xFFFF;
}

MOS6502.prototype.GetStatus = function() {
	var x = 0x0;
	if (this.Carry_Flag) x |= 1;
	if (this.Zero_Flag)  x |= 2;
	if (this.IRQ_Disable_Flag)  x |= 4;
	if (this.Decimal_Flag) x |= 8;
	if (this.Brk_Flag) x |= 16;
	x |= 32; // unused flag
	if (this.Overflow_Flag) x |= 64;
	if (this.Negative_Flag) x |= 128;
	return x;
}

MOS6502.prototype.PutStatus = function(x) {
	this.Unused_Flag = true;
	this.Carry_Flag = (x&1)?true:false;
	this.Zero_Flag = (x&2)?true:false;
	this.IRQ_Disable_Flag = (x&4)?true:false;
	this.Decimal_Flag = (x&8)?true:false;
	this.Brk_Flag = (x&16)?true:false;
	this.Overflow_Flag = (x&64)?true:false;
	this.Negative_Flag = (x&128);
}

MOS6502.prototype.Disassemble = function() {

	var address_mode = 0x0, x = 0x0;
	var address = 0x0;
	s = "";

	/*
	printf("AC: %u\n",this.AC);

	printf("XR: %u YR: %u\n",this.XR, this.YR);
	printf("PC: %u SP: %u\n",this.PC, this.SP);

	printf("Carry Flag: %u\n",this.Carry_Flag);
	printf("Zero Flag: %u\n",this.Zero_Flag);
	printf("Overflow Flag: %u\n",this.Overflow_Flag);
	printf("Negative Flag: %u\n",this.Negative_Flag);
*/
	address_mode = opcodes[this.Read(this.PC)].amode;
	var s = opcodes[this.Read(this.PC)].opsstr + " ";
	
	switch (address_mode)
	{
	case AMODE_IMP:            
		break;

	case AMODE_ACC:
		s += "A";
		break;

	case AMODE_ABS:
		address = (this.Read(this.PC+2) << 8) | this.Read(this.PC+1);
		s += address;
		break;

	case AMODE_IMM:
		x = this.Read(this.PC+1);
		s += "#" + x;
		break;

	case AMODE_ZP:
		address = this.Read(this.PC+1);
		s += address;
		break;

	case AMODE_ABSX:
		address = (this.Read(this.PC+2) << 8) + this.Read(this.PC+1);
		s += address + ",x";
		break;

	case AMODE_ABSY:
		address = (this.Read(this.PC+2) << 8) + this.Read(this.PC+1);
		s += address + ",y";
		break;

	case AMODE_ZPX:
		address = (this.Read(this.PC+1)+this.XR) & 0xFF;
		s += address + ",x";
		break;

	case AMODE_ZPY:
		address = (this.Read(this.PC+1)+this.YR) & 0xFF;
		s += address + ",y";
		break;

	case AMODE_REL:
		x = this.Read(this.PC+1);
		s += (x<<24)>>24;
		break;

	case AMODE_IND:
		address = (this.Read(this.PC+2) << 8) | this.Read(this.PC+1);
		s += "(" + address + ")";      
		break;

	case AMODE_INDX:
		address = (this.Read(this.PC+1) + this.XR) & 0xFF;
		s += "(" + address + ",x)";      
		break;

	case AMODE_INDY:
		address = this.Read(this.PC+1);
		s += "(" + address + "),y";
		break;
	}
	DebugMessage(this.PC + ": " + s);
}

MOS6502.prototype.MaskableInterrupt = function() {
	//DebugMessage("interrupt");
	if (this.IRQ_Disable_Flag) return;
	this.Write(256|this.SP,  ((this.PC) >> 8) & 0xFF);
	this.SP = (this.SP-1)&0xFF;
	this.Write(256|this.SP,  (this.PC) & 0xFF);
	this.SP = (this.SP-1)&0xFF;
	this.Brk_Flag = false;
	this.Write(256|this.SP,  this.GetStatus());
	this.SP = (this.SP-1)&0xFF;
	this.IRQ_Disable_Flag = true;
	this.PC = this.Read(0xFFFE) | (this.Read(0xFFFF) << 8);
}

MOS6502.prototype.NonMaskableInterrupt = function()
{    
	this.Write(256|this.SP,  ((this.PC) >> 8) & 0xFF);
	this.SP = (this.SP-1)&0xFF;
	this.Write(256|this.SP,  (this.PC) & 0xFF);
	this.SP = (this.SP-1)&0xFF;
	this.Brk_Flag = false;
	this.Write(256|this.SP,  this.GetStatus());
	this.SP = (this.SP-1)&0xFF;
	this.IRQ_Disable_Flag = true;
	this.PC = this.Read(0xFFFA) | (this.Read(0xFFFB) << 8);
}

MOS6502.prototype.Step = function(steps) {
	var x = 0x0;
	var address = 0x0;
	var stack = 0x0; // used by PLP and RTI
	var help = 0x0, help2 = 0x0; //used in some operations like adc and cmp
	var count = 0;
	var command = 0;
	while(steps--)
	{
		command = this.Read(this.PC);
		//command = this.PC<0xA000?this.mem[this.PC]:this.Read(this.PC);
		var op = this.op[command];
		var address_mode = (op>>8) & 0xFF;
		var code = op&0xFF;
		count += (op>>16)&0xFF;

		switch (address_mode)
		{
		case AMODE_IMP:
			this.PC += 1;
			break;

		case AMODE_ACC:
			x = this.AC;
			this.PC += 1;
			break;

		case AMODE_ABS:
			address = (this.Read(this.PC+2) << 8) | this.Read(this.PC+1);
			if (!(op & 0x1000000)) x = this.Read(address);
			this.PC += 3;
			break;

		case AMODE_IMM:
			if (!(op & 0x1000000)) x = this.Read(this.PC+1);
			this.PC += 2;
			break;

		case AMODE_ZP:
			address = this.Read(this.PC+1);
			if (!(op & 0x1000000))  x = this.Read(address);
			this.PC += 2;
			break;

		case AMODE_ABSX:
			address = ((this.Read(this.PC+2) << 8) | this.Read(this.PC+1)) + this.XR;
			if (!(op & 0x1000000)) x = this.Read(address);
			this.PC += 3;
			break;

		case AMODE_ABSY:
			address = ((this.Read(this.PC+2) << 8) | this.Read(this.PC+1)) + this.YR;
			if (!(op & 0x1000000)) x = this.Read(address);
			this.PC += 3;
			break;

		case AMODE_ZPX:
			address = (this.Read(this.PC+1)+this.XR) & 0xFF;
			if (!(op & 0x1000000)) x = this.Read(address);
			this.PC += 2;
			break;

		case AMODE_ZPY:
			address = (this.Read(this.PC+1)+this.YR) & 0xFF;
			if (!(op & 0x1000000)) x = this.Read(address);
			this.PC += 2;
			break;

		case AMODE_REL:
			x = this.Read(this.PC+1);
			this.PC += 2;
			break;

		case AMODE_IND:
			address = (this.Read(this.PC+2) << 8) | this.Read(this.PC+1);
			address = (( this.Read( (address+1) & 0xFF | address&0xFF00 ) ) << 8) | this.Read(address);
			address &= 0xFFFF;
			this.PC += 3;
			break;

		case AMODE_INDX:
			address = (this.Read(this.PC+1) + this.XR) & 0xFF;
			address = (this.Read(address+1) << 8) | this.Read(address);
			if (!(op & 0x1000000)) x = this.Read(address);       
			this.PC += 2;
			break;

		case AMODE_INDY:
			address = this.Read(this.PC+1);
			address = (this.Read(address+1) << 8) + (this.Read(address)+this.YR);
			if (!(op & 0x1000000)) x = this.Read(address);
			this.PC += 2;
			break;
		}

		switch  (code)
		{
		case 0:
			//DebugMessage("Error: unknwon opcode " + command + " at " + this.PC);
			//throw "Unknown opcode";
			break;
		case OP_CMP:
			help = this.AC-x;
			this.Zero_Flag = help==0;
			this.Negative_Flag = (help & 128);
			this.Carry_Flag = help >= 0;
			break;

		case OP_CPX:
			help = this.XR-x;
			this.Zero_Flag =  help==0;
			this.Negative_Flag = (help & 128);
			this.Carry_Flag = help >= 0;
			break;

		case OP_CPY:
			help = this.YR-x;
			this.Zero_Flag =  help==0;
			this.Negative_Flag = (help & 128);
			this.Carry_Flag = help >= 0;
			break;

		case OP_LDA:
			this.AC = x;
			this.Zero_Flag =  x==0;
			this.Negative_Flag = (x & 128);
			break;
			
		case OP_STA:
			x = this.AC;
			break;

		case OP_LDX:
			this.XR = x;
			this.Zero_Flag =  x==0;
			this.Negative_Flag = (x & 128);
			break;

		case OP_LAX:
			DebugMessage("Error: unknwon opcode " + command + " at " + this.PC);

			this.AC = x;
			this.XR = x;
			this.Zero_Flag =  x==0;
			this.Negative_Flag = (x & 128);
			break;


		case OP_STX:
			x = this.XR;
			break;

		case OP_LDY:
			this.YR = x;
			this.Zero_Flag =  x==0;
			this.Negative_Flag = (x & 128) ;
			break;

		case OP_STY:
			x = this.YR;
			break;

		case OP_AND:
			this.AC = this.AC & x;
			this.Zero_Flag =  this.AC==0;
			this.Negative_Flag = (this.AC & 128) ;
			break;

		case OP_EOR:
			this.AC = this.AC ^ x;
			this.Zero_Flag =  this.AC==0;
			this.Negative_Flag = (this.AC & 128) ;
			break;

		case OP_ORA:
			this.AC = this.AC | x;
			this.Zero_Flag =  this.AC==0;
			this.Negative_Flag = (this.AC & 128) ;
			break;

		case OP_ADC:
			if (this.Decimal_Flag)
			{
				help = (this.AC & 0x0f) + (x & 0x0f);		// Calculate lower nybble
				if (this.Carry_Flag) help++;
				if (help > 9) help = help + 6;									// BCD fixup for lower nybble

				help2 = (this.AC >> 4) + (x >> 4);							// Calculate upper nybble
				if (help > 0x0f) help2 = help2 + 1;
				var help3 = this.AC+x;
				if (this.Carry_Flag) help3 = help3 + 1;

				this.Zero_Flag = (help3 & 255) == 0;

				this.Negative_Flag = (help2 & 8); // Only highest bit used
				this.Overflow_Flag = (((help2 << 4) ^ this.AC) & 0x80) && !(((this.AC ^ x) & 0x80) != 0);

				if (help2 > 9) help2 = help2 + 6;									// BCD fixup for upper nybble
				this.Carry_Flag = help2 > 0x0f;										// Set carry flag
				this.AC = (help2 << 4) | (help & 0x0f);							// Compose result
				

			} else {
				help = this.AC + x;
				if (this.Carry_Flag) help++;
				this.Overflow_Flag = (((~(this.AC ^ x) & 0x80) ) != 0) && (((this.AC ^ help) & 0x80) != 0 );
				this.AC = help & 0xFF;
				this.Zero_Flag = this.AC==0;
				this.Negative_Flag = (this.AC & 128) ;
				this.Carry_Flag = help > 0xFF;
			}
			break;

		case OP_SBC:
			if (this.Decimal_Flag) {
				var low = 0x0, high = 0x0;
				low = (this.AC & 0x0f) - (x & 0x0f);		// Calculate lower nybble
				if (!this.Carry_Flag) low--;

				help2 = (this.AC >> 4) - (x >> 4);							// Calculate upper nybble
				if ((low & 0x10) != 0)
				{
					low = low - 6;											// BCD fixup for lower nybble
					help2 = help2 - 1;
				}
				if ((help2 & 0x10) != 0) help2 = help2 - 6;									// BCD fixup for upper nybble
				var help3 = this.AC - x;
				if (!this.Carry_Flag) help3 = help3 - 1;

				this.Carry_Flag = help3 < 0x100;									// Set flags
				this.Overflow_Flag = (((this.AC ^ help3) & 0x80) != 0) & (((this.AC ^ x) & 0x80) != 0);
				this.Zero_Flag = (help3 & 255) == 0;
				this.Negative_Flag = (help3 & 128);
				this.AC = (help2 << 4) | (low & 0x0f);							// Compose result
			} else {
				help = this.AC - x;
				if (!this.Carry_Flag) help--;
				this.Overflow_Flag = (((this.AC ^ help) & 0x80) ) && (((this.AC ^ x) & 0x80) );
				this.AC = help & 0xFF;
				this.Carry_Flag = help >= 0;
				this.Zero_Flag =  this.AC==0;
				this.Negative_Flag = (this.AC & 128) ;
			}
			break;

		case OP_BIT:
			this.Negative_Flag = (x & 0x80);
			this.Overflow_Flag = (x & 0x40);
			this.Zero_Flag = (x & this.AC ) == 0;
			break;

		case OP_INC:
			x = (x+1)&0xFF;
			this.Zero_Flag =  x==0;
			this.Negative_Flag = (x & 128);
			break;

		case OP_INX:
			this.XR = (this.XR+1)&0xFF;
			this.Zero_Flag =  this.XR==0;
			this.Negative_Flag = (this.XR & 128);
			break;

		case OP_INY:
			this.YR = (this.YR+1)&0xFF;
			this.Zero_Flag =  this.YR==0;
			this.Negative_Flag = (this.YR & 128) ;
			break;

		case OP_DEC:
			x = (x-1)&0xFF;
			this.Zero_Flag =  x==0;
			this.Negative_Flag = (x & 128);
			break;

		case OP_DEX:
			this.XR = (this.XR-1)&0xFF;
			this.Zero_Flag =  this.XR==0;
			this.Negative_Flag = (this.XR & 128);
			break;

		case OP_DEY:
			this.YR = (this.YR-1)&0xFF;
			this.Zero_Flag =  this.YR==0;
			this.Negative_Flag = (this.YR & 128);
			break;

		case OP_ASL:
			this.Carry_Flag = (x & 128) != 0;
			x = (x << 1)&0xFF;
			this.Zero_Flag = x==0;
			this.Negative_Flag = (x & 128);
			break;

		case OP_LSR:
			this.Carry_Flag = (x & 1) != 0;
			x = (x >> 1)&0xFF;
			this.Zero_Flag = x==0;
			this.Negative_Flag = 0;
			break;

		case OP_ROL:
			help = x << 1;
			if (this.Carry_Flag) help |= 1;
			this.Carry_Flag = help > 255;
			x = help & 0xFF;
			this.Zero_Flag =  x==0;
			this.Negative_Flag = (x & 128);
			break;

		case OP_RLA:
			help = x << 1;
			if (this.Carry_Flag) help |= 1;
			this.Carry_Flag = help > 255;
			x = help & 0xFF;
			this.AC &= x;			
			this.Zero_Flag =  x==0;
			this.Negative_Flag = (x & 128);
			break;

		case OP_ROR:
			help = x & 1;        
			x = (x >> 1)&0xFF;
			if (this.Carry_Flag) x = x | 128;
			this.Carry_Flag = help != 0;
			this.Zero_Flag = x==0;
			this.Negative_Flag = (x & 128);
			break;

		case OP_PHA:
			this.Write(256|this.SP, this.AC);
			this.SP = (this.SP-1)&0xFF;
			break;

		case OP_PLA:
			this.SP = (this.SP+1)&0xFF;
			this.AC = this.Read(256|this.SP);
			this.Zero_Flag = this.AC==0;
			this.Negative_Flag = (this.AC & 128);
			break;

		case OP_PHP:
			this.Write(256|this.SP, this.GetStatus() | 16);
			this.SP = (this.SP-1)&0xFF;
			break;

		case OP_PLP:
			this.SP = (this.SP+1)&0xFF;
			stack = this.Read(256|this.SP);
			this.PutStatus(stack);
			break;

		case OP_JMP:
			this.PC = address;
			break;

		case OP_JSR:
			this.Write( 256|this.SP, ((this.PC-1) >> 8) & 0xFF);
			this.SP = (this.SP-1)&0xFF;
			this.Write( 256|this.SP, (this.PC-1) & 0xFF);
			this.SP = (this.SP-1)&0xFF;
			this.PC = address;
			break;

		case OP_RTS:
			this.SP = (this.SP+1)&0xFF;
			this.PC = this.Read(256|this.SP);
			this.SP = (this.SP+1)&0xFF;
			this.PC |= (this.Read(256|this.SP) << 8);
			this.PC++;
			break;

		case OP_RTI:
			this.SP = (this.SP+1)&0xFF;
			stack = this.Read(256|this.SP);
			this.PutStatus(stack);
			this.SP = (this.SP+1)&0xFF;
			this.PC = this.Read(256|this.SP);
			this.SP = (this.SP+1)&0xFF;
			this.PC = this.PC | (this.Read(256|this.SP) << 8);
			break;

		case OP_BRK:
			this.Write(256|this.SP,  ((this.PC+1) >> 8) & 0xFF);
			this.SP = (this.SP-1)&0xFF;
			this.Write(256|this.SP,  (this.PC+1) & 0xFF);
			this.SP = (this.SP-1)&0xFF;
			this.Brk_Flag = true;
			this.Write(256|this.SP,  this.GetStatus());
			this.SP = (this.SP-1)&0xFF;
			this.IRQ_Disable_Flag = true;
			this.PC = this.Read(0xFFFE) | (this.Read(0xFFFF) << 8);
			break;

		case OP_BNE:
			if (!this.Zero_Flag) {this.PC += ((x<<24)>>24); count++;}
			break;

		case OP_BCC:
			if (!this.Carry_Flag) {this.PC += ((x<<24)>>24); count++;}
			count++; // ???
			break;

		case OP_BEQ:
			if (this.Zero_Flag) {this.PC += ((x<<24)>>24); count++;}
			break;

		case OP_BMI:
			if (this.Negative_Flag) {this.PC += ((x<<24)>>24); count++;}
			break;

		case OP_BVC:
			if (!this.Overflow_Flag) {this.PC += ((x<<24)>>24); count++;}
			break;

		case OP_BCS:
			if (this.Carry_Flag) {this.PC += ((x<<24)>>24); count++;}
			break;

		case OP_BPL:
			if (!this.Negative_Flag) {this.PC += ((x<<24)>>24); count++;}
			break;

		case OP_BVS:
			if (this.Overflow_Flag) {this.PC += ((x<<24)>>24); count++;}
			break;

		case OP_TAX:
			this.XR = this.AC;
			this.Zero_Flag =  this.AC==0;
			this.Negative_Flag = (this.AC & 128) ;
			break;

		case OP_TAY:
			this.YR = this.AC;
			this.Zero_Flag =  this.AC==0;
			this.Negative_Flag = (this.AC & 128) ;
			break;

		case OP_TXA:
			this.AC = this.XR;
			this.Zero_Flag =  this.AC==0;
			this.Negative_Flag = (this.AC & 128) ;
			break;

		case OP_TYA:
			this.AC = this.YR;
			this.Zero_Flag =  this.AC==0;
			this.Negative_Flag = (this.AC & 128) ;
			break;

		case OP_TXS:
			this.SP = this.XR;
			break;

		case OP_TSX:
			this.XR = this.SP;
			this.Zero_Flag =  this.XR==0;
			this.Negative_Flag = (this.XR & 128) ;
			break;

		case OP_CLC:
			this.Carry_Flag = false;
			break;

		case OP_CLD:
			this.Decimal_Flag = false;
			break;

		case OP_CLI:
			this.IRQ_Disable_Flag = false;
			break;

		case OP_CLV:
			this.Overflow_Flag = false;
			break;

		case OP_SEC:
			this.Carry_Flag = true;
			break;

		case OP_SED:
			this.Decimal_Flag = true;
			break;

		case OP_SEI:
			this.IRQ_Disable_Flag = true;
			break;

		case OP_EMU:
			this.PC--;
			return count + (steps)*4; // fast endless loop
			break;
		}
		if (address_mode == AMODE_ACC) this.AC = x&0xFF; 
		else if (op & 0x2000000) this.Write(address, x);

		/*
	switch (address_mode)
	{
		case AMODE_ACC:
			this.AC = x&0xFF;
			break;
		case AMODE_IMM:
		case AMODE_IMP:
		case AMODE_REL:
		case AMODE_IND:
			break;

		default:
			switch  (code)
			{
				case  OP_STA:
				case  OP_INC:
				case  OP_DEC:
				case  OP_ASL:
				case  OP_LSR:
				case  OP_STX:
				case  OP_STY:
				case  OP_ROL:
				case  OP_ROR:
					this.Write(address, x);
					break;
			}
			break;
		}
*/
		//if (x < 0) DebugMessage("Error x");
		//if (x > 0xFF) DebugMessage("Error x");
		/*
		if (this.PC < 0) DebugMessage("Error PC");
		if (this.AC < 0) DebugMessage("Error AC");
		if (this.XR < 0) DebugMessage("Error XR");
		if (this.YR < 0) DebugMessage("Error YR");
		if (this.SP < 0) DebugMessage("Error SP");
		if (this.PC > 0xFFFF) DebugMessage("Error PC");
		if (this.AC > 0xFF) DebugMessage("Error AC");
		if (this.XR > 0xFF) DebugMessage("Error XR");
		if (this.YR > 0xFF) DebugMessage("Error YR");
		if (this.SP > 0xFF) DebugMessage("Error SP");
		*/
		/*
		this.PC &= 0xFFFF;
		this.AC &= 0xFF;
		this.XR &= 0xFF;
		this.YR &= 0xFF;
		this.SP &= 0xFF;
		*/
	} // while steps
	return count;
}