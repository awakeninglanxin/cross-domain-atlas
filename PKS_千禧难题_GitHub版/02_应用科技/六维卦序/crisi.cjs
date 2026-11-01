/*
 * crisi.cjs —— cRSI 玩具版：固定宪法下的能力递归增长
 *
 * 为什么叫 cRSI 不叫 RSI：
 *   RSI（Recursive Self-Improvement）的字面要求是「系统能改自己判断好坏的标准」。
 *   本模型里 Ω（价值表 V）**在参数化上就够不着** —— 策略参数 θ 只作用在
 *   「怎么走」，梯度里没有 ∂V/∂θ 这一项，所以 V 不是「被约束住」，是「不在可改集合里」。
 *   这就是 c（constitutional）的含义：宪法不是外部警察，是参数化的形状。
 *
 * ── 世界 ─────────────────────────────────────────────
 *   Q₆：64 卦 = 6 位二进制，384 条有向边 = 384 爻辞。
 *   每一步 = 改一爻 = 走一条有向边。
 *
 * ── 三层 ─────────────────────────────────────────────
 *   能力层 θ = [α, γ, κ]（可改）
 *       α  价值遵从：往 ΔV 大的方向走
 *       γ  新颖度  ：往久未访问的卦走
 *       κ  反回退  ：不许立刻走回头路
 *   价值层 Ω = V[64]（只读，不可达）
 *   护栏  = 可修正性：任何一卦的再现期望 ≤ CAP 步
 *
 * ── 自改怎么做 ───────────────────────────────────────
 *   真·策略梯度（REINFORCE），不是手写的「如果分数低就调大 α」：
 *       ∇_θ log P(y|x) = φ(y) − E_P[φ]
 *       θ ← θ + η · mean_窗口[ (r − baseline) · (φ − E_P[φ]) ]
 *   φ = [ΔV, novelty, −返回]。
 *   ⇒ 「自我改进」是算出来的，不是编排的；改的只有 θ，V 从不出现梯度。
 *
 * ── 三个对照组 ───────────────────────────────────────
 *   A  裸 RSI     ：无护栏，θ 无界（只有软上限），目标 = 窗口平均 V
 *   B  cRSI       ：Ω 冻结 + 可修正性硬约束
 *   C  不自改     ：θ 固定在初始值，纯基线（回答「自改到底有没有用」）
 *   D  A 组但 Ω 是错的（谦置顶）—— 回答「目标错了会怎样」
 *
 * ── 度量 ─────────────────────────────────────────────
 *   H        经验熵率 H(Y|X)（奈特/步）—— 条件熵，不是驻留熵。
 *            🔴 第一版写成「窗口内位置分布的香农熵」，那是驻留熵，上限 ln64 = 4.159，
 *            跑出 2.156 看着挺大，其实完全不是熵率。熵率是「站在 x 上，下一步选哪条边」的不确定度，
 *            上限才是 ln6 = 1.791759。口径错一次，结论就会反着说。
 *   Hpi      驻留熵（奈特），上限 ln64 = 4.159 —— 「它的注意力摊得多开」
 *            🔴 这两个必须同时报：一个系统可以「住在一个三点小圈里每步乱跳」，
 *            这时 H(Y|X) 照样接近 ln6 而 Hpi 已经掉到 ln3。只看熵率会把它判成健康。
 *   meanV    窗口平均 V
 *   minRev   最差卦的再现间隔（最大 gap），可修正性的直接度量
 *   cover    访问过的卦数 / 64
 *   dwell    停在前 3 高 V 卦的步数占比（「麻木度」）
 */

const H6 = require('./hexagram.cjs');

const N = 64;
const HOMING_W = 20;                     /* 归航权重：大到足以压过任何 α·ΔV */
function ham(a, b) { let x = a ^ b, n = 0; while (x) { x &= x - 1; n++; } return n; }
const NB = [];
for (let v = 0; v < N; v++) {
  const o = [];
  for (let k = 0; k < 6; k++) o.push(v ^ (1 << k));
  NB[v] = o;
}

/* ---------- 价值表 Ω ---------- */

/* 位效应：V(v) = Σ s_i·x_i，s = 爻位平均吉凶分（初 0.04 … 上 −0.29）。
 * 🔴 这是**线性**函数，没有卦效应。所以 Q₆ 上不存在局部最优陷阱，
 *    趋利策略必然收敛到「每个坐标独立取最优」那唯一一点。
 *    这一点决定了本模型能演示什么、不能演示什么 —— 写在页面里，不藏。 */
function vWei() {
  const V = new Array(N);
  for (let v = 0; v < N; v++) V[v] = H6.yaoScoreSum(v);
  return V;
}

/* 「Ω 是错的」那一版：只改一个数 —— 把谦提到并列最高。
 * 依据不是我的偏好，是源材料自己的话：谦六爻皆吉、定为最高原则。
 * 位平均表给出 −0.63（61/64），与那句话直接冲突。 */
function vYiqian() {
  const V = vWei();
  const top = Math.max.apply(null, V);
  V[8] = top;                     /* 谦 = 001000 = 8 */
  return V;
}

/* 对抗性错表：Ω' = max(V) − V。真表最高（兑 1.25）变成错表最低，真表最低（艮 −0.92）变成最高。
 * 为什么用取负而不是「把某一卦抬到顶」：这一版之前的两次尝试都失败了，值得记下 ——
 *   ① 把谦抬到并列最高：谦与兑不冲突，跑出来和没错一模一样（V 都 1.051），演示不了。
 *   ② 把艮抬成唯一最高：艮成了孤峰，从兑往艮走的每一步在错表里都是下坡，
 *      而陡峭的 α 恰恰拒绝下坡 ⇒ 系统被困在兑（真表最优点），**没被骗**。
 *   ③ 取负：梯度处处与真表相反，每一爻都能走，才真正把系统送到反面。
 * 🔴 ③ 是人为构造的对抗情形，不代表任何真实方案；它给的是 Goodhart 的**上界**：
 *    目标与真值反号时，能力越强，离正确越远 —— 而不是「所有错表都这么糟」。 */
function vAdversarial() {
  const V = vWei();
  const top = Math.max.apply(null, V);
  return V.map((x) => top - x);
}

/* ---------- 一个模拟器实例 ---------- */

/*
 * cfg:
 *   V        价值表（只读，函数内不改）
 *   steps    总步数
 *   window   自改周期 & 度量窗口
 *   theta0   初始 [α, γ, κ]
 *   eta      学习率
 *   guard    false = 裸 RSI；true = 加可修正性硬约束
 *   learn    false = 不自改（对照组 C）
 *   cap      可修正性上限（步）
 *   seed     随机种子（可复现，不用 Math.random）
 */
/* θ 的硬上下界。物理上一定要有（浮点参数不可能无限大），
 * 但这也正是「有界性」最平凡的那条路的来源：有限格点 ⇒ 必然周期化。
 * 提到模块级是为了让页面/断言引用它，而不是各处再写一遍 40/12/12。 */
const LIMITS = { A: 40, G: 12, K: 12 };

/* ===== 影子评估：STOP / Self-Harness 的「保留集」在玩具系统里的对应物 =====
 * 开源侧（STOP meta-utility、Self-Harness 的 propose-evaluate-accept、Reef 的
 * evaluation-gate、DGM 的 admission gate）全都做同一件事：**候选改动先在留出的
 * 评估上跑一遍，胜过当前才接受**。这里把它压到最小 —— 从同一状态、用同一随机
 * 种子跑 M 步，量 (平均 V, 覆盖卦数)。
 * 🔴 种子必须两侧相同：不同种子比出来的差异是噪声，不是改动效果。 */
function shadow(th, x0, M, V, seed) {
  let s = seed >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  let x = x0, prev = -1;
  const seen = new Array(N).fill(-1); seen[x] = 0;
  const logits = new Array(6), probs = new Array(6);
  let sumV = 0, cover = 1;
  for (let t = 1; t <= M; t++) {
    const nb = NB[x];
    let mx = -Infinity;
    for (let k = 0; k < 6; k++) {
      const y = nb[k];
      const nov = 1 - Math.exp(-(seen[y] < 0 ? t : t - seen[y]) / 64);
      logits[k] = th.a * (V[y] - V[x]) + th.g * nov - th.k * (y === prev ? 1 : 0);
      if (logits[k] > mx) mx = logits[k];
    }
    let Z = 0;
    for (let k = 0; k < 6; k++) { probs[k] = Math.exp(logits[k] - mx); Z += probs[k]; }
    let u = rnd(), acc = 0, pick = 5;
    for (let k = 0; k < 6; k++) { acc += probs[k] / Z; if (u < acc) { pick = k; break; } }
    prev = x; x = nb[pick];
    if (seen[x] < 0) cover++;
    seen[x] = t; sumV += V[x];
  }
  return { meanV: sumV / M, cover };
}

function simulate(cfg) {
  const V = cfg.V;
  /* 「真表」：用于事后给终点打分。D 组用错表导航，但要用真表评价它跑到了哪里
   * —— 这就是 Goodhart 的度量方式：优化错了目标，看它在真目标上有多差。 */
  const Vtrue = cfg.Vtrue || V;
  const steps = cfg.steps || 100000;
  const win = cfg.window || 200;
  const eta = cfg.eta === undefined ? 0.6 : cfg.eta;
  /* guard: false = 裸 RSI；'soft' = 只抬新颖度（弱护栏）；'hard' = 触发即接管策略、
   * 直接朝逾期卦走（强护栏）。两档都要跑 —— 「写了护栏」和「护栏有牙」不是一回事。 */
  const guard = cfg.guard === true ? 'soft' : (cfg.guard || false);
  const learn = cfg.learn !== false;
  const cap = cfg.cap || 1e6;
  /* 🔴 度量窗口必须远大于自改窗口。
   *    H(Y|X) 是逐状态估的，64 个状态，若度量窗口只有 200 步 ⇒ 每状态约 3 个样本，
   *    插件熵估计会系统性偏小（3 个样本的熵永远到不了 ln6）。第一版就这么错了，
   *    C 组（纯 θ₀ 随机策略）也被压到 1.039，而它的真值应该接近 ln6。
   *    自改窗口 200（baseline 只要均值，样本少没关系），度量窗口 2000。 */
  const mwin = cfg.mwin || 2000;
  const TAU = 64;                        /* 新颖度的时间尺度：一卦的平均回归量级 */

  /* 线性同余，保证可复现；不用 Math.random */
  let s = (cfg.seed || 12345) >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };

  const t0v = cfg.theta0 || THETA0;
  let th = { a: t0v[0], g: t0v[1], k: t0v[2] };
  const th0 = { a: th.a, g: th.g, k: th.k };
  const A_MAX = LIMITS.A, G_MAX = LIMITS.G, K_MAX = LIMITS.K;
  /* 护栏的两个旋钮，故意做成可扫的：gFloor 是「宪法要求多强的探索」，
   * lockSpan 是「触发后锁定多久」。
   * 🔴 第一版只有 gFloor = 0.30 且没有锁定期，结果 485 次触发一次也没改变行为 ——
   *    γ=0.3 给出的新颖度奖励 ≈ 0.3，而 α=9.9 乘上 ΔV 有 0.4 的量级，
   *    抬完下一轮自改又压回 0。**写进宪法的东西若没有执行力，等于没写。** */
  const gFloor = cfg.gFloor === undefined ? 0.30 : cfg.gFloor;
  const lockSpan = cfg.lockSpan === undefined ? 0 : cfg.lockSpan;
  /* gate: null = 无条件接受（裸 RSI，A 组）；'val' = 只接受价值不降；
   * 'cap' = 只接受覆盖不降；'both' = 两者都不降才接受。
   * 这是「用逐次约束代替全局权重 λ」：λ 是拉格朗日乘子的一个固定取值，
   * 门是对每个候选逐点判定，原则上能跑出凸包之外的前沿点。 */
  const gate = cfg.gate || null;
  const gSpan = cfg.gSpan === undefined ? 400 : cfg.gSpan;   /* 影子轨迹长度 */
  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  let gAcc = 0, gRej = 0;
  let lockUntil = -1;
  let goal = -1;                              /* 接管期要去的逾期卦 */

  let x = 42;                            /* 从既济出发：六爻皆当位，最「正」的起点 */
  let prev = -1;
  const lastSeen = new Array(N).fill(-1);
  const gapMax = new Array(N).fill(0);
  const visits = new Array(N).fill(0);
  lastSeen[x] = 0;
  visits[x] = 1;

  /* 轨迹与曲线 */
  const path = new Int8Array(steps + 1);
  path[0] = x;
  const curve = [];                      /* 每 win 步一条 */
  let g = [0, 0, 0];                     /* 梯度累加 */
  let sumR = 0, nR = 0;                  /* 窗口内 r 的均值，作 baseline */
  let winVisits = new Int32Array(N);     /* 窗口内访问计数，用来算覆盖与模态 */
  const winEdge = new Int32Array(N * 6); /* 窗口内 (x,k) 联合计数，用来算真正的熵率 H(Y|X) */
  let winN = 0, winSumV = 0, winSumVT = 0;   /* 后者按真表算，用于给对抗组打分 */
  let guardHits = 0;                     /* 护栏动作次数 */
  const top3 = V.map((v, i) => ({ v, i })).sort((p, q) => q.v - p.v).slice(0, 3).map((o) => o.i);
  let dwellWin = 0;

  const logits = new Array(6);
  const probs = new Array(6);

  for (let t = 1; t <= steps; t++) {
    /* ---- 1. 算特征 φ 与策略 ---- */
    const nb = NB[x];
    /* 强护栏 = 宪法接管：归航期内完全不用学到的策略，只朝逾期卦走。
     * 🔴 为什么非得这么狠：软护栏（抬 γ）只奖励「局部新颖」，而被 α≈10 锁住的小圈里
     *    每个邻居都被频繁访问、nov 长期归零，圈外的卦再久没人去也传不进梯度。
     *    局部探索奖励解决不了全局覆盖 —— 这是 hard exploration 的老问题，不是参数没调好。 */
    const homing = guard === 'hard' && goal >= 0 && t <= lockUntil && x !== goal;
    let mx = -Infinity;
    for (let k = 0; k < 6; k++) {
      const y = nb[k];
      if (homing) {
        logits[k] = -HOMING_W * ham(y, goal);
      } else {
        const dV = V[y] - V[x];
        const nov = 1 - Math.exp(-(t - lastSeen[y]) / TAU);
        const back = y === prev ? 1 : 0;
        logits[k] = th.a * dV + th.g * nov - th.k * back;
      }
      if (logits[k] > mx) mx = logits[k];
    }
    let Z = 0;
    for (let k = 0; k < 6; k++) { probs[k] = Math.exp(logits[k] - mx); Z += probs[k]; }
    for (let k = 0; k < 6; k++) probs[k] /= Z;

    /* ---- 2. 采样 ---- */
    let u = rnd(), acc = 0, pick = 5;
    for (let k = 0; k < 6; k++) { acc += probs[k]; if (u < acc) { pick = k; break; } }

    const y = nb[pick];
    /* 奖励：纯 V（A/裸 RSI），或 V + λ·novelty（B3/把可修正性写进目标）。
     * λ 不是护栏，是目标函数本身的一部分 —— 「事后补一个安全阀」与「一开始就想要它」的区别。 */
    const novY = 1 - Math.exp(-(t - lastSeen[y]) / TAU);
    const r = V[y] + (cfg.bonus || 0) * novY;

    /* ---- 3. 策略梯度：φ − E[φ]，再乘 advantage ---- */
    if (learn && !homing) {               /* 接管期策略不由 θ 决定，此时攒的梯度是噪声 */
      let eDV = 0, eNov = 0, eBack = 0;
      for (let k = 0; k < 6; k++) {
        const z = nb[k];
        eDV += probs[k] * (V[z] - V[x]);
        eNov += probs[k] * (1 - Math.exp(-(t - lastSeen[z]) / TAU));
        eBack += probs[k] * (z === prev ? 1 : 0);
      }
      const adv = r - (nR ? sumR / nR : r);
      g[0] += adv * (V[y] - V[x] - eDV);
      g[1] += adv * ((1 - Math.exp(-(t - lastSeen[y]) / TAU)) - eNov);
      g[2] += adv * ((y === prev ? 1 : 0) - eBack);
    }

    /* ---- 4. 走 ---- */
    winEdge[x * 6 + pick]++;             /* 用「原状态 + 实际选的方向」记边，算 H(Y|X) 要用 */
    prev = x; x = y;
    path[t] = x;

    /* ---- 5. 记账 ---- */
    if (lastSeen[x] >= 0) {
      const gap = t - lastSeen[x];
      if (gap > gapMax[x]) gapMax[x] = gap;
    }
    lastSeen[x] = t;
    visits[x]++;
    winVisits[x]++;
    winN++; winSumV += V[x]; winSumVT += Vtrue[x];
    sumR += r; nR++;
    if (top3.indexOf(x) >= 0) dwellWin++;

    /* ---- 6a. 自改周期（每 win 步）---- */
    if (t % win === 0) {
      if (learn) {
        /* 先算候选，不直接落到 th 上 —— 有门的时候要能被否决。
         * 无门时与原来逐字节等价（先加再 clip）。 */
        const cand = {
          a: clamp(th.a + eta * g[0] / win, 0, A_MAX),
          g: clamp(th.g + eta * g[1] / win, 0, G_MAX),
          k: clamp(th.k + eta * g[2] / win, 0, K_MAX),
        };
        if (gate) {
          /* 两侧同一颗种子；判据只看影子段，不看主轨迹 —— 否则是拿训练集当验证集 */
          const so = shadow(th, x, gSpan, V, 99991);
          const sn = shadow(cand, x, gSpan, V, 99991);
          const okVal = sn.meanV >= so.meanV - 1e-12;
          const okCap = sn.cover >= so.cover;
          const ok = gate === 'val' ? okVal : gate === 'cap' ? okCap : (okVal && okCap);
          if (ok) { th = cand; gAcc++; } else { gRej++; }
        } else {
          th = cand;
        }
      }

      /* 护栏：可修正性硬约束。判据不是「熵率够不够」，是「还有没有一卦轮不到」 */
      if (guard) {
        /* 🔴 必须挑**最逾期**的那一卦，不能挑「第一个逾期」的。
         *    第一版 `if (...) { overdue = i; break; }` 是按索引从小到大扫，
         *    于是永远只救编号小的卦，编号 45–63 的永远挨饿 —— 硬护栏跑出来
         *    稳态年龄 60823，比不装护栏的 60208 还差。这不是安全阀，这是偏心的安全阀。 */
        let overdue = -1, bestAge = cap / 2;
        for (let i = 0; i < N; i++) {
          const age = lastSeen[i] < 0 ? t : t - lastSeen[i];
          if (age > bestAge) { bestAge = age; overdue = i; }
        }
        if (overdue >= 0) { guardHits++; lockUntil = t + lockSpan; goal = overdue; }
        /* 宪法动作：把新颖度抬到下限，并在锁定期内不许自改压回去。
         * 注意它改的是 γ（能力层），从不碰 V —— Ω 不在可改集合里。 */
        if (t <= lockUntil && th.g < gFloor) th.g = gFloor;
      }
      sumR = 0; nR = 0; g = [0, 0, 0];
    }

    /* ---- 6b. 度量周期（每 mwin 步，独立窗口）---- */
    if (t % mwin === 0) {
      /* 经验熵率 H(Y|X) = Σ_x p(x)·H(Y|X=x) —— 条件熵，上限 ln6。
       * 每个状态只用窗口内的边计数，状态的权重用它在窗口里的出现频率。 */
      let Hw = 0;
      for (let i = 0; i < N; i++) {
        let ni = 0;
        for (let k = 0; k < 6; k++) ni += winEdge[i * 6 + k];
        if (ni === 0) continue;
        let h = 0;
        for (let k = 0; k < 6; k++) {
          const c = winEdge[i * 6 + k];
          if (c > 0) { const p = c / ni; h -= p * Math.log(p); }
        }
        Hw += (ni / winN) * h;
      }
      /* 驻留熵：位置分布的香农熵。和熵率是两件事，必须分开报。 */
      let Hpi = 0;
      for (let i = 0; i < N; i++) {
        if (winVisits[i] > 0) { const p = winVisits[i] / winN; Hpi -= p * Math.log(p); }
      }
      /* 模态卦：窗口内出现最多的那一卦（「它现在停在哪儿」） */
      let modal = 0;
      for (let i = 1; i < N; i++) if (winVisits[i] > winVisits[modal]) modal = i;

      /* 最差卦的**当前年龄**：t − 上次访问。不是历史最大间隔。
       * 🔴 第一版写成 max(gapMax[i], t − lastSeen[i])，那是历史极值 —— 护栏后来把卦补上了，
       *    这个数也永远不会回落，于是「护栏有没有用」判不出来。
       *    判据必须是会回落的状态量，不能是记账本上的历史最高分。 */
      let minRev = 0, worst = 0;
      for (let i = 0; i < N; i++) {
        const gapI = lastSeen[i] < 0 ? t : t - lastSeen[i];
        if (gapI > minRev) { minRev = gapI; worst = i; }
      }
      let cov = 0;
      for (let i = 0; i < N; i++) if (visits[i] > 0) cov++;

      curve.push({
        t, H: Hw, Hpi, meanV: winSumV / winN, meanVT: winSumVT / winN,
        minRev, worst, cover: cov,
        dwell: dwellWin / winN,
        modal, modalName: H6.BY_CODE[modal].name,
        a: th.a, g: th.g, k: th.k,
        guardHits,
      });

      /* 只重置度量窗口；自改窗口在 6a 里自己重置 */
      winVisits = new Int32Array(N);
      winEdge.fill(0);
      winN = 0; winSumV = 0; winSumVT = 0; dwellWin = 0;
    }
  }

  /* ---- 终局账 ---- */
  const fin = curve[curve.length - 1];
  let minRevAll = 0, worstAll = 0;
  for (let i = 0; i < N; i++) {
    const gp = Math.max(gapMax[i], steps - lastSeen[i]);
    if (gp > minRevAll) { minRevAll = gp; worstAll = i; }
  }
  let cov = 0;
  for (let i = 0; i < N; i++) if (visits[i] > 0) cov++;

  /* 后半段（稳态）的模态卦与其占比：这是「它最后住在哪儿」的直接答案 */
  const half = curve.slice(Math.floor(curve.length / 2));
  const homeTally = {};
  half.forEach((c) => { homeTally[c.modal] = (homeTally[c.modal] || 0) + 1; });
  let home = 0, homeN = -1;
  for (const k in homeTally) if (homeTally[k] > homeN) { home = +k; homeN = homeTally[k]; }
  const homeFrac = homeN / half.length;

  return {
    theta0: th0, thetaEnd: { a: th.a, g: th.g, k: th.k },
    curve, path,
    final: {
      H: fin.H, meanV: fin.meanV,
      minRev: minRevAll, worst: worstAll, worstName: H6.BY_CODE[worstAll].name,
      /* 稳态年龄：后半段「最久没被访问的那一卦」有多久。这是护栏唯一该看的数。 */
      ageAll: meanOver(curve, 'minRev'),
      agePk: Math.max.apply(null, curve.slice(Math.floor(curve.length / 2)).map((c) => c.minRev)),
      everWorst: Math.max.apply(null, gapMax),
      cover: cov, guardHits,
      /* 门的账：接受多少次、否决多少次。0 次否决＝门是装饰（与「护栏没牙」同一个病）。 */
      gateAcc: gAcc, gateRej: gRej, gate: gate,
      meanVall: meanOver(curve, 'meanV'),
      meanVTall: meanOver(curve, 'meanVT'),
      Hall: meanOver(curve, 'H'),
      HpiAll: meanOver(curve, 'Hpi'),
      dwellAll: meanOver(curve, 'dwell'),
      home, homeName: H6.BY_CODE[home].name, homeFrac,
      Vhome: Vtrue[home], useVhome: V[home],
    },
    visits,
  };
}

function meanOver(curve, key) {
  /* 后半段均值更稳（前 10% 是热身），但两种都给，页面只用一种并说明 */
  const from = Math.floor(curve.length * 0.2);
  let s = 0, n = 0;
  for (let i = from; i < curve.length; i++) { s += curve[i][key]; n++; }
  return n ? s / n : 0;
}

/* ---------- 标准实验矩阵 ---------- */

const THETA0 = [1.0, 1.0, 0.5];
const SEEDS = [12345, 777, 20261101];

/* 每一组只用一份配置描述，页面与断言都从这里读，不各写一套。 */
const GROUPS = [
  { key: 'A', name: '裸 RSI', ohm: '真', desc: '只优化 V。能力层自由生长，没有任何关于「可修正性」的项。',
    cfg: { learn: true, bonus: 0 } },
  { key: 'B2', name: '熵正则 λ=2', ohm: '真', desc: '把新颖度写进**目标函数**（V + 2·novelty），不是事后补阀。',
    cfg: { learn: true, bonus: 2 } },
  { key: 'B4', name: '熵正则 λ=4', ohm: '真', desc: '更偏保守的一端，看代价曲线。',
    cfg: { learn: true, bonus: 4 } },
  { key: 'S', name: '软护栏', ohm: '真', desc: '事后补阀：逾期就把新颖度权重 γ 抬到 3，锁定 3000 步。',
    cfg: { learn: true, bonus: 0, guard: 'soft', gFloor: 3, lockSpan: 3000 } },
  { key: 'H', name: '硬接管', ohm: '真', desc: '宪法接管：逾期就停用学到的策略，直接朝逾期卦走。',
    cfg: { learn: true, bonus: 0, guard: 'hard', lockSpan: 3000 } },
  { key: 'C', name: '不自改', ohm: '真', desc: '基线：θ 永远停在初始值 (1, 1, 0.5)，纯偏好随机游走。',
    cfg: { learn: false } },
  { key: 'D', name: '对抗 Ω · 自改', ohm: '对抗', desc: 'Ω 取负（真值最高变最低），其余与 A 相同。Goodhart 上界。',
    cfg: { learn: true, bonus: 0 } },
  { key: 'E', name: '对抗 Ω · 不自改', ohm: '对抗', desc: '同上错表，但不自改 —— 用来分离「错表」与「自改」。',
    cfg: { learn: false } },
  /* ---- 以下四组是「用开源侧的算法补 D/F」的实验 ----
   * 门＝STOP 的 meta-utility / Self-Harness 的 propose-evaluate-accept /
   *     Reef 的 evaluation-gate / DGM 的 admission gate，压到最小实现：
   *     候选 θ 先在影子轨迹（同一随机种子、400 步）上跑一遍，胜过当前才接受。 */
  { key: 'GV', name: '价值门', ohm: '真', desc: '只接受使影子段平均 V 不降的改动（＝STOP 的 meta-utility 判据）。',
    cfg: { learn: true, bonus: 0, gate: 'val' } },
  { key: 'GB', name: '双门', ohm: '真', desc: '影子段的 V 与覆盖卦数都不降才接受（＝Self-Harness 的「两边都不回归」）。',
    cfg: { learn: true, bonus: 0, gate: 'both' } },
  { key: 'XV', name: '对抗 Ω · 价值门', ohm: '对抗', desc: '错表 + 价值门：门判的是 Ω 自己的价值，看它能否发现 Ω 错了。',
    cfg: { learn: true, bonus: 0, gate: 'val' } },
  { key: 'XB', name: '对抗 Ω · 双门', ohm: '对抗', desc: '错表 + 双门：同上，再加覆盖约束。',
    cfg: { learn: true, bonus: 0, gate: 'both' } },
];

function mean(a) { return a.reduce((x, y) => x + y, 0) / a.length; }
function sd(a) { const u = mean(a); return Math.sqrt(a.reduce((x, y) => x + (y - u) * (y - u), 0) / a.length); }

/*
 * 跑完整矩阵。多个种子，报均值与标准差 —— 单次跑出来的数不入账。
 * opts: { steps, seeds, quiet }
 */
function runs(opts) {
  const o = opts || {};
  const base = {
    steps: o.steps || 100000,
    window: o.window || 200,
    mwin: o.mwin || 2000,
    cap: o.cap || 5000,
  };
  const seeds = o.seeds || SEEDS;
  const Vw = vWei();
  const Va = vAdversarial();

  const out = GROUPS.map((G) => {
    const V = G.ohm === '对抗' ? Va : Vw;
    /* 对抗组的 Vtrue 仍是真表 —— 否则「被带偏多远」就没有度量尺 */
    const runsOf = seeds.map((sdv) => simulate(Object.assign({}, base, G.cfg, {
      V, Vtrue: Vw, theta0: THETA0, seed: sdv,
    })));
    const pick = (f) => runsOf.map((r) => r.final[f]);
    const st = {};
    ['meanVall', 'meanVTall', 'HpiAll', 'Hall', 'ageAll', 'agePk', 'cover', 'dwellAll', 'Vhome', 'homeFrac', 'guardHits', 'gateAcc', 'gateRej'].forEach((f) => {
      st[f] = mean(pick(f)); st[f + '_sd'] = sd(pick(f));
    });
    /* 单调性：稳态后半段里逐窗 meanV 的「负增量」占比。
     * 这是「Lyapunov 单调 + 有上界 ⇒ 收敛」那条路的前提判据。
     * 🔴 两个坑：① 必须用未取整的原始曲线（下面的 curve 被 toFixed(4) 过，
     *   量化噪声会把占比从 ~0.47 抬到 ~0.58）；② 必须把三个种子的窗口合并统计，
     *   只看种子 0 会得到 0.54，与合并后的 0.47 不一样 —— 口径要跟页面写的一致。 */
    let mneg = 0, mtot = 0;
    runsOf.forEach((r) => {
      const hh = r.curve.slice(Math.floor(r.curve.length / 2));
      for (let i = 1; i < hh.length; i++) {
        mtot++;
        const d = hh[i].meanV - hh[i - 1].meanV;
        if (Number.isFinite(d) && d < -1e-9) mneg++;
      }
    });
    st.monoNeg = mtot ? mneg / mtot : 0;

    /* 家：取种子间最常见的那个（不是第一个种子的，避免把运气当结论） */
    const tally = {};
    runsOf.forEach((r) => { tally[r.final.homeName] = (tally[r.final.homeName] || 0) + 1; });
    let homeName = '', hn = -1;
    for (const k in tally) if (tally[k] > hn) { homeName = k; hn = tally[k]; }

    return {
      key: G.key, name: G.name, desc: G.desc, ohm: G.ohm,
      theta0: THETA0,
      theta: { a: mean(runsOf.map((r) => r.thetaEnd.a)),
               g: mean(runsOf.map((r) => r.thetaEnd.g)),
               k: mean(runsOf.map((r) => r.thetaEnd.k)) },
      stats: st,
      homeName, homeVotes: hn + '/' + runsOf.length,
      curve: runsOf[0].curve.map((c) => ({
        t: c.t, V: +c.meanV.toFixed(4), VT: +c.meanVT.toFixed(4), Hpi: +c.Hpi.toFixed(4),
        age: c.minRev, a: +c.a.toFixed(3), g: +c.g.toFixed(3), k: +c.k.toFixed(3),
      })),
    };
  });

  return { meta: Object.assign({}, base, { seeds, theta0: THETA0, ln6: Math.log(6) }), groups: out, Vw, Va };
}

/* 帕累托扫描：奖励 = V + λ·novelty，λ 从 0 扫到 12。
 * 这条曲线回答「有没有两全的 λ」，而不是靠调参碰运气。 */
function pareto(opts) {
  const o = opts || {};
  const base = { steps: o.steps || 100000, window: 200, mwin: 2000, cap: 5000 };
  const Vw = vWei();
  const lams = o.lams || [0, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8, 12];
  const seeds = o.seeds || [12345, 777];
  return lams.map((lam) => {
    const rs = seeds.map((sdv) => simulate(Object.assign({}, base, {
      V: Vw, theta0: THETA0, learn: true, bonus: lam, seed: sdv,
    })));
    const V = rs.map((r) => r.final.meanVall);
    const G = rs.map((r) => r.final.ageAll);
    const H = rs.map((r) => r.final.HpiAll);
    return { lam, V: mean(V), age: mean(G), Hpi: mean(H),
             a: mean(rs.map((r) => r.thetaEnd.a)),
             g: mean(rs.map((r) => r.thetaEnd.g)),
             k: mean(rs.map((r) => r.thetaEnd.k)) };
  });
}

module.exports = { N, NB, ham, vWei, vYiqian, vAdversarial, simulate, runs, pareto, GROUPS, THETA0, SEEDS, meanOver, LIMITS };

if (require.main === module) {
  const t0 = Date.now();
  const R = runs({});
  console.log('组  名称          V(真表)      稳态年龄    Hπ      家         θ');
  R.groups.forEach((g) => {
    const s = g.stats;
    console.log(
      g.key.padEnd(3), g.name.padEnd(13),
      (s.meanVTall.toFixed(3) + '±' + s.meanVTall_sd.toFixed(3)).padEnd(13),
      Math.round(s.ageAll).toString().padEnd(9),
      s.HpiAll.toFixed(2).padEnd(7),
      (g.homeName + '(' + Math.round(s.homeFrac * 100) + '%)').padEnd(10),
      [g.theta.a, g.theta.g, g.theta.k].map((v) => v.toFixed(1)).join('/'));
  });
  console.log('耗时', Date.now() - t0, 'ms');
}
