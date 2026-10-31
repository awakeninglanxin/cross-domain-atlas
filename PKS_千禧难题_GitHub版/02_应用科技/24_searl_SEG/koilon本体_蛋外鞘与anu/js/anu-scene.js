/* ============================================================================
 * anu-scene.js —— Anu 七级螺旋 three.js 渲染层
 * ----------------------------------------------------------------------------
 * 依赖：vendor/three.min.js (r128, UMD) + js/anu-smooth.js（B-spline 重采样，纯数学）。
 *       不依赖几何引擎内部实现，只吃 AnuGeo.build() 产出的 model（levels[].pts 为 Float32Array）。
 *
 * 职责边界（单一）：建场景 / 建几何体 / 相机与交互 / 渲染循环 / 生长动画。
 * 不含：控件绑定、HUD 文案、参数校验（属 anu-ui.js / anu-app.js）。
 * ==========================================================================*/
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./anu-smooth.js'), require('./anu-cmap.js'));
  } else {
    root.AnuScene = factory(root.AnuSmooth, root.AnuCmap);
  }
})(typeof self !== 'undefined' ? self : this, function (AnuSmooth, AnuCmap) {
  'use strict';

  /* 光谱七色（对应文献中七根细丝与七色） */
  var SPECTRUM = ['#ff4d4d', '#ff9f1a', '#ffd60a', '#3ddc84', '#22d3ee', '#4d7cff', '#b06bff'];
  /* 逐阶配色 */
  var LEVEL_COLORS = ['#94a3b8', '#f43f5e', '#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#06b6d4', '#84cc16'];
  /* koilon 珍珠的「最低阶」判据：只有匝数 ≤ 此值的**最细一级**才是珍珠串。
     1680 匝的 1st-order spirillae 远大于它 ⇒ 不会误判成 koilon。 */
  var PEARL_MAX_TURNS = 12;

  function hex2rgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) { h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; }
    return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
  }
  function lerpColor(a, b, t) {
    var A = hex2rgb(a), B = hex2rgb(b);
    return [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t];
  }
  /** 0..1 → 光谱七色连续插值 */
  function spectrumAt(t) {
    t = ((t % 1) + 1) % 1;
    var n = SPECTRUM.length, x = t * n, i = Math.floor(x) % n, f = x - Math.floor(x);
    return lerpColor(SPECTRUM[i], SPECTRUM[(i + 1) % n], f);
  }

  /** 生成柔和圆点贴图（气泡/珍珠质感，程序化，无外部资源） */
  function makeDotTexture() {
    var S = 64, c = document.createElement('canvas');
    c.width = c.height = S;
    var g = c.getContext('2d');
    var grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    grd.addColorStop(0.00, 'rgba(255,255,255,1)');
    grd.addColorStop(0.30, 'rgba(255,255,255,0.85)');
    grd.addColorStop(0.62, 'rgba(255,255,255,0.22)');
    grd.addColorStop(1.00, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, S, S);
    var tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  /* ------------------------------------------------------------------ 主体 */
  /* 气泡直径 = BUBBLE_OF_SPACING × 该阶曲线的「平均点间距」
     🔴 2026-10-07：原先气泡用**绝对世界尺寸**（0.020/0.030），
     而阶梯第 7 阶的取景距离只有 2.4e-4 —— 屏幕点径 ≈ 0.030/2.4e-4×749 ≈ 9×10⁴ px，
     一个点就糊满全屏，把螺旋线一起冲成白茫茫一片（老师：「螺旋线太亮了，看不到 koilon 泡泡」）。
     改成**绑定到几何尺度**后，气泡尺寸随阶自动缩放，深度放大时也不会爆。
     系数 0.55 ⇒ 相邻泡泡之间**留出可见缝隙**（等于点间距就会连成一条平滑的管，看不出"泡泡"）。 */
  /* 🔴 2026-10-19 老师：「最终 L7 螺旋线上的散点（代表 koilon）不够大，要双倍调大」
     ⇒ 0.55 → 1.10（正好 ×2）。这条系数是**散点直径 / 该阶平均点间距**的比，
        只影响 Points（koilon 珍珠），不影响曲线本身。 */
  var BUBBLE_OF_SPACING = 1.10;

  /* 🔴 2026-10-08 老师：「螺旋线你是不是没有用 bspline 连接散点，一点不丝滑，像 dna」
   *             ＋「螺旋线放大看像很多折线」
   *
   * 根因：`THREE.Line` + `LineBasicMaterial` 是**折线图元**，GPU 只把相邻顶点用直线段连起来，
   *       **不做任何曲线插值**。测下来旧参数（每匝 4 点）相邻段夹角中位 **46.9°**、
   *       44.7% 的顶点转角 > 60° —— 一圈就是个四边形，放大必然"很多折线"。
   *
   * 两处一起修（缺一不可）：
   *   ① 几何：每匝 spirilla 的采样点数提到 **7 的倍数**（`state.microSpp`，默认 14）——
   *      见 js/anu-heart.js 的 spp / js/anu-app.js 的 rebuildHeart；
   *   ② 渲染：连点之前先做 **centripetal Catmull-Rom（三次 B-spline 插值）** 细分
   *      （`state.splineSub`，默认 2）—— 曲线严格穿过原采样点，段间 C¹ 连续 ⇒ 棱角消失。
   *
   * ⚠️ 泡泡（koilon）**不跟着平滑**：它的尺寸绑"平均点间距"，若跟着加密就会缩小成一条
   *    光滑管、再也分不出颗（§2.7.9 的老坑）。所以线的几何与泡泡的几何**分开**：
   *    线 = 平滑后的密点，泡泡 = 原始采样点。 */
  var SMOOTH_MAX_PER_LINE = 100000;   /* 单条线平滑后的顶点上限（保护集显） */

  function create(canvas, opts) {
    opts = opts || {};
    var state = {
      /* 🔴 默认着色 = 'wire'「按丝着色」（3 粗米白 / 7 细七色）—— 老师 2026-10-08 第 ⑤ 条。
         另有 'cmap'（3 粗 hot / 7 细 rainbow）、'spectrum'（沿曲线铺满）、'level'（按阶）。 */
      colorMode: opts.colorMode || 'wire',       /* cmap | spectrum | level | wire */
      showShell: true, showBase: true, showPlanes: false,
      /* 🔴 2026-10-08 老师：「显示 选项卡 里面要有 **3d xyz axis** 打勾选项」
         ⇒ 世界系三轴指示器开关（默认值在 `anu-app.js: state.showAxes`，出厂为**开**）。 */
      showAxes: (opts.showAxes == null ? false : !!opts.showAxes),
      showBubbles: true, bubbleSize: 1.5,
      /* 🔴 koilon 珍珠密度：**最细一级每匝**画几颗。
         默认 **7**（老师 2026-10-08 第 ④ 条：「每匝 7 颗要作为网页默认设置」）
         ⇒ 阶梯第 7 阶 7 匝 × 7 = 49 颗；爱心第 D 阶 7 匝 × 7 = 49 颗/丝。
         其它各级一律不画散点 —— 老师：「只要求能看到明显发亮的 spirillae 曲线」。 */
      pearlsPerTurn: (opts.pearlsPerTurn == null ? 7 : opts.pearlsPerTurn),
      lineBright: (opts.lineBright == null ? 0.92 : opts.lineBright),
      dimInactive: (opts.dimInactive == null ? 0.12 : opts.dimInactive),
      rotate: opts.rotate !== false, autoSpeed: 0.22,
      growth: 1,
      /* B-spline 平滑细分倍数：1 = 关闭（裸折线）；2/3/4 = 每段再插 k−1 个点 */
      splineSub: (opts.splineSub == null ? 2 : opts.splineSub)
    };

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e17);

    var camera = new THREE.PerspectiveCamera(45, 1, 0.002, 200);
    /* `target` = 相机注视点（世界坐标）；`viewDrop` = 把**世界原点**在屏幕上再下移多少（单位：屏高比例）。
       🔴 老师 2026-10-08 第 ⑨ 条：「网页默认的**原点位置下移约 1/4 屏幕高度**」
       ⇒ 实现方式是让注视点比 `target` **高** `viewDrop × 屏高`：
          世界原点（0,0,0）随之投影到屏幕中心**下方** 1/4 屏高处。
          因为偏移量按 `2·dist·tan(fov/2)` 现算 ⇒ **zoom 时屏上比例恒定**（不随距离漂移）。 */
    var cam = {
      theta: 0.9, phi: 1.12, dist: 4.2,
      target: new THREE.Vector3(0, 0, 0),
      viewDrop: (opts.viewDrop == null ? 0 : opts.viewDrop)   /* 2026-10-19：默认居中（原 0.25） */
    };
    var camTween = null;

    var dotTex = makeDotTexture();

    /* 容器 */
    var gRoot = new THREE.Group(); scene.add(gRoot);
    var gWires = new THREE.Group(); gRoot.add(gWires);      /* 螺旋本体（可多丝） */
    var gShell = new THREE.Group(); gRoot.add(gShell);      /* 参考球壳 */
    var gBase = new THREE.Group(); gRoot.add(gBase);        /* 基准圆 */
    var gPlanes = new THREE.Group(); gRoot.add(gPlanes);    /* 正交平面指示 */
    var gGuides = new THREE.Group(); gRoot.add(gGuides);    /* 蛋形侧影 / 吸引管 */

    /* ---------------------------------------------------- 参考球壳（S⁷₃ 风格） */
    (function buildShell() {
      var geo = new THREE.SphereGeometry(1.0, 28, 18);
      var mat = new THREE.MeshBasicMaterial({
        color: 0x6ea8ff, wireframe: true, transparent: true, opacity: 0.055, depthWrite: false
      });
      gShell.add(new THREE.Mesh(geo, mat));
      /* 3 条大圆，呼应 Milnor 页面的参考圆 */
      var circleMat = new THREE.LineBasicMaterial({ color: 0x8ab4ff, transparent: true, opacity: 0.20 });
      for (var i = 0; i < 3; i++) {
        var pts = [], N = 160;
        for (var k = 0; k <= N; k++) {
          var a = k / N * Math.PI * 2, v = new THREE.Vector3(Math.cos(a), Math.sin(a), 0);
          if (i === 1) { v.applyAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2); }
          if (i === 2) { v.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2); }
          pts.push(v);
        }
        gShell.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), circleMat));
      }
    })();

    /* ------------------------------------------------- 三轴指示器（3d xyz axis） */
    /* 🔴 2026-10-08 老师：「显示 选项卡 里面要有 **3d xyz axis** 打勾选项」
       ＋（交付后订正）「**3D XYZ 坐标轴 的位置不对，应该在 anu 的质心或 图的原点**」
       ＋（第二次订正 · 真浏览器核实【C】抓出的 bug）「位置必须钉在**图的原点**，
          而不是相机注视点」—— 见 `placeAxes()` 上方长注释。
       -------------------------------------------------------------------------
       它是**坐标架**（不是屏幕角上的小罗盘）：
         · 位置：**钉在图形自身的原点 = 世界 (0,0,0)**（几何就是围绕它建的 ⇒ 也就是 anu 的质心处）。
                 ⚠️ **不是** `cam.target`：后者是「相机注视点」，会被 Shift 拖拽平移、
                 被「逐级放大」挪到某一阶的焦点上 —— 拿它当原点，一平移坐标架就
                 **跟着相机走、与图脱钩**（真浏览器核实【C】实测：图移动 156 px，
                 坐标架位移 0.1 px）—— 见 `placeAxes()`；
         · 长度：`min(0.30·视距, 0.5)`，上限 0.5 = 参考球壳半径的一半；
         · 姿态：**恒等**（世界系对齐）⇒ 相机一转，三轴在屏上的朝向就跟着转，
                 一眼看出「现在是从哪个方向看这个螺旋」；
         · 遮挡：`depthTest = false` + 高 `renderOrder` ⇒ 永远画在最上层，不被几何/球壳挡住。
       配色：**X = 红、Y = 绿、Z = 蓝**；
       朝向：**Z 正半轴朝下、与「直锥体中轴」严格重合**（老师 2026-10-08 第三次订正）
             —— 推导见下表 `AXES_SPEC` 上方的长注释，**别照抄教科书的 X/Y/Z 默认排法**。 */
    var gAxes = new THREE.Group();
    gAxes.visible = state.showAxes;
    scene.add(gAxes);                     /* 直接挂在 scene 上（世界系）——**不**挂 gRoot */
    /**
     * 🔴🔴 2026-10-08 夜 · 第三次订正（老师）：
     *    「当前的 xyz 3 轴坐标不对，**z 轴正半轴应该朝下朝向锥顶，和直锥体中轴一样重合**。」
     *
     * **先把「这个模型自己的坐标系」定死**（下面全部改动都由此推出，这一步不能省）：
     *   ① 几何在 `anu-heart.js` 里按 `[r·cosφ, y + ys, r·sinφ]` 生成
     *      ⇒ 中轴锥管、苹果壳、七条丝……**统统绕世界 Y 轴旋转对称**，
     *        所以 **世界 Y 轴就是那根「直锥体中轴」**（已由真浏览器核实【A】独立佐证：
     *        该轴投影到屏幕上必是一条过画布中心的竖线）；
     *   ② 锥顶由 `apexY = mouthY − mouthR / tan(半角) ≈ −2.078` 解出，口朝上、尖朝下
     *      ⇒ **锥顶在世界 −Y 方向**。
     *   ⇒「Z 正半轴朝下、与中轴重合」= **把中轴这根轴改标成 Z，其正半轴取世界 −Y**。
     *
     * **在「保持右手系」（X × Y = Z）的前提下只有一种排法**：
     *      X = 世界 +X（红）　水平　　← **红臂原地不动**（改动最小，也是唯一能保持手性的选择）
     *      Y = 世界 +Z（绿）　水平　　← 原来那根「竖直向上」的绿臂改为水平
     *      Z = 世界 −Y（蓝）　**竖直向下，指向锥顶**　← 与「直锥体中轴」严格重合
     *   验算：X × Y = (1,0,0) × (0,0,1) = (0,−1,0) = Z ✓ —— 仍是右手系，不是左手系。
     *
     * ⚠️ **判据随之改变**（真浏览器核实脚本 `_scratch/_z_zoom.js` 同改）：
     *    屏上那条「过画布中心的竖线」从**绿臂**变成**蓝臂**，且只朝**下**（当前只画正半轴 0→+dir）。
     */
    var AXES_SPEC = [
      { dir: [1, 0, 0], hex: 0xff5f6d, css: '#ff5f6d', label: 'X' },
      { dir: [0, 0, 1], hex: 0x4ade80, css: '#4ade80', label: 'Y' },
      { dir: [0, -1, 0], hex: 0x60a5fa, css: '#60a5fa', label: 'Z' }
    ];
    /**
     * 轴标签（X / Y / Z）—— 用 canvas 画字做成 Sprite。
     * ⚠️ 自检环境（`_scratch/scene-test.js`）的 canvas 桩里**没有 2D 文字 API**
     *    ⇒ 这里**先探测** `fillText` 是否存在；探测不到就返回 null（三轴照画，只是没字），
     *    这样 Node 里跑场景层不会因为缺 `fillText` / 缺 `THREE.Sprite` 而抛错。
     *    （⚠️ 千万不要在探测之前碰 `THREE.Sprite` —— 那个桩是 Proxy，访问不存在的名字会直接抛。）
     */
    function makeAxisLabel(text, cssColor) {
      var S = 64, c = document.createElement('canvas');
      c.width = c.height = S;
      var g = c.getContext && c.getContext('2d');
      if (!g || typeof g.fillText !== 'function') { return null; }
      g.font = 'bold 46px system-ui, -apple-system, "Segoe UI", sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = cssColor;
      g.fillText(text, S / 2, S / 2 + 2);
      var tex = new THREE.CanvasTexture(c);
      tex.needsUpdate = true;
      var sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, transparent: true, depthTest: false, depthWrite: false
      }));
      sp.scale.set(0.30, 0.30, 1);        /* Sprite 的 scale 是**世界单位**（再乘 gAxes.scale） */
      return sp;
    }
    (function buildAxes() {
      AXES_SPEC.forEach(function (a) {
        var mat = new THREE.LineBasicMaterial({
          color: a.hex, transparent: true, opacity: 0.95, depthTest: false, depthWrite: false
        });
        var geo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(a.dir[0], a.dir[1], a.dir[2])
        ]);
        var line = new THREE.Line(geo, mat);
        line.renderOrder = 999;
        gAxes.add(line);
        var sp = makeAxisLabel(a.label, a.css);
        if (sp) {
          sp.position.set(a.dir[0] * 1.24, a.dir[1] * 1.24, a.dir[2] * 1.24);
          sp.renderOrder = 1000;
          gAxes.add(sp);
        }
      });
      /* 原点锚点：三轴汇聚处一个小白点 */
      var op = new THREE.Points(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0)]),
        new THREE.PointsMaterial({
          color: 0xffffff, size: 0.075, sizeAttenuation: true,
          transparent: true, opacity: 0.95, depthTest: false, depthWrite: false
        })
      );
      op.renderOrder = 1000;
      gAxes.add(op);
    })();

    /* ---- 本体对象管理 */
    var wires = [];   /* [{ name, color, kind, levelObjs:[{line,points,geo,count}], levels }] */

    function disposeWire(w) {
      w.levelObjs.forEach(function (o) {
        /* 🔴 叠加层与主线**共享 lineGeo** ⇒ 只能 remove + 删材质，绝不能 dispose 几何，
           否则会把主线一起弄坏。必须在 o.lineGeo.dispose() 之前处理。 */
        if (o.halo) { o.halo.material.dispose(); gWires.remove(o.halo); o.halo = null; }
        o.lineGeo.dispose();
        o.line.material.dispose();
        gWires.remove(o.line);
        /* 🔴 只有最细一级才有 ptsGeo / points（koilon 珍珠），其余各级为 null —— 必须判空 */
        if (o.ptsGeo) { o.ptsGeo.dispose(); }
        if (o.points) { o.points.material.dispose(); gWires.remove(o.points); }
      });
    }
    function clearWires() { wires.forEach(disposeWire); wires = []; }

    /** 该阶曲线的平均相邻点间距（抽样 ≤400 段；用于把气泡尺寸绑到几何尺度上） */
    function meanSpacing(pts, n) {
      if (!pts || n < 2) { return 0; }
      var step = Math.max(1, Math.floor(n / 400)), i, s = 0, m = 0;
      for (i = step; i < n; i += step) {
        var a = (i - step) * 3, b = i * 3;
        var dx = pts[b] - pts[a], dy = pts[b + 1] - pts[a + 1], dz = pts[b + 2] - pts[a + 2];
        s += Math.sqrt(dx * dx + dy * dy + dz * dz); m++;
      }
      return m ? (s / m) / step : 0;
    }
    function bubbleSizeOf(spacing, kind, bs) {
      var kindScale = (kind === 'thick') ? 1.25 : 1.0;
      return Math.max(1e-12, spacing * BUBBLE_OF_SPACING * kindScale * bs);
    }

    /* ------------------------------------------------------------------ 平滑 */
    /** 该阶可用的 B-spline 细分倍数（受单线顶点上限约束） */
    function smoothSubFor(nLogical) {
      var sub = Math.max(1, Math.round(state.splineSub || 1));
      while (sub > 1 && nLogical * sub > SMOOTH_MAX_PER_LINE) { sub -= 1; }
      return sub;
    }
    /** 按当前配色模式铺顶点色（t = 沿曲线归一化位置） */
    function colorArray(count, rgbFor) {
      var col = new Float32Array(count * 3), i;
      for (i = 0; i < count; i++) {
        var c = rgbFor(count > 1 ? i / (count - 1) : 0);
        col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2];
      }
      return col;
    }
    /** 该阶取色函数
     *  · cmap   —— 🔴 老师口径：**3 粗丝用 hot（金黄-白）、7 细丝用 rainbow（彩虹）**。
     *              —— 旧版全场只有一条光谱 rainbow，粗/细在颜色上分不出来，故新增本模式并设为默认。
     *  · level  —— 按阶（看嵌套）
     *  · wire   —— 按丝（每根一个纯色）
     *  其余      —— spectrum：一条光谱 rainbow 沿曲线铺开
     */
    function rgbFnFor(color, kind) {
      if (state.colorMode === 'level' || state.colorMode === 'wire') {
        var c = hex2rgb(color);
        return function () { return c; };
      }
      if (state.colorMode === 'cmap') {
        return (kind === 'thick') ? AnuCmap.hotWire : AnuCmap.rainbow;
      }
      return spectrumAt;
    }
    /**
     * 用 B-spline 把原始采样点变成光滑曲线顶点。
     * @param {Float32Array} rawFlat  原始点（**未**补闭合首点）
     * @param {number} nRaw 点数
     * @param {boolean} closed
     * @returns {{arr: Float32Array, count: number, sub: number}}
     */
    function smoothPositions(rawFlat, nRaw, closed, sub) {
      var src = (rawFlat.subarray && sub > 1) ? rawFlat.subarray(0, nRaw * 3) : rawFlat;
      var r = (sub > 1)
        ? AnuSmooth.resample(src, closed, sub)
        : { pts: rawFlat, count: (closed ? nRaw + 1 : nRaw), sub: 1 };
      if (sub <= 1) {
        /* 裸折线：闭合曲线仍补首点消接缝（维持旧行为） */
        var np = closed ? nRaw + 1 : nRaw;
        var out = new Float32Array(np * 3);
        out.set(rawFlat.subarray(0, nRaw * 3), 0);
        if (closed) { out[nRaw * 3] = rawFlat[0]; out[nRaw * 3 + 1] = rawFlat[1]; out[nRaw * 3 + 2] = rawFlat[2]; }
        return { arr: out, count: np, sub: 1 };
      }
      if (!closed) { return { arr: r.pts, count: r.count, sub: sub }; }
      /* 闭合：末尾补首点，消掉接缝缺口 */
      var cnt = r.count, oc = new Float32Array((cnt + 1) * 3);
      oc.set(r.pts.subarray(0, cnt * 3), 0);
      oc[cnt * 3] = r.pts[0]; oc[cnt * 3 + 1] = r.pts[1]; oc[cnt * 3 + 2] = r.pts[2];
      return { arr: oc, count: cnt + 1, sub: sub };
    }

    /**
     * 建一组 koilon 珍珠散点（**只有最细一级**才会调用）。
     * 抽成独立函数是为了让「koilon 珍珠」滑块**只重建散点、不重建曲线**
     * （见 `rebuildPearls()`；此前这个滑块因为缺 `setPearlsPerTurn` 而完全无效）。
     * @param {Float32Array} pos 该级原始采样点（未补闭合首点）
     * @param {number} n 原始点数
     * @param {number} pearlCount 要画的颗数（= 匝数 × 每匝颗数）
     * @param {string} color 该丝颜色
     * @param {string} kind 'thick' | 'thin' | 'single'
     */
    function buildPearls(pos, n, pearlCount, color, kind) {
      var np = Math.max(1, Math.min(n, Math.round(pearlCount)));
      var pArr = new Float32Array(np * 3), i2, i3, src;
      for (i2 = 0; i2 < np; i2++) {
        i3 = (np === 1) ? 0 : Math.round(i2 * (n - 1) / (np - 1));
        src = i3 * 3;
        pArr[i2 * 3] = pos[src]; pArr[i2 * 3 + 1] = pos[src + 1]; pArr[i2 * 3 + 2] = pos[src + 2];
      }
      var geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pArr, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colorArray(np, rgbFnFor(color, kind)), 3));
      var sp = meanSpacing(pos, n);
      var mt = new THREE.PointsMaterial({
        size: bubbleSizeOf(sp, kind, state.bubbleSize),
        map: dotTex, vertexColors: true, transparent: true, opacity: 1.0,
        depthWrite: false, blending: THREE.NormalBlending, sizeAttenuation: true
      });
      var points = new THREE.Points(geo, mt);
      points.frustumCulled = false;
      points.visible = state.showBubbles;
      points.renderOrder = 2;      /* koilon 泡泡永远压在螺旋线之上 ⇒ 一定看得见 */
      gWires.add(points);
      return { ptsGeo: geo, points: points, pMat: mt, spacing: sp, npPearl: np };
    }

    function buildLevelObjects(level, color, opacity, lineWidth, kind, pearlTurns) {
      var n = level.count;
      var pos = level.pts;
      /* 闭合曲线（弹簧环）→ 末尾补首点，消掉接缝缺口；
         开放曲线（中央螺旋 / 取一段的 whorl）→ 不补，否则会多一条横跨的假线 */
      var closed = (level.closed !== false) && n > 2;
      var sub = smoothSubFor(n);

      /* ---------------- ① 原始采样点（喂给线的重采样；泡泡另算） ---------------- */
      var npRaw = closed ? n + 1 : n;
      var rawArr = new Float32Array(npRaw * 3);
      rawArr.set(pos.subarray ? pos.subarray(0, n * 3) : pos, 0);
      if (closed) {
        rawArr[n * 3] = pos[0]; rawArr[n * 3 + 1] = pos[1]; rawArr[n * 3 + 2] = pos[2];
      }

      /* ---------------- ② 线：B-spline 重采样后的光滑曲线 ---------------- */
      var sm = smoothPositions(rawArr, n, closed, sub);
      var lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute('position', new THREE.BufferAttribute(sm.arr, 3));
      lineGeo.setAttribute('color', new THREE.BufferAttribute(colorArray(sm.count, rgbFnFor(color, kind)), 3));

      /* 线亮度 = 层级不透明度 × 全局线亮度（老师可调：调低才看得见泡泡） */
      var lineMat = new THREE.LineBasicMaterial({
        vertexColors: true, transparent: true, opacity: opacity * state.lineBright,
        depthWrite: false, blending: THREE.AdditiveBlending,
        /* 🔴 2026-10-19 老师：「七级螺旋线太细」。
           WebGL 里 LineBasicMaterial.linewidth 在多数平台被忽略（永远 1px），写上无害；
           真正让它"看起来粗"的是下面那条**叠加层**（同几何再画一遍，additive 叠加 ⇒ 更亮更厚）。 */
        linewidth: 2
      });
      var line = new THREE.Line(lineGeo, lineMat);
      line.frustumCulled = false;
      line.renderOrder = 1;
      gWires.add(line);

      /* ---- 叠加层（模拟"加粗"）----
         同一条几何再画一遍，用更低的 opacity 做 additive 叠加：
         两条 1px 线完全重合 ⇒ 亮度相加，视觉上更实、更"粗"，
         且**不会像 scale 那样让不居中的曲线错位**。
         只在最细一级（kind==='thin' 且该级为 L7）额外加，避免把所有层级一起点亮。 */
      if (state.lineHalo !== false) {
        var haloMat = new THREE.LineBasicMaterial({
          vertexColors: true, transparent: true,
          opacity: Math.min(1, opacity * state.lineBright * 0.55),
          depthWrite: false, blending: THREE.AdditiveBlending, linewidth: 2
        });
        var halo = new THREE.Line(lineGeo, haloMat);
        halo.frustumCulled = false;
        halo.renderOrder = 1;
        halo.name = 'halo';
        gWires.add(halo);
      }

      /* ---------------- ③ koilon 珍珠（**只有最细一级**才建） ----------------
         🔴 老师 2026-10-08 深夜：「你这个动态演示图**只需要到最后 7th-order spirillae**
            才需要你画上 **7 个**点亮的像珍珠一般的散点代表 koilon 粒子，**其它阶的 spirillae
            只要求能看到明显发亮的 spirillae 曲线**就 ok，不需要看到散点。」
         🔴 老师 2026-10-08 第 ④ 条：「koilon 珍珠**每匝 7 颗**要作为网页默认设置，
            仅仅是放大到 7th order 螺旋线才能看到每匝是 7 颗。」
         ⇒ 判据（见 `setBundle` 的 `isKoilon`）：`isFinest && k ≥ 2 && turns ≤ 12`。
             · 最细一级（阶梯 = 第 7 阶 / 爱心 = 第 D 阶，都恰好 **7 匝**）
               颗数 = `turns × state.pearlsPerTurn`，在整条曲线上**均匀取点** ——
               `pearlsPerTurn = 7`（网页默认）⇒ 7 匝 × 7 颗 = **49 颗**（每匝 7 颗，一眼可数）；
             · 其余各级 `pearlTurns = 0` ⇒ 连几何都不建（顺带省显存），只有发亮的曲线。
         这里只记 `pearlTurns`（**匝数**，与 pearlsPerTurn 解耦），
         真正的颗数在 `buildPearls()` 里现算 ⇒ 拖动滑块时 `rebuildPearls()` 能按新密度重算。 */
      var pearlCount = pearlTurns > 0 ? pearlTurns * (state.pearlsPerTurn || 1) : 0;
      var ptsGeo = null, points = null, pMat = null, spacing = 0, npPearl = 0;
      if (pearlCount > 0) {
        var pr = buildPearls(pos, n, pearlCount, color, kind);
        ptsGeo = pr.ptsGeo; points = pr.points; pMat = pr.pMat;
        spacing = pr.spacing; npPearl = pr.npPearl;
      }

      return { lineGeo: lineGeo, ptsGeo: ptsGeo, line: line, points: points, halo: (typeof halo!=='undefined'?halo:null),
               count: sm.count, rawCount: npPearl, logical: n, sub: sub,
               rawArr: rawArr, pos: pos, closed: closed, color: color,
               mat: lineMat, pmat: pMat, base: opacity, spacing: spacing, kind: kind,
               pearlTurns: pearlTurns };
    }

    /**
     * koilon 珍珠密度变化 → **只重建散点**（曲线、材质、相机全不动）。
     * 这是 `setPearlsPerTurn()` 的实现体；`anu-app.js` 拖「koilon 珍珠」滑块时调用。
     * 对每一根丝的最细一级：把旧的 Points 从场景移除并释放，再按新密度建一组。
     */
    function rebuildPearls() {
      var total = 0, perWire = 0, wiresTouched = 0;
      wires.forEach(function (w) {
        w.levelObjs.forEach(function (o) {
          if (!(o.pearlTurns > 0)) { return; }
          if (o.points) {
            gWires.remove(o.points);
            if (o.points.geometry) { o.points.geometry.dispose(); }
            if (o.pmat) { o.pmat.dispose(); }
            o.points = null; o.ptsGeo = null; o.pmat = null; o.spacing = 0; o.rawCount = 0;
          }
          var pr = buildPearls(o.pos, o.logical, o.pearlTurns * (state.pearlsPerTurn || 1), o.color, o.kind);
          o.ptsGeo = pr.ptsGeo; o.points = pr.points; o.pmat = pr.pMat;
          o.spacing = pr.spacing; o.rawCount = pr.npPearl;
          total += pr.npPearl; perWire = pr.npPearl; wiresTouched++;
        });
      });
      return { pearlsPerTurn: state.pearlsPerTurn, pearlsPerWire: perWire, pearlsTotal: total, wires: wiresTouched };
    }

    /** 只改平滑倍数 → 只重建**线的几何**，不动泡泡、不重建模型（拖滑块用） */
    function setSplineSub(k) {
      state.splineSub = Math.max(1, Math.min(4, Math.round(k || 1)));
      wires.forEach(function (w) {
        w.levelObjs.forEach(function (o) {
          var sub = smoothSubFor(o.logical);
          var sm = smoothPositions(o.rawArr, o.logical, o.closed, sub);
          o.line.geometry.dispose();
          var g = new THREE.BufferGeometry();
          g.setAttribute('position', new THREE.BufferAttribute(sm.arr, 3));
          g.setAttribute('color', new THREE.BufferAttribute(colorArray(sm.count, rgbFnFor(o.color, o.kind)), 3));
          o.line.geometry = g;
          o.lineGeo = g;
          o.count = sm.count;
          o.sub = sub;
        });
      });
      return { sub: state.splineSub, points: wires.reduce(function (s, w) {
        return s + w.levelObjs.reduce(function (t, o) { return t + o.count; }, 0);
      }, 0) };
    }

    /* 基准圆（第 0 阶：丝展开后的那个完整的圆） */
    function buildBaseCircle(radius) {
      while (gBase.children.length) {
        var c = gBase.children.pop();
        if (c.geometry) { c.geometry.dispose(); }
        if (c.material) { c.material.dispose(); }
      }
      var pts = [], N = 240;
      for (var i = 0; i <= N; i++) {
        var a = i / N * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
      }
      var line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineDashedMaterial({ color: 0x9fb3d1, dashSize: 0.045, gapSize: 0.035, transparent: true, opacity: 0.55 }));
      line.computeLineDistances();
      gBase.add(line);
    }

    /* 辅助参考线（蛋形侧影 / 吸引管 funnel tube / 涌流尖）：一次性整体替换 */
    function clearGuides() {
      while (gGuides.children.length) {
        var c = gGuides.children.pop();
        if (c.geometry) { c.geometry.dispose(); }
        if (c.material) { c.material.dispose(); }
      }
    }
    /**
     * @param {Array} list [{pts:[[x,y,z],...], color:'#rrggbb', opacity:0..1,
     *                       closed?:bool, dashed?:bool, dashSize?, gapSize?}]
     */
    function setGuides(list) {
      clearGuides();
      if (!list || !list.length) { return 0; }
      list.forEach(function (g) {
        if (!g || !g.pts || g.pts.length < 2) { return; }
        var v = g.pts.map(function (p) { return new THREE.Vector3(p[0], p[1], p[2]); });
        var mat;
        if (g.dashed) {
          mat = new THREE.LineDashedMaterial({
            color: g.color || '#9fb3d1', dashSize: g.dashSize || 0.04, gapSize: g.gapSize || 0.03,
            transparent: true, opacity: (g.opacity == null ? 0.5 : g.opacity)
          });
        } else {
          mat = new THREE.LineBasicMaterial({
            color: g.color || '#9fb3d1', transparent: true,
            opacity: (g.opacity == null ? 0.5 : g.opacity), depthWrite: false
          });
        }
        var line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(v), mat);
        if (g.dashed) { line.computeLineDistances(); }
        line.frustumCulled = false;
        gGuides.add(line);
      });
      return gGuides.children.length;
    }

    /**
     * 装载模型组。list = [{ model, color, kind }]
     * kind: 'thick' | 'thin' | 'single'
     */
    function setBundle(list) {
      clearWires();
      list.forEach(function (item) {
        var model = item.model;
        var objs = [];
        var D = model.depth;
        for (var k = 1; k <= D; k++) {
          var lv = model.levels[k];
          /* 深层细节越来越细：越深越暗，突出"逐级细分" */
          var isFinest = (k === D);
          var op = isFinest ? 0.95 : 0.34;
          if (state.colorMode === 'level') { op = isFinest ? 1.0 : 0.42; }
          /* 🔴 koilon 珍珠**只在「最低阶 spirilla」那一阶**画（老师 2026-10-08）：
               阶梯 = 第 7 阶（7 匝）；爱心 = 第 D 阶（每级 7 匝）。
             判定 = `isFinest && k ≥ 2 && turns ≤ 12`：
               · k ≥ 2  —— 第 1 阶是 **1st-order spirillae（1680 匝）**，
                            它还得再细分 6 级才到底 ⇒ **不是 koilon ⇒ 不画散点**；
               · turns ≤ 12 —— 只有「每级 7 匝」那一阶才是珍珠串（1680 匝那阶显然不符）。
             其余各级 pearlTurns = 0 ⇒ 连几何都不建（顺带省显存），只有发亮的 spirilla 曲线。
             传下去的是**匝数**（`pearlTurns`）而不是颗数 —— 颗数 = 匝数 × pearlsPerTurn
             在 `buildLevelObjects` / `rebuildPearls` 里现算，这样拖密度滑块才能立刻生效。 */
          var isKoilon = isFinest && k >= 2 && (lv.turns || 0) <= PEARL_MAX_TURNS;
          var pearlTurns = isKoilon ? (lv.turns || 0) : 0;
          objs.push(buildLevelObjects(lv, item.color, op, 1, item.kind, pearlTurns));
        }
        wires.push({ name: item.name || '', color: item.color, kind: item.kind, levels: model.levels, depth: D, levelObjs: objs, model: model });
      });
      /* 基准圆只对「平面圆」基准有意义；蛋形模式下 baseR = 0 → 跳过 */
      if (wires.length && wires[0].model.cfg.baseR) { buildBaseCircle(wires[0].model.cfg.baseR); }
      applyGrowth();
      buildPlaneIndicators();
      return wires.length;
    }

    /* 正交平面指示：在每一阶的采样点画一个平面圆环 + 法向线 */
    function buildPlaneIndicators() {
      while (gPlanes.children.length) {
        var c = gPlanes.children.pop();
        if (c.geometry) { c.geometry.dispose(); }
      }
      if (!state.showPlanes || !wires.length) { return; }
      var w = wires[0];
      var scaleRef = 1.0;
      for (var k = 1; k <= w.depth; k++) {
        var lv = w.levels[k];
        var p = lv.samplePoint, nrm = new THREE.Vector3(lv.planeNormal[0], lv.planeNormal[1], lv.planeNormal[2]).normalize();
        var R = Math.max(0.055, Math.min(0.42, lv.radius * 3.6));
        /* 平面圆环 */
        var pts = [], N = 96;
        for (var i = 0; i <= N; i++) { pts.push(new THREE.Vector3(Math.cos(i / N * Math.PI * 2) * R, Math.sin(i / N * Math.PI * 2) * R, 0)); }
        var ring = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
          new THREE.LineBasicMaterial({ color: LEVEL_COLORS[k % LEVEL_COLORS.length], transparent: true, opacity: 0.85 }));
        ring.position.set(p[0], p[1], p[2]);
        var q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), nrm);
        ring.quaternion.copy(q);
        gPlanes.add(ring);
        /* 法向短线 */
        var np = [new THREE.Vector3(0, 0, -R * 1.7), new THREE.Vector3(0, 0, R * 1.7)];
        var nl = new THREE.Line(new THREE.BufferGeometry().setFromPoints(np),
          new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
        nl.position.copy(ring.position); nl.quaternion.copy(q);
        gPlanes.add(nl);
      }
    }

    /* --------------------------------------------------------------- 生长动画 */
    function applyGrowth() {
      var g = Math.max(0, Math.min(1, state.growth));
      wires.forEach(function (w) {
        w.levelObjs.forEach(function (o) {
          /* 同时保留少量"收尾"重叠，避免末点孤立 */
          var n = Math.max(2, Math.floor(o.count * g) + 1);
          o.lineGeo.setDrawRange(0, Math.min(o.count, n));
          /* koilon 珍珠也随生长逐颗浮现（只有最细一级有 ptsGeo） */
          if (o.ptsGeo) {
            var nr = Math.max(1, Math.floor(o.rawCount * g) + (g > 0 ? 1 : 0));
            o.ptsGeo.setDrawRange(0, Math.min(o.rawCount, nr));
          }
        });
      });
    }

    /* --------------------------------------------------------------- 相机交互 */
    var lastNear = 0, lastFar = 0;
    /** target 平面处的「半屏高」对应的世界高度（fov 是**垂直**视角） */
    function halfScreenH() { return cam.dist * Math.tan(camera.fov * Math.PI / 360); }
    /**
     * 真正的注视点 = 用户 target + 屏幕空间下移量（老师第 ⑨ 条）。
     * 下移量 = `viewDrop × 屏高`（屏高 = 2·半屏高）⇒ 世界原点出现在中心下方 1/4 屏高处。
     */
    var _lookAt = new THREE.Vector3();
    function lookTarget() {
      _lookAt.copy(cam.target);
      _lookAt.y += 2 * halfScreenH() * cam.viewDrop;   /* 注视点**抬高** ⇒ 原点在屏上**下移** */
      return _lookAt;
    }

    /* 🔴 三轴指示器的摆位（每帧在 syncCamera 里调一次）：
       🔴🔴 2026-10-08 老师（第一次交付后立即订正）：「**3D XYZ 坐标轴 的位置不对，
          应该在 anu 的质心或 图的原点**」。
         旧口径把它当「屏幕左下角的方位小罗盘」（每帧贴在相机前方左侧）——
         位置随视角漂，读不出「world 原点到底在哪」，与老师要的东西不是一回事。

       🔴🔴🔴 2026-10-08 老师（**第二次**订正 · 由真浏览器核实【C】量化抓出）：
         第一版把它钉在 `cam.target` 上，注释里还写着「cam.target 就是原点」—— **错了**。
         `cam.target` 是**相机注视点**，是个**用户可改的取景枢轴**：
           · Shift 拖拽平移会改它（`panByPixels`）；
           · 「逐级放大」会把某一阶的焦点喂给它（`setCam(..., point)`）。
         拿它当原点 ⇒ 平移一次，图和坐标架**脱钩**。
         真浏览器核实【C】的实测（`_scratch/_z_zoom.js`）：Shift 拖拽 (150, −70) px 后，
           图 的亮质心位移 = (156.7, −44.3) px，而 坐标架白点位移 = (0.1, 0.1) px —— 纹丝不动。
         ⇒ 正确口径 = **钉在图形自身的原点 = 世界 (0,0,0)**（几何就是绕它建的，也就是 anu 的质心处）：
           · 位置：`gAxes.position = (0,0,0)` —— 与 `cam.target` **无关**；
                   图怎么平移/缩放，坐标架都跟着图一起走（物不动它不动）；
           · 长度：`min(0.30·dist, AXES_MAX_LEN)` —— 上限 0.5 = **参考球壳半径（1.0）的一半**，
                   全景时是一根「半个图形大小」的坐标架；放大到局部时自动缩短；
           · 姿态：恒等（世界系）⇒ 相机一转，三轴上屏朝向跟着转。
       遮挡：`depthTest = false` + 高 `renderOrder` ⇒ 永远画在最上层，不被丝/球壳挡住。 */
    var AXES_MAX_LEN = 0.5;                 /* 坐标架长度上限（世界单位）：参考球壳半径是 1.0 ⇒ 取它的一半 */
    function placeAxes() {
      if (!gAxes.visible) { return; }
      /* ⚠️ 钉死在**世界原点**（图形原点），**不跟** `cam.target` —— 见上方第二次订正。 */
      gAxes.position.set(0, 0, 0);
      gAxes.scale.setScalar(Math.min(cam.dist * 0.30, AXES_MAX_LEN));
    }
    function syncCamera() {
      var d = cam.dist;
      var T = lookTarget();
      camera.position.set(
        T.x + d * Math.sin(cam.phi) * Math.sin(cam.theta),
        T.y + d * Math.cos(cam.phi),
        T.z + d * Math.sin(cam.phi) * Math.cos(cam.theta)
      );
      camera.lookAt(T);
      /* 逐级放大时尺度跨越 4 个数量级 → 近/远裁剪面随距离自适应 */
      var nd = Math.max(1e-5, d * 0.008);
      var fd = Math.max(50, d * 60);
      if (lastNear === 0 || nd < lastNear * 0.7 || nd > lastNear * 1.4 ||
          fd > lastFar * 1.4 || fd < lastFar * 0.7) {
        lastNear = nd; lastFar = fd;
        camera.near = nd; camera.far = fd;
        camera.updateProjectionMatrix();
      }
      placeAxes();                       /* 🔴 三轴指示器：钉在**世界原点**（图形原点），长度随 dist 自适应 */
    }

    /* ------------------------------------------------------------- ⑧ 平移视图 */
    /**
     * 🔴 老师 2026-10-08 第 ⑧ 条：「按住 **shift** 来拖拽即可移动**原点位置**（类似平移页面）」。
     * 把屏幕像素位移换成**相机右/上向量**上的世界位移（比例 = 世界/像素，随 dist 自适应）：
     *   世界高（target 平面）= 2·半屏高（fov 是**垂直**视角）⇒ 每 px = 2·halfH / 画布高
     *   世界宽 = 世界高 × 宽高比 = 2·halfH·(w/h)，**再除以屏宽 w** ⇒ 仍是 2·halfH / 画布高
     *   ⇒ **水平与垂直每像素的世界距离相等**，两轴共用同一个 `wPerPx`。
     * 拖右 ⇒ 物体右移 ⇒ target 左移（取负号）；拖下 ⇒ 物体下移 ⇒ target 上移（取正号）。
     * 位移严格在**屏幕平面内**（沿相机 right/up），所以「屏幕上拖了多少 px，物体就跟着走多少 px」。
     *
     * 🔴🔴 2026-10-14 修 bug（本条由真浏览器实测抓出，`_scratch/_z_probe_pan.js`）：
     *   原式写成 `var wPerPxX = wPerPxY * (w / h);` —— **多乘了一次宽高比**。
     *   后果：Shift 拖拽时**水平**平移比鼠标快 `w/h` 倍（画布越宽越离谱），
     *   而垂直方向一直是对的 ⇒ 斜着拖会「跑偏」。
     *   实测（直接读 `getPan()` 的世界位移，无像素噪声；同 100 px 的水平/垂直位移之比）：
     *     画布 1538×969（四块面板默认折叠）⇒ 1.5872 ＝ w/h
     *     画布 1288×969（左栏展开）      ⇒ 1.3292 ＝ w/h
     *   修好后两个方向都 1:1。**注**：原注释里那句「水平：世界宽 = 世界高 × 画布宽高比，
     *   wPerPxX = 世界宽 / 画布宽」**本身是对的**（约分掉 w 后 = 2·halfH/h），
     *   是代码多乘了一次 —— 典型的「注释对、代码错」。
     *   ⚠️ 本函数**与画布宽度无关**：`w` 已从比例计算里移除（旧版那句
     *      `canvas.clientWidth` 读取随之删掉，避免又有人顺手把它乘回去）。
     */
    var _right = new THREE.Vector3(), _up = new THREE.Vector3(), _off = new THREE.Vector3();
    var _wUp = new THREE.Vector3(0, 1, 0);
    function panByPixels(dx, dy) {
      var h = Math.max(1, canvas.clientHeight || canvas.height || 600);
      var halfH = halfScreenH();
      var wPerPx = (2 * halfH) / h;      /* 🔴 水平、垂直**共用**（旧版这里多乘了一个 w/h） */
      /* 相机的右/上向量：从 theta/phi 推出的「相机相对注视点的单位偏移」 _off */
      _off.set(Math.sin(cam.phi) * Math.sin(cam.theta), Math.cos(cam.phi), Math.sin(cam.phi) * Math.cos(cam.theta));
      _right.crossVectors(_wUp, _off).normalize();       /* = THREE lookAt 的局部 X */
      _up.crossVectors(_off, _right).normalize();        /* = THREE lookAt 的局部 Y */
      cam.target.addScaledVector(_right, -dx * wPerPx);
      cam.target.addScaledVector(_up, dy * wPerPx);
      camTween = null;
    }

    var drag = null;
    function onDown(e) {
      var t = e.touches ? e.touches[0] : e;
      drag = {
        x: t.clientX, y: t.clientY, moved: 0,
        /* Shift（触屏用双指也走平移，这里只判 shiftKey） */
        pan: !!e.shiftKey
      };
    }
    function onMove(e) {
      if (!drag) { return; }
      var t = e.touches ? e.touches[0] : e;
      var dx = t.clientX - drag.x, dy = t.clientY - drag.y;
      drag.x = t.clientX; drag.y = t.clientY;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      if (drag.pan || e.shiftKey) {          /* 🔴 Shift + 拖拽 = 平移（老师第 ⑧ 条） */
        drag.pan = true;
        panByPixels(dx, dy);
        return;
      }
      cam.theta -= dx * 0.008;
      cam.phi = Math.max(0.05, Math.min(Math.PI - 0.05, cam.phi - dy * 0.008));
      camTween = null;
    }
    function onUp() { drag = null; }
    function onWheel(e) {
      e.preventDefault();
      cam.dist = Math.max(0.0004, Math.min(40, cam.dist * (1 + (e.deltaY > 0 ? 0.10 : -0.10))));
      camTween = null;
    }
    canvas.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    canvas.addEventListener('touchstart', onDown, { passive: true });
    canvas.addEventListener('touchmove', onMove, { passive: true });
    canvas.addEventListener('touchend', onUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    /* ------------------------------------------------------------------ 尺寸 */
    function resize() {
      var w = canvas.clientWidth || 800, h = canvas.clientHeight || 600;
      if (canvas.width !== w || canvas.height !== h) {
        renderer.setSize(w, h, false);
        camera.aspect = w / Math.max(1, h);
        camera.updateProjectionMatrix();
      }
    }

    /* ------------------------------------------------------------------ 循环 */
    var last = 0, raf = null;
    function frame(ts) {
      raf = requestAnimationFrame(frame);
      var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0; last = ts;
      resize();
      if (state.rotate && !drag) { cam.theta += dt * state.autoSpeed; }
      if (camTween) {
        camTween.t = Math.min(1, camTween.t + dt / camTween.dur);
        var e = camTween.t < 0.5 ? 2 * camTween.t * camTween.t : -1 + (4 - 2 * camTween.t) * camTween.t;
        cam.theta = camTween.a.theta + (camTween.b.theta - camTween.a.theta) * e;
        cam.phi = camTween.a.phi + (camTween.b.phi - camTween.a.phi) * e;
        cam.dist = camTween.a.dist + (camTween.b.dist - camTween.a.dist) * e;
        cam.target.lerpVectors(camTween.a.target, camTween.b.target, e);
        if (camTween.t >= 1) { camTween = null; }
      }
      syncCamera();
      renderer.render(scene, camera);
    }

    /* ------------------------------------------------------------------ API */
    var api = {
      scene: scene, camera: camera, renderer: renderer,
      setBundle: setBundle,
      setColorMode: function (m) { state.colorMode = m; rebuildColors(); },
      /**
       * koilon 珍珠密度（**最细一级每匝**几颗）。
       * 🔴 这里此前**没有这个方法** ⇒ `anu-app.js` 里那句
       *   `if (pearlsChanged && scene.setPearlsPerTurn) scene.setPearlsPerTurn(...)`
       *   一直静默跳过，场景内 `state.pearlsPerTurn` 永远停在 `Scene.create()` 那一刻的值
       *   ⇒ **拖动「koilon 珍珠」滑块不改变珍珠颗数**（虽然会触发重建，但重建读的是旧值）。
       *   现在补上：改值后按当前 bundle 重算散点（`rebuildPearls()` 只重建 Points，不动曲线）。
       */
      setPearlsPerTurn: function (v) {
        state.pearlsPerTurn = Math.max(1, Math.round(+v || 1));
        return rebuildPearls();      /* 回传 { pearlsPerTurn, pearlsPerWire, pearlsTotal } 供自检/调试 */
      },
      getPearlsPerTurn: function () { return state.pearlsPerTurn; },
      /** B-spline 平滑细分倍数（1 = 关闭）。只重建线的几何，不重建模型 —— 拖滑块用 */
      setSplineSub: setSplineSub,
      getSplineSub: function () { return state.splineSub; },
      setShowShell: function (v) { state.showShell = v; gShell.visible = v; },
      setShowBase: function (v) { state.showBase = v; gBase.visible = v; gGuides.visible = v; },
      /* 🔴 2026-10-08 老师：「显示 选项卡 里面要有 3d xyz axis 打勾选项」 */
      setShowAxes: function (v) {
        state.showAxes = !!v;
        gAxes.visible = state.showAxes;
        placeAxes();
        return gAxes.visible;
      },
      getShowAxes: function () { return gAxes.visible; },
      setGuides: setGuides,
      setShowPlanes: function (v) { state.showPlanes = v; buildPlaneIndicators(); },
      setShowBubbles: function (v) {
        state.showBubbles = v;
        wires.forEach(function (w) {
          w.levelObjs.forEach(function (o) { if (o.points) { o.points.visible = v; } });
        });
      },
      setBubbleSize: function (s) {
        state.bubbleSize = s;
        wires.forEach(function (w) {
          w.levelObjs.forEach(function (o) {
            if (o.pmat) { o.pmat.size = bubbleSizeOf(o.spacing, o.kind, s); }
          });
        });
      },
      /** 螺旋线亮度（0.03–1）：调低 → koilon 泡泡才显出来 */
      setLineBright: function (v) {
        state.lineBright = Math.max(0.03, Math.min(1, v));
        wires.forEach(function (w) {
          w.levelObjs.forEach(function (o) { o.mat.opacity = o.base * state.lineBright; });
        });
      },
      setRotate: function (v) { state.rotate = v; },
      setAutoSpeed: function (s) { state.autoSpeed = s; },
      setGrowth: function (g) { state.growth = g; applyGrowth(); },
      /**
       * 🔴 老师 2026-10-08 第 ⑨ 条：世界原点在屏幕上下移多少（屏高比例，默认 0.25）。
       * 0 = 原点在画面正中；0.25 = 原点在中心下方 1/4 屏高处。
       */
      setViewDrop: function (f) {
        cam.viewDrop = Math.max(-0.5, Math.min(0.5, +f || 0));
        syncCamera();
        return cam.viewDrop;
      },
      getViewDrop: function () { return cam.viewDrop; },
      /** 🔴 第 ⑧ 条：屏幕像素位移 → 平移（Shift+拖拽走这条；也供脚本/自检直接调用） */
      panByPixels: function (dx, dy) { panByPixels(dx, dy); syncCamera(); return cam.target.clone(); },
      /** 平移量（世界坐标），用于自检「Shift 拖拽真的动了原点」 */
      getPan: function () { return cam.target.clone(); },
      /** 当前**真实注视点** = target + 屏幕下移量（自检用：证明第 ⑨ 条生效） */
      getLookTarget: function () { return lookTarget().clone(); },
      resetView: function (dist, theta, phi) {
        camTween = null;
        cam.dist = dist || 4.2; cam.theta = (theta == null ? 0.9 : theta); cam.phi = (phi == null ? 1.12 : phi);
        cam.target.set(0, 0, 0); syncCamera();
      },
      /** 平滑飞到某点（逐级放大用） */
      flyTo: function (p, dist, dur, theta, phi) {
        camTween = {
          a: { theta: cam.theta, phi: cam.phi, dist: cam.dist, target: cam.target.clone() },
          b: {
            theta: (theta == null ? cam.theta : theta), phi: (phi == null ? cam.phi : phi),
            dist: dist, target: new THREE.Vector3(p[0], p[1], p[2])
          },
          t: 0, dur: dur || 1.1
        };
      },
      /**
       * 🔴 **瞬时**把相机放到指定状态（不做补间）。
       *
       * 「逐级放大播放」的 GIF 录制用它逐帧驱动：现场播放（RAF）与录制（逐帧采样）
       * 跑的是**同一个 `zoomAt()`**，所以 GIF 与屏幕所见**逐帧一致**
       * —— 不会出现「录出来和看到的不一样」这种两套算法漂移。
       *
       * ⚠️ 它只写相机状态、**不渲染**（与 `flyTo` 同口径）：调用方自己决定何时 `renderer.render`。
       * 参数为 null/缺省 = 保持原值（可只改其中一项）。
       */
      setCam: function (theta, phi, dist, target) {
        camTween = null;                       /* 手动定位 ⇒ 取消未完成的补间，否则下一帧被覆盖 */
        if (theta != null) { cam.theta = theta; }
        if (phi != null) { cam.phi = phi; }
        if (dist != null) { cam.dist = dist; }
        if (target) { cam.target.set(target[0], target[1], target[2]); }
        syncCamera();
        return { theta: cam.theta, phi: cam.phi, dist: cam.dist };
      },
      getCam: function () { return { theta: cam.theta, phi: cam.phi, dist: cam.dist }; },
      /**
       * 🔴 2026-10-17 老师：「给 Anu 页加一个小控件，按分辨率即时算出『最多看得见几级』」
       * 每**世界单位**在注视点平面上对应多少 CSS 像素（垂直方向）。
       * 推导：垂直视角 fov ⇒ 半屏高对应的世界高度 = dist·tan(fov/2)；
       *       画布高 h 像素对应世界高 2·dist·tan(fov/2) ⇒ ppu = h / (2·dist·tan(fov/2))。
       * ⚠️ 这是**几何投影**意义上的 ppu，不含 `renderer.setPixelRatio` 的物理像素倍数
       *   （人眼分辨极限按 CSS px 计，所以判据用 CSS px 才是对的）。
       */
      getPixelsPerUnit: function () {
        var h = canvas.clientHeight || canvas.height || 600;
        return h / (2 * halfScreenH());
      },
      /**
       * 逐阶半径（世界单位），索引 = 阶号；`[0]` 是母 whorl（宏观 5 圈路径），`[1..D]` 才是 spirillae。
       * 十丝同构 ⇒ 取第一根丝即可。供「最多看得见几级」与探针使用。
       */
      getLevelRadii: function () {
        if (!wires.length) { return []; }
        var ls = wires[0].levels || [];
        return ls.map(function (lv, k) { return { k: k, radius: lv.radius, turns: lv.turns }; });
      },
      resize: resize,
      start: function () { if (!raf) { raf = requestAnimationFrame(frame); } },
      stop: function () { if (raf) { cancelAnimationFrame(raf); raf = null; } },
      dispose: function () {
        api.stop(); clearWires();
        canvas.removeEventListener('mousedown', onDown);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        canvas.removeEventListener('wheel', onWheel);
        renderer.dispose();
      }
    };

    function rebuildColors() {
      wires.forEach(function (w) {
        w.levelObjs.forEach(function (o, idx) {
          /* 线（平滑后）与 koilon 珍珠（最细一级才有）两套几何共用同一套取色规则 */
          [o.lineGeo, o.ptsGeo].forEach(function (g) {
            if (!g) { return; }
            var n = g.getAttribute('position').count;
            g.setAttribute('color', new THREE.BufferAttribute(colorArray(n, rgbFnFor(
              state.colorMode === 'level' ? LEVEL_COLORS[(idx + 1) % LEVEL_COLORS.length] : w.color, w.kind
            )), 3));
          });
        });
      });
    }

    /** 视图主题（暗/亮） */
    api.setTheme = function (theme) {
      var dark = theme !== 'light';
      scene.background = new THREE.Color(dark ? 0x0a0e17 : 0xf2f5fa);
      var shellMat = gShell.children[0] && gShell.children[0].material;
      if (shellMat) { shellMat.color.set(dark ? 0x6ea8ff : 0x2f6fd0); shellMat.opacity = dark ? 0.055 : 0.10; }
      gShell.children.forEach(function (c) {
        if (c.isLine) { c.material.color.set(dark ? 0x8ab4ff : 0x2f6fd0); c.material.opacity = dark ? 0.20 : 0.28; }
      });
    };

    buildPlaneIndicators();
    api.setTheme(opts.theme || 'dark');
    syncCamera();
    return api;
  }

  return { create: create, SPECTRUM: SPECTRUM, LEVEL_COLORS: LEVEL_COLORS, spectrumAt: spectrumAt };
});
