# 李芒果空岛生存 · Fabric 1.20.1 文档站

纯静态站点，零依赖、可离线。直接双击 `index.html` 即可在浏览器中打开（无需服务器、无需联网）。

## 文件结构

```
site/
├── index.html    页面骨架（13 个区块 + 侧栏导航）
├── styles.css    全部样式（深色玻璃拟态 / 响应式 / 动效）
├── data.js       全部文档内容（数据与结构分离，改内容只动这里）
├── app.js        渲染与交互逻辑
├── status.js     在线状态面板（需要后端，缺失时自动降级）
├── lang.js       原版进度 / 伤害类型的中文对照表
├── config.js     在线状态面板连哪个后端（留空 = 同源）
├── assets/
│   ├── *.png     9 张截图（来自上游仓库的 docs/screenshots）
│   ├── icon/     你下载的原始图标素材（png + webp，128–300px，保留备查）
│   └── items/    统一处理后的 64×64 透明 PNG（配方网格实际引用这里）
└── README.md
```

## 两种打开方式

| 方式 | 效果 |
| --- | --- |
| 双击 `index.html`（`file://`） | 文档全部可读；「在线状态」显示「尚未连接」 |
| `node ../server/src/server.js` 后访问 <http://localhost:8787/> | 文档 + 实时在线状态 |

在线状态面板的数据来自同源后端，`file://` 下没有后端所以自动降级，不会报错。

如果后端不在同一个域名下（比如站点放静态托管、后端在另一台机器），
编辑 `config.js`：

```js
window.SKYBLOCK_STATUS = { api: 'https://your-backend.example.com' };
```

留空则使用同源地址。后端已开 `Access-Control-Allow-Origin: *`，跨域直接可用。

## 内容来源

- 原文档：上游 `CarpetSkyAdditions/docs/zh_cn`（内容已整理进 `data.js`）
- 规则设置、进度与挑战、配方、配置项：从上游 tag `v1.20.1-4.4.2` 的源码与数据包中提取
- 站点覆盖：25 条模组特性、17 条数据包特性、26 条配方、100 个进度与挑战、33 条 Carpet 规则、4 项配置、4 条 SkyIsland 命令（另补 2 条常用命令）

## 修改指南

| 想改什么 | 改哪里 |
| --- | --- |
| 文字内容、命令、表格 | `data.js` |
| 区块顺序、标题、导航项 | `index.html` |
| 颜色、间距、动效、断点 | `styles.css` 顶部的 CSS 变量与各断点 |
| 渲染逻辑、搜索、筛选 | `app.js` 中对应的 `render*` / `setup*` 函数 |
| 在线状态面板 | `status.js`；后端地址在 `config.js` |
| 事件里的中文名（进度 / 死因） | `lang.js` |
| 配方图标 | 换图直接覆盖 `assets/items/` 同名文件；新增物品改 `data.js` 的 `DATA.itemIcons` |
| 在线曲线 | `status.js` 的 `smoothPath()`（Catmull-Rom 平滑）+ `setupChartHover()`（悬停十字线与气泡，数据来自 `/api/status` 的 `samples[].names`） |
| 配方渲染 | `app.js` 的 `craftGrid()`（有序合成 3×3）、`blastingHtml()`（高炉）、`shapelessHtml()`（无序）；鼠标悬浮格子显示 MC 风格物品提示 |

改完 `data.js` / `app.js` 后建议执行 `node --check data.js && node --check app.js` 校验语法。

## 交互说明

- 侧栏导航随滚动高亮，移动端收进汉堡菜单
- 特性 / 配方 / 进度 / 规则均支持搜索与分类筛选
- 特性卡只显示「标题 + 标签 + 一句概要」，点「查看详情」弹出对话框，内含「能做什么 / 怎么用」、原文细节、合成过程图、为什么这样设计、关闭指令（`#useModal`，支持背景 / × / Esc 关闭）
- 命令、规则名、数据包文件路径点击即复制
- 截图点击放大（灯箱），支持 Esc 关闭
- 在线状态面板：SSE 实时推送（后端不可用时自动退化为 20 秒轮询）
- 在线玩家卡片可点击展开详情（14 天活跃柱状图 + 最近会话）
- 尊重系统「减少动态效果」设置（`prefers-reduced-motion`）
