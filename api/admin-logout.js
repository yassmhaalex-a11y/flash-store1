const {json}=require("./_lib");
module.exports=async(req,res)=>{
  if(req.method!=="POST") return json(res,405,{error:"Method not allowed"});
  res.setHeader("Set-Cookie","flash_admin=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0");
  return json(res,200,{ok:true});
};