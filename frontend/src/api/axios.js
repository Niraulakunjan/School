import axios from 'axios';
import { getTenantFromSubdomain } from '../utils/tenant';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request Interceptor — attach token and tenant
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;

  if (!config.headers['X-Tenant']) {
    const tenant = getTenantFromSubdomain();
    if (tenant) config.headers['X-Tenant'] = tenant;
  }
  return config;
}, (error) => Promise.reject(error));

// Response Interceptor — auto-refresh on 401
let isRefreshing = false;
let queue = [];

const processQueue = (error, token = null) => {
  queue.forEach(({ resolve, reject }) => error ? reject(error) : resolve(token));
  queue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) return Promise.reject(error);

    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) { localStorage.clear(); window.location.href = '/login'; return Promise.reject(error); }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queue.push({ resolve, reject });
      }).then(token => {
        original.headers['Authorization'] = `Bearer ${token}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      const res = await axios.post(
        import.meta.env.VITE_API_URL + '/token/refresh/',
        { refresh: refreshToken }
      );
      const newToken = res.data.access;
      localStorage.setItem('access_token', newToken);
      api.defaults.headers['Authorization'] = `Bearer ${newToken}`;
      processQueue(null, newToken);
      original.headers['Authorization'] = `Bearer ${newToken}`;
      return api(original);
    } catch (err) {
      processQueue(err, null);
      localStorage.clear();
      window.location.href = '/login';
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
