/* =========================================================
   V1「第一終極版」上線前驗證
   檢查：太素觀已收起、供瓦片已收起、#taisu 導回首頁、
        無隱形遮罩吃點擊、網址已換新網域
   ========================================================= */
const { chromium } = require('playwright-core');

const BASE = process.env.BASE || 'http://127.0.0.1:4321';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

let pass = 0, fail = 0;
const failures = [];

function check(name, cond, detail) {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; failures.push(name + (detail ? ` → ${detail}` : '')); console.log(`  ❌ ${name}${detail ? ` → ${detail}` : ''}`); }
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  const errors = [];
  const failedReqs = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('requestfailed', (r) => failedReqs.push(r.url()));

  console.log('\n── 1. 首頁載入 ──');
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  check('首頁可開啟', (await page.title()).length > 0, await page.title());

  console.log('\n── 2. 太素觀全面收起 ──');
  const taisuNavVisible = await page.locator('.site-header .taisu-only').first().isVisible().catch(() => false);
  check('導覽列「太素觀」已隱藏', taisuNavVisible === false);

  const entryCard = await page.locator('.entry-card.taisu-only').first().isVisible().catch(() => false);
  check('首頁「太素觀」入口卡已隱藏', entryCard === false);

  const footerTaisu = await page.locator('footer .taisu-only, .site-footer .taisu-only').first().isVisible().catch(() => false);
  check('頁腳「太素觀」已隱藏', footerTaisu === false);

  // 整站搜尋可見的「太素觀」字樣
  const visibleTaisuText = await page.evaluate(() => {
    const hits = [];
    document.querySelectorAll('body *').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return;
      // 只取直接文字節點
      for (const n of el.childNodes) {
        if (n.nodeType === 3 && n.textContent.includes('太素觀')) {
          hits.push(n.textContent.trim().slice(0, 40));
        }
      }
    });
    return hits;
  });
  check('頁面上看不到「太素觀」文字', visibleTaisuText.length === 0, visibleTaisuText.join(' | '));

  console.log('\n── 3. 供瓦片已收起 ──');
  const donateItems = await page.evaluate(async () => {
    const mod = await import('/lib/items.js').catch(() => null);
    if (!mod) return null;
    return { all: (mod.ALL_ITEMS || mod.ITEMS || []).map((i) => i.name || i.id) };
  });
  if (donateItems) {
    check('供養項目不含「銅瓦」', !donateItems.all.some((n) => String(n).includes('瓦')), donateItems.all.join('、'));
  } else {
    // items.js 可能是全域變數形式，改從 DOM 檢查
    await page.goto(BASE + '/#donate', { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const bodyText = await page.textContent('body');
    check('植福田頁看不到「銅瓦」', !bodyText.includes('銅瓦'));
  }

  console.log('\n── 4. #taisu 舊連結導回首頁 ──');
  await page.goto(BASE + '/#taisu', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const homeVisible = await page.locator('#page-home').isVisible().catch(() => false);
  check('#taisu 自動導回首页', homeVisible === true);

  console.log('\n── 5. 最新消息已過濾太素觀進度 ──');
  await page.goto(BASE + '/#news', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const newsText = await page.textContent('body');
  check('消息頁無「太素觀進度」標籤', !newsText.includes('太素觀進度'));

  console.log('\n── 6. 隱形遮罩掃描（V1 那個坑）──');
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const blockers = await page.evaluate(() => {
    const bad = [];
    document.querySelectorAll('body *').forEach((el) => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return;
      if (parseFloat(cs.opacity) === 0 && cs.pointerEvents !== 'none') {
        const r = el.getBoundingClientRect();
        if (r.width > 200 && r.height > 200) {
          bad.push(`${el.tagName}#${el.id}.${el.className}`.slice(0, 80));
        }
      }
    });
    return bad;
  });
  check('無全透明的大型遮罩', blockers.length === 0, blockers.join(' | '));

  console.log('\n── 7. 中心點可被點擊 ──');
  const hitTest = await page.evaluate(() => {
    const pts = [[640, 300], [640, 500], [640, 700]];
    return pts.map(([x, y]) => {
      const el = document.elementFromPoint(x, y);
      return el ? `${el.tagName}#${el.id || '-'}` : 'null';
    });
  });
  check('畫面中心可命中真實元素', !hitTest.includes('null'), hitTest.join(', '));

  console.log('\n── 8. 網址已換新網域 ──');
  const siteUrl = await page.evaluate(() => (typeof SITE_CONFIG !== 'undefined' ? SITE_CONFIG.SITE.url : null));
  check('SITE.url 為新網域', siteUrl === 'https://www.hauterglobal.com/', String(siteUrl));

  const ogUrl = await page.getAttribute('meta[property="og:url"]', 'content');
  check('og:url 為新網域', ogUrl === 'https://www.hauterglobal.com/', String(ogUrl));

  console.log('\n── 9. Console 與請求 ──');
  const realErrors = errors.filter((e) => !/fonts\.googleapis|fonts\.gstatic|ERR_CONNECTION/i.test(e));
  check('無 JS 錯誤', realErrors.length === 0, realErrors.slice(0, 2).join(' | '));

  const realFailed = failedReqs.filter((u) => !/fonts\.googleapis|fonts\.gstatic/.test(u));
  check('無載入失敗的資源（字型除外）', realFailed.length === 0, realFailed.slice(0, 2).join(' | '));

  await browser.close();

  console.log(`\n${'='.repeat(50)}`);
  console.log(`結果：${pass} 通過 / ${fail} 失敗`);
  if (failures.length) {
    console.log('\n失敗項目：');
    failures.forEach((f) => console.log('  • ' + f));
  }
  console.log('='.repeat(50));
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
