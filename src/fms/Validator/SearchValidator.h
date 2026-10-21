#ifndef SEARCHVALIDATOR_H
#define SEARCHVALIDATOR_H
#include "IValidator.h"
class SearchValidator : public IValidator
{
public:
    SearchValidator();
    list<string> *validate(const std::string &args) override;
};
#endif // SEARCHVALIDATOR_H