(()=>{
  'use strict';

  const SYNC_TAG='google-sheet-20260915';

  function hideTopRightLock(){
    document.querySelectorAll('.lock-now').forEach(el=>el.remove());
  }

  function applyLatestSheetPatch(){
    try{
      if(window.__cm26SheetPatchTag===SYNC_TAG)return true;
      if(typeof DATA==='undefined'||typeof getRows!=='function')return false;

      const rows=sheet=>DATA[sheet]||[];
      const addUnique=(sheet,row,keyIndex=1)=>{
        const list=rows(sheet);
        const key=String(row[keyIndex]??'').trim();
        if(!key||list.some(r=>String(r?.[keyIndex]??'').trim()===key))return false;
        list.push(row);
        return true;
      };

      // 2026-09-15 Google Sheet「買」新增的香氛候選。
      // 保留為候選，不自動塞入每日必跑行程，也不預先加進核心預算。
      addUnique('17吃喝按摩購物',[
        '香氛','Panpuri','購物候選','Google Sheet「買」最新同步','依現場','可選',
        '逛街動線順路再看','—','香氛候選；不列為必買'
      ]);
      addUnique('17吃喝按摩購物',[
        '香氛','Journal','購物候選','Google Sheet「買」最新同步','依現場','可選',
        '逛街動線順路再看','—','香氛候選；不列為必買'
      ]);

      window.__cm26SheetPatchTag=SYNC_TAG;
      try{window.renderMore?.();}catch(e){console.warn('Latest Sheet patch renderMore failed',e)}
      try{window.renderHome?.();}catch(e){console.warn('Latest Sheet patch renderHome failed',e)}
      return true;
    }catch(e){
      console.error('2026-09-15 Google Sheet sync failed',e);
      return false;
    }
  }

  function init(){
    hideTopRightLock();

    let tries=0;
    const tryApply=()=>{
      if(applyLatestSheetPatch()||tries>=20)return;
      tries+=1;
      setTimeout(tryApply,150);
    };
    tryApply();

    // 某些登入/畫面重繪流程可能再次建立 topbar，持續確保鎖頭不再出現。
    const observer=new MutationObserver(()=>hideTopRightLock());
    observer.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
