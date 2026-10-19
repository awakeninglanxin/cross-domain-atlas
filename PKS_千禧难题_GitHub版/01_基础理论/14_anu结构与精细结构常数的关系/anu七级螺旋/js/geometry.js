/* ============================================================
 * geometry.js —— S³ 上的几何：结构映射 ξ、参考曲线、立体投影
 *
 * 数学约定
 *   单位四元数 ≅ S³ ⊂ ℍ ≅ ℝ⁴
 *   结构映射   ξ_{h,j}(u, v) = u^h · v · u^j       （四元数乘法）
 *   粘合映射   (u, v) ↦ (u, u^h v u^j)
 *   同调球条件 h + j = 1  ⇒ 总空间同胚于 S⁷
 *
 * 参考曲线（Niles Johnson 的取法）
 *   A = w-z 圆 : (cosθ, 0, 0, sinθ)      θ ∈ [0, 2π)
 *   B = x-y 圆 : (0, cosθ, sinθ, 0)      θ ∈ [0, 2π)
 *   W = 二维球面 w = 0
 *   Hopf 纤维  u(τ) = (cosτ, sinτ, 0, 0)
 * ============================================================ */
(function (global) {
  'use strict';

  var Geo = {};

  /* ---------- 参考曲线（单位四元数） ---------- */

  Geo.circleA = function (t) {                 // w-z 参考圆
    return [Math.cos(t), 0, 0, Math.sin(t)];
  };

  Geo.circleB = function (t) {                 // x-y 参考圆
    return [0, Math.cos(t), Math.sin(t), 0];
  };

  Geo.sphereW0 = function (phi, t) {           // 二维球面 w = 0
    var sp = Math.sin(phi), cp = Math.cos(phi);
    return [0, sp * Math.cos(t), sp * Math.sin(t), cp];
  };

  Geo.fiber = function (t) {                   // Hopf 纤维（S³ 内的一族圆）
    return [Math.cos(t), Math.sin(t), 0, 0];
  };

  /**
   * S³ 的 **Hopf 坐标**：(χ, ψ, φ) ↦ 单位四元数，三个角度积分覆盖整个 S³。
   *   χ ∈ [0, π]   纬度：χ=0 时 u 落在 (x,y) 平面上（纤维退化）
   *   ψ ∈ [0, 2π)  经度 —— (χ, ψ) 一起参数化 Hopf 映射的**底空间 S²**
   *   φ ∈ [0, 2π)  纤维方向：固定 (χ,ψ)、让 φ 跑一遍，就是一条 Hopf 纤维
   * 用途：密铺全貌视图要遍历 u ∈ S³，而 Hopf 纤维参数 τ 只是其中一条线。
   */
  Geo.s3 = function (chi, psi, phi) {
    var a = Math.cos(chi / 2), b = Math.sin(chi / 2);
    var p1 = (psi + phi) / 2, p2 = (psi - phi) / 2;
    return [a * Math.cos(p1), a * Math.sin(p1), b * Math.cos(p2), b * Math.sin(p2)];
  };

  /**
   * **密铺全貌**：把 ξ_{h,j}(u, ·) 施加到参考圆上，让 u 跑遍 S³ 的一个网格，
   * 得到视频里那张「S⁷ 的切片」——一层层错开、密密织满的多层结构。
   *
   * u 的取法：底空间 S² 上取 nChi × nPsi 个点（每个点代表一条 Hopf 纤维），
   * 每条纤维上再取 nPhi 个位置。所以总曲线数 = nChi·nPsi·nPhi，
   * 每条曲线是参考圆的一张像（立体投影后）。
   *
   * @returns {{pts:number[][], u:number[], chi:number, psi:number, phi:number}[]}
   */
  Geo.sampleDenseGrid = function (proj, h, j, o) {
    var opt = o || {};
    var nChi = opt.nChi || 4, nPsi = opt.nPsi || 6, nPhi = opt.nPhi || 4;
    var nTheta = opt.nTheta || 80;
    var curve = opt.curve || Geo.circleA;
    var out = [];
    for (var ic = 0; ic < nChi; ic++) {
      var chi = Math.PI * (ic + 0.5) / nChi;
      for (var ip = 0; ip < nPsi; ip++) {
        var psi = Math.PI * 2 * ip / nPsi;
        for (var ifi = 0; ifi < nPhi; ifi++) {
          var phi = Math.PI * 2 * ifi / nPhi;
          var u = Geo.s3(chi, psi, phi);
          var prep = Geo.prepare(u, h, j);
          var pts = new Array(nTheta + 1);
          for (var it = 0; it <= nTheta; it++) {
            pts[it] = proj.project(Geo.xi(prep.uh, prep.uj, curve(Math.PI * 2 * it / nTheta)));
          }
          out.push({ pts: pts, u: u, chi: chi, psi: psi, phi: phi });
        }
      }
    }
    return out;
  };

  /** 密铺网格的曲线条数（供 UI 预估代价） */
  Geo.denseCount = function (o) {
    var opt = o || {};
    return (opt.nChi || 4) * (opt.nPsi || 6) * (opt.nPhi || 4);
  };

  /* ---------- 结构映射 ---------- */
  /**
   * 预先算好 u^h 与 u^j（只依赖 τ），再对每个 v 做 ξ。
   * @param {number[]} uh  u^h
   * @param {number[]} uj  u^j
   * @param {number[]} v   参考点
   */
  Geo.xi = function (uh, uj, v) {
    return Q.mul(Q.mul(uh, v), uj);
  };

  Geo.prepare = function (u, h, j) {
    return { uh: Q.pow(u, h), uj: Q.pow(u, j) };
  };

  /* ---------- 立体投影 ---------- */

  function dot4(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  }

  /* 构造 P 的正交补 P^⊥ 的一组标准正交基（Gram-Schmidt） */
  function basisOf(P) {
    var cand = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
    var basis = [];
    for (var c = 0; c < cand.length && basis.length < 3; c++) {
      var w = cand[c].slice();
      var d = dot4(w, P), i;
      for (i = 0; i < 4; i++) w[i] -= d * P[i];
      for (var k = 0; k < basis.length; k++) {
        d = dot4(w, basis[k]);
        for (i = 0; i < 4; i++) w[i] -= d * basis[k][i];
      }
      var n = Math.sqrt(dot4(w, w));
      if (n > 1e-8) {
        for (i = 0; i < 4; i++) w[i] /= n;
        basis.push(w);
      }
    }
    return basis;
  }

  /**
   * 生成投影器：S³ ⊂ ℝ⁴ → ℝ³
   * 先做从极点 P 出发的立体投影，再做「软化压缩」把 ∞ 拉回有限半径，
   * 保证动画全程有界（曲线经过极点时平滑逼近边界球）。
   */
  Geo.makeProjector = function (pole, softR) {
    var P = Q.normalize(pole);
    var B = basisOf(P);
    softR = softR || 4.0;

    return {
      pole: P,
      basis: B,
      /** @returns {number[]} [x,y,z]，有界（|p| < softR） */
      project: function (X) {
        var t = dot4(X, P);
        var den = 1 - t;
        if (den < 1e-6) den = 1e-6;            // 极点附近：数值保护
        var c = [
          dot4(X, B[0]) / den,
          dot4(X, B[1]) / den,
          dot4(X, B[2]) / den
        ];
        /* 软化压缩：|p| → |p| / sqrt(1 + (|p|/R)²)，上界 R */
        var s = Math.sqrt(c[0] * c[0] + c[1] * c[1] + c[2] * c[2]);
        if (s > 1e-9) {
          var f = 1 / Math.sqrt(1 + (s / softR) * (s / softR));
          c[0] *= f; c[1] *= f; c[2] *= f;
        }
        return c;
      }
    };
  };

  /* ---------- 一整条曲线：采样 + 变换 + 投影 ---------- */
  /**
   * @param {object} proj   投影器
   * @param {number} tau    Hopf 纤维参数
   * @param {number} h,j    丛参数
   * @param {function} curve 参考曲线函数 t ↦ 四元数
   * @param {number} n      采样点数
   * @param {boolean} apply 是否施加 ξ（false 则画原始参考曲线）
   */
  Geo.sampleCurve = function (proj, tau, h, j, curve, n, apply) {
    var out = new Array(n + 1);
    var prep = null;
    if (apply) prep = Geo.prepare(Geo.fiber(tau), h, j);
    for (var i = 0; i <= n; i++) {
      var t = (i / n) * Math.PI * 2;
      var v = curve(t);
      var X = apply ? Geo.xi(prep.uh, prep.uj, v) : v;
      out[i] = proj.project(X);
    }
    return out;
  };

  /**
   * 采样二维球面（w = 0）的网格线，用于结构映射视图
   */
  Geo.sampleSphereGrid = function (proj, tau, h, j, nu, nv) {
    var prep = Geo.prepare(Geo.fiber(tau), h, j);
    var lines = [];
    var i, jj, k, t;
    for (i = 1; i < nu; i++) {                 // 纬线
      var phi = (i / nu) * Math.PI;
      var pts = [];
      for (k = 0; k <= nv; k++) {
        t = (k / nv) * Math.PI * 2;
        pts.push(proj.project(Geo.xi(prep.uh, prep.uj, Geo.sphereW0(phi, t))));
      }
      lines.push({ pts: pts, kind: 'lat' });
    }
    for (jj = 0; jj < nv; jj += 2) {           // 经线（隔一条画，减少线条）
      t = (jj / nv) * Math.PI * 2;
      var pts2 = [];
      for (k = 0; k <= nu; k++) {
        var ph = (k / nu) * Math.PI;
        pts2.push(proj.project(Geo.xi(prep.uh, prep.uj, Geo.sphereW0(ph, t))));
      }
      lines.push({ pts: pts2, kind: 'lon' });
    }
    return lines;
  };

  /* ---------- 纤维管：一族圆的网格 ---------- */
  /**
   * 沿 Hopf 纤维把参考圆 A 的像堆叠成管。
   * @returns {{rings: number[][][], nTau:number, nTheta:number}}
   */
  Geo.buildTube = function (proj, h, j, nTau, nTheta) {
    var rings = new Array(nTau);
    for (var i = 0; i < nTau; i++) {
      var tau = (i / nTau) * Math.PI * 2;
      rings[i] = Geo.sampleCurve(proj, tau, h, j, Geo.circleA, nTheta, true);
    }
    return { rings: rings, nTau: nTau, nTheta: nTheta };
  };

  global.Geo = Geo;
})(window);
