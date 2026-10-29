/* KyFold · legal.js
   隐私说明、使用说明与 404。
   零构建：按 index.html 中的顺序以普通 <script> 加载，各文件共享同一个全局词法作用域。 */
'use strict';

  function legal(type) {
    const privacy = type === 'privacy';
    const body = privacy ? `
      <h2>一、这份说明覆盖什么</h2>
      <p>这份说明适用于 KyFold 官网、KyFold 账户和 Color Studio。账户服务目前运行在本机，仍属内部测试；下面写的是它现在实际保存和处理的内容。</p>
      <h2>二、账户服务保存什么</h2>
      <p>登录 KyFold 账户时，账户服务会保存：</p>
      <ul>
        <li>邮箱地址，作为账户的登录标识；以及你设置的昵称。</li>
        <li>登录方式。现在只有邮箱验证码；GitHub、Google 尚未配置，Apple 保留，因此不会产生对应的绑定记录。</li>
        <li>会话信息：登录时间、最近活动时间、过期时间、IP 地址和浏览器 User-Agent，用于在“设备与安全”里查看和撤销登录。</li>
        <li>审计事件：登录、退出、修改昵称、撤销会话、导出数据、注销等操作的时间、结果和来源。验证码、令牌等敏感字段不会写入审计记录。</li>
      </ul>
      <p>账户没有密码。登录和关键操作都通过邮箱验证码完成。</p>
      <h2>三、验证码和邮件</h2>
      <ul>
        <li>六位验证码只保存摘要，不保存明文；5 分钟内有效，只能使用一次，错误次数过多会作废。</li>
        <li>当前本地服务使用 capture 通道：验证码不会真的发邮件，而是写入本机测试邮箱文件，只有本机可读；开发模式也可能在页面或接口响应里回显，方便测试。</li>
        <li>生产环境的 SMTP 邮件投递尚未接入。接入前，请不要把这个本地服务当作可以对外使用的邮箱登录。</li>
      </ul>
      <h2>四、Cookie 和会话</h2>
      <ul>
        <li>登录后，浏览器会保存名为 <code>kyfold.session_token</code> 的 Cookie，标记为 HttpOnly，页面脚本读不到它；本地 HTTP 环境不加 Secure，生产 HTTPS 环境会加。</li>
        <li>另有一个用于表单防伪的 <code>kyfold.csrf</code> Cookie，它不是 HttpOnly。</li>
        <li>会话默认 30 天有效，访问时会续期；退出登录或撤销会话后立即失效。</li>
        <li>清除浏览器 Cookie 只会退出当前浏览器，不会删除账户服务里的账号。</li>
      </ul>
      <h2>五、数据导出与注销</h2>
      <ul>
        <li>登录后可以导出账户数据（JSON），内容包括资料、登录方式、会话和审计记录；第三方令牌原文不会导出。导出前需要用邮箱验证码再确认一次身份。</li>
        <li>注销需要登录并再次验证，然后输入 DELETE 确认。确认后会级联删除账户资料、登录方式、会话和相关验证码，所有会话立即失效，无法恢复。</li>
        <li>审计记录会保留一条删除事件，但不再关联到这个账户；账户资料、登录方式、会话和验证码会被删除。</li>
        <li>账户服务只监听本机 127.0.0.1；数据保存在本机数据库，不会同步到云端。</li>
      </ul>
      <h2>六、Color Studio 的数据</h2>
      <p>Color Studio 不需要登录。颜色、画笔和外观偏好只在当前浏览器里处理，自动记忆使用浏览器的 localStorage，并按浏览器与网站地址隔离。配色工程和导出文件由你自己保存；账户服务不会收到这些内容。</p>
      <h2>七、浏览官网</h2>
      <p>浏览官网本身不需要登录，也不会把页面内容发送到账户服务。当前官网没有接入第三方统计或广告脚本。点击登录或进入账户中心时，页面才会通过同源的 <code>/api</code> 访问本机账户服务。</p>
      <h2>八、说明的更新</h2>
      <p>这份说明按当前实现编写。账户服务、邮件投递或部署方式变化时，相关说明会一起更新；正式公开发布前，还需要补充完整的隐私政策和联系方式。</p>` : `
      <h2>一、现在可以使用</h2>
      <ul>
        <li>浏览官网：产品介绍、关于 KyFold、帮助中心、隐私说明与使用说明。</li>
        <li>使用 Color Studio：在浏览器里调色、保存或导入配色工程、导出 SVG、PNG 与素材包；无需登录。</li>
        <li>使用 KyFold 账户（本机）：通过 <code>node tools/serve.mjs</code> 打开官网后，用邮箱验证码登录；可以退出、恢复会话、修改昵称、查看和撤销会话、导出数据、注销账户。</li>
      </ul>
      <p>账户服务地址是 <code>http://127.0.0.1:8797</code>，官网由本地服务器在 <code>http://127.0.0.1:8788</code> 提供。直接双击 <code>index.html</code> 时没有账户接口。</p>
      <h2>二、还没有开放</h2>
      <ul>
        <li>GitHub / Google 登录：还缺少服务商提供的应用 ID 与密钥，没有配置登录凭证；页面显示“未配置”，按钮不可点。</li>
        <li>Apple 登录：保留，需要付费开发者账号和域名验证，本阶段不启用。</li>
        <li>真实邮件投递：当前是本地测试邮箱通道（capture），验证码写入本机文件，不对外发信；邮件服务尚未接入。</li>
        <li>第三方账号绑定与解绑：要等第三方登录可用后才能使用；现在账户只有邮箱验证码一种方式。</li>
        <li>两款 App 的下载、TestFlight 与测试申请：都没有。KyRemote 和课堂 AI 助手只做内部测试。</li>
        <li>公网访问：账户服务只监听本机，没有公网域名；静态托管也不承载 OAuth 回调与邮件。</li>
      </ul>
      <h2>三、哪些是设计预览</h2>
      <ul>
        <li>官网中的产品界面图、手机和平板窗口，是界面示意，不代表已发布的版本或最终效果。</li>
        <li>账户说明页里的绑定、冲突处理与恢复等规则，部分仍是在为后续接入做准备的设计说明；当前真实可用的操作，以账户中心实际显示的为准。</li>
        <li>产品功能、设备条件与限制以产品页面和帮助中心为准；公开发布时间尚未确定。</li>
      </ul>
      <h2>四、使用账户时请注意</h2>
      <ul>
        <li>验证码等同于登录凭证，不要转发给他人；也不要在不属于自己的设备上保持登录。</li>
        <li>本地服务只供本机测试，不要把 8797 端口暴露到公网。</li>
        <li>账户数据保存在本机数据库；删除浏览器数据不会删除账户，注销请走账户中心。</li>
        <li>开发过程中可能重置测试数据，请不要把它当作正式备份；导出的文件由你自己保管。</li>
      </ul>
      <h2>五、产品内容与限制</h2>
      <p>KyRemote 需要一台运行 DSH 的 Mac，并启用 Remote Host 插件；手机上退到后台后连接会断开，目前没有 iOS 系统推送。课堂 AI 助手需要 iPadOS 26 及以上，开始听课后的前 20–30 秒是预热期；默认设备端转写，切到云端或双引擎模式会把音频发送到所配置的识别服务。AI 回答需要结合课程内容核对。</p>
      <p>两款 App 都已经实现并进入内部测试，但尚未公开发布，也没有下载或测试入口。</p>
      <h2>六、说明的更新</h2>
      <p>这份说明按当前实现编写；功能、配置或部署方式变化时会更新。正式公开发布前，会补充完整的服务条款与联系方式。</p>`;
    return `<main id="main" tabindex="-1" class="text-page legal-copy page-in"><div class="eyebrow">KYFOLD · ${privacy?'PRIVACY':'TERMS'}</div><h1>${privacy?'隐私说明':'使用说明'}</h1><p class="lead">${privacy?'账户服务已经可用，但它仍在本机内部测试。这份说明按当前实现，写清会保存哪些数据、为什么保存，以及你可以怎样导出或删除。':'这份说明写清官网、账户和 Color Studio 现在能做什么、哪些还不能用，以及哪些内容只是界面示意或设计说明。'}</p><div class="legal-note">${privacy?'账户服务只在本机运行，还没有公开部署，也没有接入真实邮件投递。正式公开发布前，这份说明会随部署方式和数据范围更新。':'两款 App 已经实现并进入内部测试，尚未公开发布；官网不提供下载、TestFlight 或测试申请。'}</div>${body}<p style="margin-top:32px"><a class="link" href="#/help">返回帮助中心 ${icon('arrow',true)}</a></p><p style="margin-top:12px"><a class="link" href="#/${privacy?'terms':'privacy'}">${privacy?'使用说明':'隐私说明'}</a><span> · </span><a class="link" href="#/account-about">KyFold 账户</a><span> · </span><a class="link" href="#/about">关于 KyFold</a><span> · </span><a class="link" href="#/products">所有产品</a></p></main>${footer()}`;
  }
  function notFound() { return `<main id="main" tabindex="-1" class="text-page"><div class="eyebrow">KYFOLD</div><h1>这条路，暂时还没铺好。</h1><p class="lead">回到首页，看看已经准备好的内容。</p><a href="#/" class="btn btn-primary">返回首页 ${icon('arrow',true)}</a><p style="margin-top:20px"><a class="link" href="#/help">去帮助中心 ${icon('chevron',true)}</a></p></main>${footer()}`; }
