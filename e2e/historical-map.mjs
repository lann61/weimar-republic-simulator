import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
const base='http://127.0.0.1:5188';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--port','5188','--host','127.0.0.1','--strictPort'],{stdio:'ignore'});
let browser;
try{
  for(let i=0;i<100;i++){try{if((await fetch(base,{signal:AbortSignal.timeout(1000)})).ok)break;}catch{}await delay(100);}
  browser=await chromium.launch({channel:'msedge'});
  const page=await browser.newPage({viewport:{width:1480,height:1100}}),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(base);
  const save=await page.evaluate(async()=>{
    const {buildInitialState}=await import('/src/simulation/engine/state.ts');
    const state=buildInitialState('sc_1932',42);state.pendingEvent=null;
    return JSON.stringify({format:'weimar-save-v1',dataVersion:state.meta.dataVersion,state});
  });
  await page.locator('input[type=file]').setInputFiles({name:'map-test.json',mimeType:'application/json',buffer:Buffer.from(save)});
  await page.locator('.nav-item').filter({hasText:'历史地图'}).click();
  await page.locator('path[data-region="Berlin"]').waitFor();
  assert.equal(await page.locator('path[data-region]').count(),35);
  const stateBefore=await page.locator('.date-block').innerText();
  await page.getByLabel('历史选举地图年份').selectOption('1919-01-19');
  await page.waitForFunction(()=>document.querySelectorAll('path[data-region]').length===36);
  assert(await page.locator('path[data-region="Westpreußen"]').count());
  const earlyColor=await page.locator('path[data-region="Berlin"]').getAttribute('fill');
  await page.getByLabel('历史选举地图年份').selectOption('1932-11-06');
  await page.waitForFunction(()=>document.querySelectorAll('path[data-region]').length===35);
  const lateColor=await page.locator('path[data-region="Berlin"]').getAttribute('fill');
  assert.notEqual(earlyColor,lateColor);
  await page.locator('path[data-region="Berlin"]').click();
  assert.match(await page.locator('main').innerText(),/柏林/);
  assert.equal(await page.locator('path[data-region="Hessen-Darmstadt"]').count(),1);
  await page.screenshot({animations:'disabled',path:'shots/history-map-1932.png'});
  await page.getByRole('button',{name:'本局结果投影',exact:true}).click();
  assert.match(await page.locator('main').innerText(),/不是逐区真实开票数据/);
  assert.equal(await page.locator('.date-block').innerText(),stateBefore);
  await page.setViewportSize({width:390,height:950});
  assert(await page.locator('svg[aria-label$="真实历史选区地图"]').isVisible());
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  await page.screenshot({animations:'disabled',path:'shots/history-map-mobile.png'});
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({historicalBoundaries:true,earlyRegions:36,laterRegions:35,berlinColorsChange:true,hessenDarmstadt:true,simulationClearlyLabeled:true,dateAndGovernmentUnchanged:true,mobile:true,errors},null,2));
}finally{await browser?.close();server.kill();}
