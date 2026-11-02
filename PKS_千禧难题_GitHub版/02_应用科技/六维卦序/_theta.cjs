#!/usr/bin/env node
/* _theta.cjs — 演绎第二段：把「自改那一半」也解析出来（θ 的漂移轨迹与终点）
 *
 * ── 为什么还要这一段 ────────────────────────────────
 * `_deduce.cjs` 只解了「θ 冻结」的稳态分布，所以演绎封在 6 分，理由写的是
 * 「能算给定 θ 的行为 ≠ 能算 θ 会变成什么」。这一段补的就是后者。
 *
 * ── 为什么这次能算 ──────────────────────────────────
 * crisi.cjs 的自改是策略梯度（REINFORCE）：
 *     θ ← θ + η · mean_窗口[ (r − r̄) · (φ(y) − E_P[φ]) ]
 * r̄ 是**窗口内的标量**（不是与动作相关的基线）⇒ 它从期望里严格掉出去：
 *     E[(r − c)(φ − Eφ)] = E[r(φ − Eφ)]        （因为 E[φ − Eφ] = 0）
 * 于是「每窗的期望更新量」ḡ(θ) 只依赖 (V, θ)，不含采样 ⇒ 自改轨迹就是 ODE：
 *     θ_{n+1} = clip(θ_n + η·ḡ(θ_n))
 *
 * ── 状态为什么是 384 不是 4096 ──────────────────────
 * (prev, cur) 全展开是 4096，但 prev 与 cur 必然相邻 ⇒ 只有 384 个可达（64×6）。
 * 改写为「(cur, 从第 k 条边来)」，prev = cur ^ bit_k。转移也更简单：
 * 从 (x,k) 走第 j 条边 ⇒ 落到 (x^bit_j, j)，**目的地只依赖 (x,j)**。
 * 🔴 这不是优化，是判据：4096 里 91% 是空状态，用它们算期望等于往分子里掺零。
 *
 * ── 三个必须一起报的量 ────────────────────────────
 * ① 轨迹误差：预测 θ(t) 对实测 θ(t)（50 检查点 × 3 种子）。
 * ② 种子噪声底：同一检查点上三颗种子的散布 —— 误差要落在它里面才叫「没有系统缺口」。
 * ③ 负对照：同一套机器换**打乱的表**去预测 A 的真实轨迹，必须崩。
 *
 * ── 两个真发现（都写进 §9.8） ───────────────────────
 * 🔴 一、`E[r·Eφ] ≠ E[r]·E[φ]`。第一版就是这么写的（`raA − mu*eA`），
 *    在高 a 处把 ḡ_a 算大 **2.9 倍**（终点预测 12.14 对实测 9.57，误差 26.8%）。
 *    错在把「条件均值之积」当成「均值之积」，差的是 Cov_x(E[r|x], Eφ(x))。
 *    改正后终点误差 0.00%。**这个 bug 只在链高度集中时才咬人** ——
 *    a=1 时反而小 1.58 倍（方向还相反），中段 0.90 看着还挺好，差点就当成「近似够用」。
 * 🔴 二、D 组（对抗表 max−V）的 θ 与 A 组逐位相同，**不是数值巧合**：
 *    V(x) + V(63−x) ≡ 0.330000（错卦＝六爻全取反），
 *    而「全取反」是 Q₆ 的图自同构 ⇒ 对抗表只是这张表的**对称像**（差一个常数，
 *    常数在 softmax 与中心化里都消掉）⇒ 整条 θ 动力学按构造不变。
 *    所以「12 组里独立序只有 1 个」要再升一级：**D/E 与 A/C 在动力学上完全等价**，
 *    它不是第二张「错表」，是同一张表站在镜子里。
 */
'use strict';

const fs = require('fs');
const path = require('path');
const H6 = require('./hexagram.cjs');
const CR = require('./crisi.cjs');

const N = 64;
const NS = N * 6;                       /* 384 个可达增广状态 */
const TAU = 64;                         /* 与 crisi.cjs 同 */
const ETA = 0.6;                        /* 与 crisi.cjs 默认同 */
const WIN = 200;                        /* 自改周期 */
const MWIN = 2000;                      /* 度量周期（curve 采样间隔）*/
const STEPS = 100000;
const NWIN = Math.floor(STEPS / WIN);   /* 500 次自改 */
const CKPT = Math.floor(MWIN / WIN);    /* 每 10 次自改一个检查点 */
const LIM = CR.LIMITS;                  /* { A:40, G:12, K:12 } */
const THETA0 = { a: CR.THETA0[0], g: CR.THETA0[1], k: CR.THETA0[2] };

/* ── 四道门（阈值与判据同源，不散落在各家脚本里） ── */
const GATE = {
  TRAJ: 1.0,        /* 轨迹中位误差 / 种子噪声底 ≤ 1.0（残差落在采样噪声以内） */
  SEP: 3.0,         /* 乱表交叉 / 真表 的中位误差比 ≥ 3 */
  GRAD: 0.10,       /* 逐点 ḡ 的 实测/解析 比值必须落在 1±0.10 */
  END: 0.02,        /* 终点每个分量的相对误差 ≤ 2% */
};

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/* ── 表 ───────────────────────────────────────────── */
function vWei() {
  const V = new Array(N);
  for (let v = 0; v < N; v++) V[v] = H6.yaoScoreSum(v);
  return V;
}
function vShuffled(seed) {
  const a = vWei();
  let s = seed >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = N - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
  return a;
}

/* 转移目的地：状态 (x,k) 走第 j 条边 ⇒ (x^bit_j, j)。与 k 无关。 */
const TO = new Int32Array(NS * 6);
for (let x = 0; x < N; x++) {
  for (let k = 0; k < 6; k++) {
    for (let j = 0; j < 6; j++) TO[(x * 6 + k) * 6 + j] = (x ^ (1 << j)) * 6 + j;
  }
}

/* logits 逐字复刻 crisi.cjs:235-241 */
function buildP(V, th, nov) {
  const pr = new Float64Array(NS * 6);
  const lg = new Float64Array(6);
  for (let x = 0; x < N; x++) {
    const vx = V[x];
    for (let k = 0; k < 6; k++) {
      let mx = -Infinity;
      for (let j = 0; j < 6; j++) {
        const y = x ^ (1 << j);
        lg[j] = th.a * (V[y] - vx) + th.g * nov[y] - th.k * (j === k ? 1 : 0);
        if (lg[j] > mx) mx = lg[j];
      }
      let Z = 0;
      for (let j = 0; j < 6; j++) { lg[j] = Math.exp(lg[j] - mx); Z += lg[j]; }
      const o = (x * 6 + k) * 6;
      for (let j = 0; j < 6; j++) pr[o + j] = lg[j] / Z;
    }
  }
  return pr;
}

/* 幂迭代。warm 给上一窗的解（O(60) → O(3)）。
 * 🔴 这条链是二部图（每步翻一 bit ⇒ prev 的奇偶必翻转），**周期 2**。
 *    但从「384 状态上的均匀分布」出发，两个奇偶类质量相等 ⇒ 与周期特征向量正交
 *    ⇒ 幂迭代照样收敛到时间平均（实测每步比值 ~0.55）。
 *    换成「从单点出发」就会振荡 —— 所以这个初值不是随手写的。 */
function stat(pr, warm, iters, tol) {
  let pi = warm ? Float64Array.from(warm) : new Float64Array(NS).fill(1 / NS);
  let nx = new Float64Array(NS);
  let d = Infinity, it = 0;
  for (; it < (iters || 400); it++) {
    nx.fill(0);
    for (let s = 0; s < NS; s++) {
      const w = pi[s];
      if (w === 0) continue;
      const o = s * 6;
      for (let j = 0; j < 6; j++) nx[TO[o + j]] += w * pr[o + j];
    }
    d = 0;
    for (let i = 0; i < NS; i++) d += Math.abs(nx[i] - pi[i]);
    const t = pi; pi = nx; nx = t;
    if (d < (tol || 1e-13)) { it++; break; }
  }
  let z = 0;
  for (let i = 0; i < NS; i++) z += pi[i];
  for (let i = 0; i < NS; i++) pi[i] /= z;
  return { pi, iters: it, d };
}

function sigma(pi) {
  const sg = new Float64Array(N);
  for (let x = 0; x < N; x++) { let s = 0; for (let k = 0; k < 6; k++) s += pi[x * 6 + k]; sg[x] = s; }
  return sg;
}

/* nov 的自洽近似，两种都算、两种都报（不许先挑后报）：
 *   A 式（_deduce 用的）：nov = 1 − e^(−1/(64σ))
 *   B 式（间隔严格指数时的解析期望）：E[1−e^(−G/64)] = 1/(1+64σ)
 * B 是 A 的 Jensen 修正 —— A 把均值代进凹函数，系统性偏高（σ=1/64 时 0.632 vs 0.500）。 */
function novFrom(sg, mode) {
  const nv = new Float64Array(N);
  for (let y = 0; y < N; y++) {
    const s = sg[y];
    if (!(s > 0)) { nv[y] = 1; continue; }
    nv[y] = mode === 'B' ? 1 / (1 + TAU * s) : 1 - Math.exp(-1 / (TAU * s));
  }
  return nv;
}

function solveSC(V, th, warm, mode) {
  let nov = warm && warm.nov ? Float64Array.from(warm.nov)
    : new Float64Array(N).fill(1 - Math.exp(-1 / TAU));
  let pi = warm && warm.pi ? Float64Array.from(warm.pi) : null;
  let out = null;
  for (let it = 1; it <= 40; it++) {
    const pr = buildP(V, th, nov);
    const st = stat(pr, pi, 400, 1e-13);
    pi = st.pi;
    const sg = sigma(pi);
    const nn = novFrom(sg, mode);
    let gap = 0;
    for (let y = 0; y < N; y++) gap = Math.max(gap, Math.abs(nn[y] - nov[y]));
    for (let y = 0; y < N; y++) nov[y] = 0.3 * nov[y] + 0.7 * nn[y];
    out = { pi, sg, nov: Float64Array.from(nov), pr, outer: it, inner: st.iters, gap };
    if (gap < 1e-10) break;
  }
  return out;
}

/* ── 期望更新量 ḡ(θ) = E[r·(φ − Eφ)] ────────────────
 * 🔴 关键一步：E[r·Eφ] **不是** E[r]·E[φ]。
 *    正确写法是逐状态算「条件期望之积」再按 π 加权：
 *        ḡ_i = Σ_{x,k} π(x,k) [ Σ_j P(j|x,k)·r(y)·φ_i(x,j) − Eφ_i(x,k)·Er(x,k) ]
 *    第一版写成 E[rφ] − E[r]·E[φ]，差的是 Cov_x(Er(x), Eφ(x))：
 *    Er 是「x 附近的 V 水平」、Eφ 是「x 处的坡度」，两者正相关，
 *    所以第一版在高 a（链缩到 8 个状态）时把 ḡ_a 算大 2.9 倍。
 * φ 三分量逐字照 crisi.cjs:264-266：ΔV、nov(y)、back=(y===prev)。
 * ⚠️ 第三项的符号：代码累加 `+back − E[back]`，而 ∂logit/∂k = −back
 *    ⇒ 与它自己注释里写的 φ=[ΔV, nov, −back] 相反，即 k 方向实际在做**下降**。
 *    这里照抄实现（要预测的是实现，不是教科书），但把它记进 kSignFlip。 */
function grad(pi, pr, V, nov) {
  let gA = 0, gG = 0, gK = 0;
  for (let x = 0; x < N; x++) {
    const vx = V[x];
    for (let k = 0; k < 6; k++) {
      const w = pi[x * 6 + k];
      if (w === 0) continue;
      const o = (x * 6 + k) * 6;
      let er = 0, eA = 0, eG = 0, eK = 0;
      let rA = 0, rG = 0, rK = 0;
      for (let j = 0; j < 6; j++) {
        const p = pr[o + j];
        if (p === 0) continue;
        const y = x ^ (1 << j);
        const ry = V[y], dv = ry - vx, bk = (j === k ? 1 : 0);
        er += p * ry;
        eA += p * dv; eG += p * nov[y]; eK += p * bk;
        rA += p * ry * dv; rG += p * ry * nov[y]; rK += p * ry * bk;
      }
      gA += w * (rA - eA * er);
      gG += w * (rG - eG * er);
      gK += w * (rK - eK * er);
    }
  }
  return { a: gA, g: gG, k: gK };
}

/* ── 负对照：第一版那个错算式 ──────────────────────
 * 写成 E[rφ] − E[r]·E[φ]（把「条件均值之积」当成「均值之积」）。
 * 留着它不是为了纪念，是为了让页面上的「2.9 倍」是**复算出来的**而不是我抄的：
 * 每次运行都能重新量一遍这个 bug 有多大。 */
function gradBuggy(pi, pr, V, nov) {
  let eA = 0, eG = 0, eK = 0, rA = 0, rG = 0, rK = 0, mu = 0;
  for (let x = 0; x < N; x++) {
    const vx = V[x];
    for (let k = 0; k < 6; k++) {
      const w = pi[x * 6 + k];
      if (w === 0) continue;
      const o = (x * 6 + k) * 6;
      for (let j = 0; j < 6; j++) {
        const p2 = pr[o + j];
        if (p2 === 0) continue;
        const y = x ^ (1 << j);
        const ry = V[y], dv = ry - vx, bk = (j === k ? 1 : 0);
        eA += w * p2 * dv; eG += w * p2 * nov[y]; eK += w * p2 * bk;
        rA += w * p2 * ry * dv; rG += w * p2 * ry * nov[y]; rK += w * p2 * ry * bk;
      }
    }
  }
  for (let x = 0; x < N; x++) { let t = 0; for (let k = 0; k < 6; k++) t += pi[x * 6 + k]; mu += t * V[x]; }
  return { a: rA - mu * eA, g: rG - mu * eG, k: rK - mu * eK };
}

/* ── 实测 ḡ：θ 冻结，逐字复刻 crisi.cjs 的累加 ──────
 * 判「解析期望对不对」必须在固定 θ 下比，否则混进 ODE 积分误差，
 * 分不清是公式错还是积分错。 */
function gradSim(V, th, steps, seed, win) {
  const w = win || WIN;
  let sd = seed >>> 0;
  const rnd = () => { sd = (sd * 1664525 + 1013904223) >>> 0; return sd / 4294967296; };
  let x = 0, prev = 0;
  const seen = new Int32Array(N).fill(-1); seen[x] = 0;
  const lg = new Float64Array(6), pr = new Float64Array(6);
  let g = [0, 0, 0], sumR = 0, nR = 0;
  const per = [];
  for (let t = 1; t <= steps; t++) {
    let mx = -Infinity;
    for (let j = 0; j < 6; j++) {
      const y = x ^ (1 << j);
      const nov = 1 - Math.exp(-((seen[y] < 0 ? t : t - seen[y])) / TAU);
      lg[j] = th.a * (V[y] - V[x]) + th.g * nov - th.k * (y === prev ? 1 : 0);
      if (lg[j] > mx) mx = lg[j];
    }
    let Z = 0;
    for (let j = 0; j < 6; j++) { pr[j] = Math.exp(lg[j] - mx); Z += pr[j]; }
    for (let j = 0; j < 6; j++) pr[j] /= Z;
    let u = rnd(), acc = 0, pick = 5;
    for (let j = 0; j < 6; j++) { acc += pr[j]; if (u < acc) { pick = j; break; } }
    const y = x ^ (1 << pick);
    const novY = 1 - Math.exp(-((seen[y] < 0 ? t : t - seen[y])) / TAU);
    const r = V[y];
    let eDV = 0, eNov = 0, eBack = 0;
    for (let j = 0; j < 6; j++) {
      const z = x ^ (1 << j);
      eDV += pr[j] * (V[z] - V[x]);
      eNov += pr[j] * (1 - Math.exp(-((seen[z] < 0 ? t : t - seen[z])) / TAU));
      eBack += pr[j] * (z === prev ? 1 : 0);
    }
    const adv = r - (nR ? sumR / nR : r);
    g[0] += adv * (V[y] - V[x] - eDV);
    g[1] += adv * (novY - eNov);
    g[2] += adv * ((y === prev ? 1 : 0) - eBack);
    prev = x; x = y; seen[x] = t;
    sumR += r; nR++;
    if (t % w === 0) { per.push({ a: g[0] / w, g: g[1] / w, k: g[2] / w }); g = [0, 0, 0]; sumR = 0; nR = 0; }
  }
  const avg = { a: 0, g: 0, k: 0 };
  for (const c of per) { avg.a += c.a / per.length; avg.g += c.g / per.length; avg.k += c.k / per.length; }
  const sdev = (key) => {
    const m = avg[key];
    return Math.sqrt(per.reduce((s2, c) => s2 + (c[key] - m) ** 2, 0) / per.length);
  };
  return { avg, sd: { a: sdev('a'), g: sdev('g'), k: sdev('k') }, nWin: per.length };
}

/* ── 积分 ODE ──────────────────────────────────── */
function ode(V, opts) {
  const o = opts || {};
  const th = { a: THETA0.a, g: THETA0.g, k: THETA0.k };
  const traj = [];
  let warm = null;
  const hits = { a: 0, g: 0, k: 0 };
  for (let n = 1; n <= NWIN; n++) {
    const st = solveSC(V, th, warm, o.mode || 'A');
    warm = { pi: st.pi, nov: st.nov };
    const gr = grad(st.pi, st.pr, V, st.nov);
    const raw = { a: th.a + ETA * gr.a, g: th.g + ETA * gr.g, k: th.k + ETA * gr.k };
    th.a = clamp(raw.a, 0, LIM.A); th.g = clamp(raw.g, 0, LIM.G); th.k = clamp(raw.k, 0, LIM.K);
    if (raw.a !== th.a) hits.a++;
    if (raw.g !== th.g) hits.g++;
    if (raw.k !== th.k) hits.k++;
    if (n % CKPT === 0) traj.push({ t: n * WIN, a: th.a, g: th.g, k: th.k, gA: gr.a, gG: gr.g, gK: gr.k });
  }
  return { th, traj, hits };
}

const q = (arr, p) => {
  const a = Array.from(arr).sort((x, y) => x - y);
  if (!a.length) return NaN;
  return a[Math.min(a.length - 1, Math.max(0, Math.round((a.length - 1) * p)))];
};

function actual(V) {
  const base = { steps: STEPS, window: WIN, mwin: MWIN, cap: 5000, learn: true, bonus: 0 };
  return CR.SEEDS.map((sd) => CR.simulate(Object.assign({}, base, { V, Vtrue: vWei(), theta0: CR.THETA0, seed: sd })));
}

function relErr(pred, act) {
  const d = [pred.a - act.a, pred.g - act.g, pred.k - act.k];
  const na = Math.sqrt(act.a * act.a + act.g * act.g + act.k * act.k) || 1;
  return Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]) / na;
}

function main() {
  const t0 = Date.now();
  const V = vWei();
  const out = {};

  /* ① ODE 预测（两种 nov 近似各跑一遍）与 3 颗种子的实测 */
  const P = ode(V, { mode: 'A' });
  const PB = ode(V, { mode: 'B' });
  const runs = actual(V);
  const K = P.traj.length;

  const actMean = [], noise = [], errA = [], errB = [];
  for (let i = 0; i < K; i++) {
    const row = runs.map((r) => r.curve[i]);
    const m = {
      a: row.reduce((s, c) => s + c.a, 0) / row.length,
      g: row.reduce((s, c) => s + c.g, 0) / row.length,
      k: row.reduce((s, c) => s + c.k, 0) / row.length,
    };
    actMean.push(m);
    let v = 0;
    for (const c of row) v += (c.a - m.a) ** 2 + (c.g - m.g) ** 2 + (c.k - m.k) ** 2;
    const sd = Math.sqrt(v / row.length);
    const nrm = Math.sqrt(m.a * m.a + m.g * m.g + m.k * m.k) || 1;
    noise.push(sd / nrm);
    errA.push(relErr(P.traj[i], m));
    errB.push(relErr(PB.traj[i], m));
  }

  /* ② 负对照：打乱的表跑同一套机器，去预测 A 的真实轨迹 */
  const PS = ode(vShuffled(20261102), { mode: 'A' });
  const errS = [];
  for (let i = 0; i < K; i++) errS.push(relErr(PS.traj[i], actMean[i]));

  /* ③ 终点 */
  const endAct = runs.reduce((s, r) => ({
    a: s.a + r.thetaEnd.a / runs.length,
    g: s.g + r.thetaEnd.g / runs.length,
    k: s.k + r.thetaEnd.k / runs.length,
  }), { a: 0, g: 0, k: 0 });

  /* ④ 逐点核 ḡ：固定 θ，解析 vs 实测 */
  const pts = [
    { name: 'θ0 (1,1,0.5)', th: { a: 1, g: 1, k: 0.5 } },
    { name: '中段 (5,0,2.6)', th: { a: 5, g: 0, k: 2.6 } },
    { name: '终点 (9.57,0,5.72)', th: { a: 9.57, g: 0, k: 5.72 } },
  ];
  const gcheck = pts.map((pt) => {
    const st = solveSC(V, pt.th, null, 'A');
    const an = grad(st.pi, st.pr, V, st.nov);
    const ob = gradBuggy(st.pi, st.pr, V, st.nov);
    const si = gradSim(V, pt.th, 60000, 12345, WIN);
    const ratio = { a: si.avg.a / an.a, k: si.avg.k / an.k };
    const ratioOld = { a: si.avg.a / ob.a, k: si.avg.k / ob.k };
    return {
      name: pt.name, th: pt.th,
      ana: { a: an.a, g: an.g, k: an.k },
      old: { a: ob.a, g: ob.g, k: ob.k }, ratioOld,
      sim: si.avg, simSd: si.sd, nWin: si.nWin,
      ratio,
      ratioG: an.g === 0 ? NaN : si.avg.g / an.g,
      /* 链的集中度：σ 最高值与熵（nats）。高 a 下熵从 4.03 掉到 2.09 ⇒ 只剩 ~8 个状态 */
      sMax: Math.max.apply(null, Array.from(st.sg)),
      sEnt: -Array.from(st.sg).reduce((s2, v) => s2 + (v > 0 ? v * Math.log(v) : 0), 0),
      ok: Math.abs(ratio.a - 1) <= GATE.GRAD && Math.abs(ratio.k - 1) <= GATE.GRAD,
    };
  });

  /* ⑤ 对抗表：不是「另一张表」，是这张表的对称像（V(x)+V(63−x) ≡ const） */
  const Va = CR.vAdversarial();
  const PD = ode(Va, { mode: 'A' });
  const runsD = actual(Va);
  const endD = runsD.reduce((s, r) => ({
    a: s.a + r.thetaEnd.a / runsD.length,
    g: s.g + r.thetaEnd.g / runsD.length,
    k: s.k + r.thetaEnd.k / runsD.length,
  }), { a: 0, g: 0, k: 0 });
  let compLo = Infinity, compHi = -Infinity;
  for (let x = 0; x < N; x++) { const s = V[x] + V[63 - x]; compLo = Math.min(compLo, s); compHi = Math.max(compHi, s); }

  /* ⑥ 四道门 */
  const mErr = q(errA, 0.5), mNoise = q(noise, 0.5), mErrS = q(errS, 0.5);
  const endErr = {
    a: Math.abs(P.th.a - endAct.a) / Math.abs(endAct.a),
    g: Math.abs(P.th.g - endAct.g) / (Math.abs(endAct.g) + 0.1),
    k: Math.abs(P.th.k - endAct.k) / Math.abs(endAct.k),
  };
  const gates = {
    traj: mErr <= mNoise * GATE.TRAJ,
    sep: mErrS / mErr >= GATE.SEP,
    grad: gcheck.every((c) => c.ok),
    end: Math.max(endErr.a, endErr.k) <= GATE.END,
  };
  gates.all = gates.traj && gates.sep && gates.grad && gates.end;

  let worstI = 0;
  for (let i = 1; i < K; i++) if (errA[i] > errA[worstI]) worstI = i;

  out.meta = {
    steps: STEPS, win: WIN, mwin: MWIN, nwin: NWIN, ckpt: CKPT, eta: ETA, tau: TAU,
    limits: LIM, theta0: THETA0, seeds: CR.SEEDS, nsState: NS,
    gate: GATE, ranAt: new Date().toISOString(),
  };
  out.ode = { traj: P.traj, hitsClipped: P.hits, end: P.th, endB: PB.th, medB: q(errB, 0.5) };
  out.actual = { mean: actMean, noise, end: endAct, perSeed: runs.map((r) => r.thetaEnd) };
  out.err = { med: mErr, p95: q(errA, 0.95), max: Math.max.apply(null, errA), all: errA, worstI, worstT: P.traj[worstI].t };
  out.noise = { med: mNoise, p95: q(noise, 0.95) };
  out.control = { med: mErrS, p95: q(errS, 0.95), sep: mErrS / mErr, end: PS.th };
  out.endErr = endErr;
  out.gradCheck = gcheck;
  out.gates = gates;
  out.invariance = {
    compSum: [compLo, compHi], compIsConst: (compHi - compLo) < 1e-12,
    aRel: Math.abs(PD.th.a - P.th.a) / Math.abs(P.th.a),
    kRel: Math.abs(PD.th.k - P.th.k) / Math.abs(P.th.k),
    endD, predD: PD.th,
    actDiffA: Math.abs(endD.a - endAct.a) / Math.abs(endAct.a),
    actDiffK: Math.abs(endD.k - endAct.k) / Math.abs(endAct.k),
  };
  out.kSignFlip = {
    note: 'crisi.cjs 累加 +back−E[back]，而 ∂logit/∂k = −back ⇒ k 方向是下降。照抄实现来预测实现，不改历史实验。',
    gradKAtEnd: gcheck[2].ana.k,
  };

  fs.writeFileSync(path.join(__dirname, '_theta_result.json'), JSON.stringify(out, null, 1));

  const pc = (x) => (x * 100).toFixed(2) + '%';
  console.log('θ 轨迹：' + K + ' 检查点 × 3 种子，' + (Date.now() - t0) + ' ms');
  console.log('  误差  中位 ' + pc(mErr) + ' / P95 ' + pc(out.err.p95) + ' / 最大 ' + pc(out.err.max) +
    '（最大在 t=' + P.traj[worstI].t + '）');
  console.log('  B 式(Jensen) 中位 ' + pc(out.ode.medB));
  console.log('  噪声底 中位 ' + pc(mNoise) + ' ⇒ 误差/噪声 = ' + (mErr / mNoise).toFixed(2));
  console.log('  负对照 中位 ' + pc(mErrS) + ' ⇒ 分离度 ' + out.control.sep.toFixed(1) + '×');
  console.log('  终点 预测 a ' + P.th.a.toFixed(4) + ' k ' + P.th.k.toFixed(4) + ' g ' + P.th.g.toFixed(4));
  console.log('       实测 a ' + endAct.a.toFixed(4) + ' k ' + endAct.k.toFixed(4) + ' g ' + endAct.g.toFixed(4));
  console.log('       相对 a ' + pc(endErr.a) + ' / g ' + pc(endErr.g) + ' / k ' + pc(endErr.k));
  console.log('  截断窗数 ' + JSON.stringify(P.hits));
  gcheck.forEach((c) => {
    console.log('  ḡ@' + c.name + '  解析 ' + [c.ana.a, c.ana.g, c.ana.k].map((v) => v.toFixed(5)).join('/') +
      '  错版 ' + c.old.a.toFixed(5) + '（实测/错版 ' + c.ratioOld.a.toFixed(3) + '）' +
      '  实测 ' + [c.sim.a, c.sim.g, c.sim.k].map((v) => v.toFixed(5)).join('/') +
      '  比 ' + c.ratio.a.toFixed(3) + '/' + c.ratio.k.toFixed(3) + '  σ熵 ' + c.sEnt.toFixed(2));
  });
  console.log('  不变性 V(x)+V(63−x) 恒定: ' + out.invariance.compIsConst + ' (=' + compLo.toFixed(6) + ')');
  console.log('  D 预测 vs A 预测: a ' + pc(out.invariance.aRel) + ' k ' + pc(out.invariance.kRel));
  console.log('  D 实测 vs A 实测: a ' + pc(out.invariance.actDiffA) + ' k ' + pc(out.invariance.actDiffK));
  console.log('  门 ' + JSON.stringify(gates));
}

/* 被 require 时不自动跑：判据脚本要单独调 gradSim / ode 做对照实验。 */
if (require.main === module) main();

module.exports = {
  ode, grad, gradBuggy, gradSim, solveSC, stat, sigma, novFrom, buildP, vWei, vShuffled,
  N, NS, TAU, ETA, WIN, MWIN, THETA0, LIM, GATE,
};
