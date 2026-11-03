import {announcedEvents,activeEvent,eventWindow,hasScenario} from './campaign-events.mjs';
import {icon} from './ui-icons.mjs';
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function createCampaignUI({getState,navigate}){
 const dialog=document.createElement('dialog');dialog.id='campaign-dialog';dialog.setAttribute('aria-labelledby','campaign-heading');document.body.append(dialog);
 const alert=document.createElement('button');alert.id='campaign-alert';alert.type='button';alert.setAttribute('aria-haspopup','dialog');document.querySelector('#game-window').append(alert);
 const goals=document.createElement('button');goals.className='quiet';goals.id='campaign-goals';goals.textContent='Campaign objectives & outlook';document.querySelector('#help').after(goals);
 let opener=null,ready=false,previousTurn=null,pending=false;
 function close(){dialog.close();}
 dialog.addEventListener('close',()=>opener?.isConnected&&opener.focus({preventScroll:true}));
 function open(html){opener=document.activeElement;dialog.innerHTML='<button class="campaign-close" aria-label="Close campaign briefing">'+icon('close')+'</button>'+html;dialog.querySelector('.campaign-close').onclick=close;if(!dialog.open)dialog.showModal();dialog.querySelector('[data-primary]')?.focus({preventScroll:true});dialog.scrollTop=0;}
 function objectives(){
  const s=getState();
  open(`<div class="campaign-kicker">RIVERKEEPER / YOUR MISSION</div><h2 id="campaign-heading">A thriving basin.<br><em>A lighter footprint.</em></h2><p class="campaign-lead">Lead Mahaweli through 24 months. Grow a community that its rivers and land can sustain.</p><div class="campaign-goals-grid">${[
   ['water','Balance essential needs','Keep water, food and electricity available as your population grows.'],
   ['ecology','Protect the living basin','Limit pollution and erosion. Leave enough water for river ecosystems.'],
   ['funds','Develop responsibly','Create jobs and income while covering construction and running costs.'],
   ['rain','Prepare before events arrive','Use early warnings to build reserves and protect vulnerable land.']
  ].map(([i,title,text])=>`<article>${icon(i)}<div><h3>${title}</h3><p>${text}</p></div></article>`).join('')}</div><div class="campaign-score-note">${icon('score')}<p><strong>Success is balance, not cash alone.</strong><br>Each month adds benefits and subtracts harm. During events, protected needs and nature earn up to 40 extra points; stress can subtract up to 120.</p></div><footer><span>${hasScenario(s)?'Two-month warnings · fixed game scenarios':'Saved campaign: earlier weather rules. Restart to play scheduled events.'}</span><button data-primary>${s.turn===0?'Begin planning':'Return to basin'} ${icon('right')}</button></footer>`);
  dialog.querySelector('[data-primary]').onclick=close;
 }
 function outlook(){
  const s=getState(),events=announcedEvents(s);
  open(`<div class="campaign-kicker">MET DEPARTMENT / GAME SCENARIO</div><h2 id="campaign-heading">Your basin outlook</h2><p class="campaign-lead">Plan now. The consequences settle when you finish each month.</p>${events.length?events.map(e=>`<article class="campaign-event ${e.kind}"><div class="campaign-event-symbol">${icon(e.kind==='dry'?'water':'rain')}</div><div><span>${s.turn>=e.start?'ACTIVE THIS MONTH':'STARTS IN '+(e.start-s.turn)+' MONTHS'}</span><h3>${esc(e.title)}</h3><strong>${esc(eventWindow(e))}</strong><p>${e.kind==='dry'?'Lower inflow and less rainfall for crops. Build food and water reserves, improve irrigation efficiency, and protect downstream river flow.':'Higher inflow, stronger erosion and nutrient wash-off. Protect steep farms, restore river buffers and treat wastewater.'}</p><button data-plan="${e.kind==='dry'?'water':'build'}">${e.kind==='dry'?'Review water allocation':'Review land protection'} ${icon('right')}</button></div></article>`).join(''):`<div class="campaign-quiet">${icon('cloud')}<h3>${s.ended?'Campaign complete':'No active warnings'}</h3><p>${hasScenario(s)?'Keep reserves and maintain services. New advisories appear two months before scheduled events.':'This saved campaign uses earlier weather rules. Start a fresh campaign for scheduled warnings.'}</p></div>`}<p class="campaign-disclaimer">Illustrative basin-wide scenarios, not official weather forecasts. Heavy rain changes runoff and erosion pressure; flood inundation is not simulated. Opening a warning awards no points.</p><footer><button data-primary>Back to planning ${icon('right')}</button></footer>`);
  dialog.querySelector('[data-primary]').onclick=close;dialog.querySelectorAll('[data-plan]').forEach(b=>b.onclick=()=>{close();navigate(b.dataset.plan);});
 }
 function observe(s){
  const events=announcedEvents(s),e=activeEvent(s)||events[0];alert.hidden=s.ended||!hasScenario(s);alert.dataset.kind=e?.kind||'quiet';
  alert.innerHTML=icon(e?.kind==='dry'?'water':e?'rain':'cloud')+`<span><small>${e?(s.turn>=e.start?'ACTIVE SCENARIO':'EARLY WARNING'):'BASIN OUTLOOK'}</small><strong>${e?esc(e.title):'No active warnings'}</strong>${e?`<span>${s.turn>=e.start?'Through '+esc(eventWindow(e).split(' – ')[1]):'In '+(e.start-s.turn)+' months'} · View plan ↗</span>`:''}</span>`;
  alert.setAttribute('aria-label',e?e.title+'. '+(s.turn>=e.start?'Active this month':'Starts in '+(e.start-s.turn)+' months')+'. View outlook.':'View basin outlook. No active warnings.');
  if(ready&&s.turn===0&&(previousTurn>0||pending)){pending=false;queueMicrotask(objectives);}
  previousTurn=s.turn;
 }
 alert.onclick=outlook;goals.onclick=objectives;
 return {observe,objectives,arm(){pending=true;},start(){ready=true;observe(getState());if(getState().turn===0)objectives();}};
}
