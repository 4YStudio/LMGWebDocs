package com.henvei.skyblockstatus;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import net.fabricmc.loader.api.FabricLoader;
import org.slf4j.Logger;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * 模组配置。首次启动时生成 config/skyblock-status.json。
 *
 * 必须填写 apiKey 才会真正上报 —— 这是「对接凭证」，
 * 由后端 `node server/src/server.js --init-key <serverId>` 生成。
 */
public final class StatusConfig {

    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();

    /* ── 可配置项 ─────────────────────────────────────── */

    /** 总开关。关掉后不再发送任何请求。 */
    public boolean enabled = true;

    /** Node 后端地址，不含结尾斜杠。 */
    public String backendUrl = "http://127.0.0.1:8787";

    /** 后端登记的服务器 id，需与 --init-key 时一致。 */
    public String serverId = "default";

    /** 对接 key。留空 = 不上报。 */
    public String apiKey = "";

    /** 显示在网页上的服务器名；留空则用 MOTD。 */
    public String serverName = "";

    /** 心跳间隔（秒），建议 15–60。后端会据此判断离线。 */
    public int heartbeatSeconds = 30;

    /**
     * 没人在线时的心跳间隔（秒）。
     *
     * 空岛服务器大部分时间没人，这时没必要每 30 秒重复上报一份空列表。
     * 默认 120 秒：空载流量直接降到 1/4。有人上线会立刻恢复 heartbeatSeconds。
     */
    public int idleHeartbeatSeconds = 120;

    /** 单次请求超时（秒）。 */
    public int timeoutSeconds = 8;

    /** 是否上报所在维度。 */
    public boolean reportDimension = true;

    /** 是否上报延迟。 */
    public boolean reportPing = true;

    /** 是否上报死亡次数与游戏内时长统计。 */
    public boolean reportStats = true;

    /** 首次生成配置文件时写在文件里的说明（不会覆盖用户改动）。 */
    public String note = "";

    /* ── 事件上报 ─────────────────────────────────────── */

    /** 是否在玩家上线/下线/维度切换/死亡/成就时立即上报（而不是等下一次心跳）。 */
    public boolean reportEvents = true;

    /** 成就扫描间隔（秒）。1.20.1 没有成就获得事件，只能低频轮询。0 = 关闭成就上报。 */
    public int advancementScanSeconds = 5;

    /** 是否上报成就（玩家名 + 成就名会出现在网页动态里）。 */
    public boolean reportAdvancements = true;

    /* ── 运行时 ───────────────────────────────────────── */

    private transient Path file;

    public static StatusConfig load(Path dir, Logger log) {
        StatusConfig cfg = new StatusConfig();
        Path path = dir.resolve("skyblock-status.json");
        cfg.file = path;

        if (Files.exists(path)) {
            try {
                String text = new String(Files.readAllBytes(path), StandardCharsets.UTF_8);
                StatusConfig loaded = GSON.fromJson(text, StatusConfig.class);
                if (loaded != null) {
                    loaded.file = path;
                    cfg = loaded;
                }
            } catch (Exception e) {
                log.error("[skyblock-status] 读取配置失败，将使用默认值：{}", e.toString());
            }
        } else {
            cfg.note = "把 apiKey 填成后端 `--init-key` 输出的 key，就会开始上报。"
                    + "backendUrl 指向你的 Node 服务（默认本机 8787）。";
            cfg.save();
            log.info("[skyblock-status] 已生成配置文件：{}", path);
        }

        cfg.normalise();
        return cfg;
    }

    private void normalise() {
        if (backendUrl == null) backendUrl = "";
        while (backendUrl.endsWith("/")) {
            backendUrl = backendUrl.substring(0, backendUrl.length() - 1);
        }
        if (serverId == null || serverId.isBlank()) serverId = "default";
        if (apiKey == null) apiKey = "";
        apiKey = apiKey.trim();
        if (heartbeatSeconds < 5) heartbeatSeconds = 5;
        if (heartbeatSeconds > 600) heartbeatSeconds = 600;
        if (idleHeartbeatSeconds < heartbeatSeconds) idleHeartbeatSeconds = heartbeatSeconds;
        if (idleHeartbeatSeconds > 1800) idleHeartbeatSeconds = 1800;
        if (timeoutSeconds < 1) timeoutSeconds = 1;
        if (timeoutSeconds > 60) timeoutSeconds = 60;
    }

    public void save() {
        try {
            Files.createDirectories(file.getParent());
            Files.write(file, GSON.toJson(this).getBytes(StandardCharsets.UTF_8));
        } catch (IOException e) {
            // 交给调用方打日志
        }
    }

    public Path file() {
        return file;
    }

    /** 配置是否完整到可以上报。 */
    public boolean ready() {        return enabled && !apiKey.isEmpty() && !backendUrl.isEmpty() && !serverId.isEmpty();
    }

    /** 给 /sbs status 用的人类可读摘要（隐藏 key）。 */
    public List<String> describe() {
        List<String> out = new ArrayList<>();
        out.add("开关: " + (enabled ? "开启" : "关闭"));
        out.add("后端: " + (backendUrl.isEmpty() ? "(未填写)" : backendUrl));
        out.add("服务器 id: " + serverId);
        out.add("apiKey: " + (apiKey.isEmpty() ? "(未填写，不会上报)" : mask(apiKey)));
        out.add("心跳: " + heartbeatSeconds + " 秒（空载 " + idleHeartbeatSeconds
                + " 秒）   超时: " + timeoutSeconds + " 秒");
        out.add("上报维度: " + reportDimension + "   延迟: " + reportPing + "   统计: " + reportStats);
        out.add("配置文件: " + (file == null ? "?" : file.toString()));
        return out;
    }

    public static String mask(String key) {
        if (key.length() <= 10) return "****";
        return key.substring(0, 6) + "…" + key.substring(key.length() - 4);
    }

    /** 供 /sbs reload 使用：重新读盘。 */
    public static StatusConfig reload(StatusConfig old, Logger log) {
        Path dir = FabricLoader.getInstance().getConfigDir();
        StatusConfig fresh = load(dir, log);
        return fresh;
    }

    /** 调试用：把自身序列化成 JSON。 */
    public JsonObject toJson() {
        return JsonParser.parseString(GSON.toJson(this)).getAsJsonObject();
    }
}
