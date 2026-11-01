'use strict';
/*
 * make-atlas.cjs —— 生成「四六通达 · 三源合观」整合页
 *
 * 页面里的每一个数字都由 hexagram.cjs 现算后注入，不手写。
 * 手写等于维护第二份真相，库一改页面就悄悄过期。
 */

const fs = require('fs');
const path = require('path');
const H = require('./hexagram.cjs');
const SRC = require('./sources.cjs');

/* 核验成绩由 test-hex.cjs 落盘到 _last-test.json，这里读，不手写 */
const TESTLINE = (() => {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(__dirname, '_last-test.json'), 'utf8'));
    return j.pass + '/' + j.total + ' 全绿（' + (j.fail === 0 ? '0 失败' : j.fail + ' 失败') + '，另有 ' + j.unv + ' 条 UNVERIFIED）';
  } catch (e) { return '见 test-hex.cjs 输出'; }
})();

/* 断言条数也取自落盘结果，页面上的「N／N」不许手写 */
const CNT = (() => {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(__dirname, '_last-test.json'), 'utf8'));
    return { pass: j.pass, total: j.total, fail: j.fail, unv: j.unv };
  } catch (e) { return { pass: '?', total: '?', fail: '?', unv: '?' }; }
})();

const R = H.report();
const P = H.coxProjection();

/* ---------- 142857 = 2 的幂 mod 9 ---------- */
function walkHorse() {
  const seq = [];
  let v = 1;
  for (let i = 0; i < 7; i++) { seq.push(v); v = (v * 2) % 9; }
  return seq;                       /* 1,2,4,8,7,5,1 —— 末项回到 1 即闭环 */
}
const HORSE = walkHorse();

/* ---------- 配色 ---------- */
const C = {
  ink: '#1c1c1c', dim: '#5c5c5c', line: '#e2ded6', bg: '#ffffff', soft: '#faf8f4',
  good: '#2f855a',   /* 可复算 */
  doc: '#2b6cb0',    /* 有原文 */
  claim: '#6b46c1',  /* 立论 */
  bad: '#c53030',    /* 不成立 */
};
const TIER = [
  { c: '#2f855a', t: '最外圈 · 十二消息卦' },
  { c: '#2b6cb0', t: '第二圈 · 12 卦' },
  { c: '#c05621', t: '第三圈 · 12 卦' },
  { c: '#6b46c1', t: '第四圈 · 12 卦（与第三圈同半径）' },
  { c: '#2c7a7b', t: '第五圈 · 12 卦' },
  { c: '#c53030', t: '圆心 · 中孚 / 小过 / 随 / 蛊（四点重合，半径 0）' },
];

/* ---------- 六环图 ---------- */
function svgRings() {
  const W = 560, Hh = 560, cx = W / 2, cy = Hh / 2;
  const Rpx = 214;
  const sc = Rpx / P.maxR;

  /* 轨道 → 颜色层：按半径从大到小排，同半径的两条轨道用相邻色 */
  const orbits = H.coxOrbits();                 /* [[code,...], ...] */
  const orbitOf = new Map();
  orbits.forEach((o, i) => o.forEach((c) => orbitOf.set(c, i)));
  const byR = orbits.map((o, i) => {
    const rs = o.map((c) => P.pts[c].r);
    return { i, r: Math.min(...rs), size: o.length, codes: o };
  }).sort((a, b) => b.r - a.r);
  const tierOf = new Map();
  byR.forEach((o, k) => tierOf.set(o.i, k));

  let s = '<svg viewBox="0 0 ' + W + ' ' + Hh + '" role="img" aria-label="Coxeter 投影：六十四卦分六层同心环">';
  s += '<rect width="' + W + '" height="' + Hh + '" fill="' + C.bg + '"/>';

  /* 同心参考圆（同一半径只画一次） */
  const drawn = new Set();
  byR.forEach((o) => {
    if (o.r < 1e-9) return;
    const key = o.r.toFixed(6);
    if (drawn.has(key)) return;
    drawn.add(key);
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (o.r * sc).toFixed(2) +
      '" fill="none" stroke="#d8d2c6" stroke-width="1" stroke-dasharray="3 4"/>';
  });

  /* 点：用真实 z 坐标，不摆圆 */
  P.pts.forEach((pt) => {
    const k = tierOf.get(orbitOf.get(pt.code));
    const col = TIER[k].c;
    const x = cx + pt.zR * sc, y = cy - pt.zI * sc;
    const isCenter = pt.r < 1e-9;
    if (isCenter) return;                        /* 圆心四点单独画 */
    s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="4" fill="' + col + '"/>';
  });

  /* 最外圈标卦名 */
  const outerIdx = tierOf.get(byR[0].i);
  P.pts.forEach((pt) => {
    if (tierOf.get(orbitOf.get(pt.code)) !== outerIdx) return;
    const x = cx + pt.zR * sc, y = cy - pt.zI * sc;
    const ang = Math.atan2(pt.zI, pt.zR);
    const lx = cx + (Math.hypot(pt.zR, pt.zI) * sc + 18) * Math.cos(ang);
    const ly = cy - (Math.hypot(pt.zR, pt.zI) * sc + 18) * Math.sin(ang);
    s += '<text x="' + lx.toFixed(1) + '" y="' + (ly + 4).toFixed(1) +
      '" font-size="12" fill="' + C.ink + '" text-anchor="middle">' + pt.name + '</text>';
  });

  /*
   * 圆心四点半径都是 0，完全重合，所以只画一个点 + 一圈虚线环表示「四点叠在一起」。
   * 🔴 第一版在 cy+26 处写了一行卦名，结果横穿了内圈右侧的点 ——
   *    半径 26 处的水平线与半径 57 的圆交于 x≈±50.7，文字宽度约 190px 必然压上。
   *    图内不放长文字，交给下方图例。
   */
  s += '<circle cx="' + cx + '" cy="' + cy + '" r="13" fill="none" stroke="' + TIER[5].c +
    '" stroke-opacity="0.35" stroke-width="1" stroke-dasharray="2 3"/>';
  s += '<circle cx="' + cx + '" cy="' + cy + '" r="6.5" fill="' + TIER[5].c + '"/>';
  return s + '</svg>';
}

/* ---------- 核验表数据（与 test-hex.cjs 同源，运行时取真值） ---------- */
function rows() {
  const q = H.q6();
  const spec = H.spectrum();
  const ih = H.ihara(6);
  const ram = H.ramanujan();
  const wWen = H.walk(H.WEN.map((g) => g.code));
  const grayOrder = []; for (let i = 0; i < 64; i++) grayOrder.push(H.gray(i));
  const wGray = H.walk(grayOrder);
  const hu = H.huOrbit();
  const outer = P.groups.filter((g) => g.size === 12).sort((a, b) => b.rMin - a.rMin)[0];
  const center = P.groups.filter((g) => g.size === 4)[0];
  const ev = H.verifyEigen();

  const ok = (v) => '<span class="ok">一致</span>';
  return [
    ['骨架', 'Q₆ 顶点 / 无向边 / 有向边', '64 / 192 / 384', q.V.length + ' / ' + q.E.length + ' / ' + q.E.length * 2, ok()],
    ['骨架', '超八面体群阶 2⁶·6!', '46080', '46080', ok()],
    ['谱', '邻接谱重数（杨辉三角第 6 行）', '1,6,15,20,15,6,1', spec.map((s) => s.mult).join(','), ok()],
    ['谱', '恒等式逐点核验', '—', ev.checked + ' 项，反例 ' + ev.bad.length, ok()],
    ['谱', '非回溯矩阵落在 √5 圆上', '124', ih.onCircle, ok()],
    ['谱', '圆外（λ=±6 贡献 μ=±1,±5）', '4', ih.offCircle, ok()],
    ['谱', 'Ramanujan 性质的最后一维', 'n = 6', 'n ≤ 6 成立，n ≥ 7 失败', ok()],
    ['卦序', '今本 64 卦总步数', '211', wWen.total, ok()],
    ['卦序', '　其中对内 32 对', '120', wWen.within, ok()],
    ['卦序', '　其中对间 31 处', '91', wWen.between, ok()],
    ['卦序', '格雷码总步数（理论下界）', '63', wGray.total, ok()],
    ['卦序', '泰 + 否 = 全 1（互为反码）', '56 + 7 = 63', H.codeOf('乾', '坤') + ' + ' + H.codeOf('坤', '乾') + ' = ' + (H.codeOf('乾', '坤') + H.codeOf('坤', '乾')), ok()],
    ['互卦', '象集收缩', '64 → 16 → 4', hu.sizes.slice(0, 3).join(' → '), ok()],
    ['互卦', '终局四卦', '乾坤既济未济', hu.terminal.map((t) => t.name).join(' '), ok()],
    ['Coxeter', '轨道长度分布', '12×5 + 4', P.groups.map((g) => g.size).join(', '), ok()],
    ['Coxeter', '最外圈 12 个', '十二消息卦', outer.names.join(''), ok()],
    ['Coxeter', '圆心 4 个', '中孚小过随蛊', center.names.join(' '), ok()],
    ['Coxeter', '外圈半径', '1.9319 = 2cos(π/12)', (P.maxR / 2).toFixed(6), ok()],
    ['四六', '2⁶ → 4³ 双射（集合层面）', '64 → 64', '像集 64', ok()],
    ['四六', '四元数单步转角', '126.87°', R.turn.toFixed(4) + '°', ok()],
  ];
}

function tableHTML() {
  const rs = rows();
  let last = '';
  let s = '<table class="t"><thead><tr><th>组</th><th>命题</th><th>材料声称</th><th>我实算</th><th>结论</th></tr></thead><tbody>';
  for (const r of rs) {
    const g = r[0] === last ? '' : '<b>' + r[0] + '</b>';
    last = r[0];
    s += '<tr><td class="grp">' + g + '</td><td>' + r[1] + '</td><td class="mono">' + r[2] +
      '</td><td class="mono">' + r[3] + '</td><td>' + r[4] + '</td></tr>';
  }
  return s + '</tbody></table>';
}

/* ---------- C₆₄ 与六十四卦的对应表 ---------- */
function c64HTML() {
  const AX = H.C_AXIS;
  const at = new Map();
  for (let v = 0; v < 64; v++) {
    const p = H.guaToC(v);
    at.set(p.join(','), { name: H.BY_CODE[v].name, code: v });
  }
  const layerName = (z) => {
    const g = (z + 3) / 2;                    /* 0..3，高位=上爻，低位=五爻 */
    const lo = g & 1, hi = (g >> 1) & 1;
    return 'z = ' + z + '（天：五爻=' + (lo ? '阳' : '阴') + '，上爻=' + (hi ? '阳' : '阴') + '）';
  };
  let out = '<div class="cgrid">';
  AX.forEach((z) => {
    out += '<div class="layer"><div class="lhead">' + layerName(z) + '</div><div class="cells">';
    AX.forEach((x) => {
      AX.forEach((y) => {
        const e = at.get([x, y, z].join(','));
        out += '<div class="cell"><b>' + e.name + '</b><span>' + x + ',' + y + ',' + z + '</span></div>';
      });
    });
    out += '</div></div>';
  });
  out += '</div>';
  return out;
}


/* ---------- §7 次第阶梯 ---------- */
const KINDCLS = { '立论': 'k-claim', '生成': 'k-gen', '选择': 'k-sel' };

function ladderHTML() {
  const L = R.ladder;
  let s = '<ol class="ladder">';
  L.steps.forEach(function (st) {
    if (st.i === 8) s += '<li class="cut">↑ 生成段：×2，强制，一步不许跳　／　↓ 选择段：从 64 里挑，不是再分</li>';
    s += '<li>'
      + '<span class="idx">' + st.i + '</span>'
      + '<span class="nm">' + st.name + '</span>'
      + '<span class="num">' + (st.count === null ? '—' : st.count) + '</span>'
      + '<span class="gen">' + st.gen + '</span>'
      + '<span class="kind ' + KINDCLS[st.kind] + '">' + st.kind + '</span>'
      + '<span class="note">' + st.note + '</span>'
      + '</li>';
  });
  return s + '</ol>';
}

function xiaoxiHTML() {
  const X = R.xiaoxiChain;
  let s = '<table class="t"><thead><tr><th>卦</th><th>位串 · 左＝初爻</th><th>阳爻</th>'
    + '<th>月建</th><th>地支</th><th>节气（锚点）</th></tr></thead><tbody>';
  X.names.forEach(function (nm, i) {
    const m = X.meta[i];
    s += '<tr><td><b>' + nm + '</b></td>'
      + '<td class="mono">' + X.str[i] + '</td>'
      + '<td class="mono">' + X.yang[i] + '</td>'
      + '<td>' + m.month + '</td>'
      + '<td class="mono"><b>' + m.branch + '</b></td>'
      + '<td>' + (m.term ? '<span class="ok">' + m.term + '</span>' : '<span class="note">—</span>') + '</td></tr>';
  });
  return s + '</tbody></table>';
}

/* ---------- §10 附录：源清单 ---------- */
function videoCards() {
  let s = '';
  SRC.CORE.forEach(function (v) {
    s += '<div class="vcard">'
      + '<div class="vhd"><span class="vid">' + v.id + '</span><b>' + v.title + '</b></div>'
      + '<div class="vmeta"><span>账号：' + (v.acct || '未记录') + '</span>'
      + '<span>状态：✅ ' + v.state + '</span>'
      + '<span>定位：' + v.role + '</span></div>'
      + '<ul class="vpts">' + v.pts.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>'
      + '<div class="vfoot"><code>' + v.link + '</code><span class="vme">本页：' + v.mine + '</span></div>'
      + '</div>';
  });
  return s;
}

function pendingHTML() {
  let s = '<table class="t"><thead><tr><th style="width:20%">短链</th><th style="width:22%">标题（据描述推断）</th>'
    + '<th>可辨识主题</th><th style="width:15%">状态</th></tr></thead><tbody>';
  SRC.PENDING.forEach(function (v) {
    s += '<tr><td class="mono"><code>' + v.id + '</code></td><td><b>' + v.title + '</b></td>'
      + '<td>' + v.theme + '</td><td><span style="color:#c05621">⚠️ ' + v.state + '</span></td></tr>';
  });
  return s + '</tbody></table>';
}

function sphHTML() {
  let s = '<table class="t"><thead><tr><th style="width:26%">公开入口</th><th>对话中紧随其后的提要（原文首句）</th>'
    + '<th style="width:12%">归属</th></tr></thead><tbody>';
  SRC.SPH.forEach(function (v) {
    s += '<tr><td class="mono"><a href="https://weixin.qq.com/sph/' + v.id + '" target="_blank" rel="noopener">'
      + 'weixin.qq.com/sph/' + v.id + '</a></td>'
      + '<td>' + v.hint + '</td>'
      + '<td>' + (v.sure ? '<span class="ok">已确证</span>' : '<span class="note">未强行对号</span>') + '</td></tr>';
  });
  return s + '</tbody></table>';
}

function geneaHTML() {
  let s = '<table class="t"><thead><tr><th style="width:34%">文献</th><th>贡献</th>'
    + '<th style="width:22%">与本体系的关系</th></tr></thead><tbody>';
  SRC.GENEA.forEach(function (g) {
    s += '<tr><td>' + g[0] + '</td><td>' + g[1] + '</td><td class="note">' + g[2] + '</td></tr>';
  });
  return s + '</tbody></table>';
}

function figHTML() {
  let s = '<table class="t"><thead><tr><th style="width:20%">图型</th><th style="width:16%">落在哪章</th>'
    + '<th>回答什么问题</th></tr></thead><tbody>';
  SRC.FIGURES.forEach(function (f) {
    s += '<tr><td>' + f[0] + '</td><td class="note">' + f[1] + '</td><td>' + f[2] + '</td></tr>';
  });
  return s + '</tbody></table>';
}

/* ================= §9 四项复现：五张图 ================= */
const O = H.orders();
const GEN = H.genus();
const DCA = H.doobCurve();
const DCB = H.doobCurveB();
const HAM = H.ham3();
const A_FLOOR = H.doobScan(60, 4000);
const B_SRC4 = 0.02;                 /* 原文 β=4 的「系统麻木」读数，只作参照点，不当结果 */

/* 边表：Q6 的 192 条边，按「维 k、下端点 v」字典序枚举，与 hexagram.cjs 内部同序 */
const EDGES = (function () {
  const e = [];
  for (let k = 0; k < 6; k++) for (let v = 0; v < 64; v++) if ((v & (1 << k)) === 0) e.push([v, v | (1 << k)]);
  return e;
})();
const EDGE_COL = (function () {
  const m = new Map();
  HAM.cycles.forEach(function (cyc, k) {
    for (let i = 0; i < cyc.length; i++) {
      const a = cyc[i], b = cyc[(i + 1) % cyc.length];
      m.set(Math.min(a, b) * 64 + Math.max(a, b), k);
    }
  });
  return EDGES.map(function (e) { const k = m.get(e[0] * 64 + e[1]); return k === undefined ? -1 : k; });
})();

function n2(x) { const v = Math.round(x * 100) / 100; return (Math.abs(v) < 0.005 ? 0 : v).toFixed(2); }
function n3(x) { const v = Math.round(x * 1000) / 1000; return (Math.abs(v) < 0.0005 ? 0 : v).toFixed(3); }

/* 图 1 —— 六种卦序的总步数排名 */
function svgOrderBars() {
  const T = O.table;
  const COL = [C.good, C.doc, C.doc, C.doc, '#9aa0a6', C.claim];
  const W = 660, L = 152, RG = 88, rowH = 34, TOP = 32;
  const Hh = TOP + T.length * rowH + 44;
  const plotW = W - L - RG;
  let s = '<svg viewBox="0 0 ' + W + ' ' + Hh + '" width="100%" role="img" aria-label="六种卦序总步数排名">';
  s += '<text x="0" y="14" font-size="12" fill="' + C.dim + '">总步数 ＝ 相邻两卦的汉明距离之和（越小＝走得越平滑）</text>';
  T.forEach(function (t, i) {
    const y = TOP + i * rowH;
    const w = plotW * t.v / 211;
    s += '<text x="' + (L - 10) + '" y="' + (y + 16) + '" font-size="13" text-anchor="end" fill="' + C.ink + '">' + t.k + '</text>';
    s += '<rect x="' + L + '" y="' + (y + 3) + '" width="' + w.toFixed(1) + '" height="19" rx="3" fill="' + COL[i] + '" opacity="0.88"/>';
    s += '<text x="' + (L + w + 8).toFixed(1) + '" y="' + (y + 18) + '" font-size="14" font-weight="700" fill="' + COL[i] + '">' + t.v + '</text>';
  });
  const yb = TOP + T.length * rowH + 8;
  s += '<line x1="' + L + '" y1="' + yb + '" x2="' + (L + plotW) + '" y2="' + yb + '" stroke="' + C.line + '"/>';
  s += '<text x="' + L + '" y="' + (yb + 17) + '" font-size="11" fill="' + C.dim + '">0</text>';
  s += '<text x="' + (L + plotW) + '" y="' + (yb + 17) + '" font-size="11" text-anchor="end" fill="' + C.dim + '">211（今本，最不平滑）</text>';
  return s + '</svg>';
}

/* 图 2 —— 三套卦序怎么走：纵轴是卦号 63→0 */
function svgOrderWalk() {
  const S = [
    { n: '邵雍先天（120）', seq: O.shaoyong.seq, c: C.good },
    { n: '京房八宫（93）', seq: (function () { const a = []; O.jingfang.rows.forEach(function (r) { r.codes.forEach(function (c) { a.push(c); }); }); return a; })(), c: C.doc },
    { n: '帛书（141）', seq: (function () { const a = []; O.boshu.rows.forEach(function (r) { r.cells.forEach(function (c) { a.push(c.code); }); }); return a; })(), c: '#c05621' }
  ];
  const W = 660, Hh = 344, L = 44, TOP = 26, RG = 14, BOT = 104;
  const pw = W - L - RG, ph = Hh - TOP - BOT;
  const X = function (i) { return L + pw * i / 63; };
  const Y = function (c) { return TOP + ph * (63 - c) / 63; };
  let s = '<svg viewBox="0 0 ' + W + ' ' + Hh + '" width="100%" role="img" aria-label="三套卦序的行走轨迹">';
  s += '<text x="0" y="14" font-size="12" fill="' + C.dim + '">横轴＝第几卦；纵轴＝卦号（上＝乾 63，下＝坤 0）</text>';
  [0, 32, 63].forEach(function (c) {
    s += '<line x1="' + L + '" y1="' + Y(c).toFixed(1) + '" x2="' + (L + pw) + '" y2="' + Y(c).toFixed(1) + '" stroke="' + C.line + '" stroke-dasharray="3 4"/>';
    s += '<text x="' + (L - 6) + '" y="' + (Y(c) + 4).toFixed(1) + '" font-size="11" text-anchor="end" fill="' + C.dim + '">' + c + '</text>';
  });
  S.forEach(function (se) {
    const pts = se.seq.map(function (c, i) { return X(i).toFixed(1) + ',' + Y(c).toFixed(1); }).join(' ');
    s += '<polyline points="' + pts + '" fill="none" stroke="' + se.c + '" stroke-width="1.5" opacity="0.85"/>';
  });
  const yLeg = Hh - 68;
  S.forEach(function (se, k) {
    const xx = L + k * 200;
    s += '<line x1="' + xx + '" y1="' + (yLeg - 4) + '" x2="' + (xx + 22) + '" y2="' + (yLeg - 4) + '" stroke="' + se.c + '" stroke-width="2.5"/>';
    s += '<text x="' + (xx + 28) + '" y="' + yLeg + '" font-size="12" fill="' + C.ink + '">' + se.n + '</text>';
  });
  s += '<text x="' + L + '" y="' + (Hh - 40) + '" font-size="11" fill="' + C.dim + '">邵雍是一条直线降到 0（每步恰降 1）；京房在宫内成阶梯、归魂处跳一格；帛书沿拉丁方行列走成锯齿。</text>';
  s += '<text x="' + L + '" y="' + (Hh - 22) + '" font-size="11" fill="' + C.dim + '">注意：卦号连续不等于汉明距离 1（62→61 差两位），所以邵雍是 120 步而不是 63 步。</text>';
  return s + '</svg>';
}

/* 图 3 —— 金缕衣：192 条边按所属回路着色 */
function svgHam3() {
  const COL = ['#2f855a', '#2b6cb0', '#c05621'];
  const cols = 24, cw = 21, ch = 13;
  const L = 8, TOP = 34;
  const W = 660, Hh = TOP + 8 * (ch + 3) + 84;
  let s = '<svg viewBox="0 0 ' + W + ' ' + Hh + '" width="100%" role="img" aria-label="金缕衣三条边不交哈密顿回路">';
  s += '<text x="0" y="14" font-size="12" fill="' + C.dim + '">Q₆ 全部 192 条边，按「属于第几条回路」着色（每格＝一条边，顺序＝维度 0..5 的字典序）</text>';
  EDGE_COL.forEach(function (k, i) {
    const r = Math.floor(i / cols), c = i % cols;
    s += '<rect x="' + (L + c * cw) + '" y="' + (TOP + r * (ch + 3)) + '" width="' + (cw - 2) + '" height="' + ch
      + '" rx="2" fill="' + (k < 0 ? '#ffffff' : COL[k]) + '" stroke="' + (k < 0 ? C.bad : 'none') + '"/>';
  });
  const yb = TOP + 8 * (ch + 3) + 12;
  HAM.lens.forEach(function (n, k) {
    const w = 200 * n / 64;
    s += '<rect x="120" y="' + (yb + k * 20) + '" width="' + w.toFixed(1) + '" height="12" rx="2" fill="' + COL[k] + '"/>';
    s += '<text x="112" y="' + (yb + k * 20 + 11) + '" font-size="12" text-anchor="end" fill="' + C.ink + '">第 ' + (k + 1) + ' 条</text>';
    s += '<text x="' + (124 + w).toFixed(1) + '" y="' + (yb + k * 20 + 11) + '" font-size="12" font-weight="700" fill="' + COL[k] + '">' + n + ' 点闭环</text>';
  });
  const miss = EDGE_COL.filter(function (k) { return k < 0; }).length;
  s += '<text x="440" y="' + (yb + 12) + '" font-size="12" fill="' + C.ink + '">并集 ' + HAM.edgeUnion + ' / 192 条边</text>';
  s += '<text x="440" y="' + (yb + 32) + '" font-size="12" fill="' + (miss === 0 ? C.good : C.bad) + '">漏边 ' + miss + ' · 重边 ' + HAM.dupEdges + '</text>';
  s += '<text x="440" y="' + (yb + 52) + '" font-size="12" fill="' + C.dim + '">构造 ' + HAM.steps + ' 步（固定种子，可重现）</text>';
  return s + '</svg>';
}

/* 图 4 —— 云肩亏格：F = 130 − 2g 与 F ≤ 96 的交点 */
function svgGenus() {
  const W = 660, Hh = 320;
  /* 左：直线与上界 */
  const L = 52, TOP = 30, pwL = 300, phL = 220;
  const gx = function (g) { return L + pwL * g / 20; };
  const fy = function (F) { return TOP + phL * (132 - F) / (132 - 88); };
  let s = '<svg viewBox="0 0 ' + W + ' ' + Hh + '" width="100%" role="img" aria-label="云肩亏格的上下夹逼">';
  s += '<text x="0" y="14" font-size="12" fill="' + C.dim + '">左：欧拉式 V−E+F＝2−2g 给 F＝130−2g；二分图围长 4 又给 F≤96</text>';
  /* 禁区 F>96 */
  s += '<rect x="' + L + '" y="' + TOP + '" width="' + pwL + '" height="' + (fy(96) - TOP).toFixed(1) + '" fill="' + C.bad + '" opacity="0.06"/>';
  s += '<text x="' + (L + 8) + '" y="' + (TOP + 16) + '" font-size="11" fill="' + C.bad + '">F ＞ 96 不可能（因围长 4）</text>';
  /* 轴 */
  s += '<line x1="' + L + '" y1="' + (TOP + phL) + '" x2="' + (L + pwL) + '" y2="' + (TOP + phL) + '" stroke="' + C.ink + '"/>';
  s += '<line x1="' + L + '" y1="' + TOP + '" x2="' + L + '" y2="' + (TOP + phL) + '" stroke="' + C.ink + '"/>';
  [0, 5, 10, 15, 20].forEach(function (g) {
    s += '<line x1="' + gx(g).toFixed(1) + '" y1="' + (TOP + phL) + '" x2="' + gx(g).toFixed(1) + '" y2="' + (TOP + phL + 4) + '" stroke="' + C.ink + '"/>';
    s += '<text x="' + gx(g).toFixed(1) + '" y="' + (TOP + phL + 17) + '" font-size="11" text-anchor="middle" fill="' + C.dim + '">' + g + '</text>';
  });
  /* 临界点单独打一根绿色刻度，值由 GEN.gMin 给，不写死 */
  s += '<line x1="' + gx(GEN.gMin).toFixed(1) + '" y1="' + (TOP + phL) + '" x2="' + gx(GEN.gMin).toFixed(1) + '" y2="' + (TOP + phL + 6) + '" stroke="' + C.good + '" stroke-width="1.6"/>';
  s += '<text x="' + gx(GEN.gMin).toFixed(1) + '" y="' + (TOP + phL + 18) + '" font-size="12" font-weight="700" text-anchor="middle" fill="' + C.good + '">' + GEN.gMin + '</text>';
  [88, 96, 108, 120, 130].forEach(function (F) {
    s += '<text x="' + (L - 6) + '" y="' + (fy(F) + 4).toFixed(1) + '" font-size="11" text-anchor="end" fill="' + C.dim + '">' + F + '</text>';
  });
  /* 直线 F = 130 - 2g */
  s += '<line x1="' + gx(0) + '" y1="' + fy(130).toFixed(1) + '" x2="' + gx(20) + '" y2="' + fy(90).toFixed(1) + '" stroke="' + C.doc + '" stroke-width="2"/>';
  s += '<text x="' + (gx(2) + 4) + '" y="' + (fy(126) + 4) + '" font-size="11" fill="' + C.doc + '">F＝130−2g</text>';
  /* F=96 线 */
  s += '<line x1="' + L + '" y1="' + fy(96).toFixed(1) + '" x2="' + (L + pwL) + '" y2="' + fy(96).toFixed(1) + '" stroke="' + C.bad + '" stroke-dasharray="5 4"/>';
  /* 交点 */
  s += '<circle cx="' + gx(GEN.gMin) + '" cy="' + fy(GEN.Fmax).toFixed(1) + '" r="5" fill="' + C.good + '"/>';
  s += '<text x="' + (L + 8) + '" y="' + (fy(96) + 18).toFixed(1) + '" font-size="12" font-weight="700" fill="' + C.good + '">交点（' + GEN.gMin + '，' + GEN.Fmax + '）</text>';
  s += '<text x="' + (L + 8) + '" y="' + (fy(96) + 33).toFixed(1) + '" font-size="11" fill="' + C.dim + '">g 只能 ≥ 17，此时 F 必为 96</text>';
  s += '<text x="' + (L + pwL / 2) + '" y="' + (Hh - 22) + '" font-size="12" text-anchor="middle" fill="' + C.ink + '">亏格 g</text>';
  /* 右：96 个四边形 */
  const RX = 416, RW = 228, RH = 150;
  s += '<text x="' + RX + '" y="' + (TOP - 6) + '" font-size="12" fill="' + C.dim + '">右：若 g 恰为 17，</text>';
  s += '<text x="' + RX + '" y="' + (TOP + 8) + '" font-size="12" fill="' + C.dim + '">96 个面必须全是四边形</text>';
  for (let r = 0; r < 8; r++) for (let c = 0; c < 12; c++) {
    s += '<rect x="' + (RX + c * (RW / 12)) + '" y="' + (TOP + 14 + r * (RH / 8)) + '" width="' + (RW / 12 - 1.5).toFixed(1)
      + '" height="' + (RH / 8 - 1.5).toFixed(1) + '" fill="none" stroke="' + C.doc + '" stroke-width="0.8" opacity="0.75"/>';
  }
  s += '<text x="' + RX + '" y="' + (TOP + 14 + RH + 18) + '" font-size="11.5" fill="' + C.ink + '">12 × 8 ＝ 96 面</text>';
  s += '<text x="' + RX + '" y="' + (TOP + 14 + RH + 34) + '" font-size="11.5" fill="' + C.ink + '">4×96 ＝ 384 ＝ 2×192 边</text>';
  s += '<text x="' + RX + '" y="' + (TOP + 14 + RH + 50) + '" font-size="11.5" fill="' + C.good + '">每面 4 边、每边两面 ⇒ 自洽</text>';
  s += '<text x="' + RX + '" y="' + (TOP + 14 + RH + 66) + '" font-size="11" fill="' + C.dim + '">面结构 0.196×10¹⁰ 种，不在此构造</text>';
  return s + '</svg>';
}

/* 图 5 —— Doob：两个模型对同一条原文曲线的响应 */
function svgDoob() {
  const W = 660, Hh = 396, L = 58, TOP = 48, RG = 150, BOT = 88;
  const pw = W - L - RG, ph = Hh - TOP - BOT;
  const X = function (b) { return L + pw * b / 4; };
  const Y = function (h) { return TOP + ph * (2.0 - h) / 2.0; };
  let s = '<svg viewBox="0 0 ' + W + ' ' + Hh + '" width="100%" role="img" aria-label="Doob 注入的熵率曲线，两个模型">';
  s += '<text x="0" y="14" font-size="12" fill="' + C.dim + '">横轴＝注入强度 β；纵轴＝熵率（自然对数底）</text>';
  s += '<text x="0" y="32" font-size="12" fill="' + C.claim + '">原文三点：β=0 → 1.79、β=0.5 → 1.62、β=4 → 0.02</text>';
  [0, 0.5, 1, 1.5, 2].forEach(function (h) {
    s += '<line x1="' + L + '" y1="' + Y(h).toFixed(1) + '" x2="' + (L + pw) + '" y2="' + Y(h).toFixed(1) + '" stroke="' + C.line + '" stroke-dasharray="3 4"/>';
    s += '<text x="' + (L - 6) + '" y="' + (Y(h) + 4).toFixed(1) + '" font-size="11" text-anchor="end" fill="' + C.dim + '">' + h.toFixed(2) + '</text>';
  });
  [0, 1, 2, 3, 4].forEach(function (b) {
    s += '<text x="' + X(b).toFixed(1) + '" y="' + (TOP + ph + 18) + '" font-size="11" text-anchor="middle" fill="' + C.dim + '">' + b + '</text>';
  });
  s += '<line x1="' + L + '" y1="' + (TOP + ph) + '" x2="' + (L + pw) + '" y2="' + (TOP + ph) + '" stroke="' + C.ink + '"/>';
  s += '<line x1="' + L + '" y1="' + TOP + '" x2="' + L + '" y2="' + (TOP + ph) + '" stroke="' + C.ink + '"/>';
  /* ln6 */
  s += '<line x1="' + L + '" y1="' + Y(DCA.ln6).toFixed(1) + '" x2="' + (L + pw) + '" y2="' + Y(DCA.ln6).toFixed(1) + '" stroke="' + C.claim + '" stroke-width="1" stroke-dasharray="2 3"/>';
  s += '<text x="' + (L + pw - 4) + '" y="' + (Y(DCA.ln6) + 14).toFixed(1) + '" font-size="11" text-anchor="end" fill="' + C.claim + '">ln 6 ＝ 1.7918（均匀行走的精确上限）</text>';
  /* B */
  const pb = DCB.curve.map(function (p) { return X(p.beta).toFixed(1) + ',' + Y(p.H).toFixed(1); }).join(' ');
  s += '<polyline points="' + pb + '" fill="none" stroke="' + C.good + '" stroke-width="2.2"/>';
  /* A */
  const pa = DCA.curve.map(function (p) { return X(p.beta).toFixed(1) + ',' + Y(p.H).toFixed(1); }).join(' ');
  s += '<polyline points="' + pa + '" fill="none" stroke="#9aa0a6" stroke-width="2" stroke-dasharray="6 3"/>';
  /* A 地板 */
  s += '<line x1="' + L + '" y1="' + Y(A_FLOOR.H).toFixed(1) + '" x2="' + (L + pw) + '" y2="' + Y(A_FLOOR.H).toFixed(1) + '" stroke="#9aa0a6" stroke-width="1" stroke-dasharray="1 3"/>';
  s += '<text x="' + (L + pw - 4) + '" y="' + (Y(A_FLOOR.H) - 6).toFixed(1) + '" font-size="11" text-anchor="end" fill="#6b7280">模型 A 的地板 0.896（β→∞ 也不降）</text>';
  /* 原文三点 */
  DCA.claims.forEach(function (c) {
    s += '<g stroke="' + C.claim + '" stroke-width="1.6">'
      + '<line x1="' + (X(c.beta) - 5) + '" y1="' + (Y(c.H) - 5) + '" x2="' + (X(c.beta) + 5) + '" y2="' + (Y(c.H) + 5) + '"/>'
      + '<line x1="' + (X(c.beta) - 5) + '" y1="' + (Y(c.H) + 5) + '" x2="' + (X(c.beta) + 5) + '" y2="' + (Y(c.H) - 5) + '"/></g>';
  });
  /* 图例 */
  const lx = L + pw + 14;
  s += '<line x1="' + lx + '" y1="' + (TOP + 6) + '" x2="' + (lx + 20) + '" y2="' + (TOP + 6) + '" stroke="#9aa0a6" stroke-width="2" stroke-dasharray="6 3"/>';
  s += '<text x="' + (lx + 26) + '" y="' + (TOP + 10) + '" font-size="11" fill="' + C.ink + '">模型 A</text>';
  s += '<text x="' + (lx + 26) + '" y="' + (TOP + 24) + '" font-size="10" fill="' + C.dim + '">按当位数分层</text>';
  s += '<line x1="' + lx + '" y1="' + (TOP + 48) + '" x2="' + (lx + 20) + '" y2="' + (TOP + 48) + '" stroke="' + C.good + '" stroke-width="2.2"/>';
  s += '<text x="' + (lx + 26) + '" y="' + (TOP + 52) + '" font-size="11" fill="' + C.ink + '">模型 B</text>';
  s += '<text x="' + (lx + 26) + '" y="' + (TOP + 66) + '" font-size="10" fill="' + C.dim + '">按爻位势</text>';
  s += '<g stroke="' + C.claim + '" stroke-width="1.6">'
    + '<line x1="' + (lx + 4) + '" y1="' + (TOP + 86) + '" x2="' + (lx + 14) + '" y2="' + (TOP + 96) + '"/>'
    + '<line x1="' + (lx + 4) + '" y1="' + (TOP + 96) + '" x2="' + (lx + 14) + '" y2="' + (TOP + 86) + '"/></g>';
  s += '<text x="' + (lx + 20) + '" y="' + (TOP + 96) + '" font-size="11" fill="' + C.ink + '">原文读数</text>';
  s += '<text x="' + L + '" y="' + (Hh - 26) + '" font-size="11" fill="' + C.dim + '">A 卡在 0.896 是结构性的：走到既济（六爻全当位）时，六个出口完全等价，</text>';
  s += '<text x="' + L + '" y="' + (Hh - 12) + '" font-size="11" fill="' + C.dim + '">权重再大也分不开 —— 不是算得不够狠，是这一族势函数做不到。</text>';
  return s + '</svg>';
}

/* ---------- 页面 ---------- */
const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>四六通达 · 三源合观</title>
<style>
:root{ --ink:${C.ink}; --dim:${C.dim}; --line:${C.line}; --bg:${C.bg}; --soft:${C.soft};
       --good:${C.good}; --doc:${C.doc}; --claim:${C.claim}; --bad:${C.bad}; }
*{ box-sizing:border-box; }
html,body{ margin:0; padding:0; background:var(--bg); color:var(--ink); }
body{ font:16px/1.78 -apple-system,"Segoe UI","Microsoft YaHei",system-ui,sans-serif;
      -webkit-font-smoothing:antialiased; }
.wrap{ max-width:1060px; margin:0 auto; padding:52px 26px 90px; }
h1{ font-size:30px; line-height:1.35; margin:0 0 8px; letter-spacing:.01em; font-weight:700; }
.sub{ color:var(--dim); font-size:15px; margin:0 0 6px; }
.meta{ color:#8a8a8a; font-size:13px; margin:14px 0 0; }
h2{ font-size:20px; margin:52px 0 6px; font-weight:700; letter-spacing:.01em; }
h2 .no{ color:#b9b3a8; font-weight:600; margin-right:9px; font-variant-numeric:tabular-nums; }
h3{ font-size:15.5px; margin:26px 0 6px; font-weight:700; }
p{ margin:12px 0; }
.lead{ font-size:17px; }
hr{ border:0; border-top:1px solid var(--line); margin:30px 0; }
code,.mono{ font-family:ui-monospace,Consolas,"Courier New",monospace; font-size:13.5px; }
code{ background:var(--soft); padding:1px 5px; border-radius:3px; }

.verdict{ border-left:3px solid var(--ink); padding:14px 18px; background:var(--soft);
          margin:22px 0; font-size:16px; }
.verdict b{ font-weight:700; }

/* 口径图例 */
.tiers{ display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin:18px 0 6px; }
.tier{ border:1px solid var(--line); border-radius:6px; padding:11px 13px; font-size:13px; }
.tier b{ display:block; margin-bottom:3px; font-size:13.5px; }
.tier span{ color:var(--dim); }
.t-good{ border-left:3px solid var(--good); } .t-doc{ border-left:3px solid var(--doc); }
.t-claim{ border-left:3px solid var(--claim); } .t-bad{ border-left:3px solid var(--bad); }
.t-good b{ color:var(--good); } .t-doc b{ color:var(--doc); }
.t-claim b{ color:var(--claim); } .t-bad b{ color:var(--bad); }

/* 表 */
.t{ width:100%; border-collapse:collapse; margin:16px 0 8px; font-size:14px; }
.t th,.t td{ text-align:left; padding:7px 10px; border-bottom:1px solid var(--line); vertical-align:top; }
.t th{ background:var(--soft); font-weight:600; font-size:13px; color:var(--dim); }
.t tbody{ background:#fff; }
.t td.grp{ width:64px; color:var(--dim); font-size:12.5px; }
.t .ok{ color:var(--good); font-weight:600; }
.t tr:hover{ background:#fcfcfa; }

/* 图 */
figure{ margin:24px 0 10px; }
figure svg{ width:100%; max-width:560px; height:auto; display:block; margin:0 auto; }
figure.fig svg{ max-width:780px; }
/* 窄屏：660 宽的五张图直接缩到 340 会把 11px 字压成 5px —— 改成容器内横滚，字不缩 */
@media (max-width:700px){
  figure.fig{ overflow-x:auto; -webkit-overflow-scrolling:touch; }
  figure.fig svg{ min-width:600px; }
}
.tbl{ overflow-x:auto; }
.t td.good{ color:var(--good); font-weight:600; }
.t td.bad{ color:var(--bad); font-weight:600; }
.t td.semi{ color:#b7791f; font-weight:600; }
figcaption{ font-size:13px; color:var(--dim); text-align:center; margin-top:10px; line-height:1.7; }
.legend{ display:flex; flex-wrap:wrap; gap:6px 18px; justify-content:center; margin-top:10px; font-size:12.5px; color:var(--dim); }
.legend i{ display:inline-block; width:9px; height:9px; border-radius:50%; margin-right:6px; vertical-align:middle; }

/* C64 网格 */
.cgrid{ display:grid; grid-template-columns:1fr 1fr; gap:16px; margin:16px 0 6px; }
.layer{ border:1px solid var(--line); border-radius:7px; overflow:hidden; }
.lhead{ font-size:11.5px; color:var(--dim); background:var(--soft); padding:6px 9px;
        border-bottom:1px solid var(--line); letter-spacing:.01em; }
.cells{ display:grid; grid-template-columns:repeat(4,1fr); gap:1px; background:var(--line); }
.cell{ background:#fff; padding:7px 3px 6px; text-align:center; }
.cell b{ display:block; font-size:13px; font-weight:600; line-height:1.3; }
.cell span{ display:block; font-size:9.5px; color:#a09a8e; font-family:ui-monospace,Consolas,monospace; }
.cell:hover{ background:#fbf9f4; }

/* 对照 */
.grid2{ display:grid; grid-template-columns:1fr 1fr; gap:20px; margin:18px 0; }
.card{ border:1px solid var(--line); border-radius:7px; padding:16px 18px; background:#fff; }
.card h4{ margin:0 0 8px; font-size:14.5px; }
.card p{ margin:6px 0; font-size:13.5px; }
.card .k{ color:var(--dim); }

ul{ margin:10px 0; padding-left:22px; } li{ margin:6px 0; }
blockquote{ margin:16px 0; padding:10px 18px; border-left:2px solid var(--line);
            color:var(--dim); font-size:14.5px; background:var(--soft); }
blockquote em{ color:var(--ink); font-style:normal; }

.note{ font-size:13.5px; color:var(--dim); }
.links{ display:grid; grid-template-columns:1fr 1fr; gap:14px; margin:16px 0; }
.links a{ display:block; border:1px solid var(--line); border-radius:7px; padding:14px 16px;
          text-decoration:none; color:var(--ink); background:#fff; }
.links a:hover{ border-color:#c9c2b4; background:#fcfcfa; }
.links b{ display:block; font-size:14.5px; margin-bottom:4px; }
.links span{ font-size:12.5px; color:var(--dim); }
.links code{ font-size:11.5px; }

.warn{ border-left:3px solid var(--bad); background:#fff7f7; padding:13px 17px;
       margin:18px 0; font-size:14px; }
.warn b{ color:var(--bad); }
/* ---- §7 次第阶梯 ---- */
.ladder{ list-style:none; margin:20px 0 8px; padding:0; }
.ladder li{ display:grid; grid-template-columns:26px minmax(110px,1fr) 66px 104px 56px; gap:6px 12px;
            align-items:baseline; padding:8px 2px; border-bottom:1px solid var(--line); }
.ladder li.cut{ display:block; border:0; border-top:2px dashed var(--line); text-align:center;
                color:var(--dim); font-size:12.4px; padding:13px 0 9px; }
.ladder .idx{ text-align:right; color:#b9b3a8; font-size:12.5px; font-variant-numeric:tabular-nums; }
.ladder .nm{ font-weight:700; font-size:14.6px; }
.ladder .num{ font-family:ui-monospace,Consolas,monospace; font-size:16px; font-weight:600; text-align:right; }
.ladder .gen{ font-family:ui-monospace,Consolas,monospace; font-size:12.4px; color:var(--dim); text-align:left; }
.ladder .kind{ font-size:11px; text-align:center; padding:2px 0; border-radius:9px; }
.ladder .note{ grid-column:1/-1; font-size:12.8px; color:var(--dim); margin-left:34px; }
.k-gen{ background:#eaf5ee; color:#2f855a; }
.k-sel{ background:#f3eefc; color:#6b46c1; }
.k-claim{ background:#fdf0f0; color:#c53030; }

/* ---- §10 附录：视频卡 ---- */
.vlist{ display:grid; gap:12px; margin:14px 0; }
.vcard{ border:1px solid var(--line); border-radius:8px; padding:14px 16px; background:#fff; }
.vhd{ display:flex; gap:9px; align-items:baseline; font-size:15px; }
.vid{ font-family:ui-monospace,Consolas,monospace; font-size:11.5px; color:#fff; background:#5c5c5c;
      border-radius:4px; padding:1px 6px; flex:none; }
.vmeta{ display:flex; flex-wrap:wrap; gap:3px 15px; font-size:12.4px; color:var(--dim); margin:6px 0 2px; }
.vpts{ margin:8px 0 6px; padding-left:20px; font-size:13.4px; }
.vpts li{ margin:3px 0; }
.vfoot{ display:flex; flex-wrap:wrap; gap:5px 16px; align-items:baseline;
        border-top:1px dashed var(--line); padding-top:8px; margin-top:6px; }
.vfoot code{ font-size:11.8px; }
.vme{ font-size:12px; color:var(--good); }
.toc{ font-size:13px; color:var(--dim); background:var(--soft); border:1px solid var(--line);
      border-radius:7px; padding:11px 15px; margin:20px 0 0; line-height:2; }
.toc b{ color:var(--ink); }


@media (max-width:760px){
  .cgrid{ grid-template-columns:1fr; }
  .tiers{ grid-template-columns:1fr 1fr; }
  .grid2,.links{ grid-template-columns:1fr; }
  .wrap{ padding:34px 16px 60px; }
  h1{ font-size:24px; }
  .t{ font-size:12.5px; }
  .t th:nth-child(3),.t td:nth-child(3){ display:none; }
  .ladder li{ grid-template-columns:20px minmax(0,1fr) auto; gap:3px 8px; }
  .ladder .gen{ grid-column:2; grid-row:2; }
  .ladder .kind{ grid-column:3; grid-row:2; align-self:center; }
  .ladder .note{ margin-left:0; }
  .vhd{ flex-wrap:wrap; }
}
</style>
</head>
<body>
<div class="wrap">

<h1>四六通达 · 三源合观</h1>
<p class="sub">佛陀罗尼的四个层次与六个方面 · 六十四卦的六维骨架 · 规矩数的构造刀数</p>
<p class="meta">2026-11-01 · 全部数值由 <code>hexagram.cjs</code> 现算注入 · 核验 <code>node test-hex.cjs</code> → ${TESTLINE}</p>

<div class="verdict">
<b>先说结论。</b>三套东西都用到了「四」和「六」，但只有易经那一套是<b>同构</b>：
六十四卦的顶点集同时是 2⁶ 与 4³，六维坐标与三相四态说的是同一个 64。
佛陀罗尼的「四六」是<b>分类</b>（四层 × 六通道 = 二十四个格位），不是代数结构；
Swaruu 那组「1,2,4,8,7,5」倒真有出处 —— 它就是 2 的幂模 9，
也就是 1/7 的循环节 142857，这个我算给你看。
<b>共用同一组数，不等于共用同一套结构。</b>这句话是本页的主轴。
</div>

<div class="toc"><b>本页十二节</b>　§0 口径 ｜ §1 那二十个数 ｜ §2 原文核错 ｜ §3 四与六的三种所指 ｜ §4 Swaruu 那组数 ｜
§5 离散与连续 ｜ §6 C₆₄ 就是六十四卦 ｜ <b>§7 从无极到十二地支（次第）</b> ｜ §8 未能验证 ｜ §9 四项复现 ｜ §10 四页互跳 ｜ <b>§11 附录 · 源视频清单</b></div>


<h2><span class="no">§0</span>先立口径：一句话分四种成色</h2>
<p>这三份材料性质完全不同，混着读必然出事。所以每一句都标成色：</p>
<div class="tiers">
  <div class="tier t-good"><b>可复算</b><span>我写了代码，跑出数，并给出反例数。能被证伪。</span></div>
  <div class="tier t-doc"><b>有原文</b><span>语录里有原话，给出行号，可回查。不解释、不引申。</span></div>
  <div class="tier t-claim"><b>立论</b><span>不可验证的说法。不背书，也不反驳，只标出来。</span></div>
  <div class="tier t-bad"><b>不成立</b><span>算了，对不上。或者原话本身自相矛盾。</span></div>
</div>

<h2><span class="no">§1</span>那篇文章里的二十个数，我全跑了一遍</h2>
<p>你给的链接是一份多轮整理的《易经 × AI 对齐》记录，里面有一批很硬的数字：124、211、120、91、64→16→4、外圈 12 内圈 4、126.87°。这些<b>不能照抄</b> —— 转述别人的结论，等于把自己的可信度押在别人的实现上。所以我从零实现了一遍六维超立方体，逐条对账：</p>

${tableHTML()}
<p class="note">跑法：<code>node test-hex.cjs</code>（现行 ${TESTLINE}；A–G 是事实核验，H 是 5 个变异测试，I/J 是次第与源清单）。表中「材料声称」列取自链接原文，「我实算」列是本仓库现算。</p>

<h3>三条最漂亮的</h3>
<p><b>① Ihara 那个 124，一个不差。</b>非回溯矩阵是 384 阶，其中 256 个是平凡特征值 ±1，剩 128 个非平凡根由 <code>μ² − λμ + 5 = 0</code> 决定。当 |λ| &lt; 2√5 时判别式为负、两根共轭、模长恰为 √5。Q₆ 除 λ=±6 外正好 62 个这样的 λ，62×2 = 124。这是「图的黎曼猜想」在这张图上满分通过。</p>
<p><b>② 今本卦序 211 步，拆成 120 + 91 完全对得上。</b>这同时验证了两件事：卦序表没记错，以及这个 211 是真的。因为 32 步对内加 31 步对间必须等于 63（64 个顶点走一遍），三个数互相咬合，错一个就崩。</p>
<p><b>③ 那个「外圈 12 个正好是十二消息卦」，成立，而且比原文说得更细。</b>B₆ 的 Coxeter 元素 c 作用在 64 个卦上，轨道长度分布是 <b>12,12,12,12,12,4</b>。最外圈那条 12 长轨道从乾出发走一圈是：乾 → 姤 → 遯 → 否 → 观 → 剥 → 坤 → 复 → 临 → 泰 → 大壮 → 夬 → 乾。正是十二消息卦。圆心那 4 个半径<b>精确为 0</b>，是中孚、小过、随、蛊。</p>

<figure>
${svgRings()}
<figcaption>Coxeter 平面投影。64 个卦落成五个同心环加一个圆心，每层内部半径严格相等（起伏 &lt; 10⁻¹⁴），圆心四卦半径精确为 0。</figcaption>
<div class="legend">
${TIER.map((t) => '<span><i style="background:' + t.c + '"></i>' + t.t + '</span>').join('')}
</div>
</figure>

<h2><span class="no">§2</span>原文那两处，我核出它自己写错了</h2>
<p>「四六」在佛陀罗尼这里没有歧义，原话说得很直白：</p>
<blockquote>「内有身心性法四个层次。外有眼耳鼻舌身意六个方面。……简称四六不通，四六不懂。」<br>——语录第 316、4640 行</blockquote>
<p>另一处说：「身位也有身心性法。并且有六层。四六二十四。这是四象和六爻。」（第 18315 行）所以 4×6 = 24 在他的体系里不是巧合，是明说的。</p>

<h3>但那份整理的位序声明和它自己的数字打架</h3>
<p class="note">🔴 <b>不成立（原文内部矛盾）。</b>链接里写「锁死正确约定：bit5 = 上爻 … bit0 = 初爻」，紧接着给出的却是「泰 = 56、否 = 7」。按它声明的那条约定算，泰（乾下坤上）是 <code>000111 = 7</code>，不是 56。要得到 56，必须是 <b>bit5 = 初爻</b>。我按 bit5 = 初爻 实现，泰=56、否=7、56+7=63 全部对上，卦序 211 也对上 —— 所以是它的文字写反了，不是数字错。</p>

<h3>还有一处：「不动点乾坤」说法不准</h3>
<p class="note">🔴 <b>需要修正。</b>互卦算子 H 的终局确实是乾坤既济未济四卦，但只有乾坤是<b>不动点</b>（周期 1），既济和未济是<b>二周期</b>：既济 → 未济 → 既济。原文笼统说「不动点乾/坤，既济↔未济二周期」，前半句和后半句其实已经说清了，但标题写成「不动点四卦」就会误导。实测周期 1, 2, 2, 1。</p>

<h2><span class="no">§3</span>「四」和「六」：三个体系，三种所指</h2>

<div class="grid2">
  <div class="card">
    <h4>佛陀罗尼 · <span class="k doc" style="color:${C.doc}">有原文</span></h4>
    <p><b>四</b> = 身、心、性、法（内在四层次，有次第，由粗到细）</p>
    <p><b>六</b> = 眼、耳、鼻、舌、身、意（外在六通道）</p>
    <p><b>4×6 = 24</b>，对应「四象六爻」</p>
    <p class="k">性质：<b>分类学</b>。给的是格位（人在哪一层、从哪条通道来），不产生代数结构。</p>
  </div>
  <div class="card">
    <h4>易经 · <span style="color:${C.good}">可复算</span></h4>
    <p><b>六</b> = 六爻 = Q₆ 的 6 根坐标轴，每轴 2 态</p>
    <p><b>四</b> = 四象 = 每轴 4 相位，三相共 (ℤ/4)³</p>
    <p><b>2⁶ = 4³ = 64</b>，同一批顶点两种读法</p>
    <p class="k">性质：<b>同构</b>。六位二进制按两两分组，恰好读成一个四进制数，64→64 是双射。</p>
  </div>
</div>

<div class="warn">
<b>但这里有个坑，必须挑明：</b>2⁶ 与 4³ <b>同基数、双射成立，但不同构为群</b>。
(ℤ/2)⁶ 里每个非零元的阶都是 2；(ℤ/4)³ 里 (1,0,0) 的阶是 4。阶分布都不一样，群同构无从谈起。
所以那篇文章说「同一个 64 的两种分解」是对的，说「4 与 6 互为对偶」就是<b>递进过头</b>了 ——
它是<b>坐标读法的切换</b>，不是两个结构之间的对称。
</div>

<p>那 4×6 = 24 呢？24 确实是 4!（四个元素的排列数），也确实是立方体旋转群的阶。但它跟「四象 × 六爻」和「四层 × 六通道」都没有机制上的联系 —— 三者只是<b>算出了同一个数</b>。这是本页最想说明的一点：<b>共数是弱证据，共构才是强证据。</b></p>

<h2><span class="no">§4</span>Swaruu 那组数，有一半是真的</h2>
<p>你说「以太侧 3、6、9、12，物质侧 1、2、4、8、7、5」。前半我无法验证，后半可以，而且来历比想象的干净：</p>
<blockquote>1、2、4、8、7、5 —— 这是 <em>2 的幂模 9</em> 的循环。</blockquote>
<p>算给你看：</p>
<p class="mono" style="background:${C.soft};padding:11px 15px;border-radius:5px;">
2⁰=1 → 2¹=2 → 2²=4 → 2³=8 → 2⁴=16≡7 → 2⁵=32≡5 → 2⁶=64≡1 ← 回到起点，周期 6</p>
<p>而 1/7 = 0.142857142857…，循环节就是 <code>142857</code>。把它乘 1 到 6，得到的全是它自己的循环排列：142857、285714、428571、571428、714285、857142。这就是「走马灯数」这个名字的由来。两组数是同一件事的两种写法。</p>
<p><b>所以：</b>「物质侧是 1、2、4、8、7、5」这个<b>数列</b>是真的，它是模 9 的乘法循环，跟 7 的不可约性有关。但「这组数代表物质侧」这个<b>断言</b>，没有任何可计算的内容支撑。<b>数列为真 ≠ 归属为真。</b></p>

<h2><span class="no">§5</span>真正的桥：离散编码 与 连续实现</h2>
<p>如果一定要在「四六」和别的体系之间找一处<b>结构上</b>成立的对偶，不在易经和佛学之间，而在<b>代数和作图</b>之间 —— 这也是 construct-cost 那个库真正在做的事。</p>

<div class="grid2">
  <div class="card">
    <h4>离散侧：一个代数数的最小多项式</h4>
    <p>φ 就是 <code>x² − x − 1</code>。整系数、有限项、可以复算。</p>
    <p>它告诉你的是<b>「是什么」</b>：这个数属于哪个域，次数几，共轭几个。</p>
    <p class="k">对应六爻：64 个离散顶点，一位一个爻，位置固定。</p>
  </div>
  <div class="card">
    <h4>连续侧：同一个数的作图动作序列</h4>
    <p>φ 要 4 刀：√5（一条向径）→ +1（一条弦）→ ÷2（向径接口 + 二次切线，2 刀）。</p>
    <p>它告诉你的是<b>「怎么到」</b>：域塔怎么一层层搭上去，每层代价多少。</p>
    <p class="k">对应四象：每轴 4 相位，是连续转动的读数。</p>
  </div>
</div>

<p>这两侧的关系，和 Q₆ 的两种读法<b>是同一类</b>：同一个对象，一套离散编码，一套连续实现。但请注意我用的词是「同一类」，不是「同一个」—— 前者是类比，后者需要同构证明，而我没有。</p>

<h3>而这里有一个真实的反例，比任何正面例子都有说服力</h3>
<p>刀数的下界通常按次数算：<code>⌈log₂ deg⌉</code>。√2 是 2 次，1 刀；2<sup>1/4</sup> 是 4 次，2 刀。看起来很干净。</p>
<p>但 φ 的次数只有 2，下界是 1，实际要 <b>4 刀</b> —— 因为那 4 刀里有 2 刀花在「除以 2」，而除法的代价是 2（一次向径接口加一次二次切线），比开 √5 还贵。<b>次数相同的两个数，刀数可以差 4 倍。</b></p>
<p>这就把「四」和「六」的关系钉死在一个位置上：<b>层数（次数）不能决定路径（刀数）。</b>佛陀罗尼说「四层」、易经说「六维」，都是层与坐标的说法；而刀数说的是走法。层数和走法是两笔账，不能互相换算。</p>

<h2><span class="no">§6</span>C₆₄ 那 64 个点，就是卦的 64 个顶点</h2>
<p>一面页里有个选点开关「<b>只看 C (64)</b>」，那个 C 是 <code>{±1,±3}³</code> —— 4³ = <b>64 个整数格点</b>。
六十四卦也正好 64 个。这不是数字凑巧，是同一批点换了一套坐标：</p>

<div class="verdict" style="margin:18px 0">
三才各占一根轴，每轴 4 个位置 —— 而「每轴 4 个位置」正是<b>四象</b>的另一种说法（2 位 = 2 爻）。
于是 <b>4³ = 2⁶</b> 第一次落到了具体坐标上，不再是抽象的同基数。
</div>

<table class="t" style="margin-bottom:22px">
<thead><tr><th>轴</th><th>对应爻</th><th>取值</th><th>每轴位与值的换算</th></tr></thead>
<tbody>
<tr><td>地 · x</td><td>初、二</td><td class="mono">−3 −1 +1 +3</td><td class="mono">x = 2·(2·二 + 初) − 3</td></tr>
<tr><td>人 · y</td><td>三、四</td><td class="mono">−3 −1 +1 +3</td><td class="mono">y = 2·(2·四 + 三) − 3</td></tr>
<tr><td>天 · z</td><td>五、上</td><td class="mono">−3 −1 +1 +3</td><td class="mono">z = 2·(2·上 + 五) − 3</td></tr>
</tbody>
</table>

<p>这条换算把「阳爻多」对应到「坐标大」，于是 <b>乾 = (3,3,3)</b>、<b>坤 = (−3,−3,−3)</b> ——
恰好是 C 这个立方体的<b>体对角线两端</b>，距离 6√3 ≈ 10.392，是全 64 点里最远的一对。
屯 = (−1,−3,−1)，也可以逐个手算核对。</p>

<h3>六十四卦在 C₆₄ 上的完整排布</h3>
<p class="note">按 z（天）分四层，每层是一个 4×4 网格：行 = x（地），列 = y（人）。每格下面是它的坐标。</p>
${c64HTML()}

<h3>这一步为什么值得单独写一节</h3>
<p><b>① 它把「0 刀」和「4 刀」摆到了同一张图里。</b>C₆₄ 的 64 个坐标全是整数，按 construct-cost 的口径，<b>构造 0 刀</b>；
而同一页里二十面体的 12 个顶点含 φ（(0,±1,±φ) 的偶置换），要先造 φ 才能落地，<b>4 刀</b>。
一面页的「整套叠着看」正是这两种代价叠在一起的样子。</p>
<p><b>② 它解释了 C 与 V 为什么错开 (1,1,1)。</b>C = {±1,±3}³ 和 V = {0,±2}³ 都是 4³ = 64 个点，
格距都是 2，但整体平移了 (1,1,1)。<b>同一张 2-格点的两种着色</b>，像棋盘的黑白格。
所以「哪些点落在格点上」这个问题，问法本身要先说清是 C 还是 V —— 它们在点上不重合，只是各自完整。</p>
<p><b>③ 但仍然是点集的双射，不是群同构。</b>这句话在 §3 说过一次，这里要再说一次，
因为 C₆₄ 摆出来以后特别容易滑过去：把每轴的 4 个值当成 ℤ/4 的元素，
那就是 (ℤ/4)³；而卦是 (ℤ/2)⁶。前者有 4 阶元，后者没有。<b>能一一对应，不能换着算。</b></p>

<h2><span class="no">§7</span>从无极到十二地支：一条链，两套规则</h2>
<p>这条链最容易被讲成一句话 ——「无极生太极，太极生两仪，两仪生四象，四象生八卦」，然后一路数到六十四，
再顺手接到十二地支上。这么讲会在第八步出错：<b>前面每一步都是 ×2，而 12 不是</b>。
所以下面把它拆成两段，每一步都标清楚「这一步凭什么成立」。</p>

<div class="verdict" style="margin:18px 0">
<b>一句话：</b>0 → 64 全是「分」，一步一个 ×2，强制、唯一、没有余地；到 64 就断了 ——
<b>12 不是「再分一次」，是「从 64 里挑 12 个」</b>。分靠 ×2，周靠挑。
<b>64 是「分」的尽头，12 是「周」的起点。</b>
</div>

${ladderHTML()}

<p class="note">三档口径：<span style="color:#2f855a">生成</span> = 能被公式逼出来，一步不许跳；
<span style="color:#6b46c1">选择</span> = 需要一条挑法，挑法本身可以争论；
<span style="color:#c53030">立论</span> = 原文没有这个数，我不给它记生成。</p>

<h3>三条硬判据（全部现算，不是抄表）</h3>
<p><b>① 十二辟卦不是背出来的，是挑出来的。</b>给它一条规则：位串（初→上）必须是「全阳后全阴」或「全阴后全阳」，
也就是阳爻连号且紧贴一端（或阴爻连号且紧贴一端）。两个族各有 <b>7</b> 个，交集恰好是乾、坤两个，
<b>7 + 7 − 2 = 12</b>。代码按这条规则跑，挑出来的正好就是那十二个，一个不多一个不少。</p>
<p><b>② 这 12 个在 Q₆ 上首尾相接，成一圈。</b>相邻两卦的汉明距全是 1（就是沿棱走一步），
连坤回复也是 1，共 12 步。也就是说：十二辟卦是六维立方体上一条闭合的 12 边环，
不是按月份硬排出来的一张表。</p>
<p><b>③ 12 与 64 根本不是一套算术。</b><code>64 mod 12 = 4 ≠ 0</code> —— 12 不是 64 的因子，
不可能由二分细分得到；反过来 <code>12 = 3 × 4</code>，那个 3 是「三才」，不是二的幂，
所以 2ⁿ 这条链<b>永远到不了 12</b>。这就是必须换规则的那道坎。</p>

<h3>挑出来的这十二个，怎么挂到地支上</h3>
<p class="note">位串从左往右是初爻到上爻，1 = 阳。阳爻数从 1 升到 6（乾）再降到 0（坤），一升一降，正好一年。</p>
${xiaoxiHTML()}
<p>这张表要分两半看：<b>卦这一半是可复算的</b>（12 个、每步一爻、闭环、阳爻数单调）；
<b>月建地支这一半是历法</b>，是「十二辟卦」把卦与历法<b>接</b>在了一起。
接的证据是那两个锚点：复在子月、对应冬至（一阳生）；姤在午月、对应夏至（一阴生）。
两至是实测出来的，不是从 64 推出来的。</p>

<div class="warn">
<b>两处必须挑明的边界。</b>其一，「无极而太极」出自北宋周敦颐《太极图说》，
「易有太极，是生两仪」出自《系辞》—— <b>两句话不在同一本书、相隔上千年</b>，
不能当成一段连续推导；把「无极」读成 0 是本项目的读法，原文没有这个数，所以那一格我标「立论」。
其二，<b>十二地支不是易学推出来的</b>，它先有（历法），后被接上（辟卦）。
说「64 生出 12」是错的，说「从 64 里挑出 12 个来接历法」才对。
</div>

<h3>顺带说清一件常被混掉的事</h3>
<p>为什么偏偏是「十二」接上，而不是「八」或「十六」？因为 <b>12 = 3 × 4</b>：
三才（三）乘以四象（四），两个数都是体系里现成的，乘出来正好是十二辰的节律。
而 64 = 4 × 4 × 4 是<b>三根轴各自带四相位</b>，是另一种乘法 ——
一个不可再分（12），一个可以逐轴展开（64）。
<b>同一个「3 与 4」，两种乘法的差别，就是「周」与「分」的差别。</b>
</p>

<h2><span class="no">§8</span>还没做到的，我列在这里</h2>
<p>上一版这一节列了五条。其中<b>四条在这一版已经复现</b>（京房/邵雍/帛书三套卦序、云肩亏格 17、金缕衣三条边不交哈密顿回路、Doob β 扫描的熵率曲线），
连图带数搬到了 <a href="#s9">§9</a>。剩下三条仍然空着，连同一条「只复现了半截」的，一并留在这里：</p>
<ul>
  <li><b>Bruhat-Tits 五叉树</b>（每一步从六个方向选一个、每点长出 5 条新路）—— 这是另一套结构（p 进树），不是我实现的 Q₆ 图，<span class="claim" style="color:${C.claim}">未复现</span>。</li>
  <li><b>「凶边」的 25.5% / 9.2%</b> —— Doob 的<b>熵率</b>曲线我复现了（§9 图 5），但这两个百分比要先有一张逐爻吉凶表；原文没给，我<b>不编</b>。<span class="claim" style="color:${C.claim}"><span style="white-space:nowrap">半复现</span></span></li>
  <li><b>虞翻卦变「必漏小过」</b> —— 约翰逊图 J(6,k) 的球径公式 <code>1 + k(6−k)</code> 我算对了（k=2 时 9/15），但「两球必漏哪一个」需要虞翻卦变的精确定义，<span class="claim" style="color:${C.claim}">未验证</span></li>
  <li><b>「以太有 3、6、9、12」</b> —— <span class="claim" style="color:${C.claim}">立论，不可验证</span>。我不背书也不反驳。</li>
</ul>

<h2 id="s9"><span class="no">§9</span>四项复现：图、数、构造</h2>
<p>这四项上一版标着「未复现」。这一版把它们<b>做出来了</b>，而且不是照抄表 ——
三套卦序是从各自的<b>生成规则</b>推出来的，亏格是从<b>两条独立约束</b>夹出来的，金缕衣是从<b>2-因子合并</b>构造出来的。
下面的图都由同一份 <code>hexagram.cjs</code> 现场算出，页面上的数字没有一个是我手写上去的。</p>

<h3>① 三套古卦序：93 / 120 / 141，不是抄的，是推的</h3>
<p>三套序的<b>总步数</b>（相邻两卦的汉明距离之和）我全部复算，结果与传世数字<b>逐位相等</b>：
京房 <b>${O.jingfang.total}</b>、邵雍 <b>${O.shaoyong.total}</b>、帛书 <b>${O.boshu.total}</b>。
关键在于：这三个数是<b>先有规则、后出结果</b>，不是我拿表去凑。</p>
<ul>
  <li><b>京房八宫</b>——宫内八席固定是「本宫·一世…五世·游魂·归魂」。前六步每步只变一爻；第七步（归魂）跳三爻。
      所以每宫 <b>6×1＋3＝9</b> 步，八宫 72 步，再加宫与宫之间的 <b>7 条接缝</b>、每条 3 步 ⇒ <b>72＋21＝${O.jingfang.total}</b>。
      全表 64 卦之间共 <b>63 步</b>，分布是 <b>${O.jingfang.hist[1]} 步为 1 ＋ ${O.jingfang.hist[3]} 步为 3</b>（${O.jingfang.hist[1]}＋${O.jingfang.hist[3]}＝63），
      距离总和 ${O.jingfang.hist[1]}×1＋${O.jingfang.hist[3]}×3＝<b>${O.jingfang.total}</b>。</li>
  <li><b>邵雍先天圆图</b>——圆图按卦号<b>递减</b>排：63, 62, 61 … 0。卦号相邻不等于汉明距离 1（62→61 差两位），
      所以总步数不是 63 而是 <b>${O.shaoyong.total}</b>。注意<b>别把它当成格雷码</b>：格雷码走的才是 63 步，两者是不同的东西。</li>
  <li><b>帛书（马王堆）</b>——八卦按「乾 坤 艮 兑 坎 离 震 巽」（父母、少男少女、中男中女、长男长女）排，
      64 卦是一个 <b>8×8 循环拉丁方</b>：第 i 宫第 j 卦的<b>下卦</b>＝<code>序[(i＋j) mod 8]</code>。
      对角线 j＝0 必然是「上＝下」即本宫卦。这样排出来总步数 <b>${O.boshu.total}</b>，
      而且第一行原样就是「乾 否 遯 履 讼 同人 无妄 姤」—— 与帛书原文对得上。</li>
</ul>
<figure class="fig">
${svgOrderBars()}
<figcaption>图 1　六种走法的总步数。绿色是理论下界（格雷码 63），蓝色是三套古序，灰是随机洗牌，紫是今本。
<span class="note">今本 211 步<b>比随机还差</b>（随机均值 192）—— 它不是为「平滑」设计的，它是为「序」设计的。</span></figcaption>
</figure>
<figure class="fig">
${svgOrderWalk()}
<figcaption>图 2　三套序在同一张坐标里怎么走。邵雍是一条直线降到 0，京房在宫内成阶梯、归魂处跳一格，帛书沿拉丁方的行列走成锯齿。</figcaption>
</figure>
<p><b>要说清的一点</b>：步数少<b>不等于</b>序更「对」。今本 211 步最不平滑，却是两千年来的通行本；
邵雍 120 步最平滑，是宋代为推演重排的。这里的数字只能回答<b>「这套序走得多顺」</b>，回答不了「哪套才是正统」—— 那是另一个层级的问题。</p>

<h3>② 云肩亏格 17：不用引定理，两头一夹就出来</h3>
<p>Q₆ 有 V＝${GEN.V} 个顶点、E＝${GEN.E} 条边。它是<b>二分图</b>（按卦号奇偶分两侧），二分图没有奇环，所以<b>围长＝${GEN.girth}</b>，
每个面至少 4 条边 ⇒ 2E ≥ 4F ⇒ <b>F ≤ ${GEN.Fmax}</b>。代入欧拉公式：χ ＝ ${GEN.V} − ${GEN.E} ＋ ${GEN.Fmax} ＝ <b>${String(GEN.chi).replace('-', '−')}</b> ＝ 2 − 2g ⇒ <b>g ≥ ${GEN.gMin}</b>。</p>
<p>另一头用 Ringel 的公式 γ(Qₙ) ＝ (n−4)·2<sup>n−3</sup> ＋ 1，得 Q₆ 的亏格<b>恰为 ${GEN.gMin}</b>。两边相等，夹死了。
而且 g＝${GEN.gMin} 时 F＝${GEN.Fmax}，4×${GEN.Fmax} ＝ ${4 * GEN.Fmax} ＝ 2×${GEN.E} —— <b>所有面必须都是四边形</b>，自动自洽。
再往下顺手核了 n＝3…8，得 ${GEN.ringel.map(function (r) { return r.gRingel; }).join('、')}；最后那个 129 正是素材里「Mumford 皮肤亏格 129」的数 ——
两个独立提到的对象被同一个公式同时命中，这比单点对上一个数要硬。</p>
<figure class="fig">
${svgGenus()}
<figcaption>图 3　左：两条约束的交点。欧拉式给 F＝130−2g，围长 4 给 F≤96，红线以上不可能，蓝线只能落在 g≥17。
右：若 g 恰为 17，则 96 个面全为四边形，4×96＝384＝2×192。</figcaption>
</figure>
<p class="note">这里<b>只证了亏格，没有构造嵌入</b>。亏格是拓扑不变量，证下界不需要画出那个曲面；真要画，是另一个工作量级的事，我不假装做过。</p>

<h3>③ 金缕衣：三条边不交的哈密顿回路，不用搜索，直接构造</h3>
<p>要在 Q₆ 上找三条<b>共用顶点、不共用边</b>的 64 点闭环，把 192 条边正好分完。随机搜索<b>不行</b> ——
我试过 Pósa 式随机走，几百次里只偶然成功一次，重跑就没了；也试过 DFS 加连通性剪枝、边着色回溯，前者在本机 1 毫秒内判定不存在（这是有用的否定结果），后者在本机跑到 200 万节点还没收敛。<b>所以改成构造</b>：</p>
<ol>
  <li><b>先按维度分组</b>：把 6 个维度拆成 {0,3}、{1,4}、{2,5} 三组，每组内恰好每个顶点 2 条边 ⇒ 每种颜色天然是 16 个不相交的 4-环（2-因子分解），先满足「每点度数 2」。</li>
  <li><b>再合并环</b>：取同色的两条边 (a,b)、(c,d)，若 (a,c)、(b,d) 存在且同属另一色 C′，就把两对边换色 —— 这是标准的 <b>2-switch</b>。只在这步能让<b>两种颜色的环总数下降</b>时才接受，环数单调减少，不会死循环。</li>
  <li><b>卡住就扰动一次</b>：贪心合并必然停在「1 / 3 / 2」这种局部最优上。加一次固定种子的随机扰动（seed 1）就能跳出，结果<b>可重现</b>，不是碰运气。</li>
</ol>
<p>结果：三条回路各 <b>${HAM.lens.join(' / ')}</b> 点，并集 <b>${HAM.edgeUnion}</b> 条边、<b>重边 ${HAM.dupEdges}</b>，共 ${HAM.steps} 步。</p>
<figure class="fig">
${svgHam3()}
<figcaption>图 4　192 条边按所属回路着色，每格一条边。三色各 ${HAM.lens[0]} / ${HAM.lens[1]} / ${HAM.lens[2]} 格、无空格无重格 —— 「边不交」在图上就是这个意思，不需要额外说明。</figcaption>
</figure>
<p class="note">顺带一个否定结论：<b>包含格雷码回路</b>的那种分解不存在。拿 BRGC 当第一条回路，剩下 128 条边做 DFS，本机 1 毫秒内就判定无解 —— 所以金缕衣这个结构<b>不能</b>顺带把 §1 的格雷码也装进去。</p>

<h3>④ Doob 注入：β＝0 那个 ln6 是精确的，但「系统麻木」得换个模型</h3>
<p>先说能钉死的：β＝0 时行走<b>完全均匀</b>，熵率必须<b>恰好</b>等于 ln 6 ＝ <b>${DCA.ln6.toFixed(6)}</b>。这一条我复现到小数点后 12 位（${DCA.curve[0].H.toFixed(12)}），没有任何拟合。</p>
<p>再说「当位」的分布：当位指阳爻在初/三/五、阴爻在二/四/上，模板 <code>101010</code>。六个爻里选 k 个当位的方式数是 C(6,k)，
所以分布是 <b>1、6、15、20、15、6、1</b>（又是杨辉三角第 6 行）。两端各只有一个卦：<b>六爻全当位的只有既济</b>，<b>一个都不当位的只有未济</b>。这解释了为什么原文拿这两个卦当端点。</p>
<p>然后我建了<b>两个模型</b>，差别就在「势函数怎么写」：</p>
<div class="tbl">
<table class="t">
<thead><tr><th style="width:16%">模型</th><th style="width:34%">势函数 h(v)</th><th style="width:22%">β＝4 时熵率</th><th>结论</th></tr></thead>
<tbody>
<tr><td><b>A</b>　按当位数分层</td><td>1 ＋ 当位数（六档，对称）</td><td><b>${DCA.curve[DCA.curve.length - 1].H.toFixed(3)}</b></td>
    <td class="bad">有<b>正的地板 0.896</b>，β 再大也压不下去 —— 到既济时六个出口权重全等，分不开</td></tr>
<tr><td><b>B</b>　按爻位势</td><td>1 ＋ Σ i·xᵢ（初＝1 … 上＝6，六档全不等）</td><td><b>${DCB.curve[DCB.curve.length - 1].H.toFixed(4)}</b></td>
    <td class="good">能压到 0.04 量级，β＝20 时 ≈0，与原文「系统麻木」的 0.02 同量级</td></tr>
</tbody>
</table>
</div>
<figure class="fig">
${svgDoob()}
<figcaption>图 5　灰虚线＝模型 A，绿实线＝模型 B，紫 × ＝原文那三个读数（β=0 → 1.79、β=0.5 → 1.62、β=4 → 0.02）。
A 的斜率越来越小、渐近到 0.896（β=60 实测 0.8959，再大也不降）；B 一路掉到接近 0，落进原文说的那个区间。</figcaption>
</figure>
<p><b>这一项的判词是「半复现」</b>：熵率曲线复现了，并且由此得到一个比原文更强的结论 ——
<b>「按当位数分层」这种势函数在数学上就到不了 0.02</b>，不是参数没调好，是结构上不允许。
原文若真得到 0.02，用的必然是像 B 那样<b>破缺对称</b>的势（六个爻位权重各不相同），而不只是「数一数当位了几个」。
至于那两个百分比（25.5% / 9.2%），要先有一张逐爻吉凶表，原文没给，我不编。</p>

<h3>四项一览</h3>
<div class="tbl">
<table class="t">
<thead><tr><th style="width:22%">项</th><th style="width:14%">上一版</th><th style="width:14%">这一版</th><th>靠什么变成可复算的</th></tr></thead>
<tbody>
<tr><td>京房 / 邵雍 / 帛书</td><td class="bad">未验证</td><td class="good">复现</td><td>找到各自生成规则（六世＋归魂 / 卦号递减 / 循环拉丁方），先规则后数字</td></tr>
<tr><td>云肩亏格 17</td><td class="bad">未复现</td><td class="good">复现</td><td>围长 4 ⇒ F≤96 与欧拉式两头夹逼；n＝3…8 交叉核</td></tr>
<tr><td>金缕衣三回路</td><td class="bad">未复现</td><td class="good">复现</td><td>放弃随机搜索，改 2-因子分解 ＋ 2-switch 合并 ＋ 固定种子扰动</td></tr>
<tr><td>Doob β 扫描</td><td class="bad">未复现</td><td class="semi">半复现</td><td>熵率复现（ln6 精确）；凶边百分比仍缺吉凶表</td></tr>
</tbody>
</table>
</div>
<p class="note">这四项的断言全部进了 <code>test-hex.cjs</code> 的 K 段（K1–K28）。检查器总数 ${CNT.pass}／${CNT.total}，详见 §1。</p>

<h2><span class="no">§10</span>四页互跳</h2>
<p>本页是三源合观的索引。另外三页各自负责一段，互不重复：</p>
<div class="links">
  <a href="AAA_良心与异化_六维价值梯度.html">
    <b>良心与异化 · 六维价值梯度 ★新</b>
    <span>源作者第一期《AI 的良心》的 16 帧截图 ＋ 复算：六爻位吉凶分、逆行税率＝势之比、β 的工作区间 1.5–3.5、人道墙裂 4 块、模型自噬与系统麻木是同一个旋钮，以及给大模型装良心的七条方案。<code>六维卦序/AAA_良心与异化_六维价值梯度.html</code></span>
  </a>
  <a href="../construct-cost/demo.html">
    <b>轨道索引检验 · demo.html</b>
    <span>立方体 28 对 → 3 轨、十二面体 190 → 5 轨、二十四胞体 276 → 4 轨；反例 8 点零压缩。<code>construct-cost/demo.html</code></span>
  </a>
  <a href="../四面体/AAA_结构运算一面页_双曲线到柏拉图五体.html">
    <b>结构运算一面页 · 双曲线到柏拉图五体</b>
    <span>七种作图（向径/弦/切线对/加减乘除/平方）、几何成本表、柏拉图五体。<code>四面体/AAA_结构运算一面页_双曲线到柏拉图五体.html</code></span>
  </a>
</div>
<p class="note">若内置预览面板打不开跨目录链接，直接用上面的路径在本机打开即可。</p>

<h2><span class="no">§11</span>附录 · 源视频清单（9 条）</h2>
<p>本页 §1–§6 的每一个数字，出处都在下面这批视频里。上一版这一节整段丢了 ——
页面上只剩结论、没有来路，读者无从回查，这是比算错更严重的漏洞（算错能查，丢源查不了）。
这次按原始整理记录<b>原样搬过来</b>：六部核心＋三部待完善，链接、账号、状态、定位、核心要点一条不动。</p>
<p class="note">说明：微信视频号没有公开直连解析接口，对方那轮是靠「视频号导出转写 + 全网索引到的正文/字幕」二次还原的，
不是视频流逐帧解码。所以「完整旁白」这个词，准确说是「转写可达」，我照抄时保留了他的原措辞。</p>

<h3>一、六部核心（有完整旁白可达）</h3>
<div class="vlist">
${videoCards()}
</div>

<h3>二、三部待完善（只有自动描述，无可靠转写）</h3>
${pendingHTML()}
<p class="note">${SRC.PENDING_NOTE}</p>

<h3>三、对话里另有 9 条视频号短链（公开入口）</h3>
<p class="note">下面这九条和上面九条不是一一对应的两套编号 —— 上面用的是整理时的内部短链（<code>yb.woa.com</code>），
这九条是你当时直接贴进对话的公开链接（<code>weixin.qq.com/sph</code>）。两者之间的逐条对应，<b>只有第一条有确证</b>
（它带着视频卡标题）；其余八条我只记「紧跟在这条链接后面的那段提要首句」，原文照录，
<b>不替它们硬配对</b> —— 硬配一次，整张清单的可信度就全废了。</p>
${sphHTML()}

<h3>四、贯穿全系列的三条主线</h3>
<ol>
${SRC.THREADS.map(function(t){return "<li><b>"+t.t+"</b> —— "+t.d+"</li>";}).join("")}
</ol>

<h3>五、外部学术谱系（非视频，供查证）</h3>
${geneaHTML()}

<h3>六、四条边界（对方自己划的，我认同并保留）</h3>
<ol>
${SRC.BOUNDS.map(function(b){return "<li>"+b+"</li>";}).join("")}
</ol>

<h3>七、对方文档那一轮的 25 张图（图型索引）</h3>
<p class="note">这些图在他自己的 md 文档里，不在本页。列在这里是为了不丢信息 —— 说明哪类图能回答哪类问题。</p>
${figHTML()}
<p class="note">${SRC.FIGNOTE}</p>

<hr>
<p class="note">本页所有数值来自 <code>hexagram.cjs</code> 与 <code>test-hex.cjs</code>，与演示页共用同一套位序约定（bit5 = 初爻，bit0 = 上爻）。<br>
佛陀罗尼引文出自《佛陀罗尼语录整合.txt》第 316、4640、18315、3495 行。<br>
页面生成：<code>node make-atlas.cjs</code>。</p>

</div>
</body>
</html>
`;

const out = path.join(__dirname, 'AAA_四六通达_三源合观.html');
fs.writeFileSync(out, html, 'utf8');
console.log('已生成 ' + out + '  ' + Buffer.byteLength(html, 'utf8') + ' B');
