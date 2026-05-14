import React,{useState,useEffect,useRef}from'react';import api from'../services/api';import DetailPanel from'../components/DetailPanel';

export default function TransactionsPage(){
  const[data,setData]=useState({data:[],total:0,page:1,limit:20,totalPages:1});
  const[sel,setSel]=useState(null);
  const[cat,setCat]=useState('');
  const[page,setPage]=useState(1);
  const[csvMsg,setCsvMsg]=useState(null);
  const[csvLoading,setCsvLoading]=useState(false);
  const fileRef=useRef(null);

  useEffect(()=>{load(page,cat)},[page,cat]);

  const load=(p,c)=>api.getTransactions({category:c||undefined,page:p,limit:20}).then(res=>{
    if(Array.isArray(res)){setData({data:res,total:res.length,page:1,limit:20,totalPages:1})}
    else setData(res);
  }).catch(()=>{});

  const cats=['','Groceries','Dining','Entertainment','Utilities','Gas','Shopping','Travel','Healthcare','Food & Dining','Transportation','Healthcare','Income','Other'];
  const catColor=c=>({
    'Groceries':'#2ecc71','Food & Dining':'#e67e22','Dining':'#e67e22',
    'Entertainment':'#9b59b6','Utilities':'#3498db','Shopping':'#e94560',
    'Travel':'#1abc9c','Transportation':'#f39c12','Healthcare':'#16a085',
    'Income':'#2ecc71','Subscriptions':'#8e44ad',
  }[c]||'#a0a0b0');

  const handleCSV=async e=>{
    const file=e.target.files[0];if(!file)return;
    setCsvLoading(true);setCsvMsg(null);
    const fd=new FormData();fd.append('file',file);
    try{const res=await api.importTransactionsCSV(fd);setCsvMsg(res.error?{error:res.error}:{success:`Imported ${res.inserted} transactions`});}
    catch(err){setCsvMsg({error:err.message});}
    setCsvLoading(false);
    if(fileRef.current)fileRef.current.value='';
    load(1,cat);
  };

  const items=data.data||[];

  return(
    <div style={{padding:30}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
        <h1 style={{fontSize:24,color:'#e0e0e0'}}>Transactions ({data.total||items.length})</h1>
        <div style={{display:'flex',gap:10,alignItems:'center'}}>
          <select style={{padding:'8px 12px',background:'#16213e',border:'1px solid #0f3460',borderRadius:8,color:'#e0e0e0',fontSize:13}} value={cat} onChange={e=>{setCat(e.target.value);setPage(1);}}>
            {[...new Set(cats)].map(c=><option key={c} value={c}>{c||'All Categories'}</option>)}
          </select>
          <button style={{padding:'8px 16px',background:'#0f3460',color:'#e0e0e0',border:'none',borderRadius:8,cursor:'pointer',fontSize:13}} onClick={()=>fileRef.current?.click()} disabled={csvLoading}>
            {csvLoading?'Importing...':'Import CSV'}
          </button>
          <input ref={fileRef} type="file" accept=".csv" style={{display:'none'}} onChange={handleCSV}/>
        </div>
      </div>

      {csvMsg&&<div style={{marginBottom:16,padding:'10px 16px',borderRadius:8,background:csvMsg.error?'#e9456020':'#2ecc7120',color:csvMsg.error?'#e94560':'#2ecc71',fontSize:13}}>{csvMsg.error||csvMsg.success}</div>}

      <table style={{width:'100%',borderCollapse:'collapse',background:'#16213e',borderRadius:12,overflow:'hidden'}}>
        <thead><tr>{['Date','Merchant','Category','Amount','Account'].map(h=><th key={h} style={{padding:'12px 16px',textAlign:'left',background:'#0f3460',color:'#a0a0b0',fontSize:12,textTransform:'uppercase'}}>{h}</th>)}</tr></thead>
        <tbody>
          {items.length===0&&<tr><td colSpan={5} style={{padding:24,textAlign:'center',color:'#a0a0b0'}}>No transactions found</td></tr>}
          {items.map(t=>(
            <tr key={t.id} style={{cursor:'pointer'}} onClick={()=>setSel(t)} onMouseEnter={e=>e.currentTarget.style.background='#0f346020'} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              <td style={{padding:'12px 16px',borderBottom:'1px solid #0f346030',fontSize:13}}>{new Date(t.date).toLocaleDateString()}</td>
              <td style={{padding:'12px 16px',borderBottom:'1px solid #0f346030',fontSize:14}}><strong style={{color:'#e0e0e0'}}>{t.merchant}</strong></td>
              <td style={{padding:'12px 16px',borderBottom:'1px solid #0f346030'}}><span style={{padding:'3px 8px',borderRadius:10,fontSize:11,background:catColor(t.category)+'20',color:catColor(t.category)}}>{t.category}</span></td>
              <td style={{padding:'12px 16px',borderBottom:'1px solid #0f346030',fontSize:14,color:'#e94560',fontWeight:'bold'}}>-${Number(t.amount).toFixed(2)}</td>
              <td style={{padding:'12px 16px',borderBottom:'1px solid #0f346030',fontSize:13,color:'#a0a0b0'}}>{t.account_name||'-'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      {data.totalPages>1&&(
        <div style={{display:'flex',justifyContent:'center',alignItems:'center',gap:8,marginTop:20}}>
          <button style={{padding:'6px 14px',background:'#16213e',border:'1px solid #0f3460',borderRadius:6,color:'#e0e0e0',cursor:'pointer'}} onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1}>Prev</button>
          {Array.from({length:Math.min(5,data.totalPages)},(_,i)=>{
            const p=Math.max(1,Math.min(data.totalPages-4,page-2))+i;
            return<button key={p} style={{padding:'6px 12px',background:p===page?'#e94560':'#16213e',border:'1px solid #0f3460',borderRadius:6,color:'#e0e0e0',cursor:'pointer'}} onClick={()=>setPage(p)}>{p}</button>;
          })}
          <button style={{padding:'6px 14px',background:'#16213e',border:'1px solid #0f3460',borderRadius:6,color:'#e0e0e0',cursor:'pointer'}} onClick={()=>setPage(p=>Math.min(data.totalPages,p+1))} disabled={page>=data.totalPages}>Next</button>
          <span style={{color:'#a0a0b0',fontSize:13}}>Page {page} of {data.totalPages} ({data.total} total)</span>
        </div>
      )}

      <DetailPanel isOpen={!!sel} onClose={()=>setSel(null)} title="Transaction Details">
        {sel&&(
          <>
            {[['Merchant',sel.merchant],['Category',sel.category],['Amount',`$${Number(sel.amount).toFixed(2)}`],['Date',new Date(sel.date).toLocaleDateString()],['Account',sel.account_name],['Description',sel.description]].map(([l,v])=>(
              <div key={l} style={{marginBottom:16}}>
                <div style={{color:'#a0a0b0',fontSize:12}}>{l}</div>
                <div style={{color:'#e0e0e0',fontSize:14}}>{v||'-'}</div>
              </div>
            ))}
            <button style={{width:'100%',padding:10,background:'#e94560',color:'#fff',border:'none',borderRadius:8,cursor:'pointer',fontWeight:'bold'}} onClick={async()=>{await api.deleteTransaction(sel.id);setSel(null);load(page,cat);}}>Delete Transaction</button>
          </>
        )}
      </DetailPanel>
    </div>
  );
}
