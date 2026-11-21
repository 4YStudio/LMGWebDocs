# 空岛生存文档站 + 在线状态系统

围绕 [Carpet Sky Additions](https://github.com/jsorrell/CarpetSkyAdditions)（Fabric 1.20.1 空岛模组）
构建的一套完整方案：**中文文档站** + **玩家在线状态面板** + **服务端上报模组**。

全部零第三方依赖，可离线运行。

```
┌──────────────┐   HTTP    ┌──────────────┐   SSE   ┌──────────────┐
│ skyblock-    │ ────────► │ server.js    │ ──────► │ site/        │
│ status 模组  │  心跳上报  │ node:sqlite  │ 实时推送 │ 在线状态面板  │
└──────────────┘           └──────────────┘         └──────────────┘
```

## 目录结构

```
.
├── site/       纯静态文档站 + 在线状态面板（零依赖，可离线打开）
├── server/     Node.js + SQLite 后端（仅用 Node 内置模块）
├── mod/        Fabric 1.20.1 服务端模组（上报玩家信息）
├── img/        原始截图
├── STATUS-SYSTEM.md   架构与设计说明（中文详版）
└── ASSETS-ICONS.md    配方图标素材清单
```

## 功能特性

### 文档站（`site/`）

- **13 个区块**：安装、世界生成、模组特性、数据包特性、配方速查、进度与挑战、命令、规则设置、流程指南、图集、致谢
- **纯静态**：双击 `index.html` 即可打开，无需服务器、无需联网
- 深色玻璃拟态风格、响应式布局、滚动高亮侧栏、移动端汉堡菜单
- 全文搜索与分类筛选（特性 / 配方 / 进度 / 规则）
- 特性详情弹窗、截图灯箱、命令与路径点击即复制
- 配方 3×3 网格渲染（有序合成 / 高炉 / 无序），悬浮显示 MC 风格物品提示
- 尊重系统「减少动态效果」设置（`prefers-reduced-motion`）

### 在线状态面板

- 在线人数 / 上限、TPS、版本、最后心跳
- 今日累计在线、今日活跃玩家、历史累计、24 小时在线率
- 当前在线玩家列表（维度、模式、延迟、连续在线时长本地走字）
- 24 小时在线人数曲线（5 分钟一桶，Catmull-Rom 平滑 + 悬停气泡）
- 最近动态：上线 / 下线 / 维度切换 / 死亡 / 完成成就 / 重启 / 离线
- 榜单：今日在线榜、历史累计榜
- 玩家详情：本次 / 今日 / 累计 / 最长单次 / 上线次数 / 连续天数、14 天柱状图、最近会话
- **SSE 实时推送**，后端不可用时自动退化为 20 秒轮询，`file://` 下显示「尚未连接」而不报错

### 后端（`server/`）

- 零第三方依赖：只用 `node:http`、`node:sqlite`、`node:crypto`
- 同时托管 `site/` 静态站点，一个进程搞定
- 增量上报 + 服务端权威时钟，时长不受客户端时钟漂移影响
- 心跳超时自动判定离线、关闭 session、冻结时长
- 限流、CORS、WAL、按天聚合、180 天明细保留

### 模组（`mod/`）

- 服务端专用（`environment: "server"`），玩家无需安装
- 异步上报，独立守护线程，永不阻塞 tick
- 事件驱动：进服 / 退服 / 跨维度 / 死亡 / 完成进度立即上报（网页感知 0.5 秒）
- 增量上报，空载心跳自动降频，失败指数退避
- `/sbs diag` 链路诊断：DNS → TCP → HTTPS 三段分别报告

## 快速开始

### 1. 只看文档

双击 `site/index.html`。

### 2. 文档 + 在线状态

需要 **Node.js 22.5+**（用到内置 `node:sqlite`）。**不需要 `npm install`。**

```bash
cd server
node src/server.js --init-key default   # 生成对接 key，只显示一次，请立即保存
node src/server.js                      # 启动，默认 0.0.0.0:8787
```

打开 <http://localhost:8787/> 即可看到文档站与在线状态面板。

配置在首次启动时自动生成于 `server/config.json`，可修改监听地址、端口、时区、
离线判定阈值、CORS、限流、数据保留天数等。命令行可覆盖：`--port`、`--host`、`--db`、`--site`。

其他命令：

```bash
node src/server.js --rotate-key <id>    # 轮换 key（旧 key 立即失效）
node src/server.js --list-servers       # 列出已注册服务器
```

### 3. 安装服务端模组

1. 构建：`cd mod && ./build.sh`（离线构建，产物 `mod/build/skyblock-status-0.1.0.jar`）
2. 把 jar 放进服务端 `mods/`，确保已装 **fabric-api**（1.20.1）
3. 启动服务器，编辑生成的 `config/skyblock-status.json`，填入 `apiKey`（第 2 步生成的）
4. 重启服务器或执行 `/sbs reload`

配置未填好之前模组不会发任何网络请求，服务器完全不受影响。

### 4. 前端连哪个后端

编辑 `site/config.js` 一行即可：

```js
window.SKYBLOCK_STATUS = {
  api: '',   // 留空 = 用当前页面同源地址（后端托管 site/ 时）
};
```

| 场景 | `api` 填什么 |
| --- | --- |
| 后端托管 `site/`（访问 `http://localhost:8787`） | `''`（留空） |
| 双击 `index.html` 本地看，后端在本机 | `'http://localhost:8787'` |
| 后端在公网服务器 | `'https://your-backend.example.com'` |

跨域已放开（`Access-Control-Allow-Origin: *`），站点放在任何静态托管上都能连。

## HTTP 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/v1/ingest` | 模组上报入口，需 `X-API-Key` 头 |
| GET | `/api/status` | 汇总状态（面板主数据） |
| GET | `/api/players?sort=&limit=` | 玩家排行 |
| GET | `/api/players/:uuid` | 单个玩家详情 |
| GET | `/api/history?hours=` | 在线人数曲线 |
| GET | `/api/events?limit=` | 最近上下线等事件 |
| GET | `/api/stream` | SSE 实时推送 |
| GET | `/api/health` | 健康检查 |

## 安全与隐私

- **密钥不入库明文**：后端只保存 API key 的 SHA-256 哈希
- **数据不入仓库**：`server/data/`、`server/config.json`、模组生成的配置均在 `.gitignore` 中
- 后端默认开启限流（单 IP 600 次/分钟）与 CORS 白名单（可配置）
- 模组只在配置了 `apiKey` 后才联网，所有网络异常都被吞掉，不影响服务器

## 文档

- [`STATUS-SYSTEM.md`](STATUS-SYSTEM.md) —— 架构、设计要点、面板说明（中文详版）
- [`site/README.md`](site/README.md) —— 站点结构、修改指南、交互说明
- [`server/README.md`](server/README.md) —— 接口、配置、数据模型、备份
- [`mod/README.md`](mod/README.md) —— 安装、配置项、命令、构建说明
- [`ASSETS-ICONS.md`](ASSETS-ICONS.md) —— 配方图标素材规格与来源

## 致谢

- [CarpetSkyAdditions](https://github.com/jsorrell/CarpetSkyAdditions) —— 空岛模组本体
- [fabric-carpet](https://github.com/gnembon/fabric-carpet) —— Carpet 模组框架
- [skyrising/skyblock](https://github.com/skyrising/skyblock) —— 最初的空岛生成思路
- 文档内容整理自上游仓库 `docs/zh_cn`，图标素材来自 [Minecraft Wiki](https://zh.minecraft.wiki/)

## 许可

本项目代码以 [MIT License](LICENSE) 发布。
文档内容与图标素材版权归各自原作者所有，遵循其原始许可。
