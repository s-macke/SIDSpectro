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
        dir = "root";
    }
    //cout << " -> " << dir << endl;
    return dir;
}

void ParseDir(string dir) {
    cout << "Parse: " << dir << "\n";
    string cdir = string("json/") + ConvertDir(dir) + ".json";
    //cout << "Create: " << cdir << "\n";
    FILE *file = fopen(cdir.c_str(), "w");
    if (file == NULL) {
        fprintf(stderr, "Error: Could not open file\n");
        exit(1);
    }
    fprintf(file, "[\n");

    struct dirent **namelist;
    int n;
    string listDir = (startdir + dir);
    cout << "Scan: " << listDir << "\n";
    n = scandir(listDir.c_str(), &namelist, 0, alphasort);
    if (n == 0) {
        perror("Couldn't open the directory");
        exit(1);
    }
    bool first = true;
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

            if (!first) fprintf(file, ",\n");
            first = false;
            string id = (rootdir + "/" + startdir + "/" + ep->d_name).c_str();
            if (dir != "") {
                id = (rootdir + "/" + startdir + dir + ep->d_name).c_str();
            }
            fprintf(file, "  {\"id\": \"%s\", \"text\": \"%s\"}", id.c_str(), ep->d_name);
        } else
        if (ep->d_type == DT_DIR) {
            if (!first) fprintf(file, ",\n");
            first = false;
            string newdir = dir + "/" + ep->d_name + "/";
            string cdir2 = string("json/") + ConvertDir(newdir) + ".json";

            if (IsDirectory(startdir + newdir)) {
                string id = (rootdir + "/" + cdir2);
                fprintf(file, "  {\"id\": \"%s\", \"text\": \"%s\", \"children\": true}", id.c_str(), ep->d_name);
                ParseDir(newdir);
            }
        } else {
            //fprintf(stderr, "Error: Unknown file type\n");
            //exit(1);
        }
    }

    fprintf(file, "\n]\n");
    fclose(file);
}

int main() {
    ParseDir(string(""));
    return 0;
}

