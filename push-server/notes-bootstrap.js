(()=>{
  'use strict';
  const fs=require('fs');
  const path=require('path');
  const originalExpress=require('express');
  const expressModule=require.cache[require.resolve('express')];
  const STORE_FILE=process.env.STORE_FILE||path.join(__dirname,'data','store.json');
  const NOTES_FILE=process.env.NOTES_FILE||path.join(path.dirname(STORE_FILE),'notes.json');
  const EXPENSES_FILE=process.env.EXPENSES_FILE||path.join(path.dirname(STORE_FILE),'expenses.json');
  const NOTES_SYNC_KEY=process.env.NOTES_SYNC_KEY||'';
  const FRONTEND_ORIGIN=process.env.FRONTEND_ORIGIN||'*';
  const rate=new Map();
  const MAX_NOTES=400;
  const MAX_TEXT=4000;
  const MAX_EXPENSES=1500;

  function originAllowed(req,res){
    const origin=req.get('origin')||'';
    if(FRONTEND_ORIGIN!=='*'&&origin!==FRONTEND_ORIGIN)return false;
    if(origin){res.set('Access-Control-Allow-Origin',origin);res.set('Vary','Origin');}
    return true;
  }
  function setCors(req,res){
    if(!originAllowed(req,res))return false;
    res.set('Access-Control-Allow-Methods','POST,OPTIONS');
    res.set('Access-Control-Allow-Headers','Content-Type,X-Notes-Key');
    res.set('Access-Control-Max-Age','600');
    return true;
  }
  function readJson(file,fallback){try{return JSON.parse(fs.readFileSync(file,'utf8'))}catch(e){return fallback}}
  function writeJson(file,data){fs.mkdirSync(path.dirname(file),{recursive:true});const tmp=`${file}.tmp`;fs.writeFileSync(tmp,JSON.stringify(data,null,2));fs.renameSync(tmp,file);}
  function loadStore(){const raw=readJson(NOTES_FILE,{version:1,notes:[]});return {version:1,notes:Array.isArray(raw.notes)?raw.notes:[]};}
  function saveStore(store){writeJson(NOTES_FILE,store);}
  function loadExpenses(){const raw=readJson(EXPENSES_FILE,{version:1,entries:[]});return {version:1,entries:Array.isArray(raw.entries)?raw.entries:[]};}
  function saveExpenses(store){writeJson(EXPENSES_FILE,store);}
  function cleanText(v,max){return String(v??'').replace(/\u0000/g,'').slice(0,max);}
  function validIso(v){const t=Date.parse(v);return Number.isFinite(t)?new Date(t).toISOString():null;}
  function validDate(v){return /^\d{4}-\d{2}-\d{2}$/.test(String(v||''))?String(v):'';}
  function validTime(v){return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(v||''))?String(v):'';}
  function finitePositive(v){const n=Number(v);return Number.isFinite(n)&&n>0?n:null;}
  function validIdentity(v){return ['richard','angel','admin'].includes(v)?v:null;}

  function normalizeNote(n){
    if(!n||typeof n!=='object')return null;
    const id=cleanText(n.id,120);
    if(!/^[A-Za-z0-9._:-]{6,120}$/.test(id))return null;
    const updatedAt=validIso(n.updatedAt);if(!updatedAt)return null;
    const createdAt=validIso(n.createdAt)||updatedAt;
    const deleted=!!n.deleted;
    const text=cleanText(n.text,MAX_TEXT);
    if(!deleted&&!text.trim())return null;
    const date=validDate(n.date);
    const author=validIdentity(n.author)||'admin';
    const owner=validIdentity(n.owner)||author;
    return {id,scope:'shared',author,owner,date,type:cleanText(n.type||'一般',32),text,createdAt,updatedAt,deleted};
  }
  function normalizeExpense(e){
    if(!e||typeof e!=='object')return null;
    const id=cleanText(e.id,120);if(!/^[A-Za-z0-9._:-]{6,120}$/.test(id))return null;
    const updatedAt=validIso(e.updatedAt);if(!updatedAt)return null;
    const createdAt=validIso(e.createdAt)||updatedAt;
    const type=['expense','income','exchange'].includes(e.type)?e.type:null;if(!type)return null;
    const deleted=!!e.deleted;
    const author=validIdentity(e.author)||'admin';
    const base={id,author,type,date:validDate(e.date),time:validTime(e.time),note:cleanText(e.note,500),createdAt,updatedAt,deleted};
    if(deleted)return base;
    if(type==='exchange'){
      const fromAmount=finitePositive(e.fromAmount),toAmount=finitePositive(e.toAmount);if(!fromAmount||!toAmount)return null;
      return {...base,fromAmount,fromCurrency:['THB','TWD'].includes(e.fromCurrency)?e.fromCurrency:'TWD',toAmount,toCurrency:['THB','TWD'].includes(e.toCurrency)?e.toCurrency:'THB',payer:['richard','angel','shared'].includes(e.payer)?e.payer:author};
    }
    const amount=finitePositive(e.amount);if(!amount)return null;
    return {...base,amount,currency:['THB','TWD'].includes(e.currency)?e.currency:'THB',category:cleanText(e.category,50),item:cleanText(e.item,100),customItem:cleanText(e.customItem,100),payer:['richard','angel','shared'].includes(e.payer)?e.payer:author,method:cleanText(e.method,50)};
  }
  function compareTime(a,b){return Date.parse(a.updatedAt)-Date.parse(b.updatedAt);}
  function mergeRows(existing,incoming,max){
    const map=new Map(existing.map(n=>[n.id,n]));let changed=0;
    for(const n of incoming){const prev=map.get(n.id);if(!prev||compareTime(n,prev)>0){map.set(n.id,n);changed++;}}
    const cutoff=Date.now()-1000*60*60*24*120;
    const rows=[...map.values()].filter(n=>!(n.deleted&&Date.parse(n.updatedAt)<cutoff)).sort((a,b)=>String(a.updatedAt).localeCompare(String(b.updatedAt))).slice(-max);
    return {rows,changed};
  }
  function rateAllowed(req,res,identity,kind){
    const ip=req.ip||req.socket?.remoteAddress||'unknown';const key=`${kind}|${ip}|${identity}`;const now=Date.now(),last=rate.get(key)||0;
    if(now-last<700){res.set('Retry-After','1');res.status(429).json({error:'please wait before retrying'});return false;}rate.set(key,now);return true;
  }
  function authorized(req){return !!NOTES_SYNC_KEY&&req.get('x-notes-key')===NOTES_SYNC_KEY;}

  function wrappedExpress(...args){
    const app=originalExpress(...args);
    app.options(['/api/notes/sync','/api/expenses/sync'],(req,res)=>{if(!setCors(req,res))return res.status(403).end();return res.status(204).end();});
    app.post('/api/notes/sync',originalExpress.json({limit:'160kb'}),(req,res)=>{
      if(!setCors(req,res))return res.status(403).json({error:'origin not allowed'});
      if(!authorized(req))return res.status(401).json({error:'unauthorized'});
      const identity=String(req.body?.identity||'');if(!validIdentity(identity))return res.status(400).json({error:'invalid identity'});
      if(!rateAllowed(req,res,identity,'notes'))return;
      const incomingRaw=Array.isArray(req.body?.notes)?req.body.notes:[];if(incomingRaw.length>MAX_NOTES)return res.status(413).json({error:'too many notes'});
      const incoming=incomingRaw.map(normalizeNote).filter(Boolean);const store=loadStore();const merged=mergeRows(store.notes.map(normalizeNote).filter(Boolean),incoming,MAX_NOTES);store.notes=merged.rows;saveStore(store);
      return res.json({ok:true,changed:merged.changed,notes:store.notes,serverTime:new Date().toISOString()});
    });
    app.post('/api/expenses/sync',originalExpress.json({limit:'420kb'}),(req,res)=>{
      if(!setCors(req,res))return res.status(403).json({error:'origin not allowed'});
      if(!authorized(req))return res.status(401).json({error:'unauthorized'});
      const identity=String(req.body?.identity||'');if(!validIdentity(identity))return res.status(400).json({error:'invalid identity'});
      if(!rateAllowed(req,res,identity,'expenses'))return;
      const incomingRaw=Array.isArray(req.body?.entries)?req.body.entries:[];if(incomingRaw.length>MAX_EXPENSES)return res.status(413).json({error:'too many entries'});
      const incoming=incomingRaw.map(normalizeExpense).filter(Boolean);const store=loadExpenses();const merged=mergeRows(store.entries.map(normalizeExpense).filter(Boolean),incoming,MAX_EXPENSES);store.entries=merged.rows;saveExpenses(store);
      return res.json({ok:true,changed:merged.changed,entries:store.entries,serverTime:new Date().toISOString()});
    });
    return app;
  }

  Object.assign(wrappedExpress,originalExpress);
  expressModule.exports=wrappedExpress;
})();
