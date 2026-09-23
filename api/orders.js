const {json,env,supabase,readBody}=require("./_lib");
async function currentUser(req){
  const c=req.headers.cookie||"";
  const m=c.match(/(?:^|;\s*)flash_token=([^;]+)/);
  if(!m)return null;
  const root=env("SUPABASE_URL").replace(/\/rest\/v1\/?$/,'');
  const token=decodeURIComponent(m[1]);
  const r=await fetch(root+"/auth/v1/user",{headers:{apikey:env("SUPABASE_ANON_KEY"),Authorization:"Bearer "+token}});
  return r.ok?await r.json():null;
}
module.exports=async(req,res)=>{
 try{
  if(req.method!=="POST")return json(res,405,{error:"Method not allowed"});
  const user=await currentUser(req);
  if(!user)return json(res,401,{error:"You must sign in before placing an order."});
  const body=await readBody(req),items=Array.isArray(body.items)?body.items:[];
  if(!items.length)return json(res,400,{error:"Cart is empty"});
  if(!body.proof_url)return json(res,400,{error:"Payment proof is required."});
  const full_name=String(body.full_name||"").trim(),phone=String(body.phone||"").trim(),payment_method=String(body.payment_method||"").trim();
  if(!full_name||!phone||!payment_method)return json(res,400,{error:"Please complete your name, phone and payment method."});

  const db=supabase();
  const productsQ=await db.from("products").select("*");
  if(productsQ.error)throw productsQ.error;
  const optionsQ=await db.from("product_options").select("*");
  if(optionsQ.error)throw optionsQ.error;
  const products=productsQ.data||[],options=optionsQ.data||[];
  let requiresAccount=false;
  let subtotal=0;
  for(const item of items){
    const p=products.find(x=>String(x.id)===String(item.product_id));
    if(!p||p.active===false)continue;
    const o=item.option_id?options.find(x=>String(x.id)===String(item.option_id)&&String(x.product_id)===String(p.id)):null;
    const price=Number(o?.price??p.price??0),qty=Math.max(1,Number(item.quantity||1));
    subtotal+=price*qty;
    if(p.requires_account_details)requiresAccount=true;
  }
  if(requiresAccount && (!String(body.account_email||"").trim()||!String(body.account_password||"")))return json(res,400,{error:"This order contains a product that requires an email and password."});

  let discountAmount=0;
  if(body.discount_code){
    const d=await fetch("https://"+(req.headers.host||"localhost")+"/api/discount",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({code:body.discount_code,items})});
    if(d.ok){const dd=await d.json();discountAmount=Number(dd.amount||0)}
  }
  const payment=await db.from("payment_methods").select("*");
  if(payment.error)throw payment.error;
  const pm=(payment.data||[]).find(x=>x.name===payment_method&&x.active!==false);
  if(!pm)return json(res,400,{error:"Please choose a valid payment method."});

  const profileQ=await db.from("profiles").select("*");
  const profile=(profileQ.data||[]).find(x=>x.id===user.id);
  const order=await db.from("orders").insert({user_id:user.id,full_name,email:user.email||"",phone,password_text:"",payment_method,payment_details:pm.details||"",proof_url:String(body.proof_url),account_email:requiresAccount?String(body.account_email||"").trim():"",account_password:requiresAccount?String(body.account_password||""):"",subtotal,discount_amount:discountAmount,total:Math.max(0,subtotal-discountAmount),discount_code:String(body.discount_code||""),status:"pending"},{returning:"representation"});
  if(order.error)throw order.error;
  const o=order.data[0];
  for(const i of items){
    const p=products.find(x=>String(x.id)===String(i.product_id));
    const opt=i.option_id?options.find(x=>String(x.id)===String(i.option_id)):null;
    const unit=Number(opt?.price??p?.price??i.price??0);
    const q=await db.from("order_items").insert({order_id:o.id,product_id:i.product_id,option_id:i.option_id||null,product_name:i.name||p?.name||"Product",option_name:i.option_name||opt?.name||"",quantity:Math.max(1,Number(i.quantity||1)),unit_price:unit});
    if(q.error)throw q.error;
  }
  try{await db.from("notifications").insert({type:"order",title:`New order #${o.order_number}`,message:`${full_name} placed an order for ${Number(o.total||0).toLocaleString()} EGP.`,related_id:String(o.id)})}catch(_){ }
  return json(res,200,{ok:true,order_number:o.order_number});
 }catch(e){return json(res,500,{error:e.message})}
};
