const CACHE_NAME='cm26-pwa-20260916-v12';
const APP_SHELL=[
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './pwa-enhancements.js',
  './trip-extras.js',
  './sheet-sync-20260915.js',
  './travel-ledger.js',
  './hero-surprise.js',
  './runtime-fixes.js',
  './release.json'
];

async function injectRuntimeEnhancements(response){
  if(!response)return response;
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;

  let html=await response.text();
  const tags=[];
  if(!html.includes('trip-extras.js'))tags.push('<script src="./trip-extras.js"></script>');
  if(!html.includes('sheet-sync-20260915.js'))tags.push('<script src="./sheet-sync-20260915.js"></script>');
  if(!html.includes('travel-ledger.js'))tags.push('<script src="./travel-ledger.js"></script>');
  if(!html.includes('hero-surprise.js'))tags.push('<script src="./hero-surprise.js"></script>');
  if(!html.includes('runtime-fixes.js'))tags.push('<script src="./runtime-fixes.js"></script>');
  if(tags.length){
    const block=tags.join('\n');
    html=html.includes('</body>')?html.replace('</body>',`${block}\n</body>`):`${html}\n${block}`;
  }

  const headers=new Headers(response.headers);
  headers.delete('content-length');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME&&!k.startsWith('cm26-hero-art-')).map(k=>caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;

  if(event.request.mode==='navigate'){
    event.respondWith(
      fetch(event.request).then(async res=>{
        const copy=res.clone();
        caches.open(CACHE_NAME).then(c=>c.put('./index.html',copy));
        return injectRuntimeEnhancements(res);
      }).catch(async()=>injectRuntimeEnhancements(await caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached=>cached||fetch(event.request).then(res=>{
      const copy=res.clone();
      caches.open(CACHE_NAME).then(c=>c.put(event.request,copy));
      return res;
    }))
  );
});

self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?event.data.json():{}}catch(e){data={body:event.data?.text()||''}}
  const title=data.title||'清邁 2026 課程提醒';
  const options={
    body:data.body||'有一則新的旅行提醒',
    icon:'./icons/icon-192.png',
    badge:'./icons/icon-192.png',
    tag:data.tag||'cm26-reminder',
    data:{url:data.url||'./',courseId:data.courseId||null},
    renotify:true
  };
  event.waitUntil(self.registration.showNotification(title,options));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=event.notification.data?.url||'./';
  event.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
      for(const client of list){
        if('focus' in client){
          client.navigate(target);
          return client.focus();
        }
      }
      return clients.openWindow?clients.openWindow(target):undefined;
    })
  );
});
