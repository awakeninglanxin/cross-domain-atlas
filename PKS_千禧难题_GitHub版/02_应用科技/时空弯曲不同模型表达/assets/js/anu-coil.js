/* ============================================================
   anu-coil.js —— ② 线框网格畸变：多质量摆位 + 叠加位移场 + 精确雅可比色标
   版本 1.1.1                      （页面 01_spacetime_six_models.html 专用）

   ── 1.1.1 的第五处纠错（warp：这条才是「网格看着没畸变」的真根因） ──
   ⑤ 两处一起：
      (a) 方向开关 `sign` 只赋值不参与计算（`var sg = num(o.sign,1)` 之后从没用到）
          ⇒ 「向内收拢 / 向外撑开」算出的是**同一个场**。
      (b) 「总和固定」share = 1/M 再叠**逐点 tanh 钳制** ⇒ 位移场退化成近乎刚体平移。
          实测 49 球弹簧「每格弯折」均/最大 = 0.999（原图单球 0.61），色标被压平。
      改为：g0 = str·share·sign；两遍算法（先累加与 g 无关的 Σd/s²、Σ1/s²、Σ2ddᵀ/s⁴，
      再求**一个全局增益**使峰值 |D| = peak1·gainK）；逐点钳制删除。
      M = 1 时增益恒为 1 ⇒ 与原页逐位一致。

   ── 1.1.0 的四处纠错（都是「症状补丁掩盖了根因」，一并挖掉） ──
   ① 删掉 neighbours/place/helixUV 里的 `if (n<=1) k = 0`。
      它让「每匝 1 个球」永远塌成 k=0（所有球落在同一高度）⇒ 页面只好再加一条
      「perTurn ≤ 1 就强制 1 匝」把症状盖住。真相是：n = 1 时**均匀条件本身就退化**
      （只剩「上下」一类邻居，任何 k 都均匀），k 是自由的，竖直一列的螺距就是 2πkR。
      现在 n = 1 允许 k > 0，「每匝 1 个球 × 7 匝 = 竖直 7 连球」是正常图形。
   ② dmin 不再一律取 min(dSame, dUp)：**只有 T ≥ 2 才有「上下」邻居**。
      k = 0 或 T = 1 时 dUp = 0 ⇒ dmin = 0 ⇒ 读数报「球间净距 −2r 重叠」，纯属谎报。
   ③ 环模式下 M < 2（只有 1 个球）根本没有邻居，dmin 取 Infinity 而不是 0，
      页面读到 Infinity 就打「无邻居」，不再把「一个球自己跟自己重叠」这种鬼话印出来。
   ④ autoFit → solveFit：改成**纯反解**（每次从零算，不做 min() 累积 —— 旧版会棘轮），
      并统一环与弹簧：dminTarget = 2L·fitK/T（高度预算均摊到 T 步），
      r = rGap·dminTarget，R = min(dminTarget/dOverR, L − r)。环模式 T = 1 ⇒ 预算全给一步
      ⇒ R 自动铺满格架（旧的默认 R = 2.43 会把 12 个球挤成看不见的一小团）。

   这个文件只算两件事，画图的事留给页面：
     1) 小球摆在哪儿（「环」上公转 / 「弹簧线圈」），以及相邻小球间距的**解析式**
     2) 这一堆质量怎么改写点阵（位移场的叠加）+ 色标要用的**精确雅可比行列式**

   ── 坐标系约定（重要，勿混） ────────────────────────────────
   页面 ② 是「只画空间」的图，所以这一页把显示轴改名为空间 x / y / z，
   **竖直轴 = z = 圆柱轴**（与用户给的弹簧公式 x,y,z = cos t, sin t, k t 对齐）。
   three.js 内部： three.y 是竖直方向，所以
        显示 (x, y, z)  →  three (X, Y, Z) = (x_disp, z_disp, y_disp)
   本模块**直接输出 three 坐标**，即弹簧写为
        (X, Y, Z) = ( R cos t ,  k·R·t ,  R sin t )
   「绕 z 轴公转」= 绕 three 的 Y 轴旋转。
   ============================================================ */
(function (root) {
  'use strict';

  var PI = Math.PI, TAU = 2 * PI;

  function num(v, d) { v = +v; return isFinite(v) ? v : d; }
  function clampInt(v, lo, hi) { v = Math.round(num(v, lo)); return v < lo ? lo : (v > hi ? hi : v); }
  function clamp(v, lo, hi) { v = num(v, lo); return v < lo ? lo : (v > hi ? hi : v); }

  /* warp 的累加 scratch（nP×10）。模块级缓存 + Float64：
     ① 不再每帧 new 一块几十万长度的数组；② 精度是双精度，全局增益不被 float32 抹掉。 */
  var _SCRATCH = null;

  /* ------------------------------------------------------------
     ① 每匝 n 个球时的「均匀螺距系数」k —— 解析解
     ------------------------------------------------------------
     弹簧 (x,y,z) = (R cos t, R sin t, k R t)，每匝 n 个球 ⇒ 步长 Δt = 2π/n。
     两类邻居（这是「上下左右」的严格定义）：
       同匝相邻（左右）:  弦 = 2R sin(π/n)，且 Δz = kR·2π/n  ≠ 0
                          d_左右² = (2R sin(π/n))² + (2πkR/n)²
       相邻匝同相位（上下）: d_上下 = 2πkR           （Δφ = 2π，纯竖直）
     要求「间距均匀」= 这两类距离相等（这是唯一的均匀点：d_左右² − d_上下² 对 k 单调递减）：
        (2R sin(π/n))² + (2πkR/n)² = (2πkR)²
        ⇒  sin²(π/n) = π²k²(n²−1)/n²
        ⇒  k* = n·sin(π/n) / (π·√(n²−1))
     n = 1 时上式退化（sin π = 0 ⇒ k* = 0，且没有「同匝邻居」）：
     恰好就是用户要的「k = 0 时自动固定只有 1 匝」。
     ------------------------------------------------------------ */
  /* n 的上限：模块内部一律夹到 12。2026-10-12 起**界面也**统一到 12
     （原先是「每匝球数 1–7 / 环上球数 1–12」两套口径，老师点名把前者提到 12）。
     公式本身对任意 n ≥ 2 都成立（kUniform 单调、dminCoef 单调），12 不是公式的限制而是显示的上限。
     ⚠ 曾经把模块里也写成 7，结果环要 12 个球时被静默夹成 7 个（环上相邻间距全错）。 */
  var N_MAX = 12;
  function kUniform(n) {
    n = clampInt(n, 1, N_MAX);
    if (n <= 1) return 0;
    return n * Math.sin(PI / n) / (PI * Math.sqrt(n * n - 1));
  }
  /* 最小中心距 / R（在 k = kUniform 下）：dmin = dminCoef(n)·R
     = 2πk*R = 2n·sin(π/n)/√(n²−1) */
  function dminCoef(n) {
    n = clampInt(n, 1, N_MAX);
    if (n <= 1) return 0;
    return 2 * n * Math.sin(PI / n) / Math.sqrt(n * n - 1);
  }

  /* ------------------------------------------------------------
     ①b dmin/R —— 给定 (n, k, T) 时「最近的中心距」除以 R
     ------------------------------------------------------------
     两类邻居（「上下左右」的严格定义；n=1 时没有「左右」这一类）：
       左右（同匝相邻）: dSame/R = √( (2sin(π/n))² + (2πk/n)² )
       上下（相邻匝同相位）: dUp/R = 2πk
     ★ T = 1 时**不存在**「上下」邻居（只有一匝），所以 dmin 只由「左右」决定。
       ⚠ 旧版一律 Math.min(dSame, dUp)：k = 0 ⇒ dUp = 0 ⇒ dmin = 0 ⇒ 读数报「重叠」、
       球半径被压成 0。那不是在描述几何，那是在把退化情形当成重叠。
     n = 1：没有「左右」，dmin = 上下 = 2πk（T ≥ 2）；T = 1 则一个球都没有邻居 ⇒ 0。
     ------------------------------------------------------------ */
  function dOverR(n, k, T) {
    n = clampInt(n, 1, N_MAX);
    k = num(k, 0); T = clampInt(T, 1, 49);
    var dSame = Math.sqrt(Math.pow(2 * Math.sin(PI / n), 2) + Math.pow(TAU * k / n, 2));
    if (n <= 1) return (T >= 2) ? TAU * k : 0;
    return (T >= 2) ? Math.min(dSame, TAU * k) : dSame;
  }

  /* ------------------------------------------------------------
     ② 相邻关系表：把「上下左右 + 对角」四个邻居的距离与方位全部列出来
     ------------------------------------------------------------ */
  function neighbours(o) {
    var R = num(o.R, 1);
    var mode = o.mode || 'spring';
    var n = clampInt(o.n, 1, N_MAX);
    var T = clampInt(o.turns, 1, 49);
    var noNB = (mode === 'ring') ? (n < 2) : (T * n < 2);   /* 压根没有邻居 */

    /* ▽ 环：n 个球共面（y = 0），只有「同匝相邻（左右）」这一类邻居，
        没有上下匝 —— 所以螺距/升角这些量在环模式下**不存在**，写 NaN 而不是编一个 0。 */
    if (mode === 'ring') {
      var chordR = 2 * R * Math.sin(PI / n);
      return {
        mode: 'ring', n: n, turns: 1, R: R, k: NaN, kIsAuto: true,
        psi: NaN, dt: TAU / n, chord: chordR, dzSame: 0,
        dSame: chordR, dUp: NaN, dDiag: NaN, pitch: NaN,
        dmin: noNB ? Infinity : chordR, noNB: noNB, hasUp: false,
        arcSame: R * TAU / n, arcUp: R * TAU, dminCoef: NaN,
        M: n, height: 0, straight: NaN
      };
    }

    var auto = (o.k === null || o.k === undefined);
    /* ⚠ 这里**不再**有 `if (n<=1) k=0`：n = 1 时均匀条件退化，k 是自由的，
       竖直一列（每匝 1 个球）的螺距就是 2πkR。旧版那句硬编码把 k 打死，
       于是「每匝 1 球」永远所有球同高度，页面只好再补一条「强制 1 匝」盖住症状。 */
    var k = auto ? kUniform(n) : clamp(num(o.k, 0), 0, 2);

    var dt = TAU / n;
    var chord = 2 * R * Math.sin(PI / n);    /* n=1 时为 0（没有同匝邻居） */
    var dzSame = k * R * dt;                 /* 同匝相邻还有一个 z 台阶 */
    var dSame = (n <= 1) ? (k * R * TAU) : Math.sqrt(chord * chord + dzSame * dzSame);
    var pitch = k * R * TAU;                 /* 每匝螺距 P = 2πkR */
    var hasUp = (T >= 2) && (n >= 1);        /* T = 1 没有上下邻居（只有一匝） */
    var dUp = hasUp ? pitch : NaN;
    var dDiag = Math.sqrt(chord * chord + Math.pow(k * R * (TAU - dt), 2)); /* 斜上/斜下 */
    var dmin = noNB ? Infinity : R * dOverR(n, k, T);

    var arcSame = R * Math.sqrt(1 + k * k) * dt;   /* 沿螺旋面走一步的弧长 */
    var arcUp = R * Math.sqrt(1 + k * k) * TAU;    /* 沿螺旋面绕一整圈的弧长 */
    var M = T * n;
    var height = T * pitch;                  /* 真实竖直跨度 = T·螺距（不再拿 T·dmin 冒充） */

    return {
      mode: 'spring', n: n, turns: T, R: R, k: k, kIsAuto: auto,
      psi: Math.atan(k),                   /* 螺旋升角 = arctan k */
      dt: dt, chord: chord, dzSame: dzSame,
      dSame: dSame, dUp: dUp, dDiag: dDiag, pitch: pitch, dmin: dmin,
      noNB: noNB, hasUp: hasUp,
      arcSame: arcSame, arcUp: arcUp,
      dminCoef: dminCoef(n),
      M: M, height: height,
      straight: hasUp ? (dUp / Math.max(1e-12, dSame)) : NaN   /* =1 时才是真均匀 */
    };
  }

  /* ------------------------------------------------------------
     ③ 摆位：把小球中心写进 out（three 坐标，Float32Array 3M）
        ring  : 一圈 n 个，平面 y = 0，半径 R
        spring: 弹簧线圈（沿竖直轴），t ∈ [−Tπ, Tπ]，每匝 n 个
     ------------------------------------------------------------ */
  function place(o, out) {
    var R = num(o.R, 1);
    var n = clampInt(o.n, 1, N_MAX);
    if (o.mode === 'ring') {
      for (var i = 0; i < n; i++) {
        var a = TAU * i / n;
        out[3 * i] = R * Math.cos(a); out[3 * i + 1] = 0; out[3 * i + 2] = R * Math.sin(a);
      }
      return n;
    }
    var T = clampInt(o.turns, 1, 49);
    var k = (o.k === null || o.k === undefined) ? kUniform(n) : clamp(num(o.k, 0), 0, 2);
    var dt = TAU / n;
    for (var j = 0; j < T * n; j++) {
      var t = -T * PI + j * dt;
      out[3 * j]     = R * Math.cos(t);
      out[3 * j + 1] = k * R * t;
      out[3 * j + 2] = R * Math.sin(t);
    }
    return T * n;
  }

  /* 展开图用的坐标：把圆柱面展开成平面 (u, v) = (R·t 弧长, z)
     展开后螺旋线是**直线** v = k·u，斜率就是 k ⇒ 切向角 = arctan k 一眼可见。 */
  function helixUV(o, uv) {
    var R = num(o.R, 1), n = clampInt(o.n, 1, N_MAX), T = clampInt(o.turns, 1, 49);
    var k = (o.k === null || o.k === undefined) ? kUniform(n) : clamp(num(o.k, 0), 0, 2);
    var dt = TAU / n, M = T * n;
    for (var j = 0; j < M; j++) {
      var t = -T * PI + j * dt;
      uv[2 * j] = R * t; uv[2 * j + 1] = k * R * t;
    }
    return M;
  }

  /* ------------------------------------------------------------
     ④ 自动适配：由「不重叠 + 间距均匀 + 装得下」三条**反解** R 与 r
     ------------------------------------------------------------
     三条约束写成式子（这是「k 由球大小与每匝个数自然涌现」的严格版本）：
       ① 均匀   k = kUniform(n)（n ≥ 2；n = 1 时均匀条件退化，k 由 ③ 定）
       ② 装得下 T·螺距 = T·(2πkR) ≤ 2L·fitK   ⇒「竖直方向 2L 高度里塞 T 步」
                ⇒ 每步的间距预算 dminTarget = 2L·fitK/T
       ③ 不重叠 r = rGap·dmin  （dmin = R·dOverR(n,k,T)）
     ------------------------------------------------------------
     由 ② 反解 R、再由 ③ 定 r。两式耦合（R 受 r 限、r 由 dmin 定）⇒ 迭代两遍。
     ★ rGap 取 0.40（净距 = 20%·dmin），**不是** 0.48：
       0.48 是「几何上还能再大一点」的极限（只有 4% 间隙），但落在图上两球就是**贴着**的，
       展开图里整片球连成一条实心带、三维图里球管把点阵完全包住 —— 那样既看不出「一颗颗小球」，
       也看不出网格畸变。0.40 留出 20% 净距，「不重叠」依然严格成立，图上也读得出来。
     ★ 为什么把「高度预算」写成 dminTarget = 2L·fitK/T 而不是「先解 R 再看高度」？
       因为在均匀解处 dmin ≡ 螺距 ⟹ 两个说法是同一个式子；但写成预算形式后
       **r 只与 T 有关、与 n 无关**（默认 T = 7 ⇒ r = 1.0214，n 取 2…12 都一样），
       于是「球数不同 ⇒ 只有畸变花样不同」变成一次受控比较，而不是球也在变大小。
     ★ 环模式：T = 1 ⇒ 预算 2L·fitK 全给一步 ⇒ R 自动解到「顶着格架」，
       12 个球才铺得开（旧默认 R = 2.43 把 12 个球挤成一坨，看不见还谈不上「更复杂的畸变」）。
     ★ 相位式：每次**从零**算 R（不做 min() 累积）—— 旧版累积会让匝数调大再调小时 R 卡死。
     ------------------------------------------------------------ */
  function solveFit(o) {
    var L = num(o.L, 7.6), fitK = num(o.fitK, 0.98), rGap = num(o.rGap, 0.40);
    var cell = num(o.cell, L / 2);
    var rCap = num(o.rCap, 0.34 * cell);       /* 球再大就只是装饰了，与「点质量」的读法不符 */
    var n = clampInt(o.n, 1, N_MAX);
    var T = clampInt(o.turns, 1, 49);
    var mode = o.mode || 'spring';
    var kAuto = (o.k === null || o.k === undefined);
    var dminTarget = (2 * L * fitK) / (mode === 'ring' ? 1 : T);   /* 2L·fitK/T */

    /* 逐字照抄三条约束。第 1 步先把「按 dminTarget 该有多大」写下来，
       第 2 步承认 rCap 会截断（球太大就削到上限），第 3 步回到半径方向夹一次。 */
    var r = Math.min(rCap, rGap * dminTarget);
    var Rrad = Math.max(0.05, L - r);          /* R + r ≤ L：半径方向装得下 */

    var k, R, dOver, dmin;
    if (mode === 'ring') {
      R = Rrad;                                /* 环：把半径方向的余量全用掉 */
      dOver = 2 * Math.sin(PI / n);            /* 弦 / R（n = 1 时为 0 ⇒ 无邻居） */
      R = (dOver > 1e-12) ? Math.min(dminTarget / dOver, Rrad) : Rrad;
      /* ⚠ n = 1 时 dOver = 2sin π = 2.4e−16（不是 0！浮点残渣）。
         不能写成 dmin = R·dOver —— 那样会得到 dmin = 1.5e−15、r 被压成 0，
         等于对「只有一个球」的图报「球半径必须为 0」。M < 2 就是没有邻居，写 Infinity。 */
      dmin = (n < 2) ? Infinity : R * dOver;
      k = null;
    } else if (n <= 1 && kAuto) {
      /* n = 1：均匀条件退化，k 自由 ⇒ 取「把半径用满、螺距正好等于预算」的那个 k
         ⇒ 竖直一列 T 个球，间距 dminTarget、球半径 rGap·dminTarget（4% 间隙）。
         ★ 这一条就是「k 由小球大小与每匝个数自然涌现」在 n = 1 时的正确答案。
         T = 1 且 n = 1 ⇒ 全图只有 1 个球，取 k = 0 让它落在正中央（否则会被
         起始相位 −Tπ 推到轴下方，一个孤零零的球偏在一边，白给一个「歪了」的印象）。 */
      R = Rrad;
      k = (T >= 2 && R > 1e-9) ? Math.min(2, dminTarget / (TAU * R)) : 0;
      dOver = TAU * ((T >= 2) ? 1 : 0);
      dmin = (T >= 2) ? TAU * k * R : Infinity;
    } else {
      k = kAuto ? kUniform(n) : clamp(num(o.k, 0), 0, 2);
      dOver = dOverR(n, k, T);
      R = (dOver > 1e-12) ? Math.min(dminTarget / dOver, Rrad) : Rrad;
      dmin = (T * n < 2) ? Infinity : R * dOver;
    }
    /* ②③ 复核：按真实 dmin 重定 r，再夹一次半径（rCap 只管球，不会把 R 顶出去） */
    r = Math.min(rCap, isFinite(dmin) ? rGap * dmin : rCap);
    R = Math.min(R, Math.max(0.05, L - r));
    if (mode === 'ring')      dmin = (n < 2) ? Infinity : R * 2 * Math.sin(PI / n);
    else if (n <= 1 && kAuto) dmin = (T >= 2) ? TAU * k * R : Infinity;
    else                      dmin = (T * n < 2) ? Infinity : R * dOverR(n, k, T);

    return {
      R: R, r: r, k: k, rCap: rCap, dmin: dmin, dminTarget: dminTarget,
      turns: T, n: n, mode: mode, noFit: (mode === 'ring' && n < 2) || (mode === 'spring' && T * n < 2)
    };
  }

  /* ------------------------------------------------------------
     ⑤ 位移场：多质量**叠加**
     ------------------------------------------------------------
     单质量（本页原有）在极坐标下写 R(r) = r − ρc²r/(r²+c²)，展开就是向量式
            X' = X − g·(X − m)/(|X−m|² + c²)          g = ρc²
     （把 R/r 乘回方向向量就是了，没有任何近似 —— 连「中心折叠」(R′<0) 都一致）。
     既然是「每个质量各自往 X 上加一个向量」，多质量只有一种自洽写法：**把向量加起来**
            X' = X − g·Σ_i (X − m_i)/(|X − m_i|² + c²)
     远场里 Σ 退化成多极展开；对称环的**环平面内**横向分量精确两两对消
     （环平面内外都不对消的是轴向分量，它按球数累加）。

     ---- 1.1.0 修正：这是两条**真 bug**，不是「运算太复杂而放弃」 ----
     [A] 方向开关过去「读进来就扔」：`var sg = num(o.sign,1)` 赋了值却从没乘进 g，
         g = str·share ⇒ 「向内收拢 / 向外撑开」算出来是**同一个场**。
         现在 g0 = str·share·sign，符号真正生效。
     [B] 过去用「总和固定」口径 share = 1/M，再叠一层**逐点 tanh 钳制**。
         后果：位移场退化成近乎刚体平移 —— 实测 49 球弹簧「每格弯折」均/最大 = 0.999
         （原图单球是 0.61），色标也被压平，所以肉眼看「网格完全没畸变」。
         现在改成**诚实的叠加律 + 一次全局标定**：
             ① 先只累加 Σ d/s²、Σ 1/s²、Σ 2ddᵀ/s⁴ —— 这些**与 g 无关**（位移对 g 严格线性）；
             ② 再求一个**全局**增益 s，使全网峰值 |D| = peak1·gainK；
             ③ 最后 g = g0·s 写位移与雅可比。
         逐点钳制整个删掉：它没有物理依据，只会抹平对比度。
     M = 1 时恒有 s = 1 ⇒ 与原页**逐位**一致（位移与色标都不动）。
     ------------------------------------------------------------ */
  function warp(base, nP, mass, M, o, posOut, detOut) {
    var c = Math.max(1e-6, num(o.c, 1));
    var sg = num(o.sign, 1);
    var str = num(o.str, 1);
    var share = num(o.share, 1);
    var g0 = str * share * sg;                    /* ★ sign 必须乘进 g */
    var peak1 = str / (2 * c);                    /* 单球物理峰值 |D|max = ρc/2 = str/(2c) */
    var auto = (o.gain === 'auto');
    var gainK = num(o.gainK, 1);
    var p, i, k10;

    /* —— 第一遍：与 g 无关的累加量（10 个数存一排，第二遍不再碰 mass） ——
       ★ 缓存 + Float64：既避免每帧新开一块大数组（nP×10 最大约 88 万个数），
         又让 Σ 的精度是双精度 —— 全局增益是从这里来的，别让它被 float32 抹掉 1e-7。 */
    if (!_SCRATCH || _SCRATCH.length < nP * 10) _SCRATCH = new Float64Array(nP * 10);
    var S = _SCRATCH;                             /* sx,sy,sz | A,Bxx,Bxy,Bxz,Byy,Byz,Bzz */
    var maxS = 0;
    for (p = 0; p < nP; p++) {
      var px = base[3 * p], py = base[3 * p + 1], pz = base[3 * p + 2];
      var sx = 0, sy = 0, sz = 0, A = 0;
      var Bxx = 0, Bxy = 0, Bxz = 0, Byy = 0, Byz = 0, Bzz = 0;
      for (i = 0; i < M; i++) {
        var ax = px - mass[3 * i], ay = py - mass[3 * i + 1], az = pz - mass[3 * i + 2];
        var ds = ax * ax + ay * ay + az * az + c * c;
        var inv = 1 / ds, q = 2 * inv * inv;
        sx += ax * inv; sy += ay * inv; sz += az * inv;
        A += inv;
        Bxx += q * ax * ax; Bxy += q * ax * ay; Bxz += q * ax * az;
        Byy += q * ay * ay; Byz += q * ay * az; Bzz += q * az * az;
      }
      k10 = 10 * p;
      S[k10] = sx; S[k10 + 1] = sy; S[k10 + 2] = sz; S[k10 + 3] = A;
      S[k10 + 4] = Bxx; S[k10 + 5] = Bxy; S[k10 + 6] = Bxz;
      S[k10 + 7] = Byy; S[k10 + 8] = Byz; S[k10 + 9] = Bzz;
      var sm = Math.sqrt(sx * sx + sy * sy + sz * sz);
      if (sm > maxS) maxS = sm;
    }

    /* —— 一次全局标定：rawMaxD 与 g 成正比，所以标定只需一个乘数 —— */
    var rawMaxD = Math.abs(g0) * maxS;
    var gain = (auto && M > 1 && rawMaxD > 1e-12) ? (peak1 * gainK) / rawMaxD : 1;
    var g = g0 * gain;

    /* —— 第二遍：写位移与雅可比 —— */
    var maxD = 0, maxRaw = 0, detMin = 1e30, detMax = -1e30;
    for (p = 0; p < nP; p++) {
      k10 = 10 * p;
      var qx = base[3 * p], qy = base[3 * p + 1], qz = base[3 * p + 2];
      var Dx = -g * S[k10], Dy = -g * S[k10 + 1], Dz = -g * S[k10 + 2];
      var am = Math.sqrt(Dx * Dx + Dy * Dy + Dz * Dz);
      if (am > maxD) maxD = am;
      posOut[3 * p] = qx + Dx; posOut[3 * p + 1] = qy + Dy; posOut[3 * p + 2] = qz + Dz;

      /* 雅可比：J = ∂X'/∂X = (1 − gA)·I + g·B      （★ 单位矩阵那项只在**对角线**上）
         单质量时 det J ≡ (R/r)²·R′，与原页色标定义**逐位**相同（已用有限差分核过）。 */
      var lam = 1 - g * S[k10 + 3];
      var Bxx2 = S[k10 + 4], Bxy2 = S[k10 + 5], Bxz2 = S[k10 + 6];
      var Byy2 = S[k10 + 7], Byz2 = S[k10 + 8], Bzz2 = S[k10 + 9];
      var m11 = lam + g * Bxx2, m12 = g * Bxy2, m13 = g * Bxz2;
      var m22 = lam + g * Byy2, m23 = g * Byz2, m33 = lam + g * Bzz2;
      var det = m11 * (m22 * m33 - m23 * m23)
              - m12 * (m12 * m33 - m23 * m13)
              + m13 * (m12 * m23 - m22 * m13);
      detOut[p] = det;
      if (det < detMin) detMin = det;
      if (det > detMax) detMax = det;
      var raw = Math.abs(1 - det);
      if (raw > maxRaw) maxRaw = raw;
    }
    return { maxD: maxD, rawMaxD: rawMaxD, gain: gain, peak1: peak1,
             maxRaw: maxRaw, detMin: detMin, detMax: detMax, nP: nP, M: M };
  }

  /* 绕竖直轴（three 的 Y）旋转 —— 与 three 的 rotation.y 同一套符号：
     rotation.y = θ 把方位角 φ 变成 φ − θ。 */
  function rotY(src, dst, M, th) {
    var cs = Math.cos(th), sn = Math.sin(th);
    for (var i = 0; i < M; i++) {
      var x = src[3 * i], z = src[3 * i + 2];
      dst[3 * i] = x * cs + z * sn;
      dst[3 * i + 1] = src[3 * i + 1];
      dst[3 * i + 2] = -x * sn + z * cs;
    }
    return dst;
  }

  root.AnuCoil = {
    version: '1.1.1',
    kUniform: kUniform,
    dminCoef: dminCoef,
    dOverR: dOverR,
    neighbours: neighbours,
    place: place,
    helixUV: helixUV,
    solveFit: solveFit,
    warp: warp,
    rotY: rotY,
    DIST_GAP: 0.40,
    FIT_K: 0.98,
    R_CAP_FRAC: 0.34
  };
})(typeof window !== 'undefined' ? window : this);
