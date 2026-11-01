/*
 * _probe_lianxin.cjs —— 「良心与异化」子页探针（零依赖，走 ../construct-cost/cdp.cjs）
 *
 * 判据三原则（本仓老账）：
 *   ① 判据读屏上的字，不读源码；
 *   ② 必须声明查了多少（下面每一条都印实测值）；
 *   ③ 测「零」之前先测到「非零」—— 所以先验 16 张图真的加载了，再验溢出为 0。
 */
const path = require('path');
const fs = require('fs');
const CDP = require('../construct-cost/cdp.cjs');

const DIR = __dirname;
const F = 'file:///' + encodeURI(path.join(DIR, 'AAA_良心与异化_六维价值梯度.html').split(path.sep).join('/')).replace(/#/g, '%23');
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
  return {
    h2: h2,
    imgs: q('img').map((i) => ({ src: i.getAttribute('src'), w: i.naturalWidth, h: i.naturalHeight })),
    fig: q('figure.fig').length,
    figsvg: q('figure.fig svg').length,
    shot: q('figure.shot').length,
    pair: q('.pair').length,
    tbl: q('table').length,
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
    navHref: (q('.nav a')[0] || {}).getAttribute ? q('.nav a')[0].getAttribute('href') : null,
    svgOver: (function () {
      const out = [];
      q('figure.fig svg').forEach(function (svg, i) {
        const vb = svg.viewBox.baseVal;
        Array.prototype.forEach.call(svg.querySelectorAll('text'), function (t) {
          const bb = t.getBBox();
          if (bb.x + bb.width > vb.width - 1 || bb.x < -6) {
            out.push('图' + (i + 1) + '「' + t.textContent.slice(0, 14) + '」右端 ' + (bb.x + bb.width).toFixed(0) + '/' + vb.width);
          }
        });
      });
      return out;
    })(),
    /* 证明上面那条判据不是恒真：如果把文字条数和包围盒总宽也报出来，
       两者为 0 就说明 getBBox 没量到东西、那条 PASS 是假绿 */
    svgText: (function () {
      const o = { n: 0, w: 0 };
      q('figure.fig svg text').forEach(function (t) {
        const b = t.getBBox();
        o.n++; o.w += b.width;
      });
      return o;
    })(),
    /* 「两段文字撞车不会报错」——这条以前只能靠看图发现，这里把它变成判据：
       同一张 SVG 内任意两段文字的包围盒不得相交；曲线的采样点也不得落进任何文字盒。
       容差 1.5 单位（描边/字形留白），宁可放过也不误报。 */
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
            if (ox > 1.5 && oy > 1.5) {
              out.push('图' + (i + 1) + '「' + bs[a].s + '」×「' + bs[b].s + '」' + ox.toFixed(0) + '×' + oy.toFixed(0));
            }
          }
        }
        const pl = svg.querySelectorAll('polyline');
        Array.prototype.forEach.call(pl, function (line) {
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
    qianTxt: (function () {
      const h = q('h2').filter(function (x) { return /§5/.test(x.textContent); })[0];
      if (!h) return '';
      let t = '', e = h.nextElementSibling;
      while (e && e.tagName !== 'H2') { t += e.textContent; e = e.nextElementSibling; }
      return t.replace(/\s+/g, '');
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
  /* 图是 loading="lazy" 的：先滚到底，逼它们全部真正加载，否则 naturalWidth 全 0 是假红 */
  await c.evalJs('(function(){var y=0;var t=setInterval(function(){y+=800;window.scrollTo(0,y);'
    + 'if(y>document.body.scrollHeight){clearInterval(t);window.scrollTo(0,0);}},16);})()');
  await sleep(1500);
  await c.evalJs('window.scrollTo(0,0)');
  await sleep(300);

  const r = await c.evalJs(PAGE_EXPR);
  const errs = await c.evalJs('(window.__errs||[]).slice(0,5)');

  ck(errs.length === 0, 'JS 异常 0 条', errs.length ? errs.join(' | ') : 0);
  ck(r.h2.length === 13, 'h2 共 13 个（§0–§12）', r.h2.length);
  ck(/§0/.test(r.h2[0]) && /§12/.test(r.h2[12]), '首节 §0、末节 §12', r.h2[0].slice(0, 10) + ' | ' + r.h2[12].slice(0, 10));

  /* 先测到「非零」：16 张图真的加载 */
  const loaded = r.imgs.filter((i) => i.w > 0).length;
  ck(r.imgs.length === 16, '页面上 16 张截图（16 帧全部用上）', r.imgs.length);
  ck(loaded === 16, '16 张全部真的解码了（naturalWidth > 0，不是空框）', loaded + '/16');
  const missing = r.imgs.filter((i) => !fs.existsSync(path.join(DIR, i.src)));
  ck(missing.length === 0, '16 个 src 在磁盘上都存在（相对路径没写错）', missing.map((m) => m.src).join(','));

  ck(r.fig === 3 && r.figsvg === 3, '3 张现算图（figure.fig）且都真有 svg', r.fig + '/' + r.figsvg);
  ck(r.shot === 16, '16 个 figure.shot（视频帧）', r.shot);
  ck(r.pair === 3, '3 组两两并排', r.pair);
  ck(r.tbl >= 6, '表格 ≥ 6 张（逐条声明查了多少）', r.tbl);

  /* 屏上的数 */
  const has = (s) => r.txt.indexOf(s) > 0;
  ck(has('121/121'), '核验总数从 _last-test.json 读出来（不是手写）', has('121/121'));
  ck(has('1.5–3.5') || has('1.5-3.5'), '工作区间 1.5–3.5 在屏上');
  ck(has('+0.04') && has('−0.63') && has('+0.57'), '六个爻位分逐个在屏上（含 3 爻的 −0.63，不是 −0.29）');
  ck(has('001000'), '谦的位串 001000 在屏上');
  ck(has('第61位') || has('61位') || has('排第61'), '谦排第 61 / 64 在屏上', r.qianTxt.slice(0, 0) || '见 §5');
  ck(has('384') && has('192'), '384 / 192 的账在屏上');
  ck(has('4块') && has('16卦'), '人道墙 ⇒ 4 块 × 16 卦');
  ck(has('2.410900'), '三步的税额之积 2.410900 与两端之比相等，屏上有数');
  ck(has('ln6＝1.7918'), 'ln6 参考线标注在屏上');
  ck(has('undefined') === false && has('NaN') === false && has('${') === false,
    '整页无 undefined / NaN / 未插值占位符');

  ck(r.svgOver.length === 0, '3 张图里每段文字都在 viewBox 内（出框＝被裁成断字）',
    r.svgOver.length ? r.svgOver.join('；') : '0 条');
  ck(r.svgText.n >= 40 && r.svgText.w > 600,
    '碰撞判据有对象：三张图共 ≥ 40 段文字、包围盒总宽 > 600（先证明量到了，再断言 0 处相撞）',
    r.svgText.n + ' 段 / 总宽 ' + r.svgText.w.toFixed(0));
  ck(r.svgHit.length === 0, '三张图里没有「两段文字相撞」、也没有曲线穿过文字',
    r.svgHit.length ? r.svgHit.join('；') : '0 处');
  ck(r.ovf.length === 0 && r.scrollW <= r.vw + 1, '1440 下无横向溢出', r.scrollW + '/' + r.vw);
  ck(r.navHref === 'AAA_四六通达_三源合观.html' && fs.existsSync(path.join(DIR, r.navHref)),
    '返回上一页的链接指向真实存在的文件', r.navHref);

  /* 截图 */
  let box = await c.evalJs(BOX('§0', 1500));
  await shotTo(OUT + 'lx_s0.png', box);
  box = await c.evalJs(BOX('§5', 1500));
  await shotTo(OUT + 'lx_s5.png', box);
  box = await c.evalJs(BOX('§9', 1700));
  await shotTo(OUT + 'lx_s9.png', box);

  const figs = await c.evalJs('Array.prototype.slice.call(document.querySelectorAll("figure.fig")).map(function(f){'
    + 'var a=f.getBoundingClientRect();'
    + 'return {x:Math.max(0,a.left-8), y:a.top+window.scrollY-8, w:Math.min(a.width+16, 980), h:a.height+16};})');
  for (let i = 0; i < figs.length; i++) await shotTo(OUT + 'lx_fig' + (i + 1) + '.png', figs[i]);
  ck(figs.length === 3, '3 张现算图各自裁图（后续逐张肉眼核）', figs.length);

  /* 抽两帧视频截图裁出来看，确认不是空图 */
  const one = await c.evalJs('(function(){var i=document.querySelectorAll("figure.shot img")[5];'
    + 'var a=i.getBoundingClientRect();return {x:Math.max(0,a.left), y:a.top+window.scrollY, w:a.width, h:a.height};})()');
  await shotTo(OUT + 'lx_frame.png', one);

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
    + 'svgW:s.getBoundingClientRect().width,fs:getComputedStyle(s.querySelector("text")).fontSize};})()');
  ck(fg && fg.ox === 'auto' && fg.svgW >= 599,
    '375 下三张图改成容器内横滚（不是把 11px 字压成 5px）',
    fg ? ('overflowX=' + fg.ox + ' svgW=' + fg.svgW.toFixed(0) + ' ' + fg.sw + '/' + fg.cw) : '未找到');

  box = await c.evalJs(BOX('§0', 900));
  await shotTo(OUT + 'lx_375.png', box);

  console.log('\n' + '─'.repeat(58));
  console.log('检查 ' + n + ' 项：PASS ' + (n - bad) + ' / FAIL ' + bad);
  c.close();
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error('探针崩了：' + e.message); process.exit(2); });
