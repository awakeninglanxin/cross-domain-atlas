# 多面体内反射线 · Diagonals of Polyhedra · 网页版 使用与原理说明

> 源 nb：`多面体内反射线DiagonalsOfPolyhedra-author.nb`（2 个 cell，Wolfram Demonstrations）
> 成品：`多面体内反射线DiagonalsOfPolyhedra.html`（单文件、零依赖、双击即开，251 335 字节）
> 开发目录：`_pk_web_dev\`　共用件：`_shared\`　动态图归档：`多面体内反射线_动态图归档\`

---

## 零、这个演示在做什么

原版就一句话：

> **把多面体的全部顶点两两连线画出来，再把壳做成半透明，于是壳内的每一条弦都看得见。**

那些线在球面 / 多面体语境里正是「**内反射路径**」—— 声波或光线在多面体腔体内沿对径方向飞行的轨迹。n 个顶点 ⇒ `C(n,2)` 条弦：

| 多面体 | 顶点 V | 弦数 C(V,2) |
| ------ | ------ | ------ |
| 正四面体 | 4 | 6 |
| 立方体 | 8 | 28 |
| 正二十面体 | 12 | 66 |
| 正十二面体 | 20 | 190 |
| 足球（截角二十面体） | 60 | 1 770 |

页面里能切换 **155 个多面体**（柏拉图 → 阿基米德 → 卡塔兰 → 开普勒-庞索 → 棱锥 → 双棱锥 → 棱柱 → 反棱柱 → 约翰逊），全库弦数合计 **72 339** 条。

---

## 一、nb 的定义（逐字复刻，未作任何改动）

```
Manipulate[Graphics3D[{
    Opacity[tlines],
    Line[Subsets[PolyhedronData[p,"VertexCoordinates"],{2}]],
    Opacity[tpoly],
    GraphicsComplex[PolyhedronData[p,"VertexCoordinates"],
                    Polygon[PolyhedronData[p,"FaceIndices"]]]},
  Boxed->False, ImageSize->{550,450}, ViewPoint->{0,0,100}, ViewAngle->0.01],
  {{p,"Dodecahedron",Row[{"transparency",Spacer[30],"select polyhedron"}]},
   Flatten[Riffle[(#->PolyhedronData[#,"Name"])&/@PolyhedronData[#]&/@
     {"Platonic","Archimedean","ArchimedeanDual","KeplerPoinsot",
      "Pyramid","Dipyramid","Prism","Antiprism","Johnson"}, Delimiter]],
   ControlPlacement->Top},
  "poly",  {{tpoly,0.5,""},0,1,ControlType->VerticalSlider},
  "lines", {{tlines,1,""},0,1,ControlType->VerticalSlider},
  ControlPlacement->Left]
```

整条式子只有三样东西：

1. **`Line[Subsets[顶点,{2}]]`** —— 顶点两两连线的**全部** `C(n,2)` 条弦（棱 + 面对角线 + 体对角线，一视同仁）。
2. **`GraphicsComplex[顶点, Polygon[面索引]]`** —— 逐面多边形。
3. **两个 `Opacity`** —— 弦用 `tlines`（默认 **1**），面用 `tpoly`（默认 **0.5**）。

`"poly"` 和 `"lines"` 是 Manipulate 里的**文字标签**，分别标注紧随其后的那个滑块（面透明度 / 线透明度），不是变量名。

菜单族的遍历顺序严格照 nb：`Platonic → Archimedean → ArchimedeanDual → KeplerPoinsot → Pyramid → Dipyramid → Prism → Antiprism → Johnson`。**金字塔/双棱锥排在棱柱之前**（这一点容易按字母序写错，页面里按 nb 原序）。

---

## 二、几个必须先讲清的技术点

### 2.1 `ViewPoint->{0,0,100}` + `ViewAngle->0.01` 其实就是**正交投影**

Mathematica 里 `ViewPoint` 是「包围盒归一坐标」，`ViewAngle` 是「物体张角」。`{0,0,100}` 把相机推到极远处，`0.01` rad（≈ 0.57°）把张角压到极小 —— 透视退化为**沿 z 轴的正交投影**，画面就是多面体在 xy 平面上的正投影。

页面据此把 `yaw = pit = 0` 这条路径**严格实现为正交**（`orthoCamAt`），只有用户拖动旋转后才切到透视。

### 2.2 屏幕上方取 `up = +y`（这是一条**假设**，如实标注）

`ViewPoint {0,0,100}` 与默认 `ViewVertical {0,0,1}` 共线，屏幕上方向由 Mathematica 内部规则决定，**无法从 nb 文本核验**。本页取 `up = +y`（屏幕 x = 世界 x，屏幕 y = 世界 y）。这条已写进页面「与 nb 的对照」卡里。

### 2.3 弦 = `Subsets[V,{2}]`，字典序 `i<j`

- 共 `C(n,2)` 条，含**棱 + 面对角线 + 体对角线**全部（不是只画棱）。
- 页面里 `chordsOf(n)` 严格生成字典序 `i<j` 的全部对；另有「只画棱」开关，把弦替换成 `E` 条棱，方便看清骨架。

### 2.4 155 个多面体的数据源与精度

| 来源 | 个数 | 说明 |
| ------ | ------ | ------ |
| George Hart《Virtual Polyhedra》 | 126 | 5 柏拉图 + 13 阿基米德 + 92 约翰逊 + 8 棱柱 + 8 反棱柱（经 Stemkoski 的 JSON 转写） |
| 自建派生：卡塔兰（阿基米德对偶） | 13 | 由对偶面极点构造 |
| 自建派生：开普勒-庞索 | 4 | SSD / GD / GSD / GI，四种星形立体 |
| 自建派生：棱锥 / 双棱锥 | 12 | 底正 n 边形外接半径归一为 1 |
| **合计** | **155** | |

坐标保留 6 位小数 ⇒ 弦长有 ~2×10⁻⁶ 的量化噪声；少数约翰逊立体（**J84 扭棱双楔、J88 楔形穹顶**）自身坐标精度只到 ~5×10⁻⁴ 相对量级。

**这不是缺陷，是数据源的性质**，页面如实展示（弦长谱里能看到这几个立体的一档棱微微散开）。

### 2.5 弦长聚类**必须**用相对容差

把 `C(n,2)` 条弦按长度分组时：

- 绝对容差 `1e-6` 会把立方体拆成 `[10,2,12,2,2]`（量化噪声）；
- 放宽到 `1e-4` 仍会把 J84/J88 的**棱**那一档劈开，看起来像「有非棱弦比棱还短」的假反例；
- 最终取**相对容差 `rtol = 1e-3`**。真实的不同弦长之间间隔 ≥ 3%，`1e-3` 安全。

### 2.6 正十二面体是「5-distance set」

190 条弦恰好落在 **5 个**长度上，重数 `[30, 60, 60, 30, 10]`，比值正好是

```
a · {1, φ, φ√2, φ², φ√3}      （φ = (1+√5)/2）
```

页面把这条闭式写进弦长谱表的「闭式」列，能自动标出 `a·1`、`a·φ`、`a·φ√2`… 立方体则是 3 档 `a·{1, √2, √3}`（重数 12/12/4），正二十面体 3 档 `[30, 30, 6]`（最长那 6 条是对跖弦 = 直径）。

### 2.7 半透明面 vs 壳内的线：**「线穿透面」开关**

按真实画家算法（远的先画），前面的半透明面会盖在壳内的弦上 —— 这是物理正确的，但旋转到侧视角时会吃掉大半弦，「内反射线」这个主题就丢了。

所以页面加了一个开关：

- **开（默认）**：给弦加一个巨大的深度偏置，让弦永远排在所有面之后绘制 ⇒ 线始终在最上层。这是本页主题该有的样子。
- **关**：恢复严格画家算法，前表面遮挡内部，立体感更强（原版 `Graphics3D` 更接近这种）。

缩略图里**强制走「关」**：小画布上上千条弦若全压在半透明面上会糊成一整块纯色（实测足球那张整块橙红）。

---

## 三、自写的 3D 内核 `_shared/mini3d.js`

三页共用（ChartForATorus / DiagonalsOfPolyhedra / RecursiveExercisesVITori），纯 Canvas2D、零依赖。

```
世界坐标 → lookAt 正交基 → 正交/透视投影 → 深度排序(painter) → 绘制
光照：法向转到相机空间（光固定随相机），环境光 + 双方向光 Lambert
图元：四边形/多边形 / 线段 / 折线 / 球 / 文字，统一进一个列表按深度排序
```

关键接口：`cam` `camOrtho` `view` `proj` `pxRadius` `shade` `List(quad/line/polyline/sphere/text/flush)` `bboxOf` `sphereOf` `orbit`。

**本轮为多面体页做的两处改动**（都留了断言，并回跑了上一页测试确认没破坏）：

1. `P.quad` 新增 `seal` 开关 —— 半透明面也能补同色描边盖掉相邻多边形之间的抗锯齿细缝（默认关闭，不影响上一页）。
2. **`drawQuad` 的质心从「硬编码 4 个顶点」改成按 `pts.length` 求平均。** 上一页只画四边形所以没暴露，而多面体有三角形 / 五边形 / 六边形 / 十边形面 —— 只要切到有三角形面的约翰逊立体就会 `pts[3]` 越界崩掉。

---

## 四、页面结构

### 顶栏（transport）
导出 GIF / 导出 PNG / 播放旋转 / 复位 / 循环 / 速度滑块 / 进度条 + 角度读数。

### 主视窗 · 内反射线
`550:450` 画布（等比于 nb 的 `ImageSize`）。弦按视线深度从**暖（近）→ 冷（远）**着色，顶点画成小球，面半透明。鼠标拖动 = 旋转，滚轮 = 缩放，双击 = 回 nb 默认视角。

### 五联缩略图
立方体 → 正十二面体 → 大星形十二面体 → 菱形三十面体 → 足球，一眼看出「弦密度」随顶点数的爆炸。

### 弦长谱表
逐档列出长度、条数、占比、可辨闭式。

### 读数卡
名称 / 族 / V / E / F / 欧拉 χ / 弦数 / 弦长种类 / 面型 / 包围盒跨度 / 投影方式 / 缩放。

### 底部两张卡
「与 nb 的对照」（nb 原文 + 逐句说明）、「怎么读这张图」。

### 参数浮窗（6 张卡）
① 多面体 p（族下拉 + 全键下拉 + 6 个预设 + 上/下一个）
② 透明度（`tpoly` 默认 0.5 / `tlines` 默认 1，各带 5 个预设）
③ 视角（yaw / pitch / zoom + 「nb 默认(正交)」等 5 个按钮）
④ 显示（顶点小球 / 弦按远近着色 / 画面 / 面描边 / **线穿透面** / 只画棱 / 面色 / 弦色）
⑤ 怎么读这张图
⑥ 与 nb 的对照

---

## 五、🎞 导出

### PNG
主视窗一键存图（`多面体内反射线_<多面体>.png`）。

### GIF
`880×720 × 30 帧`，绕 z 轴整圈旋转扫描（透视视角，`pit` 自动抬到 18° 以免正对退化），带 `NETSCAPE2.0` 无限循环。

### 已预生成的归档 `多面体内反射线_动态图归档\`

| 文件 | 体积 | 说明 |
| ------ | ------ | ------ |
| 多面体内反射线_旋转扫描_Cube.gif | 1.09 MB | 28 条弦，看得清每一条 |
| 多面体内反射线_旋转扫描_Dodecahedron.gif | 4.64 MB | 190 条，已经是颗星 |
| 多面体内反射线_旋转扫描_SmallStellatedDodecahedron.gif | 2.30 MB | 星形立体 |
| 多面体内反射线_旋转扫描_TruncatedIcosahedron.gif | 11.29 MB | 足球，1 770 条，一片光网 |

---

## 六、与原版的差异（诚实清单）

| 项 | 原版 | 本页 | 理由 |
| ------ | ------ | ------ | ------ |
| 渲染 | Mathematica 内置 3D 引擎 | 自写正交/透视 + 画家算法 | 零依赖单文件 |
| 屏幕上方向 | Mathematica 内部默认 | 取 `up = +y` | **假设**，nb 文本无法核验，已在页面标注 |
| 弦的颜色 | 单色 | 默认按视线深度暖→冷渐变 | 增强；可在「显示」卡一键关掉回到单色 |
| 弦与面的遮挡 | 由 Mathematica 决定 | 默认「线穿透面」= 线在最上层 | 主题是内反射线，必须看得见；可关 |
| 顶点小球 | 无 | 有（金色小球） | 增强，可关 |
| 面描边 | 无 | 有（默认关） | 增强 |
| 多面体数 | `PolyhedronData` 全集 | 155 个 | Hart 126 + 自建 29，覆盖 nb 列出的 9 个族 |
| 自由旋转 | 只有固定正视 | 鼠标任意旋转 + 5 个预设视角 | 增强 |
| 弦长谱 | 无 | 有（含闭式识别） | 增强，把「5-distance set」这类性质直接摆出来 |

---

## 七、验证过程（全部在 `_pk_web_dev\` 与 `_shared\`）

### ① 数据构建 `poly_db.py` —— **零硬性问题**

```
155 个多面体（5/13/13/4/6/6/8/8/92），共面残差 max 6.86e-7，
凸包逐面比对 151/151（4 个非凸自动跳过），=== 无任何硬性问题 ===
```

外加 **4 组开普勒-庞索独立交叉对拍全部一致**：

```
① SSD 构造② ⇔ 构造①   指纹最大偏差 6.581e-07
① GD  构造② ⇔ 构造①   指纹最大偏差 4.217e-07
② 内层 = R_c            差 1.110e-16
② 中层 = √(r_in²+(φ²·r_face)²)  差 1.723e-07
② 外层 = φ³·R_c         差 2.670e-07
③ 构造③尖点 ⇔ 中层 12 点  逐点最大距离 4.172e-07
④ GI 极对偶 ⇔ 十二面体面图   指纹最大偏差 1.008e-07
```

### ② Python 黄金参考 `ref.py` + 数学自检 `ref_test.py` —— **62 项全过**

A 弦 · B 正交相机 · C 画家排序 · D 数据体检 · E 透视相机 · F 指纹。关键黄金值：

```
正十二面体 550×450 正交 scale = 226.403702958
正十二面体 780×640 正交 scale = 321.996377541
立方体弦长谱 [12, 12, 4]
正十二面体弦长谱 5 组 [30, 60, 60, 30, 10]
等棱多面体 138 个「最短弦那一档 = 棱数」
```

### ③ 3D 内核自检 `_shared/selftest_mini3d.js` —— **37 项全过**

### ④ 浏览器在线对拍 `verify_live.js` + `verify_core.js` —— **61 项全过**

把 Python 黄金值分片注入真实页面，与 `window.__PK__` 逐项对拍：

```
A 常量与族序      B 数据解析 155 个（digest / stats / 面型 / 包围球）
C 弦与棱          D 弦长谱 12 个（档数 + 重数 + 长度）
E 正交相机 12×4 配置的 scale/eye/target/s/u/f
F 全库 scale 155 个   G 逐点投影（3 组正交 + 1 组透视）
H 画家次序（完整次序 + 每项深度）  I 形状指纹（顶点半径谱 / 棱长谱 / 面平面距谱）

通过 61 项，失败 0 项   （全程最大偏差 6.966e-7）
```

那个 `6.966e-7` 正是 Hart 数据 6 位小数的量化噪声量级 —— 说明 JS 侧与 Python 侧算的是同一个东西。

### ⑤ 桩测 `pk_stub_test.js` —— **170 项全过**

无浏览器：手写 DOM 桩 + 拼成一个脚本共享作用域（因为四个 js 在真实页面里同处一个 `<script>`）。

```
A 几何核闭式  B 相机/投影  C 画家排序  D DOM 绑定（65 个 id 全部绑上）
E 交互（滑块/鼠标/滚轮/双击/预设/键盘/折叠）  F 绘制（含「线穿透面」开关）
G GIF 往返（LZW / GIF89a / 880×720×30 分片重组）  H 状态同步
```

### ⑥ 真机实拍（headless Chrome + CDP）

14 张：整页默认 / 正十二面体 190 弦 / 立方体 28 弦 / 足球 1770 弦 / 小星形十二面体 / 大星形十二面体 / 正二十面体 66 弦 / 只看线 / 只看面 / 只画棱 / 自由视角 iso / iso 只看线 / iso 线穿透关 / 五联缩略图。GIF 另抽 10 帧目视。

### 2026-10-07 这轮修掉的坑（都留了断言）

**真 bug（4 个，都在页面代码里）：**

1. **`mini3d.drawQuad` 质心硬编码 4 个顶点** ⇒ `pts[3]` 越界。只要切到有三角形面的多面体（约翰逊族大部分、棱锥）就崩。改成按 `pts.length` 求平均。
2. **`boot()` 漏调 `bindMouse()`** ⇒ 拖拽 / 滚轮 / 双击**全部没绑上**。函数写了但没人调。
3. **`drawSeq()` 的临时状态表把 `onlyEdge` 写死成 `false`**（而不是保存原值）⇒ 用户勾「只画棱」后，任何一次重绘都会被静默打回。
4. **`gifPrepOne()` 漏 `await`** ⇒ `blobToBase64()` 返回的是 Promise，被直接赋给 `GIFCH`，`gifChunk()` 对 Promise 调 `.substr` 必崩、`b64len` 是 `undefined`。上一页这里是 `async + await`，本页漏了。

**构建 / 数据层：**

5. `poly_db.py` 缺 `itertools` 导入（`plane_arrangement_points` 会 NameError）。
6. 开普勒-庞索 **GSD 构造错**：一阶星化「延长面边求尖」只能得到 SSD 的 12 点，不是 GSD。先用诊断确认三族半径，再取**最外层** 20 点族。
7. `pick(20, 3)` 断言「族唯一」失败 —— 半径 1.0 与 4.2361(=φ³) 都是 20 点/3 平面，加 `take='outer'` 取最外层。
8. 半径对拍假报 3e-5 偏差：用 `round(r,4)` 当族键把 φ³ 报成 4.2361。改成从点坐标重算半径。
9. **`gi_from_dodeca` 造错立体**：原「取过十二面体某顶点的 3 个面法向作三角形」得到的是**正二十面体本身**（棱长 1.0515 vs 1.7013）。改成「面图距离 2 为棱 + 几何环序星形步长 (a, a+2) 配对」。
10. 大二十面体一度给出 60 个假面（误用「顶点图一级邻」、再误用「连续步长」）。诊断出真邻接 = 面图距离 2。
11. `chord_spectrum` 容差三改：`1e-6` → 拆散立方体；`1e-4` → 劈开 J84/J88 的棱；最终 **相对容差 `1e-3`**。
12. `fingerprint` 不满足「平移无关」（F1 断言失败，偏差 7.7e-1）⇒ 加「先按顶点均值平移到原点」。

**断言本身写错（不是代码错，但值得记）：**

13. 正十二面体的弦被写成 4 组 —— 实为 **5 组**（5-distance set）。
14. 「立方体最远深度有 4 条（体对角线）」错。Hart 的立方体是**沿体对角线摆**的（顶点在 `(0,0,±1)` 方向），沿 z 轴看时体对角线 `0-7` 的中点恰在中心、深度反而居中；最远的 3 条是**从 z 最低顶点出发的棱**（最短档弦长）。这条改成了基于结构的正断言。
15. 「按目录判据找等棱多面体」过严（把卡塔兰 13 个 + 3 个约翰逊算成例外）⇒ 改为「棱长比 < 1.001 的 138 个」。
16. 一度断言「全库 155 个欧拉 χ 均为 2」—— 开普勒-庞索里 SSD/GD 是非凸星形，χ = **−6**；GSD/GI 才是 2。
17. 面平面距谱长度按「面数 12」而不是 20 —— 正十二面体 12 个五边形面且全部到中心等距（有内切球），只有 1 档。
18. 桩元素 `innerHTML = ''` 不会清 `_kids`（桩的 innerHTML 是普通属性），下拉子项数断言要用**增量**；且 `change` handler 内部会调两次 `fillPolySelect`，所以增量是键数的**整数倍**。
19. 桩里 `beginPath` 走的是 `noop` 分支记成 `'noop'`，不记 `'beginPath'`；`createRadialGradient` 只记 `addColorStop`。顺手把共享桩改精确（也回跑了上一页）。

**观感 / 工程：**

20. 弦的冷端色 `COLD=[0.36,0.56,1.00]` 与半透明蓝面几乎同色，被面盖住就融掉了 ⇒ 提亮成青白 `[0.58,0.90,1.00]`。
21. 实拍脚本里「只画棱」场景把 `S.onlyEdge=true` 设完没恢复，**静默污染了后面所有截图**（iso 场景只画出 30 条棱）。每个场景前先 `resetAll()`。
22. 缩略图里足球的 1 770 条弦被「线穿透面」叠成一整块橙红 ⇒ 缩略图强制 `lineTop = false`。

---

## 八、文件清单

### 交付物（nb 原目录 `瑟尔讲解所需nb\`）

```
多面体内反射线DiagonalsOfPolyhedra.html                     251 335 字节  ← 单文件成品
多面体内反射线DiagonalsOfPolyhedra网页版_使用与原理说明.md   本文件
多面体内反射线_动态图归档\
    多面体内反射线_旋转扫描_Cube.gif                        1.09 MB
    多面体内反射线_旋转扫描_Dodecahedron.gif                4.64 MB
    多面体内反射线_旋转扫描_SmallStellatedDodecahedron.gif  2.30 MB
    多面体内反射线_旋转扫描_TruncatedIcosahedron.gif        11.29 MB
```

### 开发目录 `_pk_web_dev\`

```
nb.txt                  nb 原文留档
poly_db.py              多面体数据构建（155 个 + 交叉对拍）
poly_db.log             构建日志（=== 无任何硬性问题 ===）
poly_report.json        构建报告
polydata.js             产物：var POLYDATA = {fams, items}（177 158 字节）
hart_polyhedra.json     Hart 数据源（Stemkoski 转写）
hart_categories.txt     族分类
stemkoski_polyhedra.js  原始 JS 数据
parse_hart.py           数据转写脚本
diag_db.py              构造诊断
ref.py                  Python 黄金参考
ref_test.py             数学自检（62 项）
dump_expect.py          导出黄金值
expect_pk.json          黄金值（82 154 字节）
template.html           页面骨架（含 4 个占位符）
app.js                  应用层（~34 KB，9 分区）
build.py                合成单文件 HTML（4 道防呆）
verify_live.js          CDP 注入黄金值
verify_core.js          页面内逐项对拍（61 项）
_p_reload.js            改完源码后热重载页面
_p_shot.js              实拍
_p_run.js               探针执行器
_p_probe_lines.js       线段数 / 像素探针
pk_stub_test.js         桩测（170 项）
gif_archive.js          GIF 归档
```

### 共用件 `_shared\`（三页共用）

```
mini3d.js           3D 内核（本轮修 drawQuad 的 n 边形质心）
gifcodec.js         GIF89a 编码核
gifdecode.js        自写 GIF 解码器（对拍 / 抽帧用）
gif2png.js          GIF 抽帧成 PNG
domstub.js          手写 DOM 桩（本轮补 createLinearGradient，改精确两个记录）
selftest_mini3d.js  内核自检（37 项）
```

---

## 九、命令速查

```bash
# 数据构建 + 交叉对拍（要带 numpy 的 Python）
"D:\Program Files\Python312\python.exe" _pk_web_dev\poly_db.py

# 数学自检（62 项）
"D:\Program Files\Python312\python.exe" _pk_web_dev\ref_test.py

# 重新导出黄金值（改了 nb 公式才需要）
"D:\Program Files\Python312\python.exe" _pk_web_dev\dump_expect.py

# 构建单文件 HTML
python _pk_web_dev\build.py

# 桩测（170 项，无浏览器）
node _pk_web_dev\pk_stub_test.js

# 3D 内核自检（37 项）
node _shared\selftest_mini3d.js

# 在线对拍（61 项）—— 需要页面已在 9361 端口的调试浏览器里打开
node _pk_web_dev\verify_live.js 9361

# 改完源码后热重载页面
node _pk_web_dev\_p_reload.js 9361 DiagonalsOfPolyhedra

# 实拍
node _pk_web_dev\_p_shot.js 9361

# 归档 GIF
node _pk_web_dev\gif_archive.js 9361 "多面体内反射线_动态图归档"

# GIF 抽帧成 PNG 看
node _shared\gif2png.js "多面体内反射线_动态图归档\多面体内反射线_旋转扫描_Dodecahedron.gif" _frame
```

**起页面**（headless Chrome + CDP）：

```bash
chrome.exe --headless=new --remote-debugging-port=9361 --user-data-dir=<临时目录> about:blank
# 再用 CDP 的 PUT /json/new?<url> 新开标签打开成品 HTML
```

---

## 十、一句话总结

**nb 的全部内容就是「`C(n,2)` 条弦 + 半透明的面」两样东西。**
本页把它做成能在 155 个多面体之间实时切换、任意旋转、导出 GIF 的工作台，并且把「内反射线」这条线索摆到最前面 ——
加了一个默认开启的「线穿透面」开关，让壳内的弦永远看得见；关掉它，就回到和 `Graphics3D` 更接近的真实遮挡。

所有数值都对着 Python 黄金参考逐项核过（61 项在线对拍最大偏差 6.97e-7，正是数据源 6 位小数的量化噪声量级）。
