import React,{useState,useEffect}from'react';import api from'../services/api';import Modal from'../components/Modal';

export default function BudgetsPage(){
  const[items,setItems]=useState([]);
  const[actuals,setActuals]=useState([]);
  const[modal,setModal]=useState(false);
  const[tab,setTab]=useState('actuals');
  const[form,setForm]=useState({category:'',monthly_limit:''});

  useEffect(()=>{loadAll()},[]);

  const loadAll=()=>{
    api.getBudgets().then(setItems).catch(()=>{});
    api.getBudgetActuals().then(setActuals).catch(()=>{});
  };

  const submit=async e=>{e.preventDefault();await api.createBudget(form);setModal(false);loadAll()};

  const pct=b=>b.monthly_limit>0?Math.min(100,Math.round((+b.spent||0)/+b.monthly_limit*100)):0;
  const color=p=>p>90?'#e94560':p>75?'#f39c12':'#2ecc71';

  const inp={width:'100%',padding:'10px 14px',background:'#1a1a2e',border:'1px solid #0f3460',borderRadius:8,color:'#e0e0e0',fontSize:14,marginBottom:12,outline:'none'};

  const displayItems=tab==='actuals'?actuals:items;

  return(
    <div style={{padding:30}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
        <h1 style={{fontSize:24,color:'#e0e0e0'}}>Budgets</h1>
        <button style={{padding:'10px 20px',background:'#e94560',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontWeight:'bold'}} onClick={()=>setModal(true)}>+ Add Budget</button>
      </div>

      <div style={{display:'flex',gap:4,marginBottom:0}}>
        {[['actuals','Budget vs Actuals'],['all','All Budgets']].map(([k,l])=>(
          <button key={k} style={{padding:'10px 20px',background:tab===k?'#e94560':'#16213e',color:tab===k?'#fff':'#a0a0b0',border:'none',borderRadius:'8px 8px 0 0',cursor:'pointer',fontSize:14}} onClick={()=>setTab(k)}>{l}</button>
        ))}
      </div>

      <div style={{background:'#16213e',borderRadius:'0 12px 12px 12px',padding:24,border:'1px solid #0f3460',marginBottom:24}}>
        {tab==='actuals'&&(
          <>
            <div style={{color:'#a0a0b0',fontSize:13,marginBottom:16}}>Live spending vs budget limits for current month</div>
            {actuals.length===0?<div style={{color:'#a0a0b0'}}>No budgets set. Add a budget to track spending.</div>:null}
          </>
        )}

        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:16}}>
          {displayItems.map(b=>{
            const p=pct(b);const c=color(p);const spent=+b.spent||0;const limit=+b.monthly_limit||0;const remaining=+b.remaining||(limit-spent);
            return(
              <div key={b.id} style={{background:'#1a1a2e',borderRadius:12,padding:20,border:'1px solid #0f3460'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
                  <div style={{fontSize:16,fontWeight:'bold',color:'#e0e0e0'}}>{b.category}</div>
                  <span style={{color:c,fontWeight:'bold',fontSize:18}}>{p}%</span>
                </div>
                <div style={{background:'#16213e',borderRadius:8,height:14,overflow:'hidden',marginBottom:12}}>
                  <div style={{background:c,height:'100%',width:`${p}%`,borderRadius:8,transition:'width 0.3s'}}/>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:13}}>
                  <div>
                    <div style={{color:'#a0a0b0',fontSize:11}}>SPENT</div>
                    <div style={{color:c,fontWeight:'bold',fontSize:16}}>${spent.toFixed(0)}</div>
                  </div>
                  <div style={{textAlign:'center'}}>
                    <div style={{color:'#a0a0b0',fontSize:11}}>LIMIT</div>
                    <div style={{color:'#e0e0e0',fontWeight:'bold',fontSize:16}}>${limit.toFixed(0)}</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{color:'#a0a0b0',fontSize:11}}>REMAINING</div>
                    <div style={{color:remaining<0?'#e94560':'#2ecc71',fontWeight:'bold',fontSize:16}}>${Math.abs(remaining).toFixed(0)}{remaining<0?' over':''}</div>
                  </div>
                </div>
                {p>90&&<div style={{marginTop:10,padding:'6px 10px',background:'#e9456020',borderRadius:6,color:'#e94560',fontSize:12}}>Budget nearly exhausted!</div>}
              </div>
            );
          })}
        </div>
      </div>

      <Modal isOpen={modal} onClose={()=>setModal(false)} title="Add Budget">
        <form onSubmit={submit}>
          <label style={{color:'#a0a0b0',fontSize:12}}>Category</label>
          <input style={inp} value={form.category} onChange={e=>setForm({...form,category:e.target.value})} required placeholder="e.g. Food & Dining"/>
          <label style={{color:'#a0a0b0',fontSize:12}}>Monthly Limit ($)</label>
          <input style={inp} type="number" value={form.monthly_limit} onChange={e=>setForm({...form,monthly_limit:e.target.value})} required placeholder="500"/>
          <button style={{width:'100%',padding:12,background:'#e94560',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontWeight:'bold'}} type="submit">Add Budget</button>
        </form>
      </Modal>
    </div>
  );
}
