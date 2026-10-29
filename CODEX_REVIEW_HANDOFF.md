# KyFold 官网 · Codex 审查交接

> 交接时间：2026-10-29 13:2x（Asia/Shanghai）
> 官网仓库：`/Users/thy/Agent/KyFold-site`（GitHub `ysqp6-lang/KyFold`）
> 账户服务仓库：`/Users/thy/Agent/KyFold/account`（KyFold Account V0.1）

---

## 1. 仓库、分支、提交状态

### 1.1 官网（本次主要改动）

| 项 | 值 |
|---|---|
| 分支 | `main` |
| 本轮基线 | `6aa1afb`（Clarify highlight switch and ZIP detail layer in README） |
| 本轮提交 | `b38fa0e`（Wire the site to the real KyFold account service） |
| 未提交改动 | 无（本文档 `CODEX_REVIEW_HANDOFF.md` 是提交后的新增文件，单独提交） |
| 远端 | `origin/main`，本次提交后已推送 |

### 1.2 账户服务（**只读对接，未改代码**）

| 项 | 值 |
|---|---|
| HEAD | `71e9949`（KyFold Account V0.1: 统一身份认证服务） |
| 未提交改动 | **28 项（24 修改 + 4 新增）**，是并行工作的成果，**本次任务没有触碰任何账户服务文件** |
| 内容 | `me.ts` 的「最近登录算作 reauth」、`otp-hash.ts`、recovery/security 回归测试等 |
| 部署副本 | `thy@homehub:~/HomeHub/apps/kyfold-account/`（launchd 托管，监听 `127.0.0.1:8797`） |

审查时请以账户服务**当前工作树**为准：它有未提交改动，行为可能与本轮测试基线略有差异（见 §5、§7.1）。

---

## 2. 本次改了什么

### 2.1 文件清单（官网仓库）

| 文件 | 改动 |
|---|---|
| `js/account-api.js`（新增） | 账户服务客户端：CSRF double-submit、错误码中文映射、401/403 处理、登录/绑定/解绑/会话/导出/注销 |
| `js/pages/login.js`（新增） | 真实登录页：邮箱验证码、provider 状态渲染、失败/限流/未配置状态 |
| `js/pages/account.js`（重写） | 账户中心四个面板（真实数据）、再验证弹窗、通用对话框、`#/account-about` 说明页 |
| `js/pages/legal.js` | 隐私说明 8 节、使用说明 6 节（按真实数据面写） |
| `js/data.js` | FAQ 扩到 23 条（新增 login / providers / local-account），账户说明卡片改为真实状态 |
| `js/pages/home.js`、`about.js`、`product.js`、`help.js` | 入口、口径、下载说明、帮助分类与隐私提示对齐 |
| `js/components.js` | 页头账户入口（不再依赖演示登录状态）、页脚状态行 |
| `js/router.js`、`app.js` | 异步挂载账户页；删除全部演示登录事件；OAuth 回调路径 `/account`、`/login` → hash 路由 |
| `content.css` | 加载骨架、错误卡片、spinner、provider 未配置态、表单/对话框样式 |
| `tools/serve.mjs`（新增） | 静态服务器 + `/api/*` 反代（同源，解决 cookie / CSRF / CSP） |
| `tools/dev-up.mjs`（新增） | 一条命令启动账户服务 + 官网，自动生成开发密钥、配置来源白名单 |
| `tools/ui-check.mjs` | 新增 `account`（23 项真实账户 E2E）、`degraded`（5 项降级态）、截图、4xx 白名单 |
| `tools/e2e-account.mjs`（新增） | 账户 API 端到端（9 项，自起服务、随机端口、临时库） |
| `docs/account-baseline-tests.md`（新增） | 账户服务基线测试核查（110 用例的真实结果与失败根因） |
| `README.md` | 启动方式、架构说明、检查命令、真实/未配置边界 |

### 2.2 关键设计决定

1. **同源反代，而不是给账户服务加 CORS。** 浏览器直接跨端口调用会同时踩三件事：服务没有 CORS 头、页面 CSP 是 `connect-src 'self'`、CSRF 的 Origin 校验。`tools/serve.mjs` 把 `/api/*` 反代到 8797，生产也应是「静态站点 + /api 反代」的同源结构。代价：不能把官网单独丢到 GitHub Pages 再直连 8797（会 401/403），这一点写在 §7.4。
2. **不伪造成功。** 服务不可用时登录表单禁用并给出启动命令；provider `status !== 'available'` 时按钮禁用、标「未配置」；`/api/me` 失败显示错误卡片 + 重试，绝不落回本地假账户。
3. **前端只依赖 `docs/API_CONTRACT.md`。** 没有引入新接口，没有改服务端字段；`REAUTH_REQUIRED` 靠 403 触发、成功后自动重试一次原操作。
4. **账户中心四个面板全部读真实接口**：`GET /api/me`、`GET /api/me/sessions`、`GET /api/config/providers`、`PATCH /api/me`、`POST /api/me/link|unlink/:provider`、`DELETE /api/me/sessions/:id`、`POST /api/me/sessions/revoke-others`、`GET /api/me/export`、`POST /api/me/delete`。
5. **零构建仍是硬约束。** 新脚本都是普通 `<script>`，共享全局词法作用域；`file://` 直开可浏览全站，账户功能显示「未连接账户服务」。
6. **说明页与实现对齐**：账户说明页把六张卡片改成「现在能做什么 / 现在的接入状态」，不再写「演示数据」「恢复码」「冷静期」这些服务端并不存在的能力。

---

## 3. 真实可用 vs 未配置 / 未验证

| 能力 | 状态 | 说明 |
|---|---|---|
| 邮箱验证码登录 / 注册 | ✅ 真实 | 六位、5 分钟、一次性、摘要存储；首次登录自动建号 |
| 会话恢复 / 退出登录 | ✅ 真实 | cookie `kyfold.session_token`（HttpOnly, SameSite=Lax） |
| 昵称 / 头像修改 | ✅ 真实 | `PATCH /api/me`，头像必须 https |
| 登录方式列表 / 解绑保护 | ✅ 真实 | 邮箱是主方式不可解绑；服务端 `409 LAST_LOGIN_METHOD` 兜底 |
| 登录设备列表 / 移除 / 退出其他设备 | ✅ 真实 | 真实会话行，当前设备标记 |
| 数据导出（JSON） | ✅ 真实 | 不含 token；需 reauth（见 §7.1 风险） |
| 注销账户 | ✅ 真实 | 需输入 `DELETE` + reauth；级联删除，立即生效 |
| GitHub / Google 登录与绑定 | ⚠️ 未配置 | 服务端代码完整，缺 client id/secret 与回调地址；接口返回 `unconfigured`，按钮禁用 |
| Apple 登录 | ⚠️ reserved | 需付费开发者账号 + 域名验证 + 公网回调 |
| 真实邮件投递 | ⚠️ 未接入 | 本地是 capture 通道（验证码写本地文件 + 开发回显）；生产必须换 SMTP |
| 账户服务公网部署 | ⚠️ 未做 | 只监听 127.0.0.1；无 TLS、无反代、无域名 |
| OAuth 成功后回到官网 | ⚠️ 未打通 | 服务端回调固定回它自己的 `/account`；配好凭证后用户会落到旧账户页（§7.5） |
| 真实 reauth 5 分钟过期 | ⚠️ 未验证 | UI 用「伪造 403 + 真实 reauth 接口」验证了弹窗链路；没有等真实 5 分钟窗口 |
| 真实导出文件内容 | ✅ 真实 | `e2e-account.mjs` 校验 JSON 且不含 access/refresh token |

**没有任何一处用模拟成功冒充真实登录。** 所有「未配置」入口都不可点击。

---

## 4. 账户系统架构与接口

### 4.1 拓扑

```
浏览器 ──同源──> tools/serve.mjs (:8788) ──/api/* 反代──> KyFold Account (:8797, 127.0.0.1)
                        └── 静态文件：index.html + js/ + css/ + color-studio/
```

- 站点与 API 对浏览器是**同一个 origin**：cookie 自动携带、`kyfold.csrf` 可读、CSP `connect-src 'self'` 成立。
- 反代逐条转发 `Set-Cookie`（合并会只剩第一个），剥离 hop-by-hop 头与 `content-encoding`。
- 服务端 `KYFOLD_ALLOWED_ORIGINS` 必须包含 `http://127.0.0.1:8788`（`dev-up.mjs` 自动设置），否则 POST 被 `403 ORIGIN_NOT_ALLOWED`。

### 4.2 前端调用链（`js/account-api.js`）

```
accountFetch(path, opts)
  ├─ 非 GET：GET /api/csrf 取 token → 请求头 X-CSRF-Token
  ├─ 403 CSRF_FAILED → 清 token、重取、重试一次
  ├─ 401 → 由调用方跳 #/login?next=…
  ├─ 403 REAUTH_REQUIRED → account.js 弹「再验证一次身份」→ POST /api/auth/reauth → 重试一次
  └─ 错误 → AccountApiError{code,status,retryAfter,details} → ACCOUNT_ERROR_TEXT 中文文案
```

关键状态：`accountRuntime.session / me / providers / online`；`accountMountedRoute` 防止面板异步返回后覆盖用户已切走的页面。

### 4.3 会话与第三方绑定

- 会话：服务端 HttpOnly cookie；前端不读 token，只调 `/api/auth/session` 判断登录态。退出调用 `/api/auth/sign-out` 并清空内存状态。
- 绑定：`POST /api/me/link/:provider` 返回 `{url}` → 前端跳转 → provider 授权 → 服务端回调 → 302 回账户页。前端不接触授权码。
- 冲突：第三方身份已绑其他账户 → `409 PROVIDER_ALREADY_LINKED`，页面提示改用原方式登录，**不做任何自动合并**（服务端 `disableImplicitLinking`）。
- 最后一种方式：邮箱是主方式，UI 不可解绑；服务端另有 409 兜底。

---

## 5. 测试与结果

### 5.1 官网

| 命令 | 结果 |
|---|---|
| `for f in app.js js/**/*.js color-studio/*.js tools/*.mjs; do node --check` | 全部通过 |
| `node tools/ui-check.mjs snapshot --url http://127.0.0.1:8788` | 11 个路由，**0 控制台错误**；深色模式、帮助搜索、情景键盘、手机菜单、a11y（无缺 alt / 无可读名 / 无重复 id / 无绝对路径）、Color Studio 画布与 4 个导出按钮全部通过 |
| `node tools/ui-check.mjs account --url http://127.0.0.1:8788` | **23/23 通过**（未登录重定向、错误验证码、登录、四面板、主方式不可解绑、未配置禁用、真实会话行、DELETE 校验、再验证弹窗+真实 reauth+自动重试、改昵称、手机无溢出、退出后需重登、0 未捕获异常） |
| `node tools/ui-check.mjs degraded --url http://127.0.0.1:8789`（API 指向死端口） | **5/5 通过**（登录页提示不可用、表单禁用、账户页错误卡、重试按钮、无脚本异常） |
| 截图 | 登录页、账户四面板、手机端账户页（1440 / 390）均已人工核对 |

### 5.2 账户服务（未改代码，只跑测试）

| 项 | 结果 |
|---|---|
| `npm run typecheck` | 0 error |
| `npm test` | **110 用例：102 pass / 3 fail / 5 skip**（skip 全为 real-oauth，缺凭证） |
| `node tools/e2e-account.mjs` | **9/9 通过**（自起服务、随机端口、临时库，无残留；连跑两次一致） |

3 个失败（详见 `docs/account-baseline-tests.md`）：

| 失败 | 根因 | 归属 |
|---|---|---|
| `GET /api/me/export 未 reauth 时 403` | 测试过时：新契约 §4.0「最近登录算 reauth」让新会话直接放行 | 账户服务：测试需按新语义补「窗口外 403」用例 |
| `未重新验证身份时绑定被拒` | 同上 | 同上 |
| `备份 → 恢复` | `restore.sh:33` 写死 `PORT=8797`，本机 8797 被调试服务占用时拒绝恢复；用临时库的测试被误伤 | 账户服务：脚本应支持 `--port` / 跳过端占用检查 |

### 5.3 没验证到的部分与原因

| 项 | 原因 |
|---|---|
| GitHub / Google 真实 OAuth 往返 | 没有 client id/secret、没有公网回调地址 |
| Apple 登录 | 需要付费开发者账号 + 域名验证 |
| 真实邮件投递 | 服务端只实现了 capture 通道 |
| 真实 5 分钟 reauth 过期后的 403 | 要等 5 分钟；UI 用伪造 403 + 真实 reauth 覆盖了弹窗与重试链路 |
| Safari / Firefox / 真机 | 只用 headless Chrome（桌面 1440 / 移动 390 模拟） |
| 公网部署（HTTPS、反代、CSP/HSTS） | 未部署；账户服务只在本机回环 |
| HomeHub 上的站点部署 | 本轮没有部署官网，只部署过账户服务 |

---

## 6. 与 `product-facts.md` / `account-design.md` 的不一致

`product-facts.md` 是 2026-10-29 02:5x 的事实快照，本轮以**当前代码**为准，已形成的差异：

1. **产品文案**：两款 App 仍为「已实现、内部测试、无下载/TestFlight/测试入口」，与快照一致，没有新增能力声明。
2. **`account-design.md` 与真实服务不一致（文档滞后）**：
   - 文档写「验证码 10 分钟」→ 实际 **5 分钟**（`config.otp.expiresInSeconds`）；
   - 文档写「删除冷静期 30 天」→ 实际**立即级联删除**（`POST /api/me/delete` 202 后即删）；
   - 文档写「恢复码自助恢复」→ 实际**没有恢复码**，也没有人工找回流程；
   - 文档写「同 provider 多身份待定」→ 实际 v1 每账户每 provider 一条。
   官网文案已按**实际行为**写（5 分钟、立即删除、无恢复码）；设计文档仍保留未来方案，审查时请以代码为准。
3. **仍需负责人确认**：产品版本号（KyRemote 0.5.93 / 0.5.53 / 1.0 三处不一致）、对外名称（ClassroomProbe vs 课堂 AI 助手）、OAuth 服务商与回调、SMTP 服务商、删除冷静期是否真要做、是否上 TOTP。

---

## 7. 需要 Codex 重点审查的风险

### 7.1 【高】「最近登录算 reauth」覆盖了注销与导出

- 位置：`account/src/api/routes/me.ts`（`RECENT_AUTH_MS` / `reauthState` / `assertReauth`）、`docs/API_CONTRACT.md` §4.0。
- 事实：会话创建 5 分钟内，`assertReauth` 直接放行。受保护的操作包括**绑定、解绑、导出、注销**。
- 影响：拿到「登录后 5 分钟内的会话」即可无验证码全量导出或删号。官网侧 `withReauth` 只是被动接收 403，不会主动强制验证码，所以**前端无法弥补**。
- 建议：注销与导出强制显式 reauth；窗口做成 `KYFOLD_RECENT_AUTH_SECONDS` 且生产默认 0；`reauthValidUntil` 区分来源。
- 注意：这是账户服务的设计问题，不在本轮改动范围内（负责人明确「保留账号系统已有的安全设计」）。

### 7.2 【高】三条 reauth 守卫测试是红的

- 位置：`account/tests/integration/unlink.test.ts`、`linking.test.ts`、`export` 相关用例。
- 影响：导出与绑定的 step-up 路径**当前没有测试保护**，任何回归都不会被发现。
- 建议：按新语义补两条用例（窗口内放行 / 窗口外 403），并修正 `AUTH_SECURITY_REPORT.md` §2.6 里已失效的「实测 403」结论。

### 7.3 【中】备份恢复脚本写死端口

- 位置：`account/scripts/restore.sh:33`（`PORT=8797`）。
- 影响：只要 8797 有服务在跑，`backup-restore.test.ts` 必失败；运维时也无法在别的端口恢复。
- 建议：接受 `KYFOLD_PORT` / `--port`，`--db` 模式跳过端占用检查。

### 7.4 【中】部署形态假设（同源反代）

- 位置：`tools/serve.mjs`（反代）、`README.md`。
- 风险：如果后续把官网部署到静态托管（GitHub Pages / 对象存储）再跨源调用 8797，会同时触发 CORS 缺失、CSP `connect-src 'self'`、CSRF Origin 三项失败，表现为「登录按钮一直报网络错误」。
- 建议：生产用同一个反代（Nginx/Caddy）把 `/api` 转到账户服务；或在账户服务加 CORS + `KYFOLD_ALLOWED_ORIGINS`，并同步改站点 CSP。

### 7.5 【中】OAuth 成功后回不到官网

- 位置：`account/src/api/routes/auth.ts`（`callbackURL = ${config.baseUrl}${nextPath}`）、`src/api/routes/me.ts:285`（`callbackURL = ${config.baseUrl}/account?linked=…`）。
- 事实：`next` 只接受站内相对路径，回调固定落到账户服务自己的 `/account`。
- 影响：配置好 OAuth 凭证后，从官网点「绑定 GitHub」→ 授权 → 会落到旧账户页，而不是 `#/account/identities`。
- 建议：增加 `KYFOLD_SITE_ORIGIN`，允许指向该 origin 的绝对 `next`；或让回调 302 到站点 hash 路由。本轮未改服务端，官网侧已能处理落回 `/account` 的路径归一化（`app.js` 的 `normalizeLegacyPath`）。

### 7.6 【中】验证码与 cookie 的开发态行为

- capture 通道把验证码写 `*.mailbox.jsonl`，开发回显把验证码直接返回给浏览器（`KYFOLD_OTP_DEV_ECHO=1`）。生产环境该字段强制关闭（`config.ts`），但**部署时必须确认 `NODE_ENV=production`**，否则等于任何人可拿验证码登录。

### 7.7 【低】前端实现细节

| 位置 | 说明 |
|---|---|
| `js/account-api.js` `ACCOUNT_ERROR_TEXT` | 与 `account/public/assets/app.js` 的 `CODE_TEXT` 是两份拷贝，服务端新增错误码时要同步两处 |
| `js/account-api.js` `accountRuntime.online` | 只是「最近一次请求是否成功」的启发式，不用于安全判断 |
| `js/pages/account.js` `accountDialog` | 复用全局 `<dialog>` 与 `modalHandler`；同一时刻只允许一个对话框，重复打开会让前一个 Promise 悬空（当前 UI 不会触发） |
| `js/pages/account.js` `promptReauth` | 打开即自动发码（purpose=reauth）；若用户 60 秒内取消再触发，会被服务端按邮箱限流，页面显示「约 N 秒后可重试」 |
| `js/pages/login.js` | `loginMounted` 变量当前未使用，可删 |
| `app.js` `normalizeLegacyPath` | 只处理 `/account`、`/login` 两个服务端路径；新增服务端页面路由时要同步 |

### 7.8 【低】内容与可访问性

- 所有用户数据（昵称、邮箱、UA、会话 ID、provider note）都经过 `escapeHTML` 注入模板；新增动态字段时请保持这一约定。
- 账户页错误卡片/骨架有 `role="status"`/`role="alert"`；对话框有 `aria-labelledby="dialog-title"`。
- 只做了基础抽查（alt、可读名称、重复 id、h1 数量、对比度手算），没有做完整 WCAG 审核。

---

## 8. 本地启动（Mac）

### 8.1 一条命令

```bash
cd /Users/thy/Agent/KyFold-site
node tools/dev-up.mjs
# → 官网 http://127.0.0.1:8788
# → 账户 http://127.0.0.1:8797（127.0.0.1 only）
# Ctrl+C 一起停止
```

前提：Node ≥ 24；账户服务仓库在 `../KyFold/account`（否则 `--account-dir <path>`）。

登录：`http://127.0.0.1:8788/#/login` → 填邮箱 → 获取验证码 → 开发通道把验证码显示在页面上（同时写入 `/tmp/kyfold-dev.db.mailbox.jsonl`）。

### 8.2 只跑其中一部分

```bash
node tools/serve.mjs --port 8788 --api http://127.0.0.1:8797   # 只起官网 + 反代
python3 -m http.server 8788                                     # 纯静态，账户显示「未连接」
open index.html                                                 # file:// 可浏览
```

### 8.3 环境变量（只有名字，没有任何密钥值）

账户服务：

| 变量 | 用途 |
|---|---|
| `KYFOLD_SECRET` | 会话/验证码签名密钥（≥32 字节；`dev-up.mjs` 生成到 `.dev-secret`，已 gitignore） |
| `KYFOLD_DB_PATH` | SQLite 路径（开发默认 `/tmp/kyfold-dev.db`） |
| `KYFOLD_MAIL_TRANSPORT` | `capture` / `smtp` / `unconfigured` |
| `KYFOLD_OTP_DEV_ECHO` | `1` 时开发环境回显验证码（生产强制关闭） |
| `KYFOLD_ALLOWED_ORIGINS` | 逗号分隔的来源白名单，必须含官网 origin |
| `PORT` / `HOST` / `KYFOLD_BASE_URL` | 监听与对外基址 |
| `KYFOLD_ADMIN_TOKEN` | 管理接口令牌（不配置则管理接口不可用） |
| `KYFOLD_SMTP_HOST` / `_PORT` / `_USER` / `_PASS` / `KYFOLD_MAIL_FROM` | SMTP（V0.1 未实现投递，仅预留） |
| `GITHUB_CLIENT_ID` / `_SECRET`、`GOOGLE_CLIENT_ID` / `_SECRET` | OAuth（未配置时按钮显示未配置） |
| `APPLE_CLIENT_ID` / `_TEAM_ID` / `_KEY_ID` / `_PRIVATE_KEY` | Apple（预留） |

官网侧没有必须的环境变量：`tools/serve.mjs` 用 `--api` 或 `KYFOLD_API_BASE` 指向账户服务。

---

## 9. 需要负责人决定的事

1. **部署形态**：官网与账户服务是否都放到 HomeHub，由同一个反代（Caddy/Nginx）提供 `https://` 与 `/api` 转发？这是账户真正对外开放的前提。
2. **OAuth 服务商**：先接 GitHub 还是 Google？需要你注册应用并给回调地址（形如 `https://<域名>/api/auth/callback/github`）。
3. **邮件投递**：选哪家 SMTP（Resend / 阿里云 / 自建）？不接的话登录只能在开发通道用。
4. **安全策略**：是否接受「最近登录 5 分钟内免验证码」覆盖注销与导出（§7.1）？建议改为只覆盖绑定/解绑。
5. **删除策略**：账户服务当前是立即删除、不可恢复；`docs/account-design.md` 写的是 30 天冷静期。以哪个为准？
6. **产品对外信息**：KyRemote 版本号三处不一致、课堂助手对外名称、是否公布测试计划。
7. **是否公开发布官网**：当前 `index.html` 仍是 `noindex`；公开前需要域名、隐私说明落款/联系方式、托管与备案。

---

## 10. 交付物与复查入口

- 官网 + 工具 + 文档：本仓库；`git log` 看 `b38fa0e`。
- 账户服务：`/Users/thy/Agent/KyFold/account`（未改）。
- 测试脚本：`tools/ui-check.mjs`（静态 / 账户 / 降级 / 截图）、`tools/e2e-account.mjs`（API）。
- 基线报告：`docs/account-baseline-tests.md`。
- 本文件：`CODEX_REVIEW_HANDOFF.md`。
