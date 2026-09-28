const {env}=require("./_lib");

async function sendStoreEmail(payload){
  const root=env("SUPABASE_URL").replace(/\/rest\/v1\/?$/,"");
  if(!root)return false;
  try{
    const r=await fetch(root+"/functions/v1/order-emails",{
      method:"POST",
      headers:{"Content-Type":"application/json","apikey":env("SUPABASE_ANON_KEY")},
      body:JSON.stringify(payload)
    });
    if(!r.ok){console.error("order-emails:",await r.text());return false}
    return true;
  }catch(e){console.error("order-emails:",e.message);return false}
}
module.exports={sendStoreEmail};
