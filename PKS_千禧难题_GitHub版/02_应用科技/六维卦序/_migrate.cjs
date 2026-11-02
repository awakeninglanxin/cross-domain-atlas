/*
 * _migrate.cjs —— 「通天 / 普适」的可行性诊断（只诊断，不改任何正式文件）
 *
 * 要回答的问题不是「θ 换张表还管用吗」（12 组已经证伪：落点全由表定），
 * 而是：有没有一类量在「同一结构类型、不同微观实现」下稳定，
 *       同时在「结构变了 / 序被打乱」时明显不同（否则「换表不变」是恒真式）。
 *
 * 三族表：
 *   hom  同类扰动：线性位效应、最优顶点相同，只改权重数值/标度
 *   het  结构改变：符号翻转、权重重排、加入非线性卦效应 ⇒ 最优顶点或地形变
 *   rand 随机基线：保持数值多重集、打乱序 ⇒ 用来证明序参量确实有牙
 *
 * 两个对照：
 *   native  = 在该表上正常自改（θ 从 THETA0 学起）
 *   frozen  = 冻结「在基准表 S0 上学到的 θ」，搬到该表且不自改
 *   ⇒ frozen 与 native 的序参量差，就是「θ 携带了多少表信息」的上界。
 *
 * 🔴 不拍绝对阈值：结论只用相对刻度（d_in / d_out / d_rand 的比值），
 *    且「结构是否改变」由 argmax(V) 与序的秩相关客观判定，不靠人眼分组。
 */
'use strict';
const C = require('./crisi.cjs');
const R = require('./_crisi_result.json');
const fs = require('fs');

const V0 = R.V.slice();
const THETA0 = C.THETA0;
const SEEDS = C.SEEDS;
const STEPS = 60000;

/* 从 V0 反推 6 个位权重，再用同一套重建 —— 不猜爻位顺序 */
const w = [];
for (let i = 0; i < 6; i++) w.push(V0[1 << i] - V0[0]);
function lin(weights) {
  const V = new Array(64);
  for (let v = 0; v < 64; v++) {
    let s = V0[0];
    for (let i = 0; i < 6; i++) if (v & (1 << i)) s += weights[i];
    V[v] = s;
  }
  return V;
}
const recon = lin(w);
const reconMax = Math.max.apply(null, recon.map((x, i) => Math.abs(x - V0[i])));
if (reconMax > 1e-12) throw new Error('线性重建失败，位权重反推错了：最大偏差 ' + reconMax);

const rnd = (() => { let s = 20261102 >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
function shuffle(a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = b[i]; b[i] = b[j]; b[j] = t; } return b; }
const popcnt = (v) => { let n = 0; while (v) { n += v & 1; v >>= 1; } return n; };
const argmax = (V) => V.reduce((b, x, i) => x > V[b] ? i : b, 0);

const TABLES = [
  { key: 'S0', fam: 'hom', name: '位效应线性（基准）', V: lin(w) },
  { key: 'S1', fam: 'hom', name: '权重 ×2（纯标度）', V: lin(w.map((x) => x * 2)) },
  { key: 'S2', fam: 'hom', name: '权重 ±30% 扰动', V: lin(w.map((x) => x * (0.7 + 0.6 * rnd()))) },
  { key: 'S4', fam: 'hom', name: '权重压缩（符号不变）', V: lin(w.map((x) => Math.sign(x) * (Math.abs(x) * 0.15 + 0.02))) },
  { key: 'S5', fam: 'het', name: '翻转一位符号', V: lin(w.map((x, i) => i === 2 ? -x : x)) },
  { key: 'S3', fam: 'het', name: '权重重排', V: lin(shuffle(w)) },
  { key: 'N1', fam: 'het', name: '加非线性卦效应（popcount=3）', V: V0.map((x, v) => x + (popcnt(v) === 3 ? 0.8 : 0)) },
  { key: 'R1', fam: 'rand', name: '随机打乱 #1', V: shuffle(V0) },
  { key: 'R2', fam: 'rand', name: '随机打乱 #2', V: shuffle(V0) },
];

/* 序参量：全部标度无关（熵 / 有效态 / 时间步 / 秩），不比较 meanV */
function measure(V, theta0, learn) {
  const rs = SEEDS.map((sd) => C.simulate({
    V, Vtrue: V, steps: STEPS, window: 200, mwin: 2000, cap: 5000,
    theta0, seed: sd, learn,
  }));
  const avg = (f) => rs.reduce((a, r) => a + r.final[f], 0) / rs.length;
  const th = [0, 1, 2].map((j) => rs.reduce((a, r) => a + [r.thetaEnd.a, r.thetaEnd.g, r.thetaEnd.k][j], 0) / rs.length);
  const tally = {};
  rs.forEach((r) => { tally[r.final.homeName] = (tally[r.final.homeName] || 0) + 1; });
  const home = Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0];
  return {
    Hpi: avg('HpiAll'), Hall: avg('Hall'), age: avg('ageAll'), cover: avg('cover'),
    eff: Math.exp(avg('HpiAll')), theta: th, home,
  };
}

const rows = TABLES.map((T) => {
  const native = measure(T.V, THETA0, true);
  return Object.assign({}, T, { native, argmax: argmax(T.V), V: undefined });
});
/* θ 冻结迁移：只搬 S0 学到的 θ */
const thetaS0 = rows[0].native.theta;
rows.forEach((r) => { r.frozen = measure(TABLES.find((T) => T.key === r.key).V, thetaS0, false); });

/* 相对刻度：组内最大偏差 / 组间偏移 / 随机基线偏移，全部现算 */
const fam = (f) => rows.filter((r) => r.fam === f);
function spread(list, field) {
  const xs = list.map((r) => r.native[field]);
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return { mean: m, maxDev: Math.max.apply(null, xs.map((x) => Math.abs(x - m))) / Math.abs(m) };
}
function offsetFrom(list, field, ref) {
  const xs = list.map((r) => r.native[field]);
  return xs.map((x) => Math.abs(x - ref) / Math.abs(ref));
}
const metrics = ['Hpi', 'Hall', 'eff', 'age'];
const report = {};
metrics.forEach((m) => {
  const inside = spread(fam('hom'), m);
  const hetOff = offsetFrom(fam('het'), m, inside.mean);
  const randOff = offsetFrom(fam('rand'), m, inside.mean);
  report[m] = {
    homogeneous_mean: +inside.mean.toFixed(5),
    d_in: +inside.maxDev.toFixed(5),
    d_out: +Math.max.apply(null, hetOff).toFixed(5),
    d_rand: +Math.max.apply(null, randOff).toFixed(5),
    ratio_out: +(Math.max.apply(null, hetOff) / (inside.maxDev || 1e-12)).toFixed(2),
    ratio_rand: +(Math.max.apply(null, randOff) / (inside.maxDev || 1e-12)).toFixed(2),
  };
});

/* θ 迁移：冻结 S0 的 θ 用到各表上，与在本表重新学的差多少 */
const thetaRows = rows.map((r) => ({
  key: r.key, fam: r.fam,
  theta: r.native.theta.map((x) => +x.toFixed(3)),
  dTheta: +Math.max.apply(null, r.native.theta.map((x, i) => Math.abs(x - thetaS0[i]) / (Math.abs(thetaS0[i]) || 1))).toFixed(3),
  dHpi_frozen: +(Math.abs(r.frozen.Hpi - r.native.Hpi) / (Math.abs(r.native.Hpi) || 1)).toFixed(4),
  dHall_frozen: +(Math.abs(r.frozen.Hall - r.native.Hall) / (Math.abs(r.native.Hall) || 1)).toFixed(4),
  home_native: r.native.home, home_frozen: r.frozen.home,
  argmax: r.argmax,
}));

const out = {
  meta: {
    steps: STEPS, seeds: SEEDS, theta0: THETA0,
    independent_orders_in_existing_12_groups: 1,
    note: '现有 12 组只用 vWei 与 vAdversarial(=max−V，仿射取负)，故独立序 = 1',
    tables: TABLES.length,
    ranAt: new Date().toISOString(),
  },
  weights: w.map((x) => +x.toFixed(4)),
  thetaS0: thetaS0.map((x) => +x.toFixed(4)),
  rows: rows.map((r) => ({ key: r.key, fam: r.fam, name: r.name, argmax: r.argmax,
    Hpi: +r.native.Hpi.toFixed(4), Hall: +r.native.Hall.toFixed(4), eff: +r.native.eff.toFixed(3),
    age: Math.round(r.native.age), cover: r.native.cover, home: r.native.home })),
  report, thetaRows,
};
fs.writeFileSync('_migrate_result.json', JSON.stringify(out, null, 1), 'utf8');

/* ---- 打印 ---- */
const f = (x, n = 4) => Number(x).toFixed(n);
console.log('反推位权重 w =', out.weights.join(', '), '｜线性重建最大偏差', reconMax.toExponential(1));
console.log('现有 12 组的独立序 =', out.meta.independent_orders_in_existing_12_groups, '（vWei 与 max−V 是仿射对偶，不是两张独立表）');
console.log('\n=== 各表 native（entropy/有效态/回访） ===');
console.log('key fam  argmax  home     Hpi     Hall    eff     age');
out.rows.forEach((r) => console.log(r.key.padEnd(3), r.fam.padEnd(4), String(r.argmax).padStart(5), r.home.padEnd(7), f(r.Hpi), f(r.Hall), String(r.eff).padStart(7), String(r.age).padStart(7)));
console.log('\n=== 相对刻度（d_in 组内最大偏差；d_out 结构改变；d_rand 随机打乱） ===');
console.log('metric  hom_mean   d_in     d_out    d_rand   out/in   rand/in');
metrics.forEach((m) => { const q = report[m]; console.log(m.padEnd(7), String(q.homogeneous_mean).padStart(9), String(q.d_in).padStart(8), String(q.d_out).padStart(8), String(q.d_rand).padStart(9), String(q.ratio_out).padStart(8), String(q.ratio_rand).padStart(9)); });
console.log('\n=== θ 迁移对照（冻结 S0 学到的 θ） ===');
console.log('thetaS0 =', out.thetaS0.join(', '));
console.log('key  theta_native            dTheta   dHpi    dHall   home_native/frozen');
thetaRows.forEach((r) => console.log(r.key.padEnd(4), JSON.stringify(r.theta).padEnd(24), String(r.dTheta).padStart(7), String(r.dHpi_frozen).padStart(8), String(r.dHall_frozen).padStart(8), ' ', r.home_native + '/' + r.home_frozen));
console.log('\n结果已落 _migrate_result.json');

/* ---- 归一化对照：把「能量尺度 / 噪声温度」对齐后再问同类表是否稳定 ----
 * logits = θ·(V[y]−V[x])，真正控制动力学形状的是相邻边差的尺度，不是 V 的绝对值。
 * 权重 ×2 与压缩 0.15 倍，本质是换了控制参数 g，不是换了微观实现。
 * ⇒ 普适的第一步必须先把 g 对齐，否则「换表」量到的是「换温度」。 */
function edgeScale(V) {
  let s = 0, n = 0;
  for (let x = 0; x < 64; x++) for (let k = 0; k < 6; k++) { const y = x ^ (1 << k); s += Math.abs(V[y] - V[x]); n++; }
  return s / n;
}
const VN = TABLES.map((T) => { const e = edgeScale(T.V); return T.V.map((x) => x / e); });
const nrows = VN.map((V, i) => Object.assign({}, TABLES[i], { V, native: measure(V, THETA0, true) }));
function rep(rs) {
  const o = {};
  metrics.forEach((m) => {
    const inside = spread(rs.filter((r) => r.fam === 'hom'), m);
    const hetOff = offsetFrom(rs.filter((r) => r.fam === 'het'), m, inside.mean);
    const randOff = offsetFrom(rs.filter((r) => r.fam === 'rand'), m, inside.mean);
    o[m] = {
      d_in: +inside.maxDev.toFixed(5),
      d_out: +Math.max.apply(null, hetOff).toFixed(5),
      d_rand: +Math.max.apply(null, randOff).toFixed(5),
      out_in: +(Math.max.apply(null, hetOff) / (inside.maxDev || 1e-12)).toFixed(2),
      rand_in: +(Math.max.apply(null, randOff) / (inside.maxDev || 1e-12)).toFixed(2),
    };
  });
  return o;
}
const repRaw = rep(rows), repNorm = rep(nrows);
console.log('\n=== 归一化对照（对齐控制参数 g 之前 / 之后） ===');
console.log('metric    raw: d_in  out_in  rand_in   |   norm: d_in  out_in  rand_in');
metrics.forEach((m) => {
  const a = repRaw[m], b = repNorm[m];
  console.log(m.padEnd(8), String(a.d_in).padStart(7), String(a.out_in).padStart(7), String(a.rand_in).padStart(9), '  |',
    String(b.d_in).padStart(9), String(b.out_in).padStart(8), String(b.rand_in).padStart(9));
});
console.log('\n=== 归一化后各表 native ===');
console.log('key fam   Hpi     Hall    eff     age     home');
nrows.forEach((r) => console.log(r.key.padEnd(3), r.fam.padEnd(5),
  f(r.native.Hpi), f(r.native.Hall), String(+r.native.eff.toFixed(2)).padStart(7),
  String(Math.round(r.native.age)).padStart(7), r.native.home));
const all = JSON.parse(fs.readFileSync('_migrate_result.json', 'utf8'));
all.normalized = {
  scales: TABLES.map((T) => +edgeScale(T.V).toFixed(5)),
  report: repNorm,
  rows: nrows.map((r) => ({ key: r.key, fam: r.fam, Hpi: +r.native.Hpi.toFixed(4),
    Hall: +r.native.Hall.toFixed(4), eff: +r.native.eff.toFixed(3),
    age: Math.round(r.native.age), home: r.native.home })),
};
fs.writeFileSync('_migrate_result.json', JSON.stringify(all, null, 1), 'utf8');
console.log('\n归一化结果已并入 _migrate_result.json');
