import { useState, useEffect } from 'react';
import { apiClient } from '../utils/apiClient';

/**
 * Global HTTP loading indicator state listener.
 * Tracks active in-flight requests made via apiClient.
 */
let activeRequests = 0;
const listeners = new Set<(isLoading: boolean) => void>();

function notifyListeners() {
  const isLoading = activeRequests > 0;
  listeners.forEach((listener) => listener(isLoading));
}

// Request interceptor: Increment counter on every outgoing API call
apiClient.interceptors.request.use(
  (config) => {
    // Optional bypass flag if a background poll shouldn't trigger top bar
    if (!(config as any).skipGlobalLoader) {
      activeRequests += 1;
      notifyListeners();
    }
    return config;
  },
  (error) => {
    activeRequests = Math.max(0, activeRequests - 1);
    notifyListeners();
    return Promise.reject(error);
  }
);

// Response interceptor: Decrement counter on resolution or rejection
apiClient.interceptors.response.use(
  (response) => {
    if (!(response.config as any)?.skipGlobalLoader) {
      activeRequests = Math.max(0, activeRequests - 1);
      notifyListeners();
    }
    return response;
  },
  (error) => {
    if (!(error.config as any)?.skipGlobalLoader) {
      activeRequests = Math.max(0, activeRequests - 1);
      notifyListeners();
    }
    return Promise.reject(error);
  }
);

export function useGlobalLoading(): boolean {
  const [loading, setLoading] = useState<boolean>(activeRequests > 0);

  useEffect(() => {
    listeners.add(setLoading);
    return () => {
      listeners.delete(setLoading);
    };
  }, []);

  return loading;
}
