// P2P client using WebRTC + local signaling server

const SIGNAL_URL = 'http://139.59.57.222:3333';

export class P2PClient {
  constructor(vaultId, peerId) {
    this.vaultId = vaultId;
    this.peerId = peerId;
    this.peers = new Map();
    this.pollInterval = null;
    this.onFile = null;
    this.onManifest = null;
    this.onConnect = null;
    this.connectedPeers = new Set();
  }

  async start() {
    await this.register();
    this.pollInterval = setInterval(() => this.poll(), 2000);
  }

  async register() {
    try {
      await fetch(`${SIGNAL_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vaultId: this.vaultId,
          peerId: this.peerId,
          deviceType: 'mobile'
        })
      });
    } catch (err) {
      console.error('Register failed:', err);
    }
  }

  async discover() {
    try {
      const res = await fetch(`${SIGNAL_URL}/discover?vaultId=${this.vaultId}&peerId=${this.peerId}`);
      const data = await res.json();
      return data.peers || [];
    } catch (err) {
      console.error('Discover failed:', err);
      return [];
    }
  }

  async connectToPeer(targetPeerId) {
    if (this.peers.has(targetPeerId)) return;

    const SimplePeer = (await import('simple-peer')).default;
    
    const peer = new SimplePeer({ initiator: true, trickle: false });
    
    peer.on('signal', async (offer) => {
      await fetch(`${SIGNAL_URL}/relay/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromPeerId: this.peerId,
          toPeerId: targetPeerId,
          type: 'offer',
          data: offer
        })
      });
    });

    peer.on('connect', () => {
      console.log(`Connected to ${targetPeerId}`);
      this.connectedPeers.add(targetPeerId);
      if (this.onConnect) this.onConnect(targetPeerId);
    });

    peer.on('data', (data) => {
      const msg = JSON.parse(data.toString());
      this.handleMessage(targetPeerId, msg);
    });

    peer.on('close', () => {
      this.peers.delete(targetPeerId);
      this.connectedPeers.delete(targetPeerId);
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
      this.peers.delete(targetPeerId);
    });

    this.peers.set(targetPeerId, peer);
  }

  async poll() {
    try {
      await this.register();
      
      const res = await fetch(`${SIGNAL_URL}/relay/poll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromPeerId: this.peerId })
      });
      
      const data = await res.json();
      for (const msg of data.messages || []) {
        await this.handleSignal(msg);
      }
      
      const peers = await this.discover();
      for (const peer of peers) {
        if (peer.deviceType === 'server' && !this.peers.has(peer.peerId)) {
          await this.connectToPeer(peer.peerId);
        }
      }
    } catch (err) {
      // Silent fail, retry next poll
    }
  }

  async handleSignal(msg) {
    if (msg.type === 'answer') {
      const peer = this.peers.get(msg.from);
      if (peer) peer.signal(msg.data);
    }
  }

  handleMessage(peerId, msg) {
    if (msg.type === 'manifest' && this.onManifest) {
      this.onManifest(peerId, msg.files);
    }
    if (msg.type === 'file' && this.onFile) {
      this.onFile(peerId, msg);
    }
  }

  requestFile(peerId, path) {
    const peer = this.peers.get(peerId);
    if (peer && peer.connected) {
      peer.send(JSON.stringify({ type: 'requestFile', path }));
    }
  }

  stop() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    for (const peer of this.peers.values()) {
      peer.destroy();
    }
    this.peers.clear();
  }
}
