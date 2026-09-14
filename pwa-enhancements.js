(()=>{
  'use strict';

  const ACTIVE_CLASS='pwa-action-active';
  const WARNING_CLASS='pwa-action-warning';
  const TEST_TOKEN_KEY='push_test_token';
  let testReadyAt=0;
  let adminScrollFrame=0;

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

    if(testBtn){
      const api=window.getPushApiBase?.()||'';
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
    const api=window.getPushApiBase?.();
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
    addStyles();
    wrapAsync('requestNotifyPermission');
    wrapAsync('subscribePush');
    wrapAsync('unsubscribePush');
    wrapSync('renderPwaPanel');
    wrapSync('refreshAuthenticatedUI');
    wrapDaySelection();
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
