/* ============================================================================
 * anu-smooth.js —— 曲线平滑：centripetal Catmull-Rom（三次 B-spline 插值族）
 * ----------------------------------------------------------------------------
 * 🔴 为什么需要它（2026-10-08 老师：「螺旋线你是不是没有用 bspline 连接散点，
 *    一点不丝滑，像 dna」＋「螺旋线放大看像很多折线」）：
 *
 *   three.js 的 `THREE.Line` + `LineBasicMaterial` 是 **折线图元（GL_LINE_STRIP）** ——
 *   GPU 只会把相邻顶点用**直线段**连起来，**不做任何曲线插值**。
 *   所以无论采样点加到多密，放大看永远是折线；「棱角」就是该顶点处的**方向突变角**。
 *   实测旧参数（每匝 4 点）相邻段夹角中位 **46.9°**、P90 **164.4°** —— 一圈就是个四边形。
 *
 *   本模块在**相邻采样点之间**再造曲线：B-spline 家族的单段三次插值。
 *   曲线**严格穿过原有每一个采样点**（插值性质 ⇒ 几何数据一个都不丢），
 *   段与段之间 C¹ 连续 ⇒ 顶点处的方向突变角被摊到整段上，棱角消失。
 *
 * 🔴 为什么用 **centripetal**（α = 0.5）而不是 uniform（α = 0）：
 *   uniform Catmull-Rom 在「点距突变」处会 overshoot、打圈、甚至自交（经典 cusp）；
 *   centripetal 参数化（Yuksel et al. 2011, *A Fully Progressive Approach to
 *   Catmull-Rom Curves*）**数学上保证不自交、不打圈**，对非均匀采样最稳定 ——
 *   正好适合「螺旋线 + 拐点（底端翻转 / 顶端掉头）」这种采样疏密不均的曲线。
 *
 * 纯数学模块，**不依赖 three.js / DOM**，可在 node 下 require 做数值测试。
 * ==========================================================================*/
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.AnuSmooth = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var ALPHA = 0.5;          /* 0 = uniform，0.5 = centripetal，1 = chordal */
  var EPS = 1e-12;

  /* ---------------------------------------------------------------- 读数器 */
  /* 统一支持两种输入：扁平 Float32Array/Float64Array/Array（长度 3N）
     或 [[x,y,z], ...] 的嵌套数组。 */
  function countOf(arr) {
    if (!arr || !arr.length) { return 0; }
    return (typeof arr[0] === 'number') ? Math.floor(arr.length / 3) : arr.length;
  }
  function getX(arr, i) { return (typeof arr[0] === 'number') ? arr[i * 3] : arr[i][0]; }
  function getY(arr, i) { return (typeof arr[0] === 'number') ? arr[i * 3 + 1] : arr[i][1]; }
  function getZ(arr, i) { return (typeof arr[0] === 'number') ? arr[i * 3 + 2] : arr[i][2]; }

  /* ------------------------------------------------- 单段 centripetal CR */
  /**
   * 在 P1→P2 之间插一个点。
   * @param {number[]} p0,p1,p2,p3 四个控制点（各 [x,y,z]）
   * @param {number} s  段内参数 0..1（0 = 落在 P1，1 = 落在 P2）
   * @returns {number[]} 插值点
   */
  function crPoint(p0, p1, p2, p3, s) {
    function d(a, b) {
      var dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
      return Math.pow(Math.sqrt(dx * dx + dy * dy + dz * dz), ALPHA);
    }
    var t0 = 0;
    var t1 = t0 + Math.max(d(p0, p1), EPS);
    var t2 = t1 + Math.max(d(p1, p2), EPS);
    var t3 = t2 + Math.max(d(p2, p3), EPS);
    var t = t1 + (t2 - t1) * s;

    function mix(a, b, ta, tb, tt) {
      var w = (tb - tt) / (tb - ta), v = (tt - ta) / (tb - ta);
      return [a[0] * w + b[0] * v, a[1] * w + b[1] * v, a[2] * w + b[2] * v];
    }
    var A1 = mix(p0, p1, t0, t1, t);
    var A2 = mix(p1, p2, t1, t2, t);
    var A3 = mix(p2, p3, t2, t3, t);
    var B1 = mix(A1, A2, t0, t2, t);
    var B2 = mix(A2, A3, t1, t3, t);
    return mix(B1, B2, t1, t2, t);
  }

  /**
   * 对点列做 centripetal Catmull-Rom 细分。
   * @param {Float32Array|Array} pts  点列（扁平 3N 或 [[x,y,z],...]）
   * @param {boolean} closed          是否闭合曲线（弹簧环）
   * @param {number}  sub             每段细分数（≥1；1 = 原样返回副本）
   * @returns {{pts: Float32Array, count: number, sub: number}}
   *          pts 恒为**扁平 Float32Array**（scene 直接塞 BufferAttribute）；
   *          count = 顶点个数；几何原始采样点**全部保留**（插值性质）。
   */
  function resample(pts, closed, sub) {
    var N = countOf(pts);
    var k = Math.max(1, Math.round(sub || 1));
    if (N < 2) {
      var same = new Float32Array(Math.max(0, N) * 3);
      for (var q = 0; q < N; q++) {
        same[q * 3] = getX(pts, q); same[q * 3 + 1] = getY(pts, q); same[q * 3 + 2] = getZ(pts, q);
      }
      return { pts: same, count: N, sub: 1 };
    }

    /* 取点（closed 时环形取模；open 时端点钳制 ⇒ 自然外推，不产生额外拐角） */
    function P(i) {
      var j = i;
      if (closed) { j = ((i % N) + N) % N; }
      else { j = Math.max(0, Math.min(N - 1, i)); }
      return [getX(pts, j), getY(pts, j), getZ(pts, j)];
    }

    var segs = closed ? N : (N - 1);
    var outCount = k === 1 ? N : (closed ? segs * k : segs * k + 1);
    var out = new Float32Array(outCount * 3);
    var m = 0, si, s;
    for (si = 0; si < segs; si++) {
      var p0 = P(si - 1), p1 = P(si), p2 = P(si + 1), p3 = P(si + 2);
      if (k === 1) {
        out[m * 3] = p1[0]; out[m * 3 + 1] = p1[1]; out[m * 3 + 2] = p1[2]; m++;
        continue;
      }
      for (s = 0; s < k; s++) {
        var pt = crPoint(p0, p1, p2, p3, s / k);
        out[m * 3] = pt[0]; out[m * 3 + 1] = pt[1]; out[m * 3 + 2] = pt[2]; m++;
      }
    }
    if (k === 1) {
      if (!closed) {   /* 开放曲线补末点 */
        out[m * 3] = getX(pts, N - 1); out[m * 3 + 1] = getY(pts, N - 1); out[m * 3 + 2] = getZ(pts, N - 1); m++;
      }
    } else if (!closed) {
      out[m * 3] = getX(pts, N - 1); out[m * 3 + 1] = getY(pts, N - 1); out[m * 3 + 2] = getZ(pts, N - 1); m++;
    }
    return { pts: out.subarray(0, m * 3), count: m, sub: k };
  }

  /** 便捷：扁平输入 → [[x,y,z],...] 输出（给 guides 的虚线用） */
  function resampleVec(pts, closed, sub) {
    var r = resample(pts, closed, sub), o = [], i;
    for (i = 0; i < r.count; i++) { o.push([r.pts[i * 3], r.pts[i * 3 + 1], r.pts[i * 3 + 2]]); }
    return { pts: o, count: r.count, sub: r.sub };
  }

  /**
   * 诊断用：逐顶点的「方向突变角」（入段 vs 出段夹角，0 = 完全直，180 = 掉头）。
   * 折线感的**唯一**量化指标 —— 角度越大越"折"。
   * @returns {{mean, med, p90, max, n}}  单位：度
   */
  function bendAngles(pts, closed) {
    var N = countOf(pts), list = [], i;
    for (i = 1; i + 1 < N; i++) {
      var ax = getX(pts, i) - getX(pts, i - 1), ay = getY(pts, i) - getY(pts, i - 1), az = getZ(pts, i) - getZ(pts, i - 1);
      var bx = getX(pts, i + 1) - getX(pts, i), by = getY(pts, i + 1) - getY(pts, i), bz = getZ(pts, i + 1) - getZ(pts, i);
      var la = Math.sqrt(ax * ax + ay * ay + az * az), lb = Math.sqrt(bx * bx + by * by + bz * bz);
      if (la < EPS || lb < EPS) { continue; }
      var cs = (ax * bx + ay * by + az * bz) / (la * lb);
      cs = Math.max(-1, Math.min(1, cs));
      list.push(Math.acos(cs) * 180 / Math.PI);
    }
    list.sort(function (p, q) { return p - q; });
    var m = list.length;
    return {
      n: m,
      mean: m ? list.reduce(function (s, x) { return s + x; }, 0) / m : 0,
      med: m ? list[Math.floor(m / 2)] : 0,
      p90: m ? list[Math.min(m - 1, Math.floor(m * 0.9))] : 0,
      max: m ? list[m - 1] : 0
    };
  }

  return {
    ALPHA: ALPHA,
    resample: resample,
    resampleVec: resampleVec,
    bendAngles: bendAngles,
    crPoint: crPoint
  };
});
