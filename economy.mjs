// Educational fiscal assumptions in game credits, not measured local prices or tax rates.
export const ECONOMY_VERSION='government-5';
export const ECONOMY_RULES={foodOutputValue:2,energyOutputValue:1,industryOutputMonthly:180,monthlyGrant:100};
const sum=values=>values.reduce((a,b)=>a+b,0);
export function newBudgetPeriod(money,complete=true){return {opening:money,construction:0,imports:0,exports:0,complete};}
export function recordTransaction(s,kind,amount){
 if(!['construction','demolition','imports','exports'].includes(kind)||!Number.isFinite(amount)||amount<0)throw Error('Invalid treasury transaction.');
 // Old saves have no transaction history. Begin from their current treasury.
 s.budgetPeriod??=newBudgetPeriod(s.money,false);
 s.budgetPeriod[kind]=(s.budgetPeriod[kind]||0)+amount;
}
export function fiscalProjection(s,{employed,waterRatio,foodRatio,energyRatio,foodMade,powerMade,industryOutput,upkeep,serviceCost,tax,autoExports=0}){
 const productiveFraction=Math.min(waterRatio,foodRatio,energyRatio);
 const output={agriculture:foodMade*ECONOMY_RULES.foodOutputValue,industry:industryOutput,energy:powerMade*ECONOMY_RULES.energyOutputValue};
 const receipts={workers:Math.round(employed*tax.rate*productiveFraction*100)/100,agriculture:Math.floor(output.agriculture*tax.productionRate),industry:Math.floor(output.industry*tax.productionRate),energy:Math.floor(output.energy*tax.productionRate)};
 const taxIncome=sum(Object.values(receipts)),grant=ECONOMY_RULES.monthlyGrant,income=taxIncome+grant+autoExports,expenses=upkeep+serviceCost,net=income-expenses;
 const period={...(s.budgetPeriod||newBudgetPeriod(s.money,false))};
 const current=period.opening+period.exports-period.construction-(period.demolition||0)-period.imports;
 const closing=current+net;
 return {version:ECONOMY_VERSION,output,receipts,taxIncome,grant,autoExports,income,expenses,upkeep,serviceCost,net,productiveFraction,taxRate:tax.productionRate,period,current,closing,residual:closing-(s.money+net)};
}
export function validBudgetPeriod(s){
 const p=s.budgetPeriod;if(p===undefined)return true;
 return p!==null&&typeof p==='object'&&Number.isFinite(p.opening)&&['construction','imports','exports'].every(k=>Number.isFinite(p[k])&&p[k]>=0)&&(p.demolition===undefined||Number.isFinite(p.demolition)&&p.demolition>=0)&&typeof p.complete==='boolean'&&Math.abs(p.opening+p.exports-p.construction-(p.demolition||0)-p.imports-s.money)<1e-6;
}
