// The film is requested only after an explicit user click, never on game startup.
export function createVideoGuide({ambience}) {
 const playIcon='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4Z" fill="currentColor" stroke="none"/></svg>';
 const launcher=document.createElement('button');
 launcher.type='button';launcher.id='video-guide-launcher';launcher.className='video-guide-launcher';
 launcher.setAttribute('aria-haspopup','dialog');launcher.setAttribute('aria-controls','video-guide-dialog');
 launcher.innerHTML=playIcon+'<span>How to play</span>';
 document.querySelector('#game-window').append(launcher);
 const menuButton=document.createElement('button');menuButton.type='button';menuButton.className='quiet';menuButton.id='watch-guide';
 menuButton.textContent='▶ How to play · watch video';menuButton.setAttribute('aria-haspopup','dialog');
 document.querySelector('#help').before(menuButton);
 const dialog=document.createElement('dialog');dialog.id='video-guide-dialog';dialog.setAttribute('aria-labelledby','video-guide-title');
 dialog.innerHTML=`<header class="video-guide-heading"><div><span class="video-guide-kicker">RIVERKEEPER / WATCH & LEARN</span><h2 id="video-guide-title">Managing Mahaweli River Basin</h2><p>Your mission, your choices, and how to play.</p></div><button type="button" class="video-guide-close" aria-label="Close video and return to game">×</button></header>
 <video id="video-guide-player" controls playsinline preload="none" poster="assets/video/riverkeeper-guide-poster.jpg" aria-label="Riverkeeper introduction and how to play, English narration"></video>
 <p class="video-guide-status" role="status" aria-live="polite"></p>
 <nav class="video-guide-chapters" aria-label="Video chapters"><button type="button" data-time="0">Introduction <small>0:00</small></button><button type="button" data-time="128.7">Your mission <small>2:09</small></button><button type="button" data-time="154.3">Game guide <small>2:34</small></button></nav>
 <footer class="video-guide-footer"><span>English narration · 5:11 · captions available</span><button type="button" class="video-guide-return">Back to my basin</button></footer>`;
 document.body.append(dialog);
 const video=dialog.querySelector('video'),status=dialog.querySelector('.video-guide-status');
 let loaded=false,opener=null,pendingTime=null;
 function ensureLoaded(){
  if(loaded)return;loaded=true;
  video.src=new URL('./assets/video/riverkeeper-how-to-play-en.mp4',import.meta.url).href;
  const track=document.createElement('track');track.kind='captions';track.label='English';track.srclang='en';track.src=new URL('./assets/video/riverkeeper-how-to-play-en.vtt',import.meta.url).href;video.append(track);
  video.load();
 }
 async function play(){
  status.textContent='';
  try{await video.play();if(!dialog.open)video.pause();}catch(error){if(dialog.open&&error.name!=='AbortError')status.textContent='Press Play in the video to begin.';}
 }
 function open(){
  if(dialog.open)return;
  opener=document.activeElement;dialog.showModal();ambience.setMediaPaused(true);
  ensureLoaded();play();dialog.querySelector('.video-guide-close').focus({preventScroll:true});
 }
 function close(){dialog.close();}
 launcher.addEventListener('click',open);menuButton.addEventListener('click',open);
 dialog.querySelector('.video-guide-close').addEventListener('click',close);
 dialog.querySelector('.video-guide-return').addEventListener('click',close);
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const b=dialog.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)close();});
 dialog.addEventListener('close',()=>{video.pause();ambience.setMediaPaused(false);opener?.isConnected&&opener.focus({preventScroll:true});});
 video.addEventListener('loadedmetadata',()=>{if(pendingTime!==null){video.currentTime=pendingTime;pendingTime=null;}});
 video.addEventListener('error',()=>{status.textContent='The video could not load. Please check your connection and try again.';});
 dialog.querySelectorAll('[data-time]').forEach(button=>button.addEventListener('click',()=>{
  const time=Number(button.dataset.time);if(video.readyState>=1)video.currentTime=time;else pendingTime=time;play();
 }));
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&dialog.open)video.pause();});
 return {open,close,dialog,video};
}
