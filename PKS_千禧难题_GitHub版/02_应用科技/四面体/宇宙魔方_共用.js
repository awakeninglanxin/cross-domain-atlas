/* ============================================================
   宇宙魔方 · 共用 3D 引擎      经典 script（无 ES module，file:// 双击可跑）
   内容：向量工具 / 相机 / 透视投影 / 画家算法显示列表 / 三维原语
        / 应用框架（模式切换·播放·速度·拖拽旋转·滚轮缩放·触摸捏合）
   用法：const APP = CM.create({ canvas:'#cv', dist:6.5, modes:[ {name,dur,draw(S,t,p),info(),cons()} ] });
   ============================================================ */
var CM = (function () {
  'use strict';

  /* ---------------- 向量与数值工具 ---------------- */
  var TAU = Math.PI * 2;
  var add  = function (a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; };
  var sub  = function (a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; };
  var mul  = function (a, s) { return [a[0] * s, a[1] * s, a[2] * s]; };
  var dot  = function (a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; };
  var crs  = function (a, b) { return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]; };
  var vlen = function (a) { return Math.sqrt(dot(a, a)); };
  var nrm  = function (a) { var L = vlen(a) || 1; return mul(a, 1 / L); };
  var lerpV = function (a, b, t) { return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t]; };
  var clamp = function (x, l, h) { return x < l ? l : (x > h ? h : x); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var easeOut = function (t) { return 1 - Math.pow(1 - clamp(t, 0, 1), 3); };
  var easeIO  = function (t) { t = clamp(t, 0, 1); return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2; };
  var ping = function (t) { return 0.5 - 0.5 * Math.cos(TAU * clamp(t, 0, 1)); };   /* 0→1→0 呼吸 */
  var fmt = function (x, n) {
    var v = Math.abs(x) < 1e-12 ? 0 : x;
    var s = v.toFixed(n == null ? 6 : n);
    if (s.indexOf('.') >= 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s;
  };
  var fmtE = function (x, n) { return x.toExponential(n == null ? 3 : n); };
  function mulberry(seed) {                       /* 可复现随机 */
    var s = seed >>> 0;
    return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a || 1; }
  /* 罗德里格旋转：p 绕 axis 转 ang（右手定则） */
  function rotAxis(p, axis, ang) {
    var u = nrm(axis), c = Math.cos(ang), s = Math.sin(ang);
    var kd = dot(u, p), kc = crs(u, p);
    return [p[0] * c + kc[0] * s + u[0] * kd * (1 - c),
            p[1] * c + kc[1] * s + u[1] * kd * (1 - c),
            p[2] * c + kc[2] * s + u[2] * kd * (1 - c)];
  }

  /* ============================================================
     Merkaba（星形四面体 / 双四面体 / stella octangula）
     两枚全等正四面体互锁，互为对心点反射 x ↦ −x。
     · 轴向摆法 UP/DN（本对象默认）：8 个顶点恰是棱长 2 的立方体 (−1,1)³ 的 8 个角；
       正四面体棱长 2√2、外接球 √3、内切球 √3/3（R : r = 3 : 1）。
     · 主界面同源摆法 MUP/MDN：底面正三角形放 xy 平面、顶点立 +z
       （= AAA四面体_主界面.html 的 rebuild()），平移后以外心为原点。
       两种摆法是同一个几何体，只差一个旋转：前者便于做 4×4×4 方格阵列，
       后者便于讲「勾股三角形嵌套」。
     ============================================================ */
  var MERK = (function () {
    var UP = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]];      /* 符号积 +1 */
    var DN = UP.map(function (p) { return [-p[0], -p[1], -p[2]]; });   /* 符号积 −1 */
    var FACE = [[0, 1, 2], [0, 1, 3], [1, 2, 3], [2, 0, 3]];
    var EDGE = [[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]];
    var CUBE = UP.concat(DN), CUBE_E = [], i, j;
    for (i = 0; i < 8; i++) for (j = i + 1; j < 8; j++) {
      var dx = CUBE[i][0] - CUBE[j][0], dy = CUBE[i][1] - CUBE[j][1], dz = CUBE[i][2] - CUBE[j][2];
      if (Math.abs(Math.sqrt(dx * dx + dy * dy + dz * dz) - 2) < 1e-9) CUBE_E.push([i, j]);
    }
    /* 主界面同源摆法 */
    var E = 2 * Math.SQRT2, H = E * Math.sqrt(2 / 3), d = E / Math.sqrt(3), oz = H / 4;
    var MUP = [[d, 0, 0], [-d / 2, E / 2, 0], [-d / 2, -E / 2, 0], [0, 0, H]]
      .map(function (p) { return [p[0], p[1], p[2] - oz]; });
    var MDN = MUP.map(function (p) { return [-p[0], -p[1], -p[2]]; });
    function place(list, c, s) {
      s = (s == null) ? 1 : s;
      return list.map(function (p) { return [c[0] + p[0] * s, c[1] + p[1] * s, c[2] + p[2] * s]; });
    }
    return {
      E: E, EDGE_LEN: 2, R: Math.sqrt(3), r: Math.sqrt(3) / 3, H: H,
      UP: UP, DN: DN, FACE: FACE, EDGE: EDGE, CUBE: CUBE, CUBE_E: CUBE_E,
      MUP: MUP, MDN: MDN,
      at: function (c, s) { return place(CUBE, c, s); },
      up: function (c, s) { return place(UP, c, s); },
      dn: function (c, s) { return place(DN, c, s); },
      mup: function (c, s) { return place(MUP, c, s); },
      mdn: function (c, s) { return place(MDN, c, s); }
    };
  })();

  /* 七色琉璃光（青金→赤） */
  var HUES = ['#d1445a', '#e08a17', '#c9a227', '#2fa35b', '#0e9c8e', '#3457d5', '#7a51c9'];
  function rgba(hex, a) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    var n = parseInt(h, 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  /* ---------------- 应用 ---------------- */
  function create(opt) {
    var cv = typeof opt.canvas === 'string' ? document.querySelector(opt.canvas) : opt.canvas;
    var ctx = cv.getContext('2d');
    var W = 300, H = 300, DPR = 1;

    var cam = {
      yaw: opt.yaw == null ? -0.62 : opt.yaw,
      pitch: opt.pitch == null ? 0.30 : opt.pitch,
      dist: opt.dist || 6.5,
      target: (opt.target || [0, 0, 0]).slice(),
      focal: 800
    };
    var home = { yaw: cam.yaw, pitch: cam.pitch, dist: cam.dist, target: cam.target.slice() };
    var camBasis = null;

    /* 运镜（分镜可临时推近/移靶，自己插值回来） */
    var viewDist = cam.dist, viewTarget = cam.target.slice(), zoomFactor = 1;
    var tgtDist = cam.dist, tgtTarget = cam.target.slice();
    /* 屏幕空间平移（Shift + 拖拽）：直接加在投影输出上，不动相机基/视距，
       所以平移不影响深度排序、也不影响分镜自己的运镜插值。 */
    var panX = 0, panY = 0;

    function viewBasis() {
      var ey = [Math.sin(cam.yaw) * Math.cos(cam.pitch),
                -Math.cos(cam.yaw) * Math.cos(cam.pitch),
                Math.sin(cam.pitch)];
      var right = nrm(crs([0, 0, 1], ey));
      var up = crs(ey, right);
      return { ey: ey, right: right, up: up };
    }
    function project(p) {
      var b = camBasis;
      var eye = add(viewTarget, mul(b.ey, viewDist));
      var v = sub(p, eye);
      var d = -dot(v, b.ey);
      if (d < 0.05) return null;
      var f = cam.focal;
      /* 注意：屏幕平移走画布变换（frame 里的 ctx.translate），这里不加 —— 
         这样画布内的标注文字也会跟着几何一起走，不会出现「标注脱节」。 */
      return { x: W / 2 + f * dot(v, b.right) / d, y: H / 2 - f * dot(v, b.up) / d, d: d };
    }
    function radiusPx(c, r) { var v = project(c); return v ? cam.focal * r / v.d : 0; }

    /* ---------------- 显示列表（画家算法） ---------------- */
    var DL = [];
    function pushD(d, fn) { DL.push({ d: d, fn: fn }); }
    function flushDL() {
      DL.sort(function (A, B) { return B.d - A.d; });
      for (var k = 0; k < DL.length; k++) DL[k].fn();
      DL.length = 0;
    }
    function poly3(pts, st) {
      st = st || {};
      var vs = [], ds = 0, k, v;
      for (k = 0; k < pts.length; k++) { v = project(pts[k]); if (!v) return; vs.push(v); ds += v.d; }
      var d = ds / vs.length + (st.bias || 0);
      pushD(d, function () {
        ctx.beginPath();
        for (var i = 0; i < vs.length; i++) { if (i === 0) ctx.moveTo(vs[i].x, vs[i].y); else ctx.lineTo(vs[i].x, vs[i].y); }
        ctx.closePath();
        if (st.fill) { ctx.fillStyle = st.fill; ctx.fill(); }
        if (st.stroke) { ctx.strokeStyle = st.stroke; ctx.lineWidth = st.lw || 1; ctx.stroke(); }
      });
    }
    /* 通用深度序绘制：pts 只用来定深度（也可用 st.d 直接给），fn(ctx) 里自己画
       —— 需要渐变面、光晕、HUD 叠层等 poly3 表达不了的东西时用它 */
    function item3(pts, st, fn) {
      st = st || {};
      var d = st.d;
      if (d == null) {
        var ds = 0, k, v;
        for (k = 0; k < pts.length; k++) { v = project(pts[k]); if (!v) return; ds += v.d; }
        d = ds / pts.length;
      }
      pushD(d + (st.bias || 0), function () { fn(ctx); });
    }
    function line3(p, q, st) {
      st = st || {};
      var a1 = project(p), b1 = project(q);
      if (!a1 || !b1) return;
      var d = (a1.d + b1.d) / 2 + (st.bias || 0);
      pushD(d, function () {
        ctx.save();
        ctx.beginPath(); ctx.moveTo(a1.x, a1.y); ctx.lineTo(b1.x, b1.y);
        ctx.strokeStyle = st.stroke; ctx.lineWidth = st.lw || 1;
        if (st.dash) ctx.setLineDash(st.dash);
        if (st.glow) { ctx.shadowColor = st.stroke; ctx.shadowBlur = st.glow; }
        ctx.lineCap = 'round'; ctx.stroke(); ctx.restore();
      });
    }
    function dot3(p, st) {
      st = st || {};
      var v = project(p); if (!v) return;
      pushD(v.d - 0.02, function () {
        ctx.save(); ctx.beginPath(); ctx.arc(v.x, v.y, st.r || 3, 0, TAU);
        ctx.fillStyle = st.fill || '#3457d5';
        if (st.glow) { ctx.shadowColor = st.fill || '#3457d5'; ctx.shadowBlur = st.glow; }
        ctx.fill();
        if (st.stroke) { ctx.strokeStyle = st.stroke; ctx.lineWidth = st.lw || 1; ctx.stroke(); }
        ctx.restore();
      });
    }
    function label3(p, text, st) {
      st = st || {};
      var v = project(p); if (!v) return;
      pushD(v.d - 0.03, function () {
        ctx.save();
        ctx.font = (st.bold ? '700 ' : '') + (st.size || 13) + 'px "Microsoft YaHei",system-ui,sans-serif';
        ctx.textAlign = st.align || 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 3.6; ctx.strokeStyle = st.halo || 'rgba(255,255,255,0.95)';
        ctx.strokeText(text, v.x + (st.dx || 0), v.y + (st.dy || 0));
        ctx.fillStyle = st.color || '#1c2534';
        ctx.fillText(text, v.x + (st.dx || 0), v.y + (st.dy || 0));
        ctx.restore();
      });
    }
    function polyline(pts, st) {
      st = st || {};
      for (var k = 0; k < pts.length - 1; k++) {
        var a1 = project(pts[k]), b1 = project(pts[k + 1]);
        if (!a1 || !b1) continue;
        (function (a1, b1) {
          var d = (a1.d + b1.d) / 2 + (st.bias || 0);
          pushD(d, function () {
            ctx.beginPath(); ctx.moveTo(a1.x, a1.y); ctx.lineTo(b1.x, b1.y);
            ctx.strokeStyle = st.stroke; ctx.lineWidth = st.lw || 1;
            if (st.dash) ctx.setLineDash(st.dash);
            ctx.stroke(); ctx.setLineDash([]);
          });
        })(a1, b1);
      }
    }
    function circle3(c, u, r, st) {           /* 任意平面内的圆：u,v 为面内正交单位向量 */
      st = st || {};
      var v = st.v || nrm(crs(u, [0, 0, 1]));
      if (!st.v) {
        var cand = crs(u, [0, 0, 1]);
        if (vlen(cand) < 1e-6) cand = crs(u, [0, 1, 0]);
        v = nrm(cand);
      }
      var pts = [], seg = st.seg || 96;
      for (var k = 0; k <= seg; k++) {
        var a = k / seg * TAU;
        pts.push(add(c, add(mul(u, r * Math.cos(a)), mul(v, r * Math.sin(a)))));
      }
      polyline(pts, st);
    }
    function sphere3(c, r, st) {
      st = st || {};
      var v = project(c); if (!v) return;
      var rad = Math.max(3, cam.focal * r / v.d);
      var main = st.stroke || 'rgba(14,156,142,0.55)';
      pushD(v.d + 0.001, function () {
        ctx.save();
        var g = ctx.createRadialGradient(v.x - rad * 0.3, v.y - rad * 0.35, rad * 0.1, v.x, v.y, rad);
        g.addColorStop(0, st.fill0 || 'rgba(14,156,142,0.045)');
        g.addColorStop(0.72, st.fill1 || 'rgba(14,156,142,0.075)');
        g.addColorStop(1, st.fill2 || 'rgba(14,156,142,0.16)');
        ctx.beginPath(); ctx.arc(v.x, v.y, rad, 0, TAU); ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = main; ctx.lineWidth = st.lw || 1.1; ctx.stroke();
        ctx.restore();
      });
      var rings = st.rings == null ? 4 : st.rings;
      for (var k = 1; k <= rings; k++) {
        var phi = k / (rings + 1) * Math.PI;
        var rr = r * Math.sin(phi), zz = r * Math.cos(phi);
        var p1 = [], p2 = [], seg = 56;
        for (var s = 0; s <= seg; s++) {
          var th = s / seg * TAU;
          p1.push([c[0] + rr * Math.cos(th), c[1] + rr * Math.sin(th), c[2] + zz]);
          p2.push([c[0] + rr * Math.cos(th), c[1] + rr * Math.sin(th), c[2] + zz]);
        }
        polyline(p1, { stroke: st.ring || 'rgba(14,156,142,0.26)', lw: 0.9, bias: 0.02 });
      }
      return null;
    }

    /* ---------------- 画布尺寸 ---------------- */
    function resize() {
      var host = cv.parentElement;
      var rect = host.getBoundingClientRect();
      DPR = Math.min(2.5, window.devicePixelRatio || 1);
      W = Math.max(320, Math.round(rect.width));
      H = Math.max(300, Math.round(rect.height));
      cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
      cv.style.width = W + 'px'; cv.style.height = H + 'px';
      cam.focal = Math.min(W, H) * 1.02;
    }
    window.addEventListener('resize', resize);

    /* ---------------- 交互：拖拽 / 滚轮 / 捏合 ---------------- */
    var autoSpin = opt.autoSpin !== false, spinIdle = 0;
    var ptrs = new Map(), lastPinch = 0;
    var drag = null;                 /* {pan:是否平移, x,y:锚点, px,py:起始平移量} */
    cv.style.touchAction = 'none';
    cv.addEventListener('pointerdown', function (e) {
      cv.setPointerCapture(e.pointerId);
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      /* 只有单指才建立平移/旋转锚点；第二指落下（捏合）时锚点作废，免得松开一指跳变 */
      if (ptrs.size === 1) {
        drag = { pan: !!e.shiftKey, x: e.clientX, y: e.clientY, px: panX, py: panY };
        if (drag.pan) cv.style.cursor = 'move';
      } else {
        drag = null;
      }
      spinIdle = 4;
    });
    cv.addEventListener('pointermove', function (e) {
      var prev = ptrs.get(e.pointerId);
      if (!prev) return;
      var dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 1) {
        var wantPan = !!(drag && (drag.pan || e.shiftKey));
        /* 中途按下 / 松开 Shift ⇒ 重新锚定，避免平移量跳变 */
        if (drag && wantPan !== !!drag.pan) {
          drag.pan = wantPan;
          drag.x = e.clientX; drag.y = e.clientY;
          drag.px = panX; drag.py = panY;
          cv.style.cursor = wantPan ? 'move' : '';
        }
        if (wantPan) {
          /* 限制在 ±0.85 画布尺寸内：够把任何角落拖到画面中央，又不会把图拖没 */
          var limX = W * 0.85, limY = H * 0.85;
          var rawX = drag.px + (e.clientX - drag.x);
          var rawY = drag.py + (e.clientY - drag.y);
          panX = clamp(rawX, -limX, limX);
          panY = clamp(rawY, -limY, limY);
          /* 顶到边界时把锚点一起挪，避免「拉出去再拉回来」出现死区 */
          if (panX !== rawX) { drag.px = panX; drag.x = e.clientX; }
          if (panY !== rawY) { drag.py = panY; drag.y = e.clientY; }
        } else {
          cam.yaw += dx * 0.0075;
          cam.pitch = clamp(cam.pitch + dy * 0.0060, -1.45, 1.45);
        }
      } else if (ptrs.size === 2) {
        var it = ptrs.values(), a = it.next().value, b = it.next().value;
        var d0 = Math.hypot(a.x - b.x, a.y - b.y);
        if (lastPinch > 0) setZoom(cam.dist * lastPinch / Math.max(20, d0));
        lastPinch = d0;
        drag = null;
      }
      spinIdle = 4;
    });
    function endPtr(e) {
      ptrs.delete(e.pointerId); if (ptrs.size < 2) lastPinch = 0;
      if (ptrs.size === 0) { drag = null; cv.style.cursor = ''; }
    }
    cv.addEventListener('pointerup', endPtr);
    cv.addEventListener('pointercancel', endPtr);
    cv.addEventListener('pointerleave', endPtr);
    cv.addEventListener('wheel', function (e) {
      e.preventDefault();
      setZoom(cam.dist * Math.exp(e.deltaY * 0.0011));
      spinIdle = 4;
    }, { passive: false });

    function setZoom(d) {
      cam.dist = clamp(d, 1.2, 60);
      if (opt.onZoom) opt.onZoom(cam.dist / home.dist);
    }
    function resetView() {
      cam.yaw = home.yaw; cam.pitch = home.pitch; cam.dist = home.dist;
      cam.target = home.target.slice(); tgtDist = home.dist; tgtTarget = home.target.slice();
      panX = 0; panY = 0;
      setZoom(home.dist);
      if (opt.onZoom) opt.onZoom(1);
    }

    /* ---------------- 模式 / 播放 ---------------- */
    var modes = opt.modes || [];
    var mode = 0, t = 0, playing = true, speed = 1, lastNow = 0;
    var S = {};                                   /* 传给 draw 的场景上下文 */

    var elModes = document.getElementById('modeBar');
    var elCap = document.getElementById('mcap');
    var elName = document.getElementById('mname');
    var elInfo = document.getElementById('minfo');
    var elCons = document.getElementById('mcons');
    var elProg = document.getElementById('prog');
    var btnPlay = document.getElementById('btnPlay');
    var spd = document.getElementById('spd');
    var spdv = document.getElementById('spdv');
    var ttl = document.getElementById('mtitle');

    /* ---------------- 字幕折叠（2026-10-14 新增） ----------------
       `.caption` 带 pointer-events:none（按钮放进去点不到），所以开关浮在它右下角。
       ⚠ 不要放进 `.ctrl`：模式① 控制栏内容总宽 1087px 已超可视 1024px，
         再加按钮会被 .stage{overflow:hidden} 裁掉（实测右侧超出画布 47px）。
       收起 = 给 .caption 加 .off（display:none），把画布下半部整片让给 3D 模型。
       快捷键 C（不抢 Ctrl/Cmd+C）。 */
    (function () {
      var elStage = document.querySelector('.stage');
      if (!elStage || !elCap || elStage.querySelector('.capbtn')) return;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'capbtn';
      b.id = 'btnCapToggle';
      b.title = '收起 / 展开底部字幕（快捷键 C）';
      function sync() {
        var off = elCap.classList.contains('off');
        b.textContent = off ? '字幕 ▴' : '字幕 ▾';
        b.classList.toggle('on', off);
      }
      b.addEventListener('click', function (e) {
        e.preventDefault(); e.stopPropagation();
        elCap.classList.toggle('off');
        sync();
      });
      elStage.appendChild(b);
      window.addEventListener('keydown', function (e) {
        if (e.key !== 'c' && e.key !== 'C') return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;      /* 不抢 Ctrl/Cmd + C */
        var tn = e.target && e.target.tagName;
        if (tn === 'INPUT' || tn === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;
        elCap.classList.toggle('off');
        sync();
      });
      sync();
    })();

    function buildBar() {
      if (!elModes) return;
      elModes.innerHTML = '';
      modes.forEach(function (m, i) {
        var b = document.createElement('button');
        b.className = 'mbtn' + (i === 0 ? ' on' : '');
        b.type = 'button';
        b.dataset.i = i;
        b.innerHTML = '<i>' + (i + 1) + '</i>' + m.name;
        b.addEventListener('click', function () { setMode(i); });
        elModes.appendChild(b);
      });
    }
    function setMode(i) {
      mode = ((i % modes.length) + modes.length) % modes.length;
      t = 0;
      /* 距离回到本页默认取景；个别模式可用 enter() 再覆盖 */
      cam.dist = home.dist;
      cam.target = home.target.slice();
      zoomFactor = 1;
      panX = 0; panY = 0;             /* 平移一并归零，免得切模式后画面留在画布外 */
      if (elModes) {
        Array.prototype.forEach.call(elModes.children, function (b, k) { b.classList.toggle('on', k === mode); });
      }
      if (modes[mode].enter) modes[mode].enter(S);
      refreshPanel();
    }
    function refreshPanel() {
      var m = modes[mode];
      if (elName) elName.textContent = m.name;
      if (elInfo) elInfo.innerHTML = m.info ? m.info() : '';
      if (elCons) elCons.innerHTML = m.cons ? m.cons() : '';
      if (ttl) ttl.textContent = (mode + 1) + ' / ' + modes.length + '　' + m.name;
      if (elCap) elCap.innerHTML = m.cap ? m.cap() : '';
    }

    /* 空格播放 · 数字键切模式 · ←→ 前后 */
    window.addEventListener('keydown', function (e) {
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.code === 'Space') { playing = !playing; syncPlay(); e.preventDefault(); }
      else if (/^Digit[1-9]$/.test(e.code)) { var n = +e.code.slice(5); if (n <= modes.length) setMode(n - 1); }
      else if (e.code === 'ArrowRight') setMode(mode + 1);
      else if (e.code === 'ArrowLeft') setMode(mode - 1);
      else if (e.key === 'r' || e.key === 'R') resetView();
    });
    function syncPlay() { if (btnPlay) btnPlay.textContent = playing ? '暂停' : '播放'; }
    if (btnPlay) btnPlay.addEventListener('click', function () { playing = !playing; syncPlay(); });
    if (spd) spd.addEventListener('input', function () {
      speed = +spd.value;
      if (spdv) spdv.textContent = speed.toFixed(1) + '×';
    });
    var btnReset = document.getElementById('btnReset');
    if (btnReset) btnReset.addEventListener('click', resetView);
    var btnPrev = document.getElementById('btnPrev'), btnNext = document.getElementById('btnNext');
    if (btnPrev) btnPrev.addEventListener('click', function () { setMode(mode - 1); });
    if (btnNext) btnNext.addEventListener('click', function () { setMode(mode + 1); });

    /* ---------------- 主循环 ---------------- */
    function frame(now) {
      var raw = lastNow ? (now - lastNow) / 1000 : 0;
      var dt = Math.min(0.05, raw);
      lastNow = now;
      var m = modes[mode];
      if (playing) {
        t += dt * speed;
        if (spinIdle > 0) spinIdle -= dt;
        if (autoSpin && spinIdle <= 0) cam.yaw += dt * 0.10 * speed;
        if (t >= (m.dur || 10)) {
          if (m.loop === false) { t = m.dur || 10; playing = false; syncPlay(); }
          else setMode(mode + 1);
        }
      }
      /* 相机平滑跟随目标 */
      viewDist = lerp(viewDist, cam.dist, 0.18);
      viewTarget = lerpV(viewTarget, cam.target, 0.18);
      camBasis = viewBasis();

      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (opt.backdrop) opt.backdrop(ctx, W, H, t);
      /* 屏幕空间平移（Shift + 拖拽）：一次性作用于整个画布内容 —— 几何与画布内标注
         同步位移，观感就是「拖动整张图」；背景与页面 DOM（侧栏 / 提示 / 进度条）不动。 */
      if (panX || panY) ctx.translate(panX, panY);
      DL = [];

      var p = clamp(t / (m.dur || 10), 0, 1);
      S.W = W; S.H = H; S.ctx = ctx; S.cam = cam; S.t = t; S.p = p; S.mode = mode;
      S.dt = dt; S.rawDt = Math.min(0.6, raw); S.speed = speed; S.playing = playing;
      S.proj = project; S.radiusPx = radiusPx;
      S.poly = poly3; S.item = item3; S.line = line3; S.dot = dot3; S.label = label3;
      S.polyline = polyline; S.circle = circle3; S.sphere = sphere3; S.flush = flushDL;
      S.rgba = rgba; S.HUES = HUES;
      S.setZoom = setZoom;
      S.view = function (dist, target) { if (dist != null) cam.dist = dist; if (target) cam.target = target.slice(); };
      S.home = home;
      try { m.draw(S, t, p); } catch (err) { drawErr(err); }
      flushDL();
      if (opt.onFrame) opt.onFrame(S, dt);
      if (elProg) elProg.style.width = (p * 100).toFixed(1) + '%';
      if (S.dirty) refreshPanel();
      requestAnimationFrame(frame);
    }
    var errShown = false;
    function drawErr(err) {
      if (errShown) return; errShown = true;
      ctx.save(); ctx.fillStyle = '#d1445a'; ctx.font = '600 13px "Microsoft YaHei",sans-serif';
      ctx.fillText('绘制异常：' + err.message, 16, H - 16); ctx.restore();
      if (window.console) console.error(err);
    }

    /* ---------------- 启动 ---------------- */
    resize();
    buildBar();
    camBasis = viewBasis();
    S.W = W; S.H = H; S.ctx = ctx; S.cam = cam; S.t = 0; S.p = 0; S.mode = 0;
    S.proj = project; S.radiusPx = radiusPx;
    S.poly = poly3; S.line = line3; S.dot = dot3; S.label = label3;
    S.polyline = polyline; S.circle = circle3; S.sphere = sphere3; S.flush = flushDL;
    S.rgba = rgba; S.HUES = HUES; S.setZoom = setZoom; S.home = home;
    S.view = function (dist, target) { if (dist != null) cam.dist = dist; if (target) cam.target = target.slice(); };
    if (modes[0] && modes[0].enter) modes[0].enter(S);
    refreshPanel(); syncPlay();
    var API = {
      S: S, cam: cam, setMode: setMode, resetView: resetView, refreshPanel: refreshPanel,
      /* seek(t)：把当前模式的进度直接定位到 t 秒（用于调试/截图核验，不影响正常播放） */
      seek: function (v) { t = v; },
      get mode() { return mode; }, get t() { return t; }, get playing() { return playing; },
      set playing(v) { playing = v; syncPlay(); },
      /* 自动缓慢自转（俯视等场景可临时关掉，免得把「谁顺时针」搅乱） */
      get autoSpin() { return autoSpin; }, set autoSpin(v) { autoSpin = !!v; },
      /* 屏幕空间平移（Shift + 拖拽）；读数/脚本核验用 */
      get pan() { return [panX, panY]; },
      panTo: function (x, y) { panX = x || 0; panY = y || 0; },
      setPi: setZoom
    };
    requestAnimationFrame(frame);
    return API;
  }

  return {
    create: create,
    add: add, sub: sub, mul: mul, dot: dot, crs: crs, vlen: vlen, nrm: nrm, lerpV: lerpV,
    rotAxis: rotAxis, MERK: MERK,
    clamp: clamp, lerp: lerp, easeOut: easeOut, easeIO: easeIO, ping: ping,
    fmt: fmt, fmtE: fmtE, mulberry: mulberry, gcd: gcd, rgba: rgba, HUES: HUES, TAU: TAU
  };
})();
