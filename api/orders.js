const {json,env,supabase}=require("./_lib");
function parseMultipart(req){return new Promise((resolve,reject)=>{let chunks=[];req.on("data",c=>chunks.push(c));req.on("end",()=>{const b=Buffer.concat(chunks).toString();try{const text=b.replace(/^[\s\S]*?\r?\n\r?\n/,"");resolve({raw:b,text})}catch(e){reject(e)}});req.on("error",reject)})}
module.exports=async(req,res)=>{
 try{
  if(req.method!=="POST")return json(res,405,{error:"Method not allowed"});
  let body=req.body||{}; let items=[];
  if(req.headers["content-type"]?.includes("application/json")) items=body.items||[];
  else {const mp=await parseMultipart(req);const m=mp.raw.match(/name="items"\r?\n\r?\n([\s\S]*?)\r?\n--/);if(m)items=JSON.parse(m[1].trim())}
  if(!items.length)return json(res,400,{error:"Cart is empty"});
  const full_name=body.full_name||"Customer",phone=body.phone||"",email=body.email||"",password=body.password||"",payment_method=body.payment_method||"";
  const subtotal=items.reduce((a,i)=>a+Number(i.price)*Number(i.quantity||1),0);
  const db=supabase();let discountAmount=0;
  if(body.discount_code){const d=await fetch("https://"+(req.headers.host||"localhost")+"/api/discount",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({code:body.discount_code,items})});if(d.ok){const dd=await d.json();discountAmount=Number(dd.amount||0)}}
  const payment=await db.from("payment_methods").select("*");const pm=(payment.data||[]).find(x=>x.name===payment_method);
  const order=await db.from("orders").insert({full_name,phone,email,password_text:password,payment_method,payment_details:pm?.details||"",subtotal,discount_amount:discountAmount,total:Math.max(0,subtotal-discountAmount),discount_code:body.discount_code||"",status:"pending"},{returning:"representation"});if(order.error)throw order.error;
  const o=order.data[0];
  for(const i of items){const q=await db.from("order_items").insert({order_id:o.id,product_id:i.product_id,option_id:i.option_id,product_name:i.name,option_name:i.option_name||"",quantity:i.quantity,unit_price:i.price});if(q.error)throw q.error}
  json(res,200,{ok:true,order_number:o.order_number});
 }catch(e){json(res,500,{error:e.message})}
};