#!/usr/bin/env node
/**
 * 一条命令启动「官网 + 账户服务」的本地开发环境。
 *
 *   node tools/dev-up.mjs
 *   node tools/dev-up.mjs --site-port 8788 --account-port 8797 --account-dir ../KyFold/account
 *
 * 它做三件事：
 *   1. 用开发配置启动 KyFold 账户服务（capture 邮件通道 + 验证码回显，只监听 127.0.0.1）；
 *   2. 把官网的允许来源加进服务白名单（否则跨端口 POST 会被 403 ORIGIN_NOT_ALLOWED 拒绝）；
 *   3. 启动官网静态服务器，并把 /api/* 反代到账户服务（同一源，cookie / CSRF 都能用）。
 *
 * 密钥只写在本机 `.dev-secret`（已 gitignore），不进入仓库、不打印。
 * 零依赖：只用 Node 内置模块。
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const repo = path.resolve(import.meta.dirname, '..');
const sitePort = Number(opt('site-port', 8788));
const accountPort = Number(opt('account-port', 8797));
const accountDir = path.resolve(
  opt('account-dir', process.env.KYFOLD_ACCOUNT_DIR || path.join(repo, '..', 'KyFold', 'account')),
);
const dbPath = opt('db', process.env.KYFOLD_DB_PATH || '/tmp/kyfold-dev.db');

if (!existsSync(path.join(accountDir, 'src', 'server.ts'))) {
  console.error(`找不到账户服务：${accountDir}\n用 --account-dir 指定 KyFold Account 仓库的位置。`);
  process.exit(1);
}

const secretPath = path.join(repo, '.dev-secret');
let secret;
if (existsSync(secretPath)) {
  secret = readFileSync(secretPath, 'utf8').trim();
}
if (!secret || secret.length < 32) {
  secret = randomBytes(36).toString('hex');
  writeFileSync(secretPath, secret + '\n', { mode: 0o600 });
  console.log('已生成本机开发密钥：.dev-secret（已 gitignore；轮换它会让现有会话与验证码失效）');
}

const children = [];
let shuttingDown = false;

function prefixStream(stream, prefix) {
  stream.setEncoding('utf8');
  let buffer = '';
  stream.on('data', (chunk) => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) if (line.trim()) process.stdout.write(`${prefix} ${line}\n`);
  });
}

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    try { child.kill('SIGTERM'); } catch { /* 已经退出 */ }
  }
  setTimeout(() => process.exit(code), 300);
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

async function waitForHealth(url, timeoutMs) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch { /* 还没起来 */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return null;
}

// ---------------------------------------------------------------- 账户服务
const serviceEnv = {
  ...process.env,
  NODE_ENV: 'development',
  HOST: '127.0.0.1',
  PORT: String(accountPort),
  KYFOLD_BASE_URL: `http://127.0.0.1:${accountPort}`,
  KYFOLD_ALLOWED_ORIGINS: `http://127.0.0.1:${accountPort},http://127.0.0.1:${sitePort}`,
  KYFOLD_SECRET: secret,
  KYFOLD_DB_PATH: dbPath,
  KYFOLD_MAIL_TRANSPORT: 'capture',
  KYFOLD_OTP_DEV_ECHO: '1',
};

const service = spawn(process.execPath, ['src/server.ts'], {
  cwd: accountDir,
  env: serviceEnv,
  stdio: ['ignore', 'pipe', 'pipe'],
});
children.push(service);
prefixStream(service.stdout, '[account]');
prefixStream(service.stderr, '[account]');
service.on('exit', (code) => {
  if (!shuttingDown) {
    console.error(`\n账户服务退出了（code ${code}）。常见原因：端口 ${accountPort} 被占用，或配置不合法（看上面的输出）。`);
    shutdown(1);
  }
});

const health = await waitForHealth(`http://127.0.0.1:${accountPort}/api/health`, 20000);
if (!health) {
  console.error('账户服务 20 秒内没有就绪，已停止。');
  shutdown(1);
  process.exitCode = 1;
} else {
  // ---------------------------------------------------------------- 官网静态服务器
  const site = spawn(process.execPath, ['tools/serve.mjs', '--port', String(sitePort), '--api', `http://127.0.0.1:${accountPort}`, '--quiet'], {
    cwd: repo,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  children.push(site);
  prefixStream(site.stdout, '[site]');
  prefixStream(site.stderr, '[site]');
  site.on('exit', (code) => {
    if (!shuttingDown) {
      console.error(`\n官网服务器退出了（code ${code}）。常见原因：端口 ${sitePort} 被占用。`);
      shutdown(1);
    }
  });

  await new Promise((resolve) => setTimeout(resolve, 800));
  console.log('');
  console.log('==================================================================');
  console.log(`  官网        http://127.0.0.1:${sitePort}`);
  console.log(`  账户服务    http://127.0.0.1:${accountPort}`);
  console.log(`  登录        http://127.0.0.1:${sitePort}/#/login`);
  console.log(`  账户中心    http://127.0.0.1:${sitePort}/#/account`);
  console.log('');
  console.log('  登录方式：填邮箱 → 点「获取验证码」→ 开发通道会把验证码直接显示在页面上。');
  console.log(`  验证码落盘：tail -1 ${dbPath}.mailbox.jsonl`);
  console.log('  第三方登录：服务端没有配置 OAuth 凭证，页面会显示「未配置」，不会假装成功。');
  console.log('  停止：Ctrl+C');
  console.log('==================================================================');
}

// 保持进程存活，直到用户 Ctrl+C
setInterval(() => {}, 1 << 30);
