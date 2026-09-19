/* Chiang Mai v16: preload after notes-bootstrap.js, before server.js.
 * Use the existing shared sync key and Railway's persistent store volume.
 * Reject an entire conflicting batch: never overwrite either person's edits.
 */
(()=>{
  'use strict';
  const fs=require('fs'),path=require('path'),express=require('express');
  const {mergeRecord,project,equal,FIELDS}=require('./itinerary-merge-core.js');
  const expressEntry=require.cache[require.resolve('express')];
  const syncKey=process.env.NOTES_SYNC_KEY||'';
  const allowedOrigin=process.env.FRONTEND_ORIGIN||'*';
  const storePath=process.env.ITINERARY_FILE||path.join(path.dirname(process.env.STORE_FILE||path.join(__dirname,'data','store.json')),'itinerary.json');
  const max={date:10,time:70,type:60,title:160,zone:100,priority:35,arrangement:1600,rain:1200,packing:700,notes:1200,mode:4,order:12};
  const lastCall=new Map();
  function cors(req,res){
    const origin=req.get('origin')||'';
    if(allowedOrigin!=='*'&&origin!==allowedOrigin)return false;
    if(origin){res.set('Access-Control-Allow-Origin',origin);res.set('Vary','Origin');}
    res.set('Access-Control-Allow-Methods','POST,OPTIONS');
    res.set('Access-Control-Allow-Headers','Content-Type,X-Notes-Key');
    res.set('Access-Control-Max-Age','600');return true;
  }
  function read(){
    try{const data=JSON.parse(fs.readFileSync(storePath,'utf8'));
      if(!data||typeof data!=='object'||!data.records||typeof data.records!=='object'||Array.isArray(data.records))throw Error('Invalid itinerary store');
      return {version:1,seq:Number(data.seq)||0,records:data.records};
    }catch(e){if(e.code==='ENOENT')return {version:1,seq:0,records:{}};throw e;}
  }
  function write(data){
    fs.mkdirSync(path.dirname(storePath),{recursive:true});
    const tmp=`${storePath}.${process.pid}.tmp`;
    fs.writeFileSync(tmp,JSON.stringify(data));fs.renameSync(tmp,storePath);
  }
  function normalize(raw,id){
    if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.id!==id)return null;
    if(typeof raw.custom!=='boolean'||typeof raw.deleted!=='boolean'||!raw.patch||typeof raw.patch!=='object'||Array.isArray(raw.patch))return null;
    const patch={};
    for(const [field,value] of Object.entries(raw.patch)){
      if(!FIELDS.includes(field)||typeof value!=='string'||value.length>max[field]||value.includes('\u0000'))return null;
      patch[field]=value;
    }
    if(raw.custom&&(!patch.title?.trim()||!patch.date))return null;
    if('date' in patch&&!/^2026-(09-(2[3-9]|30)|10-0[1-3])$/.test(patch.date))return null;
    if('mode' in patch&&!['ALL','A','B','C'].includes(patch.mode))return null;
    if('order' in patch&&!Number.isFinite(Number(patch.order)))return null;
    return {id,custom:raw.custom,deleted:raw.deleted,patch};
  }
  const previousExpress=expressEntry.exports;
  function bootstrapExpress(...args){
    const app=previousExpress(...args);
    app.options('/api/itinerary/sync',(req,res)=>cors(req,res)?res.status(204).end():res.status(403).end());
    app.post('/api/itinerary/sync',express.json({limit:'120kb'}),(req,res)=>{
      if(!cors(req,res))return res.status(403).json({error:'origin not allowed'});
      if(!syncKey||req.get('x-notes-key')!==syncKey)return res.status(401).json({error:'unauthorized'});
      const identity=req.body?.identity;
      if(!['richard','angel','admin'].includes(identity))return res.status(400).json({error:'invalid identity'});
      const throttleKey=`${req.ip||'unknown'}:${identity}`,now=Date.now();
      if(now-(lastCall.get(throttleKey)||0)<700){res.set('Retry-After','1');return res.status(429).json({error:'retry after one second'});}
      lastCall.set(throttleKey,now);
      const changes=req.body?.changes;
      if(!Array.isArray(changes)||changes.length>250)return res.status(400).json({error:'invalid change count'});
      try{
        const store=read(),proposed={...store.records},conflicts=[],updates=[],seen=new Set();
        for(const item of changes){
          const id=String(item?.id||'');
          if(!/^(src-[a-f0-9]{8,16}|add-[A-Za-z0-9-]{8,80})$/.test(id)||seen.has(id))return res.status(400).json({error:'invalid or duplicate ID'});
          seen.add(id);
          const mine=normalize(item.value,id),base=item.base===null?null:normalize(item.base,id);
          if(!mine||(item.base!==null&&!base))return res.status(400).json({error:'invalid record or base'});
          const remote=proposed[id]||null;
          let chosen=mine;
          if(remote){
            if(!base){
              if(mine.custom||remote.custom){
                if(!equal(project(mine),project(remote))){conflicts.push({id,fields:['new-record'],remote});continue;}
                chosen=project(remote);
              }else{
                const merged=mergeRecord({id,custom:false,deleted:false,patch:{}},mine,remote);
                if(merged.conflicts.length){conflicts.push({id,fields:merged.conflicts,remote});continue;}
                chosen=merged.record;
              }
            }else if(Number(item.base.rev)!==Number(remote.rev)){
              const merge=mergeRecord(base,mine,remote);
              if(merge.conflicts.length){conflicts.push({id,fields:merge.conflicts,remote});continue;}
              chosen=merge.record;
            }
          }else if(base){conflicts.push({id,fields:['missing-record'],remote:null});continue;}
          updates.push({id,chosen,remote});proposed[id]=chosen;
        }
        if(conflicts.length)return res.status(409).json({error:'conflict',conflicts,records:store.records,seq:store.seq});
        if(Object.keys(proposed).length>600)return res.status(413).json({error:'too many itinerary items'});
        let changed=0;
        for(const {id,chosen,remote} of updates){
          if(remote&&equal(project(remote),project(chosen)))continue;
          store.seq++;changed++;
          proposed[id]={...chosen,rev:store.seq,updatedAt:new Date().toISOString(),updatedBy:identity};
        }
        if(changed){store.records=proposed;write(store);}
        return res.json({ok:true,changed,seq:store.seq,records:changed?proposed:store.records});
      }catch(err){console.error('Shared itinerary store error',err);return res.status(500).json({error:'storage unavailable'});}
    });
    return app;
  }
  Object.assign(bootstrapExpress,previousExpress);expressEntry.exports=bootstrapExpress;
})();
