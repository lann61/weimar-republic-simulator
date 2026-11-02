/**
 * V2.1 Playwright 页面冒烟测试（任务书第 6 章）
 * 用法：npm run test:e2e
 * 不依赖 @playwright/test，直接使用 playwright 库；失败时退出码 1。
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

const PORT = 5185;
const BASE = `http://127.0.0.1:${PORT}`;
let server;

async function waitForServer(url, timeoutMs = 40000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await delay(300);
  }
  throw new Error('preview server did not start');
}

const pages = [
  { nav: '国家总览', title: '国家总览' },
  { nav: '政府与政党', title: '政府与政党' },
  { nav: '选举中心', title: '选举中心' },
  { nav: '政党与人物', title: '政党与人物' },
  { nav: '政府与议会', title: '政府与议会' },
  { nav: '经济与财政', title: '经济与财政' },
  { nav: '社会与秩序', title: '社会与秩序' },
  { nav: '外交与国际', title: '外交与国际' },
  { nav: '历史地图', title: '历史地图' },
  { nav: '事件档案', title: '事件档案' },
  { nav: '结局报告', title: '结局报告' },
];

try {
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--host', '127.0.0.1'], {
    stdio: 'ignore',
    shell: false,
  });
  await waitForServer(BASE);

  let browser;
  try { browser = await chromium.launch(); } catch (error) {
    if (!String(error).includes('Executable doesn')) throw error;
    browser = await chromium.launch({ channel: 'msedge' });
  }
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 200));
  });
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '开始历史进程' }).click();
  await page.waitForSelector('.event-card', { timeout: 10000 });

  // 处理开局事件（选择史实第一项），最多 12 次
  for (let i = 0; i < 12; i++) {
    if (!(await page.locator('.event-card').count())) break;
    await page.locator('.choice').first().click();
    await page.waitForTimeout(120);
  }

  const results = [];
  for (const p of pages) {
    await page.locator('.nav-item', { hasText: p.nav }).first().click();
    await page.waitForTimeout(250);
    const title = await page.locator('.page-title').first().innerText().catch(() => '');
    results.push({ page: p.nav, ok: title.includes(p.title), title });
  }

  // 存档入口存在性（不实际写 IndexedDB，避免污染测试环境）
  const saveButton = await page.getByRole('button', { name: /存档/ }).count();

  const summary = {
    pages: results,
    allPagesOk: results.every((r) => r.ok),
    saveButton,
    consoleErrors: errors,
  };
  console.log(JSON.stringify(summary, null, 2));

  await browser.close();
  if (!summary.allPagesOk || errors.length > 0 || saveButton === 0) process.exitCode = 1;
} finally {
  if (server) server.kill();
}
