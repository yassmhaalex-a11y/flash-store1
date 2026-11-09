const assert=require('node:assert/strict');
const {validateDiscountInput}=require('../lib/validate-discount');
const valid={code:'FLASH_10',value:10,kind:'percent',scope:'all'};
assert.equal(validateDiscountInput(valid),null);
for(const patch of [
 {code:' '},{value:-1},{value:101},{value:'NaN'},
 {kind:'unknown'},{scope:'other'},{max_uses:0},{max_uses:1.5},
 {min_order_total:'Infinity'},{min_order_total:200,max_order_total:100},
 {starts_at:'invalid'},{starts_at:'2026-11-11T00:00:00Z',ends_at:'2026-11-10T00:00:00Z'}
])assert.ok(validateDiscountInput({...valid,...patch}),JSON.stringify(patch));
assert.equal(validateDiscountInput({...valid,kind:'fixed',value:200}),null);
console.log('Discount validation tests passed');
