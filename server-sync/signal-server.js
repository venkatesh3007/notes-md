// Simple signaling server — runs on your server, no Netlify needed
const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.SIGNAL_PORT || 3333;

// In-memory stores
const PEERS = new Map(); // vaultId -> [{peerId, deviceType, lastSeen}]
const MESSAGES = new Map(); // targetPeerId -> [{from, type, data, timestamp}]

// Cleanup old peers/messages every 30s
setInterval(() => {
  const now = Date.now();
  for (const [vaultId, peers] of PEERS) {
    const active = peers.filter(p => now - p.lastSeen < 45000);
    if (active.length) PEERS.set(vaultId, active);
    else PEERS.delete(vaultId);
  }
  for (const [peerId, msgs] of MESSAGES) {
    const fresh = msgs.filter(m => now - m.timestamp < 30000);
    if (fresh.length) MESSAGES.set(peerId, fresh);
    else MESSAGES.delete(peerId);
  }
}, 30000);

// Register presence
app.post('/register', (req, res) => {
  const { vaultId, peerId, deviceType } = req.body;
  if (!vaultId || !peerId) return res.status(400).json({ error: 'Missing fields' });
  
  const peers = PEERS.get(vaultId) || [];
  const idx = peers.findIndex(p => p.peerId === peerId);
  const peerData = { peerId, deviceType, lastSeen: Date.now() };
  
  if (idx >= 0) peers[idx] = peerData;
  else peers.push(peerData);
  PEERS.set(vaultId, peers);
  
  res.json({ status: 'registered', peers: peers.length });
});

// Discover peers
app.get('/discover', (req, res) => {
  const { vaultId, peerId } = req.query;
  if (!vaultId) return res.status(400).json({ error: 'vaultId required' });
  
  const peers = (PEERS.get(vaultId) || [])
    .filter(p => p.peerId !== peerId)
    .map(p => ({ peerId: p.peerId, deviceType: p.deviceType }));
  
  res.json({ peers, vaultId });
});

// Send signal message
app.post('/relay/send', (req, res) => {
  const { fromPeerId, toPeerId, type, data } = req.body;
  if (!toPeerId || !fromPeerId || !type) return res.status(400).json({ error: 'Missing fields' });
  
  const msgs = MESSAGES.get(toPeerId) || [];
  msgs.push({ from: fromPeerId, type, data, timestamp: Date.now() });
  MESSAGES.set(toPeerId, msgs);
  
  res.json({ status: 'sent' });
});

// Poll for messages
app.post('/relay/poll', (req, res) => {
  const { fromPeerId } = req.body;
  if (!fromPeerId) return res.status(400).json({ error: 'fromPeerId required' });
  
  const msgs = MESSAGES.get(fromPeerId) || [];
  MESSAGES.delete(fromPeerId);
  
  res.json({ messages: msgs });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Signaling server running on http://0.0.0.0:${PORT}`);
});
