#include "GetCommand.h"

// Builds the full path to a file under FILES_DIR
// FILES_DIR must be defined as an environment variable
static std::string buildFullPath(const std::string &fileName)
{
    const char *base = std::getenv("FILES_DIR");
    if (base == nullptr)
    {
        // No directory was provided
        throw std::runtime_error("FILES_DIR environment variable is not set");
    }
    return std::string(base) + "/" + fileName;
}

GetCommand::GetCommand(IEncoding &decoder, IValidator &validator) : decoder(decoder), validator(validator) {}

// Decode the contents of the file
std::string GetCommand::execute(const std::string &args)
{
    try 
    {
        std::list<std::string>* parsed = validator.validate(args);
        if (parsed == nullptr) {
            return "400 Bad Request\n";
        }
        delete parsed;
        // Resolve the full path and open the file
        std::string path = buildFullPath(args);
        std::ifstream file(path);

        // Make sure the file exist and is readable
        if (!file.is_open())
        {
            return "404 Not Found\n";
        }

        // Load the entire file into memory
        std::stringstream buffer;
        buffer << file.rdbuf();
        std::string encodedContent = buffer.str();

        // Apply decoding and return the result
        std::string decodedContent = decoder.decode(encodedContent);
        return "200 Ok\n\n" + decodedContent;
    }
    catch(...) {
        return "500 Internal Server Error\n";
    }
}
