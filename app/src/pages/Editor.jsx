import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { db } from '../lib/db';

const styles = {
  container: { 
    display: 'flex', 
    flexDirection: 'column', 
    height: '100%',
    background: '#0d1117'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #30363d',
    background: '#161b22'
  },
  title: { 
    fontSize: '16px', 
    color: '#e6edf3', 
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  backButton: {
    padding: '6px 12px',
    background: 'transparent',
    color: '#58a6ff',
    border: '1px solid #30363d',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    marginRight: '12px'
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '16px',
    color: '#c9d1d9',
    lineHeight: '1.6'
  },
  markdown: {
    fontSize: '15px'
  }
};

export default function Editor({ vaultId, filePath, onBack }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFile();
  }, [vaultId, filePath]);

  async function loadFile() {
    try {
      setLoading(true);
      const file = await db.getFile(vaultId, filePath);
      if (file) {
        setContent(file.content);
      } else {
        setContent('# File not found\n\nThis file has not been synced yet.');
      }
    } catch (err) {
      setContent('# Error\n\nFailed to load file.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <button style={styles.backButton} onClick={onBack}>← Back</button>
          <h3 style={styles.title}>{filePath}</h3>
        </div>
      </div>
      
      <div style={styles.content}>
        {loading ? (
          <div style={{ color: '#8b949e', textAlign: 'center', padding: '40px' }}>
            Loading...
          </div>
        ) : (
          <div style={styles.markdown}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
