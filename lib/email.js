// V55: Email notifications are queued by Supabase database triggers and
// delivered by the configured Google Apps Script worker. Do not send
// through the legacy Edge Function as well (duplicate messages).
async function sendStoreEmail(){return true;}
module.exports={sendStoreEmail};
