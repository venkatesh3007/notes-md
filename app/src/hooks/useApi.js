import { useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';

const getServerUrl = () => {
  const saved = localStorage.getItem('serverUrl');
  return saved || 'http://139.59.57.222:3000';
};

export const setServerUrl = (url) => {
  localStorage.setItem('serverUrl', url);
};

export const getServerUrlValue = getServerUrl;

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (endpoint, options = {}) => {
    setLoading(true);
    setError(null);
    try {
      const url = `${getServerUrl()}${endpoint}`;
      
      let data;
      if (Capacitor.isNativePlatform()) {
        // Native HTTP - no CORS issues
        const { CapacitorHttp } = await import('@capacitor/core');
        const response = await CapacitorHttp.request({
          url,
          method: (options.method || 'GET').toUpperCase(),
          headers: {
            'Content-Type': 'application/json',
            ...options.headers
          },
          data: options.body ? JSON.parse(options.body) : undefined
        });
        if (response.status < 200 || response.status >= 300) {
          throw new Error(`HTTP ${response.status}`);
        }
        data = response.data;
      } else {
        // Web fetch
        const res = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers
          }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        data = await res.json();
      }
      
      setLoading(false);
      return data;
    } catch (err) {
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, []);

  return { request, loading, error };
}
