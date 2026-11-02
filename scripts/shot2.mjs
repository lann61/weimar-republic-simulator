import { chromium } from 'playwright';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto('http://localhost:5183/', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await page.screenshot({ path: 'shots/11-start2.png' });

await page.getByText('自由模拟 · 1930年大联合政府破裂').click();
await page.getByText('开始历史进程').click();
await page.waitForTimeout(900);
await page.screenshot({ path: 'shots/12-overview-1930.png' });

// 处理当前事件
for (let i = 0; i < 8; i++) {
  const c = page.locator('.choice').first();
  if (await c.count()) { await c.click(); await page.waitForTimeout(250); } else break;
}

for (const [label, file] of [['政府与政党','13-gov-1930'], ['选举中心','14-elections-1930'], ['政党与人物','15-parties-1930'], ['经济与财政','16-economy-1930'], ['社会与秩序','17-society-1930'], ['外交与国际','18-diplomacy-1930'], ['历史地图','19-map-1930'], ['政府与议会','20-parliament-1930']]) {
  await page.locator('.nav-item', { hasText: label }).first().click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: `shots/${file}.png` });
}

// 推进若干月并看事件卡
await page.locator('.nav-item', { hasText: '国家总览' }).first().click();
for (let i = 0; i < 14; i++) {
  const c = page.locator('.choice').first();
  if (await c.count()) { await c.click(); await page.waitForTimeout(120); }
  else { await page.getByText('▶ 月').click(); await page.waitForTimeout(250); }
}
await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/21-after-months.png' });
const c2 = page.locator('.choice').first();
if (await c2.count()) await page.screenshot({ path: 'shots/22-event-card.png' });

console.log('errors:', JSON.stringify(errors.slice(0, 10), null, 1));
await browser.close();
