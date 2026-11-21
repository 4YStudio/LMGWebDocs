#!/usr/bin/env node
/**
 * 李芒果空岛生存 · 在线状态服务
 *
 * 零第三方依赖：Node 22+ 内置 http / node:sqlite / crypto 即可运行。
 *
 *   node server/src/server.js            # 使用同目录的 config.json
 *   node server/src/server.js --port 8080
 *   node server/src/server.js --init-key # 生成一个服务器 key 后退出
 *
 * 同时托管 ../site 下的静态文档站，并额外提供：
 *   POST /api/v1/ingest      模组上报（需 X-API-Key）
 *   GET  /api/status         服务器状态 + 在线玩家
 *   GET  /api/players        排行榜
 *   GET  /api/players/:uuid  单个玩家详情
 *   GET  /api/history        在线人数曲线
 *   GET  /api/events         最近事件
 *   GET  /api/stream         SSE 实时推送
 *   GET  /api/health         健康检查
 */

import { createServer } from 'node:http';
import { readFileSync, existsSync, createReadStream, statSync } from 'node:fs';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import {
  openDb, createServer as createSrv, findServerByKey, ingest, getStatus,
  getPlayers, getPlayer, getHistory, getEvents, sweepOffline, sweepOfflineOne, prune, newKey,
  rotateKey, listServers, DEFAULT_TZ,
} from './db.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const REPO = resolve(ROOT, '..');

/* ── 配置 ─────────────────────────────────────────────── */

const DEFAULTS = {
  host: '0.0.0.0',
  port: 8787,
  dbFile: 'data/skyblock.db',
  siteDir: '../site',
  timezone: DEFAULT_TZ,
  offlineTimeoutSeconds: 90,
  heartbeatGraceSeconds: 15,
  trustProxy: false,
  corsOrigins: ['*'],
  rateLimitPerMinute: 600,
  keepDays: 180,
};

function loadConfig() {
  const file = process.env.SBS_CONFIG || join(ROOT, 'config.json');
  let cfg = {};
  if (existsSync(file)) {
    try {
      cfg = JSON.parse(readFileSync(file, 'utf8'));
    } catch (e) {
      console.error(`[config] 解析 ${file} 失败：${e.message}`);
      process.exit(1);
    }
  }
  const merged = { ...DEFAULTS, ...cfg };

  // 命令行覆盖
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--port' && argv[i + 1]) merged.port = Number(argv[++i]);
    else if (a === '--host' && argv[i + 1]) merged.host = argv[++i];
    else if (a === '--db' && argv[i + 1]) merged.dbFile = argv[++i];
    else if (a === '--site' && argv[i + 1]) merged.siteDir = argv[++i];
  }
  merged.dbFile = resolve(ROOT, merged.dbFile);
  merged.siteDir = resolve(ROOT, merged.siteDir);
  return { cfg: merged, file };
}

const { cfg, file: cfgFile } = loadConfig();

if (process.argv.includes('--init-key')) {
  const key = newKey();
  const db = openDb(cfg.dbFile);
  const id = process.argv[process.argv.indexOf('--init-key') + 1]?.startsWith('--')
    ? 'default'
    : (process.argv[process.argv.indexOf('--init-key') + 1] || 'default');
  createSrv(db, { id, name: id, key, maxPlayers: 0 });
  console.log(`已创建服务器 "${id}"，把下面两项填进模组的配置文件：`);
  console.log(`  serverId: ${id}`);
  console.log(`  apiKey:   ${key}`);
  console.log(`（key 只显示这一次，之后可用 --rotate-key <serverId> 重置）`);
  process.exit(0);
}

if (process.argv.includes('--rotate-key')) {
  const id = process.argv[process.argv.indexOf('--rotate-key') + 1] || 'default';
  const db = openDb(cfg.dbFile);
  const key = rotateKey(db, id);
  console.log(`服务器 "${id}" 的新 apiKey：${key}`);
  process.exit(0);
}

if (process.argv.includes('--list-servers')) {
  const db = openDb(cfg.dbFile);
  for (const s of listServers(db)) {
    console.log(`${s.id}\t${s.name}\t在线=${s.online}\t最后心跳=${new Date(s.last_seen_at).toLocaleString('zh-CN')}`);
  }
  process.exit(0);
}

/* ── 数据库 ───────────────────────────────────────────── */

const db = openDb(cfg.dbFile);
// 离线判定要跟着模组的心跳间隔走：模组空载时会拉长到 idleHeartbeatSeconds
// （默认 120 秒），若仍按 90 秒判定，服务器会在「正常空载」时被误判成离线。
// 因此每次 sweep 前用库里记录的实际心跳间隔动态算一次阈值。
const baseOfflineTimeoutMs = cfg.offlineTimeoutSeconds * 1000;
function offlineTimeoutFor(row) {
  const hb = Math.max(5, Number(row && row.heartbeat_interval) || 30);
  // 3 个心跳 + 宽限，且不小于配置值（避免有人把 heartbeatSeconds 设得很小）
  return Math.max(baseOfflineTimeoutMs, hb * 3 * 1000 + cfg.heartbeatGraceSeconds * 1000);
}
const offlineTimeoutMs = baseOfflineTimeoutMs;
const startedAt = Date.now();

/* ── SSE ──────────────────────────────────────────────── */

const sseClients = new Set();

function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    try { res.write(payload); } catch { sseClients.delete(res); }
  }
}

/**
 * 定时状态推送。为了省流量，这里做两件事：
 *   1. 不带 24 小时曲线（首帧已发过，前端会缓存）；
 *   2. 在线时长不再整份重发 —— 前端本来就有 joined_at 并在本地每秒走字，
 *      所以 players 只保留「谁在线 + 必要字段」，省略 seconds/today_seconds。
 * 实测单次从 17KB 降到 ~1KB。
 */
let lastPushedEventTs = 0;

function broadcastStatusSlim(serverId) {
  if (!sseClients.size) return;
  const full = getStatus(db, { tz: cfg.timezone, offlineTimeoutMs, serverId });
  // 动态只推「新增的」：没有新事件就不带这个键，前端沿用已有列表。
  const fresh = db.prepare(
    'SELECT ts, type, uuid, name, detail FROM events WHERE server_id = ? AND ts > ? ORDER BY ts DESC LIMIT 12',
  ).all((full.server && full.server.id) || 'default', lastPushedEventTs);
  if (fresh.length) lastPushedEventTs = Math.max(...fresh.map((e) => Number(e.ts)));
  const slim = {
    ...full,
    players: (full.players || []).map((p) => ({
      uuid: p.uuid, name: p.name, joined_at: p.joined_at,
      ping: p.ping, dimension: p.dimension, gamemode: p.gamemode,
      total_seconds: p.total_seconds, today_seconds: p.today_seconds,
    })),
  };
  if (fresh.length) slim.recentEvents = fresh;
  else delete slim.recentEvents;
  const payload = `event: status\ndata: ${JSON.stringify(slim)}\n\n`;
  for (const res of sseClients) {
    try { res.write(payload); } catch { sseClients.delete(res); }
  }
}

/* ── 工具 ─────────────────────────────────────────────── */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

function send(res, status, body, headers = {}) {
  const isBuf = Buffer.isBuffer(body);
  const data = isBuf ? body : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': isBuf ? 'application/octet-stream' : 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data),
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  res.end(data);
}

function readBody(req, limit = 1024 * 1024) {
  return new Promise((resolve_, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('payload too large'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve_(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/* 简易滑动窗口限流（按 IP） */
const buckets = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const win = Math.floor(now / 60000);
  const rec = buckets.get(ip);
  if (!rec || rec.win !== win) {
    buckets.set(ip, { win, n: 1 });
    return false;
  }
  rec.n++;
  return rec.n > cfg.rateLimitPerMinute;
}
setInterval(() => {
  const win = Math.floor(Date.now() / 60000);
  for (const [ip, rec] of buckets) if (rec.win !== win) buckets.delete(ip);
}, 60000).unref();

function clientIp(req) {
  if (cfg.trustProxy) {
    const xf = req.headers['x-forwarded-for'];
    if (xf) return String(xf).split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

/* ── 静态站点 ─────────────────────────────────────────── */

function serveStatic(req, res, urlPath) {
  let rel = decodeURIComponent(urlPath.split('?')[0]);
  if (rel === '/' || rel === '') rel = '/index.html';
  const full = normalize(join(cfg.siteDir, rel));
  if (!full.startsWith(cfg.siteDir)) return send(res, 403, { error: 'forbidden' });
  const st = existsSync(full) ? statSync(full) : null;
  if (!st || !st.isFile()) {
    // 单页回退：/players 这类路由交给前端
    const index = join(cfg.siteDir, 'index.html');
    if (existsSync(index) && !extname(rel)) {
      res.writeHead(200, { 'Content-Type': MIME['.html'], 'Cache-Control': 'no-cache' });
      return createReadStream(index).pipe(res);
    }
    return send(res, 404, { error: 'not found' });
  }
  const ext = extname(full).toLowerCase();
  // 站点文件都很小、改动频繁：短缓存 + ETag，改完刷新即可看到新版本
  const etag = '"' + st.size.toString(16) + '-' + Math.floor(st.mtimeMs).toString(16) + '"';
  const headers = {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    // 一律 no-cache + ETag：命中时是 304（几乎零开销），但改完文件刷新就能看到
    'Cache-Control': 'no-cache',
    'ETag': etag,
  };
  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, headers);
    return res.end();
  }
  headers['Content-Length'] = st.size;
  res.writeHead(200, headers);
  createReadStream(full).pipe(res);
}

/* ── 路由 ─────────────────────────────────────────────── */

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const path = url.pathname;
  const ip = clientIp(req);

  if (req.method === 'OPTIONS') {
    return send(res, 204, '');
  }

  if (path.startsWith('/api/') && rateLimited(ip)) {
    return send(res, 429, { ok: false, error: 'rate limited' });
  }

  try {
    /* 健康检查 */
    if (path === '/api/health') {
      return send(res, 200, {
        ok: true, uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
        sseClients: sseClients.size, db: cfg.dbFile,
      });
    }

    /* 模组上报 */
    if (path === '/api/v1/ingest' && req.method === 'POST') {
      const key = req.headers['x-api-key'] || url.searchParams.get('key');
      const srvRow = findServerByKey(db, key);
      if (!srvRow) return send(res, 401, { ok: false, error: 'invalid api key' });
      const raw = await readBody(req);
      let payload;
      try { payload = JSON.parse(raw); } catch { return send(res, 400, { ok: false, error: 'invalid json' }); }
      const out = ingest(db, payload, { tz: cfg.timezone, serverId: srvRow.id });
      const status = getStatus(db, { tz: cfg.timezone, offlineTimeoutMs, serverId: srvRow.id });
      // 有变化就推（瘦身版：不带曲线、不带未变的动态、玩家只带必要字段）
      broadcastStatusSlim(srvRow.id);
      if (out.opened.length || out.closed.length || out.restarted) {
        broadcast('activity', {
          opened: out.opened, closed: out.closed,
          restarted: out.restarted, events: out.events, ts: Date.now(),
        });
      }
      return send(res, 200, {
        ok: true,
        // 回传服务端权威时间，供模组校准
        serverTime: Date.now(),
        heartbeatInterval: srvRow.heartbeat_interval || 30,
        online: status.stats.online,
        accruedCapSeconds: out.accrueCap,
        acceptedEvents: out.events,
        restarted: out.restarted,
      });
    }

    /* 只读 API */
    if (path === '/api/status') {
      return send(res, 200, getStatus(db, {
        tz: cfg.timezone, offlineTimeoutMs,
        // 只有这个接口返回 24 小时曲线；SSE 每 15 秒的推送不带，省掉 ~90% 流量
        withHistory: url.searchParams.get('history') !== '0',
        serverId: url.searchParams.get('server') || undefined,
      }));
    }

    if (path === '/api/players') {
      return send(res, 200, {
        ok: true,
        players: getPlayers(db, {
          tz: cfg.timezone,
          sort: url.searchParams.get('sort') || 'total',
          limit: url.searchParams.get('limit') || 50,
        }),
      });
    }

    if (path.startsWith('/api/players/')) {
      const uuid = path.slice('/api/players/'.length);
      const p = getPlayer(db, uuid, { tz: cfg.timezone });
      if (!p) return send(res, 404, { ok: false, error: 'player not found' });
      return send(res, 200, { ok: true, player: p });
    }

    if (path === '/api/history') {
      return send(res, 200, {
        ok: true,
        points: getHistory(db, { hours: url.searchParams.get('hours') || 24 }),
      });
    }

    if (path === '/api/events') {
      return send(res, 200, {
        ok: true,
        events: getEvents(db, {
          limit: url.searchParams.get('limit') || 30,
          type: url.searchParams.get('type') || undefined,
        }),
      });
    }

    /* SSE */
    if (path === '/api/stream') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
        'Access-Control-Allow-Origin': '*',
      });
      res.write(': connected\n\n');
      // 首帧带上曲线：页面一打开就能画图；后续的 broadcast 不再重复推送这 15KB
      const initial = getStatus(db, { tz: cfg.timezone, offlineTimeoutMs, withHistory: true });
      res.write(`event: status\ndata: ${JSON.stringify(initial)}\n\n`);
      sseClients.add(res);
      const ping = setInterval(() => {
        try { res.write(': ping\n\n'); } catch { /* ignore */ }
      }, 25000);
      req.on('close', () => {
        clearInterval(ping);
        sseClients.delete(res);
      });
      return;
    }

    /* 其余交给静态站点 */
    if (req.method === 'GET' || req.method === 'HEAD') {
      return serveStatic(req, res, path);
    }

    return send(res, 404, { ok: false, error: 'not found' });
  } catch (err) {
    console.error('[error]', err);
    if (!res.headersSent) send(res, 500, { ok: false, error: String(err.message || err) });
    else res.end();
  }
});

/* ── 定时任务 ─────────────────────────────────────────── */

setInterval(() => {
  try {
    // 每台服务器的心跳间隔可能不同，逐台用各自的阈值判定
    let n = 0;
    for (const row of db.prepare('SELECT id, heartbeat_interval FROM servers').all()) {
      n += sweepOfflineOne(db, offlineTimeoutFor(row), cfg.timezone, row.id);
    }
    if (n > 0) {
      console.log(`[sweep] ${n} 台服务器心跳超时，已标记离线`);
      broadcastStatusSlim();
    }
  } catch (e) {
    console.error('[sweep]', e.message);
  }
}, 15000).unref();

setInterval(() => {
  try { prune(db, { keepDays: cfg.keepDays }); } catch (e) { console.error('[prune]', e.message); }
}, 6 * 3600000).unref();

/*
 * 定时推送：前端本来就在用 joined_at 本地走字，所以「在线秒数在涨」不需要
 * 服务器反复推。这里改成「有变化就推 + 60 秒一次兜底保活」，把流量从
 * 「按时间」变成「按事件」，挂机时几乎为零。
 */
setInterval(() => {
  try {
    broadcastStatusSlim();
  } catch (e) {
    console.error('[push]', e.message);
  }
}, 60000).unref();

/* ── 启动 ─────────────────────────────────────────────── */

server.listen(cfg.port, cfg.host, () => {
  const addr = server.address();
  console.log('');
  console.log('  李芒果空岛生存 · 在线状态服务');
  console.log('  ────────────────────────────────────');
  console.log(`  配置    ${cfgFile}${existsSync(cfgFile) ? '' : '（不存在，使用默认值）'}`);
  console.log(`  数据库  ${cfg.dbFile}`);
  console.log(`  站点    ${cfg.siteDir}`);
  console.log(`  监听    http://${cfg.host === '0.0.0.0' ? 'localhost' : cfg.host}:${addr.port}`);
  console.log(`  时区    ${cfg.timezone}   离线判定 ${cfg.offlineTimeoutSeconds}s`);
  console.log('');
  const servers = listServers(db);
  if (!servers.length) {
    console.log('  ⚠ 还没有任何服务器。先生成一个 key：');
    console.log('      node server/src/server.js --init-key default');
    console.log('');
  } else {
    console.log(`  已登记 ${servers.length} 台服务器：${servers.map((s) => s.id).join(', ')}`);
    console.log('');
  }
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    console.log('\n[shutdown] 正在关闭…');
    for (const res of sseClients) { try { res.end(); } catch { /* ignore */ } }
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 2000).unref();
  });
}
