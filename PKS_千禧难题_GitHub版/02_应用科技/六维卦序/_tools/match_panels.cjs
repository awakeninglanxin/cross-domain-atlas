'use strict';
/*
 * match_panels.cjs —— 把一组「单帧图」逐张匹配到「拼图面板」上，报告最优命中与边距。
 *
 * 配套 find_panels.cjs 使用。判据是本轮血的教训：
 *   1. 结构没对齐之前，任何相似度分数都不许用来下结论 —— 所以必须先切面板再比。
 *   2. 只报最高分＝没判据。深色幻灯片彼此天然相关 0.3–0.5，只看第一名某一张会
 *      「对每一帧都夺冠」。所以判据是「最高分 − 中位基线」的边距，基线一起打印。
 *   3. 次高必须明显低于最高，否则说明切错位置或真有近似重复，两种都要人看。
 *
 * 用法：
 *   node _tools/match_panels.cjs <面板json> <拼图目录> <单帧目录> [输出json]
 *   node _tools/match_panels.cjs _tmp/panels.json ../_img/zip ../_img _tmp/match.json
 *
 * 单帧文件按文件名排序后逐张比；拼图按 面板json 里的 z 定位。
 * 输出 JSON：[{ frame, best:{z,r,c,s}, second, med, margin }]
 *   判「同一张」的门槛建议：s ≥ 0.85 且 margin ≥ 0.15。低于此值只算「像」，不算「同」。
 */
const fs = require('fs');
const path = require('path');
const CDP = require('../../construct-cost/cdp.cjs');

const [PANEL_JSON, ZIPDIR, FRAMEDIR, OUT] = process.argv.slice(2);
if (!PANEL_JSON || !ZIPDIR || !FRAMEDIR) {
  console.error('用法: node _tools/match_panels.cjs <面板json> <拼图目录> <单帧目录> [输出json]');
  process.exit(2);
}
for (const p of [PANEL_JSON, ZIPDIR, FRAMEDIR]) {
  if (!fs.existsSync(p)) { console.error('路径不存在: ' + p); process.exit(2); }
}

const PANELS = JSON.parse(fs.readFileSync(PANEL_JSON, 'utf8'));
const FRAMES = fs.readdirSync(FRAMEDIR)
  .filter((f) => /\.(jpg|jpeg|png)$/i.test(f) && !/^_/.test(f)).sort();
if (!FRAMES.length) { console.error('单帧目录里没有图: ' + FRAMEDIR); process.exit(2); }

const N = 20;   /* 每块缩到 20×20 灰度，零均值单位方差后做相关系数 */

const JS = `
async function cell(url, y0, y1, x0, x1){
  const img = new Image(); img.src = url; await img.decode();
  const W = img.naturalWidth, H = img.naturalHeight;
  const sx = W * x0, sy = H * y0, sw = W * (x1 - x0), sh = H * (y1 - y0);
  const c = document.createElement('canvas'); c.width = ${N}; c.height = ${N};
  const g = c.getContext('2d');
  g.drawImage(img, sx, sy, sw, sh, 0, 0, ${N}, ${N});
  const d = g.getImageData(0, 0, ${N}, ${N}).data;
  const o = [];
  for (let i = 0; i < d.length; i += 4) o.push(0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2]);
  const n = o.length; let m = 0; for (const v of o) m += v; m /= n;
  let sd = 0; for (const v of o) sd += (v - m) * (v - m);
  sd = Math.sqrt(sd / n) || 1;
  return o.map((v) => (v - m) / sd);
}`;
const dot = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s / a.length; };
const durl = (p) => 'data:image/jpeg;base64,' + fs.readFileSync(p).toString('base64');

(async () => {
  const br = await CDP.open({ w: 900, h: 700 });
  await br.navigate('about:blank');
  await br.evalJs(JS);
  const cell = (url, y0, y1, x0, x1) =>
    br.evalJs('cell(' + JSON.stringify(url) + ',' + [y0, y1, x0, x1].join(',') + ')', true);

  const cells = [];
  for (const P of PANELS) {
    const zpath = path.join(ZIPDIR, P.z);
    if (!fs.existsSync(zpath)) { console.log('⚠️ 缺图跳过:', P.z); continue; }
    const u = durl(zpath);
    const cols = P.cb.length ? P.cb : [[0, 1]];
    for (let r = 0; r < P.rb.length; r++) for (let c = 0; c < cols.length; c++) {
      const y0 = P.rb[r][0], y1 = P.rb[r][1], x0 = cols[c][0], x1 = cols[c][1];
      /* 面板内再收 2% 边，避开边框与字幕条 */
      const dy = (y1 - y0) * 0.02, dx = (x1 - x0) * 0.02;
      cells.push({ z: P.z, r: r + 1, c: c + 1, v: await cell(u, y0 + dy, y1 - dy, x0 + dx, x1 - dx) });
    }
  }
  if (!cells.length) { br.close(); console.error('一块面板都没切出来，先跑 find_panels.cjs'); process.exit(1); }

  const fv = [];
  for (const f of FRAMES) fv.push({ f, v: await cell(durl(path.join(FRAMEDIR, f)), 0, 1, 0, 1) });
  br.close();

  console.log('面板总数', cells.length, '｜单帧', fv.length, '\n');
  const map = [];
  for (const { f, v } of fv) {
    const all = cells.map((o) => ({ z: o.z, r: o.r, c: o.c, s: dot(v, o.v) })).sort((a, b) => b.s - a.s);
    const med = all[Math.floor(all.length / 2)].s;
    map.push({ frame: f, best: all[0], second: all[1], med, margin: all[0].s - med });
    console.log(f.padEnd(14), all[0].s.toFixed(3), all[0].z.slice(0, 36).padEnd(38),
      'R' + all[0].r + 'C' + all[0].c,
      ' 次高', all[1].s.toFixed(3), ' 中位基线', med.toFixed(3), ' 边距', (all[0].s - med).toFixed(3));
  }

  const hit = map.filter((m) => m.best.s >= 0.85 && m.margin >= 0.15);
  console.log('\n判为同一张：', hit.length, '/', map.length);
  /* 单调性自检：同一块面板不应被两张单帧同时以高分认领，否则说明单帧里有近重复 */
  const claim = {};
  const dup = [];
  for (const m of hit) {
    const k = m.best.z + '|R' + m.best.r + 'C' + m.best.c;
    if (claim[k]) dup.push(k + ' ← ' + claim[k] + ' & ' + m.frame); else claim[k] = m.frame;
  }
  if (dup.length) console.log('⚠️ 同一面板被两帧认领（需人看）:', dup.join(' | '));

  if (OUT) {
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(map, null, 1));
    console.log('已写入', OUT);
  }
})();
