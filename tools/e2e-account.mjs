#!/usr/bin/env node
// KyFold 账户服务端到端验证（零依赖，只用 Node 内置模块 + 全局 fetch）
//
//   node tools/e2e-account.mjs
//
// 做什么：
//   1. 用**随机空闲端口** + 临时 SQLite（/tmp/kyfold-e2e-<pid>.db）拉起
//      /Users/thy/Agent/KyFold/account 的真实服务（NODE_ENV=test + capture 邮件 + devCode 回显），
//      轮询 /api/health 等就绪（30s 超时）。
//   2. 手写 cookie jar + CSRF double-submit：Node 的 fetch 不会自动存取 Cookie，
//      所以自己解析 Set-Cookie（用 headers.getSetCookie()），写请求带 X-CSRF-Token。
//   3. 跑 9 组真实场景，逐条打印 PASS / FAIL，末尾汇总；任何 FAIL → 退出码 1。
//   4. 无论成功失败（含 Ctrl-C），结束前杀掉服务进程组并清理临时 DB 与邮件捕获文件。
//
// 不修改账户服务仓库的任何文件，只运行它。端口随机，绝不占用 8797。
//
// 覆盖场景：
//   1) 发码 sign-in → devCode 登录 → GET /api/me（user + email-otp 方式）
//   2) PATCH /api/me 改昵称 → 再读一致
//   3) GET /api/me/sessions 至少 1 个且恰好一个 current
//   4) 新会话 reauth：send-otp purpose=reauth → POST /api/auth/reauth → 204；错误验证码 → 400
//   5) GET /api/me/export 是 JSON，且不含 access_token / refresh_token
//   6) 解绑 email-otp → 409 LAST_LOGIN_METHOD
//   7) 注销：错误确认串 → 400 ACCOUNT_DELETE_CONFIRMATION_REQUIRED
//   8) CSRF：不带 X-CSRF-Token 的 POST → 403 CSRF_FAILED
//   9) Origin 白名单：Origin: http://evil.example 的 POST → 403 ORIGIN_NOT_ALLOWED
//  10) 注销成功 → 202；之后 GET /api/me → 401
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';

// ---------------------------------------------------------------- 常量

const ACCOUNT_DIR = '/Users/thy/Agent/KyFold/account';
const DB_PATH = `/tmp/kyfold-e2e-${process.pid}.db`;
const RESERVED_PORT = 8797; // Lead 的调试服务常驻，必须避开
const READY_TIMEOUT_MS = 30_000;

const STATE_CHANGING = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- 端口

function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const address = srv.address();
      const port = typeof address === 'object' && address !== null ? address.port : 0;
      srv.close(() => resolve(port));
    });
  });
}

async function pickPort() {
  for (let i = 0; i < 10; i++) {
    const port = await findFreePort();
    if (port !== RESERVED_PORT) return port;
  }
  throw new Error(`找不到可用端口（已避开 ${RESERVED_PORT}）`);
}

// ---------------------------------------------------------------- 服务生命周期

let child = null;
let childLogs = '';
let childExit = null;

function appendLog(chunk) {
  childLogs += chunk;
  if (childLogs.length > 200_000) childLogs = childLogs.slice(-200_000);
}

function tailLogs(lines = 40) {
  return childLogs.trimEnd().split('\n').slice(-lines).join('\n');
}

/** 清理临时 DB、WAL/SHM、capture 邮件文件 */
function cleanupFiles() {
  for (const suffix of ['', '-wal', '-shm', '.mailbox.jsonl']) {
    try {
      rmSync(`${DB_PATH}${suffix}`, { force: true });
    } catch {
      /* 尽力而为 */
    }
  }
}

async function stopService() {
  const proc = child;
  child = null;
  if (!proc || proc.exitCode !== null || proc.signalCode !== null) return;
  try {
    process.kill(-proc.pid, 'SIGTERM'); // detached: true → 整组回收
  } catch {
    try {
      proc.kill('SIGTERM');
    } catch {
      /* 已退出 */
    }
  }
  const exited = await Promise.race([
    new Promise((r) => proc.once('exit', () => r(true))),
    sleep(3_000).then(() => false),
  ]);
  if (!exited) {
    try {
      process.kill(-proc.pid, 'SIGKILL');
    } catch {
      try {
        proc.kill('SIGKILL');
      } catch {
        /* ignore */
      }
    }
    await Promise.race([new Promise((r) => proc.once('exit', r)), sleep(2_000)]);
  }
}

async function startService() {
  const port = await pickPort();
  const baseUrl = `http://127.0.0.1:${port}`;

  // 从父进程继承环境，但剥掉所有可能污染结果的 KYFOLD_* / OAuth 凭证
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (/^(KYFOLD_|GITHUB_|GOOGLE_|APPLE_)/.test(key) || ['PORT', 'HOST', 'NODE_ENV'].includes(key)) {
      delete env[key];
    }
  }
  Object.assign(env, {
    NODE_ENV: 'test',
    HOST: '127.0.0.1',
    PORT: String(port),
    KYFOLD_BASE_URL: baseUrl,
    KYFOLD_ALLOWED_ORIGINS: baseUrl,
    KYFOLD_DB_PATH: DB_PATH,
    // 48 字符随机密钥（base64url(36 字节) == 48 字符）
    KYFOLD_SECRET: randomBytes(36).toString('base64url'),
    KYFOLD_MAIL_TRANSPORT: 'capture',
    KYFOLD_OTP_DEV_ECHO: '1',
  });

  cleanupFiles();

  const proc = spawn('node', ['src/server.ts'], {
    cwd: ACCOUNT_DIR,
    env,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child = proc;
  childExit = null;
  proc.stdout?.setEncoding('utf8');
  proc.stderr?.setEncoding('utf8');
  proc.stdout?.on('data', (c) => appendLog(c));
  proc.stderr?.on('data', (c) => appendLog(c));
  proc.once('exit', (code, signal) => {
    childExit = { code, signal };
  });
  proc.once('error', (err) => appendLog(`[spawn error] ${err.message}\n`));

  const healthUrl = new URL('/api/health', baseUrl).toString();
  const deadline = Date.now() + READY_TIMEOUT_MS;
  let lastNote = '(未收到任何响应)';
  while (Date.now() < deadline) {
    if (childExit) {
      throw new Error(
        `服务进程在就绪前退出（code=${childExit.code} signal=${childExit.signal}）\n` +
          `--- 子进程日志（尾部）---\n${tailLogs() || '(空)'}`,
      );
    }
    try {
      const res = await fetch(healthUrl, { signal: AbortSignal.timeout(2_000) });
      const body = await res.json().catch(() => null);
      if (res.status === 200) return { baseUrl, port };
      if (res.status === 503) {
        // 契约 1 节：503 = DB 打不开的降级态。对 e2e 来说等于不可用，直接失败。
        throw new Error(
          `服务进入降级模式（/api/health 503）：${JSON.stringify(body)}\n` +
            `--- 子进程日志（尾部）---\n${tailLogs() || '(空)'}`,
        );
      }
      lastNote = `GET /api/health 返回 ${res.status}`;
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('服务进入降级模式')) throw err;
      lastNote = err instanceof Error ? err.message : String(err);
    }
    await sleep(100);
  }
  throw new Error(
    `服务启动超时（${READY_TIMEOUT_MS}ms）。最后状态：${lastNote}\n` +
      `--- 子进程日志（尾部）---\n${tailLogs() || '(空)'}`,
  );
}

// ---------------------------------------------------------------- Cookie / 响应

/**
 * 解析单个 Set-Cookie。value 里可能有 '='（base64url 填充），只按第一个 '=' 切。
 * 返回 null 表示这条 header 不可用。
 */
function parseSetCookie(raw) {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  const semi = raw.indexOf(';');
  const head = semi === -1 ? raw : raw.slice(0, semi);
  const eq = head.indexOf('=');
  if (eq <= 0) return null;
  const name = head.slice(0, eq).trim();
  const value = head.slice(eq + 1).trim();
  if (!name) return null;

  let maxAge = null;
  let expires = null;
  if (semi !== -1) {
    for (const attr of raw.slice(semi + 1).split(';')) {
      const t = attr.trim();
      const i = t.indexOf('=');
      if (i === -1) continue;
      const key = t.slice(0, i).trim().toLowerCase();
      const val = t.slice(i + 1).trim();
      if (key === 'max-age') {
        const n = Number(val);
        maxAge = Number.isFinite(n) ? n : null;
      } else if (key === 'expires') {
        expires = val;
      }
    }
  }
  return { name, value, maxAge, expires };
}

function cookieIsDead(cookie) {
  if (cookie.maxAge !== null && cookie.maxAge <= 0) return true;
  if (cookie.expires) {
    const t = Date.parse(cookie.expires);
    if (Number.isFinite(t) && t <= Date.now()) return true;
  }
  return false;
}

function truncate(text, max = 600) {
  const s = typeof text === 'string' ? text : JSON.stringify(text);
  return s && s.length > max ? `${s.slice(0, max)}…` : s;
}

function describe(res) {
  return `${res.method} ${res.url} → ${res.status}\n  body=${truncate(res.text) || '(空)'}`;
}

// ---------------------------------------------------------------- 测试客户端

/**
 * 手写 cookie jar + CSRF 的极简客户端。
 * 语义跟 tests/helpers/client.ts 对齐：写请求默认带 Origin 和 X-CSRF-Token，
 * 遇到 CSRF_FAILED 自动重取一次 token 重试（token 轮换时不至于误红）。
 */
function createClient(baseUrl) {
  const jar = new Map();
  let csrfToken = null;

  function storeCookies(setCookieList) {
    for (const raw of setCookieList ?? []) {
      const cookie = parseSetCookie(raw);
      if (!cookie) continue;
      if (cookieIsDead(cookie) || cookie.value === '') jar.delete(cookie.name);
      else jar.set(cookie.name, cookie.value);
    }
  }

  function cookieHeader() {
    return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }

  async function ensureCsrf(force = false) {
    if (!force && typeof csrfToken === 'string' && csrfToken !== '') return csrfToken;
    const res = await sendOnce('GET', '/api/csrf', {}, true);
    if (res.status !== 200 || !res.body || typeof res.body.token !== 'string') {
      throw new Error(`取不到 CSRF token（GET /api/csrf 应返回 200 {token}）\n  ${describe(res)}`);
    }
    csrfToken = res.body.token;
    return csrfToken;
  }

  async function sendOnce(method, path, options, isRetry) {
    const upper = method.toUpperCase();
    const url = new URL(path, baseUrl).toString();
    const headers = { Accept: 'application/json' };

    if (options.origin !== null) headers.Origin = options.origin ?? baseUrl;

    let bodyText;
    if (options.body !== undefined) {
      bodyText = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      headers['Content-Type'] = 'application/json';
    }

    if (STATE_CHANGING.has(upper) && options.csrf !== false) {
      headers['X-CSRF-Token'] = await ensureCsrf(isRetry);
    }
    if (options.headers) Object.assign(headers, options.headers);

    const cookie = cookieHeader();
    if (cookie) headers.Cookie = cookie;

    const res = await fetch(url, {
      method: upper,
      headers,
      body: bodyText,
      redirect: 'manual',
      signal: AbortSignal.timeout(20_000),
    });

    const setCookie =
      typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [];
    storeCookies(setCookie);

    const text = await res.text();
    const contentType = res.headers.get('content-type') ?? '';
    let body = text;
    if (contentType.includes('json')) {
      try {
        body = text === '' ? null : JSON.parse(text);
      } catch {
        body = text;
      }
    }

    const out = { method: upper, url, status: res.status, headers: res.headers, body, text };

    // token 轮换时自动重试一次；负向用例用 csrf:false 进入，不会走到这里
    if (
      !isRetry &&
      options.csrf !== false &&
      out.status === 403 &&
      body &&
      body.error &&
      body.error.code === 'CSRF_FAILED'
    ) {
      return sendOnce(upper, path, options, true);
    }
    return out;
  }

  return {
    jar,
    baseUrl,
    request: (method, path, options = {}) => sendOnce(method, path, options, false),
    get: (path, options = {}) => sendOnce('GET', path, options, false),
    post: (path, body, options = {}) => sendOnce('POST', path, { ...options, body }, false),
    patch: (path, body, options = {}) => sendOnce('PATCH', path, { ...options, body }, false),
  };
}

// ---------------------------------------------------------------- 断言

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function expectStatus(res, expected, label) {
  if (res.status !== expected) {
    throw new Error(`${label}：期望 HTTP ${expected}，实际 ${res.status}\n  ${describe(res)}`);
  }
}

function expectErrorCode(res, spec, label) {
  const statuses = Array.isArray(spec.status) ? spec.status : [spec.status];
  if (!statuses.includes(res.status)) {
    throw new Error(
      `${label}：期望 HTTP ${statuses.join(' / ')}，实际 ${res.status}\n  ${describe(res)}`,
    );
  }
  const codes = Array.isArray(spec.code) ? spec.code : [spec.code];
  const actual = res.body && res.body.error ? res.body.error.code : undefined;
  if (!codes.includes(actual)) {
    throw new Error(
      `${label}：期望 error.code ∈ {${codes.join(', ')}}，实际 ${JSON.stringify(actual)}\n  ${describe(res)}`,
    );
  }
}

// ---------------------------------------------------------------- 结果收集

const results = [];

async function scenario(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`PASS  ${name}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    results.push({ name, ok: false, message });
    console.log(`FAIL  ${name}`);
    for (const line of message.split('\n')) console.log(`      ${line}`);
  }
}

// ---------------------------------------------------------------- 主流程

async function main() {
  console.log(`KyFold Account E2E —— 目标目录 ${ACCOUNT_DIR}`);
  const { baseUrl, port } = await startService();
  console.log(`服务已就绪：${baseUrl}（DB=${DB_PATH}）\n`);

  const email = `e2e-${Date.now()}-${randomBytes(3).toString('hex')}@example.com`;
  const state = { email, user: null };

  // 会话 A：主账号
  const a = createClient(baseUrl);

  // ---- 1) 发码 → 登录 → GET /api/me
  await scenario('发码 sign-in → devCode 登录 → GET /api/me（user + email-otp）', async () => {
    const send = await a.post('/api/auth/send-otp', { email, purpose: 'sign-in' });
    expectStatus(send, 202, 'POST /api/auth/send-otp');
    expect(
      send.body && typeof send.body.devCode === 'string' && send.body.devCode !== '',
      `send-otp 未回显 devCode（NODE_ENV=test + KYFOLD_OTP_DEV_ECHO=1 时应回显）\n  ${describe(send)}`,
    );

    const verify = await a.post('/api/auth/verify-otp', { email, otp: send.body.devCode });
    expectStatus(verify, 200, 'POST /api/auth/verify-otp');
    expect(
      verify.body && verify.body.user && typeof verify.body.user.id === 'string',
      `verify-otp 响应缺少 user.id\n  ${describe(verify)}`,
    );

    const me = await a.get('/api/me');
    expectStatus(me, 200, 'GET /api/me');
    expect(
      me.body && me.body.user && me.body.user.email === email,
      `GET /api/me 的 user.email 应为 ${email}，实际 ${JSON.stringify(me.body && me.body.user && me.body.user.email)}`,
    );
    const methods = Array.isArray(me.body.loginMethods) ? me.body.loginMethods : [];
    expect(
      methods.some((m) => m && (m.id === 'email-otp' || m.type === 'email-otp')),
      `loginMethods 应包含 email-otp，实际 ${JSON.stringify(methods.map((m) => m && (m.id || m.type)))}`,
    );
    state.user = me.body.user;
  });

  // ---- 2) PATCH 昵称
  await scenario('PATCH /api/me 改昵称 → 再读一致', async () => {
    const newName = `E2E 昵称 ${Date.now().toString().slice(-6)}`;
    const patch = await a.patch('/api/me', { name: newName });
    expectStatus(patch, 200, 'PATCH /api/me');
    expect(
      patch.body && patch.body.user && patch.body.user.name === newName,
      `PATCH 响应里的 name 应为 "${newName}"，实际 ${JSON.stringify(patch.body && patch.body.user && patch.body.user.name)}`,
    );
    const again = await a.get('/api/me');
    expectStatus(again, 200, 'GET /api/me（改昵称后）');
    expect(
      again.body && again.body.user && again.body.user.name === newName,
      `回读 name 应为 "${newName}"，实际 ${JSON.stringify(again.body && again.body.user && again.body.user.name)}（可能未持久化）`,
    );
  });

  // ---- 3) 会话列表
  await scenario('GET /api/me/sessions 至少 1 个且恰好一个 current', async () => {
    const res = await a.get('/api/me/sessions');
    expectStatus(res, 200, 'GET /api/me/sessions');
    const list = res.body && Array.isArray(res.body.sessions) ? res.body.sessions : null;
    expect(list !== null, `响应缺少 sessions 数组\n  ${describe(res)}`);
    expect(list.length >= 1, `sessions 至少应有 1 个，实际 ${list.length}`);
    const current = list.filter((s) => s && s.current === true);
    expect(
      current.length === 1,
      `应恰好有 1 个 current 会话，实际 ${current.length}（共 ${list.length} 个）`,
    );
  });

  // ---- 4) 新会话：reauth 正确码 204 / 错误码 400
  const b = createClient(baseUrl);
  await scenario('新会话 reauth：正确验证码 204，错误验证码 400', async () => {
    const send = await b.post('/api/auth/send-otp', { email, purpose: 'sign-in' });
    expectStatus(send, 202, 'POST /api/auth/send-otp（新会话登录）');
    const verify = await b.post('/api/auth/verify-otp', { email, otp: send.body.devCode });
    expectStatus(verify, 200, 'POST /api/auth/verify-otp（新会话登录）');
    expect(
      verify.body && verify.body.user && verify.body.user.id === state.user.id,
      `新会话应回到同一账号 ${state.user.id}，实际 ${JSON.stringify(verify.body && verify.body.user && verify.body.user.id)}`,
    );

    // 4.1 正确码 → 204
    const sendReauth = await b.post('/api/auth/send-otp', { email, purpose: 'reauth' });
    expectStatus(sendReauth, 202, 'POST /api/auth/send-otp（purpose=reauth）');
    expect(
      sendReauth.body && typeof sendReauth.body.devCode === 'string',
      `reauth 的 send-otp 未回显 devCode\n  ${describe(sendReauth)}`,
    );
    const ok = await b.post('/api/auth/reauth', { otp: sendReauth.body.devCode });
    expectStatus(ok, 204, 'POST /api/auth/reauth（正确验证码）');

    // 4.2 再用一条新验证码 + 错误值 → 400
    const sendReauth2 = await b.post('/api/auth/send-otp', { email, purpose: 'reauth' });
    expectStatus(sendReauth2, 202, 'POST /api/auth/send-otp（purpose=reauth，第二次）');
    const realCode = sendReauth2.body && sendReauth2.body.devCode;
    const wrongCode = realCode === '000000' ? '111111' : '000000';
    const bad = await b.post('/api/auth/reauth', { otp: wrongCode });
    expectErrorCode(
      bad,
      { status: 400, code: ['INVALID_OTP', 'OTP_EXPIRED', 'OTP_TOO_MANY_ATTEMPTS'] },
      'POST /api/auth/reauth（错误验证码）',
    );
  });

  // ---- 5) 导出
  await scenario('GET /api/me/export 是 JSON 且不含 access_token / refresh_token', async () => {
    const res = await b.get('/api/me/export');
    expectStatus(res, 200, 'GET /api/me/export');
    const contentType = res.headers.get('content-type') ?? '';
    expect(
      contentType.includes('json'),
      `导出响应 Content-Type 应为 JSON，实际 "${contentType}"\n  ${describe(res)}`,
    );
    expect(
      res.body !== null && typeof res.body === 'object',
      `导出响应不是可解析的 JSON\n  ${describe(res)}`,
    );
    expect(
      res.body.user && res.body.user.id === state.user.id,
      `导出里的 user.id 应为 ${state.user.id}，实际 ${JSON.stringify(res.body.user && res.body.user.id)}`,
    );
    expect(
      typeof res.body.formatVersion === 'number',
      `导出缺少 formatVersion\n  ${describe(res)}`,
    );
    for (const forbidden of ['access_token', 'refresh_token', 'accessToken', 'refreshToken']) {
      expect(!res.text.includes(forbidden), `导出内容不得包含 ${forbidden}（契约 6 节：不导出 token 原始值）`);
    }
  });

  // ---- 6) 解绑 email-otp → LAST_LOGIN_METHOD
  await scenario('解绑邮箱登录方式 → 409 LAST_LOGIN_METHOD', async () => {
    const res = await b.post('/api/me/unlink/email-otp', {});
    expectErrorCode(res, { status: 409, code: 'LAST_LOGIN_METHOD' }, 'POST /api/me/unlink/email-otp');
  });

  // ---- 7) CSRF：缺 X-CSRF-Token
  await scenario('CSRF：不带 X-CSRF-Token 的 POST → 403 CSRF_FAILED', async () => {
    const res = await b.post(
      '/api/auth/send-otp',
      { email: `csrf-probe-${Date.now()}@example.com`, purpose: 'sign-in' },
      { csrf: false },
    );
    expectErrorCode(res, { status: 403, code: 'CSRF_FAILED' }, 'POST /api/auth/send-otp（无 CSRF header）');
  });

  // ---- 8) Origin 白名单
  await scenario('Origin 白名单：Origin: http://evil.example 的 POST → 403 ORIGIN_NOT_ALLOWED', async () => {
    const res = await b.post(
      '/api/auth/send-otp',
      { email: `origin-probe-${Date.now()}@example.com`, purpose: 'sign-in' },
      { origin: 'http://evil.example' },
    );
    expectErrorCode(
      res,
      { status: 403, code: 'ORIGIN_NOT_ALLOWED' },
      'POST /api/auth/send-otp（跨站 Origin）',
    );
  });

  // ---- 9) 注销：错误确认串 → 400；正确 → 202；之后 /api/me → 401
  await scenario('注销：错误确认串 400 ACCOUNT_DELETE_CONFIRMATION_REQUIRED，正确 DELETE 202，之后 /api/me 401', async () => {
    const bad = await b.post('/api/me/delete', { confirmation: 'delete-me' });
    expectErrorCode(
      bad,
      { status: 400, code: 'ACCOUNT_DELETE_CONFIRMATION_REQUIRED' },
      'POST /api/me/delete（确认串错误）',
    );

    const ok = await b.post('/api/me/delete', { confirmation: 'DELETE' });
    expectStatus(ok, 202, 'POST /api/me/delete（确认串正确）');

    const after = await b.get('/api/me');
    expectStatus(after, 401, 'GET /api/me（注销后）');
  });
}

// ---------------------------------------------------------------- 入口

let stopping = false;
async function teardown() {
  if (stopping) return;
  stopping = true;
  await stopService();
  cleanupFiles();
}

process.on('exit', () => {
  // 同步兜底：进程异常退出时也要尽量把孩子带走
  if (child && child.pid) {
    try {
      process.kill(-child.pid, 'SIGKILL');
    } catch {
      /* ignore */
    }
  }
  cleanupFiles();
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    console.log(`\n收到 ${signal}，清理中…`);
    await teardown();
    process.exit(130);
  });
}

let exitCode = 0;
try {
  await main();
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.log(`\n致命错误：${message}`);
  if (childLogs.trim()) console.log(`--- 服务日志（尾部）---\n${tailLogs(60)}`);
  exitCode = 1;
} finally {
  await teardown();
}

const passed = results.filter((r) => r.ok).length;
const failed = results.length - passed;

console.log('\n===== 汇总 =====');
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}`);
console.log(`\n通过 ${passed} / ${results.length}${failed ? `，失败 ${failed}` : ''}`);

if (failed > 0) exitCode = 1;
process.exit(exitCode);
