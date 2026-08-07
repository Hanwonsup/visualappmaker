# 프로젝트 최상위 CMake 설정입니다.
# 아래 명령으로 모든 활성 모듈을 한 번에 빌드할 수 있습니다.
#   cmake -S . -B build
#   cmake --build build --config Release

cmake_minimum_required(VERSION 3.16)
project(VisualAppMakerModules LANGUAGES CXX)

# 필요한 모듈만 선택적으로 빌드할 수 있는 옵션입니다.
option(BUILD_WEBCAM_CAPTURE "OpenCV 기반 웹캠 획득 모듈을 빌드합니다" ON)
option(BUILD_IMAGE_COMPOSER "이미지 합성 처리 모듈을 빌드합니다" ON)

# 웹캠 모듈은 OpenCV의 카메라 및 이미지 변환 기능이 필요합니다.
if(BUILD_WEBCAM_CAPTURE)
  find_package(OpenCV QUIET COMPONENTS core imgproc videoio)

  if(OpenCV_FOUND)
    add_subdirectory(runtime_module/imageacquisition/webcam)
  else()
    message(WARNING "OpenCV를 찾지 못해 WebcamCapture 모듈은 건너뜁니다. Linux: libopencv-dev, Windows: OpenCV 설치 후 CMAKE_PREFIX_PATH를 지정하세요.")
  endif()
endif()

# 이미지 합성 모듈은 표준 C++만 사용하므로 추가 의존성 없이 빌드합니다.
if(BUILD_IMAGE_COMPOSER)
  add_subdirectory(runtime_module/imageprocessing/imagecomposer)
endif()
