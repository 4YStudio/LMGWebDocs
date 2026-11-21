#!/usr/bin/env bash
# 离线构建 SkyblockStatus（不依赖 Gradle / Loom / 网络）
#
# 原理：用本地已缓存的
#   · MC 1.20.1 命名映射 jar（yarn build.10）
#   · fabric-loader + fabric-api（remapped 到 named）
#   · gson / authlib / brigadier / slf4j
# 做 javac，然后用 tiny-remapper 把 named → intermediary 重映射，
# 最后打成一个普通的 fabric mod jar。
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD="$HERE/build"
SRC="$HERE/src/main/java"
RES="$HERE/src/main/resources"

YARN="net.fabricmc.yarn.1_20_1.1.20.1+build.10-v2"
MCNAMED="$HOME/.gradle/caches/fabric-loom/minecraftMaven/net/minecraft/minecraft-merged/1.20.1-$YARN/minecraft-merged-1.20.1-$YARN.jar"
MCINTER="$HOME/.gradle/caches/fabric-loom/minecraftMaven/net/minecraft/minecraft-merged-intermediary/1.20.1-$YARN/minecraft-merged-intermediary-1.20.1-$YARN.jar"
MAPPINGS="$HOME/.gradle/caches/fabric-loom/1.20.1/$YARN/mappings.tiny"
LOADER="$HOME/.gradle/caches/modules-2/files-2.1/net.fabricmc/fabric-loader/0.15.11/9c2be53d84ec5c4fb58bb5b8d9c8a629047c9ee9/fabric-loader-0.15.11.jar"
# 可覆盖：FAPI_DIR 指向任意已 remap 到 named 的 fabric-api jar 目录
FAPI_DIR="${FAPI_DIR:-$HOME/.gradle/caches/fabric-loom/remapped_working}"
# 可覆盖：LIBS 指向存放 gson/authlib/brigadier/slf4j 等依赖 jar 的目录
LIBS="${LIBS:-$HOME/.local/share/minecraft-libraries}"

missing() { echo "缺少文件: $1" >&2; exit 1; }
[ -f "$MCNAMED" ]  || missing "$MCNAMED"
[ -f "$MCINTER" ]  || missing "$MCINTER"
[ -f "$MAPPINGS" ] || missing "$MAPPINGS"
[ -f "$LOADER" ]   || missing "$LOADER"

CP="$MCNAMED:$LOADER"
if [ -d "$FAPI_DIR" ]; then
  while IFS= read -r j; do CP="$CP:$j"; done < <(find "$FAPI_DIR" -maxdepth 1 -name '*.jar' ! -name '*sources*' | sort)
fi
for j in $(find "$LIBS" -name 'gson-2.10*.jar' -o -name 'authlib-4.0.43.jar' \
              -o -name 'brigadier-1.1.8.jar' -o -name 'slf4j-api-2.0.1.jar' \
              -o -name 'guava-31.1-jre.jar' 2>/dev/null | grep -v sources | sort -u); do
  CP="$CP:$j"
done

echo "== 1/4 清理 =="
rm -rf "$BUILD"
mkdir -p "$BUILD/classes" "$BUILD/remapped"

echo "== 2/4 javac =="
find "$SRC" -name '*.java' > "$BUILD/sources.txt"
javac -proc:none --release 17 -encoding UTF-8 -nowarn \
      -cp "$CP" -d "$BUILD/classes" @"$BUILD/sources.txt"
echo "   编译完成：$(find "$BUILD/classes" -name '*.class' | wc -l) 个 class"

echo "== 3/4 重映射 named → intermediary =="
TRCP="$(cat "$HERE/../.trcp" 2>/dev/null || true)"
if [ -z "$TRCP" ]; then
  TR=$(find "$HOME/.gradle/caches/modules-2/files-2.1/net.fabricmc/tiny-remapper" -name 'tiny-remapper-*.jar' | grep -v sources | sort | tail -1)
  MIO=$(find "$HOME/.gradle/caches/modules-2/files-2.1/net.fabricmc/mapping-io" -name 'mapping-io-*.jar' | grep -v sources | sort | tail -1)
  TMP=$(find "$HOME/.gradle/caches/modules-2/files-2.1/net.fabricmc/tiny-mappings-parser" -name '*.jar' | grep -v sources | sort | tail -1)
  ASM=""
  for a in asm asm-commons asm-analysis asm-tree asm-util; do
    ASM="$ASM:$(find "$HOME/.gradle/caches/modules-2/files-2.1/org.ow2.asm/$a/9.6" -name "*.jar" | grep -v -e sources -e javadoc | head -1)"
  done
  TRCP="$TR$ASM:$TMP:$MIO"
fi
# 注意：classpath 必须用【named】命名空间的 jar。
# 若传 intermediary jar，tiny-remapper 只能解析类名、无法解析成员名，
# 结果是类被重映射成 class_XXXX 而方法/字段仍是 literal/argument，
# 运行时会 NoSuchMethodError。
TR_CP_ARGS=("$MCNAMED")
if [ -d "$FAPI_DIR" ]; then
  while IFS= read -r j; do TR_CP_ARGS+=("$j"); done < <(find "$FAPI_DIR" -maxdepth 1 -name '*.jar' ! -name '*sources*' | sort)
fi
for j in $(find "$LIBS" -name 'gson-2.10*.jar' -o -name 'authlib-4.0.43.jar' \
              -o -name 'brigadier-1.1.8.jar' -o -name 'slf4j-api-2.0.1.jar' \
              -o -name 'guava-31.1-jre.jar' 2>/dev/null | grep -v sources | sort -u); do
  TR_CP_ARGS+=("$j")
done
java -cp "$TRCP" net.fabricmc.tinyremapper.Main \
     "$BUILD/classes" "$BUILD/remapped" "$MAPPINGS" named intermediary "${TR_CP_ARGS[@]}"

# 自检：确认成员名已被重映射（否则打包出去必然崩溃）
if javap -p -c "$BUILD/remapped/com/henvei/skyblockstatus/StatusCommand.class" 2>/dev/null \
     | grep -qE 'class_2170\.(literal|argument)\b'; then
  echo "   ✗ 重映射失败：class_2170 的成员仍是 named 名（literal/argument）" >&2
  exit 1
fi
echo "   ✓ 成员重映射校验通过"

echo "== 4/4 打包 =="
mkdir -p "$BUILD/jar"
cp -r "$BUILD/remapped/." "$BUILD/jar/"
[ -d "$RES" ] && cp -r "$RES/." "$BUILD/jar/"
OUT="$BUILD/skyblock-status-0.1.0.jar"
(cd "$BUILD/jar" && jar --create --file "$OUT" --main-class=com.henvei.skyblockstatus.SkyblockStatus . 2>/dev/null || jar cf "$OUT" .)
echo "   产物：$OUT ($(du -h "$OUT" | cut -f1))"
