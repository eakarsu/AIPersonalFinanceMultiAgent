const express=require('express'),pool=require('../models/db'),auth=require('../middleware/auth'),r=express.Router();
r.get('/',auth,async(q,s)=>{try{s.json((await pool.query('SELECT * FROM budgets ORDER BY category')).rows)}catch(e){s.status(500).json({error:e.message})}});
r.post('/',auth,async(q,s)=>{try{const{category,monthly_limit}=q.body;const r=await pool.query('INSERT INTO budgets(category,monthly_limit,created_by) VALUES($1,$2,$3) RETURNING *',[category,monthly_limit,q.user.id]);s.status(201).json(r.rows[0])}catch(e){s.status(500).json({error:e.message})}});
r.put('/:id',auth,async(q,s)=>{try{const{category,monthly_limit}=q.body;const r=await pool.query('UPDATE budgets SET category=$1,monthly_limit=$2 WHERE id=$3 RETURNING *',[category,monthly_limit,q.params.id]);s.json(r.rows[0])}catch(e){s.status(500).json({error:e.message})}});
r.delete('/:id',auth,async(q,s)=>{try{await pool.query('DELETE FROM budgets WHERE id=$1',[q.params.id]);s.json({message:'Deleted'})}catch(e){s.status(500).json({error:e.message})}});
module.exports=r;
