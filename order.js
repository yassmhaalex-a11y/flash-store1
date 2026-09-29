const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const money=n=>`${Number(n||0).toLocaleString()} EGP`;
const statusLabel=s=>({pending:'Pending',paid:'Paid',processing:'Processing',completed:'Completed',cancelled:'Cancelled'}[s]||s);
async function init(){
 const id=new URLSearchParams(location.search).get('id');
 const box=document.querySelector('#orderDetailPage');
 if(!id){box.innerHTML='<p class="muted">Order not found.</p>';return}
 try{
  const r=await fetch('/api/orders?id='+encodeURIComponent(id));
  const d=await r.json();
  if(!r.ok||!d.orders?.[0])throw Error(d.error||'Order not found');
  const o=d.orders[0];
  box.innerHTML=`<div class="section-head"><div><span class="eyebrow">ORDER DETAILS</span><h1>Order #${esc(o.order_number)}</h1><p class="muted">${new Date(o.created_at).toLocaleString()}</p></div><a class="small-btn" href="/account.html#orders">Back to My Orders</a></div>
  <div class="order-detail-grid"><section class="modal-box"><h2>Products</h2>${(o.items||[]).map(i=>`<div class="order-detail-item">${i.image_url?`<img src="${esc(i.image_url)}" alt="">`:''}<div><b>${esc(i.product_name)}</b><div class="muted">${i.option_name?esc(i.option_name)+' · ':''}Qty ${Number(i.quantity||1)}</div><strong>${money(i.unit_price)}</strong></div></div>`).join('')}</section>
  <aside class="modal-box"><h2>Order Information</h2><p><b>Status:</b> <span class="badge">${esc(statusLabel(o.status))}</span></p><p><b>Payment:</b> ${esc(o.payment_method)}</p><p><b>Payment Details:</b> ${esc(o.payment_details||'')}</p><p><b>Subtotal:</b> ${money(o.subtotal)}</p><p><b>Discount:</b> ${money(o.discount_amount)}</p><h2>Total: ${money(o.total)}</h2>${o.proof_url?`<a class="small-btn" href="${esc(o.proof_url)}" target="_blank">View Payment Proof</a>`:''}</aside></div>
  ${(o.requires_delivery_credentials||o.requires_delivery_code)?`<section class="modal-box delivery-credentials"><span class="eyebrow">DELIVERY</span><h2>Delivery Details</h2>${o.requires_delivery_credentials?(o.delivery_email&&o.delivery_password?`<div class="field"><label>Email</label><input value="${esc(o.delivery_email)}" readonly></div><div class="field"><label>Password</label><input value="${esc(o.delivery_password)}" readonly></div>`:`<div class="processing-box"><span class="badge">Processing</span><p class="muted">Your Email & Password will appear here after the order is processed by FLASH STORE.</p></div>`):''}${o.requires_delivery_code?(o.delivery_code?`<div class="field"><label>Code</label><input value="${esc(o.delivery_code)}" readonly></div>`:`<div class="processing-box"><span class="badge">Processing</span><p class="muted">Your Code will appear here after the order is processed by FLASH STORE.</p></div>`):''}${((!o.requires_delivery_credentials||(o.delivery_email&&o.delivery_password))&&(!o.requires_delivery_code||o.delivery_code))?`<p class="success">Your delivery details are ready.</p>`:''}</section>`:''}`;
 }catch(e){box.innerHTML=`<p class="muted">${esc(e.message)}</p>`}
}
init();
const s=document.querySelector('#search');if(s)s.onkeydown=e=>{if(e.key==='Enter'&&s.value.trim())location.href='/search.html?q='+encodeURIComponent(s.value.trim())};
