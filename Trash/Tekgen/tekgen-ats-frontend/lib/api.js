import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
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
      // Clear auth data and redirect to login
      Cookies.remove('token');
      Cookies.remove('user');
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
