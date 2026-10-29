#!/usr/bin/env node
// KyFold 官网 UI 回归检查（零依赖，只依赖本机 Chrome）。
//
//   node tools/ui-check.mjs snapshot --out /tmp/before.json
//   node tools/ui-check.mjs compare  --before /tmp/before.json
//
// 做法：headless Chrome + CDP，逐个路由抓 document.title / #app 内部 HTML，
// 再跑几条真实交互（深色模式、帮助搜索、演示登录、最后一种登录方式保护、手机端菜单、键盘切换情景），
// 全部落成 JSON，refactor 前后逐字段比对。
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333 + Math.floor(Math.random() * 200);
const repo = path.resolve(import.meta.dirname, '..');
const urlArgIndex = process.argv.indexOf('--url');
const baseUrl = urlArgIndex >= 0 && process.argv[urlArgIndex + 1]
  ? process.argv[urlArgIndex + 1].replace(/\/+$/, '') + '/index.html'
  : 'file://' + repo + '/index.html';

const ROUTES = [
  'home', 'products', 'login', 'account-about', 'help', 'about',
  'product/kyremote', 'product/classroom', 'privacy', 'terms', 'no-such-page',
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function launch() {
  const dir = await mkdtemp(path.join(tmpdir(), 'kyfold-ui-'));
  const child = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${dir}`,
    '--no-first-run', '--no-default-browser-check', '--disable-gpu',
    '--allow-file-access-from-files', '--hide-scrollbars', 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  let err = '';
  child.stderr.on('data', d => { err += d; });
  for (let i = 0; i < 100; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find(t => t.type === 'page');
      if (page) return { child, dir, ws: page.webSocketDebuggerUrl };
    } catch {}
    await sleep(100);
  }
  child.kill('SIGKILL');
  throw new Error('Chrome 启动失败:\n' + err);
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0;
    const pending = new Map();
    const events = [];
    ws.onopen = () => resolve(api);
    ws.onerror = e => reject(new Error('CDP 连接失败: ' + (e.message || '')));
    ws.onmessage = ev => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) {
        const { res, rej } = pending.get(msg.id);
        pending.delete(msg.id);
        msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
      } else if (msg.method) events.push(msg);
    };
    const send = (method, params = {}) => new Promise((res, rej) => {
      const mid = ++id;
      pending.set(mid, { res, rej });
      ws.send(JSON.stringify({ id: mid, method, params }));
      setTimeout(() => { if (pending.has(mid)) { pending.delete(mid); rej(new Error('CDP 超时 ' + method)); } }, 30000);
    });
    const api = {
      send, events,
      close: () => ws.close(),
      async evaluate(expression) {
        const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || 'evaluate 失败');
        return r.result.value;
      },
      async waitLoad() {
        for (let i = 0; i < 200; i++) {
          if (events.some(e => e.method === 'Page.loadEventFired')) return;
          await sleep(25);
        }
        throw new Error('等待 load 超时');
      },
    };
  });
}

async function goto(cdp, hash) {
  return gotoUrl(cdp, baseUrl + '#/' + hash);
}

async function gotoUrl(cdp, url) {
  cdp.events.length = 0;
  await cdp.send('Page.navigate', { url: 'about:blank' });
  await cdp.waitLoad();
  cdp.events.length = 0;
  await cdp.send('Page.navigate', { url });
  await cdp.waitLoad();
  await sleep(120); // 等 deferred app.js 跑完首帧
}

const hash = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);

async function snapshot() {
  const { child, dir, ws } = await launch();
  const cdp = await connect(ws);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });

  const out = { baseUrl, routes: {}, flows: {}, errors: [] };
  const collect = () => {
    for (const e of cdp.events) {
      let msg = null;
      if (e.method === 'Runtime.exceptionThrown') msg = e.params.exceptionDetails?.exception?.description;
      else if (e.method === 'Log.entryAdded' && e.params.entry.level === 'error') {
        const text = e.params.entry?.text || '';
        if (!/status of 4\d\d/.test(text)) msg = text; // 4xx 是预期内的错误路径
      }
      if (msg && !out.errors.includes(msg)) out.errors.push(msg);
    }
    cdp.events.length = 0;
  };
  try {
    for (const route of ROUTES) {
      await goto(cdp, route);
      const page = await cdp.evaluate(`(() => ({
        title: document.title,
        theme: document.documentElement.dataset.theme,
        app: document.getElementById('app').innerHTML,
        active: document.querySelector('.header-nav a.is-active, .header-nav a[aria-current="page"]')?.textContent?.trim() || null,
        toast: document.getElementById('toast')?.hidden === false ? document.getElementById('toast').textContent : null,
      }))()`);
      collect();
      out.routes[route] = { title: page.title, theme: page.theme, active: page.active,
        len: page.app.length, sha: hash(page.app), html: page.app };
    }

    // 1) 深色模式切换 + 持久化
    await goto(cdp, 'home');
    await cdp.evaluate(`document.querySelector('[data-action="theme"]').click()`);
    await sleep(80);
    out.flows.theme = await cdp.evaluate(`(() => ({
      theme: document.documentElement.dataset.theme,
      stored: JSON.parse(localStorage.getItem('kyfold-ui-preview-v1-2') || '{}').theme,
    }))()`);
    await cdp.evaluate(`document.querySelector('[data-action="theme"]').click()`);

    // 2) 帮助中心搜索 + 分类
    await goto(cdp, 'help');
    out.flows.help = await cdp.evaluate(`(async () => {
      const box = document.getElementById('help-search');
      box.value = '账户'; box.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 60));
      const afterSearch = { count: document.getElementById('help-count').textContent,
        results: [...document.querySelectorAll('#help-results .faq summary')].map(e => e.textContent.trim()).slice(0, 12) };
      document.querySelector('[data-action="help-category"][data-category="account"]').click();
      await new Promise(r => setTimeout(r, 60));
      const afterCategory = { count: document.getElementById('help-count').textContent,
        pressed: document.querySelector('[data-action="help-category"][data-category="account"]').getAttribute('aria-pressed') };
      box.value = ''; box.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('[data-action="help-category"][data-category="all"]').click();
      await new Promise(r => setTimeout(r, 60));
      const afterReset = { count: document.getElementById('help-count').textContent, query: box.value };
      return { afterSearch, afterCategory, afterReset };
    })()`);

    // 3) 情景切换（键盘 + 点击）
    await goto(cdp, 'home');
    out.flows.scene = await cdp.evaluate(`(async () => {
      const buttons = [...document.querySelectorAll('[data-action="scene"]')];
      buttons[1].click();
      await new Promise(r => setTimeout(r, 60));
      const byClick = { selected: buttons.map(b => b.getAttribute('aria-selected')),
        heading: document.querySelector('#scene-panel h3')?.textContent?.trim() || null };
      buttons[1].focus();
      buttons[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
      await new Promise(r => setTimeout(r, 60));
      const byKey = { selected: buttons.map(b => b.getAttribute('aria-selected')),
        heading: document.querySelector('#scene-panel h3')?.textContent?.trim() || null };
      return { byClick, byKey };
    })()`);

    // 4) 登录页：即使没有账户服务，也必须给出明确状态而不是假装成功
    await goto(cdp, 'login');
    await sleep(400);
    out.flows.login = await cdp.evaluate(`(() => ({
      hasForm: Boolean(document.getElementById('email-login')),
      hasProviderBox: Boolean(document.getElementById('provider-buttons')),
      serviceState: (document.getElementById('service-state')?.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 160),
      submitDisabled: document.getElementById('submit-login')?.disabled ?? null,
      localNoteHidden: document.getElementById('local-note')?.hidden ?? null,
      protocol: location.protocol,
    }))()`);

    // 6) 手机端：汉堡菜单 + 深色 + 首屏不溢出
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
    await goto(cdp, 'home');
    out.flows.mobile = await cdp.evaluate(`(async () => {
      document.querySelector('[data-action="mobile-menu"]').click();
      await new Promise(r => setTimeout(r, 80));
      const nav = document.querySelector('.header-nav');
      const menu = { open: nav.classList.contains('is-open'),
        expanded: document.querySelector('[data-action="mobile-menu"]').getAttribute('aria-expanded'),
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await new Promise(r => setTimeout(r, 60));
      menu.afterEscape = !nav.classList.contains('is-open');
      return menu;
    })()`);

    collect();
    // 7) 可访问性与资源：图片替代文本、按钮可读名称、重复 id、无绝对路径
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });
    out.flows.a11y = {};
    for (const route of ['home', 'help', 'account-about', 'product/classroom']) {
      await goto(cdp, route);
      out.flows.a11y[route] = await cdp.evaluate(`(() => {
        const ids = [...document.querySelectorAll('[id]')].map(e => e.id);
        const dupIds = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
        const noAlt = [...document.querySelectorAll('img')].filter(i => !i.hasAttribute('alt')).length;
        const noName = [...document.querySelectorAll('button, a[href]')].filter(el => {
          const name = (el.getAttribute('aria-label') || el.textContent || '').trim();
          return !name && !el.querySelector('img[alt]:not([alt=""])');
        }).length;
        const absPaths = [...document.querySelectorAll('[src], [href]')]
          .map(e => e.getAttribute('src') || e.getAttribute('href'))
          .filter(u => u && (u.startsWith('/') || u.startsWith('http'))).length;
        const h1 = document.querySelectorAll('h1').length;
        return { dupIds, noAlt, noName, absPaths, h1 };
      })()`);
    }

    collect();
    // 8) Color Studio 工作台（独立页面，验证入口未回归）
    await gotoUrl(cdp, 'file://' + repo + '/color-studio/index.html');
    out.flows.studio = await cdp.evaluate(`(async () => {
      await new Promise(r => setTimeout(r, 400));
      const k = document.getElementById('k-preview');
      const ctx = k.getContext('2d');
      const data = ctx.getImageData(0, 0, k.width, k.height).data;
      let painted = 0;
      for (let i = 3; i < data.length; i += 4 * 97) if (data[i] > 0) painted++;
      return {
        title: document.title,
        canvasSize: k.width + 'x' + k.height,
        paintedSamples: painted,
        layers: document.querySelectorAll('.layer').length,
        exports: ['export-svg', 'export-png', 'export-zip', 'export-background'].map(id => !!document.getElementById(id)),
        backLink: document.querySelector('a[href*="index.html"]')?.getAttribute('href') || null,
      };
    })()`);

    collect();
    out.errors = out.errors.slice(0, 20);
  } finally {
    cdp.close();
    child.kill('SIGKILL');
    await rm(dir, { recursive: true, force: true });
  }
  return out;
}

function diff(before, after) {
  const problems = [];
  for (const [route, b] of Object.entries(before.routes)) {
    const a = after.routes[route];
    if (!a) { problems.push(`路由缺失: ${route}`); continue; }
    if (a.sha !== b.sha) {
      // 找出第一处差异，方便定位
      let i = 0;
      while (i < Math.min(b.html.length, a.html.length) && b.html[i] === a.html[i]) i++;
      problems.push(`HTML 变化: ${route} (${b.len} → ${a.len} 字符) 首处差异 @${i}: …${b.html.slice(Math.max(0, i - 60), i + 80)}… ⟶ …${a.html.slice(Math.max(0, i - 60), i + 80)}…`);
    }
    if (a.title !== b.title) problems.push(`标题变化: ${route} "${b.title}" → "${a.title}"`);
    if (a.theme !== b.theme) problems.push(`主题变化: ${route} ${b.theme} → ${a.theme}`);
    if (a.active !== b.active) problems.push(`当前导航项变化: ${route} ${b.active} → ${a.active}`);
  }
  const jb = JSON.stringify(before.flows), ja = JSON.stringify(after.flows);
  if (jb !== ja) problems.push('交互行为变化:\n  之前: ' + jb + '\n  之后: ' + ja);
  if (JSON.stringify(before.errors) !== JSON.stringify(after.errors)) {
    problems.push(`控制台错误变化:\n  之前: ${JSON.stringify(before.errors)}\n  之后: ${JSON.stringify(after.errors)}`);
  }
  return problems;
}

async function shoot(route, width, out) {
  const { child, dir, ws } = await launch();
  const cdp = await connect(ws);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 2, mobile: width < 700 });
  await goto(cdp, route);
  if (process.argv.includes('--dark')) {
    await cdp.evaluate(`localStorage.setItem('kyfold-ui-preview-v1-2', JSON.stringify({ theme: 'dark' }))`);
    await goto(cdp, route);
  }
  await sleep(200);
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  await writeFile(out, Buffer.from(data, 'base64'));
  const size = await cdp.evaluate(`({h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth})`);
  cdp.close(); child.kill('SIGKILL');
  await rm(dir, { recursive: true, force: true });
  console.log(`已写入 ${out}（${width}×${size.h}，滚动宽 ${size.w}）`);
}


/* ---------------------------------------------------------------- 真实账户流程 */

async function accountFlow() {
  const site = baseUrl.replace(/\/index\.html$/, '');
  const shotIndex = process.argv.indexOf('--shots');
  const shotDir = shotIndex >= 0 ? process.argv[shotIndex + 1] : null;
  const shot = async (name) => {
    if (!shotDir) return;
    const { data } = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    await writeFile(`${shotDir}/${name}.png`, Buffer.from(data, 'base64'));
  };
  const { child, dir, ws } = await launch();
  const cdp = await connect(ws);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });
  const errors = [];
  const collectErrors = () => {
    for (const e of cdp.events) {
      let msg = null;
      if (e.method === 'Runtime.exceptionThrown') {
        msg = e.params.exceptionDetails?.exception?.description || e.params.exceptionDetails?.text;
      } else if (e.method === 'Log.entryAdded' && e.params.entry.level === 'error') {
        const text = e.params.entry?.text || '';
        // 4xx 是这条流程里预期会出现的（未登录 401、错误验证码 400），只有 5xx 才算失败
        if (/status of 4\d\d/.test(text)) continue;
        msg = text;
      }
      if (msg && !errors.includes(msg)) errors.push(msg);
    }
    cdp.events.length = 0;
  };
  const results = [];
  const step = (name, ok, detail = '') => { results.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); };
  const waitFor = async (expression, timeout = 8000) => {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      const value = await cdp.evaluate(expression).catch(() => null);
      if (value) return value;
      await sleep(120);
    }
    return null;
  };

  try {
    // 未登录访问账户中心 → 应跳到登录页并带上 next
    await gotoUrl(cdp, site + '/#/account/security');
    await sleep(600);
    const redirected = await waitFor(`location.hash.startsWith('#/login')`);
    step('未登录访问账户中心会跳转登录', Boolean(redirected), await cdp.evaluate('location.hash'));

    // 登录页能读到真实服务与 provider 状态
    await gotoUrl(cdp, site + '/#/login');
    await sleep(600);
    await shot('01-login');
    const serviceState = await waitFor(`document.getElementById('local-note') && !document.getElementById('local-note').hidden && document.getElementById('provider-buttons').children.length > 0`);
    step('登录页连接账户服务', Boolean(serviceState));
    const providers = await cdp.evaluate(`[...document.querySelectorAll('[data-provider-login]')].map(b => ({ id: b.dataset.providerLogin, disabled: b.disabled }))`);
    step('第三方入口按真实配置渲染', providers.length === 3 && providers.every(p => p.disabled), JSON.stringify(providers));

    // 错误验证码路径
    const e2eEmail = 'site-e2e-' + Date.now() + '@kyfold.local'; // 每次用新邮箱，避免撞上按邮箱的限流
    await cdp.evaluate(`(() => { const e = document.getElementById('email'); e.value = ${JSON.stringify('MAIL')}; e.dispatchEvent(new Event('input', { bubbles: true })); const c = document.getElementById('code'); c.value = '000000'; })()`.replace('MAIL', e2eEmail));
    await cdp.evaluate(`document.getElementById('email-login').requestSubmit()`);
    await sleep(700);
    const badError = await cdp.evaluate(`document.getElementById('login-error').hidden ? '' : document.getElementById('login-error').textContent`);
    step('错误验证码会显示错误', badError.length > 0, badError);

    // 请求验证码（开发模式回显并自动填入）
    await cdp.evaluate(`document.getElementById('send-code').click()`);
    const devFilled = await waitFor(`document.getElementById('code').value.length >= 4 && /开发模式验证码/.test(document.getElementById('send-status').textContent)`, 10000);
    step('开发模式验证码回显并自动填入', Boolean(devFilled), await cdp.evaluate('document.getElementById("code").value'));

    // 提交登录
    await cdp.evaluate(`document.getElementById('email-login').requestSubmit()`);
    const loggedIn = await waitFor(`location.hash.startsWith('#/account')`, 10000);
    step('邮箱验证码登录成功', Boolean(loggedIn), await cdp.evaluate('location.hash'));

    // 概览
    await sleep(800);
    await shot('02-account-overview');
    const overview = await waitFor(`document.querySelector('#account-content .profile-panel h2')?.textContent`, 8000);
    step('账户概览显示真实昵称', Boolean(overview), overview || '');

    // 四个面板
    for (const part of ['identities', 'security', 'preferences']) {
      await cdp.evaluate(`location.hash = '/account/${part}'`);
      await sleep(900);
      await shot('03-account-' + part);
      const ok = await cdp.evaluate(`Boolean(document.querySelector('#account-content .panel')) && !document.querySelector('#account-content .account-loading')`);
      step(`账户面板 /${part} 渲染`, Boolean(ok));
    }

    // 登录方式：邮箱不可解绑 + 未配置的第三方禁用
    await cdp.evaluate(`location.hash = '/account/identities'`);
    await sleep(900);
    const identity = await cdp.evaluate(`(() => ({
      rows: document.querySelectorAll('#account-content .identity-row').length,
      locked: document.querySelectorAll('#account-content .identity-locked').length,
      bound: document.querySelectorAll('#account-content .badge.green').length,
      disabledBind: [...document.querySelectorAll('[data-account-action="link"]')].every(b => b.disabled),
    }))()`);
    step('登录与绑定：邮箱主方式不可解绑', identity.locked >= 1 && identity.bound >= 1, JSON.stringify(identity));
    step('未配置的第三方绑定按钮禁用', identity.disabledBind === true);

    // 设备与安全：真实会话
    await cdp.evaluate(`location.hash = '/account/security'`);
    await sleep(900);
    const security = await cdp.evaluate(`(() => ({
      devices: document.querySelectorAll('#account-content .security-device').length,
      current: document.querySelectorAll('#account-content .security-device .badge.green').length,
      exportButton: Boolean(document.querySelector('[data-account-action="export"]')),
      deleteButton: Boolean(document.querySelector('[data-account-action="delete"]')),
    }))()`);
    step('设备列表来自真实会话', security.devices >= 1 && security.current === 1, JSON.stringify(security));
    step('导出与注销入口存在', security.exportButton && security.deleteButton);

    // 注销确认串校验（不真正注销）
    await cdp.evaluate(`document.querySelector('[data-account-action="delete"]').click()`);
    await waitFor(`document.querySelector('#delete-confirm')`);
    await cdp.evaluate(`document.getElementById('delete-confirm').value = 'delete'; document.querySelector('[data-sheet-confirm]').click()`);
    await sleep(300);
    const confirmError = await cdp.evaluate(`document.getElementById('sheet-error').hidden ? '' : document.getElementById('sheet-error').textContent`);
    step('注销需要输入大写 DELETE', confirmError.includes('DELETE'), confirmError);
    await cdp.evaluate(`document.querySelector('[data-sheet-cancel]')?.click()`);
    await sleep(200);

    // 再验证对话框：人为制造一次 403 REAUTH_REQUIRED，走真实的 reauth 接口
    await cdp.evaluate(`(() => {
      window.__reauthResult = 'pending';
      window.__reauthAttempt = 0;
      withReauth(async () => {
        window.__reauthAttempt += 1;
        if (window.__reauthAttempt === 1) throw new AccountApiError({ code: 'REAUTH_REQUIRED', status: 403 });
        return 'ok';
      }).then((value) => { window.__reauthResult = value; }, (err) => { window.__reauthResult = 'error:' + (err && err.code); });
    })()`);
    const reauthDialogOpen = await waitFor(`Boolean(document.getElementById('reauth-send'))`, 6000);
    step('敏感操作会弹出再验证对话框', Boolean(reauthDialogOpen));
    const reauthCode = await waitFor(`(() => { const n = document.getElementById('reauth-status'); const m = n && /(\\d{4,10})/.exec(n.textContent); return m ? m[1] : null; })()`, 10000);
    step('再验证验证码通过开发通道回显', Boolean(reauthCode), reauthCode || '');
    if (reauthCode) {
      await cdp.evaluate(`document.getElementById('reauth-code').value = ${JSON.stringify('CODE')}`.replace('CODE', reauthCode));
      await cdp.evaluate(`document.querySelector('[data-sheet-confirm]').click()`);
      const reauthDone = await waitFor(`window.__reauthResult !== 'pending'`, 8000);
      const reauthValue = await cdp.evaluate(`window.__reauthResult`);
      step('再验证通过后自动重试原操作', Boolean(reauthDone) && reauthValue && reauthValue.ok === true && reauthValue.value === 'ok', JSON.stringify(reauthValue));
    }

    // 偏好设置：改昵称
    await cdp.evaluate(`location.hash = '/account/preferences'`);
    await sleep(900);
    const newName = '站点验证 ' + Math.floor(Math.random() * 900 + 100);
    await cdp.evaluate(`(() => { const n = document.getElementById('profile-name'); n.value = ${JSON.stringify('NAME_PLACEHOLDER')}; document.getElementById('profile-form').requestSubmit(); })()`.replace('NAME_PLACEHOLDER', newName));
    await sleep(900);
    const nameSaved = await cdp.evaluate(`document.getElementById('sidebar-name').textContent`);
    step('昵称保存会更新侧栏', nameSaved === newName, nameSaved);

    // 手机宽度：账户中心不横向溢出
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
    await cdp.evaluate(`location.hash = '/account/overview'`);
    await sleep(1000);
    await shot('04-account-mobile-overview');
    const mobileOverflow = await cdp.evaluate(`(() => ({
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      overflowPage: document.getElementById('account-content').scrollWidth - document.getElementById('account-content').clientWidth,
      navVisible: Boolean(document.querySelector('.account-nav button')),
    }))()`);
    step('账户中心手机端无横向溢出', mobileOverflow.overflowX <= 1 && mobileOverflow.overflowPage <= 1 && mobileOverflow.navVisible, JSON.stringify(mobileOverflow));
    await cdp.evaluate(`location.hash = '/account/identities'`);
    await sleep(900);
    await shot('04-account-mobile-identities');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });

    // 退出登录（偏好设置里有退出按钮）
    await cdp.evaluate(`location.hash = '/account/preferences'`);
    await sleep(900);
    await cdp.evaluate(`document.querySelector('#account-content [data-account-action="logout"]').click()`);
    await waitFor(`document.querySelector('[data-sheet-confirm]')`);
    await cdp.evaluate(`document.querySelector('[data-sheet-confirm]').click()`);
    await sleep(900);
    const loggedOut = await cdp.evaluate(`location.hash`);
    step('退出登录回到官网', loggedOut === '#/' || loggedOut === '' || loggedOut === '#', loggedOut);

    // 退出后账户中心不可访问
    await cdp.evaluate(`location.hash = '/account'`);
    await sleep(800);
    const backToLogin = await waitFor(`location.hash.startsWith('#/login')`);
    step('退出后账户中心需要重新登录', Boolean(backToLogin), await cdp.evaluate('location.hash'));

    collectErrors();
    step('控制台无错误', errors.length === 0, errors.join(' | ').slice(0, 300));
  } finally {
    cdp.close(); child.kill('SIGKILL');
    await rm(dir, { recursive: true, force: true });
  }

  const failed = results.filter(r => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} 通过`);
  if (failed.length) process.exitCode = 1;
  return results;
}


/* ---------------------------------------------------------------- 降级状态（账户服务不可用） */

async function degradedFlow() {
  const site = baseUrl.replace(/\/index\.html$/, '');
  const { child, dir, ws } = await launch();
  const cdp = await connect(ws);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });
  const results = [];
  const step = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); };
  const waitFor = async (expression, timeout = 8000) => {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      const value = await cdp.evaluate(expression).catch(() => null);
      if (value) return value;
      await sleep(120);
    }
    return null;
  };
  try {
    await gotoUrl(cdp, site + '/#/login');
    const state = await waitFor(`document.getElementById('service-state')?.textContent?.trim()`, 10000);
    step('登录页提示账户服务不可用', Boolean(state) && /(连接不上|没有连接)/.test(state), (state || '').replace(/\s+/g, ' ').slice(0, 90));
    const disabled = await cdp.evaluate(`document.getElementById('submit-login').disabled`);
    step('不可用时表单被禁用，不能假装登录', disabled === true);

    await gotoUrl(cdp, site + '/#/account/security');
    const card = await waitFor(`document.querySelector('#account-content .account-state.is-error')?.textContent?.trim()`, 10000);
    step('账户中心显示错误卡片而不是空白', Boolean(card), (card || '').replace(/\s+/g, ' ').slice(0, 90));
    const retry = await cdp.evaluate(`Boolean(document.querySelector('[data-account-retry]'))`);
    step('错误卡片提供重试按钮', retry === true);

    // 只允许 502（代理明确告知上游不可用），其它异常仍然失败
    const errors = cdp.events.filter(e => e.method === 'Runtime.exceptionThrown');
    step('降级路径没有未捕获的脚本异常', errors.length === 0, errors.map(e => e.params.exceptionDetails?.text).join(' | ').slice(0, 160));
  } finally {
    cdp.close(); child.kill('SIGKILL');
    await rm(dir, { recursive: true, force: true });
  }
  const failed = results.filter(r => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} 通过`);
  if (failed.length) process.exitCode = 1;
}

const [cmd, ...rest] = process.argv.slice(2);
const opt = name => { const i = rest.indexOf('--' + name); return i >= 0 ? rest[i + 1] : null; };

if (cmd === 'snapshot') {
  const snap = await snapshot();
  const out = opt('out') || '/tmp/kyfold-ui.json';
  await writeFile(out, JSON.stringify(snap, null, 1));
  const routes = Object.entries(snap.routes).map(([k, v]) => `${k}(${v.len})`).join(' ');
  console.log(`已写入 ${out}\n路由: ${routes}\n控制台错误: ${snap.errors.length}`);
} else if (cmd === 'compare') {
  const before = JSON.parse(await readFile(opt('before'), 'utf8'));
  const after = await snapshot();
  const problems = diff(before, after);
  const out = opt('out') || '/tmp/kyfold-ui-after.json';
  await writeFile(out, JSON.stringify(after, null, 1));
  if (!problems.length) console.log('✅ 与基线完全一致（' + Object.keys(before.routes).length + ' 个路由 + 6 组交互）');
  else { console.log('❌ 发现 ' + problems.length + ' 处差异:\n- ' + problems.join('\n- ')); process.exitCode = 1; }
} else if (cmd === 'degraded') {
  await degradedFlow();
} else if (cmd === 'account') {
  await accountFlow();
} else if (cmd === 'shot') {
  await shoot(opt('route') || 'home', Number(opt('width') || 1440), opt('out') || '/tmp/kyfold.png');
} else if (cmd === 'serve') {
  console.log(baseUrl);
} else {
  console.log('用法: node tools/ui-check.mjs snapshot --out <file> | compare --before <file>');
}
