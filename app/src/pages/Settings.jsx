import React, { useState } from 'react';
import { getServerUrlValue, setServerUrl } from '../hooks/useApi';

const styles = {
  container: { padding: '24px 16px', maxWidth: '500px' },
  label: { display: 'block', marginBottom: '8px', fontSize: '14px', color: '#8b949e' },
  input: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #30363d',
    background: '#161b22',
    color: '#c9d1d9',
    fontSize: '15px',
    marginBottom: '16px'
  },
  btn: {
    padding: '12px 24px',
    background: '#238636',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    cursor: 'pointer'
  },
  section: { marginBottom: '32px' },
  heading: { fontSize: '18px', marginBottom: '16px', color: '#e6edf3' }
};

export default function Settings() {
  const [serverUrl, setUrl] = useState(getServerUrlValue());
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setServerUrl(serverUrl);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const clearCache = () => {
    if (confirm('Clear all locally cached files?')) {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('vault:')) keys.push(key);
      }
      keys.forEach(k => localStorage.removeItem(k));
      alert('Cache cleared');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.section}>
        <h2 style={styles.heading}>Server</h2>
        <label style={styles.label}>Server URL</label>
        <input
          style={styles.input}
          value={serverUrl}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="http://localhost:3000"
        />
        <button style={styles.btn} onClick={handleSave}>
          {saved ? 'Saved!' : 'Save'}
        </button>
      </div>

      <div style={styles.section}>
        <h2 style={styles.heading}>Local Storage</h2>
        <p style={{ color: '#8b949e', marginBottom: '16px', fontSize: '14px' }}>
          Files synced from server are cached locally for offline access.
        </p>
        <button style={{...styles.btn, background: '#f85149'}} onClick={clearCache}>
          Clear Cache
        </button>
      </div>

      <div style={styles.section}>
        <h2 style={styles.heading}>About</h2>
        <p style={{ color: '#8b949e', fontSize: '14px' }}>
          Notes.md — Obsidian alternative with remote vault sync.<br />
          Version 1.0.0
        </p>
      </div>
    </div>
  );
}
