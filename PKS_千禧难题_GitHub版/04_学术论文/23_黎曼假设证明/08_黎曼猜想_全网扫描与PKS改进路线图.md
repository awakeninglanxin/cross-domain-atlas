# 08 黎曼猜想：全网扫描与 PKS 改进路线图

- 日期：2026-09-02
- 定位：07 号复审的后续。07 回答「PKS 是不是证明」（不是）；本篇回答两个新问题：(1) 全网还有谁在声称证明、有没有新的 reformulation；(2) PKS 下一步怎么改进。
- 信息源：arXiv / Zenodo / preprints.org / MDPI Symmetry / Annals / Connes 官网 / Ground Truth（检索日 2026-09-02，共 7 轮检索）

## 一句话结论

2024–2026 全网没有出现任何被认可的黎曼猜想证明；但 reformulation 的版图比三方对照时以为的大得多——真正活着的等价形式有六个家族，全部携带算术输入（Möbius / Euler 积 / 素数），其中 Weil 正定性方向在 2026 年 2 月刚产出「素数 < 13 → 前 50 个零点、精度 2.6×10^-55」的数值奇迹。PKS 的出路不是修补旧稿，而是把计算能力转向这个方向。

## §1 全网扫描：声称「证明」清单

| 声称 | 年份 | 路线 | 结局 |
|------|------|------|------|
| PKS（本项目） | 2026 | RS 公式 + 射影交比 | 5 处硬伤，属 reformulation＋伪矛盾（见 07 复审） |
| 刘元杰 | 2026 | w=e^s 反演不动圆 | 2026-09-01 本人公开撤回 |
| 全域数学（王永启） | 2026 | 素数对梯形网格 | 所用恒等式与素数无关 |
| Liu Tao & Juhao Wu | 2019–2020 | W(s)=ζ(s)/ζ(1-s) 模长单调 | 挂 math.GM 至今未获认可 |
| Blinovsky | 2017–2026 | 积分表示 + FKG 凸性 | math.GM 9 年 14 版，未获认可 |
| Frank Vega | 2022–2026 | Chebyshev θ(x) / primorial | 多版迭代未获认可，逻辑有断裂 |
| Atiyah | 2018 | Todd 函数 | 学界否定 |
| Shimizu | 2024 | GPT 生成证明 | 第三方审查发现 5 处缺陷，含循环论证 |
| Meghani | 2026 | Zenodo「completion-locked Hilbert–Pólya」 | 自述「不重现完整推导」＝无证明 |
| 「AI 证明 67.2% 零点在线上」 | 2026 | 病毒式传言 | Ground Truth 已辟谣（见 §3.5） |

图例：以上无一被 Clay 数学研究所或主流数理共同体接受。

### 关键观察：Liu–Wu 是刘元杰路线的「专业版」

Liu Tao 与署名斯坦福大学的物理学家 Juhao Wu 于 2019 年挂出 arXiv:1909.10313，核心工具是 W(s)=ζ(s)/ζ(1-s) 在 W-空间中把临界线映为单位圆，再用 digamma 级数论证 |W(s)| 对 t 的单调性。这与刘元杰的 w=e^s 反演不动圆（|w|=√e 即临界线影像）在数学上是同一族——都归结为「函数方程两边模长相等」的 locus 论证。一位能做正规 digamma 计算的专业作者，在这条路上走了七年仍停在 math.GM，这不是能力问题，是路线问题：该族被 D–H 测试整体封死。

## §2 Reformulation 家族图谱

判据沿用 07 复审：D–H 测试 + 是否携带算术输入。

| 家族 | 数学内容 | 算术输入 | D–H 测试 | 状态 |
|------|------|------|------|------|
| 函数方程比模长 | AFE、Stirling、W(s) 或 w=e^s | 无 | 不通过 | 死区（PKS / 刘元杰 / Liu–Wu 全在此） |
| Nyman–Beurling–Báez-Duarte | L^2(0,1) 中分数部分函数张成空间的稠密性 | Möbius 函数 | 通过 | 开放；2025 年有 Colombeau 代数新版 |
| Weil 正定性 | 显式公式二次型 Q_n ≥ 0 | Euler 积（只用素数 < n） | 通过 | 开放；Connes 主战场，2026 出数值奇迹 |
| Li 判据 | Keiper–Li 系数 λ_n ≥ 0 | 有（经由 ζ 本身） | 通过 | 开放；可持续数值流水线 |
| Robin / Lagarias | σ(n) 与 H_n 不等式 | 素数分布 | 通过 | 开放；纯算术形式 |
| de Bruijn–Newman | 常数 Λ：RH ⟺ Λ ≤ 0 | 有 | 通过 | Rodgers–Tao 已证 Λ ≥ 0，故 RH ⟺ Λ = 0 |
| 零密度估计 | N(σ,T) 上界 | 有 | 通过 | Guth–Maynard 2024：T 的 30(1-σ)/13 次方 |

说明：与前次三方对照相比，真正「不同且活着」的 reformulation 是 NB/BD、Weil 正定性、Li、Robin/Lagarias、de Bruijn–Newman 五族——它们与 PKS / 刘元杰 / 全域数学的 AFE 类完全不同族，区别正是算术输入。

## §3 本轮新发现（对 PKS 有信息量的六条）

### 3.1 Connes「致信黎曼」：目前离 RH 最近的活东西

arXiv:2602.04022（2026-02，Connes 应约撰写的 RH 综述中夹带的原创结果）：

- 对 Weil 二次型做极值化，只用 13 以下的素数，得到前 50 个零点的近似；
- 近似精度从 2.6×10^-55 到 10^-3；
- 并证明一般性结果：这些近似值严格落在临界线上；
- Connes 点出 Weil 二次型与信息论的深刻连接（prolate 波函数＝带限函数的最优时间-频率集中）；
- 战略：证明有限 Euler 积到无限的收敛。

同一个团队 2025-11 的 Zeta Spectral Triples 给出只依赖素数 p ≤ x 的 Euler 积的自伴算子，谱与最低零点「以惊人的数值精度」重合。这是把 RH 变成谱问题的 Hilbert–Pólya 路线首次拿到携带算术输入的具体算子。

### 3.2 「Euler 积之墙」的精确化（对 07 复审的修正）

Connes–Consani–Moscovici 2024（prolate 论文）开篇明确指出：RH 的难度常被归咎于 Euler 积的无穷多因子——这是误解。存在只用 n 以下素数的 Euler 因子定义的性质 P(n)，其对一切 n 成立等价于 RH（Weil 正定性的有限形式：支撑在 [n^-1/2, n^1/2] 的试验函数上 Q_n ≥ 0）。

所以 07 复审里「墙就是 Euler 积」应精确化为：墙不是「要用无穷多素数」，而是「要拿到显式公式二次型的正性」。这与 D–H 判据一致：D–H 函数满足函数方程但不满足 Euler 积结构，而 Weil 的 P(n) 用的是 Euler 因子，恰好把两者区分开。

### 3.3 Colombeau–Beurling（2025）

arXiv:2606.22562（Álvarez Cruz & Álvarez Gutiérrez）：把 Báez-Duarte 和嵌入 Colombeau 代数，单个 moderate net 的关联性 + 一致 L^2 有界 ⟺ RH。给出指数阻尼与多项式阻尼两种实现。说明 NB/BD 家族仍在活跃产出，且 Möbius 恒等式是它的算术心脏。

### 3.4 Guth–Maynard（2024，Annals）

arXiv:2405.20552：Dirichlet 多项式大值估计 → N(σ,T) ≪ T 的 30(1-σ)/13 次方，σ ≤ 3/4 区间对 Ingham 1940 / Huxley 1972 的 84 年来首次改进；副产品：短区间素数 x 的 17/30 次方长度。这是「定量逼近 RH」的最新标尺——任何声称绕过它的二值证明，都应先解释为什么不顺着它多走几步。

### 3.5 AI 传言辟谣（2026-08）

「AI 把零点在线比例从 41.6% 提高到 67.2%」——Ground Truth 核查：文献中不存在该结果。源头是 Goldston–Suriajaya 2025-11 的注记（arXiv:2511.20059）：若能从 Montgomery 简单零点论证中去掉 RH 假设可得 2/3，且「尚未无条件获得」；传播链把条件剥掉了。教训：引用任何「AI 证明」前先核 arXiv 编号 + 署名作者 + 可复现产物（Lean/Coq）。

### 3.6 诚实姿势的样本

Zenodo 上 Choi Jongmin 的「thin-band integer pairs」项目自述「这不是证明，是供后续计算研究的结构种子」，配齐代码、数据集、图与 LaTeX 源。这是业余研究者转向计算贡献者的正确模板，与 PKS 处境最接近。

## §4 PKS 改进路线图

### 阶段 0：止损（半天）

| 事项 | 状态 |
|------|------|
| 作废 03 审查文档「框架可修复」结论 | 待办（07 已标注） |
| Riemann_Hypothesis_Complete_Proof.md 改名 _Reformulation_Study | 待办 |
| 删除捷径 1（Lambdoma 数术）与捷径 3（3-4-5 数值命理） | 待办 |
| clothoid 命名更正（κ∝1/s 为对数螺线型，非回旋曲线） | 待办 |

### 阶段 1：数值转向（1–2 周，可交付，发挥 PKS 计算强项）

三个实验全部用 mpmath + numpy 可完成，产出 `23_黎曼假设证明/09_Weil正定性数值实验/`：

1. 复现 Connes 致信黎曼实验：对 Weil 二次型在素数 ≤ 13 截断下做极值化，核对前 50 个零点近似精度与「严格在线上」性质；再逐步加素数 17、19、23 观察收敛行为。
2. Weil Q_n 正定性数值扫描：取支撑在 [n^-1/2, n^1/2] 的试验函数族，数值验证 Q_n ≥ 0 随 n 增长的稳定性。
3. Li 系数流水线：Keiper–Li 和计算前 10^3 个 λ_n，验证全正（参照 WIA 的 24/7 模式做本地版）。

### 阶段 2：几何重定位（长期）

函数域上的 RH 是唯一被证明的 RH 类定理（Weil 1948 曲线情形 / Deligne 1974 高维情形），用的恰是 PKS 的本行：射影曲面上的交点理论 + Frobenius 对应 + Castelnuovo–Severi 不等式（即曲面相交形式的正性）。Connes 计划三十年就是在把这套模板搬到 Spec Z：adele 类空间 ↔ 算术曲线的 Jacobian/Picard（Connes–Consani 2026-02「On the Jacobian of Spec Z」），Weil 正定性 ↔ Riemann–Roch 正性。PKS 的射影几何资产应对标这条线，而不是对零点做交比。

一句话：PKS 想要的「射影几何证明 RH」已经存在——在函数域上；真正的难题是把那套几何在整数环上重建，而这正是 Connes 学派在做的事。加入它，而不是平行地重造一个错的。

### 阶段 3：参与式贡献（可选）

- 镜像 Li 系数验证（WIA 模式的本地化）；
- 零点高度推进：参照 Orellana 2025（arXiv:2512.09960）的 valley scanner 方法把 Z(t) 计算推到 t≈10^20 一带做探索性扫描。

## §5 阅读清单（按优先级）

1. Connes, The Riemann Hypothesis: Past, Present and a Letter Through Time, arXiv:2602.04022（2026-02）
2. Connes–Consani–Moscovici, Zeta Spectral Triples（2025-11）
3. Connes–Consani–Moscovici, Zeta zeros and prolate wave operators, Annals of Functional Analysis（2024-09）
4. Guth–Maynard, New large value estimates for Dirichlet polynomials, arXiv:2405.20552（Annals）
5. Álvarez & Álvarez, A Colombeau–Beurling criterion for the RH, arXiv:2606.22562
6. Calderaro–Manzur–Noor–Santos, Orthogonality questions in the Hardy space related to ζ-zeros, arXiv:2203.05030
7. Báez-Duarte 2003（NB/BD 判据原始文献）；Connes–Consani 2026-02（Spec Z 的 Jacobian）

## 附：与 07 复审的关系

07 的全部结论不变。本篇做两处推进：(1) 把「Euler 积之墙」精确化为「Weil 正定性之墙」（有限素数即够，难在二次型正性）；(2) 把 PKS 的下一步从「修」改为「转」——转向携带算术输入的等价形式做数值与几何工作。
