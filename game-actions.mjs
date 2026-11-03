import * as engine from './engine.mjs';
// Ranked campaigns share a published weather schedule for a fair comparison.
export const COMPETITION='Mahaweli • 24 months • preparedness 2026.10-v3';
export const WEATHER=[.5,.15,.5,.5,.9,.5,.15,.5,.9,.5,.5,.15,.5,.9,.5,.15,.5,.5,.9,.5,.15,.5,.9,.5];
const arity={build:2,demolish:1,continueAndBuild:2,continueAndDemolish:1,continueCampaign:0,setAllocation:2,setPolicy:2,setCrop:2,setSitePolicy:3,trade:2,advance:0};
export function applyGameAction(state,action){
 if(!action||!Object.hasOwn(arity,action.name)||!Array.isArray(action.args)||action.args.length!==arity[action.name]||action.args.some(x=>!['string','number','boolean'].includes(typeof x)||typeof x==='number'&&!Number.isFinite(x)))throw Error('Invalid game action.');
 if(action.name==='advance')return engine.advance(state,()=>WEATHER[state.turn%24]);
 return engine[action.name](state,...action.args);
}
