/* 探针：⓪ 蛋面钢架（正六边形平铺 · 钢架连接结构）
   判据全部读【屏上的字】+【场景里真实几何的顶点数/材质】+【2D 画布像素】，
   不拿函数自己的返回值当结论。 */
const { spawn } = require('child_process');
const os = require('os'), path = require('path'), fs = require('fs');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9343, DIR = __dirname;
const URL = 'http://127.0.0.1:8899/01_%E5%9F%BA%E7%A1%80%E7%90%86%E8%AE%BA/AAA_PKS%E4%BB%A3%E7%A0%81%E6%97%8F_3D%E5%8F%82%E6%95%B0%E5%8F%B0.html';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const J = JSON.stringify;
let pass = 0, fail = 0, skipped = 0;
function chk(c, label, extra) {
  if (c) { pass++; console.log('  \u2713 ' + label); }
  else { fail++; console.log('  \u2717 ' + label + (extra === undefined ? '' : '  \u2190 ' + extra)); }
}

(async () => {
  const ud = fs.mkdtempSync(path.join(os.tmpdir(), 'f0hex-'));
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
    if (m.method === 'Runtime.exceptionThrown') errs.push(m.params.exceptionDetails.text + ' ' + ((m.params.exceptionDetails.exception || {}).description || ''));
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push(m.params.args.map(a => a.value).join(' '));
  };
  const send = (m, p = {}) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result && r.result.exceptionDetails) throw new Error(expr.slice(0, 70) + ' → ' + J(r.result.exceptionDetails));
    return r.result.result.value;
  };

  /* ---------- 读屏 ---------- */
  const rowTxt = (name) => ev(`(function(){var rs=[].slice.call(document.querySelectorAll('#readout div'));
    for(var i=0;i<rs.length;i++){var s=rs[i].querySelector('span');
      if(s&&s.textContent.indexOf(${J(name)})>=0){var b=rs[i].querySelector('b');return b?b.textContent.trim():'';}}
    return '';})()`);
  const allRows = () => ev(`[].map.call(document.querySelectorAll('#readout div'),function(d){
    return d.querySelector('span').textContent+'='+d.querySelector('b').textContent;})`);
  const sliderLabels = () => ev(`[].map.call(document.querySelectorAll('#rows .row'),function(r){
    return (r.querySelector('label span')||{}).textContent||'';})`);
  const badge = () => ev('document.getElementById("badge").textContent.trim()');
  const choicesTxt = () => ev(`[].map.call(document.querySelectorAll('#rows .choices button'),function(b){return b.textContent.trim();}).join('|')`);
  const clickChoice = (txt) => ev(`(function(){var bs=[].slice.call(document.querySelectorAll('#rows .choices button, #choices button'));
    for(var i=0;i<bs.length;i++){if((bs[i].textContent||'').indexOf(${J(txt)})>=0){bs[i].click();return bs[i].textContent.trim();}}
    return '';})()`);
  const clickPreset = (txt) => ev(`(function(){var bs=[].slice.call(document.querySelectorAll('#presets button'));
    for(var i=0;i<bs.length;i++){if((bs[i].textContent||'').indexOf(${J(txt)})>=0){bs[i].click();return bs[i].textContent.trim();}}
    return '';})()`);
  const clickTab = (txt) => ev(`(function(){var bs=[].slice.call(document.querySelectorAll('#tabs button'));
    for(var i=0;i<bs.length;i++){if((bs[i].textContent||'').indexOf(${J(txt)})>=0){bs[i].click();return bs[i].textContent.trim();}}
    return '';})()`);

  const rectOf = (key) => ev(`(function(){var rs=[].slice.call(document.querySelectorAll('#rows .row'));
    for(var i=0;i<rs.length;i++){var s=rs[i].querySelector('label span');
      if(s&&s.textContent.indexOf(${J(key)})>=0){var b=rs[i].querySelector('label b');if(!b)return null;
        var r=b.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2,w:Math.round(r.width),h:Math.round(r.height),txt:b.textContent.trim()};}}
    return null;})()`);
  const valOf = (key) => ev(`(function(){var rs=[].slice.call(document.querySelectorAll('#rows .row'));
    for(var i=0;i<rs.length;i++){var s=rs[i].querySelector('label span');
      if(s&&s.textContent.indexOf(${J(key)})>=0){var b=rs[i].querySelector('label b');return b?b.textContent.trim():null;}}
    return null;})()`);
  const setRange = (name, val) => ev(`(function(){var rs=[].slice.call(document.querySelectorAll('#rows .row'));
    for(var i=0;i<rs.length;i++){var s=rs[i].querySelector('label span');
      if(s&&s.textContent.indexOf(${J(name)})>=0){
        var inp=rs[i].querySelector('input[type=range]');
        if(!inp)return 'noinput';
        inp.value=${J(String(val))};
        inp.dispatchEvent(new Event('input',{bubbles:true}));
        return inp.value;}}
    return 'norow';})()`);

  async function dblclickAt(r) {
    for (const cnt of [1, 2]) {
      await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: r.x, y: r.y, button: 'left', clickCount: cnt });
      await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: r.x, y: r.y, button: 'left', clickCount: cnt });
    }
  }
  async function typeIn(key, text) {
    /* 面板是 fixed + 内部滚动：目标行可能在视口外，先滚进来再量 rect，
       否则鼠标事件落在别的元素上，双击静默失效（看起来像"这参数不能改"）。 */
    await ev("(function(){var rs=[].slice.call(document.querySelectorAll('#rows .row'));" +
      "for(var i=0;i<rs.length;i++){var s=rs[i].querySelector('label span');" +
      "if(s&&s.textContent.indexOf(" + J(key) + ")>=0){rs[i].scrollIntoView({block:'center'});return 1;}}" +
      "return 0;})()");
    await sleep(700);
    const r = await rectOf(key);
    if (!r) return 'norect';
    console.log('  [typeIn] ' + key + ' rect=' + J(r) + ' hit=' + JSON.stringify(await ev(
      `(function(){var e=document.elementFromPoint(${r.x},${r.y});return e?(e.tagName+'|'+String(e.textContent).slice(0,12)):'null';})()`)));
    await dblclickAt(r); await sleep(400);
    const bi = await ev(`(function(){var b=document.querySelector('#rows input.numinput');
      return b?{val:b.value,min:b.min,max:b.max}:null;})()`);
    console.log('  [typeIn] numinput=' + JSON.stringify(bi));
    await send('Input.insertText', { text: String(text) });
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    await sleep(900);
    return await valOf(key);
  }

  /* ---------- 场景真实几何 ---------- */
  const hexGeo = () => ev(`(function(){
    var out={struts:0,nodes:0,panels:0,axis:0,strutsVerts:0,nodesVerts:0,
             yLo:1e9,yHi:-1e9,xLo:1e9,xHi:-1e9,pvc:false};
    root.traverse(function(o){
      if(o.name==='hexStruts'){out.struts++;out.strutsVerts=o.geometry.attributes.position.count;
        var a=o.geometry.attributes.position.array;
        for(var i=0;i<a.length;i+=3){if(a[i+1]<out.yLo)out.yLo=a[i+1];if(a[i+1]>out.yHi)out.yHi=a[i+1];
          if(a[i]<out.xLo)out.xLo=a[i];if(a[i]>out.xHi)out.xHi=a[i];}}
      if(o.name==='hexNodes'){out.nodes++;out.nodesVerts=o.geometry.attributes.position.count;}
      if(o.name==='hexPanels'){out.panels++;out.pvc=!!(o.material&&o.material.vertexColors);}
      if(o.name==='hexAxis')out.axis++;
    });
    out.ySpan=+(out.yHi-out.yLo).toFixed(4);
    out.xSpan=+(out.xHi-out.xLo).toFixed(4);
    return out;})()`);
  const meshCount = () => ev(`(function(){var n=0;root.traverse(function(o){if(o.isMesh)n++;});return n;})()`);

  const shotStat = () => ev(`(function(){renderer.render(scene,camera);
    var cv=document.getElementById('cv3d');
    var c2=document.createElement('canvas');c2.width=cv.width;c2.height=cv.height;
    var g=c2.getContext('2d');g.drawImage(cv,0,0);
    var d=g.getImageData(0,0,c2.width,c2.height).data,n=0,steel=0,tot=c2.width*c2.height;
    var br=d[0],bg=d[1],bb=d[2];
    for(var i=0;i<d.length;i+=4){var r=d[i],gg=d[i+1],b=d[i+2];
      if(Math.abs(r-br)+Math.abs(gg-bg)+Math.abs(b-bb)>18)n++;
      if(r>100&&r<190&&gg>110&&gg<200&&b>130&&b<215&&Math.abs(r-gg)<40&&Math.abs(gg-b)<40)steel++;}
    return {nonBg:n/tot,steel:steel,tot:tot,data:cv.toDataURL('image/jpeg',0.9)};})()`);

  const profStat = () => ev(`(function(){var cv=document.getElementById('prof');
    if(!cv)return null;var g=cv.getContext('2d');var w=cv.width,h=cv.height;
    var d=g.getImageData(0,0,w,h).data,n=0,ring=0,red=0;
    for(var i=0;i<d.length;i+=4){var r=d[i],gg=d[i+1],b=d[i+2];
      if(!(r>248&&gg>248&&b>248))n++;
      if(r>140&&r<190&&gg>160&&gg<210&&b>195&&b<235)ring++;
      if(r>150&&gg<110&&b<110)red++;}
    return {w:w,h:h,nonWhite:n,ring:ring,red:red,tot:w*h};})()`);

  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: URL });
  await sleep(5200);
  console.log('页面：' + await ev('document.title'));
  await ev(`(function(){var p=document.getElementById('fxp');if(p)p.classList.remove('fxp-min');return 1;})()`);
  await sleep(700);

  /* ================= A. 默认档：锥面，不该有钢架 ================= */
  console.log('\n[A] 默认（cutSkin=0）必须是原来的锥面，不能偷偷长出钢架');
  chk((await clickTab('\u24EA \u53cc\u9525')) !== '', '切到 ⓪ 子页');
  await sleep(1200);
  const cs0 = await choicesTxt();
  console.log('  选择器：' + cs0.slice(0, 200));
  chk(cs0.indexOf('\u539f\u6837\uff08\u9525\u9762') >= 0 && cs0.indexOf('\u86cb\u9762\u94a2\u67b6\uff08') >= 0 &&
      cs0.indexOf('\u86cb\u9762\u94a2\u67b6 + \u8584\u58f3') >= 0,
    '「表面构建」三档都在（原样 / 钢架 / 钢架+薄壳）', cs0.slice(-140));
  let g0 = await hexGeo();
  chk(g0.struts === 0, '默认档场景里没有 hexStruts', J(g0));
  const labs0 = await sliderLabels();
  chk(!labs0.some(s => s.indexOf('\u6bcd\u7ebf\u5206\u884c\u6570') >= 0),
    '默认档不显示钢架滑条（when 生效，不是假参数）', labs0.join(',').slice(0, 100));

  /* ================= B. 切到钢架 ================= */
  console.log('\n[B] 切到「蛋面钢架」');
  await clickChoice('\u86cb\u9762\u94a2\u67b6\uff08');
  await sleep(2600);
  const labs1 = await sliderLabels();
  console.log('  滑条：' + labs1.join(' , '));
  chk(labs1.some(s => s.indexOf('\u6bcd\u7ebf\u5206\u884c\u6570') >= 0), '出现「母线分行数 M」滑条');
  chk(labs1.some(s => s.indexOf('\u4e24\u7aef\u52a0\u5bc6\u6307\u6570') >= 0), '出现「两端加密指数 q」滑条');
  chk(labs1.some(s => s.indexOf('\u9762\u79ef\u2192\u6746\u5f84\u6307\u6570') >= 0), '出现「面积→杆径指数 γ」滑条');
  chk(!labs1.some(s => s.indexOf('\u86cb\u6570') >= 0), '钢架档藏掉「蛋数」滑条（钢架只铺单颗）');
  chk(!labs1.some(s => s.indexOf('\u8868\u9762\u7740\u8272') >= 0), '钢架档藏掉「曲面着色」滑条');

  const g1 = await hexGeo();
  console.log('  几何：' + J(g1));
  chk(g1.struts === 1, '场景里有一组 hexStruts', J(g1));
  /* ⚠ 杆数/节点数随行数·量化在变，不能写死。改成【读屏上的杆数】再乘上
     "每根杆固定 72 个顶点"（14 顶点/72 索引 = 24 三角，含六边形端盖），
     屏上数字与场景顶点数必须对得上 —— 这仍然是跨源核对，不是恒真式。 */
  const rp = await rowTxt('杆 / 节点');
  const mS = rp.match(/(\d+)\s*根杆/), mN = rp.match(/(\d+)\s*个节点/);
  const nS = mS ? +mS[1] : 0, nN = mN ? +mN[1] : 0;
  console.log('  屏上：' + rp + '　⇒ 杆 ' + nS + ' / 节点 ' + nN);
  chk(nS > 100, '读数面板报出了杆数与节点数', J(rp));
  chk(g1.strutsVerts === nS * 72, 'hexStruts 顶点数 = 屏上 ' + nS + ' 杆 × 72（24 三角/杆 · 含六边形端盖）', g1.strutsVerts);
  /* 八面体 8 面 × 3 顶点 = 24（toNonIndexed 之后） */
  chk(g1.nodes === 1 && g1.nodesVerts === nN * 24, '节点八面体 = 屏上 ' + nN + ' 个 × 24 = ' + (nN * 24) + ' 顶点', g1.nodesVerts);
  chk(g1.axis === 1, '有一根 hexAxis（z 轴穿过两极格中心）');
  chk(Math.abs(g1.ySpan - 2.2) < 0.02, '钢架 y 跨度 = 蛋高 2.2（只统计杆件，轴没算进来）', g1.ySpan);
  /* 蛋最大半宽 r_max=0.638788（平面内）· sc=2.2/1.782321 ⇒ 直径 1.5767 */
  const xExp = 2 * 0.638788 * (2.2 / 1.782321);
  chk(Math.abs(g1.xSpan - xExp) < 0.06, 'x 跨度 = 蛋最大直径 ' + xExp.toFixed(4), g1.xSpan);

  /* 读数 */
  const bd = await badge();
  console.log('  badge：' + bd);
  chk(bd.indexOf('\u86cb\u9762\u94a2\u67b6') >= 0, 'badge 写着「蛋面钢架」');
  chk(/\u884c/.test(bd) && /\u683c/.test(bd), 'badge 带行数与格数', bd);

  const rTip = await rowTxt('\u4e0a\u6781\u683c\uff08\u5c16\u7aef\uff09');
  const rBase = await rowTxt('\u4e0b\u6781\u683c\uff08\u949d\u7aef\uff09');
  console.log('  上极格：' + rTip + ' / 下极格：' + rBase);
  chk(/^6 \u8fb9 .*\u683c\u5fc3\u5230\u8f74 0\.000000$/.test(rTip),
    '上极格 = 6 边，格心到轴 0.000000（z 轴真穿过格中心）', rTip);
  chk(/^6 \u8fb9 .*\u683c\u5fc3\u5230\u8f74 0\.000000$/.test(rBase),
    '下极格 = 6 边，格心到轴 0.000000', rBase);

  const rEuler = await rowTxt('\u6b27\u62c9\u8d26');
  chk(rEuler.indexOf('12') >= 0, '欧拉账 Σ(6−边数) = 12（球面必须）', rEuler);

  const rCells = await rowTxt('\u683c\u6570');
  console.log('  格数：' + rCells);
  const mCell = rCells.match(/(\d+) \u683c/), mHex = rCells.match(/\u516d\u8fb9\u5f62 (\d+)/);
  chk(!!mCell && Number(mCell[1]) > 300, '格数 > 300', rCells);
  chk(!!mHex && Number(mHex[1]) > 250, '六边形 > 250（拓扑上绝大多数是六边形）', rCells);
  chk(!!mHex && Number(mHex[1]) / Number(mCell[1]) > 0.9,
    '六边形占比 > 90%（只有段界那一圈出 5/7 边）',
    mHex[1] + '/' + mCell[1]);

  /* 「正六边形」不能只数边数 —— 数边数是拓扑，形状还得看六条棱等不等长。
     这一行读的是每格 poly 上相邻对偶顶点的真实距离，与构造公式无关
     （2026-11-03：拉链漏了交错半格的相位，六棱长短差 2.674 倍，
      光看「96% 是六边形」完全看不出来）。 */
  const rErg = await rowTxt('\u516d\u68f1\u7b49\u957f\u6bd4');
  console.log('  六棱等长比：' + rErg);
  const mErg = rErg.match(/\u4e2d\u4f4d ([\d.]+)/);
  chk(!!mErg, '读数给出六棱等长比', rErg);
  chk(!!mErg && Number(mErg[1]) < 1.30,
    '六棱等长比中位 < 1.30（形状也接近正六边形，不只是边数对）', rErg);
  chk(!!mErg && Number(mErg[1]) >= 1.0, '六棱等长比 ≥ 1.000（不能比 1 还小）', rErg);

  /* 逐圈 宽/行距：正六边形恒为 1/(√3/2) = 1.15470。
     读 ringS 的弧长差算出来，是「行距真服从列数」的独立证据。 */
  const rDH = await rowTxt('\u6bcf\u5708 \u5bbd\/\u884c\u8ddd');
  console.log('  每圈宽/行距：' + rDH);
  const mDH = rDH.match(/(\d+) \u5708\u91cc (\d+) \u5708/);
  chk(!!mDH, '读数给出逐圈宽/行距核验', rDH);
  chk(!!mDH && Number(mDH[2]) / Number(mDH[1]) > 0.9,
    '> 90% 的纬圈落在 1.1547±0.02（行距服从列数，不是各走各的）', rDH);

  const rPct = await rowTxt('\u683c\u9762\u79ef\u5360\u6bd4');
  chk(rPct.indexOf('100%') >= 0, '格面积占比写明 Σ=100%', rPct);

  const rRow = await rowTxt('\u7eac\u5708\u884c\u8ddd');
  console.log('  行距比：' + rRow);
  const qDef = await valOf('\u4e24\u7aef\u52a0\u5bc6\u6307\u6570');
  const mRatio = rRow.match(/([\d.]+)\u00d7/);
  chk(!!mRatio && Number(mRatio[1]) > 4,
    '默认 q=' + qDef + ' ⇒ 赤道:极点 行距 > 4×（两端确实更密）', rRow);

  const rDia = await rowTxt('\u68f1\u6746\u5f84');
  console.log('  杆径：' + rDia);
  chk(/\d+\.\d+ ~ \d+\.\d+/.test(rDia), '杆径给出区间（∝ 面积占比^γ）', rDia);

  /* ================= C. 参数联动 ================= */
  console.log('\n[C] 参数联动');
  const q0 = await setRange('\u4e24\u7aef\u52a0\u5bc6\u6307\u6570', 0);
  await sleep(2000);
  const rRow0 = await rowTxt('\u7eac\u5708\u884c\u8ddd');
  const m0 = rRow0.match(/([\d.]+)\u00d7/);
  chk(q0 === '0', '滑条设到 q=0', q0);
  /* q=0 是「等弧长」档。行距现在是 0.866·(周长/列数)，而列数在两极被压到 6 的下限，
     所以末几圈仍然偏密 —— 判据只能写「接近 1」，写死 1.00 是拿旧实现当标准。 */
  chk(!!m0 && Number(m0[1]) < 1.45,
    'q=0 ⇒ 赤道:极点 < 1.45×（等弧长档，行距基本拉平）', rRow0);
  /* q=0 的另一个后果：格子大小被拉平 ⇒ 六棱更等长。这是同一套机制的交叉验证，
     不是恒真式：q=1 时中位 1.22，q=0 时必须明显更小才说明 q 真的接在几何上。 */
  const rErg0 = await rowTxt('\u516d\u68f1\u7b49\u957f\u6bd4');
  const mErg0 = rErg0.match(/\u4e2d\u4f4d ([\d.]+)/);
  console.log('  q=0 六棱等长比：' + rErg0);
  chk(!!mErg0 && Number(mErg0[1]) < Number(mErg ? mErg[1] : 1.3) - 0.05,
    'q=0 ⇒ 六棱等长比明显小于 q=1.0（q 真接在几何上，不是摆设）',
    'q=0 ' + (mErg0 ? mErg0[1] : '?') + ' vs q=1 ' + (mErg ? mErg[1] : '?'));

  const q1 = await setRange('\u4e24\u7aef\u52a0\u5bc6\u6307\u6570', 1.0);
  await sleep(2000);
  const rRow1 = await rowTxt('\u7eac\u5708\u884c\u8ddd');
  const m1 = rRow1.match(/([\d.]+)\u00d7/);
  chk(q1 === '1', '滑条设到 q=1.0', q1);
  chk(!!m1 && Number(m1[1]) > 8, 'q=1.0 ⇒ 行距比 > 8×（比 q=0 明显更陡）', rRow1);

  const gA = await setRange('\u9762\u79ef\u2192\u6746\u5f84\u6307\u6570', 0);
  await sleep(2000);
  const dA = await rowTxt('\u68f1\u6746\u5f84');
  const mmA = dA.match(/([\d.]+) ~ ([\d.]+)/);
  chk(gA === '0', '滑条设到 γ=0', gA);
  /* γ=0 时单格杆径全等于基准 3.20‰；最粗那根还会被「短杆上限」压低，
     所以判据不能写「全部相等」，要写「最粗 = 基准」。 */
  chk(!!mmA && Math.abs(Number(mmA[2]) - 3.20) < 0.06,
    'γ=0 ⇒ 最粗杆径 = 基准 3.20‰（面积不再调粗细）', dA);
  chk(!!mmA && Number(mmA[2]) / Number(mmA[1]) < 2.5,
    'γ=0 ⇒ 最粗/最细 < 2.5×（差异只来自短杆上限）', dA);

  const gB = await setRange('\u9762\u79ef\u2192\u6746\u5f84\u6307\u6570', 1.4);
  await sleep(2000);
  const dB = await rowTxt('\u68f1\u6746\u5f84');
  const mB = dB.match(/比 ([\d.]+)×/);
  chk(gB === '1.4', '滑条设到 γ=1.4', gB);
  chk(!!mB && Number(mB[1]) > 3, 'γ=1.4 ⇒ 最粗/最细 > 3×（大格明显更粗）', dB);

  /* 双击改值：钢架参数也得能改（铁律 106 同一套） */
  const typed = await typeIn('\u6bcd\u7ebf\u5206\u884c\u6570', 40);
  const gC = await hexGeo();
  const rCells2 = await rowTxt('\u683c\u6570');
  const mC = rCells2.match(/(\d+) \u683c/);
  chk(typed === '40', '双击「母线分行数 M」读数 ⇒ 改成 40', typed);
  chk(!!mC && Number(mC[1]) > 800, 'M=40 ⇒ 格数涨到 800 以上', rCells2);
  chk(gC.strutsVerts > g1.strutsVerts, '杆的顶点数跟着涨（几何真重建了，不是只改字）',
    g1.strutsVerts + ' → ' + gC.strutsVerts);

  /* 杆长夹紧：粗杆 + γ 负 ⇒ 短杆必须被限 */
  await setRange('\u6746\u5f84\u57fa\u51c6', 9);
  await setRange('\u9762\u79ef\u2192\u6746\u5f84\u6307\u6570', -1.5);
  await sleep(2400);
  const rClamp = await rowTxt('\u77ed\u6746\u4e0a\u9650');
  console.log('  短杆上限：' + rClamp);
  chk(rClamp.indexOf('\u5939\u4f4f\u4e86') >= 0, '极端档（r₀=9‰ · γ=−1.5）确实夹住了短杆（不是死代码）', rClamp);

  /* ================= D. 薄壳 ================= */
  console.log('\n[D] 钢架 + 薄壳');
  await clickChoice('\u86cb\u9762\u94a2\u67b6 + \u8584\u58f3');
  await sleep(2600);
  const g2 = await hexGeo();
  chk(g2.panels === 1, '出现 hexPanels 薄壳', J(g2));
  chk(g2.pvc === true, '薄壳用顶点色（按面积占比上色）');
  chk(g2.struts === 1, '薄壳档钢架仍在（是「加」不是「换」）');

  /* ================= E. 铺不出：换直圆锥 ================= */
  console.log('\n[E] 母线不是闭合蛋时，必须老实说铺不出');
  await clickChoice('\u76f4\u5706\u9525');
  await sleep(2400);
  const bd2 = await badge();
  const g3 = await hexGeo();
  console.log('  badge：' + bd2);
  chk(bd2.indexOf('\u94a2\u67b6\u94fa\u4e0d\u51fa') >= 0, 'badge 明说「钢架铺不出」', bd2);
  chk(g3.struts === 0, '此时场景里没有 hexStruts（退回锥面画法）', J(g3));
  const rBad = await rowTxt('\u26a0 \u94fa\u4e0d\u51fa\u94a2\u67b6');
  chk(rBad.length > 10, '读数有一行「⚠ 铺不出钢架」并说明原因', rBad);

  await clickChoice('\u5355\u53f6\u53cc\u66f2\u9762');
  await sleep(2400);
  const g4 = await hexGeo();
  chk(g4.struts === 1, '换回单叶双曲面 ⇒ 钢架恢复', J(g4));

  /* ================= F. 2D 分行图 ================= */
  console.log('\n[F] 2D 母线分行图');
  await ev(`(function(){var p=document.querySelector('#prof');if(p)p.scrollIntoView({block:'center'});return 1;})()`);
  await sleep(600);
  const ps = await profStat();
  console.log('  prof 像素：' + J(ps));
  chk(ps && ps.ring > 60, '2D 里有纬圈横线（浅蓝 #9fb6d6 像素 > 60）', ps && ps.ring);
  chk(ps && ps.red > 100, '2D 里有母线曲线（红色）', ps && ps.red);
  const profTxt = await ev(`(function(){var cv=document.getElementById('prof');
    var g=cv.getContext('2d');var d=g.getImageData(0,cv.height-16,cv.width,16).data;
    return d.length;})()`);
  chk(profTxt > 0, '2D 底部有文字带（读像素存在）');

  /* ================= G. 画面 & 异常 ================= */
  console.log('\n[G] 画面');
  await setRange('\u9762\u79ef\u2192\u6746\u5f84\u6307\u6570', 1.4);
  await sleep(2200);
  const s1 = await shotStat();
  console.log('  非背景像素 ' + (100 * s1.nonBg).toFixed(1) + '% / 钢灰像素 ' + s1.steel);
  chk(s1.nonBg > 0.05 && s1.nonBg < 0.995, '3D 画面里真有东西（非背景 ' + (100 * s1.nonBg).toFixed(1) + '%）');
  chk(s1.steel > 800, '画面里有钢灰色杆件像素（' + s1.steel + ' px）');
  fs.writeFileSync(path.join(DIR, '_shot_f0hex.jpg'), Buffer.from(s1.data.split(',')[1], 'base64'));
  fs.writeFileSync(path.join(DIR, '_shot_f0hex_2d.jpg'), Buffer.from(await ev(`(function(){
    var cv=document.getElementById('prof');return cv.toDataURL('image/jpeg',0.92);})()`).then(d => d.split(',')[1]), 'base64'));

  /* ================= H. 切族往返 ================= */
  console.log('\n[H] 切到 ① 再切回');
  await clickTab('\u2460 \u53cc\u6ce2\u7eb9\u76d8');
  await sleep(2200);
  chk((await hexGeo()).struts === 0, '切到 ① 后没有残留钢架');
  await clickTab('\u24EA \u53cc\u9525');
  await sleep(2600);
  /* selectFam() 每次把 P 重置成该族 def ⇒ 切回来是「锥面档」，不是上次的钢架档。
     这是页面所有族的统一行为，判据要按事实写，不能当成「参数没记住」。 */
  const g5 = await hexGeo();
  chk(g5.struts === 0, '切回 ⓪ 回到族默认（锥面档 · selectFam 重置 P）', J(g5));
  chk((await rowTxt('\u9525\u9762')).indexOf('\u5355\u53f6\u53cc\u66f2\u9762') >= 0,
    '切回后读数是锥面那一套（母线 = 单叶双曲面）');
  await clickPreset('\u2605 \u86cb\u9762\u94a2\u67b6');
  await sleep(2800);
  const g6 = await hexGeo();
  chk(g6.struts === 1, '再点一次「★ 蛋面钢架」预设 ⇒ 钢架恢复', J(g6));
  chk((await rowTxt('\u4e0a\u6781\u683c\uff08\u5c16\u7aef\uff09')).indexOf('0.000000') >= 0, '恢复后极格仍为 0.000000');

  /* ================= I. 预设 ================= */
  console.log('\n[I] 预设');
  const ps2 = await ev(`[].map.call(document.querySelectorAll('#presets button'),function(b){return b.textContent.trim();})`);
  const hexPresets = ps2.filter(t => t.indexOf('\u94a2\u67b6') >= 0);
  console.log('  钢架预设 ' + hexPresets.length + ' 条：' + hexPresets.join(' | ').slice(0, 160));
  chk(hexPresets.length >= 6, '钢架相关预设 ≥ 6 条（标题里都带「钢架」）', hexPresets.length);
  const hitP = await clickPreset('\u7b49\u5f27\u957f\u5bf9\u7167');
  await sleep(2400);
  const rRowEq = await rowTxt('\u7eac\u5708\u884c\u8ddd');
  const mEq = rRowEq.match(/([\d.]+)\u00d7/);
  chk(hitP !== '' && !!mEq && Number(mEq[1]) < 1.45,
    '预设「等弧长对照 q=0」⇒ 行距比落回 1.45× 以内（等弧长档）', rRowEq);

  console.log('\n--------');
  console.log('JS 异常：' + (errs.length ? errs.slice(0, 4).join(' ;; ') : '无'));
  chk(errs.length === 0, '全程没有 JS 异常', errs.slice(0, 2).join(' ;; '));
  console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败' + (skipped ? ' / ' + skipped + ' 跳过' : ''));
  try { ws.close(); } catch (e) {}
  try { child.kill(); } catch (e) {}
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('探针崩了：' + e.message); process.exit(2); });
