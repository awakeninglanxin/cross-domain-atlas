# 36小时制历法 · 人类出路科技次第 · 使用说明

## 项目简介

这是一个自包含的单页网页项目，展示**新的宇宙运律运行体系**——以 36 小时制历法为入口，串联量子进制进化（010→012→015）、科技次第花开（7 阶段人类文明升级路径）、四愿景展开（恢复中华文化 / 平衡种族利益 / 推进人类文明 / 实现世界大同）的完整文明蓝图。

## 如何打开

直接双击 `index.html` 即可在任何现代浏览器中打开，无需服务器。

## 页面导航

| 板块 | 内容 |
|------|------|
| 🌌 顶部浮窗 | 北京时间 + 36h 实时时钟 + 主题切换 + ☰ 目录 |
| ⏱ 时钟面板 | 36 小时制（每时 90 分/每分 90 秒）+ 18 小时制 |
| 🐭 白阳盘 | 18 生肖 + 文明主线弧线 |
| 📡 量子进制 | 010→012→015 进化 + 相位调制 + 几何探测器 |
| 🌿 科技次第 | 7 阶段可折叠卡片（教育→H₄O→GDV→飞碟→功德分→意识科技→能量打印） |
| 🌐 终极愿景 | 四愿景可展开面板（含 PKS 千禧难题子页面链接） |
| 📜 白阳法盘 | 三期白阳法盘经偈 |

## 功能说明

### 主题切换
顶部右侧 4 个圆形色块按钮：深空暗色 / 清净光明 / 古卷暖褐 / 青峦墨绿。偏好自动保存。

### 阶段折叠
每个阶段标题右侧 ▾ 点击折叠/展开，状态持久化到 localStorage。

### TOC 目录
浮窗左侧 ☰ 按钮 → 弹出目录面板 → 点击跳转各板块。

### 时钟校准
页面加载时自动从 worldtimeapi.org 联网校准北京时间，失败回退系统时间。

## 文件结构

```
06_36小时制历法/
├── index.html          # 主页面
├── pks-subpage.html    # PKS 千禧难题统一解子页面（6标签页）
├── eeqt_chaosgame.html # EEQT 量子分形模拟器
├── css/index.css       # 样式表
├── js/
│   ├── js.js           # 时钟 + Vue + 主题 + 折叠逻辑
│   └── vue.min.js      # Vue.js 2.x
├── img/                # 所有图片资源（50+）
└── *.md                # 本说明 + 迭代历程
```

## 子页面入口

- **PKS 千禧难题统一解：** 点击四愿景「推进人类文明」面板中的 📄 链接，或文明主线弧线栏的 PKS 子页按钮
- **EEQT 分形演示：** 量子进制板块「几何体顶点」卡片底部的 🔮 按钮
- **素数基准图：** 量子板块底部链接
- **昴宿星 OCR 文本：** 推进人类文明面板中的 📄 链接

## 依赖

- Vue.js 2.x（本地 `js/vue.min.js`）
- 零外部 API 依赖（时钟联网校准可选）
- 纯静态文件，无需 Node.js/npm

---

> ⚠️ **重要声明 / Important Disclaimer**
> 
> 本文档由 AI 辅助生成，部分结论可能存在 AI 幻觉导致的论证不严谨之处。
> 文中提出的数学、物理及相关跨学科观点，需要经过专业数学家、物理学家
> 及相关领域专家共同验证与检验。
> 如有疏漏、错误或不同见解，敬请指正，不胜感激。
> 
> **This document was AI-assisted. Some conclusions may contain inaccuracies
> due to AI hallucination. All mathematical, physical, and interdisciplinary
> claims require verification by professional mathematicians, physicists,
> and subject-matter experts. Corrections and feedback are warmly welcomed.**
