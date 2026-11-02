# -*- coding: utf-8 -*-
"""第二轮扩容：+6 节点 / +41 边（补齐挂账里点名的四件）。

点名来源（老师原话引用）：
  「网还能再扩 —— Koopman 算子谱、信息几何、持久 Laplacian；
    另外『特殊函数』在图里仍然没有节点，是书单指出的、图自己缺的一块」

所以这一批的构成不全是我的判断：
  · Koopman / 信息几何 / 持久 Laplacian = 上一轮判据的自然延伸（仍是「跨分支算子」那一类）
  · 特殊函数 = **书单反过来指出的缺口**（我在另册写 NIST DLMF 时自己记下的），这一条是闭环
  · 渐近分析、正交多项式 = 特殊函数一旦进来，它必然要带的两件（不给就是断头路）

纪律（沿用上一轮，两次吃过亏）：
  · 先全部预检 → 写 .tmp → 复核关键标记 → copyfile 覆盖（绝不原地多步 replace）
  · 每条边必须有理由；悬空 id、自环、重复边一律报错（页面会静默丢边 = 假绿入口）
  · 🔴 语义替换必须排在数字替换之前：书单里「本页 195 个节点里没有特殊函数」
    这句在实现改了之后就是错的，先改句，再统一改数。
"""
import io, json, sys, re, os, shutil

P = 'AAA_数学物理跨界关联.html'
s = io.open(P, encoding='utf-8').read()

# ---------------------------------------------------------------- 新节点
NEW = [
 dict(id='koopman', cat='analysis', era='1931 Koopman／2010s 数据驱动复兴（DMD／EDMD）',
      name='Koopman 算子谱与动态模态分解',
      en='Koopman Operator Spectrum & Dynamic Mode Decomposition',
      desc='轨道怎么算？不算。Koopman 的办法是把状态 x 换成「观测函数空间」上的线性算子 U：Ug(x) = g(F(x))。'
           'F 是非线性的，U 永远是线性的 —— 代价是无穷维。于是非线性动力学第一次有了谱：'
           'Koopman 模态给出每支振荡的空间形状，特征值的模管增长/衰减、辐角管频率。'
           'DMD／EDMD 是从数据里估它的最小二乘版本，也是系统辨识在非线性上唯一的线性入口。'
           '🔴 它和 Lyapunov 谱互补但别混：后者问「两条轨道分开多快」（实的增长率），'
           '前者问「按什么频率来回」（可以是复的）。混用就会把一支稳定的振荡读成不稳定。'),

 dict(id='info_geom', cat='geometry', era='1945 Rao／1980s Amari',
      name='信息几何与 Fisher–Rao 度量',
      en='Information Geometry (Fisher–Rao Metric)',
      desc='把一族概率分布看成一个流形：点是分布，Fisher 信息是它的黎曼度量，KL 散度的二阶展开就给出这个度量。'
           '有了度量就能谈距离、测地线、曲率。贝叶斯推断因此变成投影 —— 先验投到约束流形上，'
           'e-投影与 m-投影是两种不同的「最近」，选错投影方式后验会系统性偏移。'
           '自然梯度也出自这里：普通梯度说「参数往哪走」，自然梯度说「分布往哪走」，'
           '在低曲率的参数化下两者只差一个 Fisher 矩阵的逆。'
           '🔴 它和最优传输是两类统计流形几何：Fisher–Rao 看重叠（乘性），Wasserstein 看搬动（加性）—— '
           '选哪个度量，直接决定「两个分布差多少」这个答案。'),

 dict(id='persist_lap', cat='geometry', era='2019 Wang–Wei／2020s 应用',
      name='持久 Laplacian',
      en='Persistent Laplacian',
      desc='持久同调只数「有几个洞」，那是计数；持久 Laplacian 给每个洞配一个谱，于是洞有了大小和形状，可以互相比较。'
           '做法是把图 Laplacian 搬到复形上并让它随滤波参数演化：每个尺度上都做一次谱分解，'
           '最小非零特征值随尺度怎么变，就是「结构随尺度怎么变」。'
           '实用价值在于拓扑特征与几何尺度同时给出，且对连续形变稳定 —— '
           '消息传递学不到「这是个环」这种整体信息，这个能。'
           '代价：它把问题变成稀疏对称特征值问题，规模上去必须靠 Lanczos 或随机化方法，不能稠密分解。'),

 dict(id='special_fn', cat='analysis', era='19 世纪至今／NIST DLMF',
      name='特殊函数',
      en='Special Functions (Hypergeometric, Bessel, Spherical Harmonics)',
      desc='它们是「带对称性的指数函数」：换一个对称群，就换一族特殊函数。'
           '球内分离变量得贝塞尔，球面上得勒让德与球谐，抛物型得艾里，直线上得超几何 —— '
           'PDE 的解长什么样，由对称性先定好，剩下的才是边界条件。'
           '半单李群的矩阵系数就是特殊函数，所以它们的微分方程与正交性都由表示论给出。'
           '🔴 实用上真正被用的是渐近展开，不是精确表达式：变量很大时，「它像什么」比「它等于什么」有用得多。'
           'ζ、Γ、模形式系数、配分函数，全是这一族。'
           '本页补这个节点，缘起是书单另册收 NIST DLMF 时记下的那句「图上没有它」—— 书单反过来指出了图的缺口。'),

 dict(id='asymptotic', cat='analysis', era='19 世纪 Stokes／1909 Debye／1940s',
      name='渐近分析与最速下降',
      en='Asymptotic Analysis & Steepest Descent',
      desc='积分 ∫ e^(λφ(x)) a(x) dx 在 λ 很大时，几乎全部贡献来自 φ 的少数几个驻点；'
           '把积分路径搬到复平面上沿最陡的路走，剩下的就是一个高斯积分加一串修正项 —— 这就是最速下降与驻相法。'
           '它反复出现在四处：特殊函数的实用值、大偏差的率函数、色散 PDE 波包的长时间衰减、'
           '以及微局部分析里振荡积分的奇点传播。'
           '共同点是「不问精确值，问主项和余项的阶」。数论里大量结论也只能说到这一层：'
           '素数定理给的是主项，真正的战场一直在余项能压到多小。'),

 dict(id='ortho_poly', cat='numeric', era='19 世纪 Chebyshev／1960s 数值化',
      name='正交多项式与高斯求积',
      en='Orthogonal Polynomials & Gaussian Quadrature',
      desc='用单项式基插值会撞上 Vandermonde 的病态；换正交多项式（勒让德、切比雪夫、拉盖尔、埃尔米特）就稳，'
           '而且节点取在零点上时，n 个点能精确积分 2n−1 次多项式。'
           '三项递推写成对称三对角矩阵后，它的特征值正好是求积节点 —— '
           '这就是 Lanczos 与高斯求积同源的原因，也是特征值算法能快的原因。'
           '谱方法拿它们做基，是因为带权正交让微分矩阵良条件，光滑时收敛是指数的。'
           '🔴 维数是分界线：一到三维求积碾压采样，十维以上反过来 —— 不是哪个更好，是误差随维数的指数不同。'),
]

# ---------------------------------------------------------------- 新边（每条都要有理由）
EDGE = [
 # ---- koopman ----
 ('koopman', 'chaos', 'Koopman 把非线性系统抬到无穷维函数空间上变成线性算子：动力学没变，但它现在有谱了。混沌系统没有可解轨道，却仍有 Koopman 模态 —— 这是少数能对混沌下定量断言的语言。'),
 ('koopman', 'eigen', 'Koopman 模态就是算子的特征函数，特征值取对数就是增长率加频率 —— 特征值这套语言从矩阵搬到了动力学本身。'),
 ('koopman', 'lyapunov', '两个谱问的不是一件事：Lyapunov 问「分开多快」（实增长率），Koopman 问「按什么频率来回」（可复）。同一条轨道上两个谱都在，只读一个会判错稳定性。'),
 ('koopman', 'ergodic', '保测变换诱导的 Koopman 算子是酉算子，Birkhoff 遍历定理说的就是它的不动点只有常数函数 —— 遍历性被翻译成谱的一句话。'),
 ('koopman', 'functional', '它把有限维常微分方程换成函数空间上的线性算子：代价是无穷维，收益是线性代数全部能用。'),
 ('koopman', 'sysid', 'DMD／EDMD 就是先选一组观测函数、再用最小二乘拟合出这个算子 —— 系统辨识在非线性上唯一的线性入口。'),
 ('koopman', 'psd', '谱密度估计找周期，Koopman 找的是同一批频率，只是后者还给出每个频率对应的空间形状（模态），于是「有这个频率」升级成「这个频率长在哪」。'),
 ('koopman', 'neuralop', '神经算子要学的是算子；Koopman 算子是少数谱结构已知、可以拿来考核「学对了没有」的对象 —— 学错了谱就错，藏不住。'),

 # ---- info_geom ----
 ('info_geom', 'information', 'Fisher 信息就是统计流形上的黎曼度量：KL 散度本身不是距离，但它的二阶展开是。熵这套语言由此有了几何。'),
 ('info_geom', 'riemann_geom', '它给黎曼几何提供了一族能直接算曲率的非平凡例子，而且曲率的符号决定了推断这件事能不能做。'),
 ('info_geom', 'bayes', '贝叶斯更新在几何上是投影：先验投到约束流形上，e-投影与 m-投影是两种不同的「最近」，选错后验就系统性偏移。'),
 ('info_geom', 'gradient', '自然梯度 = 在 Fisher 度量下的最速下降。普通梯度说「参数往哪走」，自然梯度说「分布往哪走」—— 后者才是优化真正要的东西。'),
 ('info_geom', 'ml', '变分推断、信息瓶颈、EM 都能画成统计流形上的交替投影，收敛性由两族测地线的正交性给出，而不是靠调学习率。'),
 ('info_geom', 'opt_transport', '两类统计流形几何的分工：Fisher–Rao 看重叠（乘性），Wasserstein 看搬动（加性）。两个分布支撑集不重叠时，前者给不出有限距离，后者能。'),
 ('info_geom', 'statmech', '平衡态族是典型指数族，其 Fisher 度量就是涨落的协方差 —— 涨落耗散在这里不是一条物理定律，是几何恒等式。'),

 # ---- persist_lap ----
 ('persist_lap', 'tda', '持久同调只数洞，持久 Laplacian 给每个洞配一个谱：前者是计数，后者是可比。「两个结构各有一个洞」从此能分出洞的大小。'),
 ('persist_lap', 'specgraph', '它是图 Laplacian 的多尺度版本：同一个复形在每个尺度上都有一个 Laplacian，谱随尺度演化就是结构随尺度演化。'),
 ('persist_lap', 'spectral_geom', '谱几何问「听得出鼓的形状吗」；持久 Laplacian 把这个问题搬到离散复形上，并让答案随尺度分层，而不是只有一个一次性的是/否。'),
 ('persist_lap', 'hypergraph', '高阶交互要的是「一组点一起塌掉」的信息，超图 Laplacian 正好记录这个；持久版本再多给一根尺度轴。'),
 ('persist_lap', 'ricci', '两者都是给离散结构装连续不变量的尝试：Ricci 量「边比点密多少」，Laplacian 量「洞有多紧」。只用其中一个，分不开长得像的两种结构。'),
 ('persist_lap', 'gnn', '它给图网络提供多尺度拓扑特征，而且这些特征对连续形变稳定 —— 消息传递本身学不到「这是个环」这种整体信息。'),
 ('persist_lap', 'numerical_linear', '算它的谱就是稀疏对称特征值问题；规模上去之后只能靠 Lanczos 或随机化方法，稠密分解不可用。'),

 # ---- special_fn ----
 ('special_fn', 'series', '多数特殊函数由级数定义（超几何级数是一大族的母版），所以它们的第一个用途是把难算的量写成收敛快的级数。'),
 ('special_fn', 'pde', '分离变量解 PDE 必然落到特殊函数：球内是贝塞尔，球面上是球谐，抛物型是艾里。PDE 的解长什么样，是对称性先定好的。'),
 ('special_fn', 'fourier', '球谐函数就是旋转群上的傅里叶基 —— 特殊函数其实是「对称群上的指数函数」，换群就换一族。'),
 ('special_fn', 'harmonic', '半单李群的矩阵系数就是特殊函数，它们的微分方程和正交性都由表示论给出：调和分析的具体实现长这样。'),
 ('special_fn', 'analytic_number', 'ζ、Γ、模形式的系数全是特殊函数；解析数论里那些看似奇迹的恒等式，多数是特殊函数恒等式的特例。'),
 ('special_fn', 'asymptotic', '特殊函数真正被用的是它的渐近展开：精确表达式常常算不动，真正顶用的是「变量很大时它像什么」。'),
 ('special_fn', 'microlocal', '艾里与贝塞尔是奇点的标准型：微局部分析把一般奇点都化到这几个标准函数上，所以它们是局部模型而不是巧合。'),
 ('special_fn', 'statmech', '配分函数和关联函数常是特殊函数，相变就发生在它们的参数越过某条渐近分界线的时候。'),
 ('special_fn', 'ortho_poly', '经典正交多项式（勒让德、切比雪夫、拉盖尔、埃尔米特）是特殊函数里最好用的一支：有递推、有求积、有极值性质。'),

 # ---- asymptotic ----
 ('asymptotic', 'complex_analysis', '鞍点法/最速下降是把积分搬到复平面上沿最陡的路走：被积函数大多时候不重要，重要的是鞍点以及它附近的二阶展开。'),
 ('asymptotic', 'largedev', '大偏差就是指数型渐近：概率 ~ e^(−nI(x))，率函数 I 靠变分算出来 —— 本质和鞍点法是同一个动作，只是极值是最小值。'),
 ('asymptotic', 'dispersive', '色散 PDE 的长时间行为全靠驻相法：波包散得多快、衰减多快，由振荡积分的驻点决定，不需要把解解出来。'),
 ('asymptotic', 'microlocal', '振荡积分的渐近展开是微局部分析的日常工具：算的是「奇点往哪传播」，不是「函数值是多少」。'),
 ('asymptotic', 'analytic_number', '素数定理、ζ 的阶估计都是渐近问题；余项能压到多小，才是这类问题的真正战场。'),

 # ---- ortho_poly ----
 ('ortho_poly', 'interpolation', '插值用单项式基会病态（Vandermonde），换正交基就稳：节点怎么取、误差多大，都由正交多项式的零点决定。'),
 ('ortho_poly', 'spectral', '谱方法用切比雪夫/勒让德做基，因为带权正交让微分矩阵良条件，且光滑时收敛是指数的而不是代数的。'),
 ('ortho_poly', 'numerical_linear', '三项递推写出的对称三对角矩阵，其特征值正好是高斯求积节点 —— 这就是 Lanczos 与求积同源的原因，也是特征值算法能快的原因。'),
 ('ortho_poly', 'montecarlo', '求积分时维数是分界线：一到三维求积碾压采样，十维以上反过来。不是哪个更好，是误差随维数的指数不同。'),
 ('ortho_poly', 'rmt', '随机矩阵本征值的关联函数由正交多项式的渐近给出（行列式点过程）：这是少数能把有限 N 相关性精确写出来的场合。'),
]

# ---------------------------------------------------------------- 定位 DATA
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
OLD_N, OLD_E = len(DATA['nodes']), len(DATA['edges'])

# ---------------------------------------------------------------- 预检（一处不改）
prob = []
ids = {n['id'] for n in DATA['nodes']}
names = {n['name'] for n in DATA['nodes']}
CATS = ('foundation','algebra','geometry','analysis','number',
        'probstat','logic','numeric','applied','ai','aim')
for n in NEW:
    if n['id'] in ids: prob.append('id 重复：' + n['id'])
    if n['name'] in names: prob.append('name 重复：' + n['name'])
    if n['cat'] not in CATS: prob.append('未知分类：' + n['cat'])
    for k in ('name', 'en', 'desc', 'era'):
        v = n[k]
        if not v: prob.append('%s 的 %s 为空' % (n['id'], k))
        if '**' in v: prob.append('%s 的 %s 有星号（会原样印出）' % (n['id'], k))
        if '<' in v or '>' in v: prob.append('%s 的 %s 含尖括号' % (n['id'], k))
newids = ids | {n['id'] for n in NEW}
seen = set()
for a, b, r in EDGE:
    if a not in newids: prob.append('边起点不存在：' + a)
    if b not in newids: prob.append('边终点不存在：' + b)
    if a == b: prob.append('自环：' + a)
    if len(r) < 8: prob.append('理由太短：%s-%s' % (a, b))
    if (a, b) in seen: prob.append('新增内部重复边：%s-%s' % (a, b))
    if (b, a) in seen: prob.append('新增内部反向重复：%s-%s' % (a, b))
    seen.add((a, b))
# 与已有边反向重复（无向图会画两条线）
existing = {(e['s'], e['t']) for e in DATA['edges']}
for a, b, r in EDGE:
    if (b, a) in existing: prob.append('与已有边反向重复（会画两条线）：%s-%s' % (a, b))
    if (a, b) in existing: prob.append('与已有边重复：%s-%s' % (a, b))
# 每个新节点度数 >= 3
from collections import Counter
degc = Counter()
for a, b, r in EDGE:
    degc[a] += 1; degc[b] += 1
for n in NEW:
    if degc[n['id']] < 3: prob.append('%s 度数只有 %d（<3）' % (n['id'], degc[n['id']]))

N_NEW, E_NEW = OLD_N + len(NEW), OLD_E + len(EDGE)

# ---- 语义替换锚点（必须在数字替换之前做；这几句里含旧数字） ----
SEM = [
 ('⚠️ 本页 195 个节点里没有「特殊函数」这个节点 —— 这本身是图的一个缺口，不是书的问题。',
  '✅ 收这条时本页还没有「特殊函数」节点，当时那句「这是图的缺口」是实话；同日已补上该节点，现在书与图对得上了。'),
 ('<summary>2026-11-02 补的 20 件，为什么之前不在图上</summary>',
  '<summary>2026-11-02 补的 26 件，为什么之前不在图上</summary>'),
 ('<p>选这 20 件用三条判据：',
  '<p>选这 26 件用三条判据：'),
 ('      <p class="tiny">连边检查：每条新边都接在已有节点上',
  '      <p><b>同日第二批 +6</b>（Koopman 谱、信息几何、持久 Laplacian、特殊函数、渐近分析、正交多项式）：'
  '前五件仍是「跨分支算子」那一类的延伸，但 <b>「特殊函数」不是我挑的 —— 是书单挑的</b>。'
  '收另册 NIST DLMF 时我写下「本页没有这个节点」，这一句随即变成待办；'
  '渐近分析与正交多项式则是它进来之后必然要带的两件，不给就是断头路。'
  '<b>书单不只被图检验，它也能反过来指出图少了什么</b> —— 这是这一批真正的收获。</p>\n'
  '      <p class="tiny">连边检查：每条新边都接在已有节点上'),
 ('本页扩至 <b>195 / 588</b>；<b>2026-11-02 再补 20 件</b> —— 谱与响应、噪声与涨落、反演与估计、不变量与守恒，都是「按分支画图时天然没位置」的那一类。',
  '本页扩至 <b>%d / %d</b>；<b>2026-11-02 补了两批</b>：先 20 件（谱与响应、噪声与涨落、'
  '反演与估计、不变量与守恒），再 6 件（Koopman 谱、信息几何、持久 Laplacian、'
  '特殊函数、渐近分析、正交多项式）—— 后一批里的「特殊函数」，是书单反过来指出的缺口。' % (N_NEW, E_NEW)),
]
for a, b in SEM:
    c = s.count(a)
    if c != 1: prob.append('语义锚点命中 %d（应 1）：%r' % (c, a[:46]))

# ---- 数字替换可行性预检 ----
n195 = len(re.findall(r'195(?=\s*(?:件|个节点| /))', s))
if n195 == 0: prob.append('找不到可安全替换的「195」（语境正则失效）')
n588 = len(re.findall(r'(?<![0-9])588(?![0-9])', s))
if n588 == 0: prob.append('找不到可安全替换的「588」')

if prob:
    sys.exit('预检失败，未写盘：\n  ' + '\n  '.join(prob))
print('预检通过：+%d 节点 → %d；+%d 边 → %d；195→%d 处，588→%d 处'
      % (len(NEW), N_NEW, len(EDGE), E_NEW, n195, n588))

# ---------------------------------------------------------------- 改
DATA['nodes'] += NEW
DATA['edges'] += [{'s': a, 't': b, 'r': r} for a, b, r in EDGE]
js = json.dumps(DATA, ensure_ascii=False, separators=(',', ':'))
s = s[:i] + js + s[end:]

for a, b in SEM:
    s = s.replace(a, b, 1)

s = re.sub(r'195(?=\s*(?:件|个节点| /))', str(N_NEW), s)
s = re.sub(r'(?<![0-9])588(?![0-9])', str(E_NEW), s)

# ---------------------------------------------------------------- 原子写盘
io.open(P + '.tmp', 'w', encoding='utf-8', newline='\r\n').write(s)
chk = io.open(P + '.tmp', encoding='utf-8').read()
miss = []
for k in ('"id":"koopman"', '"id":"info_geom"', '"id":"persist_lap"',
          '"id":"special_fn"', '"id":"asymptotic"', '"id":"ortho_poly"',
          '总览 · %d 件工具 · %d 条连线' % (N_NEW, E_NEW),
          '本页扩至 <b>%d / %d</b>' % (N_NEW, E_NEW),
          '补的 26 件', '是书单挑的', '同日已补上'):
    if k not in chk: miss.append(k)
left = [m for m in re.finditer(r'195(?=\s*(?:件|个节点| /))', chk)]
if left: miss.append('残留非年份 195 共 %d 处' % len(left))
if miss:
    os.remove(P + '.tmp')
    sys.exit('临时文件复核失败，未覆盖：\n  ' + '\n  '.join(miss))

shutil.copyfile(P + '.tmp', P)
os.remove(P + '.tmp')

b = io.open(P, 'rb').read()
print('写盘 OK：节点 %d → %d；边 %d → %d' % (OLD_N, N_NEW, OLD_E, E_NEW))
print('字节 %d  CR %d  LF %d' % (len(b), b.count(b'\r'), b.count(b'\n')))
