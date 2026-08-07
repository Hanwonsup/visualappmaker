cmake_minimum_required(VERSION 3.16)
project(ImageComposer LANGUAGES CXX)
add_library(ImageComposer SHARED ImageComposer.cpp)
target_compile_features(ImageComposer PRIVATE cxx_std_17)
set_target_properties(ImageComposer PROPERTIES
  OUTPUT_NAME "ImageComposer"
  PREFIX ""
  RUNTIME_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}"
  LIBRARY_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}"
  ARCHIVE_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}"
  RUNTIME_OUTPUT_DIRECTORY_DEBUG "${CMAKE_CURRENT_SOURCE_DIR}"
  RUNTIME_OUTPUT_DIRECTORY_RELEASE "${CMAKE_CURRENT_SOURCE_DIR}"
  RUNTIME_OUTPUT_DIRECTORY_RELWITHDEBINFO "${CMAKE_CURRENT_SOURCE_DIR}"
  RUNTIME_OUTPUT_DIRECTORY_MINSIZEREL "${CMAKE_CURRENT_SOURCE_DIR}"
)

# Visual Studio generators place DLLs in configuration folders by default.
# Copy the completed module beside its JSON manifest so the runtime scanner finds it.
add_custom_command(TARGET ImageComposer POST_BUILD
  COMMAND ${CMAKE_COMMAND} -E copy_if_different
    "$<TARGET_FILE:ImageComposer>"
    "${CMAKE_CURRENT_SOURCE_DIR}/$<TARGET_FILE_NAME:ImageComposer>"
  COMMENT "이미지 합성 모듈을 런타임 폴더로 배치합니다"
)
