const pool = require('../models/db');
const axios = require('axios');

class SpendingOptimizerAgent {
  constructor() {
    this.name = 'spendingOptimizerAgent';
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
      return { raw: content };
    }
  }

  /**
   * Analyze spending patterns across categories and generate optimization recommendations.
   * Persists recommendations to the finance_recommendations table.
   */
  async execute(data = {}) {
    const start = Date.now();
    await this.log('execute', 'info', 'Spending optimizer started', 0);

    try {
      // Top merchants by spend in last 30 days
      const { rows: topMerchants } = await pool.query(
        `SELECT merchant, category, COUNT(*) as txn_count, SUM(amount) as total
         FROM transactions
         WHERE transaction_type = 'debit'
           AND date >= NOW() - INTERVAL '30 days'
         GROUP BY merchant, category
         ORDER BY total DESC
         LIMIT 20`
      );

      // Category breakdown vs budget
      const { rows: categoryVsBudget } = await pool.query(
        `SELECT
           t.category,
           SUM(t.amount) as actual_spend,
           b.monthly_limit as budget_limit
         FROM transactions t
         LEFT JOIN budgets b ON LOWER(t.category) = LOWER(b.category)
         WHERE t.transaction_type = 'debit'
           AND t.date >= DATE_TRUNC('month', CURRENT_DATE)
         GROUP BY t.category, b.monthly_limit
         ORDER BY actual_spend DESC`
      );

      const prompt = `Analyze this user's spending data and generate concrete, actionable optimization recommendations.

Top merchants last 30 days:
${JSON.stringify(topMerchants, null, 2)}

Category spend vs budget this month:
${JSON.stringify(categoryVsBudget, null, 2)}

Return a JSON object:
{
  "total_potential_monthly_savings": 245.00,
  "recommendations": [
    {
      "id": "rec_001",
      "category": "Food & Dining",
      "priority": "high",
      "title": "Reduce restaurant spending",
      "current_monthly": 650.00,
      "target_monthly": 450.00,
      "estimated_savings": 200.00,
      "specific_actions": [
        "You spent $48 at Starbucks 12x this month — brew coffee at home to save ~$35/month",
        "DoorDash orders average $32 each — cooking 2 more meals per week saves ~$90/month"
      ],
      "difficulty": "easy|medium|hard"
    }
  ],
  "quick_wins": [
    {"action": "Cancel unused gym membership", "savings": 45.00, "effort": "5 min call"}
  ],
  "spending_health": {
    "score": 65,
    "grade": "C+",
    "summary": "Overspending in dining and entertainment; strong savings in housing"
  }
}

Only return valid JSON, no markdown.`;

      const result = await this.callAI(prompt);

      // Persist recommendations
      if (result.recommendations && Array.isArray(result.recommendations)) {
        for (const rec of result.recommendations) {
          try {
            await pool.query(
              `INSERT INTO finance_recommendations
                 (rec_id, category, priority, title, current_monthly, target_monthly,
                  estimated_savings, specific_actions, difficulty, agent, created_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
               ON CONFLICT (rec_id) DO UPDATE
                 SET estimated_savings = EXCLUDED.estimated_savings,
                     specific_actions = EXCLUDED.specific_actions,
                     created_at = NOW()`,
              [
                rec.id || `rec_${Date.now()}`,
                rec.category,
                rec.priority,
                rec.title,
                rec.current_monthly,
                rec.target_monthly,
                rec.estimated_savings,
                JSON.stringify(rec.specific_actions || []),
                rec.difficulty,
                this.name,
              ]
            );
          } catch (insertErr) {
            console.warn('Could not persist recommendation:', insertErr.message);
          }
        }
      }

      const duration = Date.now() - start;
      const savings = result.total_potential_monthly_savings || 0;
      await this.log('complete', 'success', `Found $${savings}/mo savings potential`, duration);
      return { success: true, result, duration };
    } catch (e) {
      const duration = Date.now() - start;
      await this.log('error', 'error', e.message, duration);
      return { success: false, error: e.message };
    }
  }
}

module.exports = new SpendingOptimizerAgent();
