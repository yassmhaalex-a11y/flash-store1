const {json,env,supabase,readBody}=require("./_lib");
const {effectivePrice}=require("./_pricing");
const {sendStoreEmail}=require("./email");

async function configuredAdminEmail(){
  try{const q=await supabase().from("store_settings").select("admin_email").eq("id",1);return q.data?.[0]?.admin_email||env("ADMIN_EMAIL")||""}
  catch(_){return env("ADMIN_EMAIL")||""}
}
async function currentUser(req){
  const c=req.headers.cookie||"",m=c.match(/(?:^|;\s*)flash_token=([^;]+)/);if(!m)return null;
  const root=env("SUPABASE_URL").replace(/\/rest\/v1\/?/,""),token=decodeURIComponent(m[1]);
  const r=await fetch(root+"/auth/v1/user",{headers:{apikey:env("SUPABASE_ANON_KEY"),Authorization:"Bearer "+token}});
  return r.ok?await r.json():null
}
function cleanItem(i,p,o){
  return {
    product_id:i.product_id,option_id:i.option_id||null,
    product_name:i.name||p?.name||"Product",option_name:i.option_name||o?.name||"",
    quantity:Math.max(1,Number(i.quantity||1)),unit_price:Number(effectivePrice(o||p)||0),
    image_url:o?.image_url||p?.images?.[0]||p?.image_url||"",
    account_email:String(i.account_email||"").trim(),
    account_password:String(i.account_password||"")
  }
}

module.exports=async(req,res)=>{
 try{
  const user=await currentUser(req);if(!user)return json(res,401,{error:"You must sign in."});
  const db=supabase();

  if(req.method==="GET"){
   const requestedId=String((req.query&&req.query.id)||'');
   const q=await db.from("orders").select("*").eq("user_id",user.id).order("created_at",{ascending:false});
   if(q.error)throw q.error;
   let orders=q.data||[];
   if(requestedId) orders=orders.filter(o=>String(o.id)===requestedId);
   if(!orders.length) return json(res,404,{error:"Order not found."});
   const ids=orders.map(o=>String(o.id));
   const iq=await db.from("order_items").select("*");
   if(iq.error)throw iq.error;
   const items=(iq.data||[]).filter(i=>ids.includes(String(i.order_id)));
   const productsQ=await db.from("products").select("*");
   if(productsQ.error)throw productsQ.error;
   const optionsQ=await db.from("product_options").select("*");
   if(optionsQ.error)throw optionsQ.error;
   const catsQ=await db.from("categories").select("id,requires_delivery_credentials,requires_delivery_code");
   if(catsQ.error)throw catsQ.error;
   const products=productsQ.data||[], options=optionsQ.data||[], cats=catsQ.data||[];
   const productMap=new Map(products.map(x=>[String(x.id),x]));
   const optionMap=new Map(options.map(x=>[String(x.id),x]));
   const catMap=new Map(cats.map(x=>[String(x.id),x]));
   const result=orders.map(o=>{
    const its=items.filter(i=>String(i.order_id)===String(o.id)).map(i=>{
      const p=productMap.get(String(i.product_id));
      const op=optionMap.get(String(i.option_id));
      return {...i,image_url:op?.image_url||p?.images?.[0]||p?.image_url||""};
    });
    const flags=its.map(i=>catMap.get(String(productMap.get(String(i.product_id))?.category_id))||{});
    return {...o,
      requires_delivery_credentials:!!o.requires_delivery_credentials||flags.some(c=>!!c.requires_delivery_credentials),
      requires_delivery_code:!!o.requires_delivery_code||flags.some(c=>!!c.requires_delivery_code),
      items:its
    };
   });
   return json(res,200,{orders:result});
  }

  if(req.method!=="POST")return json(res,405,{error:"Method not allowed"});
  const body=await readBody(req),cart=Array.isArray(body.items)?body.items:[],details=Array.isArray(body.account_details)?body.account_details:[];
  if(!cart.length)return json(res,400,{error:"Cart is empty"});
  if(!body.proof_url)return json(res,400,{error:"Payment proof is required."});
  const full_name=String(body.full_name||"").trim(),phone=String(body.phone||"").trim(),payment_method=String(body.payment_method||"").trim();
  if(!full_name||!phone||!payment_method)return json(res,400,{error:"Please complete your name, phone and payment method."});

  const productsQ=await db.from("products").select("*"),optionsQ=await db.from("product_options").select("*");
  if(productsQ.error)throw productsQ.error;if(optionsQ.error)throw optionsQ.error;
  const products=productsQ.data||[],options=optionsQ.data||[]; const categoriesQ=await db.from('categories').select('id,requires_delivery_credentials,requires_delivery_code'); if(categoriesQ.error)throw categoriesQ.error; const categories=categoriesQ.data||[];
  let subtotal=0;let requiresDelivery=false;let requiresDeliveryCode=false;const validated=[];

  for(const item of cart){
   const p=products.find(x=>String(x.id)===String(item.product_id));if(!p||p.active===false)continue;
   const o=item.option_id?options.find(x=>String(x.id)===String(item.option_id)&&String(x.product_id)===String(p.id)):null;
   const source=o||p,price=effectivePrice(source),qty=Math.max(1,Number(item.quantity||1));
   const key=String(item.key||`${item.product_id}:${item.option_id||""}`);
   const d=details.find(x=>String(x.key)===key)||{};
   const needs=!!source.requires_account_details; const cat=categories.find(c=>String(c.id)===String(p.category_id)); if(cat?.requires_delivery_credentials) requiresDelivery=true; if(cat?.requires_delivery_code) requiresDeliveryCode=true;
   if(needs&&(!String(d.email||"").trim()||!String(d.password||"")))return json(res,400,{error:`Product account Email + Password are required for ${p.name}${o?.name?` — ${o.name}`:""}.`});
   validated.push({...cleanItem(item,p,o),unit_price:price,account_email:needs?String(d.email||"").trim():"",account_password:needs?String(d.password||""):""});
   subtotal+=price*qty;
  }
  if(!validated.length)return json(res,400,{error:"No valid products were found in the cart."});

  let discountAmount=0;
  if(body.discount_code){
   const host=req.headers.host;
   const d=await fetch("https://"+host+"/api/discount",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({code:body.discount_code,items:validated})});
   if(d.ok){const dd=await d.json();discountAmount=Number(dd.amount||0)}
  }
  const payment=await db.from("payment_methods").select("*");if(payment.error)throw payment.error;
  const pm=(payment.data||[]).find(x=>x.name===payment_method&&x.active!==false);if(!pm)return json(res,400,{error:"Please choose a valid payment method."});

  const legacyNeeds=validated.find(x=>x.account_email);
  const order=await db.from("orders").insert({
    user_id:user.id,full_name,email:user.email||"",phone,password_text:"",
    payment_method,payment_details:pm.details||"",proof_url:String(body.proof_url),
    account_email:legacyNeeds?.account_email||"",account_password:legacyNeeds?.account_password||"",
    subtotal,discount_amount:discountAmount,total:Math.max(0,subtotal-discountAmount),
    discount_code:String(body.discount_code||""),status:"pending",requires_delivery_credentials:requiresDelivery,requires_delivery_code:requiresDeliveryCode,delivery_email:"",delivery_password:"",delivery_code:""
  },{returning:"representation"});
  if(order.error)throw order.error;
  const o=order.data[0];

  for(const i of validated){
   const q=await db.from("order_items").insert({
    order_id:o.id,product_id:i.product_id,option_id:i.option_id,product_name:i.product_name,
    option_name:i.option_name,quantity:i.quantity,unit_price:i.unit_price,
    account_email:i.account_email||"",account_password:i.account_password||""
   });
   if(q.error)throw q.error;
  }
  try{await db.from("notifications").insert({type:"order",title:`New order #${o.order_number}`,message:`${full_name} placed an order for ${Number(o.total||0).toLocaleString()} EGP.`,related_id:String(o.id)})}catch(_){}

  const adminEmail=await configuredAdminEmail();
  await sendStoreEmail({action:"order_created",admin_email:adminEmail,customer_email:user.email||"",order:o,items:validated});
  return json(res,200,{ok:true,order_number:o.order_number});
 }catch(e){return json(res,500,{error:e.message})}
};