/**
 * Screen 3: Capital / Financial Intelligence
 * Cash locked by tier, Cash Conversion Clock, category stacked bars
 */
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import CountUpPkg from 'react-countup';
const CountUp = CountUpPkg.default || CountUpPkg;
import { getWorkingCapital } from '../api/client';

const TIER_COLORS = { FAST: 'var(--signal-green)', MEDIUM: 'var(--signal-blue)', SLOW: 'var(--signal-amber)', DEAD: 'var(--signal-red)' };

export default function Capital() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    getWorkingCapital().then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="screen">
      <div className="skeleton" style={{ height: 200, marginBottom: 16 }} />
      <div className="skeleton" style={{ height: 150 }} />
    </div>
  );

  const { breakdown = {}, totalCapital = 0, lockedCapital = 0, categoryBreakdown = {} } = data || {};

  const categoryChartData = Object.entries(categoryBreakdown)
    .map(([cat, tiers]) => ({
      name: cat.replace(' & ', ' &\n'),
      FAST: Math.round(tiers.FAST / 1000),
      MEDIUM: Math.round(tiers.MEDIUM / 1000),
      SLOW: Math.round(tiers.SLOW / 1000),
      DEAD: Math.round(tiers.DEAD / 1000),
    }))
    .filter(d => d.FAST + d.MEDIUM + d.SLOW + d.DEAD > 0)
    .sort((a, b) => (b.SLOW + b.DEAD) - (a.SLOW + a.DEAD));

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: 4 }}>
          Capital Intelligence
        </h1>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Where your money is and what it's doing</p>
      </div>

      {/* Total capital card */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #14151F, #1A1B2E)', border: '1px solid rgba(124, 111, 255, 0.15)' }}>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Total Capital Deployed
        </p>
        <div style={{ fontSize: '2.25rem', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
          ₹<CountUp end={totalCapital} duration={1.8} separator="," />
        </div>
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, height: 8, background: 'var(--bg-elevated)', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
            {Object.entries(breakdown).map(([tier, d]) => (
              <div key={tier} style={{ width: `${d.percent}%`, background: TIER_COLORS[tier], height: '100%' }} />
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
          {Object.entries(TIER_COLORS).map(([tier, color]) => (
            <div key={tier} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{tier} {breakdown[tier]?.percent || 0}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Locked capital alert */}
      <div className="alert-banner warning" style={{ alignItems: 'flex-start' }}>
        <span style={{ fontSize: '1.25rem' }}>🔒</span>
        <div>
          <div style={{ fontWeight: 700 }}>
            ₹{lockedCapital.toLocaleString('en-IN')} locked in slow & dead stock
          </div>
          <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: 2 }}>
            This money is earning zero return. See recovery options in Actions tab.
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8 }}>
        {['overview', 'by-tier', 'by-category'].map(tab => (
          <button key={tab} className={`chip ${activeTab === tab ? 'chip-brand' : 'chip-neutral'}`}
            style={{ cursor: 'pointer', border: 'none', padding: '6px 14px' }}
            onClick={() => setActiveTab(tab)}>
            {tab === 'overview' ? 'Overview' : tab === 'by-tier' ? 'By Tier' : 'By Category'}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-sm)' }}>
          {Object.entries(breakdown).map(([tier, d]) => (
            <div key={tier} className="card" style={{ borderLeft: `3px solid ${TIER_COLORS[tier]}` }}>
              <div style={{ fontSize: '0.7rem', color: TIER_COLORS[tier], fontWeight: 700, marginBottom: 4, textTransform: 'uppercase' }}>
                {tier}
              </div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700 }}>
                ₹{(d.capital / 1000).toFixed(1)}k
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{d.count} SKUs · {d.percent}%</div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'by-tier' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {Object.entries(breakdown).map(([tier, d]) => (
            <div key={tier} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 600, color: TIER_COLORS[tier] }}>{tier} Stock</span>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}>₹{d.capital.toLocaleString('en-IN')}</span>
              </div>
              {d.products?.slice(0, 3).map(p => (
                <div key={p.productId} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: '1px solid var(--border-subtle)', fontSize: '0.8125rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{p.name}</span>
                  <span>₹{p.capitalLocked.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'by-category' && categoryChartData.length > 0 && (
        <div className="card">
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 12 }}>Capital by category (₹k)</p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={categoryChartData} layout="vertical" margin={{ left: 0, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 9 }} width={70} />
              <Tooltip
                contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8 }}
                formatter={(v) => [`₹${v}k`, '']}
              />
              {Object.entries(TIER_COLORS).map(([tier, color]) => (
                <Bar key={tier} dataKey={tier} stackId="a" fill={color} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
