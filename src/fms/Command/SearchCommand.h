#ifndef SEARCH_COMMAND_H
#define SEARCH_COMMAND_H
#include <string>
#include "ICommand.h"
#include "../Encoding/IEncoding.h"  
#include "../Validator/IValidator.h"
#include <filesystem>
#include <list>
#include <fstream>
#include <sstream>
using namespace std;

class SearchCommand : public ICommand
{
public:
    SearchCommand(IEncoding &encoder, IValidator &validator);
    std::string execute(const std::string &args) override;

private:
    IEncoding &encoder;
    IValidator &validator;
};

#endif