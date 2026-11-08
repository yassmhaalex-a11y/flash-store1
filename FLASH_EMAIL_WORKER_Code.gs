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
function emailHtml_(order,items,event) {
  const info=eventInfo_(event);
  const name=esc_(order.full_name||'Customer');
  const number=esc_(order.order_number||'');
  const amount=Number(order.total||0).toLocaleString('en-US',{maximumFractionDigits:2});
  const rows=(items||[]).map(i=>'<tr><td style="padding:10px 0;border-bottom:1px solid #303849;color:#fff">'+esc_(i.product_name||'Product')+(i.option_name?' — '+esc_(i.option_name):'')+'</td><td style="padding:10px;text-align:right;color:#cbd5e1">× '+Number(i.quantity||1)+'</td></tr>').join('');
  return '<!doctype html><html><body style="margin:0;background:#090d15;padding:26px 10px;font-family:Arial,sans-serif">'+
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center">'+
    '<table role="presentation" width="600" style="width:100%;max-width:600px;background:#171d29;border-radius:16px;overflow:hidden" cellspacing="0" cellpadding="0">'+
    '<tr><td style="background:#10151f;border-bottom:4px solid #ff3b30;text-align:center;padding:36px 20px">'+
    '<img src="cid:storeLogo" width="120" alt="FLASH STORE" style="display:block;margin:0 auto 16px;max-width:120px;height:auto">'+
    '<h1 style="font-size:30px;color:#fff;margin:0">FLASH STORE</h1><p style="color:#ffb000;letter-spacing:2px;font-size:12px">MORE THAN A STORE</p></td></tr>'+
    '<tr><td style="padding:30px 24px;color:#fff"><h2 style="text-align:center;color:#fff;font-size:26px">'+esc_(info[0])+'</h2>'+
    '<p style="text-align:center;color:#cbd5e1;line-height:1.7">'+esc_(info[1])+'</p>'+
    '<p style="color:#fff;margin-top:26px">Hello, '+name+'!</p>'+
    '<table role="presentation" width="100%" style="background:#0e1420;border:1px solid #303849;border-radius:12px;padding:16px" cellspacing="0" cellpadding="0">'+
    '<tr><td style="padding:8px;color:#cbd5e1">Order Number</td><td align="right" style="color:#fff">#'+number+'</td></tr>'+
    '<tr><td style="padding:8px;color:#cbd5e1">Status</td><td align="right" style="color:#ffb000">'+esc_(info[2])+'</td></tr>'+
    '<tr><td colspan="2"><table width="100%" cellspacing="0" cellpadding="0">'+rows+'</table></td></tr>'+
    '<tr><td style="padding:12px 8px;color:#fff;font-weight:bold">Total</td><td align="right" style="color:#ffb000;font-size:20px;font-weight:bold">'+esc_(amount)+' EGP</td></tr></table>'+
    '<p style="text-align:center;margin:34px 0"><a href="'+TRACK_URL+'" style="background:#ff3b30;color:#fff;text-decoration:none;font-weight:bold;padding:17px 30px;border-radius:8px;display:inline-block">TRACK YOUR ORDER</a></p>'+
    '<div style="background:#222b3a;border-radius:10px;padding:18px;color:#cbd5e1;line-height:1.7"><b style="color:#ffb000">Secure Delivery</b><br>Your delivery information is available only after signing in to My Orders. Never share your account password.</div>'+
    '<p style="color:#cbd5e1;text-align:center;font-size:13px;margin-top:25px">Need help? Reply to this email.</p></td></tr>'+
    '<tr><td style="text-align:center;background:#10151f;padding:24px;color:#94a3b8;font-size:12px"><b style="color:#ff3b30;font-size:18px">FLASH STORE ⚡</b><br><span style="color:#ffb000">MORE THAN A STORE</span><br><br>Xbox Games • Game Pass • Gift Cards<br>© 2026 FLASH STORE</td></tr></table></td></tr></table></body></html>';
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
        const orders=api_('orders?select=id,order_number,full_name,email,total&id=eq.'+encodeURIComponent(job.order_uuid),'get',undefined,cfg);
        const order=orders[0];
        if(!order || !order.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(order.email)) throw Error('Order has no valid customer email');
        const items=api_('order_items?select=product_name,option_name,quantity&order_id=eq.'+encodeURIComponent(job.order_uuid),'get',undefined,cfg);
        const info=eventInfo_(job.event);
        if(!info) throw Error('Unknown email event');
        MailApp.sendEmail({
          to:order.email,
          subject:'⚡ FLASH STORE | '+info[0]+' #'+order.order_number,
          body:'FLASH STORE: '+info[0]+' Order #'+order.order_number+'. Track: '+TRACK_URL,
          htmlBody:emailHtml_(order,items,job.event),
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
function installFlashStoreEmailTrigger() {
  // Only install after configuring Script Properties and running a manual test.
  ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='processFlashStoreEmails').forEach(ScriptApp.deleteTrigger);
  ScriptApp.newTrigger('processFlashStoreEmails').timeBased().everyMinutes(5).create();
}
