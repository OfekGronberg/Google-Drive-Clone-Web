#ifndef MATCHMAKER_H
#define MATCHMAKER_H
#include "App.h"
#include "ClientPool.h"
#include "Menu/CS_Menu.h"
#include "Encoding/RLE_Encoding.h"
#include "Command/PostCommand.h"
#include "Command/GetCommand.h"
#include "Validator/PostValidator.h"
#include "Validator/GetValidator.h"
#include "Command/SearchCommand.h"
#include "Validator/SearchValidator.h"
#include "Command/DeleteCommand.h"
#include "Validator/DeleteValidator.h"
#include "../INetworkProtocol.h"
#include "../MLP_NetworkProtocol.h"
#include <thread>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <map>
#include <tuple>
class Matchmaker
{
private:
    string ip;
    int port;
public:
    Matchmaker(string ip, int port);
    void run();
};

#endif // MATCHMAKER_H
