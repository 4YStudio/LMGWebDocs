package com.henvei.skyblockstatus;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import net.minecraft.advancement.Advancement;
import net.minecraft.advancement.AdvancementDisplay;
import net.minecraft.advancement.AdvancementProgress;
import net.minecraft.entity.LivingEntity;
import net.minecraft.entity.damage.DamageSource;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.network.ServerPlayerEntity;
import net.minecraft.server.world.ServerWorld;
import net.minecraft.stat.Stats;
import net.minecraft.text.Text;
import org.slf4j.Logger;

import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.NetworkInterface;
import java.net.Socket;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * 上报器。
 *
 * 设计要点
 * ─────────────────────────────────────────────────────────
 * 1. **不占用主线程**：所有网络 IO 在独立守护线程里做，MC 主线程只负责
 *    每 tick 收集一次「谁在线」，避免卡服。
 * 2. **不阻塞 tick**：上报用 HttpClient 的异步 sendAsync，任何异常都吞掉
 *    并记录一次，绝不因为后端挂了而影响服务器。
 * 3. **joinedAt 由服务端提供**：模组记录玩家真实的加入时间戳，
 *    后端据此计算「连续在线时长」，即使后端重启也不会归零。
 * 4. **失败退避**：连续失败时按指数退避延长重试间隔（最多 5 分钟），
 *    成功后立刻恢复原间隔。
 */
public final class StatusReporter {

    private final Logger log;
    private final AtomicBoolean running = new AtomicBoolean(false);

    private StatusConfig cfg;
    private MinecraftServer server;
    private ScheduledExecutorService scheduler;
    private HttpClient http;

    /** uuid → 加入时间（毫秒）。玩家退出时移除。 */
    private final Map<UUID, Long> joinedAt = new HashMap<>();

    /** 待上报的事件队列（上线/下线/维度切换/死亡/成就）。 */
    private final java.util.Set<UUID> gone = java.util.concurrent.ConcurrentHashMap.newKeySet();
    /** UUID → 玩家对象。JOIN 事件比 getPlayerList() 早一瞬，只靠列表会漏人，所以自己存一份。 */
    private final Map<UUID, ServerPlayerEntity> refs = new java.util.concurrent.ConcurrentHashMap<>();
    private final ConcurrentLinkedQueue<JsonObject> pendingEvents = new ConcurrentLinkedQueue<>();

    /** 每个玩家已见过的成就 id，用于检测「刚完成」。 */
    private final Map<UUID, Set<String>> seenAdvancements = new HashMap<>();

    /** 本进程的唯一标识：后端据此识别「服务端重启过」。 */
    private final String bootId = UUID.randomUUID().toString();

    /** 服务端是否正在关闭（最后一报会带上这个标记，后端立刻全员离线）。 */
    private volatile boolean stopping = false;

    /** 上次扫描成就的时间（毫秒）。 */
    private long lastAdvancementScan = 0;
    /** 已排期的下一次心跳的触发时刻（毫秒）。 */
    private long nextTickAt = 0;
    /** 已排期的那次心跳任务，用于「节奏没变就别重排」。 */
    private volatile java.util.concurrent.ScheduledFuture<?> pending = null;
    /** 上一次排期用的间隔（秒）。 */
    private long lastDelay = -1;
    /** 上一次真正发出请求的时刻（毫秒），用于避免插播与心跳撞车重复发送。 */
    private long lastReportAt = 0;
    /** 两次上报之间的最小间隔：再密的操作也不会打出更多请求。 */
    private static final long MIN_REPORT_GAP_MS = 5000;

    /** 上一次真正发出去的每个玩家的字段值，用于「只发变化了的字段」。 */
    private final Map<UUID, JsonObject> lastSentPlayers = new HashMap<>();

    /** 下一次上报是否必须发全量快照（上线/下线/重启/每 10 次心跳）。 */
    private volatile boolean forceFull = true;

    /** 已经排了一次「合并上报」，避免同一 tick 里死亡+成就各发一次。 */
    private volatile boolean reportQueued = false;

    /** 成功发送的心跳次数，用来决定什么时候强制发一次全量。 */
    private int heartbeatCount = 0;

    /** 本次 payload 里每个玩家的「完整字段」，发送成功后提交到 lastSentPlayers。 */
    private Map<UUID, JsonObject> pendingFull = new HashMap<>();

    /** 启动后的第一报要立刻发（否则空载服务器会等满 idleHeartbeatSeconds）。 */
    private boolean firstTick = true;

    private int failures = 0;
    private long lastSuccessAt = 0;
    private long serverStartedAt = System.currentTimeMillis();
    private int sentCount = 0;
    private String lastError = "";

    public StatusReporter(Logger log, StatusConfig cfg) {
        this.log = log;
        this.cfg = cfg;
    }

    /* ── 生命周期 ─────────────────────────────────────── */

    public synchronized void start(MinecraftServer server) {
        this.server = server;
        this.serverStartedAt = System.currentTimeMillis();
        this.failures = 0;
        this.stopping = false;
        this.seenAdvancements.clear();
        this.gone.clear();
        this.refs.clear();
        this.pendingEvents.clear();
        this.lastSentPlayers.clear();
        this.forceFull = true;
        this.heartbeatCount = 0;
        this.firstTick = true;
        if (running.getAndSet(true)) return;

        this.http = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(Math.min(cfg.timeoutSeconds, 10)))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();

        this.scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "skyblock-status-reporter");
            t.setDaemon(true);
            t.setPriority(Thread.MIN_PRIORITY);
            return t;
        });

        reschedule();
        log.info("[skyblock-status] 上报器已启动 → {}（每 {} 秒）",
                cfg.backendUrl, cfg.heartbeatSeconds);
        if (!cfg.ready()) {
            log.warn("[skyblock-status] 配置不完整（apiKey 为空？），暂时不会发送任何数据。"
                    + "编辑 {} 后执行 /sbs reload", cfg.file());
        }
    }

    public synchronized void stop() {
        if (!running.getAndSet(false)) return;
        if (scheduler != null) {
            scheduler.shutdownNow();
            scheduler = null;
        }
        joinedAt.clear();
        seenAdvancements.clear();
        refs.clear();
        gone.clear();
        pendingEvents.clear();
    }

    /**
     * 服务端正在关闭：先把「全员下线」发出去再真正停。
     * 不等调度器——直接用同步请求，给 5 秒硬上限，失败也无所谓。
     */
    public void shutdownAndReport() {
        this.stopping = true;
        MinecraftServer srv = this.server;
        if (srv == null || !cfg.ready()) return;
        try {
            // 把所有在线玩家先补一条 leave 事件，网页上能立刻看到「都下线了」
            for (ServerPlayerEntity p : srv.getPlayerManager().getPlayerList()) {
                enqueueEvent("leave", p.getUuid().toString(), p.getGameProfile().getName(), null);
            }
            JsonObject payload = buildPayload(srv, drainEvents());
            JsonObject s = payload.getAsJsonObject("server");
            s.addProperty("stopping", true);
            // 关闭时不再声称有玩家在线，避免后端又把它们开成 session
            payload.add("players", new JsonArray());

            HttpClient c = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(3))
                    .build();
            HttpRequest req = HttpRequest.newBuilder(URI.create(cfg.backendUrl + "/api/v1/ingest"))
                    .timeout(Duration.ofSeconds(5))
                    .header("Content-Type", "application/json; charset=utf-8")
                    .header("X-API-Key", cfg.apiKey)
                    .header("User-Agent", "SkyblockStatus/" + SkyblockStatus.MOD_VERSION)
                    .POST(HttpRequest.BodyPublishers.ofString(payload.toString()))
                    .build();
            c.send(req, HttpResponse.BodyHandlers.ofString());
            log.info("[skyblock-status] 已发送关闭通知，网页上会立即显示全员离线");
        } catch (Throwable t) {
            log.info("[skyblock-status] 关闭通知发送失败（不影响关服）：{}", rootMessage(t));
        }
    }

    public synchronized void updateConfig(StatusConfig next) {
        this.cfg = next;
        this.failures = 0;
        if (running.get()) reschedule();
    }

    private void reschedule() {
        if (scheduler == null || scheduler.isShutdown()) return;
        long delay = currentInterval();
        if (firstTick) {
            // 首报 1 秒后立刻发：后端据此拿到 bootId，把上次残留的在线全部清掉
            firstTick = false;
            delay = 1;
        }
        if (failures > 0) {
            long backoff = Math.min(300, currentInterval() * (1L << Math.min(failures, 4)));
            delay = Math.max(delay, backoff);
        }
        java.util.concurrent.ScheduledFuture<?> prev = this.pending;
        // 节奏没变就什么都不做：玩家反复切维度/拿成就时不能把心跳一直往后推，
        // 否则 30 秒的兜底心跳会被无限延后，退化成纯事件驱动。
        if (prev != null && !prev.isDone() && delay == lastDelay) return;
        this.pending = null;
        if (prev != null && !prev.isDone()) prev.cancel(false);
        try {
            nextTickAt = System.currentTimeMillis() + delay * 1000L;
            lastDelay = delay;
            this.pending = scheduler.schedule(this::tickAndReport, delay, TimeUnit.SECONDS);
        } catch (Exception ignored) {
            // scheduler 已关闭
        }
    }

    /**
     * 插一次「不影响心跳节奏」的上报。
     *
     * 人员变动（上线/下线）用它：立即把变化推给后端，但**不重排**心跳，
     * 否则一个玩家反复进出会把下一次心跳一直往后推，甚至退化成纯事件驱动。
     */
    public synchronized void reportSoon() {
        ScheduledExecutorService s = this.scheduler;
        if (!running.get() || s == null || s.isShutdown()) return;
        long nowMs = System.currentTimeMillis();
        // 刚发过就别再发：同一瞬间可能连着触发「死亡 + 成就 + 维度」，
        // 也避免和刚刚发出的心跳撞车造成同一秒两条请求。
        if (nowMs - lastReportAt < MIN_REPORT_GAP_MS) return;
        // 关键：取消已排期的心跳，改成「现在立刻发」。
        // 这样绝不会出现「插播一次 + 紧接着心跳又一次」的双发，
        // 而且下一次心跳会从这次上报重新起算，节奏不会漂移。
        java.util.concurrent.ScheduledFuture<?> prev = this.pending;
        this.pending = null;
        if (prev != null && !prev.isDone()) prev.cancel(false);
        try {
            nextTickAt = nowMs;
            lastDelay = -1; // 让下一次 reschedule() 一定会重新排期
            this.pending = s.schedule(this::tickAndReport, 0, TimeUnit.MILLISECONDS);
        } catch (Exception ignored) {
            // scheduler 已关闭
        }
    }

    /**
     * 当前该用多长的心跳间隔。
     *
     * 没人在线时降级成 idleHeartbeatSeconds（默认 120 秒）——空岛服务器
     * 大部分时间没人，这一条就能把空载流量砍到 1/4。有人上线时立刻
     * 恢复常规间隔（onJoin 会触发一次上报并重排）。
     */
    private long currentInterval() {
        MinecraftServer srv = this.server;
        // 注意：JOIN 事件触发时玩家还不在 getPlayerList() 里，所以要同时看 refs，
        // 否则「刚有人上线」的那一报会把间隔算成空载的 120 秒。
        boolean empty = srv == null
                || (srv.getPlayerManager().getPlayerList().isEmpty() && refs.isEmpty());
        long base = empty ? Math.max(cfg.heartbeatSeconds, cfg.idleHeartbeatSeconds) : cfg.heartbeatSeconds;
        return Math.max(5, base);
    }

    /* ── 玩家加入 / 离开 ──────────────────────────────── */

    public synchronized void onJoin(ServerPlayerEntity player) {
        UUID id = player.getUuid();
        gone.remove(id);
        refs.put(id, player);
        joinedAt.putIfAbsent(id, System.currentTimeMillis());
        rememberAdvancements(player);
        enqueueEvent("join", player.getUuid().toString(), player.getGameProfile().getName(),
                dimensionOf(player));
        // 人员变动 → 发一次全量快照，并立刻上报，网页上能马上看到
        forceFull = true;
        reportSoon();
        // 人数从 0 变 1 时把心跳从空载的 120 秒拉回 30 秒
        reschedule();
    }

    public synchronized void onLeave(ServerPlayerEntity player) {
        UUID id = player.getUuid();
        // 断线事件触发时玩家可能还在 getPlayerList() 里，必须自己记住「已经走了」，
        // 否则紧接着的那次上报又会把他开成一个新 session，网页上就永远在线了。
        gone.add(id);
        refs.remove(id);
        joinedAt.remove(id);
        seenAdvancements.remove(id);
        lastSentPlayers.remove(id);
        enqueueEvent("leave", player.getUuid().toString(), player.getGameProfile().getName(), null);
        forceFull = true;
        reportSoon();
        // 人数归零时把心跳降回空载间隔
        reschedule();
    }

    /** 维度切换（下界/末地/回主世界）—— 立即上报，网页上的维度标签实时变。 */
    public void onDimensionChange(ServerPlayerEntity player, ServerWorld from, ServerWorld to) {
        String dim = to.getRegistryKey().getValue().toString();
        enqueueEvent("dimension", player.getUuid().toString(),
                player.getGameProfile().getName(), dim);
        reportSoon();
    }

    /** 死亡 —— 立即上报。detail 发伤害类型 id（如 minecraft:fall），前端查表译成中文。 */
    public void onDeath(LivingEntity entity, DamageSource source) {
        if (!(entity instanceof ServerPlayerEntity)) return;
        ServerPlayerEntity p = (ServerPlayerEntity) entity;
        String type = "";
        try {
            type = source.getTypeRegistryEntry().getKey()
                    .map(k -> k.getValue().toString())
                    .orElse("");
        } catch (Throwable ignored) {
            // 拿不到类型就算了
        }
        if (type.isEmpty()) {
            try {
                type = source.getName();
            } catch (Throwable ignored) {
                type = "death";
            }
        }
        enqueueEvent("death", p.getUuid().toString(), p.getGameProfile().getName(), trim(type, 120));
        reportSoon();
    }

    /* ── 成就（1.20.1 无事件，低频轮询） ───────────────── */

    /** 记下当前已完成的成就，作为基线（不产生事件）。 */
    private void rememberAdvancements(ServerPlayerEntity player) {
        if (!cfg.reportAdvancements) return;
        try {
            Set<String> seen = new HashSet<>();
            for (Advancement a : this.server.getAdvancementLoader().getAdvancements()) {
                AdvancementProgress pr = player.getAdvancementTracker().getProgress(a);
                if (pr != null && pr.isDone()) seen.add(a.getId().toString());
            }
            seenAdvancements.put(player.getUuid(), seen);
        } catch (Throwable ignored) {
            // 数据包未加载完等情况，忽略
        }
    }

    /** 由 tick 事件调用；内部自己控频，不会每 tick 都扫。 */
    public void tickAdvancements() {
        if (!cfg.reportAdvancements || cfg.advancementScanSeconds <= 0) return;
        long now = System.currentTimeMillis();
        if (now - lastAdvancementScan < cfg.advancementScanSeconds * 1000L) return;
        lastAdvancementScan = now;

        MinecraftServer srv = this.server;
        if (srv == null) return;
        for (ServerPlayerEntity p : srv.getPlayerManager().getPlayerList()) {
            UUID id = p.getUuid();
            Set<String> seen = seenAdvancements.get(id);
            if (seen == null) {
                rememberAdvancements(p);
                continue;
            }
            for (Advancement a : srv.getAdvancementLoader().getAdvancements()) {
                String aid = a.getId().toString();
                if (seen.contains(aid)) continue;
                AdvancementProgress pr;
                try {
                    pr = p.getAdvancementTracker().getProgress(a);
                } catch (Throwable t) {
                    continue;
                }
                if (pr == null || !pr.isDone()) continue;
                // 先看有没有 display：配方解锁这类进度 getDisplay() 为 null，不算「成就」
                AdvancementDisplay d = null;
                try {
                    d = a.getDisplay();
                } catch (Throwable ignored) {
                    // 拿不到就当没有
                }
                seen.add(aid);
                if (d == null) continue;
                String title = aid;
                String frame = "task";
                try {
                    title = trim(d.getTitle().getString(), 120);
                    frame = d.getFrame().getId();
                } catch (Throwable ignored) {
                    // 用 id 当标题
                }
                // detail 发进度 id（服务端语言是英文，前端用 data.js 里的中文表翻译）
                JsonObject ev = enqueueEvent("advancement", id.toString(), p.getGameProfile().getName(), trim(aid, 160));
                if (ev != null) {
                    ev.addProperty("frame", frame);
                    ev.addProperty("title", title);
                }
                reportSoon();
            }
        }
    }

    /* ── 事件队列 ────────────────────────────────────── */

    private JsonObject enqueueEvent(String type, String uuid, String name, String detail) {
        if (!cfg.reportEvents) return null;
        if (pendingEvents.size() >= 400) pendingEvents.poll(); // 极端情况下丢最旧的，不涨内存
        JsonObject e = new JsonObject();
        e.addProperty("type", type);
        e.addProperty("ts", System.currentTimeMillis());
        if (uuid != null) e.addProperty("uuid", uuid);
        if (name != null) e.addProperty("name", name);
        if (detail != null) e.addProperty("detail", detail);
        pendingEvents.add(e);
        return e;
    }

    private static String dimensionOf(ServerPlayerEntity p) {
        try {
            return p.getWorld().getRegistryKey().getValue().toString();
        } catch (Throwable ignored) {
            return null;
        }
    }

    /* ── 采集 + 发送 ──────────────────────────────────── */

    /** 立即上报一次（/sbs test）。不等待结果，只确认调度器还活着。 */
    public boolean reportNow() {
        ScheduledExecutorService s = this.scheduler;
        if (!running.get() || s == null || s.isShutdown()) return false;
        if (!cfg.ready()) return false;
        // 同一 tick 里可能连着触发「死亡 + 成就 + 维度」，合并成一次上报：
        // 先置位，真正执行时再清掉，期间到达的事件会一起进 payload。
        if (reportQueued) return true;
        reportQueued = true;
        try {
            s.execute(() -> {
                reportQueued = false;
                tickAndReport();
            });
        } catch (Exception ignored) {
            reportQueued = false;
            return false;
        }
        return true;
    }

    private void tickAndReport() {
        // 先摘掉「已排期」的引用：本方法既可能被排期的任务调用，也可能被
        // reportSoon/reportNow 插队调用。若不清空，任务执行中 reschedule()
        // 会看到 pending 未完成、且间隔相同，从而不再排下一次 —— 心跳就此停摆。
        this.pending = null;
        if (!running.get()) return;
        this.lastReportAt = System.currentTimeMillis();
        // 每 10 次心跳补发一次完整快照：万一某次「省略未变字段」被后端误判，
        // 最多 10 个心跳（默认 5 分钟）内一定自愈。
        if (heartbeatCount > 0 && heartbeatCount % 10 == 0) forceFull = true;
        if (!cfg.ready()) {
            reschedule();
            return;
        }
        MinecraftServer srv = this.server;
        if (srv == null) {
            reschedule();
            return;
        }

        JsonObject payload;
        List<JsonObject> batch = drainEvents();
        try {
            payload = buildPayload(srv, batch);
        } catch (Throwable t) {
            log.warn("[skyblock-status] 采集数据失败：{}", t.toString());
            reschedule();
            return;
        }

        String body = payload.toString();
        String url = cfg.backendUrl + "/api/v1/ingest";

        HttpRequest req;
        try {
            req = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(cfg.timeoutSeconds))
                    .header("Content-Type", "application/json; charset=utf-8")
                    .header("X-API-Key", cfg.apiKey)
                    .header("User-Agent", "SkyblockStatus/" + SkyblockStatus.MOD_VERSION)
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();
        } catch (Exception e) {
            fail("构建请求失败: " + e.getMessage());
            return;
        }

        http.sendAsync(req, HttpResponse.BodyHandlers.ofString())
                .orTimeout(cfg.timeoutSeconds + 4L, TimeUnit.SECONDS)
                .whenComplete((resp, err) -> {
                    if (err != null) {
                        fail("请求失败: " + rootMessage(err));
                        return;
                    }
                    int code = resp.statusCode();
                    if (code == 200) {
                        synchronized (this) {
                            failures = 0;
                            sentCount++;
                            lastSuccessAt = System.currentTimeMillis();
                            lastError = "";
                            // 这一批事件已经落库，从队列里移除（失败的会留着下次重发）
                            for (JsonObject e : batch) pendingEvents.remove(e);
                            // 提交「已发送的完整快照」，下次只发改动过的字段
                            lastSentPlayers.clear();
                            lastSentPlayers.putAll(pendingFull);
                            pendingFull = new HashMap<>();
                            forceFull = false;
                            heartbeatCount++;
                        }
                        if (sentCount == 1) {
                            log.info("[skyblock-status] 首次上报成功，网页上应该已经能看到在线状态了");
                        }
                        // 成功后必须重新排下一次心跳，否则只会发一次就静默停摆
                        reschedule();
                    } else if (code == 401) {
                        fail("apiKey 被拒绝（401），请检查配置文件里的 key 是否与后端一致");
                    } else {
                        fail("后端返回 " + code + ": " + trim(resp.body(), 200));
                    }
                });
    }

    private synchronized void fail(String msg) {
        failures++;
        lastError = msg;
        // 前两次完整记录，之后只记录次数，避免刷屏
        if (failures <= 2) {
            log.warn("[skyblock-status] 上报失败（第 {} 次）：{}", failures, msg);
        } else if (failures % 20 == 0) {
            log.warn("[skyblock-status] 已连续失败 {} 次，最后一次：{}", failures, msg);
        }
        reschedule();
    }

    /** 从队列里取一批事件（最多 100 条）打包进 payload；发送成功后再真正移除。 */
    private List<JsonObject> drainEvents() {
        List<JsonObject> out = new ArrayList<>();
        for (JsonObject e : pendingEvents) {
            out.add(e);
            if (out.size() >= 100) break;
        }
        return out;
    }

    private JsonObject buildPayload(MinecraftServer srv, List<JsonObject> events) {
        long now = System.currentTimeMillis();
        JsonObject root = new JsonObject();

        /* 服务器信息 */
        JsonObject s = new JsonObject();
        s.addProperty("id", cfg.serverId);
        String name = cfg.serverName != null && !cfg.serverName.isBlank()
                ? cfg.serverName
                : stripFormatting(srv.getServerMotd());
        s.addProperty("name", trim(name, 64));
        s.addProperty("motd", trim(stripFormatting(srv.getServerMotd()), 120));
        s.addProperty("version", srv.getVersion());
        s.addProperty("modVersion", SkyblockStatus.MOD_VERSION);
        s.addProperty("max", srv.getMaxPlayerCount());
        s.addProperty("startedAt", serverStartedAt);
        s.addProperty("uptimeSeconds", (now - serverStartedAt) / 1000);
        // 上报「当前实际用的间隔」而不是配置的常规间隔：
        // 空载时会上浮到 idleHeartbeatSeconds，后端据此动态放宽离线判定阈值。
        s.addProperty("heartbeatInterval", currentInterval());
        // 后端据此识别「服务端重启过」：变了就把残留的在线状态全部清掉
        s.addProperty("bootId", bootId);
        s.addProperty("stopping", stopping);

        float tickMs = srv.getTickTime();
        if (tickMs > 0) {
            // getTickTime 是「上一 tick 的毫秒数」，换算成近似 TPS
            double tps = Math.min(20.0, 1000.0 / tickMs);
            s.addProperty("tps", Math.round(tps * 100) / 100.0);
        }
        root.add("server", s);

        /* 在线玩家：列表 + 刚刚 join 但还没进列表的 */
        Map<UUID, ServerPlayerEntity> live = new java.util.LinkedHashMap<>();
        for (ServerPlayerEntity p : srv.getPlayerManager().getPlayerList()) {
            if (gone.contains(p.getUuid())) continue;
            live.put(p.getUuid(), p);
        }
        for (Map.Entry<UUID, ServerPlayerEntity> en : refs.entrySet()) {
            if (gone.contains(en.getKey())) continue;
            live.putIfAbsent(en.getKey(), en.getValue());
        }

        JsonArray arr = new JsonArray();
        Map<UUID, JsonObject> full = new HashMap<>();
        boolean fullNow = forceFull;
        for (ServerPlayerEntity p : live.values()) {
            UUID uid = p.getUuid();
            JsonObject o = new JsonObject();
            o.addProperty("uuid", uid.toString());
            o.addProperty("name", p.getGameProfile().getName());

            long joined = joinedAt.computeIfAbsent(uid, k -> now);
            o.addProperty("joinedAt", joined);

            if (cfg.reportDimension) {
                try {
                    o.addProperty("dimension", p.getWorld().getRegistryKey().getValue().toString());
                } catch (Throwable ignored) {
                    // 维度拿不到就不报
                }
            }
            if (cfg.reportPing) {
                try {
                    o.addProperty("ping", p.pingMilliseconds);
                } catch (Throwable ignored) {
                    // 忽略
                }
            }
            try {
                o.addProperty("gamemode", p.interactionManager.getGameMode().getName());
            } catch (Throwable ignored) {
                // 忽略
            }
            if (cfg.reportStats) {
                try {
                    o.addProperty("deaths", p.getStatHandler().getStat(Stats.CUSTOM.getOrCreateStat(Stats.DEATHS)));
                    o.addProperty("playTimeTicks", p.getStatHandler().getStat(Stats.CUSTOM.getOrCreateStat(Stats.PLAY_TIME)));
                } catch (Throwable ignored) {
                    // 忽略
                }
            }
            full.put(uid, o.deepCopy());
            arr.add(o);
        }

        // 增量上报：只把和上次不同的字段发出去。
        // 单次心跳从 ~250 B/人 降到通常 ~60 B/人（只剩 uuid + 变化的 ping）。
        // 人员变动（forceFull）、每 10 次心跳、以及刚启动时发全量。
        if (!fullNow) {
            for (int i = 0; i < arr.size(); i++) {
                JsonObject cur = arr.get(i).getAsJsonObject();
                UUID uid;
                try {
                    uid = UUID.fromString(cur.get("uuid").getAsString());
                } catch (Exception e) {
                    continue;
                }
                JsonObject prev = lastSentPlayers.get(uid);
                if (prev == null) continue; // 新玩家 → 保持全量
                JsonObject slim = new JsonObject();
                slim.add("uuid", cur.get("uuid"));
                for (String k : cur.keySet()) {
                    if (k.equals("uuid")) continue;
                    if (!prev.has(k) || !prev.get(k).equals(cur.get(k))) {
                        slim.add(k, cur.get(k));
                    }
                }
                arr.set(i, slim);
            }
        }
        pendingFull = full;
        root.add("players", arr);

        /* 事件流：上线/下线/维度切换/死亡/成就 */
        if (events != null && !events.isEmpty()) {
            JsonArray evs = new JsonArray();
            for (JsonObject e : events) evs.add(e);
            root.add("events", evs);
        }
        return root;
    }

    /* ── 网络诊断（/sbs diag） ────────────────────────── */

    /**
     * 把「DNS → TCP → HTTPS」拆成三步分别测试，直接指出卡在哪一层。
     * 会在调度线程上跑（不占主线程），结果通过回调交回主线程输出。
     */
    public void diagnoseAsync(java.util.function.Consumer<String> done) {
        ScheduledExecutorService s = this.scheduler;
        if (s == null || s.isShutdown()) {
            done.accept("上报器未运行（配置未就绪？先 /sbs reload）");
            return;
        }
        s.execute(() -> {
            String text;
            try {
                text = diagnose();
            } catch (Throwable t) {
                text = "诊断过程异常: " + rootMessage(t);
            }
            done.accept(text);
        });
    }

    private String diagnose() {
        StringBuilder sb = new StringBuilder();
        String base = cfg.backendUrl == null ? "" : cfg.backendUrl.trim();
        if (base.isEmpty()) return "backendUrl 为空，先在配置文件里填写（或 /sbs url <地址>）";

        URI uri;
        try {
            uri = URI.create(base);
        } catch (Exception e) {
            return "backendUrl 不是合法 URL：" + base;
        }
        String scheme = uri.getScheme() == null ? "http" : uri.getScheme().toLowerCase();
        String host = uri.getHost();
        if (host == null) return "URL 里没有主机名：" + base;
        int port = uri.getPort() > 0 ? uri.getPort() : ("https".equals(scheme) ? 443 : 80);
        int timeoutMs = Math.max(1000, Math.min(cfg.timeoutSeconds, 30) * 1000);

        sb.append("目标  ").append(base).append('\n');
        sb.append("      ").append(scheme).append(" · ").append(host).append(':').append(port)
          .append(" · 超时 ").append(timeoutMs / 1000).append("s\n");

        /* ① DNS */
        long t0 = System.currentTimeMillis();
        InetAddress[] addrs;
        try {
            addrs = InetAddress.getAllByName(host);
        } catch (Exception e) {
            sb.append("① DNS    ✗ ").append(rootMessage(e))
              .append("  (").append(System.currentTimeMillis() - t0).append("ms)\n");
            sb.append("   ⇒ 服务器无法解析这个域名。检查 /etc/resolv.conf，或改用 IP 直连。\n");
            return sb.toString();
        }
        sb.append("① DNS    ✓ ").append(addrs.length).append(" 条  (")
          .append(System.currentTimeMillis() - t0).append("ms)\n");
        for (InetAddress a : addrs) sb.append("         ").append(a.getHostAddress()).append('\n');

        /* 是否解析到自己身上（云服务器常见的 NAT 回环问题） */
        List<String> local = localAddresses();
        boolean self = false;
        for (InetAddress a : addrs) {
            if (local.contains(a.getHostAddress())) self = true;
        }

        /* ② TCP */
        boolean tcpOk = false;
        String tcpErr = "";
        for (InetAddress a : addrs) {
            t0 = System.currentTimeMillis();
            try (Socket sock = new Socket()) {
                sock.connect(new InetSocketAddress(a, port), timeoutMs);
                sb.append("② TCP    ✓ ").append(a.getHostAddress()).append(':').append(port)
                  .append("  (").append(System.currentTimeMillis() - t0).append("ms)\n");
                tcpOk = true;
                break;
            } catch (Exception e) {
                tcpErr = rootMessage(e);
                sb.append("② TCP    ✗ ").append(a.getHostAddress()).append(':').append(port)
                  .append("  (").append(System.currentTimeMillis() - t0).append("ms) ")
                  .append(tcpErr).append('\n');
            }
        }
        if (!tcpOk) {
            sb.append("   ⇒ TCP 握手失败，请求根本没到 nginx。按顺序排查：\n");
            if (self) {
                sb.append("     · ⚠ 这个域名解析到了本机地址 —— 云服务器常不支持 NAT 回环（hairpin），\n");
                sb.append("       同机访问自己的公网 IP 会超时。把 backendUrl 改成 http://127.0.0.1:8787 试试。\n");
            }
            sb.append("     · 云厂商安全组是否放行 ").append(port).append(" 端口\n");
            sb.append("     · 本机防火墙 ufw/firewalld 是否放行\n");
            sb.append("     · nginx 是否在监听（ss -lntp | grep ").append(port).append("）\n");
            sb.append("     · 出网方向是否被限制（部分机房封 443 出站）\n");
            return sb.toString();
        }

        /* ③ HTTPS */
        t0 = System.currentTimeMillis();
        try {
            HttpClient probe = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(Math.min(cfg.timeoutSeconds, 10)))
                    .followRedirects(HttpClient.Redirect.NORMAL)
                    .build();
            HttpRequest req = HttpRequest.newBuilder(URI.create(base + "/api/health"))
                    .timeout(Duration.ofSeconds(cfg.timeoutSeconds))
                    .header("User-Agent", "SkyblockStatus/" + SkyblockStatus.MOD_VERSION)
                    .GET()
                    .build();
            HttpResponse<String> resp = probe.send(req, HttpResponse.BodyHandlers.ofString());
            long ms = System.currentTimeMillis() - t0;
            sb.append("③ HTTPS  ✓ ").append(resp.statusCode()).append("  (").append(ms).append("ms)\n");
            String body = resp.body() == null ? "" : resp.body().trim();
            if (body.length() > 200) body = body.substring(0, 200) + "…";
            sb.append("         ").append(body.isEmpty() ? "(空响应)" : body).append('\n');
            if (resp.statusCode() != 200) {
                sb.append("   ⇒ 能连上但 /api/health 返回 ").append(resp.statusCode())
                  .append("，检查 nginx 的 location 是否把 /api/ 转发到 Node。\n");
            } else {
                sb.append("   ⇒ 链路通畅。若仍不上报，检查 apiKey 是否正确（/sbs test 看返回）。\n");
            }
        } catch (Exception e) {
            sb.append("③ HTTPS  ✗ ").append(rootMessage(e))
              .append("  (").append(System.currentTimeMillis() - t0).append("ms)\n");
            sb.append("   ⇒ TCP 通了但 TLS/HTTP 失败：证书域名不匹配、证书过期、\n");
            sb.append("     或 JVM 时间不对（用 date 检查）。\n");
        }
        return sb.toString();
    }

    /** 本机所有网卡地址，用于判断域名是否解析到自己。 */
    private static List<String> localAddresses() {
        List<String> out = new ArrayList<>();
        try {
            for (NetworkInterface ni : Collections.list(NetworkInterface.getNetworkInterfaces())) {
                if (!ni.isUp()) continue;
                for (InetAddress a : Collections.list(ni.getInetAddresses())) {
                    out.add(a.getHostAddress());
                }
            }
        } catch (Exception ignored) {
            // 拿不到就算了，只是少一条提示
        }
        return out;
    }

    /* ── 状态摘要（/sbs status） ──────────────────────── */

    public synchronized String describeRuntime() {
        StringBuilder sb = new StringBuilder();
        sb.append("运行: ").append(running.get() ? "是" : "否")
          .append("   已发送: ").append(sentCount).append(" 次")
          .append("   连续失败: ").append(failures).append(" 次");
        if (lastSuccessAt > 0) {
            sb.append("   上次成功: ").append((System.currentTimeMillis() - lastSuccessAt) / 1000).append(" 秒前");
        }
        if (!lastError.isEmpty()) {
            sb.append("\n最后错误: ").append(lastError);
        }
        return sb.toString();
    }

    /* ── 小工具 ───────────────────────────────────────── */

    /** 去掉 §x 颜色代码。 */
    public static String stripFormatting(String s) {
        if (s == null) return "";
        return s.replaceAll("(?i)\u00a7[0-9a-fk-or]", "");
    }

    private static String trim(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max);
    }

    private static String rootMessage(Throwable t) {
        Throwable c = t;
        while (c.getCause() != null && c.getCause() != c) c = c.getCause();
        String m = c.getMessage();
        return c.getClass().getSimpleName() + (m == null ? "" : ": " + m);
    }

    public StatusConfig config() {
        return cfg;
    }
}
