// Geographic coordinates are longitude/latitude in degrees (EPSG:4326).
// Keep imagery, elevation and drainage boundaries in one shared local frame.
export function createGeoFrame(bounds, width = 180) {
 const [west,south,east,north]=bounds;
 if (![...bounds,width].every(Number.isFinite)||east<=west||north<=south||south<=-85||north>=85||width<=0) throw new Error('Invalid geographic extent');
 const latitude=(south+north)/2, metresPerDegree=111319.49079327358;
 const widthMetres=(east-west)*metresPerDegree*Math.cos(latitude*Math.PI/180);
 const scale=width/widthMetres, depth=(north-south)*metresPerDegree*scale;
 return {bounds,width,depth,scale,
  project(lon,lat,elevation=0){return {x:((lon-west)/(east-west)-.5)*width,y:elevation*scale,z:(.5-(lat-south)/(north-south))*depth};},
  unproject(x,z){return [west+(x/width+.5)*(east-west),south+(.5-z/depth)*(north-south)];},
  uv(lon,lat){return [(lon-west)/(east-west),(lat-south)/(north-south)];}
 };
}
export function pointInRing(point,ring){
 let inside=false;const [x,y]=point;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const [xi,yi]=ring[i],[xj,yj]=ring[j];
  if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;
 }
 return inside;
}
export function containsCoordinate(geometry,coordinate){
 const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.type==='MultiPolygon'?geometry.coordinates:[];
 return polygons.some(rings=>pointInRing(coordinate,rings[0])&&!rings.slice(1).some(r=>pointInRing(coordinate,r)));
}
export function findSubBasin(features,coordinate){return features.find(f=>containsCoordinate(f.geometry,coordinate))??null;}
