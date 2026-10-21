
#ifndef POST_VALIDATOR_H
#define POST_VALIDATOR_H
#include "IValidator.h"
#include <list>
class PostValidator : public IValidator
{
public:
    PostValidator();
    list<string> *validate(const std::string &args) override;
};

#endif