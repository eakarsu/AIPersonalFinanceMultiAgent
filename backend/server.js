const express=require('express'),cors=require('cors'),helmet=require('helmet');require('dotenv').config({path:'../.env'});
const app=express();
app.use(helmet());
app.use(cors({origin:process.env.CLIENT_URL||'http://localhost:3000',credentials:true}));
app.use(express.json({limit:'10mb'}));
const pool=require('./models/db');
app.use('/api/auth',require('./routes/auth'));
app.use('/api/accounts',require('./routes/accounts'));
app.use('/api/transactions',require('./routes/transactions'));
app.use('/api/subscriptions',require('./routes/subscriptions'));
app.use('/api/budgets',require('./routes/budgets'));
app.use('/api/agents',require('./routes/agents'));
app.use('/api/ext',require('./routes/extensions')); // Apply pass 5: Plaid/billpay/investments/tax/anomalies

// GET /api/stats
app.get('/api/stats',async(q,s)=>{try{const bal=await pool.query('SELECT COALESCE(SUM(balance),0) as total FROM accounts');const spent=await pool.query("SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE date >= date_trunc('month',CURRENT_DATE)");const subs=await pool.query("SELECT COUNT(*) as total FROM subscriptions WHERE status='active'");const savings=await pool.query("SELECT COALESCE(SUM(monthly_limit-spent),0) as total FROM budgets WHERE spent<monthly_limit");s.json({totalBalance:+bal.rows[0].total,monthlySpending:+spent.rows[0].total,subscriptions:+subs.rows[0].total,savingsPotential:+savings.rows[0].total})}catch(e){s.status(500).json({error:e.message})}});

// Ensure ai_results table exists
pool.query(`CREATE TABLE IF NOT EXISTS ai_results (id SERIAL PRIMARY KEY, user_id INTEGER, agent VARCHAR(100), result JSONB, created_at TIMESTAMP DEFAULT NOW())`).catch(()=>{});


// === Custom Feature Mounts (batch_06) ===
app.use('/api/cf-autonomous-budget-agent', require('./routes/customFeat01_AutonomousBudgetAgent'));
app.use('/api/cf-subscription-analyzer', require('./routes/customFeat02_SubscriptionAnalyzer'));
app.use('/api/cf-financial-goal-orchestration', require('./routes/customFeat03_FinancialGoalOrchestration'));
app.use('/api/cf-expense-anomaly-detection', require('./routes/customFeat04_ExpenseAnomalyDetection'));
app.use('/api/cf-cashflow-forecasting', require('./routes/customFeat05_CashflowForecasting'));


// === Batch 06 Gaps & Frontend Mounts ===
app.use('/api/gap-the-agents-js-route-is-unfulfilled', require('./routes/gapFeat_the_agents_js_route_is_unfulfilled'));
app.use('/api/gap-transactions-without-categorize', require('./routes/gapFeat_transactions_without_categorize'));
app.use('/api/gap-budgets-without-budget', require('./routes/gapFeat_budgets_without_budget'));
app.use('/api/gap-subscriptions-without-subscription', require('./routes/gapFeat_subscriptions_without_subscription'));
app.use('/api/gap-accounts-without-net', require('./routes/gapFeat_accounts_without_net'));
app.use('/api/gap-no-bank-credit-card-sync-plaid-mx', require('./routes/gapFeat_no_bank_credit_card_sync_plaid_mx'));
app.use('/api/gap-no-investment-portfolio-tracking', require('./routes/gapFeat_no_investment_portfolio_tracking'));
app.use('/api/gap-no-tax-planning-module', require('./routes/gapFeat_no_tax_planning_module'));
app.use('/api/gap-limited-spending-analytics-no-aggregations-beyond-', require('./routes/gapFeat_limited_spending_analytics_no_aggregations_beyond_'));
app.use('/api/gap-no-bill-pay-integration', require('./routes/gapFeat_no_bill_pay_integration'));
app.use('/api/gap-no-notifications-layer-grep-0', require('./routes/gapFeat_no_notifications_layer_grep_0'));
app.use('/api/gap-no-webhooks-for-transaction-events', require('./routes/gapFeat_no_webhooks_for_transaction_events'));
app.use('/api/gap-no-mobile-app', require('./routes/gapFeat_no_mobile_app'));
app.use('/api/gap-only-7-frontend-pages', require('./routes/gapFeat_only_7_frontend_pages'));

app.listen(process.env.PORT||3006,()=>console.log(`Server on port ${process.env.PORT||3006}`));
