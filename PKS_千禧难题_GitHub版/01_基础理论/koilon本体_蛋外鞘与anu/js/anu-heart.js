/* ============================================================================
 * anu-heart.js —— Anu (UPA) 整体形态：**爱心双螺旋**  [按老师订正的几何]
 * ----------------------------------------------------------------------------
 * 依据：Occult Chemistry 原图（NEGATIVE END / VORTEX / FUNNEL TUBE / POSITIVE END
 *       / TORRENT，标注 EXTRA-SPIRALS 在外、INTRA-SPIRALS 在内）
 *       + 老师给出的逐条几何规范：
 *
 *   ① 上面那一程螺旋对应蛋形的「钝面」；
 *   ② 3 根粗 + 7 根细在空间上是 180° 对望的关系（像伏羲女娲缠绕）——
 *      10 丝沿 36° 均分，粗丝落 0°/36°/72°，其对面 180°/216°/252° 恰是细丝；
 *   ③ 一粗一细正视投影 → 心形；
 *   ④ 顶上靠近钝面「不是平的」：左右两个圆瓣 + 中间凹口，吸引管插在凹口里；
 *   ⑤ 从爱心上方下行到下方尖端 = 绕中轴 2.5 圈；
 *   ⑥ 从尖端翻转向上、贴着蛋场边界**外面**回到钝面顶 = 再绕中轴 2.5 圈；
 *   ⑦ 合计 5 圈（HUD「累计圈数」= 5）；
 *   ⑧ 这根 5 圈的宏观路径本身就是一根含 1680 匝的弹簧（1st-order spirillae）；
 *   ⑨ 【2026-10-07 追加】苹果壳有厚度 ⇒ 外程上粗/细**分居两壁**：
 *      3 粗丝的外缘贴**苹果外壁**、7 细丝的外缘贴**苹果内壁**；
 *      内程两者**共用直锥外壁**（都相切，不分层）。
 *
 * 几何构造（三处都是可证的，不靠调参凑）：
 *
 *   A. 子午线轮廓 = 「上半两个圆肩（爱心瓣） + 下半四分之一椭圆苹果底」
 *        · 上半  r = lobeC + (1−lobeC)·cos θ ,  y = (1−lobeC)·sin θ   （绕 (±lobeC,0) 的圆）
 *        · 下半  r = cos φ ,  y = −bottomHe·sin φ ,  φ = t − π/2      （四分之一椭圆弧）
 *      接缝 (1, 0) 处两段切向**都铅垂** ⇒ C¹ 连续，轮廓光滑无折角。
 *      因为是**旋转体的子午线**，正视时它本身就是外轮廓 ⇒ 顶部是两个**宽圆肩**、
 *      中间凹口插着 FUNNEL TUBE（顶上不是平的）—— 对应 ④。
 *      备选 bottomShape='sin'：r = sin^bottomPow(t)（旧口径，保留）。
 *
 *      🔴 2026-10-07 订正：原先用经典心形线 r = sin³t 作子午线 —— 量出来它的**下半段太瘦**
 *      （h=0.13 处半宽 0.144 vs 原图实测 0.383；h=0.42 处 0.715 vs 0.968），
 *      整体读成收得偏慢的"梨形"。老师指出「你这形状更像梨子不是苹果」后，
 *      老师又从四选一裁决图 `预览_Anu形状候选.png` 里选定「丁」：
 *      **上半两个圆肩（lobeC = 0.45）+ 下半四分之一椭圆弧（bottomHe = 1.00）**。
 *      代价：下半段比原图更饱满（h=0.13 处 0.607 vs 原图 0.383）—— 已知且被接受。
 *      复现脚本：_scratch/fit_shape.py（量原图）· _scratch/_shape_cmp.js（三方对比）·
 *      _scratch/_env_new.js（当前包络）；图版：_scratch/_shape_fit.png · 预览_Anu形状候选.png。
 *
 *   A2. 上孔 / 下孔 = **子午线 ∩ 锥壁**（2026-10-07 订正；见 coneHoles()）
 *        · 上孔：圆肩段 r(θ) = lobeC + Rp·cos θ 与 wallR(y) 的交点（二分）⇒ 0.1364 @y=+0.5693
 *        · 下孔：苹果底段 r(φ) = cos φ    与 wallR(y) 的交点（二分）⇒ 0.0422 @y=−1.2589
 *      因锥口大下小（wallR 随 y 单调递减）⇒ **必然 上孔 > 下孔**（比值 3.23）。不是凑的。
 *      rimR / bottomR 已退为 coneRim = false 时的**回退值**。
 *
 *   B. 内/外两程**各贴一层壳**（2026-10-07 重写 + 追加「内外壁分层」）
 *      ＋ **2026-10-08 深夜：两个接头改成 C∞ 混合**（老师：要 C⁰ 到 C∞ 都不能有折角）：
 *
 *        单一闭合轨道（子午面）      两条基座 + 两个 C∞ 接头
 *          内程（下行，贴锥管外壁）    r_in(q)  = wallAt(y(q)) = (y − apexY)·tan(半角)
 *          外程（上行，贴苹果壳子午线） r_out(q) = prof(q)
 *          接头（以孔为中心、双侧对称） P(τ) = (1−χ(τ))·A(τ) + χ(τ)·B(τ)
 *
 *      · 内程**直接取锥壁半径** ⇒ 逐点与锥壁恒等（实测最大偏差 2.78e-17），
 *        且从**上孔 0.1364 一路收到下孔 0.0422**；不再按外程比例缩小（那是假内程）。
 *      · 两程共用两个孔点 ⇒ 闭轨道首尾重合、曲线自闭合。对应 ⑤⑥。
 *      · 🔴 **接头 = C∞ 混合，不是圆角补丁**（`flatStep` + `orbitPlane`，见其上方长注释）
 *          τ = 以孔为原点的**有向弧长**（τ<0 入程侧 / τ>0 出程侧），窗口 |τ| < Q
 *          A = 入程基座及其延长；  B = 出程基座及其延长
 *          χ = 两端**所有阶导数都为 0** 的 C∞ 台阶；  Q = `joinSoft`（**半窗**，默认 0.25）
 *        ⇒ τ=−Q 处与入程**任意阶**全同、τ=+Q 处与出程**任意阶**全同
 *        ⇒ **整条闭轨道 C∞，没有任何阶的折角**（旧口径只做到 C¹，而且下孔还有 bug）。
 *        ⚠️ **2026-10-08 深夜第二次修正**：旧版窗口**全压在出程一侧**，入程切向原封带到孔上 ⇒
 *        两腿仍在孔处**横截相交**（下孔 **96.27°**、上孔 33°，老师：「像两个公式」「没顺着
 *        蓝色外程的切线往前走」）。改**双侧对称**后孔两侧各摊一半转角：
 *        下孔最大折角 31.62° → **7.75°**（曲率半径 0.0139 → **0.0567** > 粗丝弹簧半径 0.036）；
 *        孔附近「下探」0.0405 → **0.0122**；上孔上冲恒为 0。
 *        另：为让下孔窗口做得长，子午线延长线按椭圆解析式**越过底尖**继续延长
 *        （老师：「丝在孔处不需要严格贴合相接到曲面或锥面」）。
 *        ⚠️ 旧参数 `flipSoft`（smoothstep 圆角，默认 0.08）**已删除** —— 它只做到 C¹，
 *        且实测把内程半径从 0.045 吹到 **0.214** 再缩回（0.66 那个目标是椭圆底**外翼**），
 *        正是下孔 158.7° 折角的元凶。详见 _scratch/_diag_join.js / _diag_balloon.js。
 *      · 🔴 **追加（老师 2026-10-07）**：苹果壳有厚度 ⇒ 粗/细在外程上**分居两壁**：
 *          外程  粗丝  r = 外壁(u) − coilRThick·win(u)             （弹簧外缘贴**外壁**）
 *                细丝  r = 内壁(u) − coilR·win(u)                  （弹簧外缘贴**内壁**）
 *          内程  粗细都 r = wallAt(y)                              （同贴**锥外壁** —— 不分层）
 *        `win(u) = shellWin(u)` 在两端 shellRamp 宽度内 smoothstep 归零 ⇒
 *        上/下孔处偏移为 0 ⇒ **仍严格落在孔上、曲线依旧闭合**（实测 gap < 1e-15）。
 *        `surfaceTangent = 'off'` ⇒ 不内收弹簧半径，两程中心线落在壁面上（旧口径）；
 *        `'both'` ⇒ 内程也外移一个弹簧半径。
 *      · 🔴 **追加（老师 2026-10-08）**：改壳厚**两族必须同步动** ——
 *          「为何粗丝不动、只是细丝向内收敛？需要双丝同步都动，一个外膨、一个内敛。」
 *        ⇒ 两壁不再以「外壁」为锚，而是关于**中性面**（= prof − coilRThick，**与 shellGap 无关**）
 *          对称张开：外壁 = mid + shellGap/2、内壁 = mid − shellGap/2。
 *          于是 shellGap 每 +Δ：粗丝**外膨** Δ/2、细丝**内敛** Δ/2（导数 +½ / −½）。
 *          shellGap = 参考壳厚 2·coilRThick（默认 0.072）时两壁恰回到 prof / prof−0.072
 *          ⇒ **默认外观与旧版逐点相同**（先由 probe_heart §5e 的回落断言保证）。
 *          两条壁线（紫 = 内壁 / 金 = 外壁）会随壳厚一起张开，给老师当尺子。
 *      · ⚠️ 回退口径（coneRim = false）：r_in = prof·(1 − gapRel·sin(πu)^innerPow)，
 *        默认 gapRel = 0.82、innerPow = 1.60（**必须 > 1** 才在孔处共切线；早期 0.8 会折角）。
 *        该口径下内程并不真的贴锥管，仅作降级备份。
 *
 *   C. 同旋向、相位线性推进：
 *        下行  φ(u) = φ0 + TAU·m·u          （m = turnsPerLeg = 2.5）
 *        上行  φ(u) = φ0 + TAU·m·(2 − u)
 *      · u=1 处：上行起点相位 = φ0 + TAU·m = 下行终点相位 ⇒ 底端严丝合缝；
 *      · u=0 处：上行终点相位 = φ0 + TAU·2m = φ0 + TAU·5 ≡ φ0（2m = 5 为**整数**）
 *        ⇒ 回到上端起点，与首点坐标完全相同 ⇒ 曲线闭合。
 *      「2.5 是半整数」正是 ①③ 的成因：两程在每一高度相差 5(1−u) 匝，
 *      于是 10 丝织出的曲面处处互补，粗细两束互相缠绕成心形。
 *
 *   D. 每根 whorl 的宏观路径再作为**父曲线**交给 AnuGeo.subdivide()，
 *      以 mode='normal' 绕 microTurns 匝 → 文献那根
 *      “tightly twisted endless coil”。对应 ⑧。
 *
 * 与 anu-geometry.js 的分工（单一职责）：
 *   本模块只负责**整体形态**（心形轮廓 / 内外两程 / 十丝方位 / 中央螺旋 / 吸引管）。
 *   递归正交细分仍归 AnuGeo（那边已证明相邻两阶缠绕平面严格 90°）。
 *
 * 坐标系：y 轴 = 蛋轴，+y 指向 NEGATIVE END（钝面 / 吸引管那一端）。
 * UMD：浏览器挂 window.AnuHeart，node 可 require 做数值测试。
 * ==========================================================================*/
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.AnuHeart = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var TAU = Math.PI * 2;
  var SPECTRUM = ['#ff4d4d', '#ff9f1a', '#ffd60a', '#3ddc84', '#22d3ee', '#4d7cff', '#b06bff'];

  /**
   * 🔴 2026-10-08 老师：「网页默认按丝着色（3 粗米白 / 7 细七色）要改成
   *    （3 粗 = **金黄-银天蓝-银白**色）」。
   *
   *    为什么不用同一个色：三根粗丝是**同一条闭合轨道的三个相位**（φ_j0 = 2πj/3），
   *    给它们三个可区分的金属色，才能在俯视图上一眼分辨「哪根是哪根」，
   *    同时「金黄 / 银天蓝 / 银白」都属**金属冷亮色系**，与 7 根细丝的高饱和彩虹色
   *    在视觉上天然分成两族（粗细之外的第二个族标识）。
   *
   *    三色的物理联想：金黄 = 金（Au）、银天蓝 = 银（Ag）的反光偏冷、银白 = 银高点。
   *    旧值 #fff3d6（米白）与细丝的黄、橙太接近，俯视时容易混淆。
   */
  var THICK_COLORS = ['#f5c542', '#8fd6ff', '#eef3f8'];   /* 金黄 / 银天蓝 / 银白 */

  /* --------------------------------------------------------------- 默认参数 */
  /* 中轴锥管「口沿半径」锚定量：由老师参考图 anu直锥红色线.png 上两条红线在口沿处的
     间距量得 36.42 px，归一后定为 0.1428（模型单位）。
     ⚠️ 它与子午线高度是**两个独立量** —— 改了 aspect / lobeC 使总高变化时，
     口沿半径不会自动跟着缩放（这是刻意的：口沿是老师红线的直接标定值）。
     但口沿**高度**取 yLobe = (1−lobeC)·aspect，所以改 lobeC / aspect 时它会跟着走。 */
  var TUBE_MOUTH_R = 0.1428;

  /**
   * 子午线**越过端点**的解析延长量（弧度）。
   *
   * 「接头 C∞ 混合」需要一个**窗口**：在以孔为中心的 ±Q 弧长内把两条基座曲线混合。
   * 窗口越短，可用的「另一条基座延长线」就越短 ⇒ 转角挤在极短弧长里，折角肉眼可见。
   * 所以两条基座都必须能**越过自己的端点继续解析走下去**：
   *   · 苹果底：椭圆参数 φ 越过 π/2（过底尖后 cos φ < 0 ⇒ r 转负，是曲线的自然延续）
   *   · 球面  ：圆心角 ψ 越过 ±π/2（过极点后 cos ψ < 0，同理）
   * 0.85 rad ≈ 48.7°，是实测「够长但延长段不会绕回来打结」的值（见 `_scratch/_probe_join.js`）。
   */
  var ARM_OVERSHOOT = 0.85;

  /**
   * 🔴🔴 2026-10-08 老师（本轮新需求，原文）：
   *   「外场边界形态（0 = 球面 / 1 = 苹果）我发现你接近 0 的时候，**直锥角为何没有啥变化**，
   *     应该**角度更小**，**直锥从底到顶点的高应该比原先更大**，
   *     你用 **h = 1 / 外场边界形态值** 这个公式，
   *     但注意外场边界形态值由于是 h 公式的**分母**，**建议最小值从 0.1 开始到 1**。」
   *
   * ⇒ 把「外场边界形态 f」与「中轴直锥的半锥角 θ」耦合起来。
   *
   *   锥高 h = mouthR / tan θ，要 h ∝ 1/f  ⇒  tan θ ∝ f。取**基准** = 网页那根
   *   `tubeHalfAngle` 滑块（默认 2.95°，老师红线最小二乘值）：
   *
   *         tan(θ_eff) = tan(tubeHalfAngle) · f
   *
   *   · f = 1     ⇒ θ_eff = 2.95°，**逐位等于旧值**（默认形态零回归）；
   *   · f = 0.5   ⇒ θ_eff = 1.476°，锥高 ×2；
   *   · f = 0.1   ⇒ θ_eff = 0.2953°，锥高 ×10  —— 正是老师要的「角度更小、从底到顶点更高」。
   *
   *   为什么必须锁下限：f 在 h 公式的**分母**上，f → 0 会让锥顶跑到无穷远
   *   （且 `sphereProfile` 里的二分退化成 0/0）⇒ 本模块统一按 `max(f, 0.1)` 取有效值。
   *   滑块本身的最小值也同步改成 0.1（老师明确要求）。
   *
   * ---------------------------------------------------------------------------
   * 🔴🔴 **2026-10-08 第二次修订**（老师：「**中轴锥管半锥角（度）这个也需要参与生长呼吸动画**
   *   ……**外场边界形态和中轴锥管半锥角（度）要同时同步动**」）
   *
   *   第一版把耦合**藏在几何里**（`effHalfTan = tan(滑块值) × f`）—— 数学没问题，
   *   但界面上的后果是：呼吸时**只有「外场边界形态」那根滑块在动**，
   *   「中轴锥管半锥角」那根纹丝不动（真正在变的是一个看不见的乘子 f）。
   *   老师要的正是「两根滑块一起动」。
   *
   *   ### ✅ 现在把耦合**提到「状态派生」这一层**（仍然只有一处实现）
   *
   *       ① 几何层（`tubeAnchor` / `effHalfTan`）**直接读** `c.tubeHalfAngle`，
   *          把它当作**当前生效半角**，不再暗乘 f；
   *       ② 耦合规则由 `angleForShape(ref, f)` 显式给出（只有这一个地方实现）：
   *
   *              θ_当前 = θ_参考 · f          ← 就是上面那条 `tan θ ∝ f`，锁到角度域
   *
   *       ③ `anu-app.js` 在**任何**改动 f 的地方（拖滑块 / 点按钮 / 呼吸动画 / 切预设）
   *          调用它，把结果既写进 `state.tubeHalfAngle`，又写回滑块 ⇒ 两根滑块同步动。
   *
   *   ### 数值等价性（为什么这是「改写」而不是「改行为」）
   *       旧： θ = atan(tan(a)·f)      新： θ = a·f
   *       因 a ≤ 2.95° 极小，tan 在该区间几乎线性（`tan x = x + x³/3`，x = 0.0515 时
   *       三次项只占 0.089%）⇒ 两者差 ≤ 2e-4 rad ≈ **0.001°**：
   *         f = 1   ：旧 2.9500° 新 2.9500°（完全一致）
   *         f = 0.5 ：旧 1.4760° 新 1.4750°（差 0.0010°）
   *         f = 0.1 ：旧 0.2953° 新 0.2950°（差 0.0003°）
   *       随之锥高倍率由「**严格** 1/f」变成「tan(基准)/tan(当前)」：
   *         f = 0.5 ⇒ 2.0018（原 2.0000，差 0.09%）、f = 0.1 ⇒ 10.0185（原 10.0）。
   *       老师给的 **h = 1/f** 在**角度域**上仍然成立（θ ∝ f ⇒ h ∝ 1/f），
   *       只是 h 与 f 的严格倒数关系让位给「tan 比」，代价 0.09%、肉眼看不出。
   */
  var FIELD_F_MIN = 0.1;

  /** 网页那根「中轴锥管半锥角」滑块的**基准值**（= 苹果态 f = 1 时的生效半角，度）。 */
  var TUBE_ANGLE_REF = 2.95;
  /** 生效半角的**下限**（度）—— 与滑块 `min="10"` 对齐；再小锥顶就跑到视野外了。 */
  var TUBE_ANGLE_MIN = 0.10;

  /** 有效「外场边界形态」：clamp 到 [FIELD_F_MIN, 1]（h 公式的分母不能是 0） */
  function effFieldShape(c) {
    var f = (c && c.fieldShape != null) ? +c.fieldShape : 1;
    if (!(f > 0)) { return FIELD_F_MIN; }          /* NaN / 0 / 负数一律按下限 */
    return clamp(f, FIELD_F_MIN, 1);
  }

  /**
   * 🔴 **耦合规则（唯一实现）**：由「参考半角 + 外场形态」算出**当前生效半角**（度）。
   *   θ_当前 = θ_参考 · f     ⇒ 苹果态（f = 1）最大、球形态（f = 0.1）最小。
   * 调用者：`anu-app.js` 的一切 f 变更入口（拖滑块 / 球面-苹果按钮 / 呼吸动画 / 预设）。
   * @param {number} refDeg 参考半角（度），= 苹果态半角
   * @param {number} f      外场边界形态 ∈ [FIELD_F_MIN, 1]
   */
  function angleForShape(refDeg, f) {
    var r = (+refDeg > 0) ? +refDeg : TUBE_ANGLE_REF;
    var ff = (f != null && +f > 0) ? clamp(+f, FIELD_F_MIN, 1) : 1;
    return clamp(r * ff, TUBE_ANGLE_MIN, r);
  }

  /**
   * 把上面那条耦合规则**落到一份完整配置**上（返回**新**配置对象，不改入参）。
   *
   * ⚠️ 为什么需要它（2026-10-08 踩到的坑）：耦合改到「状态层」之后，
   *   `c.tubeHalfAngle` 就是**当前生效半角**。如果调用方只写了 `fieldShape: 0.75`
   *   而没同步改 `tubeHalfAngle`（仍是基准 2.95°），那份配置描述的就是一个
   *   **物理上不存在的状态** —— 球形态按 f=0.75 缩了、锥壁却还按 2.95° 走，
   *   于是「球面 ∩ 锥壁」的交点、锥高倍率、孔处切向全都不是 App 里看到的那一套。
   *   （自检里「上孔折角 13°」这个假报警就是这么来的。）
   * ⇒ **自检 / 出图 / 任何脚本**，凡是要「某个 fieldShape 下的形态」，
   *   一律用 `cfgForShape(f, base)` 而不是 `cfgOf({fieldShape: f})`。
   *   App 走的是同一个规则（`angleForShape`），只是它还要把结果写回 state 与 DOM，
   *   所以那边直接调 `angleForShape`。
   *
   * @param {number} f    外场边界形态（会被 clamp 到 [FIELD_F_MIN, 1]）
   * @param {object} base 基础配置（缺省 = 出厂 DEFAULTS）
   */
  function cfgForShape(f, base) {
    var c = cfgOf(base || {});
    c.fieldShape = effFieldShape({ fieldShape: f });
    c.angleRef = (c.angleRef == null) ? TUBE_ANGLE_REF : +c.angleRef;
    /* 量化到滑块分辨率（0.001°）—— 与 `anu-app.js: applyFieldShape` 完全一致，
       免得自检拿到的角度和网页上显示的角度差半格。 */
    c.tubeHalfAngle = Math.round(angleForShape(c.angleRef, c.fieldShape) * 1000) / 1000;
    return c;
  }

  /** 有效锥半角的**正切**：直接读 `tubeHalfAngle`（= **当前生效半角**）。
   *  ⚠️ 这里**不再**乘 f —— 耦合已经由 `angleForShape()` 在状态层完成（见上面第二次修订）。 */
  function effHalfTan(c) {
    var ha = (c && c.tubeHalfAngle != null) ? +c.tubeHalfAngle : DEFAULTS.tubeHalfAngle;
    return Math.tan(ha * Math.PI / 180);
  }

  /** 当前生效半角（度）—— `effHalfTan` 的角度版，供 UI/自检读 */
  function effHalfAngle(c) {
    var ha = (c && c.tubeHalfAngle != null) ? +c.tubeHalfAngle : DEFAULTS.tubeHalfAngle;
    return clamp(+ha, 1e-6, 89.9);
  }

  var DEFAULTS = {
    wires: 10,          /* 丝数（文献：3 粗 + 7 细） */
    thick: 3,           /* 前 3 根为粗丝 */

    rimR: 0.08,         /* 【回退值】凹口孔半径 —— 仅当 coneRim = false 时使用。
                           coneRim = true（默认）时，**上孔由「子午线与锥壁的交点」解出**
                           （≈0.1364 @ y=0.5693，见 coneHoles），不再用这个常数。 */
    lobeC: 0.45,        /* 圆肩「分离度」= 两瓣圆心到中轴的距离（归一化：最宽 = 1）。
                           越大 → 两瓣越分开、凹口越深、越像「心」；
                           越小 → 整体越圆、越像「苹果」。
                           🔴 2026-10-07 老师指出旧版（经典心形线 r=sin³t）「更像梨子
                           不是苹果」—— 因为 sin³t 的两瓣半宽只有最宽的 0.49，天生上窄下宽；
                           而原图 anu直锥红色线.png 逐行量得**近顶处半宽仍有 0.54~0.67**。
                           故改用「两个圆肩」构造：候选裁决图 _scratch/_shape_options.png
                           老师选定「丁 = 圆肩 0.45 + 椭圆苹果底」，本值即 0.45。 */
    aspect: 1.26,       /* 纵向拉伸 */

    bottomShape: 'ellipse', /* 下半段形状：
                           'ellipse' = 椭圆弧  r = cos φ, y = −bottomHe·sin φ（φ = t − π/2）
                             底端切向水平 ⇒ 苹果式**圆底**；老师裁决图选定的「丁」。
                           'sin'     = r = sin^bottomPow(t)（旧方案，保留以备对照）。 */
    bottomHe: 1.00,     /* 椭圆底纵向半轴（乘 aspect 前）。1.00 = 正圆底；>1 更瘦长。 */

    bottomR: 0.12,      /* 【回退值】底部回转环半径 —— 仅当 coneRim = false 时使用。
                           coneRim = true 时**下孔由「子午线与锥壁的交点」解出**（≈0.0422）。
                           底端是一个**有孔的环**（whorl 在此回转），不是针尖。 */
    bottomPow: 2.20,    /* 【仅 bottomShape='sin' 用】下半段半径指数：r = sin^p(t)。
                           3 = 经典心形（底端略尖）；1 = 球面（很圆）；2.20 ≈ 苹果式圆底。 */

    turnsPerLeg: 2.5,   /* 每程绕中轴圈数（半整数 → 两程相位互补成心形） */
    microTurns: 1680,   /* 每根 whorl 的 1 阶 spirilla 匝数（文献 1680） */

    /* 🔴 2026-10-08 老师：「我明明**阶数（递归层数）D 调到了 7**，为何爱心目前只有第一阶，
       应该能到最后 7th-order spirillae 才需要画上 7 个珍珠…」
       ⇒ 爱心模型本身要支持**七级递阶**（此前 `rebuildHeart` 硬编码 effDepthUsed = 1，
         `Heart.build` 也只造第 1 阶 ⇒ 拖动 D 完全无效）。

       定义（与预设②「七级垂直细分」**同一套口径**）：
         第 1 阶 = 这根 whorl 的 1680 匝（1st-order spirillae）；
         第 k 阶（k ≥ 2）= 在**上一级的最后一匝**上再绕 `branch` 匝。
       `depth` = 要画到第几阶（1 = 只有 1st-order，7 = 一路到 7th-order）。
       `branch` = 第 2 阶起的每级匝数（文献 7）。
       `subFill` = 第 2 阶起的充填比（2r / 匝间距）：1.0 = 匝与匝刚好相接
                   ⇒ 逐级半径比收敛到自然涌现值 √(1+π²)/7 = **0.4710**。 */
    depth: 1,           /* 递归层数 D（1..7）；爱心默认预设给 3，老师可拖到 7 */
    branch: 7,          /* 第 2 阶起每级匝数（每级 ×7） */
    subFill: 1.0,       /* 第 2 阶起的充填比（1.0 = 匝刚好相接） */
    /* 🔴 2026-10-08 老师：「螺旋线放大看像很多折线」＋「4 个点太少了吧，建议是 7 的倍数整数」
       ⇒ 每匝 spirilla 的采样点数**必须是 7 的倍数**（`makeWhorl` 里 `spp7()` 强制规整）。
       理由有两层：① 7 点/匝 = 正七边形，比正方形（4 点）平滑得多；
                    ② 与本项目「七级螺旋、每级 ×7」的主题同构。 */
    spp: 14,            /* 每匝 spirilla 采样点数（必须是 7 的倍数；网页滑块步长锁 7） */

    /* 🔴🔴 2026-10-08 老师（配截图）：「**缠绕模式** —— 无论我选哪个：缠绕模式 还是 交替正交
         下面那个缠绕模式，**都看不出变化**，默认应该是**全环向，也就是经典超螺旋**。」

       根因：`makeWhorl()` 里那行 `G.subdivide(..., { mode: 'normal' })` **把模式写死成 normal**，
       而 `rebuildHeart()` 压根没把 `state.mode` 传下来 ⇒ 那个下拉框是个**空转的装饰品**。

       语义（与 `AnuGeo.build` / `AnuGeo.tailChain` 同一套口径；见 `modesFor()`）：
         'normal'    = 全部阶都「全环向」（每级缠绕平面 ⊥ 该处切向）＝ **经典超螺旋**  ← 网页默认
         'axial'     = 全部阶都「全轴向」（缠绕平面含切向）
         'alternate' = 逐阶交替：奇数阶 normal、偶数阶 axial
                       （文献「each finer than the preceding coil **to which its axis lies
                        at right angles**」⇒ 相邻两级缠绕平面严格 90°） */
    mode: 'normal',

    gapRel: 0.82,       /* 内程相对外程的半径内收比（两端 sin(0)=sin(π)=0 → 自动归零）。
                           0.82 ⇒ 中段收到外程的 18% ——
                           于是内程成为**贴着中轴、从顶孔一直穿到底孔**的一股，
                           不再和外程挤在一起（旧值 0.16 时两程只差 16%，肉眼只看得见外绕那圈）。 */
    innerPow: 1.60,     /* 【仅 coneRim = false 用】内收窗口指数：sin(πu)^innerPow。
                           须 > 1 才在 u=0/1 处导数为 0（孔处共切线，不出现折角）。 */
    /* 🔴🔴 2026-10-08 老师（本轮核心）：
       「外程和内程的粗丝和细丝应该是能各自整合成一类型动力学混沌吸引子公式，
         目前明显上孔和下孔对接不似滑，一看就知道外程和内程像是对应两个公式」
       ＋「**要 C⁰ 到 C∞ 都不能有折角**」＋「**不要求接口处严格贴合曲面或锥面，要保证丝滑**」

       ⇒ 接头既不做「硬拼」也不做「圆角补丁」（那只到 G¹ / C¹），
         而是**用 C∞ 权函数在两个基座之间混合**（`flatStep`，两端所有阶导数为 0）。
         见 `orbitPlane()` 上方长注释。

       `joinSoft` = 混合窗口的**半窗弧长**（模型单位），即老师说的「丝滑段有多长」：
         · 窗口**以孔为中心**、两侧各 `joinSoft`（全窗 2×`joinSoft`）；
         · 两端所有阶导数为 0 ⇒ 混合段与两程基座**任意阶**相接 ⇒ 整条闭轨道 C∞；
         · 越大越顺（曲率越小、转折越缓），但接头附近离基座越远、孔附近的下探越深；
         · 0 = 关闭（回到硬拼，仅作对照，会重现「丁」字折角）。

       ⚠️ 2026-10-08 深夜**第二次口径修正**（老师：「丁 子图爱心的上孔和下孔的红色曲线
          的画法，当初画错了，**你没有顺着蓝色外程的切线往前走**」）：
          旧版把窗口**全压在出程一侧**，于是入程那一侧的切向原封不动带到孔上 ——
          孔处两条腿仍以 **96.27°（下孔）/ 33°（上孔）** 横截相交，一眼就是「丁」字。
          ⇒ 改成**以孔为中心的双侧对称窗口**（见 `orbitPlane`），孔两侧各摊一半转角。
          实测（`_scratch/_probe_join.js`）：
            下孔最大折角 31.62° → **7.75°**（曲率半径 0.0139 → **0.0567**）
            下孔「下探」   0.0405 → **0.0122**；上孔上冲恒为 **0**
          且曲率半径 0.0567 **大于粗丝弹簧半径 0.036** ⇒ 轴线比弹簧本身还缓。

       ⚠️ 两侧**可用上限不对称**（实测 + 老师第二条指示「**丝在孔处不需要严格贴合
          相接到曲面或锥面**，否则我估计难以生成一条动力学方程的曲线」）：
           上孔：入程延长 = 子午线往 cusp 走，0.21974（不再人为夹紧）；
           下孔：**出程延长 = 子午线往底尖走，原本只有 0.04223** —— 这才是旧版下孔
                 折角压不下去的真瓶颈。现已按椭圆解析式**越过底尖**延长（φ ≤ π/2+0.85），
                 可用弧长 ~0.6 ⇒ 对称窗口才做得长。
         `orbitPlane` 内按 `arms.*.L · 0.96` 与 `0.45×程长` 自动夹紧。

       ⚠️ 旧参数 `flipSoft`（smoothstep 圆角，默认 0.08）**已删除**：它只做到 C¹，
          且实测把内程半径从 0.045 吹到 **0.214** 再缩回（0.66 那个目标是椭圆底**外翼**），
          正是下孔 158.7° 折角的元凶。诊断：_scratch/_diag_join.js · _diag_balloon.js。 */
    joinSoft: 0.25,       /* C∞ 接头混合**半窗**弧长（0 = 关闭；窗口全宽 = 2×本例） */

    /* 🔴 2026-10-08 老师最终裁定（两句话定死口径）：
       ① 「**忘掉文献说的反向缠绕** —— 文献说的『反向』实际上就是**翻转、走外程回到上孔**」；
       ② 「**两族的动力学公式是一样的，为何计算结果不一样？两族就是旋转了 180 度。**」
       ⇒ 本模块现在是**一个方程管 10 根丝**，两族之间**没有任何参数差异**：

             内程（下行）φ_j(u) = φ_j0 + ω·2π·u
             外程（上行）φ_j(u) = φ_j0 + ω·2π + ρ·ω·2π·(1 − u)

          · ω = turnsPerLeg                —— **唯一**的动力学参数（默认 2.5 圈/程）
          · ρ = returnReverse ? −1 : +1    —— 外程方向，**两族共用**（默认 +1 同向）
          · φ_j0 = 2π·j/n                  —— 唯一的**族间差异**：初始相位

       粗 / 细的差别**只在几何半径**（`coilRThick` vs `coilR`、外壁 vs 内壁），
       **不在动力学**。

       ⇒ 直接推论：第 j 根与第 j+5 根两条路径**严格互为「绕中轴旋转 180°」**
         （因为 φ_{j+5,0} − φ_{j,0} = π）。俯视图上「3 粗的 180° 对面恰是 7 细」
         就是这个对称性**本身**，不是靠调参凑出来的。

       ⚠️ 两代被删掉的错误口径见 §8.8：
          · `returnOpposite`（把外程方向按族拆成粗 −1 / 细 +1）—— 等于给两族两套方程；
          · `spinThick` / `spinThin`（给两族两套相位速度）—— 同样破坏「一个方程」的前提。 */

    returnReverse: false, /* ⚠️ **仅作对照，正常不要开**：把外程改成「原路折返」（ρ = −1），
                             上行沿原方位角倒绕回来 —— 俯视图每条丝只剩 2.5 圈，
                             双螺旋的缠绕感全失。
                             false（默认）⇒ ρ = +1：两程同向，累计 5 圈连贯螺旋。
                             ⚠️ 打开后「回到上孔」的闭合条件变为 2ω ∈ ℤ（默认 2×2.5 = 5 ✓）。 */

    /* 🔴 2026-10-08 老师：「**粗丝弹簧直径要比细丝弹簧直径粗**，这样看起来就比较合理。」
       先定 1.6，老师说「1.6 还是不够，**改成 2 吧**」⇒ 现取 **2.0**。
       旧值 0.036 / 0.024 = 1.50 → 现 **0.036 / 0.018 = 2.00**。
       保持粗丝 0.036 不变（外壁那一层与壳厚 shellGap 都已认可），把细丝收到 0.036 / 2 = 0.018。

       ⚠️ 为什么只动细丝：两层弹簧「恰好相切堆叠」的不变量是
            中心距 = shellGap + coilR − coilRThick  ＝  coilRThick + coilR
          ⇒ **shellGap = 2 × coilRThick**（与 coilR 无关）。
          所以改 coilR 不动 tangency；改 coilRThick 就必须同步把 shellGap 改为 2×coilRThick
          （如 0.048 ⇒ 0.096），苹果壳会跟着变厚。
          这里取前者 ⇒ shellGap 仍是 0.072 = 2×0.036，**恰好相切**这一点原样保住。 */
    coilR: 0.018,       /* 细丝弹簧半径 = coilRThick / 2（决定 whorl 这根「绳」的粗细） */
    coilRThick: 0.036,  /* 粗丝弹簧半径（外缘贴苹果**外壁**） */

    /* 🔴 2026-10-07 老师追加规范：**外程要分居苹果的内、外两壁**
       「3 根粗的外程弹簧边在与苹果**外壁**表面相接，7 根细螺旋弹簧在与苹果**内壁**表面相接；
         内程时，粗细都与直锥**外壁**相接切。」

         苹果壳有厚度 ⇒ 两个面（**关于中性面对称张开**）：
           中性面 = 子午线 prof 往里 coilRThick（**与 shellGap 无关**，固定不动）；
           外壁 = 中性面 + shellGap/2，3 粗丝的外缘落在它上面；
           内壁 = 中性面 − shellGap/2，7 细丝的外缘落在它上面。
       内程两者**共用**直锥外壁（不再分层）—— 只是各自内缘贴着锥壁。

       注：偏移量都在两端用 shellWin() 平滑归零 ⇒ 曲线**仍严格落在上/下孔上**（保持闭合），
       不是硬切。                              */
    shellGap: 0.072,      /* 苹果「**参考壳厚**」= 外壁 → 内壁 的径向距离。
                             默认 0.072 = 2×coilRThick：此时
                               外壁 ≡ prof（老师红线描的苹果轮廓）、内壁 ≡ prof − 2·rt，
                               粗丝中心线 −rt、细丝中心线 −(2·rt+rc)
                               ⇒ 两层**相切堆叠、不重叠**，且**与旧版逐点相同**。
                             🔴 2026-10-08 老师：「调壳厚时粗丝不动、只有细丝内敛 ——
                               需要**双丝同步都动，一个外膨、一个内敛**。」
                             ⇒ 两壁以**中性面**（prof − coilRThick）为锚对称张开：
                                 粗丝 out = +(shellGap/2 − coilRThick) − coilRThick  （外膨 +Δ/2）
                                 细丝 out = −(shellGap/2 + coilRThick) − coilR       （内敛 −Δ/2）
                             🔴🔴 2026-10-08 老师再裁定：「『双丝分离（更远离苹果壁）』和
                               『苹果壳厚（外壁↔内壁）』**这两个功能重复了**，#选双丝分离」。
                               核实：上面两式对 shellGap 的导数（+½ / −½）与 `wireSpread`
                               对 `layer` 的导数（+½ / −½）**完全相同** ⇒ 数学上是同一个旋钮。
                             ⇒ **本项已固定为常量 0.072、不再暴露 UI**（滑块删除）；
                                两族开合从此只由 `wireSpread` 一个滑块驱动。
                             ⚠️ 两层「相切」的条件恒为 shellGap = 2·coilRThick = 0.072；
                                只有「双丝分离」能打破它（Δ > 0 ⇒ 分得更开）。 */
    shellRamp: 0.12,      /* 偏移量的两端窗口宽度（以子午线弧长参数 u 计）。
                             在 u<shellRamp 与 u>1−shellRamp 内 smoothstep 归零，
                             于是丝在**上/下孔处与锥壁严丝合缝**（C¹），中段才分层。 */

    /* 🔴 2026-10-08 老师第 ⑥ 条：「新增滑条 A —— **双丝在外程更远离苹果壁**
       （粗丝更向外膨胀，细丝更向内收敛）」。
       🔴🔴 2026-10-08 老师再裁定：原「苹果壳厚」滑块与它**功能重复**，已删除
          ⇒ 本项是**唯一**的两族分离旋钮（`shellGap` 退为内部常量 0.072）。

       与「壁」的关系：
         · 壁面（外壁 = prof / 内壁 = prof − 0.072）**不动**；
         · 只把两族丝**相对拉开**：粗丝再往外 +Δ/2、细丝再往内 −Δ/2
           ⇒ 两族不再贴壁（各离壁 Δ/2），正是老师说的「**更远离苹果壁**」。
       取值 0 = 两层相切（= 参考壳厚的外观，与旧版逐点相同）；越大两族分得越开。
       🔴🔴 2026-10-08 老师：「**双丝分离（更远离苹果壁）默认 0.05**」
          ⇒ 出厂值由 0 改为 **0.05**（= 粗丝外膨 +0.025 / 细丝内敛 −0.025，两层各离壁 0.025）。
          ⚠️ 与 `shellGap = 2·coilRThick`（0.072）那条「恰好相切」的不变量**不再同时成立** ——
             相切只在 `wireSpread = 0` 时成立；自检里验相切必须**显式**给 `wireSpread: 0`
             （见 `_scratch/probe_heart.js` 的 [5g] / [6c]），不能拿默认配置去验。
       ⚠️ 它同样在两端用 `shellWin` 归零 ⇒ 丝**仍严格落在上/下孔上**（闭合不破）。
       `heartGuides` 里那两条虚线（细丝层外缘 / 粗丝层外缘）就跟着本项张开，可当尺子看。 */
    wireSpread: 0.05,     /* 双丝在外程的分离量（粗 +Δ/2 外膨、细 −Δ/2 内敛）—— 唯一旋钮
                             出厂值 0.05（老师 2026-10-08：「默认 0.05」）；0 = 两层相切 */
    surfaceTangent: 'both', /* 🔴 弹簧「边」与壁面相切（老师原话「弹簧边…相接/相接切」）。
                             三态 —— 因为「内程是否也要外移一个弹簧半径」有两种读法：
                               'shell'：**只对外程**。粗丝中心线内收一个 coilRThick
                                   ⇒ 弹簧外缘贴**苹果外壁**；细丝内收一个 coilR
                                   ⇒ 弹簧外缘贴**苹果内壁**。内程维持旧画法
                                   （中心线即在锥壁上）。
                               'both'（🔴 **出厂默认**，2026-10-08 老师）：
                                   内程也外移一个 coilR（粗细都）⇒ 弹簧**内缘**贴锥外壁 ——
                                   老师原话「**弹簧边同时贴锥壁（内程也外移）**」。
                               'off'  ：中心线就落在各自壁面上（不再内收弹簧半径），
                                   **但内外壁分层仍然保留** —— 仅作对照。
                             ⚠️ 兼容：传 true ⇒ 'both'，传 false ⇒ 'off'。 */

    profileN: 400,      /* 子午线按弧长重采样点数。
                           🔴 2026-10-08 由 260 提到 400：C∞ 接头（joinSoft = 0.15）
                           落在**外程**上，外程采样步长 h = 子午线弧长/(N−1) ≈ 0.0077，
                           窗口内约 20 个采样点 ⇒ 转折被充分分辨（旧 260 只有 12 个，会显多边）。 */

    central: true,      /* 画中央螺旋（the central spiral） */
    centralTurns: 7,
    centralR: 0.052,

    tube: true,         /* 画中轴锥管（原图 FUNNEL TUBE：口大、向下收的**直锥体**） */
    coneRim: true,      /* 🔴 上/下孔 = 子午线与**锥壁的交点**（见 coneHoles，二分求解）。
                           ⇒ 锥管正好穿在两个孔里，几何自洽；
                           因锥口大下小，必然 **上孔径 > 下孔径**（实测 0.1364 > 0.0422）
                           —— 老师 2026-10-07 明确要求「上孔肯定大于下孔直径」。
                           false 时回退到常数 rimR / bottomR（旧行为）。 */
    tubeHalfAngle: 2.95,/* **当前生效半角**（度）。2026-10-07 老师给出参考图「anu直锥红色线.png」：
                           他在原图上沿管壁描了两条红线，最小二乘拟合得
                           左壁 +3.243°、右壁 −2.653°（各相对铅垂），
                           半锥角 = atan((b₁−b₂)/2) = 2.948° ⇒ 取 2.95°（锥角 5.90°）。
                           换算与对照图见 _scratch/_cone_anchor.png。

                           🔴🔴 2026-10-08 **第二次修订**（老师：「外场边界形态和中轴锥管半锥角
                             要**同时同步动**」）：
                             这个量**就是「当前生效半角」**，由
                                 `angleForShape(angleRef, fieldShape) = angleRef · f`
                             在**任何** f 变更处（拖滑块 / 球面-苹果按钮 / 呼吸动画 / 预设）联动写好。
                             ⇒ 网页那根滑块在呼吸时会跟着一起动，两根滑块同步。
                           ⚠️ 第一次修订时它是「基准角」、由几何暗乘 f（`tan(slider)·f`）——
                             数学等价（差 ≤ 0.001°）但**界面上看不出联动**，已废弃。 */
    angleRef: 2.95,     /* 「参考半角」= **苹果态（f = 1）**的半锥角（度）—— 耦合规则的参考端。
                           出厂值 = 标定值 2.95°；拖「中轴锥管半锥角」滑块会按当前 f 反解出新参考值，
                           于是「手动微调锥角」在后续 f 变化时仍然生效（不会被一键覆盖掉）。 */
    tubeMouthY: null,   /* 管口高度；null → 取两瓣最高处（与原图一致：口沿与两瓣齐平） */
    tubeMouthR: null,   /* 口沿半径；null → TUBE_MOUTH_R（0.1428，由参考图红线量得）。
                           apex 由它反解：apexY = mouthY − mouthR / tan(半角)
                           = yLobe − 0.1428/tan(2.95°) ≈ 0.693 − 2.771 ≈ −2.078，
                           即锥管穿过下孔（botY ≈ −1.2589）一直沉到 TORRENT 段
                           —— 与老师红线的画法一致。 */

    guides: true,       /* 画心形侧影 + 中轴 */
    macroGuide: true,   /* 画 whorl 的宏观 5 圈路径（虚线，嵌在绳芯里） */
    /* 🔴 2026-10-08 老师第 ⑥⑦ 条：「两个按钮『外场球面切片』和『苹果切片』可以互换」
       ＋「⑦ 让这个参数动态播放遵循 sin(t) 周期性变化，让这个 Anu 的**外场边界**
          从球形到苹果到球形，可如此循环」。

       `fieldShape` = **外场边界形态**在「球面」与「苹果」之间的插值：
         1.0（默认）= 苹果切片 = 现状（两圆肩 + 椭圆苹果底，老师红线描的那条轮廓）；
         0.0        = 球面切片 = 以原点为心、半径 1 的正球，被中轴锥管打出的上下两孔之间那一段。
       两条切片**同参数化**（u = 0 → 上孔、u = 1 → 下孔、按弧长等距）⇒ 可以逐点 lerp，
       于是 `fieldShape` 从 1 拖到 0 就是「苹果 → 球」的连续形变（无跳变）。
       下游（上下孔、两程、壳厚分层）全部读 `outerProfile(c)` 的输出 ⇒ 自动跟着变。 */
    fieldShape: 1.0,    /* 1 = 苹果切片（默认）；0 = 正球面切片 */

    /* 🔴🔴 2026-10-08 老师（本轮新功能）：
       「点一下 **anu 镜像**，就把 anu **以中轴为镜**、把左右反过来。这样俯视图看 anu 的双丝，
         **顺时针沿着直锥下旋**就变**逆时针下旋**。这两种 anu 都是存在的，
         **顺时针沿着直锥下旋的 anu 对应 negative 负磁荷**；
         反之，**逆时针沿着直锥下旋的 anu 对应 positive 正磁荷**。」

       `mirror = true` ⇒ 把**方位角整体取反**（φ → −φ，等价于 z → −z 的镜面反射）：
         · 半径 r 与高度 y **逐点不变** ⇒ 还是同一条闭轨道、同一组上下孔，
           孔处的 C∞ 接头与「折角 ≤ 6.5°」等已认可的性质**全部保持**；
         · 只有绕向翻面 ⇒ 俯视图里内程（沿直锥下旋那一程）由顺变逆（或反之）。

       数学上：绕中轴（y 轴）的镜面反射作用在 (r, φ) 上就是 φ → −φ，
       而这正是本模块**唯一**的方位角来源 `whorlPhase()` 的输入 ⇒ 一处改动、全局一致
       （`whorlPath` / `whorlSegment` / 中央螺旋都跟着翻）。 */
    mirror: false
  };

  function cfgOf(o) {
    var c = {}, k;
    for (k in DEFAULTS) { if (DEFAULTS.hasOwnProperty(k)) { c[k] = DEFAULTS[k]; } }
    if (o) { for (k in o) { if (o.hasOwnProperty(k) && o[k] != null) { c[k] = o[k]; } } }
    return c;
  }

  /* ------------------------------------------------ 子午线：圆肩 + 苹果底 */
  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  /**
   * 子午线（未乘 aspect，含 cusp 的完整一支）。参数 t ∈ [0, π]：
   *   t ∈ [0, π/2] → **两个圆肩**（爱心瓣）：绕 (±lobeC, 0)、半径 Rp = 1 − lobeC 的圆。
   *                   t = 0 → 顶中凹口 cusp（r = 0）；t = π/2 → 最宽（r = 1, y = 0）。
   *   t ∈ [π/2, π] → **苹果式圆底**（由 bottomShape 决定用哪一种）：
   *                   'ellipse'：φ = t − π/2，r = cos φ，y = −bottomHe·sin φ   ← 默认
   *                   'sin'    ：r = sin^bottomPow(t)，y = y_heart(t) − y_heart(π/2)
   * 接缝 (1, 0) 处两段切向**都铅垂** ⇒ C¹ 连续，无折角：
   *   上半段 θ→0 时 (dr, dy) ∝ (0, −1)；椭圆底 φ→0 时 (dr, dy) ∝ (0, −1)；sin 底同理。
   * @param {number} t ∈ [0, π]
   * @param {object} [c] 配置（用 lobeC / bottomShape / bottomHe / bottomPow）
   * @returns {[number, number]} [r, y]
   */
  function heartRT(t, c) {
    c = c || DEFAULTS;
    var c0 = c.lobeC, Rp = 1 - c0;
    if (t <= Math.PI / 2) {
      var tc = Math.acos(clamp(-c0 / Rp, -1, 1));      /* cusp 对应的 θ */
      var th = tc * (1 - t / (Math.PI / 2));           /* θ: tc → 0 */
      return [c0 + Rp * Math.cos(th), Rp * Math.sin(th)];
    }
    return bottomRT(t - Math.PI / 2, c);               /* 下半段：φ = t − π/2 */
  }

  /**
   * **下半段（苹果底）**：参数 φ ∈ [0, π/2]，返回未乘 aspect 的 [r, y]。
   *   'ellipse'：r = cos φ，y = −bottomHe·sin φ        ← 四分之一椭圆弧，底端切向水平
   *   'sin'    ：r = sin^bottomPow(t)，y = y_heart(t) − y_heart(π/2)，t = π/2 + φ
   * φ = 0 → 接缝 (1, 0)；φ = π/2 → 底尖 (0, −bottomHe)。
   * 做成独立函数是为了让 **锥管交点求解**（coneHoles 的下孔）能直接调用它。
   */
  function bottomRT(ph, c) {
    c = c || DEFAULTS;
    if (c.bottomShape === 'ellipse') {
      return [Math.cos(ph), -c.bottomHe * Math.sin(ph)];
    }
    var t = Math.PI / 2 + ph;
    return [Math.pow(Math.sin(t), c.bottomPow),
            yMeridian(t) - yMeridian(Math.PI / 2)];
  }

  /** 心形曲线的 y(t)（与半径指数无关，只由心形曲线本身决定） */
  function yMeridian(t) {
    var c = Math.cos(t);
    return (13 * c - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 17;
  }

  /** 反解 t ∈ [0, π/2] 使 heartRT(t, c).r = r（上半，圆肩段，解析可解） */
  function tForR(r, c) {
    c = c || DEFAULTS;
    var c0 = c.lobeC, Rp = 1 - c0;
    var th = Math.acos(clamp((r - c0) / Rp, -1, 1));
    var tc = Math.acos(clamp(-c0 / Rp, -1, 1));
    return clamp((tc - th) / Math.max(1e-12, tc), 0, 1) * (Math.PI / 2);
  }

  /** 反解 t ∈ [π/2, π] 使下半段子午线半径 = r */
  function tForRBottom(r, c) {
    c = c || DEFAULTS;
    if (c.bottomShape === 'ellipse') {
      return Math.PI / 2 + Math.acos(clamp(r, -1, 1));   /* r = cos φ ⇒ φ = acos r，解析 */
    }
    var lo = Math.PI / 2, hi = Math.PI - 1e-12, i, mid;
    for (i = 0; i < 64; i++) {
      mid = 0.5 * (lo + hi);
      if (Math.pow(Math.sin(mid), c.bottomPow) > r) { lo = mid; } else { hi = mid; }
    }
    return 0.5 * (lo + hi);
  }

  /* ------------------------------------------------- 中轴锥管 · 上下孔 */
  /** 两瓣最高处的高度 = 圆肩半径 × aspect（只依赖 lobeC/aspect，无循环依赖） */
  function yLobe(c) { return (1 - c.lobeC) * c.aspect; }

  /** 锥管几何（与 prof 无关的「纯参数」版本）—— 供 holesOf / wallAt 用 */
  function tubeAnchor(c) {
    /* 🔴 2026-10-08 老师：锥半角与「外场边界形态 f」耦合。
       ⚠️ 第二次修订后，**耦合不在这里**：`c.tubeHalfAngle` 已经就是「当前生效半角」
          （由 `angleForShape()` 在状态层算好）。这里只做「半角 → 斜率」的落地。
       ⇒ 一切用到锥壁的地方（上下孔 / 内程贴壁 / 球面切片 / 参考线）都自动跟着走。 */
    var k = effHalfTan(c);
    var mouthR = (c.tubeMouthR == null) ? TUBE_MOUTH_R : c.tubeMouthR;
    var mouthY = (c.tubeMouthY == null) ? yLobe(c) : c.tubeMouthY;
    return { slope: k, mouthR: mouthR, mouthY: mouthY,
             apexY: mouthY - mouthR / Math.max(1e-6, k),
             halfAngle: Math.atan(k) * 180 / Math.PI,     /* 生效半角（度） */
             sliderHalfAngle: +c.tubeHalfAngle,           /* 同上（口径名与 tubeGeom 对齐） */
             refHalfAngle: (c.angleRef == null) ? TUBE_ANGLE_REF : +c.angleRef,
             f: effFieldShape(c) };                       /* 生效的形态因子（= 锥高倍率的倒数） */
  }

  /**
   * **锥壁半径**：wallAt(y) = (y − apexY)·tan(半角)。
   * 🔴 这是「内程贴着绿色直锥缠绕」的依据 —— 内程每一点都取这个半径。
   * 因锥口大下小（半角 2.95°），wallAt 随 y **单调递减** ⇒ 下行时自然从粗收到细。
   */
  function wallAt(y, c) {
    var t = tubeAnchor(c || DEFAULTS);
    return (y - t.apexY) * t.slope;
  }

  /**
   * 🔴 **上/下孔 = 子午线与锥壁的交点**（老师 2026-10-07 规范）。
   *
   * 锥管锚定量（老师红线标定，见 DEFAULTS.tubeHalfAngle / TUBE_MOUTH_R）：
   *   mouthY = 两瓣最高处，  apexY = mouthY − mouthR / tan(2.95°)
   *   wallR(y) = (y − apexY)·tan(2.95°)
   * 因为锥管**口大下小**，wallR(y) 单调 ⇒ 与子午线的两个交点必然满足
   *   **上孔径 > 下孔径**（实测 0.1364 > 0.0422），正是老师要求的关系。
   *
   * 求解：两段各自的差函数在交点处变号，用 90 步二分（机器精度内收敛）。
   *   上孔：圆肩段  r(θ) = lobeC + Rp·cos θ,  y(θ) = Rp·sin θ·aspect,   θ ∈ [0, tc]
   *   下孔：苹果底段 r(φ) = cos φ,            y(φ) = −He·sin φ·aspect,   φ ∈ [0, π/2]
   * 两个交点也是内/外两程的**接合点** —— 内程贴锥壁到此处恰好落在子午线上，
   * 于是曲线自动闭合，无需任何过渡弧。
   */
  function coneHoles(c) {
    var c0 = c.lobeC, Rp = 1 - c0, i, mid, f, lo, hi;
    var ta = tubeAnchor(c);
    function wallR(y) { return (y - ta.apexY) * ta.slope; }

    /* 上孔（圆肩段）*/
    var tc = Math.acos(clamp(-c0 / Rp, -1, 1));
    lo = 0; hi = tc;
    for (i = 0; i < 90; i++) {
      mid = 0.5 * (lo + hi);
      f = (c0 + Rp * Math.cos(mid)) - wallR(Rp * Math.sin(mid) * c.aspect);
      if (f > 0) { lo = mid; } else { hi = mid; }
    }
    var thT = 0.5 * (lo + hi);
    var topR = c0 + Rp * Math.cos(thT), topY = Rp * Math.sin(thT) * c.aspect;

    /* 下孔（苹果底段）*/
    lo = 0; hi = Math.PI / 2;
    for (i = 0; i < 90; i++) {
      mid = 0.5 * (lo + hi);
      var q = bottomRT(mid, c);
      f = q[0] - wallR(q[1] * c.aspect);
      if (f > 0) { lo = mid; } else { hi = mid; }
    }
    var phB = 0.5 * (lo + hi);
    var qb = bottomRT(phB, c);
    var botR = qb[0], botY = qb[1] * c.aspect;

    return {
      topR: topR, topY: topY, botR: botR, botY: botY,
      mouthY: ta.mouthY, mouthR: ta.mouthR, apexY: ta.apexY, slope: ta.slope,
      lobeY: yLobe(c),
      topAngle: thT, botAngle: phB
    };
  }

  /** 取上/下孔（coneRim = false 时退回常数 rimR / bottomR，即旧行为） */
  function holesOf(c) {
    if (c.coneRim === false) {
      return {
        topR: c.rimR, botR: c.bottomR, topY: null, botY: null,
        lobeY: yLobe(c), mouthY: tubeAnchor(c).mouthY,
        apexY: tubeAnchor(c).apexY, slope: tubeAnchor(c).slope,
        mouthR: tubeAnchor(c).mouthR
      };
    }
    return coneHoles(c);
  }

  /** 二维折线按弧长等距重采样为 N 点（保住两端点） */
  function resample2(raw, N) {
    var cum = [0], i, j = 0, out = [];
    for (i = 1; i < raw.length; i++) {
      var dx = raw[i][0] - raw[i - 1][0], dy = raw[i][1] - raw[i - 1][1];
      cum.push(cum[i - 1] + Math.sqrt(dx * dx + dy * dy));
    }
    var L = cum[cum.length - 1] || 1;
    for (i = 0; i < N; i++) {
      var s = L * i / (N - 1);
      while (j < cum.length - 2 && cum[j + 1] < s) { j++; }
      var t = (s - cum[j]) / Math.max(1e-12, cum[j + 1] - cum[j]);
      out.push([
        raw[j][0] + (raw[j + 1][0] - raw[j][0]) * t,
        raw[j][1] + (raw[j + 1][1] - raw[j][1]) * t
      ]);
    }
    return out;
  }

  /**
   * 外程子午线（**苹果切片**）：u = 0 → **凹口孔**（r = rimR，FUNNEL TUBE 从这里插进去），
   *             u = 1 → **底部回转环**（r = bottomR，底端有孔、不是针尖）。
   * 返回按弧长等距的 [[r, y], ...]（已乘 aspect）。
   *
   * 🔴 底部为什么在 r = bottomR 处截断（2026-10-07 老师订正）：
   *   原图底端不是针尖，而是**环形结构** —— 线圈在底部绕过去、中间留一个孔
   *   （锥管正好从洞中穿出）。所以子午线**不走到 r = 0**，而是停在 r = bottomR；
   *   两程（内/外）在此半径会合 ⇒ 底部是一个有孔的回转环。
   */
  function appleProfile(c) {
    var hz = holesOf(c);
    var t0 = tForR(hz.topR, c);
    var t1 = tForRBottom(hz.botR, c);
    var M = Math.max(400, Math.round(c.profileN) * 8);
    var raw = [], i;
    for (i = 0; i <= M; i++) {
      var t = t0 + (t1 - t0) * (i / M);
      var p = heartRT(t, c);
      raw.push([p[0], p[1] * c.aspect]);
    }
    return resample2(raw, Math.max(64, Math.round(c.profileN)));
  }

  /**
   * 外程子午线（**球面切片**）——老师第 ⑥ 条的「外场球面切片」。
   *
   * 与 `appleProfile` **完全同参数化**：u = 0 → 上孔、u = 1 → 下孔、按弧长等距
   * ⇒ 两者可逐点 lerp（见 `outerProfile`），`fieldShape` 一拖就从苹果连续变到球。
   *
   * ⚠️ 形态对比（这正是老师要的）：
   *   · 苹果切片的**上孔很低**（y ≈ 0.57，落在圆肩上）、**最宽处在 r = 1, y = 0**；
   *   · 球形态切片的**上孔高得多**（端部内凹后 y ≈ 0.874）、下孔对称，腰部仍是 r = 1
   *     ⇒ 轮廓是「鼓腹 + 上下收口」⇒ 就是「外场边界从苹果变到球形（环状）」。
   *
   * 交点 = **同一根锥壁** `wallR(y) = (y − apexY)·tan θ` 与子午线求交（二分 90 步）。
   */
  /**
   * ## 球形态的「端部向内凹陷」—— 老师 2026-10-08（本轮）
   *
   * 老师原话：
   *   「并且 **anu 接近球形的时候，上孔下孔处的丝也是向内向球形场重心凹陷交接在锥面上**，
   *     结构**有些像圆环**」
   *
   * ### 问题（第一版的球面切片长什么样）
   *   第一版 `sphereProfile` 直接取「**单位正球**被同一根锥管切出的那段大圆弧」。
   *   锥半角越小、锥管越细，它与球面的交点就越**贴近两极**：
   *     f = 1.0（锥角 2.95°）⇒ 上孔 y ≈ 0.988（几乎顶到极点）
   *     f = 0.1（锥角 0.295°）⇒ 上孔 y ≈ 0.988（仍是极点附近）
   *   于是球形态看起来是一个**顶/底被切平的球**（一个半径 0.14 的平口），
   *   丝的走向在孔附近**顺着球面外凸**，没有「向球心收进去」的动作 ⇒ 不像环。
   *
   * ### ✅ 修法：把球形态的**子午线**从「正圆」改成「**端部向内凹陷**的圆」
   *
   *      r(ψ) = cos ψ  −  SPH_INSET · |sin ψ|^q          (y = sin ψ，ψ = 球心角)
   *
   *   · ψ = 0（赤道）：r = 1，**逐位不变**（球形态的腰围仍是 1）；
   *   · |sin ψ|^q 在 q = 8 时**只在两端抬起来**（ψ = 40° 时 |sin|⁸ = 0.029，
   *     只削掉 3%；ψ = 60° 时 0.279）⇒ 中段**依然是球**，凹陷**集中在两端**；
   *   · 端部 r 被削 ⇒ 与锥壁的**交点自然下移**：
   *       f = 0.1 时上孔从 y ≈ 0.988 下移到 **y ≈ 0.874**（半径仍 ≈ 0.143，因为孔必须落在锥壁上），
   *       而同高度处纯球面的半径是 √(1−0.874²) = 0.486 ⇒ 丝在孔附近**向内收了 0.34**，
   *       视觉上就是老师要的「**向内向球形场重心凹陷**」。
   *   · 因为 r(ψ) 偶对称，**上下两端对称凹陷** ⇒ 球形态 = 「鼓腹 + 上下收口」⇒「**像圆环**」。
   *
   * ⚠️ 对**苹果态零回归**：`outerProfile` 是「苹果 ↔ 球面」的**逐点线性插值**，
   *   f = 1 时取纯苹果 ⇒ 这一改**完全不碰**老师已认可的爱心形态（有断言钉住）。
   */
  var SPH_INSET = 1.00;   /* 端部最大内收量（模型单位）—— r(π/2) = 0 − INSET = −1 ⇒ 曲线在极点附近穿轴，
                             但交点早在 |ψ| ≈ 55° 就出现，实际用到的段永远 r > 0。 */
  var SPH_Q = 8;          /* 凹陷的「局部性」：越大越只在两端动，中段越像正球 */

  /** 球形态子午线的半径（ψ = 球心角；y = sin ψ） */
  function sphArcR(psi) {
    var s = Math.abs(Math.sin(psi));
    return Math.cos(psi) - SPH_INSET * Math.pow(s, SPH_Q);
  }

  function sphereProfile(c, N) {
    var ta = tubeAnchor(c);
    function wallR(y) { return (y - ta.apexY) * ta.slope; }
    function F(y) { return sphArcR(Math.asin(clamp(y, -1, 1))) - wallR(y); }
    /* 上交点：y ∈ [0, 1]（y=0 时 r=1 > 锥壁；逼近 y=1 时 r → −INSET < 锥壁） */
    var lo = 0, hi = 1 - 1e-12, i, mid;
    for (i = 0; i < 90; i++) { mid = 0.5 * (lo + hi); if (F(mid) > 0) { lo = mid; } else { hi = mid; } }
    var yTop = 0.5 * (lo + hi);
    /* 下交点：y ∈ [−1, 0] */
    lo = -1 + 1e-12; hi = 0;
    for (i = 0; i < 90; i++) { mid = 0.5 * (lo + hi); if (F(mid) > 0) { hi = mid; } else { lo = mid; } }
    var yBot = 0.5 * (lo + hi);
    /* 沿曲线按**弧长**等距取 N 点。
       ⚠️ 旧版半径恒为 1 ⇒ 「弧长 ∝ ψ」可以等 ψ 取点；端部内凹后该性质失效，
          必须与 `appleProfile` 一样走 `resample2`（否则与苹果插值时点对不上）。 */
    var pT = Math.asin(clamp(yTop, -1, 1)), pB = Math.asin(clamp(yBot, -1, 1));
    var M = Math.max(400, Math.round(N) * 8), raw = [], psi;
    for (i = 0; i <= M; i++) {
      psi = pT + (pB - pT) * (i / M);
      raw.push([sphArcR(psi), Math.sin(psi)]);
    }
    /* ⚠️ 目标点数必须**如实**用调用者给的 N —— `meridianArms` 是用 `sphereProfile(c, 2)`
       只取「上孔 / 下孔两个端点」的；旧口径写 `Math.max(32, N)` 会把 2 抬成 32，
       于是它拿到的 `sp[1]` 是**离孔一个点**的位置 ⇒ 球面延长臂起点偏移
       ⇒ 下孔 C∞ 混合整体错位，f < 1 时折角直接飙到 130°+（2026-10-08 实测踩到）。 */
    return resample2(raw, Math.max(2, Math.round(N)));
  }

  /**
   * 外程子午线 = 苹果切片 ↔ 球面切片的逐点插值（老师第 ⑥ 条「两个按钮可以互换」）。
   * `fieldShape = 1` → 纯苹果（默认，逐点等于旧版）；`= 0` → 纯球面。
   * 两条切片都按弧长等距、都从「上孔」走到「下孔」⇒ 直接线性混合即可，无跳变、无重排。
   */
  function outerProfile(c) {
    var apple = appleProfile(c);
    var f = clamp(c.fieldShape == null ? 1 : +c.fieldShape, 0, 1);
    if (!(f < 1 - 1e-9)) { return apple; }
    var N = apple.length;
    var sph = sphereProfile(c, N);
    var out = new Array(N), i;
    for (i = 0; i < N; i++) {
      out[i] = [
        sph[i][0] * (1 - f) + apple[i][0] * f,
        sph[i][1] * (1 - f) + apple[i][1] * f
      ];
    }
    return out;
  }

  /**
   * ## 「当前外场子午线」的上/下孔（**随 fieldShape 变**）
   *
   * 🔴🔴 2026-10-08 老师（本轮 bug 报告）：
   *   > 「外场形态这个可调滑条，在向左右移动的过程中，**上孔和下孔会出现弹簧断层**」
   *
   * ### 根因（实测，见 `_scratch/_diag_field.js`）
   *   `orbitPlane()` 里两条腿**各用各的孔**：
   *     · 内程（贴锥壁）用 `coneHoles(c)` —— 那是**苹果专属**的孔（上 0.1364@0.5693）
   *     · 外程（贴外场）用 `prof[0]`/`prof[N−1]` —— 那是**当前 fieldShape** 的端点
   *   而 `coneAt(q) = [hz.topR − k·q/sc, yA − q/sc]` 把「苹果孔的 r」和「当前外场的 y」
   *   拼在了一条直线上 ⇒ 当 fieldShape ≠ 1 时这条线**整条平移**离开锥壁：
   *       f = 0（纯球面）：上孔错位 **0.419**、下孔错位 **0.261**，孔处折角 **157°/115°**
   *       f = 0.5         ：错位 0.209 / 0.130，折角 **148°/115°**
   *       f = 1           ：错位 0、折角 6.0°/7.8°（✅ 这就是老师认可的现状）
   *   同时 `meridianArms()` 给的是**苹果**子午线的延长臂，于是上孔附近被往
   *   爱心的「顶中凹口」方向拽 ⇒ 老师看到的「球面圈的上孔像爱心一样向内凹陷」。
   *
   * ### ✅ 修法：孔只能有一处定义 —— **外场子午线的两个端点**
   *   取 `outerProfile(c)` 的首尾点即可，因为：
   *   · 锥壁是一条**直线** `r = (y − apexY)·k`；
   *   · 苹果孔与球面孔**各自**都精确落在这条直线上（由 `coneHoles` / `sphereProfile`
   *     的求交构造保证）；
   *   · 而 `outerProfile` 是两者的**逐点线性插值**，直线的插值仍在直线上
   *     ⇒ `lerp(球面孔, 苹果孔)` **必然**落在锥壁上（实测偏差 0）。
   *   于是「孔」同时属于外场子午线与锥壁 ⇒ 两程在孔处**同点**，
   *   剩下的转角交给既有的 C∞ 混合窗口（`flatStep`）抹平，整条轨道成为**一条**曲线。
   */
  function fieldHoles(c) {
    var prof = outerProfile(c), N = prof.length, ta = tubeAnchor(c);
    return {
      topR: prof[0][0], topY: prof[0][1],
      botR: prof[N - 1][0], botY: prof[N - 1][1],
      mouthY: ta.mouthY, mouthR: ta.mouthR, apexY: ta.apexY, slope: ta.slope,
      lobeY: yLobe(c)
    };
  }

  /** 纵向居中偏移（让整个形体的 y 大致对称于原点，取景方便） */  function yShiftFor(prof) {
    var lo = Infinity, hi = -Infinity, i;
    for (i = 0; i < prof.length; i++) {
      if (prof[i][1] < lo) { lo = prof[i][1]; }
      if (prof[i][1] > hi) { hi = prof[i][1]; }
    }
    return -(lo + hi) * 0.5;
  }

  /**
   * 内程半径内收系数 —— **回退方案**：仅当 coneRim = false 时使用。
   * 现行方案（coneRim = true）下内程直接取**锥壁半径** `wallAt(y)`（贴着绿色直锥缠绕），
   * 不再按外程比例缩小，故本函数不参与装配。
   * 两端 sin(0)=sin(π)=0 → 自动归零，保证曲线首尾相接。
   */
  function innerScale(u, c) {
    return 1 - c.gapRel * Math.pow(Math.sin(Math.PI * u), c.innerPow);
  }

  /* ------------------------------------------------ 苹果壳的「外壁 / 内壁」 */
  /**
   * **两端平滑窗口** win(u) ∈ [0,1]：
   *   u ≤ shellRamp 或 u ≥ 1 − shellRamp 时用 smoothstep 归零，中段恒为 1。
   * 它是「内外壁分层」能被安全引入的关键 —— 因为偏移量在**上/下孔处恰好为 0**，
   * 于是丝仍旧精确落在孔上，曲线保持闭合（不需要任何额外过渡段）。
   * smoothstep 两端导数为 0 ⇒ 与「不分层的孔区」共切线，不会出现折角。
   * @param {number} u 子午线弧长参数 ∈ [0,1]
   * @param {object} c 配置（用 shellRamp）
   */
  function shellWin(u, c) {
    var R = +c.shellRamp;
    if (!(R > 0)) { return 1; }                 /* 设 0 ⇒ 关闭窗口（偏移全程恒定，仅作对照） */
    if (R > 0.5) { R = 0.5; }
    var a = clamp(u / R, 0, 1), b = clamp((1 - u) / R, 0, 1);
    return (a * a * (3 - 2 * a)) * (b * b * (3 - 2 * b));
  }

  /**
   * **「参考壳」厚度** = 2·coilRThick（默认 0.072）。
   * 老师红线描出的苹果轮廓 = 参考壳的**外壁**；参考壳的内壁在它往里 2·coilRThick 处
   * —— 那一层恰好容下 3 根粗丝（每根直径 2·coilRThick）。
   */
  function shellGapRef(c) { return 2 * Math.max(0, +c.coilRThick || 0); }

  /**
   * 壳的**中性面**（mid-surface）相对子午线 `prof` 的径向偏移 = −coilRThick
   * （恒为负、且**与 shellGap 无关**）。
   *
   * 🔴 2026-10-08 老师：「苹果壳厚（外壁−内壁）调过后**为何粗丝不动**，仅仅是细丝向内收敛了？
   *    **需要双丝同步都动，一个外膨，一个内敛**。」
   *    根因：旧口径把 **外壁钉在 prof 上**，内壁 = prof − shellGap ⇒ 改壳厚只有细丝在动。
   *    修法：把**中性面**钉住（= 参考壳的中线 = prof − coilRThick），两壁关于它对称张开：
   *        外壁 = mid + shellGap/2 ⇒ 粗丝随壳厚**外膨** +Δ/2
   *        内壁 = mid − shellGap/2 ⇒ 细丝随壳厚**内敛** −Δ/2
   *    且 shellGap = 参考壳厚（0.072）时两壁恰好回到 prof / prof−0.072
   *    ⇒ **默认外观与旧版逐点相同**（见 probe_heart §5e 的『回落口径』断言）。
   *
   * 🔴 2026-10-08 再裁定后：`shellGap` 已成**常量** 0.072 ⇒ 本函数返回常量 −coilRThick；
   *    两族「张开」的活现在由 `wireSpread` 单独干（见 `radOffsets`；两者本是同一个旋钮）。
   */
  function shellMidOff(c) { return shellGapRef(c) / 2; }

  /**
   * 把 `surfaceTangent` 归一成三态字符串：'off' | 'shell' | 'both'。
   * 兼容旧写法：true ⇒ 'both'，false ⇒ 'off'，缺省 ⇒ 'shell'。
   */
  function tangentMode(c) {
    var v = c.surfaceTangent;
    if (v === false) { return 'off'; }
    if (v === true || v == null) { return 'shell'; }
    return (v === 'both' || v === 'off') ? v : 'shell';
  }

  /**
   * 第 j 根丝在**两程**上的径向偏移（相对**子午线 prof**；向内为负、向外为正）。
   *
   *  🔴 老师 2026-10-07 规范：「3 根粗的**外程**弹簧边在与苹果**外壁**表面相接，
   *     7 根细螺旋弹簧在与苹果**内壁**表面相接；**内程**时，粗细都与直锥**外壁**相接切」。
   *
   *   外程（上行；弹簧外缘顶住各自那面壁 ⇒ 中心线从壁面再内收一个弹簧半径）
   *       粗丝 out = +(shellGap/2 − coilRThick) − coilRThick   ⇒ 外缘 ≡ **外壁**
   *       细丝 out = −(shellGap/2 + coilRThick) − coilR        ⇒ 外缘 ≡ **内壁**
   *       （`surfaceTangent = 'off'` 时不再内收弹簧半径 ⇒ 中心线落在壁面上，**但分层仍在**）
   *
   *   内程（下行）
   *       粗细都 in = 0                       （'shell'：中心线即在锥壁上，粗细同贴一面）
   *       'both' ⇒ in = +coilR_k              （弹簧内缘顶住锥外壁）
   *
   *  🔴 2026-10-08 老师追加：**改壳厚时两族必须同步动**（粗丝外膨 / 细丝内敛）——
   *     上式的 d(out)/d(shellGap) 分别是 **+½（粗）** 与 **−½（细）**，正是老师要的对称。
   *
   *  🔴🔴 2026-10-08 老师再裁定（**合并**）：`shellGap` 与 `wireSpread` **功能重复** ——
   *     两式对 `layer` 的导数**完全相同**（粗 +½ / 细 −½）⇒ 数学上是同一个旋钮。
   *     ⇒ 「苹果壳厚」滑块删除，`shellGap` 固定为参考壳厚 0.072
   *       （两层恰好**相切不重叠**；不变量：中心距 = shellGap − coilRThick + coilR，
   *        相切要求 shellGap = 2·coilRThick）；两族开合**只**由 `wireSpread` 驱动。
   *
   * @returns {{out:number, in:number, thick:boolean, coil:number, mode:string, half:number, mid:number, spread:number}}
   */
  function radOffsets(c, j) {
    var isThick = j < c.thick;
    var coil = isThick ? c.coilRThick : c.coilR;
    var mode = tangentMode(c);
    var mid = shellMidOff(c);                       /* 中性面内收量（= coilRThick） */
    var half = Math.max(0, +c.shellGap || 0) / 2;   /* 两壁各离中性面一半壳厚（常量 0.036） */
    var layer = isThick ? (half - mid) : (-half - mid);
    /* 🔴 第 ⑥ 条「双丝在外程更远离苹果壁」：壁面**不动**，只把两族相对拉开
         粗丝再外膨 +Δ/2、细丝再内敛 −Δ/2（Δ = wireSpread）。
       ⚠️ 原「苹果壳厚」滑块动的是**同一个量**（`half - mid` 那条），已合并进本项。 */
    var spread = Math.max(0, +c.wireSpread || 0);
    layer += isThick ? (spread / 2) : (-spread / 2);
    return {
      out: layer - ((mode === 'off') ? 0 : coil),
      in: (mode === 'both') ? coil : 0,
      thick: isThick, coil: coil, mode: mode, half: half, mid: mid, spread: spread
    };
  }

  /**
   * 苹果**外壁 / 内壁**半径（供自检、参考线、HUD 用）。
   * 两壁关于中性面（prof − coilRThick）对称张开，两端同样用 shellWin 归零
   * ⇒ 在 u=0/1（上/下孔）处两壁重合于 prof − coilRThick·win。
   */
  function wallR(u, prof, c, which) {
    var mid = shellMidOff(c), half = Math.max(0, +c.shellGap || 0) / 2;
    var off = (which === 'in') ? (-half - mid) : (half - mid);
    var i = Math.max(0, Math.min(prof.length - 1, Math.round(u * (prof.length - 1))));
    return Math.max(0, prof[i][0] + off * shellWin(u, c));
  }
  function innerWallR(u, prof, c) { return wallR(u, prof, c, 'in'); }
  function outerWallR(u, prof, c) { return wallR(u, prof, c, 'out'); }

  /* ---------------------------------------------------------- whorl 宏观路径 */
  /**
   * 第 j 根丝在参数 u 处的**方位角相位**（弧度）—— 全模块唯一的相位来源。
   *
   * 🔴 2026-10-08 老师：「**两族的动力学公式是一样的**，为何计算结果不一样？
   *    **两族就是旋转了 180 度。**」⇒ 这里只有**一个**方程、**一个** ω：
   *
   *        内程（下行 u: 0→1）   φ_j(u) = φ_j0 + ω · TAU · u
   *        外程（上行 u: 1→0）   φ_j(u) = φ_j0 + ω · TAU + ρ · ω · TAU · (1 − u)
   *
   *      · ω    = turnsPerLeg                 —— **唯一**的动力学参数（默认 2.5 圈/程）
   *      · ρ    = returnReverse ? −1 : +1     —— 外程方向，**两族共用**（默认 +1 同向）
   *      · φ_j0 = TAU·j/n                     —— 唯一的族间差异：初始相位（36° 均分）
   *
   *    粗 / 细的差别**只在几何半径**（`coilRThick` vs `coilR`、外壁 vs 内壁），**不在动力学**。
   *
   *    ⟹ **对称性（直接推论，不是调出来的）**：
   *       `φ_{j+5,0} − φ_{j,0} = π` ⇒ 第 j+5 根的整条路径 = 第 j 根**绕中轴旋转 180°**。
   *       于是「3 粗（j = 0,1,2）的 180° 对面恰是 7 细（j = 5,6,7）」自动成立；
   *       整个 10 丝阵列（36° 均分、偶数条）旋转 180° 后**与原阵列重合**。
   *       自检里逐点验证该旋转对（偏差 < 1e-13）。
   *
   * @returns {number} 弧度
   */
  function whorlPhase(j, n, c, u, up) {
    /* 🔴 「anu 镜像」= 整体 φ → −φ（等价 z → −z 的镜面反射）。
       放在**最后**统一乘，是为了让「镜像」成为一个**与几何完全正交**的操作：
       同一 φ 下的 r / y 不动 ⇒ 镜像后仍落在同一组孔、同一条闭轨道上。 */
    var ms = mirrorSign(c);
    var w = (c.turnsPerLeg || 0) * TAU;              /* 唯一的动力学参数 ω（10 丝共用） */
    var ph0 = TAU * j / Math.max(1, n);              /* 唯一的族间差异：初始相位 */
    if (!up) { return ms * (ph0 + w * u); }
    var rho = (c.returnReverse === true) ? -1 : 1;   /* 外程方向，两族共用（默认 +1 同向） */
    return ms * (ph0 + w + rho * w * (1 - u));
  }

  /**
   * **镜像符号**：`mirror = true` ⇒ −1（φ 取反），否则 +1。
   * 单独抽成函数是因为「极性判定」也要用它（见 `polarityOf`），
   * 两处必须读**同一个**来源，不能各写一份 `c.mirror ? -1 : 1`。
   */
  function mirrorSign(c) { return (c && c.mirror) ? -1 : 1; }

  /**
   * **磁荷极性**（老师 2026-10-08 的定义，本模块只做记账、不做物理判断）。
   *
   *        俯视（从 +y 向下看）内程 =「沿着直锥下旋」那一程的绕行方向
   *          顺时针（clockwise）  ⇒  'negative'  负磁荷
   *          逆时针（counter-CW） ⇒  'positive'  正磁荷
   *
   * 为什么默认（`mirror = false`）是 **negative**：
   *   · 内程 `u: 0→1`（上孔 → 下孔，y 单调下降）的方位角是 `φ = φ_j0 + ω·u`，
   *     ω = `turnsPerLeg` > 0 ⇒ **下旋时 φ 递增**；
   *   · 世界系 (x, y, z) 右手，丝的点 = `(r·cos φ, y, r·sin φ)`：
   *     φ 递增 = `+x → +z` 方向；而绕 **+y** 的**右手正转**是 `+x → −z`
   *     （`R_y(θ)·x̂ = (cosθ, 0, −sinθ)`）⇒ 本参数化是绕 +y 的**负转**；
   *   · 绕 +y 的正转 = 俯视（自 +y 向下看）**逆时针**（右手定则：拇指 +y、四指从上往下看逆时针旋）
   *     ⇒ 负转 = 俯视**顺时针** ⇒ 默认落在 **negative 负磁荷**。
   *   · 这正是 `_scratch/_probe_mirror.js` 里用**真实相机基**投影算出的带符号绕向
   *     （`sgn < 0` = 屏幕顺时针），逐点复核过，不是纸上推的。
   *
   * 镜像（φ → −φ）后一切反转 ⇒ 俯视逆时针 ⇒ **positive 正磁荷**。
   */
  function polarityOf(c) { return mirrorSign(c) > 0 ? 'negative' : 'positive'; }

  /**
   * 子午线的**「下行分支」半径查表**：给定高度 y（未平移），返回苹果壳半径。
   *
   * 🔴 2026-10-08 老师（配红圈截图）：「**上孔往上的直锥不应该有螺旋缠绕，
   *    内程螺旋只从上孔到下孔**」＋「你应改**直接从外程过渡到直锥的上孔往下孔走**」。
   *
   *    根因：**子午线在顶部不是 y 单调的** —— 它从 i=0（上孔，y=0.56934）往上爬到
   *    i=29（圆肩最高处 y=0.69300），之后才一路下行。实测（`_scratch/_dump_cone_top.js`）：
   *         上孔 y = 0.85228（平移后）／ 圆肩最高 y = 0.97594  ⇒ 高出 **0.12366**
   *    而旧内程是拿 `prof[i]` 的 **y** 配 `wallAt(y)` 的 **r**，于是**贴着锥壁
   *    从"上孔"一路往上爬到锥口** —— 那正是红圈里那段多余的螺旋。
   *
   *    修法：内程改用**沿 y 单调下行**（上孔 → 下孔），不再跟着子午线的索引跑。
   *    ⚠️ 2026-10-08 深夜起本函数**已退出主装配路径**：触底翻转改由 `orbitPlane` 的
   *    C∞ 混合（`joinSoft`）负责（旧 `flipSoft` 就是拿本函数的返回值当目标，
   *    而它在低处返回的是椭圆底**外翼** ≈ 0.63 ⇒ 把内程半径吹到 0.214，见 §8.10）。
   *    保留导出供自检 / 回退口径 `coneRim = false` 使用 —— 只在 y 单调递减段（iApex..N−1）里二分。
   */
  function shellRAtY(prof, iApex, y) {
    var N = prof.length;
    if (y >= prof[iApex][1]) { return prof[iApex][0]; }
    if (y <= prof[N - 1][1]) { return prof[N - 1][0]; }
    var lo = iApex, hi = N - 1, mid;
    while (hi - lo > 1) {
      mid = (lo + hi) >> 1;
      if (prof[mid][1] >= y) { lo = mid; } else { hi = mid; }
    }
    var y0 = prof[lo][1], y1 = prof[hi][1];
    var f = (Math.abs(y1 - y0) < 1e-12) ? 0 : (y - y0) / (y1 - y0);
    return prof[lo][0] + (prof[hi][0] - prof[lo][0]) * f;
  }

  /** 子午线上 y 最大处的下标（圆肩最高点）—— shellRAtY 的查表起点 */
  function apexIndexOf(prof) {
    var a = 0, i;
    for (i = 1; i < prof.length; i++) { if (prof[i][1] > prof[a][1]) { a = i; } }
    return a;
  }

  /* ==================================================== C∞ 接头：一条闭轨道 */
  /**
   * **两端都平坦的 C∞ 台阶函数**（Schwartz 型）。
   *
   *         s(x) = 0                                   x ≤ 0
   *         s(x) = 1 / (1 + e^{(1−2x)/(x(1−x))})        0 < x < 1
   *         s(x) = 1                                   x ≥ 1
   *
   * 🔴🔴 2026-10-08 老师：「外程和内程的粗丝和细丝应该是能各自整合成一类型动力学
   *    混沌吸引子公式」「**要 C⁰ 到 C∞ 都不能有折角**」「不要求接口处严格贴合曲面或锥面，
   *    要保证丝滑」。
   *
   * 为什么不能用 smoothstep（3x²−2x³）：
   *   smoothstep 只保证**一阶**导数为 0（C¹），二阶导数在两端是 ∓6 ≠ 0 ⇒ **曲率在接缝处跳变**，
   *   肉眼看就是「接缝处一道毛刺」。老师要的是任意阶都连续，所以必须用**平坦函数**：
   *   本函数（以及它的每一阶导数）在 x = 0 与 x = 1 处**全部等于 0** ⇒ 混合出来的曲线
   *   在接缝处与两侧基座**任意阶全同**（C∞），不只是切线连续。
   *
   * 数值：指数用 ±709 夹紧（e^709 已是 double 上限附近），夹紧点取 0/1 —— 与极限一致，不破坏 C∞。
   */
  function flatStep(x) {
    if (!(x > 0)) { return 0; }
    if (x >= 1) { return 1; }
    var e = (1 - 2 * x) / (x * (1 - x));
    if (e > 709) { return 0; }
    if (e < -709) { return 1; }
    return 1 / (1 + Math.exp(e));
  }

  /** 二维折线 → 「弧长 → 点」查表（等间距三角形分布，线性插值；步长足够小 ⇒ 偏差 < 1e-9） */
  function arcTable(pts) {
    var cum = [0], i, L = 0;
    for (i = 1; i < pts.length; i++) {
      L += Math.sqrt(Math.pow(pts[i][0] - pts[i - 1][0], 2) +
                     Math.pow(pts[i][1] - pts[i - 1][1], 2));
      cum.push(L);
    }
    return { pts: pts, cum: cum, L: L };
  }

  /** 查表：弧长 q 处的点（q 超出范围时钳到两端） */
  function arcAt(tab, q) {
    var cum = tab.cum, lo = 0, hi = cum.length - 1, mid;
    if (!(q > 0)) { return [tab.pts[0][0], tab.pts[0][1]]; }
    if (q >= tab.L) { return [tab.pts[hi][0], tab.pts[hi][1]]; }
    while (hi - lo > 1) {
      mid = (lo + hi) >> 1;
      if (cum[mid] <= q) { lo = mid; } else { hi = mid; }
    }
    var f = (q - cum[lo]) / Math.max(1e-12, cum[hi] - cum[lo]);
    return [tab.pts[lo][0] + (tab.pts[hi][0] - tab.pts[lo][0]) * f,
            tab.pts[lo][1] + (tab.pts[hi][1] - tab.pts[lo][1]) * f];
  }

  /**
   * 子午线的两条**自然延长线**（C∞ 混合所必需的「入程基座延长」）：
   *
   *   armTop : 从**上孔**继续往**凹口 cusp** 方向走（θ: θ_t → θ_c）
   *            —— 上孔接头的入程是外程（子午线），它走到孔之后本该继续朝 cusp 去。
   *            实测可用弧长 **0.21974**（到 cusp 为止，再往前 r 就到 0 了）。
   *   armBot : 从**下孔**继续往**底尖**方向走（φ: φ_b → π/2）
   *            —— 下孔接头的入程是内程（锥壁），但锥壁的延长是直线（另算），
   *               这一支只用于「回退口径 coneRim=false」与自检对照。
   *            实测可用弧长 **0.04223**。
   *
   * 两支都按**子午面 (r, y) 弧长**参数化（y 已乘 aspect），与 `joinSoft` 同一量纲。
   */
  function meridianArms(c, a2, a3) {
    /* 兼容旧签名 `meridianArms(c, hz, M)`：第二个参数是数字就是 M */
    var M = Math.max(64, (typeof a2 === 'number' ? a2 : a3) || 1200);
    var f = clamp(c.fieldShape == null ? 1 : +c.fieldShape, 0, 1);
    var i, PHE = Math.PI / 2 + ARM_OVERSHOOT;

    /* ---------- A. 苹果臂（解析；与旧版逐字相同，孔取**苹果**的） ---------- */
    var hA = coneHoles(c);
    var t0 = tForR(hA.topR, c), aA = [], bA = [], p, q, ph;
    for (i = 0; i <= M; i++) {            /* 上孔 → cusp：t 从 t0 降到 0 */
      p = heartRT(t0 * (1 - i / M), c);
      aA.push([p[0], p[1] * c.aspect]);
    }
    /* 🔴 下孔 → **越过底尖**：φ 从 φ_b 升到 π/2 + ARM_OVERSHOOT。
       老师 2026-10-08 深夜：「**丝在孔处不需要严格贴合相接到曲面或锥面**，
       否则我估计难以生成一条动力学方程的曲线」
       ⇒ 延长线**不必留在实体表面上**，可照椭圆解析式越过底尖继续走
       （越过底尖后 cos φ < 0 ⇒ r 转负，是椭圆曲线的自然延续，不是巧合）。
       这条延长是「下孔接头用**对称**混合窗口」的前提：不延长则只剩 0.04223 可用，
       窗口被夹到 ±0.04 ⇒ 96° 的转角挤在极短弧长里，仍然是一眼可见的折角。 */
    for (i = 0; i <= M; i++) {
      ph = hA.botAngle + (PHE - hA.botAngle) * (i / M);
      q = bottomRT(ph, c);
      bA.push([q[0], q[1] * c.aspect]);
    }
    if (f >= 1 - 1e-9) { return { top: arcTable(aA), bot: arcTable(bA) }; }

    /* ---------- B. 球面臂（解析：沿**球形态子午线**越过上下孔继续走） ----------
       ⚠️ 这是修掉「球面圈的上孔向内凹陷」的关键：旧版无论 fieldShape 取多少，
          都拿**苹果臂**（往爱心顶中的凹口去）当延长线 ⇒ 球面孔附近被往内拽。
          现在球面有自己的延长臂：继续沿球形态子午线往上/往下走过极点。
       ⚠️ 必须与 `sphereProfile` 用**同一条曲线** `sphArcR()`：旧版这里写死 `Math.cos`
          （正圆），端部内凹后就会与主曲线对不上 ⇒ 孔处又冒出折角。 */
    var sp = sphereProfile(c, 2);
    var pT = Math.asin(clamp(sp[0][1], -1, 1));      /* 上孔圆心角 ψ_T */
    var pB = Math.asin(clamp(sp[1][1], -1, 1));      /* 下孔圆心角 ψ_B */
    var aS = [], bS = [], ps, qs;
    for (i = 0; i <= M; i++) { ps = pT + (PHE - pT) * (i / M); aS.push([sphArcR(ps), Math.sin(ps)]); }
    var NSO = -PHE;
    for (i = 0; i <= M; i++) { qs = pB + (NSO - pB) * (i / M); bS.push([sphArcR(qs), Math.sin(qs)]); }
    if (f <= 1e-9) { return { top: arcTable(aS), bot: arcTable(bS) }; }

    /* ---------- C. 逐点插值（与 `outerProfile` **同一套**权重，保证端点 = 外场孔） ----------
       🔴 2026-10-08 第二次修订 —— 修「球形态上孔 13° 折角」：
       旧口径按**下标**逐点混合，而两支臂的长度差很多（球面臂在 f→0.1 时长 1.56，
       苹果臂只有 0.22），`arcAt()` 又是按**各自弧长**重参数化的 ⇒ 混合后臂的**单位切向**
       被长的那支主导：f = 0.9 时球面臂贡献了 74% 的切向权重（名义上只该 10%）
       ⇒ 臂在孔处被拽成「几乎水平向内」，与「越过唇顶到达上孔」的来向差 13°（实测）。
       现在改成：**两支臂各自等弧长重采样到一个共同总长 L\*** 之后再逐点混合
       ⇒ 切向权重严格 (1−f) : f；两端点仍是各自的孔 ⇒ 混合点 = 外场孔（零回归不变）。 */
    function mixArm(ap, spArr) {
      var tA = arcTable(ap), tS = arcTable(spArr);
      var Ls = (1 - f) * tS.L + f * tA.L;      /* 共同总长（f=0/1 时退化为纯球面/纯苹果） */
      var n = ap.length, out = new Array(n), j, q2, P2, Q2;
      for (j = 0; j < n; j++) {
        q2 = Ls * (j / (n - 1));
        P2 = arcAt(tA, q2);                     /* 超出苹果臂长度 ⇒ arcAt 自动钳到 cusp 端 */
        Q2 = arcAt(tS, q2);
        out[j] = [(1 - f) * Q2[0] + f * P2[0],
                  (1 - f) * Q2[1] + f * P2[1]];
      }
      return out;
    }
    return { top: arcTable(mixArm(aA, aS)), bot: arcTable(mixArm(bA, bS)) };
  }

  /**
   * 锥壁直线的**弧长参数解析式**：从孔点 (holeR, holeY) 沿锥壁走弧长 q。
   * 方向由 `down` 决定（down = 沿「下行」方向，即 y 减小、r 也减小）。
   * 锥壁斜率 k = tan(半角) 很小 ⇒ 单位弧长里 dy ≈ ∓1、dr ≈ ∓k。
   */
  function coneLineAt(holeR, holeY, k, q, down) {
    var s = 1 / Math.sqrt(1 + k * k), dy = s * q, dr = k * s * q;
    return down ? [holeR - dr, holeY - dy] : [holeR + dr, holeY + dy];
  }

  /**
   * ## 单一闭合轨道（子午面）—— 两程 = 同一条轨道的两半，两个接头 C∞ 混合
   *
   * 🔴🔴 2026-10-08 老师（本轮核心）：
   *   > 「这个**外程和内程**的粗丝和细丝应该是能**各自整合成一类型动力学混沌吸引子公式**，
   *   >   目前明显**上孔和下孔对接不似滑**，一看就知道外程和内程像是对应**两个公式**」
   *   > 「**要 C⁰ 到 C∞ 都不能有折角**」
   *   > 「**不要求接口处严格贴合曲面或锥面，要保证丝滑**」
   *
   * ### 诊断（旧口径，`_scratch/_diag_join.js`）
   *   两程**中段**本来就顺：方向突变角中位 3.50°、P90 4.35°；
   *   但接头处 —— **上孔 33.12°、下孔 158.67°**。是**真折角**，不是采样问题。
   *   而 158.67° 里还叠着旧 `flipSoft` 的一个 bug（`_scratch/_diag_balloon.js`）：
   *   它把内程半径在最后 8% 里从 0.045 **吹到 0.21440**（u=0.973）再缩回 0.04221 ——
   *   因为 `shellRAtY` 在该高度返回的是椭圆底**外翼**（0.6325），根本不是「翻转」该去的地方。
   *
   * ### 为什么「拼 + 圆角」永远做不到 C∞
   *   两条基座曲线在孔处**横截相交**（下孔夹角 ≈ 96°、上孔 ≈ 33°）。
   *   只要曲线在某处是「A 段 + B 段**拼**起来」，切线就会跳。
   *   用三次 Bézier / 圆弧补一个圆角，最多把接缝做到 **G¹（切线连续）**；
   *   曲率仍会跳 —— 而老师要的是**任意阶都不跳**。
   *
   * ### ✅ 正确做法：不拼，**混**（2026-10-08 深夜改成**以孔为中心、双侧对称**）
   *   设 τ = **以孔为原点的有向弧长**（τ<0 = 入程侧、τ>0 = 出程侧），取
   *
   *        P(τ) = (1 − χ(τ)) · A(τ)  +  χ(τ) · B(τ),     χ = flatStep((τ+Q)/(2Q))
   *
   *        A = **入程基座**（及其延长：走到孔之后它本该继续去哪）
   *        B = **出程基座**（及其延长：走到孔之前它本来在哪）
   *        χ = 两端**所有阶导数都是 0** 的 C∞ 台阶
   *
   *   · τ = −Q：χ 及其各阶导数全为 0 ⇒ P 与 A **任意阶全同** ⇒ 与**入程 C∞ 相接**；
   *   · τ = +Q：χ ≡ 1 且各阶导数为 0 ⇒ P 与 B **任意阶全同** ⇒ 与**出程 C∞ 相接**；
   *   · τ = 0 ：A(0) = B(0) = 孔点 ⇒ **P(0) 恒等于孔点，与 χ 无关**（孔仍被精确穿过）；
   *   · |τ| < Q：A、B、χ 都 C∞ ⇒ P 也 C∞。
   *   ⟹ **整条闭轨道处处 C∞**（而不是「除两个接头以外」）。
   *
   *   🔴 为什么必须**对称**：只压出程一侧时，入程那一侧的切向原封不动带到孔上，
   *      孔处仍是「丁」字直角。对称后孔两侧**各摊一半**转角 ⇒ 最大折角降到 1/2~1/4，
   *      且孔附近的「下探」从 0.0405 缩到 0.0122（见 `_scratch/_probe_join.js`）。
   *
   * ### 两个接头的入/出与「延长线」
   *   轨道的行进顺序是：**上孔 → 内程（锥壁）下行 → 下孔 → 外程（子午线）上行 → 上孔**。
   *
   *   | 接头 | 入程（A） | 出程（B） | A 的延长 | B 的延长 | 可用弧长 |
   *   |---|---|---|---|---|---|
   *   | **上孔** | 外程 = 子午线 | 内程 = 锥壁 | 子午线往 **cusp** 走 | 锥壁反向（孔以上） | 0.21974 |
   *   | **下孔** | 内程 = 锥壁 | 外程 = 子午线 | 锥壁继续往下（到 apex） | 子午线往 **底尖**走 | **0.60**（越过底尖解析延长）|
   *
   *   ⇒ 窗口 `Q = joinSoft` 在两个接头处都按 `min(Q, 0.96·臂长, 0.45×程长)` **自动夹紧**。
   *   ⇒ ⚠️ 下孔那一侧**原本只有 0.04223 可用**（子午线到孔底尖就没了），窗口被夹到 ±0.04，
   *      96° 的转角挤在极短弧长里 ⇒ 折角仍有 36°。现按**椭圆解析式越过底尖**继续延长，
   *      可用弧长 ~0.6 ⇒ 对称窗口才做得长（老师已明确允许：孔处不必严格贴合曲面/锥面）。
   *   ⇒ 混合窗口落在「出程的头一段」：上孔的窗口落在**内程开头**、
   *     下孔的窗口落在**外程开头** —— 这正是老师说的「从外程过渡到下孔、再走外程回来」。
   *
   * ### 代价（老师已明确接受）
   *   接头附近曲线**不再严格落在锥壁 / 子午线上**，而是在 Q 尺度内平滑过渡。
   *   实测（`_scratch/_probe_join.js`）：内程中段偏离 = **0**、外程中段偏离 = **0**；
   *   只有窗口内偏离，量级 = 0.01~0.05（与弹簧半径 0.018~0.036 同量级）。
   *
   * @returns {Array<[number, number]>} 长度 2N−1 的 (r, y) 序列（**y 未平移**），首尾同为上孔
   */
  function orbitPlane(j, n, c, prof) {
    var N = prof.length;
    /* 🔴🔴 2026-10-08 老师 bug：「外场形态滑条一动，上孔/下孔出现弹簧断层」。
       根因是这里原本用 `coneHoles(c)`（**苹果专属**的孔），却和外程的
       `prof[0]`/`prof[N−1]`（**当前外场**的端点）混用 ⇒ fieldShape≠1 时整条锥壁线被平移开
       （f=0 时上孔错位 0.419、下孔 0.261，折角 157°/115°）。
       现在改成 `fieldHoles(c)` = **当前外场子午线的两个端点**，它与锥壁的交点
       由「直线插值仍在直线上」保证 ⇒ 两程在孔处严格同点，见 `fieldHoles()` 的注释。 */
    var hz = fieldHoles(c);
    var onCone = (c.coneRim !== false);
    var off = radOffsets(c, j);
    var k = hz.slope, sc = Math.sqrt(1 + k * k);        /* 锥壁：弧长 = sc·|Δy| */
    var yA = prof[0][1], yB = prof[N - 1][1];           /* 上孔 / 下孔（未平移） */
    var lenIn = Math.abs(yB - yA) * sc;                 /* 内程沿锥壁的弧长 */
    /* ⚠️ 不能用模块里的 `arcLength()` —— 它读 `pts[i][2]`（三维），而 prof 是二维 [r,y]，
       会得到 **NaN**（2026-10-08 踩过：整个混合窗口因此静默失效，下孔留 96° 折角）。
       这里直接用二维弧长表，顺便拿到「prof[i] 到底端」的精确弧长（比 i·h 更准）。 */
    var pt = arcTable(prof);
    var arms = meridianArms(c, 1200);
    var Q = Math.max(0, +c.joinSoft || 0);
    /* 两个接头的**半窗**：窗口以孔为**中心**、两侧各 Q 长（全窗 2Q）。
       夹到 0.45 倍程长以内 ⇒ 两个窗口互不重叠，且窗口内一定还能查到基座延长线。 */
    var QT = Math.min(Q, arms.top.L * 0.96, lenIn * 0.45, pt.L * 0.45);
    var QB = Math.min(Q, arms.bot.L * 0.96, lenIn * 0.45, pt.L * 0.45);
    var iApex = apexIndexOf(prof);
    var orb = [], i, u, q, a, tau, win, ch, r, y, A, B, P;

    /** 锥壁直线：弧长 q 从**上孔**量起、**向下为正**（q 越界 ⇒ 解析延长；q<0 = 孔以上） */
    function coneAt(qq) { return [hz.topR - k * qq / sc, yA - qq / sc]; }
    /**
     * 🔴🔴 以孔为中心的**双侧对称** C∞ 混合（2026-10-08 深夜，老师第二次指正）。
     *
     * 老师原话：「丁 子图 爱心的**上孔和下孔**的红色曲线的画法，当初**画错了**，
     *   **你没有顺着蓝色外程的切线往前走**」——
     *   即：旧口径把窗口全压在**出程一侧**，于是入程一侧的切向**原封不动**地带到孔上，
     *   孔处两条腿仍以 96.27°（下孔）/ 33°（上孔）**横截相交**，一眼就是「丁字」。
     *
     * 现在 τ = 以孔为原点的**有向弧长**（τ<0 = 入程侧、τ>0 = 出程侧），窗口取 |τ| < Qh：
     *      P(τ) = (1 − χ)·A(τ) + χ·B(τ),     χ = flatStep((τ + Qh) / (2Qh))
     * · τ = −Qh：χ ≡ 0 且各阶导为 0 ⇒ P 与**入程基座 A 任意阶全同**（C∞ 接上入程）；
     * · τ = +Qh：χ ≡ 1 且各阶导为 0 ⇒ P 与**出程基座 B 任意阶全同**（C∞ 接上出程）；
     * · τ = 0  ：A(0) = B(0) = 孔点 ⇒ **P(0) 恒等于孔点**（与 χ 无关，孔仍被精确穿过），
     *           且 A、B、χ 都 C∞ ⇒ P 也 C∞；
     * · 孔两侧**各摊一半**转角 ⇒ 中段的最大折角约降到原来的 **1/2~1/3**（见 `_probe_join`）。
     */
    function mix(tau2, Qh, Ai, Bi) {
      ch = flatStep((tau2 + Qh) / (2 * Qh));
      return [(1 - ch) * Ai[0] + ch * Bi[0], (1 - ch) * Ai[1] + ch * Bi[1]];
    }

    /* ── 内程（下行）：基座 = 锥壁直线；两端各挂一个接头的混合窗口 ── */
    for (i = 0; i < N; i++) {
      u = i / (N - 1); win = shellWin(u, c);
      y = yA + (yB - yA) * u;                           /* y 严格单调下行、端点精确落在两孔上 */
      q = Math.abs(yA - y) * sc;                        /* 离上孔、沿锥壁的弧长 */
      if (onCone) {
        P = coneAt(q);
        if (QT > 0 && q < QT) {
          /* 上孔接头：入程 = 外程（子午线），其延长 = 朝 cusp 走（`arms.top`） */
          A = arcAt(arms.top, q); A = [A[0] + off.out * win, A[1]];
          B = [P[0] + off.in * win, P[1]];
          P = mix(q, QT, A, B);
        } else if (QB > 0 && (lenIn - q) < QB) {
          /* 下孔接头：出程 = 外程（子午线），其延长 = 朝底尖走（`arms.bot`） */
          tau = -(lenIn - q);
          A = [P[0] + off.in * win, P[1]];
          B = arcAt(arms.bot, -tau); B = [B[0] + off.out * win, B[1]];
          P = mix(tau, QB, A, B);
        } else {
          P = [P[0] + off.in * win, P[1]];
        }
        r = P[0]; y = P[1];
      } else {
        r = shellRAtY(prof, iApex, y) * innerScale(u, c);
      }
      orb.push([Math.max(0, r), y]);
    }
    /* ── 外程（上行）：基座 = 苹果壳子午线；两端各挂一个接头的混合窗口 ── */
    for (i = N - 2; i >= 0; i--) {
      u = i / (N - 1); win = shellWin(u, c);
      a = pt.cum[i];                                    /* 离上孔、沿子午线的精确弧长 */
      P = [prof[i][0], prof[i][1]];
      if (QT > 0 && a < QT) {
        /* 上孔接头（入程侧）：P 在 τ<0，退化为子午线本身 */
        tau = -a;
        A = [P[0] + off.out * win, P[1]];
        B = coneAt(tau); B = [B[0] + off.in * win, B[1]]; /* 锥壁**反向**延长（孔以上，τ<0） */
        P = mix(tau, QT, A, B);
      } else if (QB > 0 && (pt.L - a) < QB) {
        /* 下孔接头（出程侧）：P 在 τ>0，退化为子午线本身 */
        tau = pt.L - a;
        A = coneAt(lenIn + tau); A = [A[0] + off.in * win, A[1]];   /* 锥壁继续往下 */
        B = [P[0] + off.out * win, P[1]];
        P = mix(tau, QB, A, B);
      } else {
        P = [P[0] + off.out * win, P[1]];
      }
      orb.push([Math.max(0, P[0]), P[1]]);
    }
    return orb;
  }

  /** 把子午面轨道 (r, y) 加上方位角 φ → 三维宏观路径（索引口径与旧版逐字一致） */
  function whorlPath(j, n, c, prof, ys) {
    var N = prof.length;
    var orb = orbitPlane(j, n, c, prof);
    if (typeof global !== 'undefined' && global && global.PLANE_ONLY) { return orb; }
    var out = [], i, u, up, ph;
    for (i = 0; i < orb.length; i++) {
      if (i <= N - 1) { u = i / (N - 1); up = false; }
      else { u = (2 * (N - 1) - i) / (N - 1); up = true; }
      ph = whorlPhase(j, n, c, u, up);
      out.push([orb[i][0] * Math.cos(ph), orb[i][1] + ys, orb[i][0] * Math.sin(ph)]);
    }
    return out;
  }

  /**
   * 第 j 根 whorl 的**一段**（给「局部放大看细分」/ 对照用；s: 0→1 下行，1→2 上行）。
   * 🔴 与 `whorlPath` **同一条轨道**（`orbitPlane`），只是在参数域里按 (s0, s1) 抽一段，
   *    并在轨道点之间线性插值 —— 保证「局部放大图」与整图**几何逐点一致**，
   *    接头处同样是 C∞ 混合出来的平滑过渡（不会因为换了个函数又冒出折角）。
   */
  function whorlSegment(j, n, c, s0, s1, M) {
    var prof = outerProfile(c), ys = yShiftFor(prof);
    var N = prof.length;
    var orb = orbitPlane(j, n, c, prof);
    var out = [], k, i0, ft, idx, u, down, ph, r, yv;
    M = Math.max(8, M || 64);
    for (k = 0; k < M; k++) {
      var s = s0 + (s1 - s0) * (k / (M - 1));
      down = s <= 1;
      u = down ? s : (2 - s);
      ft = u * (N - 1);
      idx = down ? ft : (2 * (N - 1) - ft);
      i0 = Math.max(0, Math.min(orb.length - 2, Math.floor(idx)));
      var f = Math.max(0, Math.min(1, idx - i0));
      r = orb[i0][0] + (orb[i0 + 1][0] - orb[i0][0]) * f;
      yv = orb[i0][1] + (orb[i0 + 1][1] - orb[i0][1]) * f;
      ph = whorlPhase(j, n, c, u, !down);
      out.push([Math.max(0, r) * Math.cos(ph), yv + ys, Math.max(0, r) * Math.sin(ph)]);
    }
    return out;
  }

  /**
   * 中央螺旋（the central spiral）：沿中轴从**上孔**一路下到**下孔**。
   *
   * 🔴 2026-10-08 老师（配红圈截图）：「**上孔往上的直锥不应该有螺旋缠绕，
   *    内程螺旋只从上孔到下孔**」。
   *
   *    旧口径起点取 `tubeGeom.mouthY`（锥管口）—— 那比上孔高 **0.12366**，
   *    于是「上孔以上那段直锥」上多出一截螺旋。实测（`_scratch/_dump_cone_top.js`）：
   *        上孔  y = 0.85228 ／ 锥口 y = 0.97594   ⇒ 高出的 0.12366 正是那一截。
   *    改为从**上孔**起，全段严格落在 [下孔, 上孔] 之内 —— 与丝的**内程**同界。
   */
  function centralPoints(c, prof, ys, M) {
    var tg = tubeGeom(c, prof, ys);
    var ch = fieldHoles(c);                   /* 🔴 与轨道同一处孔（随 fieldShape 变） */
    var y0 = prof[prof.length - 1][1] + ys;   /* 下孔（平移后，= 0.04221 那一圈的高度） */
    var y1 = ch.topY + ys;                    /* 🔴 上孔（**不取**锥口 mouthY，见上） */
    M = Math.max(32, M || 260);
    /* 🔴 「anu 镜像」也要翻中轴螺旋的绕向 —— 否则「把整个 Anu 以中轴为镜」只做了一半，
       俯视图里会出现「丝翻了、芯没翻」的不自洽。半径/高度同样不动，只翻 φ 的符号。 */
    var ms = mirrorSign(c);
    var out = [], i;
    for (i = 0; i < M; i++) {
      var t = i / (M - 1);
      var y = y1 + (y0 - y1) * t;
      var ph = ms * TAU * c.centralTurns * t;
      out.push([c.centralR * Math.cos(ph), y, c.centralR * Math.sin(ph)]);
    }
    return out;
  }

  /* ------------------------------------------------------------- 辅助参考线 */
  /** 心形侧影（正视 + 侧视各一圈）—— 让「爱心」这件事一眼可验 */
  function heartGuides(c, prof, ys) {
    var front = [], side = [], i;
    for (i = 0; i < prof.length; i++) { front.push([prof[i][0], prof[i][1] + ys, 0]); }
    for (i = prof.length - 1; i >= 0; i--) { front.push([-prof[i][0], prof[i][1] + ys, 0]); }
    front.push(front[0].slice());
    for (i = 0; i < front.length; i++) { side.push([0, front[i][1], -front[i][0]]); }
    var out = [
      { pts: front, color: '#5b7fb0', opacity: 0.36, closed: false },
      { pts: side, color: '#5b7fb0', opacity: 0.16, closed: false }
    ];
    /* 🔴 苹果**内壁 / 外壁**子午线（关于中性面对称张开，两端窗口归零）——
       老师 2026-10-07：「3 根粗丝外缘贴**外壁**、7 根细丝外缘贴**内壁**」；
    /* 🔴 两族丝的**外缘包络子午线**（老师的「尺子」）——
       老师 2026-10-07：「3 根粗丝外缘贴**外壁**、7 根细丝外缘贴**内壁**」；
       老师 2026-10-08：「改壳厚要**双丝同步都动**（粗丝外膨 / 细丝内敛）」。
       🔴 2026-10-08 再订正：「『双丝分离』和『苹果壳厚』**功能重复了**」
          （核实：`radOffsets()` 里两者对 `layer` 的导数完全相同 ⇒ 同一个旋钮）
          ⇒ 「苹果壳厚」滑块删除，`shellGap` 固定为参考壳厚 0.072；
             两条壁线从此由**唯一**的 `wireSpread` 驱动：
                粗丝层外缘 r = prof + radOffsets(c, 0).out        + coilRThick
                细丝层外缘 r = prof + radOffsets(c, c.thick).out  + coilR
       Δ = 0 时二者分别 ≡ **外壁 prof / 内壁 prof − 0.072**（与旧图逐点相同）。 */
    if (tangentMode(c) !== 'off') {
      var N1 = prof.length;
      var edgeOff = function (j) { var ro = radOffsets(c, j); return ro.out + ro.coil; };
      var offThick = edgeOff(0), offThin = edgeOff(c.thick);
      var wallLine = function (off) {
        var arr = [], ii, uu, rr;
        for (ii = 0; ii < N1; ii++) {
          uu = ii / (N1 - 1); rr = Math.max(0, prof[ii][0] + off * shellWin(uu, c));
          arr.push([rr, prof[ii][1] + ys, 0]);
        }
        for (ii = N1 - 1; ii >= 0; ii--) {
          uu = ii / (N1 - 1); rr = Math.max(0, prof[ii][0] + off * shellWin(uu, c));
          arr.push([-rr, prof[ii][1] + ys, 0]);
        }
        arr.push(arr[0].slice());
        return arr;
      };
      out.push({ pts: wallLine(offThin), color: '#b06bff', opacity: 0.34, closed: false,
                 dashed: true, dashSize: 0.014, gapSize: 0.011 });      /* 7 细丝层外缘（紫；Δ=0 即内壁） */
      if (Math.abs(offThick) > 1e-9) {
        out.push({ pts: wallLine(offThick), color: '#e0b341', opacity: 0.30, closed: false,
                   dashed: true, dashSize: 0.014, gapSize: 0.011 });    /* 3 粗丝层外缘（金；Δ=0 即外壁 → 不画） */
      }
    }
    return out;
  }

  /**
   * 中轴锥管（原图 FUNNEL TUBE）——**直锥体**，不是圆柱。
   * 原图放大可见：口沿是一个张开的椭圆，两侧管壁缓慢向下收拢 ⇒ 口大、下小的细长正圆锥。
   *   · 口沿（mouth）半径 r_mouth 是**锚定量**（默认 TUBE_MOUTH_R = 0.1428，由老师红线量得）
   *   · apex 由它反解：apexY = mouthY − mouthR / tan(半角) ≈ 0.693 − 2.771 ≈ −2.078
   *     （锥管穿过下孔 botY ≈ −1.2589，一直沉到 TORRENT 段 —— 与老师红线一致）
   *   · rAtRim = 锥管在上孔高度处（rimY）的半径（供自检，≡ 上孔 0.1364）
   */
  function tubeGeom(c, prof, ys) {
    var rimY = prof[0][1] + ys;
    /* 🔴 「当前生效半角」= `c.tubeHalfAngle`（已由 `angleForShape()` 在外场形态变化时联动写好）。
       见 `angleForShape` 的长注释 —— 这就是老师要的「f 越小、锥角越小、锥越高」。 */
    var k = effHalfTan(c);
    var ha = Math.atan(k) * 180 / Math.PI;
    /* 管口 = 两瓣最高处，取**解析值** yLobe(c) + ys —— 与 coneHoles / wallAt 同一口径。
       若改取 prof 的采样最大值，会因弧长重采样没命中 θ=π/2 顶点而差 ~2e-5，
       于是 rAtRim 与上孔半径对不上（锥壁穿不过上孔）。 */
    var mouthY = (c.tubeMouthY == null) ? (yLobe(c) + ys) : c.tubeMouthY;
    var mouthR = (c.tubeMouthR == null) ? TUBE_MOUTH_R : c.tubeMouthR;
    var apexY = mouthY - mouthR / Math.max(1e-6, k);
    return {
      halfAngle: ha, fullAngle: 2 * ha, slope: k,
      /* 参考半角（苹果态基准）—— 由 app 放进 c.angleRef，缺省 = 出厂基准 */
      refHalfAngle: (c.angleRef == null) ? TUBE_ANGLE_REF : +c.angleRef,
      /* ⚠️ 2026-10-08：`sliderHalfAngle` 必须在这里也报出来 ——
         `metrics()` 的 `tubeSliderHalfAngle: tg.sliderHalfAngle` 读的就是本字段，
         本函数此前漏了它 ⇒ HUD 上那个「半角」会是 `undefined`（真 bug）。 */
      sliderHalfAngle: +c.tubeHalfAngle,
      fieldShape: effFieldShape(c),
      /* 锥高相对**出厂基准**（2.95°）的倍率 = tan(2.95°) / tan(θ_当前)。
         旧口径直接写 1/f；改为角度域后与 1/f 差 ≤ 0.2%（见 `angleForShape` 注释）。 */
      heightMul: Math.tan(TUBE_ANGLE_REF * Math.PI / 180) / Math.max(1e-9, k),
      apexY: apexY, mouthY: mouthY, mouthR: mouthR,
      rimY: rimY, rimR: c.rimR, rAtRim: (rimY - apexY) * k,
      len: Math.max(1e-6, mouthY - apexY)
    };
  }

  /**
   * 锥管关键量的**轻量**查询（不建子午线、不建模型）——
   * 给 UI 显示「当前生效半角 / 锥高倍率」用，避免为了两个数字去跑一遍 `metrics()`。
   *
   * ⚠️ 第二次修订后：`tubeHalfAngle` 就是**当前生效半角**，所以这里不再需要 f 参与；
   * `f` 只作为「当前外场形态」如实上报（供 HUD 显示与自检核对）。
   */
  function coneState(o) {
    var c = cfgOf(o);
    var f = effFieldShape(c), k = effHalfTan(c);
    return {
      f: f, sliderHalfAngle: +c.tubeHalfAngle,
      refHalfAngle: (c.angleRef == null) ? TUBE_ANGLE_REF : +c.angleRef,
      effHalfAngle: Math.atan(k) * 180 / Math.PI,
      heightMul: Math.tan(TUBE_ANGLE_REF * Math.PI / 180) / Math.max(1e-9, k),
      coneHeight: TUBE_MOUTH_R / Math.max(1e-9, k)     /* = 从口沿到锥顶的高（模型单位） */
    };
  }

  /**
   * 锥管参考线**向下绘制的下限**（模型单位）。
   *
   * 🔴 2026-10-08：锥半角与「外场边界形态 f」耦合后，f = 0.1 时锥顶会沉到 y ≈ −27.7。
   *   照旧「一路画到 apex」的话，场景里会出现几个孤零零的小圆环挂在形体下方 20 多个单位处
   *   （其实旧口径把半角滑块拖到 0.05° 时就已经有这个毛病 —— apexY ≈ −163）。
   *   ⇒ 参考线只画到 **apex 与「形体底端下方 TUBE_GUIDE_DROP」两者中较高的那个**：
   *        yBot = max(apexY, tipY − DROP)
   *
   * ⚠️ **DROP 为什么必须 ≥ 1.1022**（这里我连算错过两次，把口径记全）：
   *   想「默认参数下 yBot 仍等于 apexY（零回归）」，需要 `tipY − DROP ≤ apexY₀`，即
   *        DROP ≥ tipY − apexY₀
   *   ⚠️ 坑：**tipY 必须用「加了 yShift」的口径**（coneGuides 里就是 `prof[末点][1] + ys`），
   *      而 `outerProfile` 返回的是 **raw** 值 —— 两者差一个 yShift = 0.282939。我头两次分别
   *      拿 raw 的 −1.2589 去减（得 0.8192）和直接目测（得 −1.795），都是错的。
   *   实算（默认 tubeHalfAngle = 2.95°、fieldShape = 1、mouthR = 0.1428、yShift = 0.282939）：
   *        yLobe      = 0.410061  ⇒ mouthY = 0.410061 + 0.282939 = 0.693000
   *        apexY₀     = 0.693000 − 0.1428 / tan(2.95°) = 0.693000 − 2.771053 = −2.078053
   *        tipY       = outerProfile 末点 raw(−1.258877) + 0.282939 = −0.975938
   *        ⇒ 下界 = tipY − apexY₀ = **1.102115**
   *   ⇒ 旧值 0.54 / 0.90 **都不够**：那时 `max(−2.0781, −1.8759) = −1.8759`，参考线在**默认参数
   *     下就被悄悄砍短了 0.2**（图形上几乎看不出，但确实不是零回归）。
   *   现取 **1.15**（余量 0.048），默认下取到 apexY ⇒ 与旧图逐点一致；
   *   而 f = 0.1 时 apexY ≈ −27.0 远低于 −2.126 ⇒ `max` 取 −2.126，
   *   参考线停在形体下方 1.15 处，不会再有悬空小圆环。
   *   （`probe_heart [5k]` 里有一条断言**实算**这个下界，参数一漂就报警 —— 别硬编码。）
   */
  var TUBE_GUIDE_DROP = 1.15;

  /**
   * 中轴锥管的参考线：4 个高度上的圆环 + 8 条母线 + 中轴。
   * 最下面几环刻意落在 rimY **以下**（物体内部），一直收到 apex —— 与原图一致：
   * 管壁是一路沉进内部的，所以看上去是个口大下小的**尖锥**。
   */
  function coneGuides(c, prof, ys) {
    var t = tubeGeom(c, prof, ys), out = [], M = 72, i, j;
    var COL = '#6fe0c8';
    /* 🔴 绘制下界：见 TUBE_GUIDE_DROP。锥半角被「外场边界形态」压小后 apex 会沉得很远，
       不能再照着 apex 画（否则形体下方会挂几个离得很远的小圆环）。 */
    var yBot = Math.max(t.apexY, prof[prof.length - 1][1] + ys - TUBE_GUIDE_DROP);
    var lenDraw = Math.max(1e-6, t.mouthY - yBot);
    var fr = [0.10, 0.38, 0.68, 1.0];
    for (i = 0; i < fr.length; i++) {
      var y = yBot + lenDraw * fr[i];
      var r = (y - t.apexY) * t.slope;
      var pts = [];
      for (j = 0; j <= M; j++) {
        var a = (j / M) * TAU;
        pts.push([r * Math.cos(a), y, r * Math.sin(a)]);
      }
      out.push({ pts: pts, color: COL, opacity: i === fr.length - 1 ? 0.90 : 0.34, closed: false });
    }
    for (j = 0; j < 8; j++) {
      var a2 = (j / 8) * TAU, y1 = yBot + lenDraw * fr[0], r1 = (y1 - t.apexY) * t.slope;
      out.push({
        pts: [[r1 * Math.cos(a2), y1, r1 * Math.sin(a2)],
              [t.mouthR * Math.cos(a2), t.mouthY, t.mouthR * Math.sin(a2)]],
        color: COL, opacity: 0.40, closed: false
      });
    }
    out.push({
      pts: [[0, prof[prof.length - 1][1] + ys, 0], [0, t.mouthY, 0]],
      color: COL, opacity: 0.22, closed: false
    });
    return out;
  }

  /* ------------------------------------------------------------ model 装配 */
  /**
   * **逐级缠绕模式数组**（长度 D，`out[k−1]` = 第 k 阶的模式）。
   *
   * 见 `DEFAULTS.mode` 的长注释：修的就是「下拉框空转」那个 bug ——
   * 此前 `makeWhorl()` 把 `mode` 写死成 `'normal'`，`rebuildHeart()` 又没把 `state.mode` 传下来。
   *
   * @param {object} c 配置（读 c.mode）
   * @param {number} D 阶数
   * @returns {string[]} 例如 alternate + D=3 → ['normal','axial','normal']
   */
  function modesFor(c, D) {
    var out = [], k, m = (c && c.mode) || 'normal';
    for (k = 1; k <= D; k++) {
      if (m === 'alternate') { out.push(k % 2 === 1 ? 'normal' : 'axial'); }
      else { out.push(m === 'axial' ? 'axial' : 'normal'); }
    }
    return out;
  }

  function flatten(pts) {
    var out = new Float32Array(pts.length * 3), i;
    for (i = 0; i < pts.length; i++) {
      out[i * 3] = pts[i][0]; out[i * 3 + 1] = pts[i][1]; out[i * 3 + 2] = pts[i][2];
    }
    return out;
  }

  function arcLength(pts, closed) {
    var L = 0, i;
    for (i = 1; i < pts.length; i++) {
      var dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1], dz = pts[i][2] - pts[i - 1][2];
      L += Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    if (closed && pts.length > 2) {
      var ex = pts[0][0] - pts[pts.length - 1][0],
          ey = pts[0][1] - pts[pts.length - 1][1],
          ez = pts[0][2] - pts[pts.length - 1][2];
      L += Math.sqrt(ex * ex + ey * ey + ez * ez);
    }
    return L;
  }

  function mkLevel(k, pts, meta) {
    meta = meta || {};
    return {
      k: k, pts: flatten(pts), count: pts.length,
      turns: meta.turns || 0, accumTurns: meta.accumTurns || 1,
      radius: meta.radius == null ? 1 : meta.radius, parentRadius: meta.parentRadius || 0,
      pitch: meta.pitch || 0, mode: meta.mode || 'base',
      /* 🔴 本阶**实际使用**的缠绕模式（'normal' 全环向 / 'axial' 全轴向）——
         `mode` 那个字段被 build/tailChain 借去当**级标识**（'base'/'macro'/'heart-whorl'/'central'），
         与缠绕模式是两回事，所以另开一个字段，免得 HUD / 自检把两者搞混。 */
      windMode: meta.windMode || null,
      planeNormal: meta.planeNormal || [0, 0, 1],
      /* 挂点上（下一阶衔接处）的缠绕轴/法向 —— `AnuGeo.planeAngleBetween` 优先读它 */
      attachNormal: meta.attachNormal || meta.planeNormal || [0, 0, 1],
      arc: meta.arc || 0, arcPerTurn: meta.arcPerTurn || 0,
      closed: meta.closed === true,
      samplePoint: pts[meta.sampleAt == null ? Math.floor(pts.length * 0.5) : meta.sampleAt] || pts[0],
      surface: !!meta.surface
    };
  }

  /**
   * 造一根 whorl（depth = 1 的 model：level0 = 宏观 5 圈路径，level1 = 含 microTurns 匝的弹簧）。
   * @param {object} G AnuGeo（提供 frames / subdivide）
   */
  function makeWhorl(j, n, c, prof, ys, G) {
    var path = whorlPath(j, n, c, prof, ys);
    var macroLen = arcLength(path, false);
    var isThick = j < c.thick;
    var coilR = isThick ? c.coilRThick : c.coilR;
    var mTurns = Math.max(2, Math.round(c.microTurns));
    /* 🔴 每匝 spirilla 采样点数**强制规整到 7 的倍数**（老师 2026-10-08：「建议是 7 的倍数整数」）。
       下界 7：4 点/匝 = 四边形，相邻段夹角中位 46.9°、44.7% 的顶点 > 60° —— 那就是「很多折线」。 */
    var spp7 = Math.max(7, 7 * Math.max(1, Math.round((+c.spp || 14) / 7)));
    var target = Math.max(240, mTurns * spp7);
    /* 🔴 阶数与逐级缠绕模式要**在这里**就算出来：第 1 阶的 `subdivide` 就得用 modes[0]。
       （此前 D / BR 在函数后半段才声明 ⇒ 上面那行只能写死 'normal'，这就是 bug 的由来。） */
    var D = Math.max(1, Math.min(7, Math.round(c.depth || 1)));
    var BR = Math.max(2, Math.round(c.branch || 7));
    var modes = modesFor(c, D);

    var fr = (G && G.frames) ? G.frames(path, false, null) : null;
    var coil = (G && G.subdivide)
      ? G.subdivide({ p: path, closed: false }, {
          turns: mTurns, radius: coilR, mode: modes[0],   /* 🔴 不再是写死的 'normal' */
          spp: spp7, count: target
        })
      : null;

    var pts = coil ? coil.p : path;

    /* 本阶缠绕平面的法向：mode 'normal' ⇒ 平面法向 = 切向 T；mode 'axial' ⇒ = 副法向 B。
       （与 `AnuGeo.subdivide` 的口径一致：normal 时子螺旋在 span(N,B) 内 ⇒ 法向 T；
         axial 时在 span(N,T) 内 ⇒ 法向 B。） */
    var m0 = modes[0];
    var planeNormal = [0, 0, 1], attachNormal = [0, 0, 1];
    if (fr) {
      var sn0 = Math.max(1, (coil && coil.subN) || 1);
      var sk = Math.floor(pts.length * 0.5);
      var si = Math.max(0, Math.min(fr.length - 1, Math.floor(sk / sn0)));
      planeNormal = (m0 === 'axial') ? (fr[si].b || fr[si].t) : (fr[si].t || [0, 0, 1]);
      /* 🔴 第 2 阶的**挂点** = 第 1 阶的「末匝起点」（`tailChain` 就是从那里接上去的）。
         该处的缠绕轴 = 宏观路径在**末匝起点**的法向（按第 1 阶的模式取 T 或 B）——
         它同时是第 2 阶的标架种子，所以相邻两阶的缠绕平面夹角严格 90°（用中点会偏到 39°）。
         `planeAngleBetween` 优先读 attachNormal，故这里必须如实给出。 */
      var takeTop = Math.max(4, Math.round(pts.length / mTurns));
      var ia = Math.max(0, pts.length - takeTop);
      var siA = Math.max(0, Math.min(fr.length - 1, Math.floor(ia / sn0)));
      attachNormal = (m0 === 'axial') ? (fr[siA].b || planeNormal) : (fr[siA].t || planeNormal);
    }

    var lv0 = mkLevel(0, path, {
      mode: 'macro', turns: 2 * c.turnsPerLeg, accumTurns: 2 * c.turnsPerLeg,
      radius: 1, pitch: macroLen / (2 * c.turnsPerLeg), arc: macroLen,
      arcPerTurn: macroLen / (2 * c.turnsPerLeg), closed: false
    });
    var lv1 = mkLevel(1, pts, {
      /* 🔴 2026-10-08：本阶圈数 = **1680**（1st-order spirillae 的真实匝数），
         不再写「2 × turnsPerLeg = 5」—— 那个 5 是 **第 0 阶（宏观路径）** 的圈数。
         旧写法让 HUD「本阶圈数 / 累计圈数」把宏观圈数当成了 spirilla 阶数，
         与预设②「七级垂直细分」的口径（第 1 阶 = 1680）不一致。
         宏观 5 圈现在只挂在 lv0（及 metrics.turnsTotal / 字幕）上。 */
      mode: 'heart-whorl', turns: mTurns, accumTurns: mTurns,
      windMode: m0,                       /* 本阶实际使用的缠绕模式（'normal' / 'axial'） */
      radius: coilR, parentRadius: 1,
      pitch: macroLen / mTurns,
      planeNormal: planeNormal, attachNormal: attachNormal,
      arc: coil ? coil.len : macroLen,
      arcPerTurn: (coil ? coil.len : macroLen) / mTurns,
      closed: false, sampleAt: Math.floor(pts.length * 0.5)
    });

    /* ────── 第 2..D 阶：在上一级的最后一匝上再绕 branch 匝 ──────
       🔴 2026-10-08 老师：爱心也要一路画到 7th-order spirillae（此前只有第 1 阶）。
       引擎与预设②「七级垂直细分」**同一台**（`AnuGeo.tailChain`），
       所以两处的逐级半径比、相邻级平面夹角、衔接点取法**完全一致**（已用逐点对照证明 bit-exact）。
       `parentIsCoil = true`：起点（第 1 阶 whorl 弹簧）本身已是线圈，
       它「一匝」的长度是 √(pitch₁² + (2π·coilR)²)，第一级要先把 coilR 卷进去再 ÷branch；
       之后再逐级自动收敛到自然涌现比 √(1+π²)/7 = 0.4710。 */
    /* ⚠️ D / BR / modes 已在函数**开头**算好（第 1 阶的 subdivide 就要用 modes[0]），
       这里不再重复声明 —— 早先 D/BR 只在这里声明，正是上面那行写死 'normal' 的原因。 */
    var levels = [lv0, lv1];
    if (D > 1 && G && G.tailChain && coil) {
      var chain = G.tailChain({ p:pts, closed:false }, {
        orders: D - 1,                 /* 第 1 阶已建好 ⇒ 再追加 D−1 级 */
        branch: BR,
        /* 🔴 老师报的 bug：模式没传进来 ⇒ 下拉框空转。这里把**整张模式表**交给 tailChain，
           它按 `o.modes[k−1]`（k = 真实阶号 2..D）逐级取用。 */
        modes: modes,
        fill: (c.subFill == null ? 1.0 : +c.subFill),
        spp: spp7,
        pitch0: macroLen / mTurns,     /* 第 1 阶（whorl 弹簧）自己的匝间距 */
        parentIsCoil: true,
        parentRadius: coilR,
        parentTurns: mTurns,           /* 🔴 第 2 阶只绕在**那 1680 匝的最后一匝**上 */
        seedN: attachNormal,           /* 🔴 第 2 阶的标架种子 = 第 1 阶挂点处的缠绕轴 ⇒ ⊥ 严格 */
        startK: 1,                     /* 起点 = 第 1 阶 ⇒ 第一个追加的就是第 2 阶 */
        accumBase: mTurns,             /* 累计匝数 = mTurns · branch^(k−1) */
        phase0: 0
      });
      for (var ci = 0; ci < chain.levels.length; ci++) { levels.push(chain.levels[ci]); }
    }

    var kind = isThick ? 'thick' : 'thin';
    var idx = isThick ? (j + 1) : (j - c.thick + 1);
    return {
      model: {
        levels: levels, depth: (levels.length - 1),
        totalPoints: levels[levels.length - 1].count,   /* 与 ladder 同口径：最深一级的点数 */
        totalAllPoints: levels.reduce(function (s, L) { return s + (L && L.count ? L.count : 0); }, 0),
        totalTurns: Math.round(mTurns * Math.pow(BR, D - 1)),
        totalArc: coil ? coil.len : macroLen,
        spp: spp7, autoReduced: false,
        cfg: { baseR: 0, depth: D, wires: n, wireIndex: j },
        /* 🪞 anu 镜像 / 磁荷极性：让**模型自描述** —— HUD / 导出 / 自检都能直接读，
           不必回头问 app 的 state。记账源仍是 `polarityOf()`，不另算一份。 */
        mirror: c.mirror === true, polarity: polarityOf(c),
        macroLen: macroLen, microTurns: mTurns, coilR: coilR, macroPath: path
      },
      color: isThick ? THICK_COLORS[j % THICK_COLORS.length]
                     : SPECTRUM[(j - c.thick) % SPECTRUM.length],
      kind: kind,
      name: (isThick ? '粗丝 ' : '细丝 ') + idx +
            '（绕中轴 5 圈 = 2.5 下行 + 2.5 上行；内含 ' + mTurns + ' 匝' +
            (D > 1 ? '，再逐级 ×' + BR + ' 到第 ' + D + ' 阶' : '') + '）'
    };
  }

  function makeCentral(c, prof, ys, G) {
    var pts = centralPoints(c, prof, ys, 260);
    var lv = mkLevel(1, pts, {
      mode: 'central', turns: c.centralTurns, accumTurns: c.centralTurns,
      radius: c.centralR, pitch: arcLength(pts, false) / Math.max(1, c.centralTurns),
      planeNormal: [0, 1, 0], closed: false, sampleAt: Math.floor(pts.length / 2)
    });
    return {
      model: {
        levels: [null, lv], depth: 1, totalPoints: pts.length, totalAllPoints: pts.length,
        totalTurns: c.centralTurns, totalArc: lv.arc, spp: 8, autoReduced: false,
        cfg: { baseR: 0, depth: 1, wires: 1, wireIndex: 0 },
        mirror: c.mirror === true, polarity: polarityOf(c),   /* 🪞 同 makeWhorl，保持一致 */
      },
      color: '#ffd88a', kind: 'thin', name: '中央螺旋（the central spiral）'
    };
  }

  /* ------------------------------------------------------------------ 主入口 */
  /**
   * @param {object} o 覆盖 DEFAULTS
   * @param {object} G AnuGeo 模块（可空：缺它就只画宏观 5 圈路径，不绕 1680 匝）
   * @returns {{bundle: Array, guides: Array, cfg: object, profile: Array}}
   */
  function build(o, G) {
    var c = cfgOf(o);
    var prof = outerProfile(c);
    var ys = yShiftFor(prof);
    var n = Math.max(1, Math.round(c.wires));
    var bundle = [], guides = [], i;

    for (i = 0; i < n; i++) { bundle.push(makeWhorl(i, n, c, prof, ys, G)); }
    if (c.central && n > 1) { bundle.push(makeCentral(c, prof, ys, G)); }

    if (c.guides) {
      guides = heartGuides(c, prof, ys);
      if (c.tube && n > 1) { guides = guides.concat(coneGuides(c, prof, ys)); }
      if (c.macroGuide) {
        /* whorl 的宏观 5 圈路径（虚线）：嵌在弹簧绳芯里，直接印证「2.5 + 2.5 = 5 圈」 */
        [0, Math.floor(n / 2)].forEach(function (j) {
          if (j >= n) { return; }
          guides.push({
            pts: whorlPath(j, n, c, prof, ys),
            color: '#22d3ee', opacity: 0.55, closed: false,
            dashed: true, dashSize: 0.012, gapSize: 0.010
          });
        });
      }
    }

    c._yShift = ys;
    return { bundle: bundle, guides: guides, cfg: c, profile: prof, yShift: ys };
  }

  /** 供「整体尺度」用：心形子午线的外接半径 */
  function boundRadius(o) {
    var c = cfgOf(o);
    var prof = outerProfile(c), ys = yShiftFor(prof);
    var R = 0.001, i;
    for (i = 0; i < prof.length; i++) {
      var r = Math.sqrt(prof[i][0] * prof[i][0] + Math.pow(prof[i][1] + ys, 2));
      if (r > R) { R = r; }
    }
    return R;
  }

  /** 心形轮廓的关键量（给 HUD / 字幕 / 自检用） */
  function midIdxOf(prof) { return Math.floor(prof.length * 0.5); }

  function metrics(o) {
    var c = cfgOf(o);
    var prof = outerProfile(c), ys = yShiftFor(prof), i;
    var hi = -Infinity, rAtHi = 0, wid = 0, widY = 0;
    for (i = 0; i < prof.length; i++) {
      var y = prof[i][1] + ys;
      if (y > hi) { hi = y; rAtHi = prof[i][0]; }
      if (prof[i][0] > wid) { wid = prof[i][0]; widY = y; }
    }
    var rimY = prof[0][1] + ys, tipY = prof[prof.length - 1][1] + ys;
    var tg = tubeGeom(c, prof, ys);
    return {
      rimR: prof[0][0], rimY: rimY, tipY: tipY,   /* 上孔 = 子午线 ∩ 锥壁 */
      bottomR: prof[prof.length - 1][0],          /* 下孔 = 子午线 ∩ 锥壁 */
      holeTopR: prof[0][0], holeTopY: rimY,       /* 🕳 上孔（大）*/
      holeBotR: prof[prof.length - 1][0], holeBotY: tipY,  /* 🕳 下孔（小）*/
      holeRatio: prof[0][0] / Math.max(1e-9, prof[prof.length - 1][0]),
      coneRim: c.coneRim !== false, joinSoft: Math.max(0, +c.joinSoft || 0),
      returnReverse: c.returnReverse === true, thick: c.thick,
      /* 🔴 2026-10-08：10 根丝共用**同一个**相位方程 ⇒ j 与 j+5 严格互为「绕中轴旋转 180°」 */
      wires: c.wires, turnsPerLeg: c.turnsPerLeg,
      innerAtTop: wallAt(prof[0][1], c), innerAtBot: wallAt(prof[prof.length - 1][1], c),
      /* 🔴 苹果壳的「内壁 / 外壁」分层（老师 2026-10-07 追加；2026-10-08 改为**对称张开**） */
      shellGap: Math.max(0, +c.shellGap || 0), shellGapRef: shellGapRef(c),
      shellMidR: prof[midIdxOf(prof)][0] - shellMidOff(c),   /* 中性面（与 shellGap 无关） */
      /* 🔴 第 ⑥ 条：双丝分离量 + 外场形态（1 = 苹果切片、0 = 球面切片） */
      wireSpread: Math.max(0, +c.wireSpread || 0),
      fieldShape: clamp(c.fieldShape == null ? 1 : +c.fieldShape, 0, 1),
      shellRamp: +c.shellRamp || 0,
      surfaceTangent: tangentMode(c),
      coilR: c.coilR, coilRThick: c.coilRThick,
      outRThick: prof[midIdxOf(prof)][0] + radOffsets(c, 0).out,   /* 粗丝外程中心线（中段） */
      outRThin:  prof[midIdxOf(prof)][0] + radOffsets(c, c.thick).out,
      /* 外/内壁（中段，win = 1）：关于中性面对称张开 */
      outWallR: outerWallR(0.5, prof, c),
      innerWallMidR: innerWallR(0.5, prof, c),
      wallHalf: Math.max(0, +c.shellGap || 0) / 2,
      shellMidOff: shellMidOff(c),
      rAtRim: tg.rAtRim,
      lobeR: rAtHi, lobeY: hi,                 /* 两瓣最高点 */
      widest: wid, widestY: widY,
      notchDepth: hi - rimY,                   /* 顶中凹口深度（>0 即「顶上不是平的」）*/
      turnsPerLeg: c.turnsPerLeg,
      turnsTotal: 2 * c.turnsPerLeg,           /* = 5 */
      microTurns: Math.round(c.microTurns),
      gapRel: c.gapRel,
      tubeHalfAngle: tg.halfAngle, tubeFullAngle: tg.fullAngle,
      tubeApexY: tg.apexY, tubeMouthY: tg.mouthY, tubeMouthR: tg.mouthR, tubeLen: tg.len,
      /* 🔴 2026-10-08 老师：锥半角已与「外场边界形态 f」耦合（tan θ_eff = tan(滑块)·f）
         ⇒ 这里把「设定角 / 生效角 / 锥高倍率」三个量都报出来，HUD 才说得清。
         `tubeLen` 就是「口沿 → 锥顶」的高（= mouthR / tan θ_eff = mouthR/tan(滑块) × h）。 */
      tubeSliderHalfAngle: tg.sliderHalfAngle,
      coneFieldShape: tg.fieldShape,
      coneHeightMul: tg.heightMul,
      /* 🪞 2026-10-08 老师：anu 镜像 ↔ 磁荷极性
         （俯视内程：顺时针 = negative 负磁荷；逆时针 = positive 正磁荷） */
      mirror: c.mirror === true,
      mirrorSign: mirrorSign(c),
      polarity: polarityOf(c),
      /* 「俯视内程绕向」的中文短语，直接给 HUD / 字幕用（省得各处再拼一遍） */
      spinText: (polarityOf(c) === 'negative') ? '顺时针下旋' : '逆时针下旋'
    };
  }

  return {
    DEFAULTS: DEFAULTS,
    cfgOf: cfgOf,
    heartRT: heartRT, tForR: tForR, bottomRT: bottomRT,
    yMeridian: yMeridian, tForRBottom: tForRBottom, clamp: clamp,
    yLobe: yLobe, tubeAnchor: tubeAnchor, wallAt: wallAt,
    coneHoles: coneHoles, holesOf: holesOf, fieldHoles: fieldHoles,
    outerProfile: outerProfile, appleProfile: appleProfile, sphereProfile: sphereProfile,
    yShiftFor: yShiftFor, innerScale: innerScale,
    shellWin: shellWin, radOffsets: radOffsets, tangentMode: tangentMode,
    innerWallR: innerWallR, outerWallR: outerWallR, wallR: wallR,
    shellGapRef: shellGapRef, shellMidOff: shellMidOff,
    whorlPath: whorlPath, whorlSegment: whorlSegment,
    shellRAtY: shellRAtY, apexIndexOf: apexIndexOf,
    orbitPlane: orbitPlane, flatStep: flatStep,
    meridianArms: meridianArms, coneLineAt: coneLineAt, arcTable: arcTable, arcAt: arcAt,
    whorlPhase: whorlPhase, centralPoints: centralPoints,
    mirrorSign: mirrorSign, polarityOf: polarityOf,
    /* 🔴 锥半角 ↔ 外场形态 的耦合（tan θ_eff = tan(滑块) · f；h = 1/f） */
    effFieldShape: effFieldShape, effHalfTan: effHalfTan, coneState: coneState,
    /* 🔴 锥半角 ⊗ 外场形态的**耦合规则唯一实现**（2026-10-08 第二次修订：
       从「几何里暗乘 f」提到「状态层显式派生」，好让网页上两根滑块同步动）。 */
    angleForShape: angleForShape, effHalfAngle: effHalfAngle, cfgForShape: cfgForShape,
    TUBE_ANGLE_REF: TUBE_ANGLE_REF, TUBE_ANGLE_MIN: TUBE_ANGLE_MIN,
    /* 🔴 球形态的「端部向内凹陷」（老师：接近球形时上下孔向内凹、结构像圆环） */
    sphereProfile: sphereProfile, sphArcR: sphArcR,
    SPH_INSET: SPH_INSET, SPH_Q: SPH_Q,
    FIELD_F_MIN: FIELD_F_MIN, TUBE_GUIDE_DROP: TUBE_GUIDE_DROP,
    heartGuides: heartGuides, coneGuides: coneGuides, tubeGeom: tubeGeom,
    build: build, boundRadius: boundRadius, metrics: metrics,
    SPECTRUM: SPECTRUM,
    THICK_COLORS: THICK_COLORS
  };
});
