import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto('http://localhost:5183/', { waitUntil: 'networkidle' });
await page.getByText('自由模拟 · 1932年总统内阁与连续选举').click();
await page.getByText('开始历史进程').click();
await page.waitForTimeout(700);

// 推进直到出现事件卡
for (let i = 0; i < 8; i++) {
  if (await page.locator('.event-card').count()) break;
  await page.getByText('▶ 月').click();
  await page.waitForTimeout(400);
}
if (await page.locator('.event-card').count()) {
  await page.screenshot({ path: 'shots/30-event.png' });
  await page.locator('.choice').first().click();
  await page.waitForTimeout(300);
}

// 推进 30 个月
for (let i = 0; i < 40; i++) {
  const c = page.locator('.choice').first();
  if (await c.count()) { await c.click(); await page.waitForTimeout(90); }
  else { await page.getByText('▶ 月').click(); await page.waitForTimeout(140); }
}
await page.waitForTimeout(400);
await page.screenshot({ path: 'shots/31-overview-late.png' });

for (const [label, file] of [['社会与秩序','32-society'], ['外交与国际','33-diplomacy'], ['政府与议会','34-parliament'], ['结局报告','35-report'], ['政党与人物','36-parties-people']]) {
  await page.locator('.nav-item', { hasText: label }).first().click();
  await page.waitForTimeout(700);
  if (file === '36-parties-people') {
    await page.getByText('人物数据库', { exact: false }).click();
    await page.waitForTimeout(500);
    await page.locator('table.data tbody tr').first().click();
    await page.waitForTimeout(400);
  }
  await page.screenshot({ path: `shots/${file}.png` });
}
console.log('errors:', JSON.stringify(errors.slice(0, 8)));
await browser.close();
