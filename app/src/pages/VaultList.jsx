import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

const styles = {
  container: { padding: '16px', overflow: 'auto', height: '100%' },
  vaultCard: {
    padding: '16px',
    marginBottom: '12px',
    background: '#161b22',
    borderRadius: '12px',
    border: '1px solid #30363d',
    cursor: 'pointer'
  },
  vaultName: { fontSize: '16px', fontWeight: 600, color: '#58a6ff', marginBottom: '4px' },
  vaultMeta: { fontSize: '13px', color: '#8b949e' },
  syncBtn: {
    marginTop: '12px',
    padding: '8px 16px',
    background: '#238636',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    width: '100%'
  },
  syncBtnDisabled: {
    background: '#30363d',
    color: '#8b949e',
    cursor: 'not-allowed'
  },
  error: { color: '#f85149', padding: '12px', textAlign: 'center' },
  empty: { color: '#8b949e', textAlign: 'center', padding: '40px' }
};

export default function VaultList({ onOpen }) {
  const [vaults, setVaults] = useState([]);
  const [syncing, setSyncing] = useState({});
  const { request, loading, error } = useApi();

  useEffect(() => {
    loadVaults();
  }, []);

  const loadVaults = async () => {
    try {
      const data = await request('/api/vaults');
      setVaults(data.vaults || []);
    } catch (e) {
      console.error(e);
    }
  };

  const syncVault = async (vault, e) => {
    e.stopPropagation();
    setSyncing({ ...syncing, [vault.name]: true });
    try {
      const data = await request(`/api/vaults/${vault.name}/sync`, { method: 'POST' });
      // Store synced files locally
      if (data.files) {
        data.files.forEach(file => {
          localStorage.setItem(
            `vault:${vault.name}:file:${file.path}`,
            JSON.stringify({ content: file.content, modified: file.modified })
          );
        });
        alert(`Synced ${data.files.length} files`);
      }
    } catch (e) {
      alert('Sync failed: ' + e.message);
    }
    setSyncing({ ...syncing, [vault.name]: false });
  };

  if (error) return <div style={styles.error}>Error: {error}</div>;

  return (
    <div style={styles.container}>
      <h2 style={{ fontSize: '20px', marginBottom: '16px', color: '#e6edf3' }}>Vaults</h2>
      {vaults.length === 0 && !loading && (
        <div style={styles.empty}>
          No vaults found.<br />
          Check server connection in Settings.
        </div>
      )}
      {vaults.map(vault => (
        <div key={vault.name} style={styles.vaultCard} onClick={() => onOpen(vault)}>
          <div style={styles.vaultName}>{vault.name}</div>
          <div style={styles.vaultMeta}>
            {vault.path}<br />
            Modified: {new Date(vault.modified).toLocaleDateString()}
          </div>
          <button
            style={{...styles.syncBtn, ...(syncing[vault.name] ? styles.syncBtnDisabled : {})}}
            onClick={(e) => syncVault(vault, e)}
            disabled={syncing[vault.name]}
          >
            {syncing[vault.name] ? '⟳ Syncing...' : '↻ Sync Now'}
          </button>
        </div>
      ))}
    </div>
  );
}
