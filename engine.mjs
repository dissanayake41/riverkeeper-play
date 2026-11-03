import {SCENARIO_VERSION,hasScenario,scheduledWeather,assessEvent,applyEventScore} from './campaign-events.mjs';
import {waterService} from './service-diagnostics.mjs';
import {POPULATION_RULES,populationProjection} from './population.mjs';
import {SQUARE_GEOGRAPHY,SQUARE_CELL_MAP,SQUARE_HYDRO_SITES} from './hex-migration.mjs';
import {SITE_POLICIES,policiesFor,policyEffects,validPolicies} from './site-policies.mjs';
export {SITE_POLICIES,policiesFor};
import {basinScore,SCORE_VERSION,SIGNED_SCORE_VERSIONS} from './scoring.mjs';
import {POPULATION_SCALE,STARTING_POPULATION,TOWN_CAPACITY,PEOPLE_FOOD_UNITS,PEOPLE_ENERGY_MWH} from './demography.mjs';
import {LEGACY_GEOGRAPHY,LEGACY_CELL_MAP,LEGACY_BASIN_WEIGHTS} from './geography-migration.mjs';
import {GEOGRAPHY,MODEL_VERSION,ASSUMPTIONS,locationEffects,spatialForecast,routeSeason,balancedScore} from './spatial-model.mjs';
import {validSave as validV2,migrateSave as migrateV1} from './engine-v2.mjs';
import {ECONOMY_VERSION,ECONOMY_RULES,newBudgetPeriod,recordTransaction,fiscalProjection,validBudgetPeriod} from './economy.mjs';
import {MONTHS,CAMPAIGN_MONTHS,quarterFraction,monthLabel,monthDays} from './calendar.mjs';
import {POWER,HYDRO_SITES,LEGACY_BUILD_MONTHS,isPower,activatePowerProjects,powerCapital,powerPlacementIssue,powerPortfolio} from './power.mjs';
import {NEW_DEVELOPMENTS,REMOVAL_RATE,RESTORATION} from './developments.mjs';
export {POWER,HYDRO_SITES,monthLabel};
export const SEASONS=MONTHS;
export const CAMPAIGN_SEASONS=CAMPAIGN_MONTHS;
export const CROPS={grain:{name:'Grain',food:52,water:16,pollution:2},rice:{name:'Rice',food:76,water:30,pollution:4},pulses:{name:'Pulses',food:40,water:10,pollution:1}};
export const TAXES={low:{name:'Low',rate:.075,productionRate:.1,happiness:3},normal:{name:'Balanced',rate:.15,productionRate:.2,happiness:0},high:{name:'High',rate:.225,productionRate:.3,happiness:-5}};
export const SERVICES={basic:{name:'Basic',cost:0,happiness:-4},standard:{name:'Standard',cost:20,happiness:2},strong:{name:'Strong',cost:40,happiness:5}};
export const BUILDINGS={
 farm:{name:'Farm',icon:'▤',cost:110,upkeep:5,jobs:240,energy:8,benefit:'Food, jobs and harvest tax',tradeoff:'Irrigation, power and fertiliser pollution',description:'240 jobs. Actual harvest supplies food and contributes production tax. Crop choice and location change the yield, water demand and nitrogen pressure.'},
 town:{name:'Settlement',icon:'⌂',cost:180,upkeep:8,jobs:240,energy:0,benefit:'Housing, jobs and future taxpayers',tradeoff:'Residents need food, water, power and services',description:'Housing for 2,000 people and 240 jobs. Up to 300 newcomers per 30-day month can move into each settlement, limited by vacancies, jobs and reliable supplies. Arrivals are counted at month end and pay worker taxes from the following month. Placing a settlement also requests household water for its first arrivals; connected supply can still limit delivery. This migration rate is a game assumption.'},
 industry:{name:'Industry',icon:'⚙',cost:170,upkeep:12,jobs:560,energy:16,benefit:'Jobs and industrial production tax',tradeoff:'High water and power demand; nitrogen pollution',description:'560 job places and up to 180 credits of output per 30-day month. At balanced tax, full operation yields 36 credits of production tax before roughly 4 credits of upkeep. These are game values. Workers, water and power limit actual output. The government receives the tax share, not all factory sales. Quarterly requirements of 20 ML water and 16 MWh energy are prorated by month.'},
 reservoir:{name:'Reservoir',icon:'≋',cost:160,upkeep:3,jobs:40,energy:2,benefit:'Water carried into later months',tradeoff:'Less downstream flow, power use and upkeep',description:'Stores up to 70 ML of unallocated water. Sites near mapped rivers store more effectively. Its value is water security; it earns no automatic sales income.'},
 treatment:{name:'Treatment plant',icon:'♧',cost:140,upkeep:7,jobs:120,energy:8,benefit:'Cleaner connected water and jobs',tradeoff:'Power, staff, upkeep and retained sludge',description:'120 jobs. Removes incoming nitrogen within its connected sub-basin, limited by workers and power. Its benefit is environmental protection, with no automatic cash reward.'},
 forest:{name:'Forest',icon:'♠',cost:60,upkeep:0,jobs:0,energy:0,benefit:'Habitat and reduced erosion pressure',tradeoff:'Uses land and slightly reduces runoff',description:'Improves habitat and reduces local erosion pressure. No operating tax income or upkeep. Conservation contributes to the environment score.'}
};
Object.assign(BUILDINGS,NEW_DEVELOPMENTS);
for(const [type,p] of Object.entries(POWER))BUILDINGS[type]={name:p.name,icon:p.icon,cost:powerCapital(type),upkeep:p.mw*p.fixed/12,jobs:p.jobs,energy:0,benefit:`${p.mw} MW community capacity share`,tradeoff:type==='coal'?'Fuel costs, cooling water and high carbon emissions':type==='nuclear'?'Cooling water and managed radioactive waste':type==='hydro'?'Only screened river sites; dry-season limits and habitat effects':'Variable weather-dependent output and land use',description:`Operational immediately when placed. Your community finances a ${p.mw} MW share of a larger project. Costs use technology benchmarks scaled into credits. ${type==='hydro'?'Generation is limited by routed flow and mapped head.':'Generation uses capacity, monthly hours and capacity factor.'}`};
export const clamp=(n,a=0,b=100)=>Math.max(a,Math.min(b,n));
export {GEOGRAPHY,MODEL_VERSION,ECONOMY_VERSION,locationEffects};
export function newGame(){
 const tiles=GEOGRAPHY.cells.map(c=>({id:c.id,type:'land'}));
 const lower=GEOGRAPHY.cells.filter(c=>{const b=GEOGRAPHY.basins.find(b=>b.id===c.basinId);return b.distanceToOutletKm>30&&b.distanceToOutletKm<65&&b.areaKm2>200;}).sort((a,b)=>a.slopePct+a.riverDistanceKm-b.slopePct-b.riverDistanceKm);
 const startSites=[],usedBasins=new Set();for(const type of ['town','farm','solar']){const c=lower.find(c=>!usedBasins.has(c.basinId)&&!startSites.includes(c))||lower.find(c=>!startSites.includes(c));startSites.push(c);usedBasins.add(c.basinId);tiles[c.id].type=type;if(type==='farm')tiles[c.id].crop='grain';}
 for(const c of GEOGRAPHY.cells.filter(c=>c.slopePct>12).filter((_,i)=>i%3===0))if(tiles[c.id].type==='land')tiles[c.id].type='forest';
 const s={version:3,scenarioVersion:SCENARIO_VERSION,gridId:GEOGRAPHY.id,modelVersion:MODEL_VERSION,calendarVersion:'monthly-1',populationRemainder:0,turn:0,money:1000,population:STARTING_POPULATION,initialPopulation:STARTING_POPULATION,eco:78,happy:80,food:65,energy:40,stored:0,basinStorage:{},storedN:{},soilN:{},sludgeN:{},wetlandN:{},allocation:{people:30,farms:15,industry:0,nature:40},tax:'normal',services:'standard',tiles,weather:0,ended:false,lastReport:null,scoreHistory:[],events:[{title:'A basin of choices',text:'24 months, two years. Communities grow naturally; new settlements add space and jobs. Power plants operate immediately when placed. Hydro is limited to screened river sites.'}]};
 s.budgetPeriod=newBudgetPeriod(s.money);s.residents={[startSites[0].id]:s.population};const f=forecast(s);for(const k of Object.keys(s.allocation))s.allocation[k]=Math.ceil(f.demand[k]);return s;
}
export function counts(s){return Object.fromEntries(Object.keys(BUILDINGS).map(k=>[k,s.tiles.filter(t=>t.type===k).length]));}
export function forecast(s){const c=counts(s),fraction=quarterFraction(s.turn),workforce=Math.floor(s.population*.55),jobs=s.tiles.reduce((n,t)=>n+(BUILDINGS[t.type]?.jobs||0),0),staffing=jobs?Math.min(1,workforce/jobs):1,spatial=spatialForecast(s,{CROPS,staffing}),employed=Math.min(workforce,jobs);return {c,spatial,population:s.population,flow:spatial.flow,available:spatial.flow+Object.values(s.basinStorage||{}).reduce((a,b)=>a+b,0),workforce,jobs,employed,staffing:jobs?Math.min(1,workforce/jobs):1,employment:workforce?employed/workforce:1,housing:c.town*TOWN_CAPACITY,energyDemand:Object.entries(spatial.residents).reduce((n,[id,pop])=>n+pop*PEOPLE_ENERGY_MWH*fraction*policyEffects(s.tiles[id]).energy,0)+s.tiles.reduce((n,t)=>{const e=policyEffects(t);return n+(BUILDINGS[t.type]?.energy||0)*fraction*e.energy+e.extraEnergy*monthDays(s.turn)/30;},0)+spatial.pumpingMWh,foodDemand:s.population*PEOPLE_FOOD_UNITS*fraction,demand:spatial.demand,capacity:spatial.capacity};}
export function besideRiver(s,t){return locationEffects(t.id).riverDistanceKm<=1;}
function active(s){if(s.ended)throw Error('This campaign has ended. Choose Continue this basin to keep developing, or start a new game.');}
export function continuationIssue(s){
 if(!s.ended)return 'This campaign is still in progress.';
 if(s.population<=0)return 'No residents remain. Start a new game to rebuild.';
 if(s.happy<=0)return 'Wellbeing reached zero. Start a new game to rebuild.';
 if(s.money<0)return 'The campaign ended with an unpaid deficit. Start a new game to rebuild.';
 return null;
}
export function continueCampaign(s){
 const issue=continuationIssue(s);if(issue)throw Error(issue);
 // Capture the completed result before live resources and land uses can change.
 const archive=structuredClone({campaign:(s.completedCampaigns?.length||0)+1,turn:s.turn,modelVersion:s.modelVersion,outcome:outcome(s),scoreHistory:s.scoreHistory,lastReport:s.lastReport,resources:{money:s.money,population:s.population,food:s.food,energy:s.energy,stored:s.stored,eco:s.eco,happy:s.happy}});
 s.completedCampaigns=[...(s.completedCampaigns||[]),archive];
 s.turn=0;if(hasScenario(s))s.weather=scheduledWeather(0);s.ended=false;s.lastReport=null;s.scoreHistory=[];s.initialPopulation=s.population;s.budgetPeriod=newBudgetPeriod(s.money);
 s.events=[{title:'Continuing your basin',text:'A new two-year, 24-month cycle begins with your existing land uses, residents and resources. The previous campaign result is saved in the report.'},...s.events].slice(0,8);
 return 'Basin continued. Your land uses and resources are retained.';
}
export function continueAndBuild(s,id,type){
 if(!s.ended)return build(s,id,type);
 // Commit both actions together: failed quotes must not reopen a saved campaign.
 const next=structuredClone(s);continueCampaign(next);const message=build(next,id,type);Object.assign(s,next);return message;
}
export function placementQuote(s,id,type){const t=s.tiles[id],b=Object.hasOwn(BUILDINGS,type)?BUILDINGS[type]:null;if(!Number.isInteger(id)||!t||!b)throw Error('Choose a grid cell and a building type.');const e=locationEffects(id),replacement=t.type!=='land'&&t.type!==type?demolitionQuote(s,id).cost:0;const issue=powerPlacementIssue(s,id,type);return {allowed:!issue,issue,cost:Math.ceil(b.cost*e.costMultiplier+replacement),replacement,effects:e,constructionMonths:0,reasons:[`${e.slopePct.toFixed(1)}% terrain slope`,`${e.riverDistanceKm.toFixed(1)} km to mapped river`,...(type==='hydro'&&HYDRO_SITES[id]?[`${HYDRO_SITES[id].headM} m screened river head`]:[]),...(type==='farm'?[`${Math.round(e.farmSuitability*100)}% terrain suitability`]:[]),...(type==='reservoir'?[`${Math.round(e.reservoirCapacity)} ML effective storage`]:[]),...(replacement?[`Includes ${replacement} credits to remove ${BUILDINGS[t.type].name}`]:[])]};}
export function build(s,id,type){active(s);const t=s.tiles[id];if(t?.type===type)throw Error('This cell already has that land use.');const q=placementQuote(s,id,type);if(!q.allowed)throw Error(q.issue);if(s.money<q.cost)throw Error('Not enough treasury credits for this location.');recordTransaction(s,'construction',q.cost-q.replacement);if(q.replacement)recordTransaction(s,'demolition',q.replacement);s.money-=q.cost;t.type=type;delete t.remainingMonths;delete t.policies;if(type==='farm')t.crop='grain';else delete t.crop;if(type==='town')requestSettlementWater(s,id);return `${BUILDINGS[type].name} ${isPower(type)?'placed and operational':'placed'} in cell ${id+1} for ${q.cost} credits.`;}
// Connecting a new settlement includes requesting household water for its
// first wave of residents. This is a request, never a guarantee of river supply.
function requestSettlementWater(s,id){
 const f=forecast(s),capacity=Math.max(0,Math.floor(f.jobs/POPULATION_RULES.workforceShare-s.population));
 const arrivals=Math.min(capacity,Math.floor(POPULATION_RULES.monthlyArrivalsPerTown*monthDays(s.turn)/30),Math.max(0,TOWN_CAPACITY-(f.spatial.residents[id]||0)));
 const residents={...f.spatial.residents,[id]:(f.spatial.residents[id]||0)+arrivals};
 const need=forecast({...s,population:s.population+arrivals,residents}).demand.people;
 s.allocation.people=Math.max(s.allocation.people,Math.min(300,Math.ceil(need)));
}
export function demolitionQuote(s,id){
 const t=Number.isInteger(id)?s.tiles[id]:null,b=t&&BUILDINGS[t.type];
 if(!b)throw Error('Choose a developed cell to remove.');
 const cost=Math.ceil(Math.max(8,b.cost*(REMOVAL_RATE[t.type]??.2))*locationEffects(id).costMultiplier);
 const effects=['Returns the cell to open land. No salvage refund.'];
 if(t.type==='town')effects.push('Housing is removed. Residents stay in the basin and still need food, water and new housing.');
 if(isPower(t.type))effects.push('This plant stops generating immediately; electricity already in reserve is retained.');
 if(t.type==='reservoir')effects.push('Stored water is released through the river at the next monthly settlement if no other storage holds it.');
 if(['farm','orchard','wetland','treatment','industry'].includes(t.type))effects.push('Existing soil nutrients, retained nitrogen and sludge are preserved.');
 if(b.jobs)effects.push(`${b.jobs} job places are removed.`);
 return {cost,type:t.type,effects};
}
export function demolish(s,id){
 active(s);const q=demolitionQuote(s,id);
 if(s.money<q.cost)throw Error('Not enough treasury credits to remove this development.');
 recordTransaction(s,'demolition',q.cost);s.money-=q.cost;s.tiles[id]={id,type:'land'};
 return `${BUILDINGS[q.type].name} removed from cell ${id+1} for ${q.cost} credits.`;
}
export function continueAndDemolish(s,id){
 if(!s.ended)return demolish(s,id);
 const next=structuredClone(s);continueCampaign(next);const message=demolish(next,id);Object.assign(s,next);return message;
}
export function previewDemolish(s,id){const next=structuredClone(s);continueAndDemolish(next,id);return projectSeason(next);}
export function setAllocation(s,key,value){active(s);if(!Object.hasOwn(s.allocation,key)||!Number.isFinite(value)||value<0||value>300)throw Error('Invalid water allocation.');s.allocation[key]=Math.round(value);}
export function setPolicy(s,key,value){active(s);const options=key==='tax'?TAXES:key==='services'?SERVICES:key==='exports'?{retain:1,surplus:1}:null;if(!options||!Object.hasOwn(options,value))throw Error('Invalid policy.');s[key]=value;}
export function setCrop(s,id,crop){active(s);const t=s.tiles[id];if(t?.type!=='farm'||!Object.hasOwn(CROPS,crop))throw Error('Choose a farm and valid crop.');t.crop=crop;}
export const MARKET={food:{amount:20,buy:40,sell:20},energy:{amount:20,buy:60,sell:20}};
export function trade(s,resource,action){active(s);if(!Object.hasOwn(MARKET,resource)||!['buy','sell'].includes(action))throw Error('Invalid trade.');const m=MARKET[resource];if(action==='buy'){if(s.money<m.buy)throw Error('Not enough credits.');if(s[resource]+m.amount>500)throw Error('Storage limit reached.');recordTransaction(s,'imports',m.buy);s.money-=m.buy;s[resource]+=m.amount;}else{if(s[resource]<m.amount)throw Error('Not enough stock to sell.');recordTransaction(s,'exports',m.sell);s[resource]-=m.amount;s.money+=m.sell;}return `${action==='buy'?'Bought':'Sold'} ${m.amount} ${resource}.`;}
let initialScoreReference;
function scoreReference(){
 if(!initialScoreReference){
  const r=projectSeason(newGame(),{allowMigration:false,referenceRun:true}),monthly=30/monthDays(0);
  initialScoreReference={population:r.population,workers:r.population*.55*r.employment*r.budget.productiveFraction,margin:(r.budget.taxIncome-r.budget.expenses)*monthly,food:r.foodMade*monthly,energy:r.powerMade*monthly,environment:Math.min(r.routed.ecosystem,1/(1+r.power.intensity/400))};
 }
 return {...initialScoreReference};
}
export function projectSeason(s,{allowMigration=true,referenceRun=false}={}){
 const f=forecast(s),fraction=quarterFraction(s.turn),baseEnergyDemand=f.energyDemand-f.spatial.pumpingMWh;
 const settle=ratio=>{const routed=routeSeason(s,f,ratio,{CROPS}),power=powerPortfolio(s,f,routed);return {routed,power,available:s.energy+power.generated,used:baseEnergyDemand*ratio+routed.pumpingMWh};};
 let energyRatio=1,settled=settle(1);
 // Settle pumping against water actually withdrawn. Bisection finds the
 // feasible shared operating fraction that can be powered without overspending.
 if(settled.used>settled.available){let lo=0,hi=1;for(let i=0;i<32;i++){const mid=(lo+hi)/2,r=settle(mid);if(r.used<=r.available)lo=mid;else hi=mid;}energyRatio=lo;settled=settle(lo);}
 const {routed,power}=settled,powerMade=power.generated,powerAvailable=settled.available,powerUsed=settled.used;
 const waterRatio=routed.householdRatio,foodMade=routed.foodPotential,foodUsed=Math.min(f.foodDemand,s.food+foodMade),foodRatio=f.foodDemand?foodUsed/f.foodDemand:1;
 const exportAllowed=s.exports==='surplus'&&routed.worstHousehold>=.99&&foodRatio>=.99&&energyRatio>=.99;
 // Sell only newly produced surplus after domestic use, retaining food for two
 // months and electricity for one month at current demand. Never sell imports.
 const energyNeed=baseEnergyDemand+routed.pumpingMWh;
 const exports={enabled:s.exports==='surplus',food:exportAllowed?Math.max(0,Math.min(foodMade-f.foodDemand,s.food+foodMade-foodUsed-2*f.foodDemand)):0,energy:exportAllowed?Math.max(0,Math.min(powerMade-energyNeed,powerAvailable-powerUsed-energyNeed)):0,foodReserve:2*f.foodDemand,energyReserve:energyNeed};
 exports.income=exports.food*MARKET.food.sell/MARKET.food.amount+exports.energy*MARKET.energy.sell/MARKET.energy.amount;
 const energyAfter=Math.min(500,Math.max(0,powerAvailable-powerUsed-exports.energy)),foodAfter=Math.min(500,s.food+foodMade-foodUsed-exports.food);
 const curtailed=Math.max(0,powerAvailable-powerUsed-exports.energy-energyAfter),energyResidual=powerAvailable-powerUsed-exports.energy-energyAfter-curtailed;
 const policyUpkeep=s.tiles.reduce((n,t)=>n+policyEffects(t).upkeep,0)*monthDays(s.turn)/30;
 const upkeep=Object.entries(f.c).reduce((n,[k,v])=>n+(isPower(k)?0:v*BUILDINGS[k].upkeep*fraction),0)+power.runningCost+policyUpkeep,serviceCost=SERVICES[s.services].cost*fraction*s.population/STARTING_POPULATION;
 const budget=fiscalProjection(s,{employed:f.employed,waterRatio,foodRatio,energyRatio,foodMade,powerMade,industryOutput:routed.industryPotential,upkeep,serviceCost,autoExports:exports.income,tax:{...TAXES[s.tax],rate:TAXES[s.tax].rate*fraction}});
 const factories=s.tiles.filter(t=>t.type==='industry').map(t=>{const node=routed.nodes[GEOGRAPHY.cells[t.id].basinId],water=node.industryRatio,potential=ECONOMY_RULES.industryOutputMonthly*monthDays(s.turn)/30,operation=water*energyRatio*f.staffing,output=potential*operation,taxEstimate=output*TAXES[s.tax].productionRate,upkeep=BUILDINGS.industry.upkeep*fraction;return {id:t.id,basinId:node.id,water,power:energyRatio,staffing:f.staffing,operation,potential,output,taxEstimate,upkeep,directNetEstimate:taxEstimate-upkeep};});
 // Attribute the rounded sector levy to factories without inventing extra tax.
 for(const p of factories)p.tax=Math.floor(p.taxEstimate);
 let taxRemainder=budget.receipts.industry-factories.reduce((n,p)=>n+p.tax,0);
 for(const p of [...factories].sort((a,b)=>(b.taxEstimate-b.tax)-(a.taxEstimate-a.tax)||a.id-b.id)){if(taxRemainder--<=0)break;p.tax++;}
 for(const p of factories)p.directNet=p.tax-p.upkeep;
 const industry={factories,potential:factories.reduce((n,p)=>n+p.potential,0),output:budget.output.industry,productionTax:budget.receipts.industry,upkeep:factories.reduce((n,p)=>n+p.upkeep,0)};industry.directNet=industry.productionTax-industry.upkeep;
 const {income,net}=budget,taxIncome=budget.receipts.workers,industryIncome=budget.receipts.industry,farmIncome=budget.receipts.agriculture,energyIncome=budget.receipts.energy;
 const ecoAfter=clamp(s.eco*Math.pow(.6,fraction)+routed.ecosystem*100*(1-Math.pow(.6,fraction))),happyAfter=clamp(s.happy+(2+TAXES[s.tax].happiness+SERVICES[s.services].happiness+routed.clinicSupport*RESTORATION.clinicWellbeing-22*(1-waterRatio)-24*(1-foodRatio)-12*(1-energyRatio)-8*(1-f.employment)-8*(1-f.spatial.housingRatio)-(ecoAfter<40?5:0))*fraction);
 const severity=Math.max(1-waterRatio,1-foodRatio),growthReady=f.spatial.housingRatio>=.99&&waterRatio>=.99&&foodRatio>=.99&&energyRatio>=.99&&f.employment>=.65&&happyAfter>=55&&routed.ecosystem>=.4&&s.money+net>=0;
 // New residents arrive at month end. Test extra demand at their actual sites,
 // with unchanged allocations and current climate; no treasury or stock is booked.
 const demography=populationProjection(s,f,{days:monthDays(s.turn),severity,ready:allowMigration&&growthReady,canSupport:(population,residents)=>{
  const candidate=projectSeason({...s,population,residents},{allowMigration:false});
  return candidate.routed.worstHousehold>=.99&&candidate.waterRatio>=.99&&candidate.foodRatio>=.99&&candidate.energyRatio>=.99&&s.money+candidate.net>=0;
 }});
 const {populationChange,populationRemainder,nextResidents}=demography;
 demography.additionalWorkers=Math.min(f.jobs,Math.floor((s.population+populationChange)*.55))-f.employed;
 demography.additionalWorkerTax=Math.round(demography.additionalWorkers*TAXES[s.tax].rate*fraction*budget.productiveFraction*100)/100;
 const survival=clamp((s.population+populationChange)/s.initialPopulation,0,1),economy=Math.sqrt(clamp((s.money+net)/Math.max(50,2*(upkeep+serviceCost)),0,1)*clamp(budget.taxIncome/Math.max(1,upkeep+serviceCost),0,1));
 const indicators={water:Math.sqrt(waterRatio*routed.worstHousehold),food:foodRatio,energy:energyRatio,economy,society:Math.min(survival,f.spatial.housingRatio,Math.sqrt(happyAfter/100*f.employment*budget.productiveFraction)),environment:Math.min(routed.ecosystem,1/(1+power.intensity/400))};
 const score=basinScore({balance:balancedScore(indicators),indicators,routed,basins:GEOGRAPHY.basins,foodRatio,energyRatio,foodAfter,foodDemand:f.foodDemand,energyAfter,energyDemand:energyNeed,housing:f.spatial.housingRatio,employment:f.employment*budget.productiveFraction,budget,power,previous:s.lastReport?.score,development:{population:s.population,days:monthDays(s.turn),foodMade,powerMade,foodOpening:s.food,energyOpening:s.energy,foodExports:exports.food,energyExports:exports.energy,reference:referenceRun?null:scoreReference()}});
 applyEventScore(score,assessEvent(s,{routed,foodRatio,energyRatio}));
 const services=waterService(s,{...f,routed,energyRatio});
 const warnings=[];
 if(exports.enabled&&!exportAllowed)warnings.push('Surplus exports are paused while local water, food or power needs are unmet.');
 if(factories.length&&s.allocation.industry===0)warnings.push('Industry has no water allocation: production tax is zero. Set its water request in Water.');
 else if(factories.some(p=>p.operation<.8))warnings.push('Industry is below capacity. Check its water, power and worker supply in Govern or the selected cell.');
 if(services.sectors.people.worst){const w=services.sectors.people;warnings.push(w.cause==='allocation'?`Household request ${w.request.toFixed(1)} ML is below ${w.need.toFixed(1)} ML needed. Review allocation.`:w.cause==='power'?'Household pumps are limited by electricity. Review power supply.':`${w.worst.label}: connected water supply limits household delivery.`);}
 if(foodRatio<.99)warnings.push('Food shortage: buy food or improve farm placement and irrigation.');
 if(energyRatio<.99)warnings.push('Power shortage reduces pumping, production and treatment.');
 if(f.staffing<.99)warnings.push('Worker shortage reduces operating capacity.');
 if(f.employment<.8)warnings.push('Unemployment lowers wellbeing and the society score.');
 const worst=Object.values(routed.nodes).sort((a,b)=>a.environment-b.environment)[0];
 if(worst.environment<.7)warnings.push(`${worst.label}: ${worst.flowCompliance<.7?'environmental flow shortage':worst.waterQuality<.7?'nitrogen pressure from connected sources':'habitat and erosion pressure'} limits the environment score.`);
 if(foodRatio>=.99&&foodMade<f.foodDemand&&f.foodDemand>foodAfter)warnings.push('Meals are covered this month, but production is below demand and food reserves are falling.');
 if(s.money+net<0)warnings.push('The month ends with an unpaid deficit.');
 else if(net<0)warnings.push('Running costs exceed taxes and the development grant. Treasury reserves will fall this month.');
 if(s.population>0&&f.housing<=s.population)warnings.push('Housing is full. Natural growth continues; add a settlement to relieve overcrowding.');
 if(f.spatial.housingRatio<.99)warnings.push('Some residents are unhoused after land conversion. Restore their settlement.');
 return {...f,exports,energyDemand:baseEnergyDemand+routed.pumpingMWh,requested:Object.values(s.allocation).reduce((a,b)=>a+b,0),water:routed.water,waterRatio,energyRatio,foodRatio,powerMade,powerUsed,energyAfter,foodMade,foodUsed,foodAfter,industryIncome,taxIncome,farmIncome,energyIncome,income,upkeep,policyUpkeep,serviceCost,net,budget,ecoAfter,happyAfter,populationChange,populationRemainder,nextResidents,demography,services,warnings,power,industry,curtailed,energyResidual,storedAfter:routed.diagnostics.newStorage,routed,score,modelVersion:MODEL_VERSION,economyVersion:ECONOMY_VERSION};
}
export function sitePolicyQuote(s,id,key,enabled=true){
 const t=Number.isInteger(id)?s.tiles[id]:null,p=Object.hasOwn(SITE_POLICIES,key)?SITE_POLICIES[key]:null;
 if(!t||!p||!p.types.includes(t.type)||typeof enabled!=='boolean')throw Error('Choose a policy suitable for this developed cell.');
 const installed=Object.hasOwn(t.policies||{},key),cost=enabled&&!installed?p.cost:0;
 if(!enabled&&!installed)throw Error('This policy has not been installed.');
 if(!!t.policies?.[key]===enabled)throw Error(enabled?'This policy is already active.':'This policy is already paused.');
 return {cost,installed,enabled,policy:p};
}
export function setSitePolicy(s,id,key,enabled=true){
 active(s);const q=sitePolicyQuote(s,id,key,enabled);if(s.money<q.cost)throw Error('Not enough treasury credits for this policy.');
 if(q.cost){recordTransaction(s,'construction',q.cost);s.money-=q.cost;}
 s.tiles[id].policies={...s.tiles[id].policies,[key]:enabled};
 return `${q.policy.name} ${enabled?'active':'paused'} in cell ${id+1}${q.cost?' · '+q.cost+' credits paid':''}. Effects settle at month end.`;
}
export function previewSitePolicy(s,id,key,enabled=true){const next=structuredClone(s);setSitePolicy(next,id,key,enabled);return projectSeason(next);}
export function previewBuild(s,id,type){const next=structuredClone(s);continueAndBuild(next,id,type);return projectSeason(next);}
export function previewPowerOperation(s,id,type){
 if(!isPower(type))throw Error('Choose a power project.');
 const q=placementQuote(s,id,type);if(!q.allowed)throw Error(q.issue);
 const next=structuredClone(s);next.tiles[id]={id,type};
 // A separate operating estimate, with today's weather/people/river conditions.
 // It never commissions a real project, books funds or awards points.
 return projectSeason(next).power.plants.find(p=>p.id===id);
}
// Normalized sustainability indicators stay comparable; the game awards
// accumulated points only for completed months. Derive from saved history.
export const seasonalPoints=balance=>Math.round(balance*10);
export const campaignPoints=history=>(history||[]).reduce((sum,row)=>sum+seasonalPoints(row.total),0);
export function outcome(s){const f=forecast(s),r=s.lastReport,checks={housing:f.spatial.housingRatio>=.99,population:s.population>=s.initialPopulation,happiness:s.happy>=50,ecosystem:!!r&&r.score.pillars.environment>=50,treasury:s.money>0,food:s.food>=f.foodDemand,power:!!r&&r.energyRatio>=.99,water:!!r&&r.waterRatio>=.99};const history=s.scoreHistory||[],balanceIndex=history.length?Math.round(history.reduce((n,r)=>n+(r.balanceIndex??r.total),0)/history.length):0;return {checks,score:campaignPoints(history),balanceIndex,lastScore:r?seasonalPoints(r.score.total):null,won:s.turn>=CAMPAIGN_SEASONS&&Object.values(checks).every(Boolean)};}
export function advance(s,rng=Math.random){
 active(s);const r=projectSeason(s),season=monthLabel(s.turn);
 if([r.routed.diagnostics.residual,r.routed.nitrogen.residual,r.budget.residual,r.energyResidual].some(v=>!Number.isFinite(v)||Math.abs(v)>1e-6))throw Error('Monthly accounting failed; no changes were applied.');
 // Construction and market payments were already settled. Add recurring net once.
 s.money+=r.net;s.budgetPeriod=newBudgetPeriod(s.money);
 s.food=r.foodAfter;s.energy=r.energyAfter;s.stored=r.storedAfter;s.basinStorage=r.routed.storage;s.residents=r.nextResidents;s.storedN=r.routed.storedN;s.soilN=r.routed.soilN;s.sludgeN=r.routed.sludge;s.wetlandN=r.routed.wetlandN;s.happy=r.happyAfter;s.eco=r.ecoAfter;s.population+=r.populationChange;s.populationRemainder=r.populationRemainder;activatePowerProjects(s);s.turn++;s.lastReport=structuredClone(r);
 s.scoreHistory.push({turn:s.turn,total:r.score.total,pillars:{...r.score.pillars},scoreVersion:SCORE_VERSION,balanceIndex:r.score.balanceIndex,points:r.score.points,earned:r.score.earned,lost:r.score.lost,modelVersion:MODEL_VERSION,economyVersion:ECONOMY_VERSION});s.ended=s.turn>=CAMPAIGN_SEASONS||s.happy<=0||s.money<0||s.population<=0;
 const roll=s.ended?.5:rng();s.weather=hasScenario(s)?scheduledWeather(s.turn):roll<.2?-25:roll>.8?20:0;s.events.unshift({title:`${season} · ${r.score.points>=0?'+':''}${r.score.points} points`,text:`Residents ${r.populationChange>=0?'+':''}${r.populationChange} (${r.demography.arrivals} arrivals). Tax receipts +${r.budget.taxIncome.toFixed(2)}; development grant +${r.budget.grant}; surplus exports +${r.exports.income.toFixed(1)}; operating costs −${r.budget.expenses.toFixed(1)}; treasury ${r.net>=0?'+':''}${r.net.toFixed(1)}. ${r.warnings.slice(0,2).join(' ')}`});s.events=s.events.slice(0,8);return {...r,won:outcome(s).won};
}
function nonnegativeRecord(o){return o&&typeof o==='object'&&!Array.isArray(o)&&Object.values(o).every(v=>Number.isFinite(v)&&v>=0);}
function recordsValid(s,geography=GEOGRAPHY){
 if(s.scenarioVersion!==undefined&&s.scenarioVersion!==SCENARIO_VERSION)return false;
 if(s.exports!==undefined&&!['retain','surplus'].includes(s.exports))return false;
 if(!validBudgetPeriod(s))return false;
 if(s.completedCampaigns!==undefined&&(!Array.isArray(s.completedCampaigns)||!s.completedCampaigns.every(c=>Number.isInteger(c?.campaign)&&c.campaign>0&&Number.isFinite(c.outcome?.score)&&typeof c.outcome?.won==='boolean'&&Array.isArray(c.scoreHistory))))return false;
 const basinIds=new Set(geography.basins.map(b=>b.id));
 if(s.wetlandN!==undefined&&(!nonnegativeRecord(s.wetlandN)||!Object.keys(s.wetlandN).every(id=>basinIds.has(id))))return false;
 for(const key of ['basinStorage','storedN','sludgeN'])if(!nonnegativeRecord(s[key])||!Object.keys(s[key]).every(id=>basinIds.has(id)))return false;
 for(const key of ['soilN','residents'])if(!nonnegativeRecord(s[key])||!Object.keys(s[key]).every(id=>String(Number(id))===id&&geography.cells[Number(id)]))return false;
 if(Math.abs(Object.values(s.residents).reduce((a,b)=>a+b,0)-s.population)>1e-6)return false;
 if(Math.abs(Object.values(s.basinStorage).reduce((a,b)=>a+b,0)-s.stored)>1e-6)return false;
 if(s.lastReport!==null&&(!Number.isFinite(s.lastReport?.score?.total)||!s.lastReport?.routed||!Number.isFinite(s.lastReport?.energyRatio)||!Number.isFinite(s.lastReport?.waterRatio)))return false;
 return true;
}
export function validSave(s,geography=GEOGRAPHY,modelVersion=MODEL_VERSION){return s?.version===3&&recordsValid(s,geography)&&s.gridId===geography.id&&s.modelVersion===modelVersion&&(modelVersion!==MODEL_VERSION||s.calendarVersion==='monthly-1')&&(s.populationRemainder===undefined||Number.isFinite(s.populationRemainder)&&Math.abs(s.populationRemainder)<1.000001)&&Number.isInteger(s.turn)&&s.turn>=0&&s.turn<=(modelVersion===MODEL_VERSION?CAMPAIGN_SEASONS:4)&&['money','eco','happy','food','energy','stored','population','initialPopulation','weather'].every(k=>Number.isFinite(s[k]))&&s.population>=0&&s.initialPopulation>0&&s.food>=0&&s.energy>=0&&Object.hasOwn(TAXES,s.tax)&&Object.hasOwn(SERVICES,s.services)&&typeof s.ended==='boolean'&&Array.isArray(s.tiles)&&s.tiles.length===geography.cells.length&&s.tiles.every((t,i)=>t.id===i&&validPolicies(t)&&['land',...Object.keys(BUILDINGS)].includes(t.type)&&(t.type!=='farm'||Object.hasOwn(CROPS,t.crop))&&(t.remainingMonths===undefined||isPower(t.type)&&Number.isInteger(t.remainingMonths)&&t.remainingMonths>=0&&t.remainingMonths<=LEGACY_BUILD_MONTHS[t.type])&&(t.type!=='hydro'||!!(geography.id===SQUARE_GEOGRAPHY.id?SQUARE_HYDRO_SITES:HYDRO_SITES)[t.id]))&&s.allocation&&['people','farms','industry','nature'].every(k=>Number.isFinite(s.allocation[k])&&s.allocation[k]>=0&&s.allocation[k]<=300)&&['basinStorage','storedN','soilN','sludgeN','residents'].every(k=>nonnegativeRecord(s[k]))&&Array.isArray(s.events)&&s.events.every(e=>typeof e.title==='string'&&typeof e.text==='string')&&Array.isArray(s.scoreHistory)&&s.scoreHistory.every(r=>Number.isFinite(r.total)&&(SIGNED_SCORE_VERSIONS.includes(r.scoreVersion)?r.total>=-800&&r.total<=100&&r.points===Math.round(r.total*10)&&Number.isFinite(r.earned)&&Number.isFinite(r.lost)&&r.earned-r.lost===r.points:r.total>=0&&r.total<=100));}
function toMonthly(old){const s=structuredClone(old);s.modelVersion=MODEL_VERSION;s.calendarVersion='monthly-1';s.populationRemainder=0;s.turn*=3;s.scoreHistory=s.scoreHistory.map(r=>({...r,turn:r.turn*3,legacyQuarter:true}));for(const key of Object.keys(s.allocation))s.allocation[key]/=3;s.events=[{title:'Two years, month by month',text:'Each turn is now one month. Previous quarters count as three elapsed months; funds, people, buildings and past points are retained. Power plants operate immediately when placed.'},...s.events].slice(0,8);return validSave(s)?s:null;}
export function migrateSave(old){
 if(old?.version===3){
  if(validSave(old,SQUARE_GEOGRAPHY,MODEL_VERSION)||validSave(old,SQUARE_GEOGRAPHY,'spatial-scenario-2')){
   const s=structuredClone(old);s.gridId=GEOGRAPHY.id;
   s.tiles=GEOGRAPHY.cells.map(c=>({id:c.id,type:'land'}));for(const tile of old.tiles){const id=SQUARE_CELL_MAP[tile.id];s.tiles[id]={...tile,id};}
   for(const key of ['soilN','residents'])s[key]=Object.fromEntries(Object.entries(old[key]).map(([id,v])=>[SQUARE_CELL_MAP[id],v]));
   // Historical numeric results remain untouched; only references to physical cells move.
   function remapReport(r){if(!r)return;if(r.industry?.factories)for(const f of r.industry.factories)f.id=SQUARE_CELL_MAP[f.id];if(r.power?.plants)for(const p of r.power.plants)p.id=SQUARE_CELL_MAP[p.id];if(r.routed?.tileResults)r.routed.tileResults=Object.fromEntries(Object.entries(r.routed.tileResults).map(([id,v])=>[SQUARE_CELL_MAP[id],{...v,id:SQUARE_CELL_MAP[id]}]));for(const key of ['soilN'])if(r.routed?.[key])r.routed[key]=Object.fromEntries(Object.entries(r.routed[key]).map(([id,v])=>[SQUARE_CELL_MAP[id],v]));for(const key of ['nextResidents'])if(r[key])r[key]=Object.fromEntries(Object.entries(r[key]).map(([id,v])=>[SQUARE_CELL_MAP[id],v]));if(r.spatial?.residents)r.spatial.residents=Object.fromEntries(Object.entries(r.spatial.residents).map(([id,v])=>[SQUARE_CELL_MAP[id],v]));if(r.spatial?.cellBasins)r.spatial.cellBasins=Object.fromEntries(Object.entries(r.spatial.cellBasins).map(([id,v])=>[SQUARE_CELL_MAP[id],v]));if(r.spatial?.nodes)for(const node of Object.values(r.spatial.nodes))for(const tile of node.tiles||[])tile.id=SQUARE_CELL_MAP[tile.id];r.sourceGridId=SQUARE_GEOGRAPHY.id;r.gridId=GEOGRAPHY.id;}
   remapReport(s.lastReport);
   s.events=[{title:'759 smaller hexagonal cells',text:'Your developments and policies moved to distinct nearby hex cells in the same sub-basin. Funds, residents, water and nitrogen inventories, progress and recorded points are retained. New forecasts use the finer terrain context.'},...s.events].slice(0,8);
   return old.modelVersion===MODEL_VERSION?(validSave(s)?s:null):toMonthly(s);
  }
  if(validSave(old,GEOGRAPHY,'spatial-scenario-2'))return toMonthly(old);
  if(!validSave(old,LEGACY_GEOGRAPHY,'spatial-scenario-1'))return null;
  const s=structuredClone(old);s.gridId=GEOGRAPHY.id;s.modelVersion=MODEL_VERSION;
  s.tiles=GEOGRAPHY.cells.map(c=>({id:c.id,type:'land'}));for(const tile of old.tiles){const id=SQUARE_CELL_MAP[LEGACY_CELL_MAP[tile.id]];s.tiles[id]={...tile,id};}
  const remapCells=(record,factor=1)=>Object.fromEntries(Object.entries(record).map(([id,v])=>[SQUARE_CELL_MAP[LEGACY_CELL_MAP[id]],v*factor]));
  const remapBasins=record=>{const result={};for(const [id,v]of Object.entries(record))for(const [next,weight]of Object.entries(LEGACY_BASIN_WEIGHTS[id]))result[next]=(result[next]||0)+v*weight;return result;};
  s.population*=POPULATION_SCALE;s.initialPopulation*=POPULATION_SCALE;s.residents=remapCells(old.residents,POPULATION_SCALE);s.soilN=remapCells(old.soilN);
  for(const key of ['basinStorage','storedN','sludgeN'])s[key]=remapBasins(old[key]);
  s.events=[{title:'Finer drainage and individual residents',text:'42 source sub-basins now run from headwaters to outlet. The earlier demographic groups are shown as individual residents at 20 people per group, with housing, jobs and per-person requirements adjusted together. Buildings, funds, resource stocks and recorded scores are retained.'},...s.events].slice(0,8);
  return toMonthly(s);
 }

 if(old?.version===1)old=migrateV1(old);if(!validV2(old))return null;
 const s=newGame();s.tiles.forEach(t=>{t.type='land';delete t.crop;});
 // Preserve building counts/resources. Assign old abstract parcels to stable
 // cells; old positions were not real surveyed locations.
 const occupied=old.tiles.filter(t=>Object.hasOwn(BUILDINGS,t.type));
 occupied.forEach((t,i)=>{const id=Math.floor(i*s.tiles.length/Math.max(1,occupied.length));s.tiles[id]={id,type:t.type,...(t.type==='farm'?{crop:t.crop||'grain'}:{})};});
 for(const k of ['money','population','initialPopulation','eco','happy','food','energy','weather','tax','services'])s[k]=old[k];s.population*=POPULATION_SCALE;s.initialPopulation*=POPULATION_SCALE;
 const towns=s.tiles.filter(t=>t.type==='town');s.residents=Object.fromEntries((towns.length?towns:[s.tiles[0]]).map(t=>[t.id,s.population/Math.max(1,towns.length)]));s.turn=old.turn;s.ended=old.ended;s.allocation={...old.allocation};s.stored=Math.max(0,old.stored);s.basinStorage[GEOGRAPHY.basins.find(b=>!b.downstream).id]=s.stored;
 s.budgetPeriod=newBudgetPeriod(s.money,false);s.events=[{title:'Your basin has a playable grid',text:'Resources, buildings and season progress are retained. Locations were reassigned to geographic cells. Earlier scores used different rules and remain in your previous save; the new score starts with the next completed season.'},...old.events].slice(0,8);return toMonthly(s);
}
