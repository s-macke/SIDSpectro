#ifndef STDIO_H
#define STDIO_H

#ifndef __wasm__
#error "Wasm target only"
#endif

extern "C" {

int printf(const char *format, ...);
int puts(const char *s);

}
#endif