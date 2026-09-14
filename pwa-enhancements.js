(()=>{
  'use strict';

  const ACTIVE_CLASS='pwa-action-active';
  const WARNING_CLASS='pwa-action-warning';
  const TEST_TOKEN_KEY='push_test_token';
  const DEFAULT_PUSH_API='https://striking-determination-production-6964.up.railway.app';
  const SHEET_SYNC_TAG='google-sheet-20260914';
  let testReadyAt=0;
  let adminScrollFrame=0;

  function ensureDefaultPushApi(){
    try{
      const current=String(window.stateGet?.('push_api_base','')||'').trim().replace(/\/$/,'');
      if(current)return current;
      window.stateSet?.('push_api_base',DEFAULT_PUSH_API);
    }catch(e){
      console.warn('Unable to persist default Push server URL',e);
    }
    return DEFAULT_PUSH_API;
  }

  function applyLatestSpreadsheetSync(){
    try{
      if(typeof DATA==='undefined'||typeof getRows!=='function')return;
      if(window.__cm26SpreadsheetSyncTag===SHEET_SYNC_TAG)return;
      window.__cm26SpreadsheetSyncTag=SHEET_SYNC_TAG;

      const rows=sheet=>DATA[sheet]||[];
      const includes=(v,q)=>String(v??'').includes(q);
      const findRow=(sheet,pred)=>rows(sheet).find(pred);
      const findIndex=(sheet,pred)=>rows(sheet).findIndex(pred);
      const addUnique=(sheet,row,keyIndex=1)=>{
        const a=rows(sheet);
        const key=String(row[keyIndex]??'').trim();
        if(!key||a.some(r=>String(r[keyIndex]??'').trim()===key))return false;
        a.push(row);
        return true;
      };
      const insertAfter=(sheet,pred,row,keyIndex=5)=>{
        const a=rows(sheet);
        const key=String(row[keyIndex]??'').trim();
        if(key&&a.some(r=>String(r[keyIndex]??'').trim()===key))return false;
        const idx=findIndex(sheet,pred);
        a.splice(idx>=0?idx+1:a.length,0,row);
        return true;
      };

      // 9/23：同步目前 Google Sheet 的住宿價格與 12:00 接駁資訊。
      const d923=findRow('09每日總覽',r=>r?.[0]==='2026-09-23');
      if(d923){
        d923[3]='入境→寄行李→Chai Lai（Central僅接駁延後且時間允許才去）';
        d923[6]='來源表記錄約12:00機場接駁；入境、行李寄送與接駁優先';
        d923[9]=2775;
        d923[10]='第一天不塞景點；Central只當接駁延後時的短暫備選';
      }

      const airporTels=findRow('10行程明細',r=>r?.[0]==='2026-09-23'&&includes(r?.[5],'機場大件行李寄送'));
      if(airporTels){
        airporTels[2]='入境後立即';
        airporTels[7]='完成入境與領行李後立即辦理2件大行李寄送到Himku；只留一晚包。';
        airporTels[10]='來源表記錄Chai Lai約12:00機場接；行李寄送完成後不要逗留。';
      }

      insertAfter('10行程明細',
        r=>r?.[0]==='2026-09-23'&&includes(r?.[5],'機場大件行李寄送'),
        ['2026-09-23','三','僅接駁延後且時間允許','商場','可調整','Central Chiangmai Airport','CNX附近','只有在Chai Lai接駁時間延後、且已完成行李寄送時才短逛或用餐；12:00接駁不變就直接略過。','室內，不受雨影響','護照、接駁聯絡方式','不可為了逛商場錯過Chai Lai接駁。','依消費',0,0,0,'餐飲/購物另計，不納入核心預算。','Google Sheet｜工作表1','高']
      );

      const chaiTransfer=findRow('10行程明細',r=>r?.[0]==='2026-09-23'&&includes(r?.[5],'Chai Lai Orchid接駁'));
      if(chaiTransfer){
        chaiTransfer[2]='約12:00（以飯店最終確認為準）';
        chaiTransfer[7]='來源表目前記錄12:00機場接；抵達後先入境、領行李與寄送大件行李，再依飯店最終集合資訊上車。';
        chaiTransfer[10]='若入境排隊或行李寄送延誤，立即聯絡飯店；Central直接取消。';
      }

      const chaiStay=findRow('10行程明細',r=>r?.[0]==='2026-09-23'&&includes(r?.[5],'Chai Lai Orchid入住'));
      if(chaiStay){
        chaiStay[14]=2775;
        chaiStay[15]='Google Sheet「住宿」最新價格 TWD2,775；不顯示訂單編號或旅客姓名。';
        chaiStay[16]='Google Sheet｜住宿';
      }

      const chaiTask=findRow('02出發前必做',r=>includes(r?.[3],'確認Chai Lai 9/23接駁'));
      if(chaiTask){
        chaiTask[4]='2人＋一晚包；來源表目前記錄12:00機場接';
        chaiTask[8]='出發前再向飯店確認12:00是否為最終時間、集合點與延誤聯絡方式';
      }

      // 9/25：補回 Google Sheet 中的 CHOR POTCHANA。
      insertAfter('10行程明細',
        r=>r?.[0]==='2026-09-25'&&includes(r?.[5],'SAAO BAHTs / Baan104'),
        ['2026-09-25','五','回市區後','餐飲','可調整','CHOR POTCHANA','市區','Skyline回程時間合適才去；與Warorot附近餐飲擇一，不為了打卡繞路。','雨天可保留','現金','來源表記錄脆皮豬、營業約07:00–15:00；太晚直接跳過。','已含當日餐飲彈性',0,0,0,'與既有餐飲預算擇一，不重複加總。','Google Sheet｜工作表1','中']
      );

      // 9/26：把 Antique Massage 放回當日可選行程。
      insertAfter('10行程明細',
        r=>r?.[0]==='2026-09-26'&&includes(r?.[5],'Wua Lai Saturday Walking Street'),
        ['2026-09-26','六','夜市後／依體力','按摩','可調整','Antique Massage and Spa','Wua Lai／市區','週六夜市後若有體力再做；確認分店後再前往。','雨天可提前改按摩','分店定位、預約資料','不要訂錯分店；若已很累就回飯店。','已含當日彈性',0,0,0,'與其他按摩/晚間消費擇一，不重複加總。','Google Sheet｜工作表1＋按摩','中']
      );

      // 9/27：明確列出來源表的次市集候選，並補芒果糯米飯。
      const secondaryMarket=findRow('10行程明細',r=>r?.[0]==='2026-09-27'&&includes(r?.[5],'Coconut / 麵包 / 跳蚤市集'));
      if(secondaryMarket){
        secondaryMarket[5]='Coconut Market / 麵包市集 / 跳蚤市集';
        secondaryMarket[7]='真心市集後只挑一個次市集；依當週營業、天氣與順路程度決定，不三個全跑。';
        secondaryMarket[10]='來源表同時列出多個週日市集，因此保留「只選一個」原則。';
        secondaryMarket[16]='Google Sheet｜工作表1';
      }
      insertAfter('10行程明細',
        r=>r?.[0]==='2026-09-27'&&includes(r?.[5],'Mainiji / be joyful'),
        ['2026-09-27','日','下午／17:00前','甜點','可調整',"Mana's Best Mango Sticky Rice",'舊城周邊','咖啡/選物動線順路才吃，並保留17:00後週日夜市時間。','大雨直接略過','現金','來源表記錄約10:30–17:00；太晚不追。','已含當日餐飲彈性',0,0,0,'與當日餐飲預算擇一。','Google Sheet｜工作表1','中']
      );

      // 10/1：補回尼曼 Soi 9 的 CHARLIE THAI TEA x KAME KAFE。
      insertAfter('10行程明細',
        r=>r?.[0]==='2026-10-01'&&includes(r?.[5],'Nimman House Massage'),
        ['2026-10-01','四','下午–傍晚','飲品','可調整','CHARLIE THAI TEA x KAME KAFE - Nimman Soi 9','Nimman','尼曼逛街順路才停；不影響按摩與White Market。','雨天可保留','定位收藏','同區順路即可，不跨區追店。','已含當日餐飲彈性',0,0,0,'與既有飲品/餐飲預算擇一。','Google Sheet｜工作表1','中']
      );

      // 10/2：來源表已明列 Friday Vintage Market 13:00–22:00，但仍保留出發前官方複核。
      const d1002=findRow('09每日總覽',r=>r?.[0]==='2026-10-02');
      if(d1002){
        d1002[3]='Warorot→Jing Jai Vintage Market→Baan Landai';
        d1002[6]='來源表記錄復古市集13:00–22:00；10/1再查當週官方公告';
        d1002[10]='上午採買、下午復古市集、晚餐後回飯店打包';
      }
      const friday=findRow('10行程明細',r=>r?.[0]==='2026-10-02'&&includes(r?.[5],'Jing Jai Friday'));
      if(friday){
        friday[2]='13:00–22:00';
        friday[4]='推薦';
        friday[5]='Jing Jai Vintage Market 真心市集－復古市集';
        friday[7]='來源表已列Friday復古市集13:00–22:00；Warorot後視體力前往，晚餐前離開。';
        friday[8]='未舉辦或大雨：MAIIAM / One Nimman。';
        friday[9]='10/1官方公告截圖';
        friday[10]='仍於10/1查當週官方公告，避免臨時停辦。';
        friday[16]='Google Sheet｜工作表1＋Jing Jai官方再查';
        friday[17]='中';
      }

      // 更新原始資料面板中的住宿/預算數字，不帶入訂單編號與旅客姓名。
      const orderChai=findRow('13訂單付款',r=>includes(r?.[1],'Chai Lai Orchid'));
      if(orderChai){
        orderChai[4]=2775;
        orderChai[10]='Google Sheet「住宿」最新價格；訂單編號與旅客姓名不放入旅行控制台。';
      }
      const budgetCore=findRow('12預算中心',r=>r?.[5]==='核心行程合計');
      if(budgetCore){budgetCore[8]=21427;budgetCore[9]=63146.68;}
      const budgetStay=findRow('12預算中心',r=>r?.[5]==='住宿已知');
      if(budgetStay){budgetStay[8]=19115;budgetStay[9]=19115;}
      const budget923=findRow('12預算中心',r=>r?.[0]==='2026-09-23');
      if(budget923){budget923[3]=2775;budget923[4]=5365.08;}

      // 候選庫同步：保留來源表的新店家，但不把候選變成必跑行程。
      const neng=findRow('17吃喝按摩購物',r=>r?.[1]==='Neng Roasted Pork');
      if(neng)neng[2]='9/24–9/25市區';
      const joost=findRow('17吃喝按摩購物',r=>r?.[1]==='Joost Smoothies');
      if(joost)joost[2]='9/24–9/25市區';
      addUnique('17吃喝按摩購物',['餐飲','CHOR POTCHANA','9/25','來源表約07:00–15:00','200–500 THB','可選','Skyline回市區後順路才去','—','脆皮豬；太晚直接跳過']);
      addUnique('17吃喝按摩購物',['甜點',"Mana's Best Mango Sticky Rice",'9/27舊城','來源表約10:30–17:00','120–300 THB','可選','週日夜市前順路','—','17:00後不追店']);
      addUnique('17吃喝按摩購物',['餐飲','Aoyjai Kitchen','9/29舊城','來源表11:30–17:00','250–500 THB','可選','寺廟日前段或餐飲替代','—','打拋海鮮飯']);
      addUnique('17吃喝按摩購物',['飲品','CHARLIE THAI TEA x KAME KAFE','10/1 Nimman','Nimman Soi 9','150–350 THB','可選','尼曼逛街順路','—','不影響White Market與按摩']);
      addUnique('17吃喝按摩購物',['餐飲','Khum Hmon Somm','備選','來源表列為未用到候選','依現場','備選','臨時空檔','—','泰北豬肉麵']);

      // 重新建立已在主程式初始化過的衍生陣列，讓目前畫面立即使用新資料。
      if(typeof daily!=='undefined'&&Array.isArray(daily))daily.splice(0,daily.length,...getRows('09每日總覽'));
      if(typeof events!=='undefined'&&Array.isArray(events))events.splice(0,events.length,...getRows('10行程明細'));
      if(typeof tasks!=='undefined'&&Array.isArray(tasks))tasks.splice(0,tasks.length,...getRows('02出發前必做'));

      try{renderHome();renderItinerary();renderBudget();renderMore();}catch(e){console.warn('Spreadsheet sync render refresh failed',e)}
    }catch(e){
      console.error('Google Sheet itinerary sync failed',e);
    }
  }

  function addStyles(){
    if(document.getElementById('pwa-enhancement-styles'))return;
    const style=document.createElement('style');
    style.id='pwa-enhancement-styles';
    style.textContent=`
      .${ACTIVE_CLASS}{background:#e8f7ee!important;border-color:#2f855a!important;color:#17653b!important;box-shadow:0 0 0 2px rgba(47,133,90,.12) inset!important}
      .${WARNING_CLASS}{background:#fff4e5!important;border-color:#c77800!important;color:#9a5a00!important}
      .pwa-test-push-btn{margin-left:0}
      .pwa-test-push-btn[disabled]{opacity:.55;cursor:not-allowed}
      #dayDetail{scroll-margin-top:92px}
      .admin-user-preview .personal-card{
        max-height:min(52vh,430px);overflow-y:scroll;overscroll-behavior:contain;
        scrollbar-gutter:stable;padding-right:18px;-webkit-overflow-scrolling:touch;
        --admin-scroll-thumb-top:18px;--admin-scroll-thumb-h:64px
      }
      .admin-user-preview .personal-card.has-admin-scroll{
        background-image:
          linear-gradient(#475467,#475467),
          linear-gradient(#e4e7ec,#e4e7ec);
        background-position:
          calc(100% - 6px) var(--admin-scroll-thumb-top),
          calc(100% - 6px) 18px;
        background-size:
          5px var(--admin-scroll-thumb-h),
          5px calc(100% - 36px);
        background-repeat:no-repeat;
        box-shadow:var(--shadow),inset -13px 0 0 rgba(242,244,247,.72)
      }
      .admin-user-preview .personal-card::-webkit-scrollbar{width:8px}
      .admin-user-preview .personal-card::-webkit-scrollbar-track{background:#eef2f6;border-radius:999px}
      .admin-user-preview .personal-card::-webkit-scrollbar-thumb{background:#667085;border-radius:999px;border:2px solid #eef2f6}
      @media(max-width:720px){
        .admin-user-preview .personal-card{max-height:min(48vh,380px);padding-right:20px}
        .admin-user-preview .personal-card.has-admin-scroll{
          background-position:
            calc(100% - 7px) var(--admin-scroll-thumb-top),
            calc(100% - 7px) 18px;
          background-size:
            6px var(--admin-scroll-thumb-h),
            6px calc(100% - 36px)
        }
      }
    `;
    document.head.appendChild(style);
  }

  function getIdentity(){
    try{return window.currentAuth?.()?.identity||null}catch(e){return null}
  }

  function pushIsActive(){
    try{
      const identity=getIdentity();
      const ids=new Set(window.stateGet?.('push_identities',[])||[]);
      return !!identity&&ids.has(identity);
    }catch(e){return false}
  }

  function getActionButtons(){
    return {
      notify:document.querySelector('button[onclick="requestNotifyPermission()"]'),
      subscribe:document.querySelector('button[onclick="subscribePush()"]'),
      unsubscribe:document.querySelector('button[onclick="unsubscribePush()"]')
    };
  }

  function ensureTestButton(){
    const identity=getIdentity();
    let btn=document.getElementById('testBackgroundPushBtn');
    if(identity!=='admin'){
      if(btn)btn.remove();
      return null;
    }
    const {subscribe}=getActionButtons();
    if(!subscribe)return null;
    if(btn)return btn;
    btn=document.createElement('button');
    btn.id='testBackgroundPushBtn';
    btn.type='button';
    btn.className='btn soft pwa-test-push-btn';
    btn.textContent='🔔 10 秒後測試背景通知';
    btn.addEventListener('click',sendTestBackgroundPush);
    subscribe.insertAdjacentElement('afterend',btn);
    return btn;
  }

  function refreshPwaActionStates(){
    addStyles();
    ensureDefaultPushApi();
    const {notify,subscribe}=getActionButtons();
    const testBtn=ensureTestButton();

    if(notify){
      notify.classList.remove(ACTIVE_CLASS,WARNING_CLASS);
      if(!('Notification' in window)){
        notify.textContent='此裝置不支援通知';
        notify.disabled=true;
      }else if(Notification.permission==='granted'){
        notify.textContent='✓ 通知已允許';
        notify.classList.add(ACTIVE_CLASS);
        notify.disabled=true;
      }else if(Notification.permission==='denied'){
        notify.textContent='⚠ 通知已拒絕';
        notify.classList.add(WARNING_CLASS);
        notify.disabled=true;
      }else{
        notify.textContent='允許通知';
        notify.disabled=false;
      }
    }

    const active=pushIsActive();
    if(subscribe){
      subscribe.classList.toggle(ACTIVE_CLASS,active);
      subscribe.textContent=active?'✓ 背景課程提醒已啟用':'啟用背景課程提醒';
      subscribe.disabled=active;
    }

    const hint=document.getElementById('pwaHint');
    if(hint&&(location.protocol==='https:'||location.hostname==='localhost')){
      hint.textContent='背景通知伺服器已預先設定；Richard / Angel 可直接允許通知並啟用背景課程提醒。';
    }

    if(testBtn){
      const api=window.getPushApiBase?.()||DEFAULT_PUSH_API;
      const remaining=Math.max(0,Math.ceil((testReadyAt-Date.now())/1000));
      const ready=active&&Notification.permission==='granted'&&!!api&&remaining===0;
      testBtn.disabled=!ready;
      testBtn.textContent=remaining>0?`請稍候 ${remaining} 秒`:'🔔 10 秒後測試背景通知';
      testBtn.title=ready?'按下後 10 秒才發送，請立即鎖定螢幕':'請先允許通知並啟用目前身份的背景課程提醒';
    }
  }

  function getTestToken(){
    let token='';
    try{token=String(window.stateGet?.(TEST_TOKEN_KEY,'')||'')}catch(e){}
    if(token)return token;
    token=prompt('第一次測試請輸入「背景通知測試金鑰」。輸入後會只儲存在此裝置。')||'';
    token=token.trim();
    if(token){try{window.stateSet?.(TEST_TOKEN_KEY,token)}catch(e){}}
    return token;
  }

  function startTestCooldown(seconds){
    const s=Math.max(1,Number(seconds)||15);
    testReadyAt=Date.now()+s*1000;
    refreshPwaActionStates();
    const timer=setInterval(()=>{
      refreshPwaActionStates();
      if(Date.now()>=testReadyAt)clearInterval(timer);
    },1000);
  }

  async function sendTestBackgroundPush(){
    if(getIdentity()!=='admin'){
      alert('測試背景通知僅限管理員使用。');
      return;
    }
    const api=window.getPushApiBase?.()||DEFAULT_PUSH_API;
    if(!api){alert('尚未設定 Push Server 網址。');return;}
    if(Notification.permission!=='granted'){alert('請先允許通知。');return;}
    const token=getTestToken();
    if(!token)return;
    try{
      const reg=window.pwaRegistration||await navigator.serviceWorker.ready;
      const sub=await reg.pushManager.getSubscription();
      if(!sub){
        alert('目前裝置尚未建立背景 Push 訂閱，請先按「啟用背景課程提醒」。');
        refreshPwaActionStates();
        return;
      }
      const btn=document.getElementById('testBackgroundPushBtn');
      if(btn){btn.disabled=true;btn.textContent='正在排程…'}
      const res=await fetch(`${api}/api/test-push`,{
        method:'POST',
        headers:{'Content-Type':'application/json','X-Test-Token':token},
        body:JSON.stringify({endpoint:sub.endpoint})
      });
      const data=await res.json().catch(()=>({}));
      if(res.status===401){
        try{window.stateSet?.(TEST_TOKEN_KEY,'')}catch(e){}
        throw new Error('測試金鑰錯誤，已清除，請重新輸入');
      }
      if(res.status===429){
        const seconds=Number(data.retryAfterSeconds||res.headers.get('Retry-After')||15);
        startTestCooldown(seconds);
        throw new Error(`請等待 ${seconds} 秒後再試`);
      }
      if(!res.ok)throw new Error(data.error||`HTTP ${res.status}`);
      startTestCooldown(data.cooldownSeconds||15);
      const delay=Number(data.delaySeconds||10);
      alert(`測試通知已排程，將在 ${delay} 秒後發送。\n\n請現在立刻鎖定 iPhone 螢幕，等待通知出現。`);
    }catch(e){
      console.error(e);
      alert(`測試背景通知發送失敗：${e.message||e}`);
    }finally{
      refreshPwaActionStates();
    }
  }

  function scrollToItineraryStart(){
    const target=document.getElementById('dayDetail');
    if(!target)return;
    target.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function wrapDaySelection(){
    const original=window.selectDay;
    if(typeof original!=='function'||original.__itineraryAnchorEnhanced)return;
    const wrapped=function(...args){
      const result=original.apply(this,args);
      setTimeout(scrollToItineraryStart,80);
      return result;
    };
    wrapped.__itineraryAnchorEnhanced=true;
    window.selectDay=wrapped;
  }

  function updateAdminScrollVisual(card){
    if(!card)return;
    const overflow=Math.max(0,card.scrollHeight-card.clientHeight);
    const hasOverflow=overflow>2;
    card.classList.toggle('has-admin-scroll',hasOverflow);
    if(!hasOverflow)return;

    const trackHeight=Math.max(1,card.clientHeight-36);
    const thumbHeight=Math.max(48,Math.min(trackHeight,Math.round(trackHeight*(card.clientHeight/card.scrollHeight))));
    const maxThumbTop=Math.max(0,trackHeight-thumbHeight);
    const thumbTop=18+(overflow?Math.round((card.scrollTop/overflow)*maxThumbTop):0);
    card.style.setProperty('--admin-scroll-thumb-top',`${thumbTop}px`);
    card.style.setProperty('--admin-scroll-thumb-h',`${thumbHeight}px`);
  }

  function syncAdminScrollVisuals(){
    document.querySelectorAll('.admin-user-preview .personal-card').forEach(card=>{
      if(!card.__adminScrollVisualBound){
        card.addEventListener('scroll',()=>updateAdminScrollVisual(card),{passive:true});
        card.__adminScrollVisualBound=true;
      }
      updateAdminScrollVisual(card);
    });
  }

  function queueAdminScrollVisuals(){
    if(adminScrollFrame)return;
    adminScrollFrame=requestAnimationFrame(()=>{
      adminScrollFrame=0;
      syncAdminScrollVisuals();
    });
  }

  function wrapAsync(name){
    const original=window[name];
    if(typeof original!=='function'||original.__pwaEnhanced)return;
    const wrapped=async function(...args){
      const identityBefore=getIdentity();
      const activeBefore=name==='subscribePush'?pushIsActive():false;
      try{
        const result=await original.apply(this,args);
        if(name==='subscribePush'&&!activeBefore&&pushIsActive()&&(identityBefore==='richard'||identityBefore==='angel')){
          alert('背景課程提醒已啟用。\n\n系統會在約 10 秒後自動發送一則確認通知，請現在鎖定手機螢幕確認是否收到。');
        }
        return result;
      }finally{
        setTimeout(()=>{refreshPwaActionStates();queueAdminScrollVisuals();},0);
      }
    };
    wrapped.__pwaEnhanced=true;
    window[name]=wrapped;
  }

  function wrapSync(name){
    const original=window[name];
    if(typeof original!=='function'||original.__pwaEnhanced)return;
    const wrapped=function(...args){
      const result=original.apply(this,args);
      setTimeout(()=>{refreshPwaActionStates();queueAdminScrollVisuals();},0);
      return result;
    };
    wrapped.__pwaEnhanced=true;
    window[name]=wrapped;
  }

  function init(){
    ensureDefaultPushApi();
    applyLatestSpreadsheetSync();
    addStyles();
    wrapAsync('requestNotifyPermission');
    wrapAsync('subscribePush');
    wrapAsync('unsubscribePush');
    wrapSync('renderPwaPanel');
    wrapSync('refreshAuthenticatedUI');
    wrapDaySelection();
    try{window.renderPwaPanel?.()}catch(e){console.warn(e)}
    refreshPwaActionStates();
    queueAdminScrollVisuals();

    const observer=new MutationObserver(()=>queueAdminScrollVisuals());
    observer.observe(document.body,{childList:true,subtree:true});
    window.addEventListener('resize',queueAdminScrollVisuals,{passive:true});
    document.addEventListener('visibilitychange',()=>{
      if(!document.hidden){refreshPwaActionStates();queueAdminScrollVisuals();}
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
