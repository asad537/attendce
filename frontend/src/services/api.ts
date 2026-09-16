import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { ApiError } from '../types';

// During local development Vite proxies `/api` to Laravel (see vite.config.ts).
// Deployments can override this with VITE_API_URL.
const BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  withCredentials: false,
});

// A random id this browser keeps forever. Accounts with "device lock" on
// only work from the device(s) whose id the server has registered.
export function getDeviceId(): string {
  try {
    let id = localStorage.getItem('device_id');
    if (!id || !/^[A-Za-z0-9_-]{16,64}$/.test(id)) {
      id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
        ? crypto.randomUUID().replace(/-/g, '')
        : Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      localStorage.setItem('device_id', id);
    }
    return id;
  } catch {
    return 'nostorage0000000000';
  }
}

// Attach token + device id from localStorage
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers['X-Device-Id'] = getDeviceId();
  return config;
});

// Handle 401 globally — redirect to login
api.interceptors.response.use(
  (res) => res,
  (error: AxiosError<ApiError>) => {
    // The account is locked to another device: the server already revoked the
    // token, so drop the session and explain on the login page.
    if (error.response?.status === 403 && (error.response.data as { code?: string } | undefined)?.code === 'device_locked') {
      const message = (error.response.data as { message?: string } | undefined)?.message || 'This account is locked to another device.';
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      try { sessionStorage.setItem('auth_notice', message); } catch { /* ignore */ }
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
      return Promise.reject(error);
    }
    if (error.response?.status === 401) {
      // A slow request from an earlier session must never clear a token that
      // was saved by a newer, successful login. This happens frequently in
      // local development because React Strict Mode replays the initial
      // session check.
      const requestToken = String(error.config?.headers?.Authorization || '').replace(/^Bearer\s+/i, '');
      const currentToken = localStorage.getItem('auth_token');

      if (requestToken && requestToken === currentToken) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');

        if (window.location.pathname !== '/login') {
          window.location.assign('/login');
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// ─── Helper to extract error message ─────────────────────────────────────────
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiError | undefined;
    if (data?.errors) {
      return Object.values(data.errors).flat().join(' ');
    }
    return data?.message || error.message;
  }
  if (error instanceof Error) return error.message;
  return 'The requested action could not be completed.';
}
