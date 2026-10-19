/* ============================================================
 * camera.js —— 轻量三维渲染器（纯 Canvas 2D，零依赖）
 * 提供：透视相机、曲线绘制、三角/四边形面片带光照绘制
 * ============================================================ */
(function (global) {
  'use strict';

  function Canvas3D(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.yaw = 0.85;
    this.pitch = 0.42;
    this.dist = 9.0;
    this.focal = 900;
    this.scale = 1.0;
    this.cx = 0;
    this.cy = 0;
    this._dpr = 1;
    this.resize();
  }

  Canvas3D.prototype.resize = function () {
    var dpr = global.devicePixelRatio || 1;
    var r = this.canvas.getBoundingClientRect();
    var w = Math.max(320, Math.floor(r.width));
    var h = Math.max(240, Math.floor(r.height));
    this._dpr = dpr;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w;
    this.h = h;
    this.cx = w / 2;
    this.cy = h / 2;
    // 自适应缩放：让半径 ~4 的世界大体充满画布
    this.scale = Math.min(w, h) / 7.5;
  };

  /** 世界坐标 [x,y,z] → 屏幕 {x, y, depth} */
  Canvas3D.prototype.project = function (p) {
    var cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    var cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    var x = p[0] * cy + p[2] * sy;
    var z = -p[0] * sy + p[2] * cy;
    var y = p[1];
    var y2 = y * cp - z * sp;
    var z2 = y * sp + z * cp;
    var denom = this.dist - z2;
    if (denom < 0.2) denom = 0.2;
    var f = (this.focal / denom) * this.scale * 0.01;
    return {
      x: this.cx + x * f,
      y: this.cy - y2 * f,
      depth: z2
    };
  };

  Canvas3D.prototype.clear = function (bg) {
    var ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    if (bg) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, this.w, this.h);
    }
  };

  /**
   * 绘制折线（自动按深度调制透明度）
   * @param {number[][]} pts  世界坐标点列
   * @param {object} opt  {color, width, alpha, depthFade, closed, dash, glow}
   */
  Canvas3D.prototype.drawPolyline = function (pts, opt) {
    if (!pts || pts.length < 2) return;
    var o = opt || {};
    var ctx = this.ctx;
    var col = o.color || '#2563eb';
    var baseW = o.width || 1.6;
    var baseA = (o.alpha === undefined) ? 1 : o.alpha;
    var fade = (o.depthFade === undefined) ? 0.55 : o.depthFade;

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (o.dash) ctx.setLineDash(o.dash);
    if (o.glow) {
      ctx.shadowColor = col;
      ctx.shadowBlur = o.glow;
    }

    var prev = this.project(pts[0]);
    for (var i = 1; i < pts.length; i++) {
      var cur = this.project(pts[i]);
      // 深度映射：前面（depth 大）更不透明
      var d = ((cur.depth + prev.depth) * 0.5 + 5) / 10;
      d = Math.max(0, Math.min(1, d));
      var a = baseA * (1 - fade + fade * d);
      ctx.strokeStyle = col;
      ctx.globalAlpha = a;
      ctx.lineWidth = baseW * (0.65 + 0.7 * d);
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(cur.x, cur.y);
      ctx.stroke();
      prev = cur;
    }
    ctx.restore();
  };

  /**
   * **批量**绘制折线：每条曲线只开一条 path、只 stroke 一次。
   *
   * 为什么需要：drawPolyline 是「每段一 stroke」，适合十来条曲线的精确视图；
   * 密铺全貌视图一次要画几百条曲线（上万段），逐段 stroke 会慢一个数量级。
   * 这里退一步 —— 每条曲线整体给一个平均深度，按画家算法远→近排序后一次画完。
   *
   * @param {Array}  list  [{pts:number[][], color:string}]
   * @param {object} opt   {color, width, alpha, depthFade}
   */
  Canvas3D.prototype.drawPolylineBatch = function (list, opt) {
    if (!list || !list.length) return;
    var o = opt || {};
    var baseW = (o.width === undefined) ? 0.9 : o.width;
    var baseA = (o.alpha === undefined) ? 1 : o.alpha;
    var fade = (o.depthFade === undefined) ? 0.55 : o.depthFade;
    var ctx = this.ctx;
    var jumpMax = this.w * 0.45;

    var items = [];
    for (var i = 0; i < list.length; i++) {
      var pts = list[i].pts;
      if (!pts || pts.length < 2) continue;
      var sp = new Array(pts.length), dsum = 0;
      for (var k = 0; k < pts.length; k++) {
        sp[k] = this.project(pts[k]);
        dsum += sp[k].depth;
      }
      items.push({ sp: sp, d: dsum / pts.length, color: list[i].color || o.color || '#2563eb' });
    }
    if (!items.length) return;
    items.sort(function (a, b) { return a.d - b.d; });   // 远 → 近

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (var m = 0; m < items.length; m++) {
      var it = items[m];
      var d = Math.max(0, Math.min(1, (it.d + 5) / 10));
      ctx.globalAlpha = baseA * (1 - fade + fade * d);
      ctx.strokeStyle = it.color;
      ctx.lineWidth = baseW * (0.60 + 0.80 * d);
      ctx.beginPath();
      var px = it.sp[0].x, py = it.sp[0].y;
      ctx.moveTo(px, py);
      for (var n = 1; n < it.sp.length; n++) {
        var q = it.sp[n];
        // 曲线掠过投影极点时会甩出长直线，断掉以免画出跨屏的假线
        if (Math.abs(q.x - px) > jumpMax || Math.abs(q.y - py) > jumpMax) {
          ctx.moveTo(q.x, q.y);
        } else {
          ctx.lineTo(q.x, q.y);
        }
        px = q.x; py = q.y;
      }
      ctx.stroke();
    }
    ctx.restore();
  };

  /**
   * 绘制四边形面片曲面（画家算法：远→近）
   * @param {Array} quads  [{p:[[x,y,z]×4], c:'#rrggbb'}]
   */
  Canvas3D.prototype.drawQuads = function (quads, opt) {
    var o = opt || {};
    var ctx = this.ctx;
    var light = o.light || [-0.4, 0.7, -0.6];
    var ln = Math.sqrt(light[0] * light[0] + light[1] * light[1] + light[2] * light[2]);
    light = [light[0] / ln, light[1] / ln, light[2] / ln];

    var list = [];
    for (var i = 0; i < quads.length; i++) {
      var q = quads[i];
      var sp = q.p.map(this.project.bind(this));
      var depth = 0;
      for (var k = 0; k < sp.length; k++) depth += sp[k].depth;
      depth /= sp.length;

      // 面法向（世界坐标）
      var a = q.p[0], b = q.p[1], c = q.p[2];
      var u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
      var v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      var n = [
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0]
      ];
      var nn = Math.sqrt(n[0] * n[0] + n[1] * n[1] + n[2] * n[2]) || 1;
      n = [n[0] / nn, n[1] / nn, n[2] / nn];
      var lam = Math.abs(n[0] * light[0] + n[1] * light[1] + n[2] * light[2]);
      lam = 0.35 + 0.65 * lam;

      list.push({ sp: sp, depth: depth, lam: lam, c: q.c, alpha: q.alpha });
    }

    list.sort(function (p, q2) { return p.depth - q2.depth; });

    for (var j = 0; j < list.length; j++) {
      var it = list[j];
      var s = it.sp;
      var dep = (it.depth + 5) / 10;
      dep = Math.max(0, Math.min(1, dep));
      ctx.globalAlpha = (it.alpha === undefined ? 1 : it.alpha) * (0.35 + 0.65 * dep);
      ctx.fillStyle = shade(it.c, it.lam);
      ctx.beginPath();
      ctx.moveTo(s[0].x, s[0].y);
      for (var m = 1; m < s.length; m++) ctx.lineTo(s[m].x, s[m].y);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  /* 把 #rrggbb 按亮度系数调暗/调亮 */
  function shade(hex, k) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    r = Math.min(255, Math.round(r * k));
    g = Math.min(255, Math.round(g * k));
    b = Math.min(255, Math.round(b * k));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  /** 在投影后的屏幕位置画一个圆点 */
  Canvas3D.prototype.drawPoint = function (world, r, color, glow) {
    var p = this.project(world);
    var ctx = this.ctx;
    ctx.save();
    if (glow) { ctx.shadowColor = color; ctx.shadowBlur = glow; }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  global.Canvas3D = Canvas3D;
})(window);
