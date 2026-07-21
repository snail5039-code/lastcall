export const API_BASE_URL = "http://192.168.0.9:8080";

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
