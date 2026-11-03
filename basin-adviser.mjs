import {announcedEvents,eventCard} from './campaign-events.mjs';
import {projectSeason,GEOGRAPHY} from './engine.mjs';
import {ASSUMPTIONS} from './spatial-model.mjs';
import {climateQuarter,monthLabel,CAMPAIGN_MONTHS} from './calendar.mjs';
const pct=x=>Math.round(x*100),ml=x=>x.toFixed(1);
// Every visible tip carries current evidence and an action for the actual constraint.
export function basinBriefing(s,projection){
 if(s.ended)return {period:'Campaign complete',cards:[{id:'complete',priority:0,level:'Review',agency:'Basin council',title:'Your basin’s final report',evidence:`${s.population.toLocaleString()} residents; ${s.turn} completed months.`,tip:'Our journey is complete! Review your basin, then continue or start a fresh adventure.',advice:'Review the final report.',panel:'report',action:'Open overview'}]};
 const r=projection||projectSeason(s),cards=[],nodes=Object.values(r.routed.nodes),w=r.services.sectors.people;
 const add=(id,priority,agency,title,tip,panel,action,cellId,extra={})=>cards.push({id,priority,agency,title,tip,evidence:tip,advice:tip,panel,action,cellId,basinId:Number.isInteger(cellId)?GEOGRAPHY.cells[cellId]?.basinId:undefined,level:priority>=90?'Act now':priority>=65?'Prepare':'Watch',...extra});
 const q=climateQuarter(s.turn),lowMonth=[1,2].map(n=>s.turn+n).find(t=>t<CAMPAIGN_MONTHS&&ASSUMPTIONS.naturalFlowML[climateQuarter(t)]<ASSUMPTIONS.naturalFlowML[q]*.8);
 if(s.weather<0||lowMonth!==undefined){const dry=s.weather<0,drop=dry?Math.round(-s.weather/ASSUMPTIONS.naturalFlowML[q]*100):Math.round((1-ASSUMPTIONS.naturalFlowML[climateQuarter(lowMonth)]/ASSUMPTIONS.naturalFlowML[q])*100);
  add('dry-outlook',dry&&w.worst?80:55,'Weather desk',dry?'Lower river inflow this month':'Prepare for a lower-flow season',dry?`River inflow is ${drop}% below the seasonal baseline. ${w.worst?'Review local supply and household requests.':'Homes are supplied; keep water in reserve.'}`:`From ${monthLabel(lowMonth)}, the flow baseline falls by ${drop}%. Check reserves before expanding water use.`,'water','Review water');
 }
 if(s.weather>0){const steep=s.tiles.filter(t=>['farm','orchard'].includes(t.type)&&GEOGRAPHY.cells[t.id].slopePct>8).sort((a,b)=>GEOGRAPHY.cells[b.id].slopePct-GEOGRAPHY.cells[a.id].slopePct)[0];
  add('wet-outlook',steep?68:45,'Weather & land desk','Wetter conditions this month',`River inflow is ${Math.round(s.weather/ASSUMPTIONS.naturalFlowML[q]*100)}% above baseline. ${steep?`Protect steep farmland in hex ${steep.id+1} with soil cover.`:'Review reservoir storage and river releases.'}` ,steep?'build':'water',steep?'Protect this farm':'Review water',steep?.id,{advice:'Higher inflow is a scenario outlook, not a flood warning: the model does not simulate inundation.'});
 }
 if(w.worst){
  const cause=w.cause;
  const title=cause==='allocation'?'Household request is too low':cause==='power'?'Pumps need more electricity':'Local water cannot meet demand';
  const tip=cause==='allocation'?`Homes need ${ml(w.need)} ML, but request only ${ml(w.request)} ML. Raise the request${w.sourceGap>.01?' and review connected river supply':''}.`:cause==='power'?`Electricity limits household pumping. Homes receive ${pct(w.ratio)}% of their need; restore power before adding water storage.`:`${w.worst.label} lacks ${ml(w.worst.shortfall)} ML for households. Check connected supply, river reservations and upstream water use.`;
  add('household-water',100,'Water service',title,tip,cause==='power'?'power':'water',cause==='power'?'Review electricity':'Review household supply',undefined,{cause,metrics:w,basinId:w.worst.id});
 }
 const foodShort=r.foodRatio<.99,foodDraw=r.foodMade+1e-6<r.foodDemand;
 if(foodShort||foodDraw&&r.foodAfter<r.foodDemand){const tip=foodShort?`Food is short by ${ml(r.foodDemand-r.foodUsed)} units this month. Import food now, then check farm water and staffing.`:`Meals are covered this month, but only ${ml(r.foodAfter)} food remains. Farms produce ${ml(r.foodMade)} against ${ml(r.foodDemand)} needed; build a reserve.`;
  add('food',foodShort?98:78,'Food & agriculture desk',foodShort?'Not enough food this month':'Food reserve is falling',tip,'market','Review food stocks');}
 const energyShort=r.energyRatio<.99,energyDraw=r.powerMade+1e-6<r.energyDemand;
 if(energyShort||energyDraw&&r.energyAfter<r.energyDemand){
  const workerLimited=r.staffing<.9&&r.power.plants.some(p=>!p.policy),coolingLimited=r.power.plants.some(p=>['coal','nuclear'].includes(p.type)&&p.generatedMWh<p.potentialMWh*.99);
  let tip=energyShort?`Only ${pct(r.energyRatio)}% of electricity needs can be met. ${coolingLimited?'Check cooling water for thermal plants.':workerLimited?'Staffing limits plant output; review workers or import power.':'Import power or add generation.'}`:`Power is covered this month. Generation is ${ml(r.powerMade)} MWh against ${ml(r.energyDemand)} needed; reserves would fall to ${ml(r.energyAfter)} MWh.`;
  add('energy',energyShort?97:76,'Energy service',energyShort?'Electricity supply is insufficient':'Power reserve is being used',tip,'power','Review electricity');
 }
 const polluted=nodes.filter(n=>n.concentration===null&&n.loadN>1e-8||Number.isFinite(n.concentration)&&n.concentration>ASSUMPTIONS.nitrogenTargetMgL).sort((a,b)=>(b.concentration??Infinity)-(a.concentration??Infinity)||a.id.localeCompare(b.id))[0];
 if(polluted){const source=s.tiles.find(t=>GEOGRAPHY.cells[t.id].basinId===polluted.id&&t.type==='industry');add('nitrogen',88,'Environment service',polluted.concentration===null?'Pollution retained in a dry channel':'River nitrogen is too high',polluted.concentration===null?`${polluted.label} has retained nitrogen but no flowing water. Reduce upstream pollution and restore river flow.`:`${polluted.label}: ${ml(polluted.concentration)} mg/L nitrogen exceeds the game target of ${ASSUMPTIONS.nitrogenTargetMgL}. Review wastewater treatment and upstream fertiliser use.`,'build','Review pollution controls',source?.id,{basinId:polluted.id});}
 const lowFlow=nodes.filter(n=>n.environmentTarget>0).sort((a,b)=>a.flowCompliance-b.flowCompliance)[0];
 if(lowFlow?.flowCompliance<.8)add('river-flow',84,'River ecology desk','Downstream nature needs water',`${lowFlow.label} receives ${pct(lowFlow.flowCompliance)}% of its environmental-flow target. Check river allocation and upstream withdrawals.`,'water','Review river allocation',undefined,{basinId:lowFlow.id});
 const erosion=nodes.filter(n=>n.erosionIndex<.8).sort((a,b)=>a.erosionIndex-b.erosionIndex)[0];
 if(erosion){const site=s.tiles.filter(t=>GEOGRAPHY.cells[t.id].basinId===erosion.id&&['farm','orchard'].includes(t.type)).sort((a,b)=>r.routed.tileResults[b.id].erosionRisk-r.routed.tileResults[a.id].erosionRisk)[0];add('erosion',69,'Land service','Soil protection needs attention',`${erosion.label} has elevated modeled erosion pressure. ${site?'Use soil-cover measures on steep farmland.':'Protect vegetation and restore suitable river buffers.'}`,'build','Review soil protection',site?.id,{basinId:erosion.id});}
 const habitat=nodes.filter(n=>n.habitatIndex<.8).sort((a,b)=>a.habitatIndex-b.habitatIndex)[0];
 if(habitat)add('habitat',64,'Ecology service','Habitat is under pressure',`${habitat.label} has limited natural habitat cover in the model. Review land conversion and restore suitable forest or wetland areas.`,'build','Review land use',undefined,{basinId:habitat.id});
 if(r.power.intensity>400)add('carbon',67,'Energy & environment desk','Power generation has high emissions',`Electricity averages ${Math.round(r.power.intensity)} kg CO₂e/MWh. Consider cleaner generation or efficiency while keeping supply reliable.`,'power','Review generation');
 const housingShort=r.spatial.housingRatio<.99,housingTight=s.population>0&&r.housing-s.population<Math.max(100,r.populationChange*2);
 if(housingShort||housingTight)add('housing',housingShort?91:67,'Community service',housingShort?'Some residents are unhoused':'Housing is nearly full',housingShort?`${pct(1-r.spatial.housingRatio)}% of residents lack housing. Restore homes with reliable water and electricity.`:`${Math.max(0,Math.floor(r.housing-s.population))} housing places remain. Plan serviced housing before the next population increase.`,'build','Review settlements',s.tiles.find(t=>t.type==='town')?.id);
 const idle=[...r.industry.factories].sort((a,b)=>a.operation-b.operation||a.id-b.id).find(p=>p.operation<.8);
 if(idle){const cause=[['water',idle.water],['power',idle.power],['workers',idle.staffing]].sort((a,b)=>a[1]-b[1])[0][0],iw=r.services.sectors.industry;
  const response=cause==='water'?(iw.allocationGap>.01?`Industry requests ${ml(iw.request)} ML against ${ml(iw.need)} needed. Raise its water request.`:'Review this factory’s connected river supply.'):cause==='power'?'Restore electricity or import power before expanding factories.':'More factories would share the same workers. Support settlement growth before expanding.';
  add('industry',70,'Industry desk',`Factory limited by ${cause}`,`Hex ${idle.id+1} operates at ${pct(idle.operation)}%. ${response}`,'build','Inspect this factory',idle.id,{cause});}
 if(r.budget.closing<0||r.net<0)add('budget',r.budget.closing<0?99:72,'Treasury desk',r.budget.closing<0?'Treasury cannot cover this month':'Operating costs exceed receipts',r.budget.closing<0?`The projected deficit is ${ml(-r.budget.closing)} credits. Reduce running costs or restore production before spending more.`:`Operations lose ${ml(-r.net)} credits this month, leaving ${ml(r.budget.closing)}. Review upkeep and productive tax sources.`,'nation','Review the budget');
 if(r.employment<.8)add('jobs',66,'Community service','Residents need productive work',`${r.workforce-r.employed} potential workers have no job places. Add suitable employment that your water and power can support.`,'nation','Review employment');
 if(r.happyAfter<50&&!foodShort&&!energyShort&&!w.worst)add('wellbeing',68,'Community service','Wellbeing is falling',`Projected wellbeing is ${Math.round(r.happyAfter)}%. Review taxes, public services and housing rather than adding resource supply blindly.`,'nation','Review public services');
 if(!cards.length)add('stable',10,'Basin council','Your current plan is balanced','Essential needs are covered. Check the impact of your next development before committing funds.','report','Review the basin');
 cards.push(...announcedEvents(s).map(e=>eventCard(e,s)));
 cards.sort((a,b)=>b.priority-a.priority||a.id.localeCompare(b.id));return {period:monthLabel(s.turn),cards};
}
