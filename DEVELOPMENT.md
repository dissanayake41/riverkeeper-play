# Development, removal and nature-based options

These additions use the existing monthly spatial scenario model. Water and nitrogen still route through the connected sub-basin network. They are **not calibrated SWAT+ results, measured Mahaweli project costs or engineering designs**. A cell represents a management decision, not a literal building occupying its entire area.

## Removing and replacing developments

Removal returns a cell to open land and charges the treasury immediately. There is no salvage refund. The fee is the building's base capital cost times a removal fraction, with a minimum of 8 credits, multiplied by the same slope/access factor used for construction, rounded up. Fractions: 20% default, 15% forest/buffer, 30% wetland, 35% coal/reservoir, 40% hydro, 60% nuclear. These are disclosed **game tariffs**, not real decommissioning estimates. Nuclear waste management is not physically simulated.

Replacing a development includes exactly the same removal fee, recorded separately from new construction. Monthly settlement does not charge either payment again. The budget reconciles opening funds + exports − construction − removal − imports + recurring net income.

Removing a settlement removes housing and job capacity, not people. Residents relocate to spare housing where available; otherwise they remain displaced and continue to need services. Removing a reservoir preserves stored water and nitrogen until the next routed monthly settlement releases water that no remaining capacity can hold. Soil nutrients, sludge and wetland-retained nitrogen persist after removal. Existing food and electricity reserves remain available. Forecasts and demolition do not earn points.

## New choices

| Development | Base capital, credits | Quarterly upkeep | Jobs | Quarterly energy, MWh | Main process |
|---|---:|---:|---:|---:|---|
| Wetland | 95 | 2 | 40 | 0 | Connected nitrogen retention, habitat |
| River buffer | 55 | 1 | 20 | 0 | Reduced local farm runoff and erosion |
| Orchard | 130 | 4 | 160 | 4 | Food with permanent tree cover |
| Community clinic | 150 | 10 | 100 | 5 | Local wellbeing service |

Operating values are prorated using the actual days in each monthly turn. All four options may be placed on any playable cell. Site suitability changes effectiveness; no universal placement prohibition is imposed.

**Wetlands.** Suitability = max(0.1, 1 − river distance km / 8) × max(0.1, 1 − slope % / 25). Monthly capacity is 12 kg N × suitability × quarter fraction. After treatment plants, wetlands retain the smaller of capacity and the connected available load × [1 − 0.75^(quarter fraction)], provided connected water is present. The captured nitrogen accumulates in `wetlandN`; it is included in the nitrogen balance. Habitat cover is 0.95. The scenario omits wetland saturation, remobilization, denitrification gases, detailed residence time and flood hydraulics; do not interpret this as a physical wetland design or unlimited long-term treatment guarantee.

**River buffers.** The summed suitability of buffers in a sub-basin reduces local farm/orchard nitrogen wash-off and erosion by 20% per effective buffer, capped at 50%. Intercepted nitrogen stays in the source cell's soil pool. It does not remove nitrogen coming from unrelated tributaries. Habitat cover is 0.88. This is a sub-basin interception approximation; mapped parcel-scale runoff pathways are not available.

**Orchards.** An established productive orchard has 38 food units and a 12 ML crop-water parameter per quarter, compared with grain's 52 and 16. Fertiliser input is 45 kg N/quarter; maximum crop removal is 25 kg N/quarter; yield-response coefficient is 1.05; habitat cover is 0.60. Rain, irrigation, slope, operating power and workers constrain production through the same equations as farms. These are game assumptions; fruit species, maturity delays and local yields have not been calibrated.

**Clinics.** Each clinic can support up to 2,000 residents in its own sub-basin. Coverage is capped at the actual local population, multiplied by staffing and operating power, and population-weighted across the country. It contributes up to 2.5 wellbeing points per quarter. This is a service indicator, not a medical outcome or disease model.

## Process references

- [US EPA: Constructed wetlands](https://www.epa.gov/wetlands/constructed-wetlands): treatment wetlands use vegetation, soils and associated processes to improve water quality and can provide habitat. This supports the process concept, not the numerical coefficients above.
- [US Forest Service: Placement of riparian forest buffers to improve water quality](https://research.fs.usda.gov/treesearch/21369): buffers must intercept contaminants, and their function depends on hydrology, soils and landscape position. This is why location and connected load matter in the scenario.
- [US Forest Service: Riparian forest buffers](https://research.fs.usda.gov/centers/nac/riparianforestbuffers): vegetated riparian zones can support water quality, habitat and useful products.

The UI shows costs and projected changes before committing a placement or removal. The blue model on the map is only a placement preview. The real saved game changes only after the explicit action button.
