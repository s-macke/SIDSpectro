#include<stdio.h>
#include<string>
#include<iostream>
#include <dirent.h>
#include <string.h>
#include <stdlib.h>
#include <unistd.h>

using namespace std;

string startdir("C64Music");
string rootdir("data");

bool IsDirectory(string dir) {
    if (0 != access(dir.c_str(), F_OK)) return false;
    return true;
}

// Converts abcd/efgh/ijkl to abcd+efgh+ijkl
string ConvertDir(string dir) {
    //cout << "Convert: " << dir;
    for (int i = 0; i < dir.size(); i++) {
        if (dir[i] == '/') dir[i] = '+';
    }
    if (dir[0] == '+') dir = dir.substr(1);
    if (dir.size() > 2) dir.erase(dir.size() - 1, 1); // remove trailing slash
    else {
        dir = "0";
    }
    //cout << " -> " << dir << endl;
    return dir;
}

void ParseDir(string dir) {
    cout << "Parse: " << dir << "\n";
    string cdir = string("xml/") + ConvertDir(dir) + ".xml";
    //cout << "Create: " << cdir << "\n";
    FILE *file = fopen(cdir.c_str(), "w");
    if (file == NULL) {
        fprintf(stderr, "Error: Could not open file\n");
        exit(1);
    }
    fprintf(file, "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
    fprintf(file, "<root>\n");

    struct dirent **namelist;
    int n;
    string listDir = (startdir + dir);
    cout << "Scan: " << listDir << "\n";
    n = scandir(listDir.c_str(), &namelist, 0, alphasort);
    if (n == 0) {
        perror("Couldn't open the directory");
        exit(1);
    }
    for (int i = 0; i < n; i++) {
        struct dirent *ep = namelist[i];
        int length = strlen(ep->d_name);
        if (length == 0) continue;
        if (ep->d_name[0] == '.') continue; // starts with "." or ".."
        //cout << "Entry: " << ep->d_name << " " << int(ep->d_type) << "\n";
        if (
                (ep->d_type == DT_REG) &&
                (ep->d_name[length - 1] == 'd') &&
                (ep->d_name[length - 2] == 'i') &&
                (ep->d_name[length - 3] == 's')) {
            if (dir == "") {
                fprintf(file, "  <item id=\"%s\">\n", (rootdir + "/" + startdir + "/" + ep->d_name).c_str());
            } else {
                fprintf(file, "  <item id=\"%s\">\n", (rootdir + "/" + startdir + dir + ep->d_name).c_str());
            }
            fprintf(file, "    <content><name><![CDATA[%s]]></name></content>\n", ep->d_name);
            fprintf(file, "  </item>\n");
        }
        if (ep->d_type == DT_DIR) {
            string newdir = dir + "/" + ep->d_name + "/";
            string cdir2 = string("xml/") + ConvertDir(newdir) + ".xml";

            if (IsDirectory(startdir + newdir)) {
                fprintf(file, "  <item id=\"%s\" state=\"open\">\n", (rootdir + "/" + cdir2).c_str());
                fprintf(file, "    <content><name><![CDATA[%s]]></name></content>\n", ep->d_name);
                fprintf(file, "  </item>\n");

                ParseDir(newdir);
            }
        }
    }

    fprintf(file, "</root>\n");
    fclose(file);
}

int main() {
    ParseDir(string(""));
    return 0;
}

