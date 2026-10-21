#ifndef GET_VALIDATOR_H
#define GET_VALIDATOR_H
#include "IValidator.h"

class GetValidator : public IValidator
{
public:
    GetValidator();
    list<string> *validate(const std::string &args) override;
};

#endif
