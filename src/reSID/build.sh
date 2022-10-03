set -e
rm -f *.o

#standalone binary for testing
#g++ -DVERSION=\"1.0-pre2\" *.cc -lm -o sid

clang -Os -nostdlib --target=wasm32 -DVERSION=\"1.0-pre2\" -Ilib    \
-Wl,--no-entry    \
-Wl,--strip-all    \
-Wl,--import-memory    \
-Wl,--allow-undefined \
-Wl,--export=Init,--export=Reset,--export=Clock,--export=GetBuffer,--export=Read,--export=Write,--export=Clock,--export=GetState,--export=__heap_base   \
*.cc lib/lib.cc -o resid.wasm

# from wabt
wasm-strip resid.wasm

# from binaryen
wasm-opt -Os resid.wasm -o resid.wasm

# was everything compiled
wasm2wat resid.wasm | grep 'import\|export\|(global'
