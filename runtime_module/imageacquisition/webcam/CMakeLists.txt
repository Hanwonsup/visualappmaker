# OpenCV 기반 웹캠 획득 공유 라이브러리를 만드는 설정입니다.
# Windows에서는 WebcamCapture.dll, Linux에서는 WebcamCapture.so가 생성됩니다.

cmake_minimum_required(VERSION 3.16)
project(WebcamCapture LANGUAGES CXX)

# 최상위 CMake에서 이미 찾았더라도, 이 모듈만 단독 빌드할 때를 위해 다시 확인합니다.
find_package(OpenCV REQUIRED COMPONENTS core imgproc videoio)

add_library(WebcamCapture SHARED WebcamCapture.cpp)
target_compile_features(WebcamCapture PRIVATE cxx_std_17)
target_link_libraries(WebcamCapture PRIVATE ${OpenCV_LIBS})
target_include_directories(WebcamCapture PRIVATE ${OpenCV_INCLUDE_DIRS})

# 라이브러리 결과물을 JSON 설명 파일이 있는 런타임 모듈 폴더에 직접 배치합니다.
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

# Visual Studio는 DLL을 Release 같은 구성별 폴더에 둘 수 있습니다.
# 빌드가 끝난 뒤 JSON 옆으로 한 번 더 복사해 앱의 자동 감지기가 항상 찾을 수 있게 합니다.
add_custom_command(TARGET WebcamCapture POST_BUILD
  COMMAND ${CMAKE_COMMAND} -E copy_if_different
    "$<TARGET_FILE:WebcamCapture>"
    "${CMAKE_CURRENT_SOURCE_DIR}/$<TARGET_FILE_NAME:WebcamCapture>"
  COMMENT "웹캠 모듈을 런타임 폴더로 배치합니다"
)
