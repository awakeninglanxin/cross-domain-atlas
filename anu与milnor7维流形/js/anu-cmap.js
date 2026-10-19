/* ============================================================================
 * anu-cmap.js —— matplotlib 风格色图（colormap），给「按族着色」用
 * ----------------------------------------------------------------------------
 * 🔴 2026-10-08 老师的口径（两条）：
 *   ① 「**3 根粗丝要用 cmap 的 hot**（那种金黄-白渐变感觉），
 *       **7 根细丝要用 cmap 的 rainbow**（那种彩虹渐变感觉）」
 *   ② 「你目前渲染是统一用了一种 cmap 渲染，**不对**」——
 *       旧版全场只有一条光谱 rainbow，粗/细两族在颜色上分不出来。
 *
 * 本模块给两条**互相独立**的色图：
 *   · hot      —— 黑 → 红 → 橙 → 黄 → 白（matplotlib `hot` 的折点）；
 *                 ⚠️ 直接用会让开头一大段是**黑**（在深色背景 + 加色混合下等于隐形），
 *                 所以对外提供 `hotWire(t)`：只取 **hot 的上半段** [0.55, 1.0]
 *                 ⇒ 橙金 → 金黄 → 纯白，正是老师要的「金黄-白渐变」。
 *   · rainbow  —— matplotlib `rainbow`：紫罗兰 → 蓝 → 青 → 绿 → 黄 → 红。
 *
 * 色图用「折点线性插值」实现（matplotlib 的 listed cmap 就是分段线性），
 * 与 matplotlib 的折点对齐，故视觉上与 `plt.cm.hot` / `plt.cm.rainbow` 一致。
 *
 * 纯数学模块，不依赖 three.js / DOM，可在 node 下 require 做数值测试。
 * ==========================================================================*/
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.AnuCmap = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function clamp01(t) { return t < 0 ? 0 : (t > 1 ? 1 : t); }

  /**
   * 分段线性色图求值。
   * @param {Array<[number, number]>} knots 折点 [[t, value], ...]，t 递增
   * @param {number} t
   */
  function ramp(knots, t) {
    var n = knots.length, i;
    if (t <= knots[0][0]) { return knots[0][1]; }
    if (t >= knots[n - 1][0]) { return knots[n - 1][1]; }
    for (i = 1; i < n; i++) {
      if (t <= knots[i][0]) {
        var t0 = knots[i - 1][0], v0 = knots[i - 1][1];
        var t1 = knots[i][0], v1 = knots[i][1];
        var f = (t1 - t0) < 1e-12 ? 0 : (t - t0) / (t1 - t0);
        return v0 + (v1 - v0) * f;
      }
    }
    return knots[n - 1][1];
  }

  /* --------------------------------------- matplotlib "hot" 的三通道折点 */
  var HOT_R = [[0.0000, 0.0416], [0.3651, 1.0000], [1.0000, 1.0000]];
  var HOT_G = [[0.0000, 0.0000], [0.7460, 1.0000], [1.0000, 1.0000]];
  var HOT_B = [[0.0000, 0.0000], [0.9690, 1.0000], [1.0000, 1.0000]];

  /* ------------------------------------ matplotlib "rainbow" 的三通道折点 */
  var RBW_R = [[0.00, 0.50], [0.20, 0.00], [0.50, 0.00], [0.80, 1.00], [1.00, 1.00]];
  var RBW_G = [[0.00, 0.00], [0.30, 0.30], [0.50, 1.00], [0.90, 1.00], [1.00, 0.40]];
  var RBW_B = [[0.00, 1.00], [0.40, 0.60], [0.60, 0.00], [1.00, 0.00]];

  /** matplotlib `hot` 原味：0 = 黑 → 白。t ∈ [0,1] → [r,g,b] ∈ [0,1]³ */
  function hot(t) {
    t = clamp01(t);
    return [ramp(HOT_R, t), ramp(HOT_G, t), ramp(HOT_B, t)];
  }

  /** matplotlib `rainbow`：紫罗兰 → 蓝 → 青 → 绿 → 黄 → 红 */
  function rainbow(t) {
    t = clamp01(t);
    return [ramp(RBW_R, t), ramp(RBW_G, t), ramp(RBW_B, t)];
  }

  /* 🔴 粗丝用这个：hot 的**上半段** [0.55, 1.0] ⇒ 橙金 → 金黄 → 白。
     不用整段 hot 的原因见文件头：前 55% 在深底 + 加色混合下等于隐形。 */
  var HOT_LO = 0.55, HOT_HI = 1.00;
  function hotWire(t) { return hot(HOT_LO + (HOT_HI - HOT_LO) * clamp01(t)); }

  return {
    hot: hot, rainbow: rainbow, hotWire: hotWire,
    HOT_LO: HOT_LO, HOT_HI: HOT_HI, ramp: ramp
  };
});
