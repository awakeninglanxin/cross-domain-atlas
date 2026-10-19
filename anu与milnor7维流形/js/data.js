/* ============================================================
 * data.js —— Θ₇ ≅ ℤ/28 的 28 个元素
 *
 * 判定依据（Eells–Kuiper 1962）：
 *   28·μ(M_h⁷) ≡ h(h−1)/2  (mod 28)   ，其中 h + j = 1
 * 遍历 h 得到的像恰有 16 个元素 ⇒ 16 个是 Milnor 球（S³ 丛可实现），
 * 其余 12 个只能作为连通和出现。
 *
 * 字段：n, lam(=n mod 7), milnor, h, j, k(=h−j), twist(=k−1), decomp
 * ============================================================ */
(function (global) {
  'use strict';

  var DATA28 = [
    { n: 0,  lam: 0, milnor: true,  h: 1,  j: 0,    k: 1,  twist: 0,  decomp: null },
    { n: 1,  lam: 1, milnor: true,  h: 2,  j: -1,   k: 3,  twist: 2,  decomp: null },
    { n: 2,  lam: 2, milnor: false, h: null, j: null, k: null, twist: null, decomp: [1, 1] },
    { n: 3,  lam: 3, milnor: true,  h: 3,  j: -2,   k: 5,  twist: 4,  decomp: null },
    { n: 4,  lam: 4, milnor: false, h: null, j: null, k: null, twist: null, decomp: [1, 3] },
    { n: 5,  lam: 5, milnor: false, h: null, j: null, k: null, twist: null, decomp: [6, 27] },
    { n: 6,  lam: 6, milnor: true,  h: 4,  j: -3,   k: 7,  twist: 6,  decomp: null },
    { n: 7,  lam: 0, milnor: true,  h: 14, j: -13,  k: 27, twist: 26, decomp: null },
    { n: 8,  lam: 1, milnor: true,  h: 9,  j: -8,   k: 17, twist: 16, decomp: null },
    { n: 9,  lam: 2, milnor: false, h: null, j: null, k: null, twist: null, decomp: [1, 8] },
    { n: 10, lam: 3, milnor: true,  h: 5,  j: -4,   k: 9,  twist: 8,  decomp: null },
    { n: 11, lam: 4, milnor: false, h: null, j: null, k: null, twist: null, decomp: [1, 10] },
    { n: 12, lam: 5, milnor: false, h: null, j: null, k: null, twist: null, decomp: [6, 6] },
    { n: 13, lam: 6, milnor: true,  h: 18, j: -17,  k: 35, twist: 34, decomp: null },
    { n: 14, lam: 0, milnor: true,  h: 21, j: -20,  k: 41, twist: 40, decomp: null },
    { n: 15, lam: 1, milnor: true,  h: 6,  j: -5,   k: 11, twist: 10, decomp: null },
    { n: 16, lam: 2, milnor: false, h: null, j: null, k: null, twist: null, decomp: [1, 15] },
    { n: 17, lam: 3, milnor: true,  h: 10, j: -9,   k: 19, twist: 18, decomp: null },
    { n: 18, lam: 4, milnor: false, h: null, j: null, k: null, twist: null, decomp: [1, 17] },
    { n: 19, lam: 5, milnor: false, h: null, j: null, k: null, twist: null, decomp: [6, 13] },
    { n: 20, lam: 6, milnor: true,  h: 25, j: -24,  k: 49, twist: 48, decomp: null },
    { n: 21, lam: 0, milnor: true,  h: 7,  j: -6,   k: 13, twist: 12, decomp: null },
    { n: 22, lam: 1, milnor: true,  h: 13, j: -12,  k: 25, twist: 24, decomp: null },
    { n: 23, lam: 2, milnor: false, h: null, j: null, k: null, twist: null, decomp: [1, 22] },
    { n: 24, lam: 3, milnor: true,  h: 17, j: -16,  k: 33, twist: 32, decomp: null },
    { n: 25, lam: 4, milnor: false, h: null, j: null, k: null, twist: null, decomp: [1, 24] },
    { n: 26, lam: 5, milnor: false, h: null, j: null, k: null, twist: null, decomp: [6, 20] },
    { n: 27, lam: 6, milnor: true,  h: 11, j: -10,  k: 21, twist: 20, decomp: null }
  ];

  /* ---------------------------------------------------------------
   * 视频里出现的经典算例，分两层：
   *   ① 球面层   h + j = 1 —— 总空间同胚于 S⁷（标准球或怪球）
   *   ② 丛层     h + j = 0 —— 总空间只有 S³×S⁴ 的同调，一般不是球面
   * 这正是讲解里那句 "bundles M(h,−h) followed by standard and exotic
   * seven-spheres" —— 两层都被收进来了。
   *
   * n  = 该 ξ 对应的 Θ₇ 元素（由 28μ ≡ h(h−1)/2 mod 28 反解）；
   *      n = null 表示「不对应网格里任何一个 Milnor 元素」，只渲染这个丛本身。
   * --------------------------------------------------------------- */
  var PRESETS = [
    { name: 'ξ₁,₀ 标准 S⁷',      h: 1, j: 0,  n: 0,
      note: 'k = 1，相对扭转率 0。μ = 0，是 28 个元素里的单位元，轨道族最平缓。' },
    { name: 'ξ₂,₋₁ Milnor 怪球', h: 2, j: -1, n: 1,
      note: 'k = 3，相对扭转率 2。μ = 1/28，λ = 1 —— Θ₇ 的生成元，Milnor 1956 的原始例子。' },
    { name: 'ξ₃,₋₂ Milnor 怪球', h: 3, j: -2, n: 3,
      note: 'k = 5，相对扭转率 4。μ = 3/28，λ = 3。视频里用来和 S⁷₁ 对照的那一支。' },
    { name: 'ξ₄,₋₃ Milnor 怪球', h: 4, j: -3, n: 6,
      note: 'k = 7，相对扭转率 6。μ = 6/28，λ = 6。' },
    { name: 'ξ₆,₋₅ Milnor 怪球', h: 6, j: -5, n: 15,
      note: 'k = 11，相对扭转率 10。μ = 15/28，λ = 1 —— 讲解 PDF 表格里的第 5 行（之前本页漏了这一支）。' },
    { name: 'ξ₈,₋₇ 思考题（k=15）', h: 8, j: -7, n: null,
      note: 'k = 15，相对扭转率 14 —— 表中 k 最大、管最卷的一支。λ = 1，' +
            '但 μ = 8·7/2 = 28 ≡ 0 (mod 28) ⇒ 它其实与标准球面微分同胚。' +
            '「管很卷、球却是标准的」 = λ 不完备的经典例证（答案要用 Â-亏格）。' }
  ];

  /* 丛层 M(h,−h)：h + j = 0，同调同 S³×S⁴，但一般不同胚 */
  var BUNDLE_PRESETS = [
    { name: 'ξ₀,₀ ＝ S³×S⁴',   h: 0, j: 0,  note: '平凡丛：ξ 是恒等映射，96 张参考圆像全部重合，密铺视图塌成一条曲线 —— 一个干净的基准。' },
    { name: 'ξ₁,₋₁ ＝ M(1,−1)', h: 1, j: -1, note: 'h+j=0：ξ 退化为「用 u 做共轭旋转」。共轭固定 ±1，而 ±1 都在 w-z 参考圆上，所以这张像在立体投影下看起来像三维空间里的旋转。' },
    { name: 'ξ₂,₋₂ ＝ M(2,−2)', h: 2, j: -2, note: 'h+j=0：共轭旋转走两圈。同调与 S³×S⁴ 一样，但第一 Pontrjagin 类不同 ⇒ 与 M(1,−1)、S³×S⁴ 两两不同胚。' }
  ];

  /** 由 (h,j) 算相对扭转率 k−1（k = h−j） */
  function twistOf(h, j) { return (h - j) - 1; }

  global.DATA28 = DATA28;
  global.PRESETS = PRESETS;
  global.BUNDLE_PRESETS = BUNDLE_PRESETS;
  global.twistOf = twistOf;
})(window);
