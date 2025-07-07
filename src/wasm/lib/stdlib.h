#ifndef STDLIB_H
#define STDLIB_H

#ifndef __wasm__
#error "Wasm target only"
#endif

#include<stddef.h>

typedef long size_t;
extern "C" {

void *malloc(unsigned long size);
void *memcpy(void *dest, const void *src, unsigned long n);
void *calloc(unsigned long nmemb, unsigned long size);
void free(void *ptr);

#define RAND_MAX 32767
int rand();

__attribute__((import_module("env"), import_name("exit"))) void exit(int status);
}

#endif