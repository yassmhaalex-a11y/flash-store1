/** FLASH STORE V55 - Gmail transactional email worker.
 * Script Properties required:
 * SUPABASE_URL = https://YOURPROJECT.supabase.co
 * SUPABASE_SERVICE_ROLE_KEY = secret service role key (NEVER put in website code)
 * DRIVE_LOGO_FILE_ID = 1BnuH3vGbjt8E7pJLR065w-uRV-Q6TyFY
 */
const STORE = 'FLASH STORE';
const SUPPORT = 'flashstore.support@gmail.com';
const TRACK_URL = 'https://flash-store1.vercel.app/account.html#orders';

function config_() {
  const p = PropertiesService.getScriptProperties();
  const url = (p.getProperty('SUPABASE_URL') || '').replace(/\/$/, '');
  const key = p.getProperty('SUPABASE_SERVICE_ROLE_KEY');
  const logoId = p.getProperty('DRIVE_LOGO_FILE_ID');
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url) || !key || !logoId)
    throw Error('Configure SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and DRIVE_LOGO_FILE_ID in Script Properties.');
  return {url,key,logoId};
}
function api_(path, method, body, cfg) {
  const r = UrlFetchApp.fetch(cfg.url + '/rest/v1/' + path, {
    method: method || 'get',
    muteHttpExceptions: true,
    contentType: 'application/json',
    headers: {apikey:cfg.key,Authorization:'Bearer '+cfg.key},
    payload: body === undefined ? undefined : JSON.stringify(body)
  });
  const code = r.getResponseCode(), raw = r.getContentText();
  if (code < 200 || code >= 300) throw Error('Supabase HTTP '+code+': '+raw.slice(0,250));
  return raw ? JSON.parse(raw) : null;
}
function esc_(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function eventInfo_(type) {
  return ({
    confirmed:['Order Confirmed!','We have received your order.','Pending'],
    processing:['Your Order Is Being Prepared!','Our team is working on your order.','Processing'],
    completed:['Your Order Is Ready!','Your order is complete. Sign in to My Orders to view your delivery details securely.','Completed'],
    canceled:['Your Order Was Canceled','Your order has been canceled. Reply to this email if you need assistance.','Canceled']
  })[type];
}
function safeImage_(url) {
  const u=String(url||'');
  return /^https:\/\/[^\s"'<>]+$/i.test(u)?esc_(u):'';
}
function cancellationReason_(code) {
  return ({payment_not_received:'Payment Not Received',incorrect_payment:'Incorrect Payment',verification_failed:'Payment Verification Failed',product_unavailable:'Product Unavailable',technical_issue:'Technical Issue',customer_request:'Canceled at Customer Request',other:'Other Reason'})[code]||'Order Cancellation';
}
function guideHtml_(guides, items) {
  const types=[...new Set((items||[]).map(i=>String(i.option_name||'').toLowerCase()).map(s=>s.includes('personal')?'personal':s.includes('home')?'home':s.includes('sign')?'sign':s.includes('full')?'full':'').filter(Boolean))];
  return types.map(type=>{
    const g=(guides||[]).find(x=>x.account_type===type&&x.enabled);
    if(!g||!Array.isArray(g.steps)||!g.steps.length)return '';
    return '<div style="margin-top:20px;background:#101827;border:1px solid #354052;border-radius:12px;padding:18px">'+
      '<h3 style="color:#ffcb00;margin:0 0 12px">'+esc_(type.toUpperCase())+' ACCOUNT — DELIVERY INSTRUCTIONS</h3>'+
      g.steps.map((step,index)=>'<div style="margin:18px 0"><strong style="color:white">STEP '+(index+1)+': '+esc_(step.title)+'</strong>'+
      '<p style="color:#cbd5e1;line-height:1.65;white-space:pre-line">'+esc_(step.description)+'</p>'+
      (safeImage_(step.image_url)?'<img src="'+safeImage_(step.image_url)+'" alt="Delivery step '+(index+1)+'" style="display:block;max-width:100%;max-height:340px;border-radius:9px">':'')+'</div>').join('')+'</div>';
  }).join('');
}
function emailHtml_(order,items,event,guides) {
  const info=eventInfo_(event);
  const name=esc_(order.full_name||'Customer');
  const number=esc_(order.order_number||'');
  const amount=Number(order.total||0).toLocaleString('en-US',{maximumFractionDigits:2});
  const rows=(items||[]).map(i=>{
    const image=safeImage_(i.image_url);
    return '<tr><td style="padding:12px 0;border-bottom:1px solid #303849;color:#fff">'+
      (image?'<img src="'+image+'" width="72" alt="Game cover" style="width:72px;max-height:100px;object-fit:cover;border-radius:7px;vertical-align:middle;margin-right:12px">':'')+
      '<span style="vertical-align:middle">'+esc_(i.product_name||'Product')+(i.option_name?' — '+esc_(i.option_name):'')+'</span></td>'+
      '<td style="padding:10px;text-align:right;color:#cbd5e1">× '+Number(i.quantity||1)+'</td></tr>';}).join('');
  const reason=event==='canceled'?'<div style="background:#30251d;border:1px solid #71513d;border-radius:10px;padding:18px;margin-top:20px">'+
    '<b style="color:#ffcb00">CANCELLATION REASON: '+esc_(cancellationReason_(order.cancellation_reason))+'</b>'+
    (order.cancellation_note?'<p style="color:#e0cfb9;white-space:pre-line">'+esc_(order.cancellation_note)+'</p>':'')+'</div>':'';
  const delivery=event==='completed'?guideHtml_(guides,items):'';
  const payment=event==='canceled'?'<p style="color:#cbd5e1;font-size:13px">If you paid already, contact support with your payment confirmation. Cancellation does not automatically mean a refund has been issued.</p>':'';
  return '<!doctype html><html><body style="margin:0;background:#090d15;padding:26px 10px;font-family:Arial,sans-serif">'+
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">'+
    '<table role="presentation" width="600" style="width:100%;max-width:600px;background:#171d29;border-radius:16px;overflow:hidden" cellspacing="0" cellpadding="0">'+
    '<tr><td style="background:#10151f;border-bottom:4px solid #ff655c;text-align:center;padding:36px 20px">'+
    '<img src="cid:storeLogo" width="120" alt="FLASH STORE" style="display:block;margin:0 auto 16px;max-width:120px;height:auto">'+
    '<h1 style="font-size:30px;color:#fff;margin:0">FLASH STORE</h1><p style="color:#ffcb00;letter-spacing:2px;font-size:12px">MORE THAN A STORE</p></td></tr>'+
    '<tr><td style="padding:30px 24px;color:#fff"><h2 style="text-align:center;color:#fff;font-size:26px">'+esc_(info[0])+'</h2>'+
    '<p style="text-align:center;color:#cbd5e1;line-height:1.7">'+esc_(info[1])+'</p>'+
    '<p style="color:#fff;margin-top:26px">Hello, '+name+'!</p>'+
    '<table role="presentation" width="100%" style="background:#0e1420;border:1px solid #303849;border-radius:12px;padding:16px" cellspacing="0" cellpadding="0">'+
    '<tr><td style="padding:8px;color:#cbd5e1">Order Number</td><td align="right" style="color:#fff">#'+number+'</td></tr>'+
    '<tr><td style="padding:8px;color:#cbd5e1">Status</td><td align="right" style="color:#ffcb00">'+esc_(info[2])+'</td></tr>'+
    '<tr><td colspan="2"><table width="100%" cellspacing="0" cellpadding="0">'+rows+'</table></td></tr>'+
    '<tr><td style="padding:12px 8px;color:#fff;font-weight:bold">Total</td><td align="right" style="color:#ffcb00;font-size:20px;font-weight:bold">'+esc_(amount)+' EGP</td></tr></table>'+
    reason+payment+delivery+
    '<p style="text-align:center;margin:34px 0"><a href="'+TRACK_URL+'" style="background:#ff655c;color:#fff;text-decoration:none;font-weight:bold;padding:17px 30px;border-radius:8px;display:inline-block">VIEW MY ORDER</a></p>'+
    '<div style="background:#222b3a;border-radius:10px;padding:18px;color:#cbd5e1;line-height:1.7"><b style="color:#ffcb00">Secure Delivery</b><br>Account credentials are available only after signing in to My Orders. Never share your account password.</div>'+
    '<p style="color:#cbd5e1;text-align:center;font-size:13px;margin-top:25px">Need help? Reply to this email.</p></td></tr>'+
    '<tr><td style="text-align:center;background:#10151f;padding:24px;color:#94a3b8;font-size:12px"><b style="color:#ff655c;font-size:18px">FLASH STORE</b><br><span style="color:#ffcb00">MORE THAN A STORE</span><br><br>Xbox Games • Game Pass • Gift Cards<br>© 2026 FLASH STORE</td></tr></table></td></tr></table></body></html>';
}
function processFlashStoreEmails() {
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(1000)) return;
  try {
    const cfg=config_();
    const jobs=api_('rpc/flash_claim_email_jobs','post',{p_limit:10},cfg)||[];
    if(!jobs.length) return;
    const logo=DriveApp.getFileById(cfg.logoId).getBlob().setName('flash-store-logo');
    for(const job of jobs){
      try {
        const orders=api_('orders?select=id,order_number,full_name,email,total,cancellation_reason,cancellation_note&id=eq.'+encodeURIComponent(job.order_uuid),'get',undefined,cfg);
        const order=orders[0];
        if(!order || !order.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(order.email)) throw Error('Order has no valid customer email');
        const items=api_('order_items?select=product_name,option_name,quantity,product_id,option_id&order_id=eq.'+encodeURIComponent(job.order_uuid),'get',undefined,cfg);
        // Resolve current catalog cover images without exposing private customer data.
        for(const item of items){
          const product=item.product_id?api_('products?select=image_url&id=eq.'+encodeURIComponent(item.product_id),'get',undefined,cfg):[];
          const option=item.option_id?api_('product_options?select=image_url&id=eq.'+encodeURIComponent(item.option_id),'get',undefined,cfg):[];
          item.image_url=(option[0]&&option[0].image_url)||(product[0]&&product[0].image_url)||'';
        }
        const guides=job.event==='completed'?api_('delivery_guides?select=account_type,steps,enabled&enabled=eq.true','get',undefined,cfg):[];
        const info=eventInfo_(job.event);
        if(!info) throw Error('Unknown email event');
        MailApp.sendEmail({
          to:order.email,
          subject:'⚡ FLASH STORE | '+info[0]+' #'+order.order_number,
          body:'FLASH STORE: '+info[0]+' Order #'+order.order_number+'. Track: '+TRACK_URL,
          htmlBody:emailHtml_(order,items,job.event,guides),
          inlineImages:{storeLogo:logo},
          name:'FLASH STORE | Customer Support',replyTo:SUPPORT
        });
        api_('rpc/flash_finish_email_job','post',{p_job_id:job.job_id,p_success:true},cfg);
      } catch(err) {
        console.error('Email job '+job.job_id+': '+String(err));
        try{api_('rpc/flash_finish_email_job','post',{p_job_id:job.job_id,p_success:false,p_error:String(err)},cfg)}catch(e){console.error(String(e))}
      }
    }
  } finally {lock.releaseLock()}
}
function customerEmailHtml_(job) {
  const p=job.payload||{};
  const review=job.event==='review';
  const title=review?'Thank You for Your Review!':'We Have Received Your Game Request!';
  const content=review?
    '<p>Your rating: <b>'+esc_(p.rating)+'/10</b></p><p style="white-space:pre-line">'+esc_(p.comment)+'</p>':
    '<p>Requested game: <b>'+esc_(p.game)+'</b></p><p>Edition: '+esc_(p.edition)+'</p><p>Account type: '+esc_(p.account_type)+'</p><p>Status: <b>Pending Review</b></p><p>Submitting a request does not guarantee availability.</p>';
  return '<!doctype html><html><body style="margin:0;padding:24px;background:#090e18;font-family:Arial,sans-serif;color:#fff">'+
    '<div style="max-width:600px;margin:auto;background:#111929;border-top:5px solid #ff655c;border-radius:12px;padding:30px">'+
    '<h1 style="color:#ffcb00">FLASH STORE</h1><p style="color:#aab6c8">MORE THAN A STORE</p>'+
    '<h2>'+title+'</h2><p>Hello, '+esc_(job.customer_name||'Customer')+'!</p>'+content+
    '<p style="margin-top:30px"><a href="https://flash-store1.vercel.app/" style="background:#ff655c;color:#fff;padding:13px 20px;text-decoration:none;border-radius:7px">VISIT FLASH STORE</a></p>'+
    '<p style="color:#aab6c8">Questions? '+SUPPORT+'</p></div></body></html>';
}
function processFlashCustomerEmails() {
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(1000))return;
  try {
    const cfg=config_();
    const jobs=api_('rpc/flash_claim_customer_emails','post',{p_limit:10},cfg)||[];
    for(const job of jobs){
      try {
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(job.recipient_email))throw Error('Invalid email');
        const title=job.event==='review'?'Thank You for Your Review!':'We Have Received Your Game Request!';
        if(!['review','game_request'].includes(job.event))throw Error('Unknown event');
        MailApp.sendEmail({to:job.recipient_email,subject:'FLASH STORE | '+title,body:title+' - FLASH STORE',htmlBody:customerEmailHtml_(job),name:'FLASH STORE | Customer Support',replyTo:SUPPORT});
        api_('rpc/flash_finish_customer_email','post',{p_job_id:job.job_id,p_success:true},cfg);
      } catch(err) {
        console.error('Customer email '+job.job_id+': '+String(err));
        try{api_('rpc/flash_finish_customer_email','post',{p_job_id:job.job_id,p_success:false,p_error:String(err)},cfg)}catch(e){console.error(String(e))}
      }
    }
  } finally {lock.releaseLock()}
}
function installFlashStoreEmailTrigger() {
  // Only install after configuring Script Properties and running a manual test.
  ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='processFlashStoreEmails').forEach(ScriptApp.deleteTrigger);
  ScriptApp.newTrigger('processFlashStoreEmails').timeBased().everyMinutes(5).create();
  ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='processFlashCustomerEmails').forEach(ScriptApp.deleteTrigger);
  ScriptApp.newTrigger('processFlashCustomerEmails').timeBased().everyMinutes(5).create();
}
