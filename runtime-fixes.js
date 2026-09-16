(()=>{
  'use strict';

  function ensureUiFixStyles(){
    if(document.getElementById('cm26-ui-fixes-style'))return;
    const style=document.createElement('style');
    style.id='cm26-ui-fixes-style';
    style.textContent=`
      #cmQuickMenu [data-quick="stats"]{display:none!important}
      #quickFab{
        width:50px!important;
        min-width:50px!important;
        height:50px!important;
        padding:0!important;
        border-radius:50%!important;
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        font-size:24px!important;
        line-height:1!important;
      }
      #cmItineraryModeRow{
        display:flex;
        align-items:center;
        justify-content:flex-start;
        margin:-2px 0 12px;
      }
      #cmItineraryModeRow .mode-switch{margin:0}
      @media(max-width:620px){
        #cmItineraryModeRow{margin-top:0;margin-bottom:10px}
      }
    `;
    document.head.appendChild(style);
  }

  function applyQuickControlFixes(){
    // 左下角「＋」只保留現場高頻功能；收支統計仍可從首頁進入。
    document.querySelector('#cmQuickMenu [data-quick="stats"]')?.remove();

    // 右下角快速查看改成純閃電圖示，減少遮擋。
    const quickFab=document.getElementById('quickFab');
    if(quickFab){
      if(quickFab.textContent!=='⚡')quickFab.textContent='⚡';
      quickFab.setAttribute('aria-label','快速查看');
      quickFab.setAttribute('title','快速查看');
    }
  }

  function moveItineraryModeSwitch(){
    const itinerary=document.getElementById('itinerary');
    const dayTabs=document.getElementById('dayTabs');
    const modeSwitch=itinerary?.querySelector('.mode-switch');
    if(!itinerary||!dayTabs||!modeSwitch)return;

    let row=document.getElementById('cmItineraryModeRow');
    if(!row){
      row=document.createElement('div');
      row.id='cmItineraryModeRow';
      row.setAttribute('aria-label','行程模式切換');
      dayTabs.insertAdjacentElement('afterend',row);
    }else if(row.previousElementSibling!==dayTabs){
      dayTabs.insertAdjacentElement('afterend',row);
    }
    if(modeSwitch.parentElement!==row)row.appendChild(modeSwitch);
  }

  function applyUiFixes(){
    ensureUiFixStyles();
    applyQuickControlFixes();
    moveItineraryModeSwitch();
  }

  document.addEventListener('click',event=>{
    const btn=event.target.closest?.('[data-quick="notes"],[data-home-notes]');
    if(!btn)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    document.getElementById('cmQuickMenu')?.classList.remove('open');
    const fab=document.getElementById('cmQuickFab');if(fab)fab.setAttribute('aria-expanded','false');
    const noteFab=document.getElementById('cmNoteFab');
    if(noteFab)noteFab.click();else document.getElementById('cmNotesMoreBtn')?.click();
  },true);

  const observer=new MutationObserver(()=>requestAnimationFrame(applyUiFixes));
  function init(){
    applyUiFixes();
    observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
