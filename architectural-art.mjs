// Original architectural miniatures with a consistent isometric projection.
let serial=0;
const p=(x,y,z=0)=>[120+(x-y)*11,85+(x+y)*5-z*13];
const points=a=>a.map(v=>p(...v).map(n=>n.toFixed(2)).join(',')).join(' ');
const poly=(a,fill)=>`<polygon points="${points(a)}" fill="${fill}"/>`;
const line=(a,color='#657574',width=.8)=>`<polyline points="${points(a)}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linejoin="round"/>`;
const block=(x,y,w,d,h,c='#d4d0bb',roof='#9faeb0',z=0)=>poly([[x,y,z],[x+w,y,z],[x+w,y,z+h],[x,y,z+h]],c)+poly([[x+w,y,z],[x+w,y+d,z],[x+w,y+d,z+h],[x+w,y,z+h]],'#818e8b')+poly([[x,y,z+h],[x+w,y,z+h],[x+w,y+d,z+h],[x,y+d,z+h]],roof)+poly([[x,y+d,z],[x+w,y+d,z],[x+w,y+d,z+h],[x,y+d,z+h]],c);
function building(x,y,w,d,h,roofed=true){let a=block(x,y,w,d,h,'#d5ccb0','#bcc6c0');
 if(roofed){a+=poly([[x-.12,y-.12,h],[x+w/2,y-.12,h+.6],[x+w/2,y+d+.12,h+.6],[x-.12,y+d+.12,h]],'#b76f50');a+=poly([[x+w/2,y-.12,h+.6],[x+w+.12,y-.12,h],[x+w+.12,y+d+.12,h],[x+w/2,y+d+.12,h+.6]],'#7d473c');}
 for(let j=.25;j<w-.2;j+=.65)a+=poly([[x+j,y+d+.012,.6],[x+j+.32,y+d+.012,.6],[x+j+.32,y+d+.012,1],[x+j,y+d+.012,1]],'#416474');return a;
}
function tank(x,y,r,h,water=false){const [cx,cy]=p(x,y),ry=r*5,rx=r*11,top=cy-h*13;return `<path d="M${cx-rx} ${top}v${h*13}a${rx} ${ry} 0 0 0 ${rx*2} 0v-${h*13}Z" fill="#8e9b99"/><ellipse cx="${cx}" cy="${top}" rx="${rx}" ry="${ry}" fill="${water?'#3a8399':'#d4d9d2'}" stroke="#dae3dc" stroke-width="2"/>`+(water?`<path d="M${cx-rx*.65} ${top}h${rx*1.3}" stroke="#d5f4f4" opacity=".65"/>`:'');}
function tree(x,y,h=2){const [cx,cy]=p(x,y);return `<path d="M${cx} ${cy}v-${h*10}" stroke="#736249" stroke-width="2.4"/><path d="M${cx-10} ${cy-h*7}q-8-8-2-15-5-8 5-12 6-9 13-3 9-2 12 7 9 7 2 14 4 12-8 12-6 7-12-3Z" fill="#3e6750"/><path d="M${cx-9} ${cy-h*7-15}q-4-8 5-12 9-5 13 4 7 2 5 8l-10-2-6 5Z" fill="#719064"/><path d="M${cx-8} ${cy-h*7-19}l3-3m9 1 4 2m-15 8 3-2" stroke="#aec18d" stroke-width="2"/>`;}
function pv(x,y,w=2,d=1.35,z=.5){let a=poly([[x,y,z+.45],[x+w,y,z+.45],[x+w,y+d,z],[x,y+d,z]],'#223e58');for(let i=0;i<=4;i++)a+=line([[x+w*i/4,y,z+.46],[x+w*i/4,y+d,z+.01]],'#86b0c5',.55);a+=line([[x,y+d/2,z+.23],[x+w,y+d/2,z+.23]],'#7ca5b6',.45);return a;}
function turbine(x,y,h=4){const [cx,cy]=p(x,y,h);return line([[x,y,0],[x,y,h]],'#d1dbd8',3)+`<g transform="translate(${cx} ${cy})" fill="#e9eeea" stroke="#718b99" stroke-width=".5"><path d="M0 0-2-29 2-26 2-4ZM0 0 25 13 22 16 3 3ZM0 0-22 19-24 15-3 0Z"/><circle r="2.4" fill="#a9c3c5"/></g>`;}
export function buildArt(type){
 const id='asset-'+(++serial),nature=['forest','buffer','orchard','wetland','farm'].includes(type);let art='';const water=`url(#${id}-water)`;
 const pond=poly([[-4,-2],[-1,-3],[3,-2],[4,0],[2,2],[-2,2],[-4,1]],water)+line([[-3,-1],[-1,-1.5],[2,-.5]],'#a7d7d7',1);
 if(type==='farm'){art+=poly([[-4,-2.5],[4,-2.5],[4,2.5],[-4,2.5]],'#9c9352');for(let i=-3.8;i<4;i+=.48)art+=line([[i,-2.3,.1],[i,2.3,.1]],i%1>.5?'#788849':'#b7b764',2.7);art+=line([[-.1,-2.4,.12],[-.1,2.4,.12]],'#4c8790',2);art+=building(1.8,-2.6,2,1.2,1.2)+tank(3.8,-1,.45,1.5);}
 if(['forest','buffer','orchard'].includes(type)){if(type==='buffer')art+=poly([[-4,-1],[-1,-.5],[1,-1],[4,0],[4,1],[1,0],[-1,.5],[-4,0]],water);if(type==='orchard')for(let y=-2;y<3;y++)art+=line([[-4,y],[4,y]],'#9a9464',2);for(const [x,y,h]of [[-2,-2,2],[1,-2,2.4],[3,0,1.8],[-2,1,2.3],[0,2,1.8]])art+=tree(x,y,h);if(type==='orchard')for(const [x,y]of [[98,53],[127,64],[146,51]])art+=`<circle cx="${x}" cy="${y}" r="1.8" fill="#d39145"/>`;}
 if(type==='wetland'){art+=pond;for(let i=0;i<18;i++){const x=(i%6-3)*1.3,y=i<6?-1.8:i<12?1.6:.3;art+=line([[x,y,0],[x+.15,y,.7],[x+.1,y,1]],'#6c7750',1)+line([[x+.1,y,.6],[x-.25,y,.85]],'#89945e',1)+line([[x+.1,y,.85],[x+.1,y,1.12]],'#66583e',2);}}
 if(type==='town'){art+=poly([[-4,-.4],[4,-.4],[4,.35],[-4,.35]],'#89918c');for(const [x,y]of [[-3,-2],[0,-2],[2,-2],[-2,1],[1,1]])art+=building(x,y,1.65,1.2,1.35);art+=block(-.5,-.15,.65,.35,.22,'#e7dbbc','#eef1e9')+tree(-3,2,1.4);}
 if(type==='clinic'){art+=building(-3,-1.8,5,2.8,1.7,false)+block(-.7,1,1.3,.5,.1,'#dedeca','#799aaa',1.25);for(const x of [-2.6,1.5])art+=line([[x,1.4,0],[x,1.4,1.5]],'#758f99',1);const [x,y]=p(-.4,-.3,1.8);art+=`<path d="M${x} ${y-7}v14m-7-7h14" stroke="#0297a6" stroke-width="4"/>`+block(2,1.6,1,.6,.5,'#e0e7df','#f6f7ea');}
 if(type==='solar')for(let y=-2;y<2;y+=1.7)for(let x=-3.8;x<3;x+=2.6)art+=pv(x,y);
 if(type==='wind')art+=line([[-4,1],[-2,0],[2,1],[4,0]],'#b0ac8c',4)+turbine(-2,-1,3.5)+turbine(2,1,4.2)+block(3,-2,1,.8,.6);
 if(type==='industry'||type==='coal'){
  art+=building(-3,-1,4,2.8,1.8,false);for(let i=0;i<5;i++)art+=line([[-2.8+i*.75,-1,1.85],[-2.8+i*.75,1.8,1.85]],'#e2e4d5',.9);art+=tank(2,-1,.65,1.65)+tank(3.2,.5,.65,1.65);
  for(const [x,y,h]of [[1,-2,4],[2.6,-1.8,4.7]]){art+=tank(x,y,.23,h);const [cx,cy]=p(x,y,h-.5);art+=`<path d="M${cx-2.5} ${cy}h5m-5 9h5" stroke="#c08466" stroke-width="3"/>`;}
  if(type==='coal')art+=poly([[-4,1],[-3,0,1],[-1,1.8],[-3,2.3]],'#414b49')+block(-3,-1,3,.3,.3,'#535e59','#74837d',1.1);else art+=block(-2,2,1.1,.55,.45,'#28537d','#a6c5cc')+block(-.8,2,.5,.55,.55,'#ded9bb','#edf1dd');
 }
 if(type==='nuclear'){art+=building(-3,-2,3,2,1.1,false)+tank(2,-1,1,1.8);const [cx,cy]=p(2,-1,1.8);art+=`<path d="M${cx-11} ${cy}a11 13 0 0 1 22 0" fill="#dfe3d7"/>`;for(const [x,y]of [[-1,1.1],[2,1.7]]){const [a,b]=p(x,y);art+=`<path d="M${a-13} ${b}Q${a-5} ${b-20} ${a-9} ${b-39}h18Q${a+5} ${b-20} ${a+13} ${b}Q${a} ${b+8} ${a-13} ${b}" fill="url(#${id}-concrete)"/><ellipse cx="${a}" cy="${b-39}" rx="9" ry="3" fill="#647673" stroke="#c6d1c8"/>`;}}
 if(type==='reservoir'||type==='hydro'){art+=pond+block(-3,1,6,.5,1.25,'#b7bcad','#e0dfcf');for(let x=-2.5;x<3;x+=1.4)art+=block(x,1.05,.25,.6,1.7)+poly([[x+.3,1.2,.9],[x+1,1.2,.9],[x+1,2.6,.1],[x+.3,2.6,.1]],water);art+=line([[-3,1,1.8],[3,1,1.8]],'#707e7a',1);if(type==='hydro')art+=building(2,1.3,1.5,1.2,1.1,false);}
 if(type==='treatment'){art+=building(-2.5,-2.5,4,1.2,1,false);for(const [x,y]of [[-2,0],[1,0],[0,2]])art+=tank(x,y,1.05,.55,true)+line([[x-1,y,.6],[x+1,y,.6]],'#d6e4db',1.5);art+=line([[-3,-1,0],[-3,2.5,0],[2.5,2.5,0]],'#a6bec0',2);}
 return `<svg class="build-art" viewBox="0 0 240 155" fill="none" aria-hidden="true"><defs><linearGradient id="${id}-water" x2="80%" y2="100%"><stop stop-color="#244e61"/><stop offset=".6" stop-color="#398998"/><stop offset="1" stop-color="#92c3bd"/></linearGradient><linearGradient id="${id}-concrete"><stop stop-color="#718582"/><stop offset=".4" stop-color="#e3e5d7"/><stop offset="1" stop-color="#99a7a0"/></linearGradient><filter id="${id}-shadow" x="-40%" y="-40%" width="190%" height="190%"><feDropShadow dx="3" dy="6" stdDeviation="2" flood-color="#18372e" flood-opacity=".22"/></filter></defs><ellipse cx="120" cy="120" rx="80" ry="16" fill="#233d37" opacity=".1"/>${block(-4.8,-3.2,9.6,6.4,.35,'#9b9980',nature?'#acb38a':'#bdc4af',-.35)}<g filter="url(#${id}-shadow)">${art}</g></svg>`;
}
