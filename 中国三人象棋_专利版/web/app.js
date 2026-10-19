/* 专利版观战台交互 */
(function () {
  const $ = id => document.getElementById(id);
  const ARMY = { 1: '魏', 2: '吴', 3: '蜀' };
  const AC = ['', '#2b6cb0', '#2f855a', '#c53030'];     // 1魏蓝 2吴绿 3蜀红
  const URL2API = [
    ['api.deepseek.com', 'DeepSeek 官方'],
    ['ark.cn-beijing.volces.com', '火山方舟（豆包）'],
    ['open.bigmodel.cn', '智谱'],
    ['integrate.api.nvidia.com', 'NVIDIA NIM'],
    ['openrouter.ai', 'OpenRouter'],
    ['agnes', 'Agnes AI'],
    ['siliconflow', 'SiliconFlow'],
  ];
  let sel = null, state = null, legalByFrom = {};
  // 「每方主控」下拉：记上一次的**选项签名**，只有选项集变了才重建 DOM
  //   （/api/state 每 ~800ms 一帧，无条件重建会把正在展开的下拉打断）
  let seatSig = '';
  // 续局提示只在首屏说一次（老师 2026-10-01「重启后继续之前的棋局」）：
  //   后端每帧都带 restored=true，若每帧都往提示条塞，会一直占着位置。
  //   刷新页面 ⇒ 这个变量重置 ⇒ 又提示一次，正好。
  let resumeShown = false;
  // 秒级时间戳 → "MM-DD HH:MM"（提示条里显示存档时间）
  function fmtTime(sec) {
    const d = new Date((+sec || 0) * 1000);
    const p = n => String(n).padStart(2, '0');
    return `${p(d.getMonth() + 1)}-${p(d.getDate())} `
      + `${p(d.getHours())}:${p(d.getMinutes())}`;
  }
  // ---- 回看（**只读**，≠ 悔棋）----
  //   backOffset: 0 = 正在看最新局面；N = 相对最新往回退了 N 手
  //   viewSnap  : 已从 /api/replay 取回的历史局面（回看中用它画棋盘与"上一步"高亮）
  //   老师 2026-09-24 夜：「点击一次回退一个，可以一直的往前回退，
  //   弄个按钮继续下，这样我就知道 bot 走哪里了」
  //   ⚠️ 回看**绝不**调用 /api/move、/api/undo —— 盘面原样保留，只换"画什么"。
  let backOffset = 0, viewSnap = null;
  // 本地操作反馈（选中 / 落子 / 被拒）：显示在顶部提示条最前面，4 秒后自动消失。
  //   加它的原因：老师反复遇到「点了没反应」，分不清是"没点中"、"回合不对"还是"服务器拒绝"。
  let myMsg = ''; let myMsgTimer = null;
  function setMsg(t) {
    myMsg = t || '';
    if (myMsgTimer) clearTimeout(myMsgTimer);
    if (myMsg) myMsgTimer = setTimeout(() => { myMsg = ''; poll(); }, 4000);
  }
  const NAME = { 1: '魏', 2: '吴', 3: '蜀' };
  // 引擎里的棋子 kind 是英文；战报/提示条里用**简体中文**（贴近老师读规则文档的习惯）。
  //   注意与 board.js 的 KINDS 区分：那边是棋盘上画的**繁体**「車馬帥炮」，
  //   这里是文字叙述用的简体，二者故意不同。
  const KIND_CN = { general: '帅', advisor: '士', elephant: '象',
                    horse: '马', rook: '车', cannon: '炮', pawn: '兵' };
  // 引擎点位编号 → 棋盘上的点位标签（如 156 → A4），用于给人看的反馈文案
  function posLabel(p) {
    try { return window.ChessBoard.label(p); } catch (e) { return p; }
  }

  function apiName(a) {
    const u = (a.url || '').toLowerCase();
    for (const kv of URL2API) if (u.includes(kv[0])) return kv[1];
    if (a.local) return '本地';
    try { return new URL(a.url).host; } catch (e) { return '—'; }
  }
  const apiModelText = a => a.local
    ? '本地启发式（不调用大模型）'
    : `${apiName(a)} · ${a.model || a.label || '—'}`;

  // ---- 从 legal 里取某起点的全部落点 ----
  // ⚠️ 2026-09-24 修（老师报「点亮棋子后点落点，棋子不动」的**真正主因**）：
  //   `/api/state` 的 `legal` 是**字符串**数组（`'156-245'`），不是 `[from,to]` 数组。
  //   旧代码写的是 `m[0] === pos && m[1]` —— `'156-245'[0]` 只是单个字符 `'1'`，
  //   永远匹配不上三位点位号 ⇒ **落点列表恒为空** ⇒ `legalByFrom[sel]` 空 ⇒
  //   `indexOf(pos) >= 0` 恒 false ⇒ 点落点必然被当成"非法落点"清空。
  //   也就是说：**人类手动走子从来没成功过**（此前一直是 Bot 自动下，没暴露）。
  function legalTargets(st, pos) {
    const out = [];
    ((st && st.legal) || []).forEach(s => {
      const i = s.indexOf('-');
      if (i > 0 && s.slice(0, i) === pos) out.push(s.slice(i + 1));
    });
    return out;
  }

  // ---------------- 轮询 ----------------
  // 本页面的构建戳（服务端注入）。服务重启后 /api/state 的 build 会变，
  // 说明磁盘上的 JS/CSS 已更新 → 自动 reload，省掉手动清缓存这一步。
  const MY_BUILD = (document.querySelector('meta[name="build"]') || {}).content || '';
  const RK = 'sanchi_reload_guard';

  async function poll() {
    try {
      const r = await fetch('/api/state', { cache: 'no-store' });
      const st = await r.json();
      if (st.build && st.build !== MY_BUILD) {
        try {
          const n = +(sessionStorage.getItem(RK) || 0);
          if (n < 3) {                       // 防死循环：最多自动刷 3 次
            sessionStorage.setItem(RK, n + 1);
            location.reload();
            return;
          }
        } catch (e) { /* 无 storage 时放弃自动刷新 */ }
      } else {
        try { sessionStorage.removeItem(RK); } catch (e) { }
      }
      state = st;
      render(state);
    } catch (e) { /* 服务未起时静默 */ }
  }

  // ---------------- 将军告警（提示音 + 屏幕中心闪现）----------------
  //   老师 2026-09-25：「人类控棋的这方要是被将军，你要有一个提示音和屏幕中心闪现 "将军!!!"」
  //
  //   触发条件（三条同时满足）：
  //     ① 被将方 ∈ `st.human_armies`（人类接管的方）—— 三方全 Bot 观战不打扰
  //     ② 这是**新出现**的一次将军：持续被将只响一次；解除后再被将 → 再响
  //     ③ 不在回看中、不是终局（回看只是"换画什么"，复现旧局面不该响铃）
  //
  //   ⚠️ 引擎侧 `status.checks` 的判据是 `game_dxf.check_map → R.attacked`，
  //      而 `R.attacked` 走的是各子种的 BUILDER —— 帅的 BUILDER **已包含射杀分支**
  //      （2026-09-25「照见即可射杀」）⇒ 这里的「被将军」天然覆盖
  //      「被对方帅沿贯通纵线照面瞄准」这种新规则下的致命关系，不会漏报。
  const SOUND_KEY = 'wb3chess.checkAlarm.sound';
  let soundOn = true;
  try { soundOn = localStorage.getItem(SOUND_KEY) !== '0'; } catch (e) { /* 隐私模式忽略 */ }
  let checkSeen = {};          // {army: "叫将方,叫将方"} = 上一次已知的将军状态（用于去重）
  let flashTimer = null;

  // ---- 提示音：Web Audio **现场合成** ----
  //   不引入任何音频文件（离线 / 无网络也能响，也不增加静态资源体积）。
  //   ⚠️ 浏览器 autoplay 策略：AudioContext 必须在**用户手势**之后才能出声，
  //      所以 boot() 里挂了 pointerdown/keydown 的一次性解锁（bindAudioUnlock）。
  //      若老师从头到尾没点过页面，首次将军会"只闪不响"——此时提示一次原因。
  let actx = null;
  function audioCtx() {
    try {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      if (!actx) actx = new C();
      if (actx.state === 'suspended') actx.resume();
      return actx;
    } catch (e) { return null; }
  }
  // 返回值：true = 已发声；false = 被浏览器 autoplay 策略拦下；null = 静音 / 环境不支持
  function playCheckAlarm() {
    if (!soundOn) return null;
    const ac = audioCtx();
    if (!ac) return null;
    if (ac.state && ac.state !== 'running') return false;   // 还没被用户手势解锁
    // 三连"铛"（上行 784 → 880 → 1175 Hz）—— 传统"将军"锣点，短促且穿透力强。
    // 每声 = 三角波基音（暖）＋ 方波泛音（亮）双层叠加，避免单调的"哔"声。
    const t0 = ac.currentTime + 0.02;
    [[784, 0], [880, 0.20], [1175, 0.40]].forEach(pair => {
      const f = pair[0], dt = pair[1], st = t0 + dt;
      [[1.0, 'triangle', 0.17, 0.42], [2.0, 'square', 0.045, 0.22]].forEach(layer => {
        const mul = layer[0], type = layer[1], vol = layer[2], dur = layer[3];
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = type;
        o.frequency.value = f * mul;
        g.gain.setValueAtTime(0.0001, st);           // 指数衰减不能从 0 起（不能用 0）
        g.gain.linearRampToValueAtTime(vol, st + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0008, st + dur);
        o.connect(g); g.connect(ac.destination);
        o.start(st); o.stop(st + dur + 0.05);
      });
    });
    return true;
  }

  // ---- 屏幕中心闪现：**大字写明「哪一方被哪一方将」** ----
  //   ★ 2026-10-01 老师：「你要写清楚哪一方被将军」＋
  //     「『副标题写明哪一方被哪一方将』要显示在屏幕前**大字**」
  //     ⇒ 主标题(大字) = 「魏方主帅被吴方、蜀方将军」；固定的「将军!!!」降为副标题。
  function flashCheck(army, attackers) {
    const el = $('checkFlash');
    if (!el) return;
    const names = (attackers || []).map(a => ARMY[a]).join('、') || '?';
    const sentence = ARMY[army] + '方主帅被' + names + '方将军';
    const main = $('checkFlashMain');
    if (main) main.textContent = sentence;        // ★ 大字：哪一方被哪一方将
    const sub = $('checkFlashSub');
    if (sub) sub.textContent = '将军!!!';
    el.hidden = false;
    el.classList.remove('show');
    void el.offsetWidth;                             // 强制 reflow ⇒ 同一动画可以重播
    el.classList.add('show');
    if (flashTimer) clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { el.classList.remove('show'); el.hidden = true; }, 2400);
  }

  // ---- 每次 render 后检查：人类方是否"新"被将军 ----
  function checkAlarm(st, showHist) {
    if (showHist || st.finished) return;             // 回看 / 终局：不响，也不吞状态
    const checks = (st.status && st.status.checks) || {};
    const humans = (st.human_armies || []).map(Number);
    const now = {};
    humans.forEach(k => {
      const atk = checks[k] || checks[String(k)];    // 引擎把 army 序列化成字符串键
      if (atk && atk.length) now[k] = atk.slice().sort().join(',');
    });
    const fresh = Object.keys(now).filter(k => checkSeen[k] !== now[k]);
    checkSeen = now;
    if (!fresh.length) return;
    const first = +fresh[0];
    const atk = checks[first] || checks[String(first)] || [];
    const sounded = playCheckAlarm();
    flashCheck(first, atk);
    setMsg('⚔ 将军！' + ARMY[first] + '方主帅被'
      + atk.map(a => ARMY[a]).join('、') + '方攻击'
      + (sounded === false ? '　（🔇 浏览器拦截了提示音：点一下页面即可开启）' : ''));
  }

  // ---- 音频解锁 + 声音开关 ----
  function bindAudioUnlock() {
    const un = () => {
      const ac = audioCtx();
      if (ac && ac.state === 'suspended') ac.resume();   // 手势内 resume 才有效
    };
    ['pointerdown', 'keydown', 'touchstart'].forEach(t =>
      document.addEventListener(t, un, { once: true }));
  }
  function initSoundBtn() {
    const btn = $('btnSound');
    if (!btn) return;
    const paint = () => {
      btn.textContent = soundOn ? '🔔 提示音：开' : '🔕 提示音：关';
      if (soundOn) btn.classList.add('on'); else btn.classList.remove('on');
      btn.title = soundOn ? '人类方被将军时播放提示音（点击关闭）'
                          : '提示音已关闭（点击开启）';
    };
    btn.addEventListener('click', () => {
      soundOn = !soundOn;
      try { localStorage.setItem(SOUND_KEY, soundOn ? '1' : '0'); } catch (e) { }
      paint();
      if (soundOn) {
        const r = playCheckAlarm();
        setMsg(r === false
          ? '🔔 将军提示音：已开启（浏览器需你先点一下页面才会出声）'
          : '🔔 将军提示音：已开启（试听一声）');
      } else setMsg('🔕 将军提示音：已关闭（中心闪现仍在）');
    });
    paint();
  }

  // ---------------- 渲染 ----------------
  function render(st) {
    $('turnBadge').textContent = st.finished
      ? (st.status.winner ? ARMY[st.status.winner] + '方胜' : '终局')
      : ARMY[st.status.turn] + '方';
    $('plyBadge').textContent = st.status.ply + ' / ' + (st.max_ply || '—');

    // ---- 棋盘：回看中画**历史**局面，否则画最新 ----
    const showHist = backOffset > 0 && !!viewSnap;
    ChessBoard.renderPieces(showHist ? (viewSnap.pieces || []) : st.pieces);

    // ---- 「上两手」走子痕迹（2026-09-24 夜加，2026-09-25 扩为两手）----
    //   起因：老师报「魏国的士凭空消失」。查证后代价是——士是被蜀方一门炮
    //   **从棋盘另一端**吃掉的（炮沿列5 贯通纵线跨方打到魏方九宫，中间恰 1 个炮架），
    //   而炮下一手又走了 ⇒ 只看静态盘面根本看不出"谁吃的"，观感就是丢子。
    //   【2026-09-25】老师：「目前你会用红色虚线显示前一次走棋，但不够，我需要
    //   前两次，分别用红色和橙色虚线表示前一次和前两次」——因为**吃子只是结果**，
    //   根因常在上上一步（对方刚把子送到这里 / 自己刚让开炮架）。
    //   配色：最近一手=红，再往前一手=橙，画在红之下（见 board.js setMoveTrail）。
    //   取自 log（比 status.last 多了 army 与吃子信息）。
    //   ⚠️ 回看中必须用**那个历史时刻**的两手，否则高亮会停在最新两手、
    //      与画面上的历史局面完全对不上。
    //   ⚠️ 悔棋无需特殊处理：undo_last() 里 `del self.log[snap["log_len"]:]`
    //      真正删掉了被撤回的记录，log 尾部永远是"有效历史"。
    const moveHist = showHist
      ? (viewSnap.recent || (viewSnap.last ? [viewSnap.last] : []))
      : (st.log || []).filter(e => e.type === 'move').slice(-2).reverse();
    ChessBoard.setMoveTrail(moveHist.map(e => ({
      from: e.from, to: e.to, army: e.army, captured: e.captured || null
    })));

    // ---- AI 推荐着法示意（蓝虚线，老师 2026-10-01）----
    //   两个"自动消失"规则：
    //     · 局面手数变了（自己落了子 / 被悔棋 / 重开一局）⇒ 推荐作废，**销毁**；
    //       （留着一条基于旧局面的蓝线会直接诱导走错棋）
    //     · 回看中 ⇒ 只是**不画**（不销毁），点「继续下」回到最新还能看到。
    if (hintData && (st.finished || hintData.ply !== st.status.ply)) hintData = null;
    ChessBoard.setHint(showHist ? null : hintData);

    // 「✖ 清除」按钮：有推荐才可点（没推荐时置灰，避免老师点了没反应）
    const bhc = $('btnHintClear');
    if (bhc) bhc.disabled = !hintData;
    const bhi = $('hintInfo');
    // ⚠️ 长考期间**不许覆盖** #hintInfo —— 那里在按秒刷"已等 Ns"的进度，
    //    render() 每 800ms 跑一次，不守卫就会把进度原样抹掉（老师又变成"没反应"）。
    if (bhi && !hintBusy) {
      bhi.textContent = hintData
        ? `已在棋盘上示意：${posLabel(hintData.from)} → ${posLabel(hintData.to)}`
          + `（${hintData.note}）· 未替你落子`
        : (autoHintOn
          ? '轮到人类接管的方时**自动**推荐（9 plies 秒回），也可手动点「推荐下一步」'
          : '自动推荐已关 —— 点「推荐下一步」手动算一手')
          + '；只在棋盘上画蓝虚线，不替你落子';
    }

    // 回看中不显示选中/落点提示（只读视图，点棋子也不该有任何走子迹象）
    if (!showHist && sel && st.legal) {
      const tg = legalTargets(st, sel);
      legalByFrom[sel] = tg;
      ChessBoard.setLegal(sel, tg);
    } else {
      ChessBoard.clearHints();
    }

    // ---- 排名（棋盘下方，横向三栏）----
    $('scoreboard').innerHTML = (st.order || []).map((k, i) => {
      const a = st.agents[k] || {};
      const g = (st.grades || {})[k] || {};
      const dead = !st.status.alive.includes(k);
      const isTurn = st.status.turn === k && !st.finished;
      const lead = i === 0 ? ' lead' : '';
      const undoHTML = st.allow_undo
        ? `<div class="pc-cell"><span class="v">${(st.undo_left || {})[k] ?? 0}</span><span class="k">悔棋剩</span></div>`
        : `<div class="pc-cell"><span class="v">${g.graded ? g.bad + '/' + g.graded : '—'}</span><span class="k">失误/评分</span></div>`;
      return `<div class="pcard k${k}${dead ? ' dead' : ''}${st.thinking === k ? ' think' : ''}${lead}">
        <div class="pc-h">
          <span class="pc-name" style="color:${AC[k]}">
            <span class="rk r${i + 1}">${i + 1}</span>${ARMY[k]}方${isTurn ? '<span class="think-dot"></span>' : ''}
          </span>
          <span class="pc-model" title="${a.model || ''}">${a.label || '—'}</span>
        </div>
        <div class="pc-api" title="${a.url || ''}">${apiModelText(a)}</div>
        <div class="pc-grid">
          <div class="pc-cell"><span class="v">${(st.scores[k] || 0).toFixed(0)}</span><span class="k">综合分</span></div>
          <div class="pc-cell"><span class="v">${(st.material[k] || 0).toFixed(1)}</span><span class="k">在场子力</span></div>
          <div class="pc-cell"><span class="v">${(st.kills[k] || 0).toFixed(1)}</span><span class="k">吃子</span></div>
          <div class="pc-cell"><span class="v">${st.slain[k] || 0}</span><span class="k">斩帅</span></div>
          ${undoHTML}
        </div>
        <div class="pc-note">
          ${a.local ? '本地算法，不消耗 API'
            : `调用 ${a.calls || 0} 次${a.retries ? '，重试 ' + a.retries : ''}` +
              `，均耗时 ${a.avg_latency || 0}s` +
              `${(a.netfail || 0) ? '，网络失败 ' + a.netfail : ''}`}
          ${(st.wrong[k] || 0)
            ? `　<span class="abt warn" title="模型输出了非法着法，由兜底 Bot 代走一步。这是模型的缺陷，不是悔棋">代走 ${st.wrong[k]}</span>`
            : ''}
          ${g.graded
            ? `　<span class="abt ok" title="失误谱：被判「失误 + 大漏」的步数 / 已评分步数。分数越低越稳">失误 ${g.bad}/${g.graded}${g.loss_avg != null ? '（均损 ' + g.loss_avg + '）' : ''}</span>`
            : ''}
          ${st.allow_undo
            ? `　<span class="abt undo" title="已用 ${(st.undo_used || {})[k] || 0} 次">悔棋剩 ${(st.undo_left || {})[k] ?? 0}</span>`
            : ''}
          ${dead ? '　<span class="abt off">已出局</span>' : ''}
        </div>
      </div>`;
    }).join('') || '<div class="hint">暂无数据</div>';

    // ---- 将军告警（老师 2026-09-25）----
    //   ⚠️ 必须在拼提示条**之前**调用：它内部的 setMsg 要赶在 `al.push(myMsg)` 之前
    //      写好，否则将军文案要等下一帧才出现在提示条里（老师会以为"没反应"）。
    checkAlarm(st, showHist);

    // ---- 提示条 ----
    const al = [];
    if (myMsg) al.push(myMsg);          // 本地操作反馈（选中 / 落子 / 被拒）放最前
    // ---- 续局提示（老师 2026-10-01）----
    //   「如何设计能否重启网页后继续之前的棋局继续下？」
    //   ⇒ 重启后必须**明说这是接着上次那局**，否则棋盘一打开就是几十手，
    //     老师会以为程序出错了（或以为新开的局被谁动过）。
    if (st.restored && st.restored_from && !resumeShown) {
      resumeShown = true;
      al.push(`↻ 已恢复上次对局（存档于 ${fmtTime(st.restored_from)}）`
        + `· 第 ${st.status.ply} 手 —— 接着下即可，想从头下点「重开一局」`);
    }
    // 回看中：最显眼的位置告诉老师"现在看的不是最新局面"
    if (showHist) {
      al.push(`⏪ 回看中：第 ${viewSnap.ply} / ${st.replay_total ?? 0} 手`
        + `（只读，看最新请点「⏩ 继续下」）`);
    }
    // 上两步（棋盘上同时有**红/橙**高亮；这里给文字，写明**哪一方、从哪到哪、吃了什么**）
    //   红＝最近一手、橙＝再往前一手，与 board.js setMoveTrail 的顺序严格一致
    //   （2026-09-25 老师要「前两次」；提示条同步给两行，避免只有棋盘有色块、
    //     老花眼在提示条上看不到"上两步是哪个方走的"）
    const histTxt = (mv, tag) =>
      `${tag}：${ARMY[mv.army]}方 ${posLabel(mv.from)}→${posLabel(mv.to)}`
      + (mv.captured ? `　吃${KIND_CN[mv.captured] || mv.captured}` : '');
    if (moveHist[0]) al.push(histTxt(moveHist[0], '上一步'));
    if (moveHist[1]) al.push(histTxt(moveHist[1], '上两步'));
    if (st.status.checks && Object.keys(st.status.checks).length) {
      al.push('将军：' + Object.entries(st.status.checks)
        .map(kv => ARMY[kv[0]] + '方被' + kv[1].map(x => ARMY[x]).join('、') + '方将').join('；'));
    }
    if (st.status.frozen && st.status.frozen.length) {
      al.push('停走：' + st.status.frozen.map(k => ARMY[k] + '方').join('、'));
    }
    if (st.status.out && st.status.out.length) {
      al.push('出局：' + st.status.out.map(k => ARMY[k] + '方').join('、'));
    }
    if (st.status.deputies && Object.keys(st.status.deputies).length) {
      al.push('副帅：' + Object.entries(st.status.deputies)
        .map(kv => ARMY[kv[0]] + '方军帐（归' + ARMY[kv[1].owner] + '）').join('、'));
    }
    if (st.finished) {
      al.push(st.status.winner ? '终局：' + ARMY[st.status.winner] + '方获胜' : '终局：按综合分排名');
      // 【2026-10-02】终局自救：被斩方还剩悔棋机会时如实提示"还能退回将军之前"
      if (st.undo_rescue) {
        const rl = (st.undo_left || {})[String(st.undo_rescue)] ?? 0;
        al.push(`${ARMY[st.undo_rescue]}方还剩 ${rl} 次悔棋机会，可退回被将军之前`);
      }
    }
    $('alerts').textContent = al.join('　｜　');

    // ---- 战报 ----
    const log = (st.log || []).slice(-40).reverse();
    $('log').innerHTML = log.map(evHTML).join('') || '<div class="hint">等待开局…</div>';
    $('logCnt').textContent = st.log ? st.log.length + ' 条' : '';

    $('btnAuto').textContent = st.auto ? '⏸ 暂停对弈' : '▶ 自动对弈';
    $('btnAuto').className = 'btn ' + (st.auto ? 'on' : 'primary');

    // ---- 悔棋 UI ----
    const chkU = $('chkUndo');
    if (chkU) {
      // 用户正在操作勾选框时别覆盖它，免得点击被"抢回去"
      if (document.activeElement !== chkU) chkU.checked = !!st.allow_undo;
      $('undoPer').textContent = st.undo_per_side ?? 3;
      const btnU = $('btnUndo');
      // 悔棋口径（老师 2026-10-01）：撤到"自己上次落子之前"，连带退回对手那一两手，
      //   但只扣自己 1 次机会。所以提示要写清**撤谁 + 退几步**，不能笼统说"撤回最后一步"。
      const uw = +st.undo_who || 0, urd = +st.undo_rollback || 0;
      const uName = uw ? ARMY[uw] + '方' : '';
      // 【2026-10-02 老师】「虽然是游戏结束了，但是魏国还剩一次悔棋机会，
      //   应该允许魏国退回到将军之前」⇒ 终局时后端会给出可自救方
      //   `undo_rescue`（被斩方且还有机会），此时按钮**照常可点**。
      const rescue = +st.undo_rescue || 0;
      const rescueLeft = rescue ? ((st.undo_left || {})[String(rescue)] ?? 0) : 0;
      btnU.disabled = !(st.allow_undo && st.can_undo
        && (!st.finished || rescue));
      btnU.title = !st.allow_undo ? '请先勾选「允许悔棋」'
        : (!st.can_undo ? '当前没有可悔的棋'
          : (st.finished && rescue
            ? `对局已结束，但${ARMY[rescue]}方还剩 ${rescueLeft} 次悔棋机会`
              + ` —— 点击退回「被将军之前」重走`
            : urd > 1
              ? `回到${uName}上次落子前：连带退回对手各 1 手（共 ${urd} 手），`
                + `只扣${uName} 1 次机会`
              : `撤回${uName}刚走的一步，扣 1 次机会`));
      const left = st.undo_left || {};
      const chips = [1, 2, 3]
        .map(k => `<span class="uk k${k}">${ARMY[k]} ${left[k] ?? 0}</span>`).join('');
      $('undoCnt').innerHTML = st.allow_undo
        ? (chips + (st.finished && rescue
            ? `<span class="unote">对局已结束，${ARMY[rescue]}方还可悔棋自救：`
              + `退回被将军之前重走（剩 ${rescueLeft} 次）</span>`
            : (urd > 1 && uName
              ? `<span class="unote">下一次悔棋：回到${uName}上次落子前`
                + `（连带退回 ${urd - 1} 手，只扣${uName} 1 次）</span>`
              : '')))
        : '';
    }

    // ---- 回看 UI（只读）----
    //   「⏪ 再退一步」：每次只退一手，可一路退到开局（backOffset = total）
    //   「⏩ 再进一步」：从回看位置往最新方向进一手（老师 2026-09-25 新增）
    //   「⏭ 继续下」  ：一步回到最新局面（backOffset = 0）
    //   退到开局后「再退一步」自动禁用；在最新局面时后两个自动禁用（无意义）。
    const total = st.replay_total || 0;
    const btnB = $('btnBack');
    if (btnB) {
      btnB.disabled = total <= 0 || backOffset >= total;
      btnB.textContent = backOffset > 0 ? `⏪ 再退一步（已退 ${backOffset}）` : '⏪ 再退一步';
      btnB.title = total <= 0
        ? '本局还没有历史着法'
        : (backOffset >= total
          ? '已经退到开局（第 0 手），不能再退了'
          : `回退一手看历史局面（最远可退到开局，共 ${total} 手）`);
    }
    const btnF = $('btnFwd');
    if (btnF) {
      btnF.disabled = total <= 0 || backOffset === 0;
      btnF.title = backOffset === 0
        ? '已在最新局面，无法再进一步'
        : `从第 ${(viewSnap && viewSnap.ply) ?? 0} 手前进一手（往最新方向）`;
    }
    const btnL = $('btnLive');
    if (btnL) {
      btnL.disabled = total <= 0 || backOffset === 0;
      btnL.title = backOffset === 0
        ? '已在最新局面'
        : `从回看位置（第 ${(viewSnap && viewSnap.ply) ?? 0} 手）一步回到最新局面`;
    }
    const ri = $('replayInfo');
    if (ri) {
      ri.textContent = backOffset > 0
        ? `正在看第 ${(viewSnap && viewSnap.ply) ?? 0} / ${total} 手`
        : (total > 0 ? `共 ${total} 手可回看` : '暂无历史');
      ri.className = 'undocnt ' + (backOffset > 0 ? 'on' : '');
    }

    // ---- 《一.5》连吃上限 ----
    const inpC = $('inpChain');
    if (inpC) {
      // 用户正在输入时别覆盖（否则打字打到一半会被轮询刷掉）
      if (document.activeElement !== inpC) {
        inpC.value = (st.chain_limit === null || st.chain_limit === undefined)
          ? '' : st.chain_limit;
      }
      const cl = st.chain_limit;
      $('chainInfo').textContent =
        (cl === null || cl === undefined) ? '不限（默认）'
          : (cl === 0 ? '禁止连吃' : `最多连吃 ${cl} 个`);
      $('chainInfo').className = 'undocnt ' +
        ((cl === null || cl === undefined) ? '' : 'on');
    }

    // ---- 人类接管：勾选哪几方由人走，其余方 Bot 自动接管（老师 2026-09-24）----
    const hm = st.human_armies || [];
    document.querySelectorAll('.chkH').forEach(cb => {
      const k = +cb.dataset.army;
      if (document.activeElement !== cb) cb.checked = hm.includes(k);
      cb.disabled = !!st.finished || (st.out || []).includes(k);
    });
    const hInfo = $('humanInfo');
    if (hInfo) {
      if (!hm.length) {
        hInfo.textContent = st.auto
          ? '三方全 Bot（点棋子无效；暂停后可临时介入）'
          : '三方全 Bot（已暂停，可直接点棋子走）';
        hInfo.className = 'undocnt';
      }
      else {
        const bot = [1, 2, 3].filter(k => !hm.includes(k));
        hInfo.textContent = '人类：' + hm.map(k => ARMY[k]).join('、')
          + (bot.length ? '｜Bot：' + bot.map(k => ARMY[k]).join('、') : '');
        hInfo.className = 'undocnt on';
      }
    }

    // ---- Bot 难度档（老师 2026-09-25）----
    //   「网页设置难度4个档，最低档不需要树状预判，属于新手，然后第二档，
    //     就是博弈树逐层 3 plies，第3档6 plies，第4档9 plies」
    //   「bot挑战难度档位可以在网页里面选择，默认选第二档」
    //   · 按钮由后端 difficulty_levels 下发（增/改档不用改前端，只改 difficulty.py）
    //   · 切档 = 换本地 Bot 的思考深度；不动棋盘 / 轮次 / 战绩 / 规则约定
    const dBox = $('diffBtns');
    if (dBox) {
      const lvs = st.difficulty_levels || [];
      // 只在档位数变化时重建 DOM（避免每 800ms 重排导致按钮闪烁、点击丢失）
      if (dBox.childElementCount !== lvs.length) {
        dBox.innerHTML = lvs.map(lv =>
          `<button class="btn ghost diff" data-level="${lv.level}"`
          + ` title="${lv.desc}"><b>${lv.level}</b> ${lv.name}`
          + `<i>${lv.brief}</i></button>`).join('');
      }
      dBox.querySelectorAll('button.diff').forEach(b => {
        b.classList.toggle('on', +b.dataset.level === st.difficulty);
      });
      const dm = st.difficulty_meta || {};
      const dInfo = $('diffInfo');
      if (dInfo) {
        const allHuman = (st.human_armies || []).length === 3;
        // 「目标 plies」≠「实到 plies」：最高档（宗师 12 plies）在预算内
        // 也可能搜不满（迭代加深每层前做时间外推，开不完的层直接不开；
        //   实测：档5 能搜满 12 plies / 42s）。
        // 这里**如实显示**最近一手真正搜到几 plies，免得老师以为在跑 12 层其实只跑了几层。
        // ★ 2026-10-02：原档6「传奇 15 plies」已由老师撤除（实到只有 12 plies、
        //   与档5 同果，且 12→15 要 ×8~27 节点 / 约 10 分钟）⇒ 现最高档 = 档5 宗师。
        //   （数值来自 SearchBot.last_info，经 Match 汇总进 /api/state.actual_plies）
        const ap = Object.values(st.actual_plies || {})
          .filter(v => typeof v === 'number' && v > 0);
        const realMin = ap.length ? Math.min(...ap) : 0;
        let txt = `当前：${dm.name || '—'}（${dm.brief || ''}）`;
        if (realMin && dm.plies && realMin < dm.plies) {
          txt += ` · 实到 ${realMin} plies（预算内未搜满）`;
        }
        const sk = st.difficulty_skipped || [];
        if (sk.length) txt += ` · ${sk.join('、')}方为大模型，不受难度档影响`;
        if (allHuman) txt += '（三方都由人类走，Bot 不参与）';
        dInfo.textContent = txt;
        dInfo.className = 'undocnt ' + (dm.level >= 3 ? 'on' : '');
      }
    }

    // ---- 每方主控：本地Bot / API 大模型（老师 2026-10-02）----
    //   「有没有可能选择让魏国给人类，另外两个接入 deepseek 和 hy4 api？」
    //   「做成可选的选项，用本地 bot 或者 api」
    //   · 选项由后端 /api/state.seat_options 下发 ⇒ **加模型只改 agents.json**
    //   · 只在**签名变化**时重建 DOM：/api/state 每 ~800ms 来一次，无条件重建
    //     会把老师正在展开的下拉打断，也会丢焦点
    //   · ★ 未配置好的 API 条目（缺 url / 密钥）在下拉里**置灰**并写明缺什么；
    //     后端也会明确拒绝 —— 绝不静默换成别的模型
    const seatOpts = st.seat_options || {};
    const seatList = [].concat(seatOpts.local || [], seatOpts.api || []);
    const seats = st.seats || {};
    const sels = document.querySelectorAll('select.seatSel');
    if (sels.length) {
      const mkOpt = (o) => {
        const op = document.createElement('option');
        op.value = o.id;
        // 不能用的两种原因要**分开说**：`disabled` 是"已知不可用（欠费/下线）"，
        //   其余是"你自己还没配"。混成一句「未配置」会让老师去翻自己的配置，
        //   白折腾半天 —— 两者修法完全不同。
        op.textContent = o.label + (o.brief ? ' · ' + o.brief : '')
          + (o.ready ? '' : (o.disabled ? '（已停用）' : '（未配置）'));
        // 悬停说明：能用 ⇒ 讲这个模型是什么/多慢；
        //   不能用 ⇒ **优先**把"缺什么"摆出来（老师最想知道的就是这一句）。
        op.title = o.ready ? (o.hint || '') : (o.why || o.hint || '');
        op.setAttribute('data-kind', o.kind);
        if (!o.ready) op.disabled = true;        // ★ 缺 url/密钥 ⇒ 根本点不了
        return op;
      };
      const fill = (sel2) => {
        sel2.innerHTML = '';
        (seatOpts.local || []).forEach(o => sel2.appendChild(mkOpt(o)));
        const apis = seatOpts.api || [];
        if (apis.length) {
          const g = document.createElement('optgroup');
          g.label = 'API 大模型';
          apis.forEach(o => g.appendChild(mkOpt(o)));
          sel2.appendChild(g);
        }
      };
      const sig = JSON.stringify([seatOpts.local || [], seatOpts.api || []]);
      if (sig !== seatSig) { seatSig = sig; sels.forEach(fill); }
      const humans = st.human_armies || [];
      sels.forEach(sl => {
        const k = +sl.dataset.army;
        const want = seats[k] || '';
        if (want && sl.value !== want) sl.value = want;
        const cur = sl.selectedOptions && sl.selectedOptions[0];
        // 选了 API 的席位给个醒目的金边：一眼看出哪几方"不受难度档影响"
        sl.classList.toggle('api', !!(cur && cur.dataset.kind === 'api'));
        sl.title = (cur && cur.title) || '';
      });
      const si = $('seatInfo');
      if (si) {
        const nmOf = id => { const o = seatList.find(x => x.id === id); return o ? o.label : (id || '—'); };
        const nApi = [1, 2, 3].filter(k => {
          const o = seatList.find(x => x.id === seats[k]);
          return o && !o.local;
        }).length;
        si.textContent = [1, 2, 3]
          .map(k => ARMY[k] + (humans.includes(k) ? '＊' : '') + '=' + nmOf(seats[k]))
          .join(' · ')
          + (nApi ? `（${nApi} 席为大模型，不受难度档影响）` : '')
          + (humans.length ? '　＊＝人类接管（该席主控仅备用）' : '');
        si.className = 'undocnt' + (nApi ? ' on' : '');
      }
    }

    // ---- 认输（老师 2026-09-24：不存在求和，只允许认输）----
    const rs = st.resigned || [];
    const rsInfo = $('resignInfo');
    if (rsInfo) {
      rsInfo.textContent = rs.length ? '已认输：' + rs.map(k => ARMY[k]).join('、') : '';
      rsInfo.className = 'undocnt ' + (rs.length ? 'on' : '');
    }
    document.querySelectorAll('button.resign').forEach(b => {
      const k = +b.dataset.army;
      const gone = (st.out || []).includes(k);      // 已出局 / 已判负 / 已认输
      b.disabled = !!st.finished || gone;
      b.title = gone ? `${ARMY[k]}方已失去行棋资格`
        : `让${ARMY[k]}方认输（帅留在盘上、棋子可被吃）`;
    });

    // ---- ★ 自动推荐：轮到人类接管的方就**自动**把蓝虚线铺上（老师 2026-10-01）----
    //   放在 render() 末尾：轮询（800ms）与本地动作都会经过这里，
    //   是"局面/回合变了"的唯一汇聚点。幂等靠 `autoHintKey`（见 autoHintWanted 注释）。
    maybeAutoHint(st);
  }

  // 失误谱标签（与后端 arena.LABEL_CN 一致）
  const GRADE_CN = { best: '最佳', excellent: '优秀', inaccuracy: '欠准', mistake: '失误', blunder: '大漏' };
  const GRADE_CLS = { best: 'gb', excellent: 'gg', inaccuracy: 'gy', mistake: 'go', blunder: 'gr' };

  function evHTML(e) {
    if (e.type === 'move') {
      // 【2026-09-24 夜改】原来直接打引擎点位号（`245-125`），人看着费劲；
      //   改成棋盘坐标标签（`L5→C5`）+ 简体中文棋子名（`吃士`）。
      const lb = p => { try { return window.ChessBoard.label(p); } catch (err) { return p; } };
      // 【2026-09-25 老师明确要求】斩帥时**必须显示是哪枚棋子升格为副帥**。
      //   《一、7》原文：「吃 A 帅的棋子为 B 方副帅」—— 那枚棋子（炮/车/兵…）
      //   从此从盘上消失、以副帥身份留守被斩方的军帐。不写明的话，
      //   老师会以为"我的炮怎么没了"（本轮误报 bug 就是这个原因）。
      const tag = e.eliminated
        ? `<span class="chip">斩帥 ${ARMY[e.eliminated]}方主帅</span>`
          + (e.promoted_from
            ? `<span class="chip promo" title="《一、7》：吃帅的那枚棋子升格为副帅，`
                + `驻守${ARMY[e.eliminated]}方军帐；它不再以原身份留在盘上">`
              + `${KIND_CN[e.promoted_from] || e.promoted_from}→副帥</span>`
            : '')
        : e.is_deputy
          ? `<span class="chip" title="吃的是对方军帐里的**副帥**（不是主帅）——`
            + `依《一、7》「副帅……直至被吃掉（棋子再次易主）」，`
            + `吃副帥**不升格**新副帅；该批残兵改归吃子方控制">`
            + `斩副帥（${ARMY[e.captured_army] || '?'}方）· 残兵易主</span>`
          : e.captured
            ? `<span class="chip">吃 ${KIND_CN[e.captured] || e.captured}</span>` : '';
      const g = e.grade
        ? `<span class="grade ${GRADE_CLS[e.grade]}" title="失误谱：与全场最优着法的差距，越小越好${e.best_move ? '　最优着法 ' + e.best_move : ''}">${GRADE_CN[e.grade]}${e.loss ? ' −' + e.loss : ''}</span>`
        : '';
      const u = e.undos
        ? `<span class="grade gy" title="该方消耗了悔棋机会，把这步换掉重走">悔棋×${e.undos}</span>` : '';
      const fb = e.fallback
        ? '<span class="grade gr" title="模型输出了非法着法，由兜底 Bot 代走一步（这是模型的缺陷，不是悔棋）">代走</span>' : '';
      return `<div class="ev c${e.army}">
        <span class="m">#${e.ply} ${ARMY[e.army]} ${lb(e.from)}→${lb(e.to)}</span>
        <span class="r">${e.reason || ''} ${tag}${g}${u}${fb}</span></div>`;
    }
    if (e.type === 'undo') return `<div class="ev undo">${e.text || ''}</div>`;
    if (e.type === 'resign') return `<div class="ev resign">⚑ ${e.text || ''}</div>`;
    return `<div class="ev sys">${e.text || ''}</div>`;
  }

  // ---------------- 交互 ----------------
  function onPick(pos) {
    const st = state;
    if (!st || st.finished) return;
    // ⚠️ 回看中禁止走子（只读视图）。先明确提示，别让老师以为"点了没反应"。
    if (backOffset > 0) {
      setMsg('⏪ 回看中（只读）—— 点「⏩ 继续下」回到最新局面后才能走子');
      return;
    }
    const cur = st.status.turn;
    const hm = st.human_armies || [];

    // 能替「当前回合方」落子的两种情形：
    //   ① 该方被勾选为「人类接管」（Bot 不会代走它）；
    //   ② 对局当前处于**暂停**状态 —— Bot 谁都不走，允许人类临时介入。
    // 没勾选 + 自动对弈中 = 三方全 Bot（老师 2026-09-24 口径），点棋子不生效。
    // ⚠️ 勾选状态只由勾选框决定：点棋子**不会**偷偷替你勾上方。
    if (!hm.includes(cur) && st.auto) {
      setMsg(`⛔ 现在是${NAME[cur]}方回合，但没勾「人类接管 ${NAME[cur]}」→ 由 Bot 自动走。`
        + `（想自己下：勾上${NAME[cur]}，或先按「⏸ 暂停对弈」）`);
      return;
    }

    if (sel && legalByFrom[sel] && legalByFrom[sel].indexOf(pos) >= 0) {
      post('/api/move', { from: sel, to: pos });
      setMsg(`↦ 已提交：${NAME[cur]}方 ${posLabel(sel)} → ${posLabel(pos)}`);
      sel = null; ChessBoard.clearHints();
      return;
    }
    const pc = st.pieces.find(p => p.pos === pos);
    if (pc && pc.army === cur) {
      sel = pos;
      const tg = legalTargets(st, pos);
      legalByFrom[pos] = tg;
      ChessBoard.setLegal(pos, tg);
      setMsg(`✔ 已点选 ${NAME[cur]}方 ${posLabel(pos)}（${tg.length} 个可落点）`
        + `—— 金色圆点**就是**落子点，直接点它即可`);
    } else if (pc) {
      sel = null; ChessBoard.clearHints();
      setMsg(`✖ ${posLabel(pos)} 是${NAME[pc.army]}方的棋，当前轮到${NAME[cur]}方`);
    } else {
      sel = null; ChessBoard.clearHints();
      setMsg(`✖ ${posLabel(pos)} 不是合法落点`);
    }
  }

  // ---------------- 回看（**只读**，≠ 悔棋）----------------
  //  老师 2026-09-24 夜：「点击一次回退一个，可以一直的往前回退，
  //  弄个按钮继续下，这样我就知道 bot 走哪里了」
  //  老师 2026-09-25：「再退一步 / 再进一步 / 继续下」三按钮 + 可拖动悬浮条
  //  ⚠️ 与「悔棋」的本质区别：
  //     · 悔棋 = **改对局**（撤回一手并让该方重走，消耗悔棋次数）；
  //     · 回看 = 只换"画什么"。服务端 `/api/replay` 是纯读接口，
  //       局面 / 轮次 / ply / 悔棋次数一律不动。
  //  回看位置用「相对最新的偏移」backOffset 表示，所以 Bot 在这期间继续走棋
  //  也不会错位（永远保持"离最新 N 手"）。
  //  `n > 0` 往历史退；`n < 0` 往最新进（老师要的「再进一步」）。
  async function stepBack(n) {
    if (!state) return;
    const total = state.replay_total || 0;
    if (total <= 0) { setMsg('⛔ 还没有可回看的历史（本局刚开始）'); return; }
    const step = n || 1;
    const next = Math.max(0, Math.min(backOffset + step, total));
    if (next === backOffset) {
      setMsg(step > 0 ? '⛔ 已经退到开局（第 0 手），不能再退了'
                      : '⛔ 已在最新局面，不能再进一步了');
      return;
    }
    if (next === 0) { goLive(); return; }
    try {
      const r = await fetch('/api/replay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ i: total - next })
      });
      const j = await r.json().catch(() => null);
      if (!j || j.ok === false) {
        setMsg('⚠ 回看失败：' + ((j && j.error) || '服务无响应'));
        return;
      }
      backOffset = next;
      viewSnap = j;
      sel = null; ChessBoard.clearHints();     // 清掉可能残留的选中态
      render(state);
      setMsg(`${step > 0 ? '⏪ 回看' : '⏩ 前进到'}第 ${j.ply} 手（金色高亮 = 那一手的起止点）`);
    } catch (e) {
      setMsg('⚠ 回看请求失败：' + e.message);
    }
  }

  function goLive() {
    backOffset = 0;
    viewSnap = null;
    if (state) render(state);
    setMsg('⏭ 已回到最新局面');
  }

  // ---------------- 回看悬浮条：拖动 + 位置记忆（老师 2026-09-25）----------------
  //  · 默认位置 = 页面左上角（CSS: left/top 12px）
  //  · 拖动把手 = 整条（但点在按钮 / 输入框上时不拖，交给它们）
  //  · 位置存 localStorage：刷新 / 重开一局都不跑回原位
  //  · 双击左侧「⠿ 回看」把手 = 一键复位到左上角（拖到屏幕外也能找回）
  //  · 用 Pointer Events ⇒ 鼠标 / 触摸 / 触控笔通用；监听挂在 window 上，
  //    指针滑出悬浮条也能继续拖（不依赖 setPointerCapture 的兼容性）。
  const FB_POS_KEY = 'wb3chess.replayBar.pos';
  const FB_HOME = { x: 12, y: 12 };
  function initFloatBar() {
    const bar = $('floatBar');
    if (!bar) return;

    const clamp = (x, y) => ({
      x: Math.max(0, Math.min(x, Math.max(0, window.innerWidth - bar.offsetWidth))),
      y: Math.max(0, Math.min(y, Math.max(0, window.innerHeight - bar.offsetHeight))),
    });
    const place = (x, y) => {
      const p = clamp(x, y);
      bar.style.left = p.x + 'px';
      bar.style.top = p.y + 'px';
    };
    const save = () => {
      try {
        localStorage.setItem(FB_POS_KEY,
          JSON.stringify({ x: bar.offsetLeft, y: bar.offsetTop }));
      } catch (e) { /* 隐私模式下 localStorage 可能不可用，忽略 */ }
    };

    // 恢复上次位置（越界则夹回视口内）
    try {
      const saved = JSON.parse(localStorage.getItem(FB_POS_KEY) || 'null');
      if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
        place(saved.x, saved.y);
      }
    } catch (e) { /* 坏数据当没存过 */ }

    let drag = null;
    bar.addEventListener('pointerdown', e => {
      // 点在按钮 / 输入框 / label 上 → 交给它们，不启动拖动
      if (e.target.closest('button,input,label,a')) return;
      drag = { id: e.pointerId,
               dx: e.clientX - bar.offsetLeft, dy: e.clientY - bar.offsetTop };
      bar.classList.add('dragging');
      e.preventDefault();                     // 阻止拖动时选中文字
    });
    window.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== drag.id) return;
      place(e.clientX - drag.dx, e.clientY - drag.dy);
    });
    const endDrag = e => {
      if (!drag || (e && e.pointerId !== drag.id)) return;
      drag = null;
      bar.classList.remove('dragging');
      save();
    };
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);

    const grip = bar.querySelector('.fb-grip');
    if (grip) grip.addEventListener('dblclick', () => {
      place(FB_HOME.x, FB_HOME.y); save();
      setMsg('⤒ 回看条已复位到页面左上角');
    });

    // 窗口尺寸变化：别让悬浮条留在视口外
    window.addEventListener('resize', () => place(bar.offsetLeft, bar.offsetTop));
  }

  // ---- 一键推荐下一步（老师 2026-10-01）----
  //   老师原话：「加一个功能，可以一键推荐人类玩家走一下一步在棋盘上示意，
  //   但不帮他落子。你可以用蓝色虚线箭头加文字示意，推荐下一步必须专业，
  //   用上你最高档的 15 plies 的下棋智商」（当天二次改口径：先 12 → 后 15）。
  //
  //   ★★【2026-10-02 老师再定】默认档降到 **9 plies**（「12 用的时间太长了」）：
  //      依据是 16 局面标定（tests/_analyze_gold.py）——9→12 的 ratio 只有 1.00、
  //      噪声占 45%、耗时却 ×24（≈43s / 3345 万节点）；而 6→9 是实打实的涨棋
  //      （中位 ratio 3.54，12/16 局面真变招）。⇒ 9 是**智力饱和点**，12 只买等待。
  //      12 / 15 仍留在下拉框里，谁想拼再自己选。
  //
  //   ⚠️ **搜索深度三档：9 / 12（默认）/ 15 plies** —— 均由逐层实测（3→15 plies 两局对照，
  //      `tests/_bench_ply_saturation.py` → `tests/_bench_ply_sat.json`）定档：
  //        · **12 → 15：噪声级**。选招只差 **0.04 / 0.06 分**（该层估值量级 4031 ≈ 0.001%），
  //          代价却是 **20 倍时间**（30s → 640~731s，约 11 分钟）
  //          ⇒ 瓶颈不是"深度不够"，是**估值函数分不开这几手**；再加深只是把噪声重洗一遍。
  //          15 plies 保留为可选，给"拼到极限"用。
  //        · **9 → 12：真实差距**。9 选的手在 12 的榜单里排 **第 6/8（差 +6.03）**、
  //          **第 5/8（差 +0.88）**，两层榜单**互不认同 = 未收敛**；9 plies 榜单前 4 名
  //          只差 0.24 分（4031.41 / 4031.40 / 4031.29 / 4031.17）⇒ **在噪声里挑一手**。
  //          ⇒ **不作默认**，但因只要 **0.05~1.8 秒**，留作下拉框里的"秒回试算"
  //          （老师问「是否用 9 plies 更好」时的答案：棋力明显弱，只赢在快）。
  //   ⚠️ **绝不调用 /api/move** —— 推荐只画一条蓝虚线；落不落子完全由老师自己决定。
  //      这是本功能的红线，前后端各有一道保证：
  //        · 后端 `/api/hint` 拿**深拷贝**的局面去搜（真实棋局一个字段都不动）；
  //        · 前端只在 `ChessBoard.setHint()` 里画线，不碰任何写接口。
  //      专项测试：后端 `tests/_verify_hint.py`（逐字段比对 state）、
  //      前端 `tests/_verify_hint_ui.js`（断言只发 /api/hint、不发 /api/move）。
  //
  //   ⚠️ 长考期间**整个对弈台会卡住**：推荐与 Bot 抢同一把 JIT 搜索锁
  //      （实测两次长考期间后端 ply 一直不动）⇒ 提示条必须写明"这是正常现象"，
  //      且 `#hintInfo` 按秒报进度，否则老师会以为死机。
  //   ⚠️ 搜索期间局面可能变（Bot 接着走 / 老师自己走 / 悔棋）⇒ 返回里带 `ply`，
  //      与当前对不上就**丢弃并明说**：画一条基于旧局面的蓝线会直接诱导走错棋。
  //   ⚠️ 「目标档位」与「实到深度」**分开显示**：目标 9/12/15 plies，
  //      预算内真搜到几层由后端如实回报 —— 不虚标。
  let hintData = null, hintBusy = false;
  // 长考进度定时器（见 hintStartTimer 的注释：为什么必须写 #hintInfo 而不能只 setMsg）
  let hintTimer = null, hintT0 = 0;

  // ---- 长考进度：**实时可见**（老师 2026-10-01 报「点了推荐，图上没画路径」）----
  //   实测诊断（tests/_shot_hint.js 回读真实网页 DOM）：
  //     · 绘制层**完全正常** —— setHint 画了 7 个元素（蓝虚线/箭头/起点圈/终点方框
  //       + 3 段文字），色 #1a73e8、无描边、normal 字重，且 lyr-hint 就是最上层；
  //     · 点按钮 12s 后：请求已发出、按钮 = `🧠 长考中…`，但 **#alerts 是空的**。
  //   ⇒ 结论：不是"没画"，是**还没算完**（12 plies ≈ 60s，15 plies 目标 5 分钟），
  //     而"正在长考"那句话走的是 `setMsg()` —— 它只改模块内 `myMsg`，要等下一次
  //     `render()`（轮询 800ms）才拼进 `#alerts`，老师完全看不到"在动"。
  //   ⇒ 对策：进度写进**常驻**的 `#hintInfo`（不依赖轮询），并按秒刷新。
  //   ⚠️ `render()` 每轮都会重写 `#hintInfo` ⇒ 那里必须加 `if (!hintBusy)` 守卫，
  //      否则进度会被轮询原样抹掉（这就白改了）。
  function hintStatus(txt) { const e = $('hintInfo'); if (e) e.textContent = txt; }

  function hintStopTimer() {
    if (hintTimer) { clearInterval(hintTimer); hintTimer = null; }
  }

  function hintStartTimer() {
    hintStopTimer();
    hintT0 = Date.now();
    const want = hintPlyWanted();
    const tick = () => {
      const s = Math.round((Date.now() - hintT0) / 1000);
      hintStatus(`⏳ AI 长考中… 已等 ${s}s　`
        + `（${want} plies：${plyEta(want)}。`
        + '期间对弈台会**卡住**（Bot 抢不到搜索锁），请勿刷新页面、也不要连点）');
      const btn = $('btnHint');
      if (btn) btn.textContent = `🧠 长考中 ${s}s`;
    };
    tick();
    hintTimer = setInterval(tick, 1000);
  }

  // 各档长考的耗时口径（与后端 HINT_BUDGET 一致：9→12s / 12→150s / 15→720s 上限）
  //   9 plies 实测 0.05~1.8s（秒回）⇒ 文案不能再写"约 30 秒"，否则老师白等。
  function plyEta(want) {
    if (want >= 15) return '深搜约 10 分钟，多数局面 3~11 分钟';
    if (want <= 9) return '秒回（实测 0.05~1.8 秒）';
    return '约 30 秒，首尾 1~2 分钟';
  }

  // 当前请求的搜索深度（看下拉框；缺元素/非法值退回 **9 plies**）
  //   ★ 只认 9 / 12 / 15 三档 —— 与 `web/index.html` 的 `#selHintPly` 一一对应，
  //     也与后端 `Match.HINT_BUDGET`（{9:12.0, 12:150.0, 15:720.0}）保持一致。
  //   ★★【2026-10-02 老师定】默认档 12 → **9**：「网页 AI 推荐用 9 plies，
  //     12 用的时间太长了」。16 局面标定（tests/_analyze_gold.py）显示 9→12
  //     是 ratio 1.00 / 噪声 45% / 耗时 ×24 ⇒ 9 已是饱和点，12 只买来等待。
  //     ⚠️ 老写法 `(v === 15 ? 15 : 12)` 会把 9 静默吞成 12 ⇒ 老师选"秒回"
  //     却等 30 秒（这个坑已经踩过一次）。
  const HINT_PLIES = [9, 12, 15];
  function hintPlyWanted() {
    const el = $('selHintPly');
    const v = el && el.value ? parseInt(el.value, 10) : 9;
    return HINT_PLIES.includes(v) ? v : 9;
  }
  const scoreTxt = v => (v == null || isNaN(v))
    ? '—' : ((v >= 0 ? '+' : '') + (+v).toFixed(1));

  //   ⚠️ 参数是 `{auto:true}` 时走**自动推荐**分支：文案里标注"自动"，且失败后允许重试。
  async function askHint(opts) {
    const isAuto = !!(opts && opts.auto);
    if (hintBusy) {
      setMsg('⏳ 上一手推荐还在长考中，请稍候…');
      if (isAuto) scheduleAutoRetry();       // ★ 有上限的退避重试（见 scheduleAutoRetry 注）
      return;
    }
    if (!state || state.finished) {
      setMsg('⛔ 对局已结束，无需推荐');
      hintStatus('⛔ 对局已结束，无需推荐');
      return;
    }
    if (backOffset > 0) {
      setMsg('⏪ 回看中（只读）—— 先点「⏭ 继续下」回到最新局面再要推荐');
      hintStatus('⏪ 回看中（只读）—— 先点「⏭ 继续下」回到最新局面再要推荐');
      return;
    }
    // 轮到 Bot 时给一句**提醒**，但**不拦**（老师 2026-10-01 的实测局面就是全 Bot 观战，
    //   拦了等于这个功能在他最常用的场景里直接不可用）。
    //   为什么"局面会变"其实多半不会发生：长考持的是 JIT 搜索锁，Bot 循环拿不到锁
    //   ⇒ 整个对弈台在长考期间是**冻住**的（实测：两次 60s 长考，后端 ply 都停在 0）。
    //   真正要防的是"老师连点 / 刷新"，那两条已由 `hintBusy` 与 ply 指纹兜住。
    const botTurn = state.auto
      && !(state.human_armies || []).includes(state.status.turn);
    const btn = $('btnHint');
    const want = hintPlyWanted();          // 默认 9 plies（秒回；12 慢档 / 15 深搜可选）
    hintBusy = true;
    if (btn) { btn.disabled = true; btn.classList.add('busy'); }
    hintStartTimer();                     // ★ 实时进度（写常驻 #hintInfo）
    setMsg((botTurn
      ? `⚠ 现在轮到 ${NAME[state.status.turn]}方（Bot）—— 长考期间对弈台会**卡住**`
        + '（Bot 拿不到搜索锁），这是正常现象。'
      : `${isAuto ? '🤖 自动推荐' : '🧠 AI 正在长考'}：${want} plies（${plyEta(want)}）`
        + '，期间请勿刷新页面…'));
    const t0 = Date.now();
    try {
      const r = await fetch('/api/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plies: want })
      });
      const j = await r.json().catch(() => null);
      if (!j || j.ok === false) {
        // 自动推荐撞上"另一个页面正在长考"时，别拿一句"推荐失败"糊住老师
        //   （那个页面自己的长考算完就会把线画上），给一句准确的话 + 退避重试。
        const busy = !!(j && j.busy);
        const m = (isAuto && busy)
          ? '⏳ 另一处正在长考（同一时刻只允许一个搜索）—— 稍后自动重试'
          : '⚠ 推荐失败：' + ((j && j.error) || '未知错误');
        setMsg(m);
        hintStatus(m);
        if (isAuto) scheduleAutoRetry();     // ★ 上限 2 次、退避 3s/8s（防请求风暴）
        return;
      }
      if (j.ply !== (state && state.status.ply)) {
        const m = `⚠ 局面已变（推荐基于第 ${j.ply} 手，现在是第 `
          + `${(state && state.status.ply)} 手）—— 已丢弃`
          + (isAuto ? '，将按新局面向重新推荐' : '，请重新点「推荐下一步」');
        setMsg(m);
        hintStatus(m);
        return;
      }
      const aim = (j.depth || 5) * 3;
      hintData = {
        from: j.from, to: j.to, army: j.army, ply: j.ply,
        captured: j.captured || null,
        note: `AI ${aim} plies`
          + (j.plies && j.plies < aim ? `（实到 ${j.plies}）` : '')
          + ` · 估值 ${scoreTxt(j.score)}`
      };
      render(state);                              // 立刻铺上蓝虚线
      const done = `✅ 已在棋盘上画出蓝虚线：${NAME[j.army]}方 `
        + `${posLabel(j.from)} → ${posLabel(j.to)}`
        + (j.captured ? `（吃${KIND_CN[j.captured] || j.captured}）` : '')
        + `　${hintData.note}　耗时 ${((Date.now() - t0) / 1000).toFixed(1)}s`
        + '　—— **只是示意，不替你落子**';
      setMsg((isAuto ? '🤖 自动推荐 ' : '💡 推荐 ') + done);
      hintStatus(done);
    } catch (e) {
      setMsg('⚠ 推荐请求失败：' + e.message);
      hintStatus('⚠ 推荐请求失败：' + e.message);
      // 网络抖动用**同一套上限退避**（曾经这里是无脑清 key ⇒ 变成请求风暴）
      if (isAuto) scheduleAutoRetry();
    } finally {
      hintBusy = false;
      hintStopTimer();
      if (btn) {
        btn.disabled = false; btn.classList.remove('busy');
        btn.textContent = '💡 推荐下一步';
      }
    }
  }

  function dropHint(quiet) {
    if (!hintData) return;
    hintData = null;
    if (window.ChessBoard) window.ChessBoard.clearHint();
    if (!quiet) setMsg('✖ 已清除 AI 推荐示意（棋盘回到原样）');
  }

  // ================= ★ 自动推荐（老师 2026-10-01）=================
  //   老师原话：「AI 推荐 下一步 要自动 推荐（默认 12piles），不需要我点击 推荐下一步」
  //
  //   口径：**轮到人类接管的方，就自动算好并把蓝虚线铺上**，老师只管照着走或另走。
  //   ⚠️ 自动 ≠ 替他落子 —— 仍然只画线，一个写接口都不发（红线不变，测试照守）。
  //
  //   触发条件（四条全满足）：
  //     ① 自动推荐开关开着（控件行的「自动推荐」勾选框，**默认开**，localStorage 记住）
  //     ② 对局未结束 + 不在回看中（回看是只读视图，画一条建议线会误导）
  //     ③ **轮到人类接管的方**（`state.human_armies`）——
  //        三方全 Bot 观战时**不自动**：那时推荐要跟真实 Bot 抢同一把 JIT 搜索锁，
  //        白白把对局拖慢 30 秒/手，没有任何收益。
  //        例外：三方全 Bot 但**已暂停**（`auto=false`）时给当前回合方算一手 ——
  //        这时没人跑搜索，不存在争抢，老师暂停后正好想看看"该怎么走"。
  //     ④ 这个局面**还没算过**：key = `ply-turn`。
  //   ⚠️ 去重用 **key 而不是一个布尔量**：key 一变（下一手）就会自动再推荐一次 —— 这正是要的；
  //      而 800ms 的轮询**不会**因此每轮重算（key 没变就跳过）。
  //   ⚠️ 手动点按钮**不受 key 限制**：老师想重算就重算。
  //   ⚠️ 老师点「✖ 清除」后**不会**被自动推荐立刻顶回来（key 没变 ⇒ 不再发起），
  //      否则按钮就白点了、底盘也会一直闪。
  const AH_STORE = 'wb3chess.autoHint';
  let autoHintOn = true, autoHintKey = '', autoHintRetry = 0, autoHintRetryKey = '';

  // ★ 自动推荐的"忙"重试：**有上限 + 有退避**
  //   动机（**真实事故**，2026-10-01 用 `tests/_shot_autohint.js` 抓到的）：
  //   老师浏览器开着两个标签页时，A 页正在 12 plies 长考（30s），
  //   B 页的自动推荐会拿到后端 `busy` **立即返回** —— 若这时把去重 key 一清、
  //   让下一轮 800ms 轮询无脑重试，就变成 **每 800ms 发一次 /api/hint** 的请求风暴
  //   （实测 90 秒发了 70 次，两个页面的搜索互相踩，谁都算不完）。
  //   ⇒ 现在：**同一局面最多重试 4 次**，退避 3s / 8s / 20s / 45s（末档足够跨过
  //     另一个页面那 30 秒的 12 plies 搜索）⇒ 最坏 5 次请求/局面，而不是 70 次。
  //     重试完就认了：反正局面一变（走一手）key 就会换，自然会重新发起。
  const AH_RETRY_DELAY = [3000, 8000, 20000, 45000];
  function scheduleAutoRetry() {
    if (autoHintRetry >= AH_RETRY_DELAY.length) return;
    const d = AH_RETRY_DELAY[autoHintRetry++];
    setTimeout(() => {
      if (!autoHintOn || hintBusy) return;
      autoHintKey = '';                    // 放开去重，下一轮轮询会重试
      if (state) maybeAutoHint(state);
    }, d);
  }

  function autoHintWanted(st) {
    if (!autoHintOn || !st) return '';
    if (hintBusy) return '';                       // 上一手还在长考
    if (st.finished) return '';
    if (backOffset > 0) return '';                 // 回看中（只读）
    const s = st.status || {};
    const hm = st.human_armies || [];
    const mine = hm.includes(s.turn);
    if (!mine && !(hm.length === 0 && !st.auto)) return '';   // ③
    return `${s.ply}-${s.turn}`;                   // ④ 去重 key
  }

  function maybeAutoHint(st) {
    const k = autoHintWanted(st);
    if (!k || k === autoHintKey) return;
    // ⚠️ 重试计数**只在一个"新局面"上归零**，不能在每次发起时都归零 ——
    //   `scheduleAutoRetry()` 会先把 key 清掉再回调本函数，若这里无条件 `autoHintRetry = 0`，
    //   退避阶梯就永远停在第 0 档（3s），变成"每 3 秒重试一次"的**另一个风暴**
    //   （2026-10-01 真机实测：150 秒 36 次）。所以用 `autoHintRetryKey` 认局面。
    if (k !== autoHintRetryKey) { autoHintRetry = 0; autoHintRetryKey = k; }
    autoHintKey = k;                               // 先占位，防重入（askHint 是异步的）
    askHint({ auto: true });
  }

  async function post(path, body) {
    try {
      const r = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body || {})
      });
      const j = await r.json().catch(() => null);
      if (j && j.ok === false && j.error) setMsg('⚠ ' + path + '：' + j.error);
      poll();
    } catch (e) { setMsg('⚠ 请求失败 ' + path + '：' + e.message); }
  }

  // ---------------- 启动 ----------------
  function boot() {
    ChessBoard.init($('board'));
    ChessBoard.setPickHandler(onPick);

    $('btnAuto').addEventListener('click', () => post('/api/auto', { on: !(state && state.auto) }));
    $('btnStep').addEventListener('click', () => post('/api/step'));
    // 重开一局：回看位置也要一并复位（否则新局却停在旧局的历史里）
    $('btnNew').addEventListener('click', () => {
      sel = null; backOffset = 0; viewSnap = null;
      checkSeen = {};                      // 新局：清掉上一局的将军去重状态，避免漏报
      hintData = null;                     // 新局：AI 推荐也一并清掉（别留在新盘上）
      post('/api/new');
    });

    // ---- 将军告警：音频解锁 + 提示音开关（老师 2026-09-25）----
    bindAudioUnlock();
    initSoundBtn();

    // ---- 回看（只读，老师 2026-09-24 夜：「点击一次回退一个…弄个按钮继续下」
    //      2026-09-25 补「再进一步」；三按钮已抽成可拖动悬浮条 #floatBar）----
    $('btnBack').addEventListener('click', () => stepBack(1));
    $('btnFwd').addEventListener('click', () => stepBack(-1));
    $('btnLive').addEventListener('click', () => goLive());
    initFloatBar();

    // ---- 悔棋 ----
    $('chkUndo').addEventListener('change',
      e => post('/api/undo_config', { on: e.target.checked, per_side: 3 }));
    // 悔棋改的是**对局本身**（含终局自救）⇒ 回看位置必须复位，
    //   否则会出现"棋已经悔了、画面却还停在旧历史"的错位。
    $('btnUndo').addEventListener('click', () => {
      backOffset = 0; viewSnap = null;
      post('/api/undo', {});
    });

    // ---- 一键推荐下一步（老师 2026-10-01）----
    //   ⚠️ 绑定必须落在 boot() 里、id 必须与 index.html 完全一致 ——
    //     本项目踩过「只写了函数忘了绑按钮 ⇒ 点了没反应」的坑（见 MEMORY 前端铁律）。
    //   ⚠️ 原文件里 `hintData` 由 render() 的 `bhc.disabled = !hintData` 控制清除按钮，
    //     所以这里**不能**用 getElementById 直接操作状态，只绑事件。
    const bh = $('btnHint');
    if (bh) bh.addEventListener('click', () => askHint());
    const bc = $('btnHintClear');
    if (bc) bc.addEventListener('click', () => dropHint());

    // ---- ★ 自动推荐开关（默认开；localStorage 记住，老师关了就一直是关的）----
    try { autoHintOn = localStorage.getItem(AH_STORE) !== '0'; } catch (e) { autoHintOn = true; }
    const cAH = $('chkAutoHint');
    if (cAH) {
      cAH.checked = autoHintOn;
      cAH.addEventListener('change', () => {
        autoHintOn = !!cAH.checked;
        try { localStorage.setItem(AH_STORE, autoHintOn ? '1' : '0'); } catch (e) { /* 忽略 */ }
        // 刚打开 ⇒ 立刻为**当前**局面算一手（key 清空，否则"这一手已经算过"会挡住）
        if (autoHintOn) {
          autoHintKey = ''; autoHintRetry = 0; autoHintRetryKey = '';
          if (state) maybeAutoHint(state);
        } else if (state) render(state);     // 关掉只改说明文字，不打断正在跑的长考
      });
    }

    // ---- 人类接管：勾选哪几方由人走（其余方 Bot 自动）----
    document.querySelectorAll('.chkH').forEach(cb => {
      cb.addEventListener('change', () => {
        const arms = [...document.querySelectorAll('.chkH')]
          .filter(x => x.checked).map(x => +x.dataset.army);
        post('/api/human_config', { armies: arms });
      });
    });

    // ---- 每方主控：本地Bot / API 大模型（老师 2026-10-02）----
    //   「选择让魏国给人类，另外两个接入 deepseek 和 hy4 api」
    //   「做成可选的选项，用本地 bot 或者 api」
    //   ⚠️ 未配置的条目标了 disabled，浏览器根本不会触发 change；
    //     真触发了后端也会明确拒绝（`post` 会把 error 显示在提示条上）。
    document.querySelectorAll('select.seatSel').forEach(sl => {
      sl.addEventListener('change', () => {
        post('/api/seat', { army: +sl.dataset.army, model_id: sl.value });
      });
    });

    // ---- Bot 难度档（老师 2026-09-25：「bot挑战难度档位可以在网页里面选择」）----
    //   按钮由 render() 按后端 difficulty_levels 动态生成 ⇒ 用**事件委托**
    //   绑在容器上，这样按钮重建（档位数变化）也不会丢绑定。
    const dBox = $('diffBtns');
    if (dBox) {
      dBox.addEventListener('click', e => {
        const b = e.target.closest('button.diff');
        if (!b) return;
        post('/api/difficulty', { level: +b.dataset.level });
      });
    }

    // ---- 认输（老师 2026-09-24：不存在求和，只允许认输）----
    document.querySelectorAll('button.resign').forEach(btn => {
      btn.addEventListener('click', () => {
        const k = parseInt(btn.dataset.army, 10);
        if (!confirm(`确定让 ${ARMY[k]}方认输？\n\n认输后该方不再行棋（帅仍留在盘上，其棋子另两方不能控制但可以吃）。`))
          return;
        post('/api/resign', { army: k });
      });
    });

    // ---- 《一.5》连吃上限（输入整数；留空 = 不限制）----
    const inpC = $('inpChain');
    const sendChain = () => {
      const raw = inpC.value.trim();
      const n = raw === '' ? null : parseInt(raw, 10);
      post('/api/rule_config', { chain_limit: (n === null || isNaN(n)) ? null : n });
    };
    inpC.addEventListener('change', sendChain);
    inpC.addEventListener('keydown', e => { if (e.key === 'Enter') { inpC.blur(); sendChain(); } });

    $('legend').innerHTML =
      '<span><i style="background:#2b6cb0"></i>魏（下）</span>' +
      '<span><i style="background:#2f855a"></i>吴（左斜上）</span>' +
      '<span><i style="background:#c53030"></i>蜀（右斜上）</span>' +
      '<span><i style="background:#4338ca"></i>中央三角区（三方营点）</span>' +
      '<span><i style="background:#1a73e8"></i>AI 推荐走法（蓝虚线示意，未落子）</span>' +
      '<span>荆州 / 赤壁 / 祁山 ＝ 三条中心地带（楚河）</span>';

    poll();
    setInterval(poll, 800);
  }
  document.addEventListener('DOMContentLoaded', boot);
})();
