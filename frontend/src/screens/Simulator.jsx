/**
 * Screen 5: What-If Simulator
 * Sliders → live projected cash flow chart
 */
import { useState, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { runSimulation } from '../api/client';

const debounce = (fn, ms) => {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
};

function SliderField({ label, value, min, max, step, onChange, format, color }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.9375rem', color: color || 'var(--text-primary)' }}>
          {format(value)}
        </span>
      </div>
      <input type="range" className="styled-slider" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))} />
    </div>
  );
}

export default function Simulator() {
  const [params, setParams] = useState({
    purchaseAmount: 50000,
    demandShiftPercent: 0,
    supplierDelayDays: 0,
    festivalMultiplier: 1.0,
    cashReserve: 20000
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runSim = useCallback(debounce(async (p) => {
    setLoading(true);
    try {
      const r = await runSimulation(p);
      setResult(r);
    } finally {
      setLoading(false);
    }
  }, 500), []);

  const update = (key, val) => {
    const next = { ...params, [key]: val };
    setParams(next);
    runSim(next);
  };

  const riskColors = {
    HEALTHY: 'var(--signal-green)',
    MODERATE: 'var(--signal-amber)',
    LIQUIDITY_RISK: 'var(--signal-red)'
  };
  const riskColor = riskColors[result?.riskLevel] || 'var(--text-secondary)';

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: 4 }}>What-If Simulator</h1>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Move sliders to see financial impact in real-time</p>
      </div>

      {/* Sliders */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <SliderField label="Purchase Amount" value={params.purchaseAmount} min={0} max={200000} step={5000}
          onChange={v => update('purchaseAmount', v)} format={v => `₹${v.toLocaleString('en-IN')}`}
          color="var(--brand-primary)" />
        <div className="divider" />
        <SliderField label="Demand Shift" value={params.demandShiftPercent} min={-50} max={100} step={5}
          onChange={v => update('demandShiftPercent', v)} format={v => `${v > 0 ? '+' : ''}${v}%`}
          color={params.demandShiftPercent >= 0 ? 'var(--signal-green)' : 'var(--signal-red)'} />
        <SliderField label="Supplier Delay" value={params.supplierDelayDays} min={0} max={14} step={1}
          onChange={v => update('supplierDelayDays', v)} format={v => `${v} days`}
          color={params.supplierDelayDays > 5 ? 'var(--signal-red)' : 'var(--text-primary)'} />
        <SliderField label="Festival Multiplier" value={params.festivalMultiplier} min={1.0} max={2.0} step={0.1}
          onChange={v => update('festivalMultiplier', v)} format={v => `${v.toFixed(1)}×`}
          color={params.festivalMultiplier > 1.3 ? 'var(--signal-amber)' : 'var(--text-primary)'} />
        <div className="divider" />
        <SliderField label="Cash Reserve" value={params.cashReserve} min={0} max={100000} step={5000}
          onChange={v => update('cashReserve', v)} format={v => `₹${v.toLocaleString('en-IN')}`} />
      </div>

      {/* Risk indicator */}
      {result && (
        <div className="card" style={{
          background: `${riskColor}15`,
          border: `1px solid ${riskColor}40`,
          display: 'flex', alignItems: 'center', gap: 'var(--space-md)'
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: `${riskColor}25`, border: `2px solid ${riskColor}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.5rem', flexShrink: 0
          }}>
            {result.riskLevel === 'HEALTHY' ? '✅' : result.riskLevel === 'MODERATE' ? '⚠️' : '🚨'}
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.125rem', fontWeight: 700, color: riskColor }}>
              {result.riskLevel.replace('_', ' ')}
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 2 }}>{result.riskMessage}</div>
          </div>
        </div>
      )}

      {/* 30-day cash flow chart */}
      {result?.chartData && (
        <div className="card">
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 12 }}>Projected 30-day cash balance</p>
          {loading && <div style={{ textAlign: 'center', padding: 8, color: 'var(--text-muted)', fontSize: '0.75rem' }}>Calculating...</div>}
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={result.chartData} margin={{ left: 0, right: 8 }}>
              <defs>
                <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={riskColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={riskColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="day" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} label={{ value: 'Day', fill: 'var(--text-muted)', fontSize: 10, position: 'insideRight' }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} tickFormatter={v => `₹${Math.round(v/1000)}k`} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8 }}
                formatter={v => [`₹${v.toLocaleString('en-IN')}`, 'Cash']} />
              <ReferenceLine y={result.chartData[0]?.threshold || 5000} stroke="var(--signal-red)" strokeDasharray="4 4" label={{ value: 'Min buffer', fill: 'var(--signal-red)', fontSize: 9 }} />
              <Area type="monotone" dataKey="cashBalance" stroke={riskColor} fill="url(#cashGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Key metrics */}
      {result && (
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">30d Revenue</span>
            <span className="stat-value">₹{(result.projectedRevenue30d / 1000).toFixed(0)}k</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Cash Balance</span>
            <span className="stat-value" style={{ color: result.projectedCashBalance < 0 ? 'var(--signal-red)' : 'var(--signal-green)' }}>
              ₹{(result.projectedCashBalance / 1000).toFixed(0)}k
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Capital Lock %</span>
            <span className="stat-value">{result.capitalLockRatio}%</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Safe Max Buy</span>
            <span className="stat-value">₹{(result.safeMaxPurchase / 1000).toFixed(0)}k</span>
          </div>
        </div>
      )}

      {/* Reasoning */}
      {result?.reasoning && (
        <div className="card">
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Analysis</p>
          {result.reasoning.map((r, i) => (
            <div key={i} style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', padding: '6px 0', borderBottom: i < result.reasoning.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
              → {r}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
