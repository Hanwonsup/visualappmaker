import { useEffect, useState } from 'react'
import { api } from '../lib/api'
export type ModuleType = 'input' | 'source' | 'process' | 'output'
export type DataType = 'Image' | 'Number' | 'Text' | 'Image[]' | 'Number[]' | 'Text[]'
export type ModuleItem = {
  type: ModuleType; label: string; icon: string; subtitle: string; dllName?: string; entryPoint?: string
  inputs?: number; outputs?: number; inputTypes?: DataType[]; outputTypes?: DataType[]; kind?: string
}
const groups: { title: string; items: ModuleItem[] }[] = [
  { title: '입력 모듈', items: [
    { type: 'input', label: '예시 카메라', icon: '◉', subtitle: '내장 이미지 스트림', outputs: 1, outputTypes: ['Image'] },
    { type: 'input', label: '깊이 센서', icon: '◇', subtitle: '3D 깊이 프레임', outputs: 1, outputTypes: ['Image'] },
    { type: 'input', label: '센서 데이터', icon: '⌁', subtitle: '실시간 수치 입력', outputs: 1, outputTypes: ['Number'] },
  ]},
  { title: 'C++ 처리 모듈', items: [
    { type: 'process', label: '이미지 전처리', icon: '✦', subtitle: '네이티브 SO · 밝기 보정', dllName: 'image_preprocess.so', entryPoint: 'ProcessFrame', inputs: 1, outputs: 1, inputTypes: ['Image'], outputTypes: ['Image'] },
    { type: 'process', label: '사람 인식', icon: '◌', subtitle: '네이티브 SO · 객체 탐지', dllName: 'person_detector.so', entryPoint: 'DetectPeople', inputs: 1, outputs: 2, inputTypes: ['Image'], outputTypes: ['Image', 'Number'] },
    { type: 'process', label: '통계 계산', icon: '∑', subtitle: '네이티브 SO · 변화 분석', dllName: 'stats_engine.so', entryPoint: 'Aggregate', inputs: 1, outputs: 1, inputTypes: ['Number[]'], outputTypes: ['Number'] },
  ]},
  { title: '출력 모듈', items: [
    { type: 'output', label: '이미지 뷰어', icon: '▣', subtitle: '웹 GUI · 2D 결과 화면', inputs: 1, inputTypes: ['Image'] },
    { type: 'output', label: '값 표시', icon: '№', subtitle: '웹 GUI · 실시간 숫자 출력', inputs: 1, inputTypes: ['Number'] },
    { type: 'output', label: '3D 뷰어', icon: '◈', subtitle: '웹 GUI · 깊이 데이터 확인', inputs: 1, inputTypes: ['Image'] },
  ]},
]
export default function ModuleLibrary({ onAdd }: { onAdd: (item: ModuleItem) => void }) {
  const [detected, setDetected] = useState<ModuleItem[]>([])
  const [scanError, setScanError] = useState(false)
  useEffect(() => {
    api('runtime-modules').then(async res => {
      if (!res.ok) throw new Error('모듈 검색 실패')
      return res.json() as Promise<ModuleItem[]>
    }).then(setDetected).catch(() => setScanError(true))
  }, [])
  const detectedSources = detected.filter(item => item.type === 'source')
  const detectedProcessors = detected.filter(item => item.type === 'process')
  const displayGroups = [
    ...(detectedSources.length ? [{ title: 'C++ 시작 모듈', items: detectedSources }] : []),
    ...groups.map(group => group.title === 'C++ 처리 모듈' ? { ...group, items: [...detectedProcessors, ...group.items] } : group),
  ]
  return <aside className="module-library" aria-label="모듈 선택 영역">
    <div className="panel-heading"><span>모듈 라이브러리</span><button className="icon-button" aria-label="모듈 검색">⌕</button></div>
    {displayGroups.map(group => <section className="module-group" key={group.title}>
      <h2>{group.title}</h2>
      {group.items.map(item => <button className={`module-card ${item.type}`} key={`${item.label}-${item.dllName || ''}`} onClick={() => onAdd(item)}>
        <span className="module-icon">{item.icon}</span><span><strong>{item.label}</strong><small>{item.subtitle}</small></span><b>＋</b>
      </button>)}
      {(group.title === 'C++ 처리 모듈' || group.title === 'C++ 시작 모듈') && detected.length > 0 && <p className="module-scan">● 실행 폴더에서 {detected.length}개 SO 모듈 감지</p>}
      {group.title === 'C++ 처리 모듈' && scanError && <p className="module-scan error">SO 모듈 목록을 확인할 수 없습니다.</p>}
    </section>)}
    <p className="library-help">모듈 JSON의 inputTypes·outputTypes에 Image, Number, Text 또는 배열형(Image[])을 적어 데이터 연결 규칙을 설정할 수 있습니다.</p>
  </aside>
}
