import {CLOUD} from './cloud-config.mjs';
export function validateCloudConfig(config){
 if(!config.enabled)return false;
 if(!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(config.url))throw Error('Invalid account service URL.');
 let publicKey=config.publishableKey?.startsWith('sb_publishable_');
 if(!publicKey){try{publicKey=JSON.parse(atob(config.publishableKey.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role==='anon';}catch{}}
 if(!publicKey)throw Error('Account configuration requires a public publishable key.');
 return true;
}
function loadSDK(){
 if(globalThis.supabase)return Promise.resolve(globalThis.supabase);
 return new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('./vendor/supabase.js',import.meta.url).href;script.onload=()=>resolve(globalThis.supabase);script.onerror=()=>{script.remove();reject(Error('Could not load sign-in. Check your connection and reload.'));};document.head.append(script);});
}
export function createCloudTransport(config=CLOUD,{loadClient=loadSDK,location=globalThis.location,fetcher=globalThis.fetch}={}){
 validateCloudConfig(config);
 const recovery=new URLSearchParams(location.hash.slice(1)).get('type')==='recovery';
 let clientPromise;
 const client=()=>clientPromise||=loadClient().then(sdk=>sdk.createClient(config.url,config.publishableKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'riverkeeper-cloud-'+new URL(config.url).hostname}})).catch(error=>{clientPromise=null;throw error;});
 const check=result=>{if(result.error)throw result.error;return result.data;};
 const redirect=()=>new URL('./',location.href).href;
 async function api(route,data){
  const sb=await client();
  if(route==='/api/player/register'){
   const username=String(data.username||'').trim().toLowerCase();
   if(!/^[a-z0-9_-]{3,24}$/.test(username))throw Error('Choose a player name of 3–24 letters, numbers, _ or -.');
   const result=check(await sb.auth.signUp({email:data.email,password:data.password,options:{data:{username},emailRedirectTo:redirect()}}));
   if(!result.session)return {notice:'Check your email to confirm your account, then sign in. If no message arrives, ask the game organiser to check email delivery.'};
   return api('/api/player/me');
  }
  if(route==='/api/player/login'){check(await sb.auth.signInWithPassword({email:data.email,password:data.password}));return api('/api/player/me');}
  if(route==='/api/player/logout'){check(await sb.auth.signOut({scope:'local'}));return {ok:true};}
  if(route==='/api/player/recover'){
   check(await sb.auth.resetPasswordForEmail(data.email,{redirectTo:redirect()}));return {ok:true};
  }
  if(route==='/api/player/password'){
   check(await sb.auth.updateUser({password:data.password,...(data.currentPassword?{current_password:data.currentPassword}:{})}));
   check(await sb.auth.signOut({scope:'others'}));return {ok:true};
  }
  const {session}=check(await sb.auth.getSession());
  if(!session){if(route==='/api/player/me')return {user:null,game:null};throw Object.assign(Error('Sign in to view shared scores and saved campaigns.'),{status:401});}
  let response;
  try{response=await fetcher(config.url+'/functions/v1/riverkeeper'+route,{method:data?'POST':'GET',headers:{apikey:config.publishableKey,Authorization:'Bearer '+session.access_token,...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{}),signal:AbortSignal.timeout(20000)});}
  catch{throw Error('Could not reach the account service. Check your connection and retry.');}
  let result;try{result=await response.json();}catch{throw Error('The account service is unavailable. Please retry shortly.');}
  if(!response.ok)throw Object.assign(Error(result.error||'Account request failed.'),{status:response.status});return result;
 }
 return {api,recovery};
}
