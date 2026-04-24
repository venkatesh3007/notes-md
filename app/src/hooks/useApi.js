import { useState, useCallback } from 'react';

const getServerUrl = () => {
  const saved = localStorage.getItem('serverUrl');
  return saved || 'http://139.59.57.222:3000';
};

export const setServerUrl = (url) => {
  localStorage.setItem('serverUrl', url);
};

export const getServerUrlValue = getServerUrl;

// Simple fetch with timeout
const fetchWithTimeout = async (url, options = {}, timeout = 10000) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    clearTimeout(id);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch (err) {
    clearTimeout(id);
    if (err.name === 'AbortError') throw new Error('Request timed out');
    throw err;
  }
};

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (endpoint, options = {}) => {
    setLoading(true);
    setError(null);
    try {
      const url = `${getServerUrl()}${endpoint}`;
      const data = await fetchWithTimeout(url, options);
      setLoading(false);
      return data;
    } catch (err) {
      const msg = err.message || 'Network error';
      setError(msg);
      setLoading(false);
      throw err;
    }
  }, []);

  return { request, loading, error };
}
