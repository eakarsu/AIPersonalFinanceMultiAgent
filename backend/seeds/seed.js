const path=require('path');const{Pool}=require('pg');const bcrypt=require('bcryptjs');require('dotenv').config({path:path.join(__dirname,'../../.env')});const{databaseUrl}=require('../config/security');
const pool=new Pool({connectionString:databaseUrl()});
async function seed(){try{
if(process.env.ALLOW_DESTRUCTIVE_SEED!=='true')throw new Error('set ALLOW_DESTRUCTIVE_SEED=true to run the destructive demo seed explicitly');
const seedEmail=process.env.SEED_ADMIN_EMAIL,seedPassword=process.env.SEED_ADMIN_PASSWORD;if(!seedEmail||!seedPassword)throw new Error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required');
await pool.query('DELETE FROM finance_logs');await pool.query('DELETE FROM budgets');await pool.query('DELETE FROM subscriptions');await pool.query('DELETE FROM transactions');await pool.query('DELETE FROM accounts');await pool.query('DELETE FROM users');
const h=await bcrypt.hash(seedPassword,10);const u=await pool.query("INSERT INTO users(email,password,name,role) VALUES($1,$2,'Admin User','account_owner') RETURNING id",[seedEmail,h]);const uid=u.rows[0].id;
const accts=[
  {name:'Chase Checking',inst:'JPMorgan Chase',type:'checking',bal:12450.67,num:'****4521'},
  {name:'BofA Savings',inst:'Bank of America',type:'savings',bal:34780.23,num:'****8934'},
  {name:'Amex Platinum',inst:'American Express',type:'credit',bal:-2340.56,num:'****1234'},
  {name:'Vanguard IRA',inst:'Vanguard',type:'investment',bal:156780.45,num:'****5678'},
  {name:'Wells Fargo Checking',inst:'Wells Fargo',type:'checking',bal:5670.89,num:'****9012'},
  {name:'Discover Credit',inst:'Discover',type:'credit',bal:-890.34,num:'****3456'},
  {name:'Fidelity 401k',inst:'Fidelity',type:'investment',bal:234560.78,num:'****7890'},
  {name:'Capital One Savings',inst:'Capital One',type:'savings',bal:18900.12,num:'****2345'},
  {name:'Citi Double Cash',inst:'Citibank',type:'credit',bal:-1567.89,num:'****6789'},
  {name:'Schwab Brokerage',inst:'Charles Schwab',type:'investment',bal:89450.34,num:'****0123'},
  {name:'Ally Savings',inst:'Ally Bank',type:'savings',bal:45670.56,num:'****4567'},
  {name:'US Bank Checking',inst:'US Bank',type:'checking',bal:3450.78,num:'****8901'},
  {name:'Chase Freedom',inst:'JPMorgan Chase',type:'credit',bal:-456.12,num:'****2345'},
  {name:'Robinhood',inst:'Robinhood',type:'investment',bal:12340.67,num:'****6789'},
  {name:'Marcus Savings',inst:'Goldman Sachs',type:'savings',bal:28900.45,num:'****0123'}
];
const acctIds=[];
for(const a of accts){const r=await pool.query('INSERT INTO accounts(name,institution,account_type,balance,account_number,created_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',[a.name,a.inst,a.type,a.bal,a.num,uid]);acctIds.push(r.rows[0].id)}
const cats=['Groceries','Dining','Entertainment','Utilities','Gas','Shopping','Travel','Healthcare','Education','Insurance','Subscriptions','Transportation','Personal Care','Home','Gifts'];
const merchants={Groceries:['Whole Foods','Trader Joes','Costco','Safeway','Kroger'],Dining:['Chipotle','Starbucks','McDonalds','Olive Garden','DoorDash'],Entertainment:['Netflix','AMC Theaters','Spotify','Steam','Apple Music'],Utilities:['PG&E','Comcast','AT&T','Water Co','Waste Management'],Gas:['Shell','Chevron','BP','Costco Gas','ExxonMobil'],Shopping:['Amazon','Target','Walmart','Best Buy','Nike'],Travel:['United Airlines','Marriott','Uber','Airbnb','Delta'],Healthcare:['CVS Pharmacy','Kaiser','Walgreens','Dr. Smith','Lab Corp']};
for(let i=0;i<60;i++){const cat=cats[Math.floor(Math.random()*8)];const mlist=merchants[cat]||['Generic Store'];const m=mlist[Math.floor(Math.random()*mlist.length)];const amt=cat==='Groceries'?45+Math.random()*105:cat==='Dining'?12+Math.random()*68:cat==='Utilities'?80+Math.random()*120:cat==='Gas'?30+Math.random()*30:20+Math.random()*200;
const aid=acctIds[Math.floor(Math.random()*4)];const d=new Date();d.setDate(d.getDate()-Math.floor(Math.random()*60));
await pool.query('INSERT INTO transactions(account_id,merchant,category,amount,transaction_type,date,description) VALUES($1,$2,$3,$4,$5,$6,$7)',[aid,m,cat,amt.toFixed(2),'debit',d.toISOString().split('T')[0],`${cat} purchase at ${m}`])}
const subs=[{name:'Netflix',amt:15.99,cat:'Entertainment'},{name:'Spotify Premium',amt:9.99,cat:'Entertainment'},{name:'AWS',amt:45.00,cat:'Technology'},{name:'ChatGPT Plus',amt:20.00,cat:'Technology'},{name:'Planet Fitness',amt:49.99,cat:'Health'},{name:'Adobe Creative Cloud',amt:54.99,cat:'Software'},{name:'Disney+',amt:13.99,cat:'Entertainment'},{name:'YouTube Premium',amt:13.99,cat:'Entertainment'},{name:'iCloud Storage',amt:2.99,cat:'Technology'},{name:'LinkedIn Premium',amt:29.99,cat:'Professional'},{name:'Dropbox Plus',amt:11.99,cat:'Technology'},{name:'NY Times',amt:17.00,cat:'News'}];
for(const s of subs){const nd=new Date();nd.setDate(nd.getDate()+Math.floor(Math.random()*30));await pool.query('INSERT INTO subscriptions(account_id,service_name,amount,frequency,next_charge,status,category) VALUES($1,$2,$3,$4,$5,$6,$7)',[acctIds[2],s.name,s.amt,'monthly',nd.toISOString().split('T')[0],'active',s.cat])}
const budgets=[{cat:'Groceries',limit:600,spent:485},{cat:'Dining',limit:300,spent:275},{cat:'Entertainment',limit:200,spent:189},{cat:'Utilities',limit:400,spent:356},{cat:'Gas',limit:150,spent:123},{cat:'Shopping',limit:500,spent:567},{cat:'Travel',limit:800,spent:234},{cat:'Healthcare',limit:300,spent:145}];
for(const b of budgets){await pool.query('INSERT INTO budgets(category,monthly_limit,spent,created_by) VALUES($1,$2,$3,$4)',[b.cat,b.limit,b.spent,uid])}
console.log('✅ Seed: 15 accounts, 60 transactions, 12 subscriptions, 8 budgets');process.exit(0)}catch(e){console.error(e);process.exit(1)}}
seed();
