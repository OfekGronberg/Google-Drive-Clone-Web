cmake_minimum_required(VERSION 3.14)
project(my_project)

# GoogleTest requires at least C++17
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include(FetchContent)
FetchContent_Declare(
  googletest
  URL https://github.com/google/googletest/archive/03597a01ee50ed33e9dfd640b249b4be3799d395.zip
)
# For Windows: Prevent overriding the parent project's compiler/linker settings
set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)
FetchContent_MakeAvailable(googletest)
# ---- TEST EXECUTABLE ----
add_executable(runTests tests/PostCommand-Tests.cpp src/fms/Command/PostCommand.cpp
src/fms/Command/SearchCommand.cpp tests/SearchCommand-Tests.cpp
src/fms/Encoding/RLE_Encoding.cpp tests/Encoding-Tests.cpp
src/fms/Validator/PostValidator.cpp tests/PostValidator-Tests.cpp
src/fms/Validator/GetValidator.cpp tests/GetValidator-Tests.cpp
src/fms/Validator/SearchValidator.cpp tests/SearchValidator-Tests.cpp
src/fms/Command/GetCommand.cpp tests/GetCommand-Tests.cpp
src/fms/Validator/DeleteValidator.cpp tests/DeleteValidator-Tests.cpp
src/fms/App.cpp src/fms/Menu/CLI_Menu.cpp src/fms/Menu/CS_Menu.cpp tests/Integration-Tests.cpp
tests/EndToEnd-Tests.cpp src/fms/Matchmaker.cpp src/fms/ClientPool.cpp
src/MLP_NetworkProtocol.cpp
src/fms/Command/DeleteCommand.cpp tests/DeleteCommand-Tests.cpp)

target_link_libraries(runTests GTest::gtest_main pthread)

# ---- MAIN ASSIGNMENT EXECUTABLE ----
add_executable(main
    src/fms/Main.cpp
    src/fms/App.cpp
    src/fms/Menu/CLI_Menu.cpp
    src/fms/Menu/CS_Menu.cpp
    src/fms/Command/PostCommand.cpp
    src/fms/Command/GetCommand.cpp
    src/fms/Command/SearchCommand.cpp
    src/fms/Encoding/RLE_Encoding.cpp
    src/fms/Validator/PostValidator.cpp
    src/fms/Validator/GetValidator.cpp
    src/fms/Validator/DeleteValidator.cpp
    src/fms/Command/DeleteCommand.cpp
    src/fms/Validator/SearchValidator.cpp
    src/fms/Matchmaker.cpp
    src/fms/ClientPool.cpp
    src/MLP_NetworkProtocol.cpp
)

add_executable(clientcpp
    src/client/client.cpp
    src/MLP_NetworkProtocol.cpp
)

target_link_libraries(main pthread)