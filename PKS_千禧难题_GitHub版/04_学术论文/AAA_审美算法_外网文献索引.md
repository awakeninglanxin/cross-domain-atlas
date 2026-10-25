# 外网已经做到哪一步：审美算法的文献索引

> 配套页面：`AAA_数学物理跨界关联.html` → 教育层第 14 节「产能过剩之后，稀缺的不是手，是判定」
> 建立日期：2026-10-24　｜　共 26 条主文献 + 12 条辅证
> 一句话结论见下节，正文每条都给「一句话结论 / 可复用的量 / 链接 / 证据等级」

---

## 0. 直接回答那个问题

**问：外网是否已经有人找到「高维世界渲染风格背后的审美算法」？**

**答：没有人找到「那一个算法」。但有四件事已经被做出来了，而且每一件都只覆盖我们第 14 节三层里的一层：**

| 已经有人做到的 | 做到什么程度 | 对应哪一层 |
|---|---|---|
| **形态**（幻觉里的几何） | 从 V1 的 E(2) 对称性**数学推导**出全部四类形态常数 —— 这是全篇唯一"推导"而非"拟合"的成果 | 形态层（第 14 节没写，是缺口） |
| **色彩模板**（伊登 / 松田和谐模板） | 用 20 万套以上真实配色主题**检验，结论是否定的**：模板不预测好看，也不旋转不变 | 色层（推翻流行做法） |
| **色彩偏好**（为什么偏爱某个色） | 群体层面能解释 80% 方差，但换文化就掉到 37% / 23%，且辛巴人方向相反 | 色层（给出上限） |
| **美的统一机制**（为什么"美"会带来快感） | 「处理流畅性」与「预测误差下降」两个框架，能解释倒 U 型与"杰作往往违反和谐" | 跨层（唯一候选的统一理论，但仍是框架） |

**并且：唯一系统测过"那边"颜色的论文（2026）给出的结果，和"奶油马卡龙"部分相反。** 详见第 3 节。

**没有人做的，是下面这一件事**：把比例、物性、色彩三层写进**同一个**可优化的目标函数，并且让这个目标函数**只在非现实条件下**标定。现有全部工作，都是"在现实世界的图片分布上，学一个标量分数"。

---

## 1. 先分清三堆互不引用的文献

「高维世界」这个词在英文文献里没有对应词条。它被拆成了三堆，彼此几乎不互相引用：

| 你说的 | 英文文献里的名字 | 主体 | 是否可测 |
|---|---|---|---|
| 通灵 / 高维世界看到的景象 | NDE（near-death experience）、altered states、DMT phenomenology | 心理学 / 神经科学 | 只能**回溯自陈**，不能主动实验 |
| 高维空间的渲染 | 4D visualization、non-Euclidean VR、Thurston geometry ray-marching | 计算机图形学 / 数学艺术 | 可渲染、可交互、可测眩晕与导航 |
| 审美算法 | computational aesthetics、image aesthetic assessment、aesthetic measure | 计算机视觉 / 实验美学 | 可打分、可复算、可被推翻 |

**这三堆之间几乎没有桥。** 第 2 节的形态推导是唯一一条"心理学 → 数学"的桥；第 9 节的 4D/双曲渲染是唯一一条"数学 → 视觉"的桥；而"审美"这一侧的打分器（第 8 节）全部是在**现实照片**上训练的，没有一个是拿异空间渲染图训练的。

---

## 2. 形态层：全篇唯一被推导出来的一条

### 2.1 Klüver 的四类形态常数（1926）

Heinrich Klüver 系统研究仙人掌毒（mescaline）后，发现不同受试者反复出现**同一批几何图案**，归为四类：

| 类 | 内容 |
|---|---|
| (a) | 栅格、格架、蜂窝、棋盘、三角形 |
| (b) | 蛛网 |
| (c) | 隧道、漏斗、走廊、锥体、血管 |
| (d) | 螺旋 |

关键不在"有四类"，而在**同一批四类会在完全不同的触发条件下出现**：致幻剂、闪烁光刺激、偏头痛、癫痫、发烧谵妄、感觉剥夺、入睡前幻觉（hypnagogia）、濒死体验、通灵凝视（crystal gazing）。

**一个现象能被十几种互不相关的触发器复现，说明它测的不是"那个世界"，是"这套视觉硬件"。**

- 链接（综述性转述，可作入口）：<https://handwiki.org/wiki/Unsolved:Form_constant>
- 原书：Klüver H., *Mescal and Mechanisms of Hallucinations*, University of Chicago Press, 1966（1926 年初版研究）

### 2.2 Bressloff–Cowan–Golubitsky–Thomas–Wiener（2001）：把它推导出来了

这是全篇最硬的一篇。作者（数学家 + 神经科学家，含明尼苏达、芝大、休斯顿、Salk、NIH）做的事：

1. 把视网膜到 V1 的映射（retinocortical map）与 V1 的局部/侧向连接写成动力学方程；
2. 发现 V1 的连接结构在**平面欧氏群 E(2)**（旋转、反射、平移）下不变，且因各向异性还需要一个新的「shift–twist」群作用；
3. 在致幻剂或闪烁光让 V1 动力学失稳时，新出现的解（planform）恰好对应 E(2) 的**轴向子群**；
4. **这些 planform 覆盖了全部四类形态常数**；且算出的图形自然分成"近乎恒定朝向的区域"与"pinwheel 奇点"，与光学成像测到的等朝向斑块吻合；
5. 换算到视角（visual field）尺度上，这些图形的波长是**人类 Hubel–Wiesel 超柱宽度的整数倍，约 1.33–2 mm**。

**为什么这一条重要**：它把"通灵看到的几何"从"神秘学"降级成了**"你的 V1 是一个有对称性的二维动力学系统，它失稳时只能长出这几类图形"**。四类不是宇宙的目录，是 E(2) 轴向子群的目录。

**它没有解释的**：颜色、明度、材质、"那个空间是不是真的"。它只解释形状。

| 项 | 内容 |
|---|---|
| 文献 | Bressloff P.C., Cowan J.D., Golubitsky M., Thomas P.J., Wiener M.C. *Geometric visual hallucinations, Euclidean symmetry and the functional architecture of striate cortex*. Phil. Trans. R. Soc. Lond. B **356**(1407):299–330, 2001 |
| DOI | 10.1098/rstb.2000.0769 |
| 可复用的量 | 形态波长 ≈ 超柱宽度 1.33–2 mm 的整数倍；轴向子群分类 |
| 链接 | <https://royalsocietypublishing.org/doi/10.1098/rstb.2000.0769> |
| 作者页（免费摘要） | <https://www.asc.ohio-state.edu/golubitsky.4/reprintweb-0.5/output/abstracts/00BCGTW.html> |
| 后续 | Bressloff et al., *What Geometric Visual Hallucinations Tell Us About the Visual Cortex*, Neural Computation **14**(3):473–491, 2002 |
| 等级 | **A**（同行评议 + 数学推导 + 与光学成像独立吻合） |

### 2.3 这一节对我们第 14 节的意义（重要）

第 14 节把「次第分明」定义成两个可算的量：**L/C 锁带宽度**与**色相间隔的 CV_h**。这只管颜色。

**形态层缺的那把尺子，现在有了**：不是"次第分明"，而是**对称群**。判断一张图"像不像那个世界"，可以问三个可算的问题：

1. 它的平移/旋转/反射不变性，属于 E(2) 的哪个子群？
2. 它的空间频率峰值，是否落在 1/f^D，D≈1.3–1.5（见 5.1）？
3. 它的奇点（pinwheel）密度是多少？

前两个都能用 FFT 直接算出来。**"高维世界的几何"因此变成一个傅里叶问题，而不是一个信仰问题。**

---

## 3. 色彩层：唯一做过实测的一篇，结论与"奶油马卡龙"部分相反

### 3.1 Lerner, Rocha dos Santos & Tahar（2026）：NDE 空间的几何与色度

这是目前**唯一**把"那边的空间长什么样"做成可统计表格的论文。做法：50 名达到 NDE 量表阈值的被试（Greyson ≥7 且 NDE-C ≥27），用图卡重建 + 文字描述，重建出 108 个可分类的体验片段，按**视野边界形状**分四类：

| 类 | 形状 | 空间数 | 无彩色（黑/灰/白/光纹理） | 有彩色 |
|---|---|---|---|---|
| A1–A12 | **锥形 / 隧道** | 28 | **22（78.6%）** | 6（21.4%） |
| B1–B12 | **椭圆弧（高曲率）** | 31 | 4（12.9%） | **27（87.1%）** |
| C1–C4 | 低曲率椭圆弧 | 20 | 7（35.0%） | 13（65.0%） |
| C5 | 完整椭球 | 29 | 12（41.4%） | 17（58.6%） |

统计：χ²(3)=26.61，p=7.11×10⁻⁶，Cramér's V=0.496；GEE 以 A 类为参照，B 类 **OR=18.4，95% CI (4.73, 71.87)**，p=2.7×10⁻⁵。加入序列位置协变量后 OR 基本不变（18.8）。

**读法（这一条最要紧）**：

- 唯一稳健的对比是 **A（隧道）vs B（椭圆）**：隧道里 78.6% **没有颜色**，只有黑灰白光；进到"椭圆空间"才 87.1% **有颜色**。也就是说，**颜色是"到了某个阶段"才出现的，不是全程都有**。
- 作者自己在敏感性分析里承认：换一种夹心估计后，C1–4 与 C5 的置信区间**都包含 1**，只有 B 类的关联撑得住。原话：*"the most consistent contrast across analyses was between A and B. Evidence for differences among A and C1–4 and between A and C5 was sensitive to analytic method."*
- 作者对整篇的定位（原话摘录）：**"exploratory descriptive organization"**、**"phenomenological in nature and does not permit conclusions regarding the underlying neurophysiological mechanisms"**、**"retrospective self-report and were not independently verified"**、**"the association between conical geometry and achromaticity is probabilistic rather than absolute"**。
- **所以这篇连自己都不主张"普遍几何不变量"。它是 C 级里最高的一档：有一手数据、有统计、但作者主动否认因果。**

| 项 | 内容 |
|---|---|
| 文献 | Lerner F., Rocha dos Santos P.C., Tahar G. *The perceptual geometry and chromaticity of near-death experience spaces*. Frontiers in Psychology, 17, 2026-10-15 |
| 单位 | 海法大学（以色列）/ IDOR（巴西）/ 广东以色列理工（汕头） |
| DOI / 链接 | <https://doi.org/10.3389/fpsyg.2026.1760389> |
| 预印本（含更多个案引文） | <https://www.biorxiv.org/content/10.1101/2025.10.17.682526v1.full-text> |
| 可复用的量 | 四类视野边界（A/B/C1–4/C5）；各类的有彩色比例；A vs B 的 OR |
| 等级 | **B**（同行评议、一手数据、N=50；但回溯自陈、非盲、研究者未设盲） |

### 3.2 Strassman et al.（1994）：DMT 的彩度是**反方向**的

DMT 静脉给药研究里，受试者报告的视觉被描述为"色彩比清醒或梦里更亮、更强烈、更饱和"，一位受试者的原话是：

> "It was like the blue of a desert sky, but on another planet. **The colors were 10 to 100 times more saturated.**"

**这就是关键矛盾**：

| | 彩度方向 | 明度 |
|---|---|---|
| 你说的"奶油马卡龙 / 粉彩" | **C≈0.043–0.062（很低）** | L≈0.895–0.962（很高） |
| DMT 受试者报告 | **"饱和 10–100 倍"（极高）** | 未定 |

两者在彩度轴上**方向相反**。这不是谁对谁错的问题，而是**指向两个不同状态**：马卡龙是"高明度 + 低彩度"的**柔化**处理，DMT 是"高彩度"的**强化**处理。同一个"那边"，不可能同时是这两个。

**三种可能，都可判**：
1. 你记忆里的"马卡龙"来自**某一类**体验（比如天界/净土类），而 DMT 报告的是另一类；
2. "马卡龙"是**转述与再创作**（画作、动画、影视）沉淀下来的视觉惯例，不是原始体验；
3. 观察者用的是"柔和、不刺眼、发光"这类词，被转译成了"粉彩"——**"不刺眼"其实是低对比度，不是低彩度**。

第三种最值得查：低彩度与低对比度是两件事。你描述的"奶油感"可能对应的是**低动态范围 + 高明度**（像被雾化），而不是**低饱和**。

- 链接（转述与引文）：<https://www.psychologytoday.com/us/blog/unique-everybody-else/201810/does-dmt-model-the-near-death-experience>
- 原始研究：Strassman R.J., Qualls C.R., Uhlenhuth E.H., Kellner R. *Dose-response study of N,N-dimethyltryptamine in humans II*. Arch Gen Psychiatry **51**(2):98–108, 1994
- **等级**：**B**（同行评议；但"10–100 倍"是受试者主观表述，不是测量值）

### 3.3 一条必须标出来的反证（来自 NDE 量表本身）

Greyson 1983 编制 NDE 量表时，从 80 个候选条目里筛出最常见的 40 条。**"颜色异常鲜明"这一条在候选池里，但没能进前 40。**

意思是：**"那边颜色特别鲜艳"在 NDE 人群里并不是一个高频特征。** 这与"高维世界普遍是马卡龙"和"那边饱和度高"两种说法**都不利**——它说明颜色可能根本不是那边的主要特征，空间与光才是。

- 出处（转述 Greyson 1983 的编制过程）：同上 Psychology Today 文章
- 等级 | **C**（二手转述，未见原文表格）

---

## 4. 比例层：黄金比已经被办过葬礼

### 4.1 Höge（1997）：黄金分割假说的最后一场葬礼

Fechner 1865/1876 的实验被认为证明了人偏好黄金矩形。Höge 做了三次尽量贴近原设计的复现（白卡片、黑底、同样的比例序列）：

> **"regardless of the conditions under which the choices were made, the golden section did not turn out to be the preferred proportion."**
> **"the nice peak of preference Fechner reported for the golden section seems to be either an artifact or it is an effect of still unknown factors."**
> **"It is concluded that the golden section hypothesis is a myth."**

同期的 McManus（1980）另外给了一句更要命的：**"population preferences were small in comparison with individual variation"**——就算群体有偏好，其幅度也小于个体差异。

| 项 | 内容 |
|---|---|
| 文献 | Höge H. *The Golden Section Hypothesis — Its Last Funeral*. Empirical Studies of the Arts **15**(2):233–255, 1997 |
| DOI / 链接 | <https://doi.org/10.2190/2PNH-8TT0-EMC5-FTW5> |
| 免费摘要 | <https://discovery.researcher.life/article/the-golden-section-hypothesisits-last-funeral/c0981187f85932d38595f6fd31eb4c84> |
| 可复用的量 | "黄金比偏好"这一先验，在实验美学里已被判为 artifact |
| 等级 | **A**（同行评议 + 三次独立复现） |

**这一条正好印证第 14 节的零假设基线**：我们算出"随机比例命中常数的中位偏差就有 2.82%，单条 <1% 的概率 18.7%"。Höge 的实验是从**人的选择**这一侧，得到同一个结论：**单点命中不构成证据**。

### 4.2 Birkhoff（1933）：M = O / C，第一个"审美公式"

George D. Birkhoff 提出：审美度量 M 等于秩序 O 除以复杂度 C。

> **M = O / C**

意思：同样的秩序下，越复杂越不美；同样的复杂度下，越有秩序越美。这是**第一个把"美"写成除法**的尝试，1933 年。

它的问题（后续文献公认）：O 和 C 都没有公认的操作化定义，且它只处理单个对象，处理不了一张画布上多元素的交织。

| 项 | 内容 |
|---|---|
| 文献 | Birkhoff G.D. *Aesthetic Measure*. Harvard University Press, 1933 |
| 二手（含公式与批评） | <https://onlinelibrary.wiley.com/doi/10.1155/2019/3495962> |
| 可复用的量 | M=O/C 这个结构；以及"复杂度与秩序要同时进目标函数"这一条思想 |
| 等级 | **B**（原始著作；其操作化在后续文献中被认为不充分） |

### 4.3 Ngo, Teo & Byrne（2003）：把界面美学拆成 14 个 0–1 的数

这是"审美算法"在 HCI 里最完整的一次操作化。14 个指标全部给成 [0,1] 的闭式公式：

| # | 指标 | 公式（示意） |
|---|---|---|
| 1 | Balance 平衡 | 1 − (\|Bal_V\|+\|Bal_H\|)/2，按元素面积加权 |
| 2 | Equilibrium 均衡 | 1 − (\|Eq_X\|+\|Eq_Y\|)/2，质心与屏幕中心之差 |
| 3 | Symmetry 对称 | 1 − (\|S_V\|+\|S_H\|+\|S_R\|)/3，垂直/水平/对角 |
| 4 | Sequence 序列 | 1 − Σ\|q_j − v_j\|/8，与阅读动线四象限的吻合度 |
| 5 | Cohesion 凝聚 | 长宽比差异 |
| 6 | Unity 统一 | 相关元素间距 vs 页边距 |
| 7 | Proportion 比例 | 优选比例（1:1、1:√2、1:φ、1:√3、1:2） |
| 8 | Simplicity 简洁 | 元素数与对齐点数 |
| 9 | Density 密度 | 元素覆盖面积比 |
| 10 | Regularity 规律 | 对齐点的规则性 |
| 11 | Economy 经济 | 用到的尺寸种类数 |
| 12 | Homogeneity 同质 | 四象限分布的均匀度 |
| 13 | Rhythm 韵律 | 变化模式的均匀度 |
| 14 | Order & Complexity | 上列若干项的均值 |

**注意第 7 项**：Proportion 里直接把 φ 列为"优选比例"之一——**而 Höge 已经证明人不偏好它**。这是"教科书指标"与"实验结论"脱节的典型例子，也是我们在第 14 节坚持要**先算零假设**的原因。

| 项 | 内容 |
|---|---|
| 文献 | Ngo D.C.L., Teo L.S., Byrne J.G. *Modelling interface aesthetics*. Information Sciences **152**:25–46, 2003 |
| 二手（含六项公式原式） | <https://arxiv.org/pdf/1101.1606> |
| 明确批评 | <https://1library.net/document/ydm8pkjy-applying-graphical-design-techniques-to-graph-visualisation.html>（"their relative weighting has not been validated"） |
| 可复用的量 | 14 个闭式指标；尤其 Balance / Equilibrium / Symmetry / Density 四个可当场实现 |
| 等级 | **B**（同行评议；但权重与效度未经独立验证） |

---

## 5. 复杂度层：1/f 是唯一有"跨来源一致性"的审美量

### 5.1 Spehar et al.（2003）：分形维数 1.3–1.5 的偏好峰

用强制选择配对比较（每对都看，全部组合），220 名受试者，三类图像：自然景物、模拟海岸线、**波洛克画作**。

结果：**三类来源的偏好峰都落在 D = 1.3–1.5**，而出处完全不同（自然的、数学生成的、人画的）。

补充（同组后续）：这个偏好**不随性别与文化背景显著变化**（Abraham et al. 2011）；且中 D 分形图像能**降低**受试者在压力任务下的皮电反应（Taylor et al. 2003, NASA-Ames 初步）。

**但有一条反例必须并列**：Pickover（1995）用另一种生成方法，得到偏好峰在 **D≈1.8**（接近波洛克）。

> 两者的差异说明：**"偏好某个 D"不是绝对的，它依赖于图像是怎么生成的。** 这句话直接限死了"用分形维数当审美算法"的可用范围。

| 项 | 内容 |
|---|---|
| 文献 | Spehar B., Clifford C.W.G., Newell B.R., Taylor R.P. *Universal Aesthetic of Fractals*. Computers & Graphics **27**(5):813–820, 2003 |
| 免费综述（含方法与数据） | <https://eprints.staffs.ac.uk/2333/1/fnhum-10-00213.pdf> |
| 生成方法与偏好关系的讨论 | <https://cpb-us-e1.wpmucdn.com/blogs.uoregon.edu/dist/e/12535/files/2015/12/MONDRIANcomplexity-29eucj1.pdf> |
| 可复用的量 | D 的偏好带 1.3–1.5；D 的 FFT 可直接算 |
| 等级 | **A−**（同行评议 + 220 人 + 三来源复现；但 Pickover 反例未解决） |

### 5.2 与我们第 14 节的接口

第 14 节的色层用 L/C/CV_h 三个量。**加上 D（分形维数），"次第分明"就从二维变成三维**：

| 层 | 量 | 已有文献的判据 |
|---|---|---|
| 比例 | 常数距离谱 + 零假设基线 | 第 14 节自算：三条同 <0.3% 才显著（0.018%） |
| 复杂度 | 幅度谱斜率 / D | 1.3–1.5（Spehar），但依赖生成方式（Pickover 1.8） |
| 色 | L 带宽度、C 带宽度、CV_h | 第 14 节自算：马卡龙 L 0.895–0.962 / C 0.043–0.062 / CV_h 0.21 |
| 形态 | 对称群（E(2) 子群） | Bressloff 2001：四类形态常数 = 轴向子群 |

**这四行就是目前人类知识的全部家底。** 没有第五行。

---

## 6. 和谐模板：设计界最著名的"审美算法"，被 20 万套数据否掉了

这是本次调研里**最值钱的一条**，因为它直接否掉了一个被当成常识的东西。

### 6.1 被否掉的是什么

- **Itten（1961/1973）**：包豪斯的色彩理论，提出 2/3/4/6 色在色环上等距即和谐（互补、分裂互补、三角、四角）。
- **Matsuda（1995）**：把 Itten 扩展成 **8 个色相模板 + 10 个色调模板**，数据来自日本女学生九年的时装问卷 + 时装公司的配色。这是后来所有"自动配色"工具（含 Adobe Kuler/Color、Cohen-Or 的 Color Harmonization）的理论基础。

### 6.2 O'Donovan, Agarwala & Hertzmann（2011）怎么测的

用 ColourLovers / Kuler 的**大规模五色主题**，做了三件事：

1. 检验"某些色相/色相模板是否更受偏好"；
2. 用特征学习出一个**配色质量打分器**（含 LASSO 权重公开）；
3. 拿它做应用：改进已有主题、从图片抽主题。

**结论（原话要点）**：

> - **"designers do not create themes that match templates unless encouraged to do so by the interface"** —— 真实设计师配色，**根本不按模板走**，除非工具界面逼他走。
> - **"no evidence is found that hue templates can directly predict compatible colors"** —— 模板**不能**预测配色是否协调。
> - **"preferences are not rotationally-invariant about the color wheel"** —— 模板理论的核心假设（旋转不变）**不成立**。

同一篇里还留了一句对 Matsuda 模板的判决：**"To our knowledge, these templates have never been rigorously evaluated."**——在 2011 年之前，这套支配了自动配色二十年的模板，**从没被严格检验过**。

| 项 | 内容 |
|---|---|
| 文献 | O'Donovan P., Agarwala A., Hertzmann A. *Color Compatibility From Large Datasets*. ACM TOG **30**(4):63, SIGGRAPH 2011 |
| 主页（含数据与代码，CC BY-NC-SA） | <https://www.dgp.toronto.edu/~donovan/color/> |
| 全文 PDF | <https://www.dgp.toronto.edu/~donovan/color/colorcomp.pdf> |
| 权重重现 | 同页 `weights.csv`（LASSO 模型） |
| 可复用的量 | 五色主题兼容性打分器；"模板不成立"这条否证 |
| 等级 | **A**（同行评议 + 大规模真实数据 + 代码公开） |

> **数字出处说明**：原文摘要只说"vast datasets"，没给总数。**"20 万套以上"这个数字我取自后续引用该文的论文**（Generating Harmonious Colors through the Combination of n-Grams and K-means, 2024，原文写作 "analyzed over 200,000 color palettes from the site"），不是你我在原文里数出来的。引用时请写"大规模真实配色主题"，需要精确数就回原文核对。

### 6.3 对第 14 节的直接影响

第 14 节用"色相等距 + 明度锁高 + 彩度锁低 + Rayleigh 检验"解释了马卡龙。**这与 Itten/Matsuda 的模板是一脉相承的**——而模板已被否。

所以要**主动加一条反证**（第 14 节已有三条反证，这是第四条，且是最硬的一条）：

> **反证 D**：如果把马卡龙色板的"色相等距"打乱成随机色相、但保持 L/C 锁带不变，受试者偏好若不下降，则"次第分明"里真正起作用的**不是色相**，而是**明度/彩度的窄带**。
> 这一条之所以必须做：O'Donovan 已经证明色相关系（模板）不预测偏好。**如果我们只证明"马卡龙色相等距"，就只是重复了一个已被推翻的假设。**

---

## 7. 偏好从哪来：EVT 在跨文化时崩了

### 7.1 Palmer & Schloss（2010）：生态效价理论（EVT）

主张：颜色偏好来自人对**该颜色所联想物体**的平均情感反应（蓝→清水晴空，喜欢；黄绿→腐烂食物，不喜欢）。用 WAVE 模型算：

| 模型 | 解释的方差（美国样本，32 色） |
|---|---|
| **EVT / WAVE** | **80%** |
| 颜色外观模型 | 60% |
| 颜色—情绪模型 | 55% |
| 锥体拮抗模型（Hurlbert & Ling 2007） | 37% |

| 项 | 内容 |
|---|---|
| 文献 | Palmer S.E., Schloss K.B. *An ecological valence theory of human color preference*. PNAS **107**(19):8877–8882, 2010 |
| 链接 | <https://www.pnas.org/doi/10.1073/pnas.0906172107> |
| 可复用的量 | WAVE；"偏好 = 联想物体的效价"这条因果链 |
| 等级 | **A**（PNAS，多模型对比） |

### 7.2 但换文化就崩（这一节是重点）

| 样本 | WAVE 解释的方差 | 出处 |
|---|---|---|
| 美国成人 | **80%** | Palmer & Schloss 2010 |
| 英国观察者 | **61%** | Taylor & Franklin 2012 |
| 日本样本 | **37%** | Yokosawa et al. 2016 |
| **辛巴人（纳米比亚北部，非工业化群体）** | **23%，且方向相反** | Taylor, Schloss, Palmer & Franklin 2013 |

辛巴人的结果最要命：**他们更偏好那些与负面物体关联的颜色**——与 EVT 预测方向相反。简单模型"只看饱和度"反而是最好的预测器。

论文标题就叫 **《Color Preferences Are Not Universal》**。

| 项 | 内容 |
|---|---|
| 文献 | Taylor C., Schloss K.B., Palmer S.E., Franklin A. *Color Preferences Are Not Universal*. Psychological Science, 2013 |
| 链接 | <https://www.researchgate.net/publication/233410106_Color_Preferences_Are_Not_Universal> |
| 综述（含四个数字的对比） | <https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2022.1010108/full> |
| 可复用的量 | "群体偏好模型的上限随文化下降"这条硬约束 |
| 等级 | **A** |

### 7.3 结论：没有"普遍审美算法"，只有"普遍机制 + 局部参数"

把 7.1 与 7.2 并排，得到的不是"有一个算法"，而是：

> **机制是普遍的（联想效价 / 处理流畅 / 预测误差），参数是局部的（文化、个体、状态）。**
> 所以任何声称"一套参数走遍天下"的审美算法，其预测上限就是 80% 再打折——打到 23% 也有可能。

---

## 8. 统一候选：处理流畅性与预测误差

这是目前唯一能**同时解释**"为什么对称好看"和"为什么杰作都违反和谐"的两条框架。

### 8.1 Reber, Schwarz & Winkielman（2004）：美在加工过程

> **"the more fluently perceivers can process an object, the more positive their aesthetic response."**

它把一堆原本各自为政的变量——图形良好性（figural goodness）、图底对比、重复曝光、对称、典型性、视觉/语义启动——**全部归到"加工流畅度"这一个中介变量**上。

关键方法学贡献：**流畅度可以被操纵而不改变刺激本身**（启动、重复、对比度、呈现时长），而偏好会跟着变。这就把"美在客体"改成了"美在加工"。

| 项 | 内容 |
|---|---|
| 文献 | Reber R., Schwarz N., Winkielman P. *Processing Fluency and Aesthetic Pleasure: Is Beauty in the Perceiver's Processing Experience?* Pers. Soc. Psychol. Rev. **8**(4):364–382, 2004 |
| 链接（免费全文） | <https://papers.ssrn.com/sol3/papers.cfm?abstract_id=1295305> |
| 可复用的量 | 把"刺激属性"换成"加工代价"这个做法；流畅度可被操纵这一点 |
| 等级 | **A**（引用 2400+） |

### 8.2 Van de Cruys & Wagemans（2011）：美是预测误差的**下降速率**，不是低误差

这一篇是对 8.1 的**关键修正**，也是全篇最接近"统一算法"的一篇：

> 杰作**经常违反**和谐、流畅、良好格式。所以"越流畅越美"解释不了它们。
> 作者的解法：艺术家先**精心建立**预测，再**故意破坏**它（产生 prediction error → 负性情绪），然后让观者在**另一个层次上**重新找到可预测的结构（→ 误差下降 → 奖赏）。
> 所以快感不来自"误差小"，来自 **"从不确定到更可预测"这个转变**。

推论（可测）：**倒 U 型**。误差太小→无聊；太大→放弃；**先大后降**→最强快感。

而且它顺手解决了"暗房悖论"：如果目标是最小化惊奇，人应该待在暗房里不动。但人不是，因为**先验本身要求丰富刺激**，暗房反而成了"惊奇"。

| 项 | 内容 |
|---|---|
| 文献 | Van de Cruys S., Wagemans J. *Putting reward in art: A tentative prediction error account of visual art*. i-Perception **2**(9):1035–1062, 2011 |
| 免费全文 | <https://sandervandecruys.be/pdf/2011_VandeCruys-i-Perception_Putting_reward.pdf> |
| 后续讨论（含对其矛盾的分析） | <https://pmc.ncbi.nlm.nih.gov/articles/PMC4267174/> |
| 可复用的量 | "误差序列"而非"误差值"；倒 U 型的两个拐点 |
| 等级 | **A−**（同行评议；作者自称 tentative，尚缺大规模实验） |

### 8.3 这一条怎么用（对我们最重要）

第 14 节四步渲染算法是：**定框 → 采样 → 等 ΔE 走阶 → 验收**。它本质是"把误差压到最小"。

按 8.2，这是**不够的**：全压到最小 = 无聊。所以第 14 节应加第五步：

> **⑤ 留一个误差**：在整体可预测的前提下，故意留**一处**违反（色相断点、明度跳变、比例失配），并记录观者是否在 3 秒内"看回来"。
> 判据：**看回来 → 是美；没看回来 → 是错。** 这一步的产物不是参数，是**一次测试记录**。

这一条把"审美算法"从"生成"推到了"**编排不确定性的时间序列**"，而后者恰好是 AI 现在最不擅长的（它能生成单帧，不会安排"先建立再破坏"的节奏）。

---

## 9. 工程现状：现在就能拿来用的四个东西

### 9.1 NIMA（2018）：预测"人会打几分"的分布

Talebi & Milanfar，IEEE TIP。用 CNN 预测**评分分布**（10 个桶），而非单一均值。训练集 AVA：**约 25.5 万张**图，每张由约 **200 人**打 1–10 分。损失用 EMD（推土机距离）。

副产品很妙：**分布的方差 σ 就是"争议度"**。σ 大 = 这张图要么很爱要么很恨（unconventional）；σ 小 = 大家都觉得还行。

| 项 | 内容 |
|---|---|
| 文献 | Talebi H., Milanfar P. *NIMA: Neural Image Assessment*. IEEE TIP **27**(8):3998–4011, 2018 |
| DOI / 链接 | <https://doi.org/10.1109/TIP.2018.2831899> |
| 现成实现（PyTorch，含权重） | <https://deepinv.org/api/stubs/deepinv.loss.metric.NIMA.html> |
| 可复用的量 | 均值 μ + 标准差 σ 两个数；σ 可当"非常规度" |
| 等级 | **A** |

### 9.2 LAION Aesthetic Predictor V2（2022）：开源界事实标准

结构极简：**CLIP ViT-L/14（768 维）+ 一个 MLP**。权重文件 `sac+logos+ava1-l14-linearMSE.pth`。LAION-Aesthetics 子集就是用它筛的（阈值 4.5 / 4.75 / 6.5+ 等）。

**它是什么**：一个把图片映射到"网络图片受欢迎程度"的标量。
**它不是什么**：不是"美"的度量。它学的是 LAION/AVA 的分布，也就是**现代互联网照片与设计图的平均口味**。

| 项 | 内容 |
|---|---|
| 代码与权重 | <https://github.com/christophschuhmann/improved-aesthetic-predictor> |
| LAION 说明 | <https://laion.ai/blog/laion-aesthetics/> |
| 现成 API 封装 | <https://github.com/shopp-in/improved-aesthetic-predictor> |
| 可复用的量 | 一个 1–10 的标量；以及"用它当奖励函数"的风险（它会把生成拉向网络平均脸） |
| 等级 | **B**（工程事实标准；但训练目标=预测投票，非审美理论） |

### 9.3 ACM Computing Surveys（2025）：这个领域的现状总结

十年综述。要点：**最高准确率 91.5%**；但列出六条硬问题——任务特化不足、环境因素未建模、缺带标签的大数据集、数据不平衡、网络结构破坏长宽比、**缺可解释性（不知道为什么这样判）**。

**"91.5% 准确率"是怎么回事**：它指的是把图片二分类成"高/低美学"的准确率。这个数字听起来高，但 AVA 的均值 5.5、标准差 1.4，**大部分图本来就落在中间**，二分类的基线并不低。**别把 91.5% 当成"AI 已懂审美"。**

| 项 | 内容 |
|---|---|
| 文献 | Daryanavard Chounchenani M., Shahbahrami A., Hassanpour R., Gaydadjiev G. *Deep Learning Based Image Aesthetic Quality Assessment — A Review*. ACM CSUR **57**(7):183, 2025 |
| 开放全文 | <https://pure.tudelft.nl/ws/portalfiles/portal/243316277/3716820.pdf> |
| 可复用的量 | 六条公认缺陷清单（写论文/做产品都该先照着自查） |
| 等级 | **A** |

### 9.4 Íñigo Quílez 余弦调色板：一个真正在用的"审美算法"

1999 年提出，形式极简：

```
color(t) = a + b · cos[ 2π ( c·t + d ) ]
```

a、b、c、d 各为三分量向量（RGB）。a=偏移，b=幅度，c=频率，d=相位。**四个 vec3 就是一条调色板。**

为什么它算"审美算法"：它是 shader/demoscene 里生成**柔和渐变**的默认手段——**奶油感、粉彩感，用它可以一行写出来**。比如把 b 调小、a 调到 0.8 附近，立刻得到高明度、低彩度的马卡龙渐变。

| 项 | 内容 |
|---|---|
| 原文 | <https://iquilezles.org/articles/palettes> |
| 着色器实现 | <https://github.com/Erkaman/glsl-cos-palette> |
| 含 IQ palette 的现成色带库 | <https://fragmentcolor.com/shaders/gradient> |
| 可复用的量 | 四个 vec3；可直接参数化"马卡龙 → 霓虹"的连续过渡 |
| 等级 | **B**（工程实践，无同行评议；但被广泛验证可用） |

**这一条给我们一个现成的把手**：第 14 节的 L/C 锁带，可以直接翻译成 a、b、c、d 的约束，然后**连续扫描**参数空间，看偏好峰在哪。不用重写渲染器。

---

## 10. 高维空间本身怎么渲染：有人做了，但审美是"选的"不是"推的"

这一堆是回答"高维世界渲染"最直接的部分。全部是**数学艺术 / 图形学**，不是心理学。

### 10.1 Hypernom（2015）：把头显姿态映射到 S³

Vi Hart、Andrea Hawksley、Henry Segerman、Marc ten Bosch。做法：

1. 把正多胞体（4D 柏拉图立体）的胞**径向投影**到 S³；
2. 再从 S³ **球极投影**到 3D；
3. 头显姿态是一个 SO(3) 元素，而 SO(3) 被 S³ **双重覆盖**——于是头显输出的单位四元数，直接就是 S³ 上的一个点；
4. 转头 = 在 S³ 里移动；靠近某个胞的中心就"吃掉"它。

**目标函数是"吃完所有胞"，约等于把自己的头转遍所有可能姿态两次。**

| 项 | 内容 |
|---|---|
| 试玩 | <https://hypernom.com> |
| 源码 | <https://github.com/vihart/hypernom> |
| 论文 | *Hypernom: Mapping VR Headset Orientation to S³*，Bridges 2015, pp.387– <http://m.archive.bridgesmathart.org/2015/bridges2015-387.pdf> |
| 说明文 | <https://aperiodical.com/2015/07/hypernom> |
| 等级 | **B**（会议论文 + 可运行制品） |

### 10.2 双曲 / Thurston 几何的实时光线步进

Rémi Coulon、Sabetta Matsumoto、Henry Segerman、Steve Trettel：用 ray-marching 在**八种 Thurston 几何**里做实时交互视图；另有双曲 VR（H³、H²×E）与上同调分形（cohomology fractals）。

| 项 | 内容 |
|---|---|
| 项目总览（全部链接在此） | <http://henrysegerman.com/XR.html> |
| 八几何在线试玩 | <https://3-dimensional.space> |
| 双曲 VR | <http://h3.hypernom.com>、<http://h2xe.hypernom.com> |
| 技术论文 | *Ray-marching Thurston geometries*（arXiv） |
| 等级 | **B** |

### 10.3 这一节最重要的观察

这些项目**能渲染非欧空间，而且很好看**。但它们的"好看"来自**数学结构本身的选择**（用哪种几何、贴什么纹理、怎么配色），**不是**来自一个被验证的审美算法。

也就是说：

> **"高维世界的渲染"已经有人做了，"高维世界的审美算法"还没有人做。**
> 前者是**能力**问题（已解决），后者是**判据**问题（未解决）。

这正好接上页面结语里那句：**能力不缺，判据缺。**

---

## 11. 空白清单：五个真空白

这是本次调研最有用的产出——**能确认"没人做"的地方，才是可以站的地方**。

| # | 空白 | 为什么是真空白 | 需要什么 |
|---|---|---|---|
| 1 | **三层联合的目标函数** | 比例（Höge/Ngo）、复杂度（Spehar）、色（O'Donovan）各自有独立文献，**没有一篇把三者写进同一个可优化目标** | 一个加权目标 + 一次消融实验（去掉任一层，看预测力掉多少） |
| 2 | **"次第分明"的跨文化验证** | CV_h 这个量是我们第 14 节自己定义的，**没有任何文献测过它的跨人群稳定性** | N≥30，两到三个人群，同一套色板做两两比较 |
| 3 | **异空间渲染的前瞻性实验** | NDE/DMT 文献**全部是回溯自陈**（Lerner 2026 自己承认"retrospective self-report, not independently verified"）。**没有人做过"给受试者看 N 种异空间渲染，测偏好/眩晕/可导航性"的正向实验** | 一套参数化渲染器 + 量表 + 眩晕/导航指标 |
| 4 | **材质先验的"非现实"极限** | Fleming 2003 只证明"照明统计像现实时，人估反射率很准"，并证明"不像现实时性能下降"。**阈值在哪、掉多少，没人做** | 系统操纵照明统计，测 reflectance matching 的崩溃点 |
| 5 | **条件化审美打分器** | NIMA/LAION 都输出**单一标量**（"人平均多喜欢"）。**没有"像某一类文化 / 某一类状态喜欢"的条件化打分器** | 在打分器输入里加入条件向量（文化、年龄、状态），并验证可分性 |

**第 3 条最值得做**，因为它同时解决第 1、2 条，而且**成本最低**：一台机器、一套参数化渲染器、30 个人、两周。

---

## 12. 一个现在就能做的判决实验（七天内可完成）

**目标**：判断"奶油马卡龙"这个 C 级先验，是**真的偏好峰**，还是**转述沉淀的惯例**。

### 步骤

1. **造刺激**：用第 9.4 的 IQ 余弦调色板（a、b、c、d 四个 vec3），沿两条轴各取 7 档：
   - 轴一：彩度（b 从 0.02 到 0.40）→ 从马卡龙到霓虹
   - 轴二：明度（a 从 0.35 到 0.90）→ 从暗到奶油
   得到 49 个色板，全部保持色相等距（c 取整数倍，保证循环）。
2. **两两比较**：49 个色板做成 1176 对（可抽样到 300 对/人），N=30，强制选择"哪一张更像'那个世界'"。
3. **算峰**：用 Bradley–Terry 或 Thurstone 模型拟合出每个色板的效用值，画出效用对 (C, L) 的曲面。
4. **判决**：
   - 若峰落在 **C≈0.04–0.06 且 L≈0.90–0.96** → 你的 C 级先验**有偏好基础**，可以升到 B 级（仍不是 A，因为不是物理测量）；
   - 若峰落在 **C≈0.2–0.3**（高饱和） → 你的先验与 DMT 文献一致，而"马卡龙"只是**视觉惯例**；
   - 若曲面**平坦**（个体差异 >> 群体趋势，如 McManus 1980 所见） → 这个先验**不应写进任何算法**，只能当个人风格。
5. **顺手拿到的两个副产品**：
   - 用 LAION predictor 给同一批色板打分，看它的峰在哪。**若 AI 的峰与人的峰不重合，则"AI 已懂审美"这个说法在你的场景里直接可证伪**——这就把第 14 节那句"AI 能把任何标准执行到 99%，但不知道哪个 99% 值得要"变成一个有数字的证据。

### 为什么这个实验算"便宜的一侧"

- 不需要实验室，不需要眼动仪，只需要浏览器 + 30 个人 + 一个周末；
- 全部刺激都是程序生成的，**可复算、可复现、可被别人推翻**；
- 结论无论是正是负，都**有用**：负结论直接砍掉第 14 节一整节的先验，正结论升一级。

---

## 13. 证据分级与免责

本文档沿用页面里的分级口径：

| 级 | 含义 | 本文档中的例子 |
|---|---|---|
| **A** | 同行评议 + 独立复现 / 大规模数据 + 代码或数据公开 | Höge 1997、Bressloff 2001、O'Donovan 2011、Palmer & Schloss 2010、Spehar 2003、Reber 2004、NIMA、ACM 综述 |
| **B** | 同行评议但单一实验室 / 样本有限 / 或工程事实标准但无理论 | Lerner 2026、Strassman 1994、Ngo 2003、Birkhoff 1933、LAION predictor、Hypernom、IQ palette |
| **C** | 预印本 / 二手转述 / 自陈未经核实 / 公司自测 | biorxiv NDE 预印本、Greyson 1983 的转述、各类"高维世界"描述 |
| **D** | 不可核实 | 本文档**不收录**任何 D 级材料 |

**三条免责**：

1. **本文档不主张"高维世界存在"或"不存在"。** 它只回答一件事：**关于它的视觉，外网做过什么可复算的工作。**
2. **"奶油马卡龙"目前仍是 C 级。** 本文档给出的不是支持，而是**一条把它变成可判定命题的路径**（第 12 节）。
3. **所有链接均为公开可访问的来源。** 付费墙后的（如 Nature/Science 系）只给 DOI，不给镜像。**引用请以 DOI 为准，不要引用本文档的转述。**

---

## 附：一条最短路径（如果你想只看三篇）

| 顺序 | 看什么 | 为什么 |
|---|---|---|
| 1 | **Bressloff et al. 2001**（第 2.2） | 唯一"推导"而非"拟合"的一篇。看完你会知道：**幻觉的几何是硬件的对称性，不是那个世界的目录。** |
| 2 | **O'Donovan et al. 2011**（第 6） | 最著名的审美算法被 20 万套数据否掉。看完你会知道：**"和谐模板"是被当成常识的假设，不是结论。** |
| 3 | **Lerner et al. 2026**（第 3.1） | 唯一测过"那边颜色"的一篇。看完你会知道：**颜色可能根本不是那边的主要特征，空间与光才是。** |

看完这三篇，"高维世界的审美算法"这个提法会变成三个更小、但都能做的问题：

1. 它的**对称群**是什么？（可算：傅里叶 + 群论）
2. 它的**彩度方向**是高还是低？（可测：第 12 节的两两比较）
3. 它的**误差序列**怎么排？（可测：第 8.3 的"留一个误差"）

**三个问题都能在一个人、一台机器、两周内给出第一版答案。**
