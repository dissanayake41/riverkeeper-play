import {pointInRing} from './geography.mjs';

// Presentation only: keep symbolic developments in their management cell and
// clear of the actual rendered water ribbon. Never move simulation sites/HRUs.
export const LAND_FOOTPRINT={x:3.3,z:2.7};
export const BANK_GAP=.22;
function intersectsBox(a,b,box){
 let lo=0,hi=1;
 for(const [axis,min,max] of [['x',box.minX,box.maxX],['z',box.minZ,box.maxZ]]){
  const d=b[axis]-a[axis];
  if(Math.abs(d)<1e-12){if(a[axis]<min||a[axis]>max)return false;continue;}
  const u=(min-a[axis])/d,v=(max-a[axis])/d;
  lo=Math.max(lo,Math.min(u,v));hi=Math.min(hi,Math.max(u,v));if(lo>hi)return false;
 }
 return true;
}
export function footprintIsDry(point,scale,polygons,segments){
 const hx=LAND_FOOTPRINT.x*scale,hz=LAND_FOOTPRINT.z*scale;
 const box={minX:point.x-hx,maxX:point.x+hx,minZ:point.z-hz,maxZ:point.z+hz};
 const corners=[[box.minX,box.minZ],[box.maxX,box.minZ],[box.maxX,box.maxZ],[box.minX,box.maxZ]];
 const inside=polygons.some(rings=>corners.every(p=>pointInRing(p,rings[0])&&!rings.slice(1).some(r=>pointInRing(p,r)))&&
  !rings.some(ring=>ring.some((p,i)=>intersectsBox({x:p[0],z:p[1]},{x:ring[(i+1)%ring.length][0],z:ring[(i+1)%ring.length][1]},box))));
 if(!inside)return false;
 return !segments.some(({a,b,pad})=>intersectsBox(a,b,{minX:box.minX-pad,maxX:box.maxX+pad,minZ:box.minZ-pad,maxZ:box.maxZ+pad}));
}
export function createLandPlacement(frame,reaches){
 const allSegments=reaches.flatMap(r=>r.points.slice(1).map((b,i)=>({a:r.points[i],b,pad:r.width/2+BANK_GAP})));
 const cache=new Map();
 return (site,initialScale)=>{
  const key=`${site.id}:${initialScale}`;if(cache.has(key))return cache.get(key);
  const parts=site.geometry.type==='Polygon'?[site.geometry.coordinates]:site.geometry.coordinates;
  const polygons=parts.map(rings=>rings.map(ring=>ring.map(([lon,lat])=>{const p=frame.project(lon,lat);return [p.x,p.z];})));
  const points=polygons.flat(2),xs=points.map(p=>p[0]),zs=points.map(p=>p[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs),origin=frame.project(site.lon,site.lat);
  const segments=allSegments.filter(({a,b,pad})=>Math.max(a.x,b.x)+pad>=minX&&Math.min(a.x,b.x)-pad<=maxX&&Math.max(a.z,b.z)+pad>=minZ&&Math.min(a.z,b.z)-pad<=maxZ);
  const candidates=[origin];
  for(let i=0;i<25;i++)for(let j=0;j<25;j++)candidates.push({x:minX+(maxX-minX)*(i+.5)/25,z:minZ+(maxZ-minZ)*(j+.5)/25});
  candidates.sort((a,b)=>Math.hypot(a.x-origin.x,a.z-origin.z)-Math.hypot(b.x-origin.x,b.z-origin.z));
  // Fit the largest readable symbol first, then choose the nearest dry patch.
  for(let scale=initialScale;scale>=.00005;scale*=.82){
   const p=candidates.find(p=>footprintIsDry(p,scale,polygons,segments));
   if(p){const result={x:p.x,z:p.z,scale};cache.set(key,result);return result;}
  }
  // A tiny clipped cell can be entirely channel. Do not draw a land building
  // in water; the cell remains selectable through its grid and inspector.
  cache.set(key,null);return null;
 };
}
