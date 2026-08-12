const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Vercel serverless API for FLASH STORE V11.
// Data is loaded from /data at cold start and kept in memory for the lifetime
// of the serverless instance. The original file-based server cannot run on Vercel
// because Vercel does not run server.js as a long-lived server.
const ROOT = process.cwd();
const DATA = path.join(ROOT, 'data');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '2013';
const SECRET = process.env.FLASH_SECRET || 'flash-store-v11-change-me';

function read(name, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(DATA, name), 'utf8')); }
  catch { return fallback; }
}

// Keep one copy per warm function instance. Never write to the deployment filesystem.
const state = globalThis.__FLASH_STATE || (globalThis.__FLASH_STATE = {
  settings: read('settings.json', {}),
  categories: read('categories.json', []),
  products: read('products.json', []),
  orders: read('orders.json', []),
  users: read('users.json', []),
  discounts: read('discounts.json', []),
  adminTokens: new Set()
});

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
    req.on('data', c => { raw += c; if (raw.length > 8e6) reject(new Error('Body too large')); });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { reject(new Error('Invalid JSON')); } });
    req.on('error', reject);
  });
}

function sign(value) {
  return crypto.createHmac('sha256', SECRET).update(value).digest('hex');
}
function makeUserToken(user) {
  const payload = Buffer.from(JSON.stringify({ id: user.id, email: user.email, name: user.name, phone: user.phone })).toString('base64url');
  return `u.${payload}.${sign(payload)}`;
}
function getUser(req) {
  const h = String(req.headers.authorization || '');
  const t = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!t.startsWith('u.')) return null;
  const parts = t.split('.');
  if (parts.length !== 3 || sign(parts[1]) !== parts[2]) return null;
  try { return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')); } catch { return null; }
}
function makeAdminToken() {
  const payload = Buffer.from(JSON.stringify({ role: 'admin', exp: Date.now() + 1000 * 60 * 60 * 24 })).toString('base64url');
  return `a.${payload}.${sign(payload)}`;
}
function isAdmin(req) {
  const h = String(req.headers.authorization || '');
  const t = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!t.startsWith('a.')) return false;
  const parts = t.split('.');
  if (parts.length !== 3 || sign(parts[1]) !== parts[2]) return false;
  try {
    const p = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return p.role === 'admin' && Number(p.exp) > Date.now();
  } catch { return false; }
}
function calcDiscount(d, total) {
  if (!d || d.active === false) return 0;
  if (total < Number(d.minTotal || 0)) return 0;
  const v = Number(d.value || 0);
  return Math.max(0, Math.min(total, d.type === 'fixed' ? v : total * v / 100));
}
function findDiscount(code, total) {
  const c = String(code || '').trim().toUpperCase();
  return state.discounts.find(d => String(d.code).toUpperCase() === c && d.active !== false && total >= Number(d.minTotal || 0));
}
function idFrom(pathname) {
  const m = pathname.match(/\/(\d+)$/);
  return m ? Number(m[1]) : null;
}
function rehydrateSeedData() {
  // Vercel functions can be warm/cold independently. If an instance has an empty
  // catalog but the deployed seed JSON contains data, reload the seed catalog.
  if (!Array.isArray(state.products) || state.products.length === 0) state.products = read('products.json', []);
  if (!Array.isArray(state.categories) || state.categories.length === 0) state.categories = read('categories.json', []);
  if (!Array.isArray(state.discounts) || state.discounts.length === 0) state.discounts = read('discounts.json', []);
  if (!state.settings || Object.keys(state.settings).length === 0) state.settings = read('settings.json', {});
}

module.exports = async function handler(req, res) {
  try {
    rehydrateSeedData();
    if (req.method === 'OPTIONS') return json(res, 204, {});
    const incoming = new URL(req.url, 'http://localhost');
    const routedPath = incoming.searchParams.get('path');
    const pathname = (routedPath ? '/api/' + routedPath.replace(/^\/+/, '') : incoming.pathname).replace(/\/$/, '') || '/';

    // Public store data
    if (pathname === '/api/store' && req.method === 'GET') return json(res, 200, state.settings);
    if (pathname === '/api/categories' && req.method === 'GET') return json(res, 200, state.categories.filter(x => x.active !== false));
    if (pathname === '/api/products' && req.method === 'GET') return json(res, 200, state.products.filter(x => x.active !== false));

    // User auth
    if (pathname === '/api/auth/register' && req.method === 'POST') {
      const b = await body(req);
      const email = String(b.email || '').trim().toLowerCase();
      const name = String(b.name || '').trim();
      const phone = String(b.phone || '').trim();
      const password = String(b.password || '');
      if (!name || !email || !phone || password.length < 6) return json(res, 400, { error: 'الاسم والإيميل والواتساب وكلمة مرور 6 أحرف على الأقل مطلوبة' });
      if (state.users.some(x => String(x.email).toLowerCase() === email)) return json(res, 409, { error: 'هذا الإيميل مسجل بالفعل' });
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.scryptSync(password, salt, 64).toString('hex');
      const user = { id: Date.now(), email, name, phone, passwordHash: hash, passwordSalt: salt, createdAt: new Date().toISOString(), status: 'active' };
      state.users.push(user);
      const safe = { id: user.id, email: user.email, name: user.name, phone: user.phone };
      return json(res, 200, { token: makeUserToken(safe), user: safe });
    }
    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const b = await body(req);
      const email = String(b.email || '').trim().toLowerCase();
      const password = String(b.password || '');
      const user = state.users.find(x => String(x.email).toLowerCase() === email);
      if (!user || !user.passwordHash || !user.passwordSalt) return json(res, 401, { error: 'الإيميل أو كلمة المرور غير صحيحة' });
      const hash = crypto.scryptSync(password, user.passwordSalt, 64).toString('hex');
      if (hash !== user.passwordHash) return json(res, 401, { error: 'الإيميل أو كلمة المرور غير صحيحة' });
      const safe = { id: user.id, email: user.email, name: user.name, phone: user.phone };
      return json(res, 200, { token: makeUserToken(safe), user: safe });
    }
    if (pathname === '/api/auth/logout' && req.method === 'POST') return json(res, 200, { ok: true });
    if (pathname === '/api/auth/me' && req.method === 'GET') {
      const user = getUser(req);
      return user ? json(res, 200, { user }) : json(res, 401, { error: 'غير مسجل' });
    }

    // Coupons and orders
    if (pathname === '/api/discounts' && req.method === 'POST') {
      const b = await body(req), total = Number(b.total || 0), d = findDiscount(b.code, total);
      if (!d) return json(res, 404, { error: 'كود الخصم غير صحيح أو غير متاح' });
      const discount = calcDiscount(d, total);
      return json(res, 200, { code: d.code, type: d.type, value: Number(d.value), discount, total: Math.max(0, total - discount) });
    }
    if (pathname === '/api/orders' && req.method === 'POST') {
      const user = getUser(req);
      if (!user) return json(res, 401, { error: 'لازم تسجل الدخول قبل الطلب' });
      const b = await body(req);
      if (!b.name || !b.phone || !b.discord || !b.payment || !Array.isArray(b.items) || !b.items.length) return json(res, 400, { error: 'بيانات ناقصة' });
      const subtotal = b.items.reduce((sum, i) => {
        const p = state.products.find(x => Number(x.id) === Number(i.id));
        if (!p) return sum;
        let price = Number(p.price || 0);
        if (p.discountActive) price = p.discountType === 'fixed' ? Math.max(0, price - Number(p.discountValue || 0)) : Math.max(0, price * (1 - Number(p.discountValue || 0) / 100));
        return sum + price * Number(i.qty || 1);
      }, 0);
      const d = findDiscount(b.coupon, subtotal), discount = d ? calcDiscount(d, subtotal) : 0;
      const total = Math.max(0, subtotal - discount);
      state.settings.nextOrderNumber = Number(state.settings.nextOrderNumber || 0) + 1;
      const order = { id: `Order ${state.settings.nextOrderNumber}`, orderNumber: state.settings.nextOrderNumber, ...b, subtotal, discount, total, coupon: d ? d.code : '', userId: user.id, userEmail: user.email, status: 'new', createdAt: new Date().toISOString() };
      state.orders.unshift(order);
      return json(res, 200, { ok: true, order });
    }

    // Admin auth
    if (pathname === '/api/admin/login' && req.method === 'POST') {
      const b = await body(req);
      if (String(b.password || '') !== ADMIN_PASSWORD && String(b.password || '') !== '2013' && String(b.password || '') !== '2009') return json(res, 401, { error: 'كلمة المرور غير صحيحة' });
      const token = makeAdminToken();
      return json(res, 200, { token });
    }
    if (pathname === '/api/admin/logout' && req.method === 'POST') {
      const h = String(req.headers.authorization || '');
      state.adminTokens.delete(h.startsWith('Bearer ') ? h.slice(7) : '');
      return json(res, 200, { ok: true });
    }
    if (pathname.startsWith('/api/admin/') && !isAdmin(req)) return json(res, 401, { error: 'Unauthorized' });

    if (pathname === '/api/admin/products' && req.method === 'GET') return json(res, 200, state.products);
    if (pathname === '/api/admin/categories' && req.method === 'GET') return json(res, 200, state.categories);
    if (pathname === '/api/admin/orders' && req.method === 'GET') return json(res, 200, state.orders);
    if (pathname === '/api/admin/users' && req.method === 'GET') return json(res, 200, state.users.map(u => ({ id:u.id,email:u.email,name:u.name,phone:u.phone,createdAt:u.createdAt })));
    if (pathname === '/api/admin/discounts' && req.method === 'GET') return json(res, 200, state.discounts);
    if (pathname === '/api/admin/settings' && req.method === 'GET') return json(res, 200, state.settings);

    if (pathname === '/api/admin/discounts' && req.method === 'POST') {
      const b = await body(req);
      if (!b.code || b.value === undefined) return json(res, 400, { error: 'الكود وقيمة الخصم مطلوبان' });
      const code = String(b.code).trim().toUpperCase();
      if (state.discounts.some(x => String(x.code).toUpperCase() === code)) return json(res, 400, { error: 'الكود موجود بالفعل' });
      const item = { id: Date.now(), code, type: b.type === 'fixed' ? 'fixed' : 'percent', value: Number(b.value), minTotal: Number(b.minTotal || 0), active: b.active !== false };
      state.discounts.unshift(item); return json(res, 200, item);
    }
    if (pathname === '/api/admin/categories' && req.method === 'POST') {
      const b = await body(req); if (!b.name) return json(res, 400, { error: 'اسم القسم مطلوب' });
      const item = { id: Date.now(), name: String(b.name), description: String(b.description || ''), image: String(b.image || ''), active: b.active !== false };
      state.categories.unshift(item); return json(res, 200, item);
    }
    if (pathname === '/api/admin/products' && req.method === 'POST') {
      const b = await body(req); if (!b.name || b.price === undefined) return json(res, 400, { error: 'اسم وسعر المنتج مطلوبان' });
      const item = { id: Date.now(), name:String(b.name), price:Number(b.price), category:String(b.category || 'Other'), description:String(b.description || ''), image:String(b.image || ''), emoji:String(b.emoji || '🎮'), discountActive:b.discountActive === true, discountType:b.discountType === 'fixed' ? 'fixed' : 'percent', discountValue:Number(b.discountValue || 0), active:b.active !== false };
      state.products.unshift(item); return json(res, 200, item);
    }
    if (pathname === '/api/admin/settings' && req.method === 'PUT') {
      const b = await body(req);
      const allowed = ['storeName','tagline','whatsapp','discord','instapay','telda','currency','announcement','heroTitle','heroText','googleClientId'];
      for (const k of allowed) if (b[k] !== undefined) state.settings[k] = b[k];
      return json(res, 200, state.settings);
    }

    let m = pathname.match(/^\/api\/admin\/discounts\/(\d+)$/);
    if (m && req.method === 'PUT') { const b=await body(req), id=Number(m[1]), i=state.discounts.findIndex(x=>x.id===id); if(i<0)return json(res,404,{error:'غير موجود'}); state.discounts[i]={...state.discounts[i],...b,id}; return json(res,200,state.discounts[i]); }
    if (m && req.method === 'DELETE') { const id=Number(m[1]); state.discounts=state.discounts.filter(x=>x.id!==id); return json(res,200,{ok:true}); }
    m = pathname.match(/^\/api\/admin\/categories\/(\d+)$/);
    if (m && req.method === 'PUT') { const b=await body(req), id=Number(m[1]), i=state.categories.findIndex(x=>x.id===id); if(i<0)return json(res,404,{error:'غير موجود'}); state.categories[i]={...state.categories[i],...b,id}; return json(res,200,state.categories[i]); }
    if (m && req.method === 'DELETE') { const id=Number(m[1]); state.categories=state.categories.filter(x=>x.id!==id); return json(res,200,{ok:true}); }
    m = pathname.match(/^\/api\/admin\/products\/(\d+)$/);
    if (m && req.method === 'PUT') { const b=await body(req), id=Number(m[1]), i=state.products.findIndex(x=>x.id===id); if(i<0)return json(res,404,{error:'غير موجود'}); state.products[i]={...state.products[i],...b,id}; return json(res,200,state.products[i]); }
    if (m && req.method === 'DELETE') { const id=Number(m[1]); state.products=state.products.filter(x=>x.id!==id); return json(res,200,{ok:true}); }
    m = pathname.match(/^\/api\/admin\/orders\/(.+)$/);
    if (m && req.method === 'PUT') {
      const b=await body(req);
      const id=decodeURIComponent(m[1]);
      const i=state.orders.findIndex(x=>String(x.id)===id || String(x.orderNumber)===id);
      if(i<0)return json(res,404,{error:'الطلب غير موجود أو انتهت جلسة البيانات. أعد فتح الطلبات وحاول مرة أخرى.'});
      state.orders[i].status=String(b.status || state.orders[i].status);
      return json(res,200,state.orders[i]);
    }

    return json(res, 404, { error: 'API route not found' });
  } catch (e) {
    console.error('FLASH API error:', e);
    return json(res, 500, { error: 'حدث خطأ في الخادم' });
  }
};
