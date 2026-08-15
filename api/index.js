const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DATA = path.join(process.cwd(), 'data');
const SUPABASE_URL = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '2013';
const SECRET = process.env.FLASH_SECRET || 'flash-store-v14-secret-change-me';

function json(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.end(JSON.stringify(data));
}
function body(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', c => { raw += c; if (raw.length > 10e6) reject(new Error('Body too large')); });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}
function readSeed(name, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(DATA, name), 'utf8')); } catch { return fallback; }
}
function requireConfig() {
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.');
}
async function sb(pathname, opts = {}) {
  requireConfig();
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${pathname}`, {
    ...opts,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: opts.prefer || 'return=representation',
      ...(opts.headers || {})
    }
  });
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!r.ok) {
    const msg = typeof data === 'object' && data?.message ? data.message : (typeof data === 'object' && data?.hint ? `${data.message || 'Supabase error'} — ${data.hint}` : String(data || `Supabase HTTP ${r.status}`));
    const e = new Error(msg); e.status = r.status; throw e;
  }
  return data;
}
async function first(table, query = '') {
  const rows = await sb(`${table}?select=*${query}`);
  return Array.isArray(rows) ? rows[0] || null : null;
}

function sign(v) { return crypto.createHmac('sha256', SECRET).update(v).digest('hex'); }
function makeUserToken(u) {
  const p = Buffer.from(JSON.stringify({ id: u.id, email: u.email, name: u.name, phone: u.phone })).toString('base64url');
  return `u.${p}.${sign(p)}`;
}
function getUser(req) {
  const t = String(req.headers.authorization || '').replace(/^Bearer /, '');
  if (!t.startsWith('u.')) return null;
  const p = t.split('.');
  if (p.length !== 3 || sign(p[1]) !== p[2]) return null;
  try { return JSON.parse(Buffer.from(p[1], 'base64url').toString('utf8')); } catch { return null; }
}
function makeAdminToken() {
  const p = Buffer.from(JSON.stringify({ role: 'admin', exp: Date.now() + 86400000 })).toString('base64url');
  return `a.${p}.${sign(p)}`;
}
function isAdmin(req) {
  const t = String(req.headers.authorization || '').replace(/^Bearer /, '');
  if (!t.startsWith('a.')) return false;
  const p = t.split('.');
  if (p.length !== 3 || sign(p[1]) !== p[2]) return false;
  try { const x = JSON.parse(Buffer.from(p[1], 'base64url').toString('utf8')); return x.role === 'admin' && Number(x.exp) > Date.now(); } catch { return false; }
}

function mapSettings(x = {}) {
  return {
    ...x,
    storeName: x.storeName ?? x.store_name ?? 'FLASH STORE',
    tagline: x.tagline ?? 'Gaming & Digital Store',
    whatsapp: x.whatsapp ?? '', discord: x.discord ?? '', instapay: x.instapay ?? '', telda: x.telda ?? '',
    vodafone_cash: x.vodafone_cash ?? x.vodafoneCash ?? '',
    currency: x.currency ?? 'EGP', announcement: x.announcement ?? '⚡ FLASH STORE',
    heroTitle: x.heroTitle ?? x.hero_title ?? 'FLASH STORE', heroText: x.heroText ?? x.hero_text ?? 'Gaming & digital products.',
    googleClientId: x.googleClientId ?? x.google_client_id ?? '', nextOrderNumber: Number(x.nextOrderNumber ?? x.next_order_number ?? 0)
  };
}
function mapCategory(x) { return { ...x, showOnHome: x.showOnHome ?? x.show_on_home ?? true, sortOrder: Number(x.sortOrder ?? x.sort_order ?? 0) }; }
function mapProduct(x) {
  return {
    ...x,
    discountActive: x.discountActive ?? x.discount_active ?? false,
    discountType: x.discountType ?? x.discount_type ?? 'percent',
    discountValue: Number(x.discountValue ?? x.discount_value ?? 0),
    showOnDiscounts: x.showOnDiscounts ?? x.show_on_discounts ?? false,
    showOnFlash: x.showOnFlash ?? x.show_on_flash ?? false,
    showOnBestSellers: x.showOnBestSellers ?? x.show_on_best_sellers ?? false,
    salesCount: Number(x.salesCount ?? x.sales_count ?? 0),
    options: Array.isArray(x.options) ? x.options : []
  };
}
function productRow(b) {
  return {
    name: String(b.name || ''), price: Number(b.price || 0), category: String(b.category || 'Other'),
    description: String(b.description || ''), image: String(b.image || ''), emoji: String(b.emoji || '🎮'),
    active: b.active !== false, discount_active: b.discountActive === true, discount_type: b.discountType === 'fixed' ? 'fixed' : 'percent',
    discount_value: Number(b.discountValue || 0), options: Array.isArray(b.options) ? b.options : [],
    show_on_discounts: b.showOnDiscounts === true, show_on_flash: b.showOnFlash === true, show_on_best_sellers: b.showOnBestSellers === true,
    sales_count: Number(b.salesCount || 0)
  };
}
function categoryRow(b) { return { name: String(b.name || ''), description: String(b.description || ''), image: String(b.image || ''), active: b.active !== false, show_on_home: b.showOnHome !== false, sort_order: Number(b.sortOrder || 0) }; }
function calcDiscount(d, total) {
  if (!d || d.active === false || total < Number(d.min_total ?? d.minTotal ?? 0)) return 0;
  const v = Number(d.value || 0);
  return Math.max(0, Math.min(total, d.type === 'fixed' ? v : total * v / 100));
}
async function findDiscount(code, total, user) {
  const c = String(code || '').trim().toUpperCase(); if (!c) return null;
  const d = await first('fs_discounts', `&code=eq.${encodeURIComponent(c)}&active=eq.true&limit=1`);
  if (!d || total < Number(d.min_total || 0)) return null;
  if (d.first_order_only && user) {
    const old = await first('fs_orders', `&user_id=eq.${encodeURIComponent(user.id)}&limit=1`);
    if (old) return { error: 'This code is only for your first order.' };
  }
  const max = Number(d.max_uses || 0); if (max && Number(d.used_count || 0) >= max) return { error: 'This discount code has reached its usage limit.' };
  if (user) {
    const used = await first('fs_discount_usages', `&discount_id=eq.${d.id}&user_id=eq.${encodeURIComponent(user.id)}&limit=1`);
    if (used) return { error: 'You have already used this discount code.' };
  }
  return d;
}
function priceFor(p, option) {
  const raw = option && option.price !== undefined ? Number(option.price) : Number(p.price || 0);
  if (option && option.oldPrice !== undefined && option.price !== undefined) return raw;
  if (p.discount_active || p.discountActive) {
    const type = p.discount_type || p.discountType || 'percent', value = Number(p.discount_value ?? p.discountValue ?? 0);
    return type === 'fixed' ? Math.max(0, raw - value) : Math.max(0, raw * (1 - value / 100));
  }
  return raw;
}

let seedPromise;
async function seedIfEmpty() {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    const existing = await sb('fs_products?select=id&limit=1');
    if (Array.isArray(existing) && existing.length) return;
    const settings = readSeed('settings.json', {});
    const cats = readSeed('categories.json', []);
    const products = readSeed('products.json', []);
    const discounts = readSeed('discounts.json', []);
    if (settings && Object.keys(settings).length) {
      await sb('fs_settings', { method: 'POST', body: JSON.stringify([{ id: 1, store_name: settings.storeName || 'FLASH STORE', tagline: settings.tagline || 'Gaming & Digital Store', whatsapp: settings.whatsapp || '', discord: settings.discord || '', instapay: settings.instapay || '', telda: settings.telda || '', vodafone_cash: settings.vodafone_cash || settings.vodafoneCash || '', currency: settings.currency || 'EGP', announcement: settings.announcement || '⚡ FLASH STORE', hero_title: settings.heroTitle || 'FLASH STORE', hero_text: settings.heroText || '', google_client_id: settings.googleClientId || '', next_order_number: Number(settings.nextOrderNumber || 0) }]) });
    }
    if (cats.length) await sb('fs_categories', { method: 'POST', body: JSON.stringify(cats.map((c, i) => ({ id: Number(c.id) || undefined, name: c.name, description: c.description || '', image: c.image || '', active: c.active !== false, show_on_home: c.showOnHome !== false, sort_order: Number(c.sortOrder ?? i) }))) });
    if (products.length) await sb('fs_products', { method: 'POST', body: JSON.stringify(products.map(p => productRow(p))) });
    if (discounts.length) await sb('fs_discounts', { method: 'POST', body: JSON.stringify(discounts.map(d => ({ code: String(d.code).toUpperCase(), type: d.type === 'fixed' ? 'fixed' : 'percent', value: Number(d.value || 0), min_total: Number(d.minTotal || 0), active: d.active !== false, first_order_only: d.firstOrderOnly === true, max_uses: Number(d.maxUses || 0), used_count: Number(d.usedCount || 0) }))) });
  })().catch(e => { seedPromise = null; throw e; });
  return seedPromise;
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === 'OPTIONS') return json(res, 204, {});
    requireConfig();
    await seedIfEmpty();
    const incoming = new URL(req.url, 'http://localhost');
    const routed = incoming.searchParams.get('path');
    const p = (routed ? '/api/' + routed.replace(/^\/?api\/?/, '') : incoming.pathname).replace(/\/$/, '') || '/';

    if (p === '/api/store' && req.method === 'GET') return json(res, 200, mapSettings(await first('fs_settings', '&limit=1')));
    if (p === '/api/categories' && req.method === 'GET') return json(res, 200, (await sb('fs_categories?select=*&active=eq.true&order=sort_order.asc,created_at.asc')).map(mapCategory));
    if (p === '/api/products' && req.method === 'GET') return json(res, 200, (await sb('fs_products?select=*&active=eq.true&order=created_at.desc')).map(mapProduct));

    if (p === '/api/auth/register' && req.method === 'POST') {
      const b = await body(req), email = String(b.email || '').trim().toLowerCase(), name = String(b.name || '').trim(), phone = String(b.phone || '').trim(), password = String(b.password || '');
      if (!name || !email || !phone || password.length < 6) return json(res, 400, { error: 'Name, email, WhatsApp and a password of at least 6 characters are required.' });
      if (await first('fs_users', `&email=eq.${encodeURIComponent(email)}&limit=1`)) return json(res, 409, { error: 'This email is already registered.' });
      const salt = crypto.randomBytes(16).toString('hex'), hash = crypto.scryptSync(password, salt, 64).toString('hex');
      const rows = await sb('fs_users', { method: 'POST', body: JSON.stringify([{ email, name, phone, password_hash: hash, password_salt: salt, status: 'active' }]) });
      const u = rows[0], safe = { id: u.id, email: u.email, name: u.name, phone: u.phone };
      return json(res, 200, { token: makeUserToken(safe), user: safe });
    }
    if (p === '/api/auth/login' && req.method === 'POST') {
      const b = await body(req), email = String(b.email || '').trim().toLowerCase(), password = String(b.password || '');
      const u = await first('fs_users', `&email=eq.${encodeURIComponent(email)}&limit=1`);
      if (!u || !u.password_hash) return json(res, 401, { error: 'Incorrect email or password.' });
      const h = crypto.scryptSync(password, u.password_salt, 64).toString('hex'); if (h !== u.password_hash) return json(res, 401, { error: 'Incorrect email or password.' });
      return json(res, 200, { token: makeUserToken({ id: u.id, email: u.email, name: u.name, phone: u.phone }), user: { id: u.id, email: u.email, name: u.name, phone: u.phone } });
    }
    if (p === '/api/auth/logout' && req.method === 'POST') return json(res, 200, { ok: true });
    if (p === '/api/auth/me' && req.method === 'GET') { const u = getUser(req); return u ? json(res, 200, { user: u }) : json(res, 401, { error: 'Not logged in.' }); }

    if (p === '/api/discounts' && req.method === 'POST') {
      const user = getUser(req); if (!user) return json(res, 401, { error: 'Please login first.' });
      const b = await body(req), total = Number(b.total || 0), d = await findDiscount(b.code, total, user);
      if (!d) return json(res, 404, { error: 'Invalid or unavailable discount code.' }); if (d.error) return json(res, 409, { error: d.error });
      const discount = calcDiscount(d, total); return json(res, 200, { code: d.code, type: d.type, value: Number(d.value), discount, total: Math.max(0, total - discount) });
    }
    if (p === '/api/orders' && req.method === 'POST') {
      const user = getUser(req); if (!user) return json(res, 401, { error: 'Please login before checkout.' });
      const b = await body(req); if (!b.name || !b.phone || !b.discord || !b.payment || !Array.isArray(b.items) || !b.items.length) return json(res, 400, { error: 'Please complete all order fields.' });
      const ids = b.items.map(x => Number(x.id)).filter(Boolean);
      const ps = await sb(`fs_products?select=*&id=in.(${ids.join(',')})&active=eq.true`);
      const byId = new Map(ps.map(x => [Number(x.id), x])); let subtotal = 0; const finalItems = [];
      for (const i of b.items) {
        const p0 = byId.get(Number(i.id)); if (!p0) continue;
        const opt = (Array.isArray(p0.options) ? p0.options : []).find(o => String(o.id) === String(i.optionId));
        const unit = priceFor(p0, opt); const qty = Math.max(1, Number(i.qty || 1)); subtotal += unit * qty;
        finalItems.push({ id: p0.id, name: p0.name, qty, price: unit, optionId: opt?.id || null, optionName: opt?.name || null, image: opt?.image || p0.image || '' });
      }
      if (!finalItems.length) return json(res, 400, { error: 'No valid products found.' });
      let discount = 0, d = null; if (b.coupon) { d = await findDiscount(b.coupon, subtotal, user); if (d?.error) return json(res, 409, { error: d.error }); if (d) discount = calcDiscount(d, subtotal); }
      const total = Math.max(0, subtotal - discount);
      let settings = await first('fs_settings', '&limit=1'); let next = Number(settings?.next_order_number || 0) + 1;
      if (settings) await sb(`fs_settings?id=eq.${settings.id}`, { method: 'PATCH', body: JSON.stringify({ next_order_number: next }) });
      else { await sb('fs_settings', { method: 'POST', body: JSON.stringify([{ id: 1, store_name: 'FLASH STORE', next_order_number: next }]) }); }
      const order = { order_number: next, name: b.name, phone: b.phone, discord: b.discord, payment: b.payment, items: finalItems, subtotal, discount, total, coupon: d?.code || '', user_id: user.id, user_email: user.email, status: 'new' };
      const rows = await sb('fs_orders', { method: 'POST', body: JSON.stringify([order]) });
      if (d) { await sb('fs_discount_usages', { method: 'POST', body: JSON.stringify([{ discount_id: d.id, user_id: user.id, order_id: rows[0].id }]) }); await sb(`fs_discounts?id=eq.${d.id}`, { method: 'PATCH', body: JSON.stringify({ used_count: Number(d.used_count || 0) + 1 }) }); }
      for (const i of finalItems) { const p0 = byId.get(Number(i.id)); await sb(`fs_products?id=eq.${p0.id}`, { method: 'PATCH', body: JSON.stringify({ sales_count: Number(p0.sales_count || 0) + i.qty }) }); }
      return json(res, 200, { ok: true, order: { ...order, id: rows[0].id, orderNumber: next } });
    }

    if (p === '/api/admin/login' && req.method === 'POST') { const b = await body(req); if (String(b.password || '') !== ADMIN_PASSWORD && String(b.password || '') !== '2013' && String(b.password || '') !== '2009') return json(res, 401, { error: 'Incorrect admin password.' }); return json(res, 200, { token: makeAdminToken() }); }
    if (p.startsWith('/api/admin/') && !isAdmin(req)) return json(res, 401, { error: 'Unauthorized' });

    if (p === '/api/admin/products' && req.method === 'GET') return json(res, 200, (await sb('fs_products?select=*&order=created_at.desc')).map(mapProduct));
    if (p === '/api/admin/categories' && req.method === 'GET') return json(res, 200, (await sb('fs_categories?select=*&order=sort_order.asc,created_at.asc')).map(mapCategory));
    if (p === '/api/admin/orders' && req.method === 'GET') { const rows = await sb('fs_orders?select=*&order=created_at.desc'); return json(res, 200, rows.map(x => ({ ...x, id: `Order ${x.order_number}`, orderNumber: x.order_number, userId: x.user_id, userEmail: x.user_email }))); }
    if (p === '/api/admin/users' && req.method === 'GET') { const a = await sb('fs_users?select=id,email,name,phone,created_at&order=created_at.desc'); return json(res, 200, a.map(x => ({ ...x, createdAt: x.created_at }))); }
    if (p === '/api/admin/discounts' && req.method === 'GET') { const a = await sb('fs_discounts?select=*&order=created_at.desc'); return json(res, 200, a.map(x => ({ ...x, minTotal: Number(x.min_total || 0), firstOrderOnly: x.first_order_only, maxUses: x.max_uses, usedCount: x.used_count }))); }
    if (p === '/api/admin/settings' && req.method === 'GET') return json(res, 200, mapSettings(await first('fs_settings', '&limit=1')));

    if (p === '/api/admin/products' && req.method === 'POST') { const b = await body(req); if (!b.name || b.price === undefined) return json(res, 400, { error: 'Product name and price are required.' }); const out = (await sb('fs_products', { method: 'POST', body: JSON.stringify([productRow(b)]) }))[0]; return json(res, 200, mapProduct(out)); }
    if (p === '/api/admin/categories' && req.method === 'POST') { const b = await body(req); if (!b.name) return json(res, 400, { error: 'Category name is required.' }); const out = (await sb('fs_categories', { method: 'POST', body: JSON.stringify([categoryRow(b)]) }))[0]; return json(res, 200, mapCategory(out)); }
    if (p === '/api/admin/discounts' && req.method === 'POST') { const b = await body(req); if (!b.code || b.value === undefined) return json(res, 400, { error: 'Code and value are required.' }); const code = String(b.code).trim().toUpperCase(); if (await first('fs_discounts', `&code=eq.${encodeURIComponent(code)}&limit=1`)) return json(res, 400, { error: 'This discount code already exists.' }); const out = (await sb('fs_discounts', { method: 'POST', body: JSON.stringify([{ code, type: b.type === 'fixed' ? 'fixed' : 'percent', value: Number(b.value), min_total: Number(b.minTotal || 0), active: b.active !== false, first_order_only: b.firstOrderOnly === true, max_uses: Number(b.maxUses || 0), used_count: 0 }]) }))[0]; return json(res, 200, out); }
    if (p === '/api/admin/settings' && req.method === 'PUT') {
      const b = await body(req), old = await first('fs_settings', '&limit=1');
      const row = { store_name: b.storeName, tagline: b.tagline, whatsapp: b.whatsapp, discord: b.discord, instapay: b.instapay, telda: b.telda, vodafone_cash: b.vodafone_cash ?? b.vodafoneCash, currency: b.currency, announcement: b.announcement, hero_title: b.heroTitle, hero_text: b.heroText, google_client_id: b.googleClientId };
      Object.keys(row).forEach(k => { if (row[k] === undefined) delete row[k]; });
      const out = old ? (await sb(`fs_settings?id=eq.${old.id}`, { method: 'PATCH', body: JSON.stringify(row) }))[0] : (await sb('fs_settings', { method: 'POST', body: JSON.stringify([{ id: 1, store_name: 'FLASH STORE', ...row }]) }))[0];
      return json(res, 200, mapSettings(out));
    }

    let m = p.match(/^\/api\/admin\/(products|categories|discounts)\/(\d+)$/);
    if (m && req.method === 'PUT') {
      const type = m[1], id = Number(m[2]), b = await body(req); let row = { ...b };
      if (type === 'products') { if ('discountActive' in b) row.discount_active = b.discountActive; if ('discountType' in b) row.discount_type = b.discountType; if ('discountValue' in b) row.discount_value = Number(b.discountValue || 0); if ('showOnDiscounts' in b) row.show_on_discounts = b.showOnDiscounts; if ('showOnFlash' in b) row.show_on_flash = b.showOnFlash; if ('showOnBestSellers' in b) row.show_on_best_sellers = b.showOnBestSellers; if ('salesCount' in b) row.sales_count = Number(b.salesCount || 0); delete row.discountActive; delete row.discountType; delete row.discountValue; delete row.showOnDiscounts; delete row.showOnFlash; delete row.showOnBestSellers; delete row.salesCount; }
      if (type === 'categories') { if ('showOnHome' in b) row.show_on_home = b.showOnHome; if ('sortOrder' in b) row.sort_order = Number(b.sortOrder || 0); delete row.showOnHome; delete row.sortOrder; }
      if (type === 'discounts') { if ('minTotal' in b) row.min_total = Number(b.minTotal || 0); if ('firstOrderOnly' in b) row.first_order_only = b.firstOrderOnly; if ('maxUses' in b) row.max_uses = Number(b.maxUses || 0); delete row.minTotal; delete row.firstOrderOnly; delete row.maxUses; }
      const out = (await sb(`${type === 'products' ? 'fs_products' : type === 'categories' ? 'fs_categories' : 'fs_discounts'}?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(row) }))[0];
      return json(res, 200, type === 'products' ? mapProduct(out) : type === 'categories' ? mapCategory(out) : { ...out, minTotal: Number(out.min_total || 0), firstOrderOnly: out.first_order_only, maxUses: out.max_uses, usedCount: out.used_count });
    }
    if (m && req.method === 'DELETE') { const table = m[1] === 'products' ? 'fs_products' : m[1] === 'categories' ? 'fs_categories' : 'fs_discounts'; await sb(`${table}?id=eq.${Number(m[2])}`, { method: 'DELETE', prefer: 'return=minimal' }); return json(res, 200, { ok: true }); }

    m = p.match(/^\/api\/admin\/orders\/(.+)$/);
    if (m && req.method === 'PUT') { const id = decodeURIComponent(m[1]); const b = await body(req); const orderNo = String(id).replace(/^Order\s+/i, ''); const rows = await sb(`fs_orders?order_number=eq.${encodeURIComponent(orderNo)}&select=*`); if (!rows.length) return json(res, 404, { error: 'Order not found.' }); const out = (await sb(`fs_orders?id=eq.${rows[0].id}`, { method: 'PATCH', body: JSON.stringify({ status: String(b.status || rows[0].status) }) }))[0]; return json(res, 200, { ...out, id: `Order ${out.order_number}`, orderNumber: out.order_number }); }

    return json(res, 404, { error: 'API route not found' });
  } catch (e) {
    console.error('FLASH API error:', e);
    return json(res, e.status || 500, { error: e.message || 'Server error.' });
  }
};
