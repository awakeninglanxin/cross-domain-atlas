/* ============================================================================
 * anu-geometry.js  ——  Anu「七级螺旋 / 递归正交细分」几何引擎
 * ----------------------------------------------------------------------------
 * 纯数学模块，不依赖 three.js / DOM，可在 node 下 require 做数值测试。
 *
 * 依据文献（Besant & Leadbeater, Occult Chemistry, 1908/1951）：
 *   · 一根丝展开后是一个完整闭合的圆（"a complete circle"）。
 *   · 这根丝本身是一根弹簧（螺旋），1 阶 spirilla 共 1680 匝。
 *   · 每 1 匝「a」由 7 根「b」组成；每根「b」由 7 根「c」组成；
 *     …… 直到最低阶 spirilla，由恰好 7 个气泡（bubble）组成。
 *   · 关键几何：每一阶更细的螺旋，其缠绕平面与上一阶互相垂直
 *     （"the axis lies at right angles"，原文）。
 *   · 10 根丝 = 3 粗 + 7 细；7 细丝对应光谱七色。
 *
 * 本模块的「正交」实现（可证）：
 *   父曲线局部标架 (T, N, B)，T ⊥ N ⊥ B。
 *   mode = 'normal'：子螺旋在 span(N, B) 平面内 → 平面法向 = T
 *   mode = 'axial' ：子螺旋在 span(N, T) 平面内 → 平面法向 = B
 *   因 T ⊥ B，两平面严格垂直。逐阶交替即得「相邻两阶缠绕平面正交」。
 *   两种模式下局部结构都仍是弹簧（正弦螺旋），不会退化成分形环套环。
 * ==========================================================================*/
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.AnuGeo = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var TAU = Math.PI * 2;

  /* ------------------------------------------------------------------ 向量 */
  function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function mul(a, s) { return [a[0] * s, a[1] * s, a[2] * s]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) {
    return [a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0]];
  }
  function len(a) { return Math.sqrt(dot(a, a)); }
  function norm(a) { var l = len(a); return l < 1e-12 ? [0, 0, 0] : [a[0] / l, a[1] / l, a[2] / l]; }
  function lerp(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

  /** 与 t 垂直的任意单位向量（选最不对齐的坐标轴做叉积，数值稳定） */
  function anyPerp(t) {
    var ax = Math.abs(t[0]), ay = Math.abs(t[1]), az = Math.abs(t[2]);
    var e = (ax <= ay && ax <= az) ? [1, 0, 0] : (ay <= az ? [0, 1, 0] : [0, 0, 1]);
    return norm(cross(t, e));
  }

  /** 绕单位轴 axis 转 ang（罗德里格斯公式） */
  function rotAxis(v, axis, ang) {
    var c = Math.cos(ang), s = Math.sin(ang);
    var k = cross(axis, v), d = dot(axis, v);
    return [
      v[0] * c + k[0] * s + axis[0] * d * (1 - c),
      v[1] * c + k[1] * s + axis[1] * d * (1 - c),
      v[2] * c + k[2] * s + axis[2] * d * (1 - c)
    ];
  }

  /* ------------------------------------------------------- 旋转最小化标架 */
  /**
   * 为一条（可闭合）折线逐点建立 T/N/B 标架。
   * 用「投影法」（projection method）传播 N，避免 Frenet 在直线段处退化；
   * 闭合曲线再做一次和乐（holonomy）均摊，消除接缝处的相位跳变。
   * @param {Array<Array<number>>} pts
   * @param {boolean} closed
   * @param {Array<number>} [seedN] 初始 N 的参考方向
   */
  function frames(pts, closed, seedN) {
    var n = pts.length, i;
    var T = new Array(n), N = new Array(n), B = new Array(n);

    for (i = 0; i < n; i++) {
      var a = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
      var b = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
      T[i] = norm(sub(b, a));
      if (len(T[i]) < 0.5) { T[i] = (i > 0) ? T[i - 1].slice() : [0, 0, 1]; }
    }

    var s0 = seedN ? sub(seedN, mul(T[0], dot(seedN, T[0]))) : anyPerp(T[0]);
    if (len(s0) < 1e-6) { s0 = anyPerp(T[0]); }
    N[0] = norm(s0);

    for (i = 1; i < n; i++) {
      var nv = sub(N[i - 1], mul(T[i], dot(N[i - 1], T[i])));
      if (len(nv) < 1e-8) { nv = anyPerp(T[i]); }
      N[i] = norm(nv);
    }

    /* 闭合曲线的和乐均摊：把 N[n-1] 沿 T[0] 传播到起点，与 N[0] 的角度差为 ang。
       把 +ang 按索引线性摊回全程（绕各自切向旋转），使接缝处标架连续。
       方向必须与 ang 同号：rot(moved,T0,+ang)=N[0]，故校正量为 +ang·(i/n)。 */
    if (closed && n > 2) {
      var moved = sub(N[n - 1], mul(T[0], dot(N[n - 1], T[0])));
      if (len(moved) > 1e-8) {
        moved = norm(moved);
        var ang = Math.atan2(dot(cross(moved, N[0]), T[0]), dot(moved, N[0]));
        for (i = 0; i < n; i++) { N[i] = norm(rotAxis(N[i], T[i], ang * (i / n))); }
      }
    }

    for (i = 0; i < n; i++) { B[i] = norm(cross(T[i], N[i])); }

    var out = new Array(n);
    for (i = 0; i < n; i++) { out[i] = { p: pts[i], t: T[i], n: N[i], b: B[i] }; }
    return out;
  }

  /* --------------------------------------------------------------- 递归细分 */
  /**
   * 把父曲线的每一段替换为一根子螺旋（弹簧），得到下一阶曲线。
   *
   * @param {object} parent   {p: 点数组, closed: bool}
   * @param {object} o
   *        o.turns   本阶圈数 T_k（= 父曲线每绕一圈，子螺旋绕 T_k 圈）
   *        o.radius  子螺旋半径 r_k
   *        o.mode    'normal'(平面 ⊥ 切向) | 'axial'(平面含切向) —— 二者严格垂直
   *        o.count   目标点数（为 0 则自动）
   *        o.spp     每匝最少采样点数
   *        o.phase0  起始相位（用于多丝错相）
   *        o.seedN   初始 N 参考
   */
  function subdivide(parent, o) {
    var pts = parent.p, n = pts.length, closed = parent.closed !== false;
    var segs = closed ? n : n - 1;
    if (segs < 2) { return { p: pts.slice(), closed: closed }; }

    var rawTurns = (o.turns == null ? 1 : o.turns);
    var sgn = rawTurns < 0 ? -1 : 1;                       /* 负圈数 = 反向绕（caduceus） */
    var turns = sgn * Math.max(1, Math.round(Math.abs(rawTurns)));
    var radius = o.radius || 0.1;
    var mode = o.mode === 'axial' ? 'axial' : 'normal';
    var spp = o.spp || 8;
    var phase0 = o.phase0 || 0;

    /* 弧长参数（相位按弧长推进 → 螺旋疏密均匀） */
    var cum = new Float64Array(segs + 1), i, j;
    for (i = 0; i < segs; i++) {
      cum[i + 1] = cum[i] + len(sub(pts[(i + 1) % n], pts[i]));
    }
    var L = cum[segs] || 1;

    /* 目标点数：保证每匝 ≥ spp 点，且不低于父曲线的 2 倍密度 */
    var target = o.count || 0;
    if (!target) {
      target = Math.max(spp * Math.abs(turns), 2 * segs);
    }
    target = Math.max(target, segs * 2, 36);
    var perSeg = target / segs;
    var sub_n = Math.max(2, Math.ceil(perSeg));

    var fr = frames(pts, closed, o.seedN);
    var out = [];
    for (i = 0; i < segs; i++) {
      var A = fr[i], Bf = fr[(i + 1) % n];
      var segLen = cum[i + 1] - cum[i];
      for (j = 0; j < sub_n; j++) {
        if (!closed && i === segs - 1 && j > 0) { break; }
        var t = j / sub_n;
        var P = lerp(A.p, Bf.p, t);
        var Tt = norm(lerp(A.t, Bf.t, t));
        if (len(Tt) < 0.5) { Tt = A.t; }
        var Nl = lerp(A.n, Bf.n, t);
        var Nt = sub(Nl, mul(Tt, dot(Nl, Tt)));
        if (len(Nt) < 1e-8) { Nt = anyPerp(Tt); }
        Nt = norm(Nt);
        var Bt = norm(cross(Tt, Nt));

        /* 关键：缠绕平面的两种取法 —— 二者互相垂直 */
        var u, v;
        if (mode === 'axial') { u = Nt; v = Tt; }   /* span(N, T)：平面含切向，法向 = B */
        else { u = Nt; v = Bt; }                    /* span(N, B)：平面 ⊥ 切向，法向 = T */

        var s = (cum[i] + t * segLen) / L;
        var ph = TAU * turns * s + phase0;
        var c = Math.cos(ph), sn = Math.sin(ph);
        out.push([
          P[0] + radius * (c * u[0] + sn * v[0]),
          P[1] + radius * (c * u[1] + sn * v[1]),
          P[2] + radius * (c * u[2] + sn * v[2])
        ]);
      }
    }
    /* 子曲线总弧长（供下一阶计算间距用） */
    var Lc = 0;
    for (i = 1; i < out.length; i++) { Lc += len(sub(out[i], out[i - 1])); }
    if (closed && out.length > 2) { Lc += len(sub(out[0], out[out.length - 1])); }

    return {
      p: out, closed: closed, turns: turns, radius: radius, mode: mode,
      phase0: phase0, len: Lc, frame0: fr[0],
      segs: segs, subN: sub_n                       /* 供上层把输出点索引映射回父曲线参数 */
    };
  }

  /**
   * 在父标架数组上按「子点 → 父曲线参数」求标架，构造方式与 subdivide 内层**逐字一致**
   * （线性插值 T/N 后正交化）。用于在「衔接点」取到与真正布线时完全相同的那个标架。
   * @param {Array} fr    父标架数组（subdivide 内同一份 frames() 结果）
   * @param {number} i    父段索引
   * @param {number} t    段内参数 ∈ [0,1)
   */
  function lerpFrame(fr, i, t) {
    var n = fr.length;
    var A = fr[Math.max(0, Math.min(n - 1, i))];
    var Bf = fr[Math.max(0, Math.min(n - 1, i + 1))];
    var P = lerp(A.p, Bf.p, t);
    var T = norm(lerp(A.t, Bf.t, t));
    if (len(T) < 0.5) { T = A.t; }
    var Nl = lerp(A.n, Bf.n, t);
    var N = sub(Nl, mul(T, dot(Nl, T)));
    if (len(N) < 1e-8) { N = anyPerp(T); }
    N = norm(N);
    return { p: P, t: T, n: N, b: norm(cross(T, N)) };
  }

  /** 把「子曲线第 idx 个点」映射回父曲线的 (段索引 i, 段内参数 t) */
  function parentParamOf(idx, segs, subN) {
    var i = Math.floor(idx / subN);
    if (i > segs - 2) { i = Math.max(0, segs - 2); }
    var j = idx - i * subN;
    return { i: i, t: j / subN };
  }

  /* ------------------------------------------------------------ 点数预估器 */
  /**
   * 与 subdivide() 的实际计数**同构**的解析预估（非近似）。
   * 逐层：segs = 父点数；target = max(spp·累计匝, 2·segs, 36)；
   *       sub_n = max(2, ceil(target/segs))；本层点数 = segs · sub_n。
   * 用于「按预算自适应限阶」，避免真的 build 一遍才发现超限。
   * @returns {{levels: number[], total: number}} levels[k] = 第 k 层点数（levels[0] 为基准圆）
   */
  function estimateCounts(depth, turns, spp, n0) {
    var D = Math.max(1, Math.round(depth || 1));
    var sp = Math.max(1, Math.round(spp || 8));
    var t = [], k;
    for (k = 0; k < D; k++) {
      var tk = turns && turns[k] != null ? Math.round(turns[k]) : 4;
      t.push(Math.max(2, Math.min(1680, tk)));
    }
    /* 基准曲线点数：外部指定（cfg.basePts）优先，否则由「每匝 spp 点」估 */
    var cnt = (n0 && n0 >= 3) ? Math.round(n0) : Math.max(24, Math.round(sp * t[0]));
    var levels = [cnt], accum = 1, total = 0;
    for (k = 1; k <= D; k++) {
      accum *= t[k - 1];
      var target = Math.max(sp * accum, cnt * 2, 36);
      var subN = Math.max(2, Math.ceil(target / cnt));
      cnt = cnt * subN;
      levels.push(cnt);
      total += cnt;
    }
    return { levels: levels, total: total };
  }

  /* ------------------------------------------------------- 逐级细分「阶梯」 */
  /** 取一段曲线**末尾的「一匝」**（占全长 1/Tk）—— 下一级只绕在这一匝上 */
  function tailTurn(pts, Tk) {
    var n = pts.length;
    var take = Math.max(4, Math.round(n / Math.max(1, Tk)));
    return { p: pts.slice(Math.max(0, n - take)), closed: false };
  }

  function segLen(pts, closed) {
    var L = 0, i;
    for (i = 1; i < pts.length; i++) { L += len(sub(pts[i], pts[i - 1])); }
    if (closed && pts.length > 2) { L += len(sub(pts[0], pts[pts.length - 1])); }
    return L;
  }

  /**
   * 🔴 逐级细分**「链」引擎**：每级只绕在**上一级最后一匝**上，逐级 ×branch。
   *
   * 这是两条路径**共用**的同一台引擎（项目铁律：同一物理量只允许一处实现）：
   *   · `ladder()`        —— 展开圆 → 1680 匝 → 再 6 级（预设②「七级垂直细分」）；
   *   · `anu-heart.js`    —— whorl 1680 匝 → 再 branch 级（预设①「爱心双螺旋」的 D > 1）。
   * 两条路径若各写一份递推，半径比会算出不同的数（旧版就踩过：0.24~0.57 乱跳）。
   *
   * ── 两处必须写对的地方（都是血泪，见 `ladder` 上方长注释）──
   *  ① **匝间距解析递推**：pitch_{k+1} = √(pitch_k² + (2π·r_k)²) / branch。
   *     不能用「末尾 round(n/T) 个点的折线长」去量（少一匝 + 与整数取样点打拍频）。
   *  ② **下一级的标架种子取「本级在衔接点处」的缠绕轴**，不是本级起点的 ——
   *     否则相邻两级的缠绕平面夹角会逐级漂移（实测 90/81/90/72/90/47）。
   *
   * @param {object} cur 起点曲线 {p: Array<[x,y,z]>, closed: bool}（= 某一级的**完整**曲线）
   * @param {object} o
   *   o.orders     要**追加**几级（≥1）
   *   o.branch     每级的匝数（文献 7）—— 同时用作匝间距递推的分母
   *   o.fill       充填比 = 2r / 匝间距（1.0 = 匝刚好相接 ⇒ 自然比 √(1+π²)/7 = 0.4710）
   *   o.spp        每匝采样点数
   *   o.pitch0     起点曲线的匝间距（用来递推第一级的 r 与下一级的 pitch）
   *   o.parentIsCoil 起点曲线**本身是不是一根线圈**（缺省 false）：
   *                `ladder` 的起点是「展开后的圆」—— 不是线圈，一匝就是弧长 ⇒ pitch₀ 直接用；
   *                爱心的起点是**第 1 阶 whorl 弹簧** —— 本身已是线圈，它的一匝长度是
   *                √(pitch₀² + (2π·R₀)²) ⇒ 第一级要先把 parentRadius 卷进去再 ÷branch。
   *                这个开关只影响**第一级**，之后自动收敛到自然比 √(1+π²)/branch = 0.4710。
   *   o.seedN      播种法向（缺省 null = 引擎自选）
   *   o.phase0     起始相位
   *   o.startK     起点曲线的**阶号**（缺省 1）；第 i 步的阶号 = startK + i
   *                （`ladder` 起点是第 0 阶基准圆 ⇒ 传 0；爱心起点是第 1 阶 whorl 弹簧 ⇒ 传 1）
   *   o.accumBase  第 1 阶的匝数（用于 accumTurns = accumBase · branch^(k−1)）
   *   o.parentRadius 起点曲线的线圈半径（第 1 步的 parentRadius）
   *   o.parentTurns **起点曲线自己的匝数**（缺省 0 = 无匝数概念）：
   *                0 ⇒ 第一级绕在起点曲线的**全长**上（`ladder`：第 1 级绕整个基准圆）；
   *                >0 ⇒ 第一级只绕在**起点曲线的最后一匝**上（爱心：第 2 阶只绕在
   *                     1680 匝那根 whorl 的**最后一匝**上，与「每级只挂上一级一匝」一致）。
   *                     ⚠️ 忘了传它 ⇒ 第二级会绕在整根 1680 匝弹簧上，点数爆成 1680 倍
   *                     （实测 97 → 47819），且相邻级平面夹角从 90° 掉到 44°。
   *   o.modes      逐级模式数组（缺省按**阶号**奇偶交替：偶数阶 axial、奇数阶 normal）
   *   o.offset     整条曲线的平移量（多丝并排用）
   *   o.turnsAt(i) 第 i 步的匝数（缺省恒为 branch）—— `ladder` 用它把第 1 步设成 firstTurns
   * @returns {{levels: Array, cur: object, pitch: number, seedN: Array}}
   *          levels[i].k = 真实阶号；cur = 最后一级的「一匝」（可继续往下接）
   */
  function tailChain(cur, o) {
    o = o || {};
    var orders = Math.max(1, Math.round(o.orders || 1));
    var branch = Math.max(2, Math.round(o.branch || 7));
    var fill = o.fill == null ? 1.0 : Math.max(0.05, Math.min(1.0, o.fill));
    var spp = Math.max(6, Math.round(o.spp || 20));
    var startK = Math.max(0, Math.round(o.startK == null ? 1 : o.startK));
    var accumBase = Math.max(1, Math.round(o.accumBase || 1));
    var pitch = o.pitch0 || 0;
    var seedN = o.seedN || null;
    var levels = [], i;

    /* 第一级的「父曲线」：
         · parentTurns = 0（ladder）⇒ 父曲线 = 起点曲线**全长**（第 1 级绕整个基准圆）；
         · parentTurns > 0（爱心） ⇒ 父曲线 = 起点曲线**最后一匝**（第 2 级只挂在那 1680 匝的末匝上）。 */
    if (o.parentTurns > 0) { cur = tailTurn(cur.p, o.parentTurns); }

    /* 起点本身是线圈时：第一级的匝间距要先把「起点自己一匝的长度」算出来再 ÷branch
       （起点一匝 = √(pitch₀² + (2π·R₀)²)） */
    if (o.parentIsCoil) {
      var R0 = o.parentRadius || 0;
      pitch = Math.sqrt(pitch * pitch + Math.pow(TAU * R0, 2)) / branch;
    }

    for (i = 1; i <= orders; i++) {
      var k = startK + i;                              /* 真实阶号 */
      var Tk = Math.max(2, Math.round(o.turnsAt ? o.turnsAt(i) : branch));
      var modeK = (o.modes && o.modes[k - 1]) || (k % 2 === 0 ? 'axial' : 'normal');
      var pk = pitch;
      var rk = fill * pk * 0.5;

      /* 本级的父标架（与 subdivide 内部将要用到的**完全同一份**：同 seedN、同插值方式） */
      var frP = frames(cur.p, cur.closed, seedN);
      var nmK = (modeK === 'axial') ? frP[0].b : frP[0].t;   /* 本级缠绕平面法向 */

      var child = subdivide(cur, {
        turns: Tk, radius: rk, mode: modeK,
        count: spp * Tk, spp: spp, phase0: o.phase0 || 0, seedN: seedN
      });

      /* 衔接点 = 本级「最后一匝」的起点（下一级就挂在这里）。
         必须精确映射回父曲线参数再取父标架 —— 早先用 round((Tk−1)/Tk·n) 近似会差半格
         （父曲线一格的标架已转过 ~13°），于是 A→N 那几对夹角偏到 86~89°。 */
      var take = Math.max(4, Math.round(child.p.length / Tk));
      var idxAttach = Math.max(0, child.p.length - take);
      var pp = parentParamOf(idxAttach, child.segs, child.subN);
      var fA = lerpFrame(frP, pp.i, pp.t);
      var nmAttach = (modeK === 'axial') ? fA.b : fA.t;

      /* 解析递推下一级的匝间距：一匝 = √(pitch² + (2πr)²)，再除以 branch */
      pitch = Math.sqrt(pk * pk + Math.pow(TAU * rk, 2)) / branch;
      seedN = nmAttach;

      levels.push({
        k: k, pts: flatten(child.p, o.offset), count: child.p.length,
        turns: Tk, accumTurns: Math.round(accumBase * Math.pow(branch, k - 1)),
        radius: rk,
        parentRadius: (i > 1 ? levels[i - 2].radius : (o.parentRadius || 0)),
        pitch: pk, mode: modeK, windMode: modeK, planeNormal: nmK, attachNormal: nmAttach,
        arc: child.len, arcPerTurn: child.len / Tk,
        closed: false,
        samplePoint: child.p[Math.floor(child.p.length * 0.5)] || child.p[0],
        order: k
      });

      cur = tailTurn(child.p, Tk);
    }

    return { levels: levels, cur: cur, pitch: pitch, seedN: seedN };
  }

  /**
   * 逐级细分「阶梯」—— 把 Anu 的 7 级 spirilla 一路画下去。
   *
   *   第 1 级  绕基础曲线 firstTurns 匝    （文献 1680 ⇒ 1st-order spirillae）
   *   第 k 级  绕**上一级末尾那一匝** branch 匝（文献 7 ⇒ 每级 ×7）
   *
   * 关键：每一级只保留上一级的「一匝」作为基准 ⇒ 点数恒定、尺度按自然比
   *       √(1+(π·fill)²)/branch 收缩，所以第 7 级仍然画得出来、看得清。
   *
   * ── 两处必须写对的地方（都曾踩坑，记录在此）──
   *
   * 1）**匝间距必须解析递推，不能拿折线量。**
   *    父曲线「一匝」的弧长 = √(pitch² + (2πr)²)（一匝 = 轴向 pitch + 绕行 2πr）。
   *    若改用「末尾 round(n/T) 个点的折线长」去量，会有两重误差：
   *      · n 个点只有 n−1 段，量到的其实是 0.95 匝而不是 1 匝；
   *      · 整数取样点与螺旋几何打拍频 ⇒ 各级半径比在 0.24~0.57 间乱跳，根本不收敛。
   *    写成解析式后 r_{k+1}/r_k ≡ √(1+(π·fill)²)/branch，恒定且即「自然涌现值」。
   *
   * 2）**下一级的标架种子必须取「本级在衔接点处」的缠绕轴，不能取本级起点的。**
   *    下一级挂在「本级最后一匝的起点」，而不是「本级起点」。若用起点的缠绕轴播种，
   *    相邻两级的缠绕平面夹角会逐级漂移（实测 90/81/90/72/90/47）。
   *    改用衔接点标架后，可证夹角严格 90°：
   *      · 本级缠绕平面含本级曲线 ⇒ 其法向 ⊥ 本级切向（= 下一级的脊切向）；
   *        故下一级取 normal 模式时，其平面法向（脊切向）⊥ 本级平面法向。
   *      · 下一级取 axial 模式时，其平面法向 = 脊切向 × N，而 N 由本级平面法向播种，
   *        故同样 ⊥ 本级平面法向。
   */
  function ladder(cfg) {
    cfg = cfg || {};
    var orders = Math.max(1, Math.min(7, Math.round(cfg.orders || 7)));
    var branch = Math.max(2, Math.round(cfg.branch || 7));
    var firstTurns = Math.max(2, Math.round(cfg.firstTurns == null ? 1680 : cfg.firstTurns));
    var fill = cfg.fill == null ? 1.0 : Math.max(0.05, Math.min(1.0, cfg.fill));
    var spp = Math.max(6, Math.round(cfg.spp || 20));

    var basePts, baseClosed;
    if (cfg.basePts && cfg.basePts.length >= 3) {
      basePts = cfg.basePts.map(function (p) { return [p[0], p[1], p[2]]; });
      baseClosed = (cfg.baseClosed !== false);
    } else {
      var R = cfg.baseR == null ? 1.0 : cfg.baseR, N = 96, ii;
      basePts = [];
      for (ii = 0; ii < N; ii++) {
        var aa = TAU * ii / N;
        basePts.push([R * Math.cos(aa), R * Math.sin(aa), 0]);
      }
      baseClosed = true;
    }

    var L0 = segLen(basePts, baseClosed);
    var levels = [{
      k: 0, pts: flatten(basePts, cfg.offset), count: basePts.length,
      turns: 0, accumTurns: 1, radius: cfg.baseR == null ? 1.0 : cfg.baseR, parentRadius: 0,
      pitch: 0, mode: 'base', planeNormal: [0, 0, 1], attachNormal: [0, 0, 1],
      arc: L0, arcPerTurn: L0, closed: baseClosed,
      samplePoint: basePts[0]
    }];

    var res = tailChain({ p: basePts, closed: baseClosed }, {
      orders: orders,
      branch: branch, fill: fill, spp: spp,
      pitch0: L0 / firstTurns,                        /* 第 1 级：沿基础曲线的匝间距 */
      seedN: cfg.seedN || null,
      phase0: cfg.phase0 || 0,
      startK: 0, accumBase: firstTurns, parentRadius: 0,
      modes: cfg.modes, offset: cfg.offset,
      /* 第 1 级 = firstTurns 匝（1680 → 1st-order spirillae）；其后每级 branch 匝（7） */
      turnsAt: function (i) { return i === 1 ? firstTurns : branch; }
    });
    var levels = levels.concat(res.levels);

    var all = 0, kk;
    for (kk = 1; kk < levels.length; kk++) { all += levels[kk].count; }

    return {
      levels: levels, depth: orders,
      totalPoints: levels[levels.length - 1].count,
      totalAllPoints: all,                       /* 各级合计（HUD 显示用） */
      totalTurns: Math.round(firstTurns * Math.pow(branch, orders - 1)),
      spp: spp, autoReduced: false,
      cfg: { baseR: 0, depth: orders, wires: 1, wireIndex: 0, firstTurns: firstTurns, branch: branch }
    };
  }

  /* ----------------------------------------------- 自然涌现的逐级半径比 */
  /**
   * r_{k+1} / r_k 的**几何自洽值**（不是手调的）。
   * 第 k 级每匝长度 = pitch·√(1+(π·fill)²)；第 k+1 级每匝分叉 T 根 ⇒
   *   r_{k+1}/r_k = √(1+(π·fill)²) / T
   * fill = 1（匝刚好相接）且 T = 7 时 = 0.4710（≈1/2）。
   */
  function naturalRatio(fill, branch) {
    var f = fill == null ? 1.0 : fill;
    var T = Math.max(2, branch || 7);
    return Math.sqrt(1 + Math.pow(Math.PI * f, 2)) / T;
  }

  /* ---------------------------------------------------------------- 主构建器 */
  /**
   * @param {object} cfg
   *   cfg.depth        阶数 D（1..7）
   *   cfg.turns        Array<number> 每阶圈数，长度 ≥ D（缺省用 cfg.turnsDefault）
   *   cfg.modes        Array<string> 每阶缠绕模式，缺省交替 normal/axial
   *   cfg.baseR        基准圆半径
   *   cfg.basePts      可选：外部直接给基准曲线（如 Anu 蛋形上的 whorl 一段）。
   *                    给了就用它，不再生成内部平面圆 → 见 anu-ovoid.js。
   *   cfg.baseClosed   基准曲线是否闭合（缺省 true）
   *   cfg.fill         充填比 = 2r / 相邻匝间距（0.05~0.95，1.0 表示匝与匝刚好相接）
   *   cfg.spp          每匝采样点数
   *   cfg.phase0       整体起始相位
   *   cfg.wireIndex    多丝错相索引
   *   cfg.wires        丝数（用于错相 + 反向）
   *   cfg.reverse      反向绕（3 粗丝与 7 细丝反向 → caduceus）
   *   cfg.maxPoints    点数上限（超限自动降 spp）
   */
  function build(cfg) {
    cfg = cfg || {};
    var D = Math.max(1, Math.min(7, Math.round(cfg.depth || 3)));
    var baseR = cfg.baseR == null ? 1.0 : cfg.baseR;
    var fill = cfg.fill == null ? 0.50 : Math.max(0.05, Math.min(1.0, cfg.fill));
    var spp = Math.max(4, Math.round(cfg.spp || 8));
    var maxPoints = cfg.maxPoints || 400000;
    var turnsDefault = cfg.turnsDefault || 4;
    var extBase = (cfg.basePts && cfg.basePts.length >= 3) ? cfg.basePts : null;

    var turns = [], modes = [], k;
    for (k = 0; k < D; k++) {
      var tk = cfg.turns && cfg.turns[k] != null ? Math.round(cfg.turns[k]) : turnsDefault;
      turns.push(Math.max(2, Math.min(1680, tk)));
      var mk = (cfg.modes && cfg.modes[k]) || (k % 2 === 0 ? 'normal' : 'axial');
      modes.push(mk);
    }
    var dir = cfg.reverse ? -1 : 1;

    /* 点数预估 → 超预算则降 spp（estimateCounts 与 subdivide 的实际计数同构） */
    var est = estimateCounts(D, turns, spp, extBase ? extBase.length : null);
    var autoReduced = false;
    while (est.levels[D] > maxPoints && spp > 3) {
      spp -= 1; est = estimateCounts(D, turns, spp, extBase ? extBase.length : null); autoReduced = true;
    }

    /* 基准曲线：
       · 缺省 —— 展开后的丝 = 一个完整的圆（文献原型）
       · 外部给 basePts 时（例如从 Anu 蛋形上取下的 whorl 一段）直接采用 */
    var basePts = [], n0 = 0, i, baseClosed;
    if (extBase) {
      for (i = 0; i < extBase.length; i++) {
        basePts.push([extBase[i][0], extBase[i][1], extBase[i][2]]);
      }
      n0 = basePts.length;
      baseClosed = (cfg.baseClosed !== false);
    } else {
      var bp = cfg.basePhase || 0;                      /* 多丝错相：基准圆起始角 */
      n0 = Math.max(24, Math.round(spp * turns[0]));
      for (i = 0; i < n0; i++) {
        var a = bp + TAU * i / n0;
        basePts.push([baseR * Math.cos(a), baseR * Math.sin(a), 0]);
      }
      baseClosed = true;
    }

    var cur = { p: basePts, closed: baseClosed };
    var levels = [];
    var OFF = cfg.offset || null;                       /* 多丝并排：整条曲线平移 */
    /* 基准曲线总弧长（外部曲线用真实弧长，内部圆用 2πR） */
    var L0 = 0;
    for (i = 1; i < n0; i++) {
      var bdx = basePts[i][0] - basePts[i - 1][0],
          bdy = basePts[i][1] - basePts[i - 1][1],
          bdz = basePts[i][2] - basePts[i - 1][2];
      L0 += Math.sqrt(bdx * bdx + bdy * bdy + bdz * bdz);
    }
    if (baseClosed && n0 > 2) {
      var edx = basePts[0][0] - basePts[n0 - 1][0],
          edy = basePts[0][1] - basePts[n0 - 1][1],
          edz = basePts[0][2] - basePts[n0 - 1][2];
      L0 += Math.sqrt(edx * edx + edy * edy + edz * edz);
    }
    var arcPerTurn = L0;                        /* 父曲线「每匝弧长」初值 */
    levels.push({
      k: 0, pts: flatten(basePts, OFF), count: n0, turns: 0, accumTurns: 1,
      radius: baseR, parentRadius: baseR, mode: 'base',
      planeNormal: [0, 0, 1], arc: L0, arcPerTurn: L0, closed: baseClosed
    });

    var accum = 1;
    /* 逐阶种子：第 k 阶曲线的标架用「第 k 阶自己的缠绕轴」播入。
       这使正交性**由构造保证**（见文末注释），不再依赖任意初始标架：
         · normal 模式：本阶缠绕轴 = T_{k-1}，取 N_k := T_{k-1}
           ⇒ 下一阶 axial 的轴 B_k = T_k × N_k ≈ B_{k-1} × T_{k-1} = N_{k-1} ⊥ T_{k-1} ✓
         · axial  模式：本阶缠绕轴 = B_{k-1}，取 N_k := B_{k-1}
           ⇒ 下一阶 normal 的轴 T_k 落在 span(N_{k-1}, T_{k-1}) 内，天然 ⊥ B_{k-1} ✓ */
    var seedN = cfg.seedN || null;
    for (k = 1; k <= D; k++) {
      var Tk = turns[k - 1];
      /* 子螺旋半径：父曲线相邻两匝间距 = arcPerTurn / Tk，
         半径取间距之半再乘充填比 → 数学上保证相邻匝不重叠 */
      var pitch = arcPerTurn / Tk;
      var rk = fill * pitch * 0.5;
      var needPts = spp * (accum * Tk);
      var child = subdivide(cur, {
        turns: Tk * dir,                           /* 反向丝：负圈数 = 反向绕 */
        radius: rk,
        mode: modes[k - 1],
        count: needPts,
        spp: spp,
        phase0: (cfg.phase0 || 0) * (cfg.reverse ? -1 : 1),
        seedN: seedN
      });
      accum *= Tk;
      arcPerTurn = child.len / accum;             /* 本阶「每匝弧长」→ 传给下一阶 */
      /* 缠绕平面法向取自 subdivide 内部实际使用的父标架（frame0），
         与线圈放置所用标架严格一致：normal → T；axial → B */
      var fr0 = child.frame0;
      var nm = (modes[k - 1] === 'axial') ? fr0.b : fr0.t;
      seedN = nm;                                 /* 下一阶的标架种子 = 本阶缠绕轴 */
      levels.push({
        k: k, pts: flatten(child.p, OFF), count: child.p.length,
        turns: Tk, accumTurns: accum, radius: rk, parentRadius: 0,
        pitch: pitch, mode: modes[k - 1], windMode: modes[k - 1], planeNormal: nm,
        arc: child.len, arcPerTurn: arcPerTurn,
        samplePoint: (function () {
          var sp = child.p[Math.floor(child.p.length * 0.17)] || child.p[0];
          return OFF ? [sp[0] + OFF[0], sp[1] + OFF[1], sp[2] + OFF[2]] : sp;
        })()
      });
      cur = child;
    }

    var last = levels[levels.length - 1];
    return {
      levels: levels,
      depth: D,
      totalPoints: last.count,
      totalTurns: accum,
      totalArc: last.arc,
      spp: spp,
      autoReduced: autoReduced,
      cfg: {
        baseR: baseR, fill: fill, spp: spp, depth: D,
        turns: turns, modes: modes, reverse: !!cfg.reverse,
        wires: cfg.wires || 1, wireIndex: cfg.wireIndex || 0
      }
    };
  }

  function flatten(pts, offset) {
    var ox = offset ? offset[0] : 0, oy = offset ? offset[1] : 0, oz = offset ? offset[2] : 0;
    var out = new Float32Array(pts.length * 3);
    for (var i = 0; i < pts.length; i++) {
      out[i * 3] = pts[i][0] + ox; out[i * 3 + 1] = pts[i][1] + oy; out[i * 3 + 2] = pts[i][2] + oz;
    }
    return out;
  }

  /* --------------------------------------------------- 正交性 / 闭合性自检 */
  /**
   * 相邻两阶缠绕平面的法向夹角（交替正交时应为 90°）。
   *
   * ⚠️ A 必须取 **A 在「衔接点」处** 的缠绕平面法向（attachNormal），
   *    因为 B 是挂在「A 的最后一匝起点」上的，而不是挂在 A 的起点上。
   *    早先两者都取「各阶起点」，在 build（各级同起点）里恰好对，在 ladder
   *    （各级首尾相接）里就会逐级漂移，实测 90/81/90/72/90/47。
   *    build 不设 attachNormal → 回退到 planeNormal（与旧行为一致）。
   */
  function planeAngleBetween(A, B) {
    var a = A.attachNormal || A.planeNormal, b = B.planeNormal;
    var c = Math.abs(dot(norm(a), norm(b)));
    return Math.acos(Math.max(0, Math.min(1, c))) * 180 / Math.PI;
  }

  /**
   * 逐阶缠绕平面夹角序列：[∠(1,2), ∠(2,3), ...]，单位「度」，交替正交时应为 90°。
   *
   * ── 为什么用「各阶起点标架」而不是「全曲线场平均」──
   * 曾试过沿整条曲线做场平均（fieldOf(j) 与 fieldOf(j−1) 逐点比对）：结果不收敛
   * （spp 从 6 加密到 32，第一对恒为 ≈55.5°），说明该量不对应任何真实几何不变量。
   * 原因：第 j 阶的轴向场沿自身曲线**快变**（一匝一个周期），第 j−1 阶的轴向场只随
   * 父曲线**慢变**，两者逐点相减等于拿快变场比慢变场，得到的只是相位差。
   *
   * 而「相邻两阶是否垂直」在几何上是**局部命题**：在同一个父标架 (T,N,B) 内，
   * 两族候选缠绕平面 span(N,B)（法向 T）与 span(N,T)（法向 B）因 T ⊥ B 而严格垂直。
   * 逐阶交替取这两族 → 相邻两阶严格 90°。故取各阶起点的 planeNormal 比较即正确。
   * （planeNormal 已由 build 按「本阶实际使用的父标架」给出，见 build 中的 seedN 递推。）
   */
  function planeAngleMean(model) {
    var out = [];
    for (var j = 2; j < model.levels.length; j++) {
      out.push(planeAngleBetween(model.levels[j - 1], model.levels[j]));
    }
    return out;
  }

  function ptsOfFlat(flat) {
    var n = flat.length / 3, o = new Array(n);
    for (var i = 0; i < n; i++) { o[i] = [flat[i * 3], flat[i * 3 + 1], flat[i * 3 + 2]]; }
    return o;
  }

  /** 闭合误差：末点与首点距离 / 平均边长 */
  function closureError(pts) {
    var n = pts.length; if (n < 3) { return 0; }
    var d = len(sub([pts[n - 1][0], pts[n - 1][1], pts[n - 1][2]], [pts[0][0], pts[0][1], pts[0][2]]));
    var sum = 0, m = Math.min(n - 1, 200);
    for (var i = 0; i < m; i++) { sum += len(sub(pts[i + 1], pts[i])); }
    return d / (sum / m);
  }

  /* --------------------------------------------------- 正统 Anu 数值（文献） */
  function theoretical() {
    var perWireTurns = 1680;          /* 1 阶 spirilla 匝数 */
    var orders = 7;                   /* spirilla 阶数 */
    var branch = 7;                   /* 每阶 7 分叉 */
    var bubblesPerFirstOrder = Math.pow(branch, orders);   /* 7^7 */
    var bubblesPerWire = perWireTurns * bubblesPerFirstOrder;
    return {
      wires: 10, thick: 3, thin: 7,
      perWireTurns: perWireTurns,
      orders: orders, branch: branch,
      bubblesPerFirstOrder: bubblesPerFirstOrder,
      bubblesPerWire: bubblesPerWire,
      bubblesTotal: bubblesPerWire * 10,
      coilDecomp: '1680 = 5 转 × 每半转 168 匝 × 2',
      note: '「每阶 7 分叉」按七根细丝计；三根粗丝原文为 704:100 的轻微偏离。'
    };
  }

  /** 预设 */
  function presets() {
    /* 🔴🔴 2026-10-08 老师（本轮）：
       「**预设卡里面③和④对应相关图删除，不需要。我之前说过了，为何还在**」
       ⇒ 删掉原来的 ③ `spring1680`（1680 匝主弹簧 · 文献原型）与
              ④ `coilcoil`（弹簧套弹簧 · 全环向对照）两个预设。
          剩下的「十丝并列」**序号前移补空档** ⇒ ① Anu 整体形态 / ② 七级垂直细分 / ③ 十丝并列。
          （与上次删 ①b 蛋形同一口径：「①..③ 连续无空档」；旧 id `anuOvoid` / `spring1680` /
            `coilcoil` 三个都已从全项目 —— js / 自检 / 文档 —— 清除。）

       为什么这两条是多余的：
         · 原 ③「1680 匝主弹簧」= ② 七级垂直细分的**第 1 级单独拿出来看**，信息完全重复；
         · 原 ④「弹簧套弹簧」= ② 的**反例对照**（缠绕平面既不平行也不正交），
           而②的 HUD 已经把「逐级模式链」写在标题里，不需要再摆一个对照预设。
       ⚠️ 这两条的几何能力**没有被删掉**，只是不再作为预设卡片出现：
          手动把「阶数 D」拖到 1 + 丝数 1 丝，得到的正是原 ③；
          把「缠绕模式」切到全环向、D = 5，得到的就是原 ④。 */

    /* 🔴 2026-10-08 老师第 ③ 条：**移除旧版蛋形预设**（`anuOvoid`）—— 「形态错在蛋形盘绕」，
       保留它只会让人误以为那也是一种对画法 ⇒ 已删除（旧 id 已从全项目清除）。 */
    return [
      { id: 'anuHeart', name: '① Anu 整体形态（爱心双螺旋 · 10 丝）',
        note: 'Occult Chemistry 原图 + 订正几何：子午线 = 上半两个圆肩（爱心）+ 下半椭圆苹果底，中央顶中凹口；轴向 10 根 whorl（3 粗 7 细，3 粗的对面 180° 恰是细丝）。每根 whorl 下行 2.5 圈（内程 —— 贴着中轴直锥的锥壁缠绕，从上孔 0.1364 收到下孔 0.0422）+ 上行 2.5 圈（顺着苹果的边界缠绕）= 5 圈，这根路径自身再绕 1680 匝（1st-order spirillae）；⚠️ 2026-10-08 老师最终裁定：文献的「反向」实指**翻转、走外程回到上孔**，**不是**两族对扭 ⇒ 十丝两程一律**同向**；10 丝共用**唯一一个**相位方程（ω = turnsPerLeg），俯视图**恒 180° 对望**。中轴是口大下小的直锥管（半角 2.95° / 锥角 5.90°），上下孔 = 子午线与锥壁的交点。D > 1 时第 2..D 阶与预设②**共用同一台 `tailChain` 引擎**递归细分（每级 ×7 匝）。' },
      { id: 'ladder7', name: '② 七级垂直细分（1680 匝 → 逐级 ×7）',
        note: '第 1 级 = 丝展开成圆后绕 1680 匝（1st-order spirillae）；其后每级在上一级的一匝上再绕 7 匝，直到第 7 级。' },
      { id: 'caduceus', name: '③ 十丝并列（3 粗 + 7 细 · 全程同向）',
        note: '十根**互不接触**的闭合丝并列（Phillips：ten non-touching, closed curves）。⚠️ 2026-10-08 老师最终裁定「忘掉文献说的反向缠绕」后改正：**十丝两程一律同向** —— 前段（下行 2.5 圈）3 粗丝先出现、7 细丝随后「跟随」前 3 丝的螺旋；到最低点**翻转**、走外程回到顶部（文献说的「反向」指的是这一件事，不是两族对扭）。3 粗与 7 细的关系是**绕中轴圆周阵列 180° 旋转**（10 丝共用唯一一个相位方程 ⇒ 俯视恒 180° 对望）。旧 `returnOpposite`「回程段反向」口径已作废。本预选用线圈示意两族**并列同向**；文献的 caduceus 是**带状双蛇杖**（3 束为一「蛇」、7 束为另一「蛇」），不是经典对称双蛇。完整几何见预设①（js/anu-heart.js）。' }
    ];
  }

  return {
    TAU: TAU,
    frames: frames, subdivide: subdivide, build: build, ladder: ladder,
    tailTurn: tailTurn, segLen: segLen, naturalRatio: naturalRatio,
    tailChain: tailChain, lerpFrame: lerpFrame, parentParamOf: parentParamOf,
    flatten: flatten, theoretical: theoretical, presets: presets,
    estimateCounts: estimateCounts,
    planeAngleBetween: planeAngleBetween, planeAngleMean: planeAngleMean,
    closureError: closureError,
    _v: { add: add, sub: sub, mul: mul, dot: dot, cross: cross, len: len, norm: norm, anyPerp: anyPerp, rotAxis: rotAxis }
  };
});
