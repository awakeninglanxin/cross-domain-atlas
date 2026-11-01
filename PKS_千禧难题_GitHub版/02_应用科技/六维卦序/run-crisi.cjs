/*
 * run-crisi.cjs —— 跑完 cRSI 实验矩阵，落盘 _crisi_result.json
 *
 * 页面与断言都从这份 JSON 读，不各自算一遍（一页只许一份真相）。
 * 用法：node run-crisi.cjs [steps]
 */
const fs = require('fs');
const path = require('path');
const C = require('./crisi.cjs');
const H6 = require('./hexagram.cjs');

const steps = +process.argv[2] || 100000;
const t0 = Date.now();

const R = C.runs({ steps });
const P = C.pareto({ steps });

const names = [];
for (let v = 0; v < 64; v++) names.push(H6.BY_CODE[v].name);

/* θ 对 V 的线性重标定（含取负）是否变化？
 * 这一个数决定了「自改能不能发现目标反了」这个问题有没有数学答案。 */
const inv = (function () {
  const base = { steps, window: 200, mwin: 2000, learn: true, bonus: 0, seed: R.meta.seeds[0], theta0: R.meta.theta0 };
  const r1 = C.simulate(Object.assign({}, base, { V: R.Vw }));
  const r2 = C.simulate(Object.assign({}, base, { V: R.Va, Vtrue: R.Vw }));
  const d = (x, y) => Math.abs(x - y);
  return {
    onTrue: r1.thetaEnd, onNeg: r2.thetaEnd,
    maxAbsDiff: Math.max(d(r1.thetaEnd.a, r2.thetaEnd.a), d(r1.thetaEnd.g, r2.thetaEnd.g), d(r1.thetaEnd.k, r2.thetaEnd.k)),
    homeTrue: r1.final.homeName, homeNeg: r2.final.homeName,
  };
})();

const out = {
  meta: {
    steps, window: R.meta.window, mwin: R.meta.mwin, cap: R.meta.cap,
    seeds: R.meta.seeds, theta0: R.meta.theta0,
    ln6: R.meta.ln6, lnHalf6: R.meta.ln6 / 2, ln64: Math.log(64),
    ranAt: new Date().toISOString(),
    ms: Date.now() - t0,
    engine: 'crisi.cjs',
  },
  groups: R.groups.map((g) => ({
    key: g.key, name: g.name, desc: g.desc, ohm: g.ohm,
    theta0: g.theta0, theta: g.theta,
    stats: g.stats, homeName: g.homeName, homeVotes: g.homeVotes,
    curve: g.curve,
  })),
  pareto: P,
  invariance: inv,
  V: R.Vw, Va: R.Va, names,
  codes: { 兑: 54, 艮: 9, 谦: 8, 泰: 56, 否: 7, 既济: 42, 未济: 21, 乾: 63, 坤: 0, 困: 22 },
};

const fp = path.join(__dirname, '_crisi_result.json');
fs.writeFileSync(fp, JSON.stringify(out, null, 1));
console.log('写入', fp, fs.statSync(fp).size, 'B  耗时', Date.now() - t0, 'ms');
out.groups.forEach((g) => {
  const s = g.stats;
  console.log(' ', g.key.padEnd(3), g.name.padEnd(13),
    'V=' + s.meanVTall.toFixed(3), ' 年龄=' + Math.round(s.ageAll),
    ' Hπ=' + s.HpiAll.toFixed(2), ' 家=' + g.homeName);
});
