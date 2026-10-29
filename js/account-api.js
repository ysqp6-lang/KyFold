/* KyFold · account-api.js
   账户服务客户端：CSRF、错误码、会话、登录、绑定、会话管理、导出与注销。
   零构建：普通 <script>，通过同源反代 `/api/*` 访问账户服务（见 tools/serve.mjs）。
   直接双击 index.html（file://）时没有可用的 API，页面必须显示「未连接账户服务」，不要伪造成功。 */
'use strict';

/* ---------------------------------------------------------------- 错误文案 */

const ACCOUNT_ERROR_TEXT = {
  BAD_REQUEST: '请求参数不合法，请检查后重试。',
  UNAUTHORIZED: '登录状态已失效，请重新登录。',
  FORBIDDEN: '当前账号无权执行该操作。',
  NOT_FOUND: '找不到对应的资源。',
  CONFLICT: '操作发生冲突，请刷新后重试。',
  RATE_LIMITED: '操作过于频繁，请稍后再试。',
  INTERNAL: '账户服务内部错误，请稍后再试。',
  PROVIDER_UNCONFIGURED: '该登录方式尚未配置，暂不可用。',
  NOT_IMPLEMENTED: '该功能暂未开放。',
  INVALID_OTP: '验证码不正确或已被使用。',
  OTP_EXPIRED: '验证码已过期，请重新获取。',
  OTP_TOO_MANY_ATTEMPTS: '该验证码尝试次数过多，请重新获取。',
  OTP_NOT_SENT: '还没有为该邮箱获取验证码，请先点击获取。',
  EMAIL_IN_USE: '该邮箱已被其他 KyFold 账号占用。',
  EMAIL_INVALID: '邮箱格式不正确。',
  PROVIDER_ALREADY_LINKED: '该第三方账号已绑定到其他 KyFold 账号，不能自动合并。',
  PROVIDER_ALREADY_LINKED_SELF: '该第三方账号已经绑定到当前账号。',
  PROVIDER_UNKNOWN: '未知的登录方式。',
  LAST_LOGIN_METHOD: '这是最后一种可用的登录方式，不能解绑。',
  REAUTH_REQUIRED: '这个操作需要重新验证身份。',
  CSRF_FAILED: '安全校验失败，请刷新页面后重试。',
  ORIGIN_NOT_ALLOWED: '请求来源不被允许，请从官网页面重新操作。',
  SESSION_NOT_FOUND: '该设备会话不存在或已被撤销。',
  USER_NOT_FOUND: '账号不存在或已注销。',
  ACCOUNT_DELETE_CONFIRMATION_REQUIRED: '请输入 DELETE 确认注销账号。',
  NETWORK: '连接不上账户服务，请确认它已经启动。',
  UPSTREAM_UNAVAILABLE: '账户服务没有响应，请确认它已经启动。',
  SERVICE_OFFLINE: '当前没有连接到账户服务。',
};

function accountErrorText(err) {
  if (!err) return '发生未知错误。';
  const code = err.code || '';
  const base = ACCOUNT_ERROR_TEXT[code] || err.message || '请求失败。';
  if (err.retryAfter > 0 && (code === 'RATE_LIMITED' || code === 'OTP_TOO_MANY_ATTEMPTS')) {
    return base + '（约 ' + err.retryAfter + ' 秒后可以重试）';
  }
  return base;
}

/* ---------------------------------------------------------------- 请求层 */

class AccountApiError extends Error {
  constructor({ code, message, status, details, retryAfter, retryable } = {}) {
    super(message || ACCOUNT_ERROR_TEXT[code] || '请求失败');
    this.name = 'AccountApiError';
    this.code = code || 'INTERNAL';
    this.status = status || 0;
    this.details = details || null;
    this.retryAfter = retryAfter || 0;
    this.retryable = Boolean(retryable);
  }
  get display() { return accountErrorText(this); }
}

const accountRuntime = {
  // 同源反代；file:// 打开时没有 origin，直接用不了 API
  apiBase: '',
  csrfToken: null,
  csrfPromise: null,
  online: null,          // null 未知 / true 可用 / false 不可用
  providers: null,
  session: null,         // { user }
  me: null,              // /api/me 的完整响应
  health: null,
  listeners: new Set(),
};

function accountEmit() {
  for (const fn of accountRuntime.listeners) {
    try { fn(accountRuntime); } catch { /* 单个监听器出错不影响其它 */ }
  }
}

function accountSubscribe(fn) {
  accountRuntime.listeners.add(fn);
  return () => accountRuntime.listeners.delete(fn);
}

function apiAvailable() {
  return location.protocol === 'http:' || location.protocol === 'https:';
}

async function accountFetch(path, options = {}) {
  if (!apiAvailable()) {
    throw new AccountApiError({
      code: 'SERVICE_OFFLINE',
      message: '这份页面是直接以文件方式打开的，账户服务无法访问。请用 `node tools/serve.mjs` 在 http://127.0.0.1:8788 打开。',
      retryable: true,
    });
  }
  const method = (options.method || 'GET').toUpperCase();
  const headers = { Accept: 'application/json', ...(options.headers || {}) };
  let body = options.body;
  if (body !== undefined && typeof body !== 'string') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  const mutating = method !== 'GET' && method !== 'HEAD';
  if (mutating && path !== '/api/csrf') {
    headers['X-CSRF-Token'] = await getCsrfToken(options.forceCsrf);
  }

  let res;
  try {
    res = await fetch(accountRuntime.apiBase + path, {
      method,
      headers,
      body,
      credentials: 'same-origin',
      cache: 'no-store',
    });
  } catch (err) {
    accountRuntime.online = false;
    throw new AccountApiError({ code: 'NETWORK', message: accountErrorText({ code: 'NETWORK' }), retryable: true });
  }

  accountRuntime.online = true;

  if (res.status === 204) return null;

  const text = await res.text();
  let payload = null;
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = null; }
  }

  if (!res.ok) {
    const info = payload && payload.error ? payload.error : {};
    // CSRF 过期：换一次 token 后重试一次
    if (res.status === 403 && info.code === 'CSRF_FAILED' && !options._retriedCsrf) {
      accountRuntime.csrfToken = null;
      return accountFetch(path, { ...options, _retriedCsrf: true });
    }
    const retryAfter = Number(res.headers.get('retry-after') || 0);
    throw new AccountApiError({
      code: info.code || 'HTTP_' + res.status,
      message: info.message || '',
      status: res.status,
      details: info.details || null,
      retryAfter,
      retryable: res.status >= 500 || res.status === 429,
    });
  }
  return payload;
}

async function getCsrfToken(force = false) {
  if (accountRuntime.csrfToken && !force) return accountRuntime.csrfToken;
  if (accountRuntime.csrfPromise) return accountRuntime.csrfPromise;
  accountRuntime.csrfPromise = (async () => {
    const res = await fetch(accountRuntime.apiBase + '/api/csrf', {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      throw new AccountApiError({ code: 'CSRF_FAILED', status: res.status, message: '无法获取安全校验令牌。' });
    }
    const data = await res.json();
    accountRuntime.csrfToken = data.token;
    return data.token;
  })();
  try {
    return await accountRuntime.csrfPromise;
  } finally {
    accountRuntime.csrfPromise = null;
  }
}

/* ---------------------------------------------------------------- 业务接口 */

const accountApi = {
  async health() {
    const data = await accountFetch('/api/health').catch((err) => {
      accountRuntime.online = false;
      accountRuntime.health = null;
      throw err;
    });
    accountRuntime.health = data;
    accountRuntime.online = true;
    return data;
  },

  async providers() {
    const data = await accountFetch('/api/config/providers');
    accountRuntime.providers = data;
    return data;
  },

  async session() {
    try {
      const data = await accountFetch('/api/auth/session');
      accountRuntime.session = data;
      return data;
    } catch (err) {
      if (err.status === 401 || err.code === 'UNAUTHORIZED') {
        accountRuntime.session = null;
        accountRuntime.me = null;
        return null;
      }
      throw err;
    }
  },

  async me() {
    const data = await accountFetch('/api/me');
    accountRuntime.me = data;
    accountRuntime.session = { user: data.user };
    return data;
  },

  sendOtp(email, purpose = 'sign-in') {
    return accountFetch('/api/auth/send-otp', { method: 'POST', body: { email, purpose } });
  },

  async verifyOtp(email, otp, name) {
    const body = { email, otp };
    if (name) body.name = name;
    const data = await accountFetch('/api/auth/verify-otp', { method: 'POST', body });
    accountRuntime.session = { user: data.user };
    return data;
  },

  reauth(otp) {
    return accountFetch('/api/auth/reauth', { method: 'POST', body: { otp } });
  },

  async signOut() {
    await accountFetch('/api/auth/sign-out', { method: 'POST' });
    accountRuntime.session = null;
    accountRuntime.me = null;
    accountEmit();
  },

  async patchMe(patch) {
    const data = await accountFetch('/api/me', { method: 'PATCH', body: patch });
    accountRuntime.me = data;
    accountRuntime.session = { user: data.user };
    accountEmit();
    return data;
  },

  accounts() { return accountFetch('/api/me/accounts'); },

  async link(provider) {
    const data = await accountFetch('/api/me/link/' + encodeURIComponent(provider), { method: 'POST' });
    return data;
  },

  unlink(provider) {
    return accountFetch('/api/me/unlink/' + encodeURIComponent(provider), { method: 'POST' });
  },

  sessions() { return accountFetch('/api/me/sessions'); },

  revokeSession(id) {
    return accountFetch('/api/me/sessions/' + encodeURIComponent(id), { method: 'DELETE' });
  },

  revokeOthers() {
    return accountFetch('/api/me/sessions/revoke-others', { method: 'POST' });
  },

  async exportData() {
    if (!apiAvailable()) throw new AccountApiError({ code: 'SERVICE_OFFLINE' });
    const res = await fetch(accountRuntime.apiBase + '/api/me/export', {
      credentials: 'same-origin',
      headers: { Accept: 'application/json', 'X-CSRF-Token': await getCsrfToken() },
    });
    if (res.ok) return { blob: await res.blob(), filename: filenameFromDisposition(res.headers.get('content-disposition')) };
    const text = await res.text();
    let info = {};
    try { info = JSON.parse(text).error || {}; } catch { /* 非 JSON */ }
    throw new AccountApiError({ code: info.code || 'INTERNAL', message: info.message || '', status: res.status });
  },

  deleteAccount(confirmation) {
    return accountFetch('/api/me/delete', { method: 'POST', body: { confirmation } });
  },
};

function filenameFromDisposition(header) {
  if (!header) return 'kyfold-account-export.json';
  const match = /filename="?([^\";]+)"?/i.exec(header);
  return match ? match[1] : 'kyfold-account-export.json';
}

/* ---------------------------------------------------------------- 小工具 */

/** 相对时间：刚刚 / 12 分钟前 / 3 天前 */
function relativeTime(value) {
  if (!value) return '未知';
  const then = new Date(value).getTime();
  if (!Number.isFinite(then)) return '未知';
  const diff = Math.max(0, Date.now() - then);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return minutes + ' 分钟前';
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + ' 小时前';
  const days = Math.floor(hours / 24);
  if (days < 30) return days + ' 天前';
  return new Date(then).toLocaleDateString('zh-CN');
}

function formatDateTime(value) {
  if (!value) return '未知';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '未知';
  return date.toLocaleString('zh-CN', { hour12: false });
}

/** 从 UA 里取一个可读的设备标签，用于会话列表 */
function deviceLabel(userAgent) {
  const ua = userAgent || '';
  const browser =
    /Edg\//.test(ua) ? 'Edge' :
    /Chrome\//.test(ua) ? 'Chrome' :
    /Safari\//.test(ua) && !/Chrome/.test(ua) ? 'Safari' :
    /Firefox\//.test(ua) ? 'Firefox' : '浏览器';
  const system =
    /iPhone/.test(ua) ? 'iPhone' :
    /iPad/.test(ua) ? 'iPad' :
    /Mac OS X/.test(ua) ? 'macOS' :
    /Windows/.test(ua) ? 'Windows' :
    /Android/.test(ua) ? 'Android' : '未知设备';
  return browser + ' · ' + system;
}
