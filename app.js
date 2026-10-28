/* KyFold · app.js
   入口：绑定全局事件后渲染首帧。
   零构建：按 index.html 中的顺序以普通 <script> 加载，各文件共享同一个全局词法作用域。 */
'use strict';

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
