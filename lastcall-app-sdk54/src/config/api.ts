/**
 * 서버 주소. 기본값은 운영 서버이며, 로컬 서버로 붙일 때만 환경변수로 덮어쓴다.
 *
 * .env.development 에 EXPO_PUBLIC_API_BASE_URL=http://localhost:8080 을 넣고 expo 를 다시
 * 시작하면 된다. .env 에 넣으면 expo export 와 EAS 빌드에도 함께 읽혀 운영 APK 에 박힌다.
 * 실기기·에뮬레이터는 localhost 가 기기 자신을 가리키므로 PC 의 LAN IP 를 써야 한다.
 */
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/+$/, "") || "https://api.lastcall.kro.kr";

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
