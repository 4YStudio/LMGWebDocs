/**
 * 数据层：SQLite（node:sqlite，零第三方依赖）
 *
 * 设计要点
 * ─────────────────────────────────────────────────────────
 * 1. sessions 表是「真相源」：一次在线 = 一条 session，joined_at 由服务端上报，
 *    seconds 由后端用「服务端时钟差值」计算，不受客户端掉线/时钟漂移影响。
 * 2. daily / players.total_seconds 用「增量累加」维护：每次 ingest 只累加
 *    (now - last_seen_at) 的增量，并设上限防止服务器宕机后一次性灌入巨量时长。
 * 3. 服务器超过 offlineTimeout 没有心跳 → 视为离线，并关闭所有未闭合 session，
 *    避免「连续在线时长」无限增长。
 * 4. 所有写入都在事务里，避免半更新状态。
 */

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';

export const DEFAULT_TZ = 'Asia/Shanghai';

/* ── 工具 ─────────────────────────────────────────────── */

export function hashKey(key) {
  return createHash('sha256').update(String(key)).digest('hex');
}

export function newKey() {
  return 'sk_' + randomBytes(24).toString('base64url');
}

const dayFmtCache = new Map();
function dayFormatter(tz) {
  let f = dayFmtCache.get(tz);
  if (!f) {
    try {
      f = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      });
    } catch {
      f = new Intl.DateTimeFormat('en-CA', {
        timeZone: DEFAULT_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
      });
    }
    dayFmtCache.set(tz, f);
  }
  return f;
}

/** 时间戳 → 'YYYY-MM-DD'（按配置时区） */
export function dayKey(ts, tz = DEFAULT_TZ) {
  return dayFormatter(tz).format(new Date(ts));
}

export function prevDayKey(ts, tz = DEFAULT_TZ) {
  return dayKey(ts - 86400000, tz);
}

/* ── 打开 / 迁移 ──────────────────────────────────────── */

export function openDb(path) {
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA synchronous = NORMAL');
  db.exec('PRAGMA foreign_keys = ON');
  migrate(db);
  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS servers (
      id             TEXT PRIMARY KEY,
      name           TEXT NOT NULL DEFAULT '',
      motd           TEXT NOT NULL DEFAULT '',
      version        TEXT NOT NULL DEFAULT '',
      mod_version    TEXT NOT NULL DEFAULT '',
      key_hash       TEXT NOT NULL,
      max_players    INTEGER NOT NULL DEFAULT 0,
      created_at     INTEGER NOT NULL,
      last_seen_at   INTEGER NOT NULL DEFAULT 0,
      online         INTEGER NOT NULL DEFAULT 0,
      tps            REAL,
      started_at     INTEGER,
      uptime_seconds INTEGER NOT NULL DEFAULT 0,
      heartbeat_interval INTEGER NOT NULL DEFAULT 30
    );

    CREATE TABLE IF NOT EXISTS players (
      uuid            TEXT PRIMARY KEY,
      name            TEXT NOT NULL DEFAULT '',
      first_seen_at   INTEGER NOT NULL,
      last_seen_at    INTEGER NOT NULL,
      last_join_at    INTEGER,
      total_seconds   INTEGER NOT NULL DEFAULT 0,
      sessions        INTEGER NOT NULL DEFAULT 0,
      longest_session INTEGER NOT NULL DEFAULT 0,
      streak_days     INTEGER NOT NULL DEFAULT 0,
      last_day        TEXT,
      deaths          INTEGER NOT NULL DEFAULT 0,
      play_time_ticks INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id     TEXT NOT NULL,
      uuid          TEXT NOT NULL,
      name          TEXT NOT NULL DEFAULT '',
      joined_at     INTEGER NOT NULL,
      last_seen_at  INTEGER NOT NULL,
      left_at       INTEGER,
      seconds       INTEGER NOT NULL DEFAULT 0,
      closed        INTEGER NOT NULL DEFAULT 0,
      dimension     TEXT,
      gamemode      TEXT,
      ping          INTEGER
    );
    CREATE UNIQUE INDEX IF NOT EXISTS ux_sessions_open
      ON sessions(uuid) WHERE closed = 0;
    CREATE INDEX IF NOT EXISTS ix_sessions_uuid ON sessions(uuid, joined_at DESC);

    CREATE TABLE IF NOT EXISTS daily (
      uuid     TEXT NOT NULL,
      day      TEXT NOT NULL,
      seconds  INTEGER NOT NULL DEFAULT 0,
      sessions INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (uuid, day)
    );
    CREATE INDEX IF NOT EXISTS ix_daily_day ON daily(day);

    CREATE TABLE IF NOT EXISTS server_daily (
      server_id      TEXT NOT NULL,
      day            TEXT NOT NULL,
      peak_online    INTEGER NOT NULL DEFAULT 0,
      uptime_seconds INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (server_id, day)
    );

    CREATE TABLE IF NOT EXISTS samples (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id TEXT NOT NULL,
      ts        INTEGER NOT NULL,
      online    INTEGER NOT NULL,
      max       INTEGER NOT NULL DEFAULT 0,
      tps       REAL
    );
    CREATE INDEX IF NOT EXISTS ix_samples_ts ON samples(ts);

    CREATE TABLE IF NOT EXISTS events (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      ts        INTEGER NOT NULL,
      server_id TEXT NOT NULL,
      type      TEXT NOT NULL,
      uuid      TEXT,
      name      TEXT,
      detail    TEXT
    );
    CREATE INDEX IF NOT EXISTS ix_events_ts ON events(ts DESC);

    CREATE TABLE IF NOT EXISTS meta (
      k TEXT PRIMARY KEY,
      v TEXT
    );
  `);

  // 老库补列：boot_id 用于识别「服务端重启」，last_event_at 记录最后一次事件上报
  ensureColumn(db, 'servers', 'boot_id', 'TEXT');
  ensureColumn(db, 'servers', 'last_event_at', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn(db, 'servers', 'stopped_at', 'INTEGER');
}

/** 给已存在的表补列（SQLite 没有 ADD COLUMN IF NOT EXISTS）。 */
function ensureColumn(db, table, column, decl) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (cols.some((c) => c.name === column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${decl}`);
}

/* ── 服务器行 ─────────────────────────────────────────── */

export function createServer(db, { id, name, key, maxPlayers = 0 }) {
  const now = Date.now();
  db.prepare(`
    INSERT INTO servers (id, name, key_hash, created_at, max_players)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, key_hash = excluded.key_hash
  `).run(id, name || id, hashKey(key), now, maxPlayers);
  return { id, name: name || id, key };
}

export function findServerByKey(db, key) {
  if (!key) return null;
  return db.prepare('SELECT * FROM servers WHERE key_hash = ?').get(hashKey(key)) || null;
}

export function listServers(db) {
  return db.prepare('SELECT * FROM servers ORDER BY created_at').all();
}

export function rotateKey(db, id, key = newKey()) {
  db.prepare('UPDATE servers SET key_hash = ? WHERE id = ?').run(hashKey(key), id);
  return key;
}

/* ── 事件 / 采样 ──────────────────────────────────────── */

function addEvent(db, ts, serverId, type, uuid, name, detail) {
  db.prepare(`
    INSERT INTO events (ts, server_id, type, uuid, name, detail) VALUES (?, ?, ?, ?, ?, ?)
  `).run(ts, serverId, type, uuid || null, name || null, detail || null);
}

const SAMPLE_MIN_GAP_MS = 5 * 60 * 1000;

/**
 * 写一条采样。在线人数没变化、且距上一条不足 5 分钟时直接跳过 ——
 * 曲线本来就是 5 分钟粒度，没必要每 30 秒存一行（一天省下 2600 行）。
 * 人数一变立刻写，保证曲线拐点不丢。
 */
function addSample(db, serverId, ts, online, max, tps) {
  const last = db.prepare(
    'SELECT ts, online FROM samples WHERE server_id = ? ORDER BY ts DESC LIMIT 1',
  ).get(serverId);
  if (last && Number(last.online) === Number(online) && ts - Number(last.ts) < SAMPLE_MIN_GAP_MS) {
    return false;
  }
  db.prepare(`
    INSERT INTO samples (server_id, ts, online, max, tps) VALUES (?, ?, ?, ?, ?)
  `).run(serverId, ts, online, max, tps ?? null);
  return true;
}

/* ── 核心：一次上报的收敛 ─────────────────────────────── */

const MIN_CAP_SECONDS = 120;

/**
 * @param db
 * @param {object} payload 模组上报体
 * @param {object} opts { tz, serverId }
 */
export function ingest(db, payload, opts = {}) {
  const tz = opts.tz || DEFAULT_TZ;
  const now = Date.now();
  const srv = payload.server || {};
  const serverId = opts.serverId || srv.id || 'default';
  const players = Array.isArray(payload.players) ? payload.players : [];
  const interval = Math.max(5, Number(srv.heartbeatInterval) || 30);
  // 单次可累加的增量上限：心跳间隔的 4 倍（最小 120s），防宕机后灌入巨量时长
  const capSeconds = Math.max(MIN_CAP_SECONDS, interval * 4);

  const result = { opened: [], closed: [], updated: [], accrueCap: capSeconds, restarted: false, events: 0 };

  db.exec('BEGIN IMMEDIATE');
  try {
    /* 1. 服务器元信息 */
    const prev = db.prepare('SELECT * FROM servers WHERE id = ?').get(serverId);
    const maxPlayers = Number(srv.max) || prev?.max_players || 0;

    // bootId 变了 = 服务端重启过。上一次可能没来得及上报「下线」，
    // 这里把所有还开着的 session 全部关掉，避免出现幽灵在线玩家。
    const bootId = srv.bootId ? String(srv.bootId) : null;
    if (bootId && prev && prev.boot_id && prev.boot_id !== bootId) {
      const closedNow = markAllOffline(db, serverId, tz, '服务端重启');
      result.closed.push(...closedNow);
      result.restarted = true;
      addEvent(db, now, serverId, 'server_restart', null, null, '服务端已重启');
    }

    db.prepare(`
      INSERT INTO servers (id, name, motd, version, mod_version, key_hash,
                           max_players, created_at, last_seen_at, online, tps,
                           started_at, uptime_seconds, heartbeat_interval, boot_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, motd = excluded.motd, version = excluded.version,
        mod_version = excluded.mod_version, max_players = excluded.max_players,
        last_seen_at = excluded.last_seen_at, online = excluded.online,
        tps = excluded.tps, started_at = excluded.started_at,
        uptime_seconds = excluded.uptime_seconds,
        heartbeat_interval = excluded.heartbeat_interval,
        boot_id = COALESCE(excluded.boot_id, servers.boot_id)
    `).run(
      serverId, srv.name || prev?.name || serverId, srv.motd || '',
      srv.version || '', srv.modVersion || '', prev?.key_hash || hashKey(''),
      maxPlayers, prev?.created_at || now, now,
      Number(srv.online) || players.length, srv.tps ?? null,
      srv.startedAt ? Number(srv.startedAt) : null,
      Number(srv.uptimeSeconds) || 0, interval, bootId,
    );

    /* 2. 采样 + 今日峰值 */
    addSample(db, serverId, now, Number(srv.online) || players.length, maxPlayers, srv.tps ?? null);
    const today = dayKey(now, tz);
    const sd = db.prepare('SELECT * FROM server_daily WHERE server_id = ? AND day = ?')
      .get(serverId, today);
    if (sd) {
      db.prepare('UPDATE server_daily SET peak_online = MAX(peak_online, ?) WHERE server_id = ? AND day = ?')
        .run(Number(srv.online) || players.length, serverId, today);
    } else {
      db.prepare('INSERT INTO server_daily (server_id, day, peak_online) VALUES (?, ?, ?)')
        .run(serverId, today, Number(srv.online) || players.length);
    }

    /* 3. 逐个玩家：开/续 session，累加时长 */
    const seen = new Set();
    for (const p of players) {
      const uuid = String(p.uuid || '').trim();
      if (!uuid) continue;
      seen.add(uuid);

      // 模组采用「增量上报」：只发变化过的字段，所以这里必须为缺省字段
      // 找回原值，否则 name 会被 UUID 前缀覆盖、joinedAt 变成 now（还会
      // 被误判成「新的一次加入」而把 session 拆成两段）。
      const prevSes = db.prepare('SELECT * FROM sessions WHERE uuid = ? AND closed = 0').get(uuid);
      const prevPl = db.prepare('SELECT * FROM players WHERE uuid = ?').get(uuid);
      const name = String(p.name || '').slice(0, 32)
        || prevSes?.name || prevPl?.name || uuid.slice(0, 8);
      const joinedAt = Number(p.joinedAt) || prevSes?.joined_at || now;

      let pl = db.prepare('SELECT * FROM players WHERE uuid = ?').get(uuid);
      if (!pl) {
        db.prepare(`
          INSERT INTO players (uuid, name, first_seen_at, last_seen_at, last_join_at,
                               sessions, deaths, play_time_ticks)
          VALUES (?, ?, ?, ?, ?, 0, ?, ?)
        `).run(uuid, name, joinedAt, now, joinedAt,
          Number(p.deaths) || 0, Number(p.playTimeTicks) || 0);
        pl = db.prepare('SELECT * FROM players WHERE uuid = ?').get(uuid);
        addEvent(db, now, serverId, 'first_seen', uuid, name, null);
      }

      // 打开着的 session
      let ses = db.prepare('SELECT * FROM sessions WHERE uuid = ? AND closed = 0').get(uuid);
      if (ses && Math.abs(ses.joined_at - joinedAt) > 60000) {
        // 服务端认为这是一次新的加入（例如后端漏掉了一次离开）
        closeSession(db, ses, ses.last_seen_at, tz, capSeconds, serverId);
        ses = null;
      }
      if (!ses) {
        db.prepare(`
          INSERT INTO sessions (server_id, uuid, name, joined_at, last_seen_at, seconds,
                                closed, dimension, gamemode, ping)
          VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?, ?)
        `).run(serverId, uuid, name, joinedAt, now, p.dimension || null,
          p.gamemode || null, p.ping ?? null);
        ses = db.prepare('SELECT * FROM sessions WHERE uuid = ? AND closed = 0').get(uuid);
        db.prepare('UPDATE players SET sessions = sessions + 1 WHERE uuid = ?').run(uuid);
        addEvent(db, now, serverId, 'join', uuid, name, p.dimension || null);
        result.opened.push(name);

        // 补记「加入 → 首次心跳」之间的空档（同样受 cap 约束），
        // 让累计时长与连续在线时长口径一致
        const gap = Math.min(Math.max(0, Math.floor((now - joinedAt) / 1000)), capSeconds);
        if (gap > 0) {
          db.prepare('UPDATE players SET total_seconds = total_seconds + ? WHERE uuid = ?')
            .run(gap, uuid);
          const dk0 = dayKey(now, tz);
          const row0 = db.prepare('SELECT * FROM daily WHERE uuid = ? AND day = ?').get(uuid, dk0);
          if (row0) {
            db.prepare('UPDATE daily SET seconds = seconds + ? WHERE uuid = ? AND day = ?')
              .run(gap, uuid, dk0);
          } else {
            db.prepare('INSERT INTO daily (uuid, day, seconds, sessions) VALUES (?, ?, ?, 1)')
              .run(uuid, dk0, gap);
          }
        }
      }

      // 增量累加（受 cap 限制）
      const delta = Math.min(Math.max(0, Math.floor((now - ses.last_seen_at) / 1000)), capSeconds);
      const seconds = Math.max(0, Math.floor((now - ses.joined_at) / 1000));

      // 模组会省略「没变化」的字段以省流量，所以缺省时沿用库里已有的值，
      // 不能用 null 覆盖（否则维度/延迟会被无意义地清空）。
      const has = (k) => Object.prototype.hasOwnProperty.call(p, k);
      const dim = has('dimension') ? (p.dimension || null) : ses.dimension;
      const mode = has('gamemode') ? (p.gamemode || null) : ses.gamemode;
      const ping = has('ping') ? (p.ping ?? null) : ses.ping;

      db.prepare(`
        UPDATE sessions SET last_seen_at = ?, seconds = ?, name = ?,
               dimension = ?, gamemode = ?, ping = ?
        WHERE id = ?
      `).run(now, seconds, name, dim, mode, ping, ses.id);

      if (delta > 0) {
        accrue(db, uuid, name, delta, now, tz);
        db.prepare('UPDATE players SET total_seconds = total_seconds + ? WHERE uuid = ?')
          .run(delta, uuid);
        const dk = dayKey(now, tz);
        const row = db.prepare('SELECT * FROM daily WHERE uuid = ? AND day = ?').get(uuid, dk);
        if (row) {
          db.prepare('UPDATE daily SET seconds = seconds + ? WHERE uuid = ? AND day = ?')
            .run(delta, uuid, dk);
        } else {
          db.prepare('INSERT INTO daily (uuid, day, seconds, sessions) VALUES (?, ?, ?, 1)')
            .run(uuid, dk, delta);
        }
      }

      // deaths / playTimeTicks 同理：没上报就保持原值
      db.prepare(`
        UPDATE players SET name = ?, last_seen_at = ?, last_join_at = ?,
               longest_session = MAX(longest_session, ?),
               deaths = CASE WHEN ? THEN ? ELSE deaths END,
               play_time_ticks = CASE WHEN ? THEN ? ELSE play_time_ticks END
        WHERE uuid = ?
      `).run(name, now, joinedAt, seconds,
        has('deaths') ? 1 : 0, Number(p.deaths) || 0,
        has('playTimeTicks') ? 1 : 0, Number(p.playTimeTicks) || 0, uuid);

      result.updated.push(name);
    }

    /* 4. 未出现在快照里的在线 session → 关闭 */
    const opens = db.prepare('SELECT * FROM sessions WHERE closed = 0 AND server_id = ?').all(serverId);
    for (const s of opens) {
      if (seen.has(s.uuid)) continue;
      closeSession(db, s, now, tz, capSeconds, serverId);
      result.closed.push(s.name);
    }

    /* 5. 事件流：模组在「上线/下线/维度切换/死亡/成就」时立即推送 */
    result.events = applyEvents(db, payload.events, serverId, bootId, tz);

    /* 6. 服务端主动宣告关闭（SERVER_STOPPING 的最后一报）→ 立刻全员离线 */
    if (srv.stopping === true || srv.online === false) {
      const closedNow = markAllOffline(db, serverId, tz, srv.stopping ? '服务端关闭' : '模组报告离线');
      result.closed.push(...closedNow);
      db.prepare('UPDATE servers SET online = 0, last_seen_at = ?, stopped_at = ? WHERE id = ?')
        .run(now, now, serverId);
      addEvent(db, now, serverId, 'server_offline', null, null, srv.stopping ? '服务端正常关闭' : '模组报告离线');
    } else {
      // 正常心跳：清掉旧的「关闭」标记
      db.prepare('UPDATE servers SET stopped_at = NULL WHERE id = ?').run(serverId);
    }

    /* 7. 清理过老采样（保留 14 天，5 分钟粒度之外再降采样） */
    db.prepare('DELETE FROM samples WHERE ts < ?').run(now - 14 * 86400000);

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return result;
}

function accrue(db, uuid, name, delta, now, tz) {
  const dk = dayKey(now, tz);
  const pl = db.prepare('SELECT * FROM players WHERE uuid = ?').get(uuid);
  if (!pl) return;
  if (pl.last_day === dk) return; // 同一天，streak 不变
  const streak = pl.last_day && pl.last_day === prevDayKey(now, tz)
    ? (pl.streak_days || 0) + 1
    : 1;
  db.prepare('UPDATE players SET streak_days = ?, last_day = ? WHERE uuid = ?')
    .run(streak, dk, uuid);
}

function closeSession(db, ses, at, tz, capSeconds, serverId) {
  const delta = Math.min(Math.max(0, Math.floor((at - ses.last_seen_at) / 1000)), capSeconds);
  const seconds = Math.max(0, Math.floor((at - ses.joined_at) / 1000));
  db.prepare('UPDATE sessions SET closed = 1, left_at = ?, seconds = ? WHERE id = ?')
    .run(at, seconds, ses.id);
  if (delta > 0) {
    db.prepare('UPDATE players SET total_seconds = total_seconds + ? WHERE uuid = ?')
      .run(delta, ses.uuid);
    const dk = dayKey(at, tz);
    const row = db.prepare('SELECT * FROM daily WHERE uuid = ? AND day = ?').get(ses.uuid, dk);
    if (row) {
      db.prepare('UPDATE daily SET seconds = seconds + ? WHERE uuid = ? AND day = ?')
        .run(delta, ses.uuid, dk);
    } else {
      db.prepare('INSERT INTO daily (uuid, day, seconds, sessions) VALUES (?, ?, ?, 1)')
        .run(ses.uuid, dk, delta);
    }
  }
  db.prepare('UPDATE players SET longest_session = MAX(longest_session, ?) WHERE uuid = ?')
    .run(seconds, ses.uuid);
  addEvent(db, at, serverId, 'leave', ses.uuid, ses.name, '在线 ' + shortDuration(seconds));
}

/** 把秒数说成人话：12 秒 / 3 分 / 1 小时 5 分 / 2 天 3 小时。 */
function shortDuration(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  if (s < 60) return s + ' 秒';
  const m = Math.floor(s / 60);
  if (m < 60) return m + ' 分';
  const h = Math.floor(m / 60);
  if (h < 24) return h + ' 小时' + (m % 60 ? ' ' + (m % 60) + ' 分' : '');
  const d = Math.floor(h / 24);
  return d + ' 天' + (h % 24 ? ' ' + (h % 24) + ' 小时' : '');
}

/**
 * 把所有开着的 session 关掉（服务端重启 / 主动关闭 / 模组报告离线）。
 * 关闭时间取 last_seen_at，避免把「没人上报的那段时间」也算成在线。
 */
function markAllOffline(db, serverId, tz, reason) {
  const opens = db.prepare('SELECT * FROM sessions WHERE closed = 0 AND server_id = ?').all(serverId);
  if (!opens.length) {
    db.prepare('UPDATE servers SET online = 0 WHERE id = ?').run(serverId);
    return [];
  }
  const srv = db.prepare('SELECT heartbeat_interval FROM servers WHERE id = ?').get(serverId);
  const cap = Math.max(MIN_CAP_SECONDS, (srv?.heartbeat_interval || 30) * 4);
  const names = [];
  for (const ses of opens) {
    closeSession(db, ses, ses.last_seen_at, tz, cap, serverId);
    names.push(ses.name);
  }
  db.prepare('UPDATE servers SET online = 0 WHERE id = ?').run(serverId);
  return names;
}

/**
 * 模组即时推送的事件流。
 * join / leave 已由 session 快照生成（避免重复），这里只处理快照表达不了的：
 * 维度切换、死亡、完成进度/目标/挑战。
 */
function applyEvents(db, list, serverId, bootId, tz) {
  if (!Array.isArray(list) || !list.length) return 0;
  const now = Date.now();
  let n = 0;
  for (const e of list.slice(0, 200)) {
    const type = String(e.type || '').slice(0, 24);
    if (!type || type === 'join' || type === 'leave') continue;
    const uuid = e.uuid ? String(e.uuid) : null;
    const name = e.name ? String(e.name).slice(0, 32) : null;
    const detail = e.detail == null ? null : String(e.detail).slice(0, 200);
    // 网络重试可能重复推送同一条事件：5 秒窗口内同 (type,uuid,detail) 只记一次
    const dup = db.prepare(`
      SELECT 1 FROM events
      WHERE server_id = ? AND type = ? AND IFNULL(uuid, '') = IFNULL(?, '')
        AND IFNULL(detail, '') = IFNULL(?, '') AND ts > ? LIMIT 1
    `).get(serverId, type, uuid, detail, now - 5000);
    if (dup) continue;
    const ts = Number(e.ts) || now;
    addEvent(db, Math.min(ts, now), serverId, type, uuid, name, detail);
    n++;
  }
  db.prepare('UPDATE servers SET last_event_at = ? WHERE id = ?').run(now, serverId);
  return n;
}

/** 心跳超时 → 标记离线并关闭 session */
export function sweepOffline(db, timeoutMs, tz = DEFAULT_TZ, serverId = null) {
  const now = Date.now();
  const stale = serverId
    ? db.prepare('SELECT * FROM servers WHERE id = ? AND last_seen_at < ? AND online > 0')
      .all(serverId, now - timeoutMs)
    : db.prepare('SELECT * FROM servers WHERE last_seen_at < ? AND online > 0')
      .all(now - timeoutMs);
  for (const s of stale) {
    db.prepare('UPDATE servers SET online = 0, stopped_at = ? WHERE id = ?').run(now, s.id);
    markAllOffline(db, s.id, tz, '心跳超时');
    addEvent(db, now, s.id, 'server_offline', null, null, '心跳超时');
  }
  return stale.length;
}

/* ── 查询：状态 ───────────────────────────────────────── */

/* ── 24 小时曲线：5 分钟一桶，补齐断档，并附上当时在线的玩家名 ── */

const HISTORY_STEP_MS = 5 * 60 * 1000;

function buildHistory(db, serverId, now, opts = {}) {
  const since = now - 24 * 3600000;
  const live = opts.live !== false;
  const offlineAt = live ? Infinity : Number(opts.lastSeenAt) || now;

  // 原始采样点（addSample 只在人数变化或满 5 分钟时才写，量很小）
  const raw = db.prepare(
    'SELECT ts, online, max, tps FROM samples WHERE server_id = ? AND ts >= ? ORDER BY ts ASC',
  ).all(serverId, since).map((r) => ({
    ts: Number(r.ts),
    online: Number(r.online) || 0,
    max: r.max,
    tps: r.tps == null ? null : Math.round(Number(r.tps) * 100) / 100,
  }));
  if (!raw.length) return [];

  // 这段时间里出现过的会话，用来还原「那一刻谁在线」。
  // 未关闭的会话（closed = 0）当作仍然在线（结束时间 Infinity）；服务器已判定离线时
  // 按最后一次心跳结束 —— 不能直接用 last_seen_at 当结束时间，那样心跳一刷新，
  // 最后一个桶就查不到人，会出现「曲线说 N 人在线、下面却说无人在线」。
  const sessions = db.prepare(`
    SELECT uuid, name, joined_at, closed,
           COALESCE(left_at, last_seen_at) AS ended
    FROM sessions WHERE server_id = ? AND joined_at <= ?
      AND (closed = 0 OR COALESCE(left_at, last_seen_at) >= ?)
  `).all(serverId, now, since).map((r) => ({
    uuid: r.uuid,
    name: r.name,
    joinedAt: Number(r.joined_at),
    endedAt: r.closed ? Number(r.ended) : offlineAt,
  }));

  // 会话只覆盖到「最早一条会话」之后；更早的桶没有名单，只能信采样人数。
  const coverageStart = sessions.length
    ? Math.min(...sessions.map((x) => x.joinedAt))
    : null;

  const first = Math.floor(raw[0].ts / HISTORY_STEP_MS) * HISTORY_STEP_MS;
  const out = [];
  let cursor = 0;
  let lastKnown = raw[0].online;
  let lastSampleTs = raw[0].ts;
  let lastTps = raw[0].tps;
  let lastMax = raw[0].max;

  for (let t = first; t <= now; t += HISTORY_STEP_MS) {
    // 阶梯取值：t 时刻的在线数 = 「最后一条 ts <= t 的采样」的值。
    // 不能取桶内 MAX —— 桶内最大值会把中途加入的人算进桶起点，
    // 而名单是按桶起点算的，两边就会打架。
    while (cursor < raw.length && raw[cursor].ts <= t) {
      lastKnown = raw[cursor].online;
      lastSampleTs = raw[cursor].ts;
      lastTps = raw[cursor].tps;
      lastMax = raw[cursor].max;
      cursor += 1;
    }

    // 最后一个桶只覆盖不到 5 分钟，用「现在」取瞬时值，和当前在线列表对齐；
    // 服务器已判定离线时把观测时刻夹到「最后一次心跳」，之后不再算有人在线。
    const tail = t + HISTORY_STEP_MS > now;
    const instant = Math.min(tail ? now : t, live ? Infinity : offlineAt);

    const names = [];
    const seen = new Set();
    for (const s of sessions) {
      if (s.joinedAt <= instant && s.endedAt > instant && !seen.has(s.uuid)) {
        seen.add(s.uuid);
        names.push(s.name);
      }
      if (names.length >= 40) break;
    }

    // 用「观测时刻」而不是桶起点判断覆盖：桶起点可能略早于第一位玩家的加入时间
    const covered = coverageStart != null && instant >= coverageStart;
    // 有会话数据时，人数直接取名单长度 —— 保证「N 人在线」和列出的名字是同一批人
    let online = covered ? names.length : lastKnown;
    if (!live && t > offlineAt) {
      online = 0;
      names.length = 0;
    }

    out.push({
      ts: t,
      online,
      // 既没有采样、也没有会话记录 = 这段时间服务器确实没上报（关服 / 掉线）。
      // 有会话能还原时就以会话为准，不算「无数据」。
      gap: !covered && t - lastSampleTs > 2 * HISTORY_STEP_MS,
      noNames: !covered,
      max: lastMax,
      tps: lastTps,
      names,
    });
  }
  return out;
}

export function getStatus(db, opts = {}) {
  const tz = opts.tz || DEFAULT_TZ;
  const serverId = opts.serverId;
  const now = Date.now();
  const today = dayKey(now, tz);
  const yesterday = prevDayKey(now, tz);

  const srv = serverId
    ? db.prepare('SELECT * FROM servers WHERE id = ?').get(serverId)
    : db.prepare('SELECT * FROM servers ORDER BY last_seen_at DESC LIMIT 1').get();

  if (!srv) {
    return {
      ok: true, configured: false, online: false, server: null, players: [],
      stats: emptyStats(), samples: [], recentEvents: [],
    };
  }

  // 阈值跟着实际心跳间隔走：模组空载时会把间隔拉长到 120s，
  // 若固定按 90s 判定，空载服务器会被误判成离线。
  const hbMs = Math.max(5, Number(srv.heartbeat_interval) || 30) * 1000;
  const onlineTimeout = Math.max(
    opts.offlineTimeoutMs ?? 90000,
    hbMs * 3 + (opts.graceMs ?? 15000),
  );
  // 已收到「正常关闭」或「模组报告离线」的服务器，即使 last_seen_at 很新也算离线
  const stopped = srv.stopped_at != null && srv.stopped_at >= srv.last_seen_at;
  const isOnline = !stopped && srv.last_seen_at > now - onlineTimeout;

  // 服务器判定为离线时，页面不应再显示「在线玩家」——即使库里还有没关干净的 session，
  // 也一律按离线处理，且时长不再实时增长。
  const openRows = isOnline ? db.prepare(`
    SELECT s.uuid, s.name, s.joined_at, s.seconds, s.ping, s.dimension, s.gamemode,
           p.total_seconds, p.sessions, p.longest_session, p.streak_days,
           p.first_seen_at, p.last_seen_at,
           COALESCE(d.seconds, 0) AS today_seconds
    FROM sessions s
    JOIN players p ON p.uuid = s.uuid
    LEFT JOIN daily d ON d.uuid = s.uuid AND d.day = ?
    WHERE s.closed = 0 AND s.server_id = ?
    ORDER BY s.joined_at ASC
  `).all(today, srv.id) : [];

  const players = openRows.map((r) => ({
    ...r,
    // 在线玩家的连续在线时长以服务端上报的 joined_at 为准，实时增长
    seconds: Math.max(0, Math.floor((now - r.joined_at) / 1000)),
  }));

  const todayAgg = db.prepare(`
    SELECT COALESCE(SUM(seconds), 0) AS sec, COUNT(*) AS players
    FROM daily WHERE day = ?
  `).get(today);

  const ydayAgg = db.prepare('SELECT COALESCE(SUM(seconds), 0) AS sec FROM daily WHERE day = ?')
    .get(yesterday);

  const totalAgg = db.prepare('SELECT COALESCE(SUM(total_seconds), 0) AS sec FROM players').get();

  const counts = db.prepare(`
    SELECT (SELECT COUNT(*) FROM players) AS ever,
           (SELECT COUNT(*) FROM sessions WHERE closed = 0 AND server_id = ?) AS online,
           (SELECT COUNT(*) FROM sessions WHERE joined_at >= ?) AS sessions_today,
           (SELECT COALESCE(MAX(peak_online), 0) FROM server_daily WHERE day = ?) AS peak_today
  `).get(srv.id, startOfDay(now, tz), today);
  // 24 小时曲线体积最大（几百个点 = 十几 KB），而它只在页面首次加载时需要。
  // 默认不返回，只有显式 withHistory=true 的请求（GET /api/status）才带，
  // 这样每 15 秒的 SSE 推送就从 ~17KB 降到 ~2KB。
  const withHistory = opts.withHistory === true;
  // 按 5 分钟桶取「该桶内最大在线数」：一天 2880 条采样压到 288 个点，
  // 曲线形状不变（本来就是阶跃），体积再降一个数量级。
  const history = withHistory
    ? buildHistory(db, srv.id, now, { live: isOnline, lastSeenAt: srv.last_seen_at })
    : [];

  // 24 小时在线率：以「已观测到的 5 分钟桶」为分母（首条采样之前不计入），
  // 避免刚启动只有一个采样点时显示 100%。
  const uptime = db.prepare(`
    SELECT COUNT(*) AS buckets, SUM(CASE WHEN online > 0 THEN 1 ELSE 0 END) AS up,
           MIN(ts) AS first_ts
    FROM (SELECT (ts / 300000) AS b, MAX(online) AS online, MIN(ts) AS ts FROM samples
          WHERE server_id = ? AND ts >= ? GROUP BY b)
  `).get(srv.id, now - 24 * 3600000);

  // 分母取「覆盖到的桶数」与「首条采样至今应有的桶数」的较大者，
  // 中间断档（服务器没上报）也算作离线。
  let uptimePct = null;
  if (uptime && uptime.buckets) {
    const spanStart = Math.max(now - 24 * 3600000, uptime.first_ts || now);
    const spanMs = now - spanStart;
    // 观测不足 30 分钟时不给百分比，避免「刚开始就 100%」的误导
    if (spanMs >= 30 * 60000) {
      const expected = Math.ceil(spanMs / 300000) + 1;
      const denom = Math.max(uptime.buckets, expected);
      uptimePct = Math.round(((uptime.up || 0) / denom) * 1000) / 10;
    }
  }

  const recentEvents = db.prepare(`
    SELECT ts, type, uuid, name, detail FROM events
    WHERE server_id = ? ORDER BY ts DESC LIMIT 12
  `).all(srv.id);

  return {
    ok: true,
    configured: true,
    online: isOnline,
    // 从未上报过的服务器没有 last_seen_at，别算成「两万天前」
    lastSeenSeconds: srv.last_seen_at
      ? Math.max(0, Math.floor((now - srv.last_seen_at) / 1000))
      : null,
    server: {
      id: srv.id, name: srv.name, motd: srv.motd, version: srv.version,
      modVersion: srv.mod_version, max: srv.max_players, online: isOnline ? players.length : 0,
      tps: srv.tps, startedAt: srv.started_at, uptimeSeconds: srv.uptime_seconds,
      heartbeatInterval: srv.heartbeat_interval, bootId: srv.boot_id || null,
    },
    players,
    stats: {
      online: isOnline ? players.length : 0,
      max: srv.max_players,
      todaySeconds: todayAgg.sec || 0,
      yesterdaySeconds: ydayAgg.sec || 0,
      todayPlayers: todayAgg.players || 0,
      sessionsToday: counts.sessions_today || 0,
      peakToday: counts.peak_today || 0,
      totalSeconds: totalAgg.sec || 0,
      everPlayers: counts.ever || 0,
      uptime24h: uptimePct,
    },
    // 没要曲线时干脆不带这个键：前端据此区分「没数据」和「本次推送没带曲线」
    ...(withHistory ? { samples: history } : {}),
    recentEvents,
    now,
    tz,
  };
}

function emptyStats() {
  return {
    online: 0, max: 0, todaySeconds: 0, yesterdaySeconds: 0, todayPlayers: 0,
    sessionsToday: 0, peakToday: 0, totalSeconds: 0, everPlayers: 0, uptime24h: null,
  };
}

function startOfDay(ts, tz) {
  const key = dayKey(ts, tz);
  // 用「当天 00:00 的近似」即可满足「今日开始的 session 数」统计
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, '0');
  const iso = `${key}T00:00:00`;
  const guess = Date.parse(iso + guessOffset(ts, tz, key));
  return Number.isNaN(guess) ? d.setHours(0, 0, 0, 0) : guess;
}

function guessOffset(ts, tz, key) {
  // 计算 tz 在 ts 时刻相对 UTC 的偏移，构造 "±HH:MM"
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const parts = dtf.formatToParts(new Date(ts)).reduce((a, p) => (a[p.type] = p.value, a), {});
  const asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24,
    +parts.minute, +parts.second);
  const offsetMin = Math.round((asUTC - ts) / 60000);
  const sign = offsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

/* ── 查询：排行榜 / 玩家详情 / 历史 ───────────────────── */

export function getPlayers(db, opts = {}) {
  const tz = opts.tz || DEFAULT_TZ;
  const today = dayKey(Date.now(), tz);
  const limit = Math.min(Math.max(1, Number(opts.limit) || 50), 200);
  const sort = opts.sort || 'total';
  const order = {
    total: 'p.total_seconds DESC',
    today: 'today_seconds DESC',
    streak: 'p.streak_days DESC, p.total_seconds DESC',
    longest: 'p.longest_session DESC',
    recent: 'p.last_seen_at DESC',
    sessions: 'p.sessions DESC',
  }[sort] || 'p.total_seconds DESC';

  return db.prepare(`
    SELECT p.uuid, p.name, p.first_seen_at, p.last_seen_at, p.total_seconds,
           p.sessions, p.longest_session, p.streak_days, p.deaths, p.play_time_ticks,
           COALESCE(d.seconds, 0) AS today_seconds,
           EXISTS(SELECT 1 FROM sessions s WHERE s.uuid = p.uuid AND s.closed = 0) AS is_online
    FROM players p
    LEFT JOIN daily d ON d.uuid = p.uuid AND d.day = ?
    ORDER BY ${order}
    LIMIT ?
  `).all(today, limit).map((r) => ({ ...r, is_online: !!r.is_online }));
}

export function getPlayer(db, uuid, opts = {}) {
  const tz = opts.tz || DEFAULT_TZ;
  const today = dayKey(Date.now(), tz);
  const p = db.prepare('SELECT * FROM players WHERE uuid = ?').get(uuid);
  if (!p) return null;
  const open = db.prepare('SELECT * FROM sessions WHERE uuid = ? AND closed = 0').get(uuid);
  const daily = db.prepare(`
    SELECT day, seconds FROM daily WHERE uuid = ? ORDER BY day DESC LIMIT 30
  `).all(uuid);
  // 忽略「零时长」的空会话（重连竞态留下的噪声），只保留有意义的记录
  const sessions = db.prepare(`
    SELECT joined_at, left_at, seconds, closed, dimension, gamemode
    FROM sessions
    WHERE uuid = ? AND NOT (closed = 1 AND seconds = 0)
    ORDER BY joined_at DESC LIMIT 12
  `).all(uuid);
  const todayRow = daily.find((d) => d.day === today);
  return {
    ...p,
    is_online: !!open,
    current_session_seconds: open ? Math.floor((Date.now() - open.joined_at) / 1000) : 0,
    today_seconds: todayRow ? todayRow.seconds : 0,
    // 注意：下面两个键会覆盖 players 表里的同名列，数值计数另存一份
    // 计数与列表口径保持一致（都不含零时长的空会话）
    session_count: db.prepare(`
      SELECT COUNT(*) AS n FROM sessions
      WHERE uuid = ? AND NOT (closed = 1 AND seconds = 0)
    `).get(uuid).n || 0,
    daily,
    sessions,
  };
}

export function getHistory(db, opts = {}) {
  const hours = Math.min(Math.max(1, Number(opts.hours) || 24), 24 * 14);
  const since = Date.now() - hours * 3600000;
  const rows = db.prepare(`
    SELECT (ts / 300000) AS bucket, MAX(online) AS online, MAX(max) AS max, AVG(tps) AS tps
    FROM samples WHERE ts >= ? GROUP BY bucket ORDER BY bucket ASC
  `).all(since);
  return rows.map((r) => ({
    ts: Number(r.bucket) * 300000,
    online: r.online,
    max: r.max,
    tps: r.tps == null ? null : Math.round(r.tps * 100) / 100,
  }));
}

export function getEvents(db, opts = {}) {
  const limit = Math.min(Math.max(1, Number(opts.limit) || 30), 200);
  const types = String(opts.type || '')
    .split(',').map((s) => s.trim()).filter(Boolean);
  if (types.length) {
    const marks = types.map(() => '?').join(',');
    return db.prepare(`
      SELECT ts, type, uuid, name, detail FROM events
      WHERE type IN (${marks}) ORDER BY ts DESC LIMIT ?
    `).all(...types, limit);
  }
  return db.prepare(`
    SELECT ts, type, uuid, name, detail FROM events ORDER BY ts DESC LIMIT ?
  `).all(limit);
}

/* ── 维护 ─────────────────────────────────────────────── */

export function prune(db, { keepDays = 90 } = {}) {
  const cutoff = Date.now() - keepDays * 86400000;
  db.exec('BEGIN');
  try {
    db.prepare('DELETE FROM samples WHERE ts < ?').run(cutoff);
    db.prepare('DELETE FROM events WHERE ts < ?').run(cutoff);
    db.prepare('DELETE FROM daily WHERE day < ?').run(dayKey(cutoff));
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

export function getMeta(db, k) {
  const r = db.prepare('SELECT v FROM meta WHERE k = ?').get(k);
  return r ? r.v : null;
}

export function setMeta(db, k, v) {
  db.prepare('INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v')
    .run(k, String(v));
}

/** 逐台判定用：等价于 sweepOffline 指定 serverId。 */
export function sweepOfflineOne(db, timeoutMs, tz, serverId) {
  return sweepOffline(db, timeoutMs, tz, serverId);
}
