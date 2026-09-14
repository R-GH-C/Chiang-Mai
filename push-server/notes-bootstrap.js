(()=>{
  'use strict';
  const fs=require('fs');
  const path=require('path');
  const originalExpress=require('express');
  const expressModule=require.cache[require.resolve('express')];
  const STORE_FILE=process.env.STORE_FILE||path.join(__dirname,'data','store.json');
  const NOTES_FILE=process.env.NOTES_FILE||path.join(path.dirname(STORE_FILE),'notes.json');
  const NOTES_SYNC_KEY=process.env.NOTES_SYNC_KEY||'';
  const FRONTEND_ORIGIN=process.env.FRONTEND_ORIGIN||'*';
  const rate=new Map();
  const MAX_NOTES=400;
  const MAX_TEXT=4000;

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
  function loadStore(){
    try{
      const raw=JSON.parse(fs.readFileSync(NOTES_FILE,'utf8'));
      return {version:1,notes:Array.isArray(raw.notes)?raw.notes:[]};
    }catch(e){return {version:1,notes:[]};}
  }
  function saveStore(store){
    fs.mkdirSync(path.dirname(NOTES_FILE),{recursive:true});
    const tmp=`${NOTES_FILE}.tmp`;
    fs.writeFileSync(tmp,JSON.stringify(store,null,2));
    fs.renameSync(tmp,NOTES_FILE);
  }
  function cleanText(v,max){return String(v??'').replace(/\u0000/g,'').slice(0,max);}
  function validIso(v){const t=Date.parse(v);return Number.isFinite(t)?new Date(t).toISOString():null;}
  function normalizeNote(n){
    if(!n||typeof n!=='object')return null;
    const id=cleanText(n.id,120);
    if(!/^[A-Za-z0-9._:-]{6,120}$/.test(id))return null;
    const updatedAt=validIso(n.updatedAt);if(!updatedAt)return null;
    const createdAt=validIso(n.createdAt)||updatedAt;
    const deleted=!!n.deleted;
    const text=cleanText(n.text,MAX_TEXT);
    if(!deleted&&!text.trim())return null;
    const date=/^\d{4}-\d{2}-\d{2}$/.test(String(n.date||''))?String(n.date):'';
    const allowedAuthors=new Set(['richard','angel','admin']);
    const author=allowedAuthors.has(n.author)?n.author:'admin';
    const owner=allowedAuthors.has(n.owner)?n.owner:author;
    return {id,scope:'shared',author,owner,date,type:cleanText(n.type||'一般',32),text,createdAt,updatedAt,deleted};
  }
  function compareTime(a,b){return Date.parse(a.updatedAt)-Date.parse(b.updatedAt);}
  function mergeNotes(existing,incoming){
    const map=new Map(existing.map(n=>[n.id,n]));
    let changed=0;
    for(const n of incoming){
      const prev=map.get(n.id);
      if(!prev||compareTime(n,prev)>0){map.set(n.id,n);changed++;}
    }
    const cutoff=Date.now()-1000*60*60*24*120;
    const notes=[...map.values()].filter(n=>!(n.deleted&&Date.parse(n.updatedAt)<cutoff)).sort((a,b)=>String(a.updatedAt).localeCompare(String(b.updatedAt))).slice(-MAX_NOTES);
    return {notes,changed};
  }

  function wrappedExpress(...args){
    const app=originalExpress(...args);
    app.options('/api/notes/sync',(req,res)=>{
      if(!setCors(req,res))return res.status(403).end();
      return res.status(204).end();
    });
    app.post('/api/notes/sync',originalExpress.json({limit:'160kb'}),(req,res)=>{
      if(!setCors(req,res))return res.status(403).json({error:'origin not allowed'});
      if(!NOTES_SYNC_KEY||req.get('x-notes-key')!==NOTES_SYNC_KEY)return res.status(401).json({error:'unauthorized'});
      const identity=String(req.body?.identity||'');
      if(!['richard','angel','admin'].includes(identity))return res.status(400).json({error:'invalid identity'});
      const ip=req.ip||req.socket?.remoteAddress||'unknown';
      const rateKey=`${ip}|${identity}`;
      const now=Date.now(),last=rate.get(rateKey)||0;
      if(now-last<700){res.set('Retry-After','1');return res.status(429).json({error:'please wait before retrying'});}
      rate.set(rateKey,now);
      const incomingRaw=Array.isArray(req.body?.notes)?req.body.notes:[];
      if(incomingRaw.length>MAX_NOTES)return res.status(413).json({error:'too many notes'});
      const incoming=incomingRaw.map(normalizeNote).filter(Boolean);
      const store=loadStore();
      const merged=mergeNotes(store.notes.map(normalizeNote).filter(Boolean),incoming);
      store.notes=merged.notes;saveStore(store);
      return res.json({ok:true,changed:merged.changed,notes:store.notes,serverTime:new Date().toISOString()});
    });
    return app;
  }

  Object.assign(wrappedExpress,originalExpress);
  expressModule.exports=wrappedExpress;
})();
