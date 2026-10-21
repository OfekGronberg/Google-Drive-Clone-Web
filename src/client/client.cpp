#include "client.h"
#include <iostream>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <string.h>
#include <string>

// constructor start with an invalid socket,and recive protocol
Client::Client(INetworkProtocol* protocol)
    : mySocket(-1), protocol(protocol)
{
}

// destructor -close the socket if its still open
Client::~Client() {
    if (mySocket >= 0) {close(mySocket);}
}


void Client::connectToServer(const std::string& address, int port) {
    //create TCP socket 
    mySocket = socket(AF_INET, SOCK_STREAM, 0);
    if( mySocket < 0) {return;}

    sockaddr_in sin{};
    // ipv4
    sin.sin_family = AF_INET;   
    //convert string IP to binary                 
    sin.sin_addr.s_addr = inet_addr(address.c_str()); 
    //convert port to network byte 
    sin.sin_port = htons(port);                 

    // try connect to server.if failed close the socket and mark it invalid
    if (connect(mySocket, reinterpret_cast<sockaddr*>(&sin), sizeof(sin)) < 0) {
        close(mySocket);
        mySocket = -1;
    }
}

bool Client::sendMessage(const std::string& message) {
    // If the socket is not connected, do nothing
    if(mySocket< 0){return false;}
 //Sends the message to the server using the protocol handler
    return protocol->send(message, mySocket);
}

std::string Client::receiveMessage() {
    if (mySocket < 0) {return "";}

    try {
        // use the protocol interface to read a message
         return protocol->receive(mySocket);
    } catch(int eror) {
        //protocol throw 10053 if connection closed or broken
        if ( eror == 10053 ) {
            mySocket = -1;      
             return "";
        }
         return "";
    }
}

int main(int argc, char* argv[]) {
    //make sure recive ip and port 
    if (argc != 3) {
        return 1;
    }

    //argv1 = IP address from command line
    std::string ip = argv[1];
    //save port argument as integer
    int port =std::stoi(argv[2]);

    MLP_NetworkProtocol protocol;
    Client c(&protocol);
    c.connectToServer(ip, port);

    std::string cmd;

    //read command from user, send to server, receive server response
    // and print answer to console
    while (true) {
        std::getline(std::cin, cmd);
        c.sendMessage(cmd);
        std::string ans = c.receiveMessage();
        std::cout << ans << std::endl;
    }

    return 0;
}