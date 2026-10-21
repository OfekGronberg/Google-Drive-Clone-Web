#include <gtest/gtest.h>
#include "../src/fms/Validator/DeleteValidator.h"

TEST(DeleteValidator, RejectingInvalidArguments) {
    DeleteValidator v = DeleteValidator();
    EXPECT_EQ(v.validate(""), nullptr);
    EXPECT_EQ(v.validate(" "), nullptr);
    EXPECT_EQ(v.validate(" filename"), nullptr);
    EXPECT_EQ(v.validate(" file name"), nullptr);
    EXPECT_EQ(v.validate("filename "), nullptr);
}
TEST(DeleteValidator, CorrectLegalArgsSeparation) {
    DeleteValidator v = DeleteValidator();
    EXPECT_EQ(v.validate("abc")->size(), 1);
    EXPECT_EQ(v.validate("abc")->front(), "abc");
    EXPECT_EQ(v.validate(".,-")->size(), 1);
    EXPECT_EQ(v.validate(".,-")->front(), ".,-");
}