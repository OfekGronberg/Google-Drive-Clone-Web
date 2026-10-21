#ifndef IENCODING_H
#define IENCODING_H
#include <string>
using namespace std;

class IEncoding
{
public:
    virtual ~IEncoding() = default;
    virtual std::string encode(std::string input) = 0;
    virtual std::string decode(std::string input) = 0;
    virtual bool contains(std::string pool, std::string key) = 0;
};

#endif
