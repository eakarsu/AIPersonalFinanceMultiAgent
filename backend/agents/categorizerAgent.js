const pool = require('../models/db');
const axios = require('axios');

const CATEGORIES = [
  'Food & Dining', 'Shopping', 'Groceries', 'Transportation', 'Gas & Fuel',
  'Entertainment', 'Travel', 'Healthcare', 'Insurance', 'Utilities',
  'Subscriptions', 'Rent & Housing', 'Education', 'Personal Care',
  'Business Services', 'Investments', 'Income', 'Transfer', 'Other'
];

class CategorizerAgent {
  constructor() {
    this.name = 'categorizerAgent';
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
        max_tokens: 1000,
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
      // Try to extract JSON from markdown code blocks
      const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) return JSON.parse(match[1]);
      return { error: content };
    }
  }

  /**
   * Categorize a batch of uncategorized (or "Other") transactions using AI.
   * Updates the category column in the DB and persists results to finance_logs.
   */
  async execute(data = {}) {
    const start = Date.now();
    await this.log('execute', 'info', 'Categorizer agent started', 0);

    try {
      // Find transactions with no category or generic "Other" category
      const { rows: transactions } = await pool.query(
        `SELECT id, merchant, description, amount, transaction_type
         FROM transactions
         WHERE category IS NULL OR category = '' OR category = 'Other'
         LIMIT 50`
      );

      if (transactions.length === 0) {
        const duration = Date.now() - start;
        await this.log('complete', 'success', 'No uncategorized transactions found', duration);
        return { success: true, categorized: 0, duration };
      }

      const prompt = `Categorize each of these financial transactions into exactly one of these categories:
${CATEGORIES.join(', ')}

Transactions:
${transactions.map(t => `ID:${t.id} | Merchant:"${t.merchant}" | Description:"${t.description || ''}" | Amount:${t.amount} | Type:${t.transaction_type}`).join('\n')}

Respond ONLY with a JSON array like:
[{"id": 1, "category": "Food & Dining"}, ...]

Use the exact category names from the list. Never invent new categories.`;

      const result = await this.callAI(prompt);

      if (!Array.isArray(result)) {
        throw new Error(`AI returned unexpected format: ${JSON.stringify(result)}`);
      }

      let categorized = 0;
      for (const item of result) {
        if (item.id && item.category && CATEGORIES.includes(item.category)) {
          await pool.query(
            'UPDATE transactions SET category = $1 WHERE id = $2',
            [item.category, item.id]
          );
          categorized++;
        }
      }

      const duration = Date.now() - start;
      await this.log('complete', 'success', `Categorized ${categorized} transactions`, duration);
      return { success: true, categorized, duration };
    } catch (e) {
      const duration = Date.now() - start;
      await this.log('error', 'error', e.message, duration);
      return { success: false, error: e.message };
    }
  }
}

module.exports = new CategorizerAgent();
