// Display geometry only. These widths and speeds never enter the hydrology model.
export const CONTEXT_BUFFER_KM=2;
export function polygonParts(geometry){return geometry.type==='Polygon'?[geometry.coordinates]:geometry.type==='MultiPolygon'?geometry.coordinates:[];}
export function projectedBasin(geometry,frame){return polygonParts(geometry).map(rings=>rings.map(ring=>ring.map(([lon,lat])=>frame.project(lon,lat))));}
export function basinExtent(geometry,frame,bufferKm=CONTEXT_BUFFER_KM){
 const p=projectedBasin(geometry,frame).flat(2),buffer=bufferKm*1000*frame.scale;
 return {minX:Math.min(...p.map(p=>p.x))-buffer,maxX:Math.max(...p.map(p=>p.x))+buffer,minZ:Math.min(...p.map(p=>p.z))-buffer,maxZ:Math.max(...p.map(p=>p.z))+buffer,buffer};
}
export function paintBasinMask(context,geometry,frame,width,height,bufferKm=CONTEXT_BUFFER_KM){
 // Green retains exact coverage; blue fades context; red identifies the basin.
 context.fillStyle='#000000';context.fillRect(0,0,width,height);context.save();
 context.setTransform(width/frame.width,0,0,height/frame.depth,width/2,height/2);
 context.lineWidth=bufferKm*2000*frame.scale;context.lineJoin='round';context.lineCap='round';
 const parts=projectedBasin(geometry,frame);
 const trace=rings=>{context.beginPath();for(const ring of rings){ring.forEach((p,i)=>i?context.lineTo(p.x,p.z):context.moveTo(p.x,p.z));context.closePath();}};
 for(const rings of parts){
  trace(rings);context.fillStyle='#00ff00';context.fill('evenodd');
  if(bufferKm>0){context.lineWidth=bufferKm*2000*frame.scale;context.strokeStyle='#00ff00';context.stroke();}
  if(bufferKm>0)for(let step=32;step>=1;step--){
   const t=1-step/33,smooth=t*t*(3-2*t);context.lineWidth=bufferKm*2000*frame.scale*step/32;
   context.strokeStyle=`rgb(0,255,${Math.round(255*smooth)})`;context.stroke();
  }
 }
 for(const rings of parts){trace(rings);context.fillStyle='#ffffff';context.fill('evenodd');}
 context.restore();
}
function segmentLength(a,b){return Math.hypot(b.x-a.x,b.z-a.z);}
export function smoothRiverPath(points,maxTrim=.32){
 // Round only a small neighbourhood of each survey vertex. Never move junctions.
 const result=[{...points[0]}],lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});
 for(let i=1;i<points.length-1;i++){
  const a=points[i-1],b=points[i],c=points[i+1],trim=Math.min(maxTrim,segmentLength(a,b)*.22,segmentLength(b,c)*.22);
  const entry=lerp(b,a,trim/segmentLength(a,b)),exit=lerp(b,c,trim/segmentLength(b,c));result.push(entry);
  for(let j=1;j<=6;j++){const t=j/6;result.push(lerp(lerp(entry,b,t),lerp(b,exit,t),t));}
 }
 result.push({...points.at(-1)});return result;
}
export function riverNetwork(features,frame){
 const reaches=features.flatMap(f=>{
  if(f.geometry.type!=='LineString')return [];
  const raw=f.geometry.coordinates.map(([lon,lat])=>frame.project(lon,lat)).filter((p,i,a)=>!i||segmentLength(a[i-1],p)>1e-8);
  if(raw.length<2)return [];
  const points=smoothRiverPath(raw);
  return [{id:String(f.properties.HYRIV_ID),downstream:String(f.properties.NEXT_DOWN),main:Number(f.properties.ORD_CLAS)===1,area:Number(f.properties.UPLAND_SKM)||0,points,length:points.slice(1).reduce((sum,p,i)=>sum+segmentLength(points[i],p),0)}];
 });
 const lookup=new Map(reaches.map(r=>[r.id,r])),distances=new Map();
 function distance(id,seen=new Set()){
  if(distances.has(id))return distances.get(id);const r=lookup.get(id);if(!r)return 0;
  if(seen.has(id))throw Error('River display network contains a cycle.');seen.add(id);
  const result=r.length+distance(r.downstream,seen);seen.delete(id);distances.set(id,result);return result;
 }
 const incoming=new Map();for(const r of reaches){const prev=incoming.get(r.downstream);if(!prev||r.area>prev.area)incoming.set(r.downstream,r);}
 const tangent=(a,b)=>{const length=segmentLength(a,b)||1;return {x:(b.x-a.x)/length,z:(b.z-a.z)/length};};
 const join=(a,b)=>{const length=Math.hypot(a.x+b.x,a.z+b.z)||1;return{x:(a.x+b.x)/length,z:(a.z+b.z)/length};};
 return reaches.map(r=>{const next=lookup.get(r.downstream),prev=incoming.get(r.id),start=tangent(r.points[0],r.points[1]),end=tangent(r.points.at(-2),r.points.at(-1)),area=Math.min(1,r.area/10161.2);return {...r,startDistance:-distance(r.id),width:.14+.62*Math.sqrt(area)+.8*Math.pow(area,1.8),startTangent:prev?join(tangent(prev.points.at(-2),prev.points.at(-1)),start):start,endTangent:next?join(end,tangent(next.points[0],next.points[1])):end};});
}
export function riverRibbon(reach,heightAt,step=.16,lift=.08){
 const points=[{...reach.points[0],distance:reach.startDistance}];let distance=reach.startDistance;
 for(let i=1;i<reach.points.length;i++){
  const a=reach.points[i-1],b=reach.points[i],length=segmentLength(a,b),steps=Math.max(1,Math.ceil(length/step));
  for(let j=1;j<=steps;j++){const t=j/steps;points.push({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,distance:distance+length*t});}distance+=length;
 }
 const positions=[],uvs=[],indices=[],columns=9;
 for(let i=0;i<points.length;i++){
  const p=points[i],prev=points[Math.max(0,i-1)],next=points[Math.min(points.length-1,i+1)];
  const direction=i===0?reach.startTangent:i===points.length-1?reach.endTangent:null;
  const dx=direction?.x??next.x-prev.x,dz=direction?.z??next.z-prev.z,len=Math.hypot(dx,dz)||1,nx=-dz/len,nz=dx/len;
  // Sample across the channel as well as along it: the coarse DEM can crest
  // above a single wide triangle even when both banks clear the terrain.
  for(let j=0;j<columns;j++){const side=j/(columns-1)*2-1,x=p.x+nx*reach.width*.5*side,z=p.z+nz*reach.width*.5*side;positions.push(x,heightAt(x,z)+lift,z);uvs.push(side,p.distance);}
  if(i)for(let j=0;j<columns-1;j++){const k=i*columns+j;indices.push(k-columns,k-columns+1,k,k-columns+1,k+1,k);}
 }
 return {positions,uvs,indices};
}
