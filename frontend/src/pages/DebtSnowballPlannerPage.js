import React, { useEffect, useState } from 'react';

export default function DebtSnowballPlannerPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch('/api/debt-snowball-planner')
      .then((res) => res.json())
      .then(setData)
      .catch(() => setData({ error: 'Unable to load debt snowball planner.' }));
  }, []);

  if (!data) return <div style={{ padding: 32 }}>Loading...</div>;

  return (
    <div style={{ padding: 32, color: '#f8fafc' }}>
      <h1>Debt Snowball Planner</h1>
      <p style={{ color: '#a0a0b0' }}>Payoff sequencing for balances, APR pressure, and safe extra-payment allocation.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(140px, 1fr))', gap: 16, margin: '24px 0' }}>
        <Metric label="Payoff Months" value={data.summary?.payoffMonths} />
        <Metric label="Interest Saved" value={`$${data.summary?.interestSaved?.toLocaleString()}`} />
        <Metric label="Minimum Payment" value={`$${data.summary?.minimumPayment}`} />
        <Metric label="Recommended Extra" value={`$${data.summary?.recommendedExtra}`} />
      </div>
      <div style={{ background: '#16213e', border: '1px solid #0f3460', borderRadius: 8, overflow: 'hidden' }}>
        {data.debts?.map((debt) => (
          <div key={debt.name} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 120px 100px', gap: 12, padding: 16, borderBottom: '1px solid #0f3460' }}>
            <strong>#{debt.order}</strong><span>{debt.name}</span><span>${debt.balance.toLocaleString()}</span><span>{debt.apr}% APR</span>
          </div>
        ))}
      </div>
      <ul style={{ marginTop: 24 }}>{data.actions?.map((action) => <li key={action}>{action}</li>)}</ul>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div style={{ background: '#16213e', border: '1px solid #0f3460', borderRadius: 8, padding: 16 }}>
      <div style={{ color: '#a0a0b0', fontSize: 13 }}>{label}</div>
      <strong style={{ color: '#e94560', fontSize: 24 }}>{value}</strong>
    </div>
  );
}
