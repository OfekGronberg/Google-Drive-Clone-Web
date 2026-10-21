#ifndef POST_COMMAND_H
#define POST_COMMAND_H
#include <list>
#include <string>
#include <fstream>
#include <cstdlib>
#include <sstream>
#include "ICommand.h"
#include "../Validator/IValidator.h"
#include "../Encoding/IEncoding.h"

class PostCommand : public ICommand
{
private:
    IEncoding &encoder;
    IValidator &validator;

public:
    PostCommand(IEncoding &encoder, IValidator &validator);
    std::string execute(const std::string &args) override;
};

#endif // POST_COMMAND_H