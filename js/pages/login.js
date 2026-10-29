/* KyFold · login.js
   真实登录页：邮箱验证码（调用 KyFold 账户服务），第三方入口按 /api/config/providers 的真实状态渲染。
   服务不可用、未配置、限流、验证码错误等状态都会如实展示，不做「模拟成功」。 */
'use strict';

function login() {
  return `<main id="main" tabindex="-1" class="login-shell page-in"><section class="login-intro"><div class="eyebrow">ONE ACCOUNT. YOUR KYFOLD.</div><h1>从一个账户，<br>连接你的每种可能。</h1><p>工作在继续，学习也在继续。<br>一个熟悉的身份，陪你使用不同的 KyFold 工具。</p><div class="login-illustration"><img src="assets/kyfold-icon.webp" alt="KyFold"><span class="login-connector" aria-hidden="true">${icon('link')}</span><div class="login-apps"><div><span class="app-symbol">${icon('monitor', true)}</span>KyRemote</div><div><span class="app-symbol classroom">${icon('book', true)}</span>课堂 AI 助手</div></div></div><div class="login-intro-foot">Your tools. Your account. Your way.</div></section><section class="login-main"><div class="login-form"><div class="eyebrow">WELCOME TO KYFOLD</div><h2>登录你的 KyFold 账户。</h2><p>没有密码。用邮箱验证码登录，第一次登录会自动创建账户。</p><div id="service-state"></div><div class="provider-buttons" id="provider-buttons" aria-label="第三方登录方式"><div class="provider-skeleton" aria-hidden="true"></div></div><div class="divider">或使用邮箱</div><form id="email-login" novalidate><div class="field"><label for="email">邮箱地址</label><input id="email" name="email" type="email" autocomplete="email" placeholder="name@example.com" aria-describedby="login-error" required></div><div class="field"><label for="code">验证码</label><div class="input-row"><input id="code" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" placeholder="6 位验证码" maxlength="6" aria-describedby="login-error send-status" required><button type="button" class="btn btn-secondary" id="send-code" data-action="send-code">获取验证码</button></div><p class="field-note" id="send-status" role="status"></p></div><p class="field-error" id="login-error" role="alert" hidden></p><button class="btn btn-primary full" type="submit" id="submit-login">登录 / 注册 ${icon('arrow', true)}</button></form><p class="form-note">继续即表示你同意<a href="#/terms">使用说明</a>与<a href="#/privacy">隐私说明</a>。账户服务只保存必要的登录与服务信息。</p><div class="demo-note" id="local-note" hidden></div><p class="login-alt">还没有准备好？<a href="#/account-about">先了解 KyFold 账户</a>。</p></div></section></main>`;
}

let loginMounted = false;

function mountLogin() {
  loginMounted = true;
  const form = document.getElementById('email-login');
  if (!form) return;
  const emailInput = document.getElementById('email');
  const codeInput = document.getElementById('code');
  const sendButton = document.getElementById('send-code');
  const submitButton = document.getElementById('submit-login');
  const errorNode = document.getElementById('login-error');
  const statusNode = document.getElementById('send-status');
  const serviceNode = document.getElementById('service-state');
  const localNote = document.getElementById('local-note');
  const providerBox = document.getElementById('provider-buttons');

  let countdownTimer = null;
  let devCode = null;

  const setFormEnabled = (enabled) => {
    form.querySelectorAll('input, button').forEach((node) => {
      node.disabled = !enabled;
    });
    if (enabled && sendButton.dataset.cooldown === '1') sendButton.disabled = true;
  };

  const showError = (message, field) => {
    errorNode.textContent = message;
    errorNode.hidden = false;
    for (const [id, node] of [['email', emailInput], ['code', codeInput]]) {
      node.setAttribute('aria-invalid', String(id === field));
    }
    if (field) document.getElementById(field)?.focus();
  };
  const clearError = () => {
    errorNode.hidden = true;
    emailInput.removeAttribute('aria-invalid');
    codeInput.removeAttribute('aria-invalid');
  };

  const setBusy = (busy, label) => {
    submitButton.disabled = busy;
    sendButton.disabled = busy || sendButton.dataset.cooldown === '1';
    submitButton.textContent = busy ? (label || '正在处理…') : '登录 / 注册';
    if (!busy) submitButton.innerHTML = '登录 / 注册 ' + icon('arrow', true);
  };

  const startCountdown = (seconds) => {
    let left = seconds;
    sendButton.dataset.cooldown = '1';
    sendButton.disabled = true;
    const tick = () => {
      if (!document.body.contains(sendButton)) { clearInterval(countdownTimer); return; }
      sendButton.textContent = left + ' 秒后可重发';
      if (left <= 0) {
        clearInterval(countdownTimer);
        sendButton.dataset.cooldown = '0';
        sendButton.disabled = false;
        sendButton.textContent = '获取验证码';
        return;
      }
      left -= 1;
    };
    tick();
    countdownTimer = setInterval(tick, 1000);
  };

  const goNext = () => {
    const params = new URLSearchParams((location.search || '').replace(/^\?/, ''));
    const hashQuery = (location.hash.split('?')[1] || '');
    const nextFromHash = new URLSearchParams(hashQuery).get('next');
    const next = nextFromHash || params.get('next') || '/account';
    location.hash = next.startsWith('/') ? next : '/account';
  };

  /* ---------------- 第三方入口：按真实配置渲染 ---------------- */
  const providerNames = { github: 'GitHub', google: 'Google', apple: 'Apple' };
  const providerIconFor = (id) => (id === 'google' ? google() : icon(id));

  async function renderProviders() {
    try {
      const config = await accountApi.providers();
      const list = (config && config.providers) || [];
      if (!list.length) {
        providerBox.innerHTML = '<p class="provider-empty">账户服务没有提供第三方登录方式。</p>';
        return;
      }
      providerBox.innerHTML = list.map((provider) => {
        const name = providerNames[provider.id] || provider.name || provider.id;
        const available = provider.status === 'available';
        const statusText = available ? '可用' : provider.status === 'reserved' ? '预留' : '未配置';
        const note = provider.note || (available ? '' : (provider.status === 'reserved' ? '需要开发者账号与域名验证，本阶段未启用。' : '服务端还没有配置这家服务的客户端凭证。'));
        return `<button class="provider-button${available ? '' : ' is-disabled'}" type="button" data-provider-login="${provider.id}" ${available ? '' : 'disabled aria-disabled="true"'} aria-label="通过 ${name} 继续${available ? '' : '（' + statusText + '）'}">${providerIconFor(provider.id)}<span>通过 ${name} 继续</span><small>${statusText}</small></button>` +
          (available ? '' : (provider.status === 'reserved' ? `<p class="provider-note" data-provider-note="${provider.id}">${note}</p>` : ''));
      }).join('');
      if (list.some((provider) => provider.status !== 'available')) {
        providerBox.insertAdjacentHTML('beforeend', '<p class="provider-note provider-note-all">带「未配置」或「预留」的方式，需要服务端先配置对应的客户端凭证与回调地址；配置好后这里会自动变成可点击。</p>');
      }
    } catch (err) {
      providerBox.innerHTML = `<p class="provider-empty">第三方登录状态暂时读不到：${escapeHTML(accountErrorText(err))}</p>`;
    }
  }

  providerBox.addEventListener('click', (event) => {
    const button = event.target.closest('[data-provider-login]');
    if (!button || button.disabled) return;
    const provider = button.dataset.providerLogin;
    location.href = '/api/auth/sign-in/social/' + encodeURIComponent(provider) + '?next=' + encodeURIComponent('/#/account');
  });

  /* ---------------- 服务可用性 ---------------- */
  async function checkService() {
    if (!apiAvailable()) {
      serviceNode.innerHTML = `<div class="account-service-state is-offline">${icon('info')}<div><strong>账户服务没有连接</strong><p>这份页面是直接以文件方式打开的。请用 <code>node tools/serve.mjs</code> 启动本地服务器，再打开 <code>http://127.0.0.1:8788</code>；账户服务本身默认在 8797 端口。</p></div></div>`;
      setFormEnabled(false);
      return false;
    }
    try {
      const health = await accountApi.health();
      const delivery = health?.checks?.smtp;
      localNote.hidden = false;
      localNote.innerHTML = icon('info', true) + '<span>本地账户服务已连接（' + escapeHTML(health.version || '未知版本') + '）。' +
        (delivery === 'capture'
          ? '当前是开发邮件通道：验证码不会真的发出，会直接显示在下面。'
          : delivery === 'unconfigured'
            ? '邮件投递还没有配置，验证码暂时无法送达。'
            : '验证码会发送到你的邮箱。') + '</span>';
      setFormEnabled(true);
      return true;
    } catch (err) {
      setFormEnabled(false);
      serviceNode.innerHTML = `<div class="account-service-state is-offline">${icon('info')}<div><strong>连接不上账户服务</strong><p>${escapeHTML(accountErrorText(err))}</p><p class="service-hint">请确认账户服务已经启动（默认 <code>http://127.0.0.1:8797</code>），启动后可以点右边的按钮重试。</p></div><button class="btn btn-secondary btn-sm" type="button" data-service-retry>重新连接</button></div>`;
      serviceNode.querySelector('[data-service-retry]')?.addEventListener('click', () => {
        serviceNode.innerHTML = '<div class="account-service-state"><span class="spinner" aria-hidden="true"></span><div><strong>正在重新连接…</strong></div></div>';
        checkService().then((online) => {
          if (online) { serviceNode.innerHTML = ''; localNote.hidden = false; }
          else checkService();
        });
      });
      return false;
    }
  }

  /* ---------------- 发送验证码 ---------------- */
  sendButton.addEventListener('click', async () => {
    clearError();
    const email = emailInput.value.trim();
    if (!email || !emailInput.checkValidity()) {
      showError('请先填写有效的邮箱地址。', 'email');
      return;
    }
    sendButton.disabled = true;
    statusNode.textContent = '正在发送…';
    try {
      const result = await accountApi.sendOtp(email, 'sign-in');
      statusNode.textContent = '验证码已生成，' + Math.round((result.expiresInSeconds || 300) / 60) + ' 分钟内有效。';
      startCountdown(result.resendAfterSeconds || 60);
      if (result.devCode) {
        devCode = result.devCode;
        statusNode.innerHTML = '开发模式验证码：<strong>' + escapeHTML(result.devCode) + '</strong>（已自动填入）';
        codeInput.value = result.devCode;
        codeInput.focus();
      } else {
        statusNode.textContent += ' 请查收邮件。';
        codeInput.focus();
      }
    } catch (err) {
      sendButton.disabled = false;
      statusNode.textContent = '';
      showError(accountErrorText(err), 'email');
    }
  });

  /* ---------------- 提交登录 ---------------- */
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearError();
    const email = emailInput.value.trim();
    const otp = codeInput.value.trim();
    if (!email || !emailInput.checkValidity()) {
      showError('请输入有效的邮箱地址。', 'email');
      return;
    }
    if (!/^\d{4,10}$/.test(otp)) {
      showError('请输入 4–10 位数字验证码。', 'code');
      return;
    }
    setBusy(true);
    try {
      const data = await accountApi.verifyOtp(email, otp);
      if (data && data.user) {
        accountRuntime.me = null;
        toast('已登录：' + (data.user.name || data.user.email));
        goNext();
      } else {
        showError('登录没有返回账户信息，请重试。');
      }
    } catch (err) {
      showError(accountErrorText(err), err.code === 'INVALID_OTP' || err.code === 'OTP_EXPIRED' ? 'code' : undefined);
    } finally {
      if (document.body.contains(submitButton)) setBusy(false);
    }
  });

  emailInput.addEventListener('input', clearError);
  codeInput.addEventListener('input', clearError);

  /* ---------------- 启动 ---------------- */
  renderProviders();
  checkService().then((online) => {
    if (!online) return;
    // 已登录用户直接进账户中心
    accountApi.session().then((session) => {
      if (session && session.user) {
        accountRuntime.online = true;
        goNext();
      }
    }).catch(() => {});
    emailInput.focus();
  });

  // OAuth 回调失败会带着 ?error= 回到这里
  const errorCode = new URLSearchParams((location.hash.split('?')[1] || '')).get('error')
    || new URLSearchParams((location.search || '').replace(/^\?/, '')).get('error');
  if (errorCode) {
    showError(ACCOUNT_ERROR_TEXT[errorCode] || ('第三方登录失败：' + errorCode));
    if (location.hash.includes('?')) location.hash = '/login';
  }
}
