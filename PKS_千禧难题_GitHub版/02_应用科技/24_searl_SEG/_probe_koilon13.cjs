/* 探针：koilon 集成台 2026-11-04 审阅修正（六~十三节）
   判据读【屏上的字】+【表格数字】，关键比值【独立复算】，不读页面中间变量。
   用法：node _probe_koilon13.cjs        （需 8899 静态服务，根 = D:/AAA我的文件）
        PROBE_URL=<变异体> node _probe_koilon13.cjs
*/
const { spawn } = require('child_process');
const os = require('os'), path = require('path'), fs = require('fs');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9361;
const URL = process.env.PROBE_URL || 'http://127.0.0.1:8899/02_%E5%BA%94%E7%94%A8%E7%A7%91%E6%8A%80/24_searl_SEG/AAA_koilon%E7%A3%81%E5%B8%86%E4%B8%8ESEG%E9%A3%9E%E8%A1%8C%E5%8E%9F%E7%90%86_%E9%9B%86%E6%88%90%E4%BB%BF%E7%9C%9F%E5%8F%B0.html';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const J = JSON.stringify;
let pass = 0, fail = 0;
function chk(c, label, extra) {
  if (c) { pass++; console.log('  \u2713 ' + label); }
  else { fail++; console.log('  \u2717 ' + label + (extra === undefined ? '' : '  \u2190 ' + J(extra))); }
}
const near = (a, b, rel) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= rel * Math.max(1e-12, Math.abs(b));

/* ---------- 独立复算（不经页面代码） ---------- */
// 十二-2 表：纯耦合稳态 T_∞ = P/(Γ0·κ·C)，取 P=0.1 W、C=1 J/K、Γ0=1
const TINF = k => 0.1 / (1 * k * 1);
// 冷库耗干：C_k·ΔT/Q̇
const DRAIN_H = (Ck, dT, Q) => Ck * dT / Q / 3600;
// 能量尺度之比（相对化学 1e7 J/kg）
const ECH = 1e7, EFIS = 3.4e14, EFIS_RATIO = EFIS / ECH;
// 十三-6 通量账：σT⁴(300K) × 直径 1 m 双面圆盘（常数自己写，不读页面）
const SIGMA = 5.670374419e-8, TAMB = 300, DIAM = 1.0;
const FLUX = SIGMA * Math.pow(TAMB, 4);              // 459.3 W/m²
const AREA = 2 * Math.PI * Math.pow(DIAM / 2, 2);     // 1.5708 m²
const FLUX_CAP = FLUX * AREA;                         // 721.2 W
const ETA_C = 1 - 2.725 / TAMB;                       // 卡诺 0.990917
const GAP = 1e14 / FLUX_CAP;                          // 缺口 1.386e11

(async () => {
  const ud = fs.mkdtempSync(path.join(os.tmpdir(), 'koilon13-'));
  const child = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + ud,
    '--no-first-run', '--hide-scrollbars', '--window-size=1480,960', 'about:blank'], { stdio: 'ignore' });
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
    if (m.method === 'Runtime.exceptionThrown') errs.push((m.params.exceptionDetails.text || '') + ' ' + ((m.params.exceptionDetails.exception || {}).description || ''));
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push(m.params.args.map(a => a.value).join(' '));
  };
  const send = (m, p = {}) => new Promise(res => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result && r.result.exceptionDetails) throw new Error(expr.slice(0, 70) + ' → ' + J(r.result.exceptionDetails));
    return r.result.result.value;
  };

  await send('Page.enable'); await send('Runtime.enable');
  await send('Page.navigate', { url: URL });

  // 就绪轮询：这页 0.96 MB，冷加载可能十几秒，不用固定 sleep 当"加载完"
  let ready = false;
  for (let i = 0; i < 120; i++) {
    const st = await ev(`(function(){return {rs:document.readyState, views:document.querySelectorAll('.view').length};})()`);
    if (st && st.rs === 'complete' && st.views > 0) { ready = true; break; }
    await sleep(500);
  }
  if (!ready) {
    const st = await ev(`(function(){return {rs:document.readyState, views:document.querySelectorAll('.view').length, scripts:document.scripts.length};})()`);
    console.log('!! 页面未就绪（先查资源加载，不是判据错）: ' + J(st));
  }
  await sleep(800);

  // ---------- R1 结构 ----------
  console.log('R1 结构');
  const st = await ev(`(function(){
    var t = document.body.textContent || '';
    var h3 = [].map.call(document.querySelectorAll('h3.sec'), function(e){return e.textContent.trim();});
    var i13 = -1; for (var i=0;i<h3.length;i++) if (h3[i].indexOf('十三、三本账')===0) i13=i;
    var card = i13>=0 ? document.querySelectorAll('h3.sec')[i13].closest('.card') : null;
    return {
      nView: document.querySelectorAll('.view').length,
      h3: h3.length,
      has13: i13>=0,
      t13: card ? (card.textContent||'').replace(/\\s+/g,' ').trim() : '',
      nTab13: card ? card.querySelectorAll('table').length : 0,
      nH4: card ? card.querySelectorAll('h4').length : 0,
      len: t.length
    };})()`);
  chk(st.nView === 13, '页面 13 个 view 都在', st.nView);
  chk(st.has13, '找到「十三、三本账」一节', st.h3);
  /* 不写死「恰好 N」：内容会增加，写死会变成假红。只要求「至少这么多」。 */
  chk(st.nTab13 >= 3, '十三节至少 3 张表（三本账 / 能量阶梯 / 通量账）', st.nTab13);
  chk(st.nH4 >= 8, '十三节至少 8 个小标题（十三-1..8）', st.nH4);

  // ---------- R2 第八节：锁相量纲 ----------
  console.log('R2 第八节量纲');
  const t8 = await ev(`(function(){
    var t = document.body.textContent||'';
    return {
      dWb: t.indexOf('Δω_b = 2N·A_n/γ') >= 0,
      dOm: t.indexOf('ΔΩ = 2A_n/γ') >= 0,
      notN: t.indexOf('与 N 无关') >= 0,
      old: t.indexOf('A_n / (I·N_n)') >= 0,
      ndamp: t.indexOf('但这 ≠ 负阻尼') >= 0,
      sync: t.indexOf('普通同步电机也锁相') >= 0,
      wordRed: t.indexOf('目前唯一') >= 0
    };})()`);
  chk(t8.dWb, 'ω_b 轴窗口写成 Δω_b = 2N·A_n/γ', t8);
  chk(t8.dOm && t8.notN, 'Ω 轴窗口写成 ΔΩ = 2A_n/γ 且标明与 N 无关', t8);
  chk(!t8.old, '原式 A_n/(I·N_n)（量纲不等）已消失', t8.old);
  chk(t8.ndamp && t8.sync, '已区分「恒转矩偏置 ≠ 负阻尼」并举同步电机反例', t8);
  chk(!t8.wordRed, '「目前唯一……的读法」已撤（改「一种读法」）', t8.wordRed);

  // ---------- R3 第七节：角向 / 轴向 + m_k ----------
  console.log('R3 第七节');
  const t7 = await ev(`(function(){
    var t = document.body.textContent||'';
    return {
      kz: t.indexOf('k_z,n·z') >= 0,
      Nz: t.indexOf('N_z = 1680') >= 0,
      ang: t.indexOf('轴向') >= 0 && t.indexOf('角向') >= 0,
      mk: t.indexOf('m_k 是【质量 kg】') >= 0,
      rho: t.indexOf('介质质量密度') >= 0,
      oldMk: t.indexOf('m_k 就是') >= 0,
      twt: t.indexOf('行波管') >= 0
    };})()`);
  chk(t7.kz, '耦合相位已拆成 N·θ − k_z·z', t7);
  chk(t7.Nz && t7.ang, '1680 明确标为轴向 N_z（角向/轴向分开）', t7);
  chk(t7.mk && t7.rho, 'm_k 标为质量 kg，ρ_k 单列', t7);
  chk(!t7.oldMk, '旧式「m_k 就是（致密度）」已消失（说明句里的致密度保留）', t7.oldMk);
  chk(t7.twt, '给了行波管等工程先例（1680 有实物类比）', t7.twt);

  // ---------- R4 第十二节：热账 ----------
  console.log('R4 第十二节热账');
  const t12 = await ev(`(function(){
    var t = document.body.textContent||'';
    var h3 = [].map.call(document.querySelectorAll('h3.sec'), function(e){return e.textContent.trim();});
    return {
      title: (h3.filter(function(s){return s.indexOf('十二、')===0;})[0]||''),
      C: t.indexOf('设热容 C') >= 0,
      oldC: t.indexOf('设热量 C') >= 0,
      Tk: t.indexOf('T_∞ → T_k') >= 0,
      dTdk: t.indexOf('∂T_∞/∂κ') >= 0,
      cold: t.indexOf('不是 0 K') >= 0
    };})()`);
  chk(t12.title.indexOf('方向成立，下界取决于冷库') > 0, '十二节标题改成「方向成立，下界取决于冷库」', t12.title);
  chk(t12.C && !t12.oldC, 'C 改称「热容」，旧「热量 C」已消失', t12);
  chk(t12.Tk && t12.cold, '稳态给出 T_∞ → T_k⁺，明写不是 0 K', t12);
  chk(t12.dTdk, '给出 ∂T_∞/∂κ 的符号（方向不靠 T_k=0）', t12.dTdk);

  // ---------- R5 P2 判据 ----------
  console.log('R5 第九节 P2');
  const p2 = await ev(`(function(){
    var t = document.body.textContent||'';
    return {dT: t.indexOf('dT/dt')>=0, tau: (t.indexOf('= C/G')>=0 || t.indexOf('τth = C/G')>=0),
            old: t.indexOf('失锁瞬间立刻回正')>=0, why: t.indexOf('温度是连续')>=0};})()`);
  chk(p2.dT && p2.tau, 'P2 改判 dT/dt 符号 + τ_th = C/G', p2);
  chk(!p2.old, '旧的「失锁瞬间立刻回正」已撤', p2.old);
  chk(p2.why, '写明了「有热容的系统温度连续、不可能瞬变」的理由', p2.why);

  // ---------- R6 十一节 ε 口径 ----------
  console.log('R6 十一节 ε');
  const t11 = await ev(`(function(){
    var t = document.body.textContent||'';
    return {phys: t.indexOf('N·Ω·|ε| ≤ K')>=0, norm: t.indexOf('|ε| ≤ K / (N·Ω)')>=0,
            om: t.indexOf('以 Ω 归一')>=0};})()`);
  chk(t11.phys && t11.norm && t11.om, 'ε 条件补上 Ω：一般式 + 归一化声明', t11);

  // ---------- R7 独立复算：十二-2 表 ----------
  console.log('R7 独立复算');
  const tab = await ev(`(function(){
    var out = [];
    var tabs = document.querySelectorAll('table.spec');
    for (var i=0;i<tabs.length;i++){
      var h = (tabs[i].textContent||'');
      if (h.indexOf('纯耦合') >= 0 && h.indexOf('耦合通道占比') >= 0){
        var tr = tabs[i].querySelectorAll('tbody tr');
        for (var j=0;j<tr.length;j++){
          var td = tr[j].querySelectorAll('td');
          out.push([parseFloat((td[0].textContent||'').trim()), parseFloat((td[2].textContent||'').trim())]);
        }
        break;
      }
    }
    return out;})()`);
  chk(Array.isArray(tab) && tab.length === 6, '读到十二-2 表的 6 行（κ, T_∞纯耦合）', tab && tab.length);
  if (Array.isArray(tab) && tab.length === 6) {
    const bad = tab.filter(r => !near(r[1], TINF(r[0]), 1e-6));
    chk(bad.length === 0, '表里 T_∞ = P/(Γ₀κC) 逐行独立复算一致（P=0.1, C=1）',
        bad.length ? bad : '全部一致');
    console.log('      ' + tab.map(r => 'κ=' + r[0] + '→' + r[1] + 'K(算 ' + TINF(r[0]).toFixed(4) + ')').join(' | '));
  }
  const drain = DRAIN_H(1000, 100, 1);
  const dOK = await ev(`(document.body.textContent||'').indexOf('${drain.toFixed(1)} 小时')>=0`);
  chk(dOK, '冷库耗干 27.8 h 与独立复算一致（C_k=1kJ/K, ΔT=100K, Q̇=1W → ' + drain.toFixed(2) + ' h）', drain);

  // ---------- R8 十三-3 能量阶梯 ----------
  console.log('R8 能量尺度阶梯');
  const eg = await ev(`(function(){
    var t = document.body.textContent||'';
    return {fis: t.indexOf('3.4×10¹⁴')>=0, ratio: t.indexOf('3.4×10⁷')>=0,
            txt: t.indexOf('与化学之比')>=0, mev: t.indexOf('MeV')>=0, six: t.indexOf('6 个数量级')>=0};})()`);
  chk(eg.fis && eg.txt && eg.ratio, '能量阶梯表有聚变 3.4×10¹⁴ J/kg、比值 3.4×10⁷（独立算 ' + EFIS_RATIO.toExponential(1) + '）', eg);
  chk(eg.six, '明写化学(eV)与核(MeV)差 6 个数量级', eg.six);
  chk(eg.mev, '把「必须落在 MeV 档」写成可判条件（SEG 立论的位置）', eg.mev);

  // ---------- R9 十三-4/5 边界与澄清 ----------
  console.log('R9 边界与澄清');
  const b = await ev(`(function(){
    var t = document.body.textContent||'';
    return {no1: t.indexOf('没证明 koilon 存在')>=0,
            no2: t.indexOf('没证明 SEG 的异常净功率存在')>=0,
            no6: t.indexOf('模型输出')>=0,
            m1: t.indexOf('本页原稿判错了') >= 0,
            m2: t.indexOf('方向这一半说重了') >= 0,
            m3: t.indexOf('同一个事实换说法') >= 0};})()`);
  chk(b.no1 && b.no2 && b.no6, '十三-4 列了「本页没有证明什么」6 条', b);
  chk(b.m1, '十三-5 ① 已改成「本页原稿判错了」（不再说页面主张相反）', b.m1);
  chk(b.m2, '十三-5 指出「越耦合越冷是预设」方向那一半说重了', b.m2);
  chk(b.m3, '十三-5 指明「336 同义反复」本页已自陈', b.m3);

  // ---------- R11 十二-3 / 十三-6·7·8：加负载更冷 + 通量账 + 适用域 ----------
  console.log('R11 加负载更冷与通量账');
  const h = await ev(`(function(){
    var t = document.body.textContent||'';
    return {
      title: t.indexOf('负载是「输出」，不是热源')>=0,
      oldGone: t.indexOf('加负载是「更热」')<0,
      loadNoHeat: t.indexOf('进热节点的只有机内损耗')>=0,
      slack: t.indexOf('d lnΓ / dP')>=0 && t.indexOf('d lnP')>=0,
      dpu: t.indexOf('只有一层钕磁')>=0,
      flux: t.indexOf('459.3')>=0, cap: t.indexOf('721 W')>=0, carnot: t.indexOf('0.9909')>=0,
      gap: t.indexOf('11.1 个数量级')>=0, gx: t.indexOf('0.92 个广西')>=0,
      mc2: t.indexOf('守恒律比')>=0,
      ent: t.indexOf('不存在从这面到那面的信号传递')>=0, noSig: t.indexOf('no-signaling')>=0
    };})()`);
  chk(h.title && h.oldGone, '十二-3 标题已改「负载是输出，不是热源」，旧结论已消失', h);
  chk(h.loadNoHeat, '十二-1 明写「进热节点的只有机内损耗」（负载在外电路）', h.loadNoHeat);
  chk(h.slack, '给出可测判据 d lnΓ/dP_out > d lnP_int/dP_out', h.slack);
  chk(h.dpu, 'DPU 发热归因于单层钕磁（结构差异，非否证 SEG）', h.dpu);
  chk(h.flux && h.cap && h.carnot, '通量表列出 σT⁴=459.3 W/m²、721 W 上限、卡诺 0.9909', h);
  chk(h.gap && h.gx, '缺口写成 11.1 个数量级 / 0.92 个广西（可核的直观尺度）', h);
  chk(h.mc2, '十三-7 写明「守恒律比 E=mc² 更底层」（适用域声明）', h.mc2);
  chk(h.ent && h.noSig, '十三-8 把「超光速传播」改成「根本没有传播」并挂 no-signaling', h);

  /* 多行公式块：.cryfml 原本没有 white-space:pre-wrap，6 个块被折叠成一行。
     这里不查 CSS 字符串，直接量渲染高度 / 行高 —— 折叠了就必然只有 1 行。 */
  /* 十二/十三 住在 v7 视图里，不先切过去 rect 全是 0 ⇒ 会量成「0 行」的假红 */
  await ev(`(function(){ location.hash='#v7'; return true; })()`);
  await sleep(800);

  const fmt = await ev(`(function(){
    var d = document.querySelectorAll('.cryfml'), t = null;
    for (var i=0;i<d.length;i++) if (d[i].textContent.indexOf('d lnΓ')>=0) t = d[i];
    if (!t) return null;
    var cs = getComputedStyle(t), r = t.getBoundingClientRect();
    var lh = parseFloat(cs.lineHeight) || 0;
    var pad = (parseFloat(cs.paddingTop)||0) + (parseFloat(cs.paddingBottom)||0);
    return {ws: cs.whiteSpace, h: Math.round(r.height), lh: Math.round(lh),
            lines: lh ? Math.round((r.height - pad) / lh) : 0,
            noPL: (document.body.textContent||'').indexOf('P_load') < 0};})()`);
  chk(fmt && fmt.ws.indexOf('pre') === 0, '多行公式块 white-space = pre-wrap（不被折叠）', fmt);
  chk(fmt && fmt.lines >= 4, '判据公式块渲染成 ≥4 行（行高 ' + (fmt ? fmt.lh : '?') + 'px）', fmt);
  chk(fmt && fmt.noPL, '全页已无 P_load 残留（热节点只认 P_int）', fmt);

  /* 独立复算：不读页面中间变量，常数自己写 */
  chk(near(FLUX, 459.3, 1e-3), 'σT⁴(300K) 独立复算 = ' + FLUX.toFixed(1) + ' W/m²', FLUX);
  chk(near(FLUX_CAP, 721, 3e-3), '直径 1 m 双面圆盘上限独立复算 = ' + FLUX_CAP.toFixed(1) + ' W', FLUX_CAP);
  chk(near(ETA_C, 0.9909, 1e-3), '卡诺上限独立复算 = ' + ETA_C.toFixed(4) + '（300 K → 2.725 K）', ETA_C);
  /* 页面印的是「11.1」，真实 11.14 —— 比的是「四舍五入到一位后相等」，不是相对 3e-3 */
  chk(Math.abs(Math.round(Math.log10(GAP) * 10) / 10 - 11.1) < 1e-9,
    '缺口量级独立复算 = ' + Math.log10(GAP).toFixed(2) + ' → 印作 11.1 个数量级',
    Math.log10(GAP));
  const A1 = 1e6 / FLUX, A2 = 1e9 / FLUX, A3 = 1e14 / FLUX;
  chk(near(A1 / 2.18e3, 1, 1e-2) && near(A2 / 2.18e6, 1, 1e-2) && near(A3 / 2.18e11, 1, 1e-2),
    '三个面积与页面一致（1 MW→' + A1.toFixed(0) + ' m²｜1 GW→' + A2.toExponential(2) +
    ' m²｜10¹⁴ W→' + A3.toExponential(2) + ' m²）', [A1, A2, A3]);

  // ---------- R10 运行 ----------
  console.log('R10 运行');
  chk(errs.length === 0, '全程 0 JS 异常', errs.slice(0, 3));
  const vis = await ev(`(function(){
    location.hash = '#v7';
    var v = document.getElementById('v7');
    return v ? {h: v.offsetHeight, on: v.className} : null;})()`);
  await sleep(600);
  const vis2 = await ev(`(function(){
    var v = document.getElementById('v7');
    var c = document.querySelectorAll('h3.sec');
    var last = null; for (var i=0;i<c.length;i++) if (c[i].textContent.indexOf('十三、')===0) last = c[i];
    var r = last ? last.closest('.card').getBoundingClientRect() : null;
    return {h: v?v.offsetHeight:0, w: r?Math.round(r.width):0,
            vis: r ? (r.height>100) : false};})()`);
  chk(vis2.h > 500, 'Ⅵ 页可切出且有高度', vis2);
  chk(vis2.vis && vis2.w > 300, '十三节可见、宽度正常（未塌陷）', vis2);

  // ---------- 截图 ----------
  const shot = await ev(`(function(){
    var c = document.querySelectorAll('h3.sec');
    var last=null; for (var i=0;i<c.length;i++) if (c[i].textContent.indexOf('十三、')===0) last=c[i];
    if (last) last.scrollIntoView({block:'start'});
    return true;})()`);
  await sleep(500);
  const img = await send('Page.captureScreenshot', { format: 'jpeg', quality: 82 });
  const f = path.join('C:\\tmp\\kl', 'sec13.jpg');
  fs.writeFileSync(f, Buffer.from(img.result.data, 'base64'));
  console.log('  截图 ' + f + ' (' + fs.statSync(f).size + ' B)');

  console.log('\n\u7ed3\u679c：' + pass + ' 通过 / ' + fail + ' 失败');
  ws.close(); try { child.kill(); } catch (e) { }
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
