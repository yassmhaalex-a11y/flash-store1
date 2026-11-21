FLASH STORE V55 — Full site based on V54.
1) Back up Supabase and existing GitHub deployment.
2) Run SUPABASE_V55_INVENTORY.sql in Supabase SQL Editor.
3) Run SUPABASE_V55_EMAIL_QUEUE.sql in Supabase SQL Editor ONLY if installing Gmail email worker.
4) For emails, use FLASH_EMAIL_WORKER_Code.gs in Apps Script and follow V55_EMAIL_SETUP_AR.txt. Keep service role key only in Script Properties.
5) Upload all site files to GitHub / deploy to Vercel.
6) Test with a dummy order: pending -> processing -> processing -> completed -> cancelled; stock must deduct once, not double, then restore once.
7) In Admin, open Sales Analytics and Stock Management. Existing items default to Unlimited.
IMPORTANT: This build has not been tested against your live Supabase instance. Test before switching production traffic.
