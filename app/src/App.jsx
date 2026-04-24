import React, { useState } from 'react';
import VaultList from './pages/VaultList';
import Editor from './pages/Editor';
import Settings from './pages/Settings';

const styles = {
  app: { 
    height: '100vh', 
    width: '100vw',
    background: '#0d1117',
    color: '#c9d1d9',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  }
};

export default function App() {
  const [currentView, setCurrentView] = useState('vault'); // vault, editor, settings
  const [selectedFile, setSelectedFile] = useState(null);
  
  const vaultId = 'positioning-research';

  function handleOpenFile(file) {
    setSelectedFile(file);
    setCurrentView('editor');
  }

  function handleBack() {
    setCurrentView('vault');
    setSelectedFile(null);
  }

  return (
    <div style={styles.app}>
      {currentView === 'vault' && (
        <VaultList 
          vaultId={vaultId} 
          onOpenFile={handleOpenFile}
          onSettings={() => setCurrentView('settings')}
        />
      )}
      
      {currentView === 'editor' && selectedFile && (
        <Editor
          vaultId={vaultId}
          filePath={selectedFile.path}
          onBack={handleBack}
        />
      )}

      {currentView === 'settings' && (
        <Settings onBack={() => setCurrentView('vault')} />
      )}
    </div>
  );
}
