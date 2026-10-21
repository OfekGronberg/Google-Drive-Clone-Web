#ifndef CLIENT_H
#define CLIENT_H

#include <string>
#include "../MLP_NetworkProtocol.h"

class Client {
public:
    Client(INetworkProtocol* protocol); 
    ~Client();

    void connectToServer(const std::string& address, int port);

    bool sendMessage(const std::string& msg);

    std::string receiveMessage();

private:
//socket file descriptor- tpc
    int mySocket;
    INetworkProtocol* protocol; 

};

#endif // CLIENT_H