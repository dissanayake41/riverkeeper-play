// Static-host edition: the simulation and existing guest autosave stay local.
// Never present browser storage as an authenticated or verified account.
export function createBrowserSave({getState,toast}) {
 const button=document.createElement('button');
 button.id='player-button';button.className='player-button';
 button.textContent='On this device';button.setAttribute('aria-haspopup','dialog');
 document.querySelector('#game-window').append(button);
 const dialog=document.createElement('dialog');dialog.id='player-dialog';
 dialog.setAttribute('aria-labelledby','player-heading');document.body.append(dialog);
 function open(){
  const state=getState(),points=(state.scoreHistory||[]).reduce((n,h)=>n+Math.round(h.total*10),0);
  dialog.innerHTML=`<button class="player-close" aria-label="Close saved game">×</button><div class="player-eyebrow">RIVERKEEPER · BROWSER EDITION</div><h2 id="player-heading">Your basin, on this device.</h2><p class="player-description">Play all 24 months. Progress saves automatically in this browser when browser storage is available.</p><div class="player-progress"><span>${state.ended?'Campaign finished':'Month '+(state.turn+1)+' of 24'}</span><strong>${points.toLocaleString()} <small>points</small></strong></div><p>Your score is personal to this device. Online accounts, shared rankings and cross-device saves are not connected in this edition. Clearing browser data removes local progress.</p><div class="player-form-actions"><button class="player-primary" id="browser-return">Return to my basin</button><button id="browser-export">Download my progress</button></div><p class="player-description">Downloads are personal backups, not verified leaderboard entries.</p>`;
  dialog.querySelector('.player-close').onclick=()=>dialog.close();
  dialog.querySelector('#browser-return').onclick=()=>dialog.close();
  dialog.querySelector('#browser-export').onclick=()=>{
   const blob=new Blob([JSON.stringify({edition:'riverkeeper-browser',exportedAt:new Date().toISOString(),state:getState()},null,2)],{type:'application/json'});
   const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='riverkeeper-progress.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Your progress backup has been downloaded.');
  };
  if(!dialog.open)dialog.showModal();
 }
 button.onclick=open;
 const menu=document.querySelector('#player-menu');if(menu){menu.textContent='My progress · this device';menu.onclick=open;}
 return {playing:false,busy:false,ready:Promise.resolve(),open,restart(){}};
}
