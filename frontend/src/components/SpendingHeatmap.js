import React, { useEffect, useState } from 'react';

export default function SpendingHeatmap() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3006'}/api/custom-views/spending-heatmap`, {
      headers: { Authorization: 'Bearer ' + (localStorage.getItem('token') || '') }
    })
      .then(r => r.json())
      .then(d => setData(d))
      .catch(e => setErr(e.message));
  }, []);

  if (err) return <div style={{ color: '#e94560', padding: 16 }}>Error: {err}</div>;
  if (!data) return <div style={{ color: '#a0a0b0', padding: 16 }}>Loading heatmap...</div>;

  const { months = [], matrix = [], max = 1 } = data;
  const colorFor = (v) => {
    if (!v) return '#1a1a2e';
    const t = Math.min(v / (max || 1), 1);
    const r = Math.round(233 * t + 26 * (1 - t));
    const g = Math.round(69 * t + 26 * (1 - t));
    const b = Math.round(96 * t + 46 * (1 - t));
    return `rgb(${r},${g},${b})`;
  };

  return (
    <div style={{ background: '#16213e', border: '1px solid #0f3460', borderRadius: 12, padding: 20, marginBottom: 20 }}>
      <h3 style={{ color: '#e94560', marginTop: 0 }}>Spending Heatmap (Category x Month)</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 4, width: '100%' }}>
          <thead>
            <tr>
              <th style={{ color: '#a0a0b0', textAlign: 'left', padding: 6, fontSize: 12 }}>Category</th>
              {months.map(m => (
                <th key={m} style={{ color: '#a0a0b0', padding: 6, fontSize: 11, fontWeight: 'normal' }}>{m.slice(5)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map(row => (
              <tr key={row.category}>
                <td style={{ color: '#e0e0e0', padding: 6, fontSize: 12 }}>{row.category}</td>
                {row.values.map(v => (
                  <td key={v.month} title={`${row.category} ${v.month}: $${v.amount.toFixed(2)}`}
                      style={{ background: colorFor(v.amount), padding: '10px 6px', textAlign: 'center',
                               color: v.amount > max * 0.5 ? '#fff' : '#a0a0b0', fontSize: 11, borderRadius: 4, minWidth: 50 }}>
                    {v.amount ? `$${Math.round(v.amount)}` : '–'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ color: '#a0a0b0', fontSize: 11, marginTop: 8 }}>Max: ${max.toFixed(2)} (darker red = higher spend)</div>
    </div>
  );
}
