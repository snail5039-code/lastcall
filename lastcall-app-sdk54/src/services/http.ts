const DEFAULT_TIMEOUT_MS = 12_000;

export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  retries = 1,
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(input, { ...init, signal: controller.signal });
      if (response.ok || response.status < 500 || attempt === retries) return response;
      lastError = new Error(`서버 응답 오류: ${response.status}`);
    } catch (error) {
      lastError = error;
      if (attempt === retries) throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError;
}
