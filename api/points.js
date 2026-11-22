const {json,env,supabase}=require('../lib/_lib');
async function currentUser(req){
 const m=(req.headers.cookie||'').match(/(?:^|;\s*)flash_token=([^;]+)/);
 if(!m)return null;
 const root=env('SUPABASE_URL').replace(/\/rest\/v1\/?$/,'');
 const r=await fetch(root+'/auth/v1/user',{headers:{apikey:env('SUPABASE_ANON_KEY'),Authorization:'Bearer '+decodeURIComponent(m[1])}});
 return r.ok?await r.json():null;
}
module.exports=async(req,res)=>{
 try{
  if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});
  const user=await currentUser(req);
  if(!user)return json(res,401,{error:'Sign in to see your FLASH POINTS.'});
  const q=await supabase().from('flash_points_ledger').select('points,event_type,created_at,order_id').eq('user_id',user.id).order('created_at',{ascending:false});
  if(q.error)throw q.error;
  const history=q.data||[];
  return json(res,200,{points:history.reduce((n,x)=>n+Number(x.points||0),0),history,redemption_enabled:true});
 }catch(e){return json(res,500,{error:'Could not load FLASH POINTS. Check the V61 migration.'})}
};
