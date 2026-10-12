import React,{useState,useEffect}from'react';import api from'../services/api';import AIReport from '../components/AIReport';

const manualExamples = [
  { label: 'Steady household', transactions: [
    {date:'2026-09-03',merchant:'Rent',category:'Housing',amount:1800},
    {date:'2026-09-05',merchant:'Groceries',category:'Food',amount:132},
    {date:'2026-09-12',merchant:'Electric utility',category:'Utilities',amount:96}],
    savings: {monthly_income:6200,monthly_expenses:4100,subscriptions:[{service:'Streaming',monthly_cost:19},{service:'Gym',monthly_cost:45}],goal:'Build a six-month emergency fund'},
    goals:[{name:'Emergency fund',target_amount:12000,deadline_months:18,priority:1},{name:'Vacation',target_amount:3000,deadline_months:12,priority:2}],income:6200,expenses:4100,currentSavings:2400,
    recurringIncome:[{source:'Salary',amount:3100,frequency:'biweekly'}],recurringExpenses:[{name:'Rent',amount:1800,frequency:'monthly'},{name:'Groceries',amount:150,frequency:'weekly'}],oneOffs:[{name:'Car maintenance',amount:450,date:'2026-11-15'}],balance:2400,horizon:12 },
  { label: 'Debt payoff', transactions: [
    {date:'2026-09-02',merchant:'Mortgage',category:'Housing',amount:2100},
    {date:'2026-09-10',merchant:'Credit card payment',category:'Debt',amount:520},
    {date:'2026-09-18',merchant:'Groceries',category:'Food',amount:205}],
    savings: {monthly_income:7500,monthly_expenses:5800,subscriptions:[{service:'Music',monthly_cost:12},{service:'Cloud storage',monthly_cost:10}],goal:'Reduce credit-card debt without missing essential bills'},
    goals:[{name:'Credit card payoff',target_amount:7200,deadline_months:14,priority:1},{name:'Emergency fund',target_amount:9000,deadline_months:24,priority:2}],income:7500,expenses:5800,currentSavings:1000,
    recurringIncome:[{source:'Salary',amount:3750,frequency:'biweekly'}],recurringExpenses:[{name:'Mortgage',amount:2100,frequency:'monthly'},{name:'Debt payment',amount:520,frequency:'monthly'}],oneOffs:[{name:'Insurance renewal',amount:780,date:'2026-12-01'}],balance:1000,horizon:16 },
  { label: 'Variable income', transactions: [
    {date:'2026-09-01',merchant:'Studio rent',category:'Housing',amount:1450},
    {date:'2026-09-09',merchant:'Software tools',category:'Business',amount:110},
    {date:'2026-09-21',merchant:'Groceries',category:'Food',amount:168}],
    savings: {monthly_income:4900,monthly_expenses:3600,subscriptions:[{service:'Design software',monthly_cost:39},{service:'Video service',monthly_cost:17}],goal:'Build a buffer for uneven freelance income'},
    goals:[{name:'Income buffer',target_amount:10000,deadline_months:20,priority:1},{name:'Tax reserve',target_amount:4800,deadline_months:12,priority:2}],income:4900,expenses:3600,currentSavings:1800,
    recurringIncome:[{source:'Client retainers',amount:2500,frequency:'monthly'},{source:'Project work',amount:600,frequency:'biweekly'}],recurringExpenses:[{name:'Studio rent',amount:1450,frequency:'monthly'},{name:'Software',amount:110,frequency:'monthly'}],oneOffs:[{name:'Equipment replacement',amount:900,date:'2026-11-20'}],balance:1800,horizon:20 },
];

const AGENTS=[
  {key:'categorizer',name:'Transaction Categorizer',desc:'Auto-categorize uncategorized transactions using AI'},
  {key:'subscription-detector',name:'Subscription Detector',desc:'Find recurring charges and subscriptions from transactions'},
  {key:'forecast',name:'Spending Forecast',desc:'Forecast next month spending based on 3-month history'},
  {key:'optimizer',name:'Spending Optimizer',desc:'Identify top spending reduction opportunities'},
  {key:'negotiator',name:'Bill Negotiator',desc:'Generate negotiation scripts for active subscriptions'},
];

const s={
  card:{background:'#16213e',borderRadius:12,padding:20,border:'1px solid #0f3460',marginBottom:12},
  btn:{padding:'10px 18px',border:'none',borderRadius:8,cursor:'pointer',fontWeight:'bold',fontSize:13},
  runBtn:{background:'#e94560',color:'#fff'},
  runAllBtn:{background:'#2ecc71',color:'#fff',padding:'12px 28px',fontSize:15},
  tab:{padding:'10px 20px',background:'#16213e',color:'#a0a0b0',border:'none',borderRadius:'8px 8px 0 0',cursor:'pointer',fontSize:14},
  activeTab:{background:'#e94560',color:'#fff'},
  logRow:{padding:'10px 14px',borderBottom:'1px solid #0f346030',fontSize:13,display:'flex',gap:16,alignItems:'center'},
};

export default function AgentsPage(){
  const[tab,setTab]=useState('agents');
  const[results,setResults]=useState({});
  const[loading,setLoading]=useState({});
  const[runAllResult,setRunAllResult]=useState(null);
  const[runAllLoading,setRunAllLoading]=useState(false);
  const[logs,setLogs]=useState([]);
  const[logsLoading,setLogsLoading]=useState(false);
  // Legacy AI analysis tabs
  const[legacyTab,setLegacyTab]=useState('spending');
  const[input,setInput]=useState('');
  const[legacyResult,setLegacyResult]=useState(null);
  const[legacyLoading,setLegacyLoading]=useState(false);
  // Multi-goal optimizer state
  const[mgGoalsText,setMgGoalsText]=useState(JSON.stringify([
    {name:'Emergency Fund',target_amount:10000,deadline_months:12,priority:1},
    {name:'Credit Card Debt',target_amount:5000,deadline_months:8,priority:2},
    {name:'Vacation',target_amount:3000,deadline_months:10,priority:3},
  ],null,2));
  const[mgIncome,setMgIncome]=useState(6000);
  const[mgExpenses,setMgExpenses]=useState(3800);
  const[mgSavings,setMgSavings]=useState(2000);
  // Cashflow forecast state
  const[cfIncomeText,setCfIncomeText]=useState(JSON.stringify([{source:'Salary',amount:3000,frequency:'biweekly'}],null,2));
  const[cfExpensesText,setCfExpensesText]=useState(JSON.stringify([
    {name:'Rent',amount:1800,frequency:'monthly',next_due:'2026-06-01'},
    {name:'Groceries',amount:150,frequency:'weekly'},
    {name:'Subscriptions',amount:60,frequency:'monthly'},
  ],null,2));
  const[cfOneOffsText,setCfOneOffsText]=useState(JSON.stringify([{name:'Car Repair',amount:600,date:'2026-06-15'}],null,2));
  const[cfStartingBalance,setCfStartingBalance]=useState(2000);
  const[cfHorizon,setCfHorizon]=useState(12);

  useEffect(()=>{if(tab==='history')loadLogs()},[tab]);

  const loadLogs=async()=>{setLogsLoading(true);try{const data=await api.getAgentLogs({limit:50});setLogs(Array.isArray(data)?data:[])}catch(e){console.error(e)}setLogsLoading(false)};

  const runAgent=async(key)=>{
    setLoading(l=>({...l,[key]:true}));
    setResults(r=>({...r,[key]:null}));
    try{const data=await api.runAgent(key);setResults(r=>({...r,[key]:data}));}
    catch(e){setResults(r=>({...r,[key]:{error:e.message}}));}
    setLoading(l=>({...l,[key]:false}));
  };

  const runAll=async()=>{
    setRunAllLoading(true);setRunAllResult(null);
    try{const data=await api.runAllAgents();setRunAllResult(data);}
    catch(e){setRunAllResult({error:e.message});}
    setRunAllLoading(false);
    if(tab==='history')loadLogs();
  };

  const runLegacy=async fn=>{setLegacyLoading(true);setLegacyResult(null);try{setLegacyResult(await fn())}catch(e){setLegacyResult({error:e.message})}setLegacyLoading(false)};

  const fillManualExample=(example)=>{
    if (legacyTab==='spending' || legacyTab==='forecast') setInput(JSON.stringify(example.transactions,null,2));
    if (legacyTab==='savings') setInput(JSON.stringify(example.savings,null,2));
    if (legacyTab==='multigoal') {
      setMgGoalsText(JSON.stringify(example.goals,null,2));setMgIncome(example.income);setMgExpenses(example.expenses);setMgSavings(example.currentSavings);
    }
    if (legacyTab==='cashflow') {
      setCfIncomeText(JSON.stringify(example.recurringIncome,null,2));setCfExpensesText(JSON.stringify(example.recurringExpenses,null,2));setCfOneOffsText(JSON.stringify(example.oneOffs,null,2));setCfStartingBalance(example.balance);setCfHorizon(example.horizon);
    }
    setLegacyResult(null);
  };
  const parseManualInput=(label)=>{
    try{return JSON.parse(input)}catch(err){setLegacyResult({error:`Invalid ${label} JSON: ${err.message}`});return null}
  };

  const statusColor=s=>s==='success'?'#2ecc71':s==='error'?'#e94560':'#f39c12';

  const inp={width:'100%',padding:'10px 14px',background:'#1a1a2e',border:'1px solid #0f3460',borderRadius:8,color:'#e0e0e0',fontSize:14,marginBottom:12,outline:'none',minHeight:100,resize:'vertical',fontFamily:'inherit'};

  return(
    <div style={{padding:30}}>
      <h1 style={{fontSize:24,color:'#e0e0e0',marginBottom:8}}>AI Agents</h1>
      <p style={{color:'#a0a0b0',marginBottom:24,fontSize:14}}>Autonomous AI agents that analyze your financial data</p>

      {/* Tabs */}
      <div style={{display:'flex',gap:4,marginBottom:0}}>
        {[['agents','Agents'],['history','Run History'],['analyze','Manual Analysis']].map(([k,l])=>(
          <button key={k} style={{...s.tab,...(tab===k?s.activeTab:{})}} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>

      <div style={{background:'#16213e',borderRadius:'0 12px 12px 12px',padding:24,border:'1px solid #0f3460'}}>

        {tab==='agents'&&(
          <>
            {/* Run All */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
              <div style={{color:'#a0a0b0',fontSize:14}}>Run individual agents or all at once to analyze your finances</div>
              <button style={{...s.btn,...s.runAllBtn}} onClick={runAll} disabled={runAllLoading}>
                {runAllLoading?'Running All Agents...':'Run All Agents'}
              </button>
            </div>

            {/* Individual agents */}
            {AGENTS.map(agent=>(
              <div key={agent.key} style={s.card}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
                  <div>
                    <div style={{color:'#e0e0e0',fontWeight:'bold',fontSize:15,marginBottom:4}}>{agent.name}</div>
                    <div style={{color:'#a0a0b0',fontSize:13}}>{agent.desc}</div>
                  </div>
                  <button style={{...s.btn,...s.runBtn,minWidth:90}} onClick={()=>runAgent(agent.key)} disabled={loading[agent.key]}>
                    {loading[agent.key]?'Running...':'Run'}
                  </button>
                </div>
                {results[agent.key]&&(
                  <div style={{marginTop:16,background:'#1a1a2e',borderRadius:8,padding:16}}>
                    <div style={{color:'#2ecc71',fontSize:12,marginBottom:8,fontWeight:'bold'}}>RESULT</div>
                    {results[agent.key].error?<div style={{color:'#e94560'}}>{results[agent.key].error}</div>:<AIReport response={results[agent.key]} title={agent.name} />}
                  </div>
                )}
              </div>
            ))}

            {/* Run-all result */}
            {runAllResult&&(
              <div style={{...s.card,borderColor:'#2ecc71'}}>
                <div style={{color:'#2ecc71',fontWeight:'bold',marginBottom:12,fontSize:16}}>All Agents Completed</div>
                {runAllResult.error?<div style={{color:'#e94560'}}>{runAllResult.error}</div>:<AIReport response={runAllResult} title="All agents" />}
              </div>
            )}
          </>
        )}

        {tab==='history'&&(
          <>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <div style={{color:'#e0e0e0',fontWeight:'bold'}}>Agent Run History</div>
              <button style={{...s.btn,background:'#0f3460',color:'#e0e0e0'}} onClick={loadLogs}>Refresh</button>
            </div>
            {logsLoading?<div style={{color:'#a0a0b0'}}>Loading logs...</div>:
            logs.length===0?<div style={{color:'#a0a0b0'}}>No agent run history yet. Run some agents first.</div>:
            <div style={{background:'#1a1a2e',borderRadius:8,overflow:'hidden'}}>
              <div style={{display:'flex',gap:16,padding:'10px 14px',background:'#0f3460',color:'#a0a0b0',fontSize:12,fontWeight:'bold'}}>
                <span style={{width:160}}>AGENT</span><span style={{width:100}}>ACTION</span><span style={{width:80}}>STATUS</span><span style={{flex:1}}>MESSAGE</span><span style={{width:140}}>TIME</span>
              </div>
              {logs.map(log=>(
                <div key={log.id} style={s.logRow}>
                  <span style={{width:160,color:'#e0e0e0'}}>{log.agent}</span>
                  <span style={{width:100,color:'#a0a0b0'}}>{log.action}</span>
                  <span style={{width:80,color:statusColor(log.status),fontWeight:'bold'}}>{log.status}</span>
                  <span style={{flex:1,color:'#a0a0b0',fontSize:12}}>{log.message}</span>
                  <span style={{width:140,color:'#606070',fontSize:12}}>{new Date(log.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>}
          </>
        )}

        {tab==='analyze'&&(
          <>
            <div style={{display:'flex',gap:4,marginBottom:20}}>
              {[['spending','Spending Analyzer'],['savings','Savings Finder'],['forecast','Spending Forecast'],['multigoal','Multi-Goal Optimizer'],['cashflow','Cashflow Forecast']].map(([k,l])=>(
                <button key={k} style={{padding:'8px 16px',background:legacyTab===k?'#e94560':'#1a1a2e',color:legacyTab===k?'#fff':'#a0a0b0',border:'1px solid #0f3460',borderRadius:6,cursor:'pointer',fontSize:13}} onClick={()=>{setLegacyTab(k);setLegacyResult(null)}}>{l}</button>
              ))}
            </div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}} aria-label="Fill all manual analysis fields">
              {manualExamples.map((example)=><button key={example.label} type="button" style={{...s.btn,background:'#0f3460',color:'#e0e0e0'}} disabled={legacyLoading} onClick={()=>fillManualExample(example)}>Fill {example.label}</button>)}
            </div>
            {legacyTab==='spending'&&<><label style={{color:'#a0a0b0',fontSize:12}}>Transaction Data (JSON or describe your spending)</label><textarea style={inp} value={input} onChange={e=>setInput(e.target.value)} placeholder='Describe your spending patterns or paste transaction data...'/><button style={{...s.btn,...s.runBtn}} onClick={()=>{const transactions=parseManualInput('transactions');if(transactions!==null)runLegacy(()=>api.analyzeSpending({transactions}));}} disabled={legacyLoading}>{legacyLoading?'Analyzing...':'Analyze Spending'}</button></>}
            {legacyTab==='savings'&&<><label style={{color:'#a0a0b0',fontSize:12}}>Financial Data</label><textarea style={inp} value={input} onChange={e=>setInput(e.target.value)} placeholder='List your subscriptions, recurring bills, spending habits...'/><button style={{...s.btn,...s.runBtn}} onClick={()=>{const data=parseManualInput('financial data');if(data!==null)runLegacy(()=>api.detectSavings({data}));}} disabled={legacyLoading}>{legacyLoading?'Finding...':'Find Savings'}</button></>}
            {legacyTab==='forecast'&&<><label style={{color:'#a0a0b0',fontSize:12}}>Spending History</label><textarea style={inp} value={input} onChange={e=>setInput(e.target.value)} placeholder='Describe your monthly spending history...'/><button style={{...s.btn,...s.runBtn}} onClick={()=>{const history=parseManualInput('history');if(history!==null)runLegacy(()=>api.forecast({history}));}} disabled={legacyLoading}>{legacyLoading?'Forecasting...':'Forecast'}</button></>}
            {legacyTab==='multigoal'&&<>
              <label style={{color:'#a0a0b0',fontSize:12}}>Goals JSON (array of {'{name, target_amount, deadline_months, priority}'})</label>
              <textarea style={{...inp,fontFamily:'monospace',minHeight:160}} value={mgGoalsText} onChange={e=>setMgGoalsText(e.target.value)}/>
              <div style={{display:'flex',gap:12,marginBottom:12}}>
                <div style={{flex:1}}><label style={{color:'#a0a0b0',fontSize:12}}>Monthly Income</label><input type="number" style={{...inp,minHeight:0}} value={mgIncome} onChange={e=>setMgIncome(Number(e.target.value))}/></div>
                <div style={{flex:1}}><label style={{color:'#a0a0b0',fontSize:12}}>Monthly Expenses</label><input type="number" style={{...inp,minHeight:0}} value={mgExpenses} onChange={e=>setMgExpenses(Number(e.target.value))}/></div>
                <div style={{flex:1}}><label style={{color:'#a0a0b0',fontSize:12}}>Current Savings</label><input type="number" style={{...inp,minHeight:0}} value={mgSavings} onChange={e=>setMgSavings(Number(e.target.value))}/></div>
              </div>
              <button style={{...s.btn,...s.runBtn}} onClick={()=>{
                let goals;try{goals=JSON.parse(mgGoalsText)}catch(err){setLegacyResult({error:'Invalid goals JSON: '+err.message});return}
                runLegacy(()=>api.multiGoalOptimize({goals,monthly_income:mgIncome,monthly_expenses:mgExpenses,current_savings:mgSavings}));
              }} disabled={legacyLoading}>{legacyLoading?'Optimizing...':'Optimize Goals'}</button>
            </>}
            {legacyTab==='cashflow'&&<>
              <label style={{color:'#a0a0b0',fontSize:12}}>Recurring Income JSON</label>
              <textarea style={{...inp,fontFamily:'monospace',minHeight:80}} value={cfIncomeText} onChange={e=>setCfIncomeText(e.target.value)}/>
              <label style={{color:'#a0a0b0',fontSize:12}}>Recurring Expenses JSON</label>
              <textarea style={{...inp,fontFamily:'monospace',minHeight:120}} value={cfExpensesText} onChange={e=>setCfExpensesText(e.target.value)}/>
              <label style={{color:'#a0a0b0',fontSize:12}}>One-off Events JSON</label>
              <textarea style={{...inp,fontFamily:'monospace',minHeight:80}} value={cfOneOffsText} onChange={e=>setCfOneOffsText(e.target.value)}/>
              <div style={{display:'flex',gap:12,marginBottom:12}}>
                <div style={{flex:1}}><label style={{color:'#a0a0b0',fontSize:12}}>Starting Balance</label><input type="number" style={{...inp,minHeight:0}} value={cfStartingBalance} onChange={e=>setCfStartingBalance(Number(e.target.value))}/></div>
                <div style={{flex:1}}><label style={{color:'#a0a0b0',fontSize:12}}>Horizon (weeks, 1-52)</label><input type="number" style={{...inp,minHeight:0}} value={cfHorizon} onChange={e=>setCfHorizon(Number(e.target.value))}/></div>
              </div>
              <button style={{...s.btn,...s.runBtn}} onClick={()=>{
                let inc,exp,one;
                try{inc=JSON.parse(cfIncomeText)}catch(err){setLegacyResult({error:'Invalid income JSON: '+err.message});return}
                try{exp=JSON.parse(cfExpensesText)}catch(err){setLegacyResult({error:'Invalid expenses JSON: '+err.message});return}
                try{one=cfOneOffsText.trim()?JSON.parse(cfOneOffsText):[]}catch(err){setLegacyResult({error:'Invalid one-offs JSON: '+err.message});return}
                runLegacy(()=>api.cashflowForecast({recurring_income:inc,recurring_expenses:exp,one_offs:one,horizon_weeks:cfHorizon,starting_balance:cfStartingBalance}));
              }} disabled={legacyLoading}>{legacyLoading?'Forecasting...':'Run Cashflow Forecast'}</button>
            </>}
            {legacyResult&&<div style={{marginTop:20,background:'#1a1a2e',borderRadius:8,padding:16}}><div style={{color:'#e94560',fontWeight:'bold',marginBottom:12}}>AI Analysis</div>{legacyResult.error?<div style={{color:'#e94560'}}>{legacyResult.error}</div>:<AIReport response={legacyResult} title="AI analysis" />}</div>}
          </>
        )}
      </div>
    </div>
  );
}
