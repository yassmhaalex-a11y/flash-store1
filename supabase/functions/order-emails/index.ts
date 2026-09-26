const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const WEBHOOK_SECRET = Deno.env.get('ORDER_EMAIL_WEBHOOK_SECRET') || '';

const jsonHeaders = { 'Content-Type': 'application/json' };

function esc(v: unknown) {
  return String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]!));
}
function money(v: unknown) { return `${Number(v || 0).toLocaleString('en-US')} EGP`; }
function supa(path: string, init: RequestInit = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_ROLE,
      Authorization: `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
}
async function getJson(path: string) {
  const r = await supa(path);
  if (!r.ok) throw new Error(await r.text());
  return await r.json();
}
async function sendEmail(to: string, subject: string, html: string, text: string) {
  if (!to || !RESEND_API_KEY) return;
  const from = Deno.env.get('EMAIL_FROM') || 'FLASH STORE <onboarding@resend.dev>';
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html, text }),
  });
  if (!r.ok) throw new Error(await r.text());
}

function layout(content: string) {
  return `<!doctype html><html><body style="margin:0;background:#0b0d12;font-family:Arial,sans-serif;color:#f5f7fb;padding:24px"><div style="max-width:680px;margin:auto;background:#12151c;border:1px solid #2a2f3a;border-radius:18px;overflow:hidden"><div style="padding:24px;background:#171b24;border-bottom:1px solid #2a2f3a"><div style="font-size:27px;font-weight:900;color:#fff">FLASH <span style="color:#ffb000">STORE</span></div><div style="color:#9ca3af;margin-top:5px">Gaming Digital Store</div></div>${content}<div style="padding:20px 24px;color:#8f98a8;font-size:13px;border-top:1px solid #2a2f3a">Thank you for choosing FLASH STORE.</div></div></body></html>`;
}

async function orderData(orderId: string) {
  const orders = await getJson(`orders?id=eq.${encodeURIComponent(orderId)}&select=*`);
  const order = orders[0];
  if (!order) throw new Error('Order not found');
  const items = await getJson(`order_items?order_id=eq.${encodeURIComponent(orderId)}&select=*`);
  const productIds = [...new Set((items || []).map((x:any)=>x.product_id).filter(Boolean))];
  const optionIds = [...new Set((items || []).map((x:any)=>x.option_id).filter(Boolean))];
  const products = productIds.length ? await getJson(`products?id=in.(${productIds.join(',')})&select=id,name,image_url,images`) : [];
  const options = optionIds.length ? await getJson(`product_options?id=in.(${optionIds.join(',')})&select=id,image_url,name`) : [];
  const productMap = Object.fromEntries(products.map((p:any)=>[p.id,p]));
  const optionMap = Object.fromEntries(options.map((p:any)=>[p.id,p]));
  return { order, items: (items || []).map((i:any)=>({ ...i, product: productMap[i.product_id], option: optionMap[i.option_id] })) };
}

function itemImage(i:any) { return i.option?.image_url || i.product?.image_url || (Array.isArray(i.product?.images) ? i.product.images[0] : '') || ''; }
function itemsHtml(items:any[]) {
  return items.map(i => `<div style="display:flex;gap:14px;padding:14px;background:#0f1218;border:1px solid #252a35;border-radius:13px;margin:10px 0"><div style="width:82px;height:82px;border-radius:10px;overflow:hidden;background:#080a0e;flex:none">${itemImage(i) ? `<img src="${esc(itemImage(i))}" style="width:100%;height:100%;object-fit:cover" alt="">` : ''}</div><div style="flex:1"><div style="font-weight:800;font-size:16px">${esc(i.product_name)}</div>${i.option_name ? `<div style="color:#9ca3af;margin-top:4px">${esc(i.option_name)}</div>` : ''}<div style="color:#9ca3af;margin-top:7px">Qty: ${Number(i.quantity||1)}</div></div><div style="font-weight:800;white-space:nowrap">${money(Number(i.unit_price||0)*Number(i.quantity||1))}</div></div>`).join('');
}
function statusLabel(status:string) { return ({pending:'Order Received',paid:'Payment Received',processing:'Order Processing',completed:'Order Completed',cancelled:'Order Cancelled'} as any)[status] || status; }

async function sendNewOrder(orderId:string) {
  const {order,items}=await orderData(orderId);
  const settings=await getJson('store_settings?id=eq.1&select=admin_email,store_name');
  const admin=settings[0]?.admin_email || '';
  const products=itemsHtml(items);
  const common=`<div style="padding:24px"><div style="display:inline-block;padding:8px 12px;background:#ffb000;color:#111;border-radius:999px;font-weight:800">ORDER RECEIVED</div><h1 style="margin:16px 0 8px">Order #${esc(order.order_number)}</h1><p style="color:#c7cbd4">Hello ${esc(order.full_name)}, your order has been received successfully.</p><div style="margin:18px 0;padding:16px;background:#0f1218;border:1px solid #252a35;border-radius:12px"><b>Total:</b> ${money(order.total)}<br><span style="display:block;margin-top:7px"><b>Payment:</b> ${esc(order.payment_method)}</span><span style="display:block;margin-top:7px"><b>Date:</b> ${esc(new Date(order.created_at).toLocaleString('en-GB'))}</span></div>${products}<div style="margin-top:18px;font-size:20px;font-weight:900">Total: ${money(order.total)}</div></div>`;
  const customerHtml=layout(common);
  const customerText=`FLASH STORE\nOrder #${order.order_number}\nOrder received\nTotal: ${money(order.total)}`;
  if(order.email) await sendEmail(order.email, `FLASH STORE — Order #${order.order_number} received`, customerHtml, customerText);

  if(admin){
    const adminContent=`<div style="padding:24px"><div style="display:inline-block;padding:8px 12px;background:#ff3b30;color:#fff;border-radius:999px;font-weight:800">NEW ORDER</div><h1 style="margin:16px 0 8px">Order #${esc(order.order_number)}</h1><p><b>Customer:</b> ${esc(order.full_name)}</p><p><b>Email:</b> ${esc(order.email)}</p><p><b>Phone:</b> ${esc(order.phone)}</p><p><b>Payment:</b> ${esc(order.payment_method)}</p><p><b>Payment details:</b> ${esc(order.payment_details)}</p><p><b>Total:</b> ${money(order.total)}</p>${order.proof_url?`<p><a href="${esc(order.proof_url)}" style="color:#ffb000">Open Payment Proof</a></p>`:''}<hr style="border:0;border-top:1px solid #2a2f3a;margin:22px 0">${products}</div>`;
    await sendEmail(admin, `FLASH STORE — New Order #${order.order_number}`, layout(adminContent), `New FLASH STORE order #${order.order_number} from ${order.full_name}, total ${money(order.total)}`);
  }
}

async function sendStatus(orderId:string) {
  const {order,items}=await orderData(orderId);
  if(!order.email) return;
  const label=statusLabel(order.status);
  const content=`<div style="padding:24px"><div style="display:inline-block;padding:8px 12px;background:#ffb000;color:#111;border-radius:999px;font-weight:800">${esc(label.toUpperCase())}</div><h1 style="margin:16px 0 8px">Order #${esc(order.order_number)}</h1><p>Hello ${esc(order.full_name)}, your order status has been updated.</p>${itemsHtml(items)}<div style="margin-top:18px;padding:16px;background:#0f1218;border:1px solid #252a35;border-radius:12px"><b>Total:</b> ${money(order.total)}<br><span style="display:block;margin-top:7px"><b>Payment:</b> ${esc(order.payment_method)}</span><span style="display:block;margin-top:7px"><b>Status:</b> ${esc(label)}</span></div></div>`;
  await sendEmail(order.email, `FLASH STORE — Order #${order.order_number} ${label}`, layout(content), `FLASH STORE\nOrder #${order.order_number}\nStatus: ${label}\nTotal: ${money(order.total)}`);
}

async function sendNewAccount(userId:string) {
  const rows=await getJson(`profiles?id=eq.${encodeURIComponent(userId)}&select=email,full_name,created_at`);
  const profile=rows[0];
  if(!profile) return;
  const settings=await getJson('store_settings?id=eq.1&select=admin_email');
  const admin=settings[0]?.admin_email || '';
  if(!admin) return;
  const content=`<div style="padding:24px"><div style="display:inline-block;padding:8px 12px;background:#28c76f;color:#111;border-radius:999px;font-weight:800">NEW ACCOUNT</div><h1 style="margin:16px 0 8px">New customer account</h1><p><b>Name:</b> ${esc(profile.full_name||'')}</p><p><b>Email:</b> ${esc(profile.email)}</p><p><b>Created:</b> ${esc(new Date(profile.created_at).toLocaleString('en-GB'))}</p></div>`;
  await sendEmail(admin, 'FLASH STORE — New Customer Account', layout(content), `New customer account: ${profile.email}`);
}

Deno.serve(async (req) => {
  try {
    if (WEBHOOK_SECRET && req.headers.get('x-order-email-secret') !== WEBHOOK_SECRET) return new Response('Unauthorized', {status:401});
    const payload=await req.json();
    const table=payload.table;
    const event=payload.type || payload.eventType || '';
    const record=payload.record || {};
    if(table==='orders' && (event==='INSERT' || event==='INSERTS')) await sendNewOrder(record.id);
    else if(table==='orders' && (event==='UPDATE' || event==='UPDATES')) {
      const oldStatus=payload.old_record?.status;
      if(record.status && record.status!==oldStatus && ['paid','processing','completed','cancelled'].includes(record.status)) await sendStatus(record.id);
    } else if(table==='profiles' && (event==='INSERT' || event==='INSERTS')) await sendNewAccount(record.id);
    return new Response(JSON.stringify({ok:true}), {headers:jsonHeaders});
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ok:false,error:String(e?.message||e)}), {status:500,headers:jsonHeaders});
  }
});
