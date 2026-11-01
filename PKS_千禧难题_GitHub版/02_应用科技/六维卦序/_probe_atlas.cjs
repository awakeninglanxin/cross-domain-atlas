/*
 * _probe_atlas.cjs —— 页面探针（零依赖，走 ../construct-cost/cdp.cjs）
 *
 * 为什么不用 puppeteer-core：本机已经没有了（模块被清掉），而 cdp.cjs 只用
 * Node 内建的 fetch / WebSocket，跑得起来。判据一个字都不改，只换跑法。
 *
 * 两条纪律（cdp.cjs 已写死，这里继续遵守）：
 *   ① 只 kill 自己起的那个 PID；
 *   ② 截图一律 captureBeyondViewport ＋ 页面坐标 clip。
 */
const path = require('path');
const fs = require('fs');
const CDP = require('../construct-cost/cdp.cjs');

const DIR = __dirname;
const F = 'file:///' + encodeURI(path.join(DIR, 'AAA_四六通达_三源合观.html').split(path.sep).join('/')).replace(/#/g, '%23');
const OUT = 'C:/Users/ThinkPad/AppData/Local/Temp/';
const sleep = CDP.sleep;

let n = 0, bad = 0;
function ck(ok, label, got) {
  n++;
  if (!ok) { bad++; console.log('  FAIL  ' + label + (got !== undefined ? '   实测 ' + got : '')); }
  else console.log('  PASS  ' + label + (got !== undefined ? '   [' + got + ']' : ''));
}

const PAGE_EXPR = '(' + function () {
  const q = (s) => Array.prototype.slice.call(document.querySelectorAll(s));
  const ladder = q('.ladder li');
  const steps = ladder.filter((li) => !li.classList.contains('cut'));
  const kinds = steps.map((li) => (li.querySelector('.kind') || {}).textContent || '');
  const t = q('.t');
  const xxt = t.filter((x) => /地支/.test((x.tHead || {}).textContent || ''))[0];
  const h2 = q('h2').map((h) => h.textContent.replace(/\s+/g, ' ').trim());
  const vcards = q('.vcard');
  const sph = q('a[href*="weixin.qq.com/sph/"]');
  return {
    nStep: steps.length,
    gen: kinds.filter((k) => k === '生成').length,
    sel: kinds.filter((k) => k === '选择').length,
    claim: kinds.filter((k) => k === '立论').length,
    nums: steps.map((li) => (li.querySelector('.num') || {}).textContent).join(','),
    xn: xxt ? xxt.tBodies[0].rows.length : -1,
    xfirst: xxt ? xxt.tBodies[0].rows[0].cells[0].textContent + '/' + xxt.tBodies[0].rows[0].cells[4].textContent : '',
    h2: h2,
    /* 目录里写的节号序列，必须和正文 h2 的节号序列逐项相同 —— 目录手写，最容易烂掉 */
    tocNums: (function () {
      const t = document.querySelector('.toc');
      return t ? (t.textContent.match(/§\d+/g) || []) : [];
    })(),
    h2Nums: h2.map(function (x) { const m = x.match(/§\d+/); return m ? m[0] : '?'; }),
    tocText: (function () { const t = document.querySelector('.toc'); return t ? t.textContent.replace(/\s+/g, '') : ''; })(),
    vcards: vcards.length,
    vpts: vcards.reduce((a, v) => a + v.querySelectorAll('.vpts li').length, 0),
    sph: sph.length,
    sphUniq: new Set(sph.map((a) => a.getAttribute('href'))).size,
    vlink: q('.vfoot code').length,
    ovf: (function () {
      const vw = document.documentElement.clientWidth;
      const out = [];
      document.querySelectorAll('body *').forEach((el) => {
        const bb = el.getBoundingClientRect();
        if (bb.width > 0 && bb.right > vw + 1) out.push(el.tagName + '.' + (el.className || '').toString().slice(0, 20));
      });
      return out.slice(0, 6);
    })(),
    scrollW: document.documentElement.scrollWidth,
    vw: document.documentElement.clientWidth,
    txt: document.body.textContent.replace(/\s+/g, ''),
    fig: q('figure.fig').length,
    figsvg: q('figure.fig svg').length,
    errs: (window.__errs || []).slice(0, 5),
    /* 五张图里每一段文字是否都在自己的 viewBox 内（出框＝被裁，屏上就是断字） */
    svgOver: (function () {
      const out = [];
      q('figure.fig svg').forEach(function (svg, i) {
        const vb = svg.viewBox.baseVal;
        Array.prototype.forEach.call(svg.querySelectorAll('text'), function (t) {
          const bb = t.getBBox();
          if (bb.x + bb.width > vb.width - 1 || bb.x < -6) {
            out.push('图' + (i + 1) + '「' + t.textContent.slice(0, 12) + '」右端 ' + (bb.x + bb.width).toFixed(0) + ' / ' + vb.width);
          }
        });
      });
      return out;
    })(),
    /* §9 段内部：从 §9 标题往下数，直到下一个 h2 */
    s9: (function () {
      const h = q('h2').filter(function (x) { return /§9/.test(x.textContent); })[0];
      if (!h) return { figs: -1, svg: -1, txt: '' };
      let t = '', f = 0, v = 0, e = h.nextElementSibling;
      while (e && e.tagName !== 'H2') {
        if (e.tagName === 'FIGURE') f++;
        v += e.querySelectorAll ? e.querySelectorAll('svg').length : 0;
        t += e.textContent;
        e = e.nextElementSibling;
      }
      return { figs: f, svg: v, txt: t.replace(/\s+/g, '') };
    })(),
  };
} + ')()';

const BOX = (re, extra) => '(' + function (reStr, extraH) {
  const re = new RegExp(reStr);
  const h = Array.prototype.slice.call(document.querySelectorAll('h2')).filter((x) => re.test(x.textContent))[0];
  if (!h) return null;
  const a = h.getBoundingClientRect();
  return { x: 0, y: Math.max(0, a.top + window.scrollY - 10), w: document.documentElement.clientWidth, h: extraH };
} + ')(' + JSON.stringify(re) + ',' + (extra || 1100) + ')';

(async () => {
  const c = await CDP.open({ w: 1440, h: 1000 });
  const shotTo = async (file, box) => {
    const r = await c.send('Page.captureScreenshot', {
      format: 'png', captureBeyondViewport: true,
      clip: { x: box.x, y: box.y, width: box.w, height: box.h, scale: 1 },
    });
    if (r.error) throw new Error('截图失败：' + r.error.message);
    fs.writeFileSync(file, Buffer.from(r.result.data, 'base64'));
    return Buffer.from(r.result.data, 'base64').length;
  };

  await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await c.send('Page.addScriptToEvaluateOnNewDocument', {
    source: 'window.__errs=[];addEventListener("error",function(e){window.__errs.push(String(e.message))});'
      + 'addEventListener("unhandledrejection",function(e){window.__errs.push("rej:"+e.reason)});',
  });
  await c.navigate(F);
  await sleep(500);

  const r = await c.evalJs(PAGE_EXPR);

  ck(r.errs.length === 0, 'JS 异常 0 条', r.errs.length ? r.errs.join(' | ') : 0);
  ck(r.nStep === 10, '次第 10 步（无极为 0，十二地支为 9）', r.nStep);
  ck(r.gen === 7 && r.sel === 2 && r.claim === 1, '口径计数：生成 7 / 选择 2 / 立论 1',
    r.gen + '/' + r.sel + '/' + r.claim);
  ck(r.nums === '—,1,2,4,8,16,32,64,12,12', '屏上的数是 —,1,2,4,8,16,32,64,12,12（不是脚本里再算一遍）', r.nums);
  ck(r.xn === 12, '十二辟卦表 12 行', r.xn);
  ck(r.xfirst === '复/子', '首行是「复 / 子」（冬至一阳生）', r.xfirst);
  ck(r.h2.length === 12 && /§7/.test(r.h2[7]) && /§8/.test(r.h2[8]) && /§9/.test(r.h2[9]) && /§11/.test(r.h2[11]),
    'h2 共 12 个，§7/§8/§9 连着，末节是 §11 附录', r.h2.length + ' | ' + r.h2[11].slice(0, 10));
  ck(r.h2.join('|').indexOf('§7') < r.h2.join('|').indexOf('§8'), '§7 排在 §8 之前');
  ck(r.tocNums.join(',') === r.h2Nums.join(','),
    '目录里的节号序列与正文 h2 的节号序列逐项相同（目录是手写的，最容易烂）',
    r.tocNums.join('') + ' vs ' + r.h2Nums.join(''));
  const cn = ['零','一','二','三','四','五','六','七','八','九','十','十一','十二','十三','十四'];
  ck(r.tocText.indexOf('本页' + (cn[r.h2.length] || r.h2.length) + '节') === 0,
    '目录自称的节数 = 实际 h2 个数（' + r.h2.length + '）', r.tocText.slice(0, 12));
  ck(r.vcards === 6, '六张视频卡', r.vcards);
  ck(r.vpts >= 46, '六张卡里的要点合计 ≥ 46 条（实测逐卡计数）', r.vpts);
  ck(r.vlink === 6, '六条 yb.woa.com 短链全部渲染', r.vlink);
  ck(r.sph === 9 && r.sphUniq === 9, '九条视频号短链，无重复', r.sph + '/' + r.sphUniq);
  ck(r.txt.indexOf('64是「分」的尽头，12是「周」的起点') > 0, '屏上有那句总纲（按文字查，不按代码查）');
  ck(r.txt.indexOf('7+7−2=12') > 0 || r.txt.indexOf('7+7-2=12') > 0, '屏上有 7+7−2=12 这条算式');
  ck(r.ovf.length === 0 && r.scrollW <= r.vw + 1, '1440 下无横向溢出', r.scrollW + '/' + r.vw);

  /* ---- §9 四项复现 ---- */
  ck(r.fig === 5, '§9 有 5 张图（figure.fig）', r.fig);
  ck(r.figsvg === 5, '5 张图里都真的有 svg（不是空框）', r.figsvg);
  ck(r.s9.figs === 5 && r.s9.svg === 5, '§9 段内部自己数到 5 个 figure / 5 个 svg', r.s9.figs + '/' + r.s9.svg);
  ck(r.s9.txt.indexOf('京房93、邵雍120、帛书141') > 0, '屏上有 93 / 120 / 141 三个总步数');
  ck(r.s9.txt.indexOf('48步为1＋15步为3') > 0 && r.s9.txt.indexOf('48＋15＝63') > 0,
    '屏上写清了 48+15=63 步（不是 64 步 —— 上一稿这里写错过）');
  ck(r.s9.txt.indexOf('g≥17') > 0 && r.s9.txt.indexOf('F≤96') > 0, '亏格的上下夹逼两条都在屏上');
  ck(r.s9.txt.indexOf('64/64/64') > 0, '三条回路各 64 点');
  ck(r.s9.txt.indexOf('并集192条边、重边0') > 0, '并集 192 边 / 重边 0');
  ck(r.s9.txt.indexOf('1.791759469228') > 0, 'ln6 的十二位在屏上');
  ck(r.s9.txt.indexOf('0.0432') > 0, '模型 B 在 β=4 的 0.0432 在屏上');
  ck(r.s9.txt.indexOf('−32') > 0, 'χ 的负号是正式减号（不是 ASCII 连字符）');
  ck(r.txt.indexOf('undefined') < 0 && r.txt.indexOf('NaN') < 0 && r.txt.indexOf('${') < 0,
    '整页无 undefined / NaN / 未插值占位符');
  ck(r.svgOver.length === 0, '五张图里的每段文字都在 viewBox 内（出框＝被裁成断字）',
    r.svgOver.length + ' 条' + (r.svgOver.length ? '：' + r.svgOver.slice(0, 6).join('；') : ''));

  /* 截图：次第段 + 附录首卡 + 五张复现图 */
  let box = await c.evalJs(BOX('§7', 1180));
  await shotTo(OUT + 'atlas_ladder.png', box);

  box = await c.evalJs(BOX('§11', 1100));
  await shotTo(OUT + 'atlas_video.png', box);

  box = await c.evalJs(BOX('§9', 1700));
  await shotTo(OUT + 'atlas_s9.png', box);

  const figs = await c.evalJs('Array.prototype.slice.call(document.querySelectorAll("figure.fig")).map(function(f){'
    + 'var a=f.getBoundingClientRect();'
    + 'return {x:Math.max(0,a.left-8), y:a.top+window.scrollY-8, w:Math.min(a.width+16, 980), h:a.height+16};})');
  for (let i = 0; i < figs.length; i++) {
    await shotTo(OUT + 'atlas_fig' + (i + 1) + '.png', figs[i]);
  }
  ck(figs.length === 5, '五张图各自裁了一张截图（后续逐张肉眼核）', figs.length);

  /* 375 窄屏：换设备指标后重新导航，不用开第二个页面 */
  await c.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  await c.navigate(F);
  await sleep(400);
  const m = await c.evalJs('(function(){var out=[],vw=document.documentElement.clientWidth;'
    + 'document.querySelectorAll("body *").forEach(function(el){var bb=el.getBoundingClientRect();'
    + 'if(bb.width<=0||bb.right<=vw+1) return;'
    + 'var p=el.parentElement,inScroll=false;'
    + 'while(p){var ox=getComputedStyle(p).overflowX; if(ox==="auto"||ox==="scroll"){inScroll=true;break;} p=p.parentElement;}'
    + 'if(!inScroll) out.push(el.tagName+"."+(el.className||"").toString().slice(0,24));});'
    + 'return {w:document.documentElement.scrollWidth,vw:vw,out:out.slice(0,8)};})()');
  ck(m.w <= m.vw + 1 && m.out.length === 0, '375px 页面级无横向溢出（图容器内横滚不算）', m.w + '/' + m.vw + ' ' + m.out.join(','));

  /* 窄屏不是靠「把图缩小」蒙过去的：验证媒体查询真的生效、字没被压成 5px */
  const fg = await c.evalJs('(function(){var f=document.querySelector("figure.fig");if(!f)return null;'
    + 'var s=f.querySelector("svg");return {cw:f.clientWidth,sw:f.scrollWidth,ox:getComputedStyle(f).overflowX,'
    + 'svgW:s.getBoundingClientRect().width,fs:getComputedStyle(s.querySelector("text")).fontSize};})()');
  ck(fg && fg.ox === 'auto' && fg.svgW >= 599 && fg.sw > fg.cw,
    '375 下五张图改成容器内横滚：svg 宽度不缩水（不是把 11px 字压成 5px）',
    fg ? ('overflowX=' + fg.ox + ' svgW=' + fg.svgW.toFixed(0) + ' scrollW=' + fg.sw + '/' + fg.cw) : 'figure 未找到');

  box = await c.evalJs(BOX('§9', 760));
  await shotTo(OUT + 'atlas_375_s9.png', box);
  box = await c.evalJs(BOX('§7', 700));
  await shotTo(OUT + 'atlas_375.png', box);

  console.log('\n' + '─'.repeat(58));
  console.log('检查 ' + n + ' 项：PASS ' + (n - bad) + ' / FAIL ' + bad);
  c.close();
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('探针崩了：' + e.message); process.exit(2); });
