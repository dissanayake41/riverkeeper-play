import {TOWN_CAPACITY} from './demography.mjs';

// Scenario assumptions, not calibrated Mahaweli demographic forecasts.
export const POPULATION_RULES={annualNaturalRate:.012,monthlyArrivalsPerTown:300,workforceShare:.55};
export function populationProjection(s,f,{days,severity,ready,canSupport}){
 const natural=s.population*(Math.pow(1+POPULATION_RULES.annualNaturalRate,days/365)-1);
 const hardship=s.population*.08*severity*days/(365/4);
 const pending=natural-hardship+(s.populationRemainder||0);
 const naturalChange=Math.max(-s.population,Math.trunc(pending));
 const basePopulation=s.population+naturalChange;
 const residents=Object.fromEntries(Object.entries(f.spatial.residents).map(([id,n])=>[id,s.population?n*basePopulation/s.population:0]));
 const sites=s.tiles.filter(t=>t.type==='town').map(t=>({id:t.id,space:Math.max(0,Math.floor(TOWN_CAPACITY-(residents[t.id]||0)))})).sort((a,b)=>(residents[a.id]||0)-(residents[b.id]||0)||a.id-b.id);
 const vacancies=sites.reduce((n,t)=>n+t.space,0),jobCapacity=Math.max(0,Math.floor(f.jobs/POPULATION_RULES.workforceShare-basePopulation));
 const rate=Math.floor(POPULATION_RULES.monthlyArrivalsPerTown*days/30);
 const potential=Math.min(jobCapacity,sites.reduce((n,t)=>n+Math.min(t.space,rate),0));
 function place(count){const result={...residents};for(const site of sites){const n=Math.min(count,site.space,rate);if(n)result[site.id]=(result[site.id]||0)+n;count-=n;if(!count)break;}return result;}
 let arrivals=0,reason=!ready?'Restore reliable water, food, power, wellbeing and housing first.':!vacancies?'Housing is full.':!jobCapacity?'Create jobs: existing residents have priority.':'No arrivals expected.';
 if(ready&&potential>0&&s.population>0){
  let lo=0,hi=potential;
  while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(canSupport(basePopulation+mid,place(mid)))lo=mid;else hi=mid-1;}
  arrivals=lo;reason=arrivals<potential?'Water allocation, local supply, food or power limits further arrivals.':'Arrivals supported by housing and jobs.';
 }
 return {version:'settlement-migration-2',natural,hardship,naturalChange,arrivals,potential,vacancies,jobCapacity,reason,populationChange:naturalChange+arrivals,populationRemainder:pending-naturalChange,nextResidents:place(arrivals)};
}
