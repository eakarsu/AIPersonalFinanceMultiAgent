import React,{useState,useEffect}from'react';import api from'../services/api';

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

  const renderResult=(obj,d=0)=>{
    if(!obj)return null;
    if(typeof obj==='string')return<p style={{color:'#e0e0e0',lineHeight:1.6,whiteSpace:'pre-wrap'}}>{obj}</p>;
    if(Array.isArray(obj))return<div style={{marginLeft:d*12}}>{obj.map((item,i)=><div key={i} style={{background:'#1a1a2e',padding:12,borderRadius:8,marginBottom:8,borderLeft:'3px solid #e94560'}}>{typeof item==='object'?renderResult(item,d+1):<span style={{color:'#e0e0e0'}}>{String(item)}</span>}</div>)}</div>;
    return<div style={{marginLeft:d*12}}>{Object.entries(obj).map(([k,v])=><div key={k} style={{marginBottom:12}}><div style={{color:'#e94560',fontSize:13,fontWeight:'bold',textTransform:'uppercase',marginBottom:4}}>{k.replace(/_/g,' ')}</div>{typeof v==='object'&&v!==null?renderResult(v,d+1):<div style={{color:'#e0e0e0',background:'#1a1a2e',padding:'8px 12px',borderRadius:6,fontSize:14}}>{typeof v==='number'?<span style={{color:'#2ecc71',fontWeight:'bold',fontSize:16}}>{v}</span>:String(v)}</div>}</div>)}</div>;
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
                    {results[agent.key].error?<div style={{color:'#e94560'}}>{results[agent.key].error}</div>:renderResult(results[agent.key])}
                  </div>
                )}
              </div>
            ))}

            {/* Run-all result */}
            {runAllResult&&(
              <div style={{...s.card,borderColor:'#2ecc71'}}>
                <div style={{color:'#2ecc71',fontWeight:'bold',marginBottom:12,fontSize:16}}>All Agents Completed</div>
                {runAllResult.error?<div style={{color:'#e94560'}}>{runAllResult.error}</div>:renderResult(runAllResult)}
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
            {legacyTab==='spending'&&<><label style={{color:'#a0a0b0',fontSize:12}}>Transaction Data (JSON or describe your spending)</label><textarea style={inp} value={input} onChange={e=>setInput(e.target.value)} placeholder='Describe your spending patterns or paste transaction data...'/><button style={{...s.btn,...s.runBtn}} onClick={()=>runLegacy(()=>api.analyzeSpending({transactions:input}))} disabled={legacyLoading}>{legacyLoading?'Analyzing...':'Analyze Spending'}</button></>}
            {legacyTab==='savings'&&<><label style={{color:'#a0a0b0',fontSize:12}}>Financial Data</label><textarea style={inp} value={input} onChange={e=>setInput(e.target.value)} placeholder='List your subscriptions, recurring bills, spending habits...'/><button style={{...s.btn,...s.runBtn}} onClick={()=>runLegacy(()=>api.detectSavings({data:input}))} disabled={legacyLoading}>{legacyLoading?'Finding...':'Find Savings'}</button></>}
            {legacyTab==='forecast'&&<><label style={{color:'#a0a0b0',fontSize:12}}>Spending History</label><textarea style={inp} value={input} onChange={e=>setInput(e.target.value)} placeholder='Describe your monthly spending history...'/><button style={{...s.btn,...s.runBtn}} onClick={()=>runLegacy(()=>api.forecast({history:input}))} disabled={legacyLoading}>{legacyLoading?'Forecasting...':'Forecast'}</button></>}
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
            {legacyResult&&<div style={{marginTop:20,background:'#1a1a2e',borderRadius:8,padding:16}}><div style={{color:'#e94560',fontWeight:'bold',marginBottom:12}}>AI Analysis</div>{legacyResult.error?<div style={{color:'#e94560'}}>{legacyResult.error}</div>:renderResult(legacyResult)}</div>}
          </>
        )}
      </div>
    </div>
  );
}
