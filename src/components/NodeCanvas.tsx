import { PointerEvent, useRef, useState } from 'react'
import type { ModuleType } from './ModuleLibrary'
export type NodeData = { id: string; type: ModuleType; title: string; detail: string; icon: string; x: number; y: number; setting?: string; dllName?: string; entryPoint?: string; inputs?: number; outputs?: number }
export type Link = { from: string; to: string; toPort?: number }
const colors: Record<ModuleType, string> = { input: '#47a7ff', process: '#f5a54b', output: '#a98cff' }
const NODE_WIDTH = 173
const PORT_Y = 60
const inputPortY = (index: number) => index === 0 ? 60 : 81

type Connecting = { from: string; x: number; y: number } | null
export default function NodeCanvas({ nodes, links, selected, onSelect, onAddLink, onRemoveLink, onMoveNode, onUpdateSetting, onUpdateRuntime }: {
  nodes: NodeData[]; links: Link[]; selected: string | null; onSelect: (id: string) => void; onAddLink: (from: string, to: string, toPort: number) => void; onRemoveLink: (from: string, to: string, toPort?: number) => void; onMoveNode: (id: string, x: number, y: number) => void; onUpdateSetting: (id: string, setting: string) => void; onUpdateRuntime: (id: string, field: 'dllName' | 'entryPoint', value: string) => void
}) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null)
  const [connecting, setConnecting] = useState<Connecting>(null)
  const selectedNode = nodes.find(node => node.id === selected)
  const canvasPoint = (event: PointerEvent | globalThis.PointerEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const bounds = canvas.getBoundingClientRect()
    return { x: event.clientX - bounds.left + canvas.scrollLeft, y: event.clientY - bounds.top + canvas.scrollTop }
  }
  const startDrag = (event: PointerEvent<HTMLElement>, node: NodeData) => {
    if ((event.target as HTMLElement).closest('button, input')) return
    const point = canvasPoint(event)
    dragRef.current = { id: node.id, offsetX: point.x - node.x, offsetY: point.y - node.y }
    event.currentTarget.setPointerCapture?.(event.pointerId)
    onSelect(node.id)
    event.preventDefault()
  }
  const movePointer = (event: PointerEvent<HTMLDivElement>) => {
    const point = canvasPoint(event)
    const drag = dragRef.current
    if (drag) onMoveNode(drag.id, Math.max(12, Math.round(point.x - drag.offsetX)), Math.max(12, Math.round(point.y - drag.offsetY)))
    if (connecting) setConnecting(current => current ? { ...current, x: point.x, y: point.y } : null)
  }
  const finishPointer = () => { dragRef.current = null }
  const startConnection = (event: PointerEvent<HTMLButtonElement>, node: NodeData) => {
    event.stopPropagation()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    const point = canvasPoint(event)
    setConnecting({ from: node.id, x: point.x, y: point.y })
    onSelect(node.id)
  }
  const finishConnection = (event: PointerEvent<HTMLButtonElement>, targetId: string, targetPort: number) => {
    event.stopPropagation()
    const from = connecting?.from
    if (from && from !== targetId && !links.some(link => link.from === from && link.to === targetId && (link.toPort || 0) === targetPort)) onAddLink(from, targetId, targetPort)
    setConnecting(null)
  }
  const cancelConnection = () => setConnecting(null)
  const removeConnection = (from: string, to: string, toPort?: number) => {
    onRemoveLink(from, to, toPort)
    cancelConnection()
  }
  const wirePath = (fromX: number, fromY: number, toX: number, toY: number) => `M ${fromX} ${fromY} C ${fromX + 82} ${fromY}, ${toX - 82} ${toY}, ${toX} ${toY}`
  return <section className="canvas-wrap" aria-label="노드 작업 공간">
    <div className="canvas-toolbar"><span className="breadcrumb">작업 공간 <i>/</i> 네이티브 처리 파이프라인</span><span className="connect-hint">{connecting ? '원하는 입력 핀 위에서 마우스를 놓아 연결하세요' : '노드 제목을 드래그해 이동하고, 출력 핀을 원하는 입력 핀까지 끌어 연결하세요'}</span><div><button className="tool-button" onClick={cancelConnection} title="연결 취소">×</button></div></div>
    <div className="node-canvas" ref={canvasRef} onPointerMove={movePointer} onPointerUp={finishPointer} onPointerCancel={() => { finishPointer(); cancelConnection() }} onPointerDown={(event) => { if (event.target === event.currentTarget) { onSelect(''); cancelConnection() } }}>
      <svg className="wires" viewBox="0 0 900 600" preserveAspectRatio="none" aria-hidden="true">
        {links.map(link => {
          const a = nodes.find(node => node.id === link.from)
          const b = nodes.find(node => node.id === link.to)
          if (!a || !b) return null
          const port = link.toPort || 0
          return <path key={`${link.from}-${link.to}-${port}`} d={wirePath(a.x + NODE_WIDTH, a.y + PORT_Y, b.x, b.y + inputPortY(port))} stroke={colors[a.type]} />
        })}
        {connecting && (() => {
          const source = nodes.find(node => node.id === connecting.from)
          return source ? <path className="pending-wire" d={wirePath(source.x + NODE_WIDTH, source.y + PORT_Y, connecting.x, connecting.y)} stroke={colors[source.type]} /> : null
        })()}
      </svg>
      {nodes.map(node => {
        const inputCount = node.inputs || 1
        return <article className={`flow-node ${node.type} ${selected === node.id ? 'selected' : ''}`} key={node.id} style={{ left: `${node.x}px`, top: `${node.y}px` }} onClick={() => onSelect(node.id)}>
          {node.type !== 'input' && Array.from({ length: inputCount }, (_, index) => <button className={`port-button input-pin ${connecting ? 'connection-target' : ''}`} style={{ top: `${inputPortY(index) - 5}px` }} key={index} onPointerUp={event => finishConnection(event, node.id, index)} onPointerDown={event => event.stopPropagation()} aria-label={`${node.title} 입력 ${index + 1}`}>{inputCount > 1 && <small>입력 {index + 1}</small>}</button>)}
          <header onPointerDown={event => startDrag(event, node)}><span className="node-type-icon">{node.icon}</span><span><strong>{node.title}</strong><small>{node.detail}</small></span><button className="more" aria-label="노드 메뉴">⋮</button></header>
          <div className="node-body">{node.type === 'input' ? <><span className="stream-dot" />내장 예시 데이터</> : node.type === 'process' ? <><span className="native-badge">C++ SO</span><b>{node.inputs ? `입력 ${node.inputs} · 출력 ${node.outputs || 1}` : node.setting || '0.65'}</b></> : <><span>웹 GUI</span><b className="ready">준비됨</b></>}</div>
          {node.type !== 'output' && <button className={`port-button output-pin ${connecting?.from === node.id ? 'connecting' : ''}`} onPointerDown={event => startConnection(event, node)} aria-label={`${node.title} 출력 핀`}>출력</button>}
        </article>
      })}
      {selectedNode && <aside className="inspector">
        <div className="inspector-title"><span>속성</span><button onClick={() => onSelect('')}>×</button></div>
        <label>노드 이름<input value={selectedNode.title} readOnly /></label>
        {selectedNode.type === 'process' && <>
          <label>인식 기준<input value={selectedNode.setting || '0.65'} onChange={event => onUpdateSetting(selectedNode.id, event.target.value)} /></label>
          <label>SO 모듈<input value={selectedNode.dllName || ''} placeholder="예: engine.so" onChange={event => onUpdateRuntime(selectedNode.id, 'dllName', event.target.value)} /></label>
          <label>진입 함수<input value={selectedNode.entryPoint || ''} placeholder="예: ProcessFrame" onChange={event => onUpdateRuntime(selectedNode.id, 'entryPoint', event.target.value)} /></label>
        </>}
        <p>각 입력 핀은 별도로 연결됩니다. 이미지 합성기의 입력 1과 입력 2에 각각 다른 이미지를 연결할 수 있습니다.</p>
        {links.filter(link => link.from === selectedNode.id || link.to === selectedNode.id).map(link => <button className="remove-link" key={`${link.from}-${link.to}-${link.toPort || 0}`} onClick={() => removeConnection(link.from, link.to, link.toPort)}>연결 삭제{link.to === selectedNode.id ? ` · 입력 ${(link.toPort || 0) + 1}` : ''}</button>)}
      </aside>}
      {!nodes.length && <div className="empty-canvas"><b>작업 공간이 비어 있습니다</b><span>왼쪽 라이브러리에서 모듈을 선택해 실험을 시작하세요.</span></div>}
    </div>
  </section>
}
export const initialNodes: NodeData[] = [
  { id: 'camera', type: 'input', title: '예시 카메라', detail: '내장 이미지 스트림', icon: '◉', x: 55, y: 175 },
  { id: 'detect', type: 'process', title: '사람 인식', detail: '네이티브 SO · 객체 탐지', icon: '◌', x: 320, y: 175, setting: '0.65', dllName: 'person_detector.so', entryPoint: 'DetectPeople' },
  { id: 'viewer', type: 'output', title: '이미지 뷰어', detail: '웹 GUI · 2D 결과 화면', icon: '▣', x: 585, y: 100 },
  { id: 'count', type: 'output', title: '값 표시', detail: '웹 GUI · 실시간 숫자 출력', icon: '№', x: 585, y: 292 },
]
export const initialLinks: Link[] = [{ from: 'camera', to: 'detect', toPort: 0 }, { from: 'detect', to: 'viewer', toPort: 0 }, { from: 'detect', to: 'count', toPort: 0 }]
