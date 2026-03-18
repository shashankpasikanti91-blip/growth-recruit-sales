import axios, { AxiosInstance, AxiosError } from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const api: AxiosInstance = axios.create({
  baseURL: `${API_URL}/v1`,
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = Cookies.get('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      const refreshToken = Cookies.get('refresh_token');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/v1/auth/refresh`, { refreshToken });
          Cookies.set('access_token', data.accessToken, { expires: 1 / 96 }); // 15 min
          Cookies.set('refresh_token', data.refreshToken, { expires: 7 });
          if (error.config) {
            error.config.headers.Authorization = `Bearer ${data.accessToken}`;
            return api.request(error.config);
          }
        } catch {
          Cookies.remove('access_token');
          Cookies.remove('refresh_token');
          window.location.href = '/login';
        }
      } else {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
