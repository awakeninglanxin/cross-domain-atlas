/* ============================================================
 * dense.js —— 「密铺全貌」视图
 *
 * 对应视频里那张最复杂、层数最多的画面：不再只取一条 Hopf 纤维上的 u，
 * 而是让 u 跑遍 S³ 的一整张网格（Hopf 坐标 (χ,ψ) 铺底空间 S²，φ 铺纤维方向），
 * 把参考圆的像一层层堆起来 —— 得到 S⁷ 的一个「切片」。
 *
 *   曲线集合 = { ξ_{h,j}(u, v(θ)) : u ∈ 网格 ⊂ S³ , v ∈ 参考圆 , θ ∈ S¹ }
 *
 * 三条曲线族之间的关系正是判读要点：
 *   · h+j=0 的 ξ₀,₀ —— ξ 与 u 无关，所有像重合 ⇒ 塌成一条（平凡丛的指纹）
 *   · h+j=1 的怪球  —— 像彼此错开、层层套叠 ⇒ 织成密实的多层面
 * ============================================================ */
(function (global) {
  'use strict';

  var TAU = Math.PI * 2;
  var Dense = {};

  /* 密度档位：nChi × nPsi × nPhi 条曲线，每条 nTheta 段 */
  Dense.LEVELS = {
    low:  { label: '疏', nChi: 4, nPsi: 6,  nPhi: 4, nTheta: 72 },
    mid:  { label: '中', nChi: 6, nPsi: 9,  nPhi: 4, nTheta: 64 },
    high: { label: '密', nChi: 8, nPsi: 12, nPhi: 4, nTheta: 56 }
  };

  Dense.LEVEL_ORDER = ['low', 'mid', 'high'];

  Dense.gridOpts = function (level) {
    var L = Dense.LEVELS[level] || Dense.LEVELS.mid;
    return { nChi: L.nChi, nPsi: L.nPsi, nPhi: L.nPhi, nTheta: L.nTheta };
  };

  /** 该档位的代价：曲线条数与总段数 */
  Dense.cost = function (level) {
    var o = Dense.gridOpts(level);
    var curves = o.nChi * o.nPsi * o.nPhi;
    return { curves: curves, segs: curves * o.nTheta };
  };

  /* 颜色：色相绕底空间经度 ψ 铺开，纤维位置 φ 再轻微偏一点，
     这样同一条 Hopf 纤维上的那几层颜色相近、不同纤维之间颜色拉开 —— 便于数层。 */
  function colorOf(psi, phi) {
    var hue = ((psi / TAU) + 0.10 * (phi / TAU)) % 1;
    return hsl(hue, 0.78, 0.56);
  }

  function hsl(h, s, l) {
    h = ((h % 1) + 1) % 1;
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs(((h * 6) % 2) - 1));
    var m = l - c / 2, r = 0, g = 0, b = 0;
    if (h < 1 / 6) { r = c; g = x; }
    else if (h < 2 / 6) { r = x; g = c; }
    else if (h < 3 / 6) { g = c; b = x; }
    else if (h < 4 / 6) { g = x; b = c; }
    else if (h < 5 / 6) { r = x; b = c; }
    else { r = c; b = x; }
    function q(v) { return ('0' + Math.round((v + m) * 255).toString(16)).slice(-2); }
    return '#' + q(r) + q(g) + q(b);
  }

  /**
   * 生成密铺曲线（世界坐标，未投影）
   * @returns {{pts:number[][], color:string, chi:number, psi:number, phi:number}[]}
   */
  Dense.build = function (proj, h, j, level, opt) {
    var o = Dense.gridOpts(level);
    if (opt && opt.nTheta) o.nTheta = opt.nTheta;
    var grid = global.Geo.sampleDenseGrid(proj, h, j, o);
    for (var i = 0; i < grid.length; i++) {
      grid[i].color = (opt && opt.monoColor) ? opt.monoColor : colorOf(grid[i].psi, grid[i].phi);
    }
    return grid;
  };

  /** 交给渲染器批量画（几百条曲线必须走批量接口） */
  Dense.draw = function (c3d, curves, opt) {
    var o = opt || {};
    c3d.drawPolylineBatch(curves, {
      color: o.color || '#4d7cff',
      width: o.width || 1.0,
      alpha: o.alpha === undefined ? 0.72 : o.alpha,
      depthFade: o.depthFade === undefined ? 0.62 : o.depthFade
    });
  };

  /** 四元数 u 在 S³ 上的位置（Hopf 坐标）→ 供画「底空间网格」参考点 */
  Dense.uPoints = function (h, j, level) {
    var o = Dense.gridOpts(level), out = [];
    for (var ic = 0; ic < o.nChi; ic++) {
      var chi = Math.PI * (ic + 0.5) / o.nChi;
      for (var ip = 0; ip < o.nPsi; ip++) {
        var psi = TAU * ip / o.nPsi;
        for (var ifi = 0; ifi < o.nPhi; ifi++) {
          out.push(global.Geo.s3(chi, psi, TAU * ifi / o.nPhi));
        }
      }
    }
    return out;
  };

  global.Dense = Dense;
})(window);
