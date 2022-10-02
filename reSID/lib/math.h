#ifndef MATH_H
#define MATH_H

#ifndef __wasm__
#error "Wasm target only"
#endif

double sqrt(double x);
double log10(double x);
double log(double x);
double exp(double x);
double fabs(double x);
double sin(double x);
double ceil(double x);
double floor(double x);


#endif
