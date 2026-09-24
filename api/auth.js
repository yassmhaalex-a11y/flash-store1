const {json,env,supabase,readBody}=require('./_lib');
const {sendEmail}=require('./email');

function cookieToken(req){
  const c=req.headers.cookie||'';
  const m=c.match(/(?:^|;\s*)flash_token=([^;]+)/);
  return m&&decodeURIComponent(m[1]);
}

function setSession(res,accessToken){
  res.setHeader('Set-Cookie',`flash_token=${encodeURIComponent(accessToken)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=604800`);
}

async function authUser(root,token){
  const r=await fetch(root+'/auth/v1/user',{headers:{apikey:env('SUPABASE_ANON_KEY'),Authorization:'Bearer '+token}});
  return r.ok?await r.json():null;
}

module.exports=async(req,res)=>{
  try{
    const root=env('SUPABASE_URL').replace(/\/rest\/v1\/?$/,'');

    if(req.method==='DELETE'){
      res.setHeader('Set-Cookie','flash_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax; Secure');
      return json(res,200,{ok:true});
    }
    if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});

    const body=await readBody(req);
    const email=String(body.email||'').trim().toLowerCase();

    if(body.mode==='forgot'){
      if(!email)return json(res,400,{error:'Enter your email first.'});
      const r=await fetch(root+'/auth/v1/recover',{
        method:'POST',headers:{apikey:env('SUPABASE_ANON_KEY'),'Content-Type':'application/json'},
        body:JSON.stringify({email,redirect_to:`${(req.headers['x-forwarded-proto']||'https')}://${req.headers.host}/reset-password.html`})
      });
      const d=await r.json().catch(()=>({}));
      if(!r.ok)return json(res,r.status,{error:d.msg||d.error_description||'Could not send reset email.'});
      return json(res,200,{message:'Password reset email sent. Check your inbox.'});
    }

    if(body.mode==='signup'){
      const password=String(body.password||'');
      const fullName=String(body.full_name||'').trim();
      if(!email||!password||!fullName)return json(res,400,{error:'Please complete all required fields.'});
      if(password.length<6)return json(res,400,{error:'Password must be at least 6 characters.'});

      // Check our profile table first so the same email can never be registered twice.
      const existing=await supabase().from('profiles').select('id,email').eq('email',email);
      if(existing.error)throw existing.error;
      if((existing.data||[]).length){
        return json(res,409,{error:'This email is already registered. Please Sign In or use Forgot password.'});
      }

      // Create the user server-side and confirm the email immediately.
      // This keeps the store's intended flow: Create Account -> already signed in.
      const serviceKey=env('SUPABASE_SERVICE_ROLE_KEY');
      if(!serviceKey)return json(res,500,{error:'SUPABASE_SERVICE_ROLE_KEY is missing in Vercel Environment Variables.'});
      const create=await fetch(root+'/auth/v1/admin/users',{
        method:'POST',
        headers:{apikey:serviceKey,Authorization:'Bearer '+serviceKey,'Content-Type':'application/json'},
        body:JSON.stringify({email,password,email_confirm:true,user_metadata:{full_name:fullName}})
      });
      const created=await create.json().catch(()=>({}));
      if(!create.ok){
        const duplicate=/already|registered|exists|unique/i.test(JSON.stringify(created));
        return json(res,duplicate?409:create.status,{error:duplicate?'This email is already registered. Please Sign In or use Forgot password.':(created.msg||created.message||created.error_description||'Signup failed.')});
      }

      // The trigger creates the client profile. Wait briefly for it before returning.
      try{
        await supabase().from('notifications').insert({type:'signup',title:'New customer account',message:`${fullName||email} created a new account.`,related_id:created.id||created.user?.id||''});
      }catch(_){ }
      try{
        const adminEmail=env('ADMIN_EMAIL');
        if(adminEmail){
          await sendEmail({
            to:adminEmail,
            subject:'FLASH STORE — New customer account',
            html:`<div style="font-family:Arial,sans-serif;max-width:620px;margin:30px auto;padding:24px;border:1px solid #ddd;border-radius:14px"><h2>FLASH STORE</h2><p>A new customer account was created.</p><p><b>Name:</b> ${String(fullName).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}</p><p><b>Email:</b> ${String(email).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}</p></div>`,
            text:`FLASH STORE\nNew customer account\nName: ${fullName}\nEmail: ${email}`
          });
        }
      }catch(e){console.error('Signup email error:',e.message)}

      // Sign in through the normal token endpoint so the browser gets the same session cookie as existing users.
      const login=await fetch(root+'/auth/v1/token?grant_type=password',{
        method:'POST',headers:{apikey:env('SUPABASE_ANON_KEY'),'Content-Type':'application/json'},
        body:JSON.stringify({email,password})
      });
      const logged=await login.json().catch(()=>({}));
      if(!login.ok)return json(res,login.status,{error:logged.error_description||'Account was created, but automatic sign in failed. Please sign in once.'});
      setSession(res,logged.access_token);
      return json(res,200,{message:'Account created and signed in.',redirect:'/account.html'});
    }

    if(body.mode==='reset'){
      const accessToken=String(body.access_token||'').trim();
      const password=String(body.password||'');
      if(!accessToken||password.length<6)return json(res,400,{error:'Please enter a password with at least 6 characters.'});
      const r=await fetch(root+'/auth/v1/user',{method:'PUT',headers:{apikey:env('SUPABASE_ANON_KEY'),Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json'},body:JSON.stringify({password})});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)return json(res,r.status,{error:d.msg||d.error_description||d.message||'Could not update password.'});
      setSession(res,accessToken);
      return json(res,200,{message:'Password updated successfully.',redirect:'/account.html'});
    }

    if(body.mode==='signin'){
      if(!email||!body.password)return json(res,400,{error:'Enter your email and password.'});
      const r=await fetch(root+'/auth/v1/token?grant_type=password',{
        method:'POST',headers:{apikey:env('SUPABASE_ANON_KEY'),'Content-Type':'application/json'},
        body:JSON.stringify({email,password:String(body.password)})
      });
      const d=await r.json().catch(()=>({}));
      if(!r.ok){
        const raw=String(d.error_description||d.msg||d.message||'');
        const notConfirmed=/not confirmed|email.*confirm/i.test(raw);
        return json(res,r.status,{error:notConfirmed?'Please verify your email before signing in.':raw||'Email or password is incorrect. Use Forgot password or Create new account.'});
      }
      setSession(res,d.access_token);
      return json(res,200,{message:'Signed in.',redirect:'/'});
    }

    return json(res,400,{error:'Unknown auth action'});
  }catch(e){
    return json(res,500,{error:e.message||'Authentication error'});
  }
};
