const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');

const app = express();
const PORT = process.env.PORT || 3000;
const VAULTS_DIR = process.env.VAULTS_DIR || path.join(__dirname, 'vaults');

app.use(cors());

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Origin: ${req.headers.origin || "none"}`);
  next();
});
app.use(express.json({ limit: '10mb' }));

// Ensure vaults directory exists
if (!fs.existsSync(VAULTS_DIR)) {
  fs.mkdirSync(VAULTS_DIR, { recursive: true });
}

// Link the positioning reasoning folder as a vault
const REASONING_LINK = path.join(VAULTS_DIR, 'positioning-research');
const REASONING_SOURCE = '/home/openclaw/.openclaw/workspace/positioning-system/reasoning';
if (!fs.existsSync(REASONING_LINK)) {
  try {
    fs.symlinkSync(REASONING_SOURCE, REASONING_LINK, 'dir');
    console.log('Linked positioning-research vault');
  } catch (e) {
    console.log('Could not symlink, copying instead');
    // Fallback: just expose the path directly
  }
}

// === API ROUTES ===

// List all vaults
app.get('/api/vaults', (req, res) => {
  try {
    const entries = fs.readdirSync(VAULTS_DIR, { withFileTypes: true });
    const vaults = entries
      .filter(e => e.isDirectory() || e.isSymbolicLink())
      .map(e => {
        const vaultPath = path.join(VAULTS_DIR, e.name);
        const stat = fs.statSync(vaultPath);
        return {
          name: e.name,
          path: vaultPath,
          created: stat.birthtime,
          modified: stat.mtime
        };
      });
    res.json({ vaults });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List files in a vault (recursive)
app.get('/api/vaults/:vaultName/files', (req, res) => {
  try {
    const vaultPath = path.join(VAULTS_DIR, req.params.vaultName);
    if (!fs.existsSync(vaultPath)) {
      return res.status(404).json({ error: 'Vault not found' });
    }

    const files = [];
    function walk(dir, basePath = '') {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const relativePath = path.join(basePath, entry.name);
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push({
            name: entry.name,
            path: relativePath,
            type: 'directory',
            modified: fs.statSync(fullPath).mtime
          });
          walk(fullPath, relativePath);
        } else if (entry.name.endsWith('.md') || entry.name.endsWith('.txt')) {
          files.push({
            name: entry.name,
            path: relativePath,
            type: 'file',
            size: fs.statSync(fullPath).size,
            modified: fs.statSync(fullPath).mtime
          });
        }
      }
    }
    walk(vaultPath);
    res.json({ files });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Read a file
app.get('/api/vaults/:vaultName/files/*', (req, res) => {
  try {
    const filePath = path.join(VAULTS_DIR, req.params.vaultName, req.params[0]);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const stat = fs.statSync(filePath);
    res.json({
      path: req.params[0],
      content,
      modified: stat.mtime,
      size: stat.size
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Write a file
app.put('/api/vaults/:vaultName/files/*', (req, res) => {
  try {
    const filePath = path.join(VAULTS_DIR, req.params.vaultName, req.params[0]);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, req.body.content, 'utf8');
    res.json({ success: true, path: req.params[0], modified: new Date() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a file
app.delete('/api/vaults/:vaultName/files/*', (req, res) => {
  try {
    const filePath = path.join(VAULTS_DIR, req.params.vaultName, req.params[0]);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    fs.unlinkSync(filePath);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sync endpoint — returns all files with content for a vault
app.post('/api/vaults/:vaultName/sync', (req, res) => {
  try {
    const vaultPath = path.join(VAULTS_DIR, req.params.vaultName);
    if (!fs.existsSync(vaultPath)) {
      return res.status(404).json({ error: 'Vault not found' });
    }

    const files = [];
    function walk(dir, basePath = '') {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const relativePath = path.join(basePath, entry.name);
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath, relativePath);
        } else if (entry.name.endsWith('.md') || entry.name.endsWith('.txt')) {
          files.push({
            path: relativePath,
            content: fs.readFileSync(fullPath, 'utf8'),
            modified: fs.statSync(fullPath).mtime
          });
        }
      }
    }
    walk(vaultPath);
    res.json({ files, syncedAt: new Date() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', vaultsDir: VAULTS_DIR });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Notes-md server running on port ${PORT}`);
  console.log(`Vaults directory: ${VAULTS_DIR}`);
  console.log(`Vaults:`, fs.readdirSync(VAULTS_DIR));
});
