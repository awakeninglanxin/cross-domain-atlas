/* ============================================================================
 * anu-ui.js —— 控件绑定 / HUD / 字幕 / 提示
 * ----------------------------------------------------------------------------
 * 单一职责：把 DOM 与用户操作翻译成回调，不持有业务状态、不碰 three.js。
 * ==========================================================================*/
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.AnuUI = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  /**
   * 「中轴锥管半锥角」滑块的**单位换算因子**：滑块 value = 1000 × 角度（度）。
   * 🔴 2026-10-08 本轮：分辨率从 0.01° 提到 **0.001°**（原来 value = 100 × 角度）。
   *   原因：这个角现在是「参考角 × 外场边界形态」联动出来的**派生量**，
   *   球形态下会掉到 0.295° —— 用 0.01° 的格子量化会变成 0.30°（误差 1.7%，
   *   锥高倍率显示 ×9.84 而不是 ×10），老师会当成数值不准。
   *   ⚠️ 改这里要同时改 HTML 上 `#rngTubeAngle` 的 `min/max/value`（各 ×10）。
   */
  var TUBE_SLIDER = 1000;

  function create(h) {
    h = h || {};
    var el = {
      presetBox: $('presetBox'),
      rngDepth: $('rngDepth'), vDepth: $('vDepth'),
      rngTurns1: $('rngTurns1'), vTurns1: $('vTurns1'),
      rngTurns: $('rngTurns'), vTurns: $('vTurns'),
      rngFill: $('rngFill'), vFill: $('vFill'),
      selMode: $('selMode'), selWires: $('selWires'),
      chkShell: $('chkShell'), chkBase: $('chkBase'), chkBubbles: $('chkBubbles'),
      chkPlanes: $('chkPlanes'), chkLevelColor: $('chkLevelColor'), chkWireColor: $('chkWireColor'),
      chkCmap: $('chkCmap'),
      /* 🔴 2026-10-08 老师：「显示 选项卡 里面要有 3d xyz axis 打勾选项」 */
      chkAxes: $('chkAxes'),
      rngMicroSpp: $('rngMicroSpp'), vMicroSpp: $('vMicroSpp'),
      rngSplineSub: $('rngSplineSub'), vSplineSub: $('vSplineSub'),
      rngBubble: $('rngBubble'), vBubble: $('vBubble'),
      rngPearls: $('rngPearls'), vPearls: $('vPearls'),
      rngLineBright: $('rngLineBright'), vLineBright: $('vLineBright'),
      rngSpread: $('rngSpread'), vSpread: $('vSpread'),
      rngField: $('rngField'), vField: $('vField'),
      rngTubeAngle: $('rngTubeAngle'), vTubeAngle: $('vTubeAngle'),
      /* 🔴 2026-10-08 老师：锥半角已与「外场边界形态 f」耦合（h = 1/f）
         ⇒ 显示「基准角 / 生效角 / 锥高倍率」三个读数 */
      vTubeAngleRef: $('vTubeAngleRef'), vTubeEff: $('vTubeEff'), vTubeMul: $('vTubeMul'),
      btnSphere: $('btnSphere'), btnApple: $('btnApple'),
      chkBreath: $('chkBreath'), rngBreath: $('rngBreath'), vBreath: $('vBreath'),
      btnGif: $('btnGif'), gifBox: $('gifBox'),
      /* 🔴 2026-10-08 老师：「生长动画也可以导出为 gif ≤ 5mb」
         ⇒ 「生长动画」那一组也放一个录制按钮 + 自己的状态框（录哪个就在哪显示，不必来回滚） */
      btnGifGrow: $('btnGifGrow'), gifBoxGrow: $('gifBoxGrow'),
      /* 🔴 2026-10-08 老师：「点击**逐级放大播放**这个出现的动态变化示意也要能导出 ≤5 MB 的 gif」
         ⇒ 播放组里再放一个录制按钮 + 自己的状态框（三块各管各的，录哪个就在哪显示） */
      btnGifZoom: $('btnGifZoom'), gifBoxZoom: $('gifBoxZoom'),
      selSurface: $('selSurface'),
      /* 🪞 2026-10-08 老师新功能：Anu 镜像（结构参数里）+ 舞台左上角磁荷极性标签 */
      btnMirror: $('btnMirror'), hudPolarity: $('hudPolarity'),
      btnPlay: $('btnPlay'), btnZoomPlay: $('btnZoomPlay'),
      rngGrowth: $('rngGrowth'), vGrowth: $('vGrowth'),
      rngSpeed: $('rngSpeed'), vSpeed: $('vSpeed'), chkRotate: $('chkRotate'),
      rngViewDrop: $('rngViewDrop'), vViewDrop: $('vViewDrop'),
      btnReset: $('btnReset'), btnTop: $('btnTop'), btnTheme: $('btnTheme'),
      hudMode: $('hudMode'), hudDepth: $('hudDepth'), hudTurn: $('hudTurn'),
      hudAccum: $('hudAccum'), hudRadius: $('hudRadius'), hudPoints: $('hudPoints'),
      hudAngle: $('hudAngle'), hudRatio: $('hudRatio'), hudSpr: $('hudSpr'),
      caption: $('caption'), toast: $('toast'), panel: $('panel')
    };

    /** 取「哪一块」GIF 状态框：'growth' → 播放组里生长那一块；'zoom' → 播放组里逐级放大那一块；
     *  其余（含缺省 'breath'）→ 呼吸组里的。
     *  三块都可能在极简 DOM（自检桩）里不存在 ⇒ 一律**兜底成空对象**，
     *  这样 `gifStatus` 在无 DOM 环境调用不会抛错（自检里会被直接调用）。 */
    var NOOP_BOX = { innerHTML: '' };
    function gifBoxOf(which) {
      var b = (which === 'growth') ? el.gifBoxGrow
            : (which === 'zoom') ? el.gifBoxZoom
            : el.gifBox;
      return b || NOOP_BOX;
    }

    /* --------------------------------- 浮窗右上角「—」收起 / 展开（**可逆**，只改类名）
       老师 2026-10-08：「anu 图前置的浮窗 label 标签右上角允许点击『—』缩小」。
       两块浮窗（左上 HUD 信息 / 右上图例）走**同一套**绑定：
         · 点「—」 ⇒ 给自己加 `.is-min`（CSS 把正文 `.hud-body` / `.legend-body`
           `display: none` 掉，只留标题），按钮变「＋」；
         · 再点「＋」 ⇒ 去掉 `.is-min`，原样复原。
       🔴 收起**只改类名**：不重建几何、不动任何状态量 —— `updateHUD()` 每帧该写
          还是写（元素只是被隐藏），所以展开回来时数值是最新的，不会「冻在收起那一刻」。
       `stopPropagation()`：这次点击不往上冒（画布那边有拖拽/双击手势，别误触）。 */
    var PANES = [];
    /** 注册一块可收起的面板 / 浮窗。
     *  opt.minTxt / opt.openTxt：**收起态 / 展开态**时按钮上的文字
     *    —— HUD、图例是右上角小方钮（「＋」/「—」）；
     *       左右两栏侧栏是一整条（「▸ 参数」/「◂ 收起参数」）。
     *  🗕 2026-10-14 老师：「参数框和一打开在图前弹出的框都默认折叠，别挡住我看图」
     *    ⇒ 四块（左参数框 / 右资料框 / 图上 HUD / 图上图例）走**同一个** PANES + setPaneMin。
     *  🔴 初始收起态**以 HTML 上写死的 `.is-min` 为准**：打开瞬间就是不挡图的，
     *     不依赖 JS 执行时机、也不会「先展开再收起」闪一下；这里只在末尾校准按钮文字与 aria。 */
    function paneAdd(key, cap, boxId, btnId, opt) {
      var box = $(boxId), btn = $(btnId);
      /* 极简 DOM（自检桩 / 老版本页面）里可能缺这两件 ⇒ **静默跳过**，不留半截状态 */
      if (!box || !btn || !box.classList || !btn.addEventListener) { return; }
      opt = opt || {};
      PANES.push({ key: key, cap: cap, box: box, btn: btn,
                   minTxt: opt.minTxt || '＋', openTxt: opt.openTxt || '—' });
      btn.addEventListener('click', function (ev) {
        /* ⚠️ `stopPropagation()` 不只是「别误触画布」——下面**同一块浮窗**还挂了
           「收起态整枚胶囊点一下展开」的监听；不拦住的话点「—」收起后会立刻冒泡过去再展开。 */
        if (ev && ev.stopPropagation) { ev.stopPropagation(); }
        setPaneMin(key, !box.classList.contains('is-min'));
      });
      /* 收起后**整枚胶囊 / 整条窄条**都是「展开」按钮（点击目标更大，不用去追那 18 px 的「＋」） */
      box.addEventListener('click', function () {
        if (box.classList.contains('is-min')) { setPaneMin(key, false); }
      });
    }
    /** 收起(true) / 展开(false) 指定浮窗或侧栏；返回**生效后**的状态（找不到 ⇒ null）。 */
    function setPaneMin(key, on) {
      for (var i = 0; i < PANES.length; i++) {
        var p = PANES[i];
        if (p.key !== key) { continue; }
        on = !!on;
        if (on) { p.box.classList.add('is-min'); } else { p.box.classList.remove('is-min'); }
        /* 文字随态切换：HUD/图例是「＋」⇄「—」；左右侧栏是「▸ 参数」⇄「◂ 收起参数」 */
        p.btn.textContent = on ? p.minTxt : p.openTxt;
        p.btn.title = (on ? '展开' : '收起') + p.cap;
        if (p.btn.setAttribute) { p.btn.setAttribute('aria-expanded', on ? 'false' : 'true'); }
        return on;
      }
      return null;
    }
    function getPaneMin(key) {
      for (var i = 0; i < PANES.length; i++) {
        if (PANES[i].key === key) { return PANES[i].box.classList.contains('is-min'); }
      }
      return null;
    }
    paneAdd('hud', '标签', 'hud', 'hudMin');
    paneAdd('legend', '图例', 'legend', 'legendMin');
    /* 🗕 2026-10-14 老师：「**参数框**和**一打开在图前弹出的框**都默认折叠，别挡住我看图」
       ⇒ 左右两栏（左=参数框 / 右=资料框）纳入同一套 PANES —— 四块共用 setPaneMin，行为一致。
          `minTxt` 是收起态那枚竖排窄条上的字（要用短词，窄条只有 46 px 宽）。 */
    paneAdd('panelL', '参数框', 'panel', 'panelLToggle',
            { minTxt: '▸ 参数', openTxt: '◂ 收起参数' });
    paneAdd('panelR', '资料框', 'panelR', 'panelRToggle',
            { minTxt: '▸ 数值', openTxt: '◂ 收起数值' });
    /* 与 HTML 上写死的初始 `.is-min` 对齐：按钮文字 / aria-expanded / title 一次校准到位。
       ⚠️ 用**读回当前 class** 的方式（而不是无脑 setPaneMin(key,true)），
          这样将来谁把某一块改成默认展开，这里也自动跟着对。 */
    (function syncPaneInit() {
      for (var i = 0; i < PANES.length; i++) {
        if (PANES[i].box.classList.contains('is-min')) { setPaneMin(PANES[i].key, true); }
      }
    })();

    /* ------------------------------------------------------------- 预设按钮 */
    function setPresets(list, activeId) {
      el.presetBox.innerHTML = '';
      list.forEach(function (p) {
        var b = document.createElement('button');
        b.type = 'button';
        b.dataset.pid = p.id;
        if (p.id === activeId) { b.className = 'active'; }
        b.innerHTML = '<span>' + p.name + '</span><span class="pnote">' + (p.note || '') + '</span>';
        b.addEventListener('click', function () { if (h.onPreset) { h.onPreset(p.id); } });
        el.presetBox.appendChild(b);
      });
    }
    function markPreset(id) {
      Array.prototype.forEach.call(el.presetBox.children, function (b) {
        b.className = (b.dataset.pid === id) ? 'active' : '';
      });
    }

    /* --------------------------------------------------------------- 结构参数 */
    function readParams() {
      return {
        depth: parseInt(el.rngDepth.value, 10),
        turns1: parseInt(el.rngTurns1.value, 10),
        turns: parseInt(el.rngTurns.value, 10),
        fill: parseInt(el.rngFill.value, 10) / 100,
        mode: el.selMode.value,
        wires: parseInt(el.selWires.value, 10)
      };
    }
    function emitParam() {
      el.vDepth.textContent = el.rngDepth.value;
      el.vTurns1.textContent = el.rngTurns1.value;
      el.vTurns.textContent = el.rngTurns.value;
      el.vFill.textContent = (parseInt(el.rngFill.value, 10) / 100).toFixed(2);
      if (h.onParam) { h.onParam(readParams()); }
    }
    ['rngDepth', 'rngTurns1', 'rngTurns', 'rngFill'].forEach(function (id) {
      el[id].addEventListener('input', emitParam);
    });
    el.selMode.addEventListener('change', emitParam);
    el.selWires.addEventListener('change', emitParam);

    /* ------------------------------------------------------------ 🪞 Anu 镜像 */
    /**
     * 🔴🔴 2026-10-08 老师（新功能，原文）：
     *   「结构参数 里面 点一下 **anu镜像**，就把 anu **以中轴为镜**、把左右反过来。
     *     这样俯视图看 anu 的双丝，**顺时针沿着直锥下旋**就变**逆时针下旋**。
     *     这两种 anu 都是存在的，顺时针沿直锥下旋 = **negative 负磁荷**；
     *     反之逆时针 = **positive 正磁荷**。你需要在**网页图片左上角栏标签**里面 label 出来。」
     *
     * 分工：**本层只管「按钮长什么样」**（开/关文案 + 高亮），
     *       几何全在 `anu-heart.js` 的 `whorlPhase()`（φ → −φ）+ `polarityOf()`（记账）。
     *       极性标签由 `anu-app.js` 每帧按 `model.mirror` 写回（`setPolarity`）——
     *       UI 层不自己推极性，免得两条路各算一份、哪天对不上。
     */
    var mirrorOn = false;
    function setMirrorUI(on) {
      mirrorOn = !!on;
      if (el.btnMirror) {
        el.btnMirror.textContent = mirrorOn ? '🪞 镜像：开（已翻面）' : '🪞 镜像：关';
        el.btnMirror.classList.toggle('on', mirrorOn);
      }
    }
    if (el.btnMirror) {
      el.btnMirror.addEventListener('click', function () {
        setMirrorUI(!mirrorOn);
        if (h.onMirror) { h.onMirror(mirrorOn); }
      });
    }

    /* --------------------------------------------------------------- 显示开关 */
    function emitDisplay() {
      if (h.onDisplay) {
        h.onDisplay({
          shell: el.chkShell.checked,
          base: el.chkBase.checked,
          bubbles: el.chkBubbles.checked,
          planes: el.chkPlanes.checked,
          /* 🔴 2026-10-08 老师：「显示 选项卡 里面要有 3d xyz axis 打勾选项」
             ⚠️ 缺省给 `true`（HTML 里 `checked`）—— 老 DOM（自检桩）里没有这个元素时，
                不要让三轴被「默认关」悄悄吃掉。 */
          axes: el.chkAxes ? el.chkAxes.checked : true,
          wireColor: el.chkWireColor ? el.chkWireColor.checked : false,
          levelColor: el.chkLevelColor.checked,
          cmap: el.chkCmap ? el.chkCmap.checked : true,
          microSpp: el.rngMicroSpp ? parseInt(el.rngMicroSpp.value, 10) : 14,
          splineSub: el.rngSplineSub ? parseInt(el.rngSplineSub.value, 10) : 2,
          bubbleSize: parseInt(el.rngBubble.value, 10) / 10,
          /* koilon 珍珠：**最细一级每匝**几颗。🔴 默认 7（老师 2026-10-08 第 ④ 条） */
          pearls: el.rngPearls ? parseInt(el.rngPearls.value, 10) : 7,
          lineBright: el.rngLineBright ? (parseInt(el.rngLineBright.value, 10) / 100) : 0.55,
          /* 🔴 2026-10-08：原「苹果壳厚」滑块已**并入**「双丝分离」（两者在 radOffsets() 里
             对同一个量 `layer` 的导数完全相同 ⇒ 是同一个旋钮）。
             壳厚从此是**内部常量** = 参考壳厚 2·coilRThick = 0.072（两层恰好相切），不再由 UI 上报。 */
          shellGap: 0.072,
          /* 🔴 默认 'both'（弹簧边同时贴锥壁、内程也外移）—— 与 HTML `selected` / DEFAULTS 三处一致 */
          surfaceTangent: el.selSurface ? el.selSurface.value : 'both',
          /* 🔴 老师第 ⑥⑦ 条：双丝分离 / 外场形态 / 锥半角（都改几何） */
          spread: el.rngSpread ? (parseInt(el.rngSpread.value, 10) / 1000) : 0,
          fieldShape: el.rngField ? (parseInt(el.rngField.value, 10) / 100) : 1,
          tubeHalfAngle: el.rngTubeAngle ? (parseInt(el.rngTubeAngle.value, 10) / TUBE_SLIDER) : 2.95
        });
      }
    }
    ['chkShell', 'chkBase', 'chkBubbles', 'chkPlanes', 'chkLevelColor'].forEach(function (id) {
      el[id].addEventListener('change', emitDisplay);
    });
    /* 🔴 3D XYZ 坐标轴：只改渲染可见性（不重建几何）⇒ 同样走 emitDisplay。
       ⚠️ 用**独立判空**而**不是**塞进上面那个数组 —— 老 DOM 桩里没有这个元素。 */
    if (el.chkAxes) { el.chkAxes.addEventListener('change', emitDisplay); }
    if (el.rngLineBright) {
      el.rngLineBright.addEventListener('input', function () {
        if (el.vLineBright) { el.vLineBright.textContent = (parseInt(el.rngLineBright.value, 10) / 100).toFixed(2); }
        emitDisplay();
      });
    }
    /* ⚠️ 2026-10-08：原先这里有一个「7 细族相位速度倍率」滑块。
       老师说「**两族的动力学公式是一样的，两族就是旋转了 180 度**」——
       给两族各配一个速度本身就违背了这个前提，故**整体删除**：
       现在 10 根丝共用 `anu-heart.js` 里那**一个** ω = turnsPerLeg，
       粗 / 细的差别只在几何半径（coilRThick vs coilR、外壁 vs 内壁）。 */
    /* 弹簧边贴壁方式：改的是**几何**，回调里会触发重建。
       ⚠️ 2026-10-08：这里原来还有一个「苹果壳厚」滑块 —— 它与下面的「双丝分离」
       在 `radOffsets()` 里动的是**同一个量**（`layer` 的 ±Δ/2），已删除（老师：「功能重复了」）。 */
    if (el.selSurface) { el.selSurface.addEventListener('change', emitDisplay); }
    /* 🔴 第 ⑥ 条「双丝分离」：改**几何**（丝的径向落点） ⇒ 走 emitDisplay → 重建 */
    if (el.rngSpread) {
      el.rngSpread.addEventListener('input', function () {
        if (el.vSpread) { el.vSpread.textContent = (parseInt(el.rngSpread.value, 10) / 1000).toFixed(3); }
        emitDisplay();
      });
    }
    /* 🔴 第 ⑥⑦ 条「外场形态 / 锥半角」：改**几何**（子午线、上下孔、锥壁） ⇒ 重建 */
    if (el.rngField) {
      el.rngField.addEventListener('input', function () {
        /* ⚠️ 这里原来**漏了**写回 `vField`（数字只在按钮/预设走 `setFieldShape` 时才更新）
           ⇒ 老师拖动「外场边界形态」滑块时，旁边那个 1.00 死活不动，看着像滑块没反应。
           与 `rngTubeAngle` → `vTubeAngle` 对齐。 */
        syncFieldBtns(parseInt(el.rngField.value, 10) / 100);
        if (el.vField) { el.vField.textContent = (parseInt(el.rngField.value, 10) / 100).toFixed(2); }
        emitDisplay();
      });
    }
    if (el.rngTubeAngle) {
      el.rngTubeAngle.addEventListener('input', function () {
        if (el.vTubeAngle) { el.vTubeAngle.textContent = (parseInt(el.rngTubeAngle.value, 10) / TUBE_SLIDER).toFixed(3); }
        emitDisplay();
      });
    }
    /** 两个按钮「外场球面切片 / 苹果切片」的高亮与滑块同步（老师第 ⑥ 条：可以互换） */
    function syncFieldBtns(f) {
      /* 滑块区间是 [0.1, 1]（老师要求下限 0.1）⇒ 高亮阈值取中点 0.55 */
      var isApple = (f >= 0.55);
      if (el.btnSphere) { el.btnSphere.classList.toggle('on', !isApple); }
      if (el.btnApple) { el.btnApple.classList.toggle('on', isApple); }
    }
    function setFieldShape(f, fire) {
      if (!el.rngField) { return; }
      /* 🔴 2026-10-08 老师：「外场边界形态值由于是 h 公式的分母，建议最小值从 0.1 开始到 1」
         ⇒ 下限**从滑块自身的 min 属性读**（不在这里写死 0.1，免得哪天改了 min 两边对不上）。 */
      var lo = (parseFloat(el.rngField.min) || 0) / 100;
      el.rngField.value = Math.round(Math.max(lo, Math.min(1, f)) * 100);
      if (el.vField) { el.vField.textContent = (parseInt(el.rngField.value, 10) / 100).toFixed(2); }
      syncFieldBtns(parseInt(el.rngField.value, 10) / 100);
      if (fire !== false) { emitDisplay(); }
    }
    if (el.btnSphere) { el.btnSphere.addEventListener('click', function () { setFieldShape(0); }); }
    if (el.btnApple) { el.btnApple.addEventListener('click', function () { setFieldShape(1); }); }
    /* 🔴 第 ⑦ 条：Sin 呼吸播放 + 周期 */
    if (el.chkBreath) {
      el.chkBreath.addEventListener('change', function () {
        if (h.onBreath) { h.onBreath(el.chkBreath.checked); }
      });
    }
    if (el.rngBreath) {
      el.rngBreath.addEventListener('input', function () {
        if (el.vBreath) { el.vBreath.textContent = el.rngBreath.value; }
        if (h.onBreathPeriod) { h.onBreathPeriod(parseFloat(el.rngBreath.value)); }
      });
    }
    if (el.btnGif) { el.btnGif.addEventListener('click', function () { if (h.onGif) { h.onGif(); } }); }
    if (el.btnGifGrow) { el.btnGifGrow.addEventListener('click', function () { if (h.onGifGrow) { h.onGifGrow(); } }); }
    if (el.btnGifZoom) { el.btnGifZoom.addEventListener('click', function () { if (h.onGifZoom) { h.onGifZoom(); } }); }
    /* 🔴 弹簧采样密度（点/匝）：**必须是 7 的倍数** —— 滑块 step=7，天然锁死。
       改的是**几何**（重算弹簧点数），回调里会触发重建。 */
    if (el.rngMicroSpp) {
      el.rngMicroSpp.addEventListener('input', function () {
        if (el.vMicroSpp) { el.vMicroSpp.textContent = el.rngMicroSpp.value; }
        emitDisplay();
      });
    }
    /* 🔴 B-spline 平滑细分倍数（1 = 关闭裸折线）。只重建线的几何，不重建模型。 */
    if (el.rngSplineSub) {
      el.rngSplineSub.addEventListener('input', function () {
        var k = parseInt(el.rngSplineSub.value, 10);
        if (el.vSplineSub) { el.vSplineSub.textContent = (k <= 1 ? '关（裸折线）' : '×' + k); }
        emitDisplay();
      });
    }
    /* 三种着色互斥：双色图（粗 hot / 细 rainbow） ／ 按丝 ／ 按阶 */
    if (el.chkCmap) {
      el.chkCmap.addEventListener('change', function () {
        if (el.chkCmap.checked) {
          if (el.chkWireColor) { el.chkWireColor.checked = false; }
          if (el.chkLevelColor) { el.chkLevelColor.checked = false; }
        }
        emitDisplay();
      });
    }
    /* 「双色图 / 按丝着色 / 按阶着色」三者互斥：勾一个自动取消另外两个 */
    if (el.chkWireColor) {
      el.chkWireColor.addEventListener('change', function () {
        if (el.chkWireColor.checked) {
          el.chkLevelColor.checked = false;
          if (el.chkCmap) { el.chkCmap.checked = false; }
        }
        emitDisplay();
      });
    }
    el.chkLevelColor.addEventListener('change', function () {
      if (el.chkLevelColor.checked) {
        if (el.chkWireColor) { el.chkWireColor.checked = false; }
        if (el.chkCmap) { el.chkCmap.checked = false; }
      }
      emitDisplay();
    });
    el.rngBubble.addEventListener('input', function () {
      el.vBubble.textContent = (parseInt(el.rngBubble.value, 10) / 10).toFixed(1);
      emitDisplay();
    });
    if (el.rngPearls) {
      el.rngPearls.addEventListener('input', function () {
        var v = parseInt(el.rngPearls.value, 10);
        el.vPearls.textContent = (v === 1 ? '每匝 1 颗' : '每匝 ' + v + ' 颗');
        emitDisplay();
      });
    }

    /* --------------------------------------------------------------- 播放/视图 */
    el.btnPlay.addEventListener('click', function () { if (h.onPlay) { h.onPlay(); } });
    el.btnZoomPlay.addEventListener('click', function () { if (h.onZoomPlay) { h.onZoomPlay(); } });
    el.rngGrowth.addEventListener('input', function () {
      var v = parseInt(el.rngGrowth.value, 10) / 1000;
      el.vGrowth.textContent = Math.round(v * 100) + '%';
      if (h.onGrowth) { h.onGrowth(v); }
    });
    el.rngSpeed.addEventListener('input', function () {
      var v = parseInt(el.rngSpeed.value, 10) / 100;
      el.vSpeed.textContent = v.toFixed(2);
      if (h.onSpeed) { h.onSpeed(v); }
    });
    el.chkRotate.addEventListener('change', function () { if (h.onRotate) { h.onRotate(el.chkRotate.checked); } });
    /* 🔴 老师 2026-10-08 第 ⑨ 条：原点下移量（屏高比例）。
       **不改几何** ⇒ 只走 onDisplay（`anu-app.js` 的 `readDisplayFromDOM` 会读它）。 */
    if (el.rngViewDrop) {
      el.rngViewDrop.addEventListener('input', function () {
        var v = parseInt(el.rngViewDrop.value, 10) / 100;
        if (el.vViewDrop) { el.vViewDrop.textContent = v.toFixed(2); }
        if (h.onDisplay) { h.onDisplay(); }
      });
    }
    el.btnReset.addEventListener('click', function () { if (h.onReset) { h.onReset(); } });
    el.btnTop.addEventListener('click', function () { if (h.onTop) { h.onTop(); } });
    el.btnTheme.addEventListener('click', function () { if (h.onTheme) { h.onTheme(); } });

    /* ------------------------------------------------------------------- API */
    var api = {
      setPresets: setPresets,
      markPreset: markPreset,
      /** 🪞 回写「Anu 镜像」按钮的开/关外观（预设 / 重置 / syncControls 时用）。
       *  **只改外观、不触发 onMirror** —— 否则「回写」会反过来再触发一次重建。 */
      markMirror: function (on) { setMirrorUI(on); },
      /**
       * 参数区的「模式」切换。
       *  · heart       ：D = 递归层数（**生效**，逐级 ×7 细分）；
       *                  T₁ = 每根 whorl 那根 spring 的匝数（**生效**，文献 1680）
       *  · coil / ladder：T₁ = 第 1 阶 spirilla 匝数（可调，3~1684）；T 固定 7 匝（第 2–7 阶）
       *  （旧蛋形 `ovoid` 分支——「T₁ 不参与建模，禁用以免误解」——已随预设①b 删除。）
       */
      setParamMode: function (mode) {
        el.rngTurns1.disabled = false;        /* T₁ 在两种模式下都生效（爱心 = spring 匝数） */
        el.rngTurns.disabled = true;          /* T 恒为 7：第 2–7 阶 spirilla 均 7 匝 */
      },
      updateHUD: function (i) {
        el.hudMode.textContent = i.modeLabel;
        var depthTxt = i.depth + ' / ' + (i.reqDepth != null ? i.reqDepth : i.depth);
        if (i.depthCapped) { depthTxt += '（已限阶）'; }
        if (i.autoReduced) { depthTxt += '（已降采样）'; }
        el.hudDepth.textContent = depthTxt;
        el.hudTurn.textContent = i.turn;
        el.hudAccum.textContent = fmt(i.accum);
        el.hudRadius.textContent = i.radius.toFixed(5);
        el.hudRatio.textContent = i.ratioText == null ? '—' : i.ratioText;
        el.hudSpr.textContent = i.spirillaeText == null ? '—' : i.spirillaeText;
        /* `i.points` 已经是**整组之和**（anu-app 里对 bundle 求过和） ⇒ 不能再乘一次丝数。
           旧写法「253,180 × 11 丝」会被读成 278 万，实际总数就是 253,180。 */
        el.hudPoints.textContent = fmt(i.points) + (i.wires > 1 ? '（' + i.wires + ' 丝合计）' : '');
        el.hudAngle.textContent = i.angleText;
      },
      /**
       * 🪞 舞台左上角的**磁荷极性标签**（老师：「在网页图片左上角栏标签里面 label 出来」）。
       * 每帧由 `anu-app.js` 按当前 `model.mirror` 写回 —— 单一数据源是
       * `anu-heart.js: polarityOf(c)`，这里不重新判断、只负责渲染。
       * @param {'positive'|'negative'} pol  极性
       * @param {string} [spinText] 「顺时针下旋」/「逆时针下旋」（省略则按极性取默认）
       */
      /**
       * 🔴 2026-10-08 老师（锥半角 ↔ 外场边界形态 的耦合）：
       * 在「中轴锥管半锥角」那一组下面显示**参考角 / 当前生效角 / 锥高倍率**三个读数。
       * 数值由 `anu-app.js` 用 `Heart.coneState()` 算好再推进来（UI 层不重复实现那条公式）。
       * @param {number} eff 当前生效半角（度）—— 呼吸时随外场形态实时变
       * @param {number} mul 锥高倍率（相对出厂基准 2.95°）
       * @param {number} [ref] 参考半角（度）= **苹果态**的半角（`state.angleRef`）
       */
      setTubeEff: function (eff, mul, ref) {
        /* ⚠️ `vTubeAngleRef` **不再**读滑块 —— 滑块现在显示的是**当前生效角**（会随呼吸动），
           而「参考角」是另一个量（苹果态基准）⇒ 必须由 app 显式传进来。 */
        if (el.vTubeAngleRef && ref != null) { el.vTubeAngleRef.textContent = (+ref).toFixed(2) + '°'; }
        if (el.vTubeEff) { el.vTubeEff.textContent = (+eff).toFixed(3) + '°'; }
        if (el.vTubeMul) { el.vTubeMul.textContent = '×' + (+mul).toFixed(2); }
      },
      setPolarity: function (pol, spinText) {
        if (!el.hudPolarity) { return; }
        var pos = (pol === 'positive');
        /* ⚠️ 只用 classList（**不写 className**）：那样会整段覆盖 class 串，
           既容易把别的类抹掉，也让 DOM 桩件（自检里那套 `_cls` Set）看不到变化。 */
        if (el.hudPolarity.classList) {
          el.hudPolarity.classList.add('hud-polarity');
          el.hudPolarity.classList.toggle('is-pos', pos);
          el.hudPolarity.classList.toggle('is-neg', !pos);
        }
        el.hudPolarity.innerHTML =
          '极性（磁荷）：<b>' + (pos ? 'positive 正磁荷' : 'negative 负磁荷') + '</b>' +
          '<span class="pol-pill">' +
          (spinText || (pos ? '逆时针下旋' : '顺时针下旋')) + '</span>';
      },
      setPlayState: function (playing) {
        el.btnPlay.classList.toggle('on', !!playing);
        el.btnPlay.textContent = playing ? '⏸ 暂停' : '▶ 生长动画';
      },
      setZoomState: function (on) { el.btnZoomPlay.classList.toggle('on', !!on); },
      setGrowthSlider: function (g) {
        el.rngGrowth.value = Math.round(g * 1000);
        el.vGrowth.textContent = Math.round(g * 100) + '%';
      },
      syncControls: function (s) {
        el.rngDepth.value = s.depth; el.vDepth.textContent = s.depth;
        /* T₁ 上限 1684（文献原型 1680 之上留一点微调余量）；标签如实显示 */
        var max1 = parseInt(el.rngTurns1.max, 10) || 1684;
        el.rngTurns1.value = Math.min(s.turns1, max1);
        /* T₁ 在爱心（spring 匝数）与阶梯（第 1 阶 spirilla）两种模式下都**真实生效**
           ⇒ 一个口径显示就够（旧蛋形那句「按 13 圈示意，此项不生效」已删除）。 */
        el.vTurns1.textContent = String(s.turns1);
        /* T 恒为 7：第 2 阶 spirillae 起，2~7 阶每级 7 匝 */
        el.rngTurns.value = 7; el.vTurns.textContent = '7';
        el.rngFill.value = Math.round(s.fill * 100); el.vFill.textContent = s.fill.toFixed(2);
        el.selMode.value = s.mode;
        el.selWires.value = String(s.wires);
        /* 弹簧边贴壁方式：由 state 回写（预设可能带不同默认）。
           ⚠️ 「苹果壳厚」滑块已删除（与「双丝分离」重复），不再回写。 */
        if (el.selSurface && s.surfaceTangent) { el.selSurface.value = s.surfaceTangent; }
        /* 🔴 老师第 ⑥⑦ 条：双丝分离 / 外场形态 / 锥半角 */
        if (el.rngSpread && s.spread != null) {
          el.rngSpread.value = Math.round(s.spread * 1000);
          if (el.vSpread) { el.vSpread.textContent = (+s.spread).toFixed(3); }
        }
        if (el.rngField && s.fieldShape != null) { setFieldShape(s.fieldShape, false); }
        if (el.rngTubeAngle && s.tubeHalfAngle != null) {
          el.rngTubeAngle.value = Math.round(s.tubeHalfAngle * TUBE_SLIDER);
          if (el.vTubeAngle) { el.vTubeAngle.textContent = (+s.tubeHalfAngle).toFixed(3); }
        }
        /* 🪞 Anu 镜像：**只写按钮外观**（setMirrorUI 不发 onMirror）⇒ 回写不会引起二次重建 */
        if (s.mirror != null) { setMirrorUI(s.mirror); }
        /* 🔴 3D XYZ 坐标轴（默认开）—— 由 state 回写勾选状态 */
        if (el.chkAxes && s.showAxes != null) { el.chkAxes.checked = !!s.showAxes; }
        if (el.chkBreath) { el.chkBreath.checked = !!s.breathing; }
        if (el.rngBreath && s.breathPeriod != null) {
          el.rngBreath.value = s.breathPeriod;
          if (el.vBreath) { el.vBreath.textContent = String(s.breathPeriod); }
        }
        /* 三向互斥的着色开关：由 state.colorMode 反推该勾哪一个 */
        if (el.chkCmap) { el.chkCmap.checked = (s.colorMode === 'cmap'); }
        if (el.chkWireColor) { el.chkWireColor.checked = (s.colorMode === 'wire'); }
        if (el.chkLevelColor) { el.chkLevelColor.checked = (s.colorMode === 'level'); }
        /* 弹簧采样（点/匝，锁 7 的倍数）：回写时也向 7 的倍数量化 */
        if (el.rngMicroSpp && s.microSpp != null) {
          var ms = Math.max(7, 7 * Math.round(s.microSpp / 7));
          el.rngMicroSpp.value = ms;
          if (el.vMicroSpp) { el.vMicroSpp.textContent = String(ms); }
        }
        /* B-spline 细分倍数：1 = 关闭（裸折线） */
        if (el.rngSplineSub && s.splineSub != null) {
          el.rngSplineSub.value = s.splineSub;
          if (el.vSplineSub) {
            el.vSplineSub.textContent = (s.splineSub <= 1 ? '关（裸折线）' : '×' + s.splineSub);
          }
        }
        /* koilon 珍珠密度（最细一级每匝几颗） */
        if (el.rngPearls && s.pearlsPerTurn != null) {
          el.rngPearls.value = s.pearlsPerTurn;
          if (el.vPearls) {
            el.vPearls.textContent = (s.pearlsPerTurn === 1
              ? '每匝 1 颗' : '每匝 ' + s.pearlsPerTurn + ' 颗');
          }
        }
        if (el.chkRotate) { el.chkRotate.checked = !!s.rotate; }
        /* 🔴 第 ⑨ 条：原点下移（屏高比例） */
        if (el.rngViewDrop && s.viewDrop != null) {
          el.rngViewDrop.value = Math.round(s.viewDrop * 100);
          if (el.vViewDrop) { el.vViewDrop.textContent = (+s.viewDrop).toFixed(2); }
        }
      },
      /* `holdMs` = 停留多久自动收起（默认 5200 ms）。
         2026-10-19 老师：「打开网页后中间的文字框保留 0.5 秒就关闭」
         ⇒ 首屏那次调用传 500（见 anu-app.js 的 boot 末尾），其它提示仍是默认时长。 */
      caption: function (html, sticky, holdMs) {
        el.caption.innerHTML = html;
        el.caption.classList.add('show');
        if (api._capT) { clearTimeout(api._capT); api._capT = null; }
        if (!sticky) {
          api._capT = setTimeout(function () { el.caption.classList.remove('show'); },
            (holdMs > 0 ? holdMs : 5200));
        }
      },
      clearCaption: function () { el.caption.classList.remove('show'); },
      toast: function (msg) {
        /* ⚠️ 必须用 innerHTML（原来写的是 textContent）——`toastMode()` / `toastOnce()` 传进来的
           是**带 <b> 的 HTML 片段**，用 textContent 写会把 `<b>` 当字面文本显示在页面上，
           老师会看到「缠绕模式 = <b>全环向（经典超螺旋）</b>」这种带标签的丑串。
           与 `caption()` 保持一致；内容全部由本模块自己生成，无外部输入。 */
        el.toast.innerHTML = msg;
        el.toast.classList.add('show');
        if (api._toT) { clearTimeout(api._toT); }
        api._toT = setTimeout(function () { el.toast.classList.remove('show'); }, 2200);
      },
      themeLabel: function (dark) { el.btnTheme.textContent = dark ? '切换亮色' : '切换暗色'; },
      /** 🔴 第 ⑥ 条：由外部（按钮 / 呼吸播放 / 预设）设置外场形态，并同步滑块与两个按钮 */
      /**
       * 🔴 2026-10-08 老师（本轮）：「外场边界形态和中轴锥管半锥角（度）要**同时同步动**」。
       * 把「中轴锥管半锥角」滑块挪到指定角度 —— **纯显示、不触发事件**
       * （与 `setFieldShape` 同一套路：fire 由调用者统一走 `emitDisplay`）。
       * 呼吸动画每帧调用它 ⇒ 老师能看到**两根滑块一起动**。
       * @param {number} deg 当前生效半角（度）
       */
      setTubeAngle: function (deg) {
        if (!el.rngTubeAngle) { return; }
        var lo = (parseFloat(el.rngTubeAngle.min) || 0) / TUBE_SLIDER;
        var hi = (parseFloat(el.rngTubeAngle.max) || 2950) / TUBE_SLIDER;
        var v = Math.max(lo, Math.min(hi, +deg));
        el.rngTubeAngle.value = Math.round(v * TUBE_SLIDER);
        /* ⚠️ 必须 **3 位小数**（= 滑块分辨率 0.001°）—— 与 HTML 初值 ("2.950")、
           `syncControls` 回写、`rngTubeAngle` 的 input handler **三处口径统一**。
           原先这里写 `toFixed(2)` ⇒ 球形态显示成 "0.29"（而 HUD 那边是 0.295°），
           拖到 2.213° 也会显示成 "2.21"，与滑块实际值不符。 */
        if (el.vTubeAngle) { el.vTubeAngle.textContent = v.toFixed(3); }
      },
      setFieldShape: function (f) { setFieldShape(f, false); },
      /** 🔴 第 ⑦ 条：呼吸播放按钮的勾选态（由播放循环结束时回写） */
      setBreathUI: function (on) { if (el.chkBreath) { el.chkBreath.checked = !!on; } },
      /** 浮窗右上角「—」收起：程序化开关 + 读状态（自检用；将来要加键盘快捷键也走这里）。
       *  `key` ∈ 'hud'（左上信息浮窗）| 'legend'（右上图例浮窗）。 */
      setPaneMin: setPaneMin,
      getPaneMin: getPaneMin,
      /** 已绑上的浮窗数（自检用：正常页面上是 **2** = HUD + 图例） */
      paneCount: function () { return PANES.length; },
      /** GIF 导出：进度 / 结果（≤5MB 提示 + 预览 + 下载链接）。
       *  `which`（可选，'breath' | 'growth' | 'zoom'）—— 把状态写进对应的框；
       *  缺省 = 'breath'（保持旧调用兼容）。 */
      gifStatus: function (html, which) { gifBoxOf(which).innerHTML = html || ''; },
      gifProgress: function (done, total, which) {
        gifBoxOf(which).innerHTML = '正在录 GIF：' + done + ' / ' + total + ' 帧 …';
      },
      setToggle: function (id, v) { if (el[id]) { el[id].checked = v; } },
      setSlider: function (id, v) { if (el[id]) { el[id].value = v; } }
    };
    return api;
  }

  function fmt(n) {
    if (n == null) { return '—'; }
    if (n >= 1e9) { return (n / 1e9).toFixed(2) + '×10⁹'; }
    if (n >= 1e6) { return (n / 1e6).toFixed(2) + 'M'; }
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  return { create: create };
});
