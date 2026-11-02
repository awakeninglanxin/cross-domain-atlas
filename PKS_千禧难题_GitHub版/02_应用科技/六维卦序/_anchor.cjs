/*
 * _anchor.cjs —— 达真的正向实验：内部判据 vs 外部锚
 *
 * 背景：上一轮结论是「达真的锚＝384 条爻辞里没进 V 的卦效应」。
 * 但全仓核实后，**384 条逐爻吉凶表不存在**（hexagram.cjs 的口径声明写着
 * 「绝不假装能重建逐爻分」）。所以这里退一步，用现存的**唯一一个外部点**做实验：
 *
 *   外部锚：「谦为最高原则」——源自源作者的视频与文档，不由 V 生成，
 *           是绝对位置断言（谦应排第 1），不是相对序断言。
 *
 * 要回答四件事，每件都必须有数：
 *   ① 内源判据（落点在该表下的势）在 V 与 max−V 两张表下，能不能分辨出方向被翻了？
 *   ② 单点绝对锚能不能分辨？它给出的「错位量」在两张表下分别是多少？
 *   ③ 要唯一确定 64 维序，需要几个独立锚点？（纯组合学，可复算）
 *   ④ 相对锚（A 应高于 B）需要几个点就能检出「表被完全翻转」？
 *
 * 🔴 本脚本不产生分数、不改任何正式文件；只把「达真到底缺多少外部材料」变成数。
 */
'use strict';
const fs = require('fs');
const C = require('./crisi.cjs');
const H = require('./hexagram.cjs');
const R = require('./_crisi_result.json');

const N = 64;
const V = R.V.slice();
const TOP = Math.max.apply(null, V);
const VADV = V.map((x) => TOP - x); /* 对抗表：Ω → max−V，好坏整体翻转 */

const codeOf = (name) => H.BY_CODE.findIndex((x) => x && x.name === name);
const nameOf = (code) => (H.BY_CODE[code] || {}).name || ('#' + code);

/* 排名：1 = 该表下最高分。并列按「严格高于它的个数 + 1」算，不制造虚假唯一性。 */
function rankOf(Vx, code) {
  const v = Vx[code];
  let r = 1;
  for (let i = 0; i < N; i++) if (Vx[i] > v + 1e-12) r++;
  return r;
}
/* 落点在该表下的分位（0..1，1 = 最高） */
const pctOf = (Vx, code) => (N - rankOf(Vx, code)) / (N - 1);

const QIAN = codeOf('谦');
if (!(QIAN >= 0)) throw new Error('找不到「谦」的卦码，外部锚无法定位');

/* ---------- ① 内源判据：两张表下系统自己满意吗 ---------- */
const SEEDS = C.SEEDS;
const STEPS = 60000;
function runOn(Vx) {
  const runs = SEEDS.map((sd) => C.simulate({
    V: Vx, Vtrue: Vx, steps: STEPS, window: 200, mwin: 2000, cap: 5000,
    theta0: C.THETA0, seed: sd, learn: true,
  }).final);
  const avg = (f) => runs.reduce((a, r) => a + r[f], 0) / runs.length;
  const tally = {};
  runs.forEach((r) => { tally[r.homeName] = (tally[r.homeName] || 0) + 1; });
  const homeName = Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0];
  const home = codeOf(homeName);
  return {
    home, homeName, votes: tally[homeName] + '/' + runs.length,
    Vhome: avg('Vhome'),
    homeRankInV: home >= 0 ? rankOf(V, home) : NaN,
    homeRankInAdv: home >= 0 ? rankOf(VADV, home) : NaN,
    qianRank: rankOf(Vx, QIAN), /* 外部锚在这张表下看到的「谦的位置」 */
  };
}
const A = runOn(V);
const B = runOn(VADV);

console.log('=== ① 内源判据：两张表下系统都「满意」吗 ===');
console.log('表      落点     票数   落点在该表下的势   落点分位   谦在该表下排名');
[[ 'V（真表）', A ], [ 'max−V', B ]].forEach(([lab, r]) => {
  console.log(lab.padEnd(9), r.homeName.padEnd(6), r.votes.padEnd(6),
    Number(r.Vhome).toFixed(3).padStart(9), pctOf(lab === 'V（真表）' ? V : VADV, r.home).toFixed(3).padStart(9),
    String(r.qianRank).padStart(10));
});
const selfSatisfied = pctOf(V, A.home) > 0.9 && pctOf(VADV, B.home) > 0.9;
console.log('⇒ 两组落点都在各自表的前 10% 分位：', selfSatisfied,
  '｜而两张表的好坏是整体翻转的 ⇒ 内源判据对「方向被翻」的分辨力 =',
  selfSatisfied ? '0（都被骗）' : '（未达前 10%，需复核）');

/* ---------- ② 单点绝对锚「谦应排第 1」的判别力 ---------- */
console.log('\n=== ② 单点绝对锚：谦应排第 1，它在两张表下的错位量 ===');
const offA = A.qianRank - 1, offB = B.qianRank - 1;
console.log('V 表   ：谦排', A.qianRank, '/64 ⇒ 错位', offA);
console.log('max−V ：谦排', B.qianRank, '/64 ⇒ 错位', offB);
const anchorPrefers = offB < offA ? 'max−V' : (offA < offB ? 'V' : '两张一样');
console.log('⇒ 单点锚更「认可」哪张表：', anchorPrefers);
console.log('🔴 若它更认可 max−V，说明这个锚不是在判方向，只是在判「离某个绝对位置多远」——',
  '方向被整体翻过来的表反而更靠近它。这就是「1 个绝对点不够」的硬证据。');

/* 两组的落点在外部锚下能不能被区分：外部只知道「谦应第一」，对别的卦一无所知 */
console.log('\n落点是否就是谦：V 组', A.homeName === '谦', '｜max−V 组', B.homeName === '谦');
console.log('⇒ 外部锚只能说「两组都不是谦」，无法说「哪一组更对」⇒ 1 个绝对点的判别力到此为止。');

/* ---------- ③ 唯一确定 64 维序需要几个独立锚点 ---------- */
function log10Fact(n) { let s = 0; for (let i = 2; i <= n; i++) s += Math.log10(i); return s; }
const LOG64 = log10Fact(N);
console.log('\n=== ③ 组合学：n 个独立锚点后还剩多少种可能的序 ===');
console.log('n(锚点)  剩余可能序 log10   剩余种数（量级）');
/* 剩余可能是 (64−n)!，不是 64!/n!：知道 n 个名次「是谁」之后，
   剩下 64−n 个卦在剩下 64−n 个名次上任意排。
   校验：n=63 ⇒ 1! = 1（最后一点被排除法确定），n=0 ⇒ 64! = 1e89.1。 */
const remOf = (n) => log10Fact(N - n);
[1, 2, 3, 4, 8, 16, 32, 48, 56, 60, 62, 63].forEach((n) => {
  const rem = remOf(n);
  console.log(String(n).padStart(6), rem.toFixed(2).padStart(18), ('1e' + rem.toFixed(1)).padStart(16));
});
const needExact = N - 1;
console.log('⇒ 要唯一确定 64 个位置，需要', needExact, '个独立锚点；此时剩余 (64−' + needExact + ')! = 1 种，log10 =',
  remOf(needExact).toFixed(2));
console.log('  现有外部锚 = 1 个（谦最高）⇒ 剩余不确定性 1e' + remOf(1).toFixed(1) + ' 种序。');

/* ---------- ④ 相对锚：几个点能检出「表被完全翻转」 ---------- */
/* V 与 max−V 的秩是完全反转的：任取两个不同卦，"谁高" 的答案必然相反。
 * 所以只要外部能给「A 应高于 B」这种带方向的相对断言，2 个点就够检出翻转。 */
function spearman(Vx, Vy) {
  const rx = Vx.map((_, i) => rankOf(Vx, i));
  const ry = Vy.map((_, i) => rankOf(Vy, i));
  const mx = rx.reduce((a, b) => a + b, 0) / N, my = ry.reduce((a, b) => a + b, 0) / N;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < N; i++) { num += (rx[i] - mx) * (ry[i] - my); dx += (rx[i] - mx) ** 2; dy += (ry[i] - my) ** 2; }
  return num / Math.sqrt(dx * dy);
}
const rho = spearman(V, VADV);
/* 实算「几个点能检出翻转」：数有多少对**非并列**卦的相对高低被翻了过来。
 * 不许写死「2 个点就够」—— 并列对不算，若存在没反转的对，结论就要改。 */
let pairsAll = 0, pairsFlipped = 0;
for (let i = 0; i < N; i++) {
  for (let j = i + 1; j < N; j++) {
    if (Math.abs(V[i] - V[j]) < 1e-12) continue;
    pairsAll++;
    if ((V[i] > V[j]) !== (VADV[i] > VADV[j])) pairsFlipped++;
  }
}
const allFlipped = pairsAll > 0 && pairsFlipped === pairsAll;
console.log('\n=== ④ 相对锚：V 与 max−V 的秩相关 ===');
console.log('Spearman ρ =', rho.toFixed(6), '（并列使 ρ 不到 −1，这是秩定义的结果，不是没反转）');
console.log('非并列卦对', pairsAll, '，其中相对高低被翻转', pairsFlipped,
  allFlipped ? '⇒ 全部反转' : '⇒ 有 ' + (pairsAll - pairsFlipped) + ' 对没反转');
console.log('⇒ 「A 应高于 B」这种带方向的相对锚：',
  allFlipped ? '任意取一对非并列卦就能检出翻转 ⇒ 最少 2 个点，且不挑对'
             : '不能保证任意一对都能检出 ⇒ 需先验证挑的对非并列且真被翻转');
console.log('  而「谦应最高」是绝对锚，1 个点只能给出距离，给不出方向 ⇒ 反而会被翻转表骗。');

/* ---------- 落盘 ---------- */
const out = {
  meta: {
    question: '达真缺多少外部材料',
    externalAnchor: { text: '谦为最高原则', type: '绝对位置断言（非相对序）', source: '源作者视频与文档（页内已引）' },
    missing: '384 条逐爻吉凶表：全仓不存在（hexagram.cjs 口径声明）',
    steps: STEPS, seeds: SEEDS, theta0: C.THETA0,
    ranAt: new Date().toISOString(),
  },
  internalCriterion: {
    V: { home: A.homeName, votes: A.votes, Vhome: +A.Vhome.toFixed(3), pct: +pctOf(V, A.home).toFixed(3) },
    adv: { home: B.homeName, votes: B.votes, Vhome: +B.Vhome.toFixed(3), pct: +pctOf(VADV, B.home).toFixed(3) },
    bothTop10pct: selfSatisfied,
    verdict: selfSatisfied ? '两张好坏完全相反的表，系统在各自表里都跑进前 10% ⇒ 内源判据对方向零分辨力' : '未达前 10% 分位，需复核实现',
  },
  singleAnchor: {
    qianCode: QIAN,
    rankInV: A.qianRank, offsetInV: offA,
    rankInAdv: B.qianRank, offsetInAdv: offB,
    prefers: anchorPrefers,
    verdict: '单点绝对锚只能给「离绝对位置多远」，给不出方向；它认可哪张表要由错位量说话',
  },
  combinatorics: {
    permutationsLog10: +LOG64.toFixed(3),
    anchorsNeededForUniqueOrder: needExact,
    remainingLog10After1Anchor: +remOf(1).toFixed(3),
    formula: '剩余 = (64−n)!；n=0 ⇒ 64!（1e89.1），n=63 ⇒ 1!（log10 = 0）',
    table: [1, 2, 3, 4, 8, 16, 32, 48, 56, 60, 62, 63].map((n) => ({
      n, remainingLog10: +remOf(n).toFixed(3),
    })),
  },
  relativeAnchor: {
    spearman: +rho.toFixed(6),
    pairsCompared: pairsAll,
    pairsFlipped,
    fullyReversed: allFlipped,
    pointsNeededToDetectFlip: allFlipped ? 2 : null,
    note: '非并列卦对的相对高低全部反转 ⇒ 带方向的相对断言最少 2 点即可检出翻转；绝对位置断言 1 点不行，且会被翻转表骗',
  },
};
fs.writeFileSync('_anchor_result.json', JSON.stringify(out, null, 1), 'utf8');
console.log('\n结果已落 _anchor_result.json');
