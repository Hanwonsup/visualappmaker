#include <cstdint>
#include <cstring>

// Linux webcam source module example.
// This compact example creates a deterministic built-in test frame so the module
// can be compiled without OpenCV or hardware-specific SDKs. In a production
// industrial camera module, replace FillWebcamFrameRGBA with SDK capture code
// (for example V4L2, GigE Vision, or the vendor's C/C++ SDK).

extern "C" __attribute__((visibility("default")))
int FillWebcamFrameRGBA(std::uint8_t* output, int width, int height, int stride_bytes) {
    if (!output || width <= 0 || height <= 0 || stride_bytes < width * 4) return -1;

    for (int y = 0; y < height; ++y) {
        std::uint8_t* row = output + y * stride_bytes;
        for (int x = 0; x < width; ++x) {
            const int offset = x * 4;
            row[offset] = static_cast<std::uint8_t>((x * 255) / width);          // R
            row[offset + 1] = static_cast<std::uint8_t>((y * 255) / height);     // G
            row[offset + 2] = 92;                                                 // B
            row[offset + 3] = 255;                                                // A
        }
    }
    return 0;
}

extern "C" __attribute__((visibility("default")))
const char* GetWebcamModuleInfo() {
    return "Webcam capture source module; replace the sample frame with V4L2 or industrial camera SDK capture.";
}

// Build on Linux:
// g++ -std=c++17 -O2 -fPIC -shared WebcamCapture.cpp -o WebcamCapture.so
