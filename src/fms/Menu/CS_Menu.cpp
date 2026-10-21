#include "CS_Menu.h"
CS_Menu::CS_Menu(int clientSock, INetworkProtocol* protocol) : clientSocket(clientSock), protocol(protocol) {};


std::string CS_Menu::nextCommand() {
    try {
        return protocol->receive(clientSocket);
    }
    catch (...) {
        active = false;
        return "";
    }
};

void CS_Menu::printOutput(std::string output) {
    if (output.empty())
        return;
    active = protocol->send(output, clientSocket);
};

bool CS_Menu::sessionActive() {
    return active;
}