// Netlify Function: Relay WebRTC signaling messages
// Stores messages temporarily for peer pickup

const MESSAGES = new Map(); // targetPeerId -> [{from, type, data, timestamp}]
const MAX_AGE = 30000; // 30s message retention

function cleanup() {
  const now = Date.now();
  for (const [peerId, messages] of MESSAGES) {
    const fresh = messages.filter(m => now - m.timestamp < MAX_AGE);
    if (fresh.length === 0) {
      MESSAGES.delete(peerId);
    } else {
      MESSAGES.set(peerId, fresh);
    }
  }
}

setInterval(cleanup, 10000);

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

  try {
    const body = JSON.parse(event.body || '{}');
    const { action, fromPeerId, toPeerId, type, data } = body;

    if (action === 'send') {
      if (!toPeerId || !fromPeerId || !type) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Missing fields' }) };
      }
      
      const messages = MESSAGES.get(toPeerId) || [];
      messages.push({ from: fromPeerId, type, data, timestamp: Date.now() });
      MESSAGES.set(toPeerId, messages);
      
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ status: 'sent' })
      };
    }

    if (action === 'poll') {
      if (!fromPeerId) {
        return { statusCode: 400, body: JSON.stringify({ error: 'fromPeerId required' }) };
      }
      
      const messages = MESSAGES.get(fromPeerId) || [];
      MESSAGES.delete(fromPeerId); // Clear after pickup
      
      return {
        statusCode: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ messages })
      };
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'Unknown action' }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
