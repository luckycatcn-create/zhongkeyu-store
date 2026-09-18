// Vercel serverless entry. Exports the Express app (no listen, no static —
// Vercel serves public/ as static files and rewrites all traffic here).
const express = require('express');
const path = require('path');
const crypto = require('crypto');
const db = require('../db');

const app = express();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ADMIN336';

// CORS — built-in preview browser may load the page from a different origin.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) res.set('Access-Control-Allow-Origin', origin);
  res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Token, Authorization');
  res.set('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

// Serve the static front-end from this function so the home page and assets work
// regardless of the Vercel framework preset.
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
app.use(express.static(PUBLIC_DIR));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const CONTACT_FIELDS = ['name', 'email', 'phone', 'message', 'company', 'country', 'product', 'budget'];
const QUOTE_FIELDS = ['name', 'email', 'phone', 'company', 'country', 'product', 'message', 'budget'];

// ---------- health check ----------
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// ---------- db connection status (so admin can detect a missing key) ----------
app.get('/api/db-status', (req, res) => res.json(db.dbStatus()));

// ---------- image upload to Supabase Storage ----------
app.post('/api/upload', checkAuth, async (req, res) => {
  const b = req.body || {};
  if (!b.data) return res.status(400).json({ ok: false, error: 'No file data provided' });
  try {
    const url = await db.uploadImage({ folder: b.folder, filename: b.filename, contentType: b.contentType, data: b.data });
    res.json({ ok: true, url });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ---------- public content (all editable blocks) ----------
app.get('/api/content', async (req, res) => {
  try { res.json(await db.readContent()); }
  catch (e) { console.error('[content]', e); res.json([]); }
});
app.put('/api/content', checkAuth, async (req, res) => {
  const b = req.body || {};
  if (!b.key) return res.status(400).json({ ok: false, error: 'key is required' });
  try { res.json({ ok: true, block: await db.upsertContent(b) }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ---------- banners ----------
app.get('/api/banners', async (req, res) => {
  try { res.json(await db.readBanners()); }
  catch (e) { console.error('[banners]', e); res.json([]); }
});
app.post('/api/banners', checkAuth, async (req, res) => {
  const b = req.body || {};
  b.id = b.id || crypto.randomUUID();
  try { res.json({ ok: true, banner: await db.upsertBanner(b) }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});
app.delete('/api/banners/:id', checkAuth, async (req, res) => {
  try { await db.deleteBanner(req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ---------- blog ----------
app.get('/api/blog', async (req, res) => {
  try { res.json(await db.readBlog()); }
  catch (e) { console.error('[blog]', e); res.json([]); }
});
app.get('/api/blog/:slug', async (req, res) => {
  try {
    const post = await db.readBlogPost(req.params.slug);
    if (!post) return res.status(404).json({ error: 'not found' });
    res.json(post);
  } catch (e) { res.status(500).json({ error: e.message }); }
});
app.post('/api/blog', checkAuth, async (req, res) => {
  const b = req.body || {};
  if (!b.title) return res.status(400).json({ ok: false, error: 'title is required' });
  b.id = b.id || crypto.randomUUID();
  if (!b.slug) b.slug = (b.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
  if (b.active === undefined) b.active = true;
  try { res.json({ ok: true, post: await db.upsertBlog(b) }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});
app.delete('/api/blog/:id', checkAuth, async (req, res) => {
  try { await db.deleteBlog(req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ---------- public: contact message ----------
app.post('/api/contact', async (req, res) => {
  const body = req.body || {};
  const record = { id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  for (const f of CONTACT_FIELDS) record[f] = (body[f] || '').toString().trim();
  const missing = ['name', 'email', 'phone', 'message'].filter((f) => !record[f]);
  if (missing.length) return res.status(400).json({ ok: false, error: 'Missing required field(s): ' + missing.join(', ') });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) return res.status(400).json({ ok: false, error: 'Invalid email address' });
  try { await db.addMessage(record); res.json({ ok: true, id: record.id }); }
  catch (e) { console.error('[contact]', e); res.status(500).json({ ok: false, error: 'Server error, please try again later' }); }
});

// ---------- public: buyer quote / RFQ ----------
app.post('/api/quotes', async (req, res) => {
  const body = req.body || {};
  const record = { id: crypto.randomUUID(), createdAt: new Date().toISOString() };
  for (const f of QUOTE_FIELDS) record[f] = (body[f] || '').toString().trim();
  const missing = ['name', 'email'].filter((f) => !record[f]);
  if (missing.length) return res.status(400).json({ ok: false, error: 'Missing required field(s): ' + missing.join(', ') });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) return res.status(400).json({ ok: false, error: 'Invalid email address' });
  try { await db.addQuote(record); res.json({ ok: true, id: record.id }); }
  catch (e) { console.error('[quotes]', e); res.status(500).json({ ok: false, error: 'Server error, please try again later' }); }
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

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '..', 'public', 'admin.html')));

// ---------- admin: messages ----------
app.get('/admin/api/messages', checkAuth, async (req, res) => {
  try { res.json(await db.readMessages()); } catch (e) { console.error('[messages]', e); res.json([]); }
});
app.delete('/admin/api/messages/:id', checkAuth, async (req, res) => {
  try { await db.deleteMessage(req.params.id); res.json({ ok: true }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});
app.get('/admin/api/export/messages', checkAuth, async (req, res) => { exportCsv(res, await db.readMessages(), CONTACT_FIELDS, 'messages.csv'); });

// ---------- admin: quotes ----------
app.get('/admin/api/quotes', checkAuth, async (req, res) => {
  try { res.json(await db.readQuotes()); } catch (e) { console.error('[quotes]', e); res.json([]); }
});
app.delete('/admin/api/quotes/:id', checkAuth, async (req, res) => {
  try { await db.deleteQuote(req.params.id); res.json({ ok: true }); } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});
app.get('/admin/api/export/quotes', checkAuth, async (req, res) => { exportCsv(res, await db.readQuotes(), QUOTE_FIELDS, 'quotes.csv'); });

// ---------- products (public read, admin write) ----------
app.get('/api/products', async (req, res) => {
  try { res.json(await db.readProducts()); } catch (e) { console.error('[products]', e); res.json([]); }
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
    sort_order: Number(body.sort_order) || 0,
  };
  try { res.json({ ok: true, product: await db.upsertProduct(product) }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});
app.delete('/api/products/:id', checkAuth, async (req, res) => {
  try { await db.deleteProduct(req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// ---------- CSV export helper ----------
function exportCsv(res, rows, fields, filename) {
  try {
    const esc = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const data = rows.map((r) => fields.map((f) => esc(r[f])).join(','));
    const csv = [fields.join(','), ...data].join('\n');
    res.set('Content-Type', 'text/csv; charset=utf-8');
    res.set('Content-Disposition', 'attachment; filename="' + filename + '"');
    res.send('﻿' + csv);
  } catch (e) { res.status(500).json({ error: e.message }); }
}

// ---------- global error handler (prevents empty 500 responses) ----------
app.use((err, req, res, next) => {
  console.error('[global error]', req.method, req.url, err);
  if (res.headersSent) return next(err);
  res.status(500).json({ ok: false, error: err && err.message ? err.message : 'Server error, please try again later' });
});

// ---------- SPA fallback for unknown routes ----------
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

module.exports = app;
