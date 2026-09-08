/**
 * Screen 7: Digital Khata (Customer Credit Ledger)
 */
import { useEffect, useState } from 'react';
import { getKhata, sendWhatsAppReminder } from '../api/client';

export default function Khata() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState({});
  const [sentResult, setSentResult] = useState({});

  useEffect(() => {
    getKhata().then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleReminder = async (customer) => {
    setSending(s => ({ ...s, [customer.customerId]: true }));
    
    // Generate WhatsApp click-to-chat link
    const message = `Namaskar ${customer.name}ji! 🙏\n\nYour account at our store has an outstanding balance of ₹${customer.currentDue.toLocaleString('en-IN')}.\n\nKindly clear the amount at your earliest convenience.\n\nThank you!`;
    const phoneStr = customer.phone.replace(/\D/g, '');
    const phoneWithCode = phoneStr.length <= 10 ? `91${phoneStr}` : phoneStr; // Default to India code +91
    const url = `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(message)}`;
    
    // Open WhatsApp in a new tab
    window.open(url, '_blank', 'noopener,noreferrer');
    
    // Mark as sent in UI immediately
    setSentResult(r => ({ ...r, [customer.customerId]: { success: true } }));
    setSending(s => ({ ...s, [customer.customerId]: false }));
  };

  const summary = data?.summary || {};
  const customers = data?.customers || [];

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, marginBottom: 4 }}>Digital Khata</h1>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Customer credit ledger</p>
      </div>

      {/* Summary */}
      <div className="card" style={{ background: 'var(--bg-card)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
          <div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Due</p>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--signal-amber)' }}>
              ₹{(summary.totalDue || 0).toLocaleString('en-IN')}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overdue</p>
            <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--signal-red)' }}>
              ₹{(summary.overdueDue || 0).toLocaleString('en-IN')}
            </p>
          </div>
        </div>
        {summary.overdueCount > 0 && (
          <div className="alert-banner critical" style={{ marginTop: 12 }}>
            ⚠ {summary.overdueCount} customer{summary.overdueCount > 1 ? 's' : ''} overdue — send reminders
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton" style={{ height: 120 }} />)}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
          {customers.map(customer => (
            <div key={customer.customerId} className="card"
              style={{ borderLeft: customer.isOverdue ? '3px solid var(--signal-red)' : '3px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1rem' }}>{customer.name}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>📱 {customer.phone}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700,
                    color: customer.isOverdue ? 'var(--signal-red)' : 'var(--text-primary)' }}>
                    ₹{customer.currentDue.toLocaleString('en-IN')}
                  </div>
                  {customer.isOverdue && (
                    <span className="chip chip-red" style={{ fontSize: '0.65rem' }}>OVERDUE</span>
                  )}
                </div>
              </div>

              {/* Transaction summary */}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                Last payment: {customer.lastPaymentDate
                  ? new Date(customer.lastPaymentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                  : 'Never'} ·
                Limit: ₹{customer.creditLimit.toLocaleString('en-IN')}
              </div>

              {/* WhatsApp reminder */}
              {customer.isOverdue && (
                <>
                  {sentResult[customer.customerId] ? (
                    <div className="alert-banner success" style={{ fontSize: '0.8125rem' }}>
                      ✅ WhatsApp opened! Message pre-filled.
                    </div>
                  ) : (
                    <button
                      className="btn btn-full"
                      style={{ background: '#25D366', color: 'white', gap: 8 }}
                      onClick={() => handleReminder(customer)}
                      disabled={sending[customer.customerId]}>
                      {sending[customer.customerId] ? '⟳ Sending...' : '📱 Send WhatsApp Reminder'}
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
