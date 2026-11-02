# -*- coding: utf-8 -*-
"""给 AAA_数学物理跨界关联.html 扩容：+20 节点 / +边。

判据（写进页面）：
  ① 已被别的领域证明有用，但还没进这张图（滞后）
  ② 近五年被 AI／形式化／大规模计算重新激活
  ③ 它能改变「怎么验证」，不只是「算什么」

纪律：
  · 每条边必须有理由文字；悬空 id 一律报错（页面会静默丢弃 —— 这是假绿的入口）
  · 先全部预检，再一次写盘（上一轮吃过「前几处改了、最后一处 assert 失败 ⇒ 全没写」的亏）
"""
import io, json, sys, re

P = 'AAA_数学物理跨界关联.html'
s = io.open(P, encoding='utf-8').read()

# ---------------------------------------------------------------- 新节点
NEW = [
 # ---------- A. 谱与响应：把动力学的「指纹」做出来 ----------
 dict(id='lyapunov', cat='analysis', era='1968 Oseledets／2026 Clark（全谱解出）',
      name='Lyapunov 谱与乘性遍历定理',
      en='Lyapunov Spectrum & Multiplicative Ergodic Theorem',
      desc='把「两条轨道分开得多快」写成一串指数：第 i 个指数就是第 i 个方向的对数增长率。'
           '乘性遍历定理保证这串数几乎处处存在、且不依赖起点。'
           '2026 年随机神经网络的**全谱**被解析解出（有限 N 恒等式 + 空腔法），'
           '顺带证明混沌是广延的。它真正的分量在于：**谱是微分同胚不变量** —— 换个坐标系不变，'
           '所以它判的是「这两个系统是不是同一个」，而不是「它看起来像什么」。'),
 dict(id='response', cat='applied', era='1951 Kubo／1960 涨落耗散',
      name='线性响应与涨落耗散',
      en='Linear Response & Fluctuation–Dissipation',
      desc='给系统一个小扰动，看它怎么回话 —— 回话的核就是响应函数。涨落与耗散是同一个量的两面：'
           '平衡态下自发涨落的谱，等于外加扰动后的耗散。'
           'Clark 那篇的整个推导只有一句话：把 Lyapunov 指数的**累积分布**写成切动力学的**一步响应**。'
           '分布 → 响应，这一步把「数有多少个指数小于 s」变成「算一个线性系统的回话」。'),
 dict(id='cavity', cat='probstat', era='1979 Thouless–Anderson–Palmer／1989 Georges（DMFT）',
      name='空腔法与动力平均场',
      en='Cavity Method & Dynamical Mean-Field Theory',
      desc='把「一个粒子被其余 N−1 个包围」约化成一个自洽的单点问题：加一个神经元进去，'
           '算它怎么扰动水库（cavity 场），再算水库怎么回作用它，最后要求自洽。'
           '随机矩阵、自旋玻璃、神经网络、玻璃动力学共用这一套。'
           '它便宜的地方在于：N→∞ 之后，全部信息压缩进「一个自洽方程 + 两个核」。'),
 dict(id='participation', cat='probstat', era='1972 Wegner／2024–2026 Clark 等',
      name='参与比与有效维数',
      en='Participation Ratio & Effective Dimension',
      desc='软维数：不看「有几个方向」，看「能量摊在几个方向上」，即 (Σλ)²/Σλ²。'
           '它好算、抗噪，所以工程上常拿它当维数。但要注意：**参与比依赖变量选择**（它是某个线性子空间的维数），'
           '而吸引子维数是微分同胚不变量。这两者混用，就会得出「换个坐标维数变了」的荒唐结论。'),

 # ---------- B. 噪声与涨落：数学图里最容易被当成「扰动」的东西 ----------
 dict(id='sr', cat='applied', era='1981 Benzi 等',
      name='随机共振',
      en='Stochastic Resonance',
      desc='噪声不只是掩盖信号：在带阈值的非线性系统里，**适量**的噪声反而让弱周期信号更容易被检出，'
           '信噪比对噪声强度出现一个峰。双稳系统 + 周期驱动 + 噪声是标准三件套。'
           '它的意义是反直觉的：在「有用信号」和「噪声」之间，不是单调关系。'),
 dict(id='kramers', cat='probstat', era='1940 Kramers',
      name='Kramers 逃逸率与噪声诱导跃迁',
      en='Kramers Escape & Noise-Induced Transitions',
      desc='越过势垒的速率 ≈ e^(−ΔU/D) 乘一个前置因子（前置因子随阻尼在两种极限下不同）。'
           '它把「稳定」从定性判断变成可算的时间：不是「有没有势垒」，而是「能撑多久」。'
           '所有「寿命」「保持时间」「切换率」的估计，最后都落在这条指数律上。'),
 dict(id='psd', cat='numeric', era='1898 Schuster／1965 Cooley–Tukey 之后普及',
      name='谱密度估计与 1/f 噪声',
      en='Spectral Density Estimation & 1/f Noise',
      desc='把时间序列的「颜色」量出来。1/f 出现在物理、生物、金融、音乐里，'
           '但**估计它本身就带偏**：加窗、去趋势、采样率、段长都会改斜率，'
           '不同做法能差出 0.2 以上的指数。所以「这条曲线是不是 1/f」这句话，不写方法等于没说。'),

 # ---------- C. 反问题与估计：工程上最常用，分支图里没有位置 ----------
 dict(id='kalman', cat='numeric', era='1960 Kalman',
      name='卡尔曼滤波与状态估计',
      en='Kalman Filter & State Estimation',
      desc='带噪声的观测 + 带噪声的模型 ⇒ 最优递推估计。它是「用测量反推看不见的状态」的最小完整例子：'
           '预测一步、用观测修正、更新不确定度，三步循环。'
           '所有实时控制、导航、跟踪的底座；也是理解「滤波器为什么会发散」的最好入口。'),
 dict(id='sysid', cat='numeric', era='1965 Ho–Kalman（可辨识性）／1970s Ljung',
      name='系统辨识与可辨识性',
      en='System Identification & Identifiability',
      desc='给输入输出，问「这到底是哪个模型」。比拟合更难的是**可辨识性**：'
           '参数能不能被数据唯一确定。不可辨识时，拟合得再好也只是换了个说法 —— '
           '这正是本页反复强调的那件事：能复现曲线，不等于找对了机制。'),
 dict(id='cs', cat='numeric', era='2006 Candès–Romberg–Tao／Donoho',
      name='稀疏恢复与压缩感知',
      en='Sparse Recovery & Compressed Sensing',
      desc='欠定方程本来无解；但若未知量**稀疏**，ℓ0 可以换成 ℓ1 而且精确恢复。'
           '判据是限制等距性质（RIP）或互相干：测量矩阵与稀疏基「不撞」就能全收。'
           '它换掉的是问题本身：不是「测得更多」，而是「测法对了，测得少也能全」。'),
 dict(id='adjoint', cat='numeric', era='1960s 最优控制／1970s 变分同化',
      name='伴随方法与灵敏度分析',
      en='Adjoint Methods & Sensitivity Analysis',
      desc='一次前向 + 一次反向，就拿到「所有参数对目标的梯度」，代价与参数个数**无关**。'
           'PDE 反演、形状优化、四维变分同化、神经 ODE 的训练，全靠这一步。'
           '它和自动微分是同一件事的两种实现：一个是算图上的反向传播，一个是写下来的伴随方程。'),

 # ---------- D. 不变量与守恒：图上有「对称性」，没有「怎么把不变量算出来」 ----------
 dict(id='noether', cat='algebra', era='1918 Noether／1990s 符号算法化',
      name='守恒律与诺特定理的算法化',
      en='Conservation Laws & Algorithmic Noether',
      desc='连续对称 ⇔ 守恒量。算法化之后它变成可执行的东西：给定方程，用符号计算自动搜出全部低阶守恒律；'
           '给定数据，用稀疏回归找不变量。'
           '这一步很关键 —— 守恒律一旦被自动找出来，「这个模型对不对」就多了一条与拟合无关的判据。'),
 dict(id='integrable', cat='analysis', era='1834 孤子／1967 逆散射（Gardner 等）',
      name='可积系统与孤子',
      en='Integrable Systems & Solitons',
      desc='有些非线性方程能被**完全解出**：KdV、sine-Gordon、非线性薛定谔，靠 Lax 对把非线性演化写成'
           '一对线性算子的等谱形变，再用逆散射还原。孤子是「色散把波包摊开、非线性把它压紧」刚好抵消的稳定解。'
           '它是「非线性 ≠ 不可解」的唯一大批反例。'),
 dict(id='rg', cat='applied', era='1971 Wilson／1972 临界现象',
      name='重整化群',
      en='Renormalization Group',
      desc='把尺度一步步粗粒化，看哪些参数被放大、哪些被冲掉。它解释「为什么微观细节不影响宏观」：'
           '不是细节不重要，而是它们在粗粒化下**无关**（irrelevant）。'
           '临界指数只依赖维度与对称性、不依赖材料 —— 普适性就是这么来的。'
           '它也是本页最像「哲学」的一条：同一件事在不同尺度上是不同的事，但有同一组不变量。'),
 dict(id='bifurcation', cat='analysis', era='1885 Poincaré／1970s 分支理论',
      name='分岔与对称性破缺',
      en='Bifurcation & Symmetry Breaking',
      desc='参数慢慢变，解的数量与稳定性会突然换一种。四条基本路径：鞍结（生灭一对）、'
           '叉式（对称破缺）、Hopf（定常转振荡）、倍周期（通向混沌）。'
           '它给「为什么突然变了」一个结构化的答案：不是参数太大，而是**经过了一个分岔点**。'),

 # ---------- E. 复杂度：把「能不能算」变成可判的 ----------
 dict(id='fpt', cat='logic', era='1990 Downey–Fellows',
      name='参数化复杂度',
      en='Parameterized Complexity',
      desc='NP 难不等于做不了：把复杂度写成 f(k)·n^c，k 是结构参数（树宽、解的大小、feedback 集）。'
           'k 固定就多项式。它解释了为什么很多「理论上难」的事工程上天天在做 —— '
           '因为真实实例的 k 很小，而最坏情况分析看不见 k。'),
 dict(id='comm', cat='logic', era='1979 Yao',
      name='通信复杂度',
      en='Communication Complexity',
      desc='把计算切成两半，只问「两边要说多少比特」。'
           '它给分布式、流式、电路下界提供了与机器无关的硬下界 —— 比时间下界更结实，因为它不依赖计算模型。'
           '也是「信息论」与「计算」之间最短的那座桥。'),

 # ---------- F. 离散几何：连续的东西搬到图上 ----------
 dict(id='ricci', cat='geometry', era='2009 Ollivier／2003 Forman',
      name='离散 Ricci 曲率',
      en='Discrete Ricci Curvature',
      desc='把「曲率」搬到图与网络上：Ollivier–Ricci 用最优传输定义边上的曲率（邻居分布之间的 W₁ 距离），'
           'Forman 用组合量。正曲率 ⇒ 社区紧、瓶颈少；负曲率 ⇒ 树状、易分割。'
           '它让「这个网络长得像球还是像树」第一次变成可算的数。'),
 dict(id='hypergraph', cat='logic', era='1970s 组合设计／2010s 高阶网络',
      name='超图与高阶交互',
      en='Hypergraphs & Higher-Order Interactions',
      desc='边不只连两个点：一条超边可以同时连三个以上。'
           '关键事实：三元以上的交互**不能**分解成两两交互之和 —— 这正是超图存在的理由，'
           '也是「网络科学」很多结论在超图上直接失效的原因。'),
 dict(id='specgraph', cat='geometry', era='1973 Fiedler／1980s 扩展图',
      name='谱图论',
      en='Spectral Graph Theory',
      desc='图的拉普拉斯谱告诉你连通性、割、随机游走混合时间、社区结构。'
           'Cheeger 不等式把「几何上的细腰」与「谱上的间隙」钉在一起：'
           '代数连通度小 ⇔ 存在一个不太差的割。它是「连续谱理论」在离散世界最成功的一次移植。'),
]

# ---------------------------------------------------------------- 新边（每条都要有理由）
EDGE = [
 # lyapunov
 ('lyapunov', 'chaos', '把「混沌」从定性描述变成一串可测的指数：正指数个数、最大指数、KS 熵率都从它读出来。'),
 ('lyapunov', 'ergodic', '乘性遍历定理是 Birkhoff 遍历定理的矩阵版：把「时间平均 = 空间平均」推到雅可比乘积上。'),
 ('lyapunov', 'rmt', '随机雅可比乘积的指数谱，正是随机矩阵谱理论在非正规、非独立情形下的推广。'),
 ('lyapunov', 'scaling', '同一把尺子换个对象：AI 的缩放律看损失随规模怎么变，Lyapunov 谱看轨道随方向怎么散。'),
 ('lyapunov', 'spectral_geom', '两者都是「谱决定一切」：一个从谱读几何，一个从谱读动力学。'),
 ('lyapunov', 'sde', '随机微分方程的 Lyapunov 指数决定样本轨道会不会同步；乘性噪声尤其要看谱。'),
 # response
 ('response', 'statmech', '涨落耗散定理的老家：平衡态的涨落谱与输运系数是同一个量。'),
 ('response', 'lyapunov', 'Clark 2026 的全部技巧：把 Lyapunov 指数的累积分布写成切动力学的一步响应。'),
 ('response', 'signal', '响应函数就是传递函数：时域的核与频域的传输特性是同一个东西的两种写法。'),
 ('response', 'inverse', '先测响应、再反推参数 —— 这是实验反演最常用的那条路。'),
 ('response', 'sde', '线性响应理论给出「小噪声下系统怎么回话」的解析形式。'),
 # cavity
 ('cavity', 'rmt', '同一套 N→∞ 极限技术：自平均、自洽方程、单点约化。随机矩阵是它的线性特例。'),
 ('cavity', 'statmech', '自旋玻璃的母语：复本对称破缺、TAP 方程都是从空腔法长出来的。'),
 ('cavity', 'ml', '随机初始化网络的平均场描述（有序相／混沌相）就是空腔法给的。'),
 ('cavity', 'lyapunov', 'Clark 用它把「前向—后向系统 + 网络」一起约化成单点问题，才解出全谱。'),
 ('cavity', 'scaling', '大 N 极限下的自平均，是「规模变大反而更可预测」的数学来源。'),
 # participation
 ('participation', 'lyapunov', '同一条谱的两个读数：看尾部是维数，看整体摊开程度是参与比。'),
 ('participation', 'rmt', 'Spiked 模型里参与比直接对应「信号子空间占了几个方向」。'),
 ('participation', 'highdim', '高维统计里「有效维数」是维数灾难到底有多严重的实际度量。'),
 ('participation', 'scaling', '表征的有效维数随规模怎么长，是理解表征学习的一条硬线索。'),
 # sr
 ('sr', 'sde', '随机共振的标准描述就是「双稳 + 周期驱动 + 噪声」的 SDE。'),
 ('sr', 'largedev', '共振峰的位置与高度由逃逸率决定，而逃逸率是指数小量 —— 大偏差理论的辖区。'),
 ('sr', 'signal', '它属于检测理论：判「弱信号能不能被检出」，而不是「信号多大」。'),
 ('sr', 'statmech', '噪声诱导的有序，是「熵与能量竞争」在动力学里的版本。'),
 # kramers
 ('kramers', 'sde', 'Kramers 问题就是过阻尼／欠阻尼 SDE 的首达时间问题。'),
 ('kramers', 'largedev', 'e^(−ΔU/D) 这个指数律正是大偏差速率函数的特例。'),
 ('kramers', 'statmech', '用平衡态配分函数估势垒高度，再用动力学算穿越速率 —— 两边接在这里。'),
 ('kramers', 'sr', '随机共振的定量解释要用逃逸率：噪声把「跨不过去」变成「隔多久跨一次」。'),
 ('kramers', 'chaos', '混沌吸引子里也有「亚稳跃迁」：在吸引子之间按指数时间切换。'),
 # psd
 ('psd', 'fft', '周期图就是 FFT 的平方模；估计谱密度绕不开 FFT。'),
 ('psd', 'wavelet', '非平稳信号用短时傅里叶不够，小波给出「时间—尺度」上的局部谱。'),
 ('psd', 'signal', '谱估计是信号处理的第一道工序：先知道噪声长什么样，才谈得上滤波。'),
 ('psd', 'fractal', '1/f 谱与自相似是同一件事的频域与几何两种说法（维数与指数可互换）。'),
 # kalman
 ('kalman', 'inverse', '状态估计是反问题的最小实时版本：用观测推隐藏状态。'),
 ('kalman', 'control', 'LQG 控制 = 卡尔曼滤波 + 线性二次调节，是「估计」与「控制」的标准拼法。'),
 ('kalman', 'stochastic', '它假设的状态空间模型就是离散随机过程；噪声协方差是它的输入。'),
 ('kalman', 'regression', '预测步是一次线性回归，更新步是一次贝叶斯修正 —— 两个老朋友。'),
 ('kalman', 'sde', '连续时间的版本就是 Kalman–Bucy 滤波，直接由 SDE 推出。'),
 # sysid
 ('sysid', 'inverse', '辨识就是反问题：从输入输出反推算子，而不是反推初值。'),
 ('sysid', 'regression', '参数化辨识最后落在最小二乘／极大似然上。'),
 ('sysid', 'kalman', '状态空间辨识与滤波是同一套模型的两半：先定模型，再估状态。'),
 ('sysid', 'causal', '「这个输入真的导致了输出吗」与「这个参数真的被数据定住了吗」是同一种不可辨识性。'),
 # cs
 ('cs', 'lp', 'ℓ1 最小化就是线性规划；压缩感知的算法核心是一个凸问题。'),
 ('cs', 'inverse', '它是反问题里最锋利的一类：给欠定系统加一个结构假设，就恢复唯一性。'),
 ('cs', 'highdim', '高维下的「稀疏 + 随机测量」反而比低维更可控 —— 反直觉但成立。'),
 ('cs', 'information', '能恢复多少，最终由测量里的信息量下界决定。'),
 # adjoint
 ('adjoint', 'pde', 'PDE 约束优化的标准工具：伴随方程把约束的雅可比转置掉。'),
 ('adjoint', 'autodiff', '同一件事的两种实现：一个是写下来的伴随方程，一个是算图上的反向传播。'),
 ('adjoint', 'inverse', '全波形反演、四维变分同化，都是「前向 + 伴随」跑几十轮。'),
 ('adjoint', 'control', '最优控制的协态方程，就是伴随方程。'),
 ('adjoint', 'gradient', '它给的是梯度，只是拿梯度的代价与参数个数无关。'),
 # noether
 ('noether', 'variational', '诺特定理住在变分法里：作用量的连续对称 ⇒ 守恒流。'),
 ('noether', 'symplectic', '哈密顿系统的守恒量（能量、动量、角动量）都是诺特荷。'),
 ('noether', 'lie', '「连续对称」的语言就是李群；单参数子群给出守恒量。'),
 ('noether', 'ode', '算法化的第一步：把 ODE 写成微分形式，再解全微分／积分因子。'),
 # integrable
 ('integrable', 'pde', '可积 PDE 是唯一能写出通解的一大类非线性方程。'),
 ('integrable', 'dispersive', '孤子就活在色散型方程里：色散与非线性平衡。'),
 ('integrable', 'variational', '可积系统几乎都有变分结构（Lagrange／Hamilton 形式）。'),
 ('integrable', 'symplectic', 'Lax 对把非线性演化嵌进辛几何：等谱形变保持谱，于是可解。'),
 # rg
 ('rg', 'statmech', '临界现象的现代语言就是重整化群：不动点、相关长度、普适类。'),
 ('rg', 'qft', '量子场论的「发散」靠重正化处理；跑动耦合就是 RG 流。'),
 ('rg', 'chaos', '倍周期通向混沌的过程本身就是一次重整化：Feigenbaum 常数是它的不动点。'),
 ('rg', 'fractal', '临界点上的自相似，是 RG 不动点的几何后果。'),
 ('rg', 'scaling', '「规模变大时什么不变」这个问法，这两边是同一个问题。'),
 ('rg', 'meanfield', '平均场是 RG 的第一步（最粗的粗粒化）；平均场博弈的极限也是同一类。'),
 # bifurcation
 ('bifurcation', 'ode', '分岔是 ODE 参数空间的骨架：定性行为只在分岔点改变。'),
 ('bifurcation', 'chaos', '倍周期分岔是最标准的通向混沌之路。'),
 ('bifurcation', 'lie', '对称破缺的严格说法要用群：解的稳定化子变小了。'),
 ('bifurcation', 'control', '控制里最怕的就是参数漂到分岔点附近：增益一调，行为全变。'),
 # fpt
 ('fpt', 'complexity', '它把「NP 难」细化了：难在哪个参数上，难到什么程度。'),
 ('fpt', 'sat', 'SAT 的参数化算法（树宽、变量数）是 FPT 的样板间。'),
 ('fpt', 'graph', '树宽、路径宽、feedback 集 —— 全是图的参数。'),
 ('fpt', 'dp', '树分解上的动态规划，是 FPT 最常用的实现手法。'),
 # comm
 ('comm', 'complexity', '通信下界是比时间下界更硬的证据：它不依赖计算模型。'),
 ('comm', 'information', '它的工具就是熵与互信息：说多少比特，就要多少信息。'),
 ('comm', 'crypto', '秘密共享、安全多方计算的下界，全都落在通信复杂度上。'),
 # ricci
 ('ricci', 'opt_transport', 'Ollivier–Ricci 曲率的定义就是一个 W₁ 最优传输距离。'),
 ('ricci', 'graph', '它是为图定义的曲率：把连续的里奇曲率离散化。'),
 ('ricci', 'spectral_geom', '曲率与谱是同一件事的两面：正曲率 ⇒ 谱隙大 ⇒ 混合快。'),
 ('ricci', 'tda', '两者都在问「这个数据集的形状是什么」，一个给曲率，一个给同调。'),
 # hypergraph
 ('hypergraph', 'graph', '普通图是每条超边恰好两个点的特例。'),
 ('hypergraph', 'combinatorics', '超图既是组合设计的语言，也是极值组合的主战场。'),
 ('hypergraph', 'tda', '持续同调的输入本来就是单纯复形 —— 天生吃高阶交互。'),
 ('hypergraph', 'causal', '三元交互无法分解成两两交互，这正是「因果必须看高阶」的技术理由。'),
 # specgraph
 ('specgraph', 'graph', '图的拉普拉斯谱是它最完整的「代数指纹」。'),
 ('specgraph', 'spectral_geom', '连续版的谱几何在离散世界的对应物（Cheeger 常数 ↔ 谱隙）。'),
 ('specgraph', 'stochastic', '随机游走的混合时间由谱隙给界：第二特征值决定要多久混匀。'),
 ('specgraph', 'rmt', '随机图的邻接矩阵谱，是随机矩阵理论里最经典的一类非独立样本。'),
]

# ---------------------------------------------------------------- 清洗：**X** → 「X」
# 页面是纯文本渲染，星号会原样印出来（Q29 抓过一次）。这里统一换成中文引号。
def clean(t):
    return re.sub(r'\*\*(.+?)\*\*', r'「\1」', t)
for n in NEW:
    for k in ('name', 'en', 'desc', 'era'):
        n[k] = clean(n[k])

# ---------------------------------------------------------------- 预检
i = s.find('const DATA = ') + 13
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
DATA = json.loads(s[i:end])

old_n, old_e = len(DATA['nodes']), len(DATA['edges'])
ids = {n['id'] for n in DATA['nodes']}
names = {n['name'] for n in DATA['nodes']}
prob = []
for n in NEW:
    if n['id'] in ids: prob.append('id 重复：' + n['id'])
    if n['name'] in names: prob.append('name 重复：' + n['name'])
    if n['cat'] not in ('foundation','algebra','geometry','analysis','number',
                        'probstat','logic','numeric','applied','ai','aim'):
        prob.append('未知分类：' + n['cat'])
newids = ids | {n['id'] for n in NEW}
for a, b, r in EDGE:
    if a not in newids: prob.append('边起点不存在：' + a)
    if b not in newids: prob.append('边终点不存在：' + b)
    if a == b: prob.append('自环：' + a)
    if len(r) < 8: prob.append('理由太短（等于没理由）：%s-%s' % (a, b))
seen = set()
for a, b, r in EDGE:
    k2 = (a, b)
    if k2 in seen: prob.append('重复边：%s-%s' % k2)
    seen.add(k2)
for n in NEW:
    for k in ('name', 'en', 'desc', 'era'):
        v = n[k]
        if not v: prob.append('%s 的 %s 为空' % (n['id'], k))
        if '**' in v: prob.append('%s 的 %s 还有星号（会原样印出）' % (n['id'], k))
        if '<' in v or '>' in v: prob.append('%s 的 %s 含尖括号（会被当标签）' % (n['id'], k))
if prob:
    sys.exit('预检失败，未写盘：\n  ' + '\n  '.join(prob))

# ---------------------------------------------------------------- 写回
DATA['nodes'] += NEW
DATA['edges'] += [{'s': a, 't': b, 'r': r} for a, b, r in EDGE]
js = json.dumps(DATA, ensure_ascii=False, separators=(',', ':'))
s = s[:i] + js + s[end:]

N_NEW, E_NEW = len(DATA['nodes']), len(DATA['edges'])

# ---------------------------------------------------------------- 同步写死的数字
s = s.replace('<title>数学物理跨界关联 · 175 件工具与它们之间的理由</title>',
              '<title>数学物理跨界关联 · %d 件工具与它们之间的理由</title>' % N_NEW)
s = s.replace('本页扩至 <b>175 / 500</b>。',
              '本页扩至 <b>%d / %d</b>；<b>2026-11-02 再补 20 件</b> —— 谱与响应、噪声与涨落、反演与估计、不变量与守恒，'
              '都是「按分支画图时天然没位置」的那一类。' % (N_NEW, E_NEW))
s = s.replace('<b>175 件工具</b>、<b>500 条连线</b>', '<b>%d 件工具</b>、<b>%d 条连线</b>' % (N_NEW, E_NEW))
s = s.replace('175 件工具 · 500 条理由', '%d 件工具 · %d 条理由' % (N_NEW, E_NEW))
s = s.replace('175 个节点里', '%d 个节点里' % N_NEW)
s = s.replace('这 175 个节点里', '这 %d 个节点里' % N_NEW)
s = s.replace('这张图上的 175 件工具', '这张图上的 %d 件工具' % N_NEW)
s = s.replace('175 件数学工具', '%d 件数学工具' % N_NEW)
s = s.replace('本页 175 个节点', '本页 %d 个节点' % N_NEW)
s = s.replace('在 175 个节点里占', '在 %d 个节点里占' % N_NEW)
s = s.replace('若日后给 175 个节点改名', '若日后给 %d 个节点改名' % N_NEW)

left = re.findall(r'175', s)
io.open(P, 'w', encoding='utf-8', newline='\r\n').write(s)
b = io.open(P, 'rb').read()
print('节点 %d → %d ；边 %d → %d' % (old_n, N_NEW, old_e, E_NEW))
print('字节 %d  CR %d  LF %d' % (len(b), b.count(b'\r'), b.count(b'\n')))
print('残留「175」%d 处（应只剩历史叙述「元宝 2026-10 原版」那种）' % len(left))
