/* dock-core.js — 张祥前系列可视化子页共用右浮窗参数面板
 * SOUL 依据：
 *   F11 / N250  iframe 内控件必须收进宿主右浮窗；镜像控件驱动 iframe 里同一批真实控件，
 *               隐藏原控件条，状态单一来源、不复制状态、不重写 3D 逻辑，读数回读同步
 *   N196 参数在右、能拖能收      N199 尺寸可调       N197 可用空间算出来
 *   N184 HUD 可收起且只放标签     N207 改参数自动把图送到眼前
 *   N241 滑条右侧数字是输入口（双击可输入），与拖滑条走同一个 apply
 *   N51  全局 window.onerror 右下角红框
 *   N79  不用 display:none/block 直接切换（用 class 切换）
 */
(function () {
  'use strict';
  var D = window.Dock = {};
  var root = document.documentElement;
  var $ = function (s, b) { return (b || document).querySelector(s); };
  var $$ = function (s, b) { return Array.prototype.slice.call((b || document).querySelectorAll(s)); };

  /* ---------- N51 全局报错红框 ---------- */
  function showErr(msg) {
    var e = $('#cdErr');
    if (!e) return;
    e.style.display = 'block';
    e.textContent = '[JS 错误] ' + msg;
  }
  window.onerror = function (m, src, line, col) { showErr(m + ' @' + (src || '').split('/').pop() + ':' + line + ':' + col); };
  window.addEventListener('unhandledrejection', function (ev) { showErr('Promise: ' + ev.reason); });

  /* ---------- N197：HUD 让位高度量实际盒高，不写死 ---------- */
  /* 真看截图发现 fixed HUD 会盖住 iframe 内大标题上半截；让 #cdStage 实打实让位。
     HUD 收起后盒子变矮，让位同步收缩，不浪费首屏画布空间。 */
  D.syncHudSpace = function () {
    var hud = $('#cdHud');
    if (!hud) return;
    root.style.setProperty('--cd-hud-h', (hud.offsetTop + hud.offsetHeight + 10) + 'px');
  };
  window.addEventListener('resize', D.syncHudSpace);

  /* ---------- 浮窗：拖动 / 收起 / 宽度 ---------- */
  function bindChrome() {
    var dock = $('#cdDock'), head = $('#cdHead'), grip = $('#cdGrip');
    var dragging = null;
    head.addEventListener('mousedown', function (e) {
      if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
      dragging = { x: e.clientX, y: e.clientY, top: dock.offsetTop, right: root.clientWidth - dock.offsetLeft - dock.offsetWidth };
      e.preventDefault();
    });
    document.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      dock.style.top = Math.max(0, dragging.top + e.clientY - dragging.y) + 'px';
      dock.style.right = Math.max(0, dragging.right - (e.clientX - dragging.x)) + 'px';
    });
    document.addEventListener('mouseup', function () { dragging = null; });

    var resizing = null;
    grip.addEventListener('mousedown', function (e) {
      resizing = { x: e.clientX, w: dock.offsetWidth };
      e.preventDefault(); e.stopPropagation();
    });
    document.addEventListener('mousemove', function (e) {
      if (!resizing) return;
      var w = Math.min(560, Math.max(258, resizing.w + resizing.x - e.clientX));
      root.style.setProperty('--cd-w', w + 'px');
    });
    document.addEventListener('mouseup', function () { resizing = null; });

    /* N184：HUD 按钮在 #cdHud 内，不在 #cdDock 内，必须一并绑定（漏绑＝HUD 收不起） */
    $$('#cdDock [data-act], #cdHud [data-act]').forEach(function (b) {
      b.addEventListener('click', function () {
        var a = b.getAttribute('data-act');
        if (a === 'collapse') {
          dock.classList.toggle('cd-collapsed');
          b.textContent = dock.classList.contains('cd-collapsed') ? '展开' : '收起';
        } else if (a === 'hud') {
          var hud = $('#cdHud'); hud.classList.toggle('min');
          b.textContent = hud.classList.contains('min') ? '展开' : '收起';
          D.syncHudSpace();
        }
      });
    });
    $$('.cd-wbtn').forEach(function (b) {
      b.addEventListener('click', function () { root.style.setProperty('--cd-w', b.getAttribute('data-w') + 'px'); });
    });
  }

  /* ---------- 工具 ---------- */
  function clean(s) { return (s || '').replace(/\s+/g, ' ').trim(); }
  function textOf(n) { return clean(n ? n.textContent : ''); }
  function niceNum(v, step) {
    var dec = (String(step).split('.')[1] || '').length;
    return Number(v).toFixed(Math.min(4, dec));
  }
  function labelFor(el, labels) {
    if (labels && labels[el.id]) return labels[el.id];
    var ctl = el.closest ? el.closest('.ctl') : null;
    var lab = ctl ? ctl.querySelector('label') : null;
    var t = textOf(lab);
    t = t.replace(/=\s*[-+\d.]+\s*$/, '').replace(/=\s*$/, '').trim();
    return t || el.id;
  }
  function groupTitle(ctl, idx) {
    var n = ctl && ctl.nextElementSibling;
    for (var k = 0; k < 3 && n; k++, n = n.nextElementSibling) {
      var tag = n.querySelector ? n.querySelector('.tag, h2, h3') : null;
      if (tag) return textOf(tag).slice(0, 42);
    }
    var p = ctl && ctl.previousElementSibling;
    if (p && /^(H2|H3)$/.test(p.tagName)) return textOf(p).slice(0, 42);
    return '参数组 ' + (idx + 1);
  }

  /* ---------- 核心：iframe 内真实控件的镜像收纳 ---------- */
  D.frame = null; D.doc = null; D.crossOK = false; D.opts = null; D.ctrls = [];

  function buildMirrors() {
    var f = D.frame, o = D.opts;
    var body = $('#cdBody');
    body.innerHTML = '';
    D.ctrls = [];

    /* 版本切换按钮（合并子页用，单版本时不显示） */
    if (o.sources && o.sources.length > 1) {
      var sec = document.createElement('div'); sec.className = 'cd-sec'; sec.textContent = '视图 / 版本';
      var bar = document.createElement('div'); bar.className = 'cd-btns';
      o.sources.forEach(function (s) {
        var b = document.createElement('button');
        b.className = 'cd-btn' + (s.src === f.getAttribute('src') ? ' cd-on' : '');
        b.textContent = s.label;
        b.addEventListener('click', function () { D.load(s.src); });
        bar.appendChild(b);
      });
      body.appendChild(sec); body.appendChild(bar);
    }

    var doc;
    try { doc = f.contentDocument; if (!doc || !doc.body) throw new Error('no contentDocument'); }
    catch (err) { doc = null; }
    if (!doc) {
      D.crossOK = false;
      var warn = document.createElement('div');
      warn.className = 'cd-note';
      warn.innerHTML = '<b>本地 file:// 打开时浏览器禁止跨文档读取</b>，无法把参数收进浮窗。' +
        '原网页自带的控件条已保留，可直接使用；用预览面板（HTTP）打开即可启用右浮窗。';
      body.appendChild(warn);
      return;
    }
    D.doc = doc; D.crossOK = true;

    /* 子页报错也转到宿主红框 */
    try { f.contentWindow.onerror = function (m, s, l, c) { showErr('[子页] ' + m + ' @' + l + ':' + c); }; } catch (e) {}

    /* F11：注入一条 display:none 隐藏原控件条（原 artifact 源码一字不改）
       fitCSS：宿主层版式适配，只给需要的视图加；原文件仍零改动
       F14：.btnrow / .btnbar 里的播放、单步、复位按钮也是「可调参数」，
       必须收进右浮窗；iframe 内只留 .readout 读数（N200 结果在左）。 */
    if (!doc.getElementById('cdHide')) {
      var st = doc.createElement('style'); st.id = 'cdHide';
      st.textContent = '.ctl{display:none !important}' +
        '.btnrow button,.btnbar button,.toolbar button{display:none !important}' +
        (o.fitCSS || '');
      doc.head.appendChild(st);
    }

    var ctls = $$('.ctl, .btnrow, .btnbar, .toolbar', doc)
      .filter(function (c) { return c.querySelector('input,select,button'); });
    var groups = ctls.length ? ctls : [doc.body];

    groups.forEach(function (ctl, gi) {
      var sec = document.createElement('div'); sec.className = 'cd-sec';
      sec.textContent = /(?:btnrow|btnbar|toolbar)/i.test(String(ctl.className || ''))
        ? '播放 / 控制'
        : (ctls.length ? groupTitle(ctl, gi) : '参数');
      body.appendChild(sec);
      var btnWrap = document.createElement('div'); btnWrap.className = 'cd-btns';
      body.appendChild(btnWrap);

      /* 先放按钮 / 下拉，再放滑条 */
      $$('select, button', ctl).forEach(function (el) { mirrorDiscrete(el, body, btnWrap); });
      $$('input[type=range]', ctl).forEach(function (el) { mirrorRange(el, ctl, body); });
      if (!btnWrap.children.length) btnWrap.remove();
    });

    if (!D.ctrls.length) {
      var n = document.createElement('div'); n.className = 'cd-note';
      n.textContent = '当前视图没有可调参数。'; body.appendChild(n);
    }

    /* 状态回读：切视图后把 iframe 当前真实值同步回镜像 */
    D.syncAll();
    D.autosize();
    var foot = $('#cdFoot .cd-state');
    if (foot) foot.textContent = D.ctrls.length + ' 个参数 · ' + (o.sources ? o.sources.length : 1) + ' 个视图';
  }

  /* N200 画布铺满：iframe 撑到内容真实高度，宿主只保留一层滚动 */
  D.autosize = function () {
    try {
      var d = D.frame.contentDocument;
      var h = Math.max(d.body.scrollHeight, d.documentElement.scrollHeight);
      D.frame.style.height = Math.max(900, h + 40) + 'px';
    } catch (e) {}
  };

  function mirrorDiscrete(el, body, btnWrap) {
    var o = D.opts, doc = D.doc;
    if (el.tagName === 'SELECT') {
      var row = document.createElement('div'); row.className = 'cd-row';
      var lab = document.createElement('div'); lab.className = 'cd-lab';
      lab.innerHTML = '<span class="cd-name">' + labelFor(el, o.labels) + '</span>';
      var sel = document.createElement('select');
      $$('option', el).forEach(function (op) {
        var x = document.createElement('option');
        x.value = op.value; x.textContent = textOf(op);
        sel.appendChild(x);
      });
      sel.value = el.value;
      sel.addEventListener('change', function () {
        el.value = sel.value;
        el.dispatchEvent(new doc.defaultView.Event('change', { bubbles: true }));
        el.dispatchEvent(new doc.defaultView.Event('input', { bubbles: true }));
        D.syncAll();
      });
      row.appendChild(lab); row.appendChild(sel); body.appendChild(row);
      D.ctrls.push({ el: el, mirror: sel, kind: 'select' });
    } else {
      var b = document.createElement('button'); b.className = 'cd-btn';
      b.textContent = textOf(el) || el.id;
      b.addEventListener('click', function () { el.click(); setTimeout(D.syncAll, 60); });
      btnWrap.appendChild(b);
      D.ctrls.push({ el: el, mirror: b, kind: 'button' });
    }
  }

  function mirrorRange(el, ctl, body) {
    var o = D.opts, doc = D.doc;
    var row = document.createElement('div'); row.className = 'cd-row';
    var lab = document.createElement('div'); lab.className = 'cd-lab';
    lab.innerHTML = '<span class="cd-name">' + labelFor(el, o.labels) + '</span>';

    var num = document.createElement('input');
    num.type = 'text'; num.className = 'cd-num'; num.title = '可直接输入数值（与滑条走同一个 apply）';
    lab.appendChild(num); row.appendChild(lab);

    var rg = document.createElement('input');
    rg.type = 'range';
    rg.min = el.min || '0'; rg.max = el.max || '1'; rg.step = el.step || '0.01';
    rg.value = el.value;
    row.appendChild(rg);
    body.appendChild(row);

    /* N241：找到「本滑条自己」的读数，不能拿 ctl 里第一个 .val 充数。
       各内核命名不统一（v_<id> / <前缀>_vX 混用），故按 DOM 就近优先：
       ① 同一包裹 div 内的 .val（label + input 的常见结构）
       ② id 约定 v_<id>
       ③ input 所在 label 内的 .val
       ④ 都找不到 → 返回 null，readVal() 回退到滑条自身 value，绝不串到别人的读数 */
    function valFor(el, ctl, doc) {
      var p = el.parentElement;
      if (p && p !== ctl && p.querySelector) {
        var v = p.querySelector('.val');
        if (v) return v;
      }
      if (el.id && doc.getElementById) {
        var byId = doc.getElementById('v_' + el.id);
        if (byId) return byId;
      }
      var lab = el.closest ? el.closest('label') : null;
      if (lab && lab.querySelector) {
        var lv = lab.querySelector('.val');
        if (lv) return lv;
      }
      return null;
    }

    var valEl = valFor(el, ctl, doc);
    function readVal() { return valEl ? textOf(valEl) : niceNum(el.value, rg.step); }

    /* N241：拖滑条与手输数字共用同一个 apply */
    function apply(v, scroll) {
      var lo = parseFloat(rg.min), hi = parseFloat(rg.max);
      var x = parseFloat(v); if (!isFinite(x)) { num.value = readVal(); return; }
      x = Math.min(hi, Math.max(lo, x));
      var s = niceNum(x, rg.step);
      el.value = s;
      rg.value = s;
      el.dispatchEvent(new doc.defaultView.Event('input', { bubbles: true }));
      el.dispatchEvent(new doc.defaultView.Event('change', { bubbles: true }));
      num.value = readVal();
      /* N207：参数改完把对应的那张图送到眼前（只在 change 时滚，拖的过程不抖动） */
      if (scroll) {
        var n = ctl.nextElementSibling;
        for (var k = 0; k < 3 && n; k++, n = n.nextElementSibling) {
          var cv = n.querySelector ? n.querySelector('canvas') : null;
          if (cv) { try { cv.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {} break; }
        }
      }
    }
    rg.addEventListener('input', function () { apply(rg.value, false); });
    rg.addEventListener('change', function () { apply(rg.value, true); });
    num.addEventListener('keydown', function (e) { if (e.key === 'Enter') { apply(num.value, true); num.blur(); } });
    num.addEventListener('change', function () { apply(num.value, true); });
    num.addEventListener('dblclick', function () { num.select(); });

    D.ctrls.push({ el: el, mirror: rg, num: num, readVal: readVal, kind: 'range' });
  }

  D.syncAll = function () {
    D.ctrls.forEach(function (c) {
      if (!c.el || !c.el.isConnected) return;
      if (c.kind === 'range') { c.mirror.value = c.el.value; if (c.num) c.num.value = c.readVal(); }
      else if (c.kind === 'select') c.mirror.value = c.el.value;
      /* F11 判据：播放键文案／模式高亮也要回读，不能只同步数值 */
      else if (c.kind === 'button') c.mirror.textContent = textOf(c.el) || c.mirror.textContent;
    });
  };

  D.load = function (src) {
    if (D.frame) D.frame.setAttribute('src', src);
    var hud = $('#cdHudView');
    var s = (D.opts.sources || []).filter(function (x) { return x.src === src; })[0];
    if (hud && s) hud.textContent = s.label;
  };

  /* ---------- 初始化 ---------- */
  D.init = function (opts) {
    D.opts = opts || {};
    D.frame = $('#cdFrame');
    var t = $('#cdDock .cd-t'); if (t && opts.title) t.textContent = opts.title;
    var hud = $('#cdHudBody');
    if (hud && opts.hud) hud.innerHTML = opts.hud;
    var foot = $('#cdFoot');
    if (foot) {
      foot.innerHTML = '<span class="cd-state">参数加载中</span><span style="flex:1"></span>' +
        '<span>宽度</span><button class="cd-wbtn" data-w="280">窄</button>' +
        '<button class="cd-wbtn" data-w="360">中</button>' +
        '<button class="cd-wbtn" data-w="460">宽</button>' +
        '<span style="color:var(--cd-line)">｜拖左边缘微调</span>';
    }
    bindChrome();
    D.syncHudSpace();
    D.frame.addEventListener('load', function () { try { buildMirrors(); } catch (e) { showErr('buildMirrors: ' + e.message); } });
    var first = (opts.sources && opts.sources[0]) || { src: opts.src };
    D.load(first.src);
    if (opts.onReady) opts.onReady();
  };
})();
