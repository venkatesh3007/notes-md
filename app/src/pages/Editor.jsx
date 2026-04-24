import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useApi } from '../hooks/useApi';
import { getLocalFile, setLocalFile } from '../hooks/useLocalStore';

const styles = {
  container: { height: '100%', display: 'flex', flexDirection: 'column' },
  toolbar: {
    padding: '8px 16px',
    borderBottom: '1px solid #30363d',
    display: 'flex',
    gap: '8px',
    background: '#161b22'
  },
  btn: {
    padding: '6px 14px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '13px',
    cursor: 'pointer'
  },
  btnPrimary: { background: '#238636', color: '#fff' },
  btnSecondary: { background: '#30363d', color: '#c9d1d9' },
  editorArea: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden'
  },
  textarea: {
    flex: 1,
    padding: '16px',
    background: '#0d1117',
    color: '#c9d1d9',
    border: 'none',
    fontFamily: 'monospace',
    fontSize: '15px',
    lineHeight: 1.6,
    resize: 'none',
    outline: 'none'
  },
  preview: {
    flex: 1,
    padding: '16px',
    overflow: 'auto',
    borderLeft: '1px solid #30363d',
    fontSize: '15px',
    lineHeight: 1.6
  },
  filePath: {
    padding: '8px 16px',
    fontSize: '13px',
    color: '#8b949e',
    borderBottom: '1px solid #21262d'
  }
};

export default function Editor({ vault, file }) {
  const [content, setContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [mode, setMode] = useState('split'); // edit, preview, split
  const [saving, setSaving] = useState(false);
  const { request } = useApi();

  useEffect(() => {
    if (vault && file) loadFile();
  }, [vault, file]);

  const loadFile = async () => {
    // Check local cache first
    const local = getLocalFile(vault.name, file.path);
    if (local) {
      setContent(local.content);
      setOriginalContent(local.content);
      return;
    }

    // Fetch from server
    try {
      const data = await request(`/api/vaults/${vault.name}/files/${file.path}`);
      setContent(data.content);
      setOriginalContent(data.content);
      // Cache locally
      setLocalFile(vault.name, file.path, data.content, data.modified);
    } catch (e) {
      setContent('# Error loading file');
    }
  };

  const saveFile = async () => {
    setSaving(true);
    try {
      await request(`/api/vaults/${vault.name}/files/${file.path}`, {
        method: 'PUT',
        body: JSON.stringify({ content })
      });
      setOriginalContent(content);
      setLocalFile(vault.name, file.path, content, new Date());
    } catch (e) {
      // Save locally even if server fails
      setLocalFile(vault.name, file.path, content, new Date());
      alert('Saved locally. Will sync when connected.');
    }
    setSaving(false);
  };

  const isDirty = content !== originalContent;

  if (!vault || !file) return <div style={styles.container}>Select a file</div>;

  return (
    <div style={styles.container}>
      <div style={styles.filePath}>
        {vault.name} / {file.path}
        {isDirty && <span style={{ color: '#f85149', marginLeft: '8px' }}>● unsaved</span>}
      </div>
      <div style={styles.toolbar}>
        <button style={{...styles.btn, ...styles.btnSecondary}} onClick={() => setMode('edit')}>Edit</button>
        <button style={{...styles.btn, ...styles.btnSecondary}} onClick={() => setMode('preview')}>Preview</button>
        <button style={{...styles.btn, ...styles.btnSecondary}} onClick={() => setMode('split')}>Split</button>
        <div style={{ flex: 1 }}></div>
        <button style={{...styles.btn, ...styles.btnPrimary}} onClick={saveFile} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
      <div style={styles.editorArea}>
        {(mode === 'edit' || mode === 'split') && (
          <textarea
            style={{...styles.textarea, ...(mode === 'edit' ? {} : { flex: 0.5 })}}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="# Start writing..."
          />
        )}
        {(mode === 'preview' || mode === 'split') && (
          <div style={{...styles.preview, ...(mode === 'preview' ? {} : { flex: 0.5 })}}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content || '*Empty file*'}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
