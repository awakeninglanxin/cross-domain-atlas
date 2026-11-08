/* =========================================================================
   闪屏引擎 · 线框立体 + 光驱动频闪
   -------------------------------------------------------------------------
   算法骨架（对照梦机器专利族 FR3140284A1 / WO2024068778A1 的公开架构）：
     · 多振荡器并行：左眼 fL、右眼 fR 各自一条频闪通道，互不锁定
     · 多纯净频率叠加：两频同时打到视网膜 ⇒ 神经层出现 |fL−fR| 拍频与和频
     · 频段映射 + 频率斜坡：会话 = 若干阶段，每段保持稳定节奏，段内可缓坡
     · 占空比 / 波形 / 亮度包络 / 相位差（0/90/180/270）全部可编排
   立体：真双目视差，不是滤镜 —— 每帧同一组几何渲染两遍，
     两台虚拟相机左右错开一个瞳距；左半屏给左眼、右半屏给右眼（或红青叠加）。
   全部手写投影，无任何第三方库，file:// 离线可用。
   ========================================================================= */
(function (global) {
  'use strict';

  var TAU = Math.PI * 2;
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var smooth = function (t) { return t * t * (3 - 2 * t); };
  var frac = function (x) { return x - Math.floor(x); };

  /* ═════════════════════════ 1. 几何 ═════════════════════════ */
  var PHI = (1 + Math.sqrt(5)) / 2;
  function unit(p) {
    var l = Math.hypot(p[0], p[1], p[2]) || 1;
    return [p[0] / l, p[1] / l, p[2] / l];
  }
  var IV = [
    [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
    [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
    [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1]
  ].map(unit);
  var IF = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
  ];

  /* 测地球：二十面体按 freq 细分后投影到球面（freq=1 → 12 顶点 30 棱） */
  function geodesic(freq, r) {
    var verts = [], idx = new Map(), seen = new Set(), segs = [];
    function add(p) {
      var k = p.map(function (v) { return v.toFixed(4); }).join(',');
      if (idx.has(k)) return idx.get(k);
      var i = verts.length; verts.push(p); idx.set(k, i); return i;
    }
    IF.forEach(function (f) {
      var A = IV[f[0]], B = IV[f[1]], C = IV[f[2]], ids = {};
      for (var i = 0; i <= freq; i++) {
        for (var j = 0; j <= freq - i; j++) {
          var w0 = (freq - i - j) / freq, w1 = i / freq, w2 = j / freq;
          ids[i + ',' + j] = add(unit([
            A[0] * w0 + B[0] * w1 + C[0] * w2,
            A[1] * w0 + B[1] * w1 + C[1] * w2,
            A[2] * w0 + B[2] * w1 + C[2] * w2
          ]));
        }
      }
      function E(i1, j1, i2, j2) {
        if (i2 + j2 > freq) return;
        var a = ids[i1 + ',' + j1], b = ids[i2 + ',' + j2];
        var k = Math.min(a, b) + '_' + Math.max(a, b);
        if (seen.has(k)) return; seen.add(k);
        segs.push([verts[a], verts[b]]);
      }
      for (var i2 = 0; i2 <= freq; i2++) {
        for (var j2 = 0; j2 <= freq - i2; j2++) {
          E(i2, j2, i2 + 1, j2); E(i2, j2, i2, j2 + 1); E(i2 + 1, j2, i2, j2 + 1);
        }
      }
    });
    return segs.map(function (s) {
      return [s[0].map(function (v) { return v * r; }), s[1].map(function (v) { return v * r; })];
    });
  }

  function cube(r) {
    var k = r / Math.sqrt(3);
    var v = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
             [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]].map(function (p) {
      return [p[0] * k, p[1] * k, p[2] * k];
    });
    var e = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4],
             [0, 4], [1, 5], [2, 6], [3, 7]];
    return e.map(function (q) { return [v[q[0]], v[q[1]]]; });
  }

  function h1(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

  /* ═════════════════════════ 2. 场景 ═════════════════════════ */
  var SCENES = {
    poly: {
      label: '多面体 · 三层嵌套',
      camZ: -5.4,
      build: function () {
        return [
          { segs: geodesic(1, 1.00), spin: [0.28, 0.19, 0.08] },
          { segs: geodesic(2, 1.55), spin: [-0.19, 0.15, -0.12] },
          { segs: cube(2.15), spin: [0.10, -0.17, 0.14] }
        ];
      }
    },
    tunnel: {
      label: '隧道 · 透视回廊',
      camZ: 0,
      dynamic: true,
      build: function (t) {
        var segs = [], R = 26, M = 10, gap = 0.62, rings = [];
        for (var k = 0; k < R; k++) {
          var z = -2.4 - k * gap;
          var rad = 1.45 + 0.22 * Math.sin(k * 0.55 + t * 0.9);
          var tw = k * 0.11 + t * 0.35, pts = [];
          for (var m = 0; m < M; m++) {
            var a = tw + m / M * TAU;
            pts.push([Math.cos(a) * rad, Math.sin(a) * rad, z]);
          }
          for (m = 0; m < M; m++) segs.push([pts[m], pts[(m + 1) % M]]);
          rings.push(pts);
        }
        for (k = 0; k + 1 < rings.length; k++) {
          for (m = 0; m < M; m++) segs.push([rings[k][m], rings[k + 1][m]]);
        }
        return [{ segs: segs, spin: [0, 0, 0] }];
      }
    },
    ball: {
      label: '球网 · 双壳测地',
      camZ: -5.0,
      build: function () {
        return [
          { segs: geodesic(2, 2.00), spin: [0.16, 0.11, 0.05] },
          { segs: geodesic(1, 1.02), spin: [-0.30, -0.22, 0.16] }
        ];
      }
    },
    mandala: {
      label: '曼陀罗 · 星环阵列',
      camZ: -4.6,
      build: function () {
        var out = [];
        for (var k = 0; k < 7; k++) {
          var n = 8 + k * 2, rad = 0.55 + k * 0.34, segs = [], pts = [];
          for (var m = 0; m < n; m++) {
            var a = m / n * TAU;
            pts.push([Math.cos(a) * rad, Math.sin(a) * rad, 0]);
          }
          for (m = 0; m < n; m++) segs.push([pts[m], pts[(m + 2) % n]]);
          for (m = 0; m < n; m++) segs.push([pts[m], [0, 0, 0]]);
          out.push({
            segs: segs,
            spin: [0, 0, (k % 2 ? 1 : -1) * (0.10 + 0.025 * k)],
            tilt: [k * 0.16 - 0.4, k * 0.10 - 0.25, 0]
          });
        }
        return out;
      }
    },
    stars: {
      label: '星域 · 流星穿越',
      camZ: 0,
      dynamic: true,
      build: function (t) {
        var segs = [], N = 150, span = 20;
        for (var i = 0; i < N; i++) {
          var x = (h1(i * 3.1) * 2 - 1) * 3.6;
          var y = (h1(i * 7.7 + 0.5) * 2 - 1) * 2.6;
          var z = 1 - (((i * 0.618 + t * 0.10) % 1) * span) - 1.6;
          var len = 0.9 + h1(i * 5.3) * 1.1;
          segs.push([[x, y, z], [x, y, z - len]]);
        }
        return [{ segs: segs, spin: [0, 0, 0] }];
      }
    }
  };

  /* ═════════════════════════ 3. 会话（频段斜坡曲目） ═════════════════════════ */
  var SESSIONS = {
    free: {
      name: '自由 · 手动', desc: '按滑杆频率常驻，不自动换段', stages: null
    },
    test3: {
      name: '试 3 秒', desc: '低亮度 10Hz 先摸反应', dim: 0.55,
      stages: [{ d: 3, f: [10, 10], name: '试机 10Hz' }]
    },
    rivalry: {
      name: '双眼竞争 · 差频对撞', desc: '两眼频率不同 ⇒ 拍频 + 知觉交替',
      stages: [
        { d: 160, f: [16.4, 19.1], name: '差频 2.7Hz（β）' },
        { d: 160, f: [10.2, 12.7], name: '差频 2.5Hz（α）' },
        { d: 160, f: [8.6, 11.4], name: '差频 2.8Hz（θ/α）' }
      ]
    },
    meditate: {
      name: '冥想 · θ↔α', desc: '6 → 8.5 → 6.5 缓坡',
      stages: [
        { d: 180, f: [6, 6], f2: [7.5, 7.5], name: 'θ 6→7.5' },
        { d: 180, f: [7.5, 7.5], f2: [8.5, 8.5], name: 'α 7.5→8.5' },
        { d: 120, f: [8.5, 8.5], f2: [6.5, 6.5], name: '回落 6.5' },
        { d: 120, f: [6.5, 6.5], name: 'θ 停留' }
      ]
    },
    focus: {
      name: '专注 · β', desc: '14 → 20 缓升',
      stages: [
        { d: 120, f: [14, 14], f2: [17, 17], name: 'β 14→17' },
        { d: 300, f: [17, 17], f2: [20, 20], name: 'β 17→20' },
        { d: 180, f: [20, 20], f2: [18, 18], name: '回落 18' }
      ]
    },
    sleep: {
      name: '助眠 · α→θ→δ', desc: '10 → 2.5 四段降频',
      stages: [
        { d: 120, f: [10, 10], f2: [9, 9], name: 'α 10→9' },
        { d: 240, f: [9, 9], f2: [7, 7], name: 'α→θ 9→7' },
        { d: 240, f: [7, 7], f2: [4.5, 4.5], name: 'θ→δ 7→4.5' },
        { d: 180, f: [4.5, 4.5], f2: [2.5, 2.5], name: 'δ 4.5→2.5' },
        { d: 60, f: [2.5, 2.5], name: 'δ 停留' }
      ]
    },
    gamma: {
      name: 'γ · 40Hz（谐波折衷）', desc: '方波 20Hz 靠二次谐波够 40Hz',
      stages: [
        { d: 60, f: [40, 40], name: 'γ 40Hz 起' },
        { d: 240, f: [40, 40], name: 'γ 40Hz 持续' }
      ]
    },
    ascend: {
      name: '上行下潜 · β→δ→β', desc: 'Brain Machine 式 14 分钟',
      stages: [
        { d: 120, f: [18, 18], f2: [12, 12], name: 'β→α 18→12' },
        { d: 180, f: [10, 10], f2: [8, 8], name: 'α 10→8' },
        { d: 180, f: [7, 7], f2: [5, 5], name: 'θ 7→5' },
        { d: 180, f: [4, 4], f2: [3, 3], name: 'δ 4→3' },
        { d: 120, f: [3, 3], f2: [6.5, 6.5], name: '回升 6.5' },
        { d: 60, f: [6.5, 6.5], name: '结束停留' }
      ]
    }
  };
  function totalOf(key) {
    var se = SESSIONS[key];
    if (!se || !se.stages) return 0;
    var s = 0; se.stages.forEach(function (x) { s += x.d; });
    return s;
  }
  function evalSession(key, t) {
    var se = SESSIONS[key];
    if (!se || !se.stages) return { fL: S.fL, fR: S.fR, label: '自由', p: 0 };
    var acc = 0, prevEnd = null;
    for (var i = 0; i < se.stages.length; i++) {
      var st = se.stages[i];
      if (t < acc + st.d || i === se.stages.length - 1) {
        var local = clamp(t - acc, 0, st.d);
        var A = st.f, B = st.f2 || st.f;
        var glide = Math.min(1.6, st.d * 0.28), f;
        if (prevEnd && local < glide) {
          var k = smooth(local / glide);
          f = [lerp(prevEnd[0], A[0], k), lerp(prevEnd[1], A[1], k)];
        } else {
          var p = (local - glide) / Math.max(0.001, st.d - glide);
          f = [lerp(A[0], B[0], p), lerp(A[1], B[1], p)];
        }
        return { fL: f[0], fR: f[1], label: st.name || se.name, idx: i, p: local / st.d };
      }
      acc += st.d; prevEnd = st.f2 || st.f;
    }
    return { fL: S.fL, fR: S.fR, label: se.name, p: 0 };
  }

  /* ═════════════════════════ 4. 状态 ═════════════════════════ */
  var PAL = {
    /* 静态六色盘（每带一个色相；渲染时叠加 ±6° 慢漂移，画面不死板） */
    aurora: [188, 172, 156, 202, 216, 232],
    ice: [198, 204, 210, 216, 222, 228],
    ember: [8, 24, 42, 330, 302, 278],
    violet: [272, 286, 300, 314, 292, 266],
    emerald: [158, 170, 146, 182, 192, 202],
    gold: [46, 34, 22, 10, 318, 338],
    sakura: [335, 345, 355, 6, 16, 26],
    neon: [315, 292, 190, 162, 55, 25],
    sunset: [352, 22, 42, 300, 272, 250],
    ocean: [206, 196, 186, 216, 226, 236],
    /* 流光色盘：色相随时间循环流动（flow = 度/秒），明度另调 */
    flow: { flow: 42, sat: 95, lit: 74 },     /* 流彩 · 全谱循环 */
    macaron: { flow: 24, sat: 80, lit: 88 }   /* 马卡龙流光（明度很高） */
  };
  /* 取某深度带的描边色：band 色带序号，depth 基准明度（近亮远暗） */
  function palStroke(band, depth) {
    var p = PAL[S.palette] || PAL.aurora;
    if (Array.isArray(p)) {
      var h = p[band % p.length] + Math.sin(clock * 0.35 + band * 1.1) * 6;
      return 'hsl(' + h.toFixed(1) + ',88%,' + depth + '%)';
    }
    var fh = (clock * p.flow + band * 60) % 360;
    var lit = Math.round(depth * 0.3 + p.lit * 0.7);
    return 'hsl(' + fh.toFixed(1) + ',' + p.sat + '%,' + lit + '%)';
  }

  var S = {
    mode: 'vr',            // vr | anaglyph | sbs
    scene: 'poly',
    palette: 'aurora',
    style2d: 'line',       /* line 单线 | quad 四重镜像 | dots 点彩 */
    style3d: 'line',       /* line 实线 | dots 点彩 */
    win2d: 'full',         /* full 整周期（闭合）| short 短窗 ~14 圈（美形、不闭合） */
    win3d: 'full',
    sceneSpeed: 1,
    fL: 10, fR: 10,
    phase: 180, duty: 0.5, wave: 'sine',
    brightness: 1.00, bg: 0.00, bgSplit: 'tb', ipd: 1.10, distort: 0.12,
    session: 'free',
    running: false, paused: false, ended: false,
    sessionTime: 0,
    rate: 60,
    debugHold: false,
    /* 幻方四相数（二阶方 [[a,b],[c,d]]，规则 A：a+d = b+c）
       —— 四个数字按比例缩到「基频」以内，可直接产生非整数频率（k = base / max(数字)）。
       默认基频 6Hz（θ 段，落在 8–30Hz 光敏敏感区之外） */
    sq: { on: false, a: 220, b: 221, c: 3, d: 4, base: 6, mode: 'pair' },
    /* 六角数（三对 = x/y/z 轴，来自六角幻方 6 个角区数字和）
       —— 3D 六频纽结；前两对分别驱动左右眼闪烁，第三对只塑形 */
    hex: { n1: 1848, n2: 1640, n3: 3216, n4: 272, n5: 3112, n6: 376, base: 6 },
    /* 卡拉比丘（Calabi–Yau 五次曲面投影）—— 参数取自 E:\pythonProject\program 的 py 脚本
       n 阶数 / alpha 空间相位 / variant 变体 / dir 逆·顺时针 / phases 相位合并层数
       slices 每轴采样 / span 展幅 / towerLayers 塔层数 / thick 厚度 / 视图与自转 */
    cy: {
      n: 3, alpha: Math.PI / 4, slices: 12, span: 1.0,
      variant: 'std', dir: -1, thick: 0.06, towerLayers: 2, phases: 1,
      style: 'line', spin: 0.30, elev: 0.30, azim: 0.60
    },
    /* 频率/图形来源：sq = 四相数 2D；hex = 六角数 3D；cy = 卡拉比丘 3D；scene = 线框场景 */
    src: 'hex'
  };
  var userFL = S.fL, userFR = S.fR;

  var cv = null, ctx = null, dpr = 1;
  var clock = 0, last = 0, hudT = 0;
  var phases = { L: [0, 0], R: [0, 0] };
  var bgPh = [0, 0, 0, 0], bgFreqs = [10, 10, 10, 10];
  var cur = { L: [10], R: [10], fL: 10, fR: 10, label: '自由' };
  var fits = { L: [], R: [] };
  var cache = {};
  var rateBuf = [], rateDone = false;

  /* 把二阶方四相数换算成驱动频率（可分数；baseOverride 供会话接管基频） */
  function sqDerive(baseOverride) {
    var q = S.sq;
    var nums = [q.a, q.b, q.c, q.d].map(function (v) { return Math.abs(+v || 0); });
    var mx = Math.max.apply(null, nums.concat([1e-6]));
    var k = (baseOverride != null ? baseOverride : (+q.base || 6)) / mx;
    var L, R, beatL, beatR;
    if (q.mode === 'beat') {
      beatL = Math.max(0.4, Math.abs(nums[0] - nums[3]) * k);
      beatR = Math.max(0.4, Math.abs(nums[1] - nums[2]) * k);
      L = [beatL]; R = [beatR];
    } else {
      L = [nums[0] * k, nums[3] * k];
      R = [nums[1] * k, nums[2] * k];
      beatL = Math.abs(L[0] - L[1]);
      beatR = Math.abs(R[0] - R[1]);
    }
    return {
      k: k, L: L, R: R, beatL: beatL, beatR: beatR,
      sumL: nums[0] + nums[3], sumR: nums[1] + nums[2],
      ok: Math.abs((nums[0] + nums[3]) - (nums[1] + nums[2])) < 1e-9
    };
  }
  /* 六角数：三对（x/y/z 轴）。k = 基频 / max(六数)，频率可为分数 */
  function hexDerive(baseOverride) {
    var q = S.hex;
    var nums = [q.n1, q.n2, q.n3, q.n4, q.n5, q.n6].map(function (v) { return Math.abs(+v || 0); });
    var mx = Math.max.apply(null, nums.concat([1e-6]));
    var k = (baseOverride != null ? baseOverride : (+q.base || 6)) / mx;
    return { k: k, f: nums.map(function (v) { return v * k; }),
             pairs: [nums[0] + nums[1], nums[2] + nums[3], nums[4] + nums[5]] };
  }
  function sqActive() {
    return !!(S.sq.on && (!SESSIONS[S.session] || !SESSIONS[S.session].stages || S.session === 'free'));
  }

  /* ---------- 图形（只吃数字比例，统一缩放不改变形状） ---------- */
  var shape = { sq: null, hex: null, cy: null };
  function shapeDirty() { shape.sq = null; shape.hex = null; shape.cy = null; }

  /* 数值 gcd（浮点可用）：探索器同款口径 —— 公共周期 T_c = 2π / gcd(全体数字)，
     整数输入时 T_c = 2π（与浑天仪探索器 2D/3D 完全一致），曲线必然闭合 */
  function ngcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b > 1e-9) { var t = a % b; a = b; b = t; }
    return a;
  }
  function numGcdAll(nums) {
    var g = 0;
    for (var i = 0; i < nums.length; i++) {
      var v = Math.abs(+nums[i] || 0);
      if (v > 1e-9) g = g ? ngcd(g, v) : v;
    }
    return g >= 1e-9 ? g : 1;
  }
  function commonPeriod(nums) { return TAU / numGcdAll(nums); }
  function maxCycles(nums, g) {
    var mx = 0;
    nums.forEach(function (v) { mx = Math.max(mx, Math.abs(+v || 0)); });
    return mx / (g || 1);
  }

  function sqNumsRaw() {
    var q = S.sq;
    return [q.a, q.d, q.b, q.c].map(function (v) { return Math.abs(+v || 0); });
  }
  function hexNumsRaw() {
    var q = S.hex;
    return [q.n1, q.n2, q.n3, q.n4, q.n5, q.n6].map(function (v) { return Math.abs(+v || 0); });
  }

  /* 2D 四相数曲线：x = sin(a t) − sin(d t)，y = cos(b t) − cos(c t)，
     t 走满公共周期 T_c（gcd 口径）⇒ 曲线精确闭合（探索器同款） */
  function sqShape() {
    if (shape.sq) return shape.sq;
    var f = sqNumsRaw();
    var g = numGcdAll(f), T = TAU / g, cyc = maxCycles(f, g);
    var closed = true;
    if (S.win2d === 'short') {           /* 美形短窗：只画前 ~14 圈，不闭合 */
      var tShort = TAU * 14 / Math.max.apply(null, f.concat([1e-9]));
      if (tShort < T) { T = tShort; closed = false; }
    }
    var N = Math.round(Math.min(60000, Math.max(720, cyc * 48 * (T / (TAU / g)))));
    var pts = [], bb = { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 };
    for (var i = 0; i <= N; i++) {          /* 含 i=N：末点 = 首点，路径精确闭合 */
      var t = i / N * T;
      var x = (Math.sin(f[0] * t) - Math.sin(f[1] * t)) / 2;
      var y = (Math.cos(f[2] * t) - Math.cos(f[3] * t)) / 2;
      pts.push([x, y]);
      if (x < bb.x0) bb.x0 = x; if (x > bb.x1) bb.x1 = x;
      if (y < bb.y0) bb.y0 = y; if (y > bb.y1) bb.y1 = y;
    }
    shape.sq = { pts: pts, bb: bb, N: N, cyc: maxCycles(f, g) * (T * g / TAU), g: g, closed: closed, T: T };
    return shape.sq;
  }
  /* 3D 六角数纽结：x/y/z 各一对对望频率（sin−sin / cos−cos / sin−sin），
     同样走满公共周期；返回线段（实线款式）与点列（点彩款式） */
  function hexShape() {
    if (shape.hex) return shape.hex;
    var f = hexNumsRaw();
    var g = numGcdAll(f), T = TAU / g, cyc = maxCycles(f, g);
    var closed = true;
    if (S.win3d === 'short') {           /* 美形短窗：只画前 ~12 圈，不闭合 */
      var tShort = TAU * 12 / Math.max.apply(null, f.concat([1e-9]));
      if (tShort < T) { T = tShort; closed = false; }
    }
    var N = Math.round(Math.min(60000, Math.max(1200, cyc * 36 * (T / (TAU / g)))));
    var pts = [];
    for (var i = 0; i <= N; i++) {          /* 含 i=N：首尾同点 */
      var t = i / N * T;
      pts.push([
        (Math.sin(f[0] * t) - Math.sin(f[1] * t)) / 2,
        (Math.cos(f[2] * t) - Math.cos(f[3] * t)) / 2,
        (Math.sin(f[4] * t) - Math.sin(f[5] * t)) / 2
      ]);
    }
    var maxR = 0;
    pts.forEach(function (p) { var r = Math.hypot(p[0], p[1], p[2]); if (r > maxR) maxR = r; });
    var k = 2.2 / (maxR || 1), segs = [];
    for (i = 0; i < N; i++) {
      var a = pts[i], b = pts[i + 1];
      segs.push([[a[0] * k, a[1] * k, a[2] * k], [b[0] * k, b[1] * k, b[2] * k]]);
    }
    pts.forEach(function (p) { p[0] *= k; p[1] *= k; p[2] *= k; });
    shape.hex = { segs: segs, pts: pts, N: N, cyc: maxCycles(f, g) * (T * g / TAU), g: g, closed: closed, T: T };
    return shape.hex;
  }
  /* ═════════ 卡拉比丘曲面（Calabi–Yau 五次曲面投影） ═════════
     公式与 py 脚本一致（E:\pythonProject\program\calabi*.py / tower_calabi*.py）：
       z  = u + i·v ，u ∈ 展幅·[-1,1]，v ∈ [0, π/2]
       z1 = e^{iφk1} · cosh(z)^{2/n}
       z2 = e^{iφk2} · sinh(z)^{2/n}      φk = dir·2πk/n（逆时针取 -）
       x = Re z1 ，y = Re z2 ，z3 = cosα·Im z1 + sinα·Im z2
     变体：
       std   标准五次曲面（n² 张 sheet 叠成）
       egg   蛋形 —— u 先过黄金比形变 amp(u)：z = amp(u)·u + i·v
       tower 塔   —— 多层按 2^(j/2) 缩放沿 y 堆叠（tower_calabi）
       thick 厚度 —— 上下两壳 y ± t/2（… - 有厚度.py）
       flower 花  —— 蛋形 + 多相位，每相位绕竖轴错开 2π/phases 散瓣
     多相位合并：α_j = α + j·π/phases（… -多个相位合并.py / calabi_dif_a_merger.py）
     每相位一层 ⇒ 不同色带组（gi），绘制时色相错开 —— 层层"合而不同"
     自适应采样预算：cyBudget 初始 8000，帧时中位数 >42ms 砍半（下限 2600），
     「重新生成」恢复 8000。 */
  var cyBudget = 8000, cyFrameBuf = [];
  function cyResetBudget() { cyBudget = 8000; cyFrameBuf.length = 0; shape.cy = null; }
  var PHI = (Math.sqrt(5) + 1) / 2;
  /* 黄金比 amp(t)：t∈[-1,1] → 缩放系数（蛋形轮廓，原脚本 1:1 搬运） */
  function cyAmp(t) {
    var a = Math.atan(1 / PHI), bb = PHI, tt = t * Math.PI;
    var ct = Math.cos(tt), st = Math.sin(tt), sa = Math.sin(a), ca = Math.cos(a);
    if (Math.abs(ct) < 1e-9) ct = ct < 0 ? -1e-9 : 1e-9;
    var den = Math.sqrt(st * st + ct * ct * ca * ca);
    var inner = Math.max(0, bb * bb - 4 * ct * sa / den);
    var d2 = 2 * ct * sa;
    if (Math.abs(d2) < 1e-9) d2 = d2 < 0 ? -1e-9 : 1e-9;
    return (bb - Math.sqrt(inner)) / d2;
  }
  /* 复数幂 w^(2/n)：极坐标形式（避开 JS Math.pow 对负实数的 NaN） */
  function cpow2n(re, im, n) {
    var m = Math.hypot(re, im) || 1e-12;
    var arg = Math.atan2(im, re);
    var mag = Math.exp((2 / n) * Math.log(m)), ang = (2 / n) * arg;
    return [mag * Math.cos(ang), mag * Math.sin(ang)];
  }
  /* 单点：z = u+iv → (x, y, z3) */
  function cyPt(u, v, k1, k2, n, alpha, dir, eggOn) {
    var x = eggOn ? u * cyAmp(u) : u;
    var chx = Math.cosh(x), shx = Math.sinh(x), cv = Math.cos(v), sv = Math.sin(v);
    /* cosh z = chx·cos v + i·shx·sin v ；sinh z = shx·cos v + i·chx·sin v */
    var p1 = cpow2n(chx * cv, shx * sv, n);
    var p2 = cpow2n(shx * cv, chx * sv, n);
    var a1 = dir * TAU * k1 / n, a2 = dir * TAU * k2 / n;
    var z1r = Math.cos(a1) * p1[0] - Math.sin(a1) * p1[1];
    var z1i = Math.sin(a1) * p1[0] + Math.cos(a1) * p1[1];
    var z2r = Math.cos(a2) * p2[0] - Math.sin(a2) * p2[1];
    var z2i = Math.sin(a2) * p2[0] + Math.cos(a2) * p2[1];
    return [z1r, z2r, Math.cos(alpha) * z1i + Math.sin(alpha) * z2i];
  }
  /* 生成 CY 线框：每相位一层 {verts(顶点表), edges(索引边), gi, aMul, tilt, spin}
     —— 顶点缓存结构让每帧只投影一次顶点（边数可以是顶点数的两倍而不加倍计算） */
  function cyShape() {
    if (shape.cy) return shape.cy;
    var c = S.cy;
    var n = Math.max(1, Math.min(12, Math.round(+c.n || 1)));
    var span = Math.max(0.2, Math.min(2, +c.span || 1));
    var wantS = Math.max(4, Math.min(26, Math.round(+c.slices || 12)));
    var phases = [1, 2, 4, 6, 8].indexOf(+c.phases) >= 0 ? +c.phases : 1;
    var variant = c.variant || 'std';
    var dir = (+c.dir || -1) < 0 ? -1 : 1;
    var towerN = Math.max(1, Math.min(4, Math.round(+c.towerLayers || 2)));
    var thick = Math.max(0.005, Math.min(0.3, +c.thick || 0.06));
    var eggOn = variant === 'egg' || variant === 'flower';
    var petals = variant === 'flower';
    var stacks = variant === 'tower' ? towerN : 1;
    var shells = variant === 'thick' ? 2 : 1;
    var dots = c.style === 'dots';
    var surf = c.style === 'surf';       /* 曲面款式：线框 + 半透明填充面片 */

    /* 采样预算：边数 ≈ 2·n²·stacks·shells·phases·S²。
       cyBudget 初始 8000，帧时中位数 >42ms（<24fps）时自动砍半（下限 2600），
       「重新生成」恢复 —— 多相位 × 大 n 在慢设备上也能保住帧率 */
    var pairs = n * n;
    var budget = cyBudget;
    var cap = Math.floor(Math.sqrt(budget / Math.max(1, 2 * pairs * stacks * shells * phases)));
    var S1 = Math.max(5, Math.min(wantS, Math.max(5, cap)));
    var verts = 0, segCount = 0, faceCount = 0;

    var layers = [], allV = [];
    for (var gi = 0; gi < phases; gi++) {
      var alpha = (+c.alpha || 0) + gi * Math.PI / phases;
      var vv = [], ee = [], ffAll = surf ? [] : null;
      for (var k1 = 0; k1 < n; k1++) {
        for (var k2 = 0; k2 < n; k2++) {
          for (var st = 0; st < stacks; st++) {
            var sc = stacks > 1 ? Math.pow(2, (stacks - 1 - st) * 0.5) : 1;
            var yOff = stacks > 1 ? (st - (stacks - 1) / 2) * (2.2 / stacks) : 0;
            for (var sh = 0; sh < shells; sh++) {
              var dy = shells > 1 ? (sh ? thick / 2 : -thick / 2) : 0;
              var base = vv.length, i, j, ff = surf ? [] : null;
              for (i = 0; i < S1; i++) {
                var u = (S1 === 1 ? 0 : -1 + 2 * i / (S1 - 1)) * span;
                for (j = 0; j < S1; j++) {
                  var v = (Math.PI / 2) * j / (S1 - 1);
                  var p = cyPt(u, v, k1, k2, n, alpha, dir, eggOn);
                  vv.push([p[0] * sc, p[1] * sc + dy + yOff, p[2] * sc]);
                }
              }
              /* u 向边（固定 u，沿 v 走） */
              for (i = 0; i < S1; i++) for (j = 0; j < S1 - 1; j++)
                ee.push([base + i * S1 + j, base + i * S1 + j + 1]);
              /* v 向边（固定 v，沿 u 走） */
              for (j = 0; j < S1; j++) for (i = 0; i < S1 - 1; i++)
                ee.push([base + i * S1 + j, base + (i + 1) * S1 + j]);
              /* 曲面款式：每个网格单元 → 四边形面片（顶点索引，投影后在 drawEye 深度排序填充） */
              if (surf) for (i = 0; i < S1 - 1; i++) for (j = 0; j < S1 - 1; j++)
                ffAll.push([base + i * S1 + j, base + i * S1 + j + 1,
                            base + (i + 1) * S1 + j + 1, base + (i + 1) * S1 + j]);
            }
          }
        }
      }
      verts += vv.length; segCount += ee.length; faceCount += ffAll ? ffAll.length : 0;
      layers.push({
        verts: vv, edges: ee, faces: ffAll, pts: dots ? vv : null, gi: gi,
        aMul: phases > 1 ? Math.max(0.30, 0.92 / Math.sqrt(phases)) : 1,
        /* 花瓣：每相位绕竖轴错开；视图仰角/方位角对每层都生效 */
        tilt: [((+c.azim) || 0) + (petals ? gi * TAU / phases : 0), (+c.elev) || 0, 0],
        spin: [((+c.spin) || 0), ((+c.spin) || 0) * 0.32, 0]
      });
      for (var vi = 0; vi < vv.length; vi++) allV.push(vv[vi]);
    }
    /* 统一居中 + 统一缩放（就地改顶点表） */
    var bx = [1e9, -1e9, 1e9, -1e9, 1e9, -1e9];
    allV.forEach(function (p) {
      if (p[0] < bx[0]) bx[0] = p[0]; if (p[0] > bx[1]) bx[1] = p[0];
      if (p[1] < bx[2]) bx[2] = p[1]; if (p[1] > bx[3]) bx[3] = p[1];
      if (p[2] < bx[4]) bx[4] = p[2]; if (p[2] > bx[5]) bx[5] = p[2];
    });
    var mx = (bx[0] + bx[1]) / 2, my = (bx[2] + bx[3]) / 2, mz = (bx[4] + bx[5]) / 2;
    var half = Math.max(bx[1] - bx[0], bx[3] - bx[2], bx[5] - bx[4]) / 2 || 1;
    var kk = 2.4 / half;
    allV.forEach(function (p) {
      p[0] = (p[0] - mx) * kk; p[1] = (p[1] - my) * kk; p[2] = (p[2] - mz) * kk;
    });

    var stats = { n: n, pairs: pairs, phases: phases, S1: S1, verts: verts,
                  segs: segCount, faces: faceCount, stacks: stacks, shells: shells,
                  variant: variant, rad: 2.4 };
    shape.cy = { layers: layers, stats: stats };
    return shape.cy;
  }
  /* 闭合度自检：首尾点距离（应为 0） */
  function shapeGap() {
    var s = sqShape().pts, h = hexShape().pts;
    var d = function (a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1], (a[2] || 0) - (b[2] || 0)); };
    return { sq: d(s[0], s[s.length - 1]), hex: d(h[0], h[h.length - 1]) };
  }
  /* 面板读数：公共周期（以 2π 为单位）、圈数、闭合状态 */
  function shapeInfo() {
    var s = sqShape(), h = hexShape();
    return {
      sq: { t: s.T / TAU, cyc: s.cyc, closed: s.closed },
      hex: { t: h.T / TAU, cyc: h.cyc, closed: h.closed }
    };
  }

  function fitFreq(f) {
    var maxF = Math.max(4, S.rate / 2 - 0.15);
    if (f <= maxF) return { show: f, harmonic: 0 };
    var half = f / 2;
    if (half <= maxF) return { show: half, harmonic: 2, target: f };
    return { show: maxF, harmonic: 0, capped: true, target: f };
  }

  function waveAt(ph, duty, type) {
    if (type === 'sine') return 0.5 - 0.5 * Math.cos(TAU * ph);
    if (type === 'tri') return ph < 0.5 ? ph * 2 : 2 - 2 * ph;
    return ph < duty ? 1 : 0;
  }

  function fadeFactor() {
    var tot = totalOf(S.session), t = S.sessionTime, f = 1;
    if (t < 3) f = t / 3;
    if (tot > 8 && t > tot - 5) f = Math.min(f, (tot - t) / 5);
    return clamp(f, 0, 1);
  }

  /* ═════════════════════════ 5. 投影与绘制 ═════════════════════════ */
  function rot3(x, y, z, yaw, pitch, roll) {
    var cr = Math.cos(roll), sr = Math.sin(roll);
    var x1 = x * cr - y * sr, y1 = x * sr + y * cr;
    var cp = Math.cos(pitch), sp = Math.sin(pitch);
    var y2 = y1 * cp - z * sp, z2 = y1 * sp + z * cp;
    var cy = Math.cos(yaw), sy = Math.sin(yaw);
    return [x1 * cy + z2 * sy, y2, -x1 * sy + z2 * cy];
  }

  function layersFor() {
    var sc = SCENES[S.scene];
    var t = clock * S.sceneSpeed;
    if (sc.dynamic) return sc.build(t);
    if (!cache[S.scene]) cache[S.scene] = sc.build(t);
    return cache[S.scene];
  }

  function brightOf(eye) {
    if (S.debugHold) return S.running ? Math.max(0.3, S.brightness) : 0.9;
    var fs = fits[eye] || [], ph = phases[eye] || [];
    var s = 0;
    for (var i = 0; i < fs.length; i++) s += waveAt(frac(ph[i] || 0), S.duty, S.wave);
    var w = fs.length ? s / fs.length : 0;
    if (!S.running) return 0.22 * (0.62 + 0.38 * w);
    var dim = (SESSIONS[S.session] && SESSIONS[S.session].dim) || 1;
    return S.brightness * dim * fadeFactor() * w;
  }

  /* 背景亮层：可整屏 / 左右 / 上下 / 四象限（面积对等），每区独立频闪。
     四象限即把二阶方摆到屏幕上：左上 a、右上 b、左下 c、右下 d。 */
  function paintBg(W, H, level) {
    /* 红青模式也允许背景分区频闪（原来直接跳过，老师反馈缺这项）；
       代价是白底相位会把红青视差冲淡 —— 面板已提示，要立体+背景闪请用 VR 分屏 */
    if (S.bg <= 0) return;
    var zones, idx;
    if (S.bgSplit === 'lr') {
      zones = [[0, 0, 0.5, 1], [0.5, 0, 0.5, 1]]; idx = [0, 1];
    } else if (S.bgSplit === 'tb') {
      zones = [[0, 0, 1, 0.5], [0, 0.5, 1, 0.5]]; idx = [0, 2];
    } else if (S.bgSplit === 'quad') {
      zones = [[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]];
      idx = [0, 1, 2, 3];
    } else {
      zones = [[0, 0, 1, 1]]; idx = [0];
    }
    ctx.globalCompositeOperation = 'source-over';
    /* 纯白峰值：亮度/背景都拉满时 黑 → 纯白 全对比（不再是灰蓝薄雾） */
    ctx.fillStyle = '#ffffff';
    for (var i = 0; i < zones.length; i++) {
      var j = idx[i];
      var w = S.debugHold ? 1 : waveAt(frac(bgPh[j] || 0), S.duty, S.wave);
      var a = clamp(S.bg * level * w, 0, 1);
      if (a <= 0.002) continue;
      ctx.globalAlpha = a;
      ctx.fillRect(Math.floor(zones[i][0] * W), Math.floor(zones[i][1] * H),
        Math.ceil(zones[i][2] * W), Math.ceil(zones[i][3] * H));
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'lighter';
  }

  function drawEye(region, eye, layers, camZ, bright) {
    var cx = region.x + region.w / 2, cy = region.y + region.h / 2;
    var minSide = Math.min(region.w, region.h);
    var f = minSide * 0.95;
    var half = minSide / 2;
    var vr = S.mode === 'vr';
    var k = vr ? S.distort : 0;
    if (k) f /= (1 + 0.55 * k);
    var camX = (eye === 'L' ? -0.5 : 0.5) * 0.075 * S.ipd;

    function proj(p) {
      var z = p[2] + camZ;
      if (z > -0.55) return null;
      var sx = cx + (p[0] - camX) * f / (-z);
      var sy = cy - p[1] * f / (-z);
      if (k) {
        var u = (sx - cx) / half, v = (sy - cy) / half;
        var r2 = u * u + v * v;
        var sc = 1 + k * r2 + k * 0.30 * r2 * r2;
        sx = cx + u * sc * half; sy = cy + v * sc * half;
      }
      return [sx, sy, -z];
    }

    var items = [], faceItems = [], NG = 1;
    layers.forEach(function (L) {
      if (L.gi != null && L.gi + 1 > NG) NG = L.gi + 1;
    });
    layers.forEach(function (L) {
      var yaw = (L.tilt ? L.tilt[0] : 0) + clock * S.sceneSpeed * L.spin[0];
      var pitch = (L.tilt ? L.tilt[1] : 0) + clock * S.sceneSpeed * L.spin[1];
      var roll = (L.tilt ? L.tilt[2] : 0) + clock * S.sceneSpeed * L.spin[2];
      var gi = L.gi || 0, am = (L.aMul == null ? 1 : L.aMul);
      if (L.pts) {                       /* 点彩款式：点列（六角纽结 / CY 点云） */
        var stride = Math.max(1, Math.ceil(L.pts.length / 3000));
        for (var pi = 0; pi < L.pts.length; pi += stride) {
          var P0 = rot3(L.pts[pi][0], L.pts[pi][1], L.pts[pi][2], yaw, pitch, roll);
          var pp = proj(P0);
          if (!pp) continue;
          items.push({ x1: pp[0], y1: pp[1], x2: pp[0], y2: pp[1], d: pp[2], dot: true,
                       ci: pi / stride, g: gi, aMul: am });
        }
        return;
      }
      if (L.edges) {                     /* 顶点缓存结构（卡拉比丘）：每帧只投影一次顶点 */
        var pv = [];
        for (var vi = 0; vi < L.verts.length; vi++) {
          var V = rot3(L.verts[vi][0], L.verts[vi][1], L.verts[vi][2], yaw, pitch, roll);
          pv.push(proj(V));
        }
        if (L.faces) {                   /* 曲面款式：收集面片（深度排序后画半透明填充） */
          for (var fi = 0; fi < L.faces.length; fi++) {
            var Q = L.faces[fi];
            var qa = pv[Q[0]], qb = pv[Q[1]], qc = pv[Q[2]], qd = pv[Q[3]];
            if (!qa || !qb || !qc || !qd) continue;
            faceItems.push({ x: qa[0], y: qa[1],
                             p: [qb, qc, qd],
                             d: (qa[2] + qb[2] + qc[2] + qd[2]) * 0.25,
                             g: gi, aMul: am });
          }
        }
        for (var ei = 0; ei < L.edges.length; ei++) {
          var pa2 = pv[L.edges[ei][0]], pb2 = pv[L.edges[ei][1]];
          if (!pa2 || !pb2) continue;
          items.push({ x1: pa2[0], y1: pa2[1], x2: pb2[0], y2: pb2[1],
                       d: (pa2[2] + pb2[2]) / 2, g: gi, aMul: am });
        }
        return;
      }
      L.segs.forEach(function (sg) {
        var A = rot3(sg[0][0], sg[0][1], sg[0][2], yaw, pitch, roll);
        var B = rot3(sg[1][0], sg[1][1], sg[1][2], yaw, pitch, roll);
        var pa = proj(A), pb = proj(B);
        if (!pa || !pb) return;
        items.push({ x1: pa[0], y1: pa[1], x2: pb[0], y2: pb[1], d: (pa[2] + pb[2]) / 2,
                     g: gi, aMul: am });
      });
    });
    if (!items.length && !faceItems.length) return;

    /* 背景亮层已由 drawFrame 统一画（支持整屏/左右/上下/四象限分区），这里只画线。
       合成：红青模式在纯黑底保持 lighter（红+青叠加）；一旦开了背景闪（会出现白底）
       或非红青模式，用 difference —— 白底自动反色，图形任何相位都可见 */
    ctx.globalCompositeOperation =
      (S.mode === 'anaglyph' && S.bg <= 0) ? 'lighter' : 'difference';

    /* 曲面款式：面片画在网格线之前 —— 画家算法远→近，半透明填充。
       性能关键：按「深度带 × 相位层」合批成 Path2D（最多 6×NG 次 fill），
       逐面片设置状态会慢 3 倍以上；带内不再细分排序（同带深度相近，视觉无差）。
       近带更不透明（深度线索），红青模式直接用红/青掩膜色（lighter 下两眼各自成立） */
    if (faceItems.length) {
      var fmin = 1e9, fmax = -1e9, fi2;
      for (fi2 = 0; fi2 < faceItems.length; fi2++) {
        if (faceItems[fi2].d < fmin) fmin = faceItems[fi2].d;
        if (faceItems[fi2].d > fmax) fmax = faceItems[fi2].d;
      }
      var fspan = Math.max(0.001, fmax - fmin);
      var fpb = [];                              /* key = g*6+b */
      for (fi2 = 0; fi2 < NG * 6; fi2++) fpb.push(null);
      for (fi2 = 0; fi2 < faceItems.length; fi2++) {
        var FIT = faceItems[fi2];
        var fb = clamp(Math.floor((FIT.d - fmin) / fspan * 6), 0, 5);
        var key = (FIT.g || 0) * 6 + fb;
        if (!fpb[key]) fpb[key] = new Path2D();
        var PT = fpb[key];
        PT.moveTo(FIT.x, FIT.y);
        for (var fq = 0; fq < 3; fq++) PT.lineTo(FIT.p[fq][0], FIT.p[fq][1]);
        PT.closePath();
      }
      for (fb = 5; fb >= 0; fb--) {              /* 远带先画 → 近带覆盖 */
        for (var fg = 0; fg < NG; fg++) {
          var FB = fpb[fg * 6 + fb];
          if (!FB) continue;
          var tm = (fb + 0.5) / 6;               /* 带中点深度 0=近 1=远 */
          ctx.fillStyle = S.mode === 'anaglyph'
            ? (eye === 'L' ? 'rgb(255,48,64)' : 'rgb(44,238,255)')
            : palStroke((fb + fg * 2) % 6, 60 - fb * 4);
          ctx.globalAlpha = clamp(bright *
            (fg > 0 ? Math.max(0.30, 0.92 / Math.sqrt(NG)) : 1) *
            (0.14 + 0.30 * (1 - tm)), 0, 1);
          ctx.fill(FB);
        }
      }
      ctx.globalAlpha = 1;
    }
    var surfDim = faceItems.length ? 0.55 : 1;   /* 曲面模式下把网格线压暗，让面读得出来 */

    var dmin = 1e9, dmax = -1e9;
    items.forEach(function (it) {
      if (it.d < dmin) dmin = it.d;
      if (it.d > dmax) dmax = it.d;
    });
    var span = Math.max(0.001, dmax - dmin);
    /* 分组：相位层(gi) × 深度带(6) —— 多相位合并时每层色相错开 */
    var bands = [];
    for (var gg = 0; gg < NG; gg++) {
      bands.push([]);
      for (var bb = 0; bb < 6; bb++) bands[gg].push({ list: [], aMul: 1 });
    }
    items.forEach(function (it) {
      var b = clamp(Math.floor((it.d - dmin) / span * 6), 0, 5);
      var grp = bands[it.g || 0][b];
      grp.list.push(it); grp.aMul = it.aMul || 1;
    });

    for (var g = 0; g < NG; g++) {
    for (var b = 0; b < 6; b++) {
      var grp = bands[g][b], arr = grp.list;
      if (!arr.length) continue;
      var hueBand = (b + g * 2) % 6;          /* 相位层错色带（≥4 相位时 4 组色相） */
      if (arr[0].dot) {                  /* 点彩：方块点，近大远小 */
        var stride2 = Math.max(1.4, (2.6 - b * 0.24)) * dpr *
          clamp(Math.min(cv.width, cv.height) / 900, 1, 2.4) * 1.5;
        ctx.fillStyle = S.mode === 'anaglyph'
          ? (eye === 'L' ? 'rgb(255,48,64)' : 'rgb(44,238,255)')
          : palStroke(hueBand, 74 - b * 6);
        ctx.globalAlpha = clamp(bright * (0.95 - b * 0.14) * grp.aMul, 0, 1);
        for (var i = 0; i < arr.length; i++) {
          var r2 = stride2;
          ctx.fillRect(arr[i].x1 - r2 / 2, arr[i].y1 - r2 / 2, r2, r2);
        }
        continue;
      }
      ctx.beginPath();
      for (var i = 0; i < arr.length; i++) {
        ctx.moveTo(arr[i].x1, arr[i].y1);
        ctx.lineTo(arr[i].x2, arr[i].y2);
      }
      if (S.mode === 'anaglyph') {
        ctx.strokeStyle = eye === 'L' ? 'rgb(255,48,64)' : 'rgb(44,238,255)';
      } else {
        ctx.strokeStyle = palStroke(hueBand, 74 - b * 6);
      }
      ctx.globalAlpha = clamp(bright * (0.95 - b * 0.14) * grp.aMul * surfDim, 0, 1);
      /* 线宽自适应画布：900px 基准，再随深度变细 —— 1600×900 下近层 ≈2.6px，4K 自动加粗 */
      ctx.lineWidth = Math.max(1.1, (2.6 - b * 0.24)) * dpr *
        clamp(Math.min(cv.width, cv.height) / 900, 1, 2.4);
      ctx.stroke();
    }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  /* 2D 四相数：单屏铺满，无立体视差（两只眼看到同一幅）
     款式：line 单线 / quad 四重镜像（x、y 取反叠出对称花纹）/ dots 点彩 */
  function drawFlat2D(bright) {
    var W = cv.width, H = cv.height;
    var sh = sqShape(), pts = sh.pts, bb = sh.bb;
    var w = bb.x1 - bb.x0, h = bb.y1 - bb.y0;
    var s = Math.min(W * 0.88 / (w || 1), H * 0.88 / (h || 1));
    var mx = (bb.x0 + bb.x1) / 2, my = (bb.y0 + bb.y1) / 2;
    var lwScale = dpr * clamp(Math.min(W, H) / 900, 1, 2.4);
    var CH = 6, per = Math.ceil(pts.length / CH);

    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(clock * 0.05);
    /* difference：黑底同普通画法，白底自动反色（背景闪到纯白时曲线依然可见） */
    ctx.globalCompositeOperation = 'difference';

    function chunkPath(c) {
      var i0 = Math.max(0, c * per - 1), i1 = Math.min(pts.length - 1, (c + 1) * per);
      var p = new Path2D();
      for (var i = i0; i <= i1; i++) {
        var px = (pts[i][0] - mx) * s, py = -(pts[i][1] - my) * s;
        if (i === i0) p.moveTo(px, py); else p.lineTo(px, py);
      }
      return p;
    }
    function strokeChunks(sx, sy, aMul) {
      for (var c = 0; c < CH; c++) {
        ctx.save();
        ctx.scale(sx, sy);
        ctx.strokeStyle = palStroke(c, 72);
        ctx.globalAlpha = clamp(bright * 0.92 * aMul, 0, 1);
        ctx.lineWidth = 2.0 * lwScale;
        ctx.stroke(chunkCache[c]);
        ctx.restore();
      }
    }
    var chunkCache = [];
    for (var c = 0; c < CH; c++) chunkCache.push(chunkPath(c));

    if (S.style2d === 'dots') {
      var stride = Math.max(1, Math.ceil(pts.length / 3600));
      for (var i = 0; i < pts.length; i += stride) {
        var px = (pts[i][0] - mx) * s, py = -(pts[i][1] - my) * s;
        ctx.fillStyle = palStroke(Math.floor(i / per) % CH, 72);
        ctx.globalAlpha = clamp(bright * 0.95, 0, 1);
        var r = 1.6 * lwScale;
        ctx.fillRect(px - r / 2, py - r / 2, r, r);
      }
    } else if (S.style2d === 'quad') {
      strokeChunks(1, 1, 1);
      strokeChunks(1, -1, 0.5);
      strokeChunks(-1, 1, 0.5);
      strokeChunks(-1, -1, 0.32);
    } else {
      strokeChunks(1, 1, 1);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function drawFrame() {
    if (!ctx) return;
    var W = cv.width, H = cv.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    /* 背景亮层（可分区、各区独立频率）——画在图形之下 */
    var dim = (SESSIONS[S.session] && SESSIONS[S.session].dim) || 1;
    var level = S.running ? S.brightness * dim * fadeFactor() : 0.22;
    paintBg(W, H, level);

    /* 2D 四相数：单屏、不分眼，亮度取两眼平均 */
    if (S.src === 'sq') {
      drawFlat2D((brightOf('L') + brightOf('R')) / 2);
      return;
    }

    var layers, camZ;
    if (S.src === 'hex') {
      var hs = hexShape();
      layers = [{ segs: hs.segs, pts: S.style3d === 'dots' ? hs.pts : null,
                  spin: [0.16, 0.11, 0.03] }];
      camZ = -6.0;
    } else if (S.src === 'cy') {
      layers = cyShape().layers;
      camZ = -6.4;
    } else {
      layers = layersFor();
      camZ = SCENES[S.scene].camZ;
    }

    if (S.mode === 'anaglyph') {
      drawEye({ x: 0, y: 0, w: W, h: H }, 'L', layers, camZ, brightOf('L'));
      drawEye({ x: 0, y: 0, w: W, h: H }, 'R', layers, camZ, brightOf('R'));
    } else {
      var halfW = Math.floor(W / 2);
      drawEye({ x: 0, y: 0, w: halfW, h: H }, 'L', layers, camZ, brightOf('L'));
      drawEye({ x: halfW, y: 0, w: W - halfW, h: H }, 'R', layers, camZ, brightOf('R'));
      if (S.mode === 'vr') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(0,0,0,0.9)';
        ctx.fillRect(halfW - 1, 0, 2, H);
      }
    }
  }

  /* ═════════════════════════ 6. 主循环 ═════════════════════════ */
  function fmtTime(t) {
    t = Math.max(0, t);
    var m = Math.floor(t / 60), s = Math.floor(t % 60);
    return m + ':' + (s < 10 ? '0' + s : s);
  }

  function updateHud() {
    var q = function (id) { return document.getElementById(id); };
    var fm = function (v) { return (Math.round(v * 10) / 10).toFixed(1); };
    var eF = q('hudFreq'), eS = q('hudStage'), eN = q('hudNote'), eR = q('hudRate');
    var fmtEye = function (arr) {
      return arr.map(function (v) { return fm(v); }).join(' + ');
    };
    if (eF) {
      if (S.src === 'sq') {
        eF.textContent = '四路 ' + cur.L.map(fm).join(' / ') + ' Hz';
      } else if (S.src === 'hex' && cur.zPair) {
        eF.textContent = '左 ' + fmtEye(cur.L) + ' Hz　右 ' + fmtEye(cur.R) +
          ' Hz　·　z 对（只塑形）' + fm(cur.zPair[0]) + ' / ' + fm(cur.zPair[1]) + ' Hz';
      } else {
        eF.textContent = '左 ' + fmtEye(cur.L) + ' Hz　右 ' + fmtEye(cur.R) + ' Hz';
      }
    }
    var tot = totalOf(S.session);
    if (eS) {
      eS.textContent = S.running
        ? (S.paused ? '⏸ 已暂停 · ' : '● ') + cur.label + '　' + fmtTime(S.sessionTime) + (tot ? ' / ' + fmtTime(tot) : '')
        : (S.session === 'free' ? '预览 · 自由频率（22% 亮）'
          : '预览 · ' + SESSIONS[S.session].name + '（24 秒压缩）');
    }
    var notes = [], harm = null, capped = null;
    ['L', 'R'].forEach(function (eye) {
      (fits[eye] || []).forEach(function (f) {
        if (f.harmonic) harm = f;
        if (f.capped) capped = f;
      });
    });
    if (harm) {
      notes.push('⚡ 目标 ' + fm(harm.target) + 'Hz > 屏上限 ' + fm(S.rate / 2) +
        'Hz ⇒ 按 ' + fm(harm.show) + 'Hz 方波闪，靠二次谐波够目标（不假装达到）');
    } else if (capped) {
      notes.push('⚡ 目标 ' + fm(capped.target) + 'Hz 超过屏上限，已夹到 ' + fm(capped.show) + 'Hz');
    }
    var inBand = false;
    ['L', 'R'].forEach(function (eye) {
      (fits[eye] || []).forEach(function (f) { if (f.show >= 8 && f.show <= 30) inBand = true; });
    });
    if (inBand) notes.push('⚠ 8–30Hz 是光敏性癫痫最敏感区间');
    if (eN) {
      eN.textContent = notes.join('　·　');
      eN.style.color = notes.length ? '#ffb86b' : 'rgba(190,200,225,.55)';
    }
    if (eR) eR.textContent = '屏 ≈' + Math.round(S.rate) + 'Hz · 显示上限 ' + fm(S.rate / 2) + 'Hz';
  }

  function tick(ts) {
    global.requestAnimationFrame(tick);
    if (!last) last = ts;
    var dtRaw = (ts - last) / 1000; last = ts;
    var dt = clamp(dtRaw, 0.0001, 0.06);

    if (!rateDone) {
      rateBuf.push(dtRaw * 1000);
      if (rateBuf.length >= 45) {
        rateBuf.sort(function (a, b) { return a - b; });
        var med = rateBuf[Math.floor(rateBuf.length / 2)];
        if (med > 4 && med < 40) S.rate = 1000 / med;
        rateDone = true;
      }
    }

    /* 卡拉比丘自适应降质：帧时中位数 >42ms 时把采样预算砍半（下限 2600） */
    if (S.src === 'cy') {
      cyFrameBuf.push(dtRaw * 1000);
      if (cyFrameBuf.length >= 45) {
        var cys = cyFrameBuf.slice().sort(function (a, b) { return a - b; });
        var cyMed = cys[Math.floor(cys.length / 2)];
        cyFrameBuf.length = 0;
        if (cyMed > 42 && cyBudget > 2600) {
          cyBudget = Math.max(2600, Math.floor(cyBudget / 2));
          shape.cy = null;
        }
      }
    } else if (cyFrameBuf.length) cyFrameBuf.length = 0;

    if (!S.paused) {
      clock += dt;
      if (S.running) {
        S.sessionTime += dt;
        var tot = totalOf(S.session);
        if (tot && S.sessionTime >= tot) { S.sessionTime = tot; stop(true); }
      }
    }

    /* 会话值：运行取真实时间，未运行取 24 秒压缩预览；定时会话会接管「基频」 */
    var se = SESSIONS[S.session];
    var timed = !!(se && se.stages);
    var sessFL = S.fL, sessFR = S.fR, sLabel = '自由';
    if (timed) {
      var tt = S.running ? S.sessionTime : ((clock % 24) / 24) * totalOf(S.session);
      var ee = evalSession(S.session, tt);
      sessFL = ee.fL; sessFR = ee.fR; sLabel = ee.label;
    }
    var baseSess = timed ? Math.max(sessFL, sessFR) : null;

    if (S.src === 'sq') {
      /* 四相数 2D：四路振荡器叠加（a/d/b/c），单屏，无立体 */
      var dq = sqDerive(baseSess != null ? baseSess : null);
      var fsq = [dq.L[0], dq.L[1], dq.R[0], dq.R[1]];
      cur = { L: fsq, R: fsq.slice(), fL: fsq[0], fR: fsq[0],
              label: '四相数 2D · 四路叠加' + (timed ? '（' + sLabel + '）' : '') };
    } else if (S.src === 'hex') {
      /* 六角数 3D：x/y 对分给左右眼，z 对只塑形 */
      var dh = hexDerive(baseSess != null ? baseSess : null);
      cur = { L: [dh.f[0], dh.f[1]], R: [dh.f[2], dh.f[3]],
              fL: dh.f[0], fR: dh.f[2], zPair: [dh.f[4], dh.f[5]],
              label: '六角数 3D · x/y 分眼' + (timed ? '（' + sLabel + '）' : '') };
    } else if (timed) {
      cur = { L: [sessFL], R: [sessFR], fL: sessFL, fR: sessFR, label: sLabel };
    } else {
      cur = { L: [S.fL], R: [S.fR], fL: S.fL, fR: S.fR,
              label: (S.src === 'cy' ? '卡拉比丘 · 自由' : '自由') };
    }
    /* 背景分区频率：sq → a/b/c/d（二阶方原位）；hex → x₁x₂/y₁y₂；scene → 左/右眼（镜像补齐四格） */
    if (S.src === 'sq') bgFreqs = [cur.L[0], cur.L[2], cur.L[3], cur.L[1]];
    else if (S.src === 'hex') bgFreqs = [cur.L[0], cur.L[1], cur.R[0], cur.R[1]];
    else bgFreqs = [cur.L[0], cur.R[0], cur.R[0], cur.L[0]];
    if (!S.paused) {
      for (var bi = 0; bi < 4; bi++) {
        bgPh[bi] = (bgPh[bi] || 0) + dt * fitFreq(bgFreqs[bi] || 1).show;
      }
    }
    fits.L = cur.L.map(fitFreq);
    fits.R = cur.R.map(fitFreq);
    if (!S.paused) {
      ['L', 'R'].forEach(function (eye) {
        var fs = fits[eye], ph = phases[eye];
        for (var i = 0; i < fs.length; i++) {
          if (ph[i] === undefined) ph[i] = 0;
          ph[i] += dt * fs[i].show;
        }
      });
    }

    drawFrame();
    hudT += dt;
    if (hudT > 0.12) { hudT = 0; updateHud(); }
  }

  /* ═════════════════════════ 7. 对外接口 ═════════════════════════ */
  function resize() {
    if (!cv) return;
    dpr = Math.min(2, global.devicePixelRatio || 1);
    var w = cv.clientWidth || global.innerWidth;
    var h = cv.clientHeight || global.innerHeight;
    cv.width = Math.max(2, Math.round(w * dpr));
    cv.height = Math.max(2, Math.round(h * dpr));
  }

  function resetPhases() {
    phases.L = [0, 0]; phases.R = [0, 0];
    bgPh = [0, 0, 0, 0];
  }

  function start() {
    S.sessionTime = 0; S.running = true; S.paused = false; S.ended = false;
    resetPhases();
    if (S.session === 'free') { S.fL = userFL; S.fR = userFR; }
  }
  function stop(finished) {
    S.running = false; S.paused = false; S.ended = !!finished;
    S.sessionTime = 0; resetPhases();
    if (typeof S.onEnd === 'function') S.onEnd(!!finished);
  }
  function togglePause() {
    if (!S.running) return false;
    S.paused = !S.paused;
    return S.paused;
  }
  function setMode(m) { S.mode = m; }
  function setScene(k) { if (SCENES[k]) { S.scene = k; cache = {}; } }
  function setSession(k) { if (SESSIONS[k]) { S.session = k; S.sessionTime = 0; } }
  function setUserFreq(l, r) {
    S.fL = l; S.fR = r;
    if (!S.running) { userFL = l; userFR = r; }
  }
  function fsOn() {
    var el = document.documentElement;
    var fn = el.requestFullscreen || el.webkitRequestFullscreen;
    if (fn) fn.call(el).catch(function () {});
  }
  function fsOff() {
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
  }
  async function lockLandscape() {
    try {
      if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape');
      return true;
    } catch (e) { return false; }
  }
  var wakeLock = null;
  async function keepAwake() {
    try {
      if ('wakeLock' in navigator) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', function () { wakeLock = null; });
        return true;
      }
    } catch (e) {}
    return false;
  }

  function init(canvas) {
    cv = canvas;
    ctx = cv.getContext('2d');
    resize();
    global.addEventListener('resize', resize);
    global.addEventListener('orientationchange', function () { setTimeout(resize, 300); });
    if (global.matchMedia) {
      var mq = global.matchMedia('(resolution: 1dppx)');
      if (mq && mq.addEventListener) mq.addEventListener('change', resize);
    }
    global.requestAnimationFrame(tick);
  }

  global.FLASH = {
    S: S, SCENES: SCENES, SESSIONS: SESSIONS, PAL: PAL, palStroke: palStroke,
    init: init, start: start, stop: stop, togglePause: togglePause,
    setMode: setMode, setScene: setScene, setSession: setSession,
    setUserFreq: setUserFreq, resize: resize, totalOf: totalOf,
    fsOn: fsOn, fsOff: fsOff, lockLandscape: lockLandscape, keepAwake: keepAwake,
    fmtTime: fmtTime,
    sqDerive: sqDerive, sqActive: sqActive, hexDerive: hexDerive,
    cyShape: cyShape,
    cyStats: function () { return cyShape().stats; },
    cyResetBudget: cyResetBudget,
    setCy: function (o) { shape.cy = null; Object.keys(o || {}).forEach(function (k) { S.cy[k] = o[k]; }); },
    /* 鼠标轨道视角：只更新 S.cy 与缓存层 tilt（不重建几何，拖拽零开销）。
       花瓣变体每层的相位偏移按「新方位角 − 旧方位角」平移保留 */
    cyOrbit: function (daz, del) {
      var oaz = (+S.cy.azim) || 0;
      S.cy.azim = ((oaz + daz) % TAU + TAU) % TAU;
      S.cy.elev = clamp((+S.cy.elev || 0) + del, -1.57, 1.57);
      if (shape.cy) shape.cy.layers.forEach(function (L) {
        L.tilt[0] = S.cy.azim + (L.tilt[0] - oaz);
        L.tilt[1] = S.cy.elev;
      });
      return { azim: S.cy.azim, elev: S.cy.elev };
    },
    shapeDirty: shapeDirty, shapeInfo: shapeInfo, shapeGap: shapeGap, numGcdAll: numGcdAll,
    setSq: function (o) { shape.sq = null; Object.keys(o || {}).forEach(function (k) { S.sq[k] = o[k]; }); },
    setHex: function (o) { shape.hex = null; Object.keys(o || {}).forEach(function (k) { S.hex[k] = o[k]; }); },
    current: function () {
      return { cur: cur, fits: fits, total: totalOf(S.session),
               bgFreqs: bgFreqs.slice(), bgPh: bgPh.slice() };
    }
  };
})(window);
