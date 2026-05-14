import React from'react';import{useNavigate,useLocation}from'react-router-dom';
const items=[{path:'/dashboard',label:'Dashboard',icon:'📊'},{path:'/accounts',label:'Accounts',icon:'🏦'},{path:'/transactions',label:'Transactions',icon:'💳'},{path:'/subscriptions',label:'Subscriptions',icon:'🔄'},{path:'/budgets',label:'Budgets',icon:'📈'},{path:'/agents',label:'AI Agents',icon:'🤖'},
  // === Batch 06 Gaps & Frontend Mounts ===
  { path: '/cf-autonomous-budget-agent', label: 'Autonomous budget agent', icon: '✨' },
  { path: '/cf-subscription-analyzer', label: 'Subscription analyzer', icon: '✨' },
  { path: '/cf-financial-goal-orchestration', label: 'Financial goal orchestration', icon: '✨' },
  { path: '/cf-expense-anomaly-detection', label: 'Expense anomaly detection', icon: '✨' },
  { path: '/cf-cashflow-forecasting', label: 'Cashflow forecasting', icon: '✨' },
  { path: '/gap-the-agents-js-route-is-unfulfilled', label: 'The `agents.js` route is unfulfilled', icon: '✨' },
  { path: '/gap-transactions-without-categorize', label: 'Transactions without `/categorize', icon: '✨' },
  { path: '/gap-budgets-without-budget', label: 'Budgets without `/budget', icon: '✨' },
  { path: '/gap-subscriptions-without-subscription', label: 'Subscriptions without `/subscription', icon: '✨' },
  { path: '/gap-accounts-without-net', label: 'Accounts without `/net', icon: '✨' },
  { path: '/gap-no-bank-credit-card-sync-plaid-mx', label: 'No bank/credit card sync (Plaid, MX)', icon: '✨' },
  { path: '/gap-no-investment-portfolio-tracking', label: 'No investment portfolio tracking', icon: '✨' },
  { path: '/gap-no-tax-planning-module', label: 'No tax planning module', icon: '✨' },
  { path: '/gap-limited-spending-analytics-no-aggregations-beyond-', label: 'Limited spending analytics (no aggregations beyond CRUD)', icon: '✨' },
  { path: '/gap-no-bill-pay-integration', label: 'No bill pay integration', icon: '✨' },
  { path: '/gap-no-notifications-layer-grep-0', label: 'No notifications layer (grep 0)', icon: '✨' },
  { path: '/gap-no-webhooks-for-transaction-events', label: 'No webhooks for transaction events', icon: '✨' },
  { path: '/gap-no-mobile-app', label: 'No mobile app', icon: '✨' },
  { path: '/gap-only-7-frontend-pages', label: 'Only 7 frontend pages', icon: '✨' }
];
export default function Sidebar(){const nav=useNavigate(),loc=useLocation();return(<div style={{width:250,background:'#16213e',height:'100vh',position:'fixed',left:0,top:0,display:'flex',flexDirection:'column',borderRight:'1px solid #0f3460'}}><div style={{padding:20,fontSize:18,fontWeight:'bold',color:'#e94560',borderBottom:'1px solid #0f3460',textAlign:'center'}}>💰 Finance Agent</div><div style={{flex:1,padding:'10px 0'}}>{items.map(i=><div key={i.path} onClick={()=>nav(i.path)} style={{padding:'12px 20px',cursor:'pointer',display:'flex',alignItems:'center',gap:10,background:loc.pathname===i.path?'#0f3460':'transparent',color:loc.pathname===i.path?'#e94560':'#a0a0b0',borderLeft:loc.pathname===i.path?'3px solid #e94560':'3px solid transparent',fontSize:14}}><span>{i.icon}</span>{i.label}</div>)}</div><div style={{padding:'15px 20px',borderTop:'1px solid #0f3460',cursor:'pointer',color:'#e94560',textAlign:'center',fontSize:14}} onClick={()=>{localStorage.removeItem('token');window.location.href='/'}}>🚪 Logout</div></div>)}
