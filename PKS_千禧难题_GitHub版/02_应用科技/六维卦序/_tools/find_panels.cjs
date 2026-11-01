'use strict';
/*
 * find_panels.cjs —— 探测一叠「竖拼图」各有几行几列面板，输出归一化边界 JSON。
 *
 * 为什么要有这个工具（2026-11-01 的血）：
 *   判断「两张图是不是同一张」，先拿整图比像素，命中率是 0 —— 因为拿整图去比它的
 *   一个角，宽高比一拉就成两张脸。必须先按内容边界切成面板，再逐块比；切之前还要
 *   先知道「这图是几行几列」。这个脚本就是那一步，边界全部由数据给出，不猜坐标。
 *
 * 原理：缩到 200×300，逐行/逐列算「行内亮度的标准差」。拼图的面板之间是一条完全
 *   均匀的黑带（std ≈ 0），而面板内部哪怕再暗也有内容起伏。所以 std < 阈值 的连续
 *   行/列 = 分隔带，其余 = 面板。
 *
 * 用法：
 *   node _tools/find_panels.cjs <图片目录> [输出json]
 *   node _tools/find_panels.cjs ../_img/zip _tmp/panels.json
 *
 * 输出 JSON 每项：{ z, W, H, rows, cols, rb, cb }
 *   rb / cb 是归一化到 [0,1] 的 [起, 止] 区间数组，直接喂给 match_panels.cjs。
 *
 * 阈值 2.2 与最小长度 8 是本轮实测值（22 张 1440 级竖拼图，探出 1×2 / 2×2 /
 * 3×2 / 4×2 / 3×1 五种版式，共 139 块）。图源亮度分布差很多时要重调。
 */
const fs = require('fs');
const path = require('path');
const CDP = require('../../construct-cost/cdp.cjs');

const DIR = process.argv[2];
if (!DIR) {
  console.error('用法: node _tools/find_panels.cjs <图片目录> [输出json]');
  process.exit(2);
}
if (!fs.existsSync(DIR)) {
  console.error('目录不存在: ' + DIR);
  process.exit(2);
}
const OUT = process.argv[3] || path.join(__dirname, 'panels.json');

const THR = 2.2;    /* std 低于此值判为分隔带 */
const MINLEN = 8;   /* 短于此长度的内容带当噪点丢掉 */

const IMGS = fs.readdirSync(DIR).filter((f) => /\.(jpg|jpeg|png)$/i.test(f)).sort();
if (!IMGS.length) {
  console.error('目录里没有图片: ' + DIR);
  process.exit(2);
}

const JS = `
async function prof(url){
  const img = new Image(); img.src = url; await img.decode();
  const W = img.naturalWidth, H = img.naturalHeight;
  const c = document.createElement('canvas'); c.width = 200; c.height = 300;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0, W, H, 0, 0, 200, 300);
  const d = g.getImageData(0, 0, 200, 300).data;
  const lum = (x, y) => { const i = (y * 200 + x) * 4; return 0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2]; };
  const sd = (vals) => { let m = 0; for (const v of vals) m += v; m /= vals.length;
    let s = 0; for (const v of vals) s += (v - m) * (v - m); return Math.sqrt(s / vals.length); };
  const rowSd = [], colSd = [];
  for (let y = 0; y < 300; y++) { const v = []; for (let x = 0; x < 200; x++) v.push(lum(x, y)); rowSd.push(sd(v)); }
  for (let x = 0; x < 200; x++) { const v = []; for (let y = 0; y < 300; y++) v.push(lum(x, y)); colSd.push(sd(v)); }
  return { W, H, rowSd, colSd };
}`;

/* 内容带 = std 不小于阈值的连续段；长度太短的当噪点丢掉 */
function bands(sd, thr, minLen) {
  const out = []; let i = 0;
  while (i < sd.length) {
    if (sd[i] < thr) { i++; continue; }
    let j = i; while (j < sd.length && sd[j] >= thr) j++;
    if (j - i >= minLen) out.push([i, j]);
    i = j;
  }
  return out;
}
const norm = (b, n) => b.map(([a, c]) => [+(a / n).toFixed(3), +(c / n).toFixed(3)]);

(async () => {
  const br = await CDP.open({ w: 900, h: 700 });
  await br.navigate('about:blank');
  await br.evalJs(JS);
  const res = [];
  for (const z of IMGS) {
    const u = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(DIR, z)).toString('base64');
    const p = await br.evalJs('prof(' + JSON.stringify(u) + ')', true);
    const rb = bands(p.rowSd, THR, MINLEN), cb = bands(p.colSd, THR, MINLEN);
    res.push({ z, W: p.W, H: p.H, rows: rb.length, cols: cb.length,
               rb: norm(rb, 300), cb: norm(cb, 200) });
    console.log(z.padEnd(42), (p.W + '×' + p.H).padEnd(10), '行', rb.length, '列', cb.length,
      '｜行界', norm(rb, 300).map((b) => b[0] + '-' + b[1]).join(' '));
  }
  br.close();

  /* 先测到「非零」：一块面板都没切出来的图必须报出来，不能安静地交一份空账 */
  const total = res.reduce((a, r) => a + r.rows * r.cols, 0);
  const dead = res.filter((r) => r.rows * r.cols <= 1);
  console.log('\n合计', res.length, '张，', total, '块面板');
  if (dead.length) console.log('⚠️ 以下', dead.length, '张只切出 1 块（可能阈值不合适）：', dead.map((d) => d.z).join(', '));
  console.log('版式分布:', JSON.stringify(res.reduce((a, r) => {
    const k = r.rows + '×' + r.cols; a[k] = (a[k] || 0) + 1; return a;
  }, {})));

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
  console.log('已写入', OUT);
})();
