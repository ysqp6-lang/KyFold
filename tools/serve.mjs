#!/usr/bin/env node
/**
 * KyFold 官网本地服务器：静态文件 + `/api/*` 反向代理。
 *
 *   node tools/serve.mjs                  # http://127.0.0.1:8788 ，API 默认代理到 8797
 *   node tools/serve.mjs --port 8788 --api http://127.0.0.1:8797
 *
 * 为什么需要它：官网是纯静态页面，而账户服务在另一个端口。浏览器直接跨端口调用
 * 会遇到两个问题（服务没有 CORS 头；CSP 只允许 'self'）。让官网和 API 在同一个
 * 源下（由本进程代理）就同时解决 cookie、CSRF、CSP 三件事，生产环境也是同样的
 * 反代结构（静态站点 + /api 反代到账户服务）。
 *
 * 零依赖：只用 Node 内置模块。
 */
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const ROOT = resolve(import.meta.dirname, '..');
const PORT = Number(opt('port', process.env.KYFOLD_SITE_PORT || 8788));
const QUIET = args.includes('--quiet') || process.env.KYFOLD_SITE_QUIET === '1';
const API_BASE = (opt('api', process.env.KYFOLD_API_BASE || 'http://127.0.0.1:8797')).replace(/\/$/, '');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

const HOP_BY_HOP = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailer', 'transfer-encoding', 'upgrade', 'host', 'content-length',
]);

/** 安全响应头：与账户服务保持同一套口径，connect-src 允许反代出去的 /api（仍是 self）。 */
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Content-Security-Policy': [
    "default-src 'self'",
    "img-src 'self' data: https:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self'",
    "connect-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "object-src 'none'",
  ].join('; '),
};

const log = (...parts) => process.stdout.write(parts.join(' ') + '\n');

async function proxy(req, res, url) {
  const target = API_BASE + url.pathname + url.search;
  const headers = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (HOP_BY_HOP.has(k.toLowerCase())) continue;
    headers[k] = v;
  }
  const method = req.method || 'GET';
  let body;
  if (method !== 'GET' && method !== 'HEAD') {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    body = Buffer.concat(chunks);
  }

  let upstream;
  try {
    upstream = await fetch(target, { method, headers, body, redirect: 'manual' });
  } catch (err) {
    res.writeHead(502, {
      'Content-Type': 'application/json; charset=utf-8',
      ...SECURITY_HEADERS,
    });
    res.end(JSON.stringify({
      error: {
        code: 'UPSTREAM_UNAVAILABLE',
        message: '账户服务没有响应：请确认已在另一个终端启动账户服务（默认 127.0.0.1:8797）。',
        details: { target, cause: err instanceof Error ? err.message : String(err) },
      },
    }));
    return;
  }

  const outHeaders = {};
  for (const [k, v] of upstream.headers) {
    const key = k.toLowerCase();
    if (HOP_BY_HOP.has(key) || key === 'content-encoding') continue;
    if (key === 'set-cookie') continue;
    outHeaders[k] = v;
  }
  // Set-Cookie 必须逐条转发，合并成一条会让浏览器只认第一个
  const cookies = upstream.headers.getSetCookie?.() ?? [];
  if (cookies.length) outHeaders['set-cookie'] = cookies;
  Object.assign(outHeaders, SECURITY_HEADERS);

  const buffer = Buffer.from(await upstream.arrayBuffer());
  res.writeHead(upstream.status, outHeaders);
  res.end(method === 'HEAD' ? undefined : buffer);
}

function serveStatic(req, res, url) {
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('路径编码不合法');
    return;
  }

  if (pathname === '/' || pathname === '') pathname = '/index.html';

  const target = normalize(join(ROOT, pathname));
  if (!target.startsWith(ROOT + sep) && target !== join(ROOT, 'index.html')) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('不允许访问该路径');
    return;
  }

  const hasExtension = extname(target) !== '';
  let file = target;

  if (!existsSync(file) || !statSync(file).isFile()) {
    if (!hasExtension) {
      // SPA 回退：/account 这类路径交给前端路由（OAuth 回调会落到 /account?linked=...）
      file = join(ROOT, 'index.html');
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', ...SECURITY_HEADERS });
      res.end('文件不存在：' + pathname);
      return;
    }
  }

  const type = MIME[extname(file).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, {
    'Content-Type': type,
    'Cache-Control': 'no-cache',
    ...SECURITY_HEADERS,
  });
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  createReadStream(file).pipe(res);
}

const server = createServer((req, res) => {
  const started = Date.now();
  const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
  if (!QUIET) res.on('finish', () => {
    log(`${req.method} ${url.pathname}${url.search} → ${res.statusCode} (${Date.now() - started}ms)`);
  });
  if (url.pathname.startsWith('/api/')) {
    proxy(req, res, url).catch((err) => {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      }
      res.end(JSON.stringify({ error: { code: 'PROXY_ERROR', message: String(err) } }));
    });
    return;
  }
  serveStatic(req, res, url);
});

server.listen(PORT, '127.0.0.1', async () => {
  log(`KyFold 官网：http://127.0.0.1:${PORT}`);
  log(`账户 API  : ${API_BASE}（/api/* 反代）`);
  try {
    const health = await fetch(API_BASE + '/api/health').then((r) => r.json());
    log(`账户服务  : ${health.ok ? '正常' : '异常'} · ${health.service ?? '?'} v${health.version ?? '?'}`);
  } catch {
    log('账户服务  : 未响应 —— 官网仍可浏览，账户页会显示「未连接账户服务」。');
    log('             启动方式见 README「本地启动」。');
  }
});
