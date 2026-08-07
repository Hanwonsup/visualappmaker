export type ModuleType = 'input' | 'process' | 'output'
export type ModuleItem = { type: ModuleType; label: string; icon: string; subtitle: string; dllName?: string; entryPoint?: string }
const groups: { title: string; items: ModuleItem[] }[] = [
  { title: '입력 모듈', items: [
    { type: 'input', label: '예시 카메라', icon: '◉', subtitle: '내장 이미지 스트림' },
    { type: 'input', label: '깊이 센서', icon: '◇', subtitle: '3D 깊이 프레임' },
    { type: 'input', label: '센서 데이터', icon: '⌁', subtitle: '실시간 수치 입력' },
  ]},
  { title: 'C++ 처리 모듈', items: [
    { type: 'process', label: '이미지 전처리', icon: '✦', subtitle: '네이티브 DLL · 밝기 보정', dllName: 'image_preprocess.dll', entryPoint: 'ProcessFrame' },
    { type: 'process', label: '사람 인식', icon: '◌', subtitle: '네이티브 DLL · 객체 탐지', dllName: 'person_detector.dll', entryPoint: 'DetectPeople' },
    { type: 'process', label: '통계 계산', icon: '∑', subtitle: '네이티브 DLL · 변화 분석', dllName: 'stats_engine.dll', entryPoint: 'Aggregate' },
  ]},
  { title: '출력 모듈', items: [
    { type: 'output', label: '이미지 뷰어', icon: '▣', subtitle: '웹 GUI · 2D 결과 화면' },
    { type: 'output', label: '값 표시', icon: '№', subtitle: '웹 GUI · 실시간 숫자 출력' },
    { type: 'output', label: '3D 뷰어', icon: '◈', subtitle: '웹 GUI · 깊이 데이터 확인' },
  ]},
]
export default function ModuleLibrary({ onAdd }: { onAdd: (item: ModuleItem) => void }) {
  return <aside className="module-library" aria-label="모듈 선택 영역">
    <div className="panel-heading"><span>모듈 라이브러리</span><button className="icon-button" aria-label="모듈 검색">⌕</button></div>
    {groups.map(group => <section className="module-group" key={group.title}>
      <h2>{group.title}</h2>
      {group.items.map(item => <button className={`module-card ${item.type}`} key={item.label} onClick={() => onAdd(item)}>
        <span className="module-icon">{item.icon}</span><span><strong>{item.label}</strong><small>{item.subtitle}</small></span><b>＋</b>
      </button>)}
    </section>)}
    <p className="library-help">처리 모듈은 DLL 이름과 진입 함수를 저장해 실행 엔진에 전달합니다.</p>
  </aside>
}
