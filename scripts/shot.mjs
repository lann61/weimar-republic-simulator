import { chromium } from 'playwright';

const shots = [
  { name: 'start', action: async () => {} },
];
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto('http://localhost:5183/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.screenshot({ path: 'shots/01-start.png', fullPage: false });

// 选择干预模式并开始
await page.getByText('历史干预模式 · 1918年11月').click();
await page.getByText('开始历史进程').click();
await page.waitForTimeout(900);
await page.screenshot({ path: 'shots/02-overview.png', fullPage: false });

// 推进一个月
await page.getByText('▶ 月').click();
await page.waitForTimeout(700);
await page.screenshot({ path: 'shots/03-event.png', fullPage: false });

// 处理事件：点第一个选项
const choice = page.locator('.choice').first();
if (await choice.count()) { await choice.click(); await page.waitForTimeout(400); }
for (let i = 0; i < 6; i++) {
  const c = page.locator('.choice').first();
  if (await c.count()) { await c.click(); await page.waitForTimeout(200); } else break;
}
await page.waitForTimeout(400);

for (const [label, file] of [['政府与政党','04-government'], ['选举中心','05-elections'], ['政党与人物','06-parties'], ['经济与财政','07-economy'], ['社会与秩序','08-society'], ['历史地图','09-map'], ['事件档案','10-events']]) {
  await page.locator('.nav-item', { hasText: label }).first().click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `shots/${file}.png`, fullPage: false });
}

console.log('errors:', JSON.stringify(errors.slice(0, 12), null, 1));
await browser.close();
