(()=>{
  'use strict';

  const TRIP_START='2026-09-23';
  const TRIP_END='2026-10-03';
  const HERO_CACHE='cm26-hero-art-v1';
  const HERO_VERSION='1';
  let activeKey='';
  let heroTimer=0;
  let audioCtx=null;

  const META={
    '2026-09-23':{title:'抵達清邁',icon:'✈️🌿',line:'從抵達開始，慢慢進入清邁的節奏。',a:'#8fd3e8',b:'#eef8e8',accent:'#397a91',scene:'arrival'},
    '2026-09-24':{title:'大象與山林',icon:'🐘🌿',line:'今天，把腳步交給山林與大象。',a:'#8fc39a',b:'#e5f1d8',accent:'#3f6e4c',scene:'forest'},
    '2026-09-25':{title:'Skyline 冒險日',icon:'🌤️🧗',line:'把視野拉高，今天勇敢一點。',a:'#8ac8e8',b:'#e8f3e2',accent:'#3b6f90',scene:'zipline'},
    '2026-09-26':{title:'手作與週六夜市',icon:'🧺🏮',line:'白天慢慢逛，晚上跟著燈火走。',a:'#f2bd80',b:'#f8e9cf',accent:'#8a5a2d',scene:'lantern'},
    '2026-09-27':{title:'週日市集散步',icon:'🌼🧺',line:'花、市集和一整天的散步。',a:'#e7cf7d',b:'#edf0c9',accent:'#74743b',scene:'market'},
    '2026-09-28':{title:'古城寺廟與按摩',icon:'🛕🌿',line:'古城的金色午後，留一點時間給自己。',a:'#d9ad7d',b:'#f2e5cf',accent:'#76513b',scene:'temple'},
    '2026-09-29':{title:'89 個月・特別的一天',icon:'💛89',line:'89 個月，把今天留給我們。',a:'#e6a8a8',b:'#f7e3b2',accent:'#89565b',scene:'special'},
    '2026-09-30':{title:'城門與夜市燈火',icon:'🌙🏮',line:'從城門走進夜色，今晚慢慢亮起來。',a:'#65658f',b:'#c69a83',accent:'#4c4568',scene:'night'},
    '2026-10-01':{title:'Nimman 慢生活',icon:'☕✨',line:'咖啡、選物與沒有趕時間的午後。',a:'#bda2ca',b:'#eadcc8',accent:'#6b5579',scene:'coffee'},
    '2026-10-02':{title:'復古市集與最後採買',icon:'🎞️🧳',line:'把最後想帶回家的東西，慢慢收進行李。',a:'#bd9b6f',b:'#eee0c5',accent:'#725940',scene:'vintage'},
    '2026-10-03':{title:'帶著回憶回家',icon:'✈️💙',line:'行李裝滿了，回憶也剛剛好。',a:'#91c5df',b:'#e6eef6',accent:'#466b84',scene:'home'}
  };

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function identity(){try{return window.currentAuth?.()?.identity||null}catch(e){return null}}
  function bangkokParts(){const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());return Object.fromEntries(p.map(x=>[x.type,x.value]));}
  function bangkokDate(){const p=bangkokParts();return `${p.year}-${p.month}-${p.day}`;}
  function bangkokHour(){return Number(bangkokParts().hour)||0;}
  function activeDate(){const q=new URLSearchParams(location.search).get('themeDate');if(q)return q;return bangkokDate();}
  function nextDate(date){const d=new Date(`${date}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+1);return d.toISOString().slice(0,10);}
  function inTrip(d){return d>=TRIP_START&&d<=TRIP_END;}
  function variantFor(date){
    if(date!=='2026-09-29')return 'default';
    const forced=new URLSearchParams(location.search).get('heroVariant');if(['monkey','elephant'].includes(forced))return forced;
    return identity()==='angel'&&bangkokHour()<14?'monkey':'elephant';
  }
  function keyFor(date,variant='default'){return `${date}-${variant}-v${HERO_VERSION}`;}
  function virtualUrl(key){return `./hero-cache/${key}.svg`;}
  function dataUrl(svg){return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;}

  function defs(a,b){return `<defs><linearGradient id="bg" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient><linearGradient id="sun" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#fff8d6"/><stop offset="1" stop-color="#ffd68f"/></linearGradient><filter id="soft"><feGaussianBlur stdDeviation="10"/></filter><filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".65" numOctaves="2" seed="4" result="n"/><feColorMatrix in="n" type="saturate" values="0" result="g"/><feBlend in="SourceGraphic" in2="g" mode="soft-light"/></filter></defs>`;}
  function baseScene(meta,body){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 480" role="img"><title>${esc(meta.title)}</title>${defs(meta.a,meta.b)}<rect width="1200" height="480" fill="url(#bg)"/><circle cx="960" cy="92" r="64" fill="url(#sun)" opacity=".78"/><path d="M0 330 Q170 220 330 316 T650 300 T990 292 T1200 300 V480 H0Z" fill="#6e8f72" opacity=".35"/><path d="M0 370 Q180 300 360 352 T720 340 T1040 350 T1200 330 V480 H0Z" fill="#2f5f51" opacity=".26"/>${body}<rect x="0" y="0" width="1200" height="480" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="2"/></svg>`;}

  function normalSvg(date){
    const m=META[date];if(!m)return '';
    const common=`<g opacity=".9"><path d="M70 410 Q170 350 280 410" stroke="#254a40" stroke-width="8" fill="none" opacity=".28"/><circle cx="1040" cy="390" r="90" fill="#274b41" opacity=".13"/></g>`;
    let body='';
    if(m.scene==='arrival')body=`${common}<g transform="translate(170 120) rotate(-8)"><path d="M0 44 L210 82 285 45 305 58 240 102 305 126 294 140 214 119 145 168 126 162 155 111 0 67Z" fill="#fff" opacity=".94"/><path d="M55 68 L205 92" stroke="#557f91" stroke-width="7"/></g><g fill="#6e4d36" opacity=".6"><rect x="730" y="300" width="20" height="120"/><path d="M680 320 L740 248 800 320Z"/><path d="M700 295 L740 263 780 295Z" fill="#e7b14e"/></g>`;
    if(m.scene==='forest')body=`${common}<g transform="translate(205 198)" fill="#4f5c52" filter="url(#grain)"><ellipse cx="170" cy="110" rx="150" ry="85"/><circle cx="305" cy="85" r="72"/><ellipse cx="350" cy="83" rx="48" ry="72"/><path d="M348 126 Q388 166 350 233 Q330 265 314 230 Q338 174 318 131Z"/><rect x="80" y="160" width="30" height="120" rx="12"/><rect x="212" y="160" width="30" height="120" rx="12"/></g><g fill="#2c6848" opacity=".55"><circle cx="900" cy="290" r="88"/><circle cx="1010" cy="250" r="72"/><circle cx="1090" cy="310" r="98"/></g>`;
    if(m.scene==='zipline')body=`${common}<path d="M120 128 L1090 300" stroke="#263c50" stroke-width="5"/><g transform="translate(560 220)"><circle cx="0" cy="0" r="18" fill="#293947"/><path d="M0 15 L-16 78 M0 20 L28 65 M-9 35 L-48 8 M8 34 L50 4" stroke="#293947" stroke-width="13" stroke-linecap="round"/><path d="M-53 4 Q0 -18 55 0" stroke="#d77445" stroke-width="7" fill="none"/></g><path d="M120 380 L330 170 530 380Z" fill="#3d6c62" opacity=".5"/><path d="M590 390 L825 155 1080 390Z" fill="#315a52" opacity=".42"/>`;
    if(m.scene==='lantern')body=`${common}<g transform="translate(180 80)" stroke="#7b4a2d" stroke-width="5"><path d="M0 0 Q120 80 250 10 T520 30 T820 0" fill="none"/><g fill="#f7b24c" stroke="#9a5a2d"><path d="M130 45 q35 -35 70 0 v90 q-35 25 -70 0z"/><path d="M420 44 q35 -35 70 0 v90 q-35 25 -70 0z"/><path d="M720 30 q35 -35 70 0 v90 q-35 25 -70 0z"/></g></g><g fill="#9b7655" opacity=".7"><rect x="180" y="318" width="720" height="26" rx="12"/><rect x="240" y="350" width="110" height="70" rx="12"/><rect x="430" y="350" width="110" height="70" rx="12"/><rect x="620" y="350" width="110" height="70" rx="12"/></g>`;
    if(m.scene==='market')body=`${common}<g transform="translate(135 245)"><path d="M0 90 L100 0 200 90Z" fill="#f4d47b"/><path d="M220 90 L320 0 420 90Z" fill="#d6b867"/><path d="M440 90 L540 0 640 90Z" fill="#efd98f"/><rect y="90" width="200" height="90" fill="#fff6dc" opacity=".85"/><rect x="220" y="90" width="200" height="90" fill="#fff8e8" opacity=".85"/><rect x="440" y="90" width="200" height="90" fill="#fff1d1" opacity=".85"/></g><g fill="#fff7c2" stroke="#bd8f4b" stroke-width="5"><circle cx="930" cy="160" r="40"/><circle cx="1015" cy="210" r="34"/><circle cx="900" cy="255" r="32"/></g>`;
    if(m.scene==='temple')body=`${common}<g transform="translate(350 112)"><rect x="120" y="175" width="290" height="170" rx="8" fill="#f0c46a" opacity=".92"/><path d="M80 190 L265 40 450 190Z" fill="#a34f35"/><path d="M132 170 L265 70 398 170Z" fill="#e3a748"/><path d="M245 40 L265 0 285 40Z" fill="#f8d889"/><rect x="232" y="230" width="66" height="115" fill="#6e4b3d"/><path d="M100 210 H430" stroke="#6d4937" stroke-width="8"/></g><g fill="#3a6d4f" opacity=".55"><circle cx="250" cy="330" r="110"/><circle cx="980" cy="335" r="130"/></g>`;
    if(m.scene==='night')body=`${common}<rect width="1200" height="480" fill="#283048" opacity=".42"/><circle cx="980" cy="90" r="48" fill="#fff1bb"/><g transform="translate(135 90)" stroke="#d59b55" stroke-width="4"><path d="M0 0 Q220 80 430 12 T860 0" fill="none"/><g fill="#ef9a4a"><ellipse cx="150" cy="58" rx="30" ry="42"/><ellipse cx="430" cy="55" rx="30" ry="42"/><ellipse cx="720" cy="45" rx="30" ry="42"/></g></g><g fill="#f2b766" opacity=".75"><rect x="170" y="320" width="130" height="90"/><rect x="355" y="300" width="150" height="110"/><rect x="570" y="330" width="135" height="80"/><rect x="760" y="310" width="145" height="100"/></g>`;
    if(m.scene==='coffee')body=`${common}<g transform="translate(300 155)"><ellipse cx="220" cy="205" rx="205" ry="30" fill="#5d4a42" opacity=".25"/><path d="M70 40 H330 V220 Q330 290 200 290 Q70 290 70 220Z" fill="#fff9f2" stroke="#886f66" stroke-width="9"/><path d="M330 88 Q430 86 420 160 Q410 220 330 200" fill="none" stroke="#886f66" stroke-width="17"/><path d="M140 18 Q110 -30 145 -75 M210 18 Q180 -25 220 -75 M275 18 Q245 -25 282 -72" stroke="#fff" stroke-width="10" opacity=".68" fill="none"/></g><g fill="#4f7455" opacity=".55"><circle cx="925" cy="215" r="105"/><circle cx="1030" cy="300" r="82"/></g>`;
    if(m.scene==='vintage')body=`${common}<g transform="translate(235 130) rotate(-6)"><rect width="370" height="250" rx="24" fill="#4b443e"/><circle cx="185" cy="125" r="78" fill="#1f2225" stroke="#aaa08e" stroke-width="14"/><circle cx="185" cy="125" r="38" fill="#6c8a8a"/><rect x="40" y="35" width="105" height="35" rx="8" fill="#c2b69e"/></g><g transform="translate(730 170)"><rect width="185" height="210" rx="22" fill="#9b765a"/><path d="M45 20 Q92 -40 140 20" stroke="#5f4838" stroke-width="15" fill="none"/><rect x="30" y="60" width="125" height="15" fill="#d8b48a"/></g>`;
    if(m.scene==='home')body=`${common}<g transform="translate(660 145) rotate(8)"><path d="M0 80 L260 100 330 55 350 72 290 115 360 145 345 160 270 136 188 205 164 198 205 130 0 105Z" fill="#fff" opacity=".95"/><path d="M65 103 L255 121" stroke="#5c8098" stroke-width="8"/></g><g transform="translate(180 210)"><rect width="230" height="185" rx="24" fill="#57728a" opacity=".88"/><path d="M55 18 Q115 -55 175 18" stroke="#354d60" stroke-width="18" fill="none"/><circle cx="65" cy="190" r="18" fill="#263846"/><circle cx="170" cy="190" r="18" fill="#263846"/></g>`;
    return baseScene(m,body);
  }

  function monkeyHeroSvg(){
    const m=META['2026-09-29'];
    const monkey=(x,flip=1)=>`<g transform="translate(${x} 115) scale(${flip} 1)" filter="url(#grain)"><ellipse cx="0" cy="172" rx="102" ry="116" fill="#68534b"/><ellipse cx="0" cy="82" rx="74" ry="72" fill="#725d54"/><ellipse cx="0" cy="92" rx="50" ry="47" fill="#c4a394"/><ellipse cx="-20" cy="82" rx="7" ry="9" fill="#242424"/><ellipse cx="20" cy="82" rx="7" ry="9" fill="#242424"/><path d="M-19 111 Q0 124 22 109" stroke="#5d4037" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="-66" cy="78" r="22" fill="#8a6c61"/><circle cx="66" cy="78" r="22" fill="#8a6c61"/><path d="M-70 190 Q-118 255 -82 338" stroke="#5e4942" stroke-width="28" fill="none" stroke-linecap="round"/><path d="M70 190 Q118 255 82 338" stroke="#5e4942" stroke-width="28" fill="none" stroke-linecap="round"/><path d="M-70 260 Q-150 288 -150 350" stroke="#5b4740" stroke-width="24" fill="none" stroke-linecap="round"/></g>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 480"><title>9/29 Angel 猴子主題</title>${defs(m.a,m.b)}<rect width="1200" height="480" fill="url(#bg)"/><circle cx="1000" cy="82" r="68" fill="url(#sun)" opacity=".75"/><path d="M0 355 Q210 250 420 345 T820 330 T1200 335 V480 H0Z" fill="#5c8059" opacity=".35"/><g opacity=".7">${monkey(390,1)}${monkey(810,-1)}</g><path d="M320 368 C310 260 500 220 600 360 C700 220 890 260 880 368" stroke="#5b4740" stroke-width="23" fill="none" stroke-linecap="round"/><path d="M600 360 C545 295 465 248 394 270" stroke="#5b4740" stroke-width="23" fill="none" stroke-linecap="round" opacity=".96"/><path d="M600 360 C655 295 735 248 806 270" stroke="#5b4740" stroke-width="23" fill="none" stroke-linecap="round" opacity=".96"/><g fill="#fff" opacity=".25"><circle cx="165" cy="98" r="4"/><circle cx="205" cy="145" r="3"/><circle cx="1010" cy="190" r="3"/></g></svg>`;
  }
  function elephantHeroSvg(){
    const m=META['2026-09-29'];
    const elephant=(x,flip=1)=>`<g transform="translate(${x} 130) scale(${flip} 1)" filter="url(#grain)"><ellipse cx="0" cy="155" rx="145" ry="118" fill="#77756f"/><circle cx="78" cy="92" r="84" fill="#85827b"/><ellipse cx="30" cy="90" rx="58" ry="88" fill="#696a65"/><ellipse cx="95" cy="88" rx="7" ry="8" fill="#1d2321"/><path d="M125 126 Q177 177 142 260" stroke="#7f7c75" stroke-width="38" fill="none" stroke-linecap="round"/><path d="M-88 225 V340 M55 235 V340" stroke="#696b66" stroke-width="38" stroke-linecap="round"/><path d="M-126 115 Q-184 102 -165 180 Q-128 224 -66 174Z" fill="#8e8880" opacity=".9"/></g>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 480"><title>9/29 大象紀念日主題</title>${defs(m.a,m.b)}<rect width="1200" height="480" fill="url(#bg)"/><circle cx="975" cy="82" r="68" fill="url(#sun)" opacity=".82"/><path d="M0 355 Q220 245 460 342 T860 334 T1200 330 V480 H0Z" fill="#6e805c" opacity=".28"/>${elephant(370,1)}${elephant(830,-1)}<path d="M510 245 C532 163 585 145 600 220 C615 145 668 163 690 245" stroke="#7f7c75" stroke-width="36" fill="none" stroke-linecap="round"/><path d="M510 245 C525 320 575 345 600 365 C625 345 675 320 690 245" stroke="#7f7c75" stroke-width="36" fill="none" stroke-linecap="round"/><g fill="#fff7db" opacity=".45"><circle cx="560" cy="94" r="4"/><circle cx="640" cy="108" r="3"/><circle cx="1030" cy="180" r="4"/></g></svg>`;
  }
  function monkeyJumpSvg(){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500">${defs('#7b6256','#b3927d')}<g transform="translate(250 250)" filter="url(#grain)"><ellipse cy="95" rx="125" ry="145" fill="#645049"/><circle cy="-70" r="118" fill="#705a50"/><ellipse cy="-50" rx="80" ry="76" fill="#c6a79a"/><circle cx="-31" cy="-64" r="12" fill="#171918"/><circle cx="31" cy="-64" r="12" fill="#171918"/><ellipse cy="-30" rx="17" ry="12" fill="#795b50"/><path d="M-35 0 Q0 25 38 -2" stroke="#5b4038" stroke-width="9" fill="none" stroke-linecap="round"/><circle cx="-105" cy="-64" r="35" fill="#8b6c60"/><circle cx="105" cy="-64" r="35" fill="#8b6c60"/><path d="M-98 115 Q-190 185 -225 255 M98 115 Q190 185 225 255" stroke="#5a4640" stroke-width="42" fill="none" stroke-linecap="round"/></g></svg>`;}
  function elephantTouchSvg(){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 520">${defs('#77756f','#aaa59b')}<g transform="translate(300 245)" filter="url(#grain)"><ellipse cy="35" rx="210" ry="188" fill="#7e7b74"/><ellipse cx="-175" cy="10" rx="90" ry="145" fill="#908a82"/><ellipse cx="175" cy="10" rx="90" ry="145" fill="#908a82"/><circle cx="-62" cy="-40" r="13" fill="#151918"/><circle cx="62" cy="-40" r="13" fill="#151918"/><path d="M0 35 Q35 145 12 330" stroke="#858179" stroke-width="68" fill="none" stroke-linecap="round"/><ellipse cx="12" cy="335" rx="46" ry="32" fill="#8f8a81"/><ellipse cx="-2" cy="336" rx="8" ry="6" fill="#615e59"/><ellipse cx="28" cy="336" rx="8" ry="6" fill="#615e59"/></g></svg>`;}

  function svgFor(date,variant){if(date==='2026-09-29'&&variant==='monkey')return monkeyHeroSvg();if(date==='2026-09-29'&&variant==='elephant')return elephantHeroSvg();return normalSvg(date);}
  function overlaySvg(kind){return kind==='monkey'?monkeyJumpSvg():elephantTouchSvg();}

  async function cacheSvg(key,svg){
    if(!('caches' in window)||!svg)return dataUrl(svg);
    try{const cache=await caches.open(HERO_CACHE);const url=new URL(virtualUrl(key),location.href).href;const req=new Request(url,{method:'GET'});if(!(await cache.match(req)))await cache.put(req,new Response(svg,{headers:{'Content-Type':'image/svg+xml;charset=utf-8','Cache-Control':'public,max-age=31536000,immutable'}}));return navigator.serviceWorker?.controller?virtualUrl(key):dataUrl(svg);}catch(e){return dataUrl(svg);}
  }
  async function prime(date,variant='default'){if(!inTrip(date))return null;const key=keyFor(date,variant);const svg=svgFor(date,variant);return {key,url:await cacheSvg(key,svg),svg};}
  async function primeOverlay(kind){const key=`2026-09-29-${kind}-interaction-v${HERO_VERSION}`;const svg=overlaySvg(kind);return {key,url:await cacheSvg(key,svg),svg};}
  async function primePriority(date){
    if(!inTrip(date))return;
    const variant=variantFor(date);await prime(date,variant);
    const tomorrow=nextDate(date);if(inTrip(tomorrow))await prime(tomorrow,variantFor(tomorrow));
    if(date==='2026-09-29'){await Promise.all([prime(date,'monkey'),prime(date,'elephant'),primeOverlay('monkey'),primeOverlay('elephant')]);}
  }

  function addStyles(){
    if(document.getElementById('cm-hero-surprise-style'))return;
    const s=document.createElement('style');s.id='cm-hero-surprise-style';s.textContent=`
      .cm-daily-hero{position:relative;height:clamp(152px,22vw,190px);border-radius:18px;overflow:hidden;margin:2px 0 14px;background:rgba(255,255,255,.12);isolation:isolate}
      .cm-daily-hero img.cm-hero-img{display:block;width:100%;height:100%;object-fit:cover;object-position:center;user-select:none;-webkit-user-drag:none}
      .cm-daily-hero.interactive{cursor:pointer}.cm-daily-hero.interactive:active{transform:scale(.995)}
      .cm-hero-caption{position:absolute;left:12px;right:12px;bottom:10px;z-index:3;color:#fff;text-shadow:0 2px 12px rgba(0,0,0,.55);font-weight:800;font-size:13px;line-height:1.35;pointer-events:none}.cm-hero-caption small{display:block;font-size:11px;font-weight:650;opacity:.9;margin-top:2px}
      .cm-hero-shade{position:absolute;inset:45% 0 0;background:linear-gradient(transparent,rgba(17,24,39,.54));z-index:2;pointer-events:none}
      .cm-surprise-actor{position:absolute;left:50%;top:48%;width:min(58%,330px);height:auto;z-index:8;pointer-events:none;opacity:0;transform:translate(-50%,-50%) scale(.32);filter:drop-shadow(0 18px 20px rgba(0,0,0,.24))}
      .cm-surprise-actor.monkey.go{animation:cmMonkeyJump 1.18s cubic-bezier(.18,.72,.18,1) both}.cm-surprise-actor.monkey.short{animation:cmMonkeyJumpShort .72s ease-out both}
      .cm-surprise-actor.elephant.go{width:min(66%,380px);animation:cmElephantTouch 2.05s cubic-bezier(.22,.58,.24,1) both}
      @keyframes cmMonkeyJump{0%{opacity:0;transform:translate(-50%,-42%) scale(.28) rotate(-6deg)}15%{opacity:1}58%{opacity:1;transform:translate(-50%,-52%) scale(1.18) rotate(2deg)}78%{opacity:1;transform:translate(-50%,-50%) scale(1.62)}100%{opacity:0;transform:translate(-50%,-47%) scale(1.78)}}
      @keyframes cmMonkeyJumpShort{0%{opacity:0;transform:translate(-50%,-45%) scale(.55)}28%{opacity:1}72%{opacity:1;transform:translate(-50%,-50%) scale(1.12)}100%{opacity:0;transform:translate(-50%,-49%) scale(1.2)}}
      @keyframes cmElephantTouch{0%{opacity:0;transform:translate(-50%,-48%) scale(.45)}18%{opacity:.96}62%{opacity:1;transform:translate(-50%,-48%) scale(.78)}78%{opacity:1;transform:translate(-50%,-43%) scale(1.08)}88%{opacity:1;transform:translate(-50%,-42%) scale(1.14)}100%{opacity:0;transform:translate(-50%,-42%) scale(1.16)}}
      .cm-heart-ripple{position:absolute;left:50%;top:63%;z-index:11;transform:translate(-50%,-50%) scale(.2);font-family:Georgia,serif;font-size:76px;line-height:1;color:rgba(255,246,230,.92);text-shadow:0 0 9px rgba(255,205,190,.6);pointer-events:none;animation:cmHeartRipple .82s ease-out forwards}.cm-heart-ripple.r2{animation-delay:.12s}.cm-heart-ripple.r3{animation-delay:.24s}
      @keyframes cmHeartRipple{0%{opacity:.9;transform:translate(-50%,-50%) scale(.18)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.65)}}
      @media(prefers-reduced-motion:reduce){.cm-surprise-actor.monkey.go,.cm-surprise-actor.monkey.short,.cm-surprise-actor.elephant.go{animation:cmReduced .55s ease both}@keyframes cmReduced{0%{opacity:0}35%{opacity:.95}100%{opacity:0}}.cm-heart-ripple{animation-duration:.45s}}
    `;document.head.appendChild(s);
  }

  function ensureHeroBox(){
    const host=document.querySelector('.hero-main');if(!host)return null;let box=document.getElementById('cmDailyHero');if(!box){box=document.createElement('div');box.id='cmDailyHero';box.className='cm-daily-hero';box.innerHTML=`<img class="cm-hero-img" alt=""><div class="cm-hero-shade"></div><div class="cm-hero-caption"></div>`;const chip=document.getElementById('cmThemeChip');if(chip)chip.insertAdjacentElement('afterend',box);else host.prepend(box);box.addEventListener('click',onHeroClick);}return box;
  }
  function caption(date,variant){
    const m=META[date];if(!m)return '';
    let line=m.line;
    if(date==='2026-09-29'&&variant==='monkey')line='今天，先用最可愛的方式開始。';
    if(date==='2026-09-29'&&variant==='elephant')line=identity()==='angel'?'午後開始，讓今天再多一點溫柔。':'89 個月，今天再多一點溫柔。';
    return `<span>${esc(line)}</span>${date==='2026-09-29'?'<small>2019.04.29 → 2026.09.29</small>':''}`;
  }

  async function applyHero(silent=true){
    const date=activeDate();const box=ensureHeroBox();if(!box)return;
    if(!inTrip(date)){box.style.display='none';activeKey='';return;}
    box.style.display='block';const variant=variantFor(date);const key=keyFor(date,variant);if(key===activeKey&&box.querySelector('.cm-hero-img')?.src)return;
    const art=await prime(date,variant);if(!art)return;activeKey=key;const img=box.querySelector('.cm-hero-img');img.src=art.url;img.alt=`${META[date]?.title||date} 主題圖`;box.querySelector('.cm-hero-caption').innerHTML=caption(date,variant);box.dataset.date=date;box.dataset.variant=variant;box.classList.toggle('interactive',date==='2026-09-29');
    primePriority(date).catch(()=>{});
  }

  function getAudio(){if(audioCtx)return audioCtx;const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;audioCtx=new A();return audioCtx;}
  function noiseBuffer(ctx,duration=.5){const len=Math.max(1,Math.floor(ctx.sampleRate*duration));const b=ctx.createBuffer(1,len,ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*(1-i/len);return b;}
  function playMonkey(full=true){
    const ctx=getAudio();if(!ctx)return;if(ctx.state==='suspended')ctx.resume();const t=ctx.currentTime+.02;
    const whoosh=ctx.createBufferSource(),wf=ctx.createBiquadFilter(),wg=ctx.createGain();whoosh.buffer=noiseBuffer(ctx,.48);wf.type='bandpass';wf.frequency.setValueAtTime(900,t);wf.frequency.exponentialRampToValueAtTime(2200,t+.32);wg.gain.setValueAtTime(.001,t);wg.gain.exponentialRampToValueAtTime(full?.18:.09,t+.05);wg.gain.exponentialRampToValueAtTime(.001,t+.46);whoosh.connect(wf).connect(wg).connect(ctx.destination);whoosh.start(t);
    const osc=ctx.createOscillator(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();osc.type='sawtooth';osc.frequency.setValueAtTime(full?1050:820,t+.08);osc.frequency.exponentialRampToValueAtTime(full?430:520,t+(full?.42:.28));filter.type='bandpass';filter.Q.value=3.2;filter.frequency.setValueAtTime(1450,t);gain.gain.setValueAtTime(.001,t);gain.gain.exponentialRampToValueAtTime(full?.22:.1,t+.105);gain.gain.exponentialRampToValueAtTime(.001,t+(full?.48:.33));osc.connect(filter).connect(gain).connect(ctx.destination);osc.start(t+.06);osc.stop(t+.55);
    if(full){const low=ctx.createOscillator(),lg=ctx.createGain();low.type='square';low.frequency.setValueAtTime(210,t+.12);low.frequency.exponentialRampToValueAtTime(135,t+.5);lg.gain.setValueAtTime(.001,t+.12);lg.gain.exponentialRampToValueAtTime(.07,t+.18);lg.gain.exponentialRampToValueAtTime(.001,t+.58);low.connect(lg).connect(ctx.destination);low.start(t+.12);low.stop(t+.62);}
  }
  function playElephant(){
    const ctx=getAudio();if(!ctx)return;if(ctx.state==='suspended')ctx.resume();const t=ctx.currentTime+.9;const low=ctx.createOscillator(),lg=ctx.createGain();low.type='sine';low.frequency.setValueAtTime(118,t);low.frequency.exponentialRampToValueAtTime(82,t+.38);lg.gain.setValueAtTime(.001,t);lg.gain.exponentialRampToValueAtTime(.11,t+.04);lg.gain.exponentialRampToValueAtTime(.001,t+.55);low.connect(lg).connect(ctx.destination);low.start(t);low.stop(t+.6);
    [392,523.25,659.25].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=f;const st=t+.16+i*.055;g.gain.setValueAtTime(.001,st);g.gain.exponentialRampToValueAtTime(.055/(i+1),st+.03);g.gain.exponentialRampToValueAtTime(.001,st+.82);o.connect(g).connect(ctx.destination);o.start(st);o.stop(st+.9);});
  }

  async function onHeroClick(){
    const box=document.getElementById('cmDailyHero');if(!box||box.dataset.date!=='2026-09-29'||box.dataset.busy==='1')return;const kind=box.dataset.variant;box.dataset.busy='1';const art=await primeOverlay(kind);const actor=document.createElement('img');actor.className=`cm-surprise-actor ${kind}`;actor.alt='';actor.src=art.url;box.appendChild(actor);
    if(kind==='monkey'){
      const full=sessionStorage.getItem('cm26_monkey_surprise_seen')!=='1';sessionStorage.setItem('cm26_monkey_surprise_seen','1');requestAnimationFrame(()=>actor.classList.add(full?'go':'short'));setTimeout(()=>playMonkey(full),full?90:40);setTimeout(()=>{actor.remove();box.dataset.busy='0';},full?1350:850);
    }else{
      requestAnimationFrame(()=>actor.classList.add('go'));playElephant();setTimeout(()=>heartRipples(box),1120);setTimeout(()=>{actor.remove();box.dataset.busy='0';},2200);
    }
  }
  function heartRipples(box){for(let i=0;i<3;i++){const h=document.createElement('span');h.className=`cm-heart-ripple ${i===1?'r2':i===2?'r3':''}`;h.textContent='♡';box.appendChild(h);setTimeout(()=>h.remove(),1200);}}

  function wrapTheme(){
    const fn=window.applyDailyTheme;if(typeof fn==='function'&&!fn.__heroWrapped){const wrapped=function(...args){const out=fn.apply(this,args);setTimeout(()=>applyHero(true),40);return out;};wrapped.__heroWrapped=true;window.applyDailyTheme=wrapped;}
    ['refreshAuthenticatedUI','renderHome','showPage'].forEach(name=>{const f=window[name];if(typeof f!=='function'||f.__heroRefreshWrapped)return;const wrapped=function(...args){const out=f.apply(this,args);setTimeout(()=>applyHero(true),70);return out;};wrapped.__heroRefreshWrapped=true;window[name]=wrapped;});
  }
  function init(){addStyles();wrapTheme();applyHero(true);primePriority(activeDate()).catch(()=>{});clearInterval(heroTimer);heroTimer=setInterval(()=>applyHero(true),30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)applyHero(true);});const mo=new MutationObserver(()=>{if(!document.getElementById('cmDailyHero')&&document.querySelector('.hero-main'))applyHero(true);});mo.observe(document.body,{childList:true,subtree:true});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
