/**
 * Screen 10: Micro-Factoring
 * Per-SKU instant advance quotes tied to Cash Conversion Clock
 */
import { useEffect, useState } from 'react';
import { getInventory, getFactoringQuote, acceptFactoringQuote } from '../api/client';

export default function Factoring() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    getInventory().then(d => {
      const eligible = (d.items || []).filter(i => i.velocityTier === 'FAST' || i.velocityTier === 'MEDIUM');
      setProducts(eligible);
      if (eligible.length > 0) setSelectedProduct(eligible.find(i => i.product?.name?.includes('Rice')) || eligible[0]);
    });
  }, []);

  const handleGetQuote = async () => {
    if (!selectedProduct) return;
    setLoading(true);
    setQuote(null);
    setAccepted(false);
    try {
      const result = await getFactoringQuote(selectedProduct.productId);
      setQuote(result);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!quote?.quote?.quoteId) return;
    setAccepting(true);
    try {
      await acceptFactoringQuote(quote.quote.quoteId);
      setAccepted(true);
    } finally {
      setAccepting(false);
    }
  };

  const q = quote?.quote;

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: 4 }}>Micro-Factoring</h1>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Instant advance against your inventory's predicted cash flow</p>
      </div>

      {/* Explainer */}
      <div className="alert-banner info">
        <span>💡</span>
        <div style={{ fontSize: '0.8125rem' }}>
          Not a loan. Your inventory's predicted sell-through is the collateral — no credit check needed.
        </div>
      </div>

      {/* Product selector */}
      <div className="card">
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Select Product
        </p>
        <select
          value={selectedProduct?.productId || ''}
          onChange={e => {
            setSelectedProduct(products.find(p => p.productId === e.target.value));
            setQuote(null); setAccepted(false);
          }}
          style={{
            background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-sm)', padding: '10px 12px',
            color: 'var(--text-primary)', fontSize: '0.875rem', width: '100%', outline: 'none',
            marginBottom: 8
          }}>
          {products.map(p => (
            <option key={p.productId} value={p.productId}>
              {p.product?.name || p.productId} ({p.velocityTier})
            </option>
          ))}
        </select>
        {selectedProduct && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            <div>📦 Stock: {selectedProduct.quantity} units</div>
            <div>📈 Daily sales: {selectedProduct.avgDailySales}</div>
            <div>⏱ Days left: {selectedProduct.daysToStockout}</div>
            <div>💰 ₹{selectedProduct.product?.sellingPrice}/unit</div>
          </div>
        )}
        <button className="btn btn-primary btn-full" style={{ marginTop: 12 }} onClick={handleGetQuote} disabled={loading || !selectedProduct}>
          {loading ? '⟳ Computing quote...' : '⚡ Get Instant Quote'}
        </button>
      </div>

      {/* Quote result */}
      {quote?.eligible === false && (
        <div className="alert-banner critical">
          <span>❌</span>
          <span>{quote.reason}</span>
        </div>
      )}

      {q && quote?.eligible !== false && (
        <div className="card" style={{
          background: 'var(--bg-card)',
          border: '1px solid rgba(0, 229, 195, 0.2)',
          boxShadow: '0 0 30px rgba(0, 229, 195, 0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Advance Quote</p>
            {accepted
              ? <span className="chip chip-green">✓ Accepted</span>
              : <span className="chip chip-brand">Valid 48h</span>}
          </div>

          {/* Big number */}
          <div style={{ textAlign: 'center', padding: 'var(--space-md) 0', marginBottom: 'var(--space-md)', borderBottom: '1px solid var(--border-subtle)' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>You receive today</p>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', fontWeight: 800, color: 'var(--brand-accent)' }}>
              ₹{q.advanceAmount?.toLocaleString('en-IN')}
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 4 }}>Auto-repaid as {q.productName} sales post</p>
          </div>

          {/* Terms */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 'var(--space-md)' }}>
            {[
              { label: 'Projected 7-day revenue', value: `₹${q.projectedRevenue7d?.toLocaleString('en-IN')}` },
              { label: 'Forecast confidence', value: `${Math.round((q.forecastConfidence || 0) * 100)}%` },
              { label: 'Fee rate', value: `${q.feeRate}%` },
              { label: 'Fee amount', value: `₹${q.feeAmount?.toLocaleString('en-IN')}` },
              { label: 'Repayment amount', value: `₹${q.repaymentAmount?.toLocaleString('en-IN')}` },
              { label: 'Cash conversion days', value: `${Math.round(q.avgCashConversionDays)} days` },
            ].map(({ label, value }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', padding: '4px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                <span style={{ fontWeight: 600 }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Formula explanation */}
          {q.explanation && (
            <div style={{ background: 'var(--bg-glass)', padding: 10, borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-md)' }}>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>How this is calculated</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{q.explanation.formula}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>{q.explanation.feeExplanation}</p>
            </div>
          )}

          {!accepted ? (
            <button className="btn btn-full" style={{ background: 'var(--brand-accent)', color: 'var(--bg-primary)', fontWeight: 700 }}
              onClick={handleAccept} disabled={accepting}>
              {accepting ? '⟳ Processing...' : `Accept ₹${q.advanceAmount?.toLocaleString('en-IN')} Advance`}
            </button>
          ) : (
            <div className="alert-banner success">✅ Advance accepted! Funds will be disbursed within 2 hours.</div>
          )}
        </div>
      )}
    </div>
  );
}
