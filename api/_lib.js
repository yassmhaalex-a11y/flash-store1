const crypto=require("crypto");
function json(res,status,data){res.statusCode=status;res.setHeader("Content-Type","application/json");res.end(JSON.stringify(data))}
function env(name){
  const fallback={SUPABASE_URL:process.env.NEXT_PUBLIC_SUPABASE_URL,SUPABASE_ANON_KEY:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY};
  let value=process.env[name] ?? fallback[name] ?? "";
  // Vercel values are sometimes pasted with surrounding quotes/newlines.
  // Strip only accidental whitespace/quotes so fetch() receives a valid header value.
  return String(value).trim().replace(/^["']|["']$/g, "").trim();
}
function base(){return env("SUPABASE_URL").replace(/\/rest\/v1\/?$/,"")}
function headers(extra={}){
  const key=env("SUPABASE_SERVICE_ROLE_KEY");
  const h={"Content-Type":"application/json"};
  if(key){ h.apikey=key; h.Authorization="Bearer "+key; }
  return Object.assign(h,extra);
}
function signAdmin(value){const secret=env("ADMIN_SESSION_SECRET")||env("SUPABASE_SERVICE_ROLE_KEY")||"flash-store-admin-session";return crypto.createHmac("sha256",secret).update(value).digest("hex")}
function makeAdminToken(username){const payload=Buffer.from(JSON.stringify({u:username,t:Date.now()})).toString("base64url");return payload+"."+signAdmin(payload)}
function verifyAdminToken(token){
  try{const [payload,sig]=String(token||"").split(".");if(!payload||!sig||sig!==signAdmin(payload))return null;
    const d=JSON.parse(Buffer.from(payload,"base64url").toString()); if(!d.u||Date.now()-Number(d.t)>8*60*60*1000)return null; return d;
  }catch{return null}
}
async function readBody(req){
  if(req.body && typeof req.body === "object") return req.body;
  return await new Promise((resolve,reject)=>{
    let raw="";
    req.on("data",c=>{raw+=c});
    req.on("end",()=>{
      if(!raw) return resolve({});
      try{resolve(JSON.parse(raw))}catch{resolve({})}
    });
    req.on("error",reject);
  });
}
function getCookie(req,name){const c=req.headers.cookie||"";const m=c.match(new RegExp("(?:^|;\\s*)"+name.replace(/[.*+?^${}()|[\\]\\]/g,"\\$&")+"=([^;]+)"));return m?decodeURIComponent(m[1]):""}
function supabase(){const root=base();return{from(table){
 const make=(method,body,filter,returning)=>{let url=root+"/rest/v1/"+table;const qs=new URLSearchParams();if(filter)for(const[k,v]of Object.entries(filter))qs.set(k,v);if(qs.toString())url+="?"+qs.toString();return fetch(url,{method,headers:headers(returning?{"Prefer":"return=representation"}:{}),body:body===undefined?undefined:JSON.stringify(body)}).then(async r=>({data:r.ok?(returning?await r.json().catch(()=>[]):null):null,error:r.ok?null:Error(await r.text())}))};
 return{select(cols="*"){const filters={};let orderBy=null;let asc=true;const builder={eq(k,v){filters[k]="eq."+v;return builder},order(k,o={}){orderBy=k;asc=o.ascending!==false;return builder},then(resolve,reject){let url=root+"/rest/v1/"+table;const q=new URLSearchParams({select:cols,...filters});if(orderBy)q.set("order",orderBy+"."+(asc?"asc":"desc"));url+="?"+q.toString();return fetch(url,{headers:headers()}).then(async r=>resolve({data:r.ok?await r.json():null,error:r.ok?null:Error(await r.text())}),reject)}};return builder},
 insert:(row,opts={})=>make("POST",row,null,opts.returning==="representation"),
 update:(row,filter)=>make("PATCH",row,filter,true),
 delete:(filter)=>make("DELETE",undefined,filter,false)}}
}}
module.exports={json,supabase,env,base,getCookie,makeAdminToken,verifyAdminToken,readBody};
