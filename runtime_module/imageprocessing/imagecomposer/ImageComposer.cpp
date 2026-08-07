// Linux shared-library example: accepts two RGBA images of equal dimensions and blends them.
// Place this source at runtime_module/imageprocessing/imagecomposer/.
// Build from this directory:
// g++ -std=c++17 -O2 -fPIC -shared ImageComposer.cpp -o ImageComposer.so
// Keep ImageComposer.so next to ImageComposer.json so the application can discover it.
#include <algorithm>
#include <cstdint>
#define MODULE_API extern "C" __attribute__((visibility("default")))
// inputA/inputB/output are width * height * 4 byte RGBA buffers.
// alpha: 0.0 uses A only, 1.0 uses B only. Returns 0 on success.
MODULE_API int ComposeImagesRGBA(
    const std::uint8_t* inputA,
    const std::uint8_t* inputB,
    std::uint8_t* output,
    int width,
    int height,
    float alpha
) {
    if (!inputA || !inputB || !output || width <= 0 || height <= 0) return -1;
    alpha = std::clamp(alpha, 0.0f, 1.0f);
    const float inverse = 1.0f - alpha;
    const int byteCount = width * height * 4;
    for (int index = 0; index < byteCount; ++index) {
        output[index] = static_cast<std::uint8_t>(
            inputA[index] * inverse + inputB[index] * alpha
        );
    }
    return 0;
}
