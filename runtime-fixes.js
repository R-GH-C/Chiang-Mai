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
      #cmPowerGuide{line-height:1.65}
      #cmPowerGuide h3{margin:0 0 5px}
      #cmPowerGuide .cm-power-sub{font-size:13px;color:var(--muted);margin:0 0 12px}
      #cmPowerGuide .cm-power-summary{font-weight:800;color:var(--navy);cursor:pointer;padding:9px 0}
      #cmPowerGuide details{border-top:1px solid var(--border);margin-top:9px}
      #cmPowerGuide .cm-power-ok,#cmPowerGuide .cm-power-no,#cmPowerGuide .cm-power-caution{
        border-radius:12px;padding:10px 12px;margin:9px 0;font-size:13px;
      }
      #cmPowerGuide .cm-power-ok{background:var(--green-soft);color:#07583b}
      #cmPowerGuide .cm-power-no{background:var(--red-soft);color:#871c14}
      #cmPowerGuide .cm-power-caution{background:var(--orange-soft);color:#8c3908}
      #cmPowerGuide ul{margin:6px 0 12px;padding-left:20px;font-size:13px}
      #cmPowerGuide li{margin:5px 0}
      #cmPowerGuide .cm-power-source{font-size:11px;color:var(--muted);margin:12px 0 0}
      #cmPowerGuide .cm-power-source a{display:inline-block;margin-right:9px}
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

  function ensureElectricalGuide(){
    // 旅行用電安全資訊只顯示在「更多」頁，內容隨 PWA 快取離線可讀，不額外發起網路請求。
    if(document.getElementById('cmPowerGuide'))return;
    const moreGrid=document.getElementById('moreGrid');
    const moreSection=moreGrid?.closest('section');
    if(!moreSection)return;

    const guide=document.createElement('section');
    guide.className='section card';
    guide.id='cmPowerGuide';
    guide.setAttribute('aria-labelledby','cmPowerTitle');
    guide.innerHTML=`
      <h3 id="cmPowerTitle">🔌 清邁用電｜充電器與延長線</h3>
      <p class="cm-power-sub">泰國約 AC 220V／50Hz；台灣約 110V／60Hz。插得進去 ≠ 電壓相容，先看產品標籤。</p>
      <div class="cm-power-ok"><strong>✅ 可直接使用：</strong>充電器標示 <strong>INPUT AC 100–240V、50/60Hz</strong>，且插頭與插座穩固相容。例如已確認的 USB-A 雙孔充電器：輸入 100–240V／50/60Hz、總輸出最高 24W。</div>
      <div class="cm-power-no"><strong>⛔ 不可直接使用：</strong>僅標示 <strong>110V／125V</strong> 的電器或延長線，不能直接接泰國 220V；即使末端只接寬電壓手機充電器也不行。</div>
      <details>
        <summary class="cm-power-summary">📱 一般充電器怎麼判斷？</summary>
        <ul>
          <li><strong>100–240V、50/60Hz：</strong>可接泰國市電，不需變壓器；仍須確認插頭、轉接頭及充電線完整無損。</li>
          <li><strong>僅 110V／60Hz、僅 120V 或不清楚：</strong>不可直接插；查說明書或詢問原廠，不能單憑外觀猜測。</li>
          <li>台灣常見兩片平行扁腳在泰國部分插座可用，但不是每個插座都保證相容；三腳有接地需求的設備須保留有效接地。</li>
          <li>USB-A 5V／2.4A 可用來充相容設備，但不代表有 USB-C PD 快充；同時充兩台時仍須遵守總輸出功率。</li>
        </ul>
      </details>
      <details>
        <summary class="cm-power-summary">🔌 延長線怎麼判斷？</summary>
        <ul>
          <li><strong>125V 15A／1650W：</strong>常見台灣家用規格，不能接泰國 220V；「15A」或「1650W」並不代表可跨電壓使用。</li>
          <li><strong>250V 以上且符合全部條件：</strong>整組插頭、電線、插座、開關、突波保護與內建 USB 模組（若有）均需明確適用 220–240V／50Hz，並符合額定電流／功率；只看到某單一零件標示 250V 不夠。</li>
          <li>插頭必須吻合且牢固；三腳設備不可折掉接地腳，也不可用無接地轉接頭假裝已有接地。</li>
          <li>不要延長線串延長線、不要捲著或壓住電線、不要在潮濕處使用；不要接吹風機、電熱器等高耗電設備。</li>
          <li>插座鬆動、發燙、焦黑、破損或有異味，立刻停止使用並拔除電源。</li>
        </ul>
      </details>
      <div class="cm-power-caution"><strong>⚠️ 轉接頭不是變壓器：</strong>旅行轉接頭通常只轉換插頭形狀，不把 220V 降成 110V；不能藉此讓 125V 延長線或 110V 吹風機變安全。若使用合格降壓器，須依規格與廠商說明，且不要在降壓器後接延長線。</div>
      <p class="cm-power-sub">只需幫兩人手機／行動電源充電時，優先使用多孔、明確標示 100–240V 的充電器，通常比攜帶家用延長線容易確認規格。</p>
      <p class="cm-power-source">查核來源（點擊才會連網）：
        <a href="https://www.tourismthailand.org/Articles/plan-your-trip-electricity" target="_blank" rel="noopener noreferrer">泰國觀光局｜用電</a>
        <a href="https://www.bsmi.gov.tw/wSite/fp?ctNode=6014&amp;mp=1&amp;xItem=40683" target="_blank" rel="noopener noreferrer">標準檢驗局｜延長線安全</a>
        <a href="https://www.bsmi.gov.tw/bsmiGIP/wSite/ct?ctNode=7804&amp;mp=1&amp;xItem=84769" target="_blank" rel="noopener noreferrer">標準檢驗局｜電壓調整器</a>
      </p>
    `;
    moreSection.insertAdjacentElement('afterend',guide);
  }

  function applyUiFixes(){
    ensureUiFixStyles();
    applyQuickControlFixes();
    moveItineraryModeSwitch();
    ensureElectricalGuide();
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
