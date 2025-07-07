#include<stdlib.h>
#include<string.h>
#include<stdio.h>
#include <stdint.h>

static uint8_t *filedata = 0;

#pragma pack(1)

typedef struct
{
    int32_t magic; // RSID
    int16_t version; // version 2,3,4
    int16_t offset;
    int16_t loadaddr;
    int16_t initaddr;
    int16_t playaddr;
    int16_t songs;
    int16_t startsong;
    int32_t speed;
    int8_t startpage;
    int8_t pagelength;
} SIDFileHeader;

#pragma options align=reset

typedef struct {
    SIDFileHeader header;
    int8_t startpage;
    int8_t pagelength;
} SIDFile;

static SIDFile sidfile;

void SIDFileInit() {
    printf("SIDFile Init\n");
    if (filedata == 0) {
        filedata = (uint8_t*)malloc(0x10000); // largest file I have found has 63508 bytes
    }
    memset(filedata, 0, 0x10000);
}

void SIDFileParse() {
    memcpy(&sidfile.header, filedata, sizeof(SIDFileHeader));

    if (sidfile.header.version >= 2) {
        sidfile.header.startpage = filedata[0x78];
        sidfile.header.pagelength = filedata[0x79];
    }
}


