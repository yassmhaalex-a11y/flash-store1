FLASH STORE V38

Email system is moved out of Vercel. Vercel does not send order emails anymore.

Supabase setup:
1. Deploy supabase/functions/order-emails/index.ts as an Edge Function named order-emails.
2. Set Supabase Edge Function secrets:
   RESEND_API_KEY = your Resend secret key
   SUPABASE_SERVICE_ROLE_KEY = your service role key
   EMAIL_FROM = optional; e.g. FLASH STORE <onboarding@resend.dev> for testing
   ORDER_EMAIL_WEBHOOK_SECRET = optional random secret
3. Run SUPABASE_V38_EMAILS.sql.
4. In Supabase Dashboard -> Database -> Webhooks create three webhooks pointing to the Edge Function:
   - orders INSERT
   - orders UPDATE
   - profiles INSERT
5. Set admin_email from Admin Panel -> Store Settings.

Emails:
- New order: customer + admin
- Order status paid/processing/completed/cancelled: customer
- New account: admin
- Product image, option, quantity, price and total are included.
- Passwords are intentionally not emailed.
