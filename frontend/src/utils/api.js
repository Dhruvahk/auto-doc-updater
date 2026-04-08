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
  let message =
    (data != null && formatApiErrorMessage(data.error ?? data)) ||
    err.message ||
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

const apiBase =
  typeof process.env.NEXT_PUBLIC_API_URL === 'string' &&
  process.env.NEXT_PUBLIC_API_URL.length > 0
    ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')}/api`
    : '/api';

const api = axios.create({
  baseURL: apiBase,
  timeout: 60000,
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
