const {json,env,supabase,readBody}=require('../lib/_lib');
const {effectivePrice}=require('../lib/_pricing');
async function currentUser(req){const m=(req.headers.cookie||'').match(/(?:^|;\s*)flash_token=([^;]+)/);if(!m)return null;const root=env('SUPABASE_URL').replace(/\/rest\/v1\/?$/,'');const r=await fetch(root+'/auth/v1/user',{headers:{apikey:env('SUPABASE_ANON_KEY'),Authorization:'Bearer '+decodeURIComponent(m[1])}});return r.ok?r.json():null;}
module.exports=async(req,res)=>{try{
 if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
 const user=await currentUser(req);if(!user)return json(res,401,{error:'Sign in first'});
 const b=await readBody(req),db=supabase();
 const [settings,rules,products,options,ledger]=await Promise.all([
 db.from('flash_points_settings').select('*'),db.from('flash_points_rules').select('*'),db.from('products').select('*'),db.from('product_options').select('*'),db.from('flash_points_ledger').select('points').eq('user_id',user.id)]);
 const err=[settings,rules,products,options,ledger].find(x=>x.error);if(err)throw err.error;
 const s=settings.data?.[0]||{},r=new Map((rules.data||[]).map(x=>[String(x.product_id),x]));
 const p=new Map((products.data||[]).map(x=>[String(x.id),x]));const o=new Map((options.data||[]).map(x=>[String(x.id),x]));
 let eligibleCap=0;for(const i of (Array.isArray(b.items)?b.items:[])){
  const product=p.get(String(i.product_id));if(!product||product.active===false)continue;
  const option=i.option_id?o.get(String(i.option_id)):null;
  if(i.option_id&&(!option||String(option.product_id)!==String(product.id)))continue;
  const source=option||product;if(source.active===false)continue;
  const price=Number(effectivePrice(source)||0),qty=Math.min(100,Math.max(1,Math.floor(Number(i.quantity)||1)));
  if(price>=Number(s.min_product_price||0)&&r.get(String(product.id))?.redeem_enabled!==false)
   eligibleCap+=Math.min(price*qty,Number(s.max_discount_per_unit||0)*qty);
 }
 const balance=Math.max(0,(ledger.data||[]).reduce((a,x)=>a+Number(x.points||0),0));
 const maxPoints=s.enabled?Math.max(0,Math.floor(Math.min(balance,eligibleCap*4)/20)*20):0;
 return json(res,200,{enabled:!!s.enabled,balance,max_points:maxPoints,max_discount:maxPoints/4,eligible_cap:eligibleCap});
 }catch(e){return json(res,500,{error:'Rewards unavailable: '+e.message})}};
