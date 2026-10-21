#include <gtest/gtest.h>
#include <fstream>
#include <cstdio>
#include <cstdlib>
#include <sstream>
#include <stdexcept>
#include <unordered_set>

#include "../src/fms/Command/PostCommand.h"
#include "../src/fms/Command/SearchCommand.h"

using namespace std;

// Fake encoder because we want UnitTests.. we only want to test search and not be depended on encoder implement.
class FakeEncoding : public IEncoding {
public:
    string encode(std::string input) override {
        return "Fake_Encoded " + input;
    }
    string decode(std::string input) override {
        return "Fake_Decoded " + input;
    }
     bool contains(std::string pool, std::string key) override {
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
static string buildFullPath(const string& fileName) {
    const char* base = std::getenv("FILES_DIR");
    if (base == nullptr) {
        throw std::runtime_error("FILES_DIR environment variable is not set");
    }
    return string(base) + "/" + fileName;
}
// Shortcut function so i wont have to type this at every test.
static void removeFileIfExists(const string& fileName) {
    string path = buildFullPath(fileName);
    remove(path.c_str());
}
// This tests checks if there is a single file that matches and checks if it we get it.
TEST(SearchCommand, FindSingleFile) {
    FakeEncoding enc;
    FakeValidator val;
    string File1 = "file1.txt";
    string File2 = "file2.txt";
    removeFileIfExists(File1);
    removeFileIfExists(File2);

    PostCommand add(enc, val);
    add.execute(File1 + " banana");
    add.execute(File2 + " blablabla");

    SearchCommand Search(enc, val);
    string result = Search.execute("banana");

    EXPECT_EQ(result, "200 Ok\n\n" + File1);
}
TEST(SearchCommand, FindMatchingFiles) {
    FakeEncoding enc;
    FakeValidator val;    
    string File1 = "file1.txt";
    string File2 = "file2.txt";
    string File3 = "file3.txt";
    string File4 = "file4.txt";

    removeFileIfExists(File2);
    removeFileIfExists(File3);
    removeFileIfExists(File1);
    removeFileIfExists(File4);

    PostCommand add(enc, val);
    add.execute(File1 + " blue banana");
    add.execute(File2 + " red bananas");
    add.execute(File3 + " green banana12");
    add.execute(File4 + " blue mango");

    SearchCommand search(enc, val);
    string result = search.execute("banana");
    EXPECT_TRUE(result.find("200 Ok\n\n") == 0);
    string body = result.substr(8);
    std::unordered_set<std::string> expected = { File1, File2, File3 };
    std::unordered_set<std::string> actual;

    std::istringstream iss(body);
    std::string token;
    while (iss >> token) {
        actual.insert(token);
    }

EXPECT_EQ(actual, expected);
}
// No files should be in the list.
TEST(SearchCommand, FindNoFiles) {
    FakeEncoding enc;
    FakeValidator val;
    string File1 = "file1.txt";
    string File2 = "file2.txt";
    string File3 = "file3.txt";
    removeFileIfExists(File1);
    removeFileIfExists(File2);
    // Third file is not needed for this test but we will delete it because of previous test.
    removeFileIfExists(File3);

    PostCommand add(enc, val);
    add.execute(File1 + " blublublu");
    add.execute(File2 + " blablabla");

    SearchCommand Search(enc, val);
    string result = Search.execute("banana");
    EXPECT_EQ(result, "404 Not Found\n");
}
TEST(SearchCommand, FindFileByName) {
    FakeEncoding enc;
    FakeValidator val;
    string File1 = "banana.txt";
    string File2 = "notes.txt";
    string File3 = "super_banana.txt";

    removeFileIfExists(File1);
    removeFileIfExists(File2);
    removeFileIfExists(File3);

    PostCommand post(enc, val);
    post.execute(File1 + " nothing interesting");
    post.execute(File2 + " banana");
    post.execute(File3 + " also nothing");

    SearchCommand search(enc, val);
    string result = search.execute("banana");
    EXPECT_TRUE(result.find("200 Ok\n\n") == 0);
    string body = result.substr(8);

    std::unordered_set<std::string> expected = { File1, File2, File3 };
    std::unordered_set<std::string> actual;

    std::istringstream iss(body);
    std::string token;
    while (iss >> token) {
        actual.insert(token);
    }

    EXPECT_EQ(actual, expected);
}

