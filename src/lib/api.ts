// 미리보기 경로가 하위 주소로 제공되는 환경에서도 올바른 백엔드 주소를 만들기 위한 공통 요청 도우미입니다.
// 화면 코드에서는 fetch('/api/...') 대신 반드시 api('...')를 사용합니다.
export const api = (path: string, init?: RequestInit) =>
  fetch(import.meta.env.BASE_URL + 'api/' + path.replace(/^\/+/, ''), init)
