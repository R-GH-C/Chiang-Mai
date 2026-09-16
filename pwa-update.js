(()=>{
  'use strict';
  if(!('serviceWorker' in navigator))return;

  let refreshing=false;
  const hadController=!!navigator.serviceWorker.controller;

  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(!hadController||refreshing)return;
    refreshing=true;
    location.reload();
  });

  async function checkForUpdate(){
    try{
      const reg=await navigator.serviceWorker.getRegistration();
      if(reg)await reg.update();
    }catch(e){
      console.warn('PWA update check failed',e);
    }
  }

  checkForUpdate();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkForUpdate();});
})();