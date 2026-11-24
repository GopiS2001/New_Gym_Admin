import type { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

import axios from 'axios';

import { CONFIG } from 'src/global-config';

// ----------------------------------------------------------------------

export const API_BASE_URL = `${CONFIG.serverUrl}/api/v1`;

export const ACCESS_TOKEN_KEY = 'gym_admin_access_token';
export const REFRESH_TOKEN_KEY = 'gym_admin_refresh_token';

/** Error thrown by the API client. `details` carries per-field validation issues. */
export class ApiError extends Error {
  status?: number;

  details?: { field: string; message: string }[] | Record<string, unknown>;

  constructor(message: string, status?: number, details?: ApiError['details']) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

axiosInstance.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ----------------------------------------------------------------------
// Silent refresh: on a 401, rotate the refresh token once and retry.

let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = sessionStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;
  try {
    const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken });
    sessionStorage.setItem(ACCESS_TOKEN_KEY, res.data.accessToken);
    sessionStorage.setItem(REFRESH_TOKEN_KEY, res.data.refreshToken);
    return res.data.accessToken as string;
  } catch {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    return null;
  }
}

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<any>) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;
    const isAuthCall =
      original?.url?.includes('/auth/login') || original?.url?.includes('/auth/refresh');

    if (error.response?.status === 401 && original && !original._retry && !isAuthCall) {
      original._retry = true;
      refreshing ??= refreshAccessToken().finally(() => {
        refreshing = null;
      });
      const token = await refreshing;
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return axiosInstance(original);
      }
      window.dispatchEvent(new Event('auth:expired'));
    }

    const data = error.response?.data;
    const message =
      data?.message ||
      (error.code === 'ERR_NETWORK'
        ? 'Cannot reach the server. Check your connection and that the API is running.'
        : error.message) ||
      'Something went wrong!';
    return Promise.reject(new ApiError(message, error.response?.status, data?.details));
  }
);

export default axiosInstance;

// ----------------------------------------------------------------------

export const fetcher = async <T = unknown>(
  args: string | [string, AxiosRequestConfig]
): Promise<T> => {
  const [url, config] = Array.isArray(args) ? args : [args, {}];
  const res = await axiosInstance.get<T>(url, config);
  return res.data;
};

// ----------------------------------------------------------------------

export const endpoints = {
  auth: {
    me: '/admin/auth/me',
    signIn: '/admin/auth/login',
    logout: '/auth/logout',
    changePassword: '/auth/change-password',
    // Not used by the admin dashboard (kept so template demo modules still compile).
    signUp: '/auth/register',
  },
  // Template demo endpoints — unused by the gym admin, retained for compilation only.
  chat: '/api/chat',
  kanban: '/api/kanban',
  calendar: '/api/calendar',
  mail: { list: '/api/mail/list', details: '/api/mail/details', labels: '/api/mail/labels' },
  post: {
    list: '/api/post/list',
    details: '/api/post/details',
    latest: '/api/post/latest',
    search: '/api/post/search',
  },
  product: {
    list: '/api/product/list',
    details: '/api/product/details',
    search: '/api/product/search',
  },
} as const;
