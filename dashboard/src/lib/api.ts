const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export function apiUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path;
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

export function apiFetch(path: string, init?: RequestInit) {
  return fetch(apiUrl(path), init);
}

export function apiEventSource(path: string) {
  return new EventSource(apiUrl(path));
}
