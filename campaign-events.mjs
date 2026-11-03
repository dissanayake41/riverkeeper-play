import {monthLabel} from './calendar.mjs';
// Educational, basin-wide scenarios, not real Met Department forecasts or SWAT+ output.
export const SCENARIO_VERSION='preparedness-1';
export const CAMPAIGN_EVENTS=Object.freeze([
 {id:'rain-1',kind:'rain',announce:1,start:3,end:4,title:'Heavy-rain watch'},
 {id:'dry-1',kind:'dry',announce:4,start:6,end:8,title:'Extended dry spell'},
 {id:'rain-2',kind:'rain',announce:8,start:10,end:11,title:'Monsoon rain watch'},
 {id:'dry-2',kind:'dry',announce:13,start:15,end:17,title:'Low-flow season'},
 {id:'rain-3',kind:'rain',announce:19,start:21,end:22,title:'Heavy-rain return'}
].map(Object.freeze));
export const hasScenario=s=>s.scenarioVersion===SCENARIO_VERSION;
export const activeEvent=s=>hasScenario(s)&&!s.ended?CAMPAIGN_EVENTS.find(e=>s.turn>=e.start&&s.turn<=e.end)||null:null;
export const scheduledWeather=turn=>{const e=CAMPAIGN_EVENTS.find(e=>turn>=e.start&&turn<=e.end);return e?.kind==='dry'?-35:e?.kind==='rain'?35:0;};
export const eventWindow=e=>`${monthLabel(e.start)} – ${monthLabel(e.end)}`;
export function announcedEvents(s){return hasScenario(s)&&!s.ended?CAMPAIGN_EVENTS.filter(e=>e.announce<=s.turn&&s.turn<=e.end):[];}
export function eventClimate(s){const e=activeEvent(s);return {rainFactor:e?.kind==='dry'?.55:e?.kind==='rain'?1.3:1,erosionFactor:e?.kind==='rain'?1.8:1};}
export function eventCard(e,s){
 const active=s.turn>=e.start,dry=e.kind==='dry';
 return {id:'event-'+e.id,priority:active?94:82,agency:'Met Department · game scenario',level:active?'Prepare':'Watch',title:e.title,
  tip:`${active?'Active now':'Expected in '+(e.start-s.turn)+' months'} · ${eventWindow(e)}. ${dry?'Save water and food; review irrigation and keep river flows healthy.':'Protect steep farms with soil cover and river buffers; treat polluted runoff.'}`,
  evidence:`Fixed scenario ${e.id}; active months ${e.start+1}–${e.end+1}.`,advice:'Illustrative basin-wide outlook, not a real forecast or flood-inundation model.',panel:dry?'water':'build',action:dry?'Plan water use':'Review land protection'};
}
const clamp=x=>Math.max(0,Math.min(1,x));
export function assessEvent(s,{routed,foodRatio,energyRatio}){
 const e=activeEvent(s);if(!e)return null;
 const nodes=Object.values(routed.nodes),weighted=key=>nodes.reduce((n,x)=>n+clamp(x[key])*(x.referenceFlow||1),0)/nodes.reduce((n,x)=>n+(x.referenceFlow||1),0);
 const essential=Math.min(clamp(routed.worstHousehold),clamp(foodRatio),clamp(energyRatio));
 const flow=Math.min(...nodes.map(n=>clamp(n.flowCompliance))),quality=weighted('waterQuality'),soil=weighted('erosionIndex');
 const readiness=e.kind==='dry'?Math.min(essential,flow):Math.min(essential,quality,soil);
 const earned=essential>=.99?Math.round(40*clamp((readiness-.8)/.2)):0,lost=Math.round(120*(1-readiness));
 return {id:e.id,title:e.title,kind:e.kind,readiness,essential,flow,quality,soil,earned,lost,points:earned-lost,
  explanation:e.kind==='dry'?'Water, food and power delivered while maintaining ecological flow.':'Essential services, river water quality and soil protection during heavy rain.'};
}
export function applyEventScore(score,event){
 if(!event)return score;
 if(event.earned)score.rewards.push({id:'event-response',label:event.title+' · needs and nature protected',points:event.earned});
 if(event.lost)score.deductions.push({id:'event-response',label:event.title+' · unmet needs or environmental stress',points:event.lost,severity:1-event.readiness,streak:0,multiplier:1});
 score.earned+=event.earned;score.lost+=event.lost;score.points=score.earned-score.lost;score.total=score.points/10;score.event=event;return score;
}
