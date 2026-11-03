// Two non-leap scenario years. Weather remains illustrative, not a dated forecast.
export const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
export const CAMPAIGN_MONTHS=24;
export const monthIndex=turn=>turn%12;
export const climateQuarter=turn=>Math.floor(monthIndex(turn)/3);
export const monthDays=turn=>[31,28,31,30,31,30,31,31,30,31,30,31][monthIndex(turn)];
export const quarterFraction=turn=>monthDays(turn)/[90,91,92,92][climateQuarter(turn)];
export const monthLabel=turn=>`${MONTHS[monthIndex(turn)]} · Year ${Math.floor(turn/12)+1}`;
