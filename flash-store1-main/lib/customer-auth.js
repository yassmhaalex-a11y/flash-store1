const {env}=require('./_lib');
module.exports=async function customer(req){
 const m=String(req.headers.cookie||'').match(/(?:^|;\s*)flash_token=([^;]+)/);
 if(!m)return null;
 const root=env('SUPABASE_URL').replace(/\/rest\/v1\/?$/,'');
 const r=await fetch(root+'/auth/v1/user',{headers:{apikey:env('SUPABASE_ANON_KEY'),Authorization:'Bearer '+decodeURIComponent(m[1])}});
 return r.ok?await r.json():null;
};
