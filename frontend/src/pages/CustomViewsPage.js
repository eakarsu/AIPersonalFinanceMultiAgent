import React from 'react';
import NetWorthTrendChart from '../components/NetWorthTrendChart';
import SpendingHeatmap from '../components/SpendingHeatmap';
import BudgetPDFExport from '../components/BudgetPDFExport';
import SavingsRulesEditor from '../components/SavingsRulesEditor';

export default function CustomViewsPage() {
  return (
    <div style={{ padding: 30, color: '#e0e0e0', background: '#1a1a2e', minHeight: '100vh' }}>
      <h1 style={{ color: '#e94560', marginTop: 0 }}>Money Views</h1>
      <p style={{ color: '#a0a0b0', marginBottom: 24 }}>
        Net-worth trend, spending heatmap, budget PDF export, and a savings/budget rules editor.
      </p>
      <NetWorthTrendChart />
      <SpendingHeatmap />
      <BudgetPDFExport />
      <SavingsRulesEditor />
    </div>
  );
}
