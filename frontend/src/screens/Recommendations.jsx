/**
 * Screen 4: Recommendations Feed
 * BUY / DON'T BUY / RECOVER CASH cards with inline reasoning
 * External signal alerts at top
 */
import { useEffect, useState } from 'react';
import { getRecommendations, refreshSignals } from '../api/client';

const TYPE_CONFIG = {
  BUY: { label: 'BUY', icon: '🔴', bg: 'var(--signal-green-light)', border: 'var(--signal-green)', class: 'buy' },
  DONT_BUY: { label: "DON'T BUY", icon: '🛑', bg: 'var(--signal-red-light)', border: 'var(--signal-red)', class: 'dont-buy' },
  RECOVER: { label: 'RECOVER CASH', icon: '💰', bg: 'var(--signal-amber-light)', border: 'var(--signal-amber)', class: 'recover' },
};

export default function Recommendations() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('ALL');

  useEffect(() => {
    getRecommendations().then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleRefreshSignals = async () => {
    setRefreshing(true);
    try {
      await refreshSignals();
      const d = await getRecommendations();
      setData(d);
    } finally {
      setRefreshing(false);
    }
  };

  const recs = data?.recommendations?.filter(r => activeFilter === 'ALL' || r.type === activeFilter) || [];
  const alerts = data?.externalAlerts || [];

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: 4 }}>
            Action Feed
          </h1>
          {data?.summary && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              {data.summary.buyCount} buy · {data.summary.dontBuyCount} don't buy · {data.summary.recoverCount} recover
            </p>
          )}
        </div>
        <button className="btn btn-sm btn-ghost" onClick={handleRefreshSignals} disabled={refreshing}>
          {refreshing ? '⟳' : '↻'} Signals
        </button>
      </div>

      {/* Live external signal alerts */}
      {alerts.length > 0 && (
        <div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Live Market Signals
          </p>
          {alerts.map((alert, i) => (
            <div key={i} className={`alert-banner ${alert.priority === 'HIGH' ? 'warning' : 'info'}`} style={{ marginBottom: 6 }}>
              <span style={{ fontSize: '1.1rem' }}>{alert.icon}</span>
              <div>
                <div style={{ fontWeight: 600 }}>{alert.title}</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>{alert.reasoning}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[['ALL', 'All'], ['BUY', '🔴 Buy'], ['DONT_BUY', '🛑 Skip'], ['RECOVER', '💰 Recover']].map(([key, label]) => (
          <button key={key} className={`chip ${activeFilter === key ? 'chip-brand' : 'chip-neutral'}`}
            style={{ cursor: 'pointer', border: 'none', whiteSpace: 'nowrap' }}
            onClick={() => setActiveFilter(key)}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: 120 }} />)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {recs.map((rec, i) => {
            const config = TYPE_CONFIG[rec.type] || TYPE_CONFIG.BUY;
            return (
              <div key={i} className={`rec-card ${config.class}`} style={{ borderColor: config.border }}>
                <div className="rec-header">
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span className={`chip chip-${config.class === 'buy' ? 'green' : config.class === 'dont-buy' ? 'red' : 'amber'}`}>
                        {config.icon} {config.label}
                      </span>
                      {rec.urgency === 'CRITICAL' && <span className="chip chip-red" style={{ fontSize: '0.65rem' }}>URGENT</span>}
                    </div>
                    <div className="rec-title">{rec.productName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{rec.category}</div>
                  </div>
                  {rec.amount && (
                    <div style={{ textAlign: 'right' }}>
                      <div className="rec-amount" style={{ color: config.border }}>
                        ₹{rec.amount.toLocaleString('en-IN')}
                      </div>
                      {rec.quantity && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{rec.quantity} units</div>}
                    </div>
                  )}
                </div>

                {/* Inline reasoning */}
                <div style={{ background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Why
                  </p>
                  <ul className="rec-reasoning">
                    {rec.reasoning?.map((r, ri) => (
                      <li key={ri} style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 3 }}>→ {r}</li>
                    ))}
                  </ul>
                </div>

                {rec.supplierName && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>📦 {rec.supplierName}</span>
                    <span>⏱ {rec.leadTimeDays}d lead time</span>
                  </div>
                )}

                {rec.recoveryOptions?.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {rec.recoveryOptions.map((opt, oi) => (
                      <div key={oi} style={{ fontSize: '0.8125rem', color: 'var(--signal-amber)', padding: '4px 8px', background: 'var(--signal-amber-light)', borderRadius: 6 }}>
                        💡 {opt}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {recs.length === 0 && (
            <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--text-muted)' }}>
              No recommendations for this filter.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
