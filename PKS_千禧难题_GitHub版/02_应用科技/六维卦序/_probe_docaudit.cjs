/*
 * _probe_docaudit.cjs —— 「算法文档合观校核」页探针（零依赖，走 ../construct-cost/cdp.cjs）
 *
 * 判据三原则（本仓老账）：
 *   ① 判据读屏上的字，不读源码；
 *   ② 必须声明查了多少（每条都印实测值）；
 *   ③ 测「零」之前先测到「非零」—— 先证明量到了文字盒，再断言 0 处相撞。
 */
const path = require('path');
const fs = require('fs');
const CDP = require('../construct-cost/cdp.cjs');

const DIR = __dirname;
const F = 'file:///' + encodeURI(path.join(DIR, 'AAA_算法文档_合观校核.html').split(path.sep).join('/')).replace(/#/g, '%23');
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
  const txt = document.body.textContent.replace(/\s+/g, '');
  const h2 = q('h2').map((h) => h.textContent.replace(/\s+/g, ' ').trim());
  const toc = document.querySelector('.toc');
  return {
    h2: h2,
    tocNums: toc ? (toc.textContent.match(/§\d+/g) || []) : [],
    h2Nums: h2.map((x) => { const m = x.match(/§\d+/); return m ? m[0] : '?'; }),
    tocText: toc ? toc.textContent.replace(/\s+/g, '') : '',
    fig: q('figure.fig').length,
    figsvg: q('figure.fig svg').length,
    tbl: q('table.t').length,
    /* 对账表的行数与四档计数 —— 只数最后那一列，避免把图里的 ✗ 算进来 */
    auditRows: q('table.t').reduce(function (a, t) {
      const th = t.querySelector('thead tr');
      if (!th || !/判定/.test(th.textContent)) return a;
      return a + q('tbody tr').filter ? a + Array.prototype.filter.call(t.querySelectorAll('tbody tr'),
        function (r) { return !r.classList.contains('grp'); }).length : a;
    }, 0),
    verdicts: (function () {
      const o = { ok: 0, diff: 0, contra: 0, na: 0 };
      const tab = q('table.t').filter(function (t) { const th = t.querySelector('thead tr'); return th && /判定/.test(th.textContent); })[0];
      if (!tab) return o;
      Array.prototype.forEach.call(tab.querySelectorAll('tbody tr'), function (r) {
        if (r.classList.contains('grp')) return;   /* 🔴 分组行「L6 · 不可复算」里也有「不可复算」四个字，漏掉这一行会多算 1 条 */
        const c = r.lastElementChild.textContent;
        if (/逐位相等/.test(c)) o.ok++;
        else if (/文档自相矛盾/.test(c)) o.contra++;
        else if (/不可复算/.test(c)) o.na++;
        else if (/不同/.test(c)) o.diff++;
      });
      return o;
    })(),
    txt: txt,
    ovf: (function () {
      const vw = document.documentElement.clientWidth, out = [];
      document.querySelectorAll('body *').forEach((el) => {
        const bb = el.getBoundingClientRect();
        if (bb.width > 0 && bb.right > vw + 1) out.push(el.tagName + '.' + (el.className || '').toString().slice(0, 20));
      });
      return out.slice(0, 6);
    })(),
    scrollW: document.documentElement.scrollWidth,
    vw: document.documentElement.clientWidth,
    links: q('.links a').map((a) => a.getAttribute('href')),
    svgOver: (function () {
      const out = [];
      q('figure.fig svg').forEach(function (svg, i) {
        const vb = svg.viewBox.baseVal;
        Array.prototype.forEach.call(svg.querySelectorAll('text'), function (t) {
          const bb = t.getBBox();
          if (bb.x + bb.width > vb.width - 1 || bb.x < -6) {
            out.push('图' + (i + 1) + '「' + t.textContent.slice(0, 14) + '」右端 ' + (bb.x + bb.width).toFixed(0) + '/' + vb.width);
          }
          if (bb.y + bb.height > vb.height + 0.5) {
            out.push('图' + (i + 1) + '「' + t.textContent.slice(0, 14) + '」下沿 ' + (bb.y + bb.height).toFixed(0) + '/' + vb.height);
          }
        });
      });
      return out;
    })(),
    svgText: (function () {
      const o = { n: 0, w: 0, poly: 0 };
      q('figure.fig svg text').forEach(function (t) { const b = t.getBBox(); o.n++; o.w += b.width; });
      o.poly = q('figure.fig svg polyline').length;
      return o;
    })(),
    svgHit: (function () {
      const out = [];
      q('figure.fig svg').forEach(function (svg, i) {
        const ts = Array.prototype.slice.call(svg.querySelectorAll('text'));
        const bs = ts.map((t) => ({ b: t.getBBox(), s: t.textContent.slice(0, 14) }));
        for (let a = 0; a < bs.length; a++) {
          for (let b = a + 1; b < bs.length; b++) {
            const A = bs[a].b, B = bs[b].b;
            const ox = Math.min(A.x + A.width, B.x + B.width) - Math.max(A.x, B.x);
            const oy = Math.min(A.y + A.height, B.y + B.height) - Math.max(A.y, B.y);
            if (ox > 1.5 && oy > 1.5) out.push('图' + (i + 1) + '「' + bs[a].s + '」×「' + bs[b].s + '」' + ox.toFixed(0) + '×' + oy.toFixed(0));
          }
        }
        Array.prototype.forEach.call(svg.querySelectorAll('polyline'), function (line) {
          const pts = (line.getAttribute('points') || '').trim().split(/\s+/)
            .map((p) => p.split(',').map(Number)).filter((p) => p.length === 2 && isFinite(p[0]));
          bs.forEach(function (bx) {
            for (const pt of pts) {
              if (pt[0] > bx.b.x + 1 && pt[0] < bx.b.x + bx.b.width - 1 &&
                  pt[1] > bx.b.y + 1 && pt[1] < bx.b.y + bx.b.height - 1) {
                out.push('图' + (i + 1) + '曲线穿过文字「' + bx.s + '」@' + pt.join(','));
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
} + ')(' + JSON.stringify(re) + ',' + (extra || 1100) + ')';

(async () => {
  const c = await CDP.open({ w: 1440, h: 1000 });
  const shotTo = async (file, box) => {
    const r = await c.send('Page.captureScreenshot', {
      format: 'png', captureBeyondViewport: true,
      clip: { x: box.x, y: box.y, width: box.w, height: box.h, scale: 1 },
    });
    if (r.error) throw new Error('截图失败：' + r.error.message);
    const b = Buffer.from(r.result.data, 'base64');
    fs.writeFileSync(file, b);
    return b.length;
  };

  await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await c.send('Page.addScriptToEvaluateOnNewDocument', {
    source: 'window.__errs=[];addEventListener("error",function(e){window.__errs.push(String(e.message))});',
  });
  await c.navigate(F);
  await sleep(600);

  const r = await c.evalJs(PAGE_EXPR);
  const errs = await c.evalJs('(window.__errs||[]).slice(0,5)');

  ck(errs.length === 0, 'JS 异常 0 条', errs.length ? errs.join(' | ') : 0);
  ck(r.h2.length === 9, 'h2 共 9 个（§0–§8）', r.h2.length);
  ck(/§0/.test(r.h2[0]) && /§8/.test(r.h2[8]), '首节 §0、末节 §8', r.h2[0].slice(0, 8) + ' | ' + r.h2[8].slice(0, 8));
  ck(r.tocNums.join(',') === r.h2Nums.join(','),
    '目录里的节号序列与正文 h2 的节号序列逐项相同（目录手写，最容易烂）',
    r.tocNums.join('') + ' vs ' + r.h2Nums.join(''));
  const cn = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  ck(r.tocText.indexOf('本页' + cn[r.h2.length] + '节') === 0,
    '目录自称的节数 = 实际 h2 个数（' + r.h2.length + '）', r.tocText.slice(0, 10));

  /* 先测到「非零」，再测「零」 */
  ck(r.fig === 5 && r.figsvg === 5, '5 张现算图（figure.fig）且都真有 svg', r.fig + '/' + r.figsvg);
  ck(r.svgText.n >= 60 && r.svgText.w > 800,
    '碰撞判据有对象：五张图共 ≥ 60 段文字、包围盒总宽 > 800（先证明量到了）',
    r.svgText.n + ' 段 / 总宽 ' + r.svgText.w.toFixed(0));
  ck(r.svgText.poly >= 3, '折线确实画出来了（图 1/图 2/图 4 里的 polyline ≥ 3 条）', r.svgText.poly);
  ck(r.svgOver.length === 0, '五张图里每段文字都在 viewBox 内（出框＝被裁成断字）',
    r.svgOver.length ? r.svgOver.join('；') : '0 条');
  ck(r.svgHit.length === 0, '五张图里没有「两段文字相撞」、也没有曲线穿过文字',
    r.svgHit.length ? r.svgHit.join('；') : '0 处');

  /* 对账表 */
  ck(r.auditRows === 50, '对账表正好 50 行（与 docAudit() 的条数一致）', r.auditRows);
  const V = r.verdicts;
  ck(V.ok === 40 && V.diff === 4 && V.contra === 2 && V.na === 4,
    '屏上四档计数 = 40 / 4 / 2 / 4（读的是判定列的文字，不是源码）', JSON.stringify(V));
  ck(V.ok + V.diff + V.contra + V.na === r.auditRows, '四档相加 = 表行数（不重不漏）',
    (V.ok + V.diff + V.contra + V.na) + '/' + r.auditRows);

  /* 屏上的关键数 */
  const has = (s) => r.txt.indexOf(s) > 0;
  /* 🔴 不写死核验数（上一版写死 156／156，加了 O 段就假红一次）：从 _last-test.json 现读 */
  const TEST = JSON.parse(fs.readFileSync(path.join(DIR, '_last-test.json'), 'utf8'));
  const wantCnt = TEST.pass + '／' + TEST.total;
  ck(has(wantCnt), '核验总数从 _last-test.json 读出来（不是手写）', wantCnt + '｜' + has(wantCnt));
  ck(has('124') && has('258') && has('＝384'), '非回溯三笔账 124 ＋ 258 ＋ 2 ＝ 384 在屏上');
  ck(has('120') && has('91') && has('211'), '今本拆账 120 / 91 / 211 在屏上');
  ck(has('0.8959') || has('0.895880'), '我的熵率地板 ½·ln6 在屏上', (r.txt.match(/0\.8958[0-9]*/) || ['无'])[0]);
  ck(has('既济') && has('61/64'), '「六爻全当位的是既济」和「谦排 61/64」都在屏上');
  ck(has('95.2') && /0\.\d+σ/.test(r.txt), '95.2 的 σ 定位在屏上（说得清「差几个标准差」才叫口径对）',
    (r.txt.match(/0\.\d+σ/g) || ['无']).join(','));
  ck(has('2ca20846c06d') || has('2ca20846c06d'.slice(0, 8)), '源工件的 sha256 前 12 位在页面上（可回溯）');
  ck(has('undefined') === false && has('NaN') === false && has('${') === false,
    '整页无 undefined / NaN / 未插值占位符');
  ck(r.ovf.length === 0 && r.scrollW <= r.vw + 1, '1440 下无横向溢出', r.scrollW + '/' + r.vw + ' 出框：' + (r.ovf.join(',') || '无'));

  const linkOk = r.links.length === 2 && r.links.every((h) => h && fs.existsSync(path.join(DIR, h)));
  ck(linkOk, '两处互跳链接都指向真实存在的文件', r.links.join(','));
  ck(has('十四') && has('不是h2'), '「十四没有 h2」这个结构问题在屏上（§1 的表里）');

  /* 截图：三节 + 五图 */
  await shotTo(OUT + 'da_s0.png', await c.evalJs(BOX('§0', 1400)));
  await shotTo(OUT + 'da_s1.png', await c.evalJs(BOX('§1', 1700)));
  await shotTo(OUT + 'da_s2.png', await c.evalJs(BOX('§2', 2000)));
  await shotTo(OUT + 'da_s4.png', await c.evalJs(BOX('§4', 2200)));

  const figs = await c.evalJs('Array.prototype.slice.call(document.querySelectorAll("figure.fig")).map(function(f){'
    + 'var a=f.getBoundingClientRect();'
    + 'return {x:Math.max(0,a.left-8), y:a.top+window.scrollY-8, w:Math.min(a.width+16, 980), h:a.height+16};})');
  for (let i = 0; i < figs.length; i++) await shotTo(OUT + 'da_fig' + (i + 1) + '.png', figs[i]);
  ck(figs.length === 5, '五张图各自裁图（后续逐张肉眼核）', figs.length);

  /* 375 窄屏 */
  await c.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
  await c.navigate(F);
  await sleep(500);
  const m = await c.evalJs('(function(){var out=[],vw=document.documentElement.clientWidth;'
    + 'document.querySelectorAll("body *").forEach(function(el){var bb=el.getBoundingClientRect();'
    + 'if(bb.width<=0||bb.right<=vw+1) return;'
    + 'var p=el.parentElement,inScroll=false;'
    + 'while(p){var ox=getComputedStyle(p).overflowX; if(ox==="auto"||ox==="scroll"){inScroll=true;break;} p=p.parentElement;}'
    + 'if(!inScroll) out.push(el.tagName+"."+(el.className||"").toString().slice(0,24));});'
    + 'return {w:document.documentElement.scrollWidth,vw:vw,out:out.slice(0,8)};})()');
  ck(m.w <= m.vw + 1 && m.out.length === 0, '375px 页面级无横向溢出', m.w + '/' + m.vw + ' ' + m.out.join(','));

  const fg = await c.evalJs('(function(){var f=document.querySelector("figure.fig");if(!f)return null;'
    + 'var s=f.querySelector("svg");return {cw:f.clientWidth,sw:f.scrollWidth,ox:getComputedStyle(f).overflowX,'
    + 'svgW:s.getBoundingClientRect().width};})()');
  ck(fg && fg.ox === 'auto' && fg.svgW >= 599,
    '375 下五张图改成容器内横滚（不是把 11px 字压成 5px）',
    fg ? ('overflowX=' + fg.ox + ' svgW=' + fg.svgW.toFixed(0) + ' ' + fg.sw + '/' + fg.cw) : '未找到');

  await shotTo(OUT + 'da_375.png', await c.evalJs(BOX('§0', 1100)));

  console.log('\n' + '─'.repeat(58));
  console.log('检查 ' + n + ' 项：PASS ' + (n - bad) + ' / FAIL ' + bad);
  c.close();
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('探针崩了：' + e.message); process.exit(2); });
