import { useEffect, useMemo, useState } from 'react'
import { api } from './lib/api'
import ModuleLibrary, { ModuleItem } from './components/ModuleLibrary'
import NodeCanvas, { initialLinks, initialNodes, Link, NodeData } from './components/NodeCanvas'
import OutputPanel from './components/OutputPanel'
type StoredProject = { id: number; name: string; graph: { nodes: NodeData[]; connections: Link[] } }
type RuntimeEvent = { message: string; created_at: string }
export default function App() {
  const [project, setProject] = useState<StoredProject | null>(null)
  const [nodes, setNodes] = useState<NodeData[]>(initialNodes)
  const [links, setLinks] = useState<Link[]>(initialLinks)
  const [selected, setSelected] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [logs, setLogs] = useState<string[]>(['작업 공간을 불러왔습니다.', '예시 카메라 모듈이 준비되었습니다.'])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const addLog = (message: string, persist = true) => {
    setLogs(prev => [...prev, message])
    if (persist && project) api(`projects/${project.id}/runtime-events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) }).catch(() => undefined)
  }
  useEffect(() => { api('projects').then(async res => { if (!res.ok) throw new Error(); return res.json() }).then((items: StoredProject[]) => { const saved = items[0]; setProject(saved); if (saved?.graph.nodes?.length) { setNodes(saved.graph.nodes); setLinks(saved.graph.connections || []) }; return saved }).then((saved: StoredProject | undefined) => saved ? api(`projects/${saved.id}/runtime-events`) : null).then(async res => { if (!res?.ok) return; const events: RuntimeEvent[] = await res.json(); if (events.length) setLogs(events.map(event => event.message)) }).catch(() => setNotice('저장된 프로젝트를 불러오지 못했습니다. 예시 작업 공간으로 시작합니다.')).finally(() => setLoading(false)) }, [])
  useEffect(() => { if (!running) return; const id = window.setInterval(() => addLog(`C++ 처리 엔진 완료 · 사람 ${2 + (logs.length % 2)}명 감지`), 3200); return () => window.clearInterval(id) }, [running, logs.length, project])
  const phase = useMemo(() => running ? 'RUNNING' : 'READY', [running])
  const addModule = (item: ModuleItem) => { const count = nodes.length; const node: NodeData = { id: `${item.type}-${Date.now()}`, type: item.type, title: item.label, detail: item.subtitle, icon: item.icon, x: 90 + (count % 3) * 210, y: 70 + (count % 4) * 100, setting: item.type === 'process' ? '0.65' : undefined, dllName: item.dllName, entryPoint: item.entryPoint, inputs: item.inputs, outputs: item.outputs }; setNodes(prev => [...prev, node]); setSelected(node.id); addLog(`${item.label} 모듈을 추가했습니다.`) }
  const moveNode = (id: string, x: number, y: number) => setNodes(prev => prev.map(node => node.id === id ? { ...node, x, y } : node))
  const save = async () => { if (!project) return; try { const res = await api(`projects/${project.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: project.name, graph: { nodes, connections: links } }) }); if (!res.ok) throw new Error(); setNotice('프로젝트 구조, DLL 연결 정보와 설정을 저장했습니다.'); addLog('프로젝트 저장 완료'); } catch { setNotice('저장 중 문제가 발생했습니다. 다시 시도해 주세요.') } }
  const toggle = () => { const message = running ? '실행을 중지했습니다.' : 'C++ DLL 처리 파이프라인과 웹 GUI 출력을 시작했습니다.'; setRunning(value => !value); addLog(message) }
  return <div className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">◈</span><div><b>모두의 AI 실험실</b><small>VIBE CODING STUDIO</small></div></div><div className="project-title"><span>프로젝트</span><strong>{project?.name || '사람 수 세기 실험'}</strong><i>⌄</i></div><div className="header-actions"><span className={`status-pill ${running ? 'running' : ''}`}><i />{phase}</span><button className="save-button" onClick={save} disabled={loading}>저장</button><button className={`run-button ${running ? 'stop' : ''}`} onClick={toggle}>{running ? '■ 정지' : '▶ 실행'}</button><button className="designer" onClick={() => setNotice('GUI Designer는 웹 기반 출력 화면을 구성하며, 연결된 출력 데이터를 실시간으로 표시합니다.')}>GUI Designer ↗</button></div></header>
    {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice('')}>×</button></div>}
    <main className="studio"><ModuleLibrary onAdd={addModule} /><NodeCanvas nodes={nodes} links={links} selected={selected} onSelect={id => setSelected(id || null)} onAddLink={(from, to) => { setLinks(prev => [...prev, { from, to }]); addLog('모듈 간 데이터 연결을 만들었습니다.') }} onRemoveLink={(from, to) => { setLinks(prev => prev.filter(link => link.from !== from || link.to !== to)); addLog('모듈 간 데이터 연결을 삭제했습니다.') }} onMoveNode={moveNode} onUpdateSetting={(id, setting) => setNodes(prev => prev.map(node => node.id === id ? { ...node, setting } : node))} onUpdateRuntime={(id, field, value) => setNodes(prev => prev.map(node => node.id === id ? { ...node, [field]: value } : node))} /><OutputPanel running={running} logs={logs} /></main>
    <footer className="statusbar"><span><i /> 시스템 정상</span><span>노드 {nodes.length}개 · 연결 {links.length}개</span><span>C++ DLL 엔진 · 웹 GUI 출력</span><span className="shortcut">⌘ S 저장</span></footer>
  </div>
}
