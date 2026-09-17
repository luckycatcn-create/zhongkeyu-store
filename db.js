// Data layer for the zhongkeyu site.
// On Vercel (production) it talks to Supabase (Postgres). Locally, when the
// SUPABASE_* env vars are absent, it gracefully falls back to JSON files under
// ./data so the site can be developed and smoke-tested without a database.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const MSG_FILE = path.join(DATA_DIR, 'messages.jsonl');
const PROD_FILE = path.join(DATA_DIR, 'products.json');

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

// ---------- local file fallback ----------
function readLocalMessages() {
  if (!fs.existsSync(MSG_FILE)) return [];
  const lines = fs.readFileSync(MSG_FILE, 'utf8').split('\n').filter(Boolean);
  return lines
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
function appendLocalMessage(rec) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.appendFileSync(MSG_FILE, JSON.stringify(rec) + '\n', 'utf8');
}
function readLocalProducts() {
  if (!fs.existsSync(PROD_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(PROD_FILE, 'utf8')); } catch { return []; }
}
function writeLocalProducts(list) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(PROD_FILE, JSON.stringify(list, null, 2), 'utf8');
}

// ---------- row <-> object mapping (snake_case DB <-> camelCase JS) ----------
function rowToMessage(r) {
  return {
    id: r.id, createdAt: r.created_at,
    name: r.name || '', email: r.email || '', phone: r.phone || '',
    message: r.message || '', company: r.company || '', country: r.country || '',
    product: r.product || '', budget: r.budget || '',
  };
}
function msgToRow(m) {
  return {
    id: m.id, created_at: m.createdAt,
    name: m.name, email: m.email, phone: m.phone, message: m.message,
    company: m.company, country: m.country, product: m.product, budget: m.budget,
  };
}
function rowToProduct(r) {
  return { id: r.id, name: r.name || '', desc: r.description || '', price: r.price || '', image: r.image || '' };
}
function prodToRow(p) {
  return { id: p.id, name: p.name, description: p.desc || '', price: p.price || '', image: p.image || '' };
}

// ---------- messages ----------
async function readMessages() {
  if (ensureInit() && supabase) {
    const { data, error } = await supabase.from('messages').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(rowToMessage);
  }
  return readLocalMessages();
}
async function addMessage(rec) {
  if (ensureInit() && supabase) {
    const { data, error } = await supabase.from('messages').insert(msgToRow(rec)).select().single();
    if (error) throw error;
    return rowToMessage(data);
  }
  appendLocalMessage(rec);
  return rec;
}

// ---------- products ----------
async function readProducts() {
  if (ensureInit() && supabase) {
    const { data, error } = await supabase.from('products').select('*').order('name', { ascending: true });
    if (error) throw error;
    return data.map(rowToProduct);
  }
  return readLocalProducts();
}
async function upsertProduct(product) {
  if (ensureInit() && supabase) {
    const { data, error } = await supabase.from('products').upsert(prodToRow(product), { onConflict: 'id' }).select().single();
    if (error) throw error;
    return rowToProduct(data);
  }
  const list = readLocalProducts();
  const idx = list.findIndex((p) => p.id === product.id);
  if (idx >= 0) list[idx] = product; else list.push(product);
  writeLocalProducts(list);
  return product;
}
async function deleteProduct(id) {
  if (ensureInit() && supabase) {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
    return;
  }
  const list = readLocalProducts().filter((p) => p.id !== id);
  writeLocalProducts(list);
}

module.exports = { ensureInit, readMessages, addMessage, readProducts, upsertProduct, deleteProduct };
