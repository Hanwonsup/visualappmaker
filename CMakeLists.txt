cmake_minimum_required(VERSION 3.16)
project(VisualAppMakerModules LANGUAGES CXX)

option(BUILD_WEBCAM_CAPTURE "OpenCV 기반 웹캠 획득 모듈을 빌드합니다" ON)
option(BUILD_IMAGE_COMPOSER "이미지 합성 처리 모듈을 빌드합니다" ON)

if(BUILD_WEBCAM_CAPTURE)
  find_package(OpenCV QUIET COMPONENTS core imgproc videoio)
  if(OpenCV_FOUND)
    add_subdirectory(runtime_module/imageacquisition/webcam)
  else()
    message(WARNING "OpenCV를 찾지 못해 WebcamCapture 모듈은 건너뜁니다. Linux: libopencv-dev, Windows: OpenCV 설치 후 CMAKE_PREFIX_PATH를 지정하세요.")
  endif()
endif()

if(BUILD_IMAGE_COMPOSER)
  add_subdirectory(runtime_module/imageprocessing/imagecomposer)
endif()
