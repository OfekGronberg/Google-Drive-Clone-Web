#include <gtest/gtest.h>
#include <fstream>
#include <cstdio>
#include <cstdlib>
#include <stdexcept> // Provides standard exception types like std::runtime_error
#include <filesystem> // For std::filesystem::create_directory

#include "../src/fms/Command/GetCommand.h"

// A fake encoder for testing (to only test GetCommand and not the encoder)
class FakeEncodingGetCommand : public IEncoding {
public:
    string encode(std::string input) override {
        return "Fake_Encoded_" + input;
    }
    string decode(std::string input) override {
    // In our fake scenario, we assume the "Fake_Encoded_" prefix must be removed
    if (input.rfind("Fake_Encoded_", 0) == 0) {
        return input.substr(13); // "Fake_Encoded_" is 13 characters long
    }
    // If the input isn't prefixed (which shouldn't happen if encoded by this class 
    // in the test context), we return the input as is
    return input;
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
// Helper function: Get FILES_DIR from the environment variable and build the full path
static string buildFullPathGetCommand(const string& fileName) {
    const char* base = std::getenv("FILES_DIR");
    // If this fails, something is wrong with Docker / the environment setup
    if (base == nullptr) {
        throw std::runtime_error("FILES_DIR environment variable is not set");
    }
    std::filesystem::create_directory(base); // Create the directory if it doesn't exist
    return string(base) + "/" + fileName;
}
// Using a test fixture to reduce code duplication
class GetCommandTest : public ::testing::Test {
protected:
    FakeEncodingGetCommand enc;
    FakeValidator val;
    GetCommand getCmd{enc, val}; // Initialize GetCommand with the fake encoder

    // You can add SetUp() and TearDown() methods if more complex setup/cleanup is needed
};
// Sanity tests using the fixture
TEST_F(GetCommandTest, ValidFile) {
    string fileName = "getTest.txt";
    string path = buildFullPathGetCommand(fileName);
    string fileContent = "abbccc";

    // Clear any previous test file
    // Using remove in a test fixture's TearDown() is often a good practice,
    // but for simplicity, we'll keep it here.
    remove(path.c_str()); 

    // Create a file with encoded content
    ofstream outFile(path, ofstream::trunc); // Open the file for writing and erase any existing content
    ASSERT_TRUE(outFile.is_open()); // Verify that the file was successfully opened for writing
    outFile << enc.encode(fileContent); // Write the encoded content to the file
    outFile.close();

    // Use GetCommand to read and decode
    string result = getCmd.execute(fileName);       

    // Check if the decoded text matches original
    EXPECT_EQ(result, "200 Ok\n\n" + fileContent);

    // Clean up the created file
    remove(path.c_str());
}

// Boundary tests
// reading an empty file
TEST_F(GetCommandTest, EmptyFile) {
    string fileName = "getEmptyBoundaryTest.txt";
    string path = buildFullPathGetCommand(fileName);

    // Create an empty file
    ofstream outFile(path, ofstream::trunc); // Open the file for writing and erase any existing content
    ASSERT_TRUE(outFile.is_open()); // Verify that the file was successfully opened for writing
    outFile.close();

    // Use GetCommand to read the empty file
    string result = getCmd.execute(fileName);

    // Verify that the result is an empty string
    EXPECT_EQ(result, "200 Ok\n\n");

    // Clean up the created file
    remove(path.c_str());
}

// Negative tests
// Attempting to read a file that does not exist
TEST_F(GetCommandTest, NonExistentFile) {
    string fileName = "nonExistentFile.txt";
    string path = buildFullPathGetCommand(fileName);

    // Make sure the file does NOT exist before running the test
    remove(path.c_str());

    // Expect that executing the command on a non-existent file throws std::runtime_error
    std::string result = getCmd.execute(fileName);
    EXPECT_EQ(result, "404 Not Found\n");
}
