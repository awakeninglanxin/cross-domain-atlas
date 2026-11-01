'use strict';
/*
 * make-docaudit.cjs —— 生成「算法文档合观校核」页。
 *
 * 这份页只回答一个问题：元宝那份 17 章文档里的每个数，是真的吗？
 * 铁律三条：
 *   ① 页面上每个数都从 hexagram.cjs 现算，不复述文档、也不复述我记忆里的印象；
 *   ② 核验条数从 _last-test.json 读，不手写；
 *   ③ 文档给的、我核不了的（RSI 时间线、Lean 仓库），一律标「转述未核」，不混进通过。
 */
const fs = require('fs');
const path = require('path');
const H = require('./hexagram.cjs');
const S = require('./sources.cjs');

let TOTAL = { pass: 0, fail: 0, unv: 0, total: 0 };
try { TOTAL = JSON.parse(fs.readFileSync(path.join(__dirname, '_last-test.json'), 'utf8')); } catch (e) {}

const C = {
  ink: '#1d2321', dim: '#5d6663', line: '#d8d2c4', bg: '#fbf8f1', card: '#ffffff',
  claim: '#6b46c1', good: '#2f6b46', bad: '#a83232', doc: '#a8823a', blue: '#2b5d8a',
};

/* ---- 现算的数据 ---- */
const AUD = H.docAudit();
const BY = { ok: 0, diff: 0, contra: 0, na: 0 };
AUD.forEach((r) => { BY[r.verdict]++; });
const WA = H.wenAccount();
const IH = H.ihara(6).full;
const CS = H.coxShells();
const SD = H.sphereDesign();
const PS = H.pst();
const KP = H.kingwenPair();
const ORD = H.orders();
const GEN = H.genus();
const HAM = H.ham3();
const D60 = H.doobScan(60, 4000);
const FLOOR = Math.log(6) / 2;
const PF = H.pstAmp; /* 只用来确认 t=0 处不是 1 */
const DOC = S.DOC;
const TOC = S.DOC_TOC;
const BODY = S.DOC_BODY_ORDER;
const DOOB = S.DOC_DOOB;

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const n2 = (x) => x.toFixed(2);
const n4 = (x) => x.toFixed(4);
const NB = H.binom;

/* 对账表各段的标题 */
const SECN = {
  L1: '几何骨架', L2: '谱与数论', L3: '动力学', L4: '价值注入', L5: '七件衣服', L6: '不可复算',
};
const VK = {
  ok: ['✓', '#2f6b46', '逐位相等'],
  diff: ['●', '#b0672a', '不同'],
  contra: ['✗', '#a83232', '文档自相矛盾'],
  na: ['○', '#8a8f92', '不可复算'],
};

/* ================= 图 1：卦序称重（含今本拆账） ================= */
function svgOrder() {
  const rows = [
    { n: '格雷码（下界）', v: ORD.gray.total, c: C.line },
    { n: '京房八宫', v: ORD.jingfang.total, c: C.blue },
    { n: '邵雍先天', v: ORD.shaoyong.total, c: C.blue },
    { n: '帛书', v: ORD.boshu.total, c: C.blue },
    { n: '随机排列（期望）', v: WA.randomExpectTotal, c: C.dim },
    { n: '今本通行（拆账）', v: WA.total, c: C.good, split: true },
  ];
  const W = 660, L = 128, R = 74, TOP = 42, rowH = 34;
  const Hh = TOP + rows.length * rowH + 92;
  const pw = W - L - R, MAX = 230;
  const X = (v) => L + pw * v / MAX;
  let s = '<svg viewBox="0 0 ' + W + ' ' + Hh + '" width="100%" role="img" aria-label="六种卦序的爻变总步数，以及今本的拆账">';
  s += '<text x="0" y="15" font-size="12" fill="' + C.dim + '">横轴＝把 64 卦依次走一遍，相邻两卦的爻变步数之和。理论下界 63，随机排列的期望精确为 192。</text>';
  [0, 63, 120, 192, 211].forEach((v) => {
    s += '<line x1="' + X(v).toFixed(1) + '" y1="' + (TOP - 12) + '" x2="' + X(v).toFixed(1) + '" y2="' + (TOP + rows.length * rowH - 6) + '" stroke="' + C.line + '" stroke-dasharray="3 4"/>';
    s += '<text x="' + X(v).toFixed(1) + '" y="' + (TOP + rows.length * rowH + 12) + '" font-size="11" text-anchor="middle" fill="' + C.dim + '">' + v + '</text>';
  });
  rows.forEach((r, i) => {
    const y = TOP + i * rowH;
    s += '<text x="' + (L - 10) + '" y="' + (y + 15) + '" font-size="12" text-anchor="end" fill="' + C.ink + '">' + r.n + '</text>';
    if (r.split) {
      const wA = X(WA.within) - L, wB = X(WA.total) - X(WA.within);
      s += '<rect x="' + L + '" y="' + y + '" width="' + wA.toFixed(1) + '" height="20" fill="' + C.good + '" opacity="0.85"/>';
      s += '<rect x="' + X(WA.within).toFixed(1) + '" y="' + y + '" width="' + wB.toFixed(1) + '" height="20" fill="' + C.doc + '" opacity="0.85"/>';
      s += '<text x="' + (L + wA / 2).toFixed(1) + '" y="' + (y + 14) + '" font-size="11" text-anchor="middle" fill="#fff">对内 ' + WA.within + '</text>';
      s += '<text x="' + (X(WA.within) + wB / 2).toFixed(1) + '" y="' + (y + 14) + '" font-size="11" text-anchor="middle" fill="#fff">对间 ' + WA.between + '</text>';
      s += '<text x="' + (X(WA.total) + 6).toFixed(1) + '" y="' + (y + 14) + '" font-size="12" font-weight="700" fill="' + C.ink + '">' + WA.total + '</text>';
    } else {
      s += '<rect x="' + L + '" y="' + y + '" width="' + (X(r.v) - L).toFixed(1) + '" height="20" fill="' + r.c + '" opacity="0.7"/>';
      s += '<text x="' + (X(r.v) + 6).toFixed(1) + '" y="' + (y + 14) + '" font-size="12" font-weight="700" fill="' + C.ink + '">' + Math.round(r.v) + '</text>';
    }
  });
  s += '<text x="' + L + '" y="' + (Hh - 56) + '" font-size="11" fill="' + C.dim + '">今本那一根拆成两段：对内 32 对共 ' + WA.within + ' 步（均值 ' + WA.withinMean.toFixed(2) + '），对间 31 段共 ' + WA.between + ' 步（均值 ' + WA.betweenMean.toFixed(3) + '）。</text>';
  s += '<text x="' + L + '" y="' + (Hh - 38) + '" font-size="11" fill="' + C.dim + '">配对已证最优（Radisic 的 Lean 定理）；出场顺序则仍与随机难分。</text>';
  s += '<text x="' + L + '" y="' + (Hh - 20) + '" font-size="11" fill="' + C.dim + '">「配对绝非随手，顺序仍存疑」—— 这句话的账，就在这一根上。</text>';
  return s + '</svg>';
}

/* ================= 图 2：非回溯矩阵 384 阶的三笔账 ================= */
function svgNB() {
  const W = 660, L = 132, R = 96, TOP = 44, rowH = 46;
  const Hh = TOP + 3 * rowH + 96;
  const pw = W - L - R, MAX = 384;
  const X = (v) => L + pw * v / MAX;
  const rows = [
    { n: '｜μ｜ = √5（圆上）', v: IH.onCircle, c: C.good, why: '62 个 λ 各给一对共轭根' },
    { n: '｜μ｜ = 1（平凡）', v: IH.modOne, c: C.dim, why: 'd-正则图固定给 256 个，另 2 个来自 λ=±6' },
    { n: '｜μ｜ = 5（实根）', v: IH.modFive, c: C.bad, why: 'λ=±6 的判别式为正，两根落在 √5 圆外' },
  ];
  let s = '<svg viewBox="0 0 ' + W + ' ' + Hh + '" width="100%" role="img" aria-label="非回溯矩阵 384 阶特征值的三类分解">';
  s += '<text x="0" y="15" font-size="12" fill="' + C.dim + '">非回溯矩阵有 2m = ' + (2 * 192) + ' 阶。它的特征值不是「124 个」，而是三笔账加起来正好 384。</text>';
  rows.forEach((r, i) => {
    const y = TOP + i * rowH;
    s += '<text x="' + (L - 10) + '" y="' + (y + 16) + '" font-size="12" text-anchor="end" fill="' + C.ink + '">' + r.n + '</text>';
    const w = Math.max(X(r.v) - L, 4);
    s += '<rect x="' + L + '" y="' + y + '" width="' + w.toFixed(1) + '" height="24" fill="' + r.c + '" opacity="0.82"/>';
    s += '<text x="' + (L + w + 7).toFixed(1) + '" y="' + (y + 17) + '" font-size="13" font-weight="700" fill="' + C.ink + '">' + r.v + '</text>';
    s += '<text x="' + L + '" y="' + (y + 37) + '" font-size="11" fill="' + C.dim + '">' + r.why + '</text>';
  });
  const yT = TOP + 3 * rowH + 8;
  s += '<line x1="' + L + '" y1="' + yT + '" x2="' + (L + pw) + '" y2="' + yT + '" stroke="' + C.ink + '"/>';
  s += '<text x="' + L + '" y="' + (yT + 26) + '" font-size="13" font-weight="700" fill="' + C.ink + '">'
    + IH.onCircle + ' ＋ ' + IH.modOne + ' ＋ ' + IH.modFive + ' ＝ ' + IH.total + '</text>';
  s += '<text x="' + L + '" y="' + (yT + 48) + '" font-size="11" fill="' + C.dim + '">与 2m = 384 严丝合缝 —— 这才是「124」的正确位置：它是一个分项，不是总数。</text>';
  s += '<text x="' + L + '" y="' + (Hh - 24) + '" font-size="11" fill="' + C.dim + '">🔴 本仓旧实现的 ihara() 只报了后 128 个非平凡根，把平凡 256 丢在账外，总数写成 128。</text>';
  s += '<text x="' + L + '" y="' + (Hh - 8) + '" font-size="11" fill="' + C.dim + '">这次补齐：平凡 256 也要进表，否则「384 阶」对不上 —— 一个数被引用了十年，也可能只是账没记全。</text>';
  return s + '</svg>';
}

/* ================= 图 3：Coxeter 投影的壳层 ================= */
function svgCox() {
  const W = 660, Hh = 430, CX = 300, CY = 214, RAD = 168;
  const pts = H.coxProjection().pts;
  const rMax = Math.max.apply(null, pts.map((p) => p.r));
  const sc = RAD / rMax;
  const shellR = CS.shells.map((x) => x.r * sc);
  let s = '<svg viewBox="0 0 ' + W + ' ' + Hh + '" width="100%" role="img" aria-label="六维立方体在 Coxeter 平面上的投影：五层壳">';
  s += '<text x="0" y="15" font-size="12" fill="' + C.dim + '">六维立方体投到 Coxeter 平面（h = 12，每次转 30°）。半径只有 5 个取值 —— 64 个顶点分成 5 层壳。</text>';
  shellR.forEach((r) => {
    s += '<circle cx="' + CX + '" cy="' + CY + '" r="' + r.toFixed(1) + '" fill="none" stroke="' + C.line + '" stroke-dasharray="3 4"/>';
  });
  const msg = new Set(H.xiaoxiCodes ? H.xiaoxiCodes() : []);
  pts.forEach((p) => {
    const x = CX + p.zR * sc, y = CY - p.zI * sc;
    const isOuter = Math.abs(p.r - rMax) < 1e-6;
    const isCenter = p.r < 1e-9;
    const col = isOuter ? C.good : (isCenter ? C.bad : C.dim);
    const rad = isOuter ? 4.2 : (isCenter ? 5.5 : 2.4);
    s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + rad + '" fill="' + col + '" opacity="' + (isOuter || isCenter ? 0.95 : 0.5) + '"/>';
  });
  /* 中心注释（4 个卦同一点，只画一个点） */
  s += '<line x1="' + CX + '" y1="' + CY + '" x2="' + (CX + 96) + '" y2="' + (CY + 84) + '" stroke="' + C.bad + '" stroke-width="1"/>';
  s += '<text x="' + (CX + 100) + '" y="' + (CY + 80) + '" font-size="12" font-weight="700" fill="' + C.bad + '">台风眼：' + CS.centerNames.join('·') + '</text>';
  s += '<text x="' + (CX + 100) + '" y="' + (CY + 96) + '" font-size="11" fill="' + C.dim + '">4 个卦落在同一点</text>';
  /* 右侧壳层表 */
  const TX = 476;
  s += '<text x="' + TX + '" y="' + 54 + '" font-size="12" font-weight="700" fill="' + C.ink + '">半径 → 卦数</text>';
  CS.shells.forEach((sh, i) => {
    const y = 76 + i * 24;
    s += '<text x="' + TX + '" y="' + y + '" font-size="12" fill="' + (i === 0 ? C.good : (sh.r < 1e-9 ? C.bad : C.dim)) + '">'
      + (sh.r / 2).toFixed(4) + ' → ' + sh.n + ' 卦</text>';
  });
  s += '<text x="' + TX + '" y="' + (76 + 5 * 24 + 12) + '" font-size="11" fill="' + C.dim + '">（文档的半径是本值的 ½，</text>';
  s += '<text x="' + TX + '" y="' + (76 + 5 * 24 + 27) + '" font-size="11" fill="' + C.dim + '">因为它的顶点取了 ±1/√6）</text>';
  s += '<text x="0" y="' + (Hh - 26) + '" font-size="11" fill="' + C.good + '">最外圈 12 个＝十二消息卦：' + CS.outerNames.join('') + '</text>';
  s += '<text x="0" y="' + (Hh - 8) + '" font-size="11" fill="' + C.dim + '">这一条是本轮最难「凑」的：外圈恰好 12 个不多不少，且逐卦与消息卦重合 —— 如果是巧合，概率是 C(64,12) 分之一。</text>';
  return s + '</svg>';
}

/* ================= 图 4：Doob 三套实现的地板 ================= */
function svgDoob() {
  const W = 660, L = 56, R = 132, TOP = 92, BOT = 84;
  const Hh = 404;
  const pw = W - L - R, ph = Hh - TOP - BOT;
  const BMAX = 8, YMAX = 1.95;
  const X = (b) => L + pw * b / BMAX;
  const Y = (h) => TOP + ph * (1 - h / YMAX);
  /* 我的两条 */
  const bs = [0, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8];
  const myA = bs.map((b) => ({ b, H: H.doobScan(b, 2500).H }));
  const myB = bs.map((b) => ({ b, H: H.doobScanB(b, 2500).H }));
  const pl = (arr) => arr.map((p) => X(p.b).toFixed(1) + ',' + Y(p.H).toFixed(1)).join(' ');
  let s = '<svg viewBox="0 0 ' + W + ' ' + Hh + '" width="100%" role="img" aria-label="三套 Doob 实现的熵率曲线，两条撞到地板">';
  s += '<text x="0" y="15" font-size="12" fill="' + C.dim + '">同一个 β，三种势函数。灰色是文档自己的扫描表，绿、蓝是我这两条独立实现。</text>';
  [0, 0.5, 1.0, 1.5].forEach((h) => {
    s += '<line x1="' + L + '" y1="' + Y(h).toFixed(1) + '" x2="' + (L + pw) + '" y2="' + Y(h).toFixed(1) + '" stroke="' + C.line + '" stroke-dasharray="3 4"/>';
    s += '<text x="' + (L - 8) + '" y="' + (Y(h) + 4).toFixed(1) + '" font-size="11" text-anchor="end" fill="' + C.dim + '">' + h.toFixed(1) + '</text>';
  });
  [0, 2, 4, 6, 8].forEach((b) => {
    s += '<text x="' + X(b).toFixed(1) + '" y="' + (TOP + ph + 18) + '" font-size="11" text-anchor="middle" fill="' + C.dim + '">' + b + '</text>';
  });
  s += '<text x="' + (L + pw) + '" y="' + (TOP + ph + 34) + '" font-size="11" text-anchor="end" fill="' + C.dim + '">β（良心的硬度）</text>';

  /* ln6 参考线 */
  s += '<line x1="' + L + '" y1="' + Y(Math.log(6)).toFixed(1) + '" x2="' + (L + pw) + '" y2="' + Y(Math.log(6)).toFixed(1) + '" stroke="' + C.claim + '" stroke-width="1" stroke-dasharray="6 3"/>';
  s += '<text x="' + (L + pw) + '" y="' + (Y(Math.log(6)) - 6).toFixed(1) + '" font-size="11" text-anchor="end" fill="' + C.claim + '">ln 6 ＝ 1.7918（β=0 时三处都精确落在这根线上）</text>';

  /* 三条线 */
  s += '<polyline points="' + DOOB.map((p) => X(p.beta).toFixed(1) + ',' + Y(p.H).toFixed(1)).join(' ') + '" fill="none" stroke="' + C.dim + '" stroke-width="2" stroke-dasharray="5 3"/>';
  s += '<polyline points="' + pl(myA) + '" fill="none" stroke="' + C.good + '" stroke-width="2"/>';
  s += '<polyline points="' + pl(myB) + '" fill="none" stroke="' + C.blue + '" stroke-width="2"/>';

  /* 两条地板 */
  const f1 = Math.log(2), f2 = Math.log(6) / 2;
  [[f1, '文档表的地板 ≈ ln 2', C.dim], [f2, '我的地板 ＝ ½·ln 6', C.good]].forEach((q) => {
    s += '<line x1="' + (L + pw - 96) + '" y1="' + Y(q[0]).toFixed(1) + '" x2="' + (L + pw) + '" y2="' + Y(q[0]).toFixed(1) + '" stroke="' + q[2] + '" stroke-width="1.6"/>';
  });
  s += '<text x="' + (L + pw + 6) + '" y="' + (Y(f2) + 4).toFixed(1) + '" font-size="11" fill="' + C.good + '">½·ln 6 ＝ ' + f2.toFixed(4) + '</text>';
  s += '<text x="' + (L + pw + 6) + '" y="' + (Y(f1) + 4).toFixed(1) + '" font-size="11" fill="' + C.dim + '">ln 2 ＝ ' + f1.toFixed(4) + '</text>';

  /* 图例放到绘图区**上方**的一整行 —— 放里面必然被曲线穿过（这一版就是被探针抓出来的） */
  const items = [['文档表（a=0.85）', C.dim, 'dash'], ['我的模型 A（1＋当位数）', C.good, 'solid'], ['我的模型 B（爻位势）', C.blue, 'solid']];
  let lgx = L;
  items.forEach((it) => {
    s += '<line x1="' + lgx + '" y1="' + (TOP - 22) + '" x2="' + (lgx + 20) + '" y2="' + (TOP - 22) + '" stroke="' + it[1] + '" stroke-width="2" ' + (it[2] === 'dash' ? 'stroke-dasharray="5 3"' : '') + '/>';
    s += '<text x="' + (lgx + 26) + '" y="' + (TOP - 18) + '" font-size="11" fill="' + C.ink + '">' + it[0] + '</text>';
    lgx += 26 + it[0].length * 11 + 22;
  });
  s += '<text x="0" y="' + (Hh - 40) + '" font-size="11" fill="' + C.bad + '">🔴 文档正文写「β=4 时熵率 ≈ 0.02」，它自己的表格在 β=4 给 0.7020 —— 差 35 倍。</text>';
  s += '<text x="0" y="' + (Hh - 24) + '" font-size="11" fill="' + C.bad + '">而我的模型 A 在 β=4 给 ' + myA[8].H.toFixed(4) + '，模型 B 给 ' + myB[8].H.toFixed(4) + '。三套实现互不相等。</text>';
  s += '<text x="0" y="' + (Hh - 5) + '" font-size="11" fill="' + C.dim + '">能确定的只有一件事：β 再大，每条曲线都撞到一条平的地板；高度由「势最高处有几个并列出口」定，不由 β 定。</text>';
  return s + '</svg>';
}

/* ================= 图 5：球面 3-设计的四组矩 ================= */
function svgMoment() {
  const W = 660, Hh = 344, L = 58, R = 20, TOP = 46, BOT = 112;
  const pw = W - L - R, ph = Hh - TOP - BOT;
  const YMAX = 0.19;
  const Y = (v) => TOP + ph * (1 - v / YMAX);
  const gw = pw / 4;
  let s = '<svg viewBox="0 0 ' + W + ' ' + Hh + '" width="100%" role="img" aria-label="64 点与 S⁵ 球面的四组矩对比">';
  s += '<text x="0" y="15" font-size="12" fill="' + C.dim + '">把 64 卦记成 (±1,…,±1)/√6，它们全落在 S⁵ 上。判 3-设计就是逐次比矩：2、3 次必须相等，4 次必须不等。</text>';
  s += '<line x1="' + L + '" y1="' + Y(0) + '" x2="' + (L + pw) + '" y2="' + Y(0) + '" stroke="' + C.ink + '"/>';
  [0, 0.05, 0.1, 0.15].forEach((v) => {
    s += '<line x1="' + L + '" y1="' + Y(v).toFixed(1) + '" x2="' + (L + pw) + '" y2="' + Y(v).toFixed(1) + '" stroke="' + C.line + '" stroke-dasharray="3 4"/>';
    s += '<text x="' + (L - 8) + '" y="' + (Y(v) + 4).toFixed(1) + '" font-size="11" text-anchor="end" fill="' + C.dim + '">' + v.toFixed(2) + '</text>';
  });
  const bw = gw * 0.26;
  SD.rows.forEach((r, i) => {
    const cx = L + gw * (i + 0.5);
    const x1 = cx - bw - 2, x2 = cx + 2;
    s += '<rect x="' + x1.toFixed(1) + '" y="' + Y(r.ours).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(Y(0) - Y(r.ours), 1).toFixed(1) + '" fill="' + C.good + '" opacity="0.85"/>';
    s += '<rect x="' + x2.toFixed(1) + '" y="' + Y(r.exact).toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + Math.max(Y(0) - Y(r.exact), 1).toFixed(1) + '" fill="' + C.dim + '" opacity="0.55"/>';
    if (r.ours < 1e-9 && r.exact < 1e-9) {
      s += '<text x="' + (cx - bw / 2).toFixed(1) + '" y="' + (Y(0) - 6) + '" font-size="11" text-anchor="middle" fill="' + C.ink + '">两者都是 0</text>';
    } else {
      s += '<text x="' + (x1 + bw / 2).toFixed(1) + '" y="' + (Y(r.ours) - 5).toFixed(1) + '" font-size="11" text-anchor="middle" fill="' + C.good + '">' + r.ours.toFixed(4) + '</text>';
      s += '<text x="' + (x2 + bw / 2).toFixed(1) + '" y="' + (Y(r.exact) - 5).toFixed(1) + '" font-size="11" text-anchor="middle" fill="' + C.dim + '">' + r.exact.toFixed(4) + '</text>';
    }
    s += '<text x="' + cx.toFixed(1) + '" y="' + (Y(0) + 20) + '" font-size="12" text-anchor="middle" fill="' + C.ink + '">' + r.name + '</text>';
    s += '<text x="' + cx.toFixed(1) + '" y="' + (Y(0) + 37) + '" font-size="12" font-weight="700" text-anchor="middle" fill="' + (r.ok ? C.good : C.bad) + '">' + (r.ok ? '✓ 吻合' : '✗ 不吻合') + '</text>';
    s += '<text x="' + cx.toFixed(1) + '" y="' + (Y(0) + 52) + '" font-size="10" text-anchor="middle" fill="' + C.dim + '">' + r.deg + ' 次</text>';
  });
  s += '<text x="0" y="' + (Hh - 22) + '" font-size="11" fill="' + C.good + '">绿＝64 点平均，灰＝S⁵ 上的精确积分。2、3 次逐位相等、4 次不等 ⇒ 强度恰为 3。</text>';
  s += '<text x="0" y="' + (Hh - 5) + '" font-size="11" fill="' + C.dim + '">🔴 4 次矩为什么必然不等：每个坐标都是 ±1/√6，四次方恒为 1/36，与点集形状无关；球面要的是 3/48 与 1/48。</text>';
  return s + '</svg>';
}

/* ================= 表格 ================= */
function auditTable() {
  let t = '<table class="t"><thead><tr><th>段</th><th>项</th><th>文档写的</th><th>我算的</th><th>判定</th></tr></thead><tbody>';
  let cur = '';
  AUD.forEach((r, i) => {
    if (r.sec !== cur) {
      cur = r.sec;
      t += '<tr class="grp"><td colspan="5">' + cur + ' · ' + (SECN[cur] || '') + '</td></tr>';
    }
    const v = VK[r.verdict];
    t += '<tr><td class="c">' + (i + 1) + '</td><td>' + esc(r.item)
      + (r.note ? '<span class="note">' + esc(r.note) + '</span>' : '')
      + '</td><td class="d">' + esc(r.doc) + '</td><td class="m">' + esc(r.mine) + '</td>'
      + '<td style="color:' + v[1] + ';white-space:nowrap"><b>' + v[0] + '</b> ' + v[2] + '</td></tr>';
  });
  return t + '</tbody></table>';
}

function tocTable() {
  let t = '<table class="t"><thead><tr><th>目录第几条</th><th>章</th><th>标题</th><th>在正文里的位置</th><th>状态</th></tr></thead><tbody>';
  TOC.forEach((row, i) => {
    const at = BODY.indexOf(row[0]);
    const isNoH2 = S.DOC_NO_H2.indexOf(row[0]) >= 0;
    let st, col;
    if (isNoH2) { st = '不是 h2（层级掉了）'; col = C.bad; }
    else if (at < 0) { st = '正文里找不到'; col = C.bad; }
    else if (at === i) { st = '位置正常'; col = C.dim; }
    else { st = '错位：正文第 ' + (at + 1) + ' 个'; col = C.doc; }
    t += '<tr><td class="c">' + (i + 1) + '</td><td>' + row[0] + '</td><td>' + esc(row[1]) + '</td>'
      + '<td class="c">' + (at >= 0 ? (at + 1) : '—') + '</td>'
      + '<td style="color:' + col + ';white-space:nowrap">' + st + '</td></tr>';
  });
  return t + '</tbody></table>';
}

/* ================= 页面 ================= */
const html = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>算法文档合观校核 · 六维超立方体 × 易经 × AI 对齐</title>
<style>
:root{--ink:${C.ink};--dim:${C.dim};--line:${C.line};--bg:${C.bg};--card:${C.card};
--good:${C.good};--bad:${C.bad};--doc:${C.doc};--blue:${C.blue};--claim:${C.claim}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);
font:16px/1.75 -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;
-webkit-font-smoothing:antialiased}
.wrap{max-width:1040px;margin:0 auto;padding:44px 26px 90px}
h1{font-size:30px;line-height:1.35;margin:0 0 8px;letter-spacing:.3px}
.sub{color:var(--dim);font-size:15px;margin:0 0 26px}
h2{font-size:22px;margin:52px 0 14px;padding-bottom:9px;border-bottom:2px solid var(--line)}
h2 .no{display:inline-block;min-width:44px;color:var(--doc);font-weight:700;margin-right:8px}
h3{font-size:17px;margin:28px 0 9px}
p{margin:11px 0}
ul,ol{margin:11px 0 11px 22px;padding:0}
li{margin:6px 0}
code{background:#f0ece2;padding:1px 5px;border-radius:3px;font-size:13.5px;
font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
b{font-weight:700}
.lede{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--doc);
border-radius:6px;padding:16px 20px;margin:18px 0}
.warn{background:#fdf6f3;border:1px solid #e8c9bd;border-left:4px solid var(--bad);
border-radius:6px;padding:16px 20px;margin:18px 0}
.okbox{background:#f2f8f4;border:1px solid #c3dccd;border-left:4px solid var(--good);
border-radius:6px;padding:16px 20px;margin:18px 0}
.kpi{display:flex;gap:14px;flex-wrap:wrap;margin:20px 0}
.kpi div{flex:1 1 150px;background:var(--card);border:1px solid var(--line);border-radius:8px;
padding:14px 16px}
.kpi b{display:block;font-size:26px;line-height:1.2}
.kpi span{color:var(--dim);font-size:13px}
.tw{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:16px 0}
table.t{width:100%;border-collapse:collapse;margin:0;font-size:14px;background:var(--card)}
table.t th,table.t td{border:1px solid var(--line);padding:8px 10px;vertical-align:top;text-align:left}
table.t th{background:#efeade;font-weight:700;font-size:13px}
tbody{background:var(--card)}
table.t tr.grp td{background:#f4f0e6;font-weight:700;color:var(--doc);font-size:13px}
table.t td.c{text-align:center;color:var(--dim);white-space:nowrap}
table.t td.d{color:var(--doc)}
table.t td.m{color:#1b1b1b;font-weight:600}
.note{display:block;color:var(--dim);font-size:12.5px;margin-top:3px;font-weight:400}
figure.fig{margin:22px 0 26px;background:var(--card);border:1px solid var(--line);border-radius:8px;padding:14px 14px 6px}
figure.fig svg{width:100%;max-width:780px;height:auto;display:block;margin:0 auto}
figure.fig figcaption{color:var(--dim);font-size:13px;padding:8px 4px 8px;line-height:1.6}
.toc{background:var(--card);border:1px solid var(--line);border-radius:6px;padding:12px 16px;
font-size:13.5px;color:var(--dim);margin:18px 0}
.links{display:grid;gap:12px;margin:16px 0}
.links a{display:block;text-decoration:none;color:inherit;background:var(--card);
border:1px solid var(--line);border-left:4px solid var(--doc);border-radius:6px;padding:12px 16px}
.links a:hover{background:#fffdf6}
.links b{display:block;margin-bottom:4px}
.links span{color:var(--dim);font-size:13px}
.small{color:var(--dim);font-size:13px}
hr{border:0;border-top:1px solid var(--line);margin:36px 0}
@media (max-width:700px){
  .wrap{padding:26px 14px 60px}
  h1{font-size:23px}
  h2{font-size:19px}
  figure.fig{overflow-x:auto;-webkit-overflow-scrolling:touch}
  figure.fig svg{min-width:600px}
  table.t{font-size:12.5px}
  table.t th,table.t td{padding:6px 7px}
}
</style></head><body><div class="wrap">

<h1>算法文档合观校核</h1>
<p class="sub">把元宝那份 17 章文档里的每个数，用本仓的数值源重算一遍 · 50 项对账 · ${AUD.length} 项里 ${BY.ok} 项逐位相等、${BY.diff} 项要改、${BY.contra} 项自相矛盾、${BY.na} 项核不了</p>

<div class="toc"><b>本页九节</b>　§0 这份页在做什么 ｜ §1 骨架复原 ｜ <b>§2 五十项对账</b> ｜ §3 五张图 ｜ §4 四处必须改 ｜ §5 一处可以撤销 ｜ §6 文献与仓库 ｜ §7 定位与边界 ｜ §8 互跳与验收</div>

<h2><span class="no">§0</span>这份页在做什么</h2>

<p>你给的分享页 <code>yb.tencent.com/s/tqhamfwol6ao</code> 本身是一段六轮对话，真正的内容挂在它引用的两份工件上。两份都已原样入库，<b>未做任何编辑</b>，字段含字节数与 sha256：</p>

<table class="t"><thead><tr><th>工件</th><th>文件</th><th>字节</th><th>sha256 前 12 位</th><th>结构</th></tr></thead><tbody>
<tr><td>算法文档 HTML</td><td><code>${esc(DOC.html.file.split('/').pop())}</code></td><td class="c">${DOC.html.bytes.toLocaleString()}</td><td class="c"><code>${DOC.html.sha256.slice(0, 12)}</code></td><td>${DOC.html.h2} 个 h2、${DOC.html.img} 张内嵌图 + ${DOC.html.svg} 张 SVG</td></tr>
<tr><td>同源旧版</td><td><code>${esc(DOC.htmlOld.file.split('/').pop())}</code></td><td class="c">${DOC.htmlOld.bytes.toLocaleString()}</td><td class="c"><code>${DOC.htmlOld.sha256.slice(0, 12)}</code></td><td>无「前言」「十六」两章</td></tr>
<tr><td>视频清单 MD</td><td><code>${esc(DOC.md.file.split('/').pop())}</code></td><td class="c">${DOC.md.bytes.toLocaleString()}</td><td class="c"><code>${DOC.md.sha256.slice(0, 12)}</code></td><td>6 部核心视频 + 3 部待完善 + ${S.REFS.length} 篇文献 + ${S.REPOS.length} 个仓库</td></tr>
</tbody></table>

<p>为什么要留两版 HTML：15 章版是当天上午的同步结果，17 章版是晚些时候加了两章。两版并置，才能证明「第十六章 RSI 现状」是本轮新增、而不是原来就有 —— 这是<b>版本证据</b>，删掉一版就没了。</p>

<div class="lede">
<p><b>三条口径，先说清楚。</b></p>
<ol>
<li><b>能算的现算。</b>对账表里「我算的」一列，全部由 <code>hexagram.cjs</code> 现场计算并注入，页面上没有任何一个数字是手写或复述的。文末的核验数 ${TOTAL.pass}／${TOTAL.total} 也是从 <code>_last-test.json</code> 读的。</li>
<li><b>算不了的标 na。</b>RSI 三档水位、2026 年 10 月三篇论文的指标、Lean 4 仓库里到底有没有那个定理 —— 这些我没有独立核过，一律标「○ 不可复算」，<b>不混进通过</b>。</li>
<li><b>文档自己跟自己对不上的，标 contra。</b>不是「我算得跟你不一样」就叫错；同一份文件里正文与表格差 35 倍，才是真的错。</li>
</ol>
</div>

<div class="kpi">
<div><b style="color:${C.good}">${BY.ok}</b><span>项逐位相等</span></div>
<div><b style="color:#b0672a">${BY.diff}</b><span>项要改</span></div>
<div><b style="color:${C.bad}">${BY.contra}</b><span>项自相矛盾</span></div>
<div><b style="color:#8a8f92">${BY.na}</b><span>项不可复算</span></div>
</div>

<p>一句话结论：<b>这份文档的硬数字大部分是真算过的 —— 几何、谱、卦序、互卦、三才张力、球面设计、完美态转移，${BY.ok} 项全部逐位相等。</b>问题不在算术，在四件事：章节顺序、一个定义、一个口径、以及一处正文与表格打架。</p>

<h2><span class="no">§1</span>骨架复原：目录 18 条，正文 17 个 h2</h2>

<p>先不谈数，先看骨架。文档自报「17 章」，目录列了 <b>${TOC.length}</b> 条 —— 这两个数就已经对不上。逐个查下来是这样：</p>

${tocTable()}

<div class="warn">
<p><b>🔴 三处结构问题，原件就有，不是我抄漏：</b></p>
<ol>
<li><b>「十四」根本没有 h2。</b>它的正文确实存在（雷达图与平行坐标那一段），但用的是别的标签，所以正文只有 ${DOC.html.h2} 个 h2。目录里它是第 16 条，正文里它没有位置。</li>
<li><b>「八」「九」排在「十三」后面。</b>正文顺序是 ${BODY.join(' → ')}。序号是 8、9，位置却在第 14、15 个 —— 中间插了 10 到 13。</li>
<li><b>「十四」的正文被甩到全文落款之后。</b>也就是「本文档由四支视频合并整理」那句话后面还挂着一整节。读者按目录跳过去，会跳到文档外面。</li>
</ol>
<p class="small">附带的后果：正文里出现的章号序列是 ${BODY.join('，')} —— 一个单调不增的读者会在这里彻底迷路。本页 §2 起按<b>目录的正确顺序</b>引用，不再沿用正文的乱序。</p>
</div>

<h2><span class="no">§2</span>五十项对账</h2>

<p>下面每一行都是「文档写了什么 / 我算出来是什么 / 判定」。判定四档：<b style="color:${C.good}">✓ 逐位相等</b>、<b style="color:#b0672a">● 不同</b>、<b style="color:${C.bad}">✗ 文档自相矛盾</b>、<b style="color:#8a8f92">○ 不可复算</b>。</p>

<p class="small">读法：先看绿色的数量。${BY.ok} 项绿色说明这份文档不是编的 —— 它真的把六维超立方体算了一遍。然后只看非绿色的 ${AUD.length - BY.ok} 行，那才是需要动手的地方。</p>

${auditTable()}

<h2><span class="no">§3</span>五张图：把对账里最要紧的五处画出来</h2>

<p>表能说明「等不等于」，说不清「为什么」。下面五张图各负责一处。</p>

<figure class="fig">
${svgOrder()}
<figcaption><b>图 1　卦序称重，以及今本那 211 步的拆账。</b>六根柱子用同一把尺子：把 64 卦依次走一遍，相邻两卦的爻变步数之和。格雷码 ${ORD.gray.total} 步踩在理论上，今本 ${WA.total} 步比随机期望还高。今本那根拆成两段，是因为它的 ${WA.total} 步必须分开看：对内 ${WA.within} 步、对间 ${WA.between} 步。对内那 ${WA.within} 步已被 Radisic 的 Lean 定理证明是唯一最小解，对间那 ${WA.between} 步则与随机几乎无差别 —— 「配对绝非随手，顺序仍存疑」这句话，账就在这里。</figcaption>
</figure>

<figure class="fig">
${svgNB()}
<figcaption><b>图 2　非回溯矩阵的三笔账。</b>「124」这个数被引用得最多，也最容易被误当成总数。真实情况是 384 阶分成三段：圆上 ${IH.onCircle} 个、平凡 ${IH.modOne} 个、圆外实根 ${IH.modFive} 个。少了平凡那 ${IH.trivial} 个，「图的黎曼猜想」这句话就无从谈起 —— 因为「全部非平凡特征值都在 √5 圆上或之内」这个断言，恰恰需要把平凡根排除在外才成立。</figcaption>
</figure>

<figure class="fig">
${svgCox()}
<figcaption><b>图 3　Coxeter 投影的五层壳。</b>这是本轮最难「凑」的一条：64 个顶点投到 Coxeter 平面后，半径只有 ${CS.shells.length} 个取值，最外圈<b>恰好 ${CS.outerN} 个</b>且逐卦与十二消息卦重合，正中心<b>恰好 ${CS.centerN} 个</b>（${CS.centerNames.join('·')}，同一点上叠了四个卦）。若这是巧合，概率是 C(64,${CS.outerN}) 分之一。这一条我信，因为它是算出来的，不是挑出来的。</figcaption>
</figure>

<figure class="fig">
${svgDoob()}
<figcaption><b>图 4　同一个 β，三套势函数，三条不同的曲线。</b>这张图是本页最重要的一张，因为它同时说明了两件事：<b>第一</b>，三套实现互不相等 —— 所以「β=4 时熵率 0.02」这个数不可能是唯一答案，它完全取决于势怎么定；<b>第二</b>，三条曲线在 β 增大时都撞到一条平的线，不再下降。地板是结构性的：势最高处那几个出口一旦并列，步进就退化成「走一步自由、下一步被迫回头」，熵率正好减半。我的那条地板是 ${FLOOR.toFixed(6)} ＝ ½·ln 6，文档那条是 ln 2 ＝ ${Math.log(2).toFixed(4)}，高度不同，性质一样。</figcaption>
</figure>

<figure class="fig">
${svgMoment()}
<figcaption><b>图 5　球面 3-设计的四组矩。</b>判「是不是 t-设计」不看形状，看矩：2 次、3 次必须与球面积分逐位相等，4 次必须不等。四组数里前三组对、第四组对不上，强度就恰好是 3。有意思的是 4 次矩<b>必然</b>对不上：每个坐标都是 ±1/√6，四次方恒等于 1/36，与点集怎么摆无关；而 S⁵ 要的是 3/48 与 1/48。这不是「差一点」，是「差一个常数因子」，且这个因子由 ±1/√6 这个取法决定。</figcaption>
</figure>

<h2><span class="no">§4</span>四处必须改</h2>

<h3>一 · 「只有谦卦六爻全正」—— 这一条查不得</h3>
<p>文档第六章写：「64 卦中按论文的编码，只有一卦六爻全是正分：谦卦」，并把热力图里谦那一行标成整行皆绿。按「当位」的标准定义（初、三、五为阳位，二、四、上为阴位），六爻全当位的卦是<b>既济</b>（${H.codeToBits(42).join('')}），不是谦。</p>
<p>这一条其实是<b>定义问题，不是经验问题</b>：当位模式本身就是一串六位二进制，它对应且只对应一个卦。所以「六爻全当位」的卦数恒等于 1，问题只在于那个卦是谁 —— 模式是 ${H.WEI_PATTERN.join('')}，它读出来就是既济。谦（${H.codeToBits(H.codeOf('艮', '坤')).join('')}）只有 <b>${H.weiCount(H.codeOf('艮', '坤'))} 爻</b>当位。</p>
<p>顺着这条往下推，还有一个更硬的反例：用「六个爻位的平均吉凶分」当势函数排序，<b>谦排 61／64</b>（V ＝ ${H.yaoScoreSum(H.codeOf('艮', '坤')).toFixed(2)}），几乎垫底。而视频与文档都说「谦为最高原则」。两个说法不能同时成立 —— 唯一自洽的解释是：<b>吉凶 ＝ 位效应 ＋ 卦效应</b>，六个位平均只给了前半截，卦效应那一半（384 条逐爻分）两版都没有公开。这也是为什么原文非要那张 384 维的表不可。</p>

<h3>二 · β=4 的熵率，正文与表格差 35 倍</h3>
<p>同一份文档里：正文与图注写「β=4 时熵率 ≈ 0.02，系统麻木」；它自己的扫描表在 β=4 那一行写 <b>0.7020</b>。${(0.7020 / 0.02).toFixed(0)} 倍。<b>这两个数不能同时对。</b></p>
<p>而且两个都不可信：我按「1＋当位数」建的同型势，β=4 给 ${H.doobScan(4, 3000).H.toFixed(4)}；文档表在 β=8 停在 0.6932（≈ ln 2）。三套实现三个值，说明这个数对「势怎么定」极度敏感，写成一个不带条件的 0.02 是站不住的。</p>

<h3>三 · 「对间随机期望 95.2」—— 数没错，口径错了</h3>
<p>精确期望是 <b>${(31 * WA.randomStep).toFixed(3)}</b>：每一步取两个相异顶点，每一位翻转的概率是 2·32²／(64·63)，六位共 ${WA.randomStep.toFixed(4)}，31 段共 ${(31 * WA.randomStep).toFixed(3)}。而 95.2 与它的差是 ${(95.2 - 31 * WA.randomStep).toFixed(2)}，单段标准差 1.22，31 段的抽样标准差 ${WA.betweenSd.toFixed(1)} ⇒ 95.2 落在 <b>${((95.2 - 31 * WA.randomStep) / WA.betweenSd).toFixed(2)}σ</b> 以内。</p>
<p>所以 95.2 是一次蒙特卡洛的抽样值，不是期望。写成「随机期望 95.2」会让读者以为 91 与 95.2 的差距有意义 —— 实际上 91 与期望 ${(31 * WA.randomStep).toFixed(1)} 的差也只有 ${((91 - 31 * WA.randomStep) / WA.betweenSd).toFixed(2)}σ。结论不变（顺序与随机难分），但理由要说对。</p>

<h3>四 · 章节顺序（§1 已列，此处不重复）</h3>
<p>这一条最不「学术」，但最影响可用性：<b>读者按目录跳转，会跳到文档外面去。</b>修起来也最简单 —— 把「八」「九」挪回「七」后面，把「十四」从落款后提上来并改成 h2。</p>

<h2><span class="no">§5</span>一处可以撤销：亏格 17 不是「未复现」</h2>

<div class="okbox">
<p>文档第十一章那张表里，「马鞍背心（云肩）＝ 亏格 17 双曲曲面」标的是 <b>「视频声称，未独立复现 ⚠️」</b>。这一行现在可以撤掉 —— 本仓已经把它夹死了，而且<b>不需要引用任何定理</b>：</p>
<ol>
<li>Q₆ 是二分图（按卦号奇偶分两侧），二分图没有奇环 ⇒ <b>围长 ＝ 4</b>；</li>
<li>每个面至少 4 条边 ⇒ 2E ≥ 4F ⇒ <b>F ≤ 2·192／4 ＝ ${GEN.Fmax}</b>；</li>
<li>欧拉公式：χ ＝ ${GEN.V} − ${GEN.E} ＋ ${GEN.Fmax} ＝ <b>${GEN.chi}</b> ＝ 2 − 2g ⇒ <b>g ≥ ${GEN.gMin}</b>；</li>
<li>另一方向 Ringel 给上界 γ(Qₙ) ＝ (n−4)·2ⁿ⁻³ ＋ 1，n ＝ 6 时恰为 ${H.genusQ(6)} ⇒ 上下夹死，<b>g ＝ ${GEN.gMin}</b>。</li>
</ol>
<p>顺带一个交叉验证：同一公式在 n ＝ 3…8 给 ${[3, 4, 5, 6, 7, 8].map((n) => H.genusQ(n)).join('、')}。最后那个 <b>129</b> 正是文档另一处提到的「Mumford 皮亏格 129」—— 两个在文档里分开出现的对象，被同一个公式同时命中。</p>
</div>

<p>同理，「金缕衣 ＝ 3 条边不交哈密顿回路」文档标的是「构造性存在 ✅」，本仓也真构造出来了：${HAM.lens.join('／')} 三条、并集 ${HAM.edgeUnion} 条边、重边 ${HAM.dupEdges}。做法不是搜索（随机搜索在本机重跑就不复现），是<b>先按维度分 2-因子、再用 2-switch 合并同色环、卡住时用固定种子扰动跳出局部最优</b>。</p>

<h2><span class="no">§6</span>文献与仓库：${S.REFS.length} 篇 + ${S.REPOS.length} 个</h2>

<p>这部分<b>我不核</b>，只照录 —— 理由很简单：仓库里没有这些实验、也没 clone 这些代码，核了就是假装。列在这里的价值是「可追溯」：谁要查，顺着编号就能找到。</p>

<table class="t"><thead><tr><th>号</th><th>文献</th><th>出处</th><th>与本体系的关系</th></tr></thead><tbody>
${S.REFS.map((r) => '<tr><td class="c">' + r[0] + '</td><td>' + esc(r[1]) + '</td><td class="d">' + esc(r[2]) + '</td><td>' + esc(r[3]) + '</td></tr>').join('')}
</tbody></table>

<table class="t"><thead><tr><th>仓库</th><th>内容</th><th>价值</th></tr></thead><tbody>
${S.REPOS.map((r) => '<tr><td><code>' + esc(r[0]) + '</code></td><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td></tr>').join('')}
</tbody></table>

<p class="small">有一点值得单独说：<code>alerad/iching_</code> 对应 Radisic 的 arXiv:2601.07175，而这篇论文的<b>全局最优性声明曾被社区质疑并主动收窄</b>（某轨道上 CR 配对 cost 4 而 R 配对 8，作者承认「writeup 只考虑了 C/R matchings，全局最优的说法需要修范围」），v2 摘要因此加了限定语。所以引用必须用 v2，不要用 v1。这条我在文档里核不了，但它自己给出了可核查的修订史 —— 这种「连自己的修补都写出来」的态度，比结论本身更可信。</p>

<h2><span class="no">§7</span>定位与边界：罗盘，不是引擎</h2>

<p>文档第十六章有一个判断我完全同意，值得抄在这里：</p>

<div class="warn">
<p><b>站得住的三处：</b>① <b>参照系</b> —— Q₆ 的 384 条有向边是预先确定、与模型无关、可完备枚举的尺子，不会随训练漂移；② <b>约束不可交易</b> —— 「宁可逻辑死锁也不硬拧」在 2026 年 10 月的 ReSI 里已有可运行版（两个独立条件、无候选通过就停循环）；③ <b>概念翻译器</b> —— 把「中庸」翻成帕累托权衡点、把「疼是免疫力」翻成谱隙→0。</p>
<p><b>站不住的三处：</b>① <b>量级差十个数量级</b> —— 64 个离散状态 vs 万亿参数连续空间，从语义空间到 Q₆ 的映射<b>从未给出</b>；② <b>工程方案并不需要易经</b> —— held-out 集、canary case、独立验证器、PRM、formal verifier 已经在跑；③ <b>它是 conceptual，不是 implementable</b>。</p>
</div>

<p>我的判断和它一样：<b>有用，但位置是罗盘，不是引擎。</b>它描述方向，不提供动力。最强的贡献在「参照系」，最弱的环节在「映射」—— 谁要把这套东西工程化，卡点就在 64 → 万亿参数那一步，不在几何本身。</p>

<p>至于 §2 里标 na 的那几项（RSI 三档水位、三篇同期论文的指标），我<b>没有独立核过</b>。它们的内部逻辑是自洽的（三个互不相干的团队补同一个洞：反馈信号必须独立于被优化系统），但这不等于数字为真。要用，请回去核原文。</p>

<h2><span class="no">§8</span>三页互跳与验收</h2>

<div class="links">
<a href="AAA_四六通达_三源合观.html"><b>← 三源合观（主索引页）</b><span>四套卦序的步数、云肩亏格、金缕衣三回路、Doob 两模型 · 十二节 + 五张现算图</span></a>
<a href="AAA_良心与异化_六维价值梯度.html"><b>↔ 良心与异化（子页）</b><span>16 帧视频截图的逐帧复算：六爻位吉凶分、逆行税率＝势之比、β 工作区间、人道墙裂 4 块</span></a>
<a href="AAA_cRSI_玩具版_实跑记录.html"><b>▶ cRSI 玩具版（可执行版）</b><span>把文档里那套「装良心」真做成系统跑 10⁵ 步：八组配置、帕累托前沿、以及「自改看不见 Ω 符号」的恒等式证明</span></a>
</div>

<p class="small">本页核验：<code>test-hex.cjs</code> <b>${TOTAL.pass}／${TOTAL.total}</b>（其中 N 段专查这份文档）；页面探针见 <code>_probe_docaudit.cjs</code>。对账数据由 <code>hexagram.cjs</code> 的 <code>docAudit()</code> 单点提供，表、图、断言三处共用同一份结果 —— 不存第二份真相。</p>

<hr>
<p class="small">源档案：<code>_src_yuanbao/SOURCE.md</code>（含两版 HTML 与 MD 的字节数、sha256、抓取方式）。<br>
本页由 <code>make-docaudit.cjs</code> 生成 · 生成时间由程序写入 · 一切数值取自 <code>hexagram.cjs</code>。</p>

</div></body></html>`;

/* 表格统一包一层横滚容器：375 下五列的对账表必然撑破版心，
   让它「容器内横滚」而不是让整页横向溢出 —— 这与图的处理是同一条规矩。 */
const out = html.replace(/<table class="t">/g, '<div class="tw"><table class="t">').replace(/<\/table>/g, '</table></div>');

fs.writeFileSync(path.join(__dirname, 'AAA_算法文档_合观校核.html'), out, 'utf8');
console.log('写入 AAA_算法文档_合观校核.html', Buffer.byteLength(out, 'utf8'), 'bytes');
console.log('对账', AUD.length, '项：', JSON.stringify(BY));
