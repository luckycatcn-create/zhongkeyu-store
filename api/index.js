// Vercel serverless entry. Exports the Express app (no listen, no static —
// Vercel serves public/ as static files and rewrites /api & /admin/api here).
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const db = require('../db');

const app = express();

// Admin password. The deploy sandbox may inject ADMIN_PASSWORD; if it does and
// you want to honor it, it would override here. Kept fixed to avoid lockouts.
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ADMIN336';

// CORS — the WorkBuddy built-in (preview) browser may load the page from a
// different origin than the API; without this the login POST is blocked.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) res.set('Access-Control-Allow-Origin', origin);
  res.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Token, Authorization');
  res.set('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

// Serve the static front-end from this function so the home page and assets work
// regardless of the Vercel framework preset (the Express preset does NOT auto-
// serve public/ as static files, which is why "/" returned 404).
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
app.use(express.static(PUBLIC_DIR));

// Allow large product images (base64 data URLs).
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const FIELDS = ['name', 'email', 'phone', 'message', 'company', 'country', 'product', 'budget'];
const REQUIRED = ['name', 'email', 'phone', 'message'];

// ---------- health check (used by admin.html boot test) ----------
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// ---------- public: contact form ----------
app.post('/api/contact', async (req, res) => {
  const body = req.body || {};
  const record = { id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  for (const f of FIELDS) record[f] = (body[f] || '').toString().trim();
  const missing = REQUIRED.filter((f) => !record[f]);
  if (missing.length) return res.status(400).json({ ok: false, error: 'Missing required field(s): ' + missing.join(', ') });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) {
    return res.status(400).json({ ok: false, error: 'Invalid email address' });
  }
  try {
    await db.addMessage(record);
    res.json({ ok: true, id: record.id });
  } catch (e) {
    console.error('[contact] write error:', e);
    res.status(500).json({ ok: false, error: 'Server error, please try again later' });
  }
});

// ---------- auth ----------
const sessionToken = (user) => Buffer.from(user + ':' + ADMIN_PASSWORD).toString('base64');
function parseCookies(req) {
  const out = {};
  const raw = req.headers.cookie || '';
  raw.split(';').forEach((c) => {
    const i = c.indexOf('=');
    if (i > -1) out[c.slice(0, i).trim()] = decodeURIComponent(c.slice(i + 1).trim());
  });
  return out;
}
function checkAuth(req, res, next) {
  const token = sessionToken('admin');
  if (req.headers['x-admin-token'] === token) return next();
  const cookies = parseCookies(req);
  if (cookies.admin_session && cookies.admin_session === token) return next();
  if (req.query && req.query.token === token) return next();
  const auth = req.headers.authorization || '';
  const [scheme, creds] = auth.split(' ');
  if (scheme === 'Basic') {
    const decoded = Buffer.from(creds, 'base64').toString('utf8');
    if (decoded === 'admin:' + ADMIN_PASSWORD) return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="Admin"');
  res.status(401).send('Authentication required');
}

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username === 'admin' && password === ADMIN_PASSWORD) {
    const tk = sessionToken('admin');
    res.cookie
      ? res.cookie('admin_session', tk, { httpOnly: false, sameSite: 'lax', maxAge: 86400000 })
      : res.set('Set-Cookie', 'admin_session=' + tk + '; Path=/; Max-Age=86400; SameSite=Lax');
    return res.json({ ok: true, token: tk });
  }
  res.status(401).json({ ok: false, error: 'Wrong password.' });
});
app.post('/admin/logout', (req, res) => {
  res.set('Set-Cookie', 'admin_session=; Path=/; Max-Age=0');
  res.json({ ok: true });
});

// Admin page (also served as static public/admin.html on Vercel; kept here for local dev).
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'admin.html')));

// ---------- admin: messages ----------
app.get('/admin/api/messages', checkAuth, async (req, res) => {
  try {
    res.json(await db.readMessages());
  } catch (e) {
    console.error('[messages] read error:', e);
    res.json([]); // graceful fallback
  }
});

app.get('/admin/api/export', checkAuth, async (req, res) => {
  try {
    const msgs = await db.readMessages();
    const header = ['id', 'createdAt', ...FIELDS];
    const esc = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const rows = msgs.map((m) => header.map((h) => esc(m[h])).join(','));
    const csv = [header.join(','), ...rows].join('\n');
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', 'attachment; filename="messages.csv"');
    res.send('﻿' + csv);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ---------- products (public read, admin write) ----------
app.get('/api/products', async (req, res) => {
  try {
    res.json(await db.readProducts());
  } catch (e) {
    console.error('[products] read error:', e);
    res.json([]); // graceful fallback so the page keeps working
  }
});
app.post('/api/products', checkAuth, async (req, res) => {
  const body = req.body || {};
  const name = (body.name || '').toString().trim();
  if (!name) return res.status(400).json({ ok: false, error: 'Product name is required' });
  const product = {
    id: body.id || crypto.randomUUID(),
    name,
    desc: (body.desc || '').toString().trim(),
    price: (body.price || '').toString().trim(),
    image: (body.image || '').toString().trim(),
  };
  try {
    const saved = await db.upsertProduct(product);
    res.json({ ok: true, product: saved });
  } catch (e) {
    console.error('[products] upsert error:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});
app.delete('/api/products/:id', checkAuth, async (req, res) => {
  try { await db.deleteProduct(req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = app;
