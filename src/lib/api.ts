// Thin wrapper around fetch() that attaches the JWT access token and
// transparently retries once via the refresh endpoint if the token expired.
// The access token itself lives only in memory (module-level variable),
// never in localStorage, to limit exposure to XSS. The refresh token is an
// httpOnly cookie the browser sends automatically — JS never touches it.

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include"
    });
    if (!res.ok) return null;
    const data = await res.json();
    accessToken = data.accessToken;
    return accessToken;
  } catch {
    return null;
  }
}

interface ApiFetchOptions extends RequestInit {
  skipAuthRetry?: boolean;
}

export async function apiFetch(url: string, options: ApiFetchOptions = {}): Promise<Response> {
  const { skipAuthRetry, headers, ...rest } = options;

  const doFetch = (token: string | null) =>
    fetch(url, {
      ...rest,
      credentials: "include",
      headers: {
        ...(rest.body ? { "Content-Type": "application/json" } : {}),
        ...(headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });

  let res = await doFetch(accessToken);

  // Access token expired or missing — try a silent refresh once, then retry.
  if (res.status === 401 && !skipAuthRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await doFetch(newToken);
    }
  }

  return res;
}

export async function apiJson<T = any>(url: string, options?: ApiFetchOptions): Promise<T> {
  const res = await apiFetch(url, options);
  if (!res.ok) {
    let message = `Erreur ${res.status}`;
    try {
      const body = await res.json();
      message = body.error || message;
    } catch {
      // ignore parse failure
    }
    throw new Error(message);
  }
  return res.json();
}
