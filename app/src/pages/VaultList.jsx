import React, { useState, useEffect } from 'react';
import { db } from '../lib/db';
import { P2PClient } from '../lib/p2p';

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

export default function VaultList({ vaultId, onOpenFile }) {
  const [files, setFiles] = useState([]);
  const [syncStatus, setSyncStatus] = useState('offline'); // offline, connecting, syncing, synced
  const [syncProgress, setSyncProgress] = useState('');
  const [p2p, setP2p] = useState(null);
  const [pendingFiles, setPendingFiles] = useState([]);

  useEffect(() => {
    initVault();
    return () => {
      if (p2p) p2p.stop();
    };
  }, [vaultId]);

  async function initVault() {
    try {
      // Init DB
      await db.init();
      
      // Save vault
      await db.saveVault({
        id: vaultId,
        name: vaultId,
        createdAt: new Date().toISOString()
      });
      
      // Load local files
      const localFiles = await db.getFiles(vaultId);
      setFiles(localFiles);
      
      // Start P2P
      const peerId = `mobile-${Date.now()}`;
      const client = new P2PClient(vaultId, peerId);
      
      client.onConnect = (peerId) => {
        setSyncStatus('syncing');
        setSyncProgress('Connected to server, fetching file list...');
      };
      
      client.onManifest = (peerId, manifest) => {
        handleManifest(client, manifest);
      };
      
      client.onFile = (peerId, fileData) => {
        handleReceivedFile(fileData);
      };
      
      await client.start();
      setP2p(client);
      setSyncStatus('connecting');
      setSyncProgress('Looking for server...');
    } catch (err) {
      console.error('Init error:', err);
      setSyncStatus('offline');
    }
  }

  async function handleManifest(client, manifest) {
    const localFiles = await db.getFiles(vaultId);
    const localMap = new Map(localFiles.map(f => [f.path, f]));
    
    const needed = manifest.filter(file => {
      const local = localMap.get(file.path);
      return !local || new Date(file.modified) > new Date(local.modified);
    });
    
    if (needed.length === 0) {
      setSyncStatus('synced');
      setSyncProgress('Up to date');
      return;
    }
    
    setPendingFiles(needed);
    setSyncProgress(`Syncing ${needed.length} files...`);
    
    // Request each file from the server peer
    for (const file of needed) {
      const serverPeer = Array.from(client.connectedPeers).find(id => id.startsWith('server-'));
      if (serverPeer) {
        client.requestFile(serverPeer, file.path);
      }
    }
  }

  async function handleReceivedFile(fileData) {
    await db.saveFile(vaultId, fileData.path, fileData.content, fileData.modified);
    
    setPendingFiles(prev => {
      const remaining = prev.filter(f => f.path !== fileData.path);
      if (remaining.length === 0) {
        setSyncStatus('synced');
        setSyncProgress('Sync complete');
      } else {
        setSyncProgress(`Syncing... ${remaining.length} remaining`);
      }
      return remaining;
    });
    
    // Refresh file list
    const updated = await db.getFiles(vaultId);
    setFiles(updated);
  }

  async function manualSync() {
    if (!p2p) return;
    setSyncStatus('connecting');
    setSyncProgress('Searching for peers...');
    
    const peers = await p2p.discover();
    for (const peer of peers) {
      if (peer.deviceType === 'server') {
        await p2p.connectToPeer(peer.peerId);
      }
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
          <span style={{...styles.status, ...statusStyle}}>
            {syncStatus}
          </span>
        </div>
      </div>
      
      {syncProgress && (
        <div style={styles.progress}>{syncProgress}</div>
      )}
      
      <button style={styles.syncButton} onClick={manualSync}>
        ↻ Sync Now
      </button>
      
      <div style={{ marginTop: '16px' }}>
        {files.length === 0 ? (
          <div style={styles.empty}>
            No files yet.<br />
            Press "Sync Now" to fetch from server.
          </div>
        ) : (
          files.map(file => (
            <div key={file.id} style={styles.fileCard} onClick={() => onOpenFile(file)}>
              <div style={styles.fileName}>{file.path}</div>
              <div style={styles.fileMeta}>
                {new Date(file.modified).toLocaleDateString()} • 
                {(file.content?.length || 0).toLocaleString()} chars
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
