/* KyFold · app.js
   入口：绑定全局事件后渲染首帧。
   零构建：按 index.html 中的顺序以普通 <script> 加载，各文件共享同一个全局词法作用域。 */
'use strict';

  /* OAuth 回调可能落到 /account?... 或 /login?...（服务端页面路由），
     这里统一转成前端 hash 路由，再交给 router 渲染。 */
  (function normalizeLegacyPath() {
    const match = /^\/(account|login)\/?$/.exec(location.pathname);
    if (!match) return;
    const query = location.search || '';
    location.replace('/#/' + match[1] + query);
  })();

  root.addEventListener('input', event => {
    if (event.target.id === 'help-search') { helpQuery = event.target.value; refreshHelp(); }
  });

  root.addEventListener('click', event => {
    const control = event.target.closest('[data-action]');
    if (!control) return;
    const action = control.dataset.action;
    if (action === 'theme') setTheme(state.theme === 'light' ? 'dark' : 'light');
    else if (action === 'preview-info') openModal({ title: '关于这份官网', text: '产品介绍、帮助、隐私与使用说明都可以直接查看。账户中心使用本机的 KyFold 账户服务：邮箱验证码登录真实可用，第三方登录按服务端配置显示可用或未配置。', symbol: 'info', confirm: '继续看看', cancel: false });
    else if (action === 'mobile-menu') { const menu = root.querySelector('.header-nav'); const open = menu.classList.toggle('is-open'); control.setAttribute('aria-expanded', String(open)); control.setAttribute('aria-label', open ? '收起导航' : '展开导航'); }
    else if (action === 'scene') selectScene(control.dataset.scene);
    else if (action === 'help-category' && ['all', 'product', 'account', 'preview'].includes(control.dataset.category)) { helpCategory = control.dataset.category; refreshHelp(); }
    else if (action === 'help-reset') { helpQuery = ''; helpCategory = 'all'; const search = document.getElementById('help-search'); if (search) search.value = ''; refreshHelp(); search?.focus(); }
    else if (action === 'demo-account') location.hash = '/login';
    else if (action === 'product-status') openModal({ title: products[control.dataset.product].name + ' · 内部测试', text: '两款 App 都已实现并进入内部测试，尚未公开发布：没有 App Store 上架、没有 TestFlight，也没有可分发的安装包。这份官网不提供下载或测试申请。', symbol: 'info', confirm: '了解了', cancel: false });
    else if (action === 'feedback') openModal({ title: '让反馈更容易被理解', text: '可以按下面的顺序描述，帮助我们知道具体发生了什么。当前页面不收集或发送反馈，你可以直接在对话中告诉负责人。', html: '<ol class="feedback-guide"><li><strong>哪个产品？</strong><span>KyRemote、课堂助手，或 KyFold 账户。</span></li><li><strong>在哪一步？</strong><span>描述你刚才进行了什么操作。</span></li><li><strong>希望怎样？</strong><span>说明实际看到的情况，以及期望的结果。</span></li></ol>', symbol: 'message', confirm: '知道了', cancel: false });
  });

  root.addEventListener('change', event => { if (event.target.id === 'appearance') setTheme(event.target.value); });

  dialog.addEventListener('click', event => {
    const action = event.target.closest('[data-modal]')?.dataset.modal;
    if (action === 'cancel') { dialog.close(); modalHandler = null; }
    else if (action === 'confirm') { const callback = modalHandler; const result = callback?.(); if (result !== false) { dialog.close(); modalHandler = null; } }
    else if (event.target === dialog) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close(); }
  });

  root.addEventListener('keydown', event => { if (!event.target.matches('[data-action="scene"]')) return; if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); selectScene(event.key === 'Home' ? 'remote' : event.key === 'End' ? 'classroom' : activeScene === 'remote' ? 'classroom' : 'remote', true); } });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') { root.querySelector('.header-nav')?.classList.remove('is-open'); const toggle = root.querySelector('[data-action="mobile-menu"]'); toggle?.setAttribute('aria-expanded', 'false'); } });
  document.querySelector('.skip-link').addEventListener('click', event => { event.preventDefault(); document.getElementById('main')?.focus(); });

  window.addEventListener('hashchange', () => { if (dialog.open) dialog.close(); accountMountedRoute = null; render(); });
  window.addEventListener('scroll', () => root.querySelector('.site-header')?.classList.toggle('is-scrolled', window.scrollY > 8), { passive: true });

  render();

  /* 首帧之后再问一次账户服务：只用于「账户说明页」的按钮文案，
     失败时保持未登录外观，不影响浏览。 */
  if (apiAvailable()) {
    accountApi.session().then(session => {
      if (session && session.user && currentRoute() === 'account-about') render({ keepScroll: true });
    }).catch(() => {});
  }
