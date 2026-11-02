#!/usr/bin/env node
/* _deduce.cjs — 演绎：用「6 个权重 + θ」解析预测 4096 个增广状态的稳态分布
 *
 * 为什么是这一轴：六轴里选美=0（γ 位置错，不是缺数学）、达真=1／通天=1（缺外部
 * 材料，工具造不出数据）、归纳=6／尽善=6（已实测过，没缺口）。**只有演绎停在
 * 「纯观测」**：现在判的是「最差那一卦多久不回来」，那是在看后端回访间隔，
 * 不是在推。数学工具能给的就是这一步：把「看」换成「解出来再对」。
 *
 * 用什么：遍历理论（Kac 的平均回归时间 1/π）+ 随机过程（不动点 / 稳态方程）
 * + 大偏差（nov 的一步近似）。三个都在老师那张 175 节点的工具表里。
 *
 * 🔴 关键的「不是恒真式」设计：
 *   Kac 引理 E[T⁺]=1/π 对任何有限不可约时齐链**必然成立** ⇒ 拿它当判据就是恒真式。
 *   所以这里判的不是 Kac，而是：**把历史依赖的 nov 项用平稳期望替换后解出自洽的
 *   π，能不能预测真实链（nov 用实际 last-seen）的 π̂**。近似要是不准，它就掉下来。
 *   负对照：把 V 换成随机表重跑同一套机器 —— 若误差一样小，判据没牙，不给分。
 *
 * 状态增广：链的记忆只有「上一卦 p」和「每卦的 last-seen」。
 *   - p 可以精确增广 ⇒ 状态 = p*64 + x，共 4096。
 *   - last-seen 不能增广（64 维时间戳）⇒ 只能用平稳期望近似，这正是误差来源。
 */
'use strict';

const fs = require('fs');
const path = require('path');
const H6 = require('./hexagram.cjs');

const N = 64;
const S = N * N;                        /* 增广状态数 4096 */

const NB = [];
for (let v = 0; v < N; v++) {
  const o = [];
  for (let k = 0; k < 6; k++) o.push(v ^ (1 << k));
  NB.push(o);
}

function vWei() {
  const V = new Array(N);
  for (let v = 0; v < N; v++) V[v] = H6.yaoScoreSum(v);
  return V;
}

/* 随机表：同一个取值范围，打乱卦到值的对应。用作负对照。 */
function vShuffled(seed) {
  const V = vWei();
  const a = V.slice();
  let s = seed >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = N - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

const TAU = 64;                         /* 与 crisi.cjs 同：新颖度时间尺度 */

/* ── 转移矩阵（给定 nov 向量） ─────────────────────────────
 * 逐字复刻 crisi.cjs:135 的 logits：
 *   a*(V[y]-V[x]) + g*nov - k*(y===prev)
 * 状态 (x,p) 的 6 个出口是 y ∈ NB[x]，新状态 (y,x)。 */
function buildTrans(V, th, nov) {
  const to = new Int32Array(S * 6);
  const pr = new Float64Array(S * 6);
  const lg = new Float64Array(6);
  for (let p = 0; p < N; p++) {
    for (let x = 0; x < N; x++) {
      const s = p * N + x;
      const nb = NB[x];
      let mx = -Infinity;
      for (let k = 0; k < 6; k++) {
        const y = nb[k];
        lg[k] = th.a * (V[y] - V[x]) + th.g * nov[y] - th.k * (y === p ? 1 : 0);
        if (lg[k] > mx) mx = lg[k];
      }
      let Z = 0;
      for (let k = 0; k < 6; k++) { lg[k] = Math.exp(lg[k] - mx); Z += lg[k]; }
      /* 状态编码固定为 s = prev*N + cur。从 (p,x) 走到 (x,y) ⇒ 新索引 x*N+y。
       * 🔴 第一版写成 nb[k]*N + x（＝cur*N+prev），与 measure() 的 p*N+x 相反，
       *    于是 marginal() 求和得到的是「上一卦」的边缘，解析分布退化成均匀 1/64，
       *    两个误差数字（解析 vs 均匀基线）印出来一模一样 —— 就是这一行写反的指纹。 */
      for (let k = 0; k < 6; k++) {
        to[s * 6 + k] = x * N + nb[k];
        pr[s * 6 + k] = lg[k] / Z;
      }
    }
  }
  return { to, pr };
}

/* ── 幂迭代求稳态 π ───────────────────────────────────── */
function stationarity(P, iters) {
  let pi = new Float64Array(S).fill(1 / S);
  let nx = new Float64Array(S);
  let lam2 = NaN, prevD = NaN, iter = 0;
  for (iter = 1; iter <= (iters || 4000); iter++) {
    nx.fill(0);
    for (let s = 0; s < S; s++) {
      const w = pi[s];
      if (w === 0) continue;
      const o = s * 6;
      for (let k = 0; k < 6; k++) nx[P.to[o + k]] += w * P.pr[o + k];
    }
    let d = 0;
    for (let i = 0; i < S; i++) d += Math.abs(nx[i] - pi[i]);
    if (Number.isFinite(prevD) && d > 0) lam2 = d / prevD;
    prevD = d;
    const t2 = pi; pi = nx; nx = t2;
    if (d < 1e-14) break;
  }
  let z = 0;
  for (let i = 0; i < S; i++) z += pi[i];
  for (let i = 0; i < S; i++) pi[i] /= z;
  return { pi, iters: iter, lam2, d: prevD };
}

/* 边缘：卦 x 的概率 = Σ_p π(p,x)。平均回归时间 = 1/σ(x)。 */
function marginal(pi) {
  const sg = new Float64Array(N);
  for (let p = 0; p < N; p++) for (let x = 0; x < N; x++) sg[x] += pi[p * N + x];
  return sg;
}

/* ── 自洽：nov 用「平稳期望」的一步近似 ──────────────────
 * 在平稳下，某时刻往回看「上次访问 y 距今多久」≈ 指数分布，均值 1/σ(y)。
 * ⇒ nov(y) ≈ 1 − exp(−(1/σ(y))/TAU)
 * 但 σ 又由 nov 决定 ⇒ 不动点迭代（带阻尼）。 */
function solveSelfConsistent(V, th, outer, damp) {
  let nov = new Float64Array(N).fill(1 - Math.exp(-1 / TAU));
  let last = null;
  for (let it = 1; it <= (outer || 80); it++) {
    const P = buildTrans(V, th, nov);
    const st = stationarity(P, 3000);
    const sg = marginal(st.pi);
    const nn = new Float64Array(N);
    let gap = 0;
    for (let y = 0; y < N; y++) {
      const meanGap = sg[y] > 0 ? 1 / sg[y] : 1e9;
      nn[y] = 1 - Math.exp(-Math.min(meanGap, 1e7) / TAU);
      gap = Math.max(gap, Math.abs(nn[y] - nov[y]));
    }
    for (let y = 0; y < N; y++) nov[y] = (1 - damp) * nov[y] + damp * nn[y];
    last = { pi: st.pi, sg, iters: st.iters, lam2: st.lam2, nov: nov.slice() };
    if (gap < 1e-9) { last.outerIters = it; return last; }
  }
  last.outerIters = outer || 80;
  return last;
}

/* ── 实测：逐字复刻 crisi.cjs 的链（θ 冻结，nov 用实际 last-seen） ──
 * 状态 (x,p) 计数 ⇒ π̂。 */
function measure(V, th, steps, seed, x0) {
  let s = seed >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  let x = x0, prev = x0;
  const seen = new Int32Array(N).fill(-1); seen[x] = 0;
  const cnt = new Float64Array(S);
  const lg = new Float64Array(6);
  for (let t = 1; t <= steps; t++) {
    const p = prev;
    cnt[p * N + x] += 1;
    const nb = NB[x];
    let mx = -Infinity;
    for (let k = 0; k < 6; k++) {
      const y = nb[k];
      const nov = 1 - Math.exp(-(seen[y] < 0 ? t : t - seen[y]) / TAU);
      lg[k] = th.a * (V[y] - V[x]) + th.g * nov - th.k * (y === p ? 1 : 0);
      if (lg[k] > mx) mx = lg[k];
    }
    let Z = 0;
    for (let k = 0; k < 6; k++) { lg[k] = Math.exp(lg[k] - mx); Z += lg[k]; }
    let u = rnd(), acc = 0, pick = 5;
    for (let k = 0; k < 6; k++) { acc += lg[k] / Z; if (u < acc) { pick = k; break; } }
    prev = x; x = nb[pick];
    seen[x] = t;
  }
  let z = 0;
  for (let i = 0; i < S; i++) z += cnt[i];
  for (let i = 0; i < S; i++) cnt[i] /= z;
  return cnt;
}

/* ── 动力学：从单点出发的混合过程 ─────────────────────
 * 解析：把 δ_{x0} 一遍遍乘 P，算 TV 距离到 π。
 * 实测：跑很多条独立短轨迹，每一步统计当前状态 (prev,cur) 的经验分布。
 * 🔴 这条是**故意可能失败**的：nov 在早期很小、后期变大，解析链用的是自洽常数，
 *    动力学一定对不齐。跑出来差多少就写多少，不许拿稳态的准来替动力学的准。 */
/* 🔴 链的周期是 2：Q₆ 是二部图（每步翻一个 bit ⇒ 奇偶类必互换），
 *   再叠加「禁回头」，单步分布永远在偶类/奇类之间来回跳 ⇒ TV 恒 0.5 不收敛。
 *   第一版就撞上了这个（TV 从 t=8 起钉在 0.500 一动不动），不是 bug。
 *   所以动力学只能量偶数步子列（等价于 2 步链 P²，它才非周期、才有极限）。 */
function tvAna(P, pi, x0, T) {
  let cur = new Float64Array(S); cur[x0 * N + x0] = 1;
  let nxt = new Float64Array(S);
  const tv = [];
  for (let t = 0; t <= T; t++) {
    let d = 0;
    for (let i = 0; i < S; i++) d += Math.abs(cur[i] - pi[i]);
    tv.push(t % 2 === 0 ? d / 2 : NaN);
    nxt.fill(0);
    for (let s = 0; s < S; s++) {
      const w = cur[s];
      if (w === 0) continue;
      const o = s * 6;
      for (let k = 0; k < 6; k++) nxt[P.to[o + k]] += w * P.pr[o + k];
    }
    const tmp = cur; cur = nxt; nxt = tmp;
  }
  return tv;
}

function tvSim(V, th, x0, T, runs, pi) {
  const cnt = new Float64Array((T + 1) * S);
  const lg = new Float64Array(6);
  for (let r = 0; r < runs; r++) {
    let s = (1000003 + r * 7919) >>> 0;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    let x = x0, prev = x0;
    const seen = new Int32Array(N).fill(-1); seen[x] = 0;
    for (let t = 0; t <= T; t++) {
      cnt[t * S + prev * N + x] += 1;
      if (t === T) break;
      const p = prev;
      const nb = NB[x];
      let mx = -Infinity;
      for (let k = 0; k < 6; k++) {
        const y = nb[k];
        const nov = 1 - Math.exp(-(seen[y] < 0 ? t : t - seen[y]) / TAU);
        lg[k] = th.a * (V[y] - V[x]) + th.g * nov - th.k * (y === p ? 1 : 0);
        if (lg[k] > mx) mx = lg[k];
      }
      let Z = 0;
      for (let k = 0; k < 6; k++) { lg[k] = Math.exp(lg[k] - mx); Z += lg[k]; }
      let u = rnd(), acc = 0, pick = 5;
      for (let k = 0; k < 6; k++) { acc += lg[k] / Z; if (u < acc) { pick = k; break; } }
      prev = x; x = nb[pick];
      seen[x] = t;
    }
  }
  const tv = [];
  for (let t = 0; t <= T; t++) {
    let d = 0, z = 0;
    for (let i = 0; i < S; i++) z += cnt[t * S + i];
    for (let i = 0; i < S; i++) d += Math.abs(cnt[t * S + i] / z - pi[i]);
    tv.push(t % 2 === 0 ? d / 2 : NaN);    /* 只判偶数步：奇数步按构造落在另一半 */
  }
  return tv;
}

function tvAt(tv, level) {
  for (let t = 0; t < tv.length; t++) if (tv[t] <= level) return t;
  return NaN;
}

function q(arr, p) {
  const a = Array.from(arr).sort((x, y) => x - y);
  if (!a.length) return NaN;
  const i = Math.min(a.length - 1, Math.max(0, Math.round((a.length - 1) * p)));
  return a[i];
}

/* 比对：只看实测访问足够多的卦（否则是采样噪声，不是模型错） */
function compare(sgAna, sgSim, minProb) {
  const errs = [];
  let nUsed = 0;
  for (let x = 0; x < N; x++) {
    if (sgSim[x] < minProb) continue;
    nUsed++;
    errs.push(Math.abs(sgAna[x] / sgSim[x] - 1));
  }
  return { nUsed, med: q(errs, 0.5), p95: q(errs, 0.95), max: q(errs, 1) };
}

/* 均匀基线：同样只看这些卦，若模型只是「知道大概均匀」，误差有多大 */
function uniformBaseline(sgSim, minProb) {
  const errs = [];
  for (let x = 0; x < N; x++) {
    if (sgSim[x] < minProb) continue;
    errs.push(Math.abs((1 / N) / sgSim[x] - 1));
  }
  return { med: q(errs, 0.5), p95: q(errs, 0.95) };
}

function main() {
  const V = vWei();
  const THETA0 = { a: 1.0, g: 1.0, k: 0.5 };
  const STEPS = 300000;
  const SEEDS = [12345, 777, 20261101];
  const MINP = 1e-4;                    /* 实测卦概率低于此 ⇒ 视为样本不足 */

  const out = {
    meta: {
      script: '_deduce.cjs',
      stepsPerSeed: STEPS,
      seeds: SEEDS,
      theta: THETA0,
      states: S,
      tool: '遍历理论（Kac 平均回归 1/π）＋随机过程（稳态不动点）＋大偏差（nov 一步近似）',
      notTautology: 'Kac 对任何有限不可约时齐链恒成立 ⇒ 不拿 Kac 当判据；判的是「平稳期望近似下的自洽 π」能否预测真实链的 π̂',
    },
    runs: [],
  };

  /* 主实验：θ0 下，真表 vs 随机表（负对照），两两做 2×2 交叉
   * 🔴 第一版只做「自预测」，结果随机表的自预测误差（2.25%）比真表（4.26%）还小 ——
   *    「预测得准」本身不构成证据。必须加交叉：拿 V 的解析分布去预测 Vshuf 的实测。
   *    有信息 ⇒ 交叉误差必须明显大于自误差；没信息 ⇒ 两者相当（表等于没用）。 */
  const tables = [
    { name: 'V（位平均真表）', V },
    { name: 'Vshuf（随机表·负对照）', V: vShuffled(20261102) },
  ];

  const got = [];
  for (const tb of tables) {
    const sc = solveSelfConsistent(tb.V, THETA0, 80, 0.5);
    const sims = SEEDS.map((sd) => marginal(measure(tb.V, THETA0, STEPS, sd, 0)));
    const sgAvg = new Float64Array(N);
    for (const m of sims) for (let x = 0; x < N; x++) sgAvg[x] += m[x] / sims.length;
    /* 噪声底：种子之间的相对差（同一张表的同一套解析分布） */
    const noiErrs = [];
    for (let i = 1; i < sims.length; i++) {
      for (let x = 0; x < N; x++) {
        if (sgAvg[x] < MINP) continue;
        noiErrs.push(Math.abs(sims[i][x] / sgAvg[x] - 1));
      }
    }
    got.push({ name: tb.name, sc, sgAvg, noise: { med: q(noiErrs, 0.5), p95: q(noiErrs, 0.95) } });
  }

  /* 2×2：行 = 预测用的表，列 = 实测用的表 */
  const grid = [];
  for (let i = 0; i < got.length; i++) {
    const row = [];
    for (let j = 0; j < got.length; j++) {
      const c = compare(got[i].sc.sg, got[j].sgAvg, MINP);
      row.push({ self: i === j, nUsed: c.nUsed, med: c.med, p95: c.p95, max: c.max });
    }
    grid.push(row);
  }
  const selfMed = grid[0][0].med;
  const crossMed = grid[0][1].med;
  const sep = selfMed > 0 ? crossMed / selfMed : NaN;
  const noiseMed = got[0].noise.med;

  for (let i = 0; i < got.length; i++) {
    const g = got[i];
    out.runs.push({
      table: g.name,
      outerIters: g.sc.outerIters,
      powerIters: g.sc.iters,
      lam2: g.sc.lam2,
      novMin: Math.min.apply(null, Array.from(g.sc.nov)),
      novMax: Math.max.apply(null, Array.from(g.sc.nov)),
      novSpread: Math.max.apply(null, Array.from(g.sc.nov)) - Math.min.apply(null, Array.from(g.sc.nov)),
      marginalAna: Array.from(g.sc.sg).map((v) => +v.toFixed(6)),
      marginalSim: Array.from(g.sgAvg).map((v) => +v.toFixed(6)),
      noise: g.noise,
      base: uniformBaseline(g.sgAvg, MINP),
    });
    console.log('\n=== ' + g.name + ' ===');
    console.log('  自洽 ' + g.sc.outerIters + ' 轮 / 幂迭代 ' + g.sc.iters + ' 步 / λ2≈' + (g.sc.lam2 || NaN).toFixed(6));
    console.log('  nov 范围 ' + out.runs[i].novMin.toFixed(4) + ' ~ ' + out.runs[i].novMax.toFixed(4) +
      '（跨度 ' + out.runs[i].novSpread.toFixed(4) + '）');
    console.log('  均匀基线：中位 ' + (out.runs[i].base.med * 100).toFixed(2) + '%，P95 ' + (out.runs[i].base.p95 * 100).toFixed(2) + '%');
    console.log('  种子噪声底：中位 ' + (g.noise.med * 100).toFixed(2) + '%，P95 ' + (g.noise.p95 * 100).toFixed(2) + '%');
  }

  out.cross = {
    grid: grid.map((r) => r.map((c) => ({ self: c.self, med: +c.med.toFixed(6), p95: +c.p95.toFixed(6), max: +c.max.toFixed(6), nUsed: c.nUsed }))),
    selfMed, crossMed, sep, noiseMed,
    note: '行 = 用哪张表算的解析分布；列 = 对哪张表的实测。对角线＝自预测，反对角＝交叉预测。',
  };

  console.log('\n=== 2×2 交叉（中位误差）===');
  console.log('              预测→      V          Vshuf');
  for (let i = 0; i < 2; i++) {
    console.log('  ' + (i === 0 ? 'V    ' : 'Vshuf') + '  ' +
      grid[i].map((c) => ((c.med * 100).toFixed(2) + '%').padStart(9)).join('  '));
  }
  console.log('  自预测中位 ' + (selfMed * 100).toFixed(2) + '% / 交叉中位 ' + (crossMed * 100).toFixed(2) +
    '% ⇒ 分离度 ' + sep.toFixed(2) + '×（判据要 ≥ 3）；种子噪声底 ' + (noiseMed * 100).toFixed(2) + '%');

  /* ④ 动力学：混合过程。稳态准不代表过程准，这一条单独量、单独报。 */
  const Pfull = buildTrans(V, THETA0, got[0].sc.nov);
  const T4 = 60, RUNS = 3000;
  const tva = tvAna(Pfull, got[0].sc.pi, 0, T4);
  const tvs = tvSim(V, THETA0, 0, T4, RUNS, got[0].sc.pi);
  const probeT = [0, 2, 4, 6, 10, 16, 24, 34, 46, 60];
  console.log('\n=== ④ 动力学：到解析 π 的 TV 距离 ===');
  console.log('  t      ' + probeT.map((t) => String(t).padStart(7)).join(''));
  console.log('  解析   ' + probeT.map((t) => tva[t].toFixed(3).padStart(7)).join(''));
  console.log('  实测   ' + probeT.map((t) => tvs[t].toFixed(3).padStart(7)).join(''));
  const tauA = tvAt(tva, 0.10), tauS = tvAt(tvs, 0.10);
  /* 周期 2 的直接证据：单步 TV 必须钉在 0.5 附近，不能收敛 */
  const tvOdd = tva.map((v, t) => (t % 2 ? t : -1)).filter((t) => t >= 0).slice(0, 6);
  console.log('  TV≤0.10 所需步数：解析 ' + tauA + ' / 实测 ' + tauS +
    (Number.isFinite(tauA) && Number.isFinite(tauS) ? '（实测/解析 ' + (tauS / tauA).toFixed(2) + '×）' : ''));
  out.dynamics = {
    probeT, tvAna: probeT.map((t) => +tva[t].toFixed(5)), tvSim: probeT.map((t) => +tvs[t].toFixed(5)),
    tauAna: tauA, tauSim: tauS, runs: RUNS,
    note: '同参照：都量到解析 π 的 TV。解析链 = 自洽 nov 常数；实测链 = 真实 last-seen，早期 nov 很小。',
  };

  fs.writeFileSync(path.join(__dirname, '_deduce_result.json'), JSON.stringify(out, null, 1));
  console.log('\n已写 _deduce_result.json');
}

main();
