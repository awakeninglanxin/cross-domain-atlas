/* 探针：koilon 集成仿真台 ⅩⅢ「边界 · 希格斯对照」一节（2026-11-04 新增）
   判据全部读【屏上的字】+【页面现算的读数】，再与【独立复算】比对；
   不拿页面自己的中间变量当结论（除了用来交叉验证的那一份）。
   用法：node _probe_higgs.cjs  （需本地 8899 静态服务，根 = D:/AAA我的文件） */
const { spawn } = require('child_process');
const os = require('os'), path = require('path'), fs = require('fs');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9355;
const URL = process.env.PROBE_URL || 'http://127.0.0.1:8899/02_%E5%BA%94%E7%94%A8%E7%A7%91%E6%8A%80/24_searl_SEG/AAA_koilon%E7%A3%81%E5%B8%86%E4%B8%8ESEG%E9%A3%9E%E8%A1%8C%E5%8E%9F%E7%90%86_%E9%9B%86%E6%88%90%E4%BB%BF%E7%9C%9F%E5%8F%B0.html';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const J = JSON.stringify;
let pass = 0, fail = 0;
function chk(c, label, extra) {
  if (c) { pass++; console.log('  \u2713 ' + label); }
  else { fail++; console.log('  \u2717 ' + label + (extra === undefined ? '' : '  \u2190 ' + extra)); }
}

/* 独立复算（不经过页面代码） */
const HC = 0.1973269804;        // GeV·fm
const L_PL = 1.616255e-35;      // m
const lamOf = (m, v) => (m * m) / (2 * v * v);
const lamCOf = m => (HC / m) * 1e-15;

(async () => {
  const ud = fs.mkdtempSync(path.join(os.tmpdir(), 'koilonhg-'));
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

  /* 🔴 不许拿固定 sleep 当"加载完了"。
     实测（2026-11-04，线上）：首次加载 15.3 s，深链二次加载 **23.6 s**
     （981 KB HTML + three.js，查询串绕过缓存后要重下）。
     原来只等 30 s ⇒ 卡边界；更糟的是返回值被丢掉，超时后**没有任何提示**，
     只表现为后面几条读到空串（「实得「」」「null」）。这次教训：等待结果必须被断言。 */
  const waitReady = async (ms = 90000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      try {
        const ok = await ev(`!!window.__KOILON_STATE && window.__KOILON_STATE().views === 13`);
        if (ok) return true;
      } catch (e) { /* 页面还在解析，忽略 */ }
      await sleep(300);
    }
    return false;
  };

  await send('Page.navigate', { url: URL + '?fresh=1' });
  const ready = await waitReady();
  chk(ready, '页面就绪（__KOILON_STATE 可用且 views=13），30 s 内等到');
  await sleep(800);

  const txt = (sel) => ev(`(function(){var e=document.querySelector(${J(sel)});return e?e.textContent.replace(/[\\s\\u00a0]+/g,' ').trim():'';})()`);
  const num = (t, re) => { const m = String(t).match(re); return m ? parseFloat(m[1]) : NaN; };

  console.log('\n── 一、挂载与导航 ──');
  const ver = await txt('#verTag');
  chk(ver === 'v2.11', '版本号 = v2.11，实得「' + ver + '」');

  const nTab = await ev(`document.querySelectorAll('#tabs button').length`);
  chk(nTab === 13, '页签 13 个（原 12 + 新增 ⅩⅢ），实得 ' + nTab);

  const tabTxt = await txt('#tabs button[data-v="v14"]');
  chk(/ⅩⅢ/.test(tabTxt) && /希格斯/.test(tabTxt), '页签「ⅩⅢ 边界·希格斯」在位，实得「' + tabTxt + '」');

  /* 先点别的页再点回来 —— 只判"点了能到"会掩盖"默认就在这一页"的假绿 */
  await ev(`document.querySelector('#tabs button[data-v="v1"]').click()`); await sleep(400);
  await ev(`document.querySelector('#tabs button[data-v="v14"]').click()`); await sleep(700);
  const activeNow = await ev(`document.querySelector('section.view.active') ? document.querySelector('section.view.active').id : ''`);
  chk(activeNow === 'v14', '点页签后 active = v14，实得「' + activeNow + '」');

  const st = await ev(`window.__KOILON_STATE()`);
  chk(st.views === 13, 'VIEWS 数组 13 项，实得 ' + st.views);
  chk(st.viewsInDom === 13, 'DOM 里 section.view 13 个，实得 ' + st.viewsInDom);
  chk(st.dockCollapsed === true, 'ⅩⅢ 页右侧面板自动收起（NOPARAM 已加 v14），实得 ' + st.dockCollapsed);
  chk(st.dockRows === 0, 'ⅩⅢ 页面板行数 0（这一节的滑杆在页内），实得 ' + st.dockRows);

  console.log('\n── 二、第 4 条「不带色荷」的鉴别力 ──');
  const nA = num(await txt('#hgN'), /(\d+)/);
  const nC = num(await txt('#hgNc'), /(\d+)/);
  const nR = num(await txt('#hgRat'), /([\d.]+)%/);
  chk(nA === 17, '标准模型基本粒子「种」数 = 17，屏上 ' + nA);
  chk(nC === 10, '不带色荷 = 10 种，屏上 ' + nC);
  chk(Math.abs(nC / nA - nR / 100) < 5e-4, '屏上百分比与 10/17 自洽：' + nR + '% vs ' + (nC / nA * 100).toFixed(1) + '%');
  chk(nC / nA > 0.5, '鉴别力判据：不带色荷占比 > 50% ⇒ 这条筛子筛不掉东西（' + (nC / nA * 100).toFixed(1) + '%）');

  console.log('\n── 三、λ 判据：屏上读数 vs 独立复算 ──');
  const H = await ev(`window.__KOILON_HIGGS`);
  chk(!!H, 'window.__KOILON_HIGGS 存在');
  const mH0 = H ? H.mH : NaN, v0 = H ? H.v : NaN;
  chk(Math.abs(mH0 - 125.20) < 1e-9 && Math.abs(v0 - 246.22) < 1e-9,
    '默认参数 m_H=125.20 / v=246.22，实得 ' + mH0 + ' / ' + v0);

  const lamRef = lamOf(125.20, 246.22);
  const lamScreen = num(await txt('#hgLam'), /([\d.]+)/);
  chk(Math.abs(lamScreen - lamRef) / lamRef < 1e-4,
    '屏上 λ = ' + lamScreen + '，独立复算 m_H²/(2v²) = ' + lamRef.toFixed(5) + '（相对差 < 1e-4）');
  chk(Math.abs(lamScreen - 0.12929) < 0.0005, 'λ 落在 0.129 附近（实得 ' + lamScreen + '）');

  const lcRef = lamCOf(125.20);
  const lcScreen = parseFloat((await txt('#hgLamC')).replace(/[^\d.eE+-]/g, ''));
  chk(Math.abs(lcScreen - lcRef) / lcRef < 1e-3,
    '屏上 λ_C = ' + lcScreen.toExponential(4) + ' m，独立复算 ħc/m = ' + lcRef.toExponential(4) + ' m');
  chk(lcRef > 1.5e-18 && lcRef < 1.65e-18, 'λ_C 与题面 1.6×10⁻¹⁸ m 同量级（' + lcRef.toExponential(3) + '）');

  const ratRef = lcRef / L_PL;
  const ratScreen = parseFloat((await txt('#hgRatio')).replace(/[^\d.eE+-]/g, ''));
  chk(Math.abs(ratScreen - ratRef) / ratRef < 1e-3,
    '与普朗克长度之比 屏上 ' + ratScreen.toExponential(3) + ' / 复算 ' + ratRef.toExponential(3));
  chk(Math.abs(1 / ratRef - (125.20 / 1.2209e19)) / (125.20 / 1.2209e19) < 0.01,
    '该比值与 m_H/m_Pl 互为倒数（' + (1 / ratRef).toExponential(3) + ' vs ' + (125.20 / 1.2209e19).toExponential(3) + '）⟹「差10¹⁷倍」只是质量换个单位');

  console.log('\n── 四、拖滑杆：λ 与 λ_C 必须反向联动 ──');
  const setRange = async (sel, val) => ev(`(function(){var e=document.querySelector(${J(sel)});
    e.value=${val}; e.dispatchEvent(new Event('input',{bubbles:true})); return e.value;})()`);
  const before = await ev(`window.__KOILON_HIGGS`);
  await setRange('#hgMH', 130); await sleep(300);
  const after = await ev(`window.__KOILON_HIGGS`);
  chk(after.lambda > before.lambda * 1.05, 'm_H 125.2→130：λ 变大（' + before.lambda.toFixed(5) + ' → ' + after.lambda.toFixed(5) + '）');
  chk(after.lamC < before.lamC * 0.99, 'm_H 125.2→130：λ_C 变小（' + before.lamC.toExponential(3) + ' → ' + after.lamC.toExponential(3) + '）');
  chk(after.pass === true, '页面自检 pass = true（两点差分判方向）');
  const mHShow = num(await txt('#hgMHv'), /([\d.]+)/);
  chk(Math.abs(mHShow - 130) < 1e-6, '屏上 m_H 读数跟着滑杆走：' + mHShow);

  const chkTxt = await txt('#hgChkTxt');
  chk(/方向相反/.test(chkTxt) && /✔/.test(chkTxt), '自检行屏上写「方向相反 ✔」，实得「' + chkTxt.slice(0, 90) + '…」');

  /* 改 v 也要动 λ：只改 m_H 能动，可能只是把 m_H 直接乘进去了 */
  await setRange('#hgMH', 125.20); await setRange('#hgV', 254); await sleep(300);
  const afterV = await ev(`window.__KOILON_HIGGS`);
  chk(afterV.lambda < lamRef * 0.95, 'v 246.22→254：λ 变小（' + afterV.lambda.toFixed(5) + '），v 确实进分母');

  console.log('\n── 五、屏上的话（判据必须读整句） ──');
  const body = (await txt('#v14')).replace(/\s+/g, '');
  chk(/约化康普顿波长/.test(body), '写明「约化康普顿波长」');
  chk(/不是半径/.test(body), '写明「不是半径」');
  chk(/顶夸克/.test(body) && /电子/.test(body), '给了那对反证（顶夸克比质子小 / 电子比质子大）');
  chk(/范畴错误/.test(body), '「自旋 0」判为范畴错误');
  chk(/恒真式判据/.test(body), '「不带色荷」判为恒真式判据');
  chk(/定义本身堵死/.test(body), '写明「不能传播激发」是定义本身堵死');
  chk(/什么都连/.test(body) && /什么都不连/.test(body), '写明方向相反（什么都连 vs 什么都不连）');
  chk(/最省事/.test(body), 'λ 那条标了「最省事」');
  chk(/不是本页的预言/.test(body), '第五节写明 λ≈0.129 是实测值、不是本页预言');
  chk(/没有出现过「?希格斯」?/.test(body.replace(/"/g, '')),
    '第五节写明「这一节之前全页没有希格斯」');
  chk(/同一句话换了单位/.test(body), '写明「差 10¹⁷ 倍」是同一句话换单位');

  console.log('\n── 六、溯源注记（本式不是本项目产物） ──');
  /* 这一节的立身之本：λ = m_H²/(2v²) 的出处只能是标准模型。
     🔴 判据只查「溯源」「出处」这种泛词 ⇒ 恒真式。必须查能被删掉的实质句。 */
  chk(/五、这个式子的出处（溯源·必读）/.test(body), 'ⅩⅢ 有五「这个式子的出处（溯源·必读）」一节');
  chk(/不是本项目任何一个模型的产物/.test(body), '写明「不是本项目任何一个模型的产物」');
  chk(/在标准模型里本来就是自由参数/.test(body), '写明「λ 在标准模型里本来就是自由参数」');
  chk(/是它的定义式/.test(body) && /不是对它的推导/.test(body), '写明「是定义式，不是推导」（防有人把注记写成自夸）');
  /* 🔴 6254 在 v14 里出现两处（表格口径 / 盲区注记）。只查 /6254个文件/ 时，
     改掉表格那处仍会被注记那处命中 ⇒ 假绿（变异 M4 实测没翻红）。拆成两条各卡一处。 */
  chk(/扫过6254个文件/.test(body), '给出检索口径：扫过 6254 个文件');
  chk(/可文本检索的6254个文件里/.test(body), '盲区注记里同一口径也写 6254（两处同源，改一处必翻红）');
  chk(/本节之外：0处/.test(body), '写明「本节之外：0 处」');
  chk(/只覆盖可文本检索的文件/.test(body), '披露盲区①：只覆盖可文本检索的文件');
  chk(/png2295/.test(body) && /pdf193/.test(body), '披露盲区②：列出 png 2295 / pdf 193 抓不到');
  chk(/证的是「字面式」没在别处出现/.test(body), '披露盲区③：只证字面式、不证结构');
  chk(/黄金比/.test(body) && /6\.854/.test(body), '黄金蛋里的 φ⁴ 判为黄金比四次幂（6.854），不是四次自耦合');
  chk(/374个不同小数/.test(body), '真理表实测口径：全页 374 个不同小数');

  /* 独立复算三条，全部不与页面共享代码 */
  const LADDER = [1, 2, 3, 4, 5].map(n => 1 / (2 * n * n));
  const l5 = LADDER.map(x => x.toPrecision(4));
  chk(l5.join(',') === '0.5000,0.1250,0.05556,0.03125,0.02000',
    'λ 阶梯独立复算 = ' + l5.join(' / '));
  chk(/0\.05556/.test(body) && /0\.03125/.test(body), '页面阶梯表与独立复算同值（0.05556 / 0.03125）');
  const gapPct = (1 - 0.125 / lamRef) * 100;
  chk(Math.abs(gapPct - 3.31) < 0.02,
    '最近台阶差 = ' + gapPct.toFixed(2) + '%（相对目标值口径，页面写 3.31%）');
  const mH18 = 246.22 / 2, sig = (125.25 - mH18) / 0.11;
  chk(Math.abs(mH18 - 123.11) < 0.005 && Math.abs(sig - 19) < 1,
    '若 λ=1/8 ⇒ m_H = v/2 = ' + mH18.toFixed(2) + ' GeV，比实测低 ' + (125.25 - mH18).toFixed(2) + ' GeV = ' + sig.toFixed(1) + 'σ');
  chk(/19σ/.test(body) && /被排除/.test(body), '页面写明这是「被排除」而不是「差不多」');

  console.log('\n── 七、深链与异常 ──');
  /* 🔴 必须换掉查询串：只改 hash 的 navigate 是「同文档片段导航」，页面不会重载，
     滑杆会留着上一步设的 v=254 ⇒ 读到 0.12148 而不是默认值（2026-11-04 踩过）。 */
  await send('Page.navigate', { url: URL + '?fresh=1&r=' + Date.now() + '#v14' });
  const ready2 = await waitReady();
  /* 🔴 这条不许省：不等就绪就往下读，读到的是空串 ⇒ 看着像页面坏了，其实是探针太快 */
  chk(ready2, '深链重新加载就绪（线上实测 23.6 s，上限 90 s）');
  await sleep(800);
  const deep = await ev(`document.querySelector('section.view.active') ? document.querySelector('section.view.active').id : ''`);
  chk(deep === 'v14', '带 #v14 直接打开就落在这一节，实得「' + deep + '」');
  const deepH = await ev(`window.__KOILON_HIGGS ? window.__KOILON_HIGGS.lambda : null`);
  chk(deepH !== null && Math.abs(deepH - lamRef) / lamRef < 1e-4, '深链打开后 λ 仍是默认值 ' + (deepH === null ? 'null' : deepH.toFixed(5)));

  chk(errs.length === 0, '0 条 JS 异常', errs.slice(0, 2).join(' | '));

  console.log('\n结果：' + pass + ' 通过 / ' + fail + ' 失败');
  ws.close(); child.kill();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('FAIL ' + e.message); process.exit(2); });
