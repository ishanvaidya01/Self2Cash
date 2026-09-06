/**
 * WebSocket Broadcaster — Mesh + Office Kit relay
 * Maintains merchant→socket map, emits typed events to targeted merchants
 */

const WebSocket = require('ws');

// merchantId → Set<WebSocket>
const connections = new Map();
// socket → merchantId
const socketMerchant = new Map();

let wss = null;

function init(websocketServer) {
  wss = websocketServer;

  wss.on('connection', (ws, req) => {
    console.log('[WS] New connection');

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === 'REGISTER' && msg.merchantId) {
          register(ws, msg.merchantId);
        }
      } catch (e) {
        console.error('[WS] Bad message:', e.message);
      }
    });

    ws.on('close', () => {
      const merchantId = socketMerchant.get(ws);
      if (merchantId) {
        const sockets = connections.get(merchantId);
        if (sockets) {
          sockets.delete(ws);
          if (sockets.size === 0) connections.delete(merchantId);
        }
        socketMerchant.delete(ws);
        console.log(`[WS] ${merchantId} disconnected`);
      }
    });

    ws.on('error', (err) => console.error('[WS] Error:', err.message));

    // Send ping every 30s
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      } else {
        clearInterval(pingInterval);
      }
    }, 30000);
  });

  console.log('[WS] Mesh broadcaster initialised');
}

function register(ws, merchantId) {
  socketMerchant.set(ws, merchantId);
  if (!connections.has(merchantId)) connections.set(merchantId, new Set());
  connections.get(merchantId).add(ws);
  console.log(`[WS] ${merchantId} registered (${connections.get(merchantId).size} sockets)`);
  
  // Confirm registration
  send(ws, { type: 'REGISTERED', merchantId, ts: new Date().toISOString() });
}

function send(ws, payload) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

// Emit event to a specific merchant (all their open sockets)
function emitToMerchant(merchantId, event) {
  const sockets = connections.get(merchantId);
  if (!sockets) return;
  const payload = JSON.stringify({ ...event, ts: new Date().toISOString() });
  for (const ws of sockets) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

// Emit to all connected merchants
function broadcast(event) {
  const payload = JSON.stringify({ ...event, ts: new Date().toISOString() });
  for (const [, sockets] of connections) {
    for (const ws of sockets) {
      if (ws.readyState === WebSocket.OPEN) ws.send(payload);
    }
  }
}

// Mesh match proposed — notify both surplus and shortage merchants
function emitMeshMatch(match) {
  const event = { type: 'mesh:match', match };
  emitToMerchant(match.surplusMerchantId, event);
  emitToMerchant(match.shortageMerchantId, event);
}

// Cluster demand signal rising — notify all merchants in category
function emitDemandSignal(signal) {
  broadcast({ type: 'mesh:demand_signal', signal });
}

// Vision result relay (Office Kit simulation) — broadcast to all (laptop client listens)
function emitVisionResult(result) {
  broadcast({ type: 'officekit:vision_result', result });
}

// Stockout alert — notify specific merchant
function emitStockoutAlert(merchantId, alert) {
  emitToMerchant(merchantId, { type: 'alert:stockout', alert });
}

// Generic alert
function emitAlert(merchantId, alert) {
  emitToMerchant(merchantId, { type: 'alert:generic', alert });
}

function getConnectedMerchants() {
  return [...connections.keys()];
}

module.exports = {
  init,
  emitToMerchant,
  broadcast,
  emitMeshMatch,
  emitDemandSignal,
  emitVisionResult,
  emitStockoutAlert,
  emitAlert,
  getConnectedMerchants
};
