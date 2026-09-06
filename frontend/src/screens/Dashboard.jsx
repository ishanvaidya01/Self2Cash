/**
 * Screen 1: Store Health Dashboard
 * - Financial Health Score ring (animated to 71)
 * - 6 key numbers with count-up animation
 * - Alert banners
 * - External signals strip
 */
import { useEffect, useState } from 'react';
import CountUpPkg from 'react-countup';
const CountUp = CountUpPkg.default || CountUpPkg;
import { useNavigate } from 'react-router-dom';
import { getBusinessHealth, getAlerts, getExternalSignals } from '../api/client';

function ScoreRing({ score, color }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setDisplayed(score), 300);
    return () => clearTimeout(timer);
  }, [score]);

  const offset = circumference - (displayed / 100) * circumference;
  const strokeColor = score >= 80 ? 'var(--signal-green)' : score >= 60 ? 'var(--signal-amber)' : 'var(--signal-red)';

  return (
    <div className="score-ring-container" style={{ width: 140, height: 140 }}>
      <svg className="score-ring-svg" width="140" height="140" viewBox="0 0 140 140">
        <circle className="score-ring-track" cx="70" cy="70" r={radius} />
        <circle
          className="score-ring-progress"
          cx="70" cy="70" r={radius}
          stroke={strokeColor}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ filter: `drop-shadow(0 0 8px ${strokeColor})` }}
        />
      </svg>
      <div className="score-ring-content">
        <span style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 800, color: strokeColor, lineHeight: 1 }}>
          {displayed}
        </span>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>/ 100</span>
        <span style={{ fontSize: '0.6rem', color: strokeColor, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>
          {score >= 80 ? 'HEALTHY' : score >= 60 ? 'AMBER' : 'AT RISK'}
        </span>
      </div>
    </div>
  );
}

function StatCard({ label, value, prefix, suffix, decimals = 0, colorClass, sub, onClick }) {
  return (
    <div className="stat-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <span className="stat-label">{label}</span>
      <span className={`stat-value ${colorClass || ''}`} style={{ color: colorClass ? undefined : 'var(--text-primary)' }}>
        {prefix}<CountUp end={value} duration={1.8} decimals={decimals} separator="," />{suffix}
      </span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}

export default function Dashboard() {
  const [health, setHealth] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [signals, setSignals] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      getBusinessHealth(),
      getAlerts(),
      getExternalSignals()
    ]).then(([h, a, s]) => {
      setHealth(h);
      setAlerts(a.alerts || []);
      setSignals(s);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      <div className="skeleton" style={{ height: 160, borderRadius: 'var(--radius-lg)' }} />
      <div className="stats-grid">
        {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 80 }} />)}
      </div>
    </div>
  );

  const kn = health?.keyNumbers || {};

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>

      {/* Health Score Card */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, #14151F 0%, #1A1B2E 100%)',
        border: '1px solid rgba(124, 111, 255, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-md)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
              Financial Health Score
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Sharma General Store</p>
          </div>
          <ScoreRing score={health?.score || 0} />
        </div>

        {/* Sub-scores */}
        {health?.subScores && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.values(health.subScores).map(sub => (
              <div key={sub.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{sub.label}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color:
                    sub.score >= 70 ? 'var(--signal-green)' :
                    sub.score >= 50 ? 'var(--signal-amber)' : 'var(--signal-red)'
                  }}>{sub.score}/100</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{
                    width: `${sub.score}%`,
                    background: sub.score >= 70 ? 'var(--signal-green)' :
                                sub.score >= 50 ? 'var(--signal-amber)' : 'var(--signal-red)'
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alert banners */}
      {alerts.slice(0, 3).map((alert, i) => (
        <div key={i} className={`alert-banner ${alert.type === 'CRITICAL_STOCKOUT' ? 'critical' : alert.type === 'STOCKOUT_WARNING' ? 'warning' : 'info'}`}>
          <span>{alert.type === 'CRITICAL_STOCKOUT' ? '🔴' : alert.type === 'STOCKOUT_WARNING' ? '🟡' : '🔵'}</span>
          <span>{alert.message}</span>
        </div>
      ))}

      {/* 6 Key Numbers */}
      <div>
        <div className="section-header">
          <span className="section-title">Key Numbers</span>
        </div>
        <div className="stats-grid">
          <StatCard
            label="Inventory Value"
            prefix="₹"
            value={kn.inventoryValue || 0}
            sub="Total capital deployed"
            onClick={() => navigate('/capital')}
          />
          <StatCard
            label="Capital Locked"
            prefix="₹"
            value={kn.capitalLocked || 0}
            colorClass=""
            sub="In slow/dead stock"
            onClick={() => navigate('/capital')}
          />
          <StatCard
            label="7-Day Sales"
            prefix="₹"
            value={kn.weeklySales || 0}
            sub="Revenue this week"
          />
          <StatCard
            label="Stockout Risk"
            value={kn.stockoutRiskCount || 0}
            suffix=" SKUs"
            sub="Under 7-day cover"
            onClick={() => navigate('/inventory')}
          />
          <StatCard
            label="Buy Budget"
            prefix="₹"
            value={kn.recommendedPurchaseBudget || 0}
            sub="Recommended reorder"
            onClick={() => navigate('/recommendations')}
          />
          <StatCard
            label="Khata Due"
            prefix="₹"
            value={kn.totalKhataReceivable || 0}
            sub="Customer credit"
            onClick={() => navigate('/khata')}
          />
        </div>
      </div>

      {/* External Signals */}
      {signals && (
        <div>
          <div className="section-header">
            <span className="section-title">Live Market Signals</span>
            <span className="section-link" onClick={() => navigate('/recommendations')}>See all</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {signals.weather?.[0]?.payload && (
              <div className="alert-banner warning">
                <span>🌡</span>
                <span>{signals.weather[0].payload.demandImpact}</span>
              </div>
            )}
            {signals.mandiPrices?.filter(s => s.payload?.alertMessage).slice(0, 2).map((s, i) => (
              <div key={i} className={`alert-banner ${s.payload.priceChangePercent < 0 ? 'success' : 'warning'}`}>
                <span>{s.payload.priceChangePercent < 0 ? '📉' : '📈'}</span>
                <span>{s.payload.alertMessage}</span>
              </div>
            ))}
            {signals.upcomingFestivals?.slice(0, 1).map((f, i) => (
              <div key={i} className="alert-banner info">
                <span>🎪</span>
                <span>{f.name} coming up — stock {f.categories.join(', ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
        {[
          { label: '📷 Shelf Scan', path: '/camera', color: 'var(--brand-primary)' },
          { label: '🧮 Simulator', path: '/simulator', color: 'var(--signal-amber)' },
          { label: '📒 Khata', path: '/khata', color: 'var(--signal-green)' },
          { label: '⚡ Factoring', path: '/factoring', color: 'var(--brand-accent)' },
        ].map(a => (
          <button key={a.path} className="btn btn-ghost" style={{ borderColor: `${a.color}33`, color: a.color }}
            onClick={() => navigate(a.path)}>
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
