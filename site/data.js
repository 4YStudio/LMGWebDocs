/* ============================================================
   Carpet Sky Additions — 文档数据层
   内容整理自 README.md / docs/*.md，细节完整保留
   ============================================================ */

const DATA = {
  /* ── 安装：单人 ── */
  installSingle: [
    '安装 <a href="https://fabricmc.net/use" target="_blank" rel="noopener">Fabric</a>',
    '下载 <a href="https://www.curseforge.com/minecraft/mc-mods/carpet/files/" target="_blank" rel="noopener">fabric-carpet</a>',
    '下载 <a href="https://www.curseforge.com/minecraft/mc-mods/fabric-api/files" target="_blank" rel="noopener">fabric-api</a>',
    '下载 <a href="https://www.curseforge.com/minecraft/mc-mods/cloth-config/files/all?filter-game-version=2020709689%3A7499" target="_blank" rel="noopener">cloth-config</a>（模组配置界面的前置）',
    '下载 <a href="https://github.com/jsorrell/CarpetSkyAdditions/releases" target="_blank" rel="noopener">SkyBlock 模组</a>',
    '将 fabric-carpet、fabric-api、cloth-config 和 SkyBlock 模组放到 <code>&lt;minecraft文件目录&gt;/mods/</code> 文件夹内',
    '启动 Minecraft 并选择 <code>创建新的世界</code>',
    '将 <strong>允许作弊</strong> 选项调整为开启，以确保你能在游戏内控制模组特性的开启与关闭（建议不开启避免误操作；如需调整，可在游戏内选择“对局域网开放”，并在那里勾选允许作弊进行临时修改）',
    '启用数据包 <code>carpetskyadditions/skyblock</code>',
    '点击 <code>更多世界选项</code>，选择 <code>世界类型：SkyBlock</code>',
    '创建世界'
  ],

  /* ── 安装：服务器 ── */
  installMulti: [
    '创建一个 <a href="https://fabricmc.net/use/server/" target="_blank" rel="noopener">fabric 服务端</a>',
    '下载 <a href="https://www.curseforge.com/minecraft/mc-mods/fabric-api/files" target="_blank" rel="noopener">fabric-api</a>',
    '下载 <a href="https://www.curseforge.com/minecraft/mc-mods/carpet/files/" target="_blank" rel="noopener">fabric-carpet</a>',
    '下载 <a href="https://www.curseforge.com/minecraft/mc-mods/cloth-config/files/all?filter-game-version=2020709689%3A7499" target="_blank" rel="noopener">cloth-config</a>（模组配置界面的前置）',
    '下载 <a href="https://github.com/jsorrell/CarpetSkyAdditions/releases" target="_blank" rel="noopener">SkyBlock 模组</a>',
    '启动服务端以生成配置模板 <code>server.properties</code> 文件',
    '关闭服务器',
    '删除服务端生成的 <code>world</code> 文件夹（即删除一开始生成的默认世界）',
    '将 fabric-carpet、fabric-api、cloth-config 和 SkyBlock 模组放到 <code>&lt;服务端文件夹目录&gt;/mods/</code> 文件夹内',
    '打开配置文件 <code>server.properties</code>',
    '将 <code>level-type=minecraft\\:normal</code>（世界生成类型：默认）修改为 <code>level-type=carpetskyadditions\\:skyblock</code>（世界生成类型：空岛）',
    '如果有其余生成选项修改或指定世界种子，也请在这一步完成',
    '可选：把 <code>carpetskyadditions\\:skyblock_acacia</code> 从 <code>initial-disabled-packs</code> 移到 <code>initial-enabled-packs</code>，改为金合欢树开局',
    '启动服务器',
    '在服务端操作台或在游戏内以 OP 权限执行指令 <code>datapack enable "carpetskyadditions/skyblock"</code> 启用模组内置数据包'
  ],

  /* ── 世界生成 ── */
  generation: [
    {
      title: '出生点平台',
      desc: '一个小的出生点平台，包括草方块，以及一棵树。',
      img: 'assets/spawn_platform.png',
      alt: '一个小出生点平台，包括草方块，以及一棵树',
      cond: null
    },
    {
      title: '末地传送门框架',
      desc: '末地传送门框架将得到保留。',
      img: 'assets/end_portal.png',
      alt: '末地传送门框架将得到保留',
      cond: 'generateEndPortals'
    },
    {
      title: '远古城市传送门框架',
      desc: '带有幽匿尖啸体的远古城市传送门框架将得到保留。',
      img: 'assets/ancient_city_portal.png',
      alt: '远古城市传送门框架将得到保留',
      cond: 'generateAncientCityPortals'
    },
    {
      title: '蠹虫刷怪笼',
      desc: '蠹虫刷怪笼会伴随世界生成保留下来。',
      img: null,
      cond: 'generateSilverfishSpawners'
    },
    {
      title: '岩浆怪刷怪笼',
      desc: '堡垒遗迹的宝藏室中的岩浆怪刷怪笼会保留。',
      img: null,
      cond: 'generateMagmaCubeSpawners',
      condText: '仅当属性 generateMagmaCubeSpawners 设置为 true 时生效'
    },
    {
      title: '随机返回折跃门',
      desc: '末地中的所有随机返回折跃门会保留。',
      img: null,
      cond: 'generateRandomEndGateways',
      condText: '仅当属性 generateRandomEndGateways 设置为 true 时生效'
    }
  ],

  /* ── 模组特性 ── */
  modFeatures: [
    {
      title: '失活的珊瑚和失活的珊瑚扇可以冲蚀成沙',
      provides: ['沙子', '红沙'],
      cmd: '/carpetskyadditions removeDefault coralErosion',
      use: [
        '空岛最主要的<strong>沙子来源</strong>，也是玻璃、砂岩、TNT 的前置。',
        '可以做全自动刷沙机：把失活的珊瑚/珊瑚扇放在水源旁边让水从它身上流出，下方接漏斗矿车或水流收集，挂机即可产沙。'
      ],
      body: [
        '失活的珊瑚和失活的珊瑚扇在有水流出的时候，每隔 <strong>16–32 秒</strong>（平均 24 秒）就会生成一个沙子物品。火珊瑚会生成红沙。',
        '珊瑚在每次生成沙子之后将会有 <strong>3%</strong> 的概率被破坏，所以自动化时建议留一格备用珊瑚或做补充。',
        '无限自动化农场是可行的，并不复杂。'
      ],
      reasons: [
        '仅从流浪商人处获取沙子远远无法满足需求。',
        '重力方块复制和重复交易 bug 是没有意义的，随时可能被官方修复。',
        '尸壳掉落沙子的旧途径很无聊，因为它只是另一种形式的刷怪塔。'
      ],
      media: []
    },
    {
      title: '潜影贝生成于击杀末影龙后',
      provides: ['潜影贝', '潜影壳', '潜影盒'],
      cmd: '/carpetskyadditions removeDefault shulkerSpawnsOnDragonKill',
      use: [
        '这是空岛获得<strong>潜影壳 / 潜影盒</strong>的唯一途径，而潜影盒是后期最重要的扩容背包。',
        '每击杀一次末影龙，基岩祭坛顶部就会多出一只潜影贝；想要大量潜影壳就得反复屠龙。',
        '潜影贝会传送且护甲高，建议用带「穿透/伤害」的武器或干脆把它推进虚空外的地方卡住再打。'
      ],
      body: [
        '当末影龙被<strong>再次</strong>击杀时，一只潜影贝会在基岩祭坛的顶部生成。',
        '规则名在 1.20.1 已从 <code>shulkerSpawning</code> 改名为 <code>shulkerSpawnsOnDragonKill</code>，旧文档里的写法会报错。'
      ],
      media: []
    },
    {
      title: '山羊撞击分解地狱疣块',
      provides: ['地狱疣'],
      cmd: '/carpetskyadditions removeDefault rammingWart',
      use: [
        '地狱疣块由 9 个地狱疣合成，但原版无法拆回——这条特性让你能把块<strong>还原成地狱疣</strong>，避免手滑合成后浪费。',
        '顺便也是「山羊有用」的一条：把地狱疣块摆在山羊面前让它撞即可。'
      ],
      body: ['当山羊撞击地狱疣块时，它会分解为地狱疣。'],
      media: []
    },
    {
      title: '浓稠的药水可将石头转化为深板岩',
      provides: ['深板岩'],
      cmd: '/carpetskyadditions removeDefault renewableDeepslate',
      extraCmds: ['/carpetskyadditions setDefault renewableDeepslate no_splash'],
      use: [
        '空岛获取<strong>深板岩</strong>的主要方式，而深板岩是深层矿石、深板岩砖、以及很多红石元件的材料。',
        '浓稠药水的酿法是「水瓶 + 萤石粉」。对着石头右键即可，量大时用发射器或溅射型一次覆盖一片。',
        '想批量生产就把石头铺成一片，丢一瓶滞留型浓稠药水进去，云雾里的石头会持续被转化。'
      ],
      body: [
        '右键点击或通过发射器使用的浓稠药水可以将对应的石头转化成为深板岩。',
        '溅射的浓稠药水也会将所有覆盖的石头方块转化成深板岩。',
        '转化概率等于「该药水对实体生效时长的百分比」的两倍。',
        '滞留型浓稠药水会持续把云雾范围内的所有石头方块转化为深板岩。',
        '使用 <code>setDefault renewableDeepslate no_splash</code> 仅禁用溅射药水生效。'
      ],
      media: []
    },
    {
      title: '下界岩与菌岩随下界传送门结构生成',
      provides: ['下界岩', '绯红菌岩', '诡异菌岩'],
      cmd: '/carpetskyadditions removeDefault renewableNetherrack',
      use: [
        '在空岛里「凭空」造出<strong>下界岩</strong>，这是造下界传送门、以及后续很多下界相关合成的基础。',
        '每次在主世界/末地新开一扇传送门，门的底部都会铺出一小圈方块；反复开关门就能刷。',
        '想要菌岩就去对应群系开门：绯红森林给绯红菌岩、诡异森林给诡异菌岩，其它地方给普通下界岩。'
      ],
      body: [
        '当一扇下界传送门在虚空中生成时，其周围会生成少量下界岩或菌岩。',
        '生成哪种方块取决于生物群系：绯红森林生成绯红菌岩，诡异森林生成诡异菌岩，其他地方生成下界岩。',
        '这与基岩版的设计保持一致。'
      ],
      media: []
    },
    {
      title: '流浪商人销售高花',
      provides: ['高花'],
      cmd: '/carpetskyadditions removeDefault tallFlowersFromWanderingTrader',
      use: [
        '空岛拿不到自然生成的高花（丁香、玫瑰丛、牡丹、向日葵），这条让你能从<strong>流浪商人</strong>买到。',
        '高花可以繁殖蜜蜂、做染料（玫瑰丛→红色染料等），也是装饰和「全花朵」收集的必需品。'
      ],
      body: ['高花交易模仿自基岩版。'],
      table: {
        caption: '追加的一级交易内容',
        head: ['物品', '价格', '失效前可交易次数'],
        rows: [
          ['丁香', '1', '12'],
          ['玫瑰丛', '1', '12'],
          ['牡丹', '1', '12'],
          ['向日葵', '1', '12']
        ]
      },
      media: []
    },
    {
      title: '恼鬼可以被平复',
      provides: ['悦灵'],
      cmd: '/carpetskyadditions removeDefault allayableVexes',
      use: [
        '空岛里没有林地府邸，所以<strong>悦灵</strong>只能靠这条特性获得——而悦灵是自动分类仓库的核心。',
        '准备 5 个音符盒，按正确顺序弹 5 个音；恼鬼会用粒子提示你弹对了没有。',
        '把恼鬼关进矿车，用「探测铁轨 + 比较器」读输出值（0=F#…11=F），就能知道下一个该弹哪个音。'
      ],
      body: [
        '使用 5 个音符盒对恼鬼弹奏正确的旋律可以将他们转化成悦灵。',
        '恼鬼会检测周围 <strong>16 格</strong>范围内的音符盒，并根据是否演奏了正确的音符而发出粒子效果。乐器种类和八度音阶都将被忽略，这意味着 F#<sub>3</sub> 和 F#<sub>5</sub> 将被视作同一个音符。',
        '当恼鬼处于矿车中时，可以使用比较器和探测铁轨来确定序列中的下一个音符。比较器会输出一个从 0（对应 F#）到 11（对应 F）的值。'
      ],
      media: []
    },
    {
      title: '狐狸携带甜浆果生成',
      provides: ['甜浆果'],
      cmd: '/carpetskyadditions removeDefault foxesSpawnWithSweetBerriesChance',
      extraCmds: ['/carpetskyadditions setDefault foxesSpawnWithSweetBerriesChance &lt;chance&gt;'],
      use: [
        '空岛<strong>甜浆果</strong>的来源之一（狐狸嘴里叼着），也是狐狸繁殖/喂食的材料。',
        '狐狸生成后很快就会把浆果吃掉，看到狐狸要立刻击杀或抢。',
        '概率可调：<code>setDefault foxesSpawnWithSweetBerriesChance 1</code> 就是 100%。'
      ],
      body: [
        '当一只狐狸携带物品生成时，有 <strong>20%</strong> 的概率为甜浆果。',
        '狐狸在生成之后很快就会吃掉它，所以请动作快点。',
        '可通过 <code>setDefault foxesSpawnWithSweetBerriesChance &lt;chance&gt;</code> 调整生成甜浆果的概率。'
      ],
      media: []
    },
    {
      title: '铁砧压合煤炭块为钻石',
      provides: ['钻石'],
      cmd: '/carpetskyadditions removeDefault renewableDiamonds',
      use: [
        '空岛的<strong>钻石</strong>来源：煤炭块 → 钻石，而煤炭块在空岛可以由刷怪塔的煤炭无限供应。',
        '做法：把煤炭块叠成整组（64 块），让铁砧从上方砸下来即可压出 1 颗钻石。',
        '注意比例是 <strong>64 块煤炭块 = 1 颗钻石</strong>，不足 64 的部分不会消耗，会留在原地。'
      ],
      body: [
        '下落的铁砧可将<strong>整组（64 块）煤炭块</strong>压合成 1 颗钻石。',
        '不足 64 块的零头不会被消耗，会原样留在原地。'
      ],
      media: []
    },
    {
      title: '雷击藤蔓使其通电',
      provides: ['发光地衣'],
      cmd: '/carpetskyadditions removeDefault lightningElectrifiesVines',
      use: [
        '空岛拿不到天然<strong>发光地衣</strong>（繁茂洞穴不生成），这条是唯一来源。',
        '搭法：萤石上方挂藤蔓，等雷劈；也可以在萤石上插避雷针引雷，更可控。',
        '发光地衣是「全光源」挑战进度必需的一块，也能用来发光装饰。'
      ],
      body: ['如果闪电击中附着于萤石上的藤蔓，则藤蔓将会转变为发光地衣；击中萤石上的避雷针时该特性依旧有效。'],
      media: []
    },
    {
      title: '紫颂植物在末地小岛上生成',
      provides: ['紫颂果', '紫颂花'],
      cmd: '/carpetskyadditions removeDefault gatewaysSpawnChorus',
      use: [
        '空岛的<strong>紫颂果</strong>来源：紫颂果可以吃（并能传送），紫颂花是装饰与紫色染料，末地石则是末地相关的建材。',
        '进入末地折跃门后，落点在虚空上方时会生成一座末地石小岛并带一株紫颂植物，打掉即可收获。'
      ],
      body: ['当一个末地折跃门通向虚空上方的位置时，其伴生生成的末地石小岛将会生成一株紫颂植物。'],
      media: []
    },
    {
      title: '海豚可以找到海洋之心',
      provides: ['海洋之心'],
      cmd: '/carpetskyadditions removeDefault renewableHeartsOfTheSea',
      use: [
        '空岛的<strong>海洋之心</strong>来源，而海洋之心是潮涌核心（Conduit）的核心材料。',
        '做法：在海洋群系里喂海豚吃鱼，它会在海底的沙子或砂砾中挖出海洋之心。',
        '记得给海豚留出足够大的活动空间，否则它找不到地方挖。'
      ],
      body: [
        '当海豚被喂食鱼后，它会在海底的沙子或砂砾中挖出一个海洋之心。',
        '请确保给海豚留出足够的空间去搜索。',
        '必须在<strong>海洋群系</strong>——这玩意儿是海洋之心，而不是丛林之心。'
      ],
      media: []
    },
    {
      title: '紫水晶母岩可再生',
      provides: ['紫水晶母岩', '紫水晶碎片'],
      cmd: '/carpetskyadditions removeDefault renewableBuddingAmethysts',
      use: [
        '空岛拿不到天然<strong>紫水晶母岩</strong>（晶洞不生成），而母岩是紫水晶碎片、望远镜、遮光玻璃的来源。',
        '结构：中心一格熔岩 → 外面一圈方解石 → 再外面一圈平滑玄武岩，然后等。',
        '成功率是随机刻的 1/100，平均约 <strong>2 小时</strong>；可以一次搭很多组并行等。'
      ],
      body: [
        '当熔岩方块被方解石包围后，外围再被平滑玄武岩包围时，最终会变为一个紫水晶母岩方块。',
        '转化概率为随机刻的 <strong>1/100</strong>，平均约 <strong>2 小时</strong>，处于结构正中心的熔岩将会转变为紫水晶母岩。'
      ],
      steps: [
        { img: 'assets/amethyst_step_1_240.png', cap: '步骤 1：熔岩源' },
        { img: 'assets/amethyst_step_2_240.png', cap: '步骤 2：用方解石包围熔岩' },
        { img: 'assets/amethyst_step_3_240.png', cap: '步骤 3：用平滑玄武岩包围方解石' }
      ],
      result: { img: 'assets/amethyst_result_240.png', cap: '熔岩变成了紫水晶母岩' },
      media: []
    },
    {
      title: '树苗会在沙子上枯死',
      provides: ['枯萎的灌木'],
      cmd: '/carpetskyadditions removeDefault saplingsDieOnSand',
      use: [
        '空岛拿不到天然<strong>枯萎的灌木</strong>（沙漠不生成方块），这条让你自己「种」出来。',
        '把树苗插在沙子或红沙上，等一段时间它就会枯死变成枯萎的灌木，用于装饰与方块收集。',
        '注意：这意味着树苗不能直接种在沙子上当树用。'
      ],
      body: [
        '树苗可以放在沙子和红沙上。',
        '一段时间后它们会枯萎并转化为枯死的灌木（每次随机刻有 <strong>20%</strong> 概率触发）。'
      ],
      media: []
    },
    {
      title: '末影龙掉落龙首',
      provides: ['龙首'],
      cmd: '/carpetskyadditions removeDefault renewableDragonHeads',
      use: [
        '空岛拿不到天然<strong>龙首</strong>（末地船不生成），这条是唯一来源，而龙首是「末地」装饰与部分合成/成就所需。',
        '做法：先把苦力怕用引雷三叉戟劈成闪电苦力怕，让它炸死末影龙。'
      ],
      body: ['当末影龙被<strong>闪电苦力怕</strong>击杀时，她会掉落她的头颅。'],
      media: []
    },
    {
      title: '巨型蘑菇生成菌丝',
      provides: ['菌丝'],
      cmd: '/carpetskyadditions removeDefault hugeMushroomsSpreadMycelium',
      use: [
        '空岛拿不到天然<strong>菌丝</strong>（蘑菇岛不生成），这条是唯一来源。',
        '种一棵巨型蘑菇，长成后周围的地面会被扩散成菌丝，用精准采集镐挖下来即可。',
        '菌丝可以用来种蘑菇、做装饰，也是「所有方块」收集的一环。'
      ],
      body: ['当巨型蘑菇长成时，它会往附近的方块上扩散菌丝，该机制类似于巨型云杉扩散灰化土。'],
      media: []
    },
    {
      title: '具有音波定位能力的生物在被音爆杀死时掉落回响碎片',
      provides: ['回响碎片'],
      cmd: '/carpetskyadditions removeDefault renewableEchoShards',
      use: [
        '空岛拿不到天然<strong>回响碎片</strong>（远古城市宝箱不生成），这条是可再生来源。',
        '回响碎片用于合成回响罗盘（定位监守者/远古城市）与追溯指针。',
        '做法：让监守者的音爆（Sonic Boom）打死蝙蝠或海豚。'
      ],
      body: ['蝙蝠和海豚在被监守者释放的音爆杀死时会掉落回响碎片。'],
      media: []
    },
    {
      title: '溺尸会抚养嗅探兽蛋',
      provides: ['嗅探兽蛋', '嗅探兽'],
      cmd: '/carpetskyadditions removeDefault sniffersFromDrowneds',
      use: [
        '空岛拿不到嗅探兽蛋（海底废墟不刷宝箱），这条是获得<strong>嗅探兽</strong>的途径。',
        '溺尸有 1% 概率副手拿着嗅探兽蛋生成；这个蛋<strong>永远不会掉落</strong>，必须让它去踩海龟蛋才能换出来。',
        '做法：养一只拿蛋的溺尸，在它脚下放海龟蛋让它踩碎，碎掉的海龟蛋会被替换成嗅探兽蛋。'
      ],
      body: [
        '溺尸在生成时有 <strong>1%</strong> 的概率副手拿着一个嗅探兽蛋。',
        '这个蛋在溺尸死亡时<strong>永远不会掉落</strong>。',
        '当手持嗅探兽蛋的溺尸踩碎海龟蛋时，被踩碎的海龟蛋会被替换成嗅探兽蛋。'
      ],
      media: []
    },
    {
      title: '嗅探兽很可疑',
      provides: ['可疑的沙子', '可疑的砂砾', '铁粒'],
      cmd: '/carpetskyadditions removeDefault suspiciousSniffers',
      extraCmds: ['/carpetskyadditions setDefault suspiciousSniffers no_iron'],
      use: [
        '空岛拿不到天然<strong>可疑的沙子 / 砂砾</strong>（考古结构不生成方块），这条让嗅探兽自己「造」出来。',
        '嗅探兽会在沙子、红沙、可疑的沙子、砂砾、可疑的砂砾里挖掘，挖出铁粒——早期铁傀儡农场之前的一点被动铁来源。',
        '在沙漠神殿或暖水海洋废墟范围内挖沙子有 10% 变成可疑的沙子；在古迹废墟或冷水海洋废墟范围内挖砂砾有 10% 变成可疑的砂砾。',
        '造出的可疑方块使用该结构的战利品表：古迹废墟有 20% 走稀有表，沙漠神殿有 20% 走沙漠水井表——也就是陶片、盔甲纹饰的来源。'
      ],
      body: [
        '嗅探兽会在沙子、红沙、可疑的沙子、砂砾、可疑的砂砾中挖掘，并挖出铁粒。',
        '这个铁粒更多是「设定」而非正经的铁来源，但在铁傀儡农场建好之前可以提供一点被动铁。',
        '挖掘有 10% 概率把沙漠神殿或暖水海洋废墟范围内的沙子转化为可疑的沙子，也有 10% 概率把古迹废墟或冷水海洋废墟范围内的砂砾转化为可疑的砂砾。',
        '转化出的可疑方块会使用其所在结构的战利品表。古迹废墟中有 20% 概率使用稀有表，沙漠神殿中有 20% 概率使用沙漠水井表。',
        '使用 <code>setDefault suspiciousSniffers no_iron</code> 可以只关掉铁粒掉落。'
      ],
      media: []
    },
    {
      title: '监守者附近的附魔台可以提供迅捷潜行的附魔',
      provides: ['迅捷潜行'],
      cmd: '/carpetskyadditions removeDefault renewableSwiftSneak',
      use: [
        '空岛拿不到天然<strong>迅捷潜行</strong>附魔书（远古城市宝箱不生成），这条是唯一来源。',
        '在监守者周围 8 格内放附魔台，就能把它附到裤子上——注意别被监守者打死。'
      ],
      body: ['处于监守者周围 <strong>8 格</strong>范围内的附魔台可以为其上的物品提供迅捷潜行的附魔。'],
      media: []
    },
    {
      title: '毒马铃薯转化蜘蛛',
      provides: ['洞穴蜘蛛'],
      cmd: '/carpetskyadditions removeDefault poisonousPotatoesConvertSpiders',
      use: [
        '空岛拿不到<strong>洞穴蜘蛛</strong>（废弃矿井不生成刷怪笼），这条是唯一来源。',
        '对普通蜘蛛使用毒马铃薯即可转化；洞穴蜘蛛是「蜘蛛眼/发酵蜘蛛眼」链条的一环。'
      ],
      body: ['对蜘蛛使用毒马铃薯可将其转化为洞穴蜘蛛。'],
      media: []
    },
    {
      title: '流浪商人可以骑着骆驼生成',
      provides: ['骆驼'],
      cmd: '/carpetskyadditions removeDefault traderCamels',
      use: [
        '空岛拿不到<strong>骆驼</strong>（沙漠不生成生物），这条让流浪商人骑着骆驼来，等于把骆驼送上门。',
        '商人在沙漠或恶地群系生成时不带羊驼，而是骑骆驼；商人消失时骆驼一起消失，所以要在它消失前把骆驼抢下来（骑上去或拴住）。',
        '注意：商人还在骑的时候，骆驼不能被骑、不能被喂、不能被拴。'
      ],
      body: [
        '当流浪商人在沙漠或恶地群系（标签 <code>carpetskyadditions:wandering_trader_spawns_on_camel</code>）生成时，它不会带商队羊驼，而是骑着一只骆驼。',
        '如果商人消失时仍骑着骆驼，骆驼会一并消失。',
        '在商人骑乘期间，骆驼不能被骑乘、喂食或拴绳。',
        '注意：只装在服务端时，客户端会看到商人「站」在骆驼上而不是坐着；喂食或拴绳也会看起来像在用仙人掌或拴绳。这只是客户端表现，但建议别去动商人的骆驼。'
      ],
      media: []
    },
    {
      title: '小型垂滴叶可以繁殖',
      provides: ['小型垂滴叶'],
      cmd: '/carpetskyadditions removeDefault spreadingSmallDripleaves',
      use: [
        '空岛的小型垂滴叶只能从流浪商人 10 个一组买，数量极少；这条让你能<strong>种植扩产</strong>。',
        '条件很讲究：种在黏土上、下半格含水（waterlogged）、上半格不含水、且上半格光照等级正好为 5。',
        '满足条件后会像蘑菇一样蔓延，最多水平 5 格、垂直 2 格，越近概率越高；5×2×5 范围内最多 15 株（两半都算）。'
      ],
      body: [
        '当小型垂滴叶种在黏土上，且下半格含水（waterlogged）、上半格不含水、上半格光照等级正好为 5 时，它可以蔓延。蔓延方式与蘑菇类似。',
        '它只会蔓延到满足相同条件的位置。',
        '最远可蔓延到水平 5 格、垂直 2 格的位置，越近的位置概率越高。',
        '只有当目标位置周围 5×2×5 范围内的小型垂滴叶数量（两半都计入）不超过 15 时才能蔓延。',
        '在空岛世界中，小型垂滴叶通常非常有限，因为只能从流浪商人处以 10 个一组购买。这条特性让它可以被农场化、被更大量地使用。'
      ],
      media: []
    },
    {
      title: '珊瑚可以蔓延到方解石上',
      provides: ['珊瑚块'],
      cmd: '/carpetskyadditions removeDefault spreadingCoral',
      use: [
        '空岛的珊瑚块只能从流浪商人 8 个一组买，数量极少；这条让你能<strong>批量生产珊瑚块</strong>。',
        '做法：一块方解石周围 3×3 内放满至少 8 块同种珊瑚块，然后等随机刻，方解石就有概率变成那种珊瑚块（前提是它能存活）。',
        '转化概率取决于所在地的「适宜度」：最理想是温度 0.65、大陆性 -0.3（也就是温暖地区刚离岸的位置），单机 F3 能看到这两个值；最适宜时平均约 2 分钟，最差要接近 2 小时。'
      ],
      body: [
        '当一块方解石周围 3×3 范围内有至少 8 块同种珊瑚块时，它在随机刻有概率转化为该种珊瑚块（如果该珊瑚块能存活）。',
        '转化概率取决于位置的适宜度，适宜度基于生物群系的温度与大陆性参数。理想位置为温度 0.65、大陆性 -0.3，也就是温暖地区刚离岸的位置；这些值可在单机 F3 界面查看。',
        '算法：非主世界维度适宜度为 0；超平坦世界为 0.5；其余为 <code>1 - ((温度 - 0.65)² + (大陆性 + 0.3)²)</code>，并夹在 0 到 1 之间。',
        '随机刻的转化概率为 <code>适宜度 × 0.49 + 0.01</code>。最适宜时平均约 2 分钟，最不适宜时平均接近 2 小时。',
        '在空岛世界中，珊瑚块通常非常有限，因为只能从流浪商人处以 8 个一组购买。这条特性让它可以被农场化、被更大量地使用。'
      ],
      media: []
    },
    {
      title: '流浪商人出售熔岩',
      provides: ['熔岩'],
      cmd: '/carpetskyadditions setDefault lavaFromWanderingTrader true',
      cmdNote: '默认禁用 —— 取而代之的是通过村庄英雄的礼物来获取熔岩',
      disabledByDefault: true,
      use: [
        '熔岩是空岛<strong>最大的进度门槛</strong>：没有熔岩就没有圆石，也就没法去下界。',
        '默认这条路是关的，官方推荐用「村庄英雄」礼物拿熔岩（见数据包特性里的「村民赠予熔岩桶」）。',
        '如果你想用更传统的方式，可以手动开启，然后找流浪商人用 16 个桶换 1 桶熔岩。'
      ],
      body: ['默认禁用该特性；启用后流浪商人会以二级交易出售熔岩桶。'],
      table: {
        caption: '追加的二级交易内容',
        head: ['获得物品', '消耗物品', '价格', '失效前可交易次数'],
        rows: [['熔岩桶', '桶', '16', '1']]
      },
      media: []
    }
  ],

  /* ── 地毯模组特性 ── */
  carpetFeatures: [
    {
      title: 'renewableSponges',
      provides: ['海绵'],
      body: '启用 <code>renewableSponges</code> 选项以再生海绵。运行指令 <code>/carpet removeDefault renewableSponges</code> 可禁用该特性。',
      link: 'https://github.com/gnembon/fabric-carpet/wiki/Current-Available-Settings#renewablesponges'
    },
    {
      title: 'piglinsSpawningInBastions',
      provides: ['猪灵'],
      body: '启用 <code>piglinsSpawningInBastions</code> 选项以在堡垒遗迹中再生猪灵。运行指令 <code>/carpet removeDefault piglinsSpawningInBastions</code> 可禁用该特性。',
      link: 'https://github.com/gnembon/fabric-carpet/wiki/Current-Available-Settings#piglinsSpawningInBastions'
    }
  ],

  /* ── 数据包特性 ── */
  datapackFeatures: [
    {
      title: '村民赠予熔岩桶',
      provides: ['熔岩'],
      remove: 'data/minecraft/loot_tables/gameplay/hero_of_the_village',
      use: [
        '熔岩是空岛<strong>最大的进度门槛</strong>：没有熔岩就没有圆石、没有黑曜石，也就没法进入下界。',
        '这是官方推荐的默认获取方式（比流浪商人那条更省事）：拿到「村庄英雄」效果后，盔甲匠、武器匠、工具匠的礼物里会出现熔岩桶。',
        '刷法：找一座村庄（或自己造一个村民交易所）不断触发袭击并获胜，反复领礼物即可。'
      ],
      body: '熔岩桶可以作为「村庄英雄」的礼物从盔甲匠、武器匠和工具匠处获得。'
    },
    {
      title: '可通过末影螨获得鞘翅',
      provides: ['鞘翅'],
      remove: 'data/minecraft/loot_tables/entities/endermite.json',
      use: [
        '空岛<strong>没有末地船</strong>，所以原版的鞘翅获取途径不存在——这条是唯一来源。',
        '做法：让末影螨同时处于「缓降」和「飘浮」两种效果下，再让玩家把它打死，就有概率掉鞘翅，抢夺附魔可以提高概率。',
        '末影螨由末影人传送或末影珍珠生成，配合药水即可量产。'
      ],
      body: '玩家杀死同时受到缓降与飘浮效果影响的末影螨时，有概率掉落鞘翅，概率受抢夺附魔加成。'
    },
    {
      title: '猪灵蛮兵掉落远古残骸',
      provides: ['远古残骸', '下界合金'],
      remove: 'data/minecraft/loot_tables/entities/piglin_brute.json',
      use: [
        '空岛<strong>没有远古残骸矿</strong>（下界不生成方块），而远古残骸是下界合金的唯一来源。',
        '前置：需要先开启 carpet 的 <code>piglinsSpawningInBastions</code>，让猪灵蛮兵能在堡垒遗迹里刷出来。',
        '然后在堡垒里刷猪灵蛮兵，打死有概率掉远古残骸。'
      ],
      body: '一个 carpet 设置可以让猪灵蛮兵在堡垒遗迹中生成，这些蛮兵有概率掉落远古残骸。'
    },
    {
      title: '可再生方解石与凝灰岩',
      provides: ['方解石', '凝灰岩'],
      remove: 'data/skyblock/recipes/[tuff_from_blasting_andesite.json + calcite_from_blasting_diorite.json]',
      use: [
        '空岛没有紫水晶洞与山地，拿不到天然<strong>方解石 / 凝灰岩</strong>，这两条配方是唯一来源。',
        '方解石还是「紫水晶母岩可再生」特性的必需材料（要围住熔岩），所以这条其实是紫水晶链条的前置。',
        '做法：闪长岩丢高炉烧成方解石，安山岩丢高炉烧成凝灰岩。'
      ],
      body: '把闪长岩放进高炉烧炼可以得到方解石，把安山岩放进高炉烧炼可以得到凝灰岩。'
    },
    {
      title: '可合成发光浆果',
      provides: ['发光浆果'],
      remove: 'data/skyblock/recipes/glow_berries.json',
      use: [
        '空岛没有繁茂洞穴，<strong>发光浆果</strong>只能靠合成，它是发光浆果藤蔓（装饰光源）与狐狸繁殖的材料。',
        '做法：甜浆果 + 荧光墨囊 无序合成。'
      ],
      body: '甜浆果与荧光墨囊合成可以得到发光浆果。'
    },
    {
      title: '蜘蛛骑士掉落蜘蛛网',
      provides: ['蜘蛛网', '线'],
      remove: 'data/minecraft/loot_tables/entities/[skeleton.json + spider.json]',
      use: [
        '空岛没有废弃矿井，<strong>蜘蛛网</strong>只能靠这条获取；蜘蛛网是床、钓鱼竿、以及「蜘蛛网陷阱」的材料。',
        '做法：让骷髅骑上蜘蛛形成蜘蛛骑士（自然刷怪或手动放置），玩家击杀时先死的那一半会掉蜘蛛网。'
      ],
      body: '当玩家击杀蜘蛛骑士时，先被击杀的那一半会掉落蜘蛛网。'
    },
    {
      title: '可可豆可在丛林群系被钓出',
      provides: ['可可豆'],
      remove: 'data/minecraft/loot_tables/gameplay/fishing/junk.json',
      use: [
        '空岛没有丛林树，<strong>可可豆</strong>只能靠钓鱼获得；可可豆是曲奇、棕色染料、以及可可豆种植的前提。',
        '做法：在丛林群系（空岛里需要自己造出丛林群系或用丛林生物群系区域）钓鱼，钓上垃圾时有概率得到可可豆。'
      ],
      body: '与基岩版一致，在丛林群系钓鱼时，可可豆可以作为「垃圾」被钓出。'
    },
    {
      title: '矿石可合成',
      provides: ['各种矿石'],
      remove: 'data/skyblock/recipes/*_ore.json',
      use: [
        '空岛没有天然矿洞，所有矿石都得自己<strong>合成</strong>——这是整个资源链条的核心。',
        '摆法：中心放一块基材（石头 / 深板岩 / 下界岩），四周放四份该矿石对应的材料，用<strong>工作台</strong>合成。',
        '材料是锭、下界石英、煤炭、钻石或绿宝石；铜、红石、青金石需要用<strong>块</strong>。',
        '深板岩版本把中心换成深板岩即可，下界金矿石与下界石英矿石则用下界岩作中心。'
      ],
      body: '所有矿石都可以用一块基材石头加上四份对应材料合成。配方需要锭、下界石英、煤炭、钻石或绿宝石；铜、红石、青金石则需要使用块。举例：下界岩放在中心、四边放金锭，即可合成下界金矿石。',
      img: 'assets/ore_recipe.png',
      imgAlt: '工作台合成示意：四块金锭围绕下界岩，产出下界金矿石'
    },
    {
      title: '马铠可合成',
      provides: ['铁马铠', '金马铠', '钻石马铠'],
      remove: 'data/skyblock/recipes/*_horse_armor.json',
      use: [
        '空岛没有地牢宝箱，<strong>马铠</strong>只能合成；马铠是骑马探索（尤其是跑图找结构）的必需品。',
        '摆法：用对应材料摆成字母 <strong>H</strong> 形（7 份材料）——铁锭、金锭、钻石各一套。'
      ],
      body: '用对应材料以 <strong>H</strong> 形摆放即可合成马铠。'
    },
    {
      title: '猫的晨礼提供附魔金苹果',
      provides: ['附魔金苹果'],
      remove: 'data/minecraft/loot_tables/gameplay/cat_morning_gift.json',
      use: [
        '空岛拿不到天然<strong>附魔金苹果</strong>（地牢/沙漠神殿宝箱不生成），这条是唯一来源。',
        '做法：驯服一只猫并让它睡在你床边，每天早上有极小概率收到附魔金苹果。'
      ],
      body: '猫在早晨送礼时，有极小概率送给玩家附魔金苹果。'
    },
    {
      title: '猪灵交易提供镶金黑石',
      provides: ['镶金黑石'],
      remove: 'data/minecraft/loot_tables/gameplay/piglin_bartering.json',
      use: [
        '空岛拿不到天然<strong>镶金黑石</strong>（堡垒遗迹的方块不生成），这条是唯一来源。',
        '镶金黑石可以挖掘出金粒，也是装饰与「所有方块」收集的一环。',
        '做法：和猪灵以物易物，有极小概率换到。'
      ],
      body: '猪灵在以物易物时有极小概率给出镶金黑石。'
    },
    {
      title: '苦力怕在特定结构中掉落对应唱片或唱片残片',
      provides: ['Pigstep', 'otherside', '唱片残片 5'],
      remove: 'data/minecraft/loot_tables/entities/creeper.json',
      use: [
        '空岛拿不到<strong>唱片</strong>（地牢宝箱不生成），这三张只能靠苦力怕掉落；唱片是「Let\'s Rock!」挑战进度与唱片机的必需品。',
        '做法：让骷髅在对应结构里射杀苦力怕——堡垒遗迹掉 Pigstep，要塞掉 otherside，远古城市掉唱片残片 5（残片 9 张合成 1 张完整唱片）。'
      ],
      body: '当苦力怕在堡垒遗迹中被骷髅杀死时，可能掉落唱片「Pigstep」；在要塞中被骷髅杀死时，可能掉落唱片「otherside」；在远古城市中被骷髅杀死时，可能掉落唱片残片 5。'
    },
    {
      title: '僵尸疣猪兽掉落猪鼻旗帜图案',
      provides: ['猪鼻旗帜图案'],
      remove: 'data/minecraft/loot_tables/entities/zoglin.json',
      use: [
        '空岛拿不到<strong>猪鼻旗帜图案</strong>（堡垒遗迹宝箱不生成），而它是「旗帜图案收藏家」挑战进度必需的一块。',
        '做法：玩家击杀僵尸疣猪兽时必定掉落。僵尸疣猪兽由猪灵/疣猪兽在下界外的维度转化而来。'
      ],
      body: '僵尸疣猪兽被玩家击杀时必定掉落猪鼻旗帜图案。'
    },
    {
      title: '盛开的杜鹃花丛掉落孢子花',
      provides: ['孢子花'],
      remove: 'data/minecraft/loot_tables/blocks/flowering_azaliea_leaves.json',
      use: [
        '空岛拿不到天然<strong>孢子花</strong>（繁茂洞穴不生成），这条是唯一来源。',
        '孢子花会往下撒粒子，是装饰性光源/氛围方块。',
        '做法：破坏盛开的杜鹃花丛（杜鹃树由杜鹃花丛/盛开的杜鹃花丛长出），有概率掉落，时运附魔可提高概率。'
      ],
      body: '盛开的杜鹃花丛有概率掉落孢子花，概率受时运附魔加成。'
    },
    {
      title: '末影人可以拾取高草丛和大型蕨',
      provides: ['高草丛', '大型蕨'],
      remove: 'data/minecraft/tags/blocks/enderman_holdable.json',
      use: [
        '空岛拿不到天然<strong>高草丛 / 大型蕨</strong>（平原/针叶林不生成方块），这条让你能从末影人手上抢。',
        '做法：让末影人搬起高草丛或大型蕨，再把它打死，就能拿到对应的物品（模拟 1.19.3 之前的行为）。',
        '模组还修复了末影人处理两格高方块的方式，让它们能被正确放下而不会被破坏。'
      ],
      body: '拾起过高草丛或大型蕨的末影人被打死后，可以取回这些物品，模拟 1.19.3 之前的行为。模组同时修复了末影人对两格高方块的处理，使其能被正确放置而不被破坏。'
    },
    {
      title: '下界合金升级锻造模板可合成',
      provides: ['下界合金升级锻造模板'],
      remove: 'data/skyblock/recipes/netherite_upgrade_smithing_template_from_netherite.json',
      use: [
        '空岛拿不到<strong>下界合金升级锻造模板</strong>（堡垒遗迹宝箱不生成），没有它就无法把钻石装备升级成下界合金。',
        '做法：按原版的「复制模板」配方摆，但把中间的模板换成一个<strong>下界合金锭</strong>——7 颗钻石 + 1 块下界岩 + 1 个下界合金锭，产出 1 个模板。'
      ],
      body: '按模板复制配方，把中间的锻造模板替换为下界合金锭，即可合成下界合金升级锻造模板。',
      img: 'assets/netherite_upgrade_smithing_template_recipe.png',
      imgAlt: '下界合金升级锻造模板合成示意：8 颗钻石围绕下界岩，中间为下界合金锭'
    },
    {
      title: '战猪进度调整',
      provides: ['战猪进度'],
      remove: null,
      use: [
        '原版的「战猪」进度需要打开堡垒遗迹的战利品箱，但空岛<strong>不会生成战利品箱</strong>，所以这个进度在空岛永远拿不到。',
        '这条特性把它改成「击杀猪灵蛮兵」即可获得，让进度树可以 100% 完成。'
      ],
      body: '在空岛世界，战猪进度是无法获得的，因为它需要打开战利品箱（空岛不会生成）。现在你可以通过击杀猪灵蛮兵来获得这一进度。'
    }
  ],

  /* ── 命令 ── */
  commands: [
    {
      usage: '/skyisland new',
      zh: '创建一个新的起始平台。',
      en: 'Creates a new starting platform.',
      notes: [
        '该平台将至少位于其他生成的岛屿几千个方块之外，但不会远离外部要塞的环形边界。',
        '它永远不会生成在已经生成的区块中。'
      ],
      notesEn: [
        'The platform will be at least a few thousand blocks out from other generated islands, yet not too far outside the outer stronghold ring.',
        'It will never generate in already generated chunks.'
      ]
    },
    {
      usage: '/skyisland join [num]',
      zh: '将调用的玩家传送到岛屿编号为 <code>num</code> 的位置，并设置他们的重生点。',
      en: 'Teleports the calling player to the island number <code>num</code> and sets their spawn.',
      notes: []
    },
    {
      usage: '/skyisland join [num] [player]',
      zh: '将 <code>player</code> 传送到岛屿编号为 <code>num</code> 的位置，并设置他们的重生点。',
      en: 'Teleports the <code>player</code> to the island number <code>num</code> and sets their spawn.',
      notes: []
    },
    {
      usage: '/skyisland locate [num]',
      zh: '打印岛屿编号为 <code>num</code> 的坐标。',
      en: 'Prints the coordinates of the island number <code>num</code>.',
      notes: []
    }
  ],

  /* ── 流程指南 ── */
  progression: [
    {
      step: 1,
      title: '获得稳定的木头供应',
      body: '在一开始，你会试图种植尽可能多的树苗，毕竟等待树苗生长是一个很漫长的过程。在此期间请确保你保护好了你的草方块，因为目前并没有为他们增添额外的可获取方式，他们将会是你的根基与全部。'
    },
    {
      step: 2,
      title: '前往低 Y',
      body: '你可以利用活板门令自身进入匍匐状态，这样你将可以在上一个方块的底部放置活板门，并对着活板门放置方块的形式来向下搭建前往低 Y 的楼梯。',
      bullets: [
        '在低 Y 值的环境下，怪物生成的速度会更快，这样你将可以更快地获取怪物资源（当然部分怪物生成取决于结构的位置，请视情况而定）。',
        '还有一个好处在于，当您处于海平面（<strong>Y=64</strong>）之下时，幻翼将不会生成。'
      ]
    },
    {
      step: 3,
      title: '开始中立生物生成',
      body: '让末影人拾起草方块并杀死它，你就可以获得一个草方块的物品。将草方块和一些泥土带到您所活动的低 Y 环境，并扩散制造一个生成中立生物的平台。当刷出猪的时候，你需要圈养并繁殖他们——因为你需要将他们转化为僵尸猪灵。'
    },
    {
      step: 4,
      title: '建造刷怪塔',
      body: '你需要 <strong>10 个铁锭</strong>以制作一个炼药锅和一个桶。每个被玩家击杀的僵尸都有 <strong>1/120</strong> 的几率掉落一个铁锭（需要玩家击杀，摔死的不掉）。这意味着按期望来看您需要杀死 <strong>1200</strong> 只僵尸。',
      bullets: [
        '因为没有水或者活塞来推动生物，所以您可能不得不依靠寻路机制来建立农场。',
        'ilmango 的<a href="https://www.youtube.com/watch?v=gibE51sgutg" target="_blank" rel="noopener">这个视频</a>或许是一个不错的讲解；为无法使用 YouTube 服务的用户提供 <a href="https://www.bilibili.com/video/BV1r4411Y7F9" target="_blank" rel="noopener">B 站搬运</a>版本。'
      ]
    },
    {
      step: 5,
      title: '合成一个炼药锅来接雨水',
      body: '只要你拥有 <strong>7 个铁锭</strong>，就尽快合成一个炼药锅（视乎运气情况需要合成一个或多个）。当处于玩家附近时，炼药锅每刻有 <strong>1/81920</strong> 的概率会在雨天接到一层雨水（平均每 <strong>4096 秒</strong>）。这意味着平均一个炼药锅平均需要超过 <strong>3 小时</strong>才能被雨水填满。',
      bullets: [
        '在你等待炼药锅接水的时候，请继续砍杀僵尸获取足够的铁来合成桶。',
        '当你拥有一桶水的时候，可以通过几种方式来获取无限水：比如用水瓶舀取一格水源方块三次来填满第二次炼药锅，或者通过在两格高的地方放置流水并使用水草来转化水源方块。'
      ]
    },
    {
      step: 6,
      title: '建造一个溺尸农场',
      body: '你需要一个避雷针来将猪转化为僵尸猪灵，并以此获取金子。击杀溺尸获取铜来制造它。善用视频平台，并善待你的电脑（指链式反应溺尸铜锭农场）。'
    },
    {
      step: 7,
      title: '将猪转化为僵尸猪灵',
      body: '当闪电在猪周围 <strong>4 格</strong>距离落地时，会将其转化为僵尸猪灵。你需要 <strong>16 个金锭</strong>或 <strong>144 个金粒</strong>来合成 2 个金苹果。平均每个僵尸猪灵在没有抢夺附魔时会掉落 <strong>0.725 个金粒</strong>，所以你需要转化大概 <strong>200 只</strong>僵尸猪灵。当你获得足够的金子时，尽快合成两个金苹果。'
    },
    {
      step: 8,
      title: '将两个僵尸村民治疗成普通村民',
      body: '从刷怪塔分离两个将被用于治疗的僵尸村民，然后用船困住一个女巫。当你登上女巫所在的船时，女巫仍会投掷她的药水，但无法击中你。当你的生命值低于 <strong>8 个半心（17 血）</strong>时，女巫会投掷虚弱药水。使用女巫投掷出来的虚弱药水和你先前制作的金苹果来治愈僵尸村民。'
    },
    {
      step: 9,
      title: '制作村民交易所',
      body: '先制作村民繁殖，然后确保你能获得稳定的村民产出支持（记得做屋顶防雷）。通过与村民交易获得绿宝石，以便后续与流浪商人进行交易。'
    },
    {
      step: 10,
      title: '获取熔岩',
      body: '在掠夺者前哨站杀死一名掠夺者小队长来获得<strong>不祥之兆</strong>效果，然后通过进入“村庄”来开始一场袭击，完成袭击可以获得<strong>村庄英雄</strong>效果。当你持有村庄英雄效果时，站在盔甲匠、武器匠或工具匠旁边，你可能会获得一个熔岩桶作为礼物。'
    },
    {
      step: 11,
      title: '进入下界',
      body: '先获取 <strong>10 桶熔岩</strong>。无论是通过村庄英雄的礼物，还是通过以从流浪商人处购买的滴水石锥来进行扩增。然后使用熔岩来浇筑下界传送门框架，使用雷击点燃传送门，或者通过熔岩引燃木头的形式点亮地狱门。然后你就可以进入下界了。',
      bullets: [
        '如果你持有钻石工具，可以拆除处于下界的传送门获取黑曜石并保存在箱子内，然后通过跳入虚空的方式返回主世界，重复进入下界以在前期获取黑曜石。'
      ]
    },
    {
      step: 12,
      title: '击杀末影龙',
      body: '通过杀死在下界要塞区域生成的烈焰人以获得烈焰粉，并与末影珍珠合成末影之眼并填充一个末地传送门。进入末地，击杀末影龙。'
    },
    {
      step: 13,
      title: '正式开始你的 MC 生存之旅',
      body: '至此，空岛的限制已经被你逐一拆解。剩下的，就是原版 Minecraft 的广阔天地。'
    }
  ],

  /* ── 图集 ── */
  gallery: [
    { src: 'assets/spawn_platform.png', cap: '出生点平台：草方块与一棵树', tag: '世界生成' },
    { src: 'assets/end_portal.png', cap: '末地传送门框架将得到保留', tag: '世界生成' },
    { src: 'assets/ancient_city_portal.png', cap: '远古城市传送门框架（带幽匿尖啸体）', tag: '世界生成' },
    { src: 'assets/amethyst_step_1_240.png', cap: '紫水晶母岩再生 · 步骤 1：熔岩源', tag: '模组特性' },
    { src: 'assets/amethyst_step_2_240.png', cap: '紫水晶母岩再生 · 步骤 2：用方解石包围熔岩', tag: '模组特性' },
    { src: 'assets/amethyst_step_3_240.png', cap: '紫水晶母岩再生 · 步骤 3：用平滑玄武岩包围方解石', tag: '模组特性' },
    { src: 'assets/amethyst_result_240.png', cap: '紫水晶母岩再生 · 熔岩变成了紫水晶母岩', tag: '模组特性' },
    { src: 'assets/ore_recipe.png', cap: '工作台合成矿石：下界岩 + 四块金锭 → 下界金矿石', tag: '数据包特性' },
    { src: 'assets/netherite_upgrade_smithing_template_recipe.png', cap: '下界合金升级锻造模板合成示意', tag: '示意图' }
  ],

  /* ── 规则设置 / 配置 / 进度 / 配方 ── */
  settings: [
    { "name": "commandSkyIsland", "type": "String", "cat": "command", "catLabel": "命令", "default": "\"ops\"", "sky": null, "options": null, "desc": "启用 /skyisland 命令以生成新的出生平台" },
    { "name": "generateEndPortals", "type": "boolean", "cat": "generation", "catLabel": "世界生成", "default": "true", "sky": null, "options": null, "desc": "在空岛世界中生成末地传送门框架" },
    { "name": "generateSilverfishSpawners", "type": "boolean", "cat": "generation", "catLabel": "世界生成", "default": "true", "sky": null, "options": null, "desc": "在空岛世界中生成蠹虫刷怪笼" },
    { "name": "generateAncientCityPortals", "type": "boolean", "cat": "generation", "catLabel": "世界生成", "default": "true", "sky": null, "options": null, "desc": "在空岛世界中生成远古城市传送门框架" },
    { "name": "generateMagmaCubeSpawners", "type": "boolean", "cat": "generation", "catLabel": "世界生成", "default": "false", "sky": null, "options": null, "desc": "在空岛世界中生成岩浆怪刷怪笼" },
    { "name": "generateRandomEndGateways", "type": "boolean", "cat": "generation", "catLabel": "世界生成", "default": "false", "sky": null, "options": null, "desc": "在空岛世界中生成随机分布于末地外岛的末地折跃门" },
    { "name": "tallFlowersFromWanderingTrader", "type": "boolean", "cat": "wandering_trader", "catLabel": "流浪商人", "default": "false", "sky": null, "options": null, "desc": "允许流浪商人售卖大型花" },
    { "name": "lavaFromWanderingTrader", "type": "boolean", "cat": "wandering_trader", "catLabel": "流浪商人", "default": "false", "sky": null, "options": null, "desc": "允许流浪商人售卖熔岩桶" },
    { "name": "lightningElectrifiesVines", "type": "boolean", "cat": "feature", "catLabel": "玩法特性", "default": "false", "sky": "true", "options": null, "desc": "允许闪电击中荧石时将附着于其上的藤蔓转化为发光地衣", "extra": ["闪电击中荧石上的避雷针时依然有效"] },
    { "name": "renewableBuddingAmethysts", "type": "boolean", "cat": "feature", "catLabel": "玩法特性", "default": "false", "sky": "true", "options": null, "desc": "允许被方解石和平滑玄武岩包围的熔岩转化为紫水晶母岩" },
    { "name": "gatewaysSpawnChorus", "type": "boolean", "cat": "feature", "catLabel": "玩法特性", "default": "false", "sky": "true", "options": null, "desc": "允许被末地折跃门生成的末地小岛上生成紫颂植株" },
    { "name": "renewableHeartsOfTheSea", "type": "boolean", "cat": "feature", "catLabel": "玩法特性", "default": "false", "sky": "true", "options": null, "desc": "允许海豚在被给予鱼时挖掘海洋之心" },
    { "name": "renewableDragonHeads", "type": "boolean", "cat": "feature", "catLabel": "玩法特性", "default": "false", "sky": "true", "options": null, "desc": "允许被闪电苦力怕杀死的末影龙掉落龙首" },
    { "name": "shulkerSpawnsOnDragonKill", "type": "boolean", "cat": "feature", "catLabel": "玩法特性", "default": "false", "sky": "true", "options": null, "desc": "允许潜影贝在末影龙再次被击杀时生成在末地祭坛的基岩柱上" },
    { "name": "renewableDiamonds", "type": "boolean", "cat": "feature", "catLabel": "玩法特性", "default": "false", "sky": "true", "options": null, "desc": "允许下落的铁砧将一组煤炭块压成一个钻石" },
    { "name": "rammingWart", "type": "boolean", "cat": "feature", "catLabel": "玩法特性", "default": "false", "sky": "true", "options": null, "desc": "允许山羊在冲撞时破坏下界疣块掉落下界疣" },
    { "name": "foxesSpawnWithSweetBerriesChance", "type": "double", "cat": "feature", "catLabel": "玩法特性", "default": "0d", "sky": "0.2", "options": ["0", "0.2", "1"], "desc": "狐狸带着甜浆果生成的概率" },
    { "name": "poisonousPotatoesConvertSpiders", "type": "boolean", "cat": "feature", "catLabel": "玩法特性", "default": "false", "sky": "true", "options": null, "desc": "当玩家手持毒马铃薯右键点击蜘蛛时允许将其转化为洞穴蜘蛛" },
    { "name": "saplingsDieOnSand", "type": "boolean", "cat": "feature", "catLabel": "玩法特性", "default": "false", "sky": "true", "options": null, "desc": "允许树苗种在沙子上，树苗种在沙子上时会很快枯死成枯萎的灌木" },
    { "name": "renewableEchoShards", "type": "boolean", "cat": "feature", "catLabel": "玩法特性", "default": "false", "sky": "true", "options": null, "desc": "允许具有回声定位功能的生物（蝙蝠和海豚）被监守者的音波杀死时掉落回响碎片" },
    { "name": "allayableVexes", "type": "boolean", "cat": "feature", "catLabel": "玩法特性", "default": "false", "sky": "true", "options": null, "desc": "允许恼鬼在音符盒按照正确顺序奏响后转化为悦灵" },
    { "name": "coralErosion", "type": "boolean", "cat": "feature", "catLabel": "玩法特性", "default": "false", "sky": "true", "options": null, "desc": "允许失活的珊瑚、珊瑚扇而非珊瑚块为含水方块且附近有流动的水时产生沙子\n火珊瑚会生成红沙" },
    { "name": "hugeMushroomsSpreadMycelium", "type": "boolean", "cat": "feature", "catLabel": "玩法特性", "default": "false", "sky": "true", "options": null, "desc": "允许大型蘑菇像大型云杉传播灰化土一样传播菌丝" },
    { "name": "renewableNetherrack", "type": "boolean", "cat": "feature", "catLabel": "玩法特性", "default": "false", "sky": "true", "options": null, "desc": "允许下界岩或菌岩生成在空中的下界传送门旁边", "extra": ["生成什么下界岩变种取决于生物群系，其中菌岩（绯红菌岩和诡异菌岩）会生成在对应的森林群系（绯红森林和诡异森林），而在其他群系只会生成下界岩。"] },
    { "name": "renewableDeepslate", "type": "String", "cat": "feature", "catLabel": "玩法特性", "default": "\"false\"", "sky": "true", "options": ["true", "false", "no_splash"], "desc": "允许浓稠的药水将石头转化为深板岩，可以通过右键点击或者使用喷溅药水", "extra": ["启用no_splash：使用喷溅药水将石头转化为深板岩会被禁用"] },
    { "name": "renewableSwiftSneak", "type": "boolean", "cat": "feature", "catLabel": "玩法特性", "default": "false", "sky": "true", "options": null, "desc": "允许监守者附近的附魔台提供迅捷潜行的附魔" },
    { "name": "traderCamels", "type": "boolean", "cat": "feature", "catLabel": "玩法特性", "default": "false", "sky": "true", "options": null, "desc": "流浪商人在某些生物群系中生成时会骑乘骆驼" },
    { "name": "sniffersFromDrowneds", "type": "boolean", "cat": "feature", "catLabel": "玩法特性", "default": "false", "sky": "true", "options": null, "desc": "溺尸在生成时有时会手持一个嗅探兽蛋", "extra": ["海龟蛋被踩踏时会转化为嗅探兽蛋"] },
    { "name": "suspiciousSniffers", "type": "String", "cat": "feature", "catLabel": "玩法特性", "default": "\"false\"", "sky": "true", "options": ["true", "false", "no_iron"], "desc": "嗅探兽在某些情况下可以将沙子和沙砾转变为可疑的沙子和可疑的沙砾", "extra": ["当嗅探兽在可疑的沙子或可疑的沙砾会自然生成的地方（可疑的沙子：沙漠神殿内部的地窖中、沙漠水井下方、热带海底废墟中 可疑的沙砾：寒带海底废墟和古迹废墟中）挖掘沙子或沙砾时，沙子或沙砾会转化为可疑的沙子和砂砾", "启用no_iron：嗅探兽挖掘的时候将不会掉落铁粒"] },
    { "name": "spreadingSmallDripleaves", "type": "boolean", "cat": "feature", "catLabel": "玩法特性", "default": "false", "sky": "true", "options": null, "desc": "允许小型垂滴叶在某些情况下可以缓慢地传播到附近的方块上", "extra": ["需要让小型垂滴叶种植在黏土块上，至少一格被水淹没，顶部为5级光照"] },
    { "name": "spreadingCoral", "type": "boolean", "cat": "feature", "catLabel": "玩法特性", "default": "false", "sky": "true", "options": null, "desc": "允许珊瑚传播到附近的方解石上", "extra": ["珊瑚传播到方解石上的概率随坐标的不同而变化"] },
    { "name": "maxWanderingTraderSpawnChance", "type": "double", "cat": "wandering_trader", "catLabel": "流浪商人", "default": "0.075", "sky": null, "options": ["0.075", "0.2", "1"], "desc": "流浪商人的最大生成概率", "extra": ["这个值从0.025开始，每当流浪商人生成失败时会增加0.025，直到达到最大生成概率"] },
    { "name": "wanderingTraderSpawnRate", "type": "int", "cat": "wandering_trader", "catLabel": "流浪商人", "default": "24000", "sky": null, "options": ["6000", "24000", "72000"], "desc": "流浪商人在每个游戏刻生成的概率" }
  ],
  config: [
    { "key": "defaultToSkyBlockWorld", "label": "将空岛世界类型设为默认", "type": "boolean", "default": false, "desc": "创建新世界时，世界类型默认选中 <code>SkyBlock</code>，无需每次手动切换。" },
    { "key": "enableDatapackByDefault", "label": "默认启用空岛数据包", "type": "boolean", "default": false, "desc": "创建世界时自动勾选内置数据包 <code>carpetskyadditions/skyblock</code>。" },
    { "key": "initialTreeType", "label": "默认选择的初始树木类型", "type": "enum", "default": "Oak", "options": ["Oak", "Acacia"], "desc": "出生点平台上的那棵树是橡木还是金合欢。仅在默认启用数据包时使用。" },
    { "key": "autoEnableDefaultSettings", "label": "首次加载空岛世界时自动启用默认设置", "type": "boolean", "default": true, "desc": "新空岛世界第一次加载时，把下表中标记为「默认开启」的规则一次性打开。" }
  ],
  advancements: [
    { "id": "challenges/all_banner_patterns", "parent": "challenges/root", "title": "旗帜图案收藏家", "en": "Seeing Patterns Everywhere", "desc": "获取所有旗帜图案", "frame": "challenge", "icon": "flower_banner_pattern", "iconName": "花朵旗帜图案", "detail": "集齐全部旗帜图案后授予。图案来自各种结构与流浪商人，是本包最考验探索的一条。", "reward": "哨兵盔甲纹饰模板" },
    { "id": "challenges/all_light_sources", "parent": "challenges/root", "title": "光源收藏家", "en": "Let There Be Light", "desc": "获得所有光源", "frame": "challenge", "icon": "torch", "iconName": "火把", "detail": "收集清单：火把与灵魂火把、灯笼与灵魂灯笼、营火与灵魂营火、蜡烛与全部染色蜡烛、萤石、南瓜灯、菌光体、海晶灯、全部蛙明灯、熔岩桶、红石灯、发光浆果、发光地衣、海泡菜、末地烛、熔炉/高炉/烟熏炉、酿造台、哭泣的黑曜石、重生锚、红石矿石与深层红石矿石、附魔台、末影箱、红石火把、幽匿感测体与校准幽匿感测体、幽匿催发体、紫水晶簇与各尺寸晶芽、岩浆块、棕色蘑菇、信标、潮涌核心、龙蛋。", "reward": "眼眸盔甲纹饰模板" },
    { "id": "challenges/all_purpur_blocks_levitated", "parent": "challenges/root", "title": "人造末地城", "en": "End City Builder", "desc": "在受到漂浮效果时合成所有紫珀块及其变种", "frame": "challenge", "icon": "purpur_block", "iconName": "紫珀块", "detail": "在处于飘浮效果时，合成或切石获得全部紫珀块、紫珀柱、紫珀楼梯与紫珀台阶。", "reward": "尖塔盔甲纹饰模板" },
    { "id": "challenges/find_woodland_mansion", "parent": "challenges/root", "title": "通往鸟不拉屎之地的地图", "en": "Treasure Map to Nowhere", "desc": "通过林地探险家地图找到一所林地府邸", "frame": "challenge", "icon": "filled_map", "iconName": "地图", "detail": "进入林地府邸的结构边界即授予。设计意图是跟着村民卖的林地探险家地图走，当然直接查坐标也行。", "reward": "恼鬼盔甲纹饰模板" },
    { "id": "challenges/kill_wither_in_fortress", "parent": "challenges/root", "title": "凋灵的老家", "en": "Wither Art Thou", "desc": "在下界要塞中杀死一只凋灵", "frame": "challenge", "icon": "wither_rose", "iconName": "凋灵玫瑰", "detail": "在下界要塞（那个不大的）结构边界内杀死凋灵。", "reward": "肋骨盔甲纹饰模板" },
    { "id": "challenges/play_every_music_disc", "parent": "challenges/root", "title": "Let's Rock!", "en": "Air Tunes", "desc": "播放所有音乐唱片", "frame": "challenge", "icon": "jukebox", "iconName": "唱片机", "detail": "把每一张音乐唱片都放进唱片机播放。注意必须是手动右键放进唱片机，用漏斗送进去不算。", "reward": "寂静盔甲纹饰模板" },
    { "id": "challenges/recreate_desert_pyramid", "parent": "challenges/root", "title": "古人之道", "en": "Way of the Ancients", "desc": "建造一个精确的沙漠神殿然后在中心蓝色陶瓦上献祭（杀死） 一只尸壳", "frame": "challenge", "icon": "chiseled_sandstone", "iconName": "雕纹砂岩", "detail": "按沙漠神殿原结构精确复刻一座，朝向不限；只需从蓝色陶瓦那一层做到顶层。在中心蓝色陶瓦上献祭（杀死）一只尸壳即授予。", "reward": "沙丘盔甲纹饰模板" },
    { "id": "challenges/root", "parent": null, "title": "空岛挑战", "en": "SkyBlock Challenges", "desc": "有偿的空岛挑战", "frame": "task", "icon": "spire_armor_trim_smithing_template", "iconName": "尖塔盔甲纹饰模板" },
    { "id": "challenges/sail_30km", "parent": "challenges/root", "title": "航行60里！", "en": "Sky Pirate", "desc": "在船上行驶30千米", "frame": "challenge", "icon": "cherry_boat", "iconName": "樱花木船", "detail": "坐船累计航行 30 千米。", "reward": "海岸盔甲纹饰模板" },
    { "id": "challenges/spyglass_at_all_animals", "parent": "challenges/root", "title": "远望空岛", "en": "Spy in the Sky", "desc": "在可视距离内用望远镜看所有动物", "frame": "challenge", "icon": "spyglass", "iconName": "望远镜", "detail": "用望远镜依次看过：美西螈、蝙蝠、蜜蜂、骆驼、猫、蜘蛛与洞穴蜘蛛、鸡、鳕鱼/鲑鱼/河豚/热带鱼、牛、海豚、马/驴/骡、末影螨、狐狸、青蛙与蝌蚪、鱿鱼与发光鱿鱼、山羊、疣猪兽、羊驼、哞菇、豹猫、熊猫、鹦鹉、猪、北极熊、兔子、羊、蠹虫、嗅探兽、炽足兽、海龟、狼。", "reward": "荒野盔甲纹饰模板" },
    { "id": "challenges/war_pigs", "parent": "challenges/root", "title": "War Pigs", "en": "War Pigs", "desc": "杀死一只猪灵蛮兵时戴着猪灵头颅同时骑着一只猪", "frame": "challenge", "icon": "golden_axe", "iconName": "金斧", "detail": "骑着一只猪、戴着猪灵头颅，杀死一只猪灵蛮兵。原版的「战猪」进度在空岛不可能完成，这条是它的替代。", "reward": "猪鼻盔甲纹饰模板", "titleMissing": true },
    { "id": "challenges/warden_hit_with_resistance", "parent": "challenges/root", "title": "抗性提升也无济于事", "en": "Resistance Isn't Futile", "desc": "在穿戴整套的保护IV下界合金盔甲并且带有抗性提升IV药水效果（神龟药水II）的情况下被监守者攻击", "frame": "challenge", "icon": "netherite_chestplate", "iconName": "下界合金胸甲", "detail": "穿齐附魔保护 IV 的下界合金盔甲、并带有抗性提升 IV 时，被监守者打中一次。", "reward": "监守盔甲纹饰模板" },
    { "id": "progression/all_archaeology_items", "parent": "progression/generate_suspicious_loot_table", "title": "考古专家", "en": "Master Archaeologist", "desc": "挖掘所有的考古战利品", "frame": "challenge", "icon": "wayfinder_armor_trim_smithing_template", "iconName": "向导盔甲纹饰模板" },
    { "id": "progression/all_saplings", "parent": "progression/wandering_trader", "title": "园艺大师", "en": "Arborist", "desc": "从流浪商人处交易得到所有种类的树苗", "frame": "goal", "icon": "jungle_sapling", "iconName": "丛林树苗" },
    { "id": "progression/all_wandering_trader_trades", "parent": "progression/all_saplings", "title": "操盘手", "en": "Day Trader", "desc": "购买（在空岛模式中）独属于流浪商人的所有物品", "frame": "challenge", "icon": "pumpkin", "iconName": "南瓜" },
    { "id": "progression/allay_vex", "parent": "progression/emerald", "title": "享受音乐", "en": "Relaxing Music", "desc": "通过在音符盒弹奏正确旋律的方式安抚一只恼鬼并将其转化为悦灵", "frame": "challenge", "icon": "note_block", "iconName": "音符盒" },
    { "id": "progression/ancient_debris", "parent": "progression/the_nether", "title": "残骸收集者", "en": "Brutiful", "desc": "堡垒遗迹中杀死一只猪灵蛮兵以获得一个远古残骸", "frame": "challenge", "icon": "ancient_debris", "iconName": "远古残骸" },
    { "id": "progression/blasted_rock", "parent": "progression/quartz", "title": "大师级石匠", "en": "Cooking Stone in a Stone Oven", "desc": "将闪长岩或安山岩烧制为方解石或凝灰岩", "frame": "goal", "icon": "tuff", "iconName": "凝灰岩" },
    { "id": "progression/boat_with_witch", "parent": "progression/golden_apple", "title": "药水飞弹", "en": "Witch Cannon", "desc": "在一条有女巫的船上躲过她投掷的药水", "frame": "task", "icon": "splash_potion", "iconName": "喷溅药水" },
    { "id": "progression/bone_block", "parent": "progression/bone_meal", "title": "防火之骨", "en": "Lightning-Proof", "desc": "使用骨粉合成骨块来获得额外的防火方块", "frame": "task", "icon": "bone_block", "iconName": "骨块" },
    { "id": "progression/bone_meal", "parent": "progression/kill_skeleton", "title": "金坷垃", "en": "Fertilizer", "desc": "用骨头分解成骨粉来催熟树苗", "frame": "task", "icon": "bone_meal", "iconName": "骨粉" },
    { "id": "progression/breed_pigs", "parent": "progression/zombie_crop", "title": "猪之起源", "en": "Swine Flu", "desc": "繁衍第一只猪", "frame": "task", "icon": "porkchop", "iconName": "生猪排" },
    { "id": "progression/cauldron", "parent": "progression/iron_ingot", "title": "“聚雨盆”", "en": "Please Rain...", "desc": "合成一个炼药锅以接取雨水", "frame": "task", "icon": "cauldron", "iconName": "炼药锅" },
    { "id": "progression/coal", "parent": "progression/the_nether", "title": "化石燃料", "en": "Fossil Fuel", "desc": "击败一只凋灵骷髅以获得煤炭", "frame": "task", "icon": "coal", "iconName": "煤炭" },
    { "id": "progression/cobblestone", "parent": "progression/lava_bucket", "title": "太空时代", "en": "Space Age", "desc": "修建一个刷石机", "frame": "task", "icon": "cobblestone", "iconName": "圆石" },
    { "id": "progression/cobweb", "parent": "progression/go_down", "title": "万维网", "en": "World Wide Web", "desc": "击杀蜘蛛骑士以获得蜘蛛网", "frame": "goal", "icon": "cobweb", "iconName": "蜘蛛网" },
    { "id": "progression/cocoa_beans", "parent": "progression/water_bucket", "title": "巧克力！", "en": "Beware Of Piranhas", "desc": "在丛林钓得可可豆", "frame": "goal", "icon": "cocoa_beans", "iconName": "可可豆" },
    { "id": "progression/complete_bartering", "parent": "progression/quartz", "title": "闲鱼达人", "en": "Barter 100", "desc": "获得可以和猪灵交易得到的所有物品", "frame": "challenge", "icon": "gilded_blackstone", "iconName": "镶金黑石" },
    { "id": "progression/convert_spider", "parent": "progression/zombie_crop", "title": "蜘蛛学家", "en": "Spider Scientist", "desc": "通过毒马铃薯将一只蜘蛛转化为洞穴蜘蛛", "frame": "goal", "icon": "poisonous_potato", "iconName": "毒马铃薯" },
    { "id": "progression/cure_zombie_villager", "parent": "progression/boat_with_witch", "title": "村民医生", "en": "Trade Doctor", "desc": "利用女巫投掷的虚弱药水救治一个僵尸村民", "frame": "task", "icon": "bell", "iconName": "钟" },
    { "id": "progression/dead_bush", "parent": "progression/sand", "title": "生机全无", "en": "Herbicidal Maniac", "desc": "通过放置在沙子上杀死一株树苗", "frame": "goal", "icon": "dead_bush", "iconName": "枯萎的灌木" },
    { "id": "progression/deepslate", "parent": "progression/cobblestone", "title": "故作深沉", "en": "That's Deep, Bro", "desc": "使用浓稠的药水将石头转化为深板岩", "frame": "goal", "icon": "deepslate", "iconName": "深板岩" },
    { "id": "progression/diamond", "parent": "progression/coal", "title": "人工钻石！", "en": "Synthetic Diamonds!", "desc": "众所周知，下落的铁砧堪比大自然的鬼斧神工", "frame": "goal", "icon": "diamond", "iconName": "钻石" },
    { "id": "progression/diamond_horse_armor", "parent": "progression/diamond", "title": "捷影武装", "en": "Cover Shadowfax With Diamonds", "desc": "使用钻石马铠武装你的马", "frame": "challenge", "icon": "diamond_horse_armor", "iconName": "钻石马铠" },
    { "id": "progression/dragon_head", "parent": "progression/the_end", "title": "苦力怕……还有末影龙", "en": "Creepers... and Dragons", "desc": "用闪电苦力怕击败一只末影龙以取得它的头颅", "frame": "challenge", "icon": "dragon_head", "iconName": "龙首" },
    { "id": "progression/echo_shard", "parent": "progression/sculk_catalyst", "title": "超声过载", "en": "Echolocation Overload", "desc": "使用监守者的音波尖啸杀一只蝙蝠或海豚以取得回响碎片", "frame": "challenge", "icon": "echo_shard", "iconName": "回响碎片" },
    { "id": "progression/elytra", "parent": "progression/kill_shulker", "title": "高高在上", "en": "High and Mitey", "desc": "从浮空的末影螨身上得到一对鞘翅", "frame": "challenge", "icon": "elytra", "iconName": "鞘翅" },
    { "id": "progression/emerald", "parent": "progression/cure_zombie_villager", "title": "第一桶金！", "en": "Emerald City", "desc": "通过交易取得绿宝石", "frame": "task", "icon": "emerald", "iconName": "绿宝石" },
    { "id": "progression/enchanted_golden_apple", "parent": "progression/emerald", "title": "猫的报恩", "en": "Hello Kitty", "desc": "在猫咪的晨起赠礼中获得一个附魔金苹果", "frame": "challenge", "icon": "enchanted_golden_apple", "iconName": "附魔金苹果" },
    { "id": "progression/generate_chorus", "parent": "progression/the_end", "title": "谁种在这的?", "en": "Who Planted This Here?", "desc": "在末地折跃门生成的小岛上找到紫颂植物", "frame": "goal", "icon": "chorus_flower", "iconName": "紫颂花" },
    { "id": "progression/generate_geode", "parent": "progression/blasted_rock", "title": "宝石学", "en": "Gemology", "desc": "生成紫水晶母岩", "frame": "goal", "icon": "budding_amethyst", "iconName": "紫水晶母岩" },
    { "id": "progression/generate_suspicious_loot_table", "parent": "progression/sniffer_egg", "title": "宝藏的味道！", "en": "Whiff of Treasure", "desc": "通过嗅探兽在可疑的沙子或沙砾里发现宝藏", "frame": "goal", "icon": "prize_pottery_sherd", "iconName": "奖品纹样陶片" },
    { "id": "progression/glow_berries", "parent": "progression/sweet_berries", "title": "辉光闪烁", "en": "Glowification", "desc": "使用荧光墨囊与甜浆果合成发光浆果", "frame": "goal", "icon": "glow_berries", "iconName": "发光浆果" },
    { "id": "progression/glow_lichen", "parent": "progression/lightning_rod", "title": "充能", "en": "Electrifying", "desc": "将一些藤蔓转化为发光地衣", "frame": "goal", "icon": "glow_lichen", "iconName": "发光地衣" },
    { "id": "progression/glowstone", "parent": "progression/kill_witch", "title": "祂说：要有光", "en": "And Then There Was Light", "desc": "合成一些萤石用于照明", "frame": "task", "icon": "glowstone", "iconName": "荧石" },
    { "id": "progression/go_down", "parent": "progression/trapdoor", "title": "到达世界最低层！", "en": "Get Down!", "desc": "低处刷怪更多", "frame": "task", "icon": "bedrock", "iconName": "基岩" },
    { "id": "progression/gold_nugget", "parent": "progression/lightning_rod", "title": "\"活着\"", "en": "IT'S ALIV... er Undead", "desc": "通过闪电转化一些僵尸猪人，然后杀死他们获得金粒", "frame": "task", "icon": "gold_nugget", "iconName": "金粒" },
    { "id": "progression/golden_apple", "parent": "progression/gold_nugget", "title": "灵丹妙药", "en": "Panacea", "desc": "合成一个金苹果", "frame": "task", "icon": "golden_apple", "iconName": "金苹果" },
    { "id": "progression/gravel", "parent": "progression/the_nether", "title": "碎石机", "en": "Graveler", "desc": "从猪灵交易中获得砂砾", "frame": "goal", "icon": "gravel", "iconName": "沙砾" },
    { "id": "progression/heart_of_the_sea", "parent": "progression/sand", "title": "海豚的惊喜", "en": "Heart of a Dolphin", "desc": "给海豚点礼物，说不定它会给你一个惊喜", "frame": "challenge", "icon": "heart_of_the_sea", "iconName": "海洋之心" },
    { "id": "progression/iron_farm", "parent": "progression/cure_zombie_villager", "title": "钢筋铁骨", "en": "Ironic", "desc": "通过刷铁机获得整组的铁锭", "frame": "goal", "icon": "iron_block", "iconName": "铁块" },
    { "id": "progression/iron_ingot", "parent": "progression/kill_zombie", "title": "我是欧洲人！", "en": "Steal Hardware", "desc": "杀死僵尸以获得铁", "frame": "task", "icon": "iron_ingot", "iconName": "铁锭" },
    { "id": "progression/kill_drowned", "parent": "progression/water_bucket", "title": "海王克星", "en": "Aquaman's Nemesis", "desc": "击杀一只溺尸以获取铜锭", "frame": "task", "icon": "copper_ingot", "iconName": "铜锭" },
    { "id": "progression/kill_shulker", "parent": "progression/the_end", "title": "尸中躯壳", "en": "Shulking in the Shadows", "desc": "击败一只从末影龙尸体上诞生的潜影贝", "frame": "goal", "icon": "shulker_box", "iconName": "潜影盒" },
    { "id": "progression/kill_skeleton", "parent": "progression/go_down", "title": "骸骨", "en": "Beware of Knockback", "desc": "击杀一只骷髅以获得它的骨头", "frame": "task", "icon": "bow", "iconName": "弓" },
    { "id": "progression/kill_spider", "parent": "progression/go_down", "title": "多足恐惧症", "en": "Eight Legged Freak", "desc": "击杀一只蜘蛛获取线", "frame": "task", "icon": "string", "iconName": "线" },
    { "id": "progression/kill_witch", "parent": "progression/go_down", "title": "猎巫行动", "en": "Witch Hunt", "desc": "击杀一只女巫", "frame": "task", "icon": "potion", "iconName": "药水" },
    { "id": "progression/kill_zombie", "parent": "progression/go_down", "title": "超度成功，功德+1！", "en": "The Evil Dead", "desc": "杀死第一只僵尸", "frame": "task", "icon": "rotten_flesh", "iconName": "腐肉" },
    { "id": "progression/lava_bucket", "parent": "progression/village_hero", "title": "炙手可热", "en": "Lavely Gift", "desc": "从工具商手中获得一个熔岩桶", "frame": "task", "icon": "lava_bucket", "iconName": "熔岩桶" },
    { "id": "progression/lightning_rod", "parent": "progression/kill_drowned", "title": "风暴统领", "en": "Storm Tamer", "desc": "建造避雷针来劈猪", "frame": "task", "icon": "lightning_rod", "iconName": "避雷针" },
    { "id": "progression/log", "parent": "progression/root", "title": "想致富，先撸树", "en": "The First of Many", "desc": "获得第一块橡木原木", "frame": "task", "icon": "oak_log", "iconName": "橡木原木" },
    { "id": "progression/max_coral_suitability", "parent": "progression/spread_coral", "title": "珊瑚丛生", "en": "Coral Utopia", "desc": "在珊瑚附近放置方解石珊瑚将生长", "frame": "challenge", "icon": "brain_coral_block", "iconName": "脑纹珊瑚块" },
    { "id": "progression/moss_block", "parent": "progression/wandering_trader", "title": "藓为人知", "en": "Moss Def a Good Buy", "desc": "从流浪商人手中购得一个苔藓块", "frame": "goal", "icon": "moss_block", "iconName": "苔藓块" },
    { "id": "progression/music_disc_5", "parent": "progression/music_disc_otherside", "title": "品味独特", "en": "Weird Taste in Music", "desc": "骷髅在远古城市中射杀苦力怕时会掉落\"5\"的唱片残片，集齐它们然后合成完整的唱片", "frame": "challenge", "icon": "music_disc_5", "iconName": "唱片 5" },
    { "id": "progression/music_disc_otherside", "parent": "progression/music_disc_pigstep", "title": "世外之音", "en": "Otherworldy Sounds", "desc": "获得骷髅在要塞中射杀苦力怕掉落的唱片\"otherside\"", "frame": "goal", "icon": "music_disc_otherside", "iconName": "唱片 Otherside" },
    { "id": "progression/music_disc_pigstep", "parent": "progression/the_nether", "title": "新曲打榜", "en": "Chart Topper", "desc": "获得骷髅在堡垒遗迹中射杀苦力怕掉落的唱片\"Pigstep\"", "frame": "goal", "icon": "music_disc_pigstep", "iconName": "唱片 Pigstep" },
    { "id": "progression/nether_wart", "parent": "progression/netherrack", "title": "拆 解 台", "en": "Billy, I Need You", "desc": "让一只山羊撞击地狱疣块", "frame": "goal", "icon": "nether_wart", "iconName": "下界疣" },
    { "id": "progression/netherrack", "parent": "progression/the_nether", "title": "奇迹在世", "en": "Mirackulous Appearance", "desc": "挖一些伴随下界传送门生成的下界岩", "frame": "task", "icon": "netherrack", "iconName": "下界岩" },
    { "id": "progression/ore", "parent": "progression/cobblestone", "title": "矿石收藏家", "en": "Decorative Ores", "desc": "在锻造台中合成一种矿石", "frame": "goal", "icon": "diamond_ore", "iconName": "钻石矿石" },
    { "id": "progression/pointed_dripstone", "parent": "progression/wandering_trader", "title": "无限熔岩！", "en": "What's The Point?", "desc": "从流浪商人处购买滴水石锥以获得无限熔岩", "frame": "task", "icon": "pointed_dripstone", "iconName": "滴水石锥" },
    { "id": "progression/quartz", "parent": "progression/gravel", "title": "侦测器与比较器", "en": "Observers and Comparators", "desc": "和猪灵交易获得下界石英", "frame": "task", "icon": "quartz", "iconName": "下界石英" },
    { "id": "progression/red_bed", "parent": "progression/kill_spider", "title": "万床之祖", "en": "The OG Bed", "desc": "做一张红色的床", "frame": "task", "icon": "red_bed", "iconName": "红色床" },
    { "id": "progression/redstone", "parent": "progression/kill_witch", "title": "红石！", "en": "Can't Do Much With This... Yet", "desc": "从女巫手中获得一些红石", "frame": "task", "icon": "redstone", "iconName": "红石" },
    { "id": "progression/ride_camel", "parent": "progression/wandering_trader", "title": "骑驼商人", "en": "Hump Day Trader", "desc": "骑上沙漠流浪商人的骆驼", "frame": "goal", "icon": "cactus", "iconName": "仙人掌" },
    { "id": "progression/root", "parent": null, "title": "空岛", "en": "SkyBlock", "desc": "无中生有", "frame": "task", "icon": "feather", "iconName": "羽毛" },
    { "id": "progression/sand", "parent": "progression/water_bucket", "title": "二氧化硅", "en": "It Gets Everywhere", "desc": "使用水流冲刷失活的珊瑚以生成沙子或红沙", "frame": "task", "icon": "sand", "iconName": "沙子" },
    { "id": "progression/sapling", "parent": "progression/log", "title": "1=∞", "en": "The Circle of Life", "desc": "种下你的第一棵树苗", "frame": "task", "icon": "oak_sapling", "iconName": "橡树树苗" },
    { "id": "progression/sculk_catalyst", "parent": "progression/go_down", "title": "来自深渊", "en": "Monster of the Deep", "desc": "击杀一个监守者以获得幽匿催发体", "frame": "challenge", "icon": "sculk_catalyst", "iconName": "幽匿催发体" },
    { "id": "progression/silk_touch", "parent": "progression/kill_zombie", "title": "轻松搬运", "en": "Easier than Endermen", "desc": "获取一个精准采集工具，这样你就可以轻松地搬运草方块了", "frame": "goal", "icon": "golden_shovel", "iconName": "金锹" },
    { "id": "progression/sniffer_egg", "parent": "progression/kill_drowned", "title": "史前养父母", "en": "Prehistoric Foster Parent", "desc": "当一个手持一个嗅探兽蛋的溺尸踩踏海龟蛋时杀死他以获得嗅探兽蛋", "frame": "goal", "icon": "sniffer_egg", "iconName": "嗅探兽蛋" },
    { "id": "progression/snout", "parent": "progression/the_nether", "title": "缘何在此", "en": "Why'd It Have That?", "desc": "击杀僵尸疣猪兽以获得猪鼻旗帜", "frame": "goal", "icon": "piglin_banner_pattern", "iconName": "猪灵旗帜图案" },
    { "id": "progression/soul_sand", "parent": "progression/gravel", "title": "起泡器", "en": "Bubbler", "desc": "和猪灵交易获得灵魂沙", "frame": "task", "icon": "soul_sand", "iconName": "灵魂沙" },
    { "id": "progression/soul_soil", "parent": "progression/soul_sand", "title": "灵魂沙+3木棍+3原木=灵魂土↓", "en": "A Changing Soul", "desc": "通过合成灵魂营火再破坏的方式将灵魂沙转化成灵魂土", "frame": "goal", "icon": "soul_soil", "iconName": "灵魂土" },
    { "id": "progression/sponge", "parent": "progression/water_bucket", "title": "是谁住在深海的大菠萝里？", "en": "Too Much Water!", "desc": "击杀一只通过雷击的方式从守卫者转化成的远古守卫者来获得海绵", "frame": "challenge", "icon": "sponge", "iconName": "海绵" },
    { "id": "progression/spore_blossom", "parent": "progression/moss_block", "title": "粉红佳丽", "en": "Pretty in Pink", "desc": "从盛开的杜鹃花丛中获得孢子花", "frame": "goal", "icon": "spore_blossom", "iconName": "孢子花" },
    { "id": "progression/spread_coral", "parent": "progression/blasted_rock", "title": "人造珊瑚礁！", "en": "Reef Builder", "desc": "在珊瑚附近放置方解石可以使珊瑚传播到方解石上", "frame": "goal", "icon": "calcite", "iconName": "方解石" },
    { "id": "progression/spread_small_dripleaf", "parent": "progression/wandering_trader", "title": "Perfect Growing Conditions", "en": "Perfect Growing Conditions", "desc": "Place a Small Dripleaf where it can spread", "frame": "goal", "icon": "small_dripleaf", "iconName": "小型垂滴叶", "titleMissing": true },
    { "id": "progression/sweet_berries", "parent": "progression/silk_touch", "title": "狐口夺食", "en": "Snatched from the Jaws", "desc": "从狐狸嘴中获得浆果", "frame": "goal", "icon": "sweet_berries", "iconName": "甜浆果" },
    { "id": "progression/swift_sneak", "parent": "progression/diamond", "title": "致命沉默", "en": "Silent but Deadly", "desc": "为靴子进行迅捷潜行附魔", "frame": "challenge", "icon": "netherite_leggings", "iconName": "下界合金护腿" },
    { "id": "progression/tall_flowers", "parent": "progression/wandering_trader", "title": "花商", "en": "Florist", "desc": "通过流浪商人交易获得全部高花丛", "frame": "goal", "icon": "rose_bush", "iconName": "玫瑰丛" },
    { "id": "progression/tall_plants", "parent": "progression/bone_meal", "title": "鸡肋宝箱", "en": "Who Needs Village Chests?", "desc": "通过击杀拾起高草或高蕨的末影人来获得他们手中的物品", "frame": "challenge", "icon": "large_fern", "iconName": "大型蕨" },
    { "id": "progression/the_end", "parent": "progression/the_nether", "title": "终末之始", "en": "Of Course It's Not The End", "desc": "抵达末地", "frame": "task", "icon": "end_portal_frame", "iconName": "末地传送门框架" },
    { "id": "progression/the_nether", "parent": "progression/pointed_dripstone", "title": "地狱空荡荡", "en": "It's Empty Too", "desc": "深入下界", "frame": "task", "icon": "red_nether_bricks", "iconName": "红色下界砖块" },
    { "id": "progression/trapdoor", "parent": "progression/sapling", "title": "人往低处走", "en": "Crawling Down", "desc": "趴下并对着置于方块底部的活板门放置方块以搭建向下的天梯", "frame": "task", "icon": "oak_trapdoor", "iconName": "橡木活板门" },
    { "id": "progression/village_hero", "parent": "progression/cure_zombie_villager", "title": "村庄英雄！", "en": "Big Hero 6", "desc": "拯救村子，然后成为英雄", "frame": "task", "icon": "white_banner", "iconName": "白色旗帜" },
    { "id": "progression/wandering_trader", "parent": "progression/emerald", "title": "见鬼去吧！下次再见！", "en": "Thank You, Come Again", "desc": "进行你与流浪商人的第一次交易", "frame": "task", "icon": "red_banner", "iconName": "红色旗帜" },
    { "id": "progression/water_bucket", "parent": "progression/cauldron", "title": "生命之源", "en": "Water!", "desc": "从灌满的炼药锅中接取一桶水", "frame": "task", "icon": "water_bucket", "iconName": "水桶" },
    { "id": "progression/wheat", "parent": "progression/bone_meal", "title": "饲料", "en": "Animal Feed", "desc": "建造一个小麦农场", "frame": "task", "icon": "wheat", "iconName": "小麦" },
    { "id": "progression/zombie_crop", "parent": "progression/kill_zombie", "title": "农民僵尸？", "en": "Death of a Gardener", "desc": "从僵尸的掉落物中获取胡萝卜和土豆，然后建造农场开始养猪", "frame": "task", "icon": "carrot", "iconName": "胡萝卜" },
    { "id": "progression/apple_sapling", "parent": "progression/wandering_trader", "title": "苹果树！", "en": "Apple Tree", "desc": "从流浪商人那里购买一个橡树树苗或者四个深色橡树树苗", "frame": "task", "icon": "apple", "iconName": "苹果" }
  ],
  recipes: [
    { "id": "coal_ore", "file": "data/skyblock/recipes/coal_ore.json", "type": "crafting_shaped", "result": "煤矿石", "count": 1, "group": "矿石", "grid": [["", "X", ""], ["X", "S", "X"], ["", "X", ""]], "key": { "S": "石头", "X": "煤炭" } },
    { "id": "copper_ore", "file": "data/skyblock/recipes/copper_ore.json", "type": "crafting_shaped", "result": "铜矿石", "count": 1, "group": "矿石", "grid": [["", "X", ""], ["X", "S", "X"], ["", "X", ""]], "key": { "S": "石头", "X": "铜块" } },
    { "id": "diamond_ore", "file": "data/skyblock/recipes/diamond_ore.json", "type": "crafting_shaped", "result": "钻石矿石", "count": 1, "group": "矿石", "grid": [["", "X", ""], ["X", "S", "X"], ["", "X", ""]], "key": { "S": "石头", "X": "钻石" } },
    { "id": "emerald_ore", "file": "data/skyblock/recipes/emerald_ore.json", "type": "crafting_shaped", "result": "绿宝石矿石", "count": 1, "group": "矿石", "grid": [["", "X", ""], ["X", "S", "X"], ["", "X", ""]], "key": { "S": "石头", "X": "绿宝石" } },
    { "id": "gold_ore", "file": "data/skyblock/recipes/gold_ore.json", "type": "crafting_shaped", "result": "金矿石", "count": 1, "group": "矿石", "grid": [["", "X", ""], ["X", "S", "X"], ["", "X", ""]], "key": { "S": "石头", "X": "金锭" } },
    { "id": "iron_ore", "file": "data/skyblock/recipes/iron_ore.json", "type": "crafting_shaped", "result": "铁矿石", "count": 1, "group": "矿石", "grid": [["", "X", ""], ["X", "S", "X"], ["", "X", ""]], "key": { "S": "石头", "X": "铁锭" } },
    { "id": "lapis_ore", "file": "data/skyblock/recipes/lapis_ore.json", "type": "crafting_shaped", "result": "青金石矿石", "count": 1, "group": "矿石", "grid": [["", "X", ""], ["X", "S", "X"], ["", "X", ""]], "key": { "S": "石头", "X": "青金石块" } },
    { "id": "nether_gold_ore", "file": "data/skyblock/recipes/nether_gold_ore.json", "type": "crafting_shaped", "result": "下界金矿石", "count": 1, "group": "矿石", "grid": [["", "X", ""], ["X", "N", "X"], ["", "X", ""]], "key": { "N": "下界岩", "X": "金锭" } },
    { "id": "nether_quartz_ore", "file": "data/skyblock/recipes/nether_quartz_ore.json", "type": "crafting_shaped", "result": "下界石英矿石", "count": 1, "group": "矿石", "grid": [["", "X", ""], ["X", "N", "X"], ["", "X", ""]], "key": { "N": "下界岩", "X": "下界石英" } },
    { "id": "redstone_ore", "file": "data/skyblock/recipes/redstone_ore.json", "type": "crafting_shaped", "result": "红石矿石", "count": 1, "group": "矿石", "grid": [["", "X", ""], ["X", "S", "X"], ["", "X", ""]], "key": { "S": "石头", "X": "红石块" } },
    { "id": "deepslate_coal_ore", "file": "data/skyblock/recipes/deepslate_coal_ore.json", "type": "crafting_shaped", "result": "深层煤矿石", "count": 1, "group": "矿石", "grid": [["", "X", ""], ["X", "D", "X"], ["", "X", ""]], "key": { "D": "深板岩", "X": "煤炭" } },
    { "id": "deepslate_copper_ore", "file": "data/skyblock/recipes/deepslate_copper_ore.json", "type": "crafting_shaped", "result": "深层铜矿石", "count": 1, "group": "矿石", "grid": [["", "X", ""], ["X", "D", "X"], ["", "X", ""]], "key": { "D": "深板岩", "X": "铜块" } },
    { "id": "deepslate_diamond_ore", "file": "data/skyblock/recipes/deepslate_diamond_ore.json", "type": "crafting_shaped", "result": "深层钻石矿石", "count": 1, "group": "矿石", "grid": [["", "X", ""], ["X", "D", "X"], ["", "X", ""]], "key": { "D": "深板岩", "X": "钻石" } },
    { "id": "deepslate_emerald_ore", "file": "data/skyblock/recipes/deepslate_emerald_ore.json", "type": "crafting_shaped", "result": "深层绿宝石矿石", "count": 1, "group": "矿石", "grid": [["", "X", ""], ["X", "D", "X"], ["", "X", ""]], "key": { "D": "深板岩", "X": "绿宝石" } },
    { "id": "deepslate_gold_ore", "file": "data/skyblock/recipes/deepslate_gold_ore.json", "type": "crafting_shaped", "result": "深层金矿石", "count": 1, "group": "矿石", "grid": [["", "X", ""], ["X", "D", "X"], ["", "X", ""]], "key": { "D": "深板岩", "X": "金锭" } },
    { "id": "deepslate_iron_ore", "file": "data/skyblock/recipes/deepslate_iron_ore.json", "type": "crafting_shaped", "result": "深层铁矿石", "count": 1, "group": "矿石", "grid": [["", "X", ""], ["X", "D", "X"], ["", "X", ""]], "key": { "D": "深板岩", "X": "铁锭" } },
    { "id": "deepslate_lapis_ore", "file": "data/skyblock/recipes/deepslate_lapis_ore.json", "type": "crafting_shaped", "result": "深层青金石矿石", "count": 1, "group": "矿石", "grid": [["", "X", ""], ["X", "D", "X"], ["", "X", ""]], "key": { "D": "深板岩", "X": "青金石块" } },
    { "id": "deepslate_redstone_ore", "file": "data/skyblock/recipes/deepslate_redstone_ore.json", "type": "crafting_shaped", "result": "深层红石矿石", "count": 1, "group": "矿石", "grid": [["", "X", ""], ["X", "D", "X"], ["", "X", ""]], "key": { "D": "深板岩", "X": "红石块" } },
    { "id": "diamond_horse_armor", "file": "data/skyblock/recipes/diamond_horse_armor.json", "type": "crafting_shaped", "result": "钻石马铠", "count": 1, "group": "马铠", "grid": [["X", "", "X"], ["X", "X", "X"], ["X", "", "X"]], "key": { "X": "钻石" } },
    { "id": "golden_horse_armor", "file": "data/skyblock/recipes/golden_horse_armor.json", "type": "crafting_shaped", "result": "金马铠", "count": 1, "group": "马铠", "grid": [["X", "", "X"], ["X", "X", "X"], ["X", "", "X"]], "key": { "X": "金锭" } },
    { "id": "iron_horse_armor", "file": "data/skyblock/recipes/iron_horse_armor.json", "type": "crafting_shaped", "result": "铁马铠", "count": 1, "group": "马铠", "grid": [["X", "", "X"], ["X", "X", "X"], ["X", "", "X"]], "key": { "X": "铁锭" } },
    { "id": "netherite_upgrade_smithing_template", "file": "data/minecraft/recipes/netherite_upgrade_smithing_template.json", "type": "crafting_shaped", "result": "下界合金升级锻造模板", "count": 2, "group": "锻造模板", "grid": [["#", "S", "#"], ["#", "C", "#"], ["#", "#", "#"]], "key": { "#": "钻石", "C": "下界岩", "S": "下界合金升级锻造模板" } },
    { "id": "netherite_upgrade_smithing_template_from_netherite", "file": "data/skyblock/recipes/netherite_upgrade_smithing_template_from_netherite.json", "type": "crafting_shaped", "result": "下界合金升级锻造模板", "count": 1, "group": "锻造模板", "grid": [["#", "S", "#"], ["#", "C", "#"], ["#", "#", "#"]], "key": { "#": "钻石", "C": "下界岩", "S": "下界合金锭" } },
    { "id": "calcite_from_blasting_diorite", "file": "data/skyblock/recipes/calcite_from_blasting_diorite.json", "type": "blasting", "result": "方解石", "count": 1, "group": "其他", "ingredient": "闪长岩", "exp": 0.1, "time": 100 },
    { "id": "glow_berries", "file": "data/skyblock/recipes/glow_berries.json", "type": "crafting_shapeless", "result": "发光浆果", "count": 1, "group": "其他", "ingredients": ["甜浆果", "荧光墨囊"] },
    { "id": "tuff_from_blasting_andesite", "file": "data/skyblock/recipes/tuff_from_blasting_andesite.json", "type": "blasting", "result": "凝灰岩", "count": 1, "group": "其他", "ingredient": "安山岩", "exp": 0.1, "time": 100 }
  ],

};

/* ── 物品图标（配方 3×3 网格用；文件放在 assets/items/ 下） ── */
DATA.itemIcons = {
  "下界合金升级锻造模板": "netherite_upgrade_smithing_template.png",
  "下界合金锭": "netherite_ingot.png",
  "下界岩": "netherrack.png",
  "下界石英": "quartz.png",
  "下界石英矿石": "nether_quartz_ore.png",
  "下界金矿石": "nether_gold_ore.png",
  "凝灰岩": "tuff.png",
  "发光浆果": "glow_berries.png",
  "安山岩": "andesite.png",
  "方解石": "calcite.png",
  "深层煤矿石": "deepslate_coal_ore.png",
  "深层红石矿石": "deepslate_redstone_ore.png",
  "深层绿宝石矿石": "deepslate_emerald_ore.png",
  "深层金矿石": "deepslate_gold_ore.png",
  "深层钻石矿石": "deepslate_diamond_ore.png",
  "深层铁矿石": "deepslate_iron_ore.png",
  "深层铜矿石": "deepslate_copper_ore.png",
  "深层青金石矿石": "deepslate_lapis_ore.png",
  "深板岩": "deepslate.png",
  "煤炭": "coal.png",
  "煤矿石": "coal_ore.png",
  "甜浆果": "sweet_berries.png",
  "石头": "stone.png",
  "红石块": "redstone_block.png",
  "红石矿石": "redstone_ore.png",
  "绿宝石": "emerald.png",
  "绿宝石矿石": "emerald_ore.png",
  "荧光墨囊": "glow_ink_sac.png",
  "金矿石": "gold_ore.png",
  "金锭": "gold_ingot.png",
  "金马铠": "golden_horse_armor.png",
  "钻石": "diamond.png",
  "钻石矿石": "diamond_ore.png",
  "钻石马铠": "diamond_horse_armor.png",
  "铁矿石": "iron_ore.png",
  "铁锭": "iron_ingot.png",
  "铁马铠": "iron_horse_armor.png",
  "铜块": "copper_block.png",
  "铜矿石": "copper_ore.png",
  "闪长岩": "diorite.png",
  "高炉": "blast_furnace.png",
  "青金石块": "lapis_block.png",
  "青金石矿石": "lapis_ore.png",
};
