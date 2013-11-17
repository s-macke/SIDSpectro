#include<stdio.h>
#include<string>
#include<iostream>
#include <dirent.h>
#include <string.h>
#include <stdlib.h>
#include <unistd.h>

using namespace std;

string startdir("./C64Music/");

bool IsDirectory(string dir)
{
	if (0 != access(dir.c_str(), F_OK)) return false;
	return true;
}

string ConvertDir(string dir)
{
	for(int i=0; i<dir.size(); i++)
	{
		if (dir[i] == '/') dir[i] = '+';
	}
	if (dir.size() > 2) dir.erase(dir.size()-1, 1); else
	{
		dir = "0";
	}
	return dir;
}


void ParseDir(string dir)
{
	struct dirent *ep;     
	cout << ConvertDir(dir) << "\n";
	string cdir = string("xml/")+ConvertDir(dir)+".xml";
	FILE *file = fopen( cdir.c_str(), "w");
	if (file == NULL)
	{
		fprintf(stderr, "Error: Could not open file\n");
		exit(1);
	}
	fprintf(file, "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
	fprintf(file, "<root>\n");

	struct dirent **namelist;
	int n;
	n = scandir((startdir+dir).c_str(), &namelist, 0, alphasort);
	if (n != 0)
	{
		for(int i=0; i<n; i++)
		{
			ep = namelist[i++];
			int s = strlen(ep->d_name);
			if (s == 0) continue;
			if (ep->d_name[0] == '.') continue;
			if (
					(ep->d_name[s-1] == 'd') &&
					(ep->d_name[s-2] == 'i') &&
					(ep->d_name[s-3] == 's'))
			{
				fprintf(file, "  <item id=\"%s\">\n", (startdir+dir+ep->d_name).c_str());
				fprintf(file, "    <content><name><![CDATA[%s]]></name></content>\n", ep->d_name);
				fprintf(file, "  </item>\n");
			} else
			{  
				string newdir = dir + ep->d_name + "/";
				string cdir2 = string("xml/")+ConvertDir(newdir)+".xml";

				if (IsDirectory(startdir+newdir))
				{
					fprintf(file, "  <item id=\"%s\" state=\"open\">\n", cdir2.c_str());
					fprintf(file, "    <content><name><![CDATA[%s]]></name></content>\n", ep->d_name);
					fprintf(file, "  </item>\n");

					ParseDir(newdir); 
				}
			}
		}
		closedir (dp);
	}
	else
	{
		perror ("Couldn't open the directory");
		exit(1);
	}

	fprintf(file, "</root>\n");
	fclose(file);
}


int main()
{
	ParseDir(string(""));
	return 0;
}

