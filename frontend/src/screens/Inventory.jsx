/**
 * Screen 2: Inventory Intelligence
 * Product table with status chips, days-to-stockout, perishable expiry countdown
 */
import { useEffect, useState } from 'react';
import { getInventory, getProducts, updateInventory } from '../api/client';

const TIER_CONFIG = {
  FAST: { label: 'Fast', chipClass: 'chip-green', emoji: '⚡' },
  MEDIUM: { label: 'Medium', chipClass: 'chip-blue', emoji: '📊' },
  SLOW: { label: 'Slow', chipClass: 'chip-amber', emoji: '🐢' },
  DEAD: { label: 'Dead', chipClass: 'chip-red', emoji: '☠️' },
  UNKNOWN: { label: '—', chipClass: 'chip-neutral', emoji: '' },
};

function DaysChip({ days }) {
  if (days >= 999) return <span className="chip chip-neutral">90+ days</span>;
  if (days < 3) return <span className="chip chip-red">🔴 {days}d</span>;
  if (days < 7) return <span className="chip chip-amber">🟡 {days}d</span>;
  if (days < 30) return <span className="chip chip-green">🟢 {days}d</span>;
  return <span className="chip chip-neutral">{days}d</span>;
}

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('daysToStockout');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [addQuantity, setAddQuantity] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getInventory().then(data => {
      setItems(data.items || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = items
    .filter(i => filter === 'ALL' || i.velocityTier === filter)
    .filter(i => !search || i.product?.name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'daysToStockout') return a.daysToStockout - b.daysToStockout;
      if (sortBy === 'capital') return b.capitalLocked - a.capitalLocked;
      if (sortBy === 'name') return (a.product?.name || '').localeCompare(b.product?.name || '');
      return 0;
    });

  const tierCounts = items.reduce((acc, i) => {
    acc[i.velocityTier] = (acc[i.velocityTier] || 0) + 1;
    return acc;
  }, {});

  const handleOpenModal = () => {
    setShowModal(true);
    if (products.length === 0) {
      getProducts().then(data => setProducts(data.products || []));
    }
  };

  const handleAddInventory = async (e) => {
    e.preventDefault();
    if (!selectedProductId || !addQuantity) return;
    
    setIsSubmitting(true);
    
    // Find existing inventory item to get current quantity
    const existingItem = items.find(i => i.productId === selectedProductId);
    const currentQty = existingItem ? existingItem.quantity : 0;
    const newQty = currentQty + parseInt(addQuantity, 10);
    
    try {
      await updateInventory({ productId: selectedProductId, quantity: newQty });
      // Refresh inventory
      const data = await getInventory();
      setItems(data.items || []);
      setShowModal(false);
      setSelectedProductId('');
      setAddQuantity('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: 4 }}>
            Inventory Intelligence
          </h1>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            {items.length} SKUs tracked
          </p>
        </div>
        <button 
          onClick={handleOpenModal}
          className="btn btn-primary"
          style={{ padding: '8px 12px', fontSize: '0.875rem', borderRadius: 'var(--radius-md)', background: 'var(--brand-primary)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <span>➕</span> Add
        </button>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 'var(--space-sm)', overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
        {[['ALL', 'All'], ['FAST', '⚡ Fast'], ['MEDIUM', '📊 Medium'], ['SLOW', '🐢 Slow'], ['DEAD', '☠️ Dead']].map(([key, label]) => (
          <button key={key} className={`chip ${filter === key ? 'chip-brand' : 'chip-neutral'}`}
            style={{ cursor: 'pointer', border: 'none', whiteSpace: 'nowrap' }}
            onClick={() => setFilter(key)}>
            {label} {key !== 'ALL' && tierCounts[key] ? `(${tierCounts[key]})` : ''}
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search products..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)', padding: '10px 14px',
          color: 'var(--text-primary)', fontSize: '0.9375rem', outline: 'none', width: '100%'
        }}
      />

      {/* Sort */}
      <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sort:</span>
        {[['daysToStockout', 'Days left'], ['capital', 'Capital'], ['name', 'Name']].map(([key, label]) => (
          <button key={key} className={`chip ${sortBy === key ? 'chip-brand' : 'chip-neutral'}`}
            style={{ cursor: 'pointer', border: 'none' }}
            onClick={() => setSortBy(key)}>
            {label}
          </button>
        ))}
      </div>

      {/* Inventory list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(8)].map((_, i) => <div key={i} className="skeleton" style={{ height: 72 }} />)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {filtered.map(item => {
            const p = item.product;
            const tier = TIER_CONFIG[item.velocityTier] || TIER_CONFIG.UNKNOWN;
            const capitalLocked = item.capitalLocked || (item.quantity * (p?.purchasePrice || 0));

            return (
              <div key={item.productId} className="card" style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {tier.emoji} {p?.name || item.productId}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p?.brand} · {p?.category}</div>
                  </div>
                  <DaysChip days={item.daysToStockout} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 2 }}>QTY</div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.quantity} {p?.unit}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 2 }}>DAILY SALES</div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.avgDailySales}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 2 }}>LOCKED</div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                      ₹{capitalLocked >= 1000 ? `${(capitalLocked / 1000).toFixed(1)}k` : capitalLocked}
                    </div>
                  </div>
                </div>
                {p?.perishable && item.batchExpiryDate && (
                  <div className="alert-banner warning" style={{ marginTop: 8, padding: '6px 10px', fontSize: '0.75rem' }}>
                    ⏰ Expires: {new Date(item.batchExpiryDate).toLocaleDateString('en-IN')}
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--text-muted)' }}>
              No products match this filter.
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="card" style={{ width: '90%', maxWidth: 400, padding: 'var(--space-md)' }}>
            <h2 style={{ marginBottom: 'var(--space-sm)' }}>Add Material</h2>
            <form onSubmit={handleAddInventory} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: 4, fontWeight: 500 }}>Select Product</label>
                <select 
                  value={selectedProductId}
                  onChange={e => setSelectedProductId(e.target.value)}
                  style={{
                    width: '100%', padding: '10px', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)', background: 'var(--bg-input, var(--bg-card))',
                    color: 'var(--text-primary)', outline: 'none', fontSize: '0.9375rem'
                  }}
                  required
                >
                  <option value="" disabled>Select a product...</option>
                  {products.map(p => (
                    <option key={p.productId} value={p.productId}>{p.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', marginBottom: 4, fontWeight: 500 }}>Quantity to Add</label>
                <input 
                  type="number" 
                  value={addQuantity}
                  onChange={e => setAddQuantity(e.target.value)}
                  placeholder="e.g., 50"
                  style={{
                    width: '100%', padding: '10px', borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)', background: 'var(--bg-input, var(--bg-card))',
                    color: 'var(--text-primary)', outline: 'none', fontSize: '0.9375rem'
                  }}
                  required
                  min="1"
                />
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 500 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--brand-primary)', color: 'white', cursor: isSubmitting ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: isSubmitting ? 0.7 : 1 }}
                >
                  {isSubmitting ? 'Saving...' : 'Add Balance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
