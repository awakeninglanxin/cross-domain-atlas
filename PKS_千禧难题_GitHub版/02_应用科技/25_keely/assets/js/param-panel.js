/* ============================================================
   param-panel.js —— 右侧「可拖动参数浮窗」+ 图内 HUD 收起（通用件）
   配套 SOUL 铁律：
     · 184：任何覆盖在图上的浮窗/读数板，右上角必须有可收起按钮；
            收起后只留标题条，不删 DOM（收起不丢状态）；状态入 localStorage。
     · 185：出图类交付物默认带「Shift + 拖动搬动物体本体」——
            这里只提供浮窗与本文件的 hud()，物体搬动见各页的 bindShiftPan()。
   依赖：无。localStorage 不可用时静默降级。
   用法：
     ParamPanel.attach({win:'paramWin', head:'pwHead', toggle:'pwToggle', key:'warp2'});
     ParamPanel.hud(document.querySelectorAll('.viewer .hud'));
   ============================================================ */
(function (global) {
  'use strict';

  function lsGet(k, d) { try { var v = global.localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { global.localStorage.setItem(k, String(v)); } catch (e) {} }
  function isNum(x) { return typeof x === 'number' && isFinite(x); }
  function vw() { return isNum(global.innerWidth) ? global.innerWidth : (document.documentElement.clientWidth || 1280); }
  function vh() { return isNum(global.innerHeight) ? global.innerHeight : (document.documentElement.clientHeight || 860); }
  var NARROW = 1120;

  /* ------------------------------------------------------------------
     一、可拖动参数浮窗
     ------------------------------------------------------------------ */
  function attach(cfg) {
    cfg = cfg || {};
    var box = document.getElementById(cfg.win);
    if (!box) return null;
    var head = document.getElementById(cfg.head) || box.querySelector('.pw-head');
    var btn = cfg.toggle ? document.getElementById(cfg.toggle) : box.querySelector('.pw-btn');
    var key = 'paramwin.' + (cfg.key || cfg.win);
    var dragging = false, ox = 0, oy = 0;

    /* 夹在视口里：至少留出标题条可见，避免拖出屏外找不回来 */
    function place(x, y) {
      var w = box.offsetWidth || 322, h = box.offsetHeight || 320;
      var maxX = Math.max(4, vw() - w - 4);
      var maxY = Math.max(4, vh() - Math.min(h, 74) - 4);
      x = Math.min(Math.max(4, x), maxX);
      y = Math.min(Math.max(4, y), maxY);
      box.style.left = x + 'px';
      box.style.top = y + 'px';
      box.style.right = 'auto';
      return { x: x, y: y };
    }
    function clearPos() { box.style.left = ''; box.style.top = ''; box.style.right = ''; }

    function setCollapsed(c) {
      c = !!c;
      if (c) box.classList.add('collapsed'); else box.classList.remove('collapsed');
      if (btn) {
        btn.textContent = c ? '+' : '\u2212';
        btn.setAttribute('aria-expanded', c ? 'false' : 'true');
        btn.title = c ? '展开参数面板' : '收起参数面板';
        btn.setAttribute('aria-label', btn.title);
      }
      lsSet(key + '.collapsed', c ? '1' : '0');
    }

    /* ① 恢复上次收起态；首次访问：窄屏默认收起 */
    var savedC = lsGet(key + '.collapsed', null);
    setCollapsed(savedC === null ? (vw() < NARROW) : savedC === '1');

    /* ② 恢复上次位置（窄屏忽略，走 CSS 底部抽屉） */
    if (vw() >= NARROW) {
      var m = /^(-?[\d.]+),(-?[\d.]+)$/.exec(lsGet(key + '.pos', '') || '');
      if (m && isNum(parseFloat(m[1])) && isNum(parseFloat(m[2]))) place(parseFloat(m[1]), parseFloat(m[2]));
    }

    if (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        setCollapsed(!box.classList.contains('collapsed'));
      });
    }

    function isBtn(t) { return !!(t && (t.tagName === 'BUTTON' || (t.closest && t.closest('button')))); }
    function start(cx, cy) {
      var r = box.getBoundingClientRect();
      dragging = true; ox = cx - r.left; oy = cy - r.top;
      box.style.right = 'auto';
      box.classList.add('dragging');
      document.body.style.userSelect = 'none';
    }
    function move(cx, cy) { if (dragging) place(cx - ox, cy - oy); }
    function end() {
      if (!dragging) return;
      dragging = false;
      box.classList.remove('dragging');
      document.body.style.userSelect = '';
      var x = parseFloat(box.style.left), y = parseFloat(box.style.top);
      if (isNum(x) && isNum(y)) lsSet(key + '.pos', x + ',' + y);
    }

    if (head) {
      head.addEventListener('mousedown', function (e) {
        if (e.button !== 0 || isBtn(e.target)) return;
        e.preventDefault();
        start(e.clientX, e.clientY);
      });
      head.addEventListener('touchstart', function (e) {
        if (isBtn(e.target) || !e.touches || !e.touches[0]) return;
        start(e.touches[0].clientX, e.touches[0].clientY);
      }, { passive: true });
      head.addEventListener('dblclick', function () { clearPos(); });   /* 双击标题栏 → 回到默认位 */
    }
    global.addEventListener('mousemove', function (e) { move(e.clientX, e.clientY); });
    global.addEventListener('mouseup', end);
    global.addEventListener('blur', end);          /* 不监听 mouseleave：拖出窗口也要跟手 */
    global.addEventListener('touchmove', function (e) {
      if (!dragging || !e.touches || !e.touches[0]) return;
      move(e.touches[0].clientX, e.touches[0].clientY);
      if (e.cancelable) e.preventDefault();
    }, { passive: false });
    global.addEventListener('touchend', end);
    global.addEventListener('resize', function () {
      if (vw() < NARROW) { clearPos(); return; }                 /* 窄屏改底部抽屉 */
      var x = parseFloat(box.style.left);
      if (isNum(x)) place(x, parseFloat(box.style.top) || 0);
    });

    return { collapsible: true, setCollapsed: setCollapsed, place: place, reset: clearPos };
  }

  /* ------------------------------------------------------------------
     二、图内 HUD 批量加「可收起」按钮（铁律 184）
     没写 .hud-body 的元素：自动把现有子节点包一层 → 不动模板结构
     ⚠️ 若 HUD 内容由 JS 反复 innerHTML 重写，必须给显式 .hud-body，
        并让 JS 只写 body（否则按钮会被冲掉）。
     ------------------------------------------------------------------ */
  function hud(list) {
    var arr = !list ? document.querySelectorAll('.viewer .hud')
            : (list.length === undefined ? [list] : list);
    Array.prototype.forEach.call(arr, function (el) {
      if (!el || el.__hudDone) return;
      el.__hudDone = true;
      var body = el.querySelector('.hud-body');
      if (!body) {
        body = document.createElement('div');
        body.className = 'hud-body';
        while (el.firstChild) body.appendChild(el.firstChild);
        el.appendChild(body);
      }
      var id = el.id || ('hud-' + Math.random().toString(36).slice(2, 7));
      var k = 'hud.' + id + '.collapsed';
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'hud-toggle';
      b.setAttribute('aria-expanded', 'true');
      b.title = '收起';
      b.setAttribute('aria-label', '收起该读数板');
      b.textContent = '\u2212';
      function setC(c) {
        c = !!c;
        if (c) el.classList.add('collapsed'); else el.classList.remove('collapsed');
        b.textContent = c ? '+' : '\u2212';
        b.title = c ? '展开' : '收起';
        b.setAttribute('aria-expanded', c ? 'false' : 'true');
        lsSet(k, c ? '1' : '0');
      }
      b.addEventListener('click', function (e) { e.stopPropagation(); setC(!el.classList.contains('collapsed')); });
      el.insertBefore(b, el.firstChild);
      setC(lsGet(k, '0') === '1');
    });
  }

  /* ------------------------------------------------------------------
     三、Shift + 拖动 = 搬动物体本体（铁律 185）
     两条通道互不干扰：
       无修饰键 → OrbitControls 原行为（转相机/缩放），本函数完全不介入
       Shift    → 抓住 object 在「垂直于视线」的平面里平移；相机/地面/坐标轴纹丝不动
     实现要点与铁律 185 一致：共用一套读取、就地切换要重置基准点、必夹边界、
     必给两条归位路（双击画布 + 面板按钮）、不监听 mouseleave、只兜 window blur。
     ------------------------------------------------------------------ */
  function bindShiftPan(o) {
    o = o || {};
    var el = typeof o.viewer === 'string' ? document.getElementById(o.viewer) : o.viewer;
    if (!el || !o.object || !o.camera || !global.THREE) return null;
    var camera = o.camera, obj = o.object, target = o.target || null;
    var limit = isNum(o.limit) ? o.limit : 30;
    var yMin = isNum(o.yMin) ? o.yMin : -limit;
    var onDelta = typeof o.onDelta === 'function' ? o.onDelta : null;
    var R = new THREE.Vector3(), U = new THREE.Vector3(), F = new THREE.Vector3();
    var off = { x: 0, y: 0, z: 0 };
    var px = 0, py = 0, on = false;

    function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

    /* 屏幕像素 → 世界位移：透视相机在距 target D 处的可见高度 = 2·D·tan(fov/2) */
    function panDelta(dx, dy) {
      var D = target ? camera.position.distanceTo(target) : camera.position.length();
      var wpp = (2 * Math.tan(camera.fov * Math.PI / 360) * D) / Math.max(el.clientHeight || 500, 1);
      camera.updateMatrixWorld();
      camera.matrixWorld.extractBasis(R, U, F);      /* 相机世界右/上/前 */
      return { x: (R.x * dx - U.x * dy) * wpp,       /* 屏幕 y 向下 ⇒ dy 取负 */
               y: (R.y * dx - U.y * dy) * wpp,
               z: (R.z * dx - U.z * dy) * wpp };
    }
    function apply(dx, dy) {
      var d = panDelta(dx, dy);
      off.x = clamp(off.x + d.x, -limit, limit);
      off.y = clamp(off.y + d.y, yMin, limit);
      off.z = clamp(off.z + d.z, -limit, limit);
      obj.position.set(off.x, off.y, off.z);
      if (onDelta) onDelta(off);
    }
    function home() {
      off.x = off.y = off.z = 0;
      obj.position.set(0, 0, 0);
      if (onDelta) onDelta(off);
    }

    /* 在 capture 阶段拦下带 Shift 的 pointerdown，OrbitControls 就完全收不到（它只监听 pointerdown） */
    function intercept(e) {
      if (!e.shiftKey) return;                       /* 无修饰键 → 原样交给 OrbitControls */
      if (e.stopPropagation) e.stopPropagation();
      if (e.type === 'mousedown' && e.preventDefault) e.preventDefault();  /* 防拖拽选中文字；不 cancel pointerdown，免得 mousemove 被连带压掉 */
      if (e.cancelable && e.type === 'touchstart') e.preventDefault();
      if (on) return;
      on = true; px = e.clientX; py = e.clientY;
      el.style.cursor = 'move';
    }
    el.addEventListener('pointerdown', intercept, true);
    el.addEventListener('mousedown', intercept, true);

    global.addEventListener('mousemove', function (e) {
      if (!on) return;
      /* 中途松开 Shift ⇒ 只重置基准点，避免一次跳出去一大截 */
      if (!e.shiftKey) { px = e.clientX; py = e.clientY; return; }
      apply(e.clientX - px, e.clientY - py);
      px = e.clientX; py = e.clientY;
    });
    function up() { if (!on) return; on = false; el.style.cursor = ''; }
    global.addEventListener('mouseup', up);
    global.addEventListener('blur', up);            /* 切到别的程序收不到 mouseup，会一直粘着 */

    /* 触摸：单指拖动搬物体（触屏无 Shift，故需先经 intercept 置 on；默认不劫持单指旋转） */
    global.addEventListener('touchmove', function (e) {
      if (!on || !e.touches || !e.touches[0]) return;
      apply(e.touches[0].clientX - px, e.touches[0].clientY - py);
      px = e.touches[0].clientX; py = e.touches[0].clientY;
      if (e.cancelable) e.preventDefault();
    }, { passive: false });
    global.addEventListener('touchend', up);
    el.addEventListener('dblclick', home);

    return { home: home, offset: function () { return { x: off.x, y: off.y, z: off.z }; }, panDelta: panDelta };
  }

  /* ------------------------------------------------------------------
     四、参数 → 图 自动跟随（配套 SOUL 铁律 207）
     老师 2026-10-17：「这参数卡里面数值一旦改变，你页面自动跳转到正确的示意图位置
     可以吗？这个是基本常识操作，方便用户看数据变化的图示」
     ⇒ 改完参数**页面自己滚到那张图**，而不是让读者自己去翻。
     用法（页面只需给一张映射表）：
       ParamPanel.follow({
         win:'paramWin', key:'dyn09',            // key 用于记住开关状态
         toggle:'cFollow', status:'vFollow',     // 可省：开关复选框 / 状态文字
         nav:'.topnav',                          // 吸顶导航（落点要减掉它）
         map:{ sTc:'#cvHarsh', sF0:'#cvWave', sVol:'' },     // '' = 明确「不对应图」
         sel:{ '#pino7box':'#cvPinto', '[data-tc]':'#cvHarsh' }  // 按钮组/表格用祖先或属性匹配
       });
     行为约定（不许乱跳）：
       · `input`（拖滑块）先导触发一次，之后 420 ms 冷却 —— 拖的时候页面不抽搐；
       · `change`（下拉/勾选/数字框）、`click`（按钮）不冷却，立刻跳；
       · 目标图已有 ≥55% 落在「导航下沿 ~ 视口底」之间 ⇒ **不跳**（本来就在看，再跳是打扰）；
       · 落点 = 目标顶边 − 吸顶导航高 − 12 px（标题绝不被导航压住）；
       · 找不到图 / 映射为 '' ⇒ 只更新状态文字，**绝不滚动**。
     铁律 207 的可核验出口：window.__follow = {enabled, jumps, skips, last, go(sel)}。
     ------------------------------------------------------------------ */
  function follow(cfg) {
    cfg = cfg || {};
    var box = document.getElementById(cfg.win || 'paramWin');
    if (!box) return null;
    var map = cfg.map || {}, selMap = cfg.sel || {};
    var KEY = 'follow.' + (cfg.key || cfg.win || 'paramWin');
    var tog = cfg.toggle ? document.getElementById(cfg.toggle) : null;
    var stt = cfg.status ? document.getElementById(cfg.status) : null;
    var coolIn = isNum(cfg.cool) ? cfg.cool : 420;
    var enabled = lsGet(KEY, '1') !== '0';
    var lastT = 0, lastSel = '', jumps = 0, skips = 0, last = '';

    function navH() {
      var n = document.querySelector(cfg.nav || '.topnav');
      if (!n) return 0;
      var r = n.getBoundingClientRect();
      return Math.max(0, Math.min(Math.round(r.height), 160));
    }
    function figOf(sel) {
      if (!sel) return null;
      var el = document.querySelector(sel);
      if (!el) return null;
      /* 有 .viz 外壳就滚整块（标题 + 图 + 读数一起进视野），没有就滚节点本身 */
      return (el.closest && el.closest('.viz')) || el;
    }
    function resolve(t) {
      if (!t || t.nodeType !== 1) return null;
      /* ① 直接写了 data-go 的，优先（允许逐控件精调） */
      var g = t.closest ? t.closest('[data-go]') : null;
      if (g) return g.getAttribute('data-go') || '';
      /* ② id 映射表；空串 = 明确「这一项没有图」 */
      if (t.id && Object.prototype.hasOwnProperty.call(map, t.id)) return map[t.id] || '';
      /* ③ 祖先/属性映射（按钮组、表格、动态生成的控件） */
      for (var s in selMap) {
        if (!Object.prototype.hasOwnProperty.call(selMap, s)) continue;
        if (t.closest && t.closest(s)) return selMap[s] || '';
      }
      return null;
    }
    function nameOf(sel) {
      var f = figOf(sel), vt = f && f.querySelector('.vt');
      if (!vt) return sel;
      /* 只取「图 3a · 冒号前的名字」，状态栏放得下 */
      var s = vt.textContent.replace(/\s+/g, ' ').trim();
      return s.length > 24 ? s.slice(0, 24) + '…' : s;
    }
    function setStatus(txt) { if (stt) stt.textContent = txt; }
    function jump(sel, force) {
      var f = figOf(sel);
      if (!f) { skips++; setStatus('找不到 ' + sel); return false; }
      var nh = navH(), r = f.getBoundingClientRect(), vh0 = global.innerHeight;
      var top = Math.max(r.top, nh), bot = Math.min(r.bottom, vh0);
      var need = Math.min(r.height, vh0 - nh);
      var frac = need > 0 ? Math.max(0, bot - top) / need : 0;
      if (!force && frac >= 0.55) { skips++; setStatus('已可见 · ' + nameOf(sel)); return false; }
      var y = Math.round((global.pageYOffset || 0) + r.top - nh - 12);
      var maxY = Math.max(0, (document.documentElement.scrollHeight || 0) - vh0);
      y = Math.max(0, Math.min(y, maxY));
      if (Math.abs(y - (global.pageYOffset || 0)) < 4) { skips++; setStatus('已到位 · ' + nameOf(sel)); return false; }
      try { global.scrollTo({ top: y, behavior: 'smooth' }); }
      catch (e) { global.scrollTo(0, y); }
      jumps++; last = sel; setStatus('→ ' + nameOf(sel));
      return true;
    }
    function onEv(e) {
      if (!enabled) return;
      var t = e.target;
      if (!t || t === tog) return;
      var sel = resolve(t);
      if (sel === null) return;                       /* 压根没配映射 ⇒ 什么都不做 */
      if (sel === '') { setStatus('该项不对应图（只改声音/表格）'); return; }
      var now = Date.now();
      if (e.type === 'input' && now - lastT < coolIn) return;   /* 拖滑块不抽搐 */
      if (sel === lastSel && now - lastT < 120) return;
      lastT = now; lastSel = sel;
      /* ★ 必须晚一拍再量：监听挂在浮窗容器上（capture），比控件自己的 onclick 先跑。
         控件常常会改布局（画布重设尺寸、读数换行、展开一个新块），若当场量位置，
         算出来的落点就是**改之前的**（实测差 462 px：图 3c 的 canvas 重设后整块上移）。
         放到下一个宏任务里，等 DOM 稳定再量，落点才准。 */
      if (typeof setTimeout === 'function') setTimeout(function () { jump(sel, false); }, 0);
      else jump(sel, false);
    }
    box.addEventListener('input', onEv, true);
    box.addEventListener('change', onEv, true);
    box.addEventListener('click', onEv, true);

    if (tog) {
      tog.checked = enabled;
      tog.addEventListener('change', function () {
        enabled = !!tog.checked;
        lsSet(KEY, enabled ? '1' : '0');
        setStatus(enabled ? '跟随已开' : '跟随已关');
      });
    }
    global.__follow = {
      get enabled() { return enabled; }, get jumps() { return jumps; },
      get skips() { return skips; }, get last() { return last; },
      go: function (sel) { return jump(sel, true); },
      reset: function () { jumps = skips = 0; last = lastSel = ''; }
    };
    return { jump: jump, isOn: function () { return enabled; } };
  }

  global.ParamPanel = { attach: attach, hud: hud, bindShiftPan: bindShiftPan,
                        follow: follow, version: '1.2.0' };
})(typeof window !== 'undefined' ? window : this);
