import {soundscapeMix} from './soundscape.mjs';
import {createStormAudio} from './weather-audio.mjs';
// Recorded loops. Only a deliberate speaker click starts audio.
export function createAmbience(button,volumeInput,status){
 let context,master,layers={},scene={},weather={},stormAudio,desired=false,busy=false,mediaPaused=false,level=.22,errorMessage='';
 try{level=Number(localStorage.getItem('riverkeeper-volume')??.22);}catch{}
 level=Math.max(0,Math.min(.6,Number.isFinite(level)?level:.22));volumeInput.value=String(Math.round(level*100));
 function update(){
  const playing=desired&&!mediaPaused&&context?.state==='running'&&!busy;
  button.setAttribute('aria-pressed',String(desired));button.setAttribute('aria-label',desired?'Mute nature sounds':'Play nature sounds');button.title=desired?'Mute nature sounds':'Play nature sounds';button.dataset.playing=String(playing);
  const text=errorMessage||(mediaPaused?'Nature sounds paused for video':busy?'Loading recorded ambience…':playing?soundscapeMix({...scene,...weather}).label:desired?'Ambience pauses when this tab is hidden':'Sound off · use the speaker to play');
  if(status.textContent!==text)status.textContent=text;
 }
 function mix(){if(context){const values=soundscapeMix({...scene,...weather});for(const [key,gain]of Object.entries(layers))gain.gain.setTargetAtTime(values[key],context.currentTime,2.5);stormAudio?.setPan(weather.rainPan);}update();}
 async function init(){
  if(context)return;
  const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)throw Error('Audio is not supported in this browser.');
  context=new Audio();context.onstatechange=update;await context.resume();
  master=context.createGain();master.gain.value=0;const limiter=context.createDynamicsCompressor();limiter.threshold.value=-18;limiter.ratio.value=4;master.connect(limiter).connect(context.destination);
  const files={stream:'stream_brook',birds:'birds_dawn',traffic:'city_wet_road',crowd:'crowd'};
  const decoded=await Promise.all(Object.entries(files).map(async([key,file])=>{const response=await fetch(new URL(`./assets/audio/${file}.ogg`,import.meta.url));if(!response.ok)throw Error('The recorded sounds could not load. Please try again.');return [key,await context.decodeAudioData(await response.arrayBuffer())];}));
  for(const [key,buffer]of decoded){const source=context.createBufferSource(),filter=context.createBiquadFilter(),gain=context.createGain();source.buffer=buffer;source.loop=true;filter.type='lowpass';filter.frequency.value=key==='crowd'?1700:key==='traffic'?1200:7200;gain.gain.value=0;source.connect(filter).connect(gain).connect(master);source.start(0,key==='birds'?Math.min(7,buffer.duration/3):0);layers[key]=gain;}
  stormAudio=createStormAudio(context,master);layers.rain=stormAudio.gain;mix();
 }
 button.addEventListener('click',async()=>{
  if(busy)return;busy=true;button.disabled=true;errorMessage='';desired=!desired;if(!desired)stormAudio?.cancelThunder();update();
  try{if(desired){await init();await context.resume();if(document.hidden||mediaPaused)await context.suspend();}if(context)master.gain.setTargetAtTime(desired?level:0,context.currentTime,desired?1.2:.1);}
  catch(error){desired=false;errorMessage=error.message;if(context)await context.close().catch(()=>{});context=null;master=null;layers={};stormAudio=null;}
  finally{busy=false;button.disabled=false;update();}
 });
 volumeInput.addEventListener('input',()=>{level=Math.max(0,Math.min(.6,Number(volumeInput.value)/100));if(master)master.gain.setTargetAtTime(desired?level:0,context.currentTime,.2);try{localStorage.setItem('riverkeeper-volume',String(level));}catch{}});
 document.addEventListener('visibilitychange',async()=>{if(!context)return;try{if(document.hidden||mediaPaused){stormAudio?.cancelThunder();await context.suspend();}else if(desired)await context.resume();}catch{}update();});
 window.addEventListener('pagehide',()=>{context?.close().catch(()=>{});},{once:true});update();
 return {async setMediaPaused(value){mediaPaused=Boolean(value);stormAudio?.cancelThunder();try{if(context){if(mediaPaused)await context.suspend();else if(desired&&!document.hidden)await context.resume();}}catch{}update();},setScene(value){scene=value;mix();},setWeather(value){weather=value;if(!value.active)stormAudio?.cancelThunder();mix();},thunder(value){if(desired&&!mediaPaused&&context?.state==='running'&&!document.hidden)stormAudio?.thunder(value);},get enabled(){return desired;}};
}
