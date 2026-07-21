const express = require('express'), bcrypt = require('bcryptjs'), jwt = require('jsonwebtoken'), pool = require('../models/db'), router = express.Router();
const { jwtSecret } = require('../config/security');
const JWT_SECRET = jwtSecret();
router.post('/login', async (req, res) => {
  try { const { email, password } = req.body; const r = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!r.rows.length || !await bcrypt.compare(password, r.rows[0].password)) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: r.rows[0].id, email, name: r.rows[0].name, role: r.rows[0].role || 'account_owner' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: r.rows[0].id, email, name: r.rows[0].name, role: r.rows[0].role || 'account_owner' } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
router.post('/register', async (req, res) => {
  try { const { email, password, name } = req.body; const h = await bcrypt.hash(password, 10);
    const r = await pool.query("INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, 'account_owner') RETURNING id, email, name, role", [email, h, name]);
    const token = jwt.sign({ id: r.rows[0].id, email, name, role: r.rows[0].role }, JWT_SECRET, { expiresIn: '24h' });
    res.status(201).json({ token, user: r.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
module.exports = router;
