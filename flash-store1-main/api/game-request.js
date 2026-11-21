const {json,supabase,readBody}=require('../lib/_lib');
const customer=require('../lib/customer-auth');
module.exports=async(req,res)=>{try{
 if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
 const user=await customer(req);if(!user)return json(res,401,{error:'Please sign in before requesting a game.'});
 const b=await readBody(req);
 const game=String(b.game||'').trim(),edition=String(b.edition||'standard').trim(),account=String(b.account_type||'home').trim(),notes=String(b.notes||'').trim();
 if(!game||game.length>150||notes.length>800||!['standard','deluxe','ultimate','other'].includes(edition)||!['home','sign','full','personal'].includes(account))return json(res,400,{error:'Check your game request details.'});
 const name=String(user.user_metadata?.full_name||user.email||'Customer').slice(0,100);
 const contact=String(user.email||'').slice(0,120);
 const details=`Edition: ${edition}; Account type: ${account}${notes?'\nNotes: '+notes:''}`;
 const db=supabase();const q=await db.from('game_requests').insert({name,contact,game,details},{returning:'representation'});
 if(q.error)throw q.error;
 try{await db.from('flash_customer_email_queue').insert({event_type:'game_request',recipient:contact,customer_name:name,payload:{game,edition,account_type:account,request_id:q.data?.[0]?.id||null}})}catch(e){console.error('Game request email queue:',e.message)}
 await db.from('notifications').insert({title:'New game request',message:game+' requested by '+name,read:false}).catch(()=>{});
 return json(res,200,{ok:true,request_id:q.data?.[0]?.id||null,status:'Pending Review'});
}catch(e){return json(res,500,{error:'Unable to submit request. Please try again.'})}};
