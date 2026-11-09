// Payment proofs are stored separately from public product images.
const {env}=require('./_lib');
const BUCKET='flash-payment-proofs';
function root(){return env('SUPABASE_URL').replace(/\/rest\/v1\/?$/,'').replace(/\/$/,'')}
function objectPath(value){
  if(typeof value!=='string')return null;
  const prefix=root()+'/storage/v1/object/'+BUCKET+'/';
  if(!value.startsWith(prefix))return null;
  const path=value.slice(prefix.length);
  return /^proof\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(png|jpg|webp|gif)$/i.test(path)?path:null;
}
async function ensurePrivateBucket(){
 const base=root(),key=env('SUPABASE_SERVICE_ROLE_KEY');
 const headers={apikey:key,Authorization:'Bearer '+key};
 const existing=await fetch(base+'/storage/v1/bucket/'+BUCKET,{headers});
 if(existing.ok){const info=await existing.json();if(info.public)throw Error('Payment proof bucket must be private');return;}
 if(existing.status!==404)throw Error('Could not verify payment proof storage');
 const created=await fetch(base+'/storage/v1/bucket',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({id:BUCKET,name:BUCKET,public:false})});
 if(!created.ok)throw Error('Could not create private payment proof bucket');
}
function legacyPublicProofUrl(value){
 if(typeof value!=='string')return null;
 try{
  const base=new URL(root());const url=new URL(value);
  if(url.origin!==base.origin||url.username||url.password||url.hash)return null;
  if(!url.pathname.startsWith('/storage/v1/object/public/'))return null;
  if(url.pathname.includes('..')||url.pathname.includes('\\'))return null;
  return url.toString();
 }catch(_){return null}
}
async function proofObjectExists(value){
 const path=objectPath(value);
 if(!path)return false;
 const base=root(),key=env('SUPABASE_SERVICE_ROLE_KEY');
 // The Storage object-info endpoint checks the actual object, not merely a
 // client-supplied identifier and signed upload receipt.
 const response=await fetch(base+'/storage/v1/object/info/'+BUCKET+'/'+path,{
  method:'GET',headers:{apikey:key,Authorization:'Bearer '+key}
 });
 if(response.status===404)return false;
 if(!response.ok)throw Error('Could not verify payment proof upload');
 const info=await response.json();
 return !!info && (typeof info==='object') && !!(info.name||info.id);
}
async function signedProofUrl(value){
 const path=objectPath(value);if(!path)return legacyPublicProofUrl(value); // Only known public storage URLs are eligible for legacy display.
 const base=root(),key=env('SUPABASE_SERVICE_ROLE_KEY');
 const response=await fetch(base+'/storage/v1/object/sign/'+BUCKET+'/'+path,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:300})});
 if(!response.ok)throw Error('Could not create secure payment proof link');
 const data=await response.json();
 const signed=data.signedURL||data.signedUrl;
 if(!signed||typeof signed!=='string')throw Error('Missing signed proof URL');
 // Supabase should return a same-origin signed Storage URL. Never forward an
 // unexpected external URL to customers, even if the upstream response changes.
 const resolved=new URL(signed,base);
 const expected=new URL(base);
 if(resolved.origin!==expected.origin||resolved.username||resolved.password||resolved.protocol!=="https:" && expected.protocol==="https:")throw Error('Invalid signed proof URL');
 if(!resolved.pathname.startsWith('/storage/v1/object/sign/'+BUCKET+'/'))throw Error('Unexpected signed proof path');
 return resolved.toString();
}
// Never expose a private object identifier or an unusable link if signing fails.
// One unavailable proof must not make an entire orders listing fail.
async function safeSignedProofUrl(value){
 if(!value)return null;
 if(!objectPath(value))return legacyPublicProofUrl(value); // Reject arbitrary or malformed legacy URLs.
 try{return await signedProofUrl(value)}catch(_){return null}
}
module.exports={BUCKET,objectPath,legacyPublicProofUrl,ensurePrivateBucket,proofObjectExists,signedProofUrl,safeSignedProofUrl};
