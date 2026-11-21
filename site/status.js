/* ============================================================
   在线状态面板
   ────────────────────────────────────────────────────────────
   数据来源：同源的 /api/status（SSE 优先，回退轮询）。
   直接用 file:// 打开时没有后端，会显示「未连接」而不报错。
   ============================================================ */

(function () {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  const API = (() => {
    // 1) 优先用 config.js 里手写的地址（站点与后端不同源时用这个）
    const custom = window.SKYBLOCK_STATUS && window.SKYBLOCK_STATUS.api;
    if (custom) return String(custom).replace(/\/+$/, '');

    // 2) file:// 下没有同源后端，返回 null 让面板显示「未连接」
    if (location.protocol === 'file:') return null;

    // 3) 默认同源（site/ 由 server.js 托管时）
    return location.origin;
  })();

  const POLL_MS = 20000;
  const state = {
    samples: [],
    events: [],
    sort: 'joined',
    data: null,
    source: null,   // 'sse' | 'poll'
    timer: null,
    es: null,
    failures: 0,
    lastRenderAt: 0,
    detailUuid: null,
    esFailures: 0,
    esTimer: null,
    clockOffset: 0,   // 服务器时间 - 本机时间（毫秒）
  };

  /* ── 时间格式化 ─────────────────────────────────────── */

  /** 秒 → 「1 天 2 小时」/「3 小时 12 分」/「8 分」/「42 秒」 */
  function humanDuration(sec) {
    sec = Math.max(0, Math.floor(Number(sec) || 0));
    if (sec < 60) return sec + ' 秒';
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (d > 0) return d + ' 天' + (h > 0 ? ' ' + h + ' 小时' : '');
    if (h > 0) return h + ' 小时' + (m > 0 ? ' ' + m + ' 分' : '');
    return m + ' 分';
  }

  /** 秒 → 紧凑的「12:34:56」/「34:56」 */
  function clockDuration(sec) {
    sec = Math.max(0, Math.floor(Number(sec) || 0));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const pad = (n) => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }

  /**
   * 「现在」以服务器时间为准。
   * joined_at 是服务端时钟，若直接和浏览器 Date.now() 相减，
   * 两边时钟差多少，页面上的在线时长就错多少（常见几十秒）。
   */
  function now() {
    return Date.now() + (state.clockOffset || 0);
  }

  function timeAgo(ts) {
    const diff = Math.max(0, Math.floor((now() - ts) / 1000));
    if (diff < 10) return '刚刚';
    if (diff < 60) return diff + ' 秒前';
    if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
    if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前';
    return Math.floor(diff / 86400) + ' 天前';
  }

  function hhmm(ts) {
    const d = new Date(ts);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  /* ── 渲染：状态条 ───────────────────────────────────── */

  function renderBar(d) {
    const dot = $('#statusDot');
    const name = $('#statusName');
    const meta = $('#statusMeta');
    const shell = $('#statusShell');

    if (!d || !d.configured) {
      dot.className = 'status-dot';
      name.textContent = '尚未连接后端';
      meta.textContent = API ? '后端还没有任何服务器上报过数据' : '用 file:// 打开时无法读取在线状态';
      shell.classList.add('is-offline');
      return;
    }

    const online = !!d.online;
    dot.className = 'status-dot ' + (online ? 'is-on' : 'is-off');
    shell.classList.toggle('is-offline', !online);

    const srv = d.server || {};
    name.textContent = srv.name || srv.id || '未命名服务器';

    const bits = [];
    if (online) {
      bits.push(`在线 ${d.stats.online}/${srv.max || '?'}`);
      if (srv.tps != null) bits.push(`TPS ${Number(srv.tps).toFixed(2)}`);
      bits.push(`${srv.version || '?'} · skyblock-status ${srv.modVersion || '?'}`);
    } else {
      bits.push('离线');
      if (d.lastSeenSeconds != null) {
        bits.push(d.lastSeenSeconds < 10 ? '刚刚失联' : `最后心跳 ${humanDuration(d.lastSeenSeconds)}前`);
      } else {
        bits.push('从未收到过上报');
      }
    }
    meta.textContent = bits.join('  ·  ');
  }

  /* ── 渲染：大数字 ───────────────────────────────────── */

  function renderMetrics(d) {
    const el = $('#statusMetrics');
    if (!d || !d.configured) {
      el.innerHTML = '';
      return;
    }
    const s = d.stats || {};
    const trend = (() => {
      const t = Number(s.todaySeconds) || 0;
      const y = Number(s.yesterdaySeconds) || 0;
      if (!y) return t > 0 ? '今日首次记录' : '今天还没有人上线';
      const pct = Math.round(((t - y) / y) * 100);
      if (pct === 0) return '与昨日全天持平';
      // 今天还没过完，只能和昨日「全天」比，措辞上要说清楚
      return pct > 0
        ? `已超过昨日全天 ${pct}%`
        : `为昨日全天的 ${Math.max(0, 100 - Math.abs(pct))}%`;
    })();

    const cards = [
      { label: '当前在线', value: s.online, unit: ` / ${s.max || '?'}`, cls: 'is-accent', sub: `今日峰值 ${s.peakToday || 0} 人` },
      { label: '今日累计在线', value: humanDuration(s.todaySeconds), cls: 'is-long', sub: trend },
      { label: '今日活跃玩家', value: s.todayPlayers || 0, unit: ' 人', cls: '', sub: `共 ${s.sessionsToday || 0} 次上线` },
      { label: '历史累计在线', value: humanDuration(s.totalSeconds), cls: 'is-gold is-long', sub: `${s.everPlayers || 0} 位玩家曾登岛` },
      {
        label: '24 小时在线率',
        value: s.uptime24h == null ? '采样中' : s.uptime24h,
        unit: s.uptime24h == null ? '' : '%',
        cls: s.uptime24h == null ? 'is-muted' : 'is-amethyst',
        sub: s.uptime24h == null
          ? '需要至少 30 分钟采样'
          : (d.online ? `已运行 ${humanDuration(d.server.uptimeSeconds)}` : '服务器当前离线'),
      },
    ];

    el.innerHTML = cards.map((c) => `
      <div class="metric">
        <b class="${esc(c.cls)}">${esc(c.value)}${c.unit ? `<span class="unit">${esc(c.unit)}</span>` : ''}</b>
        <span>${esc(c.label)}</span>
        <span style="opacity:.72">${esc(c.sub)}</span>
      </div>`).join('');
  }

  /* ── 渲染：在线玩家 ─────────────────────────────────── */

  function pingClass(ping) {
    if (ping == null) return '';
    if (ping < 80) return 'good';
    if (ping < 180) return 'mid';
    return 'bad';
  }

  /* ── 渲染：玩家详情（点击卡片展开） ─────────────────── */

  function fmtDate(ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function detailHtml(p) {
    // 补齐最近 14 天（数据库只存有记录的天，缺的补 0）
    const byDay = new Map((p.daily || []).map((d) => [d.day, d.seconds || 0]));
    const days = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const pad = (n) => String(n).padStart(2, '0');
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      days.push({ day: key, seconds: byDay.get(key) || 0 });
    }
    const maxDay = Math.max(1, ...days.map((d) => d.seconds));
    const bars = days.map((d) => {
      const h = Math.max(2, Math.round((d.seconds / maxDay) * 100));
      const zero = !d.seconds;
      return `<div class="day-bar${zero ? ' is-zero' : ''}" style="height:${zero ? 3 : h}%" title="${esc(d.day)} · ${esc(zero ? '无记录' : humanDuration(d.seconds))}"></div>`;
    }).join('');

    const sessions = (p.sessions || []).slice(0, 6).map((s) => {
      const live = !s.closed;
      const dur = live
        ? `<span class="s-live">在线中 ${esc(clockDuration(p.current_session_seconds))}</span>`
        : `<span class="s-dur">${esc(humanDuration(s.seconds))}</span>`;
      return `<div class="session-row"><span class="s-when">${esc(fmtDate(s.joined_at))}</span>${dur}</div>`;
    }).join('');

    const items = [
      ['本次在线', clockDuration(p.current_session_seconds), p.is_online ? 'is-accent' : ''],
      ['今日在线', humanDuration(p.today_seconds), ''],
      ['累计在线', humanDuration(p.total_seconds), 'is-gold'],
      ['最长单次', humanDuration(p.longest_session), ''],
      ['上线次数', String(p.session_count != null ? p.session_count : (p.sessions || []).length) + ' 次', ''],
      ['连续天数', String(p.streak_days || 0) + ' 天', ''],
      ['首次登岛', fmtDate(p.first_seen_at), ''],
      ['最后在线', p.is_online ? '现在' : fmtDate(p.last_seen_at), ''],
    ].map(([k, v, cls]) => `
      <div class="detail-item ${cls}"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('');

    return `
      <div class="detail-head">
        <div class="player-avatar">${esc(String(p.name || '?').slice(0, 1).toUpperCase())}</div>
        <div style="min-width:0">
          <div class="detail-name">${esc(p.name)}</div>
          <div class="detail-uuid">${esc(p.uuid)}</div>
        </div>
        <button class="detail-close" id="detailClose" aria-label="关闭">✕</button>
      </div>
      <div class="detail-grid">${items}</div>
      ${`<div class="detail-bars">
        <h4>最近 14 天</h4>
        <div class="day-bars">${bars}</div>
        <div class="day-labels"><span>${esc(days[0].day)}</span><span>今天</span></div>
      </div>`}
      ${sessions ? `<div class="detail-sessions"><h4>最近会话</h4>${sessions}</div>` : ''}`;
  }

  function openDetail(uuid) {
    const box = $('#playerDetail');
    if (!box) return;
    if (!API) {
      box.hidden = false;
      box.innerHTML = '<p class="status-note">没有连接后端，无法读取玩家详情。</p>';
      return;
    }
    box.hidden = false;
    box.innerHTML = '<p class="status-note">读取中…</p>';
    state.detailUuid = uuid;
    fetch(`${API}/api/players/${encodeURIComponent(uuid)}`, { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then((j) => {
        if (!j || !j.player) throw new Error('empty');
        box.innerHTML = detailHtml(j.player);
      })
      .catch(() => {
        box.innerHTML = '<p class="status-note">读取玩家详情失败。</p>';
      });
  }

  function closeDetail() {
    state.detailUuid = null;
    const box = $('#playerDetail');
    if (box) { box.hidden = true; box.innerHTML = ''; }
    $$('.player-card.is-active').forEach((c) => c.classList.remove('is-active'));
  }

  function renderPlayers(d) {
    const grid = $('#playerGrid');
    const empty = $('#playerEmpty');
    const count = $('#statusOnlineCount');

    const list = (d && d.players) ? d.players.slice() : [];
    count.textContent = list.length;

    if (!list.length) {
      grid.innerHTML = '';
      // 服务器离线时的空态文案要说清楚，别让人以为只是没人玩
      empty.textContent = (d && d.configured && !d.online)
        ? '服务器当前离线，所有玩家已标记为离线。'
        : '现在没有玩家在线。';
      empty.hidden = false;
      if (state.detailUuid) closeDetail();
      return;
    }
    empty.hidden = true;

    const sorters = {
      joined: (a, b) => a.joined_at - b.joined_at,
      duration: (a, b) => b.seconds - a.seconds,
      today: (a, b) => (b.today_seconds || 0) - (a.today_seconds || 0),
    };
    list.sort(sorters[state.sort] || sorters.joined);

    grid.innerHTML = list.map((p) => {      const initial = String(p.name || '?').slice(0, 1).toUpperCase();
      const sub = [];
      if (p.dimension) sub.push(esc(DIM_LABEL[p.dimension] || String(p.dimension).replace(/^minecraft:/, '')));
      if (p.gamemode) sub.push(esc(MODE_LABEL[p.gamemode] || p.gamemode));
      if (p.ping != null) sub.push(`<span class="player-ping ${pingClass(p.ping)}">${p.ping} ms</span>`);
      return `
        <div class="player-card" data-uuid="${esc(p.uuid)}" tabindex="0" role="button" aria-label="查看 ${esc(p.name)} 的详情">
          <div class="player-avatar">${esc(initial)}</div>
          <div class="player-main">
            <div class="player-name" title="${esc(p.name)}">${esc(p.name)}</div>
            <div class="player-sub">${sub.join(' · ')}</div>
          </div>
          <div class="player-time">
            <b data-live-sec="${p.joined_at}">${clockDuration(p.seconds)}</b>
            <span>今日 ${humanDuration(p.today_seconds)}</span>
          </div>
        </div>`;
    }).join('');

    // 保持展开的详情在刷新后仍然高亮
    if (state.detailUuid) {
      const cur = grid.querySelector(`.player-card[data-uuid="${state.detailUuid}"]`);
      if (cur) cur.classList.add('is-active');
      else closeDetail();
    }
  }

  /* ── 渲染：曲线 ─────────────────────────────────────── */

  /* 采样点 → 屏幕坐标（供画线与悬停共用） */
  const CHART = { W: 600, H: 160, pad: 6, pts: [], maxY: 1 };

  function chartX(i, n) {
    return n <= 1 ? CHART.W / 2 : (i / (n - 1)) * CHART.W;
  }
  function chartY(v) {
    return CHART.H - CHART.pad - ((v || 0) / CHART.maxY) * (CHART.H - CHART.pad * 2);
  }

  /* 3 点加权平滑，端点原样保留，避免把峰值削掉太多 */
  function smoothValues(arr) {
    if (arr.length < 3) return arr.slice();
    const out = arr.slice();
    for (let i = 1; i < arr.length - 1; i++) {
      out[i] = arr[i - 1] * 0.25 + arr[i] * 0.5 + arr[i + 1] * 0.25;
    }
    return out;
  }

  /* Catmull-Rom → 三次贝塞尔，得到平滑曲线（不会像折线那样有硬角） */
  function smoothPath(pts) {
    const n = pts.length;
    if (!n) return '';
    if (n < 3) {
      return pts.map((p, i) => (i ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join(' ');
    }
    let d = 'M' + pts[0].x.toFixed(1) + ' ' + pts[0].y.toFixed(1);
    const t = 0.16; // 张力：越大越贴近折线，越小越圆滑
    for (let i = 0; i < n - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || p2;
      const c1x = p1.x + (p2.x - p0.x) * t;
      const c1y = p1.y + (p2.y - p0.y) * t;
      const c2x = p2.x - (p3.x - p1.x) * t;
      const c2y = p2.y - (p3.y - p1.y) * t;
      d += ' C' + c1x.toFixed(1) + ' ' + c1y.toFixed(1)
         + ', ' + c2x.toFixed(1) + ' ' + c2y.toFixed(1)
         + ', ' + p2.x.toFixed(1) + ' ' + p2.y.toFixed(1);
    }
    return d;
  }

  function renderChart(d) {
    const line = $('#sparkLine');
    const area = $('#sparkArea');
    const axis = $('#sparkAxis');
    const note = $('#chartNote');
    if (!line || !area) return;

    // SSE 每 60 秒的推送为了省流量不带 samples（24h 曲线有 288 个点），
    // 收到不带 samples 的推送就沿用上一次画好的曲线，不要清空。
    const pts = (d && d.samples) ? d.samples : state.samples;
    if (d && d.samples) state.samples = d.samples;
    if (!pts.length) {
      line.setAttribute('d', '');
      area.setAttribute('d', '');
      axis.innerHTML = '';
      note.textContent = '还没有采样数据';
      CHART.pts = [];
      hideChartTip();
      return;
    }

    const raw = pts.map((p) => Math.max(0, p.online || 0));
    CHART.maxY = Math.max(1, ...raw);
    // 原始采样是「每 5 分钟一个人数」，直接连起来会有很多锯齿。
    // 画线时做两遍 3 点平滑（0.25/0.5/0.25），只是视觉平滑，悬停仍显示真实人数。
    const smooth = smoothValues(smoothValues(smoothValues(raw)));
    CHART.pts = pts.map((p, i) => ({
      x: chartX(i, pts.length),
      y: chartY(smooth[i]),
      src: p,
    }));

    const path = smoothPath(CHART.pts);
    line.setAttribute('d', path);
    area.setAttribute('d', `${path} L${CHART.W} ${CHART.H} L0 ${CHART.H} Z`);

    const first = pts[0].ts;
    const last = pts[pts.length - 1].ts;
    axis.innerHTML = `<span>${hhmm(first)}</span><span>峰值 ${CHART.maxY} 人</span><span>${hhmm(last)}</span>`;
    note.textContent = `${pts.length} 个采样点`;
  }

  /* ── 曲线悬停：十字线 + 圆点 + 气泡（时间 / 人数 / 当时在线的玩家） ── */

  function hideChartTip() {
    const tip = $('#sparkTip');
    const dot = $('#sparkDot');
    const guide = $('#sparkGuide');
    if (tip) tip.hidden = true;
    if (dot) dot.hidden = true;
    if (guide) guide.hidden = true;
  }

  function showChartTip(clientX) {
    const wrap = $('#sparkWrap');
    const svg = $('#sparkChart');
    const tip = $('#sparkTip');
    const dot = $('#sparkDot');
    const guide = $('#sparkGuide');
    if (!wrap || !svg || !tip || !CHART.pts.length) return;

    const box = svg.getBoundingClientRect();
    const rel = Math.min(Math.max((clientX - box.left) / box.width, 0), 1);
    // 找最近的采样点
    let idx = Math.round(rel * (CHART.pts.length - 1));
    idx = Math.max(0, Math.min(CHART.pts.length - 1, idx));
    const p = CHART.pts[idx];
    const s = p.src;

    // 圆点 + 竖线：按 SVG 的实际像素尺寸定位（百分比会因下方坐标轴而偏移）
    const px = (p.x / CHART.W) * svg.clientWidth;
    const py = (p.y / CHART.H) * svg.clientHeight;
    dot.hidden = false;
    dot.style.left = px + 'px';
    dot.style.top = py + 'px';
    guide.hidden = false;
    guide.style.left = px + 'px';
    guide.style.height = svg.clientHeight + 'px';

    const names = (s.names || []).filter(Boolean);
    $('#sparkTipTime').textContent = `${hhmm(s.ts)}–${hhmm(s.ts + 5 * 60 * 1000)}`;
    $('#sparkTipOnline').textContent = s.gap ? '无上报' : `${s.online || 0} 人在线`;
    const nameBox = $('#sparkTipNames');
    if (s.gap) {
      nameBox.innerHTML = '<span class="spark-tip-empty">这段时间服务器没有上报数据（关服或掉线）</span>';
    } else if (names.length) {
      nameBox.innerHTML = names.map((n) => `<span class="spark-tip-name">${esc(n)}</span>`).join('');
    } else if (s.noNames) {
      // 这一桶早于最早一条会话记录，只有采样人数、没有名单可还原
      nameBox.innerHTML = '<span class="spark-tip-empty">这段时间没有留下玩家名单</span>';
    } else {
      nameBox.innerHTML = '<span class="spark-tip-empty">这一刻没有人在线</span>';
    }

    tip.hidden = false;
    // 气泡定位：优先放在点上方，超出则放下方；水平夹在容器内
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    let tx = px - w / 2;
    tx = Math.max(4, Math.min(tx, wrap.clientWidth - w - 4));
    let ty = py - h - 14;
    if (ty < 4) ty = py + 14;
    tip.style.transform = `translate(${Math.round(tx)}px, ${Math.round(ty)}px)`;
  }

  function setupChartHover() {
    const wrap = $('#sparkWrap');
    const svg = $('#sparkChart');
    if (!wrap || !svg) return;
    wrap.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      showChartTip(e.clientX);
    });
    wrap.addEventListener('pointerleave', hideChartTip);
    wrap.addEventListener('pointerdown', (e) => showChartTip(e.clientX));
    window.addEventListener('scroll', hideChartTip, { passive: true });
  }

  /* ── 渲染：事件 ─────────────────────────────────────── */

  const KIND_LABEL = {
    join: '上线',
    leave: '下线',
    first_seen: '首次',
    server_offline: '离线',
    server_restart: '重启',
    dimension: '维度',
    death: '死亡',
    advancement: '成就',
  };

  const DIM_LABEL = {
    'minecraft:overworld': '主世界',
    'minecraft:the_nether': '下界',
    'minecraft:the_end': '末地',
  };

  const MODE_LABEL = {
    survival: '生存',
    creative: '创造',
    adventure: '冒险',
    spectator: '旁观',
  };

  /** 1.20.1 的 lang 键是驼峰（genericKill），而注册表 id 是下划线（generic_kill）。 */
  function camelKey(id) {
    return id.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  }

  /** 把模组上报的 detail 翻成给人看的中文。 */
  function eventDetail(e) {
    const raw = e.detail == null ? '' : String(e.detail);
    if (!raw) return '';
    const lang = (typeof MC_LANG === 'object' && MC_LANG) ? MC_LANG : null;

    if (e.type === 'dimension') {
      return DIM_LABEL[raw] || raw.replace(/^minecraft:/, '');
    }
    // 上线事件带的也是维度 id
    if (DIM_LABEL[raw]) return DIM_LABEL[raw];
    if (e.type === 'death') {
      const tbl = (lang && lang.death) ? lang.death : {};
      // detail 是伤害类型 id（minecraft:generic_kill），lang 里写作 minecraft:genericKill
      const tpl = tbl[raw] || tbl[camelKey(raw)] || tbl[raw + '.player'] || tbl[camelKey(raw) + '.player'];
      if (!tpl) return raw.replace(/^minecraft:/, '').replace(/_/g, ' ');
      // %1$s 是死者（名字已单独显示），%2$s/%3$s 是凶手/武器——换成「某物」避免句子断裂
      return tpl
        .replace(/%1\$s/g, '')
        .replace(/%[23]\$s/g, '某物')
        .replace(/\s+/g, ' ')
        .trim();
    }
    if (e.type === 'advancement') {
      const zh = lang && lang.adv ? lang.adv[raw] : null;
      if (zh) return zh;
      return raw.replace(/^minecraft:/, '').replace(/^(story|nether|end|adventure|husbandry)\//, '');
    }
    return raw.replace(/^minecraft:/, '');
  }

  function renderEvents(d) {
    const el = $('#eventList');
    // 后端定时推送只带「新增」的动态（没新事件就不带这个键），
    // 收到增量就合并到已有列表顶部，而不是整块替换。
    if (d && Array.isArray(d.recentEvents)) {
      if (d.recentEvents.length) {
        const seen = new Set(state.events.map((e) => `${e.ts}|${e.type}|${e.uuid || ''}`));
        const merged = d.recentEvents
          .filter((e) => !seen.has(`${e.ts}|${e.type}|${e.uuid || ''}`))
          .concat(state.events);
        state.events = merged.slice(0, 30);
      } else {
        state.events = [];
      }
    }
    const list = state.events;
    if (!list.length) {
      el.innerHTML = '<li style="color:var(--ink-faint);font-size:12.4px">还没有动态记录。</li>';
      return;
    }
    el.innerHTML = list.map((e) => {
      const detail = eventDetail(e);
      return `
      <li>
        <span class="event-kind ${esc(e.type)}">${esc(KIND_LABEL[e.type] || e.type)}</span>
        <span class="event-name">${esc(e.name || '服务器')}</span>
        ${detail ? `<span class="event-detail">${esc(detail)}</span>` : ''}
        <span class="event-time">${timeAgo(e.ts)}</span>
      </li>`;
    }).join('');
  }

  /* ── 渲染：排行榜 ───────────────────────────────────── */

  let lastRankAt = 0;

  function renderRanks(d, force) {
    const todayEl = $('#todayRank');
    const totalEl = $('#totalRank');
    if (!d || !d.configured) {
      todayEl.innerHTML = totalEl.innerHTML = '';
      return;
    }
    // 榜单变化很慢，没必要跟着每 15 秒的状态推送各拉一次（那是 2 个额外请求）。
    // 每 60 秒或「有新的上下线动态」时才刷新。
    const nowTs = Date.now();
    const fresh = force || (d && Array.isArray(d.recentEvents) && d.recentEvents.length);
    if (!fresh && nowTs - lastRankAt < 60000) return;
    lastRankAt = nowTs;
    fetchPlayers('today', 8, todayEl, 'today_seconds');
    fetchPlayers('total', 8, totalEl, 'total_seconds');
  }

  const rankCache = new Map();

  function fetchPlayers(sort, limit, el, field) {
    if (!API) {
      el.innerHTML = '<li style="color:var(--ink-faint);font-size:12.4px">未连接后端。</li>';
      return;
    }
    const key = sort + limit;
    fetch(`${API}/api/players?sort=${sort}&limit=${limit}`)
      .then((r) => r.json())
      .then((j) => {
        const list = (j && j.players) || [];
        rankCache.set(key, list);
        paintRank(el, list, field);
      })
      .catch(() => {
        const cached = rankCache.get(key);
        if (cached) paintRank(el, cached, field);
        else el.innerHTML = '<li style="color:var(--ink-faint);font-size:12.4px">读取失败。</li>';
      });
  }

  function paintRank(el, list, field) {
    if (!list.length) {
      el.innerHTML = '<li style="color:var(--ink-faint);font-size:12.4px">还没有玩家记录。</li>';
      return;
    }
    const max = Math.max(1, ...list.map((p) => Number(p[field]) || 0));
    el.innerHTML = list.map((p, i) => {
      const v = Number(p[field]) || 0;
      return `
        <li>
          <span class="rank-no">${i + 1}</span>
          <span class="rank-name">${esc(p.name)}</span>
          ${p.is_online ? '<span class="rank-on" title="在线"></span>' : ''}
          <span class="rank-bar"><i style="width:${Math.round((v / max) * 100)}%"></i></span>
          <span class="rank-val">${humanDuration(v)}</span>
        </li>`;
    }).join('');
  }

  /* ── 渲染：页脚 ─────────────────────────────────────── */

  function renderFoot(d) {
    const el = $('#statusFoot');
    if (!API) {
      el.innerHTML = '当前是本地文件打开，没有后端。<br>运行 <code>node server/src/server.js</code> 后从 http://localhost:8787 访问即可看到实时状态。';
      return;
    }
    if (!d || !d.configured) {
      el.innerHTML = '后端已就绪，但还没有服务器上报过。<br>运行 <code>node server/src/server.js --init-key default</code> 生成 key，填进模组配置。';
      return;
    }
    const srv = d.server || {};
    const src = state.source === 'sse' ? 'SSE 实时推送' : '轮询';
    el.innerHTML = `数据源 ${src} · 心跳间隔 ${srv.heartbeatInterval || '?'}s · 时区 ${esc(d.tz || '')} · 更新于 ${hhmm(d.now || Date.now())}`;
  }

  /* ── 主渲染 ─────────────────────────────────────────── */

  /**
   * SSE 的定时推送为了省流量省略了 seconds（前端本来就能用 joined_at 本地算），
   * 这里补齐，避免排序/显示拿到 undefined。
   */
  function normalize(d) {
    if (!d || !Array.isArray(d.players)) return d;
    const t = now();
    for (const p of d.players) {
      if (p.seconds == null && p.joined_at) {
        p.seconds = Math.max(0, Math.floor((t - Number(p.joined_at)) / 1000));
      }
    }
    return d;
  }

  function render(d, forceRanks) {
    d = normalize(d);
    state.data = d;
    state.lastRenderAt = Date.now();
    renderBar(d);
    renderMetrics(d);
    renderPlayers(d);
    renderChart(d);
    renderEvents(d);
    renderRanks(d, forceRanks === true);
    renderFoot(d);
  }

  /* ── 拉取 ───────────────────────────────────────────── */

  /** 用响应里的服务器时间校准本机时钟偏差（含半个 RTT 补偿）。 */
  function syncClock(d, sentAt) {
    const srvNow = Number(d && d.now);
    if (!srvNow) return;
    const rtt = Date.now() - sentAt;
    // 服务器时间对应的是「它生成响应时」的瞬间，粗略认为在 RTT 中点
    state.clockOffset = srvNow - (sentAt + rtt / 2);
  }

  function load() {
    if (!API) {
      render(null);
      return;
    }
    const sentAt = Date.now();
    fetch(`${API}/api/status`, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then((d) => {
        state.failures = 0;
        syncClock(d, sentAt);
        render(d, true);
      })
      .catch(() => {
        state.failures++;
        if (state.failures <= 1) render(null);
      });
  }

  function startPolling() {
    stopPolling();
    state.timer = setInterval(load, POLL_MS);
  }

  function stopPolling() {
    if (state.timer) {
      clearInterval(state.timer);
      state.timer = null;
    }
  }

  /* ── SSE ────────────────────────────────────────────── */

  function startStream() {
    if (!API || typeof EventSource === 'undefined') return;
    if (state.es) { try { state.es.close(); } catch { /* ignore */ } state.es = null; }
    try {
      const es = new EventSource(`${API}/api/stream`);
      state.es = es;

      es.addEventListener('status', (ev) => {
        try {
          const d = JSON.parse(ev.data);
          state.source = 'sse';
          state.esFailures = 0;
          // SSE 帧没有往返时间可测，只校偏差（半个 RTT 归零）
          syncClock(d, Date.now());
          const live = $('#statusLive');
          if (live) live.hidden = false;
          render(d);
        } catch { /* 忽略坏帧 */ }
      });

      es.addEventListener('activity', () => {
        // 有人上线/下线时立刻刷新榜单（这也是唯一需要重拉榜单的时机）
        if (state.data) renderRanks(state.data, true);
      });

      es.onopen = () => {
        state.source = 'sse';
        state.esFailures = 0;
        const live = $('#statusLive');
        if (live) live.hidden = false;
        stopPolling();
      };

      es.onerror = () => {
        // 后端没起来时浏览器每 3 秒重连一次，会刷满控制台。
        // 自己接管：关掉连接，按指数退避（3s → 6s → 12s → 30s 封顶）重连。
        state.source = 'poll';
        state.esFailures = (state.esFailures || 0) + 1;
        const live = $('#statusLive');
        if (live) live.hidden = true;
        startPolling();
        try { es.close(); } catch { /* ignore */ }
        state.es = null;
        const delay = Math.min(30000, 3000 * 2 ** Math.min(state.esFailures - 1, 4));
        clearTimeout(state.esTimer);
        state.esTimer = setTimeout(startStream, delay);
      };
    } catch {
      startPolling();
    }
  }

  /* ── 在线秒数本地走字 ───────────────────────────────── */

  function tickLive() {
    // 服务器离线时不再走字：所有玩家已被标记离线，时长应该冻结
    if (!state.data || state.data.configured === false || !state.data.online) return;
    $$('[data-live-sec]').forEach((el) => {
      const joined = Number(el.dataset.liveSec);
      if (!joined) return;
      el.textContent = clockDuration((now() - joined) / 1000);
    });
  }

  /* ── 绑定 ───────────────────────────────────────────── */

  function bind() {
    const tabs = $('#statusTabs');
    if (tabs) {
      tabs.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-sort]');
        if (!btn) return;
        state.sort = btn.dataset.sort;
        $$('.filter-chip', tabs).forEach((b) => b.classList.toggle('is-on', b === btn));
        renderPlayers(state.data);
      });
    }

    const refresh = $('#statusRefresh');
    if (refresh) {
      refresh.addEventListener('click', () => {
        refresh.disabled = true;
        load();
        setTimeout(() => { refresh.disabled = false; }, 600);
      });
    }

    const grid = $('#playerGrid');
    if (grid) {
      grid.addEventListener('click', (e) => {
        const card = e.target.closest('.player-card');
        if (!card) return;
        const uuid = card.dataset.uuid;
        const active = card.classList.contains('is-active');
        closeDetail();
        if (!active && uuid) {
          card.classList.add('is-active');
          openDetail(uuid);
        }
      });
      grid.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const card = e.target.closest('.player-card');
        if (!card) return;
        e.preventDefault();
        card.click();
      });
    }

    const detail = $('#playerDetail');
    if (detail) {
      detail.addEventListener('click', (e) => {
        if (e.target.closest('#detailClose')) closeDetail();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDetail();
    });
  }

  /* ── 初始化 ─────────────────────────────────────────── */

  function init() {
    if (!$('#statusShell')) return;
    bind();
    setupChartHover();
    load();
    startPolling();
    startStream();
    setInterval(tickLive, 1000);
    // 每 30 秒刷新一次「x 分钟前」这类相对时间
    setInterval(() => {
      if (state.data) {
        renderEvents(state.data);
        renderFoot(state.data);
      }
    }, 30000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
