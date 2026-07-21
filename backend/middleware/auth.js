const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '../.env' });
const { jwtSecret } = require('../config/security');
const JWT_SECRET = jwtSecret();
module.exports = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Access denied' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch (err) { res.status(401).json({ error: 'Invalid token' }); }
};
