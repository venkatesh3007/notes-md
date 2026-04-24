import { useState, useCallback } from 'react';

const getServerUrl = () => {
  const saved = localStorage.getItem('serverUrl');
  return saved || 'http://localhost:3000';
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
      const res = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
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
