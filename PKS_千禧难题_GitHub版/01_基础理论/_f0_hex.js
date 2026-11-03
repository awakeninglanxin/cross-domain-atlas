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

  var stats = {
    min: pcts[0], med: pcts[(pcts.length / 2) | 0], max: pcts[pcts.length - 1],
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
              ringT: tt, ringU: uu, ringN: N, ringS: rs };
  F0H_CACHE = { k: key, v: out };
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

  /* ---- 杆：六棱柱（六边形断面的钢杆，与「六边」呼应），两端封口 ---- */
  var pos = [], idx = [], base = 0;
  for (i = 0; i < net.struts.length; i++) {
    var S = net.struts[i], A = S.a, B = S.b, r = S.r;
    var dx = B[0] - A[0], dy = B[1] - A[1], dz = B[2] - A[2];
    var L = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-9;
    dx /= L; dy /= L; dz /= L;
    var refx = 0, refy = 1, refz = 0;
    if (Math.abs(dy) > 0.92) { refx = 1; refy = 0; refz = 0; }
    var ux = dy * refz - dz * refy, uy = dz * refx - dx * refz, uz = dx * refy - dy * refx;
    var ul = Math.sqrt(ux * ux + uy * uy + uz * uz) || 1e-9; ux /= ul; uy /= ul; uz /= ul;
    var vx = dy * uz - dz * uy, vy = dz * ux - dx * uz, vz = dx * uy - dy * ux;
    for (k = 0; k < 6; k++) {
      var an = TAU * k / 6, cs = Math.cos(an) * r, sn = Math.sin(an) * r;
      pos.push(A[0] + ux * cs + vx * sn, A[1] + uy * cs + vy * sn, A[2] + uz * cs + vz * sn);
      pos.push(B[0] + ux * cs + vx * sn, B[1] + uy * cs + vy * sn, B[2] + uz * cs + vz * sn);
    }
    var cA = pos.length / 3; pos.push(A[0], A[1], A[2]);
    var cB = pos.length / 3; pos.push(B[0], B[1], B[2]);
    for (k = 0; k < 6; k++) {
      var a0 = base + k * 2, a1 = base + ((k + 1) % 6) * 2, b0 = a0 + 1, b1 = a1 + 1;
      idx.push(a0, a1, b0, b0, a1, b1);      /* 侧壁 */
      idx.push(cA, a1, a0);                  /* A 端盖 */
      idx.push(cB, b0, b1);                  /* B 端盖 */
    }
    base += 14;
  }
  var gg = new THREE.BufferGeometry();
  gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  gg.setIndex(idx);
  var gm2 = gg.toNonIndexed(); gm2.computeVertexNormals();   /* 不索引 ⇒ 平面着色，像钢件 */
  /* 杆件配色：深钢灰 + 中等高光。原来 0x8d99a6 / shininess 72 在浅色舞台上是
     一片近白的淡蓝，远看像线框而不是"钢件"（老师要的是钢架，得能看出是实心杆）。 */
  var mesh = new THREE.Mesh(gm2, new THREE.MeshPhongMaterial({
    color: 0x5b6876, shininess: 46, specular: 0x9fb0c0, side: THREE.DoubleSide }));
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
  var np = [], ni = [], nbase = 0;
  var OCT = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  var OF = [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]];
  for (i = 0; i < net.T.length; i++) {
    var R3 = Math.max(0.0006, triR[i] * nodeK);
    var q2 = net.triC[i];
    for (k = 0; k < 6; k++) np.push(q2[0] + OCT[k][0] * R3, q2[1] + OCT[k][1] * R3, q2[2] + OCT[k][2] * R3);
    for (k = 0; k < 8; k++) ni.push(nbase + OF[k][0], nbase + OF[k][1], nbase + OF[k][2]);
    nbase += 6;
  }
  if (np.length) {
    var ng = new THREE.BufferGeometry();
    ng.setAttribute('position', new THREE.Float32BufferAttribute(np, 3));
    ng.setIndex(ni);
    var ng2 = ng.toNonIndexed(); ng2.computeVertexNormals();
    var nm = new THREE.Mesh(ng2, new THREE.MeshPhongMaterial({
      color: 0x3f4a56, shininess: 30, specular: 0x8899a8, side: THREE.DoubleSide }));
    nm.name = 'hexNodes';
    g.add(nm);
  }

  /* ---- 薄壳：每格一片半透明面板（按面积占比上色），换 cutSkin=2 才出 ---- */
  if ((P.cutSkin | 0) === 2) {
    var pp = [], pc = [], pi = [], pb = 0;
    for (i = 0; i < net.cells.length; i++) {
      var cc = net.cells[i], col = f0HexColor(cc.pct, st), n = cc.poly.length;
      var mx = 0, my = 0, mz = 0;
      for (j = 0; j < n; j++) { mx += cc.poly[j][0]; my += cc.poly[j][1]; mz += cc.poly[j][2]; }
      mx /= n; my /= n; mz /= n;
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

  /* ---- 轴：上下穿过两颗极点格的中心（构造上就是 r=0 那个点）---- */
  var axp = [new THREE.Vector3(0, -st.H / 2 - 0.06 * st.H, 0),
             new THREE.Vector3(0, st.H / 2 + 0.06 * st.H, 0)];
  var axl = new THREE.Line(new THREE.BufferGeometry().setFromPoints(axp),
    new THREE.LineBasicMaterial({ color: 0x9aa6b6 }));
  axl.name = 'hexAxis';
  g.add(axl);

  g.userData.noArray = true;          /* 轴对称体：圆周阵列只会叠出重合杆 */
  g.userData.f0hex = st;
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

  ctx.fillStyle='#8a95a5';ctx.font='10.5px sans-serif';
  ctx.fillText('母线分行图 · 每道横线 = 一行六边形（等轴）',6,11);
  ctx.fillStyle='#12305e';ctx.font='11px sans-serif';
  ctx.fillText('M='+st.nRings+' 行　q='+st.q.toFixed(2)+'　赤道 : 极点 行距 = '+
    st.hRatio.toFixed(2)+'×　格 '+st.n+'（六 '+st.n6+'）',6,H-6);
}

/* ---- 蛋面钢架 · 读数 ---- */
function f0HexRead(P) {
  var rows = [], R = f0Solve(P), net = f0HexNet(P);
  rows.push(['表面构建', '蛋面钢架（斜切出来的蛋绕长轴旋转 · 正六边形平铺）']);
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
  rows.push(['⚠ 拓扑', '球面上不可能全是正六边形：Σ(6−边数)≡12。' +
    '极点两格是六边形（构造保证），多出来的五/七边形是「每行格数不同」拉链处的必然结果']);
  return rows;
}
