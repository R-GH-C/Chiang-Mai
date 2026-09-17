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
      #cmPowerGuideModal{
        position:fixed;inset:0;z-index:120;background:rgba(16,24,40,.55);
        display:none;align-items:flex-end;justify-content:center;
      }
      #cmPowerGuideModal.open{display:flex}
      #cmPowerGuidePanel{
        width:min(720px,100%);max-height:88vh;overflow:auto;background:#fff;
        border-radius:24px 24px 0 0;padding:20px 18px calc(28px + env(safe-area-inset-bottom));
      }
      .cm-power-head{display:flex;justify-content:space-between;align-items:center;gap:12px;position:sticky;top:-20px;background:#fff;padding:8px 0 12px;z-index:2}
      .cm-power-head h2{margin:0;font-size:21px}
      .cm-power-close{border:0;background:#f2f4f7;border-radius:50%;width:38px;height:38px;font-size:20px;cursor:pointer}
      .cm-power-summary{background:#eef6ff;border:1px solid #cfe3f7;border-radius:14px;padding:12px 14px;line-height:1.55;margin-bottom:12px}
      .cm-power-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0}
      .cm-power-card{border:1px solid #e2e8f0;border-radius:14px;padding:13px;background:#fff}
      .cm-power-card.good{background:#ecfdf3;border-color:#abefc6}
      .cm-power-card.bad{background:#fff1f0;border-color:#fecdca}
      .cm-power-card h3{margin:0 0 8px;font-size:16px}
      .cm-power-card p,.cm-power-card li{font-size:13px;line-height:1.6;color:#344054}
      .cm-power-card ul{padding-left:20px;margin:7px 0}
      .cm-power-code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:#f2f4f7;border-radius:8px;padding:3px 6px;white-space:nowrap}
      .cm-power-warning{margin-top:12px;background:#fffaeb;border-left:4px solid #f79009;border-radius:10px;padding:11px 12px;font-size:13px;line-height:1.6}
      @media(max-width:620px){
        #cmItineraryModeRow{margin-top:0;margin-bottom:10px}
        .cm-power-grid{grid-template-columns:1fr}
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

  function ensurePowerGuide(){
    const grid=document.getElementById('moreGrid');
    if(grid&&!document.getElementById('cmPowerGuideBtn')){
      const btn=document.createElement('button');
      btn.id='cmPowerGuideBtn';
      btn.className='more-btn';
      btn.type='button';
      btn.innerHTML='<span style="font-size:28px">🔌</span><b>電壓與插座</b><small>充電器、延長線可用／不可用判斷</small>';
      btn.addEventListener('click',openPowerGuide);
      grid.appendChild(btn);
    }

    if(document.getElementById('cmPowerGuideModal'))return;
    const modal=document.createElement('div');
    modal.id='cmPowerGuideModal';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.setAttribute('aria-labelledby','cmPowerGuideTitle');
    modal.innerHTML=`
      <div id="cmPowerGuidePanel">
        <div class="cm-power-head">
          <h2 id="cmPowerGuideTitle">🔌 泰國電壓／插座注意</h2>
          <button class="cm-power-close" type="button" aria-label="關閉">×</button>
        </div>
        <div class="cm-power-summary">
          <b>泰國清邁：約 220V／50Hz。</b><br>
          台灣常見兩片扁腳很多地方可直接插，但<b>插得進去 ≠ 電壓一定可用</b>，使用前先看設備上的 INPUT／額定電壓。
        </div>
        <div class="cm-power-grid">
          <div class="cm-power-card good">
            <h3>✅ 一般充電器：可直接使用</h3>
            <p>看到下列標示即可：</p>
            <p><span class="cm-power-code">INPUT 100–240V ~ 50/60Hz</span></p>
            <ul>
              <li>手機、平板、筆電、相機充電器多數屬於這類。</li>
              <li>只要插頭能穩固插入，通常不需要變壓器。</li>
              <li>旅行轉接頭只改插頭形狀，不會改變電壓。</li>
            </ul>
          </div>
          <div class="cm-power-card bad">
            <h3>❌ 一般充電器／電器：不可直接使用</h3>
            <p>若只標示：</p>
            <p><span class="cm-power-code">110V／120V／125V only</span></p>
            <ul>
              <li>不可直接接泰國 220V。</li>
              <li>尤其吹風機、電熱用品等高功率電器不要嘗試。</li>
              <li>需要真正的變壓器，單純轉接頭沒有降壓功能。</li>
            </ul>
          </div>
          <div class="cm-power-card good">
            <h3>✅ 延長線：符合條件才使用</h3>
            <ul>
              <li>延長線本體、插頭、開關、插座都應明確標示可承受 <span class="cm-power-code">220–250V</span>。</li>
              <li>若有內建 USB、突波保護或電子開關，也必須確認輸入支援 220–240V。</li>
              <li>不要超過延長線標示的額定電流／功率。</li>
            </ul>
          </div>
          <div class="cm-power-card bad">
            <h3>❌ 台灣常見 125V 延長線</h3>
            <ul>
              <li>若只標示 <span class="cm-power-code">125V</span>，不建議接泰國 220V 使用。</li>
              <li>即使只是插手機充電器，也代表延長線本體承受超過額定電壓。</li>
              <li>不要靠旅行轉接頭把 125V 延長線變成可用；轉接頭不會降壓。</li>
            </ul>
          </div>
        </div>
        <div class="cm-power-warning">
          <b>現場快速判斷：</b>先看「電壓」再看「插頭」。不確定規格就不要使用。三腳接地插頭若遇到沒有接地孔的插座，不要硬折、拆除接地腳。
        </div>
      </div>`;
    modal.querySelector('.cm-power-close').addEventListener('click',closePowerGuide);
    modal.addEventListener('click',e=>{if(e.target===modal)closePowerGuide();});
    document.body.appendChild(modal);
  }

  function openPowerGuide(){
    ensurePowerGuide();
    document.getElementById('cmPowerGuideModal')?.classList.add('open');
  }
  function closePowerGuide(){document.getElementById('cmPowerGuideModal')?.classList.remove('open');}

  function applyUiFixes(){
    ensureUiFixStyles();
    applyQuickControlFixes();
    moveItineraryModeSwitch();
    ensurePowerGuide();
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

  document.addEventListener('keydown',event=>{if(event.key==='Escape')closePowerGuide();});

  const observer=new MutationObserver(()=>requestAnimationFrame(applyUiFixes));
  function init(){
    applyUiFixes();
    observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
