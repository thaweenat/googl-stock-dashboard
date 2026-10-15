/** Normalization of Alphabet's SEC companyfacts. Reported facts only, no hardcoded numbers. */
const GAAP={
  revenue:['RevenueFromContractWithCustomerExcludingAssessedTax','Revenues','SalesRevenueNet'],
  netIncome:['NetIncomeLoss'], operatingIncome:['OperatingIncomeLoss'],
  operatingCashFlow:['NetCashProvidedByUsedInOperatingActivities'],
  capitalExpenditures:['PaymentsToAcquirePropertyPlantAndEquipment'],
  assets:['Assets'], liabilities:['Liabilities'], equity:['StockholdersEquity'],
  cash:['CashAndCashEquivalentsAtCarryingValue'],
  eps:['EarningsPerShareDiluted']
};
function days(start,end){ return Math.round((Date.parse(end)-Date.parse(start))/86400000); }
function getSeries(facts,tags,unit='USD') {
  for (const tag of tags) {
    const values=facts?.['us-gaap']?.[tag]?.units?.[unit];
    if (Array.isArray(values) && values.length) return values;
  }
  return [];
}
function dedupRows(entries) {
  const unique=new Map();
  for (const v of entries) {
    const old=unique.get(v.end);
    if (!old || v.filed>old.filed) unique.set(v.end,v);
  }
  return [...unique.values()].sort((a,b)=> b.end.localeCompare(a.end));
}
function annual(facts,tags,unit='USD'){
  return dedupRows(getSeries(facts,tags,unit).filter(v=>v.form==='10-K'&&v.start&&v.end&&days(v.start,v.end)>320&&days(v.start,v.end)<390&&Number.isFinite(v.val)));
}
function latestPoint(facts,tags){
  return dedupRows(getSeries(facts,tags).filter(v=>['10-K','10-Q'].includes(v.form)&&v.end&&!v.start&&Number.isFinite(v.val)))[0]||null;
}
export function parseFundamentals(facts) {
  if (!facts?.facts?.['us-gaap']) throw new Error('SEC ไม่มีข้อมูล XBRL ที่รองรับ');
  const f=facts.facts;
  const rows=annual(f,GAAP.revenue);
  const annualResult=[];
  for (const row of rows.slice(0,5)) {
    const end=row.end;
    const val=(key,unit='USD') => annual(f,GAAP[key],unit).find(v=>v.end===end)?.val??null;
    const income=val('netIncome'),cashflow=val('operatingCashFlow'),capex=val('capitalExpenditures');
    annualResult.push({fy:row.fy||Number(end.slice(0,4)),end, filed:row.filed,
      revenue:row.val,netIncome:income,operatingIncome:val('operatingIncome'),
      operatingCashFlow:cashflow,capitalExpenditures:capex,
      freeCashFlow:cashflow!=null&&capex!=null?cashflow-Math.abs(capex):null,
      epsDiluted:val('eps','USD/shares')});
  }
  const newest=annualResult[0], previous=annualResult[1];
  const percent=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&b!==0 ? (a/b-1)*100 : null;
  const ratio=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&b!==0 ? a/b*100 : null;
  const instant={};
  for(const k of ['assets','liabilities','equity','cash']) {
    const v=latestPoint(f,GAAP[k]);
    instant[k]=v?.val??null; instant[k+'AsOf']=v?.end??null;
  }
  return {
    company:facts.entityName||'Alphabet Inc.',cik:facts.cik||1652044,currency:'USD',
    annual:annualResult.reverse(),latestAnnual:newest||null,
    revenueGrowthYoY:newest&&previous?percent(newest.revenue,previous.revenue):null,
    netMargin:newest?ratio(newest.netIncome,newest.revenue):null,
    operatingMargin:newest?ratio(newest.operatingIncome,newest.revenue):null,
    fcfMargin:newest?ratio(newest.freeCashFlow,newest.revenue):null,
    latestBalanceSheet:instant,
    source:'SEC EDGAR Company Facts',
    sourceUrl:'https://data.sec.gov/api/xbrl/companyfacts/CIK0001652044.json',
    filingDate:newest?.filed||null
  };
}
