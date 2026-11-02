# -*- coding: utf-8 -*-
"""第三批扩容：+5 节点 / +29 边 —— cRSI（六维卦序）的数学底座。

这批不是我拍脑袋挑的，是把 02_应用科技/六维卦序 的源码翻了一遍，
把 cRSI 实际踩在上面的工具对出来，再回这张图上查有没有。查的结果：

  超立方／汉明  —— 缺。Q₆（64 卦 = 6 位二进制，384 条有向边）就是 6 维超立方体，整个几何底座
  总变差 TV     —— 缺。稳态分布比较用的就是它（实测 TV 0.0029）
  能量模型/softmax —— 缺。策略就是 softmax(β·score)，β 工作区间 [1.5, 3.5]
  Kac 回归时间  —— 缺。E[T⁺]=1/π，但它是恒真式，只能当工具不能当判据
  势函数/梯度流 —— 缺。V 只读（宪法），θ 沿策略梯度走；「税是乘法 ⇒ 必有势函数」

已有的不用补：图论、随机过程、遍历理论、大偏差、集中不等式、信息论与熵、
鞅论、谱图论、守恒律、梯度下降、常微分方程、统计力学 —— 这些在图上，cRSI 也确实用了。

纪律（沿用前两批）：
  · 预检 → 写 .tmp → 复核 → copyfile（绝不原地多步 replace）
  · 语义替换排在数字替换之前
  · 每条边都要有理由；悬空／自环／重复／反向重复一律报错
"""
import io, json, sys, re, os, shutil
from collections import Counter

P = 'AAA_数学物理跨界关联.html'
s = io.open(P, encoding='utf-8').read()

NEW = [
 dict(id='hamming', cat='geometry', era='1950 Hamming／图论里的常客',
      name='汉明图与超立方体',
      en='Hamming Graph & Hypercube',
      desc='n 位二进制串当顶点，差一位就连一条边 —— 这就是 n 维超立方体 Qₙ：'
           '2ⁿ 个顶点、n·2ⁿ⁻¹ 条边，每个顶点度数为 n。它的谱是显式的：'
           '特征值 n−2k，重数 C(n,k)，是极少数能把全谱一次写完的图。'
           '自同构群是「位的置换 × 逐位取反」，所以「六爻全取反」不是巧合，是这个群里的一个元素。'
           '本项目的 cRSI 就跑在 Q₆ 上：64 卦 = 64 个顶点，384 条有向边 = 384 爻辞，'
           '每步改一爻 = 走一条边。🔴 一句话记住它：在这个图上，距离就是「要改几爻」。'),

 dict(id='divergence', cat='probstat', era='1950s Kullback–Leibler／总变差',
      name='分布距离：总变差与 KL',
      en='Divergence: Total Variation & KL',
      desc='两个分布「差多少」有三把尺，给的拓扑不一样：'
           '总变差 TV = 半个 ℓ1（看总量差多少，不依赖参考测度，取值 0~1）；'
           'KL 散度（看编码多花多少，不对称、可发散）；Wasserstein（看搬动成本，需要底空间有距离）。'
           'Pinsker 不等式把 TV 与 KL 绑起来：TV² ≤ KL/2。'
           '🔴 用途几乎全在收敛判据上：马尔可夫链的混合时间，定义就是 TV 降到 1/4 需要几步。'
           'cRSI 里比两张表的稳态分布用的就是 TV（实测 0.0029），而不是 KL —— '
           '因为要的是「最坏事件上差多少」这种能直接读的概率差。'),

 dict(id='energymodel', cat='probstat', era='19 世纪 Boltzmann／1980s 指数族与最大熵',
      name='能量模型与 softmax 策略',
      en='Energy-Based Model & Softmax Policy',
      desc='把概率写成 P(x) ∝ e^(−βE(x))：β 是逆温度，E 是能量，配分函数 Z 负责归一化。'
           '它好用的地方：取对数之后能量变成加法，梯度就是「实际特征 − 期望特征」—— '
           'REINFORCE 那一行就是从这里出来的。它难用的地方：Z 通常算不出来，'
           '所以推断要靠变分近似或对比散度。'
           '🔴 β 是这一族里最容易被人裸引的参数：β 越大分布越集中，但「多集中」取决于能量的尺度 —— '
           '同一句「β=4」，换一张能量表，集中度能差几十倍。'
           'cRSI 的策略正是 softmax(β·score)，β 的可用区间实测落在 [1.5, 3.5]。'),

 dict(id='returntime', cat='probstat', era='1947 Kac／回访时间',
      name='Kac 回归时间与回访统计',
      en='Kac Recurrence Time',
      desc='从状态 x 出发，平均要多少步才回到 x？Kac 引理给出 E[T⁺] = 1/π(x)，'
           '干净得不像话。🔴 但也正因为它对任何有限不可约时齐链必然成立，'
           '拿它当判据就是恒真式 —— 它永远对，所以它证明不了任何关于你模型的特定主张。'
           '这是本项目踩过并记下的一条：判据必须能掉下来，掉不下来的不算判据。'
           '能用的地方在别处：回访时间的分布（罕见状态近似指数）、'
           '它的矩（鞅与可选停时）、以及它和逃逸率的关系（大偏差）。'),

 dict(id='potential', cat='analysis', era='19 世纪势论／1980s 梯度流',
      name='势函数与梯度流',
      en='Potential Function & Gradient Flow',
      desc='如果一件事的每一步代价只依赖「从哪到哪」而不依赖「怎么走」，'
           '那这些代价必然来自某个势函数 V：走一圈回到原点，总代价为零。'
           '这句话反过来也成立 —— 存在势函数 ⟺ 路径无关 —— 这是判断「能不能给这件事定一个全局尺度」的判据。'
           '动力学版本是梯度流 dx/dt = −∇V(x)：V 沿轨道单调下降，所以它不会绕圈，只会往临界点走。'
           'V 凸则指数收敛；V 非凸则变成景观问题（哪里是鞍点、哪里是谷）。'
           'cRSI 的宪法正是这个结构：V 只读（θ 的梯度里没有 ∂V/∂θ 这一项），θ 只沿策略梯度走。'),
]

EDGE = [
 # ---- hamming ----
 ('hamming', 'graph', '汉明图是图论里最规整的一族：顶点数、边数、度数、直径、谱全都能一次写出来，所以它既是例子也是标尺。'),
 ('hamming', 'disc_geom', '超立方体是最对称的多面体之一：它的一切都由「维数 n」这一个数决定，研究离散几何时它是第一个该试的对象。'),
 ('hamming', 'specgraph', '它的谱是显式的（n−2k，重数 C(n,k)）—— 图 Laplacian 的谱能被手算出来的图没几个，这是其中之一，所以常拿它检验谱算法。'),
 ('hamming', 'stochastic', '在超立方体上每次随机翻一位，就是最标准的一族马尔可夫链：混合时间、截止现象都能解析算出来。cRSI 的链正是 Q₆ 上的这个游走（禁回头）。'),
 ('hamming', 'group', '自同构群是「位的置换 × 逐位取反」。cRSI 里那句 V(x)+V(63−x) ≡ 0.330 就是从这来的：六爻全取反是这个群的元素，不是数值巧合。'),
 ('hamming', 'information', '汉明距离是纠错码的基本度量：「传错了几位」就是汉明距离，编码的最小距离决定了能纠多少错。'),

 # ---- divergence ----
 ('divergence', 'information', 'KL 就是相对熵；TV 是它的「硬化」版本。两者给的拓扑不同：KL 发散时 TV 可能只差一点，选错尺子会得出相反的结论。'),
 ('divergence', 'prob', '总变差是概率论里少数不依赖参考测度的距离：它直接在事件上取最大差，所以能读成「最坏事件上两个分布差多少」。'),
 ('divergence', 'opt_transport', '三把尺的分工：TV 看总量差多少，KL 看编码多花多少，Wasserstein 看搬动成本。底空间没有距离时前两把能用，第三把不能。'),
 ('divergence', 'stochastic', '链收敛的判据就是 TV：混合时间定义为 TV 降到 1/4 所需的步数。没有 TV，就只有「看起来收敛了」这种没法复现的说法。'),
 ('divergence', 'inference', '假设检验的两类错误与分布距离直接对应：TV 给出「最优检验的错误率下界」，所以它是可区分性本身的度量。'),
 ('divergence', 'info_geom', 'Fisher 度量是 KL 的二阶展开，Pinsker 不等式把 TV 与 KL 绑起来 —— 一把尺的几何和另一把尺的界，是同一件事的两面。'),

 # ---- energymodel ----
 ('energymodel', 'statmech', 'Boltzmann 分布 e^(−βE)/Z 就是能量模型的原型：β 是逆温度，Z 是配分函数。统计力学整门课就是这一族的性质。'),
 ('energymodel', 'bayes', '能量模型是未归一化的概率模型：Z 算不出来，所以后验只能靠变分近似或采样 —— 贝叶斯推断在这里遇到的正是配分函数这道墙。'),
 ('energymodel', 'gradient', '取对数之后能量变加法，于是梯度就是「实际特征 − 期望特征」。策略梯度（REINFORCE）那一行是从这个恒等式里掉出来的，不是凑的。'),
 ('energymodel', 'ml', 'softmax 是把一串分数变成分布的标准做法：注意力、分类、策略头全用它，代价是归一化要遍历全部分母。'),
 ('energymodel', 'convex', 'log Z 关于能量是凸的，指数族的极大熵性质就来自这里 —— 这也是为什么能量模型的最优解有唯一性，而一般的非凸模型没有。'),
 ('energymodel', 'attn', '注意力的核平滑就是 softmax：它以温度为参数，把「相似度」变成「权重」，温度趋零时收敛到硬选择。'),

 # ---- returntime ----
 ('returntime', 'stochastic', 'Kac 引理 E[T⁺] = 1/π(x) 的对象就是马尔可夫链：它是回访时间这一族结论里最干净的一个。'),
 ('returntime', 'ergodic', '遍历理论说「回访频率 = 平稳测度」，Kac 说的是「第一次回来平均要多久」。前者是频率，后者是期望时间，两者常常被混着引用。'),
 ('returntime', 'martingale', '回访时间的矩靠鞅与可选停时算：回访时刻是一个停时，对停时取期望这件事本身就要求鞅的工具。'),
 ('returntime', 'largedev', '罕见状态的回访时间近似指数分布，其率由逃逸率给出 —— 大偏差负责的正是这个指数。'),
 ('returntime', 'concentration', '「平均多久回来」和「多久之内一定回来」是两件事：后者需要集中不等式给出尾概率界，光有期望不够。'),

 # ---- potential ----
 ('potential', 'variational', '变分法找势的临界点，梯度流是它的动力学版本：一个问「平衡在哪」，一个问「怎么走到平衡」。'),
 ('potential', 'ode', '梯度流 dx/dt = −∇V(x) 就是一个常微分方程，而且 V 沿轨道单调下降 ⇒ 它不绕圈，只能往临界点走。这给 ODE 的定性分析省了大量力气。'),
 ('potential', 'opt_transport', 'Wasserstein 空间上也能做梯度流：Fokker–Planck 方程就是熵泛函的梯度流（JKO 格式），把「扩散」和「最速下降」合成一件事。'),
 ('potential', 'convex', 'V 凸则梯度流指数收敛；V 非凸则退化成景观问题 —— 鞍点、局部极小、逃逸，全都回来了。收敛速率的差别全在这一条上。'),
 ('potential', 'game', '势博弈：若每个玩家的收益变化都能写成一个全局势函数的差，则必存在纯策略均衡。判据是路径无关，和势函数的定义是同一句话。'),
 ('potential', 'noether', '守恒律来自对称，势函数来自路径无关 —— 两者都是「存在一个全局量」的判据：一个管不变，一个管可加。'),
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

# ---------------------------------------------------------------- 预检
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
        if '**' in v: prob.append('%s 的 %s 有星号' % (n['id'], k))
        if '<' in v or '>' in v: prob.append('%s 的 %s 含尖括号' % (n['id'], k))
newids = ids | {n['id'] for n in NEW}
seen = set()
for a, b, r in EDGE:
    if a not in newids: prob.append('边起点不存在：' + a)
    if b not in newids: prob.append('边终点不存在：' + b)
    if a == b: prob.append('自环：' + a)
    if len(r) < 8: prob.append('理由太短：%s-%s' % (a, b))
    if (a, b) in seen or (b, a) in seen: prob.append('新增内部重复：%s-%s' % (a, b))
    seen.add((a, b))
existing = {(e['s'], e['t']) for e in DATA['edges']}
for a, b, r in EDGE:
    if (a, b) in existing or (b, a) in existing:
        prob.append('与已有边重复：%s-%s' % (a, b))
degc = Counter()
for a, b, r in EDGE:
    degc[a] += 1; degc[b] += 1
for n in NEW:
    if degc[n['id']] < 3: prob.append('%s 度数 %d < 3' % (n['id'], degc[n['id']]))

N_NEW, E_NEW = OLD_N + len(NEW), OLD_E + len(EDGE)

SEM = [
 ('<summary>2026-11-02 补的 26 件，为什么之前不在图上</summary>',
  '<summary>2026-11-02 补的 31 件，为什么之前不在图上</summary>'),
 ('<p>选这 26 件用三条判据：', '<p>选这 31 件用三条判据：'),
 ('      <p class="tiny">连边检查：每条新边都接在已有节点上',
  '      <p><b>同日第三批 +5</b>（汉明图与超立方体、分布距离、能量模型与 softmax、'
  'Kac 回归时间、势函数与梯度流）：<b>这一批不是挑的，是对出来的</b> —— '
  '把 <code>02_应用科技/六维卦序</code> 的源码翻了一遍，列出 cRSI 实际踩在上面的工具，'
  '再回这张图上逐条查有没有。查出来这五件<b>一件都不在图上</b>：'
  'Q₆（64 卦 = 6 维超立方体）是整个几何底座；'
  '总变差是比稳态分布用的尺；softmax 是策略本身；'
  'Kac 是回访结论（且它是恒真式，只能当工具不能当判据）；'
  '势函数是「宪法」那一层的结构。'
  '已经在图上的（图论、随机过程、遍历、大偏差、集中不等式、鞅、谱图论、守恒律、梯度下降）就不重复加了。</p>\n'
  '      <p class="tiny">连边检查：每条新边都接在已有节点上'),
 ('本页扩至 <b>201 / 629</b>；<b>2026-11-02 补了两批</b>：先 20 件（谱与响应、噪声与涨落、'
  '反演与估计、不变量与守恒），再 6 件（Koopman 谱、信息几何、持久 Laplacian、'
  '特殊函数、渐近分析、正交多项式）—— 后一批里的「特殊函数」，是书单反过来指出的缺口。',
  '本页扩至 <b>%d / %d</b>；<b>2026-11-02 补了三批</b>：先 20 件（谱与响应、噪声与涨落、'
  '反演与估计、不变量与守恒），再 6 件（Koopman 谱、信息几何、持久 Laplacian、'
  '特殊函数、渐近分析、正交多项式），最后 5 件（汉明图、分布距离、能量模型、'
  'Kac 回归时间、势函数与梯度流）—— 最后一批不是挑的，是拿 cRSI 的源码对出来的。'
  % (N_NEW, E_NEW)),
]
for a, b in SEM:
    c = s.count(a)
    if c != 1: prob.append('语义锚点命中 %d（应 1）：%r' % (c, a[:44]))

n201 = len(re.findall(r'201(?=\s*(?:件|个节点| /))', s))
n658 = len(re.findall(r'(?<![0-9])629(?![0-9])', s))
if n201 == 0: prob.append('找不到可替换的「201」')
if n658 == 0: prob.append('找不到可替换的「629」')

if prob:
    sys.exit('预检失败，未写盘：\n  ' + '\n  '.join(prob))
print('预检通过：+%d 节点 → %d；+%d 边 → %d；201→%d 处，629→%d 处'
      % (len(NEW), N_NEW, len(EDGE), E_NEW, n201, n658))

# ---------------------------------------------------------------- 改
DATA['nodes'] += NEW
DATA['edges'] += [{'s': a, 't': b, 'r': r} for a, b, r in EDGE]
js = json.dumps(DATA, ensure_ascii=False, separators=(',', ':'))
s = s[:i] + js + s[end:]

for a, b in SEM:
    s = s.replace(a, b, 1)
s = re.sub(r'201(?=\s*(?:件|个节点| /))', str(N_NEW), s)
s = re.sub(r'(?<![0-9])629(?![0-9])', str(E_NEW), s)

# ---------------------------------------------------------------- 原子写盘
io.open(P + '.tmp', 'w', encoding='utf-8', newline='\r\n').write(s)
chk = io.open(P + '.tmp', encoding='utf-8').read()
miss = []
for k in ('"id":"hamming"', '"id":"divergence"', '"id":"energymodel"',
          '"id":"returntime"', '"id":"potential"',
          '总览 · %d 件工具 · %d 条连线' % (N_NEW, E_NEW),
          '本页扩至 <b>%d / %d</b>' % (N_NEW, E_NEW),
          '补的 31 件', '是拿 cRSI 的源码对出来的', 'id="ee5b"'):
    if k not in chk: miss.append(k)
left = len(re.findall(r'201(?=\s*(?:件|个节点| /))', chk))
if left: miss.append('残留 201 共 %d 处' % left)
if chk.count('<div') != chk.count('</div>'):
    miss.append('div 不配平 %d/%d' % (chk.count('<div'), chk.count('</div>')))
if miss:
    os.remove(P + '.tmp')
    sys.exit('复核失败，未覆盖：\n  ' + '\n  '.join(miss))

shutil.copyfile(P + '.tmp', P)
os.remove(P + '.tmp')
b = io.open(P, 'rb').read()
print('写盘 OK：节点 %d → %d；边 %d → %d；字节 %d' % (OLD_N, N_NEW, OLD_E, E_NEW, len(b)))
