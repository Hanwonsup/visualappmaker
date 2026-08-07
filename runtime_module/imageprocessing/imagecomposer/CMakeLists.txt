# 이미지 합성 처리 모듈을 공유 라이브러리로 만드는 설정입니다.
# Windows에서는 ImageComposer.dll, Linux에서는 ImageComposer.so가 생성됩니다.

cmake_minimum_required(VERSION 3.16)
project(ImageComposer LANGUAGES CXX)

add_library(ImageComposer SHARED ImageComposer.cpp)
target_compile_features(ImageComposer PRIVATE cxx_std_17)

# 빌드 결과물을 JSON 설명 파일과 같은 모듈 폴더에 배치합니다.
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

# Visual Studio의 구성별 출력 폴더에서도 최종 DLL을 모듈 폴더로 복사합니다.
# 이 위치에 있어야 웹 앱의 자동 검색 API가 DLL과 JSON 설명 파일을 함께 읽습니다.
add_custom_command(TARGET ImageComposer POST_BUILD
  COMMAND ${CMAKE_COMMAND} -E copy_if_different
    "$<TARGET_FILE:ImageComposer>"
    "${CMAKE_CURRENT_SOURCE_DIR}/$<TARGET_FILE_NAME:ImageComposer>"
  COMMENT "이미지 합성 모듈을 런타임 폴더로 배치합니다"
)
