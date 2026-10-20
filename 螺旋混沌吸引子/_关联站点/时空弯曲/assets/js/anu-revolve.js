/* ============================================================
   anu-revolve.js  —  anu 最简可控参数方程 → 旋转面（蛋形环面 / 直锥体）
   version 1.1.0
   ------------------------------------------------------------
   上游出处（本机，逐条可核对）：
     · 01_基础理论/14_anu结构与精细结构常数的关系/DXF生成程序集/anu3d曲线.py
     · 同目录 README_ANU蛋形曲线程序族.md（§2.1 给出同一族公式）
     · 原始模版：01_基础理论/16_schauberger…/DXF生成程序集/01_直锥螺旋管/
                 「最简原始模版用于生成直锥螺旋管.py」← 所有螺旋程序的共同祖先
       README_程序族详解.md §3.1：直锥的母线 r(t)=R0+(R1−R0)t 是**直线**
       §3.1 末句：**「直锥是蛋形在螺距恒定时的退化版」** ⇒ 「直锥体」＝蛋形环面的退化对照体

   参数语义（本模块用 numpy/Python 单参数扫描实测确认，非猜）：
     a  高矮   轴向跨度 Δz = a·atan(2) ≈ 1.1071·a   —— 与 a 严格线性
     b  漏斗   b→1⁺ 时外缘半径 ∝ 1/(b−1) 发散；b>1 才闭合
     c  中孔   r_min 随 c 增大而减小；c 过零 ⇒ 母线**跨轴** ⇒ 拓扑改变
     k  胖瘦   半径 r ∝ k（纯缩放）
     d  绕数   d=0 ⇒ x≡0，母线退化为 (ρ̃,z) 半平面内的闭合环；
               d≠0 ⇒ 绕 z 轴 d 圈的 3D 螺旋（仅作参考线绘制，不参与成面）

   成面约定（关键，勿改）：
     **旋转面永远由 d=0 的平面母线生成**。d 滑块只多画一条 3D 螺旋参考线。

   度量约定（关键，勿改）—— 两条硬不变量：
     ① **两轴同尺**：半径以 rMax 为一个单位，轴向则用 zStretch = Δz/rMax 把 ζ∈[0,1]
        换算成同样的单位。所有轴向换算只发生在 zAspect() / zOffOf() 里，别处不许再乘。
        忘了换算就是各向异性拉伸：图上量到 90° 的锥，coneGeomFrom 报的却是 78.11°。
     ② **几何量不依赖采样密度**：极值点（腰带 r_max、中孔 r_min）先用三点抛物线定位，
        再对**解析的** r(t) 做三分搜索。未细化时 zWaistNorm 在 n=1200/1400 下差 1.7e-3；
        细化后 n=600…4800 的极差 ≤ 1e-8（`_check/egg_test.js` 有哨兵断言）。
     metrics() 结果可整体传给 buildEgg()/buildCone()（o.metrics）——
     否则各自另采一次样会让 zOff、rBase 在第 6 位小数上对不齐。

   1.1.0 新增：形心（对照组「泡心」要用）
     centroidSurf  { z, zeta }   ★ 页面用它：图上画的是一张**面**（薄壳旋转面）,
     centroidSolid { z, zeta }      所以「质心」按面口径算；实体口径同时给出以便核对。
     两者都在轴上（旋转对称 ⇒ 横向分量恒为 0），所以只给轴向的 z 与归一 ζ。
     默认参数下两者差 0.025·腰半径（ζ 差 0.0206）—— 口径虽小，也必须写清楚。
     直锥的形心有**闭式**（与采样无关）：离底面 h·(rb+2rt)/(3(rb+rt))。
   ============================================================ */
(function (g) {
  'use strict';

  var PI = Math.PI, TAU = 2 * PI;
  var ATAN2_ = Math.atan(2);          /* atan(1+cos t) 在 t=0 处取最大值 atan 2 */

  var DEFAULTS = { a: 3.0, b: 2.76, c: -0.92, k: 3.6, d: 0 };

  function clampP(P) {
    P = P || {};
    return {
      a: num(P.a, DEFAULTS.a),
      b: Math.max(1.02, num(P.b, DEFAULTS.b)),   /* b>1 才闭合，硬夹 */
      c: num(P.c, DEFAULTS.c),
      k: num(P.k, DEFAULTS.k),
      d: Math.max(0, num(P.d, DEFAULTS.d))
    };
  }
  function num(v, d) { v = +v; return isFinite(v) ? v : d; }

  /* ---------- 原式：一个 t 给一个点 ---------- */
  function spacePoint(P, t) {
    var st = Math.sin(t), ct = Math.cos(t);
    var den = ct + P.b;
    if (Math.abs(den) < 1e-9) den = den < 0 ? -1e-9 : 1e-9;
    var rad = -P.k * (P.c - Math.atan(st)) / den;
    return {
      rad: rad,
      x: rad * Math.sin(P.d * t),
      y: rad * Math.cos(P.d * t),
      z: P.a * Math.atan(1 + ct) + P.b
    };
  }

  /* ---------- 采样整条曲线 ---------- */
  function sample(P, n) {
    P = clampP(P);
    n = Math.max(64, (n | 0) || 600);
    var t = new Float64Array(n + 1), x = new Float64Array(n + 1),
        y = new Float64Array(n + 1), z = new Float64Array(n + 1),
        r = new Float64Array(n + 1);
    for (var i = 0; i <= n; i++) {
      var tt = -PI + TAU * i / n, p = spacePoint(P, tt);
      t[i] = tt; x[i] = p.x; y[i] = p.y; z[i] = p.z; r[i] = p.rad;
    }
    return { t: t, x: x, y: y, z: z, r: r, n: n, P: P };
  }

  /* ---------- d=0 的平面母线：半径（恒非负）与高度 ---------- */
  function meridian(P, n) {
    var S = sample({ a: P.a, b: P.b, c: P.c, k: P.k, d: 0 }, n);
    var rr = new Float64Array(S.n + 1);
    for (var i = 0; i <= S.n; i++) rr[i] = Math.abs(S.r[i]);
    return { r: rr, z: S.z, t: S.t, n: S.n, P: S.P };
  }

  /* ---------- 母线几何量（Pappus）+ 直锥基线 ---------- */
  function metrics(P, n) {
    var M = meridian(P, n || 1200);
    var n1 = M.n + 1, i;
    var zMin = Infinity, zMax = -Infinity, rMax = -Infinity, rMin = Infinity;
    var iMax = 0, iMin = 0, signFlip = false, prev = M.r[0];
    for (i = 0; i < n1; i++) {
      var r = M.r[i], z = M.z[i];
      if (z < zMin) zMin = z;
      if (z > zMax) zMax = z;
      if (r > rMax) { rMax = r; iMax = i; }
      if (r < rMin) { rMin = r; iMin = i; }
      if (i > 0 && ((prev > 1e-9 && M.r[i] < -1e-9) || (prev < -1e-9 && M.r[i] > 1e-9))) signFlip = true;
      prev = M.r[i];
    }
    /* 用带符号 r 判跨轴（|r| 已抹掉符号） */
    var S = sample({ a: M.P.a, b: M.P.b, c: M.P.c, k: M.P.k, d: 0 }, M.n);
    for (i = 1; i < n1; i++) if (S.r[i - 1] * S.r[i] < 0) signFlip = true;
    var crossAxis = signFlip || rMin < 1e-9;

    /* ★ 极值点必须**解析细化 + 三分搜索**，不能直接取离散最大点：
       r(t) 在腰带/中孔附近很平坦，样本数一变，argmax 就会跳到相邻样本上 ——
       实测未细化时 zWaistNorm 在 n=1200 与 n=1400 下分别是 0.2330 与 0.2313
       （差 2.4 个样本步）。「几何量不该依赖采样密度」是硬要求：读数板会把它写出来给老师看。
       两步走：① (i−1,i,i+1) 抛物线顶点给出 O(h²) 的初值并确认凹凸方向；
               ② 在该样本邻域内对**解析的** r(t) 做三分搜索（区间缩到机器精度）。
       三分搜索只花 ~90 次 r(t) 求值，换来的是一条与 n 无关的曲线。 */
    function refineExt(i0, wantMax) {
      var j = Math.max(1, Math.min(n1 - 2, i0));
      var y0 = M.r[j - 1], y1 = M.r[j], y2 = M.r[j + 1];
      var den = y0 - 2 * y1 + y2;
      var out = { i: j, val: y1, z: M.z[j], exact: false };
      if (Math.abs(den) < 1e-12) return out;
      if (wantMax ? (den > 0) : (den < 0)) return out;      /* 凹凸不符 ⇒ 不是这种极值 */
      var d = 0.5 * (y0 - y2) / den;
      if (!isFinite(d) || Math.abs(d) > 0.5) return out;
      var val = y1 - 0.25 * (y0 - y2) * d;
      var z = M.z[j] + d * (M.z[j + 1] - M.z[j - 1]) / 2;
      if (!isFinite(val) || !isFinite(z)) return out;

      /* ② 在 [t_{j-1}, t_{j+1}] 内三分搜索 |r(t)| 的真极值。
         先把区间**沿着平台向外扩**：r 在极值附近可能平坦到与相邻样本逐位相等，
         此时离散 argmax 无法定位真极值，只夹一步会漏掉它。 */
      var lo = j - 1, hi = j + 1, ref = M.r[j], eps = 1e-12 * Math.max(1, Math.abs(ref)), g2 = 0;
      while (g2++ < 64) {
        var grew = false;
        if (lo > 0 && (wantMax ? M.r[lo] > ref - eps : M.r[lo] < ref + eps)) { lo--; grew = true; }
        if (hi < n1 - 1 && (wantMax ? M.r[hi] > ref - eps : M.r[hi] < ref + eps)) { hi++; grew = true; }
        if (!grew) break;
      }
      var P0 = M.P, fa = M.t[lo], fb = M.t[hi];
      var f = function (tt) { return Math.abs(spacePoint(P0, tt).rad); };
      var GR = 0.6180339887498949;
      var a = fa, b = fb, c = b - GR * (b - a), e = a + GR * (b - a);
      var fc = wantMax ? -f(c) : f(c), fe = wantMax ? -f(e) : f(e);
      for (var it = 0; it < 100; it++) {
        if (fc < fe) { b = e; e = c; fe = fc; c = b - GR * (b - a); fc = wantMax ? -f(c) : f(c); }
        else { a = c; c = e; fc = fe; e = a + GR * (b - a); fe = wantMax ? -f(e) : f(e); }
      }
      var tm = 0.5 * (a + b), pm = spacePoint(P0, tm);
      return { i: j, val: Math.abs(pm.rad), z: pm.z, t: tm, exact: true };
    }
    var rW = refineExt(iMax, true);      /* 腰带（r 最大） */
    var rH = refineExt(iMin, false);     /* 中孔（r 最小），仅在不跨轴时可信 */
    if (rW.exact) { rMax = Math.max(rMax, rW.val); }
    if (rH.exact && !crossAxis && rH.val > 1e-9) { rMin = Math.min(rMin, rH.val); }
    var zWaist = rW.z, zHole = rH.exact ? rH.z : M.z[iMin];
    var iWaist = rW.i;

    var dz = Math.max(1e-12, zMax - zMin);
    var iZmax = iMaxZ(M.z), iZmin = 0;
    for (i = 1; i < n1; i++) if (M.z[i] < M.z[iZmin]) iZmin = i;

    /* Pappus：有符号面积 + 形心 */
    var A2 = 0, cr = 0, cz = 0, area = 0;
    for (i = 0; i < n1 - 1; i++) {
      var d = M.r[i] * M.z[i + 1] - M.r[i + 1] * M.z[i];
      A2 += d; cr += (M.r[i] + M.r[i + 1]) * d; cz += (M.z[i] + M.z[i + 1]) * d;
    }
    A2 *= 0.5;
    var area = Math.abs(A2);
    var rc = area > 1e-12 ? cr / (6 * A2) : 0;
    var zc = area > 1e-12 ? cz / (6 * A2) : 0;
    var volume = TAU * area * rc;                 /* 旋转体体积（可能为负 ⇒ 取 abs 展示） */

    /* 侧面积：2π∫ r ds。★ 同一次循环里顺手累积两个形心矩（都在轴上 ⇒ 只要 z）：
         薄壳（图上画的就是这张面）：z̄_s = ∮ z·r ds / ∮ r ds
         实体（这张面围出的旋转体）：z̄_v = ∮ z·r dA / ∮ r dA
       ★ 必须与侧面积共用同一个 ds 循环：另起一遍会因采样口径不同而在第 5 位小数上漂。
       实体那一项的换算：面元 dA = dr·dz，用 Green 定理 ∮(z r²/2)dz = ∫∫ z·r dA
         （∂Q/∂r = z·r ⇒ Q = z·r²/2）；段内 r 对 z 取线性 ⇒ ∫ z r² dz 有闭式，
         于是 z̄_v 与采样密度无关（n = 600 与 4800 的极差 ≤ 1e-9）。 */
    var lat = 0, mZs = 0, mZv = 0, mAr = 0;
    for (i = 0; i < n1 - 1; i++) {
      var q0 = M.r[i], q1 = M.r[i + 1], w0 = M.z[i], w1 = M.z[i + 1];
      var ds = Math.hypot(q1 - q0, w1 - w0);
      var qm = 0.5 * (q0 + q1), wm = 0.5 * (w0 + w1);
      lat += qm * ds;
      mZs += qm * wm * ds;                        /* ∮ r z ds   —— 薄壳 */
      var dq = q1 - q0, dw = w1 - w0;
      mZv += 0.5 * dw * (w0 * (q0 * q0 + q0 * dq + dq * dq / 3)
                       + dw * (q0 * q0 / 2 + 2 * q0 * dq / 3 + dq * dq / 4));
      mAr += (q0 * q0 + q0 * q1 + q1 * q1) * dw / 6;   /* ∮ r²/2 dz = ∫∫ r dA */
    }
    var surf = TAU * lat;
    var zcSurf = (Math.abs(lat) > 1e-12) ? mZs / lat : NaN;
    var zcSolid = (Math.abs(mAr) > 1e-12) ? mZv / mAr : NaN;

    /* 母线弧长 + 等周商（闭合环没有"弦长"，用等周商才是良定义的"蛋形度"） */
    var arc = 0;
    for (i = 0; i < n1 - 1; i++) arc += Math.hypot(M.r[i + 1] - M.r[i], M.z[i + 1] - M.z[i]);
    /* isoQ = 4πA/L²：圆 = 1，越"蛋"越小；与"弧长/弦长"不同，闭合环上恒有定义 */
    var isoQ = arc > 1e-12 ? (4 * PI * area) / (arc * arc) : NaN;

    /* 曲率半径：顶点（z 最大处）与腰带（r 最大处） */
    var kap = curveCurvature(M.r, M.z);
    var kapTop = kap[iMaxZ(M.z)], kapWaist = kap[iWaist];

    /* 直锥基线：母线是一段**直线**。三个参数全部可选（归一单位）：
         rBase     底半径 / 蛋形腰半径      （默认 1 ⇒ 底面与泡壁同尺度）
         rTop      顶半径 / 蛋形腰半径      （默认 0 ⇒ 真锥；>0 即直台锥）
         heightFrac 高 / 蛋形轴向跨度 Δz    （默认 1）
         zeta0     底面所在的 ζ 位置        （默认 0 ⇒ 与蛋形底端同高）
       ★ 唯一来源：metrics() / coneMetrics() / buildCone() 共用一个函数，勿各写一份 */
    var cone = coneGeomFrom({ rMax: rMax, dz: dz }, {});

    /* 观测到的「锥度比」——与 PKS 主张的 α = R₀/R_c ≈ 1/137.036 并列，供老师核对 */
    var rhoTop = isFinite(kapTop) ? kapTop : Infinity;
    var rhoWaist = isFinite(kapWaist) ? kapWaist : 0;
    var curRatio = (rhoWaist > 1e-12 && isFinite(rhoTop)) ? rhoTop / rhoWaist : NaN;

    return {
      P: M.P,
      zMin: zMin, zMax: zMax, dz: dz,
      rMin: rMin, rMax: rMax, rMaxOverDz: rMax / dz,
      /* ★ 真实度量的轴向单位：把 ζ∈[0,1] 换成「rMax 为一个单位」的长度。
         蛋形母线在 ζ 上的跨度是 1，但它的**真实**长度是 dz/rMax ≈ 1.232（默认参数）。
         成面/画图时 z 与 r 必须用同一把尺，否则图形被各向异性拉伸
         —— 图上看着 90° 的锥，表里却写 78.11°，两者互相打脸。
         全部换算只在 zAspect()/alignZOff() 里发生，别处不许再乘。 */
      zStretch: dz / rMax,
      zWaist: zWaist, zHole: zHole,
      zWaistNorm: (zWaist - zMin) / dz,             /* 腰带在 [0,1] 内的位置（已解析细化） */
      zHoleNorm: (zHole - zMin) / dz,
      /* 顶盖 / 底端处的半径（归一）——用来给直锥「把顶半径设成蛋形顶盖」这类操作取数 */
      iZmax: iZmax, iZmin: iZmin,
      rhoAtZmax: M.r[iZmax], rhoAtZmin: M.r[iZmin],
      rhoAtZmaxNorm: M.r[iZmax] / rMax, rhoAtZminNorm: M.r[iZmin] / rMax,
      crossAxis: crossAxis,
      genus: crossAxis ? 0 : 1,                     /* 0 = 球状（可缩）；1 = 环面（有孔） */
      meridianArea: area, centroid: { r: rc, z: zc },
      /* ★ 形心两口径（旋转对称 ⇒ 横向分量恒 0，只给轴向 z 与归一 ζ）。
         『泡心 = 质心』用的是 centroidSurf：图上画的是薄壳旋转面，不是实体。
         centroidSolid 一并给出：默认参数下两者 ζ 差 0.0206（0.025·腰半径）。
         ζ = (z − zMin)/Δz —— 与母线归一用同一个 ζ，泡心的 Z 换算因此只有一处口径。 */
      centroidSurf:  { z: zcSurf,  zeta: (zcSurf  - zMin) / dz },
      centroidSolid: { z: zcSolid, zeta: (zcSolid - zMin) / dz },
      /* 自洽哨兵：Pappus 给 V = 2π·A·r̄，而 ∫∫ r dA = A·r̄ ⇒ V = TAU·mAr。
         两条独立路径的比应当 = 1；页面读数不显示，但测试会拿它当哨兵。 */
      volumeCheck: (Math.abs(volume) > 1e-12) ? (Math.abs(volume) / (TAU * Math.abs(mAr))) : 1,
      volume: Math.abs(volume), surface: surf,
      arc: arc, isoQ: isoQ, holeRatio: rMin / rMax,
      kappaTop: kapTop, kappaWaist: kapWaist,
      rhoTop: rhoTop, rhoWaist: rhoWaist, curRatio: curRatio,
      cone: cone,
      coneGeom: cone,
      surfRatioCone: cone.surface > 1e-12 ? surf / cone.surface : NaN,
      volRatioCone: cone.volume > 1e-12 ? Math.abs(volume) / cone.volume : NaN
    };
  }

  /* 直锥 / 直台锥的几何量（参数单位）。mt 需含 { rMax, dz }。
     面积只算**侧面（母面）**，不含底面圆盘 —— 与蛋形那条闭合母线的旋转面同口径，
     否则拿"带底盘的锥"去比"无盘的环面"是两码事。 */
  function coneGeomFrom(mt, o) {
    o = o || {};
    var bN = num(o.rBase, 1), tN = num(o.rTop, 0), hN = num(o.heightFrac, 1), z0 = num(o.zeta0, 0);
    var rb = bN * mt.rMax, rt = tN * mt.rMax, h = hN * mt.dz;
    var slant = Math.hypot(rb - rt, h);
    /* ★ 形心两口径都有**闭式**（与采样无关），单位都是「离底面的比例 × 高」：
         侧面（薄壳）：h·(rb+2rt)/(3(rb+rt))        —— 锥(rt=0) → h/3，柱(rb=rt) → h/2
         实体        ：h·(rb²+2rb·rt+3rt²)/(4(rb²+rb·rt+rt²)) —— 锥 → h/4，柱 → h/2
       用比例而不是长度，是因为 ζ = ζ₀ + heightFrac·frac 这条换算对任何尺度都成立。 */
    var denS = rb + rt, denV = rb * rb + rb * rt + rt * rt;
    var fracS = (denS > 1e-12) ? (rb + 2 * rt) / (3 * denS) : 0.5;
    var fracV = (denV > 1e-12) ? (rb * rb + 2 * rb * rt + 3 * rt * rt) / (4 * denV) : 0.5;
    return {
      rBaseNorm: bN, rTopNorm: tN, heightFrac: hN, zeta0: z0,
      rBase: rb, rTop: rt, height: h, slant: slant,
      surface: PI * (rb + rt) * slant,
      volume: PI * h * (rb * rb + rb * rt + rt * rt) / 3,
      apexAngle: h > 1e-12 ? 2 * Math.atan(Math.max(0, rb - rt) / h) : PI,
      /* 形心：既给「离底面的比例」，也给 ζ（= ζ₀ + heightFrac·frac）——
         页面算泡心只用 ζ，与蛋形环面共用同一条 Z(ζ) 换算。 */
      centroidFrac: fracS,      centroidZeta: z0 + hN * fracS,
      centroidFracSolid: fracV, centroidZetaSolid: z0 + hN * fracV
    };
  }
  function coneMetrics(P, o) { return coneGeomFrom(metrics(P, 1200), o); }
  function iMaxZ(z) { var k = 0; for (var i = 1; i < z.length; i++) if (z[i] > z[k]) k = i; return k; }

  /* 平面曲线逐点曲率：κ = |r'z'' − z'r''| / (r'²+z'²)^{3/2}（等距参数下 h 自动约掉） */
  function curveCurvature(r, z) {
    var n = r.length, out = new Float64Array(n);
    for (var i = 0; i < n; i++) {
      var a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1);
      var dr = r[b] - r[a], dz = z[b] - z[a], d2r = 0, d2z = 0;
      if (i > 0 && i < n - 1) { d2r = r[i + 1] - 2 * r[i] + r[i - 1]; d2z = z[i + 1] - 2 * z[i] + z[i - 1]; }
      var numv = Math.abs(dr * d2z - dz * d2r);
      var den = Math.pow(dr * dr + dz * dz, 1.5);
      out[i] = (den > 1e-14 && numv > 1e-14) ? den / numv : Infinity;
    }
    return out;
  }

  /* ---------- 3D 螺旋的 Frenet 量（项目 roadmap 里「立即可做」的那一项）---------- */
  function frenet(P, n) {
    P = clampP(P);
    n = Math.max(200, (n | 0) || 4000);
    var h = TAU / n, i, t;
    var v = new Float64Array(n + 1);
    var X = new Float64Array(n + 1), Y = new Float64Array(n + 1), Z = new Float64Array(n + 1);
    for (i = 0; i <= n; i++) {
      t = -PI + TAU * i / n;
      var p = spacePoint(P, t);
      v[i] = t; X[i] = p.x; Y[i] = p.y; Z[i] = p.z;
    }
    var kMax = 0, tMax = 0, kSum = 0, tAbsSum = 0, len = 0, cnt = 0;
    for (i = 1; i < n; i++) {
      var r1x = (X[i + 1] - X[i - 1]) / (2 * h), r1y = (Y[i + 1] - Y[i - 1]) / (2 * h), r1z = (Z[i + 1] - Z[i - 1]) / (2 * h);
      var r2x = (X[i + 1] - 2 * X[i] + X[i - 1]) / (h * h), r2y = (Y[i + 1] - 2 * Y[i] + Y[i - 1]) / (h * h), r2z = (Z[i + 1] - 2 * Z[i] + Z[i - 1]) / (h * h);
      var r3x = (X[i + 2] - 2 * X[i + 1] + 2 * X[i - 1] - X[i - 2]) / (2 * h * h * h);
      var r3y = (Y[i + 2] - 2 * Y[i + 1] + 2 * Y[i - 1] - Y[i - 2]) / (2 * h * h * h);
      var r3z = (Z[i + 2] - 2 * Z[i + 1] + 2 * Z[i - 1] - Z[i - 2]) / (2 * h * h * h);
      var cx = r1y * r2z - r1z * r2y, cy = r1z * r2x - r1x * r2z, cz = r1x * r2y - r1y * r2x;
      var n1 = Math.hypot(r1x, r1y, r1z), nc = Math.hypot(cx, cy, cz);
      if (n1 < 1e-12 || i < 2 || i > n - 2) continue;
      var kk = nc / (n1 * n1 * n1);
      var dot = cx * r3x + cy * r3y + cz * r3z;
      var tt = (nc > 1e-14) ? dot / (nc * nc) : 0;
      kMax = Math.max(kMax, kk); tMax = Math.max(tMax, Math.abs(tt));
      kSum += kk; tAbsSum += Math.abs(tt); cnt++;
      len += Math.hypot(X[i + 1] - X[i], Y[i + 1] - Y[i], Z[i + 1] - Z[i]);
    }
    return { kappaMax: kMax, tauMax: tMax,
             kappaMean: cnt ? kSum / cnt : 0, tauMean: cnt ? tAbsSum / cnt : 0, length: len, samples: cnt };
  }

  /* ============================================================
     世界坐标映射：把「归一母线」搬到 3D 场景
       ζ(z) = (z − zMin)/Δz ∈ [0,1]      轴向归一
       η(r) = r / rMax    ∈ [0,1]        径向归一
       Z = scale·(ζ + zOff)   ρ = scale·η
     对齐方式（align）：
       'axis'     原样——轴＝+z、原点不动（保留内禀轴向偏移）
       'center'   轴向腹心落到 z = 0
       'equator'  腰带（r 最大处）落到 z = 0，与 Alcubierre 负能量最强环共面
     ============================================================ */
  function mapper(M, mt, o) {
    o = o || {};
    var scale = num(o.scale, 1);
    var zOff = zOffOf(mt, o.align), A = zAspect(mt);
    return function (i) {
      var zeta = (M.z[i] - mt.zMin) / mt.dz;
      return { rho: M.r[i] / mt.rMax * scale, Z: scale * (zeta * A + zOff), zeta: zeta };
    };
  }

  /* ---------- 通用「旋转面」网格：给一条母线(rho,Z) + 方位向 ----------
     sweep < 1 时只扫一部分方位角（剖切视图：让孔与母线直接暴露出来） */
  function lathe(pts, nPhi, mat, sweep) {
    sweep = (sweep === undefined) ? 1 : Math.max(0.02, Math.min(1, sweep));
    var nT = pts.length - 1;
    var pos = new Float32Array((nT + 1) * (nPhi + 1) * 3);
    var idx = [], k = 0, i, j;
    for (i = 0; i <= nT; i++) {
      var rho = pts[i].rho, Z = pts[i].Z;
      for (j = 0; j <= nPhi; j++) {
        var ph = TAU * j / nPhi * sweep;
        pos[k++] = rho * Math.cos(ph); pos[k++] = rho * Math.sin(ph); pos[k++] = Z;
      }
    }
    for (i = 0; i < nT; i++) for (j = 0; j < nPhi; j++) {
      var a = i * (nPhi + 1) + j, b = a + 1, c = (i + 1) * (nPhi + 1) + j, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, mat);
  }

  /* ---------- 蛋形环面 ---------- */
  function buildEgg(P, o) {
    o = o || {};
    var nT = o.nT || 200, nPhi = o.nPhi || 88;
    /* ★ 与 buildCone 同理：必须能复用调用方手上那份 metrics。
       否则这里另采一次（metrics(P,1200)）会让 zOff 与页面的 MT（1400 点）差 1e-6，
       「zOff = −zWaistNorm·A」就不再是恒等式。 */
    var M = meridian(P, nT), mt = o.metrics || metrics(P, 1200), map = mapper(M, mt, o);
    var G = new THREE.Group();
    var pts = [], i;
    for (i = 0; i <= M.n; i++) pts.push(map(i));

    var col = o.color === undefined ? 0x0f8b7a : o.color;
    var sweep = (o.sweep === undefined) ? 1 : o.sweep;
    var body = lathe(pts, nPhi, new THREE.MeshStandardMaterial({
      color: col, roughness: .72, metalness: .05, transparent: true,
      opacity: o.opacity === undefined ? .5 : o.opacity, side: THREE.DoubleSide,
      depthWrite: false
    }), sweep);
    body.renderOrder = 2; G.add(body);

    var wire = lathe(pts, Math.min(24, nPhi), new THREE.MeshBasicMaterial({
      color: col, wireframe: true, transparent: true, opacity: .18
    }), sweep);
    G.add(wire);

    /* 母线（φ=0 子午线，最显眼：这就是 d=0 的那条闭合环） */
    var mpts = [];
    for (i = 0; i <= M.n; i++) { var q = pts[i]; mpts.push(new THREE.Vector3(q.rho, 0, q.Z)); }
    var merLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(mpts),
      new THREE.LineBasicMaterial({ color: 0xb3261e, linewidth: 2 }));
    merLine.renderOrder = 4; G.add(merLine);

    /* 腰带圆（r 最大处，实线）与中孔圆（r 最小处，虚线）——两者都必须与网格同用一份 zOff */
    var sc = num(o.scale, 1), zOff = zOffOf(mt, o.align), A = zAspect(mt);
    G.add(ringAt(sc, sc * (mt.zWaistNorm * A + zOff), col, false));
    G.add(ringAt(sc * (mt.rMin / mt.rMax), sc * (mt.zHoleNorm * A + zOff), 0x7a3ba8, true));

    /* d≠0 时额外画一条 3D 螺旋参考线（不参与成面） */
    if (M.P.d > 0) {
      var S = sample(M.P, 1800), sp = [];
      for (i = 0; i <= S.n; i++) {
        var zeta = (S.z[i] - mt.zMin) / mt.dz;
        sp.push(new THREE.Vector3(S.x[i] / mt.rMax * sc, S.y[i] / mt.rMax * sc, sc * (zeta * A + zOff)));
      }
      G.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(sp),
        new THREE.LineBasicMaterial({ color: 0xe08a00, transparent: true, opacity: .95 })));
    }
    G.userData = { metrics: mt, verts: (nT + 1) * (nPhi + 1), tris: 2 * nT * nPhi, zOff: zOff };
    return G;
  }

  /* 对齐方式 → 轴向偏移（唯一来源；构造器与圆环助手共用，勿各写一份） */
  /* ---------- 唯一的轴向换算口径（z 与 r 同一把尺） ----------
     zAspect(mt)：ζ 的 1 个单位 = zStretch 个「rMax 单位」。
     alignZOff(mt, align)：把对象整体沿 z 搬到对齐位置，返回的也是「rMax 单位」。 */
  function zAspect(mt){ return (mt && mt.zStretch !== undefined) ? mt.zStretch : 1; }
  function zOffOf(mt, align) {
    var A = zAspect(mt);
    if (align === 'center') return -0.5 * A;          /* 轴向腹心（ζ = 0.5）落到 z = 0 */
    if (align === 'equator') return -mt.zWaistNorm * A;
    return 0;
  }

  function ringAt(R, z, color, dashedOn) {
    var N = 128, p = [];
    for (var j = 0; j <= N; j++) { var a = TAU * j / N; p.push(new THREE.Vector3(R * Math.cos(a), R * Math.sin(a), z)); }
    var geo = new THREE.BufferGeometry().setFromPoints(p);
    if (!dashedOn) return new THREE.Line(geo, new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: .85 }));
    var l = new THREE.Line(geo, new THREE.LineDashedMaterial({ color: color, dashSize: .35, gapSize: .28, transparent: true, opacity: .85 }));
    if (l.computeLineDistances) l.computeLineDistances();
    return l;
  }

  /* ---------- 直锥 / 直台锥（蛋形的退化对照体：母线为直线）----------
     参数 rBase / rTop / heightFrac / zeta0 全部可独立调（默认先跟随蛋形）。 */
  function buildCone(P, o) {
    o = o || {};
    /* ★ 允许调用方传入**已经算好的** metrics —— 否则这里再采一次
       （metrics(P,1200)）会与页面持有的 MT（metrics(AP,1400)）在**采样点数**上不同，
       于是 CG.rBase 与 1.6·MT.rMax 会在第 6 位小数上对不齐（实测 1e-6 量级）。
       对齐同一份 MT 之后，「底半径 = k × 腰半径」是**恒等式**，不是近似。 */
    var mt = o.metrics || metrics(P, 1200), scale = num(o.scale, 1);
    var g = coneGeomFrom(mt, o);
    var A = zAspect(mt);
    /* ★ ζ 必须乘 A 换算成「rMax 单位」：否则直锥的**图上**高宽比是 hFrac/rBaseNorm，
       而 coneGeomFrom 报的斜面/体积/全顶角用的是 hFrac·Δz —— 图和表会各说各话
       （默认参数下相差 Δz/rMax ≈ 1.232，锥的图上全顶角 90° 而表里写 78.11°）。 */
    var zB = zOffOf(mt, o.align) + g.zeta0 * A;      /* 底面所在 ζ */
    var Zb = scale * zB, Zt = scale * (zB + g.heightFrac * A);
    var rbW = scale * g.rBaseNorm, rtW = scale * g.rTopNorm;
    var G = new THREE.Group();
    var col = o.color === undefined ? 0xc2691a : o.color;

    /* 顶半径收成 0 时留 1e-3 的残余半径：顶点处所有方位角重合会让法线出现 NaN */
    var body = lathe([{ rho: rbW, Z: Zb }, { rho: rtW > 1e-4 ? rtW : rbW * 1e-3, Z: Zt }], 72,
      new THREE.MeshStandardMaterial({ color: col, roughness: .7, metalness: .06,
        transparent: true, opacity: o.opacity === undefined ? .34 : o.opacity,
        side: THREE.DoubleSide, depthWrite: false }));
    body.renderOrder = 1; G.add(body);

    /* 母线：一条**直线**——这是与蛋形环面的全部差别所在 */
    var gl = new THREE.Line(new THREE.BufferGeometry().setFromPoints(
      [new THREE.Vector3(rbW, 0, Zb), new THREE.Vector3(rtW, 0, Zt)]),
      new THREE.LineBasicMaterial({ color: 0x8a2b12 }));
    gl.renderOrder = 4; G.add(gl);

    /* 底圆（+ 顶圆，若为台锥） */
    var ring = (R, z) => {
      var p = []; for (var j = 0; j <= 128; j++){ var a = TAU * j / 128; p.push(new THREE.Vector3(R*Math.cos(a), R*Math.sin(a), z)); }
      return new THREE.Line(new THREE.BufferGeometry().setFromPoints(p), new THREE.LineBasicMaterial({ color: col }));
    };
    G.add(ring(rbW, Zb));
    if (rtW > 1e-4) G.add(ring(rtW, Zt));

    G.userData = { metrics: mt, Zbase: Zb, Zapex: Zt, geom: g };
    return G;
  }

  g.AnuRevolve = {
    version: '1.1.0',
    DEFAULTS: DEFAULTS,
    clampP: clampP,
    spacePoint: spacePoint,
    sample: sample,
    meridian: meridian,
    metrics: metrics,
    zAspect: zAspect,
    zOffOf: zOffOf,
    coneMetrics: coneMetrics,
    coneGeomFrom: coneGeomFrom,
    frenet: frenet,
    curveCurvature: curveCurvature,
    buildEgg: buildEgg,
    buildCone: buildCone,
    lathe: lathe
  };
})(typeof window !== 'undefined' ? window : this);
