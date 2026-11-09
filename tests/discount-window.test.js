const assert=require('node:assert/strict');
const {calculateDiscount}=require('../lib/discount-rules');
const now=Date.now();
const makeDb=x=>({from:table=>({select:async()=>({data:table==='discounts'?[x]:[],error:null})})});
(async()=>{
 const item=[{product_id:'p',quantity:1,unit_price:100}];
 const base={code:'SALE',active:true,kind:'percent',value:10,scope:'all'};
 assert.equal((await calculateDiscount(makeDb({...base,starts_at:new Date(now+3600000).toISOString()}),'SALE',item,null)).status,400);
 assert.equal((await calculateDiscount(makeDb({...base,ends_at:new Date(now-3600000).toISOString()}),'SALE',item,null)).status,400);
 assert.equal((await calculateDiscount(makeDb({...base,starts_at:new Date(now-3600000).toISOString(),ends_at:new Date(now+3600000).toISOString()}),'SALE',item,null)).amount,10);
 console.log('Discount scheduling tests passed');
})().catch(e=>{console.error(e);process.exitCode=1});
