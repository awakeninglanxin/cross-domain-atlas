/* ==========================================================================
   ⑨-B 黎曼假设 × NP · 试证人螺旋 —— 专用探针
   独立复算一律用【另一种算法】，不照抄页面：
     · Li(x)  → 级数 li(x)=γ+ln ln x+Σ (ln x)^k/(k·k!)（页面用 Simpson）
     · π(x)   → 本文件自带一份筛（页面也是筛，但两份代码互不引用）
     · 最小原根 → 本文件自己分解 p−1 并验 g^((p−1)/q)≢1
   ========================================================================== */
const { spawn } = require('child_process');
const os = require('os'), path = require('path');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9421;
const URL = process.env.PROBE_URL ||
  'http://127.0.0.1:8899/01_%E5%9F%BA%E7%A1%80%E7%90%86%E8%AE%BA/AAA_PKS%E4%BB%A3%E7%A0%81%E6%97%8F_3D%E5%8F%82%E6%95%B0%E5%8F%B0.html';
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- 独立复算 ---------- */
function liSeries(x) {                       // li(x)，柯西主值
  const L = Math.log(x), gam = 0.5772156649015329;
  let term = L, s = 0;
  for (let k = 1; k < 400; k++) {
    if (k > 1) term = term * L / k;          // term = L^k / k!
    s += term / k;
    if (k > 40 && Math.abs(term / k) < 1e-14 * Math.max(1, Math.abs(s))) break;
  }
  return gam + Math.log(L) + s;
}
const LI2 = liSeries(2);
const LiOf = x => liSeries(x) - LI2;         // ∫₂ˣ dt/ln t

function piSieve(n) {
  const m = new Uint8Array(n + 1); let c = 0;
  for (let i = 2; i <= n; i++) {
    if (!m[i]) { c++; for (let j = i * i; j <= n; j += i) m[j] = 1; }
  }
  return c;
}

(async () => {
  /* 先自检独立实现（否则后面全是假绿） */
  console.log('── 独立复算自检 ──');
  const p16 = piSieve(1e6), l16 = LiOf(1e6);
  console.log('  π(10⁶) =', p16, p16 === 78498 ? '✓ 已知真值' : '✗');
  console.log('  Li(10⁶) =', l16.toFixed(4), Math.abs(l16 - 78626.504) < 0.01 ? '✓' : '✗');
  if (p16 !== 78498) { console.log('独立实现错了，后面不必跑'); process.exit(1); }

  const ud = require('fs').mkdtempSync(path.join(os.tmpdir(), 'prh-'));
  const child = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + ud, '--no-first-run', '--hide-scrollbars', '--window-size=1560,1040', 'about:blank'], { stdio: 'ignore' });
  for (let i = 0; i < 50; i++) { try { await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); break; } catch (e) { await sleep(300); } }
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const pend = new Map(); const errs = [];
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') {
      const d = m.params.exceptionDetails;
      errs.push(((d.exception && d.exception.description) || d.text || '').slice(0, 200));
    }
  };
  const send = (m, p = {}) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
  const ev = async x => {
    const r = await send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true });
    if (r.result && r.result.exceptionDetails) return { __err: (r.result.exceptionDetails.exception || {}).description };
    return r.result && r.result.result ? r.result.result.value : undefined;
  };

  let pass = 0, fail = 0; const fails = [];
  const chk = (cond, label, extra) => {
    if (cond) { pass++; console.log('  ✓ ' + label); }
    else { fail++; fails.push(label + (extra !== undefined ? ('  ← 实得 ' + JSON.stringify(extra)) : '')); console.log('  ✗ ' + label + (extra !== undefined ? ('  ← 实得 ' + JSON.stringify(extra)) : '')); }
  };
  const near = (a, b, rel) => Math.abs(a - b) <= rel * Math.max(1, Math.abs(b));

  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: URL + '?t=' + Date.now() });
  for (let i = 0; i < 40; i++) { const r = await ev('typeof FAMS!=="undefined"&&FAMS.length'); if (r) break; await sleep(400); }
  await sleep(1500);

  console.log('\n── R1 结构 ──');
  const s1 = await ev('({tabs:document.querySelectorAll("#tabs button").length, fams:FAMS.length})');
  chk(s1.tabs === s1.fams && s1.fams >= 11, '页签数 === FAMS 数（' + s1.tabs + '）', s1);

  const fam = await ev(`(function(){var i=-1;for(var k=0;k<FAMS.length;k++)if(FAMS[k].id==='clothoid')i=k;
    return {i:i,n:FAMS[i].params.length,
            mode:FAMS[i].params.filter(function(p){return p.k==='clMode';}).length,
            opts:(FAMS[i].params.filter(function(p){return p.k==='clMode';})[0]||{opts:[]}).opts.length};})()`);
  chk(fam.i >= 0 && fam.n === 18, '⑨ 参数 18 项（10 旧 + 7 RH + clMode），实得 ' + fam.n, fam);
  chk(fam.mode === 1 && fam.opts === 2, 'clMode 是二选一', fam);

  console.log('\n── R2 切模式 ──');
  await ev(`(function(){for(var k=0;k<FAMS.length;k++)if(FAMS[k].id==='clothoid')selectFam(k);
                     P.clMode=1; rebuild(); buildUI();})()`);
  await sleep(1600);
  /* 🔴 页面不给控件设 id（滑条是 div.row > input[type=range]，二选一是 div.choices > button），
     所以只能按【渲染出来的块】数，按标签认。
     模式 B = clMode + 5 滑条 + 2 二选一 = 8 块；模式 A = clMode + 10 滑条 = 11 块。
     （第一版按 id 数，抓到 5 个空串 ⇒ 4 条假红里的第 1、3 条。） */
  const s2 = await ev(`(function(){
    var bl=[].slice.call(document.querySelectorAll('#rows > div'));
    var heads=bl.map(function(b){var l=b.querySelector('label span')||b.firstElementChild;
      return l?l.textContent.trim():'';});
    return {n:bl.length, heads:heads, badge:document.getElementById('badge').textContent,
            hasX1:heads.some(function(h){return h.indexOf('起点 P1.x')>=0;})};})()`);
  chk(s2.n === 8, 'RH 模式面板 8 个控件（clMode + 5 滑条 + 2 二选一），实得 ' + s2.n, s2.heads);
  const need8 = ['模式（同一族', '安全位数', '盘旋圈数', '外扩强度', '抬升高度', '刻度数', '实验一', '实验二'];
  const miss8 = need8.filter(w => !(s2.heads || []).some(h => h.indexOf(w) >= 0));
  chk(miss8.length === 0, 'RH 模式 8 个控件标签全部在册（缺：' + (miss8.join('/') || '无') + '）', miss8);
  chk(!s2.hasX1, 'S 模式的 x1 滑条已隐藏（按标签查，不按 id）', s2.heads);
  chk(/RH 试证人螺旋/.test(s2.badge || ''), '徽标切到「RH 试证人螺旋」', s2.badge);

  console.log('\n── R3 读数与独立复算 ──');
  const rd = await ev(`[].map.call(document.querySelectorAll('#readout div'),function(d){
      return [d.querySelector('span').textContent, d.querySelector('b').textContent];})`);
  const rowOf = lab => { const r = (rd || []).find(x => x[0].indexOf(lab) >= 0); return r ? r[1] : ''; };
  chk((rd || []).length === 16, '读数 16 行', (rd || []).length);
  chk(rowOf('结论').indexOf('既不是 NP') >= 0, '结论行写明「既不是 NP」', rowOf('结论').slice(0, 40));
  chk(rowOf('那"比 NP 难"呢').indexOf('✗') >= 0, '「比 NP 难」判为 ✗', rowOf('那"比 NP 难"呢').slice(0, 30));

  const nums = await ev(`(function(){var G=f10RhGeo(P);return {bits:G.bits,W:G.W,lnN:G.lnN,perTurn:G.perTurn,arc:G.arc,marks:G.marks,
      li:F10RH.li(1000000),pi:F10RH.piOf(1000000),g1009:F10RH.leastPrimRoot(1009),
      g1e7:F10RH.leastPrimRoot(10000019),g1e6:F10RH.leastPrimRoot(1000003)};})()`);
  const Wexp = 2 * Math.pow(2048 * Math.LN2, 2);
  chk(near(nums.W, Wexp, 1e-12), 'W = 2(ln n)²（独立复算 ' + Wexp.toExponential(6) + '）', nums.W);
  chk(near(nums.lnN, 2048 * Math.LN2, 1e-12), 'ln n = b·ln2（' + (2048 * Math.LN2).toFixed(4) + '）', nums.lnN);
  chk(nums.pi === 78498, 'π(10⁶) = 78498（已知真值）', nums.pi);
  chk(near(nums.li, LiOf(1e6), 1e-6), 'Li(10⁶) 与级数法一致（' + LiOf(1e6).toFixed(4) + '，页面用 Simpson）', nums.li);
  const errExp = Math.abs(78498 - LiOf(1e6));
  chk(rowOf('实验一').indexOf(errExp.toFixed(1)) >= 0, '屏上 |π−Li| = ' + errExp.toFixed(1) + ' 与独立复算一致', rowOf('实验一').slice(0, 80));

  const x = 1e6, bRH = Math.sqrt(x) * Math.pow(Math.log(x), 2), bTr = Math.pow(x, 0.999);
  chk(rowOf('RH 界').indexOf(bRH.toExponential(3)) >= 0, '√x·ln²x = ' + bRH.toExponential(3) + ' 一致', rowOf('RH 界').slice(0, 60));
  chk(rowOf('粗界').indexOf(bTr.toExponential(3)) >= 0, 'x^0.999 = ' + bTr.toExponential(3) + ' 一致', rowOf('粗界').slice(0, 60));
  chk(rowOf('粗界').indexOf((bTr / bRH).toFixed(2) + '×') >= 0, '「宽多少倍」= ' + (bTr / bRH).toFixed(2) + '×', rowOf('粗界').slice(0, 60));

  console.log('\n── R4 最小原根（五个可选 p 全查） ──');
  chk(nums.g1009 === 11, 'g(1009) = 11（已知真值）', nums.g1009);
  const ps = [1009, 10007, 100003, 1000003, 10000019];
  const gAll = await ev(`(function(){var out={};[1009,10007,100003,1000003,10000019].forEach(function(p){out[p]=F10RH.leastPrimRoot(p);});return out;})()`);
  let okAll = true, det = [];
  for (const p of ps) {
    const g = gAll[p], lim = Math.pow(Math.log(p), 2);
    if (!(g > 1 && g <= lim)) okAll = false;
    det.push(p + '→' + g + '≤' + lim.toFixed(1));
  }
  chk(okAll, '五个 p 全部 g ≤ (ln p)²（' + det.join(' · ') + '）', gAll);
  /* 独立验 g(1000003) 真是原根：分解 p−1 后逐个素因子验 */
  function isPR(g, p) {
    let n = p - 1; const fs = [];
    for (let d = 2; d * d <= n; d++) if (n % d === 0) { fs.push(d); while (n % d === 0) n /= d; }
    if (n > 1) fs.push(n);
    const mp = (b, e, m) => { let r = 1; b %= m; while (e > 0) { if (e & 1) r = (r * b) % m; b = (b * b) % m; e >>= 1; } return r; };
    return fs.every(q => mp(g, (p - 1) / q, p) !== 1);
  }
  chk(isPR(gAll[1000003], 1000003), '独立验 g(1000003) 是原根（分解 p−1 + 模幂）', gAll[1000003]);
  /* 最小性：g 是「最小」原根 ⇒ 比它小的每个 k(≥2) 都必须不是原根。
     没有这条，leastPrimRoot 从 3 起跑（漏掉 g=2）也能全绿 —— 返回的仍是一个合法原根。
     这是变异测试逼出来的判据，不是补装饰。 */
  const notMin = [];
  for (const p of ps) {
    const g = gAll[p];
    for (let k = 2; k < g; k++) if (isPR(k, p)) notMin.push(p + ': k=' + k + ' < g=' + g);
  }
  chk(notMin.length === 0, '五个 g 都是「最小」的（比它小的 k 逐个验非原根）', notMin);

  console.log('\n── R5 几何账目 ──');
  const geo = await ev(`(function(){
    var obj=root.children[0], G=f10RhGeo(P);
    var seg=obj.userData.rhSeg||null;
    var balls=[]; obj.traverse(function(o){ if(o.geometry&&o.geometry.type==='SphereGeometry'){
      var v=new THREE.Vector3(); o.getWorldPosition(v);
      balls.push({col:'#'+o.material.color.getHexString(),x:v.x,y:v.y,z:v.z,r:o.geometry.parameters.radius});}});
    var green=balls.filter(function(b){return b.col==='#1c7a3e';});
    var ends=G.pts[G.pts.length-1];
    var exp={x:ends[0]+obj.position.x, y:ends[1]+obj.position.y, z:ends[2]+obj.position.z};
    var d=green.length===1?Math.hypot(green[0].x-exp.x,green[0].y-exp.y,green[0].z-exp.z):-1;
    var tubes=[]; obj.traverse(function(o){ if(o.geometry&&o.geometry.type==='TubeGeometry'){
      tubes.push({col:'#'+o.material.color.getHexString(),
                  seg:o.geometry.parameters.tubularSegments, r:o.geometry.parameters.radius});}});
    var rT=Math.max(0.014,0.026*(1+0.5*G.expand));
    return {seg:seg, nBalls:balls.length, nGreen:green.length, dEnd:d, tubes:tubes, rT:rT,
            nPts:G.pts.length, marks:G.marks, noArray:!!obj.userData.noArray};})()`);
  chk(geo.seg && geo.seg.nBlue + geo.seg.nGreen - 1 === geo.seg.nPts,
    '蓝段 + 绿段 − 1 = 总点数（共享 cut，不是叠画） ' + JSON.stringify(geo.seg), geo.seg);
  chk(geo.seg && Math.abs(geo.seg.cut / geo.seg.nPts - 0.78) < 0.01,
    '绿段起点 = 78% 处（cut/nPts = ' + (geo.seg ? (geo.seg.cut / geo.seg.nPts).toFixed(3) : '?') + '）', geo.seg);
  chk(geo.nBalls === geo.marks + 1, '球数 = 刻度数 + 中心红球（' + geo.nBalls + ' = ' + geo.marks + ' + 1）', geo);
  chk(geo.nGreen === 1 && geo.dEnd >= 0 && geo.dEnd < 1e-9, '绿球正好落在曲线末端（|Δ| = ' + (geo.dEnd >= 0 ? geo.dEnd.toExponential(2) : '?') + '）', geo);
  /* 引导线本身也是一根 TubeGeometry（中心→起点，按设计只有 2 段）——
     上一版把三条一起取 min ⇒ 「分段 ≥16」被引导线的 2 段判死，是假红。
     改成按材质颜色分开取，并用【点数】独立重算分段数（两条路径互校）。 */
  const tB = (geo.tubes || []).filter(t => t.col === '#2f74c8')[0] || null;
  const tG = (geo.tubes || []).filter(t => t.col === '#1c7a3e')[0] || null;
  const tL = (geo.tubes || []).filter(t => t.col === '#b9c4d6')[0] || null;
  const expB = geo.seg ? Math.max(40, Math.min(520, Math.round(geo.seg.nBlue / 4))) : -1;
  const expG = geo.seg ? Math.max(16, Math.min(300, Math.round(geo.seg.nGreen / 4))) : -1;
  chk(tB && tG && tB.seg === expB && tG.seg === expG,
    '蓝/绿管分段 = clamp(点数/4)（实测/重算 ' + (tB ? tB.seg : '?') + '÷' + expB +
    ' · ' + (tG ? tG.seg : '?') + '÷' + expG + '）', geo.tubes);
  chk(tB && tG && near(tB.r, geo.rT, 1e-12) && near(tG.r, geo.rT * 1.18, 1e-12),
    '绿管比蓝管粗 1.18×（若是同一根管重画会一样粗）', geo.tubes && geo.tubes.map(t => t.r));
  chk(tL && tL.seg === 2 && near(tL.r, geo.rT * 0.42, 1e-12),
    '引导线单独一根（2 段 · 半径 0.42×rT），不是第三条螺线', tL);
  chk(geo.noArray === true, 'noArray 已置（不被 reps=9 复制成 9 层）', geo.noArray);

  console.log('\n── R6 判定卡 ──');
  const card = await ev(`(function(){var b=document.getElementById('rhBox'),bd=document.getElementById('rhBd');
    var tabs=bd.querySelectorAll('table').length;
    var trs=[].map.call(bd.querySelectorAll('tbody tr'),function(t){return t.children.length;});
    var txt=bd.innerText||'';
    return {disp:getComputedStyle(b).display, tabs:tabs, rows:trs.length, cells:trs,
            hasGRH:txt.indexOf('GRH')>=0, hasUnproved:txt.indexOf('未证')>=0,
            hasSqueeze:txt.indexOf('压缩示意')>=0, cls:b.className};})()`);
  chk(card.disp === 'block', '模式 B 下判定卡显示', card.disp);
  chk(card.tabs === 2, '判定卡两张表（判定 + 实验）', card.tabs);
  chk(card.rows === 9, '判定卡 9 行（6 条说法 + 3 个实验）', card.rows);
  chk(card.hasGRH && card.hasUnproved, '判定卡写明 GRH 且写明「未证」（不许把条件写成事实）', card);
  chk(card.hasSqueeze, '判定卡写明「压缩示意」', card.hasSqueeze);
  chk(/min/.test(card.cls), '判定卡默认收起', card.cls);
  chk(rowOf('实验三').indexOf('压缩示意') >= 0, '读数也写了「压缩示意」', rowOf('实验三').slice(0, 60));

  console.log('\n── R7 切回模式 A（回归） ──');
  const back = await ev(`(function(){P.clMode=0;rebuild();buildUI();
    var G=f10Geo(P);var n=0;root.traverse(function(o){if(o.geometry)n++;});
    return {rows:document.querySelectorAll('#readout div').length,
            badge:document.getElementById('badge').textContent,
            rh:getComputedStyle(document.getElementById('rhBox')).display,
            D:G.D, R1:G.R1, meshes:n,
            nBlk:document.querySelectorAll('#rows > div').length,
            hasX1:[].some.call(document.querySelectorAll('#rows > div'),function(b){
              var l=b.querySelector('label span')||b.firstElementChild;
              return !!l&&l.textContent.indexOf('起点 P1.x')>=0;})};})()`);
  chk(back.rows === 15, '模式 A 读数回到 15 行', back.rows);
  chk(/Clothoid S 过渡/.test(back.badge), '徽标回到「Clothoid S 过渡」', back.badge);
  chk(back.rh === 'none', '判定卡在模式 A 隐藏', back.rh);
  chk(back.nBlk === 11, '模式 A 面板回到 11 个控件（clMode + 10 滑条），实得 ' + back.nBlk, back.nBlk);
  chk(back.hasX1, 'S 模式的 x1 滑条回来了（按标签查）', back.hasX1);
  /* 容差：改前备份实测 D=48.34511350695125 / R1=2.856699297929307。
     这里判「默认几何未变」⇒ 绝对容差 1e-3 足够。上一版用 near(...,1e-6) ⇒ 窗只有 4.8e-5，
     实测差 1.1e-4 就红（第 4 条假红）。真正逐位对照在 _cmpA.cjs（跟备份页面比）。 */
  chk(Math.abs(back.D - 48.345) < 1e-3 && Math.abs(back.R1 - 2.8567) < 1e-3,
    '默认几何未变：D=' + back.D.toFixed(3) + ' R1=' + back.R1.toFixed(4), [back.D, back.R1]);

  console.log('\n── R8 异常 ──');
  chk(errs.length === 0, '全程 0 JS 异常', errs.slice(0, 3));

  console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
  if (fail) { console.log('失败项：'); fails.forEach(f => console.log('  - ' + f)); }
  ws.close(); child.kill();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FAIL ' + e.message); process.exit(1); });
