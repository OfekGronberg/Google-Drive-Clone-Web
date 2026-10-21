#include "Matchmaker.h"

Matchmaker::Matchmaker(string ip, int port) : ip(ip), port(port) {}

int createServerSocket(string ip, int port)
{
    int serverSock = ::socket(AF_INET, SOCK_STREAM, 0);
    if (serverSock < 0)
    {
        return -1;
    }
    int opt = 1;
    setsockopt(serverSock, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));
    sockaddr_in addr{};
    addr.sin_family = AF_INET;
    if (inet_pton(AF_INET, ip.c_str(), &addr.sin_addr) != 1)
    {
        ::close(serverSock);
        return -1;
    }
    addr.sin_port = htons(port);
    if (::bind(serverSock, (sockaddr *)&addr, sizeof(addr)) < 0)
    {
        ::close(serverSock);
        return -1;
    }
    if (::listen(serverSock, SOMAXCONN) < 0)
    {
        ::close(serverSock);
        return -1;
    }
    return serverSock;
}

void Matchmaker::run()
{
    // Make a common mutex for all threads
    static mutex mtx;
    int serverSock = createServerSocket(ip, port);
    if (serverSock < 0)
        return;
    auto handleClient = [&](int clientSock) {
        map<string, tuple<ICommand *, bool>> commands;
        IEncoding *rle = new RLE_Encoding();
        INetworkProtocol *protocol = new MLP_NetworkProtocol();
        IValidator *postValidator = new PostValidator();
        IValidator *getValidator = new GetValidator();
        IValidator *searchValidator = new SearchValidator();
        IValidator *deleteValidator = new DeleteValidator();
        ICommand *postCmd = new PostCommand(*rle, *postValidator);
        ICommand *getCmd = new GetCommand(*rle, *getValidator);
        ICommand *searchCmd = new SearchCommand(*rle, *searchValidator);
        ICommand *deleteCmd = new DeleteCommand(*rle, *deleteValidator);
        commands["post"] = make_tuple(postCmd, true);
        commands["get"] = make_tuple(getCmd, false);
        commands["search"] = make_tuple(searchCmd, false);
        commands["delete"] = make_tuple(deleteCmd, true);
        IMenu *menu = new CS_Menu(clientSock, protocol);
        App *app = new App(menu, commands, &mtx, "400 Bad Request\n");

        try {
            app->run();
        } catch (...) {/* ignore */}
        ::close(clientSock);
        delete app;
        delete menu;
        delete postCmd;
        delete getCmd;
        delete searchCmd;
        delete postValidator;
        delete getValidator;
        delete searchValidator;
        delete deleteCmd;
        delete deleteValidator;
        delete protocol;
        delete rle;
    };

    const size_t WORKERS = 5;
    const size_t MAX_QUEUE = 5; // backpressure limit
    ClientPool pool(WORKERS, MAX_QUEUE, handleClient);
    while (true)
    {
        int clientSock = ::accept(serverSock, nullptr, nullptr);
        if (clientSock < 0) continue;
        // If pool is overloaded, reject quickly
        if (!pool.tryEnqueue(clientSock)) {
            ::close(clientSock);
        }
    }

    // If it ever breaks out of the loop:
    pool.shutdown();
    ::close(serverSock);
}
