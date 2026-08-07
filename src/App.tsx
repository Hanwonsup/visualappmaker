import { useEffect, useMemo, useState } from 'react'
import { api } from './lib/api'
import ModuleLibrary, { ModuleItem } from './components/ModuleLibrary'
import NodeCanvas, { initialLinks, initialNodes, Link, NodeData } from './components/NodeCanvas'
import OutputPanel from './components/OutputPanel'

// 서버에 저장되는 프로젝트의 기본 형태입니다.
type StoredProject = {
  id: number
  name: string
  graph: { nodes: NodeData[]; connections: Link[] }
}

// 실행 중 발생한 로그 한 건의 서버 응답 형태입니다.
type RuntimeEvent = { message: string; created_at: string }

/**
 * 애플리케이션의 최상위 화면입니다.
 * 프로젝트 데이터, 캔버스의 노드/연결선, 실행 상태와 로그를 한 곳에서 관리하고
 * 각 화면 구성 요소에 필요한 동작을 전달합니다.
 */
export default function App() {
  // 서버에서 불러온 현재 프로젝트 정보입니다.
  const [project, setProject] = useState<StoredProject | null>(null)

  // 캔버스에 배치된 노드와 노드 사이의 데이터 연결을 관리합니다.
  const [nodes, setNodes] = useState<NodeData[]>(initialNodes)
  const [links, setLinks] = useState<Link[]>(initialLinks)
  const [selected, setSelected] = useState<string | null>(null)

  // 실행 버튼 상태와 사용자에게 보여 줄 실행 기록입니다.
  const [running, setRunning] = useState(false)
  const [logs, setLogs] = useState<string[]>([
    '작업 공간을 불러왔습니다.',
    '예시 카메라 모듈이 준비되었습니다.',
  ])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')

  /**
   * 화면의 로그를 갱신하고, 프로젝트가 준비된 경우 서버에도 기록합니다.
   * 서버 저장에 실패하더라도 화면의 작업이 멈추지 않도록 오류는 조용히 처리합니다.
   */
  const addLog = (message: string, persist = true) => {
    setLogs(previous => [...previous, message])

    if (persist && project) {
      api(`projects/${project.id}/runtime-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      }).catch(() => undefined)
    }
  }

  /**
   * 화면을 처음 열 때 저장된 프로젝트와 과거 실행 로그를 불러옵니다.
   * 저장된 노드가 있으면 기본 예시 대신 저장된 캔버스 구성을 복원합니다.
   */
  useEffect(() => {
    api('projects')
      .then(async response => {
        if (!response.ok) throw new Error('프로젝트를 불러오지 못했습니다.')
        return response.json() as Promise<StoredProject[]>
      })
      .then(items => {
        const savedProject = items[0]
        setProject(savedProject)

        if (savedProject?.graph.nodes?.length) {
          setNodes(savedProject.graph.nodes)
          setLinks(savedProject.graph.connections || [])
        }

        return savedProject
      })
      .then(savedProject => savedProject ? api(`projects/${savedProject.id}/runtime-events`) : null)
      .then(async response => {
        if (!response?.ok) return
        const events: RuntimeEvent[] = await response.json()
        if (events.length) setLogs(events.map(event => event.message))
      })
      .catch(() => {
        setNotice('저장된 프로젝트를 불러오지 못했습니다. 예시 작업 공간으로 시작합니다.')
      })
      .finally(() => setLoading(false))
  }, [])

  /**
   * 현재 예시 실행 엔진의 주기적인 처리 완료 로그입니다.
   * 실제 네이티브 실행 엔진이 연결되면 이 부분은 엔진의 실제 결과 수신 로직으로 교체할 수 있습니다.
   */
  useEffect(() => {
    if (!running) return

    const timerId = window.setInterval(() => {
      addLog(`C++ 처리 엔진 완료 · 사람 ${2 + (logs.length % 2)}명 감지`)
    }, 3200)

    return () => window.clearInterval(timerId)
  }, [running, logs.length, project])

  // 상단 상태 표시용 문구입니다.
  const phase = useMemo(() => running ? 'RUNNING' : 'READY', [running])

  /**
   * 라이브러리에서 선택한 모듈을 캔버스에 새 노드로 추가합니다.
   * 모듈 JSON에서 읽은 입·출력 타입, DLL/SO 이름, 진입 함수도 함께 보존합니다.
   */
  const addModule = (item: ModuleItem) => {
    const count = nodes.length
    const node: NodeData = {
      id: `${item.type}-${Date.now()}`,
      type: item.type,
      title: item.label,
      detail: item.subtitle,
      icon: item.icon,
      x: 90 + (count % 3) * 210,
      y: 70 + (count % 4) * 100,
      setting: item.type === 'process' ? '0.65' : undefined,
      dllName: item.dllName,
      entryPoint: item.entryPoint,
      inputs: item.inputs,
      outputs: item.outputs,
      inputTypes: item.inputTypes,
      outputTypes: item.outputTypes,
    }

    setNodes(previous => [...previous, node])
    setSelected(node.id)
    addLog(`${item.label} 모듈을 추가했습니다.`)
  }

  // 드래그한 노드의 좌표만 갱신합니다.
  const moveNode = (id: string, x: number, y: number) => {
    setNodes(previous => previous.map(node => node.id === id ? { ...node, x, y } : node))
  }

  /**
   * 선택한 노드를 제거하고, 해당 노드에 연결된 모든 데이터 연결선도 함께 정리합니다.
   */
  const removeNode = (id: string) => {
    const node = nodes.find(item => item.id === id)
    if (!node) return

    setNodes(previous => previous.filter(item => item.id !== id))
    setLinks(previous => previous.filter(link => link.from !== id && link.to !== id))
    setSelected(null)
    addLog(`${node.title} 노드와 연결된 데이터 흐름을 삭제했습니다.`)
  }

  /**
   * 현재 캔버스 구조와 노드 설정을 서버의 SQLite 데이터베이스에 저장합니다.
   */
  const save = async () => {
    if (!project) return

    try {
      const response = await api(`projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: project.name,
          graph: { nodes, connections: links },
        }),
      })

      if (!response.ok) throw new Error('프로젝트 저장에 실패했습니다.')
      setNotice('프로젝트 구조, DLL 연결 정보와 설정을 저장했습니다.')
      addLog('프로젝트 저장 완료')
    } catch {
      setNotice('저장 중 문제가 발생했습니다. 다시 시도해 주세요.')
    }
  }

  // 실행과 정지 상태를 전환하고, 변경 내용을 로그에 남깁니다.
  const toggle = () => {
    const message = running
      ? '실행을 중지했습니다.'
      : 'C++ DLL 처리 파이프라인과 웹 GUI 출력을 시작했습니다.'

    setRunning(value => !value)
    addLog(message)
  }

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">◈</span>
        <div><b>모두의 AI 실험실</b><small>VIBE CODING STUDIO</small></div>
      </div>

      <div className="project-title">
        <span>프로젝트</span>
        <strong>{project?.name || '사람 수 세기 실험'}</strong>
        <i>⌄</i>
      </div>

      <div className="header-actions">
        <span className={`status-pill ${running ? 'running' : ''}`}><i />{phase}</span>
        <button className="save-button" onClick={save} disabled={loading}>저장</button>
        <button className={`run-button ${running ? 'stop' : ''}`} onClick={toggle}>
          {running ? '■ 정지' : '▶ 실행'}
        </button>
        <button
          className="designer"
          onClick={() => setNotice('GUI Designer는 웹 기반 출력 화면을 구성하며, 연결된 출력 데이터를 실시간으로 표시합니다.')}
        >
          GUI Designer ↗
        </button>
      </div>
    </header>

    {notice && <div className="toast" role="status">
      {notice}<button onClick={() => setNotice('')}>×</button>
    </div>}

    <main className="studio">
      <ModuleLibrary onAdd={addModule} />
      <NodeCanvas
        nodes={nodes}
        links={links}
        selected={selected}
        onSelect={id => setSelected(id || null)}
        onAddLink={(from, to, toPort) => {
          setLinks(previous => [...previous, { from, to, toPort }])
          addLog(`모듈 간 데이터 연결을 만들었습니다. · 입력 ${toPort + 1}`)
        }}
        onRemoveLink={(from, to, toPort) => {
          setLinks(previous => previous.filter(link => link.from !== from || link.to !== to || link.toPort !== toPort))
          addLog('모듈 간 데이터 연결을 삭제했습니다.')
        }}
        onMoveNode={moveNode}
        onRemoveNode={removeNode}
        onUpdateSetting={(id, setting) => {
          setNodes(previous => previous.map(node => node.id === id ? { ...node, setting } : node))
        }}
        onUpdateRuntime={(id, field, value) => {
          setNodes(previous => previous.map(node => node.id === id ? { ...node, [field]: value } : node))
        }}
      />
      <OutputPanel running={running} logs={logs} />
    </main>

    <footer className="statusbar">
      <span><i /> 시스템 정상</span>
      <span>노드 {nodes.length}개 · 연결 {links.length}개</span>
      <span>C++ DLL 엔진 · 웹 GUI 출력</span>
      <span className="shortcut">⌘ S 저장</span>
    </footer>
  </div>
}
