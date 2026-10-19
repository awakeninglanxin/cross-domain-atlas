/* ============================================================
 * app.js —— 主程序：UI 装配 + 动画循环 + 渲染调度
 * ============================================================ */
(function () {
  'use strict';

  var TAU = Math.PI * 2;

  /* ---------------- 全局状态 ---------------- */
  var state = {
    mode: 'map',            // 'map' 结构映射 | 'tube' 纤维扫掠 | 'dense' 密铺全貌
    n: 1,                   // 当前元素 n ∈ [0,27]
    custom: null,           // {h,j,label,note} —— 直接指定丛（预设/M(h,−h) 层用）
    density: 'mid',         // 密铺视图密度档位
    tau: 0,
    playing: true,
    speed: 0.5,
    autoRotate: true,
    show: {
      A: true, B: true, sphere: true, fiber: true,
      ghost: true, boundary: true, compare: false
    }
  };

  var c3d = null;
  var proj = null;

  /* ---------------- 颜色工具 ---------------- */
  function hslToHex(h, s, l) {
    h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    var m = l - c / 2;
    var r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; } else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
    function q(v) { return ('0' + Math.round((v + m) * 255).toString(16)).slice(-2); }
    return '#' + q(r) + q(g) + q(b);
  }

  /* 扭转率 → 颜色：0（标准，蓝）→ 大扭转（橙红） */
  function twistColor(twist) {
    var t = Math.min(1, (twist || 0) / 50);
    return hslToHex(205 - 175 * t, 74, 50);
  }

  /* ---------------- 组件分解 ---------------- */
  function getComponents(n) {
    var d = DATA28[n];
    var comps = [];
    if (d.milnor) {
      comps.push({ n: n, h: d.h, j: d.j, twist: d.twist });
    } else {
      for (var i = 0; i < d.decomp.length; i++) {
        var m = DATA28[d.decomp[i]];
        comps.push({ n: d.decomp[i], h: m.h, j: m.j, twist: m.twist });
      }
    }
    var k = comps.length;
    var spacing = 5.2;
    for (var c = 0; c < k; c++) {
      comps[c].offset = [(c - (k - 1) / 2) * spacing, 0, 0];
      comps[c].hex = twistColor(comps[c].twist);
    }
    return comps;
  }

  function offsetPts(pts, off) {
    var out = new Array(pts.length);
    for (var i = 0; i < pts.length; i++) {
      out[i] = [pts[i][0] + off[0], pts[i][1] + off[1], pts[i][2] + off[2]];
    }
    return out;
  }

  /* ---------------- 当前生效的丛 ---------------- */
  /**
   * 三种来源，优先级从高到低：
   *   1. state.custom  —— 预设按钮 / M(h,−h) 层直接指定的 (h,j)
   *      （必须支持这个：ξ₈,₋₇ 的 k=15 管在 28 网格里**找不到**对应元素，
   *        按 μ 反解会落到 n=0 的标准球上，那样就永远看不到「很卷的管」。）
   *   2. DATA28[n]     —— 点网格选中的元素，含 h+j=1 的 16 个 Milnor 球
   *   3. 非丛元素的连通和分解 —— 各分量分别画，横向排开
   */
  function activeComponents() {
    if (state.custom) {
      var t = twistOf(state.custom.h, state.custom.j);
      return [{
        n: state.custom.n, h: state.custom.h, j: state.custom.j,
        twist: t, offset: [0, 0, 0],
        hex: twistColor(t), custom: true, label: state.custom.label
      }];
    }
    return getComponents(state.n);
  }

  /* ---------------- 渲染：边界球（∞） ---------------- */
  function drawBoundary() {
    if (!state.show.boundary) return;
    var R = 4.0, seg = 48, i, j, pts;
    // 三条互相垂直的大圆
    for (var pl = 0; pl < 3; pl++) {
      pts = [];
      for (i = 0; i <= seg; i++) {
        var a = (i / seg) * TAU;
        var p;
        if (pl === 0) p = [R * Math.cos(a), R * Math.sin(a), 0];
        else if (pl === 1) p = [R * Math.cos(a), 0, R * Math.sin(a)];
        else p = [0, R * Math.cos(a), R * Math.sin(a)];
        pts.push(p);
      }
      c3d.drawPolyline(pts, { color: '#c3cbd8', width: 1, alpha: 0.5, depthFade: 0.7 });
    }
  }

  /* ---------------- 渲染：结构映射视图 ---------------- */
  function drawMap() {
    var comps = activeComponents();
    var nSeg = 140;

    for (var c = 0; c < comps.length; c++) {
      var comp = comps[c];

      // 原始参考曲线（半透明虚线）
      if (state.show.ghost) {
        var gA = offsetPts(Geo.sampleCurve(proj, 0, 0, 0, Geo.circleA, nSeg, false), comp.offset);
        var gB = offsetPts(Geo.sampleCurve(proj, 0, 0, 0, Geo.circleB, nSeg, false), comp.offset);
        c3d.drawPolyline(gA, { color: '#94a3b8', width: 1, alpha: 0.42, dash: [4, 5] });
        c3d.drawPolyline(gB, { color: '#94a3b8', width: 1, alpha: 0.42, dash: [4, 5] });
      }

      // 二维球面 w = 0 的像（紫色网格）
      if (state.show.sphere) {
        var grid = Geo.sampleSphereGrid(proj, state.tau, comp.h, comp.j, 8, 8);
        for (var gi = 0; gi < grid.length; gi++) {
          c3d.drawPolyline(offsetPts(grid[gi].pts, comp.offset),
            { color: '#8b5cf6', width: 1, alpha: 0.30, depthFade: 0.65 });
        }
      }

      // 参考圆 A / B 的像
      if (state.show.A) {
        var iA = Geo.sampleCurve(proj, state.tau, comp.h, comp.j, Geo.circleA, nSeg, true);
        c3d.drawPolyline(offsetPts(iA, comp.offset),
          { color: '#1d4ed8', width: 2.6, alpha: 1, glow: 8 });
      }
      if (state.show.B) {
        var iB = Geo.sampleCurve(proj, state.tau, comp.h, comp.j, Geo.circleB, nSeg, true);
        c3d.drawPolyline(offsetPts(iB, comp.offset),
          { color: '#059669', width: 2.2, alpha: 0.95, glow: 6 });
      }
    }

    // Hopf 纤维（u 的轨迹）——所有组件共用
    if (state.show.fiber) {
      var fib = [];
      for (var i = 0; i <= 160; i++) {
        fib.push(proj.project(Geo.fiber((i / 160) * TAU)));
      }
      c3d.drawPolyline(fib, { color: '#f59e0b', width: 2, alpha: 0.9, glow: 6 });
      var u = Geo.fiber(state.tau);
      var up = proj.project(u);
      c3d.drawPoint([up[0], up[1], up[2]], 5, '#f59e0b', 12);
      // u 在纤维上的"对径"参考点
      var um = Geo.fiber(state.tau + Math.PI);
      var ump = proj.project(um);
      c3d.drawPoint([ump[0], ump[1], ump[2]], 3.5, '#fb923c', 8);
    }
  }

  /* ---------------- 渲染：纤维扫掠视图 ---------------- */
  /* 扫掠颜色：τ 从冷（蓝）到暖（橙），直观显示"堆叠顺序" */
  function sweepColor(f) {
    return hslToHex(215 - 190 * f, 78, 52);
  }

  /**
   * 采样层数 **必须** 随 k = h−j 增长，否则大 k 会混叠。
   *
   * 为什么：取 u(τ)=(cosτ,sinτ,0,0)、v(θ)=cosθ+sinθk，可直接算出
   *   ξ_{h,j}(u(τ), v(θ)) = ( cosθ·cos(kτ), cosθ·sin(kτ), −sinθ·sin(kτ), sinθ·cos(kτ) )
   * 即「参考圆的像」整个平面只依赖 kτ mod 2π —— 所以 τ 从 0 走到 2π 时，
   * **同一张环面被走了整整 k 遍**。固定 34 层去采 15 遍，等于欠采样，
   * ξ₄,₋₃ / ξ₆,₋₅ / ξ₈,₋₇ 会画成一个样子（这正是预览里抓到的毛病）。
   * 经验值：每「遍」至少 6 层。
   */
  function sweepLayers(h, j) {
    var k = Math.abs(h - j);
    return Math.max(34, Math.min(168, Math.round(k * 6)));
  }

  /**
   * 画出参考圆在 ξ_{h,j} 下的"轨道族" —— 即环面
   *   { ξ( u(τ)^h , C(θ) , u(τ)^j ) : τ ∈ [0, τmax], θ ∈ S¹ }
   * 默认取 w-z 参考圆 A（与 Niles Johnson 网页所述一致）。
   * 层数多的时候走批量绘制（每层一次 stroke，而不是每段一次）。
   */
  function drawSweepFamily(comps, nSeg, tauMax, opt) {
    var o = opt || {};
    var curve = (o.curve || Geo.circleA);

    for (var c = 0; c < comps.length; c++) {
      var comp = comps[c];
      var nLay = o.nLay || sweepLayers(comp.h, comp.j);

      /* 纬线族：固定 τ，扫过 θ —— 每一层是"某时刻参考圆的像" */
      var batch = [];
      for (var s = 0; s <= nLay; s++) {
        var f = s / nLay;
        var tt = tauMax * f;
        batch.push({
          pts: offsetPts(Geo.sampleCurve(proj, tt, comp.h, comp.j, curve, nSeg, true), comp.offset),
          color: o.color || sweepColor(f)
        });
      }
      c3d.drawPolylineBatch(batch, {
        width: o.width || 1.15,
        alpha: o.alpha === undefined ? 0.62 : o.alpha,
        depthFade: 0.60
      });

      /* 经线族：固定 θ，让 τ 跑满 —— 把环面"织"成一张网 */
      if (!o.noWeave) {
        for (var grid = 0; grid < 12; grid++) {
          var th0 = (grid / 12) * TAU;
          var v0 = curve(th0);
          var run = [];
          for (var k = 0; k <= 32; k++) {
            var tt2 = tauMax * (k / 32);
            var prep = Geo.prepare(Geo.fiber(tt2), comp.h, comp.j);
            run.push(proj.project(Geo.xi(prep.uh, prep.uj, v0)));
          }
          if (run.length > 1) {
            c3d.drawPolyline(offsetPts(run, comp.offset), {
              color: o.color || '#475569', width: 0.55,
              alpha: o.color ? 0.10 : 0.16, depthFade: 0.5
            });
          }
        }
      }
    }
  }

  function drawSweep() {
    var comps = activeComponents();
    var nSeg = 84;
    var tauMax = Math.max(state.tau, 0.02);   // 至少画出一层，避免空画面

    // 对照：标准球面 S⁷₀ 的轨道族（灰）
    if (state.show.compare) {
      drawSweepFamily(getComponents(0), nSeg, tauMax,
        { color: '#cbd5e1', width: 1.0, alpha: 0.30, noWeave: true, nLay: 34 });
    }

    // 主体
    drawSweepFamily(comps, nSeg, tauMax, {});

    // 当前参考圆的像（亮色强调）
    if (state.show.A || state.show.B) {
      for (var c = 0; c < comps.length; c++) {
        var comp = comps[c];
        if (state.show.B) {
          var iB = offsetPts(Geo.sampleCurve(proj, state.tau, comp.h, comp.j, Geo.circleB, 120, true), comp.offset);
          c3d.drawPolyline(iB, { color: '#059669', width: 2.4, alpha: 1, glow: 7 });
        }
        if (state.show.A) {
          var iA = offsetPts(Geo.sampleCurve(proj, state.tau, comp.h, comp.j, Geo.circleA, 120, true), comp.offset);
          c3d.drawPolyline(iA, { color: '#1d4ed8', width: 2.2, alpha: 0.9, glow: 6 });
        }
      }
    }

    // Hopf 纤维（生成 τ 的曲线）
    if (state.show.fiber) {
      var fib = [];
      for (var i = 0; i <= 160; i++) fib.push(proj.project(Geo.fiber((i / 160) * TAU)));
      c3d.drawPolyline(fib, { color: '#f59e0b', width: 1.8, alpha: 0.85, glow: 5 });
      var up = proj.project(Geo.fiber(state.tau));
      c3d.drawPoint([up[0], up[1], up[2]], 4.5, '#f59e0b', 10);
    }
  }

  /* ---------------- 渲染：密铺全貌视图 ---------------- */
  /**
   * 视频里那张最复杂、层数最多的画面：u 跑遍 S³ 的一整张网格，
   * 把参考圆的像一层层铺满 —— 得到 S⁷ 的一个「切片」。
   * 与 ② 的区别：② 只沿**一条** Hopf 纤维推进（τ 一维），
   * 这里沿 Hopf 坐标的 (χ,ψ) 二维铺开，再在纤维方向取几层 φ。
   */
  function drawDense() {
    var comps = activeComponents();
    for (var c = 0; c < comps.length; c++) {
      var comp = comps[c];
      var curves = Dense.build(proj, comp.h, comp.j, state.density);
      Dense.draw(c3d, curves, { alpha: 0.70, width: 1.0 });
    }

    // 标记当前 u（仍沿 Hopf 纤维参数 τ 走，方便和另外两个视图对齐）
    if (state.show.fiber) {
      var u = Geo.fiber(state.tau);
      var up = proj.project(u);
      c3d.drawPoint([up[0], up[1], up[2]], 5, '#f59e0b', 12);
    }
  }

  /* ---------------- 主渲染 ---------------- */
  function draw() {
    c3d.clear('#f8fafc');
    drawBoundary();
    if (state.mode === 'map') drawMap();
    else if (state.mode === 'dense') drawDense();
    else drawSweep();
  }

  /* ---------------- 动画循环 ---------------- */
  var lastTs = 0;
  function frame(ts) {
    requestAnimationFrame(frame);
    if (!lastTs) lastTs = ts;
    var dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;

    if (state.playing) {
      state.tau = (state.tau + dt * state.speed * 1.6 * TAU * 0.5) % TAU;
      var slider = document.getElementById('tau');
      if (slider) slider.value = String(Math.round(state.tau / TAU * 1000));
    }
    if (state.autoRotate) c3d.yaw += dt * 0.22;

    draw();
  }

  /* ---------------- UI ---------------- */
  function buildGrid() {
    var grid = document.getElementById('grid');
    grid.innerHTML = '';
    for (var n = 0; n < 28; n++) {
      (function (n) {
        var d = DATA28[n];
        var b = document.createElement('button');
        b.className = 'cell' + (d.milnor ? (n === 0 ? ' std' : ' mil') : ' non');
        b.dataset.n = String(n);
        b.innerHTML = '<span class="cn">' + n + '</span>' +
          '<span class="cm">' + n + '/28</span>';
        b.title = 'S⁷_' + n + '  μ=' + n + '/28  λ=' + (n % 7) +
          (d.milnor ? '  Milnor 球' : '  非丛元素');
        b.addEventListener('click', function () { selectElement(n); });
        grid.appendChild(b);
      })(n);
    }
  }

  function selectElement(n, custom) {
    state.n = n;
    state.custom = custom || null;
    var cells = document.querySelectorAll('#grid .cell');
    for (var i = 0; i < cells.length; i++) {
      cells[i].classList.toggle('active',
        !state.custom && n != null && Number(cells[i].dataset.n) === n);
    }
    var bs = document.querySelectorAll('#bundles .preset, #presets .preset');
    for (var b = 0; b < bs.length; b++) {
      bs[b].classList.toggle('active', !!state.custom && bs[b].dataset.key === state.custom.key);
    }
    updateInfo();
    var g = document.getElementById('presetHint');
    if (g) g.textContent = state.custom ? state.custom.note : '';
  }

  function updateInfo() {
    if (state.custom) { updateInfoCustom(); return; }
    var d = DATA28[state.n];
    var box = document.getElementById('info');
    var typeTxt, typeCls, extra = '';

    if (state.n === 0) { typeTxt = '标准球面 S⁷'; typeCls = 'std'; }
    else if (d.milnor) { typeTxt = 'Milnor 怪球（S³ 丛可实现）'; typeCls = 'mil'; }
    else { typeTxt = '非丛元素（只能作为连通和）'; typeCls = 'non'; }

    if (d.milnor) {
      extra =
        '<div class="kv"><span>丛参数 (h, j)</span><b>(' + d.h + ', ' + d.j + ')</b></div>' +
        '<div class="kv"><span>k = h − j</span><b>' + d.k + '</b></div>' +
        '<div class="kv"><span>管相对扭转率 k−1</span><b>' + d.twist + '</b></div>' +
        '<div class="kv"><span>p₁/2 = k</span><b>' + d.k + '</b></div>';
    } else {
      extra =
        '<div class="kv"><span>连通和分解</span><b>S⁷_' + d.decomp[0] + ' # S⁷_' + d.decomp[1] + '</b></div>' +
        '<div class="kv"><span>是否 S³ 丛</span><b>否</b></div>' +
        '<div class="kv"><span>可写为</span><b>' + d.decomp[0] + ' + ' + d.decomp[1] + ' ≡ ' + state.n + ' (mod 28)</b></div>';
    }

    box.className = 'info ' + typeCls;
    box.innerHTML =
      '<div class="info-head"><span class="big">S⁷_' + state.n + '</span>' +
      '<span class="badge ' + typeCls + '">' + typeTxt + '</span></div>' +
      '<div class="kv"><span>Eells–Kuiper μ</span><b>' + state.n + '/28</b></div>' +
      '<div class="kv"><span>Milnor λ = n mod 7</span><b>' + (state.n % 7) + '</b></div>' +
      extra +
      '<p class="note">' + noteFor(state.n) + '</p>';
  }

  /* 预设 / M(h,−h) 层：显示所点到的那个丛，不再假装它等于某个网格元素 */
  function updateInfoCustom() {
    var c = state.custom;
    var h = c.h, j = c.j, k = h - j;
    var isSphere = (h + j === 1);
    var mu = (((h * (h - 1) / 2) % 28) + 28) % 28;
    var lam = (((k * k - 1) % 7) + 7) % 7;
    var cls = isSphere ? (mu === 0 ? 'std' : 'mil') : 'non';
    var typeTxt = isSphere
      ? (mu === 0 ? 'h+j=1 · 球面层（μ=0，与标准球同胚）' : 'h+j=1 · 球面层（怪球）')
      : 'h+j=0 · 丛层（同调同 S³×S⁴，非球面）';
    var sign = function (v) { return v < 0 ? '−' + Math.abs(v) : String(v); };

    var box = document.getElementById('info');
    box.className = 'info ' + cls;
    box.innerHTML =
      '<div class="info-head"><span class="big">ξ<sub>' + h + ',' + sign(j) + '</sub></span>' +
      '<span class="badge ' + cls + '">' + (c.label || '自定义丛') + '</span></div>' +
      '<div class="kv"><span>标签</span><b>' + typeTxt + '</b></div>' +
      '<div class="kv"><span>h + j</span><b>' + (h + j) + '</b></div>' +
      '<div class="kv"><span>k = h − j</span><b>' + k + '</b></div>' +
      '<div class="kv"><span>相对扭转率 k−1</span><b>' + (k - 1) + '</b></div>' +
      (isSphere
        ? '<div class="kv"><span>28μ ≡ h(h−1)/2</span><b>μ = ' + mu + '/28</b></div>' +
          '<div class="kv"><span>Milnor λ = k²−1 mod 7</span><b>' + lam + '</b></div>'
        : '<div class="kv"><span>H∗(M)</span><b>ℤ at 0,3,4,7</b></div>' +
          '<div class="kv"><span>p₁ 判别</span><b>h = ' + h + ' 决定不同胚类</b></div>') +
      '<p class="note">' + c.note + '</p>';
  }

  function noteFor(n) {
    if (n === 0) return '标准七维球面：参考圆的轨道族最"平缓"（相对扭转率 0），是 28 个元素中的单位元。';
    if (n === 1) return 'Θ₇ 的生成元，Milnor 1956 的原始例子（ξ₂,₋₁）：v ↦ u²vu⁻¹，相对扭转率 2。';
    if (n === 14) return 'λ = 0 但仍是怪球（μ = 14/28）—— 证明 λ 不变量不完备，必须用 μ。';
    if (n === 8) return 'ξ₉,₋₈：k = h−j = 17，相对扭转率 16，μ = 8/28，λ = 1 —— 真正的怪球。';
    var d = DATA28[n];
    if (!d.milnor) return '不是任何单个 S³ 丛的总空间，只能写成连通和 ' + d.decomp[0] + ' + ' + d.decomp[1] + '。';
    return '相对扭转率 k−1 = ' + d.twist + '（k = h−j = ' + d.k + '），对应丛参数 h = ' + d.h + '、j = ' + d.j + '。';
  }

  /* ---------------- 交互绑定 ---------------- */
  function bindUI() {
    [['modeMap', 'map'], ['modeTube', 'tube'], ['modeDense', 'dense']].forEach(function (m) {
      document.getElementById(m[0]).addEventListener('click', function () {
        state.mode = m[1]; setMode();
      });
    });

    /* 密铺密度档位 */
    var dens = document.getElementById('density');
    dens.value = state.density;
    dens.addEventListener('change', function () { state.density = dens.value; });

    var bp = document.getElementById('btnPlay');
    bp.addEventListener('click', function () {
      state.playing = !state.playing;
      bp.textContent = state.playing ? '⏸ 暂停' : '▶ 播放';
      bp.classList.toggle('on', state.playing);
    });

    document.getElementById('btnReset').addEventListener('click', function () {
      state.tau = 0;
      c3d.yaw = 0.85; c3d.pitch = 0.42;
    });

    document.getElementById('speed').addEventListener('input', function (e) {
      state.speed = Number(e.target.value);
      document.getElementById('speedVal').textContent = state.speed.toFixed(2) + '×';
    });

    document.getElementById('tau').addEventListener('input', function (e) {
      state.playing = false;
      var b = document.getElementById('btnPlay');
      b.textContent = '▶ 播放'; b.classList.remove('on');
      state.tau = (Number(e.target.value) / 1000) * TAU;
    });

    var toggles = [
      ['tgA', 'A'], ['tgB', 'B'], ['tgSphere', 'sphere'],
      ['tgFiber', 'fiber'], ['tgGhost', 'ghost'],
      ['tgBoundary', 'boundary'], ['tgCompare', 'compare']
    ];
    toggles.forEach(function (t) {
      var el = document.getElementById(t[0]);
      el.checked = !!state.show[t[1]];
      el.addEventListener('change', function () {
        state.show[t[1]] = el.checked;
      });
    });

    var rot = document.getElementById('tgRotate');
    rot.checked = state.autoRotate;
    rot.addEventListener('change', function () { state.autoRotate = rot.checked; });

    // 鼠标拖动旋转
    var cv = document.getElementById('canvas');
    var dragging = false, px = 0, py = 0;
    cv.addEventListener('mousedown', function (e) {
      dragging = true; px = e.clientX; py = e.clientY;
      state.autoRotate = false;
      document.getElementById('tgRotate').checked = false;
    });
    window.addEventListener('mouseup', function () { dragging = false; });
    window.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      c3d.yaw += (e.clientX - px) * 0.008;
      c3d.pitch += (e.clientY - py) * 0.006;
      c3d.pitch = Math.max(-1.45, Math.min(1.45, c3d.pitch));
      px = e.clientX; py = e.clientY;
    });
    cv.addEventListener('wheel', function (e) {
      e.preventDefault();
      c3d.dist = Math.max(4.5, Math.min(22, c3d.dist + e.deltaY * 0.012));
    }, { passive: false });

    /* 视频预设：两层分组。
       关键修正 —— 参数直接取 p.h / p.j，不再由 μ 反解 n。
       之前用 ((h(h−1)/2) % 28) 反解，ξ₈,₋₇ 会算成 n=0，
       于是点「k=15 思考题」实际看到的还是 ξ₁,₀ 的平直管。 */
    makePresetGroup('presets', PRESETS, 'sph');
    makePresetGroup('bundles', BUNDLE_PRESETS, 'bun');

    window.addEventListener('resize', function () { c3d.resize(); });
  }

  function makePresetGroup(hostId, list, prefix) {
    var host = document.getElementById(hostId);
    if (!host) return;
    list.forEach(function (p, i) {
      var key = prefix + ':' + p.h + ',' + p.j;
      var b = document.createElement('button');
      b.className = 'preset' + (prefix === 'bun' ? ' bun' : '');
      b.textContent = p.name;
      b.title = p.note;
      b.dataset.key = key;
      var t = twistOf(p.h, p.j);
      var isSph = (p.h + p.j === 1);
      var kind = !isSph ? '丛层 h+j=0' : (p.n === 0 || p.n === null ? '标准同胚' : '怪球');
      b.innerHTML = '<span class="pname">' + p.name + '</span>' +
        '<span class="pmeta">k=' + (p.h - p.j) + '　扭转 ' + t + '　' + kind + '</span>';
      b.addEventListener('click', function () {
        var idx = (prefix === 'sph') ? p.n : null;
        selectElement(idx == null ? null : idx, {
          key: key, h: p.h, j: p.j, n: idx, label: p.name, note: p.note
        });
        state.mode = 'map';
        setMode();
      });
      host.appendChild(b);
    });
  }

  function setMode() {
    ['map', 'tube', 'dense'].forEach(function (m) {
      var el = document.getElementById('mode' + m.charAt(0).toUpperCase() + m.slice(1));
      if (el) el.classList.toggle('active', state.mode === m);
    });
    document.getElementById('hintMap').style.display = state.mode === 'map' ? 'block' : 'none';
    document.getElementById('hintTube').style.display = state.mode === 'tube' ? 'block' : 'none';
    document.getElementById('hintDense').style.display = state.mode === 'dense' ? 'block' : 'none';
    document.getElementById('tgCompareWrap').style.display = state.mode === 'tube' ? 'flex' : 'none';
    document.getElementById('densityWrap').style.display = state.mode === 'dense' ? 'flex' : 'none';
    var tg = document.getElementById('tagMode');
    if (tg) {
      tg.textContent = state.mode === 'map' ? '结构映射 ξ_{h,j}'
        : state.mode === 'dense' ? '密铺全貌 ξ_{h,j}(S³ 网格切片)'
          : '纤维扫掠 ξ_{h,j}(环面轨道族)';
    }
  }

  /* ---------------- 启动 ---------------- */
  function init() {
    c3d = new Canvas3D(document.getElementById('canvas'));
    proj = Geo.makeProjector([1, 1, 1, 1], 4.0);
    buildGrid();
    bindUI();
    selectElement(state.n);
    setMode();
    requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
