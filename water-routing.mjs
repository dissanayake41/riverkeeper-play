// Reservoir operating plan: preserve attainable downstream withdrawals and river
// releases before impounding new surplus. No transfers across drainage branches.
const sum=xs=>xs.reduce((a,b)=>a+b,0);
export function waterRequests(s,sp,node,energyRatio){return Object.fromEntries(['people','farms','industry','power'].map(k=>[k,k==='power'?node.demand.power:Math.min(node.demand[k],s.allocation[k]*(sp.demand[k]?node.demand[k]/sp.demand[k]:0))*energyRatio]));}
export function reserveTarget(s,sp,node,environmentFraction,hasRelease){return Math.max(node.referenceFlow*Math.min(1,s.allocation.nature/Math.max(1,sp.flow)),hasRelease?node.referenceFlow*environmentFraction:0);}
export function planReservoirReleases(s,sp,order,energyRatio,{environmentFraction,consumptionFraction,releasePolicy}){
 const plan={};
 for(const b of order){const node=sp.nodes[b.id],parents=order.filter(p=>p.downstream===b.id),incoming=node.localFlow+(s.basinStorage?.[b.id]||0)+sum(parents.map(p=>plan[p.id].outflow));
  const reserve=reserveTarget(s,sp,node,environmentFraction,node.tiles.some(releasePolicy)),requests=waterRequests(s,sp,node,energyRatio),requested=sum(Object.values(requests));
  const ratio=requested?Math.min(1,Math.max(0,incoming-reserve)/requested):1;
  let depletion=0;for(const k of Object.keys(requests)){const withdrawn=requests[k]*ratio,delivered=node.demand[k]?withdrawn*node.netNeed[k]/node.demand[k]:0;depletion+=withdrawn-delivered+(k==='power'?(node.demand[k]?node.coolingConsumed*withdrawn/node.demand[k]:0):delivered*consumptionFraction[k]);}
  plan[b.id]={incoming,outflow:Math.max(0,incoming-depletion),withdrawn:requested*ratio,depletion,reserve,requiredOutflow:Math.min(incoming,reserve)};
 }
 for(const b of [...order].reverse()){
  const node=sp.nodes[b.id],p=plan[b.id],parents=order.filter(n=>n.downstream===b.id);
  const requiredIncoming=Math.min(p.incoming,Math.max(p.withdrawn+p.reserve,p.requiredOutflow+p.depletion));
  const needFromParents=Math.max(0,requiredIncoming-node.localFlow-(s.basinStorage?.[b.id]||0)),parentFlow=sum(parents.map(n=>plan[n.id].outflow));
  for(const parent of parents){const upstream=plan[parent.id];upstream.requiredOutflow=Math.max(upstream.requiredOutflow,parentFlow?needFromParents*upstream.outflow/parentFlow:0);}
 }
 return plan;
}
