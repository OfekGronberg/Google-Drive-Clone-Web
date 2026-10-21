// Prevents this header from being included more than once
#ifndef GET_COMMAND_H
#define GET_COMMAND_H

#include <fstream>
#include <sstream>
#include <stdexcept>
#include <string>
#include <list>
#include "ICommand.h"
#include "../Encoding/IEncoding.h"
#include "../Validator/IValidator.h"

// a command that reads an encoded file and returns the decoded content
class GetCommand : public ICommand
{
private:
    // the decoder we send to the class
    IEncoding &decoder;
    IValidator &validator;

public:
    explicit GetCommand(IEncoding &decoder, IValidator &validator);
    std::string execute(const std::string &args) override;
};

#endif // GET_COMMAND_H