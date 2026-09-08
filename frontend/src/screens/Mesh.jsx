/**
 * Screen 9: Kirana Mesh
 * Map of nearby stores + surplus-shortage match cards + cluster demand signal
 */
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getMeshMatches, getNearbyMerchants, getMeshDemandSignal, proposeSwap, triggerMeshScan } from '../api/client';
import { useAppStore } from '../store/appStore';

// Fix leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const DEMO_CENTER = [28.5706, 77.3261]; // Sharma General Store

export default function Mesh() {
  const [matches, setMatches] = useState([]);
  const [merchants, setMerchants] = useState([]);
  const [demandSignal, setDemandSignal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const { meshNotifications } = useAppStore();

  useEffect(() => {
    Promise.all([
      getMeshMatches(),
      getNearbyMerchants(),
      getMeshDemandSignal('Oils & Ghee')
    ]).then(([m, mer, ds]) => {
      setMatches(m.matches || []);
      setMerchants([
        { merchantId: 'merchant_001', storeName: 'Sharma General Store', location: { coordinates: [77.3261, 28.5706] }, healthScore: 71, isSelf: true },
        ...(mer.merchants || [])
      ]);
      setDemandSignal(ds);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleScan = async () => {
    setScanning(true);
    try {
      await triggerMeshScan();
      const m = await getMeshMatches();
      setMatches(m.matches || []);
    } finally {
      setScanning(false);
    }
  };

  const handleSwap = async (matchId, action) => {
    await proposeSwap(matchId, action);
    const m = await getMeshMatches();
    setMatches(m.matches || []);
  };

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: 4 }}>Kirana Mesh</h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{merchants.length - 1} stores nearby</p>
        </div>
        <button className="btn btn-sm btn-ghost" onClick={handleScan} disabled={scanning}>
          {scanning ? '⟳ Scanning...' : '🔄 Scan'}
        </button>
      </div>

      {/* Real-time WS notifications */}
      {meshNotifications.length > 0 && (
        <div className="alert-banner success">
          🕸 New Mesh match: {meshNotifications[0].productName} — ₹{meshNotifications[0].estimatedSavings} savings
        </div>
      )}

      {/* Cluster demand signal */}
      {demandSignal && demandSignal.signal !== 'INSUFFICIENT_DATA' && (
        <div className={`alert-banner ${demandSignal.signal === 'RISING' ? 'warning' : 'info'}`}
          style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
          <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            📡 Cluster Demand Signal — {demandSignal.category}
            <span className={`chip ${demandSignal.signal === 'RISING' ? 'chip-amber' : 'chip-blue'}`} style={{ fontSize: '0.65rem' }}>
              {demandSignal.signal}
            </span>
          </div>
          <div style={{ fontSize: '0.8125rem', marginTop: 4 }}>{demandSignal.description}</div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
            {demandSignal.merchantsInCluster} stores · Velocity {demandSignal.changePercent > 0 ? '+' : ''}{demandSignal.changePercent}% vs 14-day baseline
          </div>
        </div>
      )}

      {/* Map */}
      <div style={{ height: 220, borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <MapContainer
          center={DEMO_CENTER}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {merchants.map(m => {
            const [lng, lat] = m.location?.coordinates || [0, 0];
            const icon = L.divIcon({
              className: '',
              html: `<div style="
                background: ${m.isSelf ? 'var(--brand-primary)' : 'var(--bg-card)'};
                border: 2px solid ${m.isSelf ? 'var(--brand-primary)' : 'var(--border-strong)'};
                border-radius: 50%;
                width: 28px; height: 28px;
                display: flex; align-items: center; justify-content: center;
                font-size: 12px; color: white; font-weight: 700;
                box-shadow: 0 2px 8px rgba(0,0,0,0.5);
              ">${m.isSelf ? '★' : (m.healthScore || '?')}</div>`,
              iconSize: [28, 28], iconAnchor: [14, 14]
            });
            return (
              <Marker key={m.merchantId} position={[lat, lng]} icon={icon}>
                <Popup>{m.storeName}<br />Health: {m.healthScore}/100</Popup>
              </Marker>
            );
          })}

          {/* Mesh radius circle around primary store */}
          <Circle center={DEMO_CENTER} radius={2000} pathOptions={{ color: 'var(--brand-primary)', fillOpacity: 0.04, weight: 1, dashArray: '6 4' }} />
        </MapContainer>
      </div>

      {/* Match cards */}
      <div>
        <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>
          Active Matches ({matches.length})
        </p>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...Array(2)].map((_, i) => <div key={i} className="skeleton" style={{ height: 140 }} />)}
          </div>
        ) : matches.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '2rem', marginBottom: 8 }}>🕸</p>
            <p>No active matches. Tap Scan to find surplus-shortage pairs.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {matches.map(match => (
              <div key={match.matchId} className="card" style={{ borderColor: 'var(--brand-primary)', borderWidth: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span className="chip chip-brand">🕸 Mesh Match</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{match.distanceMeters}m away</span>
                </div>

                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>{match.productName}</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center', margin: '10px 0' }}>
                  <div className="card" style={{ padding: '8px 10px', background: 'var(--signal-amber-light)', border: '1px solid var(--signal-amber)', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--signal-amber)', fontWeight: 700, marginBottom: 2 }}>SURPLUS</div>
                    <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{match.surplusMerchantName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{match.surplusQty} units · {match.surplusDaysOfStock}d stock</div>
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '1.25rem' }}>⇄</div>
                  <div className="card" style={{ padding: '8px 10px', background: 'var(--signal-red-light)', border: '1px solid var(--signal-red)', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--signal-red)', fontWeight: 700, marginBottom: 2 }}>SHORTAGE</div>
                    <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{match.shortageMerchantName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Stockout in {match.daysUntilShortageStockout}d</div>
                  </div>
                </div>

                <div className="alert-banner success" style={{ marginBottom: 10 }}>
                  💰 ₹{match.estimatedSavings.toLocaleString('en-IN')} estimated savings vs normal supplier
                </div>

                {match.status === 'PROPOSED' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-success btn-sm" style={{ flex: 1 }} onClick={() => handleSwap(match.matchId, 'ACCEPT')}>
                      ✓ Accept
                    </button>
                    <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => handleSwap(match.matchId, 'DECLINE')}>
                      Decline
                    </button>
                  </div>
                )}
                {match.status !== 'PROPOSED' && (
                  <span className={`chip ${match.status === 'ACCEPTED' ? 'chip-green' : 'chip-neutral'}`}>{match.status}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
