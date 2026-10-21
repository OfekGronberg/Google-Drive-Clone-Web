#include <gtest/gtest.h>
#include <fstream>
#include <cstdio>
#include <cstdlib>

#include "../src/fms/Command/DeleteCommand.h"
#include "../src/fms/Command/PostCommand.h"

using namespace std;

// Short cut to the files directory
static string buildFullPath(const string &fileName)
{
    const char *base = std::getenv("FILES_DIR");
    if (!base)
        throw std::runtime_error("FILES_DIR environment variable is not set");
    return string(base) + "/" + fileName;
}

class FakeValidValidator : public IValidator
{
public:
    std::list<std::string>* validate(const std::string &args) override
    {
        // Always return an empty list to simulate "valid input"
        return new std::list<std::string>();
    }
};
class FakeInvalidValidator : public IValidator
{
public:
    std::list<std::string>* validate(const std::string &args) override
    {
        std::list<std::string>* errors = new std::list<std::string>();
        errors->push_back("error");   // one item = invalid
        return errors;
    }
};
class FakeEncoding : public IEncoding
{
public:
    string encode(std::string input) override
    {
        return "Fake_Encoded " + input;
    }
    string decode(std::string input) override
    {
        return "Fake_Decoded " + input;
    }
    bool contains(std::string pool, std::string key) override
    {
        return pool.find(key) != std::string::npos;
    }
};
// Shortcut function so i wont have to type this at every test.
static void removeFileIfExists(const string& fileName) {
    string path = buildFullPath(fileName);
    remove(path.c_str());
}

TEST(DeleteCommand, DeletesTheProperFile) {
    FakeValidValidator val;
    FakeEncoding enc;

    string fileNameToDelete = "toDelete.txt";
    string file1 = "stay.txt";

    removeFileIfExists(file1);
    removeFileIfExists(fileNameToDelete);

    PostCommand add(enc, val);
    add.execute(fileNameToDelete + " blabla");
    add.execute(file1 + " ABCDEFG");

    DeleteCommand del(enc, val);
    string result = del.execute(fileNameToDelete);

    EXPECT_EQ("204 No Content\n", result);

    ifstream deletedFile(buildFullPath(fileNameToDelete));
    EXPECT_FALSE(deletedFile.good());

    ifstream otherFile(buildFullPath(file1));
    EXPECT_TRUE(otherFile.good());  
}
TEST(DeleteCommand, DeleteMissingFile) {
    FakeValidValidator val;
    FakeEncoding enc;

    string missingFile = "iDoNotExist.txt";

    // Make sure it really doesnt exist
    removeFileIfExists(missingFile);

    DeleteCommand del(enc, val);
    string result = del.execute(missingFile);

    EXPECT_EQ("404 Not Found\n", result);
}
TEST(DeleteCommand, InvalidArgsDoNotDeleteFile) {
    FakeInvalidValidator val;   // always "invalid"
    FakeEncoding enc;

    string fileName = "fileShouldStay.txt";
    removeFileIfExists(fileName);

    // Create a file that must not be deleted
    {
        ofstream f(buildFullPath(fileName));
        f << "keep me\n";
    }

    DeleteCommand del(enc, val);
    string result = del.execute("bad args");  // content doesn't matter, validator always fails

    EXPECT_EQ("400 Bad Request\n", result);

    ifstream f(buildFullPath(fileName));
    EXPECT_TRUE(f.good());
}


