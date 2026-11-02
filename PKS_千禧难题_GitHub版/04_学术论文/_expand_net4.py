# -*- coding: utf-8 -*-
"""第四批扩网：+20 节点 / +96 边 / 拆出第 12 分类「网络与数据几何」。

查法与前几批不同：不问「缺哪个前沿」，问「每个已有节点脚下踩着什么基础设施」。
  · 谱几何踩选择定则（关闭挂账：Cₙ 等变 ⇒ 只保留 k ≡ 0 mod n）
  · 数值线性代数踩向后误差；可积踩 KAM；学习理论踩经验过程
  · 17 个度 ≤ 2 的弱节点逐个补到 ≥ 3
  · geometry 31 件过载 ⇒ 拆出 netgeom（TDA、谱图论、信息几何、汉明图等）

纪律（沿用）：
  · 每条边必须有理由；悬空 id / 自环 / 重复边 / 星号 / 尖括号一律预检报错
  · 全部预检 → 写 .tmp → 复核关键标记 → copyfile 覆盖（不许在目标文件上原地分段改）
"""
import io, json, sys, re, shutil, os

P = 'AAA_数学物理跨界关联.html'
TMP = P + '.tmp'
s = io.open(P, encoding='utf-8').read()

# ---------------------------------------------------------------- 新节点
NEW = [
 dict(id='spde', cat='analysis', era='1975 Walsh／1986 KPZ／2014 正则结构',
      name='随机偏微分方程与正则结构',
      en='Stochastic PDEs & Regularity Structures',
      desc='把噪声从轨道推广到场：时空白噪声驱动的方程（KPZ、动态 Φ⁴、随机热方程），'
           '解不再逐点存在，只能当随机分布。Hairer 的正则结构给出重整化的代数框架 —— '
           '与重整化群做同一件事：先把无穷减掉，再谈方程的解。'
           '随机神经网络的大 N 极限（空腔法解的那类）落点也在这里。'),
 dict(id='roughpath', cat='analysis', era='1998 Lyons',
      name='粗路径与路径特征',
      en='Rough Paths & Signatures',
      desc='不依赖概率的随机微积分：把「路径」换成「路径的迭代积分塔」（特征 signature），'
           '一阶的不稳定被更高阶项吸收。特征是路径的完全不变量 —— '
           '同特征的两条路径驱动同一线性系统，输出完全相同。'
           '机器学习把 log-signature 当时间序列特征：任意长度压成固定维数、还保序。'),
 dict(id='kam', cat='analysis', era='1954 Kolmogorov／1962–63 Arnold–Moser',
      name='KAM 理论与近可积系统',
      en='KAM Theory & Near-Integrable Systems',
      desc='可积系统的轨道躺在不变环面上；加小扰动，环面不立刻碎 —— 测度上大部分还在，只是变形。'
           '这是「守恒系统能否稳定」的最终答案：既不全遍历、也不全可积。'
           '太阳系长期稳定性、磁力线的 KAM 屏障、加速器的共振岛，全是它的应用面。'),
 dict(id='homogenization', cat='analysis', era='1967 Spagnolo／1970s Babuška',
      name='均质化与多尺度展开',
      en='Homogenization & Multiscale Expansions',
      desc='系数在细尺度剧烈振荡的方程，在粗尺度表现为一个等效均匀方程 —— 先解后者。'
           '复合材料导热、多孔介质渗流、等效电磁参数，工程里天天做均质化只是不叫这个名字。'
           '与重整化群是同一件事的两种说法：把短波长自由度积掉，只留长波。'),
 dict(id='selrule', cat='algebra', era='1927 Wigner／1931 群论进入力学',
      name='对称约束下的谱选择定则',
      en='Selection Rules under Symmetry',
      desc='对称性先于计算砍掉不可能的项：圆对称下傅里叶只剩 m∈Z；'
           'Cₙ 等变下角谱只保留 k ≡ 0 mod n；球对称只剩球谐的 (l,m)。'
           '表示论给禁戒规则记账 —— 不出现的不可约表示 = 禁戒的跃迁。'
           '六维卦序的强度模型里，角谱没算就先被 Cₙ 等变砍掉大半：这是省算力最古老也最硬的一招。'),
 dict(id='expander', cat='netgeom', era='1973 Pinsker／1984 Margulis／1988 LPS',
      name='扩展图与伪随机性',
      en='Expander Graphs & Pseudorandomness',
      desc='顶点不多、边不多，信息却扩散得像随机图 —— 谱间隙（第二特征值离第一特征值够远）是它的定义。'
           '纠错码、杂凑函数、去随机化、马氏链快速混合，全踩在扩展图上。'
           'Ramanujan 图是代数数论反过来喂给网络设计的例子。'),
 dict(id='randomgraph', cat='netgeom', era='1959 Erdős–Rényi／2006 graphon',
      name='随机图与图极限',
      en='Random Graphs & Graphons',
      desc='问「掷出来的图长什么样」而不是「最坏情形多少边」。'
           'p = 1/n 处巨分量诞生是随机结构的教科书相变；不变量（谱、三角形数）集中在均值附近。'
           'graphon 给出图序列的极限对象 —— 「越来越大的图收敛到什么」第一次有答案，'
           '也是图神经网络外推的数学底座。'),
 dict(id='matroid', cat='algebra', era='1935 Whitney',
      name='拟阵与贪心算法',
      en='Matroids & Greedy Algorithms',
      desc='把「独立」公理化：矩阵的线性无关列、图的森林、相容的任务集 —— 同一个抽象的三件皮。'
           '核心定理：贪心全局最优，当且仅当可行集构成拟阵。'
           '这是「贪心」从直觉变成定理的那一天，也是组合优化与代数握手的地方。'),
 dict(id='tropical', cat='geometry', era='1980s–2000s（Mikhalkin 等）',
      name='热带几何',
      en='Tropical Geometry',
      desc='加法换成取 max、乘法换成加法，代数簇变成分片线性多面体复形 —— 弯曲被压平，组合骨架露出来。'
           '三件应用：代数曲线退化族（计数不变量在极限里可算）、调度与最短路（max-代数的线性代数）、'
           '拟阵可实现性。符号方程的退化像住在这里。'),
 dict(id='szemeredi', cat='number', era='1975 Szemerédi／2004 Green–Tao',
      name='正则性引理与加性组合',
      en='Regularity Lemma & Additive Combinatorics',
      desc='任何大图都能切成有限多块、使边分布几乎均匀 —— 证明靠「能量递增」的 ε-正则化。'
           '加性组合用它把「正密度 ⇒ 结构」做成机器：Green–Tao 素数含任意长算术级数是代表作。'
           '筛法给密度、加性组合把密度换成结构，两段接力。'),
 dict(id='empirical_proc', cat='probstat', era='1933 Glivenko–Cantelli／1971 VC 维',
      name='经验过程与一致收敛',
      en='Empirical Processes & Uniform Convergence',
      desc='单点收敛（大数律）不够，要「整条分布函数同时收敛」—— 极限对象是一条布朗桥。'
           '对多大的函数类还能一致收敛？答案是覆盖数／VC 维。'
           '学习理论的过拟合界、高维统计的收敛判据、半参数效率，全住在这层地基上。'),
 dict(id='online_learning', cat='aim', era='1956 Hannan／1997 Freund–Schapire',
      name='在线学习与遗憾界',
      en='Online Learning & Regret Bounds',
      desc='假设数据独立同分布太奢侈：在线设定里对手任意出招，只要求累计遗憾 o(T)。'
           '镜像下降 O(√T) 的界不靠任何分布假设 —— 这是把「学习」从统计搬进博弈的一步。'
           '多臂老虎机、专家问题、在线凸优化是三张标准皮。'),
 dict(id='nonconvex', cat='numeric', era='2014 起「景观纲领」',
      name='非凸优化与能量景观',
      en='Nonconvex Optimization & Loss Landscapes',
      desc='凸性的保证在深度学习里全数失效，于是改问「非凸但好的景观长什么样」：'
           '没有坏局部极小、鞍点多项式时间可逃。自旋玻璃是坏非凸的物理标本（局域极小指数多），'
           '损失面的谱统计（Hessian 的 Marchenko–Pastur 尾巴）是好非凸的判据。'
           '景观拓扑随参数突变，就是分岔。'),
 dict(id='approx_algo', cat='logic', era='1992 PCP 定理／2004 UGC',
      name='近似算法与不可近似性',
      en='Approximation Algorithms & PCP',
      desc='NP 难的优化问题退一步问「能保证多近」。线性规划松弛加舍入是标准两步，整数间隙是天花板。'
           'PCP 定理证明有些问题连近似都是 NP 难（最大割 0.878 的线画在 UGC 上）—— '
           '不可近似性从此和不可判定一样可以证明。'),
 dict(id='tensor_network', cat='numeric', era='1992 DMRG／2009 TT 分解',
      name='张量网络与低秩张量',
      en='Tensor Networks & Low-Rank Tensors',
      desc='矩阵秩的递归推广：把 d 维数组切成小张量的收缩链／网。'
           '物理（MPS／PEPS 表示量子态，纠缠熵即压缩率）与计算（TT 分解把高维问题逐维 SVD）'
           '在同一件工具上会师。Mamba 的状态空间模型，本质是一张可并行训练的线性张量网。'),
 dict(id='quantum_algo', cat='numeric', era='1994 Shor／1996 Grover',
      name='量子算法与量子傅里叶变换',
      en='Quantum Algorithms & QFT',
      desc='量子傅里叶变换把「周期」藏进振幅相位，Shor 用它把因数分解变成多项式时间 —— '
           'RSA 的地基被换成后量子密码。相位估计是大多数量子算法的心脏（把本征值磨成二进制位），'
           'Grover 是无条件加速的孤例（平方根）。BQP 在复杂度地图上的位置至今不明。'),
 dict(id='backward_error', cat='numeric', era='1960–63 Wilkinson',
      name='向后误差与条件数',
      en='Backward Error & Conditioning',
      desc='换一个问法救了整门学科：算出的解，是不是某个附近方程的精确解？'
           '是 —— 算法稳定；附近解变化多快 —— 问题病态。算法与问题分开问责，'
           '从此「数值不准」有了法庭。区间算术加定理证明器把它推到极端：证明「解在这个球里」。'),
 dict(id='gr_math', cat='geometry', era='1915 Einstein／1952 Choquet-Bruhat',
      name='爱因斯坦方程与时空曲率的数学',
      en='Einstein Equations & Mathematical GR',
      desc='度量即引力：Gμν = 8πTμν 是一个拟线性双曲组的柯西问题。'
           'Choquet-Bruhat 的适定性用索伯列夫能量估计；Penrose 奇点定理用整体微分几何；'
           '正质量定理用极小曲面。时空弯曲（PKS）那套可视化挂在它上面。'),
 dict(id='gauss_process', cat='probstat', era='1951 Krige／1996 Rasmussen–Williams',
      name='高斯过程与核岭回归',
      en='Gaussian Processes & Kernel Ridge Regression',
      desc='先验取高斯、后验还是高斯 —— 推断整个变成线性代数，协方差核是唯一要选的东西。'
           '与核岭回归是同一张表的两种读法（贝叶斯对正则化），骨架是再生核希尔伯特空间。'
           '高斯求积节点 = 最优采样点：贝叶斯数值积分连「怎么采样」都变成推断。'),
 dict(id='metric_geometry', cat='geometry', era='1987 Gromov（双曲群）',
      name='度量几何与 Gromov 双曲',
      en='Metric Geometry & Gromov Hyperbolicity',
      desc='扔掉微分结构只留距离：曲率变成三角比较（CAT(k)、Alexandrov），'
           '流形收敛变成 Gromov–Hausdorff 距离。双曲群（细三角条件）把「树状」严格化 —— '
           '层级数据的双曲嵌入以它为目标空间。TDA 的稳定性定理就住在 GH 距离上。'),
]

MOVE_NETGEOM = ['tda', 'specgraph', 'ricci', 'hamming', 'persist_lap', 'info_geom']

# ---------------------------------------------------------------- 新边（96 条，每条都有理由）
EDGE = [
 # spde
 ('spde', 'sde', '把噪声从有限维轨道推广到时空场：Itô 积分换成随机分布积分，解的正则性掉一截。'),
 ('spde', 'pde', '确定方程加时空白噪声：弱解框架不够用，必须先重整化再谈解。'),
 ('spde', 'rg', 'Hairer 正则结构给 KPZ／动态 Φ⁴ 做的重整化，与重整化群是同一招 —— 先减掉无穷，再谈方程。'),
 ('spde', 'statmech', '动态 Φ⁴、KPZ 本来就是临界现象的时间演化；随机神经网络的大 N 极限也落在这里。'),
 # roughpath
 ('roughpath', 'sde', 'Itô 微积分回答「怎么对噪声积分」，粗路径回答「路径本身携带什么信息」—— 不依赖概率的确定性理论。'),
 ('roughpath', 'control', '路径特征是控制系统的完全不变量：同特征的两条路径驱动同一个线性系统，输出相同。'),
 ('roughpath', 'ml', 'log-signature 当特征向量：任意长度的时间序列变成固定维数、还保序 —— 时间序列特征的新工具。'),
 ('roughpath', 'spde', '正则结构以粗路径为地基：先有「路径的确定性微积分」，才有「随机方程的重整化解」。'),
 # kam
 ('kam', 'symplectic', 'KAM 说的正是辛结构怎样在小扰动下保住不变环面 —— 哈密顿力学的稳定层。'),
 ('kam', 'integrable', '可积系统被环面捆住；KAM 回答「加一点不可积之后，环面还剩多少」。'),
 ('kam', 'bifurcation', '环面破坏的方式就是分岔：周期倍化、同宿纠缠，都发生在 KAM 环面的边界上。'),
 ('kam', 'symplectic_int', '保结构积分器存在的理由：普通方法把环面磨掉，辛积分器让 KAM 结构在数值里活着。'),
 ('kam', 'ergodic', 'KAM 环面把相空间切成不变块，整体遍历性失败 —— 这是「遍历」必须面对的第一个反例。'),
 # homogenization
 ('homogenization', 'pde', '系数在细尺度剧烈振荡的方程，在粗尺度表现为一个等效均匀方程 —— 先解后者。'),
 ('homogenization', 'rg', '同一件事两种说法：把短波长自由度积掉只留长波，RG 叫重整化，PDE 叫均质化。'),
 ('homogenization', 'multigrid', '多重网格的粗网格校正，就是均质化在算法里的影子。'),
 ('homogenization', 'fem', '系数振荡剧烈时有限元必须用多尺度基函数，否则网格追不上振荡。'),
 ('homogenization', 'ns_cd', '湍流的多尺度串级是最著名的未解均质化问题：平均效应存在，但从方程推不出来。'),
 # selrule（关闭挂账：Cₙ 等变 ⇒ k ≡ 0 mod n）
 ('selrule', 'fourier', '傅里叶级数最深的用法不是展开，是「对称先定哪些系数必为零」：圆对称只剩 m∈Z。'),
 ('selrule', 'representation', '选择定则就是表示论的直和分解：禁戒的跃迁对应「不出现的不可约表示」。'),
 ('selrule', 'lie', '连续对称的生成元与量子数的对易关系，决定能级怎么分族 —— 李代数在记账。'),
 ('selrule', 'spectral_geom', '「能听见鼓的形状」的实用版：对称性先砍掉一半谱，再谈反演。'),
 ('selrule', 'spherepack', '球谐是 SO(3) 不可约表示的实现；Clebsch–Gordan 系数表就是选择定则的账本。'),
 ('selrule', 'special_fn', '特殊函数表 = 对称空间的谐函数表：查一张表，就是在读一条选择定则。'),
 ('selrule', 'rope', 'RoPE 把平移等变写进注意力：相对位置的相位旋转正是傅里叶域里最朴素的选择定则。'),
 # expander
 ('expander', 'specgraph', '扩展图的定义就是谱的：第二特征值间隙够大，图就「连接得像随机图」。'),
 ('expander', 'randomgraph', '随机图以高概率是扩展图 —— 「像随机」被谱量化之后，从构造变成定理。'),
 ('expander', 'complexity', '去随机化：伪随机数发生器的可靠性最终归结为显式扩展图的存在性。'),
 ('expander', 'crypto', '杂凑的雪崩效应、混合网络的保密性，工程上都要求「这东西表现得像扩展图」。'),
 # randomgraph
 ('randomgraph', 'graph', '极值图论问最坏情形，随机图论问典型情形 —— 同一个对象的两副面孔。'),
 ('randomgraph', 'cavity', '空腔法的主场就是局部树状随机图；自旋玻璃在随机图上的解是标准算例。'),
 ('randomgraph', 'concentration', '图的不变量集中在均值附近：邻接谱、三角形数，都只看一两眼就定住。'),
 ('randomgraph', 'gnn', 'graphon 是图序列的极限对象，也是「图神经网络在无限图上收敛吗」的答案草稿。'),
 # matroid
 ('matroid', 'graph', '图的生成树 = 图拟阵的基：「哪些边集成环」这套直觉整个搬进代数。'),
 ('matroid', 'linspace', '线性无关的公理化：矩阵的列、图的森林、相容任务集 —— 同一个抽象的三件皮。'),
 ('matroid', 'convex', '贪心算法全局最优当且仅当可行集构成拟阵：「贪心」有定理的第一天。'),
 ('matroid', 'tropical', '拟阵是热带几何的骨架之一：热带簇的连通性与拟阵的可实现性问题咬在一起。'),
 # tropical
 ('tropical', 'algebraic_geom', '把代数簇的对数极限变成分片线性多面体复形 —— 用组合看弯曲。'),
 ('tropical', 'scheme', '赋值环把 tropical 化做成正经的代数几何：概形语言原样可用。'),
 ('tropical', 'algebra_sym', '符号方程的退化像：加法换成取 max，代数方程变成调度问题 —— 组合优化的影子出现在代数里。'),
 # szemeredi
 ('szemeredi', 'graph', '正则性引理：任何大图都能切成有限多块、边分布几乎均匀 —— 图论的有限模型论。'),
 ('szemeredi', 'analytic_number', 'Green–Tao 用它证明素数含任意长算术级数：先稠密化，再用 Szemerédi 定理。'),
 ('szemeredi', 'sieve', '筛法给「素数在粗集合里的密度」，加性组合把密度换成结构 —— 两段接力。'),
 ('szemeredi', 'erdos_prob', 'Erdős 问题库里一大批加性组合问题（等差数列、和集），答案的骨架都在这。'),
 # empirical_proc
 ('empirical_proc', 'clt', '中心极限定理是单点的；经验过程是整条分布函数同时收敛 —— 极限对象是一条布朗桥。'),
 ('empirical_proc', 'concentration', '集中不等式给单点界，经验过程把「对每个集合一致」变成可算的熵积分。'),
 ('empirical_proc', 'highdim', '高维统计的收敛判据最后都回到经验过程：多大的函数类，经验风险还逼近真实风险。'),
 ('empirical_proc', 'ml', '学习理论的根基：VC 维 = 让一致收敛仍成立的最大复杂度，过拟合的界从这里来。'),
 ('empirical_proc', 'genfunc', '「几维空间里能摆几个球」这类计数，是覆盖数与 VC 维的算术底座。'),
 # online_learning
 ('online_learning', 'game', '博弈论问均衡；在线学习问没均衡时怎么少输 —— 遗憾是给非均衡世界准备的量。'),
 ('online_learning', 'convex', '镜像下降 O(√T) 的遗憾界全靠凸性：凸优化第一次离开批量设定。'),
 ('online_learning', 'ml', '「分布固定」改成「对手任意」，泛化的剧本整个重写。'),
 ('online_learning', 'dp', '动态规划是在线决策的已知模型基线：状态已知时的最优，正好量出「未知」的代价。'),
 # nonconvex
 ('nonconvex', 'energymodel', 'softmax 策略的能量面是非凸的教科书样本：盆地、鞍点、出口全都在。'),
 ('nonconvex', 'statmech', '自旋玻璃把「坏的非凸」写成物理：局域极小数目随维度指数增长。'),
 ('nonconvex', 'scaling', '缩放律是现象，景观是解释候选：为什么越大的网络损失面越好走。'),
 ('nonconvex', 'gradient', '一阶方法在非凸上的唯一保证是驻点：「梯度小」不等于「解好」。'),
 ('nonconvex', 'bifurcation', '景观拓扑随参数突变就是分岔：损失面的跳变是它的影子。'),
 # approx_algo
 ('approx_algo', 'complexity', 'PCP 定理：验证只读常数位 ⇒ 有些问题连近似都 NP 难 —— 不可近似性从此可证。'),
 ('approx_algo', 'lp', '线性规划松弛加舍入是标准两步；松弛的整数间隙就是性能天花板。'),
 ('approx_algo', 'graph', '最大割、着色、旅行商 —— 组合优化的近似比教科书。'),
 ('approx_algo', 'sat', 'SAT 随机赋值给 7/8 近似；PCP 说再好一点点就到头。'),
 # tensor_network
 ('tensor_network', 'tensor', '张量分析的工程版：不问秩的代数定义，问「怎么切成小张量的收缩网」。'),
 ('tensor_network', 'qinfo', 'MPS／PEPS 表示量子态：纠缠熵低 = 可被张量网络压缩，面积律是物理版。'),
 ('tensor_network', 'numerical_linear', '矩阵 SVD 的递归推广：TT 分解就是把高维奇异值一维一维做下去。'),
 ('tensor_network', 'ssm', 'Mamba 的状态空间模型把注意力换成低秩递推 —— 一张可并行训练的线性张量网。'),
 # quantum_algo
 ('quantum_algo', 'fft', 'QFT 是 FFT 在振幅上的类比：把频率藏进相位，周期自己站出来。'),
 ('quantum_algo', 'crypto', 'Shor 把因数分解变成多项式时间：RSA 的地基被换成后量子密码。'),
 ('quantum_algo', 'complexity', 'BQP 是复杂度地图上的新大陆 —— 与 NP 的关系至今不明。'),
 ('quantum_algo', 'qinfo', '算法跑在纠缠上：纠缠资源与不可克隆，决定量子能快多少。'),
 ('quantum_algo', 'spectral', '相位估计是大多数量子算法的心脏：把本征值磨成二进制位。'),
 # backward_error
 ('backward_error', 'numerical_linear', '「算的解是不是附近某方程的真解」—— Wilkinson 这个问法把数值分析变成数学。'),
 ('backward_error', 'interpolation', 'Runge 现象不是插值坏了，是问题病态：条件数先于算法回答「该怪谁」。'),
 ('backward_error', 'autodiff', '自动微分精确到机器精度，但对不稳定的算法做精确微分照样放大误差 —— 先稳再快。'),
 ('backward_error', 'cg', 'Krylov 方法的收敛理论建立在向后误差上：残差小 = 精确解了附近系统。'),
 ('backward_error', 'lean', '形式化加区间算术 = 可验证数值计算：证明「解在这个球里」，不是「大概在那里」。'),
 # gr_math
 ('gr_math', 'riemann_geom', '度量即引力：爱因斯坦方程是「曲率张量 = 能量动量」的一条黎曼几何等式。'),
 ('gr_math', 'pde', '它是一个拟线性双曲组的柯西问题 —— 适定性是纯 PDE 问题，质量之谜住在解空间里。'),
 ('gr_math', 'sobolev', '「时空从奇点光滑延拓」的证明用的正是索伯列夫能量估计；囚徒域是代表作。'),
 ('gr_math', 'qft', '量子场论在弯曲背景上：两个节点互相向对方要边界条件 —— 半经典引力的正门。'),
 # gauss_process
 ('gauss_process', 'bayes', '先验取高斯、后验还是高斯：推断整个变成线性代数 —— 贝叶斯最听话的一支。'),
 ('gauss_process', 'ntk', '核 = 相似度 = 特征空间内积；GP 回归与核岭回归是同一张表的两种读法。'),
 ('gauss_process', 'functional', '高斯过程是「函数空间里的高斯向量」；再生核希尔伯特空间是它的解析骨架。'),
 ('gauss_process', 'ortho_poly', '高斯求积的节点就是最优采样点：贝叶斯数值积分把「怎么采样」也变成推断。'),
 # metric_geometry
 ('metric_geometry', 'disc_geom', '扔掉微分结构只留距离：多面体几何与离散几何在度量层重新统一。'),
 ('metric_geometry', 'tda', 'Gromov–Hausdorff 距离给「形状之间差多远」一个数：持久同调的稳定性定理住在它上面。'),
 ('metric_geometry', 'hyperbolic', '双曲嵌入的目标空间就是 Gromov 双曲空间 —— 树是它的极端情形。'),
 ('metric_geometry', 'riemann_geom', '黎曼流形是带微分结构的度量空间；Alexandrov 曲率比较反过来喂回流形几何。'),
 # ---- 补强弱节点（17 个度 ≤ 2 的逐个补到 ≥ 3，本组 8 条不在上面出现过的）----
 ('placevalue', 'log', '位值制把「多少」写成一串数字，对数数这串数字的长度 —— 位数的连续版。'),
 ('fraction', 'padic', '有理数有两种完备化：沿「大小」得实数，沿「整除性」得 p 进数 —— 分数在两边都是稠密那层。'),
 ('ncg', 'rg', '谱作用量的重整化流是非交换几何与重整化群的握手点。'),
 ('operator_algebra', 'statmech', 'KMS 态把平衡态统计力学写成算子代数的语言 —— 算子代数在物理里最深的落点。'),
 ('reciprocity', 'langlands', '二次互反律是朗兰兹纲领在 GL(1) 的情形 —— 整座大厦的第一块样板间。'),
 ('alpha', 'mcts', 'AlphaProof 的搜索骨架就是蒙特卡洛树搜索：价值网络当先验，证明器当裁判。'),
 ('yang_mills', 'rg', '质量间隙必须经重整化群说话：耦合随能标跑，禁闭是红外端的未解之谜。'),
 ('morse', 'diff_topology', '莫尔斯理论是微分拓扑的标准工具：h-协边定理的证明骨架就是一组临界点操作。'),
]

# ---------------------------------------------------------------- 文案锚点（每处必须恰好出现 1 次）
TXT = [
 ('<title>数学物理跨界关联 · 206 件工具与它们之间的理由</title>',
  '<title>数学物理跨界关联 · 226 件工具与它们之间的理由</title>'),
 ('本页扩至 <b>206 / 658</b>；<b>2026-11-02 补了三批</b>：先 20 件（谱与响应、噪声与涨落、反演与估计、不变量与守恒），再 6 件（Koopman 谱、信息几何、持久 Laplacian、特殊函数、渐近分析、正交多项式），最后 5 件（汉明图、分布距离、能量模型、Kac 回归时间、势函数与梯度流）—— 最后一批不是挑的，是拿 cRSI 的源码对出来的。',
  '本页扩至 <b>226 / 754</b>；<b>2026-11-02 补了四批</b>：先 20 件（谱与响应、噪声与涨落、反演与估计、不变量与守恒），再 6 件（Koopman 谱、信息几何、持久 Laplacian、特殊函数、渐近分析、正交多项式），又 5 件（汉明图、分布距离、能量模型、Kac 回归时间、势函数与梯度流，拿 cRSI 的源码对出来的），最后 20 件（随机 PDE、粗路径、KAM、均质化、谱选择定则、扩展图、随机图、拟阵、热带几何、正则性引理、经验过程、在线学习、非凸景观、近似算法、张量网络、量子算法、向后误差、爱因斯坦方程的数学、高斯过程、度量几何）—— 最后一批换了查法：不问「缺哪个前沿」，问「每个节点脚下踩着什么基础设施」。分类也从 11 个拆成 12 个（新增「网络与数据几何」）。'),
 ('<div class="pill" id="crumb">总览 · 206 件工具 · 658 条连线</div>',
  '<div class="pill" id="crumb">总览 · 226 件工具 · 754 条连线</div>'),
 ('<p class="epiSub">206 件工具 · 658 条理由 · 11 个分类 · 220 个问题 · 0 个确定答案</p>',
  '<p class="epiSub">226 件工具 · 754 条理由 · 12 个分类 · 220 个问题 · 0 个确定答案</p>'),
 ('这张网画了 <b>206 件工具</b>、<b>658 条连线</b>、<b>11 个分类</b>',
  '这张网画了 <b>226 件工具</b>、<b>754 条连线</b>、<b>12 个分类</b>'),
 ('<b>206 个节点里，没有一个叫「你」。</b>', '<b>226 个节点里，没有一个叫「你」。</b>'),
 ('不在这 206 个节点里', '不在这 226 个节点里'),
 ('在 206 个节点里占', '在 226 个节点里占'),
 ('若日后给 206 个节点改名', '若日后给 226 个节点改名'),
 ('206 件数学工具，<b>8 个能亲手做出来的例子</b>', '226 件数学工具，<b>8 个能亲手做出来的例子</b>'),
 ('这张图上的 206 件工具', '这张图上的 226 件工具'),
 ('206 件各看一眼', '226 件各看一眼'),
 ('这个页面上 206 件工具、658 条理由', '这个页面上 226 件工具、754 条理由'),
 ('。206 件工具里，', '。226 件工具里，'),
 ('而 175 个节点全是', '而 226 个节点全是'),
 ('2026-11-02 补的 31 件，为什么之前不在图上', '2026-11-02 补的 51 件，为什么之前不在图上'),
 ('选这 31 件用三条判据', '选前 31 件用三条判据'),
]
# 第三批段落之后插第四批段落
INS_ANCHOR = '已经在图上的（图论、随机过程、遍历、大偏差、集中不等式、鞅、谱图论、守恒律、梯度下降）就不重复加了。</p>'
INS_PARA = ('<p><b>同日第四批 +20</b>（随机 PDE、粗路径、KAM、均质化、谱选择定则、扩展图、随机图、拟阵、热带几何、'
            '正则性引理、经验过程、在线学习、非凸景观、近似算法与 PCP、张量网络、量子算法、向后误差、'
            '爱因斯坦方程的数学、高斯过程、度量几何）：<b>这一批换了查法</b> —— 不再问「缺哪个前沿」，'
            '改问「每个已有节点脚下踩着什么基础设施」：谱几何踩选择定则，数值线性代数踩向后误差，可积踩 KAM，'
            '学习理论踩经验过程。顺带把 17 个只有两条边的节点逐个补到三条以上，并把「网络与数据几何」'
            '拆成第 12 个分类（TDA、谱图论、信息几何、汉明图等 8 件）—— 几何与拓扑瘦身回经典版图。</p>')

# ---------------------------------------------------------------- 预检
prob = []
i = s.find('const DATA = ') + 13
if i < 13: sys.exit('找不到 DATA 块')
d = 0; end = -1; instr = False; esc = False
for k in range(i, len(s)):
    c = s[k]
    if instr:
        if esc: esc = False
        elif c == '\\': esc = True
        elif c == '"': instr = False
        continue
    if c == '"': instr = True; continue
    if c == '{': d += 1
    elif c == '}':
        d -= 1
        if d == 0: end = k + 1; break
if end < 0: sys.exit('DATA 块括号不配对')
DATA = json.loads(s[i:end])

old_n, old_e = len(DATA['nodes']), len(DATA['edges'])
ids = {n['id'] for n in DATA['nodes']}
names = {n['name'] for n in DATA['nodes']}
ALLOWED = ('foundation','algebra','geometry','netgeom','analysis','number',
           'probstat','logic','numeric','applied','ai','aim')
for n in NEW:
    if n['id'] in ids: prob.append('id 重复：' + n['id'])
    if n['name'] in names: prob.append('name 重复：' + n['name'])
    if n['cat'] not in ALLOWED: prob.append('未知分类：' + n['cat'])
    for k in ('name', 'en', 'desc', 'era'):
        v = n.get(k)
        if not v: prob.append('%s 的 %s 为空' % (n['id'], k))
        if '**' in v: prob.append('%s 的 %s 有星号（会原样印出）' % (n['id'], k))
        if '<' in v or '>' in v: prob.append('%s 的 %s 含尖括号（会被当标签）' % (n['id'], k))
for nid in MOVE_NETGEOM:
    if nid not in ids: prob.append('待迁移节点不存在：' + nid)
newids = ids | {n['id'] for n in NEW}
eset = set()
for e in DATA['edges']:
    eset.add((e['s'], e['t'])); eset.add((e['t'], e['s']))
seen = set()
for a, b, r in EDGE:
    if a not in newids: prob.append('边起点不存在：' + a)
    if b not in newids: prob.append('边终点不存在：' + b)
    if a == b: prob.append('自环：' + a)
    if len(r) < 8: prob.append('理由太短（等于没理由）：%s-%s' % (a, b))
    if (a, b) in seen: prob.append('批次内重复边：%s-%s' % (a, b))
    if (a, b) in eset or (b, a) in eset: prob.append('与已有边重复（含反向）：%s-%s' % (a, b))
    seen.add((a, b))
for old, new in TXT:
    c = s.count(old)
    if c != 1: prob.append('文案锚点出现 %d 次（应为 1）：%s' % (c, old[:40]))
if s.count(INS_ANCHOR) != 1: prob.append('插入锚点（第三批段落结尾）不唯一')
# CATS 行（预检与替换必须用同一个常量 —— 本次就是两处手抄不一致，预检查的是 #d0453f、替换写成了 #d0453）
CAT_ANCHOR = 'geometry:{n:"几何与拓扑",c:"#d0453f"},'
if s.count(CAT_ANCHOR) != 1: prob.append('CATS geometry 行不唯一')
if 'netgeom' in s: prob.append('netgeom 已存在（重复跑？）')
if prob:
    sys.exit('预检失败，未写盘：\n  ' + '\n  '.join(prob))

# ---------------------------------------------------------------- 组装
for n in DATA['nodes']:
    if n['id'] in MOVE_NETGEOM: n['cat'] = 'netgeom'
DATA['nodes'] += NEW
DATA['edges'] += [{'s': a, 't': b, 'r': r} for a, b, r in EDGE]
N_NEW, E_NEW = len(DATA['nodes']), len(DATA['edges'])
assert N_NEW == 226 and E_NEW == 754, '规模不符：%d/%d' % (N_NEW, E_NEW)
js = json.dumps(DATA, ensure_ascii=False, separators=(',', ':'))
s = s[:i] + js + s[end:]

# CATS：geometry 之后插 netgeom
# 注意：文本读入时 CRLF 已统一为 \n，写回 newline='\r\n' 会再转一次 —— 插入只用 \n
s = s.replace(CAT_ANCHOR,
              CAT_ANCHOR + '\n  netgeom:{n:"网络与数据几何",c:"#455a64"},')
# 文案
for old, new in TXT:
    s = s.replace(old, new)
s = s.replace(INS_ANCHOR, INS_ANCHOR + '\n      ' + INS_PARA)

# ---------------------------------------------------------------- 写 .tmp → 复核 → 覆盖
io.open(TMP, 'w', encoding='utf-8', newline='\r\n').write(s)
t = io.open(TMP, encoding='utf-8').read()
marks = ['netgeom:{n:"网络与数据几何"', '226 件工具', '754', '第四批 +20', '同日第四批',
         '"id":"spde"', '"id":"selrule"', '"id":"gr_math"', '而 226 个节点全是']
for m in marks:
    if m not in t: sys.exit('复核失败：.tmp 缺标记 ' + m)
# 重新解析 .tmp 里的 DATA 核对
j = t.find('const DATA = ') + 13
dd = 0; ed2 = -1; instr = False; esc = False
for k in range(j, len(t)):
    c = t[k]
    if instr:
        if esc: esc = False
        elif c == '\\': esc = True
        elif c == '"': instr = False
        continue
    if c == '"': instr = True; continue
    if c == '{': dd += 1
    elif c == '}':
        dd -= 1
        if dd == 0: ed2 = k + 1; break
D2 = json.loads(t[j:ed2])
assert len(D2['nodes']) == 226 and len(D2['edges']) == 754
cats = {}
for n in D2['nodes']: cats[n['cat']] = cats.get(n['cat'], 0) + 1
assert cats.get('netgeom') == 8, 'netgeom 应为 8：%r' % cats
assert cats.get('geometry') == 28, 'geometry 应为 28：%r' % cats
# 度数复核：原来 17 个弱节点全部 ≥3
deg = {}
for n in D2['nodes']: deg[n['id']] = 0
for e in D2['edges']: deg[e['s']] += 1; deg[e['t']] += 1
weak = ['placevalue','fraction','algebra_sym','diff_topology','reciprocity','genfunc','ncg','scheme',
        'operator_algebra','sobolev','sieve','multigrid','cg','symplectic_int','yang_mills','alpha','ns_cd']
low = [w for w in weak if deg[w] < 3]
assert not low, '弱节点仍有度数小于 3：%r' % low
iso = [n['id'] for n in D2['nodes'] if deg[n['id']] == 0]
assert not iso, '出现孤立节点：%r' % iso

shutil.copyfile(TMP, P)
os.remove(TMP)
b = io.open(P, 'rb').read()
print('节点 %d → %d ；边 %d → %d' % (old_n, N_NEW, old_e, E_NEW))
print('分类：' + '  '.join('%s=%d' % (k, v) for k, v in sorted(cats.items())))
print('字节 %d  CR %d  LF %d' % (len(b), b.count(b'\r'), b.count(b'\n')))
print('弱节点全部 ≥3；孤立节点 0；17 个原弱节点度数：')
print('  ' + '  '.join('%s=%d' % (w, deg[w]) for w in weak))
