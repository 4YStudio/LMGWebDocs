# 玩家在线状态后端

Node.js + SQLite 的轻量后端，接收 Fabric 服务端模组上报的玩家信息，给
`site/` 的「在线状态」面板提供数据。

**零第三方依赖**：只用 Node 内置的 `node:http`、`node:sqlite`、`node:crypto`。
不需要 `npm install`。

## 环境要求

- Node.js **22.5+**（`node:sqlite` 内置模块；实测 24.22.1）
- 无其他依赖

## 快速开始

```bash
cd server

# 1. 生成一个对接 key（只显示一次，请立即复制）
node src/server.js --init-key default

# 2. 启动服务（默认 0.0.0.0:8787）
node src/server.js
```

打开 <http://localhost:8787/> 就能看到文档站与「在线状态」面板。

第一次启动会在 `server/config.json` 写入默认配置，可按需修改：

| 字段 | 默认 | 说明 |
| --- | --- | --- |
| `host` | `0.0.0.0` | 监听地址 |
| `port` | `8787` | 监听端口 |
| `dbFile` | `data/skyblock.db` | SQLite 文件（相对 `server/`） |
| `siteDir` | `../site` | 静态站点目录 |
| `timezone` | `Asia/Shanghai` | 「今日」的划分时区 |
| `offlineTimeoutSeconds` | `90` | 心跳超时，超时判定服务器离线 |
| `heartbeatGraceSeconds` | `15` | 心跳容差 |
| `corsOrigins` | `["*"]` | 允许的跨域来源 |
| `rateLimitPerMinute` | `600` | 单 IP 每分钟请求上限 |
| `keepDays` | `180` | 明细数据保留天数 |

命令行可覆盖：`--port`、`--host`、`--db`、`--site`。

## 常用命令

```bash
node src/server.js --init-key [serverId]   # 新建服务器并打印 key
node src/server.js --rotate-key <id>       # 轮换 key（旧 key 立即失效）
node src/server.js --list-servers          # 列出已注册服务器
```

## HTTP 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/v1/ingest` | 模组上报入口，需 `X-API-Key` 头 |
| GET | `/api/status` | 汇总状态（面板主数据） |
| GET | `/api/players?sort=&limit=` | 玩家排行（`total`/`today`/`streak`/`longest`/`recent`/`sessions`） |
| GET | `/api/players/:uuid` | 单个玩家详情（含最近 30 天与最近会话） |
| GET | `/api/history?hours=` | 在线人数曲线（5 分钟一桶） |
| GET | `/api/events?limit=` | 最近上下线等事件 |
| GET | `/api/stream` | SSE 实时推送（`status` + `activity`） |
| GET | `/api/health` | 健康检查 |

### 上报示例

```bash
curl -X POST http://localhost:8787/api/v1/ingest \
  -H 'Content-Type: application/json' \
  -H 'X-API-Key: sk_xxxxxxxx' \
  -d '{
    "server": {
      "id": "default", "name": "李芒果空岛生存", "version": "1.20.1",
      "modVersion": "0.1.0", "max": 20, "online": 1, "tps": 20,
      "startedAt": 1731000000000, "uptimeSeconds": 3600, "heartbeatInterval": 30
    },
    "players": [
      { "uuid": "…", "name": "Steve", "joinedAt": 1731000123000,
        "dimension": "minecraft:overworld", "ping": 42, "gamemode": "survival" }
    ]
  }'
```

响应：`{ ok, serverTime, heartbeatInterval, online, accruedCapSeconds }`。

## 数据模型

- **`sessions` 是时长真相源**：一次在线 = 一条 session。时长由后端用服务端时钟
  差值计算，不受客户端时钟漂移影响。
- 增量上限 `capSeconds = max(120, heartbeatInterval × 4)`：服务器宕机后恢复，
  不会把停机时间一次性算进在线时长。
- 心跳超过 `offlineTimeoutSeconds` 未更新 → 自动关闭未闭合 session、标记离线、
  写 `server_offline` 事件。
- 表：`servers` / `players` / `sessions` / `daily` / `server_daily` / `samples`
  / `events` / `meta`。开启 WAL，读写不互相阻塞。

## 备份

```bash
node -e "
const {DatabaseSync}=require('node:sqlite');
new DatabaseSync('data/skyblock.db').exec(\"VACUUM INTO 'backup.db'\");
"
```

## 目录

```
server/
├── src/db.js        # 数据层：建表、迁移、聚合查询
├── src/server.js    # HTTP 服务：路由、静态托管、SSE、限流
├── config.json      # 首次启动自动生成
└── data/skyblock.db # SQLite 数据（首次启动自动创建）
```
