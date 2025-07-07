#ifndef SID_H
#define SID_H

void SIDInit();
uint8_t SIDNextSample();
uint16_t SIDRead(int16_t index);
void SIDWrite(uint16_t index, uint8_t value);

#endif