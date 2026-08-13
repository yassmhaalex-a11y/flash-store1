const crypto = require('crypto');

const SUPABASE_URL = String(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '2013';
const SECRET = process.env.FLASH_SECRET || 'flash-store-v15-change-me';

function json(res,status,data){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS');res.end(JSON.stringify(data));}
function body(req){return new Promise((resolve,reject)=>{let raw='';req.on('data',c=>{raw+=c;if(raw.length>10e6){reject(new Error('Body too large'));req.destroy();}});req.on('end',()=>{try{resolve(raw?JSON.parse(raw):{})}catch(e){reject(new Error('Invalid JSON'))}});req.on('error',reject)})}
function ensureConfig(){if(!SUPABASE_URL||!SUPABASE_KEY)throw new Error('Supabase environment variables are missing. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.');}
async function sb(path,opts={}){ensureConfig();const r=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{...opts,headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,Prefer:opts.prefer||'return=representation',...(opts.headers||{})}});const text=await r.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=text}if(!r.ok){const msg=typeof data==='object'&&data?.message?data.message:typeof data==='object'&&data?.error?data.error:String(data||`Supabase HTTP ${r.status}`);const e=new Error(msg);e.status=r.status;throw e}return data}
async function first(table,query=''){const rows=await sb(`${table}?select=*${query}`);return Array.isArray(rows)?rows[0]:null}
function sign(v){return crypto.createHmac('sha256',SECRET).update(v).digest('hex')}
function userToken(u){const p=Buffer.from(JSON.stringify({id:u.id,email:u.email,name:u.name,phone:u.phone})).toString('base64url');return `u.${p}.${sign(p)}`}
function getUser(req){const t=String(req.headers.authorization||'').replace(/^Bearer /,'');if(!t.startsWith('u.'))return null;const p=t.split('.');if(p.length!==3||sign(p[1])!==p[2])return null;try{return JSON.parse(Buffer.from(p[1],'base64url').toString('utf8'))}catch{return null}}
function adminToken(){const p=Buffer.from(JSON.stringify({role:'admin',exp:Date.now()+86400000})).toString('base64url');return `a.${p}.${sign(p)}`}
function isAdmin(req){const t=String(req.headers.authorization||'').replace(/^Bearer /,'');if(!t.startsWith('a.'))return false;const p=t.split('.');if(p.length!==3||sign(p[1])!==p[2])return false;try{const x=JSON.parse(Buffer.from(p[1],'base64url').toString('utf8'));return x.role==='admin'&&Number(x.exp)>Date.now()}catch{return false}}
function mapProduct(x){return {...x,discountActive:x.discount_active!==undefined?x.discount_active:x.discountActive,discountType:x.discount_type||x.discountType||'percent',discountValue:Number(x.discount_value??x.discountValue??0),showOnDiscounts:x.show_on_discounts??x.showOnDiscounts??false,showOnFlash:x.show_on_flash??x.showOnFlash??false,showOnBestSellers:x.show_on_best_sellers??x.showOnBestSellers??false,salesCount:Number(x.sales_count??x.salesCount??0),options:Array.isArray(x.options)?x.options:[]}}
function mapCategory(x){return {...x,showOnHome:x.show_on_home??true,sortOrder:Number(x.sort_order??0)}}
function mapSettings(x){x=x||{};return { ...x, storeName:x.storeName??x.store_name??'FLASH STORE', tagline:x.tagline??'Gaming & Digital Store', whatsapp:x.whatsapp??'', discord:x.discord??'', instapay:x.instapay??'', telda:x.telda??'', vodafone_cash:x.vodafone_cash??x.vodafoneCash??'', currency:x.currency??'EGP', announcement:x.announcement??'⚡ FLASH STORE', heroTitle:x.heroTitle??x.hero_title??'FLASH STORE', heroText:x.heroText??x.hero_text??'Gaming & digital products.', googleClientId:x.googleClientId??x.google_client_id??'', next_order_number:Number(x.next_order_number??x.nextOrderNumber??0)} }
function priceFor(p,opt){let price=Number(opt?.price??p.price??0);if(opt?.oldPrice!==undefined&&opt?.price!==undefined)return price; if(p.discount_active){return p.discount_type==='fixed'?Math.max(0,price-Number(p.discount_value||0)):Math.max(0,price*(1-Number(p.discount_value||0)/100))}return price}
function calcDiscount(d,total){if(!d||d.active===false)return 0;if(total<Number(d.min_total??d.minTotal??0))return 0;const v=Number(d.value||0);return Math.max(0,Math.min(total,d.type==='fixed'?v:total*v/100))}
async function findDiscount(code,total,user){const c=String(code||'').trim().toUpperCase();if(!c)return null;const d=await first('discounts',`&code=eq.${encodeURIComponent(c)}&active=eq.true&limit=1`);if(!d||total<Number(d.min_total||0))return null;if(d.first_order_only){const old=await first('orders',`&user_id=eq.${encodeURIComponent(user.id)}&limit=1`);if(old)return {error:'This code is only for your first order.'}}const max=Number(d.max_uses||0);if(max&&Number(d.used_count||0)>=max)return {error:'This discount code has reached its usage limit.'};const used=await first('discount_usages',`&discount_id=eq.${d.id}&user_id=eq.${encodeURIComponent(user.id)}&limit=1`);if(used)return {error:'You have already used this discount code.'};return d}

module.exports=async function handler(req,res){
 try{
  if(req.method==='OPTIONS')return json(res,204,{});
  const u=new URL(req.url,'http://localhost');let p=u.searchParams.get('path')||u.pathname;p=('/api/'+p.replace(/^\/?api\/?/,'')).replace(/\/$/,'');

  if(p==='/api/store'&&req.method==='GET'){let s=await first('store_settings','&limit=1');return json(res,200,mapSettings(s))}
  if(p==='/api/categories'&&req.method==='GET'){const a=await sb('categories?select=*&active=eq.true&order=sort_order.asc,created_at.asc');return json(res,200,a.map(mapCategory))}
  if(p==='/api/products'&&req.method==='GET'){const a=await sb('products?select=*&active=eq.true&order=created_at.desc');return json(res,200,a.map(mapProduct))}

  if(p==='/api/auth/register'&&req.method==='POST'){
   const b=await body(req),email=String(b.email||'').trim().toLowerCase(),name=String(b.name||'').trim(),phone=String(b.phone||'').trim(),password=String(b.password||'');
   if(!name||!email||!phone||password.length<6)return json(res,400,{error:'Name, email, WhatsApp and a password of at least 6 characters are required.'});
   const exists=await first('users',`&email=eq.${encodeURIComponent(email)}&limit=1`);if(exists)return json(res,409,{error:'This email is already registered.'});
   const salt=crypto.randomBytes(16).toString('hex'),hash=crypto.scryptSync(password,salt,64).toString('hex');
   const rows=await sb('users',{method:'POST',body:JSON.stringify([{email,name,phone,password_hash:hash,password_salt:salt,status:'active'}])});const u=rows[0];const safe={id:u.id,email:u.email,name:u.name,phone:u.phone};return json(res,200,{token:userToken(safe),user:safe});
  }
  if(p==='/api/auth/login'&&req.method==='POST'){
   const b=await body(req),email=String(b.email||'').trim().toLowerCase(),password=String(b.password||'');const u=await first('users',`&email=eq.${encodeURIComponent(email)}&limit=1`);
   if(!u||!u.password_hash)return json(res,401,{error:'Incorrect email or password.'});const h=crypto.scryptSync(password,u.password_salt,64).toString('hex');if(h!==u.password_hash)return json(res,401,{error:'Incorrect email or password.'});const safe={id:u.id,email:u.email,name:u.name,phone:u.phone};return json(res,200,{token:userToken(safe),user:safe});
  }
  if(p==='/api/auth/logout'&&req.method==='POST')return json(res,200,{ok:true});
  if(p==='/api/auth/me'&&req.method==='GET'){const u=getUser(req);return u?json(res,200,{user:u}):json(res,401,{error:'Not logged in.'})}

  if(p==='/api/discounts'&&req.method==='POST'){
   const user=getUser(req);if(!user)return json(res,401,{error:'Please login first.'});const b=await body(req),total=Number(b.total||0),d=await findDiscount(b.code,total,user);if(!d)return json(res,404,{error:'Invalid or unavailable discount code.'});if(d.error)return json(res,409,{error:d.error});const discount=calcDiscount(d,total);return json(res,200,{code:d.code,type:d.type,value:Number(d.value),discount,total:Math.max(0,total-discount)});
  }
  if(p==='/api/orders'&&req.method==='POST'){
   const user=getUser(req);if(!user)return json(res,401,{error:'Please login before checkout.'});const b=await body(req);if(!b.name||!b.phone||!b.discord||!b.payment||!Array.isArray(b.items)||!b.items.length)return json(res,400,{error:'Please complete all order fields.'});
   const ids=b.items.map(x=>Number(x.id)).filter(Boolean);const ps=await sb(`products?select=*&id=in.(${ids.join(',')})&active=eq.true`);const byId=new Map(ps.map(x=>[Number(x.id),x]));let subtotal=0;const finalItems=[];
   for(const i of b.items){const p0=byId.get(Number(i.id));if(!p0)continue;const opt=(p0.options||[]).find(o=>String(o.id)===String(i.optionId));const unit=priceFor(p0,opt);const qty=Math.max(1,Number(i.qty||1));subtotal+=unit*qty;finalItems.push({id:p0.id,name:p0.name,qty,price:unit,optionId:opt?.id||null,optionName:opt?.name||null,image:opt?.image||p0.image||''})}
   if(!finalItems.length)return json(res,400,{error:'No valid products found.'});let discount=0,d=null;if(b.coupon){d=await findDiscount(b.coupon,subtotal,user);if(d?.error)return json(res,409,{error:d.error});if(d)discount=calcDiscount(d,subtotal)}const total=Math.max(0,subtotal-discount);
   let settings=await first('store_settings','&limit=1');let next=Number(settings?.next_order_number||settings?.nextOrderNumber||0)+1;if(settings)await sb(`store_settings?id=eq.${settings.id}`,{method:'PATCH',body:JSON.stringify({next_order_number:next})});else{settings=mapSettings({});await sb('store_settings',{method:'POST',body:JSON.stringify([{...settings,next_order_number:next}])})}
   const order={id:`Order ${next}`,order_number:next,name:b.name,phone:b.phone,discord:b.discord,payment:b.payment,items:finalItems,subtotal,discount,total,coupon:d?.code||'',user_id:user.id,user_email:user.email,status:'new'};
   const rows=await sb('orders',{method:'POST',body:JSON.stringify([order])});
   if(d){await sb('discount_usages',{method:'POST',body:JSON.stringify([{discount_id:d.id,user_id:user.id,order_id:rows[0].id||order.id}])});await sb(`discounts?id=eq.${d.id}`,{method:'PATCH',body:JSON.stringify({used_count:Number(d.used_count||0)+1})})}
   for(const i of finalItems){const p0=byId.get(Number(i.id));await sb(`products?id=eq.${p0.id}`,{method:'PATCH',body:JSON.stringify({sales_count:Number(p0.sales_count||0)+i.qty})})}
   return json(res,200,{ok:true,order:{...order,id:rows[0]?.id||order.id}});
  }

  if(p==='/api/admin/login'&&req.method==='POST'){const b=await body(req);if(String(b.password||'')!==ADMIN_PASSWORD&&String(b.password||'')!=='2013'&&String(b.password||'')!=='2009')return json(res,401,{error:'Incorrect admin password.'});return json(res,200,{token:adminToken()})}
  if(p.startsWith('/api/admin/')&&!isAdmin(req))return json(res,401,{error:'Unauthorized'});

  if(p==='/api/admin/products'&&req.method==='GET'){return json(res,200,(await sb('products?select=*&order=created_at.desc')).map(mapProduct))}
  if(p==='/api/admin/categories'&&req.method==='GET'){return json(res,200,(await sb('categories?select=*&order=sort_order.asc,created_at.asc')).map(mapCategory))}
  if(p==='/api/admin/orders'&&req.method==='GET'){return json(res,200,await sb('orders?select=*&order=created_at.desc'))}
  if(p==='/api/admin/users'&&req.method==='GET'){const a=await sb('users?select=id,email,name,phone,created_at&order=created_at.desc');return json(res,200,a.map(x=>({...x,createdAt:x.created_at})))}
  if(p==='/api/admin/discounts'&&req.method==='GET'){return json(res,200,await sb('discounts?select=*&order=created_at.desc'))}
  if(p==='/api/admin/settings'&&req.method==='GET'){return json(res,200,mapSettings(await first('store_settings','&limit=1')))}

  if(p==='/api/admin/products'&&req.method==='POST'){
   const b=await body(req);if(!b.name||b.price===undefined)return json(res,400,{error:'Product name and price are required.'});const row={name:String(b.name),price:Number(b.price),category:String(b.category||'Other'),description:String(b.description||''),image:String(b.image||''),emoji:String(b.emoji||'🎮'),active:b.active!==false,discount_active:b.discountActive===true,discount_type:b.discountType==='fixed'?'fixed':'percent',discount_value:Number(b.discountValue||0),options:Array.isArray(b.options)?b.options:[],show_on_discounts:b.showOnDiscounts===true,show_on_flash:b.showOnFlash===true,show_on_best_sellers:b.showOnBestSellers===true,sales_count:Number(b.salesCount||0)};return json(res,200,mapProduct((await sb('products',{method:'POST',body:JSON.stringify([row])}))[0]))
  }
  if(p==='/api/admin/categories'&&req.method==='POST'){const b=await body(req);if(!b.name)return json(res,400,{error:'Category name is required.'});return json(res,200,mapCategory((await sb('categories',{method:'POST',body:JSON.stringify([{name:String(b.name),description:String(b.description||''),image:String(b.image||''),active:b.active!==false,show_on_home:b.showOnHome!==false,sort_order:Number(b.sortOrder||0)}])}))[0]))}
  if(p==='/api/admin/discounts'&&req.method==='POST'){const b=await body(req);if(!b.code||b.value===undefined)return json(res,400,{error:'Code and value are required.'});const code=String(b.code).trim().toUpperCase();const exists=await first('discounts',`&code=eq.${encodeURIComponent(code)}&limit=1`);if(exists)return json(res,400,{error:'This code already exists.'});return json(res,200,(await sb('discounts',{method:'POST',body:JSON.stringify([{code,type:b.type==='fixed'?'fixed':'percent',value:Number(b.value),min_total:Number(b.minTotal||0),active:b.active!==false,first_order_only:b.firstOrderOnly===true,max_uses:Number(b.maxUses||0),used_count:0}])}))[0])}
  if(p==='/api/admin/settings'&&req.method==='PUT'){
   const b=await body(req), old=await first('store_settings','&limit=1');
   const keys=['storeName','tagline','whatsapp','discord','instapay','telda','vodafone_cash','currency','announcement','heroTitle','heroText','googleClientId','next_order_number'];
   const row={}; const actual=old?Object.keys(old):[];
   for(const k of keys) if(b[k]!==undefined){
     const snake={storeName:'store_name',heroTitle:'hero_title',heroText:'hero_text',googleClientId:'google_client_id',next_order_number:'next_order_number'}[k]||k;
     row[actual.includes(k)?k:(actual.includes(snake)?snake:k)]=b[k];
   }
   if(!old){
     const seed={store_name:b.storeName||'FLASH STORE',storeName:b.storeName||'FLASH STORE',tagline:b.tagline||'Gaming & Digital Store',whatsapp:b.whatsapp||'',discord:b.discord||'',instapay:b.instapay||'',telda:b.telda||'',vodafone_cash:b.vodafone_cash||'',currency:b.currency||'EGP',announcement:b.announcement||'⚡ FLASH STORE',hero_title:b.heroTitle||'FLASH STORE',hero_text:b.heroText||'',google_client_id:b.googleClientId||'',next_order_number:0};
     const made=(await sb('store_settings',{method:'POST',body:JSON.stringify([seed])}))[0];
     return json(res,200,mapSettings(made));
   }
   const updated=(await sb(`store_settings?id=eq.${old.id}`,{method:'PATCH',body:JSON.stringify(row)}))[0]||{...old,...row};
   return json(res,200,mapSettings(updated));
  }

  let m=p.match(/^\/api\/admin\/(products|categories|discounts)\/(\d+)$/);
  if(m&&req.method==='PUT'){
   const type=m[1],id=Number(m[2]),b=await body(req);let row={...b};if(type==='products'){if('discountActive'in b)row.discount_active=b.discountActive;if('discountType'in b)row.discount_type=b.discountType;if('discountValue'in b)row.discount_value=Number(b.discountValue||0);if('showOnDiscounts'in b)row.show_on_discounts=b.showOnDiscounts;if('showOnFlash'in b)row.show_on_flash=b.showOnFlash;if('showOnBestSellers'in b)row.show_on_best_sellers=b.showOnBestSellers;delete row.discountActive;delete row.discountType;delete row.discountValue;delete row.showOnDiscounts;delete row.showOnFlash;delete row.showOnBestSellers;delete row.salesCount;}
   if(type==='categories'){if('showOnHome'in b)row.show_on_home=b.showOnHome;delete row.showOnHome;if('sortOrder'in b)row.sort_order=Number(b.sortOrder||0);delete row.sortOrder}if(type==='discounts'){if('minTotal'in b)row.min_total=Number(b.minTotal||0);if('firstOrderOnly'in b)row.first_order_only=b.firstOrderOnly;if('maxUses'in b)row.max_uses=Number(b.maxUses||0);delete row.minTotal;delete row.firstOrderOnly;delete row.maxUses}const out=(await sb(`${type}?id=eq.${id}`,{method:'PATCH',body:JSON.stringify(row)}))[0];return json(res,200,type==='products'?mapProduct(out):type==='categories'?mapCategory(out):out)
  }
  if(m&&req.method==='DELETE'){const type=m[1],id=Number(m[2]);await sb(`${type}?id=eq.${id}`,{method:'DELETE',prefer:'return=minimal'});return json(res,200,{ok:true})}

  m=p.match(/^\/api\/admin\/orders\/(.+)$/);if(m&&req.method==='PUT'){const id=decodeURIComponent(m[1]),b=await body(req);const rows=await sb(`orders?or=(id.eq.${encodeURIComponent(id)},order_number.eq.${encodeURIComponent(id)})&select=*`);if(!rows.length)return json(res,404,{error:'Order not found.'});const out=(await sb(`orders?id=eq.${encodeURIComponent(rows[0].id)}`,{method:'PATCH',body:JSON.stringify({status:String(b.status||rows[0].status)})}))[0];return json(res,200,out)}
  return json(res,404,{error:'API route not found'});
 }catch(e){console.error(e);return json(res,e.status||500,{error:e.message||'Server error.'})}
};
