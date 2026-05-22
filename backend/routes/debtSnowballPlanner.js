const express = require('express');

const router = express.Router();

router.get('/', (_req, res) => {
  res.json({
    feature: 'Debt Snowball Planner',
    summary: { payoffMonths: 19, interestSaved: 1280, minimumPayment: 740, recommendedExtra: 260 },
    debts: [
      { name: 'Credit Card A', balance: 3400, apr: 24.9, order: 1 },
      { name: 'Store Card', balance: 890, apr: 28.4, order: 2 },
      { name: 'Auto Loan', balance: 12400, apr: 7.1, order: 3 },
    ],
    actions: [
      'Route subscription savings into the smallest balance first.',
      'Keep emergency buffer above one month of fixed expenses.',
      'Recalculate order after every balance update or APR change.',
    ],
  });
});

module.exports = router;
