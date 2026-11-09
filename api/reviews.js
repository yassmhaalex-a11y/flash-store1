const {json,supabase,readBody}=require('../lib/_lib');
module.exports=async(req,res)=>{try{const db=supabase();const f=await db.from('store_features').select('*').eq('id',1);if(f.error)throw f.error;const enabled=f.data?.[0]?.reviews_enabled!==false;
if(req.method==='GET'){const q=await db.from('store_reviews').select('id,display_name,rating,comment,created_at').eq('approved',true).order('created_at',{ascending:false}).limit(100);if(q.error)throw q.error;const rows=q.data||[];return json(res,200,{enabled,reviews:rows,average:rows.length?Math.round(rows.reduce((s,r)=>s+r.rating,0)/rows.length*10)/10:0,count:rows.length});}
if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});if(!enabled)return json(res,403,{error:'Reviews disabled'});
const b=await readBody(req);const name=String(b.name||'').trim(),comment=String(b.comment||'').trim(),rating=Number(b.rating);
if(name.length<2||name.length>80||comment.length<3||comment.length>1500||!Number.isInteger(rating)||rating<1||rating>10)return json(res,400,{error:'Check name, rating and comment'});
const q=await db.from('store_reviews').insert({display_name:name,comment,rating,approved:false});if(q.error)throw q.error;
await db.from('notifications').insert({title:'New review pending',message:name+' submitted a '+rating+'/10 review',read:false}).catch(()=>{});
return json(res,200,{ok:true,message:'Review submitted for approval'});
}catch(e){return json(res,500,{error:e.message})}};
