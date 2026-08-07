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
)
