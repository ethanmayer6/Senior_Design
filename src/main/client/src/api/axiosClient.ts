import axios from 'axios';
import { Env } from '../Env';

const rawBaseUrl = (Env.API_BASE_URL || '/api').trim();
const baseURL =
  rawBaseUrl.startsWith('http://') ||
  rawBaseUrl.startsWith('https://') ||
  rawBaseUrl.startsWith('/')
    ? rawBaseUrl
    : `/${rawBaseUrl}`;

const AUTH_ROUTES = ['/login', '/register'];

function isAuthRoute(pathname: string): boolean {
  const normalizedPath = pathname.toLowerCase();
  return AUTH_ROUTES.some((route) => normalizedPath === route || normalizedPath.startsWith(`${route}/`));
}

const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      if (!isAuthRoute(window.location.pathname)) {
        window.location.assign('/login');
      }
    }

    return Promise.reject(error);
  }
);

export default api;
