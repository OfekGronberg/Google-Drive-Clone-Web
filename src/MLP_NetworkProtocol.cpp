#include "MLP_NetworkProtocol.h"
MLP_NetworkProtocol::MLP_NetworkProtocol(){}
bool MLP_NetworkProtocol::send(string message, int clientSocket) {
    std::string packet = std::to_string(message.size()) + " " + message;
    const char* data = packet.data();
    int left  = static_cast<int>(packet.size());
    int total = 0;
    while (left > 0) {
        int sent = ::send(clientSocket, data + total, left, 0);
        if (sent <= 0) {
            return false;

        }
        total += sent;
        left  -= sent;
    }
    return true;
}
string MLP_NetworkProtocol::receive(int clientSocket) {
    string buffer;
    string len = ""; 
    buffer.resize(1);
    do {
        ssize_t received = ::recv(clientSocket, &buffer[0], 1, 0);
        if (received == 0) {
            // Connection closed cleanly
            throw 10053;
            return "";
        }
        len += buffer;
    }
    while (isdigit(buffer.back()));
    len = len.substr(0, len.size() - 1); // Remove the space
    buffer.resize(static_cast<size_t>(std::stoi(len)));
    int left = stoi(len);
    int offset = 0;
    while (left > 0) {
        ssize_t received = ::recv(clientSocket, &buffer[0] + offset, left, 0);
        if (received == 0 || received < 0) {
            throw 10053;
            return "";
        }
        offset += received;
        left   -= received;
    }
    return buffer;
}