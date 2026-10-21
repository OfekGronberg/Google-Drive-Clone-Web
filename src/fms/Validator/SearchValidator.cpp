#include "SearchValidator.h"

SearchValidator::SearchValidator() {}
list<string> *SearchValidator::validate(const std::string &args)
{
    if (args.empty())
        return nullptr;
    list<string> *result = new list<string>();
    result->push_back(args);
    return result;
}