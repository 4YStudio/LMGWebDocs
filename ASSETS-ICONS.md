# 配方图标素材清单（已完成）

> **状态：已处理完毕。** 你把素材放在 `site/assets/icon/`（混用 png/webp、尺寸 128–300px），
> 我已统一转成 **64×64 透明 PNG** 输出到 `site/assets/items/`，并在 `site/data.js` 的
> `DATA.itemIcons` 里完成中文名 → 文件名映射，配方 3×3 网格已用图片渲染。
>
> 下面是原始清单，留作后续增补配方的参考。


## 一、格式要求

| 项目 | 要求 |
| --- | --- |
| 格式 | PNG，**透明背景**（不要白底、不要截图带边框） |
| 尺寸 | 32×32 或 64×64 最佳（16×16 也可以，我会用 `image-rendering: pixelated` 放大，不会糊） |
| 内容 | 只要物品本体，不要格子边框、不要数量角标 |
| 命名 | 严格照下表，例如 `coal_ore.png`、`gold_ingot.png` |

> 如果你只能拿到 16×16 的，也完全没问题，直接放进来就行。

---

## 二、下载来源建议

1. **Minecraft Wiki（推荐，最干净）**
   `https://zh.minecraft.wiki/w/煤炭` → 右侧物品图标 → 右键「图片另存为」
   文件名改成表里的名字即可。
2. **mcmod.cn**（国内可直连）
   搜索物品中文名 → 物品页 → 图标右键保存。
3. **自己游戏内截图裁切**
   F3+H 打开高级提示，物品栏里截图，裁成正方形、去背景。

⚠️ 注意：**矿石要区分「石头版」和「深板岩版」**，外观不同，别下错。

---

## 三、完整清单（43 张）

### 1. 矿石产物（19 张）

| # | 中文名 | 文件名 | 备注 |
| --- | --- | --- | --- |
| 1 | 煤矿石 | `coal_ore.png` | 石头底 |
| 2 | 铜矿石 | `copper_ore.png` | 石头底 |
| 3 | 钻石矿石 | `diamond_ore.png` | 石头底 |
| 4 | 绿宝石矿石 | `emerald_ore.png` | 石头底 |
| 5 | 金矿石 | `gold_ore.png` | 石头底 |
| 6 | 铁矿石 | `iron_ore.png` | 石头底 |
| 7 | 青金石矿石 | `lapis_ore.png` | 石头底 |
| 8 | 红石矿石 | `redstone_ore.png` | 石头底 |
| 9 | 下界金矿石 | `nether_gold_ore.png` | 下界岩底 |
| 10 | 下界石英矿石 | `nether_quartz_ore.png` | 下界岩底 |
| 11 | 深层煤矿石 | `deepslate_coal_ore.png` | **深板岩底** |
| 12 | 深层铜矿石 | `deepslate_copper_ore.png` | **深板岩底** |
| 13 | 深层钻石矿石 | `deepslate_diamond_ore.png` | **深板岩底** |
| 14 | 深层绿宝石矿石 | `deepslate_emerald_ore.png` | **深板岩底** |
| 15 | 深层金矿石 | `deepslate_gold_ore.png` | **深板岩底** |
| 16 | 深层铁矿石 | `deepslate_iron_ore.png` | **深板岩底** |
| 17 | 深层青金石矿石 | `deepslate_lapis_ore.png` | **深板岩底** |
| 18 | 深层红石矿石 | `deepslate_redstone_ore.png` | **深板岩底** |
| 19 | 方解石 | `calcite.png` | 高炉产物 |

### 2. 矿石配方用的材料（13 张）

| # | 中文名 | 文件名 | 备注 |
| --- | --- | --- | --- |
| 20 | 石头 | `stone.png` | 9 个矿石配方共用 |
| 21 | 深板岩 | `deepslate.png` | 8 个深层矿石共用 |
| 22 | 下界岩 | `netherrack.png` | 下界矿石 + 锻造模板共用 |
| 23 | 煤炭 | `coal.png` | 物品形态，不是煤炭块 |
| 24 | 铜块 | `copper_block.png` | 方块形态 |
| 25 | 钻石 | `diamond.png` | |
| 26 | 绿宝石 | `emerald.png` | |
| 27 | 金锭 | `gold_ingot.png` | 物品形态，不是金块 |
| 28 | 铁锭 | `iron_ingot.png` | 物品形态，不是铁块 |
| 29 | 青金石块 | `lapis_block.png` | 方块形态 |
| 30 | 红石块 | `redstone_block.png` | 方块形态 |
| 31 | 下界石英 | `quartz.png` | 物品形态 |
| 32 | 闪长岩 | `diorite.png` | 高炉输入 |

### 3. 马铠（6 张）

| # | 中文名 | 文件名 | 备注 |
| --- | --- | --- | --- |
| 33 | 钻石马铠 | `diamond_horse_armor.png` | 产物 |
| 34 | 金马铠 | `golden_horse_armor.png` | 产物 |
| 35 | 铁马铠 | `iron_horse_armor.png` | 产物 |
| — | （钻石 / 金锭 / 铁锭） | 已在上面第 25、27、28 号 | 材料复用 |

### 4. 锻造模板（3 张）

| # | 中文名 | 文件名 | 备注 |
| --- | --- | --- | --- |
| 36 | 下界合金升级锻造模板 | `netherite_upgrade_smithing_template.png` | 产物兼材料 |
| 37 | 下界合金锭 | `netherite_ingot.png` | 材料 |

### 5. 其他（4 张）

| # | 中文名 | 文件名 | 备注 |
| --- | --- | --- | --- |
| 38 | 发光浆果 | `glow_berries.png` | 产物 |
| 39 | 甜浆果 | `sweet_berries.png` | 材料 |
| 40 | 荧光墨囊 | `glow_ink_sac.png` | 材料 |
| 41 | 凝灰岩 | `tuff.png` | 高炉产物 |

### 6. 可选（2 张，有更好）

| # | 中文名 | 文件名 | 用途 |
| --- | --- | --- | --- |
| 42 | 安山岩 | `andesite.png` | 凝灰岩的高炉输入材料 |
| 43 | 高炉 | `blast_furnace.png` | 两条高炉配方箭头上的图标，替代现在的「炉」字 |

---

## 四、放好之后

目录结构应该是这样：

```
site/
└── assets/
    ├── items/
    │   ├── coal_ore.png
    │   ├── deepslate_iron_ore.png
    │   ├── gold_ingot.png
    │   ├── netherite_upgrade_smithing_template.png
    │   └── …（共 43 张）
    ├── spawn_platform.png
    └── …（原有 9 张截图不动）
```

放好后告诉我，我会：

1. 把 3×3 格子里的字母（`S` / `X` / `N` / `D` / `#` / `C`）换成对应物品图标；
2. 图例从「`S` = 石头」改成「图标 + 名称」；
3. 高炉配方把「炉」字换成高炉图标；
4. 缺图时自动回退到现在的文字，不会出现破图。

---

## 五、快速自检

下载完可以跑一下（在 `李芒果文档` 目录）：

```bash
ls site/assets/items/*.png | wc -l    # 应该是 43
```

如果数量不够，对照上面表格里的「文件名」列看缺哪个。
