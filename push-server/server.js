const fs=require('fs');
const path=require('path');
const express=require('express');
const cors=require('cors');
const webpush=require('web-push');

const app=express();
const PORT=process.env.PORT||3000;
const FRONTEND_ORIGIN=process.env.FRONTEND_ORIGIN||'*';
const VAPID_PUBLIC_KEY=process.env.VAPID_PUBLIC_KEY||'';
const VAPID_PRIVATE_KEY=process.env.VAPID_PRIVATE_KEY||'';
const VAPID_SUBJECT=process.env.VAPID_SUBJECT||'mailto:example@example.com';
const CRON_SECRET=process.env.CRON_SECRET||'';
const STORE_FILE=process.env.STORE_FILE||path.join(__dirname,'data','store.json');
const ACTIVATION_CONFIRM_DELAY_MS=10000;

if(!VAPID_PUBLIC_KEY||!VAPID_PRIVATE_KEY){
  console.warn('WARNING: VAPID keys are not configured. Run: npm run generate-vapid');
}else{
  webpush.setVapidDetails(VAPID_SUBJECT,VAPID_PUBLIC_KEY,VAPID_PRIVATE_KEY);
}

app.use(cors({origin:FRONTEND_ORIGIN==='*'?true:FRONTEND_ORIGIN}));
app.use(express.json({limit:'128kb'}));

const COURSES=[
  {id:'richard-20260923-finance',owner:'richard',subject:'理財規劃與實務',start:'2026-09-23T18:00:00+07:00',thailand:'18:00–20:00'},
  {id:'richard-20260924-data',owner:'richard',subject:'活用數據分析的應用實務',start:'2026-09-24T18:00:00+07:00',thailand:'18:00–20:00'},
  {id:'angel-20260923-invest',owner:'angel',subject:'投資理財的資訊工具與運用實務',start:'2026-09-23T13:00:00+07:00',thailand:'13:00–14:40'}
];
const OFFSETS=[30,15,5];

function loadStore(){
  try{return JSON.parse(fs.readFileSync(STORE_FILE,'utf8'))}
  catch(e){return {subscriptions:[],sent:{}}}
}
function saveStore(store){
  fs.mkdirSync(path.dirname(STORE_FILE),{recursive:true});
  fs.writeFileSync(STORE_FILE,JSON.stringify(store,null,2));
}
function normalizeIdentity(x){
  return ['richard','angel','admin'].includes(x)?x:null;
}

async function sendActivationConfirmation(subscription,identity){
  if(identity==='admin'||!VAPID_PUBLIC_KEY||!VAPID_PRIVATE_KEY)return;
  const label=identity==='angel'?'🐵 Angel':'🎓 Richard';
  const payload=JSON.stringify({
    title:'清邁 2026｜背景提醒已啟用',
    body:`${label} 的背景課程提醒已可正常接收。`,
    tag:`cm26-activation-${identity}`,
    url:'./'
  });
  try{
    await webpush.sendNotification(subscription,payload);
  }catch(err){
    if(err.statusCode===404||err.statusCode===410){
      const store=loadStore();
      store.subscriptions=store.subscriptions.filter(x=>x.subscription?.endpoint!==subscription.endpoint);
      saveStore(store);
    }
    console.error('Activation confirmation Push failed',err.statusCode||err.message);
  }
}

app.get('/health',(req,res)=>res.json({ok:true,time:new Date().toISOString()}));

app.get('/api/vapid-public-key',(req,res)=>{
  if(!VAPID_PUBLIC_KEY)return res.status(503).json({error:'VAPID key not configured'});
  res.json({publicKey:VAPID_PUBLIC_KEY});
});

app.post('/api/subscribe',(req,res)=>{
  const identity=normalizeIdentity(req.body?.identity);
  const subscription=req.body?.subscription;
  if(!identity||!subscription?.endpoint)return res.status(400).json({error:'invalid subscription'});
  const store=loadStore();
  let row=store.subscriptions.find(x=>x.subscription?.endpoint===subscription.endpoint);
  if(!row){
    row={subscription,identities:[],createdAt:new Date().toISOString()};
    store.subscriptions.push(row);
  }else{
    row.subscription=subscription;
  }
  const newIdentity=!row.identities.includes(identity);
  if(newIdentity)row.identities.push(identity);
  row.updatedAt=new Date().toISOString();
  saveStore(store);

  const confirmationScheduled=newIdentity&&identity!=='admin'&&!!VAPID_PUBLIC_KEY&&!!VAPID_PRIVATE_KEY;
  if(confirmationScheduled){
    setTimeout(()=>sendActivationConfirmation(subscription,identity).catch(console.error),ACTIVATION_CONFIRM_DELAY_MS);
  }
  res.json({
    ok:true,
    identities:row.identities,
    confirmationScheduled,
    confirmationDelaySeconds:confirmationScheduled?ACTIVATION_CONFIRM_DELAY_MS/1000:0
  });
});

app.post('/api/unsubscribe',(req,res)=>{
  const identity=normalizeIdentity(req.body?.identity);
  const endpoint=req.body?.endpoint;
  if(!identity||!endpoint)return res.status(400).json({error:'invalid request'});
  const store=loadStore();
  const row=store.subscriptions.find(x=>x.subscription?.endpoint===endpoint);
  if(row){
    row.identities=row.identities.filter(x=>x!==identity);
    if(!row.identities.length){
      store.subscriptions=store.subscriptions.filter(x=>x!==row);
    }
    saveStore(store);
  }
  res.json({ok:true});
});

async function sendReminder(course,offset,store){
  const key=`${course.id}_${offset}`;
  if(store.sent[key])return 0;
  const payload=JSON.stringify({
    title:`${course.owner==='angel'?'🐵 Angel':'🎓 Richard'}｜${offset} 分鐘後上課`,
    body:`${course.subject}｜泰國時間 ${course.thailand}`,
    tag:`course-${course.id}-${offset}`,
    courseId:course.id,
    url:`./?course=${encodeURIComponent(course.id)}`
  });
  let sent=0;
  for(const row of [...store.subscriptions]){
    const should=row.identities.includes('admin')||row.identities.includes(course.owner);
    if(!should)continue;
    try{
      await webpush.sendNotification(row.subscription,payload);
      sent++;
    }catch(err){
      if(err.statusCode===404||err.statusCode===410){
        store.subscriptions=store.subscriptions.filter(x=>x!==row);
      }else{
        console.error('Push failed',err.statusCode||err.message);
      }
    }
  }
  store.sent[key]={sentAt:new Date().toISOString(),count:sent};
  return sent;
}

async function runScheduler(){
  if(!VAPID_PUBLIC_KEY||!VAPID_PRIVATE_KEY)return {ok:false,error:'VAPID not configured'};
  const now=Date.now();
  const store=loadStore();
  const results=[];
  for(const course of COURSES){
    const start=new Date(course.start).getTime();
    for(const offset of OFFSETS){
      const target=start-offset*60000;
      if(now>=target&&now<target+90000&&!store.sent[`${course.id}_${offset}`]){
        const count=await sendReminder(course,offset,store);
        results.push({course:course.id,offset,count});
      }
    }
  }
  saveStore(store);
  return {ok:true,results};
}

setInterval(()=>runScheduler().catch(console.error),30000);

app.post('/api/tick',async(req,res)=>{
  if(CRON_SECRET&&req.headers['x-cron-secret']!==CRON_SECRET){
    return res.status(401).json({error:'unauthorized'});
  }
  try{res.json(await runScheduler())}
  catch(e){res.status(500).json({error:e.message})}
});

app.listen(PORT,()=>console.log(`Push server listening on ${PORT}`));
