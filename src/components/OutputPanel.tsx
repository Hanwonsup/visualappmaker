type Props = { running: boolean; logs: string[] }

export default function OutputPanel({ running, logs }: Props) {
  return <section className="output-panel" aria-label="결과 및 로그">
    <div className="output-tabs"><button className="tab active">출력 미리보기</button><button className="tab">3D 뷰어</button><button className="tab">실행 로그 <em>{logs.length}</em></button><span className="output-status"><i className={running ? 'on' : ''} />{running ? '실시간 처리 중' : '대기 중'}</span></div>
    <div className="output-content">
      <div className="preview-image"><div className="scene-grid" /><div className="person-shape one"><i /><b /><span /></div><div className="person-shape two"><i /><b /><span /></div><div className="detect-box box-one">person 98%</div><div className="detect-box box-two">person 94%</div><span className="source-label">내장 예시 이미지 · 가상 카메라 01</span></div>
      <div className="metric-card"><span>감지된 사람</span><strong>{running ? '2' : '—'}</strong><small>{running ? '현재 프레임 기준' : '실행을 시작하면 표시됩니다'}</small><div className="mini-bars"><i /><i /><i /><i /><i /><i /></div></div>
      <div className="log-box"><div className="log-head"><span>실행 로그</span><small>{running ? 'LIVE' : 'IDLE'}</small></div>{logs.slice(-3).map((log, i) => <p key={`${log}-${i}`}><time>{new Date().toLocaleTimeString('ko-KR', { hour12: false })}</time>{log}</p>)}{!logs.length && <p className="muted-log">실행 기록이 여기에 표시됩니다.</p>}</div>
    </div>
  </section>
}
