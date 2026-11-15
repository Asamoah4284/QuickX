import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const TOKEN_KEY = 'authToken';
const USER_KEY = 'user';
const ADMIN_TOKEN_KEY = 'adminToken';

export const session = {
  token: () => localStorage.getItem(TOKEN_KEY),
  user: () => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  },
  set(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event('auth-change'));
  },
  setUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event('auth-change'));
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new Event('auth-change'));
  },
  adminToken: () => localStorage.getItem(ADMIN_TOKEN_KEY),
};

/** Member API: sends the signed-in user's token when there is one. */
export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = session.token();
  if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const url = String(error.config?.url || '');
    const sentToken = Boolean(error.config?.headers?.Authorization);
    // An expired or invalid session: sign out so the UI stops pretending.
    if (status === 401 && sentToken && !/\/users\/(login|register)/.test(url)) {
      session.clear();
    }
    return Promise.reject(error);
  }
);

/** Admin API: sends the admin token. */
export const adminApi = axios.create({ baseURL: API_URL });

adminApi.interceptors.request.use((config) => {
  const token = session.adminToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

adminApi.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      localStorage.removeItem('admin');
      if (!window.location.pathname.startsWith('/admin/login')) {
        window.location.assign('/admin/login');
      }
    }
    return Promise.reject(error);
  }
);

/** Message to show a person when a request fails. */
export function errorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error?.response) return 'Cannot reach the server. Check your connection and try again.';
  return error.response.data?.message || fallback;
}
