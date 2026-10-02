const { chromium } = require('/Users/m4/project/rewords/memory-scrapbook-video/node_modules/playwright');
const fs = require('node:fs/promises');

const root = '/Users/m4/project/rewords/猫窝乱斗/原型/UX网页示意';
const out = `${root}/review/round6`;
const url = 'http://127.0.0.1:8876/';
const result = { revision: 'v9.2', checks: [], screenshots: [], errors: [] };
const check = (name, pass, detail = '') => {
  result.checks.push({ name, pass: !!pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};
const screenshot = async (locator, name) => {
  const path = `${out}/${name}`;
  await locator.screenshot({ path });
  result.screenshots.push(path);
  console.log(`SCREENSHOT ${path}`);
};
const pureFrame = async (page, locator, name) => {
  const box = await locator.boundingBox();
  const path = `${out}/${name}`;
  await page.screenshot({ path, clip: { x: box.x, y: box.y, width: 390, height: 693 } });
  result.screenshots.push(path);
  console.log(`SCREENSHOT ${path} (390×693 clip)`);
};
const text = async (page, selector) => (await page.locator(selector).innerText()).trim();
const visible = async (page, selector) => page.locator(selector).isVisible();

async function openPage(browser, width, height) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.on('pageerror', error => result.errors.push(error.message));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  return { context, page };
}

async function dragFromStorage(page, selector, kind, x, y) {
  const source = await page.locator(selector).boundingBox();
  const board = await page.locator('#board').boundingBox();
  const scale = board.width / 330;
  const border = 6 * scale;
  const step = (board.width - 12 * scale) / 4;
  const grabX = kind === 'cat' ? 1.5 : 1;
  const toX = board.x + border + (x + grabX) * step;
  const toY = board.y + border + (y + 0.5) * step;
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(toX, toY, { steps: 14 });
  await page.mouse.up();
}

async function prepareLinked(page) {
  await page.locator('#buy').click();
  check('buy toy deducts 3 gold', (await text(page, '#coins')) === '7', `coins=${await text(page, '#coins')}`);
  check('both cat and toy remain visible in storage after purchase',
    await visible(page, '#stored-cat') && await visible(page, '#stored'),
    `cat=${await visible(page, '#stored-cat')}, toy=${await visible(page, '#stored')}`);
  await dragFromStorage(page, '#stored-cat', 'cat', 0, 1);
  check('mouse drag places cat in nest', await visible(page, '#cat') && !(await visible(page, '#stored-cat')),
    `cat position=${await page.locator('#cat').getAttribute('style')}`);
  await dragFromStorage(page, '#stored', 'feather', 0, 2);
  check('toy placed on adjacent row and link indicator appears',
    await visible(page, '#placed') && await visible(page, '#link'),
    await text(page, '#hint'));
}

async function main() {
  await fs.mkdir(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  try {
    const { context: desktopContext, page: desktop } = await openPage(browser, 1280, 2300);
    const cBox = await desktop.locator('#option-c .option-frame').boundingBox();
    const prepBox = await desktop.locator('#prep-screen').boundingBox();
    await pureFrame(desktop, desktop.locator('#option-c .option-frame'), 'c-text-frame.png');
    await pureFrame(desktop, desktop.locator('#prep-screen'), 'prep-text-frame.png');
    check('desktop C sample is 390×693 frame', Math.round(cBox.width) === 390 && Math.round(cBox.height) === 693, JSON.stringify(cBox));
    check('desktop prep is 390×693 frame', Math.round(prepBox.width) === 390 && Math.round(prepBox.height) === 693, JSON.stringify(prepBox));
    await desktopContext.close();

    const { context: context390, page: page390 } = await openPage(browser, 390, 844);
    await screenshot(page390.locator('#prep-screen'), 'prep-shop-390.png');
    const shopMetrics = await page390.evaluate(() => {
      const selectors = ['.game-header', '.shop', '#buy', '.gold', '.board-heading', '.hint', '#storage', '#stored-cat'];
      return Object.fromEntries(selectors.map(selector => {
        const el = document.querySelector(selector), r = el.getBoundingClientRect();
        return [selector, { x: +r.x.toFixed(1), y: +r.y.toFixed(1), width: +r.width.toFixed(1), height: +r.height.toFixed(1), text: el.innerText?.trim() ?? '' }];
      }));
    });
    result.metrics390Prep = shopMetrics;
    check('390 prep shop, price, coins, and purchase control visible', await visible(page390, '#buy') && (await text(page390, '#coins')) === '10', 'pre-purchase shop view captured');
    await prepareLinked(page390);
    await screenshot(page390.locator('#prep-screen'), 'prep-linked-390.png');
    await page390.locator('#start').click();
    await page390.waitForTimeout(1550);
    const battle390 = await page390.evaluate(() => {
      const root = document.querySelector('#battle-screen');
      const rect = selector => root.querySelector(selector).getBoundingClientRect().toJSON();
      return {
      timer: root.querySelector('#timer').innerText.trim(),
      intent: root.querySelector('#intent-time').innerText.trim(),
      unitVisible: !root.querySelector('#intent-unit').hidden,
      attack: root.querySelector('.boss-intent .intent-copy strong').innerText.trim(),
      boss: rect('.boss-status'), intentRect: rect('.boss-intent'), bossArt: rect('.boss-art'),
      nest: rect('.cat-floor'), catName: rect('#cat-name'), team: rect('.team-status'),
      screen: root.getBoundingClientRect().toJSON(),
      scale: getComputedStyle(root).transform
      };
    }));
    result.metrics390Battle = battle390;
    check('390 battle countdown has seconds suffix and attack label', battle390.unitVisible && battle390.attack === '普通攻击' && /秒/.test(battle390.timer) && /秒后/.test(await text(page390, '#intent-unit')), JSON.stringify({ timer: battle390.timer, intent: battle390.intent, unitVisible: battle390.unitVisible, attack: battle390.attack }));
    await screenshot(page390.locator('#battle-screen'), 'battle-active-390.png');
    await page390.locator('#pause').click();
    const pausedStart = { timer: await text(page390, '#timer'), enemy: await text(page390, '#enemy-number'), status: await text(page390, '#battle-state') };
    await screenshot(page390.locator('#battle-screen'), 'battle-paused-390.png');
    await page390.waitForTimeout(1200);
    const pausedEnd = { timer: await text(page390, '#timer'), enemy: await text(page390, '#enemy-number'), status: await text(page390, '#battle-state') };
    check('pause label is explicit and timer/HP freeze', pausedStart.status === '已暂停' && pausedStart.timer === pausedEnd.timer && pausedStart.enemy === pausedEnd.enemy, JSON.stringify({ pausedStart, pausedEnd }));
    await page390.locator('#pause').click();
    check('continue restores live combat', await text(page390, '#battle-state') === '自动战斗', await text(page390, '#pause[aria-label]'));
    await page390.waitForTimeout(750);
    check('timer advances after continue', (await text(page390, '#timer')) !== pausedEnd.timer, `before=${pausedEnd.timer}, after=${await text(page390, '#timer')}`);
    await page390.waitForSelector('#result:not([hidden])', { timeout: 18000 });
    await screenshot(page390.locator('#battle-screen'), 'battle-victory-390.png');
    check('victory has no seconds suffix or return-this-night button',
      (await text(page390, '#result')).includes('胜利') && (await page390.locator('#intent-unit').evaluate(el => el.hidden)) && !(await text(page390, '#result')).includes('返回本夜'),
      `result=${(await text(page390, '#result')).replace(/\s+/g, ' ')}, intent=${await text(page390, '#intent-time')}`);
    await context390.close();

    const { context: context360, page: page360 } = await openPage(browser, 360, 780);
    await screenshot(page360.locator('#prep-screen'), 'prep-shop-360.png');
    await page360.locator('#buy').click();
    await screenshot(page360.locator('#prep-screen'), 'prep-purchased-360.png');
    check('360 narrow prep still shows both storage pieces and 7 coins', await visible(page360, '#stored-cat') && await visible(page360, '#stored') && (await text(page360, '#coins')) === '7', 'both item cards visible after buying');
    await dragFromStorage(page360, '#stored-cat', 'cat', 0, 1);
    await dragFromStorage(page360, '#stored', 'feather', 0, 2);
    check('360 narrow prep shows connected toy hint', await visible(page360, '#link'), await text(page360, '#hint'));
    await page360.locator('#start').click();
    await page360.waitForTimeout(1550);
    const battle360 = await page360.evaluate(() => {
      const root = document.querySelector('#battle-screen');
      const rect = selector => root.querySelector(selector).getBoundingClientRect().toJSON();
      return {
        timer: root.querySelector('#timer').innerText.trim(), intent: root.querySelector('#intent-time').innerText.trim(),
        unitVisible: !root.querySelector('#intent-unit').hidden, screen: root.getBoundingClientRect().toJSON(),
        boss: rect('.boss-status'), intentRect: rect('.boss-intent'), bossArt: rect('.boss-art'),
        team: rect('.team-status'), nest: rect('.cat-floor'), catName: rect('#cat-name')
      };
    });
    result.metrics360Battle = battle360;
    await screenshot(page360.locator('#battle-screen'), 'battle-active-360.png');
    check('360 battle frame is scaled to fit and countdown suffix stays visible', battle360.screen.width <= 360 && battle360.screen.height <= 640 && battle360.unitVisible && /秒/.test(battle360.timer), JSON.stringify({ timer: battle360.timer, intent: battle360.intent, screen: battle360.screen, unitVisible: battle360.unitVisible }));
    await context360.close();
  } finally {
    await browser.close();
  }
  result.errors = [...new Set(result.errors)];
  check('no page errors', result.errors.length === 0, result.errors.join(' | ') || 'none');
  await fs.writeFile(`${out}/report.json`, JSON.stringify(result, null, 2));
  const failed = result.checks.filter(item => !item.pass);
  console.log(`Finished with ${failed.length} failed checks.`);
  process.exitCode = failed.length ? 1 : 0;
}

main().catch(error => { console.error(error); process.exit(1); });
