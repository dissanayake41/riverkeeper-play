import {createGeoFrame,findSubBasin} from './geography.mjs';

// The raster is row-major, west to east and north to south, in metres.
export function createTerrainSampler(data, width=180, exaggeration=3) {
 const {bounds,columns,rows,elevations}=data;
 if(!Number.isInteger(columns)||!Number.isInteger(rows)||columns<2||rows<2||elevations.length!==columns*rows||!elevations.every(Number.isFinite))throw Error('Invalid elevation grid');
 const frame=createGeoFrame(bounds,width);
 function metres(lon,lat){
  const u=Math.max(0,Math.min(1,(lon-bounds[0])/(bounds[2]-bounds[0])))*(columns-1);
  const v=Math.max(0,Math.min(1,(bounds[3]-lat)/(bounds[3]-bounds[1])))*(rows-1);
  const x=Math.min(columns-2,Math.floor(u)),y=Math.min(rows-2,Math.floor(v)),fx=u-x,fy=v-y;
  const a=elevations[y*columns+x]*(1-fx)+elevations[y*columns+x+1]*fx;
  const b=elevations[(y+1)*columns+x]*(1-fx)+elevations[(y+1)*columns+x+1]*fx;
  return a*(1-fy)+b*fy;
 }
 return {frame,exaggeration,metres,
  maxSurfaceHeight(minX,minZ,maxX,maxZ){
   // A triangle cannot exceed its vertices. Include every DEM cell touched
   // by the footprint, so even a narrow peak cannot bury a flat building.
   const a=frame.unproject(minX,minZ),b=frame.unproject(maxX,maxZ);
   const col=lon=>(lon-bounds[0])/(bounds[2]-bounds[0])*(columns-1),row=lat=>(bounds[3]-lat)/(bounds[3]-bounds[1])*(rows-1);
   const x0=Math.max(0,Math.floor(Math.min(col(a[0]),col(b[0])))),x1=Math.min(columns-1,Math.ceil(Math.max(col(a[0]),col(b[0]))));
   const z0=Math.max(0,Math.floor(Math.min(row(a[1]),row(b[1])))),z1=Math.min(rows-1,Math.ceil(Math.max(row(a[1]),row(b[1]))));
   let highest=0;for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++)highest=Math.max(highest,elevations[z*columns+x]);
   return highest*frame.scale*exaggeration;
  },
  surfaceHeight(x,z){
   // Match the two triangles in each rendered PlaneGeometry cell exactly.
   const [lon,lat]=frame.unproject(x,z),u=Math.max(0,Math.min(1,(lon-bounds[0])/(bounds[2]-bounds[0])))*(columns-1),v=Math.max(0,Math.min(1,(bounds[3]-lat)/(bounds[3]-bounds[1])))*(rows-1);
   const col=Math.min(columns-2,Math.floor(u)),row=Math.min(rows-2,Math.floor(v)),fx=u-col,fy=v-row;
   const a=Math.max(0,elevations[row*columns+col]),b=Math.max(0,elevations[(row+1)*columns+col]),c=Math.max(0,elevations[(row+1)*columns+col+1]),d=Math.max(0,elevations[row*columns+col+1]);
   return (fx+fy<=1?a+(d-a)*fx+(b-a)*fy:c+(b-c)*(1-fx)+(d-c)*(1-fy))*frame.scale*exaggeration;
  },
  point(lon,lat,lift=0){const p=frame.project(lon,lat,Math.max(0,metres(lon,lat))*exaggeration);p.y+=lift;return p;},
  height(x,z){const [lon,lat]=frame.unproject(x,z);return Math.max(0,metres(lon,lat))*frame.scale*exaggeration;}
 };
}

// These are scenario sites, not surveyed structures or SWAT HRUs. Candidate
// points are assigned only inside supplied drainage polygons, independently of
// game-state order, and remain stable when buildings change.
export function createScenarioSites(features,bounds,count=63){
 const candidates=[];
 for(let r=0;r<45;r++)for(let c=0;c<25;c++){
  const lon=bounds[0]+(c+.5+(r%2)*.15)/25*(bounds[2]-bounds[0]);
  const lat=bounds[3]-(r+.5)/45*(bounds[3]-bounds[1]);
  const basin=findSubBasin(features,[lon,lat]);
  if(basin)candidates.push({lon,lat,basinId:String(basin.properties.id)});
 }
 if(candidates.length<count)throw Error('Insufficient land inside drainage boundaries');
 return Array.from({length:count},(_,i)=>candidates[Math.floor(i*candidates.length/count)]);
}
