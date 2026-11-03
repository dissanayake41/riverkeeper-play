# Power projects and monthly simulation

Updated 6 October 2026. These are engineering-informed scenario rules, not calibrated Mahaweli power-system forecasts. A game lasts **24 monthly turns**. All power plants are operational immediately when placed. Real construction schedules are omitted as a gameplay simplification. Old unfinished projects become operational on loading, without advancing time or charging again; their original save is backed up as `riverkeeper-v3-before-instant-power`. Historical reports and scores are retained.

## Capacity and placement

Each symbol represents the community's financed capacity share in a larger project. A 0.5 MW nuclear share is **not a 0.5 MW reactor**. This lets a community beginning with 1,200 residents participate in large infrastructure without pretending its entire output serves a small village.

| Technology | Capacity share | Capital benchmark, USD/kW | Fixed O&M, USD/kW/year | Variable O&M, USD/MWh |
| --- | ---: | ---: | ---: | ---: |
| Solar PV | 0.1 MW | 1,502 | 20.23 | 0 |
| Onshore wind | 0.2 MW | 1,489 | 33.06 | 0 |
| Coal | 0.3 MW | 4,103 | 61.60 | 6.40 |
| Hydropower | 0.1 MW | 7,073 | 33.54 | 0 |
| Nuclear | 0.5 MW | 7,861 | 156.20 | 2.52 |

Benchmarks are in 2023 US dollars from the [EIA AEO2025 engineering report's cost tables](https://www.eia.gov/analysis/studies/powerplants/capitalcost/pdf/capital_cost_AEO2025.pdf). These are reference project costs, not Sri Lankan quotations. Cost per kW is scaled proportionally to the financed share; project-specific scale economies are not modeled.

For power capital and running costs, one credit represents USD 1,000. Capital = share MW × benchmark USD/kW, rounded up, then adjusted by the game's slope/access factor and conversion cost. All capital is paid once on placement; no interest, staged financing or refund is modeled. The plant immediately supplies operating capacity, jobs and this month's generation potential. Output, taxes and running costs settle at month end, so placing a plant does not create a free stock of electricity.

Fuel assumptions are **26 USD/MWh for coal and 9 USD/MWh for nuclear**, explicit scenario choices. They are not verified local fuel prices. Fixed O&M is prorated by days/365; variable O&M and fuel apply only to generated electricity. Operating jobs and actual-output generation taxes apply in the month of placement. Land conversion still affects habitat immediately. Jobs and the wider credit economy remain abstract scenario values, not real project staffing or national accounts.

## Electricity, water and carbon

Potential electricity = capacity MW × hours in month × capacity factor × staffing fraction. Baseline factors are solar 0.22, wind 0.34, coal 0.65 and nuclear 0.91. Solar and wind use disclosed seasonal multipliers in `power.mjs`; these are illustrative profiles, not measured local resources. The [EIA's capacity-factor series](https://www.eia.gov/electricity/monthly/epm_table_grapher.php?t=epmt_6_07_b) provides context for the technology differences; coal's dispatch assumption and the monthly profiles are game choices. Outages are represented through factors, not individual outage schedules.

Thermal cooling competes for connected river water after the environmental reserve. Output falls in proportion to available cooling water. Cooling-tower assumptions, in US gallons/MWh, are coal withdrawal/consumption **609/493**, nuclear **1,101/672**, from the [NREL operational-water review](https://docs.nlr.gov/docs/fy11osti/50900.pdf). One US gallon is 0.000003785411784 ML. Unconsumed cooling water returns to the same routing node. These coefficients are plant-configuration examples; cooling designs vary. Temperature effects and thermal pollution are not resolved.

Hydro MWh = min(capacity-limited output, **0.002725 × usable flow ML × head m × 0.85 × staffing**). The 85% efficiency is assumed. Usable flow excludes the ecological bypass. Turbine flow passes downstream without consumptive subtraction. This follows [DOE's flow-and-head principle](https://www.energy.gov/cmei/water/how-hydropower-works). Nine provisional sites are screened from mapped reaches inside cells, elevation at least 100 m, river proximity within 2 km and a sampled reach drop of 20–250 m; one site per sub-basin avoids counting the same reach head twice. These are coarse model locations, not surveyed, approved or economically assessed dam sites. Node outflow proxies site discharge. Reservoir head variations, flood operations and fish passage are not hydraulically simulated.

Allocated life-cycle emissions use illustrative medians of coal 820, solar 48, wind 11, hydro 24 and nuclear 12 kg CO₂e/MWh from [IPCC AR5 Annex III](https://archive.ipcc.ch/pdf/assessment-report/ar5/wg3/drafts/fgd/ipcc_wg3_ar5_final-draft_fgd_annex-iii.pdf). These include life-cycle effects, not just current stack emissions. The environmental score is limited by both the routed ecosystem result and `1 / (1 + generation-weighted intensity / 400)`. The divisor and score combination are game policy choices, not a scientific universal. Nuclear waste, coal air pollutants and reservoir methane variability require additional modeling; the interface identifies relevant tradeoffs without inventing quantified damages.

Electricity settlement enforces stock + generation = use + ending stock + overflow. The 500 MWh reserve is an abstract grid/storage entitlement, not a specified battery. Pumping uses actual withdrawals, head and 70% efficiency. Endogenous cooling, generation and powered services are solved together before advancing. Fuel and climate accounting follow all generated output, including overflow.

## Calendar and population

Two non-leap scenario years use actual month lengths. Earlier quarterly water, food, pollution and non-power cost assumptions are prorated by each month's share of that quarter. Crops remain a continuous production approximation, not an agronomic planting/harvest calendar. Weather and river inflows remain illustrative; the SWAT+ experiments are separate.

Natural increase is an assumed 1.2% annually, compounded by elapsed days, plus optional supported migration of 0.1% monthly. Fractional residents carry forward until they add up to a whole person. New settlements are not required for births. Overcrowded or displaced residents can occupy available housing; otherwise they remain and continue needing services. Severe food/water shortages can outweigh growth. These are disclosed game assumptions, not a demographic forecast.

Previous quarterly saves retain their money, buildings, stocks and earned points. Each elapsed quarter maps to three months, with its historical score retained once. The original browser save is backed up as `riverkeeper-v3-before-monthly` before migration. Completed historical campaigns remain historical results; continuing starts a fresh 24-month campaign.
