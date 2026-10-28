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
const baseUrl = 'file://' + repo + '/index.html';

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
      const msg = e.method === 'Runtime.exceptionThrown' ? e.params.exceptionDetails?.exception?.description
        : (e.method === 'Log.entryAdded' && e.params.entry.level === 'error') ? e.params.entry?.text : null;
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

    // 4) 演示登录 → 账户中心四个面板
    await goto(cdp, 'login');
    out.flows.login = await cdp.evaluate(`(async () => {
      const wait = () => new Promise(r => setTimeout(r, 80));
      document.getElementById('email').value = 'bad-email';
      document.getElementById('code').value = '000000';
      document.querySelector('[data-action="send-code"]').click();
      await wait();
      const invalidEmail = document.getElementById('login-error').textContent;
      document.getElementById('email').value = 'demo@example.com';
      document.getElementById('code').value = '999999';
      document.getElementById('email-login').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await wait();
      const wrongCode = document.getElementById('login-error').textContent;
      document.getElementById('code').value = '123456';
      document.getElementById('email-login').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await wait();
      return { invalidEmail, wrongCode, hash: location.hash, logged: JSON.parse(localStorage.getItem('kyfold-ui-preview-v1-2')).logged };
    })()`);
    out.flows.account = await cdp.evaluate(`(async () => {
      const panels = {};
      for (const part of ['overview', 'identities', 'security', 'preferences']) {
        location.hash = '/account/' + part;
        await new Promise(r => setTimeout(r, 90));
        panels[part] = { heading: document.querySelector('.panel h2')?.textContent?.trim() || null,
          len: document.querySelector('main').innerHTML.length };
      }
      return panels;
    })()`);

    // 5) 最后一种登录方式保护
    await goto(cdp, 'account/identities');
    out.flows.guard = await cdp.evaluate(`(async () => {
      const btn = document.querySelector('[data-action="binding"][data-provider="github"]');
      btn.click();
      await new Promise(r => setTimeout(r, 100));
      const first = { title: document.querySelector('#dialog-content h2')?.textContent?.trim() || null,
        open: document.getElementById('dialog').open };
      document.querySelector('[data-modal="cancel"]').click();
      await new Promise(r => setTimeout(r, 60));
      return { first, closed: !document.getElementById('dialog').open };
    })()`);

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
} else if (cmd === 'shot') {
  await shoot(opt('route') || 'home', Number(opt('width') || 1440), opt('out') || '/tmp/kyfold.png');
} else if (cmd === 'serve') {
  console.log(baseUrl);
} else {
  console.log('用法: node tools/ui-check.mjs snapshot --out <file> | compare --before <file>');
}
