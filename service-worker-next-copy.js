const CACHE_NAME='cm26-pwa-20260914-v3';
const APP_SHELL=[
  './',
  './index.html',
  './manifest.webmanifest',
  './pwa-enhancements.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));
  self.clients.claim();
});

function addEnhancementScript(html){
  if(html.includes('pwa-enhancements.js'))return html;
  return html.replace('</body>','<script src="./pwa-enhancements.js"></script></body>');
}

async function htmlResponseWithEnhancement(response){
  if(!response)return response;
  const type=response.headers.get('content-type')||'';
  if(!type.includes('text/html'))return response;
  const html=addEnhancementScript(await response.text());
  const headers=new Headers(response.headers);
  headers.delete('content-length');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  if(event.request.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const transformed=await htmlResponseWithEnhancement(await fetch(event.request));
        caches.open(CACHE_NAME).then(c=>c.put('./index.html',transformed.clone()));
        return transformed;
      }catch(e){
        return htmlResponseWithEnhancement(await caches.match('./index.html'));
      }
    })());
    return;
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(res=>{
    caches.open(CACHE_NAME).then(c=>c.put(event.request,res.clone()));
    return res;
  })));
});

self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?event.data.json():{}}catch(e){data={body:event.data?.text()||''}}
  const title=data.title||'清邁 2026 課程提醒';
  const options={body:data.body||'有一則新的旅行提醒',icon:'./icons/icon-192.png',badge:'./icons/icon-192.png',tag:data.tag||'cm26-reminder',data:{url:data.url||'./',courseId:data.courseId||null},renotify:true};
  event.waitUntil(self.registration.showNotification(title,options));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=event.notification.data?.url||'./';
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const client of list){
      if('focus' in client){client.navigate(target);return client.focus();}
    }
    return clients.openWindow?clients.openWindow(target):undefined;
  }));
});
