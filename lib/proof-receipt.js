// Signed receipt binds a recently uploaded proof to the authenticated user.
// This does not replace private storage or database transactions.
const crypto=require("crypto");
const {env}=require("./_lib");
function sign(userId,url,issuedAt){
 const secret=env("SUPABASE_SERVICE_ROLE_KEY");
 if(!secret)throw Error("Proof signing unavailable");
 const msg=JSON.stringify([String(userId),String(url),Number(issuedAt)]);
 return crypto.createHmac("sha256",secret).update(msg).digest("hex");
}
function issue(userId,url){const ts=Math.floor(Date.now()/1000);return `${ts}.${sign(userId,url,ts)}`;}
function verify(userId,url,receipt){
 if(typeof receipt!=="string"||!/^\d{10}\.[a-f0-9]{64}$/.test(receipt))return false;
 const [raw,mac]=receipt.split(".");const ts=Number(raw),now=Math.floor(Date.now()/1000);
 if(ts>now+60||now-ts>3600)return false;
 const expected=Buffer.from(sign(userId,url,ts),"hex"),actual=Buffer.from(mac,"hex");
 return expected.length===actual.length&&crypto.timingSafeEqual(expected,actual);
}
module.exports={issue,verify};
