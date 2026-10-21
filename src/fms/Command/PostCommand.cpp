#include "PostCommand.h"
using namespace std;


// Constructor
PostCommand::PostCommand(IEncoding &encoder, IValidator &validator)
    : encoder(encoder), validator(validator)
{
}

bool fileExists(const std::string& filename) {
    std::ifstream file(filename);
    bool result = file.is_open();
    file.close();
    return result;
}

string PostCommand::execute(const string &args)
{
    try
    {
        std::list<std::string>* parsed = validator.validate(args);
        if (parsed == nullptr) {
            return "400 Bad Request\n";
        }
        string fileName = parsed->front();
        string text = parsed->back();
        const char *DIR = getenv("FILES_DIR");
        if (!DIR)
        {
            return "500 Internal Server Error\n";
        }
        // Building the full path woth the file name itself.
        string fullPath = string(DIR) + "/" + fileName;
        if (fileExists(fullPath)) {
            return "409 Conflict\n";
        }
        string encodedText = encoder.encode(text);
        ofstream fileOutput(fullPath);
        if (!fileOutput.good())
        {
            return "500 Internal Server Error\n";
        }
        fileOutput << encodedText;
        fileOutput.close();
        return "201 Created\n";
    }
    catch(...)
    {
        return "500 Internal Server Error\n"; 
    }
    
    
}