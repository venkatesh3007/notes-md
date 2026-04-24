// Simple file server for vault sync
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.SYNC_PORT || 3333;
const VAULT_PATH = process.env.VAULT_PATH || './vaults';
const vaultPath = path.resolve(VAULT_PATH);

// List all files in vault
app.get('/vault/:vaultId/files', (req, res) => {
  try {
    const files = [];
    function scanDir(dir, baseDir = '') {
      const entries = fs.readdirSync(dir);
      for (const entry of entries) {
        if (entry.startsWith('.')) continue;
        const fullPath = path.join(dir, entry);
        const relativePath = path.join(baseDir, entry);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          scanDir(fullPath, relativePath);
        } else if (entry.endsWith('.md')) {
          files.push({
            path: relativePath,
            modified: stat.mtime.toISOString(),
            size: stat.size
          });
        }
      }
    }
    scanDir(vaultPath);
    res.json({ files });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a specific file — use query param for path
app.get('/vault/:vaultId/file', (req, res) => {
  try {
    const filePath = path.join(vaultPath, req.query.path || '');
    if (!filePath.startsWith(vaultPath)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    const stat = fs.statSync(filePath);
    res.json({
      path: req.query.path,
      content,
      modified: stat.mtime.toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', vault: vaultPath });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Vault sync server running on http://0.0.0.0:${PORT}`);
  console.log(`Serving: ${vaultPath}`);
});
