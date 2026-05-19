// customViews.js — 4 endpoints for Money Views feature
// VIZ: net-worth trend, spending category heatmap
// NON-VIZ: monthly budget PDF, budget/savings rules editor (CRUD goals + alerts)
const express = require('express');
const pool = require('../models/db');
const auth = require('../middleware/auth');
let PDFDocument = null;
try { PDFDocument = require('pdfkit'); } catch (e) { /* fallback to text PDF below */ }

const r = express.Router();

// Ensure savings_goals table exists
pool.query(`CREATE TABLE IF NOT EXISTS savings_goals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  name VARCHAR(255) NOT NULL,
  target_amount NUMERIC NOT NULL DEFAULT 0,
  current_amount NUMERIC NOT NULL DEFAULT 0,
  monthly_contribution NUMERIC NOT NULL DEFAULT 0,
  alert_threshold_pct NUMERIC NOT NULL DEFAULT 80,
  category VARCHAR(100),
  due_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)`).catch(() => {});

// ============================================================
// VIZ #1 — Net-worth trend (6 months)
// GET /api/custom-views/net-worth-trend
// ============================================================
r.get('/net-worth-trend', auth, async (req, res) => {
  try {
    // Compute current net worth from accounts
    const cur = await pool.query('SELECT COALESCE(SUM(balance),0) AS total FROM accounts');
    const currentNet = Number(cur.rows[0].total) || 0;

    // Get monthly net delta from transactions for last 6 months
    const tx = await pool.query(`
      SELECT
        TO_CHAR(date_trunc('month', date), 'YYYY-MM') AS month,
        COALESCE(SUM(CASE WHEN transaction_type='credit' THEN amount ELSE -amount END), 0) AS net_delta
      FROM transactions
      WHERE date >= (CURRENT_DATE - INTERVAL '6 months')
      GROUP BY 1
      ORDER BY 1 ASC
    `);

    // Build series by walking forward from a baseline
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ month: d.toISOString().slice(0, 7), net_delta: 0 });
    }
    const map = Object.fromEntries(months.map(m => [m.month, m]));
    tx.rows.forEach(row => { if (map[row.month]) map[row.month].net_delta = Number(row.net_delta); });

    // Reconstruct trend backward from currentNet
    const totalForward = months.reduce((s, m) => s + m.net_delta, 0);
    const baseline = currentNet - totalForward;
    let running = baseline;
    const series = months.map(m => {
      running += m.net_delta;
      return { month: m.month, net_worth: Math.round(running * 100) / 100, delta: m.net_delta };
    });

    res.json({ current_net_worth: currentNet, trend: series });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// VIZ #2 — Spending category heatmap (category x month)
// GET /api/custom-views/spending-heatmap
// ============================================================
r.get('/spending-heatmap', auth, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COALESCE(category, 'Uncategorized') AS category,
        TO_CHAR(date_trunc('month', date), 'YYYY-MM') AS month,
        ROUND(SUM(amount)::numeric, 2) AS total
      FROM transactions
      WHERE transaction_type = 'debit'
        AND date >= (CURRENT_DATE - INTERVAL '6 months')
      GROUP BY 1, 2
      ORDER BY 1, 2
    `);

    // Build distinct months (last 6) and categories
    const monthsSet = new Set();
    const catsSet = new Set();
    const cells = {};
    result.rows.forEach(row => {
      monthsSet.add(row.month);
      catsSet.add(row.category);
      cells[`${row.category}|${row.month}`] = Number(row.total);
    });

    // Always include 6 months
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.toISOString().slice(0, 7));
    }

    const categories = Array.from(catsSet).sort();
    const matrix = categories.map(cat => ({
      category: cat,
      values: months.map(m => ({ month: m, amount: cells[`${cat}|${m}`] || 0 }))
    }));

    // Compute max for color scaling
    let max = 0;
    matrix.forEach(row => row.values.forEach(v => { if (v.amount > max) max = v.amount; }));

    res.json({ months, categories, matrix, max });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// NON-VIZ #1 — Monthly budget PDF
// GET /api/custom-views/budget-pdf
// ============================================================
r.get('/budget-pdf', auth, async (req, res) => {
  try {
    const budgets = await pool.query(`
      SELECT
        b.category,
        b.monthly_limit,
        COALESCE(t.actual_spent, 0) AS spent,
        b.monthly_limit - COALESCE(t.actual_spent, 0) AS remaining
      FROM budgets b
      LEFT JOIN (
        SELECT LOWER(category) AS cat, SUM(amount) AS actual_spent
        FROM transactions
        WHERE transaction_type='debit' AND date >= DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY LOWER(category)
      ) t ON LOWER(b.category) = t.cat
      ORDER BY b.category
    `);

    if (PDFDocument) {
      const doc = new PDFDocument({ margin: 40 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="monthly-budget.pdf"');
      doc.pipe(res);

      doc.fontSize(20).fillColor('#e94560').text('Monthly Budget Report', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor('#666').text(
        `Generated: ${new Date().toISOString().slice(0,10)}`, { align: 'center' });
      doc.moveDown();

      let totalLimit = 0, totalSpent = 0;
      doc.fontSize(11).fillColor('#000');
      doc.text('Category', 50, doc.y, { continued: true, width: 180 });
      doc.text('Limit', 230, undefined, { continued: true, width: 90 });
      doc.text('Spent', 320, undefined, { continued: true, width: 90 });
      doc.text('Remaining', 410);
      doc.moveTo(50, doc.y + 2).lineTo(540, doc.y + 2).stroke();
      doc.moveDown(0.5);

      budgets.rows.forEach(b => {
        const lim = Number(b.monthly_limit) || 0;
        const sp = Number(b.spent) || 0;
        const rem = Number(b.remaining) || 0;
        totalLimit += lim; totalSpent += sp;
        doc.fillColor(rem < 0 ? '#c00' : '#000');
        doc.text(b.category, 50, doc.y, { continued: true, width: 180 });
        doc.text(`$${lim.toFixed(2)}`, 230, undefined, { continued: true, width: 90 });
        doc.text(`$${sp.toFixed(2)}`, 320, undefined, { continued: true, width: 90 });
        doc.text(`$${rem.toFixed(2)}`, 410);
        doc.moveDown(0.25);
      });
      doc.moveDown();
      doc.fillColor('#000').fontSize(12).text(
        `Totals — Limit: $${totalLimit.toFixed(2)} | Spent: $${totalSpent.toFixed(2)} | Remaining: $${(totalLimit-totalSpent).toFixed(2)}`
      );
      doc.end();
    } else {
      // Fallback to text/plain "PDF-like" output if pdfkit not installed
      res.setHeader('Content-Type', 'text/plain');
      const lines = ['Monthly Budget Report', '====================='];
      budgets.rows.forEach(b => {
        lines.push(`${b.category}: limit $${b.monthly_limit} spent $${b.spent} remaining $${b.remaining}`);
      });
      res.send(lines.join('\n'));
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ============================================================
// NON-VIZ #2 — Budget / Savings rules editor (CRUD goals + alerts)
// GET    /api/custom-views/goals
// POST   /api/custom-views/goals
// PUT    /api/custom-views/goals/:id
// DELETE /api/custom-views/goals/:id
// GET    /api/custom-views/goals/alerts
// ============================================================
r.get('/goals', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM savings_goals ORDER BY id ASC`);
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.post('/goals', auth, async (req, res) => {
  try {
    const { name, target_amount, current_amount, monthly_contribution, alert_threshold_pct, category, due_date } = req.body;
    if (!name || typeof name !== 'string' || !name.trim())
      return res.status(400).json({ error: 'name is required' });
    if (!target_amount || isNaN(Number(target_amount)) || Number(target_amount) <= 0)
      return res.status(400).json({ error: 'target_amount must be positive number' });
    const { rows } = await pool.query(
      `INSERT INTO savings_goals(user_id, name, target_amount, current_amount, monthly_contribution, alert_threshold_pct, category, due_date)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.user.id, name.trim(), Number(target_amount), Number(current_amount)||0, Number(monthly_contribution)||0, Number(alert_threshold_pct)||80, category||null, due_date||null]
    );
    res.status(201).json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.put('/goals/:id', auth, async (req, res) => {
  try {
    const { name, target_amount, current_amount, monthly_contribution, alert_threshold_pct, category, due_date } = req.body;
    const { rows } = await pool.query(
      `UPDATE savings_goals SET
         name = COALESCE($1, name),
         target_amount = COALESCE($2, target_amount),
         current_amount = COALESCE($3, current_amount),
         monthly_contribution = COALESCE($4, monthly_contribution),
         alert_threshold_pct = COALESCE($5, alert_threshold_pct),
         category = COALESCE($6, category),
         due_date = COALESCE($7, due_date),
         updated_at = NOW()
       WHERE id = $8 RETURNING *`,
      [name||null, target_amount?Number(target_amount):null, current_amount!=null?Number(current_amount):null,
       monthly_contribution!=null?Number(monthly_contribution):null,
       alert_threshold_pct!=null?Number(alert_threshold_pct):null,
       category||null, due_date||null, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Goal not found' });
    res.json(rows[0]);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.delete('/goals/:id', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`DELETE FROM savings_goals WHERE id=$1 RETURNING id`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Goal not found' });
    res.json({ message: 'Deleted' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET alerts — budgets/goals that crossed user-defined threshold
r.get('/goals/alerts', auth, async (req, res) => {
  try {
    const goals = await pool.query(`SELECT * FROM savings_goals`);
    const budgets = await pool.query(`
      SELECT b.id, b.category, b.monthly_limit,
        COALESCE(t.actual_spent, 0) AS spent
      FROM budgets b
      LEFT JOIN (
        SELECT LOWER(category) AS cat, SUM(amount) AS actual_spent
        FROM transactions
        WHERE transaction_type='debit' AND date >= DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY LOWER(category)
      ) t ON LOWER(b.category) = t.cat
    `);

    const alerts = [];
    budgets.rows.forEach(b => {
      const limit = Number(b.monthly_limit) || 1;
      const spent = Number(b.spent) || 0;
      const pct = (spent / limit) * 100;
      if (pct >= 80) {
        alerts.push({
          type: 'budget',
          severity: pct >= 100 ? 'over' : 'warn',
          category: b.category,
          message: `Budget ${b.category} is ${pct.toFixed(1)}% used ($${spent.toFixed(2)} of $${limit.toFixed(2)})`,
          pct_used: pct
        });
      }
    });
    goals.rows.forEach(g => {
      const tgt = Number(g.target_amount) || 1;
      const cur = Number(g.current_amount) || 0;
      const pct = (cur / tgt) * 100;
      const threshold = Number(g.alert_threshold_pct) || 80;
      if (pct >= threshold) {
        alerts.push({
          type: 'goal',
          severity: pct >= 100 ? 'achieved' : 'milestone',
          name: g.name,
          message: `Goal "${g.name}" at ${pct.toFixed(1)}% ($${cur.toFixed(2)} / $${tgt.toFixed(2)})`,
          pct_complete: pct
        });
      }
    });

    res.json({ alerts, count: alerts.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = r;
