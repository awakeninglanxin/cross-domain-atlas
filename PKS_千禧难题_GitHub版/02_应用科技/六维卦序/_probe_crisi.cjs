/*
 * _probe_crisi.cjs —— 「cRSI 玩具版 · 实跑记录」页探针
 *
 * 零依赖，走 ../construct-cost/cdp.cjs。
 * 判据三原则：读屏上的字；声明查了多少；测「零」之前先测到「非零」。
 *
 * 这一页有一类特别的错误要防：**页面上的数和 JSON 里的数不一致**。
 * 所以除了「有没有崩」，还必须逐个数字回比 _crisi_result.json。
 */
const path = require('path');
const fs = require('fs');
const CDP = require('../construct-cost/cdp.cjs');

const DIR = __dirname;
const F = 'file:///' + encodeURI(path.join(DIR, 'AAA_cRSI_玩具版_实跑记录.html').split(path.sep).join('/')).replace(/#/g, '%23');
const OUT = 'C:/Users/ThinkPad/AppData/Local/Temp/';
const sleep = CDP.sleep;

const J = JSON.parse(fs.readFileSync(path.join(DIR, '_crisi_result.json'), 'utf8'));
let TOTAL = { pass: 0, total: 0 };
try { TOTAL = JSON.parse(fs.readFileSync(path.join(DIR, '_last-test.json'), 'utf8')); } catch (e) {}
const G = {};
J.groups.forEach((g) => { G[g.key] = g; });

let n = 0, bad = 0;
function ck(ok, label, got) {
  n++;
  if (!ok) { bad++; console.log('  FAIL  ' + label + (got !== undefined ? '   实测 ' + got : '')); }
  else console.log('  PASS  ' + label + (got !== undefined ? '   [' + got + ']' : ''));
}

const PAGE_EXPR = '(' + function () {
  const q = (s) => Array.prototype.slice.call(document.querySelectorAll(s));
  const t2 = (el) => el.textContent.replace(/\s+/g, ' ').trim();
  const txt = document.body.textContent.replace(/\s+/g, '');
  const h2 = q('h2').map(t2);
  return {
    h2: h2,
    h2Nums: h2.map((x) => { const m = x.match(/§\d+/); return m ? m[0] : '?'; }),
    fig: q('figure.fig').length,
    figsvg: q('figure.fig svg').length,
    tbl: q('table.t').length,
    figPath: q('figure.fig svg path').length,
    figCircle: q('figure.fig svg circle').length,
    figRect: q('figure.fig svg rect').length,
    /* 帕累托表：表头含「λ」的那张，数行数 —— 判纯文本里找 '>0<' 是错的，textContent 里没有标签 */
    lamRows: (function () {
      const t = q('table.t').filter(function (x) {
        const th = x.querySelector('thead tr'); return th && /λ/.test(th.textContent);
      })[0];
      return t ? t.querySelectorAll('tbody tr').length : -1;
    })(),
    groupRows: (function () {
      const t = q('table.t').filter(function (x) {
        const th = x.querySelector('thead tr'); return th && /配置/.test(th.textContent) && /Ω/.test(th.textContent);
      })[0];
      return t ? t.querySelectorAll('tbody tr').length : -1;
    })(),
    /* §8 的自评表：合计必须等于各分项之和 —— 专门防「手写合计」这个坑 */
    scoreSum: (function () {
      const t = q('table.t').filter(function (x) {
        const th = x.querySelector('thead tr'); return th && /原分/.test(th.textContent);
      })[0];
      if (!t) return { sum: null, total: null, n: 0 };
      const rows = Array.prototype.slice.call(t.querySelectorAll('tbody tr'));
      let sum = 0, total = null, n = 0;
      rows.forEach(function (tr) {
        const td = tr.querySelectorAll('td');
        if (!td.length) return;
        const num = function (el) { return parseFloat(el.textContent.replace(/[^0-9.\-]/g, '')); };
        if (/合计/.test(td[0].textContent)) {
          total = num(td[1]);
        } else {
          const v = num(td[3]);
          if (isFinite(v)) { sum += v; n++; }
        }
      });
      return { sum: sum, total: total, n: n };
    })(),
    txt: txt,
    vw: document.documentElement.clientWidth,
    scrollW: document.documentElement.scrollWidth,
    links: q('.nav a').map((a) => a.getAttribute('href')),
    ovf: (function () {
      const vw = document.documentElement.clientWidth, out = [];
      document.querySelectorAll('body *').forEach((el) => {
        const bb = el.getBoundingClientRect();
        if (bb.width > 0 && bb.right > vw + 1) {
          let p = el.parentElement, inScroll = false;
          while (p) { const ox = getComputedStyle(p).overflowX; if (ox === 'auto' || ox === 'scroll') { inScroll = true; break; } p = p.parentElement; }
          if (!inScroll) out.push(el.tagName + '.' + String(el.className || '').slice(0, 18));
        }
      });
      return out.slice(0, 6);
    })(),
    svgOver: (function () {
      const out = [];
      q('figure.fig svg').forEach(function (svg, i) {
        const vb = svg.viewBox.baseVal;
        Array.prototype.forEach.call(svg.querySelectorAll('text'), function (t) {
          const bb = t.getBBox();
          if (bb.x + bb.width > vb.width - 1) out.push('图' + (i + 1) + '「' + t.textContent.slice(0, 12) + '」右端 ' + (bb.x + bb.width).toFixed(0) + '/' + vb.width);
          if (bb.x < -6) out.push('图' + (i + 1) + '「' + t.textContent.slice(0, 12) + '」左端 ' + bb.x.toFixed(0));
          if (bb.y + bb.height > vb.height + 0.5) out.push('图' + (i + 1) + '「' + t.textContent.slice(0, 12) + '」下沿 ' + (bb.y + bb.height).toFixed(0) + '/' + vb.height);
        });
      });
      return out;
    })(),
    svgText: (function () {
      const o = { n: 0, w: 0 };
      q('figure.fig svg text').forEach(function (t) { const b = t.getBBox(); o.n++; o.w += b.width; });
      return o;
    })(),
    svgHit: (function () {
      const out = [];
      q('figure.fig svg').forEach(function (svg, i) {
        const ts = Array.prototype.slice.call(svg.querySelectorAll('text'));
        const bs = ts.map((t) => ({ b: t.getBBox(), s: t.textContent.slice(0, 12) }));
        for (let a = 0; a < bs.length; a++) {
          for (let b = a + 1; b < bs.length; b++) {
            const A = bs[a].b, B = bs[b].b;
            const ox = Math.min(A.x + A.width, B.x + B.width) - Math.max(A.x, B.x);
            const oy = Math.min(A.y + A.height, B.y + B.height) - Math.max(A.y, B.y);
            if (ox > 1.5 && oy > 1.5) out.push('图' + (i + 1) + '「' + bs[a].s + '」×「' + bs[b].s + '」' + ox.toFixed(0) + '×' + oy.toFixed(0));
          }
        }
        /* 折线穿过文字：解析 path 的 M/L 顶点 */
        Array.prototype.forEach.call(svg.querySelectorAll('path'), function (p) {
          const d = p.getAttribute('d') || '';
          const pts = (d.match(/[ML]([\-\d.]+) ([\-\d.]+)/g) || [])
            .map((s) => s.slice(1).split(' ').map(Number)).filter((v) => v.length === 2 && isFinite(v[0]));
          bs.forEach(function (bx) {
            for (const pt of pts) {
              if (pt[0] > bx.b.x + 3 && pt[0] < bx.b.x + bx.b.width - 3 &&
                  pt[1] > bx.b.y + 3 && pt[1] < bx.b.y + bx.b.height - 3) {
                out.push('图' + (i + 1) + '曲线顶点落在文字「' + bx.s + '」里 @' + pt.join(','));
                break;
              }
            }
          });
        });
      });
      return out;
    })(),
  };
} + ')()';

const BOX = (re, extra) => '(' + function (reStr, extraH) {
  const re = new RegExp(reStr);
  const h = Array.prototype.slice.call(document.querySelectorAll('h2')).filter((x) => re.test(x.textContent))[0];
  if (!h) return null;
  const a = h.getBoundingClientRect();
  return { x: 0, y: Math.max(0, a.top + window.scrollY - 10), w: document.documentElement.clientWidth, h: extraH };
} + ')(' + JSON.stringify(re) + ',' + (extra || 900) + ')';

(async () => {
  const c = await CDP.open({ w: 1440, h: 1000 });
  const shotTo = async (file, box) => {
    const r = await c.send('Page.captureScreenshot', {
      format: 'png', captureBeyondViewport: true,
      clip: { x: box.x, y: box.y, width: box.w, height: box.h, scale: 1 },
    });
    if (r.error) throw new Error('截图失败：' + r.error.message);
    fs.writeFileSync(file, Buffer.from(r.result.data, 'base64'));
  };

  await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await c.send('Page.addScriptToEvaluateOnNewDocument', {
    source: 'window.__errs=[];addEventListener("error",function(e){window.__errs.push(String(e.message))});',
  });
  await c.navigate(F);
  await sleep(700);

  const r = await c.evalJs(PAGE_EXPR);
  const errs = await c.evalJs('(window.__errs||[]).slice(0,5)');

  console.log('=== 结构与渲染 ===');
  ck(errs.length === 0, 'JS 异常 0 条', errs.length ? errs.join(' | ') : 0);
  /* 🔴 不许写死节数（加了 §10 就会假红）—— 改判「从 §0 连续排到末节，一个不跳」。 */
  const seqOk = r.h2Nums.length >= 6 && r.h2Nums.every((x, i) => x === '§' + i);
  ck(seqOk, '节号从 §0 连续排到末节，中间没跳号（个数不写死）', r.h2Nums.join('') + ' 共 ' + r.h2Nums.length + ' 节');
  ck(/§0/.test(r.h2[0]), '第一节是 §0', r.h2[0].slice(0, 8));

  /* 先测到非零 */
  ck(r.fig === 4 && r.figsvg === 4, '4 张现算图（figure.fig）且都真有 svg', r.fig + '/' + r.figsvg);
  ck(r.figPath >= 8, '图里的折线确实画出来了（path ≥ 8 条）', r.figPath);
  ck(r.figCircle >= 10, '图里的散点/标记确实画出来了（circle ≥ 10 个）', r.figCircle);
  ck(r.svgText.n >= 45 && r.svgText.w > 600,
    '碰撞判据有对象：四张图共 ≥ 45 段文字、包围盒总宽 > 600', r.svgText.n + ' 段 / ' + r.svgText.w.toFixed(0));
  ck(r.tbl >= 4, '表格 ≥ 4 张（查了多少写在表里）', r.tbl);

  ck(r.svgOver.length === 0, '四张图里每段文字都在 viewBox 内（出框＝被裁成断字）',
    r.svgOver.length ? r.svgOver.join('；') : '0 条');
  ck(r.svgHit.length === 0, '四张图里没有两段文字相撞、也没有折线顶点砸进文字',
    r.svgHit.length ? r.svgHit.join('；') : '0 处');
  ck(r.ovf.length === 0, '1440 下无横向溢出', r.ovf.length ? r.ovf.join(',') : '0');
  ck(r.scrollW <= r.vw + 1, '1440 下 document.scrollWidth 不超过视口', r.scrollW + '/' + r.vw);

  console.log('=== 页面上的数字 vs JSON ===');
  const t = r.txt;
  const f3 = (x) => (Math.round(x * 1000) / 1000).toFixed(3);
  const i0 = (x) => Math.round(x).toLocaleString('en-US');

  /* A 组与 C 组是全文最重要的一组对照，逐个回比 */
  ck(t.indexOf(f3(G.A.stats.meanVTall)) > 0, 'A 组价值 V 与 JSON 一致（' + f3(G.A.stats.meanVTall) + '）', t.indexOf(f3(G.A.stats.meanVTall)) > 0);
  ck(t.indexOf(i0(G.A.stats.ageAll)) > 0, 'A 组最差卦年龄与 JSON 一致（' + i0(G.A.stats.ageAll) + '）', t.indexOf(i0(G.A.stats.ageAll)) > 0);
  ck(t.indexOf(i0(G.C.stats.ageAll)) > 0, 'C 组最差卦年龄与 JSON 一致（' + i0(G.C.stats.ageAll) + '）', t.indexOf(i0(G.C.stats.ageAll)) > 0);
  ck(t.indexOf(f3(G.D.stats.meanVTall)) > 0, 'D 组（对抗表·自改）真表价值与 JSON 一致（' + f3(G.D.stats.meanVTall) + '）', t.indexOf(f3(G.D.stats.meanVTall)) > 0);
  ck(t.indexOf(f3(G.E.stats.meanVTall)) > 0, 'E 组（对抗表·不自改）真表价值与 JSON 一致（' + f3(G.E.stats.meanVTall) + '）', t.indexOf(f3(G.E.stats.meanVTall)) > 0);
  /* §7 的门：这一轮的核心结论，三个门组的数都要在屏上 */
  ck(t.indexOf(f3(G.GB.stats.meanVTall)) > 0, '双门组价值与 JSON 一致（' + f3(G.GB.stats.meanVTall) + '）', t.indexOf(f3(G.GB.stats.meanVTall)) > 0);
  ck(t.indexOf(i0(G.GB.stats.ageAll)) > 0, '双门组最差卦年龄与 JSON 一致（' + i0(G.GB.stats.ageAll) + '）', t.indexOf(i0(G.GB.stats.ageAll)) > 0);
  ck(t.indexOf(f3(G.XB.stats.meanVTall)) > 0, '对抗表·双门的真表价值与 JSON 一致（' + f3(G.XB.stats.meanVTall) + '）', t.indexOf(f3(G.XB.stats.meanVTall)) > 0);

  /* 🔴 合计必须等于分项之和。上一版页面写「合计 62」，而表里七项只有 40 ——
   *    没有任何断言管这件事，所以它一直错着。现在这条直接读屏上的表格算。 */
  ck(r.scoreSum.n === 7 && r.scoreSum.total === r.scoreSum.sum && r.scoreSum.sum > 0,
    '§8 自评表的合计 = ' + r.scoreSum.n + ' 个分项之和（防手写合计）',
    r.scoreSum.sum + ' vs ' + r.scoreSum.total);

  /* 八个组键必须都出现在表里 */
  /* 🔴 原来这里写了 t.indexOf('>'+key+'<') —— textContent 里根本没有标签，
   *    那一项恒为 -1，是死代码（靠后面两个 or 分支才没假绿）。现在只按组名找。 */
  const miss = J.groups.filter((g) => t.indexOf(g.name.replace(/\s/g, '')) < 0).map((g) => g.key);
  ck(miss.length === 0, '所有组都出现在页面上（按组名逐个找，' + J.groups.length + ' 组）',
    miss.length ? miss.join(',') : J.groups.length + '/' + J.groups.length);

  /* λ 扫描 12 个点：数表行，不在纯文本里找 '>0<'（textContent 没有标签，那样必假红） */
  ck(r.lamRows === J.pareto.length, '帕累托表的行数 = λ 扫描点数（' + J.pareto.length + '）', r.lamRows);
  ck(r.groupRows === J.groups.length, '总表的行数 = 组数（' + J.groups.length + '）', r.groupRows);
  /* 两端的 λ 与 V 必须真在屏上 */
  const pFirst = J.pareto[0], pLast = J.pareto[J.pareto.length - 1];
  ck(t.indexOf(f3(pFirst.V)) > 0 && t.indexOf(f3(pLast.V)) > 0,
    '帕累托两端（λ=0 与 λ=' + pLast.lam + '）的 V 都在屏上',
    f3(pFirst.V) + ' / ' + f3(pLast.V));

  console.log('=== 关键判据 ===');
  ck(t.indexOf('放大器') > 0, '「自改是放大器」这一句在屏上（不是只在源码里）', t.indexOf('放大器') > 0);
  ck(t.indexOf('不在可改集合里') > 0, '「Ω 不在可改集合里」在屏上', t.indexOf('不在可改集合里') > 0);
  ck(t.indexOf('κ') > 0 && t.indexOf('相变') >= 0 || t.indexOf('断崖') > 0, '相变/断崖那段在屏上', t.indexOf('断崖'));
  ck(t.indexOf('undefined') < 0 && t.indexOf('NaN') < 0, '无 undefined / NaN 占位符',
    t.indexOf('undefined') + '/' + t.indexOf('NaN'));
  /* SVG 的 <text> 里写 **粗体** ⇒ 屏上就是星号（这坑踩过）。 */
  ck((t.match(/\*\*/g) || []).length === 0, '没有漏出 Markdown 星号（SVG text 不解析 **）',
    (t.match(/\*\*/g) || []).length);
  ck(!/\d\.\d{6,}e[+-]\d/.test(t), '没有漏出科学计数法', 'ok');

  /* 核验数：必须等于 _last-test.json，不许写死 */
  ck(t.indexOf(TOTAL.pass + '／' + TOTAL.total) > 0 || t.indexOf(TOTAL.pass + '/' + TOTAL.total) > 0,
    '核验总数从 _last-test.json 现读（' + TOTAL.pass + '／' + TOTAL.total + '），不是手写',
    t.indexOf(TOTAL.pass + '／' + TOTAL.total));

  console.log('=== 上游链接 ===');
  const need = ['AAA_四六通达_三源合观.html', 'AAA_良心与异化_六维价值梯度.html', 'AAA_算法文档_合观校核.html'];
  const lacking = need.filter((x) => r.links.indexOf(x) < 0);
  const noFile = need.filter((x) => !fs.existsSync(path.join(DIR, x)));
  ck(lacking.length === 0, '三个上游页都在导航里', lacking.length ? lacking.join(',') : '3/3');
  ck(noFile.length === 0, '三个链接的目标文件真的在盘上', noFile.length ? noFile.join(',') : '3/3');

  /* 截图：整页 + 四张图 + 375 */
  const shots = [];
  for (const [f, re, h] of [
    ['cr_s0.png', '§1', 1500],
    ['cr_s2.png', '§2', 1300],
  ]) {
    const box = await c.evalJs(BOX(re, h));
    if (box) { await shotTo(OUT + f, box); shots.push(f); }
  }
  for (let i = 1; i <= 4; i++) {
    const box = await c.evalJs('(function(i){var fs=document.querySelectorAll("figure.fig");var f=fs[i-1];if(!f)return null;var b=f.getBoundingClientRect();return {x:0,y:Math.max(0,b.top+scrollY-6),w:document.documentElement.clientWidth,h:b.height+14};})(' + i + ')');
    if (box) { await shotTo(OUT + 'cr_fig' + i + '.png', box); shots.push('cr_fig' + i + '.png'); }
  }
  ck(shots.length === 6, '截图 6 张（2 节 + 4 图）', shots.join(','));

  /* 375 */
  await c.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  await sleep(400);
  const r2 = await c.evalJs(PAGE_EXPR);
  ck(r2.ovf.length === 0, '375 下无横向溢出（表格/图在容器内横滚，不撑破页面）',
    r2.ovf.length ? r2.ovf.join(',') : '0');
  ck(r2.scrollW <= r2.vw + 1, '375 下 scrollWidth 不超过视口', r2.scrollW + '/' + r2.vw);
  const box375 = await c.evalJs(BOX('§2', 1200));
  if (box375) await shotTo(OUT + 'cr_375.png', box375);

  await c.close();
  console.log('\n探针 ' + (n - bad) + '/' + n + (bad ? '  ❌ ' + bad + ' 条失败' : '  ✓ 全绿'));
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('探针异常：', e); process.exit(2); });
