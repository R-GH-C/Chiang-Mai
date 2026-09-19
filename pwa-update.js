/* v16 update guard: never silently reload a page while a form is being edited.
 * The browser can activate a new service worker; the current page reloads only
 * after the user explicitly presses "更新". Local edits already saved to
 * storage remain intact; unfinished form inputs are not discarded by surprise.
 */
(()=>{
  'use strict';
  if(!('serviceWorker' in navigator))return;
  const hadController=!!navigator.serviceWorker.controller;
  let banner;
  function showUpdateAvailable(){
    if(banner||!hadController)return;
    banner=document.createElement('div');
    banner.id='cm26UpdateReady';
    banner.setAttribute('role','status');
    banner.style.cssText='position:fixed;z-index:200;left:12px;right:12px;bottom:calc(74px + env(safe-area-inset-bottom));max-width:720px;margin:auto;background:#17365d;color:#fff;border-radius:14px;box-shadow:0 8px 28px #0004;padding:12px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;';
    const message=document.createElement('span');
    message.textContent='清邁 2026 有新版本，請先儲存正在輸入的資料。';
    const button=document.createElement('button');
    button.type='button';button.textContent='儲存後更新';
    button.style.cssText='border:0;background:white;color:#17365d;border-radius:9px;padding:8px 12px;font-weight:800;';
    button.addEventListener('click',()=>{
      const active=document.activeElement;
      const editing=!!document.querySelector('#cmItineraryModal.open, .cm-note-layer.show, .cm-ledger-layer.show, [role="dialog"].open');
      const unsaved=!!(active&&active.matches?.('textarea,input,[contenteditable="true"]')&&active.closest?.('form'));
      if(editing||unsaved){alert('請先儲存並關閉正在編輯的表單，再更新 App。');return;}
      location.reload();
    });
    banner.append(message,button);document.body.appendChild(banner);
  }
  navigator.serviceWorker.addEventListener('controllerchange',showUpdateAvailable);
  async function checkForUpdate(){
    try{const reg=await navigator.serviceWorker.getRegistration();if(reg)await reg.update();}
    catch(e){console.warn('PWA update check failed',e);}
  }
  checkForUpdate();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkForUpdate();});
})();