# Site policies

Updated 7 October 2026. Click a developed management cell, choose **Site policies**, review the change to the current monthly plan, then apply. A policy affects that particular site. Every existing development type has at least one applicable option.

Installation is paid immediately, once, through the construction ledger. Active policies incur monthly upkeep and any additional electricity demand. Costs below are per 30-day month and prorated to the calendar. Pausing stops benefits and running costs; reactivating an installed policy is free. Removing or replacing a development removes its policy installations without refunds. Retained nitrogen inventories remain. Completed campaigns must be continued before policies can change.

## Available policies and scenario parameters

All prices, capacity shares and percentage effects below are **game assumptions**, not Sri Lankan quotations, calibrated engineering performance or regulatory standards. Benefits depend on the existing monthly water, energy, staffing and connected pollution conditions.

| Policy | Applicable sites | Install / monthly credits | Extra monthly MWh | Modeled effect |
|---|---|---:|---:|---|
| Treat factory wastewater | Industry | 75 / 3 | 1 | Capture up to 70% of that factory's nitrogen discharge, scaled by power and staffing; retain as sludge. |
| Rooftop solar | Settlement, industry, clinic, treatment | 45 / 0.5 | 0 | 20 kW PV share, generating with monthly hours and the existing seasonal solar profile. |
| Water-efficient equipment | Settlement, industry | 35 / 1 | 0 | 20% lower freshwater requirement and associated pumping. No invented water supply or reuse. |
| Energy-efficient equipment | Settlement, industry, clinic, treatment | 35 / 0.5 | 0 | 20% lower base site electricity; includes resident demand in a settlement, excludes pumping and policy equipment. |
| Contour strips & soil cover | Farm, orchard | 40 / 1.5 | 0 | 45% less local erosion pressure, 30% lower nutrient runoff fraction; nitrogen stays in soil. |
| Precision nutrient plan | Farm, orchard | 25 / 1 | 0 | 25% lower fertiliser input and a cautious 5% lower yield potential. |
| Native habitat strips | Settlement, industry, clinic, treatment, all power plants, reservoir | 30 / 1 | 0 | Habitat-cover coefficient +0.08, capped at 0.98; erosion multiplier 0.8. |
| Protect forest understory | Forest | 25 / 1 | 0 | Habitat-cover coefficient +0.03; erosion multiplier 0.5 and residual nutrient runoff multiplier 0.8. |
| Maintain wetland vegetation | Wetland | 30 / 2 | 0 | Nitrogen-retention capacity +40%; existing connected-load and retention-fraction limits remain. |
| Maintain riverbank cover | Riparian buffer | 25 / 1 | 0 | Buffer-protection contribution +40%, still capped across the sub-basin; local erosion multiplier 0.6. |
| Ecological release rule | Reservoir | 20 / 1 | 0 | Reserve the existing environmental-flow target before withdrawals and storage in this sub-basin. |
| Efficient cooling retrofit | Coal, nuclear | 65 / 2 | 1 | Cooling withdrawals -20% and consumption -10% per MWh generated. |
| Upgrade nutrient treatment | Treatment plant | 45 / 2 | 1 | Nitrogen-treatment capacity +50%, limited by connected load, staff and power. |
| Community health outreach | Clinic | 20 / 2 | 0.2 | Service coverage capacity +25%, capped by local residents, staff and power. |

## Accounting and scoring

The preview compares the complete current-month simulation before and after the policy, including income, power, withdrawals, food, outlet nitrogen, retention, erosion and score. It does not post money or score. Installation is a separate immediate expense; the monthly net-income comparison includes operating effects. A policy can lower the score if its electricity or budget demand worsens shortages. There are no points merely for installing policies.

Factory treatment removes only the factory's own new load, before that load joins the river network. It does not treat unrelated upstream pollution. Connected treatment plants and wetlands then operate on the remaining load, avoiding double capture. Captured nitrogen is recorded in retained sludge or wetland inventories; soil controls leave unexported nitrogen in the soil pool. Old pollution persists after pausing, conversion or demolition.

Rooftop PV uses the shared electricity ledger, including reserve and curtailment limits, and the existing solar lifecycle-carbon assumption. It uses existing roofs and generates without an extra workforce requirement. The 20 kW share does not represent a roof survey. It has no additional power-plant running cost: its own policy upkeep is charged once. Native strips affect habitat and erosion proxies; they do not manufacture biodiversity observations. The release rule can protect flow at its reservoir while downstream withdrawals still reduce flow elsewhere.

## Scientific basis and limits

- FAO describes soil cover, reduced disturbance and nutrient management as ways to limit soil and nutrient loss. These support the direction of the soil-cover and nutrient-policy effects, **not their numerical multipliers**: [soil organic cover](https://www.fao.org/conservation-agriculture/in-practice/soil-organic-cover/en/) and [conservation-agriculture practices](https://www.fao.org/agriculture/crops/thematic-sitemap/theme/spi/scpi-home/managing-ecosystems/conservation-agriculture/ca-how/en/).
- EPA distinguishes industrial water treatment and reuse applications and the importance of treatment appropriate to water source and use: [industrial water resources](https://www.epa.gov/waterreuse/water-reuse-industrial-applications-resources). Here industrial treatment represents nitrogen capture only. The water-efficiency policy is conservation, not a modeled reclaimed-water system.
- DOE explains that actual rooftop PV potential depends on roof area, orientation and shading: [rooftop solar potential](https://www.energy.gov/cmei/systems/solar-rooftop-potential). The game uses a fixed capacity share and seasonal profile, not site-specific engineering.
- Existing environmental-flow, treatment, habitat and energy assumptions are documented in [SCIENCE.md](SCIENCE.md), [DEVELOPMENT.md](DEVELOPMENT.md) and [ENERGY.md](ENERGY.md). The policy multipliers above are explicit additional scenario choices.

This first policy set covers the game's current item types, not every real-world problem. Nitrogen is the only tracked pollutant: pathogens, metals, oxygen demand and discharge-permit compliance are not evaluated. Sludge disposal capacity, cooling-system design, biodiversity surveys and clinical disease outcomes are not simulated. Erosion is an index rather than tonnes of sediment. This remains an uncalibrated educational model, not SWAT+ output or a certified Mahaweli management recommendation.
