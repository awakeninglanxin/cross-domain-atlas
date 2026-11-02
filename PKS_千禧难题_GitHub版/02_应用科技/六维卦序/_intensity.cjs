/*
 * _intensity.cjs —— 三页模型的三个量，能不能搬进 cRSI 的「通天」判据
 *
 * 来源页（同一目录 24_searl_SEG/koilon本体_蛋外鞘与anu/）：
 *   Thomas三刀与n刀瓣形_数学说明.html
 *     §1  div F = −3b = −0.624558（与位置无关，常数）
 *     §2  Cₙ 等变 ⇒ 角谱只保留 k ≡ 0 (mod n)
 *     §5  不能数密度 |Σe^{ikφ}|/N，要数瓣形幅度 a = |Σρ·e^{ikφ}| / Σρ
 *   黄金极限蛋 / aizawa：势驱动 + 软墙，输运与约束要拆开看
 *
 * 要回答的问题：这三个量在「同类表扰动 / 结构改变 / 随机打乱」三族上，
 * 是不是满足 d_in < d_out 且 d_in < d_rand（同类最稳，异类与随机都明显偏离）。
 * 只有满足的量，才有资格当「通天」的序参量。
 *
 * 🔴 三条口径（写在脚本里，防止后来人当它是定理）：
 *   ① 离散散度在**可逆链**上恒等于 0，那是恒真式，不许当判据。
 *      cRSI 的链因为 logits 里有 g·nov（新颖性，历史依赖）而**不可逆**，
 *      所以 divNorm 才可能有信息。脚本会同时跑 g=0 与 g=1 两个对照把这件事钉住。
 *   ② 所有量都标度无关（π 归一化、势差除以 edgeScale），否则量到的是「换温度」。
 *   ③ 只用相对刻度 d_in / d_out / d_rand，不拍绝对阈值。
 */
'use strict';
const fs = require('fs');
const H = require('./hexagram.cjs');
const R = require('./_crisi_result.json');

const N = 64;
const V0 = R.V.slice();
const THETA0 = [1.0, 1.0, 0.5]; /* 与 crisi.cjs 的 THETA0 同一口径：a, g, k */
const SEEDS = [12345, 777, 20261101, 424242, 9090909, 31415926];
const STEPS = 200000;

/* ---------- 表构造：与 _migrate.cjs 同种子、同调用顺序，保证逐位一致 ---------- */
const w = [];
for (let i = 0; i < 6; i++) w.push(V0[1 << i] - V0[0]);

function lin(weights) {
  const V = new Array(N);
  for (let v = 0; v < N; v++) {
    let s = V0[0];
    for (let i = 0; i < 6; i++) if (v & (1 << i)) s += weights[i];
    V[v] = s;
  }
  return V;
}

const rndT = (() => { let s = 20261102 >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
function shuffle(a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rndT() * (i + 1)); const t = b[i]; b[i] = b[j]; b[j] = t; } return b; }
const popcnt = (v) => { let n = 0; while (v) { n += v & 1; v >>= 1; } return n; };

/* 字面量自左向右求值 ⇒ rndT 的消耗顺序与 _migrate.cjs 完全一致 */
const TABLES = [
  { key: 'S0', fam: 'hom', name: '位效应线性（基准）', V: lin(w) },
  { key: 'S1', fam: 'hom', name: '权重 ×2（纯标度）', V: lin(w.map((x) => x * 2)) },
  { key: 'S2', fam: 'hom', name: '权重 ±30% 扰动', V: lin(w.map((x) => x * (0.7 + 0.6 * rndT()))) },
  { key: 'S4', fam: 'hom', name: '权重压缩（符号不变）', V: lin(w.map((x) => Math.sign(x) * (Math.abs(x) * 0.15 + 0.02))) },
  { key: 'S5', fam: 'het', name: '翻转一位符号', V: lin(w.map((x, i) => (i === 2 ? -x : x))) },
  { key: 'S3', fam: 'het', name: '权重重排', V: lin(shuffle(w)) },
  { key: 'N1', fam: 'het', name: '加非线性卦效应（popcount=3）', V: V0.map((x, v) => x + (popcnt(v) === 3 ? 0.8 : 0)) },
  { key: 'R1', fam: 'rand', name: '随机打乱 #1', V: shuffle(V0) },
  { key: 'R2', fam: 'rand', name: '随机打乱 #2', V: shuffle(V0) },
];

/* 护栏：S0 必须逐位等于 _crisi_result.json 的 V，否则说明表构造漂移了 */
const s0dev = TABLES[0].V.reduce((m, x, i) => Math.max(m, Math.abs(x - V0[i])), 0);
if (!(s0dev < 1e-12)) throw new Error('S0 与 _crisi_result.json 的 V 不一致（偏差 ' + s0dev + '）：表构造漂移，结论作废');

/* ---------- 边缘尺度：对齐控制参数 g 的唯一入口 ---------- */
function edgeScale(V) {
  let s = 0, n = 0;
  for (let x = 0; x < N; x++) for (let k = 0; k < 6; k++) { const y = x ^ (1 << k); s += Math.abs(V[y] - V[x]); n++; }
  return s / n;
}

const NB = [];
for (let v = 0; v < N; v++) { const o = []; for (let k = 0; k < 6; k++) o.push(v ^ (1 << k)); NB.push(o); }

/*
 * 固定 θ 的探针行走：逐字照抄 crisi.cjs 的 shadow（第 126–146 行）公式，
 * 只额外统计「访问分布 π」与「去向计数 C[x][k]」。
 * 统一从坤（0）起步，与表无关；同种子可重跑。
 */
function walkStats(V, theta, seed, M) {
  let s = seed >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  let x = 0, prev = -1;
  const seen = new Array(N).fill(-1); seen[x] = 0;
  const visits = new Array(N).fill(0);
  const C = [];
  for (let v = 0; v < N; v++) C.push(new Array(6).fill(0));
  const logits = new Array(6), probs = new Array(6);
  for (let t = 1; t <= M; t++) {
    const nb = NB[x];
    let mx = -Infinity;
    for (let k = 0; k < 6; k++) {
      const y = nb[k];
      const nov = 1 - Math.exp(-(seen[y] < 0 ? t : t - seen[y]) / 64);
      logits[k] = theta[0] * (V[y] - V[x]) + theta[1] * nov - theta[2] * (y === prev ? 1 : 0);
      if (logits[k] > mx) mx = logits[k];
    }
    let Z = 0;
    for (let k = 0; k < 6; k++) { probs[k] = Math.exp(logits[k] - mx); Z += probs[k]; }
    let u = rnd(), acc = 0, pick = 5;
    for (let k = 0; k < 6; k++) { acc += probs[k] / Z; if (u < acc) { pick = k; break; } }
    const from = x;
    C[from][pick]++;
    prev = from; x = nb[pick];
    seen[x] = t;
    visits[x]++;
  }
  const tot = visits.reduce((a, b) => a + b, 0);
  return { pi: visits.map((c) => c / tot), C, tot };
}

/* ---------- 量 1：离散散度（Thomas §1 的 div F）----------
 * 对每对相邻状态 (x, x^k) 的净流 J = C[x][k] − C[x^k][k]，
 * divNorm = Σ|J| / Σ(往来总数) ∈ [0,1]。可逆链恒 0（这是恒真式，会单独对照）。 */
function fluxStats(C, V) {
  let net = 0, gross = 0, vflux = 0;
  for (let x = 0; x < N; x++) {
    for (let k = 0; k < 6; k++) {
      const y = x ^ (1 << k);
      if (y < x) continue;
      const f = C[x][k], b = C[y][k];
      net += Math.abs(f - b);
      gross += f + b;
      vflux += (f + b) * Math.abs(V[y] - V[x]) / 2;
    }
  }
  return {
    divNorm: gross > 0 ? net / gross : NaN,
    fluxNorm: gross > 0 ? (vflux / gross) : NaN,
  };
}

/* ---------- 量 2：瓣形幅度（Thomas §5）----------
 * a = |Σ ρ·e^{ikφ}| / Σρ 的离散版：把 π 当 ρ，把组合坐标当 φ。 */
function phaseAmp(pi, g, n) {
  let re = 0, im = 0, s = 0;
  for (let x = 0; x < N; x++) {
    const ph = 2 * Math.PI * g(x) / n;
    re += pi[x] * Math.cos(ph); im += pi[x] * Math.sin(ph); s += pi[x];
  }
  return s > 0 ? Math.hypot(re, im) / s : NaN;
}
const aPop = (pi) => phaseAmp(pi, popcnt, 7); /* 层数 0..6 共 7 层 */

/* 十二消息卦环：只在 12 卦上算，等价于「环上有没有方向性偏聚」 */
let XX = [];
try {
  const raw = H.xiaoxiCodes();
  XX = raw.map((z) => (typeof z === 'number' ? z : (z && typeof z.code === 'number' ? z.code : NaN)));
  if (XX.length !== 12 || XX.some((z) => !Number.isFinite(z))) XX = [];
} catch (e) { XX = []; }
function aXx(pi) {
  if (XX.length !== 12) return NaN;
  let re = 0, im = 0, s = 0;
  XX.forEach((c, j) => {
    const ph = 2 * Math.PI * j / 12;
    re += pi[c] * Math.cos(ph); im += pi[c] * Math.sin(ph); s += pi[c];
  });
  return s > 0 ? Math.hypot(re, im) / s : NaN;
}

/* ---------- 量 3：对合势差（C₂ 等变阶的离散版）----------
 * 综卦（上下颠倒）与错卦（六爻全反）两对对合下，势差的平均值 / edgeScale。
 * 标度无关；若势在某个对合下完全对称，它恰为 0。 */
function pairDiff(V, f) {
  let s = 0, n = 0;
  for (let x = 0; x < N; x++) {
    const y = f(x);
    if (Number.isFinite(y) && y >= 0 && y < N) { s += Math.abs(V[y] - V[x]); n++; }
  }
  return n > 0 ? s / n : NaN;
}

/* ---------- 一张表上的全量测量 ---------- */
function measureTable(V, theta) {
  const es = edgeScale(V);
  const Vn = V.map((x) => x / es); /* 归一化：让「权重 ×2」与「×1」变成同一张表 */
  const runs = SEEDS.map((sd) => walkStats(Vn, theta || THETA0, sd, STEPS));
  const pi = new Array(N).fill(0);
  runs.forEach((r) => r.pi.forEach((p, i) => { pi[i] += p / runs.length; }));
  const C = [];
  for (let v = 0; v < N; v++) {
    C.push(new Array(6).fill(0));
    runs.forEach((r) => { for (let k = 0; k < 6; k++) C[v][k] += r.C[v][k]; });
  }
  const fl = fluxStats(C, Vn);
  return {
    es,
    divNorm: fl.divNorm,
    fluxNorm: fl.fluxNorm,
    aPop: aPop(pi),
    aXx: aXx(pi),
    dZong: pairDiff(Vn, H.zong),
    dCuo: pairDiff(Vn, H.cuo),
    argmax: V.reduce((b, x, i) => (x > V[b] ? i : b), 0),
  };
}

/* ---------- 三族相对刻度 ----------
 * 合格要过三道门，缺一不可：
 *   ① d_in < d_out 且 d_in < d_rand   —— 同类最稳，异类与随机都明显偏离
 *   ② margin = min(d_out/d_in, d_rand/d_in) >= MIN_MARGIN
 *      MIN_MARGIN = 3 是**工程惯例的 3 倍余量**，不是从数据拟合出来的；
 *      写在这里是要让它显式可改，绝不允许散落在页面里。
 *   ③ 信号量（这里只有 divNorm）另需信噪比 >= SNR_MIN，否则 d 比值再漂亮也是噪声。
 * 🔴 ②③ 是补丁：没有它们，divNorm 会以 d_rand/d_in = 14.6 假绿通过，
 *    而它真实的信噪比只有 1.3–1.5 —— 正是「假绿比假红更坏」那一类。 */
const MIN_MARGIN = 3;
const SNR_MIN = 3;
let SNR_MIN_OF_RUN = null; /* ① 段测出后填入；没测到就判不合格（保守，不许假绿） */
const METRICS = ['divNorm', 'fluxNorm', 'aPop', 'aXx', 'dZong', 'dCuo'];
function relScale(rows) {
  const out = {};
  METRICS.forEach((m) => {
    const hom = rows.filter((r) => r.fam === 'hom').map((r) => r.q[m]).filter(Number.isFinite);
    const het = rows.filter((r) => r.fam === 'het').map((r) => r.q[m]).filter(Number.isFinite);
    const rad = rows.filter((r) => r.fam === 'rand').map((r) => r.q[m]).filter(Number.isFinite);
    if (hom.length < 2 || het.length < 1 || rad.length < 1) {
      out[m] = { ok: false, pass: false, why: '样本不足（hom ' + hom.length + ' / het ' + het.length + ' / rand ' + rad.length + '）' };
      return;
    }
    const mean = hom.reduce((a, b) => a + b, 0) / hom.length;
    if (!(Math.abs(mean) > 0)) { out[m] = { ok: false, pass: false, why: 'hom 均值恰为 0，相对刻度无定义' }; return; }
    const dIn = Math.max.apply(null, hom.map((x) => Math.abs(x - mean))) / Math.abs(mean);
    const dOut = Math.max.apply(null, het.map((x) => Math.abs(x - mean))) / Math.abs(mean);
    const dRad = Math.max.apply(null, rad.map((x) => Math.abs(x - mean))) / Math.abs(mean);
    const margin = Math.min(dOut / (dIn || 1e-12), dRad / (dIn || 1e-12));
    const mono = dIn > 0 && dIn < dOut && dIn < dRad;
    const snrOk = m !== 'divNorm' || (SNR_MIN_OF_RUN !== null && SNR_MIN_OF_RUN >= SNR_MIN);
    const marginOk = margin >= MIN_MARGIN;
    const why = [];
    if (!mono) why.push('d_in 不是最小');
    if (!marginOk) why.push('余量 ' + margin.toFixed(2) + '× < ' + MIN_MARGIN + '×');
    if (!snrOk) why.push('信噪比 ' + SNR_MIN_OF_RUN.toFixed(2) + ' < ' + SNR_MIN);
    out[m] = {
      ok: true, homMean: +mean.toFixed(5),
      d_in: +dIn.toFixed(5), d_out: +dOut.toFixed(5), d_rand: +dRad.toFixed(5),
      margin: +margin.toFixed(2),
      pass: mono && marginOk && snrOk,
      why: why.join('；'),
    };
  });
  return out;
}

/* ---------- ① 散度：信号 vs 噪声底 ----------
 * 可逆链上 divNorm 恒 0（恒真式），只有不可逆才有信息。
 * 但在说「散度搬得动」之前，必须先证明那个数不是采样噪声：
 *   信号 = 完整 θ=[a,g,k]（含新颖性与回头惩罚，不可逆）
 *   噪声 = 纯势项 θ=[a,0,0]（严格可逆，净流应只剩采样涨落）
 * 两者用**同种子、同步数、同单种子口径**算，比值才有意义。
 * 40k 步时比值只有 1.25 ⇒ 那时说「搬得动」就是假绿，所以步数提到 200k。 */
function divOf(Vn, theta, seed) {
  return fluxStats(walkStats(Vn, theta, seed, STEPS).C, Vn).divNorm;
}
function meanRel(xs) {
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return { mean: m, spread: Math.max.apply(null, xs.map((x) => Math.abs(x - m))) / Math.abs(m) };
}
console.log('=== ① 散度：不可逆信号 vs 可逆噪声底（同步数、同种子、单种子口径） ===');
const revProbe = ['S0', 'S2', 'N1'].map((key) => {
  const T = TABLES.find((t) => t.key === key);
  const Vn = T.V.map((x) => x / edgeScale(T.V));
  const sig = meanRel(SEEDS.map((sd) => divOf(Vn, THETA0, sd)));
  const noi = meanRel(SEEDS.map((sd) => divOf(Vn, [THETA0[0], 0, 0], sd)));
  return {
    key, sig: sig.mean, sigSpread: sig.spread,
    noise: noi.mean, noiseSpread: noi.spread,
    ratio: noi.mean > 0 ? sig.mean / noi.mean : Infinity,
  };
});
revProbe.forEach((r) => console.log(
  r.key, ' 信号', Number(r.sig).toFixed(5), '(散布 ' + (r.sigSpread * 100).toFixed(1) + '%)',
  ' 噪声底', Number(r.noise).toFixed(5), '(散布 ' + (r.noiseSpread * 100).toFixed(1) + '%)',
  ' 信噪比', Number(r.ratio).toFixed(2)));
SNR_MIN_OF_RUN = Math.min.apply(null, revProbe.map((r) => r.ratio));
console.log('  ⇒ 散度信噪比下限 =', SNR_MIN_OF_RUN.toFixed(2),
  SNR_MIN_OF_RUN >= SNR_MIN ? '（过线）' : '（不过线 ⇒ divNorm 一律判不合格，d 比值再漂亮也不算）');

/* ---------- ①b 仿射对偶检验：max−V 上这些强度量会不会变 ----------
 * 若不变 ⇒ 它们是「吸引子的指纹」而不是「名字」，当不了达真参照（与 _spec.cjs 同结论）。
 * 这一条同时给通天定边界：可迁移的是强度量，但强度量对符号翻转免疫。 */
const MATCHED = (() => {
  const top = Math.max.apply(null, TABLES[0].V);
  return TABLES[0].V.map((x) => top - x);
})();
const qMain = measureTable(TABLES[0].V, THETA0);
const qAdv = measureTable(MATCHED, THETA0);
console.log('\n=== ①b max−V 对照（仿射对偶是否改变强度量） ===');
console.log('       argmax  divNorm   aPop    dZong   dCuo');
['V', 'max−V'].forEach((lab) => {
  const q = lab === 'V' ? qMain : qAdv;
  console.log(lab.padEnd(6), String(q.argmax).padStart(5),
    Number(q.divNorm).toFixed(5).padStart(8), Number(q.aPop).toFixed(4).padStart(7),
    Number(q.dZong).toFixed(4).padStart(7), Number(q.dCuo).toFixed(4).padStart(7));
});
const advDeltas = {
  divNorm: Math.abs(qMain.divNorm - qAdv.divNorm) / Math.abs(qMain.divNorm),
  aPop: Math.abs(qMain.aPop - qAdv.aPop) / Math.abs(qMain.aPop),
  dZong: Math.abs(qMain.dZong - qAdv.dZong) / Math.abs(qMain.dZong),
  dCuo: Math.abs(qMain.dCuo - qAdv.dCuo) / Math.abs(qMain.dCuo),
};
const advMaxDelta = Math.max.apply(null, Object.values(advDeltas));
console.log('最大相对变化 =', Number(advMaxDelta).toExponential(2),
  advMaxDelta < 1e-9 ? '⇒ 四个量全部对换符号免疫（是强度指纹，不是名字）'
                     : '⇒ 有量会随符号翻转而变（需逐个说清是哪个）');

/* ---------- ② 九表 × 归一化前后 ---------- */
console.log('\n=== ② 九表测量（归一化后） ===');
const rowsN = TABLES.map((T) => ({ key: T.key, fam: T.fam, name: T.name, q: measureTable(T.V, THETA0) }));
console.log('key fam  argmax  divNorm  fluxNorm   aPop     aXx    dZong   dCuo');
rowsN.forEach((r) => console.log(
  r.key.padEnd(3), r.fam.padEnd(4), String(r.q.argmax).padStart(5),
  Number(r.q.divNorm).toFixed(5).padStart(8), Number(r.q.fluxNorm).toFixed(4).padStart(9),
  Number(r.q.aPop).toFixed(4).padStart(7), Number(r.q.aXx).toFixed(4).padStart(7),
  Number(r.q.dZong).toFixed(4).padStart(7), Number(r.q.dCuo).toFixed(4).padStart(7)));

const relN = relScale(rowsN);
console.log('\n=== ③ 相对刻度（归一化后；三道门：单调 + 余量 ≥ ' + MIN_MARGIN + '× + 信噪比 ≥ ' + SNR_MIN + '） ===');
console.log('metric     homMean    d_in     d_out    d_rand   margin  pass  原因');
METRICS.forEach((m) => {
  const q = relN[m];
  if (!q.ok) { console.log(m.padEnd(9), q.why); return; }
  console.log(m.padEnd(9), String(q.homMean).padStart(9), String(q.d_in).padStart(8),
    String(q.d_out).padStart(8), String(q.d_rand).padStart(9), String(q.margin).padStart(7),
    q.pass ? '  ✅  ' : '  ❌  ', q.why || '');
});

/* ---------- ④ 归一化前（对齐控制参数 g 这一步的必要性） ---------- */
/* 注意：measureTable 内部做了 V/es 归一化；要测「不归一化」，走 measureRaw。 */
function measureRaw(V, theta) {
  const runs = SEEDS.map((sd) => walkStats(V, theta || THETA0, sd, STEPS));
  const pi = new Array(N).fill(0);
  runs.forEach((r) => r.pi.forEach((p, i) => { pi[i] += p / runs.length; }));
  const C = [];
  for (let v = 0; v < N; v++) { C.push(new Array(6).fill(0)); runs.forEach((r) => { for (let k = 0; k < 6; k++) C[v][k] += r.C[v][k]; }); }
  const fl = fluxStats(C, V);
  return { divNorm: fl.divNorm, fluxNorm: fl.fluxNorm / edgeScale(V), aPop: aPop(pi), aXx: aXx(pi), dZong: pairDiff(V, H.zong) / edgeScale(V), dCuo: pairDiff(V, H.cuo) / edgeScale(V) };
}
const rowsR = TABLES.map((T) => ({ key: T.key, fam: T.fam, q: measureRaw(T.V, THETA0) }));
const relR = relScale(rowsR);
console.log('\n=== ④ 归一化前（未对齐控制参数 g） ===');
console.log('metric     homMean    d_in     d_out    d_rand   margin  pass  原因');
METRICS.forEach((m) => {
  const q = relR[m];
  if (!q.ok) { console.log(m.padEnd(9), q.why); return; }
  console.log(m.padEnd(9), String(q.homMean).padStart(9), String(q.d_in).padStart(8),
    String(q.d_out).padStart(8), String(q.d_rand).padStart(9), String(q.margin).padStart(7),
    q.pass ? '  ✅  ' : '  ❌  ', q.why || '');
});

/* ---------- 落盘 ---------- */
const out = {
  meta: {
    source: 'Thomas三刀与n刀瓣形_数学说明.html §1 div F / §2 Cₙ 等变 / §5 瓣形幅度',
    steps: STEPS, seeds: SEEDS, theta0: THETA0,
    tables: TABLES.length,
    normalized: 'V/edgeScale(V)，边差均值对齐',
    gates: { minMargin: MIN_MARGIN, snrMin: SNR_MIN, snrMinOfRun: SNR_MIN_OF_RUN },
    metricDefs: {
      divNorm: 'Σ|C[x][k]−C[x^k][k]| / Σ(C[x][k]+C[x^k][k]) ∈ [0,1]；可逆链恒 0',
      fluxNorm: 'Σ(C·|ΔV|)/ΣC 再除以 edgeScale；平均势差通量',
      aPop: '|Σ π·e^{2πi·pop(x)/7}| / Σπ；层数上的相位聚集（瓣形幅度离散版）',
      aXx: '同上，但在十二消息卦环 j=0..11 上算',
      dZong: 'Σ|V(zong(x))−V(x)|/64 再除以 edgeScale；综卦对合下的不对称度',
      dCuo: '同上，用错卦 cuo(x)=63−x',
    },
    ranAt: new Date().toISOString(),
  },
  reversibleProbe: revProbe.map((r) => ({
    key: r.key,
    signal: +r.sig.toFixed(6),
    signalSpread: +r.sigSpread.toFixed(4),
    noise: +r.noise.toFixed(6),
    noiseSpread: +r.noiseSpread.toFixed(4),
    snr: +r.ratio.toFixed(3),
  })),
  affineDual: {
    argmaxV: qMain.argmax, argmaxAdv: qAdv.argmax,
    deltas: advDeltas, maxDelta: advMaxDelta,
    verdict: advMaxDelta < 1e-9 ? '强度量对 Ω→max−V 按构造免疫：是吸引子的指纹，不是名字' : '有量随符号翻转而变',
  },
  tables: rowsN.map((r) => Object.assign({ key: r.key, fam: r.fam, name: r.name }, r.q)),
  reportNormalized: relN,
  reportRaw: relR,
};
fs.writeFileSync('_intensity_result.json', JSON.stringify(out, null, 1), 'utf8');
console.log('\n结果已落 _intensity_result.json');
