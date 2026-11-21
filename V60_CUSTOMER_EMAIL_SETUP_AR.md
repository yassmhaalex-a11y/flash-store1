# V60 — Review & Game Request customer emails

1. Apply `SUPABASE_V60_CUSTOMER_EMAILS.sql` in Supabase SQL Editor after the previous V60 SQL.
2. Replace the Google Apps Script worker with `FLASH_EMAIL_WORKER_Code.gs`. Set script properties as documented at the top of that file.
3. Run `installFlashStoreEmailTrigger` once and authorize it. It installs separate 5-minute triggers for order and customer emails.
4. Test a review and game request on staging. The API queues a notification after successful submission; a worker sends it later.

Important: No end-to-end deployment or delivery test has been run. Signup verification/welcome/login/reset transactional email integration remains outstanding; existing Supabase auth recovery flow is separate. Do not claim V60 is final.
