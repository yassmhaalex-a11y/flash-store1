// Run with: node tests/private-proof-url.test.js
const assert=require('node:assert/strict');
process.env.SUPABASE_URL='https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY='test-only';
const {objectPath,legacyPublicProofUrl,safeSignedProofUrl}=require('../lib/private-proof');
(async()=>{
 const id='123e4567-e89b-42d3-a456-426614174000';
 const obj='https://example.supabase.co/storage/v1/object/flash-payment-proofs/proof/'+id+'/'+id+'.png';
 assert.equal(objectPath(obj),'proof/'+id+'/'+id+'.png');
 assert.equal(objectPath('https://evil.example/storage/v1/object/flash-payment-proofs/proof/'+id+'/'+id+'.png'),null);
 assert.equal(legacyPublicProofUrl('https://evil.example/storage/v1/object/public/x/y.png'),null);
 assert.equal(await safeSignedProofUrl('https://evil.example/secret'),null);
 const originalFetch=global.fetch;
 try{
  global.fetch=async()=>({ok:true,json:async()=>({signedURL:'https://evil.example/steal'})});
  assert.equal(await safeSignedProofUrl(obj),null);
  global.fetch=async()=>({ok:true,json:async()=>({signedURL:'/storage/v1/object/sign/flash-payment-proofs/proof/'+id+'/'+id+'.png?token=ok'})});
  assert.match(await safeSignedProofUrl(obj),/token=ok/);
 }finally{global.fetch=originalFetch}
 console.log('private-proof-url tests passed');
})().catch(e=>{console.error(e);process.exitCode=1});
