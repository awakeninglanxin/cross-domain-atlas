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
