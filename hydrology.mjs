const $=s=>document.querySelector(s),months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];let current,baseline,available=false,busy=false,selection=0;
const number=n=>n.toLocaleString(undefined,{maximumFractionDigits:1});
function show(r,mode){
 current=r;$('#result-mode').textContent=mode;$('#result-mode').classList.remove('model-stale');
 const stats=[['Rainfall',r.totals.precip,'mm / year'],['Surface runoff',r.totals.surq_gen,'mm generated / year'],['Evapotranspiration',r.totals.et,'mm / year'],['Soil + snow storage',r.balance.storageChangeMm,'mm change over year'],['Land area',r.areaHa,`${r.hruCount} units · hectares`]];
 $('#model-stats').innerHTML=stats.map(([label,n,unit])=>`<div class="stat"><span class="stat-label">${label}</span><strong>${number(n)}</strong><small>${unit}</small></div>`).join('');
 const max=Math.ceil(Math.max(...r.months.flatMap(m=>[m.precip,m.et,m.surq_gen]))/50)*50||50,y=n=>280-n/max*240;
 let svg='';for(let i=0;i<=4;i++){const n=max*i/4;svg+=`<line x1="45" x2="744" y1="${y(n)}" y2="${y(n)}" stroke="#344d57"/><text x="35" y="${y(n)+4}" text-anchor="end">${Math.round(n)}</text>`;}
 r.months.forEach((m,i)=>{const x=66+i*57;[['precip','#75cddd'],['et','#d5ed92'],['surq_gen','#ffb68d']].forEach(([k,color],j)=>{svg+=`<rect x="${x+j*12}" y="${y(m[k])}" width="9" height="${280-y(m[k])}" rx="2" fill="${color}"><title>${months[i]} ${k}: ${number(m[k])} mm</title></rect>`;});svg+=`<text x="${x+14}" y="306" text-anchor="middle">${months[i]}</text>`;});$('#hydro-chart').innerHTML=svg;
 $('#month-table').innerHTML=r.months.map((m,i)=>`<tr><td>${months[i]}</td><td>${number(m.precip)}</td><td>${number(m.et)}</td><td>${number(m.surq_gen)}</td></tr>`).join('');
 $('#balance-check').innerHTML=`<div class="balance-number">${Math.abs(r.balance.residualMm).toFixed(3)} <small>mm</small></div><div class="balance-detail">Annual residual · tolerance ${r.balance.toleranceMm} mm<br>${r.days} complete days × ${r.hruCount} land units</div>`;
 const change=baseline&&r.rainfallFactor!==1?` Surface runoff changes by ${((r.totals.surq_gen/baseline.totals.surq_gen-1)*100).toFixed(1)}% from baseline.`:'';
 $('#provenance').textContent=`SWAT+ ${r.version} · ${r.dataset} · ${r.reportYear} · Rainfall ×${r.rainfallFactor}. Run completed ${new Date(r.completedAt).toLocaleString()}.${change} Results use normalized HRU areas because the fixture’s original basin weights sum to 2. Run ID: ${r.runId}.`;
}
async function loadSaved(factor){const seq=++selection;try{const response=await fetch(`model-results/${factor}.json`);if(!response.ok)throw Error('Verified result is unavailable.');const r=await response.json();if(seq!==selection)return;if(factor===1)baseline=r;show(r,document.querySelector('meta[name="riverkeeper-hosting"]')?.content==='static'?'Saved SWAT+ reference result · live model runs are not available on this website.':'Previously verified SWAT+ run · select Run SWAT+ to recompute locally.');}catch(e){$('#result-mode').textContent=e.message;$('#result-mode').classList.add('model-stale');}}
$('#scenario').onchange=()=>loadSaved(Number($('#scenario').value));
$('#run-model').onclick=async()=>{
 if(busy||!available)return;busy=true;$('#run-model').disabled=true;$('#scenario').disabled=true;$('#result-mode').textContent='Running SWAT+ and checking complete outputs…';
 try{const response=await fetch('/api/swat/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rainfallFactor:Number($('#scenario').value)})});const r=await response.json();if(!response.ok)throw Error(r.error||'Model run failed.');if(r.rainfallFactor===1)baseline=r;show(r,'Fresh local SWAT+ run · complete outputs and water balance checked.');}
 catch(e){$('#result-mode').textContent=`Run failed: ${e.message} Previous result remains visible.`;$('#result-mode').classList.add('model-stale');}
 finally{busy=false;$('#run-model').disabled=!available;$('#scenario').disabled=false;}
};
$('#download-result').onclick=()=>{if(!current)return;const url=URL.createObjectURL(new Blob([JSON.stringify(current,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`swat-${current.runId}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
await loadSaved(1);
if(document.querySelector('meta[name="riverkeeper-hosting"]')?.content!=='static'){
 try{const response=await fetch('/api/swat/status');const s=await response.json();available=!!s.available;$('#model-status').textContent=available?`SWAT+ ${s.version} · local engine ready`:'Verified saved results · local engine unavailable';}catch{$('#model-status').textContent='Verified saved results · local engine unavailable';}
}else{$('#model-status').textContent='Saved reference results · browser edition';$('#run-model').title='Live SWAT+ runs require the separately installed local engine.';}
$('#run-model').disabled=!available;
