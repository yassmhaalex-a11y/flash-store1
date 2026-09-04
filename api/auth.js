const {json,env,supabase}=require("./_lib");
async function authUser(token){if(!token)return null;const r=await fetch(env("SUPABASE_URL").replace(/\/rest\/v1\/?$/,"")+"/auth/v1/user",{headers:{"apikey":env("SUPABASE_ANON_KEY"),"Authorization":"Bearer "+token}});return r.ok?await r.json():null}
module.exports=async(req,res)=>{
 try{
  if(req.method==="DELETE"){res.setHeader("Set-Cookie","flash_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax");return json(res,200,{ok:true})}
  const body=req.body||{}; if(req.method==="POST"){
   const root=env("SUPABASE_URL").replace(/\/rest\/v1\/?$/,"");
   if(body.mode==="signup"){
    const r=await fetch(root+"/auth/v1/signup",{method:"POST",headers:{"apikey":env("SUPABASE_ANON_KEY"),"Content-Type":"application/json"},body:JSON.stringify({email:body.email,password:body.password,data:{full_name:body.full_name||""}})});
    const d=await r.json(); if(!r.ok)return json(res,r.status,{error:d.msg||d.error_description||"Signup failed"}); return json(res,200,{message:"Account created. Check your email if confirmation is enabled.",redirect:"/account.html"});
   }
   const r=await fetch(root+"/auth/v1/token?grant_type=password",{method:"POST",headers:{"apikey":env("SUPABASE_ANON_KEY"),"Content-Type":"application/json"},body:JSON.stringify({email:body.email,password:body.password})});
   const d=await r.json(); if(!r.ok)return json(res,r.status,{error:d.error_description||"Sign in failed"});
   res.setHeader("Set-Cookie",`flash_token=${d.access_token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);
   return json(res,200,{message:"Signed in.",redirect:d.user?.email===env("ADMIN_EMAIL")?"/admin.html":"/"});
  }
  json(res,405,{error:"Method not allowed"});
 }catch(e){json(res,500,{error:e.message})}
};