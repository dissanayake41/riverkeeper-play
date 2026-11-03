// Policy choices for the educational game, not calibrated environmental limits.
// Physical balances are calculated by the engine before this assessment runs.
export const SCORE_VERSION='basin-outcomes-4';
export const SIGNED_SCORE_VERSIONS=['basin-outcomes-1','basin-outcomes-2','basin-outcomes-3',SCORE_VERSION];
const clamp=n=>Math.max(0,Math.min(1,n));
const sum=a=>a.reduce((n,v)=>n+v,0);
export const SCORE_WEIGHTS={water:15,food:15,energy:10,economy:0,society:20,environment:40};
const names={water:'Household water',food:'Food security',energy:'Reliable energy',economy:'Public finances',society:'People & livelihoods',environment:'Healthy basin'};

export function basinScore({balance,indicators,routed,basins,foodRatio,energyRatio,foodAfter,foodDemand,energyAfter,energyDemand,housing,employment,budget,power,previous,development}){
 const nodes=Object.values(routed.nodes),areas=new Map(basins.map(b=>[b.id,b.areaKm2])),area=sum([...areas.values()]);
 const average=key=>sum(nodes.map(n=>clamp(n[key])*(areas.get(n.id)||0)))/Math.max(1,area);
 const worst=key=>Math.min(1,...nodes.map(n=>clamp(n[key])));
 // Area-weighted exposure plus a local safeguard: a small damaged tributary
 // cannot disappear inside a healthy basin average. These are not summed loads.
 const pressure=key=>.75*(1-average(key))+.25*(1-worst(key));
 const foodReserve=foodDemand>0?clamp(foodAfter/foodDemand):1,energyReserve=energyDemand>0?clamp(energyAfter/energyDemand):1;
 const metrics={
  waterShortage:clamp(.65*(1-routed.householdRatio)+.35*(1-routed.worstHousehold)),
  foodShortage:1-clamp(foodRatio),energyShortage:1-clamp(energyRatio),
  housingShortage:1-clamp(housing),unemployment:clamp((.8-employment)/.8),
  flowStress:pressure('flowCompliance'),pollution:pressure('waterQuality'),habitatLoss:pressure('habitatIndex'),
  erosion:clamp((.85-average('erosionIndex'))/.85),
  carbon:clamp(power.intensity/(400+power.intensity)),
  fiscalStress:Math.max(clamp(-budget.net/Math.max(1,budget.expenses)),budget.closing<0?1:0),
  foodReserve,energyReserve
 };
 const streaks={},deductions=[];
 const penalty=(id,label,severity,maximum,persistent=false)=>{
  const prior=SIGNED_SCORE_VERSIONS.includes(previous?.version)?previous.streaks?.[id]||0:0;
  const streak=persistent&&severity>.05?prior+1:0;streaks[id]=streak;
  const multiplier=persistent?1+Math.min(3,Math.max(0,streak-1))*.25:1;
  const points=Math.round(maximum*clamp(severity)*multiplier);
  if(points)deductions.push({id,label,points,severity:clamp(severity),streak,multiplier});
 };
 penalty('water','Unmet household water',metrics.waterShortage,650,true);
 penalty('food','Unmet food needs',metrics.foodShortage,650,true);
 penalty('energy','Power shortages',metrics.energyShortage,350,true);
 penalty('housing','Unhoused or overcrowded residents',metrics.housingShortage,250,true);
 penalty('jobs','Unemployment above 20%',metrics.unemployment,120);
 penalty('flow','River flow below ecological target',metrics.flowStress,450,true);
 penalty('pollution','Connected nitrogen pollution',metrics.pollution,400,true);
 penalty('habitat','Habitat below reference cover',metrics.habitatLoss,250);
 penalty('erosion','Elevated erosion pressure',metrics.erosion,180);
 penalty('carbon','Generation carbon intensity',metrics.carbon,200);
 penalty('budget','Unsustainable operating budget',metrics.fiscalStress,200);
 penalty('foodReserve','Less than one month of food reserve',1-foodReserve,60);
 penalty('energyReserve','Less than one month of energy reserve',1-energyReserve,40);
 const rewards=Object.entries(SCORE_WEIGHTS).map(([id,weight])=>({id,label:names[id],points:Math.round(weight*clamp(indicators[id]))}));
 // Reward delivered development against the common starting scenario, not
 // construction counts, treasury hoarding, grants or repeated reserve bonuses.
 const d=development,ref=d?.reference;
 const progress=[];
 const add=(id,label,value,scale,maximum)=>progress.push({id,label,points:Math.round(maximum*clamp(value/Math.max(1e-9,scale))),value,scale,maximum});
 let outlook=1,gate=0,earnedMargin=0;
 if(ref){
  const monthly=30/d.days;
  const usefulFood=Math.min(d.foodMade,foodDemand+Math.max(0,2*foodDemand-d.foodOpening)+(d.foodExports||0));
  const usefulPower=Math.min(d.powerMade,energyDemand+Math.max(0,energyDemand-d.energyOpening)+(d.energyExports||0));
  // Manual exports may draw on old/imported stocks: only current net production
  // can qualify, and all same-period import costs reduce the earned margin.
  const exportValue=Math.min((budget.period.exports||0)+(budget.autoExports||0),Math.max(0,d.foodMade-foodDemand)+Math.max(0,d.powerMade-energyDemand));
  earnedMargin=(budget.taxIncome-budget.expenses+exportValue-(budget.period.imports||0))*monthly;
  const supported=d.population*Math.min(routed.worstHousehold,foodRatio,energyRatio,housing);
  add('growth','Additional residents reliably served',supported-ref.population,ref.population,200);
  add('livelihoods','Additional effective employment',d.population*.55*employment-ref.workers,ref.population*.55,100);
  add('income','Earned operating income above start',earnedMargin-ref.margin,100,150);
  add('harvest','Additional useful food production',usefulFood*monthly-ref.food,ref.food,100);
  add('generation','Additional useful electricity',usefulPower*monthly-ref.energy,ref.energy,100);
  add('restoration','Improved ecosystem condition',indicators.environment-ref.environment,.1,100);
  // A reserve-runway screen, not a claim to simulate future weather/hydrology.
  const foodOutlook=foodDemand?clamp((foodAfter+3*d.foodMade)/(3*foodDemand)):1;
  const powerOutlook=energyDemand?clamp((energyAfter+3*d.powerMade)/(3*energyDemand)):1;
  outlook=Math.min(foodOutlook,powerOutlook);
  const essential=Math.min(routed.worstHousehold,foodRatio,energyRatio,housing);
  const social=clamp(indicators.society),environment=clamp(indicators.environment);
  gate=clamp(essential)*Math.sqrt(social*environment)*outlook;
  rewards.push(...progress);
 }
 const achievements=[];
 const earned=sum(rewards.map(r=>r.points));
 const serviceValues=Object.values(indicators).map(clamp);
 const geometric=serviceValues.some(v=>!v)?0:Math.exp(sum(serviceValues.map(Math.log))/serviceValues.length)*100;
 const balanceIndex=Math.round(Math.min(geometric,Math.min(...serviceValues)*100+25));
 const imbalance=Math.round(sum(progress.map(r=>r.points))*(1-gate));
 if(imbalance)deductions.unshift({id:'balance',label:'Development limited by services, wellbeing, ecology & reserve outlook',points:imbalance,severity:1-gate,streak:0,multiplier:1});
 const lost=sum(deductions.map(d=>d.points)),points=earned-lost;
 const hotspots=nodes.map(n=>({id:n.id,label:n.label,population:n.population,water:n.waterRatio,flow:n.flowCompliance,quality:n.waterQuality,habitat:n.habitatIndex,
  severity:Math.max(n.population>0?1-n.waterRatio:0,1-n.flowCompliance,1-n.waterQuality,1-n.habitatIndex),
  issues:[n.population>0&&n.waterRatio<.95?'household water shortage':null,n.flowCompliance<.95?'low river flow':null,n.waterQuality<.95?'nitrogen pollution':null,n.habitatIndex<.95?'habitat pressure':null].filter(Boolean)
 })).filter(n=>n.issues.length).sort((a,b)=>b.severity-a.severity).slice(0,5);
 return {...balance,total:points/10,balanceIndex,points,earned,lost,rewards,deductions,metrics,streaks,hotspots,achievements,version:SCORE_VERSION,
  development:{progress,gate,outlook,earnedMargin,reference:ref||null},
  method:'Up to 100 stewardship points plus 750 for supported population, effective jobs, earned operating income, useful food/electricity and ecosystem improvement above the starting basin. Development rewards depend on service, social, environmental and reserve balance. Harm penalties can make the score negative. Grants and stored cash earn no points. Scenario design weights, not calibrated scientific values.'};
}
