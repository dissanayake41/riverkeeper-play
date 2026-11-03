const clamp=value=>Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
export function soundscapeMix({settlement=0,forest=0,river=0,zoom=1,rain=0,storm=false}={}){
 const town=clamp(settlement),trees=clamp(forest),water=clamp(river),near=clamp(zoom),wet=clamp(rain);
 return {stream:(.18+.42*water)*(.85-.3*town),birds:(.09+.16*trees)*(1-.65*town)*(1-.8*wet),traffic:.19*town*near,crowd:.16*town*near,rain:.42*wet,
  label:wet>.08?(storm?'Passing shower · rain and distant thunder':'Passing shower · soft rainfall'):town>.35?'Settlement · quiet voices and traffic':water>.35?'River · flowing water and birds':'Landscape · gentle water and birds'};
}
