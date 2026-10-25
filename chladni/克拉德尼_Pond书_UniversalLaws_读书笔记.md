# 《Universal Laws Never Before Revealed: Keely's Secrets》读书笔记

**Understanding and Using the Science of Sympathetic Vibration**
Compiled & annotated by **Dale Pond** — Delta Spectrum Research, 1994

| 项 | 值 |
|---|---|
| 本地文件 | `chladni/` 目录下，全名见表格下方 |
| 体积 | 104 499 340 B（约 99.6 MB） |
| 页数 | **571 页**（PDF 物理页） |
| 文本层 | 扫描 OCR 双层 + 子集字体，**无 ToUnicode** |
| 提取方式 | 自写 CMap 反解（`chladni/_pdfnote/extract.py`），产出 `pond_full.txt`（819 247 字） |
| ISBN | 1-57282-003-9 |
| 笔记日期 | 2026-10-25 |

文件全名（含空格，复制时注意）：

```text
Universal laws never before revealed Keelys secrets understanding and
using the science of sympathetic vibration (Pond, Dale).pdf
```

> **这份笔记和已有的两份不一样。**
> `25_keely/01_Keely技术全景` 是主题综述，`25_keely/03_Keely的40条振动定律` 是术语全译。
> 这份是**读书笔记**：给页码、给原文、给复算值、给判据等级，并把每一条能对上的东西
> **指到网页的具体控件**上。凡是复算不上来的，直接写"不成立"，不替作者圆场。

---

## §0 怎么读这份笔记：三口径 + 四级证据

### 0.1 三种口径（沿用 `克拉德尼_Keely技术与本页深意_桥接.md` 的定义）

| 口径 | 含义 | 本书里的例子 |
|---|---|---|
| **原文层** | 书里白纸黑字写着，我只负责准确转述，不背书 | "AEther 是钢的 986 000 倍密度" |
| **计算层** | 给得出算式，我能当场复算 | 八度表 2^n、"1/8 体积 = 1 八度" |
| **立论层** | 需要额外假设才成立，我只标出它依赖什么 | "重力是原子间的相互吸引" |

### 0.2 四级证据（每条断言后面都标）

| 级 | 含义 | 处理方式 |
|---|---|---|
| **A** | 原文直接给出数值或算式，我逐位复算通过 | 可直接引用 |
| **B** | 原文给出，但复算有偏差；偏差可解释（排印/浮点/口径） | 引用须附偏差说明 |
| **C** | 只有叙述、没有可复算的量，或依赖未证假设 | 只当作"作者这么说" |
| **D** | 我复算后**明确不成立** | 必须写"不成立" |

### 0.3 页码法则

本笔记所有 `p###` 均为 **PDF 物理页**（不是书上印的页码）。书里没有统一印刷页码，只有零星页脚，所以只能锁 PDF 页。要定位原文时用 `pond_full.txt` 里的页标记：

```text
===== [PDF 第 166 页 / obj ...] =====
```

---

## §1 这本书到底是什么

### 1.1 它不是 Keely 写的书，是 Pond 编的"档案汇编 + 逐月评论"

书名里的 "Universal Laws Never Before Revealed" 是 Pond 自己的项目名。全书内容分三层，**混排在一起**，这是读它最容易踩的坑：

| 层 | 页码范围（约） | 内容 | 作者 |
|---|---|---|---|
| **原件再版** | p8–p164、p467–p512 | 1887–1898 年报刊原文（*The Scientific Arena*、*Philadelphia Inquirer*、*The Theosophist*）、Bloomfield-Moore 的 *Etheric Force Identified as Dynaspheric Force*、Keely 本人的技术笔记片段 | Keely / Bloomfield-Moore / 记者 |
| **Pond 逐月评论** | 散布全书，每条定律后面一段 | 标注 `Commentary December, 1985` 这种格式，跨度 **1985-12 → 1989-11**，来自 *The Journal of Sympathetic Vibratory Physics* | Dale Pond |
| **图版与图表** | p536–p551、p58/95/104/136/164/193/216/275/287/505/514 等 | Keely 原图的 600 dpi 扫描、照片、图表 | 原件扫描 |

**Pond 自己在 p512 承认了扫描质量**：

> "These charts were scanned, edited and printed at 600 dpi. Some errors have crept into some of the images due to the poor originals."

这句话很重要——它预告了 §4 里那张表为什么会在 20 位以上的数字上崩掉。

### 1.2 全书结构地图（实测页码）

| PDF 页 | 内容 | 备注 |
|---|---|---|
| 1–4 | 封面、版权页、题献 | — |
| 5–6 | Acknowledgements + Table of Contents 起 | Pond 的致谢 |
| 6–18 | **Disintegration of Stone**（1888） | R. Harte 作，*The Theosophist* 体例；石英山 18 分钟掘进 18 ft × 4.5 ft 的故事在这里 |
| 21–38 | **Etheric Force Identified as Dynaspheric Force** | Bloomfield-Moore，全书最重要的一篇原件 |
| 39 | 引诗（"nothing single nor alone"） | 全书调性 |
| 57–58 | Keely's Compound Disintegrator 图 | 图版 |
| 84 | Mr. Plum's Visit to Keely's Laboratory | 图版标题 |
| 95–112 | GRAVITY OVERCOME / Levitation | 图版组（正文极稀，主要是照片） |
| 104 | Levitation | 同上 |
| 113–115 | **The Chord Settings of Life** | Keely 谈"人的和弦设定"，非技术，但解释了他的世界观 |
| 136 | **EXAMPLE OF DISINTEGRATION** | ★ 操作级原文：三只谐振腔怎么调 |
| 138 | **Keely's Motor Secret Revealed at Long Last** | ★ Pond 1994 年重装原机后的结论：负压 |
| 156 | 原子级引文（atomoles） | Keely 1894 |
| 164 | Keely + Crowhurst 照片 | 图版 |
| **166–449** | **40 条定律正文**（详见 §3） | 全书主干 |
| 207–217 | LATENT FORCE IN INTERSTITIAL SPACES | ★ 以太胶囊转速 600 000 mile/s 在这里 |
| 254–260 | POLARITY OF SCIENCE | Pond 的科学社会学，非技术 |
| 334–336 | ETHER OR AETHER | 986 000 倍密度 |
| 337–340 | KEELY'S PROVISIONAL ENGINE | 图纸 |
| 346 | Law of Chemical Morphology | ★ "内三分之一体积是中性的" |
| 365 | MAN'S GREATEST ACHIEVEMENT（Tesla 作） | 摘录 |
| 405–412 | **Music: A Vibration Analysis Shortcut / Shorthand** | ★ Chladni 方板模态 → 音程 |
| 414–421 | **Scale Of The Forces In Octaves** | ★★ 全书最硬的一张表 |
| 428–429 | Gravity | Keely + Cayce 并列 |
| 434–440 | Magnetism / Music of the Molecule | ★ 1:4 断裂判据、Fibonacci 递进 |
| 449–460 | Law of One / The Neutral Force | 三力论 |
| 461–466 | **Keely's Trexar a Superconductive Wire** + 音程表 | ★ 20 000 → 180 000 → 1 620 000 |
| 467–511 | JOHN KEELY A Personal Interview（1887）等原件 | 生平、数值 |
| 499–504 | **Deciphering Keely's Harmonic Inharmonic Chords** | ★ 非谐波和弦 → 球体旋转 |
| 512–535 | 图表扫描页 + Symbols and conditions of Vibratory Streams + Brain as Applied to Vibratory Etheric Science | 图版 |
| 552–568 | 索引（Index） | 可以用它反查关键词的页码 |
| 569–571 | 封底推荐语 + Table of Contents | Steiner / Blavatsky / Plum / Wilcox / Leidy / Hudson 六条推荐 |

### 1.3 一条必须提前说的：Pond 的立场

Pond 不是中立编纂者。他在 p167 写得很直白：

> "We are discussing Keely's work **as he himself presented it**. This is an impartial study intended to analyze what HE did and the explanations he gave of his work."

紧接着：

> "If he did what he did on one hand and dogmatic science cannot explain why, then we must ask Keely to explain."

**这是一个明确的"先信后验"立场。** 读这本书的正确姿势是：把它当**一手史料的可靠转录**（这部分很有价值），而不是当**物理结论的可靠来源**（这部分要逐条复算）。

---

## §2 五个"原来如此"——读完全书最值得带走的发现

### 2.1 八度表是全书唯一一张能全表复算的东西

p414–421 的 *Scale Of The Forces In Octaves* 是 Keely 亲手给的，从第 1 阶（约 1 次/秒）一直排到第 86 阶，跨越 sonity → sound → sonism → sono-thermity → thermism → rad-energy → chemism → electricity 七个域。

表的骨架是 **2^n**，我把 13–86 阶共 74 行逐位核了一遍（见 §4.1），结论：

* 13–66 阶共 54 行，**52 行与 2^n 逐位一致**；
* 2 行有排印/OCR 伤：第 23 阶印 `8,388,606`（应 `8,388,608`）；第 54 阶印 `10,814,398,509,481.984`（明显是 `18,014,398,509,481,984` 的小数点错位 + 首位丢字）；
* 67–86 阶（20 位以上）数字**中段错位**，属不可信区间，本笔记一律不引用。

> **这一条的价值不在"能对上"，在"知道对到第几位为止"。** 一张 1994 年排版的 26 位数字表，可信边界恰好落在双精度能表示的 17 位附近——这不是巧合。

### 2.2 "1/8 体积 = 1 八度 = 1/2 线度"——整本书的几何骨架

这句话在 p305 以"线性尺寸定律"（law of linear dimensions）的名义给出：

> "The octave of a given plate will be a homologous plate having **1/8 of its volume**."

复算：`(1/8)^(1/3) = 0.500000`（A 级，精确）。

**为什么这条重要**：它是把"音乐"和"几何"焊在一起的那颗螺丝。八度不是玄学，是**体积除以 8**，等价于**每一维除以 2**。Keely 全部的管长、板径、球径推算都建立在这一条上。

**和网页的对应**：这正是 `AAA_克拉德尼_Keely八振子24管_响应式.html` 里 `waveDiv()` 那一个函数在做的事——`4` 代表 1/4λ、`2` 代表 1/2λ（默认）。页面里"管长只有一个来源"这条铁律，物理依据就是这句话。

### 2.3 Trexar 的 ×9 / ×81 是**器件倍增**，不是音阶关系

p463 原文（Keely 自述）：

> "a 'slight tap on the Chladni wave plate' accelerates the normal molecular frequency from **20,000 to 180,000** or 9 times. The sectional ratio is 3:6:9 or (9/3)² or 9 times."
> "Now if we shift a gold node along the third or platinum section the oscillatory multiplication will be **9×9 or 81 times** the normal 20,000 or **1,620,000** oscillations per second."

复算（A 级）：
* 20 000 × 9 = **180 000** ✓
* 20 000 × 81 = **1 620 000** ✓
* 9/3 = 3，3² = 9 ✓

**这里是全书中我最想标出来的一处**：1 620 000 这个数**不是从音阶来的**，是从 20 000 乘出来的。证据是——它落在八度表第 20 阶（2²⁰ = 1 048 576）的注记位，比值 `1 620 000 / 1 048 576 = 1.544952`，是 **+753.07 音分**，比纯五度（701.96¢）**高 51 音分**。

> 一个"Major 5th"的注记，偏离纯五度 51 音分——这不是排印错，这是**它本来就不是音阶数**。它是器件倍增数，被排进了音阶表。

顺带一个排印坑：原文写 "the **81st power**, or 1,620,000"。`9^81 = 1.97×10⁷⁷`，而 1 620 000 = 20 000 × 81。**上标 81 是"81 倍"，不是"81 次方"。**（B 级：数字对，措辞错）

### 2.4 要让球转起来，得给它一个**非谐波**和弦

p503–504，这是全书离现代物理最近的一段：

> "In the literature he even goes so far as to specifically say that a sphere at rest is in perfect harmony and **to cause it to rotate one must sound an inharmonic chord**. On the top of his chart defining sphere rotation we see a chord of **12 notes**. The musical relationship of these notes one to another are close to **seconds**."

也就是说：**静止 = 完全和谐；转动 = 故意破坏和谐**。

这一条和网页上的"非对称图纹"是同一件事的两面。网页那边我之前的结论是：

> 破镜必须**每模态独立相位**；转动阶 = `gcd(m 集)`；镜面 ⟺ ∃φ 使 `ψ_k + m_kφ ≡ 0 (mod π)` ∀k（超定）。

Keely 用"12 个近似大二度的音同时响"来达到同一目的——**用互不成简单整数比的频率集合，让系统找不到任何一个能让全部相位同时对齐的 φ**。这是 C 级（他只有操作，没有证明），但那句"静止是和谐、转动靠不和谐"和网页的判据在**方向上完全一致**。

> ⚠️ 别把这句话反过来用。它说的是"非谐波和弦**可以**诱发旋转"，不是"任何非谐波和弦**必然**诱发旋转"。网页上 2 模态破镜不成立、只有整除串扰起作用，就是反例（§6 第 3 条）。

### 2.5 Keely 马达那个"啪"是**负压**，不是推压

p138，Pond 1994 年 8 月重装原机后的实测记录：

> "we ran water through it in reverse. This was sufficient to prove the principle as we could clearly hear the **'pop' of the one live cylinder** coinciding with the timing and function of principles. As the piston 'popped' the crank and connections responded to the momentary **decrease in pressure**. Yes, I said decrease in pressure."
> "This function of this motor represents the female or nightside forces at work. The force is one of **implosion or centralization** of vibratory..."

这是全书最有分量的一段实测：**原机是"吸"不是"推"**。Pond 自己都特意强调了一句 "Yes, I did say decrease in pressure"，说明他知道这会颠覆读者的预期。

**为什么这条重要**：它把 Keely 从"又一个永动机骗子"这一类里摘出来，放进了 Schauberger 的**内爆（implosion）**那一类。这两条线本来是分开流传的，这段记录把它们焊上了。

判据：**C 级**。理由：Pond 只跑了一个气缸、靠耳朵听"啪"、用水反推，没有扭矩、没有压力曲线、没有功率。它证明了"这个机构在负压脉冲下会响应"，**没证明**"它能自持输出"。这个区分必须保留。

---

## §3 40 条定律：页码对照表

### 3.0 先说一个必须澄清的事：这里有两个不同的"40"

| 清单 | 来源 | 是否含 `Law of Matter and Force` | 是否含 `Law of Attraction` |
|---|---|---|---|
| **本书**（p166–p449，带独立标题） | 本 PDF 实测 | ❌ 无标题（仅 p166 附近评论提及） | ❌ 无标题（仅评论引用"see Law of Attraction, issue #8"） |
| `25_keely/03_Keely的40条振动定律_现代物理学术语全译.md` | 该文档自定编号 | ✅ 列为第 1 条 | ✅ 列为第 7 条 |

**结论：两份清单不是同一个 40，页码不能互相套用。** 本书正文的 40 个标题按出现顺序如下，用这张表查原文。

### 3.1 逐条页码（按书中出现顺序）

| # | 定律 | PDF 页 | 复算价值 |
|---|---|---|---|
| 1 | Law of Corporeal Vibrations | 166 | ★ 量子阱/半导体/灯丝的类比在评论里 |
| 2 | Law of Corporeal Oscillations | 171 | — |
| 3 | Law of Harmonic Vibrations | 180 | — |
| 4 | Law of Transmissive Vibraic Energy | 185 | — |
| 5 | Law of Sympathetic Oscillation | 195 | ★ 定义"同情"= 同频强迫振荡 |
| 6 | Law of Repulsion | 200 | "Juxtaposed ... vibrating in discord are mutually repelled" |
| 7 | Law of Cycles | 204 | ★★ 从和谐生出不和谐；铀临界质量 |
| 8 | Law of Harmonic Pitch | 218 | ★★ 谐波 + 和差音两条并列谱 |
| 9 | Law of Force | 222 | ★ 三形态：Creative / Transmissive / Attractive |
| 10 | Law of Oscillating Atomic Substances | 226 | — |
| 11 | Law of Harmonic Attraction and Repulsion | 230 | 复杂，Pond 自注 "This is a complex law" |
| 12 | Law of Sono-thermity | 231 | ★ 声→热的分界 |
| 13 | Law of Oscillating Atoms | 236 | ★ "音高反比于原子量立方" |
| 14 | Law of Vibrating Atomolic Substances | 240 | — |
| 15 | Law of Oscillating Atomoles | 262 | — |
| 16 | Law of Transformation of Forces | 266 | — |
| 17 | Law of Atomic Pitch | 277 | ★ "原子音高比原子量更有用" |
| 18 | Law of Variation of Atomic Pitch by Rad-energy | 289 | — |
| 19 | Law of Variation of Atomic Pitch by Electricity and Magnetism | 297 | — |
| 20 | Law of Variation of Atomic Pitch by Temperature | 300 | — |
| 21 | Law of Pitch of Atomic Oscillation | 303 | ★★ 原子尺寸测量法（板 → 八度 → 原子） |
| 22 | Law of Variation of Pitch of Atomic Oscillation by Pressure | 307 | — |
| 23 | Law of Variation of Atomic Oscillation by Temperature | 310 | — |
| 24 | Law of Variation of Atomic Oscillation by Electricity | 313 | ★ 直接写成 I²·R 的形式 |
| 25 | Law of Variation of Atomic Oscillation by Sono-thermism | 318 | — |
| 26 | Law of Chemical Affinity | 322 | ★ 同度/谐波/协和比才化合 |
| 27 | Law of Chemical Dissociation | 326 | — |
| 28 | Law of Chemical Transposition | 330 | — |
| 29 | Law of Chemical Substitution | 333 | Keely 原话 "(Too complex for brief statement)" |
| 30 | Law of Catalysis | 337 | — |
| 31 | Law of Molecular Synthesis and Combination | 341 | — |
| 32 | Law of Chemical Morphology | 346 | ★★ 内 1/3 体积中性；雪花六向 |
| 33 | Law of Atomic Dissociation | 370 | — |
| 34 | Law of Atomolic Synthesis of Chemical Elements | 373 | ★ "用什么音高就生成什么原子" |
| 35 | Law of Heat | 382 | — |
| 36 | Law of Electro-Chemical Equivalents | 386 | — |
| 37 | Law of Cohesion | 393 | — |
| 38 | Law of Refractive Indices | 397 | ★ Pond 自己承认这里"有矛盾"（见下） |
| 39 | Law of Electric Conductivity | 400 | ★★ 超导的振动解释 |
| 40 | Law of One / Law of the Dominant | 449 | 三力论收束 |

### 3.2 值得单独展开的五条

#### （1）Count 7 —— 从和谐生出不和谐（p204–206）

原文：

> "Coherent aggregates harmonically united constitute centers of vibration bearing relation to the fundamental pitch **not multiples of the harmonic pitch**, and the production of secondary unions between themselves generate pitches that are **discords** ... from harmony is generated discord, **the inevitable cause of perpetual transformation**."

Pond 的例子（p205）：取三个物体，基音分别为 D、G、E。**基频层面**它们是和谐的（对 C 的比 9:8、3:2、5:4，全是小整数）；但**高次谐波层面**，各自的谐波合起来产生的和音/差音就不再是简单比 ⇒ 变成不协和。

然后他接了一句很大胆的话（p206）：

> "Uranium ... is in a state of relative harmony (a state of rest) until acted upon as above described. The phenomenon known as '**critical mass**' comes readily to mind."

**判据：C 级。** 这是一个**类比**，不是一个机制。临界质量是链式反应的中子经济问题，和"谐波比变复杂"没有定量联系。但它作为**隐喻**很准：系统的自由度越多、耦合越强，最简整数比就越难维持。

> **这一条其实解释了网页上"为什么图纹一定会变"。** 网页的 `gcd(m 集)` 判据说：转动阶 = 各模态 m 的最大公约数。当模态数增加，gcd 掉到 1 的概率越来越高——这就是"从和谐生出不和谐"在二维板上的定量版本。

#### （2）Count 8 —— 两条并列的频谱（p218–219）

原文关键句：

> "**Harmonic pitches and summation or difference pitches make up the whole of the vibrating spectrum.**"

Pond 的推演很干净：
* 基频 2 ⇒ 谐波 4、8、16（每次除以 2 加一个）
* 差音：8 − 2 = 6，其低阶谐波是 3，高阶是 9、12、18
* 两个频率**对上**的地方振幅升高，**对不上**的地方振幅降低

**为什么这条重要**：它说明 Keely 的频谱观不是"一个基频 + 一条谐波列"，而是**两条交织的列**。现代振动分析只做前者（谐波分析），把差音当"不相关的频率"用统计方法糊过去——Pond 在 p222 就是在骂这件事：

> "Statistical methods are nothing other than various ways to average indeterminate numbers."

**判据：A 级（物理正确）。** 谐波与和差音确实构成完整频谱，这是经典声学。

#### （3）Count 21 + 32 —— Keely 怎么"量"一个原子（p303–305、p346）

这是全书方法论的精华。Keely 的原子测量链是：

1. 悬一块圆板，测它的基频；
2. 按"线性尺寸定律"往**上**推八度——每次体积除以 8（线度除以 2）；
3. 一路推到频率对应"暗辐射热"（therma，即原子振荡的频段）；
4. 继续缩，直到尺寸小到能透过**真空**传播（rad-energy 而非 sono-thermism）；
5. 反推：那个尺寸就是原子尺度。

原话（p305）：

> "The vibration-periods of two similarly circumstanced homologous bodies are to each other as their **cubical contents**, and therefore the vibration-frequencies of homologous metal plates are to each other as the **inverse ratio of their linear dimensions**."

**这条的判据要分开打：**
* **"频率反比于线度"** → **A 级**。这是板的弯曲波/薄膜振动的标度律，量纲正确，和网页 `waveDiv()` 同源。
* **"一路推到原子尺度"** → **C 级**。缺口在**中间那段没有实测锚点**：从 10³ Hz 推到 10¹⁵ Hz 要跨 40 个八度，每一步都要"同构、同材、同边界条件"。任何一次模式跳变（弯曲→剪切→纵波）都会让标度律失效。Pond 在 p397 自己也踩到了这个坑：

> "There is an incongruity in all this: When a longitudinal vibration is converted into a shear wave simply by varying the angle of incidence **the frequency remains the same** (we are told) but the velocity changes."

**Pond 承认了矛盾，这一点值得记他一功。** 他没有把矛盾抹平。

同一条链上还有 p346 那句：

> "Therefore the **inner one-third volume is neutral** while the outer three points of the three bodies maintain their respective positive, negative and neutral states."

**复算**：体积取 1/3 ⇒ 半径 = `(1/3)^(1/3) = 0.693361 R`。

对照网页：球腔呼吸模（`j₁`）的塌陷半径是 **0.662586 R**，`2/3 R = 0.666667`。
* `0.6934` vs `0.6626` → 差 **4.64%**
* `0.6934` vs `0.6667` → 差 **4.00%**

**判定：这三个数不是同一个量。** 一个是几何体积三分，一个是球 Bessel 函数极值，一个是人择的 2/3。**近似不等于同源**（这条铁律在 `MEMORY.md` 里挂过）。谁要是把"内 1/3 体积"当成"2/3R 球腔"的证据，那是错的。

#### （4）Count 39 —— 电导率定律：这是整本书最像"可证伪物理"的一条（p400）

原文（Keely 1894）：

> "Electric energy is transmitted through homogenous bodies with a completeness **in direct proportion as the atoms are more or less perfect harmonics of the electric pitch**, but not at all through substances whose atoms are discordant to the electric pitch ... the transmissions being **inversely as the temperature**, directly as the density diminished in proportion to the amount of crystallization, and inversely as the cube of the dyne, also directly as the reciprocal of the local magnetic intensity."

拆成四条可测的：
1. 传导完整度 ∝ 原子频率与电频率的谐和度；
2. 传导 ∝ 1/T（温度越低越好）→ **这就是超导**
3. 传导 ∝ ρ /（结晶度修正）
4. 传导 ∝ 1/（局部磁场强度）

**判据：**
* 第 2 条 → **A 级**。BCS 之后这是常识；1911 年 Onnes 的汞实验已经证明。
* 第 1 条 → **C 级但方向对**。现代语言是"电声子耦合强度"，确实是"晶格振动谱与载流子谱的匹配问题"。Keely 的"谐和度"是它的定性前身。
* 第 4 条 → **D 级（不成立）**。常规超导的临界磁场是**破坏**超导的，不是"传导反比于磁场"。磁阻（`∝B²`，正常金属）方向对但形式不同。这条要么是我读错了原文的"local magnetic intensity"指什么，要么就是错的——**两种可能我都标出来，不替他圆**。

Pond 自己在 p401 写：

> "His law states that the lower the temperature the higher the rate of transmission. This has been proven with the work done recently by and with superconductivity experiments."

他只验了第 2 条，没碰其余三条。**这个取舍是对的**，值得学。

#### （5）Count 40 —— 三力论（p449–450）

> "there are ... **two apparently opposing forces** [they] are in reality **two sides of the same thing** ... a child's teeter-totter ... the pivot point upon which it swings ... is the **neutral point** or point of balance."

这是 Keely 体系的收束：正 / 负 / 中性三力，中性点承载全部重量与运动。网页上的"中性中心"（neutral center）就是这个。

**判据：C 级（哲学层面）**，但它有一个 A 级的特例：**对称/反对称模态分解**。任何线性系统的响应都能唯一拆成"对称（中性/驻波）"和"反对称（传播/行波）"两部分，这就是跷跷板那句话的数学版本。

---

## §4 定量清单：本书所有能复算的数

### 4.1 八度表（p416–421）：74 行逐位核对结果

**核对方法**：把 OCR 原文抄进字典，去掉千分位噪点（书里用 `.` 和 `,` 混当分隔符，还有空格），与 Python 整数 `2^n` 逐位比对。

| 结果 | 行数 | 说明 |
|---|---|---|
| 逐位一致 | 52 | 13–66 阶中除第 23、54 阶外全部 |
| 排印/OCR 伤（可修） | 2 | 见下 |
| 20 位以上不可信 | 20 | 67–86 阶，中段错位 |

**两处可修的伤**：

| 阶 | 书印 | 应为 | 差 |
|---|---|---|---|
| 23 | `8,388,606` | `8,388,608` | −2 |
| 54 | `10,814,398,509,481.984` | `18,014,398,509,481,984` | 小数点错位 + 首位丢字 |

**不可信区间示例（第 67 阶）**：

```text
书印  147.573.952.591.676.413.928
真值  147,573,952,589,676,412,928
               ^^^ ^^^ ^^^ ^^^ 中段起错位
```

**为什么 67 阶开始崩**：双精度浮点只能精确表示 15–17 位有效十进制数字。`2^67` 有 21 位，任何用浮点生成再打印的表格都会在这个区间开始"编造"中间位。书里的表恰好在这里开始崩——这不是排印问题，**这是用浮点算整数幂的指纹**（B 级推断）。

### 4.2 八度表的"注记频率"：全部不在 2^n 上

表里有两种数字：左边的 `2^n`（阶末频率），和右边夹进来的**注记频率**（某种现象的具体频率）。我把注记全部换算成"相对本阶的 cents"：

| 阶 | 注记频率 | 注记文字 | `v / 2^n` | 相对本阶 |
|---|---|---|---|---|
| 13 | 12 000 | Third Octave Heat | 1.464844 | **+660.90 ¢** |
| 13 | 14 000 | Vibro-Atomic | 1.708984 | **+927.77 ¢** |
| 20 | 1 620 000 | Major 5th | 1.544952 | **+753.07 ¢** |
| 21 | 3 145 728 | Ninths | 1.500000 | **+701.96 ¢** ✓ 纯五度 |
| 26 | 100 000 000 | Harmonic 3rds | 1.490116 | **+690.51 ¢** |
| 28 | 300 000 000 | Enharmonic 6ths | 1.117587 | **+192.46 ¢** |
| 28 | 519 655 633 | Highest made in air | 1.935868 | **+1143.58 ¢** |
| 29 | 900 000 000 | Diatonic 9ths | 1.676381 | **+894.42 ¢** |
| 32 | 8 100 000 000 | Dominant Etheric 6ths | 1.885928 | **+1098.33 ¢** |
| 34 | 24 300 000 000 | Inter-Etheric 9ths | 1.414446 | **+600.28 ¢** |
| 57 | 156 057 552 198 220 000 | Full Ninths | 1.082867 | **+137.83 ¢** |
| 64 | 27 670 116 110 564 327 424 | Limit of thermism | 1.500000 | **+701.96 ¢** ✓ 纯五度 |

**结论（A 级，12 个样本）**：

* 只有 **2 个**注记落在干净的音程上（21 阶、64 阶，都是精确纯五度 `1.5`）；
* 其余 10 个都在 **+51 ¢ ~ +1143 ¢** 之间乱飞，不能读成音程；
* `+600.28 ¢` 那个（34 阶 Inter-Etheric 9ths）几乎是精确的**三全音**（600 ¢）——**但注记写的是 "9ths"**，名与数不符。

> **所以这张表必须分两种读法**：
> * 左边 `2^n` 列 = **数学阶梯**，可靠（到 66 阶）；
> * 右边注记 = **现象标注**，**只表示"大约在哪个八度"**，不是频率精值，不可用来算音程。
>
> 把注记当精值去算音程，就会得出"Keely 的五度偏 51 音分"这种假结论。**这是我这次差点犯的错，记在这里。**

### 4.3 Trexar 倍增链（p463）

| 操作 | 数值 | 复算 | 判据 |
|---|---|---|---|
| 常态分子频率 | 20 000 | 原文基准 | A |
| 移一个金节点 | 180 000 | 20 000 × 9 ✓ | A |
| 分区比 | 3:6:9 = (9/3)² = 9 | ✓ | A |
| 再移一个金节点 | 1 620 000 | 20 000 × 81 ✓ | A |
| "81st power" | — | `9^81 = 1.97×10⁷⁷` ≠ 1 620 000 | **B（措辞错）** |

### 4.4 三谐振腔的调音（p136）

原文：

> "the resonators of that structure are set at **B flat first octave, B flat third octave and B flat ninth octave** ... Neutral focalization is then established by dampening the steel rods ... representing **thirds, sixths, and ninths**."

**观察（这是我读完最想标的一处）**：三个"八度号"是 **1、3、9 = 3⁰、3¹、3²**。

由此推出的频率比：

| 项 | 八度号 | 相对第 1 八度 |
|---|---|---|
| 谐振腔 1 | 1 | 1× |
| 谐振腔 2 | 3 | 2² = **4×** |
| 谐振腔 3 | 9 | 2⁸ = **256×** |

**判定：**
* 八度号 1/3/9 → **A 级**（原文照抄）。
* "这是 1:2:4" → **D 级，不成立**。1:4:256 不是 1:2:4。网页上的 `1:2:4` 是 24 管分组，和这里的 1/3/9 八度是**两回事**，不能互相引用。
* 但"3 的幂"这个模式与 `3:6:9`（银/金/铂的分子振荡范围比）**同源** → **C 级**，只能说"作者反复用 3 的幂"，不能说"这是同一个定律"。

### 4.5 Chladni 方板模态 → 音程（p408–409）

Pond 引 Lang 在 *Sound & Vibration*（1989-11）测的方板模态频率，然后自己算音程。原文只给了两个数：

| 模态 | 频率 | 到下一模态 |
|---|---|---|
| Mode 2 | 1 207 cps | — |
| Mode 3 | 1 472 cps | 比值 1.219553 = **+343.62 ¢** |

**复算**：`1200·log2(1472/1207) = 343.62 ¢`；纯律小三度 `6/5` = 315.64 ¢；十二平均律小三度 = 300 ¢。

* 相对 `6/5`：超出 27.98 ¢
* 相对 `1.2`：`1472/1207 ÷ 1.2 − 1 = 0.016294` = **16.29‰**

Pond 原话是"only **19/100ths** greater than a Minor Third"。我复算得 **16.29‰**（千分之十六点三）。他那个"19/100ths"要么是**千分之十九**的笔误，要么用了别的基准频率。**B 级，标出偏差，不强行对齐。**

**这条的真正价值**：Pond 用这一个例子证明"模态频率之间是音程关系，所以可以从一个模态**预算**下一个模态，不必做完整模态分析"。

**判据：C 级。** 一个数据点证明不了"模态频率都落在音程上"。方板的模态比取决于长宽比和边界条件，1207/1472 这一对落在小三度附近很可能是**这块板的尺寸挑出来的巧合**。

> **和网页的关系**：这正好是网页"公式单一来源"那条铁律的反面教材。网页的 `waveDiv()` 是从**边界条件**推的；Pond 这条是从**两个实测数**推的。前者可移植，后者不可移植。

### 4.6 其他可复算的数

| 项 | 原文值 | 复算 | 判据 |
|---|---|---|---|
| 以太胶囊线速度（p207） | 600 000 mile/s | = 965 606 km/s = **`3.2209 c`** | A（算式对）/ 结论 C |
| 以太密度（p225, p334） | 钢的 986 000 倍 | 无法独立验 | C |
| 以太压力（p225, MacVicar） | 大气的 1.224×10¹¹ 倍 | 无法独立验 | C |
| 以太臭氧解放阻力（p470） | 110 000 lb/in² | `= 758 MPa` | A（单位换算） |
| 早期水力机压力（p471） | 500 lb/in² | `= 3.45 MPa` | A |
| 12 台发生器最大压力（p471） | 30 000 lb/in² | `= 207 MPa` | A |
| 发生器重量跨度（p471） | 175 → 34 000 lb | `= 79.4 kg → 15.4 t` | A |
| 旋转谐振器（p216） | 780 lb | `= 354 kg` | A |
| 中和指示器转速（p466） | 110 rpm @ 1.5606×10¹⁷ osc/s | 见下 | **B** |
| 中和指示器最高转速（p466） | 123 rev/**s** | `= 7 380 rpm` | A |
| 双球体积比（p470） | 33⅓ : 66⅔ : 100 | **`= 1 : 2 : 3`** | A |
| 失谐量（p471） | "33⅓ of a tone"、"66⅔ of a tone"、"1/3 of tone" | `= 33.3 ¢`（1/3 半音） | A |
| 分子断裂判据（p437） | 宽:长 = **1:4** | log2(4) = **`2 八度`** | A |
| 分子轨道三轴（p436） | 512 / 640 / 1024 cps | `= 1 : 1.25 : 2`；640/512 = **`+386.31 ¢`**（纯律大三度） | A |
| Fibonacci 递进（p438–439） | 1:1:1 → 1:1:2 → 1:2:2 → 1:2:3 → 1:3:5 → 断裂 | 最大/最小比：1 → 2 → 2 → 3 → **5 > 4** ⇒ 越过 1:4 阈值 | **A（自洽）** |
| Fibonacci 音程（p411） | Unison, Octave, P5, M6, m6, … | 0 / 1200 / 701.96 / 884.36 / 813.69 / 840.53 / 830.25 ¢，**收敛到 `1200·log2(φ) = 833.09 ¢`** | **A** |

**几个要展开的：**

**（a）600 000 mile/s = 3.22 c。** 这不是"超光速"宣称——Keely 说的是**以太胶囊**（分子/原子的"包膜"）的**旋转**线速度，不是信息传播速度。旋转的相位速度本来就可以超 c，不违反相对论。**但**：`3.22 c` 这个数是从"12 英寸球 + 1/16 英寸大气膜 + 显微放大比"推的（p207），而那个放大比没有给具体数值 ⇒ **推不出来，只能反推**。判据：算式 A，前提 C。

**（b）1.5606×10¹⁷ osc/s ↔ 110 rpm。** 我验了这个数：
* `log2(1.5605755219822×10¹⁷) = 57.1149` ⇒ 它在第 57 阶之上 **+137.83 ¢**
* 与 `3^36 = 150 094 635 296 999 121` 的比是 `1.039725` ⇒ **+67.4 ¢**
* **既不落在 2^n 上，也不落在 3^n 上，也不落在任何常用音程上。**

所以这个数是**从器件（三-三和弦 = 九节点全开）算出来的，不是从音阶算出来的**——和 1 620 000 同一个性质。判据：**B**（数存在、可引用；但"Full Ninths"这个注记名对不上它的实际位置）。

**（c）Fibonacci 收敛到 833.09 ¢。** 这条 Pond 没写，是我算的：相邻 Fibonacci 比趋近 φ，所以音程趋近 `1200·log2(1.618034) = 833.09 ¢`。这个数**不在任何纯律音程上**（最接近的是 8/5 = 813.69 和 5/3 = 884.36，两边各差 20–51 ¢）⇒ 它在音乐里叫**狼音程（wolf interval）**。

> **这是一个漂亮的收束**：Pond 拿 Fibonacci 当"自然递进"的证据（p439），但 Fibonacci 比值的**极限音程恰恰是狼音程**——一个"哪边都靠不上"的位置。也就是说：**Fibonacci 递进在音乐上是不收敛到和谐的。** 这和他想说的"自然有序"是相反的证据。判据：**A 级（数学）/ 与他结论相反**。

### 4.7 3:6:9 有四套编号法，给出四个不同的比值

同一句"在三个八度上敲同一个和弦"，在原文里至少有四种编号基准。**混用就是灾难** —— 四个比值最大差 256 倍。完整推导在 `克拉德尼_Keely技术与本页深意_桥接.md` §3.2，这里只留判定表。

| 代号 | 编号基准 | 频率比 | 跨度 | 出处 |
|---|---|---|---|---|
| **A** | 相对 620 Hz 音叉，第 1/2/3 个八度 | `2¹:2²:2³` = **1 : 2 : 4** | 2 八度 = 2400¢ | p134 |
| **B** | 相对 mass chord（B♭），第 **1/3/9** 个八度 | `2:8:512` = **1 : 4 : 256** | 8 八度 = 9600¢ | p136 |
| **C** | 绝对八度号 3/6/9 | `8:64:512` = **1 : 8 : 64** | 6 八度 = 7200¢ | Snell 转述 |
| **D** | Pond 注解：`2³:2⁶:2⁹` 的**体积** | 体积 1:8:64 ⇒ 线度 **1 : 2 : 4** | — | 注解层 |

**三条必须记住的**：

1. **`33⅓ : 66⅔ : 100` ≡ `3 : 6 : 9` ≡ `1 : 2 : 3`** —— 三条精确相等（`100/3 : 200/3 : 100` 同除 `100/3`）。
   🔴 但它们的**合计是 200，不是 100**。任何"三者相加 = 100%、各占 33⅓%"的读法都不成立（Decker 1988 的讲稿就是这么读的）。

2. **`2³:2⁶:2⁹` 是"体积单位"**（Pond 原话）。开立方 ⇒ **线度 1:2:4** ⇒ 与本页 24 管的"组内 1:2:4"**同一个数**。所以 1:2:4 与 3:6:9 不是两个体系，是同一骨架的两种读数（读体积 / 读八度号）。A 与 D 两条独立路径落到同一个 1:2:4，这不是巧合。

3. **"跨 9 个八度"只在"以八度 0 为起点"时成立**：`2⁰:2³:2⁶:2⁹ = 1:8:64:512`。若改以第 3 个八度为起点，就只有 6 个八度（`1:8:64`）。**同一组数，两种说法差 3 个八度** —— 引这句话必须带起点。

### 4.8 六阶细分 ↔ 100 MHz × 3ⁿ：原文缺的那一项能补出来

p55 给了五个频率，排成表规律立刻出现：

| 细分阶 | 倍数 | 频率 | 原文给了吗 |
|---|---|---|---|
| Molecular | `3⁰` | 100 MHz | ✓ |
| Inter-molecular | `3¹` | 300 MHz | ✓ |
| Atomic | `3²` | 900 MHz | ✓ |
| **Inter-atomic** | `3³` = 27 | **2.7 GHz** | ❌ **没给** |
| Etheric | `3⁴` = 81 | 8.1 GHz | ✓ |
| Inter-etheric | `3⁵` = 243 | 24.3 GHz | ✓ |

原文五项的比是 `1 : 3 : 9 : 81 : 243` —— 正好是**分子阶数列 `1:3:9:27:81:243` 缺了 27 那一项**。两处交叉，缺的就是"原子间" = **2.7 GHz**（C 级：推得，非原文）。

⚠️ 顺带记一处已纠正的算错：桥接文档上一版 §3.2 写过「100 : 300 = 3 : 9；300 : 8100 = 6 : 9」。**后半句不成立** —— `300 : 8100 = 1 : 27`，不是 `6:9`（= 2:3）。整条链的真比例是 `1 : 3 : 9 : 81 : 243`，与 3:6:9 无关。已在桥接文档 §3.2 重写时改掉。

---

## §5 和网页的逐项对应（老师要的"结合网页关联"）

这一节是全篇的目的：**书里哪句话，对应网页上哪个控件，吻合到什么程度。**

### 5.1 已经对上的（可以直接互相引用）

| # | 书中原文（页） | 网页里的东西 | 吻合度 |
|---|---|---|---|
| 1 | "The octave ... having **1/8 of its volume**"（p305） | `waveDiv()` 单一来源；管长 λ/4 与 λ/2 | **结构同源**：都是"八度 ⇔ 线度减半" |
| 2 | 三谐振腔设 B♭ 第 1/3/9 八度（p136） | 7 内管同音 B♭5；`a4Hz()` 基点 | **音名一致**（都是 B♭），八度号不能套 |
| 3 | Trexar 是银/金/铂 **3:6:9**（p461） | `tune` 探针里的 3:6:9 链条 | **数值一致** |
| 4 | 球静止=和谐，转动**必须**非谐波和弦（p503） | 非对称图纹：`gcd(m集)`、破镜需每模态独立相位 | **方向一致**（都指向"对称破缺需要非同频或非同相"） |
| 5 | 内 1/3 体积中性（p346）⇒ ρ = 0.693361R | 球腔呼吸模塌陷 ρ = 0.662586R | **数量级一致，数值不同**（差 4.64%），不许混用 |
| 6 | 分子断裂判据 宽:长 **1:4**（p437） | 页面的 `R_in/R`、`√2` 临界、股/勾 ≤ √2 | **无关**（一个是分子形变，一个是四面体内接），**不要联** |
| 7 | 20 000 → 180 000 → 1 620 000（p463） | 挂挡 9 档 `[2,3,4.5,…,45]¢` 的倍频链 | **同为乘 9 的链**，但网页是失谐量不是频率 |
| 8 | 双球体积 1:2:3（p470） | 内环 `1:2:4` 分组 | **不同**（1:2:3 ≠ 1:2:4），见 §6 |
| 9 | 失谐 1/3 半音 = **33.3 ¢**（p471） | 挂挡第 8 档 = **33 ¢** | **数值巧合**（C 级，不能当依据） |
| 10 | 12 音近似大二度构成旋转和弦（p503） | 24 管 = 3 组 × 8，组间 `2^(s/7)` | **结构类似**（离散音列拼出不协和），机制不同 |

### 5.2 网页上有、书里**没有**的（不能说"Keely 说过"）

这几项在网页里是核心，但**在这本 571 页的书里找不到原文**。必须区分"我的建模"和"Keely 的原话"：

| 网页特性 | 书里有依据吗 |
|---|---|
| 24 管 = 内 7 + 外 8×3 | ❌ 本书无。在 `25_keely/K9_Dynasphere24管与Anu十丝…` 里 |
| Dynasphere 12″ 壳 / 904.77 in³ / 2 oz 配重 | ❌ 本书无（本书只有 Trexar、disintegrator、motor 的尺寸） |
| `ρ_peak = j′_{m,1}/j_{m,1}` 推力反向 | ❌ 本书完全没有球 Bessel 的内容 |
| 球腔 Neumann 零点 745.63 Hz | ❌ 本书没有腔内声场章节 |
| 双耳 HRTF / ILD / ITD | ❌ 本书完全没有 |
| `2/3 R` 球腔呼吸模 | ❌ 本书只有"内 1/3 体积"（0.6934R），**不是 2/3R** |
| 9 挡挂位 `[2,3,4.5,7,10,15,22,33,45]¢` | ❌ 本书只有"1/3 of a tone"单点 |
| 1/7 塌陷 g = 0.00011 | ❌ 本书无 |
| 三管基音 = A3 = 216 Hz | ❌ 本书无（本书三谐振腔是 B♭） |

> **这一栏是这份笔记最该被记住的部分。** 网页上那些数，绝大多数是**我们自己算的**，不是 Keely 给的。
> 把它们说成"Keely 的发现"，是**假引用**——比算错更坏。

### 5.3 书里有、网页上**还没用**的（可以补的东西）

| 书中内容（页） | 可以怎么用 |
|---|---|
| **非谐波和弦 → 球旋转**（p503–504） | 球腔档可以加一个"12 音非谐波和弦"预设，让"12 个离散声源"那档（挂账 #3）终于有原文依据 |
| **声→热分界在第 21 八度**（p414） | 可以算一个"这台机器工作在哪个'域'"的读数（sonity/sonism/thermism/rad-energy） |
| **分子断裂 1:4**（p437） | 可以和"沙径向漂移只有喷程没有回程"（挂账 #1）挂钩：喷程的极限是不是 1:4 判据 |
| **三谐振腔 1/3/9 八度**（p136） | 7 内管若按 1/3/9 排会更贴原文，但会失去"同音"这个当前设计 |
| **电导率 ∝ 1/T**（p400） | 可以做一个"频率-温度"耦合的说明条目（不实现） |

---

## §6 明确判"不成立"的清单（D 级）

**这一节是这份笔记的骨头。** 每一条都是有人在别处引用过、或者很容易被误引的。

| # | 说法 | 出处 | 为什么不成立 |
|---|---|---|---|
| 1 | "三谐振腔 = 1:2:4" | p136 的 1/3/9 八度 | 1/3/9 ⇒ 频率比 **1:4:256**，不是 1:2:4。1:2:4 是网页 24 管的分组，两者无关 |
| 2 | "内 1/3 体积（0.6934R）= 球腔 2/3R（0.6667R）= 呼吸模塌陷（0.6626R）" | p346 + 网页 | 三个数差 4.0%–4.6%。**近似不等于同源**。0.6934 是几何体积，0.6626 是 `j₁` 极值 |
| 3 | "非谐波和弦一定能诱发旋转" | p503 | 原文是可诱发不是必诱发。网页反例：2 模态不足以破镜，只有**整除**串扰起作用 |
| 4 | "Fibonacci 递进 = 自然和谐" | p439 | 复算：Fibonacci 比值收敛到 `1200·log2(φ) = 833.09 ¢`，**正好是狼音程**，不落在任何纯律音程上。递进在音乐上**不收敛到和谐** |
| 5 | "1 620 000 是 Major 5th" | 八度表第 20 阶注记 | 实测 +753.07 ¢，比纯五度高 **51 ¢**。它是 20 000×81 的器件倍增数 |
| 6 | "9 的 81 次方 = 1 620 000" | p463 | `9^81 = 1.97×10⁷⁷`。上标 81 是"81 倍" |
| 7 | "600 000 mile/s 违反相对论" | p207 | 那是以太胶囊**旋转**线速度，不是信息速度。3.22c 的相位速度不违反 SR。**但它推不出来**（放大比未给），只能反推 |
| 8 | "传导反比于局部磁场强度" | p400 | 常规超导的临界磁场是**破坏**超导的，不是"传导随磁场下降"。方向不同 |
| 9 | "本书 = 40 条定律 = 那个著名 40 条清单" | p166–449 | 本书**没有** `Law of Matter and Force` 与 `Law of Attraction` 的标题。两份清单页码不能互套 |
| 10 | "八度表全部可信" | p416–421 | 67–86 阶（20 位以上）中段错位，不可引用；第 23 与 54 阶有排印伤 |
| 11 | "Chladni 板模态频率都在音程上" | p408 | 只有一个数据对（1207→1472 = 343.62 ¢，Pond 自己说 19/100ths，我算 16.29‰）。**一个点证不了全表** |
| 12 | "Keely 已证明水能变成以太级能源" | p334 | 原文是"能量值远超镭"的**断言**，无任何可复算支撑。**C 级以下**，本页一个字都不碰 |
| 13 | **"Tesla 说：懂 3、6、9 就拿到宇宙的钥匙"** | 中文网络 | SVP 站自认「source of this quote unknown … I have found no other reference to this quote attributed to Nikola Tesla」。**不能当 Tesla 语录引用** |
| 14 | **"33⅓ : 66⅔ : 100 = 三者各占 1/3、合计 100%"** | Decker 1988 讲稿 | 三者合计 **200**，不是 100。精确化简是 **1:2:3**（≡ 3:6:9），是**相对强度比**，不是份额 |
| 15 | **"六度使物质增密"**（或相反的"使物质稀薄"） | svpwiki 14.09 vs svpvril | 两个 SVP 站点同引 Brinton 摘要却给出相反结论；svpwiki 那版还内部自相矛盾（"范围变小"却"更稀薄"）。**下游定义不可引用** |

---

## §7 这份笔记**没做**的事

诚实边界，避免下次误以为已经做完：

1. **没有逐页读完全书 571 页。** 精读了约 60 页（§1.2 标 ★ 的全部 + 40 条定律的开头段），其余按结构抽样。
2. **没有做图版的图像分析。** p536–551 有 16 页纯图，主要是 Keely 手绘图表；OCR 出不来，我也没逐张看图。
3. **没有翻译 40 条定律全文。** 那是 `25_keely/03_…` 的活；这里只给页码 + 关键句 + 判据。
4. **没有核 `Keelys-Laws-of-Being.pdf`**（另一本，4.1 MB，在 `25_keely/`）。本书大量引用它，但我没做交叉核对。
5. **没有考证 Pond 的其它著作**（`Gravitational_Energy_Control`、`Aquino声波反引力` 等 PDF）。
6. **没有对 Trexar 的材料物理做独立估算。** 银:金:铂 = 3:6:9 的"分子振荡范围"是什么量（声速？德拜温度？原子半径？）原文没说清，我不猜。

---

## §8 附：怎么复现本笔记的全部数字

```text
# 1. 提取文本（需要 Python 3，只用标准库 zlib/re）
cd "D:/AAA我的文件/chladni/_pdfnote"
python extract.py "…/Universal laws … (Pond, Dale).pdf" pond_full.txt

# 2. 按页访问
python -c "
import re
s=open('pond_full.txt',encoding='utf-8').read()
pages={int(m.group(1)):m.group(2) for m in re.finditer(r'\n===== \[PDF 第 (\d+) 页 / obj \d+\] =====\n(.*?)(?=\n===== \[PDF 第|\Z)', s, re.S)}
print(pages[416])"

# 3. 核对八度表（见 §4.1 的字典）
```

提取器的关键点（踩过的坑，别重踩）：

1. 这本书**没有 ToUnicode**，字母全是 glyph id，`0003` 是空格 ⇒ 必须自己解 CMap；
2. CTM 与 Tm 做了**双重翻转**，块排序要用 `(-y, x)` 而不是 `(y, x)`，否则每页行序全反；
3. 千分位混用 `,` 和 `.`，且 `2^n` 大数里两种都有 ⇒ 解析数字要"去掉全部非数字字符"再判断，不能按分隔符切。

---

## §9 一句话总结

> **这本书的价值在"原件"，不在"结论"。**
>
> 它把 1887–1898 年的报刊原文、Keely 的手稿片段、600 dpi 的原图，和 Pond 1985–1989 年的逐月评论，编在同一本 571 页里。**一手史料这一段做得很扎实**（石英山 18 分钟 18 英尺、Bloomfield-Moore 的 Dynaspheric Force、1887 年 *Scientific Arena* 的访谈、Trexar 的节点操作、三谐振腔的调音步骤）。
>
> 但它的**物理结论必须逐条复算**——因为作者自己就写明了"先信后验"。而一旦开始复算，你会发现两件相反的事：
> * **它有几条真的对**：1/8 体积 = 1 八度（精确）、电导率 ∝ 1/T（超导）、转动靠破和谐（对称破缺）、负压内爆（Pond 1994 实测）；
> * **它有几条真的很错**：9 的 81 次方、Fibonacci 收敛到和谐、1:4 与 1:2:4 的混用、以太 986 000 倍密度。
>
> **把这两类分开，就是这份笔记的全部工作。**

---

*笔记完 — 页码均指 PDF 物理页；判据等级 A/B/C/D 见 §0.2；D 级清单见 §6（15 条）。*
