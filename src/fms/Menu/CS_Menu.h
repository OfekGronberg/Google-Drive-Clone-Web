#ifndef CS_MENU_H
#define CS_MENU_H

#include <string>
#include <iostream>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include "IMenu.h"
#include "../../INetworkProtocol.h"
#include "../../MLP_NetworkProtocol.h"
using namespace std;

class CS_Menu : public IMenu
{
private:
    int clientSocket;
    bool active = true;
    INetworkProtocol* protocol;
public:
    CS_Menu(int clientSock, INetworkProtocol* protocol);
    std::string nextCommand() override;
    void printOutput(std::string input) override;
    bool sessionActive() override;
};

#endif // CS_MENU_H