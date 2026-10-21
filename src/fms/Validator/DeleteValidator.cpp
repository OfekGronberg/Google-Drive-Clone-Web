#include "DeleteValidator.h"

DeleteValidator::DeleteValidator() {}
list<string> *DeleteValidator::validate(const std::string &args)
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