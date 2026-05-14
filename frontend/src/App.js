import React,{useState}from'react';import{BrowserRouter,Routes,Route,Navigate}from'react-router-dom';import Sidebar from'./components/Sidebar';import LoginPage from'./pages/LoginPage';import DashboardPage from'./pages/DashboardPage';import AccountsPage from'./pages/AccountsPage';import TransactionsPage from'./pages/TransactionsPage';import SubscriptionsPage from'./pages/SubscriptionsPage';import BudgetsPage from'./pages/BudgetsPage';import AgentsPage from'./pages/AgentsPage';
// // === Batch 06 Gaps & Frontend Mounts ===
import CFAutonomousBudgetAgentPage from './pages/CFAutonomousBudgetAgentPage';
import CFSubscriptionAnalyzerPage from './pages/CFSubscriptionAnalyzerPage';
import CFFinancialGoalOrchestrationPage from './pages/CFFinancialGoalOrchestrationPage';
import CFExpenseAnomalyDetectionPage from './pages/CFExpenseAnomalyDetectionPage';
import CFCashflowForecastingPage from './pages/CFCashflowForecastingPage';
import GapTheAgentsJsRouteIsUnfulfilledPage from './pages/GapTheAgentsJsRouteIsUnfulfilledPage';
import GapTransactionsWithoutCategorizePage from './pages/GapTransactionsWithoutCategorizePage';
import GapBudgetsWithoutBudgetPage from './pages/GapBudgetsWithoutBudgetPage';
import GapSubscriptionsWithoutSubscriptionPage from './pages/GapSubscriptionsWithoutSubscriptionPage';
import GapAccountsWithoutNetPage from './pages/GapAccountsWithoutNetPage';
import GapNoBankCreditCardSyncPlaidMxPage from './pages/GapNoBankCreditCardSyncPlaidMxPage';
import GapNoInvestmentPortfolioTrackingPage from './pages/GapNoInvestmentPortfolioTrackingPage';
import GapNoTaxPlanningModulePage from './pages/GapNoTaxPlanningModulePage';
import GapLimitedSpendingAnalyticsNoAggregationsBeyondPage from './pages/GapLimitedSpendingAnalyticsNoAggregationsBeyondPage';
import GapNoBillPayIntegrationPage from './pages/GapNoBillPayIntegrationPage';
import GapNoNotificationsLayerGrep0Page from './pages/GapNoNotificationsLayerGrep0Page';
import GapNoWebhooksForTransactionEventsPage from './pages/GapNoWebhooksForTransactionEventsPage';
import GapNoMobileAppPage from './pages/GapNoMobileAppPage';
import GapOnly7FrontendPagesPage from './pages/GapOnly7FrontendPagesPage';
export default function App(){const[a,setA]=useState(!!localStorage.getItem('token'));if(!a)return<LoginPage onLogin={()=>setA(true)}/>;return(<BrowserRouter><div style={{display:'flex'}}><Sidebar/><div style={{marginLeft:250,flex:1,minHeight:'100vh'}}><Routes><Route path="/dashboard" element={<DashboardPage/>}/><Route path="/accounts" element={<AccountsPage/>}/><Route path="/transactions" element={<TransactionsPage/>}/><Route path="/subscriptions" element={<SubscriptionsPage/>}/><Route path="/budgets" element={<BudgetsPage/>}/><Route path="/agents" element={<AgentsPage/>}/><Route path="*" element={<Navigate to="/dashboard"/>}/>
          {/* // === Batch 06 Gaps & Frontend Mounts === */}
          <Route path="/cf-autonomous-budget-agent" element={<CFAutonomousBudgetAgentPage />} />
          <Route path="/cf-subscription-analyzer" element={<CFSubscriptionAnalyzerPage />} />
          <Route path="/cf-financial-goal-orchestration" element={<CFFinancialGoalOrchestrationPage />} />
          <Route path="/cf-expense-anomaly-detection" element={<CFExpenseAnomalyDetectionPage />} />
          <Route path="/cf-cashflow-forecasting" element={<CFCashflowForecastingPage />} />
          <Route path="/gap-the-agents-js-route-is-unfulfilled" element={<GapTheAgentsJsRouteIsUnfulfilledPage />} />
          <Route path="/gap-transactions-without-categorize" element={<GapTransactionsWithoutCategorizePage />} />
          <Route path="/gap-budgets-without-budget" element={<GapBudgetsWithoutBudgetPage />} />
          <Route path="/gap-subscriptions-without-subscription" element={<GapSubscriptionsWithoutSubscriptionPage />} />
          <Route path="/gap-accounts-without-net" element={<GapAccountsWithoutNetPage />} />
          <Route path="/gap-no-bank-credit-card-sync-plaid-mx" element={<GapNoBankCreditCardSyncPlaidMxPage />} />
          <Route path="/gap-no-investment-portfolio-tracking" element={<GapNoInvestmentPortfolioTrackingPage />} />
          <Route path="/gap-no-tax-planning-module" element={<GapNoTaxPlanningModulePage />} />
          <Route path="/gap-limited-spending-analytics-no-aggregations-beyond-" element={<GapLimitedSpendingAnalyticsNoAggregationsBeyondPage />} />
          <Route path="/gap-no-bill-pay-integration" element={<GapNoBillPayIntegrationPage />} />
          <Route path="/gap-no-notifications-layer-grep-0" element={<GapNoNotificationsLayerGrep0Page />} />
          <Route path="/gap-no-webhooks-for-transaction-events" element={<GapNoWebhooksForTransactionEventsPage />} />
          <Route path="/gap-no-mobile-app" element={<GapNoMobileAppPage />} />
          <Route path="/gap-only-7-frontend-pages" element={<GapOnly7FrontendPagesPage />} />
        </Routes></div></div></BrowserRouter>)}
