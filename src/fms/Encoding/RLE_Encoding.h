#ifndef RLE_ENCODING_H
#define RLE_ENCODING_H

#include "IEncoding.h"
#include <string>
#include <list>

class RLE_Encoding : public IEncoding
{
public:
    RLE_Encoding();
    std::string encode(std::string input) override;
    std::string decode(std::string input) override;
    bool contains(std::string pool, std::string key) override;

private:
    std::list<int> findIndexes(std::string pool, std::string key);
    std::list<int> filterEvenOut(std::list<int> indexes);
};

#endif // RLE_ENCODING_H
