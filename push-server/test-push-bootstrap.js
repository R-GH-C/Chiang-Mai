(()=>{
  'use strict';
  const fs=require('fs');
  const path=require('path');
  const webpush=require('web-push');
  const originalExpress=require('express');
  const expressModule=require.cache[require.resolve('express')];
  const STORE_FILE=process.env.STORE_FILE||path.join(__dirname,'data','store.json');
  const TEST_PUSH_TOKEN=process.env.TEST_PUSH_TOKEN||process.env.CRON_SECRET||'';
  const FRONTEND_ORIGIN=process.env.FRONTEND_ORIGIN||'*';
  const TEST_DELAY_MS=10000;
  const TEST_COOLDOWN_MS=15000;
  const lastSent=new Map();

  if(process.env.VAPID_PUBLIC_KEY&&process.env.VAPID_PRIVATE_KEY){
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT||'mailto:example@example.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  }

  function loadStore(){
    try{return JSON.parse(fs.readFileSync(STORE_FILE,'utf8'))}
    catch(e){return {subscriptions:[],sent:{}}}
  }
  function saveStore(store){
    fs.mkdirSync(path.dirname(STORE_FILE),{recursive:true});
    fs.writeFileSync(STORE_FILE,JSON.stringify(store,null,2));
  }

  async function sendTestPush(endpoint){
    const store=loadStore();
    const row=store.subscriptions.find(x=>x.subscription?.endpoint===endpoint);
    if(!row)return;
    const label=row.identities?.includes('angel')?'🐵 Angel':row.identities?.includes('richard')?'🎓 Richard':'清邁 2026';
    const payload=JSON.stringify({
      title:'清邁 2026｜背景通知測試',
      body:`${label} 的 Web Push 已正常運作 🎉`,
      tag:'cm26-test-push',
      url:'./'
    });
    try{
      await webpush.sendNotification(row.subscription,payload);
    }catch(err){
      if(err.statusCode===404||err.statusCode===410){
        store.subscriptions=store.subscriptions.filter(x=>x!==row);
        saveStore(store);
      }
      console.error('Test Push failed',err.statusCode||err.message);
    }
  }

  function wrappedExpress(...args){
    const app=originalExpress(...args);
    app.post('/api/test-push',originalExpress.json({limit:'16kb'}),async(req,res)=>{
      const origin=req.get('origin')||'';
      if(FRONTEND_ORIGIN!=='*'&&origin!==FRONTEND_ORIGIN){
        return res.status(403).json({error:'origin not allowed'});
      }
      if(origin){
        res.set('Access-Control-Allow-Origin',origin);
        res.set('Vary','Origin');
      }
      if(!TEST_PUSH_TOKEN||req.get('x-test-token')!==TEST_PUSH_TOKEN){
        return res.status(401).json({error:'unauthorized'});
      }
      const endpoint=String(req.body?.endpoint||'');
      if(!endpoint)return res.status(400).json({error:'missing endpoint'});
      const store=loadStore();
      const row=store.subscriptions.find(x=>x.subscription?.endpoint===endpoint);
      if(!row)return res.status(404).json({error:'subscription not found'});

      const now=Date.now(),previous=lastSent.get(endpoint)||0;
      const remaining=Math.ceil((TEST_COOLDOWN_MS-(now-previous))/1000);
      if(remaining>0){
        res.set('Retry-After',String(remaining));
        return res.status(429).json({error:'please wait before retrying',retryAfterSeconds:remaining});
      }
      lastSent.set(endpoint,now);
      setTimeout(()=>sendTestPush(endpoint).catch(console.error),TEST_DELAY_MS);
      res.status(202).json({ok:true,scheduled:true,delaySeconds:TEST_DELAY_MS/1000,cooldownSeconds:TEST_COOLDOWN_MS/1000});
    });
    return app;
  }

  Object.assign(wrappedExpress,originalExpress);
  expressModule.exports=wrappedExpress;
})();
