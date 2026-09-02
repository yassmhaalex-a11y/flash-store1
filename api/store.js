const {json, supabase} = require("./_lib");
module.exports = async (req,res)=>{
  try{
    const db=supabase();
    const [c,p,s,pay]=await Promise.all([
      db.from("categories").select("*").eq("active",true).order("sort_order"),
      db.from("products").select("*").eq("active",true).order("created_at",{ascending:false}),
      db.from("store_settings").select("*").eq("id",1),
      db.from("payment_methods").select("*").eq("active",true).order("sort_order")
    ]);
    for(const x of [c,p,s,pay]) if(x.error) throw x.error;
    json(res,200,{categories:c.data||[],products:p.data||[],settings:s.data||[],payments:pay.data||[]});
  }catch(e){json(res,500,{error:e.message})}
};