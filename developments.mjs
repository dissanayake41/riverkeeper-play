// Scenario design parameters. These are not measured Mahaweli project costs.
export const NEW_DEVELOPMENTS={
 wetland:{name:'Wetland',icon:'≈',cost:95,upkeep:2,jobs:40,energy:0,benefit:'Connected water cleanup and wetland habitat',tradeoff:'Needs suitable terrain and polluted water to treat',description:'Restores a treatment wetland. Nitrogen retention is limited by connected load, river proximity and slope. Retained nutrients remain in the basin inventory. This does not simulate flood hydraulics.'},
 buffer:{name:'River buffer',icon:'♧',cost:55,upkeep:1,jobs:20,energy:0,benefit:'Less farm runoff and erosion in this sub-basin',tradeoff:'Strongest near a river; occupies productive land',description:'Vegetated strips intercept a share of local agricultural runoff. They keep that nitrogen in soil rather than deleting it. Protection is capped and weaker away from mapped rivers.'},
 orchard:{name:'Orchard',icon:'♠',cost:130,upkeep:4,jobs:160,energy:4,benefit:'Food, jobs and more permanent vegetation',tradeoff:'Needs irrigation, energy, staff and fertiliser',description:'An established fruit orchard with a lower food yield, water demand and fertiliser input than grain farming in this scenario. Production responds to water, terrain, power and available workers.'},
 clinic:{name:'Community clinic',icon:'+',cost:150,upkeep:10,jobs:100,energy:5,benefit:'Local wellbeing and skilled jobs',tradeoff:'Monthly running costs, staff and electricity',description:'Supports residents in its sub-basin. The wellbeing benefit depends on local population coverage, staffing and power, and is capped. This is a public-service indicator, not a medical or disease model.'}
};
export const ORCHARD={food:38,water:12};
export const RESTORATION={wetlandKgN:12,wetlandFraction:.25,bufferFraction:.2,bufferCap:.5,clinicResidents:2000,clinicWellbeing:2.5};
export function restorationSuitability(e){return Math.max(.1,1-e.riverDistanceKm/8)*Math.max(.1,1-e.slopePct/25);}
// Removal includes site clearance. No salvage refund; this is a game tariff,
// not a real-world decommissioning estimate (especially for nuclear projects).
export const REMOVAL_RATE={nuclear:.6,coal:.35,hydro:.4,reservoir:.35,wetland:.3,forest:.15,buffer:.15};
