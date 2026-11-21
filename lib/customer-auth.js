// Authenticate customer routes using the same refreshable HttpOnly cookie session as /api/auth.
const {env}=require('./_lib');
const getCookie=(req,name)=>{const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const m=String(req.headers.cookie||'').match(new RegExp('(?:^|;\\s*)'+escaped+'=([^;]+)'));try{return m?decodeURIComponent(m[1]):null}catch(_){return null}};
async function fetchUser(root,token){const r=await fetch(root+'/auth/v1/user',{headers:{apikey:env('SUPABASE_ANON_KEY'),Authorization:'Bearer '+token}});return r.ok?await r.json():null}
module.exports=async function customer(req,res){
 const root=env('SUPABASE_URL').replace(/\/rest\/v1\/?$/,'');
 const access=getCookie(req,'flash_token');
 if(access){try{const user=await fetchUser(root,access);if(user)return user}catch(_){}}
 const refresh=getCookie(req,'flash_refresh');if(!refresh)return null;
 try{
  const r=await fetch(root+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:env('SUPABASE_ANON_KEY'),'Content-Type':'application/json'},body:JSON.stringify({refresh_token:refresh})});
  if(!r.ok)return null;
  const session=await r.json();if(!session.access_token||!session.refresh_token)return null;
  if(res)res.setHeader('Set-Cookie',[
   'flash_token='+encodeURIComponent(session.access_token)+'; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=604800',
   'flash_refresh='+encodeURIComponent(session.refresh_token)+'; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=2592000'
  ]);
  return session.user||await fetchUser(root,session.access_token);
 }catch(_){return null}
};
