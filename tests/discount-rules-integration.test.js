'use strict';
const assert = require('node:assert/strict');
const {calculateDiscount,trustedItems}=require('../lib/discount-rules');
function fakeDb(tables){return {from(name){return {select(){return {error:null,data:tables[name]||[],eq(field,value){return Promise.resolve({error:null,data:(tables[name]||[]).filter(x=>String(x[field])===String(value))})},in(field,values){return Promise.resolve({error:null,data:(tables[name]||[]).filter(x=>values.map(String).includes(String(x[field])))})}}}}}}}
(async()=>{
 const tables={products:[{id:'p1',category_id:'c1',price:100,active:true,stock_quantity:3},{id:'p2',category_id:'c2',price:80,active:true}],product_options:[{id:'o1',product_id:'p1',price:60,active:true,stock_quantity:1}],discounts:[{id:'d1',code:'SAVE10',active:true,kind:'percent',value:10,scope:'products',max_uses:10,used_count:0}],discount_products:[{discount_id:'d1',product_id:'p1'}]};
 let db=fakeDb(tables);
 let cart=await trustedItems(db,[{product_id:'p1',quantity:2},{product_id:'p2',quantity:1}]);
 assert.equal(cart.error,undefined);
 assert.equal((await trustedItems(db,Array.from({length:6},()=>({product_id:'p2',quantity:20})))).error,'Cart quantity exceeds the allowed limit');
 assert.deepEqual(await calculateDiscount(db,'SAVE10',cart.items,null),{label:'SAVE10',amount:20});
 assert.equal((await trustedItems(db,[{product_id:'p1',option_id:'o1',quantity:1},{product_id:'p1',option_id:'o1',quantity:1}])).error,'Product out of stock');
 assert.equal((await trustedItems(db,[{product_id:'p2',option_id:'o1',quantity:1}])).error,'Product option unavailable');
 assert.equal((await calculateDiscount(db,'SAVE10',[{product_id:'p2',quantity:1,unit_price:80}],null)).status,400);
 tables.discounts[0].scope='categories';tables.discount_categories=[{discount_id:'d1',category_id:'c1'}];
 assert.deepEqual(await calculateDiscount(db,'SAVE10',cart.items,null),{label:'SAVE10',amount:20});
 tables.discounts[0].scope='products';
 tables.discounts[0].min_order_total='Infinity';
 assert.equal((await calculateDiscount(db,'SAVE10',cart.items,null)).error,'Discount configuration is invalid');
 tables.discounts[0].min_order_total=300;tables.discounts[0].max_order_total=100;
 assert.equal((await calculateDiscount(db,'SAVE10',cart.items,null)).error,'Discount configuration is invalid');
 delete tables.discounts[0].min_order_total;delete tables.discounts[0].max_order_total;
 assert.equal((await calculateDiscount(db,'SAVE10',[{product_id:'p1',quantity:1,unit_price:Infinity}],null)).error,'Invalid eligible order total');
 tables.discounts[0].used_count=10;
 assert.equal((await calculateDiscount(db,'SAVE10',cart.items,null)).error,'Discount usage limit reached');
 tables.discounts[0].used_count=0;tables.discounts[0].ends_at='2020-01-01T00:00:00Z';
 assert.equal((await calculateDiscount(db,'SAVE10',cart.items,null)).error,'This discount has expired');
 console.log('Discount/cart integration tests passed');
})().catch(e=>{console.error(e);process.exitCode=1});
