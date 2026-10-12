/*
 * 本体管理工作台 — 零依赖 Node.js 服务
 * 静态页面 + REST API + 服务端登录会话
 * 数据存 data/*.json，原子写入
 * 用法: node server.js [port]   (默认 8787, 监听 0.0.0.0 便于云主机部署)
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.argv[2] || process.env.PORT || 8787);
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DATA_DIR = path.join(ROOT, 'data');

// ---- 实体白名单（与前端 schema 对应）----
const ENTITIES = [
  'customers', 'contacts', 'channel_managers',
  'pain_points', 'propositions', 'visits', 'demos',
  'proposals', 'projects', 'cases',
];

const ID_PREFIX = {
  customers: 'cus', contacts: 'con', channel_managers: 'chm',
  pain_points: 'pain', propositions: 'prop', visits: 'vis',
  demos: 'dem', proposals: 'prp', projects: 'prj', cases: 'case',
};

// ---- 工具 ----
function send(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 2 * 1024 * 1024) { reject(new Error('body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); }
      catch (e) { reject(new Error('invalid json')); }
    });
    req.on('error', reject);
  });
}

function fileFor(name) { return path.join(DATA_DIR, name + '.json'); }

function loadData(name) {
  try {
    const raw = fs.readFileSync(fileFor(name), 'utf8');
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}

// 原子写: 先写临时文件再改名, 避免写一半损坏
function saveData(name, items) {
  const tmp = fileFor(name) + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(items, null, 2), 'utf8');
  fs.renameSync(tmp, fileFor(name));
}

function newId(entity) {
  return ID_PREFIX[entity] + '_' + Date.now().toString(36) + '_' +
    crypto.randomBytes(3).toString('hex');
}

// ---- 认证 ----
function usersPath() { return path.join(DATA_DIR, 'users.json'); }
function sessionsPath() { return path.join(DATA_DIR, 'sessions.json'); }

function loadUsers() {
  try { return JSON.parse(fs.readFileSync(usersPath(), 'utf8')); }
  catch (e) { return []; }
}

function loadSessions() {
  try { return JSON.parse(fs.readFileSync(sessionsPath(), 'utf8')); }
  catch (e) { return {}; }
}

function saveSessions(s) {
  const tmp = sessionsPath() + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(s, null, 2), 'utf8');
  fs.renameSync(tmp, sessionsPath());
}

function hashPassword(pwd, salt) {
  return crypto.scryptSync(pwd, salt, 32).toString('hex');
}

function makeToken() {
  return crypto.randomBytes(24).toString('hex');
}

const SESSION_TTL = 30 * 24 * 3600 * 1000; // 30 天

function checkAuth(req) {
  const h = req.headers['authorization'] || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!token) return null;
  const sessions = loadSessions();
  const s = sessions[token];
  if (!s) return null;
  if (Date.now() - s.ts > SESSION_TTL) { delete sessions[token]; saveSessions(sessions); return null; }
  return s;
}

// ---- 静态文件 ----
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  const abs = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!abs.startsWith(PUBLIC_DIR)) { res.writeHead(403); res.end('Forbidden'); return; }
  fs.readFile(abs, (err, buf) => {
    if (err) {
      // SPA 回退: 非文件路径一律回 index.html
      fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (e2, idx) => {
        if (e2) { res.writeHead(404); res.end('Not Found'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(idx);
      });
      return;
    }
    const ext = path.extname(abs).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(buf);
  });
}

// ---- API 路由 ----
async function handleApi(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean); // ['api', ...]
  const route = parts.slice(1); // 去掉 'api'

  // --- 认证相关 ---
  if (route[0] === 'auth') {
    const action = route[1];
    if (req.method === 'GET' && action === 'status') {
      const users = loadUsers();
      const sess = checkAuth(req);
      return send(res, 200, {
        initialized: users.length > 0,
        loggedIn: !!sess,
        username: sess ? sess.username : null,
      });
    }
    if (req.method === 'POST' && action === 'setup') {
      const users = loadUsers();
      if (users.length > 0) return send(res, 400, { error: '已初始化，请直接登录' });
      const body = await readBody(req);
      const username = String(body.username || '').trim();
      const password = String(body.password || '');
      if (username.length < 2 || username.length > 30) return send(res, 400, { error: '用户名需 2-30 个字符' });
      if (password.length < 6) return send(res, 400, { error: '密码至少 6 位' });
      const salt = crypto.randomBytes(16).toString('hex');
      const user = { username, salt, hash: hashPassword(password, salt), createdAt: new Date().toISOString() };
      saveData('users', [user]);
      const token = makeToken();
      const sessions = loadSessions();
      sessions[token] = { username, ts: Date.now() };
      saveSessions(sessions);
      return send(res, 200, { token, username });
    }
    if (req.method === 'POST' && action === 'login') {
      const body = await readBody(req);
      const username = String(body.username || '').trim();
      const password = String(body.password || '');
      const users = loadUsers();
      const user = users.find((u) => u.username === username);
      const ok = user && crypto.timingSafeEqual(
        Buffer.from(hashPassword(password, user.salt), 'hex'),
        Buffer.from(user.hash, 'hex'));
      if (!ok) {
        await new Promise((r) => setTimeout(r, 800)); // 减缓暴力尝试
        return send(res, 401, { error: '用户名或密码错误' });
      }
      const token = makeToken();
      const sessions = loadSessions();
      sessions[token] = { username, ts: Date.now() };
      saveSessions(sessions);
      return send(res, 200, { token, username });
    }
    if (req.method === 'POST' && action === 'logout') {
      const h = req.headers['authorization'] || '';
      const token = h.startsWith('Bearer ') ? h.slice(7) : null;
      if (token) {
        const sessions = loadSessions();
        delete sessions[token];
        saveSessions(sessions);
      }
      return send(res, 200, { ok: true });
    }
    return send(res, 404, { error: 'not found' });
  }

  // --- 以下全部需要登录 ---
  const sess = checkAuth(req);
  if (!sess) return send(res, 401, { error: '未登录' });

  // GET /api/data -> 全部实体数据
  if (req.method === 'GET' && route[0] === 'data' && route.length === 1) {
    const out = {};
    for (const e of ENTITIES) out[e] = loadData(e);
    return send(res, 200, out);
  }

  // /api/entity/:name ...
  if (route[0] === 'entity') {
    const entity = route[1];
    if (!ENTITIES.includes(entity)) return send(res, 400, { error: '未知主体: ' + entity });

    if (req.method === 'POST' && route.length === 2) {
      const body = await readBody(req);
      if (!body || typeof body !== 'object' || Array.isArray(body)) return send(res, 400, { error: '数据格式错误' });
      delete body.id;
      const item = Object.assign({ id: newId(entity), createdAt: new Date().toISOString() }, body);
      const items = loadData(entity);
      items.unshift(item);
      saveData(entity, items);
      return send(res, 200, item);
    }

    const id = route[2];
    if (id) {
      const items = loadData(entity);
      const idx = items.findIndex((it) => it.id === id);
      if (req.method === 'PUT') {
        const body = await readBody(req);
        if (!body || typeof body !== 'object') return send(res, 400, { error: '数据格式错误' });
        if (idx < 0) return send(res, 404, { error: '记录不存在' });
        items[idx] = Object.assign({}, items[idx], body, { id, updatedAt: new Date().toISOString() });
        saveData(entity, items);
        return send(res, 200, items[idx]);
      }
      if (req.method === 'DELETE') {
        if (idx < 0) return send(res, 404, { error: '记录不存在' });
        items.splice(idx, 1);
        saveData(entity, items);
        return send(res, 200, { ok: true });
      }
    }
    return send(res, 404, { error: 'not found' });
  }

  return send(res, 404, { error: 'not found' });
}

// ---- 启动 ----
function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

ensureDir(DATA_DIR);
ensureDir(PUBLIC_DIR);
// 初始化空数据文件（不覆盖已有）
for (const e of ENTITIES) {
  const f = fileFor(e);
  if (!fs.existsSync(f)) fs.writeFileSync(f, '[]', 'utf8');
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    handleApi(req, res, url).catch((e) => {
      send(res, 400, { error: e.message || '请求失败' });
    });
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405); res.end('Method Not Allowed'); return;
  }
  serveStatic(req, res, url.pathname);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('[本体管理工作台] 服务已启动: http://0.0.0.0:' + PORT);
  console.log('数据目录: ' + DATA_DIR);
});
