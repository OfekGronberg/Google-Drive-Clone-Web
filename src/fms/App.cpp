#include "App.h"
#include <iostream> // for debug

App::App(IMenu *menu, map<string, tuple<ICommand *, bool>> commands, mutex *mtx, string defaultResponse) : menu(menu), commands(commands), mtx(mtx), defaultResponse(defaultResponse) {}
App::App(IMenu *menu, map<string, ICommand *> commands, string defaultResponse) : menu(menu), defaultResponse(defaultResponse)
{
    for (auto &pair : commands)
    {
        this->commands[pair.first] = make_tuple(pair.second, false);
    }
}

void App::run()
{
    while (true)
    {
        std::string line = menu->nextCommand();
        if (!menu->sessionActive())
            return;
        if (line.empty())
        {
            menu->printOutput(defaultResponse);
            continue;
        }
        std::string cmd = line;
        std::string args;

        // Split command and args
        auto pos = line.find(' ');
        if (pos != std::string::npos)
        {
            cmd = line.substr(0, pos);
            args = line.substr(pos + 1);
        }
        string commandLower = "";
        // Make case insensitive
        for (auto c : cmd) 
            commandLower += (char)tolower(c);
        auto it = commands.find(commandLower);
        if (it == commands.end() || get<0>(it->second) == nullptr) // Unknown command → ignore (as assignment says)
        {
            menu->printOutput(defaultResponse);
            continue;
        }
        std::string result;
        // Lock if needed and execute command
        try
        {
            std::unique_lock<std::mutex> lock;
            if (std::get<1>(it->second) && mtx)
            {
                lock = std::unique_lock<std::mutex>(*mtx);
            }

            result = std::get<0>(it->second)->execute(args);
        }
        catch (...)
        {
            // No manual unlock needed; RAII handles it
            menu->printOutput(defaultResponse);
            continue;
        }

        menu->printOutput(result);
    }
}
