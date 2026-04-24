import React, { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { getLocalFiles } from '../hooks/useLocalStore';

const styles = {
  container: { padding: '16px', overflow: 'auto', height: '100%' },
  fileItem: {
    padding: '12px 16px',
    borderBottom: '1px solid #21262d',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer'
  },
  icon: { fontSize: '20px', width: '24px', textAlign: 'center' },
  fileName: { flex: 1, fontSize: '15px' },
  fileMeta: { fontSize: '12px', color: '#8b949e' },
  localBadge: {
    padding: '2px 8px',
    background: '#238636',
    color: '#fff',
    borderRadius: '4px',
    fontSize: '11px'
  }
};

export default function FileBrowser({ vault, onOpen }) {
  const [files, setFiles] = useState([]);
  const [localFiles, setLocalFiles] = useState([]);
  const { request, loading } = useApi();

  useEffect(() => {
    if (vault) loadFiles();
  }, [vault]);

  const loadFiles = async () => {
    try {
      const data = await request(`/api/vaults/${vault.name}/files`);
      setFiles(data.files || []);
      setLocalFiles(getLocalFiles(vault.name));
    } catch (e) {
      console.error(e);
    }
  };

  const isLocal = (path) => localFiles.some(f => f.path === path);

  const getFileIcon = (name, type) => {
    if (type === 'directory') return '📁';
    if (name.endsWith('.md')) return '📝';
    return '📄';
  };

  if (!vault) return <div style={styles.container}>Select a vault</div>;

  return (
    <div style={styles.container}>
      <h2 style={{ fontSize: '18px', marginBottom: '16px', color: '#e6edf3' }}>
        {vault.name}
      </h2>
      {files.map(file => (
        <div key={file.path} style={styles.fileItem} onClick={() => onOpen(file)}>
          <span style={styles.icon}>{getFileIcon(file.name, file.type)}</span>
          <div style={{ flex: 1 }}>
            <div style={styles.fileName}>{file.name}</div>
            <div style={styles.fileMeta}>
              {file.type === 'file' && `${(file.size / 1024).toFixed(1)} KB • `}
              {new Date(file.modified).toLocaleDateString()}
            </div>
          </div>
          {isLocal(file.path) && <span style={styles.localBadge}>local</span>}
        </div>
      ))}
    </div>
  );
}
