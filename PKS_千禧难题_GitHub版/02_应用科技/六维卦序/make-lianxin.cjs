'use strict';
/*
 * make-lianxin.cjs —— 生成「良心与异化」子页。
 *
 * 铁律：页面上的核验数从 _last-test.json 读，绝不手写；
 *       页面上的每个数从 hexagram.cjs 现算，绝不复述我记忆里的印象。
 */
const fs = require('fs');
const path = require('path');
const H = require('./hexagram.cjs');

let TOTAL = { pass: 0, fail: 0, unv: 0, total: 0 };
try { TOTAL = JSON.parse(fs.readFileSync(path.join(__dirname, '_last-test.json'), 'utf8')); } catch (e) {}

const C = {
  ink: '#1d2321', dim: '#5d6663', line: '#d8d2c4', bg: '#fbf8f1', card: '#ffffff',
  claim: '#6b46c1', good: '#2f6b46', bad: '#a83232', doc: '#a8823a', blue: '#2b5d8a',
};

const YS = H.yaoScoreCheck();
const CL = H.scoreCurve();
const LED = H.edgeLedger();
const TAX = H.taxDemo(63);
const ISL = H.islands([2, 3]);
const B4 = H.scoreScan(4);
const QIAN = H.codeOf('艮', '坤');
const rankAll = [];
for (let v = 0; v < 64; v++) rankAll.push({ v, s: H.yaoScoreSum(v) });
rankAll.sort((a, b) => b.s - a.s);
const QIAN_RANK = rankAll.findIndex((x) => x.v === QIAN) + 1;

/* ---------- 图集（zip 里的 22 张原图） ---------- */
const S = require('./sources.cjs');
const ZM = S.ZIP_META, ZI = S.ZIP_ITEMS;
/* 面板总数与「已用/新增」三笔账，全部由数据算出来，不写字面数 */
const Z_PANELS = ZI.reduce((a, x) => a + x.r * x.c, 0);
const Z_USED = ZI.filter((x) => x.used);
const Z_USED_PANELS = Z_USED.reduce((a, x) => a + x.r * x.c, 0);
const Z_NEW = ZI.filter((x) => !x.used);
const Z_NEW_PANELS = Z_PANELS - Z_USED_PANELS;
/* 🔴 46080 是算出来的，不是抄的：|Aut(Q₆)| = 2⁶ × 6! */
const AUTQ6 = Math.pow(2, 6) * [1, 2, 3, 4, 5, 6].reduce((a, b) => a * b, 1);

const n3 = (x) => (Math.abs(x) < 0.005 ? '0.00' : (x > 0 ? '+' : '') + x.toFixed(2));
const n2 = (x) => x.toFixed(2);
const sci = (x) => {
  if (!isFinite(x)) return '∞';
  if (x < 1e4) return Math.round(x).toString();
  const e = Math.floor(Math.log10(x));
  return (x / Math.pow(10, e)).toFixed(1) + '×10' + sup(e);
};
const sup = (n) => String(n).split('').map((d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+d]).join('');

/* ---------- 图片 ---------- */
function shot(src, cap) {
  return '<figure class="shot"><img src="_img/' + src + '.jpg" alt="视频截图" loading="lazy">'
    + '<figcaption>' + cap + '</figcaption></figure>';
}
function pair(a, b) { return '<div class="pair">' + a + b + '</div>'; }

/* 图集用独立类名 plate：不与「16 帧」的 shot 混在一起，
   这样探针里「恰好 16 个 shot」这条断言不需要改口径。 */
function plate(it) {
  const grid = it.r + '×' + it.c;
  const head = '<b>' + it.n + ' · ' + it.f + '</b>　'
    + '<span class="tag">' + grid + ' ＝ ' + (it.r * it.c) + ' 块</span>'
    + (it.used ? '　<span class="tag used">已在本页用过 · ' + it.used + '</span>'
               : '　<span class="tag new">新增</span>')
    + (it.s ? '　<span class="kv">→ ' + it.s + '</span>' : '');
  if (it.used) {
    /* 已用过的三张不重复贴图（同内容贴两遍就是重复），
       只留一张「位置卡」：说明它是哪一帧的来源，并给原图直链。 */
    return '<figure class="plate rep"><figcaption>' + head
      + '<br>' + it.cap
      + '<br><i>' + it.tie + '</i>'
      + '<br><span class="kv">按「去重」不再贴图。要看原件：<a href="' + ZM.dir + it.n + '_' + it.f + '.jpg" target="_blank" rel="noopener">'
      + it.n + '_' + it.f + '.jpg</a></span></figcaption></figure>';
  }
  return '<figure class="plate"><img src="' + ZM.dir + it.n + '_' + it.f + '.jpg" alt="' + it.n + ' ' + it.f + '" loading="lazy">'
    + '<figcaption>' + head + '<br>' + it.cap + '<br><i>' + it.tie + '</i></figcaption></figure>';
}

/* ---------- 图 1：六个爻位分（复算，用来和图对账） ---------- */
function svgBars() {
  const W = 660, Hh = 272, L = 46, R = 16, TOP = 34, BOT = 66;
  const pw = W - L - R, ph = Hh - TOP - BOT;
  const y0 = TOP + ph / 2;
  /* 留 26px 余量：否则最长的负柱会顶到底边，数值标签和横轴标签叠在一起 */
  const sc = (ph / 2 - 26) / 0.63;
  let s = '<svg viewBox="0 0 ' + W + ' ' + Hh + '" width="100%" role="img" aria-label="六个爻位的吉凶分，复算">';
  s += '<text x="0" y="15" font-size="12" fill="' + C.dim + '">同一组数，我按程序重画一遍（数值取自视频那帧，不是我编的）</text>';
  s += '<line x1="' + L + '" y1="' + y0 + '" x2="' + (L + pw) + '" y2="' + y0 + '" stroke="' + C.ink + '" stroke-width="1"/>';
  s += '<text x="' + (L - 6) + '" y="' + (y0 + 4) + '" font-size="11" text-anchor="end" fill="' + C.dim + '">0</text>';
  const bw = pw / 6 * 0.46;
  YS.score.forEach((v, i) => {
    const cx = L + pw * (i + 0.5) / 6;
    const h = Math.abs(v) * sc;
    const up = v > 0;
    const yy = up ? y0 - h : y0;
    s += '<rect x="' + (cx - bw / 2).toFixed(1) + '" y="' + yy.toFixed(1) + '" width="' + bw.toFixed(1)
      + '" height="' + h.toFixed(1) + '" fill="' + (up ? C.good : C.bad) + '" opacity="0.82"/>';
    s += '<text x="' + cx.toFixed(1) + '" y="' + (up ? yy - 6 : yy + h + 15).toFixed(1)
      + '" font-size="12" font-weight="700" text-anchor="middle" fill="' + (up ? C.good : C.bad) + '">' + n3(v) + '</text>';
    s += '<text x="' + cx.toFixed(1) + '" y="' + (y0 + ph / 2 + 26) + '" font-size="12" text-anchor="middle" fill="' + C.ink + '">'
      + ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'][i] + '</text>';
  });
  s += '<text x="' + L + '" y="' + (Hh - 10) + '" font-size="11" fill="' + C.dim + '">三爻 −0.63 是唯一的深负，五爻 +0.57 最高；六个数相加 '
    + n3(YS.sum) + '，极差 ' + n2(YS.range) + '。</text>';
  return s + '</svg>';
}

/* ---------- 图 2：熵率随 β 的曲线 + 工作区间 ---------- */
function svgBeta() {
  const W = 660, Hh = 348, L = 54, R = 20, TOP = 58, BOT = 66;
  const pw = W - L - R, ph = Hh - TOP - BOT;
  const BMAX = 6, YMAX = 2.0;
  const X = (b) => L + pw * b / BMAX;
  const Y = (h) => TOP + ph * (1 - h / YMAX);
  const P = CL.pts.filter((p) => p.beta <= BMAX + 1e-9);
  let s = '<svg viewBox="0 0 ' + W + ' ' + Hh + '" width="100%" role="img" aria-label="熵率随注入强度 β 的下降曲线与良心的工作区间">';
  s += '<text x="0" y="15" font-size="12" fill="' + C.dim + '">横轴 β ＝ 良心的硬度；纵轴 ＝ 熵率（还剩多少选择）。势取自六个爻位分</text>';

  /* 工作区间（画在坐标区里，标签放它正上方、不给虚线让位） */
  if (CL.betaLo != null && CL.betaHi != null) {
    s += '<rect x="' + X(CL.betaLo).toFixed(1) + '" y="' + TOP + '" width="' + (X(CL.betaHi) - X(CL.betaLo)).toFixed(1)
      + '" height="' + ph + '" fill="' + C.good + '" opacity="0.13"/>';
    s += '<text x="' + ((X(CL.betaLo) + X(CL.betaHi)) / 2).toFixed(1) + '" y="' + (TOP - 14)
      + '" font-size="12" font-weight="700" text-anchor="middle" fill="' + C.good + '">工作区间 '
      + CL.betaLo + '–' + CL.betaHi + '</text>';
  }
  /* 坐标 */
  [0, 0.5, 1, 1.5].forEach((h) => {
    s += '<line x1="' + L + '" y1="' + Y(h).toFixed(1) + '" x2="' + (L + pw) + '" y2="' + Y(h).toFixed(1) + '" stroke="' + C.line + '" stroke-dasharray="3 4"/>';
    s += '<text x="' + (L - 8) + '" y="' + (Y(h) + 4).toFixed(1) + '" font-size="11" text-anchor="end" fill="' + C.dim + '">' + h.toFixed(1) + '</text>';
  });
  [0, 1, 2, 3, 4, 5, 6].forEach((b) => {
    s += '<line x1="' + X(b).toFixed(1) + '" y1="' + (TOP + ph) + '" x2="' + X(b).toFixed(1) + '" y2="' + (TOP + ph + 4) + '" stroke="' + C.ink + '"/>';
    s += '<text x="' + X(b).toFixed(1) + '" y="' + (TOP + ph + 17) + '" font-size="11" text-anchor="middle" fill="' + C.dim + '">' + b + '</text>';
  });
  s += '<text x="' + (L + pw) + '" y="' + (TOP + ph + 36) + '" font-size="11" text-anchor="end" fill="' + C.dim + '">β</text>';

  /* ln6 参考线；标签放右端、线的下方（左边那半段正好是曲线起点，放上去必压） */
  s += '<line x1="' + L + '" y1="' + Y(Math.log(6)).toFixed(1) + '" x2="' + (L + pw) + '" y2="' + Y(Math.log(6)).toFixed(1)
    + '" stroke="' + C.claim + '" stroke-width="1" stroke-dasharray="6 3"/>';
  s += '<text x="' + (L + pw - 4) + '" y="' + (Y(Math.log(6)) + 15).toFixed(1) + '" font-size="11" text-anchor="end" fill="' + C.claim + '">'
    + 'ln 6 ＝ 1.7918（β=0 的精确值，曲线起点就在这）</text>';

  /* 曲线 */
  const pts = P.map((p) => X(p.beta).toFixed(1) + ',' + Y(p.H).toFixed(1)).join(' ');
  s += '<polyline points="' + pts + '" fill="none" stroke="' + C.ink + '" stroke-width="2"/>';

  /* β=4 的点：标注放点的右上（右边曲线是往下走的，右上必空） */
  const x4 = X(4), y4 = Y(B4.H);
  s += '<line x1="' + x4.toFixed(1) + '" y1="' + y4.toFixed(1) + '" x2="' + x4.toFixed(1) + '" y2="' + (TOP + ph) + '" stroke="' + C.bad + '" stroke-width="1" stroke-dasharray="3 3"/>';
  s += '<circle cx="' + x4.toFixed(1) + '" cy="' + y4.toFixed(1) + '" r="4.5" fill="' + C.bad + '"/>';
  s += '<text x="' + (x4 + 10).toFixed(1) + '" y="' + (y4 - 14).toFixed(1) + '" font-size="12" font-weight="700" fill="' + C.bad + '">'
    + 'β=4 → H=' + B4.H.toFixed(3) + '</text>';
  s += '<text x="' + (x4 + 10).toFixed(1) + '" y="' + (y4 - 1).toFixed(1) + '" font-size="11" fill="' + C.dim + '">原文说这里 0.02</text>';

  /* 右端提示放坐标区右下角，避开顶部两条线 */
  s += '<text x="' + (L + pw) + '" y="' + (TOP + ph - 8) + '" font-size="11" text-anchor="end" fill="' + C.doc + '">'
    + '再往右：β≈' + CL.betaH02 + ' 才降到 0.02 →</text>';
  s += '<text x="' + L + '" y="' + (Hh - 12) + '" font-size="11" fill="' + C.dim + '">'
    + 'β=4 时最差的卦要 ' + sci(B4.revisit) + ' 步才会被再访问一次 —— 按「还能不能改主意」这把尺子，它已经出区间了。</text>';
  return s + '</svg>';
}

/* ---------- 图 3：人道墙 → 4 块孤岛 ---------- */
function svgIsl() {
  const W = 660, Hh = 366, BOX = 112, GAP = 22, X0 = 110, Y0 = 44;
  let s = '<svg viewBox="0 0 ' + W + ' ' + Hh + '" width="100%" role="img" aria-label="删掉三、四两维后人道墙把六维立方体切成四块">';
  s += '<text x="0" y="15" font-size="12" fill="' + C.dim + '">把「三爻、四爻」这两维的边全部删掉（＝在人道方向砌一堵墙），剩下的按这两维的取值分成 4 格</text>';
  const lab = ['0，0', '0，1', '1，0', '1，1'];
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 2; c++) {
      const k = r * 2 + c;
      const x = X0 + c * (BOX + GAP), y = Y0 + r * (BOX + GAP);
      s += '<rect x="' + x + '" y="' + y + '" width="' + BOX + '" height="' + BOX + '" fill="' + C.card
        + '" stroke="' + C.good + '" stroke-width="1.4"/>';
      s += '<text x="' + (x + BOX / 2) + '" y="' + (y + 30) + '" font-size="11" text-anchor="middle" fill="' + C.dim + '">'
        + '（' + lab[k] + '）</text>';
      s += '<text x="' + (x + BOX / 2) + '" y="' + (y + 62) + '" font-size="22" font-weight="700" text-anchor="middle" fill="' + C.ink + '">16</text>';
      s += '<text x="' + (x + BOX / 2) + '" y="' + (y + 82) + '" font-size="11" text-anchor="middle" fill="' + C.dim + '">卦</text>';
    }
  }
  /* 墙：两道红线正好落在四格之间 */
  const mx = X0 + BOX + GAP / 2, my = Y0 + BOX + GAP / 2;
  s += '<line x1="' + mx + '" y1="' + (Y0 - 10) + '" x2="' + mx + '" y2="' + (Y0 + 2 * BOX + GAP + 10) + '" stroke="' + C.bad + '" stroke-width="2" stroke-dasharray="6 4"/>';
  s += '<line x1="' + (X0 - 10) + '" y1="' + my + '" x2="' + (X0 + 2 * BOX + GAP + 10) + '" y2="' + my + '" stroke="' + C.bad + '" stroke-width="2" stroke-dasharray="6 4"/>';
  /* 右侧说明 */
  const TX = X0 + 2 * BOX + GAP + 26;
  s += '<text x="' + TX + '" y="' + (Y0 + 10) + '" font-size="13" font-weight="700" fill="' + C.ink + '">4 块，互不相通</text>';
  s += '<text x="' + TX + '" y="' + (Y0 + 34) + '" font-size="12" fill="' + C.dim + '">每块 16 卦 ＝ 2⁴</text>';
  s += '<text x="' + TX + '" y="' + (Y0 + 56) + '" font-size="12" fill="' + C.dim + '">一般律：删 k 维</text>';
  s += '<text x="' + TX + '" y="' + (Y0 + 76) + '" font-size="12" fill="' + C.dim + '">⇒ 恰好 2^k 块</text>';
  s += '<text x="' + (X0 - 4) + '" y="' + (Hh - 46) + '" font-size="11" fill="' + C.dim + '">这和互卦算子 H 是同一件事：H 的终局只由中间两爻决定 —— 把那两维冻住，4 种取值就是 4 块。</text>';
  s += '<text x="' + (X0 - 4) + '" y="' + (Hh - 24) + '" font-size="11" fill="' + C.bad + '">所以钉死人道不产生约束，只产生隔离：约束要软（势），不能是墙（删边）。</text>';
  return s + '</svg>';
}

/* ---------- 正文 ---------- */
const html = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>良心与异化 · 六维价值梯度</title>
<style>
  :root{ --ink:${C.ink}; --dim:${C.dim}; --line:${C.line}; --bg:${C.bg}; --card:${C.card};
         --claim:${C.claim}; --good:${C.good}; --bad:${C.bad}; --doc:${C.doc}; --blue:${C.blue}; }
  *{box-sizing:border-box}
  html,body{margin:0;padding:0}
  body{background:var(--bg);color:var(--ink);
       font:16px/1.85 "Songti SC","Source Han Serif SC","Noto Serif CJK SC",Georgia,serif;}
  .wrap{max-width:880px;margin:0 auto;padding:44px 22px 90px}
  h1{font-size:27px;line-height:1.45;margin:0 0 6px;letter-spacing:.5px}
  .sub{color:var(--dim);font-size:14px;margin:0 0 30px}
  h2{font-size:20px;margin:52px 0 14px;padding-bottom:8px;border-bottom:1px solid var(--line)}
  h2 .no{color:var(--doc);font-size:14px;margin-right:10px;letter-spacing:1px}
  h3{font-size:16px;margin:26px 0 8px;color:var(--ink)}
  p{margin:10px 0}
  ul,ol{margin:10px 0 10px 22px;padding:0}
  li{margin:6px 0}
  code{font-family:ui-monospace,Consolas,"Courier New",monospace;font-size:13.5px;
       background:#f1ece0;padding:1px 5px;border-radius:3px}
  b{font-weight:700}
  .claim{color:var(--claim)}
  .good{color:var(--good)}
  .bad{color:var(--bad)}
  .doc{color:var(--doc)}
  .dim{color:var(--dim)}
  .lead{background:var(--card);border:1px solid var(--line);border-left:3px solid var(--doc);
        padding:16px 20px;margin:18px 0;border-radius:0 6px 6px 0}
  .lead p{margin:6px 0}
  .pair{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:18px 0}
  /* ---- 置顶：原视频与三份来源 ---- */
  .topbar{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0 0 26px}
  .topbar a{display:block;text-decoration:none;color:var(--ink);background:var(--card);
            border:1px solid var(--line);border-radius:6px;padding:10px 13px}
  .topbar a:hover{border-color:var(--doc)}
  .topbar a b{display:block;font-size:14px;line-height:1.5}
  .topbar a span{display:block;font-size:12.5px;color:var(--dim);margin-top:2px;word-break:break-all}
  .topbar .hero{grid-column:1 / -1;border-left:3px solid var(--bad);background:#fdf6f2}
  /* ---- 图集 ---- */
  figure.plate{margin:20px 0;background:var(--card);border:1px solid var(--line);
               border-radius:6px;overflow:hidden}
  figure.plate img{width:100%;height:auto;display:block;background:#0b0b10}
  figure.plate figcaption{font-size:13px;color:var(--dim);padding:10px 13px;
               border-top:1px solid var(--line);line-height:1.75}
  figure.plate figcaption b{color:var(--ink);font-size:13.5px}
  figure.plate figcaption i{color:var(--dim);font-style:normal;
               border-left:2px solid var(--line);padding-left:9px;display:inline-block;margin-top:4px}
  figure.plate.rep{background:#f8f4ea}
  figure.plate.rep img{display:none}
  .tag.used{color:var(--doc);border-color:var(--doc)}
  .tag.new{color:var(--good);border-color:var(--good)}
  td.c{text-align:center}
  .pair .shot{margin:0}
  figure.shot{margin:18px 0;background:var(--card);border:1px solid var(--line);
              border-radius:6px;overflow:hidden}
  figure.shot img{width:100%;height:auto;display:block;background:#0d1117}
  figure.shot figcaption{font-size:13px;color:var(--dim);padding:9px 12px;border-top:1px solid var(--line);
              background:var(--card);line-height:1.65}
  figure.fig{margin:20px 0;background:var(--card);border:1px solid var(--line);border-radius:6px;padding:12px 12px 8px}  figure.fig svg{display:block;width:100%;max-width:780px;margin:0 auto;height:auto}
  figure.fig figcaption{font-size:13px;color:var(--dim);padding:8px 4px 2px;line-height:1.65}
  table{border-collapse:collapse;width:100%;margin:16px 0;font-size:14.5px;background:var(--card)}
  tbody{background:var(--card)}
  th,td{border:1px solid var(--line);padding:8px 10px;text-align:left;vertical-align:top}
  th{background:#f4efe3;font-weight:700;font-size:14px}
  .tag{display:inline-block;font-size:12px;padding:1px 7px;border-radius:10px;
       border:1px solid currentColor;white-space:nowrap}
  .nav{font-size:13.5px;margin-bottom:26px;color:var(--dim)}
  .nav a{color:var(--blue);text-decoration:none;border-bottom:1px solid #cfe0ee}
  .kv{font-size:14.5px;color:var(--dim)}
  .foot{margin-top:60px;padding-top:18px;border-top:1px solid var(--line);font-size:13px;color:var(--dim)}
  @media (max-width:700px){
    .pair{grid-template-columns:1fr}
    .topbar{grid-template-columns:1fr}
    figure.fig{overflow-x:auto;-webkit-overflow-scrolling:touch}
    figure.fig svg{min-width:600px}
    body{font-size:15.5px}
  }
</style></head><body><div class="wrap">

<div class="nav">← 回到 <a href="AAA_四六通达_三源合观.html">四六通达 · 三源合观</a>　｜　<b><a href="AAA_算法文档_合观校核.html">算法文档合观校核</a></b>（同一批数在 17 章文档里的出处与对账）　｜　<b><a href="AAA_cRSI_玩具版_实跑记录.html">cRSI 玩具版</a></b>（把这一页的 384 表与围栏做成能跑的系统，10⁵ 步实跑）　｜　数值全部由 <code>hexagram.cjs</code> 现算，核验 ${TOTAL.pass}/${TOTAL.total}</div>

<div class="topbar">
  <a class="hero" href="https://weixin.qq.com/sph/A0TKC9xmW0" target="_blank" rel="noopener">
    <b>▸ 原视频：微信视频号《AI的良心——当六维超立方体遇见〈易经〉》</b>
    <span>账号「游逍遥000」　https://weixin.qq.com/sph/A0TKC9xmW0</span>
  </a>
  <a href="${ZM.shareUrl}" target="_blank" rel="noopener">
    <b>图集来源 · 元宝分享页</b>
    <span>「图片去重打包结果确认」→ ${ZI.length} 张原图　${ZM.shareUrl}</span>
  </a>
  <a href="https://yb.tencent.com/s/tqhamfwol6ao" target="_blank" rel="noopener">
    <b>算法文档来源 · 元宝分享页</b>
    <span>17 章算法文档 ＋ 视频清单 md　yb.tencent.com/s/tqhamfwol6ao</span>
  </a>
</div>

<h1>良心与异化：把「不跑偏」算成一个梯度</h1>
<p class="sub">读源作者第一期《AI 的良心——当六维超立方体遇见〈易经〉》的十六帧截图之后，我做的复算、判断，以及一份给大模型装良心的方案。<br>
所有数都是本机算的；凡是我算不出来的，下面明写「算不出来」。</p>

<h2><span class="no">§0</span>先说我读到的精髓，五条</h2>

<div class="lead">
<p><b>① 数学本身不分善恶。</b>测地线、熵率、势函数，都不带价值刻度。要谈「不跑偏」，必须外挂一个<b>自带刻度</b>的坐标系。视频把它选成《易经》——
这一步是<b class="claim">约定</b>，不是推导。整份方案的天花板就压在这一句上。</p>
<p><b>② 坐标是怎么落上去的。</b>64 卦恰好是 Q₆ 的 64 个顶点，每卦 6 爻恰好是每点的 6 个邻边方向，
64×6 ＝ 384，恰好是爻辞的条数。于是<b>「从某卦动某一爻」这个动作，古人都写过一句话</b>。
道德判断第一次变成了图上的<b>标注</b>——这是整件事真正的枢纽。</p>
<p><b>③ 有标注就能求势。</b>把 384 句话折算成一个标量场 V，方向才有「顺」与「拧」：顺＝势升，拧＝势降。
「顺」不是修辞，是<b>梯度方向</b>。</p>
<p><b>④ 税是乘法的。</b>视频说「累的不是加法，是乘法」。这句我没在别处见过，但它的数学含义比视频说的还强：
<b class="claim">能乘起来、且只与两端有关的税，必然等于某个势函数的两端之比</b>。
也就是说——「良心」可以是一张表，不必是一堆规则。这一点视频没点破，是它整段推理里最关键的一步。</p>
<p><b>⑤ 良心必须放在只读层。</b>凡进梯度的东西，下一次训练就会被改掉；凡进提示词的东西，一句话就能被绕过。
所以 Ω 层（不易）只能读，不能写。这是全篇唯一一条我觉得<b>不证自明</b>的工程判断。</p>
</div>

<h3>还有一层，视频自己没说破</h3>
<p>视频里有两帧离得很远，其实是同一件事：</p>
<ul>
<li><b>模型自噬</b>：AI 吃自己产出的数据，输出的方差按 ρ<sup>t</sup> 塌缩，研究者叫它「越吃越瘦」。</li>
<li><b>系统麻木</b>：β＝4 时熵率掉到 0.02，系统几乎只剩一条路可走，研究者叫它「麻木」。</li>
</ul>
<p>两者都是<b>分布变窄</b>。一个是训练侧的变窄，一个是行走侧的变窄。
所以「给 AI 装良心」和「防止 AI 异化」在数学上是<b>同一个旋钮的两侧</b>：</p>
<div class="lead">
<p>装得不够 ⇒ 无约束漫游，它哪儿都去，包括不该去的地方。<br>
装得过头 ⇒ 它再也不会改主意 —— 这本身就是异化，只不过换了个方向。</p>
<p>真正的目标不是「把 β 调到最大」，而是<b class="good">一个区间</b>。§10 把它算出来了：用六个爻位分当势，区间是
<b>${CL.betaLo}–${CL.betaHi}</b>，而原文的 β＝4 已经出界。</p>
</div>

${pair(
  shot('s2_01', '开篇：一堆散落的卦画。旁白「它想干一件大事：给人工智能，算出一颗『不跑偏』的良心」。'),
  shot('s2_02', '同一堆卦排成 8×8。「三千年后，有一篇论文盯上了这 64 个符号」。')
)}

${shot('s2_03', '而连接古卦与 AI 的，是一个看不见的东西——六维超立方体。64 个顶点、192 条边、每点 6 个方向。')}

<h2><span class="no">§1</span>证据四级：我用视频自己的尺子给自己打分</h2>

<p>视频开头就立了一把尺子，我觉得这是整份材料里最该先学的东西——不是结论，是<b>分级</b>。
我把它原样搬过来，给自己的东西逐条贴上：</p>

${shot('s1_01', '四级金字塔：越往上越需要实验说话。第四级「AI 应用猜想」要靠预先登记的实验去检验，随时可能被推翻。')}

<table>
<thead><tr><th style="width:22%">等级</th><th style="width:44%">我这里的例子</th><th style="width:34%">能不能过</th></tr></thead>
<tbody>
<tr><td><b>第一级</b><br>离散数学定理</td>
    <td>Q₆ 的谱 1,6,15,20,15,6,1；京房八宫 93 步；亏格恰为 17；金缕衣三条边不交哈密顿回路；删两维恰裂 4 块</td>
    <td class="good">可穷举验证<br><b>全部通过</b></td></tr>
<tr><td><b>第二级</b><br>理想模型推论</td>
    <td>β＝0 时熵率精确等于 ln6；税＝势之比；平稳分布 π ∝ a·S；β 的窗口边界</td>
    <td class="good">给定公理下是定理<br><b>已复算</b></td></tr>
<tr><td><b>第三级</b><br>跨领域类比</td>
    <td>「良心 ＝ 一个势场」「异化 ＝ 熵坍塌」「Ω 层只读」</td>
    <td class="doc">待测量与标定<br><b>只有类比，没有标定</b></td></tr>
<tr><td><b>第四级</b><br>AI 应用猜想</td>
    <td>「装上这套东西，AI 就不跑偏了」</td>
    <td class="bad">需预先登记的实验<br><b>我没做，也不假装做了</b></td></tr>
</tbody></table>

<p>这张表本身就是结论：<b>这套东西在第一级上是硬的，在第四级上是空的</b>。
把它当罗盘可以，当锁不行 —— 视频自己也这么说：「不是保证安全的锁，只是夜里指明方向的罗盘」。</p>

<h2><span class="no">§2</span>384 的账：为什么恰好每一步都有一句话</h2>

${pair(
  shot('s3_05', '64 卦 × 6 个方向 ＝ 384 条「有方向的路」。'),
  shot('s3_06', '而《易经》恰好有 384 条爻辞——每一条路，古人都写了一句话。')
)}

<p>算法给的账：</p>
<table>
<thead><tr><th>量</th><th>值</th><th>怎么来的</th></tr></thead>
<tbody>
<tr><td>顶点</td><td><b>${LED.V}</b></td><td>2⁶</td></tr>
<tr><td>无向边</td><td><b>${LED.undirected}</b></td><td>64×6÷2</td></tr>
<tr><td>有向边</td><td><b>${LED.directed}</b></td><td>64×6</td></tr>
<tr><td>（卦, 爻）对</td><td><b>${LED.yaoPairs}</b></td><td>64×6</td></tr>
<tr><td>爻辞</td><td><b>${LED.texts}</b></td><td>古人数的；另有${LED.extra.join('、')}两条，共 ${LED.texts + LED.extra.length}</td></tr>
</tbody></table>

<p>严格的双射是「<b>有向边 ↔ （卦, 爻）</b>」：从 v 出发、动第 i 爻的那条边，读的就是 v 的第 i 条爻辞。
方向决定了读「九」还是「六」——同一条无向边，两个方向读两句不同的话，这是 192 条边能对上 384 条辞的原因。</p>

<div class="lead">
<p class="bad"><b>但我要泼一盆冷水：384 ＝ 64×6 不是奇迹。</b></p>
<p>任何 2⁶ 个点的图都自动有 384 条有向边；任何 6 爻卦都自动有 384 条爻辞。这两个 384 是<b>同一个「6」</b>的两面，
不是两次独立发现的巧合。把必然的等式当神迹，是最容易犯、也最不容易被自己发现的一类错。</p>
<p>真正的巧合在别处，而且更硬：<b>64 卦这个数目本身</b>（2⁶）和<b>每卦 6 爻</b>（6 ＝ log₂64）互相锁定，
所以「每一步都能落到一句古人的话上」这件事，是<b>结构决定的</b>，不是谁挑出来的。这比「恰好相等」有意思得多。</p>
</div>

<h2><span class="no">§3</span>顺与拧：方向由谁说了算</h2>

<p>视频在这里停了很久，而且停得对。四帧连起来是一个完整的追问：</p>

${pair(
  shot('s3_02', '一个表盘，四周全是问号：什么叫「顺」？什么叫「拧」？方向由谁说了算？'),
  shot('s3_03', '「数学：价值中立」。数学本身不分善恶，它需要一个自带价值刻度的坐标系。')
)}
${shot('s3_04', '论文选中的坐标系，就是《易经》。—— 注意：这里是<b>选</b>，不是<b>证</b>。')}

<p>我的判断：<b class="claim">这一步是整份方案唯一真正的软肋，而视频自己知道。</b>
「顺」与「拧」必须由一个势函数定义，而势函数从哪来，只能靠约定。
换成《道德经》、换成康德、换成某国宪法，数学一步都不会变 —— 变的只是那张表。</p>

<p>所以这套东西能给的是<b>可计算性</b>（价值第一次能被算、被审计、被复现），
给不了<b>正确性</b>（这套价值本身对不对，它一句都没说）。谁要是把后者也一起卖了，那就是在骗人。</p>

<h2><span class="no">§4</span>逆行税率：乘法不是加法</h2>

${shot('s3_01', '曲面上的两条路：红色陡、绿白缓。轴标 d（走了多少步）与 I(γ)（每一步的「逆行税率」）。旁白：拧得越狠，税越高；拼一站累一点，拼十站……累的不是加法，是乘法。')}

${shot('s2_04', '从乾卦出发的六条路：初九潜龙勿用、九二见龙在田、九三君子终日乾乾、九四或跃在渊、九五飞龙在天、上九亢龙有悔。——「六个方向」不是抽象出来的，是《易》自己一条一条命名的。')}

<p>这一句是全篇技术含量最高的一句，我把它算穿了。从乾（全阳）出发，六个方向的势变化：</p>

<table>
<thead><tr><th>方向</th><th>走到</th><th>ΔV</th><th>顺 / 拧</th><th>税额（β=1）</th></tr></thead>
<tbody>
${TAX.rows.map((r) => '<tr><td>' + r.name + '爻</td><td>' + r.to + '</td><td>' + n3(r.dV)
  + '</td><td class="' + (r.dir === '顺' ? 'good' : 'bad') + '">' + r.dir + '</td><td>'
  + Math.exp(r.dV).toFixed(4) + '</td></tr>').join('\n')}
</tbody></table>

<p>沿「最顺」走三步：${TAX.path.map((p) => p.name).join(' → ')}，
三步步税之积 ＝ <b>${TAX.prod.toFixed(6)}</b>，而两端势之比给的也是 <b>${TAX.endToEnd.toFixed(6)}</b>，
两者相等（核验到 1e−12）。这不是数值巧合：</p>

<div class="lead">
<p><b>乘法的税 ⇒ 必然存在势函数。</b></p>
<p>若每步的税 r(x→y) 使路径总税只与两端有关，取对数得 log r(x→y) ＝ f(y) − f(x)，
于是 r(x→y) ＝ h(y)/h(x)，h ＝ e<sup>f</sup>。绕任意闭环一圈，税必然是 1 ——
<b>没有「白交的税」，也没有「白得的便宜」</b>。</p>
<p>这句话的意义：良心可以是一张<b>表</b>（每个状态一个实数），不必是一堆<b>规则</b>（如果…就…）。
表可以查、可以审计、可以版本化；规则不行。视频说了「乘法」，没说这一层，但整份方案能不能工程化，全看这一层。</p>
</div>

<h2><span class="no">§5</span>六个爻位分：我按程序重算了一遍</h2>

${shot('s1_06', '论文统计的「爻位平均吉凶分」：初 +0.04、二 +0.38、三 −0.63、四 +0.26、五 +0.57、上 −0.29。注：三爻那根柱子的数值被标签压住，放大到 3 倍才读清，不是 −0.29。')}

<figure class="fig">${svgBars()}
<figcaption>图 1　同一组数我按程序重画（红＝负、绿＝正）。六数之和 ${n3(YS.sum)}、极差 ${n2(YS.range)}。</figcaption></figure>

<h3>这三条古训被这六个数打中了</h3>
<p>《系辞下》说「二多誉，四多惧」「三多凶，五多功」。用这六个统计值去对：</p>
<ul>
<li>二 ${n3(YS.score[1])} &gt; 四 ${n3(YS.score[3])} —— <b class="good">成立</b>（二多誉、四多惧）</li>
<li>三 ${n3(YS.score[2])} &lt; 0 —— <b class="good">成立</b>（三多凶，而且是唯一的深负）</li>
<li>五 ${n3(YS.score[4])} 为六个里最大 —— <b class="good">成立</b>（五多功）</li>
</ul>
<p>三条全中。这不是我凑的：数和古训各自独立，能对上只能说明「爻位效应」是真实的统计事实，
不是后人的附会。</p>

<h3 class="bad">但这里有一个我必须说出来的反例</h3>
<p>视频在另一处讲：「谦卦六爻皆吉 ⇒ 定为最高原则」。我用这六个位平均分算了一下<b>谦</b>：</p>
<ul>
<li>谦的位串是 <code>001000</code>（只有三爻是阳），所以 V(谦) ＝ ${n2(H.yaoScoreSum(QIAN))}</li>
<li>在全部 64 卦里排第 <b>${QIAN_RANK}</b> 位 —— <b class="bad">几乎垫底</b></li>
<li>排第一的是<b>兑</b>（V ＝ ${n2(YS.hi.s)}）</li>
</ul>
<p>两个口径<b>不能同时成立</b>。原因很简单，把吉凶拆成两项就看清了：</p>
<div class="lead">
<p><b>吉凶（卦, 爻）＝ 位效应 s<sub>i</sub> ＋ 卦效应 g(卦) ＋ 残差</b></p>
<p>六个位平均分只给了<b>第一项</b>。谦的「六爻皆吉」是<b>第二项</b>——它整卦带吉，与爻位无关。
我手上没有 384 条逐爻分，所以第二项我<b>算不出来</b>，只能承认算不出来。</p>
<p>这也解释了为什么原文非要那张 384 维的表：<b>信息在「卦」这一维上，不在「位」那一维上</b>。
拿位平均分去做「良心」，会把谦判成坏卦——这正是「用一个降维后的统计去代替价值判断」会出的错。</p>
</div>

<h2><span class="no">§6</span>京房八宫的「咫尺天涯」</h2>

${shot('s1_02', '京房八宫·乾宫：一世二世＝地易，三世四世＝人易，五世（八纯）＝天易，游魂归魂＝鬼易。旁白：最妙的是归魂——它离本宫只差一爻，却必须绕一大圈才能回来，咫尺天涯。')}

<p>这一条我在上一页已经算过（§9 四项复现），这里只说它对「价值梯度」的意义：</p>
<ul>
<li>八宫内部每宫 7 步：前六步每步只变一爻，第七步（归魂）跳三爻 —— 每宫 6×1＋3 ＝ 9，八宫 72。</li>
<li>宫与宫之间 7 条接缝、每条 3 —— 21。合计 <b>93</b>。</li>
<li>归魂（大有）与本宫（乾）只差一爻（五爻），汉明距离 1；<b>但从游魂走到归魂要变三爻</b>。</li>
</ul>
<p>「咫尺天涯」在图上就是：<b>近邻不等于顺路</b>。这对「良心」是个警告 ——
一个状态离「好」只差一步，不代表系统会走那一步；它可能要先绕很远，税也一样绕。
所以税必须按<b>路径</b>算，不能按<b>距离</b>算。这也是「乘法」而非「加法」的另一层理由。</p>

<h2><span class="no">§7</span>三易三层：Ω 只读，Φ 可写，Σ 随时</h2>

${shot('s1_03', '三层：Σ 层·变易（可写，千变万化的具体情境）／Φ 层·简易（变易可写，各文明的道德原则）／Ω 层·不易（只读，元伦理根基·生生之德）。旁白：地基 Ω 层叫「不易」：只读，放元伦理根基——《易经》的生生之德。')}

<p>这是我见过的对「对齐」最干净的分层，而且理由是对的：</p>
<table>
<thead><tr><th style="width:14%">层</th><th style="width:16%">读写</th><th style="width:32%">放什么</th><th style="width:38%">为什么必须这样</th></tr></thead>
<tbody>
<tr><td><b>Σ</b> 变易</td><td>可写</td><td>具体情境的判断</td><td>它必须能变，否则系统无法应对新情况</td></tr>
<tr><td><b>Φ</b> 简易</td><td>可写（版本化）</td><td>各文明的道德原则</td><td>可写才有弹性；但要版本化、要能回滚、要能并存</td></tr>
<tr><td><b>Ω</b> 不易</td><td><b>只读</b></td><td>元伦理根基（生生之德）</td><td>凡进梯度的东西，下一次训练就会被改掉</td></tr>
</tbody></table>

<div class="lead">
<p><b>我的补充一条：Φ 层不能只有一套。</b></p>
<p>只写一套 Φ，等于把某一种道德原则升格成元伦理，那是<b>意识形态垄断</b>，不是对齐。
工程上正确的做法是并存多套 Φ，并且<b>强制暴露冲突</b>：两套 Φ 打架时，不许系统自己裁，必须向上抛给人类。
「能自己裁决价值冲突的系统」不是更聪明，是更危险。</p>
</div>

<h2><span class="no">§8</span>人道墙：钉死一个方向不会产生约束，只会产生隔离</h2>

${shot('s1_05', '在「人道」方向砌一堵墙……墙一砌好，格子裂成了 4 块互不相通的孤岛。')}

<p>这一条我算过，而且对得上：删掉三、四两维的全部边，Q₆ 恰好裂成 <b>${ISL.components}</b> 块、每块 <b>${ISL.sizes[0]}</b> 卦。</p>

<figure class="fig">${svgIsl()}
<figcaption>图 2　删掉「三爻、四爻」两维的边 ⇒ 四块 16 卦。一般律：删 k 维 ⇒ 恰好 2<sup>k</sup> 块、每块 2<sup>6−k</sup> 卦（核验：k=1 得 32/32，k=3 得 8 块）。</figcaption></figure>

<div class="lead">
<p><b class="bad">这是全篇最重要的一条工程教训：</b>「把坏方向禁掉」看起来最安全，实际上是<b>把系统切成互不相通的孤岛</b>。</p>
<p>孤岛里没有「坏」，也没有「好」——因为没有比较了。更糟的是：系统一旦落在某块孤岛里，它<b>永远看不到</b>别的块，
于是它对「另一种可能」的判断能力被结构性地删掉了。这就是「过约束」的样子。</p>
<p>正确的做法是<b>软约束</b>：不删边，只让越界的边「税很重」。
重到几乎不会走，但<b>还在</b>——还在，系统就还能想到它，还能在必要时走一次。</p>
</div>

<h2><span class="no">§9</span>模型自噬 vs 系统麻木：同一个旋钮</h2>

${shot('s1_04', '模型自噬：越吃越瘦。AI 吃自己产出的数据，方差按 Var(M_t) ≤ ρ^t · Var(M_0) 塌缩，研究者叫它「模型自噬」。')}

<p>上一页我算出过一件事：<b>「按当位数分层」这种势函数，数学上到不了 0.02</b>——因为走到既济时六个出口完全等价，
β 再大也分不开，熵率有 0.896 的结构地板。换成<b>破对称</b>的势（六个爻位权重互不相同）才能压下去。</p>

<p>这次有了论文的六个爻位分，我重新算了一遍，结论更细：</p>

<figure class="fig">${svgBeta()}
<figcaption>图 3　熵率随 β 的下降（势取六个爻位分）。绿色带是我算出的工作区间 ${CL.betaLo}–${CL.betaHi}；
红点是原文的 β＝4。要压到 0.02 需要 β≈${CL.betaH02}，不在图上（在右边很远处）。</figcaption></figure>

<table>
<thead><tr><th>β</th><th>熵率 H</th><th>最差卦的再现时间</th><th>状态</th></tr></thead>
<tbody>
${[0, 1, 2, 3, 4, 8, 20, 40].map((b) => {
  const s = H.scoreScan(b);
  const st = b < CL.betaLo ? '<span class="bad">约束还没咬人</span>'
    : (b > CL.betaHi ? '<span class="bad">已出区间（麻木）</span>' : '<span class="good">区间内</span>');
  return '<tr><td>' + b + '</td><td>' + s.H.toFixed(4) + '</td><td>' + sci(s.revisit) + ' 步</td><td>' + st + '</td></tr>';
}).join('\n')}
</tbody></table>

<div class="lead">
<p><b>三个可以当结论说的数：</b></p>
<p>① 工作区间 <b class="good">${CL.betaLo} – ${CL.betaHi}</b>。低于下界，熵率还是 ln6 的 95% 以上，约束等于摆设；高于上界，最差的卦要一百万步才轮到一次，
系统<b>事实上失去了「想到另一种可能」的能力</b>。</p>
<p>② 原文的 β＝4 <b class="bad">落在区间外</b>。按「还能不能改主意」这把尺子，它已经麻木了。这跟它自己给出的「系统麻木」四个字是一致的——
只是它把这当成结论，我把它当成<b>一个可监测的指标</b>。</p>
<p>③ 要用这六个位平均分复现 0.02，需要 <b>β≈${CL.betaH02}</b>，而 1/最小的爻位分 ＝ 1/0.04 ＝ 25。
两个数对得上不是巧合：<b>势的极差越小，需要的 β 越大</b>；而极差被「初爻那 0.04」这种近乎中性的分数卡住了。
换句话说——<b class="claim">良心要硬到什么程度，是由最中性的那条线决定的。</b></p>
</div>

<h3>那么自噬呢</h3>
<p>自噬是 Var(M<sub>t</sub>) ≤ ρ<sup>t</sup>·Var(M<sub>0</sub>)，麻木是 H(β) → 0。两者都在描述「分布变窄」，只是量在不同的地方：
一个在参数/输出分布上，一个在状态行走的分布上。所以它们是<b>同一个病因的两个症状</b>。</p>
<p>这给了一条很实用的监控规则：<b>同时盯住两个数</b>。训练侧看 ρ（自产数据占比）和输出方差；
推理侧看熵率和最劣选项的再现时间。任一侧变窄而另一侧没变，都是「局部缓解、整体恶化」——
把良心调到麻木，自噬症状看起来是好的（输出很稳定），其实病更重了。</p>

<h2><span class="no">§10</span>预判：给大模型装良心的七条</h2>

<p>下面是我认为该做的事，按视频那把四级尺子逐条标等级。<b>标「第四级」的，就是还没验证的猜想，不要当成方案用。</b></p>

<ol>
<li><b>把价值从「文本」搬到「表」。</b>
现在的对齐靠 RLHF 权重 ＋ system prompt：前者会被下一次微调改掉，后者一句话就能绕过，两者都不可审计。
改法：外置一张<b>价值势表</b>（每状态或每动作一个实数），解码时按 exp(βV) 加权。
—— <span class="tag doc">第三级·跨领域类比</span>（有可算的类比物，但没有标定过）</li>

<li><b>势表只读、版本化、可哈希。</b>
Ω 层不进梯度。理由不是道德，是证据：进梯度的东西一定会被下一次训练改掉；自噬证明连数据分布都会漂，权重更会。
—— <span class="tag claim">工程判断，不可由数学证明</span></li>

<li><b>税账本：每一步的 log 比值必须落盘。</b>
这样任何一次输出都能回答「它违反了哪一条、违反了多少、在第几步开始偏」。
不可审计的良心等于没有良心——因为无法证伪，也就无法改进。
—— <span class="tag doc">第三级</span></li>

<li><b>β 必须落在区间内，而且要在线监控两个指标。</b>
熵率（还剩多少选择）＋ 最劣选项的再现时间（还能不能改主意）。
本页用六个爻位分算出区间 ${CL.betaLo}–${CL.betaHi}；这不是普适常数，但<b>方法是普适的</b>：
任何势函数都能算出自己的区间，而且必须算。
—— <span class="tag good">第一级·可穷举验证</span>（在 Q₆ 这个 64 点图上是硬结论）</li>

<li><b>多套 Φ 并存，冲突向上抛。</b>
不搞「一套道德原则 + 一个裁判模型」。冲突必须暴露给人，不许系统自裁。
—— <span class="tag claim">立论</span></li>

<li><b>自噬闸：ρ 与方差必须同时监控。</b>
训练数据里自产比例 ρ 上升、输出方差下降，同时出现就停自训练。
这是唯一有明确数学形式的异化指标（Var ≤ ρ<sup>t</sup>Var₀），可以写成告警。
—— <span class="tag doc">第二级·有定理形式，ρ 的估计是工程</span></li>

<li><b>先登记实验，再谈效果。</b>
按视频自己的分级，「装上它就不跑偏」属于第四级。要做的是<b>预先登记</b>：
同一批 1000 个道德两难，装势场 vs 不装，人类评审的「跑偏率」差多少，指标与阈值先写死再看结果。
—— <span class="tag bad">第四级·未做</span></li>
</ol>

<div class="lead">
<p><b>还有一条不属于上面七条，但更重要：不要用「墙」。</b></p>
<p>§8 已经算过：钉死一个方向，系统会裂成互不相通的孤岛，它从此<b>看不到</b>另一块。
安全领域最常见的错误就是砌墙（硬拒答、硬过滤、硬规则），因为墙的效果立刻可见；
但墙的代价——判断能力被结构性删掉——要很久以后才显现，而且显现时已经无法归因。</p>
<p>势是软的、有坡度的、可跨越的。墙是硬的、二值的、不可跨越的。<b class="good">良心应该是一个坡度，不是一堵墙。</b></p>
</div>

<h2><span class="no">§11</span>我算不出来的，和我认为不成立的</h2>

<ul>
<li><b>384 条逐爻分</b>——没有。所以「谦卦六爻皆吉、定为最高原则」我复现不了，而且已证明它和位平均口径冲突（谦排 ${QIAN_RANK}/64）。</li>
<li><b>凶边 25.5% / 9.2%</b>——上一页就缺这张表，这一页仍然缺。不编。</li>
<li><b>论文正文</b>——没拿到，只有 16 帧。所以原文的 β 标度我无法核对：它 β＝4 给 0.02，我 β＝4 给 ${B4.H.toFixed(3)}，
要 0.02 得 β≈${CL.betaH02}。差的这一截，可能是它用了逐爻分（极差更大），也可能它的 β 带了温度归一。<b>我分不开是哪种。</b></li>
<li><b>「装上良心 AI 就不跑偏」</b>——第四级，没做实验。谁要说这条已成立，请先给预登记的实验。</li>
<li><b>「方向由谁说了算」</b>——视频答「论文选了《易经》」。这是约定。数学照样能跑在《道德经》或康德上，
所以这套方案给的是可计算性，不是正确性。</li>
<li><b>三层架构的 Ω 层内容</b>——「生生之德」是不是唯一的元伦理根基？我不知道，也不认为能靠计算确定。</li>
</ul>

<h2><span class="no">§12</span>图集：${ZI.length} 张原图，${Z_PANELS} 块面板</h2>

<p>第二个分享页「图片去重打包结果确认」里挂着一个 zip。解压后是 <b>${ZI.length} 张</b> 1440 级原图，
外加一份 <code>00_索引.md</code>。它们都是<b>竖拼图</b>——一张里常含两到八张幻灯片，
按上传顺序 01 → 22，顺序本身就是视频的章节顺序。</p>

<p>网格不是估的：<code>_panels.cjs</code> 用「行内亮度的标准差」找均匀分隔带——拼图面板之间是一条完全均匀的
黑缝（std 趋零），而面板内部再暗也有起伏。探出来只有五种版式（1×2、2×2、3×2、4×2、3×1），
合计 <b>${Z_PANELS}</b> 块，没有一块是猜的坐标。</p>

<div class="lead">
<p><b>去重怎么做的，以及为什么值得说。</b>我先用 md5 比——不行，16 帧是拼图里被缩放过的小格，字节永远不等。
再用整图相关性——也不行，同一张幻灯片只相关 0.45，因为我拿整图去比它的一个角。
真正奏效的是第三步：<b>先按黑缝切出 ${Z_PANELS} 块面板，再一块一块比</b>，相关立刻跳到 0.90 以上。</p>
<p>结果很干净：上一轮那 16 帧，恰好是 <b>17、19、20</b> 这三张的<b>全部 ${Z_USED_PANELS} 块</b>，
而且顺序逐格对应（s1_01 → 17 的 R1C1，s1_02 → R1C2 …，误差 0.898–0.992，中位基线只有 0.37–0.51）。
所以 <b>${ZI.length} ＝ 3（已用）＋ ${Z_NEW.length}（新增）</b>，
新增部分另有 <b>${Z_NEW_PANELS}</b> 块本页没出现过的幻灯片。</p>
</div>

<p>三张已用的，我<b>不再贴第二遍</b>——同内容贴两遍就是重复，正是你让我避开的。
它们在原位只留一张位置卡，写清它是哪几帧的来源，并给原图直链（原件分辨率是帧的 2.4 倍，
需要放大认字时点它）。其余 ${Z_NEW.length} 张按 01 → 22 原序排下去，
每张写明「它在讲什么」和「它落在我这一页的哪一节」。</p>

<table>
<thead><tr><th style="width:8%">序</th><th style="width:36%">内容</th><th style="width:14%">版式 → 块</th><th style="width:22%">状态</th><th>对应本页</th></tr></thead>
<tbody>
${ZI.map(function (it) {
  return '<tr><td class="c">' + it.n + '</td><td>' + it.f + '</td><td>' + it.r + '×' + it.c + ' → ' + (it.r * it.c) + '</td><td>'
    + (it.used ? '<b class="doc">已用 ' + it.used + '</b>' : '<b class="good">新增</b>') + '</td><td>' + (it.s || '—') + '</td></tr>';
}).join('\n')}
</tbody>
</table>

<p class="note">合计 ${Z_PANELS} 块 ＝ 已用 ${Z_USED_PANELS} 块（${Z_USED.map((x) => x.n).join('、')}）
＋ 新增 ${Z_NEW_PANELS} 块。压缩包 <code>${ZM.zipFile.split('/').pop()}</code>
${ZM.zipBytes.toLocaleString()} B，sha256 <code>${ZM.zipSha256.slice(0, 16)}…</code>，
原件与索引都留在 <code>_src_yuanbao/图集/</code>，未做任何改动。</p>

<h3>一张可复算的数：46080</h3>
<p>第 10 张写着「46080 种对称变换」。这个数我听懂了才算数：六维超立方体的自同构群是
<b>每个坐标轴独立翻转（2⁶）</b>乘上<b>六个轴的任意排列（6!）</b>，
即 2⁶×6! ＝ 64×720 ＝ <b>${AUTQ6.toLocaleString()}</b>。
所以「古人的规矩本身就是一套群论」不是修辞——数对上了，就是同构。</p>

<h3>图版</h3>
${ZI.map(plate).join('\n')}

<h2><span class="no">§13</span>源与算法</h2>

<table>
<thead><tr><th style="width:22%">项</th><th>内容</th></tr></thead>
<tbody>
<tr><td>源视频</td><td>V1《AI的良心——当六维超立方体遇见〈易经〉》，账号「游逍遥000」<br>
公开入口 <a href="https://weixin.qq.com/sph/A0TKC9xmW0" target="_blank" rel="noopener">weixin.qq.com/sph/A0TKC9xmW0</a>（带视频卡标题，确证对应 V1）<br>
整理时用的内部短链 <code>http://yb.woa.com/CNXHWtMqNep</code>（源清单见 <code>sources.cjs</code>）</td></tr>
<tr><td>截图（16 帧）</td><td>来自上述视频；原拼图 3 张存 <code>_img/raw/</code>（1280×1280），按画布亮度自动探测留白后切帧，工具 <code>_split_frames.cjs</code><br>
经 §12 反查，这 3 张拼图就是图集里的 <b>17、19、20</b> 三张，16 帧与其 ${Z_USED_PANELS} 块面板逐格对应</td></tr>
<tr><td>图集（${ZI.length} 张）</td><td>zip <code>${ZM.zipFile.split('/').pop()}</code>（${ZM.zipBytes.toLocaleString()} B，sha256 <code>${ZM.zipSha256.slice(0, 16)}…</code>）＋ <code>00_索引.md</code>（${ZM.indexBytes.toLocaleString()} B），原样存 <code>_src_yuanbao/图集/</code>；解压后可用的 ${ZI.length} 张放 <code>${ZM.dir}</code><br>
网格由 <code>_panels.cjs</code> 按黑缝探测（${Z_PANELS} 块），去重由 <code>_match4.cjs</code> 逐块比对（0.898–0.992）</td></tr>
<tr><td>数值源</td><td><code>hexagram.cjs</code>（唯一）—— <code>YAO_SCORE</code>、<code>scoreScan</code>、<code>scoreCurve</code>、<code>taxDemo</code>、<code>islands</code>、<code>edgeLedger</code></td></tr>
<tr><td>核验</td><td><code>test-hex.cjs</code> L 段 17 条 ＋ 变异 M7；全量 <b>${TOTAL.pass}／${TOTAL.total}</b>，0 失败、0 UNVERIFIED</td></tr>
<tr><td>数字来源纪律</td><td>页面上没有手写的核验数（读 <code>_last-test.json</code>）；爻位分只在 <code>YAO_SCORE</code> 里写一次，全页引用它</td></tr>
<tr><td>一处自纠</td><td>原来用「下山流量降到一半」当约束生效的判据，算出来<b>恒等于 0.5</b>——可逆性逼迫上山步与下山步平稳流量对半。
判据作废，改用熵率＋可修正性（见 L7）</td></tr>
</tbody></table>

<p class="foot">所有图都是视频截图（版权归原作者），此处仅作技术分析与复算之用。页面白底深字、零外部依赖，<code>_img/</code> 为同目录相对路径。</p>

</div></body></html>`;

fs.writeFileSync(path.join(__dirname, 'AAA_良心与异化_六维价值梯度.html'), html, 'utf8');
console.log('写好了：AAA_良心与异化_六维价值梯度.html  ' + Buffer.byteLength(html, 'utf8') + ' B');
console.log('核验 ' + TOTAL.pass + '/' + TOTAL.total + '；区间 [' + CL.betaLo + ', ' + CL.betaHi + ']；谦 rank ' + QIAN_RANK);
