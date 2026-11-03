const sum=xs=>xs.reduce((a,b)=>a+b,0);
export function waterService(s,r){
 const sectors={};
 for(const key of ['people','farms','industry','power']){
  const nodes=Object.values(r.routed.nodes).map(n=>{
   const source=r.spatial.nodes[n.id],need=source.demand[key]||0,request=key==='power'?need:Math.min(need,(s.allocation[key]||0)*(r.spatial.demand[key]?need/r.spatial.demand[key]:0)),powered=key==='power'?request:request*r.energyRatio,supplied=n.withdrawals[key]||0;
   return {id:n.id,label:n.label,need,request,supplied,netNeed:source.netNeed[key],delivered:need?supplied*source.netNeed[key]/need:0,allocationGap:Math.max(0,need-request),powerGap:Math.max(0,request-powered),sourceGap:Math.max(0,powered-supplied),shortfall:Math.max(0,need-supplied)};
  }).filter(n=>n.need>1e-9);
  sectors[key]={nodes,...Object.fromEntries(['need','request','supplied','netNeed','delivered','allocationGap','powerGap','sourceGap','shortfall'].map(k=>[k,sum(nodes.map(n=>n[k]))]))};
  sectors[key].cause=[['allocation',sectors[key].allocationGap],['power',sectors[key].powerGap],['source',sectors[key].sourceGap]].sort((a,b)=>b[1]-a[1])[0][0];
  sectors[key].ratio=sectors[key].need?sectors[key].supplied/sectors[key].need:1;
  sectors[key].worst=nodes.filter(n=>n.supplied/n.need<.99).sort((a,b)=>b.shortfall-a.shortfall)[0]||null;
 }
 return {inflow:r.flow,stored:sum(Object.values(s.basinStorage||{})),total:r.available,sectors};
}
