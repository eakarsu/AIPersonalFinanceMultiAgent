const express = require('express');
const pool = require('../models/db');
const auth = require('../middleware/auth');

const r = express.Router();

// GET /api/budgets — compute spent live from transactions instead of using stale seeded value
r.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        b.*,
        COALESCE(t.actual_spent, 0) AS spent,
        b.monthly_limit - COALESCE(t.actual_spent, 0) AS remaining,
        CASE
          WHEN b.monthly_limit > 0
          THEN ROUND((COALESCE(t.actual_spent, 0) / b.monthly_limit) * 100, 1)
          ELSE 0
        END AS pct_used
      FROM budgets b
      LEFT JOIN (
        SELECT
          LOWER(category) AS cat,
          SUM(amount) AS actual_spent
        FROM transactions
        WHERE transaction_type = 'debit'
          AND date >= DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY LOWER(category)
      ) t ON LOWER(b.category) = t.cat
      ORDER BY b.category
    `);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/budgets/actuals — budgets with live computed spent/remaining
r.get('/actuals', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        b.*,
        COALESCE(t.actual_spent, 0) AS spent,
        b.monthly_limit - COALESCE(t.actual_spent, 0) AS remaining,
        CASE
          WHEN b.monthly_limit > 0
          THEN ROUND((COALESCE(t.actual_spent, 0) / b.monthly_limit) * 100, 1)
          ELSE 0
        END AS pct_used
      FROM budgets b
      LEFT JOIN (
        SELECT
          LOWER(category) AS cat,
          SUM(amount) AS actual_spent
        FROM transactions
        WHERE transaction_type = 'debit'
          AND date >= DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY LOWER(category)
      ) t ON LOWER(b.category) = t.cat
      ORDER BY b.category
    `);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/budgets — create a new budget with input validation
r.post('/', auth, async (req, res) => {
  try {
    const { category, monthly_limit } = req.body;

    if (!category || typeof category !== 'string' || category.trim().length === 0) {
      return res.status(400).json({ error: 'category is required' });
    }
    if (!monthly_limit || isNaN(Number(monthly_limit)) || Number(monthly_limit) <= 0) {
      return res.status(400).json({ error: 'monthly_limit must be a positive number' });
    }
    if (Number(monthly_limit) > 1_000_000) {
      return res.status(400).json({ error: 'monthly_limit cannot exceed $1,000,000' });
    }

    const result = await pool.query(
      `INSERT INTO budgets(category, monthly_limit, created_by)
       VALUES($1,$2,$3) RETURNING *`,
      [category.trim(), Number(monthly_limit), req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/budgets/:id — update budget
r.put('/:id', auth, async (req, res) => {
  try {
    const { category, monthly_limit } = req.body;

    if (!category || typeof category !== 'string' || category.trim().length === 0) {
      return res.status(400).json({ error: 'category is required' });
    }
    if (!monthly_limit || isNaN(Number(monthly_limit)) || Number(monthly_limit) <= 0) {
      return res.status(400).json({ error: 'monthly_limit must be a positive number' });
    }

    const result = await pool.query(
      `UPDATE budgets SET category=$1, monthly_limit=$2 WHERE id=$3 RETURNING *`,
      [category.trim(), Number(monthly_limit), req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Budget not found' });
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/budgets/:id
r.delete('/:id', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM budgets WHERE id=$1 RETURNING id`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Budget not found' });
    res.json({ message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = r;
