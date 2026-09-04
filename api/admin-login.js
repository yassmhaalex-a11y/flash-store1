const {json,env,makeAdminToken}=require("./_lib");
module.exports=async(req,res)=>{
  if(req.method!=="POST") return json(res,405,{error:"Method not allowed"});
  try{
    const b=req.body||{};
    const username=String(b.username||"").trim();
    const password=String(b.password||"");
    const expectedUser=env("ADMIN_USERNAME")||"admin";
    const expectedPass=env("ADMIN_PASSWORD")||"2013";
    if(username!==expectedUser||password!==expectedPass)return json(res,401,{error:"Invalid admin username or password"});
    const token=makeAdminToken(username);
    res.setHeader("Set-Cookie",`flash_admin=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=28800`);
    return json(res,200,{ok:true});
  }catch(e){return json(res,500,{error:e.message})}
};