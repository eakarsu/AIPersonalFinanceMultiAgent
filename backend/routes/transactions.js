const express=require('express'),pool=require('../models/db'),auth=require('../middleware/auth'),multer=require('multer'),path=require('path'),fs=require('fs'),r=express.Router();

// multer for CSV upload
const upload=multer({dest:'uploads/'});

r.get('/',auth,async(q,s)=>{
  try{
    let query='SELECT t.*,a.name as account_name FROM transactions t LEFT JOIN accounts a ON t.account_id=a.id';
    const p=[];const c=[];
    if(q.query.category){p.push(q.query.category);c.push(`t.category=$${p.length}`)}
    if(q.query.search){p.push(`%${q.query.search}%`);c.push(`t.merchant ILIKE $${p.length}`)}
    if(c.length)query+=' WHERE '+c.join(' AND ');
    query+=' ORDER BY t.date DESC';
    // Pagination
    const page=Math.max(1,parseInt(q.query.page)||1);
    const limit=Math.min(200,Math.max(1,parseInt(q.query.limit)||20));
    const offset=(page-1)*limit;
    const countQuery='SELECT COUNT(*) FROM ('+query+') sub';
    const total=(await pool.query(countQuery,p)).rows[0].count;
    query+=` LIMIT $${p.length+1} OFFSET $${p.length+2}`;
    p.push(limit,offset);
    const rows=(await pool.query(query,p)).rows;
    s.json({data:rows,total:+total,page,limit,totalPages:Math.ceil(total/limit)});
  }catch(e){s.status(500).json({error:e.message})}
});

r.post('/',auth,async(q,s)=>{
  try{
    const{account_id,merchant,category,amount,transaction_type,date,description}=q.body;
    const res=await pool.query('INSERT INTO transactions(account_id,merchant,category,amount,transaction_type,date,description) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[account_id,merchant,category,amount,transaction_type||'debit',date,description]);
    s.status(201).json(res.rows[0]);
  }catch(e){s.status(500).json({error:e.message})}
});

r.put('/:id',auth,async(q,s)=>{
  try{
    const{merchant,category,amount,description}=q.body;
    const res=await pool.query('UPDATE transactions SET merchant=$1,category=$2,amount=$3,description=$4 WHERE id=$5 RETURNING *',[merchant,category,amount,description,q.params.id]);
    s.json(res.rows[0]);
  }catch(e){s.status(500).json({error:e.message})}
});

r.delete('/:id',auth,async(q,s)=>{
  try{await pool.query('DELETE FROM transactions WHERE id=$1',[q.params.id]);s.json({message:'Deleted'})}
  catch(e){s.status(500).json({error:e.message})}
});

// POST /api/transactions/import-csv
r.post('/import-csv',auth,upload.single('file'),async(q,s)=>{
  if(!q.file)return s.status(400).json({error:'No file uploaded'});
  try{
    const content=fs.readFileSync(q.file.path,'utf8');
    fs.unlinkSync(q.file.path);
    const lines=content.split('\n').filter(l=>l.trim());
    if(lines.length<2)return s.status(400).json({error:'CSV must have header and at least one row'});
    const header=lines[0].split(',').map(h=>h.trim().toLowerCase().replace(/"/g,''));
    const getIdx=(names)=>{for(const n of names){const i=header.indexOf(n);if(i>=0)return i;}return -1;};
    const dateIdx=getIdx(['date','transaction_date']);
    const merchantIdx=getIdx(['merchant','description','name','payee']);
    const amountIdx=getIdx(['amount','value']);
    const categoryIdx=getIdx(['category']);
    if(dateIdx<0||merchantIdx<0||amountIdx<0)return s.status(400).json({error:'CSV must have date, merchant/description, and amount columns'});
    let inserted=0;const errors=[];
    for(let i=1;i<lines.length;i++){
      try{
        const cols=lines[i].split(',').map(c=>c.trim().replace(/^"|"$/g,''));
        const date=cols[dateIdx];const merchant=cols[merchantIdx];
        const rawAmount=cols[amountIdx]?cols[amountIdx].replace(/[$,]/g,''):'0';
        const amount=parseFloat(rawAmount);
        if(!date||!merchant||isNaN(amount))continue;
        const category=categoryIdx>=0?cols[categoryIdx]:'Other';
        const txType=amount<0?'debit':'debit';
        await pool.query(
          'INSERT INTO transactions(merchant,category,amount,transaction_type,date,description) VALUES($1,$2,$3,$4,$5,$6)',
          [merchant,category,Math.abs(amount),txType,date,`Imported from CSV`]
        );
        inserted++;
      }catch(err){errors.push(`Row ${i}: ${err.message}`);}
    }
    s.json({success:true,inserted,errors:errors.slice(0,20)});
  }catch(e){s.status(500).json({error:e.message})}
});

module.exports=r;
