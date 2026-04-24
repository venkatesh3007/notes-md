// Netlify Function: Register device presence
// Stores peer info in memory (ephemeral, devices re-register every 30s)

const PEERS = new Map(); // vaultId -> [{peerId, deviceType, lastSeen, signalingData}]
const CLEANUP_INTERVAL = 60000; // 60s cleanup

function cleanup() {
  const now = Date.now();
  for (const [vaultId, peers] of PEERS) {
    const active = peers.filter(p => now - p.lastSeen < 45000);
    if (active.length === 0) {
      PEERS.delete(vaultId);
    } else {
      PEERS.set(vaultId, active);
    }
  }
}

setInterval(cleanup, CLEANUP_INTERVAL);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { vaultId, peerId, deviceType, action } = JSON.parse(event.body);
    
    if (!vaultId || !peerId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'vaultId and peerId required' }) };
    }

    if (action === 'register') {
      const peers = PEERS.get(vaultId) || [];
      const existing = peers.findIndex(p => p.peerId === peerId);
      const peerData = { peerId, deviceType, lastSeen: Date.now() };
      
      if (existing >= 0) {
        peers[existing] = peerData;
      } else {
        peers.push(peerData);
      }
      PEERS.set(vaultId, peers);
      
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ status: 'registered', peers: peers.length })
      };
    }
    
    if (action === 'unregister') {
      const peers = PEERS.get(vaultId) || [];
      PEERS.set(vaultId, peers.filter(p => p.peerId !== peerId));
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ status: 'unregistered' })
      };
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'Unknown action' }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
