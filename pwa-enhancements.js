(()=>{
  'use strict';

  const ACTIVE_CLASS='pwa-action-active';
  const WARNING_CLASS='pwa-action-warning';

  function addStyles(){
    if(document.getElementById('pwa-enhancement-styles'))return;
    const style=document.createElement('style');
    style.id='pwa-enhancement-styles';
    style.textContent=`
      .${ACTIVE_CLASS}{
        background:#e8f7ee!important;
        border-color:#2f855a!important;
        color:#17653b!important;
        box-shadow:0 0 0 2px rgba(47,133,90,.12) inset!important;
      }
      .${WARNING_CLASS}{
        background:#fff4e5!important;
        border-color:#c77800!important;
        color:#9a5a00!important;
      }
      .pwa-test-push-btn{margin-left:0}
      .pwa-test-push-btn[disabled]{opacity:.55;cursor:not-allowed}
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
    const {subscribe}=getActionButtons();
    if(!subscribe)return null;
    let btn=document.getElementById('testBackgroundPushBtn');
    if(btn)return btn;
    btn=document.createElement('button');
    btn.id='testBackgroundPushBtn';
    btn.type='button';
    btn.className='btn soft pwa-test-push-btn';
    btn.textContent='🔔 發送測試背景通知';
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
      const ready=active&&Notification.permission==='granted'&&!!api;
      testBtn.disabled=!ready;
      testBtn.title=ready?'立即由 Railway Push Server 發送一則真正的背景通知':'請先允許通知並啟用目前身份的背景課程提醒';
    }
  }

  async function sendTestBackgroundPush(){
    const api=window.getPushApiBase?.();
    if(!api){alert('尚未設定 Push Server 網址。');return;}
    if(Notification.permission!=='granted'){
      alert('請先允許通知。');return;
    }
    try{
      const reg=window.pwaRegistration||await navigator.serviceWorker.ready;
      const sub=await reg.pushManager.getSubscription();
      if(!sub){
        alert('目前裝置尚未建立背景 Push 訂閱，請先按「啟用背景課程提醒」。');
        refreshPwaActionStates();
        return;
      }
      const btn=document.getElementById('testBackgroundPushBtn');
      if(btn){btn.disabled=true;btn.textContent='正在發送…'}
      const res=await fetch(`${api}/api/test-push`,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({endpoint:sub.endpoint})
      });
      const data=await res.json().catch(()=>({}));
      if(!res.ok)throw new Error(data.error||`HTTP ${res.status}`);
      window.toast?.('測試背景通知已送出，請查看鎖定畫面');
    }catch(e){
      console.error(e);
      alert(`測試背景通知發送失敗：${e.message||e}`);
    }finally{
      const btn=document.getElementById('testBackgroundPushBtn');
      if(btn)btn.textContent='🔔 發送測試背景通知';
      refreshPwaActionStates();
    }
  }

  function wrapAsync(name){
    const original=window[name];
    if(typeof original!=='function'||original.__pwaEnhanced)return;
    const wrapped=async function(...args){
      try{return await original.apply(this,args)}
      finally{setTimeout(refreshPwaActionStates,0)}
    };
    wrapped.__pwaEnhanced=true;
    window[name]=wrapped;
  }

  function wrapSync(name){
    const original=window[name];
    if(typeof original!=='function'||original.__pwaEnhanced)return;
    const wrapped=function(...args){
      const result=original.apply(this,args);
      setTimeout(refreshPwaActionStates,0);
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
    refreshPwaActionStates();
    document.addEventListener('visibilitychange',()=>{
      if(!document.hidden)refreshPwaActionStates();
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
