import {buildTechnical,thaiRuleSummary} from './shared/indicators.js';

const $=id=>document.getElementById(id);
const state={api:(localStorage.getItem('googlApiUrl')||window.GOOGL_API_BASE||'').replace(/\/$/,''),interval:'1day',market:null,technical:null,fund:null,news:null,chart:null};
const usd=x=>Number.isFinite(x)?`$${x.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`:'—';
const money=x=>!Number.isFinite(x)?'—':(Math.abs(x)>=1e12?`${(x/1e12).toFixed(2)}T`:(Math.abs(x)>=1e9?`${(x/1e9).toFixed(2)}B`:(Math.abs(x)>=1e6?`${(x/1e6).toFixed(2)}M`:x.toLocaleString('en-US'))));
const pct=x=>Number.isFinite(x)?`${x>=0?'+':''}${x.toFixed(2)}%`:'—';
const signed=x=>Number.isFinite(x)?`${x>=0?'+':''}${usd(x)}`:'—';
const date=x=>x?new Date(x).toLocaleString('th-TH',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Bangkok'}):'—';
const errText=e=>e instanceof Error?e.message:String(e);
function status(id,msg,bad=false){ const el=$(id);el.textContent=msg;el.style.color=bad?'#cf334d':''; }
function link(tag,attrs={},text='') { const el=document.createElement(tag);for(const[k,v]of Object.entries(attrs))el.setAttribute(k,v);el.textContent=text;return el; }
function setMessage(container,text){ container.replaceChildren(link('p',{class:'placeholder'},text)); }
function chartSymbol(){return `NASDAQ:GOOGL`;}
function renderTradingView(){
  if(state.chart){state.chart.remove();state.chart=null;}
  const node=$('chart');node.replaceChildren();
  const box=document.createElement('div');box.className='tradingview-widget-container';
  const widget=document.createElement('div');widget.className='tradingview-widget-container__widget';box.append(widget);
  node.append(box);
  const script=document.createElement('script');script.type='text/javascript';script.async=true;script.src='https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
  script.textContent=JSON.stringify({autosize:true,symbol:chartSymbol(),interval:{'15min':'15','1h':'60','4h':'240','1day':'D','1week':'W'}[state.interval],timezone:'America/New_York',theme:'light',style:'1',locale:'th',allow_symbol_change:false,save_image:false,hide_side_toolbar:false,calendar:false,support_host:'https://www.tradingview.com'});
  script.onerror=()=>{node.replaceChildren();const fallback=link('div',{class:'chart-failure'},'ไม่สามารถโหลด TradingView Widget ได้ — เปิดกราฟภายนอกที่ลิงก์ด้านบน');node.append(fallback);status('chart-status','Widget ถูกบล็อก',true);};
  box.append(script);
  $('chart-subtitle').textContent='Official TradingView Advanced Chart · อาจมีข้อมูลหน่วงเวลา';
  $('chart-note').textContent='กราฟ TradingView และข้อมูลวิเคราะห์จาก Market Data API อาจมีเวลาหรือราคาต่างกัน โปรดตรวจสอบแหล่งข้อมูล';
  status('chart-status','TradingView embed · ตรวจสอบบนกราฟ');
}
function timeForChart(str){
  if(/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  // TradingView axis normalized to the exchange-local clock; exact UTC offset may vary with DST.
  return Math.floor(Date.parse(str.replace(' ','T')+'Z')/1000);
}
function renderCustomChart(){
  if(!state.market?.candles?.length || !window.LightweightCharts) return renderTradingView();
  if(state.chart){state.chart.remove();state.chart=null;}
  const root=$('chart');root.replaceChildren();
  const c=window.LightweightCharts.createChart(root,{width:root.clientWidth,height:root.clientHeight,layout:{background:{color:'#ffffff'},textColor:'#738298',fontFamily:'Inter, sans-serif'},grid:{vertLines:{color:'#f1f4f8'},horzLines:{color:'#f1f4f8'}},timeScale:{timeVisible:state.interval!=='1day'&&state.interval!=='1week',secondsVisible:false},rightPriceScale:{borderColor:'#e2e8f0',scaleMargins:{top:.05,bottom:.25}},crosshair:{mode:1}});
  state.chart=c;
  const bars=c.addCandlestickSeries({upColor:'#089981',downColor:'#f23645',borderUpColor:'#089981',borderDownColor:'#f23645',wickUpColor:'#089981',wickDownColor:'#f23645'});
  const volumes=c.addHistogramSeries({priceScaleId:'',priceFormat:{type:'volume'},color:'#94a3b8'});
  c.priceScale('').applyOptions({scaleMargins:{top:.80,bottom:0}});
  const candles=state.market.candles;
  bars.setData(candles.map(x=>({time:timeForChart(x.datetime),open:x.open,high:x.high,low:x.low,close:x.close})));
  volumes.setData(candles.map(x=>({time:timeForChart(x.datetime),value:x.volume,color:x.close>=x.open?'#b8e4db':'#f8c4c7'})));
  const t=state.technical;
  if(t?.fib) for(const level of t.fib.levels.filter(x=>[.382,.5,.618].includes(x.ratio))) {
    bars.createPriceLine({price:level.price,color:'#8bb9b2',lineWidth:1,lineStyle:2,axisLabelVisible:true,title:`Fib ${(level.ratio*100).toFixed(1)}%`});
  }
  if(t?.profile) bars.createPriceLine({price:t.profile.poc,color:'#0d9488',lineWidth:2,lineStyle:2,axisLabelVisible:true,title:'POC est.'});
  c.timeScale().fitContent();
  const ro=new ResizeObserver(()=>{if(state.chart===c) c.applyOptions({width:root.clientWidth,height:root.clientHeight});});
  ro.observe(root);
  const oldRemove=c.remove.bind(c);c.remove=()=>{ro.disconnect();oldRemove();};
  $('chart-subtitle').textContent=`Custom OHLCV Chart · Twelve Data · ${state.interval}`;
  $('chart-note').textContent='แสดง Fibonacci 38.2/50/61.8% และ Estimated POC จากชุดข้อมูล API; ไม่ใช่ข้อมูลหรือ Indicator ที่ดึงจาก TradingView';
  status('chart-status','Custom chart · OHLCV');
}
function renderChart(){ if($('custom-chart').checked&&state.market?.candles?.length)renderCustomChart();else renderTradingView(); }
function resetTechnical(){for(const id of ['price','change','volume','rsi','trend','support','resistance','poc','value-area'])$(id).textContent='—';$('fib-levels').textContent='รอ Market Data API';$('divergence-label').textContent='รอข้อมูล';$('indicator-date').textContent='—';$('rsi-plot').replaceChildren();$('vp-plot').replaceChildren(link('p',{class:'muted-note'},'รอข้อมูล OHLCV'));}
function renderTechnical(){
  const m=state.market,t=state.technical;
  if(!m||!t?.valid)return resetTechnical();
  const c=m.latest;
  $('price').textContent=usd(c.close);$('price-meta').textContent=`ปิดแท่ง ${c.datetime} (${state.interval})`;
  $('change').textContent=`${signed(m.change)} (${pct(m.changePercent)})`; $('change').className=m.change>=0?'positive':'negative';
  $('volume').textContent=money(c.volume);$('volume-meta').textContent=`Volume จากแท่ง ${state.interval}`;
  $('rsi').textContent=Number.isFinite(t.rsi)?t.rsi.toFixed(1):'—'; $('rsi-meta').textContent=t.rsi>70?'Overbought':t.rsi<30?'Oversold':'Neutral';
  const trendThai={bullish:'Bullish',bearish:'Bearish',sideways:'Sideways'}; $('trend').textContent=trendThai[t.trend];$('trend').className=t.trend==='bullish'?'positive':t.trend==='bearish'?'negative':'';
  $('support').textContent=usd(t.fib?.support);$('resistance').textContent=usd(t.fib?.resistance);$('poc').textContent=usd(t.profile?.poc);$('value-area').textContent=`${usd(t.profile?.vah)} / ${usd(t.profile?.val)}`;
  $('indicator-date').textContent=`${state.interval} · ${c.datetime}`;
  const fib=$('fib-levels');fib.replaceChildren();
  if(t.fib) for(const row of t.fib.levels)fib.append(link('span',{},`${(row.ratio*100).toFixed(1)}% · ${usd(row.price)}`));
  else fib.textContent='ไม่พบ Confirmed Swing High/Low เพียงพอ';
  const signal=t.divergences.at(-1);const el=$('divergence-label');el.className='pill '+(signal?.type==='bullish'?'positive':signal?.type==='bearish'?'negative':'muted');el.textContent=signal?`${signal.type==='bullish'?'Bullish':'Bearish'} · ${signal.date}`:'No Confirmed Divergence';
  $('rsi-note').textContent=signal?`ตรวจพบ Confirmed ${signal.type==='bullish'?'Bullish':'Bearish'} Divergence ในวันที่ ${signal.date} และยืนยันภายหลังแท่ง Pivot อีก 3 แท่ง`:'ไม่มี Regular RSI Divergence ที่ยืนยันแล้วในชุดข้อมูลที่เลือก';
  drawRsi(t.rsiSeries,t.divergences,c.datetime);
  drawProfile(t.profile);
  renderSummary();
  status('data-status',`${m.source} (${m.dataType})`);
  $('last-sync').textContent=`Market Data รับล่าสุด: ${date(m.receivedAt)} · แท่งสุดท้าย ${c.datetime} (เวลาตลาด)`;
  $('market-state').textContent='GOOGL · ตรวจสอบเวลาราคาล่าสุด';
}
function drawRsi(values,signals){
  const svg=$('rsi-plot');svg.replaceChildren();const NS='http://www.w3.org/2000/svg';
  const line=(x1,y1,x2,y2,stroke,opacity=1,width=1,dash='')=>{const el=document.createElementNS(NS,'line');for(const[k,v]of Object.entries({x1,y1,x2,y2,stroke,'stroke-opacity':opacity,'stroke-width':width,'stroke-dasharray':dash}))el.setAttribute(k,String(v));svg.append(el);};
  const N=values.length,w=800,h=115,py=v=>h-8-v*(h-16)/100,px=i=>8+i*(w-16)/Math.max(1,N-1);
  for(const level of [30,50,70])line(0,py(level),800,py(level),'#cbd5e1',.8,1,'5 4');
  const poly=document.createElementNS(NS,'polyline');const points=values.map((v,i)=>v==null?null:`${px(i)},${py(v)}`).filter(Boolean).join(' ');poly.setAttribute('points',points);poly.setAttribute('fill','none');poly.setAttribute('stroke','#0d9488');poly.setAttribute('stroke-width','2');poly.setAttribute('vector-effect','non-scaling-stroke');svg.append(poly);
  for(const sig of signals.slice(-5))line(px(sig.from),py(values[sig.from]),px(sig.to),py(values[sig.to]),sig.type==='bullish'?'#16a34a':'#dc2626',1,2);
}
function drawProfile(profile){
  const root=$('vp-plot');root.replaceChildren();if(!profile)return setMessage(root,'ยังไม่มี Volume Profile');
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 350 150');
  const bins=[...profile.bins].reverse(),max=Math.max(...bins.map(x=>x.volume));
  bins.forEach((x,i)=>{const rect=document.createElementNS('http://www.w3.org/2000/svg','rect');const width=225*x.volume/max;for(const [k,v]of Object.entries({x:88,y:i*(148/bins.length)+.5,width,height:Math.max(1,148/bins.length-1),rx:.5,fill:Math.abs(x.price-profile.poc)<(bins[0].price-bins[1].price)*.6?'#0d9488':'#a4d4ca'}))rect.setAttribute(k,String(v));svg.append(rect);});
  const label=document.createElementNS('http://www.w3.org/2000/svg','text');label.setAttribute('x','3');label.setAttribute('y','14');label.setAttribute('font-size','10');label.setAttribute('fill','#66788a');label.textContent=`VAH ${usd(profile.vah)}`;svg.append(label);
  const val=document.createElementNS('http://www.w3.org/2000/svg','text');val.setAttribute('x','3');val.setAttribute('y','145');val.setAttribute('font-size','10');val.setAttribute('fill','#66788a');val.textContent=`VAL ${usd(profile.val)}`;svg.append(val);root.append(svg);
}
function renderFundamentals(){
  const f=state.fund;if(!f)return;
  $('revenue-growth').textContent=pct(f.revenueGrowthYoY); $('operating-margin').textContent=pct(f.operatingMargin);$('net-margin').textContent=pct(f.netMargin);$('fcf').textContent=`$${money(f.latestAnnual?.freeCashFlow)}`;
  $('fund-timestamp').textContent=`FY ${f.latestAnnual?.fy||'—'} · Filed ${f.filingDate||'—'}`;
  const table=$('fund-table');table.replaceChildren();
  for(const item of [...f.annual].reverse()){
    const tr=document.createElement('tr');for(const v of [String(item.fy),`$${money(item.revenue)}`,`$${money(item.netIncome)}`,`$${money(item.operatingCashFlow)}`,`$${money(item.freeCashFlow)}`,Number.isFinite(item.epsDiluted)?usd(item.epsDiluted):'—'])tr.append(link('td',{},v));table.append(tr);
  }
  const b=f.latestBalanceSheet;
  $('balance-sheet').textContent=`งบดุลล่าสุด: Assets $${money(b?.assets)} (${b?.assetsAsOf||'—'}) · Liabilities $${money(b?.liabilities)} · Cash $${money(b?.cash)}`;
  status('fund-status',`SEC EDGAR · FY ${f.latestAnnual?.fy||'—'}`);renderSummary();
}
function renderNews(){
  const payload=state.news;if(!payload)return;
  const items=payload.items||[];$('news-count').textContent=`${items.length} ข่าว / 7 วัน`;
  const root=$('news-list');root.replaceChildren();
  if(!items.length) return setMessage(root,'ไม่มีรายการข่าวในช่วงที่เลือก');
  for(const n of items.slice(0,18)){
    const item=link('article',{class:'news-item'});
    const a=link('a',{href:n.url,target:'_blank',rel:'noopener noreferrer'},n.headline);item.append(a);
    const badge=link('span',{class:'pill '+(n.sentiment==='positive'?'positive':n.sentiment==='negative'?'negative':'muted')},n.sentiment||'neutral');item.append(badge);
    item.append(link('div',{class:'news-meta'},`${n.source} · ${date(n.publishedAt)}`));
    if(n.summary)item.append(link('p',{},n.summary.slice(0,200)));
    root.append(item);
  }
  status('news-status',`${items.length} รายการจาก Finnhub`);renderSummary();
}
function renderSummary(){
  $('analysis-mode').textContent='Rule-based';
  $('analysis-text').textContent=thaiRuleSummary(state.technical,state.fund,state.news?.items||[]);
  $('ai-status').textContent='Rule-based';
}
async function request(path,opts={}){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),16000);
  try{
    const resp=await fetch(`${state.api}${path}`,{...opts,signal:controller.signal});const data=await resp.json();
    if(!resp.ok)throw new Error(data.error||`HTTP ${resp.status}`);
    return data;
  }finally{clearTimeout(timer);}
}
async function fetchOne(path,onSuccess,onFailure){try{const data=await request(path);onSuccess(data);}catch(e){onFailure(errText(e));}}
let updateSeq=0;
async function load(){
  const seq=++updateSeq;
  if(!state.api){status('data-status','Not Connected');status('fund-status','Not Connected');status('news-status','Not Connected');$('analysis-text').textContent='เปิดกราฟ TradingView ได้ทันที ส่วน Indicators, ข่าว และงบการเงินต้องเชื่อม Cloudflare Worker ก่อน · กด “ตั้งค่า API” เพื่อใส่ URL ของ Backend';return;}
  $('refresh-btn').disabled=true;$('refresh-btn').textContent='กำลังโหลด...';
  const tasks=[
    fetchOne('/api/market?interval='+encodeURIComponent(state.interval),m=>{if(seq!==updateSeq)return;state.market=m;state.technical=buildTechnical(m.candles);renderTechnical();renderChart();},e=>{if(seq!==updateSeq)return;state.market=null;state.technical=null;resetTechnical();status('data-status',`ผิดพลาด: ${e}`,true);renderChart();}),
    fetchOne('/api/fundamentals',f=>{if(seq!==updateSeq)return;state.fund=f;renderFundamentals();},e=>{if(seq!==updateSeq)return;status('fund-status',`ผิดพลาด: ${e}`,true);}),
    fetchOne('/api/news',n=>{if(seq!==updateSeq)return;state.news=n;renderNews();},e=>{if(seq!==updateSeq)return;status('news-status',`ผิดพลาด: ${e}`,true);}),
    fetchOne('/api/health',h=>{if(seq!==updateSeq)return;status('ai-status',h.aiConfigured?'AI พร้อมใช้งาน (ยืนยันตัวตน)':'Rule-based');},()=>{})
  ];
  await Promise.allSettled(tasks);
  if(seq===updateSeq){$('refresh-btn').disabled=false;$('refresh-btn').textContent='↻ อัปเดต';}
}
async function runAI(){
  if(!state.api){alert('กรุณาตั้งค่า Cloudflare Worker URL ก่อน');return;}
  if(!state.technical?.valid){alert('ยังไม่มีข้อมูล OHLCV จริงเพียงพอสำหรับ AI Analysis');return;}
  const token=window.prompt('กรอก AI_ACCESS_TOKEN ที่เจ้าของเว็บตั้งไว้ใน Cloudflare (จะไม่บันทึกไว้ในเว็บ)');
  if(!token)return;
  $('ai-btn').disabled=true;$('ai-btn').textContent='กำลังวิเคราะห์...';
  try{
    const t=state.technical,f=state.fund;
    const context={date:t.date,close:t.close,interval:state.interval,trend:t.trend,rsi:t.rsi,support:t.fib?.support,resistance:t.fib?.resistance,poc:t.profile?.poc,vah:t.profile?.vah,val:t.profile?.val,divergence:t.divergences.at(-1)?.type||'none',revenueGrowthYoY:f?.revenueGrowthYoY,netMargin:f?.netMargin,latestAnnual:f?.latestAnnual,news:(state.news?.items||[]).slice(0,8)};
    const result=await request('/api/ai',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify(context)});
    $('analysis-text').textContent=result.analysis;$('analysis-mode').textContent=`AI · ${result.model}`;status('ai-status','AI · '+result.model);
  }catch(e){alert(`AI Analysis ไม่สำเร็จ: ${errText(e)}`);}finally{$('ai-btn').disabled=false;$('ai-btn').textContent='✦ ขอวิเคราะห์ด้วย AI';}
}
$('refresh-btn').addEventListener('click',load);
$('interval').addEventListener('change',e=>{state.interval=e.target.value;state.market=null;state.technical=null;resetTechnical();renderChart();load();});
$('custom-chart').addEventListener('change',renderChart);
$('settings-btn').addEventListener('click',()=>{$('api-url').value=state.api;$('config-dialog').showModal();});
$('config-form').addEventListener('submit',e=>{if(e.submitter?.value!=='save')return;const value=$('api-url').value.trim().replace(/\/$/,'');if(value && !/^https:\/\/[^\s]+$/.test(value)){e.preventDefault();alert('กรุณาใช้ URL ที่ขึ้นต้นด้วย https://');return;}state.api=value;localStorage.setItem('googlApiUrl',value);state.market=null;state.technical=null;state.fund=null;state.news=null;resetTechnical();setTimeout(load,100);});
$('clear-config').addEventListener('click',()=>{$('api-url').value='';});
$('ai-btn').addEventListener('click',runAI);
renderChart();load();setInterval(()=>{if(state.api&&!document.hidden)load();},5*60*1000);
