import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
});

api.interceptors.response.use(
  res => res.data,
  err => {
    const message =
      err.response?.data?.error ||
      err.message ||
      'An unexpected error occurred.';
    throw new Error(message);
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
