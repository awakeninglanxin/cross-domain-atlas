/* 专利版棋盘渲染（数据来自老师的 DXF 工程图，见 board_data.js）
   DXF 坐标为 x 右 y 上；SVG 用 y 向下，故取 (x, -y)。
   方位（老师确认）：魏=下、吴=左斜上、蜀=右斜上 */
window.ChessBoard = (function () {
  const D = window.BOARD_DATA;
  const AC = ['', '#2b6cb0', '#2f855a', '#c53030'];        // 1魏蓝 / 2吴绿 / 3蜀红
  const NAMES = { 1: '魏', 2: '吴', 3: '蜀' };
  // 方位（老师确认）：魏=下、吴=左斜上、蜀=右斜上。
  // 行字母：魏=A..E、蜀=F..J、吴=K..O（对应棋盘原图上三条字母线：
  //   魏字母 A-E 贴左下侧边、蜀字母 F-J 贴右下侧边、吴字母 K-O 贴顶边）。
  // ⚠️ 2026-09-24 修正：原先写成 {2:'FGHIJ', 3:'KLMNO'}，把蜀/吴的字母**对调**了。
  const LETTER = { 1: 'ABCDE', 2: 'KLMNO', 3: 'FGHIJ' };
  const KINDS = { rook: '車', horse: '馬', elephant: '象', advisor: '士',
                  general: '帥', cannon: '炮', pawn: '兵' };
  // 点位坐标标签的颜色（老师 2026-09-24 指定红色：在木色棋盘上最醒目）
  const LABEL_COLOR = '#c53030';

  // ---- 中央三角区「枢纽」（老师 2026-10-01 新增视觉标记）----
  //   三顶点 = 155(A5) / 255(K5) / 355(F5)，与 board_data.tri 同源；
  //   这里**显式写死**成常量，因为它是规则相关视觉（兵在此可自由回跳），
  //   不能因为 board_data 少个字段就静默消失。
  //   金色取**香槟金**（比落点提示的琥珀 #d69e2e 淡、冷），两者同级同屏也不混。
  const TRI_PTS = ['155', '255', '355'];
  const TRI_GOLD = '#c9a961';
  const TRI_GOLD_FILL = '#f7ecc9';

  // ---- 「AI 推荐下一步」示意色（老师 2026-10-01）----
  //   老师原话：「加一个功能，可以一键推荐人类玩家走一下一步在棋盘上示意，
  //   但不帮他落子。你可以用**蓝色虚线箭头加文字**示意，推荐下一步必须专业，
  //   用上你最高档的 12 plies 的下棋智商」。
  //   选**宝蓝 #1a73e8**：与已有的四色都不撞 ——
  //     红 #c02626（最近一手）/ 橙 #e07a10（再往前一手）/
  //     琥珀 #d69e2e（落点提示）/ 香槟金 #c9a961（三角区），
  //   一眼能分出「这条线是**建议**，不是已经走过的棋」。
  const HINT_BLUE = '#1a73e8';

  let svg, gHits, gPieces, gHints, gFocus, onPick = null;
  let gHint = null;                        // AI 推荐示意层（蓝虚线，最上层）
  let _lastHint = '';                      // 上次画过的推荐签名（轮询防重复重建）
  let triNode = null;                      // 三角区标记组（选中枢纽棋子时切激活态）
  let _triActive = false;                  // 激活态当前值（幂等，避免每轮重复写属性）
  let _lastHints = '';                     // 上次画过的提示签名（避免轮询反复重建）
  let _lastFocus = '';                     // 上次画过的「上两手」签名
  const coordNodes = {};

  function xy(p) { const q = D.points[p]; return q ? [q[0], -q[1]] : null; }
  function el(tag, attrs) {
    const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  // 坐标标签 = 行字母 + 图中数字。字母 = 行（A/F/K = 各自 row5 … E/J/O = 各自 row1）；
  // 底边「图中数字 d = 10 − 引擎列」——棋盘原图上魏底边的「1」贴在最左端，
  // 而 DXF/引擎里魏 row1 的列 9 在最左（列 1 最右），故必须取 10−列。
  // ⚠️ 2026-09-24 修正：原先写成 `+p[2]`（数字=列），会把整条数字线**左右镜像**，
  //    与纸质棋盘对不上（魏 A4 应为 156，而不是 154）。
  function coordLabel(p) {
    return LETTER[+p[0]][5 - (+p[1])] + (10 - (+p[2]));
  }

  function init(node) {
    svg = node;
    svg.setAttribute('viewBox', '-124 -108 248 216');
    svg.innerHTML = '';
    // 【2026-09-25 补】签名缓存是**模块级**的（跨 svg 实例共享）。
    //   若重新 init（换棋盘 / 预览脚本连续渲染两张图），旧的签名会让
    //   setLegal / setMoveTrail 误判"内容没变"而**什么都不画**。
    //   真实网页只 init 一次不受影响，但这里必须清零，否则是个埋着的坑。
    _lastHints = '';
    _lastFocus = '';
    _lastHint = '';          // AI 推荐层也随 svg 重建 ⇒ 签名缓存同步作废
    // 三角区标记随 svg 一起重建 ⇒ 引用与激活态同步作废
    triNode = null;
    _triActive = false;

    // ---- 1. 六边形底（木色）
    const hex = D.hex.map(p => [p[0], -p[1]]);
    svg.appendChild(el('polygon', {
      points: hex.map(p => p.join(',')).join(' '),
      fill: '#f6efe1', stroke: '#a8874a', 'stroke-width': 1.6
    }));

    // ---- 2. 三条中心地带（半透明色块 + 名称）
    const BC = { '荆州': ['#fca5a5', '#b91c1c'], '赤壁': ['#86efac', '#15803d'],
                 '祁山': ['#93c5fd', '#1d4ed8'] };
    (D.bands || []).forEach(b => {
      const pts = b.quad.map(p => xy(p));
      const col = BC[b.name] || ['#e5e7eb', '#666'];
      svg.appendChild(el('polygon', {
        points: pts.map(p => p.join(',')).join(' '),
        fill: col[0], 'fill-opacity': 0.30, stroke: col[1],
        'stroke-width': 0.7, 'stroke-dasharray': '2 1.4'
      }));
      const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
      const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      const t = el('text', { x: cx, y: cy + 1.6, 'text-anchor': 'middle',
                             'font-size': 6.6, 'font-weight': 'bold',
                             fill: col[1], 'fill-opacity': 0.8,
                             'font-family': 'STKaiti,KaiTi,serif' });
      t.textContent = b.name;
      svg.appendChild(t);
      const s = el('text', { x: cx, y: cy + 8.2, 'text-anchor': 'middle',
                             'font-size': 4.2, fill: col[1], 'fill-opacity': 0.55,
                             'font-family': 'sans-serif' });
      s.textContent = b.desc || '';
      svg.appendChild(s);
    });

    // ---- 3. 中央三角区（淡金「枢纽」标记，老师 2026-10-01）
    _drawTriZone();

    // ---- 4. 九宫（三方虚线框）
    [1, 2, 3].forEach(a => {
      const ring = [`${a}14`, `${a}16`, `${a}36`, `${a}34`].map(p => xy(p));
      svg.appendChild(el('polygon', {
        points: ring.map(p => p.join(',')).join(' '),
        fill: 'none', stroke: AC[a], 'stroke-width': 0.5,
        'stroke-dasharray': '1.6 1.4'
      }));
    });

    // ---- 5. 三方名字（写在各自九宫 = 田米字格内）
    [1, 2, 3].forEach(a => {
      const q = xy(`${a}25`);
      if (!q) return;
      const t = el('text', {
        x: q[0], y: q[1] + 4.6, 'text-anchor': 'middle',
        'font-size': 13, 'font-weight': 'bold',
        fill: AC[a], 'fill-opacity': 0.32,
        'font-family': 'STKaiti,KaiTi,serif'
      });
      t.textContent = NAMES[a];
      svg.appendChild(t);
    });

    // ---- 6. 网格线（51 条）
    (D.lines || []).forEach(chain => {
      if (chain.length < 2) return;
      const d = chain.map((p, i) => (i ? 'L' : 'M') + xy(p).join(' ')).join(' ');
      svg.appendChild(el('path', {
        d: d, fill: 'none', stroke: '#8a7b60',
        'stroke-width': 0.42, 'stroke-opacity': 0.85
      }));
    });

    // ---- 7. 落子点
    Object.keys(D.points).forEach(p => {
      const q = xy(p);
      svg.appendChild(el('circle', { cx: q[0], cy: q[1], r: 0.75, fill: '#b9ad95' }));
    });

    // ---- 8. 点位坐标（无子时显示；有子时由棋子遮挡 + 显式隐藏）
    // 【2026-09-24 改】标签颜色：原为低饱和棕 `#9c8f78`，在木色棋盘（#f6efe1）上
    //   对比度不足、观战时看不清。老师指定改为**红色**（比白色更适合这张棋盘，
    //   白字在浅色底上会糊掉）。取调色板里已有的蜀红 `#c53030`。
    Object.keys(D.points).forEach(p => {
      const q = xy(p);
      const t = el('text', {
        x: q[0], y: q[1] + 1.15, 'text-anchor': 'middle',
        'font-size': 3.3, fill: LABEL_COLOR,
        'font-family': 'ui-monospace,Consolas,monospace'
      });
      t.textContent = coordLabel(p);
      coordNodes[p] = t;
      svg.appendChild(t);
    });

    // ---- 9. 动态图层
    //   叠放次序 = append 顺序（后 append 的在上层）：
    //     gHits   最底 → 透明热区（铺满 135 点，负责"点空格"）
    //     gHints          → 选中环 + 金色落点圆
    //     gPieces         → 棋子
    //     gFocus  最上 → 「上一步」走子痕迹。**必须在最上**才不会被棋子遮住；
    //                     同时整体 pointer-events:none，绝不能挡住点击。
    //   【2026-09-24 夜 · 老师报「魏国的士凭空消失」】
    //     根因不是丢子，而是**看不到"谁吃掉的"**：炮是远距离吃子（可从棋盘一端
    //     沿贯通纵线打到另一端），吃完还可能继续走 ⇒ 页面上只剩"某个子没了"，
    //     像凭空消失。之前 gFocus 声明了却从未使用，本函数补上这块视觉反馈。
    //   【2026-10-01】四个动态图层补上语义 class：测试与调试**按名字查**，
    //     不再依赖「svg.children 里的第几个 <g>」。那种索引写法一加图层就
    //     集体失效 —— 本轮加三角区标记（第 3 步也 append 一个 <g>）时正好撞上，
    //     三个前端测试同时误取图层。加 class 后这类改动不再波及它们。
    gHits = el('g', { class: 'lyr-hits' }); svg.appendChild(gHits);
    gHints = el('g', { class: 'lyr-hints' }); svg.appendChild(gHints);
    gPieces = el('g', { class: 'lyr-pieces' }); svg.appendChild(gPieces);
    gFocus = el('g', { class: 'lyr-focus', 'pointer-events': 'none' }); svg.appendChild(gFocus);
    // AI 推荐示意层：压在**最上层**（走子痕迹之上）。
    //   理由：它是"老师此刻正在看的东西"（主动点出来的），必须压得住红/橙痕迹
    //   与棋子；而层数只有主动点击「推荐下一步」时才有内容，不会常驻干扰。
    gHint = el('g', { class: 'lyr-hint', 'pointer-events': 'none' });
    svg.appendChild(gHint);

    // ---- 10. 【2026-09-24 修 · 老师报的「点亮棋子后点落点，棋子不动」】
    //   旧实现**只给棋子**绑了 click（见 renderPieces），**空格落点根本没有事件**：
    //     · 走子（目标为空点）→ 永远点不动 ← 老师遇到的就是这个
    //     · 吃子（目标有对方棋子）→ 碰巧能走
    //   现在给**全部 135 个格点**铺一层半径≈棋子的**透明热区**，
    //   放在静态层之上、棋子/提示层之下 → 点哪儿都能命中。
    Object.keys(D.points).forEach(p => {
      const q = xy(p);
      if (!q) return;
      const hit = el('circle', {
        cx: q[0], cy: q[1], r: 3.9,
        fill: 'transparent', 'pointer-events': 'all'
      });
      hit.addEventListener('click', () => { if (onPick) onPick(p); });
      gHits.appendChild(hit);
    });
  }

  // ---- 中央三角区「枢纽」标记（老师 2026-10-01 新增）----
  //   背景：新规则「兵到达中心三角区格点后，可沿三条边自由回跳（含跨方）」。
  //   老师原话：「现在玩家点兵能看到 255/355 被高亮，但看不出『这是个枢纽』
  //   ——加个标记会更直观」。
  //   ⇒ 必须在**未选中任何棋子**时也能一眼看出「这里是一块特殊区域」。
  //
  //   视觉约定（务必与「落点提示」区分开，两者都与金/黄沾边）：
  //     · 落点提示 = 琥珀**实心点** #d69e2e（下一步去哪）
  //     · 三角区   = 香槟金**细轮廓 + 淡暖光底**（这是哪个区域）＋ 三顶点金环
  //   分层：外柔光（把边界撑开，否则细线在木色底上看不见）／主轮廓（细而清晰）
  //         ／顶点双环（粗淡 + 细实，做出"戒指"感）／中心低对比小字。
  //
  //   ⚠️ 两个必须：
  //     ① 画在**网格线之前**（网格线是后画的，会压在这一层之上）；
  //     ② `pointer-events:none`（否则这块多边形会吃掉下面 135 个点击热区，
  //        三角区内的空格就点不动了）。
  //
  //   2026-10-01 真机截图自查后**整体加强约 40%**：
  //   第一版取 1.05 线宽 / 0.20 填充，缩到整页尺度时与棋盘自带的褐色网格线
  //   （0.42 宽）同色系、几乎看不出是"一块区域"。老师要的是"更直观"，
  //   而这段视觉的成败**只能靠看图**判断（DOM 断言不出来）——
  //   截图脚本见 tests/_shot_tri.js。
  function _drawTriZone() {
    const pts = TRI_PTS.map(xy).filter(Boolean);
    if (pts.length < 3) return;                       // 数据缺失就别画半个三角
    const flat = pts.map(p => p.join(',')).join(' ');
    const g = el('g', { class: 'tri-hub', 'pointer-events': 'none' });

    // ① 淡暖光底 + 柔光外描边（一起画：同一个 polygon 走 fill + 粗 stroke）
    g.appendChild(el('polygon', {
      class: 'tri-glow',
      points: flat, fill: TRI_GOLD_FILL, 'fill-opacity': 0.26,
      stroke: TRI_GOLD, 'stroke-width': 4.0, 'stroke-opacity': 0.22,
      'stroke-linejoin': 'round'
    }));
    // ② 主轮廓：细、实、清晰 —— 「这是个三角区」的主信号
    //    比棋盘网格线（0.42）明显粗，但远细于棋子半径（4.05）⇒ 读作"线"不读作"块"
    g.appendChild(el('polygon', {
      class: 'tri-edge',
      points: flat, fill: 'none',
      stroke: TRI_GOLD, 'stroke-width': 1.4, 'stroke-opacity': 1,
      'stroke-linejoin': 'round'
    }));
    // ③ 三顶点金环 —— 明示「这三个点本身是枢纽」（区域内并没有别的格点）
    pts.forEach(p => {
      g.appendChild(el('circle', {
        class: 'tri-ring',
        cx: p[0], cy: p[1], r: 3.15, fill: 'none',
        stroke: TRI_GOLD, 'stroke-width': 3.1, 'stroke-opacity': 0.20
      }));
      g.appendChild(el('circle', {
        class: 'tri-ring',
        cx: p[0], cy: p[1], r: 3.15, fill: 'none',
        stroke: TRI_GOLD, 'stroke-width': 1.15, 'stroke-opacity': 1
      }));
    });
    // ④ 中心小字（低对比：给"这块是什么"起个名，但绝不跟棋子抢视线）
    //   三角形重心 = 三个顶点的算术平均；该处是全盘唯一无格点的开阔区。
    //   **透明文字背景**（老师 2026-10-01）：原为「白色胖字垫底 + 金色叠印」两层，
    //   那层白边在浅色木盘上会读成一个白块。现改单层金色字。
    //   【2026-10-01 二调】同 `_lab()`：`bold` → `normal`，并**去掉同色描边**
    //   （老师原话「不需要描边」）。金色标签字重降下来 + 无描边后笔画更清秀，
    //   靠 `fill-opacity 0.95` 与略大的字号维持可读性。
    const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
    const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    g.appendChild((() => {
      const n = el('text', {
        x: cx, y: cy + 1.5, 'text-anchor': 'middle',
        'font-size': 4.7, 'font-weight': 'normal', 'letter-spacing': '0.4',
        'font-family': 'STKaiti,KaiTi,serif',
        fill: TRI_GOLD, 'fill-opacity': 0.95,
        stroke: 'none', class: 'tri-label'
      });
      n.textContent = '三角区';
      return n;
    })());

    triNode = g;
    svg.appendChild(g);
  }

  function renderPieces(pieces) {
    const occupied = {};
    (pieces || []).forEach(pc => { occupied[pc.pos] = true; });
    // 有棋子处隐藏坐标
    Object.keys(coordNodes).forEach(p => {
      coordNodes[p].style.display = occupied[p] ? 'none' : '';
    });

    gPieces.innerHTML = '';
    (pieces || []).forEach(pc => {
      const q = xy(pc.pos);
      if (!q) return;
      const a = pc.army, home = pc.home;
      const g = el('g', { class: 'piece' });
      g.appendChild(el('circle', {
        cx: q[0], cy: q[1], r: 4.05, fill: '#fdfbf5',
        stroke: AC[a], 'stroke-width': 0.85
      }));
      g.appendChild(el('circle', {
        cx: q[0], cy: q[1], r: 3.25, fill: 'none',
        stroke: AC[a], 'stroke-width': 0.28, 'stroke-opacity': 0.6
      }));
      const t = el('text', {
        x: q[0], y: q[1] + 1.55, 'text-anchor': 'middle',
        'font-size': 4.6, 'font-weight': 'bold',
        fill: AC[a], 'font-family': 'STKaiti,KaiTi,SimSun,serif'
      });
      // 【2026-09-24 改】副帅与主帅原来都写「帥」，只靠一个金圈区分，
      //   老师观战时误以为「帅被吃了却没从棋盘消失」。
      //   规则原文确实要求副帅驻在被吃方军帐（「吃 A 帅的棋子为 B 方副帅，
      //   在 A 方军帐内行使帅的职责」），所以它必须留在盘上 —— 那就把字写清楚。
      const isDep = !!pc.deputy;
      t.textContent = isDep ? '副帥' : (KINDS[pc.kind] || '?');
      if (isDep) t.setAttribute('font-size', 2.9);
      g.appendChild(t);
      if (isDep) {
        g.appendChild(el('circle', {
          cx: q[0], cy: q[1], r: 4.5, fill: 'none',
          stroke: '#d69e2e', 'stroke-width': 0.55
        }));
      } else if (home !== a) {
        g.appendChild(el('circle', {
          cx: q[0] + 3.1, cy: q[1] - 3.1, r: 0.95, fill: '#d69e2e'
        }));
      }
      g.style.cursor = 'pointer';
      g.addEventListener('click', () => onPick && onPick(pc.pos));
      gPieces.appendChild(g);
    });
  }

  function setLegal(fromPos, targets) {
    // 【2026-09-24 修】轮询每 500ms 调一次 render，若每次都重建提示元素，
    //   恰好点中的那一瞬会被销毁 → 点击丢失。签名不变就**不重建**。
    const sig = fromPos + '|' + (targets || []).join(',');
    if (sig === _lastHints) return;
    _lastHints = sig;

    // 【2026-10-01】选中的棋子正站在三角区格点上 ⇒ 枢纽标记转**激活态**
    //   （CSS 里：轮廓加粗、暖光加深）。直接回答老师那句「看不出这是个枢纽」：
    //   未选中时是"这里有个区域"，选中枢纽棋子时是"这块区域正在起作用"。
    //   ⚠️ 用 setAttribute 而非 classList：Node 测试的 DOM 桩只实现了前者。
    const act = TRI_PTS.indexOf(fromPos) >= 0;
    if (act !== _triActive) {
      _triActive = act;
      if (triNode) triNode.setAttribute('class', 'tri-hub' + (act ? ' active' : ''));
    }

    gHints.innerHTML = '';
    if (!fromPos || !targets) return;
    const q = xy(fromPos);
    if (!q) return;
    gHints.appendChild(el('circle', {
      cx: q[0], cy: q[1], r: 4.6, fill: 'none',
      stroke: '#d69e2e', 'stroke-width': 0.7
    }));
    targets.forEach(t => {
      const r = xy(t);
      if (!r) return;
      // 落点圆本身**可点击**（半径放大到 2.8，手感接近棋子）
      const dot = el('circle', {
        cx: r[0], cy: r[1], r: 2.8, fill: '#d69e2e', 'fill-opacity': 0.9,
        stroke: '#8a6a1e', 'stroke-width': 0.35,
        'pointer-events': 'all', style: 'cursor:pointer'
      });
      dot.addEventListener('click', () => { if (onPick) onPick(t); });
      gHints.appendChild(dot);
    });
  }
  function clearHints() {
    // 取消选择时，三角区标记也要从「激活态」退回常态
    if (_lastHints === '' && !_triActive) return;
    _lastHints = '';
    gHints.innerHTML = '';
    if (_triActive) {
      _triActive = false;
      if (triNode) triNode.setAttribute('class', 'tri-hub');
    }
  }

  // ---- 「上两手」走子痕迹（2026-09-24 夜新增，2026-09-25 扩为两手）----
  //   老师原话①：「为何我魏国的士凭空消失了」
  //   老师原话②：「在图上用红色虚线标记前一个战报的下棋路径，从哪到哪位置，
  //                吃了什么，都要直观讲清楚」
  //   老师原话③（2026-09-25）：「目前你会用红色虚线显示前一次走棋，但不够，
  //                我需要前两次，分别用红色和橙色虚线表示前一次和前两次」
  //   根因：炮是**远距离**吃子（可沿贯通纵线从棋盘一端打到另一端），而且吃完
  //         还可能继续走 ⇒ 只看静态盘面完全看不出"谁吃掉的"，观感就是丢子。
  //         只手看一手也不够：上一手常常是"吃子"，而**被吃的原因**在再往前一手
  //         （对方刚把子送到这里 / 自己刚让开挡住炮架的子）⇒ 要连着看两步。
  //   两级视觉约定（与方别无关；方别由顶部提示条与战报说明）：
  //     · 最近一手（红）＝ 完全保留老师已认可的样式：虚线 + 箭头 + 起终点圈 + 文字标签
  //     · 再往前一手（橙）＝ 虚线 + 箭头 + 起终点圈 + 「前」字前缀的小标签
  //   为避免两手共用格点时糊成一团，橙色的环**整体比红色大一圈**（同心双环可辨），
  //   且橙字外推更远、字号更小（不与红字叠字）。
  //   两个文字标签向**背离对方**的方向外推，避免压住路径中间的棋子；
  //   再夹到 viewBox 内（±124/±108，留出文字半宽），防止贴边时被裁掉。
  //   文字用**透明背景的单层彩色字** + 同色细描边（老师 2026-10-01 指定：不要白底
  //   色块），既有足够的笔画实感，又不会在盘面上糊出一块白。
  const MOVE_LAST = '#c02626';             // 最近一手：红（老师 2026-09-24 指定）
  const MOVE_PREV = '#e07a10';             // 再往前一手：橙（老师 2026-09-25 指定）

  // 两级样式表（数值单位＝棋盘坐标，棋子半径 4.05）
  const ST_LAST = {
    color: MOVE_LAST, dash: '2.6 2.0', lw: 0.62, op: 0.95,
    tip: 5.6, rStart: 5.2, rEnd1: 5.0, rEnd2: 5.8, lwEnd1: 1.05,
    tag: '', fs: 3.4, push: 7.8
  };
  const ST_PREV = {
    color: MOVE_PREV, dash: '2.2 1.9', lw: 0.5, op: 0.82,
    // 【2026-09-25 调】橙色环比红色**外移**，不能只大 0.1 —— 首次极近景自查发现
    //   橙环紧贴红外环（5.8 vs 5.9），看着像"红环描了一圈橙边"，分不清是两手。
    //   现拉到 6.6/7.3：与红外环 5.8 留出 ≈0.8 的可见间隙，同心时是干净的
    //   「内红双环 + 外橙双环」。箭头尖也随之外移到 6.9（落在橙双环之间）。
    tip: 6.9, rStart: 6.4, rEnd1: 6.6, rEnd2: 7.3, lwEnd1: 0.6,
    tag: '前', fs: 2.8, push: 10.8
  };

  function _lab(x, y, txt, color, fs, sw) {
    // **透明文字背景**（老师 2026-10-01：「棋盘上的文字背景…是透明文字背景的好」）。
    //   原来是「白色胖字垫底 + 彩色字叠印」两层 —— 那层白边在浅色木盘上会读成
    //   一个**白色色块**，盖住网格线与色带，观感像贴了张白纸。
    //   现在改成**单层彩色字**：无任何背景填充。
    //
    // 【2026-10-01 二调 · 老师原话】
    //   ①「去白底后，你的字体太粗了，是黑体太粗了」
    //   ②「注意，不需要描边」
    //   ⇒ `font-weight` 由 bold 改 **normal**；那道同色描边**彻底去掉**
    //     （`stroke: 'none'`）。
    //   ★ 病根是同一条：`bold` 的字形外面再叠一道 0.5 宽的同色描边，
    //     等于把笔画**又加肥一层**。在 3.4 号的小字上，这一层尤其致命 ——
    //     楷体的横竖本来就细，加完粗+描边后笔画糊在一起，看着就是"黑体"。
    //     去白底时我加它是为了"笔画实"（怕字发虚），但代价是字变粗，得不偿失。
    //   现口径 = **纯单层彩色字，只有 fill，stroke 明确 none**。
    //   `sw` 形参保留（调用点仍在传值）但**不再写入任何属性** —— 留个口子，
    //     万一以后真要在深色块上补救，不必回头改调用点。
    // ⚠️ `el()` 只做 setAttribute，文本必须显式赋 `textContent`
    //    （写成 `el('text', {textContent: txt})` 是无效的 —— setAttribute 不认这个键）。
    const X = Math.max(-112, Math.min(112, x));      // 夹进可视区（文字半宽≈10）
    const Y = Math.max(-100, Math.min(100, y));
    const c = color || MOVE_LAST;
    const t = el('text', {
      x: X, y: Y, 'text-anchor': 'middle',
      'font-size': fs || 3.4, 'font-weight': 'normal',
      'font-family': 'STKaiti,KaiTi,SimSun,serif',
      fill: c, 'fill-opacity': 0.98,
      stroke: 'none'
    });
    t.textContent = txt;
    const g = el('g', { class: 'mv-lab' });
    g.appendChild(t);
    return g;
  }

  // 单手签名：轮询每 800ms 调一次，签名不变就**不重建**（否则会抽掉正在看的标记）
  function _msig(mv) {
    return (mv && mv.from && mv.to)
      ? `${mv.from}-${mv.to}-${mv.army || ''}-${mv.captured || ''}${mv.is_deputy ? '-dep' : ''}` : '';
  }

  // 画一手：虚线路径 → 箭头 → 起点虚线圈 → 终点双实环 → 文字标签
  function _drawMove(mv, st) {
    const p = xy(mv.from), q = xy(mv.to);
    if (!p || !q) return;
    const dx = q[0] - p[0], dy = q[1] - p[1];
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 0.001) return;
    const ux = dx / d, uy = dy / d;        // 单位向量（起点 → 终点）

    // ① 虚线：from → to 的完整路径
    gFocus.appendChild(el('line', {
      x1: p[0], y1: p[1], x2: q[0], y2: q[1],
      stroke: st.color, 'stroke-width': st.lw,
      'stroke-dasharray': st.dash, 'stroke-opacity': st.op,
      'stroke-linecap': 'round'
    }));
    // ② 箭头（箭头尖停在终点环之前，别把终点盖住）
    const tip = [q[0] - ux * st.tip, q[1] - uy * st.tip];
    const bL = [tip[0] - ux * 2.6 - uy * 1.6, tip[1] - uy * 2.6 + ux * 1.6];
    const bR = [tip[0] - ux * 2.6 + uy * 1.6, tip[1] - uy * 2.6 - ux * 1.6];
    gFocus.appendChild(el('polygon', {
      points: `${tip[0]},${tip[1]} ${bL[0]},${bL[1]} ${bR[0]},${bR[1]}`,
      fill: st.color, 'fill-opacity': st.op
    }));
    // ③ 起点：虚线圈（必须大于棋子半径 4.05，否则被盖住看不见）
    gFocus.appendChild(el('circle', {
      cx: p[0], cy: p[1], r: st.rStart, fill: 'none',
      stroke: st.color, 'stroke-width': st.lw * 0.89,
      'stroke-dasharray': '1.6 1.4', 'stroke-opacity': st.op
    }));
    // ④ 终点：双实环
    gFocus.appendChild(el('circle', {
      cx: q[0], cy: q[1], r: st.rEnd1, fill: 'none',
      stroke: st.color, 'stroke-width': st.lwEnd1,
      'stroke-opacity': Math.min(1, st.op + 0.05)
    }));
    gFocus.appendChild(el('circle', {
      cx: q[0], cy: q[1], r: st.rEnd2, fill: 'none',
      stroke: st.color, 'stroke-width': 0.4, 'stroke-opacity': 0.6
    }));
    // ⑤ 文字标签：起点向"背离终点"外推，终点向"背离起点"外推
    //    「吃 士」里的棋子名用棋盘上的繁体字（KINDS），与盘面字形一致。
    //    橙手带「前」前缀 + 更远外推 + 更小字号 → 与红标签分离，不叠字。
    //     `sw` = 同色细描边的宽度（不是白色垫底层！透明背景，只把笔画加实）
    gFocus.appendChild(_lab(p[0] - ux * st.push, p[1] - uy * st.push + 1.2,
      `${st.tag}起 ${coordLabel(mv.from)}`, st.color, st.fs, st.lw * 0.95));
    gFocus.appendChild(_lab(q[0] + ux * st.push, q[1] + uy * st.push + 1.2,
      `${st.tag}到 ${coordLabel(mv.to)}`
      // 【2026-10-01】吃**副帥**不能写成「吃帥」—— 老师正是被这个
      //   「吃帥」误导，以为蜀車吃了吴的主帅却没升格（实际吃的是副帥，
      //   依《一、7》不产生新副帅）。`is_deputy` 由服务端 move note 带下来。
      + (mv.captured
         ? ` 吃${mv.is_deputy ? '副帥' : (KINDS[mv.captured] || mv.captured)}`
         : ''),
      st.color, st.fs, st.lw * 0.95));
  }

  // moves = [最近一手, 再往前一手]（缺省/空数组都安全）
  function setMoveTrail(moves) {
    const m0 = (moves && moves[0]) || null;      // 最近一手 → 红
    const m1 = (moves && moves[1]) || null;      // 再往前一手 → 橙
    const sig = _msig(m0) + '||' + _msig(m1);
    if (sig === _lastFocus) return;              // 轮询频繁调用，签名不变不重建
    _lastFocus = sig;
    gFocus.innerHTML = '';
    if (m1) _drawMove(m1, ST_PREV);              // 先画更早的 → 被红手压在上层
    if (m0) _drawMove(m0, ST_LAST);
  }

  // 向后兼容：只传一手（等价于「最近一手」）
  function setLastMove(mv) { setMoveTrail(mv ? [mv] : []); }

  // ---- AI 推荐下一步 · 蓝虚线示意（老师 2026-10-01）----
  //   老师原话：「加一个功能，可以一键推荐人类玩家走一下一步在棋盘上示意，
  //   但不帮他落子。你可以用蓝色虚线箭头加文字示意，推荐下一步必须专业，
  //   用上你最高档的 12 plies 的下棋智商」。
  //
  //   ★ 这一层是**纯示意**，三条硬约束：
  //     ① 只画线，**绝不落子** —— 前端不调 /api/move，后端 /api/hint 也深拷贝局面搜索；
  //     ② `pointer-events:none` —— 蓝线不参与点击，135 个热区一个都不能被它吃掉；
  //     ③ 与「走子痕迹」**视觉可分**：痕迹是红/橙**圆环**（走过的点），
  //        推荐是蓝**虚线 + 方框**（建议落点）—— 形状与颜色双重区分，不会看混。
  //
  //   `h` = {from, to, captured, ply, note}；传 null / 空对象 = 清除。
  function setHint(h) {
    if (!gHint) return;
    const sig = (h && h.from && h.to)
      ? `${h.from}-${h.to}-${h.ply == null ? '' : h.ply}-${h.army || ''}`
      : '';
    if (sig === _lastHint) return;      // 轮询每 800ms 调一次，签名不变就不重建
    _lastHint = sig;
    gHint.innerHTML = '';
    if (!sig) return;                   // 清除态
    const p = xy(h.from), q = xy(h.to);
    if (!p || !q) return;
    const dx = q[0] - p[0], dy = q[1] - p[1];
    const d = Math.hypot(dx, dy);
    if (d < 0.001) return;
    const ux = dx / d, uy = dy / d;

    // ① 蓝色虚线：from → to 的完整路径
    gHint.appendChild(el('line', {
      class: 'hint-path', x1: p[0], y1: p[1], x2: q[0], y2: q[1],
      stroke: HINT_BLUE, 'stroke-width': 1.0,
      'stroke-dasharray': '3.6 2.2', 'stroke-opacity': 0.95,
      'stroke-linecap': 'round'
    }));
    // ② 箭头（实心三角，停在终点方框之前，别把落点盖住）
    const tip = [q[0] - ux * 7.0, q[1] - uy * 7.0];
    const bL = [tip[0] - ux * 3.2 - uy * 2.0, tip[1] - uy * 3.2 + ux * 2.0];
    const bR = [tip[0] - ux * 3.2 + uy * 2.0, tip[1] - uy * 3.2 - ux * 2.0];
    gHint.appendChild(el('polygon', {
      class: 'hint-tip',
      points: `${tip[0]},${tip[1]} ${bL[0]},${bL[1]} ${bR[0]},${bR[1]}`,
      fill: HINT_BLUE, 'fill-opacity': 0.95
    }));
    // ③ 起点：虚线圈（半径 > 棋子 4.05，否则被棋子整个盖住）
    gHint.appendChild(el('circle', {
      class: 'hint-src', cx: p[0], cy: p[1], r: 5.4, fill: 'none',
      stroke: HINT_BLUE, 'stroke-width': 0.6,
      'stroke-dasharray': '1.8 1.5', 'stroke-opacity': 0.9
    }));
    // ④ 终点：**方框**（刻意区别于红/橙手的圆环 ——「建议落点」≠「已走过的点」）
    const rs = 4.9;
    gHint.appendChild(el('rect', {
      class: 'hint-dst', x: q[0] - rs, y: q[1] - rs,
      width: rs * 2, height: rs * 2, rx: 0.9, fill: 'none',
      stroke: HINT_BLUE, 'stroke-width': 0.85, 'stroke-opacity': 0.92
    }));
    // ⑤ 文字：与走子痕迹共用 `_lab()`（透明背景、**无描边**、normal 字重，
    //    —— 老师 2026-10-01 定稿的口径，别在这里另起一套样式）
    gHint.appendChild(_lab(p[0] - ux * 9.0, p[1] - uy * 9.0 + 1.2,
      `推荐 起 ${coordLabel(h.from)}`, HINT_BLUE, 3.4));
    gHint.appendChild(_lab(q[0] + ux * 9.6, q[1] + uy * 9.6 + 1.2,
      `到 ${coordLabel(h.to)}`
      + (h.captured ? ` 吃${KINDS[h.captured] || h.captured}` : ''),
      HINT_BLUE, 3.4));
    // ⑥ 副标：如实写出"AI 算了多深"。
    //    老师要的是「专业」—— 深度与估值就是专业度的凭据，藏起来反而不专业。
    if (h.note) {
      gHint.appendChild(_lab(q[0], q[1] + 9.6, h.note, HINT_BLUE, 2.7));
    }
  }

  function clearHint() { setHint(null); }

  function setPickHandler(fn) { onPick = fn; }

  return {
    init, renderPieces, setLegal, clearHints, setMoveTrail, setLastMove,
    setHint, clearHint,
    setPickHandler, label: coordLabel
  };
})();
