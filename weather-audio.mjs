import {seededRandom,clamp01} from './weather-model.mjs';
// Original procedural sound beds: soft broadband rain and low rolling thunder.
// No extra downloads; both pass through the existing volume control and limiter.
export function stormSamples(sampleRate,seconds,kind='rain',seed=721){
 const random=seededRandom(seed),out=new Float32Array(Math.round(sampleRate*seconds));let low=0,pink=0;
 for(let i=0;i<out.length;i++){
  const t=i/sampleRate,white=random()*2-1;low=(low+.025*white)/1.025;pink=.985*pink+.015*white;
  if(kind==='thunder'){
   const attack=Math.min(1,t/.16),tail=Math.pow(Math.max(0,1-t/seconds),1.7),roll=.55+.22*Math.sin(t*4.1)+.18*Math.sin(t*7.7);
   out[i]=(low*6+pink*2+white*.12*Math.exp(-t*5))*attack*tail*roll*.6;
  }else out[i]=(white*.31+pink*.6)*(.82+.10*Math.sin(2*Math.PI*t/seconds)+.06*Math.sin(8*Math.PI*t/seconds));
 }
 return out;
}
export function createStormAudio(context,master){
 const rainBuffer=context.createBuffer(2,context.sampleRate*12,context.sampleRate);
 for(let ch=0;ch<2;ch++)rainBuffer.copyToChannel(stormSamples(context.sampleRate,12,'rain',721+ch*914),ch);
 const source=context.createBufferSource(),high=context.createBiquadFilter(),low=context.createBiquadFilter(),gain=context.createGain(),pan=context.createStereoPanner();
 source.buffer=rainBuffer;source.loop=true;high.type='highpass';high.frequency.value=350;low.type='lowpass';low.frequency.value=4800;gain.gain.value=0;source.connect(high).connect(low).connect(gain).connect(pan).connect(master);source.start();
 const thunderBuffer=context.createBuffer(1,context.sampleRate*7,context.sampleRate);thunderBuffer.copyToChannel(stormSamples(context.sampleRate,7,'thunder'),0);
 const active=new Set();
 return {gain,
  setPan(value){pan.pan.setTargetAtTime(Math.max(-.8,Math.min(.8,value||0)),context.currentTime,1.5);},
  thunder({strength=0,delay=2,pan=0}={}){
   if(active.size>=3||strength<.015)return;
   const sound=context.createBufferSource(),filter=context.createBiquadFilter(),level=context.createGain(),panner=context.createStereoPanner();
   sound.buffer=thunderBuffer;sound.playbackRate.value=.85+Math.random()*.22;filter.type='lowpass';filter.frequency.value=300+500*clamp01(strength);level.gain.value=.65*clamp01(strength);panner.pan.value=Math.max(-.85,Math.min(.85,pan));sound.connect(filter).connect(level).connect(panner).connect(master);
   active.add(sound);sound.onended=()=>{active.delete(sound);sound.disconnect();filter.disconnect();level.disconnect();panner.disconnect();};sound.start(context.currentTime+Math.max(.3,Math.min(10,delay)));
  },
  cancelThunder(){for(const s of active){try{s.stop();}catch{}}active.clear();}
 };
}
