import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
const base='http://127.0.0.1:5191';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--port','5191','--host','127.0.0.1','--strictPort'],{stdio:'ignore'});
let browser;
try {
  let ready=false;
  for(let i=0;i<50;i++){try{if((await fetch(base,{signal:AbortSignal.timeout(1000)})).ok){ready=true;break;}}catch{}await delay(100);}
  assert(ready,'Local test server must be ready');
  browser=await chromium.launch({channel:'msedge'});
  const page=await browser.newPage({viewport:{width:1480,height:1100}}),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(base);
  const result=await page.evaluate(async()=>{
    const {buildInitialState}=await import('/src/simulation/engine/state.ts');
    const {advanceMonth,resolvePending,openNextEvent}=await import('/src/simulation/engine/step.ts');
    const {RNG}=await import('/src/simulation/engine/random.ts');
    const {eventMap}=await import('/src/data/events/index.ts');
    const s=buildInitialState('sc_historical',42),rng=new RNG(42);
    openNextEvent(s,rng);
    for(let guard=0;guard<3000&&!s.meta.ended;guard++) {
      if(s.pendingEvent){const e=eventMap.get(s.pendingEvent.eventId);resolvePending(s,e.historical_choice_id??e.choices[0].id,rng);}
      else advanceMonth(s,rng);
    }
    return {save:JSON.stringify({format:'weimar-save-v1',dataVersion:s.meta.dataVersion,state:s}),ended:s.meta.ended,
      events:s.worldEvents.records.length,categories:[...new Set(s.worldEvents.records.map(r=>r.category))],date:s.date};
  });
  assert(result.ended);assert.equal(result.categories.length,5);assert(result.events>=60);
  await page.locator('input[type=file]').setInputFiles({name:'report-test.json',mimeType:'application/json',buffer:Buffer.from(result.save)});
  await page.getByRole('heading',{name:'结局报告',exact:true}).waitFor();
  for(const text of ['政治与社会总结','全局演变与社会代价','执政更迭与治理连续性','选举力量的重组','独立局势事件与累积影响']) {
    assert(await page.getByText(text,{exact:true}).isVisible());
  }
  assert.match(await page.locator('main').innerText(),/无法仅凭某次选择或一次突发事件解释全部变化/);
  await page.screenshot({path:'shots/report-political-social.png',animations:'disabled'});
  await page.getByText('独立局势事件与累积影响',{exact:true}).scrollIntoViewIfNeeded();
  await page.getByText('查看已生效的直接冲击累计',{exact:true}).click();
  const details=page.locator('details').filter({hasText:'查看已生效的直接冲击累计'});
  assert(await details.getAttribute('open')!==null);
  await page.screenshot({path:'shots/report-world-events.png',animations:'disabled'});
  await page.setViewportSize({width:390,height:950});
  await page.getByRole('heading',{name:'结局报告',exact:true}).scrollIntoViewIfNeeded();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  await page.screenshot({path:'shots/report-mobile.png',animations:'disabled'});
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({ended:result.ended,date:result.date,worldEvents:result.events,categories:result.categories,
    detailedReport:true,expandableEffects:true,mobile:true,errors},null,2));
}finally {await browser?.close();server.kill();}
