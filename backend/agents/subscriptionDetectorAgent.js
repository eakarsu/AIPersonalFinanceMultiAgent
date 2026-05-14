const pool = require('../models/db');
const axios = require('axios');

class SubscriptionDetectorAgent {
  constructor() {
    this.name = 'subscriptionDetectorAgent';
  }

  async log(action, status, message, ms) {
    try {
      await pool.query(
        'INSERT INTO finance_logs(agent,action,status,message,duration_ms) VALUES($1,$2,$3,$4,$5)',
        [this.name, action, status, message, ms]
      );
    } catch (e) {
      console.error('Log error:', e.message);
    }
  }

  async callAI(prompt) {
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
      return { error: content };
    }
  }

  /**
   * Scan transaction history to detect recurring charges that look like subscriptions.
   * Persists detected patterns to the agent_detected_subscriptions table and finance_logs.
   */
  async execute(data = {}) {
    const start = Date.now();
    await this.log('execute', 'info', 'Subscription detector agent started', 0);

    try {
      // Get last 6 months of debit transactions
      const { rows: transactions } = await pool.query(
        `SELECT merchant, amount, date, description
         FROM transactions
         WHERE transaction_type = 'debit'
           AND date >= NOW() - INTERVAL '6 months'
         ORDER BY merchant, date`
      );

      if (transactions.length === 0) {
        const duration = Date.now() - start;
        await this.log('complete', 'success', 'No transactions to analyze', duration);
        return { success: true, detected: [], duration };
      }

      // Get existing subscription service names to avoid duplicates
      const { rows: existingSubs } = await pool.query(
        `SELECT LOWER(service_name) as name FROM subscriptions WHERE status = 'active'`
      );
      const existingNames = new Set(existingSubs.map(s => s.name));

      const prompt = `Analyze these bank transactions to identify recurring subscription charges.
Look for transactions that repeat on a consistent cycle (monthly, annual, weekly) with the same or similar amounts.

Transactions (merchant | amount | date | description):
${transactions.map(t => `${t.merchant} | $${t.amount} | ${t.date.toISOString().split('T')[0]} | ${t.description || ''}`).join('\n')}

Existing known subscriptions (skip these): ${Array.from(existingNames).join(', ') || 'none'}

Identify NEW recurring patterns not in the existing list. For each detected subscription return:
{
  "service_name": "Netflix",
  "amount": 15.99,
  "frequency": "monthly",
  "category": "Entertainment",
  "confidence": "high|medium|low",
  "reason": "Charged $15.99 on the 12th of each month for 4 months"
}

Respond ONLY with a JSON array. If no new subscriptions detected, return [].`;

      const result = await this.callAI(prompt);
      const detected = Array.isArray(result) ? result : [];

      // Persist high/medium-confidence detections to the agent_detected_subscriptions table
      let persisted = 0;
      for (const sub of detected) {
        if (!sub.service_name || !sub.amount) continue;
        const nameLower = sub.service_name.toLowerCase();
        if (existingNames.has(nameLower)) continue;
        if (sub.confidence === 'low') continue;

        try {
          await pool.query(
            `INSERT INTO agent_detected_subscriptions
               (service_name, amount, frequency, category, confidence, reason, status, detected_at)
             VALUES ($1, $2, $3, $4, $5, $6, 'pending_review', NOW())
             ON CONFLICT (service_name) DO UPDATE
               SET amount = EXCLUDED.amount,
                   confidence = EXCLUDED.confidence,
                   reason = EXCLUDED.reason,
                   detected_at = NOW()`,
            [sub.service_name, sub.amount, sub.frequency || 'monthly', sub.category || 'Other', sub.confidence, sub.reason]
          );
          persisted++;
        } catch (insertErr) {
          // Table may not exist yet — non-fatal
          console.warn('Could not persist detected subscription:', insertErr.message);
        }
      }

      const duration = Date.now() - start;
      await this.log(
        'complete', 'success',
        `Detected ${detected.length} patterns, persisted ${persisted} new subscriptions`,
        duration
      );
      return { success: true, detected, persisted, duration };
    } catch (e) {
      const duration = Date.now() - start;
      await this.log('error', 'error', e.message, duration);
      return { success: false, error: e.message };
    }
  }
}

module.exports = new SubscriptionDetectorAgent();
