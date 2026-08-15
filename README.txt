FLASH STORE V15 - based on V14

What changed:
- Fixed Vercel Save persistence by moving data storage from serverless memory to Supabase fs_* tables.
- Keeps the same V14 API routes so the existing frontend/admin continue to work.
- Order Now opens Checkout directly instead of WhatsApp.
- Added Vodafone Cash payment method.
- Added product options/variants with name, price, old price and optional image URL.
- Added a Discounts section under Categories.
- Discount codes are stored in Supabase and can be limited to one use per customer.
- English is the default language for new browsers/storage.
- Server validates option prices and coupon usage instead of trusting browser totals.

Vercel environment variables:
SUPABASE_URL = https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY = YOUR_SERVER_SIDE_SERVICE_ROLE_KEY
ADMIN_PASSWORD = your admin password (optional; default is 2013)
FLASH_SECRET = a random long secret (optional but recommended)

IMPORTANT:
- Never put SUPABASE_SERVICE_ROLE_KEY in public frontend code.
- The SQL migration that creates fs_settings, fs_categories, fs_products, fs_users, fs_discounts, fs_orders and fs_discount_usages must be run once in Supabase SQL Editor.
- Do not delete the old V14 tables just because the new fs_* tables exist.
