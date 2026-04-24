import React, { useState, useEffect } from 'react';

const styles = {
  container: { padding: '16px', background: '#0d1117', minHeight: '100vh', color: '#e6edf3' },
  header: { fontSize: '20px', marginBottom: '16px' },
  input: {
    width: '100%',
    padding: '12px',
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '8px',
    color: '#e6edf3',
    fontSize: '16px',
    marginBottom: '12px'
  },
  button: {
    padding: '12px 24px',
    background: '#238636',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    cursor: 'pointer',
    marginRight: '8px',
    marginBottom: '8px'
  },
  secondaryBtn: {
    padding: '12px 24px',
    background: '#1f6feb',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    cursor: 'pointer'
  },
  result: {
    padding: '12px',
    marginTop: '12px',
    borderRadius: '8px',
    fontSize: '14px',
    wordBreak: 'break-all'
  },
  success: { background: '#23863622', border: '1px solid #238636' },
  error: { background: '#da363322', border: '1px solid #da3633' },
  info: { background: '#1f6feb22', border: '1px solid #1f6feb' },
  label: { color: '#8b949e', fontSize: '14px', marginBottom: '4px', display: 'block' }
};

export default function Settings({ onBack }) {
  const [serverUrl, setServerUrl] = useState('http://139.59.57.222:3333');
  const [vaultId, setVaultId] = useState('positioning-research');
  const [testResult, setTestResult] = useState(null);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    loadSettings();
  }, []);

  function loadSettings() {
    try {
      const saved = localStorage.getItem('notes-md-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        setServerUrl(parsed.serverUrl || 'http://139.59.57.222:3333');
        setVaultId(parsed.vaultId || 'positioning-research');
      }
    } catch (e) {
      log('Load settings error: ' + e.message);
    }
  }

  function saveSettings() {
    localStorage.setItem('notes-md-settings', JSON.stringify({ serverUrl, vaultId }));
    log('Settings saved');
  }

  function log(msg) {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }

  async function testConnection() {
    setTestResult(null);
    log(`Testing: ${serverUrl}/health`);
    
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      
      const res = await fetch(`${serverUrl}/health`, {
        mode: 'cors',
        signal: controller.signal
      });
      clearTimeout(timeout);
      
      if (res.ok) {
        const data = await res.json();
        setTestResult({ type: 'success', text: `Connected! Server: ${data.vault}` });
        log('Connection OK: ' + JSON.stringify(data));
      } else {
        setTestResult({ type: 'error', text: `HTTP ${res.status}` });
        log('HTTP error: ' + res.status);
      }
    } catch (err) {
      setTestResult({ type: 'error', text: err.message || 'Failed to fetch' });
      log('Connection failed: ' + (err.message || 'Unknown'));
    }
  }

  async function testFiles() {
    setTestResult(null);
    log(`Testing files: ${serverUrl}/vault/${vaultId}/files`);
    
    try {
      const res = await fetch(`${serverUrl}/vault/${vaultId}/files`, { mode: 'cors' });
      if (res.ok) {
        const data = await res.json();
        const count = data.files?.length || 0;
        setTestResult({ type: 'success', text: `Found ${count} files` });
        log(`Files OK: ${count} files`);
      } else {
        setTestResult({ type: 'error', text: `HTTP ${res.status}` });
        log('Files error: ' + res.status);
      }
    } catch (err) {
      setTestResult({ type: 'error', text: err.message || 'Failed to fetch' });
      log('Files failed: ' + (err.message || 'Unknown'));
    }
  }

  return (
    <div style={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={styles.header}>Settings</h2>
        <button style={{...styles.secondaryBtn, padding: '8px 16px'}} onClick={onBack}>← Back</button>
      </div>

      <label style={styles.label}>Server URL</label>
      <input
        style={styles.input}
        value={serverUrl}
        onChange={e => setServerUrl(e.target.value)}
        placeholder="http://139.59.57.222:3333"
      />

      <label style={styles.label}>Vault ID</label>
      <input
        style={styles.input}
        value={vaultId}
        onChange={e => setVaultId(e.target.value)}
        placeholder="positioning-research"
      />

      <div>
        <button style={styles.button} onClick={saveSettings}>💾 Save</button>
        <button style={styles.secondaryBtn} onClick={testConnection}>🔌 Test Connection</button>
        <button style={{...styles.secondaryBtn, background: '#8957e5'}} onClick={testFiles}>📁 Test Files</button>
      </div>

      {testResult && (
        <div style={{...styles.result, ...styles[testResult.type]}}>
          {testResult.type === 'success' ? '✅ ' : '❌ '}{testResult.text}
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        <label style={styles.label}>Debug Logs</label>
        <div style={{...styles.result, ...styles.info, fontFamily: 'monospace', fontSize: '12px', maxHeight: '200px', overflow: 'auto'}}>
          {logs.length === 0 ? 'No logs yet. Press Test Connection.' : logs.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      </div>
    </div>
  );
}
