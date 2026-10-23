'use strict';
// Feature-pack 41B: authenticated tasks, search/filter, CSV/JSON export, domain AI over own task records.
const express=require('express');
const {toCsv,filterRecords,validateTaskInput,buildDeterministicInsight,callProviderIfConfigured,createTaskStore}=require('../lib/featurePack41b');
const auth=require('../middleware/auth');
const router=express.Router(); router.use(auth);
const store=createTaskStore();
const FEATURES=[
  {id:'spending-task-triage',label:'Spending task triage',statusKey:'status',numericKeys:['amount'],recommendations:['Prioritise high-value open finance tasks.']},
  {id:'budget-watch',label:'Budget watch',statusKey:'status',numericKeys:['amount'],findings:(rows)=>[`Total amount across tasks: ${rows.reduce((s,r)=>s+(Number(r.amount)||0),0)}`],recommendations:['Review largest amounts against budgets.']},
  {id:'cashflow-followups',label:'Cashflow follow-ups',statusKey:'status',numericKeys:['amount'],findings:(rows)=>[`Open follow-ups: ${rows.filter(r=>r.status!=='done').length}`],recommendations:['Set due dates for open cashflow follow-ups.']}
 ];
function userKey(req){ return String((req.user&&(req.user.id||req.user.userId||req.user.email||req.user.sub))||'authenticated-user'); }
router.get('/tasks',(req,res)=>{ const tasks=store.list(userKey(req),{q:req.query.q,search:req.query.search,status:req.query.status,priority:req.query.priority}); res.json({tasks,count:tasks.length}); });
router.post('/tasks',(req,res)=>{ const {errors,value}=validateTaskInput(req.body||{}); if(errors.length) return res.status(400).json({error:errors.join('; ')}); const task=store.create(userKey(req),value); return res.status(201).json({task}); });
function doUpdate(req,res){ const {errors,value}=validateTaskInput(req.body||{},{partial:true}); if(errors.length) return res.status(400).json({error:errors.join('; ')}); if(!Object.keys(value).length) return res.status(400).json({error:'No updatable fields supplied'}); const task=store.update(userKey(req),req.params.id,value); if(!task) return res.status(404).json({error:'Task not found'}); return res.json({task}); }
router.put('/tasks/:id',doUpdate); router.patch('/tasks/:id',doUpdate);
function doExport(req,res){ const format=String(req.query.format||'json').toLowerCase(); if(!['csv','json'].includes(format)) return res.status(400).json({error:'format must be csv or json'}); const records=store.list(userKey(req),{q:req.query.q,search:req.query.search,status:req.query.status,priority:req.query.priority}); if(format==='csv'){ res.setHeader('Content-Type','text/csv'); res.setHeader('Content-Disposition','attachment; filename="tasks.csv"'); return res.send(toCsv(records)); } res.setHeader('Content-Disposition','attachment; filename="tasks.json"'); return res.json({records,count:records.length,exported_at:new Date().toISOString()}); }
router.get('/tasks/export',doExport); router.get('/records/export',doExport); router.get('/export',doExport);
router.get('/records',(req,res)=>{ const records=store.list(userKey(req),{q:req.query.q,search:req.query.search,status:req.query.status,priority:req.query.priority}); res.json({records,count:records.length}); });
router.get('/ai/features',(req,res)=>res.json({features:FEATURES.map(({id,label})=>({id,label}))}));
async function doAi(req,res){ const spec=FEATURES.find(f=>f.id===req.params.feature); if(!spec) return res.status(404).json({error:'Unknown feature'}); const records=store.list(userKey(req),{}); let ai=null; try{ ai=await callProviderIfConfigured(spec.id,records,spec); }catch(_ ){ ai=null; } if(ai) return res.json(ai); return res.json(buildDeterministicInsight(spec.id,records,spec)); }
router.post('/ai/:feature',doAi); router.get('/ai/:feature',doAi);
module.exports=router;
