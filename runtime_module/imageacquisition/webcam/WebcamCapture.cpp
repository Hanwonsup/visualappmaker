// OpenCV VideoCapture를 사용해 여러 운영체제에서 웹캠 프레임을 얻는 시작 모듈입니다.
// Linux에서는 V4L2, Windows에서는 DirectShow 백엔드를 우선 사용합니다.

#include <cstdint>
#include <cstring>
#include <mutex>
#include <string>
#include <vector>

#if defined(_WIN32)
  // Windows 헤더의 min/max 매크로가 C++ 표준 라이브러리와 충돌하지 않도록 막습니다.
  #define NOMINMAX
  #include <windows.h>
  #include <opencv2/opencv.hpp>
  #define MODULE_EXPORT extern "C" __declspec(dllexport)
#else
  #include <opencv2/opencv.hpp>
  #define MODULE_EXPORT extern "C" __attribute__((visibility("default")))
#endif

namespace {
// 카메라는 한 번에 하나의 스레드만 열고 읽도록 보호합니다.
std::mutex camera_mutex;
cv::VideoCapture camera;
int selected_device = -1;
std::string last_error;

// 호출자에게 -1을 반환하면서 마지막 오류 설명도 함께 보관합니다.
int set_error(const std::string& message) {
  last_error = message;
  return -1;
}

/**
 * 선택한 카메라 장치를 열고 해상도를 요청합니다.
 * 이미 같은 장치가 열려 있다면 다시 열지 않고 그대로 재사용합니다.
 */
bool open_device_locked(int device_index, int width, int height) {
  if (camera.isOpened() && selected_device == device_index) {
    return true;
  }

  // 다른 카메라를 선택한 경우 기존 장치를 정리한 뒤 새 장치를 엽니다.
  camera.release();

#if defined(_WIN32)
  camera.open(device_index, cv::CAP_DSHOW);
#else
  camera.open(device_index, cv::CAP_V4L2);
#endif

  if (!camera.isOpened()) {
    return false;
  }

  // 카메라가 지원하는 범위에서 요청한 프레임 크기를 적용합니다.
  if (width > 0) camera.set(cv::CAP_PROP_FRAME_WIDTH, width);
  if (height > 0) camera.set(cv::CAP_PROP_FRAME_HEIGHT, height);

  selected_device = device_index;
  return true;
}
} // namespace

/**
 * 사용 가능한 카메라의 개수를 대략적으로 확인합니다.
 * max_devices_to_scan 값만큼 장치 번호를 순차적으로 열어 보고, 열린 장치만 셉니다.
 */
MODULE_EXPORT int GetWebcamDeviceCount(int max_devices_to_scan) {
  std::lock_guard<std::mutex> lock(camera_mutex);
  const int limit = max_devices_to_scan > 0 ? max_devices_to_scan : 10;
  int count = 0;

  for (int index = 0; index < limit; ++index) {
    cv::VideoCapture probe;
#if defined(_WIN32)
    probe.open(index, cv::CAP_DSHOW);
#else
    probe.open(index, cv::CAP_V4L2);
#endif
    if (probe.isOpened()) {
      ++count;
      probe.release();
    }
  }

  return count;
}

/**
 * UI에 표시하는 n번째 카메라의 실제 시스템 장치 번호를 반환합니다.
 * 장치 번호가 연속적이지 않은 환경에서도 선택 목록을 만들 수 있게 합니다.
 */
MODULE_EXPORT int GetWebcamDeviceIndex(int ordinal, int max_devices_to_scan) {
  std::lock_guard<std::mutex> lock(camera_mutex);
  const int limit = max_devices_to_scan > 0 ? max_devices_to_scan : 10;
  int found = 0;

  for (int index = 0; index < limit; ++index) {
    cv::VideoCapture probe;
#if defined(_WIN32)
    probe.open(index, cv::CAP_DSHOW);
#else
    probe.open(index, cv::CAP_V4L2);
#endif
    if (!probe.isOpened()) continue;

    probe.release();
    if (found++ == ordinal) return index;
  }

  return -1;
}

/**
 * 지정한 카메라에서 한 프레임을 읽어 RGBA 버퍼로 복사합니다.
 * output 버퍼는 최소 width * height * 4 바이트, stride_bytes는 width * 4 이상이어야 합니다.
 */
MODULE_EXPORT int CaptureWebcamFrameRGBA(
  int device_index,
  std::uint8_t* output,
  int width,
  int height,
  int stride_bytes
) {
  // 호출자가 제공한 출력 메모리 규격을 먼저 검증합니다.
  if (!output || width <= 0 || height <= 0 || stride_bytes < width * 4) {
    return set_error("출력 RGBA 버퍼의 크기 또는 형식이 올바르지 않습니다.");
  }

  std::lock_guard<std::mutex> lock(camera_mutex);
  if (!open_device_locked(device_index, width, height)) {
    return set_error("선택한 카메라 장치를 열 수 없습니다.");
  }

  cv::Mat frame;
  if (!camera.read(frame) || frame.empty()) {
    return set_error("카메라에서 프레임을 읽지 못했습니다.");
  }

  // OpenCV의 BGR/BGRA/Gray 프레임을 런타임에서 통일해 사용할 RGBA 형식으로 변환합니다.
  cv::Mat rgba;
  if (frame.channels() == 4) cv::cvtColor(frame, rgba, cv::COLOR_BGRA2RGBA);
  else if (frame.channels() == 3) cv::cvtColor(frame, rgba, cv::COLOR_BGR2RGBA);
  else cv::cvtColor(frame, rgba, cv::COLOR_GRAY2RGBA);

  // 실제 카메라 해상도와 요청 크기가 다르면 결과를 리사이즈합니다.
  cv::Mat resized;
  if (rgba.cols != width || rgba.rows != height) {
    cv::resize(rgba, resized, cv::Size(width, height));
  } else {
    resized = rgba;
  }

  // 출력 버퍼의 행 간격(stride)에 맞춰 한 줄씩 안전하게 복사합니다.
  for (int y = 0; y < height; ++y) {
    std::memcpy(output + y * stride_bytes, resized.ptr(y), static_cast<size_t>(width) * 4);
  }

  last_error.clear();
  return 0;
}

// 현재 열려 있는 카메라 장치를 명시적으로 해제합니다.
MODULE_EXPORT void CloseWebcamDevice() {
  std::lock_guard<std::mutex> lock(camera_mutex);
  camera.release();
  selected_device = -1;
}

// 마지막 실패 원인을 호출자가 확인할 수 있도록 문자열 포인터를 제공합니다.
MODULE_EXPORT const char* GetWebcamLastError() {
  return last_error.c_str();
}

// 모듈 기능을 사람이 읽을 수 있는 설명으로 제공합니다.
MODULE_EXPORT const char* GetWebcamModuleInfo() {
  return "OpenCV VideoCapture 기반의 크로스플랫폼 웹캠 소스 모듈. Linux(V4L2)와 Windows(DirectShow)를 지원합니다.";
}
