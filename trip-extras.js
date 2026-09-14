(()=>{
  'use strict';

  const DEFAULT_PUSH_API='https://striking-determination-production-6964.up.railway.app';
  const NOTES_KEY='cm26_notes_v1';
  const NOTES_SYNC_KEY='cm26_notes_sync_key';
  const NOTES_LAST_SYNC='cm26_notes_last_sync';
  const TRIP_START='2026-09-23';
  const TRIP_END='2026-10-03';
  let noteDraftId=null;
  let saveTimer=0;
  let managerTab='mine';
  let managerDateFilter='';

  const THEMES={
    '2026-09-23':{name:'抵達清邁',icon:'✈️🌿',bg:'#f2f8fb',surface:'#ffffff',navy:'#28566b',blue:'#3f89a8',soft:'#e3f3f8',border:'#cfe2e8',heroA:'#28566b',heroB:'#59a9b8',topbar:'rgba(242,248,251,.94)',decor:'✈️  🌿'},
    '2026-09-24':{name:'大象與山林',icon:'🐘🌿',bg:'#f3f7ef',surface:'#fffef9',navy:'#355d45',blue:'#5b896b',soft:'#e7f1e6',border:'#d1dfcf',heroA:'#315940',heroB:'#73966e',topbar:'rgba(243,247,239,.94)',decor:'🐘  🍃'},
    '2026-09-25':{name:'Skyline 冒險日',icon:'🌤️🧗',bg:'#f4f8fa',surface:'#ffffff',navy:'#31536b',blue:'#4d86a8',soft:'#e7f2f8',border:'#d0e1ea',heroA:'#31536b',heroB:'#6c9fba',topbar:'rgba(244,248,250,.94)',decor:'🌤️  ⛰️'},
    '2026-09-26':{name:'手作與週六夜市',icon:'🧺🏮',bg:'#fbf5ed',surface:'#fffdfa',navy:'#754728',blue:'#a56a3c',soft:'#faead8',border:'#ead5bf',heroA:'#744526',heroB:'#b87949',topbar:'rgba(251,245,237,.95)',decor:'🧺  🏮'},
    '2026-09-27':{name:'週日市集散步',icon:'🌼🧺',bg:'#f7f7ed',surface:'#fffef9',navy:'#626331',blue:'#8a8a49',soft:'#f0efd7',border:'#deddbd',heroA:'#5d6030',heroB:'#92904e',topbar:'rgba(247,247,237,.95)',decor:'🌼  🧺'},
    '2026-09-28':{name:'古城寺廟與按摩',icon:'🛕🌿',bg:'#f7f3ee',surface:'#fffdf9',navy:'#684e3b',blue:'#94715a',soft:'#f1e6dc',border:'#e1d1c4',heroA:'#654936',heroB:'#9f775c',topbar:'rgba(247,243,238,.95)',decor:'🛕  🍂'},
    '2026-09-29':{name:'89 個月・特別的一天',icon:'💛89',bg:'#fff8f2',surface:'#fffdfb',navy:'#7b514e',blue:'#a96d67',soft:'#f9e7e2',border:'#efd3cb',heroA:'#7b4c4a',heroB:'#c28775',topbar:'rgba(255,248,242,.95)',decor:'💛  89  ✨',special:true},
    '2026-09-30':{name:'城門與夜市燈火',icon:'🌙🏮',bg:'#f4f2f8',surface:'#fefeff',navy:'#4d456d',blue:'#75699a',soft:'#ebe7f5',border:'#d8d1e8',heroA:'#494263',heroB:'#776d9b',topbar:'rgba(244,242,248,.95)',decor:'🌙  🏮'},
    '2026-10-01':{name:'Nimman 慢生活',icon:'☕✨',bg:'#f7f4fa',surface:'#ffffff',navy:'#665178',blue:'#8a70a1',soft:'#eee7f4',border:'#ddd2e6',heroA:'#604d72',heroB:'#9576aa',topbar:'rgba(247,244,250,.95)',decor:'☕  ✨'},
    '2026-10-02':{name:'復古市集與最後採買',icon:'🎞️🧳',bg:'#faf6ef',surface:'#fffdf9',navy:'#6a5338',blue:'#94764c',soft:'#f3eadb',border:'#e4d6c0',heroA:'#675039',heroB:'#9c7a50',topbar:'rgba(250,246,239,.95)',decor:'🎞️  🧳'},
    '2026-10-03':{name:'帶著回憶回家',icon:'✈️💙',bg:'#f2f7fb',surface:'#ffffff',navy:'#36566f',blue:'#5e88a6',soft:'#e6f0f7',border:'#d1e0ea',heroA:'#35536a',heroB:'#7199b3',topbar:'rgba(242,247,251,.95)',decor:'✈️  💙'}
  };

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function uid(){return crypto.randomUUID?crypto.randomUUID():`n-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;}
  function bangkokDate(){
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
    return `${p.year}-${p.month}-${p.day}`;
  }
  function currentIdentity(){try{return window.currentAuth?.()?.identity||null}catch(e){return null}}
  function identityLabel(id){return id==='richard'?'Richard':id==='angel'?'Angel':id==='admin'?'管理員':'未登入';}
  function visibleToIdentity(note,id=currentIdentity()){
    if(note.deleted)return false;
    if(note.scope==='shared')return true;
    if(id==='admin')return true;
    return note.owner===id;
  }
  function loadNotes(){
    try{const v=JSON.parse(localStorage.getItem(NOTES_KEY)||'[]');return Array.isArray(v)?v:[];}catch(e){return []}
  }
  function saveNotes(notes){localStorage.setItem(NOTES_KEY,JSON.stringify(notes));}
  function noteById(id){return loadNotes().find(n=>n.id===id)||null;}
  function upsertNote(note){
    const notes=loadNotes();
    const i=notes.findIndex(n=>n.id===note.id);
    if(i>=0)notes[i]=note; else notes.push(note);
    saveNotes(notes);
    refreshNotesUI();
  }
  function selectedItineraryDate(){
    try{return String(window.stateGet?.('selectedDate','')||'')||bangkokDate()}catch(e){return bangkokDate()}
  }
  function formatWhen(v){
    if(!v)return '';
    try{return new Intl.DateTimeFormat('zh-TW',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v));}catch(e){return v}
  }

  function addStyles(){
    if(document.getElementById('cm26-trip-extras-style'))return;
    const s=document.createElement('style');
    s.id='cm26-trip-extras-style';
    s.textContent=`
      body.cm-trip-theme{background:var(--bg);transition:background .18s ease}
      body.cm-trip-theme .topbar{background:var(--cm-topbar)!important}
      body.cm-trip-theme .hero-main{position:relative;overflow:hidden;background:linear-gradient(135deg,var(--cm-hero-a),var(--cm-hero-b))!important}
      body.cm-trip-theme .hero-main:after{content:attr(data-cm-decor);position:absolute;right:18px;bottom:10px;font-size:30px;opacity:.18;letter-spacing:8px;pointer-events:none}
      .cm-theme-chip{display:inline-flex;align-items:center;gap:7px;margin:0 0 12px;padding:7px 10px;border-radius:999px;background:rgba(255,255,255,.17);border:1px solid rgba(255,255,255,.26);font-size:12px;font-weight:800;color:#fff;backdrop-filter:blur(5px)}
      .cm-theme-chip.cm-special{background:rgba(255,244,208,.22);border-color:rgba(255,239,183,.55)}
      .cm-theme-sub{font-weight:650;opacity:.9}
      body.cm-trip-theme .day-tab.active,body.cm-trip-theme .pill.active{background:var(--navy)!important;border-color:var(--navy)!important}
      body.cm-trip-theme .event:before{background:var(--blue)!important}
      body.cm-trip-theme .bottom-nav{border-top-color:var(--border)}
      .cm-note-fab{position:fixed;left:18px;bottom:82px;z-index:46;border:0;border-radius:999px;padding:12px 15px;background:var(--navy,#17365d);color:#fff;font-weight:850;box-shadow:0 10px 28px rgba(16,24,40,.2);cursor:pointer;display:none}
      .cm-note-fab.show{display:block}
      .cm-note-layer{position:fixed;inset:0;z-index:95;background:rgba(16,24,40,.48);display:none;align-items:flex-end;justify-content:center;padding:0}
      .cm-note-layer.show{display:flex}
      .cm-note-sheet{width:min(720px,100%);max-height:88vh;overflow:auto;background:var(--surface,#fff);border-radius:24px 24px 0 0;padding:18px 18px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -18px 60px rgba(16,24,40,.18)}
      .cm-note-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}.cm-note-head h2{margin:0;font-size:20px}
      .cm-note-close{border:0;background:#f2f4f7;border-radius:50%;width:38px;height:38px;font-size:20px;cursor:pointer}
      .cm-note-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.cm-note-field{margin:9px 0}.cm-note-field label{display:block;font-size:12px;color:var(--muted,#667085);font-weight:750;margin-bottom:5px}
      .cm-note-field input,.cm-note-field select,.cm-note-field textarea{width:100%;border:1px solid var(--border,#d9e2ec);border-radius:12px;padding:10px 11px;background:#fff;color:#172033;font:inherit;outline:none}
      .cm-note-field textarea{min-height:145px;resize:vertical;line-height:1.55}.cm-note-field textarea:focus,.cm-note-field input:focus,.cm-note-field select:focus{border-color:var(--blue,#2f75b5);box-shadow:0 0 0 3px rgba(47,117,181,.1)}
      .cm-note-save-status{min-height:20px;font-size:12px;color:var(--muted,#667085);margin:4px 0 10px}
      .cm-note-actions{display:flex;gap:8px;flex-wrap:wrap}.cm-note-actions button{border:0;border-radius:11px;padding:10px 13px;font-weight:800;cursor:pointer}.cm-note-primary{background:var(--navy,#17365d);color:#fff}.cm-note-soft{background:var(--blue-soft,#eaf3fb);color:var(--navy,#17365d)}.cm-note-danger{background:#fee4e2;color:#b42318}
      .cm-notes-manager{width:min(900px,100%);max-height:92vh}.cm-notes-toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:4px 0 12px}.cm-notes-toolbar button{border:1px solid var(--border,#d9e2ec);background:#fff;border-radius:999px;padding:8px 11px;font-weight:750;cursor:pointer}.cm-notes-toolbar button.active{background:var(--navy,#17365d);color:#fff;border-color:var(--navy,#17365d)}
      .cm-sync-row{display:flex;align-items:center;gap:9px;flex-wrap:wrap;padding:11px 12px;border:1px solid var(--border,#d9e2ec);border-radius:14px;background:var(--blue-soft,#eaf3fb);margin-bottom:12px}.cm-sync-row button{border:0;border-radius:10px;padding:9px 12px;background:var(--navy,#17365d);color:white;font-weight:850;cursor:pointer}.cm-sync-row button[disabled]{opacity:.6}.cm-sync-meta{font-size:12px;color:var(--muted,#667085)}
      .cm-notes-list{display:grid;gap:10px}.cm-note-card{border:1px solid var(--border,#d9e2ec);border-radius:15px;background:#fff;padding:13px;box-shadow:0 3px 14px rgba(16,24,40,.05)}.cm-note-card-head{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.cm-note-tags{display:flex;gap:6px;flex-wrap:wrap}.cm-note-tag{display:inline-flex;border-radius:999px;padding:4px 7px;background:#f2f4f7;color:#475467;font-size:11px;font-weight:800}.cm-note-tag.shared{background:#e8f7ee;color:#17653b}.cm-note-tag.pending{background:#fff4e5;color:#9a5a00}.cm-note-text{white-space:pre-wrap;line-height:1.55;margin:9px 0;color:#27364a}.cm-note-card-foot{display:flex;justify-content:space-between;gap:8px;align-items:center;color:var(--muted,#667085);font-size:11px}.cm-note-card-foot .actions{display:flex;gap:6px}.cm-note-card-foot button{border:0;background:#f2f4f7;border-radius:8px;padding:5px 8px;cursor:pointer;font-size:11px;font-weight:750}
      .cm-day-notes{margin-top:14px}.cm-day-note-mini{padding:9px 0;border-bottom:1px solid #edf1f5}.cm-day-note-mini:last-child{border-bottom:0}.cm-day-note-text{font-size:13px;line-height:1.45;color:#344054;margin-top:3px}.cm-day-note-meta{font-size:11px;color:var(--muted,#667085)}
      .cm-notes-empty{padding:28px 14px;text-align:center;color:var(--muted,#667085)}
      .cm-toast{position:fixed;left:50%;bottom:145px;transform:translateX(-50%);z-index:120;background:#172033;color:#fff;border-radius:12px;padding:10px 13px;font-size:13px;box-shadow:0 10px 35px rgba(16,24,40,.25);opacity:0;pointer-events:none;transition:opacity .15s ease}.cm-toast.show{opacity:1}
      @media(max-width:620px){.cm-note-fab{left:12px;bottom:78px;padding:11px 13px}.cm-note-grid{grid-template-columns:1fr}.cm-note-sheet{padding-left:14px;padding-right:14px}.cm-theme-chip{font-size:11px}}
    `;
    document.head.appendChild(s);
  }

  function applyDailyTheme(){
    const preview=new URLSearchParams(location.search).get('themeDate');
    const date=preview||bangkokDate();
    const theme=THEMES[date];
    const root=document.documentElement;
    const body=document.body;
    const meta=document.querySelector('meta[name="theme-color"]');
    if(!body)return;
    if(!theme||date<TRIP_START||date>TRIP_END){
      body.classList.remove('cm-trip-theme');
      body.removeAttribute('data-cm-theme');body.removeAttribute('data-cm-decor');
      ['--bg','--surface','--navy','--blue','--blue-soft','--border','--cm-hero-a','--cm-hero-b','--cm-topbar'].forEach(v=>root.style.removeProperty(v));
      document.getElementById('cmThemeChip')?.remove();
      if(meta)meta.setAttribute('content','#17365D');
      return;
    }
    body.classList.add('cm-trip-theme');
    body.dataset.cmTheme=date;body.dataset.cmDecor=theme.decor;
    root.style.setProperty('--bg',theme.bg);root.style.setProperty('--surface',theme.surface);root.style.setProperty('--navy',theme.navy);root.style.setProperty('--blue',theme.blue);root.style.setProperty('--blue-soft',theme.soft);root.style.setProperty('--border',theme.border);root.style.setProperty('--cm-hero-a',theme.heroA);root.style.setProperty('--cm-hero-b',theme.heroB);root.style.setProperty('--cm-topbar',theme.topbar);
    if(meta)meta.setAttribute('content',theme.navy);
    ensureThemeChip(date,theme);
  }

  function ensureThemeChip(date,theme){
    const hero=document.querySelector('.hero-main');
    if(!hero)return;
    let chip=document.getElementById('cmThemeChip');
    if(!chip){chip=document.createElement('div');chip.id='cmThemeChip';chip.className='cm-theme-chip';hero.prepend(chip);}
    chip.classList.toggle('cm-special',!!theme.special);
    chip.innerHTML=theme.special
      ? `<span>${esc(theme.icon)}</span><span>${esc(theme.name)}</span><span class="cm-theme-sub">2019.04.29 → 2026.09.29</span>`
      : `<span>${esc(theme.icon)}</span><span>${esc(theme.name)}</span><span class="cm-theme-sub">${esc(date.slice(5).replace('-','/'))}</span>`;
  }

  function ensureNotesUI(){
    if(!document.getElementById('cmNoteFab')){
      const fab=document.createElement('button');fab.id='cmNoteFab';fab.className='cm-note-fab';fab.type='button';fab.textContent='📝 筆記';fab.addEventListener('click',()=>openEditor());document.body.appendChild(fab);
    }
    if(!document.getElementById('cmNoteLayer')){
      const layer=document.createElement('div');layer.id='cmNoteLayer';layer.className='cm-note-layer';layer.innerHTML=`<div class="cm-note-sheet" role="dialog" aria-modal="true" aria-label="旅行筆記"><div class="cm-note-head"><h2 id="cmNoteEditorTitle">📝 快速筆記</h2><button class="cm-note-close" type="button" data-note-close>×</button></div><div class="cm-note-grid"><div class="cm-note-field"><label>日期</label><input id="cmNoteDate" type="date"></div><div class="cm-note-field"><label>筆記類型</label><select id="cmNoteType"><option>一般</option><option>花費</option><option>餐廳</option><option>購物</option><option>待辦</option><option>重要提醒</option><option>回憶</option></select></div></div><div class="cm-note-field"><label>保存位置</label><select id="cmNoteScope"></select></div><div class="cm-note-field"><label>內容</label><textarea id="cmNoteText" maxlength="4000" placeholder="記下餐廳、價格、心得、待辦或今天的小事…"></textarea></div><div id="cmNoteSaveStatus" class="cm-note-save-status">輸入後會自動儲存在這支手機。</div><div class="cm-note-actions"><button class="cm-note-primary" id="cmNoteDone" type="button">完成</button><button class="cm-note-soft" id="cmNoteOpenManager" type="button">查看全部筆記</button><button class="cm-note-danger" id="cmNoteDelete" type="button" style="display:none">刪除</button></div></div>`;document.body.appendChild(layer);
      layer.addEventListener('click',e=>{if(e.target===layer||e.target.closest('[data-note-close]'))closeEditor();});
      layer.querySelector('#cmNoteDone').addEventListener('click',()=>{flushEditorSave();closeEditor();});
      layer.querySelector('#cmNoteOpenManager').addEventListener('click',()=>{flushEditorSave();closeEditor();openManager();});
      layer.querySelector('#cmNoteDelete').addEventListener('click',deleteCurrentNote);
      ['cmNoteText','cmNoteDate','cmNoteType','cmNoteScope'].forEach(id=>layer.querySelector('#'+id).addEventListener('input',scheduleEditorSave));
    }
    if(!document.getElementById('cmNotesManagerLayer')){
      const layer=document.createElement('div');layer.id='cmNotesManagerLayer';layer.className='cm-note-layer';layer.innerHTML=`<div class="cm-note-sheet cm-notes-manager" role="dialog" aria-modal="true" aria-label="旅行筆記管理"><div class="cm-note-head"><div><h2>📝 旅行筆記</h2><div class="cm-sync-meta">私人筆記只留在本機；共同筆記只有按同步按鈕才會連線。</div></div><button class="cm-note-close" type="button" data-manager-close>×</button></div><div class="cm-notes-toolbar"><button data-tab="mine" class="active">我的</button><button data-tab="shared">👫 共同</button><button data-tab="all">全部</button><button id="cmManagerNewNote">＋ 新增</button></div><div class="cm-sync-row"><button id="cmSyncNotes">🔄 同步共同筆記</button><span id="cmSyncMeta" class="cm-sync-meta">尚未同步</span><button id="cmChangeSyncKey" type="button" style="background:#fff;color:var(--navy);border:1px solid var(--border)">變更同步碼</button></div><div id="cmNotesList" class="cm-notes-list"></div></div>`;document.body.appendChild(layer);
      layer.addEventListener('click',e=>{if(e.target===layer||e.target.closest('[data-manager-close]'))closeManager();});
      layer.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{managerTab=b.dataset.tab;managerDateFilter='';renderManager();}));
      layer.querySelector('#cmManagerNewNote').addEventListener('click',()=>{closeManager();openEditor();});
      layer.querySelector('#cmSyncNotes').addEventListener('click',syncSharedNotes);
      layer.querySelector('#cmChangeSyncKey').addEventListener('click',()=>{localStorage.removeItem(NOTES_SYNC_KEY);showToast('同步碼已清除，下次同步會重新詢問');});
    }
    if(!document.getElementById('cmNotesToast')){const t=document.createElement('div');t.id='cmNotesToast';t.className='cm-toast';document.body.appendChild(t);}
    ensureMoreNotesButton();refreshAuthNotesVisibility();renderDayNotes();
  }

  function ensureMoreNotesButton(){
    const grid=document.getElementById('moreGrid');
    if(!grid||document.getElementById('cmNotesMoreBtn'))return;
    const b=document.createElement('button');b.id='cmNotesMoreBtn';b.className='more-btn';b.type='button';b.innerHTML='<span style="font-size:28px">📝</span><b>旅行筆記</b><small>私人筆記＋手動同步共同筆記</small>';b.addEventListener('click',()=>openManager());grid.appendChild(b);
  }

  function refreshAuthNotesVisibility(){
    const id=currentIdentity();
    const fab=document.getElementById('cmNoteFab');
    if(fab)fab.classList.toggle('show',!!id);
  }

  function scopeOptions(id){
    if(!id)return '';
    const privateLabel=id==='admin'?'管理員私人':'我的私人';
    return `<option value="private">🔒 ${privateLabel}</option><option value="shared">👫 共同筆記</option>`;
  }

  function openEditor(id=null,date=null){
    ensureNotesUI();
    const identity=currentIdentity();if(!identity){showToast('請先登入');return;}
    const layer=document.getElementById('cmNoteLayer');
    const scope=document.getElementById('cmNoteScope');scope.innerHTML=scopeOptions(identity);
    noteDraftId=id;
    const note=id?noteById(id):null;
    scope.disabled=!!note;
    const d=date||note?.date||selectedItineraryDate()||bangkokDate();
    document.getElementById('cmNoteDate').value=d;
    document.getElementById('cmNoteType').value=note?.type||(d==='2026-09-29'?'回憶':'一般');
    document.getElementById('cmNoteScope').value=note?.scope||'private';
    document.getElementById('cmNoteText').value=note?.text||'';
    document.getElementById('cmNoteEditorTitle').textContent=note?'✏️ 編輯筆記':(d==='2026-09-29'?'💛 今日回憶':'📝 快速筆記');
    document.getElementById('cmNoteDelete').style.display=note?'inline-block':'none';
    document.getElementById('cmNoteSaveStatus').textContent=note?'修改後會自動儲存。':'輸入後會自動儲存在這支手機。';
    layer.classList.add('show');
    setTimeout(()=>document.getElementById('cmNoteText').focus(),80);
  }
  function closeEditor(){clearTimeout(saveTimer);flushEditorSave();document.getElementById('cmNoteLayer')?.classList.remove('show');noteDraftId=null;}
  function scheduleEditorSave(){clearTimeout(saveTimer);document.getElementById('cmNoteSaveStatus').textContent='正在儲存…';saveTimer=setTimeout(flushEditorSave,350);}
  function flushEditorSave(){
    clearTimeout(saveTimer);
    const text=document.getElementById('cmNoteText')?.value.trim();if(text==null)return;
    if(!text){if(noteDraftId&&noteById(noteDraftId)?.__draft){const notes=loadNotes().filter(n=>n.id!==noteDraftId);saveNotes(notes);refreshNotesUI();}document.getElementById('cmNoteSaveStatus').textContent='輸入後會自動儲存在這支手機。';return;}
    const identity=currentIdentity();if(!identity)return;
    const now=new Date().toISOString();
    const old=noteDraftId?noteById(noteDraftId):null;
    const scope=document.getElementById('cmNoteScope').value;
    const note={id:old?.id||uid(),scope,owner:old?.owner||identity,author:identity,date:document.getElementById('cmNoteDate').value||bangkokDate(),type:document.getElementById('cmNoteType').value||'一般',text,createdAt:old?.createdAt||now,updatedAt:now,deleted:false,syncState:scope==='shared'?'pending':'local',__draft:false};
    if(!old)noteDraftId=note.id;
    upsertNote(note);
    const status=document.getElementById('cmNoteSaveStatus');if(status)status.textContent=scope==='shared'?'✓ 已儲存在本機・共同筆記待同步':'✓ 已自動儲存在本機';
    const del=document.getElementById('cmNoteDelete');if(del)del.style.display='inline-block';
  }
  function deleteCurrentNote(){
    if(!noteDraftId)return closeEditor();
    const n=noteById(noteDraftId);if(!n)return closeEditor();
    if(!confirm('刪除這則筆記？'))return;
    if(n.scope==='shared'){n.deleted=true;n.updatedAt=new Date().toISOString();n.syncState='pending';upsertNote(n);}else{saveNotes(loadNotes().filter(x=>x.id!==n.id));refreshNotesUI();}
    clearTimeout(saveTimer);document.getElementById('cmNoteLayer')?.classList.remove('show');noteDraftId=null;showToast(n.scope==='shared'?'已刪除，下一次同步會更新共同筆記':'已刪除');
  }

  function openManager(tab=null,date=''){
    ensureNotesUI();if(tab)managerTab=tab;managerDateFilter=date||'';renderManager();document.getElementById('cmNotesManagerLayer').classList.add('show');
  }
  function closeManager(){document.getElementById('cmNotesManagerLayer')?.classList.remove('show');}
  function renderManager(){
    const identity=currentIdentity();
    document.querySelectorAll('#cmNotesManagerLayer [data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===managerTab));
    const last=localStorage.getItem(NOTES_LAST_SYNC);const meta=document.getElementById('cmSyncMeta');if(meta)meta.textContent=last?`最後同步 ${formatWhen(last)}`:'尚未同步';
    let notes=loadNotes().filter(n=>!n.deleted&&visibleToIdentity(n,identity));
    if(managerTab==='mine')notes=notes.filter(n=>n.scope==='private'&&(identity==='admin'||n.owner===identity));
    if(managerTab==='shared')notes=notes.filter(n=>n.scope==='shared');
    if(managerDateFilter)notes=notes.filter(n=>n.date===managerDateFilter);
    notes.sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
    const box=document.getElementById('cmNotesList');if(!box)return;
    box.innerHTML=notes.length?notes.map(noteCardHtml).join(''):`<div class="cm-notes-empty">還沒有${managerDateFilter?` ${esc(managerDateFilter)} 的`:''}筆記。<br><br><button class="cm-note-primary" style="border:0;border-radius:10px;padding:9px 12px" onclick="document.getElementById('cmManagerNewNote').click()">＋ 新增一筆</button></div>`;
    box.querySelectorAll('[data-edit-note]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.editNote;closeManager();openEditor(id);}));
    box.querySelectorAll('[data-delete-note]').forEach(b=>b.addEventListener('click',()=>deleteFromManager(b.dataset.deleteNote)));
  }
  function noteCardHtml(n){
    const shared=n.scope==='shared';
    return `<article class="cm-note-card"><div class="cm-note-card-head"><div class="cm-note-tags"><span class="cm-note-tag">${esc(n.date||'')}</span><span class="cm-note-tag">${esc(n.type||'一般')}</span><span class="cm-note-tag ${shared?'shared':''}">${shared?'👫 共同':`🔒 ${esc(identityLabel(n.owner))}`}</span>${shared&&n.syncState==='pending'?'<span class="cm-note-tag pending">● 待同步</span>':''}</div></div><div class="cm-note-text">${esc(n.text)}</div><div class="cm-note-card-foot"><span>${esc(identityLabel(n.author))}・${esc(formatWhen(n.updatedAt))}</span><span class="actions"><button data-edit-note="${esc(n.id)}">編輯</button><button data-delete-note="${esc(n.id)}">刪除</button></span></div></article>`;
  }
  function deleteFromManager(id){
    const n=noteById(id);if(!n||!confirm('刪除這則筆記？'))return;
    if(n.scope==='shared'){n.deleted=true;n.updatedAt=new Date().toISOString();n.syncState='pending';upsertNote(n);}else{saveNotes(loadNotes().filter(x=>x.id!==id));refreshNotesUI();}
    renderManager();
  }

  async function syncSharedNotes(){
    const identity=currentIdentity();if(!identity){showToast('請先登入');return;}
    let key=localStorage.getItem(NOTES_SYNC_KEY)||'';
    if(!key){key=(prompt('第一次同步請輸入「共同筆記同步碼」。只會儲存在這支手機。')||'').trim();if(!key)return;localStorage.setItem(NOTES_SYNC_KEY,key);}
    const btn=document.getElementById('cmSyncNotes');const meta=document.getElementById('cmSyncMeta');
    btn.disabled=true;btn.textContent='⏳ 同步中…';meta.textContent='正在與共同筆記同步';
    try{
      const api=String(window.getPushApiBase?.()||DEFAULT_PUSH_API).replace(/\/$/,'');
      const shared=loadNotes().filter(n=>n.scope==='shared').map(n=>({id:n.id,scope:'shared',author:n.author,owner:n.owner,date:n.date,type:n.type,text:n.text,createdAt:n.createdAt,updatedAt:n.updatedAt,deleted:!!n.deleted}));
      const res=await fetch(`${api}/api/notes/sync`,{method:'POST',headers:{'Content-Type':'application/json','X-Notes-Key':key},body:JSON.stringify({identity,notes:shared})});
      const data=await res.json().catch(()=>({}));
      if(res.status===401){localStorage.removeItem(NOTES_SYNC_KEY);throw new Error('同步碼不正確，已清除，請重新輸入');}
      if(res.status===429)throw new Error('同步太頻繁，請稍後再試');
      if(!res.ok)throw new Error(data.error||`HTTP ${res.status}`);
      const local=loadNotes();const map=new Map(local.map(n=>[n.id,n]));
      for(const r of Array.isArray(data.notes)?data.notes:[]){
        const l=map.get(r.id);if(!l||String(r.updatedAt)>=String(l.updatedAt))map.set(r.id,{...r,syncState:'synced'});else map.set(l.id,{...l,syncState:'synced'});
      }
      for(const [id,n] of map){if(n.scope==='shared')map.set(id,{...n,syncState:'synced'});}
      saveNotes([...map.values()]);
      const now=new Date().toISOString();localStorage.setItem(NOTES_LAST_SYNC,now);meta.textContent=`✓ 已同步・${formatWhen(now)}`;showToast(`共同筆記同步完成${Number.isFinite(data.changed)?`・更新 ${data.changed} 筆`:''}`);refreshNotesUI();
    }catch(e){meta.textContent=`⚠ 同步失敗：${e.message||e}`;showToast('同步失敗，本機筆記仍已保留');}
    finally{btn.disabled=false;btn.textContent='🔄 同步共同筆記';renderManager();}
  }

  function renderDayNotes(){
    const host=document.getElementById('dayDetail');if(!host)return;
    const date=selectedItineraryDate();const identity=currentIdentity();
    let box=document.getElementById('cmDayNotes');
    if(!box){box=document.createElement('div');box.id='cmDayNotes';box.className='card cm-day-notes';host.appendChild(box);}
    const notes=loadNotes().filter(n=>!n.deleted&&n.date===date&&visibleToIdentity(n,identity)).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
    const title=date==='2026-09-29'?'💛 今日回憶':'📝 今日筆記';
    box.innerHTML=`<div class="section-head" style="margin-bottom:6px"><div><h3 style="margin:0">${title}</h3><div class="sub">${esc(date)}・私人內容只留在本機</div></div><div class="btn-row"><button class="btn soft" type="button" data-day-note-add>＋ 記一筆</button>${notes.length?'<button class="btn secondary" type="button" data-day-note-all>查看全部</button>':''}</div></div>${notes.length?notes.slice(0,3).map(n=>`<div class="cm-day-note-mini"><div class="cm-day-note-meta">${n.scope==='shared'?'👫 共同':'🔒 私人'}・${esc(n.type||'一般')}・${esc(identityLabel(n.author))}</div><div class="cm-day-note-text">${esc(n.text.length>180?n.text.slice(0,180)+'…':n.text)}</div></div>`).join(''):'<div class="cm-notes-empty" style="padding:14px 4px">今天還沒有筆記。</div>'}`;
    box.querySelector('[data-day-note-add]')?.addEventListener('click',()=>openEditor(null,date));
    box.querySelector('[data-day-note-all]')?.addEventListener('click',()=>openManager('all',date));
  }

  function refreshNotesUI(){
    refreshAuthNotesVisibility();ensureMoreNotesButton();renderDayNotes();if(document.getElementById('cmNotesManagerLayer')?.classList.contains('show'))renderManager();
  }
  function showToast(text){const t=document.getElementById('cmNotesToast');if(!t)return;t.textContent=text;t.classList.add('show');clearTimeout(t.__timer);t.__timer=setTimeout(()=>t.classList.remove('show'),2400);}

  function wrapRenderers(){
    ['selectDay','renderItinerary','renderMore','refreshAuthenticatedUI','showPage'].forEach(name=>{
      const original=window[name];if(typeof original!=='function'||original.__tripExtrasWrapped)return;
      const wrapped=function(...args){const out=original.apply(this,args);setTimeout(()=>{ensureMoreNotesButton();refreshAuthNotesVisibility();renderDayNotes();applyDailyTheme();},60);return out;};wrapped.__tripExtrasWrapped=true;window[name]=wrapped;
    });
  }

  function init(){
    addStyles();applyDailyTheme();ensureNotesUI();wrapRenderers();
    const observer=new MutationObserver(()=>{requestAnimationFrame(()=>{ensureMoreNotesButton();refreshAuthNotesVisibility();if(!document.getElementById('cmDayNotes'))renderDayNotes();if(document.body.classList.contains('cm-trip-theme')&&!document.getElementById('cmThemeChip'))applyDailyTheme();});});
    observer.observe(document.body,{childList:true,subtree:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden){applyDailyTheme();refreshNotesUI();}});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
