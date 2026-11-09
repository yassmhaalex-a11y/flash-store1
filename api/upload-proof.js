module.exports.config={api:{bodyParser:false}};
const {json,env}=require("../lib/_lib");
const {issue}=require("../lib/proof-receipt");
const {randomUUID}=require("crypto");
const {BUCKET,ensurePrivateBucket}=require("../lib/private-proof");
function token(req){const c=req.headers.cookie||"";const m=c.match(/(?:^|;\s*)flash_token=([^;]+)/);return m&&decodeURIComponent(m[1])}
async function signedIn(req){const t=token(req);if(!t)return false;const root=env("SUPABASE_URL").replace(/\/rest\/v1\/?$/,'');const r=await fetch(root+"/auth/v1/user",{headers:{apikey:env("SUPABASE_ANON_KEY"),Authorization:"Bearer "+t}});return r.ok?await r.json():null}
function parseMultipart(req){return new Promise((resolve,reject)=>{const ct=req.headers["content-type"]||"";const m=ct.match(/boundary=(?:"([^"]+)"|([^;]+))/i);if(!m)return reject(Error("Expected multipart/form-data"));const boundary=Buffer.from("--"+(m[1]||m[2]));const chunks=[];let total=0;let aborted=false;req.on("data",c=>{if(aborted)return;total+=c.length;if(total>5*1024*1024){aborted=true;reject(Error("Upload too large"));req.destroy();return;}chunks.push(c)});req.on("end",()=>{if(aborted)return;try{const buf=Buffer.concat(chunks);let start=0,file=null;while((start=buf.indexOf(boundary,start))!==-1){const next=buf.indexOf(boundary,start+boundary.length);if(next===-1)break;let part=buf.slice(start+boundary.length);if(part.slice(0,2).equals(Buffer.from("\r\n")))part=part.slice(2);if(part.slice(-2).equals(Buffer.from("\r\n")))part=part.slice(0,-2);start=next;const sep=part.indexOf(Buffer.from("\r\n\r\n"));if(sep<0)continue;const head=part.slice(0,sep).toString();const data=part.slice(sep+4);const nm=head.match(/name="([^"]+)"/i);const fn=head.match(/filename="([^"]*)"/i);if(nm?.[1]==="proof"&&fn){file={filename:fn[1]||"proof.jpg",contentType:(head.match(/Content-Type:\s*([^\r\n]+)/i)||[])[1]||"application/octet-stream",data};break;}}resolve(file)}catch(e){reject(e)}});req.on("error",reject)})}
function validImage(data,type){
 if(type==="image/png")return data.length>=45&&data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))&&data.toString("ascii",12,16)==="IHDR"&&data.subarray(data.length-8).equals(Buffer.from([73,69,78,68,174,66,96,130]));
 if(type==="image/jpeg"||type==="image/jpg")return data.length>=4&&data[0]===255&&data[1]===216&&data[2]===255&&data[data.length-2]===255&&data[data.length-1]===217;
 if(type==="image/webp")return data.length>=20&&data.toString("ascii",0,4)==="RIFF"&&data.toString("ascii",8,12)==="WEBP"&&data.readUInt32LE(4)===data.length-8&&["VP8 ","VP8L","VP8X"].includes(data.toString("ascii",12,16));
 if(type==="image/gif")return data.length>=14&&["GIF87a","GIF89a"].includes(data.toString("ascii",0,6))&&data[data.length-1]===0x3b;
 return false;
}
module.exports=async(req,res)=>{
 if(req.method!=="POST")return json(res,405,{error:"Method not allowed"});
 try{
  const user=await signedIn(req);if(!user?.id)return json(res,401,{error:"You must sign in first."});
  const file=await parseMultipart(req);if(!file?.data?.length)return json(res,400,{error:"Choose the payment proof image first."});
  if(!/^image\/(png|jpe?g|webp|gif)$/i.test(file.contentType))return json(res,400,{error:"Only image files are allowed."});
  if(file.data.length>4*1024*1024)return json(res,400,{error:"Image must be 4MB or smaller."});
  if(!validImage(file.data,file.contentType.toLowerCase()))return json(res,400,{error:"File contents do not match the image type."});
  const root=env("SUPABASE_URL").replace(/\/rest\/v1\/?$/,'');const key=env("SUPABASE_SERVICE_ROLE_KEY");if(!key)throw Error("SUPABASE_SERVICE_ROLE_KEY is missing.");
  await ensurePrivateBucket();
  // Generate the extension from the verified MIME type, never the user filename.
  const ext=({"image/png":"png","image/jpeg":"jpg","image/jpg":"jpg","image/webp":"webp","image/gif":"gif"})[file.contentType.toLowerCase()];const path=`proof/${user.id}/${randomUUID()}.${ext}`;
  const up=await fetch(root+"/storage/v1/object/"+BUCKET+"/"+path,{method:"POST",headers:{apikey:key,Authorization:"Bearer "+key,"Content-Type":file.contentType},body:file.data});if(!up.ok)throw Error("Payment proof upload failed: "+await up.text());
  const url=root+"/storage/v1/object/"+BUCKET+"/"+path;
  return json(res,200,{url,proof_receipt:issue(user.id,url)});
 }catch(e){return json(res,e.message==="Upload too large"?413:500,{error:e.message==="Upload too large"?"Image must be 4MB or smaller.":"Payment proof upload failed."})}
};
