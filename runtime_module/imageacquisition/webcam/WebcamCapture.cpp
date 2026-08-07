#include <cstdint>
#include <cstring>
#include <mutex>
#include <string>
#include <vector>

#if defined(_WIN32)
  #define NOMINMAX
  #include <windows.h>
  #include <opencv2/opencv.hpp>
  #define MODULE_EXPORT extern "C" __declspec(dllexport)
#else
  #include <opencv2/opencv.hpp>
  #define MODULE_EXPORT extern "C" __attribute__((visibility("default")))
#endif

namespace {
std::mutex camera_mutex;
cv::VideoCapture camera;
int selected_device = -1;
std::string last_error;

int set_error(const std::string& message) {
  last_error = message;
  return -1;
}

bool open_device_locked(int device_index, int width, int height) {
  if (camera.isOpened() && selected_device == device_index) {
    return true;
  }
  camera.release();
#if defined(_WIN32)
  camera.open(device_index, cv::CAP_DSHOW);
#else
  camera.open(device_index, cv::CAP_V4L2);
#endif
  if (!camera.isOpened()) {
    return false;
  }
  if (width > 0) camera.set(cv::CAP_PROP_FRAME_WIDTH, width);
  if (height > 0) camera.set(cv::CAP_PROP_FRAME_HEIGHT, height);
  selected_device = device_index;
  return true;
}
}

// 장치 번호를 기준으로 카메라가 열리는지 확인합니다.
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

// UI에서 보이는 순번이 아닌 시스템 장치 번호를 반환합니다. 없으면 -1입니다.
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

// 지정한 장치를 열고 RGBA 프레임을 채웁니다. 출력 버퍼는 width * height * 4 이상이어야 합니다.
MODULE_EXPORT int CaptureWebcamFrameRGBA(int device_index, std::uint8_t* output, int width, int height, int stride_bytes) {
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
  cv::Mat rgba;
  if (frame.channels() == 4) cv::cvtColor(frame, rgba, cv::COLOR_BGRA2RGBA);
  else if (frame.channels() == 3) cv::cvtColor(frame, rgba, cv::COLOR_BGR2RGBA);
  else cv::cvtColor(frame, rgba, cv::COLOR_GRAY2RGBA);
  cv::Mat resized;
  if (rgba.cols != width || rgba.rows != height) cv::resize(rgba, resized, cv::Size(width, height));
  else resized = rgba;
  for (int y = 0; y < height; ++y) {
    std::memcpy(output + y * stride_bytes, resized.ptr(y), static_cast<size_t>(width) * 4);
  }
  last_error.clear();
  return 0;
}

MODULE_EXPORT void CloseWebcamDevice() {
  std::lock_guard<std::mutex> lock(camera_mutex);
  camera.release();
  selected_device = -1;
}

MODULE_EXPORT const char* GetWebcamLastError() { return last_error.c_str(); }
MODULE_EXPORT const char* GetWebcamModuleInfo() {
  return "OpenCV VideoCapture 기반의 크로스플랫폼 웹캠 소스 모듈. Linux(V4L2)와 Windows(DirectShow)를 지원합니다.";
}
