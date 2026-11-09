module.exports.config={api:{bodyParser:false}};
const {json,env}=require("../lib/_lib");
const {issue}=require("../lib/proof-receipt");
const {randomUUID}=require("crypto");
const {BUCKET,ensurePrivateBucket}=require("../lib/private-proof");
function token(req){const c=req.headers.cookie||"";const m=c.match(/(?:^|;\s*)flash_token=([^;]+)/);return m&&decodeURIComponent(m[1])}
async function signedIn(req){const t=token(req);if(!t)return false;const root=env("SUPABASE_URL").replace(/\/rest\/v1\/?$/,'');const r=await fetch(root+"/auth/v1/user",{headers:{apikey:env("SUPABASE_ANON_KEY"),Authorization:"Bearer "+t}});return r.ok?await r.json():null}
function parseMultipart(req){return new Promise((resolve,reject)=>{const ct=req.headers["content-type"]||"";const m=ct.match(/boundary=(?:"([^"]+)"|([^;]+))/i);if(!m)return reject(Error("Expected multipart/form-data"));const boundary=Buffer.from("--"+(m[1]||m[2]));const chunks=[];let total=0;let aborted=false;req.on("data",c=>{if(aborted)return;total+=c.length;if(total>5*1024*1024){aborted=true;reject(Error("Upload too large"));req.destroy();return;}chunks.push(c)});req.on("end",()=>{if(aborted)return;try{const buf=Buffer.concat(chunks);let start=0,file=null;while((start=buf.indexOf(boundary,start))!==-1){const next=buf.indexOf(boundary,start+boundary.length);if(next===-1)break;let part=buf.slice(start+boundary.length);if(part.slice(0,2).equals(Buffer.from("\r\n")))part=part.slice(2);if(part.slice(-2).equals(Buffer.from("\r\n")))part=part.slice(0,-2);start=next;const sep=part.indexOf(Buffer.from("\r\n\r\n"));if(sep<0)continue;const head=part.slice(0,sep).toString();const data=part.slice(sep+4);const nm=head.match(/name="([^"]+)"/i);const fn=head.match(/filename="([^"]*)"/i);if(nm?.[1]==="proof"&&fn){file={filename:fn[1]||"proof.jpg",contentType:(head.match(/Content-Type:\s*([^\r\n]+)/i)||[])[1]||"application/octet-stream",data};break;}}resolve(file)}catch(e){reject(e)}});req.on("error",reject)})}
module.exports=async(req,res)=>{
 if(req.method!=="POST")return json(res,405,{error:"Method not allowed"});
 try{
  const user=await signedIn(req);if(!user?.id)return json(res,401,{error:"You must sign in first."});
  const file=await parseMultipart(req);if(!file?.data?.length)return json(res,400,{error:"Choose the payment proof image first."});
  if(!/^image\/(png|jpe?g|webp|gif)$/i.test(file.contentType))return json(res,400,{error:"Only image files are allowed."});
  if(file.data.length>4*1024*1024)return json(res,400,{error:"Image must be 4MB or smaller."});
  const root=env("SUPABASE_URL").replace(/\/rest\/v1\/?$/,'');const key=env("SUPABASE_SERVICE_ROLE_KEY");if(!key)throw Error("SUPABASE_SERVICE_ROLE_KEY is missing.");
  await ensurePrivateBucket();
  // Choose the extension from the allowed declared MIME type; do not trust the filename.
  const ext=({"image/png":"png","image/jpeg":"jpg","image/jpg":"jpg","image/webp":"webp","image/gif":"gif"})[file.contentType.toLowerCase()];const path=`proof/${user.id}/${randomUUID()}.${ext}`;
  const up=await fetch(root+"/storage/v1/object/"+BUCKET+"/"+path,{method:"POST",headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":file.contentType},body:file.data});if(!up.ok){
    const detail=await up.text();
    console.error('[upload-proof] Supabase Storage upload rejected', {status:up.status,detail:detail.slice(0,1000)});
    const error=Error('Storage upload rejected');error.publicCode='STORAGE_UPLOAD_REJECTED';error.upstreamStatus=up.status;throw error;
  }
  const url=root+"/storage/v1/object/"+BUCKET+"/"+path;
  return json(res,200,{url,proof_receipt:issue(user.id,url)});
 }catch(e){
    const code=e.publicCode||(/SUPABASE_SERVICE_ROLE_KEY is missing/.test(e.message)?'STORAGE_KEY_MISSING':/bucket/i.test(e.message)?'STORAGE_BUCKET_ERROR':/fetch failed/i.test(e.message)?'STORAGE_CONNECTION_ERROR':'STORAGE_SERVER_ERROR');
    console.error('[upload-proof] Failed', {code,message:e.message,upstreamStatus:e.upstreamStatus||null});
    return json(res,e.message==='Upload too large'?413:500,{error:e.message==='Upload too large'?'Image must be 4MB or smaller.':'Payment proof upload failed.',code});
  }
};
