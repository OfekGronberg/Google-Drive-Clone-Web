#include <gtest/gtest.h>
#include "../src/fms/Encoding/RLE_Encoding.h"

TEST(RLE_Encoding, EncodeTest) {
    RLE_Encoding rle;
    EXPECT_EQ(rle.encode(""), "");
    EXPECT_EQ(rle.encode("a"), "1a");
    EXPECT_EQ(rle.encode("aababb"), "2a1b1a2b");
    EXPECT_EQ(rle.encode("aaaaaaaaaaaabbbbbbbbbbbbb"), "9a3a9b4b");
    EXPECT_EQ(rle.encode("abcdefghijklmnopqrstuvwxyz"), "1a1b1c1d1e1f1g1h1i1j1k1l1m1n1o1p1q1r1s1t1u1v1w1x1y1z");
    EXPECT_EQ(rle.encode("."), "1.");
    EXPECT_EQ(rle.encode("12 45"), "11121 1415");
    EXPECT_EQ(rle.encode(".\\/ 4aBB"), "1.1\\1/1 141a2B");

    }

TEST(RLE_Encoding, DecodeTest) {
    RLE_Encoding rle;
    EXPECT_EQ(rle.decode(""), "");
    EXPECT_EQ(rle.decode("1a"), "a");
    EXPECT_EQ(rle.decode("2a1b1a2b"), "aababb");
    EXPECT_EQ(rle.decode("9a3a9b4b"), "aaaaaaaaaaaabbbbbbbbbbbbb");
    EXPECT_EQ(rle.decode("1a1b1c1d1e1f1g1h1i1j1k1l1m1n1o1p1q1r1s1t1u1v1w1x1y1z"), "abcdefghijklmnopqrstuvwxyz");
    EXPECT_EQ(rle.decode("1."), ".");
    EXPECT_EQ(rle.decode("11121 1415"), "12 45");
    EXPECT_EQ(rle.decode("1.1\\1/1 141a2B"), ".\\/ 4aBB");
}

TEST(RLE_Encoding, ContainsTest) {
    RLE_Encoding rle;
    EXPECT_TRUE(rle.contains(rle.encode(""), ""));
    EXPECT_TRUE(rle.contains(rle.encode("aaabbbccc"), ""));
    EXPECT_TRUE(rle.contains(rle.encode("aaabbbccc"), "c"));
    EXPECT_TRUE(rle.contains(rle.encode("aaabbbccc"), "ccc"));
    EXPECT_TRUE(rle.contains(rle.encode("aaabbbccc"), "bccc"));
    EXPECT_TRUE(rle.contains(rle.encode("aaabbbccc"), "a"));
    EXPECT_TRUE(rle.contains(rle.encode("aaabbbccc"), "aaab"));
    EXPECT_TRUE(rle.contains(rle.encode("aaabbbccc"), "abbbc"));
    EXPECT_TRUE(rle.contains(rle.encode("aaaaaaaaaab"), "aab"));
    EXPECT_TRUE(rle.contains(rle.encode("bbbbccc"), "bbbc"));
    EXPECT_TRUE(rle.contains(rle.encode("./765tyA"), "./7"));
    EXPECT_TRUE(rle.contains(rle.encode("./765tyA"), "tyA"));
    EXPECT_TRUE(rle.contains(rle.encode("./765tyA"), "./765tyA"));
    EXPECT_FALSE(rle.contains(rle.encode("aaabbbccc"), "aaaa"));
    EXPECT_FALSE(rle.contains(rle.encode("aaabbbccc"), "abc"));
    EXPECT_FALSE(rle.contains(rle.encode("aaabbbccc"), "cccc"));
    EXPECT_FALSE(rle.contains(rle.encode("aaabbbccc"), "bbbb"));
    EXPECT_FALSE(rle.contains(rle.encode("aba"), "aa"));
    EXPECT_FALSE(rle.contains(rle.encode(""), "a"));
    EXPECT_FALSE(rle.contains(rle.encode("43"), "1111"));

}