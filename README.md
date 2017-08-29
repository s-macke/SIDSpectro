SIDSpectro
==========

Online SID player with spectrum analyzer

 * A project [demo](http://simulationcorner.net/Sidplayer/index.html) is available

To use the repository follow these steps
1. Clone this repository `git clone https://github.com/s-macke/SIDSpectro`
2. change directory `cd SIDSpectro` 
2. Create the directories "C64Music" and "XML". `mkdir C64Music && mkdir xml`
3. Place your Sid files into the folder "C64Music"
4. Compile xml converter and run `g++ toxml.cxx -o toxml.cxx && ./toxml`
5. Open index.html in your web browser.
