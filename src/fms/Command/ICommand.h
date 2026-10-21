#include <string>
#ifndef ICOMMAND_H
#define ICOMMAND_H
class ICommand
{
public:
    virtual ~ICommand() = default;
    virtual std::string execute(const std::string &args) = 0;
};

#endif
