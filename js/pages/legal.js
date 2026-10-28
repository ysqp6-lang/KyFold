/* KyFold · legal.js
   隐私说明、使用说明与 404。
   零构建：按 index.html 中的顺序以普通 <script> 加载，各文件共享同一个全局词法作用域。 */
'use strict';

  function legal(type) {
    const privacy = type === 'privacy';
    return `<main id="main" tabindex="-1" class="text-page legal-copy page-in"><div class="eyebrow">KYFOLD · ${privacy?'PRIVACY':'TERMS'}</div><h1>${privacy?'隐私说明':'使用说明'}</h1><p class="lead">当前版本为官网与账户中心的交互原型。</p><div class="legal-note">这是预览说明，正式上线前需要根据实际服务补充完整的隐私政策与服务条款。</div>${privacy ? '<h2>这份预览会保存什么？</h2><p>当前浏览器会保存演示登录状态、演示账户昵称、登录方式绑定状态、示例设备状态和外观偏好。邮箱登录表单不会保存你输入的邮箱。</p><h2>会连接我的第三方账户吗？</h2><p>不会。Google、GitHub、Apple 和邮箱按钮只展示交互效果，不会打开真实授权，也不会获取这些账户的数据。</p><h2>调色工作台的数据在哪里？</h2><p>配色和画笔在当前浏览器本地处理，自动记忆与浏览器及网站地址有关。请使用“保存配色”下载工程，以便备份或在其他设备重新导入。</p><h2>如何清除演示数据？</h2><p>账户中心的“重置演示数据”只重置账户预览；调色工作台的“恢复原始蓝色稿”会清除当前配色与画笔。你也可以清除此站点的浏览器本地数据。</p>' : '<h2>预览范围</h2><p>你可以浏览产品介绍，体验模拟登录、账户绑定、资料修改和设备管理。这些操作不提供真实身份验证、设备连接、云端同步或付费服务。</p><h2>产品状态</h2><p>KyRemote 和课堂 AI 助手处于开发测试阶段。页面中的小型界面为功能示意，不代表最终版本或公开发布承诺。</p><h2>账户操作</h2><p>所有账户信息与绑定状态均为演示数据，仅影响当前浏览器中的预览。请勿在演示过程中输入密码、密钥或其他敏感信息。</p>'}<p style="margin-top:32px"><a class="link" href="#/help">返回帮助中心 ${icon('arrow',true)}</a></p></main>${footer()}`;
  }
  function notFound() { return `<main id="main" tabindex="-1" class="text-page"><div class="eyebrow">KYFOLD</div><h1>这条路，暂时还没铺好。</h1><p class="lead">回到首页，看看已经准备好的内容。</p><a href="#/" class="btn btn-primary">返回首页 ${icon('arrow',true)}</a></main>${footer()}`; }
