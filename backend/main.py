import json
import os
import sqlite3
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# 프로젝트와 실행 로그를 영구 보관하는 SQLite 파일 위치입니다.
DB_PATH = "/workspace/data/app.db"

# C++ 공유 라이브러리와 JSON 설명 파일을 보관하는 루트 폴더입니다.
# 구조: runtime_module/<category>/<module-name>/
MODULE_DIR = Path("/workspace/runtime_module")


def get_db():
    """요청마다 독립적인 SQLite 연결을 열어 반환합니다."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """앱 시작 시 필요한 테이블과 첫 예시 프로젝트를 준비합니다."""
    with get_db() as conn:
        # 노드 캔버스 전체 구조는 graph 컬럼에 JSON 문자열로 저장합니다.
        conn.execute("""CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            graph TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )""")

        # 실행 시작/종료, 모듈 추가 등 사용자에게 보이는 기록을 저장합니다.
        conn.execute("""CREATE TABLE IF NOT EXISTS runtime_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            message TEXT NOT NULL,
            created_at TEXT NOT NULL
        )""")

        # 처음 실행한 경우에만 빈 프로젝트를 하나 만듭니다.
        count = conn.execute("SELECT COUNT(*) AS c FROM projects").fetchone()["c"]
        if count == 0:
            graph = json.dumps({"nodes": [], "connections": []}, ensure_ascii=False)
            conn.execute(
                "INSERT INTO projects (name, graph, updated_at) VALUES (?, ?, ?)",
                ("사람 수 세기 실험", graph, datetime.now().isoformat(timespec="seconds")),
            )


def discover_modules():
    """
    runtime_module 하위의 공유 라이브러리를 찾아 화면용 모듈 목록으로 변환합니다.

    Linux의 .so, Windows의 .dll, macOS의 .dylib를 모두 지원합니다.
    Visual Studio는 Release, x64/Release 등의 하위 폴더에 DLL을 둘 수 있으므로
    모든 하위 폴더를 탐색합니다.
    """
    MODULE_DIR.mkdir(parents=True, exist_ok=True)
    modules = []
    extensions = {".so", ".dll", ".dylib"}

    library_paths = sorted(
        path for path in MODULE_DIR.rglob("*")
        if path.is_file() and path.suffix.lower() in extensions
    )
    seen_modules = set()

    for library_path in library_paths:
        # 라이브러리의 상위 경로에서 category/module-name 수준의 폴더를 찾습니다.
        module_root = next(
            (
                parent for parent in [library_path.parent, *library_path.parents]
                if parent.parent.parent == MODULE_DIR
            ),
            library_path.parent,
        )
        category = module_root.parent.name
        module_name = module_root.name

        # 같은 모듈이 원본 폴더와 Release 폴더에 중복되어 있어도 한 번만 표시합니다.
        module_key = (category, module_name, library_path.stem.lower())
        if module_key in seen_modules:
            continue
        seen_modules.add(module_key)

        # 기본적으로 라이브러리와 같은 이름의 JSON 설명 파일을 읽습니다.
        manifest_path = module_root / f"{library_path.stem}.json"
        if not manifest_path.exists():
            manifest_path = library_path.with_suffix(".json")

        # JSON이 없더라도 최소한의 처리 모듈로 감지할 수 있도록 기본값을 제공합니다.
        data = {
            "kind": "process",
            "label": library_path.stem,
            "icon": "✦",
            "subtitle": "감지된 C++ 공유 라이브러리",
            "entryPoint": "Process",
            "inputs": 1,
            "outputs": 1,
        }

        if manifest_path.exists():
            try:
                data.update(json.loads(manifest_path.read_text(encoding="utf-8")))
            except (OSError, json.JSONDecodeError):
                data["subtitle"] = "설명 파일을 읽을 수 없는 C++ 공유 라이브러리"

        input_count = int(data.get("inputs", 1))
        output_count = int(data.get("outputs", 1))
        is_source = str(data.get("kind", "process")) == "source" or input_count == 0

        # 프런트엔드 캔버스가 바로 사용할 수 있는 형식으로 반환합니다.
        modules.append({
            "type": "source" if is_source else "process",
            "label": str(data.get("label", library_path.stem)),
            "icon": str(data.get("icon", "✦")),
            "subtitle": str(data.get("subtitle", "감지된 C++ 공유 라이브러리")),
            "kind": str(data.get("kind", "process")),
            "dllName": library_path.name,
            "libraryPath": str(library_path.relative_to(MODULE_DIR)),
            "modulePath": str(module_root.relative_to(MODULE_DIR)),
            "category": category,
            "moduleName": module_name,
            "entryPoint": str(data.get("entryPoint", "Process")),
            "inputs": input_count,
            "outputs": output_count,
            # 타입을 생략한 기존 모듈은 모든 핀을 Image로 처리해 호환성을 유지합니다.
            "inputTypes": data.get("inputTypes", ["Image"] * input_count),
            "outputTypes": data.get("outputTypes", ["Image"] * output_count),
        })

    return modules


# 프로젝트 저장 요청의 데이터 형식입니다.
class ProjectPayload(BaseModel):
    name: str
    graph: dict


# 실행 로그 저장 요청의 데이터 형식입니다.
class RuntimeEventPayload(BaseModel):
    message: str


app = FastAPI()
init_db()


@app.get("/api/health")
def health():
    """프런트엔드와 배포 환경에서 백엔드 상태를 확인하는 기본 API입니다."""
    return {"ok": True}


@app.get("/api/runtime-modules")
def runtime_modules():
    """실행 폴더에 있는 C++ 네이티브 모듈의 감지 결과를 반환합니다."""
    return discover_modules()


@app.get("/api/projects")
def projects():
    """저장된 프로젝트 목록과 노드 그래프를 최신 순으로 반환합니다."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id, name, graph, updated_at FROM projects ORDER BY id DESC"
        ).fetchall()

    return [
        {
            "id": row["id"],
            "name": row["name"],
            "graph": json.loads(row["graph"]),
            "updated_at": row["updated_at"],
        }
        for row in rows
    ]


@app.put("/api/projects/{project_id}")
def save_project(project_id: int, payload: ProjectPayload):
    """노드 위치, 연결선, 처리 설정을 포함한 프로젝트 전체를 저장합니다."""
    with get_db() as conn:
        exists = conn.execute("SELECT id FROM projects WHERE id = ?", (project_id,)).fetchone()
        if not exists:
            raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다.")

        updated = datetime.now().isoformat(timespec="seconds")
        conn.execute(
            "UPDATE projects SET name = ?, graph = ?, updated_at = ? WHERE id = ?",
            (
                payload.name.strip() or "이름 없는 실험",
                json.dumps(payload.graph, ensure_ascii=False),
                updated,
                project_id,
            ),
        )

    return {"ok": True, "updated_at": updated}


@app.get("/api/projects/{project_id}/runtime-events")
def runtime_events(project_id: int):
    """최근 실행 기록 30개를 시간 순서대로 반환합니다."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT message, created_at FROM runtime_events "
            "WHERE project_id = ? ORDER BY id DESC LIMIT 30",
            (project_id,),
        ).fetchall()

    return [
        {"message": row["message"], "created_at": row["created_at"]}
        for row in reversed(rows)
    ]


@app.post("/api/projects/{project_id}/runtime-events")
def create_runtime_event(project_id: int, payload: RuntimeEventPayload):
    """화면에서 발생한 실행 로그 한 건을 SQLite에 영구 저장합니다."""
    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="실행 기록이 필요합니다.")

    created_at = datetime.now().isoformat(timespec="seconds")
    with get_db() as conn:
        conn.execute(
            "INSERT INTO runtime_events (project_id, message, created_at) VALUES (?, ?, ?)",
            (project_id, message, created_at),
        )

    return {"ok": True, "created_at": created_at}
