/* ============================================================
   warp-opt.js — 曲速壳「形状 → 负能量兑现率 → 推力评分」自动寻优
   version 1.0.0
   ------------------------------------------------------------
   §2 原来的研究不够在哪（老师 2026-10-12 提出）：
     §2 只论证了 ρ ∝ −sin²θ·(df/dr)² ⇒ 负能量聚在赤道腰带；
     §7 给了两个对照体（蛋形环面 / 直锥体）。但两者从未进入**任何量化比较**：
       · 这条母线到底接住了 §1 要求的负能量的百分之几？
       · 换一条母线，同样的制造面积 / 同样的围出体积，能不能接住更多？
       · 有没有比 §7 给的两条都更好的母线？最优解到底是哪一条？
     本模块把这三个问题变成一次**可复算**的数值寻优，而不是再加一段论述。

   ---- 三个量（ρ 与 |M| 由本模块给出，页面直接引用 ⇒ 全项目只有一份公式）----
     E_need  = 这幅度规**总共需要**的负能量 ≡ |M_warp|（§1 的 (1/36)v²R²/Δ 就是它）
     E_shell = 这条母线做成的壳**真的接住**的负能量（对壳体做体积分）
     κ       = E_shell / E_need ∈ [0,1]   ← 「兑现率」：泡能真转起来的比例
     A       = 壳的侧面积（母线旋转面）＝制造代价的量纲（材料体积 = A·Δ）
     V_in    = 壳**围出**的空间（Pappus）＝飞船能待的地方
     Φ = κ / (A/R²)                      ← **推力评分**：单位制造面积能兑现的推力份额

   ---- 三个硬哨兵（测试直接查；模块自带可自证，不靠外部对照）----
     ① **球壳的 κ 必须等于「一维径向积分比」κ_ceil**（两条完全独立的代码路径：
        二维壳面积分 vs 一维径向积分）。这条在查「几何体积元 / 雅可比对不对」。
     ② 球壳的 E_need/(v²R²/Δ) ⇒ 1/36（薄壁极限 R/Δ ≥ 6），即 §1 的定律。
     ③ 围出体积：球 → (4/3)πR³、锥 → πh(r²+rr'+r'²)/3（解析式，误差 < 1e-5）。

   ★★ 球壳接住的是 0.6438326526，不是 1 —— 这不是 bug，是物理，写清楚免得后人再查一遍：
       (df/dr)² ∝ sech⁴u（u = (r−R)/Δ），而 sech⁴ 的有效宽度是 **4Δ/3**，比壳厚 Δ 还宽。
       于是厚度 Δ 的壳只装得进 sech⁴ 峰的中段：
         κ_ceil = ∫_{−1/2}^{1/2} sech⁴u du / ∫_ℝ sech⁴u du
                = (tanh½ − tanh³½/3)·2 / (4/3) = 0.6438326526
       ★ 这个数曾被误写成 0.6438530（数字换了位），是「散文里的常数没人复算」的典型；
         现在闭式与独立高精度数值积分（∫sech⁴ 直接积到 ±60）一致到 1e-10，两个来源互查。
       kappaCeil() 的数值收敛也印证：R/Δ=30 → −0.028%、100 → −0.0025%、1000 → −2e-5 %。
       ★★ 适用边界（别把「天花板」三个字说满）：κ_ceil 是「径向带宽 = Δ、覆盖全部立体角」
          这一类形状的上限。R/Δ ≥ 10 时五个候选族没有一个超过它（实测最大 fill = 1.000）；
          但 R/Δ ≲ 4 时前提垮掉 —— 实测 R/Δ = 2 时超椭球到 fill = 1.027、蛋形 1.003，
          它们用**更宽的径向带**把 sech⁴ 的尾巴也啃下来了。所以：**κ 本身没有普适上限，
          有意义的评分是 Φ = κ/(A/R²)** —— 多接住的那些得拿更多材料换。
       ⇒ 「厚度 Δ、覆盖全部立体角的壳最多接住 64% 的负能量」；要全接住得把壳做到 ~4Δ 厚，
         材料代价 4 倍 —— **没有免费午餐**。§4 的量子不等式把 Δ 钉在普朗克尺度，
         这条上限就跟着一起致命。

   ---- 体积元（第二版修正，别再用旧式）----
     管参数化 (s, τ, φ)：X = (ρ̃+τn_r)cosφ，Y = (ρ̃+τn_r)sinφ，Z = z+τn_z。
     雅可比 = (ρ̃+τn_r)·|1 + τ·κ_s|，κ_s = 子午线**带符号曲率** dψ/ds。
     ★ 漏掉 |1+τκ_s| 会让内凹侧（蛋形腰带内侧、颈族收细处）整段算错；
       球壳上它只有 0.5% 量级 —— 「小到看不出来、却一定要有」的那类因子。
     ★ τ 方向必须 4 点 Gauss（不是 2 点）：被积函数含 sech⁴，在 ±Δ/2 区间上
       2 点 Gauss 会低估 1.2%（实测 κ 差 8e-3），4 点 Gaus 差 < 1e-5。

   ---- 口径约定（关键，勿改）----
     · 一切几何都归一化到「**腰半径（ρ̃ 最大处）落在 z = 0，且 ρ̃_max = R**」。
       这正是页面的「赤道对齐」：Alcubierre 的 |ρ| 最强环就在 (ρ̃=R, z=0)，
       母线不这样摆就根本不是同一个泡，比较无意义。
     · 方位角方向**不采样**：ρ 只依赖 (ρ̃, z)，∫dφ = 2π。
       省掉这一维，整条积分快 24 倍，寻优才跑得进浏览器。
     · 壳 = 母线扫出的**管**，管径 = 壁厚 Δ，与 §1 的 Δ 是同一个量（公平）。
     · v 只以 v² 出现在分子分母 ⇒ **κ 与 v 无关**，只依赖 R/Δ。Φ 同。
   ============================================================ */
(function (g) {
  'use strict';

  var PI = Math.PI, TAU = 2 * PI;
  function num(v, d) { v = +v; return isFinite(v) ? v : d; }

  /* ============================================================
     ① Alcubierre 的 ρ 与总能量 —— 全项目唯一来源
        （页面 02_warp_bubble_scanner.html 里那四个同名函数已改为转发到这里）
     ============================================================ */
  function sech2(x) { var e = Math.exp(-2 * Math.abs(x)); var d = 1 + e; return 4 * e / (d * d); }
  function shape(r, Rr, s) { return (Math.tanh(s * (r + Rr)) - Math.tanh(s * (r - Rr))) / (2 * Math.tanh(s * Rr)); }
  function dshape(r, Rr, s) { return s * (sech2(s * (r + Rr)) - sech2(s * (r - Rr))) / (2 * Math.tanh(s * Rr)); }

  /* ρ(ρ̃, z) 的角向因子：sin²θ = ρ̃²/r²，r 从**泡心（原点）**量起 */
  function rhoMag(rt, z, Rr, s, v) {
    var r = Math.sqrt(rt * rt + z * z);
    if (r < 1e-9) return 0;
    var d = dshape(r, Rr, s);
    return (v * v / (32 * PI)) * (rt * rt / (r * r)) * d * d;
  }

  /* 体积积分量词 M_warp = −(v²/12)∫(df/dr)² r² dr
     变量替换 u = s(r−R)：把采样自动聚焦到壁内（宽度 ~1），避免薄壁时欠采样。
     s(r+R) = 2sR + u，s(r−R) = u，dr = du/s。 */
  function mWarp(v, Rr, s) {
    var uLo = Math.max(-40, -s * Rr), uHi = 30;
    var span = uHi - uLo;
    var N = Math.max(2400, Math.ceil(140 * span));
    var h = span / N;
    var t2R = 2 * s * Rr;
    var denom = 2 * Math.tanh(s * Rr);
    var sum = 0;
    for (var i = 0; i <= N; i++) {
      var u = uLo + i * h;
      var D = s * (sech2(t2R + u) - sech2(u)) / denom;
      var r = Rr + u / s;
      var y = D * D * r * r;
      var w = (i === 0 || i === N) ? 1 : (i % 2 ? 4 : 2);
      sum += w * y;
    }
    return -(v * v / 12) * (h / 3) * sum / s;
  }

  /* 天花板 κ_ceil：**一维**径向积分比，与二维壳面积分完全独立。
       分子 = ∫_{R−Δ/2}^{R+Δ/2} (df/dr)² r² dr      分母 = ∫_0^∞ (df/dr)² r² dr
     球壳是唯一覆盖全部立体角的形状 ⇒ 它的 κ 必然等于这个比值。
     ★ 分子区间端点必须**对齐网格**，否则掩膜边界只有 O(h) 精度（第一版差 5e-4）。 */
  function kappaCeil(R, D) {
    R = num(R, 1); D = num(D, 1);
    var s = 1 / D;
    var uLo = Math.max(-40, -s * R), uHi = 30, span = uHi - uLo;
    var N = Math.max(40000, Math.ceil(1200 * span));
    var h = span / N, t2R = 2 * s * R, denom = 2 * Math.tanh(s * R);
    var half = 0.5 * s * D;                 /* τ ∈ ±Δ/2 ⇔ u ∈ ±1/2 */
    var fn = function (u) {
      var Dd = s * (sech2(t2R + u) - sech2(u)) / denom;
      var r = R + u / s;
      return Dd * Dd * r * r;
    };
    var simpson = function (a, b, n) {
      n = n + (n % 2); h = (b - a) / n;
      var sm = fn(a) + fn(b);
      for (var i = 1; i < n; i++) sm += (i % 2 ? 4 : 2) * fn(a + i * h);
      return sm * h / 3;
    };
    var den = simpson(uLo, uHi, N);
    var nIn = Math.max(4000, Math.round(N * (2 * half) / span));
    var num_ = simpson(-half, half, nIn + (nIn % 2));
    return (den > 0) ? num_ / den : 0;
  }

  /* ============================================================
     ② 五个候选母线族
        每个族的 build(params, R, o) 返回 { pts:[{r,z}...], closed, tag }
          pts    归一化后的母线点（腰已在 z = 0、ρ̃_max = R）
          closed true ⇒ 闭合环（蛋形环面），false ⇒ 开口（锥 / 颈 / 椭球）
     ============================================================ */

  /* F0 球壳（Alcubierre 原形）：母线 = 半径 R 的半圆，从南极到北极。
     它是 κ 上限的基准，也是「不优化会怎样」的参照。无形状自由度。
     ★★ 签名必须是 (R, p, o) —— 与其余四个族一致！族派发走 build(fam,params,R,o)
        → fam.build(R, params, o)，所以第 2 位永远是 params。
        这里曾写成 (R, o)：经族派发时 o 落到第 2 位、被 param 顶掉，
        o.n 读不到 ⇒ 球壳静默退回 n = 96（κ 偏 −3.2e-4，是 n = 200 时的 5 倍），
        而**直调** profileSphere(R, {n:200}) 又是对的 ⇒ 两条路径口径不一致。
        「参数被悄悄忽略」比报错更难查，opt_test.js 的 A15 就是为此立的。 */
  function profileSphere(R, p, o) {
    o = o || {};
    var n = o.n || 96, pts = [];
    for (var i = 0; i <= n; i++) {
      var a = -PI / 2 + PI * i / n;          /* (0,−R) → (R,0) → (0,+R) */
      pts.push({ r: R * Math.cos(a), z: R * Math.sin(a) });
    }
    return { pts: pts, closed: false, tag: '球壳' };
  }

  /* F1 单锥 / 直台锥（§7 的直锥体原样）：母线 = 一条直线，底在腰上、单向收到顶。
       (R, 0) → (rTop·R, h·R)。h 用来命中约束。 */
  function profileCone(R, p, o) {
    o = o || {};
    var h = num(p.hFrac, 1), rt = num(p.rTopNorm, 0);
    var n = o.n || 48, pts = [];
    for (var i = 0; i <= n; i++) {
      var t = i / n;
      pts.push({ r: R * (1 + (rt - 1) * t), z: R * h * t });
    }
    return { pts: pts, closed: false, tag: '单锥' };
  }

  /* F2 超椭球族：ρ̃(ζ) = R·(1 − |2ζ−1|^p)^(1/q)，z = (2ζ−1)·h·R。
       ★ 这个族是特意选的：它**同时含球壳与双锥**
         p = q = 2 ⇒ 半圆 ⇒ 球壳（h = 1 时正好是 Alcubierre 原形）
         p = q = 1 ⇒ 两条直线 ⇒ 双锥（沙漏）
         p,q 变大 ⇒ 药丸（pillbox）
       所以「最优解是球壳」这句话在本族里是**被搜出来的**，不是我点上去的。 */
  function profileEllip(R, p, o) {
    o = o || {};
    var h = num(p.hFrac, 1), pp = Math.max(1, num(p.pow, 2)), qq = Math.max(0.6, num(p.q, 2));
    var n = o.n || 72, pts = [];
    for (var i = 0; i <= n; i++) {
      var zeta = i / n, zz = Math.abs(2 * zeta - 1);
      var rr = Math.pow(Math.max(0, 1 - Math.pow(zz, pp)), 1 / qq);
      pts.push({ r: R * rr, z: R * h * (2 * zeta - 1) });
    }
    return { pts: pts, closed: false, tag: '超椭球' };
  }

  /* F3 幂律颈族（Van den Broeck 式「细颈 + 两个胖端」）：
       ρ̃(ζ)/R = 1 + (B−1)·|2ζ−1|^n，z = (2ζ−1)·h·R
       B = 1 ⇒ 直圆柱（h 小 ⇒ **赤道细带**，这就是 §2 直觉的极限）
       B > 1 ⇒ 两端鼓出、腰上收细（n 越大越像哑铃）
     ★ 这个族是必需的对照物：文献里省数量级的做法（把壁挪到细颈上）得有东西代表，
       否则「蛋形 / 直锥哪个好」只是二选一，说不出「还能更好 / 其实更差」。 */
  function profileNeck(R, p, o) {
    o = o || {};
    var h = num(p.hFrac, 0.5), B = Math.max(1, num(p.bulge, 1)), nq = Math.max(1, num(p.sharp, 4));
    var n = o.n || 72, pts = [];
    for (var i = 0; i <= n; i++) {
      var zeta = i / n, zz = 2 * zeta - 1;
      pts.push({ r: R * (1 + (B - 1) * Math.pow(Math.abs(zz), nq)), z: R * h * zz });
    }
    return { pts: pts, closed: false, tag: '幂律颈' };
  }

  /* F4 蛋形环面（§7 的 anu 最简参数方程，d = 0 的闭合母线绕 z 旋转）。
     需要外部提供 AnuRevolve（页面传入；Node 里 require 亦可）——
     那条曲线是本项目**已有的唯一来源**，不许在这里再抄一遍。
     k 是纯径向缩放 ⇒ 由 ρ̃_max = R 反解；整条母线再绕腰点**等比例**缩放，
     所以形状（宽高比）不变、只是尺寸归一。 */
  function profileEgg(R, p, o) {
    o = o || {};
    var AR = o.AnuRevolve;
    if (!AR) return null;
    var P = { a: num(p.a, 3), b: Math.max(1.02, num(p.b, 2.76)), c: num(p.c, -0.92), k: 1, d: 0 };
    var M = AR.meridian(P, o.n || 200);
    var rMax = -Infinity, zW = 0, i;
    for (i = 0; i <= M.n; i++) if (M.r[i] > rMax) { rMax = M.r[i]; zW = M.z[i]; }
    if (!(rMax > 1e-9)) return null;
    var lam = R / rMax, pts = [];
    for (i = 0; i <= M.n; i++) pts.push({ r: M.r[i] * lam, z: (M.z[i] - zW) * lam });
    return { pts: pts, closed: true, tag: '蛋形环面' };
  }

  /* ============================================================
     ②b |ρ| 的**等值线**（精确扫掠，不用 marching squares）
     ------------------------------------------------------------
     ρ(ρ̃,z) 是**可分离**的：
        ρ = (v²/32π)·sin²θ·D(r)²,   r = √(ρ̃²+z²),   sin²θ = ρ̃²/r²
     而 D(r) = dshape(r,1,s) **只依赖 r**（rhoMag 用的就是这个式子）。
     ⇒ 等值线 {ρ = L} ⇔ sin²θ = L/(K·D(r)²)，K = v²/32π。
       沿 r 从峰值两侧扫一遍、逐点反解 θ，即得整条等值线（上下两条弧）。
     为什么不用 marching squares：它在 R/Δ = 100 时要网格密到 Δ 的十分之一
     才能把这条 1Δ 宽的脊画对，代价比这个精确解大两个数量级，还更糙。
     o.fracs：相对峰值 ρ_max = K·D(R)² 的比例数组，如 [0.5, 0.1, 0.01]。
     返回 [{ f, up:[{r,z}], dn:[...], trunc }]。
       · up/dn 首尾都在赤道上（sinθ = 1，端点由二分求出，不是网格点上取一个）
       · 端点附近按 z 等距**加密**过 —— 不加密折线会变成斜穿窗口的长弦（见下）
       · trunc = true 表示这一级在采样区间里还没闭合（span 给窄了）
     ============================================================ */
  function rhoContour(s, v, o) {
    o = o || {};
    s = num(s, 100); v = num(v, 1);
    var fracs = o.fracs || [0.5, 0.1, 0.01];
    var K = v * v / (32 * PI);
    var NL = o.n || 4000, RA = 1 - num(o.span, 0.4), RB = 1 + num(o.span, 0.4);
    var rs = new Float64Array(NL + 1), d2 = new Float64Array(NL + 1);
    var best = 0, bi = 0, i, r, d, y;
    for (i = 0; i <= NL; i++) {
      r = RA + (RB - RA) * i / NL; d = dshape(r, 1, s); y = d * d;
      rs[i] = r; d2[i] = y; if (y > best) { best = y; bi = i; }
    }
    if (!(best > 0)) return [];

    return fracs.map(function (f) {
      var need = f * best;                    /* 需要的 D² 阈值（等价于 |ρ|·K 之比） */

      /* ★ 端点的精确求法（这一行曾经是错的）：不能拿"第一个还在带内的网格点"
         当端点 —— 那个点满足 D² ≥ need 但一般 **严格大于**，于是 s2 = need/D² < 1、
         ct = √(1−s2) > 0，画出来两端就悬空在赤道上方。实测偏差 1.1e-1（A16 抓到）。
         真正的端点在赤道上：那里 D² = need **恰好**成立（sin²θ = 1）。
         所以对 g(r) = dshape(r,1,s)² − need 做二分，把端点钉到 g = 0 上。
         g 在 r = R 两侧各有一个单根（左升右降），各自半格区间内必定异号。
         ★ rootGA 必须定义在这里：need 是 var 作用在本回调里的，放外层就成 undefined。 */
      function rootGA(ra, rb) {                /* 要求 g(ra)、g(rb) 异号 */
        var ga = dshape(ra, 1, s); ga = (ga * ga - need <= 0);
        for (var k = 0; k < 80; k++) {
          var rm = 0.5 * (ra + rb), d = dshape(rm, 1, s);
          if ((d * d - need <= 0) === ga) ra = rm; else rb = rm;
        }
        return 0.5 * (ra + rb);
      }

      var il = bi, ir = bi;
      while (il > 0 && d2[il - 1] >= need) il--;
      while (ir < NL && d2[ir + 1] >= need) ir++;

      /* 把一个网格下标化成等值线上的点 (r, z)：极径 = rs[i]，
         r = rs[i]·sinθ、z = rs[i]·cosθ，而 sin²θ = need/D²。
         ★ 字段名必须是 r/z —— 第一版这里写的是 rt，push() 读的却是 q.r，
           于是网格点的 r 全变成 undefined，A16 直接出 NaN、A18 静默漏测。
           同一份数据在两个函数里用两个名字，是最容易被"看起来正常"掩盖的错。 */
      function sample(k) {
        var rr = rs[k], Dk = Math.sqrt(d2[k]);
        var s2 = (Dk > 1e-300) ? need / (Dk * Dk) : 1;
        if (s2 > 1) s2 = 1;
        return { r: rr * Math.sqrt(s2), z: rr * Math.sqrt(Math.max(0, 1 - s2)) };
      }

      /* ★ 端点附近的**加密**（这是第二版才补上的，不补就画成"扇面"）：
         等值线在赤道附近是**竖直**的 —— z ∝ √(r−rE)，而 |D|² 在带沿附近变化极慢，
         于是"第一个还在带内的网格点"已经跑到 dz ≈ 28Δ 去了（网格在 r 上才走 0.02Δ）。
         只连端点与那个点，画出来就是从 (±|d|, 0) 斜穿整个窗口的一条长弦：
         实测 f = 1e-5 那条在 dz = 6Δ 处落在 dx = 2.68，而真曲线在 dx = 3.389（只偏 0.18Δ）。
         所以按 z 等距补点，每个目标 z 用二分反解 r 使 (1 − z²/r²)·D(r)² = need。
         zStep = 0.5Δ、每端最多 60 点：±6Δ 的放大窗只用 12 点就够，
         而且 R/Δ 很小时第一个网格点的 z 本身就小，M 自动趋近 0，不会白算。
         ★ Δ 在归一（R = 1）坐标里就是 1/s；别在这里用页面的 dtil。 */
      function refine(rA, zA, rB, zB, sink) {   /* sink 是**回调**：up/dn 要成对镜像 */
        var dz = zB - zA;
        if (!(Math.abs(dz) > 0)) return;
        var M = Math.floor(Math.abs(dz) / (0.5 / s)), k;
        if (M > 60) M = 60;
        for (k = 1; k <= M; k++) {
          var zt = zA + dz * k / (M + 1);
          var lo = rA, hi = rB;
          var dd0 = dshape(lo, 1, s);
          var gLo = (1 - zt * zt / (lo * lo)) * dd0 * dd0 - need;
          for (var it = 0; it < 60; it++) {          /* h(r) = (1 − z²/r²)D² − need */
            var rm = 0.5 * (lo + hi), ddm = dshape(rm, 1, s);
            var hm = (1 - zt * zt / (rm * rm)) * ddm * ddm - need;
            if ((hm <= 0) === (gLo <= 0)) { lo = rm; gLo = hm; } else hi = rm;
          }
          var rr = 0.5 * (lo + hi);
          sink({ r: Math.sqrt(Math.max(0, rr * rr - zt * zt)), z: zt });
        }
      }

      var up = [], dn = [];
      function push(q) { up.push({ r: q.r, z: q.z }); dn.push({ r: q.r, z: -q.z }); }
      /* 若带碰到采样边界，说明这一级还没闭合，就按截断处收尾并打 trunc 标记 */
      var rL, rR, trunc = false, sF = sample(il), sL = sample(ir);
      if (il > 0) { rL = rootGA(rs[il - 1], rs[il]); push({ r: rL, z: 0 }); }
      else { rL = rs[0]; trunc = true; }
      refine(rL, 0, rs[il], sF.z, push);          /* 左端 → 第一个网格点（z 递增） */
      for (i = il; i <= ir; i++) push(sample(i)); /* 带内网格点 */
      if (ir < NL) {
        rR = rootGA(rs[ir], rs[ir + 1]);
        refine(rs[ir], sL.z, rR, 0, push);        /* 最后一个网格点 → 右端（z 递减） */
      } else { rR = rs[NL]; trunc = true; }
      push({ r: rR, z: 0 });                      /* 收在赤道上（trunc 时就是边界点） */
      return { f: f, up: up, dn: dn, trunc: trunc };
    });
  }
  /* ρ 的峰值（归一坐标里固定在 (ρ̃,z) = (1,0)：D 的极大点在 r = R，角向因子在赤道取 1）*/
  function rhoPeak(s, v) { var d = dshape(1, 1, num(s, 100)); return (num(v, 1) * num(v, 1) / (32 * PI)) * d * d; }

  /* 线段对矩形裁剪（Liang–Barsky）：放大窗里只保留落在窗内的那截母线 */
  function clipSeg(x0, y0, x1, y1, xa, xb, ya, yb) {
    var t0 = 0, t1 = 1, dx = x1 - x0, dy = y1 - y0;
    var P = [-dx, dx, -dy, dy], Q = [x0 - xa, xb - x0, y0 - ya, yb - y0];
    for (var i = 0; i < 4; i++) {
      if (Math.abs(P[i]) < 1e-15) { if (Q[i] < 0) return null; continue; }
      var t = Q[i] / P[i];
      if (P[i] < 0) { if (t > t1) return null; if (t > t0) t0 = t; }
      else          { if (t < t0) return null; if (t < t1) t1 = t; }
    }
    return { x0: x0 + dx * t0, y0: y0 + dy * t0, x1: x0 + dx * t1, y1: y0 + dy * t1 };
  }

  /* ============================================================
     ③ 壳的统计量：面积 A、围出体积 V_in、接住的负能量 E_shell
     ============================================================ */
  function shellArea(prof) {
    var pts = prof.pts, np = pts.length, segs = prof.closed ? np : np - 1, A = 0;
    for (var i = 0; i < segs; i++) {
      var p0 = pts[i], p1 = pts[(i + 1) % np];
      A += TAU * 0.5 * (p0.r + p1.r) * Math.hypot(p1.r - p0.r, p1.z - p0.z);
    }
    return A;
  }

  /* 围出体积（Pappus）：区域 = 母线与**轴**之间围的那块，绕 z 旋转。
     闭合母线（蛋形环，不跨轴）：区域就是环线内部，直接鞋带公式。
     开口母线：沿轴补一段回路 (r_end,z_end)→(0,z_end)→(0,z_start)→(r_start,z_start)。
     ★ 用同一段鞋带代码，是为了让「球 = (4/3)πR³」「锥 = πh(r²+rr'+r'²)/3」
       这两个解析值自动落出来（测试拿它们当哨兵）。 */
  function shellVolume(prof) {
    var pts = prof.pts.slice();
    if (!prof.closed) {
      var first = pts[0], last = pts[pts.length - 1];
      pts.push({ r: 0, z: last.z }, { r: 0, z: first.z });
    }
    var A2 = 0, cr = 0, n = pts.length;
    for (var i = 0; i < n; i++) {
      var q0 = pts[i], q1 = pts[(i + 1) % n];
      var d = q0.r * q1.z - q1.r * q0.z;
      A2 += d; cr += (q0.r + q1.r) * d;
    }
    A2 *= 0.5;
    if (Math.abs(A2) < 1e-15) return 0;
    var rc = cr / (6 * A2);
    return Math.abs(TAU * A2 * rc);
  }

  /* 子午线的**带符号曲率** κ_s = dψ/ds（ψ = 切线方位角，沿弧长 s）。
     开口母线两端用单侧差分；闭合母线绕一圈取邻。锥的母线是直线 ⇒ 全为 0 ✓。
     角度必须先解缠，否则跨 ±π 的段会出现假尖峰。 */
  function meridianCurv(pts, closed) {
    var np = pts.length, n = closed ? np : np - 1, i;
    var psi = new Float64Array(n), ds = new Float64Array(n);
    for (i = 0; i < n; i++) {
      var p0 = pts[i], p1 = pts[(i + 1) % np];
      var dr = p1.r - p0.r, dz = p1.z - p0.z, L = Math.hypot(dr, dz);
      ds[i] = L;
      psi[i] = (L > 1e-15) ? Math.atan2(dz / L, dr / L) : NaN;
    }
    for (i = 1; i < n; i++) {
      if (!isFinite(psi[i]) || !isFinite(psi[i - 1])) continue;
      while (psi[i] - psi[i - 1] > PI) psi[i] -= TAU;
      while (psi[i] - psi[i - 1] < -PI) psi[i] += TAU;
    }
    var k = new Float64Array(n);
    for (i = 0; i < n; i++) {
      if (!closed) {
        var a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1), dsp = 0;
        for (var q = a; q < b; q++) dsp += ds[q];
        k[i] = (dsp > 1e-15 && isFinite(psi[a]) && isFinite(psi[b])) ? (psi[b] - psi[a]) / dsp : 0;
      } else {
        var ia = (i - 1 + n) % n, ib = (i + 1) % n;
        var dsc = 0.5 * ds[i] + 0.5 * ds[(i + 1) % n];
        var dp = psi[ib] - psi[ia];
        while (dp > PI) dp -= TAU; while (dp < -PI) dp += TAU;
        k[i] = (dsc > 1e-15) ? dp / dsc : 0;
      }
    }
    return k;
  }

  /* 壳接住的负能量
       E_shell = ∫_壳 |ρ| dV = 2π ∬ |ρ| (ρ̃+τn_r)·|1+τκ_s| dτ ds
     ★ 方位角不采样（∫dφ = 2π）；τ 方向 4 点 Gauss（见文件头「体积元」）。 */
  var G4X = [0.3399810435848563, 0.8611363115940526];
  var G4W = [0.6521451548625461, 0.3478548451374538];
  function shellEnergy(prof, o) {
    var R = num(o.R, 1), D = num(o.D, 1), v = num(o.v, 1);
    var s = 1 / D, rho = o.rhoMag || rhoMag;
    var pts = prof.pts, np = pts.length, segs = prof.closed ? np : np - 1;
    var kc = meridianCurv(pts, prof.closed);
    var E = 0, half = 0.5 * D;
    for (var i = 0; i < segs; i++) {
      var p0 = pts[i], p1 = pts[(i + 1) % np];
      var dr = p1.r - p0.r, dz = p1.z - p0.z, L = Math.hypot(dr, dz);
      if (!(L > 1e-12)) continue;
      var tr = dr / L, tz = dz / L;
      var nr = tz, nz = -tr;                /* 法向：切线转 90° */
      var mr = 0.5 * (p0.r + p1.r), mz = 0.5 * (p0.z + p1.z);
      var ks = kc[i];
      for (var q = 0; q < 2; q++) for (var sg = -1; sg <= 1; sg += 2) {
        var tau = sg * G4X[q] * half;
        var qr = mr + tau * nr, qz = mz + tau * nz;
        if (qr <= 0) continue;              /* 越过轴的那一小片（极点附近）丢掉 */
        var jac = Math.abs(1 + tau * ks);   /* ← 第二版补上的因子 */
        E += G4W[q] * half * L * rho(qr, qz, R, s, v) * qr * jac;
      }
    }
    return TAU * E;
  }

  /* 一次算齐：A / V_in / E_shell / κ / Φ
     ★ Eneed 与 ceil 在整个寻优里是**常数**（只依赖 v/R/Δ）⇒ 由调用方预先算好传进来。
       不传的话每次都重跑一条 3000 点的 mWarp —— 寻优要跑几千次，那就是几千倍的浪费。 */
  function shellStat(prof, o) {
    o = o || {};
    var R = num(o.R, 100), D = num(o.D, 1), v = num(o.v, 1);
    var A = shellArea(prof), V = shellVolume(prof), E = shellEnergy(prof, o);
    var Eneed = (o.Eneed !== undefined) ? o.Eneed : Math.abs(mWarp(v, R, 1 / D));
    var kappa = (Eneed > 1e-300) ? (E / Eneed) : 0;
    var ceil = (o.ceil !== undefined) ? o.ceil : kappaCeil(R, D);
    return {
      A: A, V: V, E: E, Eneed: Eneed, kappa: kappa, ceil: ceil,
      fill: (ceil > 1e-12) ? kappa / ceil : 0,      /* κ/κ_ceil：把天花板的 64% 折掉 */
      aN: A / (R * R), vN: V / (R * R * R),
      phi: (A > 1e-30) ? (kappa / (A / (R * R))) : 0,
      R: R, D: D, v: v, N: prof.pts.length, closed: !!prof.closed, tag: prof.tag || ''
    };
  }

  /* ============================================================
     ④ 候选族登记表
        knob：命中约束用的那个**单调**旋钮（A 与 V_in 都随它单调增）
        free：其余可优化参数
        kRange：knob 的搜索区间
     ============================================================ */
  var FAMILIES = [
    { id: 'sphere', name: '球壳（Alcubierre 原形）', knob: null, free: {}, kRange: null,
      build: profileSphere, note: '无形状自由度；κ 的天花板基准、也几乎是两个约束下的最优解' },
    { id: 'cone', name: '单锥 / 直台锥（§7 原样）', knob: 'hFrac', kRange: [0.08, 5],
      free: { rTopNorm: { min: 0, max: 0.9 } }, build: profileCone,
      note: '母线是一条直线；只在底圆那一点碰到 r≈R 的壳层 ⇒ 接得住的极少' },
    /* ★ 参数区间必须**让特殊点落在网格上**：p=q=2 就是球壳。
       第一版取 [1,6]/N=5 ⇒ 网格 {1,2.25,3.5,4.75,6} 跳过 2，于是「搜不到球壳」，
       结果只到 78% —— 那不是物理结论，是我把答案关在网格外面了。
       现在取 [1,7]/N=7 ⇒ {1,2,3,4,5,6,7}，球壳与双锥都在网格点上，可被搜到。 */
    { id: 'ellip', name: '超椭球族（含球壳与双锥）', knob: 'hFrac', kRange: [0.06, 3], gridN: 7,
      free: { pow: { min: 1, max: 7 }, q: { min: 1, max: 7 } }, build: profileEllip,
      note: 'p=q=2 是球壳、p=q=1 是双锥 —— 最优解必须由搜索自己搜出来' },
    { id: 'neck', name: '幂律颈族（Van den Broeck 式）', knob: 'hFrac', kRange: [0.03, 2], gridN: 5,
      free: { bulge: { min: 1, max: 5 }, sharp: { min: 1, max: 9 } }, build: profileNeck,
      note: 'B=1 且 h→0 就是「赤道细带」——§2 直觉的极限状态' },
    { id: 'egg', name: '蛋形环面（§7 的 anu 母线）', knob: 'a', kRange: [0.8, 12], gridN: 9,
      free: { b: { min: 1.6, max: 5.6 }, c: { min: -1.6, max: -0.1 } }, build: profileEgg,
      note: '闭合母线 ⇒ 亏格 1，孔套在航向轴上；默认参数下面积是球壳的 2.4 倍' }
  ];

  /* ============================================================
     ⑤ 约束 + 寻优
        caseKey：
          'V'    等体积   —— 钉住壳**围出的空间** V_in（飞船要待的地方一样大）
          'A'    等表面积 —— 钉住壳的**侧面积** A（异物质用量一样多）
          'free' 自由      —— 不限
       做法：非旋钮参数走「网格 → 局部细化」，旋钮用二分反解命中约束
             （A、V_in 对旋钮都单调增，实测见 _check/_syn/optchk.js ④）。
     ============================================================ */
  function build(fam, params, R, o) { return fam.build(R, params, o); }
  function evalProfile(fam, params, R, o) {
    var prof = build(fam, params, R, o);
    if (!prof) return null;
    return { prof: prof, st: shellStat(prof, o) };
  }
  function functionalOf(st, key) { return (key === 'V') ? st.V : st.A; }

  /* 反解旋钮使约束命中：**割线法为主、二分兜底**。
     ★ 为什么不用纯二分：二分每步只砍一半，要 1e-7 相对精度得 ~24 次；
       而 A(knob)、V(knob) 都很光滑，割线法通常 5~7 次就到。
       寻优要反解上千次，这一项直接决定「点一下要等 1 秒还是 5 秒」。
     兜底：割线若跑出区间 / 出现非单调（|f| 不降）就退回二分，绝不返回错值。 */
  function solveKnob(fam, params, key, target, R, o) {
    var k = fam.knob, rg = fam.kRange;
    if (!k || !rg) return null;
    var lo = rg[0], hi = rg[1];
    function f(x) {
      var p = Object.assign({}, params); p[k] = x;
      var e = evalProfile(fam, p, R, o);
      return e ? functionalOf(e.st, key) : NaN;
    }
    var fl = f(lo), fh = f(hi);
    if (!isFinite(fl) || !isFinite(fh)) return null;
    if (target <= fl) return { x: lo, hit: target >= fl * (1 - 1e-6) };
    if (target >= fh) return { x: hi, hit: target <= fh * (1 + 1e-6) };

    var tol = 1e-8 * target;
    var x0 = lo, x1 = hi, f0 = fl - target, f1 = fh - target;
    var secantOk = true;
    for (var it = 0; it < 40; it++) {
      if (Math.abs(f1) <= tol) return { x: x1, hit: true };
      var den = f1 - f0;
      var xs = (Math.abs(den) > 1e-300) ? (x1 - f1 * (x1 - x0) / den) : NaN;
      if (!isFinite(xs) || xs <= lo || xs >= hi || !secantOk) {
        /* 退回二分 */
        secantOk = false;
        xs = 0.5 * (lo + hi);
      }
      var fs = f(xs);
      if (!isFinite(fs)) return null;
      var rr = fs - target;
      /* 维持区间：用 fs 的符号把 [lo,hi] 收窄，再更新割线两点 */
      if (rr < 0) lo = Math.max(lo, xs); else hi = Math.min(hi, xs);
      if (Math.abs(rr) <= tol) return { x: xs, hit: true };
      if (!(Math.abs(rr) < Math.abs(f1))) secantOk = false;
      x0 = x1; f0 = f1; x1 = xs; f1 = rr;
      if (hi - lo < 1e-13 * Math.max(1, Math.abs(xs))) break;
    }
    var xf = 0.5 * (lo + hi), ff = f(xf);
    return { x: xf, hit: isFinite(ff) && Math.abs(ff - target) <= 1e-3 * target };
  }

  function optimizeFamily(fam, caseKey, target, R, o) {
    o = o || {};
    var useKnob = (caseKey !== 'free') && !!fam.knob && !!fam.kRange;
    var best = null, N = fam.gridN || o.gridN || 5, rounds = o.rounds || 2;

    /* 搜索哪些参数：
         有约束  ⇒ 旋钮留着反解约束，只搜其余
         自由     ⇒ **旋钮也要搜**（★ 第一版漏了这条：自由模式下旋钮取了构造函数的
                   默认值，于是「赤道细带」这个极限根本走不到 —— 结论就假了）。
       为此把每个搜索维统一成 {min,max} 规格表，旋钮的范围取 kRange。 */
    var specs = {}, keys = [];
    Object.keys(fam.free || {}).forEach(function (k) { specs[k] = fam.free[k]; });
    if (!useKnob && fam.knob && fam.kRange) specs[fam.knob] = { min: fam.kRange[0], max: fam.kRange[1] };
    Object.keys(specs).forEach(function (k) {
      /* 维度爆炸保护：自由模式下最多 3 维、每维点数封顶 9 → 最多 729 组 */
      specs[k]._n = Math.min(N, 9);
      keys.push(k);
    });
    if (keys.length > 3) keys = keys.slice(0, 3);

    function consider(params) {
      var e = evalProfile(fam, params, R, o);
      if (!e) return null;
      if (useKnob) {
        var got = functionalOf(e.st, caseKey);
        if (!(Math.abs(got - target) <= 1e-4 * target)) return null;   /* 没命中约束 ⇒ 丢 */
      }
      if (!best || e.st.phi > best.st.phi) best = { params: Object.assign({}, params), prof: e.prof, st: e.st };
      return e;
    }

    var centers = {}, spans = {};
    keys.forEach(function (f) {
      centers[f] = 0.5 * (specs[f].min + specs[f].max);
      spans[f] = 0.5 * (specs[f].max - specs[f].min);
    });

    for (var round = 0; round < rounds; round++) {
      if (round > 0 && best) {
        keys.forEach(function (f) {
          var s2 = specs[f];
          spans[f] *= 0.5;
          var cur = (best.params[f] !== undefined) ? best.params[f] : centers[f];
          centers[f] = Math.max(s2.min, Math.min(s2.max, cur));
        });
      }
      var combos = [{}];
      keys.forEach(function (f) {
        var s2 = specs[f], c = centers[f], sp = spans[f], n = s2._n, next = [];
        for (var i = 0; i < n; i++) {
          var v = (round === 0) ? (s2.min + (s2.max - s2.min) * i / (n - 1))
                                : (c - sp + 2 * sp * i / (n - 1));
          v = Math.max(s2.min, Math.min(s2.max, v));
          /* ★ 不做步长吸附：吸附会把「恰好是球壳」的 p=q=2 挪到 2.25（第一版就栽在这）。
             参数连续性本来就比「滑块上好看的两位小数」重要。 */
          combos.forEach(function (cb) { var cp = Object.assign({}, cb); cp[f] = v; next.push(cp); });
        }
        combos = next;
      });
      combos.forEach(function (cb) {
        /* 有约束时：旋钮若恰好也在 free 里（不该发生），会被下面覆盖 —— 无害 */
        if (!useKnob) { consider(cb); return; }
        var kv = solveKnob(fam, cb, caseKey, target, R, o);
        if (!kv || !kv.hit) return;
        var p = Object.assign({}, cb); p[fam.knob] = kv.x;
        consider(p);
      });
    }
    return best;
  }

  /* 给定 case 与目标值，把所有族跑一遍并排名。
     o.n：母线采样点数。★ 精度实测（球壳 κ 对 n，R/Δ=100）：
         n=60  Δs/Δ=5.24 → 偏 −0.186%      n=200 Δs/Δ=1.57 → 偏 −0.0066%
         n=140 Δs/Δ=2.24 → 偏 −0.013%      n=400 Δs/Δ=0.79 → 偏 −0.0036%
       误差**对管分辨率 Δs/Δ 线性**（不是二次：管细于母线步长时积分是分段常数）。
       n = 2·R/Δ ⇒ Δs/Δ ≈ π/2 ≈ 1.57 ⇒ 误差 < 1e-4，够用；再往上提升很小、代价线性。
       超过 R/Δ=160 后钳到 320 点（否则高 R/Δ 下会慢到不可接受）。 */
  function optimize(caseKey, target, o) {
    o = o || {};
    var R = num(o.R, 100), D = num(o.D, 1), v = num(o.v, 1);
    var nn = o.n || Math.max(120, Math.min(320, Math.round(2 * R / D)));
    var ctx = Object.assign({}, o, {
      n: nn,
      Eneed: (o.Eneed !== undefined) ? o.Eneed : Math.abs(mWarp(v, R, 1 / D)),
      ceil: (o.ceil !== undefined) ? o.ceil : kappaCeil(R, D)
    });
    var rows = [];
    FAMILIES.forEach(function (fam) {
      var best = optimizeFamily(fam, caseKey, target, R, ctx);
      if (!best) {
        var e = evalProfile(fam, {}, R, ctx);          /* 没有旋钮 ⇒ 用唯一形状 */
        if (e) best = { params: null, prof: e.prof, st: e.st };
      }
      if (best) rows.push({ id: fam.id, name: fam.name, note: fam.note, knob: fam.knob,
                            params: best.params, st: best.st, prof: best.prof, missed: false });
      else rows.push({ id: fam.id, name: fam.name, note: fam.note, knob: fam.knob,
                       params: null, st: null, prof: null, missed: true });
    });
    rows.sort(function (a, b) {
      var pa = a.st ? a.st.phi : -Infinity, pb = b.st ? b.st.phi : -Infinity;
      return pb - pa;
    });
    return { case: caseKey, target: target, R: R, D: D, v: v, n: nn, ceil: ctx.ceil,
             Eneed: ctx.Eneed, rows: rows };
  }

  g.WarpOpt = {
    version: '1.0.0',
    sech2: sech2, shape: shape, dshape: dshape, rhoMag: rhoMag, mWarp: mWarp, kappaCeil: kappaCeil,
    profileSphere: profileSphere, profileCone: profileCone, profileEllip: profileEllip,
    profileNeck: profileNeck, profileEgg: profileEgg,
    shellArea: shellArea, shellVolume: shellVolume, shellEnergy: shellEnergy, shellStat: shellStat,
    meridianCurv: meridianCurv,
    rhoContour: rhoContour, rhoPeak: rhoPeak, clipSeg: clipSeg,
    FAMILIES: FAMILIES, optimize: optimize, optimizeFamily: optimizeFamily, solveKnob: solveKnob
  };
})(typeof window !== 'undefined' ? window : this);
