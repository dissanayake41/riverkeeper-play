import {basinBriefing} from './basin-adviser.mjs';
import {createBinduCharacter} from './bindu-character.mjs';

export function createAdviser({getState,navigate,locate,showReport}){
 const dock=document.createElement('button');dock.id='bindu-dock';dock.type='button';dock.setAttribute('aria-label','Ask Bindu for a basin briefing');dock.setAttribute('aria-haspopup','dialog');dock.innerHTML='<span class="bindu-mini"></span><span class="bindu-caption">Bindu <b>Tips</b></span>';
 document.querySelector('#game-window').append(dock);
 const dialog=document.createElement('dialog');dialog.id='bindu-dialog';dialog.setAttribute('aria-labelledby','bindu-heading');dialog.setAttribute('aria-describedby','bindu-tip');
 dialog.innerHTML='<div class="bindu-character-stage"><div class="bindu-orbit"></div><div class="bindu-portrait"></div><span class="bindu-name">BINDU</span></div><section class="bindu-bubble"><button class="bindu-close" aria-label="Close Bindu briefing">×</button><div class="bindu-meta"><span id="bindu-period"></span><span id="bindu-level"></span></div><div class="bindu-message" aria-live="polite" aria-atomic="true"><h2 id="bindu-heading"></h2><p id="bindu-tip"></p></div><div class="bindu-actions"><button id="bindu-action"></button><button id="bindu-ready">Got it</button></div><div class="bindu-bottom"><button id="bindu-results">Month results</button><div class="bindu-pages"><button id="bindu-prev" aria-label="Previous tip">‹</button><span id="bindu-count"></span><button id="bindu-next" aria-label="Next tip">›</button></div></div></section>';
 document.body.append(dialog);
 const mapButton=document.createElement('button');mapButton.id='bindu-map';mapButton.type='button';mapButton.hidden=true;dialog.querySelector('.bindu-message').after(mapButton);
 let character,reportAction=null,opener=null,briefing,index=0,fallback;
 const mini=dock.querySelector('.bindu-mini'),portrait=dialog.querySelector('.bindu-portrait');
 try{character=createBinduCharacter(mini);}catch(error){fallback=document.createElement('span');fallback.innerHTML='<svg viewBox="0 0 100 120" role="img" aria-label="Bindu water-drop companion"><path fill="#0297a6" d="M50 5C48 34 15 50 15 76a35 35 0 0 0 70 0C85 50 55 34 50 5Z"/><ellipse cx="39" cy="73" rx="6" ry="9" fill="white"/><ellipse cx="61" cy="73" rx="6" ry="9" fill="white"/><path d="M39 91q11 10 22 0" fill="none" stroke="white" stroke-width="4"/></svg>';mini.append(fallback);console.warn('Bindu 3D unavailable; tips remain available.',error);}
 const close=()=>dialog.close();
 dialog.addEventListener('close',()=>{dock.hidden=false;character?.mount(mini);if(fallback)mini.append(fallback);if(dialog.contains(document.activeElement)||document.activeElement===document.body)opener?.focus?.({preventScroll:true});});
 dialog.querySelector('.bindu-close').onclick=close;dialog.querySelector('#bindu-ready').onclick=close;
 dialog.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}});
 dialog.querySelector('#bindu-results').onclick=()=>{close();reportAction?.();};
 function showTip(){
  const c=briefing.cards[index];dialog.querySelector('#bindu-heading').textContent=c.title;
  dialog.querySelector('#bindu-tip').textContent=c.tip||c.advice;
  dialog.querySelector('#bindu-level').textContent=c.id.includes('outlook')?'Game outlook':c.level;
  dialog.dataset.priority=c.level==='Act now'?'urgent':'normal';
  dialog.querySelector('#bindu-count').textContent=(index+1)+' / '+briefing.cards.length;
  dialog.querySelector('#bindu-prev').disabled=index===0;dialog.querySelector('#bindu-next').disabled=index===briefing.cards.length-1;
  dialog.querySelector('.bindu-pages').hidden=briefing.cards.length<2;
  mapButton.hidden=!c.basinId;mapButton.textContent=c.basinId?'Show sub-basin '+Number(c.basinId.replace('SB-',''))+' on map ↗':'';mapButton.onclick=()=>{close();locate?.(c.basinId);};
  const action=dialog.querySelector('#bindu-action');action.textContent=c.action+' ↗';action.onclick=()=>{close();navigate(c.panel,c.cellId,c.basinId);};
  character?.instruct();
 }
 dialog.querySelector('#bindu-next').onclick=()=>{if(index<briefing.cards.length-1){index++;showTip();}};
 dialog.querySelector('#bindu-prev').onclick=()=>{if(index>0){index--;showTip();}};
 function present(s=getState(),results=null){
  briefing=basinBriefing(s);index=0;reportAction=results||(s.lastReport?showReport:null);if(!dialog.contains(document.activeElement))opener=document.activeElement;
  dialog.querySelector('#bindu-period').textContent=briefing.period;
  dialog.querySelector('#bindu-results').hidden=!reportAction;dialog.querySelector('#bindu-results').textContent=s.ended?'Final report':'Month results';
  dock.hidden=true;if(!dialog.open)dialog.show();character?.mount(portrait);if(fallback)portrait.append(fallback);showTip();
  dialog.querySelector('.bindu-close').focus({preventScroll:true});
 }
 dock.onclick=()=>present();
 function refresh(projection){if(!dialog.open)return;const s=getState(),previous=briefing.cards[index]?.id;briefing=basinBriefing(s,projection);index=Math.max(0,briefing.cards.findIndex(c=>c.id===previous));reportAction=s.lastReport?showReport:null;dialog.querySelector('#bindu-period').textContent=briefing.period;dialog.querySelector('#bindu-results').hidden=!reportAction;dialog.querySelector('#bindu-results').textContent=s.ended?'Final report':'Month results';showTip();}
 return {present,refresh};
}
