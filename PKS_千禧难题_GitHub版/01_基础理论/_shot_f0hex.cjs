/* 定点截图：蛋面钢架（默认档 / 薄壳档 / 两极特写 / 2D 分行图） */
const { spawn } = require('child_process');
const os=require('os'),path=require('path'),fs=require('fs');
const CHROME='C://Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT=9347, DIR=__dirname;
const URL='http://127.0.0.1:8899/01_%E5%9F%BA%E7%A1%80%E7%90%86%E8%AE%BA/AAA_PKS%E4%BB%A3%E7%A0%81%E6%97%8F_3D%E5%8F%82%E6%95%B0%E5%8F%B0.html';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const ud=fs.mkdtempSync(path.join(os.tmpdir(),'shot-'));
  const ch=spawn(CHROME,['--headless=new','--remote-debugging-port='+PORT,'--user-data-dir='+ud,'--no-first-run',
    '--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--window-size=1600,1100','--hide-scrollbars','about:blank'],{stdio:'ignore'});
  for(let i=0;i<40;i++){try{await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();break;}catch(e){await sleep(300);}}
  const list=await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const ws=new WebSocket(list.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
  let id=0;const pend=new Map();
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){pend.get(m.id)(m);pend.delete(m.id);}};
  const send=(m,p={})=>new Promise(res=>{const i=++id;pend.set(i,res);ws.send(JSON.stringify({id:i,method:m,params:p}));});
  const ev=async x=>{const r=await send('Runtime.evaluate',{expression:x,returnByValue:true,awaitPromise:true});
    if(r.result.exceptionDetails)throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0,200));return r.result.result.value;};
  const rect=sel=>ev(`(function(){var e=document.querySelector(${JSON.stringify(sel)});if(!e)return null;
    e.scrollIntoView({block:'center'});var r=e.getBoundingClientRect();
    return {x:Math.round(r.left),y:Math.round(r.top),width:Math.round(r.width),height:Math.round(r.height)};})()`);
  async function showCanvas(){
    await ev(`(function(){var c=document.getElementById('cv3d');
      c.scrollIntoView({block:'center'});return 1;})()`);
    await sleep(700);
  }
  const canvasRect=()=>ev(`(function(){var c=document.getElementById('cv3d');
    var r=c.getBoundingClientRect();
    return {x:Math.round(r.left),y:Math.round(r.top),width:Math.round(r.width),height:Math.round(r.height)};})()`);
  /* ⚠ WebGL 画布不能靠 Page.captureScreenshot（preserveDrawingBuffer=false ⇒ 抓到纯白）。
     必须 render() 之后【同一帧】读 canvas.toDataURL()。 */
  async function shotCanvas(name){
    /* 画布本身是透明底（页面上透出浅色背景）⇒ 先铺一层 #f7f9fc 再导，
       否则透明区在 jpeg 里变成纯黑，看着像"深夜模式"，与老师看到的不是一回事。 */
    const d=await ev(`(function(){renderer.render(scene,camera);
      var cv=document.getElementById('cv3d');
      var c2=document.createElement('canvas');c2.width=cv.width;c2.height=cv.height;
      var g=c2.getContext('2d');g.fillStyle='#f7f9fc';g.fillRect(0,0,c2.width,c2.height);
      g.drawImage(cv,0,0);
      return c2.toDataURL('image/jpeg',0.94);})()`);
    fs.writeFileSync(path.join(DIR,name),Buffer.from(d.split(',')[1],'base64'));
    console.log('  → '+name+' (canvas '+d.length+')');
  }
  async function shotDom(name,clip){
    const r=await send('Page.captureScreenshot',{format:'jpeg',quality:93,
      clip:{x:clip.x,y:clip.y,width:clip.width,height:clip.height,scale:2}});
    fs.writeFileSync(path.join(DIR,name),Buffer.from(r.result.data,'base64'));
    console.log('  → '+name+' (dom '+JSON.stringify(clip)+')');
  }
  const clickPreset=t=>ev(`(function(){var bs=[].slice.call(document.querySelectorAll('#presets button'));
    for(var i=0;i<bs.length;i++)if(bs[i].textContent.indexOf(${JSON.stringify(t)})>=0){bs[i].click();return bs[i].textContent.trim();}
    return '';})()`);
  await send('Page.enable');await send('Runtime.enable');
  await send('Page.navigate',{url:URL});await sleep(5200);
  await ev(`(function(){var p=document.getElementById('fxp');if(p)p.classList.remove('fxp-min');return 1;})()`);
  await sleep(700);

  console.log('[1] 默认钢架 M=26 q=0.80 γ=0.80 无薄壳');
  console.log('  预设：'+await clickPreset('★ 蛋面钢架'));
  await sleep(3000);
  await ev(`(function(){P.cutSkin=1;renderer.render(scene,camera);return 1;})()`);
  await ev(`(function(){var p=document.getElementById('fxp');if(p)p.classList.remove('fxp-min');return 1;})()`);
  await sleep(1200);
  await showCanvas();
  const cr=await canvasRect();
  console.log('  #cv3d='+JSON.stringify(cr));
  await shotCanvas('_hx_1_default.jpg');

  console.log('[2] 戴薄壳');
  console.log('  预设：'+await clickPreset('蛋面钢架 + 薄壳'));
  await sleep(2800);
  await showCanvas();
  await shotCanvas('_hx_2_shell.jpg');

  console.log('[3] 两极特写（正视图 + 拉近）');
  await clickPreset('★ 蛋面钢架');
  await sleep(2600);
  await ev(`(function(){setView('front');camera.position.multiplyScalar(0.62);camera.lookAt(0,0,0);
    renderer.render(scene,camera);return 1;})()`).catch(()=>ev(`(function(){camera.position.multiplyScalar(0.62);camera.lookAt(0,0,0);return 1;})()`));
  await sleep(900);
  await showCanvas();
  await shotCanvas('_hx_3_zoom.jpg');

  console.log('[4] 等弧长对照 q=0（纬线一样疏密）');
  await clickPreset('钢架 · 等弧长对照');
  await sleep(2600);
  await showCanvas();
  await shotCanvas('_hx_4_q0.jpg');

  console.log('[5] 2D 母线分行图');
  /* 2D 剖面也是 canvas：直接 toDataURL，别用 DOM 裁剪（滚动会让 clip 坐标失效） */
  const d2=await ev(`(function(){var cv=document.getElementById('prof');
    if(!cv)return '';return cv.toDataURL('image/png');})()`);
  if(d2){fs.writeFileSync(path.join(DIR,'_hx_5_prof.png'),Buffer.from(d2.split(',')[1],'base64'));
    console.log('  → _hx_5_prof.png ('+d2.length+')');}
  else console.log('  ✗ #prof 不存在');
  const rr=await rect('#readout');
  if(rr&&rr.height>10)await shotDom('_hx_6_read.jpg',rr);

  try{ws.close();}catch(e){} try{ch.kill();}catch(e){}
  process.exit(0);
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
