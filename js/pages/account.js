/* KyFold · account.js
   账户中心（真实数据）：概览、登录与绑定、设备与安全、偏好设置；
   以及 `#/account-about` 账户说明页。
   所有状态来自 KyFold 账户服务（/api/*）。服务不可用时显示明确错误与重试，不伪造成功。 */
'use strict';

const ACCOUNT_PANELS = [
  ['overview', 'grid', '账户概览'],
  ['identities', 'link', '登录与绑定'],
  ['security', 'shield', '设备与安全'],
  ['preferences', 'settings', '偏好设置'],
];

const ACCOUNT_PANEL_COPY = {
  overview: ['一切，从这里继续。', '管理你的身份，也查看你使用的工具。'],
  identities: ['登录与绑定', '用你熟悉的方式，进入同一个 KyFold 账户。'],
  security: ['设备与安全', '看看在哪里登录过，随时结束不需要的会话。'],
  preferences: ['偏好设置', '昵称、外观，以及退出登录。'],
};

const PROVIDER_LABEL = { github: 'GitHub', google: 'Google', apple: 'Apple', 'email-otp': '邮箱验证码' };

/* ---------------------------------------------------------------- 页面骨架 */

function accountPage(part) {
  const active = ACCOUNT_PANELS.some((panel) => panel[0] === part) ? part : 'overview';
  const labels = Object.fromEntries(ACCOUNT_PANELS.map((panel) => [panel[0], panel[2]]));
  return `<main id="main" tabindex="-1" class="account-layout page-in"><aside class="account-sidebar" aria-label="账户导航"><div class="sidebar-profile"><span class="avatar" id="sidebar-avatar">K</span><div><strong id="sidebar-name">你的账户</strong><p>KyFold 账户</p></div></div><nav class="account-nav">${ACCOUNT_PANELS.map(([key, symbol, label]) => `<button data-account-tab="${key}" class="${active === key ? 'active' : ''}" ${active === key ? 'aria-current="page"' : ''}>${icon(symbol)}${label}</button>`).join('')}</nav><div class="sidebar-bottom"><a href="#/help">${icon('help', true)}帮助与支持</a><a href="#/">${icon('back', true)}返回官网</a><button data-account-action="logout">${icon('logout', true)}退出登录</button></div></aside><section class="account-content"><div class="account-width"><div class="account-breadcrumb">KyFold 账户 ${icon('chevron', true)} ${labels[active]}</div><div class="account-page-heading"><div><h1>${ACCOUNT_PANEL_COPY[active][0]}</h1><p>${ACCOUNT_PANEL_COPY[active][1]}</p></div><span class="badge blue" id="account-badge">已登录</span></div><div id="account-content">${accountSkeleton()}</div></div></section></main>`;
}

function accountSkeleton() {
  return `<div class="account-loading" role="status" aria-live="polite"><span class="spinner" aria-hidden="true"></span><span>正在读取账户信息…</span><div class="skeleton-lines"><i></i><i></i><i></i></div></div>`;
}

function accountErrorCard(message, { retry = true, hint = '' } = {}) {
  return `<div class="account-state is-error" role="alert">${icon('info')}<div><h2>暂时读不到账户信息</h2><p>${escapeHTML(message)}</p>${hint ? `<p class="state-hint">${hint}</p>` : ''}</div>${retry ? '<button class="btn btn-secondary btn-sm" data-account-retry>重试</button>' : ''}</div>`;
}

/* ---------------------------------------------------------------- 挂载 */

let accountMountedRoute = null;

function mountAccount(part) {
  const active = ACCOUNT_PANELS.some((panel) => panel[0] === part) ? part : 'overview';
  accountMountedRoute = active;
  loadAccountPanel(active);
}

async function loadAccountPanel(part) {
  const box = document.getElementById('account-content');
  if (!box) return;
  if (accountMountedRoute !== part) return; // 用户已经切走了
  box.innerHTML = accountSkeleton();

  let me;
  try {
    me = await accountApi.me();
  } catch (err) {
    if (err.status === 401) {
      location.hash = '/login?next=' + encodeURIComponent('/account/' + part);
      return;
    }
    box.innerHTML = accountErrorCard(
      accountErrorText(err),
      { hint: '账户服务默认在 <code>http://127.0.0.1:8797</code>，官网通过 <code>node tools/serve.mjs</code> 代理访问。' },
    );
    box.querySelector('[data-account-retry]')?.addEventListener('click', () => loadAccountPanel(part));
    return;
  }

  if (accountMountedRoute !== part) return;
  paintSidebar(me.user);

  try {
    if (part === 'overview') await paintOverview(box, me);
    else if (part === 'identities') await paintIdentities(box, me);
    else if (part === 'security') await paintSecurity(box, me);
    else await paintPreferences(box, me);
  } catch (err) {
    box.innerHTML = accountErrorCard(accountErrorText(err), { hint: '可以重试，或刷新页面后重新登录。' });
    box.querySelector('[data-account-retry]')?.addEventListener('click', () => loadAccountPanel(part));
  }
}

function paintSidebar(user) {
  const nameNode = document.getElementById('sidebar-name');
  const avatarNode = document.getElementById('sidebar-avatar');
  if (nameNode) nameNode.textContent = user?.name || user?.email || '你的账户';
  if (avatarNode) avatarNode.textContent = (user?.name || user?.email || 'K').slice(0, 1).toUpperCase();
}

/* ---------------------------------------------------------------- 概览 */

async function paintOverview(box, me) {
  const user = me.user;
  let sessions = [];
  try {
    const data = await accountApi.sessions();
    sessions = data?.sessions || [];
  } catch { /* 设备数读不到不影响概览 */ }

  const methods = me.loginMethods || [];
  const oauthCount = methods.filter((method) => method.type === 'oauth').length;

  box.innerHTML = `
    <section class="panel profile-panel"><span class="avatar">${escapeHTML((user.name || user.email || 'K').slice(0, 1).toUpperCase())}</span><div><h2>${escapeHTML(user.name || '未命名')}</h2><p>${escapeHTML(user.email)}${user.emailVerified ? ' · 已验证' : ''} · 创建于 ${formatDateTime(user.createdAt)}</p></div><button class="btn btn-secondary btn-sm" data-account-action="edit-profile">编辑资料</button></section>
    <div class="account-section-heading"><span>我的 KyFold 工具</span><a href="#/products">查看产品</a></div>
    <div class="account-apps"><a href="#/product/kyremote" class="account-app"><span class="app-symbol">${icon('monitor')}</span><div><strong>KyRemote</strong><p>远程工作 · 内部测试</p></div>${icon('chevron')}</a><a href="#/product/classroom" class="account-app"><span class="app-symbol classroom">${icon('book')}</span><div><strong>课堂 AI 助手</strong><p>课堂学习 · 内部测试</p></div>${icon('chevron')}</a></div>
    <div class="account-summary"><section class="summary-item"><span>${icon('link', true)}登录方式</span><strong>${methods.length} 种可用</strong><p>其中第三方登录 ${oauthCount} 种。</p><button data-account-tab="identities">管理登录方式 ${icon('arrow', true)}</button></section><section class="summary-item"><span>${icon('shield', true)}登录设备</span><strong>${sessions.length} 台</strong><p>${sessions.length ? '最近活动 ' + escapeHTML(relativeTime(sessions[0].lastSeenAt || sessions[0].createdAt)) : '暂时读不到设备列表。'}</p><button data-account-tab="security">查看设备 ${icon('arrow', true)}</button></section></div>
    <p class="account-tip">${icon('key', true)}账户 ID：<code>${escapeHTML(user.id)}</code>。它是你在 KyFold 里的唯一身份，不会随邮箱或第三方账号变化；两个 App 的数据与设备授权仍然分别管理。</p>`;
  bindAccountTabs(box);
}

/* ---------------------------------------------------------------- 登录与绑定 */

async function paintIdentities(box, me) {
  const methods = me.loginMethods || [];
  const boundProviders = new Set(methods.filter((method) => method.type === 'oauth').map((method) => method.id));
  let providerConfig = { providers: [] };
  try { providerConfig = await accountApi.providers(); } catch { /* 配置读不到时按未配置展示 */ }
  const configById = Object.fromEntries((providerConfig.providers || []).map((provider) => [provider.id, provider]));
  const oauthCandidates = ['github', 'google', 'apple'];

  const rows = [];
  for (const method of methods) {
    const label = PROVIDER_LABEL[method.id] || method.label || method.id;
    const symbol = method.id === 'google' ? google() : icon(method.id === 'email-otp' ? 'mail' : method.id);
    const detail = method.email ? escapeHTML(method.email) : '已绑定';
    const linkedAt = method.linkedAt ? '<small>绑定于 ' + escapeHTML(formatDateTime(method.linkedAt)) + '</small>' : '';
    rows.push(`<div class="identity-row"><span class="provider-symbol">${symbol}</span><div class="identity-copy"><strong>${escapeHTML(label)}</strong><p>${detail}</p>${linkedAt}</div><span class="badge green"><span class="dot"></span>${method.removable ? '已绑定' : '主登录方式'}</span>${method.removable ? `<button class="btn btn-secondary btn-sm" data-account-action="unlink" data-provider="${escapeHTML(method.id)}">解绑</button>` : '<span class="identity-locked">不可解绑</span>'}</div>`);
  }

  for (const provider of oauthCandidates) {
    if (boundProviders.has(provider)) continue;
    const config = configById[provider] || { status: 'unconfigured' };
    const available = config.status === 'available';
    const statusText = available ? '可以绑定' : config.status === 'reserved' ? '预留，尚未启用' : '服务端未配置凭证';
    const symbol = provider === 'google' ? google() : icon(provider);
    rows.push(`<div class="identity-row is-unbound"><span class="provider-symbol">${symbol}</span><div class="identity-copy"><strong>${PROVIDER_LABEL[provider]}</strong><p>尚未绑定 · ${escapeHTML(statusText)}</p></div><span class="badge">${available ? '可用' : '未配置'}</span><button class="btn ${available ? 'btn-primary' : 'btn-secondary'} btn-sm" data-account-action="link" data-provider="${provider}" ${available ? '' : 'disabled aria-disabled="true"'} title="${available ? '' : escapeHTML(config.note || statusText)}">绑定</button></div>`);
  }

  box.innerHTML = `
    <div class="preview-notice">${icon('info', true)}这些是真实账户数据，来自本机的 KyFold 账户服务。第三方登录的可用状态取决于服务端是否配置了对应凭证。</div>
    <section class="panel"><div class="panel-title"><div><h2>你的登录方式</h2><p>同一个 KyFold 账户可以有多种入口；解绑只会移除入口，不会删除账户。</p></div><span class="badge">${methods.length} 种可用</span></div>${rows.join('')}<p class="small-info">邮箱验证码是账户的主登录方式，始终保留，不能解绑。敏感操作（绑定、解绑、导出、注销）会要求再验证一次邮箱。</p></section>
    <p class="account-tip">${icon('shield', true)}同一个第三方身份不能同时绑定两个 KyFold 账号；如果提示已绑定到其他账户，不会自动合并，请改用原来的方式登录。</p>`;

  const reload = () => loadAccountPanel('identities');
  box.querySelectorAll('[data-account-action="unlink"]').forEach((button) => {
    button.addEventListener('click', () => accountUnlink(button.dataset.provider, reload));
  });
  box.querySelectorAll('[data-account-action="link"]').forEach((button) => {
    button.addEventListener('click', () => accountLink(button.dataset.provider, reload));
  });
}

async function accountLink(provider, reload) {
  const confirmed = await accountDialog({
    title: '绑定 ' + (PROVIDER_LABEL[provider] || provider),
    html: `<p class="modal-lead">接下来会跳转到 ${PROVIDER_LABEL[provider] || provider} 完成授权，授权后回到 KyFold。绑定只增加一个登录入口，不会改变两个 App 的数据归属。</p>`,
    confirm: '去授权',
  });
  if (!confirmed) return;
  try {
    const result = await withReauth(() => accountApi.link(provider));
    if (!result.ok) return;
    const url = result.value?.url;
    if (!url) { toast('服务端没有返回授权地址。'); return; }
    toast('正在前往授权页面…');
    location.href = url.startsWith('http') ? url : '/api/auth/sign-in/social/' + encodeURIComponent(provider) + '?next=' + encodeURIComponent('/#/account/identities');
  } catch (err) {
    await accountNotice('绑定没有完成', accountErrorText(err));
    reload();
  }
}

async function accountUnlink(provider, reload) {
  const confirmed = await accountDialog({
    title: '解绑 ' + (PROVIDER_LABEL[provider] || provider) + '？',
    html: '<p class="modal-lead">解绑后不能再通过这个入口登录 KyFold，账户本身和 App 内容不受影响。之后可以重新绑定。</p>',
    confirm: '解绑',
    danger: true,
  });
  if (!confirmed) return;
  try {
    const result = await withReauth(() => accountApi.unlink(provider));
    if (!result.ok) return;
    toast('已解绑 ' + (PROVIDER_LABEL[provider] || provider));
    reload();
  } catch (err) {
    await accountNotice(err.code === 'LAST_LOGIN_METHOD' ? '不能解绑最后一种方式' : '解绑没有完成', accountErrorText(err));
    reload();
  }
}

/* ---------------------------------------------------------------- 设备与安全 */

async function paintSecurity(box, me) {
  const data = await accountApi.sessions();
  const sessions = data?.sessions || [];
  const rows = sessions.map((session) => `<div class="security-device"><span class="provider-symbol">${icon(session.current ? 'laptop' : 'tablet')}</span><div class="device-info"><strong>${escapeHTML(deviceLabel(session.userAgent))}${session.current ? ' · 当前设备' : ''}</strong><p>${escapeHTML(session.ipAddress || '未知地址')} · 最近活动 ${escapeHTML(relativeTime(session.lastSeenAt || session.createdAt))} · 登录于 ${escapeHTML(formatDateTime(session.createdAt))}</p></div>${session.current ? '<span class="badge green"><span class="dot"></span>当前</span>' : `<button class="btn btn-secondary btn-sm" data-account-action="revoke-session" data-session="${escapeHTML(session.id)}">移除</button>`}</div>`).join('');

  box.innerHTML = `
    <section class="panel"><div class="panel-title"><div><h2>登录设备</h2><p>下面是真实的会话记录；移除后该设备需要重新登录。</p></div><span class="badge">${sessions.length} 台</span></div>${rows || '<p class="account-empty">暂时没有其他设备。</p>'}<div class="security-footer"><span>已经签发的访问令牌会在短时间内失效；移除后请在该设备重新登录。</span>${sessions.length > 1 ? '<button class="btn btn-secondary btn-sm" data-account-action="revoke-others">退出其他所有设备</button>' : ''}</div></section>
    <section class="panel danger-panel"><div><h3>导出我的数据</h3><p>下载一个 JSON 文件，包含账户资料、登录方式、会话与审计记录，不含任何令牌。导出前需要再验证一次身份。</p></div><button class="btn btn-secondary btn-sm" data-account-action="export">导出数据</button></section>
    <section class="panel danger-panel"><div><h3>注销 KyFold 账户</h3><p>注销会删除账户、登录方式与会话，并清理该账户在账户服务里的数据，无法恢复。两个 App 里的内容需要分别处理。</p></div><button class="btn btn-danger btn-sm" data-account-action="delete">注销账户</button></section>`;

  box.querySelectorAll('[data-account-action="revoke-session"]').forEach((button) => {
    button.addEventListener('click', async () => {
      const ok = await accountDialog({ title: '移除这台设备？', html: '<p class="modal-lead">该设备会被立即退出登录，需要重新验证才能继续使用。</p>', confirm: '移除', danger: true });
      if (!ok) return;
      try {
        await accountApi.revokeSession(button.dataset.session);
        toast('设备已移除');
        loadAccountPanel('security');
      } catch (err) {
        await accountNotice('移除没有完成', accountErrorText(err));
      }
    });
  });

  box.querySelector('[data-account-action="revoke-others"]')?.addEventListener('click', async () => {
    const ok = await accountDialog({ title: '退出其他所有设备？', html: '<p class="modal-lead">其他设备会立即失效，当前设备保持登录。</p>', confirm: '退出其他设备', danger: true });
    if (!ok) return;
    try { await accountApi.revokeOthers(); toast('其他设备已退出'); loadAccountPanel('security'); }
    catch (err) { await accountNotice('操作没有完成', accountErrorText(err)); }
  });

  box.querySelector('[data-account-action="export"]')?.addEventListener('click', async () => {
    try {
      const result = await withReauth(() => accountApi.exportData());
      if (!result.ok) return;
      const { blob, filename } = result.value;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = filename;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast('数据已开始下载');
    } catch (err) {
      await accountNotice('导出没有完成', accountErrorText(err));
    }
  });

  box.querySelector('[data-account-action="delete"]')?.addEventListener('click', async () => {
    const confirmed = await accountDialog({
      title: '注销 KyFold 账户',
      html: '<p class="modal-lead">注销会删除账户、登录方式与会话记录，无法恢复。请输入 <strong>DELETE</strong> 继续。</p><div class="field"><label for="delete-confirm">确认字符串</label><input id="delete-confirm" autocomplete="off" placeholder="DELETE"></div>',
      confirm: '注销账户', danger: true,
      onConfirm: async ({ show }) => {
        const value = (document.getElementById('delete-confirm')?.value || '').trim();
        if (value !== 'DELETE') { show('请输入大写的 DELETE。'); return false; }
        return true;
      },
    });
    if (!confirmed) return;
    try {
      const result = await withReauth(() => accountApi.deleteAccount('DELETE'));
      if (!result.ok) return;
      accountRuntime.session = null; accountRuntime.me = null;
      toast('账户已注销');
      location.hash = '/';
    } catch (err) {
      await accountNotice('注销没有完成', accountErrorText(err));
    }
  });
}

/* ---------------------------------------------------------------- 偏好设置 */

async function paintPreferences(box, me) {
  const user = me.user;
  box.innerHTML = `
    <section class="panel"><div class="panel-title"><div><h2>个人资料</h2><p>昵称会显示在账户中心；头像需要一个 https 图片地址。</p></div></div><form id="profile-form" class="account-form"><div class="field"><label for="profile-name">昵称</label><input id="profile-name" name="name" maxlength="60" value="${escapeHTML(user.name || '')}" autocomplete="nickname"></div><div class="field"><label for="profile-image">头像地址（可选）</label><input id="profile-image" name="image" type="url" placeholder="https://…" value="${escapeHTML(user.image || '')}" autocomplete="off"></div><p class="field-error" id="profile-error" role="alert" hidden></p><button class="btn btn-primary btn-sm" type="submit">保存资料</button></form></section>
    <section class="panel"><div class="panel-title"><div><h2>外观</h2><p>只作用于这份官网，保存在当前浏览器。</p></div></div><div class="preferences"><label><span>界面外观<small>官网与账户中心共用同一套外观。</small></span><select id="appearance" aria-label="界面外观"><option value="light" ${state.theme === 'light' ? 'selected' : ''}>浅色</option><option value="dark" ${state.theme === 'dark' ? 'selected' : ''}>深色</option></select></label><label><span>界面语言<small>当前只有简体中文。</small></span><select aria-label="界面语言" disabled><option>简体中文</option></select></label></div></section>
    <section class="panel danger-panel"><div><h3>退出登录</h3><p>结束当前会话并清除登录状态，随时可以再用邮箱验证码登录。</p></div><button class="btn btn-secondary btn-sm" data-account-action="logout">退出登录</button></section>`;

  const form = document.getElementById('profile-form');
  const errorNode = document.getElementById('profile-error');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorNode.hidden = true;
    const name = form.name.value.trim();
    const image = form.image.value.trim();
    if (!name) { errorNode.textContent = '昵称不能为空。'; errorNode.hidden = false; return; }
    if (image && !/^https:\/\//i.test(image)) { errorNode.textContent = '头像地址必须以 https:// 开头。'; errorNode.hidden = false; return; }
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    try {
      await accountApi.patchMe({ name, image: image || null });
      paintSidebar(accountRuntime.me?.user);
      toast('资料已保存');
    } catch (err) {
      errorNode.textContent = accountErrorText(err);
      errorNode.hidden = false;
    } finally {
      button.disabled = false;
    }
  });

  // 外观切换由 app.js 的全局 change 监听处理，这里不重复绑定
  box.querySelector('[data-account-action="logout"]')?.addEventListener('click', accountLogout);
}

/* ---------------------------------------------------------------- 公共动作 */

function bindAccountTabs(scope) {
  scope.querySelectorAll('[data-account-tab]').forEach((button) => {
    button.addEventListener('click', () => { location.hash = '/account/' + button.dataset.accountTab; });
  });
}

function bindAccountShell() {
  document.querySelectorAll('[data-account-tab]').forEach((button) => {
    if (button.dataset.bound === '1') return;
    button.dataset.bound = '1';
    button.addEventListener('click', () => { location.hash = '/account/' + button.dataset.accountTab; });
  });
  const logout = document.querySelector('.sidebar-bottom [data-account-action="logout"]');
  if (logout && logout.dataset.bound !== '1') {
    logout.dataset.bound = '1';
    logout.addEventListener('click', accountLogout);
  }
}

async function accountLogout() {
  const ok = await accountDialog({ title: '退出登录？', html: '<p class="modal-lead">当前设备会结束会话，其他设备不受影响。</p>', confirm: '退出登录' });
  if (!ok) return;
  try {
    await accountApi.signOut();
    toast('已退出登录');
    location.hash = '/';
    render();
  } catch (err) {
    await accountNotice('退出没有完成', accountErrorText(err));
  }
}

async function accountNotice(title, message) {
  return accountDialog({ title, html: `<p class="modal-lead">${escapeHTML(message)}</p>`, confirm: '知道了', cancel: '' });
}

/* ---------------------------------------------------------------- 对话框 */

function accountDialog({ title, html, confirm = '确定', cancel = '取消', danger = false, onConfirm = null, onMount = null }) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      try { dialog.close(); } catch { /* 可能已经关闭 */ }
      resolve(value);
    };
    dialog.addEventListener('close', () => finish(false), { once: true });
    modalHandler = null;
    dialogContent.innerHTML = `<div class="modal-content"><button class="icon-btn modal-close" type="button" data-sheet-close aria-label="关闭">${icon('close')}</button><h2 id="dialog-title">${escapeHTML(title)}</h2>${html}<p class="field-error" id="sheet-error" role="alert" hidden></p><div class="modal-actions">${cancel ? `<button class="btn btn-secondary" type="button" data-sheet-cancel>${escapeHTML(cancel)}</button>` : ''}<button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" type="button" data-sheet-confirm>${escapeHTML(confirm)}</button></div></div>`;
    const errorNode = document.getElementById('sheet-error');
    const show = (message) => { errorNode.textContent = message; errorNode.hidden = false; };
    dialogContent.querySelector('[data-sheet-close]').addEventListener('click', () => finish(false));
    dialogContent.querySelector('[data-sheet-cancel]')?.addEventListener('click', () => finish(false));
    dialogContent.querySelector('[data-sheet-confirm]').addEventListener('click', async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      try {
        const result = onConfirm ? await onConfirm({ show }) : true;
        if (result !== false) finish(true);
      } catch (err) {
        show(accountErrorText(err));
      } finally {
        button.disabled = false;
      }
    });
    if (onMount) onMount({ show });
    dialog.showModal();
  });
}

/** 敏感操作：收到 403 REAUTH_REQUIRED 时弹一次邮箱验证，再重试一次。 */
async function withReauth(action) {
  try {
    return { ok: true, value: await action() };
  } catch (err) {
    if (err.code !== 'REAUTH_REQUIRED') throw err;
    const passed = await promptReauth();
    if (!passed) return { ok: false };
    return { ok: true, value: await action() };
  }
}

async function promptReauth() {
  const email = accountRuntime.me?.user?.email || '';
  let timer = null;
  const dialogPromise = accountDialog({
    title: '再验证一次身份',
    html: `<p class="modal-lead">这个操作涉及登录方式或账户数据。验证码会发送到 <strong>${escapeHTML(email)}</strong>，5 分钟内有效。</p><div class="field"><label for="reauth-code">验证码</label><div class="input-row"><input id="reauth-code" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="6 位验证码"><button type="button" class="btn btn-secondary" id="reauth-send">发送验证码</button></div><p class="field-note" id="reauth-status" role="status"></p></div>`,
    confirm: '验证并继续',
    onConfirm: async ({ show }) => {
      const code = (document.getElementById('reauth-code')?.value || '').trim();
      if (!/^\d{4,10}$/.test(code)) { show('请输入 6 位验证码。'); return false; }
      await accountApi.reauth(code);
      return true;
    },
    onMount: () => {
      const send = document.getElementById('reauth-send');
      const status = document.getElementById('reauth-status');
      const sendCode = async () => {
        send.disabled = true;
        status.textContent = '正在发送…';
        try {
          const result = await accountApi.sendOtp(email, 'reauth');
          if (result.devCode) {
            status.innerHTML = '开发模式验证码：<strong>' + escapeHTML(result.devCode) + '</strong>';
            const input = document.getElementById('reauth-code');
            if (input) { input.value = result.devCode; input.focus(); }
          } else {
            status.textContent = '验证码已发送，请查收邮件。';
          }
          let left = result.resendAfterSeconds || 60;
          timer = setInterval(() => {
            left -= 1;
            if (!document.body.contains(send)) { clearInterval(timer); return; }
            if (left <= 0) { clearInterval(timer); send.disabled = false; send.textContent = '重新发送'; }
            else send.textContent = left + ' 秒后可重发';
          }, 1000);
        } catch (err) {
          status.textContent = accountErrorText(err);
          send.disabled = false;
        }
      };
      send.addEventListener('click', sendCode);
      sendCode();
    },
  });
  const passed = await dialogPromise;
  if (timer) clearInterval(timer);
  return passed;
}

/* ---------------------------------------------------------------- 账户说明页 */

function accountIntro() {
  const signedIn = Boolean(accountRuntime.session);
  return `<main id="main" tabindex="-1" class="page-in"><div class="container"><section class="identity-hero"><div class="eyebrow">KYFOLD 账户</div><h1>入口，可以有很多。<br>你，始终是同一个。</h1><p>把熟悉的登录方式，关联到同一个 KyFold 身份。<br>使用不同的工具时，也有一个共同的账户入口。</p><div class="identity-hero-actions"><a href="#/${signedIn ? 'account' : 'login'}" class="btn btn-primary">${signedIn ? '进入账户中心' : '登录 KyFold 账户'} ${icon('arrow', true)}</a><a class="link" href="#/help">遇到问题？看帮助 ${icon('chevron', true)}</a></div><div class="identity-map" aria-label="多个登录入口关联同一个 KyFold 账户"><div class="identity-providers">${['github', 'google', 'apple', 'email'].map((key) => `<div>${providerIcon(key)}<span>${providerNames[key]}</span></div>`).join('')}</div><div class="identity-junction">${icon('link')}<span>一个 KyFold 账户</span></div><div class="identity-destinations"><span>${icon('monitor', true)}KyRemote</span><span>${icon('book', true)}课堂 AI 助手</span></div></div><p class="section-caption">邮箱验证码登录已接入账户服务 · 第三方登录待配置凭证</p></section><section class="account-explainer" aria-labelledby="identity-control-title"><div><div class="eyebrow">一个账户，一个身份</div><h2 id="identity-control-title">身份是统一的，<br>内容是各自的。</h2><p>KyFold 账户是你在 KyFold 里的身份。<br>GitHub、Google、Apple 和邮箱，是进入这个身份的不同入口。</p></div><div class="account-explainer-list"><article>${icon('user')}<div><h3>一个账户，一个 ID</h3><p>无论用哪种方式登录，进入的都是同一个账户；换一种入口，也回得到原来的地方。</p></div></article><article>${icon('folder')}<div><h3>身份不等于内容</h3><p>账户统一，不会把 KyRemote 和课堂助手的内容混在一起：两个 App 的数据各存各的。</p></div></article><article>${icon('shield')}<div><h3>各管各的权限</h3><p>远程设备授权、课堂记录和账户资料分别管理；一个入口不会让另一个 App 的数据变得可见。</p></div></article></div></section><section class="account-design" aria-labelledby="account-design-title"><div class="section-head"><div><div class="eyebrow">现在能做什么</div><h2 id="account-design-title">先把能用的做好，<br>再谈剩下的。</h2></div><p>下面区分「现在可用」与「仍在等待配置」，<br>不会把未接通的能力写成已完成。</p></div><div class="design-grid">${accountDesignCards.map((card) => `<article class="design-card"><span class="design-symbol">${icon(card.symbol)}</span><h3>${card.title}</h3><p class="design-lead">${card.lead}</p><ul>${card.points.map((point) => `<li>${point}</li>`).join('')}</ul></article>`).join('')}</div><p class="section-caption align-left">账户服务已在本机接入；第三方登录、真实邮件投递与外网部署仍需配置。</p></section><section class="process-section"><div class="section-head"><div><div class="eyebrow">登录流程</div><h2>四步，进入你自己的账户。</h2></div><p>没有密码，<br>验证码既是入口也是确认。</p></div>${stepsMarkup([['填写邮箱', '在登录页输入邮箱，获取六位验证码。'], ['输入验证码', '验证码 5 分钟内有效，用过即失效。'], ['进入账户中心', '首次登录会自动创建账户，之后回到同一个账户。'], ['管理账户', '在账户中心查看登录设备、导出数据，或注销账户。']])}</section><section class="account-faq-block"><div class="small-section-head"><h2>关于你的账户。</h2><a href="#/help" class="link">更多问题 ${icon('chevron', true)}</a></div>${faqMarkup(faqItems.filter((item) => ['binding', 'conflict', 'recovery', 'delete-account'].includes(item.id)))}</section><section class="detail-status"><div><h3>现在是真实的账户，但还不是公开服务。</h3><p>账户服务只在本机运行，第三方登录缺少凭证，邮件投递仍是开发通道。这些入口都标注了真实状态，不会假装成功。</p></div><a class="btn btn-primary btn-sm" href="#/login">去登录 ${icon('arrow', true)}</a></section></div></main>${footer()}`;
}
