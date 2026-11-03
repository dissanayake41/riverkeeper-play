import * as THREE from './vendor/three.module.js';

// Original procedural 3D character. Shared renderer moves between badge and briefing.
export function createBinduCharacter(host){
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;
 renderer.domElement.setAttribute('aria-label','Bindu, a smiling three-dimensional blue water drop with hands and feet');renderer.domElement.setAttribute('role','img');host.append(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(33,1,.1,30);camera.position.set(0,1.4,8.5);camera.lookAt(0,.45,0);
 scene.add(new THREE.HemisphereLight(0xe9fcff,0x28537d,3));const key=new THREE.DirectionalLight(0xffffff,4);key.position.set(-3,5,5);scene.add(key);const rim=new THREE.DirectionalLight(0x48ddec,3);rim.position.set(3,2,-2);scene.add(rim);
 const aqua=new THREE.MeshPhysicalMaterial({color:0x0297a6,roughness:.19,metalness:.04,clearcoat:1,clearcoatRoughness:.13});
 const blue=new THREE.MeshStandardMaterial({color:0x28537d,roughness:.4}),white=new THREE.MeshPhysicalMaterial({color:0xf3feff,roughness:.25,clearcoat:.5}),ink=new THREE.MeshStandardMaterial({color:0x102b41,roughness:.25}),pink=new THREE.MeshStandardMaterial({color:0xfb9688,roughness:.5});
 const actor=new THREE.Group();scene.add(actor);
 function ball(parent,material,xyz,scale){const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,28,20),material);mesh.position.set(...xyz);mesh.scale.set(...scale);parent.add(mesh);return mesh;}
 function tube(parent,material,points,radius){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,24,radius,10,false),material);parent.add(mesh);return mesh;}
 const profile=[new THREE.Vector2(0,-.62),new THREE.Vector2(.38,-.6),new THREE.Vector2(.72,-.38),new THREE.Vector2(.88,.05),new THREE.Vector2(.85,.43),new THREE.Vector2(.7,.76),new THREE.Vector2(.48,1.08),new THREE.Vector2(.24,1.43),new THREE.Vector2(.07,1.78),new THREE.Vector2(0,1.94)];
 const curve=new THREE.SplineCurve(profile),body=new THREE.Mesh(new THREE.LatheGeometry(curve.getPoints(60),64),aqua);actor.add(body);
 // Separate eye whites, dark pupils and catchlights keep a readable cartoon face.
 const eyes=[];
 for(const side of [-1,1]){
  const eye=new THREE.Group();eye.position.set(side*.29,.52,.76);eye.rotation.y=side*.13;actor.add(eye);eyes.push(eye);
  ball(eye,white,[0,0,0],[.235,.3,.12]);ball(eye,ink,[.035,-.015,.103],[.115,.17,.052]);ball(eye,white,[.005,.06,.15],[.044,.058,.021]);ball(eye,white,[.08,-.07,.15],[.021,.026,.012]);
  tube(actor,blue,[[side*.16,.93,.62],[side*.29,.99,.66],[side*.43,.94,.62]],.033);
  ball(actor,pink,[side*.53,.18,.68],[.115,.05,.019]);
  tube(actor,aqua,[[side*.34,-.46,.04],[side*.4,-.79,.06],[side*.47,-1.01,.13]],.105);
  ball(actor,white,[side*.49,-1.04,.25],[.29,.16,.43]);ball(actor,blue,[side*.49,-1.15,.25],[.295,.05,.435]);
 }
 const smile=[];for(let i=0;i<=20;i++){const x=-.29+i*.029;smile.push([x,-.01+.9*x*x,.93-.16*Math.abs(x)]);}const smileMesh=tube(actor,ink,smile,.026);
 const speakingMouth=ball(actor,ink,[0,.015,.935],[.135,.08,.025]);speakingMouth.visible=false;
 const arm=new THREE.Group();arm.position.set(.77,.23,.05);actor.add(arm);
 tube(arm,aqua,[[0,0,0],[.3,.14,.05],[.43,.48,.1]],.08);
 const openHand=new THREE.Group();arm.add(openHand);
 const hand=ball(openHand,white,[.45,.58,.1],[.15,.18,.1]);
 for(let i=0;i<3;i++)tube(openHand,white,[[.36+i*.075,.63,.1],[.33+i*.095,.85-Math.abs(i-1)*.035,.1]],.045);
 tube(openHand,white,[[.35,.56,.1],[.22,.65,.12]],.055);
 const pointHand=new THREE.Group();arm.add(pointHand);pointHand.visible=false;
 ball(pointHand,white,[.44,.59,.1],[.14,.145,.11]);tube(pointHand,white,[[.45,.67,.1],[.45,.99,.1]],.055);ball(pointHand,white,[.32,.59,.14],[.08,.065,.08]);
 tube(actor,aqua,[[-.77,.23,.05],[-1.05,.02,.05],[-.97,-.24,.17]],.085);ball(actor,white,[-.95,-.28,.19],[.17,.18,.13]);
 // Water glint and little agency badge, with no external logo endorsement implied.
 ball(actor,new THREE.MeshBasicMaterial({color:0xb9f6fa,transparent:true,opacity:.48}),[-.58,.6,.51],[.058,.19,.018]);
 ball(actor,blue,[.45,-.2,.7],[.11,.115,.035]);ball(actor,white,[.45,-.19,.74],[.04,.055,.012]);
 const shadow=new THREE.Mesh(new THREE.CircleGeometry(1.15,64),new THREE.MeshBasicMaterial({color:0x28537d,transparent:true,opacity:.12,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.set(0,-1.22,.1);scene.add(shadow);
 let container=host,frame,last=-100,cueStart=-10000;const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 function resize(){const {width,height}=container.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 function animate(ms){frame=requestAnimationFrame(animate);if(document.hidden||ms-last<40)return;last=ms;const t=ms/1000,motion=!reduced.matches;
  const elapsed=(ms-cueStart)/1000,briefing=container.classList.contains('bindu-portrait'),talking=briefing&&elapsed<4.8;
  const pointing=briefing&&elapsed>=1.1;
  actor.position.y=motion?Math.sin(t*1.8)*.025:0;
  actor.rotation.y=pointing?.16:(motion?Math.sin(t*.7)*.07:0);
  actor.rotation.x=motion&&talking?Math.sin(elapsed*4)*.035:0;
  const target=pointing?-1.02:(motion&&elapsed<1.1?Math.sin(elapsed*10)*.28:0);
  arm.rotation.z+= (target-arm.rotation.z)*(motion?.17:1);
  if(motion&&pointing&&talking)arm.rotation.z+=Math.sin(elapsed*5)*.012;
  openHand.visible=!pointing;pointHand.visible=pointing;
  speakingMouth.visible=motion&&talking;smileMesh.visible=!speakingMouth.visible;
  speakingMouth.scale.y=.035+Math.abs(Math.sin(elapsed*10))*.07;
  const blink=motion&&t%5.8>5.62?.12:1;eyes.forEach(e=>{e.scale.y=blink;e.rotation.y=(e.position.x>0?.13:-.13)+(pointing?.09:0);});
  renderer.domElement.dataset.gesture=pointing?(talking?'explaining':'pointing'):(talking?'waving':'idle');renderer.render(scene,camera);
 }
 animate(0);
 return {mount(target){observer.unobserve(container);container=target;container.append(renderer.domElement);observer.observe(container);resize();cueStart=performance.now();},instruct(){cueStart=performance.now();},dispose(){cancelAnimationFrame(frame);observer.disconnect();scene.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose();});renderer.dispose();renderer.domElement.remove();}};
}
