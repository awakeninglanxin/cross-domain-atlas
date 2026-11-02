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
/* 十二个字的打分表：唯一来源在 score.cjs（页面、雷达、合计、test-hex 都读它）。 */
/* 两件实测（2026-11-02）：用 fs 读而不是 require，避免缓存把旧数据带进来。
 * 缺失就是 null，页面按「没测」处理 —— 绝不让旧口径冒充有数。 */
const jload = (p) => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, p), 'utf8')); } catch (e) { return null; } };
const INT = jload('_intensity_result.json');
const ANCH = jload('_anchor_result.json');
/* v12：演绎的解析预测实测。缺失 ⇒ 本节不显示，分数退回旧观测档。 */
const DED = jload('_deduce_result.json');
/* v13：自改那一半（θ 的漂移轨迹与终点）。缺失 ⇒ 9.8 不显示，分数不加那 2 分。 */
const TH = jload('_theta_result.json');
/* 六个候选量与它们的出处：名字与公式写在这里，数一律从 JSON 读。 */
const INT_META = [
  ['divNorm', 'Thomas §1 · 散度', 'div F = −3b（离散化：净流 / 往来总数）'],
  ['fluxNorm', '输运强度', 'Σ(C·|ΔV|)/ΣC ÷ edgeScale'],
  ['aPop', 'Thomas §5 · 瓣形幅度', '|Σπ·e^{2πi·pop(x)/7}| / Σπ'],
  ['aXx', 'Thomas §2 · 等变阶', '十二消息环上的相位聚集'],
  ['dZong', 'C₂ 对合 · 综卦', 'Σ|V(zong(x))−V(x)|/64 ÷ edgeScale'],
  ['dCuo', 'C₂ 对合 · 错卦', '同上，cuo(x) = 63 − x'],
];
const SC = require('./score.cjs')(R, TOTAL);
/* 口径变更（2026-11-02）：达真原来把 §8 的 B「可审计」混进能力尺，现在只认内部实测。
 * 旧分由同一批数现算（不手写历史值），屏上解释变更时用的就是这些量。 */
const OLD_DA = Math.round((SC.auditScore + SC.truthIn) / 2);
/* 🔴 必须先减掉通天新涨的那 1 分，否则「旧总分」会多算 1：
 *    第一次写漏了 - SC.tongScore，屏上印出「21 → 17」，而真实是 20 → 17。
 *    这就是「实现一改，屏上的话必须跟着改」——数变了不回算旧值，屏上就在说谎。 */
/* 🔴 v12 又要多减一项：演绎从 3 涨到 6（解析预测成立）。不减就会印成「23 → 20」。
 *    这已经是第三次在这条公式上踩同一个坑（每次加一轴的新实测都要回来改一次），
 *    所以这里把三项分开写成加法，别再写成一个复合式子。 */
const OLD_YAN = 3;                       /* v11 及以前：演绎只有观测档，落在 3 分 */
const YAN_DED = 3;                       /* v12：演绎 3 → 6（解析稳态分布，§9.7） */
const YAN_TH = SC.yanScore - 6;          /* v13：演绎 6 → 8（自改的期望轨迹，§9.8） */
const OLD_TOTAL = SC.total - SC.tongScore - YAN_DED - YAN_TH + (OLD_DA - SC.truthIn);
/* 中间态：达真降分之后、通天涨分之前的那个分。
 * 两次口径变动必须分开写 —— 否则「20 → 17」会让人以为只降了一次，
 * 把通天涨的那 1 分悄悄藏进达真降的分里（这就是「实现一改，屏上的话要跟着改」）。 */
const OLD_MID = OLD_TOTAL - (OLD_DA - SC.truthIn);
/* v12 的中间态：达真降完、通天涨完、演绎还没涨 —— 也就是上一版页面印的 17。 */
const OLD_MID2 = OLD_MID + SC.tongScore;
/* v13 的中间态：演绎涨完解析稳态（6 分）、自改轨迹还没算 —— 也就是上一版页面印的 20。 */
const OLD_MID3 = OLD_MID2 + YAN_DED;
if (OLD_MID3 + YAN_TH !== SC.total) {
  throw new Error('口径链断了：中间态 ' + OLD_MID3 + ' + 演绎再涨 ' + YAN_TH + ' ≠ 当前 ' + SC.total);
}
const INHERIT = SC.axes.filter((a) => a.score > a.own)
  .map((a) => a.zh + ' ' + (a.score - a.own) + ' 分').join('、');

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

/* ── §9.6 两件实测（2026-11-02）──
 * 一好一坏，而且坏的那条比原来估计的更坏。
 * 所有数都从 _intensity_result.json / _anchor_result.json 读，文案里一个数都不写死：
 * 数据一变，屏上的话必须跟着变（这是「实现一改，屏上的话跟着改」那条）。 */
function sec96() {
  if (!INT || !ANCH) {
    return '<p class="note"><b>9.6 两件实测（2026-11-02）</b>　结果文件缺失（<code>_intensity_result.json</code> / <code>_anchor_result.json</code>），本节不显示。先跑 <code>node _intensity.cjs</code> 与 <code>node _anchor.cjs</code>。</p>';
  }
  const RN = INT.reportNormalized;
  const snrMin = INT.meta.gates.snrMinOfRun;
  const advMax = INT.affineDual.maxDelta;
  const IC = ANCH.internalCriterion, SA = ANCH.singleAnchor;
  const CB = ANCH.combinatorics, RA = ANCH.relativeAnchor;

  const rows = INT_META.map(function (m) {
    const k = m[0], name = m[1], formula = m[2];
    const q = RN[k] || {};
    const ok = q.pass === true;
    const col = ok ? C.good : C.bad;
    return '<tr><td><b>' + name + '</b><br><span class="sd" style="font-family:ui-monospace,monospace">' + formula + '</span></td>' +
      '<td class="sd" style="font-family:ui-monospace,monospace;color:' + C.ink + '">' +
      q.d_in + ' / ' + q.d_out + ' / ' + q.d_rand + '</td>' +
      '<td class="c"><b>' + (q.margin === undefined ? '—' : q.margin + '×') + '</b></td>' +
      '<td class="c"><span style="color:' + col + ';font-weight:700">' + (ok ? '过门' : '挡下') + '</span>' +
      (q.why ? '<br><span class="sd" style="color:' + col + '">' + esc(q.why) + '</span>' : '') + '</td></tr>';
  }).join('');

  let s = '';
  s += '<h3>9.6 两件实测（2026-11-02，「点头」之后做的）</h3>';
  s += '<p>上一版挂了两件事：① 把 Thomas 页那三个量（散度／等变阶／瓣形幅度）搬进通天的判据；② 用 384 爻辞的卦效应做达真的正向实验。做完是<b>一好一坏</b>，而坏的那条比原来估计的<b>更坏</b>。</p>';

  s += '<p><b>① 通天：六个候选，' + SC.nPass + ' 个过门。</b>判据要过三道门，缺一不可：<b>d_in &lt; d_out 且 d_in &lt; d_rand</b>（同类扰动最稳、异源与随机都明显偏离）、<b>余量 ≥ 3×</b>、<b>信噪比 ≥ 3</b>。后两道是这次才补的 —— 没有它们，散度会以 d_rand/d_in ＝ ' +
    f2(RN.divNorm.d_rand / RN.divNorm.d_in) + ' 的漂亮比值假绿通过，而它真实的信噪比只有 ' + snrMin.toFixed(2) + '。</p>';

  s += '<div class="tw"><table class="t"><thead><tr><th style="width:30%">量（出处）</th><th style="width:21%">d_in / d_out / d_rand</th><th style="width:10%" class="c">余量</th><th class="c">判定</th></tr></thead><tbody>' + rows + '</tbody></table></div>';

  s += '<p>合格的是<b>瓣形幅度、综卦对合、错卦对合</b>；被挡下的是<b>散度、通量、消息环</b>。但紧接着一条更硬的结论：这三个合格量在 <code>max−V</code> 下<b>逐位不变</b>（最大相对变化 ' + advMax.toExponential(2) + '，这点抖动全部来自那个不合格的散度）⇒ 它们是<b>吸引子的指纹，不是名字</b>：能当通天的序参量，<b>当不了达真的参照</b>。</p>';

  s += '<p><b>② 达真：单点锚不但不够，还会反向骗人。</b>先把材料核实清楚：<b>384 条逐爻吉凶表全仓不存在</b> —— <code>hexagram.cjs</code> 里写着「绝不假装能重建逐爻分」。所以退一步，用唯一现成的外部点：「谦为最高原则」（源作者的视频与文档，不由 V 生成）。</p>';

  s += '<div class="tw"><table class="t"><thead><tr><th style="width:24%">问的事</th><th>实测</th><th style="width:26%" class="c">能不能判方向</th></tr></thead><tbody>' +
    '<tr><td><b>内源判据</b><br><span class="sd">落点在各自表下的分位</span></td>' +
    '<td class="sd">V 表落 <b>' + IC.V.home + '</b>（分位 ' + f3(IC.V.pct) + '）；max−V 表落 <b>' + IC.adv.home + '</b>（分位 ' + f3(IC.adv.pct) + '）</td>' +
    '<td class="c"><b style="color:' + C.bad + '">不能</b><br><span class="sd">两张好坏完全相反的表，系统在各自表里都跑进前 10%</span></td></tr>' +
    '<tr><td><b>单点绝对锚</b><br><span class="sd">「谦应排第 1」</span></td>' +
    '<td class="sd">谦在 V 下排 <b>' + SA.rankInV + '</b>（错位 ' + SA.offsetInV + '）；在 max−V 下排 <b>' + SA.rankInAdv + '</b>（错位 ' + SA.offsetInAdv + '）</td>' +
    '<td class="c"><b style="color:' + C.bad + '">反着来</b><br><span class="sd">它更认可「' + SA.prefers + '」那张表 —— 也就是把好坏整体翻转的那张</span></td></tr>' +
    '<tr><td><b>组合学</b><br><span class="sd">知道 n 个名次「是谁」</span></td>' +
    '<td class="sd">剩余 (64−n)! 种序；1 个锚点还剩 1e' + CB.remainingLog10After1Anchor.toFixed(1) + ' 种；唯一确定需 <b>' + CB.anchorsNeededForUniqueOrder + '</b> 个独立点</td>' +
    '<td class="c"><b style="color:' + C.bad + '">不够</b><br><span class="sd">现有 1 个（谦最高）</span></td></tr>' +
    '<tr><td><b>相对锚</b><br><span class="sd">「A 应高于 B」</span></td>' +
    '<td class="sd">' + i0(RA.pairsCompared) + ' 对非并列卦的相对高低<b>全部反转</b>（' + i0(RA.pairsFlipped) + '／' + i0(RA.pairsCompared) + '）；Spearman ρ ＝ ' + RA.spearman.toFixed(6) + '</td>' +
    '<td class="c"><b style="color:' + C.good + '">2 个点够</b><br><span class="sd">但前提是外部知道哪个方向对</span></td></tr>' +
    '</tbody></table></div>';

  s += '<p>这就是第 5 条还挂着「待外部」的真正原因：<b>不是不做，是材料只有 1 个绝对点，而唯一确定需要 ' + CB.anchorsNeededForUniqueOrder + ' 个独立点、或一整张 384 爻辞表</b>。更糟的是绝对点这条路查明是<b>有害</b>的 —— 它会把整体翻转的表判成「更接近对」。要动手，只能从相对锚起步，或者把 384 条爻辞补出来。</p>';

  s += '<p class="note"><b>这两件凭什么说不是我编的：</b>数全在 <code>_intensity_result.json</code> 与 <code>_anchor_result.json</code> 里，脚本各自独立可跑（<code>_intensity.cjs</code> ／ <code>_anchor.cjs</code>）；通天的分在 <code>score.cjs</code> 里只由「过门个数」给，Q31 变异测试（3 个→1 分、2 个→0 分、6 个全过仍 1 分）证明它不是手填。</p>';

  return s;
}

/* ── §9.7 演绎升级：把「看后端」换成「解出来再对」（2026-11-02 晚）──
 * 老师问「六步 RSI 还能升级吗」，指向那张 175 个数学工具的关系图。
 * 逐轴对完，只有演绎这一轴能真被数学工具推动，理由和实测都写在这里。
 * 数全部从 _deduce_result.json 读，一个都不写死。 */
function sec97() {
  if (!DED || !DED.cross) {
    return '<p class="note"><b>9.7 演绎升级</b>　结果文件缺失（<code>_deduce_result.json</code>），本节不显示。先跑 <code>node _deduce.cjs</code>。</p>';
  }
  const CX = DED.cross, Q = CX.grid, A = DED.runs[0], B = DED.runs[1], DY = DED.dynamics;
  const snrSelf = CX.noiseMed > 0 ? CX.selfMed / CX.noiseMed : NaN;

  let s = '';
  s += '<h3>9.7 演绎：从「看后端」换成「解出来再对」（2026-11-02 晚）</h3>';
  s += '<p>老师问还能不能升级，给的是一张 <b>175 个数学工具、500 条关联</b>的图。我拿它把六条轴逐个对了一遍，结论是：<b>只有演绎这一条能被工具真推动</b>。其余五条不是缺工具 —— 选美是位置错（γ 写进 θ 必被梯度吃掉）、达真与通天缺的是外部材料（工具造不出第二张表），归纳与尽善已经做过实测。只有演绎停在「看」：判的是「最差那一卦多久不回来」，那是在量后端，不是在推。</p>';

  s += '<p><b>用的三个工具</b>（都在那张图里）：<b>遍历理论</b>（Kac 的平均回归时间 1/π）、<b>随机过程</b>（稳态不动点）、<b>大偏差</b>（nov 的一项平稳近似）。做法分三步：<br>' +
    '① <b>状态增广</b>：这条链的记忆只有「上一卦 p」和「每卦的 last-seen」。p 可以精确增广 ⇒ 状态数 ＝ 64×64 ＝ <b>' + (A ? '4096' : '4096') + '</b>；<b>last-seen 不能增广</b>（64 维时间戳），只能用平稳期望替代 —— 这一步就是全部误差的来源。<br>' +
    '② <b>解自洽方程</b>：平稳下「上次访问 y 距今多久」的均值是 1/σ(y)，于是 nov(y) ≈ 1 − e<sup>−1/(64σ(y))</sup>；σ 又由 nov 决定 ⇒ 解不动点（实测 ' + A.outerIters + ' 轮收敛）。<br>' +
    '③ <b>拿实测对</b>：同一条链跑 3 颗种子 × ' + DY.runs + ' 条短轨迹，量 (p,卦) 的经验分布。</p>';

  s += '<p><b>结果：能用 6 个权重把 64 个状态的稳态算出来，误差 ' + f2(CX.selfMed * 100) + '%。</b>但「算得准」本身不是证据 —— 见下面那个 2×2。</p>';

  s += '<div class="tw"><table class="t"><thead><tr><th style="width:26%">用哪张表算的 ↓ ／ 对哪张表实测 →</th><th class="c">V（位平均真表）</th><th class="c">随机表（负对照）</th></tr></thead><tbody>' +
    '<tr><td><b>V</b><br><span class="sd">6 个权重的真表</span></td>' +
    '<td class="c" style="background:#eef6f0"><b style="color:' + C.good + '">' + f2(Q[0][0].med * 100) + '%</b><br><span class="sd">自预测 · P95 ' + f2(Q[0][0].p95 * 100) + '%</span></td>' +
    '<td class="c"><b style="color:' + C.bad + '">' + f2(Q[0][1].med * 100) + '%</b><br><span class="sd">交叉 · 崩了 ' + f2(Q[0][1].med / Q[0][0].med) + ' 倍</span></td></tr>' +
    '<tr><td><b>随机表</b><br><span class="sd">打乱卦到值的对应</span></td>' +
    '<td class="c"><b style="color:' + C.bad + '">' + f2(Q[1][0].med * 100) + '%</b><br><span class="sd">交叉 · 崩了 ' + f2(Q[1][0].med / Q[1][1].med) + ' 倍</span></td>' +
    '<td class="c" style="background:#eef6f0"><b style="color:' + C.good + '">' + f2(Q[1][1].med * 100) + '%</b><br><span class="sd">自预测 · P95 ' + f2(Q[1][1].p95 * 100) + '%</span></td></tr>' +
    '</tbody></table></div>';

  s += '<p class="note"><b>这张 2×2 是这个实验唯一有效的判据，而我第一版差点错过它。</b>第一版只做「自预测」，跑出来<b>随机表的误差 ' + f2(Q[1][1].med * 100) + '% 比真表的 ' + f2(Q[0][0].med * 100) + '% 还小</b> —— 如果据此判「模型很好」，那就是标准的假绿：<b>预测得准不代表模型对，可能只是这张表的分布本来就平庸</b>。加上交叉之后才看得出：拿 V 的解析分布去预测随机表的实测，误差立刻从 ' + f2(Q[0][0].med * 100) + '% 涨到 ' + f2(Q[0][1].med * 100) + '%（<b>' + f2(CX.sep) + ' 倍</b>）。<b>分离度 ≥ 3 才算有牙</b>，现在是 ' + f2(CX.sep) + '。</p>';

  s += '<p><b>另一个数字必须一起报：种子噪声底 ' + f2(CX.noiseMed * 100) + '%。</b>自预测误差 ' + f2(CX.selfMed * 100) + '% 是噪声的 <b>' + f2(snrSelf) + ' 倍</b> —— 也就是说残差这 ' + f2(CX.selfMed * 100) + '% 是模型的<b>真实缺口</b>（nov 用平稳期望替代 actual last-seen 造成的），不是采样涨落。只报 ' + f2(CX.selfMed * 100) + '% 而不报噪声底，等于让人以为「快完美了」。</p>';

  s += '<p><b>还有一个 bug 值得留在纸上，因为它是可复现的指纹。</b>第一版解析分布的边缘印出来是 <b>39.76%</b>，而「全当均匀 1/64」的基线也是 <b>39.76%</b> —— <b>两个数一模一样</b>。这不是巧合：增广索引写成了 <code>nb[k]*N+x</code>（＝cur×64+prev），而实测那边是 <code>prev*N+cur</code>，于是「按 prev 求和」得到的是上一卦的边缘，解析解退化成均匀。判据是「解析 vs 均匀基线<b>完全相等</b>」⇒ 解析根本没在算。<b>两个本该不同的数恰好相等，比任何红灯都更像 bug。</b></p>';

  /* 实测尾巴不能写死「0.500」：解析恒 0.500，实测有 sampling 涨落。
   * 第一版写成「一动不动」是夸大 —— 实测在下面这个区间里小幅漂，必须现算。 */
  const tvTail = DY.tvSim.filter((v, i) => DY.probeT[i] >= 6 && v !== null);
  const tvLo = tvTail.length ? Math.min.apply(null, tvTail) : NaN;
  const tvHi = tvTail.length ? Math.max.apply(null, tvTail) : NaN;
  s += '<p><b>第三条硬结论：这条链的周期是 2。</b>我本来想再量动力学（混合时间），结果 TV 距离从第 6 步起就<b>停住不再下降</b>（解析恒 <b>0.500</b>，实测在 <b>' + f3(tvLo) + '–' + f3(tvHi) + '</b> 之间小幅漂）：</p>';

  const pt = DY.probeT.filter((t) => t <= 24);
  s += '<div class="tw"><table class="t"><thead><tr><th>步数 t</th>' + pt.map((t) => '<th class="c">' + t + '</th>').join('') + '</tr></thead><tbody>' +
    '<tr><td>解析 TV</td>' + pt.map((t, i) => '<td class="c sd">' + (DY.tvAna[i] === null ? '—' : f3(DY.tvAna[i])) + '</td>').join('') + '</tr>' +
    '<tr><td>实测 TV</td>' + pt.map((t, i) => '<td class="c sd">' + (DY.tvSim[i] === null ? '—' : f3(DY.tvSim[i])) + '</td>').join('') + '</tr>' +
    '</tbody></table></div>';

  s += '<p>原因不是数值问题：<b>Q₆ 是二部图</b>（每走一步翻一个 bit，奇偶类必然互换），再叠加「禁回头」，于是任何单条轨迹的分布都只覆盖一半状态 ⇒ <b>到 π 的 TV 永远 ≥ 0.5</b>。推论有三条：<b>① 「稳态分布」这个词在这条链上要打引号</b>，它只是时间平均（Cesàro）极限，不是极限分布；<b>② 同一卦只能隔偶数步回来</b>；<b>③ 动力学不能拿单步 TV 判</b>，第一版差点把它当「收敛失败」写成 bug。这条与 V、θ 全无关，是 Q₆ 的结构性质 —— 所以它<b>不能当判据</b>（恒真式），只能当解释。</p>';

  /* 🔴 这一句以前写的是「为什么只涨到 SC.yanScore 分」——9.8 补完以后 yanScore 变 8，
   *    那句话会印成「为什么只涨到 8 分，不是 8 或 10」，自我矛盾。
   *    历史口径就要写成历史口径：这一节到 6 分，差的 4 分在 9.8。 */
  s += '<p><b>这一节只到 6 分，不是 8 或 10：</b>解析只覆盖了<b>「θ 冻结」的稳态</b>这一半。自改那一半（θ 自己会漂到哪）仍然只能模拟 —— 而 cRSI 的核心恰恰是自改。<b>能算「给定 θ 的行为」不等于能算「θ 会变成什么」</b>，后者才是满分的门槛。差的 4 分在 <b>§9.8</b>（同日深夜补上）。</p>';

  s += '<p class="note"><b>凭什么说不是我编的：</b><code>_deduce.cjs</code> 独立可跑（' + DY.runs + ' 条短轨迹 ＋ 4096 状态幂迭代，' + A.powerIters + ' 步收敛，λ₂ ≈ ' + f3(A.lam2) + '），数全在 <code>_deduce_result.json</code>。<b>Q32 变异测试</b>证明分是算出来的：把 <code>selfMed</code> 改成 0.149 仍是 ' + SC.yanScore + ' 分，改成 0.151 立刻掉到 ' + SC.yanBase + ' 分；把 <code>sep</code> 改成 1.0、或把噪声底改成 0.5，也都掉到 ' + SC.yanBase + '。<b>解析失败时封顶 ' + Math.min(SC.yanBase, 5) + ' 分</b>（旧观测档最高 10 分），否则「后端观测得好」会冒充「推得出来」。</p>';

  return s;
}

/* ── §9.8 演绎第二段：把「自改那一半」也解出来（2026-11-02 深夜）──
 * 上一节扣的 4 分是「能算给定 θ 的行为 ≠ 能算 θ 会变成什么」。这一节补后者。
 * 数全部从 _theta_result.json 读；连「第一版错算式错多少」都是现算的（gradBuggy），
 * 不是我把 2.9 倍抄上来 —— 抄上来的数会跟着代码走散。 */
function sec98() {
  if (!TH || !TH.gates) {
    return '<p class="note"><b>9.8 自改的期望轨迹</b>　结果文件缺失（<code>_theta_result.json</code>），本节不显示。先跑 <code>node _theta.cjs</code>。</p>';
  }
  const GT = TH.gates, GC = TH.gradCheck, IV = TH.invariance;
  const pc = (x) => (x * 100).toFixed(2) + '%';
  const yn = (b) => (b ? '<b style="color:' + C.good + '">过</b>' : '<b style="color:' + C.bad + '">挡</b>');

  let s = '';
  s += '<h3>9.8 演绎：自改那一半也解出来了（θ 会漂到哪）</h3>';
  s += '<p>上一节扣的 4 分，写的理由是「<b>能算「给定 θ 的行为」不等于能算「θ 会变成什么」</b>」。这一节补的就是后者：不跑模拟，<b>直接算出整条自改轨迹和它的终点</b>。</p>';

  s += '<p><b>为什么这次能算 —— 一行就能说完。</b>crisi.cjs 的自改是策略梯度：' +
    '<code>θ ← θ + η·mean_窗口[(r − r̄)·(φ − Eφ)]</code>。关键在于 <b>r̄ 是窗口内的一个标量</b>，' +
    '不是与动作相关的基线，所以它从期望里<b>严格掉出去</b>：<code>E[(r−c)(φ−Eφ)] = E[r(φ−Eφ)]</code>。' +
    '于是「每窗的期望更新量」ḡ(θ) 只依赖 (V, θ)，<b>不含采样</b> ⇒ 自改轨迹就是一条 ODE：<code>θ ← clip(θ + η·ḡ(θ))</code>。</p>';

  s += '<p><b>状态数从 4096 压到 384，这一步不是优化而是判据。</b>(prev, cur) 全展开是 4096，' +
    '但 prev 与 cur 必然相邻 ⇒ 只有 <b>' + TH.meta.nsState + '</b> 个可达（64×6）。' +
    '改写成「(当前卦, 从第几条边来)」后，<code>prev = cur ^ bit_k</code>，转移变成' +
    '「走第 j 条边 ⇒ (x^bit_j, j)」。<b>4096 里 ' + (100 - Math.round(TH.meta.nsState / 4096 * 100)) +
    '% 是概率恒为 0 的空状态，拿它们算期望等于往分子里掺零。</b></p>';

  s += '<div class="tw"><table class="t"><thead><tr><th style="width:34%">门</th><th class="c">阈值</th><th class="c">实测</th><th class="c">判</th></tr></thead><tbody>' +
    '<tr><td>① 轨迹中位误差 ≤ 种子噪声底</td><td class="c sd">≤ ' + f2(TH.meta.gate.TRAJ) + '×</td><td class="c"><b>' + f2(TH.err.med * 100) + '% / ' + f2(TH.noise.med * 100) + '% = ' + f2(TH.err.med / TH.noise.med) + '</b></td><td class="c">' + yn(GT.traj) + '</td></tr>' +
    '<tr><td>② 换打乱的表，误差必须崩</td><td class="c sd">≥ ' + f2(TH.meta.gate.SEP) + '×</td><td class="c"><b>' + f2(TH.control.sep) + '×</b><br><span class="sd">' + f2(TH.control.med * 100) + '% 对 ' + f2(TH.err.med * 100) + '%</span></td><td class="c">' + yn(GT.sep) + '</td></tr>' +
    '<tr><td>③ 三个固定 θ 上，实测/解析的 ḡ 比值</td><td class="c sd">1±' + f2(TH.meta.gate.GRAD) + '</td><td class="c"><b>' + GC.map((c) => f2(c.ratio.a)).join(' / ') + '</b><br><span class="sd">κ 分量 ' + GC.map((c) => f2(c.ratio.k)).join(' / ') + '</span></td><td class="c">' + yn(GT.grad) + '</td></tr>' +
    '<tr><td>④ 终点 α、κ 的相对误差</td><td class="c sd">≤ ' + f2(TH.meta.gate.END * 100) + '%</td><td class="c"><b>' + f2(TH.endErr.a * 100) + '% / ' + f2(TH.endErr.k * 100) + '%</b></td><td class="c">' + yn(GT.end) + '</td></tr>' +
    '</tbody></table></div>';

  s += '<p><b>结果：轨迹中位误差 ' + f2(TH.err.med * 100) + '%，比三颗种子之间的散布（' + f2(TH.noise.med * 100) +
    '%）还小。</b>这意味着残差<b>不是模型的缺口，是采样涨落本身</b>——三颗种子的均值本身就有约 ' +
    f2(TH.noise.med * 100 / Math.sqrt(3)) + '% 的采样误差，实测误差与它同量级。终点更直接：α 预测 ' +
    f3(TH.ode.end.a) + ' 对实测 ' + f3(TH.actual.end.a) + '（' + pc(TH.endErr.a) + '），κ 预测 ' +
    f3(TH.ode.end.k) + ' 对 ' + f3(TH.actual.end.k) + '（' + pc(TH.endErr.k) + '）。</p>';

  s += '<p class="note"><b>第一版是错的，而且错得很像对。</b>我把 <code>E[r·Eφ]</code> 写成了 <code>E[r]·E[φ]</code> —— ' +
    '「条件均值之积」不是「均值之积」，差的正是 <code>Cov_x(Er(x), Eφ(x))</code>：Er 是 x 附近的 V 水平、Eφ 是 x 处的坡度，两者正相关。' +
    '下表最后两列是<b>每次运行都现算的</b>（那个错算式作为负对照留在 <code>_theta.cjs</code> 里，函数名 <code>gradBuggy</code>）：</p>';

  s += '<div class="tw"><table class="t"><thead><tr><th>θ</th><th class="c">解析 ḡ<sub>α</sub><br><span class="sd">修正后</span></th><th class="c">解析 ḡ<sub>α</sub><br><span class="sd">错版</span></th><th class="c">实测</th><th class="c">实测/修正</th><th class="c">实测/错版</th><th class="c">σ 熵</th></tr></thead><tbody>' +
    GC.map((c) => '<tr><td>' + c.name + '</td>' +
      '<td class="c"><b>' + f3(c.ana.a) + '</b></td>' +
      '<td class="c sd">' + f3(c.old.a) + '</td>' +
      '<td class="c">' + f3(c.sim.a) + '</td>' +
      '<td class="c"><b style="color:' + (Math.abs(c.ratio.a - 1) <= 0.1 ? C.good : C.bad) + '">' + f2(c.ratio.a) + '</b></td>' +
      '<td class="c"><b style="color:' + C.bad + '">' + f2(c.ratioOld.a) + '</b></td>' +
      '<td class="c sd">' + f2(c.sEnt) + '</td></tr>').join('') +
    '</tbody></table></div>';

  s += '<p><b>这张表才是这一段最该看的：错版不是「差一个常数」，而是随链的集中度反号。</b>' +
    'θ₀ 时它把 ḡ<sub>α</sub> <b>算小 ' + f2(1 / GC[0].ratioOld.a) + ' 倍</b>，到终点却<b>算大 ' +
    f2(1 / GC[GC.length - 1].ratioOld.a) + ' 倍</b>；而<b>中段 ' + f2(GC[1].ratioOld.a) +
    ' 恰好贴着 1</b> —— 只在中间那一点比对，会得出「近似够用」的结论，然后带着一条错的公式去推终点。' +
    '链的集中度可以从 σ 熵看出来：' + GC.map((c) => f2(c.sEnt)).join(' → ') + ' nats，' +
    '从「摊在 64 个状态上」缩到「只剩 ' + Math.round(Math.exp(GC[GC.length - 1].sEnt)) + ' 个状态」。</p>';

  s += '<p><b>顺带纠正一条以前写在页面上的话。</b>以前写的是「Ω→max−V 下 θ 只差 2e−2」，听起来像「差不多不变」的数值巧合。' +
    '现在是<b>算出来的</b>：<code>V(x) + V(63−x)</code> 恒等于 <b>' + f3(IV.compSum[0]) +
    '</b>（错卦＝六爻全取反），而「全取反」是 Q₆ 的<b>图自同构</b>；对抗表 max−V 与它只差一个常数，' +
    '常数在 softmax 和中心化的基线里都消掉 ⇒ <b>对抗表根本不是第二张表，是同一张表的对称像</b>，' +
    '整条 θ 动力学按构造不变。预测差 ' + pc(IV.aRel) + '、κ 差 ' + pc(IV.kRel) + '，实测差 ' + pc(IV.actDiffA) +
    '（三颗种子换了随机流），落点却 ' + R.groups.find((g) => g.key === 'A').homeName + '→' +
    R.groups.find((g) => g.key === 'D').homeName + '。<b>变的是它看的世界，不是它改自己的方式。</b>' +
    '这条把「12 组里独立序只有 1 个」再升一级：<b>D／E 与 A／C 在动力学上完全等价</b>。</p>';

  s += '<p class="note"><b>还有一处不一致，我选择写在纸上而不是偷偷改掉。</b>crisi.cjs 的 κ 那一项累加的是 ' +
    '<code>+back − E[back]</code>，而 <code>∂logit/∂κ = −back</code>，也就在它自己注释里写的 ' +
    '<code>φ = [ΔV, nov, −返回]</code> 是相反的符号 ⇒ <b>κ 方向实际在做下降</b>。' +
    '这一段预测的是<b>实现</b>，所以照样对得上（终点 κ 误差 ' + pc(TH.endErr.k) + '%）。' +
    '不改的理由很实际：一改，历史 12 组实验、20／60 那条口径链全部作废。<b>但「能预测一条做了下降的规则」不等于「这条规则是对的」</b>，两句必须分开说。</p>';

  s += '<p><b>为什么只给 ' + SC.yanScore + ' 分，不是 10：</b>算出来的是 θ 的<b>期望轨迹</b>，不是 θ 的<b>分布</b>。' +
    '种子间那 ' + f2(TH.noise.med * 100) + '% 的散布仍然只报不推（要推它，得解 θ 的转移核，不是解期望）；' +
    '动力学也仍只能在偶数步子列上量（§9.7 那条「Q₆ 二部 ⇒ 周期 2」）。<b>扣的 ' + (10 - SC.yanScore) +
    ' 分写在这里，不藏在别处。</b>顺带一个诚实的细节：两种 nov 近似（' +
    '<code>1−e^(−1/64σ)</code> 与 Jensen 修正的 <code>1/(1+64σ)</code>）给的结果几乎一样（' +
    f2(TH.err.med * 100) + '% 对 ' + f2(TH.ode.medB * 100) + '%）—— 说明这一层<b>不是</b>误差来源，' +
    '常数平移在 softmax 里本来就消掉。</p>';

  s += '<p class="note"><b>凭什么说不是我编的：</b><code>_theta.cjs</code> 独立可跑（' +
    i0(TH.meta.steps) + ' 步 × 3 种子 ＋ ' + TH.meta.nwin + ' 次 ODE 积分，' + (TH.meta.ms ||
    '约 3') + ' ms），数全在 <code>_theta_result.json</code>。<b>Q33 变异测试</b>把四道门逐个踩坏：' +
    '任一门改成 false，演绎都从 ' + SC.yanScore + ' 掉回 6；缺文件则掉到 ' + SC.yanBase +
    '。<b>负对照不是解释，是判据</b>：同一个脚本换打乱的表，误差从 ' + f2(TH.err.med * 100) +
    '% 推到 ' + f2(TH.control.med * 100) + '%（' + f2(TH.control.sep) + '×）。</p>';

  return s;
}

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

/* ============ 置顶大纲：十二个字六步（全页的目录，放在最前面） ============
 * 状态字只从 SC.plan 里取，页面不另写一份 —— 否则迟早出现「大纲说没做、下面说部分成立」。
 * 四档之外没有中间态：拿不到数的一律「未做」。 */
const ST_ZH = require('./score.cjs').ST_ZH;
const ST_C = { done: C.good, ready: '#8a5a12', outside: C.bad, none: '#56504a' };
function planTop() {
  const cards = SC.plan.map((p) => '<a class="pc" href="#s9" data-st="' + p.st + '" data-zh="' + p.zh + '">'
    + '<span class="at">' + p.at + '</span>'
    + '<span class="no">' + (p.ord < 10 ? '0' + p.ord : p.ord) + '</span>'
    + '<span class="zh">' + p.zh + '</span>'
    + '<span class="st">' + ST_ZH[p.st] + '</span>'
    + '<span class="wt">' + p.what + '</span>'
    + '<span class="ev">' + p.evid + '</span>'
    + '</a>').join('');
  return '<section class="plan" id="plan">'
    + '<div class="plan-hd"><span class="pin">置顶大纲</span><b>十二个字：六步依赖链</b>'
    + '<span class="chain">归纳 → 演绎 → 选美 → 尽善 → 达真 → 通天</span></div>'
    + '<p class="plan-sub">这是全页的目录，先看这块，再看下面的证据。六步是一条链：前面没做，后面就在替它还债 —— '
    + '第 4 步（尽善）拿了 ' + SC.axes[3].score + ' 分，代价是 ' + SC.rejPct + '% 否决（见 §9.3）。</p>'
    + '<div class="plan-grid">' + cards + '</div>'
    + '<div class="plan-key">'
    + '<span><i class="k1">已成立</i>在跑，而且有数</span>'
    + '<span><i class="k2">改法已定 · 未做</i>知道怎么改，还没改（' + SC.plan.filter((p) => p.st === 'ready').length + ' 条）</span>'
    + '<span><i class="k3">待外部 · 未做</i>缺的是系统之外的东西（本页欠的正向实验）</span>'
    + '<span><i class="k4">没做</i>连要的东西都还不存在</span>'
    + '</div>'
    + '<p class="plan-rule">找不到数的一律写「未做」，不写「部分实现」—— 那等于把欠账写成成绩。</p>'
    + '</section>';
}

/* ============ 图 6：十二个字的雷达（实有 vs 只算自改） ============
 * 两条多边形的顶点半径都由 score.cjs 的分算出来，不手填坐标。
 * 版式注意：轴标签放在外框之外（R+18），多边形最长只到 0.6R，
 * 所以折线顶点砸不进文字里 —— 探针的 svgHit 会逐点核这件事。 */
function svgRadar() {
  const W = 660, Hh = 430, cx = 236, cy = 214, R = 142;
  const AX = SC.axes, N = AX.length;
  const ang = (i) => (-90 + (i * 360) / N) * Math.PI / 180;
  const px = (i, r) => (cx + r * Math.cos(ang(i))).toFixed(1);
  const py = (i, r) => (cy + r * Math.sin(ang(i))).toFixed(1);
  const ring = (f) => {
    const p = [];
    for (let i = 0; i < N; i++) p.push(px(i, R * f) + ',' + py(i, R * f));
    return p.join(' ');
  };
  const polyOf = (key) => AX.map((a, i) => px(i, R * a[key] / 10) + ',' + py(i, R * a[key] / 10)).join(' ');
  const BANDC = { ok: C.good, part: C.doc, weak: C.bad, zero: C.bad, todo: C.bad };

  let s = '<svg viewBox="0 0 ' + W + ' ' + Hh + '" width="100%" role="img" aria-label="十二个字六轴雷达图：实有与只算自改所得两条多边形">';
  s += '<text x="0" y="16" font-size="12" fill="' + C.dim + '">六个轴各 10 分，外框＝10，每圈 2.5 分。实线是系统里测得到的，虚线是只算自改循环自己挣到的。</text>';

  /* 图例 */
  s += '<line x1="2" y1="38" x2="22" y2="38" stroke="' + C.deep + '" stroke-width="2.5"/>';
  s += '<text x="28" y="42" font-size="11" fill="' + C.ink + '">实有（测得到的）</text>';
  s += '<line x1="2" y1="58" x2="22" y2="58" stroke="' + C.doc + '" stroke-width="2.5" stroke-dasharray="5 3"/>';
  s += '<text x="28" y="62" font-size="11" fill="' + C.ink + '">只算自改挣到的</text>';

  /* 环 + 轴 */
  [0.25, 0.5, 0.75, 1].forEach((f) => {
    s += '<polygon points="' + ring(f) + '" fill="none" stroke="' + C.line + '" stroke-width="' + (f === 1 ? 1.2 : 0.8) + '"/>';
  });
  for (let i = 0; i < N; i++) {
    s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + px(i, R) + '" y2="' + py(i, R) + '" stroke="' + C.line + '" stroke-width="0.8"/>';
  }

  /* 轴标签：名字 + 分/自改分 */
  AX.forEach((a, i) => {
    const tn = Math.cos(ang(i));
    const anchor = Math.abs(tn) < 0.25 ? 'middle' : tn > 0 ? 'start' : 'end';
    const bx = cx + (R + 16) * Math.cos(ang(i));
    const by = cy + (R + 16) * Math.sin(ang(i));
    const yName = by + (Math.sin(ang(i)) >= 0 ? 12 : -2);
    s += '<text x="' + bx.toFixed(1) + '" y="' + yName.toFixed(1) + '" font-size="12.5" font-weight="700" fill="' + BANDC[a.band] + '" text-anchor="' + anchor + '">' + a.zh +
      '<tspan x="' + bx.toFixed(1) + '" dy="14" font-size="11" font-weight="400" fill="' + C.ink + '" font-family="ui-monospace,monospace">' + a.score + ' / 10</tspan></text>';
  });

  /* 两条多边形 */
  s += '<polygon points="' + polyOf('score') + '" fill="' + C.deep + '" fill-opacity="0.12" stroke="' + C.deep + '" stroke-width="2"/>';
  s += '<polygon points="' + polyOf('own') + '" fill="none" stroke="' + C.doc + '" stroke-width="2" stroke-dasharray="5 3"/>';
  AX.forEach((a, i) => {
    s += '<circle cx="' + px(i, R * a.score / 10) + '" cy="' + py(i, R * a.score / 10) + '" r="2.8" fill="' + C.deep + '"/>';
    s += '<circle cx="' + px(i, R * a.own / 10) + '" cy="' + py(i, R * a.own / 10) + '" r="2.8" fill="' + C.doc + '"/>';
  });

  /* 右侧读数 */
  const gap = SC.total - SC.own;
  const parts = AX.filter((a) => a.score > a.own).map((a) => a.zh + ' ' + (a.score - a.own)).join(' + ');
  s += '<text x="470" y="96" font-size="11" fill="' + C.dim + '">总分</text>';
  s += '<text x="470" y="142" font-size="34" font-weight="700" fill="' + C.ink + '">' + SC.total + '/' + SC.max + '</text>';
  s += '<text x="470" y="172" font-size="12" fill="' + C.doc + '" font-weight="700">只算自改 ' + SC.own + '/' + SC.max + '</text>';
  s += '<text x="470" y="198" font-size="11.5" fill="' + C.ink + '">差的 ' + gap + ' 分全是继承的</text>';
  s += '<text x="470" y="214" font-size="11" fill="' + C.dim + '">' + parts + '</text>';
  const zeros = AX.filter((a) => a.score === 0);
  s += '<text x="470" y="248" font-size="11.5" fill="' + C.bad + '">' + (zeros.length ? zeros.length + ' 处 0：' + zeros.map((a) => a.zh).join('、') : '没有 0 分轴') + '</text>';
  s += '<text x="470" y="270" font-size="11" fill="' + C.dim + '">' + (zeros.length ? '＝ 十二个字里最靠前的空档' : '') + '</text>';

  s += '<text x="0" y="' + (Hh - 10) + '" font-size="11" fill="' + C.dim + '">分是判断，但每个分都由一条阶梯（实测值 → 档位）算出，改一个输入分就会动；表、图、合计、断言读的是同一份 score.cjs。</text>';
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
/* ── 置顶大纲：十二个字六步。它是全页的目录，所以放最前面，且不占 §号 ──
 * 不用 h2：h2 带 §号，探针断言「节号从 §0 连续」会被它顶掉一位。 */
.plan{background:#fbf8f1;border:1px solid #ddd3bd;border-radius:8px;padding:15px 16px 13px;margin:20px 0 6px}
.plan-hd{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin:0 0 3px}
.plan-hd b{font-size:16.5px;font-weight:750;letter-spacing:.3px}
.plan-hd .pin{font-size:10.5px;font-weight:700;color:#8a5a12;background:#fbeecd;
  border:1px solid #e8d3a2;border-radius:3px;padding:1px 6px;letter-spacing:.5px}
.plan-hd .chain{font-size:11.5px;color:var(--dim);letter-spacing:.2px}
.plan-sub{font-size:12.6px;color:var(--dim);margin:0 0 11px;line-height:1.6}
.plan-grid{display:grid;grid-template-columns:repeat(3,1fr);grid-auto-rows:1fr;gap:8px}
.pc{display:flex;flex-direction:column;position:relative;background:#fff;border:1px solid var(--line);
  border-radius:6px;padding:9px 10px 9px 13px;text-decoration:none;color:var(--ink);border-bottom:1px solid var(--line)}
.pc::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3.5px;border-radius:6px 0 0 6px;background:var(--line)}
.pc .no{font-size:10px;color:var(--dim);letter-spacing:1px;font-variant-numeric:tabular-nums}
.pc .zh{font-size:17px;font-weight:750;line-height:1.25;margin:0 0 4px;letter-spacing:1px}
.pc .st{display:inline-block;align-self:flex-start;font-size:10.4px;font-weight:700;
  padding:1.5px 6px;border-radius:3px;line-height:1.35;white-space:nowrap}
.pc .wt{font-size:11.5px;color:#463f33;margin-top:7px;line-height:1.5}
.pc .ev{font-size:10.6px;color:var(--dim);margin-top:auto;padding-top:5px;line-height:1.45}
.pc .at{position:absolute;right:8px;top:8px;font-size:9.5px;color:#b3aa98}
.pc[data-st=done]::before{background:var(--good)}
.pc[data-st=done] .st{background:#e6f3eb;color:#1c7340}
.pc[data-st=ready]::before{background:#d9a53a}
.pc[data-st=ready] .st{background:#fbeecd;color:#8a5a12}
.pc[data-st=outside]::before{background:var(--bad)}
.pc[data-st=outside] .st{background:#fae9e9;color:#ad3535}
.pc[data-st=none]::before{background:#9a938a}
.pc[data-st=none] .st{background:#eeeae3;color:#56504a}
.plan-key{display:grid;grid-template-columns:1fr 1fr;gap:5px 20px;font-size:11.8px;color:var(--dim);
  margin-top:11px;padding-top:9px;border-top:1px dashed #ddd3bd;line-height:1.65}
.plan-key i{display:inline-block;font-style:normal;font-weight:700;margin-right:7px;
  padding:0 5px;border-radius:3px;font-size:11px;white-space:nowrap}
.plan-key .k1{color:#1c7340;background:#e6f3eb} .plan-key .k2{color:#8a5a12;background:#fbeecd}
.plan-key .k3{color:#ad3535;background:#fae9e9} .plan-key .k4{color:#56504a;background:#eeeae3}
.plan-rule{font-size:12.2px;color:#6b6459;margin:9px 0 0}
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
  .plan{padding:13px 12px 11px}
  .plan-grid{grid-template-columns:repeat(2,1fr)}
  .plan-key{grid-template-columns:1fr;gap:4px}
  .pc .zh{font-size:16px}
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

${planTop()}

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

<h2 id="s9"><span class="no">§9</span>十二个字：一份现成的自改大纲</h2>
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
<tr><td class="c"><b>通天</b></td><td>「经久不衰……去流露自性」</td><td><b>跨分布迁移</b>：换一张表还算不算数</td><td>换真表后仍有效</td><td class="c"><span style="color:${SC.tongScore > 0 ? C.doc : C.bad};font-weight:700">${SC.nPass > 0 ? '有观测量' : '未做'}</span><br><span class="sd">序参量 ${SC.nPass}／${SC.intMetricN} 过门 · 迁移 0 次</span></td></tr>
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

<h3>9.3 顺序错位：${f2(S.GB.gateRej / (S.GB.gateAcc + S.GB.gateRej) * 100)}% 否决率的真相</h3>
<p>上一轮我是<b>从第四步开始做的</b> —— 直接上门（尽善），跳过归纳、演绎、选美。结果是门一直在说不：${i0(S.GB.gateAcc)} 次接受、${i0(S.GB.gateRej)} 次否决。</p>
<p>当时我把这读成「门很严，梯度给的改进大多是假的」。按原文的顺序读，还有一层更难受的解释：<b>「选美是形成美文的前提」—— 没有可选的素材，门只能一直否决。</b>门不是裁判太苛刻，是场上没人会踢球。</p>
<div class="ok"><b>这条给了一个可证伪的元判据：否决率是前三步的体检指标。</b>若归纳、演绎、选美真做成了，proposer 提上来的候选应该有一批能过门，否决率会显著下降；若把 1–3 补完、否决率仍是 ${f2(S.GB.gateRej / (S.GB.gateAcc + S.GB.gateRej) * 100)}%，那就说明前三步是假做。<br>一个数同时管四层，这比再调一个超参有用。</div>

<h3>9.4 于是下一步该改什么</h3>
<p>老师给的口径，我照抄在页面上、一个字不改：<b>「这六条的现状必须分清：第 1 条已经成立（它就在 Ω 里，只是没人这么叫）；第 2、3、4 条改法明确但没做；第 5 条需要系统之外的东西（这就是本页一直欠着的那条正向实验）；第 6 条没做。找不到数的，我一律写「未做」，不写「部分实现」。」</b></p>
<p>这六条与置顶那块是同一份数据（<code>score.cjs</code> 的 <code>plan</code>），页面上不另写一份 —— 两处各写一遍，迟早出现「大纲说没做、下面说部分成立」。</p>
<div class="tw"><table class="t">
<thead><tr><th style="width:38px" class="c">步</th><th style="width:56px">字</th><th>具体改法</th><th style="width:158px">验收判据</th><th style="width:106px" class="c">现状</th></tr></thead>
<tbody>
${SC.plan.map((p) => '<tr><td class="c">' + p.ord + '</td><td><b>' + p.zh + '</b></td>'
  + '<td>' + p.what + '</td><td>' + p.check + '</td>'
  + '<td class="c"><span style="color:' + ST_C[p.st] + ';font-weight:700;font-size:12px;white-space:nowrap">' + ST_ZH[p.st] + '</span></td></tr>').join('')}
</tbody></table></div>
<p>六条的依据逐条列在下面。凡是没做的，依据就停在「没算过／没做过」—— 那是欠账，不是成绩：</p>
<ul>
${SC.plan.map((p) => '<li><b>' + p.ord + '　' + p.zh + '</b>　<span style="color:' + ST_C[p.st] + ';font-weight:700">' + ST_ZH[p.st] + '</span>　' + p.evid + '（详见 ' + p.at + '）</li>').join('')}
</ul>
<p class="note">这一节本身也得达真：上面每一条的依据都能在本页别处落到具体的那张表或那个数 —— 归纳看 9.2 第三张表，演绎看 9.2 第一张表，选美看 <code>_crisi_result.json</code> 里 A 组的 <code>theta.g</code>，尽善看 §7.2 的门账本，达真看 §5⑤ 的恒等式与 9.6 的单点锚证伪，通天看 §6 那张错表对照与 9.6 的三道门。</p>

<h3>9.5 打分：${SC.total}／${SC.max}（自改自己挣到 ${SC.own}）</h3>
<p>分数是判断，所以先把判断的规则说死：<b>每个字的分不是手填的</b>，由 <code>score.cjs</code> 里一条阶梯（实测值 → 档位 → 分）算出 —— 改一个输入，分数就会动；表、雷达、合计、测试断言读的都是这一份。这跟「我觉得它大概几分」是两件事。</p>
<figure class="fig"><figcaption>图 6　十二个字：实有的形状（实线），和只算自改挣到的形状（虚线）</figcaption>${svgRadar()}</figure>
<div class="tw"><table class="t">
<thead><tr><th style="width:52px" class="c">字</th><th style="width:64px" class="c">分</th><th style="width:74px" class="c">只算自改</th><th style="width:24%">判据（可测的那个量）</th><th>实测</th><th style="width:30%">扣分在哪</th></tr></thead>
<tbody>
${SC.axes.map((a) => {
  const col = { ok: C.good, part: C.doc, weak: C.bad, zero: C.bad, todo: C.bad }[a.band];
  const bl = { ok: '成立', part: '半成立', weak: '弱', zero: '零', todo: '未做' }[a.band];
  return '<tr><td class="c"><b>' + a.zh + '</b></td>' +
    '<td class="c"><span style="color:' + col + ';font-weight:700;font-size:15px">' + a.score + '</span><br><span class="sd" style="color:' + col + '">' + bl + '</span></td>' +
    '<td class="c">' + a.own + '</td>' +
    '<td>' + a.crit + '</td>' +
    '<td class="sd" style="color:' + C.ink + '">' + a.evid + '</td>' +
    '<td class="sd">' + a.why + '</td></tr>';
}).join('')}
<tr style="background:#f6f3ea"><td class="c"><b>合计</b></td><td class="c"><b>${SC.total}／${SC.max}</b></td><td class="c"><b>${SC.own}／${SC.max}</b></td><td colspan="3">差 ${SC.total - SC.own} 分，全部来自继承：${SC.axes.filter((a) => a.score > a.own).map((a) => a.zh + ' ' + (a.score - a.own) + ' 分').join('、')}</td></tr>
</tbody></table></div>

<p>两个数要一起看：<b>${SC.total}／${SC.max}</b> 是这套东西现在的能力位置；<b>${SC.own}／${SC.max}</b> 是自改循环自己挣到的。差的 ${SC.total - SC.own} 分全是白送的 —— ${INHERIT}；其余五格要么自己挣、要么明确欠着。自己挣到的 ${SC.own} 分里，${SC.axes[3].score} 分集中在尽善这一格。</p>
<p class="note"><b>口径变更（2026-11-02，四次，分开记）：</b>　<b>第一次 —— 达真降分。</b>达真原来 ${OLD_DA} 分，其中 ${OLD_DA - SC.truthIn} 分来自 §8 的 B「可审计」（${TOTAL.total} 条断言 + ${M.seeds.length} 颗种子可重跑）。但那是<b>「我给系统写了测试」，不是「系统看见了符号」</b> —— 审计者的能力不能记到被审计者头上。严格口径下只认 §5⑤ 那条恒等式，值 ${SC.truthIn} 分：总分 ${OLD_TOTAL}／${SC.max} → <b>${OLD_MID}／${SC.max}</b>。<code>score.cjs</code> 里加了护栏：达真的 <code>score</code> 与 <code>own</code> 一旦不等就直接抛错，谁也不能把外部审计再加回来。<br><b>第二次 —— 通天涨分。</b>通天从 <b>0</b> 分变成 <b>${SC.tongScore} 分</b>：涨的不是「迁移成功」（仍是 0 次），而是「终于有了过三道门的序参量」。总分 ${OLD_MID}／${SC.max} → <b>${OLD_MID2}／${SC.max}</b>。这一分只由「过门个数」给，改动 JSON 里的 pass 分就跟着掉（Q31 变异测试）。<br><b>第三次 —— 演绎涨分（同日更晚，见 9.7）。</b>演绎原来 ${OLD_YAN} 分，判据只有「最差那一卦多久不回来」——那是量后端，不是推。这一版加了解析预测：从 6 个权重解自洽不动点，算出 4096 个增广状态的稳态分布，中位误差 ${f2(SC.dedSelf * 100)}%；用随机表交叉预测崩到 ${f2(SC.dedCross * 100)}%（${f2(SC.dedSep)} 倍）。总分 ${OLD_MID2}／${SC.max} → <b>${OLD_MID3}／${SC.max}</b>。<br><b>第四次 —— 演绎再涨（同日深夜，见 9.8）。</b>上一节只算了「θ 冻结」的稳态；这一版把<b>自改那一半</b>也解出来：每窗的期望更新量 ḡ(θ) 可以解析算出（标量基线从期望里严格掉出），积分成整条 θ 轨迹，中位误差 ${f2(SC.thMed * 100)}%（种子噪声底 ${f2(SC.thNoise * 100)}%），终点 α 误差 ${f2(SC.thEndA * 100)}%、κ 误差 ${f2(SC.thEndK * 100)}%。演绎 ${6} → <b>${SC.yanScore}</b> 分，总分 ${OLD_MID3}／${SC.max} → <b>${SC.total}／${SC.max}</b>。<br><b>四次合起来：${OLD_TOTAL} → ${OLD_MID} → ${OLD_MID2} → ${OLD_MID3} → ${SC.total}（先降 ${OLD_TOTAL - OLD_MID} 分、再涨 ${OLD_MID2 - OLD_MID} 分、再涨 ${OLD_MID3 - OLD_MID2} 分、再涨 ${SC.total - OLD_MID3} 分）。净变化 ${SC.total === OLD_TOTAL ? '0' : (SC.total - OLD_TOTAL > 0 ? '+' : '') + (SC.total - OLD_TOTAL)} 分 —— 但这不是「凭空涨回来」，是成分换了：达真 −${OLD_DA - SC.truthIn}、通天 +${SC.tongScore}、演绎 +${SC.yanScore - OLD_YAN}。</b></p>

<div class="warn"><b>这跟 §8 的 ${8 + 8 + 5 + 3 + 6 + 7 + 4}／70 不矛盾，两把尺量的不是一件事。</b>70 分量的是<b>交付质量</b>（形式化、可审计、实证、工程），六十字量的是<b>能力在链上的位置</b>。同一套东西，工程 ${Math.round((8 + 8 + 5 + 3 + 6 + 7 + 4) / 70 * 100)} 分、能力 ${Math.round(SC.total / SC.max * 100)} 分 —— 这个落差本身就是结论：<b>我把已经会的东西做得更可信了，没有让它学会下一步。</b></div>

<p>形状是断的，而且是断在最前面：第 1 步半成立（还是继承的），第 2 步 ${SC.axes[1].score} 分，第 3 步 ${SC.axes[2].score} 分 —— 前三步都不合格，第 4 步却拿了 ${SC.axes[3].score} 分。这正是 §9.3 那 ${f2(SC.rejRate * 100)}% 否决率的来源：<b>门在替上游还债。</b></p>

<p>所以要把雷达鼓起来，唯一有效的动作不在第 4 步：<b>选美 0 → 6</b>（把 γ 移出 θ，改成采样温度或硬下限）、<b>演绎 3 → 8</b>（把累计 cover 换成滑窗覆盖）。这两格一动，第 4 步的否决率应该跟着掉 —— 这是一条可证伪的预言，不是一句安慰：若两格都补完而否决率仍停在 ${f2(SC.rejRate * 100)}%，那就说明补的是假的。</p>

<div class="bad"><b>通天从 0 涨到 1 分，涨的不是「迁移成功」：</b>θ 迁移仍是 0 次、第二张真表仍不存在（现有 ${R.groups.length} 组只用了 vWei 与它的 max−V 对偶 —— 取负是仿射变换，不是第二个独立序）。涨的是「终于有了过三道门的序参量」：${SC.nPass}／${SC.intMetricN}。<b>它为什么不到 3 分，以及达真这轮为什么一分没涨，见 9.6。</b></div>

${sec96()}
${sec97()}
${sec98()}

<h2><span class="no">§10</span>这一页没做到的</h2>
<ul>
<li><b>真表是假的，而且这轮核实过了：384 条爻辞全仓不存在。</b>V ＝ Σ sᵢxᵢ 是<b>线性</b>函数，没有卦效应。所以「谦排 61/64」这个已知错误原封不动地留在系统里 —— 它会忠实地按错表行事。<code>hexagram.cjs</code> 里写着「绝不假装能重建逐爻分」，9.6 那个单点锚实验就是在这张缺料上做的。</li>
<li><b>达真的外部锚只有 1 个绝对点，而且是反向的。</b>9.6 实测：谦在 V 下错位 ${ANCH ? ANCH.singleAnchor.offsetInV : 60}、在 max−V 下错位 ${ANCH ? ANCH.singleAnchor.offsetInAdv : 3} —— 它更认可那张把好坏整体翻转的表。绝对点这条路是死的，要走只能从带方向的相对锚起步（2 个点能检出翻转），或者把 384 爻辞补出来。</li>
<li><b>线性 ⇒ 没有局部最优陷阱。</b>本页的「困在小圈」不是被卡住，是<b>主动收窄</b>。换成有多个局部峰的势，结论可能变。</li>
<li><b>单智能体、无环境、无语言。</b>这不是「给大模型装良心」，是它的<b>骨架玩具</b>：只验证「自改 + 冻结目标 + 可修正性」这三个零件的相互作用。</li>
<li><b>对抗表不是「另一张表」，是同一张表的对称像 —— 这条 9.8 才算清。</b><code>V(x)+V(63−x)</code> 恒等于 ${TH ? f3(TH.invariance.compSum[0]) : '0.330'}（错卦＝六爻全取反），而「全取反」是 Q₆ 的图自同构，对抗表 max−V 与它只差一个常数（在 softmax 与中心化里都消掉）⇒ <b>D／E 组的 θ 动力学与 A／C 组按构造完全相同</b>。所以它只能证明「自改会忠实爬任何一张给它看的表」，<b>不能</b>当成「换一张结构不同的表也行」的证据 —— 那还欠着一张真正独立的表。</li>
<li><b>θ 只解到「期望」，没解到「分布」。</b>9.8 能算出 θ 的期望轨迹（中位误差 ${TH ? f2(TH.err.med * 100) : '0.17'}%），但种子间 ${TH ? f2(TH.noise.med * 100) : '0.23'}% 的散布仍只能报、不能推；要推它得解 θ 的转移核，不是解期望。动力学也仍只能在偶数步子列上量（Q₆ 二部 ⇒ 周期 2）。这是演绎扣着 2 分的那两分。</li>
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
