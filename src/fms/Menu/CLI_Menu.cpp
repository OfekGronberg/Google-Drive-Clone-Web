#include "CLI_Menu.h"
CLI_Menu::CLI_Menu(){}
std::string CLI_Menu::nextCommand()
{
    std::string command = "";
    std::getline(std::cin, command);
    return command;
};
void CLI_Menu::printOutput(std::string input)
{
    if (input != "")
        cout << input << endl;
};
bool CLI_Menu::sessionActive() {
    return true;
}