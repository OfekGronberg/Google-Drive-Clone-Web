#include <iostream>
#include <cstdlib>
#include "App.h"
#include "Menu/CS_Menu.h"
#include "Encoding/RLE_Encoding.h"
#include "Command/PostCommand.h"
#include "Command/GetCommand.h"
#include "Validator/PostValidator.h"
#include "Validator/GetValidator.h"
#include "Command/SearchCommand.h"
#include "Validator/SearchValidator.h"
#include "Matchmaker.h"

int main(int argc, char* argv[])
{
    if (argc != 2) {
        std::cerr << "Usage: ./main <port>\n";
        return 1;
    }

    int port = std::stoi(argv[1]);

    Matchmaker m("0.0.0.0", port);
    m.run();
}