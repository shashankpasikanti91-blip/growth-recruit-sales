import axios, { AxiosInstance, AxiosError } from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const isProduction = process.env.NODE_ENV === 'production';

const COOKIE_OPTIONS = {
  secure: isProduction,
  sameSite: 'strict' as const,
};

const api: AxiosInstance = axios.create({
  baseURL: `${API_URL}/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = Cookies.get('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api.request(originalRequest);
          }
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = Cookies.get('refresh_token');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/v1/auth/refresh`, { refreshToken });
          Cookies.set('access_token', data.accessToken, { ...COOKIE_OPTIONS, expires: 1 / 96 });
          Cookies.set('refresh_token', data.refreshToken, { ...COOKIE_OPTIONS, expires: 7 });
          processQueue(null, data.accessToken);
          if (originalRequest) {
            originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
            return api.request(originalRequest);
          }
        } catch (refreshError) {
          processQueue(refreshError as Error);
          Cookies.remove('access_token');
          Cookies.remove('refresh_token');
          window.location.href = '/login';
        } finally {
          isRefreshing = false;
        }
      } else {
        Cookies.remove('access_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
