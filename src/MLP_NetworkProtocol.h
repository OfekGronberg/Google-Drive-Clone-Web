#ifndef MLP_NETWORK_PROTOCOL_H
#define MLP_NETWORK_PROTOCOL_H
#include <string>
#include "INetworkProtocol.h"
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
using namespace std;

class MLP_NetworkProtocol : public INetworkProtocol {
public:
    MLP_NetworkProtocol();
    bool send(string message, int clientSocket) override;
    string receive(int socket) override;
};
#endif // MLP_NETWORK_PROTOCOL_H