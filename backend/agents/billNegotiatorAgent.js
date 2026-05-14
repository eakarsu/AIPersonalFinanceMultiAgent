const pool = require('../models/db');
const axios = require('axios');

class BillNegotiatorAgent {
  constructor() {
    this.name = 'billNegotiatorAgent';
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
        max_tokens: 2500,
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
      return { raw: content };
    }
  }

  /**
   * For each active subscription, generate a negotiation script the user can use
   * to call/chat with the service and request a discount or cancellation.
   * Persists scripts to finance_negotiation_scripts.
   */
  async execute(data = {}) {
    const start = Date.now();
    await this.log('execute', 'info', 'Bill negotiator started', 0);

    try {
      const { rows: subscriptions } = await pool.query(
        `SELECT id, service_name, amount, frequency, category
         FROM subscriptions
         WHERE status = 'active'
         ORDER BY amount DESC`
      );

      if (subscriptions.length === 0) {
        const duration = Date.now() - start;
        await this.log('complete', 'success', 'No active subscriptions to negotiate', duration);
        return { success: true, scripts: [], duration };
      }

      const prompt = `You are a personal finance negotiation expert. Generate negotiation scripts for reducing or cancelling these subscriptions.

Subscriptions:
${subscriptions.map(s => `- ${s.service_name}: $${s.amount}/${s.frequency} (${s.category})`).join('\n')}

For each subscription, provide:
{
  "service_name": "Comcast Internet",
  "current_cost": 89.99,
  "negotiable": true,
  "estimated_savings": "20-30%",
  "strategy": "retention_discount",
  "call_script": "Hi, I'd like to discuss my bill. I've been a customer for X years and I'm seeing better rates elsewhere. Can you check what promotions are available to help retain my business?",
  "key_phrases": [
    "I'm considering switching to [competitor]",
    "I've been a loyal customer for [X] years",
    "What's the best rate you can offer me today?"
  ],
  "best_time_to_call": "Tuesday-Thursday 10am-2pm",
  "expected_outcome": "15-25% discount or free premium tier upgrade"
}

Return a JSON array of scripts for ALL subscriptions. For non-negotiable ones (like utility bills), still explain why and suggest alternatives.
Only return valid JSON.`;

      const scripts = await this.callAI(prompt);
      const scriptArray = Array.isArray(scripts) ? scripts : [];

      // Persist scripts
      for (const script of scriptArray) {
        const matchingSub = subscriptions.find(
          s => s.service_name.toLowerCase() === (script.service_name || '').toLowerCase()
        );
        try {
          await pool.query(
            `INSERT INTO finance_negotiation_scripts
               (subscription_id, service_name, strategy, call_script, key_phrases,
                estimated_savings, negotiable, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
             ON CONFLICT (service_name) DO UPDATE
               SET call_script = EXCLUDED.call_script,
                   estimated_savings = EXCLUDED.estimated_savings,
                   created_at = NOW()`,
            [
              matchingSub ? matchingSub.id : null,
              script.service_name,
              script.strategy || 'general',
              script.call_script,
              JSON.stringify(script.key_phrases || []),
              script.estimated_savings || 'unknown',
              script.negotiable !== false,
            ]
          );
        } catch (insertErr) {
          console.warn('Could not persist negotiation script:', insertErr.message);
        }
      }

      const duration = Date.now() - start;
      await this.log('complete', 'success', `Generated ${scriptArray.length} negotiation scripts`, duration);
      return { success: true, scripts: scriptArray, duration };
    } catch (e) {
      const duration = Date.now() - start;
      await this.log('error', 'error', e.message, duration);
      return { success: false, error: e.message };
    }
  }
}

module.exports = new BillNegotiatorAgent();
