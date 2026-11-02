'use strict';
/*
 * score.cjs —— 「十二个字」的打分表 + 六条方针大纲，唯一来源。
 *
 * 为什么要单独一个文件：页面上的雷达、表格、合计、置顶大纲、以及 test-hex 的断言
 * 如果各写一遍，迟早会出现「表里 6 分、图上 7 分」「大纲说没做、下面说部分成立」这种
 * 对一个东西两种说法的事。这里算一次，别处只许读。
 *
 * 规矩（跟页面同一条）：
 *   ① 分数是判断，但判断必须挂在能从 _crisi_result.json 复算的量上；
 *   ② 每个字的分 = 阶梯函数(实测量)，不是手填的数 —— 这样改一个输入，分数会跟着动；
 *   ③ 拿不到量的，分给 0，并把理由写成「未做」，不写「部分实现」。
 */
const H = require('./hexagram.cjs');

/* 两件实测（2026-11-02「点头」后新增）。缺失时降级为 null，
 * 绝不让旧口径冒充「有数」：文件不在，通天就回 0，页面自己会说没测。
 * —— 这是「分数必须挂在实测上」的执行细节，不是可选装饰。 */
function tryLoad(p) { try { return require(p); } catch (e) { return null; } }
const INT = tryLoad('./_intensity_result.json');
const ANCH = tryLoad('./_anchor_result.json');
/* 「演绎」从「只看回访间隔」升级成「解析预测稳态分布」的那份实测。
 * 缺失 ⇒ 退回旧判据（观测档），绝不假装有解析预测。 */
const DED = tryLoad('./_deduce_result.json');
/* 「演绎」第二次升级：把「自改那一半」也解析出来（θ 的漂移轨迹与终点）。
 * 缺失 ⇒ 只是不加那 2 分，绝不假装算过。 */
const THT = tryLoad('./_theta_result.json');

/* 阶梯：pairs 按阈值从高到低排，x 达到哪一档就取哪一档的值。
 * 用法 pick(19.05, [[15,8],[8,7],[3,5],[0,3]]) ⇒ 8 */
function pick(x, pairs) {
  for (let i = 0; i < pairs.length; i++) if (x >= pairs[i][0]) return pairs[i][1];
  return pairs[pairs.length - 1][1];
}

/* 档位＝对分的定性标签。0 分有两种，必须分开：测到是 0（零）与没测（未做）。
 * 所以档位从分推，只有「未做」是显式指定的 —— 否则「选美 0」会被写成「未做」，
 * 那是在替它掩盖：它明明测了，只是测出来是 0。 */
function bandOf(sc) {
  return sc >= 8 ? 'ok' : sc >= 5 ? 'part' : sc >= 1 ? 'weak' : 'zero';
}

const i0 = (x) => Math.round(x).toLocaleString('en-US');
const f2 = (x) => (Math.round(x * 100) / 100).toFixed(2);
const f3 = (x) => (Math.round(x * 1000) / 1000).toFixed(3);

/* §8 里 B「可审计」是 8 分 —— 但那是**交付质量尺**，量的是「我给系统写了多少测试」。
 * 🔴 严格口径（2026-11-02 老师点头）：审计者的能力不能记到被审计者头上。
 *    达真的分只由「系统自己看不看得见符号」给；AUDIT_SCORE 只出现在 evid 里，
 *    作为「不计入本尺」的说明，不再混进分数。 */
const AUDIT_SCORE = 8;

/* ── 六条方针的四种状态。屏上、探针、测试都读这一份，谁也不许另写一套词。 ── */
const ST_ZH = {
  done: '已成立',
  ready: '改法已定 · 未做',
  outside: '待外部 · 未做',
  none: '没做',
};

/* ── plan：十二个字作为「下一步」的六条方针（页面置顶的那张大纲）──
 * 状态只有四档，全部由「有没有数」决定，不由我觉得：
 *   done    已成立 —— 在跑，而且有数
 *   ready   改法已定·未做 —— 知道怎么改，还没改，也还没有数
 *   outside 待外部·未做 —— 缺的是系统之外的东西（本页欠的那条正向实验）
 *   none    没做 —— 连要的东西都还不存在（第二张真表）
 * 🔴 四档之外没有中间态。拿不到数的，一律落「未做」。 */
function makePlan(c) {
  return [
    {
      ord: 1, zh: '归纳', st: 'done',
      what: '可逆表征：64 个值 ⇄ 6 个权重',
      check: '反推 6 个权重，重建全部 64 个值偏差为 0',
      evid: '偏差 ' + c.maxDev.toExponential(2) + '，压缩 ' + f2(64 / 6) + '×',
      at: '§9.2',
    },
    {
      /* 🔴 这一条原来写的是「累计 cover 换成滑窗覆盖」，那条改法已经做完
       *    （§9.2 现在判的是回访间隔；解析稳态也已做，§9.7；自改的期望轨迹 §9.8）。
       *    大纲列的是**下一步**，不是已经做完的事 —— 做完的挪到下面的分里说。
       *    演绎现在 8／10，扣的 2 分就是这一条。 */
      ord: 2, zh: '演绎', st: 'ready',
      what: '再推一步：θ 的涨落分布（不是期望）',
      check: '三颗种子间 θ(t) 的散布能从转移核算出来，而不是只报出来',
      evid: '没算过：只推出期望轨迹（中位误差 ' + f2(c.thMed * 100) + '%），种子间 ' + f2(c.thNoise * 100) + '% 的散布仍只报不推',
      at: '§9.8',
    },
    {
      ord: 3, zh: '选美', st: 'ready',
      what: 'γ 移出 θ：采样温度或硬下限',
      check: 'γ 全程 ≥ 初始下限 ' + c.g0,
      evid: '没算过：γ 仍写在 θ 里，终值被学成 ' + f3(c.gEnd),
      at: '§9.5',
    },
    {
      ord: 4, zh: '尽善', st: 'ready',
      what: '门判据与 Ω 同级只读 + 保留集',
      check: '否决率显著低于现在的 ' + c.rejPct + '%',
      evid: '没做过保留集：门读的是当步轨迹，' + c.rejPct + '% 否决（' + i0(c.gateAcc) + '／' + i0(c.gateRej) + '）',
      at: '§7.2',
    },
    {
      ord: 5, zh: '达真', st: 'outside',
      what: '外部参照 —— 唯一能看见符号的东西',
      check: 'θ 在 Ω → max − V 下会变',
      evid: c.ancReady
        ? '没做过：外部参照实验仍是 0 次。做过的两次全是证伪 —— 内部恒等式（θ 不变）、单点锚（谦在 V 下排 ' +
          c.ancR + '、在 max−V 下排 ' + c.ancA + '，这个锚反而更认可那张翻转表）'
        : '没做过：外部参照实验 0 次；锚是 384 条爻辞里没进 V 的卦效应，不是第二张表',
      at: '§5⑤',
    },
    {
      ord: 6, zh: '通天', st: 'ready',
      what: '迁强度量不迁 θ：先把控制参数 g 对齐，再看序参量稳不稳',
      check: '归一化后 d_in < d_out 且 d_in < d_rand，余量 ≥ 3×，信噪比 ≥ 3',
      evid: c.intPass > 0
        ? '没做过迁移（0 次）；序参量已测：' + c.intPass + ' 个过三道门（' + c.intPassNames + '），另有 ' +
          c.intRej + ' 个候选被挡下'
        : '没做过：迁移 0 次；现有 ' + c.nGroups + ' 组里 max−V 根本不是第二张表（它是这张表的对称像），独立序 1 个',
      at: '§6',
    },
  ];
}

/* 大纲的自洽检查 —— 这几条是「状态」这件事本身的护栏，不是版面装饰：
 *   ① 六条、序号连续，顺序是那条依赖链，不许乱；
 *   ② 状态只能是四档，每条的依据必须给出，不许空着含糊过去；
 *   ③ 没做的那条，依据里必须明说「没算过／没做过」—— 拿别的组的数冒充现状是最容易犯的错；
 *   ④ 「已成立」只许一条（归纳），多一条就是在给自己发安慰分，且它必须真有数；
 *   ⑤ 四档之外没有第五档：出现「部分实现」这类词直接抛。 */
function assertPlan(plan) {
  const ST = ['done', 'ready', 'outside', 'none'];
  if (!Array.isArray(plan) || plan.length !== 6) {
    throw new Error('大纲是六条，现在是 ' + (plan && plan.length) + ' 条');
  }
  plan.forEach((p, i) => {
    if (p.ord !== i + 1) throw new Error('大纲第 ' + (i + 1) + ' 条的序号是 ' + p.ord);
    if (ST.indexOf(p.st) < 0) throw new Error('「' + p.zh + '」的状态 ' + p.st + ' 不在四档里');
    if (!p.what || !p.check || !p.evid) throw new Error('「' + p.zh + '」有一条是空的');
    if (/部分实现|部分完成|基本完成/.test(p.what + p.check + p.evid)) {
      throw new Error('「' + p.zh + '」用了中间态的词：四档之外不许有第五档');
    }
    if (p.st !== 'done' && !/没算过|没做过/.test(p.evid)) {
      throw new Error('「' + p.zh + '」没做，但依据里没说清是没算过还是没做过：' + p.evid);
    }
  });
  const nDone = plan.filter((p) => p.st === 'done').length;
  if (nDone !== 1) throw new Error('「已成立」只许一条，现在是 ' + nDone + ' 条');
  if (plan.filter((p) => p.st === 'outside').length !== 1) throw new Error('「待外部」只许一条');
  if (plan.filter((p) => p.st !== 'done').length !== 5) throw new Error('未做的必须正好 5 条');
  if (!/[eE]\+0|×/.test(plan[0].evid)) throw new Error('归纳标了已成立，但依据里没有数：' + plan[0].evid);
  return plan;
}

function build(R, TOTAL, opts) {
  /* 可注入实测（只给测试用）：opts.int / opts.anch 覆盖文件读取。
   * 有它才能做变异测试 —— 把某个 pass 改成 false，看分是不是真的跟着掉；
   * 没有它，「分挂在实测上」这句话就只是我在文档里这么写。 */
  const INTV = (opts && opts.int) || INT;
  const ANCV = (opts && opts.anch) || ANCH;
  const DEDV = (opts && opts.ded) || DED;
  const THV = (opts && opts.theta) || THT;
  const M = R.meta;
  const G = {};
  const S = {};
  R.groups.forEach((g) => { G[g.key] = g; S[g.key] = g.stats; });

  /* ── 归纳：64 个值 ⇄ 6 个权重，能不能反推回来 ──
   * 爻位 i 对应码的哪一位不靠猜：用 codeToBits(1<<k) 实测反推（同 test-hex Q22）。 */
  const Vw = R.V;
  const bitOf = [];
  for (let i = 0; i < 6; i++) {
    let hit = -1;
    for (let k = 0; k < 6; k++) if (H.codeToBits(1 << k)[i]) hit = k;
    bitOf.push(hit);
  }
  const w = bitOf.map((k) => Vw[1 << k] - Vw[0]);
  let maxDev = 0;
  for (let v = 0; v < 64; v++) {
    const b = H.codeToBits(v);
    let r = Vw[0];
    for (let i = 0; i < 6; i++) if (b[i]) r += w[i];
    maxDev = Math.max(maxDev, Math.abs(r - Vw[v]));
  }
  const rev = maxDev < 1e-12 ? 1 : 0;

  /* ── 演绎：按回访间隔判，不看累计覆盖 ── */
  const ageA = S.A.ageAll;
  const ageC = S.C.ageAll;
  const span = ageA / M.mwin;                     // ＝多少个窗口才回来一次

  /* ── 演绎：解析预测是否成立（_deduce.cjs）──
   * 🔴 为什么不能只看「最差卦多久不回来」：那是在看后端，不是在推。
   *    现在多了一条：从 6 个权重 + θ 解自洽不动点，能预测 4096 个增广状态的稳态分布。
   *    判据要三样同时成立，缺一不给：
   *      ① 自预测中位误差 < 15%（模型不是「知道大概均匀」）
   *      ② 交叉预测 / 自预测 ≥ 3×（用错表必须崩，否则判据没牙）
   *      ③ 自预测误差 / 种子噪声底 ≥ 3（准不是靠样本多）
   *    通过给 6 分：只覆盖「θ 冻结」的稳态，自改那一半仍是模拟、动力学不收敛（周期 2）。 */
  const DC = DEDV && DEDV.cross ? DEDV.cross : null;
  const dedSelf = DC ? DC.selfMed : NaN;
  const dedSep = DC ? DC.sep : NaN;
  const dedNoise = DC ? DC.noiseMed : NaN;
  const dedSnr = Number.isFinite(dedSelf) && dedNoise > 0 ? dedSelf / dedNoise : NaN;
  const dedOk = Number.isFinite(dedSelf) && dedSelf < 0.15 && dedSep >= 3 && dedSnr >= 3;

  /* 旧判据（观测档）留着当底：解析预测没做成时，它仍能说「最差那卦多久不回来」。
   * 🔴 但两边封顶不同：解析成立 ⇒ 至少 6 分；解析失败 ⇒ 最多 5 分。
   *    否则「后端观测得好」会冒充「推得出来」，那正是这次要修的那个错。 */
  const yanBase = pick(span, [[30, 1], [10, 3], [3, 5], [1, 8], [0, 10]]);

  /* ── 演绎第二段：自改的期望轨迹（_theta.cjs）──
   * 四道门缺一不给这 2 分（阈值在 _theta.cjs 的 GATE 里，不在本文件重写一遍）：
   *   ① 轨迹中位误差 ≤ 种子噪声底（残差只是采样涨落，不是系统缺口）
   *   ② 乱表交叉 / 真表 ≥ 3（判据有牙）
   *   ③ 三个固定 θ 上，实测/解析的 ḡ 比值都在 1±0.10
   *   ④ 终点 a、k 的相对误差 ≤ 2%
   * 🔴 为什么不直接给到 10：算出来的是 θ 的**期望轨迹**，不是 θ 的**分布**；
   *    种子间那 0.23% 的散布仍只报不推，动力学也仍受周期 2 限制。 */
  const thG = THV && THV.gates ? THV.gates : null;
  /* 🔴 不读 thG.all，四条子门各自判：只信一个汇总布尔值的话，把子门改成 false
   *    而 all 忘了改，分会照样给 —— 判据必须读分量，不读结论。 */
  const thOk = !!(thG && thG.traj === true && thG.sep === true &&
    thG.grad === true && thG.end === true);
  const thMed = THV && THV.err ? THV.err.med : NaN;
  const thNoise = THV && THV.noise ? THV.noise.med : NaN;
  const thSep = THV && THV.control ? THV.control.sep : NaN;
  const thEndA = THV && THV.endErr ? THV.endErr.a : NaN;
  const thEndK = THV && THV.endErr ? THV.endErr.k : NaN;
  const thGrad = THV && THV.gradCheck ? THV.gradCheck.map((c) => c.ratio.a) : [];

  const yanScore = dedOk ? Math.max(yanBase, thOk ? 8 : 6) : Math.min(yanBase, 5);

  /* ── 选美：吸引力 γ 的留存率 ── */
  const g0 = M.theta0[2];
  const gEnd = G.A.theta.g;
  const gKeep = g0 > 0 ? Math.max(0, Math.min(1, gEnd / g0)) : 0;

  /* ── 尽善：留存（门到底有没有把人留住），再按代价扣 ── */
  const keepX = ageA / S.GB.ageAll;
  const rejRate = S.GB.gateRej / (S.GB.gateAcc + S.GB.gateRej);
  const dmgD = Math.abs(S.D.meanVTall / S.E.meanVTall);
  const dmgX = Math.abs(S.XB.meanVTall / S.E.meanVTall);
  const keepBase = pick(keepX, [[15, 8], [8, 7], [3, 5], [0, 3]]);
  const keepPenalty = rejRate > 0.9 ? 2 : rejRate > 0.7 ? 1 : 0;

  /* ── 达真：只认「系统自己看不看得见符号」这一半（＝§5⑤ 的恒等式） ──
   * 🔴 分数必须挂在实测上（铁律 83）：relDiff 越小 ⇒ θ 在符号翻转下越不变 ⇒ 越看不见。
   *    写成 truthIn = 1 就是手填，改什么输入它都不动。阶梯按阈值从高到低排。
   *    当前 relDiff ≈ 2.95e−4 ⇒ 命中最低档 1 分；把 maxAbsDiff 改大，分必须跟着升。 */
  const INV = R.invariance;
  const relDiff = INV.maxAbsDiff / Math.max(Math.abs(INV.onTrue.a), Math.abs(INV.onTrue.k), 1e-9);
  const truthIn = pick(relDiff, [[0.5, 8], [0.1, 5], [0.01, 3], [0, 1]]);

  /* ── 通天：两个来源，缺一不可 ──
   * ① 序参量合格数：_intensity.cjs 按三道门（单调 + 余量 ≥3× + 信噪比 ≥3）筛出的个数；
   * ② 迁移次数：仍是 0（没有第二张真表，θ 一次没搬过）。
   * 🔴 分只由 ① 给，3 个以上才给 1 分，不到 3 个就是 0。
   *    把 _intensity_result.json 里任何一个 pass 改成 false，分必须跟着掉
   *    —— 这就是它「不是手填」的可验证处（test-hex 里有对应的变异测试）。 */
  const migrateN = 0;
  const intPass = INTV && INTV.reportNormalized
    ? Object.keys(INTV.reportNormalized).filter((k) => INTV.reportNormalized[k] && INTV.reportNormalized[k].pass === true)
    : [];
  const nPass = intPass.length;
  const intMetricN = INTV && INTV.reportNormalized ? Object.keys(INTV.reportNormalized).length : 0;
  const intRej = Math.max(0, intMetricN - nPass);
  /* 被挡下的名字也从 JSON 现读，不许在文案里写死「divNorm 信噪比 1.30」——
   * 数据一变那句话就成了假话（这正是「实现一改，屏上的话必须跟着改」）。 */
  const intRejNames = INTV && INTV.reportNormalized
    ? Object.keys(INTV.reportNormalized)
        .filter((k) => INTV.reportNormalized[k] && INTV.reportNormalized[k].pass !== true)
        .join('、')
    : '';
  const tongScore = pick(nPass, [[3, 1], [0, 0]]);

  /* ── 达真：单点外部锚的实测量（只作证据，不加分）── */
  const anc = ANCV && ANCV.singleAnchor ? ANCV.singleAnchor : null;

  const axes = [
    {
      key: 'gui', zh: '归纳', ord: 1, score: Math.round(10 * rev * 0.6), own: Math.round(10 * rev * 0.2),
      band: bandOf(Math.round(10 * rev * 0.6)),
      crit: '压缩之后能不能还原：64 个值 ⇄ 6 个权重',
      evid: '重建偏差 ' + maxDev.toExponential(2) + '，压缩 ' + f2(64 / 6) + ' 倍，6 个权重逐位等于 YAO_SCORE',
      why: '可还原成立，但 Ω 是给定的，不是自改造出来的（所以 0.6 而不是 1）；且 V 是线性、没有卦效应，谦排 61/64 那个错还在表里',
      num: maxDev,
    },
    {
      /* 🔴 阶梯表必须按阈值从高到低排。第一版写成 [[1,10],[3,8],…] 的升序，
       *    span=29.9 一进去就命中 [10,5]，演绎直接虚高 2 分 —— band 自洽检查当场抓住。 */
      key: 'yan', zh: '演绎', ord: 2,
      score: yanScore,
      own: yanScore,
      band: bandOf(yanScore),
      crit: thOk
        ? '推出「θ 会变成什么」：解出每窗的期望更新量 ḡ(θ)，积分成整条自改轨迹，再拿 3 颗种子对'
        : dedOk
          ? '从压缩表征推出全体，再拿实测对：解自洽不动点算出 4096 个状态的稳态分布，不看后端'
          : '从压缩表征反复生成全体：按回访间隔判，不看累计覆盖',
      evid: thOk
        ? '先解析 64 个状态的稳态（中位误差 ' + f2(dedSelf * 100) + '%、随机表交叉崩到 ' + f2(DC.crossMed * 100) + '%），再把自改的每窗期望更新量算出来积分：50 个检查点的轨迹中位误差 ' + f2(thMed * 100) + '%（种子噪声底 ' + f2(thNoise * 100) + '%），终点 α 误差 ' + f2(thEndA * 100) + '%、κ 误差 ' + f2(thEndK * 100) + '%；换打乱的表，误差被推到 ' + f2(THV.control.med * 100) + '%（' + f2(thSep) + '×）'
        : dedOk
          ? '解析预测 64/64 卦的稳态分布，中位误差 ' + f2(dedSelf * 100) + '%、P95 ' + f2(DC.grid[0][0].p95 * 100) + '%；用随机表交叉预测立刻崩到 ' + f2(DC.crossMed * 100) + '%（' + f2(dedSep) + '×）；种子噪声底只有 ' + f2(dedNoise * 100) + '%'
          : '最差那一卦 ' + i0(ageA) + ' 步没回来 ＝ ' + f2(span) + ' 个 W=' + i0(M.mwin) + ' 窗；而 ' + R.groups.length + ' 组累计 cover 全是 64',
      why: (thOk
        /* 🔴 这里不许用 Markdown 的星号强调：这段是插进 HTML 的纯文本，** ** 会原样印出来。
         *    Q29 那条「没有漏出 Markdown 星号」就是专门抓这个的。 */
        ? '给 ' + yanScore + ' 分不到 10：算出来的是 θ 的「期望轨迹」，不是 θ 的「分布」 —— 种子间那 ' + f2(thNoise * 100) + '% 的散布仍只报不推；动力学仍只能在偶数步子列上量（Q₆ 二部 ⇒ 周期 2）。'
        : dedOk
          ? '给 ' + yanScore + ' 分不到更高：解析只覆盖「θ 冻结」的稳态；自改（θ 漂移）那一半仍只能模拟，且链的周期是 2（Q₆ 二部 + 禁回头）⇒ 单步分布永不收敛，只有时间平均有稳态。'
          : '累计 cover 是错量：全组都满分、年龄却跨 ' + i0(ageA / S.C.ageAll) + ' 倍。换成回访间隔后这条不成立'),
      num: thOk ? thMed : (dedOk ? dedSelf : span),
    },
    {
      key: 'xuan', zh: '选美', ord: 3,
      score: gKeep >= 0.8 ? 10 : gKeep >= 0.5 ? 7 : gKeep >= 0.2 ? 4 : gKeep > 0 ? 2 : 0,
      own: gKeep >= 0.8 ? 10 : gKeep >= 0.5 ? 7 : gKeep >= 0.2 ? 4 : gKeep > 0 ? 2 : 0,
      band: bandOf(gKeep >= 0.8 ? 10 : gKeep >= 0.5 ? 7 : gKeep >= 0.2 ? 4 : gKeep > 0 ? 2 : 0),
      crit: '吸引力 γ 能不能留住（它决定愿不愿意继续看）',
      evid: 'γ 从 ' + g0 + ' 被学成 ' + f3(gEnd) + '，留存率 ' + f2(gKeep * 100) + '%；A 组最差卦年龄是不自改组的 ' + f2(ageA / ageC) + ' 倍',
      why: '把「吸引力」写进 θ，它必然被梯度吃掉 —— 这不是没调好，是位置错了。要留住只能移出 θ（采样温度或硬下限）',
      num: gKeep,
    },
    {
      key: 'jin', zh: '尽善', ord: 4, score: Math.max(0, keepBase - keepPenalty), own: Math.max(0, keepBase - keepPenalty),
      band: bandOf(Math.max(0, keepBase - keepPenalty)),
      crit: '留存：看完还回不回来（回访间隔，不是停留时长）',
      evid: '双门把最差卦年龄从 ' + i0(ageA) + ' 压到 ' + i0(S.GB.ageAll) + '（' + f2(keepX) + '×）；代价 ' + f2(rejRate * 100) + '% 否决',
      why: '留存这项是真赢的，还严格支配硬接管与 λ=1.5；扣 ' + keepPenalty + ' 分在代价：靠拦人换留存，且错表下只把伤害从 ' + f2(dmgD) + '× 压到 ' + f2(dmgX) + '×，方向一点没改',
      num: keepX,
    },
    {
      key: 'da', zh: '达真', ord: 5, score: truthIn, own: truthIn,
      band: bandOf(truthIn),
      crit: '系统能不能对一个不由 Ω 生成、且不随目标函数变号的参照负责（判方向，不看快慢）',
      /* 🔴 v13 纠正：以前写「Ω→max−V 下 θ 只差 2e−2」，像是「差不多不变」。
       *    现在是算出来的：V(x)+V(63−x) 恒等于一个常数 ⇒ 错卦（六爻全取反）是 Q₆ 的
       *    图自同构，而这张表在它下面恰好反序 ⇒ 对抗表只是同一张表的**对称像**
       *    （差一个常数，常数在 softmax 与中心化里都消掉）⇒ θ 按构造不变。
       *    所以变的是「它看的世界」（落点翻转），不变的是「它怎么改自己」。 */
      evid: '外部审计 ' + (TOTAL.total || 0) + ' 条断言 + ' + M.seeds.length + ' 颗种子可重跑（＝§8 的 B，' + AUDIT_SCORE + ' 分，是审计者的能力，不计入本尺）；内部：Ω→max−V 下 θ ' +
        (THV && THV.invariance && THV.invariance.compIsConst
          ? '按构造不变（V(x)+V(63−x) 恒等于 ' + f3(THV.invariance.compSum[0]) + ' ⇒ 错卦是图自同构，对抗表只是它的对称像）—— 预测差 ' + f2(THV.invariance.aRel * 100) + '%、实测差 ' + f2(THV.invariance.actDiffA * 100) + '%'
          : '只差 ' + INV.maxAbsDiff.toExponential(2) + '（相对 ' + relDiff.toExponential(2) + '）') +
        '，落点却 ' + INV.homeTrue + '→' + INV.homeNeg + ' —— 变的是它看的世界，不是它改自己的方式' + (anc ? '；单点锚：谦排 ' + anc.rankInV + ' vs ' + anc.rankInAdv : ''),
      why: '严格口径只认内部这一半：做了一次「证明自己看不见符号」的诚实体检，值 ' + truthIn + ' 分。外部那半边是「我写了测试」，不是「系统看见了真假」—— 把审计者的能力记到被审计者头上，比读文献涨分更隐蔽。' +
        (anc ? '另做了一次证伪：单点绝对锚（谦应最高）在 V 下错位 ' + anc.offsetInV + '、在 max−V 下错位 ' + anc.offsetInAdv + '，反而更认可那张翻转表 ⇒ 绝对位置锚不是锚。要唯一确定 64 维序需 ' + (ANCV.combinatorics ? ANCV.combinatorics.anchorsNeededForUniqueOrder : 63) + ' 个独立点，现有 1 个。' : '') +
        'score＝own，一分继承都不给',
      num: relDiff,
    },
    {
      key: 'tong', zh: '通天', ord: 6, score: tongScore, own: tongScore,
      band: bandOf(tongScore),
      crit: '强度量跨表：先对齐控制参数 g，再看同类扰动最稳、异源与随机都明显偏离',
      evid: nPass
        ? '过三道门的序参量 ' + nPass + ' 个：' + intPass.join('、') + '（余量 ' +
          intPass.map((k) => INTV.reportNormalized[k].margin + '×').join(' / ') + '）；迁移 ' + migrateN + ' 次'
        : '没测过：_intensity_result.json 缺失，或 6 个候选一个都没过三道门',
      why: migrateN === 0
        ? '给 ' + tongScore + ' 分不到更高：序参量有了（' + nPass + '/' + intMetricN + ' 过门），但 θ 迁移仍是 0 次、第二张真表不存在。被挡下的 ' + intRej + ' 个' + (intRejNames ? '（' + intRejNames + '）' : '') + '才是重点 —— 挡下的比留下的重要'
        : '迁移 ' + migrateN + ' 次',
      num: nPass,
    },
  ];

  const total = axes.reduce((a, b) => a + b.score, 0);
  const own = axes.reduce((a, b) => a + b.own, 0);
  const max = axes.length * 10;

  /* 自洽检查：分与档位必须同向，合计必须等于分项之和。不对就抛，不许印到屏上。 */
  const bad = axes.filter((a) => !Number.isFinite(a.score) || !Number.isFinite(a.own) ||
    /NaN|undefined|Infinity/.test(a.evid + a.why));
  if (bad.length) throw new Error('打分表里有 NaN/undefined：' + bad.map((b) => b.zh).join('、'));
  if (axes.length !== 6) throw new Error('十二个字是 6 条，现在是 ' + axes.length + ' 条');
  if (total !== axes.reduce((a, b) => a + b.score, 0)) throw new Error('合计与分项不符');
  const bandOk = axes.every((a) => {
    if (a.band === 'todo') return a.score === 0;
    return a.band === bandOf(a.score);
  });
  if (!bandOk) throw new Error('分数和档位不一致（档位是给读者看的，不许和分打架）');
  /* 严格口径护栏：达真不许有继承分。外部审计是「我写了测试」，属于审计者；
   * 谁要是把 §8 的 B 再混进 score，这里直接抛，不许印到屏上。 */
  if (axes[4].score !== axes[4].own) {
    throw new Error('达真不许有继承分：外部审计是审计者的能力，不是被审计者的能力');
  }

  const plan = assertPlan(makePlan({
    maxDev: maxDev,
    mwin: M.mwin,
    g0: g0,
    gEnd: gEnd,
    rejPct: f2(rejRate * 100),
    gateAcc: S.GB.gateAcc,
    gateRej: S.GB.gateRej,
    nGroups: R.groups.length,
    intPass: nPass,
    intPassNames: intPass.join('、'),
    intRej: intRej,
    ancReady: !!anc,
    ancR: anc ? anc.rankInV : 0,
    ancA: anc ? anc.rankInAdv : 0,
    thMed: thMed,
    thNoise: thNoise,
  }));

  return { axes, total, own, max, keepX, rejRate, relDiff, maxDev, span, gKeep,
    truthIn, auditScore: AUDIT_SCORE, plan, rejPct: f2(rejRate * 100),
    nPass, intPass, intRej, intMetricN, tongScore, migrateN, anc, ancReady: !!anc,
    /* v12 演绎：解析预测。yanScore 与 ded* 都要吐出来，屏上才能现算口径变更，
     * 而不是把历史分写成常量。dedBase＝旧观测档（解析没做成时用的那个）。 */
    yanScore, yanBase, dedOk, dedSelf, dedSep, dedNoise, dedSnr,
    /* v13：自改的期望轨迹。thOk 决定那 2 分；其余数字供页面现算，不许写死。 */
    thOk, thMed, thNoise, thSep, thEndA, thEndK, thGrad, thGates: thG,
    dedP95: DC ? DC.grid[0][0].p95 : NaN, dedCross: DC ? DC.crossMed : NaN };
}

module.exports = build;
module.exports.pick = pick;
module.exports.ST_ZH = ST_ZH;
module.exports.makePlan = makePlan;
module.exports.assertPlan = assertPlan;
