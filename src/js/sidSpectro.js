
function SidSpectro() {
    spectrum = new Spectrum("screen")

    this.importObject = {
        env: {
            memory: new WebAssembly.Memory({initial: 2048, maximum: 2048}), // 32 MB // we need approx 23 MB for reSID
            debug: this.Stdout.bind(this),
            exit: function (code) {
                console.log("exit: " + code);
            }
        }
    };
    this.ram = new Uint8Array(this.importObject.env.memory.buffer, 0);
    this.ram16 = new Int16Array(this.importObject.env.memory.buffer, 0);

    WebAssembly.instantiateStreaming(fetch("src/wasm/resid.wasm"), this.importObject).then(
        (module) => {
            this.C64 = module.instance.exports
            console.log(this.C64)
            this.C64._initialize();
            this.C64.Reset();
            console.log("reSID initialized")
        }
    );
}


let str = "";

SidSpectro.prototype.Stdout = function (strp) {
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

