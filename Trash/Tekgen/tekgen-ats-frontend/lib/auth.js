import Cookies from 'js-cookie';

const COOKIE_OPTS = { expires: 7, sameSite: 'strict' };

export const setAuthToken = (token, user) => {
  Cookies.set('token', token, COOKIE_OPTS);
  Cookies.set('user', JSON.stringify(user), COOKIE_OPTS);
  try {
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(user));
  } catch { /* localStorage blocked in private mode */ }
};

export const getAuthToken = () => {
  return Cookies.get('token') || (typeof localStorage !== 'undefined' ? localStorage.getItem('authToken') : null);
};

export const getUser = () => {
  try {
    const raw = Cookies.get('user') || (typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const clearAuth = () => {
  Cookies.remove('token');
  Cookies.remove('user');
  try {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  } catch { /* ignore */ }
};

export const isAuthenticated = () => {
  return !!getAuthToken();
};
