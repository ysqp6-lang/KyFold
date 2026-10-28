# KyFold 官网 · 产品事实核对

> 核对时间：2026-10-29
> 官网工作副本：`/Users/thy/Agent/KyFold-site`，HEAD `c1e7958`（2026-10-29 02:49，`app.js` 已拆分为 `js/`）
> 产品源码：
> - KyRemote：`/Users/thy/Agent/dsh-remote-ios`，HEAD `04bcd2f`
> - 课堂 AI 助手：`/Users/thy/Workbuddy/WorkBuddy/ipad-classroom-ai`，HEAD `eba0027`
> - Color Studio：`KyFold-site/color-studio/`
>
> 口径：只写能从代码、工程配置和仓库文档确认的事实；无法确认的写「待确认」。
> 按负责人口径，两款 App 均为内部开发测试，**本文不提供、也不建议官网提供任何下载按钮或测试入口**。

## 结论先行

1. **两款 App 不是概念稿。** 课堂助手已实现并在 iPad 上长测、自用；KyRemote 已产出可侧载的 iOS 构建（最近记录为 0.5.53 装机），但 iOS 真机验证范围在仓库内有两处矛盾记录，见第四部分。
2. **官网的主要问题不是「夸大」，而是「过时 + 缺条件」。** 已实现的拍照补图、录音、翻译、三层校对、术语表、历史与导出，仍被写成「正在完善的方向」或「以最终版本为准」；同时缺少系统版本、连接前提、后台/推送/分发限制。
3. **Color Studio 的 README 声明全部能在代码里找到实现**：透明 K SVG、完整 PNG、背景 PNG、ZIP 素材包、配色工程保存/导入均真实存在，未发现夸大。
4. **FAQ 核对时为 17 条，不是交接文档写的 11 条**（账户类 FAQ 正在并行扩充，条数可能继续变化）。位置在 `js/data.js:18-36`（拆分前 `app.js:118-133`）；与产品事实直接相关的 8 条已逐条核对，其余为账户/网页预览类，不涉及产品事实。
5. **总量：42 行事实条目中，0 条「夸大」、5 条「过时」、17 条「需补充」、20 条「准确」**（统计见第一部分末尾）。

## 版本与设备基线

| 产品 | 代码位置 | 版本/构建 | 设备与系统 | 分发状态 |
| --- | --- | --- | --- | --- |
| KyRemote | `dsh-remote-ios`（HEAD `04bcd2f`） | `app.json` / `package.json` 写 **0.5.93**；iOS 工程 `Info.plist` 写 **0.5.53**、构建号 97；Xcode `MARKETING_VERSION=1.0`；最近装机记录 0.5.53 | iPhone + iPad，iOS/iPadOS **16.4+** | 无 TestFlight、无公开安装包；免费 Personal Team 签名 **7 天** |
| 课堂 AI 助手 | `ipad-classroom-ai`（HEAD `eba0027`） | **1.1**（构建号 2） | iPad 优先；工程部署目标 **iPadOS 26.0**；工程同时声明 iPhone（未做主力验证） | 无 TestFlight、无公开安装包；免费 Personal Team 签名 **7 天** |
| Color Studio | `KyFold-site/color-studio/` | 界面标 **02.4**（README 写 V2.4；侧栏残留「0.4.1」字样） | 桌面/移动浏览器，无需登录 | 已可使用；无需分发 |

---

## 第一部分 · 事实清单

> 行号说明：官网在提交 `c1e7958` 中把原来的 `app.js` 拆到 `js/`。表内同时给出拆分前 `app.js` 行号（任务书所引），便于对照；当前文件以 `js/` 为准。
> 结论只用四个值：**准确 / 需补充 / 过时 / 夸大**。

| 官网现状表述 | 出处（app.js 行号） | 真实情况 | 结论 | 建议文案 |
| --- | --- | --- | --- | --- |
| **【首页产品卡】** | | | | |
| 「在 iPhone 和 iPad 上连接 Mac 中的 DSH，查看进度、继续对话」；卡片注「iPhone · iPad / 开发测试中」 | H1 · `js/pages/home.js:10`（拆分前 `app.js:74`） | 设备确为 iPhone+iPad（`TARGETED_DEVICE_FAMILY=1,2`），最低 iOS/iPadOS 16.4。连接链路是：Mac 运行 DSH 并启用 Remote Host 插件、提供 KyRemote 连接服务地址；App 登录账号 → 选在线设备 → 核对主机身份并信任 → 进工作区/会话。除查看与继续对话，还可发消息、切模型、只读看主机信息、离线待发。 | 需补充 | 「在 iPhone 与 iPad（iOS/iPadOS 16.4 及以上）连接 Mac 上的 DSH：按工作区查看会话、发送消息、切换模型。」 |
| 「课堂语音转写、提问识别与 AI 辅助回答」；卡片注「为 iPad 设计 / 开发测试中」 | H2 · `js/pages/home.js:11`（拆分前 `app.js:75`） | iPad 优先，工程部署目标 iPadOS 26.0；工程也声明 iPhone，但未做主力验证。除这三点，已实现英文课实时翻译、三层校对、术语表、拍照/手机传图重答、课堂历史与 Markdown/PDF 导出、录音暂存与回放、手动标记、三色可靠性光效。 | 需补充 | 「iPad 优先（iPadOS 26 及以上）：实时转写、提问识别与 AI 简答，支持英文课翻译、术语表与课后导出。」 |
| Color Studio「导出 SVG、PNG 与素材包」 | H3 · `js/pages/home.js:21`（拆分前 `app.js:85`） | 透明 K SVG、1024 PNG、独立背景 PNG、ZIP 素材包均在 `color-studio/engine.js` 实现；ZIP 还含 `palette.json` 与说明文件。 | 准确 | 保留；可在帮助中心解释四种导出的区别（现有 FAQ 已覆盖）。 |
| 页脚「设计预览 · 产品开发测试中 · 账户操作为演示」 | H4 · `js/components.js:11`（拆分前 `app.js:62`） | Color Studio 已可实际使用；两款 App 是已实现的内部测试（课堂助手已装机自用，KyRemote 已产出可侧载构建），不只是「设计预览」。 | 需补充 | 「Color Studio 可使用 · 两款 App 开发测试中 · 账户操作为演示」 |
| **【KyRemote 产品详情页】** | | | | |
| description：「离开桌面，思路不用停。在 iPhone 和 iPad 上，连接 Mac 中的 DSH，接着查看项目、发送消息，与 Agent 一起把工作继续下去。」 | K1 · `js/data.js:42`（拆分前 `app.js:162`） | 连接对象是 Mac 上的 DSH Host（需 Remote Host 插件），并要先登录 KyRemote 账号、信任设备；「查看项目」在 App 内对应「工作区」与「对话」。设备为 iPhone+iPad，iOS/iPadOS 16.4+。 | 需补充 | 「在 iPhone 与 iPad 上登录同一账号，连接 Mac 上的 DSH：按工作区打开会话、查看上下文、发送消息。」 |
| feature：「连接自己的 Mac / 选择设备并确认连接，在移动设备上继续桌面的工作。」 | K2 · `js/data.js:42`（拆分前 `app.js:162`） | 设备列表 → 核对主机身份 → 信任并连接；App 内原文明确「登录账号不代表已连接设备，首次连接需要核对主机身份」。 | 准确 | 「登录账号，选择自己的 Mac，核对主机身份后连接。」 |
| feature：「熟悉的工作空间 / 按工作区找到对话，让项目与上下文更容易接上。」 | K3 · `js/data.js:42`（拆分前 `app.js:162`） | 工作区可按收藏/最近/名称组织，会话按工作区分组；App 内用词是「工作区」与「对话」，不是「工作空间」。 | 准确 | 「按工作区浏览对话，让项目与上下文更容易接上。」 |
| feature：「继续与 Agent 对话 / 查看会话、发送消息，关注手边任务的进展。」 | K4 · `js/data.js:42`（拆分前 `app.js:162`） | 可查看会话、发送消息、切换模型与思考程度；可只读查看主机记忆/Git/插件；离线时文字进「离线待发区」，确认后联网自动发送（图片不暂存，需联网重发）。 | 需补充 | 「查看会话、发送消息、切换模型；离线时先存为待发，联网确认后发送。」 |
| platform：「iPhone · iPad · 连接你的 Mac」 | K5 · `js/pages/product.js:9` 渲染 `js/data.js:42`（拆分前 `app.js:162`） | iPhone+iPad，最低 iOS/iPadOS 16.4；Mac 需运行 DSH、启用 Remote Host 插件，并提供连接服务地址。 | 需补充 | 「iPhone · iPad（iOS/iPadOS 16.4+）· 连接运行 DSH 的 Mac」 |
| steps：「准备好 Mac / 找到工作区 / 继续这段对话」 | K6 · `js/data.js:38`（拆分前 `app.js:155`） | 缺「登录账号 + 选择设备 + 核对信任」；「准备好 Mac」还需 Remote Host 插件与连接服务地址。 | 需补充 | 三步改为：「准备 Mac（DSH + Remote Host 插件 + 连接服务）→ 登录并信任设备 → 打开工作区继续对话」 |
| specs：「移动端 / 面向 iPhone 与 iPad」 | K7 · `js/data.js:38`（拆分前 `app.js:155`） | 工程与已构建 App 均声明 iOS/iPadOS 16.4 起。 | 需补充 | 「iPhone 与 iPad（iOS/iPadOS 16.4 及以上）」 |
| specs：「工作来源 / 运行 DSH 的 Mac」 | K8 · `js/data.js:38`（拆分前 `app.js:155`） | 准确；Mac 端需保持运行与可连接，并启用 Remote Host 插件。 | 准确 | 「运行 DSH 的 Mac（保持运行并启用 Remote Host 插件）」 |
| specs：「使用场景 / 查看进度、浏览会话、继续对话」 | K9 · `js/data.js:38`（拆分前 `app.js:155`） | 还包括发送消息、切换模型、只读主机信息（记忆/Git/插件）、离线待发。 | 需补充 | 「查看会话与上下文、发送消息、切换模型；只读查看主机记忆/Git/插件状态。」 |
| specs：「当前阶段 / 开发与测试，暂未公开下载」 | K10 · `js/data.js:38`（拆分前 `app.js:155`） | 内部开发测试，已产出可侧载构建；无 TestFlight、无可分发安装包；免费 Personal Team 签名 7 天需重装。 | 准确 | 「内部开发测试，尚未公开发布；没有 TestFlight 或公开测试入口。」 |
| **【课堂 AI 助手产品详情页】** | | | | |
| description：「面向 iPad 的课堂辅助工具。围绕实时语音转写、提问识别与 AI 辅助回答展开，让听课时需要帮助的那一刻，有一个清楚的入口。」 | C1 · `js/data.js:43`（拆分前 `app.js:163`） | iPad 优先，iPadOS 26.0+；已实现远不止这三点：英文课实时翻译、三层校对、术语表、拍照/手机传图重答、课堂历史与 Markdown/PDF 导出、录音暂存与回放、手动标记、三色可靠性光效。 | 需补充 | 「面向 iPad 的课堂助手：实时转写、识别提问并给简答，支持英文课翻译、术语表与课后导出。」 |
| feature：「课堂语音转写 / 手动开启与停止听课，保留可查看的课堂文字内容。」 | C2 · `js/data.js:43`（拆分前 `app.js:163`） | 手动开始/停止；转写可选设备端/云端/双引擎；阅读版可三层 AI 校对；开始后前 20–30 秒为预热，可能暂无输出。 | 需补充 | 「手动开始/停止；默认设备端转写，也可选云端或双引擎；开始后前 20–30 秒为预热。」 |
| feature：「识别课堂提问 / 识别提问并辅助组织简答；回答仍需结合课程内容核对。」 | C3 · `js/data.js:43`（拆分前 `app.js:163`） | 本地规则检测提问；明确提问亮琥珀色横幅，模糊提问给提示条；AI 输出简答+一句原因+可靠性分级；默认手动作答，可自行开启自动作答。 | 准确 | 保留；可加「默认手动作答，可自行开启自动作答」。 |
| feature：「补充视觉信息 / 在题意依赖课件或图片时补充照片，是正在完善的方向。」 | C4 · `js/data.js:43`（拆分前 `app.js:163`） | **已实现**：iPad 拍照或手机扫码传图 → OCR → 带图重答；重答会使上下文版本 +1 并作废旧请求。「正在完善的方向」已过时。 | 过时 | 「题意依赖课件或图片时，拍一张或用手机传图，带图重答。」 |
| platform：「优先为 iPad 设计」 | C5 · `js/pages/product.js:9` 渲染 `js/data.js:43`（拆分前 `app.js:163`） | iPad 优先，iPadOS 26.0+；工程也支持 iPhone，但未做主力验证。 | 需补充 | 「iPad 优先（iPadOS 26 及以上）」 |
| steps：「手动开始听课 / 抓住那个问题 / 补全信息，再核对」 | C6 · `js/data.js:39`（拆分前 `app.js:156`） | 三步都成立，但缺语言设置与预热期说明；「补全信息」已实现而非方向。 | 需补充 | 「设置语言 → 开始听课（前 20–30 秒预热）→ 看提问与简答 → 需要时补图 → 课后导出」 |
| specs：「主要设备 / 优先为 iPad 设计」 | C7 · `js/data.js:39`（拆分前 `app.js:156`） | iPadOS 26.0+；iPhone 可安装但未验证。 | 需补充 | 「iPad 优先，iPadOS 26 及以上」 |
| specs：「课堂输入 / 语音转写与补充照片」 | C8 · `js/data.js:39`（拆分前 `app.js:156`） | 转写可选设备端/云端/双引擎；照片来自 iPad 拍照或手机局域网传图；术语表可注入热词。 | 需补充 | 「语音转写（设备端/云端/双引擎）与拍照/手机传图补题」 |
| specs：「辅助内容 / 提问提示、简答与原因」 | C9 · `js/data.js:39`（拆分前 `app.js:156`） | 还有英文翻译、三层校对、术语表、可靠性三色、手动标记、课堂历史与导出。 | 需补充 | 「提问提示、简答与一句原因；英文翻译、术语表与可靠性提示」 |
| specs：「当前阶段 / 开发与测试，能力验证中」 | C10 · `js/data.js:39`（拆分前 `app.js:156`） | 已装机自用，功能基本完整；无 TestFlight、无公开测试；免费签名 7 天。 | 准确 | 「内部开发测试，已装机自用；尚未公开发布，没有 TestFlight 或公开测试入口。」 |
| **【FAQ：产品相关 8 条】** | | | | |
| 「现在可以下载 App 吗？」→「两款产品目前都处于开发与测试阶段，尚未在这份官网预览中提供公开下载……」 | F1 · `js/data.js:23`（拆分前 `app.js:123`） | 前半句准确；可再明确「没有任何可分发的测试包，也没有 TestFlight」。当前官网没有下载入口，符合负责人口径。 | 需补充 | 「两款产品都在内部开发测试，尚无公开发布：没有 App Store 上架、没有 TestFlight，也没有可分发的安装包。」 |
| 「KyRemote 需要一台 Mac 吗？」→「当前设计面向运行 DSH 的 Mac……具体连接和授权方式会随产品完善。」 | F2 · `js/data.js:24`（拆分前 `app.js:124`） | 连接方式已实现：Mac 运行 DSH + Remote Host 插件并提供连接服务地址；App 登录账号 → 选择设备 → 核对信任。「会随产品完善」已过时。 | 过时 | 「需要一台运行 DSH 的 Mac，并启用 Remote Host 插件、保持可连接；在 iPhone/iPad 上登录账号、选择设备并确认信任后即可查看和继续会话。」 |
| 「课堂助手会一直录音吗？」→「当前的产品方向是由你手动开启和停止课堂监听……实际录音、后台运行和转写能力仍需以设备测试与最终版本为准。」 | F3 · `js/data.js:25`（拆分前 `app.js:125`） | 手动开始/停止和听课状态已实现；转写已实现（设备端/云端/双引擎，前 20–30 秒预热）；录音默认滚动暂存最近 30 分钟，结束可选保存/丢弃；后台音频模式已声明，但真机后台持续监听未作为已验证能力。 | 过时 | 「由你手动开始/停止，界面会显示正在听课；转写已可用（开始后前 20–30 秒可能暂无文字）。音频默认只在本机暂存最近 30 分钟，结束后可选择保存或丢弃；后台持续监听仍以真机表现为准。」 |
| 「AI 回答可以直接当作正确答案吗？」→「不建议……缺少课件或图片时，应补充题目信息；不可靠的回答需要清楚提醒。」 | F4 · `js/data.js:26`（拆分前 `app.js:126`） | 准确；实现里还有可靠性三色（青绿/琥珀/红）、缺画面时 `needs_visual`、可拍照/手机图重答；自动作答有频率/次数/预算上限，手动点「立即作答」不受这些闸门限制。 | 准确 | 保留，补一句「可靠性用青绿/琥珀/红标出；自动作答有频率与预算上限，手动点『立即作答』不受限」。 |
| 「KyFold 是什么？」→「KyFold 是 KyRemote、课堂 AI 助手等工具共同的软件品牌……」 | F5 · `js/data.js:21`（拆分前 `app.js:121`） | 准确；两款 App 独立、无代码依赖，统一账户仍是网页演示。 | 准确 | 保留。 |
| 「需要同时使用两款 App 吗？」→「不需要……它们不需要合并成一个 App。」 | F6 · `js/data.js:22`（拆分前 `app.js:122`） | 准确；代码无依赖，同装一台 iPad 也互不影响。 | 准确 | 保留。 |
| 「调色工作台需要登录吗？配色怎么保存？」→「无需登录……支持 SVG、PNG 和完整素材包导出。工作台右上角也提供离线 HTML。」 | F7 · `js/data.js:19`（拆分前 `app.js:119`） | 准确；离线 HTML 为 `color-studio/KyFold_Color_Studio_v2_4.html`；导出/保存/导入均在 `engine.js` 实现。 | 准确 | 保留。 |
| 「SVG、PNG 和素材包该怎么选？」→「透明 K · SVG 适合继续编辑矢量轮廓，但不包含颗粒和画笔背景。完整 PNG 保留图标的视觉效果；完整素材包还包含背景和细节层。」 | F8 · `js/data.js:20`（拆分前 `app.js:120`） | 准确；ZIP 含 `00_Background.png`、`00_Background.svg`、`01_K.svg`、`KyFold_Icon_1024.png`、`palette.json`、`README.txt`，开启「表面细颗粒」时再含 `02_Surface_Detail.png`。 | 准确 | 保留；可注明「细节层取决于『表面细颗粒』开关」。 |
| **【关于页产品状态】** | | | | |
| 「开发测试中 — KyRemote · 课堂 AI 助手：两款 App 独立开发。官网展示产品方向与界面示意，当前没有在这里提供公开下载。」 | A1 · `js/pages/about.js:7`（拆分前 `app.js:91`） | 两款 App 均已实现（课堂助手已装机自用；KyRemote 已产出可侧载构建）；「产品方向」与「界面示意」低估了实际状态；「没有公开下载」为真。 | 过时 | 「两款 App 独立开发，已实现并进入内部测试；官网展示界面示意，当前没有公开下载或测试入口。」 |
| 「现在可以使用 — Color Studio：本地调整颜色与高光，保存配色工程，并导出 SVG、PNG 或素材包。」 | A2 · `js/pages/about.js:7`（拆分前 `app.js:91`） | 准确；导出与工程保存/导入均在代码里。 | 准确 | 保留。 |
| **【README 产品与账户状态】** | | | | |
| 「官网中的 KyRemote、课堂 AI 助手仍处于产品设计与开发测试阶段。登录、统一账户、第三方绑定及设备操作均为本地演示……」 | R1 · `README.md:26` | 「产品设计」已过时：两款 App 均已实现（课堂助手已装机自用，KyRemote 已产出可侧载构建）。后半句「设备操作均为本地演示」容易被读成 App 的设备连接也是演示——实际 KyRemote 有真实的 Mac 连接、课堂助手有真实的录音/转写，网站里的账户/设备页才是演示。 | 过时 | 「KyRemote、课堂 AI 助手已实现并进入内部测试，尚未公开发布。官网中的登录、统一账户、第三方绑定与设备管理是网页演示，不连接真实账户；Color Studio 可实际使用。」 |
| 「支持按部位调整 RGB / HEX、最多三色渐变、渐变位置、背景画笔与模糊。原版高光可调节强度、颗粒保留量与颗粒强度，并保留重制高光选项。支持配色工程保存 / 导入、透明 K SVG、完整 PNG、背景 PNG 和 ZIP 素材包导出。」 | R2 · `README.md:20` | 逐项可验证：三色渐变（`count` 1–3）、RGB/HEX、色标位置、画笔大小/不透明度/模糊、原版高光强度/颗粒保留量/颗粒强度、原版/重制高光切换、保存/导入 JSON、四种导出。 | 准确 | 保留；「重制高光」可写成「竖笔高光可在原版/重制版之间切换」，更易理解。 |
| **【Color Studio 导出与工程：逐项核对】** | | | | |
| 「透明 K SVG」 | S1 · `README.md:20`；实现 `color-studio/engine.js:58-71` | `makeKSVG` 只输出 K 三片路径与矢量高光，不画背景；1024 尺寸；颗粒不入 SVG。 | 准确 | 保留。 |
| 「完整 PNG」 | S2 · `README.md:20`；实现 `engine.js:239-243` | `fullComposite` = 背景 + K + 颗粒；导出 `KyFold_Icon_1024.png`，1024×1024。 | 准确 | 保留。 |
| 「背景 PNG」 | S3 · `README.md:20`；实现 `engine.js:240,243` | `backgroundCanvasFull` = 背景 SVG + 画笔栅格；导出 `KyFold_Background.png`。 | 准确 | 保留。 |
| 「ZIP 素材包」 | S4 · `README.md:20`；实现 `engine.js:235,243` | 手写 ZIP；含背景 PNG/SVG、K SVG、完整 PNG、`palette.json`、`README.txt`；细节层按「表面细颗粒」开关包含。 | 准确 | 保留；可注明细节层可选。 |
| 「配色工程保存 / 导入」 | S5 · `README.md:20`；实现 `engine.js:244,248` | 保存下载 `KyFold_Palette.json`；导入读 JSON、校验 ≤ 6 MB、`sanitize` 后恢复颜色/背景/画笔；浏览器 `localStorage` 自动记忆。 | 准确 | 保留。 |
| 「最多三色渐变、背景画笔与模糊、原版高光/颗粒」 | S6 · `README.md:20,22`；实现 `engine.js:5,120,184-185,188` | `count` 1–3；画笔大小/不透明度/叠加模糊；原版高光强度、颗粒保留量、颗粒强度；原版/重制高光切换均存在。 | 准确 | 保留。 |

**统计（按上表 42 行）：**

- 准确：20 行
- 需补充：17 行
- 过时：5 行（C4、F2、F3、A1、R1）
- 夸大：0 行

> 行数按表中实际数据行计（不含 7 行分区标题、表头与分隔行）；H3 与 S1–S6 主题有重叠，但按表中实际行数计。

---

## 第二部分 · 可以新增的真实内容

> 以下只写已实现能力；没有代码证据的一律不写。仍不建议出现下载按钮、TestFlight 链接或「申请测试」入口。

### 2.1 KyRemote 首次使用步骤（按当前实现）

1. **准备 Mac。** 在 Mac 上运行 DSH，启用 Remote Host 插件，并让 KyRemote 连接服务保持可访问（局域网地址形如 `http://192.168.1.20:8795`；外网需可用的 HTTPS 地址）。
2. **登录 KyRemote。** 打开 App，填写连接服务地址，登录账号（邮箱密码；服务端启用 GitHub OAuth 时也可用 GitHub）。
3. **选择并信任设备。** 在设备列表选择在线的 Mac，核对主机身份后点「信任并继续」。登录账号不等于已连接设备。
4. **进入工作区。** 选择工作区，打开已有会话；可查看上下文、发送消息、切换模型与思考程度。
5. **按需使用辅助能力。** 「主机信息」可只读查看记忆分组、Git 状态（限白名单目录）、插件启用状态；离线时文字消息进入「离线待发区」，确认后联网自动发送。
6. **连接条件。** 同一局域网最稳，也可在同一 Tailscale 网络内连接；外网兜底依赖 HTTPS 连接服务，当前公网线路的密码登录可能被服务端策略限制（以实际部署为准）。

### 2.2 课堂 AI 助手首次使用步骤（按当前实现）

1. **设备与权限。** 用 iPad（iPadOS 26 及以上），首次使用允许麦克风；需要拍照时允许相机；用手机传图时允许本地网络。
2. **设置课堂语言。** 在设置里选「按课表 / 中文 / 英文 / 自动（双语）」；英文课会出现「实时翻译成中文」，默认开启。
3. **开始听课。** 点「开始听课」，界面显示正在听课；前 20–30 秒是预热期，可能暂时没有文字，之后逐步出转写。
4. **看提问与简答。** 明确提问会亮琥珀色横幅；模糊提问给提示条。默认手动作答，点「解答 / 立即作答」才调用 AI；也可在设置里开启自动作答。
5. **缺画面时补图。** 用 iPad 拍黑板/课件，或用手机扫码在同一局域网持续传图；判为「需要画面」时可用最新一帧带图重答。
6. **术语与校对。** 在术语表里加课程专有名词/热词，会注入三层校对、翻译与答题提示词；阅读版支持小层/中层/复盘三层校对。
7. **结束与复盘。** 点「结束听课」后选择保存或丢弃录音；课堂历史里可回看转写、答案、标记与花费，并导出 Markdown 或 PDF。

### 2.3 设备与版本条件

| 产品 | 设备 | 系统 | 运行前提 | 分发状态 |
| --- | --- | --- | --- | --- |
| KyRemote | iPhone + iPad | iOS/iPadOS 16.4 及以上 | Mac 运行 DSH + Remote Host 插件；可访问的 KyRemote 连接服务；账号；同一局域网/Tailscale 或可用 HTTPS 线路 | 内部测试；无 TestFlight；Personal Team 7 天签名 |
| 课堂 AI 助手 | iPad 优先（工程也声明 iPhone，未做主力验证） | iPadOS 26.0 及以上 | 麦克风权限；拍照需相机；手机传图需本地网络；AI 作答/翻译/校对需联网并配置 AI 服务 | 内部测试；无 TestFlight；Personal Team 7 天签名 |
| Color Studio | 桌面/移动浏览器 | 现代浏览器 | 无需登录；本地处理颜色与画笔 | 已可使用 |

### 2.4 已知限制（均以源码/文档为证）

**KyRemote**

- **后台会断。** iOS 没有 Android 的前台服务；App 退到后台一段时间后系统会挂起进程，连接断开，回到前台走重连与历史恢复。不要承诺「后台一直在线」。（`apps/android/README-ios.md:115-117`）
- **iOS 端没有系统推送。** iOS 端没有 APNs/远程推送实现；Android 的任务通知依赖前台服务，iOS 不启用。免费签名也不支持 Push capability；开通付费账号后仍需接入。 （`apps/android/README-ios.md:100,118`；`src/services/foreground-service.ts` 仅 Android 生效）
- **没有 TestFlight、没有可分发安装包。** 当前是 Xcode + 免费 Personal Team 直接装到自己的设备；描述文件 7 天过期，到期需重装（本地 Keychain 数据保留）。（`apps/android/README-ios.md:11,98`；`docs/kyremote/14-现状与修复记录-2026-10-26.md:90`）
- **外网连接有限制。** 同一局域网是主力；公网 HTTPS 线路当前对密码登录有服务端策略限制，可能只接受已有设备令牌。（`docs/kyremote/14-现状与修复记录-2026-10-26.md:102-104`）
- **离线待发只支持文字。** 带图片的消息在离线时不会进入待发区，需联网后重发。（`src/screens/chat-screen.tsx:845-860`）
- **Git 只读探针限白名单目录。** 不在允许范围内的目录只显示「该目录不在允许读取的范围内」。（`src/screens/host-insights.tsx:19,122`）
- **版本号对外口径未统一。** 源码包 0.5.93、iOS `Info.plist` 0.5.53、Xcode `MARKETING_VERSION=1.0`；官网暂不要写版本号。（`apps/android/app.json:6`；`ios/DSHRemote/Info.plist:31-32`；`project.pbxproj:380`）

**课堂 AI 助手**

- **开始后 20–30 秒预热。** 转写条数在预热期可能为 0，不是卡死。（`docs/M0三阶段执行清单.md:63`）
- **没有声纹识别 / 说话人分离。** iOS 公开 Speech API 不提供该能力；「旁人声音过滤」只是音量 + 识别置信度的弱启发式，默认关闭；不要写「只听老师」。（`Core/Sources/ClassroomCore/SpeakerGate.swift:5`；`ios/Sources/Classroom/TranscriptSettingsView.swift:98`）
- **云端转写会上传音频。** 默认「设备端」音频不出设备；切到「云端 / 双引擎」会把实时音频送到云端识别服务（按小时计费），与 README 旧口径「语音在设备端转写」不完全一致，公开隐私文案需负责人确认。（`ios/Sources/Classroom/ASRSettings.swift:20-35`）
- **AI 作答/翻译/校对需要联网并配置 AI 服务。** 未配置时只能转写与本地问题检测，点作答会提示「AI 未配置」。（`ios/Sources/Classroom/AIClient.swift:33-43,118-132`；`ios/Sources/Classroom/ClassroomSession.swift:1157`）
- **自动作答有闸门。** 默认手动作答；自动路径受最小间隔、每分钟次数、每节次数与预算限制（默认省钱档：20 秒/3 次/24 次/¥0.4；常规档 12 秒/4 次/40 次/¥0.8；宽松档 6 秒/8 次/80 次/¥2.0）；手动点「立即作答」不受这些限制。（`Core/Sources/ClassroomCore/CostGuard.swift:13-40`；`ios/Sources/Classroom/ClassroomSession.swift:512,1129-1152`）
- **录音默认暂存、滚动丢弃。** 暂存只保留最近 30 分钟；未保存的暂存 24 小时后自动清理；正式录音默认保留 30 天（可改/可永久）。关闭「听课时暂存录音」后完全不落盘。（`Core/Sources/ClassroomCore/RecordingPolicy.swift:21-27`；`ios/Sources/Classroom/RecordingStore.swift:8-13`）
- **无 TestFlight、7 天签名。** 当前为免费 Personal Team；描述文件到期后 App 打不开，重新构建安装即可。仓库记录本轮描述文件到期时间为 **2026-10-29 00:13（北京时间）**，核对时可能已过期，需重新构建。（`docs/开通Apple开发者会员-准备清单.md:15,18-19`；`PROJECT_SNAPSHOT_ipad-classroom-ai.md:22`）
- **iPadOS 26 起。** 工程部署目标 iOS 26.0；更低系统不在支持范围。（`ios/project.yml:3-5`）

**共同**

- 两款 App 都**没有公开下载、没有 TestFlight、没有公开测试入口**；官网保持「开发测试中」是准确口径，不应加下载按钮。

### 2.5 建议新增的 FAQ（6 条，答案只写真实情况）

**Q1：KyRemote 连接前要准备什么？**
A：一台运行 DSH 的 Mac（启用 Remote Host 插件、保持可连接）、可访问的 KyRemote 连接服务地址，以及 iPhone/iPad（iOS/iPadOS 16.4 及以上）。打开 App 后填服务地址、登录账号、选择设备并核对信任，就能进入工作区。

**Q2：KyRemote 能在后台一直保持连接吗？**
A：不能保证。iOS 会在 App 退到后台一段时间后挂起进程，连接随之断开；回到前台会自动重连并恢复历史。目前也没有 iOS 系统推送。

**Q3：KyRemote 现在有 TestFlight 或安装包吗？**
A：没有。KyRemote 处于内部开发测试，使用免费个人签名直接装到自己的设备；没有 TestFlight、没有可分发安装包，官网也不提供下载或测试申请。免费签名 7 天到期，需要重新构建安装。

**Q4：课堂助手为什么开始听课后的前几十秒没有文字？**
A：这是语音转写的预热期，通常 20–30 秒；预热结束后会逐步出字。预热期内没有输出不代表没有在听课。

**Q5：课堂助手能只识别老师的声音吗？**
A：不能。iOS 的公开 Speech API 没有声纹识别或说话人分离；设置里的「旁人声音过滤」只是按音量与识别置信度做的弱启发式，默认关闭。为避免漏掉老师提问，建议保持默认「不过滤」。

**Q6：课堂记录和录音保存在哪里？**
A：都在本机。录音默认只暂存最近 30 分钟，结束听课时可选择保存或丢弃；未保存的暂存 24 小时后自动清理，正式录音默认保留 30 天。课堂历史保存在本机，可导出 Markdown 或 PDF；云端转写模式下音频会送到所配置的云端识别服务。

### 2.6 可补充到产品页的真实能力（可选）

| KyRemote（已实现） | 课堂 AI 助手（已实现） |
| --- | --- |
| 登录账号 → 选择设备 → 核对信任 | 语言四模式：按课表/中文/英文/自动双语 |
| 按工作区浏览会话、打开会话、发送消息 | 实时转写：设备端/云端/双引擎 |
| 切换模型与思考程度 | 英文课实时翻译 + 小/中/复盘三层校对 |
| 主机信息只读：记忆 / Git / 插件 | 问题检测与两种提醒；AI 简答 + 一句原因 |
| 离线待发（文字），确认后联网发送 | 可靠性三色光效；缺画面时拍照/手机图重答 |
| 已下载的会话可离线只读浏览 | 课程术语表热词注入；手动标记问题 |
|  | 课堂历史、录音暂存/回放、Markdown/PDF 导出 |

---

## 第三部分 · 证据

> 以下行号以 2026-10-29 核对时的工作副本为准。官网在 `c1e7958` 拆分后，`app.js` 的原行号已迁移到 `js/`；表内已给出对应关系。

### 3.1 官网现状

| 结论 | 文件与行号 |
| --- | --- |
| 首页 KyRemote 卡片 | `KyFold-site/js/pages/home.js:10`（拆分前 `app.js:74`） |
| 首页课堂助手卡片 | `KyFold-site/js/pages/home.js:11`（拆分前 `app.js:75`） |
| 首页 Color Studio 区块 | `KyFold-site/js/pages/home.js:21`（拆分前 `app.js:85`） |
| 页脚状态行 | `KyFold-site/js/components.js:11`（拆分前 `app.js:62`） |
| FAQ（核对时 17 条） | `KyFold-site/js/data.js:18-36`（拆分前 `app.js:118-133`） |
| KyRemote 产品数据 | `KyFold-site/js/data.js:42`（拆分前 `app.js:162`） |
| 课堂助手产品数据 | `KyFold-site/js/data.js:43`（拆分前 `app.js:163`） |
| 产品使用流程 | `KyFold-site/js/data.js:38-39`（拆分前 `app.js:155-156`） |
| 产品详情页模板 | `KyFold-site/js/pages/product.js:9`（拆分前 `app.js:168`） |
| 关于页状态 | `KyFold-site/js/pages/about.js:7`（拆分前 `app.js:91`） |
| README 产品与账户状态 | `KyFold-site/README.md:26` |
| README Color Studio 声明 | `KyFold-site/README.md:20,22` |

> `js/data.js` 正在被并行编辑（核对后已加入账户设计卡片与账户 FAQ），FAQ 条数与行号可能继续移动。上表与第一部分对 `js/data.js` 的引用，以字段名（`id:'mac'`、`products.kyremote.description`、`productStories.kyremote.steps` 等）为准；行号仅表示核对时的位置。

核对时的仓库状态：

```text
$ git -C /Users/thy/Agent/KyFold-site rev-parse --short HEAD
c1e7958
```

### 3.2 KyRemote（`/Users/thy/Agent/dsh-remote-ios`）

| 结论 | 文件与行号 / 命令输出 |
| --- | --- |
| 源码包版本 0.5.93 | `apps/android/app.json:6`、`apps/android/package.json:3` |
| Bundle ID `me.kysoul.dshremote` | `apps/android/app.json:12` |
| iOS/iPadOS 16.4 起 | `apps/android/app.json:86`；`apps/android/ios/DSHRemote.xcodeproj/project.pbxproj:374`；构建产物 `Info.plist` 的 `MinimumOSVersion` 为 16.4 |
| iPhone + iPad | `project.pbxproj:392`（`TARGETED_DEVICE_FAMILY = "1,2"`）；`app.json:11`（`supportsTablet`） |
| 已装版本 0.5.53 / 7 天签名 | `docs/kyremote/14-现状与修复记录-2026-10-26.md:90-91` |
| 可侧载构建（Xcode + Personal Team 真机安装） | `apps/android/README-ios.md:80-111` |
| 免费 Personal Team、7 天、不支持 Push | `apps/android/README-ios.md:11,98,100` |
| iOS 后台断连、无通知 | `apps/android/README-ios.md:115-118` |
| 同一局域网 / Tailscale | `apps/android/README-ios.md:105` |
| 首次连接：Host 插件 → Server 地址 → 登录 → 信任设备 | `apps/android/README-ios.md:107-111` |
| Host 插件角色 | `docs/kyremote/02-架构与数据流.md:27,37` |
| 主机信息只读：记忆/Git/插件 | `apps/android/src/screens/host-insights.tsx:12-20`；Git 白名单提示在同文件 `:122` |
| 离线待发（文字；图片不暂存） | `apps/android/src/screens/chat-screen.tsx:223,845-860,1041-1047,1487-1495` |
| 模型/思考程度切换 | `apps/android/src/screens/chat-screen.tsx:994-1005,1646` |
| 设备信任流程 | `apps/android/src/screens/device-screens.tsx:886-924` |
| 已下载会话可离线只读 | `apps/android/src/locales/zh-CN.ts:258-260`；`src/screens/workspaces-screen.tsx` 的 `downloadAllSessions` |
| 网络线路现状 | `docs/kyremote/14-现状与修复记录-2026-10-26.md:102-104` |
| 付费后才可能有 TestFlight / Push | `docs/kyremote/15-开发者会员开通-准备清单.md:12-16` |

构建产物的版本信息（命令输出摘要）：

```text
$ plutil -p .../apps/android/ios/build/Build/Products/Release-iphonesimulator/DSHRemote.app/Info.plist | grep -E 'CFBundleShortVersionString|MinimumOSVersion'
  "CFBundleShortVersionString" => "0.5.53"
  "MinimumOSVersion" => "16.4"
```

> 注意：仓库根 `README.zh.md:86` 的「iOS | TestFlight 内测」描述的是上游 `ds-harness-remote` 项目，不是本机 KyRemote 构建；官网不要引用这一行作为 KyRemote 的分发依据。

### 3.3 课堂 AI 助手（`/Users/thy/Workbuddy/WorkBuddy/ipad-classroom-ai`）

| 结论 | 文件与行号 / 命令输出 |
| --- | --- |
| iPadOS 26.0 起 | `ios/project.yml:3-5` |
| 版本 1.1、构建号 2 | `ios/project.yml:29-30` |
| 已装机自用 / 长测 | `PROJECT_SNAPSHOT_ipad-classroom-ai.md:22`；`docs/长测记录-20261026.md` |
| iPhone + iPad 设备族 | `ios/project.yml:54`（`TARGETED_DEVICE_FAMILY: "1,2"`） |
| 后台音频模式已声明 | `ios/project.yml:24-25`（`UIBackgroundModes: audio`） |
| 前 20–30 秒预热 | `docs/M0三阶段执行清单.md:63` |
| 语言四模式 | `Core/Sources/ClassroomCore/CourseLanguagePolicy.swift:37-52` |
| 英文课翻译 | `ios/Sources/Classroom/TranscriptPolisher.swift:7-16,363+`；`ClassroomSession.swift:312,525`（默认开） |
| 三层校对 | `ios/Sources/Classroom/TranscriptPolisher.swift:7-16`；`TranscriptSettingsView.swift:130` |
| 问题检测 + 简答 + 一句原因 | `Core/Sources/ClassroomCore/LocalQuestionDetector.swift:139`；`ios/Sources/Classroom/AIClient.swift:182-195,246` |
| 自动作答闸门（频率/次数/预算） | `Core/Sources/ClassroomCore/CostGuard.swift:13-40`；`ios/Sources/Classroom/ClassroomSession.swift:512,1129-1152` |
| 拍照/手机图重答 | `ios/Sources/Classroom/AIClient.swift:559-564`；`ClassroomSession.swift:1335,1642` |
| 术语表注入 | `ios/Sources/Classroom/TermGlossaryView.swift:128` |
| 课堂历史 + Markdown/PDF | `ios/Sources/Classroom/SessionHistoryView.swift:4,24,279,284`；`SessionArchivePDF.swift:5-9` |
| 录音暂存/保存/清理/回放 | `Core/Sources/ClassroomCore/RecordingPolicy.swift:21-27`；`ios/Sources/Classroom/RecordingStore.swift:8-13`；`RecordingPlaybackView.swift:6-10` |
| 手动标记问题 | `ios/Sources/Classroom/ClassroomSession.swift:2238-2292`；`TranscriptView.swift:136` |
| 可靠性三色：青绿/琥珀/红 | `ios/Sources/Classroom/ClassroomComponents.swift:53-70`（高可靠为 `SmartPalette.accent` = RGB 0.13/0.78/0.82，青绿） |
| 没有声纹/说话人分离 | `Core/Sources/ClassroomCore/SpeakerGate.swift:5`；`ios/Sources/Classroom/TranscriptSettingsView.swift:98` |
| 云端 ASR 会上传音频 | `ios/Sources/Classroom/ASRSettings.swift:20-35` |
| AI 未配置时不能作答 | `ios/Sources/Classroom/AIClient.swift:33-43,118-132`；`ios/Sources/Classroom/ClassroomSession.swift:1157` |
| 无 TestFlight、未上架 | `PROJECT_SNAPSHOT_ipad-classroom-ai.md:22`；`PROJECT_SNAPSHOT_ClassroomProbe.md:108` |
| 免费签名 7 天 | `docs/开通Apple开发者会员-准备清单.md:18-19` |

核对时的仓库状态：

```text
$ git -C /Users/thy/Workbuddy/WorkBuddy/ipad-classroom-ai rev-parse --short HEAD
eba0027
```

### 3.4 Color Studio（`/Users/thy/Agent/KyFold-site/color-studio`）

| 结论 | 文件与行号 |
| --- | --- |
| 透明 K SVG（无背景、1024、矢量） | `engine.js:58-71` |
| 完整 PNG（背景 + K + 颗粒，1024） | `engine.js:239-243` |
| 背景 PNG（背景 + 画笔） | `engine.js:240,243` |
| ZIP 素材包（含 palette.json / README） | `engine.js:235,243` |
| 保存配色工程 | `engine.js:244`（`KyFold_Palette.json`） |
| 导入配色工程（≤ 6 MB） | `engine.js:248` |
| 三色渐变 | `engine.js:5,184`（`count` 1–3；默认 3） |
| 背景画笔与模糊 | `engine.js:5,188`（size/opacity/blur） |
| 原版高光/颗粒/重制高光 | `engine.js:5,120,185` |
| 浏览器自动记忆 | `engine.js:9,176`（`localStorage`） |
| 界面导出按钮 | `index.html:4-14` |

### 3.5 核对命令摘要

```text
$ git -C /Users/thy/Agent/dsh-remote-ios rev-parse --short HEAD
04bcd2f

$ grep -n '"version"\|bundleIdentifier\|deploymentTarget' \
    /Users/thy/Agent/dsh-remote-ios/apps/android/app.json
6:    "version": "0.5.93",
12:      "bundleIdentifier": "me.kysoul.dshremote",
86:            "deploymentTarget": "16.4"

$ grep -n 'deploymentTarget\|iOS: "26.0"\|CFBundleShortVersionString\|TARGETED_DEVICE_FAMILY' \
    /Users/thy/Workbuddy/WorkBuddy/ipad-classroom-ai/ios/project.yml
5:    iOS: "26.0"
29:        CFBundleShortVersionString: "1.1"
54:        TARGETED_DEVICE_FAMILY: "1,2"
```

---

## 第四部分 · 仍需负责人确认

以下内容无法从代码确认，官网在负责人拍板前应继续写「待确认」或保持现状，不要补数字、日期、价格或承诺。

1. **发布日期 / 路线图。** 仓库里没有任何公开发布日期或版本计划。
2. **价格与收费。** 没有定价代码或页面；课堂助手的 AI/云 ASR 成本目前是内部测试成本，未来是否收费、由谁承担，待定。
3. **是否公开测试 / 是否上架。** 当前两款 App 都没有 TestFlight、没有 App Store 配置；是否申请付费开发者账号、何时开 TestFlight 或上架，需要负责人决定。**在决定前，官网不要出现下载、TestFlight、申请测试等入口。**
4. **KyRemote 真机验证范围。** `apps/android/README-ios.md:126` 写「本轮只有模拟器验证」，而 `docs/kyremote/14-...:91` 记录 iPad 已装 0.5.53；两处不一致。对外写「已装机测试」前请确认实际验证到哪一步。
5. **KyRemote 对外版本号。** 源码 0.5.93 / `Info.plist` 0.5.53 / Xcode `MARKETING_VERSION=1.0` 三处不一致；建议先统一，再决定官网是否显示版本。
6. **课堂助手隐私口径。** 旧 README 写「语音在设备端转写，不上传原始音频」，但云端/双引擎模式会把音频送到云端 ASR。公开文案必须明确「默认设备端；云端模式会上传音频」，否则会与实现冲突。
7. **两款产品的正式对外名称。** KyRemote 的工程显示名是 `KyRemote`（README-ios 里的「DSH Remote Dev」是旧临时名）；课堂助手的 App 显示名是 `ClassroomProbe`，官网叫「课堂 AI 助手」。对外统一用哪个名字，待定。
8. **KyRemote 是否只讲 DSH。** 代码与文档还支持 CodeX 等后端；官网当前只讲 DSH。若保持「DSH 优先」的定位，建议在文案里明确，不要让人以为只能连 DSH 或一定能连所有后端。
9. **公网连接方式是否对外说明。** 当前局域网是主力，公网 HTTPS 线路对密码登录有限制；是否在官网解释「同一局域网/Tailscale/HTTPS 线路」的差异，待定。
10. **Color Studio 版本号写法。** README 写 V2.4，界面标 02.4，侧栏残留「0.4.1」；建议统一后再对外引用。

---

## 附：不建议写进官网的内容（避免编造）

- 「支持所有 iPad / 所有 iOS 版本」——实际是 iPadOS 26+（课堂助手）、iOS/iPadOS 16.4+（KyRemote）。
- 「只听老师」「声纹识别」——没有实现，只有默认关闭的音量+置信度弱过滤。
- 「KyRemote 后台一直在线 / 任务完成推送」——iOS 会挂起后台连接，没有 APNs。
- 「有 TestFlight / 可申请测试 / 扫码下载」——两款 App 都没有。
- 「AI 答案可直接使用」——实现明确要求核对，并按可靠性分三色。
- 「录音一直保存」——默认只暂存最近 30 分钟，未保存 24 小时清理，正式录音默认 30 天。
- 「云端识别也不上传音频」——云端/双引擎模式会上传音频。
- 任何具体价格、发布日期、合作方、下载地址、版本号——代码里没有，负责人也未确认。
