#include <string>
#include <iostream>
#include "IMenu.h"
using namespace std;

class CLI_Menu : public IMenu
{
public:
    CLI_Menu();
    std::string nextCommand() override;
    void printOutput(std::string input) override;
    bool sessionActive() override;
};