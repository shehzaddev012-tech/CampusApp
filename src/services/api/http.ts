import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_URL } from '../../config/env';

/** An error from the server, or from reaching it. `message` is safe to show to the user. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface Tokens {
  accessToken: string;
  refreshToken: string;
  /** ms since epoch */
  expiresAt: number;
}

const KEY = 'campushub.session.v1';
const TIMEOUT_MS = 15_000;
const UPLOAD_TIMEOUT_MS = 120_000;
/** Refresh a little early so a request never goes out with a token about to expire. */
const REFRESH_MARGIN_MS = 60_000;

let tokens: Tokens | null = null;
let loaded: Promise<void> | null = null;
const endedListeners = new Set<() => void>();

function ensureLoaded(): Promise<void> {
  if (!loaded) {
    loaded = AsyncStorage.getItem(KEY)
      .then(raw => {
        tokens = raw ? (JSON.parse(raw) as Tokens) : null;
      })
      .catch(() => {
        tokens = null;
      });
  }
  return loaded;
}

export async function hasStoredSession(): Promise<boolean> {
  await ensureLoaded();
  return tokens !== null;
}

export async function saveSession(t: { accessToken: string; refreshToken: string; expiresIn: number }): Promise<void> {
  tokens = { accessToken: t.accessToken, refreshToken: t.refreshToken, expiresAt: Date.now() + t.expiresIn * 1000 };
  await AsyncStorage.setItem(KEY, JSON.stringify(tokens)).catch(() => undefined);
}

export async function clearSession(): Promise<void> {
  tokens = null;
  loaded = Promise.resolve();
  await AsyncStorage.removeItem(KEY).catch(() => undefined);
}

export async function currentRefreshToken(): Promise<string | null> {
  await ensureLoaded();
  return tokens?.refreshToken ?? null;
}

/** Called when the server says this session is over (for example the refresh token expired). */
export function onSessionEnded(cb: () => void): () => void {
  endedListeners.add(cb);
  return () => {
    endedListeners.delete(cb);
  };
}

async function rawFetch(method: string, path: string, body: unknown, accessToken: string | null): Promise<Response> {
  const controller = new AbortController();
  // Uploading pictures takes longer than a normal call.
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const timer = setTimeout(() => controller.abort(), isForm ? UPLOAD_TIMEOUT_MS : TIMEOUT_MS);
  try {
    return await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        // For a form, fetch adds the right Content-Type (with the boundary) itself.
        // Only say "JSON" when there is a body: servers reject an empty body labelled as JSON.
        ...(isForm || body === undefined ? {} : { 'Content-Type': 'application/json' }),
        Accept: 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    const aborted = (err as { name?: string }).name === 'AbortError';
    throw new ApiError(0, 'network', aborted ? 'The server took too long to answer. Please try again.' : 'Cannot reach the server. Check your connection and try again.');
  } finally {
    clearTimeout(timer);
  }
}

async function toError(res: Response): Promise<ApiError> {
  let code = 'error';
  let message = 'Something went wrong. Please try again.';
  let details: unknown;
  try {
    const json = (await res.json()) as { error?: { code?: string; message?: string; details?: unknown } };
    code = json.error?.code ?? code;
    message = json.error?.message ?? message;
    details = json.error?.details;
  } catch {
    // keep the generic message
  }
  return new ApiError(res.status, code, message, details);
}

let refreshing: Promise<boolean> | null = null;

/** Exchanges the refresh token for a new pair. One refresh at a time, shared by all waiting requests. */
function refreshTokens(): Promise<boolean> {
  if (!refreshing) {
    refreshing = (async () => {
      const current = tokens;
      if (!current) {
        return false;
      }
      try {
        const res = await rawFetch('POST', '/v1/auth/refresh', { refreshToken: current.refreshToken }, null);
        if (res.ok) {
          await saveSession((await res.json()) as { accessToken: string; refreshToken: string; expiresIn: number });
          return true;
        }
        if (res.status === 401 || res.status === 400) {
          // The server no longer accepts this session: it is over.
          await clearSession();
          endedListeners.forEach(cb => cb());
        }
        return false;
      } catch {
        return false; // offline: keep the session, try again later
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}

/** A token that is good for at least another minute (renewed first when needed), or null when signed out. */
export async function freshAccessToken(): Promise<string | null> {
  await ensureLoaded();
  if (!tokens) {
    return null;
  }
  if (tokens.expiresAt - Date.now() < REFRESH_MARGIN_MS) {
    await refreshTokens();
  }
  return tokens?.accessToken ?? null;
}

/** Calls the API. Adds the sign-in token, refreshes it when needed, and throws `ApiError` on failure. */
export async function api<T>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown, opts: { auth?: boolean } = {}): Promise<T> {
  const auth = opts.auth ?? true;
  if (auth) {
    await ensureLoaded();
    if (!tokens) {
      throw new ApiError(401, 'unauthorized', 'Please sign in.');
    }
    if (tokens.expiresAt - Date.now() < REFRESH_MARGIN_MS) {
      await refreshTokens();
    }
  }

  let res = await rawFetch(method, path, body, auth ? (tokens?.accessToken ?? null) : null);
  if (res.status === 401 && auth && tokens) {
    if (await refreshTokens()) {
      res = await rawFetch(method, path, body, tokens?.accessToken ?? null);
    }
  }
  if (!res.ok) {
    throw await toError(res);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}
