export const API_BASE_URL = "https://api.lastcall.kro.kr";

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
