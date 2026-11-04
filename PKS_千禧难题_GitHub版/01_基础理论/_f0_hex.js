/* ==========================================================================
   ⓪ 双锥 · 斜切蛋形 —— 蛋面钢架（正六边形平铺 · 钢架连接结构）
   --------------------------------------------------------------------------
   【这一块和锥面是什么关系】
     锥面那套画的是「一张单叶双曲面 + 一个切平面 + 它们在空间里的交线」。
     交线本身是一条平面曲线 (u,t)。把这条曲线【绕它的长轴 t 旋转】，
     得到的旋转面就是一颗真正的蛋 —— 蛋面钢架铺在这个旋转面上，
     所以它不是另起炉灶，是同一个斜切结果的第二种读法。

   【六边形怎么铺 · 四步】
     ① 纬向分行：沿子午线按弧长走 M 步，步长 h(s)=h0·(R/Rmax)^q。
        q=0 是等弧长；q=1 是「行距 ∝ 该处半径」⇒ 两端自动变密。
        老师要的「靠近蛋尖或钝面的纬线要密一些」就是这一个 q，不是另加规则。
     ② 每行格数：正六边形的行距 = (√3/2)·边长 ⇒ d = h/0.866、N = 2πR/d。
        所以格子永远是「方」的，变的只是大小 —— 这就是「不要求每格一样大」的落点。
     ③ 三角剖分：相邻两行沿 θ 拉链。格数不等的地方必然长出五边形/七边形。
     ④ 对偶：每个三角面的重心是六边形的一个【顶点】；每条原边对应一条【对偶边】，
        也就是钢架的一根杆。杆的两端 = 相邻两个三角面的重心。

   【极点为什么一定是六边形的中心】
     两端各只有一个顶点（r=0，正落在轴上），它周围正好 6 个三角面；
     取对偶就是 6 条边的多边形，中心还是那个 r=0 的点。
     ⇒ z 轴上下交于尖端/钝端那一格的中心，是构造保证的，不是凑出来的。
     反过来说：第一行必须正好 6 点。所以极点附近的格子必然比赤道小、行也更密。

   【必须承认的两件事（是拓扑，不是 bug）】
     · 球面上不可能全是正六边形：Σ(6−边数) ≡ 12（欧拉示性数）。
       读数里直接报五/六/七边形数与这个和，算不平就是算错了。
     · 一条棱被两格共有 ⇒ 不可能有两个粗细，杆径取两格面积占比的平均。
     · 「按面积占比调杆径」的物理方向：大格需要更强的边 ⇒ 面积大 ⇒ 杆粗。
       反向（大格细杆）只作为 γ 取负时的行为，不设成默认。

   【为什么不用数值微分求轮廓法向】
     蛋的端点是 √ 型收尖（R ∝ √(t−t_end)），差分会在端点被压小 8 倍，
     于是「哪一行密哪一行疏」全错。这里整条链路只用【折线累积弧长】，
     端点就是折线的端点，不做任何差分。
   ========================================================================== */

var F0H_CACHE = { k: '', v: null };

/* ---- 蛋面轮廓：取闭合交线的上半枝 (t 递增, u≥0) + 累积弧长 ---- */
function f0HexProf(P) {
  var R = f0Solve(P);
  if ((P.cutSurf | 0) !== 0 || !R.nClosed) return null;
  var seg = null, i;
  for (i = 0; i < R.segs.length; i++) if (R.segs[i].closed) { seg = R.segs[i]; break; }
  if (!seg) return null;

  /* 闭合序列是 up(t 递增, u≥0) + reversed dn(t 递减, u≤0)，
     所以 u≥−1e−12 恰好取出上半枝；两端 u=0 会各来两次，下一步去重。 */
  var raw = [];
  for (i = 0; i < seg.pts.length; i++) {
    var u = seg.pts[i][0], t = seg.pts[i][1];
    if (u >= -1e-12) raw.push([t, Math.abs(u)]);
  }
  raw.sort(function (a, b) { return a[0] - b[0]; });
  var pr = [], j;
  for (i = 0; i < raw.length; i++) {
    if (pr.length && Math.abs(raw[i][0] - pr[pr.length - 1][0]) < 1e-10) continue;
    pr.push(raw[i]);
  }
  if (pr.length < 8) return null;

  var ss = [0], tot = 0;
  for (i = 1; i < pr.length; i++) {
    var dt = pr[i][0] - pr[i - 1][0], du = pr[i][1] - pr[i - 1][1];
    tot += Math.sqrt(dt * dt + du * du);
    ss.push(tot);
  }
  var umax = 0;
  for (i = 0; i < pr.length; i++) if (pr[i][1] > umax) umax = pr[i][1];
  if (!(tot > 1e-9) || !(umax > 1e-9)) return null;
  return { pr: pr, ss: ss, tot: tot, t0: pr[0][0], t1: pr[pr.length - 1][0], umax: umax };
}

/* ---- 蛋面钢架 · 建网（纯数学，不碰 THREE；build/read/prof 三处共用）---- */
function f0HexNet(P) {
  var M = Math.max(8, Math.min(60, Math.round(P.hxRow === undefined ? 26 : P.hxRow)));
  var q = Math.max(0, Math.min(1.2, (P.hxQ === undefined ? 1.0 : P.hxQ)));
  var hxR = P.hxR === undefined ? 3.2 : P.hxR;
  var hxG = Math.max(-2, Math.min(2, P.hxG === undefined ? 0.8 : P.hxG));
  /* ⚠ cutSurf 必须进 key：只按 α/z₀/M/q 缓存的话，母线从「单叶双曲面」换成
     「直圆锥」时 α、z₀ 没变 ⇒ 命中旧缓存 ⇒ 屏幕上还在画上一颗蛋的钢架，
     而读数与 badge 也跟着旧数据走（2026-11-03 探针第 E 段抓出来的）。 */
  var key = [(P.cutSurf | 0),
             (P.cutA === undefined ? 31.7175 : P.cutA),
             (P.cutZ0 === undefined ? 1.618034 : P.cutZ0), M, q, hxR, hxG].join('|');
  if (F0H_CACHE.k === key && F0H_CACHE.v) return F0H_CACHE.v;

  var pf = f0HexProf(P);
  if (!pf) return null;
  var pr = pf.pr, ss = pf.ss, Stot = pf.tot, umax = pf.umax;
  var Rf = 0.10 * umax;               /* 极点处 R→0：步长律要有个地板，否则末几步塌成 0 */

  function at(s) {
    if (s <= 0) return { t: pr[0][0], u: pr[0][1] };
    var last = pr.length - 1;
    if (s >= Stot) return { t: pr[last][0], u: pr[last][1] };
    var lo = 0, hi = last, m2;
    while (hi - lo > 1) { m2 = (lo + hi) >> 1; if (ss[m2] <= s) lo = m2; else hi = m2; }
    var f2 = (s - ss[lo]) / Math.max(1e-12, ss[hi] - ss[lo]);
    return { t: pr[lo][0] + (pr[hi][0] - pr[lo][0]) * f2,
             u: pr[lo][1] + (pr[hi][1] - pr[lo][1]) * f2 };
  }
  /* 极点那一格要是【正六边形】，它的格心在轴上、6 个顶点在第一行，
     于是「极点到第一行的高度」必须正好等于 (√3/2)·r₁（正六边形的行距公式）。
     取 u=Rf 当第一行是错的：蛋的尖端 r 长得极快，从顶点到 Rf 的弧长远小于 0.866·Rf
     ⇒ 极点格被压扁（截图上一眼就是一圈「腰带」，d/h 冲到 2.4）。
     正确做法是解弧长方程  s = (√3/2)·r(s)，两端各解一个。 */
  /* 极点到第一圈的高度 = 正六边形的【行距】= (√3/2)·d，d 是横向边长 = 2πr/6
     ⇒ 系数 = (√3/2)·(2π/6) = 0.9068996，不是 0.8660254（那个对应 d = r）。
     用 0.866 时极格宽/高 = 1.209（实测），极圈一眼偏高、像一圈腰带。 */
  var KP = 0.8660254037844386 * TAU / 6;
  function poleArc(fromEnd) {
    var N2 = 300, k3, sPrev = null, gPrev = null, s3, g3;
    for (k3 = 0; k3 <= N2; k3++) {
      s3 = fromEnd ? Stot * (1 - k3 / N2) : Stot * k3 / N2;
      var d3 = fromEnd ? (Stot - s3) : s3;
      g3 = d3 - KP * at(s3).u;
      if (gPrev !== null && gPrev < 0 && g3 >= 0) {
        var a3 = sPrev, b3 = s3, k4;
        for (k4 = 0; k4 < 50; k4++) {
          var m3 = (a3 + b3) / 2, dm = fromEnd ? (Stot - m3) : m3;
          if (dm - KP * at(m3).u < 0) a3 = m3; else b3 = m3;
        }
        return (a3 + b3) / 2;
      }
      sPrev = s3; gPrev = g3;
    }
    return null;
  }
  var sTip = poleArc(false), sBase = poleArc(true);
  var sLo = (sTip !== null && sTip > 1e-9) ? sTip : 0.5 * Rf;
  var sHi = (sBase !== null && sBase > 1e-9) ? (Stot - sBase) : (Stot - 0.5 * Rf);
  if (!(sHi > sLo + 1e-9)) { sLo = 0; sHi = Stot; }

  /* ---- 行距必须服从【量化后的列数】，否则格子被拉长成「竖着的蜂窝」----
     旧写法：先按 q 律走出 M 行，再把列数量化到 6 —— 两者各自为政，
     实测 d/h（格子宽 ÷ 行距）在 0.85 ~ 2.30 之间漂，根本不是正六边形。
     正解：q 律只决定「这一圈该有几列」，行距再用这个 N 反算 ——
        N = 6·round( 2πu·(√3/2) / h_q(u) )    h_q(u) = h0·(u/u_max)^q
        h = 2πu·(√3/2) / N
     于是 d/h ≡ 1/(√3/2) = 1.15470 恒成立（正六边形的行距比），
     而 q 仍然决定哪里密：h ≈ h_q ∝ (u/u_max)^q。
     ⚠ 行数不再是 M 本身：M 只是"目标行数"，由 h0 反解，实得行数读数据报。 */
  var SQ3H = 0.8660254037844386, SIX = 6;
  var Im = 0, im;
  for (im = 1; im < pr.length; im++) {        /* ∫ (u_max/u)^q ds = 行数 × h0 */
    var um = 0.5 * (pr[im][1] + pr[im - 1][1]);
    Im += Math.pow(umax / Math.max(um, 1e-9), q) * (ss[im] - ss[im - 1]);
  }
  var h0 = Im / Math.max(1, M - 2);
  function nAt(u0) {                          /* 这一圈该有几列（6 的倍数） */
    var hLaw = h0 * Math.pow(Math.max(u0, Rf) / umax, q);
    /* ⚠ 括号里【已经是个列数】，必须再 /6 才能 round 到 6 的倍数。
       写成 6·round(x)（漏掉 /6）会把 13 列放大成 78 列 —— 2026-11-03 实测
       行数从 26 涨到 81、格子小到看不清，就是这个漏号。 */
    var nRaw = TAU * u0 * SQ3H / Math.max(1e-12, hLaw);
    return Math.max(SIX, Math.min(180, SIX * Math.round(nRaw / SIX)));
  }
  function hAt(u0, N0) { return TAU * Math.max(u0, 1e-12) * SQ3H / N0; }

  /* 一趟前推：从 sLo 走到 sHi，每圈的行距 = 该圈列数决定的正六边形行距 */
  function march(hv) {
    var rr = [sLo], NN = [SIX], s3 = sLo, guard = 0, N3, h3, sN, its, N5, uN;
    var oldH0 = h0; h0 = hv;
    while (guard++ < 400) {
      var u3b = at(s3).u; N3 = nAt(u3b);
      if (N3 > NN[NN.length - 1] + SIX) N3 = NN[NN.length - 1] + SIX;
      sN = s3 + hAt(u3b, N3);
      its = 0;
      while (its++ < 8) {
        uN = at(sN).u; N5 = nAt(uN);
        if (N5 > NN[NN.length - 1] + SIX) N5 = NN[NN.length - 1] + SIX;
        N3 = N5; sN = s3 + hAt(uN, N5);
      }
      h3 = sN - s3;
      if (s3 + h3 > sHi - 1e-12) break;
      s3 = sN; rr.push(s3); NN.push(N3);
    }
    h0 = oldH0;
    /* 收口：与钝面最后一圈太近就并掉（否则多出一圈"薄片"格子），再补上 6 列的收口圈 */
    if (rr.length > 2 && (sHi - s3) < 0.5 * h3) { rr.pop(); NN.pop(); }
    if (rr[rr.length - 1] < sHi - 1e-9) { rr.push(sHi); NN.push(SIX); }
    if (NN.length >= 2 && NN[NN.length - 2] > 2 * SIX) NN[NN.length - 2] = 2 * SIX;
    return { rs: rr, N: NN };
  }

  /* λ 二分：让【实得行数】尽量等于滑条上的 M。
     h0 越大 ⇒ 行距越大 ⇒ 圈数越少（单调），所以 cnt>M 就往大的一侧收。
     ⚠ 不二分的话 M 只是"参考值"：实测 M=26 只铺出 16 圈，屏上写 26 就是假数。 */
  var best = null, lo2 = 0.02, hi2 = 60, mid2, it2, m2, cnt;
  for (it2 = 0; it2 < 24; it2++) {
    mid2 = (lo2 + hi2) / 2;
    m2 = march(h0 * mid2); cnt = m2.rs.length;
    /* ⚠ 必须连同 cnt 一起记：只存 m2 的话 best.cnt 是 undefined，
       Math.abs(undefined - M) = NaN ⇒ 比较恒假 ⇒ best 永远停在第一次迭代
       （2026-11-03 实测：M=26 铺出 8 圈，就是这个 NaN 比较）。 */
    if (!best || Math.abs(cnt - M) < Math.abs(best.cnt - M)) best = { rs: m2.rs, N: m2.N, cnt: cnt };
    if (cnt > M) lo2 = mid2; else hi2 = mid2;
  }
  var rs = best.rs, N = best.N;

  var tt = [], uu = [], k, i;
  for (i = 0; i < rs.length; i++) { var a2 = at(rs[i]); tt.push(a2.t); uu.push(a2.u); }

  /* ⚠ 列数仍必须量化到 6 的倍数：相邻两圈点数相同 + 半个间距交错 ⇒ 拉链是
     规则的菱形-三角形交替 ⇒ 对偶出来才是蜂窝。不量化时每圈差 1~2 个点，
     整片错位，对偶全是「泡沫 / 细胞」（2026-11-03 第一版的真实观感）。 */

  /* 顶点：轴 = y（蛋轴），蛋高归一到 H */
  var H = 2.20, sc = H / Math.max(1e-9, (pf.t1 - pf.t0)), tMid = (pf.t0 + pf.t1) / 2;
  var V = [], rings = [];
  function put(t, r, th) {
    V.push([r * sc * Math.cos(th), (t - tMid) * sc, r * sc * Math.sin(th)]);
  }
  put(pf.t0, 0, 0); rings.push([0]);
  for (k = 0; k < tt.length; k++) {
    var off = (k % 2) ? 0 : 0.5, ids = [], n = N[k], rk = uu[k];
    for (i = 0; i < n; i++) { var th = TAU * (i + off) / n; ids.push(V.length); put(tt[k], rk, th); }
    rings.push(ids);
  }
  put(pf.t1, 0, 0); rings.push([V.length - 1]);

  /* 按 θ 拉链三角化（极点退化成扇）
     ⚠🔴 相邻两圈是【交错半格】的（off = 0 / 0.5 交替），所以比角度必须带上相位：
        用 TAU·(ia+1)/nA 对 TAU·(ib+1)/nB 比，等于假设两圈起点同相 ——
        于是「A0-A1 这条底边」配到的不是夹在中间的 B1，而是隔壁的 B0，
        每个三角形都跨 1.5 格，拉出来的对偶六边形被整体剪切：
        实测六条棱长短差 2.674 倍（中位格），看着是六边形、其实是被拉歪的。
        2026-11-03 修。 */
  var offs = [0];
  for (k = 0; k < tt.length; k++) offs.push((k % 2) ? 0 : 0.5);
  offs.push(0);
  var T = [];
  function zip(A, B, oa, ob) {
    if (A.length === 1) { for (var j = 0; j < B.length; j++) T.push([A[0], B[j], B[(j + 1) % B.length]]); return; }
    if (B.length === 1) { for (var j2 = 0; j2 < A.length; j2++) T.push([A[j2], A[(j2 + 1) % A.length], B[0]]); return; }
    var nA = A.length, nB = B.length, ia = 0, ib = 0;
    while (ia < nA || ib < nB) {
      if (ia >= nA) { T.push([A[ia % nA], B[ib % nB], B[(ib + 1) % nB]]); ib++; continue; }
      if (ib >= nB) { T.push([A[ia % nA], A[(ia + 1) % nA], B[ib % nB]]); ia++; continue; }
      var ta = TAU * (ia + 1 + oa) / nA, tb = TAU * (ib + 1 + ob) / nB;
      if (ta <= tb) { T.push([A[ia % nA], A[(ia + 1) % nA], B[ib % nB]]); ia++; }
      else { T.push([A[ia % nA], B[ib % nB], B[(ib + 1) % nB]]); ib++; }
    }
  }
  for (k = 0; k < rings.length - 1; k++) zip(rings[k], rings[k + 1], offs[k], offs[k + 1]);

  /* 三角面面积 + 重心（重心就是六边形的【顶点】） */
  var triA = [], triC = [], p0, p1, p2;
  for (i = 0; i < T.length; i++) {
    p0 = V[T[i][0]]; p1 = V[T[i][1]]; p2 = V[T[i][2]];
    var ax = p1[0] - p0[0], ay = p1[1] - p0[1], az = p1[2] - p0[2];
    var bx = p2[0] - p0[0], by = p2[1] - p0[1], bz = p2[2] - p0[2];
    var cx = ay * bz - az * by, cy = az * bx - ax * bz, cz = ax * by - ay * bx;
    triA.push(0.5 * Math.sqrt(cx * cx + cy * cy + cz * cz));
    triC.push([(p0[0] + p1[0] + p2[0]) / 3, (p0[1] + p1[1] + p2[1]) / 3, (p0[2] + p1[2] + p2[2]) / 3]);
  }

  /* 边 → 两个邻面（= 一根杆；对偶顶点是三角面重心） */
  var emap = new Map();
  function ek(a, b) { return a < b ? (a + '_' + b) : (b + '_' + a); }
  for (i = 0; i < T.length; i++) for (var j = 0; j < 3; j++) {
    var v1 = T[i][j], v2 = T[i][(j + 1) % 3], kk = ek(v1, v2);
    var L2 = emap.get(kk);
    if (!L2) { L2 = []; emap.set(kk, L2); }
    L2.push(i);
  }

  /* 每格 = 某个原顶点周围那圈三角面的重心连成的多边形（走扇序） */
  var inc = [];
  for (i = 0; i < V.length; i++) inc.push([]);
  for (i = 0; i < T.length; i++) for (var j3 = 0; j3 < 3; j3++) inc[T[i][j3]].push(i);
  var cells = [];
  for (var v = 0; v < V.length; v++) {
    var fan = inc[v];
    if (!fan.length) continue;
    var order = [fan[0]], used = {}, cur = fan[0], guard = 0, ok = true;
    used[fan[0]] = 1;
    while (guard++ < 400) {
      var tv = T[cur], others = [];
      for (var j4 = 0; j4 < 3; j4++) if (tv[j4] !== v) others.push(tv[j4]);
      var outV;
      if (order.length === 1) outV = others[1];
      else {
        var pv = T[order[order.length - 2]], common = [];
        for (var j5 = 0; j5 < 3; j5++) if (pv[j5] !== v) common.push(pv[j5]);
        var came = common[0];
        if (others[0] === common[0] || others[0] === common[1]) came = others[0];
        outV = (others[0] === came) ? others[1] : others[0];
      }
      var nb = emap.get(ek(v, outV)) || [], pick = -1;
      for (var j6 = 0; j6 < nb.length; j6++) if (nb[j6] !== cur) pick = nb[j6];
      if (pick < 0) { ok = false; break; }
      if (pick === order[0]) break;
      if (used[pick]) { ok = false; break; }
      used[pick] = 1; order.push(pick); cur = pick;
    }
    if (!ok && order.length < 3) continue;
    var area = 0;
    for (var j7 = 0; j7 < order.length; j7++) area += triA[order[j7]] / 3;
    cells.push({ v: v, tris: order, poly: order.map(function (t) { return triC[t]; }),
                 area: area, sides: order.length });
  }

  /* 面积占比（Σ=100%）与欧拉账 */
  var totA = 0, i2;
  for (i2 = 0; i2 < cells.length; i2++) totA += cells[i2].area;
  var sidesCnt = {}, pen = 0;
  for (i2 = 0; i2 < cells.length; i2++) {
    var sN = cells[i2].sides;
    sidesCnt[sN] = (sidesCnt[sN] || 0) + 1;
    pen += 6 - sN;
    cells[i2].pct = totA > 1e-12 ? cells[i2].area / totA * 100 : 0;
  }
  /* 极点格：v 落在两端那两个 r=0 的顶点上 */
  cells[0].pole = 'tip';
  cells[cells.length - 1].pole = 'base';

  /* 杆：对偶边（两端是三角面重心），并记下它挨着哪两个三角面 ⇒ 节点半径用 */
  var struts = [];
  var vIdx = {};
  for (i2 = 0; i2 < cells.length; i2++) vIdx[cells[i2].v] = i2;
  emap.forEach(function (ts, key2) {
    if (ts.length !== 2) return;
    var ab = key2.split('_'), ca = vIdx[ab[0]], cb = vIdx[ab[1]];
    if (ca === undefined || cb === undefined) return;
    struts.push({ a: triC[ts[0]], b: triC[ts[1]], ca: ca, cb: cb, f1: ts[0], f2: ts[1], r: 0.001 });
  });

  /* 每行的实际弧长步长（×sc 换成蛋高单位）：读数要拿它证明「两端真的更密」 */
  var hsteps = [];
  for (i = 1; i < rs.length; i++) hsteps.push((rs[i] - rs[i - 1]) * sc);
  var hEq = 0, hPole = 1e9, kk2;
  /* 首（0→sLo）与末（sHi→Stot）是【跨过极点收敛区的扇形】，不算纬圈行距 */
  for (kk2 = 1; kk2 < hsteps.length - 1; kk2++) {
    if (hsteps[kk2] > hEq) hEq = hsteps[kk2];                  /* 最疏 = 赤道 */
    if (hsteps[kk2] < hPole) hPole = hsteps[kk2];              /* 最密 = 极点 */
  }

  /* 六棱等长比 = 该六边形最长棱 / 最短棱。正六边形 = 1.000。
     这是"到底是不是正六边形"的【直接量测】：读的是 poly 里相邻对偶顶点的真实
     距离，不看上面那套构造公式（构造公式只能自证，属恒真式）。
     缺陷圈（5/7 边形）与极点圈不计入 —— 只统计恰好 6 边的格子。 */
  var eRat = [], iq;
  for (iq = 0; iq < cells.length; iq++) {
    var po = cells[iq].poly, ns = po.length;
    if (ns !== 6) continue;
    var eLo = 1e9, eHi = 0, jq;
    for (jq = 0; jq < ns; jq++) {
      var A0 = po[jq], B0 = po[(jq + 1) % ns];
      var ex = B0[0] - A0[0], ey = B0[1] - A0[1], ez = B0[2] - A0[2];
      var el = Math.sqrt(ex * ex + ey * ey + ez * ez);
      if (el < eLo) eLo = el;
      if (el > eHi) eHi = el;
    }
    if (eLo > 1e-12) { eRat.push(eHi / eLo); cells[iq].ereg = eHi / eLo; }
  }
  eRat.sort(function (x, y) { return x - y; });
  var ergMed = eRat.length ? eRat[(eRat.length / 2) | 0] : 0;
  var ergP90 = eRat.length ? eRat[Math.min(eRat.length - 1, (eRat.length * 0.9) | 0)] : 0;
  var ergOk = 0;
  for (iq = 0; iq < eRat.length; iq++) if (eRat[iq] <= 1.06) ergOk++;

  var pcts = cells.map(function (c) { return c.pct; }).sort(function (x, y) { return x - y; });

  /* 杆径律（放在 Net 里，不放在 Build 里）：
     读数也要报杆径范围，若只在 Build 里算，f0HexRead 拿到的是 undefined ⇒ 屏上印 NaN。
     r = r0·(该格面积占比 / 平均占比)^γ，夹在 0.35~2.8 倍；
     一条棱被两格共有 ⇒ 取两格平均（不可能一条棱两个粗细）。 */
  var r0 = Math.max(0.0004, hxR * H / 1000), meanPct = 100 / Math.max(1, cells.length);
  var rMin = 1e9, rMax = -1e9, ic;
  for (ic = 0; ic < cells.length; ic++) {
    var cR = cells[ic], tR = cR.pct / meanPct;
    cR.rr = r0 * Math.min(2.8, Math.max(0.35, Math.pow(Math.max(1e-6, tR), hxG)));
    if (cR.rr < rMin) rMin = cR.rr;
    if (cR.rr > rMax) rMax = cR.rr;
  }
  var strutR = [], nLenClamp = 0, minLen = 1e9, maxLen = 0;
  for (ic = 0; ic < struts.length; ic++) {
    var S0 = struts[ic];
    var dx0 = S0.b[0] - S0.a[0], dy0 = S0.b[1] - S0.a[1], dz0 = S0.b[2] - S0.a[2];
    var len = Math.sqrt(dx0 * dx0 + dy0 * dy0 + dz0 * dz0);
    S0.len = len;
    if (len < minLen) minLen = len;
    if (len > maxLen) maxLen = len;
    /* 杆径 = 两格平均，但不得超过杆长的 0.32 倍。
       理由：极点附近的格子小、杆很短（实测最短 0.0141），而面积占比夹紧后的
       最大杆径能到 0.0130 —— 直径几乎等于长度，那画出来是球不是杆。
       工程上短杆本来也不可能比自身长度还粗。被夹的根数读数里如实报。 */
    var rr2 = 0.5 * (cells[S0.ca].rr + cells[S0.cb].rr);
    if (rr2 > 0.32 * len) { rr2 = 0.32 * len; nLenClamp++; }
    S0.r = rr2;
    strutR.push(rr2);
  }
  strutR.sort(function (a, b) { return a - b; });

  /* 赤道半径 = 所有顶点到轴的最大距离。配色「沿半径」映射与 L2 的 λ 都要它，
     所以放在 net 里算一次，别让下游各算一遍各的口径。 */
  var rEqAll = 0, iEq;
  for (iEq = 0; iEq < V.length; iEq++) {
    var rq = Math.sqrt(V[iEq][0] * V[iEq][0] + V[iEq][2] * V[iEq][2]);
    if (rq > rEqAll) rEqAll = rq;
  }

  var stats = {
    min: pcts[0], med: pcts[(pcts.length / 2) | 0], max: pcts[pcts.length - 1],
    rEq: rEqAll,
    n: cells.length, n4: sidesCnt[4] || 0, n5: sidesCnt[5] || 0, n6: sidesCnt[6] || 0,
    n7: sidesCnt[7] || 0, n8: sidesCnt[8] || 0, euler: pen,
    tris: T.length, verts: V.length, struts: struts.length,
    nRings: tt.length, q: q, H: H, areaTotal: totA, mTarget: M,
    r0: r0, rMin: rMin, rMax: rMax,
    srMin: strutR.length ? strutR[0] : 0,
    srMax: strutR.length ? strutR[strutR.length - 1] : 0,
    lenMin: minLen, lenMax: maxLen, nLenClamp: nLenClamp,
    tipSides: cells[0].sides, baseSides: cells[cells.length - 1].sides,
    tipR: Math.sqrt(V[0][0] * V[0][0] + V[0][2] * V[0][2]),
    baseR: Math.sqrt(V[V.length - 1][0] * V[V.length - 1][0] + V[V.length - 1][2] * V[V.length - 1][2]),
    L: (pf.t1 - pf.t0) * sc, t0: pf.t0, t1: pf.t1, sc: sc,
    hEq: hEq, hPole: hPole, hRatio: hEq / Math.max(1e-12, hPole), hsteps: hsteps,
    ergMed: ergMed, ergP90: ergP90, ergLo: eRat.length ? eRat[0] : 0,
    ergHi: eRat.length ? eRat[eRat.length - 1] : 0,
    ergOk: ergOk, ergN: eRat.length
  };
  var out = { V: V, T: T, triC: triC, cells: cells, struts: struts, stats: stats, pf: pf,
              ringT: tt, ringU: uu, ringN: N, ringS: rs, ck: key };
  F0H_CACHE = { k: key, v: out };
  return out;
}

/* ==========================================================================
   双层壳体 · 四面体芯 · cmap 配色（2026-11-03 升级）
   --------------------------------------------------------------------------
   【为什么要第二层】
     单层蜂窝是「膜」：面内有刚度，一压就皱、一剪就滑。要撑住形状必须加厚 ——
     双层网格壳（double-layer lattice shell）就是这么来的：外层承面内，
     中间那层「芯」承剪切，内层再把芯闭合。

   【第二层为什么正好是三角形】
     外层是正六边形蜂窝，它的【对偶】正好是正三角形网：
       外层每一格的中心 = 内层三角形的一个顶点
       外层每一格的边   = 内层三角形的一条边（跨两个格）
     所以第二层不用另算采样：它跟外层是同一张网的对偶面，顶点数一一对应，
     层间杆天然是「径向」的。这也顺手解释了为什么它一定是正三角形而不是别的。

   【层间距的物理最优：正四面体】
     外层三角网边长 a，内层缩放到 λ 后边长 λa。
     若四面体取【正】四面体（六根杆等长），高 h = √(2/3)·λa = 0.8165·λa。
     正四面体是最优单元，两条理由都硬：
       · Maxwell 判据 3j−6 = 3×4−6 = 6 = b（杆数）⇒ 恰好静定、无多余杆。
         任何别的四面体要么留机构，要么必须加杆 —— 加杆就是加重量。
       · 六根等长 ⇒ 各杆只受轴力、弯矩为零 ⇒ 材料强度全用在拉压上。
     层间距又由缩放给：h ≈ (1−λ)·R_eq（R_eq = 赤道半径）
        (1−λ)R = 0.8165·λa   ⇒   λ = R / (R + 0.8165a)
     一个式子把「物理最优」和「以原点为中心缩小的相似蛋面」绑在一起：
     蛋面是整体相似缩放 ⇒ λ 只能是全局一个数（不能逐点变），
     而 a 与 R 都取赤道处的值 —— 那里格子最大、层间距最吃紧。

   【只有径向杆为什么不稳（这一层必须讲清）】
     内外层顶点一一对应 ⇒ 每根径向杆像一根柱子，芯是个「柱阵」。
     柱阵抗压不抗剪：两层可以相对面内滑移，自由度没被约束，是机构不是结构。
     正解是把每条外层棱与对应内层棱用 4 根斜杆封成一个【四面体】：
       外层棱两端 triC_f1 / triC_f2 ＋ 内层棱两端 λV[u] / λV[v]
     四面体 6 条棱齐了，这个单元才刚 —— 整片壳才真正抗剪。
     本页把「只有径向杆」和「加斜撑」分成两档，好当场对比。

   【四面体芯：再往蛋内伸一层】
     内层每个三角形作底座，向蛋内立第 4 点。方向取「重心的反径向」：
     朝原点永不为零、不会退化（曲面法向在极点会翻号，那是坑）。
     各四面体的内顶点再按「相邻三角面」两两相连 ⇒ 得到内层三正则网，
     与内层三角网互为对偶。三层壳 + 三向斜撑 = 闭合空间桁架。
   ========================================================================== */

var F0L2_CACHE = { k: '', v: null };

/* ---- cmap 色表 ----
   ⚠ 这是【近似采样】（11 点），视觉用；不声称是 matplotlib 的 256 色原表。
   首尾与中段都对得上，做渐变是安全的。顺序与 f0CmapKind 的编号一致。 */
var F0_CMAPS = {
  plasma: [[0.0504, 0.0298, 0.5280], [0.2001, 0.0188, 0.6153], [0.3578, 0.0114, 0.6504],
           [0.5113, 0.0951, 0.5852], [0.6469, 0.1812, 0.4891], [0.7670, 0.2318, 0.3729],
           [0.8701, 0.3340, 0.2694], [0.9466, 0.4728, 0.1798], [0.9876, 0.6453, 0.0795],
           [0.9644, 0.8438, 0.2734], [0.9400, 0.9752, 0.1313]],
  viridis: [[0.2670, 0.0049, 0.3294], [0.2826, 0.1409, 0.4575], [0.2539, 0.2653, 0.5300],
            [0.2068, 0.3718, 0.5531], [0.1636, 0.4711, 0.5581], [0.1276, 0.5669, 0.5506],
            [0.1347, 0.6586, 0.5176], [0.2669, 0.7488, 0.4406], [0.4775, 0.8214, 0.3182],
            [0.7414, 0.8734, 0.1496], [0.9932, 0.9062, 0.1439]],
  inferno: [[0.0015, 0.0005, 0.0139], [0.1466, 0.0335, 0.2434], [0.3472, 0.0289, 0.3815],
            [0.5465, 0.0369, 0.3457], [0.7337, 0.1595, 0.2253], [0.8605, 0.3364, 0.1077],
            [0.9419, 0.5082, 0.0277], [0.9777, 0.6998, 0.0909], [0.9259, 0.8867, 0.2306],
            [0.8394, 0.9630, 0.4140], [0.9884, 1.0000, 0.6449]],
  turbo: [[0.1900, 0.0718, 0.2322], [0.2754, 0.3725, 0.9201], [0.1805, 0.6303, 0.9952],
          [0.1117, 0.8514, 0.7500], [0.3367, 0.9828, 0.4033], [0.6606, 0.9930, 0.1601],
          [0.9081, 0.8396, 0.1006], [0.9972, 0.5816, 0.0891], [0.9683, 0.3305, 0.1286],
          [0.8034, 0.1266, 0.1005], [0.4796, 0.0158, 0.0106]]
};
var F0_CMAP_NAMES = ['plasma', 'viridis', 'inferno', 'turbo', 'HSV 色环', '单色钢灰'];

function f0CmapKind(P) { return Math.max(0, Math.min(5, (P.hxCmap === undefined ? 0 : (P.hxCmap | 0)))); }

/* sRGB → 线性：Three 的顶点色按【线性】解释。直接塞 sRGB 值进去会整体偏暗，
   而且暗部细节糊成一团（plasma 的低端本来是深蓝紫，不转会变成近黑）。 */
function f0S2L(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
/* 反变换：3D 顶点色是线性空间（three.js 要），Canvas 2D 要 sRGB。
   少了这一步，2D 投影图整体偏暗、plasma 的紫端直接糊成黑。 */
function f0L2S(c) { return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; }

function f0HsvCol(t) {
  var h = ((t % 1) + 1) % 1, s = 0.82, v = 0.98;
  var i = Math.floor(h * 6), f = h * 6 - i, p = v * (1 - s), q = v * (1 - s * f), u = v * (1 - s * (1 - f));
  var r, g, b;
  switch (i % 6) {
    case 0: r = v; g = u; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = u; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = u; g = p; b = v; break;
    default: r = v; g = p; b = q;
  }
  return [r, g, b];
}

function f0CmapColor(P, t) {
  var k = f0CmapKind(P);
  if (k === 5) return null;                      /* 单色钢：调用方退回素色 */
  /* 色域下限压到 12%：plasma / inferno 的最低端是近黑，转线性后钝端细节全糊掉。
     留 12% 的下限既不丢色域长度，又能让最低那一档还看得清是「深紫」而不是「黑」。 */
  t = 0.12 + 0.88 * Math.max(0, Math.min(1, t));
  var rgb;
  if (k === 4) rgb = f0HsvCol(0.66 - 0.66 * t);  /* HSV：紫蓝 → 青 → 黄橙 */
  else {
    var tab = F0_CMAPS[F0_CMAP_NAMES[k]] || F0_CMAPS.plasma;
    var n = tab.length - 1, x = t * n, i2 = Math.min(n - 1, Math.floor(x)), f2 = x - i2;
    var A = tab[i2], B = tab[i2 + 1];
    rgb = [A[0] + (B[0] - A[0]) * f2, A[1] + (B[1] - A[1]) * f2, A[2] + (B[2] - A[2]) * f2];
  }
  return [f0S2L(rgb[0]), f0S2L(rgb[1]), f0S2L(rgb[2])];
}

/* 映射标量：0 = 沿蛋轴高度（默认，最像"一条渐变"）／1 = 沿半径／2 = 沿经度 */
function f0MapVal(P, p, st) {
  var m = (P.hxMapT === undefined ? 0 : (P.hxMapT | 0));
  if (m === 2) return Math.atan2(p[2], p[0]) / TAU + 0.5;
  if (m === 1) return Math.sqrt(p[0] * p[0] + p[2] * p[2]) / Math.max(1e-9, st.rEq);
  return (p[1] + st.H / 2) / Math.max(1e-9, st.H);
}

/* ---- 通用杆件几何：一根杆 = sides 边棱柱 + 两端封口 ----
   两端各自取色 ⇒ 同一根杆内部也有渐变（比"一根杆一个色"细腻得多）。
   sides=6 用于外层（与「六边」呼应、能看出是实心钢杆），
   sides=4 用于内层（细杆，6 边看不出差别，白多一倍顶点）。 */
function f0StrutGeo(list, sides, P, st) {
  var pos = [], col = [], idx = [], base = 0, i, k;
  var useC = f0CmapKind(P) !== 5;
  for (i = 0; i < list.length; i++) {
    var S = list[i], A = S.a, B = S.b, r = S.r;
    var dx = B[0] - A[0], dy = B[1] - A[1], dz = B[2] - A[2];
    var L = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-9;
    dx /= L; dy /= L; dz /= L;
    var refx = 0, refy = 1, refz = 0;
    if (Math.abs(dy) > 0.92) { refx = 1; refy = 0; refz = 0; }
    var ux = dy * refz - dz * refy, uy = dz * refx - dx * refz, uz = dx * refy - dy * refx;
    var ul = Math.sqrt(ux * ux + uy * uy + uz * uz) || 1e-9; ux /= ul; uy /= ul; uz /= ul;
    var vx = dy * uz - dz * uy, vy = dz * ux - dx * uz, vz = dx * uy - dy * ux;
    var cA = useC ? f0CmapColor(P, f0MapVal(P, A, st)) : null;
    var cB = useC ? f0CmapColor(P, f0MapVal(P, B, st)) : null;
    for (k = 0; k < sides; k++) {
      var an = TAU * k / sides, cs = Math.cos(an) * r, sn = Math.sin(an) * r;
      pos.push(A[0] + ux * cs + vx * sn, A[1] + uy * cs + vy * sn, A[2] + uz * cs + vz * sn);
      pos.push(B[0] + ux * cs + vx * sn, B[1] + uy * cs + vy * sn, B[2] + uz * cs + vz * sn);
      if (useC) col.push(cA[0], cA[1], cA[2], cB[0], cB[1], cB[2]);
    }
    var icA = pos.length / 3; pos.push(A[0], A[1], A[2]);
    if (useC) col.push(cA[0], cA[1], cA[2]);
    var icB = pos.length / 3; pos.push(B[0], B[1], B[2]);
    if (useC) col.push(cB[0], cB[1], cB[2]);
    for (k = 0; k < sides; k++) {
      var a0 = base + k * 2, a1 = base + ((k + 1) % sides) * 2, b0 = a0 + 1, b1 = a1 + 1;
      idx.push(a0, a1, b0, b0, a1, b1);        /* 侧壁 */
      idx.push(icA, a1, a0);                   /* A 端盖 */
      idx.push(icB, b0, b1);                   /* B 端盖 */
    }
    base += sides * 2 + 2;
  }
  var g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (useC) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  var g2 = g.toNonIndexed(); g2.computeVertexNormals();
  return g2;
}

/* ---- 第二层 + 芯：纯数学，build / read / prof 三处共用 ---- */
function f0HexL2(P) {
  var net = f0HexNet(P);
  if (!net) return null;
  var st = net.stats, V = net.V, T = net.T, i, j;

  var lmode = (P.hxL2mode === undefined ? 0 : (P.hxL2mode | 0));
  var tetK = Math.max(0.30, Math.min(2.0, (P.hxTetK === undefined ? 1.0 : P.hxTetK)));
  var man = Math.max(0.30, Math.min(0.94, (P.hxL2 === undefined ? 68 : P.hxL2) / 100));
  var skin = (P.cutSkin | 0);
  /* 层间连接方式（2026-11-03 加）：0 径向直杆 / 1 节点斜腹杆 / 2 径向 + 辐条 */
  var web = (P.hxWeb === undefined ? 1 : (P.hxWeb | 0));
  /* 内芯密度（2026-11-04 老师：内部支撑杆太密，3D 打印要省料又得够稳）
     0 = 不建内芯（只剩 外层蜂窝 + 层间腹杆 + 内层三角网：双层壳，最省）
     1 = 每 4 个三角面留 1 个锥（稀疏加强筋） 2 = 每 2 个留 1 个 3 = 全建（原样）
     抽稀用的是【三角面索引取模】这种确定规则，不用随机：同一组参数每次出来一模一样，
     判据才可复现；而且三角面是按格逐行生成的，取模相当于隔行隔列，视觉上均匀，
     不会出现「半边有芯、半边秃」。留下的每个锥底座仍压在三角网上 ⇒ 与壳连通，
     不是孤立悬空的柱子。 */
  var core = Math.max(0, Math.min(3, (P.hxCore === undefined ? 1 : (P.hxCore | 0))));
  var coreStep = [0, 4, 2, 1][core];
  /* 第二层绕长轴（数学 y）的相位角，度。蜂窝有 6 次对称、三角网有 3 次对称，
     所以相位周期是 120°，给 −60~+60 就够把「内层杆与外层杆错开」的所有情形走遍。 */
  var phase = Math.max(-60, Math.min(60, (P.hxL2phase === undefined ? 0 : P.hxL2phase)));
  /* ⚠ key 必须含 net.ck（母线/α/z₀/M/q/杆径全在里面）+ 本层自己的每个参数。
     少了任何一个，改完参数屏上还画上一版的内层 —— 那就是 2026-11-03 抓过的
     「缓存串味」，只不过换了一层。web / phase / core 同理。 */
  var key = net.ck + '|L2|' + skin + '|' + lmode + '|' + man.toFixed(4) + '|' + tetK.toFixed(3) +
            '|W' + web + '|P' + phase.toFixed(2) + '|C' + core;
  if (F0L2_CACHE.k === key && F0L2_CACHE.v) return F0L2_CACHE.v;

  function d2(A, B) {
    var x = B[0] - A[0], y = B[1] - A[1], z = B[2] - A[2];
    return Math.sqrt(x * x + y * y + z * z);
  }

  /* 三角网的边：每条边 = 一根内层杆；同时记下它挨着哪两个三角面（斜撑与内顶点互连要用） */
  var em = new Map();
  function ek(a, b) { return a < b ? (a + '_' + b) : (b + '_' + a); }
  for (i = 0; i < T.length; i++) for (j = 0; j < 3; j++) {
    var u0 = T[i][j], v0 = T[i][(j + 1) % 3], kk = ek(u0, v0), E0 = em.get(kk);
    if (!E0) { E0 = { u: Math.min(u0, v0), v: Math.max(u0, v0), f: [] }; em.set(kk, E0); }
    E0.f.push(i);
  }
  var eLens = [];
  em.forEach(function (E) { E.len = d2(V[E.u], V[E.v]); eLens.push(E.len); });
  eLens.sort(function (x, y) { return x - y; });
  var aMed = eLens.length ? eLens[(eLens.length / 2) | 0] : 0.1;
  /* ⚠ λ 要用【90 分位】而不是中位。中位 = 全蛋所有边的一半落在它下面，
     而三角网上绝大多数边挤在极点附近（那里格子最小）—— 用中位定 λ，
     赤道处的芯会薄到 h/a ≈ 0.26，正四面体变成一片扁饼（2026-11-03 实测：
     λ=86.5%、层间距仅 4.8% 蛋高）。
     用 90 分位（≈ 赤道那批最大的格子）：赤道处严格满足 h/(λa)=0.8165，
     两端格子小 ⇒ 该比值偏小（芯相对更薄），但那里杆短、本来不易屈曲。 */
  var aRef = eLens.length ? eLens[Math.min(eLens.length - 1, Math.floor(eLens.length * 0.90))] : 0.1;
  var aMax = eLens.length ? eLens[eLens.length - 1] : 0.1;

  /* ---- λ：正四面体的自洽解 ---- */
  var K824 = 0.816496580927726;               /* √(2/3) = 正四面体高 ÷ 底面边长 */
  var Req = Math.max(1e-9, st.rEq);
  /* 芯厚 h = 0.8165 × 外层三角网边长 ⇒ λ = 1 − h/R
     ⚠ 别把它写成 λ = R/(R+0.8165a)：那个式子解的是「h = 0.8165·λa」，
       而 λa 是【内层】边长 —— 式子两边同时在动，解出来的 h 与四面体高会打架
       （2026-11-03 实测：层厚 7.6%、四面体高 4.4%，两个数对不上）。
       正确口径：芯厚比的是【外层】边长；四面体高比的是【内层】边长。
       两者都取自己那层的「正四面体高 = 0.8165×本层边长」，各自自洽。 */
  var lamPhys = Math.max(0.30, Math.min(0.94, 1 - K824 * aRef / Req));
  var lam = (lmode === 1) ? man : lamPhys;

  /* ---- 内层蛋面：以原点为中心的相似缩放 ----
     蛋已居中（y = (t−tMid)·sc）⇒ 缩放后仍是同心、同轴、同形状的蛋。
     这就是「以原点为中心缩小的蛋形曲面」的字面落实，不是另造一张面。
     相位：绕数学 y 轴（蛋的长轴）转 phase 度。作用不是"让两层对齐"（见下），
     而是把内层三角杆与外层六边形杆在投影上错开 —— 两层杆正对着时，
     从外面看像一根粗杆，看不出是两层。 */
  var phR = phase * Math.PI / 180, cph = Math.cos(phR), sph = Math.sin(phR);
  var V2 = [];
  for (i = 0; i < V.length; i++) {
    var x1 = V[i][0] * lam, y1 = V[i][1] * lam, z1 = V[i][2] * lam;
    V2.push([x1 * cph - z1 * sph, y1, x1 * sph + z1 * cph]);
  }

  var vc = {};
  for (i = 0; i < net.cells.length; i++) vc[net.cells[i].v] = i;
  function cR(v) { var ci = vc[v]; return ci === undefined ? st.r0 : net.cells[ci].rr; }

  /* ---- 六边形的【可见中心】≠ 参数点 V ----
     外层钢架并不是照着 V 画六边形的：它把每格画在「6 个三角面重心 triC」上，
     于是六边形整体往里缩了一圈，V 落在钢架网面【之外】。两者之差就是曲率弓高，
     M 越小格子越大、弓高越明显 —— 旧版径向杆从 V 出发，看着就是一根
     「从六边形中央戳出来的柱子」（老师 2026-11-03 截图指的就是它）。
     所以凡是要"落在钢架上"的点，一律用 poly 的平均，不用 V。 */
  var cellCtr = [];
  var ctrOff = 0;
  for (i = 0; i < net.cells.length; i++) {
    var pl0 = net.cells[i].poly, nn0 = pl0.length, sx0 = 0, sy0 = 0, sz0 = 0;
    for (j = 0; j < nn0; j++) { sx0 += pl0[j][0]; sy0 += pl0[j][1]; sz0 += pl0[j][2]; }
    var cc0 = [sx0 / nn0, sy0 / nn0, sz0 / nn0];
    cellCtr.push(cc0);
    var vv = net.cells[i].v, o0 = d2(cc0, V[vv]);
    if (o0 > ctrOff) ctrOff = o0;
  }

  /* 杆集合：全部过 pushS ⇒ 短杆上限与杆径范围只有一处口径 */
  var tie = [], spoke = [], in2 = [], brace = [], apexS = [], innerS = [];
  var rMin = 1e9, rMax = -1e9, nClamp = 0;
  function pushS(arr, A, B, r) {
    var L = d2(A, B);
    if (!(L > 1e-9)) return;
    if (r > 0.32 * L) { r = 0.32 * L; nClamp++; }
    if (r < rMin) rMin = r;
    if (r > rMax) rMax = r;
    arr.push({ a: A, b: B, r: r });
  }

  /* ---- 层间连接：三种接法（2026-11-03 老师指出的「没连上节点」就是这里） ----
     ⚠ 先说清一件事：外层钢架的【节点是 triC】（三角面重心），
       V 只是参数点、也是六边形的几何中心，上面没有杆。
       所以从 V 出发的杆，两端都不在节点上 —— 力学上是虚接，视觉上是
       「一根柱子从六边形中央戳出来」。这就是 web=0 被降级成反例的原因。

     web=0 径向直杆：格心(可见中心) ↔ 内层对应顶点。
            ⚠ 仍是虚接（内层端是节点，外层端不是），只留作对照。
     web=1 ★ 节点斜腹杆：外层每个节点 triC → 它那个三角面的三个内层顶点。
            上弦节点 ↔ 下弦节点，这才是双层网壳的标准接法；
            每个节点发 6 根（3 条边 × 2 端点），整层就是一个完整的空间桁架。
     web=2 径向 + 辐条：格心先用 6 根面内辐条连到它周围的 triC（把格心做成真节点），
            再往内打径向杆。想看「格心处到底该不该有节点」就用这一档。 */
  if (web !== 1) {
    for (i = 0; i < V.length; i++) {
      var ci = vc[i];
      var A0 = (ci === undefined) ? V[i] : cellCtr[ci];
      pushS(tie, A0, V2[i], cR(i) * 0.46);
    }
    if (web === 2) {
      for (i = 0; i < net.cells.length; i++) {
        var pl1 = net.cells[i].poly, rS = Math.max(0.0004, net.cells[i].rr * 0.30);
        for (j = 0; j < pl1.length; j++) pushS(spoke, cellCtr[i], pl1[j], rS);
      }
    }
  }

  /* ---- 内层三角杆：三角网的每一条边 ---- */
  em.forEach(function (E) {
    pushS(in2, V2[E.u], V2[E.v], 0.5 * (cR(E.u) + cR(E.v)) * 0.46);
  });

  /* ---- 四面体：内层每个三角面作底座，向蛋内立第 4 点 ---- */
  var tets = [], ap = [], hSum = 0, tetR = [], apexR = [];
  for (i = 0; i < T.length; i++) {
    /* 内芯降档（coreStep：4 / 2 / 1；0 ⇒ 整块内芯不建）。
       用「三角面索引取模」抽稀：确定性、可复现，且三角面按格逐行生成 ⇒ 相当于隔行隔列，
       视觉均匀。留下的每个锥底座仍压在内层三角网上 ⇒ 与壳连通，不是孤立柱子。 */
    if (coreStep === 0 || (i % coreStep) !== 0) continue;
    var ia = T[i][0], ib = T[i][1], ic = T[i][2];
    var A = V2[ia], B = V2[ib], C = V2[ic];
    /* 顶点要立在【外心】正上方，不是重心正上方 ——
       立在重心上方时三条侧棱长短不一（实测六棱比 1.210，正四面体应是 1.000），
       因为重心到三个顶点的距离本来就不同。外心到三点等距 ⇒ 三条侧棱严格等长。
       2D 解法：以 A 为原点、AB 为 x 轴，则外心 ox = |AB|/2，
       由 |O−A| = |O−C| 解出 oy = (px² + ql² − |AB|·px) / (2·ql)。 */
    var e1x = B[0] - A[0], e1y = B[1] - A[1], e1z = B[2] - A[2];
    var L1 = Math.sqrt(e1x * e1x + e1y * e1y + e1z * e1z) || 1e-9;
    e1x /= L1; e1y /= L1; e1z /= L1;
    var c2x = C[0] - A[0], c2y = C[1] - A[1], c2z = C[2] - A[2];
    var px = c2x * e1x + c2y * e1y + c2z * e1z;             /* C 在 AB 上的投影长 */
    var qx = c2x - px * e1x, qy = c2y - px * e1y, qz = c2z - px * e1z;
    var ql = Math.sqrt(qx * qx + qy * qy + qz * qz) || 1e-9; /* C 到 AB 的高 */
    var ox = L1 / 2, oy = (px * px + ql * ql - L1 * px) / (2 * ql);
    var la = d2(A, B), lb = d2(B, C), lc = d2(C, A);
    var aF = (la + lb + lc) / 3;
    var Rc = Math.sqrt(ox * ox + oy * oy), useCen = true;
    /* 钝角三角形外心跑到形外，Rc 会爆 ⇒ 退回收重心（宁愿略不完美，不要一个扎歪的尖） */
    if (!(Rc > 1e-9) || Rc > 2.6 * aF) { Rc = aF / 1.7320508; useCen = false; }
    var cx, cy, cz;
    if (useCen) {
      var kx = oy / ql;
      cx = A[0] + ox * e1x + kx * qx;
      cy = A[1] + ox * e1y + kx * qy;
      cz = A[2] + ox * e1z + kx * qz;
    } else {
      cx = (A[0] + B[0] + C[0]) / 3; cy = (A[1] + B[1] + C[1]) / 3; cz = (A[2] + B[2] + C[2]) / 3;
    }
    /* h = √2·R外接圆 ：正三角形时 √2·(a/√3) = 0.8165a = 正四面体高 */
    var hF = 1.4142135623730951 * Rc * tetK;
    /* 顶点必须沿【底座平面的法向】立起来 —— 沿「朝原点」的方向时，径向并不垂直
       于三角形平面，三条侧棱会被拉成长短不一（实测六棱比 1.232 而理论上限只有 1.155）。
       法向朝哪边（内/外）：用「三顶点之和」与法向点积判。
       为什么不用外心半径判：极点附近的三角形外心几乎在轴上，径向分量 ≈ 0，会翻错。 */
    /* ⚠🔴 叉积三个分量按 (y,z,x) 循环，千万别写成 (z,x,y)：
         x = ay·bz − az·by    y = az·bx − ax·bz    z = ax·by − ay·bx
       写错成循环置换后，向量【长度对、也垂直于平面】，唯独指向别处 ——
       于是 pO 照样等于 h、pA/pB/pC 却差 3 倍（实测 0.0436 / 0.102 / 0.136），
       所有「长度 / 距离」类判据全抓不到，只有「三条侧棱是否等长」能抓（实测 2.480）。 */
    var axx = B[0]-A[0], ayy = B[1]-A[1], azz = B[2]-A[2];
    var bxx = C[0]-A[0], byy = C[1]-A[1], bzz = C[2]-A[2];
    var fnx = ayy*bzz - azz*byy;
    var fny = azz*bxx - axx*bzz;
    var fnz = axx*byy - ayy*bxx;
    var fnl = Math.sqrt(fnx*fnx + fny*fny + fnz*fnz) || 1e-9;
    fnx /= fnl; fny /= fnl; fnz /= fnl;
    var outDot = fnx*(A[0]+B[0]+C[0]) + fny*(A[1]+B[1]+C[1]) + fnz*(A[2]+B[2]+C[2]);
    var sgn = outDot > 0 ? -1 : 1;
    var P4 = [cx + sgn*fnx*hF, cy + sgn*fny*hF, cz + sgn*fnz*hF];
    /* 用【索引赋值】而不是 push：抽稀后 ap 会是稀疏数组，但 ap[i] 永远对应 T[i]，
       下面 innerS 用 ap[E.f[0]]/ap[E.f[1]] 才不会错位（push 会让整条链往前挤）。 */
    ap[i] = P4; hSum += hF;
    tets.push({ a: ia, b: ib, c: ic, p: P4, h: hF, aF: aF, ctr: [cx, cy, cz] });
    /* 六条棱：三条底座（λa）+ 三条侧棱（hF）⇒ 这个比就是「像不像正四面体」的实测 */
    var ap1 = d2(A, P4), ap2 = d2(B, P4), ap3 = d2(C, P4);
    var e6 = [la, lb, lc, ap1, ap2, ap3];
    var lo6 = e6[0], hi6 = e6[0], q6;
    for (q6 = 1; q6 < 6; q6++) { if (e6[q6] < lo6) lo6 = e6[q6]; if (e6[q6] > hi6) hi6 = e6[q6]; }
    tetR.push(hi6 / Math.max(1e-12, lo6));
    /* 只测三条侧棱：外心到三顶点等距 ⇒ 这个必须是 1.000（否则是外心算错/方向不对） */
    var apLo = Math.min(ap1, ap2, ap3), apHi = Math.max(ap1, ap2, ap3);
    apexR.push(apHi / Math.max(1e-12, apLo));
    var rB = (cR(ia) + cR(ib) + cR(ic)) / 3;
    if (skin >= 4) {
      pushS(apexS, A, P4, rB * 0.44);
      pushS(apexS, B, P4, rB * 0.44);
      pushS(apexS, C, P4, rB * 0.44);
    }
  }

  /* ---- 斜撑：每条外层棱 + 对应内层棱，用 4 根斜杆封成四面体 ----
     只加径向杆时芯是柱阵 ⇒ 面内可滑（机构）。这 4 根是抗剪的。
     只接到「上下相邻」的点（triC_f 与 V2[u]，u ∈ 该面）—— 别乱连，
     连到不相邻的点会长出一堆穿格的斜杆，看着像乱麻、实际也不传力。
     ⚠ 这一组同时承担 web=1 的「层间腹杆」角色：既然它本来就是
        triC → V2 的节点对节点连接，就不要再造一份重复的。（cutSkin≥4 与 web=1 取并集） */
  var doBrace = (skin >= 4) || (web === 1);
  if (doBrace) {
    em.forEach(function (E) {
      var rA = 0.5 * (cR(E.u) + cR(E.v)) * 0.30;
      for (var q = 0; q < E.f.length; q++) {
        var tc = net.triC[E.f[q]];
        pushS(brace, tc, V2[E.u], rA);
        pushS(brace, tc, V2[E.v], rA);
      }
    });
    /* ---- 内顶点互连：相邻两个四面体的内顶点相连 ⇒ 内层三正则网 ----
       只有真的建了四面体（skin≥4）才有内顶点可连；web=1 单选时腹杆有了、
       四面体芯还没建，这一组必须继续关着，否则会连到不存在的顶点。 */
    if (skin >= 4) em.forEach(function (E) {
      if (E.f.length !== 2) return;
      /* 抽稀后有一端没有锥 ⇒ 这条内顶点杆不存在（两端都得有锥才连得起来） */
      var P1 = ap[E.f[0]], P2 = ap[E.f[1]];
      if (!P1 || !P2) return;
      pushS(innerS, P1, P2, 0.5 * (cR(E.u) + cR(E.v)) * 0.40);
    });
  }

  tetR.sort(function (x, y) { return x - y; });
  apexR.sort(function (x, y) { return x - y; });

  /* ---- 耗材：杆体积 ∝ 长度（同一族里杆径是同一套口径），所以直接报【杆总长】。
     外层杆的 r 是占位（真实半径在建几何时按 P 的杆径算），所以外层只计长度；
     内层杆带各自 r，顺手把体积也算出来，方便和「芯占多少」对照。
     模型单位不是 mm —— 这里不假装给克数，要克数得老师自己定缩放与材料密度。 */
  var lenOut = 0, lenIn = 0, lenCore = 0;
  for (i = 0; i < net.struts.length; i++) lenOut += d2(net.struts[i].a, net.struts[i].b);
  [tie, spoke, in2, brace, apexS, innerS].forEach(function (arr, ai) {
    for (var q = 0; q < arr.length; q++) {
      var Lq = d2(arr[q].a, arr[q].b);
      lenIn += Lq;
      if (ai >= 4) lenCore += Lq;      /* apexS / innerS 才是"内芯"，前四组是壳与腹杆 */
    }
  });

  var stats = {
    lmode: lmode, lam: lam, lamPhys: lamPhys, aMed: aMed, aRef: aRef, aMax: aMax,
    Req: Req, tetK: tetK,
    hNom: (1 - lam) * Req,
    hOverA: (1 - lam) * Req / Math.max(1e-9, aRef),              /* 芯厚 ÷ 外层边长 ⇒ 0.8165 */
    hTetOverA: (1 - lam) * Req > 0 ? (K824 * lam * aRef) / Math.max(1e-9, lam * aRef) : 0,
    nV2: V2.length, nTet: tets.length, nTie: tie.length, nIn2: in2.length,
    /* nFace = 内层三角网的三角面总数（= T.length），nTet = 其中【真立了锥】的个数。
       抽稀只改后者：网还是那张网（756 个面），只是不是每个面都长锥 ——
       所以读数里必须两个数都印，别把 nTet 当"三角面数"报出去。 */
    nFace: T.length,
    nBrace: brace.length, nApex: apexS.length, nInner: innerS.length,
    web: web, phase: phase, nSpoke: spoke.length,
    core: core, coreStep: coreStep,
    lenOut: lenOut, lenIn: lenIn, lenCore: lenCore,
    lenAll: lenOut + lenIn,
    /* 内芯占全部耗材的比例：这是老师要看的那个数 —— 降档就是把这个百分比压下去 */
    coreShare: (lenOut + lenIn) > 1e-12 ? lenCore / (lenOut + lenIn) : 0,
    /* 格心 V 与钢架可见中心（poly 平均）的最大偏差：旧版径向杆"戳出来"的根源，
       以 ‰蛋高 报，读者能直接对上截图里的那截柱子。 */
    ctrOff: ctrOff,
    nStruts2: tie.length + spoke.length + in2.length + brace.length + apexS.length + innerS.length,
    hTetMed: tets.length ? hSum / tets.length : 0,
    tetRatio: tetR.length ? tetR[(tetR.length / 2) | 0] : 0,
    tetLo: tetR.length ? tetR[0] : 0,
    tetHi: tetR.length ? tetR[tetR.length - 1] : 0,
    apexMed: apexR.length ? apexR[(apexR.length / 2) | 0] : 0,
    apexHi: apexR.length ? apexR[apexR.length - 1] : 0,
    rMin: rMin === 1e9 ? 0 : rMin, rMax: rMax === -1e9 ? 0 : rMax, nClamp: nClamp
  };
  var out = { V2: V2, tets: tets, ap: ap, tie: tie, spoke: spoke, in2: in2, brace: brace,
              apexS: apexS, innerS: innerS, stats: stats };
  F0L2_CACHE = { k: key, v: out };
  return out;
}

/* ---- 蛋面钢架 · 建几何 ---- */
function f0HexColor(pct, st) {
  var t = (pct - st.min) / Math.max(1e-9, st.max - st.min);
  var c0 = new THREE.Color(0x2f6fb5), c1 = new THREE.Color(0xd08a1e);
  return c0.clone().lerp(c1, Math.pow(Math.max(0, Math.min(1, t)), 0.55));
}

function f0HexBuild(P) {
  var net = f0HexNet(P);
  if (!net || !net.cells.length) return null;
  var st = net.stats, g = new THREE.Group(), i, j, k;

  var H = st.H;
  var nodeK = Math.max(0.6, Math.min(3.5, (P.hxNode === undefined ? 1.35 : P.hxNode)));
  /* 杆径（cells[].rr 与 struts[].r）已在 f0HexNet 里算好 —— 读数与几何必须同一份，
     否则屏上印的数与画出来的杆是两套口径。 */

  /* ---- 外层杆：六棱柱（六边形断面的钢杆，与「六边」呼应）----
     几何走 f0StrutGeo（与外层/内层/芯共用同一份代码），两端各自取色
     ⇒ 同一根杆内部也有渐变，比「一根杆一个色」细腻。
     单色钢档（cmap=5）时 f0CmapColor 返回 null ⇒ 退回原来的素色钢灰。 */
  var useC = f0CmapKind(P) !== 5;
  var matOut = new THREE.MeshPhongMaterial({
    color: useC ? 0xffffff : 0x5b6876, vertexColors: useC,
    shininess: 46, specular: 0x9fb0c0, side: THREE.DoubleSide });
  var mesh = new THREE.Mesh(f0StrutGeo(net.struts, 6, P, st), matOut);
  mesh.name = 'hexStruts';
  g.add(mesh);

  /* ---- 节点：每个三角面重心一颗八面体（对偶顶点 = 三根杆的交汇处）----
     ⚠ 节点必须放在 triC（三角面重心）上，不能放在原网格顶点上 ——
       原顶点是六边形的【中心】，放在那儿节点就跑到格子中间去了。 */
  var triR = new Array(net.T.length).fill(0);
  for (i = 0; i < net.struts.length; i++) {
    var S2 = net.struts[i];
    if (S2.r > triR[S2.f1]) triR[S2.f1] = S2.r;
    if (S2.r > triR[S2.f2]) triR[S2.f2] = S2.r;
  }
  var np = [], ni = [], ncol = [], nbase = 0;
  var OCT = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  var OF = [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]];
  for (i = 0; i < net.T.length; i++) {
    var R3 = Math.max(0.0006, triR[i] * nodeK);
    var q2 = net.triC[i];
    var cN = useC ? f0CmapColor(P, f0MapVal(P, q2, st)) : null;
    for (k = 0; k < 6; k++) {
      np.push(q2[0] + OCT[k][0] * R3, q2[1] + OCT[k][1] * R3, q2[2] + OCT[k][2] * R3);
      if (useC) ncol.push(cN[0], cN[1], cN[2]);
    }
    for (k = 0; k < 8; k++) ni.push(nbase + OF[k][0], nbase + OF[k][1], nbase + OF[k][2]);
    nbase += 6;
  }
  if (np.length) {
    var ng = new THREE.BufferGeometry();
    ng.setAttribute('position', new THREE.Float32BufferAttribute(np, 3));
    if (useC) ng.setAttribute('color', new THREE.Float32BufferAttribute(ncol, 3));
    ng.setIndex(ni);
    var ng2 = ng.toNonIndexed(); ng2.computeVertexNormals();
    var nm = new THREE.Mesh(ng2, new THREE.MeshPhongMaterial({
      color: useC ? 0xffffff : 0x3f4a56, vertexColors: useC,
      shininess: 30, specular: 0x8899a8, side: THREE.DoubleSide }));
    nm.name = 'hexNodes';
    g.add(nm);
  }

  /* ---- 薄壳：每格一片半透明面板（按面积占比上色），换 cutSkin=2 才出 ---- */
  if ((P.cutSkin | 0) === 2 || (P.cutSkin | 0) === 5) {
    var pp = [], pc = [], pi = [], pb = 0;
    for (i = 0; i < net.cells.length; i++) {
      var cc = net.cells[i], n = cc.poly.length;
      var mx = 0, my = 0, mz = 0;
      for (j = 0; j < n; j++) { mx += cc.poly[j][0]; my += cc.poly[j][1]; mz += cc.poly[j][2]; }
      mx /= n; my /= n; mz /= n;
      /* 薄壳跟杆走【同一条色带】（按位置取色），这样壳与杆是一个整体；
         单色钢档才退回原来那套「按面积占比双色渐变」。 */
      var col;
      if (useC) { var cq2 = f0CmapColor(P, f0MapVal(P, [mx, my, mz], st)); col = new THREE.Color(cq2[0], cq2[1], cq2[2]); }
      else col = f0HexColor(cc.pct, st);
      pp.push(mx, my, mz); pc.push(col.r, col.g, col.b);
      for (j = 0; j < n; j++) {
        var q3 = cc.poly[j];
        pp.push(mx + (q3[0] - mx) * 0.92, my + (q3[1] - my) * 0.92, mz + (q3[2] - mz) * 0.92);
        pc.push(col.r, col.g, col.b);
      }
      for (j = 0; j < n; j++) pi.push(pb, pb + 1 + j, pb + 1 + ((j + 1) % n));
      pb += n + 1;
    }
    var pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3));
    pg.setAttribute('color', new THREE.Float32BufferAttribute(pc, 3));
    pg.setIndex(pi); pg.computeVertexNormals();
    var pm = new THREE.Mesh(pg, new THREE.MeshPhongMaterial({
      vertexColors: true, shininess: 18, specular: 0x223344, transparent: true,
      opacity: 0.34, side: THREE.DoubleSide, depthWrite: false }));
    pm.name = 'hexPanels';
    g.add(pm);
  }

  /* ---- 第二层（内层正三角网）＋ 芯：cutSkin ≥ 3 才出 ----
     tie   层间径向杆：外层每格中心 ↔ 内层对应顶点
     in2   内层三角网：原三角网的每条边
     brace 斜撑：把「外层棱 + 内层棱」封成四面体（抗剪，只有 ≥4 才有）
     apexS 四面体侧棱：内层三角形 → 蛋内的第 4 点（≥4）
     innerS 内顶点互连：相邻四面体的内顶点相连（≥4） */
  var L2 = null;
  if ((P.cutSkin | 0) >= 3) L2 = f0HexL2(P);
  if (L2) {
    var matIn = new THREE.MeshPhongMaterial({
      color: useC ? 0xffffff : 0x4d5966, vertexColors: useC,
      shininess: 40, specular: 0x9fb0c0, side: THREE.DoubleSide });
    var addL = function (nm2, list, sides) {
      if (!list || !list.length) return;
      var m2 = new THREE.Mesh(f0StrutGeo(list, sides, P, st), matIn);
      m2.name = nm2; g.add(m2);
    };
    addL('hexTie', L2.tie, 4);
    addL('hexSpoke', L2.spoke, 4);
    addL('hexIn2', L2.in2, 4);
    addL('hexBrace', L2.brace, 4);
    addL('hexApex', L2.apexS, 4);
    addL('hexInner', L2.innerS, 4);

    /* 内层节点：那个位置是「1 根层间杆 + 3 根内层杆 + 4 根斜撑」的交汇。
       不给节点就是虚接，远看像几根杆悬在空中碰上了。 */
    var ip = [], ii = [], ic2 = [], ib2 = 0;
    var ir = Math.max(0.0006, L2.stats.rMax * 1.25);
    for (i = 0; i < L2.V2.length; i++) {
      var v2p = L2.V2[i], cn2 = useC ? f0CmapColor(P, f0MapVal(P, v2p, st)) : null;
      for (k = 0; k < 6; k++) {
        ip.push(v2p[0] + OCT[k][0] * ir, v2p[1] + OCT[k][1] * ir, v2p[2] + OCT[k][2] * ir);
        if (useC) ic2.push(cn2[0], cn2[1], cn2[2]);
      }
      for (k = 0; k < 8; k++) ii.push(ib2 + OF[k][0], ib2 + OF[k][1], ib2 + OF[k][2]);
      ib2 += 6;
    }
    if (ip.length) {
      var ig = new THREE.BufferGeometry();
      ig.setAttribute('position', new THREE.Float32BufferAttribute(ip, 3));
      if (useC) ig.setAttribute('color', new THREE.Float32BufferAttribute(ic2, 3));
      ig.setIndex(ii);
      var ig2 = ig.toNonIndexed(); ig2.computeVertexNormals();
      var im = new THREE.Mesh(ig2, new THREE.MeshPhongMaterial({
        color: useC ? 0xffffff : 0x424e5c, vertexColors: useC,
        shininess: 30, specular: 0x8899a8, side: THREE.DoubleSide }));
      im.name = 'hexNodes2';
      g.add(im);
    }
  }

  /* ---- 轴：上下穿过两颗极点格的中心（构造上就是 r=0 那个点）---- */
  var axp = [new THREE.Vector3(0, -st.H / 2 - 0.06 * st.H, 0),
             new THREE.Vector3(0, st.H / 2 + 0.06 * st.H, 0)];
  var axl = new THREE.Line(new THREE.BufferGeometry().setFromPoints(axp),
    new THREE.LineBasicMaterial({ color: 0x9aa6b6 }));
  axl.name = 'hexAxis';
  g.add(axl);

  /* ---- 分层查看：hxView 1 = 只看外层（藏非外层）；2 = 只看芯（藏外层）----
     藏的是 mesh.visible，几何照建（build 仍返回同一份 group），所以
     「看得见什么」与「算出来什么」不会打架 —— 读数永远报的是全部建出来的量。
     ⚠ 必须带 cutSkin>=3 的门槛：切回单层时参数项虽隐藏，P.hxView 还留着旧值，
        不设门槛就会把唯一的外层藏掉 ⇒ 画面空掉（而读数照旧报数，最难查的那种）。 */
  var hxView = (P.hxView | 0);
  if (hxView > 0 && (P.cutSkin | 0) >= 3) {
    var OUTER = { hexStruts: 1, hexNodes: 1, hexPanels: 1 };
    for (var ci = 0; ci < g.children.length; ci++) {
      var ch = g.children[ci], isOuter = !!OUTER[ch.name];
      if (isOuter === (hxView === 2)) ch.visible = false;
    }
  }

  /* ---- 2D 正投影用的「杆轴线」清单（2026-11-03 老师要的正视/俯视平面图）----
     为什么不从 geometry 里抠三角面：杆是六棱柱，抠出来是 24 个三角形，
     投影后是一团密集短线，看不出结构。这里直接存杆的【轴线】，
     2D 图就是一张干净的工程正投影。颜色取杆中点、已转回 sRGB（Canvas 不吃线性色）。
     扁平数组 9 个数一根：ax ay az bx by bz r g b。 */
  var segArr = [];
  var OUT2 = { hexStruts: 1, hexNodes: 1, hexPanels: 1 };
  function segVisible(nm) {
    if (!(hxView > 0 && (P.cutSkin | 0) >= 3)) return true;
    return (!!OUT2[nm]) === (hxView === 1);
  }
  function pushSeg(list) {
    if (!list || !list.length) return;
    for (var q = 0; q < list.length; q++) {
      var s0 = list[q];
      var mx = (s0.a[0] + s0.b[0]) / 2, my = (s0.a[1] + s0.b[1]) / 2, mz = (s0.a[2] + s0.b[2]) / 2;
      var cr, cg, cb;
      if (useC) {
        var cl = f0CmapColor(P, f0MapVal(P, [mx, my, mz], st));
        cr = f0L2S(cl[0]); cg = f0L2S(cl[1]); cb = f0L2S(cl[2]);
      } else { cr = 0.36; cg = 0.41; cb = 0.47; }
      segArr.push(s0.a[0], s0.a[1], s0.a[2], s0.b[0], s0.b[1], s0.b[2], cr, cg, cb);
    }
  }
  if (segVisible('hexStruts')) pushSeg(net.struts);
  if (L2) {
    if (segVisible('hexTie')) pushSeg(L2.tie);
    if (segVisible('hexIn2')) {
      pushSeg(L2.spoke); pushSeg(L2.in2); pushSeg(L2.brace);
      pushSeg(L2.apexS); pushSeg(L2.innerS);
    }
  }
  g.userData.f0seg = segArr.length ? segArr : null;

  /* 剖面（2026-11-04）要用的子午线样本：单位与 mesh 完全一致（都用 st.sc 缩放、tMid 摆正），
     所以页面侧拿它算出来的剖面膜严丝合缝贴在杆件上，不需要再乘任何系数。
     放 userData 而不是让页面回算：回算等于把建网公式抄第二遍，抄错就是"膜与壳差一层"。 */
  var secS = [], secMax = 0, tMid3 = (st.t0 + st.t1) / 2;
  for (i = 0; i < net.pf.pr.length; i++) {
    var yy = (net.pf.pr[i][0] - tMid3) * st.sc, rr2 = net.pf.pr[i][1] * st.sc;
    secS.push([yy, rr2]);
    if (rr2 > secMax) secMax = rr2;
  }
  g.userData.f0sec = { samples: secS, H: st.H, rmax: secMax };

  g.userData.noArray = true;          /* 轴对称体：圆周阵列只会叠出重合杆 */
  g.userData.f0hex = st;
  g.userData.f0hex2 = L2 ? L2.stats : null;
  return g;
}

/* ---- 2D：母线上的分行图 ----
   钢架模式下 2D 窗不再画「切面内截面」（那是锥面那套），改画【半条母线 + 每道纬圈的位置】。
   这样「靠近尖/钝的纬线更密」不用听我说，尺子就在图上：相邻两条横线的间距自己看。
   轮廓本身就是 f0HexNet 用的那条折线，所以 2D 与 3D 不可能对不上。 */
function f0HexProf2D(ctx,W,H,P){
  var net=f0HexNet(P), pf=net?net.pf:null;
  if(!net||!pf){
    ctx.fillStyle='#8a95a5';ctx.font='12px sans-serif';
    ctx.fillText('这档铺不出蛋面钢架：母线必须能切出【闭合的蛋】',10,H/2);
    return;
  }
  var st=net.stats,tMin=pf.t0,tMax=pf.t1,tSpan=Math.max(1e-6,tMax-tMin);
  var tMid=(tMin+tMax)/2,pad=22;
  var sc=Math.min((W-2*pad)/(2*pf.umax*1.10),(H-2*pad-20)/tSpan)*0.94;
  var X=function(u){return W/2+u*sc;},T=function(t){return (H-20)/2-(t-tMid)*sc;};
  ctx.strokeStyle='#eef1f6';ctx.lineWidth=1;
  var i2;
  for(i2=1;i2<=4;i2++){
    var tt0=tMin+tSpan*i2/5;
    ctx.beginPath();ctx.moveTo(6,T(tt0));ctx.lineTo(W-6,T(tt0));ctx.stroke();
  }
  ctx.strokeStyle='#d6dde8';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(X(0),8);ctx.lineTo(X(0),H-20);ctx.stroke();

  /* 纬圈：每条一行，长度 = 该行半径（左右对称画） */
  ctx.strokeStyle='#9fb6d6';ctx.lineWidth=1.1;
  for(i2=0;i2<net.ringT.length;i2++){
    var r2=net.ringU[i2];
    if(r2<1e-6)continue;
    ctx.beginPath();
    ctx.moveTo(X(-r2),T(net.ringT[i2]));
    ctx.lineTo(X(r2),T(net.ringT[i2]));
    ctx.stroke();
  }
  /* 母线（钢架格子的分界就落在这条线上） */
  ctx.strokeStyle='#c0392b';ctx.lineWidth=2.2;
  ctx.beginPath();
  for(i2=0;i2<pf.pr.length;i2++){
    var px=X(pf.pr[i2][1]),py=T(pf.pr[i2][0]);
    if(i2)ctx.lineTo(px,py);else ctx.moveTo(px,py);
  }
  ctx.stroke();

  /* 双层时把【内层母线】也画出来（λ 缩放：半径 ×λ，沿轴也 ×λ）。
     这条线是「第二层是不是真的相似蛋面」的自证：形状必须与红线同形、只是小一圈。
     顺手每 6 道纬圈画一根层间杆 —— 2D 里能直接看出层间距有多厚。 */
  if ((P.cutSkin | 0) >= 3) {
    var L2d = f0HexL2(P);
    if (L2d) {
      var lm2 = L2d.stats.lam, i3;
      ctx.save();
      ctx.strokeStyle='#2f7d4f'; ctx.lineWidth=1; ctx.globalAlpha=0.55;
      for (i3 = 0; i3 < net.ringT.length; i3 += 6) {
        var uu3 = net.ringU[i3], tt3 = net.ringT[i3];
        if (uu3 < 1e-6) continue;
        var ty3 = tMid + (tt3 - tMid) * lm2;
        ctx.beginPath(); ctx.moveTo(X(uu3), T(tt3)); ctx.lineTo(X(uu3 * lm2), T(ty3)); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(X(-uu3), T(tt3)); ctx.lineTo(X(-uu3 * lm2), T(ty3)); ctx.stroke();
      }
      ctx.globalAlpha=1;
      ctx.setLineDash([5,4]);
      ctx.strokeStyle='#2f7d4f'; ctx.lineWidth=1.8;
      ctx.beginPath();
      for (i3 = 0; i3 < pf.pr.length; i3++) {
        var ux3 = pf.pr[i3][1] * lm2, ty4 = tMid + (pf.pr[i3][0] - tMid) * lm2;
        if (i3) ctx.lineTo(X(ux3), T(ty4)); else ctx.moveTo(X(ux3), T(ty4));
      }
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle='#2f7d4f'; ctx.font='10.5px sans-serif';
      ctx.fillText('内层 λ=' + (lm2 * 100).toFixed(1) + '%（相似蛋面 · 绿虚线）', 6, 24);
    }
  }

  ctx.fillStyle='#8a95a5';ctx.font='10.5px sans-serif';
  ctx.fillText('母线分行图 · 每道横线 = 一行六边形（等轴）',6,11);
  ctx.fillStyle='#12305e';ctx.font='11px sans-serif';
  ctx.fillText('M='+st.nRings+' 行　q='+st.q.toFixed(2)+'　赤道 : 极点 行距 = '+
    st.hRatio.toFixed(2)+'×　格 '+st.n+'（六 '+st.n6+'）',6,H-6);
}

/* ---- 蛋面钢架 · 读数 ---- */
function f0HexRead(P) {
  var rows = [], R = f0Solve(P), net = f0HexNet(P);
  var skin = (P.cutSkin | 0);
  var SKN = ['原样', '单层钢架（正六边形平铺）', '单层 + 薄壳',
             '双层壳体（外层六边形 + 内层正三角 + 节点连接）',
             '双层 + 斜撑 + 四面体芯（完整空间桁架）',
             '双层 + 斜撑 + 四面体芯 + 薄壳'];
  rows.push(['表面构建', '<b>' + (SKN[skin] || '蛋面钢架') + '</b>（蛋 = 斜切出来的曲线绕长轴旋转）']);
  if (!net) {
    rows.push(['⚠ 铺不出钢架', '钢架只对「单叶双曲面 ⇒ 闭合蛋」成立。' +
      '当前母线是「' + (R.def ? R.def.name : '?') + '」，或者 α/z₀ 让交线开口了 —— ' +
      '先把母线换回 1/Y、把 α 调小']);
    return rows;
  }
  var st = net.stats;
  rows.push(['蛋面', '长轴 L ' + st.L.toFixed(4) + '（斜切曲线的真实长度 · 平面内 ' + (st.t1 - st.t0).toFixed(4) + '）']);
  rows.push(['母线分行 M', '目标 ' + st.mTarget + ' ⇒ 实得 <b>' + st.nRings + '</b> 行' +
    '（含两极；每行 = 一道纬圈。实得是「列数量化到 6 的倍数」后的整数解，' +
    '不可能每个 M 都刚好凑上，差 1~3 行是正常的）']);
  rows.push(['两端加密 q', st.q.toFixed(2) + '（行距 ∝ 半径^q ⇒ 0=等弧长，1=越靠尖/钝越密）']);

  /* 行距比：赤道最疏、极点最密 —— 这行是「非线性采样真生效」的证据 */
  rows.push(['纬圈行距 赤道 : 极点', st.hEq.toFixed(4) + ' : ' + st.hPole.toFixed(4) +
    '　= <b>' + st.hRatio.toFixed(2) + '×</b>' +
    '（q=0 等弧长档会退回 1 附近；回不到 1.00 是因为两极的列数被压到 6 的下限，'
    + '末几圈仍然偏密 —— 实测 q=0 是 1.27×，写「必然 1.0×」是拿旧实现当标准）']);
  rows.push(['格数', st.n + ' 格　（六边形 ' + st.n6 + ' · 五边形 ' + st.n5 +
    ' · 七边形 ' + st.n7 + (st.n4 ? ' · 四边形 ' + st.n4 : '') + (st.n8 ? ' · 八边形 ' + st.n8 : '') + '）']);
  rows.push(['欧拉账 Σ(6−边数)',
    '<b>' + st.euler + '</b>　（球面必须 = 12；算不平就是算错了）']);
  rows.push(['上极格（尖端）', st.tipSides + ' 边 · 格心到轴 <b>' + st.tipR.toFixed(6) + '</b>']);
  rows.push(['下极格（钝端）', st.baseSides + ' 边 · 格心到轴 <b>' + st.baseR.toFixed(6) + '</b>']);
  rows.push(['格面积占比', '最小 ' + st.min.toFixed(3) + '% ／ 中位 ' + st.med.toFixed(3) +
    '% ／ 最大 ' + st.max.toFixed(3) + '%（Σ=100%）']);
  rows.push(['棱杆径（∝ 面积占比^γ）', (st.srMin / st.H * 1000).toFixed(2) + ' ~ ' +
    (st.srMax / st.H * 1000).toFixed(2) + ' ‰蛋高　（比 ' +
    (st.srMax / Math.max(1e-9, st.srMin)).toFixed(2) + '×）']);
  rows.push(['杆长', (st.lenMin / st.H * 1000).toFixed(1) + ' ~ ' +
    (st.lenMax / st.H * 1000).toFixed(1) + ' ‰蛋高　（比 ' +
    (st.lenMax / Math.max(1e-9, st.lenMin)).toFixed(1) + '×　格子大小不一是本意）']);
  rows.push(['短杆上限 0.32×杆长', st.nLenClamp > 0
    ? '夹住了 <b>' + st.nLenClamp + '</b> 根（集中在两极：那里格小杆短，不限就会糊成球）'
    : '本档没有杆碰到上限']);
  rows.push(['杆 / 节点', st.struts + ' 根杆 ／ ' + st.tris + ' 个节点（三杆交汇）']);
  /* 「是不是真的正六边形」—— 量测不看构造公式，读每格六条棱的真实长度。
     1.000 = 完美正六边形。缺陷圈（5/7 边）与极点格不计入。 */
  rows.push(['六棱等长比（正六边形 = 1.000）',
    '中位 <b>' + st.ergMed.toFixed(3) + '</b> ／ 90 分位 ' + st.ergP90.toFixed(3) +
    ' ／ 最差 ' + st.ergHi.toFixed(3) +
    '　≤1.06 的占 ' + st.ergN + ' 格里的 <b>' + st.ergOk + '</b> 格（' +
    (st.ergN ? (st.ergOk / st.ergN * 100).toFixed(1) : '0') + '%）']);
  rows.push(['为什么不是 1.000',
    '每一圈的宽高比 d/行距 ≡ 1.1547（正六边形的值，读数下面一行是实测）。' +
    '但半径是【逐圈在变】的：相邻两圈差 ' + (st.hRatio > 1.001 ? '十几' : '不到一') +
    '个百分点时，每格的「上边」与「下边」本来就一边宽一边窄 —— ' +
    '这是把蜂窝铺到旋转面上绕不过去的事。两条改善路：加密 M（M=60 时中位降到 1.070）' +
    '或把 q 调小（q=0 等弧长时中位 ≈ 1.05，但两端就不密了）。' +
    '「每格一样大」与「两端更密」本来就不能同时成立，本页选了后者 —— 这是老师要的那一条。']);

  /* 逐圈 d/h：正六边形的行距比 1/(√3/2) = 1.15470。这一行是「行距真服从列数」的证据，
     读的是 ringS 的弧长差，不是构造公式（构造公式只能自证）。 */
  var dhOK = 0, dhN = 0, dhWorst = 0, dhAt = -1, ik;
  for (ik = 1; ik < net.ringS.length; ik++) {
    var hk = net.ringS[ik] - net.ringS[ik - 1];
    if (!(hk > 1e-9)) continue;
    var rk = (TAU * net.ringU[ik] / Math.max(1, net.ringN[ik])) / hk;
    dhN++;
    if (Math.abs(rk - 1.1547) <= 0.02) dhOK++;
    if (Math.abs(rk - 1.1547) > dhWorst) { dhWorst = Math.abs(rk - 1.1547); dhAt = ik; }
  }
  rows.push(['每圈 宽/行距（正六边形 = 1.1547）',
    dhN + ' 圈里 <b>' + dhOK + '</b> 圈落在 1.1547±0.02　最偏的是第 ' + dhAt +
    ' 圈（偏 ' + dhWorst.toFixed(3) + '，是收口那一圈：列数被强制降到 6 才能把钝面收住）']);
  /* ---------------- 第二层（内层）---------------- */
  var L2 = (skin >= 3) ? f0HexL2(P) : null;
  if (L2) {
    var s2 = L2.stats;
    rows.push(['—— 第二层（内层）——', '']);
    rows.push(['第二层缩放 λ',
      '<b>' + (s2.lam * 100).toFixed(2) + '%</b>　（以原点为中心的相似缩放 ⇒ 内外层同心、同轴、同形状）']);
    rows.push(['λ 怎么来的', s2.lmode === 1
      ? '手动（滑条给定）'
      : ('物理最优：芯厚 h = 0.8165 × a　⇒ λ = 1 − h/R　R=' + s2.Req.toFixed(4) +
         '（赤道半径）　a=' + s2.aRef.toFixed(4) + '（三角网边长的 90 分位 ≈ 赤道那批最大的格子）' +
         '　⇒ 实测 芯厚 ÷ 外层边长 = <b>' + s2.hOverA.toFixed(4) + '</b>（正四面体高 ÷ 底边 = 0.8165）')]);
    rows.push(['为什么取 90 分位、不取中位',
      '三角网上绝大多数边挤在极点附近（那里格子最小），中位只代表"小格子"。' +
      '按中位定 λ 会把芯压成薄饼（实测中位档：λ=86.5%、层间距只有 4.8% 蛋高、h/a=0.26）。' +
      '按 90 分位定 ⇒ 赤道那批最大的格子严格是正四面体；两端格子小、该处 h/a 偏小（芯相对更薄），' +
      '但那里杆短，本来就不容易屈曲。边长范围：中位 ' + s2.aMed.toFixed(4) +
      ' ／ 90 分位 ' + s2.aRef.toFixed(4) + ' ／ 最大 ' + s2.aMax.toFixed(4) +
      '（' + (s2.aMax / Math.max(1e-9, s2.aMed)).toFixed(1) + '×）']);
    rows.push(['为什么这么定',
      '四面体取【正四面体】：j=4、b=6，Maxwell 判据 3j−6 = 6 = b ⇒ 恰好静定、无多余杆；' +
      '六根杆等长 ⇒ 只受轴力、零弯矩 ⇒ 材料全用在拉压上。' +
      '所以「层间距 = 0.8165 × 内层三角形边长」不是拍的，是省材料的最优解。']);
    rows.push(['层间距 h（赤道）', s2.hNom.toFixed(4) + '　= (1−λ)·R　／蛋高 = ' +
      (s2.hNom / st.H * 100).toFixed(1) + '%　／外层边长 = ' + s2.hOverA.toFixed(4)]);
    rows.push(['两个高度别混', '芯厚 h = 0.8165 × 【外层】三角网边长（两层之间有多厚）；' +
      '四面体高 = 0.8165 × 【内层】边长（芯里那个尖扎进去多深）。' +
      '它们比的是各自那一层的胞元，所以数值不同 —— 写成一个数就是口径错']);
    rows.push(['内层正三角网', s2.nIn2 + ' 条边 · ' + s2.nTet + ' 个三角面　' +
      '（顶点 ' + s2.nV2 + ' = 外层蜂窝的格数 ⇒ 顶点数一一对应，它是蜂窝的【对偶】）']);
    /* ---- 层间连接：这一行是本轮（2026-11-03）改动的核心，必须讲清「哪一端是节点」---- */
    rows.push(['外层节点在哪', '钢架的节点是 <b>三角面重心 triC</b>（3 根杆交汇），共 ' + st.tris +
      ' 个；六边形的几何中心 V 只是参数点，上面<b>没有杆</b>。' +
      '两者差一个曲率弓高（本档最大 ' + (s2.ctrOff / st.H * 1000).toFixed(2) +
      ' ‰蛋高）—— M 越小格子越大、差得越多，这正是旧版径向杆看着"从六边形中央戳出来"的原因']);
    if (s2.web === 1) {
      rows.push(['层间腹杆', '<b>' + s2.nBrace + '</b> 根　（外层节点 triC ↔ 内层三角面的三个顶点）' +
        '　·　每个外层节点发 6 根（3 条边 × 2 端点）⇒ 上弦节点直接落到下弦节点，' +
        '这才是双层网壳的标准接法。径向直杆在本档为 0 根（它两端都不是节点，已换成这一种）']);
    } else if (s2.web === 2) {
      rows.push(['层间径向杆 + 辐条', '<b>' + s2.nTie + '</b> 根径向 ＋ <b>' + s2.nSpoke +
        '</b> 根面内辐条　（每个格心先用 6 根辐条连到它周围 6 个 triC，把格心做成真节点，再往内打径向杆）' +
        '　·　杆数最多、但格心处确实有节点']);
    } else {
      rows.push(['层间径向杆', '<b>' + s2.nTie + '</b> 根　（格心 ↔ 格心）' +
        '　<span style="color:#b03020">⚠ 两端都不在节点上：外层端是格心 V（无杆）、内层端才是节点 ⇒ 虚接，' +
        '只留作反例。要真连接请把「层间连接」切到「节点斜腹杆」</span>']);
    }
    if (Math.abs(s2.phase) > 0.001) {
      rows.push(['第二层相位角', s2.phase.toFixed(1) + '°　（绕长轴转）　·　作用是把内层杆与外层杆在' +
        '投影上错开，不是"让两层节点对齐"——三角网顶点（半径 λR）与外层节点（半径 <R）本来就不在同一个旋转面上，' +
        '转多少度都重合不了，这条只是把两层画面上分开好辨认']);
    }
    if (skin >= 4) {
      rows.push(['斜撑（抗剪）', s2.nBrace + ' 根　（每条外层棱 4 根，把「外层棱 + 内层棱」封成四面体。' +
        '⚠ 只有径向杆时芯是【柱阵】—— 抗压不抗剪，两层能面内滑移，是机构不是结构）']);
      /* ---- 内芯密度（2026-11-04 老师：内部支撑太密，3D 打印要省料又得够稳）---- */
      var coreName = ['不建内芯（双层壳 + 腹杆）', '稀疏 · 每 4 个三角面留 1 个锥',
                      '中 · 每 2 个三角面留 1 个锥', '全建（每个三角面一个锥）'][s2.core] || '?';
      rows.push(['内芯密度', '<b>' + coreName + '</b>　·　锥 ' + s2.nTet + ' 个' +
        (s2.core === 0
          ? '　（<b>芯里是空的</b>：只剩外层蜂窝 + 层间腹杆 + 内层三角网。省料最多，抗压靠双层壳、抗剪靠腹杆）'
          : s2.core < 3
            ? '　（留下的锥底座仍压在内层三角网上 ⇒ 与壳连通，不是悬空柱；' +
              '相邻两个锥都留下了才连内顶点）'
            : '　（每个三角面都立锥 ⇒ 内顶点连成三正则网，最费料也最刚）')]);
      rows.push(['耗材（杆总长）', '外层 ' + s2.lenOut.toFixed(2) + ' ＋ 内层 ' + s2.lenIn.toFixed(2) +
        ' ＝ <b>' + s2.lenAll.toFixed(2) + '</b> 模型单位　·　<b>内芯占 ' +
        (s2.coreShare * 100).toFixed(1) + '%</b>（芯 = 锥侧棱 + 内顶点互连）' +
        '　·　杆径一样时耗材 ∝ 这段长度，所以降档就看这个百分比']);
      if (s2.nTet > 0) {
        rows.push(['四面体芯', s2.nTet + ' 个 · 高 ' + (s2.hTetMed / st.H * 1000).toFixed(1) +
          ' ‰蛋高 · 六棱等长比中位 <b>' + s2.tetRatio.toFixed(3) + '</b>（正四面体 = 1.000；' +
          '最差 ' + s2.tetHi.toFixed(3) + '）。比值不是 1.000 是因为三角网本身不是严格正三角：' +
          '底座三条边就有 ' + (s2.aMax / Math.max(1e-9, s2.aMed)).toFixed(1) + ' 倍的差，' +
          '剩下的差距全来自底座']);
        rows.push(['三条侧棱等长比（必须 = 1.000）',
          '中位 <b>' + s2.apexMed.toFixed(4) + '</b> ／ 最差 ' + s2.apexHi.toFixed(4) +
          '　（顶点立在外心 + 沿底座法向 ⇒ 外心到三顶点等距、方向垂直 ⇒ 三条侧棱严格等长。' +
          '这一行是「外心算得对不对」的直接裁判，六棱比那一行则掺进了网格本身的形状）']);
        rows.push(['内顶点互连', s2.nInner + ' 根　（相邻四面体的内顶点两两相连 ⇒ 内层三正则网，' +
          '与内层三角网互为对偶）']);
      } else {
        rows.push(['四面体芯', '<b>本档一个都不建</b>（内芯密度 = 不建内芯）。' +
          '这不是"没算出来"：抽稀步长取 0 时整块芯都被省掉，省的是耗材不是精度 —— ' +
          '圆锥壳的抗压本来就靠双层壳，芯只负责抗剪与抗局部失稳']);
      }
    } else if (s2.web === 1) {
      rows.push(['这一档（无四面体芯）', '腹杆已是节点对节点的斜杆 ⇒ 整层是完整空间桁架，抗剪成立；' +
        '只是还没往蛋内立四面体。切到「★ 双层 + 斜撑 + 四面体芯」再往内伸一层']);
    } else {
      rows.push(['⚠ 这一档没有斜腹杆', '芯只有径向杆/辐条：抗压可以、抗剪为零（两层能相对面内滑移）。' +
        '把「层间连接」切到「节点斜腹杆」，或升到「★ 双层 + 斜撑 + 四面体芯」才是完整桁架']);
    }
    rows.push(['芯杆径', (s2.rMin / st.H * 1000).toFixed(2) + ' ~ ' +
      (s2.rMax / st.H * 1000).toFixed(2) + ' ‰蛋高（外层杆的 0.42~0.58 倍，细一档好分层）' +
      (s2.nClamp ? '　短杆上限夹住 ' + s2.nClamp + ' 根' : '')]);
    rows.push(['二层总杆数', '<b>' + s2.nStruts2 + '</b> 根（＋外层 ' + st.struts + ' 根 = ' +
      (s2.nStruts2 + st.struts) + ' 根）']);
    /* 顶点合计：不是拍脑袋的「大概」，而是按建几何的定值算 ——
       外层杆 6 棱柱 = 24 三角 = 72 顶点/根，节点八面体 = 8 面 = 24 顶点/个，
       内层与芯全用 4 棱柱 = 16 三角 = 48 顶点/根。M 一推高它涨得很快，
       所以这一行是给「会不会卡」一个可核的数（不含薄壳）。 */
    var vOuter = st.struts * 72 + st.tris * 24;
    if (L2) vOuter += s2.nStruts2 * 48 + s2.nV2 * 24;
    rows.push(['顶点合计', '<b>' + vOuter + '</b> 个（M=26 时约 56 万；M=58 约 415 万、构建约 1.4 秒' +
      '　·　按 外层杆×72 ＋ 节点×24 ＋ 内层/芯杆×48 ＋ 内层节点×24 现算，不含薄壳）']);
  }

  /* ---------------- 剖面（2026-11-04 老师：左侧 3D 图要能看剖面）----------------
     这一行必须写出【切在哪、切掉哪边、还剩多少】——只写"已剖开"等于没写：
     平面滑到模型外面时屏上会一片空白，读者需要在这里看到原因。 */
  var sax = (P.hxSec | 0);
  if (sax >= 1 && sax <= 3) {
    var sName = ['', 'xy 平面（法向 z · 沿 z 滑）', 'zy 平面（法向 x · 沿 x 滑）', 'zx 平面（法向 y · 沿 y 滑）'][sax];
    var sHalf = (sax === 3) ? st.H / 2 : net.pf.umax * st.sc;
    var sOff = Math.max(-100, Math.min(100, (P.hxSecOff === undefined ? 0 : +P.hxSecOff))) / 100;
    var sD = sOff * sHalf;
    var sKeep = (P.hxSecSide | 0) ? '≥' : '≤';
    var sLeft = (sax === 3) ? ('保留 y ' + sKeep + ' ' + sD.toFixed(3))
                            : ('保留 ' + (sax === 1 ? 'z' : 'x') + ' ' + sKeep + ' ' + sD.toFixed(3));
    var sOut = Math.abs(sOff) >= 0.999;
    rows.push(['剖面', '<b>' + sName + '</b>　·　切掉 <b>' + ((P.hxSecSide | 0) ? '−' : '+') +
      (sax === 1 ? 'z' : sax === 2 ? 'x' : 'y') + '</b> 那一侧　·　' + sLeft +
      (sOut ? '<br><span style="color:#b03020">⚠ 平面已滑到模型外：这一侧没有东西可留，' +
        '屏上是空的 —— 把滑条往回拉</span>' : '')]);
  } else {
    rows.push(['剖面', '不剖（整体）。要看内部就把「剖开看内部」切到 xy / zy / zx 任一面 —— ' +
      '切面是 GPU 裁剪算出来的，杆件被真切开（断口是空心的管口），不是少画几根']);
  }

  /* ---------------- 配色 ---------------- */
  var ck = f0CmapKind(P);
  if (ck === 5) {
    rows.push(['配色', '单色钢灰（无渐变）']);
  } else {
    rows.push(['配色', 'cmap = <b>' + F0_CMAP_NAMES[ck] + '</b>　映射：' +
      ['沿蛋轴高度（尖 → 钝一条渐变）', '沿半径（赤道深、两端浅）', '沿经度（绕一圈出彩虹）'][P.hxMapT | 0] +
      '　· 每根杆两端各自取色 ⇒ 杆内也有渐变']);
    rows.push(['色表口径', '11 点近似采样，不是 matplotlib 的 256 色原表（首尾与中段对得上）。' +
      '顶点色已做 sRGB → 线性转换，否则 plasma 的低端会糊成近黑']);
  }

  rows.push(['⚠ 拓扑', '球面上不可能全是正六边形：Σ(6−边数)≡12。' +
    '极点两格是六边形（构造保证），多出来的五/七边形是「每行格数不同」拉链处的必然结果']);
  return rows;
}
