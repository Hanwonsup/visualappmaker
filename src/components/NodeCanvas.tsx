import { useState } from 'react'
import type { ModuleItem, ModuleType } from './ModuleLibrary'
export type NodeData = { id: string; type: ModuleType; title: string; detail: string; icon: string; x: number; y: number; setting?: string; dllName?: string; entryPoint?: string }
export type Link = { from: string; to: string }
const colors: Record<ModuleType, string> = { input: '#47a7ff', process: '#f5a54b', output: '#a98cff' }
function Port({ side, active = false }: { side: 'in' | 'out'; active?: boolean }) {
  return <span className={`port ${side} ${active ? 'active' : ''}`} aria-hidden="true" />
}
export default function NodeCanvas({ nodes, links, selected, onSelect, onAddLink, onUpdateSetting, onUpdateRuntime }: {
  nodes: NodeData[]; links: Link[]; selected: string | null; onSelect: (id: string) => void; onAddLink: (from: string, to: string) => void; onUpdateSetting: (id: string, setting: string) => void; onUpdateRuntime: (id: string, field: 'dllName' | 'entryPoint', value: string) => void
}) {
  const [linkStart, setLinkStart] = useState<string | null>(null)
  const selectedNode = nodes.find(node => node.id === selected)
  const connect = (id: string) => {
    if (!linkStart) { setLinkStart(id); return }
    if (linkStart !== id && !links.some(link => link.from === linkStart && link.to === id)) onAddLink(linkStart, id)
    setLinkStart(null)
  }
  return <section className="canvas-wrap" aria-label="노드 작업 공간">
    <div className="canvas-toolbar"><span className="breadcrumb">작업 공간 <i>/</i> 네이티브 처리 파이프라인</span><span className="connect-hint">{linkStart ? '대상 노드를 선택해 연결하세요' : '처리 노드는 DLL 실행 엔진과 연결됩니다'}</span><div><button className="tool-button">↶</button><button className="tool-button">↷</button><button className="tool-button">⌗</button></div></div>
    <div className="node-canvas">
      <svg className="wires" viewBox="0 0 900 600" preserveAspectRatio="none" aria-hidden="true">
        {links.map(link => { const a = nodes.find(n => n.id === link.from); const b = nodes.find(n => n.id === link.to); if (!a || !b) return null; return <path key={`${link.from}-${link.to}`} d={`M ${a.x + 172} ${a.y + 60} C ${a.x + 255} ${a.y + 60}, ${b.x - 76} ${b.y + 60}, ${b.x} ${b.y + 60}`} stroke={colors[a.type]} /> })}
      </svg>
      {nodes.map(node => <article className={`flow-node ${node.type} ${selected === node.id ? 'selected' : ''}`} key={node.id} style={{ left: `${node.x}px`, top: `${node.y}px` }} onClick={() => onSelect(node.id)}>
        <Port side="in" active={links.some(l => l.to === node.id)} /><button className="node-link input-link" onClick={(e) => { e.stopPropagation(); connect(node.id) }} aria-label={`${node.title} 연결 시작 또는 종료`}>●</button>
        <header><span className="node-type-icon">{node.icon}</span><span><strong>{node.title}</strong><small>{node.detail}</small></span><button className="more" aria-label="노드 메뉴">⋮</button></header>
        <div className="node-body">{node.type === 'input' ? <><span className="stream-dot" />내장 예시 데이터</> : node.type === 'process' ? <><span className="native-badge">C++ DLL</span><b>{node.setting || '0.65'}</b></> : <><span>웹 GUI</span><b className="ready">준비됨</b></>}</div>
        <Port side="out" active={links.some(l => l.from === node.id)} /><button className="node-link output-link" onClick={(e) => { e.stopPropagation(); connect(node.id) }} aria-label={`${node.title} 연결 시작 또는 종료`}>●</button>
      </article>)}
      {selectedNode && <aside className="inspector"><div className="inspector-title"><span>속성</span><button onClick={() => onSelect('')}>×</button></div><label>노드 이름<input value={selectedNode.title} readOnly /></label>{selectedNode.type === 'process' && <><label>인식 기준<input value={selectedNode.setting || '0.65'} onChange={e => onUpdateSetting(selectedNode.id, e.target.value)} /></label><label>DLL 모듈<input value={selectedNode.dllName || ''} placeholder="예: engine.dll" onChange={e => onUpdateRuntime(selectedNode.id, 'dllName', e.target.value)} /></label><label>진입 함수<input value={selectedNode.entryPoint || ''} placeholder="예: ProcessFrame" onChange={e => onUpdateRuntime(selectedNode.id, 'entryPoint', e.target.value)} /></label></>}<p>{selectedNode.type === 'process' ? 'DLL 파일 경로는 실행 환경에서 안전하게 등록하고, 여기에는 모듈 식별자와 호출 함수를 보관합니다.' : '출력 노드는 웹 기반 GUI에서 수집된 결과를 표시합니다.'}</p></aside>}
      {!nodes.length && <div className="empty-canvas"><b>작업 공간이 비어 있습니다</b><span>왼쪽 라이브러리에서 모듈을 선택해 실험을 시작하세요.</span></div>}
    </div>
  </section>
}
export const initialNodes: NodeData[] = [
  { id: 'camera', type: 'input', title: '예시 카메라', detail: '내장 이미지 스트림', icon: '◉', x: 55, y: 175 },
  { id: 'detect', type: 'process', title: '사람 인식', detail: '네이티브 DLL · 객체 탐지', icon: '◌', x: 320, y: 175, setting: '0.65', dllName: 'person_detector.dll', entryPoint: 'DetectPeople' },
  { id: 'viewer', type: 'output', title: '이미지 뷰어', detail: '웹 GUI · 2D 결과 화면', icon: '▣', x: 585, y: 100 },
  { id: 'count', type: 'output', title: '값 표시', detail: '웹 GUI · 실시간 숫자 출력', icon: '№', x: 585, y: 292 },
]
export const initialLinks: Link[] = [{ from: 'camera', to: 'detect' }, { from: 'detect', to: 'viewer' }, { from: 'detect', to: 'count' }]
