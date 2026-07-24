import React, { useState } from 'react';

export default function BudgetPDFExport() {
  const [downloading, setDownloading] = useState(false);
  const [status, setStatus] = useState('');

  const download = async () => {
    setDownloading(true); setStatus('');
    try {
      const r = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3006'}/api/custom-views/budget-pdf`, {
        headers: { Authorization: 'Bearer ' + (localStorage.getItem('token') || '') }
      });
      if (!r.ok) { setStatus('Failed: ' + r.status); setDownloading(false); return; }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `monthly-budget-${new Date().toISOString().slice(0,10)}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      setStatus('Downloaded.');
    } catch (e) { setStatus('Error: ' + e.message); }
    setDownloading(false);
  };

  return (
    <div style={{ background: '#16213e', border: '1px solid #0f3460', borderRadius: 12, padding: 20, marginBottom: 20 }}>
      <h3 style={{ color: '#e94560', marginTop: 0 }}>Monthly Budget PDF Export</h3>
      <p style={{ color: '#a0a0b0', fontSize: 13 }}>
        Generate a printable PDF with all budgets, limits, spent amounts, and remaining balances for the current month.
      </p>
      <button onClick={download} disabled={downloading}
        style={{ background: '#e94560', color: '#fff', border: 'none', padding: '10px 20px',
                 borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 'bold' }}>
        {downloading ? 'Generating...' : 'Download Monthly Budget PDF'}
      </button>
      {status && <div style={{ color: '#a0a0b0', marginTop: 10, fontSize: 12 }}>{status}</div>}
    </div>
  );
}
