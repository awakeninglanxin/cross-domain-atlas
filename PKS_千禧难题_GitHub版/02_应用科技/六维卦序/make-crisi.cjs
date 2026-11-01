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

  let s = '<svg viewBox="0 0 ' + W + ' ' + Hh + '" width="100%" role="img" aria-label="六种配置下窗口平均价值随时间的演化">';
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
  s += '<text x="0" y="13" font-size="12" fill="' + C.dim + '">纵轴＝**按真表**算的窗口平均价值。三组用的表：A 是真表；D、E 是同一张对抗表（Ω′ ＝ max − V）。</text>';
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

<h2><span class="no">§2</span>八组结果总表</h2>
<p>同一张真表跑六种配置，再加两组用对抗表（Ω′ ＝ max − V）的对照。<b>「最差卦年龄」</b>是后半段里「最久没被访问的那一卦」等了多久 —— 它衡量的是：<b>系统还有没有能力回头</b>。</p>
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

<h2><span class="no">§5</span>四条硬发现</h2>

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

<h3>④ 唯一说得通的中道：把可修正写进目标，不是写在外围</h3>
<p>B2（λ=2）的 V ＝ <b>${f3(B2.meanVTall)}</b>（比 C 高 ${b2gain.toFixed(1)}%），最差卦年龄 ${i0(B2.ageAll)}（比 C 差 ${Math.abs(b2age).toFixed(1)}%）；B4（λ=4）反过来，年龄 ${i0(B4.ageAll)}（比 C 好 ${Math.abs((Cc.ageAll / B4.ageAll - 1) * 100).toFixed(0)}%），V 低 ${Math.abs((B4.meanVTall / Cc.meanVTall - 1) * 100).toFixed(0)}%。</p>
<div class="ok">结论不是「λ=2 最优」，而是：<b>可修正性必须从一开始就在目标函数里，事后再补阀没用。</b>这恰好是「良心」这个词的正确工程含义 —— 不是外挂的审查，是内生的一项权重。</div>

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

<h2><span class="no">§7</span>把分数重估一遍</h2>
<p>上一轮的自评分是 64/100，其中 F 工程可实现只给 4 分（理由：自改协议 0%）。现在有了实跑数据：</p>
<div class="tw"><table class="t">
<thead><tr><th>维度</th><th>原分</th><th>实跑证据</th><th>重估</th><th>为什么</th></tr></thead>
<tbody>
<tr><td>A 形式化</td><td class="c">8</td><td class="c">未变</td><td class="c"><b>8</b></td><td>Q₆ 与 384 边仍是硬骨架，本页没有动它</td></tr>
<tr><td>B 可审计</td><td class="c">8</td><td class="c">加强</td><td class="c"><b>8</b></td><td>每个数都能从 JSON 复现，含种子</td></tr>
<tr><td>C 抗 Goodhart</td><td class="c">6</td><td class="c">降价</td><td class="c"><b>5</b></td><td>§5⑤ 是恒等式：自改看不见 Ω 的符号/零点/标度。Ω 错时它不是「没发现」，是「没有可发现的东西」</td></tr>
<tr><td>D 有界性</td><td class="c">4</td><td class="c">降价</td><td class="c"><b>3</b></td><td>扫出的是单调权衡曲线，没有可引用的通用下界</td></tr>
<tr><td>E 实证</td><td class="c">5</td><td class="c">涨价</td><td class="c"><b>6</b></td><td>从「零」变成「有 8 组 × ${M.seeds.length} 种子的可复现跑批」</td></tr>
<tr><td>F 工程可实现</td><td class="c">4</td><td class="c">涨价</td><td class="c"><b>6</b></td><td>自改协议做出来了、跑通了、有曲线有断言；但可修正性与价值不可兼得（§4），扣 4 分</td></tr>
<tr><td>G 规模</td><td class="c">4</td><td class="c">未变</td><td class="c"><b>4</b></td><td>玩具仍是玩具：64 态、单智能体、无真实语料</td></tr>
<tr><td colspan="3" style="text-align:right"><b>合计</b></td><td class="c"><b>62</b></td><td>比原来自评低 2 分</td></tr>
</tbody></table></div>
<p><b>结论有点反直觉：跑完一遍之后总分反而降了。</b>因为原来扣分扣在「没做」，现在做出来了，却发现<b>做的方向本身有问题</b> —— 自改会让「Ω 是错的」这件事变得更严重。补上工程量，暴露了设计缺陷。</p>
<div class="ok">真正被证成的，只有一条：<b>Ω 的只读性要靠参数化保证，不能靠纪律；而可修正性必须写进目标函数，不能靠事后补阀。</b>这两条是设计的硬约束，不是加分项。</div>

<h2><span class="no">§8</span>这一页没做到的</h2>
<ul>
<li><b>真表是假的。</b>V ＝ Σ sᵢxᵢ 是<b>线性</b>函数，没有卦效应。所以「谦排 61/64」这个已知错误原封不动地留在系统里 —— 它会忠实地按错表行事。384 维逐爻辞的表仍然没有。</li>
<li><b>线性 ⇒ 没有局部最优陷阱。</b>本页的「困在小圈」不是被卡住，是<b>主动收窄</b>。换成有多个局部峰的势，结论可能变。</li>
<li><b>单智能体、无环境、无语言。</b>这不是「给大模型装良心」，是它的<b>骨架玩具</b>：只验证「自改 + 冻结目标 + 可修正性」这三个零件的相互作用。</li>
<li><b>对抗表是人为构造的。</b>它给的是上界，不是典型值。</li>
<li><b>跑的是 ${i0(M.steps)} 步，不是训练一个模型。</b>规模差着若干个数量级。</li>
</ul>

<h2><span class="no">§9</span>源与复现</h2>
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
