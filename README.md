# KyFold

KyFold 官网与 Color Studio 调色工作台。静态 HTML / CSS / JavaScript 项目，无需安装依赖或构建。
账户中心对接本机的 [KyFold Account](../../KyFold/account) 统一账户服务（邮箱验证码登录真实可用）。

## 本地启动（推荐，一条命令）

```bash
node tools/dev-up.mjs            # → http://127.0.0.1:8788
```

它会同时启动两件事：

- 账户服务（默认 `http://127.0.0.1:8797`，只监听本机回环）：capture 邮件通道 + 验证码回显，数据库在 `/tmp/kyfold-dev.db`；
- 官网静态服务器（默认 `http://127.0.0.1:8788`）：把 `/api/*` 反代到账户服务，浏览器看到的才是同源，cookie 与 CSRF 才能正常工作。

打开 `http://127.0.0.1:8788/#/login`，填邮箱 → 点「获取验证码」→ 验证码会直接显示在页面上（开发通道，不发真实邮件）。
换端口用 `--site-port 8789 --account-port 8897`；账户服务不在相邻目录时用 `--account-dir /path/to/KyFold/account`。
生成的开发密钥写在本机 `.dev-secret`（已 gitignore，不进仓库）；轮换它会让现有会话失效。

## 只浏览官网（不含账户）

```bash
node tools/serve.mjs             # http://127.0.0.1:8788，API 不可用时账户页会显示「未连接账户服务」
python3 -m http.server 8788      # 也可以，纯静态
open index.html                  # 直接双击：页面能看，账户功能会提示未连接
```

## 文件结构

- `index.html`：页面骨架，按顺序加载 `js/` 下的脚本与样式。
- `app.js`：入口，绑定全局事件后渲染首帧。
- `js/core.js`：站点状态（主题等本地状态）、持久化、toast、路由解析。
- `js/account-api.js`：账户服务客户端 —— CSRF、错误码、登录、绑定、会话、导出、注销。
- `js/icons.js`：内联 SVG 图标。
- `js/data.js`：页面数据 —— FAQ、产品信息、产品流程、账户说明卡片、面板定义。
- `js/components.js`：品牌、页头、页脚、手机端窗口示意、FAQ / 流程列表、弹窗。
- `js/pages/`：`home`、`about`、`login`、`account`、`product`、`help`、`legal` 页面模板。
- `js/router.js`：路由表与整页渲染；需要真实数据的页面在骨架渲染后异步挂载。
- `styles.css`、`clarity.css`、`content.css`、`hero-art.css`、`studio-entry.css`、`ecosystem.css`：官网样式。
- `assets/`：原版图标和账户链接标记。
- `color-studio/`：完整的 Color Studio 工作台（在线版 + 独立离线 HTML）。
- `tools/`：`dev-up.mjs`（一键启动）、`serve.mjs`（静态 + 反代）、`ui-check.mjs`（UI 回归）、`e2e-account.mjs`（账户 API 端到端）。
- `docs/`：账户设计、产品事实核对、账户服务基线测试、Codex 审查交接。
- `CODEX_REVIEW_HANDOFF.md`：本次改动的完整交接与风险清单。

拆分后的脚本都是普通 `<script>`（不是 ES module），按 `index.html` 里的顺序加载并共享同一个全局词法作用域，所以仍然可以双击 `index.html` 直接打开；账户功能需要 HTTP 同源，因此没启动服务器时页面会明确提示「未连接账户服务」，不会假装登录成功。

## 账户与登录

- **邮箱验证码**：真实可用。六位验证码，5 分钟有效、一次性；首次登录自动创建账户。
- **第三方登录**（GitHub / Google / Apple）：账户服务里有完整实现，但**没有配置 OAuth 凭证**，接口返回 `unconfigured`，官网按钮显示「未配置」且不可点击。配置凭证与回调后无需改前端。
- **敏感操作**（绑定、解绑、导出、注销）：页面会再验证一次邮箱（账户服务返回 `403 REAUTH_REQUIRED` 时弹窗补验证码）。
- **最后一种登录方式**：邮箱验证码是主方式，不可解绑；服务端另有 `409 LAST_LOGIN_METHOD` 兜底。
- **服务不可用**：登录页显示「连接不上账户服务」并禁用表单；账户中心显示错误卡片与「重试」。
- 第三方身份已绑定其他账户时，服务端拒绝且不自动合并；页面只提示「已绑定到其他账户」。

## Color Studio

支持按部位调整 RGB / HEX、最多三色渐变、渐变位置、背景画笔与模糊。原版高光可调节强度、颗粒保留量与颗粒强度，竖笔高光可在原版与重制版之间切换。支持配色工程保存 / 导入、透明 K SVG、完整 PNG、背景 PNG 和 ZIP 素材包导出（素材包是否含细节层取决于「表面细颗粒」开关）。

无需登录。所有颜色和画笔操作在浏览器内完成；自动记忆按浏览器与网站地址隔离，重要配色请另存工程。SVG 保留矢量高光，颗粒效果保存在 PNG 和素材包细节层中。

## 产品与账户状态

KyRemote 与课堂 AI 助手已经实现并进入内部测试，尚未公开发布：没有 App Store 上架、没有 TestFlight，也没有可分发的安装包，官网不提供下载或申请测试入口。Color Studio 可实际使用。

产品能力、设备条件与已知限制以 [docs/product-facts.md](docs/product-facts.md) 为准；统一账户的字段、状态机、冲突处理与测试清单见 [docs/account-design.md](docs/account-design.md)。

## 当前版本

官网 V1.7 / Color Studio V2.4 / KyFold Account V0.1（本机）。保留确认过的首屏构图、K 图标与账户链接标记。

## 本地检查

```bash
# 语法（全部脚本）
for f in app.js js/*.js js/pages/*.js color-studio/*.js tools/*.mjs; do node --check "$f" || exit 1; done

# 静态页面：11 个路由 + 深色/帮助搜索/情景键盘/手机菜单/a11y/Color Studio（不需要服务）
node tools/ui-check.mjs snapshot --out /tmp/kyfold.json

# 真实账户：22 项端到端（需要先跑 tools/dev-up.mjs）
node tools/ui-check.mjs account  --url http://127.0.0.1:8788

# 账户服务不可用时的降级状态（指向一个没有服务的端口）
node tools/serve.mjs --port 8789 --api http://127.0.0.1:9 &
node tools/ui-check.mjs degraded --url http://127.0.0.1:8789

# 账户 API 端到端（自己拉起服务、随机端口、临时库，9 项）
node tools/e2e-account.mjs

# 截图
node tools/ui-check.mjs shot --url http://127.0.0.1:8788 --route account-about --width 390 --out /tmp/m.png
```

`ui-check` 会抓路由 HTML、控制台错误，以及深色模式、帮助搜索、情景键盘切换、手机端菜单、图片替代文本 / 重复 id / 绝对路径、Color Studio 画布与导出按钮等检查项；账户流程还会验证退出后重定向、错误验证码、再验证弹窗、手机端不横向溢出。

## 开发交接

请先阅读 [CODEX_REVIEW_HANDOFF.md](CODEX_REVIEW_HANDOFF.md)（本轮改动、真实/未配置边界、测试结果、风险清单），历史背景见 [HANDOFF_DSH.md](HANDOFF_DSH.md)。
