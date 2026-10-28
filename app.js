(() => {
  'use strict';
  const root = document.getElementById('app');
  const dialog = document.getElementById('dialog');
  const dialogContent = document.getElementById('dialog-content');
  const toastElement = document.getElementById('toast');
  const storageKey = 'kyfold-ui-preview-v1-2';
  const defaultState = { logged: false, name: 'KyFold 用户', bindings: { github: true, google: false, apple: false, email: true }, ipad: true, theme: 'light' };
  let state;
  try { const saved = JSON.parse(localStorage.getItem(storageKey)); state = saved ? { ...defaultState, ...saved, bindings: { ...defaultState.bindings, ...saved.bindings } } : structuredClone(defaultState); }
  catch { state = structuredClone(defaultState); }
  let toastTimeout;
  let modalHandler = null;
  const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const paths = {
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    arrowUp: '<path d="M6 18 18 6M6 6h12v12"/>',
    back: '<path d="M19 12H5m6-6-6 6 6 6"/>',
    chevron: '<path d="m9 6 6 6-6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    moon: '<path d="M20.8 13.4A8.5 8.5 0 0 1 10.6 3.2a8.5 8.5 0 1 0 10.2 10.2Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5"/>',
    monitor: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/>',
    laptop: '<rect x="5" y="4" width="14" height="12" rx="1.5"/><path d="m5 16-3 4h20l-3-4"/>',
    tablet: '<rect x="5" y="2" width="14" height="20" rx="2.5"/><path d="M11 18h2"/>',
    phone: '<rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/>',
    book: '<path d="M12 5c-3-2-6-2-10 0v15c4-2 7-2 10 0m0-15c3-2 6-2 10 0v15c-4-2-7-2-10 0V5Z"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
    message: '<path d="M21 14a3 3 0 0 1-3 3H9l-6 4V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3Z"/><path d="M7 8h10M7 12h7"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
    github: '<path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 6v-3.8a3.3 3.3 0 0 0-.9-2.6c3-.3 6.1-1.5 6.1-6.8a5.3 5.3 0 0 0-1.4-3.7A4.9 4.9 0 0 0 18.7 1S17.6.7 15 2.4a13.4 13.4 0 0 0-6 0C6.4.7 5.3 1 5.3 1a4.9 4.9 0 0 0-.1 4.1 5.3 5.3 0 0 0-1.4 3.7c0 5.3 3.1 6.5 6.1 6.8a3.3 3.3 0 0 0-.9 2.6V22"/>',
    apple: '<path d="M14.2 5.1c.7-1 1.1-2.1 1-3.1-1.1.1-2.3.8-3 1.7-.7.8-1.1 1.9-1 3 1.1.1 2.2-.5 3-1.6Z"/><path d="M17.1 12c0-2 1.6-3 1.7-3.1-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.6.8-3.3.8-.7 0-1.8-.8-3-.7C7.7 7.3 6.2 8.2 5.4 9.6c-1.7 2.9-.5 7.3 1.2 9.6.8 1.2 1.7 2.4 2.9 2.3 1.2 0 1.7-.7 3.2-.7s1.9.7 3.2.7 2.1-1.1 2.9-2.3c.9-1.3 1.3-2.6 1.3-2.7-.1 0-3-1.2-3-4.5Z"/>',
    shield: '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
    link: '<g transform="translate(0 4) scale(.5)" stroke-width="4"><path d="M24 10h-9a6 6 0 0 0 0 12h5a6 6 0 0 0 6-6M24 22h9a6 6 0 0 0 0-12h-5a6 6 0 0 0-6 6"/></g>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v2"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    settings: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="var(--bg)"/><circle cx="15" cy="17" r="3" fill="var(--bg)"/>',
    logout: '<path d="M9 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4m6-14 6 7-6 7m-7-7h13"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
    mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2m-7 9v3m-4 0h8"/>',
    camera: '<path d="m8 5 2-3h4l2 3h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/><circle cx="12" cy="12" r="4"/>',
    key: '<circle cx="8" cy="8" r="5"/><path d="m12 12 9 9m-4-4 3-3m-6 0 3-3"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3m.1 4v.1"/>',
    globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>'
  };
  const icon = (name, small = false) => '<svg class="icon' + (small ? ' small' : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (paths[name] || paths.info) + '</svg>';
  const google = () => '<span class="provider-google" aria-hidden="true">G</span>';
  const providerIcon = provider => provider === 'google' ? google() : icon(provider === 'email' ? 'mail' : provider);
  const providerNames = { github:'GitHub', google:'Google', apple:'Apple', email:'邮箱' };
  const countBindings = () => Object.values(state.bindings).filter(Boolean).length;
  const brand = (footer = false) => '<a class="brand' + (footer ? ' footer-brand' : '') + '" href="#/" aria-label="KyFold 首页"><img src="assets/kyfold-icon.webp" alt=""><span class="brand-word">KyFold</span></a>';
  function persist() { try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {} }
  function toast(message) { clearTimeout(toastTimeout); toastElement.textContent = message; toastElement.hidden = false; toastTimeout = setTimeout(() => toastElement.hidden = true, 3400); }
  function currentRoute() { return location.hash.replace(/^#\/?/, '').replace(/\/$/, '') || 'home'; }
  function header(route) {
    return `<header class="site-header"><div class="container header-inner">${brand()}<nav class="header-nav" aria-label="主导航"><a class="${route.startsWith('product') ? 'active' : ''}" href="#/products">产品</a><a class="${route.startsWith('account') || route === 'login' ? 'active' : ''}" href="#/${state.logged ? 'account' : 'account-about'}">KyFold 账户</a><a href="color-studio/index.html">调色工作台</a><a class="${route === 'help' ? 'active' : ''}" href="#/help">帮助</a></nav><div class="header-actions"><button class="icon-btn" data-action="theme" aria-label="切换为${state.theme === 'dark' ? '浅' : '深'}色外观">${icon(state.theme === 'dark' ? 'sun' : 'moon')}</button>${state.logged ? `<a class="account-trigger" href="#/account" aria-label="进入账户中心"><span class="avatar sm">K</span><span>账户中心</span></a>` : '<a class="btn btn-primary btn-sm" href="#/login">登录 KyFold</a>'}<button class="icon-btn mobile-menu" data-action="mobile-menu" aria-label="展开导航" aria-expanded="false">${icon('menu')}</button></div></div></header>`;
  }
  function footer() {
    return `<footer class="footer"><div class="container"><div class="footer-directory"><div class="footer-brand-block">${brand(true)}<p>让工作与学习，顺手一点。</p><span>独立的工具，一个熟悉的账户。</span></div><nav aria-label="产品导航"><h2>探索产品</h2><a href="#/product/kyremote">KyRemote</a><a href="#/product/classroom">课堂 AI 助手</a><a href="#/products">所有产品</a><a href="color-studio/index.html">Color Studio 调色工作台</a></nav><nav aria-label="账户入口"><h2>KyFold 账户</h2><a href="#/account-about">了解统一账户</a><a href="#/${state.logged ? 'account' : 'login'}">${state.logged ? '进入账户中心' : '登录你的账户'}</a><button data-action="demo-account">体验账户中心</button></nav><nav aria-label="支持与说明"><h2>帮助与说明</h2><a href="#/help">帮助中心</a><a href="#/privacy">隐私说明</a><a href="#/terms">使用说明</a></nav></div><div class="footer-bottom"><span>© ${new Date().getFullYear()} KyFold. A little simpler, a little closer.</span><span class="footer-note">${icon('info', true)}设计预览 · 产品开发测试中 · 账户操作为演示</span></div></div></footer>`;
  }
  function miniRemote() {
    return `<div class="mini-window" aria-label="KyRemote 工作区示意"><div class="mini-window-bar"><i></i><i></i><i></i><span>KyRemote</span></div><div class="mini-remote"><div class="mini-side"><div class="mini-brand">${icon('monitor', true)} KyRemote</div><div class="mini-device">${icon('laptop', true)} 我的 Mac</div><div class="mini-row active">${icon('folder', true)} DSH 开发</div><div class="mini-row">${icon('folder', true)} 学业</div><div class="mini-row">${icon('folder', true)} KyFold</div></div><div class="mini-main"><div class="mini-main-title">DSH 开发</div><div class="mini-meta">你的工作空间</div><div class="mini-convo"><span>${icon('message', true)} 继续今天的开发</span><small>刚刚</small></div><div class="mini-convo"><span>${icon('message', true)} 整理项目中的想法</span><small>12 分钟前</small></div><div class="mini-convo"><span>${icon('message', true)} 一起完善下一个版本</span><small>昨天</small></div></div></div></div>`;
  }
  function miniClassroom() {
    return `<div class="mini-window" aria-label="课堂 AI 助手功能示意"><div class="mini-window-bar"><i></i><i></i><i></i><span>课堂 AI 助手 · 界面示意</span></div><div class="mini-class"><div><div class="mini-lesson-title">数据结构</div><div class="mini-start">正在听课</div><div class="mini-question"><small>识别到提问</small>栈和队列的区别是什么？<div class="mini-answer">栈后进先出，队列先进先出。</div></div></div><div class="mini-transcript"><div class="mini-tabs"><strong>课堂转写</strong><span>原文</span></div><p><time>00:15</time>接下来，我们看两种常见的数据结构。</p><p><time>00:28</time>栈和队列的区别是什么？</p><p><time>00:42</time>可以从元素进入和离开的顺序来理解。</p></div></div></div>`;
  }
  function home() {
    return `<main id="main" tabindex="-1" class="page-in"><div class="container">
      <section class="hero"><div class="hero-copy"><div class="eyebrow">A little simpler. A little closer.</div><h1>让工作与学习，<br><em>顺手一点。</em></h1><p class="hero-description">从远程工作，到课堂里的每一个问题。<br>KyFold 用简单好用的工具，<br>帮你把手边的事，接着做好。</p><div class="hero-actions"><a class="btn btn-primary" href="#/products">探索产品</a><a class="link" href="#/account-about">了解 KyFold 账户 ${icon('chevron',true)}</a></div><p class="hero-footnote">${icon('link',true)}独立的工具，一个熟悉的账户。</p></div><div class="hero-art"><div class="hero-orbit" aria-hidden="true"></div><div class="hero-orbit inner" aria-hidden="true"></div><img class="hero-icon" src="assets/kyfold-icon.webp" alt="KyFold 蓝色折叠 K 图标" width="254" height="254"><div class="hero-label remote"><span class="app-symbol">${icon('monitor')}</span>把工作带到手边</div><div class="hero-label classroom"><span class="app-symbol classroom">${icon('book')}</span>跟上每一个问题</div><span class="hero-small-plus" aria-hidden="true">+</span></div></section>
      <section class="section" id="products" aria-labelledby="products-title"><div class="section-head"><div><div class="eyebrow">我们的产品</div><h2 id="products-title">各有专长，一样顺手。</h2></div><p>选择适合你的工具。<br>每一个 App，都围绕一件具体的事。</p></div><div class="product-grid">
        <article class="product-card"><div class="product-info"><div class="product-title-row"><h3>KyRemote</h3></div><h4>把工作，带到手边。</h4><p>在 iPhone 和 iPad 上连接 Mac 中的 DSH，<br>查看进度、继续对话，让思路接得上。</p><div class="product-meta">iPhone · iPad <span>/</span> 开发测试中</div><div class="product-bottom"><a class="link" href="#/product/kyremote">了解 KyRemote ${icon('chevron',true)}</a></div></div><div class="product-visual">${miniRemote()}</div></article>
        <article class="product-card"><div class="product-info"><div class="product-title-row"><h3>课堂 AI 助手</h3></div><h4>专心听课，也跟得上提问。</h4><p>课堂语音转写、提问识别与 AI 辅助回答，<br>为听课时需要帮助的那一刻准备。</p><div class="product-meta">为 iPad 设计 <span>/</span> 开发测试中</div><div class="product-bottom"><a class="link" href="#/product/classroom">了解课堂助手 ${icon('chevron',true)}</a></div></div><div class="product-visual classroom">${miniClassroom()}</div></article>
      </div></section>
      ${scenarioSection()}
      ${studioSection()}
      <section class="account-section" aria-labelledby="account-title"><div class="account-band"><div><div class="eyebrow">KyFold 账户</div><h2 id="account-title">不同的工具，<br>同一个你。</h2><p>用熟悉的方式登录，管理你的账户与关联服务。<br>Google、GitHub 或 Apple，都可以成为你的入口。</p><div class="account-cta"><a class="link" href="#/account-about">了解 KyFold 账户 ${icon('chevron',true)}</a><button class="link" data-action="demo-account">体验账户中心 ${icon('chevron',true)}</button></div></div><div class="identity-stack"><div class="identity-item">${providerIcon('github')}<span>GitHub</span></div><div class="identity-item">${google()}<span>Google</span></div><div class="identity-item">${icon('apple')}<span>Apple</span></div><div class="identity-item">${icon('link')}<span>一个 KyFold 账户</span><span>${icon('check',true)}</span></div></div></div></section>
      ${startSection()}
    </div></main>${footer()}`;
  }
  function studioSection() {
    return `<section class="studio-section" aria-labelledby="studio-title"><div class="studio-copy"><div class="eyebrow">KYFOLD COLOR STUDIO</div><h2 id="studio-title">同一个 K，<br>多一点你的颜色。</h2><p>从熟悉的蓝色开始，试出自己的配色。<br>独立调整每一片的颜色、渐变与高光，<br>再为它画一层柔和的背景。</p><div class="studio-actions"><a class="btn btn-primary" href="color-studio/index.html">打开调色工作台 ${icon('arrow',true)}</a><span>无需登录 · 浏览器本地编辑</span></div><ul class="studio-capabilities"><li>${icon('settings',true)}RGB 精调与三色渐变</li><li>${icon('sun',true)}原版高光与颗粒调节</li><li>${icon('folder',true)}导出 SVG、PNG 与素材包</li></ul></div><div class="studio-showcase" aria-label="KyFold 图标与调色工具预览"><div class="studio-window-top"><span></span><span></span><span></span><small>你的下一种配色</small></div><div class="studio-icon-preview"><img src="assets/kyfold-icon.webp" alt="KyFold 原版蓝色图标" width="224" height="224"></div><div class="studio-swatches" aria-hidden="true"><i style="--swatch:#2563ff"></i><i style="--swatch:#8a4fff"></i><i style="--swatch:#16ba8a"></i><i style="--swatch:#ec762f"></i><i style="--swatch:#e5469a"></i></div><div class="studio-preview-caption"><span>从原版出发</span><span>颜色 · 渐变 · 光感</span></div></div></section>`;
  }
  function login() {
    return `<main id="main" tabindex="-1" class="login-shell page-in"><section class="login-intro"><div class="eyebrow">ONE ACCOUNT. YOUR KYFOLD.</div><h1>从一个账户，<br>连接你的每种可能。</h1><p>工作在继续，学习也在继续。<br>一个熟悉的身份，陪你使用不同的 KyFold 工具。</p><div class="login-illustration"><img src="assets/kyfold-icon.webp" alt="KyFold"><span class="login-connector" aria-hidden="true">${icon('link')}</span><div class="login-apps"><div><span class="app-symbol">${icon('monitor', true)}</span>KyRemote</div><div><span class="app-symbol classroom">${icon('book', true)}</span>课堂 AI 助手</div></div></div><div class="login-intro-foot">Your tools. Your account. Your way.</div></section><section class="login-main"><div class="login-form"><div class="eyebrow">WELCOME TO KYFOLD</div><h2>很高兴，在这里见到你。</h2><p>登录或创建你的 KyFold 账户。</p><div class="provider-buttons"><button class="provider-button github" data-action="login-provider" data-provider="github" aria-haspopup="dialog">${icon('github')}通过 GitHub 继续</button><button class="provider-button" data-action="login-provider" data-provider="google" aria-haspopup="dialog">${google()}通过 Google 继续</button><button class="provider-button" data-action="login-provider" data-provider="apple" aria-haspopup="dialog">${icon('apple')}通过 Apple 继续</button></div><div class="divider">或使用邮箱</div><form id="email-login" novalidate><div class="field"><label for="email">邮箱地址</label><input id="email" name="email" type="email" autocomplete="email" placeholder="name@example.com" aria-describedby="login-error" required></div><div class="field"><label for="code">验证码</label><div class="input-row"><input id="code" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" placeholder="6 位验证码" maxlength="6" aria-describedby="login-error" required><button type="button" class="btn btn-secondary" data-action="send-code">获取验证码</button></div></div><p class="field-error" id="login-error" role="alert" hidden></p><button class="btn btn-primary full" type="submit">继续 ${icon('arrow', true)}</button></form><p class="form-note">继续即表示你了解本次预览。<a href="#/terms">服务条款</a>与<a href="#/privacy">隐私政策</a>页面也可查看。</p><div class="demo-note">${icon('info', true)}<span>当前为 UI 预览，不会连接真实账户。<br>点击任意登录方式即可体验；邮箱验证码为 123456。</span></div><div class="demo-entry"><button data-action="demo-account">直接体验账户中心 ${icon('arrow', true)}</button></div></div></section></main>`;
  }
  const panels = [ ['overview','grid','账户概览'], ['identities','link','登录与绑定'], ['security','shield','设备与安全'], ['preferences','settings','偏好设置'] ];
  function accountPage(part) {
    const active = panels.some(p => p[0] === part) ? part : 'overview';
    const labels = Object.fromEntries(panels.map(p => [p[0], p[2]]));
    return `<main id="main" tabindex="-1" class="account-layout page-in"><aside class="account-sidebar" aria-label="账户导航"><div class="sidebar-profile"><span class="avatar">K</span><div><strong>${escapeHTML(state.name)}</strong><p>你的 KyFold 账户</p></div></div><nav class="account-nav">${panels.map(([key, symbol, label]) => `<button data-action="account-tab" data-tab="${key}" class="${active === key ? 'active' : ''}" ${active === key ? 'aria-current="page"' : ''}>${icon(symbol)}${label}</button>`).join('')}</nav><div class="sidebar-bottom"><a href="#/help">${icon('help', true)}帮助与支持</a><a href="#/">${icon('back', true)}返回官网</a><button data-action="logout">${icon('logout', true)}退出登录</button></div></aside><section class="account-content"><div class="account-width"><div class="account-breadcrumb">KyFold 账户 ${icon('chevron', true)} ${labels[active]}</div><div class="account-page-heading"><div><h1>${active === 'overview' ? '一切，从这里继续。' : labels[active]}</h1><p>${({overview:'管理你的身份，也连接你的工具。',identities:'用你熟悉的方式，登录同一个 KyFold 账户。',security:'了解你的登录设备，管理账户访问。',preferences:'把熟悉的使用习惯，留在这里。'})[active]}</p></div><span class="badge blue">个人账户</span></div><div class="preview-notice">${icon('info', true)}这是演示账户，绑定、设备与资料修改仅保存在当前浏览器。</div>${({overview:overviewPanel,identities:identitiesPanel,security:securityPanel,preferences:preferencesPanel})[active]()}</div></section></main>`;
  }
  function overviewPanel() {
    return `<section class="panel profile-panel"><span class="avatar">K</span><div><h2>${escapeHTML(state.name)}</h2><p>demo@example.com · 演示账户</p></div><button class="btn btn-secondary btn-sm" data-action="edit-profile">编辑资料</button></section><div class="account-section-heading"><span>我的 KyFold 工具</span><a href="#/products">查看产品</a></div><div class="account-apps"><a href="#/product/kyremote" class="account-app"><span class="app-symbol">${icon('monitor')}</span><div><strong>KyRemote</strong><p>远程工作 · 开发测试中</p></div>${icon('chevron')}</a><a href="#/product/classroom" class="account-app"><span class="app-symbol classroom">${icon('book')}</span><div><strong>课堂 AI 助手</strong><p>课堂学习 · 开发测试中</p></div>${icon('chevron')}</a></div><div class="account-summary"><section class="summary-item"><span>${icon('link',true)}登录方式</span><strong>${countBindings()} 种已绑定</strong><p>同一个账户，多一种选择。</p><button data-action="account-tab" data-tab="identities">管理登录方式 ${icon('arrow',true)}</button></section><section class="summary-item"><span>${icon('shield',true)}登录设备</span><strong>${state.ipad ? 2 : 1} 台演示设备</strong><p>随时查看并管理访问。</p><button data-action="account-tab" data-tab="security">查看设备 ${icon('arrow',true)}</button></section></div><p class="account-tip">${icon('key',true)}统一账户用于识别你的身份。各个 App 的设备授权、内容和使用权限，仍然分别管理。</p>`;
  }
  function identitiesPanel() {
    const details = { github:'kyfold-demo · 示例 GitHub 身份', google:'google-user@example.com · 示例身份', apple:'隐藏邮件地址 · 示例身份', email:'demo@example.com · 演示邮箱' };
    return `<section class="panel"><div class="panel-title"><div><h2>你的登录方式</h2><p>绑定后，即可用对应方式进入同一个账户。</p></div><span class="badge">${countBindings()} 种已绑定</span></div>${['github','google','apple','email'].map(provider => `<div class="identity-row"><span class="provider-symbol">${providerIcon(provider)}</span><div class="identity-copy"><strong>${providerNames[provider]}</strong><p>${state.bindings[provider] ? details[provider] : '尚未绑定，可以添加此登录方式'}</p></div><span class="badge ${state.bindings[provider] ? 'green' : ''}">${state.bindings[provider] ? '<span class="dot"></span>已绑定' : '未绑定'}</span><button class="btn ${state.bindings[provider] ? 'btn-secondary' : 'btn-primary'} btn-sm" data-action="binding" data-provider="${provider}" aria-label="${state.bindings[provider] ? '解绑' : '绑定'} ${providerNames[provider]}">${state.bindings[provider] ? '解绑' : '绑定'}</button></div>`).join('')}<p class="small-info">解绑只移除该登录入口，不会删除 KyFold 账户或 App 内容。请始终保留至少一种可用的登录方式。</p></section><p class="account-tip">${icon('shield',true)}真实上线时，新增绑定会要求验证对应的第三方账户；这里仅展示操作流程。</p>`;
  }
  function securityPanel() {
    return `<section class="panel"><div class="panel-title"><div><h2>登录设备</h2><p>以下设备为界面演示，不代表真实连接。</p></div><span class="badge">${state.ipad ? 2 : 1} 台设备</span></div><div class="security-device"><span class="provider-symbol">${icon('laptop')}</span><div class="device-info"><strong>当前浏览器</strong><p>KyFold 官网 · 当前演示会话</p></div><span class="badge green"><span class="dot"></span>当前设备</span></div>${state.ipad ? `<div class="security-device"><span class="provider-symbol">${icon('tablet')}</span><div class="device-info"><strong>iPad · 示例设备</strong><p>课堂 AI 助手 · 演示会话</p></div><button class="btn btn-secondary btn-sm" data-action="remove-device">移除</button></div>` : ''}<div class="security-footer">移除后，该设备需要重新登录。这不会影响其他设备上的会话。</div></section><section class="panel danger-panel"><div><h3>退出当前账户</h3><p>退出本次演示会话，已保存的绑定状态仍会保留。</p></div><button class="btn btn-secondary btn-sm" data-action="logout">退出登录</button></section><section class="panel danger-panel"><div><h3>重置演示数据</h3><p>清空当前浏览器中的预览资料，恢复初始状态。</p></div><button class="btn btn-danger btn-sm" data-action="reset">重置</button></section>`;
  }
  function preferencesPanel() {
    return `<section class="panel"><div class="panel-title"><div><h2>外观与使用习惯</h2><p>在这个浏览器中，记住你喜欢的样子。</p></div></div><div class="preferences"><label><span>界面外观<small>官网与账户中心共用同一套外观。</small></span><select id="appearance" aria-label="界面外观"><option value="light" ${state.theme==='light'?'selected':''}>浅色</option><option value="dark" ${state.theme==='dark'?'selected':''}>深色</option></select></label><label><span>界面语言<small>当前预览使用简体中文。</small></span><select aria-label="界面语言"><option>简体中文</option></select></label></div></section><p class="account-tip">${icon('info',true)}当前设置只作用于这份网页预览，不会更改 KyRemote 或课堂助手的设置。</p>`;
  }
  let activeScene = 'remote';
  let helpQuery = '';
  let helpCategory = 'all';
  const faqItems = [
    {id:'color-studio',group:'preview',q:'调色工作台需要登录吗？配色怎么保存？',a:'Color Studio 无需登录，颜色与画笔在当前浏览器中编辑。重要配色请点击“保存配色”另存工程，下次可以重新导入。高光与颗粒可以独立调节，支持 SVG、PNG 和完整素材包导出。工作台右上角也提供离线 HTML。'},
    {id:'brand',group:'product',q:'KyFold 是什么？',a:'KyFold 是 KyRemote、课堂 AI 助手等工具共同的软件品牌。它们围绕不同的使用场景独立开发；官网用于了解产品，统一账户则是正在设计中的共同身份入口。'},
    {id:'independent',group:'product',q:'需要同时使用两款 App 吗？',a:'不需要。远程工作选择 KyRemote，课堂学习选择课堂 AI 助手。你可以只使用需要的那一款，它们不需要合并成一个 App。'},
    {id:'release',group:'product',q:'现在可以下载 App 吗？',a:'两款产品目前都处于开发与测试阶段，尚未在这份官网预览中提供公开下载。页面中的界面为功能示意，实际功能与支持设备以发布时的说明为准。'},
    {id:'mac',group:'product',q:'KyRemote 需要一台 Mac 吗？',a:'当前设计面向运行 DSH 的 Mac，并在 iPhone 或 iPad 上查看和继续会话。Mac 端需要保持运行与可连接；具体连接和授权方式会随产品完善。'},
    {id:'classroom',group:'product',q:'课堂助手会一直录音吗？',a:'当前的产品方向是由你手动开启和停止课堂监听，并明确显示正在听课的状态。实际录音、后台运行和转写能力仍需以设备测试与最终版本为准。'},
    {id:'answers',group:'product',q:'AI 回答可以直接当作正确答案吗？',a:'不建议。课堂助手的目标是提供简答与思路提示，仍需要结合课程内容核对。缺少课件或图片时，应补充题目信息；不可靠的回答需要清楚提醒。'},
    {id:'identity',group:'account',q:'一个 KyFold 账户，和多个登录方式有什么关系？',a:'KyFold 账户是你的共同身份。GitHub、Google、Apple 或邮箱可以作为同一个身份的不同登录入口；统一账户目前还处于界面设计阶段。'},
    {id:'binding',group:'account',q:'如何把已有账户和 Google、GitHub 关联？',a:'设计流程是先登录 KyFold，再进入“登录与绑定”，验证并添加另一种登录方式。新增入口应关联到当前身份。预览中的绑定只是模拟，不会连接真实的第三方账户。'},
    {id:'data',group:'account',q:'统一账户，会把两个 App 的内容混在一起吗？',a:'不会因为身份统一就自动合并所有内容。远程设备授权、课堂记录和各产品的使用权限应分别管理；具体的数据规则会在实际接入后说明。'},
    {id:'unbind',group:'account',q:'解绑后，KyFold 账户会被删除吗？',a:'解绑只移除一个登录入口，不等于删除 KyFold 账户。预览会要求至少保留一种可用的登录方式；正式服务也需要在验证身份后处理这类操作。'},
    {id:'preview',group:'preview',q:'这份网页里，哪些操作可以体验？',a:'你可以切换使用情境、浏览产品流程、搜索帮助，以及体验模拟登录、绑定、昵称修改和设备管理。当前没有真实 OAuth、设备连接、邮件发送或云端同步。'},
    {id:'storage',group:'preview',q:'预览里的资料保存在哪里？',a:'演示昵称、登录方式、示例设备和外观偏好只保存在当前浏览器。邮箱表单不会保存输入的邮箱。账户中心“设备与安全”中的“重置演示数据”可以恢复初始演示状态。'}
  ];
  const faqMarkup = items => items.map(item => `<details class="faq"><summary>${item.q}${icon('plus')}</summary><p>${item.a}</p></details>`).join('');
  function scenarioSection() {
    return `<section class="story-section" aria-labelledby="story-title"><div class="section-head"><div><div class="eyebrow">在每个需要的时候</div><h2 id="story-title">把工具，放进真实的一天。</h2></div><p>从一个具体的场景开始，<br>看看它可以怎样帮上忙。</p></div><div class="scene-tabs" role="tablist" aria-label="选择使用情境"><button id="scene-remote" role="tab" aria-selected="${activeScene==='remote'}" aria-controls="scene-panel" tabindex="${activeScene==='remote'?0:-1}" data-action="scene" data-scene="remote">${icon('monitor',true)}离开工位时</button><button id="scene-classroom" role="tab" aria-selected="${activeScene==='classroom'}" aria-controls="scene-panel" tabindex="${activeScene==='classroom'?0:-1}" data-action="scene" data-scene="classroom">${icon('book',true)}回到课堂时</button></div><div id="scene-panel" class="scene-panel" role="tabpanel" tabindex="0" aria-labelledby="scene-${activeScene}">${sceneContent(activeScene)}</div></section>`;
  }
  function sceneContent(key) {
    const classroom=key==='classroom';
    return `<div class="scene-copy"><span class="scene-kicker">${classroom?'课堂 AI 助手 / 听课时':'KyRemote / 离开桌面后'}</span><h3>${classroom?'听到问题，<br>有思路可以接上。':'电脑留在桌上，<br>思路跟你一起走。'}</h3><p>${classroom?'把正在讲的内容变成可回看的文字。遇到提问时，先看简答，再理解原因。':'有时只是想知道任务进行到哪里，或补充一句想法。打开手机，回到那段熟悉的对话。'}</p><ol class="scene-points">${(classroom?['由你开启，清楚知道何时在听课','发现提问，简答与原因一起呈现','需要图像信息时，再补充照片']:['找到自己的 Mac 与工作区','查看对话和任务上下文','补充消息，继续手边的工作']).map((t,i)=>`<li><span>0${i+1}</span>${t}</li>`).join('')}</ol><a class="link" href="#/product/${classroom?'classroom':'kyremote'}">进一步了解 ${icon('chevron',true)}</a></div><div class="scene-stage ${classroom?'is-classroom':''}"><div class="scene-demo ${classroom?'lesson-demo':'remote-demo'}"><div class="scene-demo-top"><span>${icon(classroom?'book':'monitor',true)}${classroom?'课堂 AI 助手':'KyRemote'}</span><small>界面示意</small></div>${classroom?`<div class="lesson-heading"><div><small>今天的课堂</small><h4>数据结构</h4></div><span class="lesson-listening">${icon('mic',true)}正在听课</span></div><div class="transcript-line"><time>00:28</time><p>“栈和队列的区别是什么？”</p></div><div class="answer-example"><span>提问提示</span><h4>栈后进先出，<br>队列先进先出。</h4><p><strong>为什么？</strong> 栈从同一端进出；队列从一端进入、另一端离开。</p></div><div class="demo-fineprint">AI 辅助内容，需要结合课程核对。</div>`:`<div class="remote-context"><span class="app-symbol">${icon('laptop')}</span><div><strong>我的 Mac</strong><p>DSH 开发 / KyFold</p></div><span class="sample-tag">示例</span></div><div class="remote-task"><span>继续之前的对话</span><h4>完善 KyFold 的账户界面</h4><p>工作区、会话与上下文，<br>都有一个熟悉的入口。</p></div><div class="demo-message">${icon('message',true)}先把绑定流程整理清楚，我回来继续。</div><div class="demo-composer"><span>继续这段对话…</span><span>${icon('arrow',true)}</span></div>`}</div><p class="stage-caption">${classroom?'从听清内容，到理解问题。':'从查看进度，到继续对话。'}<span>产品功能设计示意</span></p></div>`;
  }
  function selectScene(key,focus=false) {
    if(!['remote','classroom'].includes(key))return;
    activeScene=key;
    root.querySelectorAll('[data-action="scene"]').forEach(button=>{const selected=button.dataset.scene===key;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;if(selected&&focus)button.focus();});
    const panel=document.getElementById('scene-panel');if(panel){panel.innerHTML=sceneContent(key);panel.setAttribute('aria-labelledby','scene-'+key);}
  }
  function startSection() {
    return `<section class="start-section" aria-labelledby="start-title"><div class="start-intro"><div class="eyebrow">从这里开始</div><h2 id="start-title">再多了解一点。</h2><p>选适合自己的工具，<br>也弄清它们之间的关系。</p><a class="link" href="#/help">前往帮助中心 ${icon('chevron',true)}</a></div><div class="start-questions">${faqMarkup(faqItems.filter(f=>['independent','release','identity','data'].includes(f.id)))}</div></section>`;
  }
  function accountIntro() {
    return `<main id="main" tabindex="-1" class="page-in"><div class="container"><section class="identity-hero"><div class="eyebrow">KYFOLD 账户</div><h1>入口，可以有很多。<br>你，始终是同一个。</h1><p>将熟悉的登录方式，关联到一个 KyFold 身份。<br>使用不同的工具，也有一个共同的账户入口。</p><div class="identity-hero-actions"><a href="#/${state.logged?'account':'login'}" class="btn btn-primary">${state.logged?'进入账户中心':'登录 KyFold'} ${icon('arrow',true)}</a><button class="link" data-action="demo-account">体验账户中心 ${icon('chevron',true)}</button></div><div class="identity-map" aria-label="多个登录入口关联同一个 KyFold 账户"><div class="identity-providers">${['github','google','apple','email'].map(key=>`<div>${providerIcon(key)}<span>${providerNames[key]}</span></div>`).join('')}</div><div class="identity-junction">${icon('link')}<span>一个 KyFold 账户</span></div><div class="identity-destinations"><span>${icon('monitor',true)}KyRemote</span><span>${icon('book',true)}课堂 AI 助手</span></div></div><p class="section-caption">统一账户设计预览 · 尚未连接真实第三方账户</p></section><section class="account-explainer" aria-labelledby="identity-control-title"><div><div class="eyebrow">清楚地关联，也清楚地管理</div><h2 id="identity-control-title">少记一个身份，<br>多一种选择。</h2><p>统一的是账户入口。<br>每个 App 仍然围绕自己的事，保持独立。</p></div><div class="account-explainer-list"><article>${icon('key')}<div><h3>选择熟悉的登录方式</h3><p>在同一个身份下添加不同入口。换一种登录方式，也能回到自己的 KyFold 账户。</p></div></article><article>${icon('user')}<div><h3>在一处管理账户资料</h3><p>查看昵称、关联的登录方式和账户设备，常用的管理操作有一个清楚的位置。</p></div></article><article>${icon('shield')}<div><h3>产品权限，分别确认</h3><p>远程设备授权与课堂内容属于不同场景，身份统一不等于所有内容自动共享。</p></div></article></div></section><section class="process-section"><div class="section-head"><div><div class="eyebrow">关联流程</div><h2>熟悉的方式，再加一种。</h2></div><p>先进入自己的账户，<br>再添加另一个登录入口。</p></div>${stepsMarkup([['登录 KyFold','通过已有方式进入你的账户，先确认当前身份。'],['添加登录方式','在“登录与绑定”中选择 Google、GitHub、Apple 或邮箱。'],['确认关联','验证所选身份后，回到同一个账户；预览会用确认弹窗模拟这一步。']])}</section><section class="account-faq-block"><div class="small-section-head"><h2>关于你的账户。</h2><a href="#/help" class="link">更多问题 ${icon('chevron',true)}</a></div>${faqMarkup(faqItems.filter(f=>['binding','data','unbind'].includes(f.id)))}</section><section class="detail-status"><div><h3>先体验一下，看看是否顺手。</h3><p>演示账户可以体验绑定、资料与设备管理。所有操作只影响当前浏览器。</p></div><button class="btn btn-primary btn-sm" data-action="demo-account">体验账户中心 ${icon('arrow',true)}</button></section></div></main>${footer()}`;
  }
  const productStories = {
    kyremote:{stepsTitle:'三步，把进度接回手边。',steps:[['准备好 Mac','让运行 DSH 的 Mac 保持可连接，桌面的工作是会话的来源。'],['找到工作区','在 iPhone 或 iPad 上选择自己的设备，再进入对应项目。'],['继续这段对话','查看已有上下文，补充想法，让工作接着往下走。']],specs:[['移动端','面向 iPhone 与 iPad'],['工作来源','运行 DSH 的 Mac'],['使用场景','查看进度、浏览会话、继续对话'],['当前阶段','开发与测试，暂未公开下载']],faqIds:['mac','independent','release'],focus:'把注意力留给会话。',focusText:'从移动设备找到项目、读懂上下文，再发送下一条消息。KyRemote 围绕远程 Agent 工作设计，让小屏幕上的常用操作更清楚。'},
    classroom:{stepsTitle:'跟着课堂，一步一步来。',steps:[['手动开始听课','在需要时开启监听，清楚看到当前的听课状态。'],['抓住那个问题','从课堂文字中发现提问，先看简答，再看一句话原因。'],['补全信息，再核对','依赖课件时补充照片；遇到不可靠的回答，回到课程内容核对。']],specs:[['主要设备','优先为 iPad 设计'],['课堂输入','语音转写与补充照片'],['辅助内容','提问提示、简答与原因'],['当前阶段','开发与测试，能力验证中']],faqIds:['classroom','answers','release'],focus:'先听懂，再给一点帮助。',focusText:'课堂里的问题不总是完整的文字。除了转写与简答，产品也在围绕提问提示、补充视觉信息和回答可靠性提醒继续打磨。'}
  };
  function stepsMarkup(steps) {
    return `<ol class="process-grid">${steps.map(([title,text],i)=>`<li><span class="process-number">0${i+1}</span><h3>${title}</h3><p>${text}</p></li>`).join('')}</ol>`;
  }
  const products = {
    kyremote:{name:'KyRemote',symbol:'monitor',tagline:'把工作，<br>带到手边。',description:'离开桌面，思路不用停。在 iPhone 和 iPad 上，连接 Mac 中的 DSH，接着查看项目、发送消息，与 Agent 一起把工作继续下去。',platform:'iPhone · iPad · 连接你的 Mac',features:[['laptop','连接自己的 Mac','选择设备并确认连接，在移动设备上继续桌面的工作。'],['folder','熟悉的工作空间','按工作区找到对话，让项目与上下文更容易接上。'],['message','继续与 Agent 对话','查看会话、发送消息，关注手边任务的进展。']]},
    classroom:{name:'课堂 AI 助手',symbol:'book',tagline:'专心听课，<br>也跟得上提问。',description:'面向 iPad 的课堂辅助工具。围绕实时语音转写、提问识别与 AI 辅助回答展开，让听课时需要帮助的那一刻，有一个清楚的入口。',platform:'优先为 iPad 设计',features:[['mic','课堂语音转写','手动开启与停止听课，保留可查看的课堂文字内容。'],['message','识别课堂提问','识别提问并辅助组织简答；回答仍需结合课程内容核对。'],['camera','补充视觉信息','在题意依赖课件或图片时补充照片，是正在完善的方向。']]}
  };
  function productPage(key) {
    const product=products[key],story=productStories[key];if(!product)return notFound();
    const classroom=key==='classroom';
    return `<main id="main" tabindex="-1" class="page-in"><div class="container"><div class="detail-top"><a href="#/products" class="back-link">${icon('back',true)}所有产品</a><a class="back-link" href="#/product/${classroom?'kyremote':'classroom'}">探索${classroom?' KyRemote':'课堂 AI 助手'} ${icon('chevron',true)}</a></div><section class="detail-hero"><div><div class="detail-app-name"><span class="app-symbol ${classroom?'classroom':''}">${icon(product.symbol)}</span>${product.name}<span class="badge">开发测试中</span></div><h1>${product.tagline}</h1><p>${product.description}</p><button class="btn btn-primary" data-action="product-status" data-product="${key}">了解体验进度 ${icon('arrow',true)}</button><p class="hero-footnote" style="margin:18px 0 0;font-size:11px">${icon(classroom?'tablet':'phone',true)}${product.platform}</p></div><div><div class="detail-visual ${classroom?'classroom':''}">${classroom?miniClassroom():miniRemote()}</div><p class="section-caption">功能界面示意 · 实际效果以产品发布为准</p></div></section><section class="feature-list" aria-label="产品方向">${product.features.map(([symbol,title,text])=>`<div>${icon(symbol)}<h3>${title}</h3><p>${text}</p></div>`).join('')}</section><section class="product-focus"><div class="focus-copy"><span class="eyebrow">围绕一件具体的事</span><h2>${story.focus}</h2><p>${story.focusText}</p></div><div class="focus-note">${icon(classroom?'book':'message')}<span>${classroom?'听课 → 发现问题 → 理解思路':'找到项目 → 查看上下文 → 继续对话'}</span><small>${classroom?'学习的节奏，仍然在你手里。':'让操作跟上想法。'}</small></div></section><section class="process-section"><div class="section-head"><div><div class="eyebrow">使用流程</div><h2>${story.stepsTitle}</h2></div><p>围绕日常需要设计，<br>让每一步都有明确的方向。</p></div>${stepsMarkup(story.steps)}<p class="section-caption align-left">以上为产品设计流程，具体功能与支持条件仍在完善。</p></section><section class="product-facts"><div><div class="eyebrow">关于这款工具</div><h2>开始之前，<br>先了解这些。</h2><p>当前为产品方向介绍，<br>尚未提供公开 App 下载。</p></div><dl>${story.specs.map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl></section><section class="product-faq-block"><div class="small-section-head"><h2>你可能还想知道。</h2><a href="#/help" class="link">帮助中心 ${icon('chevron',true)}</a></div>${faqMarkup(story.faqIds.map(id=>faqItems.find(item=>item.id===id)))}</section><section class="detail-status"><div><h3>正在认真打磨，先让它真正好用。</h3><p>目前处于开发与测试阶段；这份官网预览暂不提供公开下载。</p></div><a class="btn btn-secondary btn-sm" href="#/account-about">了解 KyFold 账户 ${icon('arrow',true)}</a></section></div></main>${footer()}`;
  }
  function filteredFAQs() {
    const query=helpQuery.trim().toLocaleLowerCase();return faqItems.filter(item=>(helpCategory==='all'||item.group===helpCategory)&&(!query||(item.q+' '+item.a).toLocaleLowerCase().includes(query)));
  }
  function helpResults() {
    const items=filteredFAQs();return items.length?faqMarkup(items):`<div class="help-empty">${icon('help')}<h2>暂时没有找到相关问题。</h2><p>试试“账户”“下载”或“课堂”，也可以查看全部问题。</p><button class="link" data-action="help-reset">查看全部问题 ${icon('arrow',true)}</button></div>`;
  }
  function refreshHelp() {
    const results=document.getElementById('help-results');if(!results)return;
    results.innerHTML=helpResults();document.getElementById('help-count').textContent=filteredFAQs().length+' 个相关问题';
    root.querySelectorAll('[data-action="help-category"]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.category===helpCategory)));
  }
  function help() {
    return `<main id="main" tabindex="-1" class="help-page page-in"><div class="help-heading"><div class="eyebrow">KYFOLD 帮助中心</div><h1>有些问题，<br>我们先回答。</h1><p>关于产品、统一账户，以及这份网页预览。</p><div class="help-search" role="search">${icon('help')}<label class="sr-only" for="help-search">搜索常见问题</label><input id="help-search" type="search" placeholder="搜索问题，例如：绑定、下载、课堂" value="${escapeHTML(helpQuery)}" autocomplete="off" aria-controls="help-results"></div></div><div class="help-quicklinks"><a href="#/product/kyremote">${icon('monitor')}<span>KyRemote<small>设备与远程会话</small></span>${icon('chevron',true)}</a><a href="#/product/classroom">${icon('book')}<span>课堂 AI 助手<small>听课与提问辅助</small></span>${icon('chevron',true)}</a><a href="#/account-about">${icon('link')}<span>KyFold 账户<small>登录方式与关联</small></span>${icon('chevron',true)}</a></div><section class="help-questions" aria-labelledby="help-question-title"><div class="help-results-head"><h2 id="help-question-title">常见问题</h2><span id="help-count" role="status" aria-live="polite">${filteredFAQs().length} 个相关问题</span></div><div class="help-filters" aria-label="筛选问题类别">${[['all','全部'],['product','产品使用'],['account','账户与绑定'],['preview','网页预览']].map(([key,label])=>`<button data-action="help-category" data-category="${key}" aria-pressed="${helpCategory===key}">${label}</button>`).join('')}</div><div id="help-results">${helpResults()}</div></section><div class="help-contact">${icon('message')}<div><h3>还有想说的？</h3><p>告诉我们是哪个产品、在哪一步遇到了问题。</p></div><button class="btn btn-secondary btn-sm" data-action="feedback">反馈与建议</button></div></main>${footer()}`;
  }
  function legal(type) {
    const privacy = type === 'privacy';
    return `<main id="main" tabindex="-1" class="text-page legal-copy page-in"><div class="eyebrow">KYFOLD · ${privacy?'PRIVACY':'TERMS'}</div><h1>${privacy?'隐私说明':'使用说明'}</h1><p class="lead">当前版本为官网与账户中心的交互原型。</p><div class="legal-note">这是预览说明，正式上线前需要根据实际服务补充完整的隐私政策与服务条款。</div>${privacy ? '<h2>这份预览会保存什么？</h2><p>当前浏览器会保存演示登录状态、演示账户昵称、登录方式绑定状态、示例设备状态和外观偏好。邮箱登录表单不会保存你输入的邮箱。</p><h2>会连接我的第三方账户吗？</h2><p>不会。Google、GitHub、Apple 和邮箱按钮只展示交互效果，不会打开真实授权，也不会获取这些账户的数据。</p><h2>如何清除演示数据？</h2><p>进入账户中心的“设备与安全”，选择“重置演示数据”；也可以清除此站点的浏览器本地数据。</p>' : '<h2>预览范围</h2><p>你可以浏览产品介绍，体验模拟登录、账户绑定、资料修改和设备管理。这些操作不提供真实身份验证、设备连接、云端同步或付费服务。</p><h2>产品状态</h2><p>KyRemote 和课堂 AI 助手处于开发测试阶段。页面中的小型界面为功能示意，不代表最终版本或公开发布承诺。</p><h2>账户操作</h2><p>所有账户信息与绑定状态均为演示数据，仅影响当前浏览器中的预览。请勿在演示过程中输入密码、密钥或其他敏感信息。</p>'}<p style="margin-top:32px"><a class="link" href="#/help">返回帮助中心 ${icon('arrow',true)}</a></p></main>${footer()}`;
  }
  function notFound() { return `<main id="main" tabindex="-1" class="text-page"><div class="eyebrow">KYFOLD</div><h1>这条路，暂时还没铺好。</h1><p class="lead">回到首页，看看已经准备好的内容。</p><a href="#/" class="btn btn-primary">返回首页 ${icon('arrow',true)}</a></main>${footer()}`; }
  function render(options = {}) {
    const route = currentRoute();
    document.documentElement.dataset.theme = state.theme;
    let content, title = '让工作与学习，顺手一点。';
    if (route === 'home' || route === 'products') content = home();
    else if (route === 'login') {content=login();title='登录你的 KyFold 账户';}
    else if (route === 'account-about') {content=accountIntro();title='一个账户，多种登录方式';}
    else if (route.startsWith('account')) { if(!state.logged){location.hash='/login';return;} content=accountPage(route.split('/')[1] || 'overview');title='账户中心'; }
    else if (route.startsWith('product/')) { const key=route.split('/')[1];content=productPage(key);title=products[key]?.name || '页面未找到'; }
    else if (route === 'help') {content=help();title='帮助与支持';}
    else if (route==='privacy'||route==='terms') {content=legal(route);title=route==='privacy'?'隐私说明':'使用说明';}
    else {content=notFound();title='页面未找到';}
    root.innerHTML = header(route) + content;
    document.title='KyFold · '+title;
    if(!options.keepScroll){window.scrollTo({top:0,behavior:'instant'});root.querySelector('main')?.focus({preventScroll:true});}
    if(route==='products'&&!options.keepScroll) requestAnimationFrame(()=>document.getElementById('products')?.scrollIntoView({behavior:'instant',block:'start'}));
  }
  function openModal({title,text,html='',symbol='info',confirm='知道了',onConfirm=null,danger=false,cancel=true}) {
    modalHandler=onConfirm;
    dialogContent.innerHTML=`<div class="modal-content"><button class="icon-btn modal-close" data-modal="cancel" aria-label="关闭">${icon('close')}</button><div class="modal-icon">${icon(symbol)}</div><h2 id="dialog-title">${escapeHTML(title)}</h2><p>${text}</p>${html}<div class="modal-actions">${cancel?'<button class="btn btn-secondary" data-modal="cancel">取消</button>':''}<button class="btn ${danger?'btn-danger':'btn-primary'}" data-modal="confirm">${escapeHTML(confirm)}</button></div></div>`;
    dialog.showModal();
  }
  function loginDemo(provider='github') { state.logged=true;state.bindings[provider]=true;persist();location.hash='/account';if(currentRoute()==='account')render();toast('已进入 KyFold 演示账户'); }
  function setTheme(theme) {state.theme=theme==='dark'?'dark':'light';persist();render({keepScroll:true});}
  function showLoginError(message, field) {
    const error=document.getElementById('login-error');error.textContent=message;error.hidden=false;
    for(const id of ['email','code'])document.getElementById(id)?.setAttribute('aria-invalid',String(id===field));
    document.getElementById(field)?.focus();
  }
  root.addEventListener('input',event=>{
    if(event.target.id==='help-search'){helpQuery=event.target.value;refreshHelp();return;}
    if(event.target.id!=='email'&&event.target.id!=='code')return;
    event.target.removeAttribute('aria-invalid');
    const error=document.getElementById('login-error');if(error)error.hidden=true;
  });
  root.addEventListener('click', event => {
    const control=event.target.closest('[data-action]');if(!control)return;
    const action=control.dataset.action, provider=control.dataset.provider;
    if(action==='theme')setTheme(state.theme==='light'?'dark':'light');
    else if(action==='preview-info')openModal({title:'一份可以点击的设计预览',text:'你正在体验 KyFold 第一版的精简优化版与账户中心。所有登录、绑定和设备状态都是演示，不会连接真实账户。',symbol:'info',confirm:'继续看看',cancel:false});
    else if(action==='mobile-menu'){const menu=root.querySelector('.header-nav');const open=menu.classList.toggle('is-open');control.setAttribute('aria-expanded',String(open));control.setAttribute('aria-label',open?'收起导航':'展开导航');}
    else if(action==='scene')selectScene(control.dataset.scene);
    else if(action==='help-category'&&['all','product','account','preview'].includes(control.dataset.category)){helpCategory=control.dataset.category;refreshHelp();}
    else if(action==='help-reset'){helpQuery='';helpCategory='all';const search=document.getElementById('help-search');if(search)search.value='';refreshHelp();search?.focus();}
    else if(action==='demo-account')loginDemo();
    else if(action==='login-provider'&&providerNames[provider])openModal({title:'通过 '+providerNames[provider]+' 继续',text:'真实版本会在这里打开官方授权。当前不进行授权，直接使用演示身份进入同一个 KyFold 账户。',symbol:provider==='google'?'user':provider,confirm:'以演示身份继续',onConfirm:()=>loginDemo(provider)});
    else if(action==='account-tab'){const target='/account/'+control.dataset.tab;if(location.hash==='#'+target)render();else location.hash=target;}
    else if(action==='logout')openModal({title:'退出当前账户？',text:'这将结束当前演示登录。账户昵称、绑定状态与外观偏好会保留在这个浏览器里。',symbol:'logout',confirm:'退出登录',onConfirm:()=>{state.logged=false;persist();location.hash='/';toast('已退出演示账户');}});
    else if(action==='binding'&&providerNames[provider]){
      const bound=state.bindings[provider];
      if(bound&&countBindings()<=1){openModal({title:'保留一种登录方式',text:'这是当前账户最后一种登录方式。请先绑定另一种方式，再进行解绑。',symbol:'key',confirm:'知道了',cancel:false});return;}
      openModal({title:(bound?'解绑 ':'绑定 ')+providerNames[provider],text:bound?'解绑后，不能再通过这个入口登录 KyFold。其他已绑定方式仍然可用。此次操作仅影响演示数据。':'确认后，'+providerNames[provider]+' 将作为这个 KyFold 账户的新登录入口。当前是模拟绑定，不会连接你的真实账户。',symbol:bound?'link':provider==='google'?'user':provider==='email'?'mail':provider,confirm:bound?'确认解绑':'确认绑定',onConfirm:()=>{state.bindings[provider]=!bound;persist();render({keepScroll:true});toast('已'+(bound?'解绑 ':'绑定 ')+providerNames[provider]+'（演示）');}});
    }
    else if(action==='edit-profile')openModal({title:'编辑个人资料',text:'一个熟悉的名字，出现在你的 KyFold 账户中。',symbol:'user',html:`<div class="field"><label for="profile-name">昵称</label><input id="profile-name" value="${escapeHTML(state.name)}" maxlength="20" autocomplete="off"><span class="field-error" id="profile-error" hidden>请输入 1–20 个字符的昵称。</span></div>`,confirm:'保存修改',onConfirm:()=>{const name=document.getElementById('profile-name').value.trim();if(!name||name.length>20){document.getElementById('profile-error').hidden=false;return false;}state.name=name;persist();render({keepScroll:true});toast('昵称已更新');}});
    else if(action==='remove-device')openModal({title:'移除这台 iPad？',text:'这是示例设备。确认后，它会从当前演示设备列表中移除。',symbol:'tablet',confirm:'移除设备',onConfirm:()=>{state.ipad=false;persist();render({keepScroll:true});toast('示例设备已移除');}});
    else if(action==='reset')openModal({title:'重置演示数据？',text:'演示昵称、登录方式和设备状态将恢复初始设置。这个操作不会影响任何真实账户或应用数据。',symbol:'settings',confirm:'重置演示',danger:true,onConfirm:()=>{const theme=state.theme;state=structuredClone(defaultState);state.theme=theme;state.logged=true;persist();location.hash='/account';render();toast('演示数据已重置');}});
    else if(action==='send-code'){
      const input=document.getElementById('email');const error=document.getElementById('login-error');
      if(!input.value.trim()||!input.checkValidity()){showLoginError('请先输入有效的邮箱地址。','email');return;}
      error.hidden=true;toast('演示验证码：123456。不会发送真实邮件。');document.getElementById('code').focus();
    }
    else if(action==='product-status')openModal({title:products[control.dataset.product].name+' · 正在开发',text:'产品仍在开发测试中。这份官网原型用于确认视觉和内容，暂不提供公开下载或试用申请。',symbol:'info',confirm:'了解了',cancel:false});
    else if(action==='feedback')openModal({title:'让反馈更容易被理解',text:'可以按下面的顺序描述，帮助我们知道具体发生了什么。当前预览不收集或发送反馈，你可以直接在对话中告诉我。',html:'<ol class="feedback-guide"><li><strong>哪个产品？</strong><span>KyRemote、课堂助手，或 KyFold 账户。</span></li><li><strong>在哪一步？</strong><span>描述你刚才进行了什么操作。</span></li><li><strong>希望怎样？</strong><span>说明实际看到的情况，以及期望的结果。</span></li></ol>',symbol:'message',confirm:'知道了',cancel:false});
  });
  root.addEventListener('submit',event=>{
    if(event.target.id!=='email-login')return;event.preventDefault();
    const email=document.getElementById('email'),code=document.getElementById('code'),error=document.getElementById('login-error');
    if(!email.value.trim()||!email.checkValidity()){showLoginError('请输入有效的邮箱地址。','email');return;}
    if(code.value.trim()!=='123456'){showLoginError('当前是演示登录，请输入验证码 123456。','code');return;}
    loginDemo('email');
  });
  root.addEventListener('change',event=>{if(event.target.id==='appearance')setTheme(event.target.value);});
  dialog.addEventListener('click',event=>{
    const action=event.target.closest('[data-modal]')?.dataset.modal;
    if(action==='cancel'){dialog.close();modalHandler=null;}
    else if(action==='confirm'){const callback=modalHandler;const result=callback?.();if(result!==false){dialog.close();modalHandler=null;}}
    else if(event.target===dialog){const b=dialog.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)dialog.close();}
  });
  root.addEventListener('keydown',event=>{if(!event.target.matches('[data-action="scene"]'))return;if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();selectScene(event.key==='Home'?'remote':event.key==='End'?'classroom':activeScene==='remote'?'classroom':'remote',true);}});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){root.querySelector('.header-nav')?.classList.remove('is-open');const toggle=root.querySelector('[data-action="mobile-menu"]');toggle?.setAttribute('aria-expanded','false');}});
  document.querySelector('.skip-link').addEventListener('click',event=>{event.preventDefault();document.getElementById('main')?.focus();});
  window.addEventListener('hashchange',()=>{if(dialog.open)dialog.close();render();});
  window.addEventListener('scroll',()=>root.querySelector('.site-header')?.classList.toggle('is-scrolled',window.scrollY>8),{passive:true});
  render();
})();
