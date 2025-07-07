#ifndef DEBUG_H
#define DEBUG_H

extern "C" {
#ifdef __wasm__
    __attribute__((import_module("env"), import_name("debug"))) extern void debug(const char *str);
#else
    extern void debug(const char *str);
#endif

    void debugint(int i);
}

#endif