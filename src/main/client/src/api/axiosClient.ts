import axios from 'axios';
import { Env } from '../Env';

const rawBaseUrl = (Env.API_BASE_URL || '/api').trim();
const baseURL =
  rawBaseUrl.startsWith('http://') ||
  rawBaseUrl.startsWith('https://') ||
  rawBaseUrl.startsWith('/')
    ? rawBaseUrl
    : `/${rawBaseUrl}`;

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

export default api;
