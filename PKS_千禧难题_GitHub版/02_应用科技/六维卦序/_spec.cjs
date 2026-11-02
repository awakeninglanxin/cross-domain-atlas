/*
 * _spec.cjs —— 临时探针：把 Lyapunov 谱那套「谱 / 强度量」的概念
 * 搬到 64 态马尔可夫的轨迹上，看三件事：
 *   (1) 「变窄」到底是塌缩成不动点/极限环，还是仍在混（自相关怎么衰减、有没有振荡周期）
 *   (2) 12 组的落点（家）是不是只由 Ω 决定、与 θ 无关（universality 的弱版本）
 *   (3) 同样的量在 Ω 与 max−V 下是否逐位相同（证明「谱类量对符号翻转免疫」）
 * 只做诊断，不改任何正式文件。
 */
'use strict';
const C = require('./crisi.cjs');
const R = require('./_crisi_result.json');

const N = 64;
const seg = (p) => Array.from(p.slice(Math.floor(p.length / 2)));
const freqs = (xs) => { const f = new Array(N).fill(0); for (const x of xs) f[x]++; return f; };
const uniq = (xs) => freqs(xs).filter((v) => v > 0).length;

function acf(xs, maxLag) {
  const n = xs.length;
  const m = xs.reduce((a, b) => a + b, 0) / n;
  const d = xs.map((v) => v - m);
  let v0 = 0; for (const v of d) v0 += v * v; v0 /= n;
  const out = [];
  for (let L = 1; L <= maxLag; L++) {
    let s = 0;
    for (let i = 0; i + L < n; i++) s += d[i] * d[i + L];
    s /= (n - L);
    out.push(s / v0);
  }
  return out;
}

function analyse(tag, path) {
  const xs = seg(path);
  const V = R.V;
  const obs = xs.map((x) => V[x]);
  const a = acf(obs, 400);
  /* 首次穿零、首个负谷（若有 ⇒ 有周期性，说明是极限环而不是混） */
  let firstZero = -1, negMin = 0, negLag = -1;
  for (let i = 0; i < a.length; i++) {
    if (firstZero < 0 && a[i] <= 0) firstZero = i + 1;
    if (a[i] < negMin) { negMin = a[i]; negLag = i + 1; }
  }
  const f = freqs(xs);
  const top = f.map((v, i) => ({ v, i })).sort((p, q) => q.v - p.v);
  const sh = top.slice(0, 9).reduce((s, o) => s + o.v, 0) / xs.length;
  const eff = Math.exp(-top.reduce((s, o) => { const p = o.v / xs.length; return s + (p > 0 ? p * Math.log(p) : 0); }, 0));
  /* 模态态的平均回归时间 */
  const modal = top[0].i;
  const gaps = []; let last = -1;
  xs.forEach((x, i) => { if (x === modal) { if (last >= 0) gaps.push(i - last); last = i; } });
  const mrt = gaps.length ? gaps.reduce((s, v) => s + v, 0) / gaps.length : NaN;
  console.log(
    tag.padEnd(14),
    '支撑', String(uniq(xs)).padStart(2),
    '有效态', eff.toFixed(2).padStart(5),
    '前9占', (sh * 100).toFixed(1).padStart(5) + '%',
    'acf首零', String(firstZero).padStart(4),
    '负谷', negMin.toFixed(3).padStart(6) + '@' + String(negLag).padStart(3),
    '模态回归', (Number.isFinite(mrt) ? mrt.toFixed(1) : '—').padStart(6)
  );
  return { support: uniq(xs), eff, sh, firstZero, negMin, negLag, mrt };
}

const base = { steps: 100000, window: 200, mwin: 2000, bonus: 0, seed: 12345, theta0: R.meta.theta0 };
console.log('=== 真表 ===');
const t0 = Date.now();
const rC = C.simulate(Object.assign({}, base, { learn: false, V: R.V }));
const aC = analyse('C 不自改', rC.path);
const rA = C.simulate(Object.assign({}, base, { learn: true, V: R.V }));
const aA = analyse('A 裸 RSI', rA.path);
const rB4 = C.simulate(Object.assign({}, base, { learn: true, V: R.V, bonus: 4 }));
const aB4 = analyse('B4 λ=4', rB4.path);
console.log('=== 对抗表 max−V ===');
const rE = C.simulate(Object.assign({}, base, { learn: false, V: R.Va, Vtrue: R.V }));
analyse('E 对抗·不自改', rE.path);
const rD = C.simulate(Object.assign({}, base, { learn: true, V: R.Va, Vtrue: R.V }));
const aD = analyse('D 对抗·自改', rD.path);

console.log('\nθ 终值：C', JSON.stringify(rC.thetaEnd), ' A', JSON.stringify(rA.thetaEnd), ' D', JSON.stringify(rD.thetaEnd));
console.log('落点：C', rC.final.homeName, ' A', rA.final.homeName, ' D', rD.final.homeName);

/* (2) 12 组的「家」是不是只由 Ω 决定 */
console.log('\n=== 落点 × 表 ===');
const by = {};
for (const g of R.groups) { by[g.ohm] = by[g.ohm] || {}; by[g.ohm][g.homeName] = (by[g.ohm][g.homeName] || 0) + 1; }
console.log(JSON.stringify(by), ' 共', R.groups.length, '组');

/* (3) 同一配置在 Ω 与 max−V 下，轨迹的强度量是否逐位相同
 *     —— 这是「谱类量看不见符号」的直接数值证明 */
const c1 = C.simulate(Object.assign({}, base, { learn: true, V: R.V }));
const c2 = C.simulate(Object.assign({}, base, { learn: true, V: R.Va, Vtrue: R.V }));
const h1 = c1.final.HpiAll, h2 = c2.final.HpiAll;
console.log('\n=== 符号翻转下 θ 与强度量 ===');
console.log('θ 差', Math.abs(c1.thetaEnd.a - c2.thetaEnd.a).toExponential(2),
  '| Hπ 差', Math.abs(h1 - h2).toExponential(2),
  '| 落点', c1.final.homeName, 'vs', c2.final.homeName);
console.log('耗时', ((Date.now() - t0) / 1000).toFixed(1), 's');
