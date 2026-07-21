const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });
const { databaseUrl } = require('../config/security');
const pool = new Pool({ connectionString: databaseUrl() });
module.exports = pool;
