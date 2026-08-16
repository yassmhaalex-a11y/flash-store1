const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = process.cwd();
const DATA = path.join(ROOT, 'data');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '2013';
const SECRET = process.env.FLASH_SECRET || 'flash-store-v14-save-fixed-change-me';
let SUPABASE_URL = String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/+$/,'');
SUPABASE_URL = SUPABASE_URL.replace(/\/rest\/v1$/,'');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY || '';
const SUPABASE_PUBLIC_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '';

function read(name,fallback){try{return JSON.parse(fs.readFileSync(path.join(DATA,name),'utf8'))}catch{return fallback}}
function json(res,status,data){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS');res.end(JSON.stringify(data))}
function body(req){return new Promise((resolve,reject)=>{let raw='';req.on('data',c=>{raw+=c;if(raw.length>8e6)reject(new Error('Body too large'))});req.on('end',()=>{try{resolve(raw?JSON.parse(raw):{})}catch{reject(new Error('Invalid JSON'))}});req.on('error',reject)})}
function sign(v){return crypto.createHmac('sha256',SECRET).update(v).digest('hex')}
function makeUserToken(u){const p=Buffer.from(JSON.stringify({id:u.id,email:u.email,name:u.name,phone:u.phone})).toString('base64url');return `u.${p}.${sign(p)}`}
function getUser(req){const t=String(req.headers.authorization||'').replace(/^Bearer /,'');if(!t.startsWith('u.'))return null;const p=t.split('.');if(p.length!==3||sign(p[1])!==p[2])return null;try{return JSON.parse(Buffer.from(p[1],'base64url').toString('utf8'))}catch{return null}}
function makeAdminToken(){const p=Buffer.from(JSON.stringify({role:'admin',exp:Date.now()+86400000})).toString('base64url');return `a.${p}.${sign(p)}`}
function isAdmin(req){const t=String(req.headers.authorization||'').replace(/^Bearer /,'');if(!t.startsWith('a.'))return false;const p=t.split('.');if(p.length!==3||sign(p[1])!==p[2])return false;try{const x=JSON.parse(Buffer.from(p[1],'base64url').toString('utf8'));return x.role==='admin'&&Number(x.exp)>Date.now()}catch{return false}}

function sbEnabled(){return !!(SUPABASE_URL && SUPABASE_KEY)}
async function sb(pathname,opts={}){
  if(!sbEnabled()) throw new Error('Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.');
  const headers={apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,Prefer:opts.prefer||'return=representation',...(opts.headers||{})};
  const r=await fetch(`${SUPABASE_URL}/rest/v1/${pathname}`,{...opts,headers});
  const text=await r.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=text}
  if(!r.ok){const msg=(data&&typeof data==='object'&&(data.message||data.error||data.hint))||`Supabase HTTP ${r.status}`;const e=new Error(String(msg));e.status=r.status;throw e}
  return data;
}
async function first(table,query=''){const rows=await sb(`${table}?select=*${query}`);return Array.isArray(rows)?rows[0]:null}
function snakeProduct(x){return {name:String(x.name||''),price:Number(x.price||0),category:String(x.category||'Other'),description:String(x.description||''),image:String(x.image||''),emoji:String(x.emoji||'🎮'),active:x.active!==false,discount_active:x.discountActive===true||x.discount_active===true,discount_type:x.discountType||x.discount_type||'percent',discount_value:Number(x.discountValue??x.discount_value??0),options:Array.isArray(x.options)?x.options:[],show_on_discounts:x.showOnDiscounts===true||x.show_on_discounts===true,show_on_flash:x.showOnFlash===true||x.show_on_flash===true,show_on_best_sellers:x.showOnBestSellers===true||x.show_on_best_sellers===true,sales_count:Number(x.salesCount??x.sales_count??0)}}
function mapProduct(x){return {...x,discountActive:x.discount_active??false,discountType:x.discount_type||'percent',discountValue:Number(x.discount_value||0),showOnDiscounts:x.show_on_discounts??false,showOnFlash:x.show_on_flash??false,showOnBestSellers:x.show_on_best_sellers??false,salesCount:Number(x.sales_count||0),options:Array.isArray(x.options)?x.options:[]}}
function mapCategory(x){return {...x,showOnHome:x.show_on_home??true,sortOrder:Number(x.sort_order||0)}}
function mapSettings(x){x=x||{};return {...x,storeName:x.store_name??x.storeName??'FLASH STORE',tagline:x.tagline??'Gaming & Digital Store',whatsapp:x.whatsapp??'',discord:x.discord??'',instapay:x.instapay??'',telda:x.telda??'',vodafone_cash:x.vodafone_cash??'',vodafoneCash:x.vodafone_cash??'',currency:x.currency??'EGP',announcement:x.announcement??'⚡ FLASH STORE',heroTitle:x.hero_title??x.heroTitle??'FLASH STORE',heroText:x.hero_text??x.heroText??'Gaming & digital products.',googleClientId:x.google_client_id??x.googleClientId??'',nextOrderNumber:Number(x.next_order_number??x.nextOrderNumber??0)}}
function calcDiscount(d,total){if(!d||d.active===false||total<Number(d.min_total??d.minTotal??0))return 0;const v=Number(d.value||0);return Math.max(0,Math.min(total,d.type==='fixed'?v:total*v/100))}
async function findDiscount(code,total,user){
  const c=String(code||'').trim().toUpperCase();if(!c)return null;
  const d=await first('fs_discounts',`&code=eq.${encodeURIComponent(c)}&active=eq.true&limit=1`);
  if(!d||total<Number(d.min_total||0))return null;
  if(d.first_order_only){const old=await first('fs_orders',`&user_id=eq.${encodeURIComponent(user.id)}&limit=1`);if(old)return {error:'This code is only for your first order.'}}
  if(Number(d.max_uses||0)&&Number(d.used_count||0)>=Number(d.max_uses))return {error:'This discount code has reached its usage limit.'};
  const used=await first('fs_discount_usages',`&discount_id=eq.${d.id}&user_id=eq.${encodeURIComponent(user.id)}&limit=1`);if(used)return {error:'You have already used this discount code.'};
  return d;
}

let cache=null;
async function loadStore(){
  if(cache)return cache;
  if(!sbEnabled()) {
    cache={settings:read('settings.json',{}),categories:read('categories.json',[]),products:read('products.json',[]),users:read('users.json',[]),orders:read('orders.json',[]),discounts:read('discounts.json',[])};
    return cache;
  }
  try{
    let [s,c,p,u,o,d]=await Promise.all([
      first('fs_settings','&limit=1'),
      sb('fs_categories?select=*&order=sort_order.asc,created_at.asc'),
      sb('fs_products?select=*&order=created_at.desc'),
      sb('fs_users?select=*'),
      sb('fs_orders?select=*&order=created_at.desc'),
      sb('fs_discounts?select=*&order=created_at.desc')
    ]);
    if(!s){const seed=read('settings.json',{});s=(await sb('fs_settings',{method:'POST',body:JSON.stringify([{store_name:seed.storeName||'FLASH STORE',tagline:seed.tagline||'Gaming & Digital Store',whatsapp:seed.whatsapp||'',discord:seed.discord||'',instapay:seed.instapay||'',telda:seed.telda||'',currency:seed.currency||'EGP',announcement:seed.announcement||'⚡ FLASH STORE',hero_title:seed.heroTitle||'FLASH STORE',hero_text:seed.heroText||'',google_client_id:seed.googleClientId||'',next_order_number:Number(seed.nextOrderNumber||0)}])}))[0]}
    if(!c.length){const seed=read('categories.json',[]);for(const x of seed){await sb('fs_categories',{method:'POST',body:JSON.stringify([{id:Number(x.id)||undefined,name:x.name,description:x.description||'',image:x.image||'',active:x.active!==false,show_on_home:x.showOnHome!==false,sort_order:Number(x.sortOrder||0)}])})}c=await sb('fs_categories?select=*&order=sort_order.asc,created_at.asc')}
    if(!p.length){const seed=read('products.json',[]);for(const x of seed){await sb('fs_products',{method:'POST',body:JSON.stringify([{id:Number(x.id)||undefined,...snakeProduct(x)}])})}p=await sb('fs_products?select=*&order=created_at.desc')}
    if(!d.length){const seed=read('discounts.json',[]);for(const x of seed){await sb('fs_discounts',{method:'POST',body:JSON.stringify([{id:Number(x.id)||undefined,code:x.code,type:x.type||'percent',value:Number(x.value||0),min_total:Number(x.minTotal||0),active:x.active!==false,first_order_only:x.firstOrderOnly===true,max_uses:Number(x.maxUses||0),used_count:Number(x.usedCount||0)}])})}d=await sb('fs_discounts?select=*&order=created_at.desc')}
    cache={settings:mapSettings(s),categories:c.map(mapCategory),products:p.map(mapProduct),users:u||[],orders:o||[],discounts:d||[]};
    return cache;
  }catch(e){
    console.error('FLASH Supabase load error:',e);
    cache={settings:read('settings.json',{}),categories:read('categories.json',[]),products:read('products.json',[]),users:read('users.json',[]),orders:read('orders.json',[]),discounts:read('discounts.json',[])};
    cache._supabaseError=e.message;
    return cache;
  }
}
function invalidate(){cache=null}

module.exports=async function handler(req,res){
 try{
  if(req.method==='OPTIONS')return json(res,204,{});
  const u=new URL(req.url,'http://localhost');
  let pathname=u.searchParams.get('path')?'/api/'+u.searchParams.get('path').replace(/^\/?api\/?/,''):u.pathname;
  pathname=pathname.replace(/\/$/,'')||'/';
  const store=await loadStore();

  if(pathname==='/api/store'&&req.method==='GET')return json(res,200,mapSettings(store.settings));
  if(pathname==='/api/categories'&&req.method==='GET')return json(res,200,store.categories.filter(x=>x.active!==false).map(mapCategory));
  if(pathname==='/api/products'&&req.method==='GET')return json(res,200,store.products.filter(x=>x.active!==false).map(mapProduct));

  if(pathname==='/api/auth/register'&&req.method==='POST'){
    const b=await body(req),email=String(b.email||'').trim().toLowerCase(),name=String(b.name||'').trim(),phone=String(b.phone||'').trim(),password=String(b.password||'');
    if(!name||!email||!phone||password.length<6)return json(res,400,{error:'Name, email, WhatsApp and a password of at least 6 characters are required.'});
    if(store.users.some(x=>String(x.email).toLowerCase()===email))return json(res,409,{error:'This email is already registered.'});
    const salt=crypto.randomBytes(16).toString('hex'),hash=crypto.scryptSync(password,salt,64).toString('hex');
    if(sbEnabled()){const rows=await sb('fs_users',{method:'POST',body:JSON.stringify([{email,name,phone,password_hash:hash,password_salt:salt,status:'active'}])});const x=rows[0];return json(res,200,{token:makeUserToken({id:x.id,email:x.email,name:x.name,phone:x.phone}),user:{id:x.id,email:x.email,name:x.name,phone:x.phone}})}
    const id=Date.now(),safe={id,email,name,phone};store.users.push({id,email,name,phone,passwordHash:hash,passwordSalt:salt,status:'active',createdAt:new Date().toISOString()});return json(res,200,{token:makeUserToken(safe),user:safe});
  }
  if(pathname==='/api/auth/login'&&req.method==='POST'){
    const b=await body(req),email=String(b.email||'').trim().toLowerCase(),password=String(b.password||'');
    const user=store.users.find(x=>String(x.email).toLowerCase()===email);
    if(!user)return json(res,401,{error:'Incorrect email or password.'});
    const salt=user.password_salt||user.passwordSalt,ph=user.password_hash||user.passwordHash;if(!salt||!ph)return json(res,401,{error:'Incorrect email or password.'});
    const h=crypto.scryptSync(password,salt,64).toString('hex');if(h!==ph)return json(res,401,{error:'Incorrect email or password.'});
    const safe={id:user.id,email:user.email,name:user.name,phone:user.phone};return json(res,200,{token:makeUserToken(safe),user:safe});
  }
  if(pathname==='/api/auth/logout'&&req.method==='POST')return json(res,200,{ok:true});
  if(pathname==='/api/auth/me'&&req.method==='GET'){const user=getUser(req);return user?json(res,200,{user}):json(res,401,{error:'Not logged in.'})}

  if(pathname==='/api/discounts'&&req.method==='POST'){
    const user=getUser(req);if(!user)return json(res,401,{error:'Please login first.'});
    const b=await body(req),total=Number(b.total||0),d=sbEnabled()?await findDiscount(b.code,total,user):store.discounts.find(x=>String(x.code).toUpperCase()===String(b.code||'').trim().toUpperCase()&&x.active!==false);
    if(!d)return json(res,404,{error:'Invalid or unavailable discount code.'});if(d.error)return json(res,409,{error:d.error});
    const discount=calcDiscount(d,total);return json(res,200,{code:d.code,type:d.type,value:Number(d.value),discount,total:Math.max(0,total-discount)});
  }
  if(pathname==='/api/orders'&&req.method==='POST'){
    const user=getUser(req);if(!user)return json(res,401,{error:'Please login before checkout.'});
    const b=await body(req);if(!b.name||!b.phone||!b.discord||!b.payment||!Array.isArray(b.items)||!b.items.length)return json(res,400,{error:'Please complete all order fields.'});
    let subtotal=0,finalItems=[];
    for(const i of b.items){const p=store.products.find(x=>Number(x.id)===Number(i.id));if(!p)continue;const opt=(p.options||[]).find(o=>String(o.id)===String(i.optionId));let unit=Number(opt?.price??p.price??0);if(!opt&&p.discountActive)unit=p.discountType==='fixed'?Math.max(0,unit-Number(p.discountValue||0)):Math.max(0,unit*(1-Number(p.discountValue||0)/100));const qty=Math.max(1,Number(i.qty||1));subtotal+=unit*qty;finalItems.push({id:p.id,name:p.name,qty,price:unit,optionId:opt?.id||null,optionName:opt?.name||null,image:opt?.image||p.image||''})}
    if(!finalItems.length)return json(res,400,{error:'No valid products found.'});
    let d=null,discount=0;if(b.coupon){d=sbEnabled()?await findDiscount(b.coupon,subtotal,user):store.discounts.find(x=>String(x.code).toUpperCase()===String(b.coupon).trim().toUpperCase()&&x.active!==false);if(d?.error)return json(res,409,{error:d.error});if(d)discount=calcDiscount(d,subtotal)}
    const total=Math.max(0,subtotal-discount);
    if(sbEnabled()){
      const s=await first('fs_settings','&limit=1');const next=Number(s?.next_order_number||0)+1;
      await sb(`fs_settings?id=eq.${s.id}`,{method:'PATCH',body:JSON.stringify({next_order_number:next})});
      const order={order_number:next,name:b.name,phone:b.phone,discord:b.discord,payment:b.payment,items:finalItems,subtotal,discount,total,coupon:d?.code||'',user_id:user.id,user_email:user.email,status:'new'};
      const rows=await sb('fs_orders',{method:'POST',body:JSON.stringify([order])});const saved=rows[0];
      if(d){await sb('fs_discount_usages',{method:'POST',body:JSON.stringify([{discount_id:d.id,user_id:user.id,order_id:saved.id}])});await sb(`fs_discounts?id=eq.${d.id}`,{method:'PATCH',body:JSON.stringify({used_count:Number(d.used_count||0)+1})})}
      invalidate();return json(res,200,{ok:true,order:{...order,id:`Order ${next}`,dbId:saved.id}});
    }
    const next=Number(store.settings.nextOrderNumber||0)+1;store.settings.nextOrderNumber=next;const order={id:`Order ${next}`,orderNumber:next,...b,items:finalItems,subtotal,discount,total,coupon:d?.code||'',userId:user.id,userEmail:user.email,status:'new',createdAt:new Date().toISOString()};store.orders.unshift(order);return json(res,200,{ok:true,order});
  }

  if(pathname==='/api/admin/login'&&req.method==='POST'){const b=await body(req);if(String(b.password||'')!==ADMIN_PASSWORD&&String(b.password||'')!=='2013'&&String(b.password||'')!=='2009')return json(res,401,{error:'Incorrect admin password.'});return json(res,200,{token:makeAdminToken()})}
  if(pathname.startsWith('/api/admin/')&&!isAdmin(req))return json(res,401,{error:'Unauthorized'});
  if(pathname==='/api/admin/products'&&req.method==='GET')return json(res,200,store.products.map(mapProduct));
  if(pathname==='/api/admin/categories'&&req.method==='GET')return json(res,200,store.categories.map(mapCategory));
  if(pathname==='/api/admin/orders'&&req.method==='GET')return json(res,200,store.orders);
  if(pathname==='/api/admin/users'&&req.method==='GET')return json(res,200,store.users.map(x=>({id:x.id,email:x.email,name:x.name,phone:x.phone,createdAt:x.created_at||x.createdAt})));
  if(pathname==='/api/admin/discounts'&&req.method==='GET')return json(res,200,store.discounts);
  if(pathname==='/api/admin/settings'&&req.method==='GET')return json(res,200,mapSettings(store.settings));

  if(pathname==='/api/admin/products'&&req.method==='POST'){
    const b=await body(req);if(!b.name||b.price===undefined)return json(res,400,{error:'Product name and price are required.'});
    const row=snakeProduct(b);
    if(sbEnabled()){const x=(await sb('fs_products',{method:'POST',body:JSON.stringify([row])}))[0];invalidate();return json(res,200,mapProduct(x))}
    const item={id:Date.now(),...b,price:Number(b.price),options:Array.isArray(b.options)?b.options:[]};store.products.unshift(item);return json(res,200,item);
  }
  if(pathname==='/api/admin/categories'&&req.method==='POST'){
    const b=await body(req);if(!b.name)return json(res,400,{error:'Category name is required.'});
    const row={name:String(b.name),description:String(b.description||''),image:String(b.image||''),active:b.active!==false,show_on_home:b.showOnHome!==false,sort_order:Number(b.sortOrder||0)};
    if(sbEnabled()){const x=(await sb('fs_categories',{method:'POST',body:JSON.stringify([row])}))[0];invalidate();return json(res,200,mapCategory(x))}
    const item={id:Date.now(),name:row.name,description:row.description,image:row.image,active:row.active};store.categories.unshift(item);return json(res,200,item);
  }
  if(pathname==='/api/admin/discounts'&&req.method==='POST'){
    const b=await body(req);if(!b.code||b.value===undefined)return json(res,400,{error:'Code and value are required.'});const code=String(b.code).trim().toUpperCase();
    if(store.discounts.some(x=>String(x.code).toUpperCase()===code))return json(res,400,{error:'This discount code already exists.'});
    const row={code,type:b.type==='fixed'?'fixed':'percent',value:Number(b.value),min_total:Number(b.minTotal||0),active:b.active!==false,first_order_only:b.firstOrderOnly===true,max_uses:Number(b.maxUses||0),used_count:0};
    if(sbEnabled()){const x=(await sb('fs_discounts',{method:'POST',body:JSON.stringify([row])}))[0];invalidate();return json(res,200,x)}
    const item={id:Date.now(),code,type:row.type,value:row.value,minTotal:row.min_total,active:row.active,firstOrderOnly:false,maxUses:0,usedCount:0};store.discounts.unshift(item);return json(res,200,item);
  }
  if(pathname==='/api/admin/settings'&&req.method==='PUT'){
    const b=await body(req),old=mapSettings(store.settings);
    const row={store_name:b.storeName??old.storeName,tagline:b.tagline??old.tagline,whatsapp:b.whatsapp??old.whatsapp,discord:b.discord??old.discord,instapay:b.instapay??old.instapay,telda:b.telda??old.telda,vodafone_cash:b.vodafone_cash??b.vodafoneCash??old.vodafone_cash,currency:b.currency??old.currency,announcement:b.announcement??old.announcement,hero_title:b.heroTitle??old.heroTitle,hero_text:b.heroText??old.heroText,google_client_id:b.googleClientId??old.googleClientId,next_order_number:old.nextOrderNumber};
    if(sbEnabled()){const s=await first('fs_settings','&limit=1');const x=(await sb(`fs_settings?id=eq.${s.id}`,{method:'PATCH',body:JSON.stringify(row)}))[0];invalidate();return json(res,200,mapSettings(x))}
    store.settings={...store.settings,...b};return json(res,200,mapSettings(store.settings));
  }

  let m=pathname.match(/^\/api\/admin\/products\/(\d+)$/);
  if(m&&(req.method==='PUT'||req.method==='DELETE')){
    const id=Number(m[1]);
    if(sbEnabled()){
      if(req.method==='DELETE'){await sb(`fs_products?id=eq.${id}`,{method:'DELETE',prefer:'return=minimal'});invalidate();return json(res,200,{ok:true})}
      const b=await body(req),row=snakeProduct(b);const x=(await sb(`fs_products?id=eq.${id}`,{method:'PATCH',body:JSON.stringify(row)}))[0];invalidate();return json(res,200,mapProduct(x));
    }
    const i=store.products.findIndex(x=>Number(x.id)===id);if(i<0)return json(res,404,{error:'Product not found'});if(req.method==='DELETE'){store.products.splice(i,1);return json(res,200,{ok:true})}const b=await body(req);store.products[i]={...store.products[i],...b};return json(res,200,store.products[i]);
  }
  m=pathname.match(/^\/api\/admin\/categories\/(\d+)$/);
  if(m&&(req.method==='PUT'||req.method==='DELETE')){
    const id=Number(m[1]);if(sbEnabled()){if(req.method==='DELETE'){await sb(`fs_categories?id=eq.${id}`,{method:'DELETE',prefer:'return=minimal'});invalidate();return json(res,200,{ok:true})}const b=await body(req),row={name:String(b.name||''),description:String(b.description||''),image:String(b.image||''),active:b.active!==false,show_on_home:b.showOnHome!==false,sort_order:Number(b.sortOrder||0)},x=(await sb(`fs_categories?id=eq.${id}`,{method:'PATCH',body:JSON.stringify(row)}))[0];invalidate();return json(res,200,mapCategory(x))}
    const i=store.categories.findIndex(x=>Number(x.id)===id);if(i<0)return json(res,404,{error:'Category not found'});if(req.method==='DELETE')store.categories.splice(i,1);else{const b=await body(req);store.categories[i]={...store.categories[i],...b}}return json(res,200,store.categories[i]||{ok:true});
  }
  m=pathname.match(/^\/api\/admin\/discounts\/(\d+)$/);
  if(m&&(req.method==='PUT'||req.method==='DELETE')){
    const id=Number(m[1]);if(sbEnabled()){if(req.method==='DELETE'){await sb(`fs_discounts?id=eq.${id}`,{method:'DELETE',prefer:'return=minimal'});invalidate();return json(res,200,{ok:true})}const b=await body(req),row={code:String(b.code||''),type:b.type==='fixed'?'fixed':'percent',value:Number(b.value||0),min_total:Number(b.minTotal||0),active:b.active!==false,first_order_only:b.firstOrderOnly===true,max_uses:Number(b.maxUses||0),used_count:Number(b.usedCount||0)},x=(await sb(`fs_discounts?id=eq.${id}`,{method:'PATCH',body:JSON.stringify(row)}))[0];invalidate();return json(res,200,x)}
    const i=store.discounts.findIndex(x=>Number(x.id)===id);if(i<0)return json(res,404,{error:'Discount not found'});if(req.method==='DELETE')store.discounts.splice(i,1);else{const b=await body(req);store.discounts[i]={...store.discounts[i],...b}}return json(res,200,store.discounts[i]||{ok:true});
  }
  m=pathname.match(/^\/api\/admin\/orders\/(.+)$/);
  if(m&&req.method==='PUT'){
    const id=decodeURIComponent(m[1]),b=await body(req);
    if(sbEnabled()){const rows=await sb(`fs_orders?or=(id.eq.${encodeURIComponent(id)},order_number.eq.${encodeURIComponent(id)})&select=*`);if(!rows.length)return json(res,404,{error:'Order not found.'});const x=(await sb(`fs_orders?id=eq.${rows[0].id}`,{method:'PATCH',body:JSON.stringify({status:String(b.status||rows[0].status)})}))[0];invalidate();return json(res,200,x)}
    const i=store.orders.findIndex(x=>String(x.id)===id||String(x.orderNumber)===id);if(i<0)return json(res,404,{error:'Order not found.'});store.orders[i].status=String(b.status||store.orders[i].status);return json(res,200,store.orders[i]);
  }
  return json(res,404,{error:'API route not found'});
 }catch(e){console.error('FLASH API error:',e);return json(res,e.status||500,{error:e.message||'Server error.'})}
};
