'use strict';
/*
 * _probe_books.cjs —— 验「数学工具书推荐名单」这一层。
 *
 * 纪律：
 *  ① 判据读屏上的字，不读变量；条数一律现算，不写死结构数。
 *  ② 覆盖率必须与页面自己算的一致 —— 页面算的和我算的差一个就 FAIL。
 *  ③ 只杀自己起的 PID（cdp.cjs 已封装）。
 */
const path = require('path');
const fs = require('fs');
const cdp = require('../02_应用科技/construct-cost/cdp.cjs');

const FILE = path.resolve(__dirname, 'AAA_数学物理跨界关联.html');
const URL = 'file:///' + FILE.split(path.sep).join('/').split('/').map(encodeURIComponent).join('/').replace('D%3A', 'D:');
const OUT = __dirname;

let pass = 0, fail = 0;
const rows = [];
function chk(ok, label, got) {
  if (ok) { pass++; rows.push('  ✓ ' + label + (got !== undefined ? '  [' + got + ']' : '')); }
  else { fail++; rows.push('  ✗ ' + label + '  [' + (got === undefined ? '' : got) + ']'); }
}

(async () => {
  const b = await cdp.open({ w: 1440, h: 900 });
  try {
    await b.navigate(URL);
    await cdp.sleep(500);

    /* ---- 0. 页面本身还活着（不是白屏） ---- */
    const alive = await b.evalJs('document.querySelectorAll("#cv").length + "|" + document.body.textContent.length');
    const [cvN, txtLen] = String(alive).split('|').map(Number);
    chk(cvN === 1 && txtLen > 5000, '页面正常加载（画布在、文本量够）', cvN + ' / ' + txtLen);
    chk(txtLen > 0, '不是白屏：body 文本非空', txtLen);

    /* ---- 1. 左栏入口 ---- */
    const btn = await b.evalJs(`(function(){var e=document.getElementById('bkBtn');
      return e? (e.innerText||'').replace(/\\s+/g,' ').trim() : 'MISSING';})()`);
    chk(/数学工具书\s*50\s*本/.test(btn), '左栏有入口卡，写着「数学工具书 50 本」', btn);
    chk(btn.includes('2026-11-02'), '入口卡带推荐日期 2026-11-02', btn);

    /* ---- 2. 点开 ---- */
    await b.evalJs("document.getElementById('bkBtn').click()");
    await cdp.sleep(300);
    const shown = await b.evalJs("getComputedStyle(document.getElementById('bkOv')).display");
    chk(shown === 'flex', '点一下能打开弹层（display:flex）', shown);

    /* ---- 3. 统计条：全部读屏上文字 ---- */
    const stat = await b.evalJs("(document.getElementById('bkStat').innerText||'').replace(/\\s+/g,' ')");
    chk(/主表\s*50\s*条/.test(stat), '统计条写着主表 50 条', stat.slice(0, 60));
    chk(/48\s*本不同的书/.test(stat), '统计条算出 48 本不同的书（50 − 重复1 − 非书1）',
      (stat.match(/(\d+)\s*本不同的书/) || [])[0]);
    chk(stat.includes('节点名全部命中'), '节点名自校验通过（没有「对不上」）', stat.slice(-30));
    chk(!/对不上|⚠/.test(stat), '统计条里没有未命中的节点名', 'clean');

    /* ---- 3b. 口径等式：48 = 图外 + 全域 + 映射，三项必须自洽 ---- */
    /* 🔴 这段在模板字符串里，正则的反斜杠必须写两个：\d 会被吃掉变成 d，
       那样正则永远匹配不到，断言就变成「恒假」而不是「真判据」。 */
    const eq = await b.evalJs(`(function(){
      var t=document.getElementById('bkStat').innerText.replace(/\\s+/g,'');
      var m=t.match(/口径：(\\d+)本不同的书=图外(\\d+)\\+全域(\\d+)\\+映射到具体节点(\\d+)/);
      if(!m) return 'NO'; return [m[1],m[2],m[3],m[4],(Number(m[2])+Number(m[3])+Number(m[4])===Number(m[1]))].join('|');})()`);
    const eqp = String(eq).split('|');
    chk(eq !== 'NO', '统计条有口径等式（48 本怎么拆开的）', eq);
    chk(eqp[4] === 'true', '口径等式三项相加 = 总本数（现算，不是摆设）', eqp[1] + '+' + eqp[2] + '+' + eqp[3] + '=' + eqp[0]);

    /* ---- 4. 页面自己算的覆盖率 = 我独立算的 ---- */
    const pageCov = await b.evalJs(`(function(){
      var m=document.getElementById('bkStat').innerText.match(/主表覆盖\\s*(\\d+)\\s*／\\s*(\\d+)/);
      return m? m[1]+'/'+m[2] : 'NONE';})()`);
    const myCov = await b.evalJs(`(function(){
      var B=window.__BK_BOOKS__||null; if(!B) return 'NO_DATA';
      var names={}; (DATA.nodes||[]).forEach(function(n){names[n.name]=1;});
      var s={}; B.forEach(function(x){
        if(!x.nodes||!x.nodes.length||x.nodes[0]==='*') return;
        x.nodes.forEach(function(k){ if(names[k]) s[k]=1; });
      });
      return Object.keys(s).length+'/'+(DATA.nodes||[]).length;})()`);
    chk(pageCov === myCov, '页面算的覆盖率与我独立复算的相等（不是手写数）', pageCov + ' vs ' + myCov);

    /* ---- 5. 表格结构：行数现算，不写死 ---- */
    const cnt = await b.evalJs(`(function(){
      var t1=0; for(var i=1;i<=6;i++){var tb=document.getElementById('bkT'+i); if(tb) t1+=tb.querySelectorAll('tbody tr').length;}
      var t2=document.getElementById('bkAlt');
      return t1+'|'+(t2?t2.querySelectorAll('tbody tr').length:0);})()`);
    const [n1, n2] = String(cnt).split('|').map(Number);
    chk(n1 === 50, '主表六组加起来正好 50 行（现算）', n1);
    chk(n2 === 12, '另册 12 行', n2);

    /* ---- 6. 标签：图外 / 重复 / 非书 ---- */
    const tags = await b.evalJs(`(function(){
      var o=document.getElementById('bkOv');
      function c(cls){return o.querySelectorAll('.bk-tag.'+cls).length;}
      return [c('out'),c('dup'),c('nb'),c('all')].join('|');})()`);
    const [tOut, tDup, tNb, tAll] = String(tags).split('|').map(Number);
    chk(tOut > 0 && tOut < 12, '「图外」标签有，且不是一大片（管的是解题术/史）', tOut);
    chk(tDup === 1, '只有一条「= 第 21 本」（重复项只标一次）', tDup);
    chk(tNb === 1, '只有一条「非书」（arXiv/AMS Notices）', tNb);

    /* ---- 7. 六组标题与另册、缺口、用法、判断都在屏上 ---- */
    const hs = await b.evalJs(`(function(){
      var o=document.getElementById('bkOv');
      return Array.prototype.map.call(o.querySelectorAll('.bk-doc h3'),function(h){
        return (h.innerText||'').replace(/\\s+/g,' ').trim();}).join(' || ');})()`);
    for (const k of ['证明与逻辑基本功', '数论与代数', '组合、图论与离散', '分析、概率与计算',
      '解题、竞赛与前沿视野', '几何、拓扑与前沿交叉', '另册', '三个结构性缺口', '我实际怎么用', '补的是「人」']) {
      chk(String(hs).includes(k), '章节在屏上：' + k, 'ok');
    }

    /* ---- 8. 缺口三那段是算出来的数，不是写死 ---- */
    const g3 = await b.evalJs("(document.getElementById('bkGap3').innerText||'').replace(/\\s+/g,' ')");
    chk(/50\s*条/.test(g3) && /48\s*本/.test(g3), '缺口三把「50 条→48 本」写清了（现算）', g3.slice(0, 70));
    chk(g3.includes('第 28 条') && g3.includes('第 50 条'), '缺口三点名了重复那条与非书那条', 'ok');

    /* ---- 9. 脏字面 ---- */
    const dirty = await b.evalJs(`(function(){
      var t=document.getElementById('bkOv').innerText||'';
      return [ (t.match(/NaN/g)||[]).length, (t.match(/undefined/g)||[]).length,
               (t.match(/\\*\\*/g)||[]).length, (t.match(/\\{\\{|\\}\\}/g)||[]).length ].join('|');})()`);
    const [dNaN, dUnd, dStar, dBrace] = String(dirty).split('|').map(Number);
    chk(dNaN === 0 && dUnd === 0 && dStar === 0 && dBrace === 0,
      '无 NaN / undefined / 残留星号 / 花括号', `${dNaN}|${dUnd}|${dStar}|${dBrace}`);

    /* ---- 10. 搜索能过滤（读屏上可见行数） ---- */
    await b.evalJs(`(function(){var q=document.getElementById('bkQ'); q.value='张量'; 
      q.dispatchEvent(new Event('input'));})()`);
    await cdp.sleep(200);
    const vis = await b.evalJs(`(function(){
      var o=document.getElementById('bkOv'), n=0;
      o.querySelectorAll('.bk-t tbody tr').forEach(function(r){ if(!r.classList.contains('hide')) n++; });
      return n;})()`);
    chk(vis > 0 && vis < n1, '搜「张量」后可见行数减少（过滤生效）', vis + ' < ' + n1);
    await b.evalJs(`(function(){var q=document.getElementById('bkQ'); q.value='';
      q.dispatchEvent(new Event('input'));})()`);
    await cdp.sleep(150);
    const vis2 = await b.evalJs(`(function(){
      var o=document.getElementById('bkOv'), n=0;
      o.querySelectorAll('.bk-t tbody tr').forEach(function(r){ if(!r.classList.contains('hide')) n++; });
      return n;})()`);
    chk(vis2 === n1 + n2, '清空搜索后所有行回来（= 主表行 + 另册行，现算）', vis2 + ' vs ' + (n1 + n2));

    /* ---- 11. 排版：不横向溢出、行高不被压扁 ---- */
    const lay = await b.evalJs(`(function(){
      var d=document.querySelector('#bkOv .bk-doc');
      var tw=document.querySelector('#bkOv .bk-tw');
      var r=document.getElementById('bkOv').getBoundingClientRect();
      return [Math.round(d.scrollWidth-d.clientWidth), Math.round(tw.scrollWidth-tw.clientWidth),
              Math.round(r.width), Math.round(r.height)].join('|');})()`);
    const [ovDoc, ovTw, w, h] = String(lay).split('|').map(Number);
    chk(ovDoc <= 1, '正文没有横向溢出（超出就说明表格挤爆了）', ovDoc);
    /* 🔴 原判据 ovTw<=1 || ovTw>0 是恒真式（除恰好等于 1），等于没判 */
    chk(ovTw <= 1, '宽屏下表格装得下、没有横向溢出（min-width 820 < 可用 1132）', ovTw);
    chk(w > 900 && h > 500, '弹层占位合理', w + '×' + h);

    /* ---- 12. 截图：顶部一组 + 另册段 ---- */
    async function shotView(file) {
      const s2 = await b.send('Page.captureScreenshot', { format: 'jpeg', quality: 92 });
      const buf = Buffer.from(s2.result.data, 'base64');
      fs.writeFileSync(path.join(OUT, file), buf);
      return { f: file, kb: Math.round(buf.length / 1024) };
    }
    await b.evalJs("document.querySelector('#bkOv .bk-body').scrollTop=0");
    await cdp.sleep(250);
    const sh1 = await shotView('bk_top.jpg');
    await b.evalJs("document.querySelector('#bkg7').scrollIntoView({block:'start'})");
    await cdp.sleep(350);
    const sh2 = await shotView('bk_alt.jpg');
    await b.evalJs("document.querySelector('#bkg8').scrollIntoView({block:'start'})");
    await cdp.sleep(350);
    const sh3 = await shotView('bk_gap.jpg');

    console.log(rows.join('\n'));
    console.log('\n截图：' + [sh1, sh2, sh3].map((s) => s.f + ' ' + s.kb + 'KB ' + s.w + '×' + s.h).join(' | '));
    console.log('\nPASS ' + pass + ' / FAIL ' + fail);
    fs.writeFileSync(path.join(OUT, '_probe_books.json'),
      JSON.stringify({ pass, fail, total: pass + fail, stat, pageCov, myCov, n1, n2, shots: [sh1, sh2, sh3] }, null, 1));
  } catch (e) {
    console.log(rows.join('\n'));
    console.log('\n🔴 探针自身异常：' + e.message);
    console.log('PASS ' + pass + ' / FAIL ' + fail);
    process.exitCode = 2;
  } finally {
    b.close();
  }
})();
