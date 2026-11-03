import {eventClimate} from './campaign-events.mjs';
import {planReservoirReleases,waterRequests,reserveTarget} from './water-routing.mjs';
import {policyEffects} from './site-policies.mjs';
import {TOWN_CAPACITY,PEOPLE_WATER_ML,HOUSEHOLD_N_KG} from './demography.mjs';
import {GEOGRAPHY} from './spatial-data.mjs';
import {climateQuarter,quarterFraction,monthDays} from './calendar.mjs';
import {ECONOMY_RULES} from './economy.mjs';
import {POWER,isPower,potentialPower} from './power.mjs';
import {ORCHARD,RESTORATION,restorationSuitability} from './developments.mjs';
export {GEOGRAPHY};
export const MODEL_VERSION='spatial-monthly-3';
const limit=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const sum=values=>values.reduce((a,b)=>a+b,0);
export const ASSUMPTIONS={
 // Deliberately disclosed scenario inputs, not measured Mahaweli values.
 naturalFlowML:[125,75,110,90],rainETFraction:[.65,.45,.7,.8],
 environmentalFraction:[.3,.4,.3,.35],
 nitrogenTargetMgL:2,soilWashBase:.03,soilWashWet:.2,
 fertiliserKgN:{grain:120,rice:150,pulses:70,orchard:45},cropRemovalKgN:{grain:65,rice:75,pulses:45,orchard:25},
 yieldResponseKy:{grain:1.25,rice:1.1,pulses:1.15,orchard:1.05},
 treatmentKgN:80,industryKgN:120,householdKgN:HOUSEHOLD_N_KG,
 consumptionFraction:{people:.2,farms:.75,industry:.25},
 forestFlowReduction:.08,criticalScoreAllowance:25,
 habitatCover:{land:.65,forest:.95,farm:.3,town:.18,industry:.08,solar:.4,reservoir:.2,treatment:.25,wetland:.95,buffer:.88,orchard:.6,clinic:.25}
};
export function locationEffects(id){const c=GEOGRAPHY.cells[id];if(!c)throw Error('Unknown grid cell');return {...c,
 efficiency:limit(.96-c.riverDistanceKm*.025,.55,.96),
 farmSuitability:limit(1-c.slopePct*.02,.25,1),
 costMultiplier:1+Math.min(1,c.slopePct/40)+Math.min(.5,c.riverDistanceKm/25),
 reservoirCapacity:70*limit(1-c.riverDistanceKm/7,.15,1),
 erosionFactor:limit(c.slopePct/25,0,2)
};}
export function topologicalBasins(basins=GEOGRAPHY.basins){const result=[],seen=new Set(),visiting=new Set();function visit(b){if(seen.has(b.id))return;if(visiting.has(b.id))throw Error('Cyclic drainage graph');visiting.add(b.id);for(const upstream of basins.filter(a=>a.downstream===b.id))visit(upstream);visiting.delete(b.id);seen.add(b.id);result.push(b);}for(const b of basins)visit(b);return result;}
export function residentLocations(s){
 let weights={...(s.residents||{})};const towns=s.tiles.filter(t=>t.type==='town');
 if(!sum(Object.values(weights)))weights=Object.fromEntries((towns.length?towns:[s.tiles[0]]).map(t=>[t.id,1]));
 const total=sum(Object.values(weights)),residents=Object.fromEntries(Object.entries(weights).filter(([,v])=>v>0).map(([id,v])=>[id,s.population*v/total]));
 // New housing accommodates existing overcrowded or displaced residents first.
 // If no space exists they remain at their original cell and still need services.
 for(const [id,pop]of Object.entries(residents)){
  let excess=Math.max(0,pop-(s.tiles[id].type==='town'?TOWN_CAPACITY:0));
  const origin=GEOGRAPHY.cells[id];
  const destinations=towns.filter(t=>t.id!==Number(id)).toSorted((a,b)=>{
   const distance=t=>Math.hypot(GEOGRAPHY.cells[t.id].lon-origin.lon,GEOGRAPHY.cells[t.id].lat-origin.lat);return distance(a)-distance(b);
  });
  for(const town of destinations){const move=Math.min(excess,Math.max(0,TOWN_CAPACITY-(residents[town.id]||0)));residents[id]-=move;residents[town.id]=(residents[town.id]||0)+move;excess-=move;if(excess<=0)break;}
 }
 return residents;
}
export function spatialForecast(s,D){
 const rainFraction=limit(ASSUMPTIONS.rainETFraction[climateQuarter(s.turn)]*eventClimate(s).rainFactor,0,.95);
 const period=climateQuarter(s.turn),fraction=quarterFraction(s.turn),area=sum(GEOGRAPHY.basins.map(b=>b.areaKm2)),nodes=Object.fromEntries(GEOGRAPHY.basins.map(b=>[b.id,{...b,tiles:[],population:0,demand:{people:0,farms:0,industry:0,power:0},pumpDemand:{people:0,farms:0,industry:0,power:0},netNeed:{people:0,farms:0,industry:0,power:0},coolingConsumed:0,capacity:0}]));
 for(const t of s.tiles)nodes[GEOGRAPHY.cells[t.id].basinId].tiles.push(t);
 const residents=residentLocations(s);let housed=0;
 for(const [id,pop]of Object.entries(residents)){const e=locationEffects(Number(id)),node=nodes[e.basinId],net=pop*PEOPLE_WATER_ML*fraction*policyEffects(s.tiles[id]).water,gross=net/e.efficiency;node.population+=pop;node.netNeed.people+=net;node.demand.people+=gross;node.pumpDemand.people+=.002725*gross*e.pumpHeadM/.7;if(s.tiles[id].type==='town')housed+=Math.min(TOWN_CAPACITY,pop);}
 let pumpingMWh=0;
 for(const node of Object.values(nodes)){
  for(const t of node.tiles){const e=locationEffects(t.id),kind=['farm','orchard'].includes(t.type)?'farms':t.type==='industry'?'industry':null;
   if(kind){const net=(kind==='farms'?(t.type==='orchard'?ORCHARD:D.CROPS[t.crop||'grain']).water*(1-rainFraction)/ASSUMPTIONS.consumptionFraction.farms:20)*fraction*policyEffects(t).water;const gross=net/e.efficiency;node.netNeed[kind]+=net;node.demand[kind]+=gross;node.pumpDemand[kind]+=.002725*gross*e.pumpHeadM/.7;}
   if(t.type==='reservoir')node.capacity+=e.reservoirCapacity;
   if(isPower(t.type)){const p=POWER[t.type],output=potentialPower(s,t,D.staffing??1);const policy=policyEffects(t);node.demand.power+=output*p.withdrawal*policy.coolingWithdrawal;node.netNeed.power+=output*p.withdrawal*policy.coolingWithdrawal;node.coolingConsumed+=output*p.consumption*policy.coolingConsumption;}
  }
  pumpingMWh+=sum(Object.values(node.pumpDemand));
  const forestArea=sum(node.tiles.filter(t=>t.type==='forest').map(t=>GEOGRAPHY.cells[t.id].areaKm2));
  node.localFlow=Math.max(0,ASSUMPTIONS.naturalFlowML[period]+s.weather)*fraction*node.areaKm2/area*(1-ASSUMPTIONS.forestFlowReduction*forestArea/node.areaKm2);
 }
 const natural={};for(const node of topologicalBasins())natural[node.id]=nodes[node.id].localFlow+sum(GEOGRAPHY.basins.filter(b=>b.downstream===node.id).map(b=>natural[b.id]));
 const demand={people:0,farms:0,industry:0,power:0,nature:Math.max(0,ASSUMPTIONS.naturalFlowML[period]+s.weather)*fraction*ASSUMPTIONS.environmentalFraction[period]};
 for(const node of Object.values(nodes)){for(const k of ['people','farms','industry','power'])demand[k]+=node.demand[k];node.referenceFlow=natural[node.id];}
 return {nodes,demand,pumpingMWh,residents,cellBasins:Object.fromEntries(GEOGRAPHY.cells.map(c=>[c.id,c.basinId])),housingRatio:s.population?housed/s.population:1,flow:sum(Object.values(nodes).map(n=>n.localFlow)),capacity:sum(Object.values(nodes).map(n=>n.capacity))};
}
export function routeSeason(s,f,energyRatio,D){
 const climate=eventClimate(s),rainFraction=limit(ASSUMPTIONS.rainETFraction[climateQuarter(s.turn)]*climate.rainFactor,0,.95);
 const period=climateQuarter(s.turn),fraction=quarterFraction(s.turn),sp=f.spatial,results={},tileResults={},soilN={...(s.soilN||{})},storage={},storedN={},sludge={...(s.sludgeN||{})},wetlandN={...(s.wetlandN||{})};
 const water={people:0,farms:0,industry:0,power:0,nature:0},nitrogen={input:0,harvest:0,retained:0,wetlandRetained:0,outlet:0,initialSoil:sum(Object.values(soilN)),initialStored:sum(Object.values(s.storedN||{}))};
 const sectorUse=Object.fromEntries(['people','farms','industry','power'].map(k=>[k,{withdrawn:0,consumed:0,loss:0,returned:0}]));
 const diagnostics={localFlow:sp.flow,oldStorage:sum(Object.values(s.basinStorage||{})),consumed:0,conveyanceLoss:0,outlet:0};
 const order=topologicalBasins(),releasePlan=planReservoirReleases(s,sp,order,energyRatio,{environmentFraction:ASSUMPTIONS.environmentalFraction[period],consumptionFraction:ASSUMPTIONS.consumptionFraction,releasePolicy:t=>policyEffects(t).release});
 let foodPotential=0,industryPotential=0,erosionSum=0,habitatSum=0,weightSum=0,pumpingMWh=0,clinicPeople=0;
 for(const b of order){
  const node=sp.nodes[b.id],upstream=Object.values(results).filter(r=>r.downstream===b.id),incoming=node.localFlow+sum(upstream.map(r=>r.outflow))+(s.basinStorage?.[b.id]||0);
  const environmentTarget=node.referenceFlow*ASSUMPTIONS.environmentalFraction[period];
  const reserve=Math.min(incoming,reserveTarget(s,sp,node,ASSUMPTIONS.environmentalFraction[period],node.tiles.some(t=>policyEffects(t).release)));
  const requests=waterRequests(s,sp,node,energyRatio);
  const totalRequest=sum(Object.values(requests)),ratio=totalRequest?Math.min(1,Math.max(0,incoming-reserve)/totalRequest):1;
  const supplied={},sectorRatio={};let consumed=0,conveyanceLoss=0,returned=0;
  for(const k of Object.keys(requests)){supplied[k]=requests[k]*ratio;water[k]+=supplied[k];sectorRatio[k]=node.demand[k]?supplied[k]/node.demand[k]:1;pumpingMWh+=node.demand[k]?node.pumpDemand[k]*sectorRatio[k]:0;const delivered=node.demand[k]?supplied[k]*node.netNeed[k]/node.demand[k]:0;const lost=supplied[k]-delivered;const used=k==='power'?node.coolingConsumed*sectorRatio[k]:delivered*ASSUMPTIONS.consumptionFraction[k];consumed+=used;conveyanceLoss+=lost;returned+=delivered-used;sectorUse[k].withdrawn+=supplied[k];sectorUse[k].consumed+=used;sectorUse[k].loss+=lost;sectorUse[k].returned+=delivered-used;}
  const remaining=incoming-sum(Object.values(supplied))+returned;
  // Retained reservoir water is not also counted as a downstream release.
  storage[b.id]=Math.min(node.capacity,Math.max(0,remaining-Math.max(reserve,releasePlan[b.id].requiredOutflow)));const outflow=remaining-storage[b.id];
  let load=sum(upstream.map(r=>r.outletN))+(s.storedN?.[b.id]||0),treatmentCapacity=0,habitat=0,cellArea=0,erosion=0;
  const buffers=node.tiles.filter(t=>t.type==='buffer').reduce((n,t)=>n+restorationSuitability(locationEffects(t.id))*policyEffects(t).buffer,0);
  const bufferProtection=Math.min(RESTORATION.bufferCap,buffers*RESTORATION.bufferFraction);
  const wetlandCapacity=node.tiles.filter(t=>t.type==='wetland').reduce((n,t)=>n+RESTORATION.wetlandKgN*restorationSuitability(locationEffects(t.id))*fraction*policyEffects(t).wetland,0);
  clinicPeople+=Math.min(node.population,node.tiles.filter(t=>t.type==='clinic').reduce((n,t)=>n+policyEffects(t).clinic,0)*RESTORATION.clinicResidents)*f.staffing*energyRatio;
  for(const t of node.tiles){const e=locationEffects(t.id),policy=policyEffects(t),cover=Math.min(.98,(POWER[t.type]?.habitat??ASSUMPTIONS.habitatCover[t.type]??.65)+policy.habitat);habitat+=cover*e.areaKm2;cellArea+=e.areaKm2;
   const risk=climate.erosionFactor*rainFraction*e.erosionFactor*(1-cover)*(['farm','orchard'].includes(t.type)?1-bufferProtection:1)*policy.erosion;erosion+=risk*e.areaKm2;
   let yieldFraction=0,exportN=0,sourceCapturedN=0;
   if(['farm','orchard'].includes(t.type)){
    const crop=t.type==='orchard'?'orchard':t.crop||'grain',eta=limit(rainFraction+(1-rainFraction)*sectorRatio.farms);
    yieldFraction=limit(1-ASSUMPTIONS.yieldResponseKy[crop]*(1-eta))*e.farmSuitability*energyRatio*f.staffing*policy.yield;
    foodPotential+=(t.type==='orchard'?ORCHARD:D.CROPS[crop]).food*yieldFraction*fraction;
    const fertiliser=ASSUMPTIONS.fertiliserKgN[crop]*fraction*policy.fertiliser,pool=(soilN[t.id]||0)+fertiliser,uptake=Math.min(pool,ASSUMPTIONS.cropRemovalKgN[crop]*yieldFraction*fraction);nitrogen.input+=fertiliser;nitrogen.harvest+=uptake;
    exportN=(pool-uptake)*(1-Math.pow(1-limit(ASSUMPTIONS.soilWashBase+ASSUMPTIONS.soilWashWet*rainFraction*(1+e.erosionFactor),0,.8),fraction))*(1-bufferProtection)*policy.runoff;soilN[t.id]=pool-uptake-exportN;load+=exportN;
   }else{
    // Residual soil nutrient pools persist after replacing a farm.
    exportN=(soilN[t.id]||0)*(1-Math.pow(1-limit(.02*rainFraction*(1+e.erosionFactor)*(1-cover)),fraction))*policy.runoff;soilN[t.id]=(soilN[t.id]||0)-exportN;load+=exportN;
   }
   if(t.type==='industry'){const operation=sectorRatio.industry*energyRatio*f.staffing;industryPotential+=ECONOMY_RULES.industryOutputMonthly*monthDays(s.turn)/30*operation;const input=ASSUMPTIONS.industryKgN*operation*fraction;sourceCapturedN=input*policy.effluent*energyRatio*f.staffing;load+=input-sourceCapturedN;sludge[b.id]=(sludge[b.id]||0)+sourceCapturedN;nitrogen.retained+=sourceCapturedN;nitrogen.input+=input;}
   if(t.type==='treatment')treatmentCapacity+=ASSUMPTIONS.treatmentKgN*energyRatio*f.staffing*fraction*policy.treatment;
   tileResults[t.id]={id:t.id,basinId:b.id,yieldFraction,erosionRisk:risk,exportN,sourceCapturedN,irrigationRatio:sectorRatio.farms,waterRatio:sectorRatio.people};
  }
  const householdN=node.population*ASSUMPTIONS.householdKgN*fraction;load+=householdN;nitrogen.input+=householdN;
  // Treatment sees only this node's connected load, and cannot remove more N
  // than exists. Removed N persists in a retained/sludge inventory.
  const removed=Math.min(load*.85,treatmentCapacity);load-=removed;sludge[b.id]=(sludge[b.id]||0)+removed;nitrogen.retained+=removed;
  // Retention sees connected water only. Captured N is an explicit inventory,
  // not an unexplained disappearance from the mass balance.
  const wetlandRemoved=incoming>1e-9?Math.min(load*(1-Math.pow(1-RESTORATION.wetlandFraction,fraction)),wetlandCapacity):0;
  load-=wetlandRemoved;wetlandN[b.id]=(wetlandN[b.id]||0)+wetlandRemoved;nitrogen.retained+=wetlandRemoved;nitrogen.wetlandRetained+=wetlandRemoved;
  const remainingWater=outflow+storage[b.id];storedN[b.id]=remainingWater?load*storage[b.id]/remainingWater:load;const outletN=load-storedN[b.id];
  const concentration=remainingWater>1e-9?load/remainingWater:load>0?null:0;
  const waterQuality=concentration===null?0:limit(ASSUMPTIONS.nitrogenTargetMgL/Math.max(ASSUMPTIONS.nitrogenTargetMgL,concentration));
  const flowCompliance=environmentTarget?limit(outflow/environmentTarget):1;
  const habitatIndex=cellArea?limit(habitat/cellArea/.65):1,erosionIndex=cellArea?limit(1-erosion/cellArea):1;
  const environment=Math.min(flowCompliance,waterQuality,Math.sqrt(habitatIndex*erosionIndex));
  results[b.id]={id:b.id,label:b.label,downstream:b.downstream,population:node.population,incoming,localFlow:node.localFlow,referenceFlow:node.referenceFlow,environmentTarget,requiredRelease:releasePlan[b.id].requiredOutflow,outflow,storage:storage[b.id],withdrawals:supplied,consumed,conveyanceLoss,returned,industryRatio:sectorRatio.industry,powerRatio:sectorRatio.power,waterRatio:sectorRatio.people,irrigationRatio:sectorRatio.farms,loadN:load,outletN,removedN:removed,wetlandRemovedN:wetlandRemoved,concentration,flowCompliance,waterQuality,habitatIndex,erosionIndex,environment};
  diagnostics.consumed+=consumed;diagnostics.conveyanceLoss+=conveyanceLoss;if(!b.downstream){diagnostics.outlet+=outflow;nitrogen.outlet+=outletN;}
  erosionSum+=erosion;habitatSum+=habitat;weightSum+=cellArea;
 }
 const environmentalNodes=Object.values(results),totalPop=sum(environmentalNodes.map(n=>n.population));
 const householdRatio=totalPop?sum(environmentalNodes.map(n=>n.population*n.waterRatio))/totalPop:1;
 const worstHousehold=Math.min(...environmentalNodes.filter(n=>n.population>0).map(n=>n.waterRatio),1);
 const ecosystem=Math.min(...environmentalNodes.map(n=>n.environment));
 water.nature=diagnostics.outlet;
 diagnostics.newStorage=sum(Object.values(storage));diagnostics.residual=diagnostics.localFlow+diagnostics.oldStorage-diagnostics.consumed-diagnostics.conveyanceLoss-diagnostics.outlet-diagnostics.newStorage;
 nitrogen.finalSoil=sum(Object.values(soilN));nitrogen.finalStored=sum(Object.values(storedN));nitrogen.residual=nitrogen.initialSoil+nitrogen.initialStored+nitrogen.input-nitrogen.harvest-nitrogen.retained-nitrogen.outlet-nitrogen.finalSoil-nitrogen.finalStored;
 return {nodes:results,tileResults,soilN,storage,storedN,sludge,wetlandN,clinicSupport:s.population?clinicPeople/s.population:0,water,sectorUse,diagnostics,nitrogen,foodPotential,industryPotential,pumpingMWh,householdRatio,worstHousehold,ecosystem,habitat:habitatSum/Math.max(1,weightSum),erosion:erosionSum/Math.max(1,weightSum)};
}
export function balancedScore(pillars){const values=Object.values(pillars).map(v=>limit(v));const geometric=values.some(v=>v===0)?0:Math.exp(sum(values.map(Math.log))/values.length)*100;const weakest=Math.min(...values)*100;return {total:Math.round(Math.min(geometric,weakest+ASSUMPTIONS.criticalScoreAllowance)),uncapped:geometric,cap:weakest+ASSUMPTIONS.criticalScoreAllowance,pillars:Object.fromEntries(Object.entries(pillars).map(([k,v])=>[k,Math.round(limit(v)*100)])),method:'Equal-weight geometric mean; no more than 25 points above weakest pillar. Scenario policy, not a measured physical law.'};}
