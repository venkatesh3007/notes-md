const fs = require('fs');
const path = require('path');
const SimplePeer = require('simple-peer');
const wrtc = require('wrtc');
const fetch = require('node-fetch');

const SIGNAL_URL = process.env.SIGNAL_URL || 'http://localhost:3333';
const VAULT_PATH = process.env.VAULT_PATH || './vaults';
const VAULT_ID = process.env.VAULT_ID || 'default-vault';
const PEER_ID = `server-${Date.now()}`;

class ServerSync {
  constructor() {
    this.vaultPath = path.resolve(VAULT_PATH);
    this.files = new Map();
    this.peers = new Map();
    this.pollInterval = null;
  }

  async start() {
    console.log(`Server sync starting for vault: ${VAULT_ID}`);
    console.log(`Watching: ${this.vaultPath}`);
    console.log(`Signaling: ${SIGNAL_URL}`);
    
    await this.scanFiles();
    await this.register();
    
    this.pollInterval = setInterval(() => this.poll(), 2000);
    this.watchFiles();
    
    console.log('Server sync daemon running');
  }

  async scanFiles() {
    const files = await this.readDirRecursive(this.vaultPath);
    for (const file of files) {
      const stat = fs.statSync(file);
      const relativePath = path.relative(this.vaultPath, file);
      this.files.set(relativePath, {
        path: relativePath,
        modified: stat.mtime.toISOString(),
        size: stat.size
      });
    }
    console.log(`Scanned ${files.length} files`);
  }

  async readDirRecursive(dir) {
    const files = [];
    try {
      const entries = fs.readdirSync(dir);
      for (const entry of entries) {
        if (entry.startsWith('.')) continue;
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          files.push(...await this.readDirRecursive(fullPath));
        } else if (entry.endsWith('.md')) {
          files.push(fullPath);
        }
      }
    } catch (err) {
      // Directory might not exist
    }
    return files;
  }

  async register() {
    try {
      await fetch(`${SIGNAL_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vaultId: VAULT_ID,
          peerId: PEER_ID,
          deviceType: 'server'
        })
      });
    } catch (err) {
      console.error('Register failed:', err.message);
    }
  }

  async poll() {
    try {
      await this.register();
      
      const res = await fetch(`${SIGNAL_URL}/relay/poll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromPeerId: PEER_ID })
      });
      
      const data = await res.json();
      for (const msg of data.messages || []) {
        await this.handleSignal(msg);
      }
    } catch (err) {
      // Retry next poll
    }
  }

  async handleSignal(msg) {
    if (msg.type === 'offer') {
      await this.handleOffer(msg.from, msg.data);
    }
  }

  async handleOffer(fromPeerId, offer) {
    const peer = new SimplePeer({ initiator: false, wrtc });
    
    peer.on('signal', async (answer) => {
      await fetch(`${SIGNAL_URL}/relay/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromPeerId: PEER_ID,
          toPeerId: fromPeerId,
          type: 'answer',
          data: answer
        })
      });
    });

    peer.on('connect', () => {
      console.log(`Peer connected: ${fromPeerId}`);
      this.peers.set(fromPeerId, peer);
      this.sendFileManifest(peer);
    });

    peer.on('data', (data) => {
      this.handlePeerData(fromPeerId, JSON.parse(data.toString()));
    });

    peer.on('close', () => {
      this.peers.delete(fromPeerId);
    });

    peer.signal(offer);
  }

  sendFileManifest(peer) {
    const manifest = Array.from(this.files.values());
    peer.send(JSON.stringify({ type: 'manifest', files: manifest }));
  }

  async handlePeerData(peerId, message) {
    if (message.type === 'requestFile') {
      const filePath = path.join(this.vaultPath, message.path);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const peer = this.peers.get(peerId);
        if (peer) {
          peer.send(JSON.stringify({
            type: 'file',
            path: message.path,
            content,
            modified: this.files.get(message.path)?.modified
          }));
        }
      }
    }
  }

  watchFiles() {
    try {
      fs.watch(this.vaultPath, { recursive: true }, (eventType, filename) => {
        if (filename && filename.endsWith('.md')) {
          console.log(`File changed: ${filename}`);
          this.scanFiles().then(() => {
            for (const peer of this.peers.values()) {
              this.sendFileManifest(peer);
            }
          });
        }
      });
    } catch (err) {
      console.error('Watch failed:', err.message);
    }
  }

  stop() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    for (const peer of this.peers.values()) {
      peer.destroy();
    }
  }
}

if (require.main === module) {
  const sync = new ServerSync();
  sync.start().catch(console.error);
  
  process.on('SIGINT', () => {
    sync.stop();
    process.exit(0);
  });
}

module.exports = ServerSync;
