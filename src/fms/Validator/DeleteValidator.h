#ifndef DELETE_VALIDATOR_H
#define DELETE_VALIDATOR_H
#include "IValidator.h"

class DeleteValidator : public IValidator
{
public:
    DeleteValidator();
    list<string> *validate(const std::string &args) override;
};

#endif
