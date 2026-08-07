// 이미지 합성 C++ 처리 모듈 예제입니다.
// 두 장의 RGBA 이미지를 입력받아 alpha 값에 따라 한 장의 RGBA 이미지로 합성합니다.
// 프로젝트 최상위에서 CMake를 실행하면 Linux에서는 .so, Windows에서는 .dll로 빌드됩니다.

#include <algorithm>
#include <cstdint>

// 공유 라이브러리에서 외부 실행 엔진이 함수를 찾을 수 있도록 내보내기 매크로를 정의합니다.
// Windows/MSVC는 __declspec(dllexport)를, Linux/macOS의 GCC/Clang은 visibility 속성을 사용합니다.
#if defined(_WIN32) || defined(__CYGWIN__)
#define MODULE_API extern "C" __declspec(dllexport)
#else
#define MODULE_API extern "C" __attribute__((visibility("default")))
#endif

/**
 * RGBA 이미지 두 장을 한 장의 결과 이미지로 합성합니다.
 *
 * inputA, inputB, output: 각각 width * height * 4 바이트 크기의 RGBA 버퍼입니다.
 * width, height: 입력과 출력 이미지의 크기입니다.
 * alpha: 0.0이면 A만 사용하고, 1.0이면 B만 사용합니다.
 * 반환값: 성공하면 0, 잘못된 입력이면 -1입니다.
 */
MODULE_API int ComposeImagesRGBA(
    const std::uint8_t* inputA,
    const std::uint8_t* inputB,
    std::uint8_t* output,
    int width,
    int height,
    float alpha
) {
    // 포인터와 이미지 크기를 먼저 검증하여 잘못된 메모리 접근을 막습니다.
    if (!inputA || !inputB || !output || width <= 0 || height <= 0) return -1;

    // 예상 범위를 벗어난 합성 비율도 안전하게 0.0~1.0으로 보정합니다.
    alpha = std::clamp(alpha, 0.0f, 1.0f);
    const float inverse = 1.0f - alpha;
    const int byteCount = width * height * 4;

    // RGBA의 모든 채널을 같은 비율로 섞습니다.
    for (int index = 0; index < byteCount; ++index) {
        output[index] = static_cast<std::uint8_t>(
            inputA[index] * inverse + inputB[index] * alpha
        );
    }

    return 0;
}
