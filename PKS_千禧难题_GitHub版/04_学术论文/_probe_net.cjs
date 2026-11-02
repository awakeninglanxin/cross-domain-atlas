'use strict';
/*
 * _probe_net.cjs —— 验「扩网」这一轮：+20 节点 / +88 边。
 *
 * 重点不是「加进去了没有」，是「加进去之后有没有断」：
 *  ① 页面会用 byId 过滤掉不认识的边（静默）。所以 E.length 必须 == DATA.edges.length。
 *  ② 新节点不能是孤岛：每个至少 3 条边，否则挂上去等于没挂。
 *  ③ 每条边都要有理由 —— 这是这张图的立身之本（500 条连线，每条都写了为什么）。
 */
const path = require('path');
const fs = require('fs');
const cdp = require('../02_应用科技/construct-cost/cdp.cjs');

const FILE = path.resolve(__dirname, 'AAA_数学物理跨界关联.html');
const URL = 'file:///' + FILE.split(path.sep).join('/').split('/').map(encodeURIComponent).join('/').replace('D%3A', 'D:');
const OUT = __dirname;

const NEW_IDS = ['lyapunov', 'response', 'cavity', 'participation', 'sr', 'kramers', 'psd',
  'kalman', 'sysid', 'cs', 'adjoint', 'noether', 'integrable', 'rg', 'bifurcation',
  'fpt', 'comm', 'ricci', 'hypergraph', 'specgraph'];

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
    await cdp.sleep(600);

    /* ---- 1. 规模：DATA 与渲染层一致 ---- */
    const size = await b.evalJs(`[DATA.nodes.length, DATA.edges.length, N.length, E.length,
      document.getElementById('sn').textContent, document.getElementById('se').textContent,
      document.getElementById('sc').textContent].join('|')`);
    const [dn, de, nn, ee, sn, se, sc] = String(size).split('|');
    chk(dn === '195', 'DATA.nodes 是 195（175 + 新增 20）', dn);
    chk(nn === dn, '渲染层节点数 == DATA 节点数（没有解析漏掉）', nn + ' vs ' + dn);
    chk(ee === de, '过滤后边数 == DATA 边数 ⇒ 0 条悬空边（静默丢边的假绿）', ee + ' vs ' + de);
    chk(de === '588', 'DATA.edges 是 588（500 + 新增 88）', de);
    chk(sn === nn && se === ee, '屏幕上「节点／连线」两个数就是这两个（现算，不是写死）',
      sn + '/' + se);
    /* 面包屑只在「什么都没选中」时显示总数；点开节点后它本来就会变成节点标题。
       所以这一条必须读在点击之前 —— 第一版读在点击之后，是判据位置错（假红）。 */
    const crumb0 = await b.evalJs("(document.getElementById('crumb').innerText||'').replace(/\\s+/g,' ')");
    chk(/195/.test(crumb0) && /588/.test(crumb0), '面包屑写 195 件工具 · 588 条连线（点开前）', crumb0);

    /* ---- 2. 每条边都有理由 ---- */
    const noR = await b.evalJs(`(function(){
      var bad=DATA.edges.filter(function(e){return !e.r || e.r.length<8;});
      return bad.length+'|'+(bad[0]||{}).s;})()`);
    chk(String(noR).split('|')[0] === '0', '每条边都写了理由（长度 ≥ 8 字符）', String(noR));

    /* ---- 3. 新节点都在、且不是孤岛 ---- */
    const nn2 = await b.evalJs(`(function(){
      var ids=${JSON.stringify(NEW_IDS)};
      var miss=[], low=[];
      ids.forEach(function(id){
        var n=byId[id];
        if(!n){ miss.push(id); return; }
        if(n.deg<3) low.push(id+':'+n.deg);
      });
      var iso=N.filter(function(n){return n.deg===0;}).map(function(n){return n.id;});
      return [miss.length+'|'+miss.join(','), low.length+'|'+low.join(','), iso.length+'|'+iso.join(',')].join(';');})()`);
    const seg = String(nn2).split(';');
    chk(seg[0].startsWith('0|'), '20 个新 id 全在渲染层（没有拼错的 id）', seg[0]);
    chk(seg[1].startsWith('0|'), '每个新节点至少 3 条边（不是挂上去就完事）', seg[1]);
    chk(seg[2].startsWith('0|'), '全图 0 个孤立节点', seg[2]);

    /* ---- 4. 新节点的「段位」：不是随便连的 ---- */
    const deg = await b.evalJs(`(function(){
      var o={}; ['lyapunov','cavity','response','rg','kalman','cs'].forEach(function(id){
        o[id]=byId[id].deg;}); return JSON.stringify(o);})()`);
    const D = JSON.parse(deg);
    chk(D.lyapunov >= 6, 'Lyapunov 谱的度数 ≥ 6（它不是叶子）', D.lyapunov);
    chk(D.cavity >= 5 && D.response >= 5, '空腔法／线性响应 度数 ≥ 5', D.cavity + '/' + D.response);

    /* ---- 5. 搜索能找到、点开有正文、说的是那句关键话 ---- */
    await b.evalJs(`(function(){var q=document.getElementById('q'); q.value='Lyapunov';
      q.dispatchEvent(new Event('input'));})()`);
    await cdp.sleep(250);
    const hitTxt = await b.evalJs(`(function(){
      var h=document.querySelectorAll('#hits .hit');
      return h.length+'|'+(h[0]?h[0].textContent.replace(/\\s+/g,' '):'');})()`);
    chk(parseInt(hitTxt, 10) >= 1, '左栏搜「Lyapunov」有命中', hitTxt);
    await b.evalJs("document.querySelector('#hits .hit').click()");
    await cdp.sleep(400);
    const panel = await b.evalJs("(document.getElementById('panel').innerText||'').replace(/[ \\t]+/g,' ')");
    chk(panel.includes('微分同胚不变量'), '右面板正文写着「微分同胚不变量」（这条的分量所在）', panel.includes('乘性遍历定理'));
    chk(panel.includes('乘性遍历定理'), '右面板标题是「Lyapunov 谱与乘性遍历定理」', panel.slice(0, 40));
    chk(panel.includes('Oseledets'), '右面板带年代 1968 Oseledets', 'ok');
    chk(panel.includes('广延'), '右面板提到「广延」（Clark 2026 的副产品）', 'ok');

    /* ---- 6. 标题里的数跟数据一致 ---- */
    const ttl = await b.evalJs('document.title');
    chk(ttl.includes('195'), '<title> 里是 195 件工具', ttl);

    /* ---- 7. 新加的说明卡在、并且展开后有那四类原因 ---- */
    const det = await b.evalJs(`(function(){
      var d=document.getElementById('whyNew'); if(!d) return 'MISSING';
      d.open=true;
      return (d.innerText||'').replace(/\\s+/g,' ');})()`);
    chk(String(det).includes('为什么之前不在图上'), '左栏有「为什么之前不在图上」说明卡', 'ok');
    for (const k of ['跨分支的算子技术', '工程天天用', '噪声', '不变量怎么算出来']) {
      chk(String(det).includes(k), '四类原因之一在屏上：' + k, 'ok');
    }
    chk(String(det).includes('三条判据'), '写了选这 20 件的三条判据', 'ok');
    await cdp.sleep(200);
    const why = await b.evalJs(`(function(){
      var d=document.getElementById('whyNew'); var r=d.getBoundingClientRect();
      return [r.left+window.scrollX, r.top+window.scrollY, r.width, r.height].join('|');})()`);

    /* ---- 8. 脏字面 ---- */
    const dirty = await b.evalJs(`(function(){
      var t=document.body.innerText||'';
      return [(t.match(/NaN/g)||[]).length,(t.match(/undefined/g)||[]).length,
              (t.match(/\\*\\*/g)||[]).length].join('|');})()`);
    chk(String(dirty) === '0|0|0', '没有 NaN / undefined / 残留星号', String(dirty));

    /* ---- 9. 不回归：书单弹层还能开 ---- */
    await b.evalJs("document.getElementById('bkBtn').click()");
    await cdp.sleep(300);
    const bk = await b.evalJs(`(function(){
      var o=document.getElementById('bkOv');
      if(!o||getComputedStyle(o).display!=='flex') return 'CLOSED';
      var s=(document.getElementById('bkStat').innerText||'').replace(/\\s+/g,'');
      return 'OPEN|'+(s.indexOf('主表50条')>=0);})()`);
    chk(String(bk).startsWith('OPEN'), '书单弹层仍能打开（扩网没有打断它）', bk);
    chk(String(bk).includes('true'), '书单统计条仍在算（主表 50 条）', 'ok');
    await b.evalJs("document.getElementById('bkX').click()");
    await cdp.sleep(200);

    /* ---- 10. 截图 ---- */
    async function shot(file) {
      const s2 = await b.send('Page.captureScreenshot', { format: 'jpeg', quality: 92 });
      const buf = Buffer.from(s2.result.data, 'base64');
      fs.writeFileSync(path.join(OUT, file), buf);
      return { f: file, kb: Math.round(buf.length / 1024) };
    }
    /* 先把视图重置，确保是新全图 */
    await b.evalJs("document.getElementById('bFit').click()");
    await cdp.sleep(700);
    const sh1 = await shot('net_full.jpg');

    /* 左栏说明卡展开态：展开 → 滚进视口 → 重新取 rect（原来用的是展开前、且未滚动的
       rect，截出来 2 KB 空白 —— 滚动容器里的元素必须先 scrollIntoView 再量） */
    await b.evalJs("document.getElementById('whyNew').open=true");
    await b.evalJs("document.getElementById('whyNew').scrollIntoView({block:'center'})");
    await cdp.sleep(400);
    const why2 = await b.evalJs(`(function(){
      var d=document.getElementById('whyNew'); var r=d.getBoundingClientRect();
      return [r.left+window.scrollX, r.top+window.scrollY, r.width, r.height].join('|');})()`);
    const r2 = String(why2).split('|').map(Number);
    chk(r2[2] > 200 && r2[3] > 120, '说明卡展开后确实占了版面（宽 > 200、高 > 120）',
      r2[2] + '×' + r2[3]);
    const s2 = await b.send('Page.captureScreenshot', {
      format: 'jpeg', quality: 92, captureBeyondViewport: true,
      clip: { x: Math.max(0, r2[0] - 10), y: Math.max(0, r2[1] - 10), width: r2[2] + 20, height: r2[3] + 20, scale: 1 },
    });
    const b2 = Buffer.from(s2.result.data, 'base64');
    fs.writeFileSync(path.join(OUT, 'net_why.jpg'), b2);
    const sh2 = { f: 'net_why.jpg', kb: Math.round(b2.length / 1024) };

    /* 点开 Lyapunov 后的右面板 */
    await b.evalJs(`(function(){var q=document.getElementById('q'); q.value='Lyapunov';
      q.dispatchEvent(new Event('input'));})()`);
    await cdp.sleep(300);
    await b.evalJs("document.querySelector('#hits .hit').click()");
    await cdp.sleep(600);
    const r3 = await b.evalJs(`(function(){var r=document.getElementById('right').getBoundingClientRect();
      return [r.left+window.scrollX, r.top+window.scrollY, r.width, r.height].join('|');})()`);
    const p3 = String(r3).split('|').map(Number);
    const s3 = await b.send('Page.captureScreenshot', {
      format: 'jpeg', quality: 92, captureBeyondViewport: true,
      clip: { x: Math.max(0, p3[0]), y: Math.max(0, p3[1]), width: p3[2], height: p3[3], scale: 1 },
    });
    const b3 = Buffer.from(s3.result.data, 'base64');
    fs.writeFileSync(path.join(OUT, 'net_lyap.jpg'), b3);
    const sh3 = { f: 'net_lyap.jpg', kb: Math.round(b3.length / 1024) };

    console.log(rows.join('\n'));
    console.log('\n截图：' + [sh1, sh2, sh3].map((x) => x.f + ' ' + x.kb + 'KB').join(' | '));
    console.log('\nPASS ' + pass + ' / FAIL ' + fail);
    fs.writeFileSync(path.join(OUT, '_probe_net.json'),
      JSON.stringify({ pass, fail, total: pass + fail, size: String(size), newdeg: nn2, shots: [sh1, sh2, sh3] }, null, 1));
  } catch (e) {
    console.log(rows.join('\n'));
    console.log('\n🔴 探针自身异常：' + e.message);
    console.log('PASS ' + pass + ' / FAIL ' + fail);
    process.exitCode = 2;
  } finally {
    b.close();
  }
})();
