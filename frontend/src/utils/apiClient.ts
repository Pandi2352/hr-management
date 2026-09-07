import axios, {
  type AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('peopleos_access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Requests that 401'd while a refresh was already in flight wait here. */
let refreshPromise: Promise<string> | null = null;

/** Endpoints that must never trigger a refresh attempt (avoids recursion). */
const NO_REFRESH_PATHS = ['/auth/login', '/auth/refresh', '/auth/logout'];

function clearSession() {
  localStorage.removeItem('peopleos_access_token');
  localStorage.removeItem('peopleos_user');
}

function redirectToLogin() {
  if (window.location.pathname.startsWith('/auth')) return;
  const currentPath = window.location.pathname + window.location.search;
  window.location.href = `/auth/login?sessionExpired=true&redirect=${encodeURIComponent(currentPath)}`;
}

/**
 * Exchanges the httpOnly refresh cookie for a new access token.
 * A bare axios call is used so this request skips the interceptors below.
 */
async function requestRefreshedToken(): Promise<string> {
  const res = await axios.post(
    `${API_BASE_URL}/auth/refresh`,
    {},
    { withCredentials: true, headers: { 'Content-Type': 'application/json' } },
  );

  const data = res.data?.data;
  const accessToken: string | undefined = data?.accessToken;
  if (!accessToken) throw new Error('Refresh response contained no access token');

  localStorage.setItem('peopleos_access_token', accessToken);
  if (data?.user) localStorage.setItem('peopleos_user', JSON.stringify(data.user));

  return accessToken;
}

apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || !error.response) return Promise.reject(error);

    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const status = error.response.status;
    const url = original?.url ?? '';

    const isRefreshable =
      status === 401 &&
      original &&
      !original._retried &&
      !NO_REFRESH_PATHS.some((path) => url.includes(path));

    if (!isRefreshable) {
      if (status === 401 && !NO_REFRESH_PATHS.some((path) => url.includes(path))) {
        clearSession();
        redirectToLogin();
      }
      return Promise.reject(error);
    }

    original._retried = true;

    try {
      // Concurrent 401s share one refresh rather than each rotating the token —
      // parallel rotations would invalidate each other.
      refreshPromise = refreshPromise ?? requestRefreshedToken().finally(() => {
        refreshPromise = null;
      });

      const accessToken = await refreshPromise;

      original.headers = original.headers ?? {};
      (original.headers as Record<string, string>).Authorization = `Bearer ${accessToken}`;
      return apiClient(original);
    } catch (refreshError) {
      clearSession();
      redirectToLogin();
      return Promise.reject(refreshError as AxiosError);
    }
  },
);
