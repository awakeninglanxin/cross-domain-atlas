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
/* 大纲与状态词都从 score.cjs 读 —— 探针里再抄一份，就成了第二份真相。 */
const SCORE = require('./score.cjs');
const SC = SCORE(J, TOTAL);
const ST_ZH = SCORE.ST_ZH;

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
    /* 十二个字的雷达（最后一张图）：顶点半径是不是真的按分数画的，屏上的字和图的形对不对得上。
     * 圆心不写死：用最内那圈六边形的顶点重心反推，外框半径取最外那圈 —— 换版式也不会假红。 */
    radar: (function () {
      const figs = q('figure.fig');
      const f = figs[figs.length - 1];
      if (!f) return null;
      const svg = f.querySelector('svg');
      const poly = Array.prototype.slice.call(svg.querySelectorAll('polygon'));
      if (poly.length < 3) return { n: 0 };
      const pts = poly.map(function (p) {
        return (p.getAttribute('points') || '').trim().split(/\s+/).map(function (s) {
          const xy = s.split(',').map(Number); return { x: xy[0], y: xy[1] };
        }).filter(function (o) { return isFinite(o.x) && isFinite(o.y); });
      });
      const rings = pts.slice(0, pts.length - 2);        /* 前几圈是刻度环，最后两条才是数据 */
      const data = pts.slice(pts.length - 2);
      const cen = rings[0].reduce(function (a, p) { return { x: a.x + p.x / rings[0].length, y: a.y + p.y / rings[0].length }; }, { x: 0, y: 0 });
      const out = rings[rings.length - 1].map(function (p) { return Math.hypot(p.x - cen.x, p.y - cen.y); });
      const outR = Math.max.apply(null, out);
      const dist = function (p) { return Math.hypot(p.x - cen.x, p.y - cen.y) / outR; };
      const labels = Array.prototype.slice.call(svg.querySelectorAll('text')).map(t2)
        .map(function (s) { const m = s.match(/^(\S+?)(\d+)\s*\/\s*10$/); return m ? { zh: m[1], score: Number(m[2]) } : null; })
        .filter(Boolean);
      return {
        n: labels.length, labels: labels,
        ratio: data.length ? data[0].map(dist) : [],
        ratioOwn: data.length > 1 ? data[1].map(dist) : [],
        tbl: (function () {
          const t = q('table.t').filter(function (x) {
            const th = x.querySelector('thead tr'); return th && /只算自改/.test(th.textContent);
          })[0];
          if (!t) return null;
          const rows = Array.prototype.slice.call(t.querySelectorAll('tbody tr'));
          const o = { rows: [], total: null, own: null };
          rows.forEach(function (tr) {
            const td = tr.querySelectorAll('td');
            if (td.length < 3) return;
          /* 🔴 别把 "20／60" 里的数字都抠出来拼成 2060 —— 只取第一个整数。 */
          const num = function (el) { const m = String(el.textContent).match(/-?\d+/); return m ? Number(m[0]) : NaN; };
            if (/合计/.test(t2(td[0]))) { o.total = num(td[1]); o.own = num(td[2]); }
            else o.rows.push({ zh: t2(td[0]), score: num(td[1]), own: num(td[2]) });
          });
          return o;
        })(),
      };
    })(),
    vw: document.documentElement.clientWidth,
    scrollW: document.documentElement.scrollWidth,
    /* 置顶大纲：六张卡片 + 四档图例 + 底部那句话。判据只读屏上的字。 */
    plan: (function () {
      const el = document.querySelector('.plan');
      if (!el) return null;
      const h2 = document.querySelector('h2');
      const cards = Array.prototype.slice.call(el.querySelectorAll('.pc'));
      return {
        n: cards.length,
        /* 4 = DOCUMENT_POSITION_FOLLOWING：§0 在它后面 ⇒ 它确实在页面最前 */
        before0: !!(h2 && (el.compareDocumentPosition(h2) & 4)),
        rule: ((el.querySelector('.plan-rule') || {}).textContent || '').replace(/\s+/g, ' ').trim(),
        keyN: el.querySelectorAll('.plan-key span').length,
        cards: cards.map(function (x) {
          const g = function (s) {
            const e = x.querySelector(s);
            return e ? e.textContent.replace(/\s+/g, ' ').trim() : null;
          };
          return {
            st: x.getAttribute('data-st'), zh: g('.zh'), badge: g('.st'), ev: g('.ev'),
            clipped: x.scrollHeight > x.clientHeight + 1 || x.scrollWidth > x.clientWidth + 1,
          };
        }),
        /* §9.4 那张表的「现状」列 —— 和置顶卡片必须是同一份数据的两个视图 */
        t94: (function () {
          const t = Array.prototype.slice.call(document.querySelectorAll('table.t')).filter(function (x) {
            const th = x.querySelector('thead tr');
            return th && /验收判据/.test(th.textContent);
          })[0];
          if (!t) return null;
          return Array.prototype.slice.call(t.querySelectorAll('tbody tr')).map(function (tr) {
            const td = tr.querySelectorAll('td');
            return {
              step: td[0].textContent.replace(/\s+/g, ''),
              zh: td[1].textContent.replace(/\s+/g, ''),
              badge: td[4] ? td[4].textContent.replace(/\s+/g, ' ').trim() : '',
            };
          });
        })(),
      };
    })(),
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

  /* 口径变更（2026-11-02）：达真从 5 降到 1，屏上的话必须跟着改 —— 只改数不改字就是两份真相。
   * 旧总分由同一批数现算，不手写；判据读的是屏上的字。 */
  const OLD_TOTAL = SC.total + (Math.round((SC.auditScore + SC.truthIn) / 2) - SC.truthIn);
  ck(/口径变更/.test(r.txt) && /审计者的能力不能记到被审计者头上/.test(r.txt) &&
    /不计入本尺/.test(r.txt) &&
    r.txt.indexOf(OLD_TOTAL + '／' + SC.max) >= 0 && r.txt.indexOf(SC.total + '／' + SC.max) >= 0,
    '屏上有口径变更说明：达真降分后话跟着改（旧 ' + OLD_TOTAL + '／' + SC.max +
    ' → 新 ' + SC.total + '／' + SC.max + '，且写明外部审计不计入本尺）',
    '口径变更段 + 达真 evid');

  console.log('=== 置顶大纲（十二个字六条） ===');
  const P = r.plan;
  ck(!!P, '页面顶部真有置顶大纲这块（没有就是没做，不是藏在 §9 就算）', P ? '有' : '没有');
  if (P) {
    ck(P.before0, '它在 §0 之前（前置，不是放在第九节里）', P.before0 ? '在 §0 前' : '在 §0 后');
    ck(P.n === SC.plan.length, '六步一条不少（' + SC.plan.length + ' 张卡片）', P.n);

    /* 逐张核：字、状态码、徽章文字，三样都必须和 score.cjs 对得上 */
    const differ = [];
    SC.plan.forEach((p, i) => {
      const c = P.cards[i] || {};
      if (c.zh !== p.zh) differ.push('第' + (i + 1) + '张字是' + c.zh + '，应为' + p.zh);
      if (c.st !== p.st) differ.push(p.zh + '状态码' + c.st + '≠' + p.st);
      if (c.badge !== ST_ZH[p.st]) differ.push(p.zh + '徽章「' + c.badge + '」≠「' + ST_ZH[p.st] + '」');
    });
    ck(differ.length === 0, '六张卡的字/状态码/徽章三样逐张与 score.cjs 一致',
      differ.length ? differ.join('；') : SC.plan.length + '/' + SC.plan.length);

    /* 状态分布：这不是写死数字，是从同一份 plan 数出来的 */
    const cnt = (k) => SC.plan.filter((p) => p.st === k).length;
    const got = (k) => P.cards.filter((c) => c.st === k).length;
    const dist = ['done', 'ready', 'outside', 'none'].every((k) => cnt(k) === got(k));
    ck(dist, '四档的条数与 plan 相同（已成立 ' + cnt('done') + '／改法已定 ' + cnt('ready') +
      '／待外部 ' + cnt('outside') + '／没做 ' + cnt('none') + '）',
      ['done', 'ready', 'outside', 'none'].map((k) => got(k)).join('/'));
    ck(cnt('done') === 1, '「已成立」只有一条 —— 多一条就是给自己发安慰分', cnt('done'));

    ck(P.cards.every((c) => !c.clipped), '六张卡里没有被裁掉的内容（scrollHeight ≤ clientHeight）',
      P.cards.filter((c) => c.clipped).map((c) => c.zh).join(',') || '0 张');

    ck(P.keyN === 4, '四档图例四组都在（读得到才叫解释）', P.keyN + ' 组');
    ck(/未做/.test(P.rule) && /部分实现/.test(P.rule),
      '屏上写明了这条规矩：找不到数写「未做」，不写「部分实现」', P.rule.slice(0, 24) + '…');

    /* 归纳那一条既然叫「已成立」，它的依据里必须真有数 */
    const ev0 = (P.cards[0] || {}).ev || '';
    ck(/[eE]\+0/.test(ev0), '「已成立」那条的依据里真有数（不是一句形容词）', ev0);

    /* 同一份数据的两个视图必须对得上：置顶卡片 vs §9.4 表格 */
    const T = P.t94 || [];
    const cross = [];
    SC.plan.forEach((p, i) => {
      const row = T[i] || {};
      if (row.zh !== p.zh) cross.push('第' + (i + 1) + '行字是' + row.zh);
      if (row.badge !== ST_ZH[p.st]) cross.push(p.zh + '表里「' + row.badge + '」≠卡片「' + ST_ZH[p.st] + '」');
    });
    ck(T.length === SC.plan.length && cross.length === 0,
      '§9.4 表格 ' + SC.plan.length + ' 行的现状与置顶卡片逐条一致（一页只有一份真相）',
      cross.length ? cross.join('；') : T.length + ' 行全对');
  }

  /* 先测到非零 */
  /* 🔴 不许写死图数（加第 5 张立刻假红 —— 上一轮已经在链接条数上踩过一次） */
  ck(r.fig >= 4 && r.figsvg === r.fig, '每张现算图都真有 svg（张数不写死，' + r.fig + ' 张）', r.fig + '/' + r.figsvg);
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

  /* §9 十二个字：六个字必须都在屏上（少一个就说明表被裁了） */
  const six = ['归纳', '演绎', '选美', '尽善', '达真', '通天'];
  const miss6 = six.filter((k) => t.indexOf(k) < 0);
  ck(miss6.length === 0, '§9 六个字都在屏上（归纳/演绎/选美/尽善/达真/通天）',
    miss6.length ? '缺 ' + miss6.join(',') : '6/6');
  /* 两个熵必须分开报：屏上同时出现 4.00（C）与 2.20（A），只报一个就说明又被合并了 */
  /* 探针里只有 f3/i0，没有 f2 —— 页面那格是两位小数，用 toFixed(2) 对齐，别再造一个 format */
  const p2 = (x) => x.toFixed(2);
  ck(t.indexOf(p2(G.C.stats.HpiAll)) > 0 && t.indexOf(p2(G.A.stats.HpiAll)) > 0,
    '驻留熵两个值都在屏上（不自改 ' + p2(G.C.stats.HpiAll) + ' / 自改 ' + p2(G.A.stats.HpiAll) + '）',
    t.indexOf(p2(G.C.stats.HpiAll)) + '/' + t.indexOf(p2(G.A.stats.HpiAll)));
  /* 「变窄 ≠ 归纳」那句结论必须在屏上，否则这一节的结论等于没写 */
  ck(t.indexOf('它没有学会归纳') > 0, '「不算归纳，是偏食」的结论在屏上', t.indexOf('它没有学会归纳'));

  /* 🔴 合计必须等于分项之和。上一版页面写「合计 62」，而表里七项只有 40 ——
   *    没有任何断言管这件事，所以它一直错着。现在这条直接读屏上的表格算。 */
  ck(r.scoreSum.n === 7 && r.scoreSum.total === r.scoreSum.sum && r.scoreSum.sum > 0,
    '§8 自评表的合计 = ' + r.scoreSum.n + ' 个分项之和（防手写合计）',
    r.scoreSum.sum + ' vs ' + r.scoreSum.total);

  /* ---- 十二个字：雷达的形必须等于屏上的字 ----
   * 这一组专门防「图是手画的、表是另算的」：分来自 score.cjs，但这里不读 score.cjs，
   * 只读**屏上印出来的字**和**真实 polygon 坐标**，两边不一致就红。 */
  const RD = r.radar || {};
  const LAB = RD.labels || [];
  const TBL = RD.tbl;
  ck(RD.n === 6, '雷达 6 个轴都带分数（读屏上的字，不数路径）', RD.n + ' 轴');

  const dev = LAB.map((L, i) => Math.abs((RD.ratio[i] || 0) * 10 - L.score));
  ck(LAB.length === 6 && dev.length === 6 && dev.every((d) => d < 0.02),
    '实线顶点半径 = 屏上写的分数 / 10（逐轴算，最大偏差 < 0.02）',
    dev.map((d) => d.toFixed(3)).join(','));

  const devO = (TBL ? TBL.rows : []).map((row, i) => Math.abs((RD.ratioOwn[i] || 0) * 10 - row.own));
  ck(devO.length === 6 && devO.every((d) => d < 0.02),
    '虚线顶点半径 = 表里「只算自改」那一列 / 10（逐轴算）',
    devO.map((d) => d.toFixed(3)).join(','));

  ck(!!TBL && TBL.rows.length === LAB.length &&
    TBL.rows.every((row, i) => row.zh === LAB[i].zh && row.score === LAB[i].score),
    '表里每行的分 = 雷达同一轴的分（逐行核，两处不许各说一套）',
    TBL ? TBL.rows.map((x) => x.zh + x.score).join(' ') : 'null');

  ck(!!TBL && TBL.total === TBL.rows.reduce((a, b) => a + b.score, 0) &&
    TBL.own === TBL.rows.reduce((a, b) => a + b.own, 0),
    '合计 = 分项之和（实有与「只算自改」两列都核）',
    TBL ? TBL.total + ' / ' + TBL.own : 'null');

  ck(!!TBL && TBL.rows.every((x) => x.own <= x.score) && TBL.total > TBL.own,
    '「只算自改」逐行不超过实有，合计严格更少（不成立就等于说自己挣的分是白送的）',
    TBL ? '差 ' + (TBL.total - TBL.own) : 'null');

  const uniq = new Set(LAB.map((x) => x.score)).size;
  ck(uniq >= 3, '六个轴的分不是同一个数（>1 档才有区分力，防死表）', uniq + ' 个不同值');

  const zeros = LAB.filter((x) => x.score === 0).map((x) => x.zh);
  const zeroTxt = zeros.length ? zeros.length + '处0：' + zeros.join('、') : '没有0分轴';
  ck(r.txt.indexOf(zeroTxt) >= 0, '屏上标 0 分的轴，和实际 0 分轴逐个对上',
    zeros.length + ' 处（' + zeros.join('、') + '）');

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

  /* 截图：置顶大纲 + 两节 + 每张图 + 375 */
  const shots = [];
  const planBox = await c.evalJs('(function(){var e=document.querySelector(".plan");if(!e)return null;var b=e.getBoundingClientRect();return{x:0,y:Math.max(0,b.top+scrollY-8),w:document.documentElement.clientWidth,h:b.height+16};})()');
  if (planBox) { await shotTo(OUT + 'cr_plan.png', planBox); shots.push('cr_plan.png'); }
  for (const [f, re, h] of [
    ['cr_s0.png', '§1', 1500],
    ['cr_s2.png', '§2', 1300],
  ]) {
    const box = await c.evalJs(BOX(re, h));
    if (box) { await shotTo(OUT + f, box); shots.push(f); }
  }
  for (let i = 1; i <= r.fig; i++) {
    const box = await c.evalJs('(function(i){var fs=document.querySelectorAll("figure.fig");var f=fs[i-1];if(!f)return null;var b=f.getBoundingClientRect();return {x:0,y:Math.max(0,b.top+scrollY-6),w:document.documentElement.clientWidth,h:b.height+14};})(' + i + ')');
    if (box) { await shotTo(OUT + 'cr_fig' + i + '.png', box); shots.push('cr_fig' + i + '.png'); }
  }
  const wantShots = (r.plan ? 1 : 0) + 2 + r.fig;
  ck(shots.length === wantShots,
    '截图 ' + wantShots + ' 张（置顶大纲 + 2 节 + ' + r.fig + ' 图，张数跟着页面走）', shots.join(','));

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
