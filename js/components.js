/* KyFold · components.js
   跨页面复用的小组件：品牌、页头、页脚、手机端窗口示意、FAQ/流程列表、弹窗。
   零构建：按 index.html 中的顺序以普通 <script> 加载，各文件共享同一个全局词法作用域。 */
'use strict';

  const brand = (footer = false) => '<a class="brand' + (footer ? ' footer-brand' : '') + '" href="#/" aria-label="KyFold 首页"><img src="assets/kyfold-icon.webp" alt=""><span class="brand-word">KyFold</span></a>';
  function header(route) {
    return `<header class="site-header"><div class="container header-inner">${brand()}<nav class="header-nav" aria-label="主导航"><a class="${route.startsWith('product') ? 'active' : ''}" href="#/products">产品</a><a class="${route.startsWith('account') || route === 'login' ? 'active' : ''}" href="#/${state.logged ? 'account' : 'account-about'}">KyFold 账户</a><a href="color-studio/index.html">调色工作台</a><a class="${route === 'help' ? 'active' : ''}" href="#/help">帮助</a></nav><div class="header-actions"><button class="icon-btn" data-action="theme" aria-label="切换为${state.theme === 'dark' ? '浅' : '深'}色外观">${icon(state.theme === 'dark' ? 'sun' : 'moon')}</button>${state.logged ? `<a class="account-trigger" href="#/account" aria-label="进入账户中心"><span class="avatar sm">K</span><span>账户中心</span></a>` : '<a class="btn btn-primary btn-sm" href="#/login">体验账户</a>'}<button class="icon-btn mobile-menu" data-action="mobile-menu" aria-label="展开导航" aria-expanded="false">${icon('menu')}</button></div></div></header>`;
  }
  function footer() {
    return `<footer class="footer"><div class="container"><div class="footer-directory"><div class="footer-brand-block">${brand(true)}<p>让工作与学习，顺手一点。</p><span>独立的工具，一个熟悉的账户。</span></div><nav aria-label="产品导航"><h2>探索产品</h2><a href="#/product/kyremote">KyRemote</a><a href="#/product/classroom">课堂 AI 助手</a><a href="#/products">所有产品</a><a href="color-studio/index.html">Color Studio 调色工作台</a></nav><nav aria-label="账户入口"><h2>KyFold 账户</h2><a href="#/account-about">了解统一账户</a><a href="#/${state.logged ? 'account' : 'login'}">${state.logged ? '进入账户中心' : '体验账户登录'}</a><button data-action="demo-account">体验账户中心</button></nav><nav aria-label="支持与说明"><h2>帮助与说明</h2><a href="#/about">关于 KyFold</a><a href="#/help">帮助中心</a><a href="#/privacy">隐私说明</a><a href="#/terms">使用说明</a></nav></div><div class="footer-bottom"><span>© ${new Date().getFullYear()} KyFold. A little simpler, a little closer.</span><span class="footer-note">${icon('info', true)}Color Studio 可使用 · 两款 App 开发测试中 · 账户操作为演示</span></div></div></footer>`;
  }
  function miniRemote() {
    return `<div class="mini-window" aria-label="KyRemote 工作区示意"><div class="mini-window-bar"><i></i><i></i><i></i><span>KyRemote</span></div><div class="mini-remote"><div class="mini-side"><div class="mini-brand">${icon('monitor', true)} KyRemote</div><div class="mini-device">${icon('laptop', true)} 我的 Mac</div><div class="mini-row active">${icon('folder', true)} DSH 开发</div><div class="mini-row">${icon('folder', true)} 学业</div><div class="mini-row">${icon('folder', true)} KyFold</div></div><div class="mini-main"><div class="mini-main-title">DSH 开发</div><div class="mini-meta">你的工作空间</div><div class="mini-convo"><span>${icon('message', true)} 继续今天的开发</span><small>刚刚</small></div><div class="mini-convo"><span>${icon('message', true)} 整理项目中的想法</span><small>12 分钟前</small></div><div class="mini-convo"><span>${icon('message', true)} 一起完善下一个版本</span><small>昨天</small></div></div></div></div>`;
  }
  function miniClassroom() {
    return `<div class="mini-window" aria-label="课堂 AI 助手功能示意"><div class="mini-window-bar"><i></i><i></i><i></i><span>课堂 AI 助手 · 界面示意</span></div><div class="mini-class"><div><div class="mini-lesson-title">数据结构</div><div class="mini-start">正在听课</div><div class="mini-question"><small>识别到提问</small>栈和队列的区别是什么？<div class="mini-answer">栈后进先出，队列先进先出。</div></div></div><div class="mini-transcript"><div class="mini-tabs"><strong>课堂转写</strong><span>原文</span></div><p><time>00:15</time>接下来，我们看两种常见的数据结构。</p><p><time>00:28</time>栈和队列的区别是什么？</p><p><time>00:42</time>可以从元素进入和离开的顺序来理解。</p></div></div></div>`;
  }
  const faqMarkup = items => items.map(item => `<details class="faq"><summary>${item.q}${icon('plus')}</summary><p>${item.a}</p></details>`).join('');
  function stepsMarkup(steps) {
    return `<ol class="process-grid">${steps.map(([title,text],i)=>`<li><span class="process-number">0${i+1}</span><h3>${title}</h3><p>${text}</p></li>`).join('')}</ol>`;
  }
  function openModal({title,text,html='',symbol='info',confirm='知道了',onConfirm=null,danger=false,cancel=true}) {
    modalHandler=onConfirm;
    dialogContent.innerHTML=`<div class="modal-content"><button class="icon-btn modal-close" data-modal="cancel" aria-label="关闭">${icon('close')}</button><div class="modal-icon">${icon(symbol)}</div><h2 id="dialog-title">${escapeHTML(title)}</h2><p>${text}</p>${html}<div class="modal-actions">${cancel?'<button class="btn btn-secondary" data-modal="cancel">取消</button>':''}<button class="btn ${danger?'btn-danger':'btn-primary'}" data-modal="confirm">${escapeHTML(confirm)}</button></div></div>`;
    dialog.showModal();
  }
