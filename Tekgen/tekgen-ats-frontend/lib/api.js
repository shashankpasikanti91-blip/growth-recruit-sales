import axios from 'axios';
import Cookies from 'js-cookie';

/**
 * Pick API base URL in the browser so one build works for:
 * - Next dev (page :3000, API :5000) — use NEXT_PUBLIC_API_BASE_URL when it points to the API host
 * - Single server (Express on :5000 + ngrok HTTPS) — use same origin (relative "") when env is http localhost behind https
 */
function resolveApiBaseUrl() {
  const raw = (process.env.NEXT_PUBLIC_API_BASE_URL || '').trim().replace(/\/$/, '');
  if (typeof window === 'undefined') {
    return raw;
  }
  if (!raw) {
    return '';
  }
  try {
    const envOrigin = new URL(raw).origin;
    if (envOrigin === window.location.origin) {
      return raw;
    }
  } catch {
    return raw;
  }
  // https page cannot call http://localhost (mixed content) — same Express serves /api on this host
  if (window.location.protocol === 'https:' && raw.startsWith('http:')) {
    return '';
  }
  // Team opened live URL but env still points at developer localhost — use current host
  const h = window.location.hostname;
  if (h !== 'localhost' && h !== '127.0.0.1' && /localhost|127\.0\.0\.1/i.test(raw)) {
    return '';
  }
  return raw;
}

const apiClient = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Read token from cookie first, then localStorage as fallback
function getToken() {
  return Cookies.get('token') || (typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null);
}

// Add token to requests
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      config.baseURL = resolveApiBaseUrl();
    } else {
      config.baseURL = (process.env.NEXT_PUBLIC_API_BASE_URL || '').trim().replace(/\/$/, '');
    }
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // For FormData (file uploads), remove Content-Type so the browser sets it
    // automatically with the correct multipart/form-data boundary.
    // If left as 'application/json', multer won't parse the files.
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle response errors
apiClient.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(
        `[API] ${(response.config.method || 'GET').toUpperCase()} ${response.config.url} → ${response.status}`
      );
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      const path = error.config?.url || '';
      const full = `${error.config?.baseURL || ''}${path}`;
      const isFailedLogin = path.includes('/api/auth/login') || full.includes('/api/auth/login');
      // Failed credential login returns 401 — do not wipe session or hard-redirect
      if (!isFailedLogin && typeof window !== 'undefined') {
        Cookies.remove('token');
        Cookies.remove('user');
        try {
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
        } catch { /* ignore */ }
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
