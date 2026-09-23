module.exports.config={api:{bodyParser:false}};
const {json,env}=require("./_lib");
function token(req){const c=req.headers.cookie||"";const m=c.match(/(?:^|;\s*)flash_token=([^;]+)/);return m&&decodeURIComponent(m[1])}
async function signedIn(req){const t=token(req);if(!t)return false;const root=env("SUPABASE_URL").replace(/\/rest\/v1\/?$/,'');const r=await fetch(root+"/auth/v1/user",{headers:{apikey:env("SUPABASE_ANON_KEY"),Authorization:"Bearer "+t}});return r.ok}
function parseMultipart(req){return new Promise((resolve,reject)=>{const ct=req.headers["content-type"]||"";const m=ct.match(/boundary=(?:"([^"]+)"|([^;]+))/i);if(!m)return reject(Error("Expected multipart/form-data"));const boundary=Buffer.from("--"+(m[1]||m[2]));const chunks=[];req.on("data",c=>chunks.push(c));req.on("end",()=>{try{const buf=Buffer.concat(chunks);let start=0,file=null;while((start=buf.indexOf(boundary,start))!==-1){const next=buf.indexOf(boundary,start+boundary.length);if(next===-1)break;let part=buf.slice(start+boundary.length);if(part.slice(0,2).equals(Buffer.from("\r\n")))part=part.slice(2);if(part.slice(-2).equals(Buffer.from("\r\n")))part=part.slice(0,-2);start=next;const sep=part.indexOf(Buffer.from("\r\n\r\n"));if(sep<0)continue;const head=part.slice(0,sep).toString();const data=part.slice(sep+4);const nm=head.match(/name="([^"]+)"/i);const fn=head.match(/filename="([^"]*)"/i);if(nm?.[1]==="proof"&&fn){file={filename:fn[1]||"proof.jpg",contentType:(head.match(/Content-Type:\s*([^\r\n]+)/i)||[])[1]||"application/octet-stream",data};break;}}resolve(file)}catch(e){reject(e)}});req.on("error",reject)})}
module.exports=async(req,res)=>{
 if(req.method!=="POST")return json(res,405,{error:"Method not allowed"});
 if(!await signedIn(req))return json(res,401,{error:"You must sign in first."});
 try{
  const file=await parseMultipart(req);if(!file?.data?.length)return json(res,400,{error:"Choose the payment proof image first."});
  if(!/^image\/(png|jpe?g|webp|gif|avif)$/i.test(file.contentType))return json(res,400,{error:"Only image files are allowed."});
  if(file.data.length>4*1024*1024)return json(res,400,{error:"Image must be 4MB or smaller."});
  const root=env("SUPABASE_URL").replace(/\/rest\/v1\/?$/,'');const key=env("SUPABASE_SERVICE_ROLE_KEY");if(!key)throw Error("SUPABASE_SERVICE_ROLE_KEY is missing.");const bucket="flash-store";
  const check=await fetch(root+"/storage/v1/bucket/"+bucket,{headers:{apikey:key,Authorization:"Bearer "+key}});if(!check.ok){const cr=await fetch(root+"/storage/v1/bucket",{method:"POST",headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({id:bucket,name:bucket,public:true})});if(!cr.ok&&!((await cr.text()).toLowerCase().includes("already")))throw Error("Could not create image storage bucket.")}
  const ext=(file.filename.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"")||"jpg";const path=`proof/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const up=await fetch(root+"/storage/v1/object/"+bucket+"/"+path,{method:"POST",headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":file.contentType,"x-upsert":"true"},body:file.data});if(!up.ok)throw Error("Payment proof upload failed: "+await up.text());
  return json(res,200,{url:root+"/storage/v1/object/public/"+bucket+"/"+path});
 }catch(e){return json(res,500,{error:e.message})}
};
