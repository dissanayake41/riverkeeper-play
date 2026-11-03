# Balanced development challenge

Rules: `basin-outcomes-4` / ranked competition `preparedness 2026.10-v3`, 26 October 2026.

The final trophy is the sum of signed monthly points across 24 completed months. It is not a percentage. Previews, building clicks and market clicks award no points. An unchanged starting basin can earn modest stewardship credit, but no repeated 175-point reserve bonuses.

## Research basis

DHI's [Aqua Republica design paper, pp. 14–15](https://www.dhigroup.com/upload/publications/mikebasin/Chew_2013.pdf) describes population wellbeing (housing density, jobs, food and power), production, ecosystems, sustainability assessed by three future model steps, and achievement bonuses. It does **not** specify a complete reproducible numerical scoring formula. Its original simulation used MIKE BASIN. The [DHI case story](https://www.dhigroup.com/upload/publications/misc/EnviroAndEco_CaseStory_Exploring%20the%20world%20of%20Aqua%20Republica.pdf) also emphasizes ecosystem protection during development and consequences for pollution.

Riverkeeper uses that combined-outcomes principle with its own transparent weights. These are educational game choices, not Aqua Republica's exact formula, monetary damage estimates or calibrated Mahaweli/SWAT+ results.

## Monthly rewards

Basic stewardship: up to 100 points, weighted water 15, food 15, electricity 10, society 20 and environment 40. Each weight multiplies its modeled 0–1 sufficiency indicator.

Development compares actual outcomes with the same fresh starting basin for every player. The reference is computed from the initial model state, not from a player's latest month, cash balance or demolished buildings. Production and earned income are normalized to 30 days before comparison.

| Development outcome | Full-credit improvement above the reference | Maximum monthly points |
|---|---|---:|
| Residents reliably served | 1,200 additional residents, adjusted for the weakest household-water, food, electricity and housing coverage | 200 |
| Effective jobs | 660 additional effective employed workers; operational service shortages reduce effective employment | 100 |
| Earned operating income | 100 additional credits per 30 days after recurring costs and imports | 150 |
| Useful food production | One starting farm's normalized output again, actually used for domestic demand, reserve replenishment or automatic surplus exports | 100 |
| Useful electricity | One starting solar project's normalized output again, actually used for demand, reserve replenishment or automatic surplus exports | 100 |
| Ecosystem improvement | 0.10 increase in the combined ecosystem/carbon indicator | 100 |

For each row: `round(maximum × clamp((current − reference) / target, 0, 1))`. Merely placing facilities, adding unfilled job slots, stockpiling unwanted output or spending credits is insufficient.

Earned operating income = worker and production taxes − upkeep − public services + qualifying exports − import spending. Grants, opening cash and construction spending do not enter this reward. Investment is paid once and does not count as an operating failure. For scoring, combined manual/automatic export receipts are capped by current food/electricity production above domestic demand; dumping old stocks cannot create unlimited income points. Export sale prices are currently one credit per unit. All same-period import costs are deducted. Market receipts still enter the treasury at their actual prices.

Food/electricity reward output is capped by this month's demand, replenishment up to two months of food/one month of electricity, and automatic exports. Output beyond these uses receives no production points; curtailed electricity is not rewarded as useful output. Financial and production rewards intentionally overlap: one measures public operating returns, the other physical provision.

## Balance and future supply

Development retention = weakest essential coverage × square root of (society × environment) × reserve outlook. The unretained fraction of the 750-point development pool is shown as a balance deduction. A complete essential-service failure removes all development rewards, even in a rich basin.

Reserve outlook = the weaker of food and electricity coverage over three months using `clamp((closing stock + 3 × current production) / (3 × current demand), 0, 1)`. This is a constant-condition reserve-runway screen, **not** Aqua Republica's three-step hydrological simulation and **not** a drought forecast. It does not simulate future population growth or weather.

The existing spatial harm penalties remain: household shortages, food, electricity, housing, unemployment, river flow, nitrogen pollution, habitat, erosion, generation carbon, fiscal deficits and inadequate reserves. Persistent major shortages, flow stress and nitrogen pollution escalate by 25% per consecutive month, up to 75% extra. Local problems cannot be hidden by a basin average. See [SCIENCE.md](SCIENCE.md) for the tariffs and scientific limits.

`month points = stewardship rewards + development rewards − balance deduction − harm penalties + event response reward − event stress penalty`.

The base reward ceiling is 850/month. Event months add at most 40, giving a theoretical 20,880 across the 24-month scenario (12 event months); negative totals have no zero floor. These ceilings are design choices, not required or easily attainable targets. Historical scores retain their original numbers and rule labels; old and new rules use separate ranked leaderboards.

## Predefined early-warning scenarios

Fresh campaigns use `preparedness-1`, with the same schedule for guest and ranked games. The objectives popup appears at the beginning. The map outlook and Bindu announce each event two months before onset; the outlook remains available throughout the event.

| Warning issued | Active period | Scenario |
|---|---|---|
| February, year 1 | April–May, year 1 | Heavy rain |
| May, year 1 | July–September, year 1 | Dry spell |
| September, year 1 | November–December, year 1 | Monsoon rain |
| February, year 2 | April–June, year 2 | Low flow |
| August, year 2 | October–November, year 2 | Heavy rain |

Dry events apply the existing inflow anomaly of −35 quarter-equivalent ML and multiply crop rainfall contribution by 0.55. Rain events apply +35 and a 1.3 rainfall multiplier, capped at a rainfall fraction of 0.95. Heavy rain multiplies erosion pressure by 1.8 and affects nutrient wash-off through the rainfall fraction. Existing terrain, land uses, policies, local routing and demands determine outcomes. These are illustrative basin-wide scenario parameters, not official Met Department forecasts, calibrated return periods, flood inundation, or SWAT+ simulation results. Decorative local showers remain a separate visual effect.

Event readiness uses the weakest essential coverage (household water, food and electricity). Dry events also require the worst sub-basin ecological-flow compliance. Rain events also require river-quality and soil-protection indices, weighted by reference flow. Readiness is the minimum of these applicable 0–1 measures. Event reward is `round(40 × clamp((readiness − 0.8) / 0.2, 0, 1))`, only when essential coverage is at least 99%. Stress penalty is `round(120 × (1 − readiness))`. These supplement ordinary monthly benefits and harms. Reviewing a warning or purchasing an item awards nothing by itself; only actual outcomes at month settlement are recorded.

Existing saved campaigns without the scenario marker keep their earlier weather schedule. Restarting creates a new scenario campaign without deleting account scores.

## Exports

Market → **Monthly surplus exports → Sell surplus each month** enables an optional standing order. Default is to retain supplies.

At settlement, sell only new production above domestic demand, and only when the resulting stock retains two months of food and one month of electricity at current demand. Any household-water, food or electricity coverage below 99% pauses automatic exports. Sales are removed before storage limits, and the cash is added once in the monthly budget. Imported or opening stocks cannot themselves be automatically exported. Ordinary manual trades remain available and can reduce reserves.

Food and electricity are abstract basin-wide accounts. Electricity trading assumes an external grid and the existing game's carry-over energy account; it is not an hourly dispatch or physical battery model. Prices, market access and reserve durations are scenario assumptions. Water export is not implemented because it would require explicit connections and downstream/environmental accounting.

## Regression examples

`node scripts/score-benchmark.mjs` runs identical initial conditions and ranked weather with legal building/policy actions and actual costs, without extra starting money:

- No decisions: −1,278 points across 24 months under the preparedness schedule.
- Supplied development with conservation, food, wind, storage, later industry, treatment and surplus exports: 13,384 points and 4,011 residents. It is an example strategy, not an optimum or a guarantee for other choices and locations.
- Repeated industry construction without matching food/power and environmental management: −15,967 points and failure after 11 months.

Tests also cover score reconciliation, cash/import exploits, finite useful-output rewards, reserve protection, migration, location effects, water/nitrogen/electricity balances, account authority and historical-score preservation.
