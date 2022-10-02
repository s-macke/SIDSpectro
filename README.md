SIDSpectro
==========

Online SID player with spectrum analyzer

* Powered by [reSID](https://en.wikipedia.org/wiki/ReSID).

## A project [demo](http://simulationcorner.net/Sidplayer/index.html) is available

## How to use

1. Clone this repository `git clone https://github.com/s-macke/SIDSpectro`
2. Change directory `cd SIDSpectro`
3. Place your SID files into the folder "data/C64Music"
4. Compile xml converter and run `cd data && g++ toxml.cxx -o toxml && ./toxml`
5. Start a static web server in the root directory of the repository. E g.  `python3 -m http.server 8000` 
6. Open the web browser and access your web server.
