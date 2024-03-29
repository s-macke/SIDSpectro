#include"debug.h"

typedef unsigned long size_t;
#define NULL 0
#define NAN (0.0f / 0.0f)

double fabs(double x) {
    if (x == 0.0) return 0.0;
    if (x > 0.0) return x;
    return -x;
}

double floor(double num) {
    if (num < 0)
        return (int) num - 1;
    else
        return (int) num;
}

double sqrt(double x) {
    if (x < 0.) return -NAN;
    if (x == 0.) return 0.;
    // initial guess to be 1
    double z = x * 0.5;
    for (int i = 1; i < 10; i++) {
        z -= (z * z - x) / (2 * z);
    }
    return z;
}

double exp(double x) {
    double x1 = 1;
    int n = 0;
    double sum = 0.;
    do {
        sum += x1;
        x1 *= (x / ++n);
    } while (fabs(x1) > 0.00001);
    return sum;
}
/*
double exp2(double n) {
    debug("exp");
    debugint(n*100.);
    int a = 0, b = n > 0;
    double c = 1, d = 1, e = 1;
    for (b || (n = -n); e + .00001 < (e += (d *= n) / (c *= ++a)););
    // approximately 15 iterations
    //debug("exp end");
    return b ? e : 1 / e;
}
*/
double log(const double n) {
    // Basic logarithm computation.
    const double euler = 2.7182818284590452354;
    unsigned a = 0, d;
    double b, c, e, f;
    if (n > 0) {
        for (c = n < 1. ? 1. / n : n; (c /= euler) > 1.; ++a);
        c = 1. / (c * euler - 1.);
        c = c + c + 1.;
        f = c * c;
        b = 0.;
        for (d = 1, c /= 2.; e = b, b += 1. / (d * c), b - e/* > 0.0000001*/;) {
            d += 2;
            c *= f;
        }
    } else {
        b = (n == 0) / 0.;
    }
    return n < 1. ? -(a + b) : a + b;
}

double log10(const double n) {
    return log(n) / 2.30258509299;
}

double log1p(double x) {
    return log(1 + x) - (((1 + x) - 1) - x) / (1 + x);
}

double sin(double x) {
    double PI = 3.1415926535897932384650288;
    double sign = 1;
    if (x < 0) {
        sign = -1.0;
        x = -x;
    }
    if (x > 2. * PI) x -= int(x / (2. * PI)) * 2. * PI;
    double res = 0;
    double term = x;
    int k = 1;
    while (res + term != res) {
        res += term;
        k += 2;
        term *= -x * x / k / (k - 1);
    }

    return sign * res;
}

double ceil(double num) {
    int inum = (int) num;
    if (num == (float) inum) {
        return inum;
    }
    return (num < 0) ? inum : inum + 1;
}

extern char __heap_base; // start of dynamic memory allocation (heap). Exported by clang
char *allocPointer = NULL;

void *malloc(size_t size) {
    if (allocPointer == NULL) { // First call: initialize
        allocPointer = &__heap_base;
    }
    void *p = allocPointer;
    allocPointer += size;
    return p;
}

void *operator new[](size_t size) {
    debug("Allocating array of size ");
    debugint(size);
    return malloc(size);
}

void *operator new(size_t size) {
    debug("Allocating object of size ");
    debugint(size);
    return malloc(size);
}

void operator delete[](void *ptr) noexcept {
    debug("Deleting array");
    // ignore
}

extern "C" {

int __cxa_atexit(void (*func)(void *), void *arg, void *dso_handle) {
    debug("__cxa_atexit called: This should neven happen in wasm");
    // never used
    return 0;
}

void *memset(void *s, int c, size_t n) {
    char *d = (char *) s;
    for (int i = 0; i < n; i++) d[i] = c;
    return s;
}

void *memcpy(void *dest, const void *src, unsigned long n) {
    // Typecast src and dest addresses to (char *)
    char *csrc = (char *) src;
    char *cdest = (char *) dest;

    // Copy contents of src[] to dest[]
    for (int i = 0; i < n; i++)
        cdest[i] = csrc[i];

    return dest;
}

}

// from stack overflow
int itoa(int value, char *sp, int radix)
{
    char tmp[16];// be careful with the length of the buffer
    char *tp = tmp;
    int i;
    unsigned v;

    int sign = (radix == 10 && value < 0);
    if (sign)
        v = -value;
    else
        v = (unsigned)value;

    while (v || tp == tmp)
    {
        i = v % radix;
        v /= radix;
        if (i < 10)
            *tp++ = i+'0';
        else
            *tp++ = i + 'a' - 10;
    }

    int len = tp - tmp;

    if (sign)
    {
        *sp++ = '-';
        len++;
    }

    while (tp > tmp)
        *sp++ = *--tp;

    return len;
}

void debugint(int i) {
    char buf[18];
    memset(buf, 0, 18);
    itoa(i, buf, 10);
    debug(buf);
}

// Very basic printf implementation.
int printf(const char *format, ...) {
    debug(format);
    return 0;
}
int puts(const char *s) {
    debug(s);
    debug("\n");
    return 0;
}