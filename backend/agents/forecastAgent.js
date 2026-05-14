const pool = require('../models/db');
const axios = require('axios');

class ForecastAgent {
  constructor() {
    this.name = 'forecastAgent';
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
   * Generate a 30-day spending forecast based on historical transaction data.
   * Persists the forecast JSON to the finance_forecasts table.
   */
  async execute(data = {}) {
    const start = Date.now();
    await this.log('execute', 'info', 'Forecast agent started', 0);

    try {
      // Gather 3 months of category spend aggregated by month
      const { rows: monthlySpend } = await pool.query(
        `SELECT
           TO_CHAR(date, 'YYYY-MM') AS month,
           category,
           SUM(amount) AS total
         FROM transactions
         WHERE transaction_type = 'debit'
           AND date >= NOW() - INTERVAL '3 months'
         GROUP BY month, category
         ORDER BY month, category`
      );

      // Gather active subscriptions for fixed recurring costs
      const { rows: subscriptions } = await pool.query(
        `SELECT service_name, amount, frequency FROM subscriptions WHERE status = 'active'`
      );

      // Gather budgets for targets
      const { rows: budgets } = await pool.query(
        `SELECT category, monthly_limit FROM budgets`
      );

      const prompt = `You are a personal finance forecasting engine. Based on the data below, generate a 30-day spending forecast.

Monthly spending history by category:
${JSON.stringify(monthlySpend, null, 2)}

Active subscriptions (fixed recurring):
${JSON.stringify(subscriptions, null, 2)}

Budget limits by category:
${JSON.stringify(budgets, null, 2)}

Return a JSON object with this exact structure:
{
  "forecast_period": "next 30 days",
  "predicted_total_spend": 1234.56,
  "by_category": [
    {
      "category": "Food & Dining",
      "predicted_amount": 450.00,
      "budget_limit": 500.00,
      "budget_status": "on_track",
      "trend": "stable",
      "reasoning": "Based on 3-month average of $430/month"
    }
  ],
  "fixed_costs": 234.56,
  "variable_costs": 999.00,
  "financial_health_score": 72,
  "alerts": [
    {"category": "Shopping", "severity": "warning", "message": "On track to exceed budget by 15%"}
  ],
  "top_recommendations": [
    "Reduce dining spend by cooking at home 2x more per week to save ~$80"
  ]
}

Only return valid JSON, no markdown or explanation.`;

      const forecast = await this.callAI(prompt);

      // Persist the forecast
      try {
        await pool.query(
          `INSERT INTO finance_forecasts (period, forecast_data, generated_at)
           VALUES ('next_30_days', $1, NOW())`,
          [JSON.stringify(forecast)]
        );
      } catch (insertErr) {
        // Table may not exist yet - non-fatal, will be created by migration
        console.warn('Could not persist forecast:', insertErr.message);
      }

      const duration = Date.now() - start;
      await this.log('complete', 'success', `Forecast generated (health score: ${forecast.financial_health_score || 'N/A'})`, duration);
      return { success: true, forecast, duration };
    } catch (e) {
      const duration = Date.now() - start;
      await this.log('error', 'error', e.message, duration);
      return { success: false, error: e.message };
    }
  }
}

module.exports = new ForecastAgent();
