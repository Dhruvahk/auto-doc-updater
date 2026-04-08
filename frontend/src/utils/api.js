import axios from 'axios';

/** Turn API/axios error payloads into a human-readable string (avoids "[object Object]"). */
export function formatApiErrorMessage(payload) {
  if (payload == null) return '';
  if (typeof payload === 'string') return payload;
  if (typeof payload === 'number' || typeof payload === 'boolean') return String(payload);
  if (Array.isArray(payload)) {
    const parts = payload.map(formatApiErrorMessage).filter(Boolean);
    return parts.length ? parts.join('; ') : '';
  }
  if (typeof payload === 'object') {
    if (typeof payload.message === 'string') return payload.message;
    if (payload.message != null && typeof payload.message !== 'string') {
      const nested = formatApiErrorMessage(payload.message);
      if (nested) return nested;
    }
    if (payload.error != null) {
      const inner = formatApiErrorMessage(payload.error);
      if (inner) return inner;
    }
    if (typeof payload.detail === 'string') return payload.detail;
    try {
      const s = JSON.stringify(payload);
      if (s && s !== '{}' && s.length < 400) return s;
    } catch {
      /* ignore */
    }
    return 'Request failed — see server logs for details.';
  }
  const s = String(payload);
  return s === '[object Object]' ? '' : s;
}

function normalizeAxiosResponseData(data) {
  if (data == null) return data;
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return { message: data.slice(0, 500) };
    }
  }
  return data;
}

function axiosErrorToMessage(err) {
  const raw = err.response?.data;
  const data = normalizeAxiosResponseData(raw);
  const fromBody =
    data != null ? formatApiErrorMessage(data.error ?? data) : '';
  const fromAxios =
    typeof err.message === 'string' && err.message ? err.message : '';
  let message =
    fromBody ||
    fromAxios ||
    'An unexpected error occurred.';
  if (message === '[object Object]' || typeof message === 'object') {
    message =
      formatApiErrorMessage(data) ||
      (() => {
        try {
          const j = JSON.stringify(data);
          return j && j !== '{}' && j.length < 800 ? j : '';
        } catch {
          return '';
        }
      })() ||
      'Could not read the server error. Open DevTools → Network, click the failed request, and read the response body.';
  }
  return String(message);
}

/** Use in catch blocks so UI never shows "[object Object]". */
export function safeErrorMessage(err) {
  if (err == null) return 'Unknown error.';
  if (typeof err === 'string') {
    return err === '[object Object]' ? 'Unknown error.' : err;
  }
  if (err instanceof Error) {
    const m = err.message;
    return m && m !== '[object Object]' ? m : 'Unknown error.';
  }
  const formatted = formatApiErrorMessage(err);
  if (formatted && formatted !== '[object Object]') return formatted;
  try {
    const j = JSON.stringify(err, Object.getOwnPropertyNames(err));
    if (j && j !== '{}' && j.length < 1500) return j;
  } catch {
    /* ignore */
  }
  return 'Unknown error.';
}

function clientApiBase() {
  const u =
    typeof process.env.NEXT_PUBLIC_API_URL === 'string'
      ? process.env.NEXT_PUBLIC_API_URL.trim()
      : '';
  // Production: call Render directly so long-running /analysis/run is not cut off by Vercel proxy limits.
  // Local: omit NEXT_PUBLIC_API_URL and use same-origin /api (next.config rewrites → localhost:3001).
  if (u) return `${u.replace(/\/$/, '')}/api`;
  return '/api';
}

const api = axios.create({
  baseURL: clientApiBase(),
  timeout: 120000,
});

api.interceptors.response.use(
  res => res.data,
  err => {
    throw new Error(axiosErrorToMessage(err));
  }
);

export const runAnalysis = (repoUrl, prNumber) =>
  api.post('/analysis/run', { repoUrl, prNumber });

export const createDocsPR = (payload) =>
  api.post('/github/create-pr', payload);

export const getTokenStatus = () =>
  api.get('/github/token-status');

export const getHealth = () =>
  api.get('/health');

export default api;
