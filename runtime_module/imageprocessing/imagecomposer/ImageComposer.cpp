// Cross-platform shared-library example: accepts two RGBA images of equal dimensions and blends them.
// Build the whole project from the repository root with CMake.
// Linux exports a .so file and Windows exports a .dll file.
#include <algorithm>
#include <cstdint>

// Windows/MSVC uses __declspec(dllexport); GCC/Clang use visibility attributes.
#if defined(_WIN32) || defined(__CYGWIN__)
#define MODULE_API extern "C" __declspec(dllexport)
#else
#define MODULE_API extern "C" __attribute__((visibility("default")))
#endif
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
