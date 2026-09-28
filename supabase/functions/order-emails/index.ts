import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") || "FLASH STORE <onboarding@resend.dev>";

const esc=(v:unknown)=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]!));
const money=(v:unknown)=>`${Number(v||0).toLocaleString()} EGP`;

function itemRows(items:any[]=[]){
  return items.map(i=>`
    <tr>
      <td style="padding:12px;border-bottom:1px solid #252a35">
        ${i.image_url?`<img src="${esc(i.image_url)}" style="width:72px;height:72px;object-fit:cover;border-radius:10px;vertical-align:middle;margin-right:10px">`:''}
        <b>${esc(i.product_name||"Product")}</b>${i.option_name?`<div style="color:#9ca3af;margin-top:4px">${esc(i.option_name)}</div>`:''}
      </td>
      <td style="padding:12px;border-bottom:1px solid #252a35;text-align:center">${Number(i.quantity||1)}</td>
      <td style="padding:12px;border-bottom:1px solid #252a35;text-align:right"><b>${money(i.unit_price)}</b></td>
    </tr>`).join("");
}

function layout(title:string, body:string){
  return `<div style="background:#0b0d12;padding:28px;font-family:Arial,sans-serif;color:#f5f7fb">
    <div style="max-width:680px;margin:auto;background:#12151c;border:1px solid #252a35;border-radius:18px;overflow:hidden">
      <div style="padding:22px;background:#10131a;border-bottom:1px solid #252a35"><b style="font-size:22px;color:#fff">FLASH <span style="color:#ffb000">STORE</span></b></div>
      <div style="padding:24px"><h2 style="margin-top:0">${esc(title)}</h2>${body}</div>
    </div>
  </div>`;
}

async function send(to:string,subject:string,html:string){
  if(!to||!RESEND_API_KEY)return;
  const r=await fetch("https://api.resend.com/emails",{
    method:"POST",
    headers:{"Authorization":`Bearer ${RESEND_API_KEY}`,"Content-Type":"application/json"},
    body:JSON.stringify({from:EMAIL_FROM,to:[to],subject,html})
  });
  if(!r.ok)throw new Error(await r.text());
}

Deno.serve(async(req)=>{
  if(req.method!=="POST")return Response.json({error:"POST only"},{status:405});
  try{
    const p=await req.json();
    const action=String(p.action||"order_created");
    const order=p.order||{};
    const items=Array.isArray(p.items)?p.items:[];
    const customer=String(p.customer_email||order.email||"").trim();
    const admin=String(p.admin_email||"").trim();
    const orderNo=order.order_number||p.order_number||"";
    const status=String(order.status||p.status||"pending");
    const products=`<table style="width:100%;border-collapse:collapse;margin:18px 0"><thead><tr><th style="text-align:left;padding:10px">Product</th><th style="padding:10px">Qty</th><th style="text-align:right;padding:10px">Price</th></tr></thead><tbody>${itemRows(items)}</tbody></table>`;

    if(action==="signup"){
      const body=`<p>A new customer account was created.</p><p><b>Name:</b> ${esc(p.full_name)}</p><p><b>Email:</b> ${esc(p.email)}</p>`;
      await send(admin,"FLASH STORE — New customer account",layout("New customer account",body));
      return Response.json({ok:true});
    }

    const body=`<p><b>Order #${esc(orderNo)}</b></p>
      ${products}
      <p>Subtotal: <b>${money(order.subtotal)}</b></p>
      <p>Discount: <b>${money(order.discount_amount)}</b></p>
      <h2>Total: ${money(order.total)}</h2>
      <p>Payment: <b>${esc(order.payment_method)}</b></p>
      <p>Status: <b>${esc(status)}</b></p>
      ${order.proof_url?`<p><a href="${esc(order.proof_url)}">Open payment proof</a></p>`:""}
      ${order.account_email?`<div style="padding:14px;background:#171b24;border-radius:10px"><b>Product account</b><br>Email: ${esc(order.account_email)}<br>Password: ${esc(order.account_password||"")}</div>`:""}
      ${(items||[]).some((i:any)=>i.account_email)?`<h3>Product account details</h3>${items.filter((i:any)=>i.account_email).map((i:any)=>`<p><b>${esc(i.product_name)} ${i.option_name?`— ${esc(i.option_name)}`:""}</b><br>Email: ${esc(i.account_email)}<br>Password: ${esc(i.account_password||"")}</p>`).join("")}`:""}`;

    if(action==="order_created"){
      if(customer)await send(customer,`FLASH STORE — Order #${orderNo} received`,layout("Order received",body));
      if(admin)await send(admin,`FLASH STORE — New Order #${orderNo}`,layout("New order",`<p><b>Customer:</b> ${esc(order.full_name)}<br><b>Email:</b> ${esc(customer)}<br><b>Phone:</b> ${esc(order.phone)}</p>${body}`));
    }else if(action==="order_status"){
      if(customer)await send(customer,`FLASH STORE — Order #${orderNo} ${status}`,layout(`Order #${orderNo} updated`,body));
    }
    return Response.json({ok:true});
  }catch(e){console.error(e);return Response.json({error:String(e?.message||e)},{status:500})}
});