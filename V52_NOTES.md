# FLASH STORE V52 — Mobile Stars, Discount Search & Price Limits, Admin Form Stability

1. Run `SUPABASE_V52_DISCOUNT_LIMITS.sql` in Supabase SQL Editor **before** deploying. No existing records are removed.
2. Deploy the ZIP contents to GitHub/Vercel.
3. On mobile check stars in header. They still obey the Admin Stars toggle.
4. In Admin > Discounts: search product names, select products (selection persists while filtering), and optionally set minimum/maximum eligible cart subtotal in EGP. For example minimum 1000 means >= 1000. The range is enforced server-side on `/api/discount` and used by checkout/order validation. For product/category-scoped codes, thresholds are calculated on eligible products only.
5. Admin notifications still refresh every 12 seconds, but do not re-render or reset forms while typing. Manual saves/actions refresh data normally.
6. Test a code with a cart subtotal below/above the threshold and verify checkout; test admin form typing for at least 30 seconds.
