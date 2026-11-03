// Atmospheric presentation only. This clock never changes the monthly water model.
export const WEATHER_RULES={firstDelayMin:30,firstDelayMax:120,gapMin:30,gapMax:240,durationMin:25,durationMax:45,maxStorms:1};
export const clamp01=n=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0));
export function seededRandom(seed){let v=seed>>>0||1;return()=>{v^=v<<13;v^=v>>>17;v^=v<<5;return (v>>>0)/4294967296;};}
export function stormEnvelope(age,duration){return clamp01(Math.min(age/8,(duration-age)/12));}
export function stormAudibility(storm,target,zoom=1){return clamp01(storm.intensity*Math.exp(-Math.hypot(storm.x-target.x,storm.z-target.z)/(storm.radius*1.15))*(.35+.65*clamp01(zoom)));}
export function sampleRainFootprint(storm,inside,height,random,count=850){
 if(!inside(storm.x,storm.z))throw Error('Storm centre must be inside the basin.');
 return Array.from({length:count},()=>{
  let x=storm.x,z=storm.z;for(let n=0;n<40;n++){const angle=random()*Math.PI*2,r=Math.sqrt(random())*storm.radius;x=storm.x+Math.cos(angle)*r;z=storm.z+Math.sin(angle)*r*.7;if(inside(x,z))break;x=storm.x;z=storm.z;}
  return {x,z,floor:height(x,z)+.15,phase:random(),speed:9+random()*7};
 });
}
export function createWeatherSchedule(sites,{random=Math.random,rules=WEATHER_RULES}={}){
 const range=(a,b)=>a+(b-a)*random();
 let elapsed=0,next=range(rules.firstDelayMin,rules.firstDelayMax),serial=0,lastSite=null,storms=[];
 return {
  tick(dt,target={x:0,z:0}){
   const lightning=[];elapsed+=Math.max(0,Math.min(1,Number.isFinite(dt)?dt:0));
   storms=storms.filter(s=>elapsed-s.start<s.duration);
   if(sites.length&&elapsed>=next&&storms.length<rules.maxStorms){
    let choices=sites.filter(s=>s.id!==lastSite&&!storms.some(a=>Math.hypot(s.x-a.x,s.z-a.z)<a.radius*1.6));
    if(!choices.length)choices=sites.filter(s=>s.id!==lastSite);if(!choices.length)choices=sites;
    // Let the first shower be discoverable near the opening view; later showers
    // sample the entire basin independently of where the player looks.
    if(serial===0)choices=choices.toSorted((a,b)=>Math.hypot(a.x-target.x,a.z-target.z)-Math.hypot(b.x-target.x,b.z-target.z)).slice(0,8);
    const site=choices[Math.min(choices.length-1,Math.floor(random()*choices.length))];lastSite=site.id;
    const duration=range(rules.durationMin,rules.durationMax);
    storms.push({...site,id:++serial,siteId:site.id,start:elapsed,duration,radius:range(9,16),strength:range(.55,.95),thundery:random()<.3,nextLightning:elapsed+range(15,25),seed:Math.floor(random()*4294967295)});
    // The dry interval starts AFTER the shower ends, never at its beginning.
    next=elapsed+duration+range(rules.gapMin,rules.gapMax);
   }
   for(const s of storms){s.age=elapsed-s.start;s.intensity=s.strength*stormEnvelope(s.age,s.duration);
    if(s.thundery&&elapsed>=s.nextLightning&&s.age<s.duration-10){lightning.push({id:s.id,strength:s.intensity});s.nextLightning=elapsed+range(18,30);}
   }
   return {storms:storms.map(s=>({...s})),lightning,elapsed};
  },
  reset(){elapsed=0;next=range(rules.firstDelayMin,rules.firstDelayMax);serial=0;lastSite=null;storms=[];}
 };
}
