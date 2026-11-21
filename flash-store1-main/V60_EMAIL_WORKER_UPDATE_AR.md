# V60 email worker update (work in progress)

- The Apps Script worker now includes catalog cover images in order status emails when a valid HTTPS image is available.
- Canceled order emails show the admin-selected cancellation reason and optional explanation, plus a careful payment/refund notice.
- Completed order emails show enabled step-by-step delivery guides and their HTTPS images, matched by account type in the item option name.
- Passwords are not included in email; users must access the authenticated My Orders page.

Deployment prerequisites: apply SUPABASE_V60_MIGRATION.sql, then replace the deployed Apps Script code with FLASH_EMAIL_WORKER_Code.gs. Test against a staging project. Other transactional email types remain unfinished. No production deployment or end-to-end email test has been performed.
