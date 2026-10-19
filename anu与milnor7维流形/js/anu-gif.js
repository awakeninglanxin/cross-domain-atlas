/* ============================================================================
 * anu-gif.js —— 纯 JS 的 GIF89a 编码器（**零依赖**）
 * ----------------------------------------------------------------------------
 * 🔴 老师 2026-10-08 第 ⑦ 条：「或把这完整 Anu 呼吸的周期保存为 **≤5MB 的 GIF 动画**」。
 *
 * 为什么自己写：本页是**纯静态 file:// 页面**（无打包器、无 npm），
 * 引不进 gif.js / omggif 这类库。而 GIF89a 的核心只有三件事：
 *   ① 全局调色板（中位切分 median-cut 量化到 ≤256 色）
 *   ② LZW 变长码压缩（clear / EOI 两个保留码 + 码长 9→12 增长）
 *   ③ 把上面两样按 GIF89a 的块结构拼起来（+ NETSCAPE 循环扩展）
 * 所以自实现反而最稳：不依赖网络、不增加体积、行为完全可测。
 *
 * 对外 API：
 *   AnuGif.encode(frames, w, h, { delayCs, loop, maxColors, onProgress })
 *     frames : [Uint8ClampedArray（RGBA，长度 w*h*4）, ...]
 *     返回   : { bytes: Uint8Array, size: number, colors: number, frames: number }
 *   AnuGif.lzwEncode(indices, minCodeSize)    —— 单独暴露，便于自检
 * ==========================================================================*/
(function (root, factory) {
  if (typeof module === 'object' && module.exports) { module.exports = factory(); }
  else { root.AnuGif = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ------------------------------------------------------------ ① 中位切分量化 */

  /**
   * 中位切分（median-cut）建全局调色板。
   * 把所有采样像素装进一个「盒」，每轮挑**最长轴跨度最大**的盒，沿该轴按中位数一分为二，
   * 直到盒数 = maxColors（或再也分不动）。每个盒取**均值色**作为一个调色板项。
   *
   * 为什么用中位切分而不是固定 web-safe 216 色：本页画面是**大片深蓝底 + 高饱和彩虹线**，
   * 固定调色板会把中间的渐变全压成台阶（老师对渐变台阶很敏感）；中位切分按实际颜色分布
   * 分配色位，深蓝底只占几色、彩虹段拿到大部分色位。
   *
   * @param {Uint8ClampedArray[]} samples 采样像素（交错 RGBA，已抽稀）
   * @param {number} maxColors ≤ 256
   * @returns {{r:number,g:number,b:number}[]} 调色板
   */
  function buildPalette(samples, maxColors) {
    var px = [];                                   /* [r,g,b] 三元组 */
    for (var s = 0; s < samples.length; s++) {
      var a = samples[s], i;
      /* 每 8 个像素采 1 个（步长 32 字节）。256 色调色板下 30 万级样本已完全够用，
         再密只是让中位切分的排序变慢 —— 采样量对画质的影响在 10 万以上就基本饱和。 */
      for (i = 0; i + 3 < a.length; i += 32) {
        px.push([a[i], a[i + 1], a[i + 2]]);
      }
    }
    if (!px.length) { return [{ r: 0, g: 0, b: 0 }]; }

    var boxes = [makeBox(px, 0, px.length - 1)];
    while (boxes.length < maxColors) {
      /* 找「体积最大」的盒（跨度 × 像素数，两者都要考虑：只看跨度会分裂出只有几个像素的盒） */
      var bi = -1, bs = 0;
      for (i = 0; i < boxes.length; i++) {
        var b = boxes[i];
        if (b.hi <= b.lo) { continue; }
        var sc = b.span * Math.log(2 + (b.hi - b.lo));
        if (sc > bs) { bs = sc; bi = i; }
      }
      if (bi < 0) { break; }
      var box = boxes[bi];
      /* 沿最长轴排序后取中位切开 —— ⚠️ 切点必须落在**值变化**处
         （见下面 `best` 的选法），否则同一种颜色会被切成两半：
         每一半各自再被切… 实测「3 种纯色」能切出 13 个盒，
         而调色板里全是重复项 ⇒ 有效色数远低于请求值 ⇒ 渐变现台阶。
         现在选「离 n/2 最近的、且左右两侧值不同的」那个切点。 */
      var ch = box.axis;
      var sub = px.slice(box.lo, box.hi + 1);
      sub.sort(function (p, q) { return p[ch] - q[ch]; });
      for (i = 0; i < sub.length; i++) { px[box.lo + i] = sub[i]; }
      var half = sub.length >> 1, best = -1;
      for (i = 1; i < sub.length; i++) {
        if (sub[i][ch] !== sub[i - 1][ch] &&
            (best < 0 || Math.abs(i - half) < Math.abs(best - half))) { best = i; }
      }
      if (best < 0) { break; }                    /* 整箱同值 ⇒ span 已为 0，正常不会走到这 */
      var mid = box.lo + best;
      if (mid <= box.lo || mid > box.hi) { break; }
      boxes[bi] = makeBox(px, box.lo, mid - 1);
      boxes.push(makeBox(px, mid, box.hi));
    }
    /* 取每个盒的**均值色**；顺带去重（切点选对后基本不会重复，但留着保险） */
    var seen = {}, pal = [];
    boxes.forEach(function (b) {
      var n = b.hi - b.lo + 1, sr = 0, sg = 0, sb = 0, c;
      for (var k = b.lo; k <= b.hi; k++) { sr += px[k][0]; sg += px[k][1]; sb += px[k][2]; }
      c = { r: Math.round(sr / n), g: Math.round(sg / n), b: Math.round(sb / n) };
      var key = (c.r << 16) | (c.g << 8) | c.b;
      if (!seen[key]) { seen[key] = 1; pal.push(c); }
    });
    return pal;
  }

  function makeBox(px, lo, hi) {
    var rmin = 255, rmax = 0, gmin = 255, gmax = 0, bmin = 255, bmax = 0, i;
    for (i = lo; i <= hi; i++) {
      var p = px[i];
      if (p[0] < rmin) { rmin = p[0]; } if (p[0] > rmax) { rmax = p[0]; }
      if (p[1] < gmin) { gmin = p[1]; } if (p[1] > gmax) { gmax = p[1]; }
      if (p[2] < bmin) { bmin = p[2]; } if (p[2] > bmax) { bmax = p[2]; }
    }
    var dr = rmax - rmin, dg = gmax - gmin, db = bmax - bmin;
    var axis = (dr >= dg && dr >= db) ? 0 : (dg >= db ? 1 : 2);
    return { lo: lo, hi: hi, axis: axis, span: Math.max(dr, dg, db) };
  }

  /**
   * 建「粗网格 RGB → 调色板索引」缓存。
   * 每通道取高 5 位（32³ = 32768 格）当键；查表时惰性填充。
   * 不做缓存的话是 帧数 × 像素数 × 256 次距离运算（≈10 亿次），浏览器会假死。
   */
  function makeIndexer(palette, dither) {
    var P = palette.length;
    var cache = new Int16Array(32768);
    for (var i = 0; i < cache.length; i++) { cache[i] = -1; }
    function nearest(r, g, b) {
      var best = 0, bd = Infinity;
      for (var k = 0; k < P; k++) {
        var c = palette[k];
        var dr = r - c.r, dg = g - c.g, db = b - c.b;
        var d = dr * dr + dg * dg + db * db;
        if (d < bd) { bd = d; best = k; }
      }
      return best;
    }
    /** 把一帧 RGBA 转成调色板索引（可选 Floyd–Steinberg 抖动） */
    return function toIndex(rgba, w, h, out) {
      var x, y, i = 0;
      if (!dither) {
        for (y = 0; y < h; y++) {
          for (x = 0; x < w; x++, i += 4) {
            var key = ((rgba[i] >> 3) << 10) | ((rgba[i + 1] >> 3) << 5) | (rgba[i + 2] >> 3);
            var idx = cache[key];
            if (idx < 0) { idx = nearest(rgba[i], rgba[i + 1], rgba[i + 2]); cache[key] = idx; }
            out[y * w + x] = idx;
          }
        }
        return out;
      }
      /* 抖动版：错误扩散到右/下邻居（数据先转成可写 Float32，避免 Uint8Clamped 截断丢误差） */
      var buf = new Float32Array(w * h * 3);
      for (i = 0; i < w * h; i++) { buf[i * 3] = rgba[i * 4]; buf[i * 3 + 1] = rgba[i * 4 + 1]; buf[i * 3 + 2] = rgba[i * 4 + 2]; }
      for (y = 0; y < h; y++) {
        for (x = 0; x < w; x++) {
          i = (y * w + x) * 3;
          var r = clamp255(buf[i]), g = clamp255(buf[i + 1]), b = clamp255(buf[i + 2]);
          var ki = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
          var mi = cache[ki];
          if (mi < 0) { mi = nearest(r, g, b); cache[ki] = mi; }
          out[y * w + x] = mi;
          var c2 = palette[mi];
          var er = r - c2.r, eg = g - c2.g, eb = b - c2.b;
          spread(buf, w, h, x + 1, y, er, eg, eb, 7 / 16);
          spread(buf, w, h, x - 1, y + 1, er, eg, eb, 3 / 16);
          spread(buf, w, h, x, y + 1, er, eg, eb, 5 / 16);
          spread(buf, w, h, x + 1, y + 1, er, eg, eb, 1 / 16);
        }
      }
      return out;
    };
  }
  function clamp255(v) { return v < 0 ? 0 : (v > 255 ? 255 : v); }
  function spread(buf, w, h, x, y, er, eg, eb, f) {
    if (x < 0 || x >= w || y < 0 || y >= h) { return; }
    var i = (y * w + x) * 3;
    buf[i] += er * f; buf[i + 1] += eg * f; buf[i + 2] += eb * f;
  }

  /* ----------------------------------------------------------------- ② LZW */

  /**
   * GIF 的 LZW 编码（变长码）。
   *   · `minCodeSize` = 调色板位宽（8 位调色板 → 8）
   *   · 保留码：clear = 1<<minCodeSize，EOI = clear+1；数据码从 EOI+1 起
   *   · 码长 9 → 12 位增长（字典满 4096 就发 clear 重来）
   * @returns {Uint8Array} 已是「子块化」后的字节流吗？不 —— 返回**裸流**，
   *          子块切分由 `subBlocks()` 做（分开是为了能单独测 LZW）。
   */
  function lzwEncode(indices, minCodeSize) {
    var clear = 1 << minCodeSize, eoi = clear + 1;
    var codeSize = minCodeSize + 1, next = eoi + 1;
    var dict = new Map();
    var out = [], bitBuf = 0, bitCnt = 0;
    function emit(code) {
      bitBuf |= code << bitCnt;
      bitCnt += codeSize;
      while (bitCnt >= 8) { out.push(bitBuf & 0xff); bitBuf >>>= 8; bitCnt -= 8; }
    }
    emit(clear);
    if (!indices.length) { emit(eoi); if (bitCnt > 0) { out.push(bitBuf & 0xff); } return Uint8Array.from(out); }
    var prefix = indices[0], i;
    for (i = 1; i < indices.length; i++) {
      var k = indices[i];
      var key = prefix * 4096 + k;
      var got = dict.get(key);
      if (got !== undefined) { prefix = got; continue; }
      emit(prefix);
      if (next < 4096) {
        dict.set(key, next);
        if (next >= (1 << codeSize) && codeSize < 12) { codeSize++; }
        next++;
      } else {
        emit(clear);                      /* 字典满 ⇒ 复位（否则码长必须超 12 位，GIF 不支持） */
        dict.clear(); next = eoi + 1; codeSize = minCodeSize + 1;
      }
      prefix = k;
    }
    emit(prefix);
    emit(eoi);
    if (bitCnt > 0) { out.push(bitBuf & 0xff); }
    return Uint8Array.from(out);
  }

  /** 把裸字节流切成 GIF 子块：每块 ≤255 字节，前面加长度，末尾 0x00 收尾 */
  function subBlocks(bytes, sink) {
    var i = 0;
    while (i < bytes.length) {
      var n = Math.min(255, bytes.length - i);
      sink.push(n);
      for (var k = 0; k < n; k++) { sink.push(bytes[i + k]); }
      i += n;
    }
    sink.push(0);
  }

  /* ------------------------------------------------------------- ③ 组装 GIF89a */

  /**
   * @param {Uint8ClampedArray[]} frames 每帧 RGBA（长度 = w*h*4）
   * @param {number} w @param {number} h
   * @param {{delayCs?:number, loop?:number, maxColors?:number, dither?:boolean,
   *          onProgress?:function(number,number)}} opts
   *        delayCs = 每帧延时（**1/100 秒**为单位，GIF 的规定）；loop = 0 表示无限循环
   * @returns {{bytes:Uint8Array, size:number, colors:number, frames:number, bits:number}}
   */
  function encode(frames, w, h, opts) {
    opts = opts || {};
    var maxColors = Math.max(2, Math.min(256, opts.maxColors || 256));
    var delayCs = Math.max(2, Math.round(opts.delayCs == null ? 8 : opts.delayCs));
    var loop = (opts.loop == null ? 0 : opts.loop);
    var onProgress = opts.onProgress;

    /* 建调色板时**只抽一部分帧**：中位切分是 O(N log N × log k)，
       48 帧 × 16 万像素全喂进去要十几秒（会假死）。呼吸动画各帧配色几乎相同，
       抽 1/3 就足够代表整段色彩分布；`paletteStride` = 抽帧步长（1 = 全用）。 */
    var stride = Math.max(1, Math.round(opts.paletteStride || 1));
    var palSrc = frames;
    if (stride > 1) {
      palSrc = [];
      for (var pf = 0; pf < frames.length; pf += stride) { palSrc.push(frames[pf]); }
      if (!palSrc.length) { palSrc = [frames[0]]; }
    }

    var palette = buildPalette(palSrc, maxColors);
    var bits = 1;
    while ((1 << bits) < palette.length) { bits++; }
    if (bits < 2) { bits = 2; }                     /* GIF 规定最小 2 位 */
    var tableLen = 1 << bits;
    var toIndex = makeIndexer(palette, opts.dither !== false);

    var out = [];
    function u8(v) { out.push(v & 0xff); }
    function u16(v) { out.push(v & 0xff); out.push((v >> 8) & 0xff); }
    function str(s) { for (var i = 0; i < s.length; i++) { out.push(s.charCodeAt(i) & 0xff); } }

    str('GIF89a');
    u16(w); u16(h);
    u8(0x80 | ((bits - 1) << 4) | (bits - 1));      /* 有全局色表 + 色分辨率 + 表大小 = 2^bits */
    u8(0); u8(0);                                   /* 背景色索引 / 像素宽高比 */
    for (var c = 0; c < tableLen; c++) {            /* 全局色表（不足则补黑） */
      var p = palette[c] || { r: 0, g: 0, b: 0 };
      u8(p.r); u8(p.g); u8(p.b);
    }
    /* NETSCAPE2.0 循环扩展 */
    u8(0x21); u8(0xff); u8(0x0b); str('NETSCAPE2.0');
    u8(0x03); u8(0x01); u16(loop); u8(0x00);

    var idxBuf = new Uint8Array(w * h);
    for (var f = 0; f < frames.length; f++) {
      toIndex(frames[f], w, h, idxBuf);
      u8(0x21); u8(0xf9); u8(0x04);                 /* 图形控制扩展 */
      u8(0x04);                                     /* 处置方式 = 4（恢复背景）—— 每帧全屏重画 */
      u16(delayCs); u8(0); u8(0x00);
      u8(0x2c);                                     /* 图像描述符 */
      u16(0); u16(0); u16(w); u16(h); u8(0x00);     /* 无局部色表、非隔行 */
      u8(bits);                                     /* LZW 最小码长 */
      subBlocks(lzwEncode(idxBuf, bits), out);
      subBlocks; /* no-op：保持结构清晰 */
      if (onProgress) { onProgress(f + 1, frames.length); }
    }
    u8(0x3b);                                       /* trailer */
    var bytes = Uint8Array.from(out);
    return { bytes: bytes, size: bytes.length, colors: palette.length, frames: frames.length, bits: bits };
  }

  return { encode: encode, buildPalette: buildPalette, lzwEncode: lzwEncode, subBlocks: subBlocks };
});
