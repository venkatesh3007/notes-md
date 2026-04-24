import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { SyncClient } from '../lib/sync';

const styles = {
  container: { padding: '16px', overflow: 'auto', height: '100%', background: '#0d1117' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  title: { fontSize: '20px', color: '#e6edf3', margin: 0 },
  status: { fontSize: '12px', padding: '4px 8px', borderRadius: '12px', color: '#fff' },
  statusConnected: { background: '#238636' },
  statusSyncing: { background: '#1f6feb' },
  statusOffline: { background: '#6e7681' },
  fileCard: {
    padding: '12px',
    marginBottom: '8px',
    background: '#161b22',
    borderRadius: '8px',
    border: '1px solid #30363d',
    cursor: 'pointer'
  },
  fileName: { fontSize: '15px', fontWeight: 500, color: '#58a6ff', marginBottom: '4px' },
  fileMeta: { fontSize: '12px', color: '#8b949e' },
  syncButton: {
    padding: '8px 16px',
    background: '#1f6feb',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer'
  },
  empty: { color: '#8b949e', textAlign: 'center', padding: '40px' },
  progress: { color: '#8b949e', textAlign: 'center', padding: '20px' }
};

export default function VaultList({ vaultId, onOpenFile, onSettings }) {
  const [files, setFiles] = useState([]);
  const [syncStatus, setSyncStatus] = useState('offline');
  const [syncProgress, setSyncProgress] = useState('');
  const [syncClient, setSyncClient] = useState(null);

  useEffect(() => {
    initVault();
    return () => {
      if (syncClient) syncClient.stop();
    };
  }, [vaultId]);

  async function initVault() {
    try {
      await db.init();
      await db.saveVault({ id: vaultId, name: vaultId });
      
      // Load local files
      const localFiles = await db.getFiles(vaultId);
      setFiles(localFiles);
      
      // Start sync
      const client = new SyncClient(vaultId);
      client.onFilesUpdated = (serverFiles) => {
        syncFiles(client, serverFiles);
      };
      
      setSyncClient(client);
      setSyncStatus('connecting');
      setSyncProgress('Connecting to server...');
      
      // Check health then sync
      const healthy = await client.checkHealth();
      if (healthy) {
        await client.sync();
        client.start();
      } else {
        setSyncStatus('offline');
        setSyncProgress('Server offline. Showing cached files.');
      }
    } catch (err) {
      console.error('Init error:', err);
      setSyncStatus('offline');
      setSyncProgress(err.message);
    }
  }

  async function syncFiles(client, serverFiles) {
    setSyncStatus('syncing');
    setSyncProgress(`Found ${serverFiles.length} files. Syncing...`);
    
    const localFiles = await db.getFiles(vaultId);
    const localMap = new Map(localFiles.map(f => [f.path, f]));
    
    let synced = 0;
    for (const file of serverFiles) {
      const local = localMap.get(file.path);
      const needsUpdate = !local || new Date(file.modified) > new Date(local.modified);
      
      if (needsUpdate) {
        try {
          const fileData = await client.fetchFile(file.path);
          await db.saveFile(vaultId, fileData.path, fileData.content, fileData.modified);
          synced++;
          setSyncProgress(`Synced ${synced}/${serverFiles.length} files...`);
        } catch (err) {
          console.error(`Failed to sync ${file.path}:`, err);
        }
      }
    }
    
    // Refresh
    const updated = await db.getFiles(vaultId);
    setFiles(updated);
    setSyncStatus('synced');
    setSyncProgress(synced > 0 ? `Synced ${synced} files` : 'Up to date');
  }

  async function manualSync() {
    if (!syncClient) return;
    setSyncStatus('syncing');
    setSyncProgress('Syncing...');
    try {
      const files = await syncClient.sync();
      await syncFiles(syncClient, files);
    } catch (err) {
      setSyncStatus('offline');
      setSyncProgress(`Error: ${err.message || 'Failed to fetch'}`);
    }
  }

  const statusStyle = syncStatus === 'synced' ? styles.statusConnected :
                      syncStatus === 'syncing' ? styles.statusSyncing :
                      styles.statusOffline;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>{vaultId}</h2>
        <div>
          <span style={{...styles.status, ...statusStyle, marginRight: '8px'}}>{syncStatus}</span>
          <button style={{...styles.syncButton, padding: '6px 12px', fontSize: '12px'}} onClick={onSettings}>⚙️</button>
        </div>
      </div>
      
      {syncProgress && <div style={styles.progress}>{syncProgress}</div>}
      
      <button style={styles.syncButton} onClick={manualSync}>↻ Sync Now</button>
      
      <div style={{ marginTop: '16px' }}>
        {files.length === 0 ? (
          <div style={styles.empty}>
            No files yet.<br />Press "Sync Now" to fetch from server.
          </div>
        ) : (
          files.map(file => (
            <div key={file.id} style={styles.fileCard} onClick={() => onOpenFile(file)}>
              <div style={styles.fileName}>{file.path}</div>
              <div style={styles.fileMeta}>
                {new Date(file.modified).toLocaleDateString()} • {(file.content?.length || 0).toLocaleString()} chars
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
