import { buildInitialState } from '../src/simulation/engine/state.ts';
import { eventMap } from '../src/data/events/index.ts';
import { exportSave } from '../src/persistence/db.ts';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';
const port=5186, base=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port)],{stdio:'ignore',shell:false});
let browser;
const dir=new URL('../shots/v2.2/',import.meta.url);fs.mkdirSync(dir,{recursive:true});
try {
  for(let n=0;n<100;n++){try{if((await fetch(base)).ok)break;}catch{}await delay(200);}
  try {browser=await chromium.launch();} catch(e){if(!String(e).includes('Executable doesn'))throw e;browser=await chromium.launch({channel:'msedge'});}
  const page=await browser.newPage({viewport:{width:1440,height:1000}}), errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto(base);
  await page.locator('.scenario').filter({hasText:'历史观察模式'}).click();
  await page.getByRole('button',{name:'开始历史进程',exact:true}).click();
  const offered=[];
  for(let n=0;n<650;n++) {
    if(await page.locator('.choice').count()) {
      offered.push(await page.locator('.event-title').innerText());
      await page.locator('.choice').first().click();
    } else {
      const step=page.getByRole('button',{name:'▶ 月',exact:true});
      if(!(await step.isEnabled()))break;
      await step.click();
    }
  }
  assert.equal(await page.locator('.page-title').innerText(),'结局报告');
  const report=await page.locator('main').innerText();
  assert.match(report,/独裁巩固/);assert.match(report,/1934年8月31日/);
  assert(offered.includes('《授权法》谈判与表决'));assert(offered.includes('各邦政府被接管'));
  await page.screenshot({animations:'disabled',path:fileURLToPath(new URL('01-final-report.png',dir))});
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'导出本局存档（JSON）',exact:true}).click();
  const download=await downloadPromise, saved=await download.path();
  const exported=fs.readFileSync(saved,'utf8');
  await page.getByRole('button',{name:'存档',exact:true}).click();
  await page.getByRole('button',{name:'返回开始界面',exact:true}).click();
  await page.locator('input[type=file]').setInputFiles({name:'roundtrip.json',mimeType:'application/json',buffer:Buffer.from(exported)});
  await page.locator('.page-title').waitFor();
  assert.match(await page.locator('main').innerText(),/独裁巩固/);
  await page.locator('.nav-item').filter({hasText:'经济与财政'}).click();
  await page.getByRole('button',{name:'政策工具箱',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'实施',exact:true}).count(),0);
  assert(await page.getByRole('button',{name:'已结束',exact:true}).count()>0);
  for(const width of [688,390]) {
    await page.setViewportSize({width,height:950});
    await page.locator('.nav-item').filter({hasText:'结局报告'}).click();
    assert(await page.locator('.page-title').isVisible());
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2));
    await page.screenshot({animations:'disabled',path:fileURLToPath(new URL(`02-report-${width}.png`,dir))});
  }
  await page.getByRole('button',{name:'返回开始界面',exact:true}).click();
  await page.locator('.scenario').filter({hasText:'历史干预模式'}).click();
  await page.getByRole('button',{name:'开始历史进程',exact:true}).click();
  await page.locator('.choice').first().click();
  await page.locator('.choice').filter({hasText:'保留君主作为象征元首'}).click();
  assert.match(await page.locator('.event-title').innerText(),/政府与军方/);
  await page.screenshot({animations:'disabled',path:fileURLToPath(new URL('03-monarchy-event-mobile.png',dir))});
  await page.goto(base);
  const fixture=buildInitialState('sc_1930',42);
  fixture.meta.mode='intervention';fixture.government.chancellorId='person_wels';fixture.government.name_zh='韦尔斯联合内阁';fixture.government.isHistorical=false;fixture.government.isSimulated=true;
  fixture.date=fixture.cursorDate='1930-03-30';fixture.flags.playerGovernment=1;
  fixture.pendingEvent={eventId:'ev_bruening_cabinet',choices:eventMap.get('ev_bruening_cabinet').choices.map(c=>c.id),openedAt:fixture.date};
  await page.locator('input[type=file]').setInputFiles({name:'wels-regression.json',mimeType:'application/json',buffer:Buffer.from(exportSave(fixture))});
  await page.locator('.event-card').waitFor();
  const welsCard=await page.locator('.event-card').innerText();
  assert(welsCard.includes('奥托·韦尔斯'));assert(!welsCard.includes('布吕宁'));
  await page.setViewportSize({width:1100,height:950});
  await page.screenshot({animations:'disabled',path:fileURLToPath(new URL('04-wels-cabinet.png',dir))});
  assert.equal(errors.length,0,errors.join('\n'));
  console.log(JSON.stringify({fullHistoricalFlow:true,offeredEvents:offered.length,enablingActOffered:true,laenderOffered:true,saveExportImport:true,endedPoliciesFrozen:true,responsiveWidths:[688,390],monarchyContext:true,errors},null,2));
}finally{await browser?.close();server.kill();}
