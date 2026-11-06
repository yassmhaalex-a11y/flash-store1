const {json,supabase}=require('../lib/_lib');
const {enrichPrice}=require('../lib/_pricing');
module.exports=async(req,res)=>{try{
 const db=supabase();
 const jobs=[['categories',()=>db.from('categories').select('*').eq('active',true).order('sort_order')],['products',()=>db.from('products').select('*').eq('active',true).order('created_at',{ascending:false})],['settings',()=>db.from('store_settings').select('*').eq('id',1)],['payments',()=>db.from('payment_methods').select('*').eq('active',true).order('sort_order')],['banners',()=>db.from('hero_banners').select('*').eq('active',true).order('sort_order')],['options',()=>db.from('product_options').select('*').eq('active',true).order('sort_order')],['features',()=>db.from('store_features').select('*').eq('id',1)]];
 const results=await Promise.all(jobs.map(async ([key,fn])=>{try{const result=await fn();if(result.error)throw result.error;return [key,result.data||[]]}catch(e){console.error('Store query failed',key,e.message);return [key,[],e.message]}}));
 const data=Object.fromEntries(results.map(([k,v])=>[k,v]));
 const options=data.options||[];
 const products=(data.products||[]).map(x=>{const pp=enrichPrice(x);pp.images=Array.isArray(pp.images)?pp.images:(pp.image_url?[pp.image_url]:[]);pp.options=options.filter(o=>String(o.product_id)===String(pp.id)).map(o=>{const oo=enrichPrice(o);oo.image_url=oo.image_url||pp.image_url||pp.images[0]||'';return oo});return pp});
 const errors=results.filter(x=>x[2]).map(x=>x[0]);
 if(errors.includes('products')||errors.includes('categories'))return json(res,503,{error:'Store data unavailable',failed:errors});
 res.setHeader('Cache-Control','no-store');return json(res,200,{categories:data.categories,products,settings:data.settings,payments:data.payments,banners:data.banners,features:data.features?.[0]||{}});
}catch(e){return json(res,500,{error:e.message})}};
