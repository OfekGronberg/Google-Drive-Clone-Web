#ifndef INETWORK_PROTOCOL_H
#define INETWORK_PROTOCOL_H
#include <string>
using namespace std;

class INetworkProtocol {
public:
    virtual ~INetworkProtocol() = default;
    virtual bool send(string message, int clientSocket) = 0;
    virtual string receive(int socket) = 0;
};
#endif // INETWORK_PROTOCOL_H