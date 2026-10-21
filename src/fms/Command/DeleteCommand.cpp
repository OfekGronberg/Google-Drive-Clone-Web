#include "DeleteCommand.h"

DeleteCommand::DeleteCommand(IEncoding &enc, IValidator &val)
    : encoder(enc), validator(val)
{
}

std::string DeleteCommand::execute(const std::string &args)
{
    try {

        // Validate the arguments
        std::list<std::string>* listargs = validator.validate(args);
        if (listargs == nullptr || listargs->empty() || listargs->size() != 1)
        {
            delete listargs;  // Avoid leak
            return "400 Bad Request\n";
        }
        const char *base = std::getenv("FILES_DIR");
        // We assume base is not null because Docker sets it
        std::string fullPath = std::string(base) + "/" + listargs->front();
        if (std::remove(fullPath.c_str()) == 0)
        {
            // File existed and was deleted
            return "204 No Content\n";
        }
        else
        {
            // File did not exist (or couldn't be removed) → per spec: 404
            return "404 Not Found\n";
        }
    }
    catch(...) {
         return "500 Internal Server Error\n";
    }
}
