(()=>{
  'use strict';
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
})();
