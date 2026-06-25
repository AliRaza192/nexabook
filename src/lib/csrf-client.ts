export async function getCsrfToken(): Promise<string> {
  const res = await fetch("/api/csrf");
  const data = await res.json();
  return data.token;
}

let cachedToken: string | null = null;

export async function ensureCsrfToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  cachedToken = await getCsrfToken();
  return cachedToken;
}

export async function fetchWithCsrf(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = await ensureCsrfToken();
  const headers = new Headers(init?.headers);
  headers.set("x-csrf-token", token);
  return fetch(input, { ...init, headers });
}
