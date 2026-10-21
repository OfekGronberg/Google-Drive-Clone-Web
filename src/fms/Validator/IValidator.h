
#ifndef IVALIDATOR_H
#define IVALIDATOR_H
#include <string>
#include <list>
using namespace std;

class IValidator
{
public:
    virtual ~IValidator() = default;
    virtual list<string> *validate(const std::string &args) = 0;
};
#endif // IVALIDATOR_H
 