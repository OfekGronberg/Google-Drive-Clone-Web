#include <gtest/gtest.h>
#include "../src/fms/Validator/SearchValidator.h"

TEST(SearchValidator, RejectingInvalidArguments) {
    SearchValidator v = SearchValidator();
    EXPECT_EQ(v.validate(""), nullptr);
}
TEST(SearchValidator, CorrectLegalArgsSeparation) {
    SearchValidator v = SearchValidator();
    EXPECT_EQ(v.validate(" ")->size(), 1);
    EXPECT_EQ(v.validate(" ")->front(), " ");
    EXPECT_EQ(v.validate(" a b c ")->size(), 1);
    EXPECT_EQ(v.validate(" a b c ")->front(), " a b c ");
    EXPECT_EQ(v.validate("  ")->size(), 1);
    EXPECT_EQ(v.validate("  ")->front(), "  ");
    
}