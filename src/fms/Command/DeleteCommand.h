#ifndef DELETE_COMMAND_H
#define DELETE_COMMAND_H

#include <list>
#include <string>
#include <fstream>
#include <cstdlib>
#include <sstream>
#include "ICommand.h"
#include "../Validator/IValidator.h"
#include "../Encoding/IEncoding.h"

class DeleteCommand : public ICommand
{
private:
    IEncoding &encoder;
    IValidator &validator;

public:
    DeleteCommand(IEncoding &encoder, IValidator &validator);
    std::string execute(const std::string &args) override;
};

#endif

