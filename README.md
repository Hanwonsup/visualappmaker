# 모두의 AI 실험실 바이브코딩

이 프로젝트는 React/Vite 프론트엔드와 FastAPI 백엔드가 함께 동작하는 웹 애플리케이션입니다.
따라서 `index.html` 파일을 브라우저에서 직접 열면 화면이 나타나지 않습니다. 개발 서버를 실행해 주세요.

## 준비 사항

- Node.js 18 이상
- Python 3.10 이상
- CMake 및 C++ 컴파일러(네이티브 `.so` / `.dll` 모듈을 빌드할 경우)

## 처음 한 번만 설치

프로젝트 최상위 폴더에서 실행합니다.

```bash
npm install
python -m pip install -r requirements.txt
```

## 개발 모드 실행

### 1. 백엔드 실행

Linux/macOS:

```bash
python3 -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

Windows PowerShell:

```powershell
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

### 2. 프론트엔드 실행

새 터미널을 열어 프로젝트 최상위 폴더에서 실행합니다.

```bash
npm run dev
```

명령 실행 후 터미널에 표시되는 Vite 주소를 브라우저에서 엽니다. 일반적으로 `http://localhost:5173`입니다.

## C++ 런타임 모듈 빌드

CMake와 OpenCV 개발 패키지가 준비된 환경에서는 루트 폴더에서 다음 명령으로 모듈을 빌드합니다.

```bash
cmake -S . -B build
cmake --build build --config Release
```

생성된 공유 라이브러리는 `runtime_module/<category>/<module-name>/` 구조에서 자동 감지됩니다.

- Linux: `.so`
- Windows: `.dll`
- macOS: `.dylib`

각 라이브러리와 동일한 이름의 JSON 설명 파일에 `inputs`, `inputTypes`, `outputs`, `outputTypes`를 정의하면 노드 연결 규칙에 반영됩니다.
