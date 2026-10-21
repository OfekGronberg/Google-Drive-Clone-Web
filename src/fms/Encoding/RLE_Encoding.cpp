#include "RLE_Encoding.h"

// **All the class functions assume correct input format**
RLE_Encoding::RLE_Encoding() {}
list<int> RLE_Encoding::findIndexes(std::string pool, std::string key)
{
    list<int> result;
    size_t pos;
    int offset = 0;
    do
    {
        pos = pool.find(key);
        if (pos != string::npos)
        {
            result.push_back(pos + offset);
            offset += pos + 1;
            pool = pool.substr(pos + 1);
        }
    } while (pos != string::npos);
    return result;
}
list<int> RLE_Encoding::filterEvenOut(list<int> indexes)
{
    list<int> result;
    for (int index : indexes)
    {
        if (index % 2 == 1)
            result.push_back(index);
    }
    return result;
}
std::string RLE_Encoding::encode(std::string input)
{

    char currentChar = input[0];
    unsigned int n = 0;
    std::string output = "";
    for (unsigned int i = 0; i < input.length(); i++)
    {
        if (input[i] == currentChar && n < 9)
            n++;
        else
        {
            output += std::to_string(n) + currentChar;
            currentChar = input[i];
            n = 1;
        }
    }
    if (n != 0)
        output += std::to_string(n) + currentChar;
    return output;
}
std::string RLE_Encoding::decode(std::string input)
{
    std::string output = "";
    for (int i = 0; i < input.length(); i += 2)
        output += std::string(input[i] - '0', input[i + 1]);
    return output;
}
bool RLE_Encoding::contains(string pool, string key)
{
    if (key.empty())
        return true;
    key = encode(key);
    if (key.length() == 2)
    {
        list<int> indexes = findIndexes(pool, key.substr(1, 1));
        indexes = filterEvenOut(indexes);
        for (int index : indexes)
        {
            if (pool[index - 1] - '0' >= key[0] - '0')
                return true;
        }
        return false;
    }
    // if encoded key length > 3
    string lesserkey = key.substr(1, key.length() - 3);
    list<int> indexes = findIndexes(pool, lesserkey);
    indexes = filterEvenOut(indexes);
    for (int index : indexes)
    {
        if (index + key.length() - 2 >= pool.length())
            continue;
        char lastCharOfKey = key[key.length() - 1];
        int lastCharIndexInPool = index + key.length() - 2;
        int appearencesOfLastCharInKey = key[key.length() - 2] - '0';
        if (pool[lastCharIndexInPool] == lastCharOfKey &&
            pool[lastCharIndexInPool - 1] - '0' >= appearencesOfLastCharInKey)
        {
            if (pool[index - 1] >= key[0]) // Check first char
                return true;
            if (index > 1 && pool[index - 2] == key[1]) // Check first char continuation
                return true;
        }
    }
    return false;
};