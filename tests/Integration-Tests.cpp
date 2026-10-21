#include <gtest/gtest.h>
#include <sstream>
#include <iostream>
#include <fstream>
#include <filesystem>
#include <cstdlib>
#include <string>
#include <map>

#include "../src/fms/App.h"
#include "../src/fms/Menu/CLI_Menu.h"
#include "../src/fms/Command/ICommand.h"
#include "../src/fms/Command/PostCommand.h"
#include "../src/fms/Validator/PostValidator.h"
#include "../src/fms/Encoding/RLE_Encoding.h"
#include "../src/fms/Command/GetCommand.h"
#include "../src/fms/Validator/GetValidator.h"
#include "../src/fms/Command/SearchCommand.h"
#include "../src/fms/Validator/SearchValidator.h"



using namespace std;

//  command used in the sanity test
class TestCommand : public ICommand {
public:
    string lastArgs;
    string execute(const string& args) override {
        lastArgs = args;
        return "OK_" + args;
    }
};

// quiet command records the args and returns "" so App print nothing 
class SilentCommand : public ICommand {
public:
    string lastArgs;
    string execute(const string& args) override {
        lastArgs = args;
        return "";  
    }
};
// command that always throw exception
class ThrowingCommand : public ICommand {
public:
    string lastArgs;
    string execute(const string& args) override {
        lastArgs = args;
        throw runtime_error("boom" );
    }
};

// TEST #1 app and menu test - sanity


TEST(AppCliMenuIntegration, sanity)
{
    // cmd into cin so the menu read as next command
    stringstream in("cmd");
    stringstream out;

    //redirect cin cout to our test stream
    auto* oldIn  = cin.rdbuf(in.rdbuf());
    auto* oldOut = cout.rdbuf(out.rdbuf());

    //set up the menu
    CLI_Menu menu;
    TestCommand cmd;

    // register command under cmd
    map<string, ICommand*> cmds;
    cmds["cmd"] = &cmd;

    // build the app
    App app(&menu, cmds, "");

    //read command from the input 
    string task = menu.nextCommand();

    //separate command from args
    string args;
    auto pos = task.find(' ');
    if (pos != string::npos) {
        args = task.substr(pos + 1 );
        task = task.substr(0, pos);
    }
    // execute command and menu print
    string result = cmds[task]->execute(args);
    menu.printOutput(result);
    // restore cin cout
    cin.rdbuf (oldIn);
    cout.rdbuf(oldOut);

    //command dont receivearguments
    EXPECT_EQ( cmd.lastArgs, "");
    // should output OK   
    EXPECT_EQ(out.str(), "OK_\n");    
}


// TEST #2 app and menu command with empty output
TEST(AppCliMenuIntegration, NoOutput)
{
    // "silent" into cin so menu reads 
    stringstream in("silent");
    stringstream out;
    // redirect cin and cout so we control i/o
    auto* oldIn  = cin.rdbuf( in.rdbuf());
    auto* oldOut = cout.rdbuf( out.rdbuf());

    // set up menu and command that return empty result
    CLI_Menu menu;
    SilentCommand cmd;

    // the silent command
    map<string, ICommand*> cmds;
    cmds["silent"] = &cmd;

    // create the App
    App app(&menu, cmds, "");

    // read command from menu 
    string task = menu.nextCommand();

    // split to command and args
    string args;
    auto pos = task.find(' ');
    if (pos != string::npos) {
        args = task.substr(pos +1);
        task = task.substr( 0, pos);
    }
    //execute command and let menu try print result  
    string result = cmds[task]->execute(args);
    menu.printOutput(result);
    // restore cin cout
    cin.rdbuf(oldIn);
    cout.rdbuf( oldOut);

    // lastArgs should stay empty
    EXPECT_EQ(cmd.lastArgs, "");      
    // nothing printed
    EXPECT_EQ(out.str(), "");         
}

// TEST #3 - app amd menu error throwing command 

TEST (AppCliMenuIntegration,CommandThrow )
{
    // boom next command to menu
    stringstream in("boom");
    stringstream out;
    // redirect cin/cout to our stringstreams
    auto* oldIn  =cin.rdbuf( in.rdbuf());
    auto* oldOut =cout.rdbuf( out.rdbuf());

    // set up menu and command that throw
    CLI_Menu menu;
    ThrowingCommand cmd;

     // command name "boom"
    map<string, ICommand*> cmds;
    cmds["boom"] = &cmd;

     // build app with the menu and the command map
    App app(&menu, cmds, "");
    //read the command string from the menu "boom"
    string task =menu.nextCommand();

     // separate command from args
    string args;
    auto pos = task.find(' ');
    if (pos != string::npos) {
        args =task.substr(pos + 1);
        task = task.substr(0, pos);
    }

    // Try executing command- it throws and we catch 
    try {
        string result = cmds[task]->execute(args);
        menu.printOutput(result);
    } catch (...) {
        // Ignore all exceptions        
    }

    // Restore cin/cout
    cin.rdbuf(oldIn );
    cout.rdbuf(oldOut);
    //no valid args so lastArgs is empty
    EXPECT_EQ(cmd.lastArgs, "");  
    // exception thrown no output 
    EXPECT_EQ(out.str(), "");     
}


// ADD CLASS INTEGRATION TESTS

// set FILES_DIR environment variable so app know where to read and write 
static void setFilesDirEnv( const std::string& dir) {
#ifdef _WIN32
// Windows version
    _putenv_s("FILES_DIR", dir.c_str());
#else
// Linux / macOS version
    setenv( "FILES_DIR", dir.c_str(), 1);
#endif
}


//clears FILES_DIR env var when testing error case
static void unsetFilesDirEnv() {
#ifdef _WIN32
    _putenv_s("FILES_DIR", "");
#else
    unsetenv( "FILES_DIR" );
#endif
}

// build full path to file by combining FILES_DIR + file name
static std::string buildFullPath(const std::string& fileName) {
    // if FILES_DIR not set app cant continue
    const char* base = std::getenv( "FILES_DIR");
    if (base == nullptr) {
        throw std::runtime_error( "FILES_DIR environment variable is not set");
    }
    // append file name to the directory
    return std::string(base) + "/" + fileName;
}


TEST(PostCommand_Integration, ValidArgs) {
    // create a test folder
    std::string baseDir = "test_files_add";
    std::filesystem::create_directories(baseDir);
    setFilesDirEnv(baseDir );

    // Set up
    RLE_Encoding encoder;
    PostValidator validator;
    PostCommand addCmd(encoder, validator);

    // file name and the text 
    std::string fileName = "add_ok.txt";
    std::string text     = "hello world with spaces";
    // build the argument string 
    std::string args     = fileName + " " + text;

    // Make sure file dont exist before the test
    std::string path = buildFullPath(fileName);
    std::remove(path.c_str()); 

    // run
    std::string result = addCmd.execute( args);
    // check file was created
    std::ifstream in( path );
    ASSERT_TRUE(in.is_open()) << "File was not created by PostCommand";

    //read the file content
    std::string fileData;
    std::getline( in, fileData);
    in.close();

    // compare the file content
    std::string expectedEncoded = encoder.encode( text);
    EXPECT_EQ(fileData, expectedEncoded);

    //return empty string for success
    EXPECT_EQ(result, "201 Created\n" );
}


TEST(PostCommand_Integration,InvalidArgs) {
    std::string baseDir = "test_files_add";
    std::filesystem::create_directories(baseDir);
    setFilesDirEnv(baseDir);
     // set up
    RLE_Encoding encoder;
    PostValidator validator;
    PostCommand addCmd(encoder, validator);

    // Invalid input
    std::string badArgs= "";


     //make suree directory is empty
    for (const auto& entry : std::filesystem::directory_iterator(baseDir)) {
        std::filesystem::remove( entry.path());
    }

    // run
    std::string result= addCmd.execute( badArgs);

    //invalid input returns empty string
    EXPECT_EQ(result, "400 Bad Request\n");

    int fileCount = 0;
    for (const auto& entry : std::filesystem::directory_iterator(baseDir)) {
        ++fileCount;
    }
    // 0 files created
    EXPECT_EQ( fileCount , 0); 
}

// GET CLASS INTEGRETION TESTS 



TEST(GetCommand_Integration, ValidFile) {
    // create a dedicated test folder
    std::string baseDir = "test_files_get";
    std::filesystem::create_directories( baseDir);
    setFilesDirEnv( baseDir);

    // Set up
    RLE_Encoding encoder;     
    GetValidator validator;
    GetCommand getCmd( encoder, validator);

    // file we read and the original text we encode
    std::string fileName = "get_ok.txt" ;
    std::string originalText ="abbccc";

    // encode the text 
    std::string encoded = encoder.encode(originalText);
    std::string path = buildFullPath(fileName);

    // make sure file is clean
    std::remove(path.c_str());

     //create file and write encoded data 
    std::ofstream out(path);
    ASSERT_TRUE(out.is_open())<< "Failed to create test file for GetCommand";
    out << encoded;
    out.close();

    // run
    std::string result =getCmd.execute(fileName);

    //return original decoded text
    EXPECT_EQ(result, "200 Ok\n\nabbccc" );
}


TEST(GetCommand_Integration, InvalidArgs_GetCommnad) {
     // create a test directory 
    std::string baseDir = "test_files_get";
    std::filesystem::create_directories(baseDir);
    setFilesDirEnv(baseDir);

    RLE_Encoding encoder;
    GetValidator validator;
    GetCommand getCmd(encoder, validator);

    // invalid input
    std::string badArgs = "";   

    // run
    std::string result = getCmd.execute(badArgs );

    // return for invalid input
    EXPECT_EQ(result, "400 Bad Request\n" );
}

// SEARCH CLASS INTEGRETION TESTS
TEST(SearchCommand_Integration, FindMatchingFile) {
    // create test directory to not mix files 
    string baseDir= "test_files_search";
    std::filesystem::create_directories(baseDir);
    setFilesDirEnv(baseDir );

    // Basic setup
    RLE_Encoding encoder;
    SearchValidator validator;
    SearchCommand searchCmd(encoder, validator);

    //the text we search for
    string text= "abc";
    // Create encoded content
    string encoded = encoder.encode(text);
    // file 1 contains text
    string f1 = buildFullPath("file1.txt");
    ofstream(f1) << encoded;
    // file 2 also contain
    string f2 = buildFullPath("file2.txt");
    ofstream(f2) << encoded;

    // file 3 not contain
    string f3 = buildFullPath("file3.txt");
    ofstream(f3)<< encoder.encode("zzz");
     //run search with the text
    string result = searchCmd.execute(text);

    //check that the files appear in the result
    EXPECT_NE(result.find("file1.txt"),string::npos);
    EXPECT_NE(result.find("file2.txt"), string::npos);
    // file3 dont appear 
    EXPECT_EQ( result.find("file3.txt"), string::npos);
}


TEST(SearchCommand_Integration, InvalidArgs_SearchCommand) {
    //create test folder to not mix real files
    string baseDir ="test_files_search";
    std::filesystem::create_directories(baseDir);

    // make the app to use this test 
    setFilesDirEnv(baseDir);
     // encoder and validator used by the command
    RLE_Encoding encoder;
    SearchValidator validator;
    SearchCommand searchCmd(encoder, validator);

    //invalid input
    string badArgs= "";  
    string result = searchCmd.execute(badArgs);
    EXPECT_EQ(result,"400 Bad Request\n");
}




