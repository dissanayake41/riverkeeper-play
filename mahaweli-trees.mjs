import * as THREE from 'three';

// The photographed leaf is sampled from the source UV atlas, not the whole sheet:
// unused atlas islands contain padding that must never become visible foliage.
export function createTreeLibrary(renderer){
 const loader=new THREE.TextureLoader();
 const leafMaterial=new THREE.MeshStandardMaterial({color:'#c6d2bb',side:THREE.DoubleSide,roughness:1,alphaTest:.48,alphaToCoverage:true});
 const barkMaterial=new THREE.MeshStandardMaterial({color:'#736956',roughness:1});
 const branchGeometry=new THREE.CylinderGeometry(.58,1,1,6);
 const leafGeometry=new THREE.BufferGeometry();
 const vertices=[[0,0,0],[.45,.26,0],[1,0,0],[.48,-.26,0],[.47,0,.065]];
 const pixels=[[245,465],[317,428],[420,455],[329,508],[328,465]];
 leafGeometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices.flat(),3));
 leafGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(pixels.flatMap(([x,y])=>[x/1024,1-y/1024]),2));
 leafGeometry.setIndex([0,1,4,1,2,4,2,3,4,3,0,4]);leafGeometry.computeVertexNormals();
 const ready=Promise.all([loader.loadAsync('./assets/trees/leaves-color.jpg'),loader.loadAsync('./assets/trees/leaves-alpha.png')]).then(([color,alpha])=>{
  color.colorSpace=THREE.SRGBColorSpace;
  for(const texture of [color,alpha])texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  leafMaterial.map=color;leafMaterial.alphaMap=alpha;leafMaterial.needsUpdate=true;
 });
 const shared=new Set([branchGeometry,leafGeometry]);
 function grove(group,sampler,profile={}){
  let seed=(Math.abs(Math.round(group.position.x*1741+group.position.z*853))+1)>>>0;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const branches=[],leaves=[],up=new THREE.Vector3(0,1,0),dummy=new THREE.Object3D();
  const limb=(a,b,r)=>{const direction=b.clone().sub(a);branches.push({p:a.clone().add(b).multiplyScalar(.5),q:new THREE.Quaternion().setFromUnitVectors(up,direction.clone().normalize()),s:new THREE.Vector3(r,direction.length(),r)});};
  const positions=[];
  for(let i=0;i<(profile.count||13);i++){
   let x,z;for(let attempt=0;attempt<30;attempt++){x=(random()-.5)*5.3;z=(random()-.5)*4.8;if(positions.every(p=>Math.hypot(p.x-x,p.z-z)>.65))break;}if(profile.rows){x=(i%3-1)*1.7;z=(Math.floor(i/3)-1)*1.6;}if(profile.strip)x*=.32;positions.push({x,z});
   const y=(sampler.surfaceHeight(group.position.x+x*group.scale.x,group.position.z+z*group.scale.z)-group.position.y)/group.scale.y;
   const h=(1.45+random()*1.1)*(profile.height||1),w=h*(.34+random()*.15),lean=new THREE.Vector3((random()-.5)*.32,0,(random()-.5)*.32),base=new THREE.Vector3(x,y-.025,z);
   const fork=base.clone().add(new THREE.Vector3(lean.x*.35,h*.32,lean.z*.35));
   limb(base,fork,h*.022);
   const phase=random()*Math.PI*2;
   for(let j=0;j<10;j++){
    const angle=phase+j*2.39996+random()*.5,height=.45+j*.049,reach=w*Math.sqrt(1-Math.pow((height-.57)/.5,2))*(.75+random()*.3);
    const tip=base.clone().add(new THREE.Vector3(Math.cos(angle)*reach+lean.x,h*height,Math.sin(angle)*reach+lean.z));
    const stem=fork.clone().lerp(base.clone().add(new THREE.Vector3(lean.x,h*.66,lean.z)),j/18);
    limb(stem,tip,h*.013*(1-j*.04));
    for(let k=0;k<8;k++){
     const t=.26+k*.095,start=stem.clone().lerp(tip,t),side=k%2?1:-1,twigAngle=angle+side*(.65+random()*.6);
     const end=start.clone().add(new THREE.Vector3(Math.cos(twigAngle),.35+random()*.45,Math.sin(twigAngle)).multiplyScalar(w*(.3+random()*.3)*(1-k*.045)));
     limb(start,end,.007);
     for(let n=0;n<14;n++){
      const at=.12+n*.065,leafSide=n%2?1:-1,p=start.clone().lerp(end,at),direction=twigAngle+leafSide*(.7+random()*.6);
      const size=(.11+random()*.075)*(h/2),rotation=new THREE.Euler(-Math.PI/2+(random()-.5)*1.3,direction,(random()-.5)*.65,'YZX');
      leaves.push({p,q:new THREE.Quaternion().setFromEuler(rotation),s:new THREE.Vector3(size,size,size),color:new THREE.Color().setHSL(.23+random()*.025,.12+random()*.15,.67+random()*.22)});
     }
    }
   }
  }
  for(const [geometry,material,parts]of [[branchGeometry,barkMaterial,branches],[leafGeometry,leafMaterial,leaves]]){
   const mesh=new THREE.InstancedMesh(geometry,material,parts.length);
   parts.forEach((part,i)=>{dummy.position.copy(part.p);dummy.quaternion.copy(part.q);dummy.scale.copy(part.s);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);if(part.color)mesh.setColorAt(i,part.color);});
   mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();mesh.name=geometry===leafGeometry?'Textured broadleaf foliage':'Forked tree branches';group.add(mesh);
  }
 }
 return {ready,shared,grove};
}
