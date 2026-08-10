# 모두의 AI 실험실 바이브코딩 — 프로젝트 스킬 가이드

이 문서는 이 프로젝트를 수정·확장할 때 반복 설명 없이 일관된 방식으로 작업하기 위한 기준입니다.

## 1. 프로젝트 목적

이 프로젝트는 센서 데이터, 2D 이미지, 3D 깊이 데이터 등의 흐름을 **비주얼 노드 기반으로 조합**하는 멀티플랫폼 개발 프레임워크입니다.

사용자는 다음 과정을 화면에서 구성합니다.

1. 입력 또는 시작(Source) 모듈을 작업 공간에 추가합니다.
2. C++ 네이티브 처리 모듈을 연결합니다.
3. 웹 기반 출력 모듈에 이미지·숫자·텍스트·3D 데이터를 표시합니다.
4. 프로젝트 구조와 설정을 SQLite에 저장하고 다시 복원합니다.

기본 예시는 카메라 이미지 → 사람 인식 → 인식 이미지 및 사람 수 출력 흐름입니다.

---

## 2. 기술 구성

- 프런트엔드: React + TypeScript + Vite
- 백엔드: Python FastAPI
- 데이터베이스: SQLite (`/workspace/data/app.db`)
- 네이티브 모듈: C++ + CMake
- 지원 네이티브 라이브러리 확장자
  - Linux: `.so`
  - Windows: `.dll`
  - macOS: `.dylib`

프런트엔드는 백엔드 API를 호출할 때 반드시 `src/lib/api.ts`의 `api()` 도우미를 사용합니다. `/api/...` 절대 주소를 직접 호출하지 않습니다.

---

## 3. 네이티브 모듈 폴더 규칙

모든 C++ 런타임 모듈은 아래 구조를 사용합니다.

```text
runtime_module/
  <category>/
    <module-name>/
      CMakeLists.txt
      <LibraryName>.cpp
      <LibraryName>.json
      <LibraryName>.so | <LibraryName>.dll | <LibraryName>.dylib
```

현재 예시:

```text
runtime_module/
  imageacquisition/
    webcam/
      WebcamCapture.cpp
      WebcamCapture.json
      CMakeLists.txt
  imageprocessing/
    imagecomposer/
      ImageComposer.cpp
      ImageComposer.json
      CMakeLists.txt
```

- `category`: 기능 분류입니다. 예: `imageacquisition`, `imageprocessing`, `analytics`
- `module-name`: 소문자 모듈 식별자입니다. 예: `webcam`, `imagecomposer`
- 컴파일 결과 라이브러리는 JSON 파일과 같은 모듈 폴더에 배치합니다.
- Git에는 소스·CMake·JSON만 포함하고, `.so`, `.dll`, `.dylib` 산출물은 포함하지 않습니다.

---

## 4. 모듈 JSON 매니페스트 규칙

라이브러리와 같은 이름의 JSON 파일에 화면 표시 정보와 입출력 규격을 정의합니다.

```json
{
  "kind": "process",
  "label": "이미지 합성기",
  "icon": "◫",
  "subtitle": "입력 이미지 2개 · 합성 이미지 1개",
  "entryPoint": "ComposeImagesRGBA",
  "inputs": 2,
  "inputTypes": ["Image", "Image"],
  "outputs": 1,
  "outputTypes": ["Image"]
}
```

### `kind`

- `source`: 입력이 없는 시작 모듈입니다. 카메라·센서·파일 리더 등 데이터 생성 모듈에 사용합니다.
- `process`: 입력을 받아 처리하는 네이티브 모듈입니다.

입력이 `0`개인 모듈은 `kind`가 생략되어도 시작 모듈로 취급할 수 있으나, 명시적으로 `source`를 권장합니다.

### 지원 데이터 타입

각 입력·출력 포트에는 아래 타입을 지정할 수 있습니다.

- 기본형: `Image`, `Number`, `Text`
- 배열형: `Image[]`, `Number[]`, `Text[]`

`inputTypes`와 `outputTypes`의 순서는 포트 번호 순서입니다. 예를 들어 입력 2개 모듈은 아래처럼 정의합니다.

```json
"inputs": 2,
"inputTypes": ["Image", "Image"]
```

노드 캔버스는 **출력 타입과 대상 입력 타입이 정확히 같을 때만** 연결을 허용합니다. 배열형은 기본형과 호환되지 않습니다. 예: `Image` → `Image[]` 연결 불가.

---

## 5. C++ 모듈 작성 기준

### 플랫폼별 심볼 내보내기

Windows와 Linux에서 모두 호출 가능한 라이브러리를 만들 때는 다음과 같이 내보내기 매크로를 사용합니다.

```cpp
#if defined(_WIN32)
#define MODULE_API extern "C" __declspec(dllexport)
#else
#define MODULE_API extern "C" __attribute__((visibility("default")))
#endif
```

함수 선언 예시:

```cpp
MODULE_API int ProcessFrame(/* 입력과 출력 인자 */) {
  // 처리 결과를 반환합니다.
  return 0;
}
```

- `extern "C"`는 함수 이름 변형을 막아 런타임 로더가 진입 함수를 찾게 합니다.
- Windows에서는 `__declspec(dllexport)`를 사용합니다.
- Linux/macOS에서는 `visibility("default")`를 사용합니다.

### 이미지 합성 예시 규격

`ImageComposer`는 RGBA 이미지 2개를 받아 1개 RGBA 이미지로 출력합니다.

```cpp
MODULE_API int ComposeImagesRGBA(
  const std::uint8_t* inputA,
  const std::uint8_t* inputB,
  std::uint8_t* output,
  int width,
  int height,
  float alpha
);
```

- 입력 이미지 버퍼는 RGBA 8비트 형식입니다.
- 출력 버퍼는 호출 측에서 확보합니다.
- 반환값 `0`은 성공, 음수는 오류로 사용합니다.

### 카메라 시작 모듈 기준

카메라·산업용 카메라·센서처럼 데이터가 외부에서 시작되는 모듈은 입력 포트가 없는 `source` 모듈입니다.

현재 `WebcamCapture` 예시는 OpenCV `VideoCapture`를 활용해 다음 기능을 제공합니다.

- 연결 가능한 카메라 수 확인
- 사용 가능한 장치 번호 확인
- 사용자가 선택한 장치 번호의 프레임 획득
- RGBA 이미지 버퍼 출력

여러 대의 카메라가 연결될 수 있으므로, 장치 번호를 고정하지 말고 장치 열거 및 선택 API를 유지합니다.

실제 산업용 카메라는 제조사 SDK 또는 Linux V4L2 / Windows DirectShow·Media Foundation 기반 코드로 대체하거나 별도 모듈로 추가합니다.

---

## 6. CMake 빌드 규칙

루트 `CMakeLists.txt`는 모든 모듈 폴더를 추가해 한 번에 빌드합니다.

```bash
cmake -S . -B build
cmake --build build --config Release
```

### CMake 모듈 규칙

각 모듈 폴더의 `CMakeLists.txt`는 다음을 수행해야 합니다.

1. 공유 라이브러리를 생성합니다.
2. 필요한 외부 라이브러리를 연결합니다. 예: OpenCV
3. 산출 라이브러리를 해당 `runtime_module/<category>/<module-name>` 폴더에 복사합니다.

Visual Studio에서는 결과 DLL이 `Release` 하위 폴더에 생성될 수 있습니다. 따라서 빌드 후 복사를 설정하여 다음처럼 모듈 폴더에 DLL이 위치하도록 유지합니다.

```text
runtime_module/imageprocessing/imagecomposer/ImageComposer.dll
runtime_module/imageacquisition/webcam/WebcamCapture.dll
```

백엔드는 하위 폴더도 탐색하지만, JSON 매니페스트와 라이브러리를 같은 모듈 폴더에 두는 방식을 우선합니다.

---

## 7. 런타임 모듈 자동 감지

`backend/main.py`의 모듈 검색 API는 `runtime_module`을 재귀 탐색합니다.

- `.so`, `.dll`, `.dylib` 파일을 찾습니다.
- 동일 모듈 폴더의 JSON 매니페스트를 읽습니다.
- 감지 결과를 `/api/runtime-modules`로 반환합니다.
- 프런트엔드의 좌측 라이브러리는 이를 읽어 C++ 시작 모듈과 C++ 처리 모듈에 표시합니다.

새 모듈을 표시하려면 다음 조건이 필요합니다.

1. 모듈이 CMake로 정상 컴파일되어야 합니다.
2. 생성된 라이브러리가 `runtime_module/<category>/<module-name>` 하위에 있어야 합니다.
3. 같은 모듈 폴더에 JSON 매니페스트가 있어야 합니다.
4. 백엔드를 재시작하거나 화면을 새로 열어 모듈 목록을 다시 요청해야 합니다.

---

## 8. 노드 캔버스 동작 기준

### 노드 추가와 이동

- 좌측 모듈 카드 선택 시 캔버스에 노드를 추가합니다.
- 노드 제목 영역을 마우스로 드래그해 위치를 이동합니다.
- 위치는 프로젝트 그래프 데이터에 저장됩니다.

### 연결 생성

- 출력 핀을 마우스로 누른 채 대상 노드의 입력 핀까지 드래그합니다.
- 대상 입력 핀에서 놓으면 연결됩니다.
- 입력 포트가 여러 개인 경우 `입력 1`, `입력 2`는 서로 독립적인 연결 대상입니다.
- 연결은 `from`, `to`, `toPort` 정보로 저장됩니다.
- 포트 타입이 다르면 연결하지 않으며, 화면에 타입 불일치 사유를 표시합니다.

### 연결과 노드 삭제

- 선택한 노드의 속성 패널에서 연결 삭제 버튼을 제공합니다.
- 버튼에는 `출발 노드 → 도착 노드 (입력 N)` 형식으로 경로를 표시합니다.
- 선택 노드의 속성 패널 하단에서 노드 자체를 삭제할 수 있습니다.
- 노드 삭제 시 해당 노드와 연결된 모든 연결선도 함께 삭제합니다.

---

## 9. 저장 및 실행 상태

### SQLite 영속화

프로젝트 그래프는 SQLite에 저장합니다.

- 프로젝트 이름
- 노드 배열: 위치, 모듈 정보, 입출력 타입, 실행 설정
- 연결 배열: 출발 노드, 대상 노드, 대상 입력 포트
- 실행 이벤트 로그

사용자가 생성하거나 바꾼 데이터는 브라우저 저장소가 아닌 FastAPI API를 통해 SQLite에 저장합니다.

### 실행 화면

- 상단 실행/정지 버튼은 파이프라인 실행 상태를 관리합니다.
- 출력 패널은 웹 기반 GUI입니다.
- 제공된 외부 영상·이미지 주소가 없는 경우 실제 데이터인 것처럼 가장하지 않습니다.
- 현재 제공되는 장면은 CSS 기반의 내장 예시 표현이며, 실제 네이티브 실행 엔진이 연결되면 결과 데이터를 웹 GUI에 전달하는 구조로 확장합니다.

향후 실제 노드 실행 통신은 WebSocket을 사용해 네이티브 실행 엔진의 이벤트·이미지 메타데이터·숫자·텍스트 결과를 웹 GUI로 전달하는 방향을 사용합니다.

---

## 10. 화면 디자인 기준

- 기본 테마: 기술적이면서 깔끔한 다크 테마
- 색상 구분
  - 입력/시작: 파란색
  - 처리: 주황색
  - 출력: 보라색 계열
- 노드에는 호버·선택·드래그 시 부드러운 전환과 그림자 피드백을 제공합니다.
- 모바일과 데스크톱에서 사용할 수 있도록 반응형 레이아웃을 유지합니다.
- 모든 사용자 표시 문구는 한국어로 작성합니다.
- 접근성을 위해 버튼·입력 요소를 사용하고 키보드 포커스를 명확히 표시합니다.

---

## 11. 제한 사항

다음 기능은 구현하지 않습니다.

- 사용자의 사진·영상·파일 업로드 또는 첨부
- 휴대폰 카메라·마이크 직접 사용
- 실제 이메일·문자·푸시 발송
- 실제 결제
- 외부 계정 로그인

카메라 입력은 브라우저 권한 기반 기능이 아니라 네이티브 C++ 시작 모듈과 연결 가능한 구조를 우선합니다.

---

## 12. 개발·검증 절차

### 웹 앱 실행

터미널을 두 개 사용합니다.

```bash
# 처음 한 번만
npm install

# 백엔드 실행
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000

# 프런트엔드 실행
npm run dev
```

`index.html`을 파일 탐색기에서 직접 열면 React 개발 서버와 API가 실행되지 않으므로 정상 동작하지 않습니다.

### 웹 앱 검증

```bash
npm run build
```

### 네이티브 모듈 검증

```bash
cmake -S . -B build
cmake --build build --config Release
```

Linux에서는 `nm -D <라이브러리>.so`로 내보낸 심볼을 확인할 수 있습니다.

---

## 13. Git 운영 규칙

- 소스, JSON 매니페스트, CMake 설정, 문서는 Git에 포함합니다.
- 빌드 산출물은 Git에 포함하지 않습니다.
  - `*.so`
  - `*.dll`
  - `*.dylib`
  - `build/`
  - `node_modules/`
- 인증용 개인키, PAT, 비밀번호는 프로젝트 파일·커밋·문서에 절대 저장하지 않습니다.
- GitHub 인증 정보가 대화에 노출되었다면 즉시 폐기·교체합니다.

원격 반영 전에는 다음을 확인합니다.

```bash
git status
git add <변경 파일>
git commit -m "변경 내용"
git push origin main
```

---

## 14. 새 기능 추가 체크리스트

새 네이티브 모듈을 추가할 때 아래 순서를 따릅니다.

1. `runtime_module/<category>/<module-name>` 폴더를 만듭니다.
2. C++ 소스에 플랫폼별 `MODULE_API` 매크로를 적용합니다.
3. JSON 매니페스트에 `kind`, `inputs`, `inputTypes`, `outputs`, `outputTypes`를 명시합니다.
4. 모듈별 `CMakeLists.txt`를 작성합니다.
5. 루트 CMake에서 하위 폴더를 추가합니다.
6. CMake 전체 빌드를 실행합니다.
7. 라이브러리가 모듈 폴더에 복사되는지 확인합니다.
8. 백엔드를 재시작해 `/api/runtime-modules` 감지 결과를 확인합니다.
9. 웹 화면에서 모듈이 표시되는지 확인합니다.
10. 노드 추가, 타입 일치 연결, 저장·복원 동작을 검증합니다.

이 기준을 따르면 이미지·센서·수치 분석·텍스트 처리·3D 처리 등 새로운 모듈을 같은 방식으로 확장할 수 있습니다.
