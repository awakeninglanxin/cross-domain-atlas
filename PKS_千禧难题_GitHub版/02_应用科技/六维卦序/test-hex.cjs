'use strict';
/*
 * test-hex.cjs —— 六维卦序的核验清单
 *
 * 原则：每条断言都写「期望值从哪来」。凡是转述别人结论的数字，一律要自己算一遍；
 * 算不出来就标 UNVERIFIED，绝不写成 PASS。
 *
 * 变异测试（M1–M4）用来证明判据不是恒真：把关键实现故意改错，断言必须转红。
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const H = require('./hexagram.cjs');

let pass = 0, fail = 0, unv = 0;
const lines = [];

function chk(ok, label, got) {
  if (ok) { pass++; lines.push('  PASS  ' + label + (got !== undefined ? '   [' + got + ']' : '')); }
  else { fail++; lines.push('  FAIL  ' + label + (got !== undefined ? '   实测 ' + got : '')); }
}
function unverified(label, why) {
  unv++; lines.push('  UNVER  ' + label + '   —— ' + why);
}
function sec(t) { lines.push('\n' + t); }

/* 载入被改坏的副本，用于变异测试 */
function loadMutated(file, pairs) {
  let src = fs.readFileSync(path.join(__dirname, file), 'utf8');
  for (const [from, to] of pairs) {
    if (!src.includes(from)) throw new Error('变异锚点未命中: ' + from.slice(0, 60));
    src = src.split(from).join(to);
  }
  const mod = { exports: {} };
  vm.runInNewContext(src, { module: mod, exports: mod.exports, require: require, console: console });
  return mod.exports;
}

/* ================= A. 静态骨架 ================= */
sec('A. Q₆ 静态骨架');
const q = H.q6();
chk(q.V.length === 64, 'A1 顶点数 = 64', q.V.length);
chk(q.E.length === 192, 'A2 无向边数 = 192（6·2⁵）', q.E.length);
chk(q.E.length * 2 === 384, 'A3 有向边数 = 384（＝爻辞数）', q.E.length * 2);

/* 每个顶点度数必须都是 6 */
const degOK = q.V.every((v) => q.E.filter((e) => e[0] === v || e[1] === v).length === 6);
chk(degOK, 'A4 所有顶点度数 = 6（正则性）');

/* 自同构群阶 = 2⁶·6! = 46080：用「任意置换坐标 + 任意翻转坐标」直接给出下界并核算术 */
const autOrder = Math.pow(2, 6) * 720;
chk(autOrder === 46080, 'A5 超八面体群阶 2⁶·6! = 46080', autOrder);

/* ================= B. 谱 ================= */
sec('B. 邻接谱（重数应为杨辉三角第 6 行）');
const spec = H.spectrum();
chk(spec.map((s) => s.mult).join(',') === '1,6,15,20,15,6,1', 'B1 重数 = 1,6,15,20,15,6,1',
  spec.map((s) => s.mult).join(','));
chk(spec.map((s) => s.lam).join(',') === '6,4,2,0,-2,-4,-6', 'B2 特征值 = 6−2k',
  spec.map((s) => s.lam).join(','));
chk(spec.reduce((a, s) => a + s.mult, 0) === 64, 'B3 重数之和 = 64');

/* 🔴 关键：这里不能拿「第 k 层指示向量」当特征向量 —— 它不是。
   第一版就是这么写的，报了 170 条假反例。改用张量积基。 */
const ev = H.verifyEigen();
chk(ev.checked === 4096, 'B4 恒等式逐点核验 64×64 = 4096 项', ev.checked);
chk(ev.bad.length === 0, 'B5 张量积基 A v_σ = (6−2|σ|) v_σ 无反例', ev.bad.length);

/* 反证：第 k 层指示向量确实不是特征向量（证明 B5 的改法不是多此一举） */
{
  let cnt = 0;
  for (let v = 0; v < 64; v++) {
    let c = 0, x = v; while (x) { c += x & 1; x >>= 1; }
    let s = 0;
    for (let j = 0; j < 6; j++) { let y = v ^ (1 << j), d = 0; while (y) { d += y & 1; y >>= 1; } if (d === c) s++; }
    if (s !== (6 - 2 * c)) cnt++;
  }
  chk(cnt > 0, 'B6 层指示向量不是特征向量（' + cnt + ' 个反例，证明 B5 必须换基）', cnt);
}

/* ================= C. Ihara / Ramanujan ================= */
sec('C. 非回溯矩阵与 Ramanujan 临界');
const ih = H.ihara(6);
chk(ih.onCircle === 124, 'C1 落在 √5 圆上的非平凡特征值 = 124', ih.onCircle);
chk(ih.offCircle === 4, 'C2 圆外 = 4（λ=±6 各贡献 μ=±1,±5）', ih.offCircle);
chk(ih.total === ih.expectTotal, 'C3 非平凡总数 = 2|V| = 128', ih.total + '/' + ih.expectTotal);
/* 平凡特征值个数 = 2|E| − 2|V| = 384 − 128 = 256。
   🔴 第一版写成 320（＝384−64，拿 |V| 当 2|V|），是本文件自己的算术错，不是图错。 */
chk(ih.total + 256 === 384, 'C4 128 非平凡 + 256 平凡 = 384 = 非回溯矩阵阶', ih.total + 256);

const ram = H.ramanujan();
const okN = ram.filter((r) => r.ok).map((r) => r.n);
chk(okN.join(',') === '2,3,4,5,6', 'C5 Ramanujan 性质在 n ≤ 6 成立', okN.join(','));
chk(ram.filter((r) => r.n === 6)[0].ok, 'C6 n=6 是最后一个（4 ≤ 2√5≈4.472）');
chk(!ram.filter((r) => r.n === 7)[0].ok, 'C7 n=7 失败（5 > 2√6≈4.899）');

/* ================= D. 卦序步数 ================= */
sec('D. 文王卦序（今本）');
const wenOrder = H.WEN.map((g) => g.code);
chk(new Set(wenOrder).size === 64, 'D1 64 卦互不重复', new Set(wenOrder).size);

const wWen = H.walk(wenOrder);
chk(wWen.total === 211, 'D2 今本总步数 = 211', wWen.total);
chk(wWen.within === 120, 'D3 对内（32 对）= 120', wWen.within);
chk(wWen.between === 91, 'D4 对间（31 处）= 91', wWen.between);
chk(wWen.within + wWen.between === wWen.total, 'D5 120 + 91 = 211（自洽）');
chk(wWen.steps.length === 63, 'D6 共 63 步 = 64−1（哈密顿路径）', wWen.steps.length);

const grayOrder = [];
for (let i = 0; i < 64; i++) grayOrder.push(H.gray(i));
const wGray = H.walk(grayOrder);
chk(wGray.total === 63, 'D7 格雷码总步数 = 63（理论下界）', wGray.total);
chk(wGray.steps.every((d) => d === 1), 'D8 格雷码每步距离都是 1');

/* 泰否反码 */
const tai = H.codeOf('乾', '坤'), fou = H.codeOf('坤', '乾');
chk(tai === 56, 'D9 泰 = 56', tai);
chk(fou === 7, 'D10 否 = 7', fou);
chk(tai + fou === 63 && H.cuo(tai) === fou, 'D11 泰否严格互为反码（56+7=63）');

/* 京房 / 邵雍 / 帛书三套卦序已在 K 段真复现（93 / 120 / 141 全部命中），此条 UNVERIFIED 撤销 */

/* ================= E. 互卦 ================= */
sec('E. 互卦算子 H');
const huo = H.huOrbit();
chk(huo.sizes[0] === 64 && huo.sizes[1] === 16 && huo.sizes[2] === 4, 'E1 象集 64 → 16 → 4',
  huo.sizes.join('→'));
chk(huo.sizes[3] !== undefined && huo.sizes[3] === 4, 'E2 收敛后稳定在 4', huo.sizes.slice(2).join('→'));
const tnames = huo.terminal.map((t) => t.name).sort().join(',');
chk(tnames === '乾,坤,既济,未济', 'E3 终局四卦 = 乾坤既济未济', tnames);
chk(huo.allFixed, 'E4 每个终局点在 H 下周期 ≤ 2', huo.cyc.map((c) => c.period).join(','));
/* 🔴 「不动点」这个说法不准：乾坤周期 1，既济未济周期 2 */
const p1 = huo.cyc.filter((c) => c.period === 1).length;
chk(p1 === 2, 'E5 真正不动的只有 2 个（乾坤），另 2 个是 2-周期', p1);

/* ================= F. Coxeter ================= */
sec('F. Coxeter 投影（B₆, h = 2n = 12）');
/* 阶必须是 12 */
{
  let v = 0, k = 0;
  do { v = H.bitsToCode(H.cox(H.codeToBits(v))); k++; } while (v !== 0 && k < 100);
  chk(k === 12, 'F1 c 的阶 = 12（＝幂等指数 h）', k);
}
const P = H.coxProjection();
chk(P.eigErr < 1e-12, 'F2 特征向量残差 < 1e-12', P.eigErr.toExponential(2));
chk(P.groups.length === 6, 'F3 64 个卦分成 6 个轨道', P.groups.length);
chk(P.groups.map((g) => g.size).sort().join(',') === '12,12,12,12,12,4',
  'F4 轨道长度 = 五个 12 + 一个 4', P.groups.map((g) => g.size).join(','));

const outer = P.groups.filter((g) => g.size === 12).sort((a, b) => b.rMin - a.rMin)[0];
const xx = H.xiaoxiCodes();
chk(outer.names.slice().sort().join(',') === H.XIAOXI.slice().sort().join(','),
  'F5 最外圈 12 个 = 十二消息卦', outer.names.join(''));
chk(xx.every((c) => outer.names.includes(H.BY_CODE[c].name)), 'F6 消息卦码逐个落在最外圈');

const center = P.groups.filter((g) => g.size === 4)[0];
chk(center.rMin < 1e-9 && center.rMax < 1e-9, 'F7 中心的 4 个半径精确为 0',
  center.rMax.toExponential(1));
chk(center.names.slice().sort().join(',') === ['中孚', '小过', '随', '蛊'].sort().join(','),
  'F8 中心四卦 = 中孚/小过/随/蛊', center.names.join(''));

/* 每一层内部半径严格相等（投影的同心性） */
const flats = P.groups.map((g) => g.flat);
chk(flats.every((f) => f < 1e-12), 'F9 六层各自内部半径完全相等（起伏 < 1e-12）',
  Math.max(...flats).toExponential(1));

/* 外圈半径 = 2·2cos(π/12)（本投影未归一化，归一化后即文档的 1.9319） */
const r12 = 2 * Math.cos(Math.PI / 12);
chk(Math.abs(P.maxR / (2 * r12) - 1) < 1e-12, 'F10 外圈半径 / (2·2cos(π/12)) = 1',
  (P.maxR / (2 * r12)).toFixed(12));
chk(Math.abs(P.maxR / 2 - 1.9318516525781366) < 1e-12,
  'F11 归一化后外圈半径 = 1.931852 = 2cos(π/12)', (P.maxR / 2).toFixed(6));

/* ================= G. 4 与 6 ================= */
sec('G. 「四」与「六」到底同不同构');
/* 2⁶ → 4³ 只是**集合**双射（64 个元素），不是群同构 */
const img = new Set();
for (let v = 0; v < 64; v++) img.add(H.toBase4(v));
chk(img.size === 64, 'G1 相邻两两分组给出 64→64 的集合双射', img.size);
/* 群同构的必要条件：元素阶分布必须一致。(Z/2)⁶ 全是 2 阶；(Z/4)³ 有 4 阶元素 */
const q6HasOrder4 = false;              /* (Z/2)⁶ 每个非零元阶都是 2 */
const z4HasOrder4 = true;               /* (Z/4)³ 里 (1,0,0) 的阶是 4 */
chk(q6HasOrder4 !== z4HasOrder4, 'G2 阶分布不同 ⇒ (Z/2)⁶ 与 (Z/4)³ 只同基数，不同构');
/* 4×6 = 24，24 = 4! = 立方体旋转群阶（S₄）—— 这是真算术，但机制与「四象×六爻」无关 */
chk(4 * 6 === 24 && 24 === [1, 2, 3, 4].reduce((a, b) => a * b), 'G3 4×6 = 24 = 4!', '24');

/* 四元数转角 */
chk(Math.abs(H.report().turn - 126.86989764584402) < 1e-10, 'G4 2·arccos(1/√5) = 126.8699°',
  H.report().turn.toFixed(4));

/* ---- C₆₄ = {±1,±3}³ 与六十四卦的双射 ---- */
const seenC = new Map();
let cBad = 0, cRound = 0;
for (let v = 0; v < 64; v++) {
  const p3 = H.guaToC(v);
  if (p3.some((c) => H.C_AXIS.indexOf(c) < 0)) cBad++;
  const k = p3.join(',');
  if (seenC.has(k)) cBad++;
  seenC.set(k, v);
  if (H.cToGua(p3[0], p3[1], p3[2]) !== v) cRound++;
}
chk(seenC.size === 64 && cBad === 0, 'G6 64 卦 → 64 个互不相同的 C 点，坐标全在 {±1,±3}', seenC.size);
chk(cRound === 0, 'G7 卦 → C 点 → 卦 往返恒等', cRound + ' 个失败');
chk(H.guaToC(63).join(',') === '3,3,3', 'G8 乾 = (3,3,3)（体对角一端）', H.guaToC(63).join(','));
chk(H.guaToC(0).join(',') === '-3,-3,-3', 'G9 坤 = (−3,−3,−3)（另一端）', H.guaToC(0).join(','));
/* 乾坤必须是全部 64 点里距离最大的一对 */
{
  const pts = [];
  for (let v = 0; v < 64; v++) pts.push(H.guaToC(v));
  let dmax = 0, argmax = null;
  for (let i = 0; i < 64; i++) for (let j = i + 1; j < 64; j++) {
    const d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1], pts[i][2] - pts[j][2]);
    if (d > dmax) { dmax = d; argmax = [pts[i], pts[j]]; }
  }
  chk(Math.abs(dmax - 6 * Math.sqrt(3)) < 1e-12, 'G10 最大距离 = 6√3，且发生在乾坤之间',
    dmax.toFixed(4) + ' @ ' + argmax.map((p) => '(' + p.join(',') + ')').join('–'));
}

/* 佛陀罗尼的算术链 */
chk(4 * 6 === 24 && 4 * 24 === 96 && 96 + 4 === 100, 'G5 四六二十四 → 九十六 → 加四得百', '24/96/100');

/* ============ I. 从无极到十二地支：一条链，两套规则 ============ */
sec('I. 从无极到十二地支（生成 vs 选择）');

const XC = H.xiaoxiChain();
chk(XC.codes.length === 12 && XC.codes.every((c) => c !== null) && XC.names.length === 12,
  'I1 十二辟卦 12 个名字全部命中卦表', XC.codes.join(','));
/* 判据不是抄一张表：给它一条规则（阳/阴连号且贴一端），让它自己把 12 个挑出来 */
chk(XC.union === 12 && XC.unionEqualsXiaoxi && XC.famA === 7 && XC.famB === 7 && XC.inter === 2,
  'I2 选择规则可复现：两族各 7 + 7，交 2（乾/坤），并集恰 = 十二辟卦',
  XC.famA + ' + ' + XC.famB + ' − ' + XC.inter + ' = ' + XC.union);
chk(XC.closedWalk, 'I3 这 12 个在 Q₆ 上首尾相接成一圈，12 步每步汉明距恰为 1',
  XC.steps.join(''));
chk(XC.yang.join(',') === '1,2,3,4,5,6,5,4,3,2,1,0', 'I4 阳爻数 1→6→0，单调升到乾再单调降',
  XC.yang.join(','));

const LD = H.ladder();
chk(LD.mod !== 0, 'I5 64 mod 12 = 4 ≠ 0 ⇒ 12 不是 64 的因子，不可能由二分细分得到', LD.mod);
chk(!LD.twelveIsPow2 && LD.twelveAs34 === 12,
  'I6 12 不是 2 的幂；12 = 3×4，那个 3 是「三才」，不是二分的产物', '12 = 3 × 4');
{
  const gen = LD.steps.filter((x) => x.kind === '生成');
  const pow = gen.map((x) => x.count).join(',');
  const kinds = Array.from(new Set(LD.steps.map((x) => x.kind))).sort().join(',');
  chk(gen.length === 7 && pow === '1,2,4,8,16,32,64', 'I7 生成长度 = 7 步，计数 1·2·4·8·16·32·64', pow);
  /* 🔴 别把期望值写成我脑内想的顺序：sort() 按码位排，中文不等于我写的字面序。
     要比就两边都 sort。 */
  chk(kinds === ['立论', '生成', '选择'].sort().join(','), 'I8 阶梯只用三种口径：立论 / 生成 / 选择', kinds);
  chk(LD.steps[0].count === null && LD.steps[8].count === 12 && LD.steps[9].count === 12,
    'I9 无极不算生成（没有数）；「12」出现两次都是「选择」', LD.steps[0].kind + ' / ' + LD.steps[8].kind);
}

/* ================= H. 变异测试 ================= */
sec('H. 变异测试（证明判据不是恒真）');

/* M1 位序改成 bit5=上爻 ⇒ 泰应变成 7 */
try {
  const M = loadMutated('hexagram.cjs', [
    ['function bitsOf(lower, upper) { return triBits(TRI[lower]).concat(triBits(TRI[upper])); }',
     'function bitsOf(lower, upper) { return triBits(TRI[upper]).concat(triBits(TRI[lower])); }'],
  ]);
  const taiM = M.codeOf('乾', '坤');
  chk(taiM === 7, 'M1 位序反转 ⇒ 泰从 56 变 7，D9 能抓到', taiM);
} catch (e) { chk(false, 'M1 变异载入失败：' + e.message); }

/* M2 Coxeter 算子改成「左移 + 末位取反」⇒ 消息卦轨道应消失 */
try {
  const M = loadMutated('hexagram.cjs', [
    /* 🔴 第一版这里写的是「左移 + 末位取反」—— 那恰好是 c 的**逆**。
       逆元生成同一个循环群，轨道分解当然一模一样，于是变异测了个寂寞。
       真正能破坏结构的是**去掉取反**：c 变成纯 6 位循环移位，阶从 12 掉到 6。 */
    ['function cox(bits) {\n  return [1 - bits[5], bits[0], bits[1], bits[2], bits[3], bits[4]];\n}',
     'function cox(bits) {\n  return [bits[5], bits[0], bits[1], bits[2], bits[3], bits[4]];\n}'],
  ]);
  const PM = M.coxProjection();
  const om = PM.groups.filter((g) => g.size === 12).sort((a, b) => b.rMin - a.rMin)[0];
  const same = om ? om.names.slice().sort().join(',') === M.XIAOXI.slice().sort().join(',') : false;
  chk(!same, 'M2 去掉取反 ⇒ 12 长轨道消失/不再是消息卦，F4+F5 能抓到',
    om ? same ? '仍相同(判据失效)' : '已改变' : '无 12 长轨道');
} catch (e) { chk(false, 'M2 变异载入失败：' + e.message); }

/* M3 互卦取位改错 ⇒ 象集不再是 64→16→4 */
try {
  const M = loadMutated('hexagram.cjs', [
    ['return [bits[1], bits[2], bits[3], bits[2], bits[3], bits[4]];',
     'return [bits[1], bits[2], bits[3], bits[4], bits[5], bits[0]];'],
  ]);
  const hm = M.huOrbit();
  chk(hm.sizes[1] !== 16 || hm.sizes[2] !== 4, 'M3 互卦取位改错 ⇒ 象集大小变化，E1 能抓到',
    hm.sizes.slice(0, 3).join('→'));
} catch (e) { chk(false, 'M3 变异载入失败：' + e.message); }

/* M4 把 Ramanujan 界放宽一倍 ⇒ n=7 会被误判通过 */
try {
  const M = loadMutated('hexagram.cjs', [
    ['const lhs = n - 2, rhs2 = 4 * (n - 1);', 'const lhs = n - 2, rhs2 = 16 * (n - 1);'],
  ]);
  const r7 = M.ramanujan().filter((r) => r.n === 7)[0];
  chk(r7.ok === true, 'M4 界放宽 ⇒ n=7 误判通过，C7 能抓到', r7.ok);
} catch (e) { chk(false, 'M4 变异载入失败：' + e.message); }

/* ============ J. 源清单完整性（防「信息在整理过程中被丢掉」） ============ */
sec('J. 源视频清单完整性');
{
  const S = require('./sources.cjs');
  const links = S.CORE.map((c) => c.link).concat(S.PENDING.map((p) => 'http://yb.woa.com/' + p.id));
  const sph = S.SPH.map((x) => x.id);
  chk(S.CORE.length === 6 && S.PENDING.length === 3, 'J1 核心 6 部 + 待完善 3 部', S.CORE.length + ' + ' + S.PENDING.length);
  /* 🔴 这里原来写成 /^http:\/\/yb\.woa\.com\/\w+$/ —— 反斜杠在两次转义里被吃掉，
     编译直接语法错。判据别绕远路：直接前缀比较，短链只允许 [A-Za-z0-9]。 */
  const okLink = (u) => u.indexOf('http://yb.woa.com/') === 0 && u.length > 20 && /^[A-Za-z0-9]+$/.test(u.slice(19));
  chk(links.length === 9 && new Set(links).size === 9 && links.every(okLink),
    'J2 九条原始短链全在、无重复、格式统一', links.length);
  chk(sph.length === 9 && new Set(sph).size === 9, 'J3 九条视频号公开短链全在、无重复', sph.length);
  chk(S.CORE.every((c) => Array.isArray(c.pts) && c.pts.length >= 6),
    'J4 六部核心每部至少 6 条核心要点，没有一部写成空壳',
    S.CORE.map((c) => c.pts.length).join(','));
  chk(S.THREADS.length === 3 && S.GENEA.length === 7 && S.BOUNDS.length === 4 && S.FIGURES.length === 14,
    'J5 三条主线 / 七条谱系 / 四条边界 / 十四项图型索引 一条不少',
    [S.THREADS.length, S.GENEA.length, S.BOUNDS.length, S.FIGURES.length].join('/'));
}

/* ============ K. 四项「未复现」的复现 ============ */
sec('K. 四项复现：三套卦序 / 金缕衣 / 云肩 / Doob');

/* --- K-1 京房八宫 --- */
const ORD = H.orders();
const JF = ORD.jingfang;
chk(JF.unique === 64 && JF.total === 93, 'K1 京房八宫：64 卦不重不漏，总步数 93', JF.total);
chk(JF.innerPattern, 'K2 京房的结构判据：宫内前六步各变一爻（1），第七步归魂变下卦三爻（3）',
  JF.rows[0].steps.join(','));
chk(JF.between.join(',') === '3,3,3,3,3,3,3',
  'K3 八宫之间的七条衔接也全是 3', JF.between.join(','));
{
  const h = JF.hist;
  chk(h[1] === 48 && h[3] === 15 && 1 * 48 + 3 * 15 === 93,
    'K4 京房 93 的账：48 步各 1 爻 + 15 步各 3 爻 = 93', '48×1 + 15×3');
}

/* --- K-2 邵雍先天圆图 --- */
chk(ORD.shaoyong.total === 120, 'K5 邵雍先天圆图（乾→…→坤，卦号递减）总步数 120', ORD.shaoyong.total);
chk(ORD.shaoyong.seq[0] === 63 && ORD.shaoyong.seq[63] === 0,
  'K6 圆图首尾是乾(63) 与坤(0)', ORD.shaoyong.seq[0] + '→' + ORD.shaoyong.seq[63]);

/* --- K-3 帛书 --- */
const BS = ORD.boshu;
chk(BS.unique === 64 && BS.total === 141, 'K7 帛书卦序：64 卦不重不漏，总步数 141', BS.total);
chk(BS.diagIsGong, 'K8 帛书的排布是 8×8 循环拉丁方：对角线八格全是「上卦=下卦」= 本宫卦', '');
chk(BS.names.slice(0, 8).join('') === '乾否遯履讼同人无妄姤',
  'K9 拉丁方规则能一字不差地复原键宫八卦（乾·否·遯·履·讼·同人·无妄·姤）', BS.names.slice(0, 8).join(''));
{
  /* 拉丁方性质：每行的下卦序列是同一循环的移位 ⇒ 每行恰好覆盖八个八卦 */
  const ok = BS.rows.every((r) => new Set(r.cells.map((c) => c.lo)).size === 8)
    && [0, 1, 2, 3, 4, 5, 6, 7].every((j) => new Set(BS.rows.map((r) => r.cells[j].up)).size === 8);
  chk(ok, 'K10 拉丁方：每行下卦八个不同、每列上卦八个不同', '');
}
{
  const g = ORD.table.map((x) => x.v);
  chk(g.join(',') === '63,93,120,141,192,211',
    'K11 六套卦序的步数榜：格雷 63 < 京房 93 < 邵雍 120 < 帛书 141 < 随机 192 < 今本 211',
    g.join(' < '));
}

/* --- K-4 云肩：亏格 17 --- */
const G = H.genus();
chk(G.V === 64 && G.E === 192 && G.girth === 4, 'K12 Q₆：64 顶点 / 192 边 / 最短环 4', '');
chk(G.Fmax === 96, 'K13 每个面至少 4 条边 ⇒ 2E ≥ 4F ⇒ 面数 F ≤ 96', G.Fmax);
chk(G.chi === -32 && G.gMin === 17,
  'K14 Euler 公式：64 − 192 + 96 = −32 = 2 − 2g ⇒ g ≥ 17（这一步不引用任何定理）', G.gMin);
chk(G.quadOnly, 'K15 若 g = 17 则 F 必为 96，而 4×96 = 384 = 2×192 ⇒ 面必须全是四边形', '');
{
  const bad = G.ringel.filter((r) => !r.agree);
  chk(bad.length === 0 && G.ringel.length === 6,
    'K16 Ringel 公式 γ(Q_n) = (n−4)·2^{n−3}+1 在 n=3…8 上都等于下界公式（0,1,5,17,49,129）',
    G.ringel.map((r) => 'n=' + r.n + ':' + r.gRingel).join(' '));
}
chk(G.crossCheck.q6 === 17 && G.crossCheck.q8 === 129,
  'K17 交叉印证：同一个公式给出 Q₆=17（云肩）与 Q₈=129（素材里的「Mumford 皮 亏格129」）',
  G.crossCheck.q6 + ' / ' + G.crossCheck.q8);

/* --- K-5 金缕衣 --- */
const A3 = H.ham3();
chk(A3.lens.join(',') === '64,64,64' && A3.vertexOK,
  'K18 金缕衣：三条回路各走满 64 个顶点，不重不漏', A3.lens.join(','));
chk(A3.stepOK, 'K19 每条回路上相邻两点都只差一爻（汉明距 1）', '');
chk(A3.edgeUnion === 192 && A3.dupEdges === 0,
  'K20 三条回路两两边不交，并集恰为 Q₆ 的全部 192 条边', A3.edgeUnion + ' 边 / 重复 ' + A3.dupEdges);
chk(A3.ringTotal === 3, 'K21 收敛判据：三色的环数之和降到 3（即每色恰好一个环）', A3.ringTotal);

/* --- K-6 Doob --- */
const DW = H.weiDist();
chk(DW.dist.join(',') === '1,6,15,20,15,6,1', 'K22 当位数的分布 = C(6,k) = 1,6,15,20,15,6,1（又是杨辉三角第 6 行）',
  DW.dist.join(','));
chk(DW.dist.join(',') === DW.expect.join(','), 'K23 与二项式系数逐项相等', '');
chk(DW.extremes[6].join('') === '既济' && DW.extremes[0].join('') === '未济',
  'K24 六爻全当位只有既济，六爻全失位只有未济 —— 两个极端各一个，不是巧合',
  DW.extremes[6].join('') + ' / ' + DW.extremes[0].join(''));
{
  const z = H.doobScan(0);
  chk(Math.abs(z.H - Math.log(6)) < 1e-9 && Math.abs(z.lowFlow - 7 / 64) < 1e-9,
    'K25 β=0 时退化为均匀游走：熵率 = ln6 = 1.791759，低位流量 = 7/64 = 10.94%',
    z.H.toFixed(6));
}
{
  const inf = H.doobScan(60);
  chk(inf.H > 0.85, 'K26 模型 A（势=当位数，7 档且对称）无论 β 多大熵率都压不下去，有正下界', inf.H.toFixed(4));
  const b4 = H.doobScanB(4), b20 = H.doobScanB(20);
  chk(b4.H < 0.1 && b20.H < 0.005,
    'K27 模型 B（势=爻位×阴阳，六档互不相同）β=4 时 0.043、β=20 时趋零 —— 与原文 β=4 的 0.02 同量级',
    b4.H.toFixed(4) + ' → ' + b20.H.toFixed(5));
  chk(b4.H < inf.H / 10, 'K28 破对称是关键：同一 β 下 B 的熵率不到 A 的十分之一', (inf.H / b4.H).toFixed(1) + ' 倍');
}

/* ================= L 段：爻位吉凶分 → 势函数 → 税（2026-11-01） =================
 * 数据来源：源作者视频第 1 帧组的柱状图。六个数是我从截图逐字读的，
 * 论文正文没有拿到 ⇒ 只敢用「位平均」，不敢重建 384 条逐爻分。
 */
{
  const YS = H.yaoScoreCheck();
  const CL = H.scoreCurve();

  chk(Math.abs(H.scoreScan(0).H - Math.log(6)) < 1e-12,
    'L1 β=0 ⇒ 均匀游走，熵率精确等于 ln6 = 1.791759（与本库其它 β=0 处的口径一致）',
    H.scoreScan(0).H.toFixed(12));
  chk(Math.abs(YS.sum - 0.33) < 1e-9 && Math.abs(YS.range - 1.20) < 1e-9,
    'L2 六个位平均分之和 0.33、极差 1.20 —— 极差只有 1.2，这决定了后面 β 要多大才够',
    YS.sum.toFixed(2) + ' / ' + YS.range.toFixed(2));
  chk(YS.hi.name === '兑' && Math.abs(YS.hi.s - 1.25) < 1e-9,
    'L3 势最高的卦是兑（阳在二四五），V = 0.38+0.26+0.57 = 1.25',
    YS.hi.name + ' ' + YS.hi.s.toFixed(3));
  chk(YS.lo.name === '艮' && Math.abs(YS.lo.s + 0.92) < 1e-9,
    'L4 势最低的卦是艮（阳只在三、上），V = −0.63−0.29 = −0.92',
    YS.lo.name + ' ' + YS.lo.s.toFixed(3));
  const xs = YS.xici;
  chk(xs['二>四（二多誉、四多惧）'] === true && xs['三<0（三多凶）'] === true && xs['五为最大（五多功）'] === true,
    'L5 三条古训全部被这六个数打中：二>四、三<0、五最大（《系辞下》「二多誉四多惧、三多凶五多功」）',
    JSON.stringify(xs));

  const s1 = H.scoreScan(1);
  chk(s1.dev >= 0 && s1.dev < 1e-15,
    'L6 平稳分布的闭式 π ∝ a·S 与幂迭代独立算出的结果一致（不是自己证明自己）',
    s1.dev.toExponential(2));
  const ds = [0, 0.5, 1, 2, 3].map((b) => H.scoreScan(b).downFlow);
  chk(ds.every((x) => Math.abs(x - 0.5) < 1e-12),
    'L7 🔴 下山流量恒等于 0.5，与 β 无关 —— 可逆性逼迫上山步与下山步平稳流量对半，' +
    '所以「约束有多硬」不能用它当判据（我原先那条判据在数学上不成立）',
    ds.map((x) => x.toFixed(3)).join(','));

  chk(CL.betaLo !== null && CL.betaHi !== null && CL.betaLo < CL.betaHi,
    'L8 良心的工作区间非空：β_lo（熵率掉到 95%）< β_hi（最差卦百万步才轮到一次）',
    '[' + CL.betaLo + ', ' + CL.betaHi + ']');
  chk(CL.betaHi < 4,
    'L9 🔴 原文的 β=4 已经越过上界 —— 按「可修正性」这把尺子，它落在麻木区里',
    'β_hi = ' + CL.betaHi);
  const b4 = H.scoreScan(4);
  chk(b4.H > 1.0,
    'L10 🔴 但用这六个位平均分，β=4 的熵率是 1.25，不是 0.02 —— 位平均分不足以复现那个点',
    b4.H.toFixed(4));
  chk(CL.betaH02 !== null && CL.betaH02 / (1 / 0.04) > 0.8 && CL.betaH02 / (1 / 0.04) < 1.4,
    'L11 要压到 0.02 需要 β≈26.5，而 1/最小的爻位分 = 1/0.04 = 25 —— ' +
    '初爻那 0.04 几乎中性，是它决定了良心要硬到什么程度',
    CL.betaH02 + ' vs ' + (1 / 0.04).toFixed(0));

  const I1 = H.islands([2, 3]);
  chk(I1.components === 4 && I1.sizes.every((x) => x === 16),
    'L12 「在人道（三、四爻）方向刷一堵墙」⇒ Q₆ 裂成 4 块、每块 16 卦，与视频那帧的「4 块孤岛」对上',
    I1.components + ' 块 / ' + I1.sizes.join(','));
  const I2 = H.islands([2]), I3 = H.islands([0, 2, 5]);
  chk(I2.components === 2 && I2.sizes.join(',') === '32,32' &&
    I3.components === 8 && I3.sizes.every((x) => x === 8),
    'L13 一般律：删 k 维 ⇒ 恰好 2^k 块、每块 2^(6−k) 卦（k=1→2 块、k=3→8 块）',
    I2.sizes.join(',') + ' | ' + I3.sizes.join(','));

  const L = H.edgeLedger();
  chk(L.directed === 384 && L.undirected === 192 && L.same === true,
    'L14 64 卦 × 6 爻 = 384 条有向边 = 384 条爻辞；这不是巧合，是同一个「6」的两面',
    L.directed + ' / ' + L.undirected);

  const T = H.taxDemo(63);
  chk(T.sameEndpoints === true && Math.abs(T.prod - T.endToEnd) < 1e-12,
    'L15 🔴 「累的是乘法不是加法」的数学含义：三步的税之积恒等于 exp(β(ΔV))，' +
    '只与两端有关 ⇒ 这种税必然来自一个势函数（视频只说了前半句）',
    T.prod.toFixed(6) + ' = ' + T.endToEnd.toFixed(6));

  /* 🔴 反证：位平均势与「谦卦六爻皆吉、定为最高原则」不能同时成立 */
  const QIAN = H.codeOf('艮', '坤');
  const rank = [];
  for (let v = 0; v < 64; v++) rank.push({ v, s: H.yaoScoreSum(v) });
  rank.sort((a, b) => b.s - a.s);
  const pos = rank.findIndex((x) => x.v === QIAN) + 1;
  chk(pos > 55 && Math.abs(H.yaoScoreSum(QIAN) + 0.63) < 1e-9,
    'L16 🔴 谦卦在位平均势下 V = −0.63、排 ' + pos + '/64（几乎垫底），' +
    '而视频说「谦卦六爻皆吉 ⇒ 定为最高原则」——两个口径不能同时成立：' +
    '吉凶 = 位效应 + 卦效应，位平均只给了前半截，卦效应（384 条逐爻分）我没有',
    '谦 ' + H.yaoScoreSum(QIAN).toFixed(2) + ' @' + pos);
  chk(rank[0].v !== QIAN && H.BY_CODE[rank[0].v].name === '兑',
    'L17 位平均势的首位是兑，不是谦 —— 说明「位」这一维上兑占优，谦的吉来自「卦」那一维',
    H.BY_CODE[rank[0].v].name);
}

/* M7 把五爻的分从 +0.57 改成 −0.57 ⇒ 「五多功」必须立刻不成立、极值卦也必须换掉 */
try {
  const M = loadMutated('hexagram.cjs', [
    ["const YAO_SCORE = [0.04, 0.38, -0.63, 0.26, 0.57, -0.29];",
      "const YAO_SCORE = [0.04, 0.38, -0.63, 0.26, -0.57, -0.29];"],
  ]);
  const m = M.yaoScoreCheck();
  chk(m.xici['五为最大（五多功）'] === false && m.hi.name !== '兑',
    'M7 五爻分翻号 ⇒ 「五多功」转红、势最高的卦不再是兑，L3/L5 能抓到',
    'hi = ' + m.hi.name);
} catch (e) { chk(false, 'M7 变异载入失败：' + e.message); }

/* M5 把消息卦顺序挪一格（复↔临互换）⇒ 12 步闭环应断开，I3 必须转红 */
try {
  const M = loadMutated('hexagram.cjs', [
    ["const XIAOXI = ['复', '临', '泰',", "const XIAOXI = ['临', '复', '泰',"],
  ]);
  const xm = M.xiaoxiChain();
  chk(xm.closedWalk === false, 'M5 顺序挪一格 ⇒ 闭环断，I3 能抓到',
    xm.steps.join(''));
} catch (e) { chk(false, 'M5 变异载入失败：' + e.message); }

/* M6 京房八宫：把乾宫第二卦「姤」换成「复」⇒ 93 变 101、且与坤宫重复（unique 63），K1 转红 */
try {
  const M = loadMutated('hexagram.cjs', [
    ["{ gong: '乾', gua: ['乾', '姤',", "{ gong: '乾', gua: ['乾', '复',"],
  ]);
  const o = M.orders();
  chk(o.jingfang.total !== 93, 'M6 京房表改一个卦 ⇒ 93 立刻不是 93，K1 能抓到',
    '变成 ' + o.jingfang.total);
} catch (e) { chk(false, 'M6 变异载入失败：' + e.message); }

/* ================= N 段：元宝算法文档（v17 章）逐条对账（2026-11-01） =================
 * 源：_src_yuanbao/ 下的两份原件。这里不复制文档的结论，而是把它的每个数重算。
 * 判定四档由 hexagram.cjs 的 docAudit() 给：ok / diff / contra / na。
 */
{
  const A = H.docAudit();
  const by = { ok: 0, diff: 0, contra: 0, na: 0 };
  A.forEach((r) => { by[r.verdict]++; });
  const get = (item) => A.filter((r) => r.item === item)[0];

  chk(A.length >= 48 && by.ok + by.diff + by.contra + by.na === A.length,
    'N1 对账表结构完整：共 ' + A.length + ' 项，四档判定全部有归属（不重不漏）',
    JSON.stringify(by));
  chk(by.ok >= 38, 'N2 其中逐位相等的 ≥ 38 项 —— 文档的硬数字大部分是真算过的', by.ok + '/' + A.length);
  chk(by.contra === 2, 'N3 🔴 恰好 2 项是「文档自己跟自己矛盾」（β=4 的熵率、以及 β→∞ 的地板）', by.contra);
  chk(by.na >= 3, 'N4 不可复算的项如实标 na（RSI 时间线 / Lean 仓库 / 信念级结论），没有混进 PASS', by.na);

  /* 几何 */
  chk(get('顶点数').verdict === 'ok' && get('无向边数').verdict === 'ok' && get('有向边数 64×6').verdict === 'ok',
    'N5 64 顶点 / 192 边 / 384 有向边 —— 与文档逐位相同', get('有向边数 64×6').mine);

  /* 谱与非回溯 */
  chk(get('谱重数 = 杨辉三角第 6 行').verdict === 'ok',
    'N6 谱重数 1,6,15,20,15,6,1 = 杨辉三角第 6 行', get('谱重数 = 杨辉三角第 6 行').mine);
  const IH = H.ihara(6).full;
  chk(IH.onCircle === 124 && IH.modOne === 258 && IH.modFive === 2 && IH.total === 384,
    'N7 非回溯矩阵 384 阶 = ｜μ｜=√5 的 124 ＋ ｜μ｜=1 的 258 ＋ ｜μ｜=5 的 2 —— 三笔账合起来正好 384',
    IH.onCircle + '+' + IH.modOne + '+' + IH.modFive + '=' + IH.total);
  chk(IH.trivial === 256 && IH.modOneFromLam === 2,
    'N8 那 258 里，256 是 d-正则图的平凡根 ±1（各 m−n = 128 个），另外 2 个是 λ=±6 贡献的',
    IH.trivial + ' + ' + IH.modOneFromLam);
  chk(get('Ramanujan 条件 n−2 ≤ 2√(n−1) 的最后一个个案').mine === 'n = 6',
    'N9 Ramanujan 条件 n−2 ≤ 2√(n−1)：n=6 通过（4 ≤ 4.472）、n=7 破裂（5 > 4.899）⇒ 六是最后一个',
    get('Ramanujan 条件 n−2 ≤ 2√(n−1) 的最后一个个案').mine);

  /* 幂等量 */
  chk(get('对称变换数 2⁶·6!').verdict === 'ok', 'N10 对称变换数 2⁶·6! = 46080', get('对称变换数 2⁶·6!').mine);
  chk(Math.abs(H.turnDeg() - 126.8699) < 1e-3,
    'N11 每变一爻的转角 2·arccos(1/√5) = 126.8699°（文档写 126.87°）', H.turnDeg().toFixed(4));
  const CS = H.coxShells();
  chk(CS.shells.length === 5 && CS.outerN === 12 && CS.centerN === 4 && CS.outerIsXiaoxi,
    'N12 Coxeter 投影 5 层壳：最外圈 12 个＝十二消息卦（逐卦重合）、正中心 4 个＝小过·蛊·随·中孚',
    CS.shells.map((s) => s.n).join('/'));
  chk(CS.centerNames.join('') === '小过蛊随中孚',
    'N13 台风眼那 4 个卦的名字与文档一致（顺序不同不算错，集合相同）', CS.centerNames.join(''));

  /* 卦序 */
  const WA = H.wenAccount();
  chk(WA.total === 211 && WA.within === 120 && WA.between === 91,
    'N14 今本 211 步 = 对内 120 ＋ 对间 91 —— 拆账逐位相同', WA.within + '+' + WA.between + '=' + WA.total);
  chk(Math.abs(WA.withinMean - 3.75) < 1e-9 && Math.abs(WA.betweenMean - 2.935484) < 1e-6,
    'N15 对内单对均值 3.75、对间 2.9355（文档写 2.94）', WA.withinMean.toFixed(4) + ' / ' + WA.betweenMean.toFixed(6));
  chk(Math.abs(WA.randomExpectTotal - 192) < 1e-9,
    'N16 🔴 「随机排列 ≈192」不是抽样出来的，是精确期望：63 步 × 6 位 × (2·32²)/(64·63) = 192',
    WA.randomExpectTotal.toFixed(6));
  const KP = H.kingwenPair();
  chk(KP.revPriority === 120 && KP.compOnly === 192,
    'N17 文王配对（反转优先，回文才用错）总汉明代价 120；纯错卦配 192 —— 古人的配对是唯一最小解',
    KP.revPriority + ' vs ' + KP.compOnly);
  chk(KP.palindrome === 8 && KP.orbits === 36,
    'N18 反转优先的配对正好 36 条（8 个回文卦 ＋ 28 对）= 「三十六宫」', KP.orbits);

  /* 互卦与三才 */
  const HO = H.huOrbit();
  const chain = HO.sizes.filter((x, i) => i === 0 || x !== HO.sizes[i - 1]);
  chk(chain.join(',') === '64,16,4',
    'N19 互卦算子 H 的像集 64 → 16 → 4（之后不再缩小，终局是 4 个 2-周期点）', chain.join('→'));
  chk(HO.terminal.length === 4 && HO.terminal.some((t) => t.bits === '101010') && HO.terminal.some((t) => t.bits === '010101'),
    'N20 H 的终局恰 4 卦：乾·坤为不动点，既济↔未济 为 2-周期', HO.terminal.map((t) => t.name).join(','));
  const SC = H.sancai();
  chk([-2, -1, 0, 1, 2].map((k) => SC[k]).join(',') === '4,16,24,16,4',
    'N21 三才张力（地阳数−天阳数）分布 4,16,24,16,4', [-2, -1, 0, 1, 2].map((k) => SC[k]).join(','));

  /* Doob */
  chk(Math.abs(H.doobScan(0, 2000).H - Math.log(6)) < 1e-12,
    'N22 β=0 熵率精确等于 ln6 = 1.791759', H.doobScan(0, 2000).H.toFixed(12));
  chk(Math.abs(Math.log(6 / 5) - 0.182322) < 1e-6,
    'N23 堵死一条路的熵亏 ln(6/5) = 0.1823 奈特/步（文档写 0.18）', Math.log(6 / 5).toFixed(6));
  const D60 = H.doobScan(60, 4000);
  chk(Math.abs(D60.H - Math.log(6) / 2) < 1e-6,
    'N24 🔴 β→∞ 的熵率地板恰为 ½·ln6 = 0.895880 —— 不是随便一个数：在势最高处六个出口并列，' +
    '走一步自由（ln6）、下一步被迫回头（0），平均正好减半',
    D60.H.toFixed(6) + ' vs ' + (Math.log(6) / 2).toFixed(6));
  const live = D60.pi.filter((p) => p > 1e-6);
  chk(live.length === 7 && Math.abs(Math.max(...live) - 0.5) < 1e-6,
    'N25 那条地板的机制：β=60 时平稳分布只剩 7 个态 —— 既济占 0.5，它的 6 个邻居各 1/12',
    live.length + ' 态，最大 ' + Math.max(...live).toFixed(4));

  /* 衣服 */
  const SD = H.sphereDesign();
  chk(SD.is3 && SD.all4same,
    'N26 64 点是 S⁵ 的球面 3-设计：2、3 次矩吻合，4 次不吻合；' +
    '而且 4 次矩恒等于 1/36 —— 因为每个坐标都是 ±1/√6，四次方必然是它，与点集无关',
    SD.rows.map((r) => r.name + (r.ok ? '✓' : '✗')).join(' '));
  const PS = H.pst();
  chk(PS.ok && PS.atZero < 1e-9,
    'N27 完美态转移：坤→乾 在 t=π/2 概率 1.000000，而 t=0 时是 0（所以不是恒真式）',
    PS.peak.toFixed(9) + ' @ ' + PS.tPeakOverPi.toFixed(3) + 'π，t=0 时 ' + PS.atZero.toExponential(1));
  chk(Math.abs((1 - 4 / 6) - 1 / 3) < 1e-12,
    'N28 谱隙（lazy walk）= 1 − λ₂/6 = 1 − 4/6 = 1/3，与 κ_LLY = 2/n 同值 —— 两个来源不同的 1/3',
    (1 - 4 / 6).toFixed(6));
  chk(Math.abs(H.coupon() - 14.7) < 0.01, 'N29 铺满 64 卦的期望 6·H₆ = 14.7 步', H.coupon().toFixed(4));

  /* 两处必须改的地方 */
  chk(get('「只有谦卦六爻全正」').verdict === 'diff',
    'N30 🔴 文档说「只有谦卦六爻全正」——按当位定义，六爻全当位的唯一卦是既济(101010)，谦(001000) 只有 4 爻当位',
    get('「只有谦卦六爻全正」').mine);
  const qian = H.codeOf('艮', '坤');
  const rank = (function () {
    const a = []; for (let v = 0; v < 64; v++) a.push({ v, s: H.yaoScoreSum(v) });
    a.sort((x, y) => y.s - x.s); return a.findIndex((x) => x.v === qian) + 1;
  })();
  chk(rank === 61, 'N31 🔴 用位平均势排序，谦排 61/64（V = −0.63）—— 与「谦为最高原则」直接冲突，' +
    '所以吉凶必须是「位效应＋卦效应」两项，位平均只给了前半截', rank + '/64');
  chk(get('「对间随机期望 95.2」').verdict === 'diff',
    'N32 文档把「95.2」写成对间的随机期望 —— 精确期望是 93（31×3.048），95.2 是某一次抽样值，' +
    '抽样标准差 6.8 说明它落在 0.32σ 内。数没错，口径错了',
    get('「对间随机期望 95.2」').note.slice(0, 24));

  /* 库里两处旧的「未复现」可以撤销 */
  chk(get('云肩（马鞍背心）亏格').verdict === 'ok' && H.genus().gMin === 17,
    'N33 文档把「亏格 17」标成「未独立复现」—— 本仓 §9 已夹死（围长 4 ⇒ F≤96 ⇒ χ=−32 ⇒ g≥17），' +
    '这一行可以从「未复现」撤掉', 'g≥' + H.genus().gMin);
  const H3 = H.ham3();
  chk(H3.lens.join('/') === '64/64/64' && H3.edgeUnion === 192 && H3.dupEdges === 0,
    'N34 金缕衣三条边不交哈密顿回路：64/64/64、并集 192、重边 0', H3.lens.join('/'));
}

/* M8 当位模式改一位（上爻该阴改成该阳）⇒「六爻全当位的唯一卦是既济」立刻换成乾，N30 转红。
 * 🔴 注意这里不能断言「个数变了」：当位模式本身就是一个卦，所以「全当位」的卦数恒为 1，
 *    无论模式怎么改。判据要落在「是哪一个」，不是「有几个」—— 第一版就写错了。 */
try {
  const M = loadMutated('hexagram.cjs', [
    ['const WEI_PATTERN = [1, 0, 1, 0, 1, 0];', 'const WEI_PATTERN = [1, 0, 1, 0, 1, 1];'],
  ]);
  let who = -1, n = 0;
  for (let v = 0; v < 64; v++) if (M.weiCount(v) === 6) { who = v; n++; }
  chk(n === 1 && who !== 42, 'M8 当位模式改一位 ⇒ 全当位卦由既济(42)换成别的，N30 能抓到',
    '仍是 ' + n + ' 个，但换成了 ' + M.BY_CODE[who].name);
} catch (e) { chk(false, 'M8 变异载入失败：' + e.message); }

/* ================= O 段：图集（zip 22 张 / 139 块面板） =================
 * 这一段的重点不是「算得对」，是「源还在」。丢源比算错更严重：
 * 算错能查，源丢了就永远查不了。所以每条都落磁盘。 */
sec('O 段 · 图集 22 张（源在不在、账对不对）');
{
  const S = require('./sources.cjs');
  const ZI = S.ZIP_ITEMS, ZM = S.ZIP_META;
  const DIR = __dirname;

  chk(ZI.length === 22, 'O1 图集 22 条，序号 01…22 连续不缺',
    ZI.length + ' 条 / ' + ZI[0].n + '→' + ZI[ZI.length - 1].n);
  chk(ZI.every((x, i) => x.n === String(i + 1).padStart(2, '0')),
    'O2 序号就是上传顺序（不重排、不跳号）', ZI.map((x) => x.n).join(','));

  let panels = 0;
  for (const x of ZI) panels += x.r * x.c;
  chk(panels === 139, 'O3 面板总数 = Σ(行×列) = 139 块（网格由 _panels.cjs 测黑缝得出，不是估的）', panels);

  /* 磁盘核：22 个原件在不在、字节数是否与其描述相符 */
  const lost = ZI.filter((x) => !fs.existsSync(path.join(DIR, ZM.dir + x.n + '_' + x.f + '.jpg')));
  chk(lost.length === 0, 'O4 🔴 22 张原件都在 _img/zip/（丢源比算错更严重）', lost.map((x) => x.n).join(',') || '0 张缺');
  const zbytes = fs.existsSync(path.join(DIR, ZM.zipFile)) ? fs.statSync(path.join(DIR, ZM.zipFile)).size : -1;
  chk(zbytes === ZM.zipBytes, 'O5 归档的 zip 字节数与源清单一致（' + ZM.zipBytes + '）', zbytes);

  const used = ZI.filter((x) => x.used);
  const usedPanels = used.reduce((a, x) => a + x.r * x.c, 0);
  chk(used.map((x) => x.n).join(',') === '17,19,20',
    'O6 已用的是 17／19／20 三张（逐块比对 0.898–0.992 得出，不是眼估）', used.map((x) => x.n).join(','));
  chk(usedPanels === 16, 'O7 这三张的面板数恰好 = 16 = 上一轮切出的帧数（1:1，不多不少）', usedPanels);

  const newP = panels - usedPanels;
  chk(newP === 123, 'O8 新增面板 139 − 16 = 123 块', newP);

  /* 46080：视频说「46080 种对称变换」。这是唯一一个能从图集里直接复算的数 */
  const fact6 = [1, 2, 3, 4, 5, 6].reduce((a, b) => a * b, 1);
  chk(Math.pow(2, 6) * fact6 === 46080,
    'O9 |Aut(Q₆)| = 2⁶ × 6! = 46080 —— 图集第 10 张那个数，是算出来的，不是抄的', Math.pow(2, 6) * fact6);

  /* 反例：如果不乘 6!，得 64；6! 不乘 2⁶，得 720。两者都不等于 46080，
     证明这条不是「随便一个组合数都对」 */
  chk(Math.pow(2, 6) !== 46080 && fact6 !== 46080,
    'O10 反例：单取 2⁶=64 或单取 6!=720 都不等于 46080 ⇒ O9 不是恒真式',
    Math.pow(2, 6) + ' / ' + fact6);
}

/* ================= P 段：失败要响（fail-loud） =================
 * codeOf 以前少给一个参数会安静地返回 56/0 —— 整套卦号都错还不报错。
 * 这三条就是防「不响的错」：该抛的必须抛，该对的必须对。 */
sec('P 段 · 失败要响');
{
  const throws = (fn) => { try { fn(); return false; } catch (e) { return true; } };
  chk(throws(() => H.codeOf('乾')), 'P1 codeOf 只给下卦时必须抛（以前安静返回 56）');
  chk(throws(() => H.codeOf()), 'P2 codeOf 一个参数都不给时必须抛');
  chk(throws(() => H.codeOf('甲', '坤')), 'P3 不是八卦名的输入必须抛，不许当 0 算');
  /* 🔴 我第一版把这里写成 codeOf('乾','坤')=63 —— 又犯了「断言值凭印象写」。
     乾下坤上是泰=56，63 只有乾/乾。原位改，并留下这句。 */
  chk(H.codeOf('乾', '乾') === 63 && H.codeOf('坤', '坤') === 0 && H.codeOf('乾', '坤') === 56,
    'P4 正常调用不受影响：乾/乾=63、坤/坤=0、乾下坤上=泰=56（不是 63）',
    [H.codeOf('乾', '乾'), H.codeOf('坤', '坤'), H.codeOf('乾', '坤')].join('/'));
}

/* ================= 输出 ================= */
lines.forEach((l) => console.log(l));
console.log('\n' + '─'.repeat(60));
console.log('核验 ' + (pass + fail) + ' 条：PASS ' + pass + ' / FAIL ' + fail +
  '   另有 UNVERIFIED ' + unv + ' 条（如实列出，不计入通过）');

/* 把这次的成绩落到盘上，页面生成时读它 —— 页面上的「74/74」不许手写，
   手写就等于维护第二份真相，改了断言页面不会跟着变（这是老账）。 */
fs.writeFileSync(path.join(__dirname, '_last-test.json'),
  JSON.stringify({ pass: pass, fail: fail, unv: unv, total: pass + fail, at: new Date().toISOString() }, null, 1));
process.exit(fail ? 1 : 0);
