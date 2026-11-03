export * from './engine.mjs';
import * as engine from './engine.mjs';
import {applyGameAction} from './game-actions.mjs';
let controller=null;
export function connectPlayerController(value){controller=value;}
function mutate(name,state,args){
 if(!controller)return engine[name](state,...args);
 controller.before();
 const action={name,args},result=applyGameAction(state,action);
 controller.after(action);return result;
}
export const build=(s,...a)=>mutate('build',s,a),demolish=(s,...a)=>mutate('demolish',s,a);
export const continueAndBuild=(s,...a)=>mutate('continueAndBuild',s,a),continueAndDemolish=(s,...a)=>mutate('continueAndDemolish',s,a),continueCampaign=s=>mutate('continueCampaign',s,[]);
export const setAllocation=(s,...a)=>mutate('setAllocation',s,a),setPolicy=(s,...a)=>mutate('setPolicy',s,a),setCrop=(s,...a)=>mutate('setCrop',s,a),setSitePolicy=(s,id,key,on=true)=>mutate('setSitePolicy',s,[id,key,on]),trade=(s,...a)=>mutate('trade',s,a);
export const advance=s=>mutate('advance',s,[]);
