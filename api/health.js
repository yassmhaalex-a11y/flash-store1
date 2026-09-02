module.exports=async(req,res)=>{
 try{
  const db=require('./config');
  const {error}=await db.from('store_settings').select('id').eq('id',1).single();
  if(error) throw error;
  res.status(200).json({ok:true,message:'FLASH STORE API + Supabase connected'});
 }catch(e){res.status(500).json({ok:false,error:e.message})}
};
