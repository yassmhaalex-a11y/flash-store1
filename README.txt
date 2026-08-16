FLASH STORE V15 - V14 SAVE FIXED

This version keeps the original V14 API behavior but adds persistent Supabase storage.

Features:
- Persistent Save for products, categories, settings, users, orders and discounts when Supabase env vars are configured.
- Product Options / Variants: name, price, old price, image.
- Search and Discounts section.
- Discount code one-time-per-user support.
- Vodafone Cash payment method.
- Order Now opens Checkout directly (not WhatsApp).
- English is the default language.
- Existing V14 JSON files remain as seed/fallback data.

Vercel Environment Variables:
1. SUPABASE_URL = your project URL, e.g. https://YOUR_PROJECT.supabase.co
   The API also strips /rest/v1 automatically if you accidentally paste it.
2. SUPABASE_SERVICE_ROLE_KEY = your Supabase server secret/service-role key.
3. ADMIN_PASSWORD = optional (default 2013)
4. FLASH_SECRET = optional random secret.

Do NOT expose SUPABASE_SERVICE_ROLE_KEY in frontend code.

Supabase:
Run the fs_* SQL migration supplied in the project once. It enables RLS; the server uses the secret/service-role key, so it can read/write the tables.

Deploy:
Push this whole project to GitHub and connect/redeploy it in Vercel. After changing Environment Variables, redeploy.
