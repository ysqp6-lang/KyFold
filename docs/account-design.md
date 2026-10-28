# KyFold 统一账户设计

> 状态：设计稿，**暂不接入真实 OAuth**。站点仍是 `localStorage` 演示（key `kyfold-ui-preview-v1-2`）。
> 涉及模板：`login()` / `accountIntro()` / `identitiesPanel()` / `securityPanel()`（拆分后在 `js/pages/account.js`）；文中「待负责人确认」= 需主人拍板后才能落地，未确认项不写进用户可见文案。

## 0. 范围与现状

- 现状：`login()` 的四种入口都直接进 `loginDemo()`；邮箱验证码固定 `123456`；`identitiesPanel()` 的绑定是本地布尔翻转；`securityPanel()` 只有一台示例 iPad；`accountIntro()` 与 FAQ（`identity`/`binding`/`data`/`unbind`）已表达「身份统一、内容不合并」，本文把方向落成可实施模型。
- 不在范围：视觉改版、Color Studio（无需账户、纯本地）、产品版本事实（负责人确认）。
- 术语：**KyFold 账户**（唯一主体，`account_id` 即令牌 `sub`）、**身份**（一条登录入口，`(provider, subject)` 唯一）、**会话**（一次登录的 refresh 家族，绑一台设备）、**数据域**（`kyremote`/`classroom` 各自的内容库，按 `account_id` 分键但互不可查）。

## 1. 统一用户 ID 的数据模型

### 1.1 关系与 ID 规则

`accounts 1─n identities`（身份锚点 `(provider, subject)`）、`accounts 1─n sessions`、`accounts 1─1 deletion_queue`（申请删除后才产生）。ID 用「前缀 + UUIDv7/ULID」：`kyf_`/`idn_`/`ses_`/`dev_`/`del_`；不复用、不从邮箱派生、不放进 URL 查询串，对外只暴露这些 ID。

### 1.2 `accounts`（KyFold 账户）

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| account_id | text | PK | `kyf_` + 26 位 ULID |
| display_name | text | 1–20 字符 | 昵称，即界面上的 `state.name` |
| primary_email_raw / _norm | text | norm 唯一（§4.5） | raw 原样输入仅用于展示与回信；norm 是规范化比较键 |
| status | enum | `active` `locked` `pending_deletion` `deleted` | `locked` 用于恢复流程，其余见 §7 |
| created_at / updated_at | timestamptz | 非空 | — |

### 1.3 `identities`（身份绑定表）

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| identity_id | text | PK | `idn_` + ULID |
| account_id | text | FK，可空 | `verifying` 阶段可为空 |
| provider | enum | `github` `google` `apple` `email` | 与 `providerNames` 一致 |
| provider_subject | text | 与 provider 联合唯一 | OAuth 的 `sub`/`id`；email 用 `email_norm` |
| provider_email | text | 可空 | 授权返回邮箱；Apple 隐藏地址也存这里 |
| display_hint | text | 可空 | 列表展示标识，如 GitHub login |
| status | enum | 见 §2.2 | 状态机 |
| bound_at / unbound_at / last_used_at | timestamptz | 可空 | 绑定与解绑时间；最近使用用于列表排序与安全提示 |

约束：`unique(provider, provider_subject) where status in ('pending_verify','verifying','bound','unbinding','unavailable')`；`unique(account_id, provider) where status in ('bound','unbinding')`（v1 每账户每种 provider 只留一条可用身份，与现有「一行一个 provider」的 UI 对齐，是否放开多身份待负责人确认）；不做物理删除，`unbound` 行留 90 天后清理。

### 1.4 `sessions`（设备会话表）

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| session_id / device_id | text | PK / 非空 | `ses_`、`dev_` + ULID，device_id 由客户端持久化 |
| account_id | text | FK | — |
| app | enum | `site` `kyremote` `classroom` | 会话来源，列表显示 |
| device_label | text | 非空 | 由 UA 推导，如「Safari · macOS」 |
| refresh_token_hash | bytes | 非空 | 只存哈希，轮换与家族见 §6 |
| created_at / last_seen_at / ip_coarse | 混合 | — | ip 只留网段前缀，180 天后清空（§8） |
| revoked_at / revoke_reason | 可空 | enum | `user_single` `user_all` `recovery` `deletion` `reuse_detected` |

绝对有效期 90 天，活跃轮换顺延；每账户最多 20 台设备，超出淘汰最久未用（数值待负责人确认）。

### 1.5 `deletion_queue`（删除队列）

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| job_id | text | PK | `del_` + ULID |
| account_id | text | 进行中唯一 | 同一账户同时只允许一个删除任务 |
| stage | enum | `requested` `cooling_off` `purging` `done` `failed` | 见 §7.2 |
| domains | json | 非空 | 待清理数据域，如 `["kyremote","classroom"]` |
| requested_at / purge_after | timestamptz | 非空 | 建议冷静期 30 天 |
| attempts / last_error / completed_at | 混合 | 可空 | 重试、告警与幂等依据 |

### 1.6 辅助表（最小集）

`email_challenges`（`email_norm`、`purpose`、`code_hmac`、`expires_at` 10 分钟、`attempts`≤5、`consumed_at`）；`oauth_states`（一次性 `state_hash`、`session_id`、`provider`、`intent`、`pkce_verifier`、10 分钟过期）；`account_secrets`（`mfa_state`、TOTP 密钥加密存储）；`recovery_codes`（10 条、`code_hmac`、`used_at`）；`audit_events`（追加写入，保留 180 天，脱敏见 §8.3）。

### 1.7 统一身份 ≠ 合并内容

`account_id` 只是身份主语，不构成数据访问权：

| 数据 | 所属域 | 键 | 跨域可见性 |
| --- | --- | --- | --- |
| 昵称、登录方式、会话列表 | account | account_id | 三端可见（会话只展示设备与来源 App） |
| Mac 配对、workspace 映射、任务上下文 | kyremote | account_id + device_id | **仅 KyRemote**，官网与课堂端读不到 |
| 课堂录音、转写、提问记录 | classroom | account_id | **仅课堂助手**，KyRemote 读不到 |
| 配色工程 | 无域（浏览器本地） | — | 不进入账户，不上传 |

规则：每个 App 用自己的库与命名空间，服务端**不提供跨域联表查询**，跨域只经白名单字段（昵称、身份数、会话数）；绑定新入口不触发内容迁移，两个 App 的设备授权仍分别同意（`overviewPanel()` 现有提示保留）；令牌按 `aud` 区分（`site`/`kyremote`/`classroom`），不能互相调用；删除某个 App 的数据不影响账户，删除账户才逐域清理（§7.3）。

## 2. 第三方身份绑定与解绑

### 2.1 绑定流程

1. 账户中心「登录与绑定」→ 选择 provider（即 `identitiesPanel()` 的「绑定」按钮）。
2. step-up：会话的二次验证超过 5 分钟时先重新验证（§3.2）。
3. `POST /account/identities/authorize`：生成 32 字节 `state` 与 PKCE `code_verifier`，写 `oauth_states`，绑定 `session_id` 与 `intent=bind`。
4. 302 到服务商授权页，scope 最小：Google/Apple `openid email`，GitHub `read:user user:email`；回调先校验 `state`（存在、未消费、未过期、同会话），再换 token 取 `sub` 与邮箱。
5. 查 `(provider, sub)`：不存在 → `pending_verify` → 需邮箱确认时发码（`verifying`）→ `bound`；已绑到**当前**账户 → 幂等成功，只更新 `last_used_at`；已绑到**其他**账户 → 冲突流程（§4），不写任何行。
6. 成功后写 `audit_events`、向主邮箱发「新增登录方式」通知、可选「撤销其他设备会话」；列表改读服务端返回，`countBindings()` 从本地布尔改为真实计数。

### 2.2 身份状态机

| 当前状态 | 事件 | 下一状态 | 副作用 |
| --- | --- | --- | --- |
| pending_verify | 开始邮箱确认 | verifying | 发验证码，10 分钟有效 |
| pending_verify | 30 分钟未完成 | unbound / 删行 | 清理 `oauth_states` |
| verifying | 验证码正确 / 码错 5 次 / 过期 | bound / 回 pending_verify | 成功写 `bound_at` 并发通知；失败可重发，间隔 60 秒 |
| bound | 发起解绑且通过前置条件 | unbinding | 冻结该身份 30 秒，防并发 |
| unbinding | 本地解绑 + 第三方 revoke 完成 | unbound | 写 `unbound_at`，发通知 |
| unbinding | 第三方 revoke 失败 | unbound | 记 `last_error` 告警，本地仍解绑 |
| unbinding | 用户取消 / 校验失败 | bound | 无变更 |
| bound | refresh 失败或身份被第三方删除 | unavailable | 不计入可用方式（§5.4） |
| unavailable | 重授权同一 subject | bound | 复用原 `identity_id` |

所有迁移带旧状态做乐观锁（`where status = :expected`）；并发重复提交返回当前状态，不抛冲突错误。

### 2.3 解绑前置条件

| 条件 | 不满足时 |
| --- | --- |
| 会话有效，5 分钟内做过 step-up，且账户不在 `locked` / `pending_deletion` | 要求重新验证，或先结束恢复 / 取消删除 |
| 可用登录方式 ≥ 2（计数见 §2.4） | 拒绝，文案与现有 modal 一致 |
| 不是恢复流程的唯一凭证，且没有进行中的 `unbinding` | 前者引导走恢复（§3.4），后者幂等返回当前状态 |

解绑**只移除该登录入口**，不删账户、不删 App 内容（`identitiesPanel()` 的 `small-info` 已是此说法，保持）。解绑后是否给 7 天「用原身份找回原账户」的反悔窗口：**建议不做**（等于给被解绑的身份留一条重占通道），待负责人确认。

### 2.4 最后一种登录方式保护

计数 `enabled = count(identities where status='bound' 且 provider 当前可用)`，`unavailable`/`verifying`/`unbound` 都不计。`enabled <= 1` 时禁止解绑：前端置灰 + `aria-disabled`，后端同样返回 `409 LAST_LOGIN_METHOD`——不能只靠 UI（现有 `countBindings()<=1` 的判断要改成正例，即「解绑后可用数 ≥1 才允许」）。例外：删除账户（§7）与人工恢复（§3.4）由受控流程处理，且恢复成功必须先建新方式再释放旧方式，不允许零方式账户。兜底：最后一种方式变 `unavailable` 时不是「解绑」，而是进入恢复流程并通知主邮箱。

## 3. 验证与恢复

### 3.1 邮箱验证码

| 项 | 规则 |
| --- | --- |
| 形态 | 6 位数字，一次性，10 分钟有效 |
| 存储 | 只存 HMAC(码, 服务端密钥)，不写明文、不进日志 |
| 尝试 / 限流 | 单 challenge ≤5 次；单邮箱 60 秒一条、每小时 5 条；单 IP 每小时 20 条（数值待确认） |
| 响应 / 邮件内容 | 不区分邮箱是否已注册，统一「如果这个地址可用，验证码已发送」；邮件只含验证码、用途、有效期，不含账户详情与带令牌的链接 |

首次通过验证即创建账户，并写入 `bound` 的 email 身份。演示版保持 `123456` 与 toast 文案不变；接入后删除硬编码（`send-code` 与 `email-login` 提交两处）。

### 3.2 二次验证（step-up）

TOTP（RFC 6238）+ 10 条一次性恢复码，开启时强制展示恢复码并要求确认「已保存」。触发：新设备首次登录、解绑身份、撤销全部会话、删除账户、恢复流程。未开 MFA 的账户要求在 5 分钟内重新验证任一登录方式（邮箱码即可），这是首版最小门槛。首版是否上线 TOTP：**待负责人确认**，建议首版只做邮箱 step-up，TOTP 二期，避免恢复码成为新的丢失点。

### 3.3 「忘记密码」

KyFold **没有密码**，登录页不应出现密码字段（现在也没有），因此不存在忘记密码流程；等价问题是「某种登录方式失效」，走 §3.4。若未来加密码：邮件重置 + 撤销全部会话 + 通知——是否要做待负责人确认。

### 3.4 失去所有登录方式的恢复

触发任一：所有身份 `unavailable`、主邮箱不可收信、怀疑身份被他人控制。

**通道 A · 恢复码（自助）**：登录页「无法登录？」→ 输入曾用主邮箱与 1 条未使用的恢复码 → 通过后只能**新增**一种登录方式（邮箱发码或走一次 OAuth），不能直接进账户中心 → 成功后强制撤销全部旧会话、确认新主邮箱，观察期内限制删除账户与再次解绑（天数待确认）。

**通道 B · 人工核验（兜底）**：工单收集账户创建月份、曾绑定 provider 与 `display_hint`、任一历史设备的 `device_label` 与最后使用月份、可收信地址；证据至少两类且至少一类不依赖邮箱（例如在同一 GitHub 账户 fork 指定仓库或公开约定字符串，证明对 `provider_subject` 的控制）；通过后管理员执行「置 `locked` → 撤销全部会话 → 允许新增一种方式 → 解除锁定」，全程写 `audit_events`，48 小时内向新邮箱发「账户已恢复」通知，目标 5 个工作日响应（是否对外承诺待确认）。

身份确认原则：**不单凭邮箱授予账户控制权**（邮箱被接管是最常见路径）；不接受截图作为唯一证据；恢复后的账户处于观察期，敏感操作受限。

## 4. 冲突处理

### 4.1 冲突场景

| 编号 | 场景 | 判定依据 |
| --- | --- | --- |
| C1 | 同一第三方身份已绑到另一个账户 | `(provider, subject)` 命中不同 `account_id` |
| C2 | 同一邮箱想注册第二个账户 | `email_norm` 已存在于另一 `active` 账户 |
| C3 | 同一账户内用另一 provider 绑同一邮箱 | 允许，同账户不构成冲突 |
| C4 | Apple 隐藏邮箱；大小写/空白不同的同一邮箱 | 前者`@privaterelay.appleid.com` 不作主邮箱、不参与 C2；后者规范化后相同即命中（§4.5） |

### 4.2 四条候选策略

| 策略 | 行为 | 代价 / 风险 |
| --- | --- | --- |
| **A. 拒绝并引导登录原账户** | 终止绑定，提示该身份已关联另一个账户，给出「改用该身份登录」按钮 | 用户可能不满；零数据风险 |
| B. 合并两个账户 | 双向验证后把身份、会话并入一个账户，另一个标 `merged` 留 30 天 | 不可逆；跨两个数据域迁移，工作量最大 |
| C. 转移单个身份 | 把该身份从原账户挪到当前账户 | **单方面夺取登录方式**；原账户可能只剩它，等于被掏空 |
| D. 需人工 | 提交工单，核验双方后仲裁 | 慢且要人力，但保留人道出口 |

### 4.3 推荐策略与理由

**默认 A；B 作为二期自助选项（必须双向验证）；C 不开放自助，只作为 D 的仲裁结果执行。**

1. `(provider, subject)` 是唯一强身份锚点，允许 C 等于让任何已登录会话就能搬走别人的登录方式。
2. 与既有承诺一致：`data` FAQ 已写明「身份统一不自动合并内容」，B 要同时触碰两个数据域，风险与承诺冲突。
3. 90% 的真实诉求是「我好像以前用这个注册过」，A 一步就能解决；A 也不需要迁移工具与回滚能力，能在最小服务端（§9）上先上线。
4. B 留给确实用了两个账户的人，但要求双方都完成登录 + step-up，并明确告知不可逆。

### 4.4 判断矩阵

| 条件 | 结果 |
| --- | --- |
| subject 已在当前账户 | 幂等成功，不报冲突 |
| subject 在别的账户：能登录原账户 / 坚持合并 | 前者引导登录原账户、不合并；后者提示「合并暂未开放」并收集工单（二期做 B） |
| 原账户 `pending_deletion` | 提示冷静期状态；冷静期内只能用原账户登录取消删除，不提供转移 |
| 原账户已 `deleted` 但身份行未清理 | 允许绑定，视为新身份（墓碑只防 ID 复用） |
| 双方证据齐全但一方无法登录 | 走 D，人工仲裁后按 C 执行并留审计 |

### 4.5 邮箱规范化

存 `email_raw`（原样，用于展示与回信）+ `email_norm`（比较键），**展示永远用 raw**。步骤：去首尾与内部空白 → 域转小写并按 IDN 规则转 punycode → 本地部分转小写 → 不做其他「智能」改写。

- 大小写：v1 采用**全小写比较**（大小写不敏感）。取舍：极少数大小写敏感的自建邮件服务器会把两个不同地址判成同一个，这是为「同一个人不会开两个账户」接受的已知风险。
- 不做 `+tag` 去重（`a+x@example.com` 与 `a@example.com` 视为**不同**地址，否则可能把别人的地址合并进来）；不做点号去重（Gmail 忽略点号，推广到所有域会误合并）；别名映射留 `email_alias_map` 配置表，v1 只考虑 `googlemail.com → gmail.com`，`icloud.com/me.com/mac.com` 交给 Apple OAuth 不启用，googlemail 是否启用待负责人确认。
- 同一邮箱对应多个身份是**正常情况**（GitHub 已验证该邮箱 + email 身份），不触发合并；只有「要创建第二个账户」时才按 C2 处理。

## 5. 重复绑定与授权失败

### 5.1 幂等

绑定/解绑/撤销/删除请求带 `Idempotency-Key`（客户端 UUID），24 小时内同 key 返回首次结果；数据库层用 §1.3 的部分唯一索引兜底，重复写入变成「读回当前状态」；重复回调（刷新回调页、浏览器重放）见 `oauth_states.consumed_at` 已存在就不换 token，直接返回「已完成」，不重复发通知、不重复写审计。前端提交后禁用按钮 + `aria-busy`，但服务端不能依赖这一点。

### 5.2 state / CSRF / PKCE

| 检查 | 失败处理 |
| --- | --- |
| `state` 存在、`consumed_at is null`、未过期（10 分钟） | 400，不换 token；过期提示重新开始 |
| `state.session_id` 与当前会话一致 | 400，按 CSRF 记审计 |
| PKCE `code_verifier` 与 challenge 匹配 | 400 |
| 方法符合服务商（GitHub/Google `GET`，Apple `form_post` 用 `POST`） | 其他方法 405 |

实现注意：Apple 用 `response_mode=form_post`，跨站 POST **不会**携带 `SameSite=Lax` 的会话 cookie，所以第一关必须只依赖一次性 `state` 行本身，必要时再配 `SameSite=None; Secure` 的短生命周期 cookie。这条最容易踩坑，已列入 §10 的 A 组。

### 5.3 授权失败 / 被拒

| 情况 | 用户看到 | 系统动作 |
| --- | --- | --- |
| 用户取消 → `error=access_denied` | 「已取消授权，没有做任何更改」 | 清理 `oauth_states`，不写 identities、不发邮件 |
| `state` 不匹配/过期；服务商 5xx 或网络失败 | 前者「授权已超时，请重新开始」；后者「暂时无法完成，请稍后再试」 | 前者 400 + 审计；后者保留可重试入口，不落 `pending_verify` |
| scope 不足（拿不到邮箱） | 允许绑定但标记「未获取邮箱」 | 不参与主邮箱与 C2 判定 |

### 5.4 token 撤销与身份失效

检测：刷新时报 `invalid_grant`/`revoked`，或低频健康检查发现长期失败。处理：置 `status='unavailable'`，列表显示「需要重新验证」+「重新绑定」，不计入可用方式（可能触发 §2.4 兜底）；不自动删行，保留 `provider_subject`，重授权同一 subject 时归位到原 `identity_id`，90 天未恢复再清理；若账户因此没有任何可用方式，强制恢复流程并通知主邮箱（仍可收信时）。

## 6. 设备会话撤销

列表字段：`device_label`、`platform`（Web / iPhone / iPad / Mac）、`app`、`last_seen_at`、是否当前会话；对应 `securityPanel()` 现有两行示例的结构。单设备撤销 `POST /account/sessions/:id/revoke` → 写 `revoked_at`、`revoke_reason=user_single`，该 refresh 家族失效；全部撤销 `POST /account/sessions/revoke-all`，默认保留当前会话（另提供「包括当前设备」），要求 5 分钟内 step-up。生效边界要说清：**refresh 立即失效**，已签发的 access token 短期（≤15 分钟）仍可用，所以高风险接口要重新校验会话状态，不能只信 access token 里的自包含声明。

refresh 一次一换、旧值立即失效；检测到旧值重放 → 撤销整个家族、标 `reuse_detected`、强制重新登录并发安全通知。撤销后该设备下次刷新收到 401 → 清本地令牌 → 跳登录页并提示「此设备已被移除，请重新登录」，不要提示「密码错误」。撤销会话不减少可用登录方式；删光会话也不能成为绕过解绑限制的理由。

## 7. 删除账户与数据隔离

### 7.1 流程

1. 「设备与安全」新增「删除账户」入口，需二次确认 + step-up；确认页按域列出将删除的内容与不可恢复提示，并引导先导出（§7.4）。
2. 提交后立即：撤销全部会话、`status='pending_deletion'`、`purge_after = now + 冷静期`、写 `deletion_queue`。
3. 冷静期内任一未解绑身份登录 → 进入「取消删除」页，可恢复 `active`。
4. 到期后队列按域清理（`purging → done`）；失败重试 3 次后 `failed` 并告警（人工处理），账户保持不可登录。

**冷静期建议 30 天**（可配置 30–90 天）→ 待负责人确认。

### 7.2 状态机

| 当前 | 事件 | 下一状态 | 说明 |
| --- | --- | --- | --- |
| active | 申请删除 | pending_deletion | 会话全撤，登录提示「账户正在删除」 |
| pending_deletion | 用户登录并取消 | active | 恢复账户，会话需重新建立 |
| pending_deletion | 到期 | purging | 队列按域清理 |
| purging | 全部域完成 / 失败 | done / failed | 前者账户行转墓碑；后者告警 + 人工重试 |

### 7.3 两个 App 的内容

| 范围 | 处理 | 备注 |
| --- | --- | --- |
| 账户域 | 删 identities / sessions / 偏好 / 恢复码 | 保留墓碑与最小审计字段 |
| KyRemote | 撤销 Mac 配对、删 workspace 映射、设备授权、任务上下文 | 要通知 Mac 端「已解除」，不能只删服务端记录 |
| 课堂助手 | 删录音、转写、提问与标注 | 体积最大也最敏感；删除前单独提示可导出 |
| Color Studio | 无需处理 | 本地文件，与账户无关 |
| 备份 | 不可即时清除 | 轮转备份 ≤30 天内自然过期，需在隐私说明里写明 |

### 7.4 导出数据

范围：昵称、登录方式列表（provider + hint，不含 token）、会话列表、两个 App 的用户内容、偏好；格式 `JSON` + 媒体原文件打包；24 小时内生成，链接 7 天有效、一次性；排除他人数据、安全凭据、内部审计日志与风控标记；冷静期内仍可导出，`purging` 开始后不可。

### 7.5 删除时如何解绑第三方

对每个 `bound` 身份调用服务商 revoke（Google `/revoke`、GitHub token revoke）；Apple 没有用户级注销接口 → 提示用户到 Apple ID 的「使用 Apple 登录」中手动移除。revoke 失败不阻塞删除，记 `last_error` 并重试 3 次，失败项进告警清单。是否默认主动回删第三方授权：**建议默认勾选、允许取消**，待负责人确认。

### 7.6 队列要点

幂等键 `account_id + stage`，重复投递不产生二次删除；每域独立事务，失败可单独重试，不强求全局事务；保留 `job_id` 与时间线 180 天供问询与合规举证；队列失败绝不能让账户回到 `active`。

## 8. 隐私与合规要点

### 8.1 最小化收集

| 收 | 不收 |
| --- | --- |
| 邮箱、provider subject、昵称 | 真实姓名、手机号、生日、住址 |
| 设备标签、UA 哈希、登录时间 | 通讯录、相册、广告标识符 |
| IP 网段前缀（短期）、必要审计事件 | 精确位置、持续 IP 日志、明文验证码与 token |

### 8.2 保留期限（建议）

| 数据 | 期限 |
| --- | --- |
| 会话记录 / 验证码 / oauth_state | 会话：撤销后 30 天、最长活跃 90 天；验证码与 oauth_state：10 分钟，消费即作废 |
| 未绑定身份行 / 审计日志 / 删除任务 / 备份 | 90 天 / 180 天 / 180 天 / 轮转 30 天 |

### 8.3 日志脱敏与用户权利

邮箱一律掩码（`a***@example.com`）；日志不打印 `provider_subject`、`code`、`token`、`state`；前端与服务端的错误上报都要去掉 query string（回调 URL 里带 `code`/`state`）；不做第三方行为分析埋点、不接广告 SDK，错误监控只收堆栈与请求 ID；后台查看用户数据需工单号，操作进审计。

用户可访问、更正、导出、删除、撤回同意，响应时限按适用法域（**待负责人确认**，默认 30 天答复）。课堂场景涉及录音，需单独告知「何时在录、存在哪、保留多久」，与产品页面口径一致。

## 9. 接入前提（本阶段明确不接入）

- **暂不接入真实 OAuth。** 官网保持 `localStorage` 演示：`identitiesPanel()` 的绑定仍是本地布尔翻转，`loginDemo()` 不产生网络请求。相关 UI 继续标「演示 / 设计中」，不得出现「已登录」「已绑定真实账户」类表述。
- 接入前必须由负责人指定：① 服务商与具体应用（GitHub OAuth App、Google Cloud OAuth Client、Apple Developer Services ID）；② 生产回调地址（如 `https://<域名>/oauth/:provider/callback`）与获批 scope；③ 密钥存放位置（服务端环境变量或密钥服务），**不得进入仓库**；④ 邮件发送服务商与其隐私条款。密钥规则：`.env*` 必须被忽略——当前 `.gitignore` 只有 `.DS_Store`/`Thumbs.db`/`*.zip`，**缺 `.env` 规则**，接入前先补；CI 用 secret；泄露即轮换并撤销旧凭据；日志与错误上报不得回显。
- 静态托管（GitHub Pages）**无法**承载 OAuth 回调、密钥保管与邮件发送，这是当前站点形态的硬限制，接入必须另起服务端；服务端最小需求：accounts/identities/sessions 三张表 + 删除队列（定时任务、幂等）+ 邮件（验证码与安全通知、退信处理、限流）+ HTTPS 与 state/PKCE 校验、限流、审计 + 备份与告警通道。具体部署形态待负责人确认。

## 10. 上线前测试清单

| ID | 场景 | 预期 |
| --- | --- | --- |
| R1 | 恢复码正确 / 已用过 / 连错 5 次 | 成功、拒绝、锁定并提示 |
| R2 | 人工恢复完成后 | 全部会话已撤销、进入观察期、敏感操作受限；中途解绑被拒 |
| U1 | 正常解绑 / 最后一种方式解绑（UI 与直接调接口） | 前者 `unbound`、计数减一、收到通知；后者均拒绝，`409 LAST_LOGIN_METHOD` |
| U2 | 解绑后用该身份重新登录 | 新建账户或提示未绑定，**不**回到原账户 |
| U3 | 第三方 revoke 超时 | 本地仍解绑成功，记录告警 |
| D1 | 回调页刷新两次 / 双击「绑定」/ 同 `Idempotency-Key` 重放 | 幂等，无重复身份行与邮件、只发起一次授权、返回首次结果 |
| A1 | 用户在授权页取消 | 无任何写入，提示「已取消」 |
| A2 | 篡改 `state` / 超 10 分钟 / 另一会话 / PKCE 失败 | 400，按 CSRF 记审计，不换 token |
| A3 | 服务商 5xx、超时、Apple `form_post` 无 Lax cookie | 可重试且无残留；Apple 仅凭 `state` 行通过校验 |
| L1 | 只剩 email 方式 / 最后一种变 `unavailable` | 前者解绑禁用；后者进入恢复流程并通知 |
| C1 | subject 已绑到另一账户 | 默认拒绝，提示不含对方邮箱 |
| C2 | 同邮箱注册第二个账户 / Apple 隐藏邮箱 | 前者拒绝并引导登录原账户；后者不参与冲突判定 |
| P1 | 两个浏览器同时解绑同一身份 | 一个成功、另一个得到当前状态；revoke 只调用一次 |
| P2 | 两个浏览器同时绑定同一新身份 | 只有一条身份行，另一条幂等成功 |
| P3 | 一边删除账户、一边绑定 | 删除优先，绑定返回账户已删除 |
| S1 | 撤销单设备 / 撤销全部（不含当前） | 目标设备 refresh 立即失效，其他与当前会话不受影响 |
| S2 | 重放旧 refresh token | 整个家族撤销 + 安全通知 |
| X1 | 冷静期内登录并取消删除 / 硬删除后登录 | 前者恢复 `active`；后者无账户按新用户处理 |
| X2 | 删除后检查 KyRemote 与导出链接 | Mac 配对已解除并通知；过期链接需重新申请 |
| E1 | 邮箱大小写 / 前后空白 / `+tag` | 前者命中同一账户，`+tag` 视为不同账户 |
| W1 | 文案扫描 / 深色模式与键盘可达 | 无「已登录 / 已绑定真实账户」、无密钥价格日期；新增区块不回归 |

## 11. `#/account-about` 最终文案

按 `accountIntro()` 现有结构（`identity-hero` → `account-explainer` → `process-section` → `account-faq-block` → `detail-status`）给可直接替换的中文段落。语气沿用站点：短句、克制、不承诺未完成的能力；所有区块保留「设计预览 / 演示」标记。

### 11.1 首屏（替换 `identity-hero`）

**eyebrow** `KYFOLD 账户`　**h1** `入口，可以有很多。`／`你，始终是同一个。`　**正文** `把熟悉的登录方式，关联到同一个 KyFold 身份。`／`使用不同的工具时，也有一个共同的账户入口。`　**按钮** 保持现有逻辑（未演示登录时「体验账户登录」，已演示登录时「进入账户中心」）；次按钮「体验账户中心」。**图注** `统一账户设计预览 · 尚未连接真实第三方账户`

### 11.2 统一 ID（新增一节，建议接在 `account-explainer` 之后）

**标题** `一个账户，一个身份。`　**正文** `KyFold 账户是你在 KyFold 里的身份。GitHub、Google、Apple 和邮箱，是进入这个身份的不同入口。`
**要点** `一个账户一个 ID`：无论用哪种方式登录，进入的都是同一个账户；`身份不等于内容`：账户统一，不会把 KyRemote 和课堂助手的内容混在一起；`各管各的权限`：远程设备授权、课堂记录和账户资料，分别管理。**小字** `以上为设计说明，当前页面不会创建真实账户。`

### 11.3 绑定与解绑

**标题** `先确认身份，再添加入口。`　**正文** `新增登录方式时，会先验证对应的第三方账户或邮箱，确认属于同一个人，再关联到当前账户。解绑只移除这个入口，不会删除账户，也不会删除任何 App 里的内容。`
**要点** `绑定需要验证`：授权完成后回到 KyFold，验证通过才会生效；`至少保留一种方式`：账户至少要有一个可用的登录入口，最后一种不能解绑；`操作有记录`：新增和解绑都会留下记录，并通过已绑定的邮箱告知你。

### 11.4 验证与恢复

**标题** `进不来的时候，也有路。`　**正文** `邮箱验证码用于登录与关键操作；重要操作之前会再确认一次身份。如果某一种登录方式失效，可以用另一种进入账户。`
**要点** `邮箱验证码`：六位数字，十分钟内有效，用过即失效；`关键操作再确认`：解绑、撤销设备、删除账户之前，会再验证一次；`失去所有方式`：可以使用预留的恢复码，没有恢复码时提交申请，由人工核验后处理。**小字** `恢复流程不会只凭一个邮箱地址就交出账户。`

### 11.5 冲突处理

**标题** `同一个身份，只能属于一个账户。`　**正文** `如果要绑定的 GitHub、Google 或 Apple 身份已经关联了另一个 KyFold 账户，我们不会自动合并或转移，也不会显示那个账户的信息。页面会提示你先用原来的方式登录，进入原本的账户后再管理。`
**要点** `不自动合并`：两个账户的内容不会被拼在一起；`不悄悄转移`：登录方式不会从一个账户被搬到另一个账户；`有疑问可以申请`：确实需要处理时，通过人工核验后按流程处理。

### 11.6 设备与安全

**标题** `在哪里登录过，看得见。`　**正文** `账户里会列出登录过的设备和会话。你可以移除某一台设备，也可以一次性退出其他所有设备；被移除的设备需要重新登录。`
**要点** `逐台查看`：设备、来源 App 和最近使用时间；`单独移除`：只影响那一台设备；`全部退出`：发现异常时一次处理，当前设备可以保留。

### 11.7 删除账户

**标题** `删除，是真的删除。`　**正文** `删除账户会先进入一段冷静期，期间可以取消。冷静期结束后，账户资料、登录方式和两个 App 中的数据会按各自的范围清理，且无法恢复。删除前可以先导出自己的数据。`
**要点** `先导出再删除`：导出包含账户资料与产品内容；`冷静期内可取消`：用任一未解绑的方式登录即可取消；`第三方授权一并解除`：能主动撤销的会撤销，Apple 需要你在系统设置里移除。

### 11.8 当前状态（替换 `detail-status`）

**标题** `现在的这一步。`　**正文** `这份页面是统一账户的设计预览。登录、绑定、设备和解绑都是演示，不会验证身份，不会连接 Google、GitHub 或 Apple，也不会同步任何数据。`
**小字** `真实账户需要服务端、邮件发送与授权配置，这些还没有接入。`　**按钮** `体验账户中心`；次级链接 `返回帮助中心`。

### 11.9 FAQ 替换（沿用现有 id，可新增 `conflict`）

- `identity`：`一个 KyFold 账户，和多个登录方式是什么关系？` → `KyFold 账户是你的身份，GitHub、Google、Apple 或邮箱是不同的入口。它们进入同一个账户，但不会因此共享各 App 的内容。`
- `binding`：`绑定与解绑是怎么做的？` → `先登录 KyFold，再在“登录与绑定”里验证并添加一种方式；解绑要验证身份，并且账户至少保留一种可用的登录方式。当前预览仍是模拟，不会连接真实账户。`
- `data` / `conflict`：前者 → `不会。身份统一只解决“你是谁”，远程设备授权、课堂记录和使用权限分别管理。`；后者 → `不会自动合并或转移。页面会提示你改用原本的方式登录，进入原来的账户；确实需要处理时再走人工核验。`

文案禁区：不得出现「已登录」「已绑定真实账户」「已连接 Google/GitHub/Apple」；不得出现任何 client id、secret 或带敏感参数的回调地址；不得虚构价格、发布日期、下载地址、合作方；不得承诺未经确认的能力（如「支持双因素」「支持 20 台设备」），只描述设计方向。

## 12. 待负责人确认（汇总）

| # | 问题 | 建议 |
| --- | --- | --- |
| 1 | 服务端形态与部署位置（静态托管接不了回调） | 先定一台可控主机 + SQLite/Postgres |
| 2 | 删除冷静期天数 | 30 天 |
| 3 | 是否首版上线 TOTP | 首版只做邮箱 step-up |
| 4 | 同账户是否允许同 provider 两条身份 | v1 不允许 |
| 5 | 是否启用 `googlemail.com → gmail.com` 映射 | 暂不启用 |
| 6 | 解绑后是否给 7 天反悔窗口 | 不做 |
| 7 | 删除时是否默认回删第三方授权 | 默认勾选 |
| 8 | 人工恢复响应时限与证据清单 | 5 个工作日、两类证据 |
| 9 | 隐私声明适用法域与答复时限 | 30 天 |
