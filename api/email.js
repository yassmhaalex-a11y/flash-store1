const {env}=require('./_lib');

function escapeHtml(value){
  return String(value??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}

async function sendEmail({to,subject,html,text}){
  const key=env('RESEND_API_KEY');
  if(!key || !to) return {sent:false,skipped:true};
  const from=env('EMAIL_FROM') || 'FLASH STORE <onboarding@resend.dev>';
  const r=await fetch('https://api.resend.com/emails',{
    method:'POST',
    headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
    body:JSON.stringify({from,to,subject,html,text})
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok) throw Error(data.message||data.error||'Email service error');
  return {sent:true,id:data.id};
}

function orderEmail({order,status,items=[],customerName}){
  const label={pending:'Pending',paid:'Payment received',processing:'Processing',completed:'Completed',cancelled:'Cancelled'}[status]||status;
  const rows=items.map(i=>`<tr><td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(i.product_name||'Product')}${i.option_name?` — ${escapeHtml(i.option_name)}`:''}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${Number(i.quantity||1)}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${Number(i.unit_price||0).toLocaleString()} EGP</td></tr>`).join('');
  const html=`<!doctype html><html><body style="margin:0;background:#0b0d12;font-family:Arial,sans-serif;color:#f5f7fb"><div style="max-width:680px;margin:30px auto;background:#12151c;border:1px solid #252a35;border-radius:16px;overflow:hidden"><div style="padding:24px;background:#171b24;border-bottom:1px solid #252a35"><div style="font-size:26px;font-weight:900;color:#fff">FLASH <span style="color:#ffb000">STORE</span></div><div style="color:#9ca3af;margin-top:5px">${escapeHtml(label)}</div></div><div style="padding:24px"><h2 style="margin-top:0">Order #${escapeHtml(order.order_number)}</h2><p>Hello ${escapeHtml(customerName||order.full_name||'Customer')},</p><p>Your order status is <b style="color:#ffb000">${escapeHtml(label)}</b>.</p><div style="background:#0f1218;border:1px solid #252a35;border-radius:12px;padding:14px;margin:18px 0"><div><b>Total:</b> ${Number(order.total||0).toLocaleString()} EGP</div><div style="margin-top:6px"><b>Payment:</b> ${escapeHtml(order.payment_method||'')}</div><div style="margin-top:6px"><b>Date:</b> ${escapeHtml(new Date(order.created_at||Date.now()).toLocaleString())}</div></div>${rows?`<table style="width:100%;border-collapse:collapse;background:#fff;color:#111;border-radius:10px;overflow:hidden"><thead><tr><th style="padding:8px;text-align:left">Product</th><th style="padding:8px">Qty</th><th style="padding:8px;text-align:right">Price</th></tr></thead><tbody>${rows}</tbody></table>`:''}<p style="color:#9ca3af;margin-top:22px">Thank you for choosing FLASH STORE.</p></div></div></body></html>`;
  const text=`FLASH STORE\nOrder #${order.order_number}\nStatus: ${label}\nCustomer: ${customerName||order.full_name||''}\nTotal: ${Number(order.total||0).toLocaleString()} EGP\nPayment: ${order.payment_method||''}`;
  return {html,text,label};
}

module.exports={sendEmail,orderEmail,escapeHtml};
