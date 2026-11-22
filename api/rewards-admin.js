const {json,env,supabase,getCookie,verifyAdminToken,readBody}=require('../lib/_lib');
async function allowed(req,db){
 if(verifyAdminToken(getCookie(req,'flash_admin')))return true;
 const m=(req.headers.cookie||'').match(/(?:^|;\s*)flash_token=([^;]+)/);if(!m)return false;
 const root=env('SUPABASE_URL').replace(/\/rest\/v1\/?$/,'');
 const r=await fetch(root+'/auth/v1/user',{headers:{apikey:env('SUPABASE_ANON_KEY'),Authorization:'Bearer '+decodeURIComponent(m[1])}});
 if(!r.ok)return false;const user=await r.json();const q=await db.from('profiles').select('role').eq('id',user.id);return q.data?.[0]?.role==='admin';
}
module.exports=async(req,res)=>{try{
 const db=supabase();if(!await allowed(req,db))return json(res,403,{error:'Admin only'});
 if(req.method==='GET'){
  const [s,r,p]=await Promise.all([db.from('flash_points_settings').select('*'),db.from('flash_points_rules').select('*'),db.from('products').select('id,name,price')]);
  if(s.error||r.error||p.error)throw s.error||r.error||p.error;
  return json(res,200,{settings:s.data?.[0]||{},rules:r.data||[],products:p.data||[]});
 }
 if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
 const b=await readBody(req);
 if(b.type==='settings'){
  const min=Number(b.min_product_price),cap=Number(b.max_discount_per_unit);
  if(!Number.isFinite(min)||!Number.isFinite(cap)||min<0||cap<0||cap>10000)return json(res,400,{error:'Invalid limits'});
  const q=await db.from('flash_points_settings').update({enabled:!!b.enabled,min_product_price:min,max_discount_per_unit:cap,updated_at:new Date().toISOString()},{id:'eq.1'});if(q.error)throw q.error;
 }else if(b.type==='product'){
  const multiplier=Number(b.multiplier);
  if(!b.product_id||![0,0.5,1].includes(multiplier))return json(res,400,{error:'Invalid product rule'});
  const exists=await db.from('flash_points_rules').select('product_id').eq('product_id',b.product_id);if(exists.error)throw exists.error;
  const row={multiplier,redeem_enabled:!!b.redeem_enabled,updated_at:new Date().toISOString()};
  const q=exists.data?.length?await db.from('flash_points_rules').update(row,{product_id:'eq.'+b.product_id}):await db.from('flash_points_rules').insert({product_id:b.product_id,...row});if(q.error)throw q.error;
 }else return json(res,400,{error:'Invalid action'});
 return json(res,200,{ok:true});
 }catch(e){return json(res,500,{error:e.message})}};
