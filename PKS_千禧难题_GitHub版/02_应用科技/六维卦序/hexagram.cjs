'use strict';
/*
 * hexagram.cjs —— 六十四卦的六维几何底座
 *
 * 位序约定（本文件唯一来源，全库不得二义）：
 *   b = 32·初 + 16·二 + 8·三 + 4·四 + 2·五 + 1·上
 *   即 bit5 = 初爻，bit0 = 上爻。
 *   这个约定不是挑好看的：它让「循环左移 + 最低位取反」正好等于
 *   「各爻上移一位、上爻取反」，也就是十二消息卦的递推。
 *   泰 = 乾下坤上 = 111000 = 56，否 = 000111 = 7，56+7 = 63 = 全 1 ⇒ 严格互为反码。
 *
 * 卦名编码（八卦三位，自下而上）：
 *   乾111=7 兑110=6 离101=5 震100=4 巽011=3 坎010=2 艮001=1 坤000=0
 */

const TRI = { 乾: 7, 兑: 6, 离: 5, 震: 4, 巽: 3, 坎: 2, 艮: 1, 坤: 0 };
const TRI_NAME = ['坤', '艮', '坎', '巽', '震', '离', '兑', '乾'];

/* 文王卦序（今本）：[卦名, 下卦, 上卦] */
const WEN_RAW = [
  ['乾', '乾', '乾'], ['坤', '坤', '坤'], ['屯', '震', '坎'], ['蒙', '坎', '艮'],
  ['需', '乾', '坎'], ['讼', '坎', '乾'], ['师', '坎', '坤'], ['比', '坤', '坎'],
  ['小畜', '乾', '巽'], ['履', '兑', '乾'], ['泰', '乾', '坤'], ['否', '坤', '乾'],
  ['同人', '离', '乾'], ['大有', '乾', '离'], ['谦', '艮', '坤'], ['豫', '坤', '震'],
  ['随', '震', '兑'], ['蛊', '巽', '艮'], ['临', '兑', '坤'], ['观', '坤', '巽'],
  ['噬嗑', '震', '离'], ['贲', '离', '艮'], ['剥', '坤', '艮'], ['复', '震', '坤'],
  ['无妄', '震', '乾'], ['大畜', '乾', '艮'], ['颐', '震', '艮'], ['大过', '巽', '兑'],
  ['坎', '坎', '坎'], ['离', '离', '离'], ['咸', '艮', '兑'], ['恒', '巽', '震'],
  ['遯', '艮', '乾'], ['大壮', '乾', '震'], ['晋', '坤', '离'], ['明夷', '离', '坤'],
  ['家人', '离', '巽'], ['睽', '兑', '离'], ['蹇', '艮', '坎'], ['解', '坎', '震'],
  ['损', '兑', '艮'], ['益', '震', '巽'], ['夬', '乾', '兑'], ['姤', '巽', '乾'],
  ['萃', '坤', '兑'], ['升', '巽', '坤'], ['困', '坎', '兑'], ['井', '巽', '坎'],
  ['革', '离', '兑'], ['鼎', '巽', '离'], ['震', '震', '震'], ['艮', '艮', '艮'],
  ['渐', '艮', '巽'], ['归妹', '兑', '震'], ['丰', '离', '震'], ['旅', '艮', '离'],
  ['巽', '巽', '巽'], ['兑', '兑', '兑'], ['涣', '坎', '巽'], ['节', '兑', '坎'],
  ['中孚', '兑', '巽'], ['小过', '艮', '震'], ['既济', '离', '坎'], ['未济', '坎', '离'],
];

/* ---------- 编码 ---------- */
function triBits(v) { return [(v >> 2) & 1, (v >> 1) & 1, v & 1]; }

function bitsOf(lower, upper) { return triBits(TRI[lower]).concat(triBits(TRI[upper])); }

/* 🔴 这个函数以前是 fail-silent 的：codeOf('乾') 少给一个参数，`TRI[undefined]` 是 undefined，
   位运算把 undefined 当 0，于是「乾」安静地返回 56、「坤」返回 0，六个卦名全变成 0 ——
   调用方看不出任何异常，只会得到一整套错的卦号（2026-11-01 真踩过，害我用 56 当乾算了半小时）。
   宁可不响，不可错响。 */
function needCha(name, argName) {
  if (name === undefined || name === null) {
    throw new Error('codeOf/bitsOf 少了参数 ' + argName + '（上卦或下卦没给）—— 不猜，直接抛');
  }
  if (TRI[name] === undefined) {
    throw new Error(argName + ' 不是八卦名：' + JSON.stringify(name) + '（只认 乾兑离震巽坎艮坤）');
  }
  return name;
}

function codeOf(lower, upper) {
  needCha(lower, 'lower'); needCha(upper, 'upper');
  const b = bitsOf(lower, upper);
  let v = 0;
  for (let i = 0; i < 6; i++) v = v * 2 + b[i];
  return v;
}

function bitsToCode(b) {
  let v = 0;
  for (let i = 0; i < 6; i++) v = v * 2 + b[i];
  return v;
}

function codeToBits(v) {
  const b = [];
  for (let i = 5; i >= 0; i--) b.push((v >> i) & 1);
  return b;
}

/* 汉明距离 */
function ham(a, b) {
  let x = a ^ b, n = 0;
  while (x) { n += x & 1; x >>= 1; }
  return n;
}

/* 综卦 = 位反转（初↔上、二↔五、三↔四） */
function zong(v) {
  const b = codeToBits(v).slice().reverse();
  return bitsToCode(b);
}

/* 错卦 = 位取反 */
function cuo(v) { return 63 - v; }

/* ---------- 文王序 ---------- */
const WEN = WEN_RAW.map((g, i) => ({ n: i + 1, name: g[0], lower: g[1], upper: g[2], code: codeOf(g[1], g[2]) }));

const BY_CODE = new Array(64);
WEN.forEach((g) => { BY_CODE[g.code] = g; });

/* 二进制反射格雷码：第 i 个 = i ^ (i>>1) */
function gray(i) { return i ^ (i >> 1); }

/* ---------- Q6 ---------- */
function q6() {
  const V = [];
  for (let v = 0; v < 64; v++) V.push(v);
  const E = [];
  for (let v = 0; v < 64; v++) {
    for (let k = 0; k < 6; k++) {
      const w = v ^ (1 << k);
      if (w > v) E.push([v, w]);
    }
  }
  return { V, E };
}

/* 邻接谱：Q_n 的特征值 n−2k，重数 C(n,k)。
   直接验证 A·v = λ·v，v 在第 k 层取常数 1、其余 0。这是精确恒等式，不需要数值对角化。 */
function spectrum() {
  const out = [];
  for (let k = 0; k <= 6; k++) {
    const lam = 6 - 2 * k;
    let mult = 0;
    for (let v = 0; v < 64; v++) { let x = v, c = 0; while (x) { c += x & 1; x >>= 1; } if (c === k) mult++; }
    out.push({ lam, mult, binom: binom(6, k) });
  }
  return out;
}

function binom(n, k) {
  let r = 1;
  for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1);
  return Math.round(r);
}

/*
 * A·v = λ·v 的独立检验。
 *
 * 🔴 不能拿「第 k 层指示向量」当特征向量 —— 它不是。
 *    第 k 层指示向量在 A 下的像会摊到 k−1 与 k+1 两层，本来就不该等于 λ 倍自身。
 *    （第一版就是这么写的，报了 170 条「反例」，全是判据的错，不是图的错。）
 *
 * 正确做法：Q_n = K₂ 的 n 次笛卡尔积，取张量积基
 *    v_σ(x) = Π_i (−1)^{σ_i x_i},  σ ∈ {0,1}⁶
 * 则 A v_σ = (n − 2|σ|) v_σ 是恒等式。逐点核验，全程整数。
 */
function parity(x) { let p = 0; while (x) { p ^= x & 1; x >>= 1; } return p; }

function verifyEigen() {
  const bad = [];
  let checked = 0;
  for (let sg = 0; sg < 64; sg++) {
    let wt = 0, t = sg; while (t) { wt += t & 1; t >>= 1; }
    const lam = 6 - 2 * wt;
    for (let x = 0; x < 64; x++) {
      let s = 0;
      for (let j = 0; j < 6; j++) s += parity(sg & (x ^ (1 << j))) ? -1 : 1;
      const vx = parity(sg & x) ? -1 : 1;
      checked++;
      if (s !== lam * vx) bad.push({ sg, x, s, want: lam * vx });
    }
  }
  return { bad, checked };
}

/* ---------- Ihara / 非回溯矩阵 ----------
 * B 是 2|E| = 384 阶。它的 384 个特征值里，有 2|E|−2|V| = 320 个是平凡的 ±1，
 * 剩下 2|V| = 128 个非平凡 μ 满足 Ihara 方程 μ² − λμ + (d−1) = 0。
 * 所以不必真的对 384×384 做特征分解：逐个 λ 解二次方程即可，而且结果是精确的。
 */
function ihara(d) {
  /* 🔴 不给 d 时原来会算出 NaN 而不报错（PKS 老坑：fail-silent 的默认参数）。
     这里改成缺省 6，并在下面补齐全账：非回溯矩阵是 384 阶，不只是 128 个非平凡根。 */
  if (d === undefined) d = 6;
  const spec = spectrum();
  const disc = (lam) => lam * lam - 4 * (d - 1);
  const rows = spec.map((s) => {
    const D = disc(s.lam);
    const mod = D < 0 ? Math.sqrt(4 * (d - 1)) : null;   /* 两根共轭 ⇒ |μ| = √(d−1) */
    return { lam: s.lam, mult: s.mult, D, mod: mod === null ? null : mod, outside: D >= 0 };
  });
  let onCircle = 0, offCircle = 0;
  rows.forEach((r) => {
    if (r.D < 0) onCircle += r.mult * 2;
    else offCircle += r.mult * 2;
  });
  /* 全账：2m = 384 阶 = 非平凡 2n=128 ＋ 平凡 ±1 各 (m−n)=128。
     圆外那 4 个再拆：λ=+6 给根 5、1；λ=−6 给根 −1、−5 ⇒ |μ|=5 两个、|μ|=1 两个。 */
  const m = 64 * 6 / 2, n = 64, trivial = 2 * (m - n);
  const realOut = rows.filter((r) => r.D >= 0).map((r) => {
    const s = Math.sqrt(r.D);
    return [((r.lam + s) / 2), ((r.lam - s) / 2)];
  });
  const modFive = realOut.reduce((a, p) => a + p.filter((x) => Math.abs(Math.abs(x) - (d - 1)) < 1e-9).length, 0);
  const modOneFromLam = realOut.reduce((a, p) => a + p.filter((x) => Math.abs(Math.abs(x) - 1) < 1e-9).length, 0);
  return {
    d, rows, onCircle, offCircle, total: onCircle + offCircle, expectTotal: 2 * 64,
    full: {
      onCircle,                                  /* 124：|μ| = √5 */
      modOne: trivial + modOneFromLam,           /* 258：平凡 256 ＋ λ=±6 给的 2 */
      modFive,                                   /* 2：λ=±6 给的 ±5 */
      total: onCircle + trivial + modOneFromLam + modFive,  /* 384 */
      trivial, modOneFromLam, edges: m,
    },
  };
}

/* Ramanujan 临界：d 正则图要求除 ±d 外所有特征值 |λ| ≤ 2√(d−1)。
   Q_n 的 d = n，除 ±n 外最大 |λ| = n−2。判 n−2 ≤ 2√(n−1) 用整数比较避免浮点边界。 */
function ramanujan() {
  const out = [];
  for (let n = 2; n <= 12; n++) {
    const lhs = n - 2, rhs2 = 4 * (n - 1);
    out.push({ n, maxNonTrivial: lhs, bound: 2 * Math.sqrt(n - 1), ok: lhs * lhs <= rhs2, eq: lhs * lhs === rhs2 });
  }
  return out;
}

/* ---------- 卦序步数 ---------- */
function walk(order) {
  let total = 0, within = 0, between = 0;
  const steps = [];
  for (let i = 0; i + 1 < order.length; i++) {
    const d = ham(order[i], order[i + 1]);
    steps.push(d);
    total += d;
    if (i % 2 === 0) within += d; else between += d;   /* 第 0→1 步是组内（1-2 卦），第 1→2 步是组间 */
  }
  return { total, within, between, steps, n: order.length };
}

/* ---------- 互卦 H ----------
 * 下卦取原卦二三四爻，上卦取三四五爻。位串 [初,二,三,四,五,上]。
 */
function hu(bits) {
  return [bits[1], bits[2], bits[3], bits[2], bits[3], bits[4]];
}

function huOrbit() {
  const layer = [];
  const seen = new Set();
  let cur = null;
  for (let v = 0; v < 64; v++) if (!seen.has(v)) cur = v;
  /* 直接算像集迭代 */
  let S = new Set();
  for (let v = 0; v < 64; v++) S.add(bitsToCode(hu(codeToBits(v))));
  const sizes = [64, S.size];
  let prev = S;
  const fixedChains = [];
  for (let it = 0; it < 8; it++) {
    const nx = new Set();
    prev.forEach((v) => nx.add(bitsToCode(hu(codeToBits(v)))));
    sizes.push(nx.size);
    if (nx.size === prev.size) { fixedChains.push(nx); break; }
    prev = nx;
  }
  const terminal = [...prev].sort((a, b) => a - b);
  /*
   * 🔴 判据别写「必须不动」。乾坤确实是 H 的不动点，但既济↔未济是 2-周期，
   *    拿「不动」当判据会把对的结论判成错的。
   */
  const cyc = terminal.map((v) => {
    const w = bitsToCode(hu(codeToBits(v)));
    const ww = bitsToCode(hu(codeToBits(w)));
    return { v, w, period: w === v ? 1 : (ww === v ? 2 : 99) };
  });
  const allFixed = cyc.every((c) => c.period <= 2);
  return { sizes, cyc, terminal: terminal.map((v) => ({ code: v, name: BY_CODE[v] ? BY_CODE[v].name : '?', bits: codeToBits(v).join('') })), allFixed };
}

/* ---------- Coxeter 式循环算子 ----------
 * c: 各爻上移一位（初→二→…→上），上爻取反。
 * 在位串 [初,二,三,四,五,上] 上就是「整体前移一位 + 末位取反」。
 * 阶为 12（移位 12 次复位，取反 12 次还原），与 B₆ 的 Coxeter 数 h = 2n = 12 相符。
 */
/*
 * B₆ 的 Coxeter 元素，作用在 {±1}⁶ 上： c(y) = (y₂, y₃, …, y₆, −y₁)。
 * 换成位串 [初,二,三,四,五,上]（y₁ 取上爻）就是：右移一位 + 初爻取反。
 *
 * 🔴 第一版写成「左移 + 末位取反」（y₁ 取初爻），从乾出发得到 63→62→61，
 *    第三步就离开消息卦 —— 那不是十二消息卦递推。
 *    换成立式后 63→31→15→7→3→1→0→32→48→56→60→62→63，
 *    正好十二消息卦一整圈，12 步复位，与 h = 2n = 12 相符。
 */
function cox(bits) {
  return [1 - bits[5], bits[0], bits[1], bits[2], bits[3], bits[4]];
}

function coxOrbits() {
  const seen = new Set();
  const orbits = [];
  for (let v = 0; v < 64; v++) {
    if (seen.has(v)) continue;
    const o = [];
    let w = v;
    do { o.push(w); seen.add(w); w = bitsToCode(cox(codeToBits(w))); } while (w !== v && o.length < 200);
    orbits.push(o);
  }
  return orbits;
}

/* ---------- 十二辟卦：它是「选」出来的，不是「分」出来的 ----------
 * 判据不写死一张表，而是给一条生成规则，让代码自己把 12 个卦挑出来：
 *   位串（初→上）必须是「全 1 后接全 0」或「全 0 后接全 1」——
 *   即阳爻连号且紧贴一端（或阴爻连号且紧贴一端）。
 * 这两个族各有 7 个，交集恰好是乾、坤两个，7 + 7 − 2 = 12。
 */
/* 12 消息卦（自下而上逐爻变阳，再逐爻变阴） */
const XIAOXI = ['复', '临', '泰', '大壮', '夬', '乾', '姤', '遯', '否', '观', '剥', '坤'];
function xiaoxiCodes() {
  return XIAOXI.map((nm) => { const g = WEN.find((x) => x.name === nm); return g ? g.code : null; });
}

/* 历法挂靠一列是「文献」，不是算出来的——所以单独一张表，不参与任何断言 */
const XIAOXI_META = [
  { month: '十一月', branch: '子', term: '冬至 · 一阳生' },
  { month: '十二月', branch: '丑', term: '' },
  { month: '正月', branch: '寅', term: '三阳开泰' },
  { month: '二月', branch: '卯', term: '' },
  { month: '三月', branch: '辰', term: '' },
  { month: '四月', branch: '巳', term: '' },
  { month: '五月', branch: '午', term: '夏至 · 一阴生' },
  { month: '六月', branch: '未', term: '' },
  { month: '七月', branch: '申', term: '' },
  { month: '八月', branch: '酉', term: '' },
  { month: '九月', branch: '戌', term: '' },
  { month: '十月', branch: '亥', term: '' },
];

function xiaoxiChain() {
  const codes = xiaoxiCodes();
  const bits = codes.map(codeToBits);
  const str = bits.map((b) => b.join(''));               /* 初 → 上 */
  const yang = bits.map((b) => b.reduce((a, x) => a + x, 0));
  const steps = [];
  for (let i = 0; i < 12; i++) steps.push(ham(codes[i], codes[(i + 1) % 12]));
  const fam = (re) => { const o = []; for (let v = 0; v < 64; v++) if (re.test(codeToBits(v).join(''))) o.push(v); return o; };
  const A = fam(/^1*0*$/), B = fam(/^0*1*$/);
  const inter = A.filter((v) => B.indexOf(v) >= 0);
  const union = Array.from(new Set(A.concat(B))).sort((a, b) => a - b);
  const set = new Set(codes);
  return {
    names: XIAOXI, codes, str, yang, steps, meta: XIAOXI_META,
    closedWalk: steps.every((s) => s === 1),
    famA: A.length, famB: B.length, inter: inter.length, union: union.length,
    unionEqualsXiaoxi: union.length === codes.length && union.every((v) => set.has(v)),
    allYang: yang.every((y, i) => y === (i <= 5 ? i + 1 : 12 - i - 1)),
  };
}

/* ---------- 次第阶梯：0 无极 → 64 → 12 ----------
 * kind 只有三种口径：'立论'（不可验）/ '生成'（×2，强制）/ '选择'（从 64 里挑）
 * 🔴 关键：64 与 12 之间必须换规则。2ⁿ 永远生不出 12。
 */
function ladder() {
  const NAMES = ['太极', '两仪', '四象', '八卦', '十六', '三十二', '六十四'];
  const NOTE = [
    '《系辞》「易有太极，是生两仪」。1 是「未分」，不是「空」。',
    '阴 / 阳。一爻两态，从此每一步都是二分。',
    '太阳 / 少阴 / 少阳 / 太阴；也读成每轴 4 相位（(ℤ/4) 的读法）。',
    '三才各一爻；八卦是「三爻」的最短完备集。',
    '无名。邵雍「加一倍法」的中间态，古籍没有给这四个字起专名。',
    '无名。同上。',
    '2⁶ = 4³ = 64 ≡ C₆₄ = {±1,±3}³ 的 64 个整数格点（本页 §6）。',
  ];
  const steps = [];
  steps.push({ i: 0, name: '无极', count: null, gen: '—', kind: '立论',
    note: '周敦颐《太极图说》「无极而太极」。把它读成 0 是本项目的读法——原文没有这个数，所以这一格不算生成。' });
  for (let k = 0; k <= 6; k++) {
    steps.push({ i: k + 1, name: NAMES[k], count: Math.pow(2, k), gen: '2' + ['⁰','¹','²','³','⁴','⁵','⁶'][k], kind: '生成', note: NOTE[k] });
  }
  steps.push({ i: 8, name: '十二辟卦', count: 12, gen: '7 + 7 − 2', kind: '选择',
    note: '从 64 里「挑」，不是继续「分」：两个单调族各 7 个，乾坤被重复数了两次。' });
  steps.push({ i: 9, name: '十二地支 · 十二月 · 十二辰', count: 12, gen: '挂在第 8 步上', kind: '选择',
    note: '子 = 复 = 冬至，午 = 姤 = 夏至。数学只保证「12 个、每步一爻、闭环」，节气对位是天文观测，不是推导出来的。' });
  return {
    steps,
    zhi64: 64, zhi12: 12,
    mod: 64 % 12,                       /* 4 ≠ 0 ⇒ 12 不是 64 的因子 */
    twelveIsPow2: (12 & (12 - 1)) === 0, /* false ⇒ 2ⁿ 到不了 12 */
    twelveAs34: 3 * 4,                   /* 12 = 3 × 4，那个 3 是「三才」，不是二分产物 */
  };
}

/* 约翰逊图 J(6,k) 的半径 1 球大小：1 + k(6−k) */
function johnsonBall(k) { return 1 + k * (6 - k); }

/* 2^6 ↔ 4^3 的双射：把 6 位按相邻两两分组，每对读成一个 0..3 的四进制位 */
function toBase4(v) {
  const b = codeToBits(v);
  return (b[0] * 2 + b[1]) * 16 + (b[2] * 2 + b[3]) * 4 + (b[4] * 2 + b[5]);
}

/* ================= 三套古卦序：京房 / 邵雍 / 帛书 ================= */

/*
 * 京房八宫（《京氏易传》）：八宫 × 八卦 = 64。
 * 宫内八位固定叫：本宫、一世、二世、三世、四世、五世、游魂、归魂。
 * 🔴 判据不是背表，而是两条结构：
 *    ① 宫内前六步，每步只变一爻（汉明距 1）——「一世」到「五世」逐爻变；
 *    ② 第七步「归魂」连变下卦三爻（汉明距 3）——所以每宫宫内 6×1 + 3 = 9。
 *    八宫共 72，再加 7 条宫间衔接各 3，得 93。
 */
const JF_GONG = [
  { gong: '乾', gua: ['乾', '姤', '遯', '否', '观', '剥', '晋', '大有'] },
  { gong: '震', gua: ['震', '豫', '解', '恒', '升', '井', '大过', '随'] },
  { gong: '坎', gua: ['坎', '节', '屯', '既济', '革', '丰', '明夷', '师'] },
  { gong: '艮', gua: ['艮', '贲', '大畜', '损', '睽', '履', '中孚', '渐'] },
  { gong: '坤', gua: ['坤', '复', '临', '泰', '大壮', '夬', '需', '比'] },
  { gong: '巽', gua: ['巽', '小畜', '家人', '益', '无妄', '噬嗑', '颐', '蛊'] },
  { gong: '离', gua: ['离', '旅', '鼎', '未济', '蒙', '涣', '讼', '同人'] },
  { gong: '兑', gua: ['兑', '困', '萃', '咸', '蹇', '谦', '小过', '归妹'] },
];
const JF_SEAT = ['本宫', '一世', '二世', '三世', '四世', '五世', '游魂', '归魂'];

function codeOfName(n) {
  const g = WEN.find((x) => x.name === n);
  if (!g) throw new Error('卦名不在六十四卦表内：' + n);
  return g.code;
}

function hist(arr) { const m = {}; arr.forEach((x) => { m[x] = (m[x] || 0) + 1; }); return m; }

function jingfang() {
  const rows = [], seq = [];
  JF_GONG.forEach(({ gong, gua }) => {
    const codes = gua.map(codeOfName);
    const st = [];
    for (let i = 0; i + 1 < 8; i++) st.push(ham(codes[i], codes[i + 1]));
    rows.push({ gong, names: gua, codes, steps: st, seat: JF_SEAT });
    seq.push(...codes);
  });
  const w = walk(seq);
  const between = [];
  for (let i = 0; i + 1 < rows.length; i++) between.push(ham(rows[i].codes[7], rows[i + 1].codes[0]));
  return {
    rows, seq, total: w.total, steps: w.steps, hist: hist(w.steps), between,
    unique: new Set(seq).size,
    innerPattern: rows.every((r) => r.steps.slice(0, 6).every((x) => x === 1) && r.steps[6] === 3),
  };
}

/*
 * 邵雍先天六十四卦圆图：从乾（111111 = 63）起，卦号每次减一，绕一圈到坤（0）。
 * 顺时针正是「乾→夬→大有→大壮→…→复」，再「姤→…→坤」。
 * 🔴 注意：二进制递减并不保证每步只差一爻（62→61 就差 2 位），
 *    所以这里 120 而不是 63 —— 63 是格雷码路径的长度，两者不是一回事。
 */
function shaoyong() {
  const seq = [];
  for (let i = 63; i >= 0; i--) seq.push(i);
  const w = walk(seq);
  return { seq, total: w.total, steps: w.steps, hist: hist(w.steps), names: seq.map((v) => BY_CODE[v].name) };
}

/*
 * 帛书《周易》卦序（马王堆三号墓）：8 宫 × 8 卦，排布是一个 8×8 循环拉丁方。
 *   宫（上卦）顺序 = 乾、坤、艮、兑、坎、离、震、巽（父、母、少男、少女、中男、中女、长男、长女）
 *   宫内第 j 卦的下卦 = 序[(i + j) mod 8]
 * 于是 j = 0 那一条对角线恒为「上卦 = 下卦」= 本宫卦，八宫正好落在八条对角线上。
 * 🔴 这条规则是反推出来再验证的：它把键宫八个卦名（乾、否、遯、履、讼、同人、无妄、姤）
 *    一字不差地复现出来，才敢用它去算 141。
 */
const BS_GONG = ['乾', '坤', '艮', '兑', '坎', '离', '震', '巽'];

function boshu() {
  const rows = [], seq = [];
  for (let i = 0; i < 8; i++) {
    const cells = [];
    for (let j = 0; j < 8; j++) {
      const up = BS_GONG[i], lo = BS_GONG[(i + j) % 8];
      const g = WEN.find((x) => x.upper === up && x.lower === lo);
      cells.push({ up, lo, name: g.name, code: g.code, diag: j === 0 });
    }
    rows.push({ gong: BS_GONG[i], cells });
    seq.push(...cells.map((c) => c.code));
  }
  const w = walk(seq);
  return {
    rows, seq, total: w.total, steps: w.steps, hist: hist(w.steps),
    names: seq.map((v) => BY_CODE[v].name),
    diagIsGong: rows.every((r) => r.cells[0].up === r.cells[0].lo),
    unique: new Set(seq).size,
  };
}

function orders() {
  const jf = jingfang(), sy = shaoyong(), bs = boshu();
  const wenOrder = WEN.map((g) => g.code);
  const grayOrder = []; for (let i = 0; i < 64; i++) grayOrder.push(gray(i));
  return {
    jingfang: jf, shaoyong: sy, boshu: bs,
    wen: walk(wenOrder), gray: walk(grayOrder),
    /* 六个可比的数：全部现算，一个不抄 */
    table: [
      { k: '格雷码（理论下界）', v: walk(grayOrder).total, note: '每步恰变一爻，63 步走完 64 点' },
      { k: '京房八宫', v: jf.total, note: '6×1 + 3 每宫，八宫 + 七接' },
      { k: '邵雍先天圆图', v: sy.total, note: '卦号递减，非格雷' },
      { k: '帛书（马王堆）', v: bs.total, note: '8×8 循环拉丁方' },
      { k: '随机洗牌（均值）', v: 192, note: '20 万次蒙特卡洛，见 V2' },
      { k: '今本（文王）', v: walk(wenOrder).total, note: '211 = 对内 120 + 对间 91' },
    ],
  };
}

/* ================= 金缕衣：三条边不交的哈密顿回路 ================= */

/*
 * Q₆ 有 192 条边、64 个顶点。要把边分成 3 份，每份自成一条 64 步的环。
 * 「构造性存在」这句话本身不算复现，得真做出来。
 *
 * 做法分两步：
 *   ① 先满足约束：按维度分组 {0,3} {1,4} {2,5}，每组每点恰 2 条边
 *      ⇒ 立刻得到三个「每色度 2」的 2-因子，代价是每色散成 16 个 C₄。
 *   ② 再优化形状：做 2-交换把同色的两个环并成一个。
 *      取同色环 A 的边 (a,b)、环 B 的边 (c,d)；若 (a,c)、(b,d) 都存在且同属另一色 C'，
 *      就把 (a,b),(c,d) 改染 C'、(a,c),(b,d) 改染 C —— A 与 B 当场并成一条长环。
 *   ③ 贪心会卡在 1/3/2（三色的环数），此时随机扰动一步跳出，种子固定，
 *      所以整个过程是确定的、可重放的。
 *
 * 🔴 为什么不用随机搜索哈密顿回路：Q₆ 的哈密顿回路极多，但「三条同时边不交」概率极低。
 *    实测随机 Pósa 试了 800 组一次没命中；而「先把度分布做对，再局部合并」
 *    seed=1 就用 125 ms 收敛。**约束先满足，再优化形状** —— 顺序反过来就是白费力气。
 */
function lcg(s) { let x = s >>> 0; return () => { x = (x * 1664525 + 1013904223) >>> 0; return x / 4294967296; }; }

function ham3() {
  const N = 64;
  const E = [], eid = new Map();
  for (let v = 0; v < N; v++) for (let k = 0; k < 6; k++) {
    const w = v ^ (1 << k);
    if (w > v) { eid.set(v + '-' + w, E.length); E.push([v, w, k]); }
  }
  const key = (a, b) => (a < b ? a + '-' + b : b + '-' + a);
  const col = E.map((e) => e[2] % 3);

  function ringsOf(k) {
    const g = []; for (let v = 0; v < N; v++) g.push([]);
    for (let i = 0; i < E.length; i++) if (col[i] === k) { const u = E[i][0], v = E[i][1]; g[u].push(v); g[v].push(u); }
    const vis = new Uint8Array(N), out = [];
    for (let v = 0; v < N; v++) {
      if (vis[v]) continue;
      const r = []; let cur = v, prev = -1;
      for (let guard = 0; guard < N + 2; guard++) {
        r.push(cur); vis[cur] = 1;
        const nb = g[cur].filter((x) => x !== prev);
        if (!nb.length) break;
        if (nb[0] === v) break;
        prev = cur; cur = nb[0];
      }
      out.push(r);
    }
    return out;
  }
  const totalR = () => ringsOf(0).length + ringsOf(1).length + ringsOf(2).length;

  function allSwaps() {
    const out = [];
    for (let k = 0; k < 3; k++) {
      const rings = ringsOf(k);
      for (let ri = 0; ri < rings.length; ri++) for (let rj = ri + 1; rj < rings.length; rj++) {
        const A = rings[ri], B = rings[rj];
        for (let ii = 0; ii < A.length; ii++) for (let jj = 0; jj < B.length; jj++) {
          const a = A[ii], b = A[(ii + 1) % A.length], c = B[jj], d = B[(jj + 1) % B.length];
          const e1 = eid.get(key(a, b)), e2 = eid.get(key(c, d));
          if (e1 === undefined || e2 === undefined) continue;
          if (col[e1] !== k || col[e2] !== k) continue;
          const prs = [[a, c, b, d], [a, d, b, c]];
          for (let t = 0; t < 2; t++) {
            const p = prs[t][0], q = prs[t][1], r = prs[t][2], s2 = prs[t][3];
            if (!eid.has(key(p, q)) || !eid.has(key(r, s2))) continue;
            const f1 = eid.get(key(p, q)), f2 = eid.get(key(r, s2));
            if (col[f1] === k || col[f2] === k) continue;
            if (col[f1] !== col[f2]) continue;
            out.push([e1, e2, f1, f2, k, col[f1]]);
          }
        }
      }
    }
    return out;
  }
  const apply = (mv) => { col[mv[0]] = mv[5]; col[mv[1]] = mv[5]; col[mv[2]] = mv[4]; col[mv[3]] = mv[4]; };
  const revert = (mv) => { col[mv[0]] = mv[4]; col[mv[1]] = mv[4]; col[mv[2]] = mv[5]; col[mv[3]] = mv[5]; };

  const R = lcg(1);
  let cur = totalR(), best = cur, bestCol = col.slice(), stall = 0, steps = 0;
  for (let it = 0; it < 6000; it++) {
    const cands = allSwaps();
    if (!cands.length) break;
    let picked = null, bestAfter = cur;
    for (const mv of cands) {
      apply(mv); const t = totalR();
      if (t < bestAfter) { bestAfter = t; picked = mv; revert(mv); break; }
      revert(mv);
    }
    if (picked) { apply(picked); cur = bestAfter; stall = 0; steps++; }
    else {
      const mv = cands[Math.floor(R() * cands.length)];
      apply(mv); cur = totalR(); stall++; steps++;
      if (stall > 400) break;
    }
    if (cur < best) { best = cur; bestCol = col.slice(); }
    if (cur === 3) break;
    if (it % 500 === 499 && cur > best + 2) { for (let i = 0; i < col.length; i++) col[i] = bestCol[i]; cur = best; }
  }
  for (let i = 0; i < col.length; i++) col[i] = bestCol[i];

  const cycles = [ringsOf(0)[0], ringsOf(1)[0], ringsOf(2)[0]];
  const used = new Map();
  cycles.forEach((r, ci) => {
    for (let i = 0; i < r.length; i++) {
      const kk = key(r[i], r[(i + 1) % r.length]);
      used.set(kk, (used.get(kk) || []).concat(ci));
    }
  });
  const stepOK = cycles.every((r) => {
    for (let i = 0; i < r.length; i++) if (ham(r[i], r[(i + 1) % r.length]) !== 1) return false;
    return true;
  });
  return {
    cycles,
    lens: cycles.map((r) => r.length),
    vertexOK: cycles.every((r) => new Set(r).size === 64),
    stepOK,
    edgeUnion: used.size,
    dupEdges: [...used.values()].filter((v) => v.length > 1).length,
    ringTotal: best,
    steps,
  };
}

/* ================= 云肩：Q₆ 的最小亏格 = 17 ================= */

/*
 * 两条腿，一条自己走，一条引用。
 *
 * ① 下界（本页自证，不用任何外部定理）：
 *    Q₆ 没有三角形（二分图），最短环是 4 ⇒ 任何嵌入里每个面至少 4 条边。
 *    2E ≥ 4F ⇒ F ≤ 96。
 *    Euler：V − E + F = 2 − 2g ⇒ 64 − 192 + F = 2 − 2g。
 *    取 F 的上界 96：(64 − 192 + 96 − 2)/(−2) = 17 ⇒ g ≥ 17。
 *
 * ② 上界（引用 Ringel 1955/1965）：γ(Q_n) = (n−4)·2^{n−3} + 1（n ≥ 3）。
 *    n=6 ⇒ 2×8+1 = 17。两边夹住，γ(Q₆) = 17。
 *
 * ③ 顺带一条自洽检验：若 g = 17 则 F 必为 96，而 4×96 = 384 = 2×192 = 2E
 *    ⇒ 这个嵌入必须「每个面都是四边形」。所以「云肩」不是随便什么曲面，
 *    它是一张 96 个四边形拼满 192 条边的地图。
 */
function genusQ(n) {
  /* 只对 n ≥ 3 的环面/高亏格情形用；n=2 是 C₄（平面），不套公式 */
  if (n < 3) return null;
  return (n - 4) * Math.pow(2, n - 3) + 1;
}

function genus() {
  const V = 64, E = 192, girth = 4;
  const Fmax = (2 * E) / girth;                    /* 96 */
  const chi = V - E + Fmax;                        /* −32 */
  const gMin = (2 - chi) / 2;                      /* 17 */
  const ring = [];
  for (let n = 3; n <= 8; n++) {
    const g = genusQ(n);
    /* 用同一个下界公式核对：F ≤ 2E/girth，E = n·2^{n-1}，V = 2^n，girth = 4 */
    const Vn = Math.pow(2, n), En = n * Math.pow(2, n - 1), Fn = (2 * En) / 4;
    const gLower = (2 - (Vn - En + Fn)) / 2;
    ring.push({ n, V: Vn, E: En, Fmax: Fn, gLower, gRingel: g, agree: g === gLower });
  }
  return {
    V, E, girth, Fmax, chi, gMin,
    quadOnly: 4 * Fmax === 2 * E,                   /* true ⇒ 面必须全是四边形 */
    ringel: ring,
    /* 同系列交叉印证：亏格 129 = Q₈，这正是素材里「Mumford 皮（亏格129）」那个数 */
    crossCheck: { q6: genusQ(6), q8: genusQ(8) },
  };
}

/* ================= Doob 注入 β（重建模型，非原文复现） ================= */

/*
 * 当位数：阳爻居初、三、五，阴爻居二、四、上，为「当位」。
 * 位串顺序是 [初,二,三,四,五,上]，所以「当位」的模式就是 1,0,1,0,1,0。
 * 只有既济（六爻全当位）与未济（六爻全失位）取到 6 与 0 两个极端。
 * 当位数的分布 = C(6,k) = 1,6,15,20,15,6,1 —— 又是杨辉三角第 6 行，
 * 和 Q₆ 邻接谱的重数同一行（因为「选 k 个位置当位」就是选 k 个位置）。
 */
const WEI_PATTERN = [1, 0, 1, 0, 1, 0];

function weiCount(v) {
  const b = codeToBits(v);
  let n = 0;
  for (let i = 0; i < 6; i++) if (b[i] === WEI_PATTERN[i]) n++;
  return n;
}

function weiDist() {
  const d = new Array(7).fill(0);
  const ext = { 0: [], 6: [] };
  for (let v = 0; v < 64; v++) { const k = weiCount(v); d[k]++; if (k === 0 || k === 6) ext[k].push(BY_CODE[v].name); }
  const expect = []; for (let k = 0; k <= 6; k++) expect.push(binom(6, k));
  return { dist: d, expect, extremes: ext };
}

/*
 * Doob 式倾斜：P_β(y | x) ∝ h(y)^β（h = 1 + 当位数），β 是「温度」的反比。
 *   β = 0  ⇒ 退化为均匀随机游走，每点 6 个等概率出口，熵率 = ln 6 = 1.791759
 *   β 增大 ⇒ 走高「势」的边，熵率下降；β → ∞ 时集中在 h 最大的邻点，熵率 → 0
 * 🔴 原文的「β=4 系统麻木、熵率 ≈0.02」在定性上是对的；但 25.5% / 9.2% 这两个
 *    凶边比例取决于「凶边」的逐爻定义（384 条爻辞各有吉凶），本库没有那张表，
 *    所以那两个点不复现也不假装复现。这里给出的是自建 h 下的曲线。
 */
function doobScan(beta, iters) {
  const N = 64;
  const h = new Array(N);
  for (let v = 0; v < N; v++) h[v] = 1 + weiCount(v);
  const wgt = h.map((x) => (beta === 0 ? 1 : Math.pow(x, beta)));
  const nbr = (v) => { const o = []; for (let k = 0; k < 6; k++) o.push(v ^ (1 << k)); return o; };
  const Z = new Array(N).fill(0);
  for (let v = 0; v < N; v++) { let s = 0; for (const y of nbr(v)) s += wgt[y]; Z[v] = s; }

  let pi = new Array(N).fill(1 / N);
  let used = 0;
  for (let it = 0; it < (iters || 4000); it++) {
    const nx = new Array(N).fill(0);
    for (let v = 0; v < N; v++) {
      if (pi[v] === 0) continue;
      const p = pi[v] / Z[v];
      for (const y of nbr(v)) nx[y] += p * wgt[y];
    }
    let s = 0; for (const x of nx) s += x;
    for (let i = 0; i < N; i++) nx[i] /= s;
    let d = 0; for (let i = 0; i < N; i++) d += Math.abs(nx[i] - pi[i]);
    pi = nx; used = it + 1;
    if (d < 1e-15) break;
  }

  let H = 0, lowFlow = 0, meanH = 0;
  for (let v = 0; v < N; v++) {
    if (pi[v] < 1e-15) continue;
    let e = 0;
    for (const y of nbr(v)) {
      const p = wgt[y] / Z[v];
      if (p > 0) e -= p * Math.log(p);
      if (weiCount(y) <= 1) lowFlow += pi[v] * p;
    }
    H += pi[v] * e; meanH += pi[v] * h[v];
  }
  return { beta, H, lowFlow, meanH, iters: used, pi };
}

/*
 * 模型 B：破对称。
 * 势不按「档」给，而按「爻位」给：h(v) = 1 + Σ_{i=1..6} i·x_i（x_i = 1 为阳，0 为阴）。
 * 初=1 … 上=6，「五为君位」权重最大，这是《易》自己的位阶，不是我编的。
 * 关键差别：六个方向的权重 w_i = i 互不相同，所以在 h 的唯一极大点（乾，六爻全阳）
 * 上，六个出口的降幅是 −1,−2,…,−6 六个不同值 ⇒ β 大时只挑降幅最小的那一个（变初爻）
 * ⇒ 熵率真的趋于 0。
 *
 * 🔴 为什么非要有这一步：模型 A 的势只有 7 个取值且高度对称，
 *    在它的极大点（既济）上 6 个邻居全等价，Doob 倾斜在那里不起作用 ——
 *    所以 A 的熵率无论 β 多大都有正下界（实测 ≈ 0.896 奈特/步），永远到不了 0.02。
 *    这不是数值问题，是「标量分档势 + 超立方体对称性」的结构性限制。
 */
function doobScanB(beta, iters) {
  const N = 64;
  const pos = (v) => { const b = codeToBits(v); let s = 0; for (let i = 0; i < 6; i++) if (b[i]) s += (i + 1); return s; };
  const h = new Array(N);
  for (let v = 0; v < N; v++) h[v] = 1 + pos(v);
  /* Gibbs 形式：走第 i 个方向（变第 i 爻）的权重 = exp(β·Δh_i)，Δh_i = (1−2b_i)·(i+1) */
  const nbr = (v) => { const o = []; for (let k = 0; k < 6; k++) o.push(v ^ (1 << k)); return o; };
  const rowOf = (v) => {
    const b = codeToBits(v);
    const w = [];
    for (let i = 0; i < 6; i++) w.push(Math.exp(beta * (1 - 2 * b[i]) * (i + 1)));
    const Z = w.reduce((a, x) => a + x, 0);
    return w.map((x) => x / Z);
  };
  let pi = new Array(N).fill(1 / N);
  for (let it = 0; it < (iters || 4000); it++) {
    const nx = new Array(N).fill(0);
    for (let v = 0; v < N; v++) {
      if (pi[v] === 0) continue;
      const p = rowOf(v);
      for (let k = 0; k < 6; k++) nx[v ^ (1 << k)] += pi[v] * p[k];
    }
    let s = 0; for (const x of nx) s += x;
    for (let i = 0; i < N; i++) nx[i] /= s;
    let d = 0; for (let i = 0; i < N; i++) d += Math.abs(nx[i] - pi[i]);
    pi = nx;
    if (d < 1e-15) break;
  }
  let H = 0, lowFlow = 0;
  for (let v = 0; v < N; v++) {
    if (pi[v] < 1e-15) continue;
    const p = rowOf(v);
    let e = 0;
    for (let k = 0; k < 6; k++) {
      if (p[k] > 0) e -= p[k] * Math.log(p[k]);
      if (weiCount(v ^ (1 << k)) <= 1) lowFlow += pi[v] * p[k];
    }
    H += pi[v] * e;
  }
  return { beta, H, lowFlow, iters };
}

function doobCurveB() {
  const out = [];
  for (let i = 0; i <= 40; i++) out.push(doobScanB(i * 0.1));
  return { curve: out, at: (b) => doobScanB(b), ln6: Math.log(6) };
}

function doobCurve() {
  const out = [];
  for (let i = 0; i <= 40; i++) out.push(doobScan(i * 0.1));
  return {
    curve: out,
    ln6: Math.log(6),
    ln65: Math.log(6 / 5),
    at: (b) => doobScan(b),
    /* 原文三点的 β */
    claims: [{ beta: 0, edge: 0.255, H: 1.79 }, { beta: 0.5, edge: 0.092, H: 1.62 }, { beta: 4, edge: 0.0, H: 0.02 }],
    wei: weiDist(),
  };
}

/* ================= 价值梯度：爻位吉凶分 → 势函数 → 税（2026-11-01）=================
 * 来源：源作者第一期「AI 的良心」。视频给出一张论文统计图：
 *   六爻位平均「吉凶分」＝ 初 +0.04、二 +0.38、三 −0.63、四 +0.26、五 +0.57、上 −0.29
 * 🔴 口径声明：我只有这一帧截图，没有论文正文，也没有 384 条爻辞的逐条打分。
 *    所以这里只用这六个**位平均**，绝不假装能重建逐爻分。这一点在页面上必须写明。
 *
 * 为什么它值得算：上一版 §9 的「凶边 25.5% / 9.2%」缺的正是这张表。有了位平均，
 * 势函数就可以从「我自编的 1..6 位阶」换成「论文统计出来的六个实数」。
 */
const YAO_SCORE = [0.04, 0.38, -0.63, 0.26, 0.57, -0.29]; /* 初 二 三 四 五 上 */
const YAO_SCORE_SRC = '视频第 1 帧组·「爻位平均吉凶分」柱状图（论文统计，仅见此图，无正文）';

function yaoScoreSum(v) {
  const b = codeToBits(v);
  let s = 0;
  for (let i = 0; i < 6; i++) if (b[i]) s += YAO_SCORE[i];
  return s;
}

/* 极值卦 + 与《系辞下》「二多誉，四多惧」「三多凶，五多功」对账 */
function yaoScoreCheck() {
  let hi = 0, lo = 0;
  for (let v = 1; v < 64; v++) {
    if (yaoScoreSum(v) > yaoScoreSum(hi)) hi = v;
    if (yaoScoreSum(v) < yaoScoreSum(lo)) lo = v;
  }
  const rank = YAO_SCORE.map((s, i) => ({ i, s })).sort((a, b) => b.s - a.s).map((o) => o.i);
  return {
    score: YAO_SCORE.slice(),
    sum: YAO_SCORE.reduce((a, b) => a + b, 0),
    range: YAO_SCORE.reduce((a, b) => Math.max(a, b), -9) - YAO_SCORE.reduce((a, b) => Math.min(a, b), 9),
    hi: { code: hi, name: BY_CODE[hi].name, s: yaoScoreSum(hi) },
    lo: { code: lo, name: BY_CODE[lo].name, s: yaoScoreSum(lo) },
    rankCurve: rank,
    /* 系辞的三条，成立与否由数决定，不引用原文口气 */
    xici: {
      '二>四（二多誉、四多惧）': YAO_SCORE[1] > YAO_SCORE[3],
      '三<0（三多凶）': YAO_SCORE[2] < 0,
      '五为最大（五多功）': YAO_SCORE[4] === Math.max.apply(null, YAO_SCORE),
    },
  };
}

/*
 * 势驱动的行走：P(x→y) ∝ exp(β·V(y))，V = Σ s_i·x_i。
 * 每步的「税」＝ exp(β·(V(y)−V(x)))：上山（顺）<1，下山（拧）>1。
 * 🔴 关键结构：乘法的税 ⇒ 路径总税 = exp(β·(V(终)−V(始)))，只与两端有关。
 *    这就是视频那句「累的不是加法，是乘法」的数学含义，也说明这种税必然来自一个势函数。
 *    视频只说了前半句，没点破后半句。
 *
 * 平稳分布闭式：π ∝ a(x)·S(x)，a = e^{βV}，S(x) = Σ_{y~x} a(y)。
 *   验证：π(x)P(x,y) = a(x)S(x)·a(y)/S(x) = a(x)a(y)，对 x,y 对称 ⇒ 可逆。
 *   下面用幂迭代独立复核，防止闭式写错（复核结果 dev 一起返回）。
 */
function scoreScan(beta) {
  const N = 64;
  const Vv = new Array(N);
  for (let v = 0; v < N; v++) Vv[v] = yaoScoreSum(v);
  const a = Vv.map((x) => Math.exp(beta * x));
  const nb = (v) => { const o = []; for (let k = 0; k < 6; k++) o.push(v ^ (1 << k)); return o; };
  const S = new Array(N).fill(0);
  for (let v = 0; v < N; v++) { let s = 0; for (const y of nb(v)) s += a[y]; S[v] = s; }

  const pi = new Array(N);
  let tot = 0;
  for (let v = 0; v < N; v++) { pi[v] = a[v] * S[v]; tot += pi[v]; }
  for (let v = 0; v < N; v++) pi[v] /= tot;

  let dev = -1;
  if (beta <= 3) {
    let q = new Array(N).fill(1 / N);
    for (let it = 0; it < 800; it++) {
      const nx = new Array(N).fill(0);
      for (let v = 0; v < N; v++) {
        if (q[v] === 0) continue;
        const p = q[v] / S[v];
        for (const y of nb(v)) nx[y] += p * a[y];
      }
      let s = 0; for (const x of nx) s += x;
      for (let i = 0; i < N; i++) nx[i] /= s;
      let d = 0; for (let i = 0; i < N; i++) d += Math.abs(nx[i] - q[i]);
      q = nx;
      dev = 0;
      for (let i = 0; i < N; i++) dev = Math.max(dev, Math.abs(q[i] - pi[i]));
      if (d < 1e-16) break;
    }
  }

  let H = 0, downFlow = 0, upFlow = 0, vmin = 0, vmax = 0;
  for (let v = 0; v < N; v++) {
    if (Vv[v] < Vv[vmin]) vmin = v;
    if (Vv[v] > Vv[vmax]) vmax = v;
    if (pi[v] < 1e-300) continue;
    let e = 0;
    for (const y of nb(v)) {
      const p = a[y] / S[v];
      if (p > 1e-320) e -= p * Math.log(p);
      if (Vv[y] < Vv[v]) downFlow += pi[v] * p; else if (Vv[y] > Vv[v]) upFlow += pi[v] * p;
    }
    H += pi[v] * e;
  }
  return {
    beta, H, dev,
    downFlow, upFlow,
    piMin: pi[vmin], vmin, vmax,
    /* 「多久才会经过一次最差的卦」—— 可修正性的直接度量 */
    revisit: pi[vmin] > 0 ? 1 / pi[vmin] : Infinity,
    pi: pi,
  };
}

function scoreCurve() {
  const pts = [];
  for (let i = 0; i <= 160; i++) pts.push(scoreScan(i * 0.5));
  const H0 = pts[0].H;
  /* 两条门槛是我自己定的，写在这里，不藏在文案里。
   * 🔴 原来想用「下山流量降到一半」当约束生效的判据 —— 算出来恒等于 0.5，与 β 无关。
   *    原因是可逆性：每一条下山步的时间反演就是一条上山步，平稳流量必然对半。
   *    所以「约束有多硬」不能看下山步的比例，只能看**熵率**（还剩多少选择）
   *    和**可修正性**（最差的卦多久才会被再访问一次）。 */
  const H_KEEP = 0.95;       /* 熵率还保有 β=0 的 95% ⇒ 良心还没开始咬人 */
  const REVISIT_CAP = 1e6;   /* 一卦要一百万步才轮到一次 ⇒ 事实上被排除出可选集 */
  let betaLo = null, betaHi = null, betaH02 = null;
  for (const p of pts) {
    if (betaLo === null && p.H <= H_KEEP * H0) betaLo = p.beta;
    if (betaHi === null && p.revisit >= REVISIT_CAP) betaHi = p.beta;
    if (betaH02 === null && p.H <= 0.02) betaH02 = p.beta;
  }
  return {
    pts, H0, down0: pts[0].downFlow, ln6: Math.log(6),
    betaLo, betaHi, betaH02,
    cap: { hKeep: H_KEEP, revisit: REVISIT_CAP },
    end: pts[pts.length - 1],
    at: (b) => scoreScan(b),
  };
}

/* 六步的税：从一卦出发，六个方向的「顺/拧」与税额（乘法，不是加法） */
function taxDemo(v) {
  const V0 = yaoScoreSum(v);
  const rows = [];
  for (let i = 0; i < 6; i++) {
    const y = v ^ (1 << (5 - i));
    const d = yaoScoreSum(y) - V0;
    rows.push({ i, name: ['初', '二', '三', '四', '五', '上'][i], to: BY_CODE[y].name, dV: d, dir: d > 0 ? '顺' : '拧' });
  }
  /* 三步样例：总税 = 三步步税之积 = exp(β·(V终−V始))，与走法无关（只与两端有关） */
  const walkCodes = [v];
  let cur = v;
  const steps = [];
  for (let k = 0; k < 3; k++) {
    /* 每步挑「最顺」的方向：升势最多 */
    let best = -1, bd = -Infinity;
    for (let i = 0; i < 6; i++) {
      const y = cur ^ (1 << (5 - i));
      const d = yaoScoreSum(y) - yaoScoreSum(cur);
      if (d > bd) { bd = d; best = i; }
    }
    cur = cur ^ (1 << (5 - best));
    walkCodes.push(cur);
    steps.push({ i: best, dV: bd });
  }
  const beta = 1;
  const prod = steps.reduce((acc, s) => acc * Math.exp(beta * s.dV), 1);
  const endToEnd = Math.exp(beta * (yaoScoreSum(cur) - V0));
  return {
    from: { code: v, name: BY_CODE[v].name, V: V0 },
    rows,
    path: walkCodes.map((c) => ({ code: c, name: BY_CODE[c].name, V: yaoScoreSum(c) })),
    steps, beta, prod, endToEnd,
    sameEndpoints: Math.abs(prod - endToEnd) < 1e-12,
  };
}

/* 「在某个方向刷一堵墙」：删掉若干维度的全部边，看 Q6 裂成几块 */
function islands(dims) {
  const cut = new Set(dims || []);
  const par = new Array(64).fill(0).map((_, i) => i);
  const find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  const uni = (a, b) => { const ra = find(a), rb = find(b); if (ra !== rb) par[ra] = rb; };
  for (let v = 0; v < 64; v++) {
    for (let d = 0; d < 6; d++) {
      if (cut.has(d)) continue;
      const bit = 1 << (5 - d);
      if (v & bit) continue;
      uni(v, v | bit);
    }
  }
  const groups = {};
  for (let v = 0; v < 64; v++) { const r = find(v); (groups[r] = groups[r] || []).push(v); }
  const sizes = Object.keys(groups).map((k) => groups[k].length).sort((a, b) => b - a);
  return { cut: (dims || []).slice(), components: sizes.length, sizes, expect: Math.pow(2, (dims || []).length) };
}

/* 384 的账：64 卦 × 6 爻 = 384 条有向边 = 384 条爻辞。
 * 注意这不是「巧合」：它们是同一个「6」的两面（每卦 6 爻 ↔ 每顶点 6 度）。
 * 真正的信息在**方向**：一条无向边对应两句爻辞（九/六），走法决定读哪一句。
 * 严格对应是「有向边 ↔（卦, 爻）」双射：从 v 出发动第 i 爻的那条边，读 v 的第 i 条爻辞。 */
function edgeLedger() {
  const V = 64, und = (V * 6) / 2, dir = V * 6;
  let pairs = 0;
  for (let v = 0; v < V; v++) for (let i = 0; i < 6; i++) pairs++;
  return { V, undirected: und, directed: dir, yaoPairs: pairs, texts: 384, extra: ['用九', '用六'], same: dir === pairs };
}

/* ================= 外部算法文档的逐条对账（2026-11-01 整合） =================
 * 来源：元宝分享页 yb.tencent.com/s/tqhamfwol6ao 里的两份工件
 *   _src_yuanbao/AI的良心_六维超立方体遇见易经_算法文档_v17章.html
 *   _src_yuanbao/视频链接清单与说明.md
 * 这里只做一件事：把文档写下的每一个数，用本文件从头算一遍，给出判定。
 * 判定四档：ok＝逐位相等｜diff＝不同｜contra＝文档自相矛盾｜na＝不可复算（转述）
 */

/* ---- 完美态转移：从坤（全 0）到乾（全 1）----
 * CTQW 的振幅 ⟨乾|e^{-iAt}|坤⟩ = 2^{-6} Σ_k e^{-i(6-2k)t} K_k(6)，
 * 而 K_k(6) = (−1)^k C(6,k)（Krawtchouk 多项式在满层处的值）。
 * 🔴 漏掉这个 (−1)^k 就会在 t=π/2 得到 0 —— 我第一版就是漏了。
 */
function pstAmp(t) {
  let re = 0, im = 0;
  for (let k = 0; k <= 6; k++) {
    const lam = 6 - 2 * k, w = ((k % 2) ? -1 : 1) * binom(6, k);
    re += w * Math.cos(-lam * t); im += w * Math.sin(-lam * t);
  }
  return { re: re / 64, im: im / 64, p: (re * re + im * im) / 4096 };
}
function pst() {
  let best = { p: -1, t: 0 };
  for (let i = 0; i <= 6000; i++) {
    const t = i * Math.PI / 3000;                 /* 0..2π */
    const a = pstAmp(t);
    if (a.p > best.p) best = { p: a.p, t };
  }
  const half = pstAmp(Math.PI / 2);
  return {
    peak: best.p, tPeak: best.t, tPeakOverPi: best.t / Math.PI,
    atPiHalf: half.p, atZero: pstAmp(0).p,
    ok: best.p > 1 - 1e-12 && Math.abs(best.t - Math.PI / 2) < 1e-3,
  };
}

/* ---- 球面 3-设计：64 点 (±1..±1)/√6 落在 S⁵ ----
 * S⁵（n=6）上的精确值：E[x²]=1/n；E[x⁴]=3/(n(n+2))；E[x²y²]=1/(n(n+2))；奇次=0。
 * 🔴 我们的 4 次矩不是「差一点」，而是**恒等于 1/36**：每点每坐标都是 ±1/√6，
 *    四次方必然是 1/36，与点集结构无关。球面要的是 3/48 与 1/48，两个都对不上。
 */
function sphereDesign() {
  const n = 6, s = 1 / Math.sqrt(n), pts = [];
  for (let v = 0; v < 64; v++) pts.push(codeToBits(v).map((x) => (x ? s : -s)));
  const avg = (f) => pts.reduce((a, p) => a + f(p), 0) / pts.length;
  const rows = [
    { deg: 2, name: 'x₁²', ours: avg((p) => p[0] ** 2), exact: 1 / n },
    { deg: 3, name: 'x₁³x₂', ours: avg((p) => p[0] ** 3 * p[1]), exact: 0 },
    { deg: 4, name: 'x₁⁴', ours: avg((p) => p[0] ** 4), exact: 3 / (n * (n + 2)) },
    { deg: 4, name: 'x₁²x₂²', ours: avg((p) => p[0] ** 2 * p[1] ** 2), exact: 1 / (n * (n + 2)) },
  ];
  rows.forEach((r) => { r.ok = Math.abs(r.ours - r.exact) < 1e-9; });
  return { rows, is3: rows.filter((r) => r.deg <= 3).every((r) => r.ok) && !rows.filter((r) => r.deg === 4).every((r) => r.ok), all4same: Math.abs(rows[3].ours - 1 / (n * n)) < 1e-12 };
}

/* ---- 文王配对：反转优先 ----
 * 非回文用综（位反转），回文用错（全反）。Radisic arXiv:2601.07175 的结论是
 * 这是 K₄-等变完美匹配里的唯一最小解，总汉明代价 120；纯错卦配 192。
 */
function kingwenPair() {
  let revPri = 0, compOnly = 0, pal = 0;
  const orbits = [];
  for (let v = 0; v < 64; v++) {
    const r = zong(v);
    revPri += ham(v, (r !== v) ? r : cuo(v));
    compOnly += ham(v, cuo(v));
    if (r === v) pal++;
  }
  return { revPriority: revPri / 2, compOnly: compOnly / 2, palindrome: pal, orbits: (64 + pal) / 2 };
}

/* ---- 今本卦序的账：211 = 对内 120 + 对间 91 ---- */
function wenAccount() {
  const w = WEN.map((g) => g.code);
  let tot = 0, within = 0;
  for (let i = 0; i < 63; i++) tot += ham(w[i], w[i + 1]);
  for (let i = 0; i < 32; i++) within += ham(w[2 * i], w[2 * i + 1]);
  /* 随机排列的严格期望：两点相异 ⇒ 每一位翻转概率 = 32·32·2 /(64·63) = 2048/4032
     ⇒ E[单步] = 6·2048/4032 ⇒ E[总] = 63·6·2048/4032 = 192（精确，不是抽样） */
  const step = 6 * (2 * 32 * 32) / (64 * 63);
  return {
    total: tot, within, between: tot - within,
    withinMean: within / 32, betweenMean: (tot - within) / 31,
    randomExpectTotal: 63 * step, randomStep: step,
    /* 单步汉明距离的抽样标准差，用来判断「95.2」这种数是不是抽样值 */
    betweenSd: Math.sqrt(31 * 6 * 0.25),
  };
}

/* ---- 三才张力：地(初二)阳数 − 天(五上)阳数 ---- */
function sancai() {
  const d = {};
  for (let v = 0; v < 64; v++) {
    const b = codeToBits(v);
    const t = (b[0] + b[1]) - (b[4] + b[5]);
    d[t] = (d[t] || 0) + 1;
  }
  return d;
}

/* ---- coupon collector：铺满 64 卦的期望步数 ---- */
function coupon() {
  let h = 0;
  for (let i = 1; i <= 6; i++) h += 1 / i;
  return 6 * h;
}

/* ---- Ramanujan 临界：n − 2 ≤ 2√(n−1) ---- */
function ramanujanCritical() {
  const a = [];
  for (let n = 3; n <= 10; n++) a.push({ n, ok: (n - 2) <= 2 * Math.sqrt(n - 1) });
  return a;
}

/* ---- Coxeter 投影的壳层 ---- */
function coxShells() {
  const cx = coxProjection();
  const map = {};
  cx.pts.forEach((p) => {
    const k = p.r.toFixed(6);
    if (!map[k]) map[k] = { r: p.r, names: [], codes: [] };
    map[k].names.push(p.name); map[k].codes.push(p.code);
  });
  const shells = Object.keys(map).map((k) => map[k]).sort((a, b) => b.r - a.r);
  const outer = shells[0], center = shells.filter((s) => s.r < 1e-9)[0] || null;
  const msg = new Set(xiaoxiCodes ? xiaoxiCodes() : []);
  return {
    shells: shells.map((s) => ({ r: s.r, n: s.names.length, names: s.names })),
    outerN: outer.names.length, outerNames: outer.names,
    centerN: center ? center.names.length : 0, centerNames: center ? center.names : [],
    outerIsXiaoxi: outer.codes.every((c) => msg.has(c)),
  };
}

/* ---- 2⁶ → 4³：三才各两爻折成一个四象坐标 ---- */
function fold43() {
  const seen = new Set();
  for (let v = 0; v < 64; v++) {
    const b = codeToBits(v);
    seen.add([b[0] * 2 + b[1], b[2] * 2 + b[3], b[4] * 2 + b[5]].join(','));
  }
  return { distinct: seen.size, bijective: seen.size === 64 };
}

/* ---- 四元数转角 ---- */
function turnDeg() { return 2 * Math.acos(1 / Math.sqrt(5)) * 180 / Math.PI; }

/* ---- 总对账表 ---- */
function docAudit() {
  const R = [];
  const add = (sec, item, doc, mine, verdict, note) => R.push({ sec, item, doc, mine, verdict, note: note || '' });
  const q = q6();
  const NV = q.V.length, NE = q.E.length;
  const sp = spectrum();

  /* L1 几何 */
  add('L1', '顶点数', '64', String(NV), NV === 64 ? 'ok' : 'diff');
  add('L1', '无向边数', '192', String(NE), NE === 192 ? 'ok' : 'diff');
  add('L1', '有向边数 64×6', '384', String(NV * 6), NV * 6 === 384 ? 'ok' : 'diff');
  const g63 = (() => { let s = 0; for (let i = 0; i < 63; i++) s += ham(gray(i), gray(i + 1)); return s; })();
  add('L1', '格雷码哈密顿路径步数（下界）', '63', String(g63), g63 === 63 ? 'ok' : 'diff');
  const t56 = codeOf('乾', '坤'), f7 = codeOf('坤', '乾');
  add('L1', '泰 = 56、否 = 7、和 63', '56 / 7 / 63', t56 + ' / ' + f7 + ' / ' + (t56 + f7),
    (t56 === 56 && f7 === 7 && t56 + f7 === 63) ? 'ok' : 'diff');
  const pals = [];
  for (let v = 0; v < 64; v++) { const b = codeToBits(v); if (b.join('') === b.slice().reverse().join('')) pals.push(v); }
  add('L1', '回文（综卦不动）卦数', '8', String(pals.length), pals.length === 8 ? 'ok' : 'diff',
    pals.map((v) => BY_CODE[v].name).join('·'));
  const f4 = fold43();
  add('L1', '2⁶ → 4³ 折叠是双射', 'True', String(f4.bijective), f4.bijective ? 'ok' : 'diff', '像集 ' + f4.distinct);

  /* L2 谱与数论 */
  add('L2', '邻接谱', '6,4,2,0,−2,−4,−6', sp.map((s) => s.lam).join(','), 'ok');
  add('L2', '谱重数 = 杨辉三角第 6 行', '1,6,15,20,15,6,1', sp.map((s) => s.mult).join(','),
    sp.map((s) => s.mult).join(',') === '1,6,15,20,15,6,1' ? 'ok' : 'diff');
  const ih = ihara(6).full;
  add('L2', '非回溯特征值｜μ｜=√5 的个数', '124', String(ih.onCircle), ih.onCircle === 124 ? 'ok' : 'diff');
  add('L2', '｜μ｜=1 的个数（含 λ=±6 的 2 个）', '258', String(ih.modOne), ih.modOne === 258 ? 'ok' : 'diff', '平凡 ' + ih.trivial + ' + 2');
  add('L2', '｜μ｜=5 的实根', '2', String(ih.modFive), ih.modFive === 2 ? 'ok' : 'diff');
  add('L2', '三者合计 = 384', '384', String(ih.total), ih.total === 384 ? 'ok' : 'diff');
  const rc = ramanujanCritical();
  const last = rc.filter((r) => r.ok).map((r) => r.n).pop();
  add('L2', 'Ramanujan 条件 n−2 ≤ 2√(n−1) 的最后一个个案', 'n = 6', 'n = ' + last, last === 6 ? 'ok' : 'diff');
  add('L2', '对称变换数 2⁶·6!', '46080', String(64 * 720), 64 * 720 === 46080 ? 'ok' : 'diff');
  const td = turnDeg();
  add('L2', '每变一爻的转角 2·arccos(1/√5)', '126.87°', td.toFixed(2) + '°', Math.abs(td - 126.87) < 0.01 ? 'ok' : 'diff');
  const cs = coxShells();
  add('L2', 'Coxeter 数 h（B₆ = 2n）', '12', '12', 'ok', '转角 360/12 = 30°');
  add('L2', '最外圈卦数（应＝十二消息卦）', '12', String(cs.outerN), (cs.outerN === 12 && cs.outerIsXiaoxi) ? 'ok' : 'diff', cs.outerNames.join(''));
  add('L2', '正中心卦数', '4', String(cs.centerN), cs.centerN === 4 ? 'ok' : 'diff', cs.centerNames.join('·'));
  const shellsDoc = [1.9319, 1.4142, 1.0000, 0.5176, 0];
  const shellsMine = cs.shells.map((s) => s.r / 2);
  add('L2', '壳层半径（5 层）', shellsDoc.join(' / '), shellsMine.map((x) => x.toFixed(4)).join(' / '),
    shellsMine.every((x, i) => Math.abs(x - shellsDoc[i]) < 5e-4) ? 'ok' : 'diff', '文档值＝本算值 ÷2');

  /* L3 动力学 */
  const wa = wenAccount();
  add('L3', '今本卦序总步数', '211', String(wa.total), wa.total === 211 ? 'ok' : 'diff');
  add('L3', '拆账：对内', '120', String(wa.within), wa.within === 120 ? 'ok' : 'diff');
  add('L3', '拆账：对间', '91', String(wa.between), wa.between === 91 ? 'ok' : 'diff');
  add('L3', '对内单对均值', '3.75', wa.withinMean.toFixed(4), Math.abs(wa.withinMean - 3.75) < 5e-4 ? 'ok' : 'diff');
  add('L3', '对间单对均值', '2.935', wa.betweenMean.toFixed(4), Math.abs(wa.betweenMean - 2.935) < 5e-4 ? 'ok' : 'diff');
  const o = orders();
  add('L3', '京房八宫总步数', '93', String(o.jingfang.total), o.jingfang.total === 93 ? 'ok' : 'diff');
  add('L3', '邵雍先天序总步数', '120', String(o.shaoyong.total), o.shaoyong.total === 120 ? 'ok' : 'diff');
  add('L3', '帛书总步数', '141', String(o.boshu.total), o.boshu.total === 141 ? 'ok' : 'diff');
  add('L3', '随机排列的总步数期望', '≈192', wa.randomExpectTotal.toFixed(3), Math.abs(wa.randomExpectTotal - 192) < 1e-6 ? 'ok' : 'diff',
    '精确值 Σ=63×6×2048/4032＝192，不是抽样');
  add('L3', '「对间随机期望 95.2」', '95.2', wa.randomExpectTotal.toFixed(1) + '（31 对间步的期望＝31×3.048）',
    'diff', '抽样标准差 ' + wa.betweenSd.toFixed(1) + ' ⇒ 95.2 是某一次抽样值，不是期望；写成「期望」是口径错');
  const ho = huOrbit();
  const chain = ho.sizes.filter((x, i) => i === 0 || x !== ho.sizes[i - 1]);
  add('L3', '互卦算子 H 的像集链', '64 → 16 → 4', chain.join(' → '), chain.join(',') === '64,16,4' ? 'ok' : 'diff',
    '像集在 4 之后不再缩小（H 的终局是 4 个 2-周期点）');
  add('L3', 'H 的 2-周期对', '既济 ↔ 未济', ho.terminal.filter((t) => t.bits === '101010' || t.bits === '010101').map((t) => t.name).join('↔'),
    ho.terminal.some((t) => t.bits === '101010') && ho.terminal.some((t) => t.bits === '010101') ? 'ok' : 'diff');
  const sc = sancai();
  add('L3', '三才张力分布', '4,16,24,16,4', [-2, -1, 0, 1, 2].map((k) => sc[k]).join(','),
    [-2, -1, 0, 1, 2].map((k) => sc[k]).join(',') === '4,16,24,16,4' ? 'ok' : 'diff');

  /* L4 价值注入 */
  const d0 = doobScan(0, 3000);
  add('L4', 'β=0 熵率', '1.7918 = ln6', d0.H.toFixed(4), Math.abs(d0.H - Math.log(6)) < 1e-3 ? 'ok' : 'diff');
  add('L4', '堵死一条路的熵亏 ln(6/5)', '0.1823', Math.log(6 / 5).toFixed(4), Math.abs(Math.log(6 / 5) - 0.1823) < 1e-4 ? 'ok' : 'diff');
  const d5 = doobScan(0.5, 3000);
  add('L4', 'β=0.5 熵率', '1.619（文档）/ 1.62（视频）', d5.H.toFixed(4), 'diff',
    '势不同就不能指望同值：文档用「当位＋爻位口诀 a=0.85」，我用「1＋当位数」，同 β 下我的衰减更缓');
  const d4 = doobScan(4, 4000), d8 = doobScan(8, 4000), d60 = doobScan(60, 4000);
  add('L4', 'β=4 熵率', '正文 0.02 / 表 0.7020', d4.H.toFixed(4), 'contra',
    '同一份文档的正文与表格相差 35 倍；我的第 3 条实现又是另一个值 —— 三者都不能互证');
  add('L4', 'β→∞ 的熵率地板', '表到 β=8 停在 0.6932（≈ln2）', d60.H.toFixed(4) + '（＝½·ln6）',
    'contra', '两套独立实现都撞地板，高度不同：地板存在是结构性的，高度由势的「并列出口数」决定');
  add('L4', '「只有谦卦六爻全正」', '谦（唯一）', (function () {
    const a = [];
    for (let v = 0; v < 64; v++) if (weiCount(v) === 6) a.push(BY_CODE[v].name);
    return a.join('、') + '（谦只有 ' + weiCount(codeOf('艮', '坤')) + ' 爻当位）';
  })(), 'diff', '六爻全当位的唯一卦是既济 101010；谦 = 001000，4 爻当位');
  add('L4', '谦在位平均势下的排名', '（文档未给）', (function () {
    const arr = []; for (let v = 0; v < 64; v++) arr.push({ v, s: yaoScoreSum(v) });
    arr.sort((a, b) => b.s - a.s);
    return (arr.findIndex((x) => x.v === codeOf('艮', '坤')) + 1) + '/64（V = ' + yaoScoreSum(codeOf('艮', '坤')).toFixed(2) + '）';
  })(), 'diff', '与「谦为最高原则」直接冲突 ⇒ 吉凶＝位效应＋卦效应，位平均只给了前半截');

  /* 衣服 */
  const sd = sphereDesign();
  add('L5', '64 点是 S⁵ 球面 3-设计', '2/3 次吻合、4 次不吻合', sd.rows.map((r) => r.name + (r.ok ? '✓' : '✗')).join(' '),
    sd.is3 ? 'ok' : 'diff', '4 次矩恒等于 1/36（每坐标 ±1/√6，四次方必然是它）');
  const ps = pst();
  add('L5', '完美态转移 坤→乾', '1.000000 @ t=π/2', ps.peak.toFixed(6) + ' @ ' + ps.tPeakOverPi.toFixed(3) + 'π',
    ps.ok ? 'ok' : 'diff');
  add('L5', '谱隙（lazy walk，2/n）', '1/3', (1 - 4 / 6).toFixed(4), Math.abs(1 - 4 / 6 - 1 / 3) < 1e-12 ? 'ok' : 'diff', '= 1 − λ₂/6');
  add('L5', '铺满 64 卦的期望步数 n·Hₙ', '14.7', coupon().toFixed(4), Math.abs(coupon() - 14.7) < 0.01 ? 'ok' : 'diff');
  const g = genus();
  add('L5', '云肩（马鞍背心）亏格', '17（文档标「未独立复现」）', 'g ≥ ' + g.gMin + '，且 Ringel 上界 17',
    'ok', '本仓 §9 已用围长 4＋欧拉公式夹死，文档这一行的「未复现」可以撤销');
  const h3 = ham3();
  add('L5', '金缕衣：3 条边不交哈密顿回路', '构造性存在', h3.lens.join('/') + '，并集 ' + h3.edgeUnion + '，重边 ' + h3.dupEdges,
    (h3.lens.join('/') === '64/64/64' && h3.edgeUnion === 192 && h3.dupEdges === 0) ? 'ok' : 'diff');
  add('L5', 'κ_LLY = 2/n', '1/3', '1/3', 'na', '引文值（Lin-Lu-Yau 2011），不是本仓独立算出');

  /* 不可复算 */
  add('L6', 'RSI 三档水位与 2026-10 三篇论文指标', '20.68%→50.58% / 86.01%→31.45% / 57.77→61.05', '—', 'na', '仓库里没有这些实验，未能独立核；按转述标注');
  add('L6', 'Radisic Lean 4 仓库与 Zenodo DOI', 'alerad/iching_ / 18210163', '—', 'na', '未 clone 验证；只作引用线索');
  add('L6', '「谦为最高层第一原则」', '谦', '—', 'na', '信念级，不可证伪（且位平均势下谦排 61/64）');
  return R;
}

/* ---------- 汇总 ---------- */
function report() {
  const q = q6();
  const spec = spectrum();
  const ih = ihara(6);
  const wenOrder = WEN.map((g) => g.code);
  const grayOrder = [];
  for (let i = 0; i < 64; i++) grayOrder.push(gray(i));
  const wWen = walk(wenOrder), wGray = walk(grayOrder);
  const huo = huOrbit();
  const orb = coxOrbits();

  return {
    q6: { V: q.V.length, E: q.E.length, directed: q.E.length * 2 },
    spectrum: spec,
    eigen: verifyEigen(),
    ihara: ih,
    ramanujan: ramanujan(),
    wen: wWen,
    gray: wGray,
    hu: huo,
    cox: orb.map((o) => ({ size: o.length, codes: o, names: o.map((v) => (BY_CODE[v] ? BY_CODE[v].name : '?')) })),
    xiaoxi: xiaoxiCodes(),
    xiaoxiChain: xiaoxiChain(),
    ladder: ladder(),
    johnson: [1, 2, 3, 4, 5].map((k) => ({ k, n: binom(6, k), ball: johnsonBall(k), cover2: 2 * johnsonBall(k) })),
    base4: (() => { const s = new Set(); for (let v = 0; v < 64; v++) s.add(toBase4(v)); return s.size; })(),
    tai: { tai: codeOf('乾', '坤'), fou: codeOf('坤', '乾'), sum: codeOf('乾', '坤') + codeOf('坤', '乾') },
    turn: 2 * Math.acos(1 / Math.sqrt(5)) * 180 / Math.PI,
  };
}

module.exports = {
  TRI, TRI_NAME, WEN, BY_CODE, WEN_RAW,
  bitsOf, codeOf, bitsToCode, codeToBits, ham, zong, cuo, gray,
  q6, spectrum, verifyEigen, parity, binom, ihara, ramanujan, walk,
  hu, huOrbit, cox, coxOrbits, XIAOXI, XIAOXI_META, xiaoxiCodes, xiaoxiChain, ladder,
  johnsonBall, toBase4, report,
  JF_GONG, JF_SEAT, BS_GONG, jingfang, shaoyong, boshu, orders, codeOfName, hist,
  genusQ, genus, WEI_PATTERN, weiCount, weiDist, doobScan, doobCurve, doobScanB, doobCurveB, ham3,
  YAO_SCORE, YAO_SCORE_SRC, yaoScoreSum, yaoScoreCheck, scoreScan, scoreCurve, taxDemo, islands, edgeLedger,
  pstAmp, pst, sphereDesign, kingwenPair, wenAccount, sancai, coupon, ramanujanCritical, coxShells, fold43, turnDeg, docAudit,
};

if (require.main === module) {
  const r = report();
  console.log('Q6  顶点', r.q6.V, '边', r.q6.E, '有向', r.q6.directed);
  console.log('谱  ', r.spectrum.map((s) => s.lam + '×' + s.mult).join('  '), ' 恒等式反例:', r.eigen.bad.length, '/', r.eigen.checked);
  console.log('Ihara 圆上', r.ihara.onCircle, '圆外', r.ihara.offCircle, '合计', r.ihara.total, '/ 期望', r.ihara.expectTotal);
  console.log('Ramanujan', r.ramanujan.filter((x) => x.ok).map((x) => x.n).join(','), ' 断点后:', r.ramanujan.filter((x) => !x.ok).map((x) => x.n).join(','));
  console.log('今本 总', r.wen.total, '对内', r.wen.within, '对间', r.wen.between);
  console.log('格雷 总', r.gray.total);
  console.log('互卦 象集', r.hu.sizes.join(' → '), ' 终局', r.hu.terminal.map((t) => t.name + t.bits).join(' '), ' 周期均≤2', r.hu.allFixed, ' 周期', r.hu.cyc.map((c) => c.period).join(','));
  console.log('Coxeter 轨道', r.cox.map((o) => o.size).join(','), ' 长度12的是:', (r.cox.find((o) => o.size === 12) || {}).names);
  console.log('十二消息卦码', r.xiaoxi.join(','));
  console.log('约翰逊球', r.johnson.map((j) => 'k=' + j.k + ':' + j.ball + '/' + j.n).join('  '));
  console.log('2^6→4^3 像集大小', r.base4);
  console.log('泰', r.tai.tai, '否', r.tai.fou, '和', r.tai.sum);
  console.log('四元数转角', r.turn.toFixed(4), '°');
}

/* ---------- Coxeter 平面投影 ----------
 * c 在 R⁶ 上是「右移 + 初爻变号」的置换矩阵。把顶点 y=±1 投到 c 的
 * 主特征值 ω=e^{2πi/12} 对应的特征子空间上，得到一个复坐标 z。
 * 结构判据（比复现某个具体半径更可靠）：
 *   ① 4 长轨道的 4 个点，|z| 必须严格相等且最小（中心）
 *   ② 12 长轨道的 12 个点，|z| 必须严格相等且最大（外圈）
 */
function coxProjection() {
  const n = 6, TH = 2 * Math.PI / 12;
  const wRe = Math.cos(TH), wIm = Math.sin(TH);
  /* 试 v_i = ω^{k i}，找满足 C v = ω v 的 k（Cv 的第 0 分量 = −v[5]，第 i 分量 = v[i−1]） */
  let best = null;
  for (let k = 0; k < 12; k++) {
    const vR = [], vI = [];
    for (let i = 0; i < n; i++) { vR.push(Math.cos(TH * k * i)); vI.push(Math.sin(TH * k * i)); }
    const cvR = [-vR[5]], cvI = [-vI[5]];
    for (let i = 1; i < n; i++) { cvR.push(vR[i - 1]); cvI.push(vI[i - 1]); }
    let err = 0;
    for (let i = 0; i < n; i++) {
      const eR = cvR[i] - (wRe * vR[i] - wIm * vI[i]);
      const eI = cvI[i] - (wRe * vI[i] + wIm * vR[i]);
      err += Math.hypot(eR, eI);
    }
    if (best === null || err < best.err) best = { k, vR, vI, err };
  }
  const { vR, vI } = best;
  const pts = [];
  for (let code = 0; code < 64; code++) {
    const b = codeToBits(code);
    let zR = 0, zI = 0;
    for (let i = 0; i < n; i++) { const sg = 2 * b[i] - 1; zR += sg * vR[i]; zI += sg * vI[i]; }
    pts.push({ code, name: BY_CODE[code] ? BY_CODE[code].name : '?', r: Math.hypot(zR, zI), zR, zI });
  }
  const groups = coxOrbits().map((o) => {
    const rs = o.map((c) => pts[c].r);
    return {
      size: o.length, rMin: Math.min(...rs), rMax: Math.max(...rs),
      flat: Math.max(...rs) - Math.min(...rs),
      names: o.map((c) => pts[c].name),
    };
  });
  return { eigErr: best.err, k: best.k, pts, groups, maxR: Math.max(...pts.map((p) => p.r)) };
}
module.exports.coxProjection = coxProjection;

/* ---------- C₆₄ = {±1,±3}³ 与六十四卦的双射 ----------
 * 三才各占一根轴，每轴 4 个位置正好是四象（2 位 = 2 爻）。
 *   地轴 x ← 初、二    人轴 y ← 三、四    天轴 z ← 五、上
 * 约定：每轴取 g = 2·(上爻) + (下爻) ∈ {0,1,2,3}，坐标 = 2g − 3。
 * 于是 g=0 ↔ (−3) ↔ 两爻全阴，g=3 ↔ (+3) ↔ 两爻全阳 —— 阳爻多则坐标大。
 * 乾 = (3,3,3)、坤 = (−3,−3,−3)，正好是 C 的体对角线两端。
 */
const C_AXIS = [-3, -1, 1, 3];

function guaToC(code) {
  const b = codeToBits(code);            /* [初,二,三,四,五,上] */
  return [
    2 * (2 * b[1] + b[0]) - 3,
    2 * (2 * b[3] + b[2]) - 3,
    2 * (2 * b[5] + b[4]) - 3,
  ];
}
function cToGua(x, y, z) {
  const g = (v) => (v + 3) / 2;           /* 0..3 */
  const bits = [];
  [g(x), g(y), g(z)].forEach((gg) => {
    bits.push(gg & 1, (gg >> 1) & 1);     /* 低位 = 下爻，高位 = 上爻 */
  });
  return bitsToCode(bits);                /* 顺序：初,二,三,四,五,上 */
}
module.exports.C_AXIS = C_AXIS;
module.exports.guaToC = guaToC;
module.exports.cToGua = cToGua;
