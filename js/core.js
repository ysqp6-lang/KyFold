/* KyFold · core.js
   站点状态（localStorage 演示数据）、DOM 根引用、持久化、toast、路由解析。
   零构建：按 index.html 中的顺序以普通 <script> 加载，各文件共享同一个全局词法作用域。 */
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
  const countBindings = () => Object.values(state.bindings).filter(Boolean).length;
  function persist() { try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch {} }
  function toast(message) { clearTimeout(toastTimeout); toastElement.textContent = message; toastElement.hidden = false; toastTimeout = setTimeout(() => toastElement.hidden = true, 3400); }
  function currentRoute() { return location.hash.replace(/^#\/?/, '').replace(/\/$/, '') || 'home'; }
