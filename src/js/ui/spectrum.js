// -------------------------------------------------
// ------------------ Spectrum ---------------------
// -------------------------------------------------

"use strict";

function Spectrum(screenid) {
    this.canvas = document.getElementById(screenid);
    this.canvas.onclick = this.OnCanvasClick.bind(this);
    this.ctx = this.canvas.getContext("2d");

    this.backBuffer = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    for (let i = 0; i < this.canvas.width * this.canvas.height; i++) {
        this.backBuffer.data[(i << 2) + 0] = 0x00;
        this.backBuffer.data[(i << 2) + 1] = 0x00;
        this.backBuffer.data[(i << 2) + 2] = 0x00;
        this.backBuffer.data[(i << 2) + 3] = 0xFF;
    }

    this.ctx.fillStyle = "#000000";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = "#FFFFFF";
    this.ctx.fillText("Click on 'Slightly Random Choice.sid' to start.", 50, 50);
}

Spectrum.prototype.getBackBuffer = function() {
    return this.backBuffer;
}

Spectrum.prototype.getMousePos = function(evt) {
    let rect = this.canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}

Spectrum.prototype.redrawSpectrum = function() {
    let pos = ((c64.sid.soundbuffer.GetTime() * 22050.) >> 6) % this.canvas.width;
    /*
        c64.canvas.putImageData(c64.imagedata, 0, 0);
        c64.canvas.fillStyle="#FFFFFF";
        c64.canvas.fillText(c64.sid.soundbuffer.GetTime(),  45, 30);
    */
    this.ctx.putImageData(c64.imagedata, -pos, 0);
    this.ctx.putImageData(c64.imagedata, this.canvas.width - pos, 0);

    this.ctx.fillStyle = "#000000";
    this.ctx.fillRect(0, 0, 40, this.canvas.height);

    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = "#FFFFFF";
    this.ctx.beginPath();
    this.ctx.moveTo(150, 0);
    this.ctx.lineTo(150, this.canvas.height);
    this.ctx.stroke();

    if (typeof sidfiletemp != 'undefined') {
        let xofs = -30;
        this.ctx.fillStyle = "#FFFFFF";
        this.ctx.beginPath();
        this.ctx.moveTo(30 + xofs, 20 - 8);
        this.ctx.lineTo(40 + xofs, 10 - 8);
        this.ctx.lineTo(40 + xofs, 30 - 8);
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.moveTo(70 + 70 + xofs, 20 - 8);
        this.ctx.lineTo(60 + 70 + xofs, 10 - 8);
        this.ctx.lineTo(60 + 70 + xofs, 30 - 8);
        this.ctx.fill();
        this.ctx.fillText("Song No. " + sidfiletemp.startsong + " of " + sidfiletemp.songs, 45 + xofs, 23 - 8);
        this.ctx.fillText(sidfiletemp.name, 45 + xofs, 30);
        this.ctx.fillText(sidfiletemp.author, 45 + xofs, 45);
        this.ctx.fillText(sidfiletemp.released, 45 + xofs, 60);
    }
    window.requestAnimationFrame(this.redrawSpectrum.bind(this));
    //window.setTimeout(RedrawSpectrum, 500);
}

Spectrum.prototype.OnCanvasClick = function(event) {
    let mousepos = this.getMousePos(event);
    let x = mousepos.x;
    let y = mousepos.y;
    if (typeof sidfiletemp != 'undefined') {
        if ((x >= 100) && (x <= 110))
            if ((y >= 2) && (y <= 22)) {
                sidfiletemp.startsong++;
                if (sidfiletemp.startsong > sidfiletemp.songs) sidfiletemp.startsong = 1;
                sidfile = sidfiletemp;
            }
        if ((x >= 0) && (x <= 10))
            if ((y >= 2) && (y <= 22)) {
                sidfiletemp.startsong--;
                if (sidfiletemp.startsong === 0) sidfiletemp.startsong = sidfiletemp.songs;
                sidfile = sidfiletemp;
            }
    }
}
