package com.henvei.skyblockstatus;

import com.mojang.brigadier.CommandDispatcher;
import com.mojang.brigadier.arguments.BoolArgumentType;
import com.mojang.brigadier.arguments.StringArgumentType;
import net.fabricmc.fabric.api.command.v2.CommandRegistrationCallback;
import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.server.command.CommandManager;
import net.minecraft.server.command.ServerCommandSource;
import net.minecraft.text.Text;
import net.minecraft.util.Formatting;

import static net.minecraft.server.command.CommandManager.argument;
import static net.minecraft.server.command.CommandManager.literal;

/**
 * /sbs 命令组 —— 让服主不用重启服务器就能排查上报问题。
 *
 *   /sbs status          当前配置与运行状态
 *   /sbs test            立刻上报一次，返回结果
 *   /sbs reload          重新读取配置文件
 *   /sbs on | off        临时开关上报（不写入配置文件）
 *   /sbs key <key>       直接设置 apiKey 并写盘
 *   /sbs url <url>       直接设置后端地址并写盘
 */
public final class StatusCommand {

    private StatusCommand() {
    }

    public static void register(StatusReporter reporter) {
        CommandRegistrationCallback.EVENT.register((dispatcher, registryAccess, environment) ->
                build(dispatcher, reporter));
    }

    private static void build(CommandDispatcher<ServerCommandSource> dispatcher, StatusReporter reporter) {
        dispatcher.register(literal("sbs")
                .requires(src -> src.hasPermissionLevel(2))

                .then(literal("status").executes(ctx -> {
                    StatusConfig cfg = reporter.config();
                    feedback(ctx.getSource(), "── SkyblockStatus ──");
                    for (String line : cfg.describe()) {
                        feedback(ctx.getSource(), "  " + line);
                    }
                    for (String line : reporter.describeRuntime().split("\n")) {
                        feedback(ctx.getSource(), "  " + line);
                    }
                    return 1;
                }))

                .then(literal("test").executes(ctx -> {
                    if (!reporter.config().ready()) {
                        error(ctx.getSource(), "配置不完整：请先填写 apiKey（/sbs key <key>）");
                        return 0;
                    }
                    boolean ok = reporter.reportNow();
                    if (ok) {
                        feedback(ctx.getSource(), "已触发一次上报，稍后看日志或 /sbs status 确认结果");
                        return 1;
                    }
                    error(ctx.getSource(), "上报器未运行，检查配置文件后 /sbs reload");
                    return 0;
                }))

                .then(literal("reload").executes(ctx -> {
                    StatusConfig fresh = StatusConfig.load(
                            FabricLoader.getInstance().getConfigDir(), SkyblockStatus.LOG);
                    reporter.updateConfig(fresh);
                    feedback(ctx.getSource(), "已重新读取配置文件："
                            + fresh.file());
                    if (!fresh.ready()) {
                        error(ctx.getSource(), "注意：apiKey 仍为空，不会上报");
                    }
                    return 1;
                }))

                .then(literal("on").executes(ctx -> {
                    reporter.config().enabled = true;
                    reporter.config().save();
                    feedback(ctx.getSource(), "上报已开启");
                    return 1;
                }))

                .then(literal("off").executes(ctx -> {
                    reporter.config().enabled = false;
                    reporter.config().save();
                    feedback(ctx.getSource(), "上报已关闭");
                    return 1;
                }))

                .then(literal("key")
                        .then(argument("value", StringArgumentType.string())
                                .executes(ctx -> {
                                    String key = StringArgumentType.getString(ctx, "value");
                                    reporter.config().apiKey = key;
                                    reporter.config().save();
                                    reporter.updateConfig(reporter.config());
                                    feedback(ctx.getSource(), "apiKey 已更新为 "
                                            + StatusConfig.mask(key) + "，并写入配置文件");
                                    return 1;
                                })))

                .then(literal("url")
                        .then(argument("value", StringArgumentType.greedyString())
                                .executes(ctx -> {
                                    String url = StringArgumentType.getString(ctx, "value");
                                    reporter.config().backendUrl = url;
                                    reporter.config().save();
                                    reporter.updateConfig(reporter.config());
                                    feedback(ctx.getSource(), "后端地址已更新为 " + url);
                                    return 1;
                                })))

                .then(literal("diag").executes(ctx -> {
                    ServerCommandSource src = ctx.getSource();
                    feedback(src, "开始诊断 " + reporter.config().backendUrl + " ……");
                    reporter.diagnoseAsync(result -> {
                        // 网络检测在调度线程跑，结果回到主线程再回显
                        src.getServer().execute(() -> {
                            for (String line : result.split("\n")) {
                                feedback(src, "  " + line);
                            }
                        });
                    });
                    return 1;
                }))

                .then(literal("debug")
                        .then(argument("on", BoolArgumentType.bool())
                                .executes(ctx -> {
                                    boolean on = BoolArgumentType.getBool(ctx, "on");
                                    SkyblockStatus.DEBUG = on;
                                    feedback(ctx.getSource(), "调试日志：" + (on ? "开" : "关"));
                                    return 1;
                                })))
        );
    }

    private static void feedback(ServerCommandSource src, String msg) {
        src.sendFeedback(() -> Text.literal(msg), false);
    }

    private static void error(ServerCommandSource src, String msg) {
        src.sendError(Text.literal(msg).formatted(Formatting.RED));
    }
}
