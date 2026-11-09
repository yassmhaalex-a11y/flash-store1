const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const pages = fs.readdirSync(root).filter(x=>x.endsWith('.html'));
let references = 0;
for (const page of pages) {
  const html = fs.readFileSync(path.join(root,page),'utf8');
  for(const match of html.matchAll(/(?:src|href)=["'](\/[^"'?#]*)/g)) {
    const url=match[1];
    if(url==='/' || url.startsWith('/api/')) continue;
    assert.ok(fs.existsSync(path.join(root,url.slice(1))), `${page}: missing ${url}`);
    references++;
  }
}
const checkout=fs.readFileSync(path.join(root,'checkout.html'),'utf8');
for(const id of ['authGate','checkoutWrap','items','sub','disc','total','fullName','phone','email','payment','proof','discount','apply','place','checkoutMsg','v57Step1','v57Step2','v57Step3','v57Next','v57Back','v57ReviewDetails']) {
  assert.match(checkout,new RegExp(`id=["']${id}["']`),`checkout missing #${id}`);
}
const admin=fs.readFileSync(path.join(root,'admin.html'),'utf8');
assert.match(admin,/v58-admin-redesign\.css/);
assert.match(admin,/v58-admin-redesign\.js/);
assert.match(checkout,/v58-checkout\.css/);
assert.match(checkout,/v58-checkout-ui\.js/);
const api=['auth','admin','orders','discount','reviews','store','upload-proof'];
for(const name of api)assert.ok(fs.existsSync(path.join(root,'api',name+'.js')),`missing API ${name}`);
console.log(`V58 static regression passed: ${pages.length} pages, ${references} local asset references, checkout DOM contracts and API routes`);
