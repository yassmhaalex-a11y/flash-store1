const {effectivePrice}=require('./_pricing');
function positiveQuantity(v){const n=Number(v);return Number.isSafeInteger(n)&&n>=1&&n<=20?n:null}
async function calculateDiscount(db,code,items,userId){
 const d=await db.from('discounts').select('*');if(d.error)throw d.error;
 const x=(d.data||[]).find(v=>String(v.code||'').toLowerCase()===String(code||'').trim().toLowerCase()&&v.active);
 if(!x)return {error:'Invalid discount code',status:404};
 // Validate the promotion window on the server, not in the browser.
 const now=Date.now();
 if(x.starts_at){const start=Date.parse(x.starts_at);if(!Number.isFinite(start)||now<start)return {error:'This discount is not active yet',status:400};}
 if(x.ends_at){const end=Date.parse(x.ends_at);if(!Number.isFinite(end)||now>=end)return {error:'This discount has expired',status:400};}

 if(x.max_uses!=null){
  const limit=Number(x.max_uses),used=Number(x.used_count||0);
  if(!Number.isSafeInteger(limit)||limit<1||!Number.isSafeInteger(used)||used<0)return {error:'Discount configuration is invalid',status:400};
  if(used>=limit)return {error:'Discount usage limit reached',status:400};
 }
 if(x.first_order_only||x.one_use_per_user){
  if(!userId)return {error:'Sign in to use this code',status:401};
  const orders=await db.from('orders').select('discount_code,status').eq('user_id',userId);
  if(orders.error)throw orders.error;
  const existing=(orders.data||[]).filter(o=>!['canceled','cancelled'].includes(String(o.status||'').trim().toLowerCase()));
  if(x.first_order_only&&existing.length)return {error:'This discount is for your first order only',status:400};
  if(x.one_use_per_user&&existing.some(o=>String(o.discount_code||'').toLowerCase()===String(x.code).toLowerCase()))return {error:'You already used this discount',status:400};
 }
 let eligible=items;
 if(x.scope==='products'||x.scope==='categories'){
  const table=x.scope==='products'?'discount_products':'discount_categories';
  const links=await db.from(table).select('*').eq('discount_id',x.id);if(links.error)throw links.error;
  const ids=new Set((links.data||[]).map(a=>String(x.scope==='products'?a.product_id:a.category_id)));
  if(x.scope==='products')eligible=items.filter(i=>ids.has(String(i.product_id)));
  else {const selectedIds=[...new Set(items.map(i=>String(i.product_id)))];
   const products=await db.from('products').select('id,category_id').in('id',selectedIds);if(products.error)throw products.error;
   const eligibleProducts=new Set((products.data||[]).filter(a=>ids.has(String(a.category_id))).map(a=>String(a.id)));
   eligible=items.filter(i=>eligibleProducts.has(String(i.product_id)));
  }
 }
 if(!eligible.length)return {error:'This code does not apply to the selected products',status:400};
 const base=eligible.reduce((sum,i)=>sum+Number(i.unit_price)*Number(i.quantity),0);
 if(!Number.isFinite(base)||base<0||base>100000000)return {error:'Invalid eligible order total',status:400};
 const min=x.min_order_total==null?null:Number(x.min_order_total);
 const max=x.max_order_total==null?null:Number(x.max_order_total);
 if((min!==null&&(!Number.isFinite(min)||min<0))||(max!==null&&(!Number.isFinite(max)||max<0))||(min!==null&&max!==null&&min>max))return {error:'Discount configuration is invalid',status:400};
 if(min!==null&&base<min)return {error:'Eligible order total is below the minimum',status:400};
 if(max!==null&&base>max)return {error:'Eligible order total is above the maximum',status:400};
 const value=Number(x.value);if(!['percent','fixed'].includes(x.kind)||!Number.isFinite(value)||value<=0||(x.kind==='percent'&&value>100))return {error:'Discount configuration is invalid',status:400};
 const amount=x.kind==='percent'?base*Math.min(100,value)/100:Math.min(base,value);
 return {label:x.code,amount:Math.round(amount*100)/100};
}
async function trustedItems(db,cart){
 if(!Array.isArray(cart)||cart.length===0||cart.length>40)return {error:'Invalid cart'};
 const productIds=[...new Set(cart.map(i=>String(i.product_id||'')))];
 const optionIds=[...new Set(cart.filter(i=>i.option_id).map(i=>String(i.option_id)))];
 const [pq,oq]=await Promise.all([db.from('products').select('*').in('id',productIds),optionIds.length?db.from('product_options').select('*').in('id',optionIds):Promise.resolve({data:[],error:null})]);
 if(pq.error)throw pq.error;if(oq.error)throw oq.error;
 const products=pq.data||[],options=oq.data||[],items=[];const requestedStock=new Map();let totalQuantity=0;
 for(const item of cart){
  const qty=positiveQuantity(item.quantity??1);if(!qty)return {error:'Invalid quantity'};
  totalQuantity+=qty;if(totalQuantity>100)return {error:'Cart quantity exceeds the allowed limit'};
  const product=products.find(p=>String(p.id)===String(item.product_id)&&p.active!==false);if(!product)return {error:'Product unavailable'};
  const option=item.option_id?options.find(o=>String(o.id)===String(item.option_id)&&String(o.product_id)===String(product.id)&&o.active!==false):null;
  if(item.option_id&&!option)return {error:'Product option unavailable'};
  const stockSource=option||product;
  const stockKey=String(product.id)+":"+String(option?.id||"");
  const requested=(requestedStock.get(stockKey)||0)+qty;
  requestedStock.set(stockKey,requested);
  if(stockSource.stock_quantity!=null&&Number(stockSource.stock_quantity)<requested)return {error:'Product out of stock'};
  const source=option||product;const price=effectivePrice(source);
  if(!Number.isFinite(price)||price<0)return {error:'Invalid product price'};
  items.push({product_id:product.id,option_id:option?.id||null,quantity:qty,unit_price:price});
 }
 return {items};
}
module.exports={calculateDiscount,trustedItems,positiveQuantity};
