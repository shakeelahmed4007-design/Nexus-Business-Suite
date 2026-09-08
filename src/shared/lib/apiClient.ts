/**
 * Shared API client for calling the Nexus backend (Express + Supabase).
 *
 * Auth strategy:
 * 1. If user has a real Supabase JWT (supabase.auth.session) ? send as Bearer token
 * 2. If user has a local/mock session (nexus_current_session) ? send as X-Mock-Session header
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface MockSession {
  id: string;
  email: string;
  role: string;
  shop_id?: string | null;
}

function getMockSession(): MockSession | null {
  try {
    const raw = localStorage.getItem('nexus_current_session');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const profile = parsed?.profile;
    if (!profile?.id) return null;
    return {
      id: profile.id,
      email: profile.email || '',
      role: profile.role || 'staff',
      shop_id: profile.shop_id || null,
    };
  } catch {
    return null;
  }
}

function getRealJWT(): string | null {
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes('supabase') && key.includes('auth')) {
      try {
        const val = JSON.parse(localStorage.getItem(key) || '{}');
        if (val?.access_token) return val.access_token;
      } catch {}
    }
  }
  return null;
}

function buildHeaders(): Record<string, string> {
  const base: Record<string, string> = { 'Content-Type': 'application/json' };

  // Prefer real JWT
  const jwt = getRealJWT();
  if (jwt) {
    base['Authorization'] = `Bearer ${jwt}`;
    return base;
  }

  // Fall back to mock session header
  const mock = getMockSession();
  if (mock) {
    const encoded = btoa(JSON.stringify(mock));
    base['X-Mock-Session'] = encoded;
    return base;
  }

  return base;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: buildHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg = json?.error || json?.message || `Request failed: ${res.status}`;
    throw new Error(msg);
  }

  return json as T;
}

export const apiClient = {
  get:    <T>(path: string)                => request<T>('GET',    path),
  post:   <T>(path: string, body: unknown) => request<T>('POST',   path, body),
  put:    <T>(path: string, body: unknown) => request<T>('PUT',    path, body),
  patch:  <T>(path: string, body: unknown) => request<T>('PATCH',  path, body),
  delete: <T>(path: string)                => request<T>('DELETE', path),
};
