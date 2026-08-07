cmake_minimum_required(VERSION 3.16)
project(WebcamCapture LANGUAGES CXX)
find_package(OpenCV REQUIRED COMPONENTS core imgproc videoio)
add_library(WebcamCapture SHARED WebcamCapture.cpp)
target_compile_features(WebcamCapture PRIVATE cxx_std_17)
target_link_libraries(WebcamCapture PRIVATE ${OpenCV_LIBS})
target_include_directories(WebcamCapture PRIVATE ${OpenCV_INCLUDE_DIRS})
set_target_properties(WebcamCapture PROPERTIES
  OUTPUT_NAME "WebcamCapture"
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
add_custom_command(TARGET WebcamCapture POST_BUILD
  COMMAND ${CMAKE_COMMAND} -E copy_if_different
    "$<TARGET_FILE:WebcamCapture>"
    "${CMAKE_CURRENT_SOURCE_DIR}/$<TARGET_FILE_NAME:WebcamCapture>"
  COMMENT "웹캠 모듈을 런타임 폴더로 배치합니다"
)
