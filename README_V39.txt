FLASH STORE V39
================

IMPORTANT:
- This version does NOT delete your existing Supabase data.
- Your existing products/categories/orders/accounts stay in Supabase.
- Do NOT run schema.sql on a live store.
- Run SUPABASE_V39_MIGRATION.sql once in Supabase SQL Editor.

V39 additions:
1. Numbered pagination (1, 2, 3...) on product/category/search lists.
2. Admin Products is organized by Category -> Products, with product search and pagination.
3. Each product option/type can independently require Email + Password.
4. Products and individual options can have a timed sale price. The normal price is automatically used again after sale_ends_at; no cron is required.
5. Order items can store per-option product account credentials.
6. Order and signup emails are triggered directly by the Vercel API calling the deployed Supabase Edge Function. Database Webhooks are NOT required.

EMAIL FUNCTION:
- Keep the deployed Supabase Edge Function name: order-emails.
- Replace its index.ts with the V39 file included here.
- Keep RESEND_API_KEY in Supabase Edge Function Secrets.
- config.toml already sets verify_jwt = false.
