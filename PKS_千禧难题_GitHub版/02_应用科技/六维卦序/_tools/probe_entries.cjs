/*
 * probe_entries.cjs —— 三个总入口页的验收探针（零依赖，走 ../../construct-cost/cdp.cjs）
 *
 * 验的是 D:/AAA我的文件 根下这三页：
 *   AAA_双门入口_分享版.html / AAA_演讲入口_60分钟.html / AAA_跨界总入口_总网页.html
 * 用法：node _tools/probe_entries.cjs      （截图落在 %TEMP%/en_*.png）
 *
 * 判据三原则：读屏上的字；声明查了多少；测「零」之前先测到「非零」。
 *
 * 两个写错过的判据，留在这里当例子：
 *   ① 整页查 "NaN" 会假红 —— 总网页第 258 行本来就写着「原脚本会出 NaN / 开方为负」，
 *      所以只许查「新插入的那一段」（#m11 到 #m12 之间）。
 *   ② 演讲页默认 30 分钟是对的，拿「标题里有 60 分钟」当判据必假红 ——
 *      正确判法是真去点一下「60 分钟」按钮，再看标题重算没有。
 */
const path = require('path');
const fs = require('fs');
const CDP = require('../../construct-cost/cdp.cjs');

const ROOT = 'D:/AAA我的文件';
const OUT = 'C:/Users/ThinkPad/AppData/Local/Temp/';
const sleep = CDP.sleep;
const F = (f) => 'file:///' + encodeURI(path.join(ROOT, f).split(path.sep).join('/')).replace(/#/g, '%23');

const PAGES = {
  both: 'AAA_双门入口_分享版.html',
  talk: 'AAA_演讲入口_60分钟.html',
  all: 'AAA_跨界总入口_总网页.html',
};

let n = 0, bad = 0;
function ck(ok, label, got) {
  n++;
  if (!ok) { bad++; console.log('  FAIL  ' + label + (got !== undefined ? '   实测 ' + got : '')); }
  else console.log('  PASS  ' + label + (got !== undefined ? '   [' + got + ']' : ''));
}

const COLLECT = '(' + function () {
  const q = (s) => Array.prototype.slice.call(document.querySelectorAll(s));
  const txt = document.body.textContent.replace(/\s+/g, '');
  const rel = (a) => a.getAttribute('href') || '';
  return {
    txt: txt,
    vw: document.documentElement.clientWidth,
    scrollW: document.documentElement.scrollWidth,
    h2: q('h2').map((h) => ({ id: h.id, t: h.textContent.replace(/\s+/g, ' ').trim() })),
    toc: q('.toc a').map((a) => rel(a)),
    hrefs: q('a').map(rel),
    grpExist: !!document.getElementById('grpYijing'),
    yjCards: (function () {
      const g = document.getElementById('grpYijing');
      if (!g) return [];
      /* grp 后面紧跟的那一组卡片 */
      let e = g.nextElementSibling;
      while (e && !e.classList.contains('cards')) e = e.nextElementSibling;
      return e ? Array.prototype.slice.call(e.querySelectorAll('a.card')).map((a) => ({
        href: a.getAttribute('href'),
        title: (a.querySelector('h2') || {}).textContent || '',
      })) : [];
    })(),
    quick: q('.quick .grid a').map((a) => ({ h: rel(a), t: a.textContent.replace(/\s+/g, '') })),
    li: q('li').length,
    starLi: q('li a.pg').map((a) => ({
      href: a.getAttribute('href'),
      ttl: ((a.querySelector('.ttl') || {}).textContent || '').replace(/\s+/g, ''),
      all: a.textContent.replace(/\s+/g, ''),
    })),
    title: document.title,
    /* 新组区块（#m11 到 #m12 之间）的正文：判「无占位符」只许查这一段。
       整页查 NaN 会假红 —— 原文第 258 行本来就有「原脚本会出 NaN / 开方为负」这句话。 */
    m11txt: (function () {
      const h = document.getElementById('m11');
      if (!h) return '';
      let t = '', e = h.nextElementSibling;
      while (e && e.id !== 'm12') { t += e.textContent; e = e.nextElementSibling; }
      return t.replace(/\s+/g, '');
    })(),
    idxRows: q('table.idx tbody tr').length,
  };
} + ')()';

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
  const openPage = async (f) => {
    await c.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await c.send('Page.addScriptToEvaluateOnNewDocument', {
      source: 'window.__errs=[];addEventListener("error",function(e){window.__errs.push(String(e.message))});',
    });
    await c.navigate(F(f));
    await c.evalJs('(function(){var y=0;var t=setInterval(function(){y+=900;window.scrollTo(0,y);'
      + 'if(y>document.body.scrollHeight){clearInterval(t);window.scrollTo(0,0);}},12);})()');
    await sleep(1200);
    await c.evalJs('window.scrollTo(0,0)');
    await sleep(200);
    return c.evalJs(COLLECT);
  };
  const exists = (h) => {
    if (!h || /^https?:|^#|^mailto:/.test(h)) return true;
    return fs.existsSync(path.join(ROOT, decodeURI(h.split('#')[0])));
  };

  /* ==================== 一、总网页 ==================== */
  console.log('\n=== 总网页 AAA_跨界总入口_总网页.html ===');
  let r = await openPage(PAGES.all);
  let errs = await c.evalJs('(window.__errs||[]).slice(0,5)');
  ck(errs.length === 0, 'JS 异常 0 条', errs.join(' | ') || 0);
  ck(r.h2.length === 13, 'h2 共 13 个（m0–m12）', r.h2.length);
  ck(r.h2.map((x) => x.id).join(',') === 'm0,m1,m2,m3,m4,m5,m6,m7,m8,m9,m10,m11,m12',
    'h2 的 id 顺序连续 m0…m12', r.h2.map((x) => x.id).join(','));
  ck(/六维卦序/.test(r.h2[11].t), '第 11 组就是「六维卦序」', r.h2[11].t.slice(0, 30));
  ck(/怎么读这一页/.test(r.h2[12].t), '「怎么读这一页」顺延为第 12 组（没被顶掉）', r.h2[12].t.slice(0, 26));
  ck(r.toc.length === 13, '页内目录 13 条', r.toc.length);
  ck(r.toc.join(',') === '#m0,#m1,#m2,#m3,#m4,#m5,#m6,#m7,#m8,#m9,#m10,#m11,#m12',
    '目录锚点与正文 h2 逐项对应（目录是手写的，最容易烂）', r.toc.join(','));
  ck(r.toc[11] === '#m11' && r.toc[12] === '#m12', '目录第 11/12 条指向 m11/m12', r.toc.slice(11).join(' '));

  const yj = r.hrefs.filter((h) => /六维卦序/.test(h));
  ck(yj.length >= 4, '正文里指向六维卦序的链接 ≥ 4 条（四页都被链上）', yj.length);
  const yjMissing = yj.filter((h) => !exists(h));
  ck(yjMissing.length === 0, '这些链接指向的文件在磁盘上都存在', yjMissing.join(',') || '0 条缺失');
  ck(r.txt.includes('13组·140个页面') || (r.txt.includes('13 组') && r.txt.includes('140')),
    '页头/页尾统计已更新为 13 组 140 页', r.txt.match(/1[23]\s*组[^。]{0,12}/) ? '命中' : '未命中');
  ck(r.txt.includes('46080'), 'Q₆ 自同构群 46080 在屏上');
  ck(r.txt.includes('0.895880'), '熵率地板 ½·ln6 = 0.895880 在屏上');
  /* 先测到「非零」：新组区块真的抓到正文，再断言里面没有占位符 */
  ck(r.m11txt.length > 800, '新组区块抓到了正文（才 好判占位符）', r.m11txt.length + ' 字');
  ck(!/undefined|NaN|\$\{/.test(r.m11txt), '🔴 新组区块内无 undefined / NaN / 未插值占位符（整页不判——原文本来就有「NaN」一词）',
    (r.m11txt.match(/undefined|NaN|\$\{/g) || []).join(',') || '0 处');
  /* v11 新写的 cRSI 结论必须真的在屏上（读字，不读源码） */
  ck(r.m11txt.includes('最新（v11，§9.6）') && r.m11txt.includes('17/60'),
    'cRSI 卡片写着 v11 最新口径 17 / 60（去空白后是 17/60）',
    r.m11txt.includes('17/60') ? '命中' : '未命中');
  ck(r.m11txt.includes('3个过、3个挡') && r.m11txt.includes('信噪比只有1.30'),
    '通天写清「3 个过、3 个挡」且点出被挡的假绿信噪比 1.30',
    r.m11txt.includes('信噪比只有') ? '命中' : '未命中');
  ck(r.m11txt.includes('会反向骗人') && r.m11txt.includes('63个独立点'),
    '达真写清「单点绝对锚会反向骗人」与「需 63 个独立点」',
    r.m11txt.includes('反向骗人') ? '命中' : '未命中');
  ck(r.m11txt.includes('这一组的四页'), '组标题写「四页」（不是三页）',
    (r.m11txt.match(/这一组的[三四]页/) || ['未找到'])[0]);
  ck(r.m11txt.includes('（下表最后一行）'), '「挑自己的错」指向表格最后一行（加了 cRSI 后不能还写「第三页」）',
    (r.m11txt.match(/下表第[一二三四五]页|下表最后一行/) || ['未找到'])[0]);
  ck(r.scrollW <= r.vw + 1, '1440 下无页面级横向溢出', r.scrollW + '/' + r.vw);

  /* 锚点真的能跳 */
  await c.evalJs('location.hash="m11"');
  await sleep(400);
  const jump = await c.evalJs('(function(){var e=document.getElementById("m11");'
    + 'var a=e.getBoundingClientRect();return {top:Math.round(a.top), docY:Math.round(a.top+window.scrollY)};})()');
  ck(jump.docY > 1000, '点 #m11 真的落在新组位置上（不是页顶）', 'y=' + jump.docY);
  await c.evalJs('window.scrollTo(0,0)');
  await sleep(200);

  const bAll = await c.evalJs('(function(){var e=document.getElementById("m11");'
    + 'var a=e.getBoundingClientRect();return {x:0,y:Math.max(0,a.top+window.scrollY-10),w:1440,h:1500};})()');
  await shotTo(OUT + 'en_all_m11.png', bAll);
  const bAll2 = await c.evalJs('(function(){var e=document.getElementById("m11");'
    + 'var t=e.nextElementSibling;return {x:0,y:Math.max(0,t.getBoundingClientRect().top+window.scrollY),w:1440,h:1400};})()');
  await shotTo(OUT + 'en_all_m11b.png', bAll2);

  /* ==================== 二、双门入口 ==================== */
  console.log('\n=== 双门入口 AAA_双门入口_分享版.html ===');
  r = await openPage(PAGES.both);
  errs = await c.evalJs('(window.__errs||[]).slice(0,5)');
  ck(errs.length === 0, 'JS 异常 0 条', errs.join(' | ') || 0);
  ck(r.grpExist, '新分组 #grpYijing 存在', r.grpExist);
  ck(r.yjCards.length >= 4, '该组下面至少 4 张卡（先测到非零，不写死「恰好」）', r.yjCards.length);
  const cyj = r.yjCards.map((x) => x.href);
  ck(cyj.length > 0 && cyj.every((h) => /六维卦序/.test(h)), '每张卡都指向六维卦序目录', cyj.length);
  ck(cyj.filter((h) => !exists(h)).length === 0, '所有 href 在磁盘上都存在', cyj.filter((h) => !exists(h)).join(',') || '0 缺失');
  const ttl = r.yjCards.map((x) => x.title.replace(/\s+/g, '')).join('|');
  ck(/四六通达/.test(ttl) && /良心与异化/.test(ttl) && /合观校核/.test(ttl) && /cRSI/.test(ttl),
    '四张卡分别是 四六通达 / 良心与异化 / cRSI / 合观校核', ttl.slice(0, 80));
  ck(r.txt.includes('四张卡'), '组说明写「四张卡」（不是三张）',
    r.txt.includes('三张卡') ? '仍写着三张卡' : r.txt.includes('四张卡') ? '命中' : '未找到');
  ck(r.txt.includes('201项') && !r.txt.includes('170项'), '断言数改成 201 项（旧的 170 已不在屏上）',
    r.txt.includes('170项') ? '仍是 170' : '命中 201');
  ck(r.txt.includes('17/60') && r.txt.includes('反向'), 'cRSI 卡写着 17 / 60 与单点锚会反向骗人',
    r.txt.includes('17/60') ? '命中' : '未命中');
  ck(r.quick.length === 13, '「只想看某一类」网格 13 项', r.quick.length);
  const q11 = r.quick.filter((x) => x.h.endsWith('#m11'))[0];
  const q12 = r.quick.filter((x) => x.h.endsWith('#m12'))[0];
  ck(q11 && /六维卦序/.test(q11.t), '#m11 那项写的是「六维卦序」（不是「怎么读」）', q11 ? q11.t : '缺失');
  ck(q12 && /怎么读/.test(q12.t), '#m12 那项才是「怎么读这一页」', q12 ? q12.t : '缺失');
  ck(r.txt.includes('13个分组') && r.txt.includes('140条'), '正文统计已更新为 13 个分组 140 条',
    r.txt.includes('13个分组') ? '命中' : '未命中');
  ck(r.txt.includes('NaN') === false && r.txt.includes('undefined') === false, '无 NaN / undefined');
  ck(r.scrollW <= r.vw + 1, '1440 下无页面级横向溢出', r.scrollW + '/' + r.vw);
  const bBoth = await c.evalJs('(function(){var g=document.getElementById("grpYijing");'
    + 'var a=g.getBoundingClientRect();return {x:0,y:Math.max(0,a.top+window.scrollY-10),w:1440,h:1250};})()');
  await shotTo(OUT + 'en_both_yj.png', bBoth);

  /* ==================== 三、演讲入口 ==================== */
  console.log('\n=== 演讲入口 AAA_演讲入口_60分钟.html ===');
  r = await openPage(PAGES.talk);
  errs = await c.evalJs('(window.__errs||[]).slice(0,5)');
  ck(errs.length === 0, 'JS 异常 0 条', errs.join(' | ') || 0);
  const hit = r.starLi.filter((x) => /六维卦序/.test(x.ttl));
  ck(hit.length === 1, '延伸页里新增且只新增 1 条「六维卦序」', hit.length);
  ck(!!hit[0] && exists(hit[0].href) && /六维卦序/.test(hit[0].href),
    '这条指向六维卦序主索引，且文件存在', hit[0] ? hit[0].href.slice(-40) : '缺失');
  ck(!!hit[0] && /一组四页/.test(hit[0].ttl), '演讲页这条标题写「一组四页」',
    hit[0] ? (hit[0].ttl.match(/一组[三四]页/) || ['未找到'])[0] : '缺失');
  ck(!!hit[0] && /17\/60/.test(hit[0].all) && /反向骗人/.test(hit[0].all),
    '演讲页这条正文写着 17 / 60 与「单点锚会反向骗人」',
    hit[0] && /17\/60/.test(hit[0].all) ? '命中' : '未命中');
  ck(r.starLi.length >= 9, '延伸页条目总数（先测到非零）', r.starLi.length);
  ck(r.txt.includes('13组140条'), '总目录那一条的统计已更新为 13 组 140 条',
    r.txt.includes('13组140条') ? '命中' : r.txt.match(/1[23]组\d+条/) ? '旧值' : '未找到');
  ck(/物质是怎么形成的/.test(r.title) && /\d+\s*分钟/.test(r.title),
    '时长脚本仍在跑（标题被 JS 改写成「…（N 分钟）」；默认 30 是对的，别拿 60 当判据）', r.title);
  /* 真点一下 60 分钟：判据落在「会出问题那一档」——插坏了这里就点不动 */
  await c.evalJs('(function(){var b=document.querySelector(\'#lenSeg button[data-min="60"]\');if(b)b.click();})()');
  await sleep(350);
  const t60 = await c.evalJs('document.title');
  ck(/60\s*分钟/.test(t60), '点「60 分钟」后标题真的重算成 60（时长脚本没被插坏）', t60);
  const barSum = await c.evalJs('(function(){var s=0;document.querySelectorAll(".bar div[data-w]").forEach(function(e){'
    + 'var m=(e.textContent.match(/(\\d+)/)||[])[1];if(m)s+=+m;});return s;})()');
  ck(barSum === 60, '七段色条加起来正好 60 分钟（重算没有漂）', barSum);
  ck(r.txt.includes('NaN') === false && r.txt.includes('undefined') === false, '无 NaN / undefined');
  ck(r.scrollW <= r.vw + 1, '1440 下无页面级横向溢出', r.scrollW + '/' + r.vw);
  const bTalk = await c.evalJs('(function(){var a=document.querySelectorAll("li a.pg");'
    + 'for(var i=0;i<a.length;i++){if(/六维卦序/.test(a[i].textContent)){var r=a[i].getBoundingClientRect();'
    + 'return {x:0,y:Math.max(0,r.top+window.scrollY-12),w:1440,h:r.height+24};}}return null;})()');
  await shotTo(OUT + 'en_talk_yj.png', bTalk);

  /* ==================== 四、375 窄屏 ==================== */
  console.log('\n=== 375px 窄屏 ===');
  for (const [k, f] of [['总网页', PAGES.all], ['双门', PAGES.both], ['演讲', PAGES.talk]]) {
    await c.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
    await c.navigate(F(f));
    await sleep(700);
    const m = await c.evalJs('(function(){var vw=document.documentElement.clientWidth,out=[];'
      + 'document.querySelectorAll("body *").forEach(function(el){var b=el.getBoundingClientRect();'
      + 'if(b.width<=0||b.right<=vw+1)return;var p=el.parentElement,ins=false;'
      + 'while(p){var ox=getComputedStyle(p).overflowX;if(ox==="auto"||ox==="scroll"){ins=true;break}p=p.parentElement}'
      + 'if(!ins)out.push(el.tagName+"."+(el.className||"").toString().slice(0,20))});'
      + 'return {w:document.documentElement.scrollWidth,vw:vw,out:out.slice(0,6)};})()');
    ck(m.w <= m.vw + 1, k + ' 375 下无页面级横向溢出', m.w + '/' + m.vw + ' ' + m.out.join(','));
  }

  await c.close();
  console.log('\n────────────────────────────');
  console.log('探针 ' + n + ' 项：PASS ' + (n - bad) + ' / FAIL ' + bad);
  process.exit(bad ? 1 : 0);
})();
