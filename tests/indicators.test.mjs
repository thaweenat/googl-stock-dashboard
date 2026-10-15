import assert from 'node:assert/strict';
import {calculateRSI,confirmedPivots,fibonacci,volumeProfile,rsiDivergences,buildTechnical,thaiRuleSummary} from '../shared/indicators.js';
import {parseFundamentals} from '../worker/src/fundamentals.js';
import worker from '../worker/src/index.js';
const candles=Array.from({length:120},(_,i)=>{const close=120+.5*i+6*Math.sin(i*.34);return {datetime:`2026-01-${String(i+1).padStart(2,'0')}`,open:close-.8,high:close+2,low:close-2,close,volume:500000+i*100};});
const rsi=calculateRSI(candles);assert.equal(rsi.length,120);assert.equal(rsi[0],null);assert.ok(Number.isFinite(rsi.at(-1)));
const t=buildTechnical(candles);assert.equal(t.valid,true);assert.ok(t.fib);assert.ok(t.profile);assert.ok(t.profile.estimated);assert.ok(t.profile.vah>t.profile.val);assert.ok(t.profile.poc>=t.profile.val&&t.profile.poc<=t.profile.vah);assert.ok(['bullish','bearish','sideways'].includes(t.trend));
assert.ok(thaiRuleSummary(t,null,[]).includes('การสรุปตามกฎ'));
assert.deepEqual(calculateRSI([{close:1},{close:2}],14),[null,null]);
assert.deepEqual(confirmedPivots(candles).lows.every(i=>i<=candles.length-4),true);
assert.equal(volumeProfile([{low:10,high:20,volume:0}]),null);
assert.deepEqual(rsiDivergences([],[],3),[]);
// SEC XBRL annual entries where a 10-K can contain multiple prior-year comparisons.
const annualFact=(val,end,form='10-K',start=`${Number(end.slice(0,4))}-01-01`)=>({start,end,val,form,fy:Number(end.slice(0,4)),filed:`${Number(end.slice(0,4))+1}-02-12`});
const sample={entityName:'Alphabet Inc.',cik:1652044,facts:{'us-gaap':{
  RevenueFromContractWithCustomerExcludingAssessedTax:{units:{USD:[annualFact(200,'2024-12-31'),annualFact(240,'2025-12-31')]}},
  NetIncomeLoss:{units:{USD:[annualFact(40,'2024-12-31'),annualFact(60,'2025-12-31')]}},
  OperatingIncomeLoss:{units:{USD:[annualFact(70,'2024-12-31'),annualFact(100,'2025-12-31')]}},
  NetCashProvidedByUsedInOperatingActivities:{units:{USD:[annualFact(90,'2024-12-31'),annualFact(115,'2025-12-31')]}},
  PaymentsToAcquirePropertyPlantAndEquipment:{units:{USD:[annualFact(20,'2024-12-31'),annualFact(30,'2025-12-31')]}},
  EarningsPerShareDiluted:{units:{'USD/shares':[annualFact(3,'2024-12-31'),annualFact(4,'2025-12-31')]}},
  Assets:{units:{USD:[{end:'2025-12-31',form:'10-K',val:500,filed:'2026-02-12'}]}}
}}};
const f=parseFundamentals(sample);
assert.equal(f.latestAnnual.revenue,240);assert.ok(Math.abs(f.revenueGrowthYoY-20)<1e-8);assert.equal(f.latestAnnual.freeCashFlow,85);assert.equal(f.latestBalanceSheet.assets,500);
const ctx={waitUntil(){}};
const env={SITE_ORIGIN:'https://demo.github.io',SEC_USER_AGENT:'My Research Demo me@my-site.test'};
const health=await worker.fetch(new Request('https://worker.example.com/api/health',{headers:{Origin:'https://demo.github.io'}}),env,ctx);
assert.equal(health.status,200);assert.equal((await health.json()).marketConfigured,false);
const blocked=await worker.fetch(new Request('https://worker.example.com/api/health',{headers:{Origin:'https://evil.com'}}),env,ctx);
assert.equal(blocked.status,403);
const empty=await worker.fetch(new Request('https://worker.example.com/api/market?interval=1day',{headers:{Origin:'https://demo.github.io'}}),env,ctx);
assert.equal(empty.status,502);assert.ok((await empty.json()).error.includes('TWELVE_DATA_KEY'));
console.log('PASS: indicators, fundamentals, health, CORS, missing-key handling');
