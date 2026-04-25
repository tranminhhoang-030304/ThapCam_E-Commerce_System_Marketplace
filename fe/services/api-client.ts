import axios, { AxiosInstance, AxiosError } from 'axios';
import Cookies from 'js-cookie';
import { API_BASE_URL, STORAGE_KEYS, ROUTES } from '@/lib/constants';

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Add Authorization header
apiClient.interceptors.request.use(
  (config) => {
    // Try to get token from cookie first, fallback to localStorage
    let token = Cookies.get(STORAGE_KEYS.AUTH_TOKEN);
    
    if (!token && typeof window !== 'undefined') {
      token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) || undefined;
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      // Clear auth tokens
      Cookies.remove(STORAGE_KEYS.AUTH_TOKEN);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER_DATA);
      }

      // Redirect to login if not already there
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth/login')) {
        window.location.href = ROUTES.LOGIN;
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Set auth token (store in both cookie and localStorage for flexibility)
 */
export function setAuthToken(token: string) {
  Cookies.set(STORAGE_KEYS.AUTH_TOKEN, token, {
    secure: true,
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
  
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  }
}

/**
 * Clear auth token
 */
export function clearAuthToken() {
  Cookies.remove(STORAGE_KEYS.AUTH_TOKEN);
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
  }
}

/**
 * Get auth token
 */
export function getAuthToken(): string | null {
  let token = Cookies.get(STORAGE_KEYS.AUTH_TOKEN);
  
  if (!token && typeof window !== 'undefined') {
    token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) || undefined;
  }

  return token || null;
}
