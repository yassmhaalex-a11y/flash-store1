const {json,env,makeAdminToken}=require("./_lib");
module.exports=async(req,res)=>{
  if(req.method!=="POST") return json(res,405,{error:"Method not allowed"});
  try{
    const b=req.body||{};
    const password=String(b.password||"");
    const expectedPass=env("ADMIN_PASSWORD")||"2013";
    if(password!==expectedPass)return json(res,401,{error:"Invalid admin password"});
    const token=makeAdminToken("admin");
    res.setHeader("Set-Cookie",`flash_admin=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=28800`);
    return json(res,200,{ok:true});
  }catch(e){return json(res,500,{error:e.message})}
};