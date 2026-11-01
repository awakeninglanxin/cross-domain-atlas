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

/* §8 里 B「可审计」那项的分。达真的外部半边就是它，不另立标准。 */
const B_SCORE = 8;

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
      ord: 2, zh: '演绎', st: 'ready',
      what: '累计 cover 换成滑窗覆盖',
      check: 'W＝' + i0(c.mwin) + ' 步内 64 态全被写过',
      evid: '没算过：现在只有累计 cover，' + c.nGroups + ' 组全 64',
      at: '§9.2',
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
      evid: '没做过：外部参照实验 0 次（内部恒等式做过，θ 不变）',
      at: '§5⑤',
    },
    {
      ord: 6, zh: '通天', st: 'none',
      what: '真表 A 上学 θ，搬到真表 B 上用',
      check: '迁移后 V 下降 < 10%',
      evid: '没做过：迁移 0 次，第二张 384 维真表还不存在',
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

function build(R, TOTAL) {
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

  /* ── 达真：外部可复算（＝§8 的 B）、内部看得见符号吗（＝§5⑤ 的恒等式） ── */
  const INV = R.invariance;
  const relDiff = INV.maxAbsDiff / Math.max(Math.abs(INV.onTrue.a), Math.abs(INV.onTrue.k), 1e-9);
  const truthIn = 1;                              // 实测过、但它不变 —— 只值这 1 分

  /* ── 通天：第二张真表上的迁移，做没做 ── */
  const migrateN = 0;

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
      key: 'yan', zh: '演绎', ord: 2, score: pick(span, [[30, 1], [10, 3], [3, 5], [1, 8], [0, 10]]),
      own: pick(span, [[30, 1], [10, 3], [3, 5], [1, 8], [0, 10]]),
      band: bandOf(pick(span, [[30, 1], [10, 3], [3, 5], [1, 8], [0, 10]])),
      crit: '从压缩表征反复生成全体：按回访间隔判，不看累计覆盖',
      evid: '最差那一卦 ' + i0(ageA) + ' 步没回来 ＝ ' + f2(span) + ' 个 W=' + i0(M.mwin) + ' 窗；而 ' + R.groups.length + ' 组累计 cover 全是 64',
      why: '累计 cover 是错量：全组都满分、年龄却跨 ' + i0(ageA / S.C.ageAll) + ' 倍。换成回访间隔后这条不成立',
      num: span,
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
      key: 'da', zh: '达真', ord: 5, score: Math.round((B_SCORE + truthIn) / 2), own: truthIn,
      band: bandOf(Math.round((B_SCORE + truthIn) / 2)),
      crit: '可复算：别人能不能重跑出同一个数；以及系统自己看不看得见真假',
      evid: '外部：' + (TOTAL.total || 0) + ' 条断言 + ' + M.seeds.length + ' 颗种子可重跑；内部：Ω→max−V 下 θ 只差 ' + INV.maxAbsDiff.toExponential(2) + '（相对 ' + relDiff.toExponential(2) + '），落点却 ' + INV.homeTrue + '→' + INV.homeNeg,
      why: '外部这半边就是 §8 的 B（' + B_SCORE + ' 分），一分没多给；内部这半边是 ' + truthIn + ' —— 恒等式证明它连符号都看不见。两边等权取 ' + Math.round((B_SCORE + truthIn) / 2),
      num: relDiff,
    },
    {
      key: 'tong', zh: '通天', ord: 6, score: migrateN > 0 ? 7 : 0, own: 0,
      band: migrateN > 0 ? 'part' : 'todo',
      crit: '跨分布迁移：换一张真表还算不算数',
      evid: '迁移实验 ' + migrateN + ' 次；只有错表对照（GB vs XB），没有第二张真表',
      why: '标 0，不给安慰分。它要的第二张 384 维真表，本身还没有（真表仍是 6 个位平均分）',
      num: migrateN,
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

  const plan = assertPlan(makePlan({
    maxDev: maxDev,
    mwin: M.mwin,
    g0: g0,
    gEnd: gEnd,
    rejPct: f2(rejRate * 100),
    gateAcc: S.GB.gateAcc,
    gateRej: S.GB.gateRej,
    nGroups: R.groups.length,
  }));

  return { axes, total, own, max, keepX, rejRate, relDiff, maxDev, span, gKeep, plan, rejPct: f2(rejRate * 100) };
}

module.exports = build;
module.exports.pick = pick;
module.exports.ST_ZH = ST_ZH;
module.exports.makePlan = makePlan;
module.exports.assertPlan = assertPlan;
