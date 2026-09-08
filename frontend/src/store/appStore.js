/**
 * Global Zustand store
 * Keeps alerts count and real-time Mesh events in sync across screens
 */
import { create } from 'zustand';

export const useAppStore = create((set, get) => ({
  // Active merchant
  merchantId: 'merchant_001',
  merchantName: 'Sharma General Store',
  setMerchant: (id, name) => set({ merchantId: id, merchantName: name }),

  // Alert count (badge on nav)
  alertCount: 0,
  setAlertCount: (n) => set({ alertCount: n }),

  // Mesh match notifications (real-time via WS)
  meshNotifications: [],
  addMeshNotification: (n) => set(s => ({ meshNotifications: [n, ...s.meshNotifications].slice(0, 20) })),
  clearMeshNotifications: () => set({ meshNotifications: [] }),

  // Vision result (Office Kit relay)
  latestVisionResult: null,
  setVisionResult: (r) => set({ latestVisionResult: r }),

  // WebSocket ref
  ws: null,
  wsConnected: false,
  initWebSocket: () => {
    const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000/ws';
    const merchantId = get().merchantId;

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'REGISTER', merchantId }));
      set({ ws, wsConnected: true });
      console.log('[WS] Connected and registered as', merchantId);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'mesh:match') {
          get().addMeshNotification({ ...msg.match, _notifiedAt: new Date() });
        }
        if (msg.type === 'officekit:vision_result') {
          get().setVisionResult(msg.result);
        }
        if (msg.type === 'alert:stockout') {
          set(s => ({ alertCount: s.alertCount + 1 }));
        }
      } catch (e) {
        console.error('[WS] Parse error:', e);
      }
    };

    ws.onclose = () => {
      set({ wsConnected: false });
      // Reconnect after 5s
      setTimeout(() => get().initWebSocket(), 5000);
    };

    ws.onerror = () => {
      // Suppress raw event to avoid console spam when backend is down
    };
  }
}));
