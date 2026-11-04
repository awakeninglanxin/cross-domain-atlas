/* 最小 GIF 解码器（只为验收用）：读头 + 全局色表 + 解【第一帧】的 LZW，
   返回该帧的非白像素比例与尺寸。
   为什么要它：GIF 导出的第一版是"整帧全白"（起点 −100 时模型被切光），
   而文件确实生成了、头也对、体积也正常 —— 只判文件存在/头/体积，那条 bug 永远绿。
   唯一的真判据是【把第一帧解出来数像素】。 */
'use strict';

function decodeFirstFrame(buf) {
  if (buf.slice(0, 6).toString('latin1') !== 'GIF89a' && buf.slice(0, 6).toString('latin1') !== 'GIF87a')
    throw new Error('not a gif');
  const W = buf.readUInt16LE(6), H = buf.readUInt16LE(8);
  const packed = buf[10];
  const gctFlag = (packed & 0x80) !== 0;
  const gctSize = 2 << (packed & 7);
  let p = 13;
  let pal = null;
  if (gctFlag) {
    pal = [];
    for (let i = 0; i < gctSize; i++) { pal.push([buf[p], buf[p + 1], buf[p + 2]]); p += 3; }
  }
  let out = null;
  while (p < buf.length) {
    const b = buf[p];
    if (b === 0x3b) break;                       /* trailer */
    if (b === 0x21) {                            /* 扩展块：跳过 */
      p += 2;
      while (p < buf.length) { const n = buf[p]; p += 1 + n; if (n === 0) break; }
      continue;
    }
    if (b !== 0x2c) { p++; continue; }            /* 图像描述符 */
    p++;
    const ix = buf.readUInt16LE(p), iy = buf.readUInt16LE(p + 2);
    const iw = buf.readUInt16LE(p + 4), ih = buf.readUInt16LE(p + 6);
    const ipk = buf[p + 8]; p += 9;
    let lpal = pal;
    if (ipk & 0x80) {
      const ls = 2 << (ipk & 7);
      lpal = [];
      for (let i = 0; i < ls; i++) { lpal.push([buf[p], buf[p + 1], buf[p + 2]]); p += 3; }
    }
    const interlaced = (ipk & 0x40) !== 0;
    const minCode = buf[p]; p++;
    /* 子块拼成 data */
    const chunks = [];
    while (p < buf.length) { const n = buf[p]; p++; if (!n) break; chunks.push(buf.slice(p, p + n)); p += n; }
    const data = Buffer.concat(chunks);
    out = { W: W, H: H, iw: iw, ih: ih, ix: ix, iy: iy, pal: lpal, data: data, minCode: minCode, interlaced: interlaced };
    break;                                        /* 只看第一帧 */
  }
  if (!out) throw new Error('no frame');

  /* ---- LZW 解码（GIF 变长码）---- */
  const clear = 1 << out.minCode, eoi = clear + 1;
  let codeSize = out.minCode + 1, next = eoi + 1;
  let dict = [];
  const resetDict = () => {
    dict = [];
    for (let i = 0; i < clear; i++) dict.push([i]);
    dict.push(null); dict.push(null);             /* clear / eoi 占位 */
    next = eoi + 1; codeSize = out.minCode + 1;
  };
  resetDict();
  const px = [];
  let bitPos = 0, prev = null;
  const total = out.iw * out.ih;
  const d = out.data;
  const readCode = () => {
    let v = 0;
    for (let i = 0; i < codeSize; i++) {
      const byte = d[(bitPos >> 3)];
      if (byte === undefined) return -1;
      const bit = (byte >> (bitPos & 7)) & 1;
      v |= bit << i;
      bitPos++;
    }
    return v;
  };
  while (px.length < total) {
    const code = readCode();
    if (code < 0 || code === eoi) break;
    if (code === clear) { resetDict(); prev = null; continue; }
    let entry;
    if (code < dict.length && dict[code]) entry = dict[code];
    else if (prev) entry = prev.concat([prev[0]]);
    else break;
    for (let i = 0; i < entry.length && px.length < total; i++) px.push(entry[i]);
    if (prev) {
      if (next < 4096) {
        dict[next++] = prev.concat([entry[0]]);
        if (next === (1 << codeSize) && codeSize < 12) codeSize++;
      }
    }
    prev = entry;
  }

  /* ---- 交错重排 ---- */
  let order = null;
  if (out.interlaced) {
    order = [];
    for (const pass of [[0, 8], [4, 8], [2, 4], [1, 2]])
      for (let y = pass[0]; y < out.ih; y += pass[1]) order.push(y);
  }

  /* ---- 数非白像素 ---- */
  let nonWhite = 0, colored = 0;
  for (let i = 0; i < px.length; i++) {
    const c = out.pal[px[i]] || [0, 0, 0];
    if (!(c[0] > 246 && c[1] > 246 && c[2] > 246)) nonWhite++;
    if (Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 18) colored++;
  }
  return {
    W: out.W, H: out.H, iw: out.iw, ih: out.ih, px: px.length,
    nonWhiteRatio: +(nonWhite / Math.max(1, px.length)).toFixed(4),
    coloredRatio: +(colored / Math.max(1, px.length)).toFixed(4),
    nColors: out.pal.length,
    firstBytes: Array.from(px.slice(0, 12)),
    palette0: out.pal[px[0]] || null
  };
}

module.exports = { decodeFirstFrame };

if (require.main === module) {
  const fs = require('fs');
  const r = decodeFirstFrame(fs.readFileSync(process.argv[2]));
  console.log(JSON.stringify(r));
}
