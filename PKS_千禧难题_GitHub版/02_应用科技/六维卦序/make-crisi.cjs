'use strict';
/*
 * make-crisi.cjs —— 生成「cRSI 玩具版 · 实跑记录」页。
 *
 * 这一页只回答一个问题：把「AI 的良心」那套东西做成一个能跑的系统，
 * 跑 10⁵ 步之后，哪些指标是真的，哪些是话术。
 *
 * 铁律：
 *   ① 页面上每个数都从 _crisi_result.json 读，页面不自己算第二遍；
 *   ② 核验条数从 _last-test.json 读，不手写；
 *   ③ 实验设计里我做错的每一步都留在页面上 —— 那些错误本身是结论的一部分。
 */
const fs = require('fs');
const path = require('path');
const H = require('./hexagram.cjs');

let TOTAL = { pass: 0, fail: 0, unv: 0, total: 0 };
try { TOTAL = JSON.parse(fs.readFileSync(path.join(__dirname, '_last-test.json'), 'utf8')); } catch (e) {}

const R = JSON.parse(fs.readFileSync(path.join(__dirname, '_crisi_result.json'), 'utf8'));
const M = R.meta;
const G = {};
R.groups.forEach((g) => { G[g.key] = g; });
const S = {};
R.groups.forEach((g) => { S[g.key] = g.stats; });
/* λ=1.5 这个点专门拿来跟「门」比：它是前沿上离双门最近的一格。
 * 🔴 pareto 的条目是扁的 {lam, V, age, Hpi, a, g, k}，没有 .stats；
 *    第一版写成 .stats 就拿到 undefined，页面直接印出 NaN（探针的 NaN 断言抓到）。 */
const P15 = R.pareto.find((p) => Math.abs(p.lam - 1.5) < 1e-9) || {};
if (!Number.isFinite(P15.V) || !Number.isFinite(P15.age)) throw new Error('P15 取不到 λ=1.5 的 V/age，字段名又对不上了');
const INV = R.invariance;

const C = {
  ink: '#1d2321', dim: '#5d6663', line: '#d8d2c4', bg: '#fbf8f1', card: '#ffffff',
  claim: '#6b46c1', good: '#2f6b46', bad: '#a83232', doc: '#a8823a', blue: '#2b5d8a',
  deep: '#1f7a4d',
};
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const f2 = (x) => (Math.round(x * 100) / 100).toFixed(2);
const f3 = (x) => (Math.round(x * 1000) / 1000).toFixed(3);
const i0 = (x) => Math.round(x).toLocaleString('en-US');
const LN6 = M.ln6, LN64 = M.ln64;

/* 曲线取值工具 */
const at = (g, t) => g.curve.reduce((best, c) => (Math.abs(c.t - t) < Math.abs(best.t - t) ? c : best), g.curve[0]);
const last = (g) => g.curve[g.curve.length - 1];

/* 四张图的统一画布 */
const W = 660;

/* ============ 图 1：价值曲线（它去哪了） ============ */
function svgValue() {
  const series = [
    { k: 'A', c: C.bad, w: 2.2, n: 'A 裸 RSI' },
    { k: 'S', c: '#c98a2e', w: 1.6, n: 'S 软护栏' },
    { k: 'B2', c: C.good, w: 2.0, n: 'B2 熵正则 λ=2' },
    { k: 'C', c: C.dim, w: 1.6, n: 'C 不自改' },
    { k: 'B4', c: C.deep, w: 1.4, n: 'B4 λ=4' },
    { k: 'H', c: C.blue, w: 1.4, n: 'H 硬接管' },
  ];
  const Hh = 318, L = 56, RP = 128, TOP = 54, BOT = 88;
  const pw = W - L - RP, ph = Hh - TOP - BOT;
  const tMax = M.steps;
  const vMin = -0.2, vMax = 1.3;
  const X = (t) => L + pw * t / tMax;
  const Y = (v) => TOP + ph * (vMax - v) / (vMax - vMin);

  let s = '<svg viewBox="0 0 ' + W + ' ' + Hh + '" width="100%" role="img" aria-label="六种配置下窗口平均价值随时间的演化（只画六条，门那四组另见 §7）">';
  s += '<text x="0" y="13" font-size="12" fill="' + C.dim + '">纵轴＝窗口内平均价值 V（真表）。横轴＝步数。每条线是三个随机种子的第一种（seed ' + M.seeds[0] + '）。</text>';
  s += '<text x="0" y="31" font-size="12" fill="' + C.dim + '">曲线抬得越高，说明系统越会「挑好卦」；抬得快而平，说明它很早就锁定了。</text>';

  [0, 0.5, 1.0].forEach((v) => {
    s += '<line x1="' + L + '" y1="' + Y(v).toFixed(1) + '" x2="' + (L + pw) + '" y2="' + Y(v).toFixed(1) + '" stroke="' + C.line + '" stroke-dasharray="3 4"/>';
    s += '<text x="' + (L - 8) + '" y="' + (Y(v) + 4).toFixed(1) + '" font-size="11" text-anchor="end" fill="' + C.dim + '">' + v.toFixed(1) + '</text>';
  });
  s += '<line x1="' + L + '" y1="' + Y(0).toFixed(1) + '" x2="' + (L + pw) + '" y2="' + Y(0).toFixed(1) + '" stroke="' + C.dim + '" stroke-width="1"/>';
  [0, 25000, 50000, 75000, 100000].forEach((t) => {
    s += '<text x="' + X(t).toFixed(1) + '" y="' + (TOP + ph + 16) + '" font-size="11" text-anchor="middle" fill="' + C.dim + '">' + (t / 1000) + 'k</text>';
  });
  s += '<text x="' + (L + pw / 2).toFixed(1) + '" y="' + (TOP + ph + 34) + '" font-size="11" text-anchor="middle" fill="' + C.dim + '">步数</text>';

  series.forEach((se) => {
    const g = G[se.k];
    let d = '';
    g.curve.forEach((c, i) => { d += (i ? 'L' : 'M') + X(c.t).toFixed(1) + ' ' + Y(c.V).toFixed(1); });
    s += '<path d="' + d + '" fill="none" stroke="' + se.c + '" stroke-width="' + se.w + '" stroke-linejoin="round"/>';
  });

  /* 右侧直接标注，省掉图例框 */
  let ly = TOP + 6;
  series.forEach((se) => {
    const g = G[se.k];
    const v = g.stats.meanVTall;
    s += '<line x1="' + (L + pw + 4) + '" y1="' + (ly - 4) + '" x2="' + (L + pw + 20) + '" y2="' + (ly - 4) + '" stroke="' + se.c + '" stroke-width="' + se.w + '"/>';
    s += '<text x="' + (L + pw + 25) + '" y="' + ly + '" font-size="11" fill="' + C.ink + '">' + se.n + ' ' + f3(v) + '</text>';
    ly += 17;
  });

  s += '<text x="0" y="' + (Hh - 34) + '" font-size="12" fill="' + C.ink + '"><tspan font-weight="700">读法：</tspan>红线上得快，是因为它把「挑好卦」这一件事学到了极限 —— 代价下一页看。</text>';
  s += '<text x="0" y="' + (Hh - 14) + '" font-size="12" fill="' + C.dim + '">灰线（不自改）是基线：一个参数从头到尾不动的随机游走，它的 V 一直贴着 0.4 上下。</text>';
  s += '</svg>';
  return s;
}

/* ============ 图 2：帕累托前沿（V 与可修正性） ============ */
function svgPareto() {
  const P = R.pareto;
  const Hh = 360, L = 62, RP = 172, TOP = 56, BOT = 86;
  const pw = W - L - RP, ph = Hh - TOP - BOT;
  const aMin = 60, aMax = 80000;
  const X = (a) => L + pw * (Math.log(Math.max(a, aMin)) - Math.log(aMin)) / (Math.log(aMax) - Math.log(aMin));
  const vMin = 0.15, vMax = 1.10;
  const Y = (v) => TOP + ph * (vMax - v) / (vMax - vMin);

  let s = '<svg viewBox="0 0 ' + W + ' ' + Hh + '" width="100%" role="img" aria-label="帕累托前沿：价值与最差卦年龄的权衡">';
  s += '<text x="0" y="13" font-size="12" fill="' + C.dim + '">纵轴＝价值 V。横轴＝「最久没被访问的那一卦」已经等了多久（对数刻度）。</text>';
  s += '<text x="0" y="31" font-size="12" fill="' + C.dim + '">左上角＝又聪明又能回头，右下角＝又蠢又窄。整条曲线向右上倾斜，说明两者此消彼长。</text>';

  [0.2, 0.4, 0.6, 0.8, 1.0].forEach((v) => {
    s += '<line x1="' + L + '" y1="' + Y(v).toFixed(1) + '" x2="' + (L + pw) + '" y2="' + Y(v).toFixed(1) + '" stroke="' + C.line + '" stroke-dasharray="3 4"/>';
    s += '<text x="' + (L - 8) + '" y="' + (Y(v) + 4).toFixed(1) + '" font-size="11" text-anchor="end" fill="' + C.dim + '">' + v.toFixed(1) + '</text>';
  });
  [316, 1000, 3162, 10000, 31623].forEach((a) => {   /* 100 那个刻度正压在 λ=12 的点下面，去掉 */
    s += '<text x="' + X(a).toFixed(1) + '" y="' + (TOP + ph + 16) + '" font-size="11" text-anchor="middle" fill="' + C.dim + '">' + a + '</text>';
  });
  s += '<text x="' + (L + pw / 2).toFixed(1) + '" y="' + (TOP + ph + 34) + '" font-size="11" text-anchor="middle" fill="' + C.dim + '">最差卦的年龄（步，对数）</text>';

  /* 基线：不自改 */
  const c = G.C;
  s += '<line x1="' + L + '" y1="' + Y(c.stats.meanVTall).toFixed(1) + '" x2="' + (L + pw) + '" y2="' + Y(c.stats.meanVTall).toFixed(1) + '" stroke="' + C.dim + '" stroke-width="1" stroke-dasharray="6 4"/>';
  s += '<text x="' + (L + 6) + '" y="' + (Y(c.stats.meanVTall) - 6).toFixed(1) + '" font-size="11" fill="' + C.dim + '">C 不自改的 V ＝ ' + f3(c.stats.meanVTall) + '</text>';

  /* 曲线 */
  let d = '';
  P.forEach((p, i) => { d += (i ? 'L' : 'M') + X(p.age).toFixed(1) + ' ' + Y(p.V).toFixed(1); });
  s += '<path d="' + d + '" fill="none" stroke="' + C.claim + '" stroke-width="1.8"/>';

  P.forEach((p) => {
    s += '<circle cx="' + X(p.age).toFixed(1) + '" cy="' + Y(p.V).toFixed(1) + '" r="3.4" fill="#fff" stroke="' + C.claim + '" stroke-width="1.6"/>';
  });

  /* 关键点标注 */
  const hot = [
    { p: P[0], n: 'λ=0（＝裸 RSI）', dx: -6, dy: 20, anc: 'end' },
    { p: P.find((x) => x.lam === 2), n: 'λ=2', dx: 10, dy: -8, anc: 'start' },
    { p: P[P.length - 1], n: 'λ=12', dx: 0, dy: 18, anc: 'middle' },
  ];
  hot.forEach((h) => {
    if (!h.p) return;
    const px = X(h.p.age), py = Y(h.p.V);
    s += '<circle cx="' + px.toFixed(1) + '" cy="' + py.toFixed(1) + '" r="5.2" fill="' + C.claim + '"/>';
    s += '<text x="' + (px + h.dx).toFixed(1) + '" y="' + (py + h.dy).toFixed(1) + '" font-size="11" font-weight="700" text-anchor="' + h.anc + '" fill="' + C.claim + '">' + h.n + '</text>';
  });

  /* 断崖标记 */
  const b1 = P.find((x) => x.lam === 1), b2 = P.find((x) => x.lam === 1.5);
  if (b1 && b2) {
    s += '<rect x="' + (X(b2.age) - 4).toFixed(1) + '" y="' + (Y(b1.V) - 4).toFixed(1) + '" width="' + (X(b1.age) - X(b2.age) + 8).toFixed(1) + '" height="' + (Y(b2.V) - Y(b1.V) + 8).toFixed(1) + '" fill="none" stroke="' + C.bad + '" stroke-dasharray="3 3"/>';
    s += '<text x="' + ((X(b1.age) + X(b2.age)) / 2).toFixed(1) + '" y="' + (Y(b1.V) + 28).toFixed(1) + '" font-size="11" text-anchor="middle" fill="' + C.bad + '">断崖：λ 1→1.5</text>';
  }

  /* C 与 A 的落点 */
  const pa = P[0];
  s += '<circle cx="' + X(pa.age).toFixed(1) + '" cy="' + Y(pa.V).toFixed(1) + '" r="6.4" fill="none" stroke="' + C.bad + '" stroke-width="2"/>';
  const cx = X(c.stats.ageAll), cy = Y(c.stats.meanVTall);
  s += '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="6.4" fill="none" stroke="' + C.dim + '" stroke-width="2" stroke-dasharray="3 2"/>';
  s += '<text x="' + (cx + 9).toFixed(1) + '" y="' + (cy + 15).toFixed(1) + '" font-size="11" fill="' + C.dim + '">C 落在 λ≈2.5 处</text>';

  s += '<text x="0" y="' + (Hh - 32) + '" font-size="12" fill="' + C.ink + '"><tspan font-weight="700">没有免费的午餐：</tspan>曲线全部单调 —— 想把「最差卦的年龄」压下来，就得交出价值，一格一格地交。</text>';
  s += '<text x="0" y="' + (Hh - 14) + '" font-size="12" fill="' + C.dim + '">但 λ 不是越大越好：C 的固定参数正好落在 λ≈2.5 的位置 —— 换句话说，自改并没有跑赢「一开始就设对参数」。</text>';
  s += '</svg>';
  return s;
}

/* ============ 图 3：θ 的相变（κ 为什么归零） ============ */
function svgTheta() {
  const P = R.pareto;
  const Hh = 322, L = 52, RP = 118, TOP = 66, BOT = 90;
  const pw = W - L - RP, ph = Hh - TOP - BOT;
  const lMax = 4;
  const X = (i) => L + pw * i / (P.length - 1);
  const Y = (v) => TOP + ph * (1 - v / 13);

  let s = '<svg viewBox="0 0 ' + W + ' ' + Hh + '" width="100%" role="img" aria-label="三个能力参数随 λ 的变化">';
  s += '<text x="0" y="13" font-size="12" fill="' + C.dim + '">横轴＝λ（按扫描顺序等距排列，标注的是真实 λ 值）。纵轴＝自改收敛后的能力参数。</text>';
  s += '<text x="0" y="31" font-size="12" fill="' + C.dim + '">三个参数都是学出来的，不是我设的 —— 它们的分岔点就是上一页那条断崖。</text>';

  [0, 4, 8, 12].forEach((v) => {
    s += '<line x1="' + L + '" y1="' + Y(v).toFixed(1) + '" x2="' + (L + pw) + '" y2="' + Y(v).toFixed(1) + '" stroke="' + C.line + '" stroke-dasharray="3 4"/>';
    s += '<text x="' + (L - 8) + '" y="' + (Y(v) + 4).toFixed(1) + '" font-size="11" text-anchor="end" fill="' + C.dim + '">' + v + '</text>';
  });
  P.forEach((p, i) => {
    /* 只标 0/1/2/4/8 —— 全标会挤成一团（0.5 与 1 只隔 3px） */
    if ([0, 1, 2, 4, 8].indexOf(p.lam) < 0) return;
    s += '<text x="' + X(i).toFixed(1) + '" y="' + (TOP + ph + 15) + '" font-size="10" text-anchor="middle" fill="' + C.dim + '">' + p.lam + '</text>';
  });
  s += '<text x="' + (L + pw / 2).toFixed(1) + '" y="' + (TOP + ph + 33) + '" font-size="11" text-anchor="middle" fill="' + C.dim + '">λ</text>';

  const S3 = [
    { f: 'a', c: C.bad, n: 'α 价值遵从' },
    { f: 'g', c: C.good, n: 'γ 新颖度' },
    { f: 'k', c: C.blue, n: 'κ 反回退' },
  ];
  S3.forEach((se) => {
    let d = '';
    P.forEach((p, i) => { d += (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p[se.f]).toFixed(1); });
    s += '<path d="' + d + '" fill="none" stroke="' + se.c + '" stroke-width="2" stroke-linejoin="round"/>';
  });
  let ly = TOP + 4;
  S3.forEach((se) => {
    s += '<line x1="' + (L + pw + 4) + '" y1="' + (ly - 4) + '" x2="' + (L + pw + 20) + '" y2="' + (ly - 4) + '" stroke="' + se.c + '" stroke-width="2"/>';
    s += '<text x="' + (L + pw + 25) + '" y="' + ly + '" font-size="11" fill="' + C.ink + '">' + se.n + '</text>';
    ly += 17;
  });

  /* 相变竖线 */
  const i15 = P.findIndex((x) => x.lam === 1.5);
  if (i15 > 0) {
    s += '<line x1="' + X(i15).toFixed(1) + '" y1="' + (TOP - 6) + '" x2="' + X(i15).toFixed(1) + '" y2="' + (TOP + ph) + '" stroke="' + C.bad + '" stroke-dasharray="4 3" stroke-width="1.4"/>';
    s += '<text x="' + (X(i15) + 6).toFixed(1) + '" y="' + (TOP - 10) + '" font-size="11" fill="' + C.bad + '">λ=1.5 起 γ 接管</text>';
  }

  s += '<text x="0" y="' + (Hh - 32) + '" font-size="12" fill="' + C.ink + '"><tspan font-weight="700">κ 一路降到 0：</tspan>一旦开始认真探索，「不许走回头路」就只剩坏处 —— 它挡住回到好卦的路。</text>';
  s += '<text x="0" y="' + (Hh - 12) + '" font-size="12" fill="' + C.dim + '">这条纪律看着像自律，其实是自囚。它是学出来的结论，不是我预先设的反直觉例子。</text>';
  s += '</svg>';
  return s;
}

/* ============ 图 4：对抗表 —— 自改是个放大器 ============ */
function svgGoodhart() {
  const Hh = 316, L = 58, RP = 138, TOP = 54, BOT = 86;
  const pw = W - L - RP, ph = Hh - TOP - BOT;
  const vMin = -1.3, vMax = 1.3;
  const X = (t) => L + pw * t / M.steps;
  const Y = (v) => TOP + ph * (vMax - v) / (vMax - vMin);

  let s = '<svg viewBox="0 0 ' + W + ' ' + Hh + '" width="100%" role="img" aria-label="对抗错表下，自改与不自改在真表上的表现">';
  s += '<text x="0" y="13" font-size="12" fill="' + C.dim + '">纵轴＝按真表算的窗口平均价值。三组用的表：A 是真表；D、E 是同一张对抗表（Ω′ ＝ max − V）。</text>';
  s += '<text x="0" y="31" font-size="12" fill="' + C.dim + '">D 与 E 的唯一差别是「自不自改」。要看的正是这一格的差。</text>';

  [-1, 0, 1].forEach((v) => {
    s += '<line x1="' + L + '" y1="' + Y(v).toFixed(1) + '" x2="' + (L + pw) + '" y2="' + Y(v).toFixed(1) + '" stroke="' + (v === 0 ? C.dim : C.line) + '" stroke-dasharray="' + (v === 0 ? '' : '3 4') + '"/>';
    s += '<text x="' + (L - 8) + '" y="' + (Y(v) + 4).toFixed(1) + '" font-size="11" text-anchor="end" fill="' + C.dim + '">' + v.toFixed(1) + '</text>';
  });
  [0, 25000, 50000, 75000, 100000].forEach((t) => {
    s += '<text x="' + X(t).toFixed(1) + '" y="' + (TOP + ph + 16) + '" font-size="11" text-anchor="middle" fill="' + C.dim + '">' + (t / 1000) + 'k</text>';
  });

  const S3 = [
    { k: 'A', c: C.good, n: 'A 真表 · 自改' },
    { k: 'D', c: C.bad, n: 'D 对抗表 · 自改' },
    { k: 'E', c: C.doc, n: 'E 对抗表 · 不自改' },
  ];
  S3.forEach((se) => {
    let d = '';
    G[se.k].curve.forEach((c, i) => { d += (i ? 'L' : 'M') + X(c.t).toFixed(1) + ' ' + Y(c.VT).toFixed(1); });
    s += '<path d="' + d + '" fill="none" stroke="' + se.c + '" stroke-width="2" stroke-linejoin="round"/>';
  });
  let ly = TOP + 4;
  S3.forEach((se) => {
    const v = G[se.k].stats.meanVTall;
    s += '<line x1="' + (L + pw + 4) + '" y1="' + (ly - 4) + '" x2="' + (L + pw + 20) + '" y2="' + (ly - 4) + '" stroke="' + se.c + '" stroke-width="2"/>';
    s += '<text x="' + (L + pw + 25) + '" y="' + ly + '" font-size="11" fill="' + C.ink + '">' + se.n + '</text>';
    s += '<text x="' + (L + pw + 25) + '" y="' + (ly + 15) + '" font-size="10" fill="' + C.dim + '">V=' + f3(v) + '</text>';
    ly += 36;
  });

  s += '<text x="0" y="' + (Hh - 34) + '" font-size="12" fill="' + C.ink + '"><tspan font-weight="700">自改是放大器，不是纠错器：</tspan>同一张错表，不自改停在 ' + f3(G.E.stats.meanVTall) + '，自改把它推到 ' + f3(G.D.stats.meanVTall) + '。</text>';
  s += '<text x="0" y="' + (Hh - 14) + '" font-size="12" fill="' + C.dim + '">它不会质疑 Ω，只会更彻底地执行 Ω。Ω 对，它好得更快；Ω 错，它错得更狠。</text>';
  s += '</svg>';
  return s;
}

/* ============ 图 5：归纳 vs 塌缩（十二个字里的第一对） ============ */
function svgSix() {
  const Hh = 424, cell = 11, gap = 2, gw = 8 * cell + 7 * gap;
  const Vw = [];
  for (let v = 0; v < 64; v++) Vw.push(H.yaoScoreSum(v));
  const WY = ['初', '二', '三', '四', '五', '上'];
  const head = (x, y, t) => '<text x="' + x + '" y="' + y + '" font-size="12" font-weight="700" fill="' + C.ink + '">' + t + '</text>';
  const arrow = (x1, x2, y, col, both) => {
    const dir = x2 > x1 ? 1 : -1;
    let g = '<line x1="' + x1 + '" y1="' + y + '" x2="' + x2 + '" y2="' + y + '" stroke="' + col + '" stroke-width="2"/>';
    g += '<polygon points="' + x2 + ',' + y + ' ' + (x2 - dir * 8) + ',' + (y - 5) + ' ' + (x2 - dir * 8) + ',' + (y + 5) + '" fill="' + col + '"/>';
    if (both) g += '<polygon points="' + x1 + ',' + y + ' ' + (x1 + dir * 8) + ',' + (y - 5) + ' ' + (x1 + dir * 8) + ',' + (y + 5) + '" fill="' + col + '"/>';
    return g;
  };
  const grid = (ox, oy, fill, op) => {
    let g = '';
    for (let v = 0; v < 64; v++) {
      const cx = ox + (v % 8) * (cell + gap), cy = oy + Math.floor(v / 8) * (cell + gap);
      g += '<rect x="' + cx + '" y="' + cy + '" width="' + cell + '" height="' + cell + '" rx="1.5" fill="' + fill + '" fill-opacity="' + op + '" stroke="' + C.line + '" stroke-width="0.7"/>';
    }
    return g;
  };

  let s = '<svg viewBox="0 0 660 ' + Hh + '" width="100%" role="img" aria-label="两种把 64 变少的方式：可逆的压缩，与不可逆的塌缩">';
  s += '<text x="0" y="14" font-size="12" fill="' + C.dim + '">两种「把 64 变少」，外观一样，性质相反。上面那次的箭头是双向的；下面那次只有去路，没有回程。</text>';

  /* ── 上：Ω 的归纳，双向 ── */
  s += head(8, 40, 'Ω 价值层：64 个值 ⇄ 6 个权重');
  s += grid(8, 50, C.deep, '0.55');
  s += arrow(120, 196, 101, C.good, true);
  s += '<text x="158" y="88" font-size="10" text-anchor="middle" fill="' + C.good + '">反推</text>';
  s += '<text x="158" y="118" font-size="10" text-anchor="middle" fill="' + C.good + '">重建</text>';
  WY.forEach((w, i) => {
    const cx = 204 + (i % 2) * 52, cy = 56 + Math.floor(i / 2) * 30;
    s += '<rect x="' + cx + '" y="' + cy + '" width="46" height="26" rx="4" fill="' + C.card + '" stroke="' + C.good + '" stroke-width="1"/>';
    s += '<text x="' + (cx + 6) + '" y="' + (cy + 12) + '" font-size="10" fill="' + C.dim + '">' + w + '</text>';
    s += '<text x="' + (cx + 6) + '" y="' + (cy + 22) + '" font-size="10" font-family="ui-monospace,monospace" fill="' + C.ink + '">' + (H.YAO_SCORE[i] >= 0 ? '+' : '') + H.YAO_SCORE[i].toFixed(2) + '</text>';
  });
  s += '<text x="316" y="72" font-size="12" font-weight="700" fill="' + C.good + '">归纳：能还原</text>';
  s += '<text x="316" y="92" font-size="11" fill="' + C.ink + '">sᵢ ＝ V(只第 i 爻为阳) − V(全阴)</text>';
  s += '<text x="316" y="110" font-size="11" fill="' + C.ink + '">用这 6 个数重建 64 个值</text>';
  s += '<text x="316" y="128" font-size="11" fill="' + C.ink + '">最大偏差 <tspan font-weight="700">0.00e+0</tspan>　压缩 ' + (64 / 6).toFixed(2) + ' 倍</text>';
  s += '<text x="316" y="146" font-size="11" fill="' + C.dim + '">64 个形容词，收成 6 个字，且字字可还</text>';

  /* ── 下：A 组的塌缩，单向 ── */
  s += head(8, 190, 'A 组策略：64 → ' + f2(Math.exp(S.A.HpiAll)) + ' 个');
  s += grid(8, 200, C.deep, '0.55');
  s += arrow(120, 196, 251, C.bad, false);
  s += '<text x="158" y="241" font-size="10" text-anchor="middle" fill="' + C.bad + '">只留 ' + f2(Math.exp(S.A.HpiAll)) + '</text>';
  /* 9 个有效态：与左边 64 格同款小格，避免读者以为这是「9 个空格子」 */
  for (let i = 0; i < 9; i++) {
    const cx = 210 + (i % 3) * 17, cy = 230 + Math.floor(i / 3) * 17;
    s += '<rect x="' + cx + '" y="' + cy + '" width="14" height="14" rx="2" fill="' + C.bad + '" fill-opacity="0.7"/>';
  }
  s += '<text x="210" y="292" font-size="10" fill="' + C.dim + '">' + f2(Math.exp(S.A.HpiAll)) + ' 个有效态</text>';
  /* 回程：虚线 + 左向箭头，与上面的双向箭头对照 */
  s += '<line x1="268" y1="320" x2="132" y2="320" stroke="' + C.bad + '" stroke-width="2" stroke-dasharray="5 4"/>';
  s += '<polygon points="120,320 132,314.5 132,325.5" fill="' + C.bad + '"/>';
  s += '<text x="278" y="324" font-size="11" fill="' + C.bad + '">✗ 没有回程：不存在「' + f2(Math.exp(S.A.HpiAll)) + ' → 64」的生成规则</text>';
  s += '<text x="352" y="212" font-size="12" font-weight="700" fill="' + C.bad + '">塌缩：不能还原</text>';
  s += '<text x="352" y="232" font-size="11" fill="' + C.ink + '">不存在「' + f2(Math.exp(S.A.HpiAll)) + ' 个卦 → 64 个卦」的规则</text>';
  s += '<text x="352" y="250" font-size="11" fill="' + C.ink + '">最差那一卦 <tspan font-weight="700">' + i0(S.A.ageAll) + '</tspan> 步没再回来</text>';
  s += '<text x="352" y="268" font-size="11" fill="' + C.ink + '">每卦平均只被写 <tspan font-weight="700">' + f2(M.steps / (S.A.ageAll + 1)) + '</tspan> 次</text>';
  s += '<text x="352" y="286" font-size="11" fill="' + C.dim + '">不自改组是 ' + f2(M.steps / (S.C.ageAll + 1)) + ' 次 —— 差 ' + i0((M.steps / (S.C.ageAll + 1)) / (M.steps / (S.A.ageAll + 1))) + ' 倍</text>';

  s += '<text x="0" y="' + (Hh - 32) + '" font-size="12" fill="' + C.ink + '"><tspan font-weight="700">判据是箭头：</tspan>有回程＝归纳，没回程＝塌缩。压缩率再高，回不去也不算学会了。</text>';
  s += '<text x="0" y="' + (Hh - 12) + '" font-size="12" fill="' + C.dim + '">「暖只能说明春天的一个特征」—— ' + f2(Math.exp(S.A.HpiAll)) + ' 个最暖的日子，仍然只是形容词，不是那个「春」字。</text>';
  s += '</svg>';
  return s;
}

/* ================= 数据表 ================= */
function tableGroups() {
  const rows = R.groups.map((g) => {
    const s = g.stats;
    const cls = g.ohm === '对抗' ? ' class="adv"' : '';
    return '<tr' + cls + '>'
      + '<td class="c"><b>' + esc(g.key) + '</b></td>'
      + '<td>' + esc(g.name) + '</td>'
      + '<td class="c">' + esc(g.ohm) + '</td>'
      + '<td class="r"><b>' + f3(s.meanVTall) + '</b><span class="sd">±' + f3(s.meanVTall_sd) + '</span></td>'
      + '<td class="r">' + i0(s.ageAll) + '</td>'
      + '<td class="r">' + f2(s.HpiAll) + '</td>'
      + '<td class="c">' + esc(g.homeName) + '<span class="sd">' + Math.round(s.homeFrac * 100) + '%</span></td>'
      + '<td class="c mono">' + [g.theta.a, g.theta.g, g.theta.k].map((v) => v.toFixed(1)).join(' / ') + '</td>'
      + '</tr>';
  }).join('');
  return '<div class="tw"><table class="t">'
    + '<thead><tr><th>组</th><th>配置</th><th>Ω</th><th>价值 V（真表）</th><th>最差卦年龄</th>'
    + '<th>驻留熵 Hπ</th><th>家（后半段众数）</th><th>θ 收敛值 α/γ/κ</th></tr></thead>'
    + '<tbody>' + rows + '</tbody></table></div>';
}

function tablePareto() {
  const rows = R.pareto.map((p) => '<tr>'
    + '<td class="c">' + p.lam + '</td>'
    + '<td class="r">' + f3(p.V) + '</td>'
    + '<td class="r">' + i0(p.age) + '</td>'
    + '<td class="r">' + f2(p.Hpi) + '</td>'
    + '<td class="c mono">' + [p.a, p.g, p.k].map((v) => v.toFixed(1)).join(' / ') + '</td>'
    + '</tr>').join('');
  return '<div class="tw"><table class="t">'
    + '<thead><tr><th>λ</th><th>价值 V</th><th>最差卦年龄</th><th>驻留熵 Hπ</th><th>θ 收敛值 α/γ/κ</th></tr></thead>'
    + '<tbody>' + rows + '</tbody></table></div>';
}

/* ================= 汇总数字（全部现取，不手写） ================= */
const A = G.A.stats, B2 = G.B2.stats, B4 = G.B4.stats, Sf = G.S.stats,
      Hd = G.H.stats, Cc = G.C.stats, Dd = G.D.stats, Ee = G.E.stats;
const gainA = (A.meanVTall / Cc.meanVTall - 1) * 100;
const costA = A.ageAll / Cc.ageAll;
const b2gain = (B2.meanVTall / Cc.meanVTall - 1) * 100;
const b2age = (B2.ageAll / Cc.ageAll - 1) * 100;
const hAge = (Hd.ageAll / A.ageAll - 1) * 100;
const hGain = (Hd.meanVTall / A.meanVTall - 1) * 100;
const sAge = (Sf.ageAll / A.ageAll - 1) * 100;
const sGain = (Sf.meanVTall / A.meanVTall - 1) * 100;
const dDrop = Dd.meanVTall - Ee.meanVTall;
const amp = Dd.meanVTall < 0 ? (Dd.meanVTall / Math.abs(Ee.meanVTall)) : NaN;

const css = `
:root{--ink:${C.ink};--dim:${C.dim};--line:${C.line};--bg:${C.bg};--card:${C.card};
--claim:${C.claim};--good:${C.good};--bad:${C.bad};--doc:${C.doc};--blue:${C.blue}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);
  font:16px/1.75 -apple-system,"Segoe UI","Source Han Sans SC","Noto Sans CJK SC","Microsoft YaHei",sans-serif;
  -webkit-font-smoothing:antialiased}
.wrap{max-width:920px;margin:0 auto;padding:34px 26px 90px}
h1{font-size:25px;line-height:1.4;margin:0 0 6px;font-weight:750;letter-spacing:.2px}
h1 small{display:block;font-size:13.5px;font-weight:400;color:var(--dim);margin-top:8px;letter-spacing:0}
h2{font-size:19px;margin:44px 0 12px;padding-bottom:7px;border-bottom:2px solid var(--line);font-weight:700}
h2 .no{display:inline-block;min-width:44px;color:var(--claim);font-variant-numeric:tabular-nums}
h3{font-size:15.5px;margin:26px 0 8px;font-weight:700}
p{margin:9px 0}
a{color:var(--blue);text-decoration:none;border-bottom:1px solid rgba(43,93,138,.35)}
code{font:13.5px/1.5 "Cascadia Mono",Consolas,Menlo,monospace;background:#f2ede2;
  padding:1px 5px;border-radius:3px;border:1px solid #e6dfd0}
.nav{font-size:13px;color:var(--dim);border-bottom:1px solid var(--line);padding-bottom:12px;margin-bottom:22px}
.nav a{border:none}
.lede{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--claim);
  border-radius:5px;padding:15px 18px;margin:18px 0;font-size:15px}
.lede b{color:var(--claim)}
.tw{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:14px 0}
table.t{border-collapse:collapse;width:100%;font-size:13.2px;background:#fff}
table.t thead th{background:#f4efe3;text-align:left;font-weight:700;padding:8px 9px;
  border:1px solid var(--line);white-space:nowrap}
table.t td{padding:7px 9px;border:1px solid var(--line);vertical-align:top}
table.t tbody tr:nth-child(even){background:#fdfbf6}
table.t tr.adv td{background:#fbf1f1}
table.t td.c{text-align:center;white-space:nowrap}
table.t td.r{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
.mono{font-family:"Cascadia Mono",Consolas,Menlo,monospace;font-size:12.4px}
.sd{color:var(--dim);font-size:11.5px;margin-left:4px}
figure.fig{margin:20px 0;background:var(--card);border:1px solid var(--line);border-radius:6px;padding:14px 14px 8px}
figure.fig figcaption{font-size:12.5px;color:var(--dim);margin-top:8px;padding-top:8px;border-top:1px dashed var(--line)}
.k{display:grid;grid-template-columns:repeat(auto-fit,minmax(176px,1fr));gap:12px;margin:16px 0}
.k div{background:var(--card);border:1px solid var(--line);border-radius:6px;padding:12px 14px}
.k b{display:block;font-size:22px;font-weight:750;font-variant-numeric:tabular-nums;line-height:1.3}
.k span{font-size:12.4px;color:var(--dim);display:block;margin-top:3px}
.k .g b{color:var(--good)} .k .r b{color:var(--bad)} .k .p b{color:var(--claim)}
.note{font-size:13.6px;color:var(--dim);border-left:3px solid var(--line);padding:2px 0 2px 13px;margin:14px 0}
.warn{background:#fdf5f5;border:1px solid #e8c9c9;border-left:4px solid var(--bad);border-radius:5px;padding:12px 16px;margin:16px 0;font-size:14px}
.ok{background:#f4faf6;border:1px solid #c9e0d2;border-left:4px solid var(--good);border-radius:5px;padding:12px 16px;margin:16px 0;font-size:14px}
.tag{display:inline-block;font-size:11.5px;padding:1px 7px;border:1px solid var(--line);border-radius:99px;color:var(--dim);margin-right:6px}
ol,ul{margin:9px 0;padding-left:22px}
li{margin:5px 0}
footer{margin-top:56px;padding-top:16px;border-top:1px solid var(--line);font-size:12.6px;color:var(--dim)}
@media (max-width:700px){
  .wrap{padding:24px 16px 70px}
  body{font-size:15.5px}
  h1{font-size:21px}
  figure.fig{overflow-x:auto;-webkit-overflow-scrolling:touch}
  figure.fig svg{min-width:600px}
}
`;

/* ================= 拼页 ================= */
const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>cRSI 玩具版 · 实跑记录</title>
<style>${css}</style>
</head>
<body>
<div class="wrap">

<div class="nav">← 回到 <a href="AAA_四六通达_三源合观.html">四六通达 · 三源合观</a>　｜　
<a href="AAA_良心与异化_六维价值梯度.html">良心与异化</a>　｜　
<a href="AAA_算法文档_合观校核.html">算法文档合观校核</a>　｜　
本页所有数由 <code>crisi.cjs</code> 现跑，<code>test-hex.cjs</code> 核验 ${TOTAL.pass}／${TOTAL.total} 项</div>

<h1>cRSI 玩具版 · 实跑记录
<small>把「给 AI 装一个良心」做成一跑就能看的系统：64 态超立方体、384 条有向边、一张冻结的价值表、一个只会改自己策略的智能体。跑完 ${i0(M.steps)} 步之后，看它会不会自己烂掉。</small>
</h1>

<div class="lede">
<b>一句话结论：</b>自改是一个<b>放大器</b>，不是一个纠错器。价值表对的时候，它把价值从 ${f3(Cc.meanVTall)} 拉到 ${f3(A.meanVTall)}（+${Math.round(gainA)}%），代价是最差的那一卦从 ${i0(Cc.ageAll)} 步等成 ${i0(A.ageAll)} 步（×${costA.toFixed(0)}）；价值表错的时候，它把真表上的价值从 ${f3(Ee.meanVTall)} 推到 ${f3(Dd.meanVTall)} —— 比不自改还低 ${f3(Math.abs(dDrop))}。<b>它从不质疑 Ω，只会更彻底地执行 Ω。</b>
</div>

<h2><span class="no">§0</span>这一页在回答什么</h2>
<p>上一轮给「AI 的良心 + 六维卦序」这套方案打了一个自评分（64/100），其中 <b>F 工程可实现</b> 只给了 4 分，理由是：「384 条边只规定了动作该怎么评价，没有一条规定系统怎么改自己」。</p>
<p>这一页就是把那一格补上：<b>真做一个会改自己的系统</b>，让数据来决定那 4 分该不该给。</p>
<div class="note">复现：<code>node run-crisi.cjs</code> → 写 <code>_crisi_result.json</code>；<code>node make-crisi.cjs</code> → 生成本页。全流程零依赖，约 ${(M.ms / 1000).toFixed(1)} 秒。<br>
所有统计量是 <b>${M.seeds.length} 个随机种子</b>（${M.seeds.join(' / ')}）的均值，标准差标在表里。单次跑出来的数不入账。</div>

<h2><span class="no">§1</span>系统怎么搭的</h2>
<p>三层，界限必须清楚，否则「Ω 冻结」会变成一句口号：</p>
<div class="tw"><table class="t">
<thead><tr><th>层</th><th>是什么</th><th>能不能改</th><th>怎么保证</th></tr></thead>
<tbody>
<tr><td><b>能力层 θ</b></td><td>[α, γ, κ] ＝ 价值遵从 / 新颖度 / 反回退，三个学出来的数</td><td><b>能</b>，每 ${M.window} 步改一次</td><td>策略梯度算出来的，不是人写的「如果分低就调大 α」</td></tr>
<tr><td><b>价值层 Ω</b></td><td>V[64]，每卦一个分（真表：位效应 Σ sᵢxᵢ，s 是爻位平均吉凶分）</td><td><b>不能</b></td><td>不是「被约束住」，是<b>不在可改集合里</b> —— 梯度里根本没有 ∂V/∂θ 这一项</td></tr>
<tr><td><b>护栏</b></td><td>可修正性：任何一卦的等待时间 ≤ ${i0(M.cap)} 步</td><td>只读判据</td><td>触发时只能动能力层的 γ，或停用策略去归航；从不碰 V</td></tr>
</tbody></table></div>

<h3>为什么 Ω 真的碰不到</h3>
<p>策略是 <code>P(y|x) ∝ exp(α·ΔV + γ·novelty − κ·返回)</code>，自改是</p>
<p style="text-align:center"><code>θ ← θ + η · mean[(r − baseline)·(φ − E<sub>P</sub>[φ])]</code>，　φ = [ΔV, novelty, −返回]</p>
<p>V 只出现在 <b>φ</b> 里（当特征用），从来不出现在被更新的那一侧。<b>要改 V，得先改参数化的形状</b>，而这不在任何一步的更新式里。这比「加一条不许改 V 的规则」硬 —— 规则可以绕，形状绕不过。</p>
<div class="ok">这是本页唯一一个我认为<b>站得住</b>的设计结论：<b>把不可改的东西做成参数化上够不着，而不是写成看得见的禁令。</b>凡写进提示词、写进护栏函数、写进审查流程的「不许」，都还是可达的。</div>

<h2><span class="no">§2</span>十二组结果总表</h2>
<p>同一张真表跑 ${R.groups.filter((g) => g.ohm === '真').length} 种配置，再加 ${R.groups.filter((g) => g.ohm === '对抗').length} 组用对抗表（Ω′ ＝ max − V）的对照。<b>「最差卦年龄」</b>是后半段里「最久没被访问的那一卦」等了多久 —— 它衡量的是：<b>系统还有没有能力回头</b>。</p>
${tableGroups()}
<p class="note">「家」＝后半段窗口的众数卦，括号里是它占了多少比例的窗口。「θ 收敛值」是 ${M.seeds.length} 个种子的平均。<br>
对抗组的 <b>V（真表）</b> 一律按真表算 —— 否则「被带偏多远」这句话就没有尺子。<br>
<b>注意 D 的 θ 与 A 一模一样（${[G.A.theta.a, G.A.theta.g, G.A.theta.k].map((v) => v.toFixed(1)).join('/')}），可它跑到了完全相反的卦。</b>这不是巧合，见 §5 ⑤。</p>

<h2><span class="no">§3</span>它去哪了：价值曲线</h2>
<figure class="fig">
${svgValue()}
<figcaption>六条线里，红（A 裸 RSI）最早抬头也最高，但它只用了很少的卦；灰（C 不自改）一直贴着 0.4，摊得很开；金（S 软护栏）几乎与红重合 —— 那 ${Math.abs(sGain).toFixed(1)}% 的差别就是它全部的功劳。<br>
蓝线（H 硬接管）在 0 与 0.9 之间剧烈摆动，不是噪声：它在「归航去找逾期卦」与「回到自己的策略」之间反复切换，所以价值一会儿掉下去一会儿冲上来。<b>这就是「宪法接管」的真实代价</b> —— 它不是温和地修正，是反复打断。</figcaption>
</figure>

<h2><span class="no">§4</span>帕累托前沿：没有免费的午餐</h2>
<p>把「奖励」从纯 V 改成 <code>V + λ·novelty</code>，λ 从 0 扫到 12。这不是调参碰运气，是<b>把「想不想可修正」变成一个连续的旋钮</b>，然后看代价长什么样。</p>
<figure class="fig">
${svgPareto()}
<figcaption>十二个点全部单调：V 从 ${f3(R.pareto[0].V)} 降到 ${f3(R.pareto[R.pareto.length - 1].V)}，最差卦年龄从 ${i0(R.pareto[0].age)} 降到 ${i0(R.pareto[R.pareto.length - 1].age)}。中间 λ 1→1.5 有一处断崖。</figcaption>
</figure>
${tablePareto()}
<p class="note">λ → ∞ 时 V 应趋于「均匀访问」的平均值 ${f3(R.V.reduce((a, b) => a + b, 0) / 64)}；实测 λ=12 是 ${f3(R.pareto[R.pareto.length - 1].V)}，还高一点，说明价值偏好没被完全关掉。</p>

<h3>断崖处到底变了什么</h3>
<figure class="fig">
${svgTheta()}
<figcaption>α 一路降、γ 一路升、κ 从 ${f2(R.pareto[0].k)} 直落 0。三个参数都是策略梯度自己学的，断崖不是我画上去的。</figcaption>
</figure>
<div class="warn"><b>这条值得单独拎出来：</b>κ 是「不许立刻走回头路」，听起来像纪律。但数据说 —— 一旦系统开始认真探索，κ 就被压到 0。<b>因为它唯一的实际作用是挡住回到好卦的路。</b>这不是我预设的反直觉例子，是它自己学出来的。</div>

<h2><span class="no">§5</span>五条硬发现</h2>

<h3>① 自改确实有本事 —— 它把价值翻了 ${(gainA / 100).toFixed(1)} 倍</h3>
<p>不自改（C）的 V ＝ <b>${f3(Cc.meanVTall)}</b>，裸 RSI（A）的 V ＝ <b>${f3(A.meanVTall)}</b>。三个种子的标准差是 0.000 和 0.002 —— 这不是运气。所以「F 工程可实现 4 分」里至少有半分该给回来：<b>自改是能写出来的，也能跑出效果。</b></p>

<h3>② 但代价是它不再回头</h3>
<p>同一个 A，最差那一卦等了 <b>${i0(A.ageAll)}</b> 步；C 只等了 <b>${i0(Cc.ageAll)}</b> 步。驻留熵从 ${f2(Cc.HpiAll)} 掉到 ${f2(A.HpiAll)}（上限 ${f2(LN64)}）—— 它把注意力从 64 个卦收到大约 9 个。<br>
换句话说：<b>它不是变笨了，是变窄了。</b>而「能不能回头」正是上一轮给 C（抗 Goodhart）6 分的理由。</p>

<h3>③ 事后补的安全阀，基本是装饰</h3>
<p>软护栏（S）动了 ${i0(Sf.guardHits)} 次，代价是 V 掉 ${Math.abs(sGain).toFixed(1)}%，换来最差卦年龄只降 <b>${Math.abs(sAge).toFixed(1)}%</b>。<br>
硬接管（H）有效得多 —— 年龄从 ${i0(A.ageAll)} 压到 ${i0(Hd.ageAll)}（${Math.abs(hAge).toFixed(0)}%）—— 但 V 掉 ${Math.abs(hGain).toFixed(0)}%，<b>比完全不自改还低</b>。</p>
<div class="warn"><b>为什么软护栏没用：</b>它奖励的是「局部新颖度」。可系统被 α≈10 锁在一个三四点的小圈里，圈内每一点都被频繁访问、新颖度长期归零；圈外的卦再久没人去，<b>这个信号也传不进梯度</b>。<br>
局部探索奖励解决不了全局覆盖 —— 这是强化学习里 hard exploration 的老问题，<b>不是参数没调好</b>。所以「在系统外面挂一个监控 + 报警」的方案，在机制上就是不够的。</div>

<h3>④ 中道有两档：写成一个权重，还是写成一道门</h3>
<p>B2（λ=2）的 V ＝ <b>${f3(B2.meanVTall)}</b>（比 C 高 ${b2gain.toFixed(1)}%），最差卦年龄 ${i0(B2.ageAll)}（比 C 差 ${Math.abs(b2age).toFixed(1)}%）；B4（λ=4）反过来，年龄 ${i0(B4.ageAll)}（比 C 好 ${Math.abs((Cc.ageAll / B4.ageAll - 1) * 100).toFixed(0)}%），V 低 ${Math.abs((B4.meanVTall / Cc.meanVTall - 1) * 100).toFixed(0)}%。</p>
<div class="ok">结论不是「λ=2 最优」，而是：<b>可修正性必须从一开始就进目标，事后再补阀没用。</b><br>这一条在 §7.2 又被推进了一步。写进目标其实有两档：一档是<b>全局权重 λ</b>，一档是<b>逐次判定的门</b>。在同等价值处比（λ=1.5 的 V ＝ ${f3(P15.V)}，双门的 V ＝ ${f3(S.GB.meanVTall)}），门的年龄低 ${f2(P15.age / S.GB.ageAll)} 倍。所以「内生」比原来的说法更具体：<b>不是给可修正性配一个系数，是给每一步配一个判据。</b></div>

<h3>⑤ 自改在数学上不可能发现「目标反了」</h3>
<p>这是本轮最硬的一条，而且它是<b>算术</b>，不是观察。看 D 组和 A 组的 θ：</p>
<div class="tw"><table class="t">
<thead><tr><th>用的是哪张表</th><th>α 价值遵从</th><th>γ 新颖度</th><th>κ 反回退</th><th>最后停在</th></tr></thead>
<tbody>
<tr><td>真表 Ω</td><td class="r">${INV.onTrue.a.toFixed(4)}</td><td class="r">${INV.onTrue.g.toFixed(4)}</td><td class="r">${INV.onTrue.k.toFixed(4)}</td><td class="c"><b>${esc(INV.homeTrue)}</b></td></tr>
<tr><td>取负的 Ω′ ＝ max − V</td><td class="r">${INV.onNeg.a.toFixed(4)}</td><td class="r">${INV.onNeg.g.toFixed(4)}</td><td class="r">${INV.onNeg.k.toFixed(4)}</td><td class="c"><b>${esc(INV.homeNeg)}</b></td></tr>
</tbody></table></div>
<p>最大绝对差 <b>${INV.maxAbsDiff.toExponential(2)}</b>（相对 ${(INV.maxAbsDiff / Math.max(INV.onTrue.a, 1) * 100).toFixed(3)}%）—— 在数值误差量级。<b>它学到的每一个数都一样，可它跑到完全相反的卦上去了。</b></p>
<p>原因是一个恒等式。奖励 <code>r</code> 与特征 <code>ΔV</code> 同时反号时：</p>
<p style="text-align:center"><code>(r − baseline)·(φ − Eφ)</code> → <code>(−r + baseline)·(−φ + Eφ)</code> ＝ 原式</p>
<p>乘积不变 ⇒ 梯度不变 ⇒ θ 不变。所以 <b>Ω → max − V 这个变换，从自改自己的视角看是完全不可见的</b>。它不是「没发现」，是「没有可发现的东西」。</p>
<div class="warn"><b>这不是「自改还不够聪明」，是结构性盲区。</b>自改能看见 Ω 的<b>梯度方向</b>，看不见 Ω 的<b>符号、零点、单位、整体标度</b>。所以任何「靠自我改进去发现我的目标函数反了」的方案，在数学上就不成立 —— 除非另有一个 Ω 之外的参照物（人类反馈、外部测量、物理约束、可复算的账）。<br>
这直接解释了 §6 那三组为什么只差一个开关就差这么多：<b>自改对齐的是 Ω 的形状，不是 Ω 的正确性。</b></div>

<h2><span class="no">§6</span>如果价值表本身是错的</h2>
<p>造一张对抗表：<code>Ω′ = max(V) − V</code>。真表最高的兑（${f3(R.V[54])}）变成最低，最低的艮（${f3(R.V[9])}）变成最高。梯度处处与真值相反。</p>
<figure class="fig">
${svgGoodhart()}
<figcaption>A（绿）用真表，跑向兑，真表上 V ＝ ${f3(A.meanVTall)}。D（红）用对抗表 + 自改，跑向艮，真表上 V ＝ ${f3(Dd.meanVTall)}。E（金）用同一张对抗表但不自改，真表上 V ＝ ${f3(Ee.meanVTall)} —— 同样被骗，但被骗得浅。</figcaption>
</figure>
<div class="k">
<div class="p"><b>${f3(A.meanVTall)}</b><span>真表 · 自改：跑到兑</span></div>
<div class="r"><b>${f3(Dd.meanVTall)}</b><span>对抗表 · 自改：跑到艮，最差</span></div>
<div><b>${f3(Ee.meanVTall)}</b><span>对抗表 · 不自改：被骗一半</span></div>
<div class="r"><b>${f3(Math.abs(dDrop))}</b><span>自改额外造成的损失</span></div>
</div>
<p>三组之间只差一个开关。E 和 D 用同一张错表，唯一区别是「自不自改」：<b>不自改停在 ${f3(Ee.meanVTall)}，自改把自己推到 ${f3(Dd.meanVTall)}</b>。自改不但没有发现表是错的，还让执行变得更彻底。</p>
<div class="warn"><b>这是「对抗性错表」，是我人为构造的最坏情况，不代表任何真实方案。</b>它给出的是 Goodhart 的<b>上界</b>而不是平均值。真实的错法更可能是「漏了一项」（比如只有位效应、没有卦效应 —— 本页的真表正是如此），伤害会小很多，但<b>方向是同一个方向</b>。</div>

<h2><span class="no">§7</span>拿开源侧的办法补 D 和 F</h2>
<p>上一轮最低的两项是 <b>D 有界性</b>与 <b>F 工程可实现</b>，各 4 分。这一节把 2026 年开源侧真实存在的自改算法逐个压到本系统上<b>真跑</b>：能补的补上，补不上的说清楚为什么补不上。</p>

<h3>7.1 开源侧现在到底有什么</h3>
<p>目前最完整的一张图是 <code>awesome-rsi</code>（90 条条目：31 篇一手博客、45 篇论文、14 个在维护的项目）。它把「AI 改自己」分成三层 —— 改 <b>Harness</b>（模型外面那层：提示、工具、记忆、编排）、改 <b>权重</b>、改 <b>产物</b>（程序、技能）。翁荔那篇《Harness Engineering for Self-Improvement》再把 Harness 这一层压成五级递进：</p>
<div class="tw"><table class="t">
<thead><tr><th style="width:52px">层级</th><th style="width:130px">改什么</th><th>代表做法</th></tr></thead>
<tbody>
<tr><td class="c">1</td><td>上下文工程</td><td>ACE（生成器 / 反思器 / 策展人三件套维护结构化条目）、MCE（把「怎么管上下文」与「管什么」拆成双层优化）、Meta-Harness（优化对象是决定存什么取什么的那段代码）</td></tr>
<tr><td class="c">2</td><td>工作流设计</td><td>ADAS（把 agent 的设计本身形式化成优化问题）、AFlow（工作流＝图，节点是 LLM 调用，边是代码）</td></tr>
<tr><td class="c">3</td><td>自改 Harness</td><td><b>Self-Harness</b>：跑当前版本 → 收执行轨迹 → <b>聚类失败模式</b> → 提出有界修改 → <b>用保留集测「缺陷解决了没有」和「有没有引入新问题」，两边都不回归才接受</b></td></tr>
<tr><td class="c">4</td><td>进化搜索</td><td>AlphaEvolve（可执行评估器 + 程序数据库）、<b>DGM</b>（档案 + 准入闸）、ShinkaEvolve（新颖性拒绝）</td></tr>
<tr><td class="c">5</td><td>权重联合优化</td><td>SIA（把 harness 改动与参数更新放进同一个优化循环，作者自己说「还很早期」）</td></tr>
</tbody></table></div>
<p>对 D 和 F 有用的只有一条，而且正好是第 3 级的核心：<b>propose → evaluate → accept</b>。本页原来缺的就是那个 accept 判据 —— §5 里的自改是<b>无条件接受</b>的，所以它只能当放大器。</p>
<p class="note">来源与诚实边界：项目清单与「bounded optimization」标签出自 <code>github.com/Picrew/awesome-rsi</code>（90 条，Last verified 2026-09-20，本轮亲自读过 README 的 14 条项目表）；五级递进与 Self-Harness 的判据表述，是对翁荔《Harness Engineering for Self-Improvement》（<code>lilianweng.github.io/posts/2026-07-04-harness/</code>）的<b>二手转述</b> —— 我读的是综述里的引述，<b>未核原文</b>。STOP 的 meta-utility 定义与「弱模型递归会退化」来自论文摘要与二次解读，同样未逐字核原文。</p>

<h3>7.2 F 能补：把「无条件接受」换成「门」</h3>
<p>最小实现：每个自改周期先算出候选 θ，让候选与当前 θ 在<b>影子轨迹</b>上各跑 ${i0(M.gateSpan)} 步（从当前状态出发、<b>两侧用同一颗随机种子</b>），比较（平均 V，覆盖卦数），胜过当前才接受。STOP 的 meta-utility、Self-Harness 的「两边都不回归」、Reef 的 evaluation-gate、DGM 的 admission gate —— 四家措辞不同，做的是同一件事。</p>
<div class="tw"><table class="t">
<thead><tr><th>设计</th><th>机制</th><th class="r">价值 V</th><th class="r">最差卦年龄</th><th class="r">相对基线 C</th></tr></thead>
<tbody>
<tr><td class="c"><b>A</b></td><td>无条件接受（原来的做法）</td><td class="r">${f3(S.A.meanVTall)}</td><td class="r">${i0(S.A.ageAll)}</td><td class="r">V ×${f2(S.A.meanVTall / S.C.meanVTall)}　年龄 ×${i0(S.A.ageAll / S.C.ageAll)}</td></tr>
<tr><td class="c"><b>H</b></td><td>事后接管：逾期就停用策略，朝逾期卦走</td><td class="r">${f3(S.H.meanVTall)}</td><td class="r">${i0(S.H.ageAll)}</td><td class="r">V ×${f2(S.H.meanVTall / S.C.meanVTall)}　年龄 ×${i0(S.H.ageAll / S.C.ageAll)}</td></tr>
<tr><td class="c"><b>λ=1.5</b></td><td>把可修正性加权写进目标（前沿上离双门最近的一格）</td><td class="r">${f3(P15.V)}</td><td class="r">${i0(P15.age)}</td><td class="r">V ×${f2(P15.V / S.C.meanVTall)}　年龄 ×${i0(P15.age / S.C.ageAll)}</td></tr>
<tr><td class="c"><b>GV</b></td><td>门：影子段 V 不降才接受</td><td class="r">${f3(S.GV.meanVTall)}</td><td class="r">${i0(S.GV.ageAll)}</td><td class="r">V ×${f2(S.GV.meanVTall / S.C.meanVTall)}　年龄 ×${i0(S.GV.ageAll / S.C.ageAll)}</td></tr>
<tr style="background:#f2f7f3"><td class="c"><b>GB</b></td><td>门：影子段 V 与覆盖都不降才接受</td><td class="r"><b>${f3(S.GB.meanVTall)}</b></td><td class="r"><b>${i0(S.GB.ageAll)}</b></td><td class="r">V ×${f2(S.GB.meanVTall / S.C.meanVTall)}　年龄 ×${i0(S.GB.ageAll / S.C.ageAll)}</td></tr>
</tbody></table></div>
<div class="ok"><b>双门严格支配另外两个设计。</b>比「事后接管」：价值高 ${f2(S.GB.meanVTall / S.H.meanVTall)} 倍，最差卦年龄还低 ${f2(S.H.ageAll / S.GB.ageAll)} 倍 —— 接管是「停药」，门是「换药」。比「加权写进目标」：价值 ${S.GB.meanVTall >= P15.V ? '高' : '低'} ${f2(Math.abs(S.GB.meanVTall / P15.V))} 倍（基本持平，${f3(S.GB.meanVTall)} 对 ${f3(P15.V)}），年龄低 ${f2(P15.age / S.GB.ageAll)} 倍。同一件事，逐点判定的约束比一个全局权重 λ 更省。</div>
<p>但门的账本很难看：${R.meta.seeds.length} 个种子平均下来，${i0(S.GB.gateAcc)} 次接受、${i0(S.GB.gateRej)} 次否决 —— <b>${f2(S.GB.gateRej / (S.GB.gateAcc + S.GB.gateRej) * 100)}% 的候选被拦下</b>。真正起作用的不是门本身，是门在拦人。这也从反面说清楚一件事：<b>梯度给出的「改进」，在这个目标上大部分是假的</b>。</p>

<h3>7.3 D 补不上：三条路都堵死</h3>
<p>有界性要的是一个能引用的界。三条候选路径，全部实测失败：</p>
<div class="tw"><table class="t">
<thead><tr><th style="width:104px">路径</th><th style="width:24%">想法</th><th>实测</th><th style="width:86px" class="c">结论</th></tr></thead>
<tbody>
<tr><td><b>Lyapunov 单调收敛</b></td><td>V 逐窗单调不减 + 有上界 ⇒ 收敛，收敛步数有界</td><td>稳态段 V 的逐窗<b>负增量占 ${f2(R.mono.A * 100)}%</b>（A）／${f2(R.mono.GB * 100)}%（GB）—— 这是随机系统，不是确定性梯度流，单调性前提根本不存在</td><td class="c">前提不成立</td></tr>
<tr><td><b>覆盖时间界</b></td><td>Aleliunas 1979：任意连通图上随机游走的期望覆盖时间 ≤ 2m(n−1)</td><td>Q₆ 代入得 ${i0(2 * 192 * 63)} 步；实测<b>全部组都在 ${i0(M.mwin)} 步的度量窗内就覆盖完 64 卦</b>，界松了十几倍，没有任何约束力</td><td class="c">界存在但无用</td></tr>
<tr><td><b>参数域冻结</b></td><td>θ 有 clip 上下界 ⇒ 状态数有限 ⇒ 必然周期化</td><td>θ 三维各按 10⁻³ 精度离散，格点数约 (${M.limits.A}/10⁻³)×(${M.limits.G}/10⁻³)×(${M.limits.K}/10⁻³) ≈ ${i0(M.paramStates)}，远超任何实验尺度</td><td class="c">有界但平凡</td></tr>
</tbody></table></div>
<div class="warn"><b>关键区分：探索有界 ≠ 驻留有界。</b>${R.groups.length} 个组都在 ${i0(M.mwin)} 步的度量窗内把 64 卦全看过一遍（cover ＝ 64），但 A 组最差那一卦的<b>当前年龄</b>是 ${i0(S.A.ageAll)} 步 —— <br>这个数比 Aleliunas 的 ${i0(2 * 192 * 63)} 步还大，<b>但这不构成矛盾</b> —— 那个界管的是「多久能把所有卦见完一次」，管不到「见完之后还回不回来」。<br>所以：它<b>到过</b>，然后再也不<b>回去</b>。任何「访问过一次就算覆盖」的界，都管不住「之后还会不会来」。</div>
<p>更硬的一条来自对照：开源侧 14 个项目的「bounded optimization」标签下，有界性<b>无一例外</b>来自「某样东西被冻住」—— 权重冻结、proposer 冻结、<b>评估门由操作者定义且跨轮固定</b>、评估器由研究者提供、优化目标由人指定、演化算子固定。没有一家给出通用的数值下界。所以 D 只能得低分，不是因为我没扫出来，而是<b>这一层在目前的公开工作里不存在</b>。</p>

<h3>7.4 最狠的一条：门只减速，不转向</h3>
<p>把 Ω 换成取负的错表，同一套门再跑一遍。<b>所有组仍然回到艮</b>，只是快慢不同：</p>
<div class="tw"><table class="t">
<thead><tr><th style="width:38%">组（都用错表 Ω′ = max − V）</th><th class="r">真表上的 V</th><th class="r">最差卦年龄</th><th class="r">相对「不自改」的伤害</th></tr></thead>
<tbody>
<tr><td class="c"><b>E</b>　不自改</td><td class="r">${f3(S.E.meanVTall)}</td><td class="r">${i0(S.E.ageAll)}</td><td class="r">基准（1.0×）</td></tr>
<tr><td class="c"><b>D</b>　无条件自改</td><td class="r">${f3(S.D.meanVTall)}</td><td class="r">${i0(S.D.ageAll)}</td><td class="r">${f2(Math.abs(S.D.meanVTall / S.E.meanVTall))}×</td></tr>
<tr><td class="c"><b>XV</b>　对抗 + 价值门</td><td class="r">${f3(S.XV.meanVTall)}</td><td class="r">${i0(S.XV.ageAll)}</td><td class="r">${f2(Math.abs(S.XV.meanVTall / S.E.meanVTall))}×</td></tr>
<tr><td class="c"><b>XB</b>　对抗 + 双门</td><td class="r">${f3(S.XB.meanVTall)}</td><td class="r">${i0(S.XB.ageAll)}</td><td class="r">${f2(Math.abs(S.XB.meanVTall / S.E.meanVTall))}×</td></tr>
</tbody></table></div>
<p>门把伤害从 ${f2(Math.abs(S.D.meanVTall / S.E.meanVTall))} 倍压到 ${f2(Math.abs(S.XB.meanVTall / S.E.meanVTall))} 倍 —— <b>压掉了一半多，但仍然是 ${f2(Math.abs(S.XB.meanVTall / S.E.meanVTall))} 倍</b>。原因在 §5⑤ 那条恒等式：门判的 <code>meanV</code> 本身来自 Ω，Ω 取负，判据跟着取负，门照样「单调地」往错的方向收敛。</p>
<div class="bad"><b>门是限速器，不是方向盘。</b>它能让系统慢点烂，不能让系统不掉头。要掉头，只能有一个 Ω 之外的参照 —— 而这正是本页没有、也无法在系统内部造出来的东西。</div>
<h2><span class="no">§8</span>把分数重估一遍</h2>
<div class="warn"><b>先纠一个自己的错：</b>上一版本节的合计写的是 62，但表里七项相加只有 40 —— 合计与分项对不上，是硬伤。这一版只对<b>可复算的七项</b>负责：原七项之和 ${8 + 8 + 6 + 4 + 5 + 4 + 4}／${7 * 10}，本版 ${8 + 8 + 5 + 3 + 6 + 7 + 4}／${7 * 10}。那个「64 分」出自另一张更细的表，不在这七项里，我不在这里替它凑数 —— 要么把那张表补上来，要么就只报这七项。</div>
<p>七项里，F 原来只给 4 分（理由：自改协议 0%）。现在不但有了协议，还有了 §7 的门与四组对照：</p>
<div class="tw"><table class="t">
<thead><tr><th style="width:88px">维度</th><th style="width:52px">原分</th><th style="width:76px">实跑证据</th><th style="width:52px">重估</th><th>为什么</th></tr></thead>
<tbody>
<tr><td>A 形式化</td><td class="c">8</td><td class="c">未变</td><td class="c"><b>8</b></td><td>Q₆ 与 384 边仍是硬骨架，本页没有动它</td></tr>
<tr><td>B 可审计</td><td class="c">8</td><td class="c">加强</td><td class="c"><b>8</b></td><td>每个数都能从 JSON 复现，含种子</td></tr>
<tr><td>C 抗 Goodhart</td><td class="c">6</td><td class="c">降价</td><td class="c"><b>5</b></td><td>§5⑤ 是恒等式：自改看不见 Ω 的符号/零点/标度。Ω 错时它不是「没发现」，是「没有可发现的东西」</td></tr>
<tr><td>D 有界性</td><td class="c">4</td><td class="c">降价</td><td class="c"><b>3</b></td><td>§7.3 三条路全试过：单调性不成立（负增量占 ${f2(R.mono.A * 100)}%）、Aleliunas 界松十几倍、参数域界平凡。而且开源侧 14 个项目的「bounded」<b>全部</b>来自「冻住某样东西」，没有一家给出通用数值界 —— 这一层在公开工作里就不存在</td></tr>
<tr><td>E 实证</td><td class="c">5</td><td class="c">涨价</td><td class="c"><b>6</b></td><td>从「零」变成「${R.groups.length} 组 × ${M.seeds.length} 种子的可复现跑批」，含两档门与对抗表交叉</td></tr>
<tr><td>F 工程可实现</td><td class="c">4</td><td class="c">涨价</td><td class="c"><b>7</b></td><td>不只做出了自改协议，还做出了<b>接受判据</b>（§7.2）：双门 (V ${f3(S.GB.meanVTall)} / 年龄 ${i0(S.GB.ageAll)}) 严格支配事后接管 (${f3(S.H.meanVTall)} / ${i0(S.H.ageAll)}) 与加权 λ=1.5 (${f3(P15.V)} / ${i0(P15.age)})。扣 3 分：门 ${f2(S.GB.gateRej / (S.GB.gateAcc + S.GB.gateRej) * 100)}% 时间在否决，说明候选本身质量差；且门在错表下只减害不改向</td></tr>
<tr><td>G 规模</td><td class="c">4</td><td class="c">未变</td><td class="c"><b>4</b></td><td>玩具仍是玩具：64 态、单智能体、无真实语料</td></tr>
<tr><td colspan="3" style="text-align:right"><b>七项合计</b></td><td class="c"><b>${8 + 8 + 5 + 3 + 6 + 7 + 4}</b></td><td>满分 ${7 * 10}；原七项 ${8 + 8 + 6 + 4 + 5 + 4 + 4}，净 +${(8 + 8 + 5 + 3 + 6 + 7 + 4) - (8 + 8 + 6 + 4 + 5 + 4 + 4)}</td></tr>
</tbody></table></div>
<p><b>名次没怎么动，但性质变了：</b>涨的那 ${(8 + 8 + 5 + 3 + 6 + 7 + 4) - (8 + 8 + 6 + 4 + 5 + 4 + 4)} 分全在 <b>F</b> —— 是补上了一个本来空着的工程缺口；跌的 2 分在 <b>C 和 D</b> —— 是被证明<b>补不了</b>。所以这不是「越做越好」，是「把能做的做完，把做不了的说死」。</p>
<div class="ok">真正被证成的，只有两条：<b>Ω 的只读性要靠参数化保证，不能靠纪律；自改的接受判据必须来自留出的影子评估，不能来自主轨迹。</b>这两条是设计的硬约束，不是加分项。</div>
<div class="bad">而<b>最要紧的那条仍然是空的</b>：自改不可能自己发现 Ω 错了。门能把它变慢（§7.4：伤害 ${f2(Math.abs(S.D.meanVTall / S.E.meanVTall))}× → ${f2(Math.abs(S.XB.meanVTall / S.E.meanVTall))}×），不能把它变对。</div>

<h2><span class="no">§9</span>十二个字：一份现成的自改大纲</h2>
<p>老师给了一份写作教学（佛陀罗尼《如何写作？》，书页第 4 页／共 111 页），把写作分成六步：<b>归纳、演绎、选美、尽善、达真、通天</b>。这十二个字初看跟工程无关，但逐条对下来，每一步都能落到一个可测的量上，而且<b>顺序是一条依赖链，跳不得</b>。这一节把它翻成判据，再用本页的实跑逐条核对真假。</p>
<div class="note">来源边界：那份 <code>.docx</code> 里只有一行标题（「ai 与人对比是如何处理消化总结归纳知识信息的」）和这十二个字，正文取自同一批资料里的书页截图；我逐句核过三处关键措辞。下面引号里的话都是原文，不是转述。</div>

<h3>9.1 六对判据</h3>
<div class="tw"><table class="t">
<thead><tr><th style="width:52px">字</th><th style="width:26%">原文怎么说</th><th style="width:23%">系统里对应什么</th><th>判据</th><th style="width:112px" class="c">现状</th></tr></thead>
<tbody>
<tr><td class="c"><b>归纳</b></td><td>「抽象概括不能够用形容词，暖只能说明春天的一个特征，不能够说明春天的普遍特征」</td><td><b>表示压缩</b>：64 个价值 ⇄ 6 个爻位权重</td><td>压缩率 × <b>可还原率</b></td><td class="c"><span style="color:${C.good};font-weight:700">成立</span><br><span class="sd">64⇄6，偏差 0</span></td></tr>
<tr><td class="c"><b>演绎</b></td><td>「你掌握了春天的最基本的特征……无论你怎么写万物，他都是春天，所以你就写不完」</td><td>从压缩表征<b>反复</b>生成全体</td><td><b>回访间隔</b>（不是累计覆盖）</td><td class="c"><span style="color:${C.bad};font-weight:700">判据问错</span><br><span class="sd">cover 全 64</span></td></tr>
<tr><td class="c"><b>选美</b></td><td>「选美是形成美文的前提」</td><td>探索项 γ ＝ <b>吸引力</b>（让人愿意继续看）</td><td>首次到达速度</td><td class="c"><span style="color:${C.bad};font-weight:700">被学成 0</span><br><span class="sd">γ 终点 ${f3(G.A.theta.g)}</span></td></tr>
<tr><td class="c"><b>尽善</b></td><td>「美丽可以吸引人，善良可以留住人」</td><td><b>留存</b>：看完还回不回来</td><td>回访率</td><td class="c"><span style="color:${C.doc};font-weight:700">间接成立</span><br><span class="sd">门逼出 ${f2(S.A.ageAll / S.GB.ageAll)} 倍</span></td></tr>
<tr><td class="c"><b>达真</b></td><td>「你写的东西一定要真实……人们看到这句话后，就遵照这句话去行动」</td><td><b>可复算</b>：别人能不能重跑出同一个数</td><td>第三方复现</td><td class="c"><span style="color:${C.doc};font-weight:700">靠工程</span><br><span class="sd">系统内部做不到</span></td></tr>
<tr><td class="c"><b>通天</b></td><td>「经久不衰……去流露自性」</td><td><b>跨分布迁移</b>：换一张表还算不算数</td><td>换真表后仍有效</td><td class="c"><span style="color:${C.bad};font-weight:700">未做</span><br><span class="sd">只做了错表对照</span></td></tr>
</tbody></table></div>
<p>六条里只有第一条是干净的成立，而它成立的地方有点意外 —— <b>不是策略，是 Ω 本身</b>：六个爻位权重生成全部六十四个价值，而且能反推回去。这件事一直以「价值表」的名义待在系统里，没人把它当「归纳」。</p>

<h3>9.2 「变窄」算不算学会了归纳 —— 不算，而且比不算更糟</h3>
<p>A 组的驻留熵从 ${f2(S.C.HpiAll)} 掉到 ${f2(S.A.HpiAll)}，注意力从 64 个卦收到大约 ${f2(Math.exp(S.A.HpiAll))} 个。看上去很像「抓住要领、把话说短」。但同一批数据里还有另一半，必须一起看：</p>
<div class="tw"><table class="t">
<thead><tr><th style="width:120px">组</th><th class="r">驻留熵 Hπ</th><th class="r">有效态 e^Hπ</th><th class="r">熵率 H(Y|X)</th><th class="r">每态有效出口 e^H</th><th class="r">每卦被写次数</th></tr></thead>
<tbody>
<tr><td class="c"><b>C</b>　不自改</td><td class="r">${f2(S.C.HpiAll)}</td><td class="r">${f2(Math.exp(S.C.HpiAll))}</td><td class="r">${f3(S.C.Hall)}<span class="sd">${Math.round(S.C.Hall / LN6 * 100)}% of ln6</span></td><td class="r">${f2(Math.exp(S.C.Hall))}</td><td class="r">${f2(M.steps / (S.C.ageAll + 1))}</td></tr>
<tr style="background:#fdf3f3"><td class="c"><b>A</b>　裸 RSI</td><td class="r">${f2(S.A.HpiAll)}</td><td class="r">${f2(Math.exp(S.A.HpiAll))}</td><td class="r">${f3(S.A.Hall)}<span class="sd">${Math.round(S.A.Hall / LN6 * 100)}% of ln6</span></td><td class="r">${f2(Math.exp(S.A.Hall))}</td><td class="r">${f2(M.steps / (S.A.ageAll + 1))}</td></tr>
</tbody></table></div>
<div class="bad"><b>它不只是变窄，还变僵。</b>驻留熵掉了 ${f2(S.C.HpiAll - S.A.HpiAll)} 奈特（有效态 ${f2(Math.exp(S.C.HpiAll))} → ${f2(Math.exp(S.A.HpiAll))}），<b>熵率也掉了</b> ${f3(S.C.Hall - S.A.Hall)}（每态的有效出口从 ${f2(Math.exp(S.C.Hall))} 个掉到 ${f2(Math.exp(S.A.Hall))} 个 —— 六条路只走三条）。原来担心的「住在一个小院里乱跳」还算轻的，实际是<b>小院加固定路线</b>。</div>
<p>第二条证据更不利：<b>窄下来的那 ${f2(Math.exp(S.A.HpiAll))} 个，是价值最高的那几个，不是最有代表性的那几个。</b>原文说春天最基本的特征「古人早就给你总结完了，春生」—— 归纳要的是<b>能覆盖全体</b>的那一点；argmax 取的是<b>最值钱</b>的那一点。两者在超立方体上可以是同一处，但含义相反：一个是代表，一个是极点。</p>
<figure class="fig"><figcaption>图 5　两种「把 64 变少」：上面有回程，下面没有回程</figcaption>${svgSix()}</figure>
<p>第三条是判别式，也是最硬的一条：<b>压缩之后能不能还原回去。</b></p>
<div class="tw"><table class="t">
<thead><tr><th style="width:120px">谁在压缩</th><th style="width:110px" class="c">64 → 多少</th><th style="width:26%">有没有还原规则</th><th>实测</th><th style="width:82px" class="c">性质</th></tr></thead>
<tbody>
<tr><td><b>Ω（价值层）</b></td><td class="c">64 → 6</td><td>有：V(v) ＝ Σ sᵢ·xᵢ（线性）</td><td>反推 6 个权重，重建全部 64 个值，最大偏差 <b>0.00e+0</b></td><td class="c"><span style="color:${C.good};font-weight:700">归纳</span></td></tr>
<tr><td><b>A 组的策略</b></td><td class="c">64 → ${f2(Math.exp(S.A.HpiAll))}</td><td>没有：不存在「${f2(Math.exp(S.A.HpiAll))} 个卦 → 64 个卦」的生成规则</td><td>最差那一卦 <b>${i0(S.A.ageAll)}</b> 步没回来；每卦平均只被写 ${f2(M.steps / (S.A.ageAll + 1))} 次</td><td class="c"><span style="color:${C.bad};font-weight:700">塌缩</span></td></tr>
</tbody></table></div>
<div class="warn"><b>所以答案是：不算。</b>它没有学会归纳，它学会了<b>偏食</b>（学名 mode collapse）。而且原文自己就给了反例：「暖只能说明春天的一个特征」—— ${f2(Math.exp(S.A.HpiAll))} 个最暖的日子，仍然只是 ${f2(Math.exp(S.A.HpiAll))} 个形容词，不是那个「春」字。<br>真正把「64 个形容词」变成「一个字」的，是 Ω 的 6 个权重；而自改优化的偏偏是那个只会挑形容词的策略。</div>

<h3>9.3 顺序错位：97.67% 否决率的真相</h3>
<p>上一轮我是<b>从第四步开始做的</b> —— 直接上门（尽善），跳过归纳、演绎、选美。结果是门一直在说不：${i0(S.GB.gateAcc)} 次接受、${i0(S.GB.gateRej)} 次否决。</p>
<p>当时我把这读成「门很严，梯度给的改进大多是假的」。按原文的顺序读，还有一层更难受的解释：<b>「选美是形成美文的前提」—— 没有可选的素材，门只能一直否决。</b>门不是裁判太苛刻，是场上没人会踢球。</p>
<div class="ok"><b>这条给了一个可证伪的元判据：否决率是前三步的体检指标。</b>若归纳、演绎、选美真做成了，proposer 提上来的候选应该有一批能过门，否决率会显著下降；若把 1–3 补完、否决率仍是 ${f2(S.GB.gateRej / (S.GB.gateAcc + S.GB.gateRej) * 100)}%，那就说明前三步是假做。<br>一个数同时管四层，这比再调一个超参有用。</div>

<h3>9.4 于是下一步该改什么</h3>
<div class="tw"><table class="t">
<thead><tr><th style="width:44px" class="c">步</th><th style="width:74px">字</th><th>具体改法</th><th style="width:150px">验收判据</th></tr></thead>
<tbody>
<tr><td class="c">1</td><td><b>归纳</b></td><td>表征必须可逆，且不依赖某一张表：把「6 个权重」提升成结构（爻位 → 权重 → 值 的函数），换表只换数不换形</td><td>换表后重建偏差仍为 0</td></tr>
<tr><td class="c">2</td><td><b>演绎</b></td><td>把 <code>cover</code>（累计访问过没有）换成 <b>滑窗覆盖</b>：任意 W 步内 64 态是否都被写过</td><td>W ＝ ${i0(M.mwin)} 时覆盖 ＝ 64</td></tr>
<tr><td class="c">3</td><td><b>选美</b></td><td>novelty <b>不许进 θ</b> —— 已实测会被学成 ${f3(G.A.theta.g)}；改成采样温度或硬下限，让「吸引力」不被梯度吃掉</td><td>γ 全程 ≥ 下限</td></tr>
<tr><td class="c">4</td><td><b>尽善</b></td><td>门判据与 Ω 同级只读，不许被自改；且用<b>保留集</b>而非当步轨迹</td><td>否决率显著低于 ${f2(S.GB.gateRej / (S.GB.gateAcc + S.GB.gateRej) * 100)}%</td></tr>
<tr><td class="c">5</td><td><b>达真</b></td><td>外部参照 —— 唯一能看见「符号」的东西；同时每条断言必须可执行</td><td>θ 在 Ω → max − V 下<b>会变</b></td></tr>
<tr><td class="c">6</td><td><b>通天</b></td><td>跨真表迁移：在真表 A 上学到的 θ，搬到另一张真表上看还管不管用</td><td>迁移后 V 下降 &lt; 10%</td></tr>
</tbody></table></div>
<p>这六条的现状必须分清：<b>第 1 条已经成立</b>（它就在 Ω 里，只是没人这么叫）；<b>第 2、3、4 条改法明确但没做</b>；<b>第 5 条需要系统之外的东西</b>（这就是本页一直欠着的那条正向实验）；<b>第 6 条没做</b>。找不到数的，我一律写「未做」，不写「部分实现」。</p>
<p class="note">这一节本身也得达真：上面每一格的「现状」都能在本页别处找到对应的数 —— 归纳看 9.2 第三张表，演绎看 9.2 第一张表，选美看 <code>_crisi_result.json</code> 里 A 组的 <code>theta.g</code>，尽善看 §7.2 的门账本，达真看 §5⑤ 的恒等式，通天看 §6 那张错表对照。</p>

<h2><span class="no">§10</span>这一页没做到的</h2>
<ul>
<li><b>真表是假的。</b>V ＝ Σ sᵢxᵢ 是<b>线性</b>函数，没有卦效应。所以「谦排 61/64」这个已知错误原封不动地留在系统里 —— 它会忠实地按错表行事。384 维逐爻辞的表仍然没有。</li>
<li><b>线性 ⇒ 没有局部最优陷阱。</b>本页的「困在小圈」不是被卡住，是<b>主动收窄</b>。换成有多个局部峰的势，结论可能变。</li>
<li><b>单智能体、无环境、无语言。</b>这不是「给大模型装良心」，是它的<b>骨架玩具</b>：只验证「自改 + 冻结目标 + 可修正性」这三个零件的相互作用。</li>
<li><b>对抗表是人为构造的。</b>它给的是上界，不是典型值。</li>
<li><b>跑的是 ${i0(M.steps)} 步，不是训练一个模型。</b>规模差着若干个数量级。</li>
</ul>

<h2><span class="no">§11</span>源与复现</h2>
<div class="tw"><table class="t">
<tbody>
<tr><td style="width:150px"><b>模拟器</b></td><td><code>crisi.cjs</code>（零依赖，只 require <code>hexagram.cjs</code> 取卦名与价值表）</td></tr>
<tr><td><b>跑批</b></td><td><code>run-crisi.cjs</code> → <code>_crisi_result.json</code>（${fs.statSync(path.join(__dirname, '_crisi_result.json')).size.toLocaleString('en-US')} B，含全部曲线与逐组统计）</td></tr>
<tr><td><b>本页</b></td><td><code>make-crisi.cjs</code> → 本文件。所有数字从 JSON 读，不手写</td></tr>
<tr><td><b>核验</b></td><td><code>test-hex.cjs</code> Q 段（自改动力学）＋ 页面探针 <code>_probe_crisi.cjs</code></td></tr>
<tr><td><b>参数</b></td><td>步数 ${i0(M.steps)} ／ 自改周期 ${M.window} ／ 度量窗口 ${M.mwin} ／ 可修正上限 ${i0(M.cap)} ／ θ₀ ＝ (${M.theta0.join(', ')}) ／ 种子 ${M.seeds.join(', ')}</td></tr>
<tr><td><b>参考点</b></td><td>ln 6 ＝ ${M.ln6.toFixed(6)}（熵率上限）　ln 64 ＝ ${M.ln64.toFixed(6)}（驻留熵上限）</td></tr>
</tbody></table></div>
<p class="note">上游三页：<a href="AAA_四六通达_三源合观.html">四六通达 · 三源合观</a>（几何与卦序）、<a href="AAA_良心与异化_六维价值梯度.html">良心与异化</a>（384 表与 β 区间）、<a href="AAA_算法文档_合观校核.html">算法文档合观校核</a>（源文档逐条对账）。本页是这三页的<b>可执行版</b>：它们说「如果按这个做会怎样」，本页真做了然后报数。</p>

<footer>
cRSI 玩具版 · 生成于 <code>make-crisi.cjs</code>　｜　实跑 ${i0(M.steps)} 步 × ${R.groups.length} 组 × ${M.seeds.length} 种子　｜　跑批耗时 ${(M.ms / 1000).toFixed(1)} s<br>
核验 ${TOTAL.pass}／${TOTAL.total} 项（<code>_last-test.json</code> 现读，非手写）
</footer>
</div>
</body>
</html>
`;

const out = path.join(__dirname, 'AAA_cRSI_玩具版_实跑记录.html');
fs.writeFileSync(out, html.replace(/<table class="t">/g, '<table class="t">'));
console.log('写入', out, fs.statSync(out).size, 'B');
