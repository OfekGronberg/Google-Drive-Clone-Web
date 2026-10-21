#include "SearchCommand.h"

SearchCommand::SearchCommand(IEncoding &encoder, IValidator &validator)
    : encoder(encoder), validator(validator) {}

string SearchCommand::execute(const string &args)
{
    try {
        std::list<std::string>* parsed = validator.validate(args);
        if (parsed == nullptr) {
            return "400 Bad Request\n";
        }
        delete parsed;

        const char *loc = getenv("FILES_DIR");
        if (!loc)
        {
            return "500 Internal Server Error\n";
        }
        string path = loc;
        string text = args;
        string result;

        // Iterate over every directory entry (file or folder) inside FILES_DIR
        for (const auto &entry : std::filesystem::directory_iterator(path))
        {
            if (!entry.is_regular_file())
                continue;
            string filePath = entry.path().string();
            string fileName = entry.path().filename().string();
            if (fileName.find(text) != string::npos)
            {
                if (!result.empty())
                {
                    result += " ";
                }
                result = result + fileName;
                continue;
            }
            
            ifstream file(filePath);
            if (!file.good())
                continue;

            string encodedContent((istreambuf_iterator<char>(file)), istreambuf_iterator<char>());
            if (encoder.contains(encodedContent, text))
            {
                if (!result.empty())
                {
                    result = result + " ";
                }
                result = result + fileName;
            }
        }
        if (result.empty())
        {
            return "404 Not Found\n";
        }
        return "200 Ok\n\n" + result;        
    }
    catch(...) {
        return "500 Internal Server Error\n";
    }
}
