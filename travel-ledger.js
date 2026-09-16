(()=>{
  'use strict';

  const DEFAULT_PUSH_API='https://striking-determination-production-6964.up.railway.app';
  const LEDGER_KEY='cm26_ledger_v1';
  const LEDGER_LAST_SYNC='cm26_ledger_last_sync';
  const SHARED_SYNC_KEY='cm26_notes_sync_key';
  const TRIP_START='2026-09-23';
  const TRIP_END='2026-10-03';
  let statsRange='today';
  let editingId=null;

  const CATEGORY_ITEMS={
    '餐飲':['Neng Roasted Pork','Joost Smoothies','CHOR POTCHANA','Meena Rice Based Cuisine','ISĀ ROTI','Mana’s Best Mango Sticky Rice','Khao Soi Maesai','林老五','Aoyjai Kitchen','B Samcook','Roti Pa Dae','Mooyim JimJum','Baan Landai','Banana Rotee','Rich Homemade Cake','Guay Jub','Magic Brew','97% Cocoa','Akha Ama','CHARLIE THAI TEA x KAME KAFE','其他'],
    '交通':['Grab','Bolt','雙條車','公車','機場接送','包車／接駁','其他'],
    '按摩':['Makkha Colonial Gardens','Sense Garden Massage','Antique Massage','Lila Thai Massage','Fah Lanna Spa - Old City','Makkha Rachadamnoen','Nimman House Massage','Calm Massage Somphet','Cheeva Spa','Zira Spa','Kiyora Spa','DIVANA','Let’s Relax','其他'],
    '購物':['Warorot Market','Jing Jai Market','Jing Jai Vintage Market','Nimman','Panpuri','Journal','Tangerine6391 草編鞋','blackOut 防水涼鞋','Playworks','fimue','Copenn','其他'],
    '門票／活動':['Kerchor Elephant Eco Park','Skyline Adventure','Wat Chedi Luang','寺廟捐獻／門票','其他'],
    '住宿':['Chai Lai Orchid','Himku Hotel','其他'],
    '其他':['其他']
  };
  const INCOME_ITEMS=['退款','共同分攤','信用卡回饋','現金回補','其他'];
  const DATE_PRIORITY={
    '2026-09-23':{'交通':['機場接送'],'住宿':['Chai Lai Orchid']},
    '2026-09-24':{'門票／活動':['Kerchor Elephant Eco Park'],'住宿':['Himku Hotel'],'餐飲':['Neng Roasted Pork','Joost Smoothies'],'按摩':['Makkha Colonial Gardens']},
    '2026-09-25':{'門票／活動':['Skyline Adventure'],'餐飲':['CHOR POTCHANA','Neng Roasted Pork','Joost Smoothies'],'按摩':['Sense Garden Massage']},
    '2026-09-26':{'餐飲':['Meena Rice Based Cuisine','ISĀ ROTI'],'按摩':['Antique Massage']},
    '2026-09-27':{'購物':['Jing Jai Market'],'餐飲':['Mana’s Best Mango Sticky Rice'],'按摩':['Lila Thai Massage']},
    '2026-09-28':{'購物':['Warorot Market'],'餐飲':['Guay Jub','Rich Homemade Cake'],'按摩':['Fah Lanna Spa - Old City']},
    '2026-09-29':{'餐飲':['Khao Soi Maesai','Magic Brew','林老五','97% Cocoa','Akha Ama','Aoyjai Kitchen','ISĀ ROTI'],'按摩':['Makkha Rachadamnoen']},
    '2026-09-30':{'餐飲':['B Samcook','Roti Pa Dae'],'按摩':['Boontathong']},
    '2026-10-01':{'餐飲':['CHARLIE THAI TEA x KAME KAFE','Mooyim JimJum'],'購物':['Nimman','Playworks','fimue','Copenn'],'按摩':['Nimman House Massage']},
    '2026-10-02':{'購物':['Warorot Market','Jing Jai Vintage Market','Panpuri','Journal'],'餐飲':['Baan Landai','Banana Rotee'],'按摩':['Calm Massage Somphet']},
    '2026-10-03':{'購物':['Warorot Market']}
  };

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function uid(){return crypto.randomUUID?crypto.randomUUID():`x-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;}
  function currentIdentity(){try{return window.currentAuth?.()?.identity||null}catch(e){return null}}
  function identityLabel(id){return id==='richard'?'Richard':id==='angel'?'Angel':id==='admin'?'管理員':id==='shared'?'共同':id||'—';}
  function bangkokParts(){
    const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
    return Object.fromEntries(parts.map(x=>[x.type,x.value]));
  }
  function bangkokDate(){const p=bangkokParts();return `${p.year}-${p.month}-${p.day}`;}
  function bangkokTime(){const p=bangkokParts();return `${p.hour}:${p.minute}`;}
  function selectedDate(){try{return String(window.stateGet?.('selectedDate','')||'')}catch(e){return ''}}
  function activeTripDate(){
    const preview=new URLSearchParams(location.search).get('themeDate');
    if(preview&&preview>=TRIP_START&&preview<=TRIP_END)return preview;
    const now=bangkokDate();if(now>=TRIP_START&&now<=TRIP_END)return now;
    const s=selectedDate();return s>=TRIP_START&&s<=TRIP_END?s:TRIP_START;
  }
  function loadLedger(){try{const v=JSON.parse(localStorage.getItem(LEDGER_KEY)||'[]');return Array.isArray(v)?v:[]}catch(e){return []}}
  function saveLedger(v){localStorage.setItem(LEDGER_KEY,JSON.stringify(v));refreshAll();}
  function upsert(entry){const rows=loadLedger();const i=rows.findIndex(x=>x.id===entry.id);if(i>=0)rows[i]=entry;else rows.push(entry);saveLedger(rows);}
  function rowById(id){return loadLedger().find(x=>x.id===id)||null;}
  function fmt(v){const n=Number(v)||0;return new Intl.NumberFormat('zh-TW',{maximumFractionDigits:2}).format(n);}
  function fmtDateTime(iso){if(!iso)return '';try{return new Intl.DateTimeFormat('zh-TW',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(iso))}catch(e){return iso}}
  function entryLabel(r){return r.customItem||r.item||r.category||'其他';}
  function validRows(){return loadLedger().filter(x=>!x.deleted);}

  function sortItems(category,date,type){
    const base=type==='income'?[...INCOME_ITEMS]:[...(CATEGORY_ITEMS[category]||['其他'])];
    if(type==='income')return base;
    const priority=DATE_PRIORITY[date]?.[category]||[];
    const set=new Set(priority);
    return [...priority,...base.filter(x=>!set.has(x))];
  }

  function moneyTotals(rows,kind='expense'){
    const map={};
    for(const r of rows){if(r.type!==kind)continue;const c=r.currency||'THB';map[c]=(map[c]||0)+(Number(r.amount)||0);}
    return map;
  }
  function moneyHtml(map,empty='0 THB'){
    const keys=Object.keys(map);if(!keys.length)return empty;
    return keys.sort().map(k=>`${k} ${fmt(map[k])}`).join('<br>');
  }
  function textMoney(map,empty='0 THB'){const keys=Object.keys(map);return keys.length?keys.sort().map(k=>`${k} ${fmt(map[k])}`).join(' / '):empty;}
  function filterRange(rows,range,date=activeTripDate()){
    if(range==='today')return rows.filter(r=>r.date===date);
    if(range==='trip')return rows.filter(r=>r.date>=TRIP_START&&r.date<=TRIP_END);
    return rows;
  }
  function groupAmount(rows,key){
    const out={};
    for(const r of rows){if(r.type!=='expense')continue;const label=r[key]||'其他';out[label]??={};const cur=r.currency||'THB';out[label][cur]=(out[label][cur]||0)+(Number(r.amount)||0);}
    return out;
  }
  function cashThbBalance(rows){
    let total=0;
    for(const r of rows){
      if(r.type==='exchange'&&r.toCurrency==='THB')total+=Number(r.toAmount)||0;
      if(r.type==='expense'&&r.currency==='THB'&&r.method==='現金')total-=Number(r.amount)||0;
      if(r.type==='income'&&r.currency==='THB'&&r.method==='現金')total+=Number(r.amount)||0;
    }
    return total;
  }

  function addStyles(){
    if(document.getElementById('cm-ledger-style'))return;
    const s=document.createElement('style');s.id='cm-ledger-style';s.textContent=`
      .cm-note-fab{display:none!important}
      .cm-home-shortcuts{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:-4px 0 14px}
      .cm-home-shortcut{border:1px solid var(--border);background:var(--surface,#fff);border-radius:16px;padding:13px 12px;display:flex;align-items:center;gap:10px;text-align:left;cursor:pointer;box-shadow:var(--shadow)}
      .cm-home-shortcut .ico{font-size:25px}.cm-home-shortcut b{display:block;color:var(--navy)}.cm-home-shortcut small{display:block;color:var(--muted);margin-top:2px}
      .cm-ledger-home{margin:0 0 20px}.cm-ledger-summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.cm-ledger-kpi{padding:13px;border-radius:14px;background:var(--surface,#fff);border:1px solid var(--border)}.cm-ledger-kpi small{color:var(--muted);display:block}.cm-ledger-kpi strong{display:block;margin-top:5px;font-size:18px;color:var(--navy);line-height:1.35}.cm-ledger-home-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
      .cm-quick-fab-wrap{position:fixed;left:14px;bottom:78px;z-index:52;display:none;align-items:flex-start;flex-direction:column-reverse;gap:8px}.cm-quick-fab-wrap.show{display:flex}.cm-quick-fab{width:50px;height:50px;border:0;border-radius:50%;background:var(--navy,#17365d);color:#fff;font-size:26px;box-shadow:0 10px 30px rgba(16,24,40,.25);cursor:pointer;transition:transform .18s ease}.cm-quick-fab[aria-expanded="true"]{transform:rotate(45deg)}
      .cm-quick-menu{display:none;gap:7px;flex-direction:column}.cm-quick-menu.open{display:flex}.cm-quick-menu button{border:1px solid var(--border);background:#fff;border-radius:999px;padding:9px 12px;font-weight:800;box-shadow:0 7px 22px rgba(16,24,40,.16);cursor:pointer;text-align:left;white-space:nowrap}
      .cm-ledger-layer{position:fixed;inset:0;background:rgba(16,24,40,.5);z-index:110;display:none;align-items:flex-end;justify-content:center}.cm-ledger-layer.show{display:flex}.cm-ledger-sheet{width:min(760px,100%);max-height:91vh;overflow:auto;background:var(--surface,#fff);border-radius:24px 24px 0 0;padding:18px 18px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -20px 70px rgba(16,24,40,.2)}.cm-ledger-sheet.wide{width:min(980px,100%)}
      .cm-ledger-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px}.cm-ledger-head h2{margin:0;font-size:20px}.cm-ledger-head .sub{margin-top:3px}.cm-ledger-close{border:0;background:#f2f4f7;width:38px;height:38px;border-radius:50%;font-size:21px;cursor:pointer}
      .cm-ledger-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.cm-ledger-field{margin:7px 0}.cm-ledger-field label{display:block;font-size:12px;font-weight:800;color:var(--muted);margin-bottom:5px}.cm-ledger-field input,.cm-ledger-field select,.cm-ledger-field textarea{width:100%;border:1px solid var(--border);border-radius:12px;background:#fff;color:#172033;padding:10px 11px;font:inherit;outline:none}.cm-ledger-field textarea{min-height:80px;resize:vertical}.cm-ledger-field input:focus,.cm-ledger-field select:focus,.cm-ledger-field textarea:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(47,117,181,.1)}
      .cm-ledger-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.cm-ledger-actions button,.cm-ledger-toolbar button{border:0;border-radius:11px;padding:10px 13px;font-weight:800;cursor:pointer}.cm-ledger-primary{background:var(--navy);color:#fff}.cm-ledger-soft{background:var(--blue-soft);color:var(--navy)}.cm-ledger-danger{background:#fee4e2;color:#b42318}.cm-ledger-toolbar{display:flex;gap:7px;flex-wrap:wrap;margin:4px 0 12px}.cm-ledger-toolbar button{background:#fff;border:1px solid var(--border);padding:8px 11px;border-radius:999px}.cm-ledger-toolbar button.active{background:var(--navy);color:#fff;border-color:var(--navy)}
      .cm-ledger-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}.cm-ledger-stat{border:1px solid var(--border);border-radius:14px;padding:12px;background:#fff}.cm-ledger-stat small{display:block;color:var(--muted)}.cm-ledger-stat strong{display:block;color:var(--navy);margin-top:4px;line-height:1.4}.cm-ledger-section{margin:16px 0}.cm-ledger-section h3{margin:0 0 8px;font-size:16px}.cm-ledger-bars{display:grid;gap:7px}.cm-ledger-bar{display:grid;grid-template-columns:minmax(90px,1fr) minmax(120px,2fr) auto;gap:8px;align-items:center;font-size:12px}.cm-ledger-bar-track{height:8px;background:#edf2f7;border-radius:999px;overflow:hidden}.cm-ledger-bar-track i{display:block;height:100%;background:var(--blue);border-radius:999px}.cm-ledger-list{display:grid;gap:8px}.cm-ledger-row{border:1px solid var(--border);border-radius:13px;padding:11px;background:#fff;display:grid;grid-template-columns:1fr auto;gap:8px}.cm-ledger-row-title{font-weight:850}.cm-ledger-row-meta{font-size:11px;color:var(--muted);margin-top:3px}.cm-ledger-row-amt{text-align:right;font-weight:900;color:var(--navy)}.cm-ledger-row-actions{display:flex;gap:5px;justify-content:flex-end;margin-top:6px}.cm-ledger-row-actions button{border:0;border-radius:8px;background:#f2f4f7;padding:5px 8px;font-size:11px;cursor:pointer}
      .cm-ledger-empty{text-align:center;color:var(--muted);padding:24px 10px}.cm-ledger-sync{padding:10px 12px;border:1px solid var(--border);border-radius:13px;background:var(--blue-soft);display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px}.cm-ledger-sync small{color:var(--muted)}
      .cm-print-root{display:none}
      @media print{body.cm-print-only>*:not(.cm-print-root){display:none!important}.cm-print-root{display:block!important;padding:0 16px;color:#111}.cm-print-root table{width:100%;border-collapse:collapse}.cm-print-root th,.cm-print-root td{border:1px solid #bbb;padding:7px;min-width:0;color:#111;background:#fff;position:static}.cm-print-root h1,.cm-print-root h2{color:#111}}
      @media(max-width:700px){.cm-home-shortcuts{grid-template-columns:1fr 1fr 1fr}.cm-home-shortcut{padding:11px 8px;display:block;text-align:center}.cm-home-shortcut small{display:none}.cm-ledger-summary-grid,.cm-ledger-stats{grid-template-columns:1fr 1fr}.cm-ledger-grid{grid-template-columns:1fr}.cm-ledger-bar{grid-template-columns:82px 1fr auto}.cm-ledger-sheet{padding-left:14px;padding-right:14px}}
      @media(max-width:380px){.cm-home-shortcut b{font-size:12px}.cm-home-shortcut .ico{font-size:22px}.cm-ledger-stats{grid-template-columns:1fr 1fr}}
    `;document.head.appendChild(s);
  }

  function ensureQuickFab(){
    if(document.getElementById('cmQuickFabWrap'))return;
    const wrap=document.createElement('div');wrap.id='cmQuickFabWrap';wrap.className='cm-quick-fab-wrap';wrap.innerHTML=`<button id="cmQuickFab" class="cm-quick-fab" type="button" aria-label="快速功能" aria-expanded="false">＋</button><div id="cmQuickMenu" class="cm-quick-menu"><button type="button" data-quick="expense">💰 快速記帳</button><button type="button" data-quick="stats">📊 收支統計</button><button type="button" data-quick="notes">📝 旅行筆記</button></div>`;document.body.appendChild(wrap);
    const fab=wrap.querySelector('#cmQuickFab'),menu=wrap.querySelector('#cmQuickMenu');
    fab.addEventListener('click',()=>{const open=!menu.classList.contains('open');menu.classList.toggle('open',open);fab.setAttribute('aria-expanded',String(open));});
    wrap.querySelector('[data-quick="expense"]').addEventListener('click',()=>{closeQuick();openEntry();});
    wrap.querySelector('[data-quick="stats"]').addEventListener('click',()=>{closeQuick();openStats('today');});
    wrap.querySelector('[data-quick="notes"]').addEventListener('click',()=>{closeQuick();document.getElementById('cmNoteFab')?.click()||document.getElementById('cmNotesMoreBtn')?.click();});
    document.addEventListener('click',e=>{if(!wrap.contains(e.target))closeQuick();});
    refreshFabVisibility();
  }
  function closeQuick(){document.getElementById('cmQuickMenu')?.classList.remove('open');const f=document.getElementById('cmQuickFab');if(f)f.setAttribute('aria-expanded','false');}
  function refreshFabVisibility(){document.getElementById('cmQuickFabWrap')?.classList.toggle('show',!!currentIdentity());}

  function ensureHome(){
    const home=document.getElementById('home');if(!home)return;
    const hero=home.querySelector('.hero');if(!hero)return;
    let quick=document.getElementById('cmHomeShortcuts');
    if(!quick){quick=document.createElement('div');quick.id='cmHomeShortcuts';quick.className='cm-home-shortcuts';quick.innerHTML=`<button class="cm-home-shortcut" type="button" data-home-expense><span class="ico">💰</span><span><b>快速記帳</b><small>立即新增一筆</small></span></button><button class="cm-home-shortcut" type="button" data-home-stats><span class="ico">📊</span><span><b>收支統計</b><small>看目前花多少</small></span></button><button class="cm-home-shortcut" type="button" data-home-notes><span class="ico">📝</span><span><b>旅行筆記</b><small>記下今天</small></span></button>`;hero.insertAdjacentElement('afterend',quick);quick.querySelector('[data-home-expense]').addEventListener('click',()=>openEntry());quick.querySelector('[data-home-stats]').addEventListener('click',()=>openStats('today'));quick.querySelector('[data-home-notes]').addEventListener('click',()=>document.getElementById('cmNoteFab')?.click()||document.getElementById('cmNotesMoreBtn')?.click());}
    let section=document.getElementById('cmLedgerHome');
    if(!section){section=document.createElement('section');section.id='cmLedgerHome';section.className='cm-ledger-home card';quick.insertAdjacentElement('afterend',section);}
    renderHomeSummary();
  }

  function renderHomeSummary(){
    const box=document.getElementById('cmLedgerHome');if(!box)return;
    const d=activeTripDate();const rows=validRows().filter(r=>r.date===d);const ex=moneyTotals(rows,'expense'),inc=moneyTotals(rows,'income');const count=rows.filter(r=>r.type!=='exchange').length;const cash=cashThbBalance(validRows().filter(r=>r.date<=d));
    box.innerHTML=`<div class="section-head" style="margin-bottom:10px"><div><h3 style="margin:0">💰 ${esc(d)} 今日花費</h3><div class="sub">現場快速記帳・目前 ${count} 筆</div></div></div><div class="cm-ledger-summary-grid"><div class="cm-ledger-kpi"><small>今日支出</small><strong>${moneyHtml(ex)}</strong></div><div class="cm-ledger-kpi"><small>今日收入</small><strong>${moneyHtml(inc)}</strong></div><div class="cm-ledger-kpi"><small>THB 現金估算</small><strong>${fmt(cash)} THB</strong></div><div class="cm-ledger-kpi"><small>已記錄</small><strong>${count} 筆</strong></div></div><div class="cm-ledger-home-actions"><button class="btn" type="button" data-ledger-add>＋ 記一筆</button><button class="btn secondary" type="button" data-ledger-stats>查看明細／收支統計</button></div>`;
    box.querySelector('[data-ledger-add]').addEventListener('click',()=>openEntry());box.querySelector('[data-ledger-stats]').addEventListener('click',()=>openStats('today'));
  }

  function ensureEntryLayer(){
    if(document.getElementById('cmLedgerEntryLayer'))return;
    const layer=document.createElement('div');layer.id='cmLedgerEntryLayer';layer.className='cm-ledger-layer';layer.innerHTML=`<div class="cm-ledger-sheet" role="dialog" aria-modal="true" aria-label="快速記帳"><div class="cm-ledger-head"><div><h2 id="cmLedgerEntryTitle">💰 快速記帳</h2><div class="sub">日期與時間會自動帶入，項目會優先顯示當天行程。</div></div><button class="cm-ledger-close" type="button" data-ledger-close>×</button></div><div class="cm-ledger-grid"><div class="cm-ledger-field"><label>類型</label><select id="cmTxType"><option value="expense">支出</option><option value="income">收入</option><option value="exchange">換匯</option></select></div><div class="cm-ledger-field"><label>日期</label><input id="cmTxDate" type="date"></div><div class="cm-ledger-field"><label>時間</label><input id="cmTxTime" type="time"></div><div class="cm-ledger-field" data-normal><label>金額</label><input id="cmTxAmount" type="number" min="0" step="0.01" inputmode="decimal" placeholder="例如 350"></div><div class="cm-ledger-field" data-normal><label>幣別</label><select id="cmTxCurrency"><option>THB</option><option>TWD</option></select></div><div class="cm-ledger-field" data-normal><label>類別</label><select id="cmTxCategory"></select></div><div class="cm-ledger-field" data-normal id="cmTxItemField"><label>項目</label><select id="cmTxItem"></select></div><div class="cm-ledger-field" data-normal id="cmTxCustomField" style="display:none"><label>其他項目</label><input id="cmTxCustom" maxlength="80" placeholder="自行輸入"></div><div class="cm-ledger-field" data-normal><label>付款／收款人</label><select id="cmTxPayer"><option value="richard">Richard</option><option value="angel">Angel</option><option value="shared">共同</option></select></div><div class="cm-ledger-field" data-normal><label>付款方式</label><select id="cmTxMethod"><option>現金</option><option>信用卡</option><option>Apple Pay</option><option>TAGTHAi Easy Pay</option><option>轉帳</option><option>其他</option></select></div><div class="cm-ledger-field" data-exchange style="display:none"><label>換出金額</label><input id="cmTxFromAmount" type="number" min="0" step="0.01" inputmode="decimal"></div><div class="cm-ledger-field" data-exchange style="display:none"><label>換出幣別</label><select id="cmTxFromCurrency"><option>TWD</option><option>THB</option></select></div><div class="cm-ledger-field" data-exchange style="display:none"><label>換入金額</label><input id="cmTxToAmount" type="number" min="0" step="0.01" inputmode="decimal"></div><div class="cm-ledger-field" data-exchange style="display:none"><label>換入幣別</label><select id="cmTxToCurrency"><option>THB</option><option>TWD</option></select></div></div><div class="cm-ledger-field"><label>備註</label><textarea id="cmTxNote" maxlength="500" placeholder="例如：Meena 午餐、Grab 回飯店…"></textarea></div><div id="cmTxError" class="sub" style="color:#b42318;min-height:18px"></div><div class="cm-ledger-actions"><button id="cmTxSave" class="cm-ledger-primary" type="button">儲存</button><button id="cmTxDelete" class="cm-ledger-danger" type="button" style="display:none">刪除</button><button id="cmTxOpenStats" class="cm-ledger-soft" type="button">收支統計</button></div></div>`;document.body.appendChild(layer);
    layer.addEventListener('click',e=>{if(e.target===layer||e.target.closest('[data-ledger-close]'))closeEntry();});
    layer.querySelector('#cmTxType').addEventListener('change',updateEntryFields);layer.querySelector('#cmTxDate').addEventListener('change',()=>{fillCategoryItems();});layer.querySelector('#cmTxCategory').addEventListener('change',fillItemOptions);layer.querySelector('#cmTxItem').addEventListener('change',toggleCustomField);layer.querySelector('#cmTxSave').addEventListener('click',saveEntry);layer.querySelector('#cmTxDelete').addEventListener('click',deleteEditing);layer.querySelector('#cmTxOpenStats').addEventListener('click',()=>{closeEntry();openStats('today');});
  }

  function openEntry(id=null){
    if(!currentIdentity()){alert('請先登入');return;}ensureEntryLayer();editingId=id;const r=id?rowById(id):null;const d=r?.date||activeTripDate();
    document.getElementById('cmLedgerEntryTitle').textContent=r?'✏️ 編輯記帳':'💰 快速記帳';document.getElementById('cmTxType').value=r?.type||'expense';document.getElementById('cmTxDate').value=d;document.getElementById('cmTxTime').value=r?.time||bangkokTime();document.getElementById('cmTxAmount').value=r?.amount??'';document.getElementById('cmTxCurrency').value=r?.currency||'THB';document.getElementById('cmTxPayer').value=r?.payer||((currentIdentity()==='angel')?'angel':'richard');document.getElementById('cmTxMethod').value=r?.method||'現金';document.getElementById('cmTxNote').value=r?.note||'';document.getElementById('cmTxFromAmount').value=r?.fromAmount??'';document.getElementById('cmTxFromCurrency').value=r?.fromCurrency||'TWD';document.getElementById('cmTxToAmount').value=r?.toAmount??'';document.getElementById('cmTxToCurrency').value=r?.toCurrency||'THB';document.getElementById('cmTxError').textContent='';
    fillCategoryItems(r);updateEntryFields();document.getElementById('cmTxDelete').style.display=r?'inline-block':'none';document.getElementById('cmLedgerEntryLayer').classList.add('show');setTimeout(()=>document.getElementById(r?.type==='exchange'?'cmTxFromAmount':'cmTxAmount')?.focus(),80);
  }
  function closeEntry(){document.getElementById('cmLedgerEntryLayer')?.classList.remove('show');editingId=null;}
  function updateEntryFields(){const exchange=document.getElementById('cmTxType').value==='exchange';document.querySelectorAll('#cmLedgerEntryLayer [data-normal]').forEach(x=>x.style.display=exchange?'none':'');document.querySelectorAll('#cmLedgerEntryLayer [data-exchange]').forEach(x=>x.style.display=exchange?'':'none');if(!exchange)fillCategoryItems(rowById(editingId));}
  function fillCategoryItems(existing=null){
    const type=document.getElementById('cmTxType')?.value||existing?.type||'expense';const c=document.getElementById('cmTxCategory');if(!c)return;
    const cats=type==='income'?['收入']:Object.keys(CATEGORY_ITEMS);c.innerHTML=cats.map(x=>`<option>${esc(x)}</option>`).join('');c.value=existing?.category&&cats.includes(existing.category)?existing.category:cats[0];fillItemOptions(existing);
  }
  function fillItemOptions(existing=null){
    const type=document.getElementById('cmTxType')?.value||'expense';const date=document.getElementById('cmTxDate')?.value||activeTripDate();const category=document.getElementById('cmTxCategory')?.value||'其他';const item=document.getElementById('cmTxItem');if(!item)return;const items=sortItems(category,date,type);item.innerHTML=items.map(x=>`<option>${esc(x)}</option>`).join('');item.value=existing?.item&&items.includes(existing.item)?existing.item:items[0];document.getElementById('cmTxCustom').value=existing?.customItem||'';toggleCustomField();
  }
  function toggleCustomField(){const c=document.getElementById('cmTxCategory')?.value;const i=document.getElementById('cmTxItem')?.value;const show=c==='其他'||i==='其他';const f=document.getElementById('cmTxCustomField');if(f)f.style.display=show?'':'none';}
  function saveEntry(){
    const identity=currentIdentity();if(!identity)return;const type=document.getElementById('cmTxType').value;const date=document.getElementById('cmTxDate').value;const time=document.getElementById('cmTxTime').value||'12:00';const old=editingId?rowById(editingId):null;const now=new Date().toISOString();const error=document.getElementById('cmTxError');
    if(!date){error.textContent='請選擇日期。';return;}
    let entry={id:old?.id||uid(),author:old?.author||identity,type,date,time,createdAt:old?.createdAt||now,updatedAt:now,deleted:false,syncState:'pending',note:document.getElementById('cmTxNote').value.trim()};
    if(type==='exchange'){
      const fromAmount=Number(document.getElementById('cmTxFromAmount').value),toAmount=Number(document.getElementById('cmTxToAmount').value);if(!(fromAmount>0)||!(toAmount>0)){error.textContent='換出與換入金額都要大於 0。';return;}entry={...entry,fromAmount,fromCurrency:document.getElementById('cmTxFromCurrency').value,toAmount,toCurrency:document.getElementById('cmTxToCurrency').value,payer:currentIdentity()==='angel'?'angel':'richard'};
    }else{
      const amount=Number(document.getElementById('cmTxAmount').value);if(!(amount>0)){error.textContent='金額要大於 0。';return;}const category=document.getElementById('cmTxCategory').value,item=document.getElementById('cmTxItem').value,customItem=document.getElementById('cmTxCustom').value.trim();if((category==='其他'||item==='其他')&&!customItem){error.textContent='選擇「其他」時，請填寫項目名稱。';return;}entry={...entry,amount,currency:document.getElementById('cmTxCurrency').value,category,item,customItem:(category==='其他'||item==='其他')?customItem:'',payer:document.getElementById('cmTxPayer').value,method:document.getElementById('cmTxMethod').value};
    }
    upsert(entry);closeEntry();showMiniToast('✓ 已記錄');
  }
  function deleteEditing(){const r=rowById(editingId);if(!r||!confirm('刪除這筆記帳？'))return;r.deleted=true;r.updatedAt=new Date().toISOString();r.syncState='pending';upsert(r);closeEntry();showMiniToast('已刪除');}

  function ensureStatsLayer(){
    if(document.getElementById('cmLedgerStatsLayer'))return;
    const layer=document.createElement('div');layer.id='cmLedgerStatsLayer';layer.className='cm-ledger-layer';layer.innerHTML=`<div class="cm-ledger-sheet wide" role="dialog" aria-modal="true" aria-label="收支統計"><div class="cm-ledger-head"><div><h2>📊 旅費記帳</h2><div class="sub">收支、分類、付款人與付款方式統計</div></div><button class="cm-ledger-close" type="button" data-stats-close>×</button></div><div class="cm-ledger-toolbar"><button data-range="today">今天</button><button data-range="trip">整趟 11 天</button><button data-range="all">全部</button><button id="cmLedgerAddFromStats" class="cm-ledger-primary">＋ 記一筆</button><button id="cmLedgerPrint">🖨️ 列印／存 PDF</button><button id="cmLedgerGoBudget">原預算中心</button></div><div class="cm-ledger-sync"><button id="cmLedgerSync" class="cm-ledger-primary" type="button">🔄 同步共同旅費</button><small id="cmLedgerSyncMeta">尚未同步</small></div><div id="cmLedgerStatsBody"></div></div>`;document.body.appendChild(layer);
    layer.addEventListener('click',e=>{if(e.target===layer||e.target.closest('[data-stats-close]'))closeStats();});layer.querySelectorAll('[data-range]').forEach(b=>b.addEventListener('click',()=>{statsRange=b.dataset.range;renderStats();}));layer.querySelector('#cmLedgerAddFromStats').addEventListener('click',()=>{closeStats();openEntry();});layer.querySelector('#cmLedgerPrint').addEventListener('click',printLedger);layer.querySelector('#cmLedgerSync').addEventListener('click',syncLedger);layer.querySelector('#cmLedgerGoBudget').addEventListener('click',()=>{closeStats();if(typeof window.showPage==='function')window.showPage('budget');});
  }
  function openStats(range='today'){if(!currentIdentity()){alert('請先登入');return;}ensureStatsLayer();statsRange=range;renderStats();document.getElementById('cmLedgerStatsLayer').classList.add('show');}
  function closeStats(){document.getElementById('cmLedgerStatsLayer')?.classList.remove('show');}
  function renderStats(){
    const date=activeTripDate();const all=validRows();const rows=filterRange(all,statsRange,date);const expenses=moneyTotals(rows,'expense'),income=moneyTotals(rows,'income');const cash=cashThbBalance(all.filter(r=>statsRange==='all'||r.date<=date));const expenseRows=rows.filter(r=>r.type==='expense');
    document.querySelectorAll('#cmLedgerStatsLayer [data-range]').forEach(b=>b.classList.toggle('active',b.dataset.range===statsRange));const meta=document.getElementById('cmLedgerSyncMeta');const last=localStorage.getItem(LEDGER_LAST_SYNC);if(meta)meta.textContent=last?`最後同步 ${fmtDateTime(last)}`:'尚未同步';
    const body=document.getElementById('cmLedgerStatsBody');if(!body)return;const groupsCat=groupAmount(rows,'category'),groupsPayer=groupAmount(rows,'payer'),groupsMethod=groupAmount(rows,'method');
    body.innerHTML=`<div class="cm-ledger-stats"><div class="cm-ledger-stat"><small>支出</small><strong>${moneyHtml(expenses)}</strong></div><div class="cm-ledger-stat"><small>收入</small><strong>${moneyHtml(income)}</strong></div><div class="cm-ledger-stat"><small>THB 現金估算</small><strong>${fmt(cash)} THB</strong></div><div class="cm-ledger-stat"><small>支出筆數</small><strong>${expenseRows.length} 筆</strong></div></div>${groupHtml('分類統計',groupsCat)}${groupHtml('付款人統計',groupsPayer,true)}${groupHtml('付款方式統計',groupsMethod)}<section class="cm-ledger-section"><h3>明細</h3><div class="cm-ledger-list">${rows.length?rows.slice().sort((a,b)=>`${b.date}T${b.time||''}`.localeCompare(`${a.date}T${a.time||''}`)).map(rowHtml).join(''):'<div class="cm-ledger-empty">目前沒有記帳資料。</div>'}</div></section>`;
    body.querySelectorAll('[data-edit-ledger]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.editLedger;closeStats();openEntry(id);}));body.querySelectorAll('[data-delete-ledger]').forEach(b=>b.addEventListener('click',()=>{const r=rowById(b.dataset.deleteLedger);if(r&&confirm('刪除這筆記帳？')){r.deleted=true;r.updatedAt=new Date().toISOString();r.syncState='pending';upsert(r);renderStats();}}));
  }
  function groupHtml(title,groups,payer=false){
    const entries=Object.entries(groups);if(!entries.length)return '';const thb=entries.map(([k,v])=>[k,v.THB||0]);const max=Math.max(1,...thb.map(x=>x[1]));return `<section class="cm-ledger-section"><h3>${esc(title)}</h3><div class="cm-ledger-bars">${entries.sort((a,b)=>(b[1].THB||0)-(a[1].THB||0)).map(([k,v])=>`<div class="cm-ledger-bar"><span>${esc(payer?identityLabel(k):k)}</span><span class="cm-ledger-bar-track"><i style="width:${Math.max(4,((v.THB||0)/max)*100)}%"></i></span><strong>${esc(textMoney(v))}</strong></div>`).join('')}</div></section>`;
  }
  function rowHtml(r){
    if(r.type==='exchange')return `<div class="cm-ledger-row"><div><div class="cm-ledger-row-title">💱 換匯 ${fmt(r.fromAmount)} ${esc(r.fromCurrency)} → ${fmt(r.toAmount)} ${esc(r.toCurrency)}</div><div class="cm-ledger-row-meta">${esc(r.date)} ${esc(r.time||'')}・${esc(identityLabel(r.author))}${r.note?`・${esc(r.note)}`:''}${r.syncState==='pending'?'・待同步':''}</div></div><div class="cm-ledger-row-actions"><button data-edit-ledger="${esc(r.id)}">編輯</button><button data-delete-ledger="${esc(r.id)}">刪除</button></div></div>`;
    const icon=r.type==='income'?'↩️':'💸';return `<div class="cm-ledger-row"><div><div class="cm-ledger-row-title">${icon} ${esc(entryLabel(r))}</div><div class="cm-ledger-row-meta">${esc(r.date)} ${esc(r.time||'')}・${esc(r.category||'')}・${esc(identityLabel(r.payer))}・${esc(r.method||'')}${r.note?`・${esc(r.note)}`:''}${r.syncState==='pending'?'・待同步':''}</div></div><div><div class="cm-ledger-row-amt">${r.type==='income'?'+':'-'} ${esc(r.currency)} ${fmt(r.amount)}</div><div class="cm-ledger-row-actions"><button data-edit-ledger="${esc(r.id)}">編輯</button><button data-delete-ledger="${esc(r.id)}">刪除</button></div></div></div>`;
  }

  async function syncLedger(){
    const identity=currentIdentity();if(!identity)return;let key=localStorage.getItem(SHARED_SYNC_KEY)||'';if(!key){key=(prompt('請輸入共同同步碼。這支手機會沿用旅行筆記的同一組同步碼。')||'').trim();if(!key)return;localStorage.setItem(SHARED_SYNC_KEY,key);}
    const btn=document.getElementById('cmLedgerSync'),meta=document.getElementById('cmLedgerSyncMeta');btn.disabled=true;btn.textContent='⏳ 同步中…';meta.textContent='正在同步共同旅費';
    try{const api=String(window.getPushApiBase?.()||DEFAULT_PUSH_API).replace(/\/$/,'');const rows=loadLedger().map(r=>({...r}));const res=await fetch(`${api}/api/expenses/sync`,{method:'POST',headers:{'Content-Type':'application/json','X-Notes-Key':key},body:JSON.stringify({identity,entries:rows})});const data=await res.json().catch(()=>({}));if(res.status===401){localStorage.removeItem(SHARED_SYNC_KEY);throw new Error('同步碼不正確，已清除');}if(res.status===429)throw new Error('同步太頻繁，請稍後再試');if(!res.ok)throw new Error(data.error||`HTTP ${res.status}`);const map=new Map(loadLedger().map(r=>[r.id,r]));for(const remote of Array.isArray(data.entries)?data.entries:[]){const local=map.get(remote.id);if(!local||String(remote.updatedAt)>=String(local.updatedAt))map.set(remote.id,{...remote,syncState:'synced'});else map.set(local.id,{...local,syncState:'synced'});}saveLedger([...map.values()].map(r=>({...r,syncState:'synced'})));const now=new Date().toISOString();localStorage.setItem(LEDGER_LAST_SYNC,now);meta.textContent=`✓ 已同步・${fmtDateTime(now)}`;showMiniToast('共同旅費同步完成');}
    catch(e){meta.textContent=`⚠ ${e.message||e}`;showMiniToast('同步失敗，本機記帳仍已保留');}
    finally{btn.disabled=false;btn.textContent='🔄 同步共同旅費';renderStats();}
  }

  function ensurePrintRoot(){let p=document.getElementById('cmPrintRoot');if(!p){p=document.createElement('div');p.id='cmPrintRoot';p.className='cm-print-root';document.body.appendChild(p);}return p;}
  function printLedger(){
    const date=activeTripDate();const rows=filterRange(validRows(),statsRange,date).slice().sort((a,b)=>`${a.date}T${a.time||''}`.localeCompare(`${b.date}T${b.time||''}`));const p=ensurePrintRoot();p.innerHTML=`<h1>清邁 2026｜旅費記帳</h1><p>${statsRange==='today'?date:statsRange==='trip'?`${TRIP_START}～${TRIP_END}`:'全部記錄'}・列印時間 ${new Date().toLocaleString('zh-TW')}</p><table><thead><tr><th>日期時間</th><th>類型</th><th>項目</th><th>金額</th><th>付款人</th><th>方式</th><th>備註</th></tr></thead><tbody>${rows.map(r=>r.type==='exchange'?`<tr><td>${esc(r.date)} ${esc(r.time||'')}</td><td>換匯</td><td>${fmt(r.fromAmount)} ${esc(r.fromCurrency)} → ${fmt(r.toAmount)} ${esc(r.toCurrency)}</td><td>—</td><td>${esc(identityLabel(r.author))}</td><td>—</td><td>${esc(r.note||'')}</td></tr>`:`<tr><td>${esc(r.date)} ${esc(r.time||'')}</td><td>${r.type==='income'?'收入':'支出'}</td><td>${esc(entryLabel(r))}</td><td>${esc(r.currency)} ${fmt(r.amount)}</td><td>${esc(identityLabel(r.payer))}</td><td>${esc(r.method||'')}</td><td>${esc(r.note||'')}</td></tr>`).join('')}</tbody></table>`;document.body.classList.add('cm-print-only');setTimeout(()=>window.print(),30);
  }
  function printNotes(){
    const identity=currentIdentity();let notes=[];try{notes=JSON.parse(localStorage.getItem('cm26_notes_v1')||'[]')}catch(e){}notes=(Array.isArray(notes)?notes:[]).filter(n=>!n.deleted&&(n.scope==='shared'||identity==='admin'||n.owner===identity)).sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.updatedAt).localeCompare(String(b.updatedAt)));const p=ensurePrintRoot();p.innerHTML=`<h1>清邁 2026｜旅行筆記</h1><p>Richard / Angel 旅行紀錄・列印時間 ${new Date().toLocaleString('zh-TW')}</p><table><thead><tr><th>日期</th><th>類型</th><th>作者</th><th>範圍</th><th>內容</th></tr></thead><tbody>${notes.map(n=>`<tr><td>${esc(n.date||'')}</td><td>${esc(n.type||'一般')}</td><td>${esc(identityLabel(n.author))}</td><td>${n.scope==='shared'?'共同':'私人'}</td><td style="white-space:pre-wrap">${esc(n.text||'')}</td></tr>`).join('')}</tbody></table>`;document.body.classList.add('cm-print-only');setTimeout(()=>window.print(),30);
  }
  window.addEventListener('afterprint',()=>{document.body.classList.remove('cm-print-only');const p=document.getElementById('cmPrintRoot');if(p)p.innerHTML='';});

  function ensureNotesPrintButton(){
    const toolbar=document.querySelector('#cmNotesManagerLayer .cm-notes-toolbar');if(!toolbar||document.getElementById('cmNotesPrintBtn'))return;const b=document.createElement('button');b.id='cmNotesPrintBtn';b.type='button';b.textContent='🖨️ 列印／存 PDF';b.addEventListener('click',printNotes);toolbar.appendChild(b);
  }
  function showMiniToast(text){let t=document.getElementById('cmLedgerToast');if(!t){t=document.createElement('div');t.id='cmLedgerToast';t.style.cssText='position:fixed;left:50%;bottom:145px;transform:translateX(-50%);z-index:150;background:#172033;color:#fff;border-radius:12px;padding:10px 13px;font-size:13px;box-shadow:0 10px 35px rgba(16,24,40,.25);opacity:0;transition:opacity .15s;pointer-events:none';document.body.appendChild(t);}t.textContent=text;t.style.opacity='1';clearTimeout(t.__timer);t.__timer=setTimeout(()=>t.style.opacity='0',2200);}

  function refreshAll(){refreshFabVisibility();ensureHome();ensureNotesPrintButton();if(document.getElementById('cmLedgerStatsLayer')?.classList.contains('show'))renderStats();}
  function wrapRenderers(){['renderHome','renderMore','refreshAuthenticatedUI','showPage','selectDay','renderItinerary'].forEach(name=>{const fn=window[name];if(typeof fn!=='function'||fn.__ledgerWrapped)return;const wrapped=function(...args){const out=fn.apply(this,args);setTimeout(refreshAll,70);return out;};wrapped.__ledgerWrapped=true;window[name]=wrapped;});}
  function init(){addStyles();ensureQuickFab();ensureEntryLayer();ensureStatsLayer();ensureHome();ensureNotesPrintButton();wrapRenderers();const mo=new MutationObserver(()=>requestAnimationFrame(()=>{ensureHome();ensureNotesPrintButton();refreshFabVisibility();}));mo.observe(document.body,{childList:true,subtree:true});document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshAll();});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
