#include "PostValidator.h"

PostValidator::PostValidator() {}
list<string> *PostValidator::validate(const std::string &args)
{
    if (args.empty() || args[0] == ' ')
        return nullptr;
    size_t firstSpace = args.find(' ');
    list<string> *result = new list<string>();
    if (firstSpace == std::string::npos)
    {
        result->push_back(args);
        result->push_back("");
        return result;
    }
    else
    {
        result->push_back(args.substr(0, firstSpace));
        result->push_back(args.substr(firstSpace + 1));
        return result;
    }
}