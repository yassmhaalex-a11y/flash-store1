const {json,env,supabase,readBody}=require('../lib/_lib');
async function configuredAdminEmail(){ try{ const q=await supabase().from('store_settings').select('admin_email').eq('id',1); return q.data?.[0]?.admin_email||env('ADMIN_EMAIL')||''; }catch(_){ return env('ADMIN_EMAIL')||''; } }
const {sendStoreEmail}=require('../lib/email');
function publicOrigin(req){const configured=env('PUBLIC_SITE_URL');if(configured){try{const u=new URL(configured);if(u.protocol==='https:')return u.origin}catch(_){}}const host=String(req.headers.host||'');if(!/^[a-z0-9.-]+(?::[0-9]+)?$/i.test(host)||/^(localhost|127\.0\.0\.1)(:|$)/i.test(host))throw Error('Set PUBLIC_SITE_URL to your live HTTPS store URL');return 'https://'+host}

function cookieToken(req){
  const c=req.headers.cookie||'';
  const m=c.match(/(?:^|;\s*)flash_token=([^;]+)/);
  return m&&decodeURIComponent(m[1]);
}

function setSession(res,session){
  const tokens=typeof session==='string'?{access_token:session}:session;
  const cookies=[`flash_token=${encodeURIComponent(tokens.access_token)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=604800`];
  if(tokens.refresh_token)cookies.push(`flash_refresh=${encodeURIComponent(tokens.refresh_token)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=2592000`);
  res.setHeader('Set-Cookie',cookies);
}
async function resolveSession(req,res,root){
  const token=cookieToken(req);
  if(token){try{const user=await authUser(root,token);if(user)return user}catch(_){}}
  const refresh=(req.headers.cookie||'').match(/(?:^|;\s*)flash_refresh=([^;]+)/);
  if(!refresh)return null;
  const r=await fetch(root+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:env('SUPABASE_ANON_KEY'),'Content-Type':'application/json'},body:JSON.stringify({refresh_token:decodeURIComponent(refresh[1])})});
  if(!r.ok){
    if(r.status===400||r.status===401)res.setHeader('Set-Cookie',['flash_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax; Secure','flash_refresh=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax; Secure']);
    return null;
  }
  const session=await r.json();
  if(!session.access_token||!session.refresh_token)return null;
  setSession(res,session);
  return session.user||await authUser(root,session.access_token);
}

async function authUser(root,token){
  const r=await fetch(root+'/auth/v1/user',{headers:{apikey:env('SUPABASE_ANON_KEY'),Authorization:'Bearer '+token}});
  return r.ok?await r.json():null;
}

module.exports=async(req,res)=>{
  try{
    const root=env('SUPABASE_URL').replace(/\/rest\/v1\/?$/,'');

    // Consolidated /api/me endpoint to stay within Vercel Hobby's 12-function limit.
    if(req.method==='GET' && (req.query?.mode==='me' || new URL(req.url,'https://localhost').searchParams.get('mode')==='me')){
      const user=await resolveSession(req,res,root);
      if(!user)return json(res,401,{error:'Session expired'});
      const q=await supabase().from('profiles').select('*').eq('id',user.id);
      if(q.error)throw q.error;
      const profile=q.data?.[0];
      return json(res,200,{id:user.id,email:user.email,role:profile?.role||'client',full_name:profile?.full_name||user.user_metadata?.full_name||''});
    }

    if(req.method==='DELETE'){
      const token=cookieToken(req);
      let user=null;
      if(token){
        try{ user=await authUser(root,token); }catch(_){ user=null; }
      }
      try{
        const adminEmail=await configuredAdminEmail();
        if(adminEmail && user?.email){
          await sendStoreEmail({
            action:'auth_event',
            admin_email:adminEmail,
            event:'signed_out',
            email:user.email,
            full_name:user.user_metadata?.full_name||''
          });
        }
      }catch(e){ console.error('Signout email error:',e.message); }
      res.setHeader('Set-Cookie',['flash_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax; Secure','flash_refresh=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax; Secure']);
      return json(res,200,{ok:true});
    }
    if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});

    const body=await readBody(req);
    const email=String(body.email||'').trim().toLowerCase();

    if(body.mode==='forgot'){
      if(!email)return json(res,400,{error:'Enter your email first.'});
      // Supabase Auth reads redirect_to from the recovery endpoint query string,
      // not from the JSON request body.
      const redirectUrl=`${publicOrigin(req)}/reset-password.html`;
      const recoverUrl=`${root}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectUrl)}`;
      const r=await fetch(recoverUrl,{
        method:'POST',headers:{apikey:env('SUPABASE_ANON_KEY'),'Content-Type':'application/json'},
        body:JSON.stringify({email})
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

      // Public signup through Supabase Auth: never auto-confirm an email.
      // Email confirmation and its template are managed by Supabase Auth.
      const signup=await fetch(root+'/auth/v1/signup',{
        method:'POST',headers:{apikey:env('SUPABASE_ANON_KEY'),'Content-Type':'application/json'},
        body:JSON.stringify({email,password,data:{full_name:fullName},email_redirect_to:`${publicOrigin(req)}/account.html`})
      });
      const created=await signup.json().catch(()=>({}));
      if(!signup.ok)return json(res,signup.status,{error:created.msg||created.error_description||created.message||'Signup failed.'});
      // Do not issue a session until the user has verified the email.
      return json(res,200,{message:'Account created. Check your inbox and verify your email, then sign in.',verification_required:true});
    }

    if(body.mode==='reset'){
      const accessToken=String(body.access_token||'').trim();
      const password=String(body.password||'');
      if(!accessToken||password.length<6)return json(res,400,{error:'Please enter a password with at least 6 characters.'});
      const r=await fetch(root+'/auth/v1/user',{method:'PUT',headers:{apikey:env('SUPABASE_ANON_KEY'),Authorization:`Bearer ${accessToken}`,'Content-Type':'application/json'},body:JSON.stringify({password})});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)return json(res,r.status,{error:d.msg||d.error_description||d.message||'Could not update password.'});
      // Recovery tokens are not refreshable sessions. Require a normal sign-in.
      res.setHeader('Set-Cookie',['flash_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax; Secure','flash_refresh=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax; Secure']);
      return json(res,200,{message:'Password updated successfully. Please sign in.',redirect:'/account.html'});
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
      try{
        const adminEmail=await configuredAdminEmail();
        if(adminEmail){
          await sendStoreEmail({
            action:'auth_event',
            admin_email:adminEmail,
            event:'signed_in',
            email,
            full_name:d.user?.user_metadata?.full_name||''
          });
        }
      }catch(e){ console.error('Signin email error:',e.message); }
      setSession(res,d);
      return json(res,200,{message:'Signed in.',redirect:'/'});
    }

    return json(res,400,{error:'Unknown auth action'});
  }catch(e){
    return json(res,500,{error:e.message||'Authentication error'});
  }
};
