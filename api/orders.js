const {json,env,supabase,readBody}=require("../lib/_lib");
const {effectivePrice}=require("../lib/_pricing");
const {sendStoreEmail}=require("../lib/email");
const {calculateDiscount,positiveQuantity}=require("../lib/discount-rules");
const {verify:verifyProofReceipt}=require("../lib/proof-receipt");
const {objectPath,proofObjectExists,safeSignedProofUrl}=require("../lib/private-proof");

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
    product_name:p?.name||"Product",option_name:o?.name||"",
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
   if(!orders.length) return requestedId ? json(res,404,{error:"Order not found."}) : json(res,200,{orders:[]});
   const ids=orders.map(o=>String(o.id));
   const iq=await db.from("order_items").select("*").in("order_id",ids);
   if(iq.error)throw iq.error;
   const items=(iq.data||[]).filter(i=>ids.includes(String(i.order_id)));
   const productIds=[...new Set(items.map(i=>i.product_id).filter(Boolean))];
   const optionIds=[...new Set(items.map(i=>i.option_id).filter(Boolean))];
   const productsQ=productIds.length?await db.from("products").select("id,name,category_id,images,image_url").in("id",productIds):{data:[]};
   if(productsQ.error)throw productsQ.error;
   const optionsQ=optionIds.length?await db.from("product_options").select("id,product_id,image_url").in("id",optionIds):{data:[]};
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
   await Promise.all(result.map(async o=>{if(o.proof_url)o.proof_url=await safeSignedProofUrl(o.proof_url)}));
   return json(res,200,{orders:result});
  }

  if(req.method!=="POST")return json(res,405,{error:"Method not allowed"});
  const body=await readBody(req),cart=Array.isArray(body.items)?body.items:[],details=Array.isArray(body.account_details)?body.account_details:[];
  if(!cart.length||cart.length>40)return json(res,400,{error:"Invalid cart size"});
  if(typeof body.proof_url!=="string"||!body.proof_url.trim()||body.proof_url.length>2048)return json(res,400,{error:"Valid payment proof is required."});
  // Only accept opaque private-object identifiers created by our upload endpoint.
  // A signed receipt separately binds the upload to this authenticated user.
  const proofPath=objectPath(body.proof_url);
  if(!proofPath||!proofPath.startsWith(`proof/${user.id}/`))return json(res,400,{error:"Payment proof must be uploaded through checkout."});
  if(!verifyProofReceipt(user.id,body.proof_url,body.proof_receipt))return json(res,400,{error:"Payment proof upload expired or does not belong to your session. Please upload it again."});
  if(!await proofObjectExists(body.proof_url))return json(res,400,{error:"Payment proof image was not found. Please upload it again."});
  // A proof upload is intended for one order only. The database unique index in
  // V58_PROOF_REUSE_GUARD.sql is the concurrency-safe enforcement; this query
  // gives a friendly response for already-submitted requests.
  const usedProof=await db.from("orders").select("id,order_number").eq("proof_url",body.proof_url).limit(1);
  if(usedProof.error)throw usedProof.error;
  if(usedProof.data?.length){
    const prior=usedProof.data[0];
    const mine=await db.from("orders").select("id").eq("id",prior.id).eq("user_id",user.id).limit(1);
    if(mine.error)throw mine.error;
    return mine.data?.length
      ?json(res,200,{ok:true,already_submitted:true,order_number:prior.order_number})
      :json(res,409,{error:"This payment proof was already used. Please upload a new one."});
  }
  const full_name=String(body.full_name||"").trim(),phone=String(body.phone||"").trim(),payment_method=String(body.payment_method||"").trim();
  if(!full_name||!phone||!payment_method)return json(res,400,{error:"Please complete your name, phone and payment method."});
  if(body.discount_code!=null&&(typeof body.discount_code!=="string"||body.discount_code.length>100))return json(res,400,{error:"Invalid discount code."});
  if(details.length>40)return json(res,400,{error:"Too many account details."});
  if(full_name.length>150||phone.length>40||payment_method.length>100)return json(res,400,{error:"Customer details are too long."});

  const productsQ=await db.from("products").select("*"),optionsQ=await db.from("product_options").select("*");
  if(productsQ.error)throw productsQ.error;if(optionsQ.error)throw optionsQ.error;
  const products=productsQ.data||[],options=optionsQ.data||[]; const categoriesQ=await db.from('categories').select('id,requires_delivery_credentials,requires_delivery_code'); if(categoriesQ.error)throw categoriesQ.error; const categories=categoriesQ.data||[];
  let subtotal=0;let totalQuantity=0;let requiresDelivery=false;let requiresDeliveryCode=false;const validated=[];const requestedStock=new Map();

  for(const item of cart){
   const p=products.find(x=>String(x.id)===String(item.product_id));if(!p||p.active===false)return json(res,400,{error:"Product unavailable"});
   const o=item.option_id?options.find(x=>String(x.id)===String(item.option_id)&&String(x.product_id)===String(p.id)&&x.active!==false):null;
   if(item.option_id&&!o)return json(res,400,{error:"Product option unavailable"});
   const source=o||p,price=effectivePrice(source),qty=positiveQuantity(item.quantity??1);
   if(!qty||qty>100||!Number.isFinite(price)||price<0||price>10000000)return json(res,400,{error:"Invalid quantity or price"});
   totalQuantity+=qty;
   if(totalQuantity>100)return json(res,400,{error:"Cart quantity exceeds the allowed limit."});
   const stockKey=String(p.id)+":"+String(o?.id||"");
   const accumulated=(requestedStock.get(stockKey)||0)+qty;
   requestedStock.set(stockKey,accumulated);
   if(source.stock_quantity!==null&&source.stock_quantity!==undefined&&Number(source.stock_quantity)<accumulated)return json(res,409,{error:`Out of stock: ${p.name}${o?.name?' — '+o.name:''}`});
   const key=String(item.key||`${item.product_id}:${item.option_id||""}`);
   const d=details.find(x=>String(x.key)===key)||{};
   const needs=!!source.requires_account_details; const cat=categories.find(c=>String(c.id)===String(p.category_id)); if(cat?.requires_delivery_credentials) requiresDelivery=true; if(cat?.requires_delivery_code) requiresDeliveryCode=true;
   if(needs&&(!String(d.email||"").trim()||!String(d.password||"")))return json(res,400,{error:`Product account Email + Password are required for ${p.name}${o?.name?` — ${o.name}`:""}.`});
   const accountEmail=needs?String(d.email||"").trim():"";
   const accountPassword=needs?String(d.password||""):"";
   if(accountEmail.length>254||accountPassword.length>512)return json(res,400,{error:"Account details are too long."});
   validated.push({...cleanItem(item,p,o),unit_price:price,account_email:accountEmail,account_password:accountPassword});
   subtotal+=price*qty;
   if(!Number.isFinite(subtotal)||subtotal>100000000)return json(res,400,{error:"Cart total exceeds the allowed limit."});
  }
  if(!validated.length)return json(res,400,{error:"No valid products were found in the cart."});

  let discountAmount=0;
  if(body.discount_code){
   const result=await calculateDiscount(db,body.discount_code,validated,user.id);
   if(result.error)return json(res,result.status||400,{error:result.error});
   discountAmount=result.amount;
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
  const o=order.data?.[0];
  if(!o?.id)throw new Error("Order was not returned by the database");

  // Insert all items in one database statement. This avoids leaving a subset of
  // order items behind when a later item fails. A full order+items transaction
  // still requires a server-side database RPC and is tracked separately.
  const itemRows=validated.map(i=>({
    order_id:o.id,product_id:i.product_id,option_id:i.option_id,
    product_name:i.product_name,option_name:i.option_name,
    quantity:i.quantity,unit_price:i.unit_price,
    account_email:i.account_email||"",account_password:i.account_password||""
  }));
  const itemsResult=await db.from("order_items").insert(itemRows);
  if(itemsResult.error){
    const rollback=await db.from("orders").delete().eq("id",o.id).eq("user_id",user.id);
    if(rollback.error)console.error("Order cleanup failed",{order_id:o.id,error:rollback.error});
    throw new Error("Could not save order items. Contact support if the order appears in your account.");
  }
  try{await db.from("notifications").insert({type:"order",title:`New order #${o.order_number}`,message:`${full_name} placed an order for ${Number(o.total||0).toLocaleString()} EGP.`,related_id:String(o.id)})}catch(_){}

  const adminEmail=await configuredAdminEmail();
  // Email is a notification, not part of the purchase transaction.
  // A temporary email outage must not turn a successfully saved order into a
  // client-visible 500 (which can encourage accidental duplicate purchases).
  try {
    await sendStoreEmail({action:"order_created",admin_email:adminEmail,customer_email:user.email||"",order:o,items:validated});
  } catch (mailError) {
    console.error("Order notification failed", {order_id:o.id, message:mailError?.message});
  }
  return json(res,200,{ok:true,order_number:o.order_number});
 }catch(e){console.error("Order request failed",e);return json(res,500,{error:"Unable to process your order right now. Please contact support if you already submitted it."})}
};