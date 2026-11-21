# Skyblock Status（Fabric 1.20.1 服务端模组）

把服务器的在线状态与玩家信息上报给自建的 Node 后端，供
`../site` 的「在线状态」面板实时展示。

**服务端专用**（`environment: "server"`），玩家无需安装。

## 安装

1. 把 `build/skyblock-status-0.1.0.jar` 放进服务端的 `mods/` 目录。
2. 确保已装 **fabric-api**（1.20.1 版本）。
3. 启动服务器。首次启动会生成：

   `config/skyblock-status.json`

4. 打开它，至少填写 **`apiKey`**（后端用 `--init-key` 生成的那个），
   必要时改 `backendUrl`。
5. 重启服务器，或执行 `/sbs reload`。

配置没填好之前，模组不会发任何网络请求——服务器完全不受影响。

## 配置

```json
{
  "enabled": true,
  "backendUrl": "http://127.0.0.1:8787",
  "serverId": "default",
  "apiKey": "",
  "serverName": "李芒果空岛生存",
  "heartbeatSeconds": 30,
  "idleHeartbeatSeconds": 120,
  "timeoutSeconds": 8,
  "reportDimension": true,
  "reportPing": true,
  "reportStats": true,
  "reportEvents": true,
  "reportAdvancements": true,
  "advancementScanSeconds": 5
}
```

| 字段 | 说明 |
| --- | --- |
| `enabled` | 总开关 |
| `backendUrl` | Node 后端地址（含协议与端口） |
| `serverId` | 与后端 `--init-key` 时的 id 对应 |
| `apiKey` | 对接密钥，**必填** |
| `serverName` | 网页标题显示的名字 |
| `heartbeatSeconds` | 有人在线时的心跳间隔，5–600 秒 |
| `idleHeartbeatSeconds` | **空载**心跳间隔，5–1800 秒（默认 120）。没人时降频，有人上线立刻恢复常规间隔 |
| `timeoutSeconds` | HTTP 超时，1–60 秒 |
| `reportDimension` / `reportPing` / `reportStats` | 是否上报维度 / 延迟 / 统计 |
| `reportEvents` | 是否上报事件（上线、下线、维度切换、死亡、成就） |
| `reportAdvancements` | 是否上报成就（`reportEvents` 的子开关） |
| `advancementScanSeconds` | 成就扫描间隔，1–60 秒；`0` = 关闭扫描 |

## 事件上报

除了定时心跳，以下动作**立即**触发一次上报，所以网页几乎无延迟。
同一瞬间的多个动作会合并成一次请求，且两次上报之间至少间隔 5 秒
（`MIN_REPORT_GAP_MS`）——再频繁的操作也不会打出更多流量：

| 事件 | 触发时机 | `detail` 内容 |
| --- | --- | --- |
| `join` | 玩家进服 | 所在维度 |
| `leave` | 玩家退服 | 本次在线时长 |
| `dimension` | 跨维度传送 | 目标维度 id |
| `death` | 玩家死亡 | 伤害类型 id（如 `minecraft:fall`） |
| `advancement` | 完成进度 | 进度 id（如 `minecraft:story/mine_diamond`），另带 `frame` 与 `title` |

`detail` 发的是**机器可读的 id**（服务端语言固定英文），前端用
`../site/lang.js` 翻成中文。

## 流量

上报采用「**增量**」方式：只发改动过的玩家字段，只有变化时才发整份快照。

| 场景 | 单次请求 |
| --- | --- |
| 空载心跳 | ~290 B |
| 有人在线，无变化 | ~360 B |
| 有人在线，延迟变动 | ~360 B |
| 有人上线/下线 | ~615 B |
| 带 1–3 条事件 | 540–880 B |

节奏：有人在线 30 秒一次，空载 120 秒一次；另外每 10 次心跳补发一次完整
快照（自愈，防止增量字段被后端误判）。按每天 24 小时空载计算，上行约
**0.2 MB/天**；满员 20 人在线时约 **2 MB/天**。

## 服务器启停语义

- **启动时**：`bootId` 每次启动随机生成，后端发现 `bootId` 变了，就把上一轮
  残留的在线玩家全部标记下线（写一条 `server_restart` 事件），不会出现
  「服务器崩了但网页上还挂着三个人」。
- **正常关闭**：`SERVER_STOPPING` 里先补一次「所有玩家下线 + `stopping: true`」
  的同步上报（3 秒连接超时，失败也只记日志），后端立刻显示离线、时长冻结。
- **异常掉线**：后端按「实际心跳间隔 × 3 + 15 秒」动态判定（空载 120 秒
  间隔时阈值自动放宽到 375 秒），收不到心跳即判定离线，关闭所有 session，
  玩家列表清空、所有在线时长停止累加。

## 命令

均需权限等级 2：

| 命令 | 作用 |
| --- | --- |
| `/sbs status` | 查看上报状态、成功/失败次数、最近错误 |
| `/sbs test` | 立刻上报一次 |
| `/sbs reload` | 重新读取配置文件 |
| `/sbs on` / `/sbs off` | 临时开关 |
| `/sbs key <key>` | 修改 key 并保存 |
| `/sbs url <url>` | 修改后端地址并保存 |
| `/sbs debug <true\|false>` | 是否输出每次上报的日志 |
| `/sbs diag` | 链路诊断：DNS → TCP → HTTPS 三段分别报告 |

## 连不上后端？先跑 `/sbs diag`

```
① DNS ✓ 1 条 (0ms) 203.0.113.10
② TCP ✓ 203.0.113.10:443 (24ms)
③ HTTPS ✓ 200 (82ms)
⇒ 链路通畅。若仍不上报，检查 apiKey 是否正确（/sbs test 看返回）。
```

两种最常见的故障：

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| ② 报 `connect timed out` | 安全组 / 防火墙没放行 443；或机器无法出网 | 放行端口；`ss -lntp \| grep 443` 确认在听 |
| ① 解析到本机 IP | MC 服务端和 nginx 同机，走了公网域名 → NAT 回环 | `backendUrl` 改 `http://127.0.0.1:8787` |

## 设计要点

- **不卡服**：上报走独立守护线程 + `HttpClient.sendAsync`，永不阻塞 tick。
- **玩家加入时间由服务端提供**：后端据此计算「连续在线时长」，后端重启也不归零。
- **失败退避**：连续失败按指数退避（最长 5 分钟），成功后立刻恢复原间隔。
- **后端挂了不影响服务器**：所有异常都被吞掉并记录，只在 `/sbs status` 里体现。
- **玩家进出立刻补报**：不必等下一次心跳，网页上几乎是实时变化。
- **进服瞬间就能看到**：`JOIN` 事件触发时玩家还没进 `getPlayerList()`，所以上报器
  自己维护一份玩家引用表，进服那一帧就能上报（实测网页感知 0.5 秒）。
- **退服不会被「复活」**：`DISCONNECT` 时玩家仍在列表里，上报器用一份
  「已离开」集合把这类玩家过滤掉，避免后端又给他开一个 session。

## 构建

`build.sh` 不依赖 Gradle / Loom / 网络，用本机已缓存的 yarn 映射 jar 做
`javac` → `tiny-remapper`（named → intermediary）→ `jar`：

```bash
./build.sh
# 产物：build/skyblock-status-0.1.0.jar
```

脚本依赖本机已缓存的依赖 jar，其中两个目录可用环境变量覆盖（默认为常见位置）：

| 变量 | 含义 | 默认值 |
| --- | --- | --- |
| `FAPI_DIR` | 已 remap 到 named 的 fabric-api jar 目录 | `~/.gradle/caches/fabric-loom/remapped_working` |
| `LIBS` | gson / authlib / brigadier / slf4j 等依赖 jar 目录 | `~/.local/share/minecraft-libraries` |

```bash
FAPI_DIR=/path/to/fabric-api/libs LIBS=/path/to/libs ./build.sh
```

脚本末尾带**重映射自检**：如果发现 `class_2170.literal` 这类「类名换了、
成员名没换」的坏产物，会直接报错退出（这是 tiny-remapper classpath 必须传
named jar 的经典坑）。

## 依赖

| 依赖 | 版本 |
| --- | --- |
| Minecraft | 1.20.1 |
| Fabric Loader | ≥ 0.15.0 |
| Fabric API | 1.20.1 任意版本 |
| Java | ≥ 17 |
