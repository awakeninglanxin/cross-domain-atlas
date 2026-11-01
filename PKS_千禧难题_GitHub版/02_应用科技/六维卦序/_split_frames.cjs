'use strict';
/*
 * _split_frames.cjs —— 把视频截图拼图（1280×1280，2×3 或 2×2）切成单帧。
 *
 * 为什么不猜坐标：拼图的留白宽度不固定，猜错就切到字。做法是把图丢进
 * Chrome 画布，算「列/行平均亮度」，亮度高且方差低的那几段就是留白，
 * 切点由数据给出。切完再逐帧算「非黑像素占比」，占比接近 0 的帧说明切歪了。
 *
 * 用法：node _split_frames.cjs <源图.jpg> <输出前缀> [列数] [行数]
 */
const fs = require('fs');
const path = require('path');
const CDP = require('../construct-cost/cdp.cjs');

const DIR = __dirname;
const OUT = path.join(DIR, '_img');

function dataUrl(file) {
  return 'data:image/jpeg;base64,' + fs.readFileSync(file).toString('base64');
}

/* 把一个一维亮度数组里的「亮且平」区段找出来，返回 [{a,b}]（b 不含） */
const FIND_GUTTER = `
function gutters(prof, n, thr) {
  const out = [];
  let i = 0;
  while (i < n) {
    if (prof[i] <= thr) { i++; continue; }
    let j = i;
    while (j < n && prof[j] > thr) j++;
    out.push([i, j]);
    i = j;
  }
  return out;
}
`;

(async () => {
  const file = process.argv[2];
  const prefix = process.argv[3];
  const nCol = parseInt(process.argv[4] || '2', 10);
  const nRow = parseInt(process.argv[5] || '3', 10);
  if (!file || !prefix) { console.error('用法：node _split_frames.cjs <源图> <前缀> [列] [行]'); process.exit(1); }

  const c = await CDP.open({ w: 1300, h: 1300 });
  const html = '<!DOCTYPE html><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:#fff}'
    + 'img{display:block;image-rendering:pixelated}</style><img id="im" src="' + dataUrl(file) + '">';
  await c.navigate('data:text/html;base64,' + Buffer.from(html, 'utf8').toString('base64'));
  await CDP.sleep(300);

  /* ① 画到画布，算列/行平均亮度 */
  const prof = await c.evalJs(`(function(){
    ${FIND_GUTTER}
    var im = document.getElementById('im');
    var W = im.naturalWidth, H = im.naturalHeight;
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var cx = cv.getContext('2d'); cx.drawImage(im, 0, 0);
    var d = cx.getImageData(0, 0, W, H).data;
    function lum(p){ return 0.299*d[p] + 0.587*d[p+1] + 0.114*d[p+2]; }
    var col = new Float64Array(W), row = new Float64Array(H);
    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        var v = lum((y*W + x)*4);
        col[x] += v / H; row[y] += v / W;
      }
    }
    return { W: W, H: H, col: Array.from(col), row: Array.from(row) };
  })()`);

  const W = prof.W, H = prof.H;
  const gx = findGutters(prof.col, W, 168);
  const gy = findGutters(prof.row, H, 168);
  console.log('尺寸 ' + W + '×' + H);
  console.log('竖留白 ' + JSON.stringify(gx));
  console.log('横留白 ' + JSON.stringify(gy));

  /* ② 由留白推出帧边界：相邻两条留白之间的区段，取够宽/够高的 */
  function spans(gutters, n, minLen) {
    const cuts = [0];
    gutters.forEach((g) => { cuts.push(g[0], g[1]); });
    cuts.push(n);
    const uniq = Array.from(new Set(cuts)).sort((a, b) => a - b);
    const out = [];
    for (let i = 0; i < uniq.length - 1; i++) {
      const a = uniq[i], b = uniq[i + 1];
      if (b - a >= minLen) out.push([a, b]);
    }
    return out;
  }
  const xs = spans(gx, W, W / (nCol * 3));
  const ys = spans(gy, H, H / (nRow * 3));
  if (xs.length !== nCol || ys.length !== nRow) {
    console.error('切分失败：列 ' + xs.length + '（应为 ' + nCol + '）、行 ' + ys.length + '（应为 ' + nRow + '）');
    c.close(); process.exit(2);
  }
  console.log('列区间 ' + JSON.stringify(xs));
  console.log('行区间 ' + JSON.stringify(ys));

  /* ③ 逐帧截图 */
  let k = 0;
  const made = [];
  for (let r = 0; r < nRow; r++) {
    for (let col = 0; col < nCol; col++) {
      k++;
      const [x0, x1] = xs[col], [y0, y1] = ys[r];
      const box = { x: x0, y: y0, width: x1 - x0, height: y1 - y0, scale: 1 };
      const shot = await c.send('Page.captureScreenshot', { format: 'jpeg', quality: 92, captureBeyondViewport: true, clip: box });
      if (shot.error) { console.error('截帧失败 ' + k + '：' + JSON.stringify(shot.error)); continue; }
      const name = prefix + '_' + String(k).padStart(2, '0') + '.jpg';
      const buf = Buffer.from(shot.result.data, 'base64');
      fs.writeFileSync(path.join(OUT, name), buf);
      made.push({ k, name, w: box.width, h: box.height, bytes: buf.length });
      console.log('  ' + name + '  ' + box.width + '×' + box.height + '  ' + buf.length + ' B');
    }
  }
  console.log('共切出 ' + made.length + ' 帧');
  c.close();
  process.exit(0);
})().catch((e) => { console.error('出错：' + e.message); process.exit(1); });

function findGutters(prof, n, thr) {
  const out = [];
  let i = 0;
  while (i < n) {
    if (prof[i] <= thr) { i++; continue; }
    let j = i;
    while (j < n && prof[j] > thr) j++;
    out.push([i, j]);
    i = j;
  }
  return out;
}
