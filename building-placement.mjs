const structures=new Set(['town','farm','industry','reservoir','treatment','clinic','solar','wind','coal','hydro','nuclear']);
export const needsPlatform=type=>structures.has(type);
export function buildingPlacement(sampler,x,z,initialScale){
 let scale=initialScale;
 const heights=size=>{const samples=[];for(let i=0;i<=12;i++)for(let j=0;j<=10;j++)samples.push(sampler.surfaceHeight(x+(-3.3+i*.55)*size,z+(-2.7+j*.54)*size));return samples;};
 let samples=heights(scale);
 while(scale>.85&&Math.max(...samples)-Math.min(...samples)>.8){scale=Math.max(.85,scale*.8);samples=heights(scale);}
 const top=sampler.maxSurfaceHeight(x-3.3*scale,z-2.7*scale,x+3.3*scale,z+2.7*scale)+.08;
 return {scale,top};
}
