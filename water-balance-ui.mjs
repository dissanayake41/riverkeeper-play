const sectors={people:'Communities',farms:'Agriculture',industry:'Industry',power:'Electricity cooling'};
const ml=n=>Number(n||0).toFixed(1)+' ML';
export function waterBalanceView(report){
 const d=report.routed.diagnostics,use=report.routed.sectorUse,total=d.localFlow+d.oldStorage;
 const segments=use?Object.entries(sectors).map(([key,label])=>[label,use[key].consumed+use[key].loss,key]):[['Used / lost',d.consumed+d.conveyanceLoss,'used']];
 segments.push(['Stored for later',d.newStorage,'stored'],['River outflow',d.outlet,'river']);
 const rows=Object.entries(sectors).map(([key,label])=>`<span class="water-tip-row"><span><i class="water-dot ${key}"></i>${label}</span><b>${ml(report.routed.water[key])}</b></span>`).join('');
 const markup=`<span class="water-tip-heading">${report.completed?'Last month':'Monthly water forecast'}</span><span class="water-tip-summary">Inflow ${ml(d.localFlow)} + opening storage ${ml(d.oldStorage)}</span><span class="water-tip-label">Water withdrawn for use</span>${rows}<span class="water-tip-foot">Some withdrawn water returns to the river and can be used downstream. Hydropower passes river water through turbines; it is not a cooling withdrawal.</span><span class="water-tip-label">Where the available water ends up</span>${[['Consumed or lost',d.consumed+d.conveyanceLoss],['Stored for later',d.newStorage],['Flowing out of the basin',d.outlet]].map(([label,value])=>`<span class="water-tip-row"><span>${label}</span><b>${ml(value)}</b></span>`).join('')}<span class="water-tip-foot">River outflow supports ecosystems and downstream users. ${use?'Bar colours show consumption + losses by sector, storage and outflow; returned water is counted once.':'This earlier report groups all consumption and losses together in the bar; sector withdrawals are shown above.'}</span>`;
 return {total,segments,markup};
}
