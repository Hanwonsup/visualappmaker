import { useState } from 'react'
type Props = { running: boolean; logs: string[] }
type Tab = 'preview' | 'viewer' | 'log'
export default function OutputPanel({ running, logs }: Props) {
  const [tab, setTab] = useState<Tab>('preview')
  return <section className="output-panel" aria-label="결과 및 로그">
    <div className="output-tabs"><button className={`tab ${tab === 'preview' ? 'active' : ''}`} onClick={() => setTab('preview')}>출력 미리보기</button><button className={`tab ${tab === 'viewer' ? 'active' : ''}`} onClick={() => setTab('viewer')}>3D 뷰어</button><button className={`tab ${tab === 'log' ? 'active' : ''}`} onClick={() => setTab('log')}>실행 로그 <em>{logs.length}</em></button><span className="output-status"><i className={running ? 'on' : ''} />{running ? '실시간 처리 중' : '대기 중'}</span></div>
    {tab === 'preview' && <div className="output-content">
      <div className="preview-image"><div className="scene-grid" /><div className="person-shape one"><i /><b /><span /></div><div className="person-shape two"><i /><b /><span /></div><div className="detect-box box-one">person 98%</div><div className="detect-box box-two">person 94%</div><span className="source-label">내장 예시 이미지 · 웹 GUI 출력</span></div>
      <div className="metric-card"><span>감지된 사람</span><strong>{running ? '2' : '—'}</strong><small>{running ? '웹 화면으로 수집된 현재 결과' : '실행을 시작하면 표시됩니다'}</small><div className="mini-bars"><i /><i /><i /><i /><i /><i /></div></div>
      <div className="log-box"><div className="log-head"><span>실행 로그</span><small>{running ? 'LIVE' : 'IDLE'}</small></div>{logs.slice(-3).map((log, i) => <p key={`${log}-${i}`}><time>{new Date().toLocaleTimeString('ko-KR', { hour12: false })}</time>{log}</p>)}</div>
    </div>}
    {tab === 'viewer' && <div className="output-content viewer-content"><div className="depth-view"><div className="depth-grid" /><div className="depth-orb one" /><div className="depth-orb two" /><span>깊이 데이터 · 웹 3D 렌더링 영역</span></div><div className="metric-card"><span>프레임 깊이</span><strong>{running ? '1.8m' : '—'}</strong><small>내장 예시 데이터 기준</small></div><div className="log-box"><div className="log-head"><span>뷰어 상태</span><small>{running ? 'LIVE' : 'IDLE'}</small></div><p>연결된 깊이 센서의 데이터를 웹 기반 3D 화면으로 표시합니다.</p></div></div>}
    {tab === 'log' && <div className="runtime-log-list">{logs.length ? logs.slice().reverse().map((log, i) => <p key={`${log}-${i}`}><time>{new Date().toLocaleTimeString('ko-KR', { hour12: false })}</time>{log}</p>) : <p className="muted-log">실행 기록이 여기에 표시됩니다.</p>}</div>}
  </section>
}
