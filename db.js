// Data layer for the ONEWORLD clone site.
// On Vercel (production) it talks to Supabase (Postgres). Locally, when the
// SUPABASE_* env vars are absent, it gracefully falls back to JSON files under
// ./data so the site can be developed and smoke-tested without a database.

const fs = require('fs');
const path = require('path');

// Vercel serverless functions can only write to /tmp; everywhere else we use
// a local ./data folder so the site still works offline.
function chooseDataDir() {
  if (process.env.VERCEL || process.env.VERCEL_ENV) {
    return '/tmp/zk-data';
  }
  return path.join(__dirname, '..', 'data');
}
const DATA_DIR = chooseDataDir();

let supabase = null;
let useSupabase = false;
let initialized = false;

function ensureInit() {
  if (initialized) return useSupabase;
  initialized = true;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    try {
      const { createClient } = require('@supabase/supabase-js');
      if (!global.__zk_supabase) {
        global.__zk_supabase = createClient(url, key, { auth: { persistSession: false } });
      }
      supabase = global.__zk_supabase;
      useSupabase = true;
    } catch (e) {
      console.error('[db] Supabase init failed, falling back to local files:', e.message);
      useSupabase = false;
    }
  }
  return useSupabase;
}

// ---------- local file helpers ----------
function localFile(name) { return path.join(DATA_DIR, name); }
function readLocalJson(name, fallback) {
  const f = localFile(name);
  if (!fs.existsSync(f)) return fallback;
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return fallback; }
}
function writeLocalJson(name, data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(localFile(name), JSON.stringify(data, null, 2), 'utf8');
}
function readLocalJsonl(name) {
  const f = localFile(name);
  if (!fs.existsSync(f)) return [];
  return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
function appendLocalJsonl(name, rec) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.appendFileSync(localFile(name), JSON.stringify(rec) + '\n', 'utf8');
}

// ============================================================
// messages
// ============================================================
function rowToMessage(r) {
  return {
    id: r.id, createdAt: r.created_at,
    name: r.name || '', email: r.email || '', phone: r.phone || '',
    message: r.message || '', company: r.company || '', country: r.country || '',
    product: r.product || '', budget: r.budget || '',
  };
}
async function readMessages() {
  if (ensureInit() && supabase) {
    const { data, error } = await supabase.from('messages').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(rowToMessage);
  }
  return readLocalJsonl('messages.jsonl');
}
async function addMessage(rec) {
  if (ensureInit() && supabase) {
    const { data, error } = await supabase.from('messages').insert(rec).select().single();
    if (error) throw error;
    return rowToMessage(data);
  }
  appendLocalJsonl('messages.jsonl', rec);
  return rec;
}
async function deleteMessage(id) {
  if (ensureInit() && supabase) {
    const { error } = await supabase.from('messages').delete().eq('id', id);
    if (error) throw error;
    return;
  }
  writeLocalJsonlKeeping('messages.jsonl', id);
}

// ============================================================
// quotes (buyer RFQ)
// ============================================================
function rowToQuote(r) {
  return {
    id: r.id, createdAt: r.created_at,
    name: r.name || '', email: r.email || '', phone: r.phone || '', company: r.company || '',
    country: r.country || '', product: r.product || '', message: r.message || '', budget: r.budget || '',
  };
}
async function readQuotes() {
  if (ensureInit() && supabase) {
    const { data, error } = await supabase.from('quotes').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(rowToQuote);
  }
  return readLocalJsonl('quotes.jsonl');
}
async function addQuote(rec) {
  if (ensureInit() && supabase) {
    const { data, error } = await supabase.from('quotes').insert(rec).select().single();
    if (error) throw error;
    return rowToQuote(data);
  }
  appendLocalJsonl('quotes.jsonl', rec);
  return rec;
}
async function deleteQuote(id) {
  if (ensureInit() && supabase) {
    const { error } = await supabase.from('quotes').delete().eq('id', id);
    if (error) throw error;
    return;
  }
  writeLocalJsonlKeeping('quotes.jsonl', id);
}

// ============================================================
// products
// ============================================================
function rowToProduct(r) {
  return { id: r.id, name: r.name || '', desc: r.description || '', price: r.price || '', image: r.image || '' };
}
function prodToRow(p) {
  return { id: p.id, name: p.name, description: p.desc || '', price: p.price || '', image: p.image || '', sort_order: p.sort_order || 0 };
}
async function readProducts() {
  if (ensureInit() && supabase) {
    const { data, error } = await supabase.from('products').select('*').order('sort_order', { ascending: true });
    if (error) throw error;
    return data.map(rowToProduct);
  }
  return readLocalJson('products.json', []);
}
async function upsertProduct(product) {
  if (ensureInit() && supabase) {
    const { data, error } = await supabase.from('products').upsert(prodToRow(product), { onConflict: 'id' }).select().single();
    if (error) throw error;
    return rowToProduct(data);
  }
  const list = readLocalJson('products.json', []);
  const idx = list.findIndex((p) => p.id === product.id);
  if (idx >= 0) list[idx] = product; else list.push(product);
  writeLocalJson('products.json', list);
  return product;
}
async function deleteProduct(id) {
  if (ensureInit() && supabase) {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
    return;
  }
  writeLocalJson('products.json', readLocalJson('products.json', []).filter((p) => p.id !== id));
}

// ============================================================
// content_blocks (header/footer/sections text+image)
// ============================================================
function rowToBlock(r) {
  return { key: r.key, title: r.title || '', body: r.body || '', image_url: r.image_url || '', link_url: r.link_url || '' };
}
async function readContent() {
  if (ensureInit() && supabase) {
    const { data, error } = await supabase.from('content_blocks').select('*');
    if (error) throw error;
    return data.map(rowToBlock);
  }
  return readLocalJson('content.json', []);
}
async function upsertContent(block) {
  if (ensureInit() && supabase) {
    const { data, error } = await supabase.from('content_blocks')
      .upsert({ key: block.key, title: block.title || '', body: block.body || '', image_url: block.image_url || '', link_url: block.link_url || '', updated_at: new Date().toISOString() }, { onConflict: 'key' })
      .select().single();
    if (error) throw error;
    return rowToBlock(data);
  }
  const list = readLocalJson('content.json', []);
  const idx = list.findIndex((b) => b.key === block.key);
  if (idx >= 0) list[idx] = block; else list.push(block);
  writeLocalJson('content.json', list);
  return block;
}

// ============================================================
// banners
// ============================================================
function rowToBanner(r) {
  return { id: r.id, title: r.title || '', image_url: r.image_url || '', link_url: r.link_url || '', sort_order: r.sort_order || 0, active: !!r.active };
}
async function readBanners() {
  if (ensureInit() && supabase) {
    const { data, error } = await supabase.from('banners').select('*').order('sort_order', { ascending: true });
    if (error) throw error;
    return data.map(rowToBanner);
  }
  return readLocalJson('banners.json', []);
}
async function upsertBanner(b) {
  if (ensureInit() && supabase) {
    const { data, error } = await supabase.from('banners').upsert(b, { onConflict: 'id' }).select().single();
    if (error) throw error;
    return rowToBanner(data);
  }
  const list = readLocalJson('banners.json', []);
  const idx = list.findIndex((x) => x.id === b.id);
  if (idx >= 0) list[idx] = b; else list.push(b);
  writeLocalJson('banners.json', list);
  return b;
}
async function deleteBanner(id) {
  if (ensureInit() && supabase) {
    const { error } = await supabase.from('banners').delete().eq('id', id);
    if (error) throw error;
    return;
  }
  writeLocalJson('banners.json', readLocalJson('banners.json', []).filter((x) => x.id !== id));
}

// ============================================================
// blog_posts
// ============================================================
function rowToPost(r) {
  return {
    id: r.id, slug: r.slug || '', title: r.title || '', excerpt: r.excerpt || '',
    body: r.body || '', cover_image: r.cover_image || '', published_at: r.published_at, active: !!r.active,
  };
}
async function readBlog() {
  if (ensureInit() && supabase) {
    const { data, error } = await supabase.from('blog_posts').select('*').order('published_at', { ascending: false });
    if (error) throw error;
    return data.map(rowToPost);
  }
  return readLocalJson('blog.json', []);
}
async function readBlogPost(slug) {
  if (ensureInit() && supabase) {
    const { data, error } = await supabase.from('blog_posts').select('*').eq('slug', slug).maybeSingle();
    if (error) throw error;
    return data ? rowToPost(data) : null;
  }
  return readLocalJson('blog.json', []).find((p) => p.slug === slug) || null;
}
async function upsertBlog(post) {
  if (ensureInit() && supabase) {
    const { data, error } = await supabase.from('blog_posts').upsert(post, { onConflict: 'id' }).select().single();
    if (error) throw error;
    return rowToPost(data);
  }
  const list = readLocalJson('blog.json', []);
  const idx = list.findIndex((x) => x.id === post.id);
  if (idx >= 0) list[idx] = post; else list.push(post);
  writeLocalJson('blog.json', list);
  return post;
}
async function deleteBlog(id) {
  if (ensureInit() && supabase) {
    const { error } = await supabase.from('blog_posts').delete().eq('id', id);
    if (error) throw error;
    return;
  }
  writeLocalJson('blog.json', readLocalJson('blog.json', []).filter((x) => x.id !== id));
}

// ============================================================
// storage upload (images) — Supabase Storage bucket 'site-assets'
// The admin "Upload" button sends a base64 image; we store it in the
// public bucket and return a public URL the front-end can use anywhere.
// ============================================================
async function uploadImage(opts) {
  if (!ensureInit() || !supabase) {
    throw new Error('Storage not connected. Set SUPABASE_SERVICE_ROLE_KEY in Vercel and run supabase-schema.sql.');
  }
  const bucket = 'site-assets';
  try { await supabase.storage.createBucket(bucket, { public: true }); }
  catch (e) { /* bucket may already exist — ignore */ }
  const ext = (opts.contentType || 'image/png').split('/')[1] || 'png';
  const safe = String(opts.filename || 'image').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-40);
  const stamp = Date.now().toString(36);
  const p = (opts.folder ? opts.folder + '/' : '') + stamp + '_' + safe + '.' + ext;
  const buf = Buffer.from(opts.data || '', 'base64');
  const { error } = await supabase.storage.from(bucket).upload(p, buf, { contentType: opts.contentType, upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(bucket).getPublicUrl(p);
  return data.publicUrl;
}
function dbStatus() { ensureInit(); return { connected: !!useSupabase, supabase: !!supabase }; }

// helper for local jsonl delete
function writeLocalJsonlKeeping(name, id) {
  const list = readLocalJsonl(name).filter((r) => r.id !== id);
  writeLocalJson(name.replace('.jsonl', '.json'), list);
}

module.exports = {
  ensureInit, dbStatus,
  readMessages, addMessage, deleteMessage,
  readQuotes, addQuote, deleteQuote,
  readProducts, upsertProduct, deleteProduct,
  readContent, upsertContent,
  readBanners, upsertBanner, deleteBanner,
  readBlog, readBlogPost, upsertBlog, deleteBlog,
  uploadImage,
};
