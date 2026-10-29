# KyFold

KyFold 官网与 Color Studio 调色工作台。静态 HTML / CSS / JavaScript 项目，无需安装依赖或构建。

## 查看网站

直接打开 `index.html`，或将整个仓库目录部署到静态服务器。顶部导航、首页介绍区和页脚都提供调色工作台入口。

## 文件结构

- `index.html`：页面骨架，按顺序加载 `js/` 下的脚本与样式。
- `app.js`：入口，绑定全局事件后渲染首帧。
- `js/core.js`：站点状态（`localStorage` 演示数据）、持久化、toast、路由解析。
- `js/icons.js`：内联 SVG 图标。
- `js/data.js`：页面数据 —— FAQ、产品信息、产品流程、账户设计卡片、面板定义。
- `js/components.js`：品牌、页头、页脚、手机端窗口示意、FAQ / 流程列表、弹窗。
- `js/pages/`：`home`、`about`、`account`、`product`、`help`、`legal` 六个页面模板。
- `js/router.js`：路由表与整页渲染。
- `styles.css`、`clarity.css`、`content.css`、`hero-art.css`、`studio-entry.css`、`ecosystem.css`：官网样式。
- `assets/`：原版图标和账户链接标记。
- `color-studio/index.html`：完整在线工作台。
- `color-studio/engine.js`、`style.css`、`source-data.js`：可直接编辑的工作台源文件。
- `color-studio/KyFold_Color_Studio_v2_4.html`：独立离线版。
- `tools/ui-check.mjs`：无依赖的 UI 回归脚本（见下）。
- `docs/`：账户设计与产品事实核对文档。

拆分后的脚本都是普通 `<script>`（不是 ES module），按 `index.html` 里的顺序加载并共享同一个全局词法作用域，所以仍然可以双击 `index.html` 直接打开，不需要服务器或构建。

## Color Studio

支持按部位调整 RGB / HEX、最多三色渐变、渐变位置、背景画笔与模糊。原版高光可调节强度、颗粒保留量与颗粒强度，竖笔高光可在原版与重制版之间切换。支持配色工程保存 / 导入、透明 K SVG、完整 PNG、背景 PNG 和 ZIP 素材包导出（素材包是否含细节层取决于「表面细颗粒」开关）。

无需登录。所有颜色和画笔操作在浏览器内完成；自动记忆按浏览器与网站地址隔离，重要配色请另存工程。SVG 保留矢量高光，颗粒效果保存在 PNG 和素材包细节层中。

## 产品与账户状态

KyRemote 与课堂 AI 助手已经实现并进入内部测试，尚未公开发布：没有 App Store 上架、没有 TestFlight，也没有可分发的安装包，官网不提供下载或申请测试入口。官网中的登录、统一账户、第三方绑定与设备管理是网页演示，不连接真实账户；Color Studio 可实际使用。

产品能力、设备条件与已知限制以 [docs/product-facts.md](docs/product-facts.md) 的核对结果为准；统一账户的字段、状态机、冲突处理与测试清单见 [docs/account-design.md](docs/account-design.md)。

## 当前版本

官网 V1.6 / Color Studio V2.4。保留确认过的首屏构图、K 图标与账户链接标记。

## 本地检查

```bash
# 语法（全部脚本）
for f in app.js js/*.js js/pages/*.js color-studio/*.js; do node --check "$f" || exit 1; done

# UI 回归（需要本机 Chrome；直接开 file://，不依赖服务器）
node tools/ui-check.mjs snapshot --out /tmp/kyfold-before.json   # 改动前
node tools/ui-check.mjs compare  --before /tmp/kyfold-before.json # 改动后逐路由比对
node tools/ui-check.mjs shot --route account-about --width 390 --out /tmp/m.png
```

`ui-check` 会抓 11 个路由的 HTML、控制台错误，以及深色模式、帮助搜索、情景键盘切换、演示登录、最后一种登录方式保护、手机端菜单、图片替代文本 / 重复 id / 绝对路径、Color Studio 画布与导出按钮等检查项。

## 开发交接

请先阅读 [HANDOFF_DSH.md](HANDOFF_DSH.md)，其中列出保留的设计、当前状态、后续任务与验证要求。
