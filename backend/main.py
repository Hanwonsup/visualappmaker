import os
import json
import sqlite3
from datetime import datetime
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

DB_PATH = "/workspace/data/app.db"


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
        count = conn.execute("SELECT COUNT(*) AS c FROM projects").fetchone()["c"]
        if count == 0:
            graph = json.dumps({"nodes": [], "connections": []}, ensure_ascii=False)
            conn.execute("INSERT INTO projects (name, graph, updated_at) VALUES (?, ?, ?)",
                         ("사람 수 세기 실험", graph, datetime.now().isoformat(timespec="seconds")))


class ProjectPayload(BaseModel):
    name: str
    graph: dict


app = FastAPI()
init_db()


@app.get("/api/health")
def health():
    return {"ok": True}


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
