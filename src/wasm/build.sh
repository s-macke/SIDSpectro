set -e
rm -f *.o

#standalone binary for testing
#g++ -DVERSION=\"1.0-pre2\" reSID/*.cc c64/*.cc *.cc -lm -o sid

clang++    \
-Os -nostdlib --target=wasm32      \
-mcpu=generic                      \
-mexec-model=reactor               \
-mbulk-memory                      \
-Wl,--import-memory                \
-Wl,--strip-debug                  \
 -Wl,--export=Reset,--export=Clock,--export=GetSIDBuffer,--export=GetSIDState,--export=__heap_base   \
-DVERSION=\"1.0-pre2\"             \
-Ilib                              \
-o resid.wasm                      \
reSID/*.cc lib/lib.cc c64/*.cc *.cc

#-Wl,--allow-undefined              \
#-Wl,--strip-all
#-Wl,--no-entry

# from wabt
wasm-strip resid.wasm

# from binaryen
#wasm-opt -Os resid.wasm -o resid.wasm

# was everything compiled
wasm2wat resid.wasm | grep 'import\|export\|(global'
