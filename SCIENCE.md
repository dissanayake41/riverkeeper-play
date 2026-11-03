# Riverkeeper: spatial gameplay and scientific scoring

Research and implementation decision, 13 September 2026; monthly calendar, power projects and demographic growth updated 6 October 2026. Applies to `spatial-monthly-3` on the provisional HydroBASINS Mahaweli boundaries.

## Decision

Individual site policies now modify these same monthly accounts. Their applicability, cost, physical effects and scientific limitations are documented in [POLICIES.md](POLICIES.md). They award no direct installation points.

Use an outcome-based water–energy–food–economy–society–environment game. Every management cell accepts ordinary developments, including conversion of an existing use. Hydropower requires one of nine provisional river/head sites. Location changes cost, pumping, irrigation, erosion pressure and the downstream consequences of pollution. Record scores only when a month is completed. Keep physical balances separate from the choices used to judge success.

This is a **research-informed, uncalibrated educational scenario model**. It is not a Mahaweli forecast, a SWAT+ implementation, or Aqua Republica's proprietary scoring algorithm. Real geographic inputs do not make assumed operating parameters measured data.

## What the Aqua Republica evidence supports

The primary developer paper describes wellbeing, production, ecosystem condition, water use, future sustainability and achievements as scoring dimensions. Development interacts with a water-allocation model through spatial nodes and downstream connections. This supports an integrated management game, rather than awarding fixed points for construction. The complete scoring equation is not published there. Its historical turn durations are not evidence for our 24-month calendar, and universal building placement is our own rule. [DHI / UNEP-DHI / Serious Games Interactive developer paper, especially pp. 7, 11, 15–16](https://www.dhigroup.com/upload/publications/mikebasin/Chew_2013.pdf).

The official project page currently describes Aqua Republica as unavailable, so live gameplay could not be used to verify a current release. [UNEP-DHI project page](https://unepdhi.org/aqua-republica/).

## Geographic grid and placement

The 7 October 2026 update replaces the 249-cell square lattice with smaller hexagons. The generator verifies complete sub-basin coverage without overlapping area to a tolerance of one square metre per sub-basin in UTM coordinates. The original 249 cells are archived in `geo/mahaweli/grid-square-v2.json`. Every old cell maps to a distinct new cell in the same sub-basin; all nine hydro sites retain geographic coordinates and head. Building counts, active/paused policies, residents, soil nitrogen, money, resources and scored outcomes survive migration. Cell identifiers in the most recent report are updated for map links without recomputing recorded values. Future forecasts use each new cell’s terrain and area, so identical holdings do not imply identical future outcomes.

The map has 759 management cells created from a 3 km radius hexagonal UTM zone 44N grid (5.196 km across flats; regular area 23.38 km²), cut at 42 official HydroBASINS level 9 sub-basin boundaries. Small edge fragments are joined to touching cells in the same sub-basin; tiny complete sub-basins are retained. These are regional management zones, **not individual fields, building footprints or SWAT HRUs**. Sub-basins are numbered by decreasing source distance to the outlet: SB-01 is farthest upstream, SB-42 contains the outlet, and every downstream link has a larger number. Their union exactly matches the previous main basin boundary.

The source terrain provides representative elevation and slope, calculated in metres without the display's 3× exaggeration. River distance is measured to the mapped major drainage network. Pump head uses the elevation difference to the nearest mapped reach, a 5 m minimum and an assumed distance-related head loss. It is approximate site context, not a designed intake or hydraulic survey.

Construction price is the base price multiplied by explicit slope/access penalties, plus 20 credits when replacing an occupied cell. Ordinary types remain allowed wherever the player can afford them; hydro has a geographic eligibility check. Steep farms have lower scenario suitability. Reservoir capacity declines with distance from the mapped river. Conversion does not refund the previous structure, erase residual soil nutrients, or teleport residents. Overcrowded or displaced residents can move to the nearest available settlement capacity. Those without available housing remain at their cell, still consume resources and lower the society score.

Future supplied boundaries replace the geography input. Rebuild the grid, assign downstream connections, verify polygon coverage, and explicitly migrate saved cell IDs. Do not reuse identifiers across incompatible maps or label these cells as SWAT objects without a crosswalk.

## Population scale and saved progress

New games start with 1,200 residents in a representative managed community, not the actual Mahaweli basin census. Settlement capacity is 2,000 residents. Jobs and population are scaled by 20 relative to the earlier prototype; per-person demand and worker tax rates are divided by 20 to preserve comparable resource pressure and receipts. Household assumptions are 0.02 ML of water, 0.03 abstract food units, 0.0175 MWh of energy and 0.003 kg of modeled nitrogen per person per quarter, prorated by days in each game month. These are scenario inputs, not measured national demographic or consumption data. See `demography.mjs`.

Migration from the previous 172-cell map assigns each occupied cell and its resident/soil inventory to a distinct new cell, preferring geometric overlap, then the nearest remaining cell. Sub-basin stored water, nitrogen and sludge are redistributed by polygon overlap fractions, preserving totals. Population and initial population are multiplied by 20. Treasury, stocks, completed reports and recorded scores are retained; past reports are not rerun or rewritten. The browser keeps the original save as `riverkeeper-v3-before-monthly` (which includes the earlier state before geography/calendar migration). Newly simulated seasons use the finer routing network.

## Calendar and natural growth

Each campaign covers 24 months in two non-leap scenario years. Quarterly scenario inputs are prorated by month length. Natural population increase (1.2% annual assumption) continues without new settlements; sufficient services also permit migration. Fractional changes carry over. Housing accommodates people but does not switch births on. Severe shortages can cause decline. Power and demographic assumptions are detailed in [ENERGY.md](ENERGY.md).

## Monthly calculation

1. Calculate demand and potential production from occupied cells and residents.
2. Route water through sub-basins in upstream-to-downstream order; calculate actual withdrawals, delivery losses, consumption, returns, storage and outlet flow.
3. Settle pumping and operating energy together. A bounded numerical solve finds a feasible operating fraction that available energy can support. Charge pumping only for actual withdrawals.
4. Calculate crop harvest, industrial operation, consumption and remaining stocks.
5. Update soil nitrogen, waterborne nitrogen and retained treatment sludge, then calculate environmental indicators.
6. Settle taxes, recurring costs, services, wellbeing, housing and population change.
7. Store the six scores and a reproducible monthly report. The next weather draw affects only the following month.

### Water accounting

For the whole modeled network:

`local inflow + old storage = consumptive use + conveyance loss + outlet flow + new storage`

Reservoirs preserve attainable connected downstream requests and river reservations before storing surplus. A forward attainable-flow pass and reverse release-planning pass coordinate releases within the month. Water cannot move uphill or between disconnected branches. This is a simplified operating rule, not an optimized or calibrated Mahaweli reservoir schedule.

All terms are ML per game month. Environmental reservation remains in the river and reaches downstream nodes; it is not consumed as a separate “nature” resource. Returns can be reused by downstream nodes, so total withdrawals across the network must **not** be compared directly with basin inflow. Only outlet export, losses, consumption and storage change belong in the whole-basin closure.

Local inputs are a prescribed illustrative basin flow split by sub-basin area, with a small forest-use adjustment. No additional rainfall runoff is added to that same inflow. Forest is not a universal water-supply bonus. Groundwater, travel time, reservoir evaporation and daily flood peaks are currently omitted. Returns are treated within the monthly step. These simplifications are explicit, not claims to reproduce SWAT's daily water balance. [SWAT+ water-balance theory](https://docs.swat.tamu.edu/model-theory/overview-water-balance/).

### Crop water and yield

FAO distinguishes crop ET demand from irrigation withdrawals and relates relative yield loss to relative crop ET deficit. Riverkeeper uses the form `yield fraction = clamp(1 − Ky × (1 − ET sufficiency), 0, 1)`. The current rain-supported ET fraction is prescribed by season; this is an ET sufficiency **proxy**, not a solved root-zone moisture balance. Irrigation demand includes delivery efficiency and the consumptive fraction so that the ET credit matches consumed water. Rainfed production can therefore occur without irrigation. [FAO crop ET](https://www.fao.org/4/x0490e/x0490e0b.htm), [FAO yield response](https://www.fao.org/4/x5647E/x5647e0e.htm).

The generic grain, rice and pulse profiles, Ky values, potential yields and calendar are scenario choices. Paddy ponding, seepage, soil layers and crop growth stages are not modeled. Fertilizer, crop nutrient removal, yield and demand are specified **per operating building per quarter, prorated into monthly flows**, not multiplied by the cell's full land area. Food remains a game unit, not a validated dietary or tonnage estimate.

### Energy and economy

Pump demand follows gravitational potential energy: `MWh = 0.002725 × withdrawn ML × head m / efficiency`. A 70% pumping efficiency is assumed. Solar, wind, coal, hydro and nuclear generation now use explicit capacity and operating hours; placement makes a plant operational immediately. Thermal cooling competes for water; hydro uses flow and sampled head while retaining downstream water. See [power equations, costs, sources and limits](ENERGY.md). Solar irradiation and panel orientation are not locally modeled. [US Department of Energy hydropower principles](https://www.energy.gov/cmei/water/how-hydropower-works).

Money remains credits. Construction, tax rates, jobs, prices, service costs and demographic responses are gameplay assumptions. Purchases consume money and increase stock; sales reduce stock, with buy prices above sell prices. Extra food or wealth above defined needs does not yield unlimited score.

#### Government budget (`government-4`)

The player funds development and public operations from a government treasury. National economic output is distinct from treasury cash. Farms, industries and power plants contribute a **production levy on actual new output**, not on the full value of stored goods. Construction has an immediate capital cost; upkeep and services recur at monthly settlement. This distinction is consistent with the IMF's separation of revenue, expenses and asset transactions. Production taxes can apply to production independently of a final sale; our levy is not a corporate-profit tax or a simulation of VAT. [IMF Government Finance Statistics Manual 2014, §§4.32–4.35 and 5.55](https://www.imf.org/-/media/websites/imf/imported/external/pubs/ft/gfs/manual/2014/_gfsfinalpdf.pdf).

| Tax setting | Worker levy per employed resident per quarter | Production levy | Wellbeing change per quarter |
|---|---:|---:|---:|
| Low | 1.5 credits | 10% | +3 |
| Balanced | 3 credits | 20% | 0 |
| High | 4.5 credits | 30% | −5 |

Worker receipts are `floor(employed × worker levy × min(household water, food, energy sufficiency))`. This last fraction is a disclosed service/productivity proxy; wages, household cash and individual tax brackets are not simulated. Population growth only expands the workforce in subsequent months; empty settlements do not instantly create taxpayers.

Farm output value is actual harvested food × 2 credits; industrial output value is the routed operating output (up to 180 credits per factory per 30-day month, prorated by calendar days); solar output value is actual generated MWh × 1 credit. Each sector's production tax is `floor(output value × production levy)`. These prices and rates are game assumptions, **not Sri Lankan fiscal data**. Physical production already reflects its modeled worker, terrain, water and energy constraints. No second shortage multiplier is applied to these output levies.

Food and energy remain in the national resource accounts after taxation; a levy is not an export. Stocks carried forward, imports and resales do not become new taxable production. Market exports explicitly remove stock and credit their sale proceeds. The game does not simulate a full private sector or public-asset balance sheet, so these values must not be called GDP, corporate profits, net national wealth or calibrated government revenues.

```
Recurring net = development grant + worker taxes + farm tax + industry tax + electricity tax
              − building upkeep − public services
Closing cash = opening cash + exports − imports − construction + recurring net
```

Builds and market transactions are paid immediately. Advancing the month adds **only recurring net**, preventing the same construction or purchase from being charged twice. The saved report records both these earlier transactions and the settlement; cash reconciliation joins the water and nitrogen checks. A deficit is possible. Forests, reservoirs and treatment plants have benefits in environmental quality and water security, not automatic monetary rewards; ecosystem services include material provision and regulation as well as other benefits. [FAO ecosystem services](https://www.fao.org/agriculture/crops/thematic-sitemap/theme/biodiversity/en/).

Industry was rebalanced on 6 October 2026. The prior 70-credit **quarterly** output yielded only about 4–5 monthly production-tax credits at balanced tax, nearly all absorbed by factory upkeep. `government-2` uses 180 credits per 30-day month at full operation. At 20% production tax that gives 36 tax credits in a 30-day month, minus roughly 4 upkeep credits. Actual output is multiplied by routed industrial water sufficiency, the powered operating fraction and workforce staffing. This tariff is a deliberate educational-game balance, not a Sri Lankan industry benchmark or promised investment return. It does not change factory water, electricity or nitrogen parameters. Higher economic output per existing physical input is therefore an assumed productivity/value change, not measured efficiency improvement.

The industry panel distinguishes gross output, plant tax share, upkeep and the sector’s direct treasury contribution. The authoritative sector levy is rounded down once after aggregation. It is attributed to individual factories using floor shares and largest fractional remainders, so displayed plant taxes sum exactly to sector receipts. Worker taxes remain a separate aggregate service/productivity proxy and are not attributed as extra factory revenue. Direct contribution excludes effects on food production, power costs, public services, other businesses and environmental scores. Building more factories shares available workers and can lower their output. The Water panel offers an explicit button to request industrial demand (capped at 300 ML); requesting water does not guarantee river supply or override environmental reservations. No water policy is changed merely by construction or by loading the update. Cash is credited only at month settlement, and no old report is recalculated.

Older v3 saves retain their current cash, assets and prior reports. The first ledger opens at the retained balance and labels pre-ledger spending as unavailable. New reports and month scores carry the economy rule version; earlier scores are never retroactively recomputed. A campaign spanning this change can therefore contain scores under both economy rules. Starting the next 24-month cycle creates a comparable new series while archiving the previous one.

### Nitrogen and environment

Each farm has a persistent soil N inventory. Fertilizer adds N; bounded crop removal and export subtract it. Connected river loads include upstream transport and local source loads. Treatment removal is capped by incoming load and operating capacity, and is recorded in a retained/sludge inventory. Dry-channel load is retained, not divided by zero or discarded. Residual soil N survives land conversion.

`old soil N + old retained-in-water N + new N input = crop removal + new sludge retention + outlet N + new soil N + new retained-in-water N`

The transfer structure follows mass accounting; the coefficients do not reproduce SWAT's nutrient transformations or transport. Irrigated nutrient uptake, phosphorus, groundwater nutrient transport, denitrification, sediment mass, carbon and ecological species responses are not modeled. N remaining after consumptive water loss is retained within the node's modeled inventory. [SWAT+ nitrate transport](https://swatplus.gitbook.io/io-docs/theoretical-documentation/section-4-erosion/nutrient-transport/nitrate-movement).

Environmental quality combines seasonal flow-target compliance, a nitrogen pressure index, habitat-cover assumptions and a dimensionless erosion-risk proxy. The erosion proxy uses slope, assumed seasonal wetness and cover; it is **not sediment tonnes or MUSLE**. Habitat is a scenario cover index, not a classification of the satellite image. Forest affects its own land-cover pressure; no unsupported claim is made that any distant forest removes another cell's nutrients. [SWAT+ MUSLE requirements](https://swatplus.gitbook.io/io-docs/theoretical-documentation/section-4-erosion/sediment/musle).

Environmental-flow targets are prescribed seasonal fractions and the 2 mg/L N reference is a game target, **not a regulatory limit or locally assessed ecological threshold**. Actual environmental-flow targets need natural flow series and ecological objectives. [IWMI Sri Lanka environmental-flow work](https://archive.iwmi.org/wle/sri-lanka-environmental-flow-calculator-science-based-tool-support-sustainable-national-water/index.html).

## Scoring policy

Every component is normalized to 0–100:

| Component | What counts |
|---|---|
| Water | Household demand served, combining average coverage and the worst populated sub-basin |
| Food | Household food need actually served |
| Energy | Achievable powered operating/service fraction |
| Economy | Operating-cost coverage and a bounded treasury reserve |
| Society | Wellbeing, employment, population survival and housing sufficiency |
| Environment | The weaker of routed ecosystem quality (flow, N, habitat and erosion) and generation-weighted lifecycle-carbon indicator |

### Current challenge rules (`basin-outcomes-3`, 8 October 2026)

See [the current scoring specification](SCORING.md) for development rewards, balance gating, reserve outlook, automatic exports, benchmark comparisons and Aqua Republica sources. These rules supersede the recurring bonuses below. The signed harm penalties documented farther below remain active. Current maxima are 100 stewardship + 750 development = 850 points/month before deductions. The trophy has no 100-point cap.

### Historical challenge rules (`basin-outcomes-2`, 6 October 2026)

Funding supports experimentation while score measures outcomes. New campaigns start with **1,000 credits**. A **100-credit development grant** is booked at each completed monthly settlement, in addition to earned tax receipts. It is an external scenario-budget transfer for the managed region, not industrial output, tax, debt, or a measured Sri Lankan programme. The grant is fixed per turn, independent of population, buildings, weather and score, and is separated in the cash ledger. Previews never book it. Existing cash, buildings and completed reports are retained; existing active campaigns begin receiving grants at their next settlement. No retroactive grants are invented.

Basic service rewards total at most **300 points**: water 60, food 60, energy 40, society 60 and environment 80. Public finance remains a diagnostic indicator but receives **zero direct points**. The balance cap uses only these five non-financial dimensions. Existing harm penalties below remain in effect. Solvency can still prevent a budget penalty, but extra cash beyond that cannot raise service points or unlock targets.

Most available points now depend on sustained outcomes. Each target pays **175 points per month**, starting with its **third consecutive qualifying completed month**. A failed month resets that target to zero. Continuing a new campaign resets all target streaks. Projections show the next month's potential progress without changing the saved streak.

| Target | Monthly requirements, all must pass |
|---|---|
| Secure supplies | Worst inhabited sub-basin household water, food, energy and housing sufficiency ≥99%; remaining food ≥2 months of demand; remaining energy ≥1 month of current demand |
| Thriving communities | Same essential-service/housing floor; effective workforce employment ≥95%; unrounded society indicator ≥92% |
| Protected rivers & land | Every sub-basin: ecological-flow compliance and modeled nitrogen quality ≥95%, habitat index ≥98%; area-weighted erosion index ≥90%; generation-weighted lifecycle intensity ≤50 kg CO₂e/MWh |
| Balanced basin stewardship | All three targets qualify together |

The society indicator combines wellbeing, employment, housing and population survival, so reaching the livelihood goal requires more than placing empty workplaces. The environmental goal uses existing modeled condition indices and reference-cover assumptions, not legal water-quality limits. All thresholds, grant amounts, credit scales, weights and streak durations are **game-design choices**, not calibrated scientific thresholds. Three-month persistence is a gameplay test of sustained management, not proof of ecosystem recovery.

Under these historical rules, benefits could reach 1,000/month after all four targets mature. Harm penalties and the geometric/weakest-service cap still apply, and scores can be negative. The 700 points reserved for sustained targets are not awarded merely for holding cash or increasing nominal output. Earlier scoring versions remain readable, including negative scores from `basin-outcomes-1`; their points are never recalculated. New target streaks start from zero on this version, while existing harmful-condition streaks continue from compatible signed-score reports. For comparison, the unchanged starting landscape produces about **247 points and 126 net credits** in the first month under these assumptions. These are deterministic scenario examples, not real-world forecasts.

### Previous signed monthly assessment (`basin-outcomes-1`, retained historical scores)

The six indicators above remain diagnostic 0–100 indices, not the trophy. Monthly benefits weight their unrounded sufficiency values by water 220, food 180, energy 140, economy 120, society 140 and environment 200. Each benefit is rounded to an integer. An explicit imbalance deduction prevents total benefits exceeding ten times the existing geometric-mean index, capped at 25 above its weakest indicator.

Then subtract the following harm and resilience penalties. The monthly result can be negative. A healthy treasury cannot cancel a water or food failure by itself. All targets and point tariffs below are **normative educational-game choices**, not measured monetary damages, legal standards, or calibrated Mahaweli ecological thresholds.

| Penalty | Severity, bounded 0–1 | Maximum first-month points |
|---|---|---:|
| Household water | 65% population-weighted deficit + 35% worst inhabited sub-basin deficit | 650 |
| Food | Fraction of food demand unmet | 650 |
| Energy | Fraction of powered demand unmet | 350 |
| Housing | Fraction of residents without adequate local housing | 250 |
| Jobs | Shortfall below 80% effective workforce employment, divided by 0.8 | 120 |
| Ecological flow | Spatial pressure from modeled flow compliance | 450 |
| Nitrogen | Spatial pressure from modeled nitrogen quality index | 400 |
| Habitat | Spatial pressure from modeled habitat index relative to 0.65 reference cover | 250 |
| Erosion | Shortfall below 0.85 area-weighted erosion index, divided by 0.85 | 180 |
| Carbon | Generation-weighted lifecycle intensity / (400 + intensity), kg CO₂e/MWh | 200 |
| Budget | Operating deficit / recurring expenses; full penalty for negative closing cash | 200 |
| Food reserve | Shortfall below one month of current food demand remaining | 60 |
| Energy reserve | Shortfall below one month of current powered demand remaining | 40 |

Effective employment uses available employed workers multiplied by the same essential-service productivity factor used for worker tax receipts (minimum household water, food and energy sufficiency). A powerless, non-producing workplace therefore cannot erase unemployment penalties merely by being placed. This is a disclosed proxy, not a sector-by-sector labour-market model.

Spatial pressure is `0.75 × area-weighted mean deficit + 0.25 × worst local deficit`. It balances extent with protection of small tributaries. It aggregates **condition indices**, not nitrogen loads or water volumes. Upstream loads are routed physically before scoring; their impacts can affect several connected reaches, but exported mass is never summed across reaches as new pollution. Food and electricity remain basin-wide accounts; local distribution networks are not modeled. Nitrogen quality is an ecological proxy, not a drinking-water safety certification. Erosion is a pressure index, not sediment tonnes. Carbon intensity omits imported electricity and does not represent an emissions inventory or carbon budget.

Water, food, energy, housing, ecological-flow and nitrogen penalties rise by 25% per additional consecutive completed month with severity above 0.05, capped at 75% extra. Streaks are basin-wide for each problem category. Severity at or below 0.05 resets the streak (a small current penalty can remain). Repeated forecasts do not advance streaks. This models a policy concern about persistent harm; it is not a clinical dose-response or ecological recovery model. Resolved shortages stop their escalation. Legacy reports have no streak and start at the first-month tariff.

`month points = sum(rounded service benefits) − imbalance deduction − sum(rounded harm/reserve penalties)`

The trophy sums signed points over completed months, including negative totals. Construction, removal and forecasts award no points: location affects routed flows, pollution, crop yield, pumping, habitat, staff demand and cash; these change the projected and settled monthly result. The placement inspector shows the score difference from the current plan. It is conditional on current allocations and operations, not a permanent fixed building score. Demolition does not erase residents or stored nutrients.

Reports show individual benefits and penalties, persistence multipliers and the five most stressed sub-basins. The six diagnostic indicators remain visible separately. Benefits and explicit harm penalties intentionally overlap: failing to supply a need loses its service reward **and** incurs a harm debit. This is a disclosed policy choice. Maximal benefits remain 1,000 per month / 24,000 per complete campaign; there is no zero floor on month or campaign points.

Previously completed months keep their original points, reports and rule versions. New rows store the rule version, signed integer points, benefits, penalties and separate balance index. The compatibility field `total` stores `points / 10`; legacy rows still convert their historical index × 10. Mixed-version campaigns are retained but are not directly comparable to entirely new campaigns. Restarting begins a fresh comparable series. Continuing archives the completed series and resets persistent-failure streaks.

The integrated approach is informed by the interdependence of human water, food, energy and ecosystem needs described by [UN-Water](https://www.unwater.org/water-facts/water-food-and-energy). There is no scientifically unique total sustainability score. Geometric aggregation reduces compensation but does not eliminate it; the additional cap and penalty tariffs are our safeguards, not published Aqua Republica rules. Keep components visible and examine sensitivity before claiming robust strategy rankings. [OECD/JRC composite-indicator handbook](https://www.oecd.org/en/publications/handbook-on-constructing-composite-indicators-methodology-and-user-guide_9789264043466-en.html).

## What is verified and what remains

[Development and removal rules](DEVELOPMENT.md) document wetlands, riparian buffers, orchards, clinics and paid demolition. Additional checks cover connected wetland nitrogen retention, soil retention behind buffers, orchard inputs, local service coverage, demolition/replacement ledger closure and preservation of residents and resource inventories after removal. Numerical parameters remain disclosed scenario choices.

Automated checks exercise ordinary cell/type combinations and hydro eligibility, location-dependent outcomes, connected versus unconnected downstream impacts, bounded treatment, persistent nutrient pools, rainfed production, water/N accounting, score caps, preview-to-result equality, trade conservation and save migration. These establish internal consistency, not external predictive accuracy. Browser checks cover the current monthly controls and recorded audio status.

Before labeling this a scientific Mahaweli decision model, obtain and validate: your basin/sub-basin boundaries and outlets; soils and land cover; weather and flow observations; reservoir operations and transfers; irrigation and crop calendars; water-quality data; energy/economic/demographic inputs; calibrated SWAT+ baseline and intervention runs; and agreed environmental objectives. Run out-of-sample checks, parameter/weight sensitivity and ranking-stability tests.

Connect game cells to explicit SWAT+ HRU, routing-unit, channel and reservoir IDs. Import dated, unit-checked runoff, routed flow, storage, ET, crop, sediment and nutrient outputs behind the monthly report interface. Do not sum upstream and downstream channel flows as independent water production. A spatial object and its routing connections are distinct model concepts. [SWAT+ spatial objects](https://swatplus.gitbook.io/io-docs/introduction/basin/spatial-objects), [SWAT+ connectivity](https://docs.swat.tamu.edu/input-reference/con/).


Settlement migration now responds to housing, job vacancies and spatially checked water, food and power supply. Arrivals settle at month end, with worker taxes from the following month. Worker receipts retain hundredths of a credit; public services scale with population. See [POPULATION.md](POPULATION.md) for assumptions and timing.
