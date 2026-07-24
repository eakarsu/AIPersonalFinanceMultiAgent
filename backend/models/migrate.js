/**
 * Migration: add tables for AI result persistence and agent outputs.
 * Run with: node backend/models/migrate.js
 */
const pool = require('./db');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // AI analysis results — persists each AI endpoint call per user
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_analysis_results (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
        endpoint    VARCHAR(100) NOT NULL,
        result      JSONB NOT NULL,
        created_at  TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_results_user_endpoint
        ON ai_analysis_results(user_id, endpoint, created_at DESC)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_results (
        id          SERIAL PRIMARY KEY,
        user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
        agent       VARCHAR(100) NOT NULL,
        result      JSONB NOT NULL,
        created_at  TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_results_user_agent
        ON ai_results(user_id, agent, created_at DESC)
    `);

    // Finance forecasts — persisted by forecastAgent
    await client.query(`
      CREATE TABLE IF NOT EXISTS finance_forecasts (
        id            SERIAL PRIMARY KEY,
        period        VARCHAR(50) NOT NULL,
        forecast_data JSONB NOT NULL,
        generated_at  TIMESTAMP DEFAULT NOW()
      )
    `);

    // Finance recommendations — persisted by spendingOptimizerAgent
    await client.query(`
      CREATE TABLE IF NOT EXISTS finance_recommendations (
        id                SERIAL PRIMARY KEY,
        rec_id            VARCHAR(100) UNIQUE,
        category          VARCHAR(100),
        priority          VARCHAR(20),
        title             TEXT,
        current_monthly   NUMERIC,
        target_monthly    NUMERIC,
        estimated_savings NUMERIC,
        specific_actions  JSONB,
        difficulty        VARCHAR(20),
        agent             VARCHAR(100),
        created_at        TIMESTAMP DEFAULT NOW()
      )
    `);

    // Detected subscriptions — persisted by subscriptionDetectorAgent
    await client.query(`
      CREATE TABLE IF NOT EXISTS agent_detected_subscriptions (
        id           SERIAL PRIMARY KEY,
        service_name VARCHAR(255) UNIQUE NOT NULL,
        amount       NUMERIC,
        frequency    VARCHAR(50),
        category     VARCHAR(100),
        confidence   VARCHAR(20),
        reason       TEXT,
        status       VARCHAR(50) DEFAULT 'pending_review',
        detected_at  TIMESTAMP DEFAULT NOW()
      )
    `);

    // Negotiation scripts — persisted by billNegotiatorAgent
    await client.query(`
      CREATE TABLE IF NOT EXISTS finance_negotiation_scripts (
        id                SERIAL PRIMARY KEY,
        subscription_id   INTEGER REFERENCES subscriptions(id) ON DELETE SET NULL,
        service_name      VARCHAR(255) UNIQUE NOT NULL,
        strategy          VARCHAR(100),
        call_script       TEXT,
        key_phrases       JSONB,
        estimated_savings VARCHAR(100),
        negotiable        BOOLEAN DEFAULT TRUE,
        created_at        TIMESTAMP DEFAULT NOW()
      )
    `);

    await client.query('COMMIT');
    console.log('Migration complete — all new tables created.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', e.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
