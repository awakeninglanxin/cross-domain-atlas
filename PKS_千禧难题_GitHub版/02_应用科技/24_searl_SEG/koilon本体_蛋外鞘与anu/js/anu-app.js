/* ============================================================================
 * anu-app.js —— 主控：状态 / 建模 / 装配 / 播放调度
 * ----------------------------------------------------------------------------
 * 依赖：anu-geometry.js（数学）、anu-scene.js（three.js）、anu-ui.js（DOM）
 * 单一职责：把三者编排起来，持有全部业务状态。
 * ==========================================================================*/
(function () {
  'use strict';

  var G = window.AnuGeo, Scene = window.AnuScene, UI = window.AnuUI;
  var Heart = window.AnuHeart;
  /* 🔴 2026-10-08 老师第 ③ 条：「旧版蛋形演示图在网页里移除，是多余的」⇒
     旧模块 `js/anu-ovoid.js`（`window.AnuOvoid`）连同预设 ①b 一并下线，
     本文件不再持有 `Ovoid` 引用（`rebuildOvoid` / `state.ovoidTurns` / `shape === 'ovoid'` 全删）。 */
  if (!G || !Scene || !UI) { return; }

  var canvas = document.getElementById('cv');

  /* ------------------------------------------------------------------ 状态 */
  var state = {
    shape: 'heart',           /* 'heart' = Anu 爱心双螺旋整体形态（预设①）；'coil' = 递归细分 */
    baseKind: 'circle',       /* 'circle' = 展开后的圆（唯一在用的基准；旧的 'whorlSeg' 已随蛋形预设下线） */
    depth: 3,
    turns1: 1680,             /* 第 1 阶：1st-order spirilla 匝数（文献 1680；滑块上限 1684）
                                 —— 爱心模式下 = 每根 whorl spring 的匝数 */
    turns: 7,                 /* 第 2 阶起：每级 7 匝（2nd~7th-order spirilla），固定不可调 */
    turnsList: null,          /* 预设可显式指定逐阶圈数 */
    fill: 0.50,
    mode: 'normal',           /* 🔴 2026-10-08 老师：「默认应该是**全环向，也就是经典超螺旋**」。
                                 alternate = 交替正交（相邻级缠绕平面 90°，文献口径）；
                                 axial = 全轴向。三者的差别见 `anu-heart.js: modesFor()`。 */
    wires: 10,
    /* 🔴 2026-10-08 老师（先）：「3 根粗丝要用 cmap 的 hot（金黄-白渐变），7 根细丝要用 cmap 的
       rainbow（彩虹渐变）」＋「你目前渲染是统一用了一种 cmap 渲染，**不对**」⇒ 那时默认切成 'cmap'。
       🔴 2026-10-08 老师（后，第 ⑤ 条）：「默认改为**按丝着色**（3 粗米白 / 7 细七色）」——
       故默认改回 'wire'：把「按丝着色」设为勾选、「双色图着色」取消勾选（两者互斥，
       优先级见 `applyDisplayFromUI`）。按丝着色 = 3 粗丝米白系（`Heart.THICK_COLORS`）
       + 7 细丝光谱七色（`Scene.SPECTRUM`）；双色图 hot / rainbow 仍可随时勾回。 */
    colorMode: 'wire',        /* cmap | spectrum | level | wire（默认 wire = 按丝着色） */
    microSpp: 14,             /* 🔴 每匝 spirilla 采样点数（**必须是 7 的倍数**，滑块步长锁 7） */
    splineSub: 2,             /* 🔴 连线前的 centripetal Catmull-Rom 细分倍数（1 = 关，裸折线） */
    bubbleSize: 1.5,
    /* 🔴 2026-10-08 老师第 ④ 条：「koilon 珍珠**每匝 7 颗**要作为网页默认设置，
       仅仅是放大到 7th order 螺旋线才能看到每匝是 7 颗」。
       · 「每匝 7 颗」= 文献「最低阶 spirilla 由 7 个气泡组成」（7 颗串成珍珠）；
       · 「只有放大到 7th-order 才看得见」由 `anu-scene.js` 的 `isKoilon` 判据保证 ——
         散点**只画在最低阶**（阶梯 = 第 7 阶、爱心 = 第 D 阶，每级 7 匝）⇒ 7×7 = 49 颗/丝；
         1st-order spirillae（1680 匝）与其余中间各阶**不画散点**，只有发亮的 spirillae 曲线。 */
    pearlsPerTurn: 7,         /* koilon 珍珠：**最细一级每匝**几颗（默认 7；7 匝 ⇒ 49 颗/丝） */
    lineBright: 0.92,         /* 螺旋线亮度（2026-10-19 老师：「太细不够亮」0.55→0.92） */
    /* 🔴 2026-10-08 老师：「**两族的动力学公式是一样的**，两族就是旋转了 180 度。」
       所以**没有任何「两族各自的相位参数」** —— 10 根丝共用 `anu-heart.js` 里那**一个**
       ω = turnsPerLeg。粗 / 细的区别只在几何半径（coilRThick vs coilR、外壁 vs 内壁）。 */
    /* 🔴 2026-10-08 老师：「『双丝分离（更远离苹果壁）』和『苹果壳厚（外壁↔内壁）』
       这两个功能重复了，#选这个就ok（指双丝分离）」。
       核实：在 `anu-heart.js:radOffsets()` 里，`shellGap` 与 `wireSpread` **都只给同一个量**
       `layer` 加 ±Δ/2（粗丝 +½、细丝 −½，**导数完全相同**）⇒ 数学上就是一个旋钮。
       ⇒ 「苹果壳厚」滑块已删除；`shellGap` 从此是**内部常量** = 参考壳厚（2·coilRThick = 0.072，
         两层恰好相切），只由「双丝分离」(spread) 这一个滑块驱动两族开合。 */
    shellGap: 0.072,          /* 苹果「参考壳厚」= 外壁 → 内壁 的径向距离（**内部常量，无 UI**） */
    /* 🔴 2026-10-08 老师第 ⑥ 条：「新增滑条 A —— 双丝在外程更远离苹果壁
       （粗丝更向外膨胀，细丝更向内收敛）」—— 现在是**唯一**的两族分离旋钮。
       🔴🔴 2026-10-08 老师（本轮）：「**双丝分离（更远离苹果壁）默认 0.05**」
          ⇒ 出厂值 0 → **0.05**（粗丝外膨 +0.025 / 细丝内敛 −0.025）。
          ⚠️ 与 `shellGap = 2·coilRThick` 的「恰好相切」只在 Δ = 0 时成立（见 `anu-heart.js` 注释）。 */
    spread: 0.05,
    /* 🔴 2026-10-08 老师第 ⑥ 条：「两个按钮『外场球面切片』和『苹果切片』可以互换」
       fieldShape：1 = 苹果切片（默认，现状）；0.1 = 球形态切片（**端部向内凹陷**的球，
       见 `anu-heart.js: sphereProfile / SPH_INSET`）。 */
    fieldShape: 1,
    /* 🔴 2026-10-08 老师第 ⑦ 条：「苹果锥的直锥 改 接近但不等于直圆柱管」
       半锥角（度）：2.95 = 原直锥（老师红线最小二乘）；拖到 0.05° ⇒ 管径恒定 0.1428、
       锥顶下沉到无穷远 ⇒ **接近但不等于直圆柱**。
       ⚠️ 第二次修订：`tubeHalfAngle` 现在是**当前生效半角**，由 `angleRef × fieldShape`
         联动得到（见 `applyFieldShape()` / `Heart.angleForShape()`）。 */
    tubeHalfAngle: 2.95,
    /* 🔴🔴 2026-10-08 老师（本轮）：「**中轴锥管半锥角（度）这个也需要参与生长呼吸动画**
       （外场从球形 → 苹果 → 球形循环）当到苹果态，半锥角最大，反之最小。
       **外场边界形态和中轴锥管半锥角（度）要同时同步动**」
       ⇒ 引入「参考半角」= **苹果态（f = 1）**的半锥角（默认 = 出厂标定 2.95°）。
          任何 f 变更处都调 `applyFieldShape()`：
              state.tubeHalfAngle = Heart.angleForShape(state.angleRef, f)
          于是**两根滑块一起动**（外场边界形态 + 中轴锥管半锥角）。
       反向：用户手动拖「中轴锥管半锥角」滑块时，按当前 f 反解出新的 `angleRef`
          （`angleRef = 角度 / f`）⇒「临时调细锥角」在后续 f 变化时仍然生效。 */
    angleRef: 2.95,
    /* 🔴 第 ⑦ 条：「或让这个参数动态播放遵循 sin(t) 周期性变化，让这个 Anu 的**外场边界**
       从球形到苹果到球形，可如此循环」⇒ 呼吸播放：fieldShape = (1 − cos 2πt/T)/2。 */
    breathing: false,
    breathPeriod: 12,         /* 呼吸周期（秒） */
    /* 🪞🔴🔴 2026-10-08 老师（新功能）：「结构参数 里点一下 **anu 镜像**，把 anu **以中轴为镜**、
       左右反过来 ⇒ 俯视图看双丝，**顺时针沿直锥下旋**变**逆时针下旋**。
       这两种 anu 都存在：顺时针 = **negative 负磁荷**、逆时针 = **positive 正磁荷**」
       ⇒ `mirror = true` 时几何层把 φ → −φ（半径/高度逐点不动，只翻绕向），
          极性标签自动跟着翻。默认 false = 未镜像（= negative 负磁荷），零回归。 */
    mirror: false,
    /* 🔴 2026-10-08 老师：「网页里面 **默认设置弹簧边贴壁方式：弹簧边同时贴锥壁（内程也外移）**」
       ⇒ 出厂默认由 'shell' 改为 **'both'**（内程也外移一个弹簧半径 ⇒ 弹簧内缘贴锥外壁）。
       三态：'both'（默认，内外程都贴壁）| 'shell'（只外程贴苹果内/外壁）| 'off'（中心线落在壁面上）。 */
    surfaceTangent: 'both',
    growth: 1,
    rotate: false,            /* 默认**不**自动旋转（老师要求：打开页面先静止看形） */
    speed: 0.22,
    /* 🔴 2026-10-08 老师第 ⑨ 条要求「原点下移约 1/4 屏高」；
       2026-10-19 老师改为「**把 anu 的原点位置往上移 1/4 个屏幕**」
       ⇒ 0.25 → 0，世界原点回到屏幕正中（原来的下移量正是 1/4 屏，上移同量即抵消）。
       单位是「屏高比例」，正数 = 原点在中心下方、负数 = 在中心上方；
       实现见 `anu-scene.js` 的 `lookTarget()`。
       第 ⑧ 条：按住 **Shift** 拖拽即可自由平移原点（`panByPixels()`）。 */
    viewDrop: 0,
    /* 🔴 2026-10-08 老师：「显示 选项卡 里面要有 **3d xyz axis** 打勾选项」
       ＋（第一次订正）「**3D XYZ 坐标轴 的位置不对，应该在 anu 的质心或 图的原点**」
       ＋（第二次订正 · 真浏览器核实【C】抓出）必须钉在**图的原点 = 世界 (0,0,0)**，
         而**不是** `cam.target`（相机注视点：Shift 拖拽平移会改它、「逐级放大」会把
         某一阶的焦点喂给它）—— 拿注视点当原点，平移一次坐标架就与图脱钩。
       ⇒ 世界系三轴指示器（X 红 / Y 绿 / Z 蓝），出厂**开**。
       它是**坐标架**：钉在图形自身的原点（世界 (0,0,0)，几何就是绕它建的 ⇒ 也在 anu 质心处），
       姿态与世界系对齐（相机一转，三轴上屏朝向跟着转）。实现见 `anu-scene.js: buildAxes()/placeAxes()`。 */
    showAxes: true,
    theme: 'dark',
    presetId: 'anuHeart'
  };

  /* 初始着色模式 / 平滑倍数都取自 state（避免「HTML 默认勾了双色图、首帧却按 spectrum 画」的错位） */
  var scene = Scene.create(canvas, {
    theme: 'dark',
    colorMode: state.colorMode,
    splineSub: state.splineSub,
    pearlsPerTurn: state.pearlsPerTurn,
    viewDrop: state.viewDrop,
    showAxes: state.showAxes
  });
  var model = null;
  var ui = null;
  var fitDist = 3.2;          /* 自适应取景距离 */
  var effDepthUsed = 3;       /* 实际生效的递归深度（受丝数限制） */
  var capInfo = null;         /* 最近一次构建的限阶信息（用于 HUD 提示） */
  /* 🔴 第 ⑦ 条 GIF 录制期间为 true：与呼吸播放一样要「临时降档 + 独占画布」，
     放在这里声明是为了让 `rebuildHeart()` 能直接读到（同 IIFE 内的函数级 var）。 */
  var gifBusy = false;
  /* 🔴 `gifCap` = 「录 GIF 期间是否要把阶数降到 3 / samp 降到 7」。
     只有**呼吸**路需要（它逐帧 `rebuild`，10 丝 × D=7 太贵）；
     **生长**路只改 drawRange、不重建 ⇒ 必须按用户当前 D 如实录，不能降档。
     （2026-10-08 新增「生长动画导出 GIF」时引入；旧代码用 `gifBusy` 兼任两职。） */
  var gifCap = false;

  /* ------------------------------------------------- 模式/圈数 → 几何参数数组 */
  /** 逐阶圈数：第 1 阶 = T₁（可调）；第 2 阶起恒为 7（文献「每级 7 分叉」） */
  function turnsArray() {
    var a = [], k;
    for (k = 0; k < state.depth; k++) {
      if (state.turnsList && state.turnsList[k] != null) { a.push(state.turnsList[k]); }
      else { a.push(k === 0 ? state.turns1 : 7); }
    }
    return a;
  }
  function modesArray() {
    var a = [], k;
    for (k = 0; k < state.depth; k++) {
      if (state.mode === 'alternate') { a.push(k % 2 === 0 ? 'normal' : 'axial'); }
      else { a.push(state.mode); }
    }
    return a;
  }

  /* ------------------------------------------------------------- 多丝方案 */
  /* 🔴 2026-10-08 老师：「3 粗米白 → 金黄 / 银天蓝 / 银白」（见 anu-heart.js 的 THICK_COLORS） */
  var TC = (Heart && Heart.THICK_COLORS) || ['#f5c542', '#8fd6ff', '#eef3f8'];
  function wireSpecs() {
    var SP = Scene.SPECTRUM, out = [], i;
    if (state.wires === 3) {
      for (i = 0; i < 3; i++) {
        out.push({ key: 'T' + i, kind: 'thick', color: TC[i % TC.length], basePhase: i * Math.PI * 2 / 3, baseR: 1.0, reverse: true, name: '粗丝 ' + (i + 1) });
      }
    } else if (state.wires === 7) {
      for (i = 0; i < 7; i++) {
        out.push({ key: 't' + i, kind: 'thin', color: SP[i], basePhase: i * Math.PI * 2 / 7, baseR: 1.0, reverse: false, name: '细丝 ' + (i + 1) });
      }
    } else if (state.wires === 10) {
      for (i = 0; i < 3; i++) {
        out.push({ key: 'T' + i, kind: 'thick', color: TC[i % TC.length], basePhase: i * Math.PI * 2 / 3, baseR: 1.055, reverse: true, name: '粗丝 ' + (i + 1) });
      }
      for (i = 0; i < 7; i++) {
        out.push({ key: 't' + i, kind: 'thin', color: SP[i], basePhase: i * Math.PI * 2 / 7, baseR: 0.945, reverse: false, name: '细丝 ' + (i + 1) });
      }
    } else {
      out.push({ key: 'single', kind: 'single', color: '#ffd88a', basePhase: 0, baseR: 1.0, reverse: false, name: '单丝递归' });
    }
    return out;
  }

  /* ----------------------------------------------------------------- 重建 */
  var TOTAL_POINT_BUDGET = 900000;    /* 全场景顶点预算（≈1 丝可到 7 阶，10 丝可到 5 阶） */
  var SPP = 10;                       /* 每匝采样点数 */

  /** 单丝在指定深度下的整条点数（含全部中间阶） */
  function wireCost(depth, turns) {
    return G.estimateCounts(depth, turns, SPP).total;
  }

  /**
   * 按「每丝预算」自适应选择有效递归深度：
   * 从用户设定的深度向下搜，找到第一条整条点数 ≤ 预算的深度。
   * 这样「预计超限」在建模前就被拦住，不靠事后降采样硬压（那样最深层会退化成多边形）。
   */
  function effDepthFor(reqDepth, nWires, turns) {
    var per = TOTAL_POINT_BUDGET / nWires;
    var d = reqDepth;
    while (d > 1 && wireCost(d, turns) > per) { d -= 1; }
    return d;
  }

  function rebuild(keepView) {
    if (state.shape === 'heart' && Heart) { rebuildHeart(keepView); return; }
    rebuildCoil(keepView);
  }

  /* --------------------------- 🔴 外场形态 ⊗ 中轴锥管半锥角（唯一联动入口） */
  /**
   * 老师 2026-10-08（本轮）原文：
   *   「**中轴锥管半锥角（度）这个也需要参与生长呼吸动画**（外场从球形 → 苹果 → 球形循环），
   *     当到苹果态，半锥角**最大**，反之最小。
   *     **外场边界形态和中轴锥管半锥角（度）要同时同步动**。」
   *
   * ⇒ 把「哪个量驱动哪个量」定死成一条链，只在**这一个函数**里实现：
   *
   *        f（外场边界形态）  ──►  θ（当前生效半角）= 参考角 × f
   *
   *   并把结果**同时**写进两根滑块 ⇒ 界面上两个滑块同步运动（呼吸时尤其明显：
   *   苹果态 2.95° ↔ 球形态 0.295°，锥高同时从 1× 拉到 10×）。
   *
   * ⚠️ **任何**改动「外场边界形态」的地方都必须走这里：
   *   · `breathStep()`（呼吸动画，每帧一次）
   *   · `applyDisplayFromUI()`（拖滑块 / 点「球面切片」「苹果切片」按钮）
   *   · `applyPreset()`（切预设带来不同的 f）
   *   漏掉任何一处都会出现「几何变了、滑块没动」的错位（老师上一轮报过同类 bug）。
   *
   * ⚠️ 本函数**只改状态与滑块、不重建**（时机由调用者决定：呼吸是每帧一次、
   *    拖滑块是 `applyDisplayFromUI` 统一收口）。
   * @param {number} f 外场边界形态（会被 clamp 到 [FIELD_F_MIN, 1]）
   * @returns {number} 联动算出的「当前生效半角」（度）
   */
  function applyFieldShape(f) {
    var ff = Heart.effFieldShape({ fieldShape: f });
    state.fieldShape = ff;
    /* ⚠️ 量化到滑块的**分辨率**（0.001°）：`rngTubeAngle` 的 value 是整数格，
       不量化的话 state 与 DOM 会差半格，下一次 `emitDisplay` 读回 DOM 就把 state 拽走
       ⇒ 锥高倍率会在 ×2.00 / ×1.99 之间抖（老师上一轮正好报过「读数不准」这类问题）。 */
    state.tubeHalfAngle = Math.round(Heart.angleForShape(state.angleRef, ff) * 1000) / 1000;
    if (ui) {
      if (ui.setFieldShape) { ui.setFieldShape(ff); }                 /* 不 fire ⇒ 不会再引发一轮 onDisplay */
      if (ui.setTubeAngle) { ui.setTubeAngle(state.tubeHalfAngle); }  /* 同上 */
    }
    return state.tubeHalfAngle;
  }

  /**
   * 「整体形态」判断 —— 旧版蛋形（`shape === 'ovoid'`）已于 2026-10-08 按老师第 ③ 条下线，
   * 现在**只剩爱心**这一个整体形态。保留函数名是因为它是 `applyDisplayFromUI()` 里
   * 「几何类改动才重建」的判据点（见文件内 `shellChanged || sppChanged` 那一行）。
   */
  function isForm() { return state.shape === 'heart'; }

  /* ------------------------------------ ① Anu 整体形态：**爱心双螺旋** */
  /**
   * 按老师订正的几何建模：
   *   一程下行 2.5 圈（内）→ 底尖 → 翻转上行 2.5 圈（贴蛋场边界外）→ 顶，共 5 圈；
   *   T₁ = 每根 whorl 那根 spring 的匝数（1st-order spirillae，文献 1680）。
   *
   * 🔴 2026-10-08 老师：「我明明**阶数 D 调到了 7**，为何爱心目前只有第一阶」——
   *   根因是这里**硬编码** `effDepthUsed = 1`、且 `Heart.build` 只造第 1 阶。
   *   现在 D 如实下传：`Heart.build({ depth })` 会用与预设②**同一台** `tailChain`
   *   逐级细分到第 D 阶（每级 ×7），`effDepthUsed / capInfo` 也如实上报。
   */
  function rebuildHeart(keepView) {
    var n = (state.wires === 3 || state.wires === 7 || state.wires === 10) ? state.wires : 1;
    var spp = Math.max(7, 7 * Math.round((+state.microSpp || 14) / 7));
    var mT1 = Math.max(2, Math.min(1684, state.turns1 || 1680));
    var depthReq = state.depth;
    /* 🔴 Sin 呼吸播放 / GIF 录制期间自动降档：两者都要**逐帧重建**
       （老师第 ⑦ 条「遵循 sin(t) 周期性变化」＋「录一个周期存成 GIF」），
       10 丝 × D=7 的全量重建太贵（几十万点/帧）⇒ 临时限到 D ≤ 3、spp = 7，
       既能把「球形→苹果→球形」的形变看顺，又不会把浏览器卡住。退出即恢复。
       ⚠️ 只有**呼吸**路需要降档 —— 判据是 `gifCap` 而**不是** `gifBusy`：
          2026-10-08 新增「**生长动画**也能导 GIF」后，生长路只改 `drawRange`（不重建）
          ⇒ 若沿用 `gifBusy`，生长 GIF 会被悄悄录成 D ≤ 3，看不到 4~7 阶的递归。 */
    if (state.breathing || gifCap) { depthReq = Math.min(depthReq, 3); spp = 7; }
    /* 按「单丝预算」自适应限阶（与线圈模式同一口径：预计超限在**建模前**就拦住，
       不靠事后降采样硬压 —— 那样最深层会退化成多边形）。 */
    var effDepth = depthReq;
    var per = TOTAL_POINT_BUDGET / Math.max(1, n);
    while (effDepth > 1 && heartWireCost(effDepth, mT1, spp) > per) { effDepth -= 1; }

    var res = Heart.build({
      wires: n,
      depth: effDepth,                       /* 🔴 递归层数 D（1..7）：第 2 阶起每级 ×7 */
      branch: 7,
      microTurns: mT1,
      spp: spp,                              /* 🔴 7 的倍数（每匝 spirilla 采样点数） */
      central: (n > 1),
      tube: (n > 1),
      shellGap: state.shellGap,              /* 🔴 参考壳厚（**内部常量** 0.072，无 UI；两层相切基准） */
      surfaceTangent: state.surfaceTangent,  /* 🔴 弹簧边贴壁方式 */
      wireSpread: state.spread,              /* 🔴 第 ⑥ 条：双丝分离（更远离苹果壁） */
      fieldShape: state.fieldShape,          /* 🔴 第 ⑥ 条：外场球面切片 ↔ 苹果切片 */
      tubeHalfAngle: state.tubeHalfAngle,    /* 🔴 第 ⑦ 条：直锥 ↔ 接近直圆柱 */
      mirror: state.mirror,                 /* 🪞 anu 镜像（φ → −φ）↔ 磁荷极性 */
      /* 🔴🔴 老师报 bug：「无论我选哪个缠绕模式都看不出变化」
         —— 此前**根本没传下来**，`makeWhorl` 里那行 `mode: 'normal'` 就把下拉框架空了。 */
      mode: state.mode
    }, G);
    scene.setBundle(res.bundle);
    scene.setGuides(res.guides);
    model = res.bundle[0].model;
    effDepthUsed = model.depth;
    capInfo = { req: state.depth, eff: model.depth, wires: n, capped: model.depth < state.depth };

    applyDisplayFromUI();

    var R = Heart.boundRadius({});
    fitDist = R / Math.tan(Math.PI / 8) * 1.24;      /* fov 45° → tan(22.5°) = 0.4142 */
    if (!keepView) { scene.resetView(fitDist, 0.9, 1.28); }
    updateHUD(res.bundle);
  }

  /* -------------------------------------------------- ⑦ Sin 呼吸播放 */
  /**
   * 🔴 老师 2026-10-08 第 ⑦ 条：「或让这个参数动态播放遵循 **sin(t) 周期性变化**，
   *   让这个 Anu 的**外场边界从球形到苹果到球形**，可如此循环」。
   *
   * 实现：`fieldShape(t) = 0.55 + 0.45·cos(2πt/T)`
   *   —— 一个**纯余弦**循环：t=0 时 fieldShape=1（**苹果**）、t=T/2 时 =0.1（**球形**）、t=T 回到 1（苹果）。
   *      ⚠️ 2026-10-08 订正①：原式写的是 `(1 − cos)/2`，那样 **t=0 落在球面**，
   *         一勾上「呼吸播放」画面会先从苹果**跳**到球再开始 —— 与「从当前状态出发」的意图相反。
   *         改成 `+cos` 后首帧 = 当前状态（苹果），过程是 苹果 → 球形 → 苹果，**无跳变**。
   *      ⚠️ 2026-10-08 订正②：老师要求「外场边界形态」的下限是 **0.1**（它是锥高公式 h=1/f
   *         的分母，取 0 会让锥顶跑到无穷远）⇒ 行程由 [0, 1] 改为 **[0.1, 1]**：
   *         中值 0.55、振幅 0.45。这样滑块永远不会被顶到下限、呼吸也不会在中途「卡住」。
   *      （用余弦而不是 `sin`：cos 的起止都在**端点**上，循环接缝处速度为零，呼吸感更自然。）
   * 每帧重建模型 —— 规模由 `rebuildHeart` 自动降到 D ≤ 3 / spp = 7，保证不卡。
   */
  var breathRAF = null, breathT0 = 0;
  /* 呼吸行程：中值 0.55、振幅 0.45 ⇒ fieldShape ∈ [0.10, 1.00]
     （下限 0.10 = 老师规定的滑块最小值，也是锥高公式 h = 1/f 的分母下限）。 */
  var BREATH_MID = 0.55, BREATH_AMP = 0.45;
  function setBreathing(on) {
    state.breathing = !!on;
    if (ui && ui.setBreathUI) { ui.setBreathUI(state.breathing); }
    if (state.breathing) {
      stopZoomPlay(); stopPlay();
      breathT0 = 0;
      if (!breathRAF) { breathRAF = requestAnimationFrame(breathStep); }
      toastOnce('呼吸播放中：外场边界 苹果 → 球形 → 苹果 循环（自动降到 D ≤ 3 以保证流畅）');
    } else if (breathRAF) {
      cancelAnimationFrame(breathRAF); breathRAF = null;
      _lastToast = null;
      rebuild(true);
    }
  }
  function breathStep(ts) {
    if (!state.breathing) { breathRAF = null; return; }
    if (!breathT0) { breathT0 = ts; }
    var T = Math.max(2, +(state.breathPeriod || 12)) * 1000;
    var ph = ((ts - breathT0) % T) / T;
    /* 🔴 2026-10-08 老师（本轮）：「中轴锥管半锥角（度）这个也需要参与生长呼吸动画
       ……外场边界形态和中轴锥管半锥角（度）要**同时同步动**」
       ⇒ 不直接写 `state.fieldShape`，改走**唯一联动入口** `applyFieldShape()`：
         它会把 f 同时落到「外场边界形态」与「中轴锥管半锥角」两个状态上，
         并把两根滑块一起挪过去 ⇒ 呼吸时界面上两个滑块同步动
         （苹果态 2.95° / 锥高 ×1 ↔ 球形态 0.295° / 锥高 ×10）。 */
    applyFieldShape(BREATH_MID + BREATH_AMP * Math.cos(2 * Math.PI * ph));
    rebuild(true);
    breathRAF = requestAnimationFrame(breathStep);
  }

  /* ------------------------------------------ ⑦ 「完整呼吸周期」→ GIF 动画 */
  /**
   * 🔴 老师 2026-10-08 第 ⑦ 条（原文）：
   *   「让这个参数动态播放遵循 sin(t) 周期性变化，让这个 Anu 的**外场边界从球形到苹果到球形**，
   *     可如此循环，**或把这完整 Anu 呼吸的周期保存为 ≤5MB 的 GIF 动画**。」
   *
   * 流程：**逐帧重建模型 → 抓 WebGL 画布 → 一张张喂给自写的 GIF89a 编码器**。
   *
   * 踩坑备忘（都写在这里，免得下次重踩）：
   *   ① `renderer.domElement.toDataURL()` / `drawImage()` 必须在 `renderer.render()`
   *      **同一个宏任务内**调用 —— WebGL 的 drawing buffer 在合成之后就被清了，
   *      隔一个 `await` 再去读只会拿到全黑。所以顺序固定为 render → drawImage → getImageData。
   *   ② 录制期间必须 `scene.stop()`：不然后台的 rAF 循环会插在我们的 render 与 drawImage 之间，
   *      抓到的是它那一帧（甚至半帧）。
   *   ③ 每帧之间要**让出主线程**（`nextTick`），否则进度条一次都不刷新，老师会以为卡死。
   *   ④ `rebuild(true)` 内部会走 `applyDisplayFromUI()` → 重新读 `#rngField` 滑块，
   *      所以改完 `state.fieldShape` 必须**先把滑块也同步过去**（`ui.setFieldShape`），
   *      否则下一帧又被 DOM 里的旧值覆盖回来（这也是 `breathStep` 里那行的由来）。
   *   ⑤ 帧数 × 像素数是体积的唯一杠杆。这里把上限锁在 40 帧 / ≤480×340，
   *      再配合「调色板抽帧 + 关抖动」，256 色下通常 1~2 MB；万一超 5 MB 会自动降色 / 减半帧。
   */
  var GIF_W = 480;                       /* 目标宽度（高按画布宽高比推） */
  var GIF_MAX_PIX = 480 * 340;           /* 像素上限（≈16.3 万） */
  /* 🔴 「逐级放大」单独一档画幅：它帧间变化最大（整幅在缩放平移），画幅直接决定体积。
     —— 2026-10-08 实测标定（真 Chrome 无头 + 真编码器，56 帧 / 256 色 / 关抖动）：
          420×300 → 363×347  px = 2.45 MB ← 偏小：1 px 细线被缩放糊掉，导出的 GIF 明显偏暗
          640×480 → 420×402  px = 3.28 MB
          480×440 → **470×450 px = 4.09 MB** ← 取这一档：线性分辨率 ×1.68，仍只用掉 82% 预算
        （画幅再往上就顶穿 5 MB，会触发「降 64 色 → 减半帧」的降级链 —— 那反而更难看。）
     注意两条上限**同时**生效：`GIF_ZOOM_W` 限宽、`GIF_ZOOM_MAX_PIX` 限像素总量，
     `Math.min(wCap/cw, sqrt(pCap/(cw*ch)), 1)` 取更紧的那个。 */
  var GIF_ZOOM_W = 640;
  var GIF_ZOOM_MAX_PIX = 480 * 440;
  var GIF_MAX_BYTES = 5 * 1024 * 1024;   /* 老师给的硬指标：≤5 MB */

  /** 让出主线程一帧（优先 rAF；标签页隐藏时 rAF 不触发，用 40ms 兜底） */
  function nextTick() {
    return new Promise(function (resolve) {
      var done = false;
      function go() { if (!done) { done = true; resolve(); } }
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(function () { setTimeout(go, 0); });
      }
      setTimeout(go, 40);
    });
  }

  /**
   * 在 GIF 的一帧上烧一行「第 k 阶 / 共 D 阶」的小字（**只给「逐级放大」用**）。
   *
   * 为什么必须自己画：屏幕上的字幕是 **DOM 覆盖层**（`#caption`），
   * 而 GIF 抓的是 **WebGL 画布** —— 画布里根本没有那行字。
   * 不烧字的话，走出 GIF 后没人知道现在是第几阶（尤其发给别人看时）。
   *
   * ⚠️ 自检桩的 2D 上下文**没有文字 API** ⇒ 先探测 `fillText`，没有就整段跳过
   *    （Node 里跑 GIF 流水线不能因为缺字而抛错）。
   */
  function drawZoomStamp(ctx, w, h, st, D) {
    if (!ctx || typeof ctx.fillText !== 'function' || !st) { return; }
    var txt;
    if (st.k >= D + 1) { txt = '递归结束 · 共 ' + D + ' 阶'; }
    else if (st.k <= 0) { txt = '全景'; }
    else { txt = '第 ' + st.k + ' 阶 spirilla（共 ' + D + ' 阶）'; }
    var fs = Math.max(11, Math.round(h * 0.046));
    ctx.font = 'bold ' + fs + 'px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.60)';       /* 先描一层暗底 ⇒ 亮背景上也读得清 */
    ctx.fillText(txt, 13, 13);
    ctx.fillStyle = '#9fd0ff';
    ctx.fillText(txt, 12, 12);
  }

  /**
   * 录一段动画 → GIF（**≤ 5 MB**，老师给的硬指标）。
   *
   *   kind = `'breath'`  一个完整**呼吸周期**（外场 球形 → 苹果 → 球形）—— **逐帧重建**
   *   kind = `'growth'`  **生长动画**（丝 / 锥管 / 中央螺旋从 0% 长到 100%）—— 只改 drawRange
   *   kind = `'zoom'`    **逐级放大播放**（全景 → 第 1 阶 → … → 第 D 阶 → 回到全景）—— 只改相机
   *
   * 🔴 2026-10-08 老师：「**生长动画也可以导出为 gif 小于等于 5mb**」
   *              ＋「点击**逐级放大播放**这个出现的**动态变化示意**也要能导出小于 5mb 的 gif 图」
   *   ⇒ 两条都不是新写一套，而是把「每帧怎么推进」抽出来，
   *     三条路共用同一套流水线：尺寸压缩 → 编码 → 超限降级 → 预览 + 下载。
   *
   * ⚠️ 生长路**不重建几何**：`scene.setGrowth(t)` 只改 `drawRange`（O(1)），
   *   几何是**建好一次**的 ⇒ 可以按用户当前的阶数 D（最高 7）**如实录**。
   *   逐级放大路**也不重建**：它只 `scene.setCam()`（相机位姿），几何同样一次建成。
   *   因此这两条路录制期间**不能**把 D 降到 3 —— 那个降档是给「逐帧重建」的呼吸路
   *   保护内存用的（见 `rebuildHeart` 里读的 `gifCap`）。
   */
  function exportGif(kind) {
    if (gifBusy) { return; }
    var isGrow = (kind === 'growth'), isZoom = (kind === 'zoom');
    if (!window.AnuGif) {
      if (ui && ui.gifStatus) { ui.gifStatus('⚠️ 没找到 GIF 编码器（<code>js/anu-gif.js</code> 未加载）。', kind); }
      return;
    }
    if (isZoom && !model) { return; }
    gifBusy = true;
    gifCap = (!isGrow && !isZoom);       /* 只有「呼吸」路逐帧重建，才需要降档保护 */

    /* ---- 参数：帧数 + 延时（三条路的时长口径不同，但都保证「播放总长 = 动画总长」） ---- */
    var N, delayCs, totalSec, what, zS = null;
    if (isGrow) {
      N = 30;                                        /* 生长动画全程 30 帧（≈7 fps） */
      totalSec = PLAY_DUR / 1000;                    /* 与屏幕上的生长动画同速（4.2 s） */
      delayCs = Math.max(4, Math.round(100 * totalSec / N));
      what = '生长动画';
    } else if (isZoom) {
      /* 🔴 2026-10-08 老师：「逐级放大播放这个出现的动态变化示意也要能导出 ≤5 MB 的 gif」
         ⇒ 用的是**同一个** `buildZoomScript()/zoomAt()`（只是时间轴压短，GIF 不必实时），
            所以录下来的每一帧都精确等于现场播放会画的那一帧。 */
      zS = buildZoomScript(ZOOM_GIF);
      totalSec = zS.total;
      N = Math.max(14, Math.min(56, Math.round(totalSec * ZOOM_GIF_FPS)));
      delayCs = Math.max(4, Math.round(100 * totalSec / N));
      what = '逐级放大（第 1 → 第 ' + zS.depth + ' 阶）';
    } else {
      totalSec = Math.max(2, +(state.breathPeriod || 12));
      N = Math.max(12, Math.min(40, Math.round(totalSec * 4)));
      delayCs = Math.max(4, Math.round(100 * totalSec / N));
      what = '一个呼吸周期';
    }

    /* ---- 输出尺寸：按画布宽高比缩放，并压进像素上限 ----
       🔴 「逐级放大」每帧之间**整幅画面都在缩放平移**（帧间差异远大于呼吸/生长）
          ⇒ 给它单独一档更小的画幅，把省下的字节换成帧数（帧多才看得清「一阶一阶飞进去」）。 */
    var wCap = isZoom ? GIF_ZOOM_W : GIF_W;
    var pCap = isZoom ? GIF_ZOOM_MAX_PIX : GIF_MAX_PIX;
    var cw = canvas.clientWidth || 960, ch = canvas.clientHeight || 640;
    var scale = Math.min(wCap / cw, Math.sqrt(pCap / Math.max(1, cw * ch)), 1);
    var gw = Math.max(160, Math.round(cw * scale));
    var gh = Math.max(120, Math.round(ch * scale));

    /* ---- 记录现场（结束时原样还回去） ---- */
    var prevBreathing = state.breathing, prevShape = state.fieldShape,
        prevGrowth = state.growth, prevRotate = state.rotate;
    var zoomStamp = null;                          /* 逐级放大路：当前该烧在帧上的那行字 */

    stopZoomPlay(); stopPlay();
    if (breathRAF) { cancelAnimationFrame(breathRAF); breathRAF = null; }
    state.breathing = false;                       /* 只录、不播 */
    if (ui && ui.setBreathUI) { ui.setBreathUI(false); }
    if (ui && ui.gifStatus) {
      ui.gifStatus('⏺ 正在录' + what + '：' + N + ' 帧（' + gw + '×' + gh +
        '，' + (N * delayCs / 100).toFixed(1) + ' 秒）…', kind);
    }

    var off = document.createElement('canvas');
    off.width = gw; off.height = gh;
    var octx = off.getContext('2d');
    var frames = [];
    var t0 = Date.now();

    return (async function () {
      var renderer = scene.renderer, sc = scene.scene, cam = scene.camera;
      scene.setRotate(false);                      /* 录制期间不自转：只看到「动画本身」 */
      scene.stop();                                /* 独占画布（见坑②） */
      scene.resize();
      await nextTick();

      /* ---------------- 第一段：逐帧推进 + 抓图 ---------------- */
      for (var i = 0; i < N; i++) {
        if (isGrow) {
          /* 0 → 1 线性长出来（首帧空、末帧全满；GIF 循环一遍 = 重新长一次） */
          var g = i / (N - 1);
          state.growth = g;
          scene.setGrowth(g);
          if (ui && ui.setGrowthSlider) { ui.setGrowthSlider(g); }
        } else if (isZoom) {
          /* 🔴 逐级放大：**同一个 `zoomAt()`**、按帧数均匀采样时刻。
             `i/(N-1)` ⇒ 首帧 t=0、末帧 t=totalSec，两端都停在全景 ⇒ 循环无缝。 */
          var zst = zoomAt(totalSec * (i / Math.max(1, N - 1)), zS);
          applyZoomState(zst);
          zoomStamp = zst;
          /** 现场播放的字幕也一起走，录的时候用户能同步看到讲到第几阶 */
          if (ui && ui.caption) { ui.caption(zst.k >= zS.depth + 1 ? zoomTailCaption() : captionFor(zst.k), true); }
        } else {
          var ph = i / N;                            /* [0,1)：末帧紧邻首帧 ⇒ 循环无缝 */
          var fs = 0.5 - 0.5 * Math.cos(2 * Math.PI * ph);   /* 0 = 球形 → 1 = 苹果 → 0 = 球形 */
          state.fieldShape = fs;
          if (ui && ui.setFieldShape) { ui.setFieldShape(fs); }   /* 先同步滑块（坑④） */
          rebuild(true);                             /* 呼吸要**逐帧重建**（几何在变） */
        }
        renderer.render(sc, cam);                    /* 必须先渲染，紧接着同一任务内抓（坑①） */
        octx.clearRect(0, 0, gw, gh);
        octx.drawImage(renderer.domElement, 0, 0, gw, gh);
        if (isZoom) { drawZoomStamp(octx, gw, gh, zoomStamp, zS.depth); }
        frames.push(octx.getImageData(0, 0, gw, gh).data);
        if (ui && ui.gifProgress) { ui.gifProgress(i + 1, N, kind); }
        await nextTick();                            /* 让出主线程让进度条能画（坑③） */
      }

      /* ---------------- 第二段：编码（同步、阻塞） ---------------- */
      if (ui && ui.gifStatus) { ui.gifStatus('🗜 正在压缩 ' + N + ' 帧…（中位切分调色板 + LZW）', kind); }
      await nextTick();

      var palStride = Math.max(1, Math.round(N / 12));   /* 调色板只抽 ~12 帧（够用且快得多） */
      var usedDelay = delayCs;
      var res = window.AnuGif.encode(frames, gw, gh, {
        delayCs: delayCs, loop: 0, maxColors: 256, dither: false, paletteStride: palStride
      });
      var note = '';
      if (res.size > GIF_MAX_BYTES) {                    /* 超限 → 降色再试（关抖动已经压过一轮） */
        res = window.AnuGif.encode(frames, gw, gh, {
          delayCs: delayCs, loop: 0, maxColors: 64, dither: false, paletteStride: palStride
        });
        note = '（已把调色板降到 64 色）';
      }
      if (res.size > GIF_MAX_BYTES) {                    /* 还超 → 逐帧减半（延时同步翻倍，总时长不变） */
        var half = [];
        for (var j = 0; j < frames.length; j += 2) { half.push(frames[j]); }
        usedDelay = delayCs * 2;
        res = window.AnuGif.encode(half, gw, gh, {
          delayCs: usedDelay, loop: 0, maxColors: 64, dither: false,
          paletteStride: Math.max(1, Math.round(half.length / 10))
        });
        note = '（已减半帧数 + 降到 64 色）';
      }
      var secs = (Date.now() - t0) / 1000;
      var mb = res.size / 1048576;
      var ok = res.size <= GIF_MAX_BYTES;

      /* ---------------- 第三段：出结果（预览 + 下载） ---------------- */
      var blob = new Blob([res.bytes], { type: 'image/gif' });
      var url = URL.createObjectURL(blob);
      var fname = isGrow ? 'anu_growth.gif' : (isZoom ? 'anu_zoom_levels.gif' : 'anu_breath.gif');
      if (ui && ui.gifStatus) {
        ui.gifStatus(
          '<div class="gif-meta">' + (ok ? '✅' : '⚠️ 仍超出 5 MB：') +
          '<b>' + mb.toFixed(2) + ' MB</b>（上限 5.00 MB）· ' + what + ' · ' +
          res.frames + ' 帧 · ' + gw + '×' + gh + ' · ' + res.colors + ' 色 · ' +
          (res.frames * usedDelay / 100).toFixed(1) + ' 秒' + note +
          '<br><span class="gif-dim">录制 + 编码共 ' + secs.toFixed(1) + ' 秒</span></div>' +
          '<img src="' + url + '" alt="Anu ' + what + ' GIF">' +
          '<a class="btn" download="' + fname +
          '" href="' + url + '">⬇ 下载 GIF（' + mb.toFixed(2) + ' MB）</a>',
          kind
        );
      }

      /* ---------------- 收尾：恢复现场 ----------------
         ⚠️ 必须**先**把 gifBusy / gifCap 清掉再 rebuild ！！
         否则这次「还原用」的 rebuild 仍被 gifCap 卡在 D ≤ 3
         ⇒ 录完之后画面悄悄退回低阶（用户看到的是「录一次 GIF，阶数就掉了」）。
         （旧代码就是 rebuild 之后才清 gifBusy —— 已修。） */
      gifBusy = false; gifCap = false;
      if (isGrow) {
        state.growth = prevGrowth;
        scene.setGrowth(prevGrowth);
        if (ui && ui.setGrowthSlider) { ui.setGrowthSlider(prevGrowth); }
      } else if (isZoom) {
        /* 逐级放大只改相机 ⇒ 把视角还回「全景」（本来就是它的起点/终点，无跳变） */
        scene.resetView(fitDist, 0.9, 1.02);
        if (ui && ui.clearCaption) { ui.clearCaption(); }
      } else {
        state.fieldShape = prevShape;
        if (ui && ui.setFieldShape) { ui.setFieldShape(prevShape); }
      }
      if (ui && ui.setBreathUI) { ui.setBreathUI(prevBreathing); }
      state.breathing = prevBreathing;
      scene.setRotate(prevRotate);
      rebuild(true);
      scene.start();
      if (prevBreathing) { setBreathing(true); }     /* 原来在播就接着播 */
    })().catch(function (err) {
      /* 出错也必须把现场还回去，否则页面会停在「不自转 + 锁在某一帧」的坏状态 */
      gifBusy = false; gifCap = false;
      state.breathing = prevBreathing;
      state.fieldShape = prevShape;
      state.growth = prevGrowth;
      if (isZoom) { scene.resetView(fitDist, 0.9, 1.02); }
      if (ui && ui.setFieldShape) { ui.setFieldShape(prevShape); }
      if (ui && ui.setGrowthSlider) { ui.setGrowthSlider(prevGrowth); }
      if (ui && ui.setBreathUI) { ui.setBreathUI(prevBreathing); }
      scene.setRotate(prevRotate);
      rebuild(true);
      scene.start();
      if (ui && ui.gifStatus) {
        ui.gifStatus('❌ 录 GIF 失败：' + (err && err.message ? err.message : err), kind);
      }
    });
  }

  /**
   * 单根爱心 whorl 的点数预估（与 `Heart.build` → `AnuGeo.tailChain` 的计数同构）。
   * 第 1 阶 = 1680 × spp（每匝 spp 点）；第 k 阶 = 在上一级的**一匝**上再绕 7 匝
   * （父曲线 = 上一级末尾 1/7 段 ⇒ 段数 ≈ n_{k−1}/7，子段采样 ≈ ceil(7·spp / 段数)）。
   * 只用于「建模前限阶」，不参与几何。
   */
  function heartWireCost(depth, microTurns, spp) {
    var s7 = Math.max(7, 7 * Math.round(spp / 7));
    var n1 = Math.max(240, microTurns * s7) + 1;     /* 第 1 阶曲线点数 */
    var total = n1, cur = Math.max(4, Math.round(n1 / Math.max(1, microTurns)));
    for (var k = 2; k <= depth; k++) {
      var segs = Math.max(2, cur - 1);
      var subN = Math.max(2, Math.ceil(Math.max(s7 * 7, segs * 2, 36) / segs));
      var outN = segs * subN;
      total += outN;
      cur = Math.max(4, Math.round(outN / 7));       /* 末尾一匝的点数 → 下一级的父曲线 */
    }
    return total;
  }

  /* ------------------------------------------------ （旧版蛋形 `rebuildOvoid` 已删除）
   * 🔴 2026-10-08 老师第 ③ 条：「旧版蛋形演示图在网页里移除，是多余的。」
   *   原实现位于此处的 `rebuildOvoid()`：蛋形轮廓 + whorl 沿蛋形盘绕（每根按 13 圈示意）。
   *   形态本身是错的（Anu 的上端是爱心、下端是苹果，不是蛋），保留它只会误导，
   *   故连模块 `js/anu-ovoid.js` 一起下线（文件已移入 `_backup/`，不随页面加载）。
   *   —— 现在「整体形态」只有预设①「爱心双螺旋」，见上面的 `rebuildHeart()`。 */

  function rebuildCoil(keepView) {
    var modes = modesArray();
    var turns = turnsArray();

    /* ---- A. 七级阶梯：1680 匝 → 逐级 ×7，一路到第 7 级（只能单丝） ---- */
    if (state.baseKind === 'ladder') {
      var ml = G.ladder({
        orders: Math.max(1, Math.min(7, state.depth)),
        branch: 7,                                  /* 第 2~7 阶：每级 7 匝，固定 */
        firstTurns: state.turns1,                   /* 第 1 阶：1st-order spirilla（1680） */
        fill: state.fill,
        spp: 24,
        modes: modes
      });
      var bl = [{ model: ml, color: '#ffd88a', kind: 'single', name: '1st–7th order 阶梯' }];
      model = ml; effDepthUsed = ml.depth;
      capInfo = { req: state.depth, eff: ml.depth, wires: 1, capped: false };
      scene.setBundle(bl);
      scene.setGuides([]);
      applyDisplayFromUI();
      var Rl = modelRadius(bl);
      fitDist = Rl / Math.tan(Math.PI / 8) * 1.24;
      if (!keepView) { scene.resetView(fitDist, 0.9, 1.02); }
      updateHUD(bl);
      return;
    }

    /* ---- B. 单条螺旋的递归细分（基准 = 展开后的圆）----
       ⚠️ 旧版还有一个 'whorlSeg' 基准（从蛋形 whorl 上截 0.300~0.345 一段当母曲线），
          它只为蛋形预设服务 ⇒ 随蛋形一并下线（UI 上也从未暴露过这个选项）。 */
    var specs = wireSpecs();
    var effDepth = effDepthFor(state.depth, specs.length, turns);
    var perWire = Math.max(24000, Math.floor(TOTAL_POINT_BUDGET / specs.length));
    var bundle = [], deepest = null;

    specs.forEach(function (s) {
      var m = G.build({
        depth: effDepth,
        turns: turns,
        modes: modes,
        fill: state.fill,
        spp: SPP,
        baseR: s.baseR,
        basePhase: s.basePhase,
        reverse: s.reverse,
        maxPoints: perWire
      });
      if (!deepest || s.key === specs[0].key) { deepest = m; }
      bundle.push({ model: m, color: s.color, kind: s.kind, name: s.name });
    });
    model = deepest;
    effDepthUsed = effDepth;
    capInfo = { req: state.depth, eff: effDepth, wires: specs.length, capped: effDepth < state.depth };

    scene.setBundle(bundle);
    scene.setGuides([]);
    applyDisplayFromUI();

    var R = modelRadius(bundle);
    fitDist = R / Math.tan(Math.PI / 8) * 1.24;      /* fov 45° → tan(22.5°)=0.4142 */
    if (!keepView) { scene.resetView(fitDist, 0.9, 1.02); }
    updateHUD(bundle);
  }

  /** 包围球半径：取**所有阶**里的最大（阶梯最深一阶极小，不能只看它） */
  function modelRadius(bundle) {
    var R = 0.001;
    bundle.forEach(function (b) {
      var D = b.model.depth;
      for (var k = 1; k <= D; k++) {
        var pts = b.model.levels[k].pts;
        var n = Math.floor(pts.length / 3);
        var step = Math.max(1, Math.floor(n / 3000)) * 3;
        for (var i = 0; i < pts.length; i += step) {
          var r = Math.sqrt(pts[i] * pts[i] + pts[i + 1] * pts[i + 1] + pts[i + 2] * pts[i + 2]);
          if (r > R) { R = r; }
        }
      }
    });
    return R;
  }

  function applyDisplayFromUI() {
    var d = readDisplayFromDOM();
    /* 着色四种模式**互斥**，优先级：
       双色图（3 粗 hot / 7 细 rainbow）＞ 按丝 ＞ 按阶 ＞ 光谱沿曲线铺满 */
    state.colorMode = d.cmap ? 'cmap' : (d.wireColor ? 'wire' : (d.levelColor ? 'level' : 'spectrum'));
    state.bubbleSize = d.bubbleSize;
    state.lineBright = d.lineBright;
    /* 🔴 「弹簧边贴壁方式」改的是**几何**（丝在内外壁上的落点），必须重建。
       ⚠️ 原「苹果壳厚」滑块已删除（与「双丝分离」重复）⇒ 这里不再比较 shellGap。 */
    var shellChanged = (state.surfaceTangent !== d.surfaceTangent);
    state.surfaceTangent = d.surfaceTangent;
    /* 🔴 老师第 ⑥ 条：双丝分离（只动丝、不动壁）
       🔴 老师第 ⑥⑦ 条：外场形态（球面↔苹果）与锥半角（直锥↔直柱）—— 三者都改**几何**（子午线 /
         上下孔 / 锥壁 / 丝落点），全部走「重建」通道。

       🔴🔴 2026-10-08 老师（本轮）：「外场边界形态和中轴锥管半锥角（度）要**同时同步动**」
       ⇒ 这两根滑块之间有一条**单向联动**（f → 角），规则唯一实现在 `applyFieldShape()`。
         顺序很重要 —— 必须**先判 f、再判角**：
           拖 f 时，DOM 里那根「锥半角」滑块还是**旧值**（我们还没把它挪过去），
           若先按 `d.tubeHalfAngle` 赋值，就会把刚联动算出的新角度覆盖掉 ⇒ 联动失效。
       两条路：
         · 拖「外场边界形态」   ⇒ θ = 参考角 × f（`applyFieldShape` 顺手把半角滑块挪过去）；
         · 拖「中轴锥管半锥角」 ⇒ 只改锥角，并按当前 f **反解**出新的参考角，
                                   这样「临时把锥调细/调粗」在后续 f 变化时仍然生效。 */
    var fieldChanged = (Math.abs(state.fieldShape - d.fieldShape) > 1e-9);
    var angChanged = (Math.abs(state.tubeHalfAngle - d.tubeHalfAngle) > 1e-9);
    var before = { f: state.fieldShape, a: state.tubeHalfAngle };
    if (fieldChanged) {
      applyFieldShape(d.fieldShape);
    } else if (angChanged) {
      state.tubeHalfAngle = d.tubeHalfAngle;
      var fNow = Math.max(Heart.FIELD_F_MIN, +d.fieldShape || 1);
      state.angleRef = Math.min(Heart.TUBE_ANGLE_REF,
                                Math.max(Heart.TUBE_ANGLE_MIN, d.tubeHalfAngle / fNow));
    }
    var shapeChanged = (Math.abs(state.spread - d.spread) > 1e-9) ||
                       (Math.abs(state.fieldShape - before.f) > 1e-9) ||
                       (Math.abs(state.tubeHalfAngle - before.a) > 1e-9);
    state.spread = d.spread;
    /* 🔴 「每匝 spring 采样点数」也改**几何**（整条 spring 的点重算），必须重建 */
    var sppChanged = (state.microSpp !== d.microSpp);
    state.microSpp = d.microSpp;
    /* 🔴 koilon 珍珠密度改的是**最细一级的散点几何** ⇒ 也要重建（最细一级 = 第 7 阶 / 第 1 阶） */
    var pearlsChanged = ((state.pearlsPerTurn || 1) !== d.pearls);
    state.pearlsPerTurn = d.pearls;
    if (pearlsChanged && scene.setPearlsPerTurn) { scene.setPearlsPerTurn(d.pearls); }
    scene.setColorMode(state.colorMode);
    scene.setShowShell(d.shell);
    scene.setShowBase(d.base);
    scene.setShowBubbles(d.bubbles);
    scene.setShowPlanes(d.planes);
    /* 🔴 2026-10-08 老师：「显示 选项卡 里面要有 3d xyz axis 打勾选项」——
       纯渲染可见性，**不重建几何**（命中下面那条「不重建」分支）。 */
    if (state.showAxes !== d.axes) {
      state.showAxes = d.axes;
      if (scene.setShowAxes) { scene.setShowAxes(d.axes); }
    }
    scene.setBubbleSize(d.bubbleSize);
    scene.setLineBright(state.lineBright);
    /* 🔴 第 ⑨ 条：原点下移量（屏高比例）—— 纯取景参数，只调相机，**不重建几何** */
    if (state.viewDrop !== d.viewDrop) {
      state.viewDrop = d.viewDrop;
      if (scene.setViewDrop) { scene.setViewDrop(d.viewDrop); }
    }
    /* 🔴 B-spline 细分只改**渲染用的线**（不动泡泡、不重建模型），走轻量通道。
       `setSplineSub` 内部只重建 lineGeo，所以拖动滑块是实时且不掉帧的。 */
    if (state.splineSub !== d.splineSub) {
      state.splineSub = d.splineSub;
      if (scene.setSplineSub) { scene.setSplineSub(d.splineSub); }
    }
    /* 几何类改动必须重建（其余显示开关只改材质）。
       ⚠️ 珍珠密度对**所有**基准（七级阶梯 / 爱心 / 蛋形）都要重建，不只是「形体」预设。 */
    if (pearlsChanged) { rebuild(true); }
    else if ((shellChanged || sppChanged || shapeChanged) && isForm()) { rebuild(true); }
  }

  function readDisplayFromDOM() {
    var wc = document.getElementById('chkWireColor');
    var lc = document.getElementById('chkLevelColor');
    var cm = document.getElementById('chkCmap');
    var ms = document.getElementById('rngMicroSpp');
    var ss = document.getElementById('rngSplineSub');
    var pr = document.getElementById('rngPearls');
    var lb = document.getElementById('rngLineBright');
    var st = document.getElementById('selSurface');
    var vd = document.getElementById('rngViewDrop');
    var spr = document.getElementById('rngSpread');
    var fld = document.getElementById('rngField');
    var tga = document.getElementById('rngTubeAngle');
    var ax = document.getElementById('chkAxes');
    return {
      shell: document.getElementById('chkShell').checked,
      base: document.getElementById('chkBase').checked,
      bubbles: document.getElementById('chkBubbles').checked,
      planes: document.getElementById('chkPlanes').checked,
      /* 🔴 3D XYZ 坐标轴（只改可见性，不重建几何） */
      axes: ax ? ax.checked : state.showAxes,
      cmap: cm ? cm.checked : false,
      wireColor: wc ? wc.checked : false,
      levelColor: lc ? lc.checked : false,
      /* 弹簧采样（点/匝）：真实数值由 `anu-heart.js` 再向 7 的倍数量化一次 */
      microSpp: ms ? parseInt(ms.value, 10) : state.microSpp,
      /* B-spline 细分倍数：1 = 关闭（裸折线） */
      splineSub: ss ? parseInt(ss.value, 10) : state.splineSub,
      /* koilon 珍珠：**最细一级每匝**几颗（阶梯第 7 阶 ×1 = 7 颗） */
      pearls: pr ? parseInt(pr.value, 10) : state.pearlsPerTurn,
      bubbleSize: parseInt(document.getElementById('rngBubble').value, 10) / 10,
      lineBright: lb ? (parseInt(lb.value, 10) / 100) : state.lineBright,
      surfaceTangent: st ? st.value : state.surfaceTangent,
      /* 🔴 第 ⑥ 条「双丝分离」：壁不动、只把两族丝相对拉开（也改几何，触发重建） */
      spread: spr ? (parseInt(spr.value, 10) / 1000) : state.spread,
      /* 🔴 第 ⑥⑦ 条「外场形态 / 锥半角」：直接改子午线与上下孔 ⇒ 必须重建 */
      fieldShape: fld ? (parseInt(fld.value, 10) / 100) : state.fieldShape,
      /* ⚠️ 滑块单位是 **0.001°**（见 `anu-ui.js: TUBE_SLIDER`）——
         这里原先是 /100，读回来的角度会是真实值的 10 倍（锥高倍率显示 ×0.20）。 */
      tubeHalfAngle: tga ? (parseInt(tga.value, 10) / 1000) : state.tubeHalfAngle,
      /* 🔴 第 ⑨ 条：原点下移（屏高比例，0.25 = 中心下方 1/4 屏高）。
         只改相机取景，**不改几何** ⇒ 命中下面「不重建」那条分支。 */
      viewDrop: vd ? (parseInt(vd.value, 10) / 100) : state.viewDrop
    };
  }

  /* ------------------------------------------------------------------ HUD */
  function updateHUD(bundle) {
    /* 🪞 磁荷极性标签（舞台左上角）—— 老师：「在网页图片左上角栏标签里面 label 出来」。
       **单一数据源** = `anu-heart.js: polarityOf()`：优先读**已构建模型**自带的 `mirror`
       （`makeWhorl` 里写进去的，最贴近画面真实状态），模型还没建时才退回 `state.mirror`。
       这里**不自己写** `mirror ? 'positive' : 'negative'` —— 两条路各算一份迟早会对不上。 */
    if (ui && ui.setPolarity) {
      var pol = Heart.polarityOf({ mirror: (model && typeof model.mirror === 'boolean') ? model.mirror : state.mirror });
      ui.setPolarity(pol, (pol === 'negative') ? '顺时针下旋' : '逆时针下旋');
    }
    /* 🔴 2026-10-08 老师：锥半角已被「外场边界形态 f」联动（θ_当前 = 参考角 · f, 锥高 = tan比）
       ⇒ 把那三个读数（参考 / 当前生效 / 锥高倍率）如实推到界面上；
       公式的**唯一实现**在 `anu-heart.js: angleForShape() / coneState()`，这里只负责显示。
       呼吸动画每帧走一次这里 ⇒ 老师能看到「中轴锥管半锥角」的读数随外场形态实时变。 */
    if (ui && ui.setTubeEff) {
      var cs = Heart.coneState({ tubeHalfAngle: state.tubeHalfAngle,
                                 fieldShape: state.fieldShape,
                                 angleRef: state.angleRef });
      ui.setTubeEff(cs.effHalfAngle, cs.heightMul, cs.refHalfAngle);
    }
    if (!model) { return; }
    var D = model.depth;
    var last = model.levels[D];
    var angs = G.planeAngleMean(model);
    var angleText = angs.length
      ? ('≈ ' + (angs.reduce(function (a, b) { return a + b; }, 0) / angs.length).toFixed(1) + '°')
      : '—';
    if (state.mode === 'alternate' && angs.length) {
      var ok90 = angs.every(function (a) { return Math.abs(a - 90) < 7; });
      angleText += ok90 ? ' ✓' : '';
    }
    /* 逐级半径比：实测 vs 几何自洽值 √(1+(π·fill)²)/T（「自然涌现」的那个数） */
    var ratioText = '—';
    if (state.shape === 'coil' && D >= 2 && model.levels[D - 1].radius > 0) {
      var measured = model.levels[D].radius / model.levels[D - 1].radius;
      var natural = Math.sqrt(1 + Math.pow(Math.PI * state.fill, 2)) / last.turns;
      var fit = Math.abs(measured - natural) / Math.max(1e-9, natural) < 0.03;
      ratioText = measured.toFixed(4) + '（自然 ' + natural.toFixed(4) + (fit ? ' ✓' : '') + '）';
    }
    ui.updateHUD({
      modeLabel: modeLabel(),
      depth: D,
      /* ① 爱心：D **真的生效** ⇒ reqDepth 如实显示（含被预算限阶的情形）；
         其余（递归细分）按设定深度显示。旧蛋形「D 不适用」的特例已随预设①b 删除。 */
      reqDepth: (state.shape === 'heart') ? effDepthUsed : state.depth,
      depthCapped: (state.shape === 'heart') ? (effDepthUsed < state.depth) : (D < state.depth),
      turn: last.turns,
      accum: last.accumTurns,
      radius: last.radius,
      ratioText: ratioText,
      spirillaeText: spirillaeText(bundle),
      points: bundle
        ? bundle.reduce(function (s, b) {
            return s + (b.model.totalAllPoints || b.model.totalPoints);
          }, 0)
        : (model.totalAllPoints || model.totalPoints),
      wires: bundle ? bundle.length : state.wires,
      autoReduced: model.autoReduced,
      angleText: angleText
    });
    lodUpdate();          /* 🔴 重建后重算「这一屏最多看得见几级」（D 或 fill 变了都要重算） */
  }

  /**
   * 🔴 2026-10-17 老师：「给 Anu 页加一个小控件，按分辨率即时算出『最多看得见几级』」
   * ---------------------------------------------------------------------------
   * 判据（可复算，不是感觉）：
   *   第 k 阶 spiral 的中心线半径 r_k（世界单位）⇒ 直径 2·r_k
   *   屏幕像素/世界单位 = ppu（`scene.getPixelsPerUnit()`，随 cam.dist 变）
   *   ⇒ 屏上直径 d_k = 2·r_k·ppu  [CSS px]
   *   d_k < 判据宽度 ⇒ **这一阶在屏上退化成一个点/一根直线**，看不出是螺旋。
   *
   * 为什么「放大 2.12 倍多看清一级」：Anu 的逐级半径比（匝刚好相接、fill=1、T=7）是
   *   ρ = √(1+(π·fill)²)/T = √(1+π²)/7 = 0.4709869 ⇒ 1/ρ = 2.1232。
   *   这里**不写死 2.12**，而是从 `model.levels` 的**实测半径**算真实比值，
   *   所以 fill 一改、或某阶被预算限阶，读数会跟着变。
   */
  function lodPx() {
    var el = document.getElementById('rngLodPx');
    var v = el ? parseInt(el.value, 10) : 3;
    return Math.max(1, Math.min(12, isFinite(v) ? v : 3));
  }

  var lodCache = '';
  function lodUpdate() {
    var elPpu = document.getElementById('lodPpu');
    if (!elPpu || !scene.getPixelsPerUnit) { return; }
    var pxMin = lodPx();
    var ppu = scene.getPixelsPerUnit();
    var radii = scene.getLevelRadii ? scene.getLevelRadii() : [];
    if (!(ppu > 0) || radii.length < 2) { return; }

    var D = model ? model.depth : radii.length - 1;
    var k, d = [];                       /* d[k] = 第 k 阶的屏上直径（CSS px） */
    for (k = 1; k < radii.length; k++) { d[k] = 2 * radii[k].radius * ppu; }

    /* 最多看得见第几级：从第 1 阶往上数，连续满足判据的最大阶号 */
    var maxK = 0;
    for (k = 1; k < d.length; k++) {
      if (d[k] >= pxMin) { maxK = k; } else { break; }   /* 半径单调递减 ⇒ 一旦不够就断 */
    }
    var nextK = maxK + 1;
    var zoomNext = (nextK < d.length && d[nextK] > 0) ? (pxMin / d[nextK]) : null;

    /* 逐级直径链（只列到当前实际深度 D） */
    var chain = [];
    for (k = 1; k <= Math.min(D, d.length - 1); k++) {
      chain.push('第' + k + '阶 ' + (d[k] >= 10 ? d[k].toFixed(1) : d[k].toFixed(2)) + ' px');
    }
    /* 实测逐级半径比（相邻两级），用于核对 1/ρ ≈ 2.12 那句话 */
    var ratioTxt = '—', ratioNum = null;
    if (d.length > 2 && d[2] > 0) {
      ratioNum = d[1] / d[2];
      ratioTxt = ratioNum.toFixed(4) + '（⇒ 每放大 ' + ratioNum.toFixed(2) + ' 倍多看清一级）';
    }

    /* 只在真的变了才写 DOM（250 ms 轮询，不能让浏览器白白排版） */
    var sig = [pxMin, ppu.toFixed(3), maxK, nextK, D, zoomNext].join('|');
    if (sig === lodCache) { return; }
    lodCache = sig;

    function set(id, txt) { var e = document.getElementById(id); if (e) { e.textContent = txt; } }
    set('vLodPx', pxMin.toFixed(1) + ' px');
    set('lodPpu', ppu.toFixed(2) + ' px / 单位');
    set('lodD1', d[1] >= 10 ? d[1].toFixed(1) + ' px' : d[1].toFixed(2) + ' px');
    set('lodN', String(Math.min(D, d.length - 1)));
    var dN = d[Math.min(D, d.length - 1)];
    set('lodDN', dN >= 10 ? dN.toFixed(1) + ' px' : dN.toFixed(2) + ' px');
    set('lodMax', maxK ? ('第 ' + maxK + ' 阶' + (maxK >= D ? '（已到当前 D 阶）' : ''))
                       : '连第 1 阶都看不见');
    set('lodZoom', zoomNext ? (zoomNext.toFixed(2) + ' 倍（到第 ' + nextK + ' 阶）') : '已是最后一级');
    set('lodChain', '逐级直径（CSS px，判据 ' + pxMin + ' px）：' + chain.join(' · ')
      + '　←　实测逐级比 ' + ratioTxt);
    if (ratioNum) { set('lodRatioTip', ratioNum.toFixed(2)); }

    var note;
    if (maxK >= D) {
      note = '当前 <b>D = ' + D + '</b> 阶全部看得见 —— 把 D 调大，或把滚轮往外拉，都会让这个数变小。';
    } else {
      note = '当前请求 <b>D = ' + (state.depth) + '</b> 阶，但这一屏只分得清前 <b>' + maxK + '</b> 阶；'
        + '第 ' + (maxK + 1) + '–' + D + ' 阶<b>几何上在</b>、<b>屏上看不出是螺旋</b>。'
        + '这不是 bug：整身视图里它们的直径只有零点几到几像素 ⇒ 想看清只能点<b>▶ 逐级放大播放</b>。';
    }
    var eNote = document.getElementById('lodNote');
    if (eNote) { eNote.innerHTML = note; }
  }

  /** HUD 新行「丝内 spirillae」：每根 whorl 自己那根弹簧的匝数。
   *  · 爱心模式：T₁ 匝/丝（3 粗 + 7 细共 10 根）；D ≥ 2 时再 ×7^(D−1) → 也给出十丝合计
   *  · 阶梯模式：末阶累计（= 1680 · 7⁶）
   */
  function spirillaeText(bundle) {
    if (state.shape === 'heart') {
      var n = (state.wires === 3 || state.wires === 7 || state.wires === 10) ? state.wires : 1;
      var t1 = Math.max(2, Math.min(1684, state.turns1 || 1680));
      var D = Math.max(1, model ? model.depth : 1);
      var perWire = t1 * Math.pow(7, D - 1);
      var unit = (D > 1) ? (t1 + '×7' + sup(D - 1)) : String(t1);
      return unit + ' 匝/丝 × ' + n + ' = ' + fmtInt(perWire * n);
    }
    if (state.baseKind === 'ladder') { return '1680 × 7⁶ = ' + fmtInt(1680 * Math.pow(7, 6)); }
    return '—';
  }

  /** 阿拉伯数字 → 上标（用于 7⁶ 这类文案） */
  var SUP = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
  function sup(k) {
    if (k <= 0) { return ''; }
    var s = '', t = Math.round(k);
    while (t > 0) { s = SUP[t % 10] + s; t = Math.floor(t / 10); }
    return s;
  }

  function fmtInt(v) {
    return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function modeLabel() {
    if (state.shape === 'heart') {
      var hb = { 1: '爱心 · 单根 whorl', 3: '爱心 · 3 粗丝', 7: '爱心 · 7 细丝', 10: '爱心双螺旋 · 10 丝' }[state.wires] || '爱心双螺旋';
      /* 🔴 2026-10-08 老师报 bug：爱心模式下 HUD 标题**从来不显示缠绕模式**
         ⇒ 选了也看不到任何反馈。这里补上，并附**逐级模式链**（环 = 全环向 / 轴 = 全轴向）。 */
      var hChain = [];
      if (model && model.levels) {
        for (var hk = 1; hk < model.levels.length; hk++) {
          hChain.push((model.levels[hk] && model.levels[hk].windMode === 'axial') ? '轴' : '环');
        }
      }
      return hb + ' · ' + (WIND_NAME[state.mode] || '') +
             (hChain.length > 1 ? '（逐级 ' + hChain.join('·') + '）' : '');
    }
    if (state.baseKind === 'ladder') {
      var bm = { alternate: '交替正交', normal: '全环向', axial: '全轴向' }[state.mode] || '';
      return '①–⑦ 阶梯 · 单丝 · ' + bm;
    }
    var base = { 1: '单丝递归', 3: '3 粗丝（反向）', 7: '7 细丝', 10: '10 丝（3 粗 + 7 细）' }[state.wires] || '';
    var mm = { alternate: '交替正交', normal: '全环向', axial: '全轴向' }[state.mode] || '';
    return base + ' · ' + mm;
  }

  /* -------------------------------------------------------------- 生长动画 */
  var playing = false, playStart = 0, PLAY_DUR = 4200;
  function playLoop(ts) {
    if (!playing) { return; }
    if (!playStart) { playStart = ts; }
    var t = Math.min(1, (ts - playStart) / PLAY_DUR);
    state.growth = t;
    scene.setGrowth(t);
    ui.setGrowthSlider(t);
    if (t >= 1) { playing = false; ui.setPlayState(false); playStart = 0; return; }
    requestAnimationFrame(playLoop);
  }
  function togglePlay() {
    if (playing) { playing = false; playStart = 0; ui.setPlayState(false); return; }
    playing = true; playStart = 0; state.growth = 0;
    ui.setPlayState(true);
    requestAnimationFrame(playLoop);
  }

  /* ---------------------------------------------------------- 逐级放大播放 */
  var zoomTimer = null, zooming = false;
  var zoomRAF = null, zoomT0 = 0, zoomScriptC = null, zoomLastK = -1;

  /** 取一个与 n 垂直的单位向量（数值稳定：挑最不对齐的坐标轴做叉积） */
  function perpTo(n) {
    var ax = Math.abs(n[0]), ay = Math.abs(n[1]), az = Math.abs(n[2]);
    var e = (ax <= ay && ax <= az) ? [1, 0, 0] : (ay <= az ? [0, 1, 0] : [0, 0, 1]);
    var c = [n[1] * e[2] - n[2] * e[1], n[2] * e[0] - n[0] * e[2], n[0] * e[1] - n[1] * e[0]];
    var l = Math.sqrt(c[0] * c[0] + c[1] * c[1] + c[2] * c[2]) || 1;
    return [c[0] / l, c[1] / l, c[2] / l];
  }

  /**
   * 求出「最能看清本阶弹簧」的相机方位 (theta, phi)。
   * 本阶线圈的轴 = lv.planeNormal（normal 模式 → T，axial 模式 → B）。
   * 视向若与轴垂直，螺旋会投影成正弦波（看着像波浪）；若与轴平行，看着像圆环。
   * 取「离轴约 53°」的 3/4 视角 —— 此时匝与匝在屏幕上分开，弹簧感最强。
   */
  function zoomView(lv) {
    var n = lv.planeNormal || [0, 0, 1];
    var l = Math.sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2]) || 1;
    n = [n[0] / l, n[1] / l, n[2] / l];
    var w = perpTo(n);
    var v = [0.80 * w[0] + 0.60 * n[0], 0.80 * w[1] + 0.60 * n[1], 0.80 * w[2] + 0.60 * n[2]];
    var vl = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1;
    v = [v[0] / vl, v[1] / vl, v[2] / vl];
    return { theta: Math.atan2(v[0], v[2]), phi: Math.acos(Math.max(-1, Math.min(1, v[1]))) };
  }

  function captionFor(k) {
    var lv = model.levels[k];
    var D = model.depth;
    var head = '<b>第 ' + k + ' 阶 spirilla</b>（共 ' + D + ' 阶）';
    var body = '本阶 <em>' + lv.turns + '</em> 匝，累计 <em>' + fmtInt(lv.accumTurns) + '</em> 匝；' +
      '线圈半径 <em>' + lv.radius.toFixed(5) + '</em>（相对基准 1.0）。';
    var extra = '';
    if (k === 1) {
      extra = '第 1 阶就是那根 1680 匝的 “tightly twisted endless coil” —— ' +
        '（预设②的第 1 级就是它）一根丝展开后是<b>一个完整的圆</b>，而这个圆本身是一根弹簧。' +
        '<b>它不是 koilon</b>：还得再往下细分 6 级才到底。';
    } else if (k === D) {
      extra = '已到<b>最低阶 spirilla</b>：本阶 7 匝 ⇒ 由 <b>7 个 koilon 气泡</b>串成 —— ' +
        '如“串在看不见的线上的珍珠”。（1st-order 的 1680 匝远不是 koilon，' +
        '所以<b>只有这一阶</b>画散点，其余各阶只画发亮的 spirilla 曲线。）';
    } else {
      var angs = G.planeAngleMean(model);
      var a = angs[k - 2];
      extra = '缠绕平面已换到与上一阶<b>垂直</b>的那一族' +
        (a != null ? '（实测夹角 ≈ ' + a.toFixed(1) + '°）' : '') + '。';
    }
    return head + '：' + body + '<br>' + extra;
  }

  /* ------------------------------------------------- 逐级放大：剧本 + 时间函数 */
  /**
   * 🔴 2026-10-08 老师：「点击 **逐级放大播放** 这个出现的**动态变化示意**
   *    也要能导出小于 5mb 的 gif 图」
   *
   * 设计要点：**一份剧本 + 一个纯时间函数**，两个消费者共用 ——
   *   · 现场播放：`requestAnimationFrame` 按**真实时间**推进 `zoomAt(t)`
   *   · GIF 录制：按帧数**均匀采样**同一个 `zoomAt(t)`，逐帧 `scene.setCam()` 后抓图
   * ⇒ 「屏幕上看到的」与「GIF 里录下的」是**同一条相机曲线**，
   *    不会出现两套算法各推一遍导致的对不上（这正是 §8.17 要防的事）。
   *
   * 剧本 = 一串**相机关键帧**：
   *   [全景] →飞→ [第 1 阶] →飞→ [第 2 阶] → … →飞→ [第 D 阶] →飞→ [回到全景]
   * 「飞」用与 `anu-scene.js: frame()` 里 `camTween` **逐字相同**的 smoothstep 缓动；
   * 每阶到位后**停 hold 秒**（看该阶螺旋 + 读字幕）。
   * 末帧 == 首帧（都停在全景）⇒ GIF 循环无缝。
   */
  var ZOOM_LIVE = { fly: 1.10, hold: 1.20, tail: 4.80 };  /* 现场：与旧实现同速（每阶 2.3 s） */
  var ZOOM_GIF = { fly: 0.62, hold: 0.30, tail: 1.30 };   /* 录制：压成短时间轴（GIF 不必实时） */
  var ZOOM_GIF_FPS = 7;                                   /* 录制目标帧率（上限 56 帧由体积把关） */

  /** smoothstep —— 与 `anu-scene.js: frame()` 里 camTween 的缓动逐字相同 */
  function easeZoom(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
  function lerp3(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  }

  /**
   * 造剧本。关键帧 0 = **全景**（保留当前平移量，但视角复位到 fitDist / θ 0.9 / φ 1.02），
   * 关键帧 1..D = 各阶，最后一帧 = 再回到同一全景。
   */
  function buildZoomScript(dur) {
    var p0 = scene.getPan ? scene.getPan() : null;
    var home = {
      k: 0, point: p0 ? [p0.x, p0.y, p0.z] : [0, 0, 0],
      dist: fitDist, theta: 0.9, phi: 1.02, home: true
    };
    var keys = [home], k;
    for (k = 1; k <= model.depth; k++) {
      var lv = model.levels[k];
      /* 取景距离按「本阶沿父曲线的每匝间距 pitch」定：pitch·6 ≈ 画面里约 7 匝，
         这样每一阶看过去都刚好是一段清清楚楚的弹簧（1680 匝原型也不例外）。 */
      var dist = Math.max(1e-5, (lv.pitch || lv.radius * 4) * 6, lv.radius * 4.5);
      var view = zoomView(lv);
      keys.push({ k: k, point: lv.samplePoint, dist: dist, theta: view.theta, phi: view.phi });
    }
    keys.push({
      k: model.depth + 1, point: home.point.slice(), dist: home.dist,
      theta: home.theta, phi: home.phi, home: true
    });
    var n = keys.length - 1;                       /* 段数 = D + 1 */
    return {
      keys: keys, fly: dur.fly, hold: dur.hold, tail: dur.tail,
      seg: dur.fly + dur.hold, depth: model.depth,
      total: n * (dur.fly + dur.hold) + dur.tail
    };
  }

  /**
   * 时刻 t（秒）→ 相机状态。**纯函数**：同一个 t 永远给同一个画面
   * ⇒ GIF 逐帧重现现场播放（§8.17：两份算法必然漂移，一份才不漂）。
   * 返回 `{ k, phase, u, home, theta, phi, dist, point }`：
   *   `k` = 「当前应该显示哪一阶的字幕」（1..D = 该阶；D+1 = 递归结束回到全景）。
   */
  function zoomAt(t, S) {
    var n = S.keys.length - 1;
    var hd = n * S.seg;                            /* 「飞 + 停」总长；之后是 tail 收尾 */
    if (t >= hd) {
      var B2 = S.keys[n], A2 = S.keys[n - 1];
      var e2 = easeZoom(Math.min(1, (t - hd) / S.fly));
      return {
        k: B2.k, home: true, phase: 'tail', u: 1,
        theta: A2.theta + (B2.theta - A2.theta) * e2,
        phi: A2.phi + (B2.phi - A2.phi) * e2,
        dist: A2.dist + (B2.dist - A2.dist) * e2,
        point: lerp3(A2.point, B2.point, e2)
      };
    }
    var i = Math.min(n - 1, Math.floor(t / S.seg));      /* 第 i 段：keys[i] → keys[i+1] */
    var lt = t - i * S.seg;
    var u = Math.min(1, lt / S.fly);
    var e = easeZoom(u);
    var A = S.keys[i], B = S.keys[i + 1];
    return {
      k: B.k, home: !!B.home, phase: (lt < S.fly) ? 'fly' : 'hold', u: u,
      theta: A.theta + (B.theta - A.theta) * e,
      phi: A.phi + (B.phi - A.phi) * e,
      dist: A.dist + (B.dist - A.dist) * e,
      point: lerp3(A.point, B.point, e)
    };
  }

  /** 把一帧相机状态贴到场景上（现场播放与 GIF 录制**共用**这一处「应用」） */
  function applyZoomState(st) {
    scene.setCam(st.theta, st.phi, st.dist, st.point);
  }

  /** 「递归结束」那句收尾字幕（原实现在 step() 里，现抽出来给两条路共用） */
  function zoomTailCaption() {
    var tail = (state.shape === 'heart')
      ? '十根这样的丝（3 粗 + 7 细），每根从 1680 匝的 1st-order 一路细分到第 ' + model.depth +
        ' 阶 ⇒ 最低阶那 <b>7 匝</b>上就是那 <b>7 颗 koilon 珍珠</b>。'
      : '最低阶 spirilla 即那 “串在看不见的线上的<b>七颗珍珠</b>”。';
    return '<b>递归结束</b>：共 ' + model.depth + ' 阶，累计 <em>' + fmtInt(model.totalTurns) +
      '</em> 匝，最深一级顶点 <em>' + fmtInt(model.totalPoints) + '</em>。' + tail;
  }

  /** 按当前 k 播字幕（只在 k 变化时调一次） */
  function zoomCaptionFor(k) {
    if (!ui || !ui.caption) { return; }
    ui.caption(k >= model.depth + 1 ? zoomTailCaption() : captionFor(k), true);
  }

  function startZoomPlay() {
    if (zooming) { stopZoomPlay(); return; }
    if (!model) { return; }
    zooming = true; ui.setZoomState(true);
    zoomScriptC = buildZoomScript(ZOOM_LIVE);
    zoomT0 = 0; zoomLastK = -1;                    /* t=0 ⇒ 立刻显示第 1 阶字幕 */
    zoomRAF = requestAnimationFrame(zoomFrame);
  }
  function zoomFrame(ts) {
    if (!zooming) { return; }
    if (!zoomT0) { zoomT0 = ts; }
    var S = zoomScriptC;
    if (!S) { stopZoomPlay(); return; }
    var t = (ts - zoomT0) / 1000;
    if (t > S.total) {                             /* 剧终：此刻相机已经停在全景上 ⇒ 无跳变 */
      stopZoomPlay();
      scene.resetView(fitDist, 0.9, 1.02);
      ui.clearCaption();
      return;
    }
    var st = zoomAt(t, S);
    applyZoomState(st);
    if (st.k !== zoomLastK) { zoomLastK = st.k; zoomCaptionFor(st.k); }
    zoomRAF = requestAnimationFrame(zoomFrame);
  }
  function stopZoomPlay() {
    zooming = false; ui.setZoomState(false);
    if (zoomRAF) { cancelAnimationFrame(zoomRAF); zoomRAF = null; }
    if (zoomTimer) { clearTimeout(zoomTimer); zoomTimer = null; }
  }

  /* -------------------------------------------------------------- 预设应用 */
  var PRESETS = G.presets();
  /* 🔴 2026-10-08 老师：删掉预设 ③ `spring1680` / ④ `coilcoil`（「不需要」），
     剩下的序号前移 ⇒ 下面 3 条与 `AnuGeo.presets()` 的 ①..③ **一一对应且同序**：
       ① anuHeart  ／ ② ladder7 ／ ③ caduceus
     （更早删掉的 ①b `anuOvoid` 同理，不再出现。） */
  var PRESET_OVERRIDE = {
    /* ① 爱心双螺旋整体形态（Occult Chemistry 原图 + 老师订正几何）。
          T₁ = 每根 whorl 的 spring 匝数（1680）；宏观路径固定 2.5 + 2.5 = 5 圈。
          🔴 depth = 7：一路细分到 7th-order spirillae（每级 ×7），
             于是最细一阶（7 匝）上出现 koilon 珍珠 —— 老师 2026-10-08 的要求。 */
    anuHeart:  { shape:'heart', baseKind:'circle', depth:7,  turns1:1680, turns:7, fill:0.50, mode:'normal', wires:10, turnsList:null },
    /* ② 七级阶梯：展开圆上先绕 1680 匝（1st-order spirilla），其后每级在上一级的「一匝」上再绕 7 匝，直到第 7 级 */
    ladder7:   { shape:'coil',  baseKind:'ladder', depth:7,  turns1:1680, turns:7, fill:1.00, mode:'alternate', wires:1,  turnsList:null },
    /* ③ 十丝并列（3 粗 + 7 细，两族全程同向 → 俯视恒 180° 对望） */
    caduceus:  { shape:'coil',  baseKind:'circle', depth:3,  turns1:12,   turns:7, fill:0.45, mode:'alternate', wires:10, turnsList:null }
  };

  function applyPreset(id) {
    var o = PRESET_OVERRIDE[id];
    if (!o) { return; }
    state.presetId = id;
    state.shape = o.shape || 'coil';
    state.baseKind = o.baseKind || 'circle';
    state.depth = o.depth; state.turns1 = o.turns1; state.turns = o.turns;
    state.fill = o.fill; state.mode = o.mode; state.wires = o.wires; state.turnsList = o.turnsList;
    /* 🔴 外场形态 ⊗ 锥半角的联动（唯一入口）—— 预设可自带不同的参考角 / 外场形态；
       放在 `syncControls` **之前** ⇒ 联动算出的角度会连同其它状态一起回写到滑块。 */
    if (o.angleRef != null) { state.angleRef = +o.angleRef; }
    if (o.fieldShape != null) { state.fieldShape = +o.fieldShape; }
    applyFieldShape(state.fieldShape);
    ui.setParamMode(state.shape);
    ui.syncControls(state);
    ui.markPreset(id);
    stopZoomPlay(); stopPlay();
    _lastToast = null;
    rebuild(false);
    var p = PRESETS.filter(function (x) { return x.id === id; })[0];
    if (p) { ui.caption('<b>' + p.name + '</b>　' + p.note, false); }
    /* ② 七级阶梯：第 7 级只有第 1 级的 1/92 大 —— 必须自动逐级放大，否则只能看见最外层那圈。
       （🔴 2026-10-08 老师删掉 ③「1680 匝主弹簧」预设后，走这条自动放大的只剩 ②。） */
    if (id === 'ladder7') {
      zoomTimer = setTimeout(function () { startZoomPlay(); }, 1500);
    }
  }

  function stopPlay() { playing = false; playStart = 0; if (ui) { ui.setPlayState(false); } }

  var _lastToast = null;
  function toastOnce(msg) {
    if (msg === _lastToast) { return; }
    _lastToast = msg;
    if (ui) { ui.toast(msg); }
  }

  /** 缠绕模式的中文名（与 HTML 下拉框选项一致） */
  var WIND_NAME = { alternate: '交替正交', normal: '全环向（经典超螺旋）', axial: '全轴向' };

  /**
   * 🔴🔴 2026-10-08 老师报的 bug：「**无论我选哪个缠绕模式都看不出变化**，
   *   默认应该是**全环向，也就是经典超螺旋**。」
   *
   *   三处叠加才导致下拉框空转（已全部修掉）：
   *     ① `onParam` 的**爱心分支漏了 `state.mode = p.mode`** ⇒ 选了也进不了 state；
   *     ② `rebuildHeart` 没把 `mode` 传给 `Heart.build`；
   *     ③ `makeWhorl` 里 `G.subdivide(..., { mode: 'normal' })` **写死**成 normal。
   *
   *   修好后**主动把逐级模式链播出来** —— 因为第 1 阶在 `normal` 与 `alternate` 下
   *   **本来就是同一条骨架**（两级都从 normal 起步），差别要到第 2 阶才出现；
   *   不说明的话，老师很可能又以为「还是没变化」。这是几何事实，不是没修好。
   */
  function toastMode() {
    var chain = [], k;
    if (model && model.levels) {
      for (k = 1; k < model.levels.length; k++) {
        chain.push((model.levels[k] && model.levels[k].windMode === 'axial') ? '轴' : '环');
      }
    }
    var tip = {
      normal: '每级缠绕平面都 ⊥ 该处切向 ⇒ <b>各级平面互相平行</b>（经典超螺旋）',
      axial: '每级缠绕平面都含切向 ⇒ 第 1 阶从<b>立体螺旋</b>变成<b>平面锯齿</b>，一眼可辨',
      alternate: '奇数级 环向、偶数级 轴向 ⇒ 相邻两级缠绕平面<b>严格 90°</b>' +
                 '（文献 each finer coil to which its axis lies at right angles）'
    }[state.mode] || '';
    toastOnce('缠绕模式 = <b>' + (WIND_NAME[state.mode] || state.mode) + '</b>' +
              '　逐级：<b>' + (chain.join('·') || '环') + '</b>（环 = 全环向 / 轴 = 全轴向）<br>' + tip);
  }

  /* ------------------------------------------------------------------ 启动 */
  function boot() {
    ui = UI.create({
      onPreset: function (id) { applyPreset(id); },

      onParam: function (p) {
        /* 缠绕模式是否变了（变了就弹一条说明 —— 老师正是「看不出变化」才报的 bug） */
        var modeChanged = (state.mode !== p.mode);
        /* 整体形态模式下参数含义不同：
           爱心 —— T₁ = 每根 whorl 那根 spring 的匝数（**生效**，直接建模）；
                   **D = 递归层数（也生效）**：第 2 阶起每级在上一级最后一匝上再绕 7 匝；
                   丝数生效。
           （旧蛋形那条「T₁ / D 不参与建模」的分支已随预设①b 删除。） */
        if (state.shape === 'heart') {
          state.wires = p.wires;
          state.turns1 = p.turns1;
          state.depth = p.depth;                 /* 🔴 此前漏了这一行 ⇒ 拖动 D 完全无效 */
          /* 🔴🔴 2026-10-08 老师：「无论我选哪个缠绕模式都看不出变化」——
             根因之一就在这里：**爱心分支漏了 `state.mode = p.mode`**，
             于是选了也不进 state；再加上 `rebuildHeart` 不传 mode、`makeWhorl` 把 mode 写死，
             三处叠加 ⇒ 下拉框彻底空转。 */
          state.mode = p.mode;
          state.presetId = null; ui.markPreset(null);
          stopZoomPlay();
          rebuild(true);
          if (p.wires > 1 && p.turns1 >= 600) {
            toastOnce('1680 匝/丝 × 10 丝 → 每根 whorl 看过去是一根致密的弹簧绳；把 T₁ 调小可看清弹簧走向');
          } else { _lastToast = null; }
          if (capInfo && capInfo.capped) {
            toastOnce('已按 ' + capInfo.wires + ' 丝 + 采样密度限制递归至第 ' + capInfo.eff +
                      ' 阶（原设第 ' + capInfo.req + ' 阶），以保证流畅');
          }
          /* 模式说明放**最后**播：toast 只有一个元素，前面的会把它盖掉 */
          if (modeChanged) { toastMode(); }
          return;
        }
        state.depth = p.depth;
        state.fill = p.fill;
        state.mode = p.mode; state.wires = p.wires;
        /* T 恒为 7（第 2~7 阶 spirillae，不可调）；T₁ 可调（3~1684） */
        var changedTurns = (p.turns1 !== state.turns1);
        state.turns1 = p.turns1; state.turns = 7;
        if (state.turnsList && (changedTurns || state.turnsList.length !== p.depth)) { state.turnsList = null; }
        state.presetId = null; ui.markPreset(null);
        stopZoomPlay();
        rebuild(true);
        if (capInfo && capInfo.capped) {
          toastOnce('已按 ' + capInfo.wires + ' 丝限制递归至第 ' + capInfo.eff + ' 阶（原设第 ' + capInfo.req + ' 阶），以保证流畅');
        } else if (p.wires > 1 && p.depth > 4) {
          toastOnce('多丝 + 深阶：已自动降低采样密度以保证流畅');
        } else {
          _lastToast = null;
        }
      },

      onDisplay: function () { applyDisplayFromUI(); updateHUD(); },

      /* 🪞 老师新功能：**Anu 镜像**（φ → −φ，等价 z → −z）。
         和外场形态一样属于**改几何**（整条轨道的绕向） ⇒ 必须重建；
         但镜像**不改变半径与高度**（自检里逐点验证 dR/dY = 0）⇒ 原来的取景、
         上下孔、C∞ 接头全都不受影响，所以用 `rebuild(true)` 保留视角：
         画面上就是「同一个形体原地翻面」。极性标签由 `updateHUD` 自动跟着翻。 */
      onMirror: function (on) {
        state.mirror = !!on;
        stopZoomPlay();
        rebuild(true);
        toastOnce(state.mirror
          ? '🪞 已镜像：俯视内程改为**逆时针**沿直锥下旋 ⇒ positive 正磁荷'
          : '🪞 已还原：俯视内程为**顺时针**沿直锥下旋 ⇒ negative 负磁荷');
      },

      /* 🔴 第 ⑥ 条：两个按钮「外场球面切片 / 苹果切片」在 UI 层直接改滑块，
         这里只需接住「改了几何 → 重建」这一件事（onDisplay 已经会做）。 */
      /* 🔴 第 ⑦ 条：Sin 呼吸播放 */
      onBreath: function (on) { setBreathing(on); },
      onBreathPeriod: function (sec) { state.breathPeriod = sec; },
      /* 🔴 三条 GIF 路共用一个 `exportGif(kind)`（流水线只有「每帧怎么推进」那段不同）：
           'breath' = 呼吸周期（逐帧重建）/ 'growth' = 生长动画（只改 drawRange）
           / 'zoom' = 逐级放大播放（只改相机；与现场播放共用同一份 `zoomAt()` 剧本） */
      onGif: function () { exportGif('breath'); },
      onGifGrow: function () { exportGif('growth'); },
      onGifZoom: function () { exportGif('zoom'); },

      onPlay: function () { stopZoomPlay(); togglePlay(); },
      onZoomPlay: function () { stopPlay(); startZoomPlay(); },
      onGrowth: function (v) { state.growth = v; scene.setGrowth(v); },
      onSpeed: function (v) { state.speed = v; scene.setAutoSpeed(v); },
      onRotate: function (v) { state.rotate = v; scene.setRotate(v); },
      onReset: function () { stopZoomPlay(); scene.resetView(fitDist, 0.9, 1.02); },
      onTop: function () { stopZoomPlay(); scene.resetView(fitDist, 0.9, 0.16); },

      onTheme: function () {
        state.theme = state.theme === 'dark' ? 'light' : 'dark';
        document.body.className = 'theme-' + state.theme;
        scene.setTheme(state.theme);
        ui.themeLabel(state.theme === 'dark');
      }
    });

    ui.setPresets(PRESETS, state.presetId);
    ui.setParamMode(state.shape);
    ui.syncControls(state);
    scene.setTheme('dark');
    scene.setRotate(state.rotate);
    scene.setAutoSpeed(state.speed);
    scene.setGrowth(1);
    scene.start();

    /* 🔴 2026-10-17 老师：分辨率 · 最多看得见几级
       —— 相机缩放（滚轮 / 逐级放大 / Shift 平移）**不触发 updateHUD**，
          所以另起一条 250 ms 的轻量轮询；`lodUpdate()` 内部会比对签名，
          数值没变就一个 DOM 都不写。 */
    var rngLod = document.getElementById('rngLodPx');
    if (rngLod) {
      rngLod.addEventListener('input', function () { lodCache = ''; lodUpdate(); });
    }
    setInterval(function () { lodUpdate(); }, 250);

    /* 首次构建：默认落在 ① 爱心双螺旋整体形态 */
    applyPreset('anuHeart');

    /* ---------------------------------------------------------------
       只读自检接口（2026-10-19 加，供探针量「世界原点在屏幕上的真实位置」）
       ⚠️ 只读、不改状态；`project(0,0,0)` 就是世界原点的画布像素坐标
          （左上角为原点，单位 = CSS px，不含 devicePixelRatio）。
       为什么需要它：`viewDrop` 是世界 Y 方向偏移，经过透视投影后
          屏上位移会被 cos(phi) 缩短 —— 想验证「上移了 1/4 屏」，
          必须量投影结果，不能拿参数值当结论。
       --------------------------------------------------------------- */
    window.__anu = {
      scene: scene,
      camera: scene.camera,
      renderer: scene.renderer,
      project: function (x, y, z) {
        var v = new THREE.Vector3(x || 0, y || 0, z || 0).project(scene.camera);
        var el = scene.renderer.domElement;
        return {
          x: (v.x * 0.5 + 0.5) * el.clientWidth,
          y: (-v.y * 0.5 + 0.5) * el.clientHeight,
          w: el.clientWidth, h: el.clientHeight, ndcZ: v.z
        };
      },
      viewDrop: function () { return scene.getViewDrop ? scene.getViewDrop() : null; },
      setViewDrop: function (v) { if (scene.setViewDrop) scene.setViewDrop(v); }
    };

    window.addEventListener('resize', function () { scene.resize(); });

    ui.caption(
      '<b>Anu 整体形态（上端爱心 · 下端苹果）</b>：上半是<b>左右两个圆肩</b>、中央<b>顶中凹口</b>（顶上不是平的），' +
      '下半是<b>苹果式圆底</b>；轴向 10 根 whorl（3 粗 7 细，沿 36° 均分 ⇒ 3 粗的对面 180° 恰是细丝）。' +
      '每根 whorl 一程<b>下行 2.5 圈（内程 —— 贴着中轴直锥的锥壁缠绕）</b>、' +
      '一程<b>上行 2.5 圈（顺着苹果的边界缠绕）</b>，<b>合计 5 圈</b>；' +
      '这根 5 圈的路径本身再绕 <b>1680 匝</b>（1st-order spirillae）；' +
      '<b>苹果壳有厚度 ⇒ 外程分居两层</b>：<b>3 粗丝外缘贴外壁</b>、' +
      '<b>7 细丝外缘贴内壁</b>（相距一个<b>参考壳厚 0.072</b>，两层正好相切；图中<b>紫色虚线</b> = 细丝层外缘）；' +
      '拖<b>「双丝分离」</b>可把两族以中性面为轴对称拉开（粗 <b>+Δ/2</b> / 细 <b>−Δ/2</b>），' +
      '两端归零 ⇒ 丝仍精确落在上/下孔上；<b>内程则粗细同贴锥壁、不分层</b>。' +
      '<b>上孔/下孔 = 子午线与锥壁的交点</b>（锥口大下小 ⇒ 上孔 0.1364 &gt; 下孔 0.0422），' +
      '底端是<b>环形回转</b>（下半段椭圆苹果底 + 止于下孔），' +
      '所以是<b>苹果式圆底 + 果蒂环孔</b>，不是针尖；' +
      '中轴是口大下小的<b>直锥管</b>（半角 2.95° / 锥角 5.90°，由管壁最小二乘拟合）。' +
      '<b>🔴 阶数 D 现在真的生效</b>：这根 1680 匝的 whorl 还会<b>逐级 ×7</b> 细分到第 <b>' +
      (model ? model.depth : 7) + ' 阶</b>（每级只绕在上一级的<b>最后一匝</b>上）；' +
      '第 2–7 阶比第 1 阶小两三个数量级，<b>整身视图里看不见</b> —— ' +
      '点结构参数下的 <b>▶ 逐级放大播放</b> 会一阶一阶飞进去，' +
      '最后停在 <b>7th-order spirillae</b>（那一阶上有 <b>7 颗 koilon 珍珠</b>）。' +
      '点 <b>② 七级垂直细分</b> 可看同一套细分挂在展开圆上的对照。' +
      '<b>🪞 结构参数里点「Anu 镜像」</b>可把整个 Anu <b>以中轴为镜翻面</b>' +
      '（半径与高度<b>逐点不变</b>，只把绕向翻过来）：' +
      '俯视双丝的内程由 <b>顺时针沿直锥下旋</b>（= <b>negative 负磁荷</b>）' +
      '变成 <b>逆时针</b>（= <b>positive 正磁荷</b>），再点一次变回去；' +
      '当前极性实时标在舞台<b>左上角</b>（中央螺旋也跟着翻）。', false, 500);
    /* ⬆ 第三个参数 500 = 这段首屏说明只留 0.5 s（2026-10-19 老师：别一直挡在图中间）；
       默认值仍是 5200 ms，切换预设/操作提示不受影响。 */
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
