import React, { useEffect, useState } from 'react';

export default function NetWorthTrendChart() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    fetch('http://localhost:3006/api/custom-views/net-worth-trend', {
      headers: { Authorization: 'Bearer ' + (localStorage.getItem('token') || '') }
    })
      .then(r => r.json())
      .then(d => setData(d))
      .catch(e => setErr(e.message));
  }, []);

  if (err) return <div style={{ color: '#e94560', padding: 16 }}>Error: {err}</div>;
  if (!data) return <div style={{ color: '#a0a0b0', padding: 16 }}>Loading net-worth trend...</div>;

  const trend = data.trend || [];
  const values = trend.map(t => t.net_worth);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const W = 600, H = 220, pad = 40;
  const innerW = W - pad * 2, innerH = H - pad * 2;
  const pts = trend.map((t, i) => {
    const x = pad + (i * innerW) / Math.max(trend.length - 1, 1);
    const y = pad + innerH - ((t.net_worth - min) / range) * innerH;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={{ background: '#16213e', border: '1px solid #0f3460', borderRadius: 12, padding: 20, marginBottom: 20 }}>
      <h3 style={{ color: '#e94560', marginTop: 0 }}>Net-Worth Trend (Last 6 Months)</h3>
      <div style={{ color: '#a0a0b0', fontSize: 13, marginBottom: 10 }}>
        Current Net Worth: <b style={{ color: '#4ade80' }}>${(data.current_net_worth || 0).toLocaleString()}</b>
      </div>
      <svg width={W} height={H} style={{ background: '#1a1a2e', borderRadius: 8 }}>
        <polyline fill="none" stroke="#e94560" strokeWidth="2" points={pts} />
        {trend.map((t, i) => {
          const x = pad + (i * innerW) / Math.max(trend.length - 1, 1);
          const y = pad + innerH - ((t.net_worth - min) / range) * innerH;
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="4" fill="#e94560" />
              <text x={x} y={H - 10} fill="#a0a0b0" fontSize="10" textAnchor="middle">{t.month.slice(5)}</text>
              <text x={x} y={y - 8} fill="#e0e0e0" fontSize="9" textAnchor="middle">${Math.round(t.net_worth / 1000)}k</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
