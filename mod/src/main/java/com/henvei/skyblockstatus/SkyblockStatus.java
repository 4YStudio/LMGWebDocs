package com.henvei.skyblockstatus;

import net.fabricmc.api.DedicatedServerModInitializer;
import net.fabricmc.fabric.api.entity.event.v1.ServerEntityWorldChangeEvents;
import net.fabricmc.fabric.api.entity.event.v1.ServerLivingEntityEvents;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerLifecycleEvents;
import net.fabricmc.fabric.api.event.lifecycle.v1.ServerTickEvents;
import net.fabricmc.fabric.api.networking.v1.ServerPlayConnectionEvents;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.server.network.ServerPlayerEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * SkyblockStatus —— 把服务器在线状态上报给自建 Node 后端。
 *
 * 只做服务端：客户端装不装都不影响，也不会给客户端发任何东西。
 */
public final class SkyblockStatus implements DedicatedServerModInitializer {

    public static final String MOD_ID = "skyblock-status";
    public static final String MOD_VERSION = "0.1.0";
    public static final Logger LOG = LoggerFactory.getLogger("SkyblockStatus");

    public static volatile boolean DEBUG = false;

    private static StatusReporter reporter;

    @Override
    public void onInitializeServer() {
        // 只在专用服务端生效；集成服务器（单人游戏）不启用，避免把单人存档当服务器上报
        if (FabricLoader.getInstance().getEnvironmentType()
                != net.fabricmc.api.EnvType.SERVER) {
            LOG.info("[skyblock-status] 非专用服务端环境，跳过初始化");
            return;
        }

        StatusConfig cfg = StatusConfig.load(FabricLoader.getInstance().getConfigDir(), LOG);
        reporter = new StatusReporter(LOG, cfg);

        /* 服务端生命周期 */
        ServerLifecycleEvents.SERVER_STARTED.register(reporter::start);
        ServerLifecycleEvents.SERVER_STOPPING.register(srv -> {
            LOG.info("[skyblock-status] 服务器正在关闭，先通知后端全员下线");
            // 先发关闭通知（stopping=true + 空玩家列表），再停调度器
            reporter.shutdownAndReport();
            reporter.stop();
        });

        /* 玩家进出 */
        ServerPlayConnectionEvents.JOIN.register((handler, sender, server) -> {
            ServerPlayerEntity player = handler.player;
            if (player != null) reporter.onJoin(player);
            if (DEBUG) LOG.info("[skyblock-status] {} 加入", player != null ? player.getGameProfile().getName() : "?");
        });
        ServerPlayConnectionEvents.DISCONNECT.register((handler, server) -> {
            ServerPlayerEntity player = handler.player;
            if (player != null) reporter.onLeave(player);
            if (DEBUG) LOG.info("[skyblock-status] {} 离开", player != null ? player.getGameProfile().getName() : "?");
        });

        /* 维度切换（下界/末地/回主世界） */
        ServerEntityWorldChangeEvents.AFTER_PLAYER_CHANGE_WORLD.register(
                (player, origin, target) -> reporter.onDimensionChange(player, origin, target));

        /* 死亡 */
        ServerLivingEntityEvents.AFTER_DEATH.register(reporter::onDeath);

        /* 成就：1.20.1 没有「获得成就」事件，用 tick 里低频轮询 */
        ServerTickEvents.END_SERVER_TICK.register(srv -> reporter.tickAdvancements());

        /* 命令 */
        StatusCommand.register(reporter);

        LOG.info("[skyblock-status] v{} 已加载，配置文件：{}", MOD_VERSION,
                cfg.file() == null ? "?" : cfg.file().toString());
    }

    public static StatusReporter reporter() {
        return reporter;
    }

}
