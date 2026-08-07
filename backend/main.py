import os
import json
import sqlite3
from datetime import datetime
from pathlib import Path
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
DB_PATH = "/workspace/data/app.db"
MODULE_DIR = Path("/workspace/runtime_module")
def get_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn
def init_db():
    with get_db() as conn:
        conn.execute("""CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            graph TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )""")
        conn.execute("""CREATE TABLE IF NOT EXISTS runtime_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            message TEXT NOT NULL,
            created_at TEXT NOT NULL
        )""")
        count = conn.execute("SELECT COUNT(*) AS c FROM projects").fetchone()["c"]
        if count == 0:
            graph = json.dumps({"nodes": [], "connections": []}, ensure_ascii=False)
            conn.execute("INSERT INTO projects (name, graph, updated_at) VALUES (?, ?, ?)",
                         ("사람 수 세기 실험", graph, datetime.now().isoformat(timespec="seconds")))
def discover_modules():
    MODULE_DIR.mkdir(parents=True, exist_ok=True)
    modules = []
    # Windows Visual Studio builds can retain binaries inside configuration folders
    # (for example Release/ or x64/Release/), so search all module descendants.
    extensions = {".so", ".dll", ".dylib"}
    library_paths = sorted(path for path in MODULE_DIR.rglob("*") if path.is_file() and path.suffix.lower() in extensions)
    seen_modules = set()
    for library_path in library_paths:
        module_root = next((parent for parent in [library_path.parent, *library_path.parents]
                            if parent.parent.parent == MODULE_DIR), library_path.parent)
        category = module_root.parent.name
        module_name = module_root.name
        module_key = (category, module_name, library_path.stem.lower())
        if module_key in seen_modules:
            continue
        seen_modules.add(module_key)
        manifest_path = module_root / f"{library_path.stem}.json"
        if not manifest_path.exists():
            manifest_path = library_path.with_suffix(".json")
        data = {"kind": "process", "label": library_path.stem, "icon": "✦", "subtitle": "감지된 C++ 공유 라이브러리", "entryPoint": "Process", "inputs": 1, "outputs": 1}
        if manifest_path.exists():
            try:
                data.update(json.loads(manifest_path.read_text(encoding="utf-8")))
            except (OSError, json.JSONDecodeError):
                data["subtitle"] = "설명 파일을 읽을 수 없는 C++ 공유 라이브러리"
        modules.append({
            "type": "source" if str(data.get("kind", "process")) == "source" or int(data.get("inputs", 1)) == 0 else "process",
            "label": str(data.get("label", library_path.stem)),
            "icon": str(data.get("icon", "✦")), "subtitle": str(data.get("subtitle", "감지된 C++ 공유 라이브러리")),
            "kind": str(data.get("kind", "process")),
            "dllName": library_path.name, "libraryPath": str(library_path.relative_to(MODULE_DIR)),
            "modulePath": str(module_root.relative_to(MODULE_DIR)),
            "category": category, "moduleName": module_name,
            "entryPoint": str(data.get("entryPoint", "Process")),
            "inputs": int(data.get("inputs", 1)), "outputs": int(data.get("outputs", 1)),
            "inputTypes": data.get("inputTypes", ["Image"] * int(data.get("inputs", 1))),
            "outputTypes": data.get("outputTypes", ["Image"] * int(data.get("outputs", 1))),
        })
    return modules
class ProjectPayload(BaseModel):
    name: str
    graph: dict
class RuntimeEventPayload(BaseModel):
    message: str
app = FastAPI()
init_db()
@app.get("/api/health")
def health():
    return {"ok": True}
@app.get("/api/runtime-modules")
def runtime_modules():
    return discover_modules()
@app.get("/api/projects")
def projects():
    with get_db() as conn:
        rows = conn.execute("SELECT id, name, graph, updated_at FROM projects ORDER BY id DESC").fetchall()
    return [{"id": row["id"], "name": row["name"], "graph": json.loads(row["graph"]), "updated_at": row["updated_at"]} for row in rows]
@app.put("/api/projects/{project_id}")
def save_project(project_id: int, payload: ProjectPayload):
    with get_db() as conn:
        exists = conn.execute("SELECT id FROM projects WHERE id = ?", (project_id,)).fetchone()
        if not exists:
            raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다.")
        updated = datetime.now().isoformat(timespec="seconds")
        conn.execute("UPDATE projects SET name = ?, graph = ?, updated_at = ? WHERE id = ?",
                     (payload.name.strip() or "이름 없는 실험", json.dumps(payload.graph, ensure_ascii=False), updated, project_id))
    return {"ok": True, "updated_at": updated}
@app.get("/api/projects/{project_id}/runtime-events")
def runtime_events(project_id: int):
    with get_db() as conn:
        rows = conn.execute("SELECT message, created_at FROM runtime_events WHERE project_id = ? ORDER BY id DESC LIMIT 30", (project_id,)).fetchall()
    return [{"message": row["message"], "created_at": row["created_at"]} for row in reversed(rows)]
@app.post("/api/projects/{project_id}/runtime-events")
def create_runtime_event(project_id: int, payload: RuntimeEventPayload):
    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="실행 기록이 필요합니다.")
    created_at = datetime.now().isoformat(timespec="seconds")
    with get_db() as conn:
        conn.execute("INSERT INTO runtime_events (project_id, message, created_at) VALUES (?, ?, ?)", (project_id, message, created_at))
    return {"ok": True, "created_at": created_at}
