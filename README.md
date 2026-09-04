# FLASH STORE V17 FULL

A clean rebuild for a digital gaming store.

## Included
- English storefront
- Categories and category filtering
- Product catalog
- Product options (Home / Sign-in / New Account or custom names)
- Featured products with arrows and 10-second rotation
- Newly Added products for the last 60 days
- Platform discovery
- Search
- Cart + direct checkout
- Vodafone Cash / Telda / InstaPay payment methods
- Payment details shown after selecting a method
- Payment proof field
- Order number after checkout
- Sign in / sign up
- Client/admin roles
- Admin categories/products/orders/payment methods
- Discount targeting: all products / selected products / selected categories
- One-use/first-order/max-use fields are in the database schema and can be enabled in the admin/API layer next.

## Important
Do not put SUPABASE_SERVICE_ROLE_KEY in browser/public files.

## Deployment order
1. Upload this project to the GitHub repository.
2. Create/use a clean Supabase project.
3. Run `schema.sql`.
4. Add Vercel environment variables:
   SUPABASE_URL
   SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   ADMIN_EMAIL
   FLASH_SECRET
5. Deploy.
6. Open `/api/health`.
7. Open `/` and test the store.


V21 fixes: admin login gate, Supabase URL fallbacks for NEXT_PUBLIC vars, automatic admin profile provisioning for ADMIN_EMAIL, and hero image fallback. Existing storefront styling is preserved.
