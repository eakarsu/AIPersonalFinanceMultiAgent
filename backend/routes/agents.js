const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');
const pool = require('../models/db');

const r = express.Router();

// ── In-memory rate limiter (per user, 20/hour for AI routes) ─────────────────
const rateLimitStore = new Map();

function rateLimit(windowMs = 60_000, maxRequests = 5) {
  return (req, res, next) => {
    const key = `${req.user?.id || 'anon'}:${req.path}`;
    const now = Date.now();
    const entry = rateLimitStore.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > entry.resetAt) {
      entry.count = 0;
      entry.resetAt = now + windowMs;
    }

    entry.count++;
    rateLimitStore.set(key, entry);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count));

    if (entry.count > maxRequests) {
      return res.status(429).json({
        error: 'Too many requests. Please wait before calling this AI endpoint again.',
        retryAfterMs: entry.resetAt - now,
      });
    }
    next();
  };
}

// 20/hour per user for AI endpoints
const aiRateLimiter = rateLimit(3_600_000, 20);

// ── AI helper ────────────────────────────────────────────────────────────────
async function callAI(prompt) {
  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );
  const content = response.data.choices[0].message.content;
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) return JSON.parse(match[1]);
    return { analysis: content };
  }
}

// ── Persist AI result to ai_results table ───────────────────────────────────
async function persistAIResult(userId, agent, result) {
  try {
    await pool.query(
      `INSERT INTO ai_results (user_id, agent, result, created_at) VALUES ($1, $2, $3, NOW())`,
      [userId, agent, JSON.stringify(result)]
    );
  } catch (e) {
    console.warn('Could not persist AI result:', e.message);
  }
}

// ── Legacy: also persist to ai_analysis_results if it exists ─────────────────
async function persistResult(userId, endpoint, result) {
  try {
    await pool.query(
      `INSERT INTO ai_analysis_results (user_id, endpoint, result, created_at) VALUES ($1, $2, $3, NOW())`,
      [userId, endpoint, JSON.stringify(result)]
    );
  } catch (e) {
    console.warn('Could not persist AI result (legacy table):', e.message);
  }
}

// ── POST /api/agents/analyze-spending ────────────────────────────────────────
r.post('/analyze-spending', auth, aiRateLimiter, async (req, res) => {
  try {
    const { transactions } = req.body;
    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: 'transactions must be a non-empty array' });
    }
    if (transactions.length > 500) {
      return res.status(400).json({ error: 'Maximum 500 transactions per analysis' });
    }

    const result = await callAI(
      `Analyze these spending patterns and provide insights.

Transactions: ${JSON.stringify(transactions)}

Respond in JSON:
{
  "spending_summary": {
    "total": "string",
    "by_category": [{"category":"string","amount":number,"percentage":number,"trend":"string"}]
  },
  "insights": ["string"],
  "anomalies": [{"transaction":"string","reason":"string"}],
  "recommendations": ["string"]
}
Only return valid JSON.`
    );

    await persistResult(req.user.id, 'analyze-spending', result);
    await persistAIResult(req.user.id, 'analyze-spending', result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/agents/detect-savings ─────────────────────────────────────────
r.post('/detect-savings', auth, aiRateLimiter, async (req, res) => {
  try {
    const { data } = req.body;
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'data must be an object with financial details' });
    }

    const result = await callAI(
      `Find savings opportunities from these financial details.

Data: ${JSON.stringify(data)}

Respond in JSON:
{
  "total_potential_savings": "string",
  "opportunities": [{"area":"string","current_spending":"string","suggested":"string","monthly_savings":"string","action":"string"}],
  "subscription_audit": [{"service":"string","recommendation":"string","savings":"string"}],
  "quick_wins": ["string"]
}
Only return valid JSON.`
    );

    await persistResult(req.user.id, 'detect-savings', result);
    await persistAIResult(req.user.id, 'detect-savings', result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/agents/forecast ────────────────────────────────────────────────
r.post('/forecast', auth, aiRateLimiter, async (req, res) => {
  try {
    const { history } = req.body;
    if (!history || !Array.isArray(history) || history.length === 0) {
      return res.status(400).json({ error: 'history must be a non-empty array of transaction records' });
    }
    if (history.length > 1000) {
      return res.status(400).json({ error: 'Maximum 1000 history records per forecast' });
    }

    const result = await callAI(
      `Forecast future spending based on historical patterns.

History: ${JSON.stringify(history)}

Respond in JSON:
{
  "forecast_period": "string",
  "predicted_spending": {
    "total": "string",
    "by_category": [{"category":"string","predicted":"string","trend":"string"}]
  },
  "budget_alerts": [{"category":"string","message":"string","severity":"string"}],
  "savings_projection": "string",
  "financial_health_score": number
}
Only return valid JSON.`
    );

    await persistResult(req.user.id, 'forecast', result);
    await persistAIResult(req.user.id, 'forecast', result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Individual agent trigger endpoints ───────────────────────────────────────
const AGENT_MAP = {
  'categorizer': 'categorizerAgent',
  'subscription-detector': 'subscriptionDetectorAgent',
  'forecast': 'forecastAgent',
  'optimizer': 'spendingOptimizerAgent',
  'negotiator': 'billNegotiatorAgent',
};

r.post('/run/categorizer', auth, aiRateLimiter, async (req, res) => {
  try {
    const agent = require('../agents/categorizerAgent');
    const result = await agent.execute(req.body || {});
    await persistAIResult(req.user.id, 'categorizerAgent', result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.post('/run/subscription-detector', auth, aiRateLimiter, async (req, res) => {
  try {
    const agent = require('../agents/subscriptionDetectorAgent');
    const result = await agent.execute(req.body || {});
    await persistAIResult(req.user.id, 'subscriptionDetectorAgent', result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.post('/run/forecast', auth, aiRateLimiter, async (req, res) => {
  try {
    const agent = require('../agents/forecastAgent');
    const result = await agent.execute(req.body || {});
    await persistAIResult(req.user.id, 'forecastAgent', result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.post('/run/optimizer', auth, aiRateLimiter, async (req, res) => {
  try {
    const agent = require('../agents/spendingOptimizerAgent');
    const result = await agent.execute(req.body || {});
    await persistAIResult(req.user.id, 'spendingOptimizerAgent', result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

r.post('/run/negotiator', auth, aiRateLimiter, async (req, res) => {
  try {
    const agent = require('../agents/billNegotiatorAgent');
    const result = await agent.execute(req.body || {});
    await persistAIResult(req.user.id, 'billNegotiatorAgent', result);
    res.json(result);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/agents/multi-goal-optimize — multi-goal (savings/debt/retirement) ─
// Body: { goals: [{name, target_amount, deadline_months, priority?}], monthly_income, monthly_expenses, current_savings? }
r.post('/multi-goal-optimize', auth, aiRateLimiter, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured' });
    }
    const { goals, monthly_income, monthly_expenses, current_savings } = req.body || {};
    if (!goals || !Array.isArray(goals) || goals.length === 0) {
      return res.status(400).json({ error: 'goals must be a non-empty array' });
    }
    if (goals.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 goals per request' });
    }
    if (typeof monthly_income !== 'number' || typeof monthly_expenses !== 'number') {
      return res.status(400).json({ error: 'monthly_income and monthly_expenses (numbers) are required' });
    }

    const result = await callAI(
      `You are a personal-finance multi-goal optimizer. Allocate the user's monthly surplus across competing goals (emergency fund, debt payoff, retirement, big purchases) using priority and deadline.

Goals: ${JSON.stringify(goals)}
Monthly income: ${monthly_income}
Monthly expenses: ${monthly_expenses}
Current savings: ${current_savings ?? 0}

Respond in JSON:
{
  "available_surplus": "string",
  "allocation": [{"goal":"string","monthly_amount":number,"projected_completion_months":number,"on_track":boolean,"rationale":"string"}],
  "trade_offs": ["string"],
  "warnings": ["string"],
  "recommended_priority_order": ["string"]
}
Only return valid JSON.`
    );

    await persistResult(req.user.id, 'multi-goal-optimize', result);
    await persistAIResult(req.user.id, 'multi-goal-optimize', result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/agents/cashflow-forecast — forward-looking cashflow ────────────
// Body: { recurring_income: [{source, amount, frequency}], recurring_expenses: [{name, amount, frequency, next_due?}], one_offs?: [{name, amount, date}], horizon_weeks?: number, starting_balance? }
r.post('/cashflow-forecast', auth, aiRateLimiter, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured' });
    }
    const {
      recurring_income, recurring_expenses, one_offs,
      horizon_weeks, starting_balance,
    } = req.body || {};
    if (!recurring_income || !Array.isArray(recurring_income) || recurring_income.length === 0) {
      return res.status(400).json({ error: 'recurring_income must be a non-empty array' });
    }
    if (!recurring_expenses || !Array.isArray(recurring_expenses) || recurring_expenses.length === 0) {
      return res.status(400).json({ error: 'recurring_expenses must be a non-empty array' });
    }
    const horizon = Math.min(Math.max(parseInt(horizon_weeks) || 12, 1), 52);

    const result = await callAI(
      `Build a forward-looking weekly cashflow forecast for the next ${horizon} weeks. Combine recurring income, recurring expenses, and known one-offs. Surface the lowest projected balance and any negative-balance weeks.

Starting balance: ${starting_balance ?? 0}
Recurring income: ${JSON.stringify(recurring_income)}
Recurring expenses: ${JSON.stringify(recurring_expenses)}
One-off events: ${JSON.stringify(one_offs || [])}

Respond in JSON:
{
  "horizon_weeks": ${horizon},
  "weekly_projection": [{"week":number,"inflows":number,"outflows":number,"net":number,"running_balance":number,"notes":"string"}],
  "lowest_balance": {"week":number,"value":number},
  "negative_weeks": [{"week":number,"running_balance":number}],
  "key_risks": ["string"],
  "recommendations": ["string"]
}
Only return valid JSON.`
    );

    await persistResult(req.user.id, 'cashflow-forecast', result);
    await persistAIResult(req.user.id, 'cashflow-forecast', result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/agents/run-all — run all 5 agents ──────────────────────────────
r.post('/run-all', auth, aiRateLimiter, async (req, res) => {
  try {
    const [categorizerAgent, subscriptionDetectorAgent, forecastAgent, spendingOptimizerAgent, billNegotiatorAgent] = [
      require('../agents/categorizerAgent'),
      require('../agents/subscriptionDetectorAgent'),
      require('../agents/forecastAgent'),
      require('../agents/spendingOptimizerAgent'),
      require('../agents/billNegotiatorAgent'),
    ];

    const [categorizer, subscriptionDetector, forecast, optimizer, negotiator] = await Promise.all([
      categorizerAgent.execute({}),
      subscriptionDetectorAgent.execute({}),
      forecastAgent.execute({}),
      spendingOptimizerAgent.execute({}),
      billNegotiatorAgent.execute({}),
    ]);

    const combined = { categorizer, subscriptionDetector, forecast, optimizer, negotiator };
    await persistAIResult(req.user.id, 'run-all', combined);
    res.json(combined);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/agents/run/:agentName — generic trigger (backward compat) ──────
r.post('/run/:agentName', auth, aiRateLimiter, async (req, res) => {
  const { agentName } = req.params;
  const allowedAgents = [
    'categorizerAgent',
    'subscriptionDetectorAgent',
    'forecastAgent',
    'spendingOptimizerAgent',
    'billNegotiatorAgent',
  ];

  if (!allowedAgents.includes(agentName)) {
    return res.status(400).json({
      error: `Unknown agent. Allowed: ${allowedAgents.join(', ')}`,
    });
  }

  try {
    const agent = require(`../agents/${agentName}`);
    const result = await agent.execute(req.body || {});
    await persistAIResult(req.user.id, agentName, result);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/agents/results — fetch persisted AI analysis history ─────────────
r.get('/results', auth, async (req, res) => {
  try {
    const { agent, limit = 20 } = req.query;
    const maxLimit = Math.min(parseInt(limit) || 20, 100);

    let query = `SELECT id, agent, result, created_at FROM ai_results WHERE user_id = $1`;
    const params = [req.user.id];

    if (agent) {
      params.push(agent);
      query += ` AND agent = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(maxLimit);

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/agents/logs — view agent run logs ───────────────────────────────
r.get('/logs', auth, async (req, res) => {
  try {
    const { agent, limit = 50 } = req.query;
    const maxLimit = Math.min(parseInt(limit) || 50, 200);

    let query = `SELECT * FROM finance_logs`;
    const params = [];

    if (agent) {
      params.push(agent);
      query += ` WHERE agent = $1`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(maxLimit);

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = r;
