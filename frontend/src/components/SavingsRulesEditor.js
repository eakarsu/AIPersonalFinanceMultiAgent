import React, { useEffect, useState } from 'react';

const BASE = `${process.env.REACT_APP_API_URL || 'http://localhost:3006'}/api/custom-views`;

export default function SavingsRulesEditor() {
  const [goals, setGoals] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [form, setForm] = useState({ name: '', target_amount: '', current_amount: '', monthly_contribution: '', alert_threshold_pct: 80, category: '' });
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState('');

  const auth = { Authorization: 'Bearer ' + (localStorage.getItem('token') || ''), 'Content-Type': 'application/json' };

  const load = async () => {
    try {
      const [g, a] = await Promise.all([
        fetch(`${BASE}/goals`, { headers: auth }).then(r => r.json()),
        fetch(`${BASE}/goals/alerts`, { headers: auth }).then(r => r.json())
      ]);
      setGoals(Array.isArray(g) ? g : []);
      setAlerts(a.alerts || []);
    } catch (e) { setErr(e.message); }
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      const url = editing ? `${BASE}/goals/${editing}` : `${BASE}/goals`;
      const method = editing ? 'PUT' : 'POST';
      const r = await fetch(url, { method, headers: auth, body: JSON.stringify(form) });
      if (!r.ok) { const d = await r.json(); setErr(d.error || 'Failed'); return; }
      setForm({ name: '', target_amount: '', current_amount: '', monthly_contribution: '', alert_threshold_pct: 80, category: '' });
      setEditing(null);
      load();
    } catch (e) { setErr(e.message); }
  };

  const edit = (g) => {
    setEditing(g.id);
    setForm({
      name: g.name, target_amount: g.target_amount, current_amount: g.current_amount,
      monthly_contribution: g.monthly_contribution, alert_threshold_pct: g.alert_threshold_pct,
      category: g.category || ''
    });
  };

  const del = async (id) => {
    await fetch(`${BASE}/goals/${id}`, { method: 'DELETE', headers: auth });
    load();
  };

  const input = { background: '#1a1a2e', border: '1px solid #0f3460', color: '#e0e0e0', padding: '8px 10px', borderRadius: 6, fontSize: 13, flex: 1 };

  return (
    <div style={{ background: '#16213e', border: '1px solid #0f3460', borderRadius: 12, padding: 20, marginBottom: 20 }}>
      <h3 style={{ color: '#e94560', marginTop: 0 }}>Budget / Savings Rules Editor</h3>

      {alerts.length > 0 && (
        <div style={{ background: '#1a1a2e', border: '1px solid #e94560', borderRadius: 8, padding: 12, marginBottom: 14 }}>
          <b style={{ color: '#e94560', fontSize: 13 }}>Alerts ({alerts.length})</b>
          {alerts.map((a, i) => (
            <div key={i} style={{ color: a.severity === 'over' || a.severity === 'achieved' ? '#4ade80' : '#fbbf24', fontSize: 12, marginTop: 6 }}>
              [{a.severity.toUpperCase()}] {a.message}
            </div>
          ))}
        </div>
      )}

      <form onSubmit={submit} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        <input style={input} placeholder="Goal name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        <input style={input} placeholder="Target $" type="number" value={form.target_amount} onChange={e => setForm({ ...form, target_amount: e.target.value })} required />
        <input style={input} placeholder="Current $" type="number" value={form.current_amount} onChange={e => setForm({ ...form, current_amount: e.target.value })} />
        <input style={input} placeholder="Monthly $" type="number" value={form.monthly_contribution} onChange={e => setForm({ ...form, monthly_contribution: e.target.value })} />
        <input style={input} placeholder="Alert %" type="number" value={form.alert_threshold_pct} onChange={e => setForm({ ...form, alert_threshold_pct: e.target.value })} />
        <input style={input} placeholder="Category" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
        <button type="submit" style={{ background: '#e94560', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 'bold' }}>
          {editing ? 'Update' : 'Add Goal'}
        </button>
        {editing && (
          <button type="button" onClick={() => { setEditing(null); setForm({ name: '', target_amount: '', current_amount: '', monthly_contribution: '', alert_threshold_pct: 80, category: '' }); }}
            style={{ background: 'transparent', color: '#a0a0b0', border: '1px solid #0f3460', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}>
            Cancel
          </button>
        )}
      </form>

      {err && <div style={{ color: '#e94560', fontSize: 12, marginBottom: 10 }}>{err}</div>}

      <table style={{ width: '100%', borderCollapse: 'collapse', color: '#e0e0e0', fontSize: 13 }}>
        <thead>
          <tr style={{ color: '#a0a0b0', borderBottom: '1px solid #0f3460' }}>
            <th style={{ padding: 8, textAlign: 'left' }}>Name</th>
            <th style={{ padding: 8, textAlign: 'right' }}>Target</th>
            <th style={{ padding: 8, textAlign: 'right' }}>Current</th>
            <th style={{ padding: 8, textAlign: 'right' }}>Monthly</th>
            <th style={{ padding: 8, textAlign: 'right' }}>Alert %</th>
            <th style={{ padding: 8, textAlign: 'right' }}>Progress</th>
            <th style={{ padding: 8 }}></th>
          </tr>
        </thead>
        <tbody>
          {goals.length === 0 && (
            <tr><td colSpan="7" style={{ padding: 16, textAlign: 'center', color: '#a0a0b0' }}>No goals yet — create one above.</td></tr>
          )}
          {goals.map(g => {
            const pct = ((Number(g.current_amount) / Number(g.target_amount)) * 100) || 0;
            return (
              <tr key={g.id} style={{ borderBottom: '1px solid #0f3460' }}>
                <td style={{ padding: 8 }}>{g.name}</td>
                <td style={{ padding: 8, textAlign: 'right' }}>${Number(g.target_amount).toFixed(2)}</td>
                <td style={{ padding: 8, textAlign: 'right' }}>${Number(g.current_amount).toFixed(2)}</td>
                <td style={{ padding: 8, textAlign: 'right' }}>${Number(g.monthly_contribution).toFixed(2)}</td>
                <td style={{ padding: 8, textAlign: 'right' }}>{g.alert_threshold_pct}%</td>
                <td style={{ padding: 8, textAlign: 'right', color: pct >= 100 ? '#4ade80' : pct >= g.alert_threshold_pct ? '#fbbf24' : '#a0a0b0' }}>{pct.toFixed(1)}%</td>
                <td style={{ padding: 8, textAlign: 'right' }}>
                  <button onClick={() => edit(g)} style={{ marginRight: 6, background: '#0f3460', color: '#e0e0e0', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Edit</button>
                  <button onClick={() => del(g.id)} style={{ background: '#e94560', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Delete</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
