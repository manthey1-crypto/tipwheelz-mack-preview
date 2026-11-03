/* TipWheelz currently installs no optional analytics or advertising scripts.
   This records a local opt-out, never an opt-in. New integrations require a
   separate audit and consent gate; this code is not an arbitrary-script blocker. */
(() => {
  'use strict';
  const key='tipwheelz_privacy_v1', lifetime=180*24*60*60*1000;
  const notice=document.getElementById('tw-cookie-notice');
  const dialog=document.getElementById('tw-cookie-settings');
  if(!notice || !dialog) return;
  let lastFocus=null;
  const gpc=()=>navigator.globalPrivacyControl===true;
  function readChoice(){
    try {
      const value=JSON.parse(localStorage.getItem(key));
      return value?.version===1 && value.analytics===false && value.advertising===false &&
        typeof value.savedAt==='number' && value.savedAt<=Date.now() && Date.now()-value.savedAt<lifetime ? value : null;
    } catch {return null;}
  }
  function update(){
    notice.hidden=Boolean(readChoice()) || gpc();
    document.getElementById('tw-cookie-gpc').hidden=!gpc();
    document.getElementById('tw-cookie-signal').textContent=gpc()
      ? 'Global Privacy Control is on. Your opt-out is honored; optional tracking remains off.'
      : 'Optional analytics and advertising remain off, including before you make a choice.';
    document.getElementById('tw-cookie-footer-status').textContent=gpc()
      ? 'Global Privacy Control honored · Optional tracking off'
      : readChoice() ? 'Optional cookies rejected' : '';
  }
  function reject(){
    let saved=false;
    try {
      localStorage.setItem(key,JSON.stringify({version:1,analytics:false,advertising:false,saleOrSharing:false,savedAt:Date.now()}));
      saved=true;
    } catch {}
    notice.hidden=true;
    document.getElementById('tw-cookie-saved').textContent=saved
      ? 'Your choice is saved for 180 days in this browser. Optional tracking is off.'
      : 'Optional tracking is off. Your browser prevented saving the choice, so this notice may appear again.';
    document.getElementById('tw-cookie-footer-status').textContent=gpc()
      ? 'Global Privacy Control honored · Optional tracking off'
      : saved ? 'Optional cookies rejected' : 'Optional tracking off · Choice could not be saved';
    window.dispatchEvent(new CustomEvent('tipwheelz:privacychange',{detail:{analytics:false,advertising:false,saleOrSharing:false,globalPrivacyControl:gpc()}}));
    if(dialog.open) dialog.close();
    else document.querySelector('.tw-cookie-footer [data-tw-settings]').focus({preventScroll:true});
  }
  document.querySelectorAll('[data-tw-reject]').forEach(button=>button.addEventListener('click',reject));
  document.querySelectorAll('[data-tw-settings]').forEach(button=>button.addEventListener('click',()=>{
    lastFocus=button;
    update();
    document.getElementById('tw-cookie-saved').textContent='';
    if(!dialog.open) dialog.showModal();
  }));
  document.querySelector('[data-tw-close]').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{
    const target=lastFocus?.isConnected && !lastFocus.closest('[hidden]') ? lastFocus : document.querySelector('.tw-cookie-footer [data-tw-settings]');
    target.focus({preventScroll:true});
  });
  window.addEventListener('storage',event=>{if(event.key===key || event.key===null)update();});
  window.addEventListener('pageshow',update);
  update();
})();
