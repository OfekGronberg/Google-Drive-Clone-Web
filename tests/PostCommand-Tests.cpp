#include <gtest/gtest.h>
#include <fstream>
#include <cstdio>
#include <cstdlib>

#include "../src/fms/Command/PostCommand.h"

using namespace std;

// A simple fake encoder for testing (we only want to test PostCommand here and not the encoder...)
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
class FakeValidator : public IValidator
{
public:
    std::list<std::string>* validate(const std::string &args) override
    {
        // Always return an empty list to simulate "valid input"
        return new std::list<std::string>();
    }
};
// Helper: get FILES_DIR from env and build full path
static string buildFullPath(const string &fileName)
{
    const char *base = std::getenv("FILES_DIR");
    // If this fails, something is wrong with Docker / environment
    if (base == nullptr)
    {
        throw std::runtime_error("FILES_DIR environment variable is not set");
    }
    return string(base) + "/" + fileName;
}
// Test checking if PostCommand created a new file
TEST(PostCommand, EncodesToFile)
{
    FakeEncoding enc;
    FakeValidator val;
    string fileName = "firstTest.txt";
    string path = buildFullPath(fileName);
    // Removing the file if he exists from the previous test
    remove(path.c_str());
    PostCommand cmd(enc, val);
    string result = cmd.execute(fileName + " hello");
    EXPECT_EQ("201 Created\n", result);
    ifstream file(path);
    ASSERT_TRUE(file.good());
    file.close();
}
// This test makes sure the text argument we get in
// Add command is empty still creates file
TEST(PostCommand, HandleEmptyText)
{
    FakeEncoding enc;
    FakeValidator val;
    string fileName = "secondTest.txt";
    string path = buildFullPath(fileName);
    remove(path.c_str());
    PostCommand cmd(enc, val);
    string result = cmd.execute(fileName);
    EXPECT_EQ("201 Created\n", result);
    ifstream file(path);
    ASSERT_TRUE(file.good());

    string content;
    getline(file, content);
    EXPECT_EQ(content, "Fake_Encoded ");

    file.close();
}
// Checks if the text is being in the file is identical to the text we got from the encoder.
TEST(PostCommand, TextContent)
{
    FakeEncoding enc;
    FakeValidator val;
    string fileName = "thirdTest.txt";
    string path = buildFullPath(fileName);
    remove(path.c_str());
    PostCommand cmd(enc, val);
    string result = cmd.execute(fileName + " ABCDEFG");
    EXPECT_EQ("201 Created\n", result);
    ifstream file(path);
    ASSERT_TRUE(file.good());

    string content;
    getline(file, content);
    // The fake encoder just returns Fake_Encoded msg with the input.
    // We do it this way to ensure this is proper Unittest for PostCommand.
    EXPECT_EQ(content, "Fake_Encoded ABCDEFG");

    file.close();
}
