# GOOGL AI Stock Intelligence — เว็บไซต์ GitHub Pages + Cloudflare Worker

โปรเจกต์นี้เป็น **ตัวอย่างที่สามารถติดตั้งและต่อยอดได้** สำหรับหุ้น **Alphabet Inc. Class A (`NASDAQ:GOOGL`)** โดยไม่มีราคาหุ้นหรือข่าวสมมติปะปนเป็นข้อมูลจริง

> **สถานะ:** สร้างไฟล์และทดสอบสูตร/โค้ดพื้นฐานในเครื่องแล้ว แต่ยัง **ไม่ได้ Deploy เข้าบัญชี GitHub หรือ Cloudflare ของคุณ และยังไม่ได้เชื่อม API Key จริง** ต้องทำตามขั้นตอนด้านล่างก่อนที่จะเห็นการ์ดข้อมูลสด กราฟ TradingView เป็น fallback โดยอาจแสดงราคาแบบหน่วงเวลา

## ส่วนประกอบของ Web App

- **กราฟแท่งเทียน:** TradingView Advanced Chart Widget เป็น fallback เริ่มต้น; ถ้าเชื่อม Twelve Data แล้ว เลือกใช้ Custom Chart ด้วย Lightweight Charts ได้
- **Technical:** RSI(14) ตาม Wilder, Confirmed Regular Bullish/Bearish Divergence, Fibonacci Retracement จาก Swing Pivot ยืนยันแล้ว และ **Estimated** Volume Profile (POC/VAH/VAL จากการกระจาย Volume ของแท่ง OHLCV)
- **Fundamental:** Revenue, Net Income, Operating Income, Operating Cash Flow, Free Cash Flow, EPS Diluted, Revenue Growth, Operating/Net Margin และยอดงบดุลล่าสุด จาก **SEC EDGAR companyfacts**
- **News:** Finnhub Company News ย้อนหลัง 7 วัน พร้อมต้นฉบับและ Sentiment แบบ keyword heuristic
- **วิเคราะห์ภาษาไทย:** Rule-based Summary โดยไม่ต้องใช้ OpenAI; กดขอวิเคราะห์ผ่าน OpenAI API ได้ **เฉพาะเมื่อเจ้าของเว็บตั้งค่าครบและกรอก AI access token เอง**
- **Diagnostics:** แต่ละ Data Source แสดงสถานะแยกกัน ไม่ปกปิดข้อผิดพลาดด้วย Mock Data

## โครงสร้างไฟล์

```text
googl-ai-stock-intelligence/
├── index.html            # หน้าเว็บที่ GitHub Pages เปิด
├── styles.css            # ธีม Clean Light
├── app.js                # Logic ส่วนหน้าเว็บ
├── shared/
│   └── indicators.js     # สูตร Technical Indicators (ใช้ข้อมูล OHLCV)
├── worker/
│   ├── src/index.js      # Cloudflare Worker Backend API
│   ├── src/fundamentals.js # แปลง SEC Company Facts
│   ├── wrangler.toml     # ตั้งค่า Worker
│   ├── package.json
│   └── .dev.vars.example
├── tests/indicators.test.mjs
├── config.example.js     # ตัวอย่าง URL Backend เท่านั้น (ไม่จำเป็นต้องใช้งาน)
├── .nojekyll
└── README.md
```

## ส่วนที่ 1 — เอาหน้าเว็บไซต์ขึ้น GitHub Pages

1. สมัคร/ล็อกอิน https://github.com แล้วสร้าง **Repository แบบ Public** ชื่อ `googl-ai-stock-intelligence`
2. แตกไฟล์ ZIP ที่ได้รับ
3. นำไฟล์และโฟลเดอร์ด้านใน `googl-ai-stock-intelligence/` ทั้งหมดขึ้น Repository **โดยรักษาโครงสร้างโฟลเดอร์** และให้ `index.html` อยู่ที่ root (สำหรับผู้เริ่มต้น แนะนำโปรแกรม GitHub Desktop ช่วยนำโฟลเดอร์ขึ้น GitHub หรือใช้ `git add .`, `git commit`, `git push`)
4. ไปที่ **Settings → Pages → Build and deployment → Source: Deploy from a branch** เลือก branch `main` และ folder `/(root)` → Save
5. URL เว็บจะมีรูปแบบ `https://YOUR-USERNAME.github.io/googl-ai-stock-intelligence/`
6. ทดสอบว่าหน้าเว็บเปิดได้ (กราฟ TradingView อาจโหลดได้โดยยังไม่ต้องตั้งค่า API ส่วนที่เหลือจะแสดง **Not Connected**)

คู่มือทางการ: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## ส่วนที่ 2 — สมัครแหล่งข้อมูล

| ชนิดข้อมูล | Provider | สิ่งที่ต้องทำ |
|---|---|---|
| ราคาและ OHLCV | https://twelvedata.com | สมัครและรับ `TWELVE_DATA_KEY`; ตรวจสอบว่าแพ็กเกจของคุณรองรับ GOOGL และ Timeframe ที่ใช้ |
| งบการเงิน | https://www.sec.gov/search-filings/edgar-application-programming-interfaces | ใช้ SEC EDGAR ฟรีตาม Fair Access Policy; ต้องระบุ `SEC_USER_AGENT` เป็นชื่อแอป + อีเมลที่ติดต่อได้จริง |
| ข่าว | https://finnhub.io | สมัครและรับ `FINNHUB_KEY`; ตรวจสอบสิทธิ์ Company News |
| AI (ไม่บังคับ) | https://platform.openai.com | ต้องมี `OPENAI_API_KEY` และเครดิต API (แยกจาก ChatGPT) พร้อมตั้ง `AI_ACCESS_TOKEN` |

**อย่าโพสต์ API Key ลง GitHub หรือแชร์ในแชต Canva Code/Prompt/public HTML.**

## ส่วนที่ 3 — Deploy Cloudflare Worker

ต้องมี Node.js เวอร์ชันปัจจุบันติดตั้งในเครื่องและบัญชี Cloudflare: https://dash.cloudflare.com

1. เปิดไฟล์ `worker/wrangler.toml` และแก้ `SITE_ORIGIN` เป็น origin ของ GitHub Pages คุณ เช่น `https://myusername.github.io` (**ไม่รวม** path ของ Repository)
2. เปลี่ยน `SEC_USER_AGENT` เป็นชื่อแอปและ **อีเมลจริงที่ติดต่อได้** เช่น `GOOGLResearch your-email@yourdomain.com` เพื่อใช้ตามข้อกำหนดของ SEC
3. เปิด Terminal ในโฟลเดอร์ `worker` แล้วรัน:

```bash
npm install
npx wrangler login
npm run deploy
```

4. ใส่ Secrets ลง Worker โดยรันคำสั่งนี้ในโฟลเดอร์ `worker` และกรอกค่าในช่องป้อนที่ Wrangler แสดง (ไม่ต้องแก้ไฟล์ JavaScript):

```bash
npx wrangler secret put TWELVE_DATA_KEY
npx wrangler secret put FINNHUB_KEY
```

5. ถ้าต้องการ AI Model ของจริง (เป็นตัวเลือกเพิ่มเติม):

```bash
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put AI_ACCESS_TOKEN
```

- กำหนด `AI_ACCESS_TOKEN` เป็นข้อความสุ่มยาวที่คุณเก็บไว้เอง และไม่ฝังในเว็บ GitHub Pages
- การเรียก AI เป็น **owner-only on-demand**; เจ้าของต้องกดปุ่มและกรอก Token ในหน้าเว็บเอง
- อย่าแจก Token ให้ผู้ใช้ทั่วไป และควรตั้ง Cloudflare Rate Limiting / Budget Limit เพื่อป้องกันค่าใช้จ่าย API สูงผิดคาด
- หากไม่ได้ตั้ง OpenAI Keys ก็ยังมี **Rule-Based Analysis ภาษาไทย** ใช้ได้ตามข้อมูลที่เชื่อมต่อ

6. Wrangler จะแสดง URL Worker เช่น `https://googl-ai-stock-api.MY-SUBDOMAIN.workers.dev`
7. ทดสอบเปิด `https://<worker-url>/api/health` ควรได้ JSON ของสถานะการตั้งค่า Backend

คู่มือ Worker: https://developers.cloudflare.com/workers/wrangler/commands/workers/

## ส่วนที่ 4 — เชื่อม Frontend กับ Backend

1. เปิด URL เว็บไซต์ GitHub Pages ของคุณ
2. กด **⚙ ตั้งค่า API** บน Header
3. วาง **URL ของ Worker** (อย่าวาง API Key) เช่น `https://googl-ai-stock-api.MY-SUBDOMAIN.workers.dev`
4. กด **บันทึก & เชื่อมต่อ**
5. ตรวจสอบแถบสถานะ Market Data / Fundamentals / News ด้านบนแยกกัน
6. เปลี่ยน Timeframe ในกราฟเพื่อเช็กว่า Backend รองรับ; ถ้าบาง timeframe ถูกปฏิเสธโดยแพ็กเกจ API ให้ใช้ 1D

URL Backend ถูกจำไว้เฉพาะใน Local Storage ของ Browser ที่คุณใช้งาน ดังนั้นผู้เข้าชมคนอื่นต้องใส่ URL เอง หากต้องการตั้งค่ากลางสำหรับทุกคน ให้เพิ่ม `<script src="./config.js"></script>` ก่อน `<script type="module" src="./app.js"></script>` ใน `index.html` จากนั้นคัดลอก `config.example.js` เป็น `config.js` และแก้ URL เป็น Worker จริง **ใส่ได้เฉพาะ public Backend URL; ห้ามใส่ Secret ในไฟล์**

## ส่วนที่ 5 — ทดสอบก่อนใช้งานจริง

ใน root ของโปรเจกต์รัน:

```bash
node tests/indicators.test.mjs
python3 -m http.server 8000
```

แล้วเปิด `http://localhost:8000/` (การทดสอบ Worker จริงให้ใช้ Cloudflare dev หรือ Worker URL ที่ Deploy แล้ว)

> SEC API **ไม่เปิด CORS ให้ Browser เข้าถึงตรงโดยทั่วไป** จึงต้องใช้ Worker เป็นตัวกลาง ข้อมูลราคาอาจเป็น Real-Time, Delayed หรือ End-of-Day ตามแผนที่สมัคร ไม่สามารถบังคับให้สดได้ด้วยการ Refresh ทุก 5 นาที

## รายละเอียดการวิเคราะห์และข้อจำกัด

- **Fibonacci:** ใช้จุด Swing Pivot ที่ยืนยันแล้วและคู่ Swing ล่าสุดที่คนละประเภทกัน, ระดับ 0/23.6/38.2/50/61.8/78.6/100
- **Volume Profile:** ประมาณการปริมาณซื้อขายที่ระดับราคาด้วยการกระจาย Volume อย่างสม่ำเสมอตาม Low–High ของแต่ละแท่ง; ค่า POC/VAH/VAL จึง **ไม่เหมือน Volume-at-Price จริงของ TradingView**
- **RSI Divergence:** ใช้ Confirmed Pivot Left/Right = 3, ไม่ถือว่าสัญญาณได้รับการยืนยันจนมีแท่งหลัง pivot อย่างน้อย 3 แท่ง และแสดงเพียง Regular Divergence
- **Trend:** ราคาเทียบค่าเฉลี่ยปิด 20 แท่ง (+/-1.5%) เป็นระบบง่ายสำหรับศึกษา ไม่ใช่โมเดลพยากรณ์
- **News Sentiment:** ประเมินแบบคำสำคัญจากภาษาอังกฤษแบบง่าย อาจตีความผิดและ **ไม่ถือเป็นหลักฐานว่าข่าวเป็นสาเหตุของราคา**
- **Fundamental:** ตารางผลประกอบการใช้ตัวเลข *Fiscal Year* (Annual 10-K) ส่วน Assets, Liabilities, Cash ใช้ค่างบดุลล่าสุดที่ยื่น 10-K/10-Q จึงอาจเป็นคนละวันที่รายงาน
- **AI:** สรุปด้วยโมเดล OpenAI เมื่อกดปุ่มจากเจ้าของที่มี Access Token เท่านั้น; ถ้าไม่มีจะใช้สรุปตามกฎ ไม่ใช้ข้อมูลที่ AI แต่งเอง
- **ราคาหุ้น:** การ์ด Last Price ใช้ Close ของแท่ง OHLCV ล่าสุด และ Change คือการเปลี่ยนแปลงจากแท่งก่อนหน้า **ไม่ใช่ราคาทิกเรียลไทม์หรือ %Change รายวันเสมอ**
- **Timezone:** API รับ `datetime` ในเวลา Exchange (America/New_York). กราฟแบบ 15m/1H/4H ใช้แกนเวลาที่คงเลขนาฬิกา Exchange จากข้อความเวลาของ API; การเปลี่ยน DST อาจทำให้การแสดง timestamp ภายในแกนคลาดเคลื่อนได้ ปรับด้วยไลบรารี timezone ก่อนใช้ในงานจริง
- **Publish:** GitHub Pages เป็น Hosting แบบ static; Backend ใช้ Cloudflare Workers ต่างหาก ผู้ใช้ต้องจัดการ API limits, caching, billing และสิทธิ์เผยแพร่ข้อมูล

## การแก้ปัญหา

| ปัญหา | คำแนะนำ |
|---|---|
| Dashboard ว่าง / Not Connected | ตรวจ URL Worker ที่ปุ่ม ⚙ และตรวจ `/api/health` |
| `Origin ไม่ได้รับอนุญาต` | ตั้ง `SITE_ORIGIN` ให้ตรง origin เช่น `https://USERNAME.github.io` แล้ว Deploy Worker ใหม่ |
| `TWELVE_DATA_KEY` | ใส่ Secret และตรวจเครดิตกับสิทธิ์ Timeframe ใน Twelve Data |
| `HTTP 429` | ลดคำขอหรือตรวจโควตา API; เปิด Cloudflare Cache / Rate Limiting |
| SEC EDGAR Error | ตั้ง `SEC_USER_AGENT` เป็นชื่อแอปและอีเมลจริง ตรวจนโยบาย Fair Access |
| TradingView ไม่ขึ้น | ตรวจ Script Blocker/CSP; ใช้ลิงก์ **เปิด TradingView** จากหน้าเว็บ |
| ข่าวว่าง | ตรวจ `FINNHUB_KEY` และสิทธิ์ Company News |
| ปุ่ม AI แจ้ง 401 | กรอก `AI_ACCESS_TOKEN` ถูกต้องและตรวจว่าใส่ OpenAI API Key แล้ว |

## เอกสารข้อมูลต้นฉบับ

- TradingView Widget: https://www.tradingview.com/widget-docs/widgets/charts/advanced-chart/
- Twelve Data: https://twelvedata.com/docs
- SEC EDGAR: https://www.sec.gov/search-filings/edgar-application-programming-interfaces
- Finnhub: https://finnhub.io/docs/api
- OpenAI Responses API: https://platform.openai.com/docs/api-reference/responses

**ข้อจำกัดความรับผิดชอบ:** โปรเจกต์ตัวอย่างนี้จัดทำเพื่อศึกษาเท่านั้น ไม่รับประกันความครบถ้วนของข้อมูลหรือความถูกต้องของสัญญาณ และไม่ใช่คำแนะนำลงทุนเฉพาะบุคคล
