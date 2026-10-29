# KyFold 账户服务 · 基线核查与零依赖 E2E 验证

> 核查日期：2026-10-29（Asia/Shanghai）
> 核查范围：`/Users/thy/Agent/KyFold/account`（**只读，未修改任何文件**）
> 交付物：本文件 + `tools/e2e-account.mjs`

---

## 0. 结论先说

| 项 | 结果 |
|---|---|
| `npm run typecheck` | ✅ **0 error**（exit 0） |
| `npm test`（复核运行） | ⚠️ **110 tests / 102 pass / 3 fail / 5 skipped**，duration 52.2s |
| 失败项性质 | **2 项是「契约已更新、测试未跟上」**，**1 项是本机端口占用导致的环境耦合**；**没有发现实现 bug 的证据** |
| `tools/e2e-account.mjs` | ✅ **9 / 9 PASS**（真实拉起服务、随机端口、临时 DB） |
| 「最近登录算 reauth」判断 | ⚠️ 方向可接受，但**不应覆盖「注销账号」这类不可逆操作**；详见 §6 |

关键提醒：本次核查期间，账户服务的**未提交工作树仍在被并行修改**（`git diff --stat` 从 315 插入变为 342 插入），见 §4.2。所以本文给了两次运行：基线运行（12:56）与复核运行（13:01）。

---

## 1. 环境与命令

| 项 | 值 |
|---|---|
| 主机 | macOS 27.0.1，arm64（开发机） |
| Node | v24.15.0（原生跑 `.ts`，无构建步骤） |
| 仓库 | `/Users/thy/Agent/KyFold/account` |
| 分支 / commit | `main` / `71e99496c35fdad2fbec7548b81b99b0382433b0`（`KyFold Account V0.1: 统一身份认证服务`，2026-10-29 03:17:20 +0800） |
| 工作树状态 | **脏**：21 个已跟踪文件被修改 + 4 个未跟踪文件（清单见 §4） |

执行的命令（均为只读运行，不改仓库）：

```bash
cd /Users/thy/Agent/KyFold/account
git status --porcelain
git diff --stat
npm run typecheck
npm test > /tmp/account-tests.log 2>&1          # 基线运行
npm test > /tmp/account-tests-rerun.log 2>&1    # 复核运行（工作树被并行改动后）
npm run typecheck 2>&1 | tail -3                # 复核 typecheck
```

---

## 2. 类型检查

```
> kyfold-account@0.1.0 typecheck
> tsc --noEmit
[exit 0]
```

基线与复核两次都是 **0 error**。类型层面没有信号。

---

## 3. 测试统计

Node 原生 `node:test`（`node --test tests/**/*.test.ts`，spec reporter）。

| 运行 | 时间窗 | tests | pass | fail | skipped | cancelled | todo | duration |
|---|---|---|---|---|---|---|---|---|
| 基线 | 2026-10-29 12:56:32 → 12:57:24 | **110** | **101** | **4** | 5 | 0 | 0 | 52 206 ms |
| 复核 | 2026-10-29 13:00:59 → 13:01:52 | **110** | **102** | **3** | 5 | 0 | 0 | 52 249 ms |

两次差值 = 1 个用例（`未 reauth 时解绑被拒`）在两次运行之间被并行开发者修好了，见 §5.1。

**跳过的 5 项**（全部是真实 OAuth 用例，缺凭证时 skip，属预期）：

- `tests/real-oauth/github-real.test.ts`：3 项（需 `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` / `KYFOLD_REAL_CALLBACK_URL`）
- `tests/real-oauth/google-real.test.ts`：2 项（需 `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `KYFOLD_REAL_GOOGLE_CALLBACK_URL`）

> 说明：`docs/GPT_HANDOFF.md` 写的是「92 用例」，实际是 110（含 5 个 skip）。这是文档滞后，不影响功能验收，但应在改接口时一并修正。

---

## 4. 未提交改动清单（核查时快照）

### 4.1 `git status --porcelain`（25 项）

```
 M docs/API_CONTRACT.md
 M docs/ARCHITECTURE.md
 M docs/AUTH_SECURITY_REPORT.md
 M docs/DATABASE_SCHEMA.md
 M docs/DEPLOYMENT_AND_MIGRATION.md
 M docs/GPT_HANDOFF.md
 M public/assets/login.js
 M scripts/backup.sh
 M scripts/restore.sh
 M src/api/http.ts
 M src/api/routes/auth.ts
 M src/api/routes/health.ts
 M src/api/routes/me.ts
 M src/auth/index.ts
 M src/auth/oauth-mock.ts
 M src/server.ts
 M src/services/mail.ts
 M tests/helpers/oauth-mock.ts
 M tests/integration/auth-email-otp.test.ts
 M tests/integration/backup-restore.test.ts
 M tests/integration/unlink.test.ts
?? src/auth/otp-hash.ts
?? tests/integration/oauth-real-init.test.ts
?? tests/integration/reauth-recovery.test.ts
?? tests/integration/security-regressions.test.ts
```

`git diff --stat`：**21 files changed, 342 insertions(+), 89 deletions(-)**（基线运行时为 315 / 86）。

### 4.2 工作树在核查期间仍在变

| 时间点 | diffstat | 变化 |
|---|---|---|
| 12:56:35（基线运行开始附近） | 315 insertions / 86 deletions | 状态 A |
| 13:00:59（复核运行开始） | 342 insertions / 89 deletions | 状态 B |

状态 A → B 的两处实质变化：

1. `docs/API_CONTRACT.md` 新增 **§4.0「敏感操作的最近认证要求」**（+17 行），把「会话 5 分钟内建立」写成契约的一部分；
2. `tests/integration/unlink.test.ts` 的 `未 reauth 时解绑被拒` 用例改为**把会话老化到 10 分钟前**再断言 403（+13 行）。

⚠️ 结论：**任何「当前全绿/有红」的结论都必须带时间戳**。本文所有数字都标了运行时间窗。

与「最近登录算 reauth」直接相关的实现改动（`src/api/routes/me.ts`，+65 行）在两次运行之间**没有变化**，两次运行测的是同一份实现。

---

## 5. 失败项明细与根因

### 5.1 `未 reauth 时解绑被拒：403 REAUTH_REQUIRED`（基线失败 → 复核已修）

- 文件：`tests/integration/unlink.test.ts:127`
- 断言首行：`新会话未 reauth，解绑必须 403 REAUTH_REQUIRED（契约 4 节）：期望 HTTP 403，实际 204`
- **根因：测试过时**（Relative to 新契约）。实现新增了 `RECENT_AUTH_MS`：会话建立 5 分钟内视为已认证（`src/api/routes/me.ts`）。用例在 `signOut` 后立刻重新登录建新会话，新会话 `createdAt` 就是「刚刚」，因此 `assertReauth` 直接放行 → 解绑成功 204。
- **需要谁修**：并行改 reauth 逻辑的那位（已在 13:00 前修好）。修法是**把 `session.createdAt` 改到 10 分钟前**再断言 403，这样测的才是 reauth 机制本身，而不是「最近认证」豁免。
- 评价：这个修法是正确方向——它把「豁免生效」与「reauth 拒绝」区分开了。但它只覆盖了 `unlink`，`link` 和 `export` 还没同步（见 5.2 / 5.3）。

### 5.2 `GET /api/me/export 未 reauth 时 403 REAUTH_REQUIRED`（复核仍失败）

- 文件：`tests/integration/data.test.ts:36`
- 断言首行：`契约 6 节：导出需要 reauth（5 分钟内重新验证身份）：期望 HTTP 403，实际 200`
- 实际响应：`200` + `content-disposition: attachment; filename="kyfold-account-<id8>-2026-10-29.json"` + 完整导出 JSON。
- **根因：测试过时**。用例登录后立刻导出，新会话落在「最近认证」窗口内 → 放行。
- 修复建议：与 5.1 同款——把 `session.createdAt` 老化到窗口外（10 分钟前）再断言 403。**不要**删掉这条用例：它是「导出必须 step-up」的唯一守卫。
- **需要谁修**：改 reauth 逻辑（`me.ts`）的那位，或数据导出功能的负责人。

### 5.3 `未重新验证身份（reauth）时绑定被拒：403 REAUTH_REQUIRED`（复核仍失败）

- 文件：`tests/integration/linking.test.ts:130`
- 断言首行：`契约 4 节：绑定需要 5 分钟内的 reauth，否则 403 REAUTH_REQUIRED：期望 HTTP 403，实际 200`
- 实际响应：`200 {"url":"/api/auth/sign-in/social/github?next=%2Faccount"}`
- **根因：测试过时**，同上。
- **需要谁修**：同上。

### 5.4 `备份 → 写入新数据 → 恢复：旧数据回来、新数据消失`（复核仍失败）

- 文件：`tests/integration/backup-restore.test.ts:82`
- 断言首行：`scripts/restore.sh 执行失败（…/backups/kyfold-account-20261029-130103.sqlite --db …/kyfold-account.db）`
- 脚本输出停在：`服务或目标数据库正在使用，拒绝恢复（--force 不能绕过）。`
- **根因：环境耦合，不是代码 bug，也不是测试过时。**

  证据链：

  1. `scripts/restore.sh:33` 把 `PORT=8797` **写死**，且**没有** `--port` / 环境变量覆盖入口；
  2. 服务状态检查（`scripts/restore.sh:106-112`）三条任一命中即 `RUNNING=1`：launchd 服务、**8797 端口 LISTEN**、目标库被 lsof 打开；
  3. 实测本机 **8797 正被另一个 node 进程占用**（Lead 的调试服务，`lsof -nP -iTCP:8797 -sTCP:LISTEN` → `node PID … (LISTEN)`），且本机**没有** `com.homehub.kyfold-account` 的 launchd 服务；
  4. 该用例用的是**随机端口的临时库**，与 8797 毫无关系，却被 8797 的检查误伤；
  5. 对照实验：把 `restore.sh` 复制到 `/tmp`、只把 `PORT` 改成空闲的 `8799`，同一份备份/同一个目标库 → 恢复成功（`✓ 已恢复 … integrity_check = ok`）。

  补充：**这个失败与本次未提交改动无关**。改动前的版本（`git show HEAD:scripts/restore.sh`）在同样条件下也会失败（`RUNNING=1` + 无 `--force` → exit 3），只是报错文案不同。

- **需要谁修**：
  - 首选（工具侧）：`scripts/restore.sh` 增加 `--port` 参数或读 `KYFOLD_PORT`，并在 `--db` 模式下**跳过**「本机生产服务在跑」的端口检查——测试环境不该被生产端口状态卡住；
  - 次选（环境侧）：跑测试时保证 8797 空闲；
  - **不要**用 `--force` 绕过：新版本已明确 `--force` 不绕过此检查（这个收紧本身是对的）。

### 5.5 根因分类汇总

| 失败项 | 分类 | 是否实现 bug | 谁修 |
|---|---|---|---|
| 未 reauth 时解绑 | 测试过时（契约已改） | 否 | 已由并行开发者修好 |
| 未 reauth 时导出 | 测试过时（契约已改） | 否 | reauth 实现负责人 / 导出功能负责人 |
| 未 reauth 时绑定 | 测试过时（契约已改） | 否 | 同上 |
| 备份 → 恢复 | 环境耦合（端口 8797 写死） | 否 | `restore.sh` 加端口覆盖（测试隔离） |

**没有任何一条能归到「实现 bug」。** 唯一需要盯着的是 5.2 / 5.3 两条守卫测试：在它们被正确地「老化会话 + 断言 403」之前，`export` 和 `link` 的 step-up 逻辑实际上是**没有测试保护**的。

---

## 6. 关于「最近登录算作 reauth」的判断（安全设计）

### 6.1 事实（代码与契约都已是这样）

`src/api/routes/me.ts` 新增：

```ts
const RECENT_AUTH_MS = 5 * 60 * 1000;          // 与 reauth TTL 相同
// 会话 createdAt + 5min 未过期 → 视为已认证
```

失效顺序：`kyfold_reauth.valid_until` 与 `session.createdAt + 5min` 取**较晚者**作为 `reauthValidUntil`。受影响的四个操作：绑定、解绑、数据导出、**账号注销**（都走同一个 `assertReauth`）。

`docs/API_CONTRACT.md` §4.0 已把这条写成契约；`docs/GPT_HANDOFF.md` §5.3 第 14 条与 `docs/AUTH_SECURITY_REPORT.md` 也补了说明。**所以实现、契约、交接文档是一致的。**

### 6.2 风险

1. **最刚性的威胁模型被削弱 5 分钟。** reauth 原本要防的是「会话凭证被偷（恶意软件、共享设备、备份泄漏）后，攻击者不知道邮箱验证码就做不了破坏性操作」。加了豁免后，**任何登录后 5 分钟内的会话**都具备完整破坏力——而登录后的头几分钟恰恰是会话最容易被新感染/被旁观者拿到的时间窗。
2. **注销是不可逆的。** `POST /api/me/delete` 与绑定/解绑在同一个 `assertReauth` 下，意味着「偷到刚登录的会话」= 可直接删号（202）+ 级联删除数据，不需要验证码。
3. **导出是批量 PII 外泄。** 同上，5 分钟窗口内可拿到全量导出（含会话 IP/UA、审计日志）。
4. **可用性理由比文档写的弱。** 文档说「纯 OAuth 账号拿不到验证码会永久锁死」，但：
   - 账号一定有 `email` 字段（better-auth 强制），Apple 隐藏邮箱也会转发到中继地址，仍能收码；
   - `emailOtpUsable = 邮件通道可用 && user.emailVerified`，真正拿不到码的是「邮件通道不可用」或「邮箱未验证」，而后者在完成一次邮箱验证后会被 better-auth 清理绑定（HANDOFF §5.3 第 13 条）；
   - 也就是说，**锁死场景是边缘的**，不足以支撑给「注销」也开豁免。
5. **契约措辞把「最近认证」和「显式 reauth」并列，但语义并不等价。** 前者是**零成本**（登录即得），后者是**有成本**（要能读邮箱）。前端 `security.js` 会把两者都显示成「身份验证已通过，有效期至 …」，用户无法分辨这次敏感操作到底有没有真的二次验证。

### 6.3 我的判断

**方向可接受，覆盖面太宽。**「最近认证 = auth_time」是 OIDC 的标准语义，不算发明；但它通常用于**降摩擦的读操作**，而不是**不可逆写操作**。建议：

1. **分层**：绑定 / 解绑保留「最近认证」豁免（可逆、危害小）；**导出与注销强制显式 reauth**（不可逆 / 批量外泄）。这才是 GitHub 式的 sudo-mode 惯例。
2. **窗口可配置**：`KYFOLD_RECENT_AUTH_SECONDS`，生产默认 `0`（关闭豁免）；测试与本地开发再打开。
3. **`reauthValidUntil` 要能区分来源**：例如额外返回 `reauthSource: 'recent-login' | 'reauth'`，让前端提示与后端策略一致，也让审计能区分「用户真的输过码」。
4. **补测试锁住边界**：至少一条「会话 `createdAt` 早于窗口 1 秒 → 403」与一条「会话在窗口内 → 放行」的用例。现在 5.2 / 5.3 两条红测试，恰好说明**这块目前没有任何测试在保护**。
5. **顺手要修的输出**：`docs/AUTH_SECURITY_REPORT.md` §2.6 仍写着
   `[实测]：未 reauth 直接调 POST /api/me/link/github → 403 REAUTH_REQUIRED` ——
   这句在当前实现下**已经不成立**（实测返回 200），需要更新或标注为「旧版本实测」。

### 6.4 一句话给决策者

> 如果这台服务只跑在回环、只有主人能访问，「最近认证豁免」的风险可以接受；**一旦对外开放，注销与导出必须先关掉这条豁免**。当前实现没有开关，建议加开关再上线。

---

## 7. 零依赖 E2E 脚本：`tools/e2e-account.mjs`

### 7.1 运行方式

```bash
node tools/e2e-account.mjs
```

零依赖：只用 Node 内置模块（`node:child_process` / `node:net` / `node:fs` / `node:crypto`）+ 全局 `fetch`。

### 7.2 设计要点

| 要求 | 实现 |
|---|---|
| 自己拉起服务 | `spawn('node', ['src/server.ts'], { cwd: ACCOUNT_DIR, env })` |
| 随机空闲端口 | `net.createServer().listen(0)` 拿端口，**显式排除 8797** |
| 临时 DB | `/tmp/kyfold-e2e-<pid>.db`（含 `-wal`/`-shm`/`.mailbox.jsonl` 一并清理） |
| 环境 | `NODE_ENV=test`、`KYFOLD_SECRET` = 48 字符随机（`base64url(36B)`）、`KYFOLD_MAIL_TRANSPORT=capture`、`KYFOLD_OTP_DEV_ECHO=1`、`KYFOLD_BASE_URL`/`KYFOLD_ALLOWED_ORIGINS` 指向本实例；并**剥掉**父进程里所有 `KYFOLD_*`/`GITHUB_*`/`GOOGLE_*`/`APPLE_*`/`PORT`/`HOST`/`NODE_ENV` |
| 就绪等待 | 轮询 `/api/health`，200 = 就绪；503 = 降级 → 立即失败并打印子进程日志；30s 超时 |
| cookie jar | 手写 `Map`，解析 `headers.getSetCookie()`，按 `Max-Age<=0` / 过期 `Expires` 删除；`value` 只在**第一个** `=` 处切分 |
| CSRF | `GET /api/csrf` 存 `kyfold.csrf` + 取 token；写请求带 `X-CSRF-Token`；遇 `403 CSRF_FAILED` 自动重取一次重试 |
| 清理 | `finally` + `process.on('exit')` + `SIGINT/SIGTERM` 三重兜底：`kill(-pid, SIGTERM)` → 3s → `SIGKILL`，再删临时文件 |
| 结果 | 每条 `PASS`/`FAIL`，末尾汇总；任一 FAIL → 退出码 1 |

### 7.3 覆盖场景与实测结果（2026-10-29 13:0x，9/9 PASS）

| # | 场景 | 断言 | 结果 |
|---|---|---|---|
| 1 | 发码 sign-in → `devCode` 登录 → `GET /api/me` | 202 有 `devCode`；登录 200；`user.email` 一致；`loginMethods` 含 `email-otp` | ✅ |
| 2 | `PATCH /api/me` 改昵称 → 回读 | 200；响应与回读的 `name` 均为新值 | ✅ |
| 3 | `GET /api/me/sessions` | 200；`sessions.length ≥ 1`；`current === true` 恰好 1 个 | ✅ |
| 4 | 新会话 reauth：正确码 / 错误码 | 新会话登录回同一 `user.id`；`POST /api/auth/reauth` 正确码 **204**；第二次取码后提交错误值 **400** + `error.code ∈ {INVALID_OTP, OTP_EXPIRED, OTP_TOO_MANY_ATTEMPTS}` | ✅ |
| 5 | `GET /api/me/export` | 200；`Content-Type` 含 json；可解析；`user.id` 一致；有 `formatVersion`；全文不含 `access_token`/`refresh_token`/`accessToken`/`refreshToken` | ✅ |
| 6 | 解绑邮箱方式 | `POST /api/me/unlink/email-otp` → **409 `LAST_LOGIN_METHOD`** | ✅ |
| 7 | CSRF 缺失 | 不带 `X-CSRF-Token` 的 POST → **403 `CSRF_FAILED`** | ✅ |
| 8 | Origin 白名单 | `Origin: http://evil.example` 的 POST → **403 `ORIGIN_NOT_ALLOWED`** | ✅ |
| 9 | 注销 | 错误确认串 → **400 `ACCOUNT_DELETE_CONFIRMATION_REQUIRED`**；`confirmation:"DELETE"` → **202**；之后 `GET /api/me` → **401** | ✅ |

实际输出（摘要）：

```
KyFold Account E2E —— 目标目录 /Users/thy/Agent/KyFold/account
服务已就绪：http://127.0.0.1:62371（DB=/tmp/kyfold-e2e-30114.db）

PASS  发码 sign-in → devCode 登录 → GET /api/me（user + email-otp）
PASS  PATCH /api/me 改昵称 → 再读一致
PASS  GET /api/me/sessions 至少 1 个且恰好一个 current
PASS  新会话 reauth：正确验证码 204，错误验证码 400
PASS  GET /api/me/export 是 JSON 且不含 access_token / refresh_token
PASS  解绑邮箱登录方式 → 409 LAST_LOGIN_METHOD
PASS  CSRF：不带 X-CSRF-Token 的 POST → 403 CSRF_FAILED
PASS  Origin 白名单：Origin: http://evil.example 的 POST → 403 ORIGIN_NOT_ALLOWED
PASS  注销：错误确认串 400 ACCOUNT_DELETE_CONFIRMATION_REQUIRED，正确 DELETE 202，之后 /api/me 401

通过 9 / 9
[e2e exit: 0]
```

### 7.4 已知边界（别误读）

1. **脚本没有断言「未 reauth 时敏感操作被拒」**，因为当前实现按设计中就不拒（见 §6）。它验证的是 **reauth 端点本身**（正确码 204 / 错误码 400），这正是任务书要求的那条路径。
2. 错误码那一步刻意**先用一条新验证码再做错误提交**：`reauth` 成功后实现会 CAS 删除该验证码，若复用同一条码做错误提交，拿到的是「记录不存在」而不是「码不匹配」，断言会失真。
3. 每个邮箱的 `send-otp` 配额是 5 次/15 分钟，脚本用 4 次（sign-in ×2、reauth ×2），留 1 次余量；改脚本时别再加发码步骤。
4. 端口随机且排除 8797，可与 Lead 的调试服务并存。

---

## 8. 建议下一步（按优先级）

| 优先级 | 事项 | 归属 |
|---|---|---|
| P0 | 把 `data.test.ts` / `linking.test.ts` 两条守卫测试改成「会话老化 10 分钟后断言 403」 | reauth 实现负责人 |
| P0 | 决定「注销 / 导出」是否保留最近认证豁免；若要分层，改 `assertReauth` 调用点 + 契约 §4.0 | 架构决策（Lead） |
| P1 | `scripts/restore.sh` 支持 `--port` / `KYFOLD_PORT`，测试不再被本机 8797 卡住 | 备份恢复负责人 |
| P1 | 更新 `AUTH_SECURITY_REPORT.md` §2.6 那条已失效的 `[实测]` | 文档维护者 |
| P2 | `docs/GPT_HANDOFF.md` 的「92 用例」改为 110（含 5 skip） | 文档维护者 |
| P2 | 补一条「窗口内放行 / 窗口外拒绝」的边界用例，锁住豁免行为 | reauth 实现负责人 |

---

## 附录 A：完整复现命令

```bash
cd /Users/thy/Agent/KyFold/account

# 基线
git status --porcelain
git diff --stat
npm run typecheck
npm test > /tmp/account-tests.log 2>&1; echo "exit=$?"

# 只看统计与失败项
grep -E '^ℹ (tests|pass|fail|skipped|duration_ms)' /tmp/account-tests.log
grep -n '^✖' /tmp/account-tests.log

# 验证 8797 占用（还原 restore.sh 失败原因）
lsof -nP -iTCP:8797 -sTCP:LISTEN
launchctl print system/com.homehub.kyfold-account   # → 无此服务，所以是端口检查命中

# E2E
cd /Users/thy/Agent/KyFold-site
node tools/e2e-account.mjs; echo "exit=$?"
```

## 附录 B：失败断言原文（复核运行）

```
✖ 备份 → 写入新数据 → 恢复：旧数据回来、新数据消失
  AssertionError [ERR_ASSERTION]: scripts/restore.sh 执行失败（…/kyfold-account-20261029-130103.sqlite --db …/kyfold-account.db）
    输出：… 服务或目标数据库正在使用，拒绝恢复（--force 不能绕过）。

✖ GET /api/me/export 未 reauth 时 403 REAUTH_REQUIRED
  AssertionError [ERR_ASSERTION]: 契约 6 节：导出需要 reauth（5 分钟内重新验证身份）：期望 HTTP 403，实际 200

✖ 未重新验证身份（reauth）时绑定被拒：403 REAUTH_REQUIRED
  AssertionError [ERR_ASSERTION]: 契约 4 节：绑定需要 5 分钟内的 reauth，否则 403 REAUTH_REQUIRED：期望 HTTP 403，实际 200
```
