#include <gtest/gtest.h>
#include "../src/fms/Validator/PostValidator.h"

TEST(PostValidator, RejectingInvalidArguments) {
    PostValidator v = PostValidator();
    EXPECT_EQ(v.validate(""), nullptr);
    EXPECT_EQ(v.validate(" "), nullptr);
    EXPECT_EQ(v.validate(" content"), nullptr);
    EXPECT_EQ(v.validate(" content content con"), nullptr);
    EXPECT_EQ(v.validate("  "), nullptr);
}
TEST(PostValidator, HandlingMissingArguments) {
    PostValidator v = PostValidator();
    EXPECT_EQ(v.validate("f")->size(), 2);
    EXPECT_EQ(v.validate("f")->front(), "f");
    EXPECT_EQ(v.validate("f")->back(), "");
    EXPECT_EQ(v.validate("f  ")->size(), 2);
    EXPECT_EQ(v.validate("f  ")->front(), "f");
    EXPECT_EQ(v.validate("f  ")->back(), " ");
    
}
TEST(PostValidator, CorrectLegalArgsSeparation) {
    PostValidator v = PostValidator();
    EXPECT_EQ(v.validate("f abc")->size(), 2);
    EXPECT_EQ(v.validate("f abc")->front(), "f");
    EXPECT_EQ(v.validate("f abc")->back(), "abc");
    EXPECT_EQ(v.validate("f a b c")->size(), 2);
    EXPECT_EQ(v.validate("f a b c")->front(), "f");
    EXPECT_EQ(v.validate("f a b c")->back(), "a b c");
    EXPECT_EQ(v.validate("f  a b c ")->size(), 2);
    EXPECT_EQ(v.validate("f  a b c ")->front(), "f");
    EXPECT_EQ(v.validate("f  a b c ")->back(), " a b c ");
}