/* KyFold · router.js
   路由表与整页渲染。
   零构建：按 index.html 中的顺序以普通 <script> 加载，各文件共享同一个全局词法作用域。 */
'use strict';

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
    else if (route === 'about') {content=aboutPage();title='关于 KyFold';}
    else if (route==='privacy'||route==='terms') {content=legal(route);title=route==='privacy'?'隐私说明':'使用说明';}
    else {content=notFound();title='页面未找到';}
    root.innerHTML = header(route) + content;
    document.title='KyFold · '+title;
    if(!options.keepScroll){window.scrollTo({top:0,behavior:'instant'});root.querySelector('main')?.focus({preventScroll:true});}
    if(route==='products'&&!options.keepScroll) requestAnimationFrame(()=>document.getElementById('products')?.scrollIntoView({behavior:'instant',block:'start'}));
  }
