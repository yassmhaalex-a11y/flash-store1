const {json,env,supabase}=require("./_lib");
function root(){return (env("NEXT_PUBLIC_SUPABASE_URL")||env("SUPABASE_URL")).replace(/\/rest\/v1\/?$/,"")}
async function ensureProfile(user){
  const db=supabase();
  const q=await db.from("profiles").select("*").eq("id",user.id);
  if(q.error) throw q.error;
  const isAdmin=String(user.email||"").toLowerCase()===String(env("ADMIN_EMAIL")||"").toLowerCase();
  if(!q.data?.length){
    const ins=await db.from("profiles").insert({id:user.id,email:user.email,full_name:user.user_metadata?.full_name||"",role:isAdmin?"admin":"client"});
    if(ins.error) throw ins.error;
  }else if(isAdmin && q.data[0].role!=="admin"){
    const up=await db.from("profiles").update({role:"admin"},{id:"eq."+user.id});
    if(up.error) throw up.error;
  }
}
module.exports=async(req,res)=>{
 try{
  if(req.method==="DELETE"){res.setHeader("Set-Cookie","flash_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax");return json(res,200,{ok:true})}
  const body=req.body||{};
  if(req.method!=="POST") return json(res,405,{error:"Method not allowed"});
  if(!body.email||!body.password) return json(res,400,{error:"Email and password are required"});
  const r=await fetch(root()+"/auth/v1/token?grant_type=password",{method:"POST",headers:{"apikey":env("NEXT_PUBLIC_SUPABASE_ANON_KEY")||env("SUPABASE_ANON_KEY"),"Content-Type":"application/json"},body:JSON.stringify({email:body.email,password:body.password})});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)return json(res,r.status,{error:d.error_description||d.msg||"Sign in failed"});
  const u=d.user;
  if(u) await ensureProfile(u);
  res.setHeader("Set-Cookie",`flash_token=${d.access_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);
  const isAdmin=String(u?.email||"").toLowerCase()===String(env("ADMIN_EMAIL")||"").toLowerCase();
  return json(res,200,{message:"Signed in.",redirect:isAdmin?"/admin.html":"/"});
 }catch(e){return json(res,500,{error:e.message})}
};
