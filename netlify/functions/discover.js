// Netlify Function: Discover peers for a vault

const PEERS = new Map();

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const vaultId = event.queryStringParameters?.vaultId || JSON.parse(event.body || '{}').vaultId;
    const myPeerId = event.queryStringParameters?.peerId || JSON.parse(event.body || '{}').peerId;
    
    if (!vaultId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'vaultId required' }) };
    }

    const peers = (PEERS.get(vaultId) || [])
      .filter(p => p.peerId !== myPeerId)
      .map(p => ({ peerId: p.peerId, deviceType: p.deviceType }));

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ peers, vaultId })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
