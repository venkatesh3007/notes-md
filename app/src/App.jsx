import React, { useState, useEffect } from 'react';
import VaultList from './pages/VaultList';
import FileBrowser from './pages/FileBrowser';
import Editor from './pages/Editor';
import Settings from './pages/Settings';

const styles = {
  app: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#0d1117',
    color: '#c9d1d9'
  },
  header: {
    padding: '12px 16px',
    borderBottom: '1px solid #30363d',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#161b22'
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#58a6ff'
  },
  nav: {
    display: 'flex',
    gap: '8px'
  },
  navBtn: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: 'none',
    background: 'transparent',
    color: '#8b949e',
    fontSize: '14px',
    cursor: 'pointer'
  },
  navBtnActive: {
    background: '#238636',
    color: '#fff'
  },
  content: {
    flex: 1,
    overflow: 'hidden'
  }
};

export default function App() {
  const [view, setView] = useState('vaults');
  const [currentVault, setCurrentVault] = useState(null);
  const [currentFile, setCurrentFile] = useState(null);

  const openVault = (vault) => {
    setCurrentVault(vault);
    setView('files');
  };

  const openFile = (file) => {
    setCurrentFile(file);
    setView('editor');
  };

  const goBack = () => {
    if (view === 'editor') setView('files');
    else if (view === 'files') setView('vaults');
  };

  return (
    <div style={styles.app}>
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {(view === 'files' || view === 'editor') && (
            <button onClick={goBack} style={{
              ...styles.navBtn, padding: '6px 10px'
            }}>←</button>
          )}
          <span style={styles.title}>Notes.md</span>
        </div>
        <div style={styles.nav}>
          <button 
            onClick={() => setView('vaults')}
            style={{...styles.navBtn, ...(view === 'vaults' ? styles.navBtnActive : {})}}
          >Vaults</button>
          <button 
            onClick={() => setView('settings')}
            style={{...styles.navBtn, ...(view === 'settings' ? styles.navBtnActive : {})}}
          >⚙</button>
        </div>
      </div>
      <div style={styles.content}>
        {view === 'vaults' && <VaultList onOpen={openVault} />}
        {view === 'files' && <FileBrowser vault={currentVault} onOpen={openFile} />}
        {view === 'editor' && <Editor vault={currentVault} file={currentFile} />}
        {view === 'settings' && <Settings />}
      </div>
    </div>
  );
}
