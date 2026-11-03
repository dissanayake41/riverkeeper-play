import * as THREE from 'three';
import {containsCoordinate} from './geography.mjs';
import {createWeatherSchedule,seededRandom,stormAudibility,sampleRainFootprint} from './weather-model.mjs';

function cloudTexture(){
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(128,128);
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){
  const nx=(x-64)/64,ny=(y-64)/64,r=Math.hypot(nx,ny),noise=Math.sin(x*.14+Math.sin(y*.11)*2)*Math.sin(y*.17)+.4*Math.sin(x*.31+y*.21),a=Math.pow(Math.max(0,1-r),1.3)*(.8+noise*.15),shade=180+ny*25+noise*12,i=(y*128+x)*4;
  pixels.data[i]=shade;pixels.data[i+1]=shade+8;pixels.data[i+2]=shade+16;pixels.data[i+3]=Math.min(255,a*255);
 }
 ctx.putImageData(pixels,0,0);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
export function createBasinWeather({scene,sampler,boundary,sites,camera,onWeather,onThunder,reducedMotion,random=Math.random}){
 const locations=sites.map(s=>({...sampler.point(s.lon,s.lat),id:s.id,basinId:s.basinId}));
 const schedule=createWeatherSchedule(locations,{random}),texture=cloudTexture(),systems=new Map(),right=new THREE.Vector3();let enabled=true,flashes=true,lastReport=-1,current=[],elapsed=0,focusId=null;
 const inside=(x,z)=>containsCoordinate(boundary,sampler.frame.unproject(x,z));
 function create(storm){
  const rng=seededRandom(storm.seed),group=new THREE.Group(),drops=sampleRainFootprint(storm,inside,sampler.surfaceHeight,rng),clouds=[],positions=new Float32Array(drops.length*6);let high=Math.max(storm.y,...drops.map(d=>d.floor));
  group.name='Local rain cloud · '+storm.basinId;scene.add(group);
  const ceiling=high+10;
  for(let i=0;i<17;i++){
   const angle=rng()*Math.PI*2,r=Math.sqrt(rng())*storm.radius*.68;
   const material=new THREE.SpriteMaterial({map:texture,color:i%3?'#a6b9c8':'#d3dee5',transparent:true,opacity:0,depthWrite:false});
   const sprite=new THREE.Sprite(material);sprite.position.set(storm.x+Math.cos(angle)*r,ceiling+1+rng()*3.5,storm.z+Math.sin(angle)*r*.65);sprite.scale.set(storm.radius*(.9+rng()*.7),storm.radius*(.35+rng()*.24),1);sprite.renderOrder=5;group.add(sprite);clouds.push({sprite,base:sprite.position.clone(),phase:rng()*6});
  }
  const rainGeometry=new THREE.BufferGeometry();rainGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
  const rainMaterial=new THREE.LineBasicMaterial({color:'#bddbeb',transparent:true,opacity:0,depthWrite:false});const rain=new THREE.LineSegments(rainGeometry,rainMaterial);rain.frustumCulled=false;group.add(rain);
  const boltMaterial=new THREE.LineBasicMaterial({color:'#d9ebff',transparent:true,opacity:0,depthWrite:false}),boltGeometry=new THREE.BufferGeometry();boltGeometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(13*3),3));const bolt=new THREE.Line(boltGeometry,boltMaterial);bolt.frustumCulled=false;group.add(bolt);
  const light=new THREE.PointLight('#bed8ff',0,storm.radius*3,1.2);group.add(light);
  return {group,drops,clouds,rain,rainGeometry,rainMaterial,positions,ceiling,bolt,boltGeometry,boltMaterial,light,flash:-100,random:rng};
 }
 function remove(system){scene.remove(system.group);system.group.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}
 function soundPosition(storm,target,zoom){const distance=Math.hypot(storm.x-target.x,storm.z-target.z);right.setFromMatrixColumn(camera.matrixWorld,0);return {strength:stormAudibility(storm,target,zoom),delay:Math.min(9,1.2+distance*.15),pan:Math.max(-.8,Math.min(.8,((storm.x-target.x)*right.x+(storm.z-target.z)*right.z)/45))};}
 return {
  tick(dt,target,zoom){
   if(!enabled)return;const state=schedule.tick(dt,target);elapsed=state.elapsed;current=state.storms;
   for(const [id,system]of systems)if(!current.some(s=>s.id===id)){remove(system);systems.delete(id);}
   let rainLevel=0,panTotal=0;
   for(const storm of current){
    if(!systems.has(storm.id))systems.set(storm.id,create(storm));const system=systems.get(storm.id),reduced=reducedMotion.matches;
    for(const c of system.clouds){c.sprite.material.opacity=storm.intensity*.58;c.sprite.position.x=c.base.x+(reduced?0:Math.sin(elapsed*.12+c.phase)*.8);}
    system.rain.visible=!reduced;system.rainMaterial.opacity=storm.intensity*.43;
    if(!reduced){for(let i=0;i<system.drops.length;i++){const d=system.drops[i],height=system.ceiling-d.floor,phase=(d.phase+elapsed*d.speed/height)%1,y=system.ceiling-phase*height,index=i*6;system.positions.set([d.x,y,d.z,d.x+.12,Math.max(d.floor,y-.55),d.z+.04],index);}system.rainGeometry.attributes.position.needsUpdate=true;}
    const flashAge=elapsed-system.flash,flash=flashes&&!reduced&&flashAge>=0&&flashAge<.55?Math.exp(-flashAge*9):0;system.boltMaterial.opacity=flash*.85;system.light.intensity=flash*11;
    const sound=soundPosition(storm,target,zoom);rainLevel+=sound.strength;panTotal+=sound.pan*sound.strength;
   }
   for(const strike of state.lightning){const storm=current.find(s=>s.id===strike.id),system=systems.get(strike.id),drop=system.drops[Math.floor(system.random()*system.drops.length)];
    system.flash=elapsed;const vertices=system.boltGeometry.attributes.position;for(let i=0;i<13;i++){const t=i/12;vertices.setXYZ(i,drop.x+(i===12?0:(system.random()-.5)*1.1),system.ceiling+(drop.floor-system.ceiling)*t,drop.z+(i===12?0:(system.random()-.5)*.7));}vertices.needsUpdate=true;system.light.position.set(drop.x,system.ceiling-2,drop.z);
    onThunder?.(soundPosition(storm,target,zoom));
   }
   if(elapsed-lastReport>.4){lastReport=elapsed;const most=current.toSorted((a,b)=>stormAudibility(b,target,zoom)-stormAudibility(a,target,zoom))[0];focusId=most?.id;onWeather?.({rain:Math.min(1,rainLevel),rainPan:rainLevel?panTotal/rainLevel:0,active:current.length,basinId:most?.basinId,storm:!!most?.thundery,label:most?(most.age>most.duration-10?'Shower clearing':most.intensity<.2?'Clouds gathering':most.thundery?'Thundershower':'Local rain'):'Dry weather'});}
  },
  setEnabled(value){enabled=!!value;if(!enabled){for(const system of systems.values())remove(system);systems.clear();current=[];schedule.reset();elapsed=0;lastReport=-1;onWeather?.({rain:0,rainPan:0,active:0,label:'Weather off'});}},
  setLightning(value){flashes=!!value;if(!flashes)for(const system of systems.values()){system.boltMaterial.opacity=0;system.light.intensity=0;}},
  focus(){const storm=current.find(s=>s.id===focusId)||current[0];return storm?{x:storm.x,y:storm.y,z:storm.z}:null;},
  dispose(){for(const system of systems.values())remove(system);systems.clear();texture.dispose();}
 };
}
