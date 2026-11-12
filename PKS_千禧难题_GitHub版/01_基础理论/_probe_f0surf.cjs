/* 探针：⓪ 族的「交线是否真的落在曲面上」—— 全部母线档位
   判据不看构造公式的自洽，而是把交线点按 (θ, 曲面参数) 反解回曲面坐标，逐点比 3D 距离。
   ▸ 旋转面（档 0/1/2/4）：点必须满足 hypot(x,z) = |f(y)|
   ▸ 舒伯格面（档 3，非旋转面，且半径额外乘 F0_SCH_K）：必须走 f0SchPt 反查

   2026-11-03 立：舒伯格档曾把缩放只加在画面上、不加在求交上 ⇒ 交线浮在面外 81.8%。
   ⚠ 同日抓到的假绿：预设名原来写成转义串（node 普通字符串里的字面反斜杠），
     经 JSON.stringify 再转义一次后页面收到的是反斜杠+u8212，indexOf 永远 -1，
     于是 clickPreset 返回空、页面停在上一档 —— 8 个档位其实只测了 1 个，还全部"通过"。
     现在：点不中就记 FAIL 并跳过量测，绝不允许"没测到"变成"通过"。 */
const { spawn } = require('child_process');
const os = require('os'), path = require('path'), fs = require('fs');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9364;
const URL = 'http://127.0.0.1:8899/01_%E5%9F%BA%E7%A1%80%E7%90%86%E8%AE%BA/AAA_PKS%E4%BB%A3%E7%A0%81%E6%97%8F_3D%E5%8F%82%E6%95%B0%E5%8F%B0.html';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const J = JSON.stringify;
let pass = 0, fail = 0;
function chk(c, label, extra) {
  if (c) { pass++; console.log('  \u2713 ' + label); }
  else { fail++; console.log('  \u2717 ' + label + (extra === undefined ? '' : '  \u2190 ' + extra)); }
}

(async () => {
  const ud = fs.mkdtempSync(path.join(os.tmpdir(), 'f0surf-'));
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
    if (r.result && r.result.exceptionDetails) throw new Error(expr.slice(0, 60) + ' → ' + J(r.result.exceptionDetails));
    return r.result.result.value;
  };
  await send('Page.enable');
  await send('Page.navigate', { url: URL });
  await sleep(9000);

  const clickPreset = (txt) => ev(`(function(){var bs=[].slice.call(document.querySelectorAll('#presets button'));
    for(var i=0;i<bs.length;i++){if((bs[i].textContent||'').indexOf(${J(txt)})>=0){bs[i].click();return bs[i].textContent.trim();}}
    return '';})()`);
  const badge = () => ev('document.getElementById("badge").textContent.trim()');
  const clickTab = (txt) => ev(`(function(){var bs=[].slice.call(document.querySelectorAll('#tabs button'));
    for(var i=0;i<bs.length;i++){if((bs[i].textContent||'').indexOf(${J(txt)})>=0){bs[i].click();return bs[i].textContent.trim();}}
    return '';})()`);

  /* 🔴🔴 页面默认族已改成 ⑦ tube2 ⇒ ⓪ 的预设按钮根本不在 DOM 里，
     不显式切族的话下面 8 条预设全部「找不到」，会变成 14 条假红。 */
  const __t0 = await clickTab('\u24EA \u53cc\u9525');
  await sleep(1500);
  console.log('  ' + (__t0 ? '\u2713' : '\u2717') + ' 切到 ⓪ 子页（默认族现为 ⑦ tube2）：' + J(__t0));
  if (!__t0) { console.log('  ⚠ 切族失败，下面读到的预设都属于 ⑦，全部判据无效'); }

  const RESID = `(function(){
    var P=window.P, R=f0Solve(P), S=R.def, c=(P.cutC===undefined?0.5:P.cutC);
    var sch=!!S.sch, devs=[], worst=null, i, j;
    for(i=0;i<R.segs.length;i++){
      var p3=f0To3(R.segs[i],R.sa,R.ca,R.z0);
      for(j=0;j<p3.length;j++){
        var p=p3[j], d=1e9, q=null;
        if(sch){
          var zp=0.10+((p.y/F0_SCH_H)+0.5)*0.20, th0=Math.atan2(p.z,p.x);
          [th0,th0+Math.PI].forEach(function(th){
            var t2=f0SchPt(th,zp,c); if(t2===null)return;
            var dd=Math.hypot(t2[0]-p.x,t2[1]-p.y,t2[2]-p.z);
            if(dd<d){d=dd;q=t2;}
          });
        }else{
          var rr=S.f(p.y);
          if(isFinite(rr)){ d=Math.abs(Math.hypot(p.x,p.z)-Math.abs(rr)); q=[rr,p.y,0]; }
        }
        if(d<1e9){devs.push(d); if(!worst||d>worst.d)worst={d:d,pt:[+p.x.toFixed(4),+p.y.toFixed(4),+p.z.toFixed(4)]};}
      }
    }
    devs.sort(function(a,b){return a-b;});
    return {n:devs.length, med:devs.length?devs[Math.floor(devs.length/2)]:null,
            max:devs.length?devs[devs.length-1]:null, worst:worst,
            surftype:(S.k|0), z0:+R.z0.toFixed(6), aDeg:+R.aDeg.toFixed(4), nSeg:R.segs.length,
            mode:(R.mode|0), tri:!!R.tri};
  })()`;

  console.log('\n[A] 全档位残差（交线点 ↔ 曲面点，单位＝场景长度）');
  /* key 必须用【真字符】：写成转义串会被 JSON.stringify 再转义一次，页面收不到 */
  const cases = [
    ['舒伯格锥面斜切', '舒伯格锥面（非旋转面 · 唯一有缩放的档）', 3],
    ['黄金极限蛋', '单叶双曲面 · 黄金蛋', 0],
    ['直圆锥 α=45', '直圆锥 · 椭圆', 1],
    ['直圆锥 α=60', '直圆锥 · 抛物线', 1],
    ['直圆锥 α=70', '直圆锥 · 双曲线', 1],
    ['双曲锥 · 对数母线', '双曲锥 · 对数母线', 2],
    ['双叶双曲面', '双叶双曲面', 4],
    ['三蛋同框', '三蛋同框（黄金档）', 0]
  ];
  const seen = new Set();
  for (const [key, name, k] of cases) {
    const hit = await clickPreset(key);
    if (!hit) { fail++; console.log('  \u2717 ' + name + '  ← 找不到预设「' + key + '」，本档未测到（不能判通过）'); continue; }
    await sleep(2300);
    const r = await ev(RESID);
    const b = await badge();
    if (r.surftype !== k) {
      fail++;
      console.log('  \u2717 ' + name + '  ← 切档失败：surfType=' + r.surftype + ' 期望 ' + k + '　badge=' + b);
      continue;
    }
    /* 三蛋同框复用黄金蛋的 α/z₀（三条曲线压在同一档上），所以签名必须带 mode */
    const sig = r.surftype + '|' + r.aDeg + '|' + r.z0 + '|m' + r.mode;
    if (seen.has(sig)) {
      fail++;
      console.log('  \u2717 ' + name + '  ← 与上一档签名完全相同（α=' + r.aDeg + ' z₀=' + r.z0 + ' mode=' + r.mode + '），疑似没切过去');
      continue;
    }
    seen.add(sig);
    const okk = r.n >= 20 && r.med < 1e-9 && r.max < 1e-3;
    console.log('  ' + (okk ? '\u2713' : '\u2717') + ' ' + name.padEnd(30) +
      ' 点=' + String(r.n).padStart(4) +
      '  中位=' + (r.med === null ? 'n/a' : r.med.toExponential(2)) +
      '  最大=' + (r.max === null ? 'n/a' : r.max.toExponential(2)) +
      '  [k=' + r.surftype + ' α=' + r.aDeg + ' z₀=' + r.z0 + ']');
    if (okk) pass++;
    else { fail++; console.log('       badge: ' + b + '  最差点 ' + J(r.worst)); }
  }

  /* A2：老师 2026-11-03 截图那一组（α=60.16° / z₀=0.71）—— 就是"交线看着不在面上"的那一帧 */
  console.log('\n[A2] 舒伯格档 · 截图参数（α=60.16° · z₀=0.71）');
  const hitA2 = await clickPreset('舒伯格锥面斜切');
  if (!hitA2) { fail++; console.log('  \u2717 找不到预设'); }
  else {
    await sleep(1800);
    const setRange = (name, val) => ev(`(function(){var rs=[].slice.call(document.querySelectorAll('#rows .row'));
      for(var i=0;i<rs.length;i++){var s=rs[i].querySelector('label span');
        if(s&&s.textContent.indexOf(${J(name)})>=0){
          var inp=rs[i].querySelector('input[type=range]'); if(!inp)return 'noinput';
          inp.value=${J(String(val))}; inp.dispatchEvent(new Event('input',{bubbles:true})); return inp.value;}}
      return 'norow';})()`);
    await setRange('切面倾角', 60.16); await sleep(700);
    await setRange('切面高度', 0.71); await sleep(2300);
    const r2 = await ev(RESID);
    const b2 = await badge();
    chk(b2.indexOf('60.16') >= 0, 'badge 里的倾角确实是 60.16°', b2);
    chk(r2.n >= 20 && r2.med < 1e-9 && r2.max < 1e-3,
      '截图参数下交线仍严格贴在曲面上（中位 ' + (r2.med === null ? 'n/a' : r2.med.toExponential(2)) +
      ' ／ 最大 ' + (r2.max === null ? 'n/a' : r2.max.toExponential(2)) + '）',
      J(r2.worst));
  }

  console.log('\n[B] 空测检查：每档必须真的取到点（无对象 = FAIL，不是通过）');
  chk(seen.size >= 6, '至少覆盖 6 个不同 (曲面类型, 倾角, z₀) 组合，实得 ' + seen.size);

  console.log('\n[C] 舒伯格档专项：离散最近距离（下界 = 1 个网格间距）');
  const hit2 = await clickPreset('舒伯格锥面斜切');
  if (!hit2) { fail++; console.log('  \u2717 找不到预设「舒伯格锥面斜切」'); }
  else {
    await sleep(2300);
    const bb = await badge();
    chk(bb.indexOf('舒伯格') >= 0, 'badge 确实写着舒伯格（不是别的档）', bb);
    const near = await ev(`(function(){
      var P=window.P, c=(P.cutC===undefined?0.5:P.cutC), R=f0Solve(P);
      if(!R.def.sch) return {bad:true, k:(R.def.k|0)};
      var S=[], NTh=360, NZ=180, i, j;
      for(i=0;i<=NTh;i++){var th=TAU*i/NTh;
        for(j=0;j<=NZ;j++){var q=f0SchPt(th,0.10+0.20*j/NZ,c); S.push(q===null?[0,0,0]:q);}}
      var ds=[],m;
      for(j=0;j<=NZ;j+=4)for(i=0;i<NTh;i++){
        var a=S[i*(NZ+1)+j], b=S[(i+1)*(NZ+1)+j];
        ds.push(Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2]));
      }
      ds.sort(function(x,y){return x-y;});
      var step=ds[Math.floor(ds.length/2)];
      var pts=[], s2, j2;
      for(s2=0;s2<R.segs.length;s2++){var p3=f0To3(R.segs[s2],R.sa,R.ca,R.z0);
        for(j2=0;j2<p3.length;j2++)pts.push([p3[j2].x,p3[j2].y,p3[j2].z]);}
      var nd=[];
      for(m=0;m<pts.length;m++){var p=pts[m],b2=1e9;
        for(var n=0;n<S.length;n++){var q2=S[n];
          var dd=(q2[0]-p[0])*(q2[0]-p[0])+(q2[1]-p[1])*(q2[1]-p[1])+(q2[2]-p[2])*(q2[2]-p[2]);
          if(dd<b2)b2=dd;}
        nd.push(Math.sqrt(b2));}
      nd.sort(function(x,y){return x-y;});
      return {step:step, med:nd[Math.floor(nd.length/2)], max:nd[nd.length-1], n:nd.length, z0:+R.z0.toFixed(4)};
    })()`);
    if (near.bad) { fail++; console.log('  \u2717 当前不是舒伯格档（surfType=' + near.k + '），C 段无效'); }
    else {
      console.log('  网格间距 ' + near.step.toFixed(5) + '，交线到曲面：中位 ' + near.med.toFixed(5) +
        '（' + (near.med / near.step).toFixed(2) + '×）最大 ' + near.max.toFixed(5) + '（' + (near.max / near.step).toFixed(2) + '×）');
      chk(near.med / near.step < 2.0, '中位最近距离 < 2 个网格间距（离散采样理论下界就是 1×）', (near.med / near.step).toFixed(2));
      /* 最远点【不判】—— 实测它不随采样加密收敛：200×90 时 0.0485、360×180 时 0.0456，
         绝对值几乎不变而网格间距减半 ⇒ 它是「该处半径 × θ 角步长」的最近点搜索量化误差
         （面片外缘半径可到 5，2π/360 的角步长给出 0.087 的横向分辨率），不是几何偏差。
         几何是否贴合由 [A] 的逐点反解判（1e-16 量级），那才是硬判据。 */
      console.log('  最远点 ' + (near.max / near.step).toFixed(1) + '×（参考值，不判：随半径×角步长变化）');
    }
  }

  /* ---------------- D：布局（2D 截面是独立右栏，不是参数面板里的东西）---------------- */
  console.log('\n[D] 布局：左 3D : 右 2D = 2 : 1，2D 不在调参浮窗里');
  const geo = () => ev(`(function(){
    var q=function(id){return document.getElementById(id)};
    var st=document.querySelector('.stage'), cv=q('cvbox'), pb=q('profbox'), pc=q('prof'), fx=q('fxp');
    var R=function(e){if(!e)return null;var r=e.getBoundingClientRect();
      return {x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height),
              disp:getComputedStyle(e).display};};
    return {stage:R(st), cv:R(cv), pb:R(pb), prof:R(pc),
            inFxp: !!(pb && pb.closest('#fxp')), hasOn: pb ? pb.classList.contains('on') : null,
            fxpProfCanvas: fx ? !!fx.querySelector('canvas#prof') : false,
            noprof: st ? st.classList.contains('noprof') : null};
  })()`);

  await sleep(500);
  let g = await geo();
  chk(!g.inFxp && !g.fxpProfCanvas, '2D 截面不在 #fxp 调参浮窗里（它是图，不是参数）');
  chk(g.pb && g.pb.disp !== 'none', '有 2D 图的族：右栏是显示的', g.pb && g.pb.disp);
  if (g.cv && g.pb) {
    const ratio = g.cv.w / g.pb.w;
    chk(ratio > 1.90 && ratio < 2.10, '宽度比 cvbox : profbox ≈ 2:1（实测 ' + ratio.toFixed(3) + '）', ratio.toFixed(3));
    chk(Math.abs(g.cv.y - g.pb.y) <= 2, '两栏顶部对齐（y 差 ' + Math.abs(g.cv.y - g.pb.y) + ' px）');
  } else { fail++; console.log('  \u2717 量不到 cvbox / profbox'); }

  /* 找一个没有 2D 剖面函数的族，切过去：右栏必须收掉、3D 必须撑满 */
  const noProf = await ev(`(function(){for(var i=0;i<FAMS.length;i++){
    if(!FAMS[i].prof)return {i:i,label:FAMS[i].label||FAMS[i].id||('族'+i)};}return null;})()`);
  if (!noProf) { fail++; console.log('  \u2717 找不到没有 2D 剖面的族（判据无从验证）'); }
  else {
    const tabTxt = await ev(`(function(){var b=document.querySelectorAll('#tabs button')[${noProf.i}];
      if(!b)return ''; b.click(); return b.textContent.trim();})()`);
    await sleep(1800);
    g = await geo();
    chk(tabTxt !== '', '切到无 2D 图的族：' + (tabTxt || noProf.label));
    chk(g.pb && g.pb.disp === 'none', '无 2D 图时右栏收起', g.pb && g.pb.disp);
    if (g.cv && g.stage) {
      chk(Math.abs(g.cv.w - g.stage.w) <= 2, '3D 视图撑满整行（' + g.cv.w + ' vs stage ' + g.stage.w + '）');
    }
    chk(g.noprof === true, '.stage 带上了 noprof 单列态');
    /* 切回 ⓪，确认右栏能回来。
       ⚠ 不能用 clickPreset —— 预设列表是【按族生成】的，站在 ⑦ 里根本没有 ⓪ 的预设名，
         点了等于没点（本判据第一版就是这么假红的）。族标签才是跨族的入口。 */
    await ev(`(function(){var b=document.querySelectorAll('#tabs button')[0];
      if(!b)return ''; b.click(); return b.textContent.trim();})()`);
    await sleep(2000);
    g = await geo();
    chk(g.pb && g.pb.disp !== 'none', '切回 ⓪ 后右栏恢复', g.pb && g.pb.disp);
  }

  console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
  if (errs.length) console.log('页面异常：' + errs.slice(0, 3).join(' | '));
  ws.close(); child.kill();
  process.exit(fail ? 1 : 0);
})();
