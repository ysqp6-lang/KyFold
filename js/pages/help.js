/* KyFold · help.js
   帮助中心：搜索、分类筛选与结果渲染。
   零构建：按 index.html 中的顺序以普通 <script> 加载，各文件共享同一个全局词法作用域。 */
'use strict';

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
    return `<main id="main" tabindex="-1" class="help-page page-in"><div class="help-heading"><div class="eyebrow">KYFOLD 帮助中心</div><h1>有些问题，<br>我们先回答。</h1><p>关于产品、账户、隐私与使用范围。</p><div class="help-search" role="search">${icon('help')}<label class="sr-only" for="help-search">搜索常见问题</label><input id="help-search" type="search" placeholder="搜索问题，例如：绑定、下载、课堂" value="${escapeHTML(helpQuery)}" autocomplete="off" aria-controls="help-results"></div></div><div class="help-quicklinks"><a href="#/product/kyremote">${icon('monitor')}<span>KyRemote<small>设备与远程会话</small></span>${icon('chevron',true)}</a><a href="#/product/classroom">${icon('book')}<span>课堂 AI 助手<small>听课与提问辅助</small></span>${icon('chevron',true)}</a><a href="#/account-about">${icon('link')}<span>KyFold 账户<small>登录、会话与数据</small></span>${icon('chevron',true)}</a></div><section class="help-questions" aria-labelledby="help-question-title"><div class="help-results-head"><h2 id="help-question-title">常见问题</h2><span id="help-count" role="status" aria-live="polite">${filteredFAQs().length} 个相关问题</span></div><div class="help-filters" aria-label="筛选问题类别">${[['all','全部'],['product','产品使用'],['account','账户与登录'],['preview','网页预览']].map(([key,label])=>`<button data-action="help-category" data-category="${key}" aria-pressed="${helpCategory===key}">${label}</button>`).join('')}</div><div id="help-results">${helpResults()}</div></section><div class="legal-note">账户服务会保存邮箱、昵称、登录方式、会话（含 IP 与浏览器信息）和审计事件；验证码只存摘要，注销会级联删除。详见 <a href="#/privacy" class="link" style="font-size:inherit">隐私说明</a> 与 <a href="#/terms" class="link" style="font-size:inherit">使用说明</a>。</div><div class="help-contact">${icon('message')}<div><h3>还有想说的？</h3><p>告诉我们是哪个产品、在哪一步遇到了问题。</p></div><button class="btn btn-secondary btn-sm" data-action="feedback">反馈与建议</button></div></main>${footer()}`;
  }
