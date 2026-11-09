const {json,supabase,readBody,env}=require('../lib/_lib');
const {calculateDiscount,trustedItems}=require('../lib/discount-rules');
async function userId(req){try{const token=(req.headers.cookie||'').match(/(?:^|;\s*)flash_token=([^;]+)/)?.[1];if(!token)return null;const root=env('SUPABASE_URL').replace(/\/rest\/v1\/?$/,'');const r=await fetch(root+'/auth/v1/user',{headers:{apikey:env('SUPABASE_ANON_KEY'),Authorization:'Bearer '+decodeURIComponent(token)}});return r.ok?(await r.json()).id:null}catch{return null}}
module.exports=async(req,res)=>{try{
 if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
 const b=await readBody(req);
 if(typeof b.code!=='string'||b.code.length>100||!b.code.trim())return json(res,400,{error:'Invalid discount code'});
 const db=supabase(),validated=await trustedItems(db,b.items);
 if(validated.error)return json(res,400,{error:validated.error});
 const result=await calculateDiscount(db,b.code,validated.items,await userId(req));
 return json(res,result.status||200,result.status?{error:result.error}:result);
}catch(e){return json(res,500,{error:'Unable to validate discount'})}};
