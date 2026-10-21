#ifndef APP_H
#define APP_H
#include "Menu/IMenu.h"
#include "Command/ICommand.h"
#include "Encoding/IEncoding.h"
#include <map>
#include <string>
#include <tuple>
#include <mutex>
class App
{
private:
    IMenu *menu;
    map<string, tuple<ICommand*, bool>> commands;
    mutex* mtx;
    string defaultResponse;
public:
    App(IMenu *menu, map<string, ICommand *> commands, string defaultResponse);
    App(IMenu *menu, map<string, tuple<ICommand*, bool>> commands, mutex* mtx, string defaultResponse);
    void run();
};

#endif // APP_H