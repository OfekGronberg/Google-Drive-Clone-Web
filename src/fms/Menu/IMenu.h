#ifndef IMenu_H // Unique identifier, typically based on the header file name
#define IMenu_H
#include <string>
using namespace std;

class IMenu {
public:
    virtual ~IMenu() = default;
    virtual std::string nextCommand() = 0;
    virtual void printOutput(std::string input) = 0;
    virtual bool sessionActive() = 0;
};
#endif // IMenu_H