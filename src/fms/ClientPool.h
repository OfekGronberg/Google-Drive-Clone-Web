#include <vector>
#include <functional>
#include <queue>
#include <thread>
#include <mutex>
#include <condition_variable>
#include <atomic>
#include <iostream>
using namespace std;
#include <unistd.h> // close()

class ClientPool {
public:
    using Handler = std::function<void(int)>;
    ClientPool(size_t workerCount, size_t maxQueue, Handler handler);
    bool tryEnqueue(int clientSock);
    void shutdown();
    ~ClientPool();

private:
    void workerLoop();
    size_t maxQueue_;
    Handler handler_;
    std::vector<std::thread> workers_;
    std::queue<int> queue_;
    std::mutex mtx_;
    std::condition_variable cv_;
    bool stop_;
};