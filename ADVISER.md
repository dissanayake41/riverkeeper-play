# Bindu, the basin companion

Bindu is an original, locally rendered Three.js water-drop character with hands, legs, a wave, a pointing hand, a nod, a blink and a silent talking-mouth animation. No external generation service or language model is required. Reduced-motion preferences disable movement; text remains available if WebGL cannot render the character.

After a completed month, the companion opens a compact navy-and-teal speech bubble for the **upcoming playable month**. The map remains interactive. Each message contains just one short tip and an optional action; arrows step through other relevant tips. The Month results button retains access to the completed month's accounts and score. The map companion button reopens a briefing at any time. The final month produces a campaign-review message rather than a fictitious month 25 forecast.

Messages come from fixed, deterministic rules over the current game and its existing projection. The same state produces the same advice. Reading a briefing does not consume random numbers, advance time, change allocations, alter resources or award points. Actions only open the relevant controls or select an existing site; the player makes every management decision.

## Service desks and triggers

- **Weather:** the already-issued scenario weather modifier produces a dry- or wet-month advisory. A seasonal baseline reduction greater than 20% within the next two playable months produces advance notice. Percentages compare daily-equivalent scenario inputs, not month totals. Cosmetic clouds and showers are unrelated to these accounts. There is no real meteorological feed, calibrated drought probability or flood-inundation model.
- **Water:** household supply below 99%, including the worst supplied inhabited sub-basin, triggers urgent guidance. River-flow compliance below 80% triggers an ecology advisory.
- **Food and power:** service below 99% is urgent; projected reserves below one month prompt preparation only when production is also below demand. A reserve warning explicitly says that current needs are covered.
- **Environment:** modeled river nitrogen above the game's 2 mg/L target identifies the affected sub-basin and suggests source control. Dry channels with retained nitrogen also trigger source-control guidance. Erosion, habitat loss and high power-sector carbon intensity have separate tips; these are model indicators rather than measured impacts.
- **Community:** housing below 99% is urgent; small housing headroom prompts preparation. Employment below 80% prompts a jobs advisory.
- **Industry:** a factory below 80% operation identifies the most limiting water, electricity or staffing factor and links to that site.
- **Treasury:** negative recurring net income prompts a budget review; a negative projected closing balance is urgent.

Advisories use a stable priority order. The highest-priority tip appears first; the player can step through additional tips using the arrows. When no threshold is crossed, one consistent reserve-planning message replaces unnecessary alarms. These are educational game thresholds, not official agency warnings or regulatory limits.

## Consistent diagnostics (October 2026)

Bindu, monthly warnings and the water panel now share withdrawal diagnostics. Household demand includes conveyance losses. The panel separately shows net water delivered after losses. A shortage is decomposed into the allocation gap, power-limited pumping, and remaining connected-supply gap; these sum to the withdrawal deficit. Basin inflow plus stored water is never described as water already delivered to homes. The explicit household-request button changes only the requested allocation; it neither creates water nor advances a month.

The visible tip uses its live evidence rather than a generic canned sentence. Open tips refresh after allocation, construction, policy and trade changes. Actual food and energy shortfalls are distinguished from declining reserves; housing headroom from homelessness; and operating losses from an exhausted treasury. Advice never assumes that adding more factories cures a workforce shortage.

Reservoirs now preserve achievable downstream water requests and local river reservations before impounding surplus. A forward no-new-storage pass measures attainable flows and returns; a reverse pass propagates required releases upstream along the drainage graph. At confluences, requests are divided proportionally to contributing attainable flows. Reservoirs cannot supply upstream or disconnected branches. This is an illustrative coordinated monthly release rule, not a calibrated or optimal Mahaweli operating schedule. It does not forecast reservoir levels beyond the current monthly step.

Scientific distinctions are consistent with [USGS definitions of withdrawal, return flow and consumptive use](https://www.usgs.gov/mission-areas/water-resources/science/water-use-united-states) and [FAO conveyance and irrigation efficiency concepts](https://www.fao.org/4/t7202e/t7202e08.htm). These references do not validate the game's numerical parameter choices. Real Mahaweli application still needs measured demand, intake locations, reservoir rules, inflows and calibration. Live gameplay remains an educational coupled scenario model; the separate SWAT+ workflow is not a calibrated live basin model.
