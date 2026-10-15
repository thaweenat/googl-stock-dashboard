/** Pure, dependency-free GOOGL technical indicators; no live data is bundled. */
export function calculateRSI(candles, period = 14) {
  const result = Array(candles.length).fill(null);
  if (candles.length <= period) return result;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = candles[i].close - candles[i - 1].close;
    gains += Math.max(0, d); losses += Math.max(0, -d);
  }
  let avgGain = gains / period, avgLoss = losses / period;
  const value = () => avgGain === 0 && avgLoss === 0 ? 50 : avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  result[period] = value();
  for (let i = period + 1; i < candles.length; i++) {
    const d = candles[i].close - candles[i - 1].close;
    avgGain = (avgGain * (period - 1) + Math.max(0, d)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(0, -d)) / period;
    result[i] = value();
  }
  return result;
}
export function confirmedPivots(candles, side = 3) {
  const lows = [], highs = [];
  for (let i = side; i < candles.length - side; i++) {
    const window = candles.slice(i - side, i + side + 1);
    if (window.every((c, j) => j === side || candles[i].low < c.low)) lows.push(i);
    if (window.every((c, j) => j === side || candles[i].high > c.high)) highs.push(i);
  }
  return { lows, highs };
}
export function fibonacci(candles, lookback = 160) {
  if (!candles || candles.length < 12) return null;
  const offset = Math.max(0, candles.length - lookback);
  const sub = candles.slice(offset);
  const pivots = confirmedPivots(sub);
  const events = [
    ...pivots.lows.map(i => ({ i, type: 'low', price: sub[i].low })),
    ...pivots.highs.map(i => ({ i, type: 'high', price: sub[i].high }))
  ].sort((a,b) => a.i - b.i);
  if (!events.length) return null;
  const last = events.at(-1);
  const previous = [...events].reverse().find(e => e.type !== last.type && e.i < last.i);
  if (!previous || Math.abs(last.price - previous.price) < 1e-9) return null;
  const low = Math.min(last.price, previous.price), high = Math.max(last.price, previous.price);
  const direction = last.type === 'high' ? 'up' : 'down';
  const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1].map(ratio => ({ratio, price: direction === 'up' ? high - ratio * (high - low) : low + ratio * (high - low)}));
  const current = candles.at(-1).close;
  return {
    low, high, direction,
    startDate: sub[previous.i].datetime, endDate: sub[last.i].datetime,
    levels,
    support: [...levels].filter(x => x.price < current).sort((a,b)=>b.price-a.price)[0]?.price ?? null,
    resistance: [...levels].filter(x => x.price > current).sort((a,b)=>a.price-b.price)[0]?.price ?? null
  };
}
export function volumeProfile(candles, bins = 36, valueArea = 0.70) {
  if (!Array.isArray(candles) || !candles.length) return null;
  const clean = candles.filter(c => Number.isFinite(c.high) && Number.isFinite(c.low) && Number.isFinite(c.volume) && c.volume >= 0);
  if (!clean.length || clean.every(c=>c.volume===0)) return null;
  const lo = Math.min(...clean.map(c=>c.low)), hi = Math.max(...clean.map(c=>c.high));
  if (hi <= lo) return null;
  const size = (hi - lo) / bins;
  const histogram = Array(bins).fill(0);
  for (const c of clean) {
    const a = c.low, b = c.high;
    if (b <= a) { histogram[Math.min(bins - 1, Math.max(0, Math.floor((a - lo) / size)))] += c.volume; continue; }
    for (let k = Math.max(0, Math.floor((a-lo)/size)); k < Math.min(bins, Math.ceil((b-lo)/size)); k++) {
      const overlap = Math.max(0, Math.min(b,lo+(k+1)*size)-Math.max(a,lo+k*size));
      histogram[k] += c.volume * overlap / (b-a);
    }
  }
  const total = histogram.reduce((a,b)=>a+b,0);
  if (!total) return null;
  const pocIndex = histogram.indexOf(Math.max(...histogram));
  let left = pocIndex, right = pocIndex, included = histogram[pocIndex];
  while(included < total * valueArea && (left > 0 || right < bins - 1)) {
    const lv = left > 0 ? histogram[left-1] : -1, rv = right < bins-1 ? histogram[right+1] : -1;
    if (lv >= rv) { included += histogram[--left]; }
    else { included += histogram[++right]; }
  }
  return { estimated:true, bins:histogram.map((volume,i)=>({price:lo+(i+.5)*size,volume})), poc:lo+(pocIndex+.5)*size, val:lo+left*size, vah:lo+(right+1)*size, totalVolume: total };
}
export function rsiDivergences(candles, rsiValues, pivotSide = 3, maxBarsBetween = 60) {
  if (!candles || candles.length < 20) return [];
  const {lows, highs} = confirmedPivots(candles,pivotSide);
  const signals = [];
  for (const [indices,type] of [[lows,'bullish'],[highs,'bearish']]) {
    for (let j=1; j<indices.length; j++) {
      const a=indices[j-1], b=indices[j];
      if (b-a>maxBarsBetween || rsiValues[a]==null || rsiValues[b]==null) continue;
      const qualifies = type==='bullish'
        ? candles[b].low < candles[a].low && rsiValues[b] > rsiValues[a]
        : candles[b].high > candles[a].high && rsiValues[b] < rsiValues[a];
      if (qualifies) signals.push({type,from:a,to:b,date:candles[b].datetime,rsi:rsiValues[b],confirmedAt: candles[b+pivotSide]?.datetime||null});
    }
  }
  return signals.sort((a,b)=>a.to-b.to);
}
export function buildTechnical(candles) {
  if (!Array.isArray(candles) || candles.length < 15) return {valid:false, reason:'ต้องมีข้อมูลแท่งเทียนอย่างน้อย 15 แท่ง'};
  const rsiSeries=calculateRSI(candles);
  const divergences=rsiDivergences(candles,rsiSeries);
  const fib=fibonacci(candles);
  const profile=volumeProfile(candles.slice(-120));
  const last=candles.at(-1);
  const rsi=rsiSeries.at(-1);
  const recent=candles.slice(-20);
  const avg=recent.reduce((s,c)=>s+c.close,0)/recent.length;
  return {valid:true,close:last.close,date:last.datetime,rsi,rsiSeries,divergences,fib,profile,
    trend:last.close > avg*1.015 ? 'bullish' : last.close < avg*.985 ? 'bearish':'sideways',
    sma20:avg};
}
export function thaiRuleSummary(t, fundamental, news) {
  if (!t?.valid) return 'ยังไม่มีข้อมูลแท่งเทียนเพียงพอสำหรับสรุปแนวโน้ม';
  const trend={bullish:'แนวโน้มระยะสั้นเอนเอียงไปทางบวก',bearish:'แนวโน้มระยะสั้นเอนเอียงไปทางลบ',sideways:'แนวโน้มระยะสั้นยังแกว่งตัวในกรอบ'}[t.trend];
  const rsi=Number.isFinite(t.rsi)?` RSI(14) อยู่ที่ ${t.rsi.toFixed(1)}${t.rsi>70?' (เขตซื้อมากเกินไป)':t.rsi<30?' (เขตขายมากเกินไป)':''}`:'';
  const sig=t.divergences?.at(-1);
  const divergence=sig ? ` พบ ${sig.type==='bullish'?'Bullish':'Bearish'} Divergence ที่ยืนยันแล้วเมื่อ ${sig.date}.` : ' ยังไม่พบ RSI Divergence ที่ยืนยันแล้วในชุดข้อมูลที่เลือก.';
  const grow=fundamental?.revenueGrowthYoY;
  const fund=Number.isFinite(grow)?` รายได้ปีล่าสุดเปลี่ยนแปลง ${grow>=0?'+':''}${grow.toFixed(1)}% จากปีก่อน.`:' ยังไม่มีข้อมูลพื้นฐานเพียงพอสำหรับประเมินการเติบโต.';
  const headline=news?.length ? ` ข่าวที่ดึงได้ล่าสุดมี ${news.length} รายการ; กรุณาตรวจสอบรายละเอียดและแหล่งข่าวประกอบ.` : ' ยังไม่มีข้อมูลข่าวที่เชื่อมต่อได้.';
  return `${trend} จากราคาปิดเทียบค่าเฉลี่ย 20 แท่ง.${rsi}.${divergence}${fund}${headline} ข้อมูลนี้เป็นการสรุปตามกฎ ไม่ใช่การคาดการณ์ที่รับประกันผล.`;
}
