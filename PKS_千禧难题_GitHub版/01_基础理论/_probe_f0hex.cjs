/* 探针：⓪ 蛋面钢架（正六边形平铺 · 钢架连接结构）
   判据全部读【屏上的字】+【场景里真实几何的顶点数/材质】+【2D 画布像素】，
   不拿函数自己的返回值当结论。 */
const { spawn } = require('child_process');
const { decodeFirstFrame } = require('./_gifdec.cjs');
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
    var d=g.getImageData(0,0,c2.width,c2.height).data,n=0,steel=0,hue=0,tot=c2.width*c2.height;
    var br=d[0],bg=d[1],bb=d[2];
    for(var i=0;i<d.length;i+=4){var r=d[i],gg=d[i+1],b=d[i+2];
      var mx=Math.max(r,gg,b),mn=Math.min(r,gg,b);
      if(Math.abs(r-br)+Math.abs(gg-bg)+Math.abs(b-bb)>18)n++;
      if(r>100&&r<190&&gg>110&&gg<200&&b>130&&b<215&&Math.abs(r-gg)<40&&Math.abs(gg-b)<40)steel++;
      /* 彩色（有饱和）且不是背景：cmap 上色后杆件该落在这里 */
      if(mx-mn>45&&mx>90)hue++;}
    return {nonBg:n/tot,steel:steel,hue:hue,tot:tot,data:cv.toDataURL('image/jpeg',0.9)};})()`);

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

  /* ================= A. 族默认 = ★ 双层桁架；「原样」档必须真的没有钢架 ================= */
  console.log('\n[A] 族默认是 ★ 双层 + 四面体芯（cutSkin=4）；切到「原样」必须干净退回锥面');
  chk((await clickTab('\u24EA \u53cc\u9525')) !== '', '切到 ⓪ 子页');
  await sleep(1400);
  /* 内芯密度的【默认档】必须在这里判：等 [J] 段把 hxCore 拉到「全建」再判，
     读到的就是被 J 改过的值（第一版就是这么假红的）。默认值只在"刚进页面"时成立。 */
  const coreDef = await ev(`(function(){
    var ws=[].slice.call(document.querySelectorAll('#rows > div'));
    for(var i=0;i<ws.length;i++){
      var lab=ws[i].firstElementChild;
      if(!lab||(lab.textContent||'').indexOf('\u5185\u82af\u5bc6\u5ea6')<0)continue;
      var bs=[].slice.call(ws[i].querySelectorAll('.choices button'));
      return {n:bs.length,on:bs.map(function(b){return b.className==='on';}),
              p:(P.hxCore===undefined?null:(P.hxCore|0))};}
    return null;})()`);
  chk(coreDef && coreDef.n === 4 && coreDef.p === 1 && coreDef.on[1] === true,
    '刚进页面：内芯密度默认 = 第 2 档「★ 稀疏」（4 个档里亮着第 2 个，P.hxCore = 1）', J(coreDef));
  const cs0 = await choicesTxt();
  console.log('  选择器：' + cs0.slice(0, 220));
  chk(cs0.indexOf('\u539f\u6837\uff08\u9525\u9762') >= 0 && cs0.indexOf('\u5355\u5c42\u94a2\u67b6\uff08') >= 0 &&
      cs0.indexOf('\u5355\u5c42 + \u8584\u58f3') >= 0 && cs0.indexOf('\u53cc\u5c42\u58f3\u4f53\uff08') >= 0 &&
      cs0.indexOf('\u53cc\u5c42 + \u659c\u6491 + \u56db\u9762\u4f53\u82af\uff08') >= 0 &&
      cs0.indexOf('\u53cc\u5c42 + \u659c\u6491 + \u56db\u9762\u4f53\u82af + \u8584\u58f3') >= 0,
    '「表面构建」六档都在（原样 / 单层 / 单层+薄壳 / 双层 / 双层+四面体 / 双层+四面体+薄壳）', cs0.slice(-160));
  let g0 = await hexGeo();
  chk(g0.struts === 1, '族默认就有钢架（默认档已升级成双层桁架，不是原来的锥面）', J(g0));
  const bd0 = await badge();
  chk(bd0.indexOf('\u53cc\u5c42\u94a2\u67b6') >= 0, '族默认 badge 写着「双层钢架」', bd0);
  const labs0 = await sliderLabels();
  chk(labs0.some(s => s.indexOf('\u6bcd\u7ebf\u5206\u884c\u6570') >= 0),
    '默认档显示钢架滑条（when 生效，不是假参数）', labs0.join(',').slice(0, 100));

  /* 「原样」档：必须真的把钢架撤干净，不能在锥面上叠一层 */
  await clickChoice('\u539f\u6837\uff08\u9525\u9762');
  await sleep(2400);
  const g0b = await hexGeo();
  chk(g0b.struts === 0 && g0b.panels === 0, '「原样（锥面 + 切面 + 交线）」档场景里没有 hexStruts', J(g0b));
  const labs0b = await sliderLabels();
  chk(!labs0b.some(s => s.indexOf('\u6bcd\u7ebf\u5206\u884c\u6570') >= 0),
    '「原样」档藏掉钢架滑条（when 按 cutSkin 分流）', labs0b.join(',').slice(0, 100));

  /* ================= B. 切到单层钢架 ================= */
  console.log('\n[B] 切到「单层钢架」');
  await clickChoice('\u5355\u5c42\u94a2\u67b6\uff08');
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
  const hitShell = await clickChoice('\u5355\u5c42 + \u8584\u58f3');
  await sleep(2800);
  const g2 = await hexGeo();
  chk(hitShell !== '' && g2.panels === 1, '「单层 + 薄壳」⇒ 出现 hexPanels 薄壳', hitShell + ' ' + J(g2));
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
  console.log('  非背景像素 ' + (100 * s1.nonBg).toFixed(1) + '% / 彩色像素 ' + s1.hue + ' / 钢灰像素 ' + s1.steel);
  chk(s1.nonBg > 0.05 && s1.nonBg < 0.995, '3D 画面里真有东西（非背景 ' + (100 * s1.nonBg).toFixed(1) + '%）');
  /* 默认配色是 plasma ⇒ 屏上杆件必须是【有饱和的颜色】，不是原来的钢灰。
     这条同时证明 cmap 真的上到了画面上，而不只是缓冲区里有个 color 属性。 */
  chk(s1.hue > 2000, '画面里真有彩色杆件像素（cmap 上屏 · ' + s1.hue + ' px）', s1.hue);
  fs.writeFileSync(path.join(DIR, '_shot_f0hex.jpg'), Buffer.from(s1.data.split(',')[1], 'base64'));
  fs.writeFileSync(path.join(DIR, '_shot_f0hex_2d.jpg'), Buffer.from(await ev(`(function(){
    var cv=document.getElementById('prof');return cv.toDataURL('image/jpeg',0.92);})()`).then(d => d.split(',')[1]), 'base64'));

  /* ================= H. 切族往返 ================= */
  console.log('\n[H] 切到 ① 再切回');
  await clickTab('\u2460 \u53cc\u6ce2\u7eb9\u76d8');
  await sleep(2200);
  chk((await hexGeo()).struts === 0, '切到 ① 后没有残留钢架');
  await clickTab('\u24EA \u53cc\u9525');
  await sleep(3000);
  /* selectFam() 每次把 P 重置成该族 def ⇒ 切回来是【族默认 = 双层桁架】，
     不是上次的档、也不是老版本的锥面档。判据按事实写：
     既要核「双层回来了」，也要核「没有把上次的薄壳/单层带回来」。 */
  const g5 = await hexGeo();
  chk(g5.struts === 1 && g5.panels === 0, '切回 ⓪ ⇒ 回到族默认（★ 双层，不是上次的薄壳档）', J(g5));
  const bd5 = await badge();
  chk(bd5.indexOf('\u53cc\u5c42\u94a2\u67b6') >= 0, '切回后 badge 是「双层钢架」', bd5);
  /* 老版本这里判「读数是单叶双曲面」—— 那是 cutSkin=0 时代的口径。
     现在族默认是双层桁架，读数第一行是「表面构建」，没有「母线」那一行了。
     判据改成读【表面构建】那一行：必须写着 ★ 的那一档（证明 P 被重置成族默认，
     而不是把上一个档位的薄壳/单层带回来）。 */
  const rSkin5 = await rowTxt('\u8868\u9762\u6784\u5efa');
  chk(rSkin5.indexOf('\u53cc\u5c42') >= 0 && rSkin5.indexOf('\u56db\u9762\u4f53\u82af') >= 0,
    '切回后读数第一行 = 族默认那一档（双层 + 四面体芯）', rSkin5);
  chk(rSkin5.indexOf('\u8584\u58f3') < 0, '切回后「表面构建」不带薄壳（上一个档位没被带回来）', rSkin5);
  await clickPreset('\u2605 \u86cb\u9762\u94a2\u67b6');
  await sleep(2800);
  const g6 = await hexGeo();
  chk(g6.struts === 1, '点「★ 蛋面钢架」预设 ⇒ 单层钢架', J(g6));
  chk((await badge()).indexOf('\u86cb\u9762\u94a2\u67b6') >= 0, '预设后 badge 退回「蛋面钢架」（单层口径）', await badge());
  chk((await rowTxt('\u4e0a\u6781\u683c\uff08\u5c16\u7aef\uff09')).indexOf('0.000000') >= 0, '预设后极格仍为 0.000000');
  chk((await rowTxt('\u7b2c\u4e8c\u5c42\u7f29\u653e')) === '', '单层档没有「第二层缩放 λ」那一行（读数跟着档位走）');

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

  /* ================= J. 双层壳体 + 四面体芯 + cmap =================
     判据原则：能从两条【不同的行】里各取一个数、再核它们必须相等/相差一个系数，
     就绝不写死那个数（写死 = 换个 M 就假绿）。 */
  console.log('\n[J] 双层壳体：对偶恒等式 · 正四面体最优 · 四面体朝内 · cmap 渐变');
  const numOf = (s, re) => {
    const m = String(s == null ? '' : s).replace(/\s+/g, '').match(re || /(-?\d+(?:\.\d+)?)/);
    return m ? Number(m[1]) : NaN;
  };
  const L2geo = () => ev(`(function(){
    var out={};
    root.traverse(function(o){
      if(!o.isMesh)return;
      if(['hexStruts','hexNodes','hexTie','hexSpoke','hexIn2','hexBrace','hexApex','hexInner','hexNodes2','hexPanels'].indexOf(o.name)<0)return;
      var g=o.geometry, a=g.attributes.position.array, i, s=0, rmin=1e9, rmax=0, cmin=1e9, cmax=-1e9;
      for(i=0;i<a.length;i+=3){
        var R=Math.sqrt(a[i]*a[i]+a[i+1]*a[i+1]+a[i+2]*a[i+2]);
        s+=R; if(R<rmin)rmin=R; if(R>rmax)rmax=R;
      }
      var col=g.attributes.color;
      if(col){for(i=0;i<col.array.length;i++){if(col.array[i]<cmin)cmin=col.array[i];if(col.array[i]>cmax)cmax=col.array[i];}}
      out[o.name]={v:g.attributes.position.count, vis:o.visible, n:a.length/3,
        rMean:+(s/(a.length/3)).toFixed(4), rMin:+rmin.toFixed(4), rMax:+rmax.toFixed(4),
        cAttr:!!col, vc:!!(o.material&&o.material.vertexColors),
        cMin:col?+cmin.toFixed(4):null, cMax:col?+cmax.toFixed(4):null,
        base:o.material&&o.material.color?o.material.color.getHexString():'',
        /* 判「黑不黑」不能看单通道：紫色本来就该 g≈0。
           要看【每个顶点最强的那一路】—— 它才是这个颜色亮不亮。 */
        cDarkMax:col?(function(){var d=1e9,nb=0;
          for(var j=0;j<col.array.length;j+=3){var m=Math.max(col.array[j],col.array[j+1],col.array[j+2]);
            if(m<d)d=m; if(m<0.01)nb++;}
          return {dark:+d.toFixed(4), black:nb};})():null};
    });
    return out;})()`);

  const hitL2 = await clickPreset('\u53cc\u5c42 + \u56db\u9762\u4f53\u82af');
  await sleep(3600);
  chk(hitL2 !== '', '点中「★ 双层 + 四面体芯」预设', hitL2);
  const bdL2 = await badge();
  console.log('  badge：' + bdL2);
  chk(bdL2.indexOf('\u53cc\u5c42\u94a2\u67b6') >= 0, 'badge 写着「双层钢架」', bdL2);
  chk(/plasma/i.test(bdL2), 'badge 点名 plasma 配色', bdL2);

  /* ⚠ 这一段判的是【对偶几何本身对不对】（四面体数 = 三角面数、内顶点网三正则），
     这两个恒等式只在「全建」档成立：抽稀档不是每个面都长锥，按定义就不该成立。
     所以先把内芯密度拉到「全建」再判几何；降档的账在 [Q] 里单独判。
     （2026-11-04 加了 hxCore、默认档从"全建"变"稀疏"之后，下面两条曾变红 ——
       红得对：不是几何错了，是判据挑错了档。判据要跟着"哪个量在哪个档才成立"走。） */
  await ev(`(function(){P.hxCore=3;rebuild();buildUI();return 1;})()`);
  await sleep(3200);
  chk((await ev('P.hxCore|0')) === 3, '本次几何核验先把内芯密度拉到「全建」（下面两条恒等式只在这一档成立）');

  const rLam = await rowTxt('\u7b2c\u4e8c\u5c42\u7f29\u653e');
  const rGap = await rowTxt('\u5c42\u95f4\u8ddd h');
  const rSide = await rowTxt('\u4e09\u6761\u4fa7\u68f1');
  const rTet = await rowTxt('\u56db\u9762\u4f53\u82af');
  const rTri = await rowTxt('\u5185\u5c42\u6b63\u4e09\u89d2\u7f51');
  /* 层间连接有三种接法，读数行名跟着变：web=1 是「层间腹杆」，web=0/2 是「层间径向杆」。
     ⚠ 探针必须按当前接法去读对应的行 —— 盯死一个行名，换个接法就拿到 NaN
     （2026-11-03 改完接法后正是这么假红了一条）。 */
  const webMode = await ev(`(function(){return (P.hxWeb===undefined?1:(P.hxWeb|0));})()`);
  const rTie = await rowTxt(webMode === 1 ? '\u5c42\u95f4\u8179\u6746' : '\u5c42\u95f4\u5f84\u5411\u6746');
  /* ⚠ 文本只用来核对「屏上印的数」；结构恒等式一律用 stats 的数值 ——
     两者混用会读错行：web=1 时 rTie 指向的是「层间腹杆」，它不是 nTie。
     本轮就是这么假红三条的（nTie 读出 4536）。 */
  const st2 = await ev(`(function(){var L=f0HexL2(P);if(!L)return null;var s=L.stats;
    return {web:s.web,nTie:s.nTie,nBrace:s.nBrace,nSpoke:s.nSpoke,nIn2:s.nIn2,
            nTet:s.nTet,nApex:s.nApex,nInner:s.nInner,nTot2:s.nStruts2,ctrOff:s.ctrOff};})()`);
  console.log('  stats：' + JSON.stringify(st2));
  const rBr = await rowTxt('\u659c\u6491\uff08\u6297\u526a\uff09');
  const rApx = await rowTxt('\u5185\u9876\u70b9\u4e92\u8fde');
  const rTot2 = await rowTxt('\u4e8c\u5c42\u603b\u6746\u6570');
  const rCellsJ = await rowTxt('\u683c\u6570');

  const lam = numOf(rLam, /^(\d+(?:\.\d+)?)%/);
  const hOverA = numOf(rGap, /\u5916\u5c42\u8fb9\u957f=(\d+(?:\.\d+)?)/);
  const apexRatioMed = numOf(rSide, /\u4e2d\u4f4d(\d+(?:\.\d+)?)/);
  const nTet = numOf(rTet, /^(\d+)\u4e2a/);
  const hTet = numOf(rTet, /\u9ad8(\d+(?:\.\d+)?)\u2030/);
  const nEdge = numOf(rTri, /(\d+)\u6761\u8fb9/);
  const nTri = numOf(rTri, /\u00b7(\d+)\u4e2a\u4e09\u89d2\u9762/);
  const nTie = numOf(rTie, /(\d+)\u6839/);
  const nSpoke = numOf(rTie, /\uff0b\s*(\d+)\s*\u6839\u9762\u5185\u8f90\u6761/) || 0;
  const nBr = numOf(rBr, /(\d+)\u6839/);
  const nApx = numOf(rApx, /(\d+)\u6839/);
  const nTot2 = numOf(rTot2, /^(\d+)\u6839/);
  const nCells = numOf(rCellsJ, /(\d+)\u683c/);
  console.log('  λ=' + lam + '% · h/a=' + hOverA + ' · 侧棱比=' + apexRatioMed +
    ' · 四面体=' + nTet + ' 个/' + hTet + '‰ · 内层边 ' + nEdge + '/面 ' + nTri +
    ' · tie ' + nTie + '/brace ' + nBr + '/inner ' + nApx + ' · 二层总 ' + nTot2 + ' · 外层 ' + nCells);

  chk(lam > 30 && lam < 94, '读数给出 λ 且落在滑条区间内', rLam);
  /* 这条是 λ 定法的唯一裁判：λ 一改、层间距一改，h/a 立刻离 0.8165 跑掉 */
  chk(Math.abs(hOverA - 0.8165) < 0.004,
    '芯厚 ÷ 外层边长 = 0.8165（= √(2/3)，正四面体的高/底边）', 'h/a = ' + hOverA);
  /* 侧棱等长比 = 「顶点立在外心 + 沿平面法向」的直接裁判；
     立重心/朝原点时它会是 1.2 以上（本轮踩过 2.480） */
  chk(Math.abs(apexRatioMed - 1) < 0.0015,
    '三条侧棱等长比中位 = 1.0000（顶点立在外心 + 沿底座法向）', '中位 ' + apexRatioMed);
  /* 三条【对偶】恒等式：不写死数字，只要求两行相等。
     ⚠ 接法不同，恒等式也不同（2026-11-03 起）：
       web=0/2 有径向杆 ⇒ 「层间径向杆 ≡ 外层格数」；
       web=1 把径向杆整组换掉 ⇒ 那条恒等式不成立，改判「腹杆 ≡ 4×内层边数」。 */
  if (webMode === 1) {
    chk(st2 && st2.nTie === 0, 'web=1（节点斜腹杆）时径向杆为 0 根 —— 两端都不在节点上的那一组已整组换掉',
      st2 && ('nTie=' + st2.nTie));
    chk(st2 && st2.nBrace > 0 && st2.nBrace === 4 * nEdge,
      '腹杆根数 = 4 × 内层边数（' + (st2 && st2.nBrace) + ' = 4×' + nEdge +
      '；每条内层棱被两个外层三角面各接 2 端）');
    chk(st2 && nTie === st2.nBrace, '屏上「层间腹杆」那一行印的数 = stats.nBrace（' + nTie + '）');
  } else {
    chk(st2 && nCells > 200 && st2.nTie === nCells,
      '层间径向杆数 = 外层格数（' + (st2 && st2.nTie) + ' = ' + nCells + '；内层顶点是蜂窝格心的对偶 ⇒ 一一对应）');
  }
  chk(nTri > 200 && nTet === nTri,
    '全建档：四面体个数 = 内层三角面数（' + nTet + ' = ' + nTri + '；每个三角面正好当一次底座）');
  chk(nEdge > 200 && nApx === nEdge,
    '全建档：内顶点互连根数 = 内层边数（' + nApx + ' = ' + nEdge + '；内顶点网是三正则 ⇒ 边数相同）');
  chk(st2 && (st2.nTie + st2.nSpoke + st2.nIn2 + st2.nBrace + 3 * st2.nTet + st2.nInner) === st2.nTot2,
    '杆数恒等式：tie + 辐条 + 内层边 + 腹杆 + 3×四面体 + 内互连 = 二层总杆（' +
    [st2 && st2.nTie, st2 && st2.nSpoke, st2 && st2.nIn2, st2 && st2.nBrace,
     3 * (st2 && st2.nTet), st2 && st2.nInner].join('+') + ' = ' + (st2 && st2.nTot2) + '）');

  /* ---- 几何侧：五个 mesh 真存在，顶点数 = 杆数 × 48（sides=4 ⇒ 12 三角/杆 × 3 顶点） ---- */
  const gJ = await L2geo();
  console.log('  mesh：' + Object.keys(gJ).map(k => k + '=' + gJ[k].v + (gJ[k].vis ? '' : '(隐)')).join(' '));
  chk((st2 && st2.nTie) === 0 ? !gJ.hexTie : (!!gJ.hexTie && gJ.hexTie.v === st2.nTie * 48),
    'hexTie 顶点数 = ' + (st2 && st2.nTie) + ' 杆 × 48（4 棱柱 · 12 三角；web=1 时这一组根本不该存在）',
    gJ.hexTie && gJ.hexTie.v);
  chk((st2 && st2.nSpoke) === 0 ? !gJ.hexSpoke : (!!gJ.hexSpoke && gJ.hexSpoke.v === st2.nSpoke * 48),
    'hexSpoke 顶点数 = ' + (st2 && st2.nSpoke) + ' 根辐条 × 48（只有 web=2 才有这一组）', gJ.hexSpoke && gJ.hexSpoke.v);
  chk(!!gJ.hexIn2 && gJ.hexIn2.v === nEdge * 48, 'hexIn2 顶点数 = ' + nEdge + ' 杆 × 48', gJ.hexIn2 && gJ.hexIn2.v);
  chk(!!gJ.hexBrace && gJ.hexBrace.v === nBr * 48, 'hexBrace 顶点数 = ' + nBr + ' 杆 × 48', gJ.hexBrace && gJ.hexBrace.v);
  chk(!!gJ.hexApex && gJ.hexApex.v === 3 * nTet * 48, 'hexApex 顶点数 = 3×' + nTet + ' 根侧棱 × 48', gJ.hexApex && gJ.hexApex.v);
  chk(!!gJ.hexInner && gJ.hexInner.v === nApx * 48, 'hexInner 顶点数 = ' + nApx + ' 杆 × 48', gJ.hexInner && gJ.hexInner.v);
  /* 四面体朝内：底座顶点在内层壳上（半径 ≈ λR），锥尖再往里收 ⇒ 平均半径必然更小 */
  chk(gJ.hexApex && gJ.hexIn2 && gJ.hexApex.rMean < gJ.hexIn2.rMean - 0.02,
    '四面体锥尖朝蛋内（hexApex 平均半径 ' + (gJ.hexApex && gJ.hexApex.rMean) +
    ' < 底座在内层壳上的 ' + (gJ.hexIn2 && gJ.hexIn2.rMean) + '）');

  /* 屏上的「顶点合计」是公式现算的，场景里的顶点数是 THREE 真建出来的 ——
     两边必须严丝合缝。这条同时守住「读数别手写」与「几何别少建」。 */
  const rVtot = await rowTxt('\u9876\u70b9\u5408\u8ba1');
  const nVtot = numOf(rVtot, /^(\d+)/);
  const realV = Object.keys(gJ).reduce((a, k) => a + gJ[k].v, 0);
  console.log('  顶点合计：屏上 ' + nVtot + ' ／ 场景 ' + realV);
  chk(nVtot === realV, '屏上「顶点合计」= 场景里所有 mesh 顶点数之和（' + nVtot + ' = ' + realV + '）',
    nVtot + ' vs ' + realV);

  /* ================= J2. 层间杆到底接在哪（2026-11-03 老师指出的核心问题） =================
     老师在截图上看到两件事：① 第二层与第一层"好像根本没有衔接杆"；② 网格稀疏时
     "六边形中心的芯杆戳到蛋外"。根因是同一个 —— 外层钢架的节点是【三角面重心 triC】，
     六边形格心 V 上根本没有杆，而旧版径向杆正是从 V 出发的。
     这一段的判据不靠"看着像连上了"，而是逐个端点数落在哪。 */
  console.log('\n[J2] 层间杆两端落在哪个节点上');
  const endHit = await ev(`(function(){
    var n=f0HexNet(P),L=f0HexL2(P); if(!n||!L) return null;
    var i, key={}, vk={};
    function kf(p){return p[0].toFixed(8)+','+p[1].toFixed(8)+','+p[2].toFixed(8);}
    for(i=0;i<n.triC.length;i++) key[kf(n.triC[i])]=1;   /* 外层节点 = 三角面重心 */
    for(i=0;i<n.V.length;i++)    vk[kf(n.V[i])]=1;       /* 参数点 = 六边形几何中心 */
    var hit=0,far=0,onV=0,tieOnV=0,tieOff=0,maxOff=0;
    for(i=0;i<L.brace.length;i++){ if(key[kf(L.brace[i].a)]) hit++; else far++;
                                   if(vk[kf(L.brace[i].a)]) onV++; }
    for(i=0;i<L.tie.length;i++){
      if(vk[kf(L.tie[i].a)]) tieOnV++;
      var a=L.tie[i].a,V=n.V[i];
      var d=Math.sqrt((a[0]-V[0])*(a[0]-V[0])+(a[1]-V[1])*(a[1]-V[1])+(a[2]-V[2])*(a[2]-V[2]));
      if(d>maxOff)maxOff=d; if(d>1e-9) tieOff++;
    }
    return {nBrace:L.brace.length, hit:hit, far:far, onV:onV,
            nTie:L.tie.length, tieOnV:tieOnV, tieOff:tieOff,
            maxOff:+maxOff.toFixed(6), H:n.stats.H,
            ctrOff:+(L.stats.ctrOff).toFixed(6)};})()`);
  console.log('  ' + JSON.stringify(endHit));
  if (webMode === 1) {
    chk(endHit && endHit.nBrace > 0 && endHit.hit === endHit.nBrace,
      '腹杆的外层端【全部】落在 triC 节点上（' + (endHit && (endHit.hit + '/' + endHit.nBrace)) + '，一根不悬空）');
    chk(endHit && endHit.onV === 0,
      '腹杆没有一根从六边形格心 V 出发（' + (endHit && endHit.onV) + ' 根）—— 这正是"戳出来的柱子"的根源');
    chk(!gJ.hexTie, 'web=1 时场景里不该有 hexTie 这一组（不是藏起来，是根本没建）');
  } else {
    chk(endHit && endHit.nTie > 0 && endHit.tieOnV === 0,
      'web=' + webMode + ' 的径向杆不从这里格心 V 出发（落在 V 上 ' + (endHit && endHit.tieOnV) + ' 根）');
  }
  /* 格心 V 与钢架可见中心（6 个 triC 的平均）本来就差一个曲率弓高 ——
     M 越小差得越多，这条把"为什么旧版会戳出来"量化在屏上。 */
  chk(endHit && endHit.ctrOff > 0,
    '格心 V 与钢架可见中心确有偏差（曲率弓高 ' + (endHit && (endHit.ctrOff / endHit.H * 1000).toFixed(2)) +
    ' ‰蛋高；M 越小越大 ⇒ 旧版"从六边形中央戳出来"的机制）');

  /* ---- cmap：顶点色真的存在、真在渐变、低端没糊成黑 ---- */
  const gs = gJ.hexStruts;
  chk(!!gs && gs.cAttr && gs.vc, '外层杆件带顶点色 + material.vertexColors', J(gs && { cAttr: gs.cAttr, vc: gs.vc }));
  chk(!!gs && gs.cMax - gs.cMin > 0.2, '顶点色确有渐变（max−min > 0.2，不是整片单色）', gs && (gs.cMax - gs.cMin).toFixed(3));
  /* 判「低端糊成黑」不能看单通道：紫色本来就该 g≈0（本轮就写错过一次，
     拿 min 通道量出 0.001 当失败，其实那是正常的紫）。要看【每个顶点最强的那一路】：
     plasma 最暗的那一格是深紫，最强通道（蓝）仍有 1/4 亮度 ⇒ 不是黑。 */
  console.log('  最暗顶点最强通道 = ' + (gs && gs.cDarkMax && gs.cDarkMax.dark) +
    '　近黑顶点数 = ' + (gs && gs.cDarkMax && gs.cDarkMax.black));
  chk(!!gs && gs.cDarkMax.dark > 0.15,
    '渐变低端不是纯黑（最暗顶点最强通道 > 0.15 ⇒ 深紫而非黑）', gs && gs.cDarkMax.dark);
  chk(!!gs && gs.cDarkMax.black === 0,
    '没有任何顶点三通道全暗（色域下限生效）', gs && gs.cDarkMax.black);
  chk(!!gs && gs.base === 'ffffff', '带顶点色时底色必须是白 ffffff（否则 cmap 被乘暗）', gs && gs.base);

  /* ---- 四面体高度倍数：只有高变，别的都不许动（顺带守住缓存 key 带了 tetK） ---- */
  const setChoiceJ = async (txt) => { const r = await clickChoice(txt); await sleep(3200); return r; };
  await ev(`(function(){var rs=[].slice.call(document.querySelectorAll('#rows .row'));
    for(var i=0;i<rs.length;i++){var s=rs[i].querySelector('label span');
      if(s&&s.textContent.indexOf('\u56db\u9762\u4f53\u9ad8\u5ea6\u500d\u6570')>=0){
        var inp=rs[i].querySelector('input[type=range]'); inp.value='0.55';
        inp.dispatchEvent(new Event('input',{bubbles:true})); return inp.value;}}
    return 'norow';})()`);
  await sleep(2600);
  const rTet55 = await rowTxt('\u56db\u9762\u4f53\u82af');
  const hTet55 = numOf(rTet55, /\u9ad8(\d+(?:\.\d+)?)\u2030/);
  const lam55 = numOf(await rowTxt('\u7b2c\u4e8c\u5c42\u7f29\u653e'), /^(\d+(?:\.\d+)?)%/);
  console.log('  tetK=0.55 ⇒ 高 ' + hTet55 + '‰（原 ' + hTet + '‰ · 比 ' + (hTet55 / hTet).toFixed(3) + '）· λ 仍 ' + lam55 + '%');
  chk(Math.abs(hTet55 / hTet - 0.55) < 0.02, 'tetK=0.55 ⇒ 四面体高恰为原来的 0.55 倍（顶点沿法向按比例缩）', hTet55 + '/' + hTet);
  chk(Math.abs(lam55 - lam) < 0.05, 'tetK 只改「扎进去多深」，不动 λ（两个高度不是一个量）', lam55 + ' vs ' + lam);

  /* ---- 分层查看：只藏 visible，几何照建，读数一字不变 ---- */
  const rowsBefore = await allRows();
  const hitView = await setChoiceJ('\u53ea\u770b\u5916\u5c42');
  const gv1 = await L2geo();
  chk(hitView !== '' && gv1.hexStruts && gv1.hexStruts.vis === true &&
    gv1.hexApex && gv1.hexApex.vis === false,
    '「只看外层」⇒ 外层显、四面体芯隐', J({ hit: hitView, o: gv1.hexStruts && gv1.hexStruts.vis, a: gv1.hexApex && gv1.hexApex.vis }));
  chk(gv1.hexStruts && gv1.hexStruts.v === gs.v, '藏起来不等于没建（外层顶点数与「全部」档一致）', gv1.hexStruts && gv1.hexStruts.v);
  await setChoiceJ('\u53ea\u770b\u82af');
  const gv2 = await L2geo();
  chk(gv2.hexStruts && gv2.hexStruts.vis === false && gv2.hexApex && gv2.hexApex.vis === true,
    '「只看芯」⇒ 外层隐、四面体芯显', J({ o: gv2.hexStruts && gv2.hexStruts.vis, a: gv2.hexApex && gv2.hexApex.vis }));
  const rowsAfter = await allRows();
  chk(J(rowsBefore) === J(rowsAfter), '分层查看不动任何一行读数（藏的是 visible，不是少算）',
    rowsBefore.filter((x, i) => x !== rowsAfter[i]).slice(0, 3).join(' ;; '));

  /* ---- 门槛：切回单层时 P.hxView 还留着 2，外层绝不能被藏掉 ---- */
  await ev(`(function(){P.cutSkin=1;rebuild();return 1;})()`);
  await sleep(2600);
  const gSingle = await L2geo();
  chk(!!gSingle.hexStruts && gSingle.hexStruts.vis === true,
    'cutSkin=1 而 hxView 仍是「只看芯」⇒ 外层照样可见（画面不会空）',
    J(gSingle.hexStruts && gSingle.hexStruts.vis));

  /* ---- 单色钢灰：退回老路子（无顶点色、底色是钢灰） ---- */
  await ev(`(function(){P.cutSkin=4;P.hxView=0;rebuild();return 1;})()`);
  await sleep(3000);
  await setChoiceJ('\u5355\u8272\u94a2\u7070');
  const gMono = await L2geo();
  chk(!!gMono.hexStruts && gMono.hexStruts.cAttr === false && gMono.hexStruts.vc === false,
    '「单色钢灰」⇒ 不带顶点色（cmap 真的退出了，不是叠一层灰）', J(gMono.hexStruts && { c: gMono.hexStruts.cAttr, v: gMono.hexStruts.vc }));
  chk(!!gMono.hexStruts && gMono.hexStruts.base === '5b6876', '单色档底色 = 钢灰 5b6876', gMono.hexStruts && gMono.hexStruts.base);

  /* ---- 2D 剖面：内层母线（绿虚线）必须画出来 ---- */
  const gp = await ev(`(function(){var cv=document.getElementById('prof');
    if(!cv)return null;var g=cv.getContext('2d');var d=g.getImageData(0,0,cv.width,cv.height).data;
    var green=0;for(var i=0;i<d.length;i+=4){var r=d[i],gg=d[i+1],b=d[i+2];
      if(gg-r>35&&gg-b>35&&gg>85&&gg<175&&r<110)green++;}
    return green;})()`);
  chk(gp > 60, '2D 剖面画出了内层母线（绿色 #2f7d4f 像素 ' + gp + ' 个）', gp);

  /* 回到 plasma / 全部，留给下一段用 */
  await setChoiceJ('plasma');
  await setChoiceJ('\u5168\u90e8\uff08\u5916\u5c42');
  await sleep(600);

  /* ================= K. 2D 正投影（2026-11-03 新增的两个键） ================= */
  console.log('\n[K] 正视 / 俯视 2D 正投影');
  await ev(`(function(){P.cutSkin=4;P.hxWeb=1;P.hxRow=26;P.hxView=0;rebuild();buildUI();return 1;})()`);
  await sleep(3200);
  const nOuter = numOf(await rowTxt('\u6746 / \u8282\u70b9'), /^(\d+)\s*\u6839\u6746/);
  const nTot2b = numOf(await rowTxt('\u4e8c\u5c42\u603b\u6746\u6570'), /^(\d+)\u6839/);
  const segN = await ev(`(function(){return SEGS?SEGS.length/9:0;})()`);
  console.log('  2D 线段 ' + segN + ' ／ 外层杆 ' + nOuter + ' + 二层 ' + nTot2b);
  chk(segN === nOuter + nTot2b,
    '2D 线段数 = 外层杆 + 二层总杆（' + segN + ' = ' + nOuter + ' + ' + nTot2b + '；一根不多一根不少）',
    segN + ' vs ' + (nOuter + nTot2b));

  const clickView = (v) => ev(`(function(){var bs=document.querySelectorAll('#viewbtns button');
    for(var i=0;i<bs.length;i++)if(bs[i].getAttribute('data-v')===${JSON.stringify(v)}){bs[i].click();return bs[i].textContent.trim();}
    return '';})()`);
  const twoB = await clickView('xy2d');
  await sleep(700);
  const s2d = await ev(`(function(){var a=document.getElementById('cv2d'),b=document.getElementById('cv3d');
    var cv=a;var g=cv.getContext('2d');
    var d=g.getImageData(0,0,cv.width,cv.height).data;
    var nw=0,tot=cv.width*cv.height;
    for(var i=0;i<d.length;i+=4){if(d[i]<245||d[i+1]<245||d[i+2]<245)nw++;}
    return {c2:getComputedStyle(a).display, c3:getComputedStyle(b).display,
            w:cv.width, h:cv.height, ink:+(nw/Math.max(1,tot)).toFixed(4), on:VIEW2D};})()`);
  console.log('  点「' + twoB + '」⇒ ' + JSON.stringify(s2d));
  chk(s2d.on === 'xy' && s2d.c2 === 'block' && s2d.c3 === 'none',
    '点 2D 键 ⇒ 叠加层显示、3D 画布让位（VIEW2D=xy）', J(s2d));
  chk(s2d.ink > 0.01, '2D 画布真画了东西（非白像素 ' + (100 * s2d.ink).toFixed(1) + '%）', s2d.ink);

  /* K2. 2D 的文字不能被左下五个视角键压住（原来照 x=12 / H−32 落笔，正好压进去）。
     判据用【像素扫出文字真实起笔位置】对【按钮的 DOM 右边缘】——
     不读实现自己算的那个避让量，否则改回 x=12 也照样"通过"。 */
  const lay = await ev(`(function(){
    var cv=document.getElementById('cv2d'), g=cv.getContext('2d');
    var dpr=cv.width/Math.max(1,cv.clientWidth);
    var W=cv.width/dpr, H=cv.height/dpr;
    var cvr=cv.getBoundingClientRect();
    var vb=document.getElementById('viewbtns'), vbr=vb.getBoundingClientRect();
    var btnRight=vbr.right-cvr.left, btnTop=vbr.top-cvr.top;
    function leftmost(y0,y1){
      var py0=Math.max(0,Math.round(y0*dpr)), py1=Math.min(cv.height,Math.round(y1*dpr));
      var hh=Math.max(1,py1-py0);
      var d=g.getImageData(0,py0,cv.width,hh).data, w=cv.width, best=-1;
      for(var y=0;y<hh;y++){ for(var x=0;x<w;x++){ var i=(y*w+x)*4;
        if(d[i]<200&&d[i+1]<212&&d[i+2]<222){ if(best<0||x<best) best=x; } } }
      return best<0?-1:+(best/dpr).toFixed(1);
    }
    var hint=document.getElementById('hint');
    return {W:+W.toFixed(1), H:+H.toFixed(1), btnRight:+btnRight.toFixed(1), btnTop:+btnTop.toFixed(1),
            t1:leftmost(H-46,H-26), t2:leftmost(H-25,H-6),
            hint:getComputedStyle(hint).display};})()`);
  console.log('  画布 ' + lay.W + 'x' + lay.H + ' · 按钮右边缘 ' + lay.btnRight +
              ' · 读数条起笔 上' + lay.t1 + ' 下' + lay.t2);
  chk(lay.t1 > lay.btnRight && lay.t2 > lay.btnRight,
    '2D 底部两行读数的起笔在视角键右边缘之外（' + lay.t1 + ' / ' + lay.t2 + ' > ' + lay.btnRight + '）',
    J(lay));
  chk(lay.t1 > 0 && lay.t1 < lay.W && lay.t2 > 0 && lay.t2 < lay.W,
    '两行读数都被采到、且没被画布右边缘吃掉（起笔 ' + lay.t1 + ' / ' + lay.t2 + '）', J(lay));
  chk(lay.hint === 'none', '2D 模式下 3D 那个「拖动旋转…」提示条已收起', lay.hint);

  /* 俯视：回转体 ⇒ 横向与纵向应该几乎相等（这条同时验证"正交、不是透视"） */
  await clickView('xz2d');
  await sleep(700);
  const boxXZ = await ev(`(function(){var s=SEGS,i,n=s.length/9,mn=1e9,mx=-1e9,wn=1e9,wx=-1e9;
    for(i=0;i<n;i++){var o=i*9;
      var u1=s[o],u2=s[o+3],v1=s[o+2],v2=s[o+5];
      if(u1<mn)mn=u1; if(u2<mn)mn=u2; if(u1>mx)mx=u1; if(u2>mx)mx=u2;
      if(v1<wn)wn=v1; if(v2<wn)wn=v2; if(v1>wx)wx=v1; if(v2>wx)wx=v2;}
    return {w:+(mx-mn).toFixed(4), h:+(wx-wn).toFixed(4)};})()`);
  chk(boxXZ.h > 0 && Math.abs(boxXZ.w - boxXZ.h) / boxXZ.h < 0.01,
    '俯视投影的横向 = 纵向（' + boxXZ.w + ' vs ' + boxXZ.h + '，差 <1% ⇒ 回转体 + 正交投影都对）',
    J(boxXZ));

  /* 从 2D 点回 3D：画布要换回来，不能"按钮亮了、屏上还是平面图" */
  await clickView('iso');
  await sleep(800);
  const back = await ev(`(function(){var a=document.getElementById('cv2d'),b=document.getElementById('cv3d');
    return {c2:getComputedStyle(a).display, c3:getComputedStyle(b).display, on:VIEW2D,
            hint:getComputedStyle(document.getElementById('hint')).display};})()`);
  chk(back.on === null && back.c2 === 'none' && back.c3 === 'block',
    '点回「等轴 xyz」⇒ 2D 层收起、3D 画布恢复', J(back));
  chk(back.hint !== 'none', '回到 3D ⇒ 操作提示条原样还回去（display=' + back.hint + '）', J(back));

  /* ================= M. 剖面（2026-11-04 老师：3D 图要能剖开看内部） =================
     判据原则：不读"参数有没有设进去"，而读【渲染结果】——
     裁剪平面是 GPU 干的活，参数对了但 localClippingEnabled 没开、或平面挂错材质，
     屏上会一点没变；只查 F0SEC.axis 就永远是绿的。 */
  console.log('\n[M] 剖面（xy / zy / zx 三面可选 · 可滑）');
  const inkOf = () => ev(`(function(){
    try{renderer.render(scene,camera);}catch(e){return -1;}
    var gl=renderer.getContext(), cv=renderer.domElement;
    var w=cv.width,h=cv.height,buf=new Uint8Array(w*h*4);
    gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,buf);
    var n=0;for(var i=3;i<buf.length;i+=4){if(buf[i]>20)n++;}
    return +(n/(w*h)).toFixed(4);})()`);
  const setSec = (k,v) => ev(`(function(){P[${JSON.stringify(k)}]=${JSON.stringify(v)};rebuild();buildUI();return 1;})()`);

  await setSec('hxSec', 0); await sleep(2600);
  const qSec0 = await ev(`(function(){return {on:F0SEC.on,row:(function(){var rs=[].slice.call(document.querySelectorAll('#readout div'));
    for(var i=0;i<rs.length;i++){var s=rs[i].querySelector('span');
      if(s&&s.textContent.indexOf('剖面')>=0)return rs[i].querySelector('b').textContent.trim();}return '';})()};})()`);
  const inkA = await inkOf();
  chk(qSec0.on === false && qSec0.row.indexOf('不剖') >= 0, '剖面关：不挂裁剪、读数写「不剖」', J(qSec0));

  await setSec('hxSec', 1); await sleep(3000);
  const qSec1 = await ev(`(function(){var p=F0SEC.planes[0],nClip=0;
    F0SEC.obj.traverse(function(o){if(o.isMesh&&o.material&&o.material.clippingPlanes&&o.material.clippingPlanes.length)nClip++;});
    return {on:F0SEC.on,ax:F0SEC.axis,n:[+p.normal.x.toFixed(3),+p.normal.y.toFixed(3),+p.normal.z.toFixed(3)],
            c:+p.constant.toFixed(4),nClip:nClip,uuid:F0SEC.obj.uuid,
            lce:renderer.localClippingEnabled,rmax:+F0SEC.info.rmax.toFixed(4)};})()`);
  console.log('  xy 剖：' + J(qSec1));
  chk(qSec1.on === true && qSec1.ax === 1 && qSec1.n[2] === -1 && Math.abs(qSec1.c) < 1e-9,
    'xy 面：法向 −z、过中心（保留 z ≤ 0）', J(qSec1));
  chk(qSec1.nClip >= 5 && qSec1.lce === true,
    '裁剪面挂到了 ' + qSec1.nClip + ' 个材质上、且 localClippingEnabled 已开', J(qSec1));

  const inkB = await inkOf();
  chk(inkB > 0.02 && inkB < inkA * 0.85,
    '切掉一半后画面墨量明显减少（' + (100 * inkA).toFixed(1) + '% → ' + (100 * inkB).toFixed(1) +
    '%）⇒ 真的少渲染了东西，不是只改了个参数', inkB);

  /* 滑动：位置必须 = −40% × 半尺寸（半尺寸从 info 现取，不写死），且【不许重建模型】 */
  await ev(`(function(){P.hxSecOff=-40;applyParam(FAMS[curFam],{k:'hxSecOff',min:-100,max:100,step:1,dp:0},document.createElement('b'));return 1;})()`);
  await sleep(900);
  const qSec2 = await ev(`(function(){var p=F0SEC.planes[0];
    return {c:+p.constant.toFixed(5),uuid:F0SEC.obj.uuid,rmax:+F0SEC.info.rmax.toFixed(4)};})()`);
  chk(Math.abs(qSec2.c - (-0.4 * qSec2.rmax)) < 1e-4,
    '滑到 −40% ⇒ constant = −0.4 × 半径（' + qSec2.c + ' vs ' + (-0.4 * qSec2.rmax).toFixed(5) + '）', J(qSec2));
  chk(qSec2.uuid === qSec1.uuid, '滑动只改裁剪平面，没有重建模型（obj.uuid 不变）', J(qSec2));

  /* 水平剖 + 膜：膜上每个顶点都必须落在切面上，且顶点数 = 96 + 1 个圆心 */
  await setSec('hxSec', 3); await sleep(2600);
  await setSec('hxSecFace', 1); await sleep(2200);
  const qSec3 = await ev(`(function(){
    if(!F0SEC.face) return {n:0};
    var a=F0SEC.face.geometry.attributes.position, dev=0, i;
    var pl=F0SEC.planes[0];
    /* 切面 y：法向 −y 时 constant 就是 d；法向 +y 时是 −d */
    var yCut = (pl.normal.y<0) ? pl.constant : -pl.constant;
    for(i=0;i<a.count;i++){var dy=Math.abs(a.getY(i)-yCut); if(dy>dev)dev=dy;}
    return {n:a.count, dev:+dev.toFixed(9), yCut:+yCut.toFixed(4)};})()`);
  chk(qSec3.n === 97 && qSec3.dev < 1e-6,
    'zx 面剖面膜：' + qSec3.n + ' 个顶点全部落在切面 y=' + qSec3.yCut + ' 上（最大偏离 ' + qSec3.dev + '）', J(qSec3));

  /* 滑到模型外面：整颗应当被切光（这是"平面真的参与渲染"的终审）。
     🔴 方向别搞反：side=0 是「保留 ≤ d」，所以要把 d 拉到 −100% 才能切光；
        拉到 +100% 反而一根不切 —— 判据写反了会变成永远"通过"。 */
  await ev(`(function(){P.hxSecOff=-100;P.hxSecFace=0;applyParam(FAMS[curFam],{k:'hxSecOff',min:-100,max:100,step:1,dp:0},document.createElement('b'));return 1;})()`);
  await sleep(900);
  const inkC = await inkOf();
  chk(inkC < inkA * 0.05, '把平面滑到模型外 ⇒ 画面几乎全空（墨量 ' + (100 * inkC).toFixed(2) +
    '% < 未剖的 5%）', inkC);

  await setSec('hxSec', 0); await sleep(2200);
  const qSec4 = await ev(`(function(){return {on:F0SEC.on,face:!!F0SEC.face};})()`);
  chk(qSec4.on === false && qSec4.face === false, '切回「不剖」⇒ 裁剪面与剖面膜一起撤掉', J(qSec4));

  /* ================= N. 舒伯格锥面：相位差 φ（面转 · 刀不转）· 切面高度上限 10.2 ================= */
  console.log('\n[N] 舒伯格锥面：φ 只转面不转刀 · z₀ 上限 10.2 不吃取景');

  const schSet = async (phi, z0) => {
    await ev(`(function(){ P.cutSurf=3; P.cutSkin=0; P.cutMode=0; P.cutA=30; P.cutC=0.5;
      P.cutPhi=${phi}; P.cutZ0s=${z0}; P.cutShow=0; P.cutTint=0; rebuild(); buildUI(); return 1; })()`);
    await sleep(1500);
  };
  /* 读【画出来的顶点】（gridGeom 的索引 = i*(nv+1)+j，同一索引就是同一 (s,v) 参数点），
     不调 f0SchPt 复述公式 —— 那是自证。 */
  const schSurf = () => ev(`(function(){
    var out=null;
    scene.traverse(function(o){ if(out)return;
      if(o.userData&&o.userData.f0surf&&o.geometry&&o.geometry.attributes&&o.geometry.attributes.position){
        var a=o.geometry.attributes.position,n=a.count,arr=[];
        var step=Math.max(1,Math.floor(n/400));
        for(var i=0;i<n;i+=step)arr.push([a.getX(i),a.getY(i),a.getZ(i)]);
        out={n:n,pts:arr};}});
    return out; })()`);
  const schPlane = () => ev(`(function(){
    var out=null;
    scene.traverse(function(o){ if(out)return;
      if(o.userData&&o.userData.f0secplane){
        var n=new THREE.Vector3(0,0,1).applyQuaternion(o.quaternion).normalize();
        out={x:+n.x.toFixed(6),y:+n.y.toFixed(6),z:+n.z.toFixed(6),py:+o.position.y.toFixed(6)};}});
    return out; })()`);
  const schStat = () => ev(`(function(){var R=f0Solve(P);
    var np=0; for(var i=0;i<R.segs.length;i++)np+=R.segs[i].pts.length;
    return {nSeg:R.nSeg,uMax:+R.uMax.toFixed(4),L:+R.L.toFixed(4),pts:np};})()`);

  await schSet(0, 0);
  const qA = await schSurf(), qPA = await schPlane(), qR0 = await schStat();
  await schSet(90, 0);
  const qB = await schSurf(), qPB = await schPlane(), qR90 = await schStat();

  chk(!!qA && !!qB && qA.pts.length === qB.pts.length && qA.pts.length > 100,
    '抓到画出来的曲面顶点（φ=0 / φ=90 各 ' + (qA ? qA.pts.length : 0) + ' / ' +
    (qB ? qB.pts.length : 0) + ' 个采样点，网格 ' + (qA ? qA.n : 0) + ' 顶点）');

  /* ① 刚性绕 z 旋转：半径不变、高度不变、极角整体 +90° */
  let drMax = 0, dyMax = 0, dpMax = -1e9, dpMin = 1e9, nChk = 0;
  for (let qi = 0; qA && qB && qi < qA.pts.length; qi++) {
    const a0 = qA.pts[qi], b0 = qB.pts[qi];
    const r0 = Math.hypot(a0[0], a0[2]), r1 = Math.hypot(b0[0], b0[2]);
    drMax = Math.max(drMax, Math.abs(r1 - r0));
    dyMax = Math.max(dyMax, Math.abs(b0[1] - a0[1]));
    if (r0 < 0.02) continue;                       /* 贴轴点：极角不稳定，不参与极角判据 */
    let d = (Math.atan2(b0[2], b0[0]) - Math.atan2(a0[2], a0[0])) * 180 / Math.PI;
    while (d > 180) d -= 360; while (d < -180) d += 360;
    dpMax = Math.max(dpMax, d); dpMin = Math.min(dpMin, d); nChk++;
  }
  chk(drMax < 1e-5 && dyMax < 1e-6 && dpMin > 89.5 && dpMax < 90.5 && nChk > 200,
    'φ=90° ⇒ 整张面【刚性绕 z 转 90°】：半径变化 ' + drMax.toExponential(2) +
    '、高度变化 ' + dyMax.toExponential(2) + '、极角差 ' + dpMin.toFixed(4) + '°…' +
    dpMax.toFixed(4) + '°（' + nChk + ' 点）', J({ drMax, dyMax, dpMin, dpMax, nChk }));

  /* ② 切平面一动不动 —— 老师那条「斜切面不围绕 z 轴旋转」的判据 */
  chk(!!qPA && !!qPB && qPA.x === qPB.x && qPA.y === qPB.y && qPA.z === qPB.z && qPA.py === qPB.py,
    '同一时刻切平面【一动不动】：法向 (' + (qPA ? qPA.x + ', ' + qPA.y + ', ' + qPA.z : '—') +
    ')、切面 y=' + (qPA ? qPA.py : '—') + '，与 φ=0 逐位相同', J([qPA, qPB]));

  /* ③ 面转刀不转 ⇒ 截线必然换形状 */
  chk(qR0.pts !== qR90.pts || qR0.uMax !== qR90.uMax,
    '面转了而刀没转 ⇒ 截线换一副（φ=0：' + qR0.nSeg + ' 支 / 跨度 ' + qR0.L +
    '；φ=90：' + qR90.nSeg + ' 支 / 跨度 ' + qR90.L + '）', J([qR0, qR90]));

  /* ④ 滑条上限 = 10.2（读参数定义，不是复述某个常量） */
  const qMax = await ev(`(function(){var f=FAMS[0];for(var i=0;i<f.params.length;i++){
    var p=f.params[i]; if(p.k==='cutZ0s')return {min:p.min,max:p.max,step:p.step};} return null;})()`);
  chk(!!qMax && Math.abs(qMax.max - 10.2) < 1e-9 && Math.abs(qMax.min + 1.2) < 1e-9,
    '切面高度滑条范围 = [' + (qMax ? qMax.min : '?') + ', ' + (qMax ? qMax.max : '?') +
    ']（上限正是 10.2）', J(qMax));

  /* ⑤ 切平面不许参与取景：z₀ 从 0 滑到 10.2，取景半径与相机距离必须不动。
     ⚠ 允许 2% 的相对差：包围盒中心随【交线有无】略微移动（模型整体平移量变了），
        `_rad` 是平移后量的 —— 这是真几何差异。切平面若参与，会从 ~2.18 跳到 ~11（5 倍），
        差三个数量级，2% 这条线分得开。 */
  await schSet(0, 0);
  const qFit0 = await ev(`(function(){return {rad:+_rad.toFixed(6),camD:+camD.toFixed(6)};})()`);
  await schSet(0, 10.2);
  const qFit1 = await ev(`(function(){return {rad:+_rad.toFixed(6),camD:+camD.toFixed(6),
    nSeg:f0Solve(P).nSeg};})()`);
  const relR = Math.abs(qFit1.rad / qFit0.rad - 1), relC = Math.abs(qFit1.camD / qFit0.camD - 1);
  chk(relR < 0.02 && relC < 0.02,
    'z₀：0 → 10.2 ⇒ 取景不塌（半径 ' + qFit0.rad + ' → ' + qFit1.rad + '，差 ' +
    (100 * relR).toFixed(2) + '%；切平面若参与会跳到 ~11 ＝ 5 倍）', J([qFit0, qFit1]));
  chk(qFit1.nSeg === 0, 'z₀=10.2 已滑出面全高 ⇒ 交线 0 支（不是崩了，是面只到 ±1.2）', qFit1.nSeg);

  /* ⑥ 屏上真的印了这两句（读数行名随实现变，判据必须读屏上的字） */
  const qTxt = await ev(`(function(){var rows=f0Read(P),o=[];
    for(var i=0;i<rows.length;i++)o.push(String(rows[i][0]));return o.join('|');})()`);
  chk(qTxt.indexOf('相位差 φ') >= 0 && qTxt.indexOf('切面已在面外') >= 0,
    '读数面板同时印出「相位差 φ」与「⚠ 切面已在面外」', qTxt.slice(0, 200));

  await schSet(0, 0);   /* 复原，别给后面的段留状态 */

  /* ================== P. 第一节「六族 × 最后一代 × 有没有 md」整节可收起 ==================
     判据只认 DOM 量出来的高度与屏上的字：收起 ⇒ 正文 0 px、表也量不到；标题条与那行摘要必须还在
     （否则"收起"变成"删掉"，读者不知道这里原本有什么）。 */
  console.log('\n[P] 第一节可收起（默认收起 · 标题条常显 · 一行文字说明）');
  const foldState = () => ev(`(function(){
    var b=document.getElementById('scanBox'); if(!b) return {no:true};
    var bd=b.querySelector('.nbox-bd'), btn=document.getElementById('scanBtn'),
        h2=b.querySelector('h2'), sum=document.getElementById('scanSum'),
        tb=b.querySelector('table');
    if(!bd||!btn||!h2||!sum) return {no:true, why:'缺元素'};
    var r=tb?tb.getBoundingClientRect():null;
    return {min:b.classList.contains('min'), btn:btn.textContent.trim(),
      bdH:Math.round(bd.getBoundingClientRect().height),
      tblH:r?Math.round(r.height):-1,
      h2:h2.textContent.trim(),
      sum:(sum.textContent||'').replace(/\\s+/g,' ').trim(),
      ls:(function(){try{return localStorage.getItem('pks.scan.min');}catch(e){return 'ERR';}})()};})()`);

  const p0 = await foldState();
  chk(!p0.no, '第一节的折叠容器在页上（#scanBox / 标题 / 摘要 / 按钮齐全）', J(p0));
  chk(p0.min === true && p0.bdH === 0,
    '首次进页面 ⇒ 这一节默认收起（正文高度 ' + p0.bdH + ' px）', J([p0.min, p0.bdH]));
  chk(p0.tblH <= 0, '收起时里面那张表量不到高度（是藏起来，不是变矮）', p0.tblH);
  chk(p0.h2.indexOf('一 · 先扫一遍') === 0, '标题条常显，文字完整：' + p0.h2, p0.h2);
  chk(p0.sum.indexOf('35 个 py') > 0 && p0.sum.indexOf('421 条') > 0,
    '收起时有一行文字说明：' + p0.sum, p0.sum);

  /* 摘要里的数与正文里的数必须同源 —— 正文改数忘了改摘要，这条会红 */
  const pAll = await ev(`(function(){var b=document.getElementById('scanBox');
    return (b.textContent||'').replace(/\\s+/g,'');})()`);
  chk(pAll.indexOf('35个py') >= 0 && pAll.indexOf('421条') >= 0 && pAll.indexOf('45个py') >= 0,
    '35 个 py / 45 个 py / 421 条 在整节文字里都能找到（摘要与正文对得上）', pAll.length + ' 字');

  /* 点按钮 ⇒ 展开 */
  await ev(`(function(){document.getElementById('scanBtn').click();return 1;})()`);
  await new Promise(r => setTimeout(r, 500));
  const p1 = await foldState();
  chk(p1.min === false && p1.bdH > 600 && p1.tblH > 100,
    '点「展开 ▾」⇒ 正文与表格真的铺开（正文 ' + p1.bdH + ' px / 表 ' + p1.tblH + ' px）', J(p1));
  chk(p1.btn === '收起 ▴' && p1.ls === '0', '按钮改「收起 ▴」、状态记进 localStorage', p1.btn + ' / ' + p1.ls);

  /* 点标题条（不是按钮）也要能收起，且要记住 */
  await ev(`(function(){document.getElementById('scanHd').click();return 1;})()`);
  await new Promise(r => setTimeout(r, 500));
  const p2 = await foldState();
  chk(p2.min === true && p2.bdH === 0 && p2.ls === '1',
    '点整条标题也能收起，且 localStorage 记 ' + p2.ls, J([p2.min, p2.bdH, p2.ls]));

  /* 别把「族说明」那一栏带歪：它默认仍是展开的 */
  const pFam = await ev(`(function(){var b=document.getElementById('famNoteBox');
    return {min:b.classList.contains('min'),
            btn:document.getElementById('famNoteBtn').textContent.trim()};})()`);
  chk(pFam.min === false && pFam.btn === '收起 ▴',
    '「族说明」那一栏默认仍展开（两栏用同一套折叠，默认值各自独立）', J(pFam));

  /* 窄屏：标题与那行文字说明都不许被省略号吃掉（900px 时两者都会两头截断） */
  await send('Emulation.setDeviceMetricsOverride', { width: 900, height: 900, deviceScaleFactor: 1, mobile: false });
  await new Promise(r => setTimeout(r, 700));
  const pN = await ev(`(function(){
    var hd=document.getElementById('scanHd'), h2=hd.querySelector('h2'),
        sum=document.getElementById('scanSum'), btn=document.getElementById('scanBtn');
    var cut=(e)=>e.scrollWidth>e.clientWidth+1;
    return {h2Cut:cut(h2), sumCut:cut(sum),
      btnOut:Math.round(btn.getBoundingClientRect().right-hd.getBoundingClientRect().right),
      hdH:Math.round(hd.getBoundingClientRect().height)};})()`);
  chk(!pN.h2Cut && !pN.sumCut,
    '900px 宽：标题与文字说明都完整显示（不被省略号截断）', J(pN));
  chk(pN.btnOut <= 0, '900px 宽：按钮没有溢出标题条右边缘（' + pN.btnOut + ' px）', pN.btnOut);
  await send('Emulation.clearDeviceMetricsOverride');
  await new Promise(r => setTimeout(r, 400));

  /* ================= Q. 内芯降档（省料）+ 剖面浮窗（可收起）+ 播放 + GIF =================
     2026-11-04 老师三条要求：
     ① 「内部支撑连接杆太密，多加几个降档，结构稳固同时尽量少耗材（要 3D 打印）」；
     ② 「自动从 −100 播到 +100，再一键导出当前视图动画为 <5MB 的尽量高清 GIF」；
     ③ 「剖面加到别的族，做成左侧独立浮窗；参数面板都要浮窗可收起」。
     判据原则：省料看【杆总长】不看锥数多少；浮窗看【矩形是否相交】不看样式；
     GIF 看【文件字节 / 分辨率 / 帧数】不看按钮有没有被点过。 */
  console.log('\n[Q] 内芯四档（省料）· 剖面浮窗（默认收起、不挡视角键）· 播放 · 跨族 · GIF');

  await clickPreset('\u53cc\u5c42 + \u56db\u9762\u4f53\u82af');
  await sleep(3800);

  /* ---- Q1 四个档位与默认档 ---- */
  const coreOpts = await ev(`(function(){
    var ws=[].slice.call(document.querySelectorAll('#rows > div'));
    for(var i=0;i<ws.length;i++){
      var lab=ws[i].firstElementChild;
      if(!lab||(lab.textContent||'').indexOf('\u5185\u82af\u5bc6\u5ea6')<0)continue;
      var bs=[].slice.call(ws[i].querySelectorAll('.choices button'));
      return {n:bs.length,
        txt:bs.map(function(b){return (b.textContent||'').replace(/\s+/g,' ').slice(0,10);}),
        on:bs.map(function(b){return b.className==='on';})};}
    return null;})()`);
  console.log('  档位：' + J(coreOpts));
  chk(coreOpts && coreOpts.n === 4, '内芯密度有 4 个可选档（不建 / 稀疏 / 中 / 全建）', J(coreOpts));
  /* 这里【不判默认档】：默认值已在 [A] 段刚进页面时判过；此处 P.hxCore 可能被 [J] 改成过全建。
     这里判的是"按钮的选中态跟着 P 走"——选错了档，屏上就会指错行。 */
  chk(coreOpts && coreOpts.on.filter(Boolean).length === 1 &&
      coreOpts.on[await ev('P.hxCore|0')] === true,
    '四档里恰好一个亮着，且亮的那个就是 P.hxCore（按钮状态与参数同源）',
    J([coreOpts && coreOpts.on, await ev('P.hxCore|0')]));

  /* ---- Q2 四档实测：锥数 / 杆总长 / 内芯占比 ---- */
  const tiers = [];
  for (const c of [0, 1, 2, 3]) {
    await ev(`(function(){P.hxCore=${c};rebuild();buildUI();return 1;})()`);
    await sleep(2600);
    const s = await ev(`(function(){var L=f0HexL2(P);if(!L)return null;var s=L.stats;
      return {nTet:s.nTet,step:s.coreStep,
        share:Math.round(s.coreShare*1e4)/100,
        lenAll:Math.round(s.lenAll*1000)/1000,
        lenCore:Math.round(s.lenCore*1000)/1000};})()`);
    const rC = await rowTxt('\u5185\u82af\u5bc6\u5ea6');
    const rTet = await rowTxt('\u56db\u9762\u4f53\u82af');
    tiers.push({ c: c, nTet: s.nTet, step: s.step, share: s.share, lenAll: s.lenAll, lenCore: s.lenCore, rC: rC, rTet: rTet });
    console.log('  core=' + c + '  ' + J([s.nTet, s.step, s.share + '%', s.lenAll]) + '  屏：' + String(rC).slice(0, 30));
  }
  chk(tiers[0].nTet === 0 && tiers[0].step === 0 && tiers[0].share === 0 && tiers[0].lenCore === 0,
    '「不建内芯」档：锥 0 个、内芯杆长 0、占比 0.0%（只减芯，外壳与腹杆一根不动）', J(tiers[0]).slice(0, 90));
  chk(String(tiers[0].rTet).indexOf('\u672c\u6863\u4e00\u4e2a\u90fd\u4e0d\u5efa') >= 0,
    '「不建内芯」档在屏幕上明写「本档一个都不建」，不是印个 0 冒充算出来了', String(tiers[0].rTet).slice(0, 40));

  const nTot = tiers[3].nTet;
  chk(tiers[3].step === 1 && tiers[1].nTet === Math.ceil(nTot / 4) && tiers[2].nTet === Math.ceil(nTot / 2),
    '锥数 = ceil(全建锥数 / 步长)：' + tiers.map(t => t.nTet).join(' / ') + '（全建 ' + nTot + ' 个，步长 4 / 2 / 1）',
    J(tiers.map(t => [t.nTet, t.step])));
  chk(tiers[0].lenAll < tiers[1].lenAll && tiers[1].lenAll < tiers[2].lenAll && tiers[2].lenAll < tiers[3].lenAll,
    '耗材（杆总长）随档位单调增：' + tiers.map(t => t.lenAll).join(' < '), J(tiers.map(t => t.lenAll)));
  chk(tiers[0].share < tiers[1].share && tiers[1].share < tiers[2].share && tiers[2].share < tiers[3].share,
    '内芯耗材占比单调增：' + tiers.map(t => t.share + '%').join(' < ') +
    '（这才是"省了多少料"的可核对口径，只看锥数不算账）', J(tiers.map(t => t.share)));
  chk(new Set(tiers.map(t => t.rC)).size === 4,
    '屏上「内芯密度」那一行四档各不相同（读数真的跟着档走，不是写死一句）',
    J(tiers.map(t => String(t.rC).slice(0, 12))));

  /* ---- Q3 确定性：同一组参数两次抽稀必须逐位相同（3D 打印要能出同一份 STL）---- */
  await ev(`(function(){P.hxCore=1;rebuild();buildUI();return 1;})()`); await sleep(2600);
  const det1 = await ev(`(function(){return +f0HexL2(P).stats.lenAll.toFixed(9);})()`);
  await ev(`(function(){P.hxCore=2;rebuild();buildUI();return 1;})()`); await sleep(2200);
  await ev(`(function(){P.hxCore=1;rebuild();buildUI();return 1;})()`); await sleep(2600);
  const det2 = await ev(`(function(){return +f0HexL2(P).stats.lenAll.toFixed(9);})()`);
  chk(det1 === det2, '同一组参数抽稀两次，杆总长逐位相同（' + det1 + '）⇒ 确定性，不是随机采样', J([det1, det2]));

  /* ---- Q4 浮窗：独立、默认收起、不与视角键抢位置、收起态仍报状态 ---- */
  const spBox = await ev(`(function(){var b=document.getElementById('secPanel'),v=document.getElementById('viewbtns');
    if(!b)return null;
    var rb=b.getBoundingClientRect(),rv=v?v.getBoundingClientRect():null,ov=null;
    if(rv){var w=Math.min(rb.right,rv.right)-Math.max(rb.left,rv.left),
                 h=Math.min(rb.bottom,rv.bottom)-Math.max(rb.top,rv.top);
      if(w>0&&h>0)ov={w:Math.round(w),h:Math.round(h)};}
    var ls=null;try{ls=window.localStorage.getItem('pks.sec.min');}catch(e){}
    return {min:b.classList.contains('min'),w:Math.round(rb.width),h:Math.round(rb.height),
      sum:(document.getElementById('spSum')||{}).textContent,ls:ls,ov:ov,
      pos:getComputedStyle(b).position};})()`);
  console.log('  浮窗：' + J(spBox));
  chk(spBox && spBox.pos === 'fixed', '剖面是独立浮窗（position:fixed），不是塞在右栏参数里', spBox && spBox.pos);
  chk(spBox && spBox.min === true && spBox.h < 90,
    '浮窗默认收起（高 ' + (spBox && spBox.h) + ' px，只留一条标题）', spBox && spBox.h);
  chk(spBox && spBox.ov === null,
    '收起态与画布左下五个视角键【矩形不相交】（展开态 376 px 会正好压住它们，所以默认必须收起）',
    J(spBox && spBox.ov));
  chk(spBox && String(spBox.sum).trim().length > 0,
    '收起态标题上仍报状态「' + (spBox && String(spBox.sum).trim()) + '」—— 收起不是藏起来', spBox && spBox.sum);

  await ev(`(function(){document.getElementById('spBtn').click();return 1;})()`);
  await sleep(700);
  const spOpen = await ev(`(function(){var b=document.getElementById('secPanel'),r=b.getBoundingClientRect();
    var ls=null;try{ls=window.localStorage.getItem('pks.sec.min');}catch(e){}
    return {min:b.classList.contains('min'),w:Math.round(r.width),h:Math.round(r.height),ls:ls};})()`);
  chk(spOpen.min === false && spOpen.h > 200,
    '点一下展开（' + spOpen.w + '×' + spOpen.h + '）', J(spOpen));
  chk(spOpen.ls === '0', '展开状态记进 localStorage（下次进来还展开，不是每次都复位）', spOpen.ls);

  /* ---- Q5 播放：−100 → +100 自动走一遍，中途能停 ---- */
  await ev(`(function(){var bs=[].slice.call(document.querySelectorAll('#spAxis button'));
    for(var i=0;i<bs.length;i++){if((bs[i].getAttribute('data-v')|0)===2){bs[i].click();return 1;}}return 0;})()`);
  await sleep(2800);
  await ev(`(function(){document.getElementById('spPlay').click();return 1;})()`);
  await sleep(1500);
  const mid = await ev(`(function(){return {off:P.hxSecOff|0,
    btn:document.getElementById('spPlay').textContent.trim(),
    txt:document.getElementById('spSt').textContent.slice(0,36)};})()`);
  chk(mid.off > -100 && mid.off < 100, '播放 1.5 秒后剖面位置已离开起点（' + mid.off + '%）⇒ 真在动', J(mid));
  chk(mid.btn.indexOf('\u505c\u6b62') >= 0, '播放中按钮变「■ 停止」（可以中途打断）', mid.btn);
  await sleep(5400);
  const end = await ev(`(function(){var pl=F0SEC.planes[0];
    return {off:P.hxSecOff|0,btn:document.getElementById('spPlay').textContent.trim(),
      c:+(pl?pl.constant.toFixed(4):NaN)};})()`);
  chk(end.off === 100, '播放结束停在 +100（最大值）', J(end));
  chk(end.btn.indexOf('\u64ad\u653e') >= 0, '播放结束按钮复位成「▶ 播放」', end.btn);
  const inkEnd = await inkOf();
  await ev(`(function(){P.hxSec=0;rebuild();buildUI();return 1;})()`); await sleep(2600);
  const inkNone = await inkOf();
  chk(inkEnd > inkNone * 0.9,
    '播到 +100 时整颗都在（墨量 ' + (100 * inkEnd).toFixed(1) + '% vs 不剖 ' + (100 * inkNone).toFixed(1) + '%）',
    J([inkEnd, inkNone]));

  /* ---- Q6 跨族：剖面从「⓪ 专属」推广到其它族 ---- */
  const cross = [];
  for (const t of [['\u2460 \u53cc\u6ce2\u7eb9\u76d8', '① 双波纹盘'],
                   ['\u2469 \u6f0f\u6597\u87ba\u65cb\u7ba1', '⑩ 漏斗螺旋管'],
                   ['\u246A \u82b1\u5f62\u66f2\u9762', '⑪ 花形曲面']]) {
    await clickTab(t[0]);
    await sleep(3000);
    const ink0 = await inkOf();
    await ev(`(function(){P.hxSec=2;P.hxSecOff=0;rebuild();buildUI();return 1;})()`);
    await sleep(3000);
    const ink1 = await inkOf();
    const cs = await ev(`(function(){return {gen:!!(F0SEC.info&&F0SEC.info.generic),
      face:!!F0SEC.face,
      st:document.getElementById('spSt').textContent.slice(0,64),
      sum:document.getElementById('spSum').textContent.trim()};})()`);
    cross.push({ name: t[1], ink0: ink0, ink1: ink1, ratio: +(ink0 / Math.max(1e-6, ink1)).toFixed(2),
      gen: cs.gen, face: cs.face, st: cs.st, sum: cs.sum });
    console.log('  ' + t[1] + '：未剖 ' + ink0 + ' → 切开 ' + ink1 + '（比 ' + cross[cross.length - 1].ratio + '）');
  }
  chk(cross.every(x => x.ratio > 1.10),
    '三个新族都真的被切开了（未剖/切开 墨量比 ' + cross.map(x => x.ratio).join(' / ') + '，都 > 1.10）',
    J(cross.map(x => [x.name, x.ratio])));
  chk(cross.every(x => x.gen === true && x.st.indexOf('\u4e0d\u753b\u819c') >= 0),
    '这三族没有单一子午线 ⇒ 屏上明写「只切、不画膜」，不拿近似圆冒充截面',
    J(cross.map(x => String(x.st).slice(0, 30))));
  chk(cross.every(x => x.face === false), '这三族不会画出假膜（F0SEC.face 为空）', J(cross.map(x => x.face)));

  /* ---- Q7 一键导出 GIF：head / 分辨率 / 帧数 / 体积 / 起点不空白 五条一起判 ---- */
  await clickTab('\u24EA \u53cc\u9525');
  await sleep(3200);
  await clickPreset('\u53cc\u5c42 + \u56db\u9762\u4f53\u82af');
  await sleep(3800);
  await ev(`(function(){P.hxCore=1;P.hxSec=2;P.hxSecOff=-80;rebuild();buildUI();
    if(F0SEC.on)syncF0Section();return 1;})()`);
  await sleep(2600);
  /* 起点那一帧必须真有东西。⚠ 别指望"墨量很多"：side=0 是「保留 ≤ d」，
     −80% 只剩 10% 那么薄的一片，墨量本来就只有 1~2%。
     所以判据要用【相对】的：拿真正切光的 −100% 当零点，起点必须明显高于它。 */
  await ev(`(function(){P.hxSecOff=-100;syncF0Section();return 1;})()`);
  await sleep(600);
  const inkBlank = await inkOf();
  await ev(`(function(){P.hxSecOff=-80;syncF0Section();return 1;})()`);
  await sleep(600);
  const inkStart = await inkOf();
  chk(inkStart > Math.max(0.004, inkBlank * 4),
    '录制起点（−80%）【预览画面】里有东西：墨量 ' + (100 * inkStart).toFixed(2) + '% vs 切光的 −100% 只有 ' +
    (100 * inkBlank).toFixed(2) + '%', J([inkStart, inkBlank]));

  const DL = path.join(os.tmpdir(), 'f0hex-gif-' + Date.now());
  fs.mkdirSync(DL, { recursive: true });
  await send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: DL });
  const cvDim = await ev('({w:renderer.domElement.width,h:renderer.domElement.height})');
  /* 状态行从「录第 1 档：680×668 · 44 帧（裁到模型范围 497×607）」跳到「编码中」只要几百毫秒，
     500 ms 轮询会整段错过（第一版就没抓到）。用 MutationObserver 把所有台词记下来再回头找。 */
  await ev(`(function(){window.__stLog=[];var e=document.getElementById('spSt');
    new MutationObserver(function(){window.__stLog.push(e.textContent);})
      .observe(e,{childList:true,subtree:true,characterData:true});return 1;})()`);
  await ev(`(function(){document.getElementById('spGif').click();return 1;})()`);
  let gifF = null, rcTxt = null;
  for (let i = 0; i < 240; i++) {
    await sleep(400);
    const fs2 = fs.readdirSync(DL).filter(f => /\.[Gg][Ii][Ff]$/.test(f));
    if (fs2.length && fs.statSync(path.join(DL, fs2[0])).size > 10000) { gifF = fs2[0]; break; }
  }
  const stLog = await ev('(window.__stLog||[]).join(" ;; ")');
  const mRc = String(stLog).match(/\u6a21\u578b\u8303\u56f4\s*(\d+)\u00d7(\d+)/);
  if (mRc) rcTxt = { w: +mRc[1], h: +mRc[2] };
  console.log('  状态行流水：' + String(stLog).slice(0, 200));
  const stGif = await ev(`(function(){return document.getElementById('spSt').textContent.trim();})()`);
  console.log('  导出台词：' + stGif);
  chk(!!gifF, '点了「⤓ 导出 GIF」后真的落下一个 .gif 文件', fs.readdirSync(DL));
  if (gifF) {
    const bf = fs.readFileSync(path.join(DL, gifF));
    const head = bf.slice(0, 6).toString('latin1');
    const W = bf.readUInt16LE(6), H = bf.readUInt16LE(8);
    let frames = 0;
    for (let i = 0; i < bf.length - 3; i++) if (bf[i] === 0x21 && bf[i + 1] === 0xF9 && bf[i + 2] === 0x04) frames++;
    const delayCs = frames ? bf.readUInt16LE((function () {
      for (let i = 0; i < bf.length - 3; i++) if (bf[i] === 0x21 && bf[i + 1] === 0xF9) return i + 4;
      return 0; })()) : 0;
    console.log('  GIF：' + gifF + '  ' + bf.length + ' B  ' + W + '×' + H + '  ' + frames + ' 帧  head=' + head);
    chk(head === 'GIF89a', '文件头是 GIF89a', head);
    chk(W === 680, '第一档就够小 ⇒ 用了最高清的一档（宽 680，没有触发降档）', W);
    /* 裁没裁过，看【宽高比】：整画布是 741×518（横的），按模型矩形裁完必然换一个比例。
       这条同时把 modelRect() 的算法钉住：它一旦退回 Box3().setFromObject(root)，
       切平面那块 size×size 的大板会把矩形撑回画布比例，这里立刻红。 */
    const cvAsp = cvDim.w / cvDim.h, gifAsp = W / H;
    /* 判据不能写「GIF 比例 ≠ 画布比例」——那是相对量：画布改高之后（741×636）
       两者只差 0.147，一刀切 0.15 就假红。改成对着【模型矩形】判：
       按模型裁 ⇒ GIF 宽高比必须等于模型矩形的宽高比（本来就该相等，与画布无关）。 */
    const modelAsp = rcTxt ? rcTxt.w / rcTxt.h : null;
    chk(modelAsp && Math.abs(gifAsp - modelAsp) < 0.03,
      'GIF 宽高比 ' + gifAsp.toFixed(3) + ' = 模型矩形 ' + (modelAsp ? modelAsp.toFixed(3) : '?') +
      '（画布是 ' + cvAsp.toFixed(3) + '）⇒ 真的按模型矩形裁过，不是整幅录下来',
      J([gifAsp, modelAsp, cvAsp]));
    chk(rcTxt && Math.abs(H - rcTxt.h * W / rcTxt.w) <= 2,
      '高 = 裁切高 × (680 / 裁切宽)：' + (rcTxt ? rcTxt.w + '×' + rcTxt.h : '?') +
      ' → ' + (rcTxt ? (rcTxt.h * 680 / rcTxt.w).toFixed(1) : '?') + '，实际 ' + H +
      '；分辨率按目标宽 680 定（不是 min(680, 裁宽)，那会白丢一档）', J([rcTxt, H]));
    chk(frames >= 30, '帧数 ' + frames + '（够看，不是两张糊过去）', frames);
    chk(bf.length < 5 * 1048576, '体积 ' + (bf.length / 1048576).toFixed(2) +
      ' MB < 5 MB（超了会自动降档，这里连降档都没用上）', bf.length);
    chk(delayCs > 0 && frames * delayCs >= 300 && frames * delayCs <= 500,
      '播放时长对得上：' + frames + ' 帧 × ' + delayCs + ' cs ≈ ' + (frames * delayCs / 100).toFixed(1) +
      ' 秒（与屏幕上的 4.2 秒一遍一致）', frames * delayCs);
    /* 🔴 这一条才是「第一帧不能是白板」的真判据：把 GIF 的第一帧 LZW 解开、数像素。
       上一版靠"手动把 off 设到 −80 再看画面"来判，那是【预览】不是【录制】——
       把 grabFrames 里的 K0 从 0.10 改回 0，那条判据纹丝不动（变异测试实测：186 全绿，全是假绿）。
       只有解码文件才能钉住它。 */
    const fr1 = decodeFirstFrame(bf);
    console.log('  第一帧解码：' + J({ nw: fr1.nonWhiteRatio, col: fr1.coloredRatio, px: fr1.px, colors: fr1.nColors }));
    chk(fr1.px === W * H && fr1.nonWhiteRatio > 0.008 && fr1.coloredRatio > 0.005,
      'GIF 第一帧解开后不是白板：非白 ' + (100 * fr1.nonWhiteRatio).toFixed(2) + '% · 有色 ' +
      (100 * fr1.coloredRatio).toFixed(2) + '%（K0 若改回 0，这一条立刻归零）',
      J([fr1.nonWhiteRatio, fr1.coloredRatio]));
    /* 🔴 这条是 2026-11-04 抓到的真 bug：导出过程中每录一帧都 syncF0Section() → sync()，
       而 sync() 会写同一个 #spSt ⇒「录第 1 档…」「完成：680×668 · 44 帧 · 2.92 MB」被下一帧的
       「位置 −76%」整段盖掉。文件确实生成了，但屏上永远看不到成品体积。
       判据必须读【状态行流水】，不能只判"文件存在"。 */
    chk(/录第\s*1\s*档/.test(String(stLog)),
      '导出过程中的「录第 1 档…采集中」在屏上出现得住（没有被每帧的控件同步盖掉）',
      String(stLog).slice(0, 80));
    const mDone = String(stLog).match(/\u5b8c\u6210\uff1a(\d+)\u00d7(\d+)[^;]*?([\d.]+)\s*MB/);
    chk(!!mDone && Math.abs(+mDone[3] - bf.length / 1048576) < 0.02,
      '屏上「完成：… MB」留得住，且印的体积与文件真实字节一致（屏 ' +
      (mDone ? mDone[3] : '?') + ' MB vs 文件 ' + (bf.length / 1048576).toFixed(2) + ' MB）',
      String(stLog).slice(-90));
  }
  /* ---- Q8 状态行归属：导出结论要留得住，但动参数必须让位（两道门一起判）---- */
  await sleep(700);
  const msgDone = await ev(`document.getElementById('spSt').textContent`);
  await ev(`(function(){syncF0Section();return 1;})()`);   /* 模拟"界面继续刷新一次" */
  await sleep(300);
  const msgAfterSync = await ev(`document.getElementById('spSt').textContent`);
  chk(/\u5b8c\u6210/.test(msgDone) && /\u5b8c\u6210/.test(msgAfterSync),
    '成品结论「' + String(msgDone).slice(0, 26) + '」留得住：再刷一次界面也不会被「位置 −76%」盖掉',
    J([msgDone.slice(0, 30), msgAfterSync.slice(0, 30)]));
  await ev(`(function(){var r=document.getElementById('spOff');r.value=-30;
    r.dispatchEvent(new Event('input',{bubbles:true}));return 1;})()`);
  await sleep(500);
  const msgAfterMove = await ev(`document.getElementById('spSt').textContent`);
  chk(!/\u5b8c\u6210/.test(msgAfterMove) && /-30%/.test(msgAfterMove),
    '一动滑条，状态行就回到实时状态（' + String(msgAfterMove).slice(0, 30) + '）—— 不是把状态行永久锁死',
    msgAfterMove);

  /* ================= R. 锥面定义域（面紧凑 / 线完整）+ M 上限 48（2026-11-04 老师） ================= */
  console.log('\n[R] 锥面「高度被限制 / 曲线被拦腰截断」+ M 上限 48');
  await ev(`(function(){var bs=document.querySelectorAll('#tabs button');
    for(var i=0;i<bs.length;i++){if((bs[i].textContent||'').indexOf('\\u53cc\\u9525')>=0){bs[i].click();return 1;}}
    return 0;})()`);
  await sleep(1600);

  /* ---- R1 M 滑杆上限 = 48 ---- */
  const mUI = await ev(`(function(){
    var ws=[].slice.call(document.querySelectorAll('#rows > div')), out=null;
    for(var i=0;i<ws.length;i++){var l=ws[i].firstElementChild;
      if(l&&(l.textContent||'').indexOf('\\u6BCD\\u7EBF\\u5206\\u884C\\u6570')>=0){
        var r=ws[i].querySelector('input[type=range]');
        out=r?{min:+r.min,max:+r.max,val:+r.value}:null;}}
    return out;})()`);
  chk(mUI && mUI.max === 48 && mUI.min === 8,
    '母线分行数 M 的滑杆夹在 8~48（老师要求：上限 48，再高页面会卡死）', J(mUI));
  chk(mUI && mUI.val === 26, '默认仍是 26（黄金蛋的档，没被上限改动波及）', mUI && mUI.val);

  /* ---- R2 内核 clamp 同源：P.hxRow=60 必须被夹到 48 ---- */
  const mClamp = await ev(`(function(){
    var old=P.hxRow; P.hxRow=60;
    var net=f0HexNet(P), got=net?net.stats.mTarget:null;
    P.hxRow=old; return {input:60,used:got};})()`);
  chk(mClamp && mClamp.used === 48,
    '传进来的 M=60 会被内核夹到 48（旧 URL / localStorage 绕不过界面）', J(mClamp));

  /* ---- R3 dom 跟着 z₀ 走，cutLo 固定在 0.34 ---- */
  const doms = await ev(`(function(){
    var out=[];
    [1.618034,2.428,3.20].forEach(function(z){
      P.cutSurf=0;P.cutA=31.7174744;P.cutZ0=z;
      var S=f0SurfDef(P);
      out.push({z0:z,lo:+S.dom[0][0].toFixed(4),hi:+S.dom[0][1].toFixed(4),cutLo:S.cutLo});});
    return out;})()`);
  chk(doms && doms[0].cutLo === 0.34 && doms[1].cutLo === 0.34 && doms[2].cutLo === 0.34,
    '求交下界 cutLo 恒为 0.34（曲线该多长有多长，不被"画到哪"卡住）', J(doms));
  chk(doms && doms[0].lo < doms[1].lo && doms[1].lo < doms[2].lo,
    '曲面下界跟着 z₀ 上移（' + doms.map(d => d.lo).join(' < ') + '）—— 这就是"锥面不再被压扁"的机制',
    J(doms.map(d => d.lo)));
  chk(doms && doms[0].hi >= 3.0 && doms[2].hi >= 4.5,
    '曲面上界也跟着 z₀ 抬（z₀=3.20 时到 ' + (doms ? doms[2].hi : '?') + '），交线不再撞上限', J(doms.map(d => d.hi)));

  /* ---- R4 高 z₀ 三档不再截断 ---- */
  const hiZ = await ev(`(function(){
    var out=[];
    [2.80,3.00,3.20].forEach(function(z){
      P.cutSurf=0;P.cutA=38.150;P.cutZ0=z;P.cutMode=0;
      var R=f0Solve(P);
      out.push({z0:z,nClosed:R.nClosed,clipped:!!R.clipped,nSeg:R.nSeg});});
    return out;})()`);
  chk(hiZ && hiZ.every(r => !r.clipped && r.nClosed === 1),
    'z₀ = 2.80 / 3.00 / 3.20 三档都是【闭合 1 支、0 截断】（改前 2.80 就断）', J(hiZ));

  /* ---- R5 2D 红线不贴边（像素包围盒）---- */
  await ev(`(function(){P.cutSurf=0;P.cutA=38.150;P.cutZ0=2.4280;P.cutSkin=0;P.cutMode=0;
    rebuild();buildUI();return 1;})()`);
  await sleep(1800);
  const ink = await ev(`(function(){
    var pc=document.getElementById('prof'),g=pc.getContext('2d');
    var d=g.getImageData(0,0,pc.width,pc.height).data,W=pc.width,H=pc.height;
    var x0=1e9,y0=1e9,x1=-1,y1=-1,n=0;
    for(var y=0;y<H;y++)for(var x=0;x<W;x++){var i=(y*W+x)*4,r=d[i],gg=d[i+1],b=d[i+2];
      if(r>120&&r>gg*1.6&&r>b*1.6){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;n++;}}
    return {W:W,H:H,x0:x0,y0:y0,x1:x1,y1:y1,n:n,
      topPct:+(100*y0/H).toFixed(2),botPct:+(100*(H-y1)/H).toFixed(2)};})()`);
  chk(ink && ink.n > 200 && ink.topPct >= 3 && ink.botPct >= 3,
    '2D 红线上下各留 ≥3% 的白（上 ' + (ink ? ink.topPct : '?') + '% / 下 ' +
    (ink ? ink.botPct : '?') + '%）—— 不贴边，不会被看成"截断"', J(ink));
  chk(ink && Math.abs((ink.x1 - ink.x0) / (ink.y1 - ink.y0) - 0.75) < 0.35,
    '红线是竖长形（宽高比 ' + (ink ? ((ink.x1 - ink.x0) / (ink.y1 - ink.y0)).toFixed(2) : '?') +
    '），说明等轴没被拉伸', ink && (ink.x1 - ink.x0) / (ink.y1 - ink.y0));

  /* ---- R6 画布不再锁 520 ---- */
  const rLay = await ev(`(function(){
    var cb=document.getElementById('cvbox'),pb=document.getElementById('profbox');
    return {vh:innerHeight, cvH:Math.round(cb.getBoundingClientRect().height),
      profH:Math.round(pb.getBoundingClientRect().height),
      profBmpH:document.getElementById('prof').height,
      profCliH:document.getElementById('prof').clientHeight};})()`);
  chk(rLay && rLay.cvH > 560,
    '3D 画布高度 ' + (rLay ? rLay.cvH : '?') + 'px > 520（74vh 生效，不再锁死 520 让人"看不全"）', J(rLay));
  chk(rLay && Math.abs(rLay.profH - rLay.cvH) <= 40,
    '右栏与 3D 同高（' + (rLay ? rLay.profH : '?') + ' vs ' + (rLay ? rLay.cvH : '?') +
    '，差 ≤40px）', J(rLay));
  chk(rLay && Math.abs(rLay.profCliH - rLay.profBmpH) <= 2,
    '剖面画布的位图高度与显示高度一致（' + (rLay ? rLay.profBmpH : '?') + ' vs ' +
    (rLay ? rLay.profCliH : '?') + '）—— 没有"位图被 CSS 拉伸"这种隐形裁切', J(rLay));


  try { fs.rmSync(DL, { recursive: true, force: true }); } catch (e) {}
  console.log('\n--------');
  console.log('JS 异常：' + (errs.length ? errs.slice(0, 4).join(' ;; ') : '无'));
  chk(errs.length === 0, '全程没有 JS 异常', errs.slice(0, 2).join(' ;; '));
  console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败' + (skipped ? ' / ' + skipped + ' 跳过' : ''));
  try { ws.close(); } catch (e) {}
  try { child.kill(); } catch (e) {}
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('探针崩了：' + e.message); process.exit(2); });
