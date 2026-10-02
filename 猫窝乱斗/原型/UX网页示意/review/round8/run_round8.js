const { chromium } = require('/Users/m4/project/rewords/memory-scrapbook-video/node_modules/playwright');
const path = require('path');
const fs = require('fs');
const out = path.resolve('猫窝乱斗/原型/UX网页示意/review/round8');
const base = 'http://127.0.0.1:8876/';
const report = {startedAt:new Date().toISOString(), checks:[], issues:[], consoleErrors:[], pageErrors:[], badResponses:[], screenshots:[]};
function check(name, pass, actual, expected) {
  report.checks.push({name, pass:!!pass, actual, expected});
  if (!pass) report.issues.push({severity:'P1', title:name, actual, expected});
}
function observe(page, tag) {
  page.on('console', msg => { if (msg.type()==='error') report.consoleErrors.push({page:tag,text:msg.text()}); });
  page.on('pageerror', err => report.pageErrors.push({page:tag,text:String(err)}));
  page.on('response', res => { if (res.status()>=400) report.badResponses.push({page:tag,status:res.status(),url:res.url()}); });
}
async function shot(page, name, selector) {
  const file = path.join(out, name);
  if (selector) await page.locator(selector).screenshot({path:file, animations:'disabled'});
  else await page.screenshot({path:file, fullPage:true, animations:'disabled'});
  report.screenshots.push(name);
}
async function coins(page) { return Number((await page.locator('#hub-coins').innerText()).trim()); }
async function closeHubDialog(page) { if (await page.locator('#hub-dialog').evaluate(d=>d.open)) await page.locator('#hub-dialog-close').click(); }
async function dragMouse(page, from, board, pX, pY, footprint) {
  const src = await page.locator(from).boundingBox();
  const dst = await page.locator(board).boundingBox();
  if (!src || !dst) throw new Error(`No geometry for ${from} or ${board}`);
  const border = 6 * dst.width / 330;
  const step = (dst.width - 2*border) / 4;
  const sx = src.x + src.width/2, sy = src.y + src.height/2;
  const tx = dst.x + border + (pX + footprint/2)*step;
  const ty = dst.y + border + (pY + .5)*step;
  await page.mouse.move(sx, sy);
  await page.mouse.down();
  await page.mouse.move(tx, ty, {steps:12});
  await page.mouse.up();
  await page.waitForTimeout(120);
}
(async()=>{
  const browser = await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const page = await browser.newPage({viewport:{width:1440,height:1050},deviceScaleFactor:1});
  observe(page,'desktop');
  await page.goto(base,{waitUntil:'networkidle'});
  await page.waitForTimeout(150);
  check('默认进入主界面',await page.locator('body').getAttribute('data-study')==='hub',await page.locator('body').getAttribute('data-study'),'hub');
  check('桌面主界面可见',await page.locator('.hub-device').isVisible(),await page.locator('.hub-device').isVisible(),true);
  await shot(page,'desktop-home.png');

  // Sign-in reward: closing the dialog must not pay; claiming it once must disable repeats.
  await page.locator('[data-action="signin"]').click();
  await shot(page,'desktop-signin-dialog.png','#hub-dialog');
  const beforeSign = await coins(page);
  await page.locator('#hub-dialog-close').click();
  check('签到弹窗关闭不发奖',await coins(page)===beforeSign,await coins(page),beforeSign);
  await page.locator('[data-action="signin"]').click();
  await page.getByRole('button',{name:/领取今日奖励/}).click();
  check('签到奖励 +30 且单次',await coins(page)===beforeSign+30,await coins(page),beforeSign+30);
  await page.locator('[data-action="signin"]').click();
  check('签到再次打开后领取禁用',await page.getByRole('button',{name:/今日已领取/}).isDisabled(),await page.getByRole('button',{name:/今日已领取/}).isDisabled(),true);
  await closeHubDialog(page);

  // Supply reward: closing is free, completed simulation pays only once, currency header is also actionable.
  await page.locator('.hub-side [data-action="supply"]').click();
  await shot(page,'desktop-supply-dialog.png','#hub-dialog');
  const beforeSupply = await coins(page);
  await page.locator('#hub-dialog-close').click();
  check('补给弹窗关闭不发奖',await coins(page)===beforeSupply,await coins(page),beforeSupply);
  await page.locator('.hub-currency').click();
  await page.getByRole('button',{name:/模拟看完视频/}).click();
  check('补给奖励 +40 且单次',await coins(page)===beforeSupply+40,await coins(page),beforeSupply+40);
  await page.locator('.hub-side [data-action="supply"]').click();
  check('补给再次打开后领取禁用',await page.getByRole('button',{name:/本轮已领取/}).isDisabled(),await page.getByRole('button',{name:/本轮已领取/}).isDisabled(),true);
  await closeHubDialog(page);

  // Cat cultivation spends 40 and eventually disables when fewer than 40 remain.
  await page.locator('.hub-cat-scene').click();
  await shot(page,'desktop-cat-dialog.png','#hub-dialog');
  const coinsBeforeCultivation=await coins(page);
  for(let i=0;i<4;i++) await page.locator('#hub-dialog .hub-modal-actions button').click();
  const levelText = await page.locator('#hub-dialog .hub-level').innerText();
  check('培育每次消费 40 并提升等级',await coins(page)===coinsBeforeCultivation-160 && levelText.includes('Lv.5'),{coins:await coins(page),level:levelText},{coins:coinsBeforeCultivation-160,level:'Lv.5'});
  check('余额不足时培养禁用',await page.locator('#hub-dialog .hub-modal-actions button').isDisabled(),await page.locator('#hub-dialog .hub-modal-actions button').isDisabled(),true);
  await shot(page,'desktop-cultivation-insufficient.png','#hub-dialog');
  await page.locator('#hub-dialog-close').click();
  const catFocus=await page.evaluate(()=>({tag:document.activeElement?.tagName,action:document.activeElement?.getAttribute('data-action'),page:document.activeElement?.getAttribute('data-page')}));
  check('连续培养后关闭弹窗焦点回到可用猫入口',catFocus.action==='cat',catFocus,'data-action=cat');

  // Bottom navigation, cat collection, locked cat, and item index.
  await page.locator('[data-page="cats"]').click();
  check('猫咪导航显示图鉴页',await page.locator('.hub-collection h2').innerText().then(t=>t.includes('我的猫咪')),await page.locator('.hub-collection h2').innerText(),'我的猫咪');
  await shot(page,'desktop-cats.png','.hub-device');
  await page.locator('[data-action="lockedcat"]').click();
  await shot(page,'desktop-locked-cat-dialog.png','#hub-dialog');
  await closeHubDialog(page);
  await page.locator('[data-page="items"]').click();
  check('用品图鉴显示三项',await page.locator('.hub-item-card').count()===3,await page.locator('.hub-item-card').count(),3);
  await shot(page,'desktop-index.png','.hub-device');
  await page.locator('[data-item="0"]').click();
  await shot(page,'desktop-index-item-dialog.png','#hub-dialog');
  await closeHubDialog(page);
  await page.locator('[data-page="home"]').click();

  // Tasks before first clear must route to the tower, without paying.
  await page.locator('[data-action="tasks"]').click();
  const preTaskCoins=await coins(page);
  check('任务未完成时不可领取奖励',await page.getByRole('button',{name:/先去挑战第 1 层/}).isEnabled(),await page.getByRole('button',{name:/先去挑战第 1 层/}).isEnabled(),true);
  await shot(page,'desktop-task-locked.png','#hub-dialog');
  await page.locator('#hub-dialog .hub-modal-actions button').click();
  check('任务入口跳转到爬楼且不发奖',await page.locator('.hub-tower').isVisible() && await coins(page)===preTaskCoins,{tower:await page.locator('.hub-tower').isVisible(),coins:await coins(page)},{tower:true,coins:preTaskCoins});

  // Tower scroll and lock behavior.
  const floorList=page.locator('.hub-floors');
  const floorMetrics=await floorList.evaluate(e=>({scrollHeight:e.scrollHeight,clientHeight:e.clientHeight,initialScrollTop:e.scrollTop,overflow:e.scrollHeight>e.clientHeight}));
  check('楼层列表可上下滚动',floorMetrics.overflow,floorMetrics,'scrollHeight > clientHeight');
  await shot(page,'desktop-tower-initial.png','.hub-device');
  await floorList.evaluate(e=>e.scrollTop=0);
  await shot(page,'desktop-tower-top.png','.hub-device');
  await floorList.evaluate(e=>e.scrollTop=e.scrollHeight);
  await page.waitForTimeout(80);
  const maxScrolled=await floorList.evaluate(e=>({scrollTop:e.scrollTop,max:e.scrollHeight-e.clientHeight}));
  check('楼层列表可滚到顶部和底部',maxScrolled.scrollTop>0,maxScrolled,'scrollTop advances');
  await shot(page,'desktop-tower-bottom.png','.hub-device');
  await page.locator('[data-floor="6"]').click();
  const floor6Challenge=page.locator('.hub-floor-detail [data-action="challenge"]');
  check('锁定层可查看但不能挑战',await floor6Challenge.isDisabled() && (await floor6Challenge.innerText()).includes('后续战斗待接入'),{disabled:await floor6Challenge.isDisabled(),label:await floor6Challenge.innerText()},{disabled:true,label:'后续战斗待接入'});
  await shot(page,'desktop-tower-floor6.png','.hub-device');
  await page.locator('[data-action="milestone"]').click();
  await shot(page,'desktop-chapter-dialog.png','#hub-dialog');
  await closeHubDialog(page);
  await page.locator('[data-floor="2"]').click();
  check('第 2 层锁定且详情可切换',await floorList.locator('[data-floor="2"]').getAttribute('aria-pressed')==='true' && await page.locator('.hub-floor-detail [data-action="challenge"]').isDisabled(),{selected:await floorList.locator('[data-floor="2"]').getAttribute('aria-pressed'),challengeDisabled:await page.locator('.hub-floor-detail [data-action="challenge"]').isDisabled()},{selected:'true',challengeDisabled:true});
  await page.locator('[data-floor="1"]').click();
  await shot(page,'desktop-tower-floor1.png','.hub-device');
  check('第一层可挑战',await page.locator('.hub-floor-detail [data-action="challenge"]').isEnabled(),await page.locator('.hub-floor-detail [data-action="challenge"]').isEnabled(),true);

  // First-floor handoff into the existing preparation screen and real pointer drags.
  await page.locator('.hub-floor-detail [data-action="challenge"]').click();
  check('第一层跳转到已有准备界面且猫未预放',await page.locator('body').getAttribute('data-study')==='combat' && await page.locator('#stored-cat').isVisible() && await page.locator('#cat').isHidden(),{study:await page.locator('body').getAttribute('data-study'),stored:await page.locator('#stored-cat').isVisible(),placed:await page.locator('#cat').isVisible()},{study:'combat',stored:true,placed:false});
  await shot(page,'desktop-prep-empty.png','#prep-screen');
  await dragMouse(page,'#stored-cat','#board',0,0,3);
  const catPlaced=await page.locator('#cat').isVisible() && await page.locator('#stored-cat').isHidden();
  check('真实鼠标拖放面条入窝',catPlaced,{placed:await page.locator('#cat').isVisible(),stored:await page.locator('#stored-cat').isVisible()},{placed:true,stored:false});
  await page.locator('#buy').click();
  check('原准备页购买玩具只扣局内金币',await page.locator('#coins').innerText()==='7' && await page.locator('#stored').isVisible(),{gold:await page.locator('#coins').innerText(),stored:await page.locator('#stored').isVisible()},{gold:'7',stored:true});
  await dragMouse(page,'#stored','#board',0,1,2);
  const link=await page.locator('#link').isVisible();
  check('真实鼠标拖放玩具并触发邻接',await page.locator('#placed').isVisible() && link,{placed:await page.locator('#placed').isVisible(),linked:link},{placed:true,linked:true});
  await shot(page,'desktop-prep-placed.png','#prep-screen');
  await page.locator('#start').click();
  const phaseAfterStart=await page.locator('#battle-screen').getAttribute('data-phase');
  check('开战后进入自动战斗',phaseAfterStart==='battle',phaseAfterStart,'battle');
  await page.waitForTimeout(350);
  const timerBeforeSpeed=Number((await page.locator('#timer').innerText()).replace(/[^0-9.]/g,''));
  await page.locator('#speed').click();
  check('战斗可切到 2 倍速',await page.locator('#speed').innerText()==='×2' && await page.locator('#speed').getAttribute('aria-pressed')==='true',{text:await page.locator('#speed').innerText(),pressed:await page.locator('#speed').getAttribute('aria-pressed')},{text:'×2',pressed:'true'});
  await page.waitForTimeout(800);
  const timerAfterSpeed=Number((await page.locator('#timer').innerText()).replace(/[^0-9.]/g,''));
  check('2 倍速下战斗时钟推进约双倍',timerBeforeSpeed-timerAfterSpeed>=1.1,{before:timerBeforeSpeed,after:timerAfterSpeed,delta:timerBeforeSpeed-timerAfterSpeed},'delta >= 1.1s / 800ms real time');
  await shot(page,'desktop-battle-speed2.png','#battle-screen');
  const victoryDeadline=Date.now()+20000;
  while(Date.now()<victoryDeadline && !(await page.locator('#result').isVisible())) await page.waitForTimeout(200);
  const victory=await page.locator('#result').isVisible();
  check('第一层战斗实际到达胜利结算',victory,victory,true);
  if(victory) {
    await page.waitForTimeout(700);
    await shot(page,'desktop-victory.png','#battle-screen');
    check('结算时倍速入口禁用',await page.locator('#speed').isDisabled(),await page.locator('#speed').isDisabled(),true);
    await page.locator('#result button').click();
    check('首通返回楼层并发放 30 培养币',await page.locator('body').getAttribute('data-study')==='hub' && await coins(page)===preTaskCoins+30 && await page.locator('.hub-floor.selected').getAttribute('data-floor')==='2',{study:await page.locator('body').getAttribute('data-study'),coins:await coins(page),selected:await page.locator('.hub-floor.selected').getAttribute('data-floor')},{study:'hub',coins:preTaskCoins+30,selected:'2'});
    const firstClearCoins=await coins(page);
    await page.locator('[data-study-link="combat"]').click();
    await page.locator('#result button').click();
    check('重复点击首通返回不重复发奖',await coins(page)===firstClearCoins,await coins(page),firstClearCoins);
  }

  // Quest can be claimed after clear and cannot be claimed again.
  await page.locator('[data-page="home"]').click();
  await page.locator('[data-action="tasks"]').click();
  const beforeQuest=await coins(page);
  await page.getByRole('button',{name:/领取 · 50 培养币/}).click();
  check('首通任务奖励 +50',await coins(page)===beforeQuest+50,await coins(page),beforeQuest+50);
  await page.locator('[data-action="tasks"]').click();
  check('任务奖励再次打开后领取禁用',await page.getByRole('button',{name:/奖励已领取/}).isDisabled(),await page.getByRole('button',{name:/奖励已领取/}).isDisabled(),true);
  check('任务奖励无法重复增加余额',await coins(page)===beforeQuest+50,await coins(page),beforeQuest+50);
  await closeHubDialog(page);
  await shot(page,'desktop-task-claimed.png','.hub-device');

  // Narrow view screenshots and responsive geometry for real 390/360 viewport widths.
  const mobile=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  observe(mobile,'mobile390');
  await mobile.goto(base,{waitUntil:'networkidle'});
  await mobile.waitForTimeout(120);
  const m390=await mobile.evaluate(()=>({innerWidth,scrollWidth:document.documentElement.scrollWidth,device:document.querySelector('.hub-device').getBoundingClientRect().toJSON(),screen:document.querySelector('.hub-screen').getBoundingClientRect().toJSON(),nav:[...document.querySelectorAll('.hub-bottom button')].map(e=>({text:e.innerText,rect:e.getBoundingClientRect().toJSON()}))}));
  check('390 宽屏幕没有横向溢出',m390.scrollWidth<=m390.innerWidth,m390,'scrollWidth <= innerWidth');
  await shot(mobile,'390-home.png','.hub-device');
  await mobile.locator('.hub-bottom [data-page="tower"]').click();
  await shot(mobile,'390-tower.png','.hub-device');
  await mobile.locator('[data-floor="6"]').click();
  await shot(mobile,'390-tower-locked.png','.hub-device');
  await mobile.locator('.hub-bottom [data-page="home"]').click();
  await mobile.locator('[data-action="signin"]').click();
  const modal390=await mobile.locator('#hub-dialog').evaluate(d=>({rect:d.getBoundingClientRect().toJSON(),scrollHeight:d.scrollHeight,clientHeight:d.clientHeight,open:d.open}));
  check('390 宽签到弹窗位于可视区',modal390.open && modal390.rect.left>=0 && modal390.rect.right<=390 && modal390.rect.top>=0 && modal390.rect.bottom<=844,modal390,'dialog fully inside viewport');
  await shot(mobile,'390-signin-dialog.png','#hub-dialog');
  await mobile.locator('#hub-dialog-close').click();
  await mobile.locator('.hub-cat-scene').click();
  await shot(mobile,'390-cat-dialog.png','#hub-dialog');
  await closeHubDialog(mobile);
  await mobile.setViewportSize({width:360,height:800});
  await mobile.waitForTimeout(100);
  const m360=await mobile.evaluate(()=>({innerWidth,scrollWidth:document.documentElement.scrollWidth,device:document.querySelector('.hub-device').getBoundingClientRect().toJSON(),screen:document.querySelector('.hub-screen').getBoundingClientRect().toJSON()}));
  check('360 宽屏幕没有横向溢出',m360.scrollWidth<=m360.innerWidth,m360,'scrollWidth <= innerWidth');
  await shot(mobile,'360-home.png','.hub-device');
  await mobile.locator('.hub-bottom [data-page="tower"]').click();
  await shot(mobile,'360-tower.png','.hub-device');
  await mobile.locator('[data-floor="6"]').click();
  await shot(mobile,'360-tower-locked.png','.hub-device');
  await mobile.locator('.hub-bottom [data-page="home"]').click();
  await mobile.locator('.hub-side [data-action="supply"]').click();
  await shot(mobile,'360-supply-dialog.png','#hub-dialog');

  // Direct old-group regression from a clean reload: empty prep, purchase/drag, then battle.
  await page.goto(base,{waitUntil:'networkidle'});
  await page.locator('[data-study-link="combat"]').click();
  await page.waitForTimeout(100);
  check('旧准备与战斗分组仍可进入',await page.locator('body').getAttribute('data-study')==='combat' && await page.locator('#prep-screen').isVisible(),{study:await page.locator('body').getAttribute('data-study'),prep:await page.locator('#prep-screen').isVisible()},{study:'combat',prep:true});
  check('旧准备页空窝时禁止开战',await page.locator('#start').isDisabled(),await page.locator('#start').isDisabled(),true);
  await page.locator('#buy').click();
  await dragMouse(page,'#stored-cat','#board',0,0,3);
  await dragMouse(page,'#stored','#board',0,1,2);
  const legacyCat=await page.locator('#cat').isVisible();
  check('旧准备页购买后仍可拖放猫咪',legacyCat,legacyCat,true);
  check('旧准备页购买后仍可拖放用品并触发联动',await page.locator('#placed').isVisible() && await page.locator('#link').isVisible(),{placed:await page.locator('#placed').isVisible(),linked:await page.locator('#link').isVisible()},{placed:true,linked:true});
  await page.locator('#start').click();
  check('旧准备页开战进入旧战斗',await page.locator('#battle-screen').getAttribute('data-phase')==='battle',await page.locator('#battle-screen').getAttribute('data-phase'),'battle');
  await page.locator('#speed').click();
  check('旧战斗倍速入口正常',await page.locator('#speed').innerText()==='×2',await page.locator('#speed').innerText(),'×2');
  const oldDeadline=Date.now()+20000;
  while(Date.now()<oldDeadline && !(await page.locator('#result').isVisible())) await page.waitForTimeout(250);
  const oldVictory=await page.locator('#result').isVisible();
  check('旧准备页阵容战斗可到结算',oldVictory,oldVictory,true);
  if(oldVictory) await shot(page,'desktop-old-group-victory.png','#battle-screen');

  report.runtime={desktopViewport:{width:1440,height:1050},mobile390:m390,mobile360:m360,floorMetrics,timerBeforeSpeed,timerAfterSpeed,oldVictory};
  report.finishedAt=new Date().toISOString();
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
  const md=[];
  md.push('# Round 8 浏览器验证报告','',`执行时间：${report.startedAt} 至 ${report.finishedAt}`,`地址：${base}`,'环境：Playwright Chromium；桌面 1440×1050、窄屏 390×844 与 360×800；鼠标 Pointer Events 实际拖放。','');
  md.push('## 结论','');
  const failed=report.checks.filter(c=>!c.pass);
  md.push(failed.length?`发现 ${failed.length} 项未通过检查，需看下表。`:'本轮自动交互检查全部通过；视觉结论以截图人工复核为准。','');
  md.push('## 检查项','','| 结果 | 检查 | 实际 | 期望 |','|---|---|---|---|');
  for(const c of report.checks) md.push(`| ${c.pass?'通过':'未通过'} | ${c.name} | ${JSON.stringify(c.actual)} | ${JSON.stringify(c.expected)} |`);
  md.push('','## 浏览器诊断','','- Console errors: '+JSON.stringify(report.consoleErrors),'- Page errors: '+JSON.stringify(report.pageErrors),'- HTTP 4xx/5xx: '+JSON.stringify(report.badResponses),'','## 截图','');
  for(const name of report.screenshots) md.push(`- [${name}](${name})`);
  md.push('','## 风险与边界','','本验证针对本地网页示意，不代表 Unity、真实手机或完整正式战斗系统验证。');
  fs.writeFileSync(path.join(out,'QA-report.md'),md.join('\n')+'\n');
  console.log(JSON.stringify({checks:report.checks.length,failed:failed.length,issues:report.issues,consoleErrors:report.consoleErrors,pageErrors:report.pageErrors,badResponses:report.badResponses,screenshots:report.screenshots,report:path.join(out,'QA-report.md')},null,2));
  await browser.close();
})().catch(err=>{ console.error(err); process.exit(1); });
