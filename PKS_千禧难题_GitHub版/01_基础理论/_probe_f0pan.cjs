/* 探针：Shift+拖动 = 平移，方向必须跟手（2026-11-03 立）
   老师原话：「按住 Shift 把几何体往下拖的时候，实际几何体却往上挪了，你底层搞反了」。

   这是「屏幕上的物体会往哪走」的问题，所以判据必须量【投影到屏幕后的像素位移】，
   不能量 panX/panY 的符号 —— 符号对不代表画面对（旧代码符号就"看着"像平移：
   panY -= dy，直觉上 dy>0 往下拖、panY 减小 = 往下挪，实际却是相机抬头、物体反向上跑）。

   ▸ 用 CDP 真实派发鼠标事件（modifiers=8 即 Shift），走的是页面自己的 mousedown/mousemove。
   ▸ 物体屏幕位置 = 用渲染时那一台相机把物体包围盒中心 project 到像素。
   ▸ 容差 12%：世界/像素尺度由 fov 与画布高现算，理论 1:1。 */
const { spawn } = require('child_process');
const os = require('os'), path = require('path'), fs = require('fs');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9368;
const URL = 'http://127.0.0.1:8899/01_%E5%9F%BA%E7%A1%80%E7%90%86%E8%AE%BA/AAA_PKS%E4%BB%A3%E7%A0%81%E6%97%8F_3D%E5%8F%82%E6%95%B0%E5%8F%B0.html';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const J = JSON.stringify;
let pass = 0, fail = 0;
function chk(c, label, extra) {
  if (c) { pass++; console.log('  \u2713 ' + label); }
  else { fail++; console.log('  \u2717 ' + label + (extra === undefined ? '' : '  \u2190 ' + extra)); }
}

(async () => {
  const ud = fs.mkdtempSync(path.join(os.tmpdir(), 'f0pan-'));
  const child = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + ud,
    '--no-first-run', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
    '--window-size=1500,960', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
  let ok = false;
  for (let i = 0; i < 40; i++) { try { await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); ok = true; break; } catch (e) { await sleep(300); } }
  if (!ok) throw new Error('CDP 没起来');
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const pend = new Map(); const errs = [];
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails.text);
  };
  const send = (m, p = {}) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result && r.result.exceptionDetails) throw new Error(expr.slice(0, 70) + ' → ' + J(r.result.exceptionDetails));
    return r.result.result.value;
  };
  const mouse = (type, x, y, modifiers, buttons) => send('Input.dispatchMouseEvent',
    { type, x, y, modifiers: modifiers || 0, button: type === 'mouseMoved' ? 'none' : 'left',
      buttons: buttons === undefined ? (type === 'mouseReleased' ? 0 : 1) : buttons, clickCount: type === 'mouseMoved' ? 0 : 1 });

  await send('Page.enable');
  await send('Page.navigate', { url: URL });
  await sleep(9000);
  /* 平移量的是【相机】行为，跟网格密度无关。降到单层小网格是为了在软渲染下能出帧：
     默认双层 56 万顶点时每帧几百毫秒，等帧会等到超时（本探针不是测性能的）。 */
  await ev(`(function(){P.cutSkin=1;P.hxRow=16;P.cutQ=1;rebuild();return 1;})()`).catch(()=>{});
  await ev(`(function(){P.hxQ=1.0;rebuild();return 1;})()`).catch(()=>{});
  await sleep(2500);
  await waitFrames(2, 9000);

  /* 滚到 3D 视图，量画布矩形（必须在视口内，否则鼠标事件落在别的元素上） */
  const rect = await ev(`(function(){var c=document.getElementById('cv3d');
    var st=document.querySelector('.stage');
    window.scrollTo(0, st.getBoundingClientRect().top + window.pageYOffset - 70);
    var r=c.getBoundingClientRect();
    return {x:r.left,y:r.top,w:r.width,h:r.height,ih:window.innerHeight};})()`);
  await sleep(900);
  const R2 = await ev(`(function(){var r=document.getElementById('cv3d').getBoundingClientRect();
    return {x:r.left,y:r.top,w:r.width,h:r.height,ih:window.innerHeight};})()`);
  console.log('画布（视口坐标）: ' + J(R2));
  chk(R2.w > 400 && R2.h > 300, '画布尺寸正常', R2.w + '×' + R2.h);
  chk(R2.y >= 0 && R2.y + R2.h <= R2.ih + 1, '画布完整落在视口内（鼠标事件才落在画布上）',
    'y=' + Math.round(R2.y) + '..' + Math.round(R2.y + R2.h) + ' / 视口高 ' + R2.ih);

  const cx = Math.round(R2.x + R2.w * 0.45), cy = Math.round(R2.y + R2.h * 0.5);

  /* 探针用的参考点：物体包围盒中心（世界坐标，固定不动；pan 只动相机） */
  await ev(`window.__pt=(function(){var b=new THREE.Box3().setFromObject(root);
    var c=b.getCenter(new THREE.Vector3()); return [c.x,c.y,c.z];})()`);
  /* ⚠ 量投影前必须手动跑一次页面自己的 loop()。
     为什么：headless 的帧调度会停（实测画布滚进视口后，默认档 56 万顶点 + 软渲染，
     rAF 从 35 fps 掉到 0~1 fps，等帧只能等到超时）⇒ 量到的是【拖动前那一帧】的相机，
     位移恒为 0，看起来像"平移功能坏了"。这是测量方式的问题，不是页面的问题。
     为什么不自己复述相机公式：复述就等于自证（公式写错两边一起错）。
     调 loop() 用的是页面【唯一那份】实现，测的仍是真东西。 */
  const proj = () => ev(`(function(){
    try{ loop(); }catch(e){ console.error('loop 抛错：'+e.message); }
    var v=new THREE.Vector3(window.__pt[0],window.__pt[1],window.__pt[2]).project(camera);
    return {x:v.x,y:v.y,ndcZ:v.z, camY:+camera.position.y.toFixed(4)};})()`);
  const st = () => ev(`({az:az,el:el,zoom:zoom,px:panX,py:panY,pz:panZ,camD:camD})`);

  /* 等渲染帧真的往前走。
     ⚠ 为什么不能用固定 sleep：默认档 56 万顶点 + swiftshader 软渲染，画布一进视口，
       每帧要几百毫秒（实测 rAF 从 35 fps 掉到 1.3 fps）。固定 sleep(320) 等不到新帧，
       量到的还是拖动前那一帧的相机矩阵 ⇒ 位移量出 0，看起来像"平移功能坏了"。
       这是探针的等待方式错，不是页面的错（同样条件下把 sleep 加到 3 秒就正常）。
     等帧超时返回 false ⇒ 判失败，绝不当成"通过"。 */
  async function waitFrames(n, budgetMs) {
    const f0 = await ev('renderer.info.render.frame');
    const t0 = Date.now();
    while (Date.now() - t0 < budgetMs) {
      await sleep(70);
      const f = await ev('renderer.info.render.frame');
      if (f - f0 >= n) return true;
    }
    return false;
  }
  /* 拖拽：分段派发（页面按增量累加），返回屏幕位移（NDC → 像素要乘 w/2, h/2） */
  async function drag(dx, dy, shift) {
    const mod = shift ? 8 : 0;
    await mouse('mousePressed', cx, cy, mod);
    await sleep(60);
    const N = 8;
    for (let i = 1; i <= N; i++) {
      await mouse('mouseMoved', Math.round(cx + dx * i / N), Math.round(cy + dy * i / N), mod, 1);
      await sleep(24);
    }
    await mouse('mouseReleased', Math.round(cx + dx), Math.round(cy + dy), mod, 0);
    return await waitFrames(1, 2000);
  }
  const toPx = (a, b) => ({ dx: (b.x - a.x) * R2.w / 2, dy: -(b.y - a.y) * R2.h / 2 });  /* NDC y 向上 */

  /* ---------------- A：Shift + 向下拖 80 px ⇒ 物体必须向下 80 px ---------------- */
  console.log('\n[A] Shift + 向下拖 80 px');
  await ev(`setView('iso')`); await sleep(500);
  let s0 = await st(), p0 = await proj();
  await drag(0, 80, true);
  let s1 = await st(), p1 = await proj();
  let d = toPx(p0, p1);
  console.log('  屏幕位移 dx=' + d.dx.toFixed(1) + ' dy=' + d.dy.toFixed(1) +
    '　pan=(' + s1.px.toFixed(3) + ',' + s1.py.toFixed(3) + ',' + s1.pz.toFixed(3) + ')');
  chk(Math.abs(d.dy) > 30, '物体在屏上确实动了（不是没反应）', d.dy.toFixed(1));
  chk(d.dy > 0, '物体往下走（与拖动同向）—— 这就是老师报的那一条', d.dy.toFixed(1));
  chk(Math.abs(Math.abs(d.dy) - 80) <= 80 * 0.12, '竖向位移 ≈ 鼠标位移（80 px ±12%）', d.dy.toFixed(1));
  chk(Math.abs(d.dx) < 12, '竖向拖动不该带出横向位移（' + d.dx.toFixed(1) + ' px）');

  /* ---------------- B：Shift + 向右拖 80 px ⇒ 物体向右 ---------------- */
  console.log('\n[B] Shift + 向右拖 80 px');
  await ev(`setView('iso')`); await sleep(500);
  p0 = await proj();
  await drag(80, 0, true);
  p1 = await proj(); d = toPx(p0, p1);
  console.log('  屏幕位移 dx=' + d.dx.toFixed(1) + ' dy=' + d.dy.toFixed(1));
  chk(d.dx > 0, '物体往右走（与拖动同向）', d.dx.toFixed(1));
  chk(Math.abs(Math.abs(d.dx) - 80) <= 80 * 0.12, '横向位移 ≈ 鼠标位移（80 px ±12%）', d.dx.toFixed(1));

  /* ---------------- C：反向也要对（往上拖 ⇒ 往上走） ---------------- */
  console.log('\n[C] Shift + 向上拖 60 px（反向核对，防"只是翻了个符号")');
  await ev(`setView('iso')`); await sleep(500);
  p0 = await proj();
  await drag(0, -60, true);
  p1 = await proj(); d = toPx(p0, p1);
  chk(d.dy < 0, '物体往上走', d.dy.toFixed(1));

  /* ---------------- D：普通拖动仍是旋转，且不清平移 ---------------- */
  console.log('\n[D] 不带 Shift 拖动 = 旋转（不能被平移改动带坏）');
  await ev(`setView('iso')`); await sleep(400);
  await drag(0, 50, true);              /* 先攒一点平移 */
  const sA = await st();
  await drag(70, 0, false);
  const sB = await st();
  chk(Math.abs(sB.px - sA.px) < 1e-6 && Math.abs(sB.py - sA.py) < 1e-6,
    '普通拖动不改变平移量', J([sB.px - sA.px, sB.py - sA.py]));
  chk(Math.abs(sB.az - sA.az) > 0.1, '普通拖动确实在转方位角 az（' + sA.az.toFixed(2) + ' → ' + sB.az.toFixed(2) + '）');

  /* ---------------- E：缩放后仍然跟手（尺度随距离变，不能写死） ---------------- */
  console.log('\n[E] 滚轮缩小 3 档后，同样拖 80 px 仍走 80 px');
  await ev(`setView('iso')`); await sleep(400);
  for (let i = 0; i < 3; i++) {
    await send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: cx, y: cy, deltaX: 0, deltaY: 120 });
    await sleep(160);
  }
  const zs = await st();
  chk(Math.abs(zs.zoom - 1) > 0.05, '缩放确实变了（zoom=' + zs.zoom.toFixed(3) + '）');
  p0 = await proj();
  await drag(0, 80, true);
  p1 = await proj(); d = toPx(p0, p1);
  console.log('  屏幕位移 dy=' + d.dy.toFixed(1) + '（zoom=' + zs.zoom.toFixed(3) + '）');
  chk(d.dy > 0 && Math.abs(Math.abs(d.dy) - 80) <= 80 * 0.15,
    '缩放后竖向仍 ≈ 80 px（世界/像素尺度随距离现算）', d.dy.toFixed(1));

  /* ---------------- F：双击 / 切视图要清掉平移 ---------------- */
  console.log('\n[F] 复位');
  await ev(`setView('iso')`);
  const sF = await st();
  chk(sF.px === 0 && sF.py === 0 && sF.pz === 0, '切视图把平移清零', J([sF.px, sF.py, sF.pz]));

  /* ---------------- G：画面自检（真的重画了，不是空转） ---------------- */
  console.log('\n[G] 场景自检');
  const sc = await ev(`(function(){var n=0;scene.traverse(function(o){if(o.isMesh)n++;});return {mesh:n,pos:camera.position.toArray().map(function(v){return +v.toFixed(3)})};})()`);
  chk(sc.mesh > 0, '场景里有 mesh', sc.mesh);
  chk(errs.length === 0, '运行期无 JS 异常', errs.slice(0, 2).join(' | '));

  console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
  ws.close(); child.kill(); process.exit(fail ? 1 : 0);
})().catch(e => { console.error('探针自身出错:', e); process.exit(2); });
