const A='http://localhost:3506/api';
const h=()=>{const t=localStorage.getItem('token');return{'Content-Type':'application/json',...(t?{Authorization:`Bearer ${t}`}:{})}};
const api={
  login:async(e,p)=>{const r=await fetch(`${A}/auth/login`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:e,password:p})});const d=await r.json();if(d.token)localStorage.setItem('token',d.token);return d},
  getStats:()=>fetch(`${A}/stats`,{headers:h()}).then(r=>r.json()),
  getAccounts:(p)=>fetch(`${A}/accounts?${new URLSearchParams(p||{})}`,{headers:h()}).then(r=>r.json()),
  createAccount:d=>fetch(`${A}/accounts`,{method:'POST',headers:h(),body:JSON.stringify(d)}).then(r=>r.json()),
  updateAccount:(id,d)=>fetch(`${A}/accounts/${id}`,{method:'PUT',headers:h(),body:JSON.stringify(d)}).then(r=>r.json()),
  deleteAccount:id=>fetch(`${A}/accounts/${id}`,{method:'DELETE',headers:h()}).then(r=>r.json()),
  getTransactions:(p)=>fetch(`${A}/transactions?${new URLSearchParams(p||{})}`,{headers:h()}).then(r=>r.json()),
  createTransaction:d=>fetch(`${A}/transactions`,{method:'POST',headers:h(),body:JSON.stringify(d)}).then(r=>r.json()),
  deleteTransaction:id=>fetch(`${A}/transactions/${id}`,{method:'DELETE',headers:h()}).then(r=>r.json()),
  importTransactionsCSV:formData=>{const t=localStorage.getItem('token');return fetch(`${A}/transactions/import-csv`,{method:'POST',headers:{...(t?{Authorization:`Bearer ${t}`}:{})},body:formData}).then(r=>r.json())},
  getSubscriptions:()=>fetch(`${A}/subscriptions`,{headers:h()}).then(r=>r.json()),
  cancelSubscription:id=>fetch(`${A}/subscriptions/${id}/cancel`,{method:'PUT',headers:h()}).then(r=>r.json()),
  getBudgets:()=>fetch(`${A}/budgets`,{headers:h()}).then(r=>r.json()),
  getBudgetActuals:()=>fetch(`${A}/budgets/actuals`,{headers:h()}).then(r=>r.json()),
  createBudget:d=>fetch(`${A}/budgets`,{method:'POST',headers:h(),body:JSON.stringify(d)}).then(r=>r.json()),
  analyzeSpending:d=>fetch(`${A}/agents/analyze-spending`,{method:'POST',headers:h(),body:JSON.stringify(d)}).then(r=>r.json()),
  detectSavings:d=>fetch(`${A}/agents/detect-savings`,{method:'POST',headers:h(),body:JSON.stringify(d)}).then(r=>r.json()),
  forecast:d=>fetch(`${A}/agents/forecast`,{method:'POST',headers:h(),body:JSON.stringify(d)}).then(r=>r.json()),
  runAgent:name=>fetch(`${A}/agents/run/${name}`,{method:'POST',headers:h(),body:JSON.stringify({})}).then(r=>r.json()),
  runAllAgents:()=>fetch(`${A}/agents/run-all`,{method:'POST',headers:h(),body:JSON.stringify({})}).then(r=>r.json()),
  getAgentLogs:(params)=>fetch(`${A}/agents/logs?${new URLSearchParams(params||{})}`,{headers:h()}).then(r=>r.json()),
  getAgentResults:(params)=>fetch(`${A}/agents/results?${new URLSearchParams(params||{})}`,{headers:h()}).then(r=>r.json()),
  multiGoalOptimize:async d=>{const r=await fetch(`${A}/agents/multi-goal-optimize`,{method:'POST',headers:h(),body:JSON.stringify(d)});const data=await r.json().catch(()=>({error:'Request failed'}));if(!r.ok){throw new Error((r.status===503?'AI service unavailable: ':'')+(data.error||'Request failed'))}return data},
  cashflowForecast:async d=>{const r=await fetch(`${A}/agents/cashflow-forecast`,{method:'POST',headers:h(),body:JSON.stringify(d)});const data=await r.json().catch(()=>({error:'Request failed'}));if(!r.ok){throw new Error((r.status===503?'AI service unavailable: ':'')+(data.error||'Request failed'))}return data},
};
export default api;
