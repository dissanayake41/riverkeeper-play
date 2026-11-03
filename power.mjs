import {policyEffects} from './site-policies.mjs';
import {monthDays,monthIndex} from './calendar.mjs';
import {HYDRO_SITES} from './hydro-sites.mjs';
export {HYDRO_SITES};
// Community investment shares, not miniature coal/nuclear reactors.
// Cost/O&M benchmarks: EIA AEO2025 engineering report (2023 USD).
// 1 power-project credit represents $1,000 of benchmark investment/O&M.
// Old timers are accepted only so existing saves can be upgraded without loss.
export const LEGACY_BUILD_MONTHS={solar:12,wind:9,coal:36,hydro:36,nuclear:52};
export const POWER={
 solar:{name:'Solar plant',icon:'solar',mw:.1,capital:1502,fixed:20.23,variable:0,fuel:0,cf:.22,jobs:80,co2:48,withdrawal:0,consumption:0,habitat:.4},
 wind:{name:'Wind power',icon:'wind',mw:.2,capital:1489,fixed:33.06,variable:0,fuel:0,cf:.34,jobs:100,co2:11,withdrawal:0,consumption:0,habitat:.55},
 coal:{name:'Coal power plant',icon:'coal',mw:.3,capital:4103,fixed:61.6,variable:6.4,fuel:26,cf:.65,jobs:180,co2:820,withdrawal:609*.000003785411784,consumption:493*.000003785411784,habitat:.08},
 hydro:{name:'Hydropower',icon:'hydro',mw:.1,capital:7073,fixed:33.54,variable:0,fuel:0,cf:1,jobs:80,co2:24,withdrawal:0,consumption:0,habitat:.2},
 nuclear:{name:'Nuclear plant',icon:'nuclear',mw:.5,capital:7861,fixed:156.2,variable:2.52,fuel:9,cf:.91,jobs:220,co2:12,withdrawal:1101*.000003785411784,consumption:672*.000003785411784,habitat:.15}
};
export const isPower=type=>Object.hasOwn(POWER,type);
export function activatePowerProjects(s){let changed=false;for(const tile of s.tiles)if(isPower(tile.type)&&Object.hasOwn(tile,'remainingMonths')){delete tile.remainingMonths;changed=true;}return changed;}
export const powerCapital=type=>Math.ceil(POWER[type].mw*POWER[type].capital);
export function capacityFactor(s,t){
 const p=POWER[t.type],m=monthIndex(s.turn);
 // Seasonal profiles are explicit scenario assumptions, not local measured wind/solar.
 const factor=t.type==='solar'?[.95,1,1.12,1.1,1.02,.96,1,.98,.93,.86,.82,.9][m]:t.type==='wind'?[.8,.78,.82,.9,1.1,1.25,1.3,1.2,1.05,.9,.8,.78][m]:1;
 return Math.min(1,p.cf*factor);
}
export function potentialPower(s,t,staffing=1){return isPower(t.type)?POWER[t.type].mw*monthDays(s.turn)*24*capacityFactor(s,t)*staffing:0;}
export function powerPlacementIssue(s,id,type){
 if(type!=='hydro')return null;
 const site=HYDRO_SITES[id];if(!site)return 'Hydropower needs a screened river-and-head site. Use Find hydro site.';
 if(s.tiles.some(t=>t.id!==id&&t.type==='hydro'&&HYDRO_SITES[t.id]?.basinId===site.basinId))return 'This sub-basin already has a hydropower project.';
 return null;
}
export function powerPortfolio(s,f,routed){
 const plants=[];let generated=0,runningCost=0,co2Kg=0,coolingML=0,consumedML=0;
 for(const t of s.tiles.filter(t=>isPower(t.type))){
  const policy=policyEffects(t),p=POWER[t.type],site=HYDRO_SITES[t.id],node=routed.nodes[f.spatial.cellBasins[t.id]],potential=potentialPower(s,t,f.staffing);
  let output=potential;
  if(p.withdrawal)output*=node.powerRatio??0;
  if(t.type==='hydro')output=site?Math.min(potential,.002725*Math.max(0,node.outflow-node.environmentTarget)*site.headM*.85*f.staffing):0;
  const fixed=p.mw*p.fixed*monthDays(s.turn)/365,cost=fixed+output*(p.variable+p.fuel)/1000;
  plants.push({id:t.id,type:t.type,name:p.name,mw:p.mw,potentialMWh:potential,generatedMWh:output,cost,co2Kg:output*p.co2,coolingML:output*p.withdrawal*policy.coolingWithdrawal,consumedML:output*p.consumption*policy.coolingConsumption});
  generated+=output;runningCost+=cost;co2Kg+=output*p.co2;coolingML+=output*p.withdrawal*policy.coolingWithdrawal;consumedML+=output*p.consumption*policy.coolingConsumption;
 }
 for(const t of s.tiles){const mw=policyEffects(t).roofMW;if(!mw)continue;const output=mw*monthDays(s.turn)*24*capacityFactor(s,{type:'solar'}),carbon=output*POWER.solar.co2;
  generated+=output;co2Kg+=carbon;plants.push({id:t.id,type:'solar',name:'Rooftop solar',policy:'rooftop',mw,potentialMWh:output,generatedMWh:output,cost:0,co2Kg:carbon,coolingML:0,consumedML:0});
 }
 return {plants,generated,runningCost,co2Kg,coolingML,consumedML,intensity:generated?co2Kg/generated:0};
}
