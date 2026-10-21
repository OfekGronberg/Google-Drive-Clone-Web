#include "GetValidator.h"

GetValidator::GetValidator() {}
list<string> *GetValidator::validate(const std::string &args)
{
    if (args.empty() || args.find(' ') != std::string::npos)
        return nullptr;
    else
    {
        list<string> *result = new list<string>();
        result->push_back(args);
        return result;
    }
}