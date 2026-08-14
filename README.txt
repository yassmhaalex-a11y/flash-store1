FLASH STORE - V15 based on the working V14

This build keeps the V14 storefront/admin flow and adds persistent Supabase storage.

NEW:
- Persistent products/categories/settings/orders/users/discounts using fs_* Supabase tables.
- Product options/variants: name, price, old price, image.
- Order Now opens Checkout directly (not WhatsApp).
- Checkout payment methods: InstaPay, Telda, Vodafone Cash.
- Discount codes can be limited to one use per user, first order only, and max uses.
- Discounts section below Categories.
- Product search.
- English is the default storefront language.

REQUIRED VERCEL ENVIRONMENT VARIABLES:
- SUPABASE_URL = https://YOUR_PROJECT.supabase.co
- SUPABASE_SERVICE_ROLE_KEY = your Supabase secret/service role key
- ADMIN_PASSWORD (optional, defaults to 2013)
- FLASH_SECRET (optional)

SUPABASE:
Run the supplied fs_* SQL migration once in Supabase SQL Editor before deploying.
Do not delete old V14 tables.
