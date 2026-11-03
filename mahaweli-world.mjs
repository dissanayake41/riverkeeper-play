import {policyEffects} from './site-policies.mjs';
import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {createTreeLibrary} from './mahaweli-trees.mjs';
import {findSubBasin,containsCoordinate} from './geography.mjs';
import {createTerrainSampler} from './mahaweli-terrain.mjs';
import {GEOGRAPHY} from './spatial-data.mjs';
import {HYDRO_SITES} from './hydro-sites.mjs';
import {needsPlatform,buildingPlacement} from './building-placement.mjs';
import {createLandPlacement} from './land-placement.mjs';
import {createBasinWeather} from './mahaweli-weather.mjs';
import {CONTEXT_BUFFER_KM,basinExtent,paintBasinMask,riverNetwork,riverRibbon} from './mahaweli-map-effects.mjs';
// IWMI primary/secondary colours; categorical map overlays are separate from the blue HUD.
const PALETTE=['#5088c6','#22ad7a','#dd9103','#46bbd4','#e86933','#0297a6','#28537d','#e8e7e7'];
const ASSETS='./geo/mahaweli/';
async function json(name){const r=await fetch(ASSETS+name);if(!r.ok)throw Error('Could not load '+name);return r.json();}
export function createWorld(container,onSelect,options={}){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#050807');scene.fog=new THREE.FogExp2('#050807',.0022);
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;container.append(renderer.domElement);
 renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','Mahaweli 3D basin map. Drag to rotate; right-drag or Shift-drag to move; scroll to zoom. Arrow keys move the map. Click land to build.');
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
 const camera=new THREE.PerspectiveCamera(44,1,.1,2000),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.12;controls.rotateSpeed=.7;controls.minDistance=14;controls.maxDistance=700;controls.minPolarAngle=.08;controls.maxPolarAngle=Math.PI*.43;
 controls.mouseButtons.LEFT=THREE.MOUSE.ROTATE;controls.mouseButtons.RIGHT=THREE.MOUSE.PAN;controls.touches.ONE=THREE.TOUCH.ROTATE;controls.touches.TWO=THREE.TOUCH.DOLLY_PAN;controls.screenSpacePanning=false;controls.zoomToCursor=true;controls.listenToKeyEvents(renderer.domElement);controls.cursorStyle='grab';
 let sampler,extent,flight=null,weather,weatherEnabled=true,lightningEnabled=true,landPlacement;
 controls.addEventListener('start',()=>{flight=null;});
 const moveTo=(target,position,animate=true)=>{if(animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches){flight={start:performance.now(),from:camera.position.clone(),fromTarget:controls.target.clone(),position,target};}else{flight=null;camera.position.copy(position);controls.target.copy(target);controls.update();}};
 const fit=(top=false,animate=true)=>{
  if(!extent)return;
  const centre=new THREE.Vector3((extent.minX+extent.maxX)/2,2,(extent.minZ+extent.maxZ)/2),direction=new THREE.Vector3(top?0:.12,top?1:1.05,top?.001:.60).normalize(),right=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),direction).normalize(),up=new THREE.Vector3().crossVectors(direction,right);
  const tan=Math.tan(camera.fov*Math.PI/360);let distance=0;
  const verticalSpace=(container.clientHeight-130)/container.clientHeight;
  for(const ring of rings(mainBasin.geometry))for(const [lon,lat]of ring){const p=sampler.point(lon,lat),relative=new THREE.Vector3(p.x,p.y,p.z).sub(centre),depth=relative.dot(direction);distance=Math.max(distance,depth+(Math.abs(relative.dot(right))+extent.buffer)/(tan*camera.aspect*.78),depth+(Math.abs(relative.dot(up))+extent.buffer)/(tan*Math.max(.35,verticalSpace)*.94));}
  controls.maxDistance=Math.max(700,distance*1.8);camera.far=Math.max(2000,distance*4);camera.updateProjectionMatrix();moveTo(centre,centre.clone().addScaledVector(direction,distance),animate);
 };
 const home=()=>{
  if(!extent){camera.position.set(135,273,235);controls.target.set(0,0,0);controls.update();return;}
  const p=sampler.point(80.84,7.34),target=new THREE.Vector3(p.x,p.y,p.z),factor=camera.aspect<1?1.22:1;moveTo(target,target.clone().add(new THREE.Vector3(16,48,65).multiplyScalar(factor)),ready);
 };home();
 scene.add(new THREE.HemisphereLight('#deeff5','#766044',2.1));const sun=new THREE.DirectionalLight('#fff2d6',2.6);sun.position.set(-80,135,60);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-95,right:95,top:95,bottom:-95,near:1,far:400});sun.shadow.bias=-.00015;sun.shadow.normalBias=.08;sun.shadow.radius=2;scene.add(sun,sun.target);
 const overlay=new THREE.Group(),basinLines=new THREE.Group(),riverLines=new THREE.Group(),sitesGroup=new THREE.Group();scene.add(overlay,basinLines,riverLines,sitesGroup);
 const basinOverlay={value:0};basinLines.visible=false;
 const basinLabels=document.createElement('div');basinLabels.className='basin-number-layer';basinLabels.setAttribute('aria-label','Sub-basin numbers');container.append(basinLabels);const basinMarkers=[];
 const loading=document.createElement('div');loading.className='map-loading';loading.textContent='Loading Mahaweli satellite terrain…';container.append(loading);
 let ground,features=[],mainBasin,sites=[],tiles=[],selected=29,activeBasin=null,showSites=true,borders=false,gridVisible=true,signature='',ready=false;
 const objects=new Map(),lineObjects=new Map(),shared=new Set(),windRotors=[];let riverPoints=[],lastSoundTime=0;
 const riverTime={value:0},reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');let lastFrameTime;
 const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.8,...extra});
 const wall=mat('#e8debe'),roof=mat('#af6244'),soil=mat('#8f7952'),crop=mat('#afbb62'),panel=mat('#285581',{metalness:.45,roughness:.28}),concrete=mat('#b9bbaa'),blue=mat('#328a9c',{roughness:.2,metalness:.15}),glass=mat('#81bbc5',{metalness:.2,roughness:.25}),road=mat('#606863'),steel=mat('#71858e',{metalness:.55}),brick=mat('#b35e41');
 const box=new THREE.BoxGeometry(1,1,1),sphere=new THREE.SphereGeometry(1,8,6),roofGeo=new THREE.ConeGeometry(.85,.5,4),cone=new THREE.ConeGeometry(1,.6,16),cylinder=new THREE.CylinderGeometry(1,1,1,16);
 const trees=createTreeLibrary(renderer);[box,sphere,roofGeo,cone,cylinder,...trees.shared].forEach(g=>shared.add(g));
 function addMesh(group,geo,material,x,y,z,sx=1,sy=1,sz=1){const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;}
 function instances(group,geo,material,parts){
  const mesh=new THREE.InstancedMesh(geo,material,parts.length),dummy=new THREE.Object3D();
  parts.forEach((p,i)=>{dummy.position.set(...p.p);dummy.scale.set(...p.s);dummy.rotation.set(...(p.r||[0,0,0]));dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);if(p.color)mesh.setColorAt(i,new THREE.Color(p.color));});mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;
 }
 function building(group,type){
  if(type==='forest'){trees.grove(group,sampler);return;}
  if(type==='buffer'||type==='orchard'){trees.grove(group,sampler,type==='orchard'?{rows:true,count:9,height:.72}:{strip:true,count:8,height:.85});return;}
  if(type==='wetland'){
   const geo=new THREE.RingGeometry(0,1,48,16);geo.rotateX(-Math.PI/2);const points=geo.attributes.position;
   for(let i=0;i<points.count;i++){const x=points.getX(i)*2.5,z=points.getZ(i)*1.8,y=(sampler.surfaceHeight(group.position.x+x*group.scale.x,group.position.z+z*group.scale.z)-group.position.y)/group.scale.y+.08;points.setXYZ(i,x,y,z);}geo.computeVertexNormals();addMesh(group,geo,blue,0,0,0);
   const stems=[],tips=[];for(let i=0;i<24;i++){const a=i*2.39996,x=Math.cos(a)*(1.5+i%3*.3),z=Math.sin(a)*(1.3+i%2*.3),base=(sampler.surfaceHeight(group.position.x+x*group.scale.x,group.position.z+z*group.scale.z)-group.position.y)/group.scale.y,h=.35+i%4*.15;stems.push({p:[x,base+h/2,z],s:[.024,h,.024]});tips.push({p:[x,base+h,z],s:[.06,.17,.06]});}instances(group,cylinder,crop,stems);instances(group,cylinder,soil,tips);return;
  }
  if(type==='clinic'){
   addMesh(group,box,concrete,0,.08,0,5,.16,3.8);addMesh(group,box,wall,0,.75,0,3.8,1.4,2.7);addMesh(group,box,concrete,0,1.5,0,4.1,.16,3);
   addMesh(group,box,glass,0,.6,1.37,.75,1.15,.04);for(const x of [-1.25,1.25])addMesh(group,box,glass,x,.9,1.37,.65,.5,.04);
   addMesh(group,box,blue,0,1.95,.1,.25,.85,.12);addMesh(group,box,blue,0,1.95,.1,.85,.25,.12);return;
  }
  if(type==='wind'){
   for(const x of [-1.5,1.5]){
    addMesh(group,cylinder,concrete,x,.12,0,.5,.24,.5);addMesh(group,cylinder,wall,x,2.4,0,.13,4.6,.13);addMesh(group,box,wall,x,4.7,0,.4,.35,.7);
    const rotor=new THREE.Group();rotor.position.set(x,4.7,.4);group.add(rotor);windRotors.push(rotor);addMesh(rotor,sphere,wall,0,0,0,.2,.2,.22);
    for(let i=0;i<3;i++){const arm=new THREE.Group();arm.rotation.z=i*Math.PI*2/3;rotor.add(arm);const blade=addMesh(arm,box,wall,0,1,0,.16,1.7,.065);blade.rotation.y=.2;}
   }
  }
  if(type==='nuclear'){
   addMesh(group,box,concrete,0,.1,0,5.7,.2,4.5);addMesh(group,cylinder,wall,1.5,.9,0,1,1.8,1);addMesh(group,sphere,wall,1.5,1.8,0,1,.7,1);
   const tower=new THREE.LatheGeometry([[1,0],[.85,.4],[.63,1.3],[.52,2.3],[.57,2.8]].map(([x,y])=>new THREE.Vector2(x,y)),24);
   for(const z of [-1.1,1.1]){addMesh(group,tower,concrete,-1.1,.2,z);addMesh(group,cylinder,road,-1.1,2.98,z,.51,.015,.51);}
  }
  if(type==='hydro'){
   addMesh(group,box,concrete,0,.65,-.5,5,1.3,.6);addMesh(group,box,blue,0,.1,.2,4.8,.12,2);
   for(const x of [-1.3,0,1.3]){addMesh(group,box,steel,x,.7,-.17,.7,.8,.05);const chute=addMesh(group,box,blue,x,.44,.45,.7,.06,1.6);chute.rotation.x=.35;}
   addMesh(group,box,wall,2.3,.55,.9,1.7,1.1,1.4);addMesh(group,box,steel,2.3,1.15,.9,1.9,.1,1.6);
  }
  if(type==='town'){
   addMesh(group,box,road,0,.06,0,5.3,.12,4.3);const houses=[],roofs=[],windows=[];
   for(let i=0;i<8;i++){const x=(i%4-1.5)*1.22,z=i<4?-1.12:1.12,h=.75+(i%3)*.4;houses.push({p:[x,h/2+.12,z],s:[.88,h,.85],color:i%3?'#e8d9ae':'#c7d8d4'});roofs.push({p:[x,h+.31,z],s:[.84,1,.84],r:[0,Math.PI/4,0]});for(let j=0;j<3;j++)windows.push({p:[x+(j-1)*.25,h*.65+.12,z+(i<4?.431:-.431)],s:[.12,.24,.02]});}
   instances(group,box,wall,houses);instances(group,roofGeo,roof,roofs);instances(group,box,glass,windows);
   addMesh(group,cylinder,concrete,2.3,1.6,-.2,.22,2.8,.22);addMesh(group,sphere,blue,2.3,3.1,-.2,.45,.38,.45);
  }
  if(type==='farm'){
   addMesh(group,box,soil,0,.06,0,5.2,.12,4.7);const rows=[];
   for(let i=0;i<26;i++){const side=i<13?-1:1;rows.push({p:[side*1.35,.18,(i%13-6)*.33],s:[2.35,.19,.17],color:i%3?'#9db64a':'#d3c878'});}instances(group,box,crop,rows);
   addMesh(group,box,wall,2.02,.48,1.7,.85,.9,.85);const r=addMesh(group,roofGeo,roof,2.02,1.12,1.7,.9,1,.9);r.rotation.y=Math.PI/4;
  }
  if(type==='solar'){
   const panels=[],supports=[],seams=[];addMesh(group,box,soil,0,.025,0,5.8,.05,4.6);
   for(let row=0;row<3;row++)for(let col=0;col<4;col++){const x=(col-1.5)*1.4,z=(row-1)*1.45;panels.push({p:[x,.55,z],s:[1.18,.065,1.07],r:[-.32,0,0]});supports.push({p:[x,.24,z],s:[.1,.48,.75]});for(let j=-1;j<=1;j++)seams.push({p:[x+j*.29,.591,z],s:[.012,.013,1.07],r:[-.32,0,0]});}
   instances(group,box,panel,panels);instances(group,box,steel,supports);instances(group,box,glass,seams);addMesh(group,box,concrete,2.65,.4,-1.9,.45,.8,.5);
  }
  if(type==='industry'||type==='coal'){
   addMesh(group,box,concrete,0,.08,0,5.6,.16,4.6);addMesh(group,box,wall,-.5,.8,0,3.7,1.6,2.7);addMesh(group,box,steel,-.5,1.65,0,3.9,.15,2.9);
   const chimneys=[],bands=[],windows=[];for(const x of [1.2,2]){chimneys.push({p:[x,2.5,-1.4],s:[.23,5,.23]});for(let j=0;j<3;j++)bands.push({p:[x,2+j*.95,-1.4],s:[.236,.34,.236]});}instances(group,cylinder,brick,chimneys);instances(group,cylinder,wall,bands);
   for(let i=0;i<7;i++)windows.push({p:[-2+i*.47,1.02,1.357],s:[.28,.37,.03]});instances(group,box,glass,windows);
   for(const z of [.4,1.7]){addMesh(group,cylinder,concrete,2,.65,z,.5,1.3,.5);addMesh(group,cone,steel,2,1.45,z,.53,.5,.53);}
  }
  if(type==='treatment'){
   addMesh(group,box,concrete,0,.08,0,5.3,.16,4);for(const x of [-1.5,0,1.5]){addMesh(group,cylinder,concrete,x,.38,-.4,.66,.6,.66);addMesh(group,cylinder,blue,x,.695,-.4,.56,.045,.56);addMesh(group,box,steel,x,.76,-.4,1.35,.06,.12);}addMesh(group,box,wall,0,.5,1.2,2.6,.85,.85);addMesh(group,box,panel,0,.95,1.2,2.8,.1,1);addMesh(group,box,steel,0,.35,-1.5,4.5,.12,.15);
  }
  if(type==='reservoir'){
   addMesh(group,cylinder,concrete,0,.16,0,2.4,.3,1.9);addMesh(group,cylinder,blue,0,.325,0,2.2,.045,1.7);addMesh(group,box,concrete,0,.5,1.4,4.1,1,.4);for(const x of [-1.2,0,1.2])addMesh(group,box,steel,x,.6,1.64,.35,.6,.04);addMesh(group,box,wall,1.7,.6,1.7,.65,1.1,.6);
  }
 }
 function architecturalDetails(group,type){
  // Small physical details give silhouettes a useful sense of scale at close zoom.
  const car=(x,z,color=roof)=>{addMesh(group,box,color,x,.22,z,.38,.28,.75);addMesh(group,box,glass,x,.4,z-.04,.32,.16,.36);for(const side of [-1,1])for(const dz of [-.24,.24]){const wheel=addMesh(group,cylinder,road,x+side*.2,.14,z+dz,.095,.045,.095);wheel.rotation.z=Math.PI/2;}};
  if(type==='town'){
   for(let x=-2;x<=2;x+=.65)addMesh(group,box,wall,x,.129,0,.28,.009,.045);
   car(-1.9,.18);car(.9,-.19,blue);
   const doors=[];for(let i=0;i<8;i++){const x=(i%4-1.5)*1.22,z=i<4?-.683:.683;doors.push({p:[x,.33,z],s:[.22,.42,.025]});}instances(group,box,steel,doors);
  }
  if(type==='industry'||type==='coal'){
   const roofRibs=[];for(let x=-2.25;x<=1.35;x+=.25)roofRibs.push({p:[x,1.731,0],s:[.028,.025,2.86]});instances(group,box,concrete,roofRibs);
   for(const x of [-1.4,-.3]){addMesh(group,box,concrete,x,1.87,-.9,.5,.25,.4);addMesh(group,cylinder,steel,x,2.015,-.9,.16,.04,.16);}
   addMesh(group,box,steel,-1,.61,1.38,1.1,.95,.06);
   if(type==='coal'){
    addMesh(group,sphere,road,-1.6,.4,1.95,.9,.45,.42);
    const conveyor=addMesh(group,box,steel,-.5,.95,1.9,2.5,.16,.42);conveyor.rotation.z=.35;
    for(const x of [-1.1,0])addMesh(group,box,steel,x,.55,1.9,.09,1,.1);
   }else{addMesh(group,box,blue,-1.4,.4,1.97,1.3,.55,.55);addMesh(group,box,wall,-2.25,.4,1.97,.43,.55,.55);addMesh(group,box,glass,-2.25,.57,2.255,.32,.2,.02);}
  }
  if(type==='farm'){addMesh(group,cylinder,concrete,-2.1,.5,1.8,.32,1,.32);addMesh(group,cone,steel,-2.1,1.12,1.8,.34,.3,.34);for(const x of [-2.65,2.65])addMesh(group,box,blue,x,.16,0,.07,.04,4.3);}
  if(type==='clinic'){addMesh(group,box,steel,0,1.3,1.7,1.3,.08,.7);for(const x of [-.58,.58])addMesh(group,cylinder,steel,x,.68,1.95,.035,1.3,.035);car(-1.7,1.65,wall);}
  if(type==='reservoir'||type==='hydro'){for(const x of [-1.8,-.9,0,.9,1.8])addMesh(group,cylinder,steel,x,type==='hydro'?1.57:1.18,type==='hydro'?-.5:1.4,.025,.4,.025);addMesh(group,box,steel,0,type==='hydro'?1.77:1.38,type==='hydro'?-.5:1.4,4.05,.035,.035);}
  if(type==='treatment'){for(const x of [-1.5,0,1.5]){addMesh(group,cylinder,steel,x,.82,-.4,.1,.14,.1);addMesh(group,box,concrete,x,.78,-.4,.08,.04,1.1);}for(const x of [-2.2,2.2])addMesh(group,box,steel,x,.3,.8,.08,.1,1.9);}
  if(type==='nuclear'){for(let i=0;i<6;i++)addMesh(group,box,steel,-2.7+i*.3,.3,2,.15,.45,.3);addMesh(group,box,concrete,1.2,.35,1.8,1.5,.6,.6);}
 }
 function policyDetails(group,t){
  const effects=policyEffects(t);
  if(effects.roofMW){
   if(t.type==='town'){for(let i=0;i<8;i++){const m=addMesh(group,box,panel,(i%4-1.5)*1.22,.75+(i%3)*.4+.59,i<4?-1.12:1.12,.62,.045,.5);m.rotation.x=-.22;}}
   else{const y=t.type==='industry'?1.78:t.type==='clinic'?1.63:1.04,z=t.type==='treatment'?1.2:0;for(const x of [-1.1,0,1.1]){const m=addMesh(group,box,panel,x,y,z,.8,.055,t.type==='treatment'?.65:1.4);m.rotation.x=-.12;}}
  }
  if(effects.effluent){for(const x of [-1.5,-.5]){addMesh(group,cylinder,concrete,x,.4,1.85,.4,.7,.4);addMesh(group,cylinder,blue,x,.77,1.85,.34,.035,.34);}}
 }
 function positionSymbol(symbol,site,type){
  const location=type==='hydro'&&HYDRO_SITES[site.id]||site,p=sampler.point(location.lon,location.lat,.18);
  const scale=Math.max(.85,Math.min(1.8,Math.sqrt(site.areaKm2/100)*1.8));
  const onLand=(needsPlatform(type)&&type!=='hydro'&&type!=='reservoir')||type==='orchard';
  const anchor=onLand?landPlacement(site,scale):{x:p.x,z:p.z,scale};
  symbol.userData.noDryFootprint=!anchor;
  symbol.position.set(anchor?.x??p.x,anchor?sampler.surfaceHeight(anchor.x,anchor.z)+.18:p.y,anchor?.z??p.z);
  symbol.scale.setScalar(anchor?.scale??scale);symbol.visible=showSites&&!!anchor;
 }
 function plantPlatform(symbol){
  // Level the symbolic plant footprint above rugged terrain and carry its
  // retaining sides down to the ground, so towers are neither buried nor floating.
  const x0=symbol.position.x,z0=symbol.position.z,{scale,top}=buildingPlacement(sampler,x0,z0,symbol.scale.x);
  symbol.scale.setScalar(scale);symbol.position.y=top;addMesh(symbol,box,soil,0,-.025,0,6.6,.05,5.4);
  const corners=[[-3.3,-2.7],[3.3,-2.7],[3.3,2.7],[-3.3,2.7],[-3.3,-2.7]],positions=[];
  for(let edge=0;edge<4;edge++)for(let i=0;i<8;i++){
   const a=corners[edge],b=corners[edge+1],point=t=>{const x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;return [x,Math.min(0,(sampler.surfaceHeight(x0+x*scale,z0+z*scale)-top)/scale),z];},p=point(i/8),q=point((i+1)/8);
   positions.push(p[0],0,p[2],...q,...p,p[0],0,p[2],q[0],0,q[2],...q);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();const sides=new THREE.Mesh(geometry,soil);sides.castShadow=true;sides.receiveShadow=true;symbol.add(sides);
 }
 let previewGroup=null,previewId=null,previewRotors=[];
 function clearPreview(){
  if(previewId!==null){const old=objects.get(previewId);if(old){old.symbol.visible=showSites&&!old.symbol.userData.noDryFootprint;old.disc.material.opacity=0;}}
  if(previewGroup){scene.remove(previewGroup);previewGroup.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.geometry&&!shared.has(o.geometry))o.geometry.dispose();if(o.material)o.material.dispose();});}
  for(const rotor of previewRotors){const i=windRotors.indexOf(rotor);if(i>=0)windRotors.splice(i,1);}previewRotors=[];previewGroup=null;previewId=null;
 }
 function preview(id,type){
  clearPreview();if(!ready||!sites[id])return;
  const site=sites[id],location=type==='hydro'&&HYDRO_SITES[id]||site,p=sampler.point(location.lon,location.lat,.18),group=new THREE.Group();
  positionSymbol(group,site,type);
  const rotorStart=windRotors.length;if(needsPlatform(type))plantPlatform(group);building(group,type);architecturalDetails(group,type);previewRotors=windRotors.slice(rotorStart);
  group.traverse(o=>{if(!o.material)return;const material=o.material.clone();material.color.set('#46bbd4');material.transparent=true;material.opacity=.62;material.depthWrite=false;o.material=material;o.castShadow=false;});
  previewGroup=group;previewId=id;scene.add(group);const current=objects.get(id);if(current){current.symbol.visible=false;current.disc.material.color.set('#46bbd4');current.disc.material.opacity=.1;}
 }
 function rebuild(){
  clearPreview();windRotors.length=0;
  for(const child of [...sitesGroup.children]){child.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.geometry&&!shared.has(o.geometry))o.geometry.dispose();if(o.material?.userData.temporary)o.material.dispose();});sitesGroup.remove(child);}objects.clear();
  for(const t of tiles){const site=sites[t.id];if(!site)continue;const location=t.type==='hydro'&&HYDRO_SITES[t.id]||site,p=sampler.point(location.lon,location.lat,.18),g=new THREE.Group();g.userData.tileId=t.id;sitesGroup.add(g);
   const baseMat=new THREE.MeshBasicMaterial({color:t.id===selected?'#fff2a7':'#d7dfbb',transparent:true,opacity:t.id===selected?.22:.025,depthWrite:false,side:THREE.DoubleSide});baseMat.userData.temporary=true;
   const parts=site.geometry.type==='Polygon'?[site.geometry.coordinates]:site.geometry.coordinates;
   const shapes=parts.map(rings=>{const points=ring=>ring.map(([lon,lat])=>{const q=sampler.point(lon,lat);return new THREE.Vector2(q.x,-q.z);});const shape=new THREE.Shape(points(rings[0]));shape.holes=rings.slice(1).map(r=>new THREE.Path(points(r)));return shape;});
   const geometry=new THREE.ShapeGeometry(shapes);geometry.rotateX(-Math.PI/2);const positions=geometry.attributes.position;for(let i=0;i<positions.count;i++)positions.setY(i,sampler.height(positions.getX(i),positions.getZ(i))+.22);geometry.computeVertexNormals();
   const disc=new THREE.Mesh(geometry,baseMat);disc.userData.tileId=t.id;g.add(disc);
   const cellLines=new THREE.Group();g.add(cellLines);for(const ring of parts.flat())line(ring,'#cce5dd',cellLines,.28,.22);cellLines.visible=gridVisible;for(const border of cellLines.children)border.material.userData.temporary=true;
   const symbol=new THREE.Group();positionSymbol(symbol,site,t.type);g.add(symbol);if(needsPlatform(t.type))plantPlatform(symbol);building(symbol,t.type);architecturalDetails(symbol,t.type);policyDetails(symbol,t);objects.set(t.id,{g,disc,cellLines,symbol});
  }
 }
 function select(id){selected=id;for(const [key,o]of objects){o.disc.material.opacity=0;for(const border of o.cellLines.children){border.material.color.set(key===id?'#46bbd4':'#cce5dd');border.material.opacity=key===id?1:.22;}}}
 function line(coordinates,color,parent,lift=.12,opacity=.95){
  const points=[];for(let i=0;i<coordinates.length;i++){const a=coordinates[i],b=coordinates[i+1],p=sampler.point(a[0],a[1],lift);points.push(new THREE.Vector3(p.x,p.y,p.z));if(b){const steps=Math.min(25,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.003));for(let k=1;k<steps;k++){const q=sampler.point(a[0]+(b[0]-a[0])*k/steps,a[1]+(b[1]-a[1])*k/steps,lift);points.push(new THREE.Vector3(q.x,q.y,q.z));}}}
  const material=parent===basinLines?new THREE.LineDashedMaterial({color,transparent:true,opacity:.45,dashSize:.7,gapSize:.65}):new THREE.LineBasicMaterial({color,transparent:true,opacity});const m=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),material);if(parent===basinLines)m.computeLineDistances();parent.add(m);return m;
 }
 function rings(geometry){return geometry.type==='Polygon'?geometry.coordinates:geometry.type==='MultiPolygon'?geometry.coordinates.flat():[];}
 function showBasins(shown){borders=!!shown;basinLines.visible=borders;basinOverlay.value=borders?1:0;basinLabels.hidden=!borders;options.onBasinVisibility?.(borders);return borders;}
 function chooseBasin(id,focus=false,notify=true){
  activeBasin=features.find(f=>String(f.properties.id)===String(id))||null;
  for(const [key,lines]of lineObjects)for(const l of lines){l.material.opacity=activeBasin?key===String(id)?1:.3:.45;l.material.color.set(key===String(id)?'#ffffff':features.find(f=>String(f.properties.id)===key).properties.color);}
  for(const marker of basinMarkers){const selected=marker.id===String(id);marker.element.classList.toggle('selected',selected);marker.element.setAttribute('aria-pressed',String(selected));}
  if(activeBasin){showBasins(true);if(focus){const [lon,lat]=basinCentre(activeBasin),p=sampler.point(lon,lat);const target=new THREE.Vector3(p.x,p.y,p.z);const radius=Math.max(12,...rings(activeBasin.geometry).flat().map(([x,y])=>{const q=sampler.point(x,y);return Math.hypot(q.x-p.x,q.z-p.z);}));const distance=radius*2/Math.min(1,camera.aspect);moveTo(target,target.clone().add(new THREE.Vector3(.3,.95,1).multiplyScalar(distance)));}if(notify)options.onBasin?.(activeBasin);}
 }
 function basinCentre(f){if(f.properties.labelPoint)return f.properties.labelPoint;const candidates=sites.filter(s=>s.basinId===String(f.properties.id));if(candidates.length){const s=candidates[Math.floor(candidates.length/2)];return[s.lon,s.lat];}return rings(f.geometry)[0][0];}
 function makeBasinMask(geometry){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=Math.round(1024*sampler.frame.depth/sampler.frame.width);
  paintBasinMask(canvas.getContext('2d'),geometry,sampler.frame,canvas.width,canvas.height,CONTEXT_BUFFER_KM);
  // Soften the colour transition on the basin's inner edge without expanding its buffer.
  const softened=document.createElement('canvas');softened.width=canvas.width;softened.height=canvas.height;const soft=softened.getContext('2d');soft.filter=`blur(${Math.max(1,1000*sampler.frame.scale*canvas.width/sampler.frame.width)}px)`;soft.drawImage(canvas,0,0);const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height),blurred=soft.getImageData(0,0,canvas.width,canvas.height);for(let i=0;i<pixels.data.length;i+=4)pixels.data[i]=blurred.data[i];canvas.getContext('2d').putImageData(pixels,0,0);
  const texture=new THREE.CanvasTexture(canvas);texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=false;return texture;
 }
 function makeBasinTint(){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=Math.round(1024*sampler.frame.depth/sampler.frame.width);const ctx=canvas.getContext('2d');ctx.setTransform(canvas.width/sampler.frame.width,0,0,canvas.height/sampler.frame.depth,canvas.width/2,canvas.height/2);
  features.forEach((f,i)=>{ctx.fillStyle=PALETTE[i%PALETTE.length];const parts=f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;for(const polygon of parts){ctx.beginPath();for(const ring of polygon){ring.forEach(([lon,lat],k)=>{const p=sampler.point(lon,lat);k?ctx.lineTo(p.x,p.z):ctx.moveTo(p.x,p.z);});ctx.closePath();}ctx.fill('evenodd');}});
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
 }
 function makeRivers(features,mask){
  riverPoints=features.flatMap(f=>(f.geometry.type==='MultiLineString'?f.geometry.coordinates:[f.geometry.coordinates]).flatMap(line=>line.map(([lon,lat])=>sampler.frame.project(lon,lat))));
  const groups=[{positions:[],uvs:[],indices:[]},{positions:[],uvs:[],indices:[]}];
  for(const reach of riverNetwork(features,sampler.frame)){
   const data=riverRibbon(reach,sampler.surfaceHeight),group=groups[reach.main?1:0],offset=group.positions.length/3;
   group.positions.push(...data.positions);group.uvs.push(...data.uvs);group.indices.push(...data.indices.map(i=>i+offset));
  }
  groups.forEach((data,index)=>{
   const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(data.uvs,2));geometry.setIndex(data.indices);geometry.computeBoundingSphere();
   const material=new THREE.ShaderMaterial({uniforms:{uTime:riverTime,uMask:{value:mask},uFrame:{value:new THREE.Vector2(sampler.frame.width,sampler.frame.depth)},uMain:{value:index}},side:THREE.DoubleSide,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2,
    vertexShader:`uniform vec2 uFrame; varying vec2 vRiverUV; varying vec2 vMapUV; varying vec3 vWorldPosition;
     void main(){vec4 world=modelMatrix*vec4(position,1.0);vWorldPosition=world.xyz;vRiverUV=uv;vMapUV=vec2(world.x/uFrame.x+0.5,0.5-world.z/uFrame.y);gl_Position=projectionMatrix*viewMatrix*world;}`,
    fragmentShader:`uniform float uTime; uniform float uMain; uniform sampler2D uMask; varying vec2 vRiverUV; varying vec2 vMapUV; varying vec3 vWorldPosition;
     void main(){
      vec3 mask=texture2D(uMask,vMapUV).rgb;if(mask.g<0.5)discard;
      float across=abs(vRiverUV.x),along=vRiverUV.y-uTime*.28;
      float centre=1.0-smoothstep(.22,1.0,across);
      float wave=sin(along*3.4+vRiverUV.x*4.0)*.035+sin(along*7.3-vRiverUV.x*6.0)*.013;
      vec3 normal=normalize(vec3(wave,1.0,cos(along*4.7+vRiverUV.x*2.0)*.023));
      vec3 viewDirection=normalize(cameraPosition-vWorldPosition);
      float fresnel=.045+.42*pow(1.0-max(dot(normal,viewDirection),0.0),4.0);
      vec3 sky=vec3(.20,.29,.33);
      vec3 water=mix(vec3(.040,.120,.130),vec3(.055,.185,.225),centre);
      water=mix(water,sky,fresnel);
      vec3 halfLight=normalize(normalize(vec3(-.5,.85,.38))+viewDirection);
      float glint=pow(max(dot(normal,halfLight),0.0),95.0)*.23;
      float rippleBand=sin(along*6.0+sin(vRiverUV.x*5.0)*1.3);
      float ribbons=pow(max(0.0,rippleBand),14.0)*(.024+.018*uMain)*centre;
      float streak=pow(max(0.0,sin(vRiverUV.x*18.0+sin(along*.45))),12.0)*(.009+.013*uMain)*centre;
      water+=vec3(.19,.31,.33)*streak;
      water+=vec3(.75,.84,.79)*(glint+ribbons);
      water=mix(water,vec3(.028,.047,.029),smoothstep(.88,1.0,across)*.18);
      water*=pow(mask.b,1.3);
      gl_FragColor=vec4(water,1.0-smoothstep(.88,1.0,across));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
     }`
   });
   const mesh=new THREE.Mesh(geometry,material);mesh.renderOrder=2+index;mesh.name=index?'Mahaweli main river':'Mahaweli tributaries';riverLines.add(mesh);
  });
 }
 const readyPromise=(async()=>{
  try{
   const [dem,basins,boundary,rivers,texture]=await Promise.all([json('elevation.json'),json('subbasins.geojson'),json('basin.geojson'),json('rivers.geojson'),new THREE.TextureLoader().loadAsync(ASSETS+'satellite.jpg'),trees.ready]);
   sampler=createTerrainSampler(dem,180,3);features=basins.features;mainBasin=boundary.features[0];sites=GEOGRAPHY.cells;extent=basinExtent(mainBasin.geometry,sampler.frame);
   texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
   const g=new THREE.PlaneGeometry(sampler.frame.width,sampler.frame.depth,dem.columns-1,dem.rows-1);g.rotateX(-Math.PI/2);const position=g.attributes.position;
   for(let i=0;i<position.count;i++)position.setY(i,sampler.height(position.getX(i),position.getZ(i)));g.computeVertexNormals();
   const basinMask=makeBasinMask(mainBasin.geometry),terrainMaterial=new THREE.MeshStandardMaterial({map:texture,alphaMap:basinMask,alphaTest:.5,alphaToCoverage:true,roughness:1});
   const basinTint=makeBasinTint();
   terrainMaterial.onBeforeCompile=shader=>{shader.uniforms.uBasinTint={value:basinTint};shader.uniforms.uBasinOverlay=basinOverlay;shader.fragmentShader='uniform sampler2D uBasinTint; uniform float uBasinOverlay;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <alphamap_fragment>',`#include <alphamap_fragment>
    vec3 basinMask=texture2D(alphaMap,vAlphaMapUv).rgb;
    vec3 regionColor=texture2D(uBasinTint,vAlphaMapUv).rgb;
    diffuseColor.rgb=mix(diffuseColor.rgb,regionColor,uBasinOverlay*0.27*basinMask.r);
    diffuseColor.rgb*=mix(0.14,1.0,smoothstep(0.0,0.96,basinMask.r))*pow(basinMask.b,1.3);`);};
   ground=new THREE.Mesh(g,terrainMaterial);ground.receiveShadow=true;ground.customDepthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,alphaMap:basinMask,alphaTest:.5});ground.name='Mahaweli basin and 2 km context';scene.add(ground);
   features.forEach((f,index)=>{f.properties.color=PALETTE[index%PALETTE.length];const lines=rings(f.geometry).map(r=>line(r,f.properties.color,basinLines,.16));lineObjects.set(String(f.properties.id),lines);
    const id=String(f.properties.id),element=document.createElement('button');element.type='button';element.className='basin-number';element.textContent=id.replace('SB-','');element.setAttribute('aria-label','Locate '+f.properties.label);element.setAttribute('aria-pressed','false');element.title=f.properties.label;element.onclick=()=>chooseBasin(id,true);basinLabels.append(element);const [lon,lat]=basinCentre(f),p=sampler.point(lon,lat,.8);basinMarkers.push({id,element,point:new THREE.Vector3(p.x,p.y,p.z)});
   });
   basinLabels.hidden=!borders;

   landPlacement=createLandPlacement(sampler.frame,riverNetwork(rivers.features,sampler.frame));
   makeRivers(rivers.features,basinMask);
   weather=createBasinWeather({scene,sampler,boundary:mainBasin.geometry,sites,camera,reducedMotion,onWeather:options.onWeather,onThunder:options.onThunder});weather.setEnabled(weatherEnabled);weather.setLightning(lightningEnabled);
   ready=true;loading.remove();home();rebuild();select(selected);options.onReady?.({features,mainBasin,source:basins.source});return true;
  }catch(error){loading.textContent='Mahaweli map could not load. Refresh to retry.';loading.classList.add('failed');options.onError?.(error);console.error(error);return false;}
 })();
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),activePointers=new Set();let down;
 renderer.domElement.addEventListener('pointerdown',e=>{flight=null;renderer.domElement.focus({preventScroll:true});activePointers.add(e.pointerId);if(activePointers.size>1){down=null;return;}down={id:e.pointerId,x:e.clientX,y:e.clientY,button:e.button,moved:false};});
 renderer.domElement.addEventListener('pointermove',e=>{if(down?.id===e.pointerId&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)down.moved=true;});
 renderer.domElement.addEventListener('pointercancel',e=>{activePointers.delete(e.pointerId);down=null;});
 renderer.domElement.addEventListener('pointerup',e=>{activePointers.delete(e.pointerId);const click=down;down=null;if(!ready||!click||click.id!==e.pointerId||click.button!==0||click.moved||activePointers.size||Math.hypot(e.clientX-click.x,e.clientY-click.y)>6)return;const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);
  const surface=raycaster.intersectObject(ground)[0];if(surface){const coordinate=sampler.frame.unproject(surface.point.x,surface.point.z);if(!containsCoordinate(mainBasin.geometry,coordinate))return;const cell=sites.find(c=>containsCoordinate(c.geometry,coordinate));if(cell){select(cell.id);onSelect(cell.id);return;}const f=findSubBasin(features,coordinate);if(f)chooseBasin(f.properties.id);}
 });
 renderer.domElement.addEventListener('contextmenu',e=>e.preventDefault());
 renderer.domElement.addEventListener('keydown',e=>{if(e.key.startsWith('Arrow'))flight=null;});
 const resize=new ResizeObserver(()=>{const w=container.clientWidth,h=container.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.setViewOffset(w,h,0,w<=600?-10:12,w,h);camera.updateProjectionMatrix();});resize.observe(container);
 window.addEventListener('pagehide',()=>weather?.dispose(),{once:true});
 const compass=document.querySelector('.north-mark .icon');
 renderer.setAnimationLoop(time=>{
  const delta=lastFrameTime===undefined?0:Math.min(.1,(time-lastFrameTime)/1000);lastFrameTime=time;if(document.hidden)return;if(!reducedMotion.matches)riverTime.value+=delta;
  if(flight){const t=Math.min(1,(performance.now()-flight.start)/700),ease=t*t*(3-2*t);camera.position.lerpVectors(flight.from,flight.position,ease);controls.target.lerpVectors(flight.fromTarget,flight.target,ease);if(t===1)flight=null;}
  controls.update();sun.position.copy(controls.target).add(new THREE.Vector3(-80,135,60));sun.target.position.copy(controls.target);const width=container.clientWidth,height=container.clientHeight;
  if(!reducedMotion.matches)for(const rotor of windRotors)rotor.rotation.z-=delta*.7;
  if(ready)weather?.tick(delta,controls.target,1/(1+Math.max(0,camera.position.distanceTo(controls.target)-25)/70));
  if(ready&&time-lastSoundTime>350){
   lastSoundTime=time;const target=controls.target,zoom=1/(1+Math.max(0,camera.position.distanceTo(target)-25)/70);let settlement=0,forest=0,riverDistance=Infinity;
   for(const t of tiles){if(t.type!=='town'&&t.type!=='forest')continue;const p=objects.get(t.id)?.symbol.position;if(!p)continue;const near=Math.exp(-(Math.hypot(p.x-target.x,p.z-target.z)**2)/(2*18**2))*zoom;if(t.type==='town')settlement=Math.max(settlement,near);else forest=Math.max(forest,near);}
   for(const p of riverPoints)riverDistance=Math.min(riverDistance,Math.hypot(p.x-target.x,p.z-target.z));
   options.onSoundscape?.({settlement,forest,river:Math.exp(-riverDistance/8)*zoom,zoom});
  }
  if(compass){const north=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion.clone().invert());compass.style.transform=`rotate(${Math.atan2(north.x,north.y)}rad)`;}
  if(borders){camera.updateMatrixWorld();const occupied=[];for(const marker of [...basinMarkers].sort((a,b)=>Number(b.id===activeBasin?.properties.id)-Number(a.id===activeBasin?.properties.id))){const p=marker.point.clone().project(camera),x=(p.x+1)*width/2,y=(1-p.y)*height/2;const visible=p.z>-1&&p.z<1&&x>22&&x<width-22&&y>65&&y<height-110&&!occupied.some(([ox,oy])=>Math.abs(x-ox)<42&&Math.abs(y-oy)<32);marker.element.hidden=!visible;if(visible){occupied.push([x,y]);marker.element.style.transform=`translate(${x}px,${y}px) translate(-50%,-50%)`;}}}
  renderer.render(scene,camera);
 });
 return {ready:readyPromise,preview,clearPreview,setWeatherEnabled(value){weatherEnabled=!!value;weather?.setEnabled(value);},setLightningEnabled(value){lightningEnabled=!!value;weather?.setLightning(value);},focusWeather(){const p=weather?.focus();if(!p)return false;const target=new THREE.Vector3(p.x,p.y,p.z);moveTo(target,target.clone().add(new THREE.Vector3(15,36,47)));return true;},update(next,id){tiles=next;selected=id;if(!ready)return;const nextSignature=tiles.map(t=>t.type+JSON.stringify(t.policies||{})).join();if(nextSignature!==signature){signature=nextSignature;rebuild();}select(id);},home,
  zoom(factor){flight=null;camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);controls.update();},overview(){fit(false);},top(){fit(true);},
  orbit(direction){flight=null;if(direction==='left'||direction==='right')controls.rotateLeft((direction==='left'?1:-1)*Math.PI/8);else controls.rotateUp((direction==='up'?1:-1)*Math.PI/18);controls.update();},
  setMode(mode){controls.mouseButtons.LEFT=mode==='orbit'?THREE.MOUSE.ROTATE:THREE.MOUSE.PAN;controls.mouseButtons.RIGHT=mode==='orbit'?THREE.MOUSE.PAN:THREE.MOUSE.ROTATE;controls.touches.ONE=mode==='orbit'?THREE.TOUCH.ROTATE:THREE.TOUCH.PAN;renderer.domElement.setAttribute('aria-label',`Mahaweli 3D basin map. Drag to ${mode==='orbit'?'rotate; right-drag or Shift-drag to move':'move; right-drag or Shift-drag to rotate'}. Scroll to zoom; arrow keys move the map. Click land to build.`);},
  pan(direction){flight=null;const vectors={left:[0,-1],right:[0,1],up:[1,1],down:[1,-1]},[axis,sign]=vectors[direction]||[0,0],step=camera.position.distanceTo(controls.target)*.11;const offset=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,axis).multiplyScalar(sign*step);camera.position.add(offset);controls.target.add(offset);controls.update();},
  focusRegion(region){if(!ready)return;const town=sites[tiles.find(t=>t.type==='town')?.id],coordinate=region==='upper'?[80.81,7.04]:town?[town.lon,town.lat]:[81.145,8.04],p=sampler.point(...coordinate),target=new THREE.Vector3(p.x,p.y,p.z);moveTo(target,target.clone().add(new THREE.Vector3(12,region==='upper'?36:27,region==='upper'?48:37)));},
  toggleBasins(){return showBasins(!borders);},
  toggleGrid(){gridVisible=!gridVisible;for(const o of objects.values())o.cellLines.visible=gridVisible;return gridVisible;},toggleSites(){showSites=!showSites;for(const o of objects.values())o.symbol.visible=showSites&&!o.symbol.userData.noDryFootprint&&o!==objects.get(previewId);return showSites;},
  reveal(id){showSites=true;for(const o of objects.values())o.symbol.visible=!o.symbol.userData.noDryFootprint&&o!==objects.get(previewId);this.focus(id);},
  focus(id){if(!ready||!sites[id])return;const p=objects.get(id)?.symbol.position||sampler.point(sites[id].lon,sites[id].lat),target=new THREE.Vector3(p.x,p.y,p.z);moveTo(target,target.clone().add(new THREE.Vector3(12,21,22)));},selectBasin:chooseBasin,siteInfo(id){if(!ready||!sites[id])return null;const s=sites[id];return {...s,basin:features.find(f=>String(f.properties.id)===s.basinId)};}};
}


