const BASE_URL = '/api';

function getSessionHeaders(): Record<string, string> {
  const sessionId = localStorage.getItem('sessionId');
  return sessionId ? { 'x-session-id': sessionId } : {};
}

function handleUnauthorized() {
  localStorage.removeItem('sessionId');
  window.dispatchEvent(new Event('auth-expired'));
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { ...getSessionHeaders() },
  });
  if (!res.ok) {
    if (res.status === 401) {
      handleUnauthorized();
      throw new Error('Session expired');
    }
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `Request failed: ${res.status}`);
  }
  const json = await res.json();
  return json.data as T;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getSessionHeaders() },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    if (res.status === 401) {
      handleUnauthorized();
      throw new Error('Session expired');
    }
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.error?.message ?? `Request failed: ${res.status}`);
  }
  const json = await res.json();
  return json.data as T;
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getSessionHeaders() },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    if (res.status === 401) {
      handleUnauthorized();
      throw new Error('Session expired');
    }
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.error?.message ?? `Request failed: ${res.status}`);
  }
  const json = await res.json();
  return json.data as T;
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'DELETE',
    headers: { ...getSessionHeaders() },
  });
  if (!res.ok) {
    if (res.status === 401) {
      handleUnauthorized();
      throw new Error('Session expired');
    }
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.error?.message ?? `Request failed: ${res.status}`);
  }
}

export async function login(
  username: string,
  password: string,
): Promise<{ sessionId: string; username: string }> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json?.error?.message ?? 'Login failed');
  }
  const json = await res.json();
  const data = json.data as { sessionId: string; username: string };
  localStorage.setItem('sessionId', data.sessionId);
  return data;
}

export async function logout(): Promise<void> {
  const sessionId = localStorage.getItem('sessionId');
  await fetch(`${BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: sessionId ? { 'x-session-id': sessionId } : {},
  }).catch(() => {});
  localStorage.removeItem('sessionId');
}
