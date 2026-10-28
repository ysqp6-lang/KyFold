/* KyFold · icons.js
   内联 SVG 图标与第三方服务商图标。
   零构建：按 index.html 中的顺序以普通 <script> 加载，各文件共享同一个全局词法作用域。 */
'use strict';

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
