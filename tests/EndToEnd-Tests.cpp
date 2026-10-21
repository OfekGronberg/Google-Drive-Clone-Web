#include <gtest/gtest.h>
#include "../src/fms/Encoding/RLE_Encoding.h"
#include "../src/fms/Command/PostCommand.h"
#include "../src/fms/Command/GetCommand.h"
#include "../src/fms/Validator/PostValidator.h"
#include "../src/fms/Validator/GetValidator.h"
#include "../src/fms/Command/SearchCommand.h"
#include "../src/fms/Validator/SearchValidator.h"

// The tests assume the files directory is empty at the start
// If not, some tests may expectedly fail
TEST(EndToEnd, RejectingInvalidArguments) {
    map<string, ICommand *> commands;
    IEncoding *rle = new RLE_Encoding();
    IValidator *addValidator = new PostValidator();
    IValidator *getValidator = new GetValidator();
    IValidator *searchValidator = new SearchValidator();
    commands["post"] = new PostCommand(*rle, *addValidator);
    commands["get"] = new GetCommand(*rle, *getValidator);
    commands["search"] = new SearchCommand(*rle, *searchValidator);
    EXPECT_EQ(commands["post"]->execute(""), "400 Bad Request\n");
    EXPECT_EQ(commands["post"]->execute(" "), "400 Bad Request\n");
    EXPECT_EQ(commands["post"]->execute("  "), "400 Bad Request\n");
    EXPECT_EQ(commands["get"]->execute(""), "400 Bad Request\n");
    EXPECT_EQ(commands["get"]->execute(" "), "400 Bad Request\n");
    EXPECT_EQ(commands["search"]->execute(""), "400 Bad Request\n");
}
TEST(EndToEnd, HandlingCorrectArguments) {
    map<string, ICommand *> commands;
    IEncoding *rle = new RLE_Encoding();
    IValidator *addValidator = new PostValidator();
    IValidator *getValidator = new GetValidator();
    IValidator *searchValidator = new SearchValidator();
    commands["post"] = new PostCommand(*rle, *addValidator);
    commands["get"] = new GetCommand(*rle, *getValidator);
    commands["search"] = new SearchCommand(*rle, *searchValidator);
    EXPECT_EQ(commands["post"]->execute("hello"), "201 Created\n");
    EXPECT_EQ(commands["get"]->execute("hello"), "200 Ok\n\n");
    EXPECT_EQ(commands["post"]->execute("hello sth"), "201 Created\n");
    EXPECT_EQ(commands["get"]->execute("hello"), "200 Ok\n\n" "sth");
    EXPECT_EQ(commands["search"]->execute("sth"), "200 Ok\n\nhello");
    EXPECT_EQ(commands["post"]->execute("sth sth"), "201 Created\n");
    string s = commands["search"]->execute("sth");
    EXPECT_TRUE(s == "200 Ok\n\nhello sth" || s == "200 Ok\n\nsth hello");}
