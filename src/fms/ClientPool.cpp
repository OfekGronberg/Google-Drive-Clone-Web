#include "ClientPool.h"
ClientPool::ClientPool(size_t workerCount, size_t maxQueue, Handler handler)
    : maxQueue_(maxQueue), handler_(std::move(handler)), stop_(false)
{
    workers_.reserve(workerCount);
    for (size_t i = 0; i < workerCount; ++i)
    {
        workers_.emplace_back([this]()
                              { workerLoop(); });
    }
}

// returns false if queue is full or pool stopping
bool ClientPool::tryEnqueue(int clientSock)
{
    std::unique_lock<std::mutex> lock(mtx_);
    if (stop_)
        return false;
    if (queue_.size() >= maxQueue_)
        return false;

    queue_.push(clientSock);
    cv_.notify_one();
    return true;
}

void ClientPool::shutdown()
{
    {
        std::unique_lock<std::mutex> lock(mtx_);
        stop_ = true;
    }
    cv_.notify_all();

    for (auto &t : workers_)
    {
        if (t.joinable())
            t.join();
    }

    // Close any leftover sockets in the queue
    while (!queue_.empty())
    {
        ::close(queue_.front());
        queue_.pop();
    }
}

ClientPool::~ClientPool()
{
    shutdown();
}

void ClientPool::workerLoop()
{
    while (true)
    {
        int sock = -1;

        {
            std::unique_lock<std::mutex> lock(mtx_);
            cv_.wait(lock, [&]
                     { return stop_ || !queue_.empty(); });

            if (stop_ && queue_.empty())
                return;

            sock = queue_.front();
            queue_.pop();
        }

        // Handle outside the queue lock
        try
        {
            handler_(sock);
        }
        catch (...)
        {
            // swallow exceptions (or log)
        }
    }
}